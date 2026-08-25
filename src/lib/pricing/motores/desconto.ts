// ═══════════════════════════════════════════════════════════════════════
//  MOTOR DE DESCONTO
//  ---------------------------------------------------------------------
//  `preço × 0,9` é a conta. Não é a resposta.
//
//  Um desconto de 10% num produto com 30% de margem não corta 10% do
//  lucro: corta um terço. E se a comissão do canal incide sobre o bruto, a
//  comissão desce também — mas menos do que a margem, porque a margem é o
//  resíduo. A pessoa merece ver os dois números lado a lado.
//
//  Três coisas que este motor devolve e que quase nenhuma ferramenta dá:
//
//   · o DESCONTO MÁXIMO antes de a margem de contribuição chegar a zero —
//     o limite real de negociação;
//   · quantas UNIDADES EXTRA seriam precisas para manter o mesmo lucro
//     total, que é a pergunta que o comercial devia fazer antes de ceder;
//   · o aviso legal: anunciar uma redução obriga a indicar o preço mais
//     baixo praticado nos 30 dias anteriores (DL 70/2007, red. DL 109-G/2021).
// ═══════════════════════════════════════════════════════════════════════

import type { ModeloDesconto, ResultadoDesconto } from "../tipos";
import { custosVariaveisAoPreco, lucroAoPreco, pisoAbsoluto, type EntradaSolver } from "./preco";
import type { ConversorPreco } from "./iva";
import { dividir, fracao, num, unidades } from "../numeros";

export interface EntradaDesconto {
  /**
   * O solver SEM custos fixos. É ele que define o piso absoluto e a margem
   * de contribuição — as duas coisas que, por definição, se medem antes da
   * estrutura (especificação §7).
   */
  solver: EntradaSolver;
  /**
   * O MESMO solver com que o orquestrador resolveu o preço: custos fixos
   * por dentro, e com eles o escudo fiscal de τ.
   *
   * Tem de vir de fora. Medir o lucro como `lucroAoPreco(solver, P) −
   * fixos` perde esse escudo, e o bloco de desconto passava a anunciar uma
   * margem diferente da do cartão de resultado — 31,4% ao lado de 35,0%,
   * no mesmo ecrã, para o mesmo preço. É o invariante 11.
   */
  solverComFixos: EntradaSolver;
  /** Líquido ↔ PVP com o regime lá dentro. */
  conversor: ConversorPreco;
  precoLiquido: number;
  pvp: number;
  unidadesMes: number;
  desconto: ModeloDesconto;
}

export function calcularDesconto(e: EntradaDesconto): ResultadoDesconto {
  const d = fracao(e.desconto?.percentagem ?? 0, 0, 0.99);

  const pvpOriginal = num(e.pvp);
  const pvpComDesconto = pvpOriginal * (1 - d);
  // O desconto anuncia-se sobre o que o cliente paga; a receita que dele
  // sobra é o que o conversor disser — no regime da margem, descer o preço
  // desce também o IVA, porque a margem tributável encolheu.
  const precoLiquidoComDesconto = e.conversor.paraLiquido(pvpComDesconto);

  // Do MESMO solver que resolveu o preço, com os fixos lá dentro. A cópia
  // anterior subtraía `fixosPorUnidade` por fora, e em contabilidade
  // organizada isso perdia o escudo fiscal deles — τ × fixos de diferença
  // entre este bloco e o cartão de resultado.
  const lucroAntes = lucroAoPreco(e.solverComFixos, num(e.precoLiquido));
  const lucroDepois = lucroAoPreco(e.solverComFixos, precoLiquidoComDesconto);

  const margemAntes = e.precoLiquido > 0 ? dividir(lucroAntes, num(e.precoLiquido)) : 0;
  const margemDepois =
    precoLiquidoComDesconto > 0 ? dividir(lucroDepois, precoLiquidoComDesconto) : 0;

  // ── Desconto máximo: onde a contribuição chega a zero ──────────────
  // Resolver `lucroAoPreco(P) = 0` dá o piso; o desconto máximo é a
  // distância percentual entre o preço atual e esse piso.
  // Usa-se `pisoAbsoluto`, que é o mesmo solver, em vez de repetir aqui a
  // equação: a cópia inline ignorava τ e dava um piso errado a quem está em
  // contabilidade organizada — e um «desconto máximo» maior do que o real.
  const piso = pisoAbsoluto(e.solver);
  const disponivel = piso.fracaoDisponivel;
  const precoPiso = piso.ok ? piso.precoLiquido : Number.POSITIVE_INFINITY;

  const descontoMaximo =
    Number.isFinite(precoPiso) && e.precoLiquido > 0
      ? Math.max(0, 1 - dividir(precoPiso, num(e.precoLiquido)))
      : 0;

  // ── Unidades extra para manter o lucro total ───────────────────────
  const q = Math.max(0, num(e.unidadesMes));
  const contribuicaoAntes = num(e.precoLiquido) - custosVariaveisAoPreco(e.solver, num(e.precoLiquido));
  const contribuicaoDepois =
    precoLiquidoComDesconto - custosVariaveisAoPreco(e.solver, precoLiquidoComDesconto);

  let unidadesExtraParaCompensar: number | null = null;
  if (q > 0 && contribuicaoDepois > 0 && contribuicaoAntes > 0) {
    const necessarias = dividir(contribuicaoAntes * q, contribuicaoDepois);
    unidadesExtraParaCompensar = Math.max(0, unidades(necessarias) - q);
  }

  return {
    percentagem: d,
    pvpOriginal,
    pvpComDesconto,
    precoLiquidoComDesconto,
    margemAntes,
    margemDepois,
    lucroAntes,
    lucroDepois,
    descontoMaximo,
    destruiRentabilidade: lucroDepois < 0 || contribuicaoDepois <= 0,
    unidadesExtraParaCompensar,
  };
}
