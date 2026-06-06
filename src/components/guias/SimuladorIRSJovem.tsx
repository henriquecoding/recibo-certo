"use client";

import { useState, useMemo } from "react";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { IRS_JOVEM, IAS_VALUE } from "@/lib/fiscal-data";
import { irsProgressivo } from "@/lib/fiscal";
import { fmt, pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";

const ANOS_DADOS = [
  { ano: 1, isencao: 1.0 },
  { ano: 2, isencao: 0.75 },
  { ano: 3, isencao: 0.75 },
  { ano: 4, isencao: 0.75 },
  { ano: 5, isencao: 0.5 },
  { ano: 6, isencao: 0.5 },
  { ano: 7, isencao: 0.5 },
  { ano: 8, isencao: 0.25 },
  { ano: 9, isencao: 0.25 },
  { ano: 10, isencao: 0.25 },
];

export function SimuladorIRSJovem() {
  const [ano, setAno] = useState(1);
  const [rendimento, setRendimento] = useState(20000);

  const { isencaoPct, teto, isencaoEuros, irsNormal, irsComJovem, poupanca } = useMemo(() => {
    const isencaoPct = IRS_JOVEM.isencaoPorAno.value[ano] ?? 0;
    const teto = IRS_JOVEM.tetoIAS.value * IAS_VALUE;
    const isencaoEuros = Math.min(rendimento * isencaoPct, teto);
    const irsNormal = irsProgressivo(rendimento);
    const irsComJovem = irsProgressivo(Math.max(0, rendimento - isencaoEuros));
    const poupanca = irsNormal - irsComJovem;
    return { isencaoPct, teto, isencaoEuros, irsNormal, irsComJovem, poupanca };
  }, [ano, rendimento]);

  return (
    <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-6 my-8">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">
        Simulador IRS Jovem
      </p>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div>
          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Ano de benefício{" "}
            <InfoTip label="Base legal IRS Jovem">{IRS_JOVEM.isencaoPorAno.legalBasis}</InfoTip>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {ANOS_DADOS.map((a) => (
              <button
                key={a.ano}
                onClick={() => setAno(a.ano)}
                className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                  ano === a.ano
                    ? "border-brand bg-brand text-white"
                    : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-500 hover:border-brand"
                }`}
              >
                {a.ano}.º
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-400">
            Isenção: {pct(ANOS_DADOS[ano - 1]?.isencao ?? 0)} · Teto: {fmt(teto)}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Rendimento coletável anual (Cat. B)
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={80000}
              step={500}
              value={rendimento}
              onChange={(e) => setRendimento(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
          </div>
          <input
            type="range"
            min={0}
            max={80000}
            step={1000}
            value={rendimento}
            onChange={(e) => setRendimento(Number(e.target.value))}
            className="w-full mt-2 accent-brand"
          />
        </div>
      </div>

      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
          <p className="text-xs text-stone-400 mb-1">Isenção</p>
          <p className="font-display text-xl font-semibold text-brand">{fmt(isencaoEuros)}</p>
          <p className="text-xs text-stone-400 mt-0.5">{pct(isencaoPct)} do rendimento</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
          <p className="text-xs text-stone-400 mb-1">IRS sem IRS Jovem</p>
          <p className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
            {fmt(irsNormal)}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
          <p className="text-xs text-stone-400 mb-1">IRS com IRS Jovem</p>
          <p className="font-display text-xl font-semibold text-brand">{fmt(irsComJovem)}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
          <p className="text-xs text-stone-400 mb-1">Poupança</p>
          <p className="font-display text-xl font-semibold text-brand">{fmt(poupanca)}</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {irsNormal > 0 ? pct(poupanca / irsNormal) : "—"} do IRS
          </p>
        </div>
      </m.div>
    </div>
  );
}
