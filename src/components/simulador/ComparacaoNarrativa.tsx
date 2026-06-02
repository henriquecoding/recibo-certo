"use client";

import {
  useMemo,
  useState,
  useRef,
  useCallback,
  ChangeEvent,
} from "react";
import { m, AnimatePresence } from "motion/react";
import { fmt } from "@/lib/format";
import { ArrowRight, Building, Receipt, Check, ChartProjection } from "@/components/ui/Icons";

interface ComparacaoNarrativaProps {
  liquidoRV: number;
  liquidoEmpresa: number;
  faturacaoAnual: number;
  breakEven: number | null;
  custoFixoEstimado: number;
  onVerDetalhe: () => void;
  modoAtivo?: "rv" | "empresa";
  calcularLiquidoRV: (fat: number) => number;
  calcularLiquidoEmpresa: (fat: number) => number;
}

const MIN = 0;
const MAX = 200_000;
const STEP = 1_000;
const PRESETS = [15_000, 25_000, 40_000, 60_000, 80_000, 120_000];

function fmtPreset(v: number) {
  if (v >= 1000) return `${v / 1000}k€`;
  return `${v}€`;
}

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
  const [slider, setSlider] = useState(() =>
    Math.min(MAX, Math.max(MIN, Math.round(faturacaoAnual / STEP) * STEP)),
  );
  const [dragging, setDragging] = useState(false);
  const [interagiu, setInteragiu] = useState(false);
  const [inputStr, setInputStr] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Cálculo em tempo real via funções injectadas
  const liquidoRVSlider = useMemo(
    () => calcularLiquidoRV(slider),
    [calcularLiquidoRV, slider],
  );
  const liquidoEmpresaSlider = useMemo(
    () => calcularLiquidoEmpresa(slider),
    [calcularLiquidoEmpresa, slider],
  );

  // Break-even por varrimento
  const breakEvenCalc = useMemo(() => {
    for (let v = STEP; v <= MAX; v += STEP) {
      const rvAnterior = calcularLiquidoRV(v - STEP);
      const empAnterior = calcularLiquidoEmpresa(v - STEP);
      const rvAgora = calcularLiquidoRV(v);
      const empAgora = calcularLiquidoEmpresa(v);
      if (empAnterior <= rvAnterior && empAgora > rvAgora) return v;
    }
    return null;
  }, [calcularLiquidoRV, calcularLiquidoEmpresa]);

  const clamp = useCallback(
    (v: number) => Math.round(Math.min(MAX, Math.max(MIN, v)) / STEP) * STEP,
    [],
  );

  const pctOf = (v: number) =>
    Math.min(100, Math.max(0, ((v - MIN) / (MAX - MIN)) * 100));

  const sliderPct = pctOf(slider);
  const bePct = breakEvenCalc != null ? pctOf(breakEvenCalc) : null;
  const hojePct = pctOf(Math.min(MAX, faturacaoAnual));

  const getFromPointer = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return slider;
    const { left, width } = el.getBoundingClientRect();
    return clamp(
      Math.max(0, Math.min(1, (clientX - left) / width)) * (MAX - MIN) + MIN,
    );
  }, [slider, clamp]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      setInteragiu(true);
      setSlider(getFromPointer(e.clientX));
    },
    [getFromPointer],
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging) setSlider(getFromPointer(e.clientX));
    },
    [dragging, getFromPointer],
  );
  const onPointerUp = useCallback(() => setDragging(false), []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      setInteragiu(true);
      const map: Record<string, number> = {
        ArrowRight: STEP,
        ArrowUp: STEP,
        ArrowLeft: -STEP,
        ArrowDown: -STEP,
        PageUp: STEP * 10,
        PageDown: -(STEP * 10),
      };
      const delta = map[e.key];
      if (delta !== undefined) {
        e.preventDefault();
        setSlider((v) => clamp(v + delta));
      } else if (e.key === "Home") setSlider(MIN);
      else if (e.key === "End") setSlider(MAX);
    },
    [clamp],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, "");
    setInputStr(raw);
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 0) {
      // Aceita qualquer valor, mesmo fora do MAX — ajusta apenas ao MIN
      setSlider(Math.max(MIN, Math.round(n / STEP) * STEP));
    }
  };

  const handleInputBlur = () => {
    setInputFocused(false);
    const n = parseInt(inputStr, 10);
    if (isNaN(n) || n < 0) setSlider(slider);
    else setSlider(Math.max(MIN, Math.round(n / STEP) * STEP));
  };

  if (faturacaoAnual <= 0) return null;

  const diferenca = Math.abs(liquidoEmpresa - liquidoRV);
  const empresaMelhor = liquidoEmpresa > liquidoRV;
  const empresaMelhorSlider = liquidoEmpresaSlider > liquidoRVSlider;
  const diferencaSlider = Math.abs(liquidoEmpresaSlider - liquidoRVSlider);

  // Percentagem visual do slider — limitar a 100% na barra mas aceitar valores maiores
  const sliderPctVisual = Math.min(100, sliderPct);

  return (
    <div className="bg-stone-50 px-6 py-6 dark:bg-stone-900 sm:px-8 sm:py-7">
      {/* Eyebrow */}
      <div className="eyebrow mb-5 text-stone-500">
        Comparação — Recibos Verdes vs. Empresa (Lda)
      </div>

      {/* Cards de resultado actual */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* RV */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={`relative rounded-2xl border p-4 transition-all ${
            !empresaMelhor
              ? "border-brand bg-brand-light"
              : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-950"
          }`}
        >
          {!empresaMelhor && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
              <Check size={9} /> Melhor
            </span>
          )}
          <div className="mb-1 flex items-center gap-2">
            <span className="text-stone-400"><Receipt size={15} /></span>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Recibos Verdes</span>
          </div>
          <div className={`font-display text-3xl font-semibold tabular-nums ${!empresaMelhor ? "text-brand-dark" : "text-stone-800 dark:text-stone-100"}`}>
            {fmt(Math.round(liquidoRV))}
          </div>
          <p className="mt-0.5 text-[11px] text-stone-400">líquido anual estimado</p>
          <ul className="mt-3 space-y-1">
            {["Abertura grátis nas Finanças", "Sem contabilista obrigatório", "Zero custos fixos de estrutura"].map((t) => (
              <li key={t} className="flex items-start gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
                {t}
              </li>
            ))}
          </ul>
        </m.div>

        {/* Empresa */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.07, ease: [0.16, 1, 0.3, 1] }}
          className={`relative rounded-2xl border p-4 transition-all ${
            empresaMelhor
              ? "border-brand bg-brand-light"
              : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-950"
          }`}
        >
          {empresaMelhor && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
              <Check size={9} /> Melhor
            </span>
          )}
          <div className="mb-1 flex items-center gap-2">
            <span className="text-stone-400"><Building size={15} /></span>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Empresa (Lda)</span>
          </div>
          <div className={`font-display text-3xl font-semibold tabular-nums ${empresaMelhor ? "text-brand-dark" : "text-stone-800 dark:text-stone-100"}`}>
            {fmt(Math.round(liquidoEmpresa))}
          </div>
          <p className="mt-0.5 text-[11px] text-stone-400">líquido anual estimado</p>
          <ul className="mt-3 space-y-1">
            {[
              "Constituição ~1.200€ (registo + OCC)",
              custoFixoEstimado > 0 ? `Estrutura estimada: ${fmt(Math.round(custoFixoEstimado))}/ano` : "Contabilista: ~150–300€/mês",
              "IRC PME: 15% até 50.000€ + 19% excedente",
            ].map((t) => (
              <li key={t} className="flex items-start gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-stone-300" />
                {t}
              </li>
            ))}
          </ul>
        </m.div>
      </div>

      {/* Diferença */}
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-950">
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
          {empresaMelhor
            ? `A empresa dá-te mais ${fmt(Math.round(diferenca))}/ano`
            : `Recibos Verdes dão-te mais ${fmt(Math.round(diferenca))}/ano`}
        </span>
        <span className="text-xs text-stone-400">
          {((diferenca / Math.max(1, faturacaoAnual)) * 100).toFixed(1)}% da faturação
        </span>
      </div>

      {/* ── Calculadora interactiva ─────────────────────────────────────────── */}
      <div className="mt-3 rounded-3xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-950">
        {/* Cabeçalho */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light">
            <ChartProjection size={16} className="text-brand-dark" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-800 dark:text-stone-100">Calculadora de poupança</h4>
            <p className="text-[11px] text-stone-400">Descobre em que ponto a empresa compensa</p>
          </div>
        </div>

        {/* Valor + input manual — centrado */}
        <div className="mb-4 text-center">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
            Faturação anual para simulação
          </p>
          <div className="flex items-baseline justify-center gap-2">
            {inputFocused ? (
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={inputStr}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className="w-40 rounded-xl border border-brand bg-white px-2 py-1 text-center text-3xl font-black text-stone-800 tabular-nums outline-none ring-2 ring-brand/20 dark:bg-stone-900 dark:text-stone-100"
                aria-label="Faturação anual"
              />
            ) : (
              <button
                type="button"
                onClick={() => { setInputStr(String(slider)); setInputFocused(true); setInteragiu(true); }}
                className="group flex items-center gap-1.5 rounded-xl px-2 py-1 text-3xl font-black tabular-nums text-stone-800 transition-all hover:bg-stone-50 hover:text-brand dark:text-stone-100 dark:hover:bg-stone-800"
                title="Clica para editar"
              >
                {fmt(slider)}
                <span className="text-[10px] font-medium text-stone-300 transition-colors group-hover:text-brand/50">
                  editar
                </span>
              </button>
            )}
            <span className="text-sm font-medium text-stone-400">/ano</span>
          </div>
        </div>

        {/* Hint arraste */}
        <AnimatePresence>
          {!interagiu && (
            <m.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-3 flex items-center justify-center gap-1 text-[11px] font-semibold text-stone-400"
            >
              <span>‹</span>
              <span>Arraste ou clique no valor para ajustar</span>
              <span>›</span>
            </m.div>
          )}
        </AnimatePresence>

        {/* Bolha flutuante acima do thumb — posição clamped para não sair dos limites */}
        <div className="pointer-events-none relative h-10 mb-1 overflow-visible">
          <div
            className="absolute bottom-0 -translate-x-1/2"
            style={{ left: `clamp(1.75rem, ${sliderPctVisual}%, calc(100% - 1.75rem))` }}
          >
            <div className={`relative whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-black text-white shadow-md transition-all ${dragging ? "scale-105 bg-brand-dark" : "bg-brand"}`}>
              {fmt(slider)}
              {/* Seta */}
              <div className="absolute left-1/2 top-full -translate-x-1/2">
                <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-brand" />
                <div className="mx-auto h-2 w-px bg-brand/30" />
              </div>
            </div>
          </div>
        </div>

        {/* Track + thumb */}
        <div
          ref={trackRef}
          role="slider"
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={slider}
          aria-label="Faturação anual para simulação"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className={`relative h-10 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          {/* Track visual — centrado verticalmente no hit area */}
          <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
            <div
              className="h-full rounded-full bg-brand transition-none"
              style={{ width: `${sliderPctVisual}%` }}
            />
          </div>

          {/* Marcador break-even — linha vertical centrada no track */}
          {bePct != null && (
            <div
              className="absolute top-1/2 z-10 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400"
              style={{ left: `${bePct}%` }}
              aria-hidden
            />
          )}

          {/* Marcador "tu, hoje" */}
          {faturacaoAnual > 0 && faturacaoAnual !== slider && (
            <div
              className="absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-stone-400 shadow dark:border-stone-800"
              style={{ left: `${Math.min(100, hojePct)}%` }}
              aria-hidden
            >
              <span className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-stone-500">
                hoje
              </span>
            </div>
          )}

          {/* Thumb — wrapper posiciona em XY; m.div só anima scale */}
          <div
            className="pointer-events-none absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${sliderPctVisual}%` }}
          >
            <m.div
              animate={{ scale: dragging ? 1.1 : 1 }}
              transition={{ duration: 0.1 }}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white transition-all dark:bg-stone-900 ${
                dragging
                  ? "border-brand-dark shadow-[0_0_0_4px_rgba(29,158,117,0.2)]"
                  : "border-brand shadow-[0_2px_10px_rgba(29,158,117,0.35)]"
              }`}>
                <div className="flex gap-0.5">
                  <span className="block h-2.5 w-0.5 rounded-full bg-brand" />
                  <span className="block h-2.5 w-0.5 rounded-full bg-brand" />
                  <span className="block h-2.5 w-0.5 rounded-full bg-brand" />
                </div>
              </div>
            </m.div>
          </div>
        </div>

        {/* Ticks + labels */}
        <div className="relative mt-5 text-[10px] font-medium text-stone-400">
          <span className="absolute left-0">0€</span>
          {bePct != null && breakEvenCalc != null && (
            <span
              className="-translate-x-1/2 absolute font-bold text-amber-600 whitespace-nowrap"
              style={{ left: `${bePct}%` }}
            >
              {fmtPreset(breakEvenCalc)}
            </span>
          )}
          <span className="absolute right-0">200k€</span>
        </div>

        {/* Presets */}
        <div className="mt-6 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={slider === p}
              onClick={() => { setSlider(p); setInteragiu(true); }}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold tabular-nums transition-all ${
                slider === p
                  ? "border-brand bg-brand text-white shadow-sm"
                  : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
              }`}
            >
              {fmtPreset(p)}
            </button>
          ))}
        </div>

        {/* Dois cards de comparação */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className={`rounded-2xl border-2 p-3.5 transition-all ${!empresaMelhorSlider ? "border-brand bg-brand-light" : "border-stone-100 bg-stone-50 dark:border-stone-700 dark:bg-stone-900"}`}>
            <div className="mb-1 flex items-center gap-1.5">
              <Receipt size={13} className="text-stone-400" />
              <span className="text-[11px] font-black text-stone-500 dark:text-stone-400">Recibos Verdes</span>
              {!empresaMelhorSlider && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-black text-white">
                  <Check size={8} /> Melhor
                </span>
              )}
            </div>
            <p className={`text-xl font-black tabular-nums ${!empresaMelhorSlider ? "text-brand-dark" : "text-stone-800 dark:text-stone-100"}`}>
              {fmt(Math.round(liquidoRVSlider))}
            </p>
            <p className="text-[10px] text-stone-400">líquido/ano</p>
          </div>

          <div className={`rounded-2xl border-2 p-3.5 transition-all ${empresaMelhorSlider ? "border-brand bg-brand-light" : "border-stone-100 bg-stone-50 dark:border-stone-700 dark:bg-stone-900"}`}>
            <div className="mb-1 flex items-center gap-1.5">
              <Building size={13} className="text-stone-400" />
              <span className="text-[11px] font-black text-stone-500 dark:text-stone-400">Empresa (Lda)</span>
              {empresaMelhorSlider && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-black text-white">
                  <Check size={8} /> Melhor
                </span>
              )}
            </div>
            <p className={`text-xl font-black tabular-nums ${empresaMelhorSlider ? "text-brand-dark" : "text-stone-800 dark:text-stone-100"}`}>
              {fmt(Math.round(liquidoEmpresaSlider))}
            </p>
            <p className="text-[10px] text-stone-400">líquido/ano</p>
          </div>
        </div>

        {/* Resultado dinâmico */}
        <m.div
          key={empresaMelhorSlider ? "emp" : "rv"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`mt-3 flex items-center gap-2 rounded-2xl p-3 text-sm font-semibold ${
            !empresaMelhorSlider && !empresaMelhorSlider && diferencaSlider === 0
              ? "bg-stone-50 text-stone-600 dark:bg-stone-800"
              : empresaMelhorSlider
              ? "bg-brand-light text-brand-dark"
              : "bg-brand-light text-brand-dark"
          }`}
        >
          <Check size={14} className="flex-shrink-0 text-brand" />
          {diferencaSlider === 0 ? (
            "Ponto de equilíbrio — os dois cenários dão o mesmo resultado."
          ) : (
            <>
              Com {fmt(slider)}/ano,{" "}
              <span className="font-black">
                {empresaMelhorSlider ? "a Empresa" : "os Recibos Verdes"}
              </span>{" "}
              {empresaMelhorSlider ? "dá-te" : "dão-te"} mais{" "}
              <span className="tabular-nums font-black">{fmt(Math.round(diferencaSlider))}/ano</span>.
            </>
          )}
        </m.div>

        <p className="mt-2 text-center text-[11px] text-stone-400">
          {breakEvenCalc != null
            ? `A empresa passa a compensar acima de ${fmt(breakEvenCalc)}/ano neste cenário`
            : "Com estes parâmetros, os Recibos Verdes compensam em toda a gama simulada"}
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

      <p className="mt-4 text-[10px] leading-relaxed text-stone-400">
        Empresa simulada com IRC PME, derrama municipal 1,5% e dividendos (28% liberatória). Não inclui custos de contabilidade na comparação base — configurar nos parâmetros da empresa. Valores sem despesas operacionais adicionais.
      </p>
    </div>
  );
}
