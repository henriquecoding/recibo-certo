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
