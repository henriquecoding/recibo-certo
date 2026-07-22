import { eurCents, type Money } from "../../core/money";
import { calculatePayroll } from "./engine";
import type {
  FixedTaxableLine,
  PayrollInput,
  PayrollPolicy,
  PayrollPreparation,
  PayrollResult,
  WithholdingResolver,
} from "./types";

export interface InversePayrollInput {
  template: PayrollInput;
  baseSalaryLineId: string;
  targetNetPayable: Money;
  maximumGross: Money;
  tolerance?: Money;
}

export type InversePayrollResult =
  | { kind: "ready"; baseSalary: Money; payroll: PayrollResult; iterations: number }
  | Exclude<PayrollPreparation, { kind: "ready" }>;

function withBaseSalary(template: PayrollInput, id: string, amount: Money): PayrollInput | undefined {
  let found = false;
  const lines = template.lines.map((line) => {
    if (line.id !== id) return line;
    if (line.kind !== "base_salary") return line;
    found = true;
    return { ...line, amount } satisfies FixedTaxableLine;
  });
  return found ? { ...template, lines } : undefined;
}

/** Procura o menor salário-base que atinge o líquido pedido, ao cêntimo/tolerância. */
export function solveBaseSalaryForTargetNet(
  input: InversePayrollInput,
  policy: PayrollPolicy,
  resolver: WithholdingResolver,
): InversePayrollResult {
  const tolerance = input.tolerance?.cents ?? 1;
  if (input.targetNetPayable.cents < 0 || input.maximumGross.cents < 0 || tolerance < 0) {
    return { kind: "conflict", reasons: ["Limites inválidos para o cálculo inverso."], trace: [] };
  }
  if (!withBaseSalary(input.template, input.baseSalaryLineId, eurCents(0))) {
    return {
      kind: "conflict",
      reasons: [`A rubrica ${input.baseSalaryLineId} não existe ou não é base_salary.`],
      trace: [],
    };
  }

  let low = 0;
  let high = input.maximumGross.cents;
  let best: { amount: number; payroll: PayrollResult } | undefined;
  let iterations = 0;
  while (low <= high && iterations < 64) {
    iterations += 1;
    const mid = Math.floor((low + high) / 2);
    const candidate = withBaseSalary(input.template, input.baseSalaryLineId, eurCents(mid))!;
    const prepared = calculatePayroll(candidate, policy, resolver);
    if (prepared.kind !== "ready") return prepared;
    const delta = prepared.result.totals.netPayable.cents - input.targetNetPayable.cents;
    if (delta >= -tolerance) {
      best = { amount: mid, payroll: prepared.result };
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  if (!best) {
    return {
      kind: "unsupported",
      reasons: ["O líquido pretendido não é atingível dentro do salário bruto máximo indicado."],
      trace: [],
    };
  }
  return { kind: "ready", baseSalary: eurCents(best.amount), payroll: best.payroll, iterations };
}
