import type { ISODate, PortugueseJurisdiction } from "../../core/model";

/**
 * Calendário laboral português — feriados obrigatórios, dias contratados,
 * feriados que caem em dia de trabalho, férias e dias elegíveis a subsídio de
 * refeição.
 *
 * Base legal:
 * - Feriados obrigatórios: Código do Trabalho, artigo 234.º.
 * - Férias no ano da admissão: Código do Trabalho, artigo 239.º, n.º 1
 *   (dois dias úteis por mês de duração do contrato, até 20 dias).
 * - Duração anual das férias: Código do Trabalho, artigo 238.º, n.º 1
 *   (22 dias úteis por ano civil).
 *
 * Puro: não lê rede, não guarda estado e não conhece a interface. Substitui a
 * aproximação «22 dias × 12 meses» que anualizava a refeição sem olhar ao
 * calendário (relatório, CON-P0-11).
 */

export const WORK_CALENDAR_CITATIONS = [
  "pt.dr.codigo-trabalho.artigo-234",
  "pt.dr.codigo-trabalho.artigo-238",
  "pt.dr.codigo-trabalho.artigo-239",
] as const;

/** Dias úteis de férias por ano civil completo (CT, artigo 238.º, n.º 1). */
export const ANNUAL_VACATION_WORKDAYS = 22;

/** Teto de férias no ano da admissão (CT, artigo 239.º, n.º 1). */
export const ADMISSION_YEAR_VACATION_CAP = 20;

/** Dias úteis de férias ganhos por mês de contrato no ano da admissão. */
export const ADMISSION_YEAR_VACATION_PER_MONTH = 2;

export type HolidayScope = "national" | "regional" | "municipal";

export interface PublicHoliday {
  date: ISODate;
  label: string;
  scope: HolidayScope;
  /** Verdadeiro nos feriados móveis calculados a partir da Páscoa. */
  movable: boolean;
}

interface CivilDate {
  year: number;
  month: number;
  day: number;
}

const pad = (value: number): string => String(value).padStart(2, "0");

export const toISODate = ({ year, month, day }: CivilDate): ISODate =>
  `${year}-${pad(month)}-${pad(day)}` as ISODate;

export function parseISODate(value: ISODate): CivilDate {
  const [year, month, day] = value.split("-").map(Number);
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 };
}

const utc = ({ year, month, day }: CivilDate): number =>
  Date.UTC(year, month - 1, day);

const fromUtc = (stamp: number): CivilDate => {
  const date = new Date(stamp);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

const DAY_MS = 86_400_000;

/** 1 = segunda-feira … 7 = domingo. */
export function isoWeekday(date: CivilDate): number {
  const weekday = new Date(utc(date)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Domingo de Páscoa pelo cómputo gregoriano anónimo. É aritmética de
 * calendário, não um dado fiscal: dá o mesmo resultado para qualquer ano sem
 * precisar de uma tabela que envelhece.
 */
export function easterSunday(year: number): CivilDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

const shift = (date: CivilDate, days: number): CivilDate =>
  fromUtc(utc(date) + days * DAY_MS);

/** Os treze feriados obrigatórios do artigo 234.º do Código do Trabalho. */
export function nationalHolidays(year: number): readonly PublicHoliday[] {
  const easter = easterSunday(year);
  const fixed: readonly (readonly [number, number, string])[] = [
    [1, 1, "Ano Novo"],
    [4, 25, "Dia da Liberdade"],
    [5, 1, "Dia do Trabalhador"],
    [6, 10, "Dia de Portugal"],
    [8, 15, "Assunção de Nossa Senhora"],
    [10, 5, "Implantação da República"],
    [11, 1, "Todos os Santos"],
    [12, 1, "Restauração da Independência"],
    [12, 8, "Imaculada Conceição"],
    [12, 25, "Natal"],
  ];
  const movable: readonly (readonly [CivilDate, string])[] = [
    [shift(easter, -2), "Sexta-Feira Santa"],
    [easter, "Domingo de Páscoa"],
    [shift(easter, 60), "Corpo de Deus"],
  ];
  return [
    ...fixed.map(([month, day, label]) => ({
      date: toISODate({ year, month, day }),
      label,
      scope: "national" as const,
      movable: false,
    })),
    ...movable.map(([date, label]) => ({
      date: toISODate(date),
      label,
      scope: "national" as const,
      movable: true,
    })),
  ];
}

/**
 * Feriados das regiões autónomas. Madeira: Dia da Região (1 de julho) e a
 * primeira oitava (26 de dezembro). Açores: Segunda-feira do Espírito Santo,
 * móvel, cinquenta dias depois da Páscoa.
 */
export function regionalHolidays(
  year: number,
  jurisdiction: PortugueseJurisdiction,
): readonly PublicHoliday[] {
  if (jurisdiction === "PT-MADEIRA") {
    return [
      {
        date: toISODate({ year, month: 7, day: 1 }),
        label: "Dia da Região Autónoma da Madeira",
        scope: "regional",
        movable: false,
      },
      {
        date: toISODate({ year, month: 12, day: 26 }),
        label: "Primeira Oitava",
        scope: "regional",
        movable: false,
      },
    ];
  }
  if (jurisdiction === "PT-ACORES") {
    return [
      {
        date: toISODate(shift(easterSunday(year), 50)),
        label: "Segunda-feira do Espírito Santo",
        scope: "regional",
        movable: true,
      },
    ];
  }
  return [];
}

export function publicHolidays(
  year: number,
  jurisdiction: PortugueseJurisdiction,
  municipalHoliday?: ISODate,
): readonly PublicHoliday[] {
  const municipal: readonly PublicHoliday[] = municipalHoliday
    ? [{
        date: municipalHoliday,
        label: "Feriado municipal",
        scope: "municipal" as const,
        movable: false,
      }]
    : [];
  return [
    ...nationalHolidays(year),
    ...regionalHolidays(year, jurisdiction),
    ...municipal,
  ].filter((holiday) => parseISODate(holiday.date).year === year);
}

/**
 * Férias a que o trabalhador tem direito no ano da admissão: dois dias úteis
 * por mês de duração do contrato, até 20 dias (CT, artigo 239.º, n.º 1).
 */
export function admissionYearVacationWorkdays(contractMonths: number): number {
  const months = Math.max(0, Math.floor(contractMonths));
  return Math.min(
    ADMISSION_YEAR_VACATION_CAP,
    months * ADMISSION_YEAR_VACATION_PER_MONTH,
  );
}

export interface WorkCalendarInput {
  year: number;
  jurisdiction: PortugueseJurisdiction;
  /** Primeiro dia de trabalho dentro deste ano civil. */
  startDate: ISODate;
  /** Último dia do vínculo, quando o contrato termina dentro do ano. */
  endDate?: ISODate;
  /** Dias da semana contratados: 1 = segunda … 7 = domingo. */
  workingWeekdays: readonly number[];
  municipalHoliday?: ISODate;
  /** Dias úteis de férias efetivamente gozados dentro deste ano. */
  vacationWorkdays: number;
  /** Mês do gozo principal de férias, declarado pela empresa. */
  mainVacationMonth?: number;
}

export interface WorkCalendarMonth {
  month: number;
  /** Dias de calendário dentro do vínculo. */
  contractDays: number;
  /** Dias da semana contratados que caem dentro do vínculo. */
  scheduledDays: number;
  /** Feriados que caem num dia contratado — não são horas disponíveis. */
  holidayDays: number;
  /** Férias imputadas a este mês. */
  vacationDays: number;
  /** Dias efetivamente trabalhados: é a base elegível do subsídio de refeição. */
  workedDays: number;
}

export interface WorkCalendarResult {
  year: number;
  jurisdiction: PortugueseJurisdiction;
  holidays: readonly PublicHoliday[];
  months: readonly WorkCalendarMonth[];
  /** Primeiro mês com contrato ativo (1-12). */
  firstActiveMonth: number;
  /** Meses do ano civil com pelo menos um dia de contrato. */
  activeMonths: number;
  /** Meses completos de contrato dentro do ano — base do artigo 239.º. */
  completeContractMonths: number;
  scheduledDays: number;
  holidaysOnScheduledDays: number;
  vacationWorkdays: number;
  /** Total anual de dias elegíveis a subsídio de refeição. */
  mealEligibleDays: number;
}

const clampMonth = (value: number): number =>
  Math.max(1, Math.min(12, Math.round(value)));

/**
 * Reparte os dias de férias pelos meses ativos. Sem plano de férias marcado, o
 * mês declarado como gozo principal recebe o que puder e o resto distribui-se
 * pelos meses com mais dias contratados — nunca cria férias fora do vínculo.
 */
function spreadVacation(
  scheduledByMonth: readonly number[],
  total: number,
  mainVacationMonth: number | undefined,
): readonly number[] {
  const allocated = scheduledByMonth.map(() => 0);
  let left = Math.max(0, Math.round(total));
  const capacity = (month: number) =>
    Math.max(0, (scheduledByMonth[month] ?? 0) - (allocated[month] ?? 0));

  if (mainVacationMonth !== undefined) {
    const index = clampMonth(mainVacationMonth) - 1;
    const take = Math.min(left, capacity(index));
    allocated[index] = (allocated[index] ?? 0) + take;
    left -= take;
  }

  const order = scheduledByMonth
    .map((days, index) => ({ days, index }))
    .sort((a, b) => b.days - a.days || a.index - b.index);
  for (const { index } of order) {
    if (left <= 0) break;
    const take = Math.min(left, capacity(index));
    allocated[index] = (allocated[index] ?? 0) + take;
    left -= take;
  }
  return allocated;
}

/**
 * Constrói o calendário de um ano civil: dias contratados, feriados que caem
 * em dia de trabalho, férias e dias elegíveis a refeição, mês a mês.
 */
export function buildWorkCalendar(input: WorkCalendarInput): WorkCalendarResult {
  const start = parseISODate(input.startDate);
  const end = input.endDate ? parseISODate(input.endDate) : undefined;
  const holidays = publicHolidays(input.year, input.jurisdiction, input.municipalHoliday);
  const holidayDates = new Set(holidays.map((holiday) => holiday.date));
  const weekdays = new Set(
    input.workingWeekdays.length > 0 ? input.workingWeekdays : [1, 2, 3, 4, 5],
  );

  const firstStamp = start.year === input.year
    ? utc(start)
    : start.year < input.year
      ? utc({ year: input.year, month: 1, day: 1 })
      : Number.POSITIVE_INFINITY;
  const lastStamp = end
    ? (end.year === input.year
        ? utc(end)
        : end.year > input.year
          ? utc({ year: input.year, month: 12, day: 31 })
          : Number.NEGATIVE_INFINITY)
    : utc({ year: input.year, month: 12, day: 31 });

  const contractDays: number[] = [];
  const scheduledDays: number[] = [];
  const holidayDays: number[] = [];
  for (let month = 1; month <= 12; month += 1) {
    let contract = 0;
    let scheduled = 0;
    let onHoliday = 0;
    const total = daysInMonth(input.year, month);
    for (let day = 1; day <= total; day += 1) {
      const date = { year: input.year, month, day };
      const stamp = utc(date);
      if (stamp < firstStamp || stamp > lastStamp) continue;
      contract += 1;
      if (!weekdays.has(isoWeekday(date))) continue;
      if (holidayDates.has(toISODate(date))) {
        onHoliday += 1;
        continue;
      }
      scheduled += 1;
    }
    contractDays.push(contract);
    scheduledDays.push(scheduled);
    holidayDays.push(onHoliday);
  }

  const vacation = spreadVacation(
    scheduledDays,
    input.vacationWorkdays,
    input.mainVacationMonth,
  );
  const months = scheduledDays.map((scheduled, index) => ({
    month: index + 1,
    contractDays: contractDays[index] ?? 0,
    scheduledDays: scheduled,
    holidayDays: holidayDays[index] ?? 0,
    vacationDays: vacation[index] ?? 0,
    workedDays: Math.max(0, scheduled - (vacation[index] ?? 0)),
  } satisfies WorkCalendarMonth));

  const activeMonths = months.filter((month) => month.contractDays > 0);
  const completeContractMonths = months.filter(
    (month) => month.contractDays === daysInMonth(input.year, month.month),
  ).length;

  return {
    year: input.year,
    jurisdiction: input.jurisdiction,
    holidays,
    months,
    firstActiveMonth: activeMonths[0]?.month ?? 13,
    activeMonths: activeMonths.length,
    completeContractMonths,
    scheduledDays: months.reduce((sum, month) => sum + month.scheduledDays, 0),
    holidaysOnScheduledDays: months.reduce((sum, month) => sum + month.holidayDays, 0),
    vacationWorkdays: months.reduce((sum, month) => sum + month.vacationDays, 0),
    mealEligibleDays: months.reduce((sum, month) => sum + month.workedDays, 0),
  };
}
