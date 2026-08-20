import { describe, expect, it } from "vitest";
import {
  evaluateMarketEvidence,
  type MarketEvidenceInput,
  type MarketEvidenceSignal,
  type MarketSourceHealth,
} from "@/lib/negocio/market";

const health = (sourceId: string, state: MarketSourceHealth["state"] = "healthy"): MarketSourceHealth => ({
  sourceId,
  state,
  critical: true,
  checkedAt: "2026-08-20T10:00:00Z",
});

const signal = (
  observationId: string,
  sourceId: string,
  kind: MarketEvidenceSignal["kind"],
  overrides: Partial<MarketEvidenceSignal> = {},
): MarketEvidenceSignal => ({
  observationId,
  sourceId,
  kind,
  freshness: "fresh",
  geographyCompatible: true,
  semanticMapping: "approved",
  critical: true,
  ...overrides,
});

function input(overrides: Partial<MarketEvidenceInput> = {}): MarketEvidenceInput {
  return {
    templateId: "assistencia-digital-local",
    evaluatedAt: "2026-08-20T12:00:00Z",
    signals: [],
    sourceHealth: [],
    economicViability: null,
    criticalRequirements: "pending",
    falsificationTestDefined: false,
    ...overrides,
  };
}

describe("market: evidence gate", () => {
  it("mantém uma ideia sem evidência como template", () => {
    const result = evaluateMarketEvidence(input());
    expect(result.state).toBe("template");
    expect(result.usableObservationIds).toEqual([]);
  });

  it("um único sinal saudável não vira oportunidade", () => {
    const result = evaluateMarketEvidence(
      input({
        signals: [signal("ine:1", "ine", "demand")],
        sourceHealth: [health("ine")],
      }),
    );
    expect(result.state).toBe("signal_detected");
    expect(result.missing).toContain("Duas fontes independentes e saudáveis.");
  });

  it("explica geografia e semântica incompatíveis em vez de apenas baixar o estado", () => {
    const result = evaluateMarketEvidence(
      input({
        signals: [
          signal("ine:demand", "ine", "demand", {
            geographyCompatible: false,
            semanticMapping: "review_required",
            critical: false,
          }),
          signal("bpstat:structure", "bpstat", "structural", { critical: false }),
        ],
        sourceHealth: [
          { ...health("ine"), critical: false },
          { ...health("bpstat"), critical: false },
        ],
      }),
    );
    expect(result.state).toBe("signal_detected");
    expect(result.missing).toEqual(
      expect.arrayContaining([
        "Correspondência geográfica suficiente para o modelo de entrega.",
        "Mapeamento semântico aprovado por curadoria.",
      ]),
    );
  });

  it("duas fontes independentes criam candidata, mas não saltam a economia", () => {
    const result = evaluateMarketEvidence(
      input({
        signals: [
          signal("ine:demand", "ine", "demand"),
          signal("bpstat:structure", "bpstat", "structural"),
        ],
        sourceHealth: [health("ine"), health("bpstat")],
      }),
    );
    expect(result.state).toBe("candidate");
    expect(result.missing).toContain("Viabilidade económica confirmada no motor canónico.");
  });

  it("uma fonte negativa alheia não fabrica independência entre dois sinais da mesma fonte", () => {
    const result = evaluateMarketEvidence(
      input({
        signals: [
          signal("ine:demand", "ine", "demand"),
          signal("ine:structure", "ine", "structural"),
          signal("bpstat:negative", "bpstat", "negative", { critical: false }),
        ],
        sourceHealth: [health("ine"), { ...health("bpstat"), critical: false }],
      }),
    );
    expect(result.state).toBe("signal_detected");
    expect(result.missing).toContain("Duas fontes independentes e saudáveis.");
  });

  it("qualifica apenas procura, sinal independente, economia, requisitos e falsificação", () => {
    const complete = input({
      signals: [
        signal("ine:demand", "ine", "demand"),
        signal("bpstat:structure", "bpstat", "structural"),
      ],
      sourceHealth: [health("ine"), health("bpstat")],
      economicViability: true,
      criticalRequirements: "known",
      falsificationTestDefined: true,
    });
    const first = evaluateMarketEvidence(complete);
    const second = evaluateMarketEvidence(complete);
    expect(first.state).toBe("evidence_qualified");
    expect(first).toEqual(second);
  });

  it("uma fonte crítica stale degrada em vez de inventar um fallback", () => {
    const result = evaluateMarketEvidence(
      input({
        signals: [signal("ine:demand", "ine", "demand")],
        sourceHealth: [health("ine", "stale")],
      }),
    );
    expect(result.state).toBe("stale");
    expect(result.reasons.join(" ")).toContain("fonte crítica");
  });

  it("um piloto pago valida o contexto, mas não prova operação por si só", () => {
    const base = input({
      userValidation: {
        kind: "paid_pilot",
        occurredAt: "2026-08-01",
        validUntil: "2026-12-31",
        repeatTransactions: 1,
        positiveContributionObserved: true,
        paymentsReceived: true,
      },
    });
    expect(evaluateMarketEvidence(base).state).toBe("user_validated");
    expect(
      evaluateMarketEvidence({
        ...base,
        userValidation: { ...base.userValidation!, repeatTransactions: 2 },
      }).state,
    ).toBe("operating");
  });

  it("um piloto expirado cai para a evidência externa atual em vez de a apagar", () => {
    const result = evaluateMarketEvidence(
      input({
        signals: [
          signal("ine:demand", "ine", "demand"),
          signal("bpstat:structure", "bpstat", "structural"),
        ],
        sourceHealth: [health("ine"), health("bpstat")],
        economicViability: true,
        criticalRequirements: "known",
        falsificationTestDefined: true,
        userValidation: {
          kind: "paid_pilot",
          occurredAt: "2024-01-01",
          validUntil: "2024-12-31",
          repeatTransactions: 1,
          positiveContributionObserved: true,
          paymentsReceived: true,
        },
      }),
    );
    expect(result.state).toBe("evidence_qualified");
  });

  it("uma contradição económica explícita vence um score plausível", () => {
    const result = evaluateMarketEvidence(
      input({
        signals: [
          signal("ine:demand", "ine", "demand"),
          signal("bpstat:structure", "bpstat", "structural"),
        ],
        sourceHealth: [health("ine"), health("bpstat")],
        economicViability: false,
      }),
    );
    expect(result.state).toBe("contradicted");
  });
});
