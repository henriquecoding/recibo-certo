// ═══════════════════════════════════════════════════════════════════════
//  CONECTOR INE — transporte real, normalização fail-closed
//  ---------------------------------------------------------------------
//  Endpoint e schema confirmados na documentação pública do INE. O
//  conector nunca adivinha unidade, significado de dimensão ou nível
//  geográfico: tudo isso vem de um manifesto de indicador revisto.
// ═══════════════════════════════════════════════════════════════════════

import { addDaysToIsoDate, isValidIsoDate } from "../freshness";
import { getMarketSource } from "../source-registry";
import type {
  GeographyRef,
  MarketObservation,
  MarketObservationLicense,
  MarketObservationStatus,
  MarketSemanticMappingStatus,
} from "../tipos";

export type IneLanguage = "PT" | "EN";

export class IneConnectorError extends Error {
  constructor(
    readonly code:
      | "invalid-indicator-code"
      | "http-error"
      | "invalid-json"
      | "invalid-schema"
      | "checksum-unavailable",
    message: string,
  ) {
    super(message);
    this.name = "IneConnectorError";
  }
}

export interface IneApiRow {
  geocod?: string;
  geodsg?: string;
  valor?: string | number;
  ind_string?: string;
  sinal_conv?: string;
  sinal_conv_desc?: string;
  [dimension: string]: unknown;
}

export interface IneIndicatorPayload {
  IndicadorCod: string;
  IndicadorDsg: string;
  MetaInfUrl?: string;
  DataExtracao?: string;
  DataUltimoAtualizacao?: string;
  UltimoPref?: string;
  Dados: Readonly<Record<string, readonly IneApiRow[]>>;
}

export interface IneFetchResult {
  payload: IneIndicatorPayload;
  sourceUrl: string;
  retrievedAt: string;
  checksum: string;
}

export interface IneFetchOptions {
  language?: IneLanguage;
  fetchImpl?: typeof fetch;
  now?: () => string;
  signal?: AbortSignal;
}

export interface IneGeographyMapping {
  level: GeographyRef["level"];
  classificationVersion?: string;
  /** Se declarado, uma alteração do nome põe a linha em quarentena. */
  expectedName?: string;
}

export interface IneAnnualIndicatorManifest {
  indicatorCode: string;
  metricId: string;
  unit: string;
  maxReferenceAgeDays: number;
  geographyByCode: Readonly<Record<string, IneGeographyMapping>>;
  /** Dimensões que têm de coincidir; por exemplo `{ dim_3: ["T"] }`. */
  dimensionFilters: Readonly<Record<string, readonly string[]>>;
  /** Separador documentado para o campo `valor`; nunca é inferido. */
  decimalSeparator: "." | ",";
  classifications?: MarketObservation["classifications"];
  methodologyRef?: string;
  observationStatus: MarketObservationStatus;
  semanticMapping: MarketSemanticMappingStatus;
  /**
   * Licença publicada para esta série/dataset concreto. Permite usar uma
   * entrada CC BY do dados.gov sem aprovar, por arrasto, toda a API do INE.
   */
  datasetLicense?: MarketObservationLicense;
}

export interface IneQuarantinedRow {
  period: string;
  geographyCode?: string;
  reason:
    | "unsupported-period"
    | "unmapped-geography"
    | "geography-name-changed"
    | "conventional-sign"
    | "missing-value"
    | "ambiguous-number"
    | "duplicate-observation";
  detail: string;
}

export interface IneNormalizationResult {
  observations: readonly MarketObservation[];
  quarantined: readonly IneQuarantinedRow[];
}

const INDICATOR_CODE = /^\d{7}$/;
const METRIC_ID = /^[a-z0-9][a-z0-9._-]*$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/i;
const DIMENSION_KEY = /^dim_\d+$/;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function buildIneIndicatorUrl(
  indicatorCode: string,
  language: IneLanguage = "PT",
): string {
  if (!INDICATOR_CODE.test(indicatorCode)) {
    throw new IneConnectorError(
      "invalid-indicator-code",
      "O código de indicador do INE tem de conter exatamente sete algarismos.",
    );
  }

  const source = getMarketSource("ine");
  if (!source) throw new IneConnectorError("invalid-schema", "A fonte INE não existe no source registry.");

  const url = new URL(source.canonicalUrl);
  url.searchParams.set("op", "2");
  url.searchParams.set("varcd", indicatorCode);
  url.searchParams.set("lang", language);
  return url.toString();
}

export function parseIneIndicatorPayload(
  raw: unknown,
  expectedIndicatorCode: string,
): IneIndicatorPayload {
  if (!Array.isArray(raw) || raw.length !== 1 || !record(raw[0])) {
    throw new IneConnectorError("invalid-schema", "A resposta do INE não contém um único indicador.");
  }

  const item = raw[0];
  if (
    item.IndicadorCod !== expectedIndicatorCode ||
    typeof item.IndicadorDsg !== "string" ||
    !record(item.Dados)
  ) {
    throw new IneConnectorError(
      "invalid-schema",
      "O código, a descrição ou o bloco Dados da resposta do INE não respeita o contrato esperado.",
    );
  }

  const data: Record<string, readonly IneApiRow[]> = {};
  for (const [period, rows] of Object.entries(item.Dados)) {
    if (!Array.isArray(rows) || !rows.every(record)) {
      throw new IneConnectorError("invalid-schema", `O período ${period} não contém uma lista de linhas válida.`);
    }
    data[period] = rows as IneApiRow[];
  }

  const optionalStrings = ["MetaInfUrl", "DataExtracao", "DataUltimoAtualizacao", "UltimoPref"] as const;
  for (const field of optionalStrings) {
    if (item[field] !== undefined && typeof item[field] !== "string") {
      throw new IneConnectorError("invalid-schema", `${field} não é texto.`);
    }
  }

  return {
    IndicadorCod: item.IndicadorCod,
    IndicadorDsg: item.IndicadorDsg,
    MetaInfUrl: item.MetaInfUrl as string | undefined,
    DataExtracao: item.DataExtracao as string | undefined,
    DataUltimoAtualizacao: item.DataUltimoAtualizacao as string | undefined,
    UltimoPref: item.UltimoPref as string | undefined,
    Dados: data,
  };
}

async function sha256(text: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new IneConnectorError(
      "checksum-unavailable",
      "Web Crypto é obrigatório; o conector não usa um hash fraco como fallback.",
    );
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

export async function fetchIneIndicator(
  indicatorCode: string,
  options: IneFetchOptions = {},
): Promise<IneFetchResult> {
  const sourceUrl = buildIneIndicatorUrl(indicatorCode, options.language);
  const response = await (options.fetchImpl ?? fetch)(sourceUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new IneConnectorError("http-error", `O INE respondeu com HTTP ${response.status}.`);
  }

  const text = await response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new IneConnectorError("invalid-json", "O INE não devolveu JSON válido.");
  }

  const retrievedAt = (options.now ?? (() => new Date().toISOString()))();
  if (!isValidIsoDate(retrievedAt)) {
    throw new IneConnectorError("invalid-schema", "A data de recolha injetada não é ISO 8601 válida.");
  }

  return {
    payload: parseIneIndicatorPayload(raw, indicatorCode),
    sourceUrl,
    retrievedAt,
    checksum: await sha256(text),
  };
}

function annualPeriod(label: string): { start: string; end: string } | null {
  if (!/^\d{4}$/.test(label)) return null;
  return { start: `${label}-01-01`, end: `${label}-12-31` };
}

function numericValue(value: string | number | undefined, decimalSeparator: "." | ","): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  // O separador vem do manifesto. Formatos mistos ou milhares agrupados não
  // são «corrigidos» por heurística.
  const pattern = decimalSeparator === "." ? /^-?\d+(?:\.\d+)?$/ : /^-?\d+(?:,\d+)?$/;
  if (!pattern.test(normalized)) return null;
  const parsed = Number(decimalSeparator === "," ? normalized.replace(",", ".") : normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesDimensions(row: IneApiRow, filters: IneAnnualIndicatorManifest["dimensionFilters"]): boolean {
  return Object.entries(filters).every(([dimension, allowed]) => {
    if (!DIMENSION_KEY.test(dimension) || allowed.length === 0) return false;
    const value = row[dimension];
    return typeof value === "string" && allowed.includes(value);
  });
}

function validateManifest(manifest: IneAnnualIndicatorManifest): void {
  if (!INDICATOR_CODE.test(manifest.indicatorCode)) {
    throw new IneConnectorError("invalid-indicator-code", "O manifesto contém um código INE inválido.");
  }
  if (!METRIC_ID.test(manifest.metricId) || !manifest.unit.trim()) {
    throw new IneConnectorError("invalid-schema", "O manifesto precisa de metricId estável e unidade explícita.");
  }
  if (!Number.isInteger(manifest.maxReferenceAgeDays) || manifest.maxReferenceAgeDays <= 0) {
    throw new IneConnectorError("invalid-schema", "maxReferenceAgeDays tem de ser um inteiro positivo.");
  }
  if (Object.keys(manifest.geographyByCode).length === 0) {
    throw new IneConnectorError("invalid-schema", "O manifesto precisa de geografias explicitamente mapeadas.");
  }
  if (Object.keys(manifest.dimensionFilters).some((key) => !DIMENSION_KEY.test(key))) {
    throw new IneConnectorError("invalid-schema", "O manifesto contém uma dimensão INE inválida.");
  }
  if (
    Object.values(manifest.dimensionFilters).some(
      (allowed) => allowed.length === 0 || allowed.some((value) => !value.trim()),
    )
  ) {
    throw new IneConnectorError("invalid-schema", "Cada filtro de dimensão precisa de valores explícitos.");
  }
}

export function normalizeIneAnnualIndicator(
  fetched: IneFetchResult,
  manifest: IneAnnualIndicatorManifest,
): IneNormalizationResult {
  validateManifest(manifest);
  if (fetched.payload.IndicadorCod !== manifest.indicatorCode || !SHA256.test(fetched.checksum)) {
    throw new IneConnectorError("invalid-schema", "Payload e manifesto não pertencem ao mesmo indicador ou checksum.");
  }
  const source = getMarketSource("ine");
  if (!source) throw new IneConnectorError("invalid-schema", "A fonte INE não existe no source registry.");

  const observations: MarketObservation[] = [];
  const quarantined: IneQuarantinedRow[] = [];
  const ids = new Set<string>();

  for (const periodLabel of Object.keys(fetched.payload.Dados).sort()) {
    const period = annualPeriod(periodLabel);
    const rows = fetched.payload.Dados[periodLabel] ?? [];

    for (const row of rows) {
      if (!matchesDimensions(row, manifest.dimensionFilters)) continue;
      const geographyCode = typeof row.geocod === "string" ? row.geocod : undefined;

      if (!period) {
        quarantined.push({
          period: periodLabel,
          geographyCode,
          reason: "unsupported-period",
          detail: "O conector MI-0 só normaliza períodos anuais explícitos.",
        });
        continue;
      }

      const geographyMapping = geographyCode ? manifest.geographyByCode[geographyCode] : undefined;
      if (!geographyCode || !geographyMapping || typeof row.geodsg !== "string") {
        quarantined.push({
          period: periodLabel,
          geographyCode,
          reason: "unmapped-geography",
          detail: "O código geográfico não existe no manifesto revisto.",
        });
        continue;
      }

      if (geographyMapping.expectedName && geographyMapping.expectedName !== row.geodsg) {
        quarantined.push({
          period: periodLabel,
          geographyCode,
          reason: "geography-name-changed",
          detail: `Esperado «${geographyMapping.expectedName}», recebido «${row.geodsg}».`,
        });
        continue;
      }

      if (row.sinal_conv) {
        quarantined.push({
          period: periodLabel,
          geographyCode,
          reason: "conventional-sign",
          detail: row.sinal_conv_desc || `Sinal convencional ${row.sinal_conv}.`,
        });
        continue;
      }

      if (row.valor === undefined) {
        quarantined.push({
          period: periodLabel,
          geographyCode,
          reason: "missing-value",
          detail: "A linha não contém o campo valor.",
        });
        continue;
      }

      const value = numericValue(row.valor, manifest.decimalSeparator);
      if (value === null) {
        quarantined.push({
          period: periodLabel,
          geographyCode,
          reason: "ambiguous-number",
          detail: `O valor «${String(row.valor)}» não é um número inequívoco.`,
        });
        continue;
      }

      const id = `ine:${manifest.metricId}:${periodLabel}:${geographyCode}`;
      if (ids.has(id)) {
        const previous = observations.findIndex((observation) => observation.id === id);
        if (previous >= 0) observations.splice(previous, 1);
        quarantined.push({
          period: periodLabel,
          geographyCode,
          reason: "duplicate-observation",
          detail: "Mais de uma linha atravessou os filtros; todas foram excluídas desta observação.",
        });
        continue;
      }

      const validUntil = addDaysToIsoDate(period.end, manifest.maxReferenceAgeDays);
      if (!validUntil) throw new IneConnectorError("invalid-schema", "Não foi possível calcular validUntil.");

      observations.push({
        id,
        sourceId: "ine",
        metricId: manifest.metricId,
        value,
        unit: manifest.unit,
        geography: {
          country: "PT",
          level: geographyMapping.level,
          code: geographyCode,
          name: row.geodsg,
          classificationVersion: geographyMapping.classificationVersion,
        },
        classifications: manifest.classifications ?? {},
        referencePeriod: { ...period, label: periodLabel },
        publishedAt:
          fetched.payload.DataUltimoAtualizacao && isValidIsoDate(fetched.payload.DataUltimoAtualizacao)
            ? fetched.payload.DataUltimoAtualizacao
            : undefined,
        retrievedAt: fetched.retrievedAt,
        validUntil,
        methodologyRef: manifest.methodologyRef ?? fetched.payload.MetaInfUrl,
        transform: {
          id: "ine-annual-indicator",
          version: "1",
          description: `Filtro curado de ${Object.keys(manifest.dimensionFilters).sort().join(", ") || "todas as dimensões"}.`,
        },
        license: manifest.datasetLicense ?? {
          status: source.license.status,
          scope: "source",
          identifier: source.license.identifier,
          url: source.license.url,
          attribution: source.license.attribution,
        },
        quality: {
          status: manifest.observationStatus,
          completeness: 1,
          semanticMapping: manifest.semanticMapping,
          flags: [],
        },
        checksum: fetched.checksum,
      });
      ids.add(id);
    }
  }

  return {
    observations: observations.sort((left, right) => left.id.localeCompare(right.id)),
    quarantined,
  };
}
