import { eurCents, type Money } from "../../core/money";

export interface EmployerBudgetEvaluation {
  annualCost: Money;
}

export type EmployerBudgetEvaluator = (
  baseSalaryMonthly: Money,
) => EmployerBudgetEvaluation | undefined;

export type EmployerBudgetInverseResult =
  | { kind: "ready"; baseSalaryMonthly: Money; evaluation: EmployerBudgetEvaluation; iterations: number }
  | { kind: "unsupported"; reason: string; iterations: number };

/**
 * Maior salário-base que cabe no orçamento. A verificação final é
 * conservadora: nunca arredonda para um valor cujo custo ultrapasse o teto.
 */
export function solveBaseSalaryForEmployerBudget(
  annualBudget: Money,
  evaluator: EmployerBudgetEvaluator,
  maximumMonthlyBase?: Money,
): EmployerBudgetInverseResult {
  if (annualBudget.cents <= 0) {
    return { kind: "unsupported", reason: "O orçamento anual tem de ser positivo.", iterations: 0 };
  }
  let low = 0;
  let high = maximumMonthlyBase?.cents
    ?? Math.max(0, Math.floor(annualBudget.cents / 12));
  let best: { base: number; evaluation: EmployerBudgetEvaluation } | undefined;
  let iterations = 0;

  while (low <= high && iterations < 64) {
    iterations += 1;
    const mid = Math.floor((low + high) / 2);
    const evaluation = evaluator(eurCents(mid));
    if (!evaluation) {
      high = mid - 1;
      continue;
    }
    if (evaluation.annualCost.cents <= annualBudget.cents) {
      best = { base: mid, evaluation };
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (!best) {
    return {
      kind: "unsupported",
      reason: "Os custos fixos do posto já excedem o orçamento disponível.",
      iterations,
    };
  }
  return {
    kind: "ready",
    baseSalaryMonthly: eurCents(best.base),
    evaluation: best.evaluation,
    iterations,
  };
}

