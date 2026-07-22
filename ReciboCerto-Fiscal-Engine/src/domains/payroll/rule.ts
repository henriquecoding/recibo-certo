import type { FiscalRule, RuleOutcome } from "../../core/model";
import { calculatePayroll } from "./engine";
import type { PayrollInput, PayrollPolicy, PayrollResult, WithholdingResolver } from "./types";

export function createPayrollRule(
  policy: PayrollPolicy,
  withholdingResolver: WithholdingResolver,
): FiscalRule<PayrollInput, PayrollResult> {
  return {
    id: "pt.payroll.monthly-slip.v1",
    domain: "payroll_withholding",
    version: "1.0.0-draft.0",
    effective: { from: "2026-01-01", to: "2026-12-31" },
    jurisdictions: ["PT-CONTINENTE", "PT-MADEIRA", "PT-ACORES"],
    citations: policy.citations,
    requirements: [
      { path: "period", reason: "O recibo exige um período mensal." },
      { path: "employee", reason: "O enquadramento pessoal determina a tabela de retenção." },
      { path: "lines", reason: "O recibo exige uma lista explícita de rubricas." },
      { path: "weeklyHoursHundredths", reason: "O período semanal é necessário às fórmulas horárias." },
    ],
    evaluate(input): RuleOutcome<PayrollResult> {
      const prepared = calculatePayroll(input, policy, withholdingResolver);
      switch (prepared.kind) {
        case "ready":
          return {
            kind: "ok",
            value: prepared.result,
            trace: prepared.result.trace,
            warnings: prepared.result.warnings,
          };
        case "needs_input":
          return { kind: "needs_input", missing: prepared.missing, trace: prepared.trace };
        case "unsupported":
          return { kind: "unsupported", reasons: prepared.reasons, trace: prepared.trace };
        case "conflict":
          return { kind: "conflict", reasons: prepared.reasons, trace: prepared.trace };
      }
    },
  };
}
