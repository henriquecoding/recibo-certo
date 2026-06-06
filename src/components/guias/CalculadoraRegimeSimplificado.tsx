"use client";

import { useState, useMemo } from "react";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import {
  REDUCAO_COEFICIENTE_ANO,
  efeitoFiscal,
  ATIVIDADES,
} from "@/lib/fiscal-data";
import type { TipoAtividade } from "@/lib/fiscal-data";
import { simularIRSAnual } from "@/lib/fiscal";
import { fmt, pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import Badge from "@/components/ui/Badge";
import ActivityCombobox from "@/components/ui/ActivityCombobox";

const ANOS = [
  { valor: 1, label: "1.º ano (-50%)" },
  { valor: 2, label: "2.º ano (-25%)" },
  { valor: 3, label: "3.º ano +" },
];

export function CalculadoraRegimeSimplificado() {
  const [atividade, setAtividade] = useState<(typeof ATIVIDADES)[0] | null>(null);
  const [bruto, setBruto] = useState(24000);
  const [anoAtiv, setAnoAtiv] = useState(3);

  const efeito = atividade ? efeitoFiscal(atividade) : null;
  const tipo: TipoAtividade = atividade?.tipo ?? "outros";

  const resultado = useMemo(() => {
    if (!atividade) return null;
    return simularIRSAnual({
      brutoAnual: bruto,
      tipo,
      anoAtividade: anoAtiv,
    });
  }, [atividade, bruto, tipo, anoAtiv]);

  const reducao = REDUCAO_COEFICIENTE_ANO.value[anoAtiv] ?? 0;
  const coefEfetivo = efeito ? efeito.coef * (1 - reducao) : null;

  return (
    <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-6 my-8">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">
        Calculadora de regime simplificado
      </p>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div>
          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Atividade
          </label>
          <ActivityCombobox
            value={atividade}
            onChange={setAtividade}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Faturação bruta anual
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={200000}
              step={500}
              value={bruto}
              onChange={(e) => setBruto(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
          </div>
          <input
            type="range"
            min={0}
            max={200000}
            step={1000}
            value={bruto}
            onChange={(e) => setBruto(Number(e.target.value))}
            className="w-full mt-2 accent-brand"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
          Ano de atividade
        </label>
        <div className="flex gap-2">
          {ANOS.map((a) => (
            <button
              key={a.valor}
              onClick={() => setAnoAtiv(a.valor)}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                anoAtiv === a.valor
                  ? "border-brand bg-brand text-white shadow-glow"
                  : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {resultado && efeito ? (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
              <p className="text-xs text-stone-400 mb-1">
                Coeficiente{" "}
                <InfoTip label="Base legal do coeficiente">{efeito.legalCoef}</InfoTip>
              </p>
              <p className="font-display text-xl font-semibold text-brand">
                {pct(coefEfetivo!)}
              </p>
              {reducao > 0 && (
                <p className="text-xs text-stone-400 mt-0.5">base {pct(efeito.coef)} −{pct(reducao)}</p>
              )}
            </div>
            <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
              <p className="text-xs text-stone-400 mb-1">Rendimento tributável</p>
              <p className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
                {fmt(resultado.rendimentoTributavel)}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {pct(resultado.rendimentoTributavel / bruto)} do bruto
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
              <p className="text-xs text-stone-400 mb-1">IRS estimado</p>
              <p className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
                {fmt(resultado.irsEstimado)}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">por ano</p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
              <p className="text-xs text-stone-400 mb-1">Taxa efetiva</p>
              <p className="font-display text-xl font-semibold text-brand">
                {pct(resultado.taxaMediaEfetiva)}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">sobre bruto</p>
            </div>
          </div>

          {efeito.coef >= 0.35 && (
            <div className="rounded-2xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 text-sm text-stone-600 dark:text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-300">Regra dos 15%: </span>
              Para coeficientes 0,75 e 0,35, é obrigatório justificar 15% da faturação em despesas de atividade.
              {bruto <= 27360 && " Para faturação até 27 360 €, a dedução automática de 4 104 € cobre este requisito."}
            </div>
          )}
        </m.div>
      ) : (
        <div className="rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 p-6 text-center text-sm text-stone-400">
          Seleciona uma atividade para ver os resultados
        </div>
      )}
    </div>
  );
}
