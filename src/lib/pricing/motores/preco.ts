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
//    v    fração aplicada ao LÍQUIDO  (afiliado, Segurança Social, IRS
//         do regime simplificado — tudo o que incide sobre a FATURAÇÃO)
//    g    fração aplicada ao BRUTO    (marketplace, % de processamento)
//    τ    fração aplicada ao LUCRO    (IRS da contabilidade organizada)
//    m    margem pretendida sobre P
//    k    markup pretendido sobre a base de custo
//
//    lucro = P − C − f − vP − gP(1+t) − τ(P − C − f − gP(1+t))
//
//  Escrevendo  D = 1 − v − g(1+t) − τ(1 − g(1+t))   («o que sobra»):
//
//  Margem:  P(D − m) = (C + f)(1 − τ)
//                (C + f)(1 − τ)
//           P = ─────────────────
//                     D − m
//
//  Markup:        (C + f)(1 + k − τ)
//           P = ──────────────────────
//                        D
//
//  ── Porque τ não pode ser somada a v ──────────────────────────────────
//  Porque um imposto sobre o LUCRO não incide sobre o custo, e uma fração
//  da faturação incide. Somar τ a v cobrava τ×C de imposto que não existe:
//  a 24% e com 10 € de custo, 2,40 € por unidade — e um preço recomendado
//  acima do necessário para atingir a margem pedida. É o mesmo erro, de
//  sinal contrário, que tratar a Segurança Social como imposto sobre o
//  lucro quando ela incide sobre a faturação.
//
//  Com τ = 0 (regime simplificado, sociedades, particulares) todas as
//  equações acima colapsam nas de sempre, ao cêntimo.
//
//  ── O denominador ─────────────────────────────────────────────────────
//  Se `D − m ≤ 0`, NÃO EXISTE preço. Não é «preço muito alto»: é que as
//  comissões, os impostos e a margem pretendida somam mais de 100% do
//  preço, e nenhum número real satisfaz a equação. A engine devolve
//  `impossivel` com o motivo — e a interface diz o que fazer (baixar a
//  margem, mudar de canal, ou renegociar).
//
//  Uma calculadora que devolva `NaN` ou `-247,50 €` aqui está a esconder
//  a única informação verdadeiramente útil deste cenário.
// ═══════════════════════════════════════════════════════════════════════

import type { MotivoImpossivel } from "../tipos";
import { dividir, fracao, naoNegativo, num } from "../numeros";

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
  /**
   * Fração aplicada ao LUCRO, não à faturação — um imposto sobre o
   * rendimento a sério (τ). Hoje só a usa o IRS de quem está em
   * contabilidade organizada, onde o tributável é receita − despesas.
   *
   * Porque não pode entrar em `fracaoLiquido`: uma fração da faturação
   * cobra imposto sobre o custo também. A 24% e com 10 € de custo, isso
   * são 2,40 € por unidade de imposto que não existe — e um preço
   * recomendado acima do necessário para atingir a margem pedida.
   *
   * Omissa ou zero, todas as equações se reduzem exatamente às de sempre.
   */
  fracaoSobreLucro?: number;
  /**
   * Euros em que o valor FATURADO ao cliente fica ABAIXO de `P(1+t)` — a
   * base sobre a qual `fracaoBruto` é cobrada.
   *
   * Existe por causa do regime da margem (DL 199/96): aí o IVA incide só
   * sobre `P − Cₐ`, logo o total da fatura é `P(1+t) − Cₐ·t`, e a comissão
   * do marketplace é cobrada sobre esse total — não sobre um PVP que
   * ninguém paga. `ajusteBruto = Cₐ·t`.
   *
   * Omisso ou zero, a base da comissão é `P(1+t)` e tudo se reduz às
   * equações de sempre.
   */
  ajusteBruto?: number;
  /**
   * A parte de `custosEuros` que é DESPESA DEDUTÍVEL. Só ela recebe o
   * escudo fiscal de τ.
   *
   * Existe por causa dos serviços: aí o «custo direto» é o custo do TEMPO
   * do próprio, e o trabalho de quem passa o recibo não é despesa da
   * atividade — é o rendimento que está a ser apurado. Deduzi-lo seria
   * inventar uma despesa, e é a mesma linha que `despesasAnuais` já
   * respeita quando alimenta o motor de IRS.
   *
   * Omissa, assume-se tudo dedutível — que é o caso de um produto.
   */
  custosDedutiveis?: number;
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
  const tau = fracaoLucro(entrada);
  // τ incide sobre o lucro, e as comissões são despesa dedutível — por isso
  // o imposto só morde o que sobra depois delas: τ(1 − g(1+t)).
  return 1 - v - g * (1 + t) - tau * (1 - g * (1 + t));
}

/** τ, saneada. Zero quando não há imposto sobre o lucro a modelar. */
function fracaoLucro(entrada: EntradaSolver): number {
  return fracao(entrada.fracaoSobreLucro ?? 0, 0, 0.95);
}

/**
 * A comissão que NÃO se cobra por o faturado ficar abaixo de `P(1+t)`.
 * Constante em euros, logo entra no numerador, não no denominador — e leva
 * o escudo fiscal ao contrário: menos comissão é menos despesa dedutível,
 * portanto mais imposto.
 */
function creditoDoAjusteBruto(entrada: EntradaSolver): number {
  const a = naoNegativo(entrada.ajusteBruto);
  if (a === 0) return 0;
  const g = fracao(entrada.fracaoBruto, 0, 5);
  return g * a * (1 - fracaoLucro(entrada));
}

/**
 * Base de custo depois do escudo fiscal. Cada euro de despesa DEDUTÍVEL
 * poupa τ de imposto; o que não é dedutível (o tempo do próprio) entra
 * inteiro.
 *
 *   base = (C + f) − τ·(Cd + f) − g·A·(1 − τ)
 *
 * Com τ = 0 e A = 0 é a soma de sempre; com Cd = C é `(C + f)(1 − τ)`.
 */
function baseCusto(entrada: EntradaSolver): number {
  const c = num(entrada.custosEuros);
  const f = num(entrada.fixosTransacao);
  // As taxas por transação são sempre despesa da atividade.
  const dedutiveis = Math.min(c, naoNegativo(entrada.custosDedutiveis ?? c)) + f;
  return c + f - fracaoLucro(entrada) * dedutiveis - creditoDoAjusteBruto(entrada);
}

/** Preço a partir de uma margem pretendida sobre o preço líquido. */
export function precoPorMargem(entrada: EntradaSolver, margem: number): SaidaSolver {
  const disponivel = fracaoDisponivel(entrada);
  const m = fracao(margem, -5, 0.999);
  const denominador = disponivel - m;
  const numerador = baseCusto(entrada);

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
  // O markup aplica-se à base de custo bruta; o escudo entra sobre a parte
  // dedutível, como em toda a gente.
  const numerador =
    (num(entrada.custosEuros) + num(entrada.fixosTransacao)) * k + baseCusto(entrada);

  if (disponivel <= 1e-9) {
    return FALHA("margem_inalcancavel", disponivel, disponivel);
  }
  const p = dividir(numerador, disponivel);
  return { ok: true, precoLiquido: p, denominador: disponivel, fracaoDisponivel: disponivel };
}

/** Preço a partir de um lucro em euros pretendido por unidade. */
export function precoPorLucroUnidade(entrada: EntradaSolver, lucro: number): SaidaSolver {
  const disponivel = fracaoDisponivel(entrada);
  const numerador = baseCusto(entrada) + Math.max(0, num(lucro));

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
  return num(precoLiquido) * fracaoDisponivel(entrada) - baseCusto(entrada);
}

/** Custos variáveis totais (em euros) a um preço líquido dado. */
export function custosVariaveisAoPreco(entrada: EntradaSolver, precoLiquido: number): number {
  // Por definição: o que não é lucro. Mantém `preço = custos + lucro` exata
  // seja qual for τ, em vez de repetir a soma e arriscar divergir dela.
  return num(precoLiquido) - lucroAoPreco(entrada, precoLiquido);
}
