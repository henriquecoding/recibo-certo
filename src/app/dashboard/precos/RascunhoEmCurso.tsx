"use client";

// ─────────────────────────────────────────────────────────────────────────
//  O cálculo que ficou a meio.
//
//  «Calcular», «retomar» e «comparar» pareciam três produtos diferentes: o
//  rascunho vivia no cofre e não aparecia em lado nenhum, a lista mostrava
//  só o que já tinha sido decidido, e a ferramenta pública era uma terceira
//  porta sem relação visível com as outras duas.
//
//  Este cartão é a ponte, e usa o MESMO adaptador da visão geral — não uma
//  segunda leitura do mesmo cofre, que era como as duas superfícies
//  começariam a discordar sobre o que está a meio.
// ─────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowRight } from "@/components/ui/Icons";
import DataRelativa from "@/components/dashboard/DataRelativa";
import { useTrabalhoDashboard } from "@/lib/dashboard/useTrabalhoDashboard";

export default function RascunhoEmCurso() {
  const { itens, carregado } = useTrabalhoDashboard();
  const rascunho = itens.find((i) => i.id === "preco:rascunho");
  if (!carregado || !rascunho) return null;

  return (
    <div className="mb-5 rounded-4xl border border-brand/30 bg-brand-light p-4 dark:border-brand/25 dark:bg-brand/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{rascunho.titulo}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-stone-600 dark:text-stone-300">
            <span>{rascunho.subtitulo}</span>
            <DataRelativa iso={rascunho.atualizadoEm} />
            <span className="text-stone-500 dark:text-stone-400">Neste dispositivo</span>
          </p>
        </div>
        <Link
          href={rascunho.proximaAccao.href}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          {rascunho.proximaAccao.label} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
