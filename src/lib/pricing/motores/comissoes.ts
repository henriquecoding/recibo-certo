// ═══════════════════════════════════════════════════════════════════════
//  MOTOR DE COMISSÕES
//  ---------------------------------------------------------------------
//  A distinção que faz este motor existir: nem todas as comissões incidem
//  sobre a mesma base.
//
//    · marketplace e processamento de pagamento cobram sobre o valor TOTAL
//      da encomenda — ou seja, sobre o PVP, IVA incluído;
//    · afiliados e angariadores costumam ser negociados sobre o valor
//      LÍQUIDO da venda.
//
//  Somar tudo numa percentagem só está errado por um fator de (1 + IVA).
//  A 23%, uma comissão de 15% «sobre o preço» é 18,45% do líquido. Numa
//  margem de 30%, isso são mais de 11 pontos percentuais desaparecidos —
//  a diferença entre um negócio e um passatempo.
//
//  Por isso o resultado deste motor tem TRÊS campos e não um: euros fixos,
//  fração sobre o líquido e fração sobre o bruto. É o `preco.ts` que os
//  junta na equação, e junta-os sabendo o que cada um é.
// ═══════════════════════════════════════════════════════════════════════

import type { PerfilCanal } from "../tipos";
import { canalPorId, pagamentoPorId } from "../regras";
import { fracao, naoNegativo } from "../numeros";

export interface ResultadoComissoes {
  /** Euros fixos por venda (taxa fixa de pagamento, comissão fixa do canal). */
  fixos: number;
  /** Fração aplicada ao PVP (comissão de canal, % de processamento). */
  sobreBruto: number;
  /** Fração aplicada ao preço líquido (afiliado). */
  sobreLiquido: number;
  /** Mensalidade do canal, em euros — é custo FIXO, não variável. */
  mensalidade: number;
  detalhe: {
    rotulo: string;
    percentagem?: number;
    fixo?: number;
    base: "bruto" | "liquido" | "fixo" | "mensal";
  }[];
}

export function calcularComissoes(canal: PerfilCanal): ResultadoComissoes {
  const detalhe: ResultadoComissoes["detalhe"] = [];
  let fixos = 0;
  let sobreBruto = 0;
  let sobreLiquido = 0;
  let mensalidade = 0;

  // ── Canal / marketplace ────────────────────────────────────────────
  // A percentagem explícita do utilizador ganha sempre ao valor típico do
  // catálogo: o catálogo é ponto de partida, não autoridade.
  const canalCat = canal.marketplaceId ? canalPorId(canal.marketplaceId) : undefined;
  const comissaoPct =
    canal.comissaoPercentagem !== undefined
      ? fracao(canal.comissaoPercentagem, 0, 0.9)
      : fracao(canalCat?.comissaoTipica ?? 0, 0, 0.9);

  if (comissaoPct > 0) {
    sobreBruto += comissaoPct;
    detalhe.push({
      rotulo: canalCat?.rotulo ? `Comissão ${canalCat.rotulo}` : "Comissão do canal",
      percentagem: comissaoPct,
      base: "bruto",
    });
  }

  const comissaoFixa = naoNegativo(canal.comissaoFixa ?? canalCat?.fixaPorVenda ?? 0);
  if (comissaoFixa > 0) {
    fixos += comissaoFixa;
    detalhe.push({ rotulo: "Comissão fixa do canal", fixo: comissaoFixa, base: "fixo" });
  }

  const mensal = naoNegativo(canalCat?.mensalidade ?? 0);
  if (mensal > 0) {
    mensalidade += mensal;
    detalhe.push({ rotulo: `Mensalidade ${canalCat?.rotulo ?? "do canal"}`, fixo: mensal, base: "mensal" });
  }

  // ── Meio de pagamento ──────────────────────────────────────────────
  const pagCat = canal.metodoPagamentoId ? pagamentoPorId(canal.metodoPagamentoId) : undefined;
  const pagPct =
    canal.pagamentoPercentagem !== undefined
      ? fracao(canal.pagamentoPercentagem, 0, 0.5)
      : fracao(pagCat?.percentagem ?? 0, 0, 0.5);

  if (pagPct > 0) {
    sobreBruto += pagPct;
    detalhe.push({
      rotulo: pagCat?.rotulo ? `Processamento — ${pagCat.rotulo}` : "Processamento de pagamento",
      percentagem: pagPct,
      base: "bruto",
    });
  }

  const pagFixa = naoNegativo(canal.pagamentoFixa ?? pagCat?.fixa ?? 0);
  if (pagFixa > 0) {
    fixos += pagFixa;
    detalhe.push({ rotulo: "Taxa fixa por transação", fixo: pagFixa, base: "fixo" });
  }

  // ── Afiliado / angariador ──────────────────────────────────────────
  const afiliado = fracao(canal.afiliadoPercentagem ?? 0, 0, 0.9);
  if (afiliado > 0) {
    sobreLiquido += afiliado;
    detalhe.push({ rotulo: "Afiliado / angariador", percentagem: afiliado, base: "liquido" });
  }

  return { fixos, sobreBruto, sobreLiquido, mensalidade, detalhe };
}

/**
 * Converte uma fração sobre o bruto na fração equivalente sobre o líquido.
 * Existe para a UI poder dizer a frase que muda a conversa:
 *
 *   «15% de comissão sobre o preço são 18,45% do que te fica.»
 */
export const brutoParaLiquido = (fracaoBruto: number, taxaIVA: number): number =>
  fracao(fracaoBruto, 0, 0.999) * (1 + fracao(taxaIVA, 0, 1));
