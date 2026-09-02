"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Um grupo recolhível da sidebar — padrão Disclosure, não Menubar.
//
//  A escolha não é estética. Um `menu`/`menuitem` de ARIA obriga a um
//  modelo de teclado inteiro (setas a navegar, Home/End, tipo-para-saltar)
//  e anuncia «menu» a quem usa leitor de ecrã — quando isto é, e continua a
//  ser, uma LISTA DE LIGAÇÕES. O Disclosure acrescenta exatamente o que
//  falta: um botão que diz se a secção está aberta (`aria-expanded`) e qual
//  a região que controla (`aria-controls`). Tudo o resto continua a ser
//  navegação normal, com Tab e Enter.
//
//  Ver: WAI-ARIA APG — Disclosure (Show/Hide) e Disclosure Navigation.
// ─────────────────────────────────────────────────────────────────────────

import { ChevronDown } from "@/components/ui/Icons";
import type { ReactNode } from "react";

export default function SidebarGrupo({
  id,
  titulo,
  nota,
  aberto,
  alternar,
  children,
}: {
  id: string;
  titulo: string;
  nota?: string;
  aberto: boolean;
  alternar: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-controls={`grupo-${id}`}
        className="flex min-h-9 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-stone-200"
      >
        <span>{titulo}</span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 transition-transform duration-200 motion-reduce:transition-none ${aberto ? "rotate-180" : ""}`}
        />
      </button>
      {/* Fica no DOM e some com `hidden`: o estado do grupo não pode
          depender de a lista existir ou não, e um `aria-controls` que
          aponta para nada é pior do que não ter nenhum. */}
      <div id={`grupo-${id}`} hidden={!aberto}>
        {nota && (
          <p className="px-3 pb-1 pt-0.5 text-xs leading-relaxed text-stone-400 dark:text-stone-500">{nota}</p>
        )}
        {children}
      </div>
    </div>
  );
}
