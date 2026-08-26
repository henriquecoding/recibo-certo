import Link from "next/link";
import {
  ArrowRight,
  Lightbulb,
  Lock,
  ShieldCheck,
  Sparkle,
} from "@/components/ui/Icons";
import PalcoDescobrir from "./PalcoDescobrir";
import type { ExemploDescoberta } from "./tipos";
import { SubtituloHero, TituloHero } from "@/components/foco/TextosHero";

export type { ExemploDescoberta } from "./tipos";

export default function HeroDescobrir({ exemplo }: { exemplo: ExemploDescoberta }) {
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
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-light px-3.5 py-2 text-xs font-semibold text-brand-dark dark:bg-brand/15 dark:text-brand-mint">
            <Lightbulb size={14} />
            Descobrir um negócio
            <span aria-hidden className="h-1 w-1 rounded-full bg-brand/50" />
            Portugal
          </div>
          {/* O texto vem de `copy-heros.ts`, como o dos outros quatro.
              Estava escrito aqui, e era um aforismo sem uma única palavra
              do que alguém procura — ver o cabeçalho dessa tabela. */}
          <TituloHero foco="descobrir" />
          <SubtituloHero foco="descobrir" />
        </div>

        <div className="mt-10 sm:mt-12">
          <PalcoDescobrir exemplo={exemplo} />
        </div>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/ferramentas/descobrir-negocio"
            className="btn-shine focus-marca inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white no-underline shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float sm:w-auto"
          >
            Descobrir o que posso testar <ArrowRight size={15} />
          </Link>
          <a
            href="#como-decide"
            className="focus-marca inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 no-underline transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 sm:w-auto"
          >
            Ver como decide <Sparkle size={14} />
          </a>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <Lock size={12} className="text-brand" /> O teu contexto fica neste dispositivo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-brand" /> Lacunas ficam visíveis
          </span>
        </div>
      </div>
    </section>
  );
}
