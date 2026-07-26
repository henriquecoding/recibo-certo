// ═══════════════════════════════════════════════════════════════════════
//  RESOLUÇÃO DA AÇÃO FIZ DE UM GUIA
//  ---------------------------------------------------------------------
//  Ponto 8.2 da auditoria + 6.2 da arquitetura. O Guia diz "quero continuar
//  esta intenção"; a FIZ responde se consegue, com que rótulo e em que
//  modo de dados. O Recibo Certo NUNCA constrói um URL da FIZ à mão.
//
//  Esta função não lança: devolve sempre um estado renderizável. Um Guia
//  não pode ficar quebrado porque a FIZ está em baixo (ponto 6.3).
// ═══════════════════════════════════════════════════════════════════════

import { pedirFiz } from "./client.server";
import { obterCatalogo } from "./capabilities.server";
import { FizError } from "./errors";
import { estadoIntegracao } from "./config";
import {
  PARTNER_SCOPES,
  type ConnectionState,
  type GuideRoute,
  type ResolveGuideRouteRequest,
  type GuideAudience,
  type Placement,
} from "./contracts";
import { manifesto } from "@/lib/guias/manifests";
import { APP_VERSION } from "@/lib/version";

/** Os seis estados obrigatórios da interface (ponto 8.3 da auditoria). */
export type EstadoAcaoFiz =
  | "disponivel_ligado" // capacidade suportada e conta ligada
  | "disponivel_por_ligar" // suportada, mas a conta ainda não está ligada
  | "disponivel_criar_conta" // exige criar conta na FIZ
  | "indisponivel" // a FIZ não suporta esta ação
  | "requer_plano_fiz" // depende das condições comerciais da FIZ
  | "fiz_indisponivel"; // falha temporária

export interface AcaoFizResolvida {
  estado: EstadoAcaoFiz;
  /** Rótulo aprovado pela FIZ, ou o de recurso do manifesto. */
  rotulo: string;
  /** Divulgação da relação comercial — sempre visível. */
  divulgacao: string;
  destinationKey?: string;
  capabilityKey: string;
  dataMode: GuideRoute["dataMode"];
  requiresConsent: boolean;
  requiredScopes: string[];
  /** Motivo legível quando não está disponível. */
  motivo?: string;
  /** true quando o catálogo veio de cache por a FIZ estar em baixo. */
  degradado: boolean;
  exigeRevisaoHumana: boolean;
}

export const DIVULGACAO_PADRAO =
  "A FIZ é um parceiro de execução fiscal. O ReciboCerto explica e prepara; a FIZ executa. A parceria é remunerada.";

/** Versão do Guia enviada à FIZ: identifica o conteúdo que gerou a ação. */
export function versaoDoGuia(slug: string): string {
  const m = manifesto(slug);
  return `${m?.lastReviewedAt ?? "0000-00-00"}+${APP_VERSION}`;
}

function semAcao(motivo: string, capabilityKey: string, estado: EstadoAcaoFiz, degradado = false): AcaoFizResolvida {
  return {
    estado,
    rotulo: "",
    divulgacao: DIVULGACAO_PADRAO,
    capabilityKey,
    dataMode: "NO_DATA",
    requiresConsent: false,
    requiredScopes: [],
    motivo,
    degradado,
    exigeRevisaoHumana: false,
  };
}

export interface EntradaResolucao {
  slug: string;
  audience?: GuideAudience;
  placement?: Placement;
  connectionState?: ConnectionState;
}

/**
 * Resolve a ação FIZ de um Guia. Nunca lança.
 */
export async function resolverAcaoDoGuia(entrada: EntradaResolucao): Promise<AcaoFizResolvida | null> {
  const m = manifesto(entrada.slug);
  // Guias sem ação FIZ declarada (ex.: recibo de vencimento, subsídios,
  // trabalho suplementar) não mostram nada — é uma decisão editorial.
  if (!m?.fizAction) return null;

  const acao = m.fizAction;
  const capabilityKey = acao.requiredCapability;
  const estadoLigacao: ConnectionState = entrada.connectionState ?? "NOT_CONNECTED";

  if (estadoIntegracao() !== "pronta") {
    return semAcao("A integração com a FIZ ainda não está ativa.", capabilityKey, "indisponivel");
  }

  const { catalogo, degradado } = await obterCatalogo();
  if (!catalogo) {
    return semAcao("A FIZ está temporariamente indisponível.", capabilityKey, "fiz_indisponivel", degradado);
  }

  const cap = catalogo.capabilities.find((c) => c.key === capabilityKey);
  if (!cap || cap.availability === "UNAVAILABLE" || cap.availability === "RETIRED") {
    return semAcao("A FIZ não suporta esta ação de momento.", capabilityKey, "indisponivel", degradado);
  }
  // Público do Guia tem de ser elegível para a capacidade.
  const publico = entrada.audience ?? m.audiences[0];
  if (publico && cap.audiences.length > 0 && !cap.audiences.includes(publico)) {
    return semAcao("Esta ação não se aplica ao teu enquadramento.", capabilityKey, "indisponivel", degradado);
  }

  let rota: GuideRoute | null = null;
  try {
    const pedido: ResolveGuideRouteRequest = {
      guideSlug: m.slug,
      guideVersion: versaoDoGuia(m.slug),
      topic: acao.topic,
      intent: acao.intent,
      audience: publico ?? "MIXED",
      locale: "pt-PT",
      connectionState: estadoLigacao,
      placement: entrada.placement ?? "NEXT_STEP",
    };
    const { dados } = await pedirFiz<GuideRoute>({
      caminho: "/v1/partner/guide-routes:resolve",
      metodo: "POST",
      scopes: [PARTNER_SCOPES.guideRouting],
      corpo: pedido,
    });
    rota = dados;
  } catch (erro) {
    const codigo = erro instanceof FizError ? erro.codigo : "indisponivel";
    if (codigo === "nao_encontrado") {
      return semAcao("A FIZ não tem uma continuação para este guia.", capabilityKey, "indisponivel", degradado);
    }
    return semAcao("A FIZ está temporariamente indisponível.", capabilityKey, "fiz_indisponivel", true);
  }

  if (!rota || rota.availability === "UNAVAILABLE" || rota.availability === "RETIRED") {
    return semAcao(rota?.unavailableReason ?? "Ação indisponível.", capabilityKey, "indisponivel", degradado);
  }

  // Um produto pago da FIZ é apresentado como tal — nunca confundido com o
  // Plus do ReciboCerto (ponto 8.4 da auditoria).
  const exigePlanoFiz = (cap.productKeys?.length ?? 0) > 0;

  let estado: EstadoAcaoFiz;
  if (rota.dataMode === "CONNECTED_ACCOUNT") {
    estado = estadoLigacao === "CONNECTED" ? "disponivel_ligado" : "disponivel_por_ligar";
  } else if (rota.dataMode === "CONSENTED_HANDOFF") {
    estado = estadoLigacao === "CONNECTED" ? "disponivel_ligado" : "disponivel_criar_conta";
  } else {
    estado = "disponivel_criar_conta";
  }
  if (exigePlanoFiz && estado === "disponivel_ligado") estado = "requer_plano_fiz";

  return {
    estado,
    rotulo: rota.label || acao.fallbackLabel,
    divulgacao: rota.disclosure ?? DIVULGACAO_PADRAO,
    destinationKey: rota.destinationKey,
    capabilityKey: rota.capabilityKey || capabilityKey,
    dataMode: rota.dataMode,
    requiresConsent: rota.requiresConsent,
    requiredScopes: rota.requiredScopes ?? cap.requiredScopes ?? [],
    degradado,
    exigeRevisaoHumana: acao.exigeRevisaoHumana ?? false,
  };
}
