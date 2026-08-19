"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Tesouraria: quanto sai, e QUANDO.
//  ---------------------------------------------------------------------
//  Saiu do cartão de resultado pela mesma razão que a sociedade: eram
//  oito coisas empilhadas numa caixa só. É aqui que a ferramenta deixa de
//  ser uma calculadora — saber que se reserva 18% de tudo é abstrato;
//  saber que a 25 de novembro saem 340 € é uma coisa que se pode fazer.
// ═══════════════════════════════════════════════════════════════════════

import { fmt } from "@/lib/format";
import type { Tesouraria as DadosTesouraria, LinhaTesouraria } from "@/lib/pricing";
import { Info, Calendar, ArrowRight } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";

/** «daqui a 12 dias», mas legível quando é hoje ou amanhã. */
function quando(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `daqui a ${dias} dias`;
}

const DATA_CURTA = { day: "numeric", month: "short" } as const;

function dataLegivel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-PT", DATA_CURTA);
}

/**
 * Quanto sai, e QUANDO.
 *
 * É aqui que a ferramenta deixa de ser uma calculadora. Saber que se
 * reserva 18% de tudo é abstrato; saber que a 25 de novembro saem 340 € é
 * uma coisa que se pode fazer. Por isso o número grande é a reserva mensal
 * — a única ação concreta — e as datas vêm a seguir como consequência.
 *
 * As linhas sem valor não são falhas: entregar a declaração não é pagar, e
 * dizê-lo evita que a pessoa reserve o dinheiro duas vezes.
 */
export default function Tesouraria({ t }: { t: DadosTesouraria }) {
  const parcelas = [
    { rotulo: "IVA", valor: t.ivaMensal },
    { rotulo: "Segurança Social", valor: t.ssMensal },
  ].filter((p) => p.valor > 0);

  return (
    <section
      aria-label="Quando sai o dinheiro"
      className="mt-6 rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-800/40"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
          <Calendar size={15} className="flex-shrink-0 text-stone-600 dark:text-stone-400" />
          E quando é que isto sai da tua conta?
        </h3>
        <Badge tone="neutral">estimativa</Badge>
      </div>

      {/* A única ação concreta: quanto pôr de lado todos os meses. */}
      <div className="rounded-xl bg-white p-3 dark:bg-stone-900">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
          Guardar por mês
        </p>
        <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-stone-800 dark:text-stone-100">
          {fmt(t.reservaMensal)}
        </p>
        {parcelas.length > 0 ? (
          <p className="mt-0.5 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            {parcelas.map((p) => `${fmt(p.valor)} de ${p.rotulo}`).join(" + ")}
          </p>
        ) : null}
      </div>

      {t.proximos.length > 0 ? (
        <ol className="mt-3 space-y-1.5">
          {t.proximos.map((l) => (
            <LinhaPrazo key={l.id} l={l} />
          ))}
        </ol>
      ) : null}

      <ul className="mt-2.5 space-y-1">
        {t.notas.map((n) => (
          <li key={n} className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            <span>{n}</span>
          </li>
        ))}
      </ul>

      <a
        href="/dashboard/prazos"
        // `py-1` leva a altura de 16 para 24 px. Não é estética: a WCAG 2.2 ·
        // 2.5.8 pede 24×24 e este link não cabe na exceção «inline» — está
        // sozinho no fim da secção, não dentro de uma frase.
        className="mt-3 inline-flex min-h-[24px] items-center gap-1.5 rounded-lg py-1 text-xs font-semibold text-brand-dark underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:text-brand-mint"
      >
        Ver o calendário completo
        <ArrowRight size={12} className="flex-shrink-0" />
      </a>
    </section>
  );
}

function LinhaPrazo({ l }: { l: LinhaTesouraria }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2 dark:bg-stone-900">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug text-stone-800 dark:text-stone-100">{l.titulo}</p>
        <p className="mt-0.5 text-[11px] leading-tight text-stone-600 dark:text-stone-400">
          <span className="font-semibold">{dataLegivel(l.data)}</span>
          <span aria-hidden="true"> · </span>
          {quando(l.diasAte)}
        </p>
        {l.porqueSemValor ? (
          <p className="mt-1 text-[11px] leading-tight text-stone-600 dark:text-stone-400">{l.porqueSemValor}</p>
        ) : null}
      </div>
      <p className="flex-shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
        {l.valor === null ? (
          <span aria-label="sem valor a pagar nesta data" className="text-stone-600 dark:text-stone-400">
            —
          </span>
        ) : (
          fmt(l.valor)
        )}
      </p>
    </li>
  );
}
