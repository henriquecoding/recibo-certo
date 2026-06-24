"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Primitivas visuais do Modo Guiado — linguagem calma e editorial (Stripe/Linear)
// partilhada por todos os passos, para o fluxo ser coerente de ponta a ponta.
// Só apresentação: nenhuma lógica fiscal vive aqui.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { m, AnimatePresence } from "motion/react";
import { Check, ArrowRight, ArrowLeft } from "@/components/ui/Icons";
import { EASE } from "@/lib/motion";

/* ── Stepper editorial ──────────────────────────────────────────────────────
   Linha fina com círculos numerados; o passo ativo ganha anel da marca, os
   concluídos um visto. Calmo, sem ruído. */
export function GuiadoStepper({ passos, atual }: { passos: string[]; atual: number }) {
  return (
    <ol className="flex items-start" aria-label="Progresso">
      {passos.map((label, i) => {
        const n = i + 1;
        const done = atual > n;
        const active = atual === n;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-current={active ? "step" : undefined}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition-all duration-300 ${
                  done
                    ? "bg-brand text-white"
                    : active
                      ? "bg-brand text-white ring-4 ring-brand/15"
                      : "border border-stone-200 bg-white text-stone-400 dark:border-stone-700 dark:bg-stone-800"
                }`}
              >
                {done ? <Check size={12} /> : n}
              </span>
              <span
                className={`hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide transition-colors sm:block ${
                  active
                    ? "text-brand-dark dark:text-brand"
                    : done
                      ? "text-stone-500 dark:text-stone-400"
                      : "text-stone-300 dark:text-stone-600"
                }`}
              >
                {label}
              </span>
            </div>
            {i < passos.length - 1 && (
              <div className="mx-2 -mt-[18px] h-px flex-1 sm:mx-3">
                <div
                  className={`h-px w-full transition-colors duration-500 ${
                    done ? "bg-brand" : "bg-stone-200 dark:bg-stone-700"
                  }`}
                />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ── Cabeçalho de passo ─────────────────────────────────────────────────────
   Eyebrow + título display + subtítulo. Mesma estrutura em todos os passos. */
export function GuiadoCabecalho({
  eyebrow,
  titulo,
  subtitulo,
  acima,
}: {
  eyebrow?: string;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  acima?: ReactNode;
}) {
  return (
    <header className="mb-7">
      {acima}
      {eyebrow && <div className="eyebrow mb-2 text-brand">{eyebrow}</div>}
      <h2 className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
        {titulo}
      </h2>
      {subtitulo && (
        <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          {subtitulo}
        </p>
      )}
    </header>
  );
}

/* ── Cartão de opção ────────────────────────────────────────────────────────
   Ícone (ou número) + título + descrição + seta. Substitui os vários botões
   feitos à mão pelo fluxo, dando-lhes um aspeto único e calmo. */
export function GuiadoOpcao({
  leading,
  titulo,
  descricao,
  onClick,
  destaque = false,
  selecionado = false,
  badge,
}: {
  leading: ReactNode;
  titulo: ReactNode;
  descricao?: ReactNode;
  onClick: () => void;
  destaque?: boolean;
  selecionado?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionado || undefined}
      className={`group relative flex w-full items-center gap-4 rounded-3xl border p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
        selecionado
          ? "border-brand bg-brand-light dark:bg-brand/10"
          : destaque
            ? "border-brand/40 bg-white hover:border-brand dark:bg-stone-900"
            : "border-stone-200/80 bg-white hover:border-brand/40 dark:border-stone-800 dark:bg-stone-900"
      }`}
    >
      {badge && (
        <span className="absolute right-3.5 top-3.5 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {badge}
        </span>
      )}
      <span
        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl font-display text-base font-bold transition-colors ${
          selecionado
            ? "bg-brand text-white"
            : "bg-brand-light text-brand group-hover:bg-brand group-hover:text-white dark:bg-stone-800"
        }`}
      >
        {leading}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">
          {titulo}
        </span>
        {descricao && (
          <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {descricao}
          </span>
        )}
      </span>
      <ArrowRight
        size={16}
        className="flex-shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand"
      />
    </button>
  );
}

/* ── Botão "voltar" discreto (texto) ───────────────────────────────────────── */
export function GuiadoVoltarLink({ onClick, label = "Voltar" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 inline-flex items-center gap-1.5 py-1.5 pr-3 text-xs font-medium text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
    >
      <ArrowLeft size={12} /> {label}
    </button>
  );
}

/* ── Rodapé de navegação ────────────────────────────────────────────────────
   Voltar + Continuar, com link discreto "saltar para o completo". */
export function GuiadoNav({
  onVoltar,
  voltarLabel = "Voltar",
  onAvancar,
  avancarLabel = "Continuar",
  avancarDisabled = false,
  onSaltar,
}: {
  onVoltar: () => void;
  voltarLabel?: string;
  onAvancar: () => void;
  avancarLabel?: string;
  avancarDisabled?: boolean;
  onSaltar?: () => void;
}) {
  return (
    <div className="mt-8 border-t border-stone-100 pt-6 dark:border-stone-800">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-500 transition-all hover:border-stone-300 hover:bg-stone-50 hover:text-stone-800 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          <ArrowLeft size={14} /> {voltarLabel}
        </button>
        <button
          type="button"
          onClick={onAvancar}
          disabled={avancarDisabled}
          className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-float disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {avancarLabel} <ArrowRight size={14} />
        </button>
      </div>
      {onSaltar && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onSaltar}
            className="px-3 py-2 text-xs text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
          >
            Saltar para o simulador completo →
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Transição entre passos ─────────────────────────────────────────────────
   Wrapper de animação coerente (entra da direita, sai para a esquerda). */
export function GuiadoTransicao({ chave, children }: { chave: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <m.div
        key={chave}
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -18 }}
        transition={{ duration: 0.28, ease: EASE }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
