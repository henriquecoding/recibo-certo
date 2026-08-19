"use client";

import { useId, useState, type ReactNode } from "react";

// Informativo acessível para termos técnicos. Abre por hover, foco (teclado)
// e clique (toque), com role="tooltip" e aria-describedby.
//
// O Escape fecha-o sem tirar o foco do botão porque a WCAG 2.1 · 1.4.13
// («Content on Hover or Focus») exige que conteúdo que aparece por hover ou
// foco seja *dispensável* sem mover o ponteiro nem o foco. Sem isto, quem
// navega por teclado tem o painel colado ao ecrã até sair do botão — e o
// painel tapa o campo seguinte. O axe não deteta esta falha: só se vê a
// testar o teclado à mão.
export default function InfoTip({ children, label = "Mais informação" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            // Não deixar o Escape subir: dentro de um modal fecharia o modal
            // inteiro em vez de só este painel.
            e.stopPropagation();
            setOpen(false);
          }
        }}
        className="relative flex h-4 w-4 items-center justify-center rounded-full border border-stone-300 text-[10px] font-bold text-stone-400 transition-colors before:absolute before:-inset-2.5 before:content-[''] hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-600 dark:text-stone-500"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M8 7.2v4M8 4.8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className="absolute left-1/2 top-6 z-50 w-60 -translate-x-1/2 rounded-xl border border-stone-200 bg-white p-3 text-xs font-normal leading-relaxed text-stone-600 shadow-lift dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300"
        >
          {children}
        </span>
      )}
    </span>
  );
}
