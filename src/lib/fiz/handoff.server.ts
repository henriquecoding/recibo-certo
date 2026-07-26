// ═══════════════════════════════════════════════════════════════════════
//  HANDOFF CONSENTIDO
//  ---------------------------------------------------------------------
//  Ponto 8 da arquitetura. Transfere o contexto mínimo para a FIZ quando o
//  utilizador decide continuar lá, sem repetir dados.
//
//  Invioláveis:
//    · o utilizador vê os campos exatos ANTES de autorizar;
//    · nenhum consentimento vem pré-selecionado;
//    · o token é opaco e temporário; os dados nunca vão no URL;
//    · só seguem campos cobertos pelo recibo de consentimento;
//    · enviar dados é GRATUITO — nunca se verifica o plano Plus aqui.
// ═══════════════════════════════════════════════════════════════════════

import { randomUUID } from "node:crypto";
import { pedirFiz } from "./client.server";
import { fizServerConfig, POLITICA_CONSENTIMENTO_VERSAO } from "./config";
import { FizError } from "./errors";
import {
  PARTNER_SCOPES,
  FIZ_HANDOFF_SCHEMA_VERSION,
  destinoFizValido,
  urlSemDadosSensiveis,
  type ConsentEvidence,
  type CreateHandoffRequest,
  type Handoff,
  type Intent,
  type ProfilePrefill,
  type SimulationSummary,
  type GuideSourceContext,
} from "./contracts";
import { APP_VERSION } from "@/lib/version";

// ─── Campos apresentáveis ao utilizador ────────────────────────────────

export type CampoHandoff =
  | "entityType" | "activityCategory" | "vatTerritory" | "vatRegimeEstimate" | "socialSecuritySituation"
  | "grossEstimate" | "vatEstimate" | "withholdingEstimate" | "socialSecurityEstimate" | "irsEstimate"
  | "period" | "intent" | "sourceGuide";

/** Rótulos em pt-PT — é isto que o utilizador lê no diálogo de consentimento.
    Se um campo não estiver aqui, não pode ser enviado. */
export const ROTULO_CAMPO: Record<CampoHandoff, string> = {
  entityType: "Tipo de entidade (particular, empresário em nome individual ou sociedade)",
  activityCategory: "Categoria da atividade",
  vatTerritory: "Território para efeitos de IVA (continente, Madeira ou Açores)",
  vatRegimeEstimate: "Regime de IVA estimado",
  socialSecuritySituation: "Situação perante a Segurança Social",
  grossEstimate: "Valor bruto estimado",
  vatEstimate: "IVA estimado",
  withholdingEstimate: "Retenção na fonte estimada",
  socialSecurityEstimate: "Contribuição estimada para a Segurança Social",
  irsEstimate: "IRS estimado",
  period: "Periodicidade da estimativa",
  intent: "O que pretendes fazer a seguir",
  sourceGuide: "Guia de onde vieste",
};

/** Nunca sai daqui, em nenhuma circunstância (ponto 8.2 da arquitetura). */
export const CAMPOS_NUNCA_ENVIADOS = [
  "NIF", "NISS", "nome", "morada", "email", "telefone", "IBAN",
  "dados de clientes", "documentos emitidos", "anexos", "credenciais",
] as const;

export interface PropostaHandoff {
  intent: Intent;
  campos: CampoHandoff[];
  profile?: ProfilePrefill;
  simulationSummary?: SimulationSummary;
  sourceContext?: GuideSourceContext;
}

/** O que o diálogo de consentimento mostra antes de qualquer envio. */
export function previsualizarHandoff(proposta: PropostaHandoff): { campo: CampoHandoff; rotulo: string; valor: string }[] {
  const valores: Partial<Record<CampoHandoff, unknown>> = {
    entityType: proposta.profile?.entityType,
    activityCategory: proposta.profile?.activityCategory,
    vatTerritory: proposta.profile?.vatTerritory,
    vatRegimeEstimate: proposta.profile?.vatRegimeEstimate,
    socialSecuritySituation: proposta.profile?.socialSecuritySituation,
    grossEstimate: proposta.simulationSummary?.grossEstimate,
    vatEstimate: proposta.simulationSummary?.vatEstimate,
    withholdingEstimate: proposta.simulationSummary?.withholdingEstimate,
    socialSecurityEstimate: proposta.simulationSummary?.socialSecurityEstimate,
    irsEstimate: proposta.simulationSummary?.irsEstimate,
    period: proposta.simulationSummary?.period,
    intent: proposta.intent,
    sourceGuide: proposta.sourceContext?.guideSlug,
  };

  return proposta.campos
    .filter((c) => valores[c] !== undefined && valores[c] !== null)
    .map((c) => ({ campo: c, rotulo: ROTULO_CAMPO[c], valor: String(valores[c]) }));
}

// ─── Criação ───────────────────────────────────────────────────────────

export interface ResultadoHandoff {
  handoff: Handoff;
  /** URL opaco da FIZ, já validado. */
  url: string;
  consentReceiptId: string;
}

/**
 * Cria o handoff. `camposAutorizados` é o que o utilizador viu e aceitou —
 * qualquer campo fora dessa lista é descartado antes de sair daqui.
 */
export async function criarHandoff(
  proposta: PropostaHandoff,
  camposAutorizados: CampoHandoff[],
): Promise<ResultadoHandoff> {
  if (camposAutorizados.length === 0) {
    throw new FizError("invalido", "Não há consentimento para nenhum campo.");
  }
  const naoPropostos = camposAutorizados.filter((c) => !proposta.campos.includes(c));
  if (naoPropostos.length > 0) {
    // Defesa contra um cliente adulterado a autorizar campos nunca mostrados.
    throw new FizError("invalido", "O consentimento inclui campos que não foram apresentados.");
  }

  const autorizados = new Set(camposAutorizados);
  const perfil: ProfilePrefill = {};
  if (autorizados.has("entityType")) perfil.entityType = proposta.profile?.entityType;
  if (autorizados.has("activityCategory")) perfil.activityCategory = proposta.profile?.activityCategory;
  if (autorizados.has("vatTerritory")) perfil.vatTerritory = proposta.profile?.vatTerritory;
  if (autorizados.has("vatRegimeEstimate")) perfil.vatRegimeEstimate = proposta.profile?.vatRegimeEstimate;
  if (autorizados.has("socialSecuritySituation")) perfil.socialSecuritySituation = proposta.profile?.socialSecuritySituation;

  let resumo: SimulationSummary | undefined;
  if (proposta.simulationSummary && autorizados.has("grossEstimate")) {
    resumo = {
      currency: "EUR",
      period: proposta.simulationSummary.period,
      grossEstimate: proposta.simulationSummary.grossEstimate,
      ...(autorizados.has("vatEstimate") ? { vatEstimate: proposta.simulationSummary.vatEstimate } : {}),
      ...(autorizados.has("withholdingEstimate") ? { withholdingEstimate: proposta.simulationSummary.withholdingEstimate } : {}),
      ...(autorizados.has("socialSecurityEstimate") ? { socialSecurityEstimate: proposta.simulationSummary.socialSecurityEstimate } : {}),
      ...(autorizados.has("irsEstimate") ? { irsEstimate: proposta.simulationSummary.irsEstimate } : {}),
    };
  }

  const consent: ConsentEvidence = {
    receiptId: randomUUID(),
    policyVersion: POLITICA_CONSENTIMENTO_VERSAO,
    grantedAt: new Date().toISOString(),
    fields: camposAutorizados,
  };

  const pedido: CreateHandoffRequest = {
    externalHandoffId: randomUUID(),
    schemaVersion: FIZ_HANDOFF_SCHEMA_VERSION,
    intent: proposta.intent,
    locale: "pt-PT",
    consent,
    ...(Object.keys(perfil).length > 0 ? { profile: perfil } : {}),
    ...(resumo ? { simulationSummary: resumo } : {}),
    provenance: {
      engine: "recibo-certo",
      engineVersion: APP_VERSION,
      calculatedAt: new Date().toISOString(),
    },
    ...(autorizados.has("sourceGuide") && proposta.sourceContext ? { sourceContext: proposta.sourceContext } : {}),
  };

  const { dados } = await pedirFiz<Handoff>({
    caminho: "/v1/partner/handoffs",
    metodo: "POST",
    scopes: [PARTNER_SCOPES.handoffsWrite],
    idempotencyKey: pedido.externalHandoffId,
    corpo: pedido,
  });

  if (!dados?.url) {
    throw new FizError("indisponivel", "A FIZ não devolveu um destino para o handoff.");
  }
  // Duas guardas independentes: o destino tem de ser da FIZ e não pode
  // transportar dados pessoais na query string.
  if (!destinoFizValido(dados.url)) {
    throw new FizError("destino_recusado", "O destino devolvido não pertence à FIZ.");
  }
  if (!urlSemDadosSensiveis(dados.url)) {
    throw new FizError("destino_recusado", "O destino devolvido continha dados sensíveis no URL.");
  }

  return { handoff: dados, url: dados.url, consentReceiptId: consent.receiptId };
}

export async function estadoHandoff(handoffId: string): Promise<Handoff | null> {
  const { dados } = await pedirFiz<Handoff>({
    caminho: `/v1/partner/handoffs/${encodeURIComponent(handoffId)}`,
    scopes: [PARTNER_SCOPES.handoffsRead],
  });
  return dados;
}

/** Permite ao utilizador invalidar um handoff pendente (ponto 8.3). */
export async function apagarHandoff(handoffId: string): Promise<void> {
  await pedirFiz<void>({
    caminho: `/v1/partner/handoffs/${encodeURIComponent(handoffId)}`,
    metodo: "DELETE",
    scopes: [PARTNER_SCOPES.handoffsWrite],
    idempotencyKey: `del-${handoffId}`,
  });
}

export const ttlHandoffSegundos = (): number => fizServerConfig().handoffTtlSegundos;
