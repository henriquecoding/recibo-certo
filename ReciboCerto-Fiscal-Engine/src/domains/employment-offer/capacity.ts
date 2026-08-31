import { eurCents, type Money, type Rate } from "../../core/money";

/**
 * Economia do posto: quantas horas ficam mesmo disponíveis depois de férias,
 * feriados, formação e integração — e o que o posto precisa de gerar.
 *
 * Corrige duas contas que decidiam mal (relatório, CON-P0-14 e CON-P0-15):
 * as horas disponíveis usavam constantes fixas e ignoravam feriados, e as
 * horas faturáveis necessárias dividiam o custo pelo PREÇO em vez de o
 * dividirem pela contribuição que cada hora vendida deixa na empresa.
 *
 * Base legal da formação contínua: Código do Trabalho, artigo 131.º, n.º 2 —
 * mínimo de 40 horas anuais, proporcionais nos contratos a termo.
 */

export const ANNUAL_TRAINING_HOURS_HUNDREDTHS = 4_000;
export const CAPACITY_CITATIONS = [
  "pt.dr.codigo-trabalho.artigo-131",
  "pt.dr.codigo-trabalho.artigo-238",
] as const;

export interface CapacityCalendarInput {
  weeklyHoursHundredths: number;
  /** Dias da semana contratados — o divisor honesto do horário diário. */
  workingWeekdaysPerWeek: number;
  /** Dias contratados no ano, já sem feriados (vem do calendário laboral). */
  scheduledDays: number;
  /** Feriados que caíram em dia contratado. */
  holidayDaysOnScheduledDays: number;
  vacationWorkdays: number;
  /** Horas de formação do ano. Reduzem capacidade mesmo sem fornecedor externo. */
  trainingHoursHundredths: number;
  /** Horas de integração no arranque, quando declaradas. */
  onboardingHoursHundredths: number;
  /** Fração das horas disponíveis que é realmente faturável. */
  productiveShare?: Rate;
}

export interface CapacityEconomicsInput {
  annualCost: Money;
  pricePerProductiveHour?: Money;
  contributionMargin?: Rate;
  expectedBillableHoursMonthly?: number;
}

export type CapacityGapDirection = "surplus" | "shortfall" | "unknown";

export interface CapacityResult {
  /** Horas pagas ao ano, incluindo feriados e férias. */
  paidHoursHundredths: number;
  holidayHoursHundredths: number;
  vacationHoursHundredths: number;
  trainingHoursHundredths: number;
  onboardingHoursHundredths: number;
  /** Horas em que a pessoa está mesmo ao serviço. */
  annualAvailableHoursHundredths: number;
  /** Horas disponíveis já multiplicadas pela fração produtiva. */
  annualProductiveHoursHundredths: number;
  costPerProductiveHour: Money | null;
  /** Margem que cada hora vendida deixa na empresa: preço × margem. */
  contributionPerBillableHour: Money | null;
  revenueRequired: Money | null;
  billableHoursRequired: number | null;
  expectedAnnualBillableHours: number | null;
  /** Positivo é folga, negativo é falta. A direção vem sempre acompanhada. */
  capacityGapHours: number | null;
  capacityGapDirection: CapacityGapDirection;
  /** A expectativa não pode exceder o máximo produtivo sem aviso. */
  expectationExceedsCapacity: boolean;
  notes: readonly string[];
}

const hoursToCentiHours = (value: number): number => Math.max(0, Math.round(value));

/**
 * Horas disponíveis = horas pagas − feriados − férias − formação − integração.
 * A fração produtiva aplica-se DEPOIS de retirar os períodos indisponíveis,
 * porque não se é produtivo numa hora em que não se está.
 */
export function capacityCalendar(input: CapacityCalendarInput): {
  paidHoursHundredths: number;
  holidayHoursHundredths: number;
  vacationHoursHundredths: number;
  trainingHoursHundredths: number;
  onboardingHoursHundredths: number;
  availableHoursHundredths: number;
  productiveHoursHundredths: number;
} {
  const weekdays = Math.max(1, Math.round(input.workingWeekdaysPerWeek));
  const dailyHundredths = input.weeklyHoursHundredths / weekdays;
  const workedDays = Math.max(0, input.scheduledDays - input.vacationWorkdays);
  const paid = hoursToCentiHours(
    (workedDays + input.vacationWorkdays + input.holidayDaysOnScheduledDays) * dailyHundredths,
  );
  const holiday = hoursToCentiHours(input.holidayDaysOnScheduledDays * dailyHundredths);
  const vacation = hoursToCentiHours(input.vacationWorkdays * dailyHundredths);
  const training = hoursToCentiHours(input.trainingHoursHundredths);
  const onboarding = hoursToCentiHours(input.onboardingHoursHundredths);
  const available = Math.max(0, paid - holiday - vacation - training - onboarding);
  const share = input.productiveShare;
  const productive = share
    ? Math.max(0, Math.round((available * share.ppm) / 1_000_000))
    : 0;
  return {
    paidHoursHundredths: paid,
    holidayHoursHundredths: holiday,
    vacationHoursHundredths: vacation,
    trainingHoursHundredths: training,
    onboardingHoursHundredths: onboarding,
    availableHoursHundredths: available,
    productiveHoursHundredths: productive,
  };
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function calculateCapacity(
  calendar: CapacityCalendarInput,
  economics: CapacityEconomicsInput,
): CapacityResult {
  const hours = capacityCalendar(calendar);
  const notes: string[] = [];

  const costPerProductiveHour = hours.productiveHoursHundredths > 0
    ? eurCents(Math.round((economics.annualCost.cents * 100) / hours.productiveHoursHundredths))
    : null;
  if (hours.productiveHoursHundredths <= 0) {
    notes.push("Sem fração produtiva indicada, o custo por hora não é calculável.");
  }

  const price = economics.pricePerProductiveHour;
  const margin = economics.contributionMargin;
  const hasPrice = price !== undefined && price.cents > 0;
  const hasMargin = margin !== undefined && margin.ppm > 0;

  // Preço é receita; só a margem de contribuição paga o posto. Multiplicar
  // antes de dividir mantém o cêntimo e faz a fórmula coincidir com
  // custo ÷ preço quando a margem é 100%.
  const contributionPerBillableHour = hasPrice && hasMargin
    ? eurCents(Math.max(1, Math.round((price.cents * margin.ppm) / 1_000_000)))
    : null;
  const billableHoursRequired = contributionPerBillableHour
    ? round2(Math.ceil((economics.annualCost.cents / contributionPerBillableHour.cents) * 100) / 100)
    : null;
  if (hasPrice && !hasMargin) {
    notes.push("Falta a margem de contribuição: sem ela, o preço por hora não diz quanto sobra para pagar o posto.");
  }
  if (!hasPrice && hasMargin) {
    notes.push("Falta o preço por hora: a receita necessária está calculada, as horas não.");
  }

  const revenueRequired = hasMargin
    ? eurCents(Math.ceil((economics.annualCost.cents * 1_000_000) / margin.ppm))
    : null;

  const expectedAnnualBillableHours = economics.expectedBillableHoursMonthly !== undefined
    ? round2(economics.expectedBillableHoursMonthly * 12)
    : null;

  const productiveHours = hours.productiveHoursHundredths / 100;
  const expectationExceedsCapacity = expectedAnnualBillableHours !== null
    && productiveHours > 0
    && expectedAnnualBillableHours > productiveHours;
  if (expectationExceedsCapacity) {
    notes.push(
      `A expectativa de ${expectedAnnualBillableHours.toLocaleString("pt-PT")} horas ultrapassa as ${round2(productiveHours).toLocaleString("pt-PT")} horas produtivas que o calendário permite.`,
    );
  }

  const capacityGapHours = expectedAnnualBillableHours !== null && billableHoursRequired !== null
    ? round2(expectedAnnualBillableHours - billableHoursRequired)
    : null;

  return {
    paidHoursHundredths: hours.paidHoursHundredths,
    holidayHoursHundredths: hours.holidayHoursHundredths,
    vacationHoursHundredths: hours.vacationHoursHundredths,
    trainingHoursHundredths: hours.trainingHoursHundredths,
    onboardingHoursHundredths: hours.onboardingHoursHundredths,
    annualAvailableHoursHundredths: hours.availableHoursHundredths,
    annualProductiveHoursHundredths: hours.productiveHoursHundredths,
    costPerProductiveHour,
    contributionPerBillableHour,
    revenueRequired,
    billableHoursRequired,
    expectedAnnualBillableHours,
    capacityGapHours,
    capacityGapDirection: capacityGapHours === null
      ? "unknown"
      : capacityGapHours >= 0 ? "surplus" : "shortfall",
    expectationExceedsCapacity,
    notes,
  };
}
