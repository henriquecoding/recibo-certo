// ═══════════════════════════════════════════════════════════════════════
//  PREÇO PSICOLÓGICO
//  ---------------------------------------------------------------------
//  Regra de produto, não de código: ESTA FUNÇÃO NUNCA ALTERA O PREÇO
//  RECOMENDADO. Devolve sugestões, com o impacto na margem calculado, e a
//  interface mostra-as numa coluna à parte.
//
//  A razão é que misturar estratégia comercial com viabilidade financeira
//  faz a pessoa acreditar que 19,90 € é o preço «certo» quando é apenas o
//  preço redondo. Primeiro o negócio tem de aguentar o número; só depois
//  se discute como ele se lê na etiqueta.
//
//  E há um caso em que arredondar para baixo é perigoso: quando o preço
//  recomendado já está encostado ao piso. Aí a sugestão «,90» pode passar
//  abaixo da margem de contribuição — e por isso vem marcada.
// ═══════════════════════════════════════════════════════════════════════

import { TERMINACOES_PSICOLOGICAS } from "../regras";
import { cent, dividir, num } from "../numeros";

export interface SugestaoPsicologica {
  pvp: number;
  margem: number;
  /** Diferença face ao PVP recomendado, em euros. */
  delta: number;
}

export interface EntradaPsicologico {
  pvp: number;
  taxaIVA: number;
  /** `lucro(precoLiquido)` — injetado para não duplicar a equação. */
  lucroAoPrecoLiquido: (precoLiquido: number) => number;
  /** Quantas sugestões devolver. */
  maximo?: number;
}

/**
 * Candidatos: para cada terminação, o valor imediatamente abaixo e o
 * imediatamente acima do PVP recomendado. Dois candidatos por terminação —
 * porque arredondar sempre para baixo é uma decisão comercial disfarçada
 * de matemática.
 */
export function sugerirPrecosPsicologicos(e: EntradaPsicologico): SugestaoPsicologica[] {
  const pvp = num(e.pvp);
  if (pvp <= 0) return [];

  const candidatos = new Set<number>();

  for (const term of TERMINACOES_PSICOLOGICAS.value) {
    const baseInteira = Math.floor(pvp);
    for (const inteiro of [baseInteira - 1, baseInteira, baseInteira + 1]) {
      if (inteiro < 0) continue;
      const valor = cent(inteiro + term);
      if (valor > 0) candidatos.add(valor);
    }
    // Escalas maiores: dezenas para preços de três dígitos.
    if (pvp >= 100) {
      const dezena = Math.floor(pvp / 10) * 10;
      for (const d of [dezena - 10, dezena, dezena + 10]) {
        if (d <= 0) continue;
        candidatos.add(cent(d - 0.1));
        candidatos.add(cent(d + term));
      }
    }
  }

  const limite = e.maximo ?? 4;
  const t = num(e.taxaIVA);

  return [...candidatos]
    .filter((v) => v > 0 && Math.abs(v - pvp) / pvp <= 0.2)
    .map((valor) => {
      const liquido = dividir(valor, 1 + t, valor);
      const lucro = e.lucroAoPrecoLiquido(liquido);
      return {
        pvp: valor,
        margem: liquido > 0 ? dividir(lucro, liquido) : 0,
        delta: cent(valor - pvp),
      };
    })
    .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))
    .slice(0, limite);
}
