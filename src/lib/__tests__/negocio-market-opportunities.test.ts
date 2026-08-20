import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  calculateOpportunityFit,
  classifyObservationGeography,
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

const responder = (corpo: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(corpo), { status: 200 })) as unknown as typeof fetch;

describe("market: descoberta e pilotos", () => {
  it("liga o dossier ao estúdio de empresa por um id público curado", () => {
    const discovery = readFileSync("src/components/negocio/DescobrirNegocioStudio.tsx", "utf8");
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

  it("ordena de forma determinística e conserva os cinco dossiers", () => {
    const first = rankOpportunityTemplates(localOperator);
    const second = rankOpportunityTemplates(localOperator);
    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(first[0]?.template.id).toBe("tourism-guest-operations");
  });

  it("cada piloto com ingestão ativa é declarado nos dados, não num id na UI", () => {
    const comPilot = new Set(MARKET_PILOTS.map((pilot) => pilot.templateId));
    for (const template of OPPORTUNITY_TEMPLATES) {
      expect(templateHasLiveEvidence(template)).toBe(comPilot.has(template.id));
    }
    expect(comPilot.size).toBeGreaterThanOrEqual(3);
  });

  it("consulta o INE, publica apenas o dataset licenciado e mantém um único lineage", async () => {
    const fetchImpl = responder(INE_TURISMO);
    const [pilot] = await loadPilotMarketEvidence({
      fetchImpl,
      now: () => "2026-08-20T10:00:00Z",
      pilots: pilotoTurismo,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(pilot.gate.state).toBe("signal_detected");
    expect(pilot.observations).toHaveLength(4);
    expect(pilot.observations.every((item) => item.license.identifier === "CC BY 4.0")).toBe(true);
    expect(pilot.observations.every((item) => item.seriesId === "tourism-occupancy")).toBe(true);
    // O código NUTS I `1` não está mapeado: fica de fora e é contado.
    expect(pilot.note).toContain("1 linhas/células");
    expect(pilot.gate.missing).toContain("Duas fontes independentes e saudáveis.");
  });

  it("publica o piloto Eurostat com a série identificada e sem fundir universos", async () => {
    const fetchImpl = responder(EUROSTAT_DII);
    const [pilot] = await loadPilotMarketEvidence({
      fetchImpl,
      now: () => "2026-08-20T10:00:00Z",
      pilots: pilotoDigital,
    });
    // Duas séries do mesmo dataset ⇒ duas consultas independentes.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(pilot.templateId).toBe("sme-digital-operations");
    // Só a série «micro» coincide com o cubo devolvido pelo duplo mock;
    // a de 10–49 filtra tudo e não inventa um valor.
    const micro = pilot.observations.filter((item) => item.seriesId === "digital-intensity-micro");
    expect(micro).toHaveLength(1);
    expect(micro[0]?.value).toBe(51.65);
    expect(micro[0]?.referencePeriod.label).toBe("2024");
    expect(micro[0]?.seriesLabel).toContain("Microempresas");
    expect(pilot.sourceHealth.map((item) => item.sourceId)).toEqual(["eurostat"]);
  });

  it("duas séries do mesmo inquérito não passam por duas fontes independentes", async () => {
    const [pilot] = await loadPilotMarketEvidence({
      fetchImpl: responder(EUROSTAT_DII),
      now: () => "2026-08-20T10:00:00Z",
      pilots: pilotoDigital,
    });
    expect(pilot.gate.missing).toContain("Duas fontes independentes e saudáveis.");
    expect(pilot.gate.state).not.toBe("evidence_qualified");
  });

  it("não inventa fallback quando a fonte oficial falha", async () => {
    const [pilot] = await loadPilotMarketEvidence({
      fetchImpl: (async () => new Response("indisponível", { status: 503 })) as typeof fetch,
      now: () => "2026-08-20T10:00:00Z",
      pilots: pilotoTurismo,
    });
    expect(pilot.observations).toEqual([]);
    expect(pilot.sourceHealth[0]?.state).toBe("delayed");
    expect(pilot.sourceHealth[0]?.message).toBe(
      "Não foi possível confirmar o dataset oficial nesta execução.",
    );
    expect(pilot.note).toContain("Nenhum valor de fallback");
  });

  it("a falha de um piloto não contamina os outros", async () => {
    let chamada = 0;
    const fetchImpl = (async () => {
      chamada += 1;
      return chamada === 1
        ? new Response("indisponível", { status: 503 })
        : new Response(JSON.stringify(EUROSTAT_DII), { status: 200 });
    }) as typeof fetch;

    const pilots = await loadPilotMarketEvidence({
      fetchImpl,
      now: () => "2026-08-20T10:00:00Z",
      pilots: [...pilotoTurismo, ...pilotoDigital],
    });
    const turismo = pilots.find((item) => item.templateId === "tourism-guest-operations")!;
    const digital = pilots.find((item) => item.templateId === "sme-digital-operations")!;
    expect(turismo.observations).toEqual([]);
    expect(digital.observations.length).toBeGreaterThan(0);
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
