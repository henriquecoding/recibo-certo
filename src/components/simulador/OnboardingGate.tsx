"use client";

import { m } from "motion/react";
import { Sparkle, LayoutGrid, ArrowRight } from "@/components/ui/Icons";

interface OnboardingGateProps {
  onSelect: (modo: "guiado" | "profissional") => void;
}

export default function OnboardingGate({ onSelect }: OnboardingGateProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Hero header */}
      <div className="relative overflow-hidden bg-brand px-6 py-10 text-white sm:px-8 sm:py-12">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-green-100/60">
            Calculadora 2026
          </div>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            Como queres simular?
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-green-100/70">
            Calculamos o teu líquido real — IRS, Segurança Social e IVA — com base na legislação atual.
          </p>
        </div>
      </div>

      {/* Mode cards */}
      <div className="bg-stone-50 px-6 py-8 dark:bg-stone-900 sm:px-8">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
          {/* Guided card */}
          <button
            type="button"
            onClick={() => onSelect("guiado")}
            className="group relative flex flex-col rounded-4xl border-2 border-brand bg-brand-light p-6 text-left transition-all hover:shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <span className="absolute right-4 top-4 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Recomendado
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
              <Sparkle size={22} />
            </span>
            <h3 className="mt-5 font-display text-xl font-semibold text-brand-dark">
              Novo aqui?
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              Começo contigo — responde a 3 perguntas simples e descobre exatamente quanto fica para ti.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-brand-dark">
              Guia-me passo a passo
              <ArrowRight size={14} />
            </span>
          </button>

          {/* Professional card */}
          <button
            type="button"
            onClick={() => onSelect("profissional")}
            className="group flex flex-col rounded-4xl border-2 border-stone-200 bg-white p-6 text-left transition-all hover:border-stone-300 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:border-stone-700 dark:bg-stone-900"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand-light group-hover:text-brand dark:bg-stone-800 dark:text-stone-300">
              <LayoutGrid size={22} />
            </span>
            <h3 className="mt-5 font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
              Já sei o que faço
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              Acesso imediato a todos os campos e opções do simulador completo.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors group-hover:border-stone-300 group-hover:bg-white dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200">
              Quero o simulador completo
              <ArrowRight size={14} />
            </span>
          </button>
        </div>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => onSelect("profissional")}
            className="text-xs font-medium text-stone-400 underline-offset-2 transition-colors hover:text-stone-600 hover:underline dark:hover:text-stone-300"
          >
            Já escolhi antes — ignorar esta pergunta
          </button>
        </div>
      </div>
    </m.div>
  );
}
