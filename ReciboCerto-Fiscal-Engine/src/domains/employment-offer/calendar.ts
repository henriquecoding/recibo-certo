import { eurCents, type Money } from "../../core/money";
import type { CashCalendarMonth } from "./types";

export interface MoneyRange {
  min: Money;
  max: Money;
}

export interface CalendarPeriodProjection {
  employerCost: Money;
  workerNet: Money | MoneyRange;
  publicCharges: Money | MoneyRange;
}

export interface EmploymentCalendarInput {
  startMonth: number;
  normalMonth: CalendarPeriodProjection;
  holidaySubsidy?: CalendarPeriodProjection;
  christmasSubsidy?: CalendarPeriodProjection;
  annualBonus?: CalendarPeriodProjection;
  /** Custos anuais recorrentes que não pertencem ao payroll. */
  annualPostCosts: Money;
  equipmentFirstYear: Money;
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

/**
 * Calendário de caixa do primeiro ano. Os subsídios proporcionais chegam já
 * calculados pelo Payroll Engine; esta função apenas os posiciona no tempo.
 */
export function buildEmploymentCalendar(
  input: EmploymentCalendarInput,
): readonly CashCalendarMonth[] {
  const start = Math.max(1, Math.min(12, Math.round(input.startMonth)));
  const activeMonths = 13 - start;
  const fixedPerActiveMonth = activeMonths > 0
    ? eurCents(Math.round(input.annualPostCosts.cents * (activeMonths / 12) / activeMonths))
    : eurCents(0);
  const holidayMonth = start <= 6 ? 6 : 12;
  const christmasMonth = Math.max(start, 11);

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const active = month >= start;
    if (!active) {
      return {
        month,
        active: false,
        labels: ["Antes da entrada"],
        ...zeroProjection(),
      } satisfies CashCalendarMonth;
    }

    let projection = input.normalMonth;
    const labels = ["Vencimento e pacote mensal"];
    if (month === holidayMonth && input.holidaySubsidy) {
      projection = combine(projection, input.holidaySubsidy);
      labels.push("Subsídio de férias proporcional");
    }
    if (month === christmasMonth && input.christmasSubsidy) {
      projection = combine(projection, input.christmasSubsidy);
      labels.push("Subsídio de Natal proporcional");
    }
    if (month === 12 && input.annualBonus) {
      projection = combine(projection, input.annualBonus);
      labels.push("Prémio anual proporcional");
    }
    if (fixedPerActiveMonth.cents > 0) {
      projection = {
        ...projection,
        employerCost: add(projection.employerCost, fixedPerActiveMonth),
      };
      labels.push("Custos do posto rateados");
    }
    if (month === start && input.equipmentFirstYear.cents > 0) {
      projection = {
        ...projection,
        employerCost: add(projection.employerCost, input.equipmentFirstYear),
      };
      labels.push("Equipamento inicial");
    }

    return {
      month,
      active: true,
      labels,
      employerCost: projection.employerCost,
      workerNet: projection.workerNet,
      publicCharges: projection.publicCharges,
    } satisfies CashCalendarMonth;
  });
}

