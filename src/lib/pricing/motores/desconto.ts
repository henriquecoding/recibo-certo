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
import { custosVariaveisAoPreco, lucroAoPreco, type EntradaSolver } from "./preco";
import { dividir, fracao, num, unidades } from "../numeros";

export interface EntradaDesconto {
  solver: EntradaSolver;
  precoLiquido: number;
  pvp: number;
  fixosPorUnidade: number;
  unidadesMes: number;
  desconto: ModeloDesconto;
}

export function calcularDesconto(e: EntradaDesconto): ResultadoDesconto {
  const d = fracao(e.desconto?.percentagem ?? 0, 0, 0.99);
  const t = fracao(e.solver.taxaIVA, 0, 1);

  const pvpOriginal = num(e.pvp);
  const pvpComDesconto = pvpOriginal * (1 - d);
  const precoLiquidoComDesconto = dividir(pvpComDesconto, 1 + t, pvpComDesconto);

  const lucroAntes = lucroAoPreco(e.solver, num(e.precoLiquido)) - num(e.fixosPorUnidade);
  const lucroDepois = lucroAoPreco(e.solver, precoLiquidoComDesconto) - num(e.fixosPorUnidade);

  const margemAntes = e.precoLiquido > 0 ? dividir(lucroAntes, num(e.precoLiquido)) : 0;
  const margemDepois =
    precoLiquidoComDesconto > 0 ? dividir(lucroDepois, precoLiquidoComDesconto) : 0;

  // ── Desconto máximo: onde a contribuição chega a zero ──────────────
  // Resolver `lucroAoPreco(P) = 0` dá o piso; o desconto máximo é a
  // distância percentual entre o preço atual e esse piso.
  const disponivel = 1 - fracao(e.solver.fracaoLiquido, 0, 5) - fracao(e.solver.fracaoBruto, 0, 5) * (1 + t);
  const precoPiso =
    disponivel > 1e-9
      ? dividir(num(e.solver.custosEuros) + num(e.solver.fixosTransacao), disponivel)
      : Number.POSITIVE_INFINITY;

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
