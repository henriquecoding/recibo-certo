import { describe, expect, it } from "vitest";
import {
  PORTUGAL_PAYROLL_POLICY_2026,
  calculateGarnishment,
  calculateParentalBenefit,
  calculatePayroll,
  calculateSicknessBenefit,
  eurCents,
  ratePpm,
  solveBaseSalaryForTargetNet,
  type PayrollInput,
  type WithholdingResolver,
} from "../src";

const employee: PayrollInput["employee"] = {
  dependants: 0,
  maritalStatus: "not_married",
  disability: false,
  jurisdiction: "PT-CONTINENTE",
};

const flatTenPercent: WithholdingResolver = (request) => ({
  amount: eurCents(Math.round(request.taxableAmount.cents / 10)),
  effectiveRate: ratePpm(100_000),
  trace: [],
});

describe("motor mensal de payroll por rubrica", () => {
  it("separa bruto, bases, descontos, líquido e custo por linha", () => {
    const result = calculatePayroll({
      period: "2026-07",
      weeklyHoursHundredths: 4_000,
      employee,
      lines: [
        { id: "base", label: "Vencimento base", kind: "base_salary", amount: eurCents(200_000) },
        { id: "meal", label: "Refeição", kind: "meal_allowance", days: 20, dailyAmount: eurCents(700), method: "cash" },
      ],
    }, PORTUGAL_PAYROLL_POLICY_2026, flatTenPercent);

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.result.totals).toMatchObject({
      cashGross: eurCents(214_000),
      irsTaxable: eurCents(201_700),
      socialSecurityBase: eurCents(201_700),
      irsWithheld: eurCents(20_170),
      employeeSocialSecurity: eurCents(22_187),
      netPayable: eurCents(171_643),
      employerSocialSecurity: eurCents(47_904),
      employerCost: eurCents(261_904),
    });
    expect(result.result.lines.find((line) => line.id === "meal")).toMatchObject({
      irsTaxable: eurCents(1_700),
      socialSecurityBase: eurCents(1_700),
      classification: "partially_exempt",
    });
  });

  it("calcula hora extra pela fórmula do CT e conserva a retenção autónoma", () => {
    const result = calculatePayroll({
      period: "2026-07",
      weeklyHoursHundredths: 4_000,
      hourlyReferenceRemuneration: eurCents(200_000),
      employee,
      lines: [
        { id: "base", label: "Base", kind: "base_salary", amount: eurCents(200_000) },
        {
          id: "ot",
          label: "Primeira hora extra",
          kind: "overtime",
          hoursHundredths: 100,
          annualHoursBeforeHundredths: 0,
          segment: "working_day_first_hour",
        },
      ],
    }, PORTUGAL_PAYROLL_POLICY_2026, flatTenPercent);
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.result.lines[1]).toMatchObject({
      cashGross: eurCents(1_443),
      irsTaxable: eurCents(1_443),
      socialSecurityBase: eurCents(1_443),
      irsWithheld: eurCents(144),
    });
    expect(result.result.lines[1]!.bucket).toBe("overtime_autonomous");
  });

  it("pede a divisão de horas que atravessam o limiar anual de 100", () => {
    const result = calculatePayroll({
      period: "2026-07",
      weeklyHoursHundredths: 4_000,
      hourlyReferenceRemuneration: eurCents(100_000),
      employee,
      lines: [{
        id: "ot",
        label: "Hora fronteira",
        kind: "overtime",
        hoursHundredths: 100,
        annualHoursBeforeHundredths: 9_950,
        segment: "working_day_first_hour",
      }],
    }, PORTUGAL_PAYROLL_POLICY_2026, flatTenPercent);
    expect(result.kind).toBe("needs_input");
  });

  it("não presume a regularidade contributiva de um prémio", () => {
    const result = calculatePayroll({
      period: "2026-07",
      weeklyHoursHundredths: 4_000,
      employee,
      lines: [{
        id: "award",
        label: "Prémio",
        kind: "performance_award",
        amount: eurCents(50_000),
        socialSecurityRegularity: "unknown",
      }],
    }, PORTUGAL_PAYROLL_POLICY_2026, flatTenPercent);
    expect(result.kind).toBe("needs_input");
  });

  it("trata fracionamento de subsídio com base de referência própria", () => {
    const requests: { taxable: number; reference: number }[] = [];
    const resolver: WithholdingResolver = (request) => {
      requests.push({ taxable: request.taxableAmount.cents, reference: request.rateReferenceAmount.cents });
      return flatTenPercent(request);
    };
    const result = calculatePayroll({
      period: "2026-07",
      weeklyHoursHundredths: 4_000,
      employee,
      lines: [{
        id: "holiday",
        label: "Duodécimo férias",
        kind: "holiday_subsidy",
        amountPaid: eurCents(10_000),
        fullEntitlement: eurCents(120_000),
      }],
    }, PORTUGAL_PAYROLL_POLICY_2026, resolver);
    expect(result.kind).toBe("ready");
    expect(requests).toContainEqual({ taxable: 10_000, reference: 120_000 });
  });

  it("valoriza viatura em espécie com bases distintas para IRS e SS", () => {
    const result = calculatePayroll({
      period: "2026-07",
      weeklyHoursHundredths: 4_000,
      employee,
      lines: [{
        id: "car",
        label: "Viatura",
        kind: "routed_benefit",
        benefitKind: "company_car",
        facts: {
          writtenAgreement: true,
          personalUse: true,
          marketValueJanuary1Cents: 2_000_000,
          acquisitionValueCents: 3_000_000,
        },
      }],
    }, PORTUGAL_PAYROLL_POLICY_2026, flatTenPercent);
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.result.lines[0]).toMatchObject({
      cashGross: eurCents(0),
      irsTaxable: eurCents(15_000),
      socialSecurityBase: eurCents(22_500),
    });
  });

  it("falha de forma explícita para benefícios ainda sem matriz factual", () => {
    const result = calculatePayroll({
      period: "2026-07",
      weeklyHoursHundredths: 4_000,
      employee,
      lines: [{ id: "stock", label: "Stock option", kind: "routed_benefit", benefitKind: "stock_option" }],
    }, PORTUGAL_PAYROLL_POLICY_2026, flatTenPercent);
    expect(result.kind).toBe("unsupported");
  });

  it("não atribui restos de retenção a linhas isentas", () => {
    const unevenResolver: WithholdingResolver = (request) => ({
      amount: eurCents(request.taxableAmount.cents > 0 ? 101 : 0),
      effectiveRate: ratePpm(1_000),
      trace: [],
    });
    const result = calculatePayroll({
      period: "2026-07",
      weeklyHoursHundredths: 4_000,
      employee,
      lines: [
        { id: "base", label: "Base", kind: "base_salary", amount: eurCents(100_000) },
        { id: "meal", label: "Refeição", kind: "meal_allowance", days: 20, dailyAmount: eurCents(600), method: "cash" },
      ],
    }, PORTUGAL_PAYROLL_POLICY_2026, unevenResolver);
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.result.lines.find((line) => line.id === "meal")?.irsWithheld.cents).toBe(0);
    expect(result.result.totals.irsWithheld.cents).toBe(101);
  });
});

describe("penhora e simulação inversa", () => {
  it("aplica a proteção geral de dois terços com limites de RMMG", () => {
    expect(calculateGarnishment(
      eurCents(300_000),
      { type: "ordinary", otherIncomeAvailable: false },
      eurCents(92_000),
    )).toMatchObject({ kind: "ok", amount: eurCents(100_000) });
    expect(calculateGarnishment(
      eurCents(50_000),
      { type: "ordinary", otherIncomeAvailable: false },
      eurCents(92_000),
    )).toMatchObject({ kind: "ok", amount: eurCents(0) });
  });

  it("encontra o menor bruto dentro da tolerância", () => {
    const result = solveBaseSalaryForTargetNet({
      template: {
        period: "2026-07",
        weeklyHoursHundredths: 4_000,
        employee,
        lines: [{ id: "base", label: "Base", kind: "base_salary", amount: eurCents(0) }],
      },
      baseSalaryLineId: "base",
      targetNetPayable: eurCents(79_000),
      maximumGross: eurCents(200_000),
      tolerance: eurCents(1),
    }, PORTUGAL_PAYROLL_POLICY_2026, flatTenPercent);
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(Math.abs(result.payroll.totals.netPayable.cents - 79_000)).toBeLessThanOrEqual(1);
  });
});

describe("prestações sociais separadas do recibo do empregador", () => {
  const sixMonths = Array.from({ length: 6 }, () => eurCents(100_000));

  it("calcula doença com três dias de espera e taxa de 55%", () => {
    const result = calculateSicknessBenefit({
      registeredRemunerationSixMonths: sixMonths,
      incapacityDays: 10,
      firstDayException: false,
      qualifiesForFivePointIncrease: false,
      tuberculosis: false,
      netDailyReference: eurCents(2_500),
    });
    expect(result).toMatchObject({
      kind: "ok",
      dailyReference: eurCents(3_333),
      dailyBenefit: eurCents(1_833),
      payableDays: 7,
      total: eurCents(12_831),
    });
  });

  it("calcula parentalidade e acréscimo regional de 2% sobre a prestação", () => {
    const result = calculateParentalBenefit({
      registeredRemunerationSixMonths: sixMonths,
      payableDays: 30,
      modality: "150_days_not_shared",
      autonomousRegion: true,
      partTimeAccumulation: false,
    });
    expect(result).toMatchObject({
      kind: "ok",
      dailyReference: eurCents(3_333),
      dailyBenefit: eurCents(2_719),
      total: eurCents(81_570),
    });
  });
});
