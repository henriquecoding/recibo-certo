// ─────────────────────────────────────────────────────────────────────
//  As catorze prestações do ano — apuradas, não repartidas
//  ---------------------------------------------------------------------
//  Um gráfico num relatório financeiro serve para responder a uma pergunta,
//  não para decorar. A pergunta é: «que meses são diferentes, e quanto?».
//
//  A tentação é repartir o total anual por catorze. Não se pode: os meses com
//  subsídio de refeição têm uma base de incidência diferente dos que não têm, e
//  os subsídios de férias e de Natal são objeto de retenção AUTÓNOMA — a
//  fórmula da tabela aplica-se-lhes em separado. Repartir uma média daria um
//  gráfico plano e errado, que é pior do que nenhum.
//
//  Cada barra é uma chamada ao motor.
// ─────────────────────────────────────────────────────────────────────

import { calcularReciboMensal, type ReciboMensalInput } from "@/lib/fiscal-dependente";
import { cent, pctDoc } from "./dinheiro";

export interface Prestacao {
  rotulo: string;
  liquido: number;
  /** Prestações que se destacam por natureza (os dois subsídios). */
  destaque: boolean;
  /** Porque é diferente das outras — só quando é. */
  nota?: string;
}

export interface PrestacoesInput {
  /** A situação do recibo, sem as rubricas pontuais deste mês. */
  base: ReciboMensalInput;
  /** Meses em que o subsídio de refeição é pago (default 11 — exclui férias). */
  mesesSubsidioRefeicao?: number;
}

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * As catorze prestações: doze meses de salário e os dois subsídios.
 *
 * NÃO se afirma em que mês cai cada subsídio — depende da entidade
 * empregadora, e dizê-lo seria dar por adquirido um facto que não temos. Ficam
 * no fim, identificados pelo nome.
 */
export function prestacoesDoAno(input: PrestacoesInput): Prestacao[] {
  const base = input.base;
  const comRefeicao = Math.min(12, Math.max(0, input.mesesSubsidioRefeicao ?? 11));

  // Só a remuneração recorrente: horas extra, prémios e faltas deste mês não se
  // repetem, e supor que sim inflacionaria o ano inteiro.
  const recorrente: ReciboMensalInput = {
    ...base,
    horasSuplementares: undefined,
    premio: 0,
    horasAusencia: 0,
    subsidioFerias: 0,
    subsidioNatal: 0,
    ajudas: undefined,
    ajudasNacionalDias: 0,
    ajudasEstrangeiroDias: 0,
  };

  const prestacoes: Prestacao[] = [];
  for (let i = 0; i < 12; i++) {
    const temRefeicao = i < comRefeicao;
    const mes = calcularReciboMensal(
      temRefeicao ? recorrente : { ...recorrente, subsidioRefeicaoDia: 0, diasSubsidio: 0 },
    );
    prestacoes.push({
      rotulo: MESES_CURTOS[i],
      liquido: cent(mes.liquido),
      destaque: false,
      nota: temRefeicao ? undefined : "sem subsídio de refeição",
    });
  }

  // Os subsídios: retenção autónoma, cada um pela tabela em separado.
  for (const [rotulo, campo] of [
    ["Férias", "subsidioFerias"],
    ["Natal", "subsidioNatal"],
  ] as const) {
    const subsidio = calcularReciboMensal({
      ...recorrente,
      salarioBruto: 0,
      subsidioRefeicaoDia: 0,
      diasSubsidio: 0,
      [campo]: base.salarioBruto,
    });
    prestacoes.push({ rotulo, liquido: cent(subsidio.liquido), destaque: true, nota: "retenção autónoma" });
  }

  return prestacoes;
}

export interface NivelPrestacao {
  /** Quantas prestações partilham este valor e esta razão. */
  quantas: number;
  /** Quais — «Jan a Nov», «Dez», «Férias e Natal». */
  quais: string;
  liquido: number;
  /** Quanto pesa no total do ano (0–1), para dimensionar a barra. */
  peso: number;
  /** O mesmo peso já escrito em pt-PT — «80,6 %». Nunca formatado no Typst,
   *  que só sabe pôr ponto decimal. */
  pesoTexto: string;
  /** Diferença face ao nível mais alto. Zero no próprio. */
  diferenca: number;
  nota?: string;
  destaque: boolean;
}

/** «Jan a Nov», «Férias e Natal», «Dez» — conforme quantos são. */
function nomearCorrida(rotulos: readonly string[]): string {
  if (rotulos.length === 1) return rotulos[0];
  if (rotulos.length === 2) return `${rotulos[0]} e ${rotulos[1]}`;
  return `${rotulos[0]} a ${rotulos[rotulos.length - 1]}`;
}

/**
 * As prestações agrupadas por valor e por razão.
 *
 * Existe porque catorze barras não são catorze factos. A remuneração recorrente
 * é a mesma todos os meses — o que varia é ter ou não subsídio de refeição, e os
 * dois subsídios, que são retidos à parte. Na prática há dois ou três valores
 * distintos, e desenhá-los como catorze marcas é enfeite, não informação.
 *
 * Agrupa CORRIDAS consecutivas com o mesmo valor E a mesma razão: dezembro e os
 * subsídios podem dar o mesmo líquido por acaso aritmético, mas dão-no por
 * motivos diferentes, e juntá-los apagaria a explicação.
 */
export function niveisDePrestacao(prestacoes: readonly Prestacao[]): NivelPrestacao[] {
  if (prestacoes.length === 0) return [];

  const corridas: { itens: Prestacao[] }[] = [];
  for (const p of prestacoes) {
    const ultima = corridas[corridas.length - 1]?.itens[0];
    const mesmo =
      ultima !== undefined &&
      ultima.liquido === p.liquido &&
      ultima.nota === p.nota &&
      ultima.destaque === p.destaque;
    if (mesmo) corridas[corridas.length - 1].itens.push(p);
    else corridas.push({ itens: [p] });
  }

  const total = prestacoes.reduce((s, p) => s + p.liquido, 0);
  const maior = Math.max(...prestacoes.map((p) => p.liquido));

  return corridas.map(({ itens }) => {
    const peso = total > 0 ? (itens[0].liquido * itens.length) / total : 0;
    return {
      quantas: itens.length,
      quais: nomearCorrida(itens.map((p) => p.rotulo)),
      liquido: itens[0].liquido,
      peso,
      pesoTexto: pctDoc(peso),
      diferenca: cent(itens[0].liquido - maior),
      nota: itens[0].nota,
      destaque: itens[0].destaque,
    };
  });
}

/** Amplitude entre a maior e a menor prestação — o número que ninguém antecipa. */
export function amplitude(prestacoes: readonly Prestacao[]): { menor: Prestacao; maior: Prestacao; diferenca: number } | null {
  if (prestacoes.length === 0) return null;
  let menor = prestacoes[0];
  let maior = prestacoes[0];
  for (const p of prestacoes) {
    if (p.liquido < menor.liquido) menor = p;
    if (p.liquido > maior.liquido) maior = p;
  }
  return { menor, maior, diferenca: cent(maior.liquido - menor.liquido) };
}
