import { describe, expect, it } from "vitest";
import {
  PORTUGAL_PAYROLL_POLICY_2026,
  eurCents,
  planEmploymentOffer,
  ratePpm,
} from "../src";
import {
  confirmed,
  estimated,
  notApplicable,
  offerInput,
  unknownCostFact,
  withholding10,
} from "./employment-offer-fixtures";

const plan = (input: Parameters<typeof planEmploymentOffer>[0]) =>
  planEmploymentOffer(input, PORTUGAL_PAYROLL_POLICY_2026, withholding10);

describe("Employment Offer Planner", () => {
  it("compõe payroll, custos do posto, calendário e capacidade sem fórmulas no consumidor", () => {
    const prepared = plan(offerInput());
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;

    const result = prepared.result;
    expect(result.projection).toBe("personalized_projection");
    expect(result.employerCost.annualStabilized.cents).toBeGreaterThan(200_000 * 14);
    expect(result.workerOutcome.kind).toBe("personalized_projection");
    expect(result.publicCharges.employerSocialSecurity.cents).toBeGreaterThan(0);
    expect(result.calendar).toHaveLength(24);
    expect(result.capacity?.costPerProductiveHour?.cents).toBeGreaterThan(0);
    expect(result.trace.some((step) => step.id === "employment-offer.employer-cost")).toBe(true);
  });

  it("devolve cenários de referência quando a empresa não conhece factos pessoais", () => {
    const prepared = plan(offerInput({ candidate: undefined }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.result.projection).toBe("reference_scenarios");
    const worker = prepared.result.workerOutcome;
    if (worker.kind !== "reference_scenarios") throw new Error("esperava cenários de referência");
    expect(worker.profilesEvaluated).toBe(4);
    expect(worker.scenarioLabels).toHaveLength(4);
    expect(worker.annualNet.min.cents).toBeLessThanOrEqual(worker.annualNet.max.cents);
    expect(prepared.result.assumptions.some((item) => item.id === "worker-profile-range")).toBe(true);
  });

  it("mantém apoios condicionais fora do custo", () => {
    const withSupport = plan(offerInput({
      supportFacts: {
        registeredUnemployed: true,
        permanentContract: true,
        fullTime: true,
        applicationBeforeContract: true,
        candidateAge: 29,
        qualificationLevel: 7,
      },
    }));
    const without = plan(offerInput());
    expect(withSupport.kind).toBe("ready");
    expect(without.kind).toBe("ready");
    if (withSupport.kind !== "ready" || without.kind !== "ready") return;
    expect(withSupport.result.supports.some((item) => item.status === "potential")).toBe(true);
    expect(withSupport.result.employerCost.annualStabilized)
      .toEqual(without.result.employerCost.annualStabilized);
  });

  it("bloqueia benefício sem matriz factual em vez de o classificar pelo nome", () => {
    const prepared = plan(offerInput({
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
    }));
    expect(["needs_input", "unsupported"]).toContain(prepared.kind);
  });
});

describe("completude e veredicto (CON-P0-03 a CON-P0-06)", () => {
  it("um seguro desconhecido impede qualquer veredicto positivo", () => {
    const prepared = plan(offerInput({
      postCosts: { accidentInsurance: unknownCostFact() },
    }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.result.status.readiness).toBe("incomplete");
    expect(prepared.result.status.verdictAllowed).toBe(false);
    expect(prepared.result.status.blockingFacts.length).toBeGreaterThan(0);
  });

  it("um seguro confirmado a zero não é uma confirmação válida", () => {
    const prepared = plan(offerInput({
      postCosts: { accidentInsurance: confirmed(0) },
    }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.result.status.verdictAllowed).toBe(false);
  });

  it("nem sequer «não se aplica» dispensa o seguro obrigatório", () => {
    const prepared = plan(offerInput({
      postCosts: { accidentInsurance: notApplicable("achamos que não precisa") },
    }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.result.status.readiness).toBe("incomplete");
  });

  it("uma SST estimada deixa o cenário em estimativa, não em incompleto", () => {
    const prepared = plan(offerInput({
      postCosts: { healthAndSafety: estimated(200_00) },
    }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.result.status.readiness).toBe("estimated");
    expect(prepared.result.status.verdictAllowed).toBe(true);
  });

  it("distingue zero confirmado de desconhecido no total do posto", () => {
    const zero = plan(offerInput({ postCosts: { other: confirmed(0) } }));
    const naoSei = plan(offerInput({ postCosts: { other: unknownCostFact() } }));
    expect(zero.kind).toBe("ready");
    expect(naoSei.kind).toBe("ready");
    if (zero.kind !== "ready" || naoSei.kind !== "ready") return;
    // O custo conhecido é o mesmo; o que muda é a confiança.
    expect(naoSei.result.employerCost.annualStabilized)
      .toEqual(zero.result.employerCost.annualStabilized);
    expect(zero.result.status.readiness).toBe("personalized");
    expect(naoSei.result.status.readiness).toBe("estimated");
    expect(naoSei.result.employerCost.postCostSummary.unknownIds).toContain("other");
  });

  it("só uma revisão explícita autoriza o estado validado", () => {
    const prepared = plan(offerInput({ review: { reviewedAt: "2026-08-31" } }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.result.status.readiness).toBe("validated");
    expect(prepared.result.status.headline).toContain("2026-08-31");
  });

  it("INVARIANTE: bloqueio implica veredicto proibido", () => {
    const cenarios = [
      offerInput({ postCosts: { accidentInsurance: unknownCostFact() } }),
      offerInput({ postCosts: { accidentInsurance: confirmed(0) } }),
      offerInput({ role: { productiveShare: undefined } }),
    ];
    for (const cenario of cenarios) {
      const prepared = plan(cenario);
      if (prepared.kind !== "ready") continue;
      const { status } = prepared.result;
      expect(status.blockingFacts.length > 0).toBe(!status.verdictAllowed);
    }
  });
});

describe("perfil patronal e tempo de trabalho (CON-P0-08, CON-P0-09)", () => {
  it("recusa um regime contributivo que não sabe calcular", () => {
    const prepared = plan(offerInput({ employer: { contributionRegime: "outro" } }));
    expect(prepared.kind).toBe("unsupported");
  });

  it("pede o enquadramento em vez de o inferir", () => {
    const prepared = plan(offerInput({ employer: { contributionRegime: "nao_sei" } }));
    expect(prepared.kind).toBe("needs_input");
    if (prepared.kind !== "needs_input") return;
    expect(prepared.missing.some((item) => item.path === "employer.contributionRegime")).toBe(true);
  });

  it("não aceita 80 horas por semana como situação normal", () => {
    const prepared = plan(offerInput({ role: { weeklyHoursHundredths: 8_000 } }));
    expect(prepared.kind).toBe("unsupported");
  });

  it("aceita 48 horas quando o regime de adaptabilidade coletiva é declarado", () => {
    const prepared = plan(offerInput({
      role: {
        weeklyHoursHundredths: 4_800,
        workingTimeRegime: "adaptability_collective",
      },
    }));
    expect(prepared.kind).toBe("ready");
  });

  it("recusa um horário diário acima do limite do regime", () => {
    const prepared = plan(offerInput({
      role: { weeklyHoursHundredths: 4_000, workingWeekdays: [1, 2, 3] },
    }));
    expect(prepared.kind).toBe("unsupported");
  });
});

describe("calendário e primeiro ano (CON-P0-10 a CON-P0-13)", () => {
  it("separa ano civil, doze meses do vínculo e ano estabilizado", () => {
    const prepared = plan(offerInput({ role: { startDate: "2026-09-01" } }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    const cost = prepared.result.employerCost;
    expect(cost.monthsWorkedFirstYear).toBe(4);
    expect(cost.firstCalendarYear.cents).toBeLessThan(cost.annualStabilized.cents);
    expect(cost.firstTwelveMonths.cents).toBeGreaterThan(cost.firstCalendarYear.cents);
    expect(cost.peakMonth).not.toBeNull();
  });

  it("o subsídio de férias acompanha o gozo declarado e não junho", () => {
    const prepared = plan(offerInput({ role: { mainVacationMonth: 9 } }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    const setembro = prepared.result.calendar.find(
      (month) => month.year === 2026 && month.month === 9,
    );
    const junho = prepared.result.calendar.find(
      (month) => month.year === 2026 && month.month === 6,
    );
    expect(setembro?.labels.some((label) => label.includes("Subsídio de férias"))).toBe(true);
    expect(junho?.labels.some((label) => label.includes("Subsídio de férias"))).toBe(false);
  });

  it("o subsídio de Natal fica em dezembro", () => {
    const prepared = plan(offerInput());
    if (prepared.kind !== "ready") throw new Error("esperava resultado");
    const dezembro = prepared.result.calendar.find(
      (month) => month.year === 2026 && month.month === 12,
    );
    expect(dezembro?.labels.some((label) => label.includes("Natal"))).toBe(true);
  });

  it("conta a refeição por dias elegíveis, não por 22 × 12", () => {
    const prepared = plan(offerInput());
    if (prepared.kind !== "ready") throw new Error("esperava resultado");
    const dias = prepared.result.workCalendar.mealEligibleDays;
    expect(dias).toBeLessThan(264);
    expect(dias).toBeGreaterThan(200);
    expect(prepared.result.employerCost.breakdown.mealAllowance.cents).toBe(750 * dias);
  });

  it("aplica férias proporcionais no ano da admissão", () => {
    const prepared = plan(offerInput({ role: { startDate: "2026-09-01" } }));
    if (prepared.kind !== "ready") throw new Error("esperava resultado");
    expect(prepared.result.trace.some((step) => step.id === "employment-offer.admission-vacation")).toBe(true);
    expect(prepared.result.assumptions.some((item) => item.id === "admission-year-vacation")).toBe(true);
  });

  it("um contrato que termina não gera caixa depois do termo", () => {
    const prepared = plan(offerInput({
      role: { startDate: "2026-01-01", contractEndDate: "2026-06-30", contractKind: "fixed_term" },
    }));
    if (prepared.kind !== "ready") throw new Error("esperava resultado");
    const julho = prepared.result.calendar.find(
      (month) => month.year === 2026 && month.month === 7,
    );
    expect(julho?.active).toBe(false);
    expect(julho?.employerCost.cents).toBe(0);
  });
});

describe("capacidade (CON-P0-14 a CON-P0-16)", () => {
  it("com margem de 100% a fórmula coincide com custo ÷ preço", () => {
    const prepared = plan(offerInput({
      capacity: { pricePerProductiveHour: eurCents(5_000), contributionMargin: ratePpm(1_000_000) },
    }));
    if (prepared.kind !== "ready") throw new Error("esperava resultado");
    const capacity = prepared.result.capacity!;
    const esperado = Math.ceil(
      (prepared.result.employerCost.annualStabilized.cents / 5_000) * 100,
    ) / 100;
    expect(capacity.billableHoursRequired).toBeCloseTo(esperado, 2);
  });

  it("reduzir a margem nunca reduz as horas necessárias", () => {
    const cheia = plan(offerInput({
      capacity: { pricePerProductiveHour: eurCents(5_000), contributionMargin: ratePpm(1_000_000) },
    }));
    const meia = plan(offerInput({
      capacity: { pricePerProductiveHour: eurCents(5_000), contributionMargin: ratePpm(500_000) },
    }));
    if (cheia.kind !== "ready" || meia.kind !== "ready") throw new Error("esperava resultados");
    expect(meia.result.capacity!.billableHoursRequired!)
      .toBeGreaterThanOrEqual(cheia.result.capacity!.billableHoursRequired!);
  });

  it("aumentar o preço nunca aumenta as horas necessárias", () => {
    const barato = plan(offerInput({
      capacity: { pricePerProductiveHour: eurCents(4_000), contributionMargin: ratePpm(650_000) },
    }));
    const caro = plan(offerInput({
      capacity: { pricePerProductiveHour: eurCents(8_000), contributionMargin: ratePpm(650_000) },
    }));
    if (barato.kind !== "ready" || caro.kind !== "ready") throw new Error("esperava resultados");
    expect(caro.result.capacity!.billableHoursRequired!)
      .toBeLessThanOrEqual(barato.result.capacity!.billableHoursRequired!);
  });

  it("feriados, férias e formação saem das horas disponíveis", () => {
    const prepared = plan(offerInput());
    if (prepared.kind !== "ready") throw new Error("esperava resultado");
    const capacity = prepared.result.capacity!;
    expect(capacity.holidayHoursHundredths).toBeGreaterThan(0);
    expect(capacity.vacationHoursHundredths).toBeGreaterThan(0);
    expect(capacity.trainingHoursHundredths).toBe(4_000);
    expect(capacity.annualAvailableHoursHundredths)
      .toBeLessThan(capacity.paidHoursHundredths);
  });

  it("avisa quando a expectativa ultrapassa a capacidade real", () => {
    const prepared = plan(offerInput({
      capacity: {
        pricePerProductiveHour: eurCents(5_000),
        contributionMargin: ratePpm(650_000),
        expectedBillableHoursMonthly: 300,
      },
    }));
    if (prepared.kind !== "ready") throw new Error("esperava resultado");
    expect(prepared.result.capacity?.expectationExceedsCapacity).toBe(true);
    expect(prepared.result.capacity?.notes.length).toBeGreaterThan(0);
    // É um alerta sobre o RETORNO, não uma lacuna de custo: não bloqueia o
    // veredicto, mas impede que o cenário passe por confirmado.
    expect(prepared.result.status.readiness).toBe("estimated");
    expect(prepared.result.assumptions.some((item) => item.id === "capacity-expectation-exceeds")).toBe(true);
  });

  it("preço sem margem não inventa horas", () => {
    const prepared = plan(offerInput({
      capacity: { pricePerProductiveHour: eurCents(5_000), contributionMargin: undefined },
    }));
    if (prepared.kind !== "ready") throw new Error("esperava resultado");
    expect(prepared.result.capacity?.billableHoursRequired).toBeNull();
    expect(prepared.result.capacity?.notes.length).toBeGreaterThan(0);
  });
});

describe("invariantes financeiros", () => {
  it("aumentar uma parcela positiva nunca reduz o custo anual", () => {
    const base = plan(offerInput());
    const maior = plan(offerInput({ postCosts: { other: confirmed(500_00) } }));
    if (base.kind !== "ready" || maior.kind !== "ready") throw new Error("esperava resultados");
    expect(maior.result.employerCost.annualStabilized.cents)
      .toBeGreaterThanOrEqual(base.result.employerCost.annualStabilized.cents);
  });

  it("o custo patronal nunca é inferior ao bruto em dinheiro", () => {
    const prepared = plan(offerInput());
    if (prepared.kind !== "ready") throw new Error("esperava resultado");
    expect(prepared.result.employerCost.annualStabilized.cents)
      .toBeGreaterThan(prepared.result.workerOutcome.annualGross.cents);
  });

  it("o intervalo do custo nunca é mais estreito do que o valor conhecido", () => {
    const prepared = plan(offerInput({ postCosts: { software: unknownCostFact() } }));
    if (prepared.kind !== "ready") throw new Error("esperava resultado");
    const range = prepared.result.employerCost.annualRange;
    expect(range.high.cents).toBeGreaterThanOrEqual(range.low.cents);
    expect(range.low.cents).toBe(prepared.result.employerCost.annualStabilized.cents);
  });
});
