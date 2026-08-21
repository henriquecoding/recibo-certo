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

import { obterSnapshotBulk } from "./bulk/snapshots";
import { buildEurostatUrl, fetchEurostatDataset, normalizeEurostatDataset } from "./connectors/eurostat";
import { buildIneIndicatorUrl, fetchIneIndicator, normalizeIneAnnualIndicator } from "./connectors/ine";
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
  /**
   * Quando o instantâneo em bloco foi tirado, para as séries que não são
   * consultadas a pedido. Sem isto, a saúde da fonte diria «consultada
   * agora» sobre um ficheiro descarregado há três semanas.
   */
  extraidoEm?: string;
}

/**
 * Transporte partilhado por execução.
 *
 * Três pilotos leem o mesmo indicador de demografia das empresas e dois o
 * mesmo índice de envelhecimento. Um pedido por SÉRIE dava dez chamadas
 * concorrentes ao INE — que respondia 503 e punha metade dos cartões em
 * `delayed` por culpa nossa, não da fonte.
 *
 * A chave é o URL: duas séries que só diferem no filtro de dimensões
 * partilham a mesma resposta HTTP e normalizam-na de maneira diferente.
 */
class MarketTransport {
  private readonly emCurso = new Map<string, Promise<unknown>>();
  private readonly filaPorFonte = new Map<string, Promise<unknown>>();

  constructor(
    private readonly checkedAt: string,
    private readonly options: LoadPilotEvidenceOptions,
  ) {}

  /**
   * Serializa por fonte e repete em falha transitória.
   *
   * As tentativas extra existem porque a primeira pode ter sido recusada
   * por CARGA — muitas vezes a nossa. Foi o que aconteceu numa build: o
   * INE respondeu 503 a metade das séries e a rota, prerenderizada, ficava
   * seis horas a servir cartões degradados por culpa nossa.
   *
   * Não é uma forma de insistir com uma fonte que mudou de contrato: essa
   * falha nas três, e o resultado é `delayed` sem número inventado.
   */
  private async emSerie<T>(sourceId: string, tarefa: () => Promise<T>): Promise<T> {
    const tentar = async (): Promise<T> => {
      let ultimo: unknown;
      for (let ronda = 0; ronda < 3; ronda += 1) {
        try {
          return await tarefa();
        } catch (erro) {
          ultimo = erro;
          if (ronda < 2) {
            await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** ronda));
          }
        }
      }
      throw ultimo;
    };

    const anterior = this.filaPorFonte.get(sourceId) ?? Promise.resolve();
    const proxima = anterior.then(tentar, tentar);
    // A fila avança mesmo quando falha; um erro não pode bloquear o resto.
    this.filaPorFonte.set(sourceId, proxima.catch(() => undefined));
    return proxima;
  }

  buscar<T>(chave: string, sourceId: string, tarefa: () => Promise<T>): Promise<T> {
    const existente = this.emCurso.get(chave);
    if (existente) return existente as Promise<T>;
    const promessa = this.emSerie(sourceId, tarefa);
    this.emCurso.set(chave, promessa);
    return promessa;
  }

  get transporte() {
    return {
      fetchImpl: this.options.fetchImpl,
      now: () => this.checkedAt,
      signal: this.options.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
    };
  }
}

async function loadSeries(
  series: MarketPilotSeries,
  checkedAt: string,
  transport: MarketTransport,
): Promise<SeriesOutcome> {
  try {
    const definition = series.source;
    let observations: readonly MarketObservation[];
    let parserRejected: number;
    let sourceUrl: string;
    let extraidoEm: string | undefined;

    if (definition.connector === "bulk") {
      // Nada de rede: o instantâneo já está no repositório, assinado e com
      // a proveniência agarrada. O que aqui se faz é escolher a métrica e
      // submetê-la exatamente à mesma quarentena das outras — uma origem
      // em bloco não ganha dispensa de licença, período ou checksum, e é
      // por isso que um instantâneo por atualizar acaba `stale` sozinho.
      const guardado = obterSnapshotBulk(definition.snapshotId);
      if (!guardado) {
        return { series, observations: [], rejected: 0, failed: true };
      }
      observations = guardado.observations.filter(
        (observacao) => observacao.metricId === definition.metricId,
      );
      // As observações das outras métricas do mesmo instantâneo não são
      // linhas rejeitadas: são de outra série. Contá-las aqui daria um
      // aviso de qualidade a descrever uma coisa que correu bem.
      parserRejected = 0;
      sourceUrl = guardado.proveniencia.recurso.url;
      extraidoEm = guardado.geradoEm;
    } else if (definition.connector === "ine") {
      const url = buildIneIndicatorUrl(definition.manifest.indicatorCode);
      const fetched = await transport.buscar(url, series.sourceId, () =>
        fetchIneIndicator(definition.manifest.indicatorCode, transport.transporte),
      );
      const normalized = normalizeIneAnnualIndicator(fetched, definition.manifest);
      observations = normalized.observations;
      // `outOfScope` fica de fora da contagem de propósito: são as
      // geografias que o manifesto nunca pediu, não linhas rejeitadas.
      parserRejected = normalized.quarantined.length;
      sourceUrl = fetched.sourceUrl;
    } else {
      const url = buildEurostatUrl(definition.manifest.datasetCode, {
        filters: definition.fetchFilters,
      });
      const fetched = await transport.buscar(url, series.sourceId, () =>
        fetchEurostatDataset(definition.manifest.datasetCode, {
          ...transport.transporte,
          filters: definition.fetchFilters,
        }),
      );
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
      extraidoEm,
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

  // A extração mais recente entre as séries em bloco desta fonte. Quando
  // existe, é ela — e não o instante do pedido — que data os dados.
  const extraidoEm = outcomes
    .map((outcome) => outcome.extraidoEm)
    .filter((instante): instante is string => Boolean(instante))
    .sort()
    .at(-1);
  const emBloco = extraidoEm
    ? ` Extração em bloco de ${extraidoEm.slice(0, 10)}: o portal não é consultado a cada visita.`
    : "";

  let state: MarketSourceHealthState;
  let message: string;
  if (failed && observations.length === 0) {
    state = "delayed";
    message = extraidoEm
      ? "O instantâneo desta fonte não está legível nesta versão."
      : "Não foi possível confirmar o dataset oficial nesta execução.";
  } else if (failed) {
    state = "delayed";
    message = "Parte das séries desta fonte não respondeu; só as confirmadas são mostradas.";
  } else if (observations.length === 0) {
    state = "quarantined";
    message = `A fonte respondeu, mas nenhuma observação atravessou a quarentena.${emBloco}`;
  } else {
    state = "healthy";
    message =
      (rejected > 0
        ? `${rejected} linhas/células não atravessaram a quarentena e ficaram de fora.`
        : "Dataset consultado e normalizado sem linhas rejeitadas.") + emBloco;
  }

  return {
    sourceId,
    state,
    critical,
    checkedAt,
    lastRunAt: extraidoEm ?? checkedAt,
    lastSuccessfulRunAt: observations.length > 0 ? (extraidoEm ?? checkedAt) : undefined,
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
  transport: MarketTransport,
): Promise<MarketPilotEvidence> {
  const outcomes = await Promise.all(
    pilot.series.map((series) => loadSeries(series, checkedAt, transport)),
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
  // Um transporte por execução: é ele que garante que o mesmo indicador
  // não é pedido uma vez por cada piloto que o usa.
  const transport = new MarketTransport(checkedAt, options);
  return Promise.all(pilots.map((pilot) => loadPilot(pilot, checkedAt, transport)));
}
