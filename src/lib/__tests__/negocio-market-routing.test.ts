import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  confiancaDaHipotese,
  newHypothesis,
  sinaisDaHipotese,
  type BusinessDiscoveryProfile,
  type MarketEvidenceGateResult,
  type MarketOpportunityState,
} from "@/lib/negocio/market";
import { escolherRota } from "@/lib/routing";

const PERFIL: BusinessDiscoveryProfile = {
  structure: "por-decidir",
  delivery: "hibrido",
  capital: "ate-500",
  recurrence: "indiferente",
  strengths: ["operacoes"],
  region: "grande-lisboa",
};

function gate(
  state: MarketOpportunityState,
  usableObservationIds: string[] = ["obs-1"],
): MarketEvidenceGateResult {
  return {
    state,
    label: state,
    reasons: [],
    missing: [],
    usableObservationIds,
    evaluatedAt: "2026-08-20T10:00:00Z",
  };
}

const rotaDe = (
  state: MarketOpportunityState,
  perfil: BusinessDiscoveryProfile = PERFIL,
  hipotese?: Parameters<typeof sinaisDaHipotese>[2],
) => escolherRota(sinaisDaHipotese(gate(state), perfil, hipotese));

describe("descoberta: a hierarquia dos CTAs não pertence ao ecrã", () => {
  it("uma hipótese sem evidência não abre rota comercial nenhuma", () => {
    // A regressão que isto tranca: o cartão tinha dois links do mesmo peso
    // escolhidos à mão, e mostrava-os sobre qualquer ideia do catálogo —
    // incluindo uma que o motor nunca sustentou.
    for (const state of ["template", "stale", "contradicted"] as const) {
      expect(confiancaDaHipotese(gate(state))).toBe("fora_de_escopo");
      expect(rotaDe(state).rota, state).toBe("sem_parceiro");
    }
  });

  it("uma hipótese contrariada nunca é monetizada, mesmo com venda registada", () => {
    const comVenda = {
      ...newHypothesis("tourism-guest-operations", "grande-lisboa", () => "2026-08-01T00:00:00Z"),
      proofs: [{ id: "p1", kind: "sale" as const, occurredAt: "2026-08-01" }],
    };
    expect(rotaDe("contradicted", PERFIL, comVenda).rota).toBe("sem_parceiro");
  });

  it("sem observação utilizável nem prova, não há resultado a encaminhar", () => {
    const sinais = sinaisDaHipotese(gate("candidate", []), PERFIL, undefined);
    expect(sinais.temResultado).toBe(false);
    expect(escolherRota(sinais).rota).toBe("sem_parceiro");
  });

  it("quem pensa em empresa vai para julgamento profissional, não para execução", () => {
    expect(rotaDe("candidate", { ...PERFIL, structure: "empresa" }).rota).toBe("contabilista");
  });

  it("quem pensa em recibos verdes vai para execução no escopo", () => {
    expect(rotaDe("candidate", { ...PERFIL, structure: "recibos-verdes" }).rota).toBe("fiz");
  });

  it("uma venda registada torna o caso profissional, seja qual for a preferência", () => {
    // Já houve dinheiro em cima da mesa: deixou de ser uma ideia e passou
    // a ser uma atividade a precisar de enquadramento a sério.
    const comVenda = {
      ...newHypothesis("tourism-guest-operations", "grande-lisboa", () => "2026-08-01T00:00:00Z"),
      proofs: [{ id: "p1", kind: "sale" as const, occurredAt: "2026-08-01" }],
    };
    expect(rotaDe("user_validated", { ...PERFIL, structure: "recibos-verdes" }, comVenda).rota).toBe(
      "contabilista",
    );
  });

  it("«quero comparar» não escolhe a estrutura pela pessoa", () => {
    const sinais = sinaisDaHipotese(gate("candidate"), PERFIL, undefined);
    expect(sinais.enquadramento).toBe("desconhecido");
  });

  it("o ecrã não inventa CTAs: a rota vem sempre de escolherRota", () => {
    const studio = readFileSync("src/components/negocio/DescobrirNegocioStudio.tsx", "utf8");
    expect(studio).toContain("escolherRota(sinaisDaHipotese(");
    expect(studio).toContain('if (rota.rota === "sem_parceiro") return null;');
    // Uma só ação principal: a segunda passou a ligação de texto.
    const principais = studio.match(/btn-shine/g) ?? [];
    expect(principais).toHaveLength(1);
  });
});

describe("descoberta: a medição existe e não leva nada privado", () => {
  const medicao = readFileSync("src/components/negocio/medicao-descoberta.ts", "utf8");

  it("reutiliza o vocabulário do catálogo em vez de inventar eventos", () => {
    for (const evento of ["simulator_start", "simulator_step", "simulator_complete", "result_view"]) {
      expect(medicao).toContain(`registar("${evento}"`);
    }
    expect(medicao).toContain('tool_id: FERRAMENTA_DESCOBERTA');
  });

  it("nunca envia zona, competências, capital nem a hipótese", () => {
    // A barreira de `pii.ts` recusaria valores, mas não conhece a
    // combinação zona + hipótese + data de venda — que identifica alguém
    // num concelho pequeno. A regra é anterior à barreira.
    for (const proibido of ["profile.region", "profile.strengths", "profile.capital", "templateId"]) {
      expect(medicao, proibido).not.toContain(proibido);
    }
  });

  it("o estúdio liga mesmo a medição", () => {
    const studio = readFileSync("src/components/negocio/DescobrirNegocioStudio.tsx", "utf8");
    expect(studio).toContain("useMedicaoDescoberta({");
    expect(studio).toContain("registarProvaGuardada()");
  });
});
