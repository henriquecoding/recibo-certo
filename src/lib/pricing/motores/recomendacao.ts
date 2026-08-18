// ═══════════════════════════════════════════════════════════════════════
//  A FAIXA DE PREÇO
//  ---------------------------------------------------------------------
//  «O teu preço é 23,47 €» é falsa precisão. Os dados que a pessoa
//  introduziu têm incerteza de dez por cento em cada linha; devolver dois
//  decimais como se fossem verdade é uma promessa que a aritmética não
//  consegue cumprir.
//
//  Quatro âncoras, cada uma com um significado que se explica numa frase:
//
//    piso          margem de contribuição = 0
//                  «abaixo disto, cada venda aumenta o prejuízo»
//    mínimo        lucro = 0 ao volume esperado (cobre os fixos)
//                  «aqui não ganhas, mas também não perdes»
//    recomendado   a margem que pediste
//    confortável   a margem que pediste + folga
//                  «absorve o erro das tuas próprias estimativas»
//
//  Nenhuma âncora é inventada: todas saem do mesmo solver e dos mesmos
//  dados. Se não conseguisse explicar de onde vem, não a mostrava.
// ═══════════════════════════════════════════════════════════════════════

import type { AncoraPreco, FaixaPreco } from "../tipos";
import { precoPorMargem, type EntradaSolver } from "./preco";
import { sugerirPrecosPsicologicos } from "./psicologico";
import { lucroAoPreco } from "./preco";
import { cent, dividir, fracao, num } from "../numeros";

export interface EntradaFaixa {
  solver: EntradaSolver;
  /** Quota de custos fixos por unidade ao volume esperado. */
  fixosPorUnidade: number;
  /** Margem pretendida (fração). */
  margemAlvo: number;
  /** Folga adicional para a âncora «confortável», em pontos de margem. */
  folga: number;
  /** O preço efetivamente calculado, para o marcar como recomendado. */
  precoRecomendado: number;
}

const pvpDe = (liquido: number, taxa: number) => liquido * (1 + fracao(taxa, 0, 1));

export function calcularFaixa(e: EntradaFaixa): FaixaPreco {
  const t = fracao(e.solver.taxaIVA, 0, 1);
  const ancoras: AncoraPreco[] = [];

  const margemEm = (precoLiquido: number): number =>
    precoLiquido > 0
      ? dividir(lucroAoPreco(e.solver, precoLiquido) - num(e.fixosPorUnidade), precoLiquido)
      : 0;

  // ── Piso: margem de contribuição zero ──────────────────────────────
  const piso = precoPorMargem(e.solver, 0);
  if (piso.ok) {
    ancoras.push({
      chave: "piso",
      rotulo: "Piso absoluto",
      precoLiquido: piso.precoLiquido,
      pvp: pvpDe(piso.precoLiquido, t),
      margem: margemEm(piso.precoLiquido),
      explicacao:
        "Abaixo deste valor cada venda tira-te dinheiro: nem os custos que só existem quando vendes ficam cobertos.",
    });
  }

  // ── Mínimo sustentável: lucro zero, fixos incluídos ────────────────
  // Trata a quota de fixos como mais um custo em euros por unidade.
  const solverComFixos: EntradaSolver = {
    ...e.solver,
    custosEuros: num(e.solver.custosEuros) + num(e.fixosPorUnidade),
  };
  const minimo = precoPorMargem(solverComFixos, 0);
  if (minimo.ok) {
    ancoras.push({
      chave: "minimo",
      rotulo: "Mínimo sustentável",
      precoLiquido: minimo.precoLiquido,
      pvp: pvpDe(minimo.precoLiquido, t),
      margem: 0,
      explicacao:
        "Cobre tudo — incluindo a parte das contas fixas que cabe a cada venda — mas não te deixa lucro nenhum.",
    });
  }

  // ── Recomendado ────────────────────────────────────────────────────
  const recomendado = num(e.precoRecomendado);
  if (recomendado > 0) {
    ancoras.push({
      chave: "recomendado",
      rotulo: "Recomendado",
      precoLiquido: recomendado,
      pvp: pvpDe(recomendado, t),
      margem: margemEm(recomendado),
      explicacao: "O preço que corresponde ao objetivo que definiste.",
    });
  }

  // ── Confortável ────────────────────────────────────────────────────
  const folga = fracao(e.folga, 0, 0.5);
  const margemConfortavel = fracao(e.margemAlvo, -1, 0.95) + folga;
  const confortavel = precoPorMargem(solverComFixos, margemConfortavel);
  if (confortavel.ok && confortavel.precoLiquido > recomendado) {
    ancoras.push({
      chave: "confortavel",
      rotulo: "Margem confortável",
      precoLiquido: confortavel.precoLiquido,
      pvp: pvpDe(confortavel.precoLiquido, t),
      margem: margemEm(confortavel.precoLiquido),
      explicacao: `Mais ${Math.round(folga * 100)} pontos de margem — a folga que absorve estimativas otimistas e imprevistos.`,
    });
  }

  const psicologicos = sugerirPrecosPsicologicos({
    pvp: pvpDe(recomendado, t),
    taxaIVA: t,
    lucroAoPrecoLiquido: (p) => lucroAoPreco(e.solver, p) - num(e.fixosPorUnidade),
  });

  return {
    ancoras: ancoras.map((a) => ({
      ...a,
      precoLiquido: cent(a.precoLiquido),
      pvp: cent(a.pvp),
    })),
    psicologicos,
  };
}
