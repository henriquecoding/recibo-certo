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

import "server-only";
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
import { manifesto, rotuloLigacao } from "@/lib/guias/manifests";
import { APP_VERSION } from "@/lib/version";
import { previewAtivo, catalogoDePreview, rotaDePreview } from "./preview.server";
import { rotaDoSimulador, type SimuladorId } from "@/content/fiz-simulator-routes";
import { rotaDoGuiaAtiva } from "@/content/fiz-guide-routes";
import {
  parceriaAtiva,
  parceriasAtivas,
  parceriaUtilizavel,
} from "@/lib/parcerias/catalogo.server";
import { modoEfetivo, type ModoParceria } from "@/lib/parcerias/modos";
import { DIVULGACAO_LIGACAO } from "@/content/parcerias-copy";
import type { FizIntent } from "@/lib/guias/manifests";

/**
 * Os estados da interface. Eram seis (ponto 8.3 da auditoria); são sete desde
 * que existe um modo de parceria.
 *
 * `disponivel_ligacao` é o da Fase 1: um link externo, sem conta e sem
 * consentimento. Não é um sétimo caso do mesmo problema — é o modo mais
 * simples dos três que já estavam declarados em `GuideDataMode` e que nunca
 * tinha sido exercitado porque não havia destino.
 */
export type EstadoAcaoFiz =
  | "disponivel_ligacao" // NOVO — link externo de afiliado; sem conta, sem consentimento
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
  /**
   * Destino externo, preenchido APENAS em `disponivel_ligacao`. É sempre uma
   * rota nossa (`/ir/<parceiro>?…`), nunca o link do parceiro: o código de
   * afiliado não fica em HTML estático, e o destino é validado a cada clique.
   */
  destinoLigacao?: string;
  /** Modo efetivo desta superfície — o mínimo entre a parceria e a rota. */
  modo?: ModoParceria;
  /**
   * O que o utilizador ganha ao continuar, no modo em que a superfície corre.
   * Em LIGACAO descreve o que o parceiro faz; nunca o que seria transportado.
   */
  promessa?: string;
}

/**
 * Divulgação da Fase 2 (handoff / conta ligada).
 *
 * «A parceria é remunerada» descreve um acordo comercial genérico. Não diz
 * que ESTE link paga comissão POR ESTA subscrição, que é o que a cl. 11.2 do
 * Contrato de Afiliado exige — a par da identificação como publicidade. Para
 * o modo LIGACAO existe `DIVULGACAO_LIGACAO`, que o diz.
 */
export const DIVULGACAO_PADRAO =
  "A FIZ é um parceiro de execução fiscal. O ReciboCerto explica e prepara; a FIZ executa. A parceria é remunerada.";

/** Chave da parceria FIZ em `admin_partners.parceiro_key`. */
const CHAVE_FIZ = "fiz";

/**
 * Passo de LIGAÇÃO — o primeiro a ser tentado depois da bandeira.
 *
 * ⚠️ Corre ANTES da pré-visualização, e isso é o ponto.
 *
 * A primeira versão punha-o atrás de `PARCERIAS_ATIVAS`, uma variável que não
 * estava definida em lado nenhum. O efeito: este passo nunca corria, a
 * resolução caía no catálogo simulado da Fase 2, e o site abria um diálogo de
 * consentimento a prometer «continuar sem repetir dados» — a SIMULAÇÃO de uma
 * integração que não existe, por cima da parceria que existe mesmo.
 *
 * A ordem certa é esta: o que está contratado hoje ganha a uma maquete do que
 * talvez venha a estar. Quem quiser rever o desenho da Fase 2 num deploy de
 * ramo pede a pré-visualização explicitamente com
 * `NEXT_PUBLIC_FIZ_PREVIEW=true` — e aí, e só aí, ela passa à frente.
 *
 * Devolve `null` quando não há parceria em modo LIGACAO.
 */
async function passoDeLigacao(entrada: {
  dataMode: GuideRoute["dataMode"];
  capabilityKey: string;
  rotulo: string;
  superficie: string;
  slug?: string;
  intent?: FizIntent;
  exigeRevisaoHumana: boolean;
  promessa?: string;
}): Promise<AcaoFizResolvida | null> {
  if (!parceriasAtivas()) return null;
  // A pré-visualização da Fase 2 só ganha quando é pedida explicitamente.
  // Sem isto, qualquer ambiente que não seja produção mostraria a maquete.
  if (process.env.NEXT_PUBLIC_FIZ_PREVIEW === "true") return null;

  const parceria = await parceriaAtiva(CHAVE_FIZ);
  if (!parceriaUtilizavel(parceria)) return null;

  const modo = modoEfetivo(parceria.modo, entrada.dataMode);
  if (modo !== "LIGACAO") return null;

  const destino = new URL(`/ir/${CHAVE_FIZ}`, "https://placeholder.local");
  destino.searchParams.set("s", entrada.superficie);
  if (entrada.slug) destino.searchParams.set("g", entrada.slug);
  if (entrada.intent) destino.searchParams.set("i", entrada.intent);

  return {
    estado: "disponivel_ligacao",
    rotulo: entrada.rotulo,
    // O texto vem da base de dados para poder ser corrigido sem deploy; o
    // valor de recurso é o de afiliado, nunca o genérico da Fase 2.
    divulgacao: parceria.divulgacao.trim() || DIVULGACAO_LIGACAO,
    capabilityKey: entrada.capabilityKey,
    // Em LIGACAO nada é transportado — o modo de dados É `NO_DATA`, seja qual
    // for o que a rota gostaria de fazer.
    dataMode: "NO_DATA",
    requiresConsent: false,
    requiredScopes: [],
    degradado: false,
    exigeRevisaoHumana: entrada.exigeRevisaoHumana,
    preview: false,
    destinoLigacao: `${destino.pathname}${destino.search}`,
    modo,
    promessa: entrada.promessa,
  };
}

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

  // ── Passo 2: parceria em modo LIGACAO ───────────────────────────────
  // Antes da pré-visualização, porque em produção é este que vale. A rota
  // tem de estar ativa: `enabled` deixa de ser um campo decorativo.
  if (rotaDoGuiaAtiva(entrada.slug)) {
    const ligacao = await passoDeLigacao({
      dataMode: acao.dataPolicy,
      capabilityKey,
      // A copy de LIGACAO é obrigatória num Guia ativado — a de handoff
      // prometeria transporte de dados que não acontece.
      rotulo: rotuloLigacao(acao),
      superficie: "guia.next_step",
      slug: m.slug,
      intent: acao.intent,
      exigeRevisaoHumana: acao.exigeRevisaoHumana ?? false,
    });
    if (ligacao) return ligacao;
  }

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

  // `rota.enabled` NUNCA era lido aqui. O campo existia, era testado, e não
  // tinha efeito no encaminhamento. Não fazia mal enquanto nada chegasse tão
  // longe (`estadoIntegracao()` nunca é "pronta" sem credenciais); passa a
  // fazer no momento em que existe um caminho de resolução que não passa por
  // aí — que é exatamente o que o modo LIGACAO introduz.
  if (!rota.enabled) return null;

  const ligacao = await passoDeLigacao({
    dataMode: rota.dataMode,
    capabilityKey,
    rotulo: rota.fallbackLabelLigacao,
    superficie: "simulador.plano_acao",
    slug: rota.simulador,
    intent: rota.intent,
    exigeRevisaoHumana: rota.exigeRevisaoHumana ?? false,
    promessa: rota.promessaLigacao,
  });
  if (ligacao) return ligacao;

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
