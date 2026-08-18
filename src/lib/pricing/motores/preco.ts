// ═══════════════════════════════════════════════════════════════════════
//  O SOLVER — resolve o preço em forma fechada
//  ---------------------------------------------------------------------
//  O problema que quase todas as calculadoras evitam: as comissões incidem
//  sobre o PREÇO, e o preço depende das comissões. É circular.
//
//  A maioria resolve por iteração (ou, pior, ignora e aplica a comissão
//  depois — o que dá sempre menos margem do que a pedida). Aqui resolve-se
//  algebricamente, porque a álgebra é exata e diz-nos uma coisa que a
//  iteração esconde: QUANDO NÃO HÁ SOLUÇÃO.
//
//  ── Modelo ────────────────────────────────────────────────────────────
//    P    preço líquido (a incógnita)
//    t    taxa de IVA da venda        PVP = P(1+t)
//    C    custos por unidade em euros (direto + variáveis + fixos por venda)
//    f    taxas fixas por transação
//    v    fração aplicada ao LÍQUIDO  (afiliado, Segurança Social, IRS)
//    g    fração aplicada ao BRUTO    (marketplace, % de processamento)
//    m    margem pretendida sobre P
//    k    markup pretendido sobre a base de custo
//
//    lucro = P − C − f − vP − gP(1+t)
//
//  Margem:  P(1 − v − g(1+t) − m) = C + f
//                    C + f
//           P = ───────────────────
//                1 − v − g(1+t) − m
//
//  Markup:            (C + f)(1 + k)
//           P = ─────────────────────────
//                   1 − v − g(1+t)
//
//  ── O denominador ─────────────────────────────────────────────────────
//  Se `1 − v − g(1+t) − m ≤ 0`, NÃO EXISTE preço. Não é «preço muito
//  alto»: é que as comissões, os impostos sobre a faturação e a margem
//  pretendida somam mais de 100% do preço, e nenhum número real satisfaz
//  a equação. A engine devolve `impossivel` com o motivo — e a interface
//  diz o que fazer (baixar a margem, mudar de canal, ou renegociar).
//
//  Uma calculadora que devolva `NaN` ou `-247,50 €` aqui está a esconder
//  a única informação verdadeiramente útil deste cenário.
// ═══════════════════════════════════════════════════════════════════════

import type { MotivoImpossivel } from "../tipos";
import { dividir, fracao, num } from "../numeros";

export interface EntradaSolver {
  /** Custos em euros por unidade que não dependem do preço. */
  custosEuros: number;
  /** Taxas fixas por transação, em euros. */
  fixosTransacao: number;
  /** Fração aplicada ao preço líquido. */
  fracaoLiquido: number;
  /** Fração aplicada ao PVP. */
  fracaoBruto: number;
  /** Taxa de IVA da venda. */
  taxaIVA: number;
}

export interface SaidaSolver {
  ok: boolean;
  precoLiquido: number;
  motivo?: MotivoImpossivel;
  /** O denominador da equação. Abaixo de zero, não há preço possível. */
  denominador: number;
  /** Quanto de cada euro líquido sobra depois das frações (sem margem). */
  fracaoDisponivel: number;
}

const FALHA = (motivo: MotivoImpossivel, denominador: number, disponivel: number): SaidaSolver => ({
  ok: false,
  precoLiquido: 0,
  motivo,
  denominador,
  fracaoDisponivel: disponivel,
});

/**
 * Fração de cada euro de preço líquido que sobra depois de pagar tudo o
 * que é percentual. É o teto teórico da margem: nenhuma margem acima disto
 * é alcançável, por muito que se suba o preço.
 */
export function fracaoDisponivel(entrada: EntradaSolver): number {
  const v = fracao(entrada.fracaoLiquido, 0, 5);
  const g = fracao(entrada.fracaoBruto, 0, 5);
  const t = fracao(entrada.taxaIVA, 0, 1);
  return 1 - v - g * (1 + t);
}

/** Preço a partir de uma margem pretendida sobre o preço líquido. */
export function precoPorMargem(entrada: EntradaSolver, margem: number): SaidaSolver {
  const disponivel = fracaoDisponivel(entrada);
  const m = fracao(margem, -5, 0.999);
  const denominador = disponivel - m;
  const numerador = num(entrada.custosEuros) + num(entrada.fixosTransacao);

  if (denominador <= 1e-9) {
    return FALHA("margem_inalcancavel", denominador, disponivel);
  }
  const p = dividir(numerador, denominador);
  if (!Number.isFinite(p) || p < 0) {
    return FALHA("margem_inalcancavel", denominador, disponivel);
  }
  return { ok: true, precoLiquido: p, denominador, fracaoDisponivel: disponivel };
}

/** Preço a partir de um markup sobre a base de custo. */
export function precoPorMarkup(entrada: EntradaSolver, markup: number): SaidaSolver {
  const disponivel = fracaoDisponivel(entrada);
  const k = Math.max(-0.999, num(markup));
  const numerador = (num(entrada.custosEuros) + num(entrada.fixosTransacao)) * (1 + k);

  if (disponivel <= 1e-9) {
    return FALHA("margem_inalcancavel", disponivel, disponivel);
  }
  const p = dividir(numerador, disponivel);
  return { ok: true, precoLiquido: p, denominador: disponivel, fracaoDisponivel: disponivel };
}

/** Preço a partir de um lucro em euros pretendido por unidade. */
export function precoPorLucroUnidade(entrada: EntradaSolver, lucro: number): SaidaSolver {
  const disponivel = fracaoDisponivel(entrada);
  const numerador = num(entrada.custosEuros) + num(entrada.fixosTransacao) + Math.max(0, num(lucro));

  if (disponivel <= 1e-9) {
    return FALHA("margem_inalcancavel", disponivel, disponivel);
  }
  return {
    ok: true,
    precoLiquido: dividir(numerador, disponivel),
    denominador: disponivel,
    fracaoDisponivel: disponivel,
  };
}

/**
 * O piso absoluto: o preço a que a margem de contribuição é exatamente
 * zero. Abaixo dele, cada venda adicional AUMENTA o prejuízo — e é por
 * isso que é o número mais importante do ecrã, mesmo não sendo o mais
 * bonito. `precoPorMargem(entrada, 0)` com os custos variáveis apenas.
 */
export function pisoAbsoluto(entrada: EntradaSolver): SaidaSolver {
  return precoPorMargem(entrada, 0);
}

/**
 * Lucro por unidade a um preço líquido dado. É a função inversa do solver
 * e existe para o caminho «eu quero cobrar X — diz-me o que sobra».
 */
export function lucroAoPreco(entrada: EntradaSolver, precoLiquido: number): number {
  const p = num(precoLiquido);
  const v = fracao(entrada.fracaoLiquido, 0, 5);
  const g = fracao(entrada.fracaoBruto, 0, 5);
  const t = fracao(entrada.taxaIVA, 0, 1);
  return p - num(entrada.custosEuros) - num(entrada.fixosTransacao) - v * p - g * p * (1 + t);
}

/** Custos variáveis totais (em euros) a um preço líquido dado. */
export function custosVariaveisAoPreco(entrada: EntradaSolver, precoLiquido: number): number {
  const p = num(precoLiquido);
  const v = fracao(entrada.fracaoLiquido, 0, 5);
  const g = fracao(entrada.fracaoBruto, 0, 5);
  const t = fracao(entrada.taxaIVA, 0, 1);
  return num(entrada.custosEuros) + num(entrada.fixosTransacao) + v * p + g * p * (1 + t);
}
