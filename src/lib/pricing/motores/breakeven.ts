// ═══════════════════════════════════════════════════════════════════════
//  PONTO DE EQUILÍBRIO
//  ---------------------------------------------------------------------
//  A fórmula é trivial. O que não é trivial é o que se faz com ela.
//
//  Mostrar «84» não ajuda ninguém. Mostrar «precisas de vender cerca de 84
//  unidades por mês só para cobrir as contas — ao ritmo que esperas, isso
//  é o dia 19 do mês» transforma uma divisão numa decisão.
//
//  E há o caso que a fórmula não cobre: margem de contribuição ≤ 0. Aí não
//  existe ponto de equilíbrio nenhum — vender mais afunda mais. Devolver
//  `Infinity` seria matematicamente defensável e humanamente inútil.
// ═══════════════════════════════════════════════════════════════════════

import type { DetalheBreakEven } from "../tipos";
import { dividir, num, unidades } from "../numeros";

export interface EntradaBreakEven {
  contribuicaoUnidade: number;
  custosFixosMensais: number;
  pvp: number;
  unidadesMesEsperadas: number;
}

export function calcularBreakEven(e: EntradaBreakEven): DetalheBreakEven {
  const mc = num(e.contribuicaoUnidade);
  const fixos = Math.max(0, num(e.custosFixosMensais));
  const esperadas = Math.max(0, num(e.unidadesMesEsperadas));

  if (mc <= 0) {
    return {
      possivel: false,
      unidades: 0,
      faturacao: 0,
      nota:
        "A este preço cada venda não cobre sequer os custos variáveis. Não há ponto de equilíbrio: vender mais aumenta o prejuízo em vez de o reduzir.",
    };
  }

  if (fixos === 0) {
    return {
      possivel: true,
      unidades: 0,
      faturacao: 0,
      nota:
        "Não declaraste custos fixos, por isso qualquer venda com margem já dá lucro. Vale a pena confirmar: renda, contabilidade, software e seguros contam mesmo quando não vendes nada.",
    };
  }

  const n = unidades(dividir(fixos, mc));
  const faturacao = n * num(e.pvp);
  const dias = esperadas > 0 ? Math.min(999, Math.ceil((n / esperadas) * 30)) : undefined;

  return {
    possivel: true,
    unidades: n,
    faturacao,
    diasAoRitmoAtual: dias,
    nota:
      esperadas > 0 && n > esperadas
        ? `Ao ritmo que esperas (${esperadas} por mês) não chegas ao equilíbrio: faltam ${n - esperadas} vendas por mês.`
        : undefined,
  };
}
