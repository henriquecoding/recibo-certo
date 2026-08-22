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

import { METRICAS_EM_BLOCO } from "./bulk/fontes";
import type { EurostatDatasetManifest } from "./connectors/eurostat";
import type { IneAnnualIndicatorManifest } from "./connectors/ine";
import type { RnalManifest } from "./connectors/rnal";
import type { MarketSignalKind, MarketSourceId } from "./tipos";

/** A página do conjunto de dados do Portal BASE no dados.gov.pt. */
const BASE_CONTRACTS_DATASET_URL =
  "https://dados.gov.pt/pt/datasets/contratos-publicos-portal-base-impic-contratos-de-2012-a-2026/";

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

/** Licença publicada no dados.gov.pt para estes datasets do INE. */
const INE_CC_BY: IneAnnualIndicatorManifest["datasetLicense"] = Object.freeze({
  status: "approved",
  scope: "dataset",
  identifier: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/",
  attribution: "Fonte: INE, I.P. — dataset publicado no dados.gov.pt",
} as const);

// ── Demografia das empresas ──────────────────────────────────────────
//  Operação estatística distinta do inquérito às TIC e do inquérito à
//  permanência de hóspedes. É essa distinção — e não o portal onde sai —
//  que permite triangular sem inventar independência.
//
//  O corte por forma jurídica é o que este produto pergunta todos os dias:
//  quantas pessoas abriram como empresa individual e quantas como
//  sociedade, na zona de quem está a decidir.

const businessBirths = (metricId: string, formaJuridica: string): IneAnnualIndicatorManifest => ({
  indicatorCode: "0014098",
  metricId,
  unit: "empresas",
  // Série anual publicada com cerca de um ano de desfasamento (2024 saiu
  // em dezembro de 2025). Dois anos de validade cobrem uma edição falhada
  // sem deixar passar uma série verdadeiramente abandonada.
  maxReferenceAgeDays: 730,
  geographyByCode: NUTS2_2024,
  dimensionFilters: { dim_3: [formaJuridica] },
  decimalSeparator: ".",
  observationStatus: "observed",
  semanticMapping: "approved",
  methodologyRef: "https://www.ine.pt/xurl/indx/0014098/PT",
  datasetLicense: INE_CC_BY,
});

export const BUSINESS_BIRTHS_SOLE_TRADER_MANIFEST = businessBirths(
  "business.births.sole_trader",
  "1",
);

export const BUSINESS_BIRTHS_COMPANY_MANIFEST = businessBirths("business.births.company", "2");

export const AGEING_INDEX_MANIFEST: IneAnnualIndicatorManifest = {
  indicatorCode: "0012909",
  metricId: "population.ageing_index",
  unit: "idosos por 100 jovens",
  maxReferenceAgeDays: 730,
  geographyByCode: NUTS2_2024,
  // Este indicador não tem dimensões além da geografia: o filtro vazio é
  // a declaração explícita disso, e não um esquecimento.
  dimensionFilters: {},
  decimalSeparator: ".",
  observationStatus: "estimated",
  semanticMapping: "approved",
  methodologyRef: "https://www.ine.pt/xurl/indx/0012909/PT",
  datasetLicense: INE_CC_BY,
};

export const HOUSING_TRANSACTIONS_MANIFEST: IneAnnualIndicatorManifest = {
  indicatorCode: "0012787",
  metricId: "housing.transactions.households",
  unit: "transações",
  maxReferenceAgeDays: 730,
  geographyByCode: NUTS2_2024,
  //  dim_3 = H1 (todas as categorias), dim_4 = T (qualquer domicílio
  //  fiscal do comprador), dim_5 = S1400000 (Famílias).
  //  Restringir a famílias é deliberado: uma compra por fundo ou empresa
  //  não é uma casa a mudar de mãos de uma família para outra, e é isso
  //  que cria a transição que esta hipótese propõe coordenar.
  dimensionFilters: { dim_3: ["H1"], dim_4: ["T"], dim_5: ["S1400000"] },
  decimalSeparator: ".",
  observationStatus: "observed",
  semanticMapping: "approved",
  methodologyRef: "https://www.ine.pt/xurl/indx/0012787/PT",
  datasetLicense: INE_CC_BY,
};

export const SMALL_EMPLOYERS_MANIFEST: IneAnnualIndicatorManifest = {
  indicatorCode: "0014044",
  metricId: "business.employment.micro",
  unit: "pessoas ao serviço",
  maxReferenceAgeDays: 730,
  geographyByCode: NUTS2_2024,
  //  `1` e `11` são ambos «Menos de 10 pessoas» e trazem o mesmo valor.
  //  Escolher um é obrigatório: deixar os dois passar fazia o conector
  //  detetar um duplicado e — corretamente — excluir os DOIS.
  dimensionFilters: { dim_3: ["1"] },
  decimalSeparator: ".",
  observationStatus: "observed",
  semanticMapping: "approved",
  methodologyRef: "https://www.ine.pt/xurl/indx/0014044/PT",
  datasetLicense: INE_CC_BY,
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

// ── RNAL — ligado, a contar, e retido à porta da licença ────────────
//
// O conector está escrito, testado e verificado contra o serviço a
// funcionar: 111 512 alojamentos locais, sete NUTS II, zero linhas em
// quarentena de dados. O que falta não é código — é uma licença.
//
// Verificado a 2026-08-22 em QUATRO autoridades independentes, todas a
// dizerem o mesmo:
//  · o serviço ArcGIS não declara licença nem `copyrightText`;
//  · o item ArcGIS que o publica não tem `licenseInfo` nem
//    `accessInformation`;
//  · o catálogo DCAT do portal oficial de dados abertos do Turismo de
//    Portugal declara `license: ""` e `rights: null` — nos 53 conjuntos,
//    não só neste;
//  · a entrada no dados.gov.pt («Estabelecimentos de Alojamento Local»,
//    publicada pelo próprio Turismo de Portugal) declara
//    `license: notspecified`.
//
// As séries FICAM LIGADAS na mesma, e é essa a diferença. Com a fonte em
// `review_required`, `validateMarketObservation` retém as observações — e
// faz bem, nada se publica sem licença. Mas a fonte passa a declarar-se
// em `license_review` em vez de `quarantined`, ou seja: «os dados estão
// íntegros, o que falta é a papelada». Quem lê o cartão fica a saber que
// a contagem existe, de onde vem e o que a está a segurar, em vez de
// nunca ter sabido que ela existia.
//
// No dia em que o Turismo de Portugal confirmar os termos por escrito,
// acrescenta-se `datasetLicense` aqui — como as séries do INE já fazem —
// e os números aparecem sem mais nada mudar.
//
// A camada publica o nome da NUTS II, não o código. A tabela abaixo é a
// ponte, e é EXAUSTIVA para o que a fonte cobre: um nome que não esteja
// aqui vai para quarentena, porque significa que a nomenclatura mudou ou
// que a cobertura mudou — e nenhuma das duas coisas pode desaparecer numa
// contagem silenciosamente diferente.
//
// Não há Açores nem Madeira: o RNAL nacional é do continente, e as duas
// regiões autónomas mantêm registos próprios. A ausência de linhas nessas
// regiões NÃO é ausência de alojamento local — é ausência de fonte, e é
// por isso que nenhuma hipótese açoriana ou madeirense pode receber sinal
// de oferta a partir daqui.
const NUTS2_RNAL: RnalManifest["geographyByName"] = Object.freeze({
  Norte: { level: "nuts2", code: "11", classificationVersion: "NUTS 2024" },
  Algarve: { level: "nuts2", code: "15", classificationVersion: "NUTS 2024" },
  Centro: { level: "nuts2", code: "19", classificationVersion: "NUTS 2024" },
  "Grande Lisboa": { level: "nuts2", code: "1A", classificationVersion: "NUTS 2024" },
  "Península de Setúbal": { level: "nuts2", code: "1B", classificationVersion: "NUTS 2024" },
  Alentejo: { level: "nuts2", code: "1C", classificationVersion: "NUTS 2024" },
  "Oeste e Vale do Tejo": { level: "nuts2", code: "1D", classificationVersion: "NUTS 2024" },
} as const);

/** O RNAL como página pública, para quem quiser conferir a contagem. */
export const RNAL_DATASET_URL = "https://registos.turismodeportugal.pt/HomePage/RNAL";

const RNAL_METODOLOGIA =
  "https://geo.turismodeportugal.pt/server/rest/services/TDP/OpenData_AL/MapServer/6";

/**
 * Quantos alojamentos locais estão INSCRITOS, por região.
 *
 * É o stock de oferta — quantos operadores existem, não quanto vendem. A
 * validade é curta de propósito: o registo é atualizado diariamente e uma
 * contagem de há um mês já não descreve o mercado de hoje.
 */
export const RNAL_STOCK_MANIFEST: RnalManifest = {
  metricId: "tourism.local_accommodation.registered",
  unit: "alojamentos registados",
  janela: "instantaneo",
  groupByField: "NUTSII",
  maxReferenceAgeDays: 30,
  geographyByName: NUTS2_RNAL,
  // `observed` e não `estimated`: é uma contagem de registos administrativos,
  // não uma amostra nem uma projeção. O que a contagem NÃO garante — que o
  // alojamento esteja em funcionamento — está declarado nas limitações da
  // fonte, não escondido num estado de qualidade mais fraco.
  observationStatus: "observed",
  semanticMapping: "approved",
  methodologyRef: RNAL_METODOLOGIA,
  classifications: { cae: ["I55201"] },
};

/**
 * Quantos alojamentos locais se INSCREVERAM no último ano civil fechado.
 *
 * É o fluxo, não o stock: diz se a oferta ainda está a crescer na região.
 * O piso de credibilidade existe porque o campo tem preenchimento a
 * 1900-01-01 em linhas cuja data real ninguém publicou.
 */
export const RNAL_NOVOS_MANIFEST: RnalManifest = {
  metricId: "tourism.local_accommodation.new_registrations",
  unit: "novos registos por ano",
  janela: "ultimo-ano-civil-completo",
  groupByField: "NUTSII",
  dateField: "DataRegisto",
  dataMinimaCredivel: "1990-01-01",
  // Um ano civil fechado continua a descrever o ritmo de entrada durante o
  // ano seguinte inteiro; a partir daí já fechou outro e este envelheceu.
  maxReferenceAgeDays: 450,
  geographyByName: NUTS2_RNAL,
  observationStatus: "observed",
  semanticMapping: "approved",
  methodologyRef: RNAL_METODOLOGIA,
  classifications: { cae: ["I55201"] },
};

export type MarketPilotSeriesConnector =
  | { connector: "ine"; manifest: IneAnnualIndicatorManifest }
  | {
      connector: "eurostat";
      manifest: EurostatDatasetManifest;
      /** Filtros enviados ao endpoint, para não descarregar o cubo inteiro. */
      fetchFilters: Readonly<Record<string, readonly string[]>>;
    }
  | { connector: "rnal"; manifest: RnalManifest }
  | {
      /**
       * Série lida de um instantâneo commitado, não da rede.
       *
       * A fonte são 52 MB comprimidos com um quarto de milhão de registos:
       * não se lê a pedido, nem numa rota que revalida de seis em seis
       * horas. `scripts/ingerir-mercado.mjs` lê-a fora do produto e deixa
       * as contagens no repositório; aqui só se escolhe qual delas usar.
       */
      connector: "bulk";
      snapshotId: string;
      metricId: string;
    };

export interface MarketPilotSeries {
  id: string;
  /** Rótulo curto, em pt-PT, do universo que a série mede. */
  label: string;
  /** O que este número diz — e o que continua a não dizer. */
  reading: string;
  sourceId: MarketSourceId;
  /**
   * A regra que decide o `kind`, para não ser escolhido ao sabor do que
   * daria melhor estado:
   *
   *  · `demand`       — mede a intensidade da própria necessidade;
   *  · `transactional`— conta eventos reais registados que criam a
   *                     necessidade (uma empresa que nasce, uma casa que
   *                     muda de mãos);
   *  · `structural`   — stock, composição ou capacidade do universo;
   *  · `supply`       — quantos operadores JÁ SERVEM esta hipótese.
   *
   * `supply` é a leitura mais fácil de errar, e o erro é caro. A pergunta
   * que decide não é «isto conta operadores?» mas «operadores de QUÊ?»:
   * uma contagem de alojamentos locais é oferta para quem quer abrir um
   * alojamento e é PROCURA para quem quer limpá-los. Contar clientes como
   * rivais dizia a alguém que o mercado está cheio no preciso momento em
   * que lhe estávamos a mostrar a lista de clientes.
   *
   * Por isso o `kind` pertence ao par (série, piloto) e não à série: o
   * mesmo manifesto pode entrar em dois pilotos com leituras diferentes,
   * e é o piloto que declara qual.
   *
   * Nenhum deles prova disposição a pagar. É por isso que nenhum destes
   * sinais, sozinho ou acompanhado, chega a `user_validated`.
   */
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
      {
        id: "tourism-new-companies",
        label: "Sociedades nascidas na zona",
        reading:
          "Conta sociedades constituídas no último ano, de todos os setores. Serve para dimensionar quantos operadores novos aparecem por ano; não diz quantos são alojamento nem quantos precisam de apoio operacional.",
        sourceId: "ine",
        kind: "transactional",
        independenceKey: "pt-business-demography",
        critical: false,
        source: { connector: "ine", manifest: BUSINESS_BIRTHS_COMPANY_MANIFEST },
      },
      {
        id: "tourism-al-stock",
        label: "Alojamentos locais registados na zona",
        // ── Porque é `demand` e não `supply` ────────────────────────
        //  A tentação era classificar isto como oferta: é uma contagem de
        //  operadores, e o motor não tem nenhuma. Mas a hipótese aqui é
        //  PRESTAR SERVIÇO a alojamentos locais — limpezas, check-ins,
        //  gestão de reservas. Nessa hipótese os 44 818 alojamentos do
        //  Algarve não são a concorrência: são a lista de clientes
        //  possíveis. Lê-los como oferta dizia a quem procura negócio que
        //  o mercado já está servido, contando os futuros clientes dela
        //  como se fossem rivais — a inferência falsa mais cara que este
        //  ficheiro podia produzir.
        //
        //  O mesmo número seria oferta para quem quisesse ABRIR um
        //  alojamento local. Essa hipótese não existe no produto, e o dia
        //  em que existir declara este manifesto outra vez, com o `kind`
        //  que essa leitura exigir. O `kind` é da leitura, não da série.
        reading:
          "Conta os alojamentos locais inscritos no registo nacional. Para quem presta serviço a alojamentos, é a dimensão do universo de clientes possíveis na zona — não é a concorrência, e não diz quantos desses alojamentos contratam apoio externo nem quanto pagam. Conta registos, não unidades em funcionamento. Só o continente: os Açores e a Madeira têm registos próprios.",
        sourceId: "turismo-portugal",
        kind: "demand",
        independenceKey: "pt-rnal-registry",
        // Não crítica, e é deliberado: enquanto a licença não estiver
        // confirmada esta série não publica número nenhum, e uma série
        // crítica retida impediria a hipótese de turismo de qualificar —
        // ou seja, acrescentar uma fonte pioraria o cartão.
        critical: false,
        source: { connector: "rnal", manifest: RNAL_STOCK_MANIFEST },
      },
      {
        id: "tourism-al-new",
        label: "Alojamentos locais inscritos no último ano fechado",
        reading:
          "Conta as inscrições novas do último ano civil completo. Serve para distinguir um universo de clientes que ainda está a crescer de um que já estabilizou; uma inscrição não é uma abertura, e os cancelamentos não são descontados.",
        sourceId: "turismo-portugal",
        kind: "transactional",
        independenceKey: "pt-rnal-registry",
        critical: false,
        source: { connector: "rnal", manifest: RNAL_NOVOS_MANIFEST },
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
      {
        id: "sme-new-sole-traders",
        label: "Empresas individuais nascidas na zona",
        reading:
          "Cada nascimento é um negócio novo a montar processos do zero — o momento em que este serviço faz mais sentido. Conta registos reais, não intenções; e nascer não é precisar de ajuda paga.",
        sourceId: "ine",
        kind: "transactional",
        independenceKey: "pt-business-demography",
        critical: true,
        source: { connector: "ine", manifest: BUSINESS_BIRTHS_SOLE_TRADER_MANIFEST },
      },
      {
        id: "sme-new-companies",
        label: "Sociedades nascidas na zona",
        reading:
          "A mesma operação estatística, na outra forma jurídica. Uma sociedade nova costuma ter mais processos a organizar do que uma empresa individual — e mais orçamento para o fazer.",
        sourceId: "ine",
        kind: "transactional",
        independenceKey: "pt-business-demography",
        critical: false,
        source: { connector: "ine", manifest: BUSINESS_BIRTHS_COMPANY_MANIFEST },
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
      {
        id: "senior-ageing-index",
        label: "Índice de envelhecimento da zona",
        reading:
          "Idosos por cada 100 jovens, na zona escolhida. Dimensiona quantas pessoas podem precisar de acompanhamento; não diz nada sobre quem paga por ele — e quem paga costuma ser a família.",
        sourceId: "ine",
        kind: "structural",
        independenceKey: "pt-population-estimates",
        critical: false,
        source: { connector: "ine", manifest: AGEING_INDEX_MANIFEST },
      },
    ],
  },
  {
    templateId: "public-tender-support",
    datasetUrl: BASE_CONTRACTS_DATASET_URL,
    series: [
      {
        id: "tender-open-procedures",
        label: "Procedimentos abertos à concorrência",
        reading:
          "Contratos de serviços e bens que a zona celebrou por procedimento publicitado — concurso público, concurso limitado, diálogo concorrencial. É por aqui que alguém de fora entra: ajuste direto, consulta prévia e chamadas ao abrigo de acordo-quadro não contam, porque nenhuma delas é uma porta aberta. Uma porta aberta também não é um cliente.",
        sourceId: "dados-gov",
        kind: "transactional",
        independenceKey: "pt-public-procurement-base",
        critical: true,
        source: {
          connector: "bulk",
          snapshotId: "contratos-publicos",
          metricId: METRICAS_EM_BLOCO.procedimentosAbertos,
        },
      },
      {
        id: "tender-service-contracts",
        label: "Contratos de serviços e bens celebrados",
        reading:
          "Todos os contratos de serviços e bens da zona, incluindo os por ajuste direto. Dimensiona o volume total de compras públicas; a maior parte não passou por concurso, e por isso este número não mede oportunidade de entrada — mede o mercado que existe.",
        sourceId: "dados-gov",
        kind: "transactional",
        independenceKey: "pt-public-procurement-base",
        critical: false,
        source: {
          connector: "bulk",
          snapshotId: "contratos-publicos",
          metricId: METRICAS_EM_BLOCO.contratosDeServicos,
        },
      },
      {
        id: "tender-small-employers",
        label: "Pessoas ao serviço em empresas com menos de 10",
        reading:
          "Dimensiona o universo de empresas pequenas capazes de entregar, na zona. É o lado da oferta — quantas já existem para disputar estes contratos —, e não prova que alguma delas pague por ajuda a concorrer.",
        sourceId: "ine",
        kind: "structural",
        independenceKey: "pt-integrated-business-accounts",
        critical: true,
        source: { connector: "ine", manifest: SMALL_EMPLOYERS_MANIFEST },
      },
      {
        id: "tender-new-companies",
        label: "Sociedades nascidas na zona",
        reading:
          "Renovação anual do tecido de sociedades. Uma sociedade nova é candidata a concorrer; candidatar-se não é o mesmo que precisar de quem lhe organize o dossier.",
        sourceId: "ine",
        kind: "transactional",
        independenceKey: "pt-business-demography",
        critical: false,
        source: { connector: "ine", manifest: BUSINESS_BIRTHS_COMPANY_MANIFEST },
      },
    ],
  },
  {
    templateId: "home-transition-operations",
    datasetUrl: "https://dados.gov.pt/pt/datasets/?q=transa%C3%A7%C3%B5es+de+alojamentos+familiares",
    series: [
      {
        id: "home-transactions",
        label: "Casas transacionadas por famílias",
        reading:
          "Cada transação é uma casa a mudar de mãos entre famílias — o evento que cria a transição. Exclui compras por empresas e fundos de propósito. Não distingue mudança, herança ou redução de casa.",
        sourceId: "ine",
        kind: "transactional",
        independenceKey: "pt-housing-transactions",
        critical: true,
        source: { connector: "ine", manifest: HOUSING_TRANSACTIONS_MANIFEST },
      },
      {
        id: "home-ageing-index",
        label: "Índice de envelhecimento da zona",
        reading:
          "Contexto demográfico das transições ligadas a herança e redução de casa. É estrutura, não procura: envelhecer não faz ninguém contratar coordenação.",
        sourceId: "ine",
        kind: "structural",
        independenceKey: "pt-population-estimates",
        critical: false,
        source: { connector: "ine", manifest: AGEING_INDEX_MANIFEST },
      },
    ],
  },
] as const);
