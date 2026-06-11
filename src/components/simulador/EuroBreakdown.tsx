"use client";

import { m } from "motion/react";
import { fmt, pct } from "@/lib/format";

interface EuroBreakdownProps {
  faturacao: number; // total faturado
  liquido: number; // disponível para gastar
  irs: number; // imposto IRS
  ss: number; // segurança social
  iva: number; // IVA (0 se isento)
  className?: string;
  compact?: boolean; // força 2 colunas (para containers estreitos como o painel lateral)
}

interface Segmento {
  id: string;
  label: string;
  valor: number;
  cor: string; // classe Tailwind de fundo
  dot: string; // classe Tailwind do ponto da legenda
}

/**
 * Visualização proporcional de como cada euro faturado se divide entre o que
 * fica para o trabalhador, Segurança Social, IRS e IVA.
 */
export default function EuroBreakdown({
  faturacao,
  liquido,
  irs,
  ss,
  iva,
  className = "",
  compact = false,
}: EuroBreakdownProps) {
  const total = Math.max(faturacao, liquido + irs + ss + iva, 1);

  const segmentos: Segmento[] = [
    {
      id: "liquido",
      label: "Para ti",
      valor: Math.max(0, liquido),
      cor: "bg-brand",
      dot: "bg-brand",
    },
    {
      id: "ss",
      label: "Seg. Social",
      valor: Math.max(0, ss),
      cor: "bg-amber-400",
      dot: "bg-amber-400",
    },
    {
      id: "irs",
      label: "IRS",
      valor: Math.max(0, irs),
      cor: "bg-red-400",
      dot: "bg-red-400",
    },
    ...(iva > 0
      ? [
          {
            id: "iva",
            label: "IVA",
            valor: iva,
            cor: "bg-stone-300",
            dot: "bg-stone-300",
          },
        ]
      : []),
  ].filter((s) => s.valor > 0);

  return (
    <div className={className}>
      {/* Barra proporcional */}
      <div
        className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label="Distribuição do valor faturado"
      >
        {segmentos.map((s, i) => {
          const w = (s.valor / total) * 100;
          return (
            <m.div
              key={s.id}
              className={`h-full ${s.cor} ${
                i === 0 ? "rounded-l-full" : ""
              } ${i === segmentos.length - 1 ? "rounded-r-full" : ""}`}
              style={{ minWidth: 8 }}
              initial={{ width: 0 }}
              animate={{ width: `${w}%` }}
              transition={{
                duration: 0.5,
                delay: i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          );
        })}
      </div>

      {/* Legenda em 2 colunas (mobile) → linha (ou sempre 2 em modo compacto) */}
      <dl className={`mt-3 grid gap-x-5 gap-y-2.5 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        {segmentos.map((s) => {
          const p = s.valor / total;
          return (
            <div key={s.id} className="flex items-start gap-2 overflow-hidden">
              <span
                className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${s.dot}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">
                  {s.label}
                </dt>
                <dd className="truncate text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                  {fmt(s.valor)}
                </dd>
                <dd className="text-[11px] tabular-nums text-stone-400">
                  {pct(p)}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
