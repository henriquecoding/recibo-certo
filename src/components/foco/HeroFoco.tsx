// ═══════════════════════════════════════════════════════════════════════
//  A GEOMETRIA DO HERO — a mesma nos cinco focos
//  ---------------------------------------------------------------------
//  Estava escrita duas vezes, byte a byte, em `HeroDescobrir` e
//  `HeroPreco`. Os dois pareciam-se por eu os ter escrito à mão da mesma
//  maneira, não por partilharem alguma coisa — que é exatamente a receita
//  para o terceiro nascer diferente e ninguém saber apontar porquê.
//
//  O que fica aqui é a FORMA: sobrancelha → título → subtítulo → palco →
//  dois CTA → linha de confiança. O que cada foco entrega é o palco — o
//  título e o subtítulo vêm de `copy-heros.ts`, onde os cinco se leem
//  seguidos e onde a forma das frases está escrita e testada.
// ═══════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Sparkle } from "@/components/ui/Icons";
import type { DefinicaoFoco } from "./focos";
import CabecalhoHeroFoco from "./CabecalhoHeroFoco";

export interface SeloConfianca {
  Icon: (props: { size?: number; className?: string }) => ReactNode;
  texto: string;
}

export default function HeroFoco({
  foco,
  ancora,
  rotuloAncora = "Ver como funciona",
  selos,
  children,
}: {
  foco: DefinicaoFoco;
  /** A âncora do CTA secundário — sempre DENTRO da página. */
  ancora: string;
  rotuloAncora?: string;
  selos: readonly SeloConfianca[];
  /** O palco. */
  children: ReactNode;
}) {
  return (
    <section
      data-hero
      className="grain relative overflow-hidden px-4 pb-14 pt-7 sm:px-6 sm:pb-20 sm:pt-10"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-48 top-16 h-[28rem] w-[28rem] rounded-full bg-brand-mint/20 blur-3xl" />
        <div className="absolute -right-56 -top-44 h-[34rem] w-[34rem] rounded-full bg-categoria-areia-bg/60 blur-3xl dark:bg-brand/10" />
      </div>

      <div className="mx-auto max-w-6xl">
        <CabecalhoHeroFoco foco={foco} />

        <div className="mt-1 sm:mt-2">{children}</div>

        {/* Um primário sólido para a ferramenta e um secundário com
            contorno para uma âncora DENTRO da página. Nunca dois
            primários: dois botões com o mesmo peso não são uma escolha,
            são uma indecisão a pedir emprestada a atenção de quem lê. */}
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={foco.ferramenta}
            className="btn-shine focus-marca inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white no-underline shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float sm:w-auto"
          >
            {foco.ctaPrimario} <ArrowRight size={15} />
          </Link>
          <a
            href={ancora}
            className="focus-marca inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 no-underline transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 sm:w-auto"
          >
            {rotuloAncora} <Sparkle size={14} />
          </a>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-stone-500">
          {selos.map(({ Icon: SeloIcon, texto }) => (
            <span key={texto} className="inline-flex items-center gap-1.5">
              <SeloIcon size={12} className="text-brand" /> {texto}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
