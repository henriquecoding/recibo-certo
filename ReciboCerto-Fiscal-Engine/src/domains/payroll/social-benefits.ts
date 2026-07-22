import { addMoney, eurCents, multiplyRate, ratePpm, type Money, type Rate } from "../../core/money";
import type { MissingInput, TraceStep } from "../../core/model";

export type SocialBenefitResult =
  | { kind: "ok"; dailyReference: Money; dailyBenefit: Money; payableDays: number; total: Money; trace: readonly TraceStep[] }
  | { kind: "needs_input"; missing: readonly MissingInput[]; trace: readonly TraceStep[] }
  | { kind: "conflict"; reasons: readonly string[]; trace: readonly TraceStep[] };

function dailyReferenceFromSixMonths(values: readonly Money[]): Money | undefined {
  if (values.length !== 6 || values.some((value) => value.cents < 0 || !Number.isSafeInteger(value.cents))) {
    return undefined;
  }
  return eurCents(Math.round(addMoney(...values).cents / 180));
}

function benefitTotal(daily: Money, days: number): Money {
  return eurCents(daily.cents * days);
}

export interface SicknessBenefitInput {
  /** Seis remunerações mais antigas dos oito meses anteriores, sem férias/Natal/análogos. */
  registeredRemunerationSixMonths: readonly Money[];
  incapacityDays: number;
  waitingDaysAlreadySatisfied?: number;
  firstDayException: boolean;
  tuberculosis: boolean;
  familyDependants?: number;
  qualifiesForFivePointIncrease?: boolean;
  /** Limite líquido diário apurado sobre a mesma remuneração de referência. */
  netDailyReference?: Money;
}

function sicknessRate(input: SicknessBenefitInput): Rate | undefined {
  if (input.tuberculosis) {
    if (input.familyDependants === undefined) return undefined;
    return ratePpm(input.familyDependants > 2 ? 1_000_000 : 800_000);
  }
  const base = input.incapacityDays <= 30
    ? 550_000
    : input.incapacityDays <= 90
      ? 600_000
      : input.incapacityDays <= 365
        ? 700_000
        : 750_000;
  const increase = base <= 600_000 && input.qualifiesForFivePointIncrease ? 50_000 : 0;
  return ratePpm(base + increase);
}

export function calculateSicknessBenefit(input: SicknessBenefitInput): SocialBenefitResult {
  const dailyReference = dailyReferenceFromSixMonths(input.registeredRemunerationSixMonths);
  if (!dailyReference || !Number.isSafeInteger(input.incapacityDays) || input.incapacityDays < 0) {
    return { kind: "conflict", reasons: ["Histórico remuneratório ou duração de doença inválidos."], trace: [] };
  }
  const missing: MissingInput[] = [];
  if (input.netDailyReference === undefined) missing.push({
    path: "netDailyReference",
    reason: "O subsídio diário não pode exceder a remuneração de referência líquida.",
  });
  if (input.tuberculosis && input.familyDependants === undefined) missing.push({
    path: "familyDependants",
    reason: "A taxa de tuberculose depende do número de familiares a cargo.",
  });
  if (!input.tuberculosis && input.incapacityDays <= 90 && input.qualifiesForFivePointIncrease === undefined) {
    missing.push({
      path: "qualifiesForFivePointIncrease",
      reason: "Nas taxas de 55%/60% pode acrescer 5 p.p. por condições familiares/remuneratórias.",
    });
  }
  if (missing.length > 0) return { kind: "needs_input", missing, trace: [] };

  const rate = sicknessRate(input)!;
  const percentageValue = multiplyRate(dailyReference, rate);
  // 30% de 1/30 da RMMG 2026 = 9,20 €; se RR for inferior, o piso é a própria RR.
  const statutoryFloor = eurCents(Math.min(920, dailyReference.cents));
  const beforeNetCap = eurCents(Math.max(percentageValue.cents, statutoryFloor.cents));
  const dailyBenefit = eurCents(Math.min(beforeNetCap.cents, input.netDailyReference!.cents));
  const waitingDays = input.firstDayException
    ? 0
    : Math.max(0, 3 - Math.max(0, input.waitingDaysAlreadySatisfied ?? 0));
  const payableDays = Math.max(0, input.incapacityDays - waitingDays);
  const total = benefitTotal(dailyBenefit, payableDays);
  const trace: TraceStep[] = [{
    id: "payroll.social-benefit.sickness",
    label: "Subsídio de doença estimado",
    formula: "min(limite_líquido, max(RR_diária × taxa, piso)) × dias_pagáveis",
    operands: [
      { name: "RR_diária", value: dailyReference.cents, unit: "EUR_CENTS" },
      { name: "taxa", value: rate.ppm, unit: "PPM" },
      { name: "dias_incapacidade", value: input.incapacityDays, unit: "COUNT" },
      { name: "dias_espera", value: waitingDays, unit: "COUNT" },
    ],
    result: total.cents,
    rounding: "half_up",
    citations: ["pt.ss.guia-subsidio-doenca-2026"],
  }];
  return { kind: "ok", dailyReference, dailyBenefit, payableDays, total, trace };
}

export type ParentalInitialModality =
  | "120_days"
  | "150_days_not_shared"
  | "150_days_shared_exclusive"
  | "180_days_shared_30"
  | "180_days_shared_60"
  | "father_exclusive"
  | "extra_twin_days";

const PARENTAL_RATES: Record<ParentalInitialModality, Rate> = {
  "120_days": ratePpm(1_000_000),
  "150_days_not_shared": ratePpm(800_000),
  "150_days_shared_exclusive": ratePpm(1_000_000),
  "180_days_shared_30": ratePpm(830_000),
  "180_days_shared_60": ratePpm(900_000),
  father_exclusive: ratePpm(1_000_000),
  extra_twin_days: ratePpm(1_000_000),
};

export interface ParentalBenefitInput {
  registeredRemunerationSixMonths: readonly Money[];
  payableDays: number;
  modality: ParentalInitialModality;
  autonomousRegion: boolean;
  partTimeAccumulation: boolean;
}

export function calculateParentalBenefit(input: ParentalBenefitInput): SocialBenefitResult {
  const dailyReference = dailyReferenceFromSixMonths(input.registeredRemunerationSixMonths);
  if (!dailyReference || !Number.isSafeInteger(input.payableDays) || input.payableDays < 0) {
    return { kind: "conflict", reasons: ["Histórico remuneratório ou duração parental inválidos."], trace: [] };
  }
  const ppm = PARENTAL_RATES[input.modality].ppm;
  const percentageValue = multiplyRate(dailyReference, ratePpm(ppm));
  const minimumDaily = eurCents(1_432);
  let dailyBenefitCents = Math.max(percentageValue.cents, minimumDaily.cents);
  if (input.partTimeAccumulation) dailyBenefitCents = Math.round(dailyBenefitCents / 2);
  // Lei n.º 7/2016: acréscimo de 2% ao valor da prestação (não 2 p.p. à taxa).
  if (input.autonomousRegion) dailyBenefitCents = Math.round((dailyBenefitCents * 102) / 100);
  const dailyBenefit = eurCents(dailyBenefitCents);
  const total = benefitTotal(dailyBenefit, input.payableDays);
  const trace: TraceStep[] = [{
    id: "payroll.social-benefit.parental-initial",
    label: "Subsídio parental inicial estimado",
    formula: "max(RR_diária × taxa_modalidade, 80% × IAS/30) × dias",
    operands: [
      { name: "RR_diária", value: dailyReference.cents, unit: "EUR_CENTS" },
      { name: "taxa_modalidade", value: ppm, unit: "PPM" },
      { name: "dias", value: input.payableDays, unit: "COUNT" },
      { name: "região_autónoma", value: input.autonomousRegion, unit: "TEXT" },
      { name: "acumulação_part_time", value: input.partTimeAccumulation, unit: "TEXT" },
    ],
    result: total.cents,
    rounding: "half_up",
    citations: ["pt.ss.guia-parental-inicial-2026"],
  }];
  return { kind: "ok", dailyReference, dailyBenefit, payableDays: input.payableDays, total, trace };
}
