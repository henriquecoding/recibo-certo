import { NextResponse } from "next/server";
import { enviarEmail } from "@/lib/email/send";
import { emailGuardiaoFiscal, type NivelGuardiao } from "@/lib/email/templates";
import { IVA_ISENCAO_LIMITE } from "@/lib/fiscal-data";
import { cronAutorizado } from "@/lib/cron-auth";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { concedePlus, type OrigemConcessao } from "@/lib/stripe/precos-autorizados";

const LIMIT = IVA_ISENCAO_LIMITE.value;
const THRESHOLDS: { nivel: NivelGuardiao; ratio: number }[] = [
  { nivel: "ultrapassado", ratio: 1 },
  { nivel: "critico", ratio: 0.95 },
  { nivel: "preparacao", ratio: 0.9 },
  { nivel: "aviso", ratio: 0.8 },
];

interface SubscriptionGrantRow {
  user_id: string;
  status: string;
  price_id: string | null;
  origem: OrigemConcessao | null;
  ls_subscription_id: string | null;
  stripe_payment_intent: string | null;
  concessao_termina_em: string | null;
  periodo_graca_termina_em: string | null;
  cupao_id: string | null;
  motivo: string | null;
  concedido_por: string | null;
}

export async function POST(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ erro: "Supabase não configurado." }, { status: 500 });
  const year = new Date().getFullYear();

  const [subscriptionsResult, catalogResult] = await Promise.all([
    sb.from("subscriptions").select(
      "user_id, status, price_id, origem, ls_subscription_id, stripe_payment_intent, "
      + "concessao_termina_em, periodo_graca_termina_em, cupao_id, motivo, concedido_por",
    ).in("status", ["active", "trialing", "past_due"]),
    sb.from("billing_price_catalog").select("stripe_price_id").eq("concede_plus", true),
  ]);
  if (subscriptionsResult.error || catalogResult.error) {
    console.error("[email/guardiao] Falha ao confirmar subscrições:",
      subscriptionsResult.error?.message ?? catalogResult.error?.message);
    return NextResponse.json({ erro: "Não foi possível confirmar os planos." }, { status: 503 });
  }
  const prices = (catalogResult.data ?? []).map((row) => row.stripe_price_id as string);
  const grants = (subscriptionsResult.data ?? []) as unknown as SubscriptionGrantRow[];
  const userIds = [...new Set(grants.filter((row) => concedePlus({
    status: row.status as string,
    priceId: row.price_id as string | null,
    origem: row.origem as OrigemConcessao | null,
    lsSubscriptionId: row.ls_subscription_id as string | null,
    paymentIntent: row.stripe_payment_intent as string | null,
    terminaEm: row.concessao_termina_em as string | null,
    periodoGracaTerminaEm: row.periodo_graca_termina_em as string | null,
    cupaoId: row.cupao_id as string | null,
    motivo: row.motivo as string | null,
    concedidoPor: row.concedido_por as string | null,
  }, prices)).map((row) => row.user_id as string))];
  if (!userIds.length) return NextResponse.json({ msg: "Sem subscritores Plus ativos.", enviados: 0 });

  const [receiptsResult, previousResult, profilesResult] = await Promise.all([
    sb.from("recibos").select("user_id, valor").in("user_id", userIds)
      .gte("data", `${year}-01-01`).lte("data", `${year}-12-31`),
    sb.from("alertas_guardiao").select("user_id, nivel").in("user_id", userIds).eq("ano", year),
    sb.from("profiles").select("id, email").in("id", userIds),
  ]);
  const queryError = receiptsResult.error ?? previousResult.error ?? profilesResult.error;
  if (queryError) {
    console.error("[email/guardiao] Falha ao preparar alertas:", queryError.message);
    return NextResponse.json({ erro: "Não foi possível preparar os alertas." }, { status: 503 });
  }
  const receipts = receiptsResult.data;
  const previous = previousResult.data;
  const profiles = profilesResult.data;
  if (!receipts?.length) return NextResponse.json({ msg: "Sem recibos para processar.", enviados: 0 });

  const billed = new Map<string, number>();
  for (const receipt of receipts) {
    const id = receipt.user_id as string;
    billed.set(id, (billed.get(id) ?? 0) + Number(receipt.valor));
  }
  const alreadySent = new Set((previous ?? []).map((row) => `${row.user_id}:${row.nivel}`));
  const emails = new Map((profiles ?? []).filter((row) => row.email).map((row) => [row.id as string, row.email as string]));
  const records: { user_id: string; nivel: string; ano: number; faturado: number }[] = [];

  for (const userId of userIds) {
    const total = billed.get(userId) ?? 0;
    const email = emails.get(userId);
    if (!email) continue;
    const ratio = total / LIMIT;
    // Envia apenas o patamar atual mais alto. Quem entra já acima do limite
    // não deve receber, nos crons seguintes, alertas progressivamente menos graves.
    const threshold = THRESHOLDS.find((item) => ratio >= item.ratio);
    if (threshold && alreadySent.has(`${userId}:${threshold.nivel}`)) continue;
    if (!threshold) continue;
    const template = emailGuardiaoFiscal({
      faturado: total,
      limite: LIMIT,
      restante: Math.max(0, LIMIT - total),
      percentagem: ratio,
      nivel: threshold.nivel,
    });
    const sent = await enviarEmail({
      to: email,
      ...template,
      idempotencyKey: `guardiao-${year}-${userId}-${threshold.nivel}`,
    });
    if (!sent.erro) records.push({ user_id: userId, nivel: threshold.nivel, ano: year, faturado: total });
  }

  if (records.length) {
    const { error } = await sb.from("alertas_guardiao").upsert(records, {
      onConflict: "user_id,nivel,ano",
      ignoreDuplicates: true,
    });
    if (error) console.error("[email/guardiao] Emails enviados sem ledger local:", error.message);
  }
  return NextResponse.json({ enviados: records.length, utilizadoresProcessados: userIds.length, ano: year });
}
