"use client";

import { type ResumoRecibos } from "@/lib/store/recibos";
import { fmt, pct } from "@/lib/format";

// Escala monocromática de verdes da marca (sem cinza nem laranja): líquido =
// verde da marca, IRS = mint claro, Seg. Social = verde profundo. `cls` →
// currentColor + classe que adapta ao modo escuro (override em globals.css);
// `color` → hex fixo (o mint é legível nos dois temas).
const SEG: { key: "liquido" | "retencao" | "segSocial"; label: string; color?: string; cls?: string }[] = [
  { key: "liquido", label: "Teu", cls: "text-brand" },
  { key: "retencao", label: "Retenção IRS", color: "#9FE1CB" },
  { key: "segSocial", label: "Seg. Social", cls: "text-brand-deep" },
];

// Donut de distribuição do recibo: para onde vai o que faturaste no mês.
// O IVA fica de fora (é do Estado, pass-through) — coerente com o resto do produto.
export default function DistribuicaoDonut({ resumo }: { resumo: ResumoRecibos }) {
  const real = resumo.liquido + resumo.retencao + resumo.segSocial;
  const vazio = real <= 0;
  const base = real || 1;
  const r = 52;
  const C = 2 * Math.PI * r;

  let acc = 0;
  const arcs = SEG.map((s) => {
    const v = resumo[s.key];
    const len = (v / base) * C;
    const arc = { ...s, value: v, len, offset: -acc };
    acc += len;
    return arc;
  });
  const teuPct = resumo.liquido / base;

  return (
    <div className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
      <h2 className="mb-4 text-sm font-semibold text-stone-700">Distribuição do mês</h2>
      <div className="flex flex-1 items-center gap-5">
        <div className="relative flex-shrink-0">
          <svg width="132" height="132" viewBox="0 0 132 132">
            <circle cx="66" cy="66" r={r} fill="none" stroke="currentColor" className="text-stone-100" strokeWidth="16" />
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx="66"
                cy="66"
                r={r}
                fill="none"
                // Segmentos temáticos (líquido, Seg. Social) usam currentColor +
                // classe text-brand* para acompanhar os tons no modo escuro; o
                // mint do IRS mantém o hex.
                className={a.cls}
                stroke={a.cls ? "currentColor" : a.color}
                strokeWidth="16"
                strokeLinecap="butt"
                strokeDasharray={`${a.len} ${C - a.len}`}
                strokeDashoffset={a.offset}
                transform="rotate(-90 66 66)"
                style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1)" }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-semibold text-brand tabular-nums">{vazio ? "—" : pct(teuPct)}</span>
            <span className="text-[11px] text-stone-400">{vazio ? "sem dados" : "é teu"}</span>
          </div>
        </div>

        <ul className="min-w-0 flex-1 space-y-2.5">
          {arcs.map((a) => (
            <li key={a.key} className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${a.cls ?? ""}`}
                style={{ background: a.cls ? "currentColor" : a.color }}
              />
              <span className="min-w-0 flex-1 truncate text-xs text-stone-500">{a.label}</span>
              <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-stone-700">{fmt(a.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
