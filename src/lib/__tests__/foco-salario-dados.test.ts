import { describe, expect, it } from "vitest";
import { dadosSalario } from "@/lib/foco/dados-servidor";
import { calcularVencimento } from "@/lib/fiscal-dependente";

describe("palco Salário: conferência do exemplo", () => {
  it("usa as duas tabelas oficiais e altera apenas o número de dependentes", () => {
    const dados = dadosSalario();
    const semDependente = calcularVencimento({ salarioBruto: 1_500, dependentes: 0 });
    const comDependente = calcularVencimento({ salarioBruto: 1_500, dependentes: 1 });

    expect(dados.bruto).toBe(1_500);
    expect(dados.ss).toBe(165);
    expect(dados.irsRecibo).toBe(168.17);
    expect(dados.irsCerto).toBe(133.88);
    expect(dados.liquidoRecibo).toBe(1_166.83);
    expect(dados.liquidoCerto).toBe(1_201.12);

    expect(dados.irsRecibo).toBe(semDependente.irsRetido);
    expect(dados.irsCerto).toBe(comDependente.irsRetido);
    expect(dados.liquidoRecibo).toBe(semDependente.liquido);
    expect(dados.liquidoCerto).toBe(comDependente.liquido);
  });

  it("fecha as duas contas do bruto ao cêntimo", () => {
    const dados = dadosSalario();
    expect(dados.liquidoRecibo + dados.ss + dados.irsRecibo).toBeCloseTo(dados.bruto, 2);
    expect(dados.liquidoCerto + dados.ss + dados.irsCerto).toBeCloseTo(dados.bruto, 2);
  });

  it("projeta 480,06 euros apenas sobre os catorze pagamentos declarados", () => {
    const dados = dadosSalario();
    const diferencaPagamento = Math.abs(dados.liquidoCerto - dados.liquidoRecibo);

    expect(diferencaPagamento).toBeCloseTo(34.29, 2);
    expect(dados.pagamentosProjetados).toBe(14);
    expect(dados.diferenca14Pagamentos).toBeCloseTo(480.06, 2);
    expect(dados.diferenca14Pagamentos).toBeCloseTo(
      diferencaPagamento * dados.pagamentosProjetados,
      2,
    );
  });
});
