// ═══════════════════════════════════════════════════════════════════════
//  ATRIBUIÇÃO COMERCIAL E RECONCILIAÇÃO
//  ---------------------------------------------------------------------
//  Ponto 16 da arquitetura. A atribuição faz parte da integração, mas NÃO
//  substitui a experiência: nenhuma decisão editorial depende dela, e uma
//  falha aqui nunca pode impedir o utilizador de continuar.
//
//  Por isso `registarReferencia` engole erros — perder a atribuição de um
//  clique é um problema comercial nosso, não do utilizador.
// ═══════════════════════════════════════════════════════════════════════

import { randomUUID } from "node:crypto";
import { pedirFiz } from "./client.server";
import { fizServerConfig } from "./config";
import { FizError } from "./errors";
import {
  PARTNER_SCOPES,
  destinoFizValido,
  type Commission,
  type CommissionStatus,
  type CreateOnboardingSessionRequest,
  type CreateReferralRequest,
  type GuideSourceContext,
  type Intent,
  type OnboardingSession,
  type Paged,
  type ProfilePrefill,
  type Referral,
} from "./contracts";

/**
 * Regista um clique atribuível. Devolve `null` em vez de lançar: a
 * atribuição é acessória e nunca deve travar a navegação.
 */
export async function registarReferencia(entrada: {
  destino: string;
  placement: string;
  intent?: Intent;
  sourceContext?: GuideSourceContext;
  anonymousSessionId?: string;
  campaign?: string;
}): Promise<Referral | null> {
  if (!destinoFizValido(entrada.destino)) {
    console.warn("[fiz] referência recusada: destino fora dos domínios da FIZ");
    return null;
  }

  const pedido: CreateReferralRequest = {
    externalClickId: randomUUID(),
    referralCode: fizServerConfig().referralCode,
    placement: entrada.placement,
    destination: entrada.destino,
    locale: "pt-PT",
    ...(entrada.anonymousSessionId ? { anonymousSessionId: entrada.anonymousSessionId } : {}),
    ...(entrada.campaign ? { campaign: entrada.campaign } : {}),
    ...(entrada.intent ? { intent: entrada.intent } : {}),
    ...(entrada.sourceContext ? { sourceContext: entrada.sourceContext } : {}),
  };

  try {
    const { dados } = await pedirFiz<Referral>({
      caminho: "/v1/partner/referrals",
      metodo: "POST",
      scopes: [PARTNER_SCOPES.referralsWrite],
      idempotencyKey: pedido.externalClickId,
      corpo: pedido,
    });
    return dados;
  } catch (erro) {
    if (!(erro instanceof FizError) || !erro.silencioso) {
      console.warn("[fiz] não foi possível registar a referência");
    }
    return null;
  }
}

export async function estadoReferencia(referralId: string): Promise<Referral | null> {
  const { dados } = await pedirFiz<Referral>({
    caminho: `/v1/partner/referrals/${encodeURIComponent(referralId)}`,
    scopes: [PARTNER_SCOPES.referralsRead],
  });
  return dados;
}

/**
 * Sessão de onboarding atribuída — usada quando o utilizador ainda não tem
 * conta na FIZ. O `prefill` só pode conter o que o utilizador autorizou.
 */
export async function criarSessaoOnboarding(entrada: {
  intent: Intent;
  regressoInterno: string;
  prefill?: ProfilePrefill;
  sourceContext?: GuideSourceContext;
}): Promise<OnboardingSession> {
  const cfg = fizServerConfig();
  const pedido: CreateOnboardingSessionRequest = {
    externalSessionId: randomUUID(),
    referralCode: cfg.referralCode,
    intent: entrada.intent,
    locale: "pt-PT",
    returnUrl: new URL(entrada.regressoInterno, cfg.appUrl).toString(),
    cancelUrl: new URL("/dashboard/conta", cfg.appUrl).toString(),
    ...(entrada.prefill ? { prefill: entrada.prefill } : {}),
    ...(entrada.sourceContext ? { sourceContext: entrada.sourceContext } : {}),
  };

  const { dados } = await pedirFiz<OnboardingSession>({
    caminho: "/v1/partner/onboarding-sessions",
    metodo: "POST",
    scopes: [PARTNER_SCOPES.referralsWrite],
    idempotencyKey: pedido.externalSessionId,
    corpo: pedido,
  });

  if (!dados?.url) throw new FizError("indisponivel", "A FIZ não devolveu um destino de onboarding.");
  if (!destinoFizValido(dados.url)) {
    throw new FizError("destino_recusado", "O destino de onboarding não pertence à FIZ.");
  }
  return dados;
}

/**
 * Comissões para reconciliação. Uso administrativo — nunca exposto ao
 * utilizador final, que não tem nada a ver com a economia da parceria.
 */
export async function listarComissoes(filtros: {
  estado?: CommissionStatus;
  de?: string;
  ate?: string;
  cursor?: string;
} = {}): Promise<Paged<Commission>> {
  const { dados } = await pedirFiz<Paged<Commission>>({
    caminho: "/v1/partner/commissions",
    scopes: [PARTNER_SCOPES.commissions],
    query: { status: filtros.estado, from: filtros.de, to: filtros.ate, cursor: filtros.cursor, limit: 100 },
  });
  return dados ?? { data: [] };
}

/** Soma por estado — o número que interessa para conferir com a FIZ. */
export function totalPorEstado(comissoes: Commission[]): Record<CommissionStatus, number> {
  const total: Record<CommissionStatus, number> = { PENDING: 0, APPROVED: 0, PAID: 0, REVERSED: 0 };
  for (const c of comissoes) total[c.status] += c.commission.amount;
  return total;
}
