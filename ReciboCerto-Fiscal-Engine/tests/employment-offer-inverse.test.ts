import { describe, expect, it } from "vitest";
import {
  eurCents,
  planEmploymentOffer,
  ratePpm,
  solveBaseSalaryForEmployerBudget,
} from "../src";
import { offerInput, testBundle, withholding8 } from "./employment-offer-fixtures";

const plan = (input: Parameters<typeof planEmploymentOffer>[0]) =>
  planEmploymentOffer(input, testBundle(withholding8));

const naoProdutivo = { productive: false, productiveShare: undefined } as const;

describe("inversos do planeador", () => {
  it("encontra o maior valor conservador dentro de um orçamento", () => {
    const solved = solveBaseSalaryForEmployerBudget(
      eurCents(1_000_00),
      (base) => ({ annualCost: eurCents(base.cents * 2 + 100_00) }),
      eurCents(100_000),
    );
    expect(solved.kind).toBe("ready");
    if (solved.kind !== "ready") return;
    expect(solved.evaluation.annualCost.cents).toBeLessThanOrEqual(1_000_00);
    expect(solved.baseSalaryMonthly.cents).toBe(45_000);
  });

  it("resolve orçamento anual pelo custo completo, com margem reservada", () => {
    const prepared = plan(offerInput({
      goal: "employer_budget",
      employer: { annualBudget: eurCents(4_000_000), safetyMargin: ratePpm(50_000) },
      package: { baseSalaryMonthly: eurCents(0) },
      role: naoProdutivo,
      capacity: undefined,
    }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.result.resolvedBaseSalaryMonthly.cents).toBeGreaterThan(0);
    expect(prepared.result.employerCost.annualStabilized.cents).toBeLessThanOrEqual(3_800_000);
    expect(prepared.result.employerCost.budgetHeadroom?.cents).toBeGreaterThanOrEqual(0);
  });

  it("INVARIANTE: o custo resolvido nunca ultrapassa o orçamento efetivo", () => {
    for (const orcamento of [3_000_000, 4_200_000, 6_000_000]) {
      const prepared = plan(offerInput({
        goal: "employer_budget",
        employer: { annualBudget: eurCents(orcamento), safetyMargin: ratePpm(50_000) },
        package: { baseSalaryMonthly: eurCents(0) },
        role: naoProdutivo,
        capacity: undefined,
      }));
      if (prepared.kind !== "ready") continue;
      const { annualStabilized, effectiveBudget } = prepared.result.employerCost;
      expect(effectiveBudget!.cents).toBeLessThanOrEqual(orcamento);
      expect(annualStabilized.cents).toBeLessThanOrEqual(effectiveBudget!.cents);
    }
  });

  it("INVARIANTE: aumentar o orçamento nunca reduz a base", () => {
    const bases = [3_600_000, 4_200_000, 4_800_000].map((orcamento) => {
      const prepared = plan(offerInput({
        goal: "employer_budget",
        employer: { annualBudget: eurCents(orcamento) },
        package: { baseSalaryMonthly: eurCents(0) },
        role: naoProdutivo,
        capacity: undefined,
      }));
      return prepared.kind === "ready" ? prepared.result.resolvedBaseSalaryMonthly.cents : 0;
    });
    expect(bases[1]!).toBeGreaterThanOrEqual(bases[0]!);
    expect(bases[2]!).toBeGreaterThanOrEqual(bases[1]!);
  });

  it("INVARIANTE: aumentar um custo recorrente nunca aumenta a base", () => {
    const semExtra = plan(offerInput({
      goal: "employer_budget",
      employer: { annualBudget: eurCents(4_200_000) },
      package: { baseSalaryMonthly: eurCents(0) },
      role: naoProdutivo,
      capacity: undefined,
    }));
    const comExtra = plan(offerInput({
      goal: "employer_budget",
      employer: { annualBudget: eurCents(4_200_000) },
      package: { baseSalaryMonthly: eurCents(0) },
      postCosts: { software: { kind: "confirmed", amount: eurCents(120_000) } },
      role: naoProdutivo,
      capacity: undefined,
    }));
    if (semExtra.kind !== "ready" || comExtra.kind !== "ready") throw new Error("esperava resultados");
    expect(comExtra.result.resolvedBaseSalaryMonthly.cents)
      .toBeLessThanOrEqual(semExtra.result.resolvedBaseSalaryMonthly.cents);
  });

  it("INVARIANTE: aumentar a margem reservada nunca aumenta a base", () => {
    const bases = [0, 50_000, 150_000].map((margem) => {
      const prepared = plan(offerInput({
        goal: "employer_budget",
        employer: { annualBudget: eurCents(4_200_000), safetyMargin: ratePpm(margem) },
        package: { baseSalaryMonthly: eurCents(0) },
        role: naoProdutivo,
        capacity: undefined,
      }));
      return prepared.kind === "ready" ? prepared.result.resolvedBaseSalaryMonthly.cents : 0;
    });
    expect(bases[1]!).toBeLessThanOrEqual(bases[0]!);
    expect(bases[2]!).toBeLessThanOrEqual(bases[1]!);
  });

  it("resolve líquido alvo e volta a validar o payroll", () => {
    const prepared = plan(offerInput({
      goal: "target_net",
      targetNetMonthly: eurCents(150_000),
      package: { baseSalaryMonthly: eurCents(0) },
      role: naoProdutivo,
      capacity: undefined,
    }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    const worker = prepared.result.workerOutcome;
    if (worker.kind !== "personalized_projection") throw new Error("esperava projeção personalizada");
    expect(worker.monthlyReference.cents).toBeGreaterThanOrEqual(149_999);
  });
});
