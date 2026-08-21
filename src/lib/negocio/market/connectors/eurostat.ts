// ═══════════════════════════════════════════════════════════════════════
//  EUROSTAT JSON-STAT — transporte e normalização por manifesto
//  ---------------------------------------------------------------------
//  O parser percorre o cubo pela ordem `id`/`size` declarada no payload.
//  Nunca depende da ordem de propriedades de `dimension` nem adivinha o
//  significado dos códigos. Um manifesto revisto seleciona dimensões,
//  geografias, unidade e validade; o resto fica de fora.
// ═══════════════════════════════════════════════════════════════════════

import { addDaysToIsoDate, isValidIsoDate } from "../freshness";
import { getMarketSource } from "../source-registry";
import type {
  GeographyRef,
  MarketObservation,
  MarketObservationStatus,
  MarketSemanticMappingStatus,
} from "../tipos";

export class EurostatConnectorError extends Error {
  constructor(
    readonly code:
      | "invalid-dataset-code"
      | "http-error"
      | "invalid-json"
      | "invalid-schema"
      | "checksum-unavailable",
    message: string,
  ) {
    super(message);
    this.name = "EurostatConnectorError";
  }
}

interface JsonStatCategory {
  index: Readonly<Record<string, number>> | readonly string[];
  label?: Readonly<Record<string, string>>;
}

interface JsonStatDimension {
  category: JsonStatCategory;
}

export interface EurostatPayload {
  version?: string;
  class: "dataset";
  id: readonly string[];
  size: readonly number[];
  dimension: Readonly<Record<string, JsonStatDimension>>;
  value: Readonly<Record<string, number | null>> | readonly (number | null)[];
  updated?: string;
}

export interface EurostatFetchResult {
  payload: EurostatPayload;
  sourceUrl: string;
  retrievedAt: string;
  checksum: string;
}

export interface EurostatFetchOptions {
  filters?: Readonly<Record<string, readonly string[]>>;
  language?: "en" | "de" | "fr";
  fetchImpl?: typeof fetch;
  now?: () => string;
  signal?: AbortSignal;
}

export interface EurostatDatasetManifest {
  datasetCode: string;
  metricId: string;
  unit: string;
  maxReferenceAgeDays: number;
  geographyByCode: Readonly<
    Record<
      string,
      {
        level: GeographyRef["level"];
        name: string;
        classificationVersion?: string;
      }
    >
  >;
  /** Todos os filtros, exceto `geo` e `time`, que podem variar. */
  dimensionFilters: Readonly<Record<string, readonly string[]>>;
  geographyDimension?: string;
  timeDimension?: string;
  classifications?: MarketObservation["classifications"];
  methodologyRef?: string;
  observationStatus: MarketObservationStatus;
  semanticMapping: MarketSemanticMappingStatus;
}

export interface EurostatQuarantinedCell {
  index: number;
  reason: "unmapped-geography" | "unsupported-period" | "invalid-value" | "duplicate-observation";
  detail: string;
}

export interface EurostatNormalizationResult {
  observations: readonly MarketObservation[];
  quarantined: readonly EurostatQuarantinedCell[];
}

const DATASET_CODE = /^[a-z0-9_]+$/i;
const METRIC_ID = /^[a-z0-9][a-z0-9._-]*$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/i;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function categoryCodes(category: JsonStatCategory): readonly string[] {
  if (Array.isArray(category.index)) return category.index;
  return Object.entries(category.index)
    .sort((left, right) => left[1] - right[1])
    .map(([code]) => code);
}

export function buildEurostatUrl(
  datasetCode: string,
  options: Pick<EurostatFetchOptions, "filters" | "language"> = {},
): string {
  if (!DATASET_CODE.test(datasetCode)) {
    throw new EurostatConnectorError("invalid-dataset-code", "O código do dataset Eurostat é inválido.");
  }
  const source = getMarketSource("eurostat");
  if (!source) throw new EurostatConnectorError("invalid-schema", "A fonte Eurostat não existe no registry.");
  const url = new URL(datasetCode, source.canonicalUrl);
  url.searchParams.set("lang", options.language ?? "en");
  url.searchParams.set("format", "JSON");
  for (const [dimension, values] of Object.entries(options.filters ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    for (const value of values) url.searchParams.append(dimension, value);
  }
  return url.toString();
}

export function parseEurostatPayload(raw: unknown): EurostatPayload {
  if (!record(raw) || raw.class !== "dataset" || !Array.isArray(raw.id) || !Array.isArray(raw.size)) {
    throw new EurostatConnectorError("invalid-schema", "A resposta não é um dataset JSON-stat.");
  }
  if (
    raw.id.length === 0 ||
    raw.id.length !== raw.size.length ||
    !raw.id.every((item) => typeof item === "string" && item.length > 0) ||
    !raw.size.every((item) => Number.isInteger(item) && (item as number) > 0) ||
    !record(raw.dimension) ||
    !(Array.isArray(raw.value) || record(raw.value))
  ) {
    throw new EurostatConnectorError("invalid-schema", "As dimensões, tamanhos ou valores JSON-stat são inválidos.");
  }
  for (const [position, id] of (raw.id as string[]).entries()) {
    const dimension = (raw.dimension as Record<string, unknown>)[id];
    if (!record(dimension) || !record(dimension.category)) {
      throw new EurostatConnectorError("invalid-schema", `A dimensão ${id} não contém categorias.`);
    }
    const index = dimension.category.index;
    if (!(Array.isArray(index) || record(index)) || categoryCodes(dimension.category as unknown as JsonStatCategory).length !== raw.size[position]) {
      throw new EurostatConnectorError("invalid-schema", `A dimensão ${id} não coincide com o tamanho declarado.`);
    }
  }
  return raw as unknown as EurostatPayload;
}

async function sha256(text: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new EurostatConnectorError("checksum-unavailable", "Web Crypto é obrigatório para calcular SHA-256.");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function fetchEurostatDataset(
  datasetCode: string,
  options: EurostatFetchOptions = {},
): Promise<EurostatFetchResult> {
  const sourceUrl = buildEurostatUrl(datasetCode, options);
  const response = await (options.fetchImpl ?? fetch)(sourceUrl, {
    headers: { Accept: "application/json" },
    signal: options.signal,
  });
  if (!response.ok) {
    throw new EurostatConnectorError("http-error", `O Eurostat respondeu com HTTP ${response.status}.`);
  }
  const text = await response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new EurostatConnectorError("invalid-json", "O Eurostat não devolveu JSON válido.");
  }
  const retrievedAt = (options.now ?? (() => new Date().toISOString()))();
  if (!isValidIsoDate(retrievedAt)) {
    throw new EurostatConnectorError("invalid-schema", "A data de recolha não é ISO 8601 válida.");
  }
  return { payload: parseEurostatPayload(raw), sourceUrl, retrievedAt, checksum: await sha256(text) };
}

function periodFromCode(code: string): { start: string; end: string; label: string } | null {
  if (/^\d{4}$/.test(code)) return { start: `${code}-01-01`, end: `${code}-12-31`, label: code };
  const month = /^(\d{4})-(\d{2})$/.exec(code);
  if (month) {
    const year = Number(month[1]);
    const monthNumber = Number(month[2]);
    if (monthNumber < 1 || monthNumber > 12) return null;
    const end = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
    return { start: `${month[1]}-${month[2]}-01`, end, label: code };
  }
  const quarter = /^(\d{4})-Q([1-4])$/.exec(code);
  if (quarter) {
    const year = Number(quarter[1]);
    const q = Number(quarter[2]);
    const firstMonth = (q - 1) * 3 + 1;
    const lastMonth = firstMonth + 2;
    const end = new Date(Date.UTC(year, lastMonth, 0)).toISOString().slice(0, 10);
    return {
      start: `${quarter[1]}-${String(firstMonth).padStart(2, "0")}-01`,
      end,
      label: code,
    };
  }
  return null;
}

function coordinatesForIndex(index: number, sizes: readonly number[]): number[] {
  const coordinates = new Array<number>(sizes.length);
  let remaining = index;
  for (let dimension = sizes.length - 1; dimension >= 0; dimension -= 1) {
    coordinates[dimension] = remaining % sizes[dimension];
    remaining = Math.floor(remaining / sizes[dimension]);
  }
  return coordinates;
}

function valueAt(payload: EurostatPayload, index: number): number | null | undefined {
  return Array.isArray(payload.value)
    ? payload.value[index]
    : (payload.value as Readonly<Record<string, number | null>>)[String(index)];
}

export function normalizeEurostatDataset(
  fetched: EurostatFetchResult,
  manifest: EurostatDatasetManifest,
): EurostatNormalizationResult {
  if (!DATASET_CODE.test(manifest.datasetCode) || !METRIC_ID.test(manifest.metricId) || !manifest.unit.trim()) {
    throw new EurostatConnectorError("invalid-schema", "O manifesto precisa de dataset, metricId e unidade válidos.");
  }
  if (!Number.isInteger(manifest.maxReferenceAgeDays) || manifest.maxReferenceAgeDays <= 0 || !SHA256.test(fetched.checksum)) {
    throw new EurostatConnectorError("invalid-schema", "A validade ou o checksum do manifesto é inválido.");
  }

  const payload = fetched.payload;
  const geoDimension = manifest.geographyDimension ?? "geo";
  const timeDimension = manifest.timeDimension ?? "time";
  const codes = payload.id.map((id) => categoryCodes(payload.dimension[id].category));
  const observations: MarketObservation[] = [];
  const quarantined: EurostatQuarantinedCell[] = [];
  const seen = new Set<string>();
  const totalCells = payload.size.reduce((total, size) => total * size, 1);

  for (let index = 0; index < totalCells; index += 1) {
    const value = valueAt(payload, index);
    if (value === undefined || value === null) continue;
    if (!Number.isFinite(value)) {
      quarantined.push({ index, reason: "invalid-value", detail: "A célula não contém um número finito." });
      continue;
    }
    const coordinates = coordinatesForIndex(index, payload.size);
    const selection = Object.fromEntries(payload.id.map((id, position) => [id, codes[position][coordinates[position]]]));
    const selected = Object.entries(manifest.dimensionFilters).every(([dimension, allowed]) =>
      allowed.includes(selection[dimension]),
    );
    if (!selected) continue;

    const geoCode = selection[geoDimension];
    const geography = manifest.geographyByCode[geoCode];
    if (!geography) {
      quarantined.push({ index, reason: "unmapped-geography", detail: `Geografia não mapeada: ${geoCode}.` });
      continue;
    }
    const period = periodFromCode(selection[timeDimension]);
    if (!period) {
      quarantined.push({ index, reason: "unsupported-period", detail: `Período não suportado: ${selection[timeDimension]}.` });
      continue;
    }
    const id = `eurostat:${manifest.metricId}:${period.label}:${geoCode}`;
    if (seen.has(id)) {
      const previous = observations.findIndex((observation) => observation.id === id);
      if (previous >= 0) observations.splice(previous, 1);
      quarantined.push({ index, reason: "duplicate-observation", detail: `Célula duplicada para ${id}.` });
      continue;
    }
    const validUntil = addDaysToIsoDate(period.end, manifest.maxReferenceAgeDays);
    if (!validUntil) throw new EurostatConnectorError("invalid-schema", "Não foi possível calcular validUntil.");

    observations.push({
      id,
      sourceId: "eurostat",
      metricId: manifest.metricId,
      value,
      unit: manifest.unit,
      geography: {
        country: "PT",
        level: geography.level,
        code: geoCode,
        name: geography.name,
        classificationVersion: geography.classificationVersion,
      },
      classifications: manifest.classifications ?? {},
      referencePeriod: period,
      publishedAt: payload.updated && isValidIsoDate(payload.updated) ? payload.updated : undefined,
      retrievedAt: fetched.retrievedAt,
      validUntil,
      methodologyRef: manifest.methodologyRef ?? fetched.sourceUrl,
      transform: {
        id: "eurostat-jsonstat-selection",
        version: "1",
        description: `Seleção curada: ${Object.keys(manifest.dimensionFilters).sort().join(", ")}.`,
      },
      license: {
        status: "approved",
        scope: "source",
        identifier: "European Commission reuse decision 2011/833/EU",
        url: "https://ec.europa.eu/eurostat/help/copyright-notice",
        attribution: "Fonte: Eurostat",
      },
      quality: {
        status: manifest.observationStatus,
        completeness: 1,
        semanticMapping: manifest.semanticMapping,
        flags: [],
      },
      checksum: fetched.checksum,
    });
    seen.add(id);
  }

  return { observations: observations.sort((a, b) => a.id.localeCompare(b.id)), quarantined };
}
