// ═══════════════════════════════════════════════════════════════════════
//  Aritmética defensiva da engine.
//  ---------------------------------------------------------------------
//  Uma calculadora de preços recebe input humano: campos vazios, vírgulas,
//  colagens, `Infinity` vindo de uma divisão por zero a montante. Um `NaN`
//  que entre no primeiro motor sai do último e o utilizador vê «€ NaN».
//
//  Por isso todas as fronteiras sanitizam. Não é paranoia — é o invariante
//  9 da especificação de cálculo, e há um teste que o verifica para todos
//  os motores.
// ═══════════════════════════════════════════════════════════════════════

/** Devolve um número finito. Tudo o resto vira `fallback`. */
export const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Número finito e não negativo. */
export const naoNegativo = (v: unknown, fallback = 0): number => Math.max(0, num(v, fallback));

/** Fração limitada a [min, max]. Por omissão [0, 1). */
export const fracao = (v: unknown, min = 0, max = 0.999999): number => {
  const n = num(v, min);
  return Math.min(max, Math.max(min, n));
};

/** Arredondamento monetário: 2 casas, half-up, sem o erro do `toFixed`. */
export const cent = (v: number): number => {
  const n = num(v);
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

/** Arredonda para cima até ao inteiro. Unidades não são fracionárias. */
export const unidades = (v: number): number => {
  const n = num(v);
  return n <= 0 ? 0 : Math.ceil(n - 1e-9);
};

/** Divisão que devolve `fallback` em vez de `Infinity`/`NaN`. */
export const dividir = (a: number, b: number, fallback = 0): number => {
  const x = num(a);
  const y = num(b);
  if (y === 0) return fallback;
  const res = x / y;
  return Number.isFinite(res) ? res : fallback;
};

/** Igualdade monetária com tolerância de meio cêntimo. */
export const igualEmEuros = (a: number, b: number, tolerancia = 0.005): boolean =>
  Math.abs(num(a) - num(b)) <= tolerancia;
