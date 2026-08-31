import type { ISODate, MissingInput, TraceStep } from "../../core/model";
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
  summariseCalendar,
  type CalendarPeriodProjection,
  type MoneyRange,
} from "./calendar";
import {
  calculateCapacity,
  ANNUAL_TRAINING_HOURS_HUNDREDTHS,
  CAPACITY_CITATIONS,
  type CapacityResult,
} from "./capacity";
import {
  costLowerBound,
  costUpperBound,
  confirmedAmount,
  decideReadiness,
  summariseCosts,
  type CostComponent,
  type CostSummary,
} from "./completeness";
import { employmentOfferAssumptions } from "./explanation";
import { solveBaseSalaryForEmployerBudget } from "./inverse";
import {
  assessHiringSupports,
  EMPLOYMENT_OFFER_ENGINE_VERSION,
} from "./policy-2026";
import { workerRangeProfiles, workerRangeProfileLabels } from "./range";
import {
  admissionYearVacationWorkdays,
  buildWorkCalendar,
  parseISODate,
  toISODate,
  ANNUAL_VACATION_WORKDAYS,
  WORK_CALENDAR_CITATIONS,
  type WorkCalendarResult,
} from "./work-calendar";
import type {
  EmployerCostResult,
  EmploymentOfferInput,
  EmploymentOfferPreparation,
  EmploymentOfferResult,
  PersonalizedWorkerOutcome,
  PublicChargesResult,
  ReferenceScenarioOutcome,
  WorkerOutcome,
  WorkingTimeLimits,
  WorkingTimeRegime,
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

/**
 * Limites do período normal de trabalho. Deixar passar 80 h/semana como
 * «situação normal» era aceitar em silêncio um cenário que a lei não permite
 * (relatório, CON-P0-09).
 */
export const WORKING_TIME_LIMITS: Readonly<Record<WorkingTimeRegime, WorkingTimeLimits>> = {
  standard: {
    dailyHoursHundredths: 800,
    weeklyHoursHundredths: 4_000,
    citation: "pt.dr.codigo-trabalho.artigo-203",
  },
  adaptability_individual: {
    dailyHoursHundredths: 1_000,
    weeklyHoursHundredths: 5_000,
    citation: "pt.dr.codigo-trabalho.artigo-205",
  },
  adaptability_collective: {
    dailyHoursHundredths: 1_200,
    weeklyHoursHundredths: 6_000,
    citation: "pt.dr.codigo-trabalho.artigo-204",
  },
};

interface MonthSlot {
  year: number;
  month: number;
  mealDays: number;
}

interface EmployeeProjection {
  employee: PayrollEmployee;
  /** Mês de referência para memória de cálculo. */
  reference: PayrollResult;
  monthlyByYearMonth: ReadonlyMap<string, PayrollResult>;
  holidayFull?: PayrollResult;
  christmasFull?: PayrollResult;
  bonusFull?: PayrollResult;
  admissionHoliday?: PayrollResult;
  admissionChristmas?: PayrollResult;
  admissionBonus?: PayrollResult;
  stabilized: {
    employerPayrollCost: Money;
    cashGross: Money;
    net: Money;
    employeeSocialSecurity: Money;
    employerSocialSecurity: Money;
    irs: Money;
  };
  monthlyReferenceNet: Money;
}

type ProjectionPreparation =
  | { kind: "ready"; value: EmployeeProjection }
  | Exclude<PayrollPreparation, { kind: "ready" }>;

const slotKey = (year: number, month: number): string => `${year}-${month}`;

function asPreparation(
  result: PayrollPreparation,
): { kind: "ready"; value: PayrollResult } | Exclude<PayrollPreparation, { kind: "ready" }> {
  return result.kind === "ready" ? { kind: "ready", value: result.result } : result;
}

function monthlyInput(
  input: EmploymentOfferInput,
  baseSalaryMonthly: Money,
  employee: PayrollEmployee,
  mealDays: number,
): PayrollInput {
  const meal = input.package.mealAllowance;
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
    ...(meal && mealDays > 0
      ? [{
          id: "meal-allowance",
          label: "Subsídio de refeição",
          kind: "meal_allowance" as const,
          days: mealDays,
          dailyAmount: meal.dailyAmount,
          method: meal.method,
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

interface ProjectionContext {
  admissionSlots: readonly MonthSlot[];
  stabilizedSlots: readonly MonthSlot[];
  secondYearSlots: readonly MonthSlot[];
  admissionMonths: number;
}

/**
 * Projeta o payroll de cada mês do horizonte. Os meses não são iguais: cada um
 * tem os seus dias elegíveis a refeição. O cálculo é memoizado por número de
 * dias, para que a exatidão não custe uma chamada por mês.
 */
function projectEmployee(
  input: EmploymentOfferInput,
  baseSalaryMonthly: Money,
  employee: PayrollEmployee,
  policy: PayrollPolicy,
  resolver: WithholdingResolver,
  context: ProjectionContext,
  /**
   * A resolução inversa do orçamento só precisa do ano estabilizado e corre
   * dezenas de vezes por tecla: projetar os 24 meses em cada iteração seria
   * pagar exatidão que ninguém lê (relatório, CON-P0-26).
   */
  stabilizedOnly = false,
): ProjectionPreparation {
  const cache = new Map<number, PayrollResult>();
  let failure: Exclude<PayrollPreparation, { kind: "ready" }> | undefined;

  const payrollForDays = (mealDays: number): PayrollResult | undefined => {
    const cached = cache.get(mealDays);
    if (cached) return cached;
    const prepared = asPreparation(calculatePayroll(
      monthlyInput(input, baseSalaryMonthly, employee, mealDays),
      policy,
      resolver,
    ));
    if (prepared.kind !== "ready") {
      failure = prepared;
      return undefined;
    }
    cache.set(mealDays, prepared.value);
    return prepared.value;
  };

  const monthlyByYearMonth = new Map<string, PayrollResult>();
  if (!stabilizedOnly) {
    for (const slot of [...context.admissionSlots, ...context.secondYearSlots]) {
      const result = payrollForDays(slot.mealDays);
      if (!result) return failure!;
      monthlyByYearMonth.set(slotKey(slot.year, slot.month), result);
    }
  }

  const stabilizedMonthly: PayrollResult[] = [];
  for (const slot of context.stabilizedSlots) {
    const result = payrollForDays(slot.mealDays);
    if (!result) return failure!;
    stabilizedMonthly.push(result);
  }

  const reference = stabilizedMonthly[0] ?? monthlyByYearMonth.values().next().value;
  if (!reference) {
    return {
      kind: "needs_input",
      missing: [{ path: "role.startDate", reason: "Não há nenhum mês ativo para projetar." }],
      trace: [],
    };
  }

  let holidayFull: PayrollResult | undefined;
  let christmasFull: PayrollResult | undefined;
  let admissionHoliday: PayrollResult | undefined;
  let admissionChristmas: PayrollResult | undefined;
  if (input.package.subsidyPayment === "normal" && baseSalaryMonthly.cents > 0) {
    const h = asPreparation(calculatePayroll(
      subsidyInput(input, employee, "holiday_subsidy", baseSalaryMonthly, baseSalaryMonthly),
      policy,
      resolver,
    ));
    if (h.kind !== "ready") return h;
    holidayFull = h.value;
    const c = asPreparation(calculatePayroll(
      subsidyInput(input, employee, "christmas_subsidy", baseSalaryMonthly, baseSalaryMonthly),
      policy,
      resolver,
    ));
    if (c.kind !== "ready") return c;
    christmasFull = c.value;

    if (context.admissionMonths > 0 && context.admissionMonths < 12) {
      const prorated = scale(baseSalaryMonthly, context.admissionMonths, 12);
      const ph = asPreparation(calculatePayroll(
        subsidyInput(input, employee, "holiday_subsidy", prorated, baseSalaryMonthly),
        policy,
        resolver,
      ));
      if (ph.kind !== "ready") return ph;
      admissionHoliday = ph.value;
      const pc = asPreparation(calculatePayroll(
        subsidyInput(input, employee, "christmas_subsidy", prorated, baseSalaryMonthly),
        policy,
        resolver,
      ));
      if (pc.kind !== "ready") return pc;
      admissionChristmas = pc.value;
    } else {
      admissionHoliday = holidayFull;
      admissionChristmas = christmasFull;
    }
  }

  let bonusFull: PayrollResult | undefined;
  let admissionBonus: PayrollResult | undefined;
  const variable = input.package.variableAnnualBonus;
  if (variable && variable.cents > 0) {
    const prepared = asPreparation(calculatePayroll(
      annualBonusInput(input, employee, variable),
      policy,
      resolver,
    ));
    if (prepared.kind !== "ready") return prepared;
    bonusFull = prepared.value;
    if (context.admissionMonths > 0 && context.admissionMonths < 12) {
      const proratedBonus = asPreparation(calculatePayroll(
        annualBonusInput(input, employee, scale(variable, context.admissionMonths, 12)),
        policy,
        resolver,
      ));
      if (proratedBonus.kind !== "ready") return proratedBonus;
      admissionBonus = proratedBonus.value;
    } else {
      admissionBonus = bonusFull;
    }
  }

  const extras = [holidayFull, christmasFull, bonusFull].filter(
    (item): item is PayrollResult => item !== undefined,
  );
  const totalOf = (pick: (result: PayrollResult) => Money) =>
    add(...stabilizedMonthly.map(pick), ...extras.map(pick));

  return {
    kind: "ready",
    value: {
      employee,
      reference,
      monthlyByYearMonth,
      holidayFull,
      christmasFull,
      bonusFull,
      admissionHoliday,
      admissionChristmas,
      admissionBonus,
      stabilized: {
        employerPayrollCost: totalOf((result) => result.totals.employerCost),
        cashGross: totalOf((result) => result.totals.cashGross),
        net: totalOf((result) => result.totals.netPayable),
        employeeSocialSecurity: totalOf((result) => result.totals.employeeSocialSecurity),
        employerSocialSecurity: totalOf((result) => result.totals.employerSocialSecurity),
        irs: totalOf((result) => result.totals.irsWithheld),
      },
      monthlyReferenceNet: reference.totals.netPayable,
    },
  };
}

function errorFromProjection(
  prepared: Exclude<ProjectionPreparation, { kind: "ready" }>,
): EmploymentOfferPreparation {
  return prepared;
}

// ─── Custos do posto ───────────────────────────────────────────────────────

function postCostComponents(input: EmploymentOfferInput): readonly CostComponent[] {
  const { postCosts } = input;
  return [
    {
      id: "accident-insurance",
      label: "Seguro de acidentes de trabalho",
      path: "postCosts.accidentInsurance",
      knowledge: postCosts.accidentInsurance,
      oneOff: false,
      // Lei n.º 98/2009, artigo 79.º: a transferência da responsabilidade é
      // obrigatória. Zero confirmado não é resposta legítima num vínculo real.
      legallyRequired: true,
    },
    {
      id: "health-and-safety",
      label: "Saúde e segurança no trabalho",
      path: "postCosts.healthAndSafety",
      knowledge: postCosts.healthAndSafety,
      oneOff: false,
    },
    {
      id: "training",
      label: "Formação externa",
      path: "postCosts.training",
      knowledge: postCosts.training,
      oneOff: false,
    },
    {
      id: "equipment",
      label: "Equipamento e EPI",
      path: "postCosts.equipmentFirstYear",
      knowledge: postCosts.equipmentFirstYear,
      oneOff: true,
    },
    {
      id: "recruitment",
      label: "Recrutamento",
      path: "postCosts.recruitmentFirstYear",
      knowledge: postCosts.recruitmentFirstYear,
      oneOff: true,
    },
    {
      id: "software",
      label: "Software e licenças",
      path: "postCosts.software",
      knowledge: postCosts.software,
      oneOff: false,
    },
    {
      id: "remote-work",
      label: "Trabalho remoto",
      path: "postCosts.remoteWork",
      knowledge: postCosts.remoteWork,
      oneOff: false,
    },
    {
      id: "other",
      label: "Outros custos do posto",
      path: "postCosts.other",
      knowledge: postCosts.other,
      oneOff: false,
    },
  ];
}

/** Limite inferior do recorrente: o que já é conhecido, sem inventar o resto. */
function recurringLowerBound(components: readonly CostComponent[], input: EmploymentOfferInput): Money {
  return add(
    ...components.filter((item) => !item.oneOff).map((item) => costLowerBound(item.knowledge)),
    ...(input.package.benefits ?? []).map((benefit) => benefit.employerAnnualCost),
  );
}

function startupLowerBound(components: readonly CostComponent[]): Money {
  return add(...components.filter((item) => item.oneOff).map((item) => costLowerBound(item.knowledge)));
}

// ─── Validação ─────────────────────────────────────────────────────────────

function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseISODate(value as ISODate);
  if (month < 1 || month > 12 || day < 1) return false;
  return toISODate({ year, month, day }) === value;
}

function validate(input: EmploymentOfferInput): EmploymentOfferPreparation | undefined {
  const missing: MissingInput[] = [];
  const unsupported: string[] = [];

  if (!input.period.startsWith("2026-")) {
    return {
      kind: "unsupported",
      reasons: ["O Planeador está versionado para payroll de 2026."],
      trace: [],
    };
  }
  if (input.employer.contributionRegime === "outro") {
    unsupported.push(
      "O motor só sabe calcular o regime geral da Segurança Social. Para outro enquadramento, confirma a taxa com o teu contabilista antes de decidir.",
    );
  }
  if (input.employer.contributionRegime === "nao_sei") {
    missing.push({
      path: "employer.contributionRegime",
      reason: "Indica o enquadramento contributivo da entidade. A taxa nunca é inferida pelo nome da empresa.",
    });
  }

  if (!isISODate(input.role.startDate)) {
    missing.push({ path: "role.startDate", reason: "Indica a data de entrada, no formato AAAA-MM-DD." });
  }
  if (input.role.contractEndDate !== undefined) {
    if (!isISODate(input.role.contractEndDate)) {
      missing.push({ path: "role.contractEndDate", reason: "A data de fim do contrato não é uma data válida." });
    } else if (input.role.contractEndDate < input.role.startDate) {
      return {
        kind: "conflict",
        reasons: ["O fim do contrato é anterior à data de entrada."],
        trace: [],
      };
    }
  }
  if (input.role.workingWeekdays.length === 0) {
    missing.push({ path: "role.workingWeekdays", reason: "Indica pelo menos um dia da semana contratado." });
  }
  if (input.role.workingWeekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    missing.push({ path: "role.workingWeekdays", reason: "Os dias da semana vão de 1 (segunda) a 7 (domingo)." });
  }

  const weekly = input.role.weeklyHoursHundredths;
  if (!Number.isSafeInteger(weekly) || weekly <= 0) {
    missing.push({ path: "role.weeklyHoursHundredths", reason: "Indica as horas semanais do posto." });
  } else {
    const limits = WORKING_TIME_LIMITS[input.role.workingTimeRegime];
    const days = Math.max(1, input.role.workingWeekdays.length);
    const daily = weekly / days;
    if (weekly > limits.weeklyHoursHundredths) {
      unsupported.push(
        `${(weekly / 100).toLocaleString("pt-PT")} horas por semana excedem o limite de ${limits.weeklyHoursHundredths / 100} horas do regime escolhido. Escolhe um regime de adaptabilidade suportado ou corrige o horário.`,
      );
    } else if (daily > limits.dailyHoursHundredths) {
      unsupported.push(
        `O horário dá ${(daily / 100).toFixed(1)} horas por dia e o regime escolhido admite no máximo ${limits.dailyHoursHundredths / 100}. Acrescenta dias de trabalho ou muda de regime.`,
      );
    }
  }

  if (!Number.isInteger(input.role.mainVacationMonth)
    || input.role.mainVacationMonth < 1
    || input.role.mainVacationMonth > 12) {
    missing.push({ path: "role.mainVacationMonth", reason: "Indica o mês do gozo principal de férias." });
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

  if (unsupported.length > 0) return { kind: "unsupported", reasons: unsupported, trace: [] };
  return missing.length > 0 ? { kind: "needs_input", missing, trace: [] } : undefined;
}

function effectiveBudget(input: EmploymentOfferInput): Money | undefined {
  const budget = input.employer.annualBudget;
  if (!budget) return undefined;
  const margin = input.employer.safetyMargin?.ppm ?? 0;
  return eurCents(Math.floor((budget.cents * Math.max(0, 1_000_000 - margin)) / 1_000_000));
}

// ─── Calendários ───────────────────────────────────────────────────────────

interface Calendars {
  admission: WorkCalendarResult;
  secondYear: WorkCalendarResult;
  stabilized: WorkCalendarResult;
  startYear: number;
  startMonth: number;
  admissionMonths: number;
}

function buildCalendars(input: EmploymentOfferInput): Calendars {
  const start = parseISODate(input.role.startDate);
  const startYear = start.year;
  const weekdays = input.role.workingWeekdays;

  const admissionSkeleton = buildWorkCalendar({
    year: startYear,
    jurisdiction: input.role.jurisdiction,
    startDate: input.role.startDate,
    endDate: input.role.contractEndDate,
    workingWeekdays: weekdays,
    municipalHoliday: input.role.municipalHoliday,
    vacationWorkdays: 0,
    mainVacationMonth: input.role.mainVacationMonth,
  });
  const admission = buildWorkCalendar({
    year: startYear,
    jurisdiction: input.role.jurisdiction,
    startDate: input.role.startDate,
    endDate: input.role.contractEndDate,
    workingWeekdays: weekdays,
    municipalHoliday: input.role.municipalHoliday,
    // CT, artigo 239.º, n.º 1: dois dias úteis por mês de contrato, até 20.
    vacationWorkdays: admissionYearVacationWorkdays(admissionSkeleton.completeContractMonths),
    mainVacationMonth: input.role.mainVacationMonth,
  });

  const nextYear = startYear + 1;
  const fullYearStart = toISODate({ year: nextYear, month: 1, day: 1 });
  const secondYear = buildWorkCalendar({
    year: nextYear,
    jurisdiction: input.role.jurisdiction,
    startDate: fullYearStart,
    endDate: input.role.contractEndDate,
    workingWeekdays: weekdays,
    municipalHoliday: input.role.municipalHoliday,
    vacationWorkdays: ANNUAL_VACATION_WORKDAYS,
    mainVacationMonth: input.role.mainVacationMonth,
  });
  const stabilized = input.role.contractEndDate
    ? buildWorkCalendar({
        year: nextYear,
        jurisdiction: input.role.jurisdiction,
        startDate: fullYearStart,
        workingWeekdays: weekdays,
        municipalHoliday: input.role.municipalHoliday,
        vacationWorkdays: ANNUAL_VACATION_WORKDAYS,
        mainVacationMonth: input.role.mainVacationMonth,
      })
    : secondYear;

  return {
    admission,
    secondYear,
    stabilized,
    startYear,
    startMonth: admission.firstActiveMonth,
    admissionMonths: admission.activeMonths,
  };
}

function mealDaysFor(
  input: EmploymentOfferInput,
  workedDays: number,
  active: boolean,
): number {
  if (!active) return 0;
  const declared = input.package.mealAllowance?.daysPerMonth;
  if (declared !== undefined) return Math.max(0, Math.round(declared));
  return workedDays;
}

function slotsFrom(
  input: EmploymentOfferInput,
  calendar: WorkCalendarResult,
): readonly MonthSlot[] {
  return calendar.months
    .filter((month) => month.contractDays > 0)
    .map((month) => ({
      year: calendar.year,
      month: month.month,
      mealDays: mealDaysFor(input, month.workedDays, true),
    }));
}

// ─── Resolução do vencimento ───────────────────────────────────────────────

function resolveBaseSalary(
  input: EmploymentOfferInput,
  policy: PayrollPolicy,
  resolver: WithholdingResolver,
  context: ProjectionContext,
  recurring: Money,
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
    const solved = solveBaseSalaryForEmployerBudget(budget, (candidate) => {
      const projected = projectEmployee(
        input,
        candidate,
        referenceEmployee,
        policy,
        resolver,
        context,
        true,
      );
      if (projected.kind !== "ready") {
        projectionError = projected;
        return undefined;
      }
      return { annualCost: add(projected.value.stabilized.employerPayrollCost, recurring) };
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
  const referenceMealDays = context.stabilizedSlots[0]?.mealDays ?? 0;
  const solvedBases: Money[] = [];
  for (const profile of profiles) {
    const solved = solveBaseSalaryForTargetNet({
      template: monthlyInput(input, ZERO, profile, referenceMealDays),
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

// ─── Composição do resultado ───────────────────────────────────────────────

function workerOutcome(
  projections: readonly EmployeeProjection[],
  jurisdiction: PayrollEmployee["jurisdiction"],
): WorkerOutcome {
  const reference = projections[0]!;
  if (projections.length === 1) {
    return {
      kind: "personalized_projection",
      monthlyReference: reference.monthlyReferenceNet,
      annualNet: reference.stabilized.net,
      annualGross: reference.stabilized.cashGross,
      annualEmployeeSocialSecurity: reference.stabilized.employeeSocialSecurity,
      annualIrsWithheld: reference.stabilized.irs,
      profile: reference.employee,
    } satisfies PersonalizedWorkerOutcome;
  }
  return {
    kind: "reference_scenarios",
    monthlyReference: {
      min: min(projections.map((projection) => projection.monthlyReferenceNet)),
      max: max(projections.map((projection) => projection.monthlyReferenceNet)),
    },
    annualNet: {
      min: min(projections.map((projection) => projection.stabilized.net)),
      max: max(projections.map((projection) => projection.stabilized.net)),
    },
    annualGross: reference.stabilized.cashGross,
    annualEmployeeSocialSecurity: reference.stabilized.employeeSocialSecurity,
    annualIrsWithheld: {
      min: min(projections.map((projection) => projection.stabilized.irs)),
      max: max(projections.map((projection) => projection.stabilized.irs)),
    },
    profilesEvaluated: projections.length,
    scenarioLabels: workerRangeProfileLabels(jurisdiction),
  } satisfies ReferenceScenarioOutcome;
}

function publicCharges(
  projection: EmployeeProjection,
  worker: WorkerOutcome,
): PublicChargesResult {
  const employer = projection.stabilized.employerSocialSecurity;
  const employee = projection.stabilized.employeeSocialSecurity;
  if (worker.kind === "personalized_projection") {
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

const zeroPeriod = (): CalendarPeriodProjection => ({
  employerCost: ZERO,
  workerNet: ZERO,
  publicCharges: ZERO,
});

function distinct(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function buildCapacity(
  input: EmploymentOfferInput,
  calendars: Calendars,
  annualCost: Money,
): CapacityResult | undefined {
  if (!input.role.productive) return undefined;
  const calendar = calendars.stabilized;
  return calculateCapacity(
    {
      weeklyHoursHundredths: input.role.weeklyHoursHundredths,
      workingWeekdaysPerWeek: input.role.workingWeekdays.length,
      scheduledDays: calendar.scheduledDays,
      holidayDaysOnScheduledDays: calendar.holidaysOnScheduledDays,
      vacationWorkdays: calendar.vacationWorkdays,
      trainingHoursHundredths:
        input.role.annualTrainingHoursHundredths ?? ANNUAL_TRAINING_HOURS_HUNDREDTHS,
      onboardingHoursHundredths: input.role.onboardingHoursHundredths ?? 0,
      productiveShare: input.role.productiveShare,
    },
    {
      annualCost,
      pricePerProductiveHour: input.capacity?.pricePerProductiveHour,
      contributionMargin: input.capacity?.contributionMargin,
      expectedBillableHoursMonthly: input.capacity?.expectedBillableHoursMonthly,
    },
  );
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

  const calendars = buildCalendars(input);
  if (calendars.admissionMonths === 0) {
    return {
      kind: "conflict",
      reasons: ["A data de entrada e o fim do contrato não deixam nenhum mês ativo."],
      trace: [],
    };
  }

  const context: ProjectionContext = {
    admissionSlots: slotsFrom(input, calendars.admission),
    secondYearSlots: slotsFrom(input, calendars.secondYear),
    stabilizedSlots: slotsFrom(input, calendars.stabilized),
    admissionMonths: calendars.admissionMonths,
  };

  const components = postCostComponents(input);
  const costs: CostSummary = summariseCosts(components);
  const recurring = recurringLowerBound(components, input);
  const startup = startupLowerBound(components);

  const resolvedBase = resolveBaseSalary(
    input,
    payrollPolicy,
    withholdingResolver,
    context,
    recurring,
  );
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
      context,
    );
    if (projected.kind !== "ready") return errorFromProjection(projected);
    projections.push(projected.value);
  }

  const reference = projections[0]!;
  const worker = workerOutcome(projections, input.role.jurisdiction);

  // Rateio dos recorrentes: o ano da admissão só suporta a parte dos meses
  // ativos; os anos seguintes suportam o ano inteiro. O resto de divisão fica
  // no último mês para que a soma feche ao cêntimo.
  const postCostsForMonth = (year: number, month: number): Money => {
    const admissionYear = year === calendars.startYear;
    const active = admissionYear
      ? calendars.admission.months.find((item) => item.month === month)?.contractDays ?? 0
      : calendars.secondYear.months.find((item) => item.month === month)?.contractDays ?? 0;
    if (active === 0) return ZERO;
    const months = admissionYear ? calendars.admissionMonths : calendars.secondYear.activeMonths;
    if (months === 0) return ZERO;
    const total = admissionYear ? scale(recurring, months, 12) : recurring;
    const activeMonths = (admissionYear ? calendars.admission : calendars.secondYear).months
      .filter((item) => item.contractDays > 0)
      .map((item) => item.month);
    const index = activeMonths.indexOf(month);
    const before = Math.floor((total.cents * index) / months);
    const upTo = Math.floor((total.cents * (index + 1)) / months);
    return eurCents(upTo - before);
  };

  const monthlyProjection = (year: number, month: number): CalendarPeriodProjection =>
    periodProjection(projections, (projection) =>
      projection.monthlyByYearMonth.get(slotKey(year, month))) ?? zeroPeriod();

  const calendarMonths = buildEmploymentCalendar({
    startYear: calendars.startYear,
    startMonth: calendars.startMonth,
    monthlyProjection,
    postCostsForMonth,
    admissionHolidaySubsidy: periodProjection(projections, (p) => p.admissionHoliday),
    admissionChristmasSubsidy: periodProjection(projections, (p) => p.admissionChristmas),
    admissionAnnualBonus: periodProjection(projections, (p) => p.admissionBonus),
    fullHolidaySubsidy: periodProjection(projections, (p) => p.holidayFull),
    fullChristmasSubsidy: periodProjection(projections, (p) => p.christmasFull),
    fullAnnualBonus: periodProjection(projections, (p) => p.bonusFull),
    // CT, artigo 264.º, n.º 3: o subsídio de férias é pago antes do gozo.
    holidaySubsidyMonth: input.role.mainVacationMonth,
    // CT, artigo 263.º, n.º 1: o subsídio de Natal é pago até 15 de dezembro.
    christmasSubsidyMonth: 12,
    bonusMonth: input.package.bonusMonth ?? 12,
    startupCosts: startup,
    lastActiveMonth: input.role.contractEndDate
      ? {
          year: parseISODate(input.role.contractEndDate).year,
          month: parseISODate(input.role.contractEndDate).month,
        }
      : undefined,
  });
  const summary = summariseCalendar(calendarMonths, calendars.startYear, calendars.startMonth);

  const annualStabilized = add(reference.stabilized.employerPayrollCost, recurring);
  // O intervalo do ano estabilizado só pode alargar com parcelas RECORRENTES:
  // o equipamento do arranque não pertence a um ano recorrente.
  const recurringSpread = add(
    ...components
      .filter((item) => !item.oneOff)
      .map((item) => subtract(costUpperBound(item.knowledge), costLowerBound(item.knowledge))),
  );
  const annualRange = {
    low: annualStabilized,
    high: add(annualStabilized, recurringSpread),
  };
  const budget = input.employer.annualBudget;
  const effective = effectiveBudget(input);

  const mealAnnual = input.package.mealAllowance
    ? scale(
        input.package.mealAllowance.dailyAmount,
        context.stabilizedSlots.reduce((sum, slot) => sum + slot.mealDays, 0),
      )
    : ZERO;

  const employerCost: EmployerCostResult = {
    annualStabilized,
    monthlyAverageStabilized: scale(annualStabilized, 1, 12),
    firstCalendarYear: summary.firstCalendarYear,
    firstTwelveMonths: summary.firstTwelveMonths,
    firstCalendarYearMonthlyAverage: scale(summary.firstCalendarYear, 1, 12),
    monthsWorkedFirstYear: calendars.admissionMonths,
    peakMonth: summary.peak,
    budget,
    effectiveBudget: effective,
    budgetHeadroom: effective ? subtract(effective, annualStabilized) : undefined,
    annualRange,
    annualConfirmed: add(
      reference.stabilized.employerPayrollCost,
      ...components.filter((item) => !item.oneOff).map((item) => confirmedAmount(item.knowledge)),
    ),
    breakdown: {
      cashCompensation: add(
        scale(resolvedBase, 14),
        scale(input.package.fixedMonthlyBonus ?? ZERO, 12),
        input.package.variableAnnualBonus ?? ZERO,
      ),
      mealAllowance: mealAnnual,
      employerSocialSecurity: reference.stabilized.employerSocialSecurity,
      benefits: add(...(input.package.benefits ?? []).map((benefit) => benefit.employerAnnualCost)),
      accidentInsurance: costLowerBound(input.postCosts.accidentInsurance),
      healthAndSafety: costLowerBound(input.postCosts.healthAndSafety),
      training: costLowerBound(input.postCosts.training),
      equipment: costLowerBound(input.postCosts.equipmentFirstYear),
      recruitment: costLowerBound(input.postCosts.recruitmentFirstYear),
      software: costLowerBound(input.postCosts.software),
      remoteWork: costLowerBound(input.postCosts.remoteWork),
      other: costLowerBound(input.postCosts.other),
    },
    postCostSummary: costs,
  };

  const capacity = buildCapacity(input, calendars, annualStabilized);
  const supports = assessHiringSupports(input.policyDate, input.supportFacts);
  const usedReferenceScenarios = worker.kind === "reference_scenarios";

  const assumptions = employmentOfferAssumptions(input, {
    usedReferenceScenarios,
    costs,
    calendars: {
      admissionVacationWorkdays: calendars.admission.vacationWorkdays,
      admissionMonths: calendars.admissionMonths,
      mealEligibleDays: context.stabilizedSlots.reduce((sum, slot) => sum + slot.mealDays, 0),
      holidaysOnScheduledDays: calendars.stabilized.holidaysOnScheduledDays,
    },
    capacity,
    budgetReserved: effective && budget && effective.cents !== budget.cents
      ? subtract(budget, effective)
      : undefined,
  });

  const blocking: MissingInput[] = [
    ...costs.blocking,
    ...assumptions
      .filter((assumption) => assumption.severity === "blocking")
      .map((assumption) => ({ path: assumption.id, reason: assumption.detail })),
  ];
  const estimatedFacts: MissingInput[] = [
    ...costs.estimatedFacts,
    ...assumptions
      .filter((assumption) => assumption.severity === "estimate")
      .map((assumption) => ({ path: assumption.id, reason: assumption.detail })),
  ];
  const status = decideReadiness({
    blocking,
    estimated: estimatedFacts,
    confirmed: costs.confirmedFacts,
    usedReferenceScenarios,
    reviewedAt: input.review?.reviewedAt,
  });

  const trace: TraceStep[] = [
    ...reference.reference.trace,
    {
      id: "employment-offer.employer-cost",
      label: "Custo anual estabilizado do posto",
      formula: "payroll anual + benefícios + seguro + SST + formação + software + outros",
      operands: [
        { name: "payroll_anual", value: reference.stabilized.employerPayrollCost.cents, unit: "EUR_CENTS" },
        { name: "custos_recorrentes", value: recurring.cents, unit: "EUR_CENTS" },
      ],
      result: annualStabilized.cents,
      rounding: "half_up",
      citations: payrollPolicy.citations,
    },
    {
      id: "employment-offer.meal-eligible-days",
      label: "Dias elegíveis a subsídio de refeição num ano estabilizado",
      formula: "dias contratados − feriados em dia de trabalho − dias de férias",
      operands: [
        { name: "dias_contratados", value: calendars.stabilized.scheduledDays, unit: "COUNT" },
        { name: "feriados_em_dia_util", value: calendars.stabilized.holidaysOnScheduledDays, unit: "COUNT" },
        { name: "dias_ferias", value: calendars.stabilized.vacationWorkdays, unit: "COUNT" },
      ],
      result: calendars.stabilized.mealEligibleDays,
      rounding: "towards_zero",
      citations: [...WORK_CALENDAR_CITATIONS],
    },
    {
      id: "employment-offer.first-twelve-months",
      label: "Saída de caixa nos primeiros doze meses do vínculo",
      formula: "soma dos doze meses de calendário a partir da entrada",
      operands: [
        { name: "ano_civil_da_entrada", value: summary.firstCalendarYear.cents, unit: "EUR_CENTS" },
        { name: "meses_ativos_no_ano_civil", value: calendars.admissionMonths, unit: "COUNT" },
      ],
      result: summary.firstTwelveMonths.cents,
      rounding: "half_up",
      citations: [...WORK_CALENDAR_CITATIONS],
    },
  ];
  if (calendars.admissionMonths < 12) {
    trace.push({
      id: "employment-offer.admission-vacation",
      label: "Férias no ano da admissão",
      formula: "min(20; 2 × meses completos de contrato)",
      operands: [
        { name: "meses_completos", value: calendars.admission.completeContractMonths, unit: "COUNT" },
      ],
      result: calendars.admission.vacationWorkdays,
      rounding: "towards_zero",
      citations: ["pt.dr.codigo-trabalho.artigo-239"],
    });
  }
  if (capacity?.contributionPerBillableHour && capacity.billableHoursRequired !== null) {
    trace.push({
      id: "employment-offer.billable-hours",
      label: "Horas faturáveis necessárias",
      formula: "custo anual ÷ (preço por hora × margem de contribuição)",
      operands: [
        { name: "custo_anual", value: annualStabilized.cents, unit: "EUR_CENTS" },
        { name: "contribuicao_por_hora", value: capacity.contributionPerBillableHour.cents, unit: "EUR_CENTS" },
      ],
      result: Math.round(capacity.billableHoursRequired * 100),
      rounding: "half_up",
      citations: [...CAPACITY_CITATIONS],
    });
  }
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
      citations: [...CAPACITY_CITATIONS],
    });
  }

  return {
    kind: "ready",
    result: {
      status,
      projection: usedReferenceScenarios ? "reference_scenarios" : "personalized_projection",
      goal: input.goal,
      resolvedBaseSalaryMonthly: resolvedBase,
      employerCost,
      workerOutcome: worker,
      publicCharges: publicCharges(reference, worker),
      calendar: calendarMonths,
      workCalendar: calendars.stabilized,
      capacity,
      supports,
      assumptions,
      missingFacts: blocking,
      trace,
      citations: distinct([
        ...payrollPolicy.citations,
        ...WORK_CALENDAR_CITATIONS,
        ...CAPACITY_CITATIONS,
        WORKING_TIME_LIMITS[input.role.workingTimeRegime].citation,
        ...supports.map((support) => support.sourceUrl),
      ]),
      engineVersion: EMPLOYMENT_OFFER_ENGINE_VERSION,
      policyDate: input.policyDate,
      referencePayroll: reference.reference,
    },
  };
}

/** Política auxiliar para consumidores que querem apenas ppm sem importar money. */
export const productiveShareRate = (percent: number): Rate =>
  ratePpm(Math.max(0, Math.min(1_000_000, Math.round(percent * 10_000))));

