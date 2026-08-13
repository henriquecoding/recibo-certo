import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { concedePlus, descreverEstado } from "@/lib/stripe/precos-autorizados";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; });

describe("contrato comercial", () => {
  it("o Grátis oferece uma amostra de cenário, não a regra antiga de três", () => {
    const prices = read("src/components/Precos.tsx");
    expect(prices).toContain('gratis: "1 amostra"');
    expect(prices).toContain("1 amostra de cenário guardada neste dispositivo");
    expect(read("src/lib/store/cenarios.ts")).toMatch(/LIMITE_FREE\s*=\s*1/);
  });

  it("exportação é Plus no cliente e no servidor", () => {
    expect(read("src/lib/store/exportacao-pro.ts")).toMatch(/LIMITE_EXPORT_GRATIS\s*=\s*0/);
    expect(read("src/lib/documentos/emissao.ts")).toContain("estadoAcessoDoUtilizador");
    expect(read("src/lib/documentos/emissao.ts")).not.toMatch(/profiles[\s\S]*plano|select\("plano"\)/);
  });

  it("a base também impede contas Grátis de sincronizar o perfil fiscal", () => {
    const migration = read("supabase/migrations/20260813_planos_operacionais.sql");
    expect(migration).toContain("profiles_restringir_preferencias_fiscais");
    expect(migration).toContain("PLANO_PLUS_NECESSARIO");
    expect(migration).toContain("private.user_has_plus(NEW.id)");
  });

  it("os 14 dias são reembolso, não trial nem plano anual antigo", () => {
    const prices = read("src/components/Precos.tsx");
    const terms = read("src/app/termos/page.tsx");
    const checkout = read("src/app/api/stripe/checkout/route.ts");
    expect(prices).toContain("Cobrança imediata");
    expect(prices).toContain("14 dias para pedir reembolso");
    expect(terms).toContain("não é um trial");
    expect(terms).toContain("Plus vitalício");
    expect(terms).not.toContain("mensal ou anual");
    expect(checkout).not.toMatch(/trial_period_days/);
  });

  it("o vitalício é apresentado como campanha fundadora realmente limitada", () => {
    const prices = read("src/components/Precos.tsx");
    const terms = read("src/app/termos/page.tsx");
    const upgrade = read("src/app/dashboard/upgrade/page.tsx");
    expect(prices).toContain("1000 lugares fundadores");
    expect(prices).toContain("Ajuda a financiar a evolução do Recibo Certo");
    expect(terms).toContain("campanha fundadora limitada aos 1000 lugares");
    expect(terms).toContain("vida operacional do serviço");
    expect(upgrade).toContain("1000 lugares fundadores");
    expect(upgrade).toContain("ajuda a financiar a evolução do Recibo Certo");
    expect(upgrade).toContain("A confirmar o teu plano");
  });

  it("os Termos não remetem para a plataforma europeia RLL encerrada", () => {
    const terms = read("src/app/termos/page.tsx");
    expect(terms).not.toContain("plataforma europeia de resolução de litígios em linha");
    expect(terms).toContain("consumer-redress.ec.europa.eu/dispute-resolution-bodies");
  });
});

describe("período de graça", () => {
  it("past_due só concede dentro de uma janela explícita", () => {
    process.env.STRIPE_PRICE_PLUS_MONTHLY = "price_BillingMonthly";
    const future = new Date("2030-01-02T00:00:00Z").toISOString();
    const past = new Date("2029-12-31T00:00:00Z").toISOString();
    const now = new Date("2030-01-01T00:00:00Z");
    expect(concedePlus({
      status: "past_due", priceId: "price_BillingMonthly", periodoGracaTerminaEm: future,
    }, [], now)).toBe(true);
    expect(concedePlus({
      status: "past_due", priceId: "price_BillingMonthly", periodoGracaTerminaEm: past,
    }, [], now)).toBe(false);
    expect(concedePlus({
      status: "past_due", priceId: "price_BillingMonthly", periodoGracaTerminaEm: null,
    }, [], now)).toBe(false);
  });

  it("a mensagem da conta também falha fechada sem uma janela explícita", () => {
    const estado = descreverEstado("past_due", true, null);
    expect(estado.temAcesso).toBe(false);
    expect(estado.etiqueta).toBe("Acesso suspenso");
  });
});

describe("fronteiras e recuperação", () => {
  const migration = () => read("supabase/migrations/20260813_planos_operacionais.sql");

  it("a base aplica Plus às escritas de nuvem e avatar", () => {
    const sql = migration();
    expect(sql).toMatch(/recibos_insert_plus/);
    expect(sql).toMatch(/cenarios_insert_plus/);
    expect(sql).toMatch(/vencimentos_insert_plus/);
    expect(sql).toMatch(/avatars_insert/);
    expect(sql).toMatch(/private\.current_user_has_plus/);
  });

  it("webhooks têm ledger, lease, dead-letter e reconciliação", () => {
    const sql = migration();
    const webhook = read("src/app/api/stripe/webhook/route.ts");
    expect(sql).toContain("billing_webhook_events");
    expect(sql).toContain("lease_until");
    expect(webhook).toContain("claimStripeEvent");
    expect(webhook).toContain("dead_letter");
    expect(read("src/app/api/cron/reconciliar-stripe/route.ts")).toContain("syncSubscription");
  });

  it("o checkout reutiliza sessões e confirma duplicados na própria Stripe", () => {
    const checkout = read("src/app/api/stripe/checkout/route.ts");
    expect(checkout).toMatch(/subscriptions\.list/);
    expect(checkout).toMatch(/checkout\.sessions\.list/);
    expect(checkout).toContain("reutilizada: true");
  });

  it("reembolsos e disputas usam o estado canónico atual", () => {
    const projection = read("src/lib/billing/projection.ts");
    expect(projection).toMatch(/charges\.retrieve\(charge\.id\)/);
    expect(projection).toMatch(/disputes\.retrieve\(dispute\.id\)/);
  });

  it("o último lugar e pagamentos repetidos são reembolsados automaticamente", () => {
    const projection = read("src/lib/billing/projection.ts");
    expect(projection).toContain("foiLimiteAtingido");
    expect(projection).toMatch(/refunds\.create/);
    expect(projection).toMatch(/idempotencyKey/);
  });
});

describe("correções da auditoria do PR #104", () => {
  const PROJECTION = "src/lib/billing/projection.ts";
  const MIGRACAO = "supabase/migrations/20260813_planos_operacionais.sql";

  it("um vitalício repetido volta a cancelar a mensalidade e a purga", () => {
    // Se gravar a linha corria bem mas cancelar a mensalidade falhava, o
    // Stripe repetia o evento e a repetição saía no `samePayment` sem nunca
    // voltar a tentar: a pessoa ficava com vitalício E a pagar todos os meses.
    const source = read(PROJECTION);
    expect(source).toContain("async function finalizarVitalicio");
    expect(source, "a repetição tem de refazer os passos finais")
      .toMatch(/if \(aindaVale\) await finalizarVitalicio\(owner\.userId\);/);
    expect(source, "um vitalício já revogado não se reanima")
      .toMatch(/samePayment\.status === "active" && !samePayment\.revogado_em/);
    // E o caminho normal tem de usar exatamente a mesma função.
    expect(source).not.toMatch(/await purga\(owner\.userId, true\);\s*\n\s*await cancelRecurringAfterLifetime/);
  });

  it("o reembolso da mensalidade revoga o acesso e cancela a subscrição", () => {
    // Os Termos prometem revogação dentro dos 14 dias. Antes disto, só o
    // vitalício era revogado; um reembolso do primeiro mês deixava o Plus de
    // pé e a subscrição a cobrar no mês seguinte.
    const source = read(PROJECTION);
    expect(source).toContain("export async function revokeRefundedCharge");
    expect(source).toContain("invoiceForPaymentIntent");
    expect(source).toMatch(/stripe\.subscriptions\.cancel\(subscriptionId/);
    expect(source).toMatch(/idempotencyKey: `recibocerto-refund-\$\{paymentIntent\}`/);
    const webhook = read("src/app/api/stripe/webhook/route.ts");
    expect(webhook).toContain("revokeRefundedCharge");
    expect(webhook).not.toContain("revokeRefundedLifetime");
  });

  it("o catálogo vazio não tranca quem já paga", () => {
    // A migração cria o catálogo vazio, mas as policies dependem dele. Sem
    // salvaguarda, entre a migração e a primeira validação de preço todas as
    // contas pagantes deixavam de poder escrever na nuvem — enquanto a
    // aplicação, que tem as variáveis de ambiente, continuava a dar-lhes Plus.
    const sql = read(MIGRACAO);
    expect(sql).toMatch(
      /OR NOT EXISTS \(SELECT 1 FROM public\.billing_price_catalog p WHERE p\.concede_plus\)/,
    );
    expect(sql, "o vitalício tem a sua própria salvaguarda")
      .toMatch(/WHERE p\.modalidade = 'lifetime' AND p\.concede_plus/);
    // E o cron enche o catálogo, para o modo de arranque fechar sozinho.
    const cron = read("src/app/api/cron/reconciliar-stripe/route.ts");
    expect(cron).toContain("resolverPrecoCheckout");
  });

  it("a página de upgrade diz a verdade a cada tipo de acesso", () => {
    const page = read("src/app/dashboard/upgrade/page.tsx");
    // Uma concessão manual não é um pagamento único.
    expect(page).toMatch(/const concessaoManual = origem === "manual"/);
    expect(page).toContain("O teu acesso foi concedido pela equipa");
    // O portal do Stripe só aparece a quem lá tem cliente.
    expect(page).toMatch(/temClienteStripe \? \(/);
    // E quem tem mensalidade consegue mesmo passar para vitalício.
    expect(page).toContain("Passar para vitalício");
    expect(page).toMatch(/abrirCheckout\("vitalicio"\)/);
    // Mas só a mensalidade da Stripe: é a única que o servidor sabe cancelar
    // depois da compra. Lemon Squeezy ficaria a cobrar em paralelo.
    expect(page).toMatch(/const temMensalidade = origem === "stripe"/);
  });

  it("o cliente recebe do servidor se tem cliente Stripe", () => {
    const ctx = read("src/lib/stripe/subscription.tsx");
    expect(ctx).toMatch(/temClienteStripe: boolean;/);
    expect(ctx).toContain("setTemClienteStripe(Boolean(result.temClienteStripe))");
    expect(read("src/lib/billing/access.ts")).toContain("temClienteStripe");
  });
});
