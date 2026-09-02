"use client";

import Link from "next/link";
import { ArrowRight } from "@/components/ui/Icons";
import SeccaoNegocio from "@/components/dashboard/SeccaoNegocio";
import ContinuarTrabalho from "@/components/dashboard/ContinuarTrabalho";
import { useTrabalhoDashboard } from "@/lib/dashboard/useTrabalhoDashboard";

export default function HubNegocio() {
  const { itens, aRetomar, falhas, carregado } = useTrabalhoDashboard();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-stone-800 sm:text-3xl dark:text-stone-100">
          Construir o negócio
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Quatro etapas, pela ordem da decisão. Não é preciso segui-la: podes entrar por qualquer uma.
        </p>
      </header>

      {!carregado ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card motion-reduce:animate-none dark:border-stone-800 dark:bg-stone-900"
            />
          ))}
        </div>
      ) : (
        <>
          <SeccaoNegocio itens={itens} />
          <ContinuarTrabalho itens={aRetomar} falhas={falhas} />
        </>
      )}

      <Link
        href="/dashboard"
        className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        Ver a visão geral <ArrowRight size={14} />
      </Link>
    </div>
  );
}
