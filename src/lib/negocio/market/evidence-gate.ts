// ═══════════════════════════════════════════════════════════════════════
//  EVIDENCE GATE — score nenhum substitui requisitos mínimos
//  ---------------------------------------------------------------------
//  A ordem é deliberada: contradições e bloqueios vencem; prova paga e
//  repetida pode validar o contexto do utilizador; só depois se avaliam os
//  sinais externos. O resultado é determinístico e explica o que falta.
// ═══════════════════════════════════════════════════════════════════════

import { parseIsoDate } from "./freshness";
import type {
  MarketEvidenceGateResult,
  MarketEvidenceInput,
  MarketEvidenceSignal,
  MarketOpportunityState,
  MarketSourceHealthState,
  MarketUserValidation,
} from "./tipos";

/**
 * O rótulo de cada estado. UM só sítio, de propósito.
 *
 * Havia dois vocabulários para os mesmos oito estados: este, documentado
 * na arquitetura, e outro escrito à mão dentro do estúdio — que era o que
 * as pessoas liam. Sete dos oito diferiam, e `gate.label` era calculado em
 * todas as avaliações sem nunca chegar a um ecrã. O pior caso era
 * `signal_detected`: aqui dizia «sinal a investigar» e no ecrã «sinal
 * oficial encontrado», que soa a conclusão e não a pista.
 *
 * O rótulo pertence ao domínio; a cor pertence ao ecrã. A interface
 * escolhe classes CSS por estado e lê o texto daqui.
 */
export const MARKET_STATE_LABELS: Readonly<Record<MarketOpportunityState, string>> = Object.freeze({
  template: "Ideia por investigar",
  signal_detected: "Sinal a investigar",
  candidate: "Candidata a teste",
  evidence_qualified: "Sustentada por dados",
  user_validated: "Validada contigo",
  operating: "Em operação",
  stale: "Precisa de nova validação",
  contradicted: "Hipótese contrariada",
});

const LABELS = MARKET_STATE_LABELS;

const BLOCKING_SOURCE_STATES: readonly MarketSourceHealthState[] = Object.freeze([
  "stale",
  "schema_changed",
  "license_review",
  "quarantined",
  "disabled",
]);

function result(
  input: MarketEvidenceInput,
  state: MarketOpportunityState,
  reasons: readonly string[],
  missing: readonly string[],
  usable: readonly MarketEvidenceSignal[],
): MarketEvidenceGateResult {
  return {
    state,
    label: LABELS[state],
    reasons,
    missing,
    usableObservationIds: usable.map((signal) => signal.observationId),
    evaluatedAt: input.evaluatedAt,
  };
}

function currentUserValidation(
  validation: MarketUserValidation | undefined,
  evaluatedAt: string,
): boolean {
  if (!validation) return false;
  const occurred = parseIsoDate(validation.occurredAt);
  const validUntil = parseIsoDate(validation.validUntil);
  const evaluated = parseIsoDate(evaluatedAt);
  if (occurred === null || validUntil === null || evaluated === null) return false;

  // `validUntil` em data civil é inclusivo até ao fim desse dia.
  const inclusiveValidity = /^\d{4}-\d{2}-\d{2}$/.test(validation.validUntil)
    ? validUntil + 86_400_000 - 1
    : validUntil;
  return occurred <= evaluated && evaluated <= inclusiveValidity;
}

function isUserMarketProof(validation: MarketUserValidation): boolean {
  return ["accepted_quote", "pre_sale", "paid_pilot", "sale"].includes(validation.kind);
}

function isOperatingProof(validation: MarketUserValidation): boolean {
  return (
    isUserMarketProof(validation) &&
    validation.repeatTransactions >= 2 &&
    validation.positiveContributionObserved &&
    validation.paymentsReceived
  );
}

export function evaluateMarketEvidence(input: MarketEvidenceInput): MarketEvidenceGateResult {
  const missing = new Set<string>();
  const reasons: string[] = [];
  const health = new Map(input.sourceHealth.map((entry) => [entry.sourceId, entry]));

  const sourceBlocked = (signal: MarketEvidenceSignal): boolean => {
    const source = health.get(signal.sourceId);
    return !source || BLOCKING_SOURCE_STATES.includes(source.state);
  };

  const usable = input.signals.filter(
    (signal) =>
      (signal.freshness === "fresh" || signal.freshness === "expiring") &&
      signal.geographyCompatible &&
      signal.semanticMapping === "approved" &&
      !sourceBlocked(signal),
  );

  if (input.decisiveContradiction?.trim()) {
    return result(input, "contradicted", [input.decisiveContradiction.trim()], [], usable);
  }

  if (input.economicViability === false) {
    return result(
      input,
      "contradicted",
      ["O cenário económico executável falhou no Pricing/Business Engine."],
      ["Rever preço, custos, capacidade ou segmento antes de continuar."],
      usable,
    );
  }

  if (input.criticalRequirements === "blocked") {
    return result(
      input,
      "contradicted",
      ["Existe pelo menos um requisito crítico que impede a operação."],
      ["Resolver o requisito crítico ou escolher outro modelo de entrega."],
      usable,
    );
  }

  const validationIsCurrent = currentUserValidation(input.userValidation, input.evaluatedAt);
  if (input.userValidation && validationIsCurrent && isOperatingProof(input.userValidation)) {
    return result(
      input,
      "operating",
      ["Há repetição, contribuição positiva observada e recebimentos confirmados."],
      [],
      usable,
    );
  }

  if (
    input.userValidation &&
    validationIsCurrent &&
    isUserMarketProof(input.userValidation)
  ) {
    return result(
      input,
      "user_validated",
      ["Existe evidência comercial atual no segmento do utilizador."],
      [
        "Repetir vendas, observar a contribuição real e confirmar o recebimento para provar operação sustentável.",
      ],
      usable,
    );
  }

  const criticalSourceFailure = input.signals.some(
    (signal) =>
      signal.critical &&
      (signal.freshness === "stale" || signal.freshness === "invalid" || sourceBlocked(signal)),
  );
  const criticalHealthFailure = input.sourceHealth.some(
    (entry) => entry.critical && BLOCKING_SOURCE_STATES.includes(entry.state),
  );
  const expiredUserProof = Boolean(input.userValidation && !validationIsCurrent);
  const onlyExpiredOrBlockedSignals = input.signals.length > 0 && usable.length === 0;

  if (
    criticalSourceFailure ||
    criticalHealthFailure ||
    (expiredUserProof && usable.length === 0) ||
    onlyExpiredOrBlockedSignals
  ) {
    if (criticalSourceFailure) reasons.push("Uma fonte crítica está expirada, indisponível ou em quarentena.");
    if (criticalHealthFailure && !criticalSourceFailure) {
      reasons.push("O painel de saúde assinala uma fonte crítica indisponível ou em quarentena.");
    }
    if (expiredUserProof && usable.length === 0) reasons.push("A prova de mercado do utilizador perdeu validade.");
    if (onlyExpiredOrBlockedSignals) reasons.push("Nenhuma observação disponível atravessa os gates atuais.");
    missing.add("Recolher ou atualizar evidência antes de recomendar esta ideia como atual.");
    return result(input, "stale", reasons, [...missing], usable);
  }

  const demandSignals = usable.filter((signal) => signal.kind === "demand" || signal.kind === "transactional");
  const supportingSignals = usable.filter(
    (signal) =>
      signal.kind === "structural" ||
      signal.kind === "transactional" ||
      signal.kind === "supply" ||
      signal.kind === "competition" ||
      signal.kind === "cost",
  );
  const positiveSignals = usable.filter((signal) => signal.kind !== "negative");
  const independentSources = new Set(positiveSignals.map((signal) => signal.independenceKey));
  const triangulated = demandSignals.some((demand) =>
    supportingSignals.some((support) => support.independenceKey !== demand.independenceKey),
  );

  if (input.signals.some((signal) => !signal.geographyCompatible)) {
    missing.add("Correspondência geográfica suficiente para o modelo de entrega.");
  }
  if (input.signals.some((signal) => signal.semanticMapping !== "approved")) {
    missing.add("Mapeamento semântico aprovado por curadoria.");
  }
  if (demandSignals.length === 0) missing.add("Um sinal recente de procura ou transação.");
  if (supportingSignals.length === 0) {
    missing.add("Um segundo sinal de estrutura, transação, oferta, concorrência ou custo.");
  }
  if (independentSources.size < 2) missing.add("Duas fontes independentes e saudáveis.");
  if (input.economicViability !== true) missing.add("Viabilidade económica confirmada no motor canónico.");
  if (input.criticalRequirements !== "known") missing.add("Requisitos críticos conhecidos.");
  if (!input.falsificationTestDefined) missing.add("Um teste explícito que possa contrariar a hipótese.");

  if (
    triangulated &&
    input.economicViability === true &&
    input.criticalRequirements === "known" &&
    input.falsificationTestDefined
  ) {
    return result(
      input,
      "evidence_qualified",
      ["Procura recente, sinal independente, geografia, semântica e economia atravessaram o gate."],
      [],
      usable,
    );
  }

  if (triangulated) {
    return result(
      input,
      "candidate",
      ["Há sinais independentes compatíveis, mas a hipótese ainda precisa de validação operacional."],
      [...missing],
      usable,
    );
  }

  if (usable.length > 0) {
    return result(
      input,
      "signal_detected",
      ["Existe pelo menos um sinal utilizável, ainda sem triangulação suficiente."],
      [...missing],
      usable,
    );
  }

  return result(
    input,
    "template",
    ["A ideia existe no catálogo, mas ainda não tem evidência utilizável."],
    [...missing],
    usable,
  );
}
