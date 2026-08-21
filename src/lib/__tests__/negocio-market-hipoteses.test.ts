import { describe, expect, it } from "vitest";
import {
  addProof,
  evaluateLocalMarketEvidence,
  newHypothesis,
  OPPORTUNITY_TEMPLATES,
  PROOF_VALIDITY_DAYS,
  removeProof,
  summarizeProofs,
  userValidationFrom,
  type MarketHypothesis,
  type MarketObservationSummary,
  type MarketPilotEvidence,
  type MarketProof,
  type MarketProofKind,
} from "@/lib/negocio/market";

const HOJE = "2026-08-20T10:00:00Z";
const TEMPLATE = OPPORTUNITY_TEMPLATES.find((item) => item.id === "tourism-guest-operations")!;

let contador = 0;
function prova(kind: MarketProofKind, occurredAt: string, extra: Partial<MarketProof> = {}): MarketProof {
  contador += 1;
  return { id: `p${contador}`, kind, occurredAt, ...extra };
}

function comProvas(...provas: MarketProof[]): MarketHypothesis {
  return provas.reduce(
    (hipotese, item) => addProof(hipotese, item, () => HOJE),
    newHypothesis(TEMPLATE.id, "grande-lisboa", () => HOJE),
  );
}

function observacao(
  code: string,
  level: MarketObservationSummary["geography"]["level"],
  overrides: Partial<MarketObservationSummary> = {},
): MarketObservationSummary {
  return {
    id: `ine:tourism:2025:${code}`,
    metricId: "tourism.room_occupancy.hotel",
    value: 70,
    unit: "%",
    geography: { country: "PT", level, code, name: code },
    referencePeriod: { start: "2025-01-01", end: "2025-12-31", label: "2025" },
    retrievedAt: HOJE,
    validUntil: "2027-07-02",
    sourceId: "ine",
    license: { status: "approved", scope: "dataset", url: "https://creativecommons.org/licenses/by/4.0/" },
    seriesId: "tourism-occupancy",
    seriesLabel: "Ocupação-quarto",
    reading: "Contexto, não procura paga.",
    independenceKey: "pt-tourism-accommodation-survey",
    kind: "demand",
    critical: true,
    semanticMapping: "approved",
    ...overrides,
  };
}

const EVIDENCIA: MarketPilotEvidence = {
  templateId: TEMPLATE.id,
  checkedAt: HOJE,
  gate: {
    state: "signal_detected",
    label: "Sinal a investigar",
    reasons: [],
    missing: [],
    usableObservationIds: [],
    evaluatedAt: HOJE,
  },
  observations: [observacao("PT", "country"), observacao("1A", "nuts2"), observacao("15", "nuts2")],
  sourceHealth: [{ sourceId: "ine", state: "healthy", critical: true, checkedAt: HOJE }],
};

describe("hipóteses: a prova é de quem vende, e fica no dispositivo", () => {
  it("uma entrevista conta-se, mas nunca promove a hipótese", () => {
    const hipotese = comProvas(prova("interview", "2026-08-01"), prova("interview", "2026-08-10"));

    expect(summarizeProofs(hipotese, HOJE).currentInterviews).toBe(2);
    expect(userValidationFrom(hipotese, HOJE)).toBeUndefined();

    const gate = evaluateLocalMarketEvidence({
      template: TEMPLATE,
      evidence: EVIDENCIA,
      hypothesis: hipotese,
      region: "grande-lisboa",
      asOf: HOJE,
    });
    expect(gate.state).not.toBe("user_validated");
  });

  it("um piloto pago atual valida o mercado da pessoa", () => {
    const hipotese = comProvas(prova("paid_pilot", "2026-07-01", { paymentReceived: true }));
    const gate = evaluateLocalMarketEvidence({
      template: TEMPLATE,
      evidence: EVIDENCIA,
      hypothesis: hipotese,
      region: "grande-lisboa",
      asOf: HOJE,
    });
    expect(gate.state).toBe("user_validated");
    expect(gate.missing.join(" ")).toContain("Repetir vendas");
  });

  it("operação exige repetição, contribuição positiva e recebimento — as três", () => {
    const completa = comProvas(
      prova("sale", "2026-07-01", { paymentReceived: true, positiveContribution: true }),
      prova("sale", "2026-08-01", { paymentReceived: true, positiveContribution: true }),
    );
    expect(
      evaluateLocalMarketEvidence({
        template: TEMPLATE,
        evidence: EVIDENCIA,
        hypothesis: completa,
        region: "grande-lisboa",
        asOf: HOJE,
      }).state,
    ).toBe("operating");

    const semMargem = comProvas(
      prova("sale", "2026-07-01", { paymentReceived: true }),
      prova("sale", "2026-08-01", { paymentReceived: true }),
    );
    expect(
      evaluateLocalMarketEvidence({
        template: TEMPLATE,
        evidence: EVIDENCIA,
        hypothesis: semMargem,
        region: "grande-lisboa",
        asOf: HOJE,
      }).state,
    ).toBe("user_validated");
  });

  it("uma prova expirada degrada em vez de conservar o crédito", () => {
    const antiga = comProvas(prova("paid_pilot", "2025-01-05", { paymentReceived: true }));
    const validacao = userValidationFrom(antiga, HOJE)!;
    expect(validacao.repeatTransactions).toBe(0);
    expect(summarizeProofs(antiga, HOJE).expired).toBe(1);

    const gate = evaluateLocalMarketEvidence({
      template: TEMPLATE,
      evidence: EVIDENCIA,
      hypothesis: antiga,
      region: "grande-lisboa",
      asOf: HOJE,
    });
    expect(gate.state).not.toBe("user_validated");
    expect(gate.state).not.toBe("operating");
  });

  it("uma prova datada no futuro ainda não aconteceu", () => {
    const futura = comProvas(prova("sale", "2026-12-01", { paymentReceived: true }));
    expect(summarizeProofs(futura, HOJE).currentMarketProofs).toBe(0);
    expect(
      evaluateLocalMarketEvidence({
        template: TEMPLATE,
        evidence: EVIDENCIA,
        hypothesis: futura,
        region: "grande-lisboa",
        asOf: HOJE,
      }).state,
    ).not.toBe("user_validated");
  });

  it("a validade da prova é a declarada, não uma qualquer", () => {
    const hipotese = comProvas(prova("sale", "2026-08-20"));
    expect(userValidationFrom(hipotese, HOJE)!.validUntil).toBe("2027-02-16");
    expect(PROOF_VALIDITY_DAYS).toBe(180);
  });

  it("apagar uma prova devolve o mesmo objeto quando nada muda", () => {
    const hipotese = comProvas(prova("interview", "2026-08-01"));
    expect(removeProof(hipotese, "inexistente")).toBe(hipotese);
    expect(removeProof(hipotese, hipotese.proofs[0].id).proofs).toHaveLength(0);
  });
});

describe("gate local: a zona, o preço e a prova que o servidor não conhece", () => {
  it("só entram as observações que servem a zona escolhida", () => {
    const lisboa = evaluateLocalMarketEvidence({
      template: TEMPLATE,
      evidence: EVIDENCIA,
      region: "grande-lisboa",
      asOf: HOJE,
    });
    // Nacional + Grande Lisboa; o Algarve fica de fora sem ser tratado
    // como «evidência incompatível» que ninguém consegue resolver.
    expect(lisboa.usableObservationIds).toHaveLength(2);
    expect(lisboa.missing.join(" ")).not.toContain("Correspondência geográfica");
  });

  it("sem observação nenhuma para a zona, não há sinal — e diz-se", () => {
    const soRegional: MarketPilotEvidence = {
      ...EVIDENCIA,
      observations: [observacao("15", "nuts2")],
    };
    const gate = evaluateLocalMarketEvidence({
      template: TEMPLATE,
      evidence: soRegional,
      region: "grande-lisboa",
      asOf: HOJE,
    });
    expect(gate.usableObservationIds).toHaveLength(0);
    expect(gate.state).toBe("template");
  });

  it("o cenário de preço concluído entra como viabilidade, e a falha contradiz", () => {
    const base = newHypothesis(TEMPLATE.id, "grande-lisboa", () => HOJE);

    const semPreco = evaluateLocalMarketEvidence({
      template: TEMPLATE,
      evidence: EVIDENCIA,
      hypothesis: base,
      region: "grande-lisboa",
      asOf: HOJE,
    });
    expect(semPreco.missing).toContain("Viabilidade económica confirmada no motor canónico.");

    const inviavel = evaluateLocalMarketEvidence({
      template: TEMPLATE,
      evidence: EVIDENCIA,
      hypothesis: { ...base, pricing: { viable: false, priceNet: 10, concludedAt: HOJE } },
      region: "grande-lisboa",
      asOf: HOJE,
    });
    expect(inviavel.state).toBe("contradicted");

    const viavel = evaluateLocalMarketEvidence({
      template: TEMPLATE,
      evidence: EVIDENCIA,
      hypothesis: { ...base, pricing: { viable: true, priceNet: 90, concludedAt: HOJE } },
      region: "grande-lisboa",
      asOf: HOJE,
    });
    expect(viavel.missing).not.toContain("Viabilidade económica confirmada no motor canónico.");
  });

  it("marcar os requisitos como revistos remove esse «falta», e só esse", () => {
    const base = newHypothesis(TEMPLATE.id, "grande-lisboa", () => HOJE);
    const revistos = evaluateLocalMarketEvidence({
      template: TEMPLATE,
      evidence: EVIDENCIA,
      hypothesis: { ...base, requirementsReviewed: true },
      region: "grande-lisboa",
      asOf: HOJE,
    });
    expect(revistos.missing).not.toContain("Requisitos críticos conhecidos.");
    expect(revistos.missing).toContain("Viabilidade económica confirmada no motor canónico.");
  });

  it("sem pack do servidor a hipótese existe, mas não ganha sinal externo", () => {
    const gate = evaluateLocalMarketEvidence({
      template: TEMPLATE,
      region: "grande-lisboa",
      asOf: HOJE,
    });
    expect(gate.state).toBe("template");
    expect(gate.usableObservationIds).toHaveLength(0);
  });
});
