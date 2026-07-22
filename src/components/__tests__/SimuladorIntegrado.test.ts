import { describe, expect, it } from "vitest";
import { simularEmpresa } from "../SimuladorIntegrado";
import { SS_DEPENDENTE } from "@/lib/fiscal-data";

const SS_TRAB_TAXA = SS_DEPENDENTE.trabalhador.value;

// Argumentos "neutros" para isolar o efeito no salário do gerente — sem
// dividendos, sem TA, sem benefícios — ver assinatura completa em
// SimuladorIntegrado.tsx::simularEmpresa.
function simularSoSalario(salGerenteMensal: number) {
  return simularEmpresa(
    120_000, // faturacao
    0, // despesasOper
    0, // custosExtra
    salGerenteMensal,
    false, // distribuirDividendos
    false, // opcaoEnglobamento
    0, // encargosViatura
    "comb_baixo" as never, // tipoViatura
    0, // despRepresentacao
    0, // ajudasCusto
    0, // naoDocumentadas
    false, // emPrejuizo
    true, // excecaoPrejuizo
    0, // rfaiInvest
    "interior" as never, // regiaoRFAI
    0, // sifideDespesas
    "pme_normal" as never, // tipoSifide
    false, // primeirosAnos
    0, // custoConstituicao
    0, // rfaiContratualValor
  );
}

// ── Líquido do gerente deve descontar IRS, não só SS — P0-05 da auditoria 2026 ──
// O componente reexporta o motor canónico; este teste protege o contrato da
// superfície completa, além dos testes diretos de `fiscal-empresa.ts`.
describe("simularEmpresa (completo) — líquido do gerente desconta IRS do salário", () => {
  it("o líquido é estritamente menor que o salário após SS (o bug anterior tornava-os iguais)", () => {
    const r = simularSoSalario(3_000);
    const salarioApenasComSS = 3_000 * 12 * (1 - SS_TRAB_TAXA);
    expect(r.irsSalarioGerente).toBeGreaterThan(0);
    expect(r.liquidoGerenteLiberatoria).toBeLessThan(salarioApenasComSS);
    expect(r.liquidoGerenteLiberatoria).toBeCloseTo(salarioApenasComSS - r.irsSalarioGerente, 2);
  });
});
