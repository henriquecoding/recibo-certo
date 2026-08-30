import type { MissingInput, TraceStep } from "../../core/model";
import {
  eurCents,
  ratePpm,
  type Money,
  type Rate,
} from "../../core/money";
import { calculatePayroll } from "../payroll/engine";
import { solveBaseSalaryForTargetNet } from "../payroll/inverse";
import type {
  PayrollEmployee,
  PayrollInput,
  PayrollPolicy,
  PayrollPreparation,
  PayrollResult,
  WithholdingResolver,
} from "../payroll/types";
import {
  buildEmploymentCalendar,
  type CalendarPeriodProjection,
  type MoneyRange,
} from "./calendar";
import { employmentOfferAssumptions } from "./explanation";
import { solveBaseSalaryForEmployerBudget } from "./inverse";
import {
  assessHiringSupports,
  EMPLOYMENT_OFFER_ENGINE_VERSION,
} from "./policy-2026";
import { workerRangeProfiles } from "./range";
import type {
  CapacityResult,
  CompensationPackage,
  EmploymentOfferInput,
  EmploymentOfferPreparation,
  EmploymentOfferResult,
  ExactWorkerOutcome,
  PublicChargesResult,
  WorkerOutcome,
  WorkerOutcomeRange,
} from "./types";

const ZERO = eurCents(0);
const DEFAULT_EMPLOYEE: Omit<PayrollEmployee, "jurisdiction"> = {
  dependants: 0,
  maritalStatus: "not_married",
  disability: false,
};

const add = (...values: readonly Money[]): Money =>
  eurCents(values.reduce((sum, value) => sum + value.cents, 0));
const subtract = (left: Money, right: Money): Money => eurCents(left.cents - right.cents);
const scale = (value: Money, numerator: number, denominator = 1): Money =>
  eurCents(Math.round((value.cents * numerator) / denominator));
const min = (values: readonly Money[]): Money =>
  eurCents(Math.min(...values.map((value) => value.cents)));
const max = (values: readonly Money[]): Money =>
  eurCents(Math.max(...values.map((value) => value.cents)));

interface EmployeeProjection {
  employee: PayrollEmployee;
  monthly: PayrollResult;
  holiday?: PayrollResult;
  christmas?: PayrollResult;
  annualBonus?: PayrollResult;
  firstYearHoliday?: PayrollResult;
  firstYearChristmas?: PayrollResult;
  firstYearBonus?: PayrollResult;
  annual: {
    employerPayrollCost: Money;
    cashGross: Money;
    net: Money;
    employeeSocialSecurity: Money;
    employerSocialSecurity: Money;
    irs: Money;
  };
  firstYear: {
    employerPayrollCost: Money;
  };
}

type ProjectionPreparation =
  | { kind: "ready"; value: EmployeeProjection }
  | Exclude<PayrollPreparation, { kind: "ready" }>;

function asPreparation(
  result: PayrollPreparation,
): { kind: "ready"; value: PayrollResult } | Exclude<PayrollPreparation, { kind: "ready" }> {
  return result.kind === "ready" ? { kind: "ready", value: result.result } : result;
}

function monthlyInput(
  input: EmploymentOfferInput,
  baseSalaryMonthly: Money,
  employee: PayrollEmployee,
): PayrollInput {
  const lines: PayrollInput["lines"] = [
    {
      id: "base-salary",
      label: "Vencimento base",
      kind: "base_salary",
      amount: baseSalaryMonthly,
    },
    ...(input.package.fixedMonthlyBonus && input.package.fixedMonthlyBonus.cents > 0
      ? [{
          id: "fixed-bonus",
          label: "Complemento fixo",
          kind: "function_allowance" as const,
          amount: input.package.fixedMonthlyBonus,
        }]
      : []),
    ...(input.package.mealAllowance
      ? [{
          id: "meal-allowance",
          label: "Subsídio de refeição",
          kind: "meal_allowance" as const,
          days: input.package.mealAllowance.daysPerMonth,
          dailyAmount: input.package.mealAllowance.dailyAmount,
          method: input.package.mealAllowance.method,
        }]
      : []),
    ...(input.package.subsidyPayment === "duodecimos" && baseSalaryMonthly.cents > 0
      ? [
          {
            id: "holiday-duodecimo",
            label: "Duodécimo de férias",
            kind: "holiday_subsidy" as const,
            amountPaid: scale(baseSalaryMonthly, 1, 12),
            fullEntitlement: baseSalaryMonthly,
          },
          {
            id: "christmas-duodecimo",
            label: "Duodécimo de Natal",
            kind: "christmas_subsidy" as const,
            amountPaid: scale(baseSalaryMonthly, 1, 12),
            fullEntitlement: baseSalaryMonthly,
          },
        ]
      : []),
    ...(input.package.benefits ?? []).map((benefit) => ({
      id: benefit.id,
      label: benefit.label,
      kind: "routed_benefit" as const,
      benefitKind: benefit.kind,
      amount: benefit.monthlyTaxValue,
      facts: benefit.facts,
    })),
  ];
  return {
    period: input.period,
    weeklyHoursHundredths: input.role.weeklyHoursHundredths,
    employee,
    lines,
  };
}

function subsidyInput(
  input: EmploymentOfferInput,
  employee: PayrollEmployee,
  kind: "holiday_subsidy" | "christmas_subsidy",
  amountPaid: Money,
  fullEntitlement: Money,
): PayrollInput {
  return {
    period: input.period,
    weeklyHoursHundredths: input.role.weeklyHoursHundredths,
    employee,
    lines: [{
      id: kind,
      label: kind === "holiday_subsidy" ? "Subsídio de férias" : "Subsídio de Natal",
      kind,
      amountPaid,
      fullEntitlement,
    }],
  };
}

function annualBonusInput(
  input: EmploymentOfferInput,
  employee: PayrollEmployee,
  amount: Money,
): PayrollInput {
  return {
    period: input.period,
    weeklyHoursHundredths: input.role.weeklyHoursHundredths,
    employee,
    lines: [{
      id: "annual-bonus",
      label: "Prémio anual",
      kind: "performance_award",
      amount,
      socialSecurityRegularity:
        input.package.variableBonusSocialSecurityRegularity ?? "unknown",
    }],
  };
}

function sumPayroll(
  monthly: PayrollResult,
  months: number,
  extras: readonly (PayrollResult | undefined)[],
) {
  const results = extras.filter((item): item is PayrollResult => item !== undefined);
  const totalOf = (pick: (result: PayrollResult) => Money) =>
    add(scale(pick(monthly), months), ...results.map(pick));
  return {
    employerPayrollCost: totalOf((result) => result.totals.employerCost),
    cashGross: totalOf((result) => result.totals.cashGross),
    net: totalOf((result) => result.totals.netPayable),
    employeeSocialSecurity: totalOf((result) => result.totals.employeeSocialSecurity),
    employerSocialSecurity: totalOf((result) => result.totals.employerSocialSecurity),
    irs: totalOf((result) => result.totals.irsWithheld),
  };
}

function projectEmployee(
  input: EmploymentOfferInput,
  baseSalaryMonthly: Money,
  employee: PayrollEmployee,
  policy: PayrollPolicy,
  resolver: WithholdingResolver,
): ProjectionPreparation {
  const monthly = asPreparation(calculatePayroll(
    monthlyInput(input, baseSalaryMonthly, employee),
    policy,
    resolver,
  ));
  if (monthly.kind !== "ready") return monthly;

  let holiday: PayrollResult | undefined;
  let christmas: PayrollResult | undefined;
  if (input.package.subsidyPayment === "normal" && baseSalaryMonthly.cents > 0) {
    const h = asPreparation(calculatePayroll(
      subsidyInput(input, employee, "holiday_subsidy", baseSalaryMonthly, baseSalaryMonthly),
      policy,
      resolver,
    ));
    if (h.kind !== "ready") return h;
    holiday = h.value;
    const c = asPreparation(calculatePayroll(
      subsidyInput(input, employee, "christmas_subsidy", baseSalaryMonthly, baseSalaryMonthly),
      policy,
      resolver,
    ));
    if (c.kind !== "ready") return c;
    christmas = c.value;
  }

  let annualBonus: PayrollResult | undefined;
  const variable = input.package.variableAnnualBonus;
  if (variable && variable.cents > 0) {
    const prepared = asPreparation(calculatePayroll(
      annualBonusInput(input, employee, variable),
      policy,
      resolver,
    ));
    if (prepared.kind !== "ready") return prepared;
    annualBonus = prepared.value;
  }

  const monthsWorked = 13 - input.role.startMonth;
  const fractionNumerator = Math.max(0, Math.min(12, monthsWorked));
  let firstYearHoliday: PayrollResult | undefined;
  let firstYearChristmas: PayrollResult | undefined;
  if (
    input.package.subsidyPayment === "normal"
    && baseSalaryMonthly.cents > 0
    && fractionNumerator > 0
  ) {
    const prorated = scale(baseSalaryMonthly, fractionNumerator, 12);
    const h = asPreparation(calculatePayroll(
      subsidyInput(input, employee, "holiday_subsidy", prorated, baseSalaryMonthly),
      policy,
      resolver,
    ));
    if (h.kind !== "ready") return h;
    firstYearHoliday = h.value;
    const c = asPreparation(calculatePayroll(
      subsidyInput(input, employee, "christmas_subsidy", prorated, baseSalaryMonthly),
      policy,
      resolver,
    ));
    if (c.kind !== "ready") return c;
    firstYearChristmas = c.value;
  }

  let firstYearBonus: PayrollResult | undefined;
  if (variable && variable.cents > 0 && fractionNumerator > 0) {
    const prepared = asPreparation(calculatePayroll(
      annualBonusInput(input, employee, scale(variable, fractionNumerator, 12)),
      policy,
      resolver,
    ));
    if (prepared.kind !== "ready") return prepared;
    firstYearBonus = prepared.value;
  }

  return {
    kind: "ready",
    value: {
      employee,
      monthly: monthly.value,
      holiday,
      christmas,
      annualBonus,
      firstYearHoliday,
      firstYearChristmas,
      firstYearBonus,
      annual: sumPayroll(monthly.value, 12, [holiday, christmas, annualBonus]),
      firstYear: {
        employerPayrollCost: sumPayroll(
          monthly.value,
          fractionNumerator,
          [firstYearHoliday, firstYearChristmas, firstYearBonus],
        ).employerPayrollCost,
      },
    },
  };
}

function errorFromProjection(
  prepared: Exclude<ProjectionPreparation, { kind: "ready" }>,
): EmploymentOfferPreparation {
  if (prepared.kind === "needs_input") return prepared;
  if (prepared.kind === "unsupported") return prepared;
  return prepared;
}

function validate(input: EmploymentOfferInput): EmploymentOfferPreparation | undefined {
  const missing: MissingInput[] = [];
  if (!input.period.startsWith("2026-")) {
    return {
      kind: "unsupported",
      reasons: ["O Planeador está versionado para payroll de 2026."],
      trace: [],
    };
  }
  if (!Number.isInteger(input.role.startMonth) || input.role.startMonth < 1 || input.role.startMonth > 12) {
    missing.push({ path: "role.startMonth", reason: "Indica um mês de entrada entre janeiro e dezembro." });
  }
  if (!Number.isSafeInteger(input.role.weeklyHoursHundredths) || input.role.weeklyHoursHundredths <= 0) {
    missing.push({ path: "role.weeklyHoursHundredths", reason: "Indica as horas semanais do posto." });
  }
  if (input.candidate && !input.candidate.authorizationConfirmed) {
    missing.push({
      path: "candidate.authorizationConfirmed",
      reason: "Os factos pessoais só podem ser usados com autorização confirmada.",
    });
  }
  if (input.goal === "employer_budget" && !input.employer.annualBudget) {
    missing.push({ path: "employer.annualBudget", reason: "Indica o orçamento anual da contratação." });
  }
  if (input.goal === "target_net" && !input.targetNetMonthly) {
    missing.push({ path: "targetNetMonthly", reason: "Indica o líquido mensal pretendido." });
  }
  if (
    (input.goal === "known_offer" || input.goal === "required_capacity")
    && input.package.baseSalaryMonthly.cents <= 0
  ) {
    missing.push({ path: "package.baseSalaryMonthly", reason: "Indica o vencimento base da proposta." });
  }
  return missing.length > 0 ? { kind: "needs_input", missing, trace: [] } : undefined;
}

function effectiveBudget(input: EmploymentOfferInput): Money | undefined {
  const budget = input.employer.annualBudget;
  if (!budget) return undefined;
  const margin = input.employer.safetyMargin?.ppm ?? 0;
  return eurCents(Math.floor((budget.cents * Math.max(0, 1_000_000 - margin)) / 1_000_000));
}

function resolveBaseSalary(
  input: EmploymentOfferInput,
  policy: PayrollPolicy,
  resolver: WithholdingResolver,
): Money | EmploymentOfferPreparation {
  if (input.goal === "known_offer" || input.goal === "required_capacity") {
    return input.package.baseSalaryMonthly;
  }

  if (input.goal === "employer_budget") {
    const budget = effectiveBudget(input)!;
    const referenceEmployee: PayrollEmployee = {
      ...DEFAULT_EMPLOYEE,
      jurisdiction: input.role.jurisdiction,
    };
    let projectionError: Exclude<ProjectionPreparation, { kind: "ready" }> | undefined;
    const recurring = recurringPostCosts(input);
    const solved = solveBaseSalaryForEmployerBudget(budget, (candidate) => {
      const projected = projectEmployee(input, candidate, referenceEmployee, policy, resolver);
      if (projected.kind !== "ready") {
        projectionError = projected;
        return undefined;
      }
      return {
        annualCost: add(projected.value.annual.employerPayrollCost, recurring),
      };
    });
    if (projectionError) return errorFromProjection(projectionError);
    if (solved.kind !== "ready") {
      return { kind: "unsupported", reasons: [solved.reason], trace: [] };
    }
    return solved.baseSalaryMonthly;
  }

  const target = input.targetNetMonthly!;
  const profiles = input.candidate
    ? [input.candidate]
    : workerRangeProfiles(input.role.jurisdiction);
  const solvedBases: Money[] = [];
  for (const profile of profiles) {
    const solved = solveBaseSalaryForTargetNet({
      template: monthlyInput(input, ZERO, profile),
      baseSalaryLineId: "base-salary",
      targetNetPayable: target,
      maximumGross: eurCents(Math.max(5_000_000, target.cents * 5)),
      tolerance: eurCents(1),
    }, policy, resolver);
    if (solved.kind === "needs_input") return solved;
    if (solved.kind === "conflict") return solved;
    if (solved.kind === "unsupported") return solved;
    solvedBases.push(solved.baseSalary);
  }
  // Sem candidato, escolher o maior bruto é conservador: o limite inferior
  // do intervalo continua a atingir o líquido pedido.
  return max(solvedBases);
}

function recurringPostCosts(input: EmploymentOfferInput): Money {
  return add(
    input.postCosts.accidentInsuranceAnnual ?? ZERO,
    input.postCosts.healthAndSafetyAnnual ?? ZERO,
    input.postCosts.trainingAnnual ?? ZERO,
    input.postCosts.otherAnnual ?? ZERO,
    ...(input.package.benefits ?? []).map((benefit) => benefit.employerAnnualCost),
  );
}

function workerOutcome(projections: readonly EmployeeProjection[]): WorkerOutcome {
  const reference = projections[0]!;
  if (projections.length === 1) {
    return {
      kind: "exact",
      monthlyReference: reference.monthly.totals.netPayable,
      annualNet: reference.annual.net,
      annualGross: reference.annual.cashGross,
      annualEmployeeSocialSecurity: reference.annual.employeeSocialSecurity,
      annualIrsWithheld: reference.annual.irs,
      profile: reference.employee,
    } satisfies ExactWorkerOutcome;
  }
  return {
    kind: "range",
    monthlyReference: {
      min: min(projections.map((projection) => projection.monthly.totals.netPayable)),
      max: max(projections.map((projection) => projection.monthly.totals.netPayable)),
    },
    annualNet: {
      min: min(projections.map((projection) => projection.annual.net)),
      max: max(projections.map((projection) => projection.annual.net)),
    },
    annualGross: reference.annual.cashGross,
    annualEmployeeSocialSecurity: reference.annual.employeeSocialSecurity,
    annualIrsWithheld: {
      min: min(projections.map((projection) => projection.annual.irs)),
      max: max(projections.map((projection) => projection.annual.irs)),
    },
    profilesEvaluated: projections.length,
  } satisfies WorkerOutcomeRange;
}

function publicCharges(
  projection: EmployeeProjection,
  worker: WorkerOutcome,
): PublicChargesResult {
  const employer = projection.annual.employerSocialSecurity;
  const employee = projection.annual.employeeSocialSecurity;
  if (worker.kind === "exact") {
    return {
      employerSocialSecurity: employer,
      employeeSocialSecurity: employee,
      irsWithheld: worker.annualIrsWithheld,
      total: add(employer, employee, worker.annualIrsWithheld),
    };
  }
  return {
    employerSocialSecurity: employer,
    employeeSocialSecurity: employee,
    irsWithheld: worker.annualIrsWithheld,
    total: {
      min: add(employer, employee, worker.annualIrsWithheld.min),
      max: add(employer, employee, worker.annualIrsWithheld.max),
    },
  };
}

function periodProjection(
  projections: readonly EmployeeProjection[],
  select: (projection: EmployeeProjection) => PayrollResult | undefined,
): CalendarPeriodProjection | undefined {
  const results = projections.map(select);
  if (results.some((result) => result === undefined)) return undefined;
  const ready = results as PayrollResult[];
  const employerCost = ready[0]!.totals.employerCost;
  const employerSs = ready[0]!.totals.employerSocialSecurity;
  const employeeSs = ready[0]!.totals.employeeSocialSecurity;
  const workerValues = ready.map((result) => result.totals.netPayable);
  const publicValues = ready.map((result) =>
    add(employerSs, employeeSs, result.totals.irsWithheld),
  );
  const workerNet: Money | MoneyRange = ready.length === 1
    ? workerValues[0]!
    : { min: min(workerValues), max: max(workerValues) };
  const charges: Money | MoneyRange = ready.length === 1
    ? publicValues[0]!
    : { min: min(publicValues), max: max(publicValues) };
  return { employerCost, workerNet, publicCharges: charges };
}

function calculateCapacity(
  input: EmploymentOfferInput,
  annualCost: Money,
): CapacityResult | undefined {
  if (!input.role.productive) return undefined;
  const vacation = input.role.annualVacationHoursHundredths ?? 17_600;
  const training = input.role.annualTrainingHoursHundredths ?? 4_000;
  const available = Math.max(0, input.role.weeklyHoursHundredths * 52 - vacation - training);
  const share = input.role.productiveShare;
  const productive = share
    ? Math.max(0, Math.round((available * share.ppm) / 1_000_000))
    : 0;
  const costPerHour = productive > 0
    ? eurCents(Math.round((annualCost.cents * 100) / productive))
    : null;
  const contributionMargin = input.capacity?.contributionMargin;
  const pricePerHour = input.capacity?.pricePerProductiveHour;
  const revenueRequired = contributionMargin && contributionMargin.ppm > 0
    ? eurCents(Math.ceil((annualCost.cents * 1_000_000) / contributionMargin.ppm))
    : pricePerHour && pricePerHour.cents > 0
      ? annualCost
      : null;
  const billableHoursRequired = pricePerHour && pricePerHour.cents > 0
    ? Math.ceil((annualCost.cents / pricePerHour.cents) * 100) / 100
    : null;
  const expectedAnnual = input.capacity?.expectedBillableHoursMonthly !== undefined
    ? Math.round(input.capacity.expectedBillableHoursMonthly * 12 * 100) / 100
    : null;
  return {
    annualAvailableHoursHundredths: available,
    annualProductiveHoursHundredths: productive,
    costPerProductiveHour: costPerHour,
    revenueRequired,
    billableHoursRequired,
    expectedAnnualBillableHours: expectedAnnual,
    capacityGapHours:
      expectedAnnual !== null && billableHoursRequired !== null
        ? Math.round((expectedAnnual - billableHoursRequired) * 100) / 100
        : null,
  };
}

function distinct(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

/**
 * Compõe Payroll, custo patronal, calendário, capacidade e apoios. Não lê
 * rede, não guarda estado e não conhece React/Supabase.
 */
export function planEmploymentOffer(
  input: EmploymentOfferInput,
  payrollPolicy: PayrollPolicy,
  withholdingResolver: WithholdingResolver,
): EmploymentOfferPreparation {
  const invalid = validate(input);
  if (invalid) return invalid;
  const resolvedBase = resolveBaseSalary(input, payrollPolicy, withholdingResolver);
  if (typeof resolvedBase !== "object" || !("currency" in resolvedBase)) {
    return resolvedBase as EmploymentOfferPreparation;
  }

  const employees: readonly PayrollEmployee[] = input.candidate
    ? [input.candidate]
    : workerRangeProfiles(input.role.jurisdiction);
  const projections: EmployeeProjection[] = [];
  for (const employee of employees) {
    const projected = projectEmployee(
      input,
      resolvedBase,
      employee,
      payrollPolicy,
      withholdingResolver,
    );
    if (projected.kind !== "ready") return errorFromProjection(projected);
    projections.push(projected.value);
  }

  const reference = projections[0]!;
  const worker = workerOutcome(projections);
  const recurring = recurringPostCosts(input);
  const equipment = input.postCosts.equipmentFirstYear ?? ZERO;
  const monthsWorked = 13 - input.role.startMonth;
  const firstYearRecurring = scale(recurring, monthsWorked, 12);
  const annualStabilized = add(reference.annual.employerPayrollCost, recurring);
  const firstYear = add(reference.firstYear.employerPayrollCost, firstYearRecurring, equipment);
  const budget = input.employer.annualBudget;
  const effective = effectiveBudget(input);
  const employerCost = {
    annualStabilized,
    monthlyAverageStabilized: scale(annualStabilized, 1, 12),
    firstYear,
    firstYearMonthlyAverage: scale(firstYear, 1, 12),
    monthsWorkedFirstYear: monthsWorked,
    budget,
    budgetHeadroom: budget ? subtract(budget, annualStabilized) : undefined,
    breakdown: {
      cashCompensation: add(
        scale(resolvedBase, 14),
        scale(input.package.fixedMonthlyBonus ?? ZERO, 12),
        input.package.variableAnnualBonus ?? ZERO,
      ),
      mealAllowance: input.package.mealAllowance
        ? scale(
            input.package.mealAllowance.dailyAmount,
            input.package.mealAllowance.daysPerMonth * 12,
          )
        : ZERO,
      employerSocialSecurity: reference.annual.employerSocialSecurity,
      benefits: add(...(input.package.benefits ?? []).map((benefit) => benefit.employerAnnualCost)),
      accidentInsurance: input.postCosts.accidentInsuranceAnnual ?? ZERO,
      healthAndSafety: input.postCosts.healthAndSafetyAnnual ?? ZERO,
      training: input.postCosts.trainingAnnual ?? ZERO,
      equipment,
      other: input.postCosts.otherAnnual ?? ZERO,
    },
  } satisfies EmploymentOfferResult["employerCost"];

  const normal = periodProjection(projections, (projection) => projection.monthly)!;
  const holiday = periodProjection(projections, (projection) => projection.firstYearHoliday);
  const christmas = periodProjection(projections, (projection) => projection.firstYearChristmas);
  const bonus = periodProjection(projections, (projection) => projection.firstYearBonus);
  const calendar = buildEmploymentCalendar({
    startMonth: input.role.startMonth,
    normalMonth: normal,
    holidaySubsidy: holiday,
    christmasSubsidy: christmas,
    annualBonus: bonus,
    annualPostCosts: recurring,
    equipmentFirstYear: equipment,
  });

  const capacity = calculateCapacity(input, annualStabilized);
  const supports = assessHiringSupports(input.policyDate, input.supportFacts);
  const assumptions = [
    ...employmentOfferAssumptions(input, worker.kind === "range"),
    ...(effective && budget && effective.cents !== budget.cents
      ? [{
          id: "safety-margin",
          label: "Margem de segurança reservada",
          detail: `${budget.cents - effective.cents} cêntimos do orçamento não foram usados para compor o pacote.`,
          severity: "info" as const,
        }]
      : []),
  ];
  const trace: TraceStep[] = [
    ...reference.monthly.trace,
    {
      id: "employment-offer.employer-cost",
      label: "Custo anual estabilizado do posto",
      formula: "payroll anual + benefícios + seguro + SST + formação + outros",
      operands: [
        { name: "payroll_anual", value: reference.annual.employerPayrollCost.cents, unit: "EUR_CENTS" },
        { name: "custos_recorrentes", value: recurring.cents, unit: "EUR_CENTS" },
      ],
      result: annualStabilized.cents,
      rounding: "half_up",
      citations: payrollPolicy.citations,
    },
  ];
  if (capacity?.costPerProductiveHour) {
    trace.push({
      id: "employment-offer.productive-hour",
      label: "Custo por hora produtiva",
      formula: "custo anual estabilizado ÷ horas produtivas anuais",
      operands: [
        { name: "custo_anual", value: annualStabilized.cents, unit: "EUR_CENTS" },
        { name: "horas_produtivas_centésimos", value: capacity.annualProductiveHoursHundredths, unit: "COUNT" },
      ],
      result: capacity.costPerProductiveHour.cents,
      rounding: "half_up",
      citations: ["pt.dr.codigo-trabalho.current"],
    });
  }

  return {
    kind: "ready",
    result: {
      certainty: worker.kind === "exact" ? "exact" : "range",
      goal: input.goal,
      resolvedBaseSalaryMonthly: resolvedBase,
      employerCost,
      workerOutcome: worker,
      publicCharges: publicCharges(reference, worker),
      calendar,
      capacity,
      supports,
      assumptions,
      missingFacts: assumptions
        .filter((assumption) => assumption.severity === "blocking")
        .map((assumption) => ({ path: assumption.id, reason: assumption.detail })),
      trace,
      citations: distinct([
        ...payrollPolicy.citations,
        ...supports.map((support) => support.sourceUrl),
      ]),
      engineVersion: EMPLOYMENT_OFFER_ENGINE_VERSION,
      policyDate: input.policyDate,
      referencePayroll: reference.monthly,
    },
  };
}

/** Política auxiliar para consumidores que querem apenas ppm sem importar money. */
export const productiveShareRate = (percent: number): Rate =>
  ratePpm(Math.max(0, Math.min(1_000_000, Math.round(percent * 10_000))));

