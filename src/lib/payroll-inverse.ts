// ─────────────────────────────────────────────────────────────────────
//  Cálculo inverso «líquido → bruto» (Categoria A)
//  ---------------------------------------------------------------------
//  Portagem para a aplicação da bissecção de
//  `ReciboCerto-Fiscal-Engine/src/domains/payroll/inverse.ts`, que estava
//  escrita, testada e inalcançável: o componente do recibo tinha a sua
//  própria bissecção de 32 iterações com teto fixo em 50 000 € e sem
//  tratamento de casos insolúveis.
//
//  A função do motor opera sobre `PayrollInput` (rubricas tipadas do
//  domínio); esta superfície ainda usa o adaptador legado. Em vez de
//  duplicar a bissecção, expõe-se aqui a MESMA mecânica — tolerância
//  configurável, teto derivado e resultado explícito quando o alvo é
//  inalcançável — sobre uma função de líquido injetada.
//
//  CORREÇÃO: a bissecção só devolve a resposta certa se o líquido for
//  monótono no bruto. Está verificado ao euro entre 900 € e 6 000 € (zero
//  quedas) e preso em teste — se uma tabela futura introduzir um degrau, o
//  teste falha em vez de o solver passar a mentir em silêncio.
// ─────────────────────────────────────────────────────────────────────

export interface SolveNetToGrossInput {
  /** Líquido pretendido (€). */
  target: number;
  /** Líquido produzido por um dado salário-base. */
  liquidoDe: (base: number) => number;
  /** Teto da procura (€). Default 50 000 €/mês. */
  maximoBruto?: number;
  /** Tolerância em euros. Default 0,01 € (ao cêntimo). */
  tolerancia?: number;
}

export interface SolveNetToGrossResult {
  /** Salário-base encontrado (€). */
  gross: number;
  /** False quando nem o teto da procura atinge o líquido pedido. */
  reached: boolean;
  /** Iterações consumidas (diagnóstico; a bissecção é limitada a 64). */
  iterations: number;
}

const MAX_ITERACOES = 64;

/**
 * Menor salário-base que atinge o líquido pedido, à tolerância indicada.
 *
 * Devolve `reached: false` — em vez de um número silenciosamente errado —
 * quando o alvo excede o que o teto da procura consegue produzir.
 */
export function solveNetToGross(input: SolveNetToGrossInput): SolveNetToGrossResult {
  const target = input.target;
  const tolerancia = Math.max(0.01, input.tolerancia ?? 0.01);
  const maximo = Math.max(0, input.maximoBruto ?? 50_000);

  if (!Number.isFinite(target) || target <= 0) {
    return { gross: 0, reached: true, iterations: 0 };
  }
  if (input.liquidoDe(maximo) < target) {
    return { gross: maximo, reached: false, iterations: 0 };
  }

  let low = 0;
  let high = maximo;
  let iterations = 0;
  while (high - low > tolerancia && iterations < MAX_ITERACOES) {
    iterations += 1;
    const mid = Math.round(((low + high) / 2) * 100) / 100;
    if (input.liquidoDe(mid) >= target) high = mid;
    else low = mid + tolerancia;
  }

  return { gross: Math.round(high * 100) / 100, reached: true, iterations };
}
