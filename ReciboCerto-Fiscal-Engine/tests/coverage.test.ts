import { describe, expect, it } from "vitest";
import { DOMAIN_COVERAGE } from "../src/domains/coverage";

describe("domain coverage", () => {
  it("regista todos os dez domínios planeados", () => {
    expect(Object.keys(DOMAIN_COVERAGE)).toHaveLength(10);
  });

  it("não marca qualquer domínio como production antes da migração", () => {
    expect(Object.values(DOMAIN_COVERAGE).every((entry) => entry.state !== "production")).toBe(true);
  });

  it("exige residência e país de fonte no domínio internacional", () => {
    const paths = DOMAIN_COVERAGE.international_income.requiredInputs.map((item) => item.path);
    expect(paths).toEqual(
      expect.arrayContaining(["person.taxResidenceCountry", "income.sourceCountry"]),
    );
  });
});
