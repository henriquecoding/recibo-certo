// ═══════════════════════════════════════════════════════════════════════
//  A COMPOSIÇÃO DO PREÇO — o modelo que a homepage de «Preço» anima
//  ---------------------------------------------------------------------
//  Este ficheiro é PURO e não importa a engine. Tem de ser: a demonstração
//  do hero recalcula a cada pixel arrastado, portanto corre no cliente, e
//  `precificar()` arrasta consigo `regras.ts`, `fiscal-data.ts` e os
//  dezoito motores. Pô-los acima da dobra era o oposto do que o cálculo no
//  servidor (`src/app/page.tsx`) existe para evitar — a mesma fronteira que
//  `components/simulador/palco.tsx` já declara em maiúsculas.
//
//  ── Então isto é matemática duplicada? Não. É a forma fechada. ────────
//
//  A especificação (`docs/architecture/pricing-calculation-spec.md`, §1.3)
//  resolve o preço a partir de markup assim:
//
//        (Cd + Cv€)·(1 + k − τ)
//    P = ────────────────────────      D = 1 − v − g(1+t) − τ(1 − g(1+t))
//                  D
//
//  A demonstração vende sem canal (g = 0) e a nenhum regime com imposto
//  sobre o LUCRO dentro do solver (τ = 0 — o IRC da sociedade vive em
//  `motores/sociedade.ts`, depois do preço). Com g = τ = 0, D = 1 − v e a
//  equação colapsa em `P = base·(1 + k) / (1 − v)`, que é exatamente o que
//  `composicaoDemo()` calcula. Não é uma segunda matemática: é a mesma,
//  com dois termos que a demonstração não usa postos a zero.
//
//  E não fica à confiança. `parametrosDemoPreco()`
//  (`demo-homepage.servidor.ts`) obtém `t` e `v` chamando `precificar()`,
//  e `pricing-demo-homepage.test.ts` compara as duas implementações numa
//  grelha de entradas: se a engine mudar de resposta, o teste parte antes
//  de a homepage passar a mentir.
//
//  ── Um número que a lei fixa nunca é escrito aqui ────────────────────
//
//  Não há `0.23` neste ficheiro. A taxa de IVA chega como parâmetro, vinda
//  de `IVA_TAXAS` em `fiscal-data.ts` através da engine. Escrevê-la à mão
//  é o defeito que `motores/iva.ts` foi criado para corrigir.
// ═══════════════════════════════════════════════════════════════════════

import { cent, dividir, fracao, naoNegativo } from "./numeros";

/** As quatro entradas que a pessoa arrasta no palco. */
export interface EntradasDemoPreco {
  /** Euros por unidade: aquisição ou matéria-prima. */
  materiais: number;
  /** Euros por unidade: o tempo aplicado, ao valor/hora praticado. */
  trabalho: number;
  /** Euros por unidade: a quota dos custos fixos do mês imputada à unidade. */
  estrutura: number;
  /**
   * Markup — fração ACRESCENTADA ao custo, não a margem.
   *
   * O protótipo desta homepage chamava-lhe «margem alvo · sobre os custos»,
   * que é as duas coisas ao mesmo tempo e nenhuma delas. São grandezas
   * diferentes e a diferença é grande: 40,4% de markup são 28,8% de margem.
   * `ComposicaoPreco` devolve as duas, com nomes que não se confundem.
   */
  markup: number;
}

/** Os limites de cada controlo. Arrastar nunca sai daqui. */
export const LIMITES_DEMO_PRECO = {
  materiais: [3, 42],
  trabalho: [2, 32],
  estrutura: [1, 20],
  markup: [0.1, 0.8],
} as const satisfies Record<keyof EntradasDemoPreco, readonly [number, number]>;

/** O exemplo com que o palco abre: uma peça física vendida direta. */
export const ENTRADAS_DEMO_PADRAO: EntradasDemoPreco = {
  materiais: 14.8,
  trabalho: 9.6,
  estrutura: 4.5,
  markup: 0.4038,
};

/**
 * Como a pessoa opera. Muda `fracaoFaturacao` — e só isso.
 *
 * É a diferença que a homepage existe para mostrar: a recibos verdes, a
 * Segurança Social e o IRS saem de CADA fatura (Art. 168.º do Código
 * Contributivo e Art. 31.º CIRS incidem sobre a faturação, não sobre o
 * lucro), portanto o mesmo lucro por unidade exige um preço mais alto.
 * Numa sociedade a fração é zero aqui, porque o IRC incide sobre o lucro e
 * é resolvido depois do preço, não dentro dele.
 */
export interface RegimeDemoPreco {
  id: "empresa" | "recibos-verdes";
  rotulo: string;
  /** Fração do preço líquido retida antes do lucro. `v` na especificação. */
  fracaoFaturacao: number;
  /** O que compõe essa fração, para a interface poder dizê-lo. */
  nota: string;
}

/** Os parâmetros que só o servidor sabe — todos vindos da engine. */
export interface ParametrosDemoPreco {
  /** Taxa de IVA da venda. Vem de `IVA_TAXAS`, nunca escrita à mão. */
  taxaIVA: number;
  /** Base legal da taxa, para a interface a poder citar. */
  fonteIVA: string;
  regimes: readonly [RegimeDemoPreco, RegimeDemoPreco];
}

export interface ComposicaoPreco {
  /** Materiais + trabalho + estrutura. O que a unidade custa a existir. */
  base: number;
  /** `base × markup`. O que fica depois de tudo o que a venda tem de pagar. */
  lucro: number;
  /** Segurança Social e IRS retidos da faturação. Zero na sociedade. */
  retencaoPessoal: number;
  /** Preço sem IVA. É a receita do vendedor — e onde a margem se mede. */
  liquido: number;
  iva: number;
  /** Preço de venda ao consumidor. É o que o DL 138/90 obriga a mostrar. */
  pvp: number;
  /** `lucro ÷ liquido`. Margem, na única base em que a palavra é honesta. */
  margem: number;
  /** `lucro ÷ base`. Markup — a mesma venda, medida do outro lado. */
  markup: number;
  /** O PVP que cobre custos e impostos e não deixa lucro nenhum. */
  minimoPVP: number;
}

/**
 * A forma fechada da §1.3 com g = τ = 0. Ver o cabeçalho.
 *
 * Os três valores monetários arredondam-se EM CONJUNTO, como em
 * `motor.ts`: arredondar o IVA por si dá somas que não fecham no ecrã.
 */
export function composicaoDemo(
  entradas: EntradasDemoPreco,
  parametros: { taxaIVA: number; fracaoFaturacao: number },
): ComposicaoPreco {
  const base =
    naoNegativo(entradas.materiais) + naoNegativo(entradas.trabalho) + naoNegativo(entradas.estrutura);
  const k = naoNegativo(entradas.markup);
  const t = fracao(parametros.taxaIVA, 0, 0.5);
  const v = fracao(parametros.fracaoFaturacao, 0, 0.9);

  const liquidoExato = dividir(base * (1 + k), 1 - v);
  const pvpExato = liquidoExato * (1 + t);
  const lucroExato = base * k;

  const liquido = cent(liquidoExato);
  const pvp = cent(pvpExato);
  const baseArredondada = cent(base);
  const lucro = cent(lucroExato);

  // Alguém tem de fechar a coluna, e é a retenção.
  //
  // As parcelas desenhadas têm de somar o preço desenhado: numa secção que
  // existe para PROVAR o número, uma soma que não bate faz o contrário do que
  // foi construída para fazer. Mas arredondar cada parcela por si não garante
  // isso — três `cent()` independentes podem afastar-se um cêntimo do total.
  //
  // Então uma delas passa a ser a diferença. Escolhe-se a retenção, e não o
  // lucro, por duas razões: o lucro é o número que a pessoa lê como «o que me
  // fica» e tem de continuar a bater ao cêntimo com `precificar()`; a retenção
  // é uma estimativa derivada, onde um cêntimo não muda decisão nenhuma.
  //
  // Numa sociedade isto dá exatamente zero — `base` já é um número inteiro de
  // cêntimos, portanto `cent(base + lucro)` e `base + cent(lucro)` arredondam
  // para o mesmo lado. `pricing-demo-homepage.test.ts` fixa as duas coisas.
  // `naoNegativo` e não `cent` sozinho: a subtração dá `-0` quando não há
  // retenção nenhuma, e `Intl.NumberFormat` escreve `-0` por extenso. Uma
  // sociedade a mostrar «−0,00 €» de Segurança Social é um imposto imaginário
  // com sinal trocado.
  const retencaoPessoal = naoNegativo(cent(liquido - baseArredondada - lucro));

  return {
    base: baseArredondada,
    lucro,
    retencaoPessoal,
    liquido,
    iva: cent(pvp - liquido),
    pvp,
    margem: dividir(lucroExato, liquidoExato),
    markup: k,
    minimoPVP: cent(dividir(base, 1 - v) * (1 + t)),
  };
}

/**
 * A régua onde o marcador do preço assenta.
 *
 * O topo cresce com o preço para o marcador nunca encostar ao fim, e o
 * mínimo tem um teto próprio: um preço abaixo do custo tem de continuar a
 * ver-se como estando ANTES do mínimo, e não colado a ele.
 */
export function reguaDemo(composicao: ComposicaoPreco) {
  const inicio = 20;
  const fim = Math.max(70, Math.ceil(composicao.pvp / 10) * 10 + 10);
  const posicao = (valor: number, min: number, max: number) =>
    Math.min(max, Math.max(min, dividir(valor - inicio, fim - inicio) * 100));

  return {
    inicio,
    fim,
    /** Percentagem, 0–100, onde o preço recomendado assenta. */
    preco: posicao(composicao.pvp, 2, 98),
    /** Percentagem onde o preço mínimo assenta. */
    minimo: posicao(composicao.minimoPVP, 0, 92),
    marcas: Array.from({ length: 6 }, (_, i) => Math.round(inicio + ((fim - inicio) / 5) * i)),
  };
}
