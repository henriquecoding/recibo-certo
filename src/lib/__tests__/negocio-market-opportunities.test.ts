import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  calculateOpportunityFit,
  classifyObservationGeography,
  evaluateLocalMarketEvidence,
  loadPilotMarketEvidence,
  MARKET_PILOTS,
  MARKET_REGIONS,
  OPPORTUNITY_TEMPLATES,
  rankOpportunityTemplates,
  seedOpportunityOffer,
  splitObservationsByRegion,
  templateHasLiveEvidence,
  type BusinessDiscoveryProfile,
  type OpportunityTemplate,
} from "@/lib/negocio/market";
import { contextoNegocioVazio } from "@/lib/negocio";

const localOperator: BusinessDiscoveryProfile = {
  structure: "recibos-verdes",
  delivery: "local",
  capital: "ate-500",
  recurrence: "recorrente",
  strengths: ["operacoes", "comercial"],
  region: "grande-lisboa",
};

const pilotoTurismo = MARKET_PILOTS.filter((pilot) => pilot.templateId === "tourism-guest-operations");
const pilotoDigital = MARKET_PILOTS.filter((pilot) => pilot.templateId === "sme-digital-operations");

const INE_TURISMO = [
  {
    IndicadorCod: "0013314",
    IndicadorDsg: "Taxa de ocupação-quarto por localização e tipo; Anual - INE",
    MetaInfUrl: "https://www.ine.pt/xurl/indx/0013314/PT",
    DataUltimoAtualizacao: "2026-07-09",
    UltimoPref: "2025",
    Dados: {
      "2025": [
        { geocod: "PT", geodsg: "Portugal", dim_3: "01", valor: "63.2" },
        { geocod: "1A", geodsg: "Grande Lisboa", dim_3: "01", valor: "73.1" },
        { geocod: "1B", geodsg: "Península de Setúbal", dim_3: "01", valor: "64.9" },
        { geocod: "15", geodsg: "Algarve", dim_3: "01", valor: "60.8" },
        // NUTS I: fora do manifesto de propósito, para não duplicar NUTS II.
        { geocod: "1", geodsg: "Continente", dim_3: "01", valor: "61.3" },
      ],
    },
  },
];

/** Cubo JSON-stat com a forma real de `isoc_e_dii`, reduzido a dois anos. */
const EUROSTAT_DII = {
  class: "dataset",
  updated: "2026-02-27",
  id: ["freq", "size_emp", "nace_r2", "indic_is", "unit", "geo", "time"],
  size: [1, 1, 1, 1, 1, 1, 2],
  dimension: {
    freq: { category: { index: { A: 0 } } },
    size_emp: { category: { index: { "0-9": 0 } } },
    nace_r2: { category: { index: { "C10-S951_X_K": 0 } } },
    indic_is: { category: { index: { E_DI4_GELO: 0 } } },
    unit: { category: { index: { PC_ENT: 0 } } },
    geo: { category: { index: { PT: 0 } } },
    time: { category: { index: { "2023": 0, "2024": 1 } } },
  },
  value: { "0": 48.1, "1": 51.65 },
};

/** Demografia das empresas: operação distinta, e por isso triangula. */
const INE_NASCIMENTOS = [
  {
    IndicadorCod: "0014098",
    IndicadorDsg: "Nascimentos (N.º) de empresas por Localização geográfica (NUTS - 2024) e Forma jurídica; Anual - INE, Demografia das empresas",
    MetaInfUrl: "https://www.ine.pt/xurl/indx/0014098/PT",
    DataUltimoAtualizacao: "2025-12-11",
    UltimoPref: "2024",
    Dados: {
      "2024": [
        { geocod: "PT", geodsg: "Portugal", dim_3: "1", valor: "201033" },
        { geocod: "PT", geodsg: "Portugal", dim_3: "2", valor: "44468" },
        { geocod: "1A", geodsg: "Grande Lisboa", dim_3: "1", valor: "52823" },
        { geocod: "1A", geodsg: "Grande Lisboa", dim_3: "2", valor: "12836" },
        // Concelho: fora do âmbito do manifesto, e não uma rejeição.
        { geocod: "1111601", geodsg: "Arcos de Valdevez", dim_3: "1", valor: "60" },
      ],
    },
  },
];

/**
 * Um mock que responde pelo INDICADOR pedido.
 *
 * Um piloto lê agora várias séries, e mais do que uma fonte. Um mock que
 * devolvesse sempre o mesmo corpo estaria a testar uma coisa que já não
 * existe — e a esconder que o conector rejeita, e bem, um payload cujo
 * `IndicadorCod` não corresponde ao manifesto.
 */
/**
 * O RNAL responde já agregado: uma linha por NUTS II, contada na fonte.
 * O fixture imita isso — nunca linhas individuais, que é registo
 * nominativo e não passa pelo conector nem em teste.
 */
const RNAL_AGREGADO = {
  features: [
    { attributes: { NUTSII: "Grande Lisboa", total: 18121 } },
    { attributes: { NUTSII: "Algarve", total: 44818 } },
  ],
};

const RNAL_NOVOS = {
  features: [
    { attributes: { NUTSII: "Grande Lisboa", total: 634 } },
    { attributes: { NUTSII: "Algarve", total: 3513 } },
  ],
};

/** As duas leituras do RNAL distinguem-se pela cláusula `where` no URL. */
const RNAL_POR_JANELA = Object.freeze({
  DataRegisto: RNAL_NOVOS,
  "where=1%3D1": RNAL_AGREGADO,
});

function responderPorUrl(mapa: Readonly<Record<string, unknown>>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const chave = Object.keys(mapa).find((codigo) => url.includes(codigo));
    if (!chave) return new Response("não mapeado", { status: 404 });
    return new Response(JSON.stringify(mapa[chave]), { status: 200 });
  }) as unknown as typeof fetch;
}

describe("market: descoberta e pilotos", () => {
  it("liga o dossier ao estúdio de empresa por um id público curado", () => {
    const discovery = readFileSync("src/components/negocio/descoberta/Dossier.tsx", "utf8");
    const dashboard = readFileSync("src/app/dashboard/negocio/page.tsx", "utf8");
    const studio = readFileSync("src/components/negocio/NegocioStudio.tsx", "utf8");

    expect(discovery).toContain("/dashboard/negocio?o=");
    expect(discovery).not.toContain('href="/ferramentas/simulador-empresa"');
    expect(dashboard).toContain("OPPORTUNITY_TEMPLATES.find");
    expect(dashboard).toContain("ofertaInicial=");
    expect(studio).toContain("seedOpportunityOffer(base, ofertaInicial)");
  });

  it("entrega a oportunidade ao motor de empresa sem apagar nem duplicar ofertas", () => {
    const base = contextoNegocioVazio("ideia");
    const primeira = seedOpportunityOffer(
      base,
      { cenario: "servico", nome: "Operações locais" },
      () => "2026-08-20T10:00:00Z",
    );
    const repetida = seedOpportunityOffer(
      primeira.contexto,
      { cenario: "servico", nome: "  operações LOCAIS  " },
      () => "2026-08-21T10:00:00Z",
    );

    expect(primeira.created).toBe(true);
    expect(primeira.contexto.ofertas).toHaveLength(1);
    expect(primeira.contexto.meta.criadoEm).toBe(base.meta.criadoEm);
    expect(primeira.contexto.meta.atualizadoEm).toBe("2026-08-20T10:00:00Z");
    expect(repetida.created).toBe(false);
    expect(repetida.contexto).toBe(primeira.contexto);
    expect(repetida.contexto.ofertas).toHaveLength(1);
    expect(repetida.oferta.id).toBe(primeira.oferta.id);
  });

  it("calcula afinidade pessoal sem a apresentar como evidência de mercado", () => {
    const tourism = OPPORTUNITY_TEMPLATES.find((item) => item.id === "tourism-guest-operations")!;
    const fit = calculateOpportunityFit(tourism, localOperator);
    expect(fit.score).toBe(100);
    expect(fit.label).toBe("forte");
    expect(Object.keys(fit)).not.toContain("marketScore");
  });

  it("a zona só penaliza um modelo que dependa mesmo de outro sítio", () => {
    // A regressão que isto tranca: o piloto turístico esteve limitado a
    // duas NUTS II só porque o manifesto começou por mapear duas. Quem
    // escolhesse outra zona perdia pontos por uma limitação NOSSA.
    const tourism = OPPORTUNITY_TEMPLATES.find((item) => item.id === "tourism-guest-operations")!;
    const noAlgarve = calculateOpportunityFit(tourism, { ...localOperator, region: "algarve" });
    const semZona = calculateOpportunityFit(tourism, { ...localOperator, region: "portugal" });
    expect(noAlgarve.score).toBe(calculateOpportunityFit(tourism, localOperator).score);
    expect(semZona.score).toBe(noAlgarve.score);

    const soAcores: OpportunityTemplate = { ...tourism, regions: ["acores"] };
    const fora = calculateOpportunityFit(soAcores, { ...localOperator, region: "algarve" });
    expect(fora.score).toBeLessThan(noAlgarve.score);
    expect(fora.tensions.join(" ")).toContain("Açores");
  });

  it("a copy nunca mostra o identificador interno em vez da palavra", () => {
    // O defeito que isto tranca: os enums são ASCII e estavam a ser
    // interpolados diretamente — «Funciona em modelo hibrido», «Aproveita
    // operacoes». Português de Portugal é inegociável.
    const crus = ["hibrido", "operacoes", "recibos-verdes", "por-decidir", "ate-500", "500-3000", "tecnico"];
    const regioes = MARKET_REGIONS.map((region) => region.id);

    for (const template of OPPORTUNITY_TEMPLATES) {
      for (const region of regioes) {
        for (const delivery of ["local", "remoto", "hibrido"] as const) {
          const fit = calculateOpportunityFit(template, {
            ...localOperator,
            region,
            delivery,
            strengths: ["operacoes", "digital", "tecnico", "cuidado", "comercial"],
          });
          const copy = [...fit.reasons, ...fit.tensions].join(" ");
          for (const cru of crus) {
            expect(copy, `${template.id}/${region}/${delivery}: «${cru}»`).not.toContain(cru);
          }
        }
      }
    }
  });

  it("ordena de forma determinística e publica o empate em vez de o esconder", () => {
    const first = rankOpportunityTemplates(localOperator);
    const second = rankOpportunityTemplates(localOperator);
    expect(first).toEqual(second);
    expect(first).toHaveLength(OPPORTUNITY_TEMPLATES.length);
    expect(first[0]?.template.id).toBe("tourism-guest-operations");

    // `rank` é PARTILHADO: duas hipóteses com o mesmo score recebem a
    // mesma posição, e `tiedWith` diz quantas são. Antes disto, o ecrã
    // numerava 1, 2, 3, 4 quatro cartões com o mesmo valor — uma
    // hierarquia que o modelo não tinha produzido.
    for (const item of first) {
      const mesmoScore = first.filter((outro) => outro.fit.score === item.fit.score);
      expect(item.tiedWith).toBe(mesmoScore.length);
      expect(new Set(mesmoScore.map((outro) => outro.rank)).size).toBe(1);
    }
    // A posição nunca salta para trás nem repete fora de um empate.
    expect(first[0]?.rank).toBe(1);
  });

  it("cada piloto com ingestão ativa é declarado nos dados, não num id na UI", () => {
    const comPilot = new Set(MARKET_PILOTS.map((pilot) => pilot.templateId));
    for (const template of OPPORTUNITY_TEMPLATES) {
      expect(templateHasLiveEvidence(template), template.id).toBe(comPilot.has(template.id));
    }
    // Todo o piloto declarado tem dossier no catálogo — um manifesto órfão
    // seria uma consulta a uma fonte oficial que ninguém chega a ver.
    const ids = new Set(OPPORTUNITY_TEMPLATES.map((template) => template.id));
    for (const templateId of comPilot) expect(ids.has(templateId), templateId).toBe(true);
  });

  it("uma hipótese sem ingestão diz porquê, em vez de fingir que tem", () => {
    // O catálogo cresceu de cinco para vinte e quatro hipóteses e só cinco
    // têm séries ligadas. Isso é aceitável — o que não é aceitável é o
    // silêncio: cada dossier sem ingestão tem de declarar o que existe e
    // o que falta, e o gate mantém-no em «ideia por investigar».
    const comPilot = new Set(MARKET_PILOTS.map((pilot) => pilot.templateId));
    for (const template of OPPORTUNITY_TEMPLATES) {
      expect(template.evidenceNote.trim().length, template.id).toBeGreaterThan(60);
      if (comPilot.has(template.id)) continue;
      expect(
        template.evidencePlan.every((entry) => entry.status !== "live"),
        `${template.id} anuncia uma fonte «live» sem piloto que a leia`,
      ).toBe(true);
      // Sem série ligada não há observação, logo o gate não pode sair de
      // «ideia por investigar» — e nenhuma rota comercial abre por cima.
      const gate = evaluateLocalMarketEvidence({
        template,
        region: "grande-lisboa",
        asOf: "2026-08-22T10:00:00Z",
      });
      expect(gate.state, template.id).toBe("template");
    }
  });

  it("todo o dossier do catálogo está completo o suficiente para decidir", () => {
    for (const template of OPPORTUNITY_TEMPLATES) {
      expect(template.promise.trim().length, template.id).toBeGreaterThan(30);
      expect(template.customer.trim().length, template.id).toBeGreaterThan(30);
      expect(template.problem.trim().length, template.id).toBeGreaterThan(40);
      expect(template.revenueModel.trim().length, template.id).toBeGreaterThan(40);
      expect(template.falsificationTest.trim().length, template.id).toBeGreaterThan(60);
      expect(template.firstCustomerPath.length, template.id).toBeGreaterThanOrEqual(3);
      expect(template.criticalRequirements.length, template.id).toBeGreaterThanOrEqual(2);
      expect(template.evidencePlan.length, template.id).toBeGreaterThanOrEqual(1);
      expect(template.strengths.length, template.id).toBeGreaterThanOrEqual(1);
      expect(template.regions.length, template.id).toBeGreaterThanOrEqual(1);
      expect(template.structures.length, template.id).toBeGreaterThanOrEqual(1);
    }
    // Ids únicos: dois dossiers com o mesmo id partilhariam hipótese
    // guardada, cenário de preço e handoff para o estúdio de empresa.
    expect(new Set(OPPORTUNITY_TEMPLATES.map((template) => template.id)).size).toBe(
      OPPORTUNITY_TEMPLATES.length,
    );
  });

  it("cada série declara a operação estatística que a torna independente", () => {
    for (const pilot of MARKET_PILOTS) {
      for (const series of pilot.series) {
        expect(series.independenceKey.trim(), `${pilot.templateId}/${series.id}`).not.toBe("");
        expect(series.reading.trim().length).toBeGreaterThan(40);
      }
      // Uma hipótese com uma única operação por trás não pode triangular,
      // e o gate tem de continuar a dizê-lo em vez de a promover.
      const operacoes = new Set(pilot.series.map((series) => series.independenceKey));
      const temProcura = pilot.series.some(
        (series) => series.kind === "demand" || series.kind === "transactional",
      );
      if (temProcura) expect(operacoes.size, pilot.templateId).toBeGreaterThan(1);
    }
  });

  it("consulta o INE, publica apenas o dataset licenciado e triangula com outra operação", async () => {
    const fetchImpl = responderPorUrl({ "0013314": INE_TURISMO, "0014098": INE_NASCIMENTOS, ...RNAL_POR_JANELA });
    const [pilot] = await loadPilotMarketEvidence({
      fetchImpl,
      now: () => "2026-08-20T10:00:00Z",
      pilots: pilotoTurismo,
    });

    // Cada observação publica com a licença da SUA série, não com a da
    // fonte: as do INE com a CC BY do dataset, as do RNAL com o regime
    // legal que autoriza a leitura agregada. O que nenhuma pode é
    // publicar sem prova de licença própria.
    expect(
      pilot.observations.every(
        (item) => item.license.status === "approved" && item.license.scope === "dataset",
      ),
    ).toBe(true);
    const doIne = pilot.observations.filter((item) => item.sourceId === "ine");
    expect(doIne.length).toBeGreaterThan(0);
    expect(doIne.every((item) => item.license.identifier === "CC BY 4.0")).toBe(true);
    const ocupacao = pilot.observations.filter((item) => item.seriesId === "tourism-occupancy");
    const nascimentos = pilot.observations.filter((item) => item.seriesId === "tourism-new-companies");
    expect(ocupacao).toHaveLength(4);
    expect(nascimentos).toHaveLength(2);
    // Duas séries do mesmo indicador nunca se somam: o `metricId` separa-as.
    // Quatro métricas: ocupação, nascimentos, stock do RNAL e novos do RNAL.
    expect(new Set(pilot.observations.map((item) => item.metricId)).size).toBe(4);

    // A ocupação vem do inquérito à hotelaria; os nascimentos, da demografia
    // das empresas. São operações diferentes, logo a triangulação é real.
    // Três operações estatísticas distintas: o inquérito à hotelaria, a
    // demografia das empresas e o registo administrativo do RNAL.
    expect(new Set(pilot.observations.map((item) => item.independenceKey)).size).toBe(3);
    expect(pilot.gate.state).toBe("candidate");
    expect(pilot.gate.missing).not.toContain("Duas fontes independentes e saudáveis.");

    // Nem concelhos nem NUTS I contam como rejeição: nunca foram pedidos.
    expect(pilot.note).toBeUndefined();
  });

  it("com preço viável e requisitos conhecidos, a hipótese chega a sustentada por dados", async () => {
    // O que o servidor NÃO pode decidir sozinho: preço e requisitos são de
    // quem decide. Este é o único caminho até `evidence_qualified`.
    const [pilot] = await loadPilotMarketEvidence({
      fetchImpl: responderPorUrl({ "0013314": INE_TURISMO, "0014098": INE_NASCIMENTOS, ...RNAL_POR_JANELA }),
      now: () => "2026-08-20T10:00:00Z",
      pilots: pilotoTurismo,
    });
    const template = OPPORTUNITY_TEMPLATES.find((item) => item.id === "tourism-guest-operations")!;

    const qualificada = evaluateLocalMarketEvidence({
      template,
      evidence: pilot,
      region: "grande-lisboa",
      asOf: "2026-08-20T10:00:00Z",
      hypothesis: {
        templateId: template.id,
        region: "grande-lisboa",
        createdAt: "2026-08-20T10:00:00Z",
        updatedAt: "2026-08-20T10:00:00Z",
        proofs: [],
        requirementsReviewed: true,
        pricing: { viable: true, priceNet: 120, concludedAt: "2026-08-20T10:00:00Z" },
      },
    });
    expect(qualificada.state).toBe("evidence_qualified");
    expect(qualificada.missing).toEqual([]);
  });

  it("publica o piloto Eurostat com a série identificada e sem fundir universos", async () => {
    const [pilot] = await loadPilotMarketEvidence({
      fetchImpl: responderPorUrl({ isoc_e_dii: EUROSTAT_DII, "0014098": INE_NASCIMENTOS }),
      now: () => "2026-08-20T10:00:00Z",
      pilots: pilotoDigital,
    });
    expect(pilot.templateId).toBe("sme-digital-operations");
    // Só a série «micro» coincide com o cubo devolvido; a de 10–49 filtra
    // tudo e não inventa um valor para preencher o espaço.
    const micro = pilot.observations.filter((item) => item.seriesId === "digital-intensity-micro");
    expect(micro).toHaveLength(1);
    expect(micro[0]?.value).toBe(51.65);
    expect(micro[0]?.referencePeriod.label).toBe("2024");
    expect(micro[0]?.seriesLabel).toContain("Microempresas");
    expect(pilot.sourceHealth.map((item) => item.sourceId)).toEqual(["eurostat", "ine"]);
  });

  it("duas séries do mesmo inquérito continuam a valer por uma fonte", async () => {
    // Só a Eurostat responde: as duas séries dela partilham operação, e
    // por isso a triangulação continua a faltar.
    const [pilot] = await loadPilotMarketEvidence({
      fetchImpl: responderPorUrl({ isoc_e_dii: EUROSTAT_DII }),
      now: () => "2026-08-20T10:00:00Z",
      pilots: pilotoDigital,
    });
    expect(new Set(pilot.observations.map((item) => item.independenceKey)).size).toBe(1);
    expect(pilot.gate.missing).toContain("Duas fontes independentes e saudáveis.");
    expect(pilot.gate.state).not.toBe("evidence_qualified");
  });

  it("o mesmo indicador partilhado por vários pilotos é pedido uma só vez", async () => {
    // Três pilotos leem o indicador de demografia das empresas. Um pedido
    // por série dava dez chamadas concorrentes ao INE — que respondia 503 e
    // punha metade dos cartões em `delayed` por culpa nossa.
    const fetchImpl = responderPorUrl({
      "0013314": INE_TURISMO,
      "0014098": INE_NASCIMENTOS,
      isoc_e_dii: EUROSTAT_DII,
      // As duas séries do RNAL partilham o endpoint e distinguem-se pela
      // janela: têm de continuar a ser dois URLs, não um pedido repetido.
      ...RNAL_POR_JANELA,
    });
    await loadPilotMarketEvidence({
      fetchImpl,
      now: () => "2026-08-20T10:00:00Z",
      pilots: [...pilotoTurismo, ...pilotoDigital],
    });
    const urls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((call) =>
      String(call[0]),
    );
    const nascimentos = urls.filter((url) => url.includes("0014098"));
    expect(nascimentos).toHaveLength(1);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("não inventa fallback quando a fonte oficial falha", async () => {
    const [pilot] = await loadPilotMarketEvidence({
      fetchImpl: (async () => new Response("indisponível", { status: 503 })) as typeof fetch,
      now: () => "2026-08-20T10:00:00Z",
      pilots: pilotoTurismo,
    });
    expect(pilot.observations).toEqual([]);
    expect(pilot.gate.state).toBe("template");
    expect(pilot.sourceHealth[0]?.state).toBe("delayed");
    expect(pilot.sourceHealth[0]?.message).toBe(
      "Não foi possível confirmar o dataset oficial nesta execução.",
    );
    expect(pilot.note).toContain("Nenhum valor de fallback");
  });

  it("a falha de uma fonte não contamina o piloto que não depende dela", async () => {
    // O INE recusa tudo; a Eurostat responde. O piloto digital continua a
    // mostrar o que confirmou, e o turístico — que só lê INE — fica vazio.
    const fetchImpl = (async (input: RequestInfo | URL) =>
      String(input).includes("eurostat")
        ? new Response(JSON.stringify(EUROSTAT_DII), { status: 200 })
        : new Response("indisponível", { status: 503 })) as typeof fetch;

    const pilots = await loadPilotMarketEvidence({
      fetchImpl,
      now: () => "2026-08-20T10:00:00Z",
      pilots: [...pilotoTurismo, ...pilotoDigital],
    });
    const turismo = pilots.find((item) => item.templateId === "tourism-guest-operations")!;
    const digital = pilots.find((item) => item.templateId === "sme-digital-operations")!;
    expect(turismo.observations).toEqual([]);
    expect(digital.observations.length).toBeGreaterThan(0);
    expect(digital.sourceHealth.find((item) => item.sourceId === "ine")?.state).toBe("delayed");
    expect(digital.sourceHealth.find((item) => item.sourceId === "eurostat")?.state).toBe("healthy");
  });
});

describe("market: geografia de quem decide", () => {
  it("uma observação nacional serve qualquer zona; uma regional só a sua", () => {
    const nacional = { level: "country" as const, code: "PT" };
    const lisboa = { level: "nuts2" as const, code: "1A" };

    expect(classifyObservationGeography(nacional, "algarve")).toBe("nacional");
    expect(classifyObservationGeography(nacional, "portugal")).toBe("nacional");
    expect(classifyObservationGeography(lisboa, "grande-lisboa")).toBe("local");
    expect(classifyObservationGeography(lisboa, "algarve")).toBe("outra");
    expect(classifyObservationGeography(lisboa, "portugal")).toBe("outra");
  });

  it("a leitura nacional deixou de desaparecer para quem não fixa zona", () => {
    // O defeito real: o filtro comparava o código da observação com `null`
    // e descartava Portugal inteiro, dizendo à pessoa que não havia sinal.
    const observations = [
      { id: "pt", geography: { level: "country" as const, code: "PT" } },
      { id: "1a", geography: { level: "nuts2" as const, code: "1A" } },
      { id: "15", geography: { level: "nuts2" as const, code: "15" } },
    ];

    const semZona = splitObservationsByRegion(observations, "portugal");
    expect(semZona.nacional.map((item) => item.id)).toEqual(["pt"]);
    expect(semZona.local).toHaveLength(0);
    expect(semZona.outras.map((item) => item.id)).toEqual(["1a", "15"]);

    const lisboa = splitObservationsByRegion(observations, "grande-lisboa");
    expect(lisboa.local.map((item) => item.id)).toEqual(["1a"]);
    expect(lisboa.nacional.map((item) => item.id)).toEqual(["pt"]);
    expect(lisboa.outras.map((item) => item.id)).toEqual(["15"]);
  });

  it("as zonas oferecidas são NUTS II com código, sem recolher morada", () => {
    const comCodigo = MARKET_REGIONS.filter((region) => region.nutsCode !== null);
    expect(comCodigo).toHaveLength(9);
    expect(new Set(comCodigo.map((region) => region.nutsCode)).size).toBe(9);
    expect(MARKET_REGIONS.filter((region) => region.nutsCode === null)).toHaveLength(1);
  });
});
