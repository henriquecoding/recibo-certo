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
