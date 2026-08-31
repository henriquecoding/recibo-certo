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
import { assessMinimumWage } from "./minimum-wage";
import { EMPLOYMENT_OFFER_ENGINE_VERSION } from "./version";
import { workerRangeProfiles, workerRangeProfileLabels } from "./range";
import { assessHiringSupports } from "./supports";
import { assessVacation, earliestLeaveMonth, VACATION_CITATIONS } from "./vacation";
import { reviewWorkingTime } from "./working-time";
import {
  buildWorkCalendar,
  parseISODate,
  toISODate,
  WORK_CALENDAR_CITATIONS,
  type WorkCalendarResult,
} from "./work-calendar";
import type {
  EmploymentPolicyBundle,
  SubsidyBaseComponent,
} from "../../releases/types";
import type {
  EmployerCostResult,
  EmploymentOfferInput,
  EmploymentOfferPreparation,
  EmploymentOfferResult,
  MinimumWageVerdict,
  PersonalizedWorkerOutcome,
  PublicChargesResult,
  ReferenceScenarioOutcome,
  ResultProvenance,
  VacationEntitlement,
  WorkerOutcome,
  WorkingTimeAssessment,
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
  holidaySubsidyBase: Money = baseSalaryMonthly,
  christmasSubsidyBase: Money = baseSalaryMonthly,
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
    ...(input.package.subsidyPayment === "duodecimos" && holidaySubsidyBase.cents > 0
      ? [
          {
            id: "holiday-duodecimo",
            label: "Duodécimo de férias",
            kind: "holiday_subsidy" as const,
            amountPaid: scale(holidaySubsidyBase, 1, 12),
            fullEntitlement: holidaySubsidyBase,
          },
          {
            id: "christmas-duodecimo",
            label: "Duodécimo de Natal",
            kind: "christmas_subsidy" as const,
            amountPaid: scale(christmasSubsidyBase, 1, 12),
            fullEntitlement: christmasSubsidyBase,
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
    period: input.context.workPeriod,
    weeklyHoursHundredths: input.role.workingTime.normalWeeklyHoursHundredths,
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
    period: input.context.workPeriod,
    weeklyHoursHundredths: input.role.workingTime.normalWeeklyHoursHundredths,
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
    period: input.context.workPeriod,
    weeklyHoursHundredths: input.role.workingTime.normalWeeklyHoursHundredths,
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

/**
 * Base dos subsídios de férias e de Natal.
 *
 * O artigo 264.º, n.º 2 manda incluir a retribuição base E as demais
 * prestações retributivas ligadas ao modo específico da execução do
 * trabalho. Projetar só o salário base subestimava os dois subsídios sempre
 * que houvesse um complemento mensal fixo (MOT-P0-009).
 */
function subsidyBaseAmount(
  input: EmploymentOfferInput,
  baseSalaryMonthly: Money,
  components: readonly SubsidyBaseComponent[],
): Money {
  let total = ZERO;
  if (components.includes("base_salary")) total = add(total, baseSalaryMonthly);
  if (components.includes("fixed_monthly_bonus")) {
    total = add(total, input.package.fixedMonthlyBonus ?? ZERO);
  }
  return total;
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
  bundle: EmploymentPolicyBundle,
  context: ProjectionContext,
  /**
   * A resolução inversa do orçamento só precisa do ano estabilizado e corre
   * dezenas de vezes por tecla: projetar os 24 meses em cada iteração seria
   * pagar exatidão que ninguém lê (relatório, CON-P0-26).
   */
  stabilizedOnly = false,
): ProjectionPreparation {
  const policy = bundle.release.payroll;
  const resolver = bundle.withholding;
  const holidayBase = subsidyBaseAmount(
    input,
    baseSalaryMonthly,
    bundle.release.subsidyBase.holidaySubsidyIncludes,
  );
  const christmasBase = subsidyBaseAmount(
    input,
    baseSalaryMonthly,
    bundle.release.subsidyBase.christmasSubsidyIncludes,
  );
  const cache = new Map<number, PayrollResult>();
  let failure: Exclude<PayrollPreparation, { kind: "ready" }> | undefined;

  const payrollForDays = (mealDays: number): PayrollResult | undefined => {
    const cached = cache.get(mealDays);
    if (cached) return cached;
    const prepared = asPreparation(calculatePayroll(
      monthlyInput(input, baseSalaryMonthly, employee, mealDays, holidayBase, christmasBase),
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
  if (input.package.subsidyPayment === "normal" && holidayBase.cents > 0) {
    const h = asPreparation(calculatePayroll(
      subsidyInput(input, employee, "holiday_subsidy", holidayBase, holidayBase),
      policy,
      resolver,
    ));
    if (h.kind !== "ready") return h;
    holidayFull = h.value;
    const c = asPreparation(calculatePayroll(
      subsidyInput(input, employee, "christmas_subsidy", christmasBase, christmasBase),
      policy,
      resolver,
    ));
    if (c.kind !== "ready") return c;
    christmasFull = c.value;

    if (context.admissionMonths > 0 && context.admissionMonths < 12) {
      const proratedHoliday = scale(holidayBase, context.admissionMonths, 12);
      const proratedChristmas = scale(christmasBase, context.admissionMonths, 12);
      const ph = asPreparation(calculatePayroll(
        subsidyInput(input, employee, "holiday_subsidy", proratedHoliday, holidayBase),
        policy,
        resolver,
      ));
      if (ph.kind !== "ready") return ph;
      admissionHoliday = ph.value;
      const pc = asPreparation(calculatePayroll(
        subsidyInput(input, employee, "christmas_subsidy", proratedChristmas, christmasBase),
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

/**
 * O 31 de fevereiro passava. A comparação era um ida-e-volta de formatação,
 * que reescreve o dia tal e qual em vez de o validar contra o calendário —
 * e uma data impossível seguia para o motor como se fosse real
 * (relatório, MOT-P0-003).
 */
function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseISODate(value as ISODate);
  if (month < 1 || month > 12 || day < 1) return false;
  const stamp = new Date(Date.UTC(year, month - 1, day));
  return (
    stamp.getUTCFullYear() === year
    && stamp.getUTCMonth() + 1 === month
    && stamp.getUTCDate() === day
  );
}

interface Validation {
  failure?: EmploymentOfferPreparation;
  workingTime?: WorkingTimeAssessment;
}

/**
 * Validação do input contra o release.
 *
 * Duas mudanças estruturais em relação ao que existia (MOT-P0-003):
 * o período deixou de ser comparado com a string «2026-» — é o release que
 * resolve vigência — e uma data inválida deixou de ser convertida em
 * silêncio numa data válida. Um campo mal preenchido produz `needs_input`.
 */
function validate(
  input: EmploymentOfferInput,
  bundle: EmploymentPolicyBundle,
): Validation {
  const missing: MissingInput[] = [];
  const unsupported: string[] = [];
  const conflicts: string[] = [];
  const { context } = input;

  if (bundle.usage === "public" && bundle.release.status === "draft") {
    return {
      failure: {
        kind: "unsupported",
        reasons: ["O release patronal ativo está em rascunho e não pode produzir um resultado público."],
        trace: [],
      },
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

  if (!isISODate(context.contractStart)) {
    missing.push({
      path: "context.contractStart",
      reason: "Indica a data de entrada, no formato AAAA-MM-DD.",
    });
  }
  if (!isISODate(context.payDate)) {
    missing.push({
      path: "context.payDate",
      reason: "Indica a data de pagamento: é ela que determina a tabela de retenção aplicável.",
    });
  }
  if (!isISODate(context.simulationAsOf)) {
    missing.push({
      path: "context.simulationAsOf",
      reason: "Indica a data de referência da simulação.",
    });
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(context.workPeriod)) {
    missing.push({
      path: "context.workPeriod",
      reason: "Indica o mês a que a remuneração respeita, no formato AAAA-MM.",
    });
  }
  if (context.contractEnd !== undefined) {
    if (!isISODate(context.contractEnd)) {
      missing.push({
        path: "context.contractEnd",
        reason: "A data de fim do contrato não é uma data válida.",
      });
    } else if (isISODate(context.contractStart) && context.contractEnd < context.contractStart) {
      conflicts.push("O fim do contrato é anterior à data de entrada.");
    }
  }
  if (!bundle.release.jurisdictions.includes(context.jurisdiction)) {
    unsupported.push(
      `O release ativo não cobre a jurisdição ${context.jurisdiction}.`,
    );
  }

  const workingTime = reviewWorkingTime(input.role.workingTime, bundle.release.workingTime);
  missing.push(...workingTime.missing);
  conflicts.push(...workingTime.conflicts);

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

  if (conflicts.length > 0) {
    return { failure: { kind: "conflict", reasons: conflicts, trace: [] } };
  }
  if (unsupported.length > 0) {
    return { failure: { kind: "unsupported", reasons: unsupported, trace: [] } };
  }
  if (missing.length > 0) {
    return { failure: { kind: "needs_input", missing, trace: [] } };
  }
  return { workingTime: workingTime.assessment };
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
  vacation: VacationEntitlement;
}

/**
 * Constrói os três calendários do horizonte.
 *
 * A correção que este bloco carrega (MOT-P0-008): as férias do ano da
 * admissão deixaram de ser retiradas à capacidade desse ano só porque foram
 * adquiridas nele. O que se retira é o que a lei permite GOZAR — e o que
 * sobra transita, com prazo, para o ano seguinte.
 */
function buildCalendars(
  input: EmploymentOfferInput,
  bundle: EmploymentPolicyBundle,
): Calendars {
  const { context } = input;
  const start = parseISODate(context.contractStart);
  const startYear = start.year;
  const weekdays = input.role.workingTime.workingWeekdays;
  const vacationPolicy = bundle.release.vacation;

  const admissionSkeleton = buildWorkCalendar({
    year: startYear,
    jurisdiction: context.jurisdiction,
    startDate: context.contractStart,
    endDate: context.contractEnd,
    workingWeekdays: weekdays,
    municipalHoliday: input.role.municipalHoliday,
    vacationWorkdays: 0,
    mainVacationMonth: input.role.mainVacationMonth,
  });

  const vacation = assessVacation({
    policy: vacationPolicy,
    contractStart: context.contractStart,
    contractEnd: context.contractEnd,
    completeContractMonthsInAdmissionYear: admissionSkeleton.completeContractMonths,
  });

  const earliestMonth = earliestLeaveMonth(vacation, startYear);
  const admission = buildWorkCalendar({
    year: startYear,
    jurisdiction: context.jurisdiction,
    startDate: context.contractStart,
    endDate: context.contractEnd,
    workingWeekdays: weekdays,
    municipalHoliday: input.role.municipalHoliday,
    vacationWorkdays: vacation.admissionYearUsableWorkdays,
    mainVacationMonth: input.role.mainVacationMonth,
    // Nenhum dia de férias pode cair antes de o direito ser gozável.
    earliestVacationMonth: earliestMonth,
  });

  const nextYear = startYear + 1;
  const fullYearStart = toISODate({ year: nextYear, month: 1, day: 1 });
  const secondYear = buildWorkCalendar({
    year: nextYear,
    jurisdiction: context.jurisdiction,
    startDate: fullYearStart,
    endDate: context.contractEnd,
    workingWeekdays: weekdays,
    municipalHoliday: input.role.municipalHoliday,
    vacationWorkdays: vacation.secondYearWorkdays,
    mainVacationMonth: input.role.mainVacationMonth,
  });
  const stabilized = context.contractEnd
    ? buildWorkCalendar({
        year: nextYear,
        jurisdiction: context.jurisdiction,
        startDate: fullYearStart,
        workingWeekdays: weekdays,
        municipalHoliday: input.role.municipalHoliday,
        vacationWorkdays: vacationPolicy.annualWorkdays,
        mainVacationMonth: input.role.mainVacationMonth,
      })
    : buildWorkCalendar({
        year: nextYear,
        jurisdiction: context.jurisdiction,
        startDate: fullYearStart,
        workingWeekdays: weekdays,
        municipalHoliday: input.role.municipalHoliday,
        // O ano ESTABILIZADO é o ano recorrente: 22 dias, sem o saldo de
        // admissão, que só existe uma vez.
        vacationWorkdays: vacationPolicy.annualWorkdays,
        mainVacationMonth: input.role.mainVacationMonth,
      });

  return {
    admission,
    secondYear,
    stabilized,
    startYear,
    startMonth: admission.firstActiveMonth,
    admissionMonths: admission.activeMonths,
    vacation,
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
  bundle: EmploymentPolicyBundle,
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
      jurisdiction: input.context.jurisdiction,
    };
    let projectionError: Exclude<ProjectionPreparation, { kind: "ready" }> | undefined;
    const solved = solveBaseSalaryForEmployerBudget(budget, (candidate) => {
      const projected = projectEmployee(
        input,
        candidate,
        referenceEmployee,
        bundle,
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
    : workerRangeProfiles(input.context.jurisdiction);
  const referenceMealDays = context.stabilizedSlots[0]?.mealDays ?? 0;
  const solvedBases: Money[] = [];
  for (const profile of profiles) {
    const solved = solveBaseSalaryForTargetNet({
      template: monthlyInput(input, ZERO, profile, referenceMealDays),
      baseSalaryLineId: "base-salary",
      targetNetPayable: target,
      maximumGross: eurCents(Math.max(5_000_000, target.cents * 5)),
      tolerance: eurCents(1),
    }, bundle.release.payroll, bundle.withholding);
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
      // Horas PAGAS: o período normal. Um pico de adaptabilidade é
      // compensado dentro do período de referência e não acrescenta horas
      // contratadas ao ano (MOT-P0-007).
      weeklyHoursHundredths: input.role.workingTime.normalWeeklyHoursHundredths,
      workingWeekdaysPerWeek: input.role.workingTime.workingWeekdays.length,
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
  bundle: EmploymentPolicyBundle,
): EmploymentOfferPreparation {
  const payrollPolicy = bundle.release.payroll;
  const validation = validate(input, bundle);
  if (validation.failure) return validation.failure;
  const workingTime = validation.workingTime!;

  const calendars = buildCalendars(input, bundle);
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

  const resolvedBase = resolveBaseSalary(input, bundle, context, recurring);
  if (typeof resolvedBase !== "object" || !("currency" in resolvedBase)) {
    return resolvedBase as EmploymentOfferPreparation;
  }

  // Gate do piso legal. Corre ANTES do payroll: uma proposta abaixo do
  // mínimo aplicável não é um aviso, é um conflito — e sem IRCT identificado
  // o motor não afirma conformidade salarial (MOT-P0-006, MOT-P0-011).
  const minimumWage: MinimumWageVerdict = assessMinimumWage({
    policy: bundle.release.minimumWage,
    jurisdiction: input.context.jurisdiction,
    onDate: input.context.contractStart,
    offered: resolvedBase,
    workingTime,
    collectiveAgreement: input.role.collectiveAgreement,
  });
  if (minimumWage.kind === "below_floor") {
    return {
      kind: "conflict",
      reasons: [
        `A retribuição base proposta fica abaixo do piso aplicável a este posto. Piso: ${(minimumWage.floor.cents / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })} (${minimumWage.basis}).`,
      ],
      trace: [],
    };
  }

  const employees: readonly PayrollEmployee[] = input.candidate
    ? [input.candidate]
    : workerRangeProfiles(input.context.jurisdiction);
  const projections: EmployeeProjection[] = [];
  for (const employee of employees) {
    const projected = projectEmployee(input, resolvedBase, employee, bundle, context);
    if (projected.kind !== "ready") return errorFromProjection(projected);
    projections.push(projected.value);
  }

  const reference = projections[0]!;
  const worker = workerOutcome(projections, input.context.jurisdiction);

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
    lastActiveMonth: input.context.contractEnd
      ? {
          year: parseISODate(input.context.contractEnd).year,
          month: parseISODate(input.context.contractEnd).month,
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
  const supports = assessHiringSupports({
    catalogue: bundle.release.supports,
    asOf: input.context.simulationAsOf,
    facts: {
      ...input.supportFacts,
      // O piso do +Talento afere-se à proposta resolvida, não a um número
      // que a pessoa tenha de reescrever noutro campo.
      monthlyBaseSalary: input.supportFacts?.monthlyBaseSalary ?? resolvedBase,
      fullTime: input.supportFacts?.fullTime ?? (workingTime.partTime ? false : undefined),
    },
  });
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

  const legalFloorGaps: MissingInput[] = minimumWage.kind === "legal_floor_unconfirmed"
    ? [{
        path: "role.collectiveAgreement",
        reason: minimumWage.reason,
        expected: "IRCT aplicável e tabela da categoria, ou confirmação de que não existe instrumento",
      }]
    : [];

  const blocking: MissingInput[] = [
    ...costs.blocking,
    ...legalFloorGaps,
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
      label: "Férias do ano da admissão: adquiridas, gozáveis e transportadas",
      formula: "adquirido = min(20; 2 × meses completos); gozável só após seis meses completos",
      operands: [
        { name: "meses_completos", value: calendars.admission.completeContractMonths, unit: "COUNT" },
        { name: "dias_adquiridos", value: calendars.vacation.admissionYearAccruedWorkdays, unit: "COUNT" },
        { name: "gozavel_a_partir_de", value: calendars.vacation.earliestLeaveDate, unit: "DATE" },
        { name: "dias_transportados", value: calendars.vacation.carriedOverWorkdays, unit: "COUNT" },
      ],
      result: calendars.vacation.admissionYearUsableWorkdays,
      rounding: "towards_zero",
      citations: [...VACATION_CITATIONS],
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

  const provenance: ResultProvenance = {
    releaseId: bundle.release.releaseId,
    releaseStatus: bundle.release.status,
    knowledgeAsOf: bundle.release.knowledgeAsOf,
    effective: bundle.release.effective,
    jurisdiction: input.context.jurisdiction,
    coverage: bundle.release.domains,
    approvals: bundle.release.approvals.map((approval) => ({
      role: approval.role,
      by: approval.by,
      at: approval.at,
    })),
    // Três estados distintos que a copy tinha fundido num só (MOT-P0-002).
    policyApproved: bundle.release.approvals.some(
      (approval) => approval.role === "professional_review",
    ) && bundle.release.status === "approved",
    userReviewedInputs: input.review?.reviewedAt !== undefined,
    calculationReproducible: true,
  };

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
        ...VACATION_CITATIONS,
        ...workingTime.citations,
        ...minimumWage.sourceIds,
        ...supports.flatMap((support) => support.sourceIds),
      ]),
      engineVersion: EMPLOYMENT_OFFER_ENGINE_VERSION,
      provenance,
      minimumWage,
      workingTime,
      vacation: calendars.vacation,
      referencePayroll: reference.reference,
    },
  };
}

/** Política auxiliar para consumidores que querem apenas ppm sem importar money. */
export const productiveShareRate = (percent: number): Rate =>
  ratePpm(Math.max(0, Math.min(1_000_000, Math.round(percent * 10_000))));

