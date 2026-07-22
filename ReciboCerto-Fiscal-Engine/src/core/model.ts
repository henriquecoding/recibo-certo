export const ENGINE_VERSION = "0.1.0-draft.0" as const;

export type ISODate = `${number}-${number}-${number}`;

export type PortugueseJurisdiction =
  | "PT-CONTINENTE"
  | "PT-MADEIRA"
  | "PT-ACORES";

export type FiscalDomain =
  | "receipt_cashflow"
  | "personal_income_tax"
  | "vat"
  | "independent_social_security"
  | "payroll_withholding"
  | "corporate_income_tax"
  | "autonomous_taxation"
  | "tax_incentives"
  | "inheritance_and_gifts"
  | "international_income";

export type DatasetStatus = "draft" | "reviewed" | "approved" | "retired";

export interface EffectivePeriod {
  from: ISODate;
  to?: ISODate;
}

export interface EvaluationContext {
  asOf: ISODate;
  taxYear: number;
  jurisdiction: PortugueseJurisdiction;
  requestedDatasetId?: string;
  /** Exclusivo para desenvolvimento e testes. Nunca expor na API pública. */
  allowUnapprovedDataset?: boolean;
}

export interface MissingInput {
  path: string;
  reason: string;
  expected?: string;
}

export interface FiscalWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "blocking";
}

export interface TraceOperand {
  name: string;
  value: string | number | boolean;
  unit?: "EUR_CENTS" | "PPM" | "COUNT" | "DATE" | "TEXT";
}

export interface TraceStep {
  id: string;
  label: string;
  formula?: string;
  operands?: readonly TraceOperand[];
  result?: string | number | boolean;
  rounding?: RoundingMode;
  citations: readonly string[];
}

export type RoundingMode = "half_up" | "down" | "up" | "towards_zero";

export interface DecisionMeta {
  engineVersion: typeof ENGINE_VERSION;
  datasetId: string;
  ruleId: string;
  evaluatedAt: ISODate;
  jurisdiction: PortugueseJurisdiction;
  trace: readonly TraceStep[];
  warnings: readonly FiscalWarning[];
}

export type FiscalDecision<T> =
  | ({ status: "ok"; value: T } & DecisionMeta)
  | ({ status: "needs_input"; missing: readonly MissingInput[] } & DecisionMeta)
  | ({ status: "not_applicable"; reasons: readonly string[] } & DecisionMeta)
  | ({ status: "unsupported"; reasons: readonly string[] } & DecisionMeta)
  | ({ status: "conflict"; reasons: readonly string[] } & DecisionMeta);

export interface LegalSource {
  id: string;
  authority: "AT" | "DR" | "SEGURANCA_SOCIAL" | "JORAM" | "JO_ACORES";
  title: string;
  url: string;
  effective: EffectivePeriod;
  expectedAnchors: readonly string[];
  forbiddenAnchors?: readonly string[];
  lastHumanReview: ISODate;
  status: "active" | "superseded" | "pending" | "conflict" | "withdrawn";
}

export interface DatasetManifest {
  id: string;
  schemaVersion: string;
  taxYear: number;
  status: DatasetStatus;
  effective: EffectivePeriod;
  jurisdictions: readonly PortugueseJurisdiction[];
  sourceIds: readonly string[];
  productionReady: boolean;
  createdAt: ISODate;
  reviewedAt?: ISODate;
  approvedAt?: ISODate;
  approvedBy?: readonly string[];
  notes: readonly string[];
}

export interface FieldRequirement {
  path: string;
  reason: string;
  expected?: string;
}

export interface RuleOutcomeOk<T> {
  kind: "ok";
  value: T;
  trace?: readonly TraceStep[];
  warnings?: readonly FiscalWarning[];
}

export type RuleOutcome<T> =
  | RuleOutcomeOk<T>
  | { kind: "needs_input"; missing: readonly MissingInput[]; trace?: readonly TraceStep[] }
  | { kind: "not_applicable"; reasons: readonly string[]; trace?: readonly TraceStep[] }
  | { kind: "unsupported"; reasons: readonly string[]; trace?: readonly TraceStep[] }
  | { kind: "conflict"; reasons: readonly string[]; trace?: readonly TraceStep[] };

export interface FiscalRule<I, O> {
  id: string;
  domain: FiscalDomain;
  version: string;
  effective: EffectivePeriod;
  jurisdictions: readonly PortugueseJurisdiction[];
  citations: readonly string[];
  requirements: readonly FieldRequirement[];
  evaluate(input: I, context: EvaluationContext): RuleOutcome<O>;
}

export function isWithinPeriod(date: ISODate, period: EffectivePeriod): boolean {
  return date >= period.from && (period.to === undefined || date <= period.to);
}
