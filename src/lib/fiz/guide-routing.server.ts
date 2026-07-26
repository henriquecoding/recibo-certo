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
import { previewAtivo, catalogoDePreview, rotaDePreview } from "./preview.server";
import { rotaDoSimulador, type SimuladorId } from "@/content/fiz-simulator-routes";

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
  /** true quando a resposta vem do catálogo local de pré-visualização.
      A interface TEM de o dizer ao utilizador — ver FizAvisoPreVisualizacao. */
  preview: boolean;
}

export const DIVULGACAO_PADRAO =
  "A FIZ é um parceiro de execução fiscal. O ReciboCerto explica e prepara; a FIZ executa. A parceria é remunerada.";

/** Versão do Guia enviada à FIZ: identifica o conteúdo que gerou a ação. */
export function versaoDoGuia(slug: string): string {
  const m = manifesto(slug);
  return `${m?.lastReviewedAt ?? "0000-00-00"}+${APP_VERSION}`;
}

function semAcao(motivo: string, capabilityKey: string, estado: EstadoAcaoFiz, degradado = false, preview = false): AcaoFizResolvida {
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
    preview,
  };
}

/**
 * Passo comum a Guias e simuladores: dada uma capacidade, um modo de dados e
 * um rótulo, decide em que estado a interface fica.
 *
 * Extraído porque a lógica de estados é idêntica nos dois sítios — e é
 * exatamente o tipo de regra que não pode divergir entre superfícies.
 */
function decidirEstado(opcoes: {
  capabilityKey: string;
  dataMode: GuideRoute["dataMode"];
  rotulo: string;
  divulgacao: string;
  requiredScopes: string[];
  requiresConsent: boolean;
  exigeRevisaoHumana: boolean;
  exigePlanoFiz: boolean;
  estadoLigacao: ConnectionState;
  degradado: boolean;
  preview: boolean;
}): AcaoFizResolvida {
  let estado: EstadoAcaoFiz;
  if (opcoes.dataMode === "CONNECTED_ACCOUNT") {
    estado = opcoes.estadoLigacao === "CONNECTED" ? "disponivel_ligado" : "disponivel_por_ligar";
  } else if (opcoes.dataMode === "CONSENTED_HANDOFF") {
    estado = opcoes.estadoLigacao === "CONNECTED" ? "disponivel_ligado" : "disponivel_criar_conta";
  } else {
    estado = "disponivel_criar_conta";
  }
  if (opcoes.exigePlanoFiz && estado === "disponivel_ligado") estado = "requer_plano_fiz";

  return {
    estado,
    rotulo: opcoes.rotulo,
    divulgacao: opcoes.divulgacao,
    capabilityKey: opcoes.capabilityKey,
    dataMode: opcoes.dataMode,
    requiresConsent: opcoes.requiresConsent,
    requiredScopes: opcoes.requiredScopes,
    degradado: opcoes.degradado,
    exigeRevisaoHumana: opcoes.exigeRevisaoHumana,
    preview: opcoes.preview,
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
  const publico = entrada.audience ?? m.audiences[0];

  // ── Pré-visualização: catálogo local, sem rede ──────────────────────
  if (previewAtivo()) {
    const cap = catalogoDePreview().capabilities.find((c) => c.key === capabilityKey);
    const rota = rotaDePreview({ capabilityKey, dataMode: acao.dataPolicy, label: acao.fallbackLabel });
    if (!cap || !rota || rota.availability === "UNAVAILABLE" || rota.availability === "RETIRED") {
      return semAcao(rota?.unavailableReason ?? "Capacidade indisponível nesta pré-visualização.", capabilityKey, "indisponivel", false, true);
    }
    return decidirEstado({
      capabilityKey,
      dataMode: rota.dataMode,
      rotulo: rota.label,
      divulgacao: rota.disclosure ?? DIVULGACAO_PADRAO,
      requiredScopes: rota.requiredScopes ?? [],
      requiresConsent: rota.requiresConsent,
      exigeRevisaoHumana: acao.exigeRevisaoHumana ?? false,
      exigePlanoFiz: (cap.productKeys?.length ?? 0) > 0,
      estadoLigacao,
      degradado: cap.availability === "DEGRADED",
      preview: true,
    });
  }

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

  return decidirEstado({
    capabilityKey: rota.capabilityKey || capabilityKey,
    dataMode: rota.dataMode,
    rotulo: rota.label || acao.fallbackLabel,
    divulgacao: rota.disclosure ?? DIVULGACAO_PADRAO,
    requiredScopes: rota.requiredScopes ?? cap.requiredScopes ?? [],
    requiresConsent: rota.requiresConsent,
    exigeRevisaoHumana: acao.exigeRevisaoHumana ?? false,
    // Um produto pago da FIZ é apresentado como tal — nunca confundido com
    // o Recibo Certo Plus (ponto 8.4 da auditoria).
    exigePlanoFiz: (cap.productKeys?.length ?? 0) > 0,
    estadoLigacao,
    degradado,
    preview: false,
  });
}

// ─── Simuladores (ponto 12.3 da arquitetura) ───────────────────────────

export interface EntradaSimulador {
  simulador: SimuladorId;
  connectionState?: ConnectionState;
  audience?: GuideAudience;
}

/**
 * Resolve a ação FIZ de um simulador.
 *
 * Diferença face aos Guias: aqui existe sempre um resultado calculado, por
 * isso o passo seguinte transporta um resumo da simulação. Tudo o resto —
 * catálogo, estados, divulgação, fallback — é exatamente igual, porque o
 * utilizador não deve notar que são superfícies diferentes.
 *
 * Nunca lança.
 */
export async function resolverAcaoDoSimulador(entrada: EntradaSimulador): Promise<AcaoFizResolvida | null> {
  const rota = rotaDoSimulador(entrada.simulador);
  // Simuladores sem ação (recibo de vencimento, auditoria, heranças) têm a
  // razão documentada em `SIMULADORES_SEM_ACAO_FIZ`.
  if (!rota) return null;

  const capabilityKey = rota.requiredCapability;
  const estadoLigacao: ConnectionState = entrada.connectionState ?? "NOT_CONNECTED";

  if (previewAtivo()) {
    const cap = catalogoDePreview().capabilities.find((c) => c.key === capabilityKey);
    const resolvida = rotaDePreview({ capabilityKey, dataMode: rota.dataMode, label: rota.fallbackLabel });
    if (!cap || !resolvida || resolvida.availability === "UNAVAILABLE" || resolvida.availability === "RETIRED") {
      return semAcao(resolvida?.unavailableReason ?? "Capacidade indisponível nesta pré-visualização.", capabilityKey, "indisponivel", false, true);
    }
    return decidirEstado({
      capabilityKey,
      dataMode: resolvida.dataMode,
      rotulo: resolvida.label,
      divulgacao: resolvida.disclosure ?? DIVULGACAO_PADRAO,
      requiredScopes: resolvida.requiredScopes ?? [],
      requiresConsent: resolvida.requiresConsent,
      exigeRevisaoHumana: rota.exigeRevisaoHumana ?? false,
      exigePlanoFiz: (cap.productKeys?.length ?? 0) > 0,
      estadoLigacao,
      degradado: cap.availability === "DEGRADED",
      preview: true,
    });
  }

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

  return decidirEstado({
    capabilityKey,
    dataMode: rota.dataMode,
    rotulo: rota.fallbackLabel,
    divulgacao: DIVULGACAO_PADRAO,
    requiredScopes: cap.requiredScopes ?? [],
    requiresConsent: rota.dataMode === "CONSENTED_HANDOFF",
    exigeRevisaoHumana: rota.exigeRevisaoHumana ?? false,
    exigePlanoFiz: (cap.productKeys?.length ?? 0) > 0,
    estadoLigacao,
    degradado,
    preview: false,
  });
}
