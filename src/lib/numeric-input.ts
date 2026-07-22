/**
 * Normalização única para campos numéricos dos simuladores.
 *
 * O estado visual continua a ser texto (para permitir escrever `0,5`), mas só
 * contém uma representação canónica pt-PT: sem símbolos monetários, espaços,
 * separadores de milhares ou zeros redundantes.
 */

export interface NumericDraftOptions {
  maxDecimals?: number;
  allowNegative?: boolean;
}

const DEFAULT_DECIMALS = 2;

function decimalSeparator(raw: string): "," | "." | null {
  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");
  if (comma < 0 && dot < 0) return null;
  if (comma >= 0 && dot >= 0) return comma > dot ? "," : ".";

  const separator = comma >= 0 ? "," : ".";
  const occurrences = raw.split(separator).length - 1;
  // Vários separadores iguais são normalmente milhares (`1.234.567`).
  if (occurrences > 1) return null;
  // Em pt-PT, um ponto seguido por um grupo de três algarismos é milhares.
  if (separator === "." && raw.length - dot - 1 === 3 && dot > 0) return null;
  return separator;
}

export function sanitizeNumericDraft(
  input: string,
  options: NumericDraftOptions = {},
): string {
  const maxDecimals = Math.max(0, options.maxDecimals ?? DEFAULT_DECIMALS);
  const negative = Boolean(options.allowNegative && input.trimStart().startsWith("-"));
  const raw = input.replace(/[^\d,.]/g, "");
  if (!raw) return negative ? "-" : "";

  const decimal = maxDecimals > 0 ? decimalSeparator(raw) : null;
  let integerRaw: string;
  let decimalRaw = "";
  let hasDecimal = false;

  if (decimal) {
    const index = raw.lastIndexOf(decimal);
    integerRaw = raw.slice(0, index).replace(/[.,]/g, "");
    decimalRaw = raw.slice(index + 1).replace(/[.,]/g, "").slice(0, maxDecimals);
    hasDecimal = true;
  } else {
    integerRaw = raw.replace(/[.,]/g, "");
  }

  // `0442` passa imediatamente a `442`, mas `0,5` mantém o zero necessário.
  const integer = integerRaw.replace(/^0+(?=\d)/, "") || "0";
  const sign = negative && (integer !== "0" || decimalRaw) ? "-" : "";
  return `${sign}${integer}${hasDecimal ? `,${decimalRaw}` : ""}`;
}

export function parseNumericDraft(
  draft: string,
  options: NumericDraftOptions = {},
): number | null {
  const canonical = sanitizeNumericDraft(draft, options);
  if (!canonical || canonical === "-" || canonical.endsWith(",")) {
    if (canonical.endsWith(",") && canonical !== "-,") {
      const value = Number(canonical.slice(0, -1).replace(",", "."));
      return Number.isFinite(value) ? value : null;
    }
    return null;
  }
  const value = Number(canonical.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function constrainNumericValue(
  value: number,
  { min = 0, max = Number.POSITIVE_INFINITY }: { min?: number; max?: number } = {},
): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Serializa um número JavaScript sem confundir o ponto decimal com milhares. */
export function numericValueToDraft(
  value: number,
  options: NumericDraftOptions = {},
): string {
  if (!Number.isFinite(value)) return "";
  const maxDecimals = Math.max(0, options.maxDecimals ?? DEFAULT_DECIMALS);
  const factor = 10 ** maxDecimals;
  const rounded = Math.round((value + Math.sign(value) * Number.EPSILON) * factor) / factor;
  return sanitizeNumericDraft(String(rounded).replace(".", ","), options);
}

export function numericDraftOnBlur(
  draft: string,
  fallback: number,
  options: NumericDraftOptions & { min?: number; max?: number } = {},
): { draft: string; value: number } {
  const parsed = parseNumericDraft(draft, options);
  const constrained = constrainNumericValue(parsed ?? fallback, options);
  const normalizedDraft = numericValueToDraft(constrained, options);
  const value = parseNumericDraft(normalizedDraft, options) ?? options.min ?? 0;
  return {
    value,
    draft: normalizedDraft,
  };
}
