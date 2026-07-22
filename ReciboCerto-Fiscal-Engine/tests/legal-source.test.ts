import { describe, expect, it } from "vitest";
import { LEGAL_SOURCES } from "../src/legal/catalogue";
import { assessLegalSource } from "../src/legal/semantic-check";

describe("assessLegalSource", () => {
  it("aceita uma página que contém as âncoras semânticas esperadas", () => {
    const result = assessLegalSource(LEGAL_SOURCES.circ88, {
      status: 200,
      finalUrl: LEGAL_SOURCES.circ88.url,
      title: "Artigo 88.º",
      text: "Taxas de tributação autónoma. O custo de aquisição excede 62 500 €.",
    });
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it("rejeita uma página HTTP 200 que é semanticamente antiga", () => {
    const result = assessLegalSource(LEGAL_SOURCES.circ88, {
      status: 200,
      finalUrl: "https://info.portaldasfinancas.gov.pt/old",
      title: "CIRC - VERSÃO até 2013",
      text: "Artigo 88.º — outras taxas.",
    });
    expect(result.ok).toBe(false);
    expect(result.failures.join(" ")).toMatch(/Âncora obrigatória ausente/);
    expect(result.failures.join(" ")).toMatch(/Âncora proibida encontrada/);
  });
});
