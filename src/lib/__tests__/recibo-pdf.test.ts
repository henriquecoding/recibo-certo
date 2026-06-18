import { describe, it, expect } from "vitest";
import { parseReciboTexto } from "../recibo-pdf";
import { calcularReciboMensal } from "../fiscal-dependente";

// Tokens que reproduzem o recibo SADGES do exemplo (NATA DA NATA, Fevereiro 2026),
// na ordem de leitura: abonos + TOTAL ILÍQUIDO, descontos + TOTAL DESCONTOS, rodapé.
const TOKENS = [
  "Processamento de", "Fevereiro de 2026", "Moeda :", "EUR",
  "NATA DA NATA, LDA", "PT510601316", "Pasteleiro Estag até 2 anos",
  "ABONOS",
  "Cód.", "Designação", "Quant.", "Valor Uni", "Valor",
  "1", "Vencimento", "30,00", "32,67", "980,00",
  "31", "Subsídio de Refeição (Cartão - A)", "19,00", "10,20", "193,80",
  "49", "Feriados", "1,00", "65,33", "65,33",
  "202", "Prémio - Desempenho", "0,00", "0,00", "26,67",
  "TOTAL ILÍQUIDO :", "1.265,80",
  "DESCONTOS",
  "Cód.", "Designação", "Valor",
  "32", "Subsídio de Refeição (cartão - D)", "193,80",
  "90", "Seg. Social (Empregado)", "117,92",
  "91", "IRS", "49,00",
  "TOTAL DESCONTOS :", "360,72",
  "TOTAL LÍQUIDO :", "905,08",
  "Venc. Mensal :", "980,00",
  "Acum. Sujeito IRS :", "2.111,33",
  "Acum. Retido IRS :", "89,00",
  "Taxas de IRS", "Valor Sujeito", "Valor Retido",
  "4,6100", "1.072,00", "-49,00",
  "Taxa efetiva de IRS:", "4,61 %",
  "Taxa Segurança Social:", "11,00",
];

describe("parseReciboTexto — recibo SADGES com abonos detalhados", () => {
  const r = parseReciboTexto(TOKENS);

  it("identifica a empresa, NIF e função (e ignora dados sensíveis)", () => {
    expect(r.empresaNome).toBe("NATA DA NATA, LDA");
    expect(r.empresaNif).toBe("PT510601316");
    expect(r.funcao).toBe("Pasteleiro Estag até 2 anos");
  });

  it("extrai mês e ano de processamento", () => {
    expect(r.mes).toBe(1); // Fevereiro
    expect(r.ano).toBe(2026);
  });

  it("extrai salário base, remuneração sujeita, IRS e Segurança Social", () => {
    expect(r.salarioBase).toBe(980);
    expect(r.remuneracaoSujeita).toBe(1072);
    expect(r.irsRetido).toBe(49);
    expect(r.ssDesconto).toBe(117.92);
  });

  it("decompõe o subsídio de refeição (dias, valor/dia, total, cartão)", () => {
    expect(r.subsidioRefeicaoDias).toBe(19);
    expect(r.subsidioRefeicaoDia).toBe(10.2);
    expect(r.subsidioRefeicaoTotal).toBe(193.8);
    expect(r.subsidioRefeicaoCartao).toBe(true);
  });

  it("extrai feriados trabalhados e prémio como linhas separadas", () => {
    expect(r.feriados).toBe(65.33);
    expect(r.premio).toBe(26.67);
  });
});

describe("calcularReciboMensal — bate certo com o recibo após mapeamento", () => {
  // Mapeamento equivalente ao de aplicarReciboPdf: base + prémio(regular) + outros.
  const det = calcularReciboMensal({
    salarioBruto: 980,
    subsidioRefeicaoDia: 10.2,
    subsidioRefeicaoCartao: true,
    diasSubsidio: 19,
    premio: 26.67,
    premioRegular: true,
    outrosRendimentosSujeitos: 65.33, // feriados
  });

  it("a base de incidência da SS é a remuneração sujeita do recibo (1072)", () => {
    expect(det.baseSS).toBeCloseTo(1072, 2);
    expect(det.ssTrabalhador).toBeCloseTo(117.92, 2);
  });

  it("o subsídio de refeição em cartão é isento (10,20/dia × 19 = 193,80)", () => {
    expect(det.subsidioRefeicaoTotal).toBeCloseTo(193.8, 2);
    expect(det.subsidioRefeicaoTributado).toBeCloseTo(0, 2);
  });

  it("o total ilíquido inclui salário, feriados, prémio e subsídio (1.265,80)", () => {
    expect(det.brutoTotal).toBeCloseTo(1265.8, 2);
  });
});
