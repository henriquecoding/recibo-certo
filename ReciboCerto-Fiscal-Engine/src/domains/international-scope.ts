import type { FiscalRule } from "../core/model";
import { LEGAL_SOURCES } from "../legal/catalogue";

export interface InternationalIncomeScopeInput {
  person: {
    taxResidenceCountry: string;
  };
  income: {
    sourceCountry: string;
    category: string;
    grossAmountCents: number;
    currency: string;
    receiptDate: string;
    foreignTaxPaidCents: number;
  };
}

export interface InternationalIncomeScopeResult {
  governingJurisdiction: "PT";
  route: "PORTUGUESE_DOMESTIC" | "PORTUGUESE_FOREIGN_INCOME" | "PORTUGAL_BRAZIL_TREATY";
  portugueseReturnAnnex: "J" | "DOMAIN_SPECIFIC";
  normativeSourceIds: readonly string[];
  note: string;
}

export const INTERNATIONAL_INCOME_SCOPE_RULE: FiscalRule<
  InternationalIncomeScopeInput,
  InternationalIncomeScopeResult
> = {
  id: "pt.international-income.scope.v1",
  domain: "international_income",
  version: "1.0.0",
  effective: { from: "2026-01-01", to: "2026-12-31" },
  jurisdictions: ["PT-CONTINENTE", "PT-MADEIRA", "PT-ACORES"],
  citations: [LEGAL_SOURCES.cirs81.id, LEGAL_SOURCES.cdtPortugalBrasil.id],
  requirements: [
    { path: "person.taxResidenceCountry", reason: "Determinar residência fiscal." },
    { path: "income.sourceCountry", reason: "Determinar país de fonte." },
    { path: "income.category", reason: "Classificar segundo o CIRS." },
    { path: "income.grossAmountCents", reason: "Determinar rendimento bruto.", expected: "integer cents" },
    { path: "income.currency", reason: "Determinar conversão para EUR." },
    { path: "income.receiptDate", reason: "Determinar período e câmbio." },
    { path: "income.foreignTaxPaidCents", reason: "Avaliar crédito de dupla tributação.", expected: "integer cents" },
  ],
  evaluate(input) {
    if (input.person.taxResidenceCountry.toUpperCase() !== "PT") {
      return {
        kind: "unsupported",
        reasons: [
          "Este motor calcula obrigações de residentes fiscais abrangidos pelo sistema português; a residência indicada não é Portugal.",
        ],
      };
    }

    const sourceCountry = input.income.sourceCountry.toUpperCase();
    if (sourceCountry === "PT") {
      return {
        kind: "ok",
        value: {
          governingJurisdiction: "PT",
          route: "PORTUGUESE_DOMESTIC",
          portugueseReturnAnnex: "DOMAIN_SPECIFIC",
          normativeSourceIds: [],
          note: "Rendimento de fonte portuguesa; encaminhar para o domínio CIRS correspondente.",
        },
        trace: [
          {
            id: "scope.source-country",
            label: "Classificação do país de fonte",
            formula: "sourceCountry = PT",
            result: "PORTUGUESE_DOMESTIC",
            citations: [],
          },
        ],
      };
    }

    const isBrazil = sourceCountry === "BR";
    const sourceIds = isBrazil
      ? [LEGAL_SOURCES.cirs81.id, LEGAL_SOURCES.cdtPortugalBrasil.id]
      : [LEGAL_SOURCES.cirs81.id];
    return {
      kind: "ok",
      value: {
        governingJurisdiction: "PT",
        route: isBrazil ? "PORTUGAL_BRAZIL_TREATY" : "PORTUGUESE_FOREIGN_INCOME",
        portugueseReturnAnnex: "J",
        normativeSourceIds: sourceIds,
        note: isBrazil
          ? "O rendimento é calculado segundo o CIRS e a CDT Portugal–Brasil; o imposto brasileiro é apenas input para o crédito/limite aplicável."
          : "O rendimento é calculado segundo o CIRS e a convenção celebrada por Portugal, quando aplicável.",
      },
      trace: [
        {
          id: "scope.foreign-income",
          label: "Encaminhamento de rendimento estrangeiro",
          formula: "residence = PT AND sourceCountry != PT",
          operands: [
            { name: "taxResidenceCountry", value: "PT", unit: "TEXT" },
            { name: "sourceCountry", value: sourceCountry, unit: "TEXT" },
          ],
          result: isBrazil ? "PORTUGAL_BRAZIL_TREATY" : "PORTUGUESE_FOREIGN_INCOME",
          citations: sourceIds,
        },
      ],
      warnings: [
        {
          code: "SCOPE_ONLY",
          message: "Esta regra apenas encaminha o caso; não calcula ainda o crédito ou o IRS.",
          severity: "warning",
        },
      ],
    };
  },
};
