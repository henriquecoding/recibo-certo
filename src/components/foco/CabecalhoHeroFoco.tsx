// ═══════════════════════════════════════════════════════════════════════
//  A ABERTURA EDITORIAL DOS CINCO FOCOS
//  ---------------------------------------------------------------------
//  O cabeçalho de navegação já muda de separador; esta peça garante que
//  a promessa logo abaixo muda com ele por inteiro: rótulo, posição,
//  título, explicação e nome do instrumento. Não existe texto «genérico»
//  por cima de cinco respostas diferentes.
//
//  Não é uma segunda navegação. A régua no cabeçalho continua a ser o
//  único controlo entre focos; aqui a posição é apenas contexto editorial.
// ═══════════════════════════════════════════════════════════════════════

import { iconeDe } from "@/components/ferramentas/icon-map";
import type { DefinicaoFoco } from "./focos";
import { FOCOS } from "./focos";
import { SubtituloHero, TituloHero } from "./TextosHero";
import ReguaPerguntasHero from "./ReguaPerguntasHero";

export default function CabecalhoHeroFoco({
  foco,
  tituloAlternativo,
  subtituloAlternativo,
  palcoAlternativo,
}: {
  foco: DefinicaoFoco;
  tituloAlternativo?: string;
  subtituloAlternativo?: string;
  palcoAlternativo?: string;
}) {
  const Icon = iconeDe(foco.icone);
  const posicao = Math.max(0, FOCOS.findIndex((item) => item.id === foco.id));
  const numero = String(posicao + 1).padStart(2, "0");
  const total = String(FOCOS.length).padStart(2, "0");

  return (
    <header className="relative">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,.55fr)] lg:items-end lg:gap-10 xl:gap-14">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-brand/25 bg-brand-light px-3.5 py-2 text-xs font-semibold text-brand-dark shadow-[0_10px_30px_rgba(15,107,82,.07)] dark:bg-brand/15 dark:text-brand-mint">
              <Icon size={14} />
              {foco.label}
              <span aria-hidden className="h-1 w-1 rounded-full bg-brand/50" />
              Portugal
            </div>
            <span className="font-mono texto-micro font-bold uppercase tracking-[.16em] text-stone-400 dark:text-stone-500">
              Questão {numero} de {total}
            </span>
          </div>

          {tituloAlternativo ? (
            <h1 className="mt-5 text-balance font-display text-[clamp(2.25rem,5.1vw,4.25rem)] font-semibold leading-[1.04] tracking-[-.035em] text-ink sm:[text-wrap:pretty]">
              {tituloAlternativo}
            </h1>
          ) : (
            <TituloHero foco={foco.id} className="mt-5" escala="editorial" />
          )}
        </div>

        <div className="border-t border-stone-200 pt-5 dark:border-stone-800 lg:border-l lg:border-t-0 lg:pb-1 lg:pl-8 lg:pt-0">
          <div className="flex items-center justify-between gap-4 texto-micro font-bold uppercase tracking-[.16em] text-stone-400 dark:text-stone-500">
            <span>O instrumento</span>
            <span className="text-brand dark:text-brand-mint">
              {palcoAlternativo ?? <>{foco.palco}</>}
            </span>
          </div>
          {subtituloAlternativo ? (
            <p className="mx-0 mt-3 max-w-none text-balance text-left text-base leading-relaxed text-stone-600 sm:text-lg dark:text-stone-400">
              {subtituloAlternativo}
            </p>
          ) : (
            <SubtituloHero foco={foco.id} alinhamento="inicio" />
          )}
        </div>
      </div>

      <ReguaPerguntasHero focoAtivo={foco.id} />
    </header>
  );
}
