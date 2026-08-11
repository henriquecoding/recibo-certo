// RC-BILL-002 (allowlist) — só o preço autorizado concede Plus.
//
// A projeção guardava `price_id` e ninguém o consultava: bastava existir uma
// subscrição `active`, `trialing` ou `past_due` associada ao utilizador. Um
// preço de teste, um preço antigo de outro produto ou um preço de 0 € criado à
// mão no painel concediam o produto pago na mesma.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const ORIGINAL = { ...process.env };
const PRECO_ATUAL = "price_plus_mensal_2026";
const PRECO_ANTIGO = "price_plus_legado";

afterEach(() => {
  process.env = { ...ORIGINAL };
});

beforeEach(() => {
  for (const k of [
    "STRIPE_PRICE_PLUS_MONTHLY",
    "NEXT_PUBLIC_STRIPE_PRICE_PLUS_MONTHLY",
    "STRIPE_PRICE_PLUS_LEGACY",
    "NEXT_PUBLIC_STRIPE_PRICE_PLUS_LEGACY",
  ]) {
    delete process.env[k];
  }
});

const mod = () => import("@/lib/stripe/precos-autorizados");

describe("RC-BILL-002 · allowlist de preço", () => {
  it("um preço autorizado concede", async () => {
    process.env.STRIPE_PRICE_PLUS_MONTHLY = PRECO_ATUAL;
    const { concedePlus } = await mod();
    expect(concedePlus({ status: "active", priceId: PRECO_ATUAL })).toBe(true);
    expect(concedePlus({ status: "trialing", priceId: PRECO_ATUAL })).toBe(true);
    expect(concedePlus({ status: "past_due", priceId: PRECO_ATUAL })).toBe(true);
  });

  it("um preço NÃO autorizado nunca concede, por mais ativo que esteja", async () => {
    process.env.STRIPE_PRICE_PLUS_MONTHLY = PRECO_ATUAL;
    const { concedePlus } = await mod();
    for (const intruso of ["price_de_teste", "price_outro_produto", "price_zero_euros"]) {
      expect(concedePlus({ status: "active", priceId: intruso }), intruso).toBe(false);
    }
  });

  it("uma subscrição sem preço identificável não concede", async () => {
    process.env.STRIPE_PRICE_PLUS_MONTHLY = PRECO_ATUAL;
    const { concedePlus } = await mod();
    expect(concedePlus({ status: "active", priceId: null })).toBe(false);
    expect(concedePlus({ status: "active", priceId: undefined })).toBe(false);
    expect(concedePlus({ status: "active", priceId: "" })).toBe(false);
  });

  it("um estado sem acesso não concede, mesmo com o preço certo", async () => {
    process.env.STRIPE_PRICE_PLUS_MONTHLY = PRECO_ATUAL;
    const { concedePlus } = await mod();
    for (const estado of ["canceled", "incomplete", "unpaid", "paused", ""]) {
      expect(concedePlus({ status: estado, priceId: PRECO_ATUAL }), estado).toBe(false);
    }
    expect(concedePlus({ status: null, priceId: PRECO_ATUAL })).toBe(false);
  });

  it("um preço histórico só concede se for declarado como tal", async () => {
    process.env.STRIPE_PRICE_PLUS_MONTHLY = PRECO_ATUAL;
    const { concedePlus, precosAutorizados } = await mod();
    expect(concedePlus({ status: "active", priceId: PRECO_ANTIGO })).toBe(false);

    process.env.STRIPE_PRICE_PLUS_LEGACY = PRECO_ANTIGO;
    expect(concedePlus({ status: "active", priceId: PRECO_ANTIGO })).toBe(true);
    expect(precosAutorizados()).toEqual([PRECO_ATUAL, PRECO_ANTIGO]);
  });

  it("sem allowlist configurada, NADA concede", async () => {
    // Falha fechada. Parece agressivo, mas `STRIPE_PRICE_PLUS_MONTHLY` é a
    // mesma variável que o checkout precisa para existir: num ambiente onde há
    // subscrições, ela está definida por construção.
    const { concedePlus, precosAutorizados } = await mod();
    expect(precosAutorizados()).toEqual([]);
    expect(concedePlus({ status: "active", priceId: PRECO_ATUAL })).toBe(false);
  });

  it("ignora valores que não são IDs de preço", async () => {
    process.env.STRIPE_PRICE_PLUS_MONTHLY = "price_...";
    const { precosAutorizados } = await mod();
    // O `.env.example` traz literalmente "price_..." como marcador. Passa no
    // teste do prefixo, por isso vale como preço — mas nunca coincide com um
    // real, que é o que interessa. O que NÃO pode entrar é lixo sem prefixo.
    process.env.STRIPE_PRICE_PLUS_MONTHLY = "por-definir";
    expect(precosAutorizados()).toEqual([]);
  });

  it("a leitura das variáveis é literal, para o browser as receber", async () => {
    // `process.env[nome]` com índice dinâmico nunca é substituído pelo Next no
    // bundle do cliente: o valor chegaria sempre como `undefined` e a decisão
    // dava sempre "não concede", incluindo a quem paga.
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    // Sem comentários: o próprio ficheiro EXPLICA o acesso dinâmico que evita,
    // e uma procura ingénua acusaria a explicação em vez do código.
    const fonte = readFileSync(join(__dirname, "..", "stripe", "precos-autorizados.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^\s*\/\/.*$/gm, " ");
    expect(fonte).toMatch(/process\.env\.NEXT_PUBLIC_STRIPE_PRICE_PLUS_MONTHLY/);
    expect(fonte).not.toMatch(/process\.env\[/);
  });
});

describe("RC-BILL-002 · o provider e o webhook usam a allowlist", () => {
  it("o provider decide com preço, não só com estado", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const fonte = readFileSync(join(__dirname, "..", "stripe", "subscription.tsx"), "utf8");
    expect(fonte).toMatch(/concedePlus/);
    expect(fonte).toMatch(/price_id/);
  });

  it("o webhook alerta quando chega um preço não autorizado", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const fonte = readFileSync(
      join(__dirname, "..", "..", "app", "api", "stripe", "webhook", "route.ts"),
      "utf8",
    );
    expect(fonte).toMatch(/precoConcedePlus/);
    // E continua a guardar o registo: a subscrição existe do lado da Stripe e
    // alguém pode estar a ser cobrado. Apagar o facto seria pior.
    expect(fonte).toMatch(/upsert\(dados/);
  });
});
