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

  // ┌─────────────────────────────────────────────────────────────────────┐
  // │ `scrollIntoView` NÃO SCROLLA UM ELEMENTO — SCROLLA A ÁRVORE INTEIRA   │
  // │                                                                     │
  // │ Estava aqui `itemAtivo.scrollIntoView({ inline: "center" })` para    │
  // │ centrar a pergunta activa na calha. Faz isso — e, quando a calha     │
  // │ sozinha não chega, o browser CONTINUA a subir e scrolla o            │
  // │ antepassado seguinte que possa scrollar.                             │
  // │                                                                     │
  // │ Em `/inicio/salario` a pergunta activa é a 05, a última: a calha já  │
  // │ está no máximo (scrollLeft 848) e não há mais para dar, por isso o   │
  // │ browser passa ao `section.grain` do hero e põe-lhe scrollLeft 56. O  │
  // │ `h1` passa de left 16 para left −40 e o palco inteiro sai pela       │
  // │ esquerda do ecrã, com uma faixa morta de 72px à direita.             │
  // │                                                                     │
  // │ E não se desfaz: essa `section` é `overflow-hidden`, portanto é      │
  // │ scrollável por programa e NÃO por dedo — não há barra, não há        │
  // │ gesto, o conteúdo fica cortado até se recarregar a página. Era o     │
  // │ defeito reportado: «o palco do salário está cortado».                │
  // │                                                                     │
  // │ `overflow: hidden` esconde a barra; não deixa de ser um contentor    │
  // │ de scroll. A correcção é não pedir à árvore o que só a calha tem de  │
  // │ fazer: escrever o `scrollLeft` DELA, e de mais nada.                 │
  // └─────────────────────────────────────────────────────────────────────┘
  useEffect(() => {
    const contentor = calha.current;
    const item = itemAtivo.current;
    if (!contentor || !item) return;
    if (contentor.scrollWidth <= contentor.clientWidth) return;

    const caixaCalha = contentor.getBoundingClientRect();
    const caixaItem = item.getBoundingClientRect();
    // Quanto falta deslizar para o item ficar centrado na calha, medido
    // entre os dois — nunca em coordenadas do documento, que é onde a
    // versão anterior arrastava o resto da página atrás de si.
    const desvio =
      caixaItem.left - caixaCalha.left - (caixaCalha.width - caixaItem.width) / 2;
    const limite = contentor.scrollWidth - contentor.clientWidth;
    contentor.scrollLeft = Math.min(Math.max(0, contentor.scrollLeft + desvio), limite);
  }, [focoAtivo]);

  return (
    <nav aria-label="Escolher uma das cinco perguntas" className="mt-7 sm:mt-9">
      {/* ┌───────────────────────────────────────────────────────────────────┐
          │ A RÉGUA ERA UMA GRELHA DE DESKTOP A SER ARRASTADA PARA O TELEMÓVEL │
          │                                                                   │
          │ Eram cinco colunas dentro de `min-w-[58rem]` — 928px fixos. Num    │
          │ ecrã de 360 isso é um scroller de 928px sem `snap` e sem máscara:  │
          │ o item activo centra-se e os dois vizinhos ficam cortados a MEIO   │
          │ DA PALAVRA contra a berma. Lia-se «ecibo, / mesmo / u?» à esquerda │
          │ e «O n / ver» à direita. Ninguém vê ali um carrossel; vê uma       │
          │ página partida — e foi exactamente isso que nos foi reportado.     │
          │                                                                   │
          │ Abaixo de `sm:` a régua deixa de ser grelha e passa a ser o que    │
          │ já era na prática: uma fila deslizável. Com as três coisas que     │
          │ faltavam para o corte ser uma promessa em vez de um defeito —      │
          │                                                                   │
          │  · `snap-x` + `snap-center`, para parar sempre numa pergunta       │
          │    inteira e nunca a meio;                                         │
          │  · sangria até à berma do ecrã (`-mx-4 px-4`), para o corte        │
          │    acontecer na berma e não a 16px dela, onde parece acidente;     │
          │  · uma máscara nas pontas, que esbate o vizinho em vez de o        │
          │    guilhotinar — é o que diz «há mais para o lado».                │
          │                                                                   │
          │ E cada pergunta passa a ter superfície própria no telemóvel: numa  │
          │ bandeja de 928px as bordas arredondadas ficam fora do ecrã, por    │
          │ isso a bandeja não desenhava nada — só empurrava.                  │
          │                                                                   │
          │ A partir de `sm:` volta tudo ao que era: a mesma grelha de cinco   │
          │ colunas, a mesma bandeja, sem snap e sem máscara.                  │
          └───────────────────────────────────────────────────────────────────┘ */}
      <div
        ref={calha}
        className="-mx-4 snap-x snap-mandatory overflow-x-auto scroll-px-4 px-4 pb-3 [scrollbar-width:thin] [mask-image:linear-gradient(to_right,transparent,#000_1.25rem,#000_calc(100%-1.25rem),transparent)] sm:mx-0 sm:snap-none sm:px-0 sm:[mask-image:none]"
      >
        <div className="flex gap-2 sm:grid sm:min-w-[58rem] sm:grid-cols-5 sm:gap-0 sm:rounded-[1.75rem] sm:border sm:border-stone-200 sm:bg-white sm:p-1.5 sm:shadow-[0_18px_55px_rgba(36,31,24,.08)] sm:dark:border-stone-700 sm:dark:bg-stone-900">
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
                className={`focus-marca group relative flex min-h-[84px] w-[14.5rem] flex-none snap-center items-center justify-center gap-3 rounded-[1.35rem] px-4 py-3 text-center no-underline transition-[background-color,color,box-shadow,transform] duration-200 sm:w-auto sm:flex-auto sm:snap-align-none ${
                  destacado
                    ? "z-10 bg-brand text-white shadow-[0_16px_35px_rgba(15,107,82,.24)]"
                    : // No telemóvel cada pergunta é um cartão por si (a bandeja
                      // que as agrupava só existe a partir de `sm:`), por isso
                      // precisa de superfície própria — senão o inactivo é
                      // texto a flutuar sobre o fundo do palco.
                      "border border-stone-200 bg-white text-stone-700 hover:-translate-y-0.5 hover:bg-stone-50 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-brand-mint sm:border-0 sm:bg-transparent dark:sm:border-0 dark:sm:bg-transparent"
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
