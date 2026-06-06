"use client";

import { useState, useMemo } from "react";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import {
  SS_TAXA,
  SS_COEFICIENTE,
  SS_BASE_MAX_MENSAL,
  SS_MIN_MENSAL,
  IAS_VALUE,
} from "@/lib/fiscal-data";
import { gerarPrazos } from "@/lib/prazos";
import { fmt, pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";

export function CalculadoraSSTrimestral() {
  const [mes1, setMes1] = useState(2000);
  const [mes2, setMes2] = useState(2000);
  const [mes3, setMes3] = useState(2000);
  const [baseSS, setBaseSS] = useState<"servicos" | "bens">("servicos");

  const { media, base, baseClamp, contribuicao, contribuicaoTrimestral } = useMemo(() => {
    const media = (mes1 + mes2 + mes3) / 3;
    const coef = SS_COEFICIENTE[baseSS].value;
    const base = media * coef;
    const baseClamp = Math.min(base, SS_BASE_MAX_MENSAL.value);
    const contribuicao = Math.max(baseClamp * SS_TAXA.value, SS_MIN_MENSAL.value);
    return { media, base, baseClamp, contribuicao, contribuicaoTrimestral: contribuicao * 3 };
  }, [mes1, mes2, mes3, baseSS]);

  const proximoPrazo = useMemo(() => {
    const ano = new Date().getFullYear();
    const prazos = gerarPrazos(ano).filter((p) => p.categoria === "ss" && p.id.includes("decl"));
    const agora = new Date();
    return prazos.find((p) => new Date(p.data) >= agora) ?? prazos[0];
  }, []);

  const isMaxCap = base > SS_BASE_MAX_MENSAL.value;
  const isMin = base * SS_TAXA.value < SS_MIN_MENSAL.value;

  return (
    <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-6 my-8">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">
        Calculadora de Segurança Social trimestral
      </p>

      <div className="mb-5">
        <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
          Tipo de atividade{" "}
          <InfoTip label="Base de incidência SS">{SS_COEFICIENTE.servicos.legalBasis}</InfoTip>
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setBaseSS("servicos")}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
              baseSS === "servicos"
                ? "border-brand bg-brand text-white shadow-glow"
                : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand"
            }`}
          >
            Prestação de serviços (70%)
          </button>
          <button
            onClick={() => setBaseSS("bens")}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
              baseSS === "bens"
                ? "border-brand bg-brand text-white shadow-glow"
                : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand"
            }`}
          >
            Bens / hotelaria / restauração (20%)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Mês 1", value: mes1, set: setMes1 },
          { label: "Mês 2", value: mes2, set: setMes2 },
          { label: "Mês 3", value: mes3, set: setMes3 },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
              {label}
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={20000}
                step={100}
                value={value}
                onChange={(e) => set(Number(e.target.value))}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
            </div>
          </div>
        ))}
      </div>

      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4"
      >
        <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
          <p className="text-xs text-stone-400 mb-1">
            Base de incidência{" "}
            <InfoTip label="Cálculo da base">{`(${fmt(media)}/mês) × ${pct(SS_COEFICIENTE[baseSS].value)}`}</InfoTip>
          </p>
          <p className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
            {fmt(baseClamp)}
            {isMaxCap && <span className="text-xs text-stone-400 ml-1">(teto)</span>}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">por mês</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
          <p className="text-xs text-stone-400 mb-1">
            Contribuição mensal{" "}
            <InfoTip label="Taxa SS">{SS_TAXA.legalBasis}</InfoTip>
          </p>
          <p className="font-display text-xl font-semibold text-brand">
            {fmt(contribuicao)}
            {isMin && <span className="text-xs text-stone-400 ml-1">(mín)</span>}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">{pct(SS_TAXA.value)} sobre a base</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-stone-400 mb-1">Total trimestral</p>
          <p className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
            {fmt(contribuicaoTrimestral)}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">próximos 3 meses</p>
        </div>
      </m.div>

      {proximoPrazo && (
        <div className="rounded-2xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-stone-600 dark:text-stone-400">Próxima declaração trimestral</span>
          <span className="font-semibold text-brand">
            {new Date(proximoPrazo.data + "T00:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}
          </span>
        </div>
      )}
    </div>
  );
}
