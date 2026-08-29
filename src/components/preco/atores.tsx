"use client";

// ═══════════════════════════════════════════════════════════════════════
//  OS ATORES DO PALCO DO PREÇO — só o que é desta cena
//  ---------------------------------------------------------------------
//  A mecânica — a ficha com relógio próprio, o anel de impacto, o contador
//  e o contexto do palco — vive em `components/palco/atores.tsx`, partilhada
//  com «Descobrir». Estava aqui duplicada byte a byte.
//
//  O que fica é a única coisa que NÃO é partilhável: o significado das
//  cores. No preço, `areia` é o IVA e `clay` é o que sai da fatura; em
//  descobrir, `areia` é uma fronteira e `azul` é uma fonte. São vocabulários
//  diferentes e devem continuar a ser — unificá-los seria unificar duas
//  coisas que só por acaso se parecem.
// ═══════════════════════════════════════════════════════════════════════

export { Anel, Contador, Ficha, PalcoContexto, type FichaEmCena } from "@/components/palco/atores";

export type TomDaFicha = "custo" | "margem" | "retencao" | "iva" | "total";

/**
 * A cor de cada tipo de dinheiro. Trocar isto por cinco tons bonitos faz a
 * barra da composição deixar de se poder ler sem legenda.
 *
 *   stone  · o que a unidade custa a existir
 *   brand  · o lucro — a única parcela que fica
 *   clay   · Segurança Social e IRS — sai da fatura e não volta
 *   areia  · o IVA — passa pelas mãos do vendedor e vai para o Estado
 */
export const TOM_FICHA: Record<TomDaFicha, string> = {
  custo:
    "border-stone-300 bg-white text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100",
  margem: "border-brand/40 bg-brand-light text-brand-dark dark:bg-brand/25 dark:text-brand-mint",
  retencao: "border-clay-border bg-clay-bg text-clay-text",
  iva: "border-categoria-areia-border bg-categoria-areia-bg text-categoria-areia-text dark:border-stone-600 dark:bg-stone-800 dark:text-[#e7c98e]",
  total: "border-brand bg-brand text-white",
};
