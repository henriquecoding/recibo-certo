// RC-BILL-002 (allowlist) — só o preço autorizado concede Plus.
//
// A projeção guardava `price_id` e ninguém o consultava: bastava existir uma
// subscrição `active`, `trialing` ou `past_due` associada ao utilizador. Um
// preço de teste, um preço antigo de outro produto ou um preço de 0 € criado à
// mão no painel concediam o produto pago na mesma.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PLUS, mesesParaCompensarVitalicio, precoVitalicioFormatado } from "@/lib/entitlements";

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
    "STRIPE_PRICE_PLUS_LIFETIME",
    "NEXT_PUBLIC_STRIPE_PRICE_PLUS_LIFETIME",
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
    const graca = new Date(Date.now() + 86_400_000).toISOString();
    expect(concedePlus({ status: "past_due", priceId: PRECO_ATUAL, periodoGracaTerminaEm: graca })).toBe(true);
    expect(concedePlus({ status: "past_due", priceId: PRECO_ATUAL, periodoGracaTerminaEm: null })).toBe(false);
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

  it("aceita mais do que um preço histórico separado por vírgulas", async () => {
    process.env.STRIPE_PRICE_PLUS_LEGACY = "price_legado_mensal, price_legado_anual";
    const { precosLegados } = await mod();
    expect(precosLegados()).toEqual(["price_legado_mensal", "price_legado_anual"]);
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

describe("RC-BILL-002 · a decisão vive no servidor", () => {
  it("o provider consulta o endpoint canónico e não a tabela diretamente", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const fonte = readFileSync(join(__dirname, "..", "stripe", "subscription-runtime.tsx"), "utf8");
    expect(fonte).toContain("/api/entitlements");
    expect(fonte).not.toMatch(/\.from\("subscriptions"\)/);
  });

  it("a projeção valida o preço na Stripe antes de o catálogo conceder Plus", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const fonte = readFileSync(join(__dirname, "..", "billing", "projection.ts"), "utf8");
    expect(fonte).toMatch(/validarPrecoQueConcedePlus/);
    expect(fonte).toMatch(/upsert\(row/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  ORIGEM DA CONCESSÃO — vitalício, manual, cupão e Lemon Squeezy
// ═══════════════════════════════════════════════════════════════════════

describe("concedePlus: cada origem traz a prova que lhe compete", () => {
  const PRECO = "price_teste_plus_mensal";
  const VITALICIO = "price_teste_plus_vitalicio";

  beforeEach(() => {
    process.env.STRIPE_PRICE_PLUS_MONTHLY = PRECO;
    process.env.STRIPE_PRICE_PLUS_LIFETIME = VITALICIO;
  });

  it("uma subscrição Stripe continua a exigir preço autorizado", async () => {
    const { concedePlus, eVitalicio } = await mod();
    expect(concedePlus({ origem: "stripe", status: "active", priceId: PRECO })).toBe(true);
    expect(concedePlus({ origem: "stripe", status: "active", priceId: "price_intruso" })).toBe(false);
    expect(concedePlus({ origem: "stripe", status: "active", priceId: null })).toBe(false);
  });

  it("o Lemon Squeezy identifica-se pela sua própria coluna, não por um price_id", async () => {
    const { concedePlus, eVitalicio } = await mod();
    // Era isto que negava o Plus a um subscritor legítimo: `price_id` é uma
    // coluna do Stripe, e uma subscrição do LS nunca a teve.
    expect(concedePlus({
      origem: "lemon_squeezy", status: "active", priceId: null, lsSubscriptionId: "ls_123",
    })).toBe(true);
    expect(concedePlus({
      origem: "lemon_squeezy", status: "active", priceId: null, lsSubscriptionId: null,
    })).toBe(false);
  });

  it("uma compra vitalícia exige o pagamento E um preço autorizado", async () => {
    const { concedePlus, eVitalicio } = await mod();
    expect(concedePlus({
      origem: "vitalicio", status: "active", priceId: VITALICIO, paymentIntent: "pi_1",
    })).toBe(true);
    // Sem o pagamento que a prova, é uma linha escrita à mão.
    expect(concedePlus({
      origem: "vitalicio", status: "active", priceId: VITALICIO, paymentIntent: null,
    })).toBe(false);
    // RC-BILL-002 aplica-se à compra única: um preço de 0 € criado à mão não
    // compra acesso para sempre.
    expect(concedePlus({
      origem: "vitalicio", status: "active", priceId: "price_zero", paymentIntent: "pi_1",
    })).toBe(false);
  });

  it("uma concessão manual não tem preço, e não precisa", async () => {
    const { concedePlus, eVitalicio } = await mod();
    expect(concedePlus({
      origem: "manual", status: "active", priceId: null,
      motivo: "concessão de suporte", concedidoPor: "00000000-0000-4000-8000-000000000001",
    })).toBe(true);
    expect(concedePlus({ origem: "manual", status: "active", priceId: null })).toBe(false);
  });

  it("um cupão vale enquanto durar", async () => {
    const { concedePlus, eVitalicio } = await mod();
    const ontem = new Date(Date.now() - 86_400_000).toISOString();
    const amanha = new Date(Date.now() + 86_400_000).toISOString();
    expect(concedePlus({ origem: "cupao", status: "active", priceId: null, terminaEm: amanha, cupaoId: "cupao_1" })).toBe(true);
    expect(concedePlus({ origem: "cupao", status: "active", priceId: null, terminaEm: ontem, cupaoId: "cupao_1" })).toBe(false);
    expect(concedePlus({ origem: "cupao", status: "active", priceId: null, terminaEm: amanha })).toBe(false);
  });

  it("um prazo expirado vence qualquer origem", async () => {
    const { concedePlus, eVitalicio } = await mod();
    const ontem = new Date(Date.now() - 86_400_000).toISOString();
    expect(concedePlus({ origem: "manual", status: "active", priceId: null, terminaEm: ontem })).toBe(false);
    expect(concedePlus({ origem: "stripe", status: "active", priceId: PRECO, terminaEm: ontem })).toBe(false);
  });

  it("um estado sem acesso vence qualquer origem", async () => {
    const { concedePlus, eVitalicio } = await mod();
    for (const origem of ["stripe", "manual", "vitalicio", "cupao", "lemon_squeezy"] as const) {
      expect(concedePlus({ origem, status: "canceled", priceId: PRECO, paymentIntent: "pi_1", lsSubscriptionId: "ls_1" }), origem).toBe(false);
    }
  });

  it("sem origem declarada assume-se Stripe — a regra mais estrita", async () => {
    const { concedePlus, eVitalicio } = await mod();
    expect(concedePlus({ status: "active", priceId: PRECO })).toBe(true);
    expect(concedePlus({ status: "active", priceId: null })).toBe(false);
  });

  it("só vitalício e manual são acesso para sempre", async () => {
    const { concedePlus, eVitalicio } = await mod();
    expect(eVitalicio("vitalicio")).toBe(true);
    expect(eVitalicio("manual")).toBe(true);
    expect(eVitalicio("stripe")).toBe(false);
    expect(eVitalicio("cupao")).toBe(false);
    expect(eVitalicio(null)).toBe(false);
  });
});

describe("preço vitalício: a aritmética que a página promete", () => {
  it("19,99 € compensa a partir de 11 meses de mensalidade", () => {
    // 19,99 / 1,99 = 10,05. Aos 10 meses o mensal ainda sai mais barato
    // (19,90 €); é ao 11.º que a compra única passa à frente. Arredondar
    // para baixo daria uma promessa falsa por nove cêntimos.
    expect(PLUS.precoVitalicio).toBe(19.99);
    expect(mesesParaCompensarVitalicio()).toBe(11);
    expect(PLUS.precoMensal * 10).toBeLessThan(PLUS.precoVitalicio);
    expect(PLUS.precoMensal * 11).toBeGreaterThan(PLUS.precoVitalicio);
  });

  it("os meses são derivados dos preços, não escritos à mão", () => {
    const esperado = Math.ceil(PLUS.precoVitalicio / PLUS.precoMensal);
    expect(mesesParaCompensarVitalicio()).toBe(esperado);
  });

  it("o preço vitalício é formatado em euros de Portugal", () => {
    expect(precoVitalicioFormatado()).toMatch(/19,99/);
    expect(precoVitalicioFormatado()).toContain("€");
  });
});
