// ─────────────────────────────────────────────────────────────────────
//  CSV — RFC 4180, em dois dialetos declarados
//  ---------------------------------------------------------------------
//  A tese: um CSV não serve dois consumidores.
//
//    quem abre no Excel em Portugal   quem importa num programa
//    separador   ;                    ,   (RFC 4180)
//    decimal     ,                    .
//    datas       31/07/2026           2026-07-31
//    BOM         necessário           atrapalha
//
//  Sem BOM, o Excel no Windows abre um .csv UTF-8 em ANSI e «Remuneração»
//  aparece «RemuneraÃ§Ã£o». Com BOM, muitos parsers entregam o primeiro nome
//  de coluna como `﻿data`. A resposta não é escolher um lado: é exportar
//  os dois, com nomes de ficheiro que digam ao que vêm.
//
//  NÃO se usa a linha `sep=;`. O Excel honra-a, mas é uma extensão da
//  Microsoft que quebra o RFC 4180 e aparece como uma linha de dados no
//  Numbers, no Sheets e no pandas.
// ─────────────────────────────────────────────────────────────────────

import { dataISO, dataPT, eurFolhaPT, eurMaquina, numeroDoc } from "./dinheiro";

export type DialetoCSV = "humano" | "maquina";

export interface RegrasDialeto {
  separador: string;
  bom: boolean;
  /** Formata um valor monetário para célula. */
  dinheiro: (valor: number) => string;
  /** Formata um número simples para célula. */
  numero: (valor: number) => string;
  /** Formata uma data para célula. */
  data: (valor: Date | string) => string;
}

export const DIALETOS: Record<DialetoCSV, RegrasDialeto> = {
  // Excel em pt-PT: ponto e vírgula, vírgula decimal, data portuguesa, BOM.
  humano: {
    separador: ";",
    bom: true,
    dinheiro: eurFolhaPT,
    numero: (valor) => numeroDoc(valor).replace(/\s/g, ""),
    data: dataPT,
  },
  // RFC 4180 puro: vírgula, ponto decimal, ISO 8601, sem BOM.
  maquina: {
    separador: ",",
    bom: false,
    dinheiro: eurMaquina,
    numero: (valor) => String(valor),
    data: dataISO,
  },
};

/** Fim de linha do RFC 4180 (§2.1). */
const CRLF = "\r\n";
const BOM = "﻿";

/**
 * Carateres que fazem o Excel, o LibreOffice e o Sheets AVALIAR a célula como
 * fórmula. As variantes de largura total contam: um atacante que saiba que os
 * ASCII estão filtrados usa `＝`.
 *
 * As aspas do RFC 4180 não protegem — o Excel avalia DEPOIS de as retirar.
 */
const INICIO_PERIGOSO = /^[=+\-@\t\r=＝＋－＠]/;

/**
 * Neutraliza a injeção de fórmulas prefixando com apóstrofo (OWASP).
 *
 * A nuance que quase toda a gente falha: aplicar isto a TUDO estraga os
 * números. `-205.44` passaria a `'-205.44` e entraria no Excel como texto — a
 * coluna deixava de somar e o utilizador culpa-nos a nós. Por isso a defesa
 * existe só em `texto()`: os campos numéricos são produzidos pelo motor e não
 * têm superfície de ataque; os de texto podem trazer o nome de um cliente, e
 * é aí — e só aí — que ela existe.
 */
export function neutralizarFormula(valor: string): string {
  return INICIO_PERIGOSO.test(valor) ? `'${valor}` : valor;
}

/**
 * Cita a célula só quando é preciso (separador, aspas, CR/LF ou espaço nas
 * pontas). Citar tudo torna o ficheiro maior sem ganho nenhum de correção.
 */
function citar(valor: string, separador: string): string {
  const precisa =
    valor.includes(separador) ||
    valor.includes('"') ||
    valor.includes("\n") ||
    valor.includes("\r") ||
    valor !== valor.trim();
  return precisa ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/** Célula tipada — o tipo é que decide as regras de formatação e de defesa. */
export type CelulaCSV =
  | { tipo: "texto"; valor: string }
  | { tipo: "dinheiro"; valor: number }
  | { tipo: "numero"; valor: number }
  | { tipo: "data"; valor: Date | string }
  | { tipo: "vazio" };

export const texto = (valor: string | undefined | null): CelulaCSV => ({ tipo: "texto", valor: valor ?? "" });
export const dinheiro = (valor: number): CelulaCSV => ({ tipo: "dinheiro", valor });
export const numero = (valor: number): CelulaCSV => ({ tipo: "numero", valor });
export const data = (valor: Date | string): CelulaCSV => ({ tipo: "data", valor });
/** Em-dash para «não aplicável». Zero e «não incide» são coisas diferentes. */
export const vazio = (): CelulaCSV => ({ tipo: "vazio" });

function renderizar(celula: CelulaCSV, regras: RegrasDialeto): string {
  switch (celula.tipo) {
    case "texto":
      return neutralizarFormula(celula.valor);
    case "dinheiro":
      return regras.dinheiro(celula.valor);
    case "numero":
      return regras.numero(celula.valor);
    case "data":
      return regras.data(celula.valor);
    case "vazio":
      return "";
  }
}

/**
 * Uma tabela — UMA. Um cabeçalho, zero linhas de título por cima, zero blocos
 * concatenados. Um ficheiro com três cabeçalhos e linhas em branco a separar
 * não é um CSV: é um relatório com a extensão errada, e nenhuma ferramenta o
 * importa.
 */
export interface TabelaCSV {
  /**
   * Chaves estáveis em snake_case, que nunca mudam entre versões. É o que
   * permite a alguém automatizar em cima do ficheiro sem depender de nós não
   * mexermos num rótulo.
   */
  colunas: readonly { codigo: string; rotulo: string }[];
  linhas: readonly (readonly CelulaCSV[])[];
}

export interface OpcoesCSV {
  dialeto: DialetoCSV;
  /**
   * No dialeto de máquina o cabeçalho são os códigos; no humano, os rótulos.
   * Quem lê o ficheiro à mão quer «Remuneração base»; quem o importa quer
   * `remuneracao_base`.
   */
  cabecalho?: "codigo" | "rotulo" | "auto";
}

/** Serializa uma tabela em CSV conforme o dialeto pedido. */
export function escreverCSV(tabela: TabelaCSV, opcoes: OpcoesCSV): string {
  const regras = DIALETOS[opcoes.dialeto];
  const modo = opcoes.cabecalho ?? "auto";
  const usarCodigo = modo === "codigo" || (modo === "auto" && opcoes.dialeto === "maquina");

  const linhas: string[] = [];
  linhas.push(
    tabela.colunas
      .map((coluna) => citar(neutralizarFormula(usarCodigo ? coluna.codigo : coluna.rotulo), regras.separador))
      .join(regras.separador),
  );
  for (const linha of tabela.linhas) {
    linhas.push(
      linha.map((celula) => citar(renderizar(celula, regras), regras.separador)).join(regras.separador),
    );
  }
  // Sem CRLF final: uma linha vazia no fim vira um registo vazio em vários
  // parsers, incluindo o `csv` da biblioteca padrão do Python.
  return (regras.bom ? BOM : "") + linhas.join(CRLF);
}

/** Os dois dialetos do mesmo conteúdo, para escrever os dois ficheiros. */
export function escreverAmbosCSV(tabela: TabelaCSV): { humano: string; maquina: string } {
  return {
    humano: escreverCSV(tabela, { dialeto: "humano" }),
    maquina: escreverCSV(tabela, { dialeto: "maquina" }),
  };
}
