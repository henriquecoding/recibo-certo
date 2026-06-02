"use client";

import { m } from "motion/react";
import { Sparkle, LayoutGrid, ArrowRight } from "@/components/ui/Icons";

interface OnboardingGateProps {
  onSelect: (modo: "guiado" | "profissional") => void;
}

/**
 * Ecrã inicial que substitui o conteúdo do simulador até o utilizador escolher
 * entre o modo guiado (pedagógico) e o modo profissional (completo).
 */
export default function OnboardingGate({ onSelect }: OnboardingGateProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white px-6 py-10 dark:bg-stone-950 sm:px-8 sm:py-14"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100 sm:text-3xl">
          Como queres simular?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Calculamos o teu líquido real de 2026 — IRS, Segurança Social e IVA.
          Escolhe o caminho que te dá mais à vontade.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
        {/* Card guiado */}
        <button
          type="button"
          onClick={() => onSelect("guiado")}
          className="group relative flex flex-col rounded-3xl border-2 border-brand bg-brand-light p-6 text-left transition-all hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          <span className="absolute right-4 top-4 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Recomendado
          </span>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
            <Sparkle size={20} />
          </span>
          <h3 className="mt-4 font-display text-lg font-semibold text-brand-dark">
            Novo aqui?
          </h3>
          <p className="mt-1 flex-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Começo contigo — responde a 3 perguntas simples e descobre quanto
            fica para ti.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-brand-dark">
            Guia-me passo a passo
            <ArrowRight size={14} />
          </span>
        </button>

        {/* Card profissional */}
        <button
          type="button"
          onClick={() => onSelect("profissional")}
          className="group flex flex-col rounded-3xl border-2 border-stone-200 bg-stone-50 p-6 text-left transition-all hover:border-stone-300 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:border-stone-700 dark:bg-stone-900"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            <LayoutGrid size={20} />
          </span>
          <h3 className="mt-4 font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
            Já sei o que faço
          </h3>
          <p className="mt-1 flex-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Acesso imediato a todos os campos e opções do simulador completo.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors group-hover:border-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200">
            Quero o simulador completo
            <ArrowRight size={14} />
          </span>
        </button>
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => onSelect("profissional")}
          className="text-xs font-medium text-stone-400 underline-offset-2 transition-colors hover:text-stone-600 hover:underline dark:hover:text-stone-300"
        >
          Já escolhi antes — ignorar esta pergunta
        </button>
      </div>
    </m.div>
  );
}
