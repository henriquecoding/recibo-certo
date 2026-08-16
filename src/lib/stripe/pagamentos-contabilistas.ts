import "server-only";

// ═══════════════════════════════════════════════════════════════════════
//  O que os webhooks fazem com os pagamentos do painel
//  ---------------------------------------------------------------------
//  Vive à parte das rotas por uma razão prática: são DOIS webhooks a
//  precisar disto.
//
//   · `/api/stripe/webhook`         — a conta da plataforma. É por onde
//     chega a compra de patamares, que é uma venda nossa.
//   · `/api/stripe/connect-webhook` — as contas dos contabilistas. É por
//     onde chegam as consultas pagas, que são vendas deles.
//
//  Duas moradas porque são dois segredos de assinatura diferentes, e
//  misturá-los significaria aceitar um evento de uma conta ligada com a
//  assinatura da plataforma. Não é uma comodidade: é a fronteira.
// ═══════════════════════════════════════════════════════════════════════

import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { lerEstadoDaConta } from "./connect";

function servico() {
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  return sb;
}

/** Uma consulta paga. Liquida, gasta o benefício e confirma o agendamento. */
export async function liquidarConsulta(sessao: Stripe.Checkout.Session): Promise<void> {
  const intent =
    typeof sessao.payment_intent === "string"
      ? sessao.payment_intent
      : sessao.payment_intent?.id ?? null;

  const { data, error } = await servico().rpc("liquidar_pagamento", {
    p_sessao: sessao.id,
    p_payment_intent: intent,
  });
  if (error) throw new Error(`liquidar_pagamento falhou: ${error.message}`);

  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  // `pagamento_desconhecido` acontece quando o Checkout foi criado por
  // outra instalação a apontar para a mesma conta Stripe. Não é um erro
  // nosso e repetir não o resolve — regista-se e segue.
  if (!r.ok && r.motivo !== "pagamento_desconhecido") {
    throw new Error(`liquidar_pagamento recusou: ${r.motivo}`);
  }
}

/** Um checkout de consulta que expirou ou falhou. */
export async function encerrarConsulta(
  sessaoId: string,
  estado: "falhado" | "expirado" | "cancelado",
  erro?: string,
): Promise<void> {
  const { error } = await servico().rpc("encerrar_pagamento", {
    p_sessao: sessaoId,
    p_estado: estado,
    p_erro: erro ?? null,
  });
  if (error) throw new Error(`encerrar_pagamento falhou: ${error.message}`);
}

/**
 * Uma compra de patamar paga.
 *
 * Delega em `aplicar_compra_patamar`, que já trata o caso difícil (§70): se
 * o XP alcançou o patamar durante o checkout, a compra fica sem objeto —
 * marca `needs_refund` e NUNCA transfere o pagamento para o patamar
 * seguinte. Isso não é uma falha do webhook, é o desfecho certo, e por
 * isso não se lança daqui.
 */
export async function aplicarDesbloqueio(sessao: Stripe.Checkout.Session): Promise<void> {
  const sb = servico();

  const compraId =
    sessao.metadata?.compra_id ??
    (await sb.rpc("compra_por_sessao", { p_sessao: sessao.id })).data;

  if (!compraId) throw new Error(`Sessão ${sessao.id} sem compra associada.`);

  const intent =
    typeof sessao.payment_intent === "string"
      ? sessao.payment_intent
      : sessao.payment_intent?.id ?? null;

  const { data, error } = await sb.rpc("aplicar_compra_patamar", {
    p_compra: compraId,
    p_stripe_payment_intent: intent,
  });
  if (error) throw new Error(`aplicar_compra_patamar falhou: ${error.message}`);

  const r = (data ?? {}) as { ok?: boolean; motivo?: string; estado?: string };
  if (!r.ok && r.motivo !== "patamar_ja_conquistado") {
    throw new Error(`aplicar_compra_patamar recusou: ${r.motivo}`);
  }
  if (r.motivo === "patamar_ja_conquistado") {
    // Fica registado para a administração devolver o dinheiro. Não é uma
    // exceção porque não há nada a repetir.
    console.warn("[stripe] Compra sem objeto — a devolver:", { compraId, estado: r.estado });
  }
}

/** O estado de uma conta Connect mudou. É a única fonte de `charges_enabled`. */
export async function sincronizarContaConnect(conta: Stripe.Account): Promise<void> {
  const estado = lerEstadoDaConta(conta);
  const contabilistaId = conta.metadata?.contabilista_id;

  const sb = servico();
  const alvo = contabilistaId
    ? sb.from("contabilista_stripe").update({
        charges_enabled: estado.chargesEnabled,
        payouts_enabled: estado.payoutsEnabled,
        details_submitted: estado.detailsSubmitted,
        requisitos: estado.requisitos,
        atualizado_em: new Date().toISOString(),
      }).eq("contabilista_id", contabilistaId)
    : sb.from("contabilista_stripe").update({
        charges_enabled: estado.chargesEnabled,
        payouts_enabled: estado.payoutsEnabled,
        details_submitted: estado.detailsSubmitted,
        requisitos: estado.requisitos,
        atualizado_em: new Date().toISOString(),
      }).eq("stripe_account_id", conta.id);

  const { error } = await alvo;
  if (error) throw new Error(`Sincronização da conta falhou: ${error.message}`);
}

/** É uma sessão nossa? Os metadados dizem-no, e a Stripe não os inventa. */
export function tipoDaSessao(sessao: Stripe.Checkout.Session): string | null {
  if (sessao.metadata?.app !== "recibo-certo") return null;
  return sessao.metadata?.tipo ?? null;
}
