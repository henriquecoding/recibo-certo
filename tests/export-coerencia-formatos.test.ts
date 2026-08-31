// ─────────────────────────────────────────────────────────────────────
//  Ponto 7 da lista de verificação: o líquido do PDF, do XLSX e do CSV têm
//  de ser o MESMO número.
//
//  «O ponto 7 é o mais importante e o mais fácil de esquecer.» É por isso que
//  está preso em teste e não numa lista para alguém correr à mão.
// ─────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { calculateLegacyPayroll, employerCost, includeMonthlyDuodecimos } from "../src/lib/payroll-simulator-legacy-adapter";
import { prestacoesDoAno } from "../src/lib/export/prestacoes";
import { calcularVencimentoAnual } from "../src/lib/fiscal-dependente";
import { criarProveniencia } from "../src/lib/export/referencia";
import { dadosTypst, liquidoDoMes, livroXLSX, tabelasCSV, type DocumentoVencimento } from "../src/lib/export/documento-vencimento";
import { escreverCSV } from "../src/lib/export/csv";
import { construirXLSX, FMT_EUR } from "../src/lib/export/xlsx";
import { cent } from "../src/lib/export/dinheiro";

/** O cenário do protótipo da pesquisa, com números do motor do projeto. */
async function documento(): Promise<DocumentoVencimento> {
  const contexto = {
    baseSalary: 1_850,
    weeklyHours: 40,
    dependants: 1,
    dependantsWithDisability: 0,
    maritalStatus: "casadoUnico" as const,
    disability: false,
    region: "continente" as const,
    youthIrsBenefitYear: 3,
    meal: { enabled: true, days: 21, dailyAmount: 10.2, card: true },
  };
  const rubricas = includeMonthlyDuodecimos(
    [
      { id: "extra", type: "overtime_workday_first" as const, amount: 0, hours: 1.25, days: 0, dailyAmount: 0, regularity: "unknown" as const },
      { id: "premio", type: "performance_award" as const, amount: 250, hours: 0, days: 0, dailyAmount: 0, regularity: "not_regular" as const },
    ],
    contexto.baseSalary,
    false,
  );
  const calculo = calculateLegacyPayroll(contexto, rubricas);
  const ano = calcularVencimentoAnual({
    salarioBruto: contexto.baseSalary,
    dependentes: contexto.dependants,
    estadoCivil: contexto.maritalStatus,
    irsJovemAno: contexto.youthIrsBenefitYear,
    subsidioRefeicaoDia: contexto.meal.dailyAmount,
    subsidioRefeicaoCartao: contexto.meal.card,
    diasUteis: contexto.meal.days,
  });

  return {
    periodo: "Julho de 2026",
    proveniencia: await criarProveniencia("vencimento", { contexto, rubricas }),
    pressupostos: [
      { codigo: "situacao_familiar", rotulo: "Situação familiar", valor: "Casado · 1 titular" },
      { codigo: "dependentes", rotulo: "Dependentes", valor: "1" },
      { codigo: "irs_jovem", rotulo: "IRS Jovem", valor: "3.º ano" },
    ],
    linhas: calculo.lines,
    mes: calculo.result,
    ano,
    custoEmpresa: employerCost(calculo.result),
    prestacoes: prestacoesDoAno({ base: calculo.input }),
    baseLegal: [
      { norma: "Despacho n.º 233-A/2026", determina: "Tabelas de retenção na fonte aplicadas à remuneração do mês", verificadoEm: "2026-08-01" },
    ],
    ambito: ["Não substitui o recibo oficial.", "Não apura o IRS anual: mostra a retenção."],
    memoria: [
      {
        rubrica: "Segurança Social",
        formula: "base contributiva × 11%",
        valor: calculo.result.ssTrabalhador,
        fonte: "Código Contributivo",
      },
    ],
  };
}

describe("coerência entre formatos", () => {
  it("o líquido é o mesmo número no modelo, no CSV, no XLSX e nos dados do PDF", async () => {
    const doc = await documento();
    const liquido = liquidoDoMes(doc);

    // 1 · CSV — a linha TOTAL da tabela de rubricas, no dialeto de máquina.
    const rubricas = tabelasCSV(doc).find((t) => t.variante === "rubricas")!;
    const csv = escreverCSV(rubricas.tabela, { dialeto: "maquina" });
    const linhaTotal = csv.split("\r\n").find((l) => l.startsWith("TOTAL,"))!;
    const liquidoCSV = Number(linhaTotal.split(",").at(-1));

    // 2 · XLSX — a última coluna da folha de rubricas, somada.
    const livro = livroXLSX(doc);
    const folha = livro.folhas[0];
    const liquidoXLSX = cent(
      folha.linhas.reduce((total, linha) => total + Number(linha[linha.length - 1]), 0),
    );

    // 3 · PDF — o valor que o compositor recebe para o número do herói.
    const liquidoTypst = dadosTypst(doc).resposta.valor;

    expect(liquidoCSV).toBe(liquido);
    expect(liquidoXLSX).toBe(liquido);
    expect(liquidoTypst).toBe(liquido);
  });

  it("a soma das rubricas do documento é o bruto, em todos os formatos", async () => {
    const doc = await documento();
    const bruto = cent(doc.mes.brutoTotal);

    const somaModelo = cent(doc.linhas.reduce((total, linha) => total + linha.amount, 0));
    const somaTypst = cent(dadosTypst(doc).rubricas.reduce((total, r) => total + r.bruto, 0));
    const somaXLSX = cent(
      livroXLSX(doc).folhas[0].linhas.reduce((total, linha) => total + Number(linha[1]), 0),
    );

    expect(somaModelo).toBe(bruto);
    expect(somaTypst).toBe(bruto);
    expect(somaXLSX).toBe(bruto);
  });

  it("os quatro ficheiros partilham a referência e a impressão digital", async () => {
    const doc = await documento();
    expect(livroXLSX(doc).proveniencia.referencia).toBe(doc.proveniencia.referencia);
    expect(dadosTypst(doc).proveniencia.digest).toBe(doc.proveniencia.digest);
    expect(doc.proveniencia.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("o XLSX guarda números, nunca texto formatado", async () => {
    const doc = await documento();
    const buffer = await construirXLSX(livroXLSX(doc));
    expect(buffer.byteLength).toBeGreaterThan(4_000);

    const { Workbook } = await import("exceljs");
    const lido = new Workbook();
    await lido.xlsx.load(buffer);

    const folha = lido.getWorksheet("Mês — rubricas")!;
    expect(folha).toBeDefined();
    // Linha 4 é o cabeçalho; a 5 é a primeira de dados.
    const celula = folha.getCell("B5");
    expect(typeof celula.value).toBe("number");
    // O ExcelJS desescapa o `\ ` ao reler; o que tem de sobreviver é o código
    // da moeda e a estrutura do formato, não a barra invertida.
    const numFmt = String(folha.getColumn(2).numFmt);
    expect(numFmt).toContain("[$€-816]");
    expect(numFmt).toContain("#,##0.00");
    expect(numFmt).toContain("[Red]");

    // O total é uma FÓRMULA, não um valor congelado.
    const linhaTotal = folha.getRow(5 + doc.linhas.length);
    expect(String((linhaTotal.getCell(2).value as { formula?: string })?.formula ?? "")).toContain("SUBTOTAL(109");

    // Painel fixo, filtro e configuração de impressão.
    expect(folha.views[0]).toMatchObject({ state: "frozen", ySplit: 4 });
    expect(folha.autoFilter).toBeTruthy();
    expect(folha.pageSetup.fitToWidth).toBe(1);
    expect(folha.pageSetup.printTitlesRow).toBe("4:4");

    // Um livro sem título chama-se «Livro1» para sempre.
    expect(lido.title).toContain("Relatório de vencimento");
    expect(lido.creator).toBe("Recibo Certo");

    // A folha de verificação existe e traz a proveniência.
    const verificacao = lido.getWorksheet("Fonte e verificação")!;
    expect(verificacao).toBeDefined();
    const textos = verificacao.getSheetValues().flat().map(String).join(" ");
    expect(textos).toContain(doc.proveniencia.referencia);
    expect(textos).toContain(doc.proveniencia.digest);
  });

  it("o formato de moeda usa o código ISO, não os separadores portugueses", async () => {
    // Escrever `#.##0,00` à portuguesa produz um formato INVÁLIDO fora de
    // Portugal — o separador do numFmt é sempre `,` e o decimal sempre `.`.
    expect(FMT_EUR).toContain("[$€-816]");
    expect(FMT_EUR).toContain("#,##0.00");
    expect(FMT_EUR).not.toContain("#.##0,00");
  });
});
