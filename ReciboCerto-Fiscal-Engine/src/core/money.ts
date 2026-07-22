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
