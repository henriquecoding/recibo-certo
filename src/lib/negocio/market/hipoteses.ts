// ═══════════════════════════════════════════════════════════════════════
//  HIPÓTESES — o que a PESSOA provou, e o que ainda não provou
//  ---------------------------------------------------------------------
//  Os estados `user_validated` e `operating` existiam no gate desde o
//  primeiro checkpoint e nunca eram alcançáveis: nada, em lado nenhum,
//  produzia um `MarketUserValidation`. O motor sabia reconhecer prova
//  comercial e não havia por onde a dar.
//
//  Este módulo fecha esse buraco com três regras que vêm do relatório e
//  não desta implementação:
//
//   1. Entrevista NÃO é prova de mercado. Conta-se, mostra-se, e não muda
//      o estado — «parece interessante» nunca foi uma venda.
//   2. Prova comercial é orçamento aceite, pré-venda, piloto pago ou
//      venda. Só isso promove a hipótese a validada.
//   3. Operação exige repetição, contribuição positiva OBSERVADA e
//      dinheiro efetivamente recebido. As três, não duas.
//
//  Tudo isto é do dispositivo de quem escreveu. Este ficheiro é puro: não
//  sabe ler nem gravar nada — ver `store/hipoteses-mercado.ts`.
// ═══════════════════════════════════════════════════════════════════════

import { addDaysToIsoDate, parseIsoDate } from "./freshness";
import type { MarketRegion } from "./geografia";
import type { MarketUserValidation, MarketUserValidationKind } from "./tipos";

export type MarketProofKind = "interview" | MarketUserValidationKind;

/**
 * Quanto tempo uma prova de mercado continua a dizer alguma coisa.
 *
 * Seis meses é uma escolha de produto, não uma lei: um piloto pago do ano
 * passado não prova o mercado de hoje. Quando expira, o gate degrada para
 * `stale` e pede nova validação em vez de conservar o crédito antigo.
 */
export const PROOF_VALIDITY_DAYS = 180;

export interface MarketProof {
  id: string;
  kind: MarketProofKind;
  /** Data civil `YYYY-MM-DD` do que aconteceu. */
  occurredAt: string;
  /** O que se aprendeu. Fica no dispositivo, como tudo o resto. */
  note?: string;
  /** Só faz sentido em prova paga: o dinheiro entrou mesmo? */
  paymentReceived?: boolean;
  /** A contribuição observada foi positiva depois dos custos reais? */
  positiveContribution?: boolean;
}

export interface MarketHypothesis {
  templateId: string;
  region: MarketRegion;
  createdAt: string;
  updatedAt: string;
  proofs: readonly MarketProof[];
  /** A pessoa confirmou ter lido e resolvido os requisitos críticos. */
  requirementsReviewed: boolean;
  /** Resultado do motor canónico de preço, quando já houve um cenário. */
  pricing?: {
    viable: boolean;
    priceNet: number;
    concludedAt: string;
  };
}

/** Da mais fraca para a mais forte. A ordem é a escada de evidência. */
const PROOF_STRENGTH: Readonly<Record<MarketProofKind, number>> = {
  interview: 0,
  accepted_quote: 1,
  pre_sale: 2,
  paid_pilot: 3,
  sale: 4,
};

export const PROOF_LABELS: Readonly<Record<MarketProofKind, string>> = {
  interview: "Entrevista",
  accepted_quote: "Orçamento aceite",
  pre_sale: "Pré-venda",
  paid_pilot: "Piloto pago",
  sale: "Venda",
};

/** As provas que o gate reconhece como mercado. A entrevista não é uma. */
export function isMarketProof(kind: MarketProofKind): kind is MarketUserValidationKind {
  return kind !== "interview";
}

export function newHypothesis(
  templateId: string,
  region: MarketRegion,
  now: () => string = () => new Date().toISOString(),
): MarketHypothesis {
  const at = now();
  return {
    templateId,
    region,
    createdAt: at,
    updatedAt: at,
    proofs: [],
    requirementsReviewed: false,
  };
}

export function proofValidUntil(occurredAt: string): string | null {
  return addDaysToIsoDate(occurredAt, PROOF_VALIDITY_DAYS);
}

function isCurrent(proof: MarketProof, asOf: string): boolean {
  const occurred = parseIsoDate(proof.occurredAt);
  const evaluated = parseIsoDate(asOf);
  const until = proofValidUntil(proof.occurredAt);
  const validUntil = until ? parseIsoDate(until) : null;
  if (occurred === null || evaluated === null || validUntil === null) return false;
  // Uma data civil vale até ao fim desse dia; e uma prova datada no futuro
  // ainda não aconteceu.
  return occurred <= evaluated && evaluated <= validUntil + 86_400_000 - 1;
}

export interface HypothesisProofSummary {
  interviews: number;
  currentInterviews: number;
  marketProofs: number;
  currentMarketProofs: number;
  strongest?: MarketProof;
  expired: number;
}

export function summarizeProofs(
  hypothesis: MarketHypothesis,
  asOf: string,
): HypothesisProofSummary {
  const interviews = hypothesis.proofs.filter((proof) => proof.kind === "interview");
  const market = hypothesis.proofs.filter((proof) => isMarketProof(proof.kind));
  const currentMarket = market.filter((proof) => isCurrent(proof, asOf));

  const strongest = [...currentMarket].sort(
    (left, right) =>
      PROOF_STRENGTH[right.kind] - PROOF_STRENGTH[left.kind] ||
      right.occurredAt.localeCompare(left.occurredAt),
  )[0];

  return {
    interviews: interviews.length,
    currentInterviews: interviews.filter((proof) => isCurrent(proof, asOf)).length,
    marketProofs: market.length,
    currentMarketProofs: currentMarket.length,
    strongest,
    expired: market.length - currentMarket.length,
  };
}

/**
 * Traduz o que a pessoa registou para o contrato que o gate já conhecia.
 *
 * Devolve `undefined` quando não há prova de mercado NENHUMA — nem atual
 * nem expirada. Uma prova expirada continua a ser devolvida, de propósito:
 * é assim que o gate consegue dizer «perdeu validade» em vez de fingir que
 * nunca existiu.
 */
export function userValidationFrom(
  hypothesis: MarketHypothesis,
  asOf: string,
): MarketUserValidation | undefined {
  const market = hypothesis.proofs.filter((proof) => isMarketProof(proof.kind));
  if (market.length === 0) return undefined;

  const summary = summarizeProofs(hypothesis, asOf);
  const reference =
    summary.strongest ??
    [...market].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0];

  const validUntil = proofValidUntil(reference.occurredAt);
  if (!validUntil) return undefined;

  // Repetição conta transações COMPROVADAS e ainda válidas. Uma entrevista
  // repetida não é repetição de negócio.
  const current = market.filter((proof) => isCurrent(proof, asOf));
  return {
    kind: reference.kind as MarketUserValidationKind,
    occurredAt: reference.occurredAt,
    validUntil,
    repeatTransactions: current.length,
    positiveContributionObserved: current.some((proof) => proof.positiveContribution === true),
    paymentsReceived: current.some((proof) => proof.paymentReceived === true),
  };
}

export function addProof(
  hypothesis: MarketHypothesis,
  proof: MarketProof,
  now: () => string = () => new Date().toISOString(),
): MarketHypothesis {
  return {
    ...hypothesis,
    proofs: [...hypothesis.proofs, proof].sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt),
    ),
    updatedAt: now(),
  };
}

export function removeProof(
  hypothesis: MarketHypothesis,
  proofId: string,
  now: () => string = () => new Date().toISOString(),
): MarketHypothesis {
  const proofs = hypothesis.proofs.filter((proof) => proof.id !== proofId);
  if (proofs.length === hypothesis.proofs.length) return hypothesis;
  return { ...hypothesis, proofs, updatedAt: now() };
}
