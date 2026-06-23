// Ano fiscal de referência do ReciboCerto.
//
// Vive num módulo próprio — sem os dados pesados nem as asserções de
// `fiscal-data.ts` — para poder ser importado por componentes-cliente (ex.: o
// Footer, presente em todas as páginas) sem arrastar o `fiscal-data.ts`
// (~126 KB) para o bundle inicial. O `fiscal-data.ts` reexporta-o.
export const FISCAL_YEAR = 2026 as const;
