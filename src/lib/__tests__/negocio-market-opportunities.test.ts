import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  calculateOpportunityFit,
  loadPilotMarketEvidence,
  OPPORTUNITY_TEMPLATES,
  rankOpportunityTemplates,
  seedOpportunityOffer,
  type BusinessDiscoveryProfile,
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
    const outsidePilot = calculateOpportunityFit(tourism, {
      ...localOperator,
      region: "outra-portugal",
    });
    expect(outsidePilot.score).toBeLessThan(fit.score);
    expect(outsidePilot.tensions.join(" ")).toContain("sinal local");
  });

  it("ordena de forma determinística e conserva os cinco dossiers", () => {
    const first = rankOpportunityTemplates(localOperator);
    const second = rankOpportunityTemplates(localOperator);
    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(first[0]?.template.id).toBe("tourism-guest-operations");
  });

  it("consulta o INE, publica apenas o dataset licenciado e mantém um único lineage", async () => {
    const raw = [
      {
        IndicadorCod: "0013314",
        IndicadorDsg: "Taxa líquida de ocupação-quarto por localização e tipo; Anual - INE",
        MetaInfUrl: "https://www.ine.pt/xurl/indx/0013314/PT",
        DataUltimoAtualizacao: "2026-07-09",
        UltimoPref: "2025",
        Dados: {
          "2025": [
            { geocod: "PT", geodsg: "Portugal", dim_3: "01", valor: "63.2" },
            { geocod: "1A", geodsg: "Grande Lisboa", dim_3: "01", valor: "73.1" },
            { geocod: "1B", geodsg: "Península de Setúbal", dim_3: "01", valor: "64.9" },
          ],
        },
      },
    ];
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(raw), { status: 200 }));
    const [pilot] = await loadPilotMarketEvidence({
      fetchImpl: fetchImpl as typeof fetch,
      now: () => "2026-08-20T10:00:00Z",
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(pilot.gate.state).toBe("signal_detected");
    expect(pilot.observations).toHaveLength(3);
    expect(pilot.observations.every((item) => item.license.identifier === "CC BY 4.0")).toBe(true);
    expect(pilot.gate.missing).toContain("Duas fontes independentes e saudáveis.");
  });

  it("não inventa fallback quando a fonte oficial falha", async () => {
    const [pilot] = await loadPilotMarketEvidence({
      fetchImpl: (async () => new Response("indisponível", { status: 503 })) as typeof fetch,
      now: () => "2026-08-20T10:00:00Z",
    });
    expect(pilot.observations).toEqual([]);
    expect(pilot.sourceHealth[0]?.state).toBe("delayed");
    expect(pilot.sourceHealth[0]?.message).toBe(
      "Não foi possível confirmar o dataset oficial nesta execução.",
    );
    expect(pilot.note).toContain("Nenhum valor de fallback");
  });
});
