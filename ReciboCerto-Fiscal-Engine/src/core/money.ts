import type { RoundingMode } from "./model";

/**
 * Dinheiro em cêntimos (inteiros), nunca `float` disperso.
 * Invariante da arquitetura (ARCHITECTURE.md, #6): "Todos os montantes são
 * inteiros em cêntimos."
 */
export type Cents = number & { readonly __brand: "Cents" };

/** Política de arredondamento — explícita em cada operação que arredonda. */
export type RoundingPolicy = "half-up" | "half-even" | "truncate";

function roundBy(value: number, policy: RoundingPolicy): number {
  switch (policy) {
    case "half-up":
      return Math.sign(value) * Math.round(Math.abs(value));
    case "truncate":
      return Math.trunc(value);
    case "half-even": {
      const floor = Math.floor(value);
      const diff = value - floor;
      if (diff < 0.5) return floor;
      if (diff > 0.5) return floor + 1;
      return floor % 2 === 0 ? floor : floor + 1;
    }
  }
}

/** Converte um valor em euros (com decimais) para cêntimos inteiros. */
export function eurosToCents(euros: number, policy: RoundingPolicy = "half-up"): Cents {
  if (!Number.isFinite(euros)) {
    throw new RangeError(`eurosToCents: valor não finito (${euros})`);
  }
  return roundBy(euros * 100, policy) as Cents;
}

/** Converte cêntimos de volta para euros (número simples, para apresentação). */
export function centsToEuros(cents: Cents): number {
  return cents / 100;
}

/** Soma segura de cêntimos (todos inteiros — nunca produz erro de float). */
export function addCents(...values: Cents[]): Cents {
  return values.reduce((acc, v) => (acc + v) as Cents, 0 as Cents);
}

/** Subtração segura, nunca deixa o resultado negativo por defeito. */
export function subtractCentsFloor0(a: Cents, b: Cents): Cents {
  return Math.max(0, a - b) as Cents;
}

/**
 * Taxa como inteiro em partes por milhão (`ppm`).
 * Invariante da arquitetura (#7): "Taxas são inteiros em partes por milhão."
 * Evita os erros de representação binária de frações como 0,21.4 (SS) ou
 * 0,025 (adicional de solidariedade) quando compostas em cadeia.
 */
export type Ppm = number & { readonly __brand: "Ppm" };

/** Converte uma taxa decimal (ex.: 0.214) para ppm inteiro (214000). */
export function rateToPpm(rate: number): Ppm {
  if (!Number.isFinite(rate) || rate < 0) {
    throw new RangeError(`rateToPpm: taxa inválida (${rate})`);
  }
  return Math.round(rate * 1_000_000) as Ppm;
}

/** Aplica uma taxa em ppm a um montante em cêntimos, com arredondamento explícito. */
export function applyPpm(cents: Cents, ppm: Ppm, policy: RoundingPolicy = "half-up"): Cents {
  return roundBy((cents * ppm) / 1_000_000, policy) as Cents;
}

export function ppmToRate(ppm: Ppm): number {
  return ppm / 1_000_000;
}

/**
 * API monetária estruturada usada pelos domínios novos. É mantida ao lado da
 * API branded (`Cents`/`Ppm`) para permitir migração vertical sem quebrar as
 * regras já publicadas pelo scaffold inicial.
 */
export interface Money {
  readonly currency: "EUR";
  readonly cents: number;
}

export interface Rate {
  readonly ppm: number;
}

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} tem de ser um inteiro seguro.`);
  }
}

export function eurCents(cents: number): Money {
  assertSafeInteger(cents, "O montante em cêntimos");
  return Object.freeze({ currency: "EUR", cents });
}

/** Conversão de fronteira; dentro da engine conservar sempre cêntimos. */
export function eurFromDecimal(euros: number): Money {
  if (!Number.isFinite(euros)) throw new RangeError("O montante tem de ser finito.");
  return eurCents(Math.round(euros * 100));
}

export function ratePpm(ppm: number): Rate {
  assertSafeInteger(ppm, "A taxa ppm");
  if (ppm < 0 || ppm > 1_000_000) {
    throw new RangeError("A taxa tem de estar entre 0 e 1 000 000 ppm.");
  }
  return Object.freeze({ ppm });
}

export function addMoney(...values: readonly Money[]): Money {
  return eurCents(values.reduce((sum, value) => sum + value.cents, 0));
}

export function subtractMoney(left: Money, right: Money): Money {
  return eurCents(left.cents - right.cents);
}

export function minMoney(left: Money, right: Money): Money {
  return left.cents <= right.cents ? left : right;
}

export function maxMoney(left: Money, right: Money): Money {
  return left.cents >= right.cents ? left : right;
}

function divideRounded(numerator: number, denominator: number, mode: RoundingMode): number {
  assertSafeInteger(numerator, "O numerador");
  assertSafeInteger(denominator, "O denominador");
  if (denominator <= 0) throw new RangeError("O denominador tem de ser positivo.");

  const sign = numerator < 0 ? -1 : 1;
  const absolute = Math.abs(numerator);
  const quotient = Math.floor(absolute / denominator);
  const remainder = absolute % denominator;

  if (mode === "towards_zero" || mode === "down") return sign * quotient;
  if (mode === "up") return sign * (remainder === 0 ? quotient : quotient + 1);
  return sign * (remainder * 2 >= denominator ? quotient + 1 : quotient);
}

export function multiplyRate(
  amount: Money,
  rate: Rate,
  rounding: RoundingMode = "half_up",
): Money {
  const product = amount.cents * rate.ppm;
  if (!Number.isSafeInteger(product)) {
    throw new RangeError("O produto monetário excede a precisão segura.");
  }
  return eurCents(divideRounded(product, 1_000_000, rounding));
}

export function allocateMoney(amount: Money, parts: number): readonly Money[] {
  assertSafeInteger(parts, "O número de partes");
  if (parts <= 0) throw new RangeError("O número de partes tem de ser positivo.");
  const base = Math.trunc(amount.cents / parts);
  let remainder = amount.cents - base * parts;
  return Array.from({ length: parts }, () => {
    const adjustment = remainder === 0 ? 0 : remainder > 0 ? 1 : -1;
    remainder -= adjustment;
    return eurCents(base + adjustment);
  });
}
