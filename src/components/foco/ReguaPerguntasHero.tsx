"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { FocoHomepage } from "@/lib/foco-homepage";
import { FOCOS, hrefDoFoco } from "./focos";

/**
 * A navegação global diz em que território estamos; esta régua diz em que
 * pergunta do instrumento estamos. É por isso que ela vive colada ao palco:
 * trocar de pergunta muda o H1, a explicação, o exemplo e a decisão mostrada.
 */
export default function ReguaPerguntasHero({ focoAtivo }: { focoAtivo: FocoHomepage }) {
  const calha = useRef<HTMLDivElement>(null);
  const itemAtivo = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const contentor = calha.current;
    if (!contentor || contentor.scrollWidth <= contentor.clientWidth) return;
    itemAtivo.current?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
  }, [focoAtivo]);

  return (
    <nav aria-label="Escolher uma das cinco perguntas" className="mt-7 sm:mt-9">
      <div ref={calha} className="overflow-x-auto pb-3 [scrollbar-width:thin]">
        <div className="grid min-w-[58rem] grid-cols-5 rounded-[1.75rem] border border-stone-200 bg-white p-1.5 shadow-[0_18px_55px_rgba(36,31,24,.08)] dark:border-stone-700 dark:bg-stone-900">
          {FOCOS.map((item, indice) => {
            const ativo = item.id === focoAtivo;
            const href = item.id === "descobrir" ? "/" : hrefDoFoco(item.id);

            return (
              <Link
                key={item.id}
                ref={ativo ? itemAtivo : undefined}
                href={href}
                prefetch={false}
                aria-current={ativo ? "step" : undefined}
                className={`focus-marca group relative flex min-h-[84px] items-center justify-center gap-3 rounded-[1.35rem] px-4 py-3 text-center no-underline transition-[background-color,color,box-shadow,transform] duration-200 ${
                  ativo
                    ? "z-10 bg-brand text-white shadow-[0_16px_35px_rgba(15,107,82,.24)]"
                    : "text-stone-700 hover:-translate-y-0.5 hover:bg-stone-50 hover:text-brand-dark dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-brand-mint"
                }`}
              >
                <span
                  className={`font-display text-xl font-semibold tabular-nums ${
                    ativo ? "text-brand-mint" : "text-stone-400 dark:text-stone-500"
                  }`}
                >
                  {String(indice + 1).padStart(2, "0")}
                </span>
                <span className="max-w-[9.5rem] text-sm font-semibold leading-snug">
                  {item.pergunta}
                </span>
                {ativo ? (
                  <span
                    aria-hidden
                    className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-[2px] bg-brand"
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
