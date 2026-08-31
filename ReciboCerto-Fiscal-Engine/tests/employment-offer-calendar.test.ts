import { describe, expect, it } from "vitest";
import {
  admissionYearVacationWorkdays,
  buildEmploymentCalendar,
  buildWorkCalendar,
  easterSunday,
  eurCents,
  publicHolidays,
  summariseCalendar,
} from "../src";

const period = (value: number) => ({
  employerCost: eurCents(value),
  workerNet: eurCents(Math.round(value * 0.7)),
  publicCharges: eurCents(Math.round(value * 0.3)),
});

const calendarInput = (overrides: Partial<Parameters<typeof buildEmploymentCalendar>[0]> = {}) =>
  buildEmploymentCalendar({
    startYear: 2026,
    startMonth: 7,
    monthlyProjection: () => period(100_000),
    postCostsForMonth: () => eurCents(10_000),
    admissionHolidaySubsidy: period(50_000),
    admissionChristmasSubsidy: period(50_000),
    fullHolidaySubsidy: period(100_000),
    fullChristmasSubsidy: period(100_000),
    holidaySubsidyMonth: 8,
    christmasSubsidyMonth: 12,
    bonusMonth: 12,
    startupCosts: eurCents(80_000),
    ...overrides,
  });

describe("calendário de caixa da contratação", () => {
  it("não cobra antes da entrada e posiciona custos de arranque uma só vez", () => {
    const calendar = calendarInput();
    const admissao = calendar.filter((month) => month.year === 2026);
    expect(admissao.slice(0, 6).every((month) => month.employerCost.cents === 0)).toBe(true);
    expect(admissao[6]?.labels).toContain("Custos únicos do arranque");
    expect(calendar.filter((month) => month.labels.includes("Custos únicos do arranque")))
      .toHaveLength(1);
  });

  it("projeta 24 meses para conseguir os doze primeiros meses do vínculo", () => {
    const calendar = calendarInput();
    expect(calendar).toHaveLength(24);
    const resumo = summariseCalendar(calendar, 2026, 7);
    expect(resumo.firstCalendarYear.cents).toBeLessThan(resumo.firstTwelveMonths.cents);
    expect(resumo.peak).not.toBeNull();
  });

  it("o subsídio de férias segue o mês declarado, em vez de junho", () => {
    const calendar = calendarInput({ holidaySubsidyMonth: 9 });
    const setembro = calendar.find((month) => month.year === 2026 && month.month === 9);
    const junho = calendar.find((month) => month.year === 2027 && month.month === 6);
    expect(setembro?.labels.some((label) => label.includes("Subsídio de férias"))).toBe(true);
    expect(junho?.labels.some((label) => label.includes("Subsídio de férias"))).toBe(false);
  });

  it("o direito a férias transita quando o gozo declarado é anterior à entrada", () => {
    const calendar = calendarInput({ startMonth: 10, holidaySubsidyMonth: 5 });
    const noAnoDaAdmissao = calendar
      .filter((month) => month.year === 2026)
      .some((month) => month.labels.some((label) => label.includes("Subsídio de férias")));
    const noAnoSeguinte = calendar
      .filter((month) => month.year === 2027)
      .some((month) => month.labels.some((label) => label.includes("Subsídio de férias")));
    expect(noAnoDaAdmissao).toBe(false);
    expect(noAnoSeguinte).toBe(true);
  });

  it("um contrato com termo deixa de gerar caixa depois do último mês", () => {
    const calendar = calendarInput({ lastActiveMonth: { year: 2026, month: 10 } });
    const novembro = calendar.find((month) => month.year === 2026 && month.month === 11);
    expect(novembro?.active).toBe(false);
    expect(novembro?.labels).toContain("Depois do termo do contrato");
  });
});

describe("calendário laboral português", () => {
  it("calcula a Páscoa e os feriados móveis que dela dependem", () => {
    expect(easterSunday(2026)).toEqual({ year: 2026, month: 4, day: 5 });
    const nacionais = publicHolidays(2026, "PT-CONTINENTE");
    expect(nacionais).toHaveLength(13);
    expect(nacionais.map((item) => item.date)).toContain("2026-04-03");
    expect(nacionais.map((item) => item.date)).toContain("2026-06-04");
  });

  it("acrescenta os feriados das regiões autónomas", () => {
    const madeira = publicHolidays(2026, "PT-MADEIRA");
    expect(madeira.map((item) => item.date)).toContain("2026-07-01");
    expect(madeira.map((item) => item.date)).toContain("2026-12-26");
    const acores = publicHolidays(2026, "PT-ACORES");
    expect(acores.map((item) => item.date)).toContain("2026-05-25");
  });

  it("os feriados não contam como dias trabalháveis", () => {
    const semFeriados = buildWorkCalendar({
      year: 2026,
      jurisdiction: "PT-CONTINENTE",
      startDate: "2026-01-01",
      workingWeekdays: [1, 2, 3, 4, 5],
      vacationWorkdays: 0,
    });
    const madeira = buildWorkCalendar({
      year: 2026,
      jurisdiction: "PT-MADEIRA",
      startDate: "2026-01-01",
      workingWeekdays: [1, 2, 3, 4, 5],
      vacationWorkdays: 0,
    });
    expect(semFeriados.holidaysOnScheduledDays).toBeGreaterThan(0);
    expect(madeira.scheduledDays).toBeLessThanOrEqual(semFeriados.scheduledDays);
  });

  it("os dias elegíveis a refeição não são 22 × 12", () => {
    const ano = buildWorkCalendar({
      year: 2026,
      jurisdiction: "PT-CONTINENTE",
      startDate: "2026-01-01",
      workingWeekdays: [1, 2, 3, 4, 5],
      vacationWorkdays: 22,
      mainVacationMonth: 8,
    });
    expect(ano.mealEligibleDays).not.toBe(264);
    expect(ano.mealEligibleDays).toBeGreaterThan(200);
    expect(ano.mealEligibleDays).toBeLessThan(240);
    expect(ano.vacationWorkdays).toBe(22);
  });

  it("um part-time de três dias tem menos dias elegíveis do que um horário completo", () => {
    const completo = buildWorkCalendar({
      year: 2026,
      jurisdiction: "PT-CONTINENTE",
      startDate: "2026-01-01",
      workingWeekdays: [1, 2, 3, 4, 5],
      vacationWorkdays: 22,
    });
    const parcial = buildWorkCalendar({
      year: 2026,
      jurisdiction: "PT-CONTINENTE",
      startDate: "2026-01-01",
      workingWeekdays: [1, 3, 5],
      vacationWorkdays: 22,
    });
    expect(parcial.mealEligibleDays).toBeLessThan(completo.mealEligibleDays);
  });

  it("a entrada a meio do ano só conta os meses do vínculo", () => {
    const setembro = buildWorkCalendar({
      year: 2026,
      jurisdiction: "PT-CONTINENTE",
      startDate: "2026-09-15",
      workingWeekdays: [1, 2, 3, 4, 5],
      vacationWorkdays: 0,
    });
    expect(setembro.firstActiveMonth).toBe(9);
    expect(setembro.activeMonths).toBe(4);
    expect(setembro.completeContractMonths).toBe(3);
    expect(setembro.months.slice(0, 8).every((month) => month.scheduledDays === 0)).toBe(true);
  });

  it("aplica dois dias úteis por mês até ao teto de vinte", () => {
    expect(admissionYearVacationWorkdays(3)).toBe(6);
    expect(admissionYearVacationWorkdays(11)).toBe(20);
    expect(admissionYearVacationWorkdays(0)).toBe(0);
  });
});
