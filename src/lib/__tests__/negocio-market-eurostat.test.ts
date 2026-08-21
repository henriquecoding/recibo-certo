import { describe, expect, it, vi } from "vitest";
import {
  buildEurostatUrl,
  EurostatConnectorError,
  fetchEurostatDataset,
  normalizeEurostatDataset,
  parseEurostatPayload,
  type EurostatDatasetManifest,
} from "@/lib/negocio/market";

const payload = {
  version: "2.0",
  class: "dataset",
  id: ["freq", "unit", "geo", "time"],
  size: [1, 1, 2, 2],
  dimension: {
    freq: { category: { index: { A: 0 } } },
    unit: { category: { index: { PC_ENT: 0 } } },
    geo: { category: { index: { PT: 0, ES: 1 }, label: { PT: "Portugal", ES: "Spain" } } },
    time: { category: { index: { "2024": 0, "2025": 1 } } },
  },
  value: { "0": 67.4, "1": 71.2, "2": 70.1, "3": 72.5 },
  updated: "2026-06-30T12:00:00Z",
};

const manifest: EurostatDatasetManifest = {
  datasetCode: "isoc_e_dii",
  metricId: "enterprise.digital_intensity.basic",
  unit: "% enterprises",
  maxReferenceAgeDays: 730,
  geographyByCode: { PT: { level: "country", name: "Portugal" } },
  dimensionFilters: { freq: ["A"], unit: ["PC_ENT"] },
  observationStatus: "observed",
  semanticMapping: "approved",
};

describe("market: conector Eurostat", () => {
  it("constrói uma query reproduzível e rejeita códigos injetados", () => {
    const url = new URL(buildEurostatUrl("isoc_e_dii", { filters: { geo: ["PT"], time: ["2025"] } }));
    expect(url.origin).toBe("https://ec.europa.eu");
    expect(url.pathname).toContain("/isoc_e_dii");
    expect(url.searchParams.get("geo")).toBe("PT");
    expect(() => buildEurostatUrl("../../segredo")).toThrow(EurostatConnectorError);
  });

  it("valida JSON-stat e normaliza apenas geografia e dimensões manifestadas", () => {
    const result = normalizeEurostatDataset(
      {
        payload: parseEurostatPayload(payload),
        sourceUrl: buildEurostatUrl("isoc_e_dii"),
        retrievedAt: "2026-08-20T10:00:00Z",
        checksum: `sha256:${"c".repeat(64)}`,
      },
      manifest,
    );
    expect(result.quarantined).toHaveLength(2);
    expect(result.quarantined.every((item) => item.reason === "unmapped-geography")).toBe(true);
    expect(result.observations).toHaveLength(2);
    expect(result.observations[1]).toMatchObject({
      id: "eurostat:enterprise.digital_intensity.basic:2025:PT",
      value: 71.2,
      license: { status: "approved" },
      geography: { code: "PT", name: "Portugal" },
    });
  });

  it("faz transporte injetável e preserva checksum do conteúdo bruto", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    const result = await fetchEurostatDataset("isoc_e_dii", {
      fetchImpl: fetchImpl as typeof fetch,
      now: () => "2026-08-20T10:00:00Z",
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
