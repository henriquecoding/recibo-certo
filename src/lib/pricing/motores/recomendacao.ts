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
import type { ConversorPreco } from "./iva";
import { sugerirPrecosPsicologicos } from "./psicologico";
import { lucroAoPreco } from "./preco";
import { cent, dividir, fracao, num } from "../numeros";

export interface EntradaFaixa {
  /** Só os custos variáveis — é este que define o piso absoluto. */
  solver: EntradaSolver;
  /**
   * O MESMO solver com que o orquestrador resolveu o preço: custos fixos
   * por unidade por dentro, e por dentro também do escudo fiscal quando o
   * regime é de contabilidade organizada.
   *
   * Vem de fora em vez de ser remontado aqui porque a cópia local esquecia
   * `custosDedutiveis`, e a âncora «confortável» passava a ser calculada
   * com uma equação diferente da que produziu o preço recomendado ao lado.
   */
  solverComFixos: EntradaSolver;
  /**
   * Líquido ↔ PVP com o regime lá dentro. As âncoras têm de ser convertidas
   * pela mesma regra que converteu o preço recomendado — no regime da
   * margem, `× (1 + t)` mostraria um PVP que ninguém paga.
   */
  conversor: ConversorPreco;
  /** Margem que o preço recomendado ENTREGA (fração). */
  margemAlvo: number;
  /** Folga adicional para a âncora «confortável», em pontos de margem. */
  folga: number;
  /** O preço efetivamente calculado, para o marcar como recomendado. */
  precoRecomendado: number;
}

export function calcularFaixa(e: EntradaFaixa): FaixaPreco {
  const pvpDe = (liquido: number) => e.conversor.paraPVP(liquido);
  const ancoras: AncoraPreco[] = [];

  // Medida com o solver dos fixos — o mesmo com que o preço foi resolvido.
  const margemEm = (precoLiquido: number): number =>
    precoLiquido > 0 ? dividir(lucroAoPreco(e.solverComFixos, precoLiquido), precoLiquido) : 0;

  // ── Piso e mínimo sustentável ──────────────────────────────────────
  //  O piso é a margem de contribuição zero; o mínimo sustentável é o
  //  mesmo com a quota de custos fixos por dentro.
  //
  //  SEM custos fixos declarados, os dois são o MESMO número, ao cêntimo.
  //  Mostrá-los como duas âncoras punha o mesmo valor duas vezes no ecrã,
  //  com explicações que se contradizem à leitura — «nem os custos ficam
  //  cobertos» logo por cima de «cobre tudo» — e a primeira reação de quem
  //  lê é que uma delas está errada. Quando coincidem, há uma linha só.
  const piso = precoPorMargem(e.solver, 0);
  const solverComFixos = e.solverComFixos;
  const minimo = precoPorMargem(solverComFixos, 0);
  const coincidem =
    piso.ok && minimo.ok && Math.abs(minimo.precoLiquido - piso.precoLiquido) < 0.005;

  if (piso.ok) {
    ancoras.push({
      chave: "piso",
      rotulo: "Piso absoluto",
      precoLiquido: piso.precoLiquido,
      pvp: pvpDe(piso.precoLiquido),
      margem: margemEm(piso.precoLiquido),
      explicacao: coincidem
        ? "Abaixo deste valor cada venda tira-te dinheiro. Como não declaraste custos fixos, este é também o mínimo sustentável — não há contas de estrutura à espera de serem cobertas."
        : "Abaixo deste valor cada venda tira-te dinheiro: nem os custos que só existem quando vendes ficam cobertos.",
    });
  }

  if (minimo.ok && !coincidem) {
    ancoras.push({
      chave: "minimo",
      rotulo: "Mínimo sustentável",
      precoLiquido: minimo.precoLiquido,
      pvp: pvpDe(minimo.precoLiquido),
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
      pvp: pvpDe(recomendado),
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
      pvp: pvpDe(confortavel.precoLiquido),
      margem: margemEm(confortavel.precoLiquido),
      explicacao: `Mais ${Math.round(folga * 100)} pontos de margem — a folga que absorve estimativas otimistas e imprevistos.`,
    });
  }

  const psicologicos = sugerirPrecosPsicologicos({
    pvp: pvpDe(recomendado),
    conversor: e.conversor,
    lucroAoPrecoLiquido: (p) => lucroAoPreco(solverComFixos, p),
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
