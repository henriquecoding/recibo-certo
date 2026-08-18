// ═══════════════════════════════════════════════════════════════════════
//  MARGEM, MARKUP E MARGEM DE CONTRIBUIÇÃO
//  ---------------------------------------------------------------------
//  Margem e markup NÃO SÃO A MESMA COISA e a interface nunca os pode
//  tratar como sinónimos. A confusão custa dinheiro real:
//
//    custo 10 € · markup 50%  →  preço 15 €  →  margem 33,3%
//    custo 10 € · margem 50%  →  preço 20 €  →  markup 100%
//
//  Cinco euros de diferença no mesmo produto, com a mesma frase dita por
//  duas pessoas que julgam estar a dizer o mesmo. É por isso que a UI tem
//  dois modos explícitos, e que este motor converte um no outro para os
//  poder mostrar lado a lado.
//
//  A terceira métrica — margem de CONTRIBUIÇÃO — é a que responde à
//  pergunta que interessa a seguir: «quanto sobra de cada venda para pagar
//  as contas que existem mesmo que eu não venda?»
// ═══════════════════════════════════════════════════════════════════════

import { dividir, fracao, num } from "../numeros";

/** markup → margem. Sem comissões: m = k / (1 + k). */
export const margemDeMarkup = (markup: number): number => {
  const k = num(markup);
  return k <= -1 ? 0 : dividir(k, 1 + k);
};

/** margem → markup. Sem comissões: k = m / (1 − m). */
export const markupDeMargem = (margem: number): number => {
  const m = fracao(margem, -5, 0.999);
  return dividir(m, 1 - m);
};

export interface EntradaMargem {
  precoLiquido: number;
  /** Todos os custos variáveis, já avaliados ao preço. */
  custosVariaveis: number;
  /** Quota de custos fixos atribuída a esta unidade. */
  fixosPorUnidade: number;
  /** Base de custo sobre a qual o markup se mede. */
  baseMarkup: number;
  unidadesMes: number;
}

export interface SaidaMargem {
  lucroUnidade: number;
  margem: number;
  markup: number;
  contribuicaoUnidade: number;
  contribuicaoPercentagem: number;
  contribuicaoMensal: number;
  lucroMensal: number;
}

export function calcularMargem(e: EntradaMargem): SaidaMargem {
  const p = num(e.precoLiquido);
  const cv = num(e.custosVariaveis);
  const cf = num(e.fixosPorUnidade);
  const q = Math.max(0, num(e.unidadesMes));

  const contribuicaoUnidade = p - cv;
  const lucroUnidade = contribuicaoUnidade - cf;

  return {
    lucroUnidade,
    margem: p > 0 ? dividir(lucroUnidade, p) : 0,
    markup: e.baseMarkup > 0 ? dividir(lucroUnidade, e.baseMarkup) : 0,
    contribuicaoUnidade,
    contribuicaoPercentagem: p > 0 ? dividir(contribuicaoUnidade, p) : 0,
    contribuicaoMensal: contribuicaoUnidade * q,
    lucroMensal: lucroUnidade * q,
  };
}
