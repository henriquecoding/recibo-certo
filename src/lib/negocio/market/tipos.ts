// ═══════════════════════════════════════════════════════════════════════
//  MARKET INTELLIGENCE — contrato público do domínio
//  ---------------------------------------------------------------------
//  Este módulo descreve evidência, não inventa evidência. Uma ideia do
//  catálogo só passa a «oportunidade atual» quando observações com origem,
//  período, unidade, geografia e validade atravessam os gates do motor.
//
//  As datas são strings ISO porque estes objetos são serializados em packs
//  públicos. A validade semântica dessas strings é verificada em
//  `freshness.ts` e `integridade.ts`; o tipo, sozinho, não a pode provar.
// ═══════════════════════════════════════════════════════════════════════

export type MarketSourceId =
  | "ine"
  | "bpstat"
  | "dados-gov"
  | "eurostat"
  | "iefp"
  | "turismo-portugal";

export type MarketAccessMode = "api" | "file" | "rss" | "manual" | "licensed";

export type MarketCadence =
  | "live"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annual"
  | "irregular";

export type MarketConnectorStatus = "ready" | "planned" | "optional";

export type MarketLicenseStatus = "approved" | "review_required" | "prohibited";

export interface MarketLicensePolicy {
  status: MarketLicenseStatus;
  /** Identificador da licença, apenas quando a entidade o declara. */
  identifier?: string;
  url: string;
  attribution?: string;
  storagePolicy: string;
  /** Explica o que falta verificar quando o uso ainda não foi aprovado. */
  reviewNote?: string;
}

export type MarketGeographyLevel =
  | "country"
  | "nuts1"
  | "nuts2"
  | "nuts3"
  | "district"
  | "municipality"
  | "parish"
  | "custom";

export interface MarketCoverage {
  countries: readonly string[];
  geographicLevels: readonly MarketGeographyLevel[];
  notes?: string;
}

export interface MarketSourceDefinition {
  id: MarketSourceId;
  publisher: string;
  access: MarketAccessMode;
  canonicalUrl: string;
  documentationUrl: string;
  license: MarketLicensePolicy;
  expectedCadence: MarketCadence;
  coverage: MarketCoverage;
  parserVersion: string;
  schemaFingerprint?: string;
  connectorStatus: MarketConnectorStatus;
  /** Finalidades permitidas pelo nosso próprio contrato de produto. */
  allowedUses: readonly ("structural" | "conjunctural" | "transactional" | "operational")[];
  limitations: readonly string[];
}

export interface GeographyRef {
  country: "PT";
  level: MarketGeographyLevel;
  code: string;
  name: string;
  /** Versão da nomenclatura, quando relevante (por exemplo, NUTS 2024). */
  classificationVersion?: string;
}

export interface MarketReferencePeriod {
  start: string;
  end: string;
  label?: string;
}

export type MarketObservationStatus = "observed" | "provisional" | "estimated" | "modelled";

export type MarketSemanticMappingStatus = "approved" | "review_required" | "rejected";

export interface MarketObservationQuality {
  status: MarketObservationStatus;
  /** Valor no intervalo fechado [0, 1], calculado pela pipeline. */
  completeness: number;
  semanticMapping: MarketSemanticMappingStatus;
  flags: readonly string[];
}

export interface MarketTransformRef {
  id: string;
  version: string;
  description: string;
  inputObservationIds?: readonly string[];
}

export interface MarketObservationLicense {
  status: MarketLicenseStatus;
  scope: "source" | "series" | "dataset";
  identifier?: string;
  url: string;
  attribution?: string;
}

export interface MarketObservation {
  id: string;
  /** String propositadamente aberta: permite detetar fontes desconhecidas. */
  sourceId: string;
  metricId: string;
  value: number | string | boolean;
  unit: string;
  geography: GeographyRef;
  classifications: {
    cae?: readonly string[];
    cpv?: readonly string[];
    keywords?: readonly string[];
  };
  referencePeriod: MarketReferencePeriod;
  publishedAt?: string;
  retrievedAt: string;
  validUntil: string;
  methodologyRef?: string;
  transform?: MarketTransformRef;
  /** Prova de licença aplicável a esta observação concreta. */
  license: MarketObservationLicense;
  quality: MarketObservationQuality;
  /** `sha256:<hex>` do conteúdo de origem que produziu a observação. */
  checksum: string;
}

export type MarketFreshnessState = "fresh" | "expiring" | "stale" | "invalid";

export type MarketSourceHealthState =
  | "healthy"
  | "delayed"
  | "stale"
  | "schema_changed"
  | "license_review"
  | "quarantined"
  | "disabled";

export interface MarketSourceHealth {
  sourceId: string;
  state: MarketSourceHealthState;
  critical: boolean;
  checkedAt: string;
  lastRunAt?: string;
  lastSuccessfulRunAt?: string;
  latestReferencePeriodEnd?: string;
  message?: string;
}

export interface MarketSnapshot {
  id: string;
  schemaVersion: number;
  generatedAt: string;
  geography: GeographyRef;
  observationIds: readonly string[];
  sourceHealth: readonly MarketSourceHealth[];
  formulaVersions: readonly string[];
  manifestHash: string;
  signature: string;
}

export type MarketOpportunityState =
  | "template"
  | "signal_detected"
  | "candidate"
  | "evidence_qualified"
  | "user_validated"
  | "operating"
  | "stale"
  | "contradicted";

export type MarketSignalKind =
  | "demand"
  | "structural"
  | "transactional"
  | "supply"
  | "competition"
  | "cost"
  | "negative";

export interface MarketEvidenceSignal {
  observationId: string;
  sourceId: string;
  /**
   * Origem estatística efetivamente independente.
   *
   * Dois portais podem republicar a mesma operação (por exemplo, um
   * indicador do INE também exposto no Eurostat). Nesses casos o valor é
   * deliberadamente igual nos dois sinais e o gate conta-os uma só vez.
   */
  independenceKey: string;
  kind: MarketSignalKind;
  freshness: MarketFreshnessState;
  geographyCompatible: boolean;
  semanticMapping: MarketSemanticMappingStatus;
  /** Uma fonte crítica em falha impede a qualificação. */
  critical: boolean;
}

export type MarketRequirementState = "known" | "pending" | "blocked";

export type MarketUserValidationKind =
  | "interview"
  | "accepted_quote"
  | "pre_sale"
  | "paid_pilot"
  | "sale";

export interface MarketUserValidation {
  kind: MarketUserValidationKind;
  occurredAt: string;
  validUntil: string;
  repeatTransactions: number;
  positiveContributionObserved: boolean;
  paymentsReceived: boolean;
}

export interface MarketEvidenceInput {
  templateId: string;
  evaluatedAt: string;
  signals: readonly MarketEvidenceSignal[];
  sourceHealth: readonly MarketSourceHealth[];
  economicViability: true | false | null;
  criticalRequirements: MarketRequirementState;
  falsificationTestDefined: boolean;
  decisiveContradiction?: string;
  userValidation?: MarketUserValidation;
}

export interface MarketEvidenceGateResult {
  state: MarketOpportunityState;
  label: string;
  reasons: readonly string[];
  missing: readonly string[];
  usableObservationIds: readonly string[];
  evaluatedAt: string;
}

export interface MarketAttractivenessBreakdown {
  recentDemand: number;
  structuralNeed: number;
  sectorEconomics: number;
  competitiveSpace: number;
  acquisitionSpeed: number;
  resilience: number;
}

export interface MarketEconomicAssessment {
  viable: true | false | null;
  engine: "pricing";
  formulaVersion: string;
  reasons: readonly string[];
  priceNet?: number;
  contributionPerUnit?: number;
  profitPerUnit?: number;
  breakEvenUnits?: number;
}
