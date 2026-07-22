import { describe, expect, it } from "vitest";
import {
  constrainNumericValue,
  numericDraftOnBlur,
  numericValueToDraft,
  parseNumericDraft,
  sanitizeNumericDraft,
} from "../numeric-input";

describe("numeric-input pt-PT", () => {
  it.each([
    ["0442", "442", 442],
    ["000,50", "0,50", 0.5],
    [",5", "0,5", 0.5],
    ["€ 1.234,56", "1234,56", 1234.56],
    ["1.234", "1234", 1234],
    ["1,234.56", "1234,56", 1234.56],
    ["1 234,5abc", "1234,5", 1234.5],
  ])("normaliza %s sem alterar o valor", (input, draft, value) => {
    expect(sanitizeNumericDraft(input)).toBe(draft);
    expect(parseNumericDraft(input)).toBe(value);
  });

  it("preserva estados transitórios necessários à digitação", () => {
    expect(sanitizeNumericDraft("")).toBe("");
    expect(sanitizeNumericDraft("0,")).toBe("0,");
    expect(parseNumericDraft("0,")).toBe(0);
  });

  it("limita casas decimais e impede valores não finitos", () => {
    expect(sanitizeNumericDraft("12,345", { maxDecimals: 2 })).toBe("12,34");
    expect(constrainNumericValue(Number.POSITIVE_INFINITY, { min: 3 })).toBe(3);
  });

  it("no blur usa fallback para vazio e aplica limites", () => {
    expect(numericDraftOnBlur("", 25, { min: 0, max: 100 })).toEqual({ draft: "25", value: 25 });
    expect(numericDraftOnBlur("999", 25, { min: 0, max: 100 })).toEqual({ draft: "100", value: 100 });
  });

  it("serializa valores internos sem interpretar o ponto decimal como milhares", () => {
    expect(numericValueToDraft(1.234)).toBe("1,23");
    expect(numericValueToDraft(1.005)).toBe("1,01");
    expect(numericValueToDraft(1_234.56)).toBe("1234,56");
    expect(numericDraftOnBlur("", 1.239, { maxDecimals: 2 })).toEqual({ draft: "1,24", value: 1.24 });
  });
});
