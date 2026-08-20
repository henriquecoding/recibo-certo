// ═══════════════════════════════════════════════════════════════════════
//  PILOTOS — que série alimenta que hipótese, e com que significado
//  ---------------------------------------------------------------------
//  Um manifesto por SÉRIE, nunca por «tema». Se duas leituras têm
//  universos diferentes — microempresas e pequenas empresas, 65-74 anos e
//  população total — são duas séries, com metricId, unidade e período
//  próprios. Fundi-las num só número seria inventar uma comparação que a
//  fonte não faz.
//
//  A `independenceKey` é a OPERAÇÃO ESTATÍSTICA, não o portal. Duas séries
//  do mesmo inquérito continuam a valer por uma fonte, mesmo quando saem
//  em sítios diferentes. É essa a salvaguarda contra triangulação falsa.
// ═══════════════════════════════════════════════════════════════════════

import type { EurostatDatasetManifest } from "./connectors/eurostat";
import type { IneAnnualIndicatorManifest } from "./connectors/ine";
import type { MarketSignalKind, MarketSourceId } from "./tipos";

/** Portugal e as NUTS II de 2024, como o INE as publica neste indicador. */
const NUTS2_2024: IneAnnualIndicatorManifest["geographyByCode"] = Object.freeze({
  PT: { level: "country", expectedName: "Portugal" },
  "11": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Norte" },
  "15": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Algarve" },
  "19": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Centro" },
  "1A": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Grande Lisboa" },
  "1B": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Península de Setúbal" },
  "1C": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Alentejo" },
  "1D": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Oeste e Vale do Tejo" },
  "20": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Região Autónoma dos Açores" },
  "30": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Região Autónoma da Madeira" },
} as const);

// Os códigos `1`, `2` e `3` (Continente e as duas regiões autónomas ao
// nível NUTS I) ficam DE PROPÓSITO fora do mapa. `2`/`3` repetem valor a
// valor as NUTS II `20`/`30` e contá-los outra vez daria a impressão de
// mais cobertura do que existe. Ficam visíveis na quarentena, não somem.

const TOURISM_DATASET_URL =
  "https://dados.gov.pt/datasets/taxa-de-ocupacao-quarto-nos-estabelecimentos-de-alojamento-turistico";

export const TOURISM_OCCUPANCY_MANIFEST: IneAnnualIndicatorManifest = {
  indicatorCode: "0013314",
  metricId: "tourism.room_occupancy.hotel",
  unit: "%",
  // Inquérito anual: uma edição falhada ainda deixa o valor utilizável
  // como contexto estrutural; duas já não.
  maxReferenceAgeDays: 548,
  geographyByCode: NUTS2_2024,
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

const EUROSTAT_PT_COUNTRY: EurostatDatasetManifest["geographyByCode"] = Object.freeze({
  PT: { level: "country", name: "Portugal" },
} as const);

/** Base comum das duas leituras de intensidade digital (mesmo inquérito). */
const digitalIntensity = (
  metricId: string,
  sizeBand: string,
): EurostatDatasetManifest => ({
  datasetCode: "isoc_e_dii",
  metricId,
  unit: "% de empresas",
  maxReferenceAgeDays: 730,
  geographyByCode: EUROSTAT_PT_COUNTRY,
  dimensionFilters: {
    freq: ["A"],
    unit: ["PC_ENT"],
    nace_r2: ["C10-S951_X_K"],
    indic_is: ["E_DI4_GELO"],
    size_emp: [sizeBand],
  },
  observationStatus: "observed",
  semanticMapping: "approved",
  methodologyRef: "https://ec.europa.eu/eurostat/cache/metadata/en/isoc_e_dii_esmsip2.htm",
});

export const DIGITAL_INTENSITY_MICRO_MANIFEST = digitalIntensity(
  "enterprise.digital_intensity.basic.micro",
  "0-9",
);

export const DIGITAL_INTENSITY_SMALL_MANIFEST = digitalIntensity(
  "enterprise.digital_intensity.basic.small",
  "10-49",
);

/** Base comum das duas leituras de competências digitais das pessoas. */
const digitalSkills = (metricId: string, group: string): EurostatDatasetManifest => ({
  datasetCode: "isoc_sk_dskl_i21",
  metricId,
  unit: "% de pessoas",
  // Série bienal: a validade acompanha a cadência real de publicação.
  maxReferenceAgeDays: 1096,
  geographyByCode: EUROSTAT_PT_COUNTRY,
  dimensionFilters: {
    freq: ["A"],
    unit: ["PC_IND"],
    indic_is: ["I_DSK2_BAB"],
    ind_type: [group],
  },
  observationStatus: "observed",
  semanticMapping: "approved",
  methodologyRef: "https://ec.europa.eu/eurostat/cache/metadata/en/isoc_sk_esms.htm",
});

export const DIGITAL_SKILLS_SENIOR_MANIFEST = digitalSkills(
  "individuals.digital_skills.basic.65_74",
  "Y65_74",
);

export const DIGITAL_SKILLS_TOTAL_MANIFEST = digitalSkills(
  "individuals.digital_skills.basic.total",
  "IND_TOTAL",
);

export type MarketPilotSeriesConnector =
  | { connector: "ine"; manifest: IneAnnualIndicatorManifest }
  | {
      connector: "eurostat";
      manifest: EurostatDatasetManifest;
      /** Filtros enviados ao endpoint, para não descarregar o cubo inteiro. */
      fetchFilters: Readonly<Record<string, readonly string[]>>;
    };

export interface MarketPilotSeries {
  id: string;
  /** Rótulo curto, em pt-PT, do universo que a série mede. */
  label: string;
  /** O que este número diz — e o que continua a não dizer. */
  reading: string;
  sourceId: MarketSourceId;
  kind: MarketSignalKind;
  /** A operação estatística. Republicações partilham-na de propósito. */
  independenceKey: string;
  /** Uma série crítica em falha impede a qualificação do piloto. */
  critical: boolean;
  source: MarketPilotSeriesConnector;
}

export interface MarketPilotDefinition {
  templateId: string;
  datasetUrl: string;
  series: readonly MarketPilotSeries[];
}

export const MARKET_PILOTS: readonly MarketPilotDefinition[] = Object.freeze([
  {
    templateId: "tourism-guest-operations",
    datasetUrl: TOURISM_DATASET_URL,
    series: [
      {
        id: "tourism-occupancy",
        label: "Ocupação-quarto na hotelaria",
        reading:
          "Mede a intensidade da operação hoteleira na zona. Ocupação alta cria picos operacionais; não prova, por si só, que alguém contrata apoio externo.",
        sourceId: "ine",
        kind: "demand",
        independenceKey: "pt-tourism-accommodation-survey",
        critical: true,
        source: { connector: "ine", manifest: TOURISM_OCCUPANCY_MANIFEST },
      },
    ],
  },
  {
    templateId: "sme-digital-operations",
    datasetUrl: "https://ec.europa.eu/eurostat/databrowser/view/isoc_e_dii/default/table?lang=en",
    series: [
      {
        id: "digital-intensity-micro",
        label: "Microempresas (0–9 pessoas)",
        reading:
          "Percentagem de microempresas com pelo menos intensidade digital básica. A distância para as empresas maiores é o défice a investigar — não é procura por consultoria.",
        sourceId: "eurostat",
        kind: "structural",
        independenceKey: "eu-ict-usage-enterprises-survey",
        critical: true,
        source: {
          connector: "eurostat",
          manifest: DIGITAL_INTENSITY_MICRO_MANIFEST,
          fetchFilters: {
            geo: ["PT"],
            // Só as edições recentes: o histórico completo só encheria a
            // quarentena de anos já fora de validade.
            lastTimePeriod: ["3"],
            freq: ["A"],
            unit: ["PC_ENT"],
            indic_is: ["E_DI4_GELO"],
            size_emp: ["0-9"],
          },
        },
      },
      {
        id: "digital-intensity-small",
        label: "Pequenas empresas (10–49 pessoas)",
        reading:
          "O mesmo indicador, na classe seguinte. Serve de termo de comparação dentro do mesmo inquérito — e por isso não conta como segunda fonte independente.",
        sourceId: "eurostat",
        kind: "structural",
        independenceKey: "eu-ict-usage-enterprises-survey",
        critical: false,
        source: {
          connector: "eurostat",
          manifest: DIGITAL_INTENSITY_SMALL_MANIFEST,
          fetchFilters: {
            geo: ["PT"],
            // Só as edições recentes: o histórico completo só encheria a
            // quarentena de anos já fora de validade.
            lastTimePeriod: ["3"],
            freq: ["A"],
            unit: ["PC_ENT"],
            indic_is: ["E_DI4_GELO"],
            size_emp: ["10-49"],
          },
        },
      },
    ],
  },
  {
    templateId: "senior-digital-concierge",
    datasetUrl: "https://ec.europa.eu/eurostat/databrowser/view/isoc_sk_dskl_i21/default/table?lang=en",
    series: [
      {
        id: "digital-skills-senior",
        label: "Pessoas dos 65 aos 74 anos",
        reading:
          "Percentagem com pelo menos competências digitais básicas. Um défice mede barreira de uso; quem paga o acompanhamento costuma ser a família, e isso tem de ser provado à parte.",
        sourceId: "eurostat",
        kind: "structural",
        independenceKey: "eu-ict-usage-households-survey",
        critical: true,
        source: {
          connector: "eurostat",
          manifest: DIGITAL_SKILLS_SENIOR_MANIFEST,
          fetchFilters: {
            geo: ["PT"],
            // Só as edições recentes: o histórico completo só encheria a
            // quarentena de anos já fora de validade.
            lastTimePeriod: ["3"],
            freq: ["A"],
            unit: ["PC_IND"],
            indic_is: ["I_DSK2_BAB"],
            ind_type: ["Y65_74"],
          },
        },
      },
      {
        id: "digital-skills-total",
        label: "População dos 16 aos 74 anos",
        reading:
          "A mesma medida para a população em geral. Existe para dimensionar a diferença, não para a somar.",
        sourceId: "eurostat",
        kind: "structural",
        independenceKey: "eu-ict-usage-households-survey",
        critical: false,
        source: {
          connector: "eurostat",
          manifest: DIGITAL_SKILLS_TOTAL_MANIFEST,
          fetchFilters: {
            geo: ["PT"],
            // Só as edições recentes: o histórico completo só encheria a
            // quarentena de anos já fora de validade.
            lastTimePeriod: ["3"],
            freq: ["A"],
            unit: ["PC_IND"],
            indic_is: ["I_DSK2_BAB"],
            ind_type: ["IND_TOTAL"],
          },
        },
      },
    ],
  },
] as const);
