"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Sociedade: do lucro operacional ao bolso do dono.
//  ---------------------------------------------------------------------
//  Saiu do cartão de resultado, que juntava oito coisas sem hierarquia
//  numa caixa de ~830 px. É uma secção irmã: quem vende como pessoa
//  singular nunca a vê, e quem tem uma Lda. encontra-a onde as outras
//  secções também estão.
// ═══════════════════════════════════════════════════════════════════════

import { fmt } from "@/lib/format";
import type { ConversaoSociedade } from "@/lib/pricing";
import { Info } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";

/**
 * Do lucro operacional ao que chega ao dono.
 *
 * A regra de apresentação, que vale mais do que o layout: o lucro retido
 * aparece SEMPRE ao lado do líquido pessoal, e o total é a soma dos dois.
 * Mostrar só o que passou para a conta pessoal faria uma sociedade parecer
 * pior do que é — e empurraria a pessoa para uma decisão fiscal errada.
 */
export default function Sociedade({ s }: { s: ConversaoSociedade }) {
  const linhas = [
    { rotulo: "Faturação projetada no ano", valor: s.faturacaoAnual, tom: "neutro" as const },
    { rotulo: "Despesas do negócio", valor: -s.despesasAnuais, tom: "sai" as const },
    { rotulo: "Lucro antes de IRC", valor: s.lucroTributavel, tom: "neutro" as const },
    { rotulo: "IRC, derrama e tributações autónomas", valor: -s.ircTotal, tom: "sai" as const },
  ];

  return (
    <section
      aria-label="O que chega ao dono da sociedade"
      className="mt-6 rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-800/40"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
          E disto, quanto te chega?
        </h3>
        <Badge tone="neutral">estimativa anual</Badge>
      </div>

      <dl className="space-y-1.5 text-sm">
        {linhas.map((l) => (
          <div key={l.rotulo} className="flex items-baseline justify-between gap-3">
            <dt className="min-w-0 text-stone-600 dark:text-stone-400">{l.rotulo}</dt>
            <dd
              className={`flex-shrink-0 font-semibold tabular-nums ${
                l.tom === "sai" ? "text-clay-text" : "text-stone-800 dark:text-stone-100"
              }`}
            >
              {fmt(l.valor)}
            </dd>
          </div>
        ))}
      </dl>

      {/* As DUAS medidas, sempre juntas. */}
      <div className="mt-3 grid gap-2 border-t border-stone-200 pt-3 dark:border-stone-700 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-3 dark:bg-stone-900">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
            Chega à tua conta
          </p>
          <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-stone-800 dark:text-stone-100">
            {fmt(s.liquidoPessoal)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-3 dark:bg-stone-900">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
            Fica na empresa
          </p>
          <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-stone-800 dark:text-stone-100">
            {fmt(s.lucroRetido)}
          </p>
        </div>
      </div>

      <p className="mt-2.5 rounded-xl bg-brand-light px-3 py-2.5 text-sm text-brand-dark dark:bg-brand/15 dark:text-brand-mint">
        <strong className="font-semibold">Somando os dois: {fmt(s.riquezaTotal)}.</strong> O que fica na empresa não é
        dinheiro perdido — continua a ser teu, noutro bolso.
      </p>

      <ul className="mt-2.5 space-y-1">
        {s.notas.map((n) => (
          <li key={n} className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            <span>{n}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
