import { describe, it, expect } from "vitest";
import {
  retencaoIRSDependente,
  calcularVencimento,
  calcularVencimentoAnual,
} from "@/lib/fiscal-dependente";
import { SS_DEPENDENTE } from "@/lib/fiscal-data";

// ── retencaoIRSDependente ─────────────────────────────────────────────────────

describe("retencaoIRSDependente", () => {
  it("isenta remunerações até ao limiar (920€)", () => {
    expect(retencaoIRSDependente(920)).toBe(0);
    expect(retencaoIRSDependente(500)).toBe(0);
  });

  it("aplica a fórmula taxa marginal − parcela a abater", () => {
    // 1500€ cai no escalão até 1819 (taxa 0,241, parcela 193,33).
    expect(retencaoIRSDependente(1500, 0)).toBeCloseTo(1500 * 0.241 - 193.33, 2);
  });

  it("desconta a parcela por dependente e nunca devolve negativo", () => {
    const sem = retencaoIRSDependente(1500, 0);
    const com = retencaoIRSDependente(1500, 2);
    expect(com).toBeLessThan(sem);
    expect(retencaoIRSDependente(950, 4)).toBeGreaterThanOrEqual(0);
  });
});

// ── calcularVencimento (mensal) ───────────────────────────────────────────────

describe("calcularVencimento", () => {
  it("desconta SS (11%) e IRS ao bruto e soma o subsídio de refeição", () => {
    const r = calcularVencimento({ salarioBruto: 1500, subsidioRefeicaoDia: 6, diasUteis: 22 });
    expect(r.ssTrabalhador).toBeCloseTo(1500 * SS_DEPENDENTE.trabalhador.value, 2);
    expect(r.liquido).toBeCloseTo(1500 - r.ssTrabalhador - r.irsRetido + r.subsidioRefeicaoTotal, 2);
  });

  it("separa a parte tributada do subsídio de refeição acima do limite", () => {
    const r = calcularVencimento({ salarioBruto: 1500, subsidioRefeicaoDia: 12, subsidioRefeicaoCartao: true, diasUteis: 20 });
    // limite cartão 10,46 → excesso (12 − 10,46) × 20 dias.
    expect(r.subsidioRefeicaoTributado).toBeCloseTo((12 - 10.46) * 20, 2);
  });
});

// ── calcularVencimentoAnual (14 meses) ────────────────────────────────────────

describe("calcularVencimentoAnual", () => {
  it("modela 14 meses de salário base", () => {
    const a = calcularVencimentoAnual({ salarioBruto: 1500 });
    expect(a.brutoAnual).toBeCloseTo(1500 * 14, 2);
    expect(a.subsidioFerias).toBe(1500);
    expect(a.subsidioNatal).toBe(1500);
  });

  it("tributa os subsídios autonomamente (mesma fórmula da remuneração mensal)", () => {
    const a = calcularVencimentoAnual({ salarioBruto: 1500, dependentes: 0 });
    const mensal = retencaoIRSDependente(1500, 0);
    expect(a.irsFerias).toBeCloseTo(mensal, 2);
    expect(a.irsNatal).toBeCloseTo(mensal, 2);
    expect(a.irsSalario).toBeCloseTo(mensal * 12, 2);
    expect(a.irsAnual).toBeCloseTo(mensal * 14, 2);
  });

  it("aplica SS aos 14 meses", () => {
    const a = calcularVencimentoAnual({ salarioBruto: 1500 });
    expect(a.ssAnual).toBeCloseTo(1500 * 14 * SS_DEPENDENTE.trabalhador.value, 2);
  });

  it("a média mensal (duodécimos) é maior que um mês sem subsídio", () => {
    const args = { salarioBruto: 1500, subsidioRefeicaoDia: 6, diasUteis: 22 };
    const mensal = calcularVencimento(args);
    const anual = calcularVencimentoAnual(args);
    expect(anual.liquidoMedioMes).toBeGreaterThan(mensal.liquido);
    expect(anual.liquidoMedioMes).toBeCloseTo(anual.liquidoAnual / 12, 2);
  });
});
