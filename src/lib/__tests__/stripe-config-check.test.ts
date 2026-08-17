// ═══════════════════════════════════════════════════════════════════════
//  O verificador da configuração da Stripe
//  ---------------------------------------------------------------------
//  O script tem a origem canónica escrita nele — é um `.mjs` que corre
//  sem o TypeScript e não pode importar `src/lib/origem.ts`. Duas cópias
//  do mesmo valor divergem sempre, e a divergência aqui seria silenciosa:
//  o verificador passava a aprovar um URL que o site não serve.
//
//  Este teste é a costura entre os dois.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ORIGEM_CANONICA } from "@/lib/origem";

const SCRIPT = readFileSync(join(process.cwd(), "scripts/check-stripe-config.mjs"), "utf8");

describe("check-stripe-config: a origem não pode divergir", () => {
  it("usa a mesma origem canónica que a aplicação", () => {
    expect(SCRIPT).toContain(`const ORIGEM_CANONICA = "${ORIGEM_CANONICA}"`);
  });

  it("deriva o apex da canónica, em vez de o escrever à mão", () => {
    // Escrever `https://recibocerto.pt` à mão era uma terceira cópia do
    // mesmo domínio, e a que se esqueceria primeiro.
    expect(SCRIPT).toContain('ORIGEM_CANONICA.replace("://www.", "://")');
  });
});

describe("check-stripe-config: o que tem de verificar", () => {
  it("exige as três variáveis de ambiente", () => {
    for (const v of [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_CONNECT_WEBHOOK_SECRET",
    ]) {
      expect(SCRIPT, `${v} tem de ser verificada`).toContain(v);
    }
  });

  it("exige `account.updated` no webhook das contas ligadas", () => {
    // É o evento mais importante do sistema inteiro: sem ele
    // `charges_enabled` nunca sobe e nenhum contabilista fica apto a
    // receber. Foi exatamente isto que esteve parado em produção.
    expect(SCRIPT).toContain('"account.updated"');
    expect(SCRIPT).toContain('"checkout.session.completed"');
  });

  it("falha quando um webhook está no apex", () => {
    expect(SCRIPT).toContain("ORIGEM_APEX");
    expect(SCRIPT).toMatch(/n[aã]o segue redirecionamentos/i);
  });

  it("sai com código de erro quando há problemas", () => {
    // Um verificador que encontra problemas e sai a zero é um verificador
    // que o CI ignora.
    expect(SCRIPT).toContain("process.exit(1)");
  });

  it("não dá por verificado o que não verificou", () => {
    // Sem chave da Stripe, os webhooks ficam por verificar. Dizer
    // «configuração verificada» nesse caso era mentir com um visto verde.
    expect(SCRIPT).toMatch(/POR VERIFICAR/);
    expect(SCRIPT).toContain("com verificações por fazer");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  A costura que faltava
//  ---------------------------------------------------------------------
//  O verificador pedia três eventos ao `/api/stripe/webhook` quando o
//  handler trata onze. `checkout.session.completed` — o ÚNICO evento que
//  concede o Plus vitalício, porque `mode: "payment"` não gera subscrição —
//  ficou de fora da lista E de fora da Stripe. Duas ausências que se
//  escondiam uma à outra: o verificador não pedia, logo não acusava.
//
//  Este teste lê os `case` dos handlers e exige que o verificador conheça
//  cada um. Um evento novo no `switch` passa a partir este teste até entrar
//  na lista — que é a altura certa para alguém se lembrar de o registar
//  também no painel da Stripe.
// ═══════════════════════════════════════════════════════════════════════

/** Casos que o handler tem para não cair no `default`, mas que não agem. */
const NAO_AGEM: Record<string, readonly string[]> = {
  "/api/stripe/webhook": ["checkout.session.async_payment_failed"],
  "/api/stripe/connect-webhook": [],
};

const HANDLERS = {
  "/api/stripe/webhook": "src/app/api/stripe/webhook/route.ts",
  "/api/stripe/connect-webhook": "src/app/api/stripe/connect-webhook/route.ts",
} as const;

/** Os eventos que o verificador exige para um dado endpoint. */
function exigidosNoScript(endpoint: string): string[] {
  const bloco = SCRIPT.split(`"${endpoint}": [`)[1]?.split("],")[0] ?? "";
  return [...bloco.matchAll(/"([a-z_]+\.[a-z_.]+)"/g)].map((m) => m[1]);
}

/** Os eventos que o handler trata de facto (`case "..."`). */
function tratadosNoHandler(caminho: string): string[] {
  const fonte = readFileSync(join(process.cwd(), caminho), "utf8");
  return [...fonte.matchAll(/case "([a-z_]+\.[a-z_.]+)":/g)].map((m) => m[1]);
}

describe("check-stripe-config: a lista não pode ficar atrás dos handlers", () => {
  for (const [endpoint, caminho] of Object.entries(HANDLERS)) {
    it(`exige todos os eventos que ${endpoint} trata`, () => {
      const exigidos = exigidosNoScript(endpoint);
      const emFalta = tratadosNoHandler(caminho)
        .filter((evento) => !NAO_AGEM[endpoint].includes(evento))
        .filter((evento) => !exigidos.includes(evento));

      expect(
        emFalta,
        `${endpoint} trata ${emFalta.join(", ")} mas o verificador não os exige. `
          + "Enquanto não os exigir, podem faltar na Stripe sem nada acusar.",
      ).toEqual([]);
    });
  }

  it("exige `checkout.session.completed` nos DOIS webhooks", () => {
    // O do connect liquida a consulta; o da plataforma concede o vitalício
    // e aplica o desbloqueio de patamar. Nenhum dos dois é dispensável, e
    // o da plataforma foi precisamente o que faltou em produção.
    for (const endpoint of Object.keys(HANDLERS)) {
      expect(exigidosNoScript(endpoint)).toContain("checkout.session.completed");
    }
  });

  it("exige `charge.refunded` na plataforma", () => {
    // Sem ele, o reembolso devolve o dinheiro e o Plus fica de pé.
    expect(exigidosNoScript("/api/stripe/webhook")).toContain("charge.refunded");
  });
});
