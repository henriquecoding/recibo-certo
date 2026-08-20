import { describe, expect, it } from "vitest";
import {
  assessMarketEconomics,
  buildMarketSnapshot,
  quarantineMarketObservations,
  type MarketObservation,
} from "@/lib/negocio/market";
import { cenarioPorChave, precificar } from "@/lib/pricing";

const observation: MarketObservation = {
  id: "eurostat:test:2025:PT",
  sourceId: "eurostat",
  metricId: "test.metric",
  value: 10,
  unit: "%",
  geography: { country: "PT", level: "country", code: "PT", name: "Portugal" },
  classifications: {},
  referencePeriod: { start: "2025-01-01", end: "2025-12-31" },
  retrievedAt: "2026-08-20T10:00:00Z",
  validUntil: "2027-12-31",
  license: {
    status: "approved",
    scope: "source",
    url: "https://ec.europa.eu/eurostat/help/copyright-notice",
  },
  quality: { status: "observed", completeness: 1, semanticMapping: "approved", flags: [] },
  checksum: `sha256:${"d".repeat(64)}`,
};

describe("market: pipeline auditável", () => {
  it("separa dados inválidos sem os corrigir", () => {
    const bad = { ...observation, id: "bad", checksum: "fraco" };
    const report = quarantineMarketObservations([bad, observation], {
      asOf: "2026-08-20T12:00:00Z",
      expiringWithinDays: 30,
    });
    expect(report.accepted.map((item) => item.id)).toEqual([observation.id]);
    expect(report.quarantined[0]?.issues.map((item) => item.code)).toContain("invalid-checksum");
  });

  it("assina o mesmo manifesto de forma determinística", async () => {
    const base = {
      id: "pt-2026-08-20",
      generatedAt: "2026-08-20T12:00:00Z",
      geography: observation.geography,
      observations: [observation],
      sourceHealth: [{ sourceId: "eurostat", state: "healthy" as const, critical: true, checkedAt: "2026-08-20" }],
      formulaVersions: ["pricing-market-adapter@1"],
      signingKey: "segredo-de-teste-com-entropia",
    };
    const first = await buildMarketSnapshot(base);
    const second = await buildMarketSnapshot(base);
    expect(first).toEqual(second);
    expect(first.manifestHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(first.signature).toMatch(/^hmac-sha256:[a-f0-9]{64}$/);
  });

  it("obtém viabilidade apenas do resultado do Pricing Engine", () => {
    const assessment = assessMarketEconomics(precificar(cenarioPorChave("servico").contexto()));
    expect(assessment.engine).toBe("pricing");
    expect(assessment.formulaVersion).toBe("pricing-market-adapter@1");
    expect(assessment.viable).toBe(true);
    expect(assessment.priceNet).toBeGreaterThan(0);
  });
});
