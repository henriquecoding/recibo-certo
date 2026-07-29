// Formatação localizada para pt-PT (euro e percentagens).

export const fmt = (n: number): string =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

export const pct = (n: number): string =>
  `${(n * 100).toFixed(1).replace(".", ",")}%`;

/**
 * Percentagem com as casas decimais que a fonte publicou, sem zeros
 * supérfluos. Para taxas em que a precisão É a informação: os juros de mora
 * comerciais são 10,15% e 9,15%, e arredondá-los a uma casa (10,2% e 9,2%)
 * apaga exatamente o detalhe que o guia existe para transmitir.
 */
export const pctExato = (n: number, maxCasas = 2): string =>
  `${(n * 100)
    .toFixed(maxCasas)
    .replace(/\.?0+$/, "")
    .replace(".", ",")}%`;
