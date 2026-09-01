// ─────────────────────────────────────────────────────────────────────
//  XLSX — onde o CSV desiste
//  ---------------------------------------------------------------------
//  Um recibo tem várias tabelas — rubricas, descontos, ano, memória, fontes —
//  e um CSV só sabe ter uma. O XLSX resolve com uma folha por tabela e traz o
//  que o CSV nunca terá.
//
//  A regra que faz toda a diferença: as células numéricas guardam NÚMEROS,
//  nunca texto formatado. O «€» e a vírgula são `numFmt`, não conteúdo. É isto
//  que permite somar uma coluna, fazer uma tabela dinâmica, e ver o ficheiro
//  certo tanto em pt-PT como em en-US — os símbolos do formato são os do
//  ficheiro, e o Excel troca-os pelo locale de quem abre.
//
//  Erro clássico que aqui não se comete: escrever o formato à portuguesa
//  (`#.##0,00`) produz um formato INVÁLIDO fora de Portugal. O separador de
//  milhares no `numFmt` é sempre `,` e o decimal sempre `.`, independentemente
//  do idioma — é uma convenção do formato, não da língua.
// ─────────────────────────────────────────────────────────────────────

import type { Proveniencia } from "./referencia";
import { digestCurto } from "./referencia";

/**
 * Euro português por código de moeda (816 = EUR), com variante a vermelho para
 * negativos. O Excel resolve o `[$€-816]` para o símbolo e a posição corretos.
 */
export const FMT_EUR = '#,##0.00\\ [$€-816];[Red]\\-#,##0.00\\ [$€-816]';
export const FMT_PCT = "0.0%";
export const FMT_DATA = "dd/mm/yyyy";
export const FMT_NUMERO = "#,##0.##";

export type TipoColuna = "texto" | "dinheiro" | "numero" | "percentagem" | "data";

export interface ColunaXLSX {
  codigo: string;
  rotulo: string;
  tipo: TipoColuna;
  /** Largura em carateres. Sem isto o Excel corta o cabeçalho com «###». */
  largura?: number;
}

export interface FolhaXLSX {
  nome: string;
  colunas: readonly ColunaXLSX[];
  linhas: readonly (readonly (string | number | Date | null)[])[];
  /**
   * Colunas (por código) que levam linha de total. O total é uma FÓRMULA
   * `SUBTOTAL(109;…)`, não um valor: quem recebe o ficheiro vê de onde vem o
   * número e pode filtrar linhas sem que o total passe a mentir.
   */
  totais?: readonly string[];
  /** Nota curta por baixo da tabela (pressupostos, âmbito). */
  nota?: string;
}

export interface LivroXLSX {
  titulo: string;
  assunto: string;
  palavrasChave?: string;
  folhas: readonly FolhaXLSX[];
  proveniencia: Proveniencia;
  /** Linhas da tabela de base legal da folha de verificação. */
  baseLegal?: readonly { norma: string; determina: string; verificadoEm: string }[];
  /** O que o documento NÃO faz. Quatro linhas honestas valem uma página de garantias. */
  ambito?: readonly string[];
}

const FMT_POR_TIPO: Record<TipoColuna, string | undefined> = {
  texto: undefined,
  dinheiro: FMT_EUR,
  numero: FMT_NUMERO,
  percentagem: FMT_PCT,
  data: FMT_DATA,
};

/** O nome de uma folha do Excel não pode exceder 31 carateres nem levar `[]:*?/\`. */
function nomeFolha(nome: string): string {
  return nome.replace(/[[\]:*?/\\]/g, "-").slice(0, 31);
}

function letraColuna(indice: number): string {
  let n = indice;
  let letra = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    n = Math.floor((n - resto - 1) / 26);
  }
  return letra;
}

/**
 * Constrói o livro. Devolve o buffer pronto a descarregar ou a servir.
 *
 * O ExcelJS é importado dinamicamente: são ~700 KB que não têm de entrar no
 * bundle inicial de quem nunca carrega em «Exportar».
 */
export async function construirXLSX(livro: LivroXLSX): Promise<ArrayBuffer> {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();

  // Um livro sem título chama-se «Livro1» para sempre, em todas as listas de
  // ficheiros por onde passar.
  wb.creator = "Recibo Certo";
  wb.lastModifiedBy = "Recibo Certo";
  wb.created = new Date(livro.proveniencia.emitidoEm);
  wb.modified = new Date(livro.proveniencia.emitidoEm);
  wb.title = livro.titulo;
  wb.subject = livro.assunto;
  wb.keywords = livro.palavrasChave ?? "Recibo Certo, IRS, Segurança Social, Portugal";
  wb.company = "Recibo Certo";
  wb.description = `Referência ${livro.proveniencia.referencia}. Estimativa — não substitui o recibo oficial.`;

  for (const folha of livro.folhas) {
    const ws = wb.addWorksheet(nomeFolha(folha.nome), {
      pageSetup: {
        paperSize: 9, // A4
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
      },
      views: [{ showGridLines: false }],
    });

    // Título e referência acima da tabela — é uma folha, não um CSV: aqui o
    // contexto por cima do cabeçalho ajuda em vez de estragar.
    ws.addRow([livro.titulo]);
    ws.getRow(1).font = { bold: true, size: 14 };
    ws.addRow([folha.nome]);
    ws.getRow(2).font = { size: 11, color: { argb: "FF6B6B63" } };
    ws.addRow([`Referência ${livro.proveniencia.referencia} · motor ${livro.proveniencia.motor} · tabelas de ${livro.proveniencia.anoFiscal}`]);
    ws.getRow(3).font = { size: 9, color: { argb: "FF8A887F" } };

    const linhaCabecalho = 4;
    ws.addRow(folha.colunas.map((coluna) => coluna.rotulo));
    const cabecalho = ws.getRow(linhaCabecalho);
    cabecalho.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cabecalho.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A4A39" } };
    cabecalho.alignment = { vertical: "middle", wrapText: true };
    cabecalho.height = 22;

    for (const linha of folha.linhas) ws.addRow([...linha]);

    const primeiraLinha = linhaCabecalho + 1;
    const ultimaLinha = linhaCabecalho + folha.linhas.length;

    folha.colunas.forEach((coluna, indice) => {
      const col = ws.getColumn(indice + 1);
      col.width = coluna.largura ?? Math.max(12, Math.min(42, coluna.rotulo.length + 4));
      const formato = FMT_POR_TIPO[coluna.tipo];
      if (formato) col.numFmt = formato;
      if (coluna.tipo !== "texto") col.alignment = { horizontal: "right" };
    });

    // Total por fórmula, não por valor.
    if (folha.totais?.length && folha.linhas.length > 0) {
      const valores: (string | number | { formula: string } | null)[] = folha.colunas.map((coluna, indice) => {
        if (indice === 0) return "Total";
        if (!folha.totais?.includes(coluna.codigo)) return null;
        const letra = letraColuna(indice + 1);
        return { formula: `SUBTOTAL(109,${letra}${primeiraLinha}:${letra}${ultimaLinha})` };
      });
      const linhaTotal = ws.addRow(valores as never[]);
      linhaTotal.font = { bold: true };
      linhaTotal.border = { top: { style: "medium", color: { argb: "FF0A4A39" } } };
    }

    if (folha.nota) {
      ws.addRow([]);
      const nota = ws.addRow([folha.nota]);
      nota.font = { size: 9, italic: true, color: { argb: "FF6B6B63" } };
    }

    // Painel fixo no cabeçalho e filtro automático — o que faz uma folha longa
    // continuar legível ao rolar.
    ws.views = [{ state: "frozen", ySplit: linhaCabecalho, showGridLines: false }];
    if (folha.linhas.length > 0) {
      ws.autoFilter = {
        from: { row: linhaCabecalho, column: 1 },
        to: { row: ultimaLinha, column: folha.colunas.length },
      };
    }
    // O equivalente ao `table.header(repeat: true)` do PDF: em papel, o
    // cabeçalho repete-se em todas as páginas.
    ws.pageSetup.printTitlesRow = `${linhaCabecalho}:${linhaCabecalho}`;
  }

  // ── Folha de fonte e verificação ─────────────────────────────────────────
  const ver = wb.addWorksheet("Fonte e verificação", { views: [{ showGridLines: false }] });
  ver.columns = [{ width: 28 }, { width: 76 }];
  const par = (chave: string, valor: string) => {
    const linha = ver.addRow([chave, valor]);
    linha.getCell(1).font = { bold: true };
    linha.alignment = { vertical: "top", wrapText: true };
  };
  ver.addRow(["Verificação do documento"]).font = { bold: true, size: 14 };
  ver.addRow([]);
  par("Referência", livro.proveniencia.referencia);
  par("Impressão digital", digestCurto(livro.proveniencia.digest));
  par("Impressão digital (completa)", livro.proveniencia.digest);
  par("Motor de cálculo", livro.proveniencia.motor);
  par("Tabelas fiscais", String(livro.proveniencia.anoFiscal));
  par("Emitido em", new Date(livro.proveniencia.emitidoEm).toLocaleString("pt-PT"));
  par("Confirmar em", livro.proveniencia.verificacao);
  ver.addRow([]);
  par("Natureza", "Estimativa informativa. Não substitui o recibo oficial nem aconselhamento profissional.");

  if (livro.ambito?.length) {
    ver.addRow([]);
    ver.addRow(["O que este documento NÃO faz"]).font = { bold: true, size: 12 };
    for (const linha of livro.ambito) {
      ver.addRow(["", linha]).alignment = { vertical: "top", wrapText: true };
    }
  }

  if (livro.baseLegal?.length) {
    ver.addRow([]);
    ver.addRow(["Base legal"]).font = { bold: true, size: 12 };
    const cab = ver.addRow(["Norma", "O que determina neste documento"]);
    cab.font = { bold: true };
    for (const item of livro.baseLegal) {
      ver.addRow([item.norma, `${item.determina} (verificado em ${item.verificadoEm})`]).alignment = {
        vertical: "top",
        wrapText: true,
      };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
