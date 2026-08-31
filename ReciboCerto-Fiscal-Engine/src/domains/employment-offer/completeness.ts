import type { ISODate, MissingInput } from "../../core/model";
import { eurCents, type Money } from "../../core/money";

/**
 * Contrato de completude do posto.
 *
 * O invariante que este módulo existe para servir (relatório, INV-01): um
 * custo desconhecido NÃO é zero. `undefined`, «não sei» e zero são três
 * estados diferentes — o primeiro deixa o total incompleto, o último afirma
 * que foi confirmado não existir custo. E, por INV-02, um bloqueio impede
 * qualquer veredicto positivo: não há caminho no tipo para dizer «cabe» com
 * um custo obrigatório por preencher.
 */

export type CostKnowledge =
  | { kind: "confirmed"; amount: Money }
  | { kind: "estimated"; amount: Money; basis: string }
  | { kind: "range"; min: Money; max: Money; basis: string }
  | { kind: "not_applicable"; reason: string }
  | { kind: "unknown"; reason: string; blocking: boolean };

export const ZERO_MONEY = eurCents(0);

export const confirmedCost = (amount: Money): CostKnowledge => ({ kind: "confirmed", amount });
export const unknownCost = (reason: string, blocking = false): CostKnowledge => ({
  kind: "unknown",
  reason,
  blocking,
});

/** Menor valor que a parcela pode assumir com o que se sabe hoje. */
export function costLowerBound(knowledge: CostKnowledge): Money {
  switch (knowledge.kind) {
    case "confirmed":
    case "estimated":
      return knowledge.amount;
    case "range":
      return knowledge.min;
    case "not_applicable":
    case "unknown":
      return ZERO_MONEY;
  }
}

/** Maior valor que a parcela pode assumir com o que se sabe hoje. */
export function costUpperBound(knowledge: CostKnowledge): Money {
  switch (knowledge.kind) {
    case "confirmed":
    case "estimated":
      return knowledge.amount;
    case "range":
      return knowledge.max;
    case "not_applicable":
    case "unknown":
      return ZERO_MONEY;
  }
}

/** Só entra no total confirmado o que foi mesmo confirmado. */
export function confirmedAmount(knowledge: CostKnowledge): Money {
  if (knowledge.kind === "confirmed") return knowledge.amount;
  if (knowledge.kind === "not_applicable") return ZERO_MONEY;
  return ZERO_MONEY;
}

export interface CostComponent {
  id: string;
  label: string;
  /** Caminho do campo, para ligar a lacuna ao sítio onde se resolve. */
  path: string;
  knowledge: CostKnowledge;
  /** Custo único do arranque em vez de encargo recorrente. */
  oneOff: boolean;
  /** Obriga a um valor positivo: zero confirmado não é resposta legítima. */
  legallyRequired?: boolean;
}

export interface CostSummary {
  /** Soma das parcelas confirmadas (e das declaradas não aplicáveis, a zero). */
  confirmed: Money;
  /** Limite inferior do total com estimativas e intervalos incluídos. */
  low: Money;
  /** Limite superior do total com estimativas e intervalos incluídos. */
  high: Money;
  estimatedIds: readonly string[];
  unknownIds: readonly string[];
  notApplicableIds: readonly string[];
  blocking: readonly MissingInput[];
  estimatedFacts: readonly MissingInput[];
  confirmedFacts: readonly string[];
}

const sum = (values: readonly Money[]): Money =>
  eurCents(values.reduce((total, value) => total + value.cents, 0));

export function summariseCosts(
  components: readonly CostComponent[],
): CostSummary {
  const blocking: MissingInput[] = [];
  const estimatedFacts: MissingInput[] = [];
  const confirmedFacts: string[] = [];
  const estimatedIds: string[] = [];
  const unknownIds: string[] = [];
  const notApplicableIds: string[] = [];

  for (const component of components) {
    const { knowledge } = component;
    if (knowledge.kind === "unknown") {
      unknownIds.push(component.id);
      const entry: MissingInput = {
        path: component.path,
        reason: `${component.label}: ${knowledge.reason}`,
        expected: "valor anual, intervalo estimado ou «não se aplica» com razão",
      };
      if (knowledge.blocking || component.legallyRequired) blocking.push(entry);
      else estimatedFacts.push(entry);
      continue;
    }
    if (knowledge.kind === "estimated" || knowledge.kind === "range") {
      estimatedIds.push(component.id);
      estimatedFacts.push({
        path: component.path,
        reason: `${component.label}: ${knowledge.basis}`,
      });
      continue;
    }
    if (knowledge.kind === "not_applicable") {
      notApplicableIds.push(component.id);
      if (component.legallyRequired) {
        blocking.push({
          path: component.path,
          reason: `${component.label} é obrigatório neste vínculo e não pode ser dispensado.`,
        });
        continue;
      }
      confirmedFacts.push(component.id);
      continue;
    }
    if (component.legallyRequired && knowledge.amount.cents <= 0) {
      blocking.push({
        path: component.path,
        reason: `${component.label} é obrigatório: um valor de zero euros não é uma confirmação válida.`,
      });
      continue;
    }
    confirmedFacts.push(component.id);
  }

  return {
    confirmed: sum(components.map((item) => confirmedAmount(item.knowledge))),
    low: sum(components.map((item) => costLowerBound(item.knowledge))),
    high: sum(components.map((item) => costUpperBound(item.knowledge))),
    estimatedIds,
    unknownIds,
    notApplicableIds,
    blocking,
    estimatedFacts,
    confirmedFacts,
  };
}

export type EmploymentDecisionReadiness =
  | "incomplete"
  | "estimated"
  | "personalized"
  | "validated";

export interface EmploymentDecisionStatus {
  readiness: EmploymentDecisionReadiness;
  blockingFacts: readonly MissingInput[];
  estimatedFacts: readonly MissingInput[];
  confirmedFacts: readonly string[];
  /** INV-02: falso sempre que houver um bloqueio. */
  verdictAllowed: boolean;
  /** Frase derivada do domínio — a copy não pode contradizer o estado. */
  headline: string;
  reviewedAt?: ISODate;
}

export interface DecisionStatusInput {
  blocking: readonly MissingInput[];
  estimated: readonly MissingInput[];
  confirmed: readonly string[];
  /** Verdadeiro quando o líquido veio de cenários de referência, não de factos. */
  usedReferenceScenarios: boolean;
  /** Data em que a pessoa reviu e assumiu o cenário. */
  reviewedAt?: ISODate;
}

const HEADLINES: Record<EmploymentDecisionReadiness, string> = {
  incomplete: "Ainda não é possível confirmar se cabe.",
  estimated: "Cabe na estimativa, com valores por confirmar.",
  personalized: "Cabe nesta projeção personalizada.",
  validated: "Cenário revisto e validado",
};

export function decideReadiness(input: DecisionStatusInput): EmploymentDecisionStatus {
  const blocking = input.blocking;
  if (blocking.length > 0) {
    return {
      readiness: "incomplete",
      blockingFacts: blocking,
      estimatedFacts: input.estimated,
      confirmedFacts: input.confirmed,
      verdictAllowed: false,
      headline: HEADLINES.incomplete,
    };
  }
  const estimated = input.estimated.length > 0 || input.usedReferenceScenarios;
  if (estimated) {
    return {
      readiness: "estimated",
      blockingFacts: [],
      estimatedFacts: input.estimated,
      confirmedFacts: input.confirmed,
      verdictAllowed: true,
      headline: HEADLINES.estimated,
    };
  }
  if (input.reviewedAt) {
    return {
      readiness: "validated",
      blockingFacts: [],
      estimatedFacts: [],
      confirmedFacts: input.confirmed,
      verdictAllowed: true,
      headline: `${HEADLINES.validated} em ${input.reviewedAt}.`,
      reviewedAt: input.reviewedAt,
    };
  }
  return {
    readiness: "personalized",
    blockingFacts: [],
    estimatedFacts: [],
    confirmedFacts: input.confirmed,
    verdictAllowed: true,
    headline: HEADLINES.personalized,
  };
}
