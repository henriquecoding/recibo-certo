import { describe, expect, it } from "vitest";
import {
  PORTUGAL_PAYROLL_POLICY_2026,
  eurCents,
  planEmploymentOffer,
  ratePpm,
  solveBaseSalaryForEmployerBudget,
  type EmploymentOfferInput,
  type WithholdingResolver,
} from "../src";

const withholding: WithholdingResolver = (request) => ({
  amount: eurCents(Math.round(request.taxableAmount.cents * 0.08)),
  effectiveRate: ratePpm(80_000),
  trace: [],
});

const common: Omit<EmploymentOfferInput, "goal" | "employer" | "package"> = {
  period: "2026-08",
  policyDate: "2026-08-30",
  role: {
    startMonth: 1,
    weeklyHoursHundredths: 4_000,
    jurisdiction: "PT-CONTINENTE",
    productive: false,
  },
  postCosts: {
    accidentInsuranceAnnual: eurCents(350_00),
    healthAndSafetyAnnual: eurCents(150_00),
    trainingAnnual: eurCents(250_00),
  },
};

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
    const prepared = planEmploymentOffer({
      ...common,
      goal: "employer_budget",
      employer: { annualBudget: eurCents(4_000_000), safetyMargin: ratePpm(50_000) },
      package: { baseSalaryMonthly: eurCents(0), subsidyPayment: "normal" },
    }, PORTUGAL_PAYROLL_POLICY_2026, withholding);
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.result.resolvedBaseSalaryMonthly.cents).toBeGreaterThan(0);
    expect(prepared.result.employerCost.annualStabilized.cents).toBeLessThanOrEqual(3_800_000);
    expect(prepared.result.employerCost.budgetHeadroom?.cents).toBeGreaterThanOrEqual(200_000);
  });

  it("resolve líquido alvo e volta a validar o payroll", () => {
    const prepared = planEmploymentOffer({
      ...common,
      goal: "target_net",
      employer: {},
      targetNetMonthly: eurCents(150_000),
      package: { baseSalaryMonthly: eurCents(0), subsidyPayment: "normal" },
      candidate: {
        dependants: 0,
        maritalStatus: "not_married",
        disability: false,
        jurisdiction: "PT-CONTINENTE",
        authorizationConfirmed: true,
      },
    }, PORTUGAL_PAYROLL_POLICY_2026, withholding);
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready" || prepared.result.workerOutcome.kind !== "exact") return;
    expect(prepared.result.workerOutcome.monthlyReference.cents).toBeGreaterThanOrEqual(149_999);
  });
});
