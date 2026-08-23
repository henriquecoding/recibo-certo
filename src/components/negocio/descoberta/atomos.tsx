"use client";

// Primitivas partilhadas pelo motor de descoberta. Vivem aqui para os
// componentes grandes ficarem legíveis e para o estilo não divergir entre
// a fase de configuração e a de resultados.

import type { ComponentType, ReactNode } from "react";
import { Check, ChevronDown, Plus } from "@/components/ui/Icons";

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

/**
 * Uma escolha múltipla compacta.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ PORQUE A DESCRIÇÃO É OPCIONAL E NÃO OBRIGATÓRIA                     │
 * │                                                                    │
 * │ A versão anterior desenhava sempre duas linhas — rótulo e nota — e │
 * │ vinte e duas competências passavam a quarenta e quatro linhas de   │
 * │ texto antes da primeira decisão. As notas são boas («não é          │
 * │ bricolage» evita que alguém se declare eletricista), mas todas ao  │
 * │ mesmo tempo são um muro.                                           │
 * │                                                                    │
 * │ Sem `nota` isto é uma pastilha de uma linha; com `nota` volta a    │
 * │ ser o cartão de antes. Quem desenha decide, por secção, e a pessoa │
 * │ pede as descrições quando quiser.                                  │
 * └────────────────────────────────────────────────────────────────────┘
 */
export function EscolhaChip({
  ativo,
  onClick,
  rotulo,
  nota,
}: {
  ativo: boolean;
  onClick: () => void;
  rotulo: string;
  nota?: string;
}) {
  const marca = (
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 flex-none items-center justify-center rounded-md transition-colors ${
        ativo ? "bg-brand text-white" : "bg-stone-100 text-stone-400 dark:bg-stone-800"
      }`}
    >
      {ativo ? <Check size={10} /> : <Plus size={10} />}
    </span>
  );

  if (!nota) {
    return (
      <button
        type="button"
        aria-pressed={ativo}
        onClick={onClick}
        className={`inline-flex min-h-[38px] max-w-full items-center gap-1.5 rounded-full border px-3 text-left text-[12px] font-semibold leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
          ativo
            ? "border-brand bg-brand-light text-brand-deep dark:border-brand/40 dark:bg-brand/15 dark:text-brand-mint"
            : "border-stone-200 bg-white text-stone-600 hover:border-brand/60 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
        }`}
      >
        {marca}
        <span className="min-w-0">{rotulo}</span>
      </button>
    );
  }

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
      <span className="mt-0.5">{marca}</span>
      <span className="min-w-0">
        <span
          className={`block text-[12px] font-semibold leading-tight ${
            ativo ? "text-brand-deep dark:text-brand-mint" : "text-stone-700 dark:text-stone-200"
          }`}
        >
          {rotulo}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-stone-500">{nota}</span>
      </span>
    </button>
  );
}

/**
 * Um grupo de escolhas com nome — a categoria dentro da secção.
 *
 * O contador não é enfeite: com o grupo cheio de pastilhas iguais, é a
 * única maneira de saber de relance onde já se respondeu.
 */
export function GrupoEscolhas({
  rotulo,
  escolhidas,
  detalhado = false,
  children,
}: {
  rotulo: string;
  escolhidas: number;
  /** `true` quando as escolhas mostram descrição e pedem uma grelha. */
  detalhado?: boolean;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-label={rotulo}>
      <p className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">
          {rotulo}
        </span>
        {escolhidas > 0 ? (
          <span className="rounded-full bg-brand-light px-1.5 text-[10px] font-semibold tabular-nums text-brand-deep dark:bg-brand/15 dark:text-brand-mint">
            {escolhidas}
          </span>
        ) : null}
      </p>
      <div className={detalhado ? "grid gap-1.5 sm:grid-cols-2" : "flex flex-wrap gap-1.5"}>
        {children}
      </div>
    </div>
  );
}

/**
 * A secção do configurador — dobrável, e com o que já respondeste à vista
 * quando está fechada.
 *
 * Sem `onAlternar` comporta-se como sempre se comportou (cabeçalho fixo,
 * corpo sempre aberto): é o que as superfícies que não são o configurador
 * continuam a usar.
 */
export function Seccao({
  titulo,
  icone: Icone,
  children,
  acao,
  id,
  resumo,
  aberta = true,
  onAlternar,
}: {
  titulo: string;
  icone?: ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
  acao?: ReactNode;
  id?: string;
  /** O que já foi respondido, para a secção fechada dizer alguma coisa. */
  resumo?: string;
  aberta?: boolean;
  onAlternar?: () => void;
}) {
  const cabecalho = (
    <h3 className="font-display flex min-w-0 items-center gap-2 text-base font-semibold text-ink">
      {Icone ? <Icone size={15} className="flex-none text-brand" /> : null}
      <span className="min-w-0">{titulo}</span>
    </h3>
  );

  if (!onAlternar) {
    return (
      <section id={id} className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {cabecalho}
          {acao}
        </div>
        {children}
      </section>
    );
  }

  const corpoId = `${id ?? titulo.replace(/\s+/g, "-").toLowerCase()}-corpo`;

  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-start gap-2 p-2 sm:p-3">
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={aberta}
          aria-controls={corpoId}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-3xl px-2 py-1.5 text-left transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-stone-800/60"
        >
          <span className="min-w-0 flex-1">
            {cabecalho}
            {!aberta && resumo ? (
              <span className="mt-0.5 block truncate text-[11px] leading-snug text-stone-500">{resumo}</span>
            ) : null}
          </span>
          <ChevronDown
            size={16}
            className={`flex-none text-stone-400 transition-transform duration-200 motion-reduce:transition-none ${
              aberta ? "rotate-180" : ""
            }`}
          />
        </button>
        {acao && aberta ? <div className="flex-none self-center pr-1">{acao}</div> : null}
      </div>
      <div id={corpoId} hidden={!aberta} className="px-4 pb-4 sm:px-5 sm:pb-5">
        {children}
      </div>
    </section>
  );
}
