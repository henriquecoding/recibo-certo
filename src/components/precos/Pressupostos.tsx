"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ESTAMOS A ASSUMIR — os valores por omissão, ditos em voz alta
//  ---------------------------------------------------------------------
//  O cabeçalho de `perguntas.ts` promete isto desde o primeiro dia: «os
//  valores por omissão são declarados, nunca escondidos: o resultado diz
//  sempre "estamos a assumir X" quando assume». A promessa nunca chegou a
//  existir no ecrã. O que existia era um formulário com números já
//  preenchidos, indistinguíveis dos que a pessoa tinha escrito.
//
//  É o defeito que a NN/g chama «misleading defaults» e que aqui custa
//  caro: uma margem de partida de 70% num produto digital, um volume de
//  20 unidades e um custo de 0 € produzem um preço perfeitamente
//  plausível que ninguém escolheu. E como parecia plausível, ninguém o
//  punha em causa.
//
//  A lista é acionável de propósito. Cada linha leva ao campo em falta —
//  não adianta dizer a alguém que está a assumir uma coisa e deixá-lo a
//  procurar onde é que se corrige.
// ═══════════════════════════════════════════════════════════════════════

import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import type { Preenchimento } from "@/lib/pricing";
import { Info, ArrowRight } from "@/components/ui/Icons";

export default function Pressupostos({ preenchimento }: { preenchimento: Preenchimento }) {
  if (preenchimento.pressupostos.length === 0) return null;

  const irPara = (campo: string) => {
    const el = document.getElementById(campo);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // O foco é o que importa para quem navega por teclado; o scroll é
    // cortesia para quem vê. Nem todo o campo é focável — um grupo de
    // opções é uma `div` — por isso procura-se lá dentro o controlo que
    // recebe o foco. `preventScroll` evita o salto duplo.
    const focavel =
      el.matches("input, select, textarea, button")
        ? el
        : el.querySelector<HTMLElement>('[role="radio"][tabindex="0"], input, select, textarea, button');
    focavel?.focus({ preventScroll: true });
  };

  return (
    <m.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      aria-label="O que estamos a assumir"
      className="rounded-2xl border border-alert-border bg-alert-bg p-4"
    >
      <h3 className="flex items-start gap-2 text-sm font-semibold text-alert-text">
        <Info size={15} className="mt-0.5 flex-shrink-0" />
        {preenchimento.pressupostos.length === 1
          ? "Falta uma resposta, e estamos a assumi-la por ti"
          : `Faltam ${preenchimento.pressupostos.length} respostas, e estamos a assumi-las por ti`}
      </h3>
      <p className="mt-1.5 pl-[23px] text-xs leading-relaxed text-alert-text">
        O preço já conta com estes valores. Enquanto forem nossos e não teus, é uma estimativa.
      </p>

      <ul className="mt-3 space-y-1.5 pl-[23px]">
        {preenchimento.pressupostos.map((p) => (
          <li key={p.campo}>
            <button
              type="button"
              onClick={() => irPara(p.campo)}
              className="group flex w-full min-h-[36px] items-start gap-2 rounded-xl bg-white/60 px-3 py-2 text-left transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:bg-stone-900/40 dark:hover:bg-stone-900/70"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-100">{p.rotulo}</span>
                  <span className="text-xs tabular-nums text-stone-600 dark:text-stone-400">{p.valor}</span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
                  {p.porque}
                </span>
              </span>
              <ArrowRight
                size={13}
                className="mt-0.5 flex-shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
              />
            </button>
          </li>
        ))}
      </ul>
    </m.section>
  );
}
