"use client";

import { m, AnimatePresence } from "motion/react";
import VantagensDesvantagens from "./VantagensDesvantagens";

interface DecisionCardProps {
  titulo: string;
  descricao: string;
  isActive: boolean;
  onToggle: (v: boolean) => void;
  impacto?: string; // ex: "Poupas 2.240€/ano"
  impactoPositivo?: boolean; // controla cor (verde vs vermelho)
  vantagens?: string[];
  desvantagens?: string[];
  avisos?: string[];
  children?: React.ReactNode; // conteúdo extra quando activo
  disabled?: boolean;
  disabledRazao?: string;
}

/**
 * Cartão de decisão com toggle personalizado e consequência imediata visível.
 * Mostra impacto, vantagens/desvantagens e conteúdo extra quando ativo.
 */
export default function DecisionCard({
  titulo,
  descricao,
  isActive,
  onToggle,
  impacto,
  impactoPositivo = true,
  vantagens = [],
  desvantagens = [],
  avisos = [],
  children,
  disabled = false,
  disabledRazao,
}: DecisionCardProps) {
  const temReveal =
    isActive &&
    (vantagens.length > 0 ||
      desvantagens.length > 0 ||
      avisos.length > 0 ||
      !!children);

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        disabled
          ? "border-stone-200 bg-stone-50 opacity-60 dark:border-stone-800 dark:bg-stone-900"
          : isActive
            ? "border-brand bg-brand-light"
            : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-900"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4
            className={`text-sm font-semibold ${
              isActive && !disabled
                ? "text-brand-dark"
                : "text-stone-700 dark:text-stone-200"
            }`}
          >
            {titulo}
          </h4>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {disabled && disabledRazao ? disabledRazao : descricao}
          </p>
        </div>

        {/* Toggle personalizado */}
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label={titulo}
          disabled={disabled}
          onClick={() => !disabled && onToggle(!isActive)}
          className={`inline-flex h-8 w-12 flex-shrink-0 items-center rounded-full p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
            isActive && !disabled
              ? "bg-brand"
              : "bg-stone-200 dark:bg-stone-700"
          } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          <span
            className={`h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              isActive ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Badge de impacto */}
      <AnimatePresence>
        {isActive && impacto && !disabled && (
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-3"
          >
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                impactoPositivo
                  ? "bg-brand text-white"
                  : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              }`}
            >
              {impacto}
            </span>
          </m.div>
        )}
      </AnimatePresence>

      {/* Reveal: vantagens/desvantagens + children */}
      <AnimatePresence>
        {temReveal && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 space-y-3"
          >
            <VantagensDesvantagens
              vantagens={vantagens}
              desvantagens={desvantagens}
              avisos={avisos}
            />
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
