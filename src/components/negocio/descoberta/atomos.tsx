"use client";

// Primitivas partilhadas pelo motor de descoberta. Vivem aqui para os
// componentes grandes ficarem legíveis e para o estilo não divergir entre
// a fase de configuração e a de resultados.

import type { ComponentType, ReactNode } from "react";
import { Check, Plus } from "@/components/ui/Icons";

export function Chip({ children, tom = "neutro" }: { children: ReactNode; tom?: "neutro" | "marca" | "aviso" | "risco" }) {
  const cor = {
    neutro: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
    marca: "bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint",
    aviso: "bg-alert-bg text-alert-text",
    risco: "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200",
  }[tom];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cor}`}>
      {children}
    </span>
  );
}

/** Botão de escolha única. Alvo ≥ 38 px, foco visível, `aria-pressed`. */
export function Opcao({
  ativo,
  onClick,
  children,
  largura = "auto",
}: {
  ativo: boolean;
  onClick: () => void;
  children: ReactNode;
  largura?: "auto" | "cheia";
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`min-h-[38px] rounded-xl border px-3 text-[12px] font-semibold leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        largura === "cheia" ? "flex-1" : ""
      } ${
        ativo
          ? "border-brand bg-brand text-white"
          : "border-stone-200 bg-white text-stone-600 hover:border-brand/60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
      }`}
    >
      {children}
    </button>
  );
}

/** Botão de escolha múltipla, com o sinal de estado à esquerda. */
export function OpcaoMultipla({
  ativo,
  onClick,
  titulo,
  nota,
}: {
  ativo: boolean;
  onClick: () => void;
  titulo: string;
  nota?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`flex min-h-[42px] w-full items-start gap-2 rounded-xl border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        ativo
          ? "border-brand bg-brand-light/60 dark:border-brand/40 dark:bg-brand/10"
          : "border-stone-200 bg-white hover:border-brand/50 dark:border-stone-700 dark:bg-stone-900"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-md ${
          ativo ? "bg-brand text-white" : "bg-stone-100 text-stone-400 dark:bg-stone-800"
        }`}
      >
        {ativo ? <Check size={10} /> : <Plus size={10} />}
      </span>
      <span className="min-w-0">
        <span className={`block text-[12px] font-semibold leading-tight ${ativo ? "text-brand-deep dark:text-brand-mint" : "text-stone-700 dark:text-stone-200"}`}>
          {titulo}
        </span>
        {nota ? <span className="mt-0.5 block text-[11px] leading-snug text-stone-500">{nota}</span> : null}
      </span>
    </button>
  );
}

export function Campo({ rotulo, nota, children }: { rotulo: string; nota?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        {rotulo}
      </legend>
      {children}
      {nota ? <p className="mt-1.5 text-[11px] leading-snug text-stone-500">{nota}</p> : null}
    </fieldset>
  );
}

/**
 * A barra de profundidade.
 *
 * Nunca chamada «precisão»: é a fração das respostas que existem, e o
 * rótulo di-lo. Uma barra chamada precisão sugeria que a resposta está
 * 82 % certa, que é outra coisa e não é verdade.
 */
export function BarraProfundidade({ percentagem }: { percentagem: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
          Quanto já conhecemos do teu cenário
        </span>
        <span className="text-[12px] font-semibold tabular-nums text-ink">{percentagem}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percentagem}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profundidade do contexto"
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${Math.max(2, percentagem)}%` }}
        />
      </div>
    </div>
  );
}

/** Uma linha de barra para uma dimensão do score. `null` = não avaliada. */
export function LinhaDimensao({ rotulo, valor }: { rotulo: string; valor: number | null }) {
  return (
    <li className="flex items-center gap-2 text-[12px]">
      <span className="min-w-0 flex-1 truncate text-stone-600 dark:text-stone-300">{rotulo}</span>
      {valor === null ? (
        <span className="flex-none text-[11px] italic text-stone-400">sem base para avaliar</span>
      ) : (
        <>
          <span aria-hidden="true" className="h-1.5 w-16 flex-none overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <span className="block h-full rounded-full bg-brand" style={{ width: `${valor}%` }} />
          </span>
          <span className="w-8 flex-none text-right tabular-nums text-stone-500">{valor}</span>
        </>
      )}
    </li>
  );
}

export function Seccao({
  titulo,
  icone: Icone,
  children,
  acao,
}: {
  titulo: string;
  icone?: ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <section className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display flex items-center gap-2 text-base font-semibold text-ink">
          {Icone ? <Icone size={15} className="flex-none text-brand" /> : null}
          {titulo}
        </h3>
        {acao}
      </div>
      {children}
    </section>
  );
}
