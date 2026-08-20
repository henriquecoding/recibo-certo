import {
  fetchIneIndicator,
  normalizeIneAnnualIndicator,
  type IneAnnualIndicatorManifest,
} from "./connectors/ine";
import { evaluateMarketEvidence } from "./evidence-gate";
import { classifyObservationFreshness } from "./freshness";
import { quarantineMarketObservations } from "./quarantine";
import type { MarketPilotEvidence, MarketObservationSummary } from "./opportunities";
import type { MarketEvidenceSignal, MarketObservation, MarketSourceHealth } from "./tipos";

const TOURISM_DATASET_URL =
  "https://dados.gov.pt/datasets/taxa-de-ocupacao-quarto-nos-estabelecimentos-de-alojamento-turistico";

export const TOURISM_OCCUPANCY_MANIFEST: IneAnnualIndicatorManifest = {
  indicatorCode: "0013314",
  metricId: "tourism.room_occupancy.hotel",
  unit: "%",
  maxReferenceAgeDays: 548,
  geographyByCode: {
    PT: { level: "country", expectedName: "Portugal" },
    "1A": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Grande Lisboa" },
    "1B": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Península de Setúbal" },
  },
  dimensionFilters: { dim_3: ["01"] },
  decimalSeparator: ".",
  observationStatus: "observed",
  semanticMapping: "approved",
  methodologyRef: "https://www.ine.pt/xurl/indx/0013314/PT",
  classifications: { cae: ["I55"] },
  datasetLicense: {
    status: "approved",
    scope: "dataset",
    identifier: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    attribution: "Fonte: INE, I.P. — dataset publicado no dados.gov.pt",
  },
};

function latestByGeography(observations: readonly MarketObservation[]): MarketObservation[] {
  const selected = new Map<string, MarketObservation>();
  for (const observation of observations) {
    const current = selected.get(observation.geography.code);
    if (!current || current.referencePeriod.end < observation.referencePeriod.end) {
      selected.set(observation.geography.code, observation);
    }
  }
  return [...selected.values()].sort((a, b) => a.geography.code.localeCompare(b.geography.code));
}

function summarize(observation: MarketObservation): MarketObservationSummary {
  return {
    id: observation.id,
    metricId: observation.metricId,
    value: observation.value,
    unit: observation.unit,
    geography: observation.geography,
    referencePeriod: observation.referencePeriod,
    retrievedAt: observation.retrievedAt,
    validUntil: observation.validUntil,
    sourceId: observation.sourceId,
    license: observation.license,
  };
}

export interface LoadPilotEvidenceOptions {
  fetchImpl?: typeof fetch;
  now?: () => string;
  signal?: AbortSignal;
}

export async function loadPilotMarketEvidence(
  options: LoadPilotEvidenceOptions = {},
): Promise<readonly MarketPilotEvidence[]> {
  const checkedAt = (options.now ?? (() => new Date().toISOString()))();
  let sourceUrl: string | undefined;
  let sourceHealth: MarketSourceHealth;
  let observations: MarketObservation[] = [];
  let note: string | undefined;

  try {
    const fetched = await fetchIneIndicator(TOURISM_OCCUPANCY_MANIFEST.indicatorCode, {
      fetchImpl: options.fetchImpl,
      now: () => checkedAt,
      signal: options.signal ?? AbortSignal.timeout(8_000),
    });
    sourceUrl = fetched.sourceUrl;
    const normalized = normalizeIneAnnualIndicator(fetched, TOURISM_OCCUPANCY_MANIFEST);
    const report = quarantineMarketObservations(normalized.observations, {
      asOf: checkedAt,
      expiringWithinDays: 45,
    });
    observations = latestByGeography(report.accepted);
    const hasParserQuarantine = normalized.quarantined.length > 0 || report.quarantined.length > 0;
    sourceHealth = {
      sourceId: "ine",
      state: observations.length > 0 ? "healthy" : "quarantined",
      critical: true,
      checkedAt,
      lastRunAt: checkedAt,
      lastSuccessfulRunAt: observations.length > 0 ? checkedAt : undefined,
      latestReferencePeriodEnd: observations
        .map((observation) => observation.referencePeriod.end)
        .sort()
        .at(-1),
      message: hasParserQuarantine
        ? `${normalized.quarantined.length + report.quarantined.length} linhas/células não atravessaram a quarentena.`
        : "Dataset consultado e normalizado sem linhas rejeitadas.",
    };
    if (hasParserQuarantine) note = sourceHealth.message;
  } catch {
    sourceHealth = {
      sourceId: "ine",
      state: "delayed",
      critical: true,
      checkedAt,
      lastRunAt: checkedAt,
      // Este objeto sai por uma API pública. O erro técnico pertence aos
      // logs/observabilidade do servidor; nunca ao pack entregue ao browser.
      message: "Não foi possível confirmar o dataset oficial nesta execução.",
    };
    note = "A fonte oficial não respondeu ou mudou de contrato. Nenhum valor de fallback foi usado.";
  }

  const signals: MarketEvidenceSignal[] = observations.map((observation) => ({
    observationId: observation.id,
    sourceId: observation.sourceId,
    independenceKey: "pt-tourism-accommodation-survey:ine",
    kind: "demand",
    freshness: classifyObservationFreshness(observation, checkedAt, 45),
    geographyCompatible: true,
    semanticMapping: observation.quality.semanticMapping,
    critical: true,
  }));

  const gate = evaluateMarketEvidence({
    templateId: "tourism-guest-operations",
    evaluatedAt: checkedAt,
    signals,
    sourceHealth: [sourceHealth],
    economicViability: null,
    criticalRequirements: "pending",
    falsificationTestDefined: true,
  });

  return [
    {
      templateId: "tourism-guest-operations",
      checkedAt,
      gate,
      observations: observations.map(summarize),
      sourceHealth: [sourceHealth],
      sourceUrl,
      datasetUrl: TOURISM_DATASET_URL,
      note,
    },
  ];
}
