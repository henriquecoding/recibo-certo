"use client";

import { Pause, Play } from "@/components/ui/Icons";
import type { RefObject } from "react";

// Controlos sem dependência da engine de animação. Os heróis da homepage
// importam este módulo diretamente para não trazer o runtime de Motion para
// o documento inicial apenas por causa dos botões de pausa e da régua.

export function BotaoPausa({
  parado,
  onAlternar,
  className = "",
}: {
  parado: boolean;
  onAlternar: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-label={parado ? "Retomar a demonstração" : "Pausar a demonstração"}
      className={`flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 dark:border-stone-700 dark:text-stone-400 ${className}`}
    >
      {parado ? <Play size={11} /> : <Pause size={11} />}
    </button>
  );
}

export interface AtoDaRegua {
  id: string;
  /** Curto — cabe por baixo da barra, em maiúsculas pequenas. */
  rotulo: string;
  /** Frase inteira, para o leitor de ecrã. */
  legenda: string;
}

export function ReguaDeAtos({
  atos,
  indiceAtivo,
  barraRef,
  estatico,
  onIr,
  className = "",
}: {
  atos: AtoDaRegua[];
  indiceAtivo: number;
  /** A barra do ato ativo é escrita por `ref`, pelo relógio. */
  barraRef: RefObject<HTMLSpanElement | null>;
  /** `prefers-reduced-motion`: a barra do ato ativo aparece já cheia. */
  estatico: boolean;
  onIr: (idx: number) => void;
  className?: string;
}) {
  return (
    <ol className={`flex gap-1 ${className}`}>
      {atos.map((a, idx) => (
        <li key={a.id} className="flex-1">
          <button
            type="button"
            onClick={() => onIr(idx)}
            aria-current={idx === indiceAtivo ? "step" : undefined}
            aria-label={`Passo ${idx + 1} de ${atos.length}: ${a.legenda}`}
            className="group block w-full py-1 focus-visible:outline-none"
          >
            <span className="block h-1 w-full overflow-hidden rounded-full bg-stone-200 group-focus-visible:ring-2 group-focus-visible:ring-brand group-focus-visible:ring-offset-2 dark:bg-stone-700">
              <span
                ref={idx === indiceAtivo ? barraRef : undefined}
                className="block h-full w-full origin-left rounded-full bg-brand"
                style={{
                  transform: `scaleX(${idx < indiceAtivo || (idx === indiceAtivo && estatico) ? 1 : 0})`,
                }}
              />
            </span>
            <span
              className={`mt-1 block truncate text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                idx === indiceAtivo ? "text-brand-dark dark:text-brand" : "text-stone-300 dark:text-stone-600"
              }`}
            >
              {a.rotulo}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
