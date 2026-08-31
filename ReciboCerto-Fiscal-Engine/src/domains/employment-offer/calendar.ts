import { eurCents, type Money } from "../../core/money";

/**
 * Calendário de caixa da contratação. Projeta 24 meses a partir de janeiro do
 * ano de entrada para conseguir responder às três contas que o relatório
 * separa (INV-03): o primeiro ano CIVIL, os primeiros DOZE MESES do vínculo e
 * o ano estabilizado — mais o mês de pico, que nenhuma média mostra.
 *
 * Os subsídios chegam já calculados pelo Payroll Engine; esta função apenas os
 * posiciona no tempo. O mês do subsídio de férias acompanha o gozo declarado
 * (CT, artigo 264.º, n.º 3: pago antes do início das férias) e o de Natal fica
 * em dezembro (CT, artigo 263.º, n.º 1: até 15 de dezembro) — deixou de estar
 * preso a junho.
 */

export interface MoneyRange {
  min: Money;
  max: Money;
}

export interface CalendarPeriodProjection {
  employerCost: Money;
  workerNet: Money | MoneyRange;
  publicCharges: Money | MoneyRange;
}

export interface CashCalendarMonth {
  year: number;
  month: number;
  active: boolean;
  labels: readonly string[];
  employerCost: Money;
  workerNet: Money | MoneyRange;
  publicCharges: Money | MoneyRange;
}

export interface EmploymentCalendarInput {
  startYear: number;
  /** Janeiro = 1. */
  startMonth: number;
  /**
   * Projeção de um mês normal. É uma função porque os meses não são iguais:
   * os dias elegíveis a refeição mudam com feriados e férias.
   */
  monthlyProjection: (year: number, month: number) => CalendarPeriodProjection;
  /** Encargos recorrentes do posto imputados a este mês. */
  postCostsForMonth: (year: number, month: number) => Money;
  /** Subsídios proporcionais do ano da admissão. */
  admissionHolidaySubsidy?: CalendarPeriodProjection;
  admissionChristmasSubsidy?: CalendarPeriodProjection;
  admissionAnnualBonus?: CalendarPeriodProjection;
  /** Subsídios completos, a partir do primeiro ano civil inteiro. */
  fullHolidaySubsidy?: CalendarPeriodProjection;
  fullChristmasSubsidy?: CalendarPeriodProjection;
  fullAnnualBonus?: CalendarPeriodProjection;
  /** Mês de pagamento do subsídio de férias, quando não é em duodécimos. */
  holidaySubsidyMonth: number;
  christmasSubsidyMonth: number;
  bonusMonth: number;
  /** Custos únicos do arranque: equipamento, recrutamento, instalação. */
  startupCosts: Money;
  /** Último mês ativo, quando o contrato termina dentro do horizonte. */
  lastActiveMonth?: { year: number; month: number };
}

export interface CalendarSummary {
  months: readonly CashCalendarMonth[];
  /** Saída de caixa dentro do ano civil da entrada. */
  firstCalendarYear: Money;
  /** Saída de caixa nos doze primeiros meses do vínculo. */
  firstTwelveMonths: Money;
  peak: { year: number; month: number; amount: Money; labels: readonly string[] } | null;
}

const isRange = (value: Money | MoneyRange): value is MoneyRange => "min" in value;
const add = (...values: readonly Money[]): Money =>
  eurCents(values.reduce((sum, value) => sum + value.cents, 0));

function addMaybeRange(
  left: Money | MoneyRange,
  right: Money | MoneyRange,
): Money | MoneyRange {
  const l = isRange(left) ? left : { min: left, max: left };
  const r = isRange(right) ? right : { min: right, max: right };
  const result = { min: add(l.min, r.min), max: add(l.max, r.max) };
  return !isRange(left) && !isRange(right) ? result.min : result;
}

const zeroProjection = (): CalendarPeriodProjection => ({
  employerCost: eurCents(0),
  workerNet: eurCents(0),
  publicCharges: eurCents(0),
});

function combine(
  left: CalendarPeriodProjection,
  right: CalendarPeriodProjection,
): CalendarPeriodProjection {
  return {
    employerCost: add(left.employerCost, right.employerCost),
    workerNet: addMaybeRange(left.workerNet, right.workerNet),
    publicCharges: addMaybeRange(left.publicCharges, right.publicCharges),
  };
}

const clampMonth = (value: number): number =>
  Math.max(1, Math.min(12, Math.round(value)));

/** Projeta 24 meses de caixa a partir de janeiro do ano de entrada. */
export function buildEmploymentCalendar(
  input: EmploymentCalendarInput,
): readonly CashCalendarMonth[] {
  const start = clampMonth(input.startMonth);
  const holidayMonth = clampMonth(input.holidaySubsidyMonth);
  const christmasMonth = clampMonth(input.christmasSubsidyMonth);
  const bonusMonth = clampMonth(input.bonusMonth);

  const last = input.lastActiveMonth;
  return Array.from({ length: 24 }, (_, index) => {
    const year = input.startYear + Math.floor(index / 12);
    const month = (index % 12) + 1;
    const admissionYear = year === input.startYear;
    const started = !admissionYear || month >= start;
    const ended = last !== undefined
      && (year > last.year || (year === last.year && month > last.month));
    const active = started && !ended;
    if (!active) {
      return {
        year,
        month,
        active: false,
        labels: [ended ? "Depois do termo do contrato" : "Antes da entrada"],
        ...zeroProjection(),
      } satisfies CashCalendarMonth;
    }

    let projection = input.monthlyProjection(year, month);
    const labels = ["Vencimento e pacote mensal"];

    // No ano da admissão o subsídio de férias só é pago se o mês do gozo já
    // for depois da entrada; caso contrário o direito transita e é pago no
    // ano seguinte, como manda o artigo 239.º, n.º 2.
    const holidaySubsidy = admissionYear
      ? (holidayMonth >= start ? input.admissionHolidaySubsidy : undefined)
      : input.fullHolidaySubsidy;
    if (month === holidayMonth && holidaySubsidy) {
      projection = combine(projection, holidaySubsidy);
      labels.push(admissionYear ? "Subsídio de férias proporcional" : "Subsídio de férias");
    }

    const christmasSubsidy = admissionYear
      ? input.admissionChristmasSubsidy
      : input.fullChristmasSubsidy;
    if (month === christmasMonth && christmasSubsidy) {
      projection = combine(projection, christmasSubsidy);
      labels.push(admissionYear ? "Subsídio de Natal proporcional" : "Subsídio de Natal");
    }

    const bonus = admissionYear ? input.admissionAnnualBonus : input.fullAnnualBonus;
    if (month === bonusMonth && bonus) {
      projection = combine(projection, bonus);
      labels.push(admissionYear ? "Prémio anual proporcional" : "Prémio anual");
    }

    const postCosts = input.postCostsForMonth(year, month);
    if (postCosts.cents > 0) {
      projection = {
        ...projection,
        employerCost: add(projection.employerCost, postCosts),
      };
      labels.push("Custos do posto rateados");
    }
    if (admissionYear && month === start && input.startupCosts.cents > 0) {
      projection = {
        ...projection,
        employerCost: add(projection.employerCost, input.startupCosts),
      };
      labels.push("Custos únicos do arranque");
    }

    return {
      year,
      month,
      active: true,
      labels,
      employerCost: projection.employerCost,
      workerNet: projection.workerNet,
      publicCharges: projection.publicCharges,
    } satisfies CashCalendarMonth;
  });
}

/**
 * Reparte a mesma projeção pelas três leituras que decidem coisas diferentes:
 * o ano civil fecha contas com a contabilidade, os doze meses do vínculo
 * dizem o que a tesouraria aguenta, e o pico diz em que mês dói.
 */
export function summariseCalendar(
  months: readonly CashCalendarMonth[],
  startYear: number,
  startMonth: number,
): CalendarSummary {
  const start = clampMonth(startMonth);
  const calendarYear = months.filter((month) => month.year === startYear);
  const window = months.filter(
    (month) =>
      (month.year === startYear && month.month >= start)
      || (month.year === startYear + 1 && month.month < start),
  );
  const peakSource = window.length > 0 ? window : calendarYear;
  const peak = peakSource.reduce<CashCalendarMonth | null>(
    (best, month) =>
      month.active && (best === null || month.employerCost.cents > best.employerCost.cents)
        ? month
        : best,
    null,
  );
  return {
    months,
    firstCalendarYear: add(...calendarYear.map((month) => month.employerCost)),
    firstTwelveMonths: add(...window.map((month) => month.employerCost)),
    peak: peak
      ? { year: peak.year, month: peak.month, amount: peak.employerCost, labels: peak.labels }
      : null,
  };
}
