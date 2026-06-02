"use client";

import { useMemo, useState } from "react";
import { m } from "motion/react";
import { fmt } from "@/lib/format";
import { ArrowRight, Building, Receipt } from "@/components/ui/Icons";

interface ComparacaoNarrativaProps {
  liquidoRV: number;
  liquidoEmpresa: number;
  faturacaoAnual: number;
  breakEven: number | null;
  custoFixoEstimado: number;
  onVerDetalhe: () => void;
  modoAtivo?: "rv" | "empresa";
  // Funções de cálculo injectadas pelo SimuladorIntegrado (as funções de
  // simulação vivem lá e não são exportadas).
  calcularLiquidoRV: (fat: number) => number;
  calcularLiquidoEmpresa: (fat: number) => number;
}

const SLIDER_MIN = 0;
const SLIDER_MAX = 200_000;
const PRESETS = [15_000, 25_000, 40_000, 60_000, 80_000, 120_000];

/**
 * Footer narrativo de comparação RV vs. Empresa — sempre visível.
 * Mostra qual é a melhor opção para a faturação actual e uma calculadora
 * interactiva de ponto de equilíbrio que recalcula ambos os cenários em
 * tempo real ao arrastar o slider de faturação.
 */
export default function ComparacaoNarrativa({
  liquidoRV,
  liquidoEmpresa,
  faturacaoAnual,
  custoFixoEstimado,
  onVerDetalhe,
  modoAtivo = "rv",
  calcularLiquidoRV,
  calcularLiquidoEmpresa,
}: ComparacaoNarrativaProps) {
  // Estado local do slider — independente do estado principal do simulador.
  const [slider, setSlider] = useState<number>(() =>
    Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, Math.round(faturacaoAnual))),
  );

  const liquidoRVSlider = useMemo(
    () => calcularLiquidoRV(slider),
    [calcularLiquidoRV, slider],
  );
  const liquidoEmpresaSlider = useMemo(
    () => calcularLiquidoEmpresa(slider),
    [calcularLiquidoEmpresa, slider],
  );

  // Procura o ponto de equilíbrio onde a empresa passa a render mais que RV.
  const breakEvenCalc = useMemo(() => {
    const passo = 1_000;
    let anterior: boolean | null = null;
    for (let v = passo; v <= SLIDER_MAX; v += passo) {
      const empresaMelhorAqui = calcularLiquidoEmpresa(v) > calcularLiquidoRV(v);
      if (anterior === false && empresaMelhorAqui) return v;
      anterior = empresaMelhorAqui;
    }
    return null;
  }, [calcularLiquidoRV, calcularLiquidoEmpresa]);

  if (faturacaoAnual <= 0) return null;

  const diferenca = Math.abs(liquidoEmpresa - liquidoRV);
  const empresaMelhor = liquidoEmpresa > liquidoRV;

  const empresaMelhorSlider = liquidoEmpresaSlider > liquidoRVSlider;
  const diferencaSlider = Math.abs(liquidoEmpresaSlider - liquidoRVSlider);

  const pos = (v: number) =>
    Math.min(
      100,
      Math.max(0, ((v - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100),
    );
  const sliderPct = pos(slider);
  const bePct = breakEvenCalc != null ? pos(breakEvenCalc) : null;
  const faturacaoPct = pos(Math.min(SLIDER_MAX, faturacaoAnual));

  return (
    <div className="px-6 py-6 sm:px-8 sm:py-7 bg-stone-50 dark:bg-stone-900">
      {/* Cabeçalho da secção */}
      <div className="eyebrow mb-5 text-stone-500">
        Comparação — Recibos Verdes vs. Empresa (Lda)
      </div>

      {/* Dois cards lado a lado */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Card RV */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`relative rounded-2xl border p-4 transition-all ${
            !empresaMelhor
              ? "border-brand bg-brand-light"
              : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-950"
          }`}
        >
          {!empresaMelhor && (
            <span className="absolute right-3 top-3 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
              Melhor opção
            </span>
          )}
          <div className="mb-1 flex items-center gap-2">
            <span className="text-stone-400">
              <Receipt size={16} />
            </span>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Recibos Verdes
            </span>
          </div>
          <div
            className={`font-display text-3xl font-semibold tabular-nums ${
              !empresaMelhor ? "text-brand-dark" : "text-stone-800 dark:text-stone-100"
            }`}
          >
            {fmt(Math.round(liquidoRV))}
          </div>
          <div className="mt-0.5 text-xs text-stone-400">líquido anual estimado</div>
          <ul className="mt-3 space-y-1">
            {[
              "Abre atividade nas Finanças (grátis)",
              "Emite recibos — sem contabilista obrigatório",
              "Zero custos de estrutura",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-1.5 text-[11px] text-stone-500 dark:text-stone-400"
              >
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
                {item}
              </li>
            ))}
          </ul>
        </m.div>

        {/* Card Empresa */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`relative rounded-2xl border p-4 transition-all ${
            empresaMelhor
              ? "border-brand bg-brand-light"
              : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-950"
          }`}
        >
          {empresaMelhor && (
            <span className="absolute right-3 top-3 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
              Melhor opção
            </span>
          )}
          <div className="mb-1 flex items-center gap-2">
            <span className="text-stone-400">
              <Building size={16} />
            </span>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Empresa (Lda)
            </span>
          </div>
          <div
            className={`font-display text-3xl font-semibold tabular-nums ${
              empresaMelhor ? "text-brand-dark" : "text-stone-800 dark:text-stone-100"
            }`}
          >
            {fmt(Math.round(liquidoEmpresa))}
          </div>
          <div className="mt-0.5 text-xs text-stone-400">líquido anual estimado</div>
          <ul className="mt-3 space-y-1">
            {[
              `Constituição ~1.200€ (registo + setup contabilista)`,
              custoFixoEstimado > 0
                ? `Custos de estrutura estimados: ${fmt(Math.round(custoFixoEstimado))}/ano`
                : "Contabilista obrigatório (~150-300€/mês)",
              "IRC PME: 15% até 50.000€ + 19% excedente",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-1.5 text-[11px] text-stone-500 dark:text-stone-400"
              >
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-stone-300" />
                {item}
              </li>
            ))}
          </ul>
        </m.div>
      </div>

      {/* Diferença para a faturação actual */}
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-950">
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
          {empresaMelhor
            ? `A empresa dá-te mais ${fmt(Math.round(diferenca))}/ano`
            : `Recibos Verdes dão-te mais ${fmt(Math.round(diferenca))}/ano`}
        </span>
        <span className="text-xs text-stone-400">
          {((diferenca / Math.max(1, faturacaoAnual)) * 100).toFixed(1)}% da faturação
        </span>
      </div>

      {/* ── Calculadora interactiva de ponto de equilíbrio ──────────────────── */}
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-950">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">
              Simula outra faturação
            </h4>
            <p className="mt-0.5 text-[11px] text-stone-400">
              Arrasta para veres em que ponto a empresa compensa.
            </p>
          </div>
          <div className="font-display text-2xl font-semibold tabular-nums text-stone-800 dark:text-stone-100">
            {fmt(slider)}
            <span className="text-sm font-normal text-stone-400">/ano</span>
          </div>
        </div>

        {/* Slider */}
        <label htmlFor="be-slider" className="sr-only">
          Faturação anual para simulação
        </label>
        <input
          id="be-slider"
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={1_000}
          value={slider}
          onChange={(e) => setSlider(Number(e.target.value))}
          aria-valuetext={`${fmt(slider)} por ano`}
          className="w-full cursor-pointer accent-brand"
        />

        {/* Barra com marcadores do break-even e da faturação actual */}
        <div className="relative mt-3 h-2.5 w-full rounded-full bg-stone-200 dark:bg-stone-700">
          <div
            className="absolute left-0 top-0 h-full rounded-l-full bg-brand transition-[width] duration-200"
            style={{ width: `${sliderPct}%` }}
          />
          {/* Marcador break-even */}
          {bePct != null && (
            <div
              className="absolute top-1/2 z-10 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-600 dark:bg-stone-300"
              style={{ left: `${bePct}%` }}
              aria-hidden
            >
              <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold text-stone-500">
                equilíbrio
              </span>
            </div>
          )}
          {/* Marcador faturação actual */}
          <div
            className="absolute top-1/2 z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-dark shadow-card dark:border-stone-950"
            style={{ left: `${faturacaoPct}%` }}
            aria-hidden
          >
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold text-brand-dark">
              tu, hoje
            </span>
          </div>
        </div>

        {/* Presets */}
        <div className="mt-7 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={slider === p}
              onClick={() => setSlider(p)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-all ${
                slider === p
                  ? "border-brand bg-brand text-white"
                  : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
              }`}
            >
              {p >= 1000 ? `${p / 1000}k€` : `${p}€`}
            </button>
          ))}
        </div>

        {/* Dois valores recalculados */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div
            className={`rounded-xl border p-3 transition-colors ${
              !empresaMelhorSlider
                ? "border-brand bg-brand-light"
                : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-900"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
              <Receipt size={13} /> Recibos Verdes
            </div>
            <div
              className={`mt-0.5 text-lg font-bold tabular-nums ${
                !empresaMelhorSlider
                  ? "text-brand-dark"
                  : "text-stone-800 dark:text-stone-100"
              }`}
            >
              {fmt(Math.round(liquidoRVSlider))}
            </div>
          </div>
          <div
            className={`rounded-xl border p-3 transition-colors ${
              empresaMelhorSlider
                ? "border-brand bg-brand-light"
                : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-900"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
              <Building size={13} /> Empresa (Lda)
            </div>
            <div
              className={`mt-0.5 text-lg font-bold tabular-nums ${
                empresaMelhorSlider
                  ? "text-brand-dark"
                  : "text-stone-800 dark:text-stone-100"
              }`}
            >
              {fmt(Math.round(liquidoEmpresaSlider))}
            </div>
          </div>
        </div>

        {/* Resultado dinâmico */}
        <m.p
          key={empresaMelhorSlider ? "empresa" : "rv"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-3 text-center text-sm font-semibold text-stone-700 dark:text-stone-200"
        >
          Com {fmt(slider)}/ano,{" "}
          <span className="text-brand-dark">
            {empresaMelhorSlider ? "a empresa" : "os Recibos Verdes"}
          </span>{" "}
          {empresaMelhorSlider ? "dá-te" : "dão-te"} mais{" "}
          <span className="tabular-nums">{fmt(Math.round(diferencaSlider))}/ano</span>
        </m.p>

        <p className="mt-3 text-center text-[11px] text-stone-400">
          {breakEvenCalc != null
            ? `A empresa passa a compensar acima de ${fmt(breakEvenCalc)}/ano`
            : "Para esta atividade, os Recibos Verdes compensam em todo o intervalo simulado"}
        </p>
      </div>

      {/* CTA */}
      {modoAtivo !== "empresa" && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onVerDetalhe}
            className="inline-flex items-center gap-2 rounded-2xl border border-brand bg-brand-light px-5 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:bg-brand hover:text-white"
          >
            Simular empresa em detalhe
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Nota */}
      <p className="mt-4 text-[10px] leading-relaxed text-stone-400">
        Empresa simulada com IRC PME, derrama municipal 1,5% e distribuição de dividendos (28% liberatória). Não inclui custos de contabilidade na comparação base — configurar nos parâmetros da empresa. Baseado na faturação sem despesas operacionais adicionais.
      </p>
    </div>
  );
}
