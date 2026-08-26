// ═══════════════════════════════════════════════════════════════════════
//  A BÚSSOLA — o que substitui o cartão «Sou trabalhador / Gostaria de»
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ TIRAR O CARTÃO E NÃO PÔR NADA NO LUGAR FOI UM ERRO                  │
//  │                                                                     │
//  │ O cartão antigo perguntava QUEM ÉS, e isso estava mal — a NN/g tem  │
//  │ cinco razões documentadas contra navegação por audiência. Mas o     │
//  │ cartão fazia uma coisa que a barra de navegação não faz: estava NA  │
//  │ PÁGINA, no ponto onde a pessoa decide, e ramificava ali mesmo.      │
//  │                                                                     │
//  │ Ao retirá-lo, argumentei que a cápsula do cabeçalho já mostrava os  │
//  │ cinco pilares. É verdade e é insuficiente: uma barra de navegação   │
//  │ é para quem já sabe para onde vai. Quem chega a `/` não sabe — e    │
//  │ ficou sem nada a guiá-lo, com cinco páginas novas atrás de um       │
//  │ clique que ninguém lhe disse para dar.                              │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ── O que muda em relação ao cartão antigo ───────────────────────────
//
//  A pergunta. Era «o que és» e passa a ser «o que queres saber» — cada
//  entrada é a pergunta que aquele foco responde, escrita como uma pessoa
//  a faria. É a recomendação literal da NN/g: privilegiar tarefas e
//  tópicos sobre segmentos de audiência na navegação primária.
//
//  E deixaram de ser botões que mudam um valor em `localStorage`: são
//  cinco `<a href>` reais, renderizados no servidor, partilháveis e
//  abríveis noutro separador.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { ArrowRight } from "@/components/ui/Icons";
import { iconeDe } from "@/components/ferramentas/icon-map";
import type { FocoHomepage } from "@/lib/foco-homepage";
import { FOCOS, hrefDoFoco } from "./focos";

export default function Bussola({
  /** O foco onde a pessoa já está — esse não se sugere a si próprio. */
  excepto,
  titulo = "O que queres saber?",
  nota,
  compacta = false,
}: {
  excepto?: FocoHomepage;
  titulo?: string;
  nota?: string;
  compacta?: boolean;
}) {
  const entradas = FOCOS.filter((foco) => foco.id !== excepto);

  return (
    <section
      aria-labelledby="bussola-titulo"
      className={
        compacta
          ? "rounded-4xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-5"
          : "rounded-3xl border border-stone-200/80 bg-stone-50/80 p-3 shadow-sm backdrop-blur-sm dark:border-stone-700/80 dark:bg-stone-900/60 sm:p-3.5"
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
        <h2
          id="bussola-titulo"
          className={
            compacta
              ? "font-display text-lg font-semibold text-ink"
              : "text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400"
          }
        >
          {titulo}
        </h2>
        {nota ? <p className="text-xs text-stone-500 dark:text-stone-400">{nota}</p> : null}
      </div>

      {/*
        Uma coluna a 360 px e duas a partir de `sm`. Nunca cinco numa
        linha: a cada entrada não interessa o ícone — interessa a
        PERGUNTA, e uma pergunta não cabe num quinto da largura.
      */}
      <ul className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {entradas.map((foco) => {
          const Icon = iconeDe(foco.icone);
          return (
            <li key={foco.id}>
              <Link
                href={hrefDoFoco(foco.id)}
                className="focus-marca group flex h-full min-h-[52px] items-center gap-2.5 rounded-2xl border border-transparent bg-white px-3 py-2 text-left no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card dark:bg-stone-800"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white dark:bg-brand/15">
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-tight text-stone-800 dark:text-stone-100">
                    {foco.pergunta}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    {foco.label}
                  </span>
                </span>
                <ArrowRight
                  size={13}
                  className="flex-shrink-0 text-stone-400 transition-all group-hover:translate-x-0.5 group-hover:text-brand"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
