// POST /api/ls/webhook
//
// Recebe eventos do Lemon Squeezy e sincroniza a tabela `subscriptions`
// no Supabase. A LS envia um header X-Signature com HMAC-SHA256.
//
// Eventos tratados:
//   subscription_created   → inserir/ativar subscrição
//   subscription_updated   → atualizar estado
//   subscription_cancelled → marcar como cancelado
//   subscription_expired   → marcar como cancelado
//   subscription_resumed   → reativar
//   subscription_paused    → pausa temporária
//   subscription_payment_failed → past_due

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  verificarAssinaturaLS,
  mapearStatusLS,
  mapearIntervaloLS,
  type LsWebhookPayload,
} from "@/lib/lemonsqueezy/server";

// Supabase admin (service_role) — bypass de RLS
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  // 1. Ler body raw para verificar assinatura HMAC
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  if (!verificarAssinaturaLS(rawBody, signature)) {
    console.warn("[ls/webhook] Assinatura inválida.");
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 401 });
  }

  let payload: LsWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LsWebhookPayload;
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const evento    = payload.meta.event_name;
  const customData = payload.meta.custom_data;
  const atributos  = payload.data.attributes;
  const lsSubId    = payload.data.id;

  console.log(`[ls/webhook] ${evento} — sub: ${lsSubId}`);

  const sb = getAdmin();
  if (!sb) {
    return NextResponse.json({ erro: "Supabase não configurado." }, { status: 500 });
  }

  // Resolver user_id: vem em custom_data ou tentamos pelo email
  let userId: string | null = customData?.supabase_uid ?? null;

  if (!userId && atributos.user_email) {
    // Fallback: buscar pelo email no auth.users
    const { data: userData } = await sb
      .from("profiles")
      .select("id")
      .eq("email", atributos.user_email)
      .limit(1)
      .single();
    userId = userData?.id ?? null;
  }

  if (!userId) {
    console.warn(`[ls/webhook] Utilizador não encontrado para sub ${lsSubId}`);
    // Devolver 200 para a LS não retentar indefinidamente
    return NextResponse.json({ aviso: "Utilizador não mapeado." });
  }

  const status    = mapearStatusLS(atributos.status);
  const intervalo = mapearIntervaloLS(atributos.interval_unit);
  const canceladoEm = atributos.cancelled_at
    ? new Date(atributos.cancelled_at).toISOString()
    : null;

  const linha = {
    user_id:              userId,
    ls_subscription_id:   lsSubId,
    ls_customer_id:       String(atributos.customer_id),
    customer_portal_url:  atributos.customer_portal_url ?? null,
    status,
    intervalo,
    inicio: new Date().toISOString(),
    cancelado_em: canceladoEm,
    atualizado_em: new Date().toISOString(),
  };

  // Upsert idempotente: ls_subscription_id é a chave natural
  const { error } = await sb
    .from("subscriptions")
    .upsert(linha, { onConflict: "ls_subscription_id" });

  if (error) {
    console.error("[ls/webhook] Erro no upsert:", error);
    return NextResponse.json({ erro: "Erro a guardar subscrição." }, { status: 500 });
  }

  return NextResponse.json({ recebido: true, evento, userId });
}
