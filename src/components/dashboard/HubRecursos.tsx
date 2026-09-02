// ═══════════════════════════════════════════════════════════════════════
//  EXPLORAR — uma porta, e já não um catálogo inline.
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ ISTO ERA UMA GRELHA DE DEZENAS DE CARTÕES, NO FIM DE UMA PÁGINA      │
//  │ MUITO LONGA — E DUPLICAVA A SIDEBAR INTEIRA                          │
//  │                                                                     │
//  │ Havia duas coisas erradas ao mesmo tempo:                            │
//  │                                                                     │
//  │  1. A LISTA ERA A ERRADA. Chamava `agruparPorObjetivo()` sem         │
//  │     argumento, e o valor por omissão é a superfície `hub` — a        │
//  │     pública. O catálogo tem uma superfície `dashboard` e ela nunca   │
//  │     era lida. O tipo prometia uma fonte única; o consumo criava uma  │
//  │     segunda regra implícita.                                         │
//  │                                                                     │
//  │  2. O SÍTIO ERA O ERRADO. Depois da reestruturação da navegação,     │
//  │     TODAS as ferramentas do painel têm destino na sidebar — nos      │
//  │     grupos «Simular e decidir» e «Apoio e verificação». Repetir a    │
//  │     lista inteira no fim da visão geral não acrescentava um caminho: │
//  │     acrescentava altura, e empurrava para baixo a única coisa que a  │
//  │     página tinha de dizer primeiro.                                  │
//  │                                                                     │
//  │ Fica a porta. A contagem DERIVA da superfície do painel, para não    │
//  │ voltar a haver um número escrito à mão que envelhece sozinho.        │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { ArrowRight, BookOpen, Briefcase, Trophy } from "@/components/ui/Icons";
import { FERRAMENTAS_DO_PAINEL, TOTAL_FERRAMENTAS } from "@/lib/ferramentas";

const PORTAS = [
  {
    href: "/ferramentas",
    titulo: "Todas as ferramentas",
    desc: `${TOTAL_FERRAMENTAS} simuladores, calculadoras e decisores — ${FERRAMENTAS_DO_PAINEL.length} deles com casa no painel.`,
    Icon: Briefcase,
  },
  {
    href: "/guias",
    titulo: "Guias fiscais",
    desc: "Passo a passo para cada obrigação, com base legal.",
    Icon: BookOpen,
  },
  {
    href: "/quiz-fiscal",
    titulo: "Quiz Fiscal",
    desc: "Testa o que sabes, com a fonte de cada resposta.",
    Icon: Trophy,
  },
];

export default function HubRecursos() {
  return (
    <section aria-labelledby="hub-recursos">
      <h2 id="hub-recursos" className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
        Explorar
      </h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Os simuladores do dia a dia estão na navegação, à esquerda. Isto é o resto.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PORTAS.map(({ href, titulo, desc, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-3 rounded-2xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift motion-reduce:transform-none motion-reduce:transition-none dark:border-stone-800 dark:bg-stone-900"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white">
              <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-stone-800 dark:text-stone-100">
                {titulo}
                <ArrowRight
                  size={13}
                  className="flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand motion-reduce:transition-none"
                />
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">{desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
