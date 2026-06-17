"use client";

import { useState, useMemo } from "react";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { compararCategorias } from "@/lib/fiscal-dependente";
import { fmt, pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";

const DEPENDENTES = [0, 1, 2, 3, 4];

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
const soDecimal = (s: string) => s.replace(/[^\d.,]/g, "");
const soInteiro = (s: string) => s.replace(/\D/g, "").slice(0, 2);

type Chave = "dependente" | "freelancer" | "empresa";

const CARTOES: { chave: Chave; titulo: string; sub: string }[] = [
  { chave: "dependente", titulo: "Por conta de outrem", sub: "Categoria A · salário 14 meses" },
  { chave: "freelancer", titulo: "Recibos verdes", sub: "Categoria B · regime simplificado" },
  { chave: "empresa", titulo: "Empresa", sub: "Sociedade · IRC + dividendos" },
];

export function ComparadorCategorias() {
  const [brutoStr, setBrutoStr] = useState("30000");
  const [dependentes, setDependentes] = useState(0);
  const [despesasStr, setDespesasStr] = useState("");

  const bruto = num(brutoStr);
  const despesas = num(despesasStr);

  const r = useMemo(
    () => compararCategorias({ brutoAnual: bruto, dependentes, despesas }),
    [bruto, dependentes, despesas]
  );

  const liquidos: Record<Chave, number> = {
    dependente: r.dependente.liquido,
    freelancer: r.freelancer.liquido,
    empresa: r.empresa.liquido,
  };
  const maxLiquido = Math.max(...Object.values(liquidos), 1);

  return (
    <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-6 my-8">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">
        Comparador: por conta de outrem vs. recibos verdes vs. empresa
      </p>

      {/* Inputs */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div>
          <label htmlFor="cc-bruto" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Rendimento anual ilíquido
          </label>
          <div className="relative">
            <input
              id="cc-bruto"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={brutoStr}
              onChange={(e) => setBrutoStr(soDecimal(e.target.value))}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€/ano</span>
          </div>
        </div>

        <div>
          <label htmlFor="cc-despesas" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Despesas de atividade{" "}
            <InfoTip label="Só recibos verdes e empresa">
              Despesas documentadas da atividade. Aplicam-se ao cenário de recibos verdes e ao da
              empresa; um trabalhador por conta de outrem não as deduz.
            </InfoTip>
          </label>
          <div className="relative">
            <input
              id="cc-despesas"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={despesasStr}
              onChange={(e) => setDespesasStr(soDecimal(e.target.value))}
              placeholder="0"
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€/ano</span>
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Dependentes{" "}
            <InfoTip label="Categoria A">Afeta a retenção de IRS do cenário por conta de outrem.</InfoTip>
          </span>
          <div className="flex gap-1.5" role="group" aria-label="Número de dependentes">
            {DEPENDENTES.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={dependentes === d}
                onClick={() => setDependentes(d)}
                className={`flex-1 rounded-xl border px-2 py-2.5 text-sm font-semibold transition-all ${
                  dependentes === d
                    ? "border-brand bg-brand text-white shadow-glow"
                    : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand"
                }`}
              >
                {d === 4 ? "4+" : d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className="grid gap-3 sm:grid-cols-3">
        {CARTOES.map((c) => {
          const liquido = liquidos[c.chave];
          const melhor = r.melhor === c.chave;
          const taxaEfetiva = bruto > 0 ? (bruto - liquido) / bruto : 0;
          return (
            <m.div
              key={c.chave}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className={`relative rounded-2xl border p-5 ${
                melhor
                  ? "border-brand/40 bg-brand/8 dark:bg-brand/10"
                  : "border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800"
              }`}
            >
              {melhor && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Mais líquido
                </span>
              )}
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{c.titulo}</p>
              <p className="text-xs text-stone-400 mb-3">{c.sub}</p>
              <p className={`font-display text-2xl font-semibold tabular-nums ${melhor ? "text-brand" : "text-stone-800 dark:text-stone-100"}`}>
                {fmt(liquido)}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">líquido/ano · {pct(taxaEfetiva)} de carga</p>
              {/* Barra relativa */}
              <div className="mt-3 h-1.5 w-full rounded-full bg-stone-100 dark:bg-stone-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${melhor ? "bg-brand" : "bg-stone-300 dark:bg-stone-600"}`}
                  style={{ width: `${Math.max(0, Math.min(100, (liquido / maxLiquido) * 100))}%` }}
                />
              </div>
            </m.div>
          );
        })}
      </div>

      <p className="text-xs text-stone-400 leading-relaxed pt-4">
        Estimativa de ordem de grandeza para o mesmo rendimento anual ilíquido. A Categoria A assume
        salário em 14 meses (sem subsídio de refeição); os recibos verdes usam o regime simplificado
        (atividade de serviços); a empresa modela IRC PME + dividendos, sem salário/SS do gerente nem
        tributação autónoma. Não substitui aconselhamento de um contabilista.
      </p>
    </div>
  );
}
