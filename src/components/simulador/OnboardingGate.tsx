"use client";

import { m } from "motion/react";
import { Sparkle, LayoutGrid, ArrowRight, ShieldCheck } from "@/components/ui/Icons";
import { EASE } from "@/lib/motion";

interface OnboardingGateProps {
  onSelect: (modo: "guiado" | "profissional") => void;
}

export default function OnboardingGate({ onSelect }: OnboardingGateProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="grain bg-cream px-6 py-12 dark:bg-stone-950 sm:px-8 sm:py-16"
    >
      {/* Cabeçalho editorial — calmo, sem bloco de cor pesado */}
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-3 text-brand">Calculadora 2026</div>
        <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          Como queres simular?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Calculamos o teu líquido real — IRS, Segurança Social e IVA — com base na
          legislação de 2026.
        </p>
      </div>

      {/* Cartões de modo */}
      <div className="mx-auto mt-9 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
        {/* Guiado (recomendado) */}
        <button
          type="button"
          onClick={() => onSelect("guiado")}
          className="group relative flex flex-col rounded-4xl border-2 border-brand bg-white p-6 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:bg-stone-900 sm:p-7"
        >
          <span className="absolute right-4 top-4 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Recomendado
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
            <Sparkle size={22} />
          </span>
          <h3 className="mt-5 font-display text-xl font-semibold text-ink">Novo aqui?</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Respondes a 3 perguntas simples e descobres exatamente quanto fica para ti
            — passo a passo, sem te perderes.
          </p>
          <span className="mt-6 inline-flex items-center gap-1.5 self-start rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all group-hover:bg-brand-dark">
            Guia-me passo a passo <ArrowRight size={14} />
          </span>
        </button>

        {/* Completo */}
        <button
          type="button"
          onClick={() => onSelect("profissional")}
          className="group flex flex-col rounded-4xl border border-stone-200/80 bg-white p-6 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:border-stone-800 dark:bg-stone-900 sm:p-7"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand-light group-hover:text-brand dark:bg-stone-800 dark:text-stone-300">
            <LayoutGrid size={22} />
          </span>
          <h3 className="mt-5 font-display text-xl font-semibold text-ink">
            Já sei o que faço
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Acesso imediato a todos os campos e opções do simulador completo.
          </p>
          <span className="mt-6 inline-flex items-center gap-1.5 self-start rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors group-hover:border-stone-300 group-hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
            Quero o simulador completo <ArrowRight size={14} />
          </span>
        </button>
      </div>

      {/* Nota de confiança + saltar */}
      <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center gap-3">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-400">
          <ShieldCheck size={13} className="text-brand" /> Taxas oficiais de 2026 · grátis, sem registo
        </p>
        <button
          type="button"
          onClick={() => onSelect("profissional")}
          className="px-3 py-2 text-xs font-medium text-stone-400 underline-offset-2 transition-colors hover:text-stone-600 hover:underline dark:hover:text-stone-300"
        >
          Já escolhi antes — ignorar esta pergunta
        </button>
      </div>
    </m.div>
  );
}
