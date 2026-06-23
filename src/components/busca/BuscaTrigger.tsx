"use client";

import { Search, Keyboard } from "@/components/ui/Icons";

// Botão de pesquisa — propositadamente LEVE. Apenas dispara o evento que abre o
// overlay global (BuscaGlobal, carregado em diferido). Vive num ficheiro próprio
// para que importá-lo (no Nav, no chrome do dashboard…) NÃO arraste o overlay
// nem o índice de pesquisa (`busca.ts` → `fiscal-data`) para o bundle inicial.
export const EVENTO_BUSCA_ABRIR = "recibocerto:busca:abrir";

export function BuscaTrigger({ compacto = false }: { compacto?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENTO_BUSCA_ABRIR))}
      aria-label="Pesquisar no ReciboCerto"
      aria-keyshortcuts="Control+K Meta+K"
      className={
        compacto
          ? "flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800"
          : "group flex items-center gap-2 rounded-xl border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-400 transition-colors hover:border-brand/40 hover:text-stone-600 dark:border-stone-700 dark:bg-stone-900/50 dark:hover:border-brand/40"
      }
    >
      <Search size={16} className="flex-shrink-0" />
      {!compacto && (
        <>
          <span className="hidden md:inline">Pesquisar...</span>
          <span className="ml-2 hidden items-center gap-0.5 rounded-md border border-stone-200 px-1.5 py-0.5 text-[10px] font-semibold text-stone-400 md:inline-flex dark:border-stone-700">
            <Keyboard size={11} /> K
          </span>
        </>
      )}
    </button>
  );
}
