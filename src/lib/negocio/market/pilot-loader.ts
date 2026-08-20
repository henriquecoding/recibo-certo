// ═══════════════════════════════════════════════════════════════════════
//  CARREGADOR DE PILOTOS — uma passagem por série, um gate por hipótese
//  ---------------------------------------------------------------------
//  Antes havia aqui um só piloto, escrito à mão. Quatro das cinco ideias
//  nunca podiam mostrar um número, e a interface tinha de saber o id do
//  único que podia — uma regra de dados a viver dentro de um componente.
//
//  Agora o registo em `pilots.ts` decide, e este ficheiro só executa:
//  transporta, normaliza, põe em quarentena, classifica frescura e chama o
//  gate. Uma série que falhe degrada o seu piloto; nunca contamina outro,
//  e nunca produz um número de substituição.
// ═══════════════════════════════════════════════════════════════════════

import { fetchEurostatDataset, normalizeEurostatDataset } from "./connectors/eurostat";
import { fetchIneIndicator, normalizeIneAnnualIndicator } from "./connectors/ine";
import { evaluateMarketEvidence } from "./evidence-gate";
import { classifyObservationFreshness } from "./freshness";
import { MARKET_PILOTS, type MarketPilotDefinition, type MarketPilotSeries } from "./pilots";
import { quarantineMarketObservations } from "./quarantine";
import type { MarketPilotEvidence, MarketObservationSummary } from "./opportunities";
import type {
  MarketEvidenceSignal,
  MarketObservation,
  MarketSourceHealth,
  MarketSourceHealthState,
} from "./tipos";

export { TOURISM_OCCUPANCY_MANIFEST } from "./pilots";

const EXPIRING_WITHIN_DAYS = 45;
const FETCH_TIMEOUT_MS = 8_000;

/**
 * Uma leitura por geografia: a mais recente.
 *
 * Chaveia por geografia porque cada série já tem um `metricId` próprio —
 * duas leituras diferentes nunca partilham este mapa e por isso nunca se
 * apagam uma à outra.
 */
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

function summarize(
  observation: MarketObservation,
  series: MarketPilotSeries,
): MarketObservationSummary {
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
    seriesId: series.id,
    seriesLabel: series.label,
    reading: series.reading,
    independenceKey: series.independenceKey,
    kind: series.kind,
    critical: series.critical,
    semanticMapping: observation.quality.semanticMapping,
  };
}

export interface LoadPilotEvidenceOptions {
  fetchImpl?: typeof fetch;
  now?: () => string;
  signal?: AbortSignal;
  /** Restringe a execução, sobretudo para testes determinísticos. */
  pilots?: readonly MarketPilotDefinition[];
}

interface SeriesOutcome {
  series: MarketPilotSeries;
  observations: readonly MarketObservation[];
  rejected: number;
  sourceUrl?: string;
  failed: boolean;
}

async function loadSeries(
  series: MarketPilotSeries,
  checkedAt: string,
  options: LoadPilotEvidenceOptions,
): Promise<SeriesOutcome> {
  const signal = options.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const transport = { fetchImpl: options.fetchImpl, now: () => checkedAt, signal };

  try {
    const definition = series.source;
    let observations: readonly MarketObservation[];
    let parserRejected: number;
    let sourceUrl: string;

    if (definition.connector === "ine") {
      const fetched = await fetchIneIndicator(definition.manifest.indicatorCode, transport);
      const normalized = normalizeIneAnnualIndicator(fetched, definition.manifest);
      observations = normalized.observations;
      parserRejected = normalized.quarantined.length;
      sourceUrl = fetched.sourceUrl;
    } else {
      const fetched = await fetchEurostatDataset(definition.manifest.datasetCode, {
        ...transport,
        filters: definition.fetchFilters,
      });
      const normalized = normalizeEurostatDataset(fetched, definition.manifest);
      observations = normalized.observations;
      parserRejected = normalized.quarantined.length;
      sourceUrl = fetched.sourceUrl;
    }

    const report = quarantineMarketObservations(observations, {
      asOf: checkedAt,
      expiringWithinDays: EXPIRING_WITHIN_DAYS,
    });

    return {
      series,
      observations: latestByGeography(report.accepted),
      rejected: parserRejected + report.quarantined.length,
      sourceUrl,
      failed: false,
    };
  } catch {
    // O erro técnico pertence aos logs do servidor. Este objeto sai por uma
    // API pública e não pode revelar endpoints, stack ou schema interno.
    return { series, observations: [], rejected: 0, failed: true };
  }
}

function healthFor(
  sourceId: string,
  outcomes: readonly SeriesOutcome[],
  checkedAt: string,
): MarketSourceHealth {
  const observations = outcomes.flatMap((outcome) => outcome.observations);
  const rejected = outcomes.reduce((total, outcome) => total + outcome.rejected, 0);
  const failed = outcomes.some((outcome) => outcome.failed);
  const critical = outcomes.some((outcome) => outcome.series.critical);

  let state: MarketSourceHealthState;
  let message: string;
  if (failed && observations.length === 0) {
    state = "delayed";
    message = "Não foi possível confirmar o dataset oficial nesta execução.";
  } else if (failed) {
    state = "delayed";
    message = "Parte das séries desta fonte não respondeu; só as confirmadas são mostradas.";
  } else if (observations.length === 0) {
    state = "quarantined";
    message = "A fonte respondeu, mas nenhuma observação atravessou a quarentena.";
  } else {
    state = "healthy";
    message =
      rejected > 0
        ? `${rejected} linhas/células não atravessaram a quarentena e ficaram de fora.`
        : "Dataset consultado e normalizado sem linhas rejeitadas.";
  }

  return {
    sourceId,
    state,
    critical,
    checkedAt,
    lastRunAt: checkedAt,
    lastSuccessfulRunAt: observations.length > 0 ? checkedAt : undefined,
    latestReferencePeriodEnd: observations
      .map((observation) => observation.referencePeriod.end)
      .sort()
      .at(-1),
    message,
  };
}

async function loadPilot(
  pilot: MarketPilotDefinition,
  checkedAt: string,
  options: LoadPilotEvidenceOptions,
): Promise<MarketPilotEvidence> {
  const outcomes = await Promise.all(
    pilot.series.map((series) => loadSeries(series, checkedAt, options)),
  );

  const bySource = new Map<string, SeriesOutcome[]>();
  for (const outcome of outcomes) {
    const list = bySource.get(outcome.series.sourceId) ?? [];
    list.push(outcome);
    bySource.set(outcome.series.sourceId, list);
  }
  const sourceHealth = [...bySource.entries()]
    .map(([sourceId, list]) => healthFor(sourceId, list, checkedAt))
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));

  const signals: MarketEvidenceSignal[] = outcomes.flatMap((outcome) =>
    outcome.observations.map((observation) => ({
      observationId: observation.id,
      sourceId: observation.sourceId,
      independenceKey: outcome.series.independenceKey,
      kind: outcome.series.kind,
      // A compatibilidade com a ZONA de quem decide é resolvida no browser,
      // onde o perfil vive. Aqui só se afirma o que é verdade no servidor:
      // a observação é de Portugal e do universo declarado no manifesto.
      geographyCompatible: true,
      freshness: classifyObservationFreshness(observation, checkedAt, EXPIRING_WITHIN_DAYS),
      semanticMapping: observation.quality.semanticMapping,
      critical: outcome.series.critical,
    })),
  );

  const gate = evaluateMarketEvidence({
    templateId: pilot.templateId,
    evaluatedAt: checkedAt,
    signals,
    sourceHealth,
    // Preço e requisitos pertencem à realidade de quem decide: entram no
    // gate no cliente, quando essa pessoa os tiver mesmo.
    economicViability: null,
    criticalRequirements: "pending",
    falsificationTestDefined: true,
  });

  const failedSeries = outcomes.filter((outcome) => outcome.failed);
  const rejected = outcomes.reduce((total, outcome) => total + outcome.rejected, 0);
  const note = failedSeries.length
    ? "A fonte oficial não respondeu ou mudou de contrato. Nenhum valor de fallback foi usado."
    : rejected > 0
      ? `${rejected} linhas/células não atravessaram a quarentena e ficaram de fora.`
      : undefined;

  return {
    templateId: pilot.templateId,
    checkedAt,
    gate,
    observations: outcomes.flatMap((outcome) =>
      outcome.observations.map((observation) => summarize(observation, outcome.series)),
    ),
    sourceHealth,
    sourceUrl: outcomes.find((outcome) => outcome.sourceUrl)?.sourceUrl,
    datasetUrl: pilot.datasetUrl,
    note,
  };
}

export async function loadPilotMarketEvidence(
  options: LoadPilotEvidenceOptions = {},
): Promise<readonly MarketPilotEvidence[]> {
  const checkedAt = (options.now ?? (() => new Date().toISOString()))();
  const pilots = options.pilots ?? MARKET_PILOTS;
  return Promise.all(pilots.map((pilot) => loadPilot(pilot, checkedAt, options)));
}
