// ═══════════════════════════════════════════════════════════════════════
//  DO PREÇO PARA O RECIBO — a conversão que faltava
//  ---------------------------------------------------------------------
//  O Pricing Engine devolve o preço de UMA unidade. O simulador fiscal
//  pergunta o valor do RECIBO, que é mensal, e deriva o ano multiplicando
//  por doze.
//
//  Passar o preço unitário diretamente para o campo mensal parecia
//  funcionar porque, no cenário de exemplo, se vendia uma unidade por mês.
//  Fora desse caso os dois números discordavam entre si — 30 € no campo do
//  recibo e 36 000 € de projeção anual — sem nada no ecrã a explicar a
//  diferença.
//
//  A conversão é uma linha, mas é DOMÍNIO: tem de ser testável sem montar
//  um componente, e tem de falhar em vez de adivinhar quando o cenário não
//  produziu preço executável.
// ═══════════════════════════════════════════════════════════════════════

import type { ResultadoPreco } from "@/lib/pricing";

export interface BaseFiscalDoPreco {
  /** Preço de uma unidade, sem IVA. */
  unitario: number;
  /** Valor mensal do recibo, sem IVA. */
  mensal: number;
  /** Projeção anual sem IVA, sempre coerente com `mensal`. */
  anual: number;
  unidadesMes: number;
}

/**
 * Converte um resultado do motor de preço na base que o simulador fiscal
 * espera. Devolve `null` — nunca um número plausível — quando o cenário
 * não chegou a produzir um preço executável.
 */
export function baseFiscalDoPreco(
  resultado: ResultadoPreco | null,
  unidadesMes: number,
): BaseFiscalDoPreco | null {
  if (!resultado?.ok || !Number.isFinite(resultado.precoLiquido) || resultado.precoLiquido <= 0) {
    return null;
  }

  // Um volume ausente, zero ou fracionário não pode apagar a venda: o piso
  // é uma unidade por mês, e fica explícito no que a interface mostra.
  const unidades = Number.isFinite(unidadesMes) ? Math.max(1, Math.round(unidadesMes)) : 1;
  const mensal = resultado.precoLiquido * unidades;

  return {
    unitario: resultado.precoLiquido,
    mensal,
    anual: mensal * 12,
    unidadesMes: unidades,
  };
}
