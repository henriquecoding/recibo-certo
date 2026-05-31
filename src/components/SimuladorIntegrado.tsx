"use client";

/**
 * SimuladorIntegrado.tsx — Simulador Fiscal Portugal 2026
 * ═══════════════════════════════════════════════════════════════════
 *
 * FONTES LEGAIS UTILIZADAS (todos os valores são 2026):
 *
 * IRS:
 *  · Art. 31.º CIRS — coeficientes regime simplificado
 *    - 0,75 → prestações de serviços / profissões liberais (Art. 151.º)
 *    - 0,15 → vendas de mercadorias
 *    - 0,35 → alojamento local / hotelaria / outras prestações
 *    - 0,75 → propriedade intelectual / direitos de autor
 *  · Art. 68.º CIRS — escalões IRS 2026 (atualizados 3,51% OE2026)
 *    Mínimo de existência: 12 880€ (OE2026, SMN 920€/mês)
 *  · Art. 101.º e 101.º-B CIRS — retenção na fonte
 *    - 23% profissões liberais Art. 151.º (desceu de 25% no OE2025)
 *    - 16,5% propriedade intelectual
 *    - 11,5% outras prestações não Art. 151.º
 *    - 0% vendas / hotelaria / alojamento local
 *    Dispensa: faturação < 15 000€/ano OU 1.º ano atividade
 *  · Art. 12.º-B CIRS — IRS Jovem (OE2025, em vigor a partir 2025)
 *    Isenção: 100%/75%/75%/75%/50%/50%/50%/25%/25%/25% (anos 1–10)
 *    Limite: 55×IAS = 29 542,15€/ano (IAS 2026 = 537,13€)
 *    Idade máxima: 35 anos. Aplica-se a Cat. A e Cat. B.
 *    Conta anos desde 1.º rendimento como não-dependente.
 *  · Solidariedade adicional: 2,5% (80 000€–250 000€), 5% (> 250 000€)
 *
 * Segurança Social (trabalhadores independentes):
 *  · Código Regimes Contributivos (CRC) — Dec. Lei 110/2009
 *    - Taxa: 21,4% sobre 70% do rendimento relevante
 *    - Rendimento relevante: faturação trimestre anterior × 70% ÷ 3
 *    - Mínimo: 20€/mês
 *    - Máximo: 12 × IAS × 21,4% = 12 × 537,13 × 0,214 ≈ 1 379,37€/mês
 *    - IAS 2026: 537,13€
 *  · Isenção 1.º ano: automática (12 meses desde abertura de atividade)
 *  · Isenção acumulação: rendimento SS do emprego ≥ 1×IAS E
 *    rendimento médio mensal relevante de TI < 4×IAS (2 148,52€)
 *  · SS dedutível ao rendimento tributável IRS (art. 31.º n.º 2 CIRS)
 *
 * IVA (CIVA):
 *  · Art. 53.º CIVA — isenção até 15 000€/ano (2026)
 *    Se ultrapassar 25% → transição imediata aos 18 750€
 *    Se terminar o ano entre 15 001€–18 750€ → troca em 1-jan do ano seguinte
 *  · Art. 9.º CIVA — isenção por natureza (médicos, enfermeiros, psicólogos,
 *    professores, formadores, músicos — sem limite de faturação)
 *  · Taxas continente: reduzida 6%, intermédia 13%, normal 23%
 *  · Taxas Açores: reduzida 4%, intermédia 9%, normal 16%
 *  · Taxas Madeira: reduzida 5%, intermédia 12%, normal 22%
 *
 * IRC (sociedades):
 *  · Lei n.º 73-A/2025 (OE2026):
 *    - Taxa geral: 19% (desceu de 20% em 2025)
 *    - PME + Small Mid Cap: 15% sobre primeiros 50 000€
 *    - PME: excedente a 50 000€ → 19%
 *  · Derrama municipal: até 1,5% (Lisboa, Porto e maioria dos concelhos)
 *  · Derrama estadual: só acima de 1 500 000€ de lucro (irrelevante para PME)
 *  · IRS dividendos: 28% (taxa liberatória, Art. 71.º CIRS)
 *  · SS gerente: empresa 23,75% + trabalhador 11% sobre salário bruto
 *
 * Correções aplicadas:
 *  · [BUG1] Thumb slider: contentor agora tem h-8, visual bar absoluta em
 *    top-1/2 -translate-y-1/2. Thumb 100% dentro do hit area — sem deslocamento.
 *  · [BUG2] IVA: removido toggle "Com IVA incluído / IVA à parte" que entrava
 *    em conflito com o seletor de regime IVA. Input sempre em base pré-IVA.
 *  · [BUG3] Inputs: adicionado clampFree (só min/max, sem step) para inputs de
 *    texto — permite qualquer valor decimal. clamp com step mantido apenas para
 *    arrastar slider e botões ±.
 */

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  ChangeEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { m, AnimatePresence } from "motion/react";
import Link from "next/link";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { Check, Warning } from "@/components/ui/Icons";
import { pct, fmt } from "@/lib/format";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import InfoTip from "@/components/ui/InfoTip";
import {
  IVA_TAXAS,
  ATIVIDADES,
  META_REGIAO,
  META_BASE_SS,
  IRS_JOVEM,
  DISPENSA_RETENCAO_LIMITE,
  type Atividade,
  type Regiao,
  type BaseSS,
  type EscalaoIVA,
} from "@/lib/fiscal-data";
import { calcular, taxaIVAEfetiva, type RegimeIVA } from "@/lib/fiscal";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES FISCAIS 2026
// ─────────────────────────────────────────────────────────────────────────────

const IAS_2026 = 537.13;
const MINIMO_EXISTENCIA_2026 = 12_880;
const SS_TAXA_TI = 0.214;
const SS_BASE_PCT = 0.7;
const SS_MAX_MENSAL = 12 * IAS_2026 * SS_TAXA_TI;
const SS_MIN_MENSAL = 20;
const IVA_ISENCAO_LIMITE = 15_000;
const IVA_ISENCAO_LIMITE_IMEDIATO = 18_750;
const IRS_JOVEM_LIMITE_2026 = 55 * IAS_2026;

const IRS_JOVEM_ISENCAO: Record<number, number> = {
  1: 1.0,
  2: 0.75,
  3: 0.75,
  4: 0.75,
  5: 0.5,
  6: 0.5,
  7: 0.5,
  8: 0.25,
  9: 0.25,
  10: 0.25,
};

const IRS_JOVEM_IDADE_MAX = 35;

const ESCALOES_IRS_2026 = [
  { ate: 8_342, taxa: 0.125 },
  { ate: 12_587, taxa: 0.167 },
  { ate: 17_838, taxa: 0.212 },
  { ate: 23_089, taxa: 0.241 },
  { ate: 29_400, taxa: 0.311 },
  { ate: 43_092, taxa: 0.364 },
  { ate: 80_000, taxa: 0.45 },
  { ate: 250_000, taxa: 0.48 },
  { ate: Infinity, taxa: 0.48 },
] as const;

const TIPO_ATIVIDADE_PARAMS = {
  art151: {
    coef: 0.75,
    ret: 0.23,
    label: "Profissão liberal — Art. 151.º CIRS",
  },
  vendas: { coef: 0.15, ret: 0.0, label: "Vendas / mercadorias" },
  hosped: { coef: 0.35, ret: 0.0, label: "Alojamento local / hotelaria" },
  outras: { coef: 0.35, ret: 0.115, label: "Outras prestações de serviços" },
  prop_int: {
    coef: 0.75,
    ret: 0.165,
    label: "Propriedade intelectual / direitos de autor",
  },
} as const;

type TipoAtividade = keyof typeof TIPO_ATIVIDADE_PARAMS;

const IRC_PME = {
  taxa1: 0.15,
  limite: 50_000,
  taxa2: 0.19,
};

const DERRAMA_MUNI = 0.015;
const IRS_DIVIDENDOS = 0.28;
const SS_EMP_TAXA = 0.2375;
const SS_TRAB_TAXA = 0.11;

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES DE CÁLCULO FISCAL
// ─────────────────────────────────────────────────────────────────────────────

function calcularIRS(rendTributavel: number): number {
  if (rendTributavel <= 0) return 0;
  if (rendTributavel <= MINIMO_EXISTENCIA_2026) return 0;

  let imposto = 0;
  let base = rendTributavel;

  for (let i = ESCALOES_IRS_2026.length - 1; i >= 0; i--) {
    const escalao = ESCALOES_IRS_2026[i];
    const prevMax = i > 0 ? ESCALOES_IRS_2026[i - 1].ate : 0;

    if (base > prevMax) {
      const parcelaEscalao = base - prevMax;
      imposto += parcelaEscalao * escalao.taxa;
      base = prevMax;
    }
  }

  return Math.max(0, imposto);
}

function calcularSSAnual(faturacaoAnual: number): number {
  const rendRelevMensal = (faturacaoAnual * SS_BASE_PCT) / 12;
  const contribuicaoMensal = Math.min(
    SS_MAX_MENSAL,
    Math.max(SS_MIN_MENSAL, rendRelevMensal * SS_TAXA_TI),
  );
  return contribuicaoMensal * 12;
}

interface ResultadoAnualRV {
  faturacao: number;
  coeficiente: number;
  rendColetavel: number;
  ssAnual: number;
  isencaoJovemValor: number;
  isencaoJovemPct: number;
  rendTributavel: number;
  irs: number;
  retencaoAnual: number;
  acertoIRS: number;
  liquido: number;
  taxaEfetiva: number;
}

function simularAnualRV(
  faturacao: number,
  tipo: TipoAtividade,
  irsJovemAno: number,
  isencaoSS: boolean,
): ResultadoAnualRV {
  const { coef, ret } = TIPO_ATIVIDADE_PARAMS[tipo];
  const rendColetavel = faturacao * coef;

  const ssAnual = isencaoSS ? 0 : calcularSSAnual(faturacao);

  const isencaoPct =
    irsJovemAno > 0 ? (IRS_JOVEM_ISENCAO[irsJovemAno] ?? 0) : 0;
  const baseJovem = Math.min(rendColetavel, IRS_JOVEM_LIMITE_2026);
  const isencaoJovemValor = baseJovem * isencaoPct;

  const rendTributavel = Math.max(
    0,
    rendColetavel - ssAnual - isencaoJovemValor,
  );

  const irs = calcularIRS(rendTributavel);
  const retencaoAnual = faturacao * ret;
  const acertoIRS = retencaoAnual - irs;

  const liquido = faturacao - irs - ssAnual;

  return {
    faturacao,
    coeficiente: coef,
    rendColetavel,
    ssAnual,
    isencaoJovemValor,
    isencaoJovemPct: isencaoPct,
    rendTributavel,
    irs,
    retencaoAnual,
    acertoIRS,
    liquido,
    taxaEfetiva: faturacao > 0 ? (irs + ssAnual) / faturacao : 0,
  };
}

interface ResultadoEmpresa {
  faturacao: number;
  despesasOper: number;
  custosExtra: number;
  salGerente: number;
  ssSalGerente: number;
  totalCustos: number;
  lucroTributavel: number;
  irc: number;
  derramaMuni: number;
  lucroLiquido: number;
  dividendos: number;
  irsDividendos: number;
  liquidoGerente: number;
  taxaEfetiva: number;
}

function simularEmpresa(
  faturacao: number,
  despesasOper: number,
  custosExtra: number,
  salGerenteMensal: number,
  distribuirDividendos: boolean,
): ResultadoEmpresa {
  const salGerente = salGerenteMensal * 12;
  const ssSalGerente = salGerente * (SS_EMP_TAXA + SS_TRAB_TAXA);
  const totalCustos = despesasOper + custosExtra + salGerente + ssSalGerente;
  const lucroTributavel = Math.max(0, faturacao - totalCustos);

  let irc = 0;
  if (lucroTributavel <= IRC_PME.limite) {
    irc = lucroTributavel * IRC_PME.taxa1;
  } else {
    irc =
      IRC_PME.limite * IRC_PME.taxa1 +
      (lucroTributavel - IRC_PME.limite) * IRC_PME.taxa2;
  }

  const derramaMuni = lucroTributavel * DERRAMA_MUNI;
  const lucroLiquido = lucroTributavel - irc - derramaMuni;

  let dividendos = 0;
  let irsDividendos = 0;
  if (distribuirDividendos) {
    dividendos = lucroLiquido;
    irsDividendos = dividendos * IRS_DIVIDENDOS;
  }

  const salarioLiqGerente = salGerente * (1 - SS_TRAB_TAXA);
  const liquidoGerente = salarioLiqGerente + (dividendos - irsDividendos);

  return {
    faturacao,
    despesasOper,
    custosExtra,
    salGerente,
    ssSalGerente,
    totalCustos,
    lucroTributavel,
    irc,
    derramaMuni,
    lucroLiquido,
    dividendos,
    irsDividendos,
    liquidoGerente,
    taxaEfetiva: faturacao > 0 ? 1 - liquidoGerente / faturacao : 0,
  };
}

function calcularBreakEven(
  tipo: TipoAtividade,
  custosExtra: number,
  despesasOper: number,
  salGerenteMensal: number,
): number | null {
  for (let v = 0; v <= 200_000; v += 2_000) {
    const rv = simularAnualRV(v, tipo, 0, false);
    const em = simularEmpresa(
      v,
      despesasOper,
      custosExtra,
      salGerenteMensal,
      true,
    );
    if (em.liquidoGerente > rv.liquido) return v;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS E CONSTANTES DE UI
// ─────────────────────────────────────────────────────────────────────────────

type ModoInput = "recibo" | "anual";
type CenarioAtivo = "rv" | "empresa";

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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: NumericSlider
// ─────────────────────────────────────────────────────────────────────────────
// CORREÇÕES APLICADAS:
//  [BUG1] Hit area: trackRef agora tem h-8, visual bar é div absoluta centrada.
//         Thumb (h-6) fica 100% dentro do contentor de eventos — sem gap.
//  [BUG3] clampFree: inputs de texto usam clampFree (só min/max, sem step).
//         Slider e botões ± continuam a usar clamp com step.
// ─────────────────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (!focused) setInputStr(String(value));
  }, [value, focused]);

  // [BUG3 FIX] clamp com step — para slider e botões ±
  const clamp = useCallback(
    (v: number) => Math.round(Math.min(max, Math.max(min, v)) / step) * step,
    [min, max, step],
  );

  // [BUG3 FIX] clampFree sem step — para inputs de texto (aceita qualquer decimal)
  const clampFree = useCallback(
    (v: number) => Math.min(max, Math.max(min, v)),
    [min, max],
  );

  const pctVal = ((value - min) / (max - min)) * 100;
  const bePct =
    breakPoint != null ? ((breakPoint - min) / (max - min)) * 100 : null;

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
    (e: ReactPointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      onChange(getFromPointer(e.clientX));
    },
    [getFromPointer, onChange],
  );
  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (dragging) onChange(getFromPointer(e.clientX));
    },
    [dragging, getFromPointer, onChange],
  );
  const onPointerUp = useCallback(() => setDragging(false), []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
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

  // [BUG3 FIX] handleInputChange usa clampFree → permite qualquer valor decimal
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d,\.]/g, "");
    setInputStr(raw);
    const n = parseFloat(raw.replace(",", "."));
    if (!isNaN(n)) onChange(clampFree(n));
  };

  // [BUG3 FIX] handleInputBlur usa clampFree → não arredonda ao step
  const handleInputBlur = () => {
    setFocused(false);
    const n = parseFloat(inputStr.replace(",", "."));
    const v = isNaN(n) ? value : clampFree(n);
    onChange(v);
    setInputStr(String(v));
  };

  return (
    <div className="space-y-3">
      {/* Linha: label + steppers + input */}
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
          {/* Botão − usa clamp com step */}
          <button
            type="button"
            onPointerDown={(e) => {
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

          {/* Botão + usa clamp com step */}
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

      {/*
       * [BUG1 FIX] Slider restructured:
       * Antes: balloon (h-7 separado) + track (h-3, ref aqui, thumb absoluto com top-1/2 -translate-y-1/2)
       *        → thumb (h-6=24px) estendia fora do track (h-3=12px), lower half sem eventos
       *
       * Agora: balloon (h-6 separado) + trackRef div (h-8=32px, hit area grande)
       *        → visual bar é absoluta centrada dentro do h-8
       *        → thumb (h-6=24px) centrado via top-1/2/-translate-y-1/2 dentro do h-8
       *        → thumb fica totalmente dentro do hit area: (32-24)/2=4px de margem em cima e baixo
       */}

      {/* Balão flutuante — separado mas sem eventos */}
      <div className="pointer-events-none relative h-6">
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

      {/* Hit area (h-8) — ref aqui, capta eventos em toda a altura */}
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
        className={`relative h-8 select-none focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* Visual track bar — absoluta e centrada verticalmente dentro do h-8 */}
        <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-stone-100 dark:bg-stone-800">
          {/* Faixa preenchida */}
          <div
            className="h-full rounded-full bg-brand transition-none"
            style={{ width: `${pctVal}%` }}
          />

          {/* Marcador break-even */}
          {bePct != null && (
            <div
              className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-alert-text"
              style={{ left: `${bePct}%` }}
              aria-hidden
            />
          )}
        </div>

        {/* Thumb — centrado dentro do h-8 (4px de margem top e bottom) */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${pctVal}%` }}
        >
          <m.div
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
      </div>

      {/* Rótulos min / break-even / max */}
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

      {/* Pré-sets */}
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: DetalheRow
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: EmpresaInputs
// ─────────────────────────────────────────────────────────────────────────────

interface EmpresaInputsProps {
  despesasOper: number;
  custosExtra: number;
  salGerenteMensal: number;
  distribuirDividendos: boolean;
  onDespChange: (v: number) => void;
  onCustosChange: (v: number) => void;
  onSalChange: (v: number) => void;
  onDividendosChange: (v: boolean) => void;
}

function EmpresaInputs({
  despesasOper,
  custosExtra,
  salGerenteMensal,
  distribuirDividendos,
  onDespChange,
  onCustosChange,
  onSalChange,
  onDividendosChange,
}: EmpresaInputsProps) {
  return (
    <div className="mt-5 pt-5 border-t border-stone-100 dark:border-stone-800 space-y-5">
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
        Parâmetros da empresa
      </div>

      <NumericSlider
        label="Despesas operacionais (€/ano)"
        value={despesasOper}
        min={0}
        max={50_000}
        step={500}
        unit="€"
        onChange={onDespChange}
        presets={[0, 2000, 5000, 10000]}
        tooltip={
          <>
            Despesas com atividade da empresa — material, viagens,
            subcontratação, rendas, publicidade. Deduzidas ao lucro tributável
            antes de IRC.
          </>
        }
      />

      <NumericSlider
        label="Custos extra — estrutura (€/ano)"
        value={custosExtra}
        min={0}
        max={10_000}
        step={200}
        unit="€"
        onChange={onCustosChange}
        presets={[1000, 2000, 3000, 5000]}
        tooltip={
          <>
            Contabilidade (~1 200€), software de faturação (~300€), secretariado
            virtual, seguro, outras despesas fixas. Estimativa 2026: ~2
            000€/ano.
          </>
        }
      />

      <NumericSlider
        label="Salário gerente (€/mês bruto)"
        value={salGerenteMensal}
        min={0}
        max={5_000}
        step={100}
        unit="€"
        onChange={onSalChange}
        presets={[0, 920, 1500, 2500]}
        tooltip={
          <>
            Salário bruto mensal do gerente-sócio. A empresa paga SS patronal
            23,75% e o gerente paga SS trabalhador 11%. O salário é custo
            dedutível ao IRC. Mínimo legal 2026: 820€ se trabalho a tempo
            inteiro.
          </>
        }
      />

      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-sm font-medium uppercase tracking-wider text-stone-500">
            Lucro distribuído como dividendos
          </span>
          <InfoTip>
            Se distribuíres o lucro líquido como dividendos, pagas 28% de IRS
            (taxa liberatória, Art. 71.º CIRS). Em alternativa podes optar pelo
            englobamento (pode ser mais favorável a baixos rendimentos) ou reter
            o lucro na empresa. Esta simulação assume taxa liberatória 28%.
          </InfoTip>
        </div>
        <div className="flex gap-2">
          {(
            [
              { v: true, l: "Sim — distribui (28% IRS)" },
              { v: false, l: "Não — retém na empresa" },
            ] as const
          ).map(({ v, l }) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={distribuirDividendos === v}
              onClick={() => onDividendosChange(v)}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-center text-xs font-semibold transition-all ${
                distribuirDividendos === v
                  ? "border-brand bg-brand-light text-brand-dark"
                  : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function SimuladorIntegrado() {
  // ── Modo e cenário ───────────────────────────────────────────────────────
  const [modoInput, setModoInput] = useState<ModoInput>("recibo");
  const [cenario, setCenario] = useState<CenarioAtivo>("rv");

  // ── Valores de entrada ───────────────────────────────────────────────────
  const [bruto, setBruto] = useState(1_500);
  const [brutoAnual, setBrutoAnual] = useState(18_000);

  const [atividade, setAtividade] = useState<Atividade>(ATIVIDADE_DEFAULT);
  const [regiao, setRegiao] = useState<Regiao>("continente");
  const [regimeIVA, setRegimeIVA] = useState<RegimeIVA>("isento");

  // [BUG2 FIX] Removido estado ivaIncluido — o input é sempre a base pré-IVA.
  // O toggle "Com IVA incluído / IVA à parte" entrava em conflito com o
  // seletor de regime IVA já existente. Agora o fluxo é simples:
  //   → utilizador introduz o valor do serviço (sem IVA)
  //   → seletor de regime IVA determina a taxa aplicada
  //   → IVA calculado e apresentado no breakdown

  const [dispensaRetencao, setDispensaRetencao] = useState(false);
  const [isencaoSSPrimeiroAno, setIsencaoSSPrimeiroAno] = useState(false);
  const [acumulaEmprego, setAcumulaEmprego] = useState(false);

  const [irsJovemAno, setIrsJovemAno] = useState(0);
  const [tipoAtiv, setTipoAtiv] = useState<TipoAtividade>("art151");

  // ── Inputs Empresa ───────────────────────────────────────────────────────
  const [despesasOper, setDespesasOper] = useState(0);
  const [custosExtra, setCustosExtra] = useState(2_000);
  const [salGerenteMensal, setSalGerenteMensal] = useState(0);
  const [distribuirDividendos, setDistribuirDividendos] = useState(true);

  // ── Advanced ─────────────────────────────────────────────────────────────
  const [advanced, setAdvanced] = useState(false);

  // ── Sincronização bruto ↔ brutoAnual ────────────────────────────────────
  const handleBrutoChange = useCallback((v: number) => {
    setBruto(v);
    setBrutoAnual(Math.round(v * 12));
  }, []);

  const handleBrutoAnualChange = useCallback((v: number) => {
    setBrutoAnual(v);
    setBruto(Math.round(v / 12 / 50) * 50);
  }, []);

  // ── IVA ──────────────────────────────────────────────────────────────────
  const taxaIva = taxaIVAEfetiva(regiao, regimeIVA);
  const temIva = taxaIva > 0;

  // [BUG2 FIX] base é sempre o valor introduzido (pré-IVA)
  const base = bruto;
  const labelValor = temIva
    ? `Valor do serviço (€) — IVA ${pct(taxaIva)} adicionado ao cliente`
    : "Valor do serviço (€)";

  // ── Resultado por recibo ─────────────────────────────────────────────────
  const isencaoSS = isencaoSSPrimeiroAno || acumulaEmprego;

  const resultRecibo = useMemo(
    () =>
      calcular({
        bruto: base,
        tipo: atividade.tipo,
        regiao,
        regimeIVA,
        baseSS: "servicos",
        dispensaRetencao,
        isencaoSSPrimeiroAno: isencaoSS,
        acumulaEmprego,
        irsJovemAno,
        retencaoOverride: TIPO_ATIVIDADE_PARAMS[tipoAtiv]?.ret,
      }),
    [
      base,
      atividade.tipo,
      regiao,
      regimeIVA,
      dispensaRetencao,
      isencaoSS,
      acumulaEmprego,
      irsJovemAno,
      tipoAtiv,
    ],
  );

  // ── Resultado anual RV ────────────────────────────────────────────────────
  const resultAnualRV = useMemo(
    () => simularAnualRV(brutoAnual, tipoAtiv, irsJovemAno, isencaoSS),
    [brutoAnual, tipoAtiv, irsJovemAno, isencaoSS],
  );

  // ── Resultado empresa ─────────────────────────────────────────────────────
  const resultEmpresa = useMemo(
    () =>
      simularEmpresa(
        brutoAnual,
        despesasOper,
        custosExtra,
        salGerenteMensal,
        distribuirDividendos,
      ),
    [
      brutoAnual,
      despesasOper,
      custosExtra,
      salGerenteMensal,
      distribuirDividendos,
    ],
  );

  const empresaVence = resultEmpresa.liquidoGerente > resultAnualRV.liquido;
  const diferenca = Math.abs(
    resultEmpresa.liquidoGerente - resultAnualRV.liquido,
  );

  // ── Break-even ────────────────────────────────────────────────────────────
  const breakEven = useMemo(
    () =>
      calcularBreakEven(tipoAtiv, custosExtra, despesasOper, salGerenteMensal),
    [tipoAtiv, custosExtra, despesasOper, salGerenteMensal],
  );

  // ── Barra visual RV ───────────────────────────────────────────────────────
  const barsTotal =
    resultRecibo.retencaoIRS +
      resultRecibo.iva +
      resultRecibo.segSocial +
      resultRecibo.liquido || 1;
  const barW = (v: number) =>
    `${Math.max(0, (v / barsTotal) * 100).toFixed(1)}%`;

  // ── IVA options ───────────────────────────────────────────────────────────
  const ivaOptions: { id: RegimeIVA; label: string; sub: string }[] = [
    { id: "isento", label: "Isento", sub: "Art. 53.º" },
    ...ESCALOES_IVA.map((e) => ({
      id: e as RegimeIVA,
      label: pct(IVA_TAXAS[regiao].value[e]),
      sub: ESCALAO_LABEL[e],
    })),
  ];

  // ── Checkboxes ────────────────────────────────────────────────────────────
  const checkboxes = [
    {
      id: "dispensa",
      label: "Dispensa de retenção na fonte",
      sub: `1.º ano ou faturação < ${DISPENSA_RETENCAO_LIMITE.value.toLocaleString("pt-PT")} €/ano (Art. 101.º-B)`,
      val: dispensaRetencao,
      set: setDispensaRetencao,
    },
    {
      id: "ss1ano",
      label: "1.º ano de atividade — isenção SS",
      sub: "Isenção automática de contribuições nos primeiros 12 meses (CRC)",
      val: isencaoSSPrimeiroAno,
      set: setIsencaoSSPrimeiroAno,
    },
    {
      id: "acumula",
      label: "Acumulo com trabalho dependente",
      sub: `Isento SS se emprego ≥ ${IAS_2026}€/mês e RR independente < ${(4 * IAS_2026).toLocaleString("pt-PT", { maximumFractionDigits: 0 })}€/mês`,
      val: acumulaEmprego,
      set: setAcumulaEmprego,
    },
  ];

  // ── IRS Jovem opções ──────────────────────────────────────────────────────
  const irsJovemOpts = [
    { ano: 0, label: "Não aplicável", isencao: 0 },
    ...Array.from({ length: 10 }, (_, i) => {
      const ano = i + 1;
      return {
        ano,
        label: `${ano}.º ano — isenção ${(IRS_JOVEM_ISENCAO[ano] * 100).toFixed(0)}%`,
        isencao: IRS_JOVEM_ISENCAO[ano],
      };
    }),
  ];

  // ── Aviso de IVA Art. 53.º ────────────────────────────────────────────────
  const avisoIVALimite =
    regimeIVA === "isento" && brutoAnual > IVA_ISENCAO_LIMITE ? (
      <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl border bg-alert-bg border-alert-border">
        <span className="text-alert-text mt-0.5 flex-shrink-0">
          <Warning size={14} />
        </span>
        <span className="text-xs leading-relaxed text-alert-text">
          {brutoAnual > IVA_ISENCAO_LIMITE_IMEDIATO
            ? `Faturação > ${IVA_ISENCAO_LIMITE_IMEDIATO.toLocaleString("pt-PT")}€ — transição para IVA normal imediata ao ultrapassar este limite. Deves cobrar IVA a partir dessa fatura.`
            : `Faturação prevista > ${IVA_ISENCAO_LIMITE.toLocaleString("pt-PT")}€ — perdes a isenção Art. 53.º no ano seguinte. Se ultrapassares ${IVA_ISENCAO_LIMITE_IMEDIATO.toLocaleString("pt-PT")}€, a mudança é imediata.`}
        </span>
      </div>
    ) : null;

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
        {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
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
            {/* Toggle Por recibo / Anual */}
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

            {/* Toggle Recibos Verdes / Empresa */}
            <div
              role="tablist"
              aria-label="Cenário"
              className="flex rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-700 dark:bg-stone-900"
            >
              {(
                [
                  { v: "rv" as CenarioAtivo, l: "Recibos Verdes" },
                  { v: "empresa" as CenarioAtivo, l: "Empresa" },
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

        {/* ── Corpo ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* ════ Coluna esquerda: Inputs ════ */}
          <div className="bg-white p-8 lg:p-10 lg:border-r lg:border-stone-100 dark:bg-stone-950 dark:border-stone-800">
            {/* ── Valor ────────────────────────────────────────────────────── */}
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
                    {/*
                     * [BUG2 FIX] Toggle "Com IVA incluído / IVA à parte" removido.
                     * O input é sempre o valor base do serviço (pré-IVA).
                     * O IVA é determinado exclusivamente pelo seletor de regime abaixo.
                     */}
                    <NumericSlider
                      label={labelValor}
                      value={bruto}
                      min={0}
                      max={10_000}
                      step={50}
                      unit="€"
                      onChange={handleBrutoChange}
                      presets={[500, 1000, 1500, 2500, 5000]}
                      tooltip={
                        <>
                          Valor do teu serviço antes de IVA. O IVA (quando
                          aplicável) é calculado automaticamente e adicionado ao
                          valor cobrado ao cliente.
                        </>
                      }
                    />
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
                      max={200_000}
                      step={1_000}
                      unit="€"
                      onChange={handleBrutoAnualChange}
                      presets={[15000, 25000, 40000, 60000, 80000, 120000]}
                      formatPreset={(v) => fmt(v)}
                      tooltip={
                        <>
                          Volume de negócios anual, antes de qualquer imposto.
                          Limite regime simplificado: 200 000€/ano.
                        </>
                      }
                      breakPoint={breakEven ?? undefined}
                      breakPointLabel={
                        breakEven ? `Vira aqui · ${fmt(breakEven)}` : undefined
                      }
                    />
                    {avisoIVALimite}
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Tipo de atividade ─────────────────────────────────────── */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-sm font-medium uppercase tracking-wider text-stone-500">
                  Tipo de atividade
                </span>
                <InfoTip label="Tipos de atividade e coeficientes">
                  <p>
                    Coeficientes do regime simplificado (Art. 31.º CIRS) e taxas
                    de retenção 2026:
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    <li>
                      <strong>Art. 151.º:</strong> coef. 0,75 · ret. 23%
                    </li>
                    <li>
                      <strong>Vendas:</strong> coef. 0,15 · ret. 0%
                    </li>
                    <li>
                      <strong>Alojamento local:</strong> coef. 0,35 · ret. 0%
                    </li>
                    <li>
                      <strong>Outras prestações:</strong> coef. 0,35 · ret.
                      11,5%
                    </li>
                    <li>
                      <strong>Prop. intelectual:</strong> coef. 0,75 · ret.
                      16,5%
                    </li>
                  </ul>
                  <p className="mt-1">
                    25% do rendimento = presumida como despesa (sem comprovar).
                  </p>
                </InfoTip>
              </div>
              <ActivityCombobox value={atividade} onChange={setAtividade} />

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(
                  Object.entries(TIPO_ATIVIDADE_PARAMS) as [
                    TipoAtividade,
                    (typeof TIPO_ATIVIDADE_PARAMS)[TipoAtividade],
                  ][]
                ).map(([k, p]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={tipoAtiv === k}
                    onClick={() => setTipoAtiv(k)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      tipoAtiv === k
                        ? "border-brand bg-brand-light"
                        : "border-stone-200 hover:border-stone-300 bg-stone-50"
                    }`}
                  >
                    <div
                      className={`font-semibold ${tipoAtiv === k ? "text-brand-dark" : "text-stone-700"}`}
                    >
                      {p.label}
                    </div>
                    <div
                      className={`mt-0.5 ${tipoAtiv === k ? "text-brand" : "text-stone-400"}`}
                    >
                      Coef. {pct(p.coef)} · Ret. {pct(p.ret)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Regime IVA ───────────────────────────────────────────── */}
            <fieldset className="mb-6">
              <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-stone-500">
                Regime de IVA · {META_REGIAO[regiao]}
                <InfoTip label="IVA 2026">
                  Isento Art. 53.º até{" "}
                  {IVA_ISENCAO_LIMITE.toLocaleString("pt-PT")}€/ano. Se
                  ultrapassares{" "}
                  {IVA_ISENCAO_LIMITE_IMEDIATO.toLocaleString("pt-PT")}€ durante
                  o ano, passas de imediato para o regime normal. Certas
                  profissões (médicos, professores...) têm isenção Art. 9.º sem
                  limite de faturação.
                </InfoTip>
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

                      {/* IRS Jovem */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <label
                            htmlFor="irs-jovem-sel"
                            className="text-sm font-medium text-stone-500 uppercase tracking-wider"
                          >
                            IRS Jovem (até {IRS_JOVEM_IDADE_MAX} anos)
                          </label>
                          <InfoTip label="IRS Jovem 2026">
                            Isenção parcial do IRS durante 10 anos para jovens
                            até 35 anos (Art. 12.º-B CIRS, OE2025). Aplica-se a
                            Cat. A e Cat. B. Limite: 55×IAS ={" "}
                            {IRS_JOVEM_LIMITE_2026.toLocaleString("pt-PT")}
                            €/ano. Conta anos desde 1.º rendimento como
                            não-dependente.
                          </InfoTip>
                        </div>
                        <select
                          id="irs-jovem-sel"
                          value={irsJovemAno}
                          onChange={(e) =>
                            setIrsJovemAno(Number(e.target.value))
                          }
                          className="w-full px-4 py-3 text-sm font-semibold text-stone-700 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700"
                        >
                          {irsJovemOpts.map(({ ano, label }) => (
                            <option key={ano} value={ano}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-xs text-stone-400">
                          Limite de isenção:{" "}
                          {IRS_JOVEM_LIMITE_2026.toLocaleString("pt-PT")}€/ano
                          (55×IAS 2026). Aplica-se ao rendimento coletável, não
                          ao bruto.
                        </p>
                      </div>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Inputs Empresa (visíveis quando cenário = empresa) ─────── */}
            {cenario === "empresa" && (
              <EmpresaInputs
                despesasOper={despesasOper}
                custosExtra={custosExtra}
                salGerenteMensal={salGerenteMensal}
                distribuirDividendos={distribuirDividendos}
                onDespChange={setDespesasOper}
                onCustosChange={setCustosExtra}
                onSalChange={setSalGerenteMensal}
                onDividendosChange={setDistribuirDividendos}
              />
            )}
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
                      {modoInput === "recibo"
                        ? "O que é realmente teu · por recibo"
                        : "Líquido anual estimado"}
                    </div>
                    <div className="font-display text-5xl font-semibold leading-none mb-1 text-brand">
                      <AnimatedNumber
                        value={
                          modoInput === "recibo"
                            ? resultRecibo.liquido
                            : resultAnualRV.liquido
                        }
                      />
                    </div>
                    <div className="text-sm text-stone-400 mt-1">
                      de{" "}
                      <AnimatedNumber
                        value={
                          modoInput === "recibo"
                            ? resultRecibo.bruto + resultRecibo.iva
                            : brutoAnual
                        }
                      />{" "}
                      faturados
                      {modoInput === "anual" && (
                        <span>
                          {" "}
                          · IRS {fmt(resultAnualRV.irs)} · SS{" "}
                          {fmt(resultAnualRV.ssAnual)}
                        </span>
                      )}
                    </div>
                  </div>

                  {modoInput === "recibo" && (
                    <>
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

                      {/* Breakdown por recibo */}
                      <div className="space-y-1 flex-1">
                        <DetalheRow
                          label="Valor do serviço"
                          value={resultRecibo.bruto}
                          type="neutral"
                          note="O que faturaste (sem IVA)"
                        />
                        {resultRecibo.taxaIVA > 0 && (
                          <DetalheRow
                            label={`IVA (${pct(resultRecibo.taxaIVA)}) — do Estado`}
                            value={resultRecibo.iva}
                            type="warning"
                            note="Pertence ao Estado — não é teu"
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
                            note="Adiantamento de IRS ao Estado"
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
                            label="Reservar para IVA (entrega trimestral)"
                            value={-resultRecibo.iva}
                            type="warning"
                          />
                        )}
                        {resultRecibo.segSocial > 0 && (
                          <DetalheRow
                            label={`Reservar SS (21,4%×70% de ${fmt(resultRecibo.bruto)} ÷ 12)`}
                            value={-resultRecibo.segSocial}
                            type="deducao"
                            note="Pagamento mensal até dia 20"
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
                                  O que é mesmo teu: bruto menos a SS. O IVA e a
                                  retenção não contam aqui — o IVA é do Estado,
                                  a retenção é recuperada (ou paga) na
                                  declaração anual.
                                </InfoTip>
                              </div>
                              <div className="text-xs text-stone-400 mt-0.5">
                                {resultRecibo.taxaIVA > 0
                                  ? "IVA excluído — é do Estado"
                                  : "Bruto menos Segurança Social"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-display text-2xl font-semibold text-brand">
                                <AnimatedNumber value={resultRecibo.liquido} />
                              </div>
                              <div className="text-xs text-stone-400">
                                {pct(
                                  resultRecibo.liquido /
                                    (resultRecibo.bruto || 1),
                                )}{" "}
                                do bruto
                              </div>
                            </div>
                          </div>
                        </div>

                        {resultRecibo.avisos?.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {resultRecibo.avisos.map((a: string, i: number) => (
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
                    </>
                  )}

                  {modoInput === "anual" && (
                    /* Breakdown anual RV */
                    <div className="space-y-1 flex-1">
                      <DetalheRow
                        label="Faturação bruta anual"
                        value={resultAnualRV.faturacao}
                        type="neutral"
                      />
                      <DetalheRow
                        label={`Rendimento coletável (coef. ${pct(resultAnualRV.coeficiente)})`}
                        value={resultAnualRV.rendColetavel}
                        type="neutral"
                        note="Regime simplificado — 25% presumido como despesa"
                      />
                      {resultAnualRV.ssAnual > 0 && (
                        <DetalheRow
                          label="Dedução SS paga (Art. 31.º n.º 2 CIRS)"
                          value={-resultAnualRV.ssAnual}
                          type="deducao"
                          note="SS dedutível ao rendimento coletável"
                        />
                      )}
                      {resultAnualRV.isencaoJovemValor > 0 && (
                        <DetalheRow
                          label={`IRS Jovem — isenção ${pct(resultAnualRV.isencaoJovemPct)} (Art. 12.º-B)`}
                          value={-resultAnualRV.isencaoJovemValor}
                          type="deducao"
                          note={`Limite ${IRS_JOVEM_LIMITE_2026.toLocaleString("pt-PT")}€ (55×IAS)`}
                        />
                      )}
                      <DetalheRow
                        label="Rendimento tributável"
                        value={resultAnualRV.rendTributavel}
                        type="subtotal"
                        note={
                          resultAnualRV.rendTributavel <= MINIMO_EXISTENCIA_2026
                            ? "Abaixo do mínimo de existência — IRS = 0€"
                            : ""
                        }
                      />
                      <DetalheRow
                        label="IRS liquidado (escalões progressivos)"
                        value={-resultAnualRV.irs}
                        type="warning"
                        note={`Taxa efetiva ${pct(resultAnualRV.taxaEfetiva)}`}
                      />
                      {resultAnualRV.ssAnual > 0 && (
                        <DetalheRow
                          label="Segurança Social (21,4% × 70%)"
                          value={-resultAnualRV.ssAnual}
                          type="deducao"
                          note="IAS 2026: 537,13€ · máx. 12×IAS/mês"
                        />
                      )}

                      <div className="mt-4 p-4 rounded-2xl border-2 border-brand bg-white dark:bg-stone-950">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                              Líquido anual
                            </div>
                            <div className="text-xs text-stone-400 mt-0.5">
                              ≈ {fmt(resultAnualRV.liquido / 12)}/mês
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-2xl font-semibold text-brand">
                              <AnimatedNumber value={resultAnualRV.liquido} />
                            </div>
                            <div className="text-xs text-stone-400">
                              {pct(resultAnualRV.liquido / (brutoAnual || 1))}{" "}
                              do bruto
                            </div>
                          </div>
                        </div>
                      </div>

                      {resultAnualRV.acertoIRS > 0 && (
                        <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl border bg-brand-light border-brand/30">
                          <span className="text-brand mt-0.5 flex-shrink-0">
                            <Check size={14} />
                          </span>
                          <span className="text-xs leading-relaxed text-brand-dark">
                            Reembolso estimado IRS:{" "}
                            {fmt(resultAnualRV.acertoIRS)} (retiveste{" "}
                            {fmt(resultAnualRV.retencaoAnual)} · IRS real{" "}
                            {fmt(resultAnualRV.irs)})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-stone-400 mt-5 leading-relaxed">
                    Estimativa fiscal 2026. Escalões IRS atualizados 3,51% pelo
                    OE2026. Mínimo de existência:{" "}
                    {MINIMO_EXISTENCIA_2026.toLocaleString("pt-PT")}€. Não
                    substitui aconselhamento de contabilista certificado.
                  </p>
                  <Link
                    href="/dashboard/simulador"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand-dark"
                  >
                    Ver apuramento IRS anual detalhado por escalões
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
                  {modoInput === "recibo" && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-500 dark:border-stone-700 dark:bg-stone-800">
                      <Warning
                        size={13}
                        className="flex-shrink-0 mt-0.5 text-stone-400"
                      />
                      <span>
                        Comparação baseada em {fmt(bruto)} × 12 ={" "}
                        {fmt(brutoAnual)}/ano. Muda para o modo Anual para
                        valores mais precisos.
                      </span>
                    </div>
                  )}

                  <div className="mb-8">
                    <div className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-1">
                      Líquido estimado — empresa (Lda)
                    </div>
                    <div className="font-display text-5xl font-semibold leading-none mb-1 text-brand">
                      <AnimatedNumber value={resultEmpresa.liquidoGerente} />
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
                              style={{
                                width: `${(resultEmpresa.liquidoGerente / total) * 100}%`,
                                background: "#1D9E75",
                              }}
                              className="transition-all duration-500 rounded-l-full"
                            />
                            <div
                              style={{
                                width: `${((resultEmpresa.irc + resultEmpresa.derramaMuni) / total) * 100}%`,
                                background: "#9FE1CB",
                              }}
                              className="transition-all duration-500"
                            />
                            {resultEmpresa.irsDividendos > 0 && (
                              <div
                                style={{
                                  width: `${(resultEmpresa.irsDividendos / total) * 100}%`,
                                  background: "#FBBF24",
                                }}
                                className="transition-all duration-500"
                              />
                            )}
                            <div
                              style={{
                                width: `${(resultEmpresa.totalCustos / total) * 100}%`,
                                background: "#D3D1C7",
                              }}
                              className="transition-all duration-500 rounded-r-full"
                            />
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: "Teu (após dividendos)", color: "#1D9E75" },
                        {
                          label: "IRC (PME 15%/19%) + Derrama",
                          color: "#9FE1CB",
                        },
                        ...(resultEmpresa.irsDividendos > 0
                          ? [
                              {
                                label: "IRS Dividendos (28%)",
                                color: "#FBBF24",
                              },
                            ]
                          : []),
                        { label: "Custos + salário", color: "#B4B2A9" },
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
                    {resultEmpresa.despesasOper > 0 && (
                      <DetalheRow
                        label="Despesas operacionais"
                        value={-resultEmpresa.despesasOper}
                        type="deducao"
                        note="Dedutíveis ao lucro tributável"
                      />
                    )}
                    {resultEmpresa.custosExtra > 0 && (
                      <DetalheRow
                        label="Custos estrutura empresa"
                        value={-resultEmpresa.custosExtra}
                        type="deducao"
                        note="Contabilidade, software, etc."
                      />
                    )}
                    {resultEmpresa.salGerente > 0 && (
                      <>
                        <DetalheRow
                          label="Salário gerente (bruto anual)"
                          value={-resultEmpresa.salGerente}
                          type="deducao"
                          note="Custo dedutível da empresa"
                        />
                        <DetalheRow
                          label="SS empresa + trabalhador sobre salário"
                          value={-resultEmpresa.ssSalGerente}
                          type="deducao"
                          note="23,75% (empresa) + 11% (trabalhador)"
                        />
                      </>
                    )}
                    <DetalheRow
                      label="Lucro tributável"
                      value={resultEmpresa.lucroTributavel}
                      type="subtotal"
                      note="Antes de IRC"
                    />
                    <DetalheRow
                      label="IRC (PME: 15% até 50k€ + 19% excedente)"
                      value={-resultEmpresa.irc}
                      type="deducao"
                      note={`OE2026: IRC geral 19% (era 20% em 2025)`}
                    />
                    <DetalheRow
                      label="Derrama municipal (~1,5%)"
                      value={-resultEmpresa.derramaMuni}
                      type="deducao"
                      note="Varia por município — estimativa Lisboa/Porto"
                    />
                    {resultEmpresa.irsDividendos > 0 ? (
                      <DetalheRow
                        label="IRS sobre dividendos (28%)"
                        value={-resultEmpresa.irsDividendos}
                        type="warning"
                        note="Taxa liberatória Art. 71.º CIRS"
                      />
                    ) : (
                      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border bg-white border-stone-100">
                        <span className="text-xs text-stone-500">
                          Lucro retido na empresa (não distribuído)
                        </span>
                        <span className="text-xs font-semibold text-stone-600">
                          {fmt(resultEmpresa.lucroLiquido)}
                        </span>
                      </div>
                    )}

                    <div className="mt-4 p-4 rounded-2xl border-2 border-brand bg-white dark:bg-stone-950">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                            Líquido para o dono
                          </div>
                          <div className="text-xs text-stone-400 mt-0.5">
                            {resultEmpresa.salGerente > 0
                              ? "Salário líquido + dividendos líquidos"
                              : "Após IRC, derrama e IRS dividendos"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-2xl font-semibold text-brand">
                            <AnimatedNumber
                              value={resultEmpresa.liquidoGerente}
                            />
                          </div>
                          <div className="text-xs text-stone-400">
                            {pct(
                              resultEmpresa.liquidoGerente / (brutoAnual || 1),
                            )}{" "}
                            do bruto
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-stone-400 mt-5 leading-relaxed">
                    Estimativa de ordem de grandeza. IRC PME 2026: 15%/50k€ +
                    19%. Derrama 1,5%. Não considera tributação autónoma,
                    englobamento de dividendos, benefícios fiscais (RFAI, DLRR)
                    nem custos de constituição (~1 500€). Consulta contabilista
                    certificado.
                  </p>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Rodapé: comparação integrada ──────────────────────────────────── */}
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
                Categoria B · Regime simplificado
              </div>
              <div
                className={`mt-2 font-display text-2xl font-semibold tabular-nums ${!empresaVence ? "text-brand-dark" : "text-stone-800 dark:text-stone-200"}`}
              >
                <AnimatedNumber value={resultAnualRV.liquido} />
              </div>
              <div className="text-[11px] text-stone-400">líquido/ano</div>
              <div className="mt-2 text-[11px] text-stone-400 space-y-0.5">
                <div>IRS: −{fmt(resultAnualRV.irs)}</div>
                <div>SS: −{fmt(resultAnualRV.ssAnual)}</div>
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
                Empresa (Lda)
              </div>
              <div className="mt-0.5 text-[11px] text-stone-400">
                IRC PME +{" "}
                {distribuirDividendos ? "dividendos 28%" : "lucro retido"}
              </div>
              <div
                className={`mt-2 font-display text-2xl font-semibold tabular-nums ${empresaVence ? "text-brand-dark" : "text-stone-800 dark:text-stone-200"}`}
              >
                <AnimatedNumber value={resultEmpresa.liquidoGerente} />
              </div>
              <div className="text-[11px] text-stone-400">líquido/ano</div>
              <div className="mt-2 text-[11px] text-stone-400 space-y-0.5">
                <div>IRC: −{fmt(resultEmpresa.irc)}</div>
                <div>Derrama: −{fmt(resultEmpresa.derramaMuni)}</div>
                {resultEmpresa.irsDividendos > 0 && (
                  <div>IRS div: −{fmt(resultEmpresa.irsDividendos)}</div>
                )}
                <div>Custos: −{fmt(resultEmpresa.totalCustos)}</div>
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
                <strong>{fmt(diferenca)}/ano</strong> (
                {pct(diferenca / (brutoAnual || 1))}).
                {breakEven && ` Ponto de viragem: ${fmt(breakEven)}/ano.`}
              </span>
            ) : (
              <span>
                Com {fmt(brutoAnual)}/ano, recibos verdes deixam-te com mais{" "}
                <strong>{fmt(diferenca)}/ano</strong> (
                {pct(diferenca / (brutoAnual || 1))}).
                {breakEven &&
                  ` A empresa compensa acima de ${fmt(breakEven)}/ano.`}
              </span>
            )}
          </div>

          {/* Nota legal */}
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-4">
            <span className="mt-0.5 flex-shrink-0 text-alert-text">
              <Warning size={14} />
            </span>
            <p className="text-xs leading-relaxed text-alert-text">
              <strong>Fontes:</strong> Art. 31.º, 68.º, 101.º, 101.º-B e 12.º-B
              CIRS | CIVA Art. 53.º e 9.º | CRC (SS independentes) | OE2026 (Lei
              n.º 73-A/2025) | IAS 2026: 537,13€. Estimativa de ordem de
              grandeza. Não considera tributação autónoma, englobamento,
              benefícios fiscais (RFAI, DLRR, SIFIDE II), custos de
              constituição, regime contabilidade organizada nem particularidades
              individuais. Decisão de constituir sociedade deve ser validada com
              contabilista certificado (OCC).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
