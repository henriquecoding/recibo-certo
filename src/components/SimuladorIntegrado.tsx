"use client";

/**
 * SimuladorIntegrado.tsx
 * ══════════════════════════════════════════════════════════════════════
 * Ferramenta única que substitui Calculadora.tsx + SimuladorEmpresa.tsx.
 *
 * Reutiliza integralmente:
 *  · fiscal-data.ts  — ATIVIDADES, SS_TAXA, IVA_TAXAS, META_*, IRS_JOVEM…
 *  · fiscal.ts       — calcular(), compararRegimes(), taxaIVAEfetiva()
 *  · ActivityCombobox, InfoTip, AnimatedNumber, Check, Warning (UI existentes)
 *
 * Correções v2 vs v1:
 *  · Sincronização bidirecional bruto ↔ brutoAnual (÷12 / ×12)
 *  · breakEven memoizado só com custosEmpresa como dep (era recalculado a cada render)
 *  · Painel Empresa em modo "Por recibo" mostra aviso sobre anualização
 *  · NumericSlider: input type="text" em vez de "number" evita artefactos de UX
 *    (scrollar o rato sobre o input mudava o valor inesperadamente)
 *  · Stepper usa onPointerDown + preventDefault para não perder o foco do slider
 */

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { m, AnimatePresence } from "motion/react";
import Link from "next/link";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { Check, Warning } from "@/components/ui/Icons";
import { pct, fmt } from "@/lib/format";
import {
  calcular,
  compararRegimes,
  taxaIVAEfetiva,
  type RegimeIVA,
} from "@/lib/fiscal";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import InfoTip from "@/components/ui/InfoTip";
import {
  SS_TAXA,
  IVA_TAXAS,
  ATIVIDADES,
  efeitoFiscal,
  BASE_SS_POR_TIPO,
  META_TIPO,
  META_REGIAO,
  META_BASE_SS,
  IRS_JOVEM,
  DISPENSA_RETENCAO_LIMITE,
  type Atividade,
  type Regiao,
  type BaseSS,
  type EscalaoIVA,
} from "@/lib/fiscal-data";

// ─── Constantes ─────────────────────────────────────────────────────────────
const ATIVIDADE_DEFAULT =
  ATIVIDADES.find((a) => a.label.includes("Programador")) ?? ATIVIDADES[0];
const REGIOES = Object.keys(META_REGIAO) as Regiao[];
const BASES_SS = Object.keys(META_BASE_SS) as BaseSS[];
const ESCALOES_IVA: EscalaoIVA[] = ["reduzida", "intermedia", "normal"];
const ESCALAO_LABEL: Record<EscalaoIVA, string> = {
  reduzida: "Reduzida",
  intermedia: "Intermédia",
  normal: "Normal",
};
const CUSTOS_EMPRESA_DEFAULT = 2000;

type ModoInput = "recibo" | "anual";
type Cenario = "rv" | "empresa";

// ─── NumericSlider ───────────────────────────────────────────────────────────
/**
 * Campo numérico bidirecional: slider ↔ input de texto ↔ steppers +/−.
 * Usa input type="text" para evitar o comportamento de scroll nativo do
 * browser sobre inputs numéricos. A validação e o clamp ficam no JS.
 */
interface NumericSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  presets?: number[];
  formatPreset?: (v: number) => string;
  tooltip?: React.ReactNode;
  breakPoint?: number;
  breakPointLabel?: string;
}

function NumericSlider({
  label,
  value,
  min,
  max,
  step,
  unit = "€",
  onChange,
  presets,
  formatPreset,
  tooltip,
  breakPoint,
  breakPointLabel,
}: NumericSliderProps) {
  const [inputStr, setInputStr] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Sincroniza o texto quando o valor externo muda (e o input não está em foco)
  useEffect(() => {
    if (!focused) setInputStr(String(value));
  }, [value, focused]);

  const clamp = useCallback(
    (v: number) => Math.round(Math.min(max, Math.max(min, v)) / step) * step,
    [min, max, step],
  );

  const pctVal = ((value - min) / (max - min)) * 100;
  const bePct =
    breakPoint != null ? ((breakPoint - min) / (max - min)) * 100 : null;

  // ── Interação com a pista do slider ────────────────────────────────────────
  const getFromPointer = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return value;
      const { left, width } = el.getBoundingClientRect();
      return clamp(
        Math.max(0, Math.min(1, (clientX - left) / width)) * (max - min) + min,
      );
    },
    [value, min, max, clamp],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      onChange(getFromPointer(e.clientX));
    },
    [getFromPointer, onChange],
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging) onChange(getFromPointer(e.clientX));
    },
    [dragging, getFromPointer, onChange],
  );
  const onPointerUp = useCallback(() => setDragging(false), []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const map: Record<string, number> = {
        ArrowRight: step,
        ArrowUp: step,
        ArrowLeft: -step,
        ArrowDown: -step,
        PageUp: step * 10,
        PageDown: -(step * 10),
      };
      const delta = map[e.key];
      if (delta !== undefined) {
        e.preventDefault();
        onChange(clamp(value + delta));
      } else if (e.key === "Home") onChange(min);
      else if (e.key === "End") onChange(max);
    },
    [value, step, min, max, clamp, onChange],
  );

  // ── Input de texto ─────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir só dígitos e vírgula/ponto
    const raw = e.target.value.replace(/[^\d,\.]/g, "");
    setInputStr(raw);
    const n = parseFloat(raw.replace(",", "."));
    if (!isNaN(n)) onChange(clamp(n));
  };

  const handleInputBlur = () => {
    setFocused(false);
    const n = parseFloat(inputStr.replace(",", "."));
    const v = isNaN(n) ? value : clamp(n);
    onChange(v);
    setInputStr(String(v));
  };

  return (
    <div className="space-y-3">
      {/* Linha: label + steppers + input ────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {label && (
            <span className="text-sm font-medium uppercase tracking-wider text-stone-500">
              {label}
            </span>
          )}
          {tooltip && <InfoTip>{tooltip}</InfoTip>}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Stepper − */}
          <button
            type="button"
            onPointerDown={(e) => {
              // Evita que o click no botão roube o foco do input
              e.preventDefault();
              onChange(clamp(value - step));
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 transition-all hover:border-brand hover:bg-brand-light hover:text-brand-dark active:scale-95 dark:border-stone-700 dark:bg-stone-800"
            aria-label={`Diminuir ${label}`}
          >
            <span className="text-base font-semibold leading-none select-none">
              −
            </span>
          </button>

          {/* Input de texto manual */}
          <div className="relative">
            {unit === "€" && (
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-medium text-stone-400">
                €
              </span>
            )}
            <input
              type="text"
              inputMode="decimal"
              value={focused ? inputStr : value.toLocaleString("pt-PT")}
              onFocus={() => {
                setFocused(true);
                setInputStr(String(value));
              }}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`h-8 rounded-xl border bg-white text-right text-sm font-semibold text-stone-800 tabular-nums outline-none transition-all dark:bg-stone-900 dark:text-stone-200 ${
                unit === "€" ? "w-28 pl-6 pr-2" : "w-20 px-2"
              } ${
                focused
                  ? "border-brand ring-2 ring-brand/20"
                  : "border-stone-200 hover:border-stone-300 dark:border-stone-700"
              }`}
              aria-label={label}
            />
          </div>

          {/* Stepper + */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onChange(clamp(value + step));
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 transition-all hover:border-brand hover:bg-brand-light hover:text-brand-dark active:scale-95 dark:border-stone-700 dark:bg-stone-800"
            aria-label={`Aumentar ${label}`}
          >
            <span className="text-base font-semibold leading-none select-none">
              +
            </span>
          </button>
        </div>
      </div>

      {/* Balão flutuante sobre o thumb ──────────────────────────────────── */}
      <div className="pointer-events-none relative h-7">
        <div
          className="absolute bottom-0 -translate-x-1/2"
          style={{ left: `${Math.min(96, Math.max(4, pctVal))}%` }}
        >
          <span
            className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-semibold text-white transition-colors ${
              dragging ? "bg-brand-dark" : "bg-brand"
            }`}
          >
            {value.toLocaleString("pt-PT")} {unit}
          </span>
        </div>
      </div>

      {/* Pista + thumb ──────────────────────────────────────────────────── */}
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={`relative h-3 select-none rounded-full bg-stone-100 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 dark:bg-stone-800 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* Faixa preenchida */}
        <div
          className="h-full rounded-full bg-brand transition-none"
          style={{ width: `${pctVal}%` }}
        />

        {/* Marcador de ponto de viragem */}
        {bePct != null && (
          <div
            className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-alert-text"
            style={{ left: `${bePct}%` }}
            aria-hidden
          />
        )}

        {/* Thumb personalizado */}
        <m.div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${pctVal}%` }}
          animate={{ scale: dragging ? 1.15 : 1 }}
          transition={{ duration: 0.1 }}
        >
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white shadow-md transition-all dark:bg-stone-900 ${
              dragging
                ? "border-brand-dark shadow-[0_0_0_4px_rgba(29,158,117,0.2)]"
                : "border-brand shadow-[0_2px_8px_rgba(29,158,117,0.2)]"
            }`}
          >
            <div className="flex gap-0.5">
              <span className="block h-1.5 w-0.5 rounded-full bg-brand opacity-70" />
              <span className="block h-1.5 w-0.5 rounded-full bg-brand opacity-70" />
              <span className="block h-1.5 w-0.5 rounded-full bg-brand opacity-70" />
            </div>
          </div>
        </m.div>
      </div>

      {/* Rótulos min / break-even / max ─────────────────────────────────── */}
      <div className="relative h-4 text-[11px] text-stone-400 dark:text-stone-600">
        <span className="absolute left-0">
          {min.toLocaleString("pt-PT")} {unit}
        </span>
        {bePct != null && breakPointLabel && (
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap font-semibold text-alert-text"
            style={{ left: `${Math.min(85, Math.max(15, bePct))}%` }}
          >
            {breakPointLabel}
          </span>
        )}
        <span className="absolute right-0">
          {max.toLocaleString("pt-PT")} {unit}+
        </span>
      </div>

      {/* Pré-sets ───────────────────────────────────────────────────────── */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                value === p
                  ? "border-brand bg-brand text-white shadow-sm"
                  : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
              }`}
            >
              {formatPreset
                ? formatPreset(p)
                : `${p.toLocaleString("pt-PT")} ${unit}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DetalheRow ─────────────────────────────────────────────────────────────
type RowType = "neutral" | "deducao" | "warning" | "subtotal";

function DetalheRow({
  label,
  value,
  type,
  note,
  hideValue = false,
}: {
  label: string;
  value: number;
  type: RowType;
  note?: string;
  hideValue?: boolean;
}) {
  const styles: Record<RowType, string> = {
    neutral: "bg-white border-stone-100 text-stone-700",
    deducao: "bg-clay-bg border-clay-border text-clay-text",
    warning: "bg-alert-bg border-alert-border text-alert-text",
    subtotal: "bg-stone-100 border-stone-200 text-stone-800 font-semibold",
  };
  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${styles[type]}`}
    >
      <div className="flex flex-col">
        <span className="text-sm">{label}</span>
        {note && <span className="text-[11px] opacity-60 mt-0.5">{note}</span>}
      </div>
      {!hideValue && (
        <span className="text-sm font-semibold tabular-nums">
          <AnimatedNumber value={value} />
        </span>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function SimuladorIntegrado() {
  // ── Modo de input e cenário ──────────────────────────────────────────────
  const [modoInput, setModoInput] = useState<ModoInput>("recibo");
  const [cenario, setCenario] = useState<Cenario>("rv");

  // ── Inputs partilhados ───────────────────────────────────────────────────
  // bruto e brutoAnual são sempre sincronizados (brutoAnual ≈ bruto × 12).
  // Quando o utilizador muda num modo, o outro atualiza automaticamente.
  const [bruto, setBruto] = useState(1500);
  const [brutoAnual, setBrutoAnual] = useState(18000); // 1500 × 12

  const [atividade, setAtividade] = useState<Atividade>(ATIVIDADE_DEFAULT);
  const [regiao, setRegiao] = useState<Regiao>("continente");
  const [regimeIVA, setRegimeIVA] = useState<RegimeIVA>("isento");
  const [baseSS, setBaseSS] = useState<BaseSS>(
    BASE_SS_POR_TIPO[ATIVIDADE_DEFAULT.tipo],
  );
  const [dispensaRetencao, setDispensaRetencao] = useState(false);
  const [isencaoSSPrimeiroAno, setIsencaoSSPrimeiroAno] = useState(false);
  const [acumulaEmprego, setAcumulaEmprego] = useState(false);
  const [irsJovemAno, setIrsJovemAno] = useState(0);
  const [ivaIncluido, setIvaIncluido] = useState(true);
  const [custosEmpresa, setCustosEmpresa] = useState(CUSTOS_EMPRESA_DEFAULT);
  const [advanced, setAdvanced] = useState(false);

  // ── Handlers com sincronização ──────────────────────────────────────────
  /**
   * Ao mudar o valor por recibo, atualiza também o anual (× 12).
   * Permite que o painel Empresa e a comparação reflitam sempre o mesmo
   * rendimento, independentemente do modo ativo.
   */
  const handleBrutoChange = useCallback((v: number) => {
    setBruto(v);
    setBrutoAnual(Math.round(v * 12));
  }, []);

  /**
   * Ao mudar o valor anual, atualiza também o por-recibo (÷ 12, step 50).
   */
  const handleBrutoAnualChange = useCallback((v: number) => {
    setBrutoAnual(v);
    setBruto(Math.round(v / 12 / 50) * 50); // snap ao step do slider de recibo
  }, []);

  const escolherAtividade = (a: Atividade) => {
    setAtividade(a);
    setBaseSS(efeitoFiscal(a).baseSS);
  };

  const ef = efeitoFiscal(atividade);
  const tipo = atividade.tipo;

  // ── IVA ─────────────────────────────────────────────────────────────────
  const taxaIva = taxaIVAEfetiva(regiao, regimeIVA);
  const temIva = taxaIva > 0;
  const base = ivaIncluido && temIva ? bruto / (1 + taxaIva) : bruto;
  const labelValor = !temIva
    ? "Valor do serviço (€)"
    : ivaIncluido
      ? "Valor cobrado ao cliente, com IVA (€)"
      : "O teu honorário, sem IVA (€)";

  // ── Resultado por recibo ─────────────────────────────────────────────────
  const resultRecibo = useMemo(
    () =>
      calcular({
        bruto: base,
        tipo,
        regiao,
        regimeIVA,
        baseSS,
        dispensaRetencao,
        isencaoSSPrimeiroAno,
        acumulaEmprego,
        irsJovemAno,
        retencaoOverride: ef.retencao,
      }),
    [
      base,
      tipo,
      regiao,
      regimeIVA,
      baseSS,
      dispensaRetencao,
      isencaoSSPrimeiroAno,
      acumulaEmprego,
      irsJovemAno,
      ef.retencao,
    ],
  );

  // ── Resultado comparação (anual) ─────────────────────────────────────────
  // Usa sempre brutoAnual para a comparação, garantindo coerência entre modos.
  const resultComparacao = useMemo(
    () =>
      compararRegimes({
        brutoAnual,
        tipo,
        despesas: 0,
        custosEmpresa,
        // Passa isenção SS do 1.º ano ao motor de freelancer
        // (compararRegimes chama simularIRSAnual mas não tem flag SS;
        //  ajuste via custosEmpresa não é possível aqui — nota de limitação)
      }),
    [brutoAnual, tipo, custosEmpresa],
  );

  const empresaVence = resultComparacao.diferenca > 0;

  // ── Break-even: ponto onde a empresa passa à frente ──────────────────────
  // Memoizado apenas com custosEmpresa como dep — recalcular em cada render
  // da lista de 120 iterações era desnecessário.
  const breakEven = useMemo(() => {
    for (let v = 0; v <= 120_000; v += 1000) {
      if (
        compararRegimes({
          brutoAnual: v,
          tipo: "art151",
          despesas: 0,
          custosEmpresa,
        }).diferenca > 0
      )
        return v;
    }
    return null;
  }, [custosEmpresa]);

  // ── Opções de IVA ────────────────────────────────────────────────────────
  const ivaOptions: { id: RegimeIVA; label: string; sub: string }[] = [
    { id: "isento", label: "Isento", sub: "Art. 53.º" },
    ...ESCALOES_IVA.map((e) => ({
      id: e as RegimeIVA,
      label: pct(IVA_TAXAS[regiao].value[e]),
      sub: ESCALAO_LABEL[e],
    })),
  ];

  // ── Checkboxes ───────────────────────────────────────────────────────────
  const checkboxes = [
    {
      id: "dispensa",
      label: "Dispensa de retenção na fonte",
      sub: `1.º ano ou faturação anual < ${DISPENSA_RETENCAO_LIMITE.value.toLocaleString("pt-PT")} € (Art. 101.º-B)`,
      val: dispensaRetencao,
      set: setDispensaRetencao,
    },
    {
      id: "ss1ano",
      label: "1.º ano de atividade (Seg. Social)",
      sub: "Isenção de contribuições nos primeiros 12 meses",
      val: isencaoSSPrimeiroAno,
      set: setIsencaoSSPrimeiroAno,
    },
    {
      id: "acumula",
      label: "Acumulo com trabalho dependente",
      sub: "Trabalho por conta de outrem já cobre a Segurança Social",
      val: acumulaEmprego,
      set: setAcumulaEmprego,
    },
  ];

  // ── Barra visual (painel RV) ─────────────────────────────────────────────
  const barsTotal =
    resultRecibo.retencaoIRS +
      resultRecibo.iva +
      resultRecibo.segSocial +
      resultRecibo.liquido || 1;
  const barW = (v: number) =>
    `${Math.max(0, (v / barsTotal) * 100).toFixed(1)}%`;

  // ── Aviso de anualização no modo Por Recibo + painel Empresa ─────────────
  const avisoAnualizacao =
    modoInput === "recibo"
      ? `Comparação baseada em ${fmt(bruto)} × 12 = ${fmt(brutoAnual)}/ano`
      : null;

  return (
    <div id="calculadora" className="relative scroll-mt-24">
      {/* Halo decorativo */}
      <div
        className="absolute inset-0 rounded-3xl opacity-30 pointer-events-none dark:opacity-0"
        style={{
          background:
            "radial-gradient(ellipse at 80% 20%, #E1F5EE 0%, transparent 60%)",
        }}
      />

      <div className="relative overflow-hidden rounded-3xl border border-stone-200 shadow-lift">
        {/* ── Cabeçalho com toggles ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-stone-50 px-8 py-4 dark:border-stone-800 dark:bg-stone-900">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
              Calculadora 2026
            </div>
            <h3 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-200">
              Quanto fica realmente teu?
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle: Por recibo / Anual */}
            <div
              role="group"
              aria-label="Modo de cálculo"
              className="flex rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-700 dark:bg-stone-900"
            >
              {(
                [
                  { v: "recibo" as ModoInput, l: "Por recibo" },
                  { v: "anual" as ModoInput, l: "Anual" },
                ] as const
              ).map(({ v, l }) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={modoInput === v}
                  onClick={() => setModoInput(v)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    modoInput === v
                      ? "bg-brand text-white shadow-glow"
                      : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Toggle: Recibos Verdes / Empresa */}
            <div
              role="tablist"
              aria-label="Cenário"
              className="flex rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-700 dark:bg-stone-900"
            >
              {(
                [
                  { v: "rv" as Cenario, l: "Recibos Verdes" },
                  { v: "empresa" as Cenario, l: "Empresa" },
                ] as const
              ).map(({ v, l }) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={cenario === v}
                  type="button"
                  onClick={() => setCenario(v)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    cenario === v
                      ? "bg-brand text-white shadow-glow"
                      : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Corpo ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* ════ Coluna esquerda: Inputs ════ */}
          <div className="bg-white p-8 lg:p-10 lg:border-r lg:border-stone-100 dark:bg-stone-950 dark:border-stone-800">
            {/* ── Valor ──────────────────────────────────────────────────── */}
            <div className="mb-7">
              <AnimatePresence mode="wait">
                {modoInput === "recibo" ? (
                  <m.div
                    key="recibo"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <NumericSlider
                      label={labelValor}
                      value={bruto}
                      min={0}
                      max={10000}
                      step={50}
                      unit="€"
                      onChange={handleBrutoChange}
                      presets={[500, 1000, 1500, 2500, 5000]}
                      tooltip={
                        <>
                          Valor total que o cliente paga, com IVA incluído. Se
                          preferires indicar o honorário sem IVA, escolhe
                          &quot;IVA à parte&quot;.
                        </>
                      }
                    />
                    {temIva && (
                      <div
                        role="group"
                        aria-label="O valor inclui IVA?"
                        className="mt-3 inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1"
                      >
                        {(
                          [
                            { incl: true, label: "Com IVA incluído" },
                            { incl: false, label: "IVA à parte" },
                          ] as const
                        ).map((o) => {
                          const active = ivaIncluido === o.incl;
                          return (
                            <button
                              key={o.label}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setIvaIncluido(o.incl)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                active
                                  ? "bg-white text-brand-dark shadow-card"
                                  : "text-stone-500 hover:text-stone-700"
                              }`}
                            >
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </m.div>
                ) : (
                  <m.div
                    key="anual"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <NumericSlider
                      label="Faturação anual (€)"
                      value={brutoAnual}
                      min={0}
                      max={120000}
                      step={1000}
                      unit="€"
                      onChange={handleBrutoAnualChange}
                      presets={[15000, 25000, 40000, 60000, 80000, 100000]}
                      formatPreset={(v) => fmt(v)}
                      tooltip="Volume de negócios anual, antes de qualquer desconto."
                      breakPoint={breakEven ?? undefined}
                      breakPointLabel={
                        breakEven ? `Vira aqui · ${fmt(breakEven)}` : undefined
                      }
                    />
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Tipo de atividade ──────────────────────────────────────── */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-sm font-medium uppercase tracking-wider text-stone-500">
                  Tipo de atividade
                </span>
                <InfoTip label="O que é o tipo de atividade">
                  Procura a tua profissão na lista oficial (Art. 151.º do CIRS).
                  Define a taxa de retenção na fonte, o coeficiente do regime
                  simplificado e a base da Segurança Social.
                </InfoTip>
              </div>
              <ActivityCombobox
                value={atividade}
                onChange={escolherAtividade}
              />
              <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-brand-light px-2.5 py-1 font-semibold text-brand-dark">
                  Retenção {pct(ef.retencao)}
                </span>
                <span className="rounded-lg bg-stone-100 px-2.5 py-1 font-medium text-stone-500">
                  Coeficiente {pct(ef.coef)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-400">
                {ef.nota ?? META_TIPO[tipo].info}
              </p>
            </div>

            {/* ── Regime de IVA ─────────────────────────────────────────── */}
            <fieldset className="mb-6">
              <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-stone-500">
                Regime de IVA · {META_REGIAO[regiao]}
                <InfoTip label="O que é o regime de IVA">
                  Abaixo de 15.000 €/ano ficas isento (Art. 53.º). Acima, cobras
                  IVA à taxa da tua atividade e região.
                </InfoTip>
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ivaOptions.map((op) => {
                  const active = regimeIVA === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setRegimeIVA(op.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        active
                          ? "border-brand bg-brand-light"
                          : "border-stone-200 hover:border-stone-300 bg-stone-50"
                      }`}
                    >
                      <div
                        className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700"}`}
                      >
                        {op.label}
                      </div>
                      <div
                        className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}
                      >
                        {op.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* ── Situação fiscal ──────────────────────────────────────── */}
            <div className="space-y-3">
              {checkboxes.map((cb) => (
                <button
                  key={cb.id}
                  type="button"
                  role="checkbox"
                  aria-checked={cb.val}
                  onClick={() => cb.set(!cb.val)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    cb.val
                      ? "border-brand bg-brand-light"
                      : "border-stone-200 hover:border-stone-300 bg-stone-50"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      cb.val
                        ? "bg-brand border-brand text-white"
                        : "border-stone-300 text-transparent"
                    }`}
                  >
                    <Check size={12} />
                  </div>
                  <div>
                    <div
                      className={`text-sm font-semibold ${cb.val ? "text-brand-dark" : "text-stone-700"}`}
                    >
                      {cb.label}
                    </div>
                    <div
                      className={`text-xs ${cb.val ? "text-brand" : "text-stone-400"}`}
                    >
                      {cb.sub}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* ── Opções avançadas ─────────────────────────────────────── */}
            <div className="mt-5 pt-5 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                aria-expanded={advanced}
                onClick={() => setAdvanced((v) => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-700 transition-colors"
              >
                <span>Opções avançadas</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`transition-transform ${advanced ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <AnimatePresence>
                {advanced && (
                  <m.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-5">
                      {/* Região */}
                      <div>
                        <span className="text-sm font-medium text-stone-500 uppercase tracking-wider block mb-2">
                          Região
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {REGIOES.map((r) => {
                            const active = regiao === r;
                            return (
                              <button
                                key={r}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setRegiao(r)}
                                className={`p-2.5 rounded-xl border text-center text-sm font-semibold transition-all ${
                                  active
                                    ? "border-brand bg-brand-light text-brand-dark"
                                    : "border-stone-200 hover:border-stone-300 bg-stone-50 text-stone-600"
                                }`}
                              >
                                {META_REGIAO[r]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Base SS */}
                      <div>
                        <span className="text-sm font-medium text-stone-500 uppercase tracking-wider block mb-2">
                          Natureza para a Segurança Social
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {BASES_SS.map((b) => {
                            const active = baseSS === b;
                            return (
                              <button
                                key={b}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setBaseSS(b)}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                  active
                                    ? "border-brand bg-brand-light"
                                    : "border-stone-200 hover:border-stone-300 bg-stone-50"
                                }`}
                              >
                                <div
                                  className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700"}`}
                                >
                                  {META_BASE_SS[b].label}
                                </div>
                                <div
                                  className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}
                                >
                                  {META_BASE_SS[b].sub}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* IRS Jovem */}
                      <div>
                        <label
                          htmlFor="irs-jovem"
                          className="text-sm font-medium text-stone-500 uppercase tracking-wider block mb-2"
                        >
                          IRS Jovem (até {IRS_JOVEM.idadeMax.value} anos)
                        </label>
                        <select
                          id="irs-jovem"
                          value={irsJovemAno}
                          onChange={(e) =>
                            setIrsJovemAno(Number(e.target.value))
                          }
                          className="w-full px-4 py-3 text-sm font-semibold text-stone-700 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700"
                        >
                          <option value={0}>Não aplicável</option>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(
                            (ano) => (
                              <option key={ano} value={ano}>
                                {`${ano}.º ano de rendimentos — isenção ${pct(IRS_JOVEM.isencaoPorAno.value[ano])}`}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      {/* Custos da empresa */}
                      <div>
                        <div className="mb-2">
                          <span className="text-sm font-medium text-stone-500 uppercase tracking-wider">
                            Custos extra da empresa (€/ano)
                          </span>
                        </div>
                        <NumericSlider
                          label=""
                          value={custosEmpresa}
                          min={0}
                          max={10000}
                          step={500}
                          unit="€"
                          onChange={setCustosEmpresa}
                          presets={[1000, 2000, 3000, 5000]}
                          tooltip="Contabilidade, secretariado, software de faturação, etc. O valor por defeito (2 000 €/ano) é uma estimativa típica."
                        />
                      </div>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ════ Coluna direita: Resultado ════ */}
          <div className="bg-cream p-8 lg:p-10 flex flex-col dark:bg-stone-900">
            <AnimatePresence mode="wait">
              {cenario === "rv" ? (
                /* ── Painel Recibos Verdes ── */
                <m.div
                  key="rv"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col flex-1"
                >
                  <div className="mb-8">
                    <div className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-1">
                      O que é realmente teu
                      {modoInput === "recibo" && " · por recibo"}
                    </div>
                    <div className="font-display text-5xl font-semibold leading-none mb-1 text-brand">
                      <AnimatedNumber value={resultRecibo.liquido} />
                    </div>
                    <div className="text-sm text-stone-400 mt-1">
                      de{" "}
                      <AnimatedNumber
                        value={resultRecibo.bruto + resultRecibo.iva}
                      />{" "}
                      faturados
                      {resultRecibo.taxaIVA > 0 && (
                        <span>
                          {" · "}entra na conta:{" "}
                          <AnimatedNumber value={resultRecibo.entradaConta} />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra visual */}
                  <div className="mb-6">
                    <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
                      <div
                        className="transition-all duration-500 rounded-l-full"
                        style={{
                          width: barW(resultRecibo.liquido),
                          background: "#1D9E75",
                        }}
                      />
                      {resultRecibo.retencaoIRS > 0 && (
                        <div
                          className="transition-all duration-500"
                          style={{
                            width: barW(resultRecibo.retencaoIRS),
                            background: "#9FE1CB",
                          }}
                        />
                      )}
                      {resultRecibo.iva > 0 && (
                        <div
                          className="transition-all duration-500"
                          style={{
                            width: barW(resultRecibo.iva),
                            background: "#FFF8A0",
                          }}
                        />
                      )}
                      {resultRecibo.segSocial > 0 && (
                        <div
                          className="transition-all duration-500 rounded-r-full"
                          style={{
                            width: barW(resultRecibo.segSocial),
                            background: "#D3D1C7",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: "Teu", color: "#1D9E75", show: true },
                        {
                          label: "Retenção IRS",
                          color: "#9FE1CB",
                          show: resultRecibo.retencaoIRS > 0,
                        },
                        {
                          label: "IVA",
                          color: "#E8D97A",
                          show: resultRecibo.iva > 0,
                        },
                        {
                          label: "Seg. Social",
                          color: "#B4B2A9",
                          show: resultRecibo.segSocial > 0,
                        },
                      ]
                        .filter((l) => l.show)
                        .map((l) => (
                          <div
                            key={l.label}
                            className="flex items-center gap-1.5"
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ background: l.color }}
                            />
                            <span className="text-xs text-stone-500">
                              {l.label}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="space-y-1 flex-1">
                    <DetalheRow
                      label="Valor do serviço"
                      value={resultRecibo.bruto}
                      type="neutral"
                      note="O que faturaste"
                    />
                    {resultRecibo.isencaoJovem > 0 && (
                      <DetalheRow
                        label={`IRS Jovem (isenção ${pct(resultRecibo.isencaoJovem)})`}
                        value={0}
                        type="neutral"
                        note="Reduz a base de retenção"
                        hideValue
                      />
                    )}
                    {resultRecibo.taxaIVA > 0 && (
                      <DetalheRow
                        label={`IVA cobrado (${pct(resultRecibo.taxaIVA)})`}
                        value={resultRecibo.iva}
                        type="warning"
                        note="Pertence ao Estado"
                      />
                    )}
                    {resultRecibo.taxaIVA > 0 && (
                      <DetalheRow
                        label="O cliente paga"
                        value={resultRecibo.bruto + resultRecibo.iva}
                        type="neutral"
                        note="Valor base + IVA"
                      />
                    )}
                    {resultRecibo.retencaoIRS > 0 && (
                      <DetalheRow
                        label={`Retenção na fonte (${pct(resultRecibo.taxaRetencao)})`}
                        value={-resultRecibo.retencaoIRS}
                        type="deducao"
                        note="Adiantamento de IRS"
                      />
                    )}
                    <DetalheRow
                      label="Entra na tua conta"
                      value={resultRecibo.entradaConta}
                      type="subtotal"
                      note={
                        resultRecibo.taxaIVA > 0
                          ? "Bruto + IVA − Retenção"
                          : "Após retenção"
                      }
                    />
                    {resultRecibo.taxaIVA > 0 && (
                      <DetalheRow
                        label="Reservar para IVA"
                        value={-resultRecibo.iva}
                        type="warning"
                        note="Entrega trimestral"
                      />
                    )}
                    {resultRecibo.segSocial > 0 && (
                      <DetalheRow
                        label={`Reservar para SS (${pct(SS_TAXA.value)})`}
                        value={-resultRecibo.segSocial}
                        type="deducao"
                        note="Pagamento mensal"
                      />
                    )}

                    {/* Resultado final */}
                    <div className="mt-4 p-4 rounded-2xl border-2 border-brand bg-white dark:bg-stone-950">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                              Disponível para gastar
                            </div>
                            <InfoTip>
                              O que é mesmo teu: bruto menos IRS e Segurança
                              Social. O IVA não entra aqui — é dinheiro do
                              Estado que só passa pela tua conta.
                            </InfoTip>
                          </div>
                          <div className="text-xs text-stone-400 mt-0.5">
                            {resultRecibo.taxaIVA > 0
                              ? "O IVA é do Estado — não conta aqui"
                              : "Sem culpa, sem surpresas"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-2xl font-semibold text-brand">
                            <AnimatedNumber value={resultRecibo.liquido} />
                          </div>
                          <div className="text-xs text-stone-400">
                            {pct(
                              resultRecibo.liquido / (resultRecibo.bruto || 1),
                            )}{" "}
                            do bruto
                          </div>
                        </div>
                      </div>
                    </div>

                    {resultRecibo.avisos.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {resultRecibo.avisos.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 p-3 rounded-xl border bg-alert-bg border-alert-border"
                          >
                            <span className="text-alert-text mt-0.5 flex-shrink-0">
                              <Warning size={14} />
                            </span>
                            <span className="text-xs leading-relaxed text-alert-text">
                              {a}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-stone-400 mt-5 leading-relaxed">
                    Estimativa de tesouraria por recibo. Taxas de 2026. Não
                    substitui aconselhamento de um contabilista certificado.
                  </p>
                  <Link
                    href="/dashboard/simulador"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand-dark"
                  >
                    Ver o apuramento anual de IRS (regime simplificado e
                    escalões)
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M5 12h13M13 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </m.div>
              ) : (
                /* ── Painel Empresa ── */
                <m.div
                  key="empresa"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col flex-1"
                >
                  {/* Aviso de anualização quando estamos em modo por-recibo */}
                  {avisoAnualizacao && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-500 dark:border-stone-700 dark:bg-stone-800">
                      <Warning
                        size={13}
                        className="flex-shrink-0 mt-0.5 text-stone-400"
                      />
                      <span>{avisoAnualizacao}</span>
                    </div>
                  )}

                  <div className="mb-8">
                    <div className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-1">
                      Líquido estimado — empresa
                    </div>
                    <div className="font-display text-5xl font-semibold leading-none mb-1 text-brand">
                      <AnimatedNumber
                        value={resultComparacao.empresa.liquido}
                      />
                    </div>
                    <div className="text-sm text-stone-400 mt-1">
                      de <AnimatedNumber value={brutoAnual} /> faturados/ano
                    </div>
                  </div>

                  {/* Barra empresa */}
                  <div className="mb-6">
                    <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
                      {(() => {
                        const total = brutoAnual || 1;
                        return (
                          <>
                            <div
                              className="transition-all duration-500 rounded-l-full"
                              style={{
                                width: `${(resultComparacao.empresa.liquido / total) * 100}%`,
                                background: "#1D9E75",
                              }}
                            />
                            <div
                              className="transition-all duration-500"
                              style={{
                                width: `${((resultComparacao.empresa.irc + resultComparacao.empresa.derrama) / total) * 100}%`,
                                background: "#9FE1CB",
                              }}
                            />
                            <div
                              className="transition-all duration-500"
                              style={{
                                width: `${(resultComparacao.empresa.dividendos / total) * 100}%`,
                                background: "#FBBF24",
                              }}
                            />
                            <div
                              className="transition-all duration-500 rounded-r-full"
                              style={{
                                width: `${(resultComparacao.empresa.custosEmpresa / total) * 100}%`,
                                background: "#D3D1C7",
                              }}
                            />
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: "Teu (após dividendos)", color: "#1D9E75" },
                        { label: "IRC + Derrama", color: "#9FE1CB" },
                        { label: "IRS Dividendos (28%)", color: "#FBBF24" },
                        { label: "Custos empresa", color: "#B4B2A9" },
                      ].map((l) => (
                        <div
                          key={l.label}
                          className="flex items-center gap-1.5"
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: l.color }}
                          />
                          <span className="text-xs text-stone-500">
                            {l.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Breakdown empresa */}
                  <div className="space-y-1 flex-1">
                    <DetalheRow
                      label="Faturação"
                      value={brutoAnual}
                      type="neutral"
                      note="Volume de negócios anual"
                    />
                    <DetalheRow
                      label="Custos da empresa"
                      value={-resultComparacao.empresa.custosEmpresa}
                      type="deducao"
                      note="Contabilidade + admin (estimativa)"
                    />
                    <DetalheRow
                      label="Lucro tributável"
                      value={resultComparacao.empresa.lucroTributavel}
                      type="subtotal"
                      note="Antes de IRC"
                    />
                    <DetalheRow
                      label="IRC + Derrama"
                      value={
                        -(
                          resultComparacao.empresa.irc +
                          resultComparacao.empresa.derrama
                        )
                      }
                      type="deducao"
                      note="15% (PME, primeiros 50k€) + 19% + derrama ~1,5%"
                    />
                    <DetalheRow
                      label="IRS sobre dividendos"
                      value={-resultComparacao.empresa.dividendos}
                      type="warning"
                      note="Taxa liberatória 28% (Art. 71.º CIRS)"
                    />

                    <div className="mt-4 p-4 rounded-2xl border-2 border-brand bg-white dark:bg-stone-950">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                            Líquido para o dono
                          </div>
                          <div className="text-xs text-stone-400 mt-0.5">
                            Após IRC, derrama e IRS de dividendos
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-2xl font-semibold text-brand">
                            <AnimatedNumber
                              value={resultComparacao.empresa.liquido}
                            />
                          </div>
                          <div className="text-xs text-stone-400">
                            {pct(
                              resultComparacao.empresa.liquido /
                                (brutoAnual || 1),
                            )}{" "}
                            do bruto
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-stone-400 mt-5 leading-relaxed">
                    Estimativa de ordem de grandeza. Não considera salário/SS do
                    gerente, tributação autónoma, englobamento de dividendos nem
                    custos de constituição. Consulta um contabilista
                    certificado.
                  </p>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Comparação integrada (rodapé) ─────────────────────────────── */}
        <div className="border-t border-stone-100 bg-stone-50 px-8 py-6 dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-600">
            Comparação — mesmos inputs, dois cenários
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
            {/* Card Recibos Verdes */}
            <div
              className={`relative rounded-2xl p-4 transition-all ${
                !empresaVence
                  ? "border-2 border-brand bg-brand-light dark:bg-brand/10"
                  : "border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
              }`}
            >
              {!empresaVence && (
                <span className="absolute right-3 top-3 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white">
                  Melhor
                </span>
              )}
              <div
                className={`text-sm font-semibold ${!empresaVence ? "text-brand-dark" : "text-stone-700"}`}
              >
                Recibos Verdes
              </div>
              <div className="mt-0.5 text-[11px] text-stone-400">
                Categoria B
              </div>
              <div
                className={`mt-2 font-display text-2xl font-semibold tabular-nums ${!empresaVence ? "text-brand-dark" : "text-stone-800 dark:text-stone-200"}`}
              >
                <AnimatedNumber value={resultComparacao.freelancer.liquido} />
              </div>
              <div className="text-[11px] text-stone-400">
                líquido para ti / ano
              </div>
            </div>

            {/* Card Empresa */}
            <div
              className={`relative rounded-2xl p-4 transition-all ${
                empresaVence
                  ? "border-2 border-brand bg-brand-light dark:bg-brand/10"
                  : "border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
              }`}
            >
              {empresaVence && (
                <span className="absolute right-3 top-3 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white">
                  Melhor
                </span>
              )}
              <div
                className={`text-sm font-semibold ${empresaVence ? "text-brand-dark" : "text-stone-700"}`}
              >
                Empresa
              </div>
              <div className="mt-0.5 text-[11px] text-stone-400">
                IRC + dividendos
              </div>
              <div
                className={`mt-2 font-display text-2xl font-semibold tabular-nums ${empresaVence ? "text-brand-dark" : "text-stone-800 dark:text-stone-200"}`}
              >
                <AnimatedNumber value={resultComparacao.empresa.liquido} />
              </div>
              <div className="text-[11px] text-stone-400">
                líquido para ti / ano
              </div>
            </div>
          </div>

          {/* Veredicto */}
          <div
            className={`flex items-center gap-2.5 rounded-2xl p-3.5 text-sm font-semibold ${
              empresaVence
                ? "bg-brand-light text-brand-dark"
                : "bg-cream text-stone-700"
            }`}
          >
            <span className="flex-shrink-0 text-brand">
              <Check size={16} />
            </span>
            {empresaVence ? (
              <span>
                Com {fmt(brutoAnual)}/ano, a empresa deixa-te com mais{" "}
                <strong>{fmt(Math.abs(resultComparacao.diferenca))}</strong>
                /ano.
              </span>
            ) : (
              <span>
                Com {fmt(brutoAnual)}/ano, os recibos verdes deixam-te com mais{" "}
                <strong>{fmt(Math.abs(resultComparacao.diferenca))}</strong>
                /ano.
              </span>
            )}
          </div>

          {/* Nota fiscal */}
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-4">
            <span className="mt-0.5 flex-shrink-0 text-alert-text">
              <Warning size={14} />
            </span>
            <p className="text-xs leading-relaxed text-alert-text">
              Estimativa de ordem de grandeza: atividade do Art. 151.º, cerca de{" "}
              {fmt(custosEmpresa)}/ano de custos extra da empresa e distribuição
              de todo o lucro como dividendos. Não considera salário/Segurança
              Social do gerente, tributação autónoma, englobamento de
              dividendos, isenção SS do 1.º ano dos recibos verdes, nem custos
              de constituição. A decisão de abrir uma sociedade deve ser sempre
              validada com um contabilista certificado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
