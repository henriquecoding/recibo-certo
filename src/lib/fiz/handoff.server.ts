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
  type IdentityPrefill,
  type SimulationSummary,
  type GuideSourceContext,
} from "./contracts";
import { APP_VERSION } from "@/lib/version";
import { ROTULO_CAMPO, CAMPOS_NUNCA_ENVIADOS, CAMPOS_VALIDOS, type CampoHandoff } from "./handoff-fields";

// ─── Campos apresentáveis ao utilizador ────────────────────────────────
//  Definidos em `handoff-fields.ts` (isomórfico) e reexportados aqui para
//  que o servidor e o diálogo de consentimento partilhem exatamente a
//  mesma lista — divergirem seria abrir a porta a enviar um campo que o
//  utilizador nunca viu.

export { ROTULO_CAMPO, CAMPOS_NUNCA_ENVIADOS, CAMPOS_VALIDOS };
export type { CampoHandoff };

export interface PropostaHandoff {
  intent: Intent;
  campos: CampoHandoff[];
  profile?: ProfilePrefill;
  identity?: IdentityPrefill;
  simulationSummary?: SimulationSummary;
  sourceContext?: GuideSourceContext;
}

/** NIF português: 9 dígitos com dígito de controlo módulo 11.
    Validar aqui evita enviar à FIZ um número que ela vai recusar — e
    apanha erros de digitação antes de o utilizador sair do ReciboCerto. */
export function nifValido(nif: string): boolean {
  const limpo = nif.replace(/\s/g, "");
  if (!/^\d{9}$/.test(limpo)) return false;
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += Number(limpo[i]) * (9 - i);
  const resto = soma % 11;
  const controlo = resto < 2 ? 0 : 11 - resto;
  return controlo === Number(limpo[8]);
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
    fullName: proposta.identity?.fullName,
    taxpayerNumber: proposta.identity?.taxpayerNumber,
    email: proposta.identity?.email,
    phone: proposta.identity?.phone,
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

  // Identificação: só os campos explicitamente autorizados, um a um.
  const identidade: IdentityPrefill = {};
  if (autorizados.has("fullName") && proposta.identity?.fullName) identidade.fullName = proposta.identity.fullName;
  if (autorizados.has("email") && proposta.identity?.email) identidade.email = proposta.identity.email;
  if (autorizados.has("phone") && proposta.identity?.phone) identidade.phone = proposta.identity.phone;
  if (autorizados.has("taxpayerNumber") && proposta.identity?.taxpayerNumber) {
    const nif = proposta.identity.taxpayerNumber.replace(/\s/g, "");
    // Enviar um NIF inválido seria pior do que não enviar nenhum: a FIZ
    // recusaria e o utilizador não saberia porquê.
    if (!nifValido(nif)) throw new FizError("invalido", "O NIF indicado não é válido.");
    identidade.taxpayerNumber = nif;
  }

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
    ...(Object.keys(identidade).length > 0 ? { identity: identidade } : {}),
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
