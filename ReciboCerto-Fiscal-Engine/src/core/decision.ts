/**
 * O contrato de decisão (README.md, ARCHITECTURE.md #10, RELATORIO §9.2).
 * "0 €" nunca representa "não sei" — toda a regra devolve exatamente um
 * destes cinco estados.
 */
export type DecisionStatus = "ok" | "needs_input" | "not_applicable" | "unsupported" | "conflict";

/** Proveniência transitiva (invariante #6 da arquitetura). */
export interface Provenance {
  engineVersion: string;
  datasetId: string;
  ruleId: string;
  evaluatedAt: string;
}

/** Um passo da memória de cálculo (invariante #8: fórmula + operandos + arredondamento). */
export interface CalculationStep {
  label: string;
  formula: string;
  operands: Record<string, number>;
  roundingPolicy?: string;
  result: number;
}

export interface DecisionOk<T> {
  status: "ok";
  value: T;
  provenance: Provenance;
  calculation: CalculationStep[];
  sources: string[];
}

export interface DecisionNeedsInput {
  status: "needs_input";
  missingFields: string[];
  reason: string;
}

export interface DecisionNotApplicable {
  status: "not_applicable";
  reason: string;
}

export interface DecisionUnsupported {
  status: "unsupported";
  reason: string;
  /** Domínio ou capacidade que ainda não foi migrada. */
  domain?: string;
}

export interface DecisionConflict {
  status: "conflict";
  reason: string;
  conflictingRuleIds: string[];
}

export type Decision<T> =
  | DecisionOk<T>
  | DecisionNeedsInput
  | DecisionNotApplicable
  | DecisionUnsupported
  | DecisionConflict;

export function ok<T>(
  value: T,
  provenance: Provenance,
  calculation: CalculationStep[] = [],
  sources: string[] = [],
): DecisionOk<T> {
  return { status: "ok", value, provenance, calculation, sources };
}

export function needsInput(missingFields: string[], reason: string): DecisionNeedsInput {
  return { status: "needs_input", missingFields, reason };
}

export function notApplicable(reason: string): DecisionNotApplicable {
  return { status: "not_applicable", reason };
}

export function unsupported(reason: string, domain?: string): DecisionUnsupported {
  return { status: "unsupported", reason, domain };
}

export function conflict(reason: string, conflictingRuleIds: string[]): DecisionConflict {
  return { status: "conflict", reason, conflictingRuleIds };
}

export function isOk<T>(decision: Decision<T>): decision is DecisionOk<T> {
  return decision.status === "ok";
}
