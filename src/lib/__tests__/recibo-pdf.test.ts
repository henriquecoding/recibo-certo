import { describe, it, expect } from "vitest";
import { parseReciboTexto, parseReciboPosicional, combinarRecibo, type ItemPos, type ReciboExtraido } from "../recibo-pdf";
import { calcularReciboMensal } from "../fiscal-dependente";

// Tokens em ordem de leitura (âncoras robustas): empresa, mês, descontos, rodapé.
const TOKENS = [
  "Processamento de", "Fevereiro de 2026", "Moeda :", "EUR",
  "NATA DA NATA, LDA", "PT510601316", "Pasteleiro Estag até 2 anos",
  "DESCONTOS",
  "Cód.", "Designação", "Valor",
  "32", "Subsídio de Refeição (cartão - D)", "193,80",
  "90", "Seg. Social (Empregado)", "117,92",
  "91", "IRS", "49,00",
  "TOTAL DESCONTOS :", "360,72",
  "Venc. Mensal :", "980,00",
  "Taxas de IRS", "Valor Sujeito", "Valor Retido",
  "4,6100", "1.072,00", "-49,00",
];

describe("parseReciboTexto — âncoras robustas (independentes do layout)", () => {
  const r = parseReciboTexto(TOKENS);
  it("empresa, NIF e função", () => {
    expect(r.empresaNome).toBe("NATA DA NATA, LDA");
    expect(r.empresaNif).toBe("PT510601316");
    expect(r.funcao).toBe("Pasteleiro Estag até 2 anos");
  });
  it("mês/ano, salário base, sujeita, IRS, SS e total do subsídio", () => {
    expect(r.mes).toBe(1);
    expect(r.salarioBase).toBe(980);
    expect(r.remuneracaoSujeita).toBe(1072);
    expect(r.irsRetido).toBe(49);
    expect(r.ssDesconto).toBe(117.92);
    expect(r.subsidioRefeicaoTotal).toBe(193.8);
    expect(r.subsidioRefeicaoCartao).toBe(true);
  });
});

describe("parseReciboPosicional — tabela de 2 colunas (abonos | descontos)", () => {
  // Mesma linha (y) tem abono à esquerda e desconto à direita; só os valores da
  // coluna de abonos devem ser lidos (não os 117,92 etc. da coluna da direita).
  const itens: ItemPos[] = [
    // cabeçalhos
    { str: "Quant.", x: 240, y: 740 }, { str: "Valor Uni", x: 290, y: 740 }, { str: "Valor", x: 340, y: 740 },
    // Vencimento (abono) + Subsídio-D (desconto) na mesma linha
    { str: "1", x: 50, y: 700 }, { str: "Vencimento", x: 90, y: 700 }, { str: "30,00", x: 240, y: 700 }, { str: "32,67", x: 290, y: 700 }, { str: "980,00", x: 340, y: 700 },
    { str: "32", x: 430, y: 700 }, { str: "Subsídio de Refeição (cartão - D)", x: 460, y: 700 }, { str: "193,80", x: 590, y: 700 },
    // Subsídio-A (abono) + Seg. Social (desconto) na mesma linha
    { str: "31", x: 50, y: 680 }, { str: "Subsídio de Refeição (Cartão - A)", x: 90, y: 680 }, { str: "19,00", x: 240, y: 680 }, { str: "10,20", x: 290, y: 680 }, { str: "193,80", x: 340, y: 680 },
    { str: "90", x: 430, y: 680 }, { str: "Seg. Social (Empregado)", x: 460, y: 680 }, { str: "117,92", x: 590, y: 680 },
    // Feriados (abono) + IRS (desconto)
    { str: "49", x: 50, y: 660 }, { str: "Feriados", x: 90, y: 660 }, { str: "1,00", x: 240, y: 660 }, { str: "65,33", x: 290, y: 660 }, { str: "65,33", x: 340, y: 660 },
    { str: "91", x: 430, y: 660 }, { str: "IRS", x: 460, y: 660 }, { str: "49,00", x: 590, y: 660 },
    // Prémio (abono, sem desconto na linha)
    { str: "202", x: 50, y: 640 }, { str: "Prémio - Desempenho", x: 90, y: 640 }, { str: "0,00", x: 240, y: 640 }, { str: "0,00", x: 290, y: 640 }, { str: "26,67", x: 340, y: 640 },
  ];
  const p = parseReciboPosicional(itens);

  it("lê o subsídio da coluna de abonos (19 dias × 10,20 = 193,80), não os 117,92 da direita", () => {
    expect(p.subsidioRefeicaoDias).toBe(19);
    expect(p.subsidioRefeicaoDia).toBe(10.2);
    expect(p.subsidioRefeicaoTotal).toBe(193.8);
  });
  it("lê feriados (65,33) e prémio (26,67) das linhas certas", () => {
    expect(p.feriados).toBe(65.33);
    expect(p.premio).toBe(26.67);
  });
});

describe("combinarRecibo — só aceita valores posicionais plausíveis", () => {
  const base: ReciboExtraido = {
    salarioBase: 980,
    remuneracaoSujeita: 1072,
    subsidioRefeicaoTotal: 193.8,
    subsidioRefeicaoCartao: true,
    porPreencher: [],
  };

  it("aceita dia/dias (193,80 = 10,20×19) e prémio (cabe em 1072−980)", () => {
    const r = combinarRecibo(base, { subsidioRefeicaoDia: 10.2, subsidioRefeicaoDias: 19, premio: 26.67 });
    expect(r.subsidioRefeicaoDia).toBe(10.2);
    expect(r.subsidioRefeicaoDias).toBe(19);
    expect(r.premio).toBe(26.67);
  });

  it("REJEITA o lixo do parser antigo (dia 117,92 · dias 194 · prémio 1265,8)", () => {
    const r = combinarRecibo(base, { subsidioRefeicaoDia: 117.92, subsidioRefeicaoDias: 194, premio: 1265.8 });
    expect(r.subsidioRefeicaoDia).toBeUndefined();
    expect(r.subsidioRefeicaoDias).toBeUndefined();
    expect(r.premio).toBeUndefined();
    expect(r.subsidioRefeicaoTotal).toBe(193.8); // mantém o total fiável
  });
});

describe("calcularReciboMensal — bate certo com o recibo após mapeamento", () => {
  const det = calcularReciboMensal({
    salarioBruto: 980,
    subsidioRefeicaoDia: 10.2,
    subsidioRefeicaoCartao: true,
    diasSubsidio: 19,
    premio: 26.67,
    premioRegular: true,
    outrosRendimentosSujeitos: 65.33, // feriados
  });
  it("base SS = remuneração sujeita (1072) → SS 117,92", () => {
    expect(det.baseSS).toBeCloseTo(1072, 2);
    expect(det.ssTrabalhador).toBeCloseTo(117.92, 2);
  });
  it("subsídio em cartão isento e total ilíquido 1.265,80", () => {
    expect(det.subsidioRefeicaoTributado).toBeCloseTo(0, 2);
    expect(det.brutoTotal).toBeCloseTo(1265.8, 2);
  });
});
