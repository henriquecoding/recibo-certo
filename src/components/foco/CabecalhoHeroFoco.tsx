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

export default function CabecalhoHeroFoco({ foco }: { foco: DefinicaoFoco }) {
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
            <span className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-stone-400 dark:text-stone-500">
              Questão {numero} de {total}
            </span>
          </div>

          <TituloHero foco={foco.id} className="mt-5" escala="editorial" />
        </div>

        <div className="border-t border-stone-200 pt-5 dark:border-stone-800 lg:border-l lg:border-t-0 lg:pb-1 lg:pl-8 lg:pt-0">
          <div className="flex items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-[.16em] text-stone-400 dark:text-stone-500">
            <span>O instrumento</span>
            <span className="text-brand dark:text-brand-mint">{foco.palco}</span>
          </div>
          <SubtituloHero foco={foco.id} alinhamento="inicio" />
        </div>
      </div>

      <ReguaPerguntasHero focoAtivo={foco.id} />
    </header>
  );
}
