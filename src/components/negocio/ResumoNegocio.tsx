"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O RESUMO PEGAJOSO
//  ---------------------------------------------------------------------
//  A ÚNICA coisa fixa do estúdio, e tem de ser pequena. §11 é explícito:
//  «apenas resumo curto sticky; nunca um painel enorme fixo». Um painel
//  de 300 px colado ao topo em telemóvel come metade do ecrã — e o que
//  ele mostra deixa de ser contexto para passar a ser obstáculo.
//
//  Três números e o estado. É o que cabe em 360 px sem cortar nada e sem
//  provocar scroll horizontal.
// ═══════════════════════════════════════════════════════════════════════

import { fmt } from "@/lib/format";
import { ROTULO_CONFIANCA } from "@/lib/negocio/viabilidade";
import type { ResultadoNegocio } from "@/lib/negocio/tipos";

export default function ResumoNegocio({
  negocio,
  nome,
}: {
  negocio: ResultadoNegocio;
  nome?: string;
}) {
  if (negocio.ofertas.length === 0) return null;

  const lucro = negocio.resultadoOperacionalMes >= 0;

  return (
    <div
      // `sticky` com `top-0` e não `fixed`: dentro do fluxo, não tapa
      // conteúdo ao chegar ao fim da secção, e não precisa de compensar
      // altura no elemento seguinte.
      className="sticky top-0 z-20 -mx-1 mb-3 rounded-2xl border border-stone-100 bg-white/95 px-3 py-2 shadow-card backdrop-blur dark:border-stone-800 dark:bg-stone-900/95"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold text-stone-800 dark:text-stone-100">
          {nome?.trim() || "O teu negócio"}
        </p>
        <span className="flex-shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          {ROTULO_CONFIANCA[negocio.confianca]}
        </span>
      </div>

      <dl className="mt-1 grid grid-cols-3 gap-2">
        <div className="min-w-0">
          <dt className="text-[10px] text-stone-500 dark:text-stone-400">Receita</dt>
          <dd className="truncate text-xs font-semibold tabular-nums text-stone-800 dark:text-stone-100">
            {fmt(negocio.receitaSemIVAMes)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] text-stone-500 dark:text-stone-400">Resultado</dt>
          <dd
            className={`truncate text-xs font-semibold tabular-nums ${
              lucro ? "text-brand-dark dark:text-brand-mint" : "text-red-700 dark:text-red-400"
            }`}
          >
            {fmt(negocio.resultadoOperacionalMes)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] text-stone-500 dark:text-stone-400">Equilíbrio</dt>
          <dd className="truncate text-xs font-semibold tabular-nums text-stone-800 dark:text-stone-100">
            {negocio.breakEven.possivel ? `${negocio.breakEven.vendasMes} vendas` : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
