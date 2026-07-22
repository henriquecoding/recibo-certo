import {
  ENGINE_VERSION,
  type DecisionMeta,
  type EvaluationContext as RuleEvaluationContext,
  type FiscalDecision,
  type FiscalWarning,
  type MissingInput,
  type RuleOutcome,
  type TraceStep,
} from "./model";

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

/** Metadados ricos usados pelos domínios migrados por regra. */
export function decisionMeta(
  datasetId: string,
  ruleId: string,
  context: RuleEvaluationContext,
  trace: readonly TraceStep[] = [],
  warnings: readonly FiscalWarning[] = [],
): DecisionMeta {
  return {
    engineVersion: ENGINE_VERSION,
    datasetId,
    ruleId,
    evaluatedAt: context.asOf,
    jurisdiction: context.jurisdiction,
    trace,
    warnings,
  };
}

export function needsInputDecision<T>(
  datasetId: string,
  ruleId: string,
  context: RuleEvaluationContext,
  missing: readonly MissingInput[],
): FiscalDecision<T> {
  return { status: "needs_input", missing, ...decisionMeta(datasetId, ruleId, context) };
}

export function unsupportedDecision<T>(
  datasetId: string,
  ruleId: string,
  context: RuleEvaluationContext,
  reasons: readonly string[],
): FiscalDecision<T> {
  return { status: "unsupported", reasons, ...decisionMeta(datasetId, ruleId, context) };
}

export function outcomeToDecision<T>(
  datasetId: string,
  ruleId: string,
  context: RuleEvaluationContext,
  outcome: RuleOutcome<T>,
): FiscalDecision<T> {
  const meta = decisionMeta(
    datasetId,
    ruleId,
    context,
    outcome.trace ?? [],
    outcome.kind === "ok" ? outcome.warnings ?? [] : [],
  );
  switch (outcome.kind) {
    case "ok":
      return { status: "ok", value: outcome.value, ...meta };
    case "needs_input":
      return { status: "needs_input", missing: outcome.missing, ...meta };
    case "not_applicable":
      return { status: "not_applicable", reasons: outcome.reasons, ...meta };
    case "unsupported":
      return { status: "unsupported", reasons: outcome.reasons, ...meta };
    case "conflict":
      return { status: "conflict", reasons: outcome.reasons, ...meta };
  }
}
