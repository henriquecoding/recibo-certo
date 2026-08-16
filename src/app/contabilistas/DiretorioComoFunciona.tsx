// ═══════════════════════════════════════════════════════════════════════
//  COMO FUNCIONA — a mesma informação, noutro lugar
//  ---------------------------------------------------------------------
//  Isto ocupava a primeira dobra da página em quatro cartões, e empurrava
//  a lista de contabilistas para baixo do ecrã. A informação não se perde:
//  desce para depois dos resultados, encolhe para quatro passos e passa a
//  ser lida por quem já viu quem existe e quer saber o que acontece a
//  seguir (§47).
//
//  A frase sobre privacidade é a que mais importa e por isso é a única em
//  destaque. Diz o que o código garante e nada mais: partilhar é um ato
//  explícito, uma simulação de cada vez, e nenhum passo desta página
//  exige plano pago — `PARTILHA_NUNCA_EXIGE_PLUS`, em `vinculo.ts`,
//  mantém isso verdadeiro e está coberto por teste (§48, §90).
// ═══════════════════════════════════════════════════════════════════════

import { Lock } from "@/components/ui/Icons";

const PASSOS = [
  {
    titulo: "Escolhe",
    texto: "Compara áreas de trabalho, localização e forma de atendimento.",
  },
  {
    titulo: "Pede vínculo",
    texto: "O contabilista aceita — ou não — antes de existir qualquer relação.",
  },
  {
    titulo: "Partilha quando quiseres",
    texto: "Envias as simulações que escolheres, uma de cada vez, e podes revogar.",
  },
  {
    titulo: "Marca consulta",
    texto: "Escolhes um horário livre e a modalidade, online ou presencial.",
  },
] as const;

export default function DiretorioComoFunciona() {
  return (
    <section aria-labelledby="como-funciona" className="rounded-4xl border border-stone-200 bg-white/70 p-5 shadow-card sm:p-6 dark:border-stone-800 dark:bg-stone-900/60">
      <h2 id="como-funciona" className="font-display text-xl text-ink dark:text-stone-50">
        Como funciona
      </h2>

      <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PASSOS.map((p, i) => (
          <li
            key={p.titulo}
            className="rounded-3xl border border-stone-100 bg-cream/60 p-4 dark:border-stone-800 dark:bg-stone-950/40"
          >
            <span
              aria-hidden
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-light text-xs font-bold text-brand-dark dark:bg-brand/20 dark:text-brand-mint"
            >
              {i + 1}
            </span>
            <h3 className="mt-2.5 text-sm font-semibold text-stone-800 dark:text-stone-100">
              {p.titulo}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              {p.texto}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        <Lock size={15} className="mt-0.5 shrink-0 text-stone-400 dark:text-stone-500" aria-hidden />
        Ligares-te a um contabilista não lhe dá acesso aos teus dados fiscais. Ele vê o
        que lhe enviares, um envio de cada vez, e podes retirar-lhe o acesso depois.
        Nada disto — vínculo, partilha ou marcação — exige plano pago.
      </p>
    </section>
  );
}
