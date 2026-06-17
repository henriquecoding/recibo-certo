"use client";

import { useState, useMemo } from "react";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { calcularVencimento } from "@/lib/fiscal-dependente";
import { SS_DEPENDENTE, SUBSIDIO_REFEICAO } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";

const DEPENDENTES = [0, 1, 2, 3, 4];

export function SimuladorVencimento() {
  const [bruto, setBruto] = useState(1500);
  const [dependentes, setDependentes] = useState(0);
  const [temSubsidio, setTemSubsidio] = useState(true);
  const [subsidioDia, setSubsidioDia] = useState(6);
  const [cartao, setCartao] = useState(true);
  const [diasUteis, setDiasUteis] = useState(22);

  const r = useMemo(
    () =>
      calcularVencimento({
        salarioBruto: bruto,
        dependentes,
        subsidioRefeicaoDia: temSubsidio ? subsidioDia : 0,
        subsidioRefeicaoCartao: cartao,
        diasUteis,
      }),
    [bruto, dependentes, temSubsidio, subsidioDia, cartao, diasUteis]
  );

  const limiteSubsidio = cartao ? SUBSIDIO_REFEICAO.cartao.value : SUBSIDIO_REFEICAO.dinheiro.value;
  const subsidioExcede = temSubsidio && subsidioDia > limiteSubsidio;

  return (
    <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-6 my-8">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">
        Simulador de recibo de vencimento
      </p>

      {/* Inputs */}
      <div className="grid gap-4 sm:grid-cols-2 mb-5">
        <div>
          <label htmlFor="bruto" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Salário bruto mensal
          </label>
          <div className="relative">
            <input
              id="bruto"
              type="number"
              min={0}
              max={20000}
              step={50}
              value={bruto}
              onChange={(e) => setBruto(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
          </div>
          <input
            type="range"
            aria-label="Salário bruto mensal"
            min={0}
            max={6000}
            step={50}
            value={Math.min(bruto, 6000)}
            onChange={(e) => setBruto(Number(e.target.value))}
            className="w-full mt-2 accent-brand"
          />
        </div>

        <div>
          <span className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Dependentes
          </span>
          <div className="flex gap-2" role="group" aria-label="Número de dependentes">
            {DEPENDENTES.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={dependentes === d}
                onClick={() => setDependentes(d)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
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

      {/* Subsídio de refeição */}
      <div className="mb-6 rounded-2xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 p-4">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={temSubsidio}
            onChange={(e) => setTemSubsidio(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Tenho subsídio de refeição
          </span>
          <InfoTip label="Limites de isenção 2026">
            Isento até {fmt(SUBSIDIO_REFEICAO.dinheiro.value)}/dia em dinheiro e {fmt(SUBSIDIO_REFEICAO.cartao.value)}/dia em cartão.
          </InfoTip>
        </label>

        {temSubsidio && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="subdia" className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                Valor por dia
              </label>
              <div className="relative">
                <input
                  id="subdia"
                  type="number"
                  min={0}
                  step={0.05}
                  value={subsidioDia}
                  onChange={(e) => setSubsidioDia(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
              </div>
            </div>
            <div>
              <span className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Forma</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  aria-pressed={cartao}
                  onClick={() => setCartao(true)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-all ${cartao ? "border-brand bg-brand text-white" : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-brand"}`}
                >
                  Cartão
                </button>
                <button
                  type="button"
                  aria-pressed={!cartao}
                  onClick={() => setCartao(false)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-all ${!cartao ? "border-brand bg-brand text-white" : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-brand"}`}
                >
                  Dinheiro
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="dias" className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                Dias úteis
              </label>
              <input
                id="dias"
                type="number"
                min={0}
                max={31}
                step={1}
                value={diasUteis}
                onChange={(e) => setDiasUteis(Math.max(0, Math.min(31, Number(e.target.value))))}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
        )}
      </div>

      {/* Resultado */}
      <m.div
        key={`${bruto}-${dependentes}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="space-y-3"
      >
        {/* Líquido — número-herói */}
        <div className="rounded-2xl bg-brand/8 dark:bg-brand/10 border border-brand/20 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-1">
            Vencimento líquido estimado
          </p>
          <p className="font-display text-4xl font-semibold text-brand tabular-nums">
            {fmt(r.liquido)}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            por mês · compara com o teu recibo de vencimento
          </p>
        </div>

        {/* Decomposição */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
            <p className="text-xs text-stone-400 mb-1">Bruto</p>
            <p className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100 tabular-nums">{fmt(r.bruto)}</p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
            <p className="text-xs text-stone-400 mb-1">
              Seg. Social{" "}
              <InfoTip label="Taxa do trabalhador">{pct(SS_DEPENDENTE.trabalhador.value)} sobre o bruto.</InfoTip>
            </p>
            <p className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100 tabular-nums">−{fmt(r.ssTrabalhador)}</p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
            <p className="text-xs text-stone-400 mb-1">
              Retenção IRS{" "}
              <InfoTip label="Base legal">Despacho 233-A/2026 — tabelas de retenção na fonte.</InfoTip>
            </p>
            <p className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100 tabular-nums">−{fmt(r.irsRetido)}</p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
            <p className="text-xs text-stone-400 mb-1">Taxa efetiva</p>
            <p className="font-display text-lg font-semibold text-brand tabular-nums">{pct(r.taxaEfetiva)}</p>
            <p className="text-xs text-stone-400 mt-0.5">IRS + SS / bruto</p>
          </div>
        </div>

        {/* Subsídio + custo empresa */}
        <div className="grid gap-3 sm:grid-cols-2">
          {temSubsidio && (
            <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4 text-sm">
              <p className="text-xs text-stone-400 mb-1">Subsídio de refeição</p>
              <p className="text-stone-700 dark:text-stone-300">
                {fmt(r.subsidioRefeicaoTotal)} <span className="text-stone-400">· {fmt(r.subsidioRefeicaoIsento)} isento</span>
              </p>
              {subsidioExcede && (
                <p className="text-xs text-alert-text dark:text-amber-400 mt-1">
                  {fmt(r.subsidioRefeicaoTributado)} acima do limite ({fmt(limiteSubsidio)}/dia) — sujeito a IRS/SS.
                </p>
              )}
            </div>
          )}
          <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4 text-sm">
            <p className="text-xs text-stone-400 mb-1">
              Custo para a empresa{" "}
              <InfoTip label="TSU">Bruto + {pct(SS_DEPENDENTE.entidade.value)} de contribuição da entidade.</InfoTip>
            </p>
            <p className="text-stone-700 dark:text-stone-300 tabular-nums">{fmt(r.custoEmpresa)}/mês</p>
          </div>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed pt-1">
          Estimativa para o Continente, contrato com subsídios pagos mensalmente. Os subsídios de
          férias e de Natal (e os duodécimos dos contratos a termo) entram numa próxima atualização.
          Não substitui o teu recibo oficial nem aconselhamento de um contabilista.
        </p>
      </m.div>
    </div>
  );
}
