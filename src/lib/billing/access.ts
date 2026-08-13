import "server-only";
import type { Plano } from "@/lib/entitlements";
import {
  concedePlus,
  eVitalicio,
  type OrigemConcessao,
} from "@/lib/stripe/precos-autorizados";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

interface SubscriptionRow {
  status: string;
  intervalo: string;
  price_id: string | null;
  origem: OrigemConcessao | null;
  ls_subscription_id: string | null;
  stripe_payment_intent: string | null;
  concessao_termina_em: string | null;
  periodo_graca_termina_em: string | null;
  cupao_id: string | null;
  motivo: string | null;
  concedido_por: string | null;
  stripe_customer_id: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface EstadoAcesso {
  plano: Plano;
  status: string | null;
  intervalo: "monthly" | "annual" | null;
  origem: OrigemConcessao | null;
  vitalicio: boolean;
  periodoGracaTerminaEm: string | null;
  temClienteStripe: boolean;
}

const PRIORIDADE: Record<OrigemConcessao, number> = {
  vitalicio: 5,
  manual: 4,
  stripe: 3,
  lemon_squeezy: 2,
  cupao: 1,
};

function entrada(linha: SubscriptionRow) {
  return {
    status: linha.status,
    priceId: linha.price_id,
    origem: linha.origem,
    lsSubscriptionId: linha.ls_subscription_id,
    paymentIntent: linha.stripe_payment_intent,
    terminaEm: linha.concessao_termina_em,
    periodoGracaTerminaEm: linha.periodo_graca_termina_em,
    cupaoId: linha.cupao_id,
    motivo: linha.motivo,
    concedidoPor: linha.concedido_por,
  };
}

export async function estadoAcessoDoUtilizador(userId: string): Promise<EstadoAcesso> {
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");

  const [subsResult, catalogResult, customerResult] = await Promise.all([
    sb.from("subscriptions")
      .select(
        "status, intervalo, price_id, origem, ls_subscription_id, stripe_payment_intent, "
        + "concessao_termina_em, periodo_graca_termina_em, cupao_id, motivo, concedido_por, "
        + "stripe_customer_id, criado_em, atualizado_em",
      )
      .eq("user_id", userId)
      .order("atualizado_em", { ascending: false })
      .limit(30),
    sb.from("billing_price_catalog")
      .select("stripe_price_id")
      .eq("concede_plus", true),
    sb.from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (subsResult.error) throw new Error(`Falha ao ler direitos de acesso: ${subsResult.error.message}`);
  if (catalogResult.error) throw new Error(`Falha ao ler catálogo de preços: ${catalogResult.error.message}`);

  // O cliente administrativo não usa os tipos gerados da base de dados; a
  // projeção é validada abaixo antes de conceder qualquer acesso.
  const rows = (subsResult.data ?? []) as unknown as SubscriptionRow[];
  const prices = (catalogResult.data ?? []).map((p) => p.stripe_price_id as string);
  const validas = rows
    .filter((row) => concedePlus(entrada(row), prices))
    .sort((a, b) => {
      const pa = PRIORIDADE[a.origem ?? "stripe"];
      const pb = PRIORIDADE[b.origem ?? "stripe"];
      if (pa !== pb) return pb - pa;
      return Date.parse(b.atualizado_em ?? b.criado_em ?? "") - Date.parse(a.atualizado_em ?? a.criado_em ?? "");
    });

  const concessao = validas[0] ?? null;
  const informativa = concessao ?? rows[0] ?? null;
  const origem = concessao?.origem ?? (concessao ? "stripe" : informativa?.origem ?? null);

  return {
    plano: concessao ? "plus" : "free",
    status: !concessao && informativa?.status === "past_due" ? "unpaid" : informativa?.status ?? null,
    intervalo: informativa?.intervalo === "annual" ? "annual"
      : informativa?.intervalo === "monthly" ? "monthly" : null,
    origem,
    vitalicio: Boolean(concessao && eVitalicio(origem)),
    periodoGracaTerminaEm: informativa?.periodo_graca_termina_em ?? null,
    temClienteStripe: Boolean(
      customerResult.data?.stripe_customer_id || rows.some((row) => row.stripe_customer_id),
    ),
  };
}

export async function utilizadorTemPlus(userId: string): Promise<boolean> {
  return (await estadoAcessoDoUtilizador(userId)).plano === "plus";
}
