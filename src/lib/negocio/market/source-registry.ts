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
    license: Object.freeze({
      status: "review_required",
      url: "https://bpstat.bportugal.pt/data/docs",
      attribution: "Fonte: Banco de Portugal — BPstat",
      storagePolicy: "Conservar apenas séries cuja licença e finalidade tenham sido confirmadas no manifesto.",
      reviewNote: "Confirmar termos de reutilização e armazenamento antes de publicar a primeira série.",
    }),
    expectedCadence: "irregular",
    coverage: Object.freeze({
      countries: Object.freeze(["PT"] as const),
      geographicLevels: Object.freeze(["country", "nuts1", "nuts2", "nuts3"] as const),
      notes: "A cobertura depende da série; muitos indicadores são nacionais ou setoriais, não locais.",
    }),
    parserVersion: "bpstat-jsonstat@0",
    connectorStatus: "planned",
    allowedUses: Object.freeze(["structural", "conjunctural", "operational"] as const),
    limitations: Object.freeze([
      "Benchmark setorial não é preço recomendado.",
      "Séries nacionais não provam procura num concelho.",
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
    license: Object.freeze({
      status: "review_required",
      url: "https://www.iefp.pt/estatisticas",
      attribution: "Fonte: IEFP, I.P.",
      storagePolicy: "Ler para investigação; não republicar extratos até a licença do ficheiro estar confirmada.",
      reviewNote:
        "Os relatórios mensais e ficheiros ODS estão acessíveis, mas falta uma licença inequívoca de reutilização comercial por recurso.",
    }),
    expectedCadence: "monthly",
    coverage: Object.freeze({
      countries: Object.freeze(["PT"] as const),
      geographicLevels: Object.freeze(["country", "nuts2", "district"] as const),
      notes: "Os relatórios mensais incluem ofertas por região e atividade; o manifesto deve fixar a folha e as colunas.",
    }),
    parserVersion: "iefp-ods@0",
    connectorStatus: "planned",
    allowedUses: Object.freeze(["conjunctural", "transactional", "operational"] as const),
    limitations: Object.freeze([
      "Ofertas de emprego não equivalem automaticamente a procura por serviços independentes.",
      "Alterações de folhas/colunas ficam em quarentena.",
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
