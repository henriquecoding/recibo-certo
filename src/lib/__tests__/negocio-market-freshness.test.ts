import { describe, expect, it } from "vitest";
import {
  addDaysToIsoDate,
  classifyObservationFreshness,
  effectiveReferenceAgeDays,
  isValidIsoDate,
  parseIsoDate,
  type MarketObservation,
} from "@/lib/negocio/market";

function clocks(
  overrides: Partial<Pick<MarketObservation, "referencePeriod" | "retrievedAt" | "validUntil">> = {},
) {
  return {
    referencePeriod: { start: "2024-01-01", end: "2024-12-31" },
    retrievedAt: "2026-08-20T10:00:00Z",
    validUntil: "2025-12-31",
    ...overrides,
  };
}

describe("market: frescura", () => {
  it("recolher hoje não rejuvenesce um período antigo", () => {
    expect(classifyObservationFreshness(clocks(), "2026-08-20T12:00:00Z", 30)).toBe("stale");
    expect(effectiveReferenceAgeDays(clocks(), "2026-08-20T12:00:00Z")).toBeGreaterThan(590);
  });

  it("distingue fresh de expiring e considera validUntil inclusivo", () => {
    const current = clocks({
      referencePeriod: { start: "2026-01-01", end: "2026-06-30" },
      validUntil: "2026-09-01",
    });
    expect(classifyObservationFreshness(current, "2026-07-01", 30)).toBe("fresh");
    expect(classifyObservationFreshness(current, "2026-08-20", 30)).toBe("expiring");
    expect(classifyObservationFreshness(current, "2026-09-01T23:59:59Z", 0)).toBe("expiring");
    expect(classifyObservationFreshness(current, "2026-09-02", 0)).toBe("stale");
  });

  it("rejeita datas ambíguas, impossíveis e timestamps sem timezone", () => {
    expect(isValidIsoDate("20/08/2026")).toBe(false);
    expect(isValidIsoDate("2026-02-31")).toBe(false);
    expect(isValidIsoDate("2026-08-20T10:00:00")).toBe(false);
    expect(parseIsoDate("2024-02-29")).not.toBeNull();
  });

  it("soma dias apenas a datas civis válidas", () => {
    expect(addDaysToIsoDate("2025-12-31", 730)).toBe("2027-12-31");
    expect(addDaysToIsoDate("2026-08-20T10:00:00Z", 10)).toBeNull();
    expect(addDaysToIsoDate("2026-08-20", 1.5)).toBeNull();
  });

  it("não esconde períodos ou validade incoerentes", () => {
    expect(
      classifyObservationFreshness(
        clocks({
          referencePeriod: { start: "2026-12-31", end: "2026-01-01" },
          validUntil: "2026-12-31",
        }),
        "2026-08-20",
        30,
      ),
    ).toBe("invalid");
  });
});
