"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O RESUMO FIXO — o número não pode sair do ecrã
//  ---------------------------------------------------------------------
//  O cartão de resultado tem ~830 px de altura, e é por isso que o
//  `sticky` foi (com razão) retirado dele: uma coluna pegajosa mais alta
//  do que a janela fica presa com o fundo cortado, e dar-lhe scroll
//  próprio transforma metade do ecrã num painel que rouba a roda do rato.
//
//  Mas a conclusão certa daí não é «o número pode sair do ecrã». É que o
//  que fica fixo tem de ser PEQUENO. Esta barra tem 56 px e mostra as
//  quatro coisas que a pessoa está a tentar mexer: quanto cobra, quanto
//  isso é sem IVA, que margem dá e quanto lhe fica. Enquanto se preenche
//  um bloco de custos fixos, quatro ecrãs abaixo, continuam à vista.
//
//  Uma só coisa fixa na página, de propósito: duas barras coladas ao topo
//  competem entre si e comem o ecrã de um telemóvel.
// ═══════════════════════════════════════════════════════════════════════

import { fmt, pct } from "@/lib/format";
import type { EstadoPreenchimento, ResultadoPreco } from "@/lib/pricing";

export default function ResumoPreco({
  resultado,
  estado,
}: {
  resultado: ResultadoPreco;
  estado: EstadoPreenchimento;
}) {
  if (!resultado.ok) return null;

  const prejuizo = resultado.margem.lucroUnidade < 0;

  return (
    // `top-14` / `sm:top-[72px]` são a altura do cabeçalho do site — os
    // mesmos valores da barra de filtros dos guias e da lateral do quiz.
    // Um valor inventado aqui punha a barra por baixo da navegação em
    // metade das larguras.
    <div
      className="sticky top-14 z-20 -mx-1 mb-1 rounded-2xl border border-stone-200 bg-white/95 px-3 py-2 shadow-card backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-stone-700 dark:bg-stone-900/95 supports-[backdrop-filter]:dark:bg-stone-900/85 sm:top-[72px]"
      aria-label="Resumo do preço"
    >
      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex min-w-0 items-baseline gap-2">
          <span
            className={`font-display text-lg font-semibold tabular-nums ${
              estado === "exemplo" ? "text-stone-500 dark:text-stone-400" : "text-ink dark:text-stone-50"
            }`}
          >
            {fmt(resultado.pvp)}
          </span>
          <span className="whitespace-nowrap text-[11px] text-stone-500 dark:text-stone-400">
            {resultado.taxaIVA > 0 ? `com IVA · ${fmt(resultado.precoLiquido)} sem` : "isento de IVA"}
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          <Par rotulo="margem" valor={pct(resultado.margem.margem)} alerta={resultado.margem.margem < 0} />
          <Par
            rotulo={prejuizo ? "perdes" : "fica-te"}
            valor={fmt(Math.abs(resultado.margem.lucroUnidade))}
            alerta={prejuizo}
          />
          {estado !== "completo" ? (
            <span className="hidden whitespace-nowrap rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600 dark:bg-stone-800 dark:text-stone-400 sm:inline">
              {estado === "exemplo" ? "exemplo" : "estimativa"}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Par({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <span className="flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-[10px] uppercase tracking-wide text-stone-500 dark:text-stone-400">{rotulo}</span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          alerta ? "text-red-600 dark:text-red-400" : "text-stone-800 dark:text-stone-100"
        }`}
      >
        {valor}
      </span>
    </span>
  );
}
