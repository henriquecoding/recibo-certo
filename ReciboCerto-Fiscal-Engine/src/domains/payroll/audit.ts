import type { Money } from "../../core/money";
import type { PayrollResult } from "./types";

export interface DeclaredPayrollTotals {
  cashGross?: Money;
  irsTaxable?: Money;
  socialSecurityBase?: Money;
  irsWithheld?: Money;
  employeeSocialSecurity?: Money;
  netPayable?: Money;
  employerCost?: Money;
}

export interface PayrollAuditFinding {
  code: string;
  field: keyof DeclaredPayrollTotals | "line_citations";
  severity: "info" | "warning" | "blocking";
  message: string;
  expectedCents?: number;
  declaredCents?: number;
  differenceCents?: number;
}

export interface PayrollAuditResult {
  matches: boolean;
  findings: readonly PayrollAuditFinding[];
}

/** Compara um recibo importado com a reconstrução, sem declarar fraude ou erro legal. */
export function auditPayrollTotals(
  calculated: PayrollResult,
  declared: DeclaredPayrollTotals,
  toleranceCents = 1,
): PayrollAuditResult {
  const findings: PayrollAuditFinding[] = [];
  const fields = Object.keys(declared) as (keyof DeclaredPayrollTotals)[];
  for (const field of fields) {
    const declaredValue = declared[field];
    if (!declaredValue) continue;
    const expected = calculated.totals[field];
    const difference = declaredValue.cents - expected.cents;
    if (Math.abs(difference) > toleranceCents) {
      findings.push({
        code: `PAYROLL_TOTAL_MISMATCH_${field.toUpperCase()}`,
        field,
        severity: field === "netPayable" || field === "irsWithheld" || field === "employeeSocialSecurity"
          ? "blocking"
          : "warning",
        message: `O total declarado de ${field} difere da reconstrução em ${difference} cêntimos.`,
        expectedCents: expected.cents,
        declaredCents: declaredValue.cents,
        differenceCents: difference,
      });
    }
  }
  for (const line of calculated.lines) {
    if (line.citations.length === 0) {
      findings.push({
        code: "PAYROLL_LINE_WITHOUT_CITATION",
        field: "line_citations",
        severity: "blocking",
        message: `A rubrica ${line.id} não contém proveniência legal.`,
      });
    }
  }
  return { matches: findings.length === 0, findings };
}
