// ═══════════════════════════════════════════════════════════════════════
//  A DECOMPOSIÇÃO DO PREÇO — «a cada venda, para onde vai isto?»
//  ---------------------------------------------------------------------
//  A barra que explica o número tem de explicar O NÚMERO. Parece óbvio e
//  não estava a acontecer: o cabeçalho mostrava o PVP e a barra somava
//  custo + custos de venda + impostos + fixos + lucro, o que dá o preço
//  LÍQUIDO. Num produto à taxa normal, a barra que decompunha «24,60 €»
//  somava 20,00 € — e o IVA, que é a segunda maior fatia, não aparecia em
//  lado nenhum.
//
//  Duas consequências, ambas más:
//
//   ① quem somasse as parcelas com o dedo no ecrã não chegava ao total, e
//     a primeira reação a uma conta que não fecha é desconfiar de todas as
//     outras;
//   ② o IVA desaparecia do único sítio onde importa dizer que ele NÃO é do
//     vendedor. É a diferença entre «recebo 24,60 €» e «recebo 20,00 € e
//     guardo 4,60 € para o Estado» — exatamente a confusão que faz alguém
//     gastar o IVA que tem a entregar.
//
//  Vive na engine e não no componente pela mesma razão que tudo o resto: é
//  aritmética, é testável, e presentação-a-fazer-contas é como se criam
//  duas fontes de verdade para o mesmo número.
//
//  NÃO muda `precificar()` nem o tipo `ResultadoPreco`. Lê um resultado já
//  calculado e reparte-o, portanto não pode partir invariante nenhum. O
//  único que introduz é o seu, e está no teste: **a soma das parcelas é o
//  total, ao cêntimo**.
// ═══════════════════════════════════════════════════════════════════════

import type { ResultadoPreco } from "../tipos";
import { cent, num } from "../numeros";

export type ChaveSegmento = "custo" | "venda" | "impostos" | "fixos" | "iva" | "lucro";

export interface SegmentoPreco {
  chave: ChaveSegmento;
  rotulo: string;
  /** Euros por unidade vendida. */
  valor: number;
  /** Uma frase curta: para onde vai este dinheiro. */
  nota: string;
  /** `true` quando o dinheiro nunca chega a ser do vendedor. */
  doEstado?: boolean;
}

export interface Decomposicao {
  segmentos: SegmentoPreco[];
  /**
   * O que a barra representa. Com lucro, é o PVP — e a soma fecha nele.
   * Com prejuízo, é o custo total, que é MAIOR do que o PVP: é essa a
   * história que a barra tem de contar, e escondê-la seria desenhar uma
   * venda saudável por cima de uma que não é.
   */
  total: number;
  /** O que o cliente paga. Igual a `total` exceto quando há prejuízo. */
  pvp: number;
  /** Quanto é que os custos ultrapassam o preço. Zero quando há lucro. */
  prejuizo: number;
}

/**
 * Reparte o PVP nas parcelas que o formam.
 *
 * ── Porque é que «custos de vender» é uma diferença e não uma soma ──────
 * Comissão do canal, taxa de pagamento, embalagem, portes, devoluções e
 * CAC entram todos aqui. Enumerá-los deixaria de fora o próximo que a
 * engine ganhasse — e faria a barra deixar de fechar em silêncio, que é o
 * defeito que esta função existe para corrigir. Derivá-lo por diferença
 * fecha a conta por construção e absorve, no único segmento que já é um
 * agregado, o cêntimo de arredondamento que sobra de arredondar cada
 * parcela por si.
 */
export function decomporPreco(r: ResultadoPreco): Decomposicao {
  const pvp = cent(r.pvp);
  const vazio: Decomposicao = { segmentos: [], total: 0, pvp: 0, prejuizo: 0 };

  if (!r.ok || pvp <= 0) return vazio;

  const iva = cent(r.iva);
  const custo = Math.max(0, num(r.custo.direto));
  const fixos = Math.max(0, num(r.custo.fixosPorUnidade));
  const impostos = r.fiscal.aplicavel
    ? Math.max(0, num(r.fiscal.ssPorUnidade) + num(r.fiscal.irsPorUnidade))
    : 0;
  const lucro = num(r.margem.lucroUnidade);

  // Com prejuízo não há resíduo a distribuir: o total é maior do que o
  // preço, e é o `variaveisTotais` do motor que diz quanto.
  const vendaBruta = Math.max(0, cent(num(r.custo.variaveisTotais) - custo - impostos));

  const segmentos: SegmentoPreco[] = [
    {
      chave: "custo",
      rotulo: "O que te custa",
      valor: custo,
      nota: "O produto ou o teu tempo, já com o IVA que não consegues deduzir.",
    },
    {
      chave: "venda",
      rotulo: "Custos de vender",
      valor: vendaBruta,
      nota: "Comissões, meios de pagamento, embalagem, portes e devoluções.",
    },
    {
      chave: "impostos",
      rotulo: "Segurança Social e IRS",
      valor: cent(impostos),
      nota: "Saem da tua faturação, tenha esta venda dado lucro ou não.",
      doEstado: true,
    },
    {
      chave: "fixos",
      rotulo: "A tua parte das contas fixas",
      valor: fixos,
      nota: "Renda, contabilidade e software, repartidos pelas vendas do mês.",
    },
    {
      chave: "iva",
      rotulo: "IVA",
      valor: iva,
      nota: "Não é teu: o cliente paga-o e tu entregas ao Estado.",
      doEstado: true,
    },
  ];

  if (lucro >= 0) {
    segmentos.push({
      chave: "lucro",
      rotulo: r.fiscal.aplicavel ? "Fica para ti" : "Margem",
      valor: cent(lucro),
      nota: r.fiscal.aplicavel
        ? "Depois de tudo — custos, comissões, impostos e contas fixas."
        : "Depois de todos os custos e das contas fixas.",
    });
  }

  // ── O cêntimo que faltava ──────────────────────────────────────────
  //  Cada parcela é arredondada por si no `motor.ts`, portanto a soma
  //  delas pode cair a um cêntimo do PVP — que também é arredondado por
  //  si. Um cêntimo é exatamente a diferença que alguém encontra a somar
  //  os números com o dedo no ecrã, e a primeira reação a uma conta que
  //  não fecha é desconfiar de todas as outras.
  //
  //  Por isso o resíduo é ATRIBUÍDO, não ignorado: vai para «custos de
  //  vender», que já é um agregado de meia dúzia de taxas e é onde um
  //  cêntimo de arredondamento genuinamente vive. Se lá não couber (não
  //  há custos de venda nenhuns), vai para o maior segmento — nunca para
  //  o IVA, que tem de continuar a bater com o que se entrega ao Estado.
  //
  //  Quando há prejuízo não há resíduo a distribuir: o total é a soma dos
  //  custos, não o preço, e é essa a história que a barra conta.
  //  Filtra-se ANTES de reconciliar: um segmento de meio cêntimo que
  //  desaparece da lista depois da conta reabre a diferença que a conta
  //  acabou de fechar.
  const visiveis = segmentos.filter((s) => s.valor > 0.004);

  if (lucro >= 0 && visiveis.length > 0) {
    const residuo = cent(pvp - visiveis.reduce((s, seg) => s + seg.valor, 0));
    if (residuo !== 0) {
      const venda = visiveis.find((s) => s.chave === "venda");
      const destino =
        venda && venda.valor + residuo >= 0
          ? venda
          : visiveis
              .filter((s) => s.chave !== "iva")
              .reduce((a, b) => (b.valor > a.valor ? b : a), visiveis[0]);
      destino.valor = cent(destino.valor + residuo);
    }
  }

  const total = cent(visiveis.reduce((s, seg) => s + seg.valor, 0));

  return {
    segmentos: visiveis,
    total,
    pvp,
    prejuizo: cent(Math.max(0, total - pvp)),
  };
}
