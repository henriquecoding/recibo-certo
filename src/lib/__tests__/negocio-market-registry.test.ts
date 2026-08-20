import { describe, expect, it } from "vitest";
import {
  getMarketSource,
  listMarketSources,
  validateMarketObservation,
  validateMarketSourceDefinition,
  type MarketObservation,
} from "@/lib/negocio/market";

const CHECKSUM = `sha256:${"a".repeat(64)}`;

function observation(sourceId = "dados-gov"): MarketObservation {
  return {
    id: "obs:catalog:2026:pt",
    sourceId,
    metricId: "catalog.datasets",
    value: 123,
    unit: "datasets",
    geography: { country: "PT", level: "country", code: "PT", name: "Portugal" },
    classifications: {},
    referencePeriod: { start: "2026-01-01", end: "2026-06-30" },
    publishedAt: "2026-07-05",
    retrievedAt: "2026-07-06T10:00:00Z",
    validUntil: "2026-12-31",
    license: {
      status: "approved",
      scope: "source",
      url: "https://dados.gov.pt/termos-de-utilizacao",
    },
    quality: { status: "observed", completeness: 1, semanticMapping: "approved", flags: [] },
    checksum: CHECKSUM,
  };
}

describe("market: source registry", () => {
  it("todas as fontes têm contrato, cobertura, licença e HTTPS válidos", () => {
    const sources = listMarketSources();
    expect(sources.map((source) => source.id)).toEqual(["ine", "bpstat", "dados-gov"]);
    for (const source of sources) expect(validateMarketSourceDefinition(source)).toEqual([]);
  });

  it("não trata uma fonte desconhecida como permitida", () => {
    expect(getMarketSource("blog-aleatorio")).toBeUndefined();
  });

  it("mantém INE em revisão jurídica e não o publica por otimismo", () => {
    expect(getMarketSource("ine")?.connectorStatus).toBe("ready");
    expect(getMarketSource("ine")?.license.status).toBe("review_required");

    const ineObservation = observation("ine");
    ineObservation.license = {
      status: "review_required",
      scope: "source",
      url: "https://www.ine.pt/xportal/xmain?xpgid=ine_api_db&xpid=INE",
    };
    const result = validateMarketObservation(ineObservation, {
      asOf: "2026-08-20T12:00:00Z",
      expiringWithinDays: 30,
    });
    expect(result.publishable).toBe(false);
    expect(result.issues.map((item) => item.code)).toContain("license-review");
  });

  it("aceita um registo completo de uma fonte aprovada enquanto está fresco", () => {
    const result = validateMarketObservation(observation(), {
      asOf: "2026-08-20T12:00:00Z",
      expiringWithinDays: 30,
    });
    expect(result.publishable).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("bloqueia semântica por rever, checksum fraco e fonte desconhecida", () => {
    const base = observation("desconhecida");
    const result = validateMarketObservation(
      {
        ...base,
        checksum: "fnv:1234",
        quality: { ...base.quality, semanticMapping: "review_required" },
      },
      { asOf: "2026-08-20", expiringWithinDays: 30 },
    );

    expect(result.publishable).toBe(false);
    expect(result.issues.map((item) => item.code)).toEqual(
      expect.arrayContaining(["unknown-source", "semantic-review", "invalid-checksum"]),
    );
  });
});
