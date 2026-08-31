import { describe, expect, it } from "vitest";
import { buildEmploymentCalendar, eurCents } from "../src";

const period = (value: number) => ({
  employerCost: eurCents(value),
  workerNet: eurCents(Math.round(value * 0.7)),
  publicCharges: eurCents(Math.round(value * 0.3)),
});

describe("calendário da contratação", () => {
  it("não cobra antes da entrada e posiciona custos de início uma só vez", () => {
    const calendar = buildEmploymentCalendar({
      startMonth: 7,
      normalMonth: period(100_000),
      holidaySubsidy: period(50_000),
      christmasSubsidy: period(50_000),
      annualPostCosts: eurCents(120_000),
      equipmentFirstYear: eurCents(80_000),
    });
    expect(calendar.slice(0, 6).every((month) => month.employerCost.cents === 0)).toBe(true);
    expect(calendar[6]?.labels).toContain("Equipamento inicial");
    expect(calendar.filter((month) => month.labels.includes("Equipamento inicial"))).toHaveLength(1);
    expect(calendar[11]?.labels).toContain("Subsídio de férias proporcional");
  });
});

