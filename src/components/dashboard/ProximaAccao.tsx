"use client";

// ─────────────────────────────────────────────────────────────────────────
//  «AGORA» — uma ação, não cinco a competir.
//
//  O painel tinha um CTA no cabeçalho que dependia da LENTE (recibos,
//  salário, empresa), estados vazios com botões próprios, um hub com
//  dezenas de cartões e um banner de nuvem. Cinco convites ao mesmo tempo
//  não são cinco oportunidades: são a ausência de uma decisão.
//
//  A regra de prioridade vive em `work-items/agregar.ts` e é pura. Aqui só
//  se desenha o que ela escolheu — e mede-se o MOTIVO, nunca o conteúdo.
// ─────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowRight } from "@/components/ui/Icons";
import { registar } from "@/lib/analytics/cliente";
import type { AccaoAgora } from "@/lib/dashboard/work-items/agregar";

export default function ProximaAccao({ accao }: { accao: AccaoAgora }) {
  return (
    <section
      aria-labelledby="painel-agora"
      className="rounded-4xl border border-brand/30 bg-brand-light p-5 sm:p-6 dark:border-brand/25 dark:bg-brand/10"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-dark dark:text-brand">Agora</p>
      <h2 id="painel-agora" className="mt-1 font-display text-lg font-semibold text-stone-800 sm:text-xl dark:text-stone-100">
        {accao.titulo}
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">{accao.descricao}</p>
      <Link
        href={accao.href}
        onClick={() => registar("dashboard_next_action_clicked", { reason: accao.motivo })}
        className="btn-shine mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float motion-reduce:transition-none"
      >
        {accao.label}
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}
