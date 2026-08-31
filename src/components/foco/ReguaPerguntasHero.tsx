"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { FocoHomepage } from "@/lib/foco-homepage";
import { FOCOS, hrefDoFoco } from "./focos";
import { useIntencaoFocos } from "./ControladorPrefetchFocos";

/**
 * A navegação global diz em que território estamos; esta régua diz em que
 * pergunta do instrumento estamos. É por isso que ela vive colada ao palco:
 * trocar de pergunta muda o H1, a explicação, o exemplo e a decisão mostrada.
 */
export default function ReguaPerguntasHero({ focoAtivo }: { focoAtivo: FocoHomepage }) {
  const calha = useRef<HTMLDivElement>(null);
  const itemAtivo = useRef<HTMLAnchorElement>(null);
  const { pendente, preparar, iniciar } = useIntencaoFocos();

  useEffect(() => {
    const contentor = calha.current;
    const item = itemAtivo.current;
    if (!contentor || !item || contentor.scrollWidth <= contentor.clientWidth) return;
    // `scrollIntoView` sobe por TODOS os antepassados scrolláveis. Na
    // pergunta 05 a calha já estava no limite e o browser continuava no
    // antepassado seguinte — o próprio hero com `overflow-hidden` —,
    // deixando palco e H1 deslocados para a esquerda sem o dedo conseguir
    // repor. Mover exclusivamente `scrollLeft` torna esse estado impossível.
    const centro = item.offsetLeft - (contentor.clientWidth - item.offsetWidth) / 2;
    const maximo = Math.max(0, contentor.scrollWidth - contentor.clientWidth);
    contentor.scrollLeft = Math.max(0, Math.min(maximo, centro));
  }, [focoAtivo]);

  return (
    <nav aria-label="Escolher uma das cinco perguntas" className="-mx-4 mt-7 sm:mx-0 sm:mt-9">
      <div ref={calha} className="overflow-x-auto scroll-smooth px-4 pb-3 [scrollbar-width:thin] sm:px-0">
        <div className="flex w-max snap-x snap-mandatory gap-2 sm:grid sm:min-w-[58rem] sm:grid-cols-5 sm:gap-0 sm:rounded-[1.75rem] sm:border sm:border-stone-200 sm:bg-white sm:p-1.5 sm:shadow-[0_18px_55px_rgba(36,31,24,.08)] sm:dark:border-stone-700 sm:dark:bg-stone-900">
          {FOCOS.map((item, indice) => {
            const ativo = item.id === focoAtivo;
            const destacado = pendente ? pendente === item.id : ativo;
            const href = hrefDoFoco(item.id);

            return (
              <Link
                key={item.id}
                ref={ativo ? itemAtivo : undefined}
                href={href}
                data-foco-destino={item.id}
                prefetch={false}
                scroll={false}
                aria-current={ativo ? "step" : undefined}
                aria-busy={pendente === item.id || undefined}
                onPointerEnter={() => preparar(item.id)}
                onFocus={() => preparar(item.id)}
                onPointerDown={(evento) => {
                  if (
                    evento.button === 0 &&
                    !evento.metaKey &&
                    !evento.ctrlKey &&
                    !evento.shiftKey &&
                    !evento.altKey
                  ) {
                    iniciar(item.id, "pointer");
                  }
                }}
                onClick={(evento) => {
                  if (evento.detail === 0) iniciar(item.id, "teclado");
                }}
                className={`focus-marca group relative flex min-h-[84px] w-[calc(100vw-3.5rem)] max-w-[21rem] snap-center items-center justify-center gap-3 rounded-[1.35rem] border border-stone-200 bg-white px-4 py-3 text-center no-underline shadow-card transition-[background-color,color,box-shadow,transform] duration-200 dark:border-stone-700 dark:bg-stone-900 sm:w-auto sm:max-w-none sm:border-0 sm:bg-transparent sm:shadow-none ${
                  destacado
                    ? "z-10 !border-brand !bg-brand text-white shadow-[0_16px_35px_rgba(15,107,82,.24)]"
                    : "text-stone-700 hover:-translate-y-0.5 hover:bg-stone-50 hover:text-brand-dark dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-brand-mint"
                }`}
              >
                <span
                  className={`font-display text-xl font-semibold tabular-nums ${
                    destacado ? "text-brand-mint" : "text-stone-400 dark:text-stone-500"
                  }`}
                >
                  {String(indice + 1).padStart(2, "0")}
                </span>
                <span className="max-w-[9.5rem] text-sm font-semibold leading-snug">
                  {item.pergunta}
                </span>
                {destacado ? (
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
