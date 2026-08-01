import { describe, expect, it } from "vitest";
import {
  calculateLegacyPayroll,
  employerCost,
  includeMonthlyDuodecimos,
  type PayrollRubricDraft,
  type PayrollSimulatorContext,
} from "../src/lib/payroll-simulator-legacy-adapter";
import { calcularVencimento, calcularVencimentoAnual } from "../src/lib/fiscal-dependente";

const context: PayrollSimulatorContext = {
  baseSalary: 2_000,
  weeklyHours: 40,
  dependants: 0,
  maritalStatus: "naoCasado",
  disability: false,
  region: "continente",
  meal: { enabled: false, days: 0, dailyAmount: 0, card: false },
};

const rubric = (partial: Partial<PayrollRubricDraft> & Pick<PayrollRubricDraft, "id" | "type">): PayrollRubricDraft => ({
  amount: 0,
  hours: 0,
  days: 0,
  dailyAmount: 0,
  regularity: "unknown",
  ...partial,
});

describe("adaptador do builder de recibos", () => {
  it("mantém os seis segmentos de trabalho suplementar, incluindo 75%", () => {
    const result = calculateLegacyPayroll(context, [
      rubric({ id: "ot75", type: "overtime_over100_following", hours: 1 }),
    ]);
    expect(result.input.horasSuplementares).toEqual([0, 0, 0, 0, 1, 0]);
    expect(result.result.suplementarDetalhe[4]).toMatchObject({ acrescimo: 0.75, horas: 1, valor: 20.2 });
    expect(result.lines.find((line) => line.id === "ot75")?.amount).toBe(20.2);
  });

  it("separa prémios regulares e não regulares na base contributiva", () => {
    const result = calculateLegacyPayroll(context, [
      rubric({ id: "regular", type: "performance_award", amount: 100, regularity: "regular" }),
      rubric({ id: "once", type: "performance_award", amount: 100, regularity: "not_regular" }),
    ]);
    expect(result.result.brutoTotal).toBe(2_200);
    expect(result.result.baseSS).toBe(2_100);
    expect(result.lines.find((line) => line.id === "regular")?.socialSecurityBase).toBe(100);
    expect(result.lines.find((line) => line.id === "once")?.socialSecurityBase).toBe(0);
  });

  it("conserva todos os totais ao distribuir IRS e SS pelas linhas", () => {
    const result = calculateLegacyPayroll({
      ...context,
      meal: { enabled: true, days: 20, dailyAmount: 7, card: false },
    }, []);
    const sum = (field: "amount" | "irsWithheld" | "employeeSocialSecurity" | "netImpact") =>
      Math.round(result.lines.reduce((total, line) => total + line[field], 0) * 100) / 100;
    expect(sum("amount")).toBe(result.result.brutoTotal);
    expect(sum("irsWithheld")).toBe(result.result.irsTotal);
    expect(sum("employeeSocialSecurity")).toBe(result.result.ssTrabalhador);
    expect(sum("netImpact")).toBe(result.result.liquido);
    expect(result.result.subsidioRefeicaoTributado).toBe(17);
    expect(employerCost(result.result)).toBe(2_619.04);
  });

  it("nunca lança o resto de IRS numa linha totalmente isenta", () => {
    const result = calculateLegacyPayroll({
      ...context,
      meal: { enabled: true, days: 20, dailyAmount: 6, card: false },
    }, []);
    const meal = result.lines.find((line) => line.id === "meal-allowance");
    expect(meal).toMatchObject({ irsBase: 0, socialSecurityBase: 0, irsWithheld: 0, employeeSocialSecurity: 0 });
    expect(result.lines.reduce((sum, line) => sum + line.irsWithheld, 0)).toBe(result.result.irsTotal);
  });

  it("inclui os dois duodécimos e retém a fração do imposto do subsídio completo", () => {
    const rubrics = includeMonthlyDuodecimos([], context.baseSalary, true);
    const result = calculateLegacyPayroll(context, rubrics);
    expect(rubrics.map((item) => [item.type, item.amount])).toEqual([
      ["holiday_subsidy", 166.67],
      ["christmas_subsidy", 166.67],
    ]);
    expect(result.result.subsidioFerias).toBe(166.67);
    expect(result.result.subsidioNatal).toBe(166.67);
    const retencaoSubsídioCompleto = calcularVencimento({
      salarioBruto: context.baseSalary,
      dependentes: context.dependants,
      estadoCivil: context.maritalStatus,
      regiao: context.region,
      subsidioRefeicaoDia: 0,
      diasUteis: 0,
    }).irsRetido;
    const fracao = Math.round((retencaoSubsídioCompleto / 12) * 100) / 100;
    // Art. 99.º-C, n.º 6: cada duodécimo retém 1/12 do imposto do direito total.
    expect(result.result.irsFerias).toBe(fracao);
    expect(result.result.irsNatal).toBe(fracao);
    expect(result.result.irsSubsidios).toBe(Math.round(fracao * 2 * 100) / 100);
    expect(result.result.irsSubsidios).toBeGreaterThan(0);
    expect(result.result.ssTrabalhador).toBe(256.67);
    expect(result.lines.filter((line) => line.detail?.includes("duodécimo"))).toHaveLength(2);

    const anual = calcularVencimentoAnual({
      salarioBruto: context.baseSalary,
      dependentes: context.dependants,
      estadoCivil: context.maritalStatus,
      regiao: context.region,
      subsidioRefeicaoDia: 0,
      diasUteis: 0,
    });
    // Doze arredondamentos mensais podem divergir alguns cêntimos do cálculo
    // anual, mas não podem alterar materialmente o imposto de cada subsídio.
    expect(Math.abs(result.result.irsFerias * 12 - anual.irsFerias)).toBeLessThanOrEqual(0.06);
    expect(Math.abs(result.result.irsNatal * 12 - anual.irsNatal)).toBeLessThanOrEqual(0.06);
  });

  it("respeita o montante manual de um subsídio ao completar os duodécimos", () => {
    const manual = rubric({ id: "real-holiday", type: "holiday_subsidy", amount: 180 });
    const rubrics = includeMonthlyDuodecimos([manual], context.baseSalary, true);
    // O montante do utilizador é preservado; só se lhe junta o direito anual a
    // que a fração pertence, para a retenção do Art. 99.º-C, n.º 6.
    expect(rubrics.filter((item) => item.type === "holiday_subsidy")).toEqual([
      { ...manual, entitlement: 2_000 },
    ]);
    expect(rubrics.filter((item) => item.type === "christmas_subsidy")).toHaveLength(1);
  });

  it("retém sobre o direito anual quando o duodécimo do subsídio é manual", () => {
    const manual = rubric({ id: "real-holiday", type: "holiday_subsidy", amount: 180 });
    const rubrics = includeMonthlyDuodecimos([manual], context.baseSalary, true);
    const result = calculateLegacyPayroll(context, rubrics);
    // Art. 99.º-C, n.º 6: imposto do subsídio COMPLETO × fração paga. Tratar os
    // 180 € como se fossem o direito inteiro punha a retenção a zero (a tabela
    // isenta remunerações até 920 €), e o líquido do mês vinha inflacionado.
    const direito = calcularVencimento({
      salarioBruto: 2_000,
      dependentes: 0,
      estadoCivil: "naoCasado",
      regiao: "continente",
      subsidioRefeicaoDia: 0,
      diasUteis: 0,
    }).irsRetido;
    expect(result.result.subsidioFerias).toBe(180);
    expect(result.result.irsFerias).toBe(Math.round((direito * 180 / 2_000) * 100) / 100);
    expect(result.result.irsFerias).toBeGreaterThan(0);
  });
});
