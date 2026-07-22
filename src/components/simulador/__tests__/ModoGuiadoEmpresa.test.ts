import { describe, expect, it } from "vitest";
import { simularEmpresaGuiado } from "../ModoGuiadoEmpresa";
import { SS_DEPENDENTE } from "@/lib/fiscal-data";

const SS_TRAB_TAXA = SS_DEPENDENTE.trabalhador.value;

// Argumentos "neutros" para isolar o efeito no salário do gerente — sem
// dividendos, sem TA, sem benefícios, sem imóvel — ver assinatura completa em
// ModoGuiadoEmpresa.tsx::simularEmpresaGuiado.
function simularSoSalario(salGerenteMensal: number) {
  return simularEmpresaGuiado(
    120_000, // faturacao (cobre os custos com folga)
    0, // despesasOper
    0, // custosEstrutura
    salGerenteMensal,
    false, // distribuirDividendos
    false, // opcaoEnglobamento
    false, // incluirConstituicao
    0, // custoConstituicaoVal
    1, // anosAmortizacao
    "nenhuma" as never, // tipoViatura
    0, // encargosViatura
    0, // despRepresentacao
    0, // ajudasCusto
    0, // naoDocumentadas
    false, // emPrejuizo
    true, // excecaoPrejuizo
    "interior" as never, // rfaiRegiao
    0, // rfaiInvest
    false, // primeirosAnos
    0, // sifideDespesas
    "pme_normal" as never, // tipoSifide
    0, // rfaiContratualValor
    false, // temImovel
    0, // vptImovel
    0, // taxaIMI
    false, // isencaoIMI
    0, // valorAquisicao
    false, // isencaoIMT
    1, // anosAmortIMT
  );
}

// ── Líquido do gerente deve descontar IRS, não só SS — P0-05 da auditoria 2026 ──
describe("simularEmpresaGuiado — líquido do gerente desconta IRS do salário", () => {
  it("o líquido é estritamente menor que o salário após SS (o bug anterior tornava-os iguais)", () => {
    const r = simularSoSalario(3_000);
    const salarioApenasComSS = 3_000 * 12 * (1 - SS_TRAB_TAXA);
    expect(r.irsSalarioGerente).toBeGreaterThan(0);
    expect(r.liquidoGerente).toBeLessThan(salarioApenasComSS);
    expect(r.liquidoGerente).toBeCloseTo(salarioApenasComSS - r.irsSalarioGerente, 2);
  });

  it("um gerente com salário muito baixo (abaixo da dedução específica) não paga IRS negativo", () => {
    const r = simularSoSalario(300); // 3 600 €/ano — bem abaixo da dedução específica
    expect(r.irsSalarioGerente).toBeGreaterThanOrEqual(0);
    expect(r.liquidoGerente).toBeGreaterThanOrEqual(0);
  });

  it("taxaMarginalGerente é coerente com um salário anual elevado (escalão alto)", () => {
    const baixo = simularSoSalario(1_500);
    const alto = simularSoSalario(8_000);
    expect(alto.taxaMarginalGerente).toBeGreaterThanOrEqual(baixo.taxaMarginalGerente);
  });
});
