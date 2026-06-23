"use client";

import { useEffect, useState } from "react";
import { m } from "motion/react";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { fmt, pct } from "@/lib/format";
import { Sparkle, Check } from "@/components/ui/Icons";

// Demo "ao vivo" do resultado do Simulador de IRS — uma pré-visualização
// animada para o hero da página. Alterna entre dois cenários de exemplo para
// dar a sensação de cálculo em tempo real. Apenas ilustrativo.
const CENARIOS = [
  { reembolso: true, valor: 1240, rendimento: 28500, irs: 3120, taxa: 0.109 },
  { reembolso: false, valor: 860, rendimento: 41200, irs: 7480, taxa: 0.181 },
];

export default function DemoIRS() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % CENARIOS.length), 3600);
    return () => clearInterval(t);
  }, []);
  const c = CENARIOS[i];
  const pctTeu = Math.round((1 - c.taxa) * 100);

  return (
    <div className="relative w-full max-w-md">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative overflow-hidden rounded-4xl border border-stone-100 bg-white p-6 shadow-float dark:border-stone-800 dark:bg-stone-900">
        {/* Badge demo */}
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-light px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-dark dark:bg-brand/10 dark:text-brand">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
            Demo ao vivo
          </span>
          <span className="text-[11px] font-medium text-stone-400">Exemplo</span>
        </div>

        {/* Métrica principal */}
        <m.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="text-xs font-medium uppercase tracking-wider text-stone-400">
            {c.reembolso ? "Reembolso estimado" : "Imposto a pagar"}
          </div>
          <div className={`mt-1 font-display text-4xl font-semibold tabular-nums ${c.reembolso ? "text-brand" : "text-alert-text"}`}>
            <AnimatedNumber value={c.valor} />
          </div>
        </m.div>

        {/* Barra: quanto é teu */}
        <div className="mt-5">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <m.div
              className="rounded-full bg-brand"
              initial={false}
              animate={{ width: `${pctTeu}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <div className="mt-1.5 text-[11px] text-stone-400">{pctTeu}% do rendimento fica contigo</div>
        </div>

        {/* Mini-stats */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { l: "Rendimento", v: fmt(c.rendimento) },
            { l: "IRS", v: fmt(c.irs) },
            { l: "Taxa efetiva", v: pct(c.taxa) },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-stone-100 bg-stone-50 px-3 py-2.5 dark:border-stone-800 dark:bg-stone-800/50">
              <div className="text-[10px] text-stone-400">{s.l}</div>
              <div className="mt-0.5 font-display text-sm font-semibold tabular-nums text-stone-700 dark:text-stone-200">{s.v}</div>
            </div>
          ))}
        </div>

        {/* Passos */}
        <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 dark:border-stone-800">
          {["Agregado", "Rendimentos", "Resultado"].map((p, idx) => (
            <span key={p} className="flex items-center gap-1.5 text-[11px] font-medium text-stone-400">
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${idx <= 2 ? "bg-brand text-white" : "bg-stone-200 text-stone-500"}`}>
                {idx < 2 ? <Check size={9} /> : <Sparkle size={9} />}
              </span>
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
