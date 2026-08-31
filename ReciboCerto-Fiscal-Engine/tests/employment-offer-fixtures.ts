import {
  eurCents,
  ratePpm,
  type CandidateTaxFacts,
  type CapacityFacts,
  type CompensationPackage,
  type CostKnowledge,
  type EmployerFacts,
  type EmploymentOfferInput,
  type EmploymentPolicyBundle,
  type EmploymentSimulationContext,
  type PlannerGoal,
  type PostCosts,
  type RoleFacts,
  type SupportFactSheet,
  type WithholdingResolver,
} from "../src";
import { selectEmploymentPolicy } from "../src/releases/select";

/**
 * Fixtures determinísticas da baseline (relatório, CON-P0-00). Qualquer
 * alteração intencional ao motor obriga a explicar a mudança aqui, em vez de
 * a esconder num snapshot.
 */

export const withholding10: WithholdingResolver = (request) => ({
  amount: eurCents(Math.round(request.taxableAmount.cents / 10)),
  effectiveRate: ratePpm(100_000),
  trace: [],
});

export const withholding8: WithholdingResolver = (request) => ({
  amount: eurCents(Math.round(request.taxableAmount.cents * 0.08)),
  effectiveRate: ratePpm(80_000),
  trace: [],
});

export const confirmed = (cents: number): CostKnowledge => ({
  kind: "confirmed",
  amount: eurCents(cents),
});

export const estimated = (cents: number, basis = "média de mercado"): CostKnowledge => ({
  kind: "estimated",
  amount: eurCents(cents),
  basis,
});

export const rangeCost = (low: number, high: number): CostKnowledge => ({
  kind: "range",
  min: eurCents(low),
  max: eurCents(high),
  basis: "duas propostas de seguradora",
});

export const unknownCostFact = (blocking = false): CostKnowledge => ({
  kind: "unknown",
  reason: "ainda não sei",
  blocking,
});

export const notApplicable = (reason = "não se aplica"): CostKnowledge => ({
  kind: "not_applicable",
  reason,
});

/** Custos do posto todos confirmados: a baseline que autoriza um veredicto. */
export const fullyKnownPostCosts = (): PostCosts => ({
  accidentInsurance: confirmed(420_00),
  healthAndSafety: confirmed(180_00),
  training: confirmed(300_00),
  equipmentFirstYear: confirmed(1_200_00),
  recruitmentFirstYear: confirmed(0),
  software: confirmed(0),
  remoteWork: confirmed(0),
  other: confirmed(0),
});

/**
 * Bundle de teste. Passa pelo MESMO seletor que a rota pública — o que muda
 * é apenas a autorização explícita de usar um release não publicado, que
 * nenhuma superfície pode passar (relatório, MOT-P0-001).
 */
export function testBundle(
  withholding: WithholdingResolver = withholding10,
  overrides: Partial<Parameters<typeof selectEmploymentPolicy>[0]> = {},
): EmploymentPolicyBundle {
  const selection = selectEmploymentPolicy({
    simulationAsOf: "2026-08-31",
    workPeriod: "2026-08",
    payDate: "2026-08-31",
    jurisdiction: "PT-CONTINENTE",
    withholding,
    ...overrides,
  });
  if (selection.kind !== "ready") {
    throw new Error(`O seletor recusou o release de teste: ${JSON.stringify(selection)}`);
  }
  return selection.bundle;
}

export interface OfferChanges {
  context?: Partial<EmploymentSimulationContext>;
  goal?: PlannerGoal;
  employer?: Partial<EmployerFacts>;
  role?: Partial<RoleFacts>;
  package?: Partial<CompensationPackage>;
  postCosts?: Partial<PostCosts>;
  targetNetMonthly?: EmploymentOfferInput["targetNetMonthly"];
  candidate?: CandidateTaxFacts;
  capacity?: CapacityFacts;
  supportFacts?: SupportFactSheet;
  review?: EmploymentOfferInput["review"];
}

export function offerInput(changes: OfferChanges = {}): EmploymentOfferInput {
  const base: EmploymentOfferInput = {
    context: {
      simulationAsOf: "2026-08-31",
      workPeriod: "2026-01",
      payDate: "2026-01-31",
      contractStart: "2026-01-01",
      jurisdiction: "PT-CONTINENTE",
    },
    goal: "known_offer",
    employer: { contributionRegime: "regime_geral" },
    role: {
      title: "Operador",
      contractKind: "permanent",
      workingTime: {
        normalWeeklyHoursHundredths: 4_000,
        workingWeekdays: [1, 2, 3, 4, 5],
        regime: "standard",
        basis: "none",
      },
      collectiveAgreement: { status: "none" },
      mainVacationMonth: 8,
      productive: true,
      productiveShare: ratePpm(750_000),
    },
    package: {
      baseSalaryMonthly: eurCents(200_000),
      subsidyPayment: "normal",
      mealAllowance: {
        dailyAmount: eurCents(750),
        method: "card_or_voucher",
      },
    },
    postCosts: fullyKnownPostCosts(),
    candidate: {
      dependants: 0,
      maritalStatus: "not_married",
      disability: false,
      jurisdiction: "PT-CONTINENTE",
      authorizationConfirmed: true,
    },
    capacity: {
      pricePerProductiveHour: eurCents(5_500),
      contributionMargin: ratePpm(1_000_000),
      expectedBillableHoursMonthly: 100,
    },
  };
  return {
    ...base,
    context: { ...base.context, ...changes.context },
    goal: changes.goal ?? base.goal,
    employer: { ...base.employer, ...changes.employer },
    role: {
      ...base.role,
      ...changes.role,
      workingTime: { ...base.role.workingTime, ...changes.role?.workingTime },
    },
    package: { ...base.package, ...changes.package },
    postCosts: { ...base.postCosts, ...changes.postCosts },
    targetNetMonthly: "targetNetMonthly" in changes
      ? changes.targetNetMonthly
      : base.targetNetMonthly,
    candidate: "candidate" in changes ? changes.candidate : base.candidate,
    capacity: "capacity" in changes ? changes.capacity : base.capacity,
    supportFacts: changes.supportFacts ?? base.supportFacts,
    review: changes.review ?? base.review,
  };
}
