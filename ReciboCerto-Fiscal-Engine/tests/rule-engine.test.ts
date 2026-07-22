import { describe, expect, it } from "vitest";
import { createFiscalRuleEngine } from "../src";
import { INTERNATIONAL_INCOME_SCOPE_RULE } from "../src/domains/international-scope";
import type { EvaluationContext } from "../src/core/model";

const context: EvaluationContext = {
  asOf: "2026-07-22",
  taxYear: 2026,
  jurisdiction: "PT-CONTINENTE",
};

const brazilIncome = {
  person: { taxResidenceCountry: "PT" },
  income: {
    sourceCountry: "BR",
    category: "independent_services",
    grossAmountCents: 1_000_000,
    currency: "BRL",
    receiptDate: "2026-05-20",
    foreignTaxPaidCents: 100_000,
  },
};

describe("FiscalRuleEngine", () => {
  it("recusa o dataset draft por defeito", () => {
    const result = createFiscalRuleEngine().evaluate(
      INTERNATIONAL_INCOME_SCOPE_RULE,
      brazilIncome,
      context,
    );
    expect(result.status).toBe("unsupported");
    if (result.status === "unsupported") {
      expect(result.reasons.join(" ")).toMatch(/não está aprovado/);
    }
  });

  it("devolve needs_input em desenvolvimento e identifica o campo", () => {
    const incomplete = {
      ...brazilIncome,
      income: { ...brazilIncome.income, currency: "" },
    };
    const result = createFiscalRuleEngine().evaluate(
      INTERNATIONAL_INCOME_SCOPE_RULE,
      incomplete,
      { ...context, allowUnapprovedDataset: true },
    );
    expect(result.status).toBe("needs_input");
    if (result.status === "needs_input") {
      expect(result.missing.map((item) => item.path)).toContain("income.currency");
    }
  });

  it("encaminha rendimento brasileiro pela lei portuguesa e CDT", () => {
    const result = createFiscalRuleEngine().evaluate(
      INTERNATIONAL_INCOME_SCOPE_RULE,
      brazilIncome,
      { ...context, allowUnapprovedDataset: true },
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value.governingJurisdiction).toBe("PT");
      expect(result.value.route).toBe("PORTUGAL_BRAZIL_TREATY");
      expect(result.value.portugueseReturnAnnex).toBe("J");
      expect(result.value.normativeSourceIds).toEqual(
        expect.arrayContaining(["pt.at.cirs.81", "pt.dr.cdt.portugal-brasil"]),
      );
      expect(result.warnings.map((warning) => warning.code)).toContain("SCOPE_ONLY");
    }
  });

  it("não tenta calcular a obrigação de um não residente fora do âmbito", () => {
    const result = createFiscalRuleEngine().evaluate(
      INTERNATIONAL_INCOME_SCOPE_RULE,
      { ...brazilIncome, person: { taxResidenceCountry: "BR" } },
      { ...context, allowUnapprovedDataset: true },
    );
    expect(result.status).toBe("unsupported");
  });
});
