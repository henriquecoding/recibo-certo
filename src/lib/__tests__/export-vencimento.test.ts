import { describe, expect, it } from "vitest";
import { relatorioVencimentoHTML, type RelatorioVencimento } from "../export-vencimento";

const base: RelatorioVencimento = {
  situacao: "Não casado",
  dependentes: 0,
  deficiencia: false,
  subsidioDia: 0,
  subsidioForma: "—",
  diasUteis: 0,
  duodecimos: false,
  regiao: "Madeira",
  salarioBase: 1_500,
  bruto: 1_600,
  ssTrabalhador: 176,
  irsRetido: 100,
  subsidioRefeicaoTotal: 0,
  subsidioRefeicaoIsento: 0,
  subsidioRefeicaoTributado: 0,
  liquido: 1_324,
  liquidoMostrado: 1_324,
  taxaEfetiva: 0.1725,
  custoEmpresa: 1_980,
  ssTaxaTrab: 0.11,
  tsuTaxa: 0.2375,
  brutoAnual: 21_000,
  subsidioFerias: 1_500,
  subsidioNatal: 1_500,
  irsFerias: 100,
  irsNatal: 100,
  irsAnual: 1_400,
  ssAnual: 2_310,
  liquidoAnual: 17_290,
  liquidoMedioMes: 1_440.83,
};

describe("relatório de vencimento", () => {
  it("preserva a região e inclui a decomposição auditável por rubrica", () => {
    const html = relatorioVencimentoHTML({
      ...base,
      linhas: [{
        rubrica: "Prémio <pontual>",
        detalhe: "Confirmação & origem",
        valor: 100,
        baseIRS: 100,
        baseSS: 100,
        irs: 10,
        ss: 11,
        liquido: 79,
      }],
    });
    expect(html).toContain("Madeira");
    expect(html).toContain("Base IRS");
    expect(html).toContain("Prémio &lt;pontual&gt;");
    expect(html).toContain("Confirmação &amp; origem");
    expect(html).not.toContain("não cobre as Regiões Autónomas");
  });
});
