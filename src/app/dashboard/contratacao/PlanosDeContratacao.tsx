"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Os planos de contratação já guardados.
//
//  Uma contratação não se decide numa sessão: compara-se um orçamento com
//  outro, volta-se dali a uma semana, muda-se o pacote. Sem uma lista à
//  entrada, cada regresso começava do zero — e o cenário guardado só
//  existia dentro de «Os meus cenários», misturado com simulações de IRS.
//
//  Duas contratações NÃO se deduplicam, ao contrário do projeto de
//  negócio: dois planos são duas decisões diferentes, mesmo que tenham
//  nascido no mesmo sítio.
// ─────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowRight } from "@/components/ui/Icons";
import DataRelativa from "@/components/dashboard/DataRelativa";
import { useTrabalhoDashboard } from "@/lib/dashboard/useTrabalhoDashboard";

export default function PlanosDeContratacao() {
  const { itens, carregado, naNuvem } = useTrabalhoDashboard();
  const planos = itens.filter((i) => i.tipo === "contratacao");
  if (!carregado || planos.length === 0) return null;

  return (
    <section
      aria-labelledby="planos-contratacao"
      className="mb-6 rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="planos-contratacao" className="text-sm font-semibold text-stone-800 dark:text-stone-100">
          Planos que já guardaste
        </h2>
        <span className="text-xs text-stone-500 dark:text-stone-400">
          {naNuvem ? "Na tua conta" : "Neste dispositivo"}
        </span>
      </div>

      <ul className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
        {planos.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-stone-800 dark:text-stone-100">{p.titulo}</p>
              <DataRelativa iso={p.atualizadoEm} />
            </div>
            <Link
              href={p.proximaAccao.href}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand-light dark:hover:bg-brand/10"
            >
              {p.proximaAccao.label} <ArrowRight size={12} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
