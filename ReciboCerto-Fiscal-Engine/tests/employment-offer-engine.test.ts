import { describe, expect, it } from "vitest";
import {
  PORTUGAL_PAYROLL_POLICY_2026,
  eurCents,
  planEmploymentOffer,
  ratePpm,
  type EmploymentOfferInput,
  type WithholdingResolver,
} from "../src";

const withholding10: WithholdingResolver = (request) => ({
  amount: eurCents(Math.round(request.taxableAmount.cents / 10)),
  effectiveRate: ratePpm(100_000),
  trace: [],
});

function input(
  changes: Partial<EmploymentOfferInput> = {},
): EmploymentOfferInput {
  const base: EmploymentOfferInput = {
    period: "2026-08",
    policyDate: "2026-08-30",
    goal: "known_offer",
    employer: {},
    role: {
      title: "Operador",
      startMonth: 1,
      weeklyHoursHundredths: 4_000,
      jurisdiction: "PT-CONTINENTE",
      productive: true,
      productiveShare: ratePpm(750_000),
    },
    package: {
      baseSalaryMonthly: eurCents(200_000),
      subsidyPayment: "normal",
      mealAllowance: {
        dailyAmount: eurCents(750),
        daysPerMonth: 20,
        method: "card_or_voucher",
      },
    },
    postCosts: {
      accidentInsuranceAnnual: eurCents(420_00),
      healthAndSafetyAnnual: eurCents(180_00),
      trainingAnnual: eurCents(300_00),
      equipmentFirstYear: eurCents(1_200_00),
    },
    candidate: {
      dependants: 0,
      maritalStatus: "not_married",
      disability: false,
      jurisdiction: "PT-CONTINENTE",
      authorizationConfirmed: true,
    },
    capacity: {
      pricePerProductiveHour: eurCents(5_500),
      expectedBillableHoursMonthly: 120,
    },
  };
  return {
    ...base,
    ...changes,
    employer: { ...base.employer, ...changes.employer },
    role: { ...base.role, ...changes.role },
    package: { ...base.package, ...changes.package },
    postCosts: { ...base.postCosts, ...changes.postCosts },
    capacity: changes.capacity === undefined
      ? base.capacity
      : { ...base.capacity, ...changes.capacity },
  };
}

describe("Employment Offer Planner", () => {
  it("compõe payroll, custos do posto, calendário e capacidade sem fórmulas no consumidor", () => {
    const prepared = planEmploymentOffer(input(), PORTUGAL_PAYROLL_POLICY_2026, withholding10);
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;

    const result = prepared.result;
    expect(result.certainty).toBe("exact");
    expect(result.employerCost.annualStabilized.cents).toBeGreaterThan(200_000 * 14);
    expect(result.workerOutcome.kind).toBe("exact");
    expect(result.publicCharges.employerSocialSecurity.cents).toBeGreaterThan(0);
    expect(result.calendar).toHaveLength(12);
    expect(result.capacity?.costPerProductiveHour?.cents).toBeGreaterThan(0);
    expect(result.trace.some((step) => step.id === "employment-offer.employer-cost")).toBe(true);
  });

  it("devolve intervalo quando a empresa não conhece factos pessoais", () => {
    const prepared = planEmploymentOffer(
      input({ candidate: undefined }),
      PORTUGAL_PAYROLL_POLICY_2026,
      withholding10,
    );
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.result.certainty).toBe("range");
    expect(prepared.result.workerOutcome.kind).toBe("range");
    if (prepared.result.workerOutcome.kind !== "range") return;
    expect(prepared.result.workerOutcome.profilesEvaluated).toBe(4);
    expect(prepared.result.workerOutcome.annualNet.min.cents)
      .toBeLessThanOrEqual(prepared.result.workerOutcome.annualNet.max.cents);
    expect(prepared.result.assumptions.some((item) => item.id === "worker-profile-range")).toBe(true);
  });

  it("mantém apoios condicionais fora do custo", () => {
    const withSupport = input({
      supportFacts: {
        registeredUnemployed: true,
        permanentContract: true,
        fullTime: true,
        applicationBeforeContract: true,
        candidateAge: 29,
        qualificationLevel: 7,
      },
    });
    const prepared = planEmploymentOffer(withSupport, PORTUGAL_PAYROLL_POLICY_2026, withholding10);
    const without = planEmploymentOffer(input(), PORTUGAL_PAYROLL_POLICY_2026, withholding10);
    expect(prepared.kind).toBe("ready");
    expect(without.kind).toBe("ready");
    if (prepared.kind !== "ready" || without.kind !== "ready") return;
    expect(prepared.result.supports.some((item) => item.status === "potential")).toBe(true);
    expect(prepared.result.employerCost.annualStabilized)
      .toEqual(without.result.employerCost.annualStabilized);
  });

  it("bloqueia benefício sem matriz factual em vez de o classificar pelo nome", () => {
    const prepared = planEmploymentOffer(input({
      package: {
        baseSalaryMonthly: eurCents(200_000),
        subsidyPayment: "normal",
        benefits: [{
          id: "health",
          label: "Seguro de saúde",
          kind: "health_insurance",
          employerAnnualCost: eurCents(600_00),
        }],
      },
    }), PORTUGAL_PAYROLL_POLICY_2026, withholding10);
    expect(["needs_input", "unsupported"]).toContain(prepared.kind);
  });
});

