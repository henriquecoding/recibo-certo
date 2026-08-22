// ═══════════════════════════════════════════════════════════════════════
//  CONECTOR RNAL — o primeiro sinal de OFERTA, contado na fonte
//  ---------------------------------------------------------------------
//  Até aqui o motor só tinha sinais de procura, estruturais e de
//  transação. Sem oferta, a pergunta «este mercado já está servido?» não
//  tinha resposta possível — e a regra da casa é que silêncio não é espaço
//  livre: sem sinal, a lacuna de oferta fica «não sabemos», nunca «vazio».
//  O Registo Nacional de Alojamento Local é a primeira fonte pública que
//  permite contar operadores em atividade, por região, sem estimar nada.
//
//  DUAS DECISÕES QUE NÃO SÃO DE PERFORMANCE:
//
//  1. A CONTAGEM É FEITA NA FONTE. O RNAL é um registo NOMINATIVO: nome,
//     morada, código postal e coordenadas de cada alojamento — 111 mil
//     linhas de dados de pessoas concretas. Trazer isso para cá e contar
//     aqui seria construir uma cópia de um ficheiro nominativo para
//     produzir sete números. O ArcGIS agrega do lado dele
//     (`groupByFieldsForStatistics` + `outStatistics`) e o que atravessa a
//     rede são sete pares região/contagem. Não há aqui um caminho de
//     código que descarregue linhas individuais, e é de propósito.
//
//  2. O NOME DA REGIÃO É VERIFICADO, NÃO TRADUZIDO. A camada publica os
//     nomes NUTS II na nomenclatura de 2024 — a mesma que o resto do
//     produto usa. Um nome fora da tabela curada NÃO é ignorado: vai para
//     quarentena. Se o Turismo de Portugal renomear uma região ou passar a
//     incluir os Açores, isso tem de aparecer como aviso e não desaparecer
//     numa contagem silenciosamente mais baixa.
//
//  Endpoint e esquema verificados a 2026-08-22 contra a camada 6 do
//  serviço `TDP/OpenData_AL`: `supportsStatistics: true`,
//  `maxRecordCount: 200000`, campo `NUTSII` presente.
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

export class RnalConnectorError extends Error {
  constructor(
    readonly code:
      | "invalid-manifest"
      | "http-error"
      | "invalid-json"
      | "invalid-schema"
      | "source-error"
      | "checksum-unavailable",
    message: string,
  ) {
    super(message);
    this.name = "RnalConnectorError";
  }
}

/**
 * A janela temporal da contagem. É sempre declarada — nunca inferida do
 * que a fonte por acaso tem.
 *
 * - `instantaneo`: quantos estão inscritos AGORA. Um registo vivo não tem
 *   período de referência publicado; o período é o momento da leitura, e
 *   dizê-lo explicitamente evita fazer passar uma data de extração por
 *   período de referência, que é precisamente o que se proíbe às outras
 *   fontes.
 * - `ultimo-ano-civil-completo`: quantos se inscreveram no último ano que
 *   já fechou. Nunca o ano corrente: um ano a meio compara-se mal com um
 *   ano inteiro, e a diferença lia-se como queda.
 */
export type RnalJanela = "instantaneo" | "ultimo-ano-civil-completo";

export interface RnalGeographyMapping {
  level: GeographyRef["level"];
  code: string;
  classificationVersion: string;
}

export interface RnalManifest {
  metricId: string;
  unit: string;
  janela: RnalJanela;
  /** Campo de agregação na camada. Verificado no esquema, não adivinhado. */
  groupByField: string;
  /** Campo de data usado para recortar a janela. Só para janelas datadas. */
  dateField?: string;
  /**
   * Datas anteriores a isto são preenchimento, não registos.
   *
   * O mínimo publicado em `DataRegisto` é 1900-01-01, em linhas cuja data
   * real ninguém sabe. Uma janela sem piso apanhava-as; com piso, ficam
   * fora — e fica escrito porquê.
   */
  dataMinimaCredivel?: string;
  maxReferenceAgeDays: number;
  /** Nome publicado → geografia. Fora desta tabela é quarentena. */
  geographyByName: Readonly<Record<string, RnalGeographyMapping>>;
  observationStatus: MarketObservationStatus;
  semanticMapping: MarketSemanticMappingStatus;
  methodologyRef?: string;
  classifications?: MarketObservation["classifications"];
  /**
   * A licença desta leitura concreta — não da fonte inteira.
   *
   * É a distinção que o artigo 20.º, al. c) obriga a fazer. O RNAL em
   * bruto é nominativo e NÃO é reutilizável; esta leitura é, porque o
   * que dela sai são contagens por NUTS II, irreversivelmente agregadas.
   * A licença pertence por isso ao manifesto que agrega, e uma série
   * futura que não agregue não a herda.
   */
  datasetLicense?: MarketObservationLicense;
}

export interface RnalStatisticRow {
  regiao: string;
  total: number;
}

export interface RnalFetchResult {
  rows: readonly RnalStatisticRow[];
  sourceUrl: string;
  retrievedAt: string;
  checksum: string;
  /** A janela efetivamente pedida, já resolvida contra o relógio. */
  periodo: { start: string; end: string; label: string };
}

export interface RnalFetchOptions {
  fetchImpl?: typeof fetch;
  now?: () => string;
  signal?: AbortSignal;
}

export interface RnalQuarantinedRow {
  regiao: string;
  reason: "unmapped-geography" | "ambiguous-number" | "duplicate-observation";
  detail: string;
}

export interface RnalNormalizationResult {
  observations: readonly MarketObservation[];
  quarantined: readonly RnalQuarantinedRow[];
}

const METRIC_ID = /^[a-z0-9][a-z0-9._-]*$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/i;
const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/;
const CAMPO_ARCGIS = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateRnalManifest(manifest: RnalManifest): void {
  if (!METRIC_ID.test(manifest.metricId) || !manifest.unit.trim()) {
    throw new RnalConnectorError(
      "invalid-manifest",
      "O manifesto precisa de metricId estável e unidade explícita.",
    );
  }
  if (!CAMPO_ARCGIS.test(manifest.groupByField)) {
    throw new RnalConnectorError("invalid-manifest", "O campo de agregação não é um identificador ArcGIS válido.");
  }
  if (manifest.janela !== "instantaneo") {
    if (!manifest.dateField || !CAMPO_ARCGIS.test(manifest.dateField)) {
      throw new RnalConnectorError("invalid-manifest", "Uma janela datada precisa de um campo de data válido.");
    }
    if (manifest.dataMinimaCredivel && !ISO_DIA.test(manifest.dataMinimaCredivel)) {
      throw new RnalConnectorError("invalid-manifest", "A data mínima credível tem de ser uma data ISO (AAAA-MM-DD).");
    }
  }
  if (!Number.isInteger(manifest.maxReferenceAgeDays) || manifest.maxReferenceAgeDays <= 0) {
    throw new RnalConnectorError("invalid-manifest", "maxReferenceAgeDays tem de ser um inteiro positivo.");
  }
  if (Object.keys(manifest.geographyByName).length === 0) {
    throw new RnalConnectorError("invalid-manifest", "O manifesto precisa de geografias explicitamente mapeadas.");
  }
}

/** A janela resolvida contra o relógio injetado. Nunca contra `Date.now()`. */
export function resolverPeriodo(
  manifest: RnalManifest,
  agora: string,
): { start: string; end: string; label: string } {
  const dia = agora.slice(0, 10);
  if (!ISO_DIA.test(dia)) {
    throw new RnalConnectorError("invalid-schema", "A data de recolha injetada não é ISO 8601 válida.");
  }
  if (manifest.janela === "instantaneo") {
    return { start: dia, end: dia, label: dia };
  }
  const ano = Number(dia.slice(0, 4)) - 1;
  return { start: `${ano}-01-01`, end: `${ano}-12-31`, label: String(ano) };
}

function clausulaWhere(
  manifest: RnalManifest,
  periodo: { start: string; end: string },
): string {
  if (manifest.janela === "instantaneo") return "1=1";
  const campo = manifest.dateField as string;
  const fim = addDaysToIsoDate(periodo.end, 1);
  if (!fim) throw new RnalConnectorError("invalid-schema", "Não foi possível fechar a janela temporal.");
  // O limite inferior é o maior entre o início da janela e o piso de
  // credibilidade: uma janela de 2025 não precisa do piso, mas uma
  // consulta histórica precisaria, e a regra fica escrita uma vez só.
  const inicio =
    manifest.dataMinimaCredivel && manifest.dataMinimaCredivel > periodo.start
      ? manifest.dataMinimaCredivel
      : periodo.start;
  return `${campo} >= DATE '${inicio}' AND ${campo} < DATE '${fim}'`;
}

export function buildRnalStatisticsUrl(
  manifest: RnalManifest,
  periodo: { start: string; end: string },
): string {
  validateRnalManifest(manifest);
  const source = getMarketSource("turismo-portugal");
  if (!source) {
    throw new RnalConnectorError("invalid-schema", "A fonte turismo-portugal não existe no source registry.");
  }

  const url = new URL(`${source.canonicalUrl}/query`);
  url.searchParams.set("where", clausulaWhere(manifest, periodo));
  url.searchParams.set("groupByFieldsForStatistics", manifest.groupByField);
  url.searchParams.set(
    "outStatistics",
    JSON.stringify([
      { statisticType: "count", onStatisticField: "OBJECTID", outStatisticFieldName: "total" },
    ]),
  );
  // Sem geometria e sem linhas: o que se pede é a contagem, e pedir mais
  // do que isso a um registo nominativo seria trazer para cá o que não é
  // preciso para responder à pergunta.
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("returnDistinctValues", "false");
  url.searchParams.set("f", "json");
  return url.toString();
}

export function parseRnalStatistics(raw: unknown, groupByField: string): readonly RnalStatisticRow[] {
  if (!record(raw)) {
    throw new RnalConnectorError("invalid-schema", "A resposta do RNAL não é um objeto JSON.");
  }
  // O ArcGIS devolve HTTP 200 com um erro no corpo. Sem esta guarda, um
  // erro de servidor lia-se como «zero alojamentos» — que é exatamente o
  // género de número inventado que este produto não publica.
  if (record(raw.error)) {
    const detalhe = typeof raw.error.message === "string" ? raw.error.message : "sem mensagem";
    throw new RnalConnectorError("source-error", `O serviço do RNAL devolveu um erro: ${detalhe}`);
  }
  if (!Array.isArray(raw.features)) {
    throw new RnalConnectorError("invalid-schema", "A resposta do RNAL não contém a lista de agregados.");
  }

  const rows: RnalStatisticRow[] = [];
  for (const feature of raw.features) {
    if (!record(feature) || !record(feature.attributes)) {
      throw new RnalConnectorError("invalid-schema", "Um agregado do RNAL não traz atributos.");
    }
    const attributes = feature.attributes;
    const regiao = attributes[groupByField];
    const total = attributes.total;
    if (typeof regiao !== "string" || !regiao.trim()) {
      throw new RnalConnectorError(
        "invalid-schema",
        `O agregado não traz o campo «${groupByField}» como texto — o esquema da camada mudou.`,
      );
    }
    if (typeof total !== "number" || !Number.isInteger(total) || total < 0) {
      throw new RnalConnectorError("invalid-schema", "A contagem agregada não é um inteiro não negativo.");
    }
    rows.push({ regiao: regiao.trim(), total });
  }
  return rows;
}

async function sha256(text: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new RnalConnectorError(
      "checksum-unavailable",
      "Web Crypto é obrigatório; o conector não usa um hash fraco como fallback.",
    );
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

export async function fetchRnalStatistics(
  manifest: RnalManifest,
  options: RnalFetchOptions = {},
): Promise<RnalFetchResult> {
  const retrievedAt = (options.now ?? (() => new Date().toISOString()))();
  if (!isValidIsoDate(retrievedAt)) {
    throw new RnalConnectorError("invalid-schema", "A data de recolha injetada não é ISO 8601 válida.");
  }
  const periodo = resolverPeriodo(manifest, retrievedAt);
  const sourceUrl = buildRnalStatisticsUrl(manifest, periodo);

  const response = await (options.fetchImpl ?? fetch)(sourceUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: options.signal,
  });
  if (!response.ok) {
    throw new RnalConnectorError("http-error", `O serviço do RNAL respondeu com HTTP ${response.status}.`);
  }

  const text = await response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new RnalConnectorError("invalid-json", "O serviço do RNAL não devolveu JSON válido.");
  }

  return {
    rows: parseRnalStatistics(raw, manifest.groupByField),
    sourceUrl,
    retrievedAt,
    checksum: await sha256(text),
    periodo,
  };
}

export function normalizeRnalStatistics(
  fetched: RnalFetchResult,
  manifest: RnalManifest,
): RnalNormalizationResult {
  validateRnalManifest(manifest);
  if (!SHA256.test(fetched.checksum)) {
    throw new RnalConnectorError("invalid-schema", "A leitura não traz um checksum SHA-256 válido.");
  }
  const source = getMarketSource("turismo-portugal");
  if (!source) {
    throw new RnalConnectorError("invalid-schema", "A fonte turismo-portugal não existe no source registry.");
  }

  const validUntil = addDaysToIsoDate(fetched.periodo.end, manifest.maxReferenceAgeDays);
  if (!validUntil) throw new RnalConnectorError("invalid-schema", "Não foi possível calcular validUntil.");

  const observations: MarketObservation[] = [];
  const quarantined: RnalQuarantinedRow[] = [];
  const vistos = new Set<string>();

  for (const row of fetched.rows) {
    const mapping = Object.prototype.hasOwnProperty.call(manifest.geographyByName, row.regiao)
      ? manifest.geographyByName[row.regiao]
      : undefined;

    if (!mapping) {
      // Deliberadamente quarentena e não «fora do âmbito»: aqui o
      // manifesto declara TODAS as regiões que a camada publica. Um nome
      // novo significa que a nomenclatura mudou ou que a cobertura mudou,
      // e as duas coisas têm de ser vistas.
      quarantined.push({
        regiao: row.regiao,
        reason: "unmapped-geography",
        detail: `«${row.regiao}» não consta da tabela NUTS curada — a nomenclatura ou a cobertura da fonte mudou.`,
      });
      continue;
    }

    const id = `turismo-portugal:${manifest.metricId}:${fetched.periodo.label}:${mapping.code}`;
    if (vistos.has(id)) {
      const anterior = observations.findIndex((observation) => observation.id === id);
      if (anterior >= 0) observations.splice(anterior, 1);
      quarantined.push({
        regiao: row.regiao,
        reason: "duplicate-observation",
        detail: "Mais de um agregado apontou para a mesma região; todos foram excluídos desta observação.",
      });
      continue;
    }

    observations.push({
      id,
      sourceId: "turismo-portugal",
      metricId: manifest.metricId,
      value: row.total,
      unit: manifest.unit,
      geography: {
        country: "PT",
        level: mapping.level,
        code: mapping.code,
        name: row.regiao,
        classificationVersion: mapping.classificationVersion,
      },
      classifications: manifest.classifications ?? {},
      referencePeriod: { ...fetched.periodo },
      retrievedAt: fetched.retrievedAt,
      validUntil,
      methodologyRef: manifest.methodologyRef,
      transform: {
        id: "rnal-arcgis-statistics",
        version: "1",
        description:
          manifest.janela === "instantaneo"
            ? `Contagem de registos por ${manifest.groupByField}, agregada pelo serviço de origem.`
            : `Contagem de registos com ${manifest.dateField} em ${fetched.periodo.label}, agregada pelo serviço de origem.`,
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
    vistos.add(id);
  }

  return {
    observations: observations.sort((left, right) => left.id.localeCompare(right.id)),
    quarantined,
  };
}
