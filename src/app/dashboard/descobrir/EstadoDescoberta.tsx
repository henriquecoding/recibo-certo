"use client";

// ─────────────────────────────────────────────────────────────────────────
//  A faixa de continuidade do workspace Descobrir.
//
//  Diz três coisas antes de o motor sequer montar: o que já existe, quando
//  foi, e para onde se segue. É a diferença entre abrir uma ferramenta e
//  voltar a um trabalho.
//
//  Lê pelos ADAPTADORES, não pelo motor: esta faixa desenha-se antes de o
//  chunk pesado chegar, e não pode depender dele.
// ─────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowRight } from "@/components/ui/Icons";
import DataRelativa from "@/components/dashboard/DataRelativa";
import { useTrabalhoDashboard } from "@/lib/dashboard/useTrabalhoDashboard";
import { ROTULO_ESTADO } from "@/lib/dashboard/work-items/tipos";

export default function EstadoDescoberta() {
  const { itens, carregado } = useTrabalhoDashboard();
  const meus = itens.filter((i) => i.tipo === "descoberta");
  if (!carregado || meus.length === 0) return null;

  const perfil = meus.find((i) => i.id === "descoberta:perfil");
  const hipoteses = meus.filter((i) => i.id.startsWith("descoberta:hipotese:"));

  return (
    <section
      aria-label="O teu trabalho em Descobrir"
      className="mb-6 rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">O que já tens aqui</h2>
        <span className="text-xs text-stone-500 dark:text-stone-400">Neste dispositivo</span>
      </div>

      <ul className="mt-3 space-y-2">
        {perfil && (
          <li className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600 dark:text-stone-300">
            <span className="font-medium text-stone-800 dark:text-stone-100">{perfil.titulo}</span>
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              {ROTULO_ESTADO[perfil.estado]}
            </span>
            <DataRelativa iso={perfil.atualizadoEm} />
          </li>
        )}
        {hipoteses.length > 0 && (
          <li className="text-sm text-stone-600 dark:text-stone-300">
            {hipoteses.length === 1
              ? "1 hipótese em teste, com as provas que registaste."
              : `${hipoteses.length} hipóteses em teste, com as provas que registaste.`}
          </li>
        )}
      </ul>

      {/* As transições do arco. A hipótese passa o TIPO de oferta e a
          unidade; os custos e o preço continuam a ser pedidos pelo motor
          canónico — nunca copiados daqui (§10.4). */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/dashboard/precos/novo"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-brand-light px-3.5 py-2 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand hover:text-white dark:bg-brand/10 dark:text-brand"
        >
          Formar preço <ArrowRight size={13} />
        </Link>
        <Link
          href="/dashboard/negocio"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-semibold text-stone-600 transition-colors hover:border-brand/40 hover:text-brand dark:border-stone-700 dark:text-stone-300"
        >
          Criar projeto <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  );
}
