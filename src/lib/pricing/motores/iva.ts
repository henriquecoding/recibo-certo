// ═══════════════════════════════════════════════════════════════════════
//  MOTOR DE IVA DA PRICING ENGINE
//  ---------------------------------------------------------------------
//  Aqui vive UMA regra que nenhuma calculadora de preços do mercado
//  português modela, e que é a diferença entre um preço certo e um preço
//  23% errado:
//
//    A isenção do Art. 53.º CIVA tem DOIS efeitos, não um.
//
//      1. Não liquidas IVA  →  o PVP desce.
//      2. Não DEDUZES o IVA que suportas (Art. 53.º n.º 3)  →  o teu
//         custo de aquisição sobe para o valor COM IVA.
//
//  Tratar isenção como «taxa = 0» e deixar o custo na base tributável
//  produz um custo subestimado em até 23% e um preço recomendado abaixo do
//  sustentável. É o erro mais caro que uma ferramenta destas pode cometer,
//  porque é silencioso: o número parece plausível.
//
//  As taxas vêm de `IVA_TAXAS` em `fiscal-data.ts`. Zero literais aqui.
// ═══════════════════════════════════════════════════════════════════════

import { IVA_TAXAS } from "../../fiscal-data";
import type { EscalaoIVA, Regiao, RegimeIVAVendedor, ValorComIVA } from "../tipos";
import { dividir, fracao, naoNegativo, num } from "../numeros";

export interface SituacaoIVAPreco {
  /** Taxa aplicada à VENDA. 0 quando isento. */
  taxaVenda: number;
  escalaoVenda: EscalaoIVA;
  liquida: boolean;
  /** Consegue deduzir o IVA das compras? */
  deduz: boolean;
  /** IVA incide só sobre a margem (DL 199/96)? */
  regimeMargem: boolean;
  regime: RegimeIVAVendedor;
  explicacao: string;
}

/** Taxa de um escalão numa região. Nunca um literal. */
export function taxaDe(regiao: Regiao, escalao: EscalaoIVA): number {
  return IVA_TAXAS[regiao].value[escalao];
}

/**
 * Resolve a situação de IVA do vendedor para efeitos de preço.
 *
 * Nota sobre `nao_sei`: assume-se o regime NORMAL, porque é o caso que
 * produz o preço mais alto e o aviso mais útil. Assumir isenção seria
 * otimista no sítio errado — recomendaria um preço mais baixo a quem
 * afinal tem de entregar IVA ao Estado.
 */
export function situacaoIVAPreco(
  regime: RegimeIVAVendedor,
  regiao: Regiao,
  escalaoVenda: EscalaoIVA,
): SituacaoIVAPreco {
  const taxa = taxaDe(regiao, escalaoVenda);

  switch (regime) {
    case "isento_art53":
      return {
        taxaVenda: 0,
        escalaoVenda,
        liquida: false,
        deduz: false,
        regimeMargem: false,
        regime,
        explicacao:
          "Isento pelo Art. 53.º do CIVA: não acrescentas IVA ao preço, mas também não deduzes o IVA que pagas nas compras — por isso o teu custo real é o valor com IVA.",
      };

    case "isento_art9":
      return {
        taxaVenda: 0,
        escalaoVenda,
        liquida: false,
        deduz: false,
        regimeMargem: false,
        regime,
        explicacao:
          "Isento pela natureza da operação (Art. 9.º do CIVA). Não há limiar de faturação, mas também não há dedução do IVA suportado.",
      };

    case "margem":
      return {
        taxaVenda: taxa,
        escalaoVenda,
        liquida: true,
        deduz: false,
        regimeMargem: true,
        regime,
        explicacao:
          "Regime da margem (DL 199/96): o IVA incide sobre a diferença entre o preço de venda e o de compra, não sobre o preço total.",
      };

    case "normal":
    case "nao_sei":
    default:
      return {
        taxaVenda: taxa,
        escalaoVenda,
        liquida: true,
        deduz: true,
        regimeMargem: false,
        regime: regime === "nao_sei" ? "normal" : regime,
        explicacao:
          "Regime normal de IVA: liquidas IVA ao cliente e deduzes o IVA que suportas nas compras — por isso o custo relevante é o valor sem IVA.",
      };
  }
}

/**
 * Converte um valor introduzido pelo utilizador no CUSTO RELEVANTE.
 *
 * A regra em duas linhas:
 *   · quem deduz  → o custo é a base tributável (sem IVA)
 *   · quem não deduz → o custo é o valor pago (com IVA)
 *
 * O que torna isto subtil é que o valor introduzido pode vir de qualquer
 * das formas, e o utilizador raramente sabe qual delas tem à frente. Por
 * isso `ValorComIVA` obriga a declarar — não há omissão possível.
 */
export function custoRelevante(entrada: ValorComIVA, regiao: Regiao, deduz: boolean): number {
  const valor = naoNegativo(entrada?.valor);
  if (valor === 0) return 0;

  const taxaCompra = taxaDe(regiao, entrada.escalao);
  const semIVA = entrada.incluiIVA ? dividir(valor, 1 + taxaCompra, valor) : valor;
  const comIVA = entrada.incluiIVA ? valor : valor * (1 + taxaCompra);

  return deduz ? semIVA : comIVA;
}

/** Quanto de IVA está «preso» no custo por não ser dedutível. */
export function ivaNaoDedutivel(entrada: ValorComIVA, regiao: Regiao, deduz: boolean): number {
  if (deduz) return 0;
  const valor = naoNegativo(entrada?.valor);
  if (valor === 0) return 0;
  const taxaCompra = taxaDe(regiao, entrada.escalao);
  return entrada.incluiIVA
    ? valor - dividir(valor, 1 + taxaCompra, valor)
    : valor * taxaCompra;
}

/** PVP a partir do preço líquido. */
export const pvpDe = (precoLiquido: number, taxa: number): number =>
  num(precoLiquido) * (1 + fracao(taxa, 0, 1));

/** Preço líquido a partir do PVP. */
export const liquidoDe = (pvp: number, taxa: number): number =>
  dividir(num(pvp), 1 + fracao(taxa, 0, 1), num(pvp));

/**
 * IVA a entregar ao Estado por unidade vendida.
 *
 * No regime da margem incide só sobre a diferença — e nunca sobre uma
 * margem negativa, porque não há IVA a devolver por vender com prejuízo.
 */
export function ivaAEntregar(
  precoLiquido: number,
  custoDireto: number,
  situacao: SituacaoIVAPreco,
): number {
  if (!situacao.liquida) return 0;
  if (situacao.regimeMargem) {
    const margem = Math.max(0, num(precoLiquido) - num(custoDireto));
    return margem * situacao.taxaVenda;
  }
  return num(precoLiquido) * situacao.taxaVenda;
}
