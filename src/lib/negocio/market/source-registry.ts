// ═══════════════════════════════════════════════════════════════════════
//  SOURCE REGISTRY — fontes permitidas, nunca valores de mercado
//  ---------------------------------------------------------------------
//  Este catálogo responde «de onde podemos tentar obter evidência?»; não
//  responde «há uma oportunidade?». Cada dataset/série continua a precisar
//  de mapeamento, licença, período e unidade verificados antes de publicar.
// ═══════════════════════════════════════════════════════════════════════

import type { MarketSourceDefinition, MarketSourceId } from "./tipos";

const SOURCES: Readonly<Record<MarketSourceId, MarketSourceDefinition>> = Object.freeze({
  ine: Object.freeze({
    id: "ine",
    publisher: "Instituto Nacional de Estatística, I.P.",
    access: "api",
    canonicalUrl: "https://www.ine.pt/ine/json_indicador/pindica.jsp",
    documentationUrl: "https://www.ine.pt/xportal/xmain?xpgid=ine_api_db&xpid=INE",
    license: Object.freeze({
      status: "review_required",
      url: "https://www.ine.pt/xportal/xmain?xpgid=ine_api_db&xpid=INE",
      attribution: "Fonte: INE, I.P.",
      storagePolicy: "Não publicar snapshots comerciais até confirmar por escrito os termos aplicáveis à API e à série.",
      reviewNote:
        "A documentação confirma acesso público, mas o registo ainda não contém uma licença inequívoca para reutilização comercial e armazenamento.",
    }),
    expectedCadence: "irregular",
    coverage: Object.freeze({
      countries: Object.freeze(["PT"] as const),
      geographicLevels: Object.freeze(["country", "nuts1", "nuts2", "nuts3", "municipality"] as const),
      notes: "A granularidade e a cadência variam por indicador; o manifesto de cada série tem de as declarar.",
    }),
    parserVersion: "ine-json-indicator@1",
    connectorStatus: "ready",
    allowedUses: Object.freeze(["structural", "conjunctural", "operational"] as const),
    limitations: Object.freeze([
      "A data de extração não substitui o período de referência.",
      "A unidade não é inferida do título; vem de um mapeamento curado da série.",
      "Valores com sinais convencionais ou sem valor numérico ficam em quarentena.",
    ]),
  }),
  bpstat: Object.freeze({
    id: "bpstat",
    publisher: "Banco de Portugal",
    access: "api",
    canonicalUrl: "https://bpstat.bportugal.pt/data/v1/",
    documentationUrl: "https://bpstat.bportugal.pt/data/docs",
    // ── API VERIFICADA EM 2026-08-23 ─────────────────────────────────
    //  Responde sem autenticação, em JSON-stat, e anuncia o limite de
    //  cadência no cabeçalho `X-Throttle: 1000`. O domínio 167
    //  («Empresas da central de balanços») é um PAI e devolve lista
    //  vazia — os dados estão nos filhos: 168 (trimestrais), 169
    //  (anuais) e 178 (por região). Quem escrever o conector tem de
    //  pedir os filhos; pedir o 167 devolve zero e parece uma falha.
    license: Object.freeze({
      status: "review_required",
      url: "https://bpstat.bportugal.pt/data/docs",
      attribution: "Fonte: Banco de Portugal — BPstat",
      storagePolicy: "Conservar apenas séries cuja licença e finalidade tenham sido confirmadas no manifesto.",
      reviewNote:
        "A API responde publicamente e sem chave, mas acesso aberto não é licença: falta o termo escrito de reutilização e armazenamento antes de publicar a primeira série.",
    }),
    expectedCadence: "irregular",
    coverage: Object.freeze({
      countries: Object.freeze(["PT"] as const),
      geographicLevels: Object.freeze(["country", "nuts1", "nuts2", "nuts3"] as const),
      notes:
        "Os conjuntos da central de balanços trazem as dimensões «Território de referência» e «Agregado regional», mas as fatias inspecionadas vinham com Portugal e «não especificado». A granularidade real é por série e tem de ser lida do JSON-stat, nunca assumida.",
    }),
    parserVersion: "bpstat-jsonstat@0",
    connectorStatus: "planned",
    allowedUses: Object.freeze(["structural", "conjunctural", "operational"] as const),
    limitations: Object.freeze([
      "Benchmark setorial não é preço recomendado.",
      "Séries nacionais não provam procura num concelho.",
      "A atividade económica vem em secções largas — «Alojamento e restauração», «Comércio e reparação de veículos» —, muito mais largas do que as divisões da CAE que o motor usa. Cruzar as duas exige um mapeamento curado e declarado.",
      "O domínio 167 é um agregador sem dados próprios: os conjuntos vivem em 168, 169 e 178.",
    ]),
  }),
  "dados-gov": Object.freeze({
    id: "dados-gov",
    publisher: "Agência para a Reforma Tecnológica do Estado, I.P.",
    access: "api",
    canonicalUrl: "https://dados.gov.pt/api/1/",
    documentationUrl: "https://dados.gov.pt/pt/recursos/desenvolvimento/referencia-api",
    license: Object.freeze({
      status: "approved",
      url: "https://dados.gov.pt/termos-de-utilizacao",
      attribution: "Fonte: dados.gov.pt e entidade publicadora identificada no conjunto de dados",
      storagePolicy:
        "O catálogo pode ser consultado; cada recurso exige validação separada da licença declarada pelo respetivo publisher.",
    }),
    expectedCadence: "weekly",
    coverage: Object.freeze({
      countries: Object.freeze(["PT"] as const),
      geographicLevels: Object.freeze([
        "country",
        "nuts1",
        "nuts2",
        "nuts3",
        "district",
        "municipality",
        "parish",
        "custom",
      ] as const),
      notes: "Cobertura, formato, qualidade e frescura pertencem ao recurso, não ao portal como um todo.",
    }),
    parserVersion: "dados-gov-catalog@1+bulk-zip-json@1",
    connectorStatus: "ready",
    allowedUses: Object.freeze(["structural", "conjunctural", "transactional", "operational"] as const),
    limitations: Object.freeze([
      "Estar no catálogo não aprova automaticamente a licença do recurso.",
      "Metadados incompletos ou ligações quebradas ficam em quarentena.",
      "Os recursos em bloco são lidos por um job agendado, não a pedido: o que a aplicação serve é o instantâneo commitado, com a data da extração à vista.",
      "O valor contratual anunciado não é receita provável e não alimenta nenhum número publicado.",
    ]),
  }),
  eurostat: Object.freeze({
    id: "eurostat",
    publisher: "Eurostat — Comissão Europeia",
    access: "api",
    canonicalUrl: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/",
    documentationUrl: "https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started",
    license: Object.freeze({
      status: "approved",
      identifier: "European Commission reuse decision 2011/833/EU",
      url: "https://ec.europa.eu/eurostat/help/copyright-notice",
      attribution: "Fonte: Eurostat",
      storagePolicy:
        "Guardar apenas extratos necessários, com código do dataset, filtros, período, data de recolha e atribuição; excluir recursos com termos específicos incompatíveis.",
    }),
    expectedCadence: "irregular",
    coverage: Object.freeze({
      countries: Object.freeze(["PT"] as const),
      geographicLevels: Object.freeze(["country", "nuts1", "nuts2", "nuts3"] as const),
      notes: "A granularidade depende do dataset. Recursos GISCO não herdam automaticamente esta política.",
    }),
    parserVersion: "eurostat-jsonstat@1",
    connectorStatus: "ready",
    allowedUses: Object.freeze(["structural", "conjunctural", "operational"] as const),
    limitations: Object.freeze([
      "Uma republicação de dados do INE conserva a mesma lineage e não conta como fonte independente.",
      "Os filtros e a ordem das dimensões fazem parte do manifesto reproduzível.",
      "Não usar dados geoespaciais GISCO sem rever os termos específicos.",
    ]),
  }),
  iefp: Object.freeze({
    id: "iefp",
    publisher: "Instituto do Emprego e Formação Profissional, I.P.",
    access: "file",
    canonicalUrl: "https://www.iefp.pt/estatisticas",
    documentationUrl: "https://www.iefp.pt/estatisticas",
    // ── VERIFICADO CONTRA AS FONTES EM 2026-08-23 ────────────────────
    //  O que estava aqui descrevia os ficheiros de iefp.pt. Há um
    //  caminho melhor, e muda a conclusão: a série do IEFP é
    //  republicada pelo INE como indicador 0014470, declarada CC BY no
    //  dados.gov.pt, mensal, com último período «Junho de 2026».
    //
    //  Isso resolve a licença — mas levanta o que interessa mais:
    //  **esse indicador publica SÓ ao país.** A dimensão geográfica tem
    //  exatamente uma categoria (`PT`), verificada no `pindicaMeta`. O
    //  que existe ao concelho é o «SIE — Desemprego registado por
    //  concelhos», e é um PDF mensal, não um recurso legível por
    //  máquina.
    license: Object.freeze({
      status: "approved",
      identifier: "CC BY 4.0",
      url: "https://dados.gov.pt/pt/datasets/desempregados-inscritos-em-centros-de-emprego-do-iefp-movimento-ao-longo-do-mes-n-o/",
      attribution: "Fonte: IEFP, I.P., via INE, I.P. (indicador 0014470)",
      storagePolicy:
        "Só a série republicada pelo INE (0014470) está coberta por esta licença. Os PDF e ODS publicados diretamente em iefp.pt continuam por confirmar e não podem ser republicados.",
    }),
    expectedCadence: "monthly",
    coverage: Object.freeze({
      // `district` estava errado — o registo não tinha nada ao distrito.
      // `municipality` também estaria: é a granularidade do PDF, não a
      // de nada que se consiga ler. O que é legível por máquina é o
      // país, e é isso que este campo tem de dizer, porque é ele que
      // decide se uma série pode responder a uma pergunta local.
      countries: Object.freeze(["PT"] as const),
      geographicLevels: Object.freeze(["country"] as const),
      notes:
        "O indicador 0014470 (INE, dados do IEFP) publica ao país e só ao país — verificado no pindicaMeta, uma única categoria geográfica. O detalhe ao concelho existe apenas no relatório «SIE — Desemprego registado por concelhos», em PDF mensal.",
    }),
    parserVersion: "ine-json-indicator@1",
    connectorStatus: "ready",
    allowedUses: Object.freeze(["conjunctural", "operational"] as const),
    limitations: Object.freeze([
      "Ofertas de emprego não equivalem automaticamente a procura por serviços independentes.",
      "É uma série NACIONAL: não prova procura num concelho nem numa região, e não pode alimentar o eixo da procura, que é local por definição.",
      "Conta desempregados inscritos por localização do CENTRO DE EMPREGO, não por residência de quem se inscreve.",
      "O detalhe ao concelho só existe em PDF; extraí-lo exigiria um parser de PDF mensal, com a licença desses ficheiros ainda por confirmar.",
    ]),
  }),
  "turismo-portugal": Object.freeze({
    id: "turismo-portugal",
    publisher: "Turismo de Portugal, I.P.",
    access: "api",
    canonicalUrl:
      "https://geo.turismodeportugal.pt/server/rest/services/TDP/OpenData_AL/MapServer/6",
    documentationUrl: "https://geo.turismodeportugal.pt/server/rest/services/TDP/OpenData_AL/MapServer",
    license: Object.freeze({
      status: "review_required",
      url: "https://geo.turismodeportugal.pt/server/rest/services/TDP/OpenData_AL/MapServer",
      attribution: "Fonte: Registo Nacional de Alojamento Local (RNAL) — Turismo de Portugal, I.P.",
      storagePolicy:
        "Guardar apenas contagens agregadas por NUTS II. O registo é nominativo — nome, morada e coordenadas de cada unidade — e nada disso pode sair da fonte.",
      reviewNote:
        "A FONTE fica por rever de propósito, e não por falta de investigação. Verificado a 2026-08-22 em quatro autoridades independentes — serviço ArcGIS (sem `copyrightText`), item que o publica (sem `licenseInfo`), catálogo DCAT do portal oficial (`license` vazia nos 53 conjuntos) e dados.gov.pt (`notspecified`) — o Turismo de Portugal não emitiu licença nenhuma. Sem licença emitida aplica-se o regime geral da Lei n.º 26/2016 (red. Lei n.º 68/2021), que autoriza a reutilização comercial (art. 19.º/1), gratuitamente para documentos na Internet (art. 23.º/3-a). MAS o RNAL em bruto é NOMINATIVO, e o art. 20.º/c só permite reutilizar documentos nominativos quando anonimizados sem possibilidade de reversão. Por isso a fonte inteira NÃO é aprovada: só as leituras que agregam do lado do servidor levam licença própria (`datasetLicense` em `pilots.ts`). Uma série futura que leia linhas individuais não herda essa licença e fica retida — que é o comportamento certo.",
    }),
    expectedCadence: "daily",
    coverage: Object.freeze({
      countries: Object.freeze(["PT"] as const),
      geographicLevels: Object.freeze(["nuts2", "nuts3", "municipality"] as const),
      notes:
        "Só Portugal continental: o RNAL nacional não inclui os Açores nem a Madeira, que mantêm registos próprios. Uma série desta fonte nunca pode ser lida como cobertura do país inteiro.",
    }),
    parserVersion: "arcgis-rest-statistics@1",
    connectorStatus: "ready",
    allowedUses: Object.freeze(["structural", "conjunctural", "transactional"] as const),
    limitations: Object.freeze([
      "Conta REGISTOS, não unidades em operação: um alojamento cancelado pode continuar inscrito.",
      "A data de registo tem valores de preenchimento (o mínimo publicado é 1900-01-01); janelas temporais têm de os excluir.",
      "Stock de oferta não é intensidade de concorrência: mede quantos existem, não quanto vendem.",
      "Sem Açores nem Madeira — a ausência de linhas nessas regiões não significa ausência de oferta.",
    ]),
  }),
});

export interface MarketSourceDefinitionIssue {
  field: string;
  message: string;
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function validateMarketSourceDefinition(
  source: MarketSourceDefinition,
): readonly MarketSourceDefinitionIssue[] {
  const issues: MarketSourceDefinitionIssue[] = [];

  if (!source.id.trim()) issues.push({ field: "id", message: "A fonte precisa de um id." });
  if (!source.publisher.trim()) {
    issues.push({ field: "publisher", message: "A entidade publicadora é obrigatória." });
  }
  if (!isHttps(source.canonicalUrl)) {
    issues.push({ field: "canonicalUrl", message: "O endpoint canónico tem de usar HTTPS." });
  }
  if (!isHttps(source.documentationUrl)) {
    issues.push({ field: "documentationUrl", message: "A documentação tem de usar HTTPS." });
  }
  if (!isHttps(source.license.url)) {
    issues.push({ field: "license.url", message: "A política de licença precisa de uma ligação HTTPS." });
  }
  if (!source.license.storagePolicy.trim()) {
    issues.push({ field: "license.storagePolicy", message: "A política de armazenamento é obrigatória." });
  }
  if (source.license.status === "review_required" && !source.license.reviewNote?.trim()) {
    issues.push({ field: "license.reviewNote", message: "Uma licença por rever tem de dizer o que falta." });
  }
  if (source.coverage.countries.length === 0 || source.coverage.geographicLevels.length === 0) {
    issues.push({ field: "coverage", message: "A cobertura geográfica não pode estar vazia." });
  }
  if (!source.parserVersion.trim()) {
    issues.push({ field: "parserVersion", message: "O parser precisa de uma versão reproduzível." });
  }
  if (source.allowedUses.length === 0) {
    issues.push({ field: "allowedUses", message: "A fonte precisa de pelo menos uma finalidade permitida." });
  }

  return issues;
}

export function getMarketSource(id: string): MarketSourceDefinition | undefined {
  return Object.prototype.hasOwnProperty.call(SOURCES, id) ? SOURCES[id as MarketSourceId] : undefined;
}

export function listMarketSources(): readonly MarketSourceDefinition[] {
  return Object.values(SOURCES);
}
