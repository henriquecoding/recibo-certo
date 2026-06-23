"use client";

// Visualizações executivas do simulador de IRS — SVG puro, sem dependências
// externas. Donut da distribuição de rendimentos + barra "para onde vai".
// Respeita dark mode (currentColor / tons da marca) e não usa animações infinitas.

import { fmt, pct } from "@/lib/format";
import type { ComponenteCategoria } from "@/lib/fiscal";

// Tons da marca (do mais escuro ao mais claro) para segmentar categorias.
const PALETA = ["#0F6E56", "#1D9E75", "#3FBF92", "#6FD2AE", "#9CE0C8", "#C7EEDF"];

function arco(cx: number, cy: number, r: number, ini: number, fim: number): string {
  const p0 = [cx + r * Math.cos(ini), cy + r * Math.sin(ini)];
  const p1 = [cx + r * Math.cos(fim), cy + r * Math.sin(fim)];
  const grande = fim - ini > Math.PI ? 1 : 0;
  return `M ${p0[0]} ${p0[1]} A ${r} ${r} 0 ${grande} 1 ${p1[0]} ${p1[1]}`;
}

/** Donut da distribuição dos rendimentos brutos por categoria. */
export function DistribuicaoRendimento({ componentes }: { componentes: ComponenteCategoria[] }) {
  const dados = componentes.filter((c) => c.bruto > 0);
  const total = dados.reduce((s, c) => s + c.bruto, 0);
  if (total <= 0 || dados.length === 0) return null;

  const size = 132;
  const cx = size / 2;
  const cy = size / 2;
  const r = 54;
  let angulo = -Math.PI / 2;
  const segmentos = dados.map((c, i) => {
    const fracao = c.bruto / total;
    const ini = angulo;
    const fim = angulo + fracao * Math.PI * 2;
    angulo = fim;
    return { c, cor: PALETA[i % PALETA.length], ini, fim, fracao };
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribuição dos rendimentos por categoria" className="flex-shrink-0">
        {segmentos.map((s, i) =>
          s.fracao >= 0.999 ? (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.cor} strokeWidth={16} />
          ) : (
            <path key={i} d={arco(cx, cy, r, s.ini, s.fim)} fill="none" stroke={s.cor} strokeWidth={16} strokeLinecap="butt" />
          )
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-stone-400 text-[9px]">Total</text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-stone-700 text-[11px] font-semibold dark:fill-stone-200">{fmt(total)}</text>
      </svg>
      <ul className="w-full space-y-1.5">
        {segmentos.map((s, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: s.cor }} />
              <span className="truncate text-stone-600 dark:text-stone-300">{s.c.rotulo}</span>
            </span>
            <span className="flex-shrink-0 font-semibold tabular-nums text-stone-700 dark:text-stone-200">{pct(s.fracao)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barra "para onde vai o teu dinheiro": IRS, Segurança Social e líquido. */
export function DistribuicaoFiscal({
  rendimentoGlobal,
  irsTotal,
  ssAnual,
}: {
  rendimentoGlobal: number;
  irsTotal: number;
  ssAnual: number;
}) {
  if (rendimentoGlobal <= 0) return null;
  const liquido = Math.max(0, rendimentoGlobal - irsTotal - ssAnual);
  const partes = [
    { rotulo: "Líquido para ti", valor: liquido, cor: "#1D9E75" },
    { rotulo: "IRS", valor: irsTotal, cor: "#C99A2E" },
    { rotulo: "Segurança Social", valor: ssAnual, cor: "#7A8A99" },
  ].filter((p) => p.valor > 0);
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1;

  return (
    <div>
      <div className="flex h-3.5 w-full overflow-hidden rounded-full">
        {partes.map((p, i) => (
          <div key={i} style={{ width: `${(p.valor / total) * 100}%`, backgroundColor: p.cor }} className="h-full" />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {partes.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: p.cor }} />
            <span className="text-stone-600 dark:text-stone-300">{p.rotulo}</span>
            <span className="ml-auto font-semibold tabular-nums text-stone-700 dark:text-stone-200">{fmt(p.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
