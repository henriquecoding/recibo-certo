"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ConstrutorRecibo } from "./ConstrutorRecibo";
import { ResultadoMotorRecibo } from "./ResultadoMotorRecibo";
import {
  calculateLegacyPayroll,
  employerCost,
  includeMonthlyDuodecimos,
  mealLimit,
  validateContext,
  validateRubrics,
  WEEKLY_HOURS_RANGE,
  type PayrollRubricDraft,
  type PayrollSimulatorContext,
} from "@/lib/payroll-simulator-legacy-adapter";
import { calcularVencimentoAnual } from "@/lib/fiscal-dependente";
import { solveNetToGross } from "@/lib/payroll-inverse";
import type { ReciboExtraido } from "@/lib/recibo-pdf";
import type { EstadoCivilRet, Regiao } from "@/lib/fiscal-data";
import {
  DATA_LAST_REVIEW,
  SS_DEPENDENTE,
  DEDUCAO_DEPENDENTE_DEFICIENCIA,
  RETENCAO_CONJUGE_DEFICIENTE,
  RETENCAO_DEP_DEFICIENTE,
  RETENCAO_UNICO_TITULAR_FRACAO,
  fatorMaximoDependenteDeficiente,
} from "@/lib/fiscal-data";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { escreverCSV } from "@/lib/export/csv";
import { criarProveniencia } from "@/lib/export/referencia";
import { getSupabase } from "@/lib/supabase/client";
import { MIME, descarregar, nomeFicheiro } from "@/lib/export/nomes";
import { numeroDoc } from "@/lib/export/dinheiro";
import { livroXLSX, tabelasCSV, type DocumentoVencimento } from "@/lib/export/documento-vencimento";
import { fmt, pct } from "@/lib/format";
import { useCenarios, consumirReabertura, type ResumoCenario } from "@/lib/store/cenarios";
import { useExportacaoPro } from "@/lib/store/exportacao-pro";
import { parseNumericDraft, sanitizeNumericDraft } from "@/lib/numeric-input";
import GuardarCenarioDialog from "@/components/ui/GuardarCenarioDialog";
import UpsellExportacao from "@/components/ui/UpsellExportacao";
import ProGate from "@/components/ui/ProGate";
import InfoTip from "@/components/ui/InfoTip";
import {
  ArrowRight,
  Building,
  Calendar,
  Calculator,
  Check,
  Export,
  FileSign,
  Heart,
  History,
  LayoutGrid,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkle,
  Warning,
  Wallet,
} from "@/components/ui/Icons";

const LoadingPanel = () => (
  <div className="animate-pulse rounded-3xl border border-stone-100 bg-white p-5 dark:border-stone-800 dark:bg-stone-900" aria-hidden>
    <div className="h-4 w-40 rounded-full bg-stone-100 dark:bg-stone-800" />
    <div className="mt-3 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800" />
  </div>
);

const ImportarReciboPDF = dynamic(
  () => import("./ImportarReciboPDF").then((module) => module.ImportarReciboPDF),
  { ssr: false, loading: LoadingPanel },
);
const AuditoriaPainel = dynamic(
  () => import("./AuditoriaPainel").then((module) => module.AuditoriaPainel),
  { ssr: false, loading: LoadingPanel },
);

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const FAMILY_OPTIONS: readonly [EstadoCivilRet, string][] = [
  ["naoCasado", "Não casado"],
  ["casadoDois", "Casado · 2 titulares"],
  ["casadoUnico", "Casado · 1 titular"],
];
const REGION_OPTIONS: readonly [Regiao, string][] = [
  ["continente", "Continente"],
  ["madeira", "Madeira"],
  ["acores", "Açores"],
];

const inputClass = "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-medium tabular-nums text-stone-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";
// Alvo de toque ≥ 36px e texto centrado que pode quebrar: em ~360px estes
// controlos segmentados chegam a ter 3–5 colunas dentro da mesma linha.
const segmentClass = (active: boolean) => `flex min-h-[36px] items-center justify-center rounded-xl px-2 py-2 text-center text-xs font-semibold leading-tight transition focus:outline-none focus:ring-2 focus:ring-brand/20 sm:px-3 ${active ? "bg-white text-brand shadow-sm dark:bg-stone-700 dark:text-brand-light" : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"}`;

function parseNumber(value: string): number {
  return Math.max(0, parseNumericDraft(value) ?? 0);
}

function dayDraft(value: string): string {
  const draft = sanitizeNumericDraft(value, { maxDecimals: 0 }).slice(0, 2);
  const parsed = parseNumericDraft(draft, { maxDecimals: 0 });
  return parsed !== null && parsed > 31 ? "31" : draft;
}

function MoneyField({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400"><span>{label}</span>{hint && <span className="normal-case tracking-normal">{hint}</span>}</span>
      <span className="relative block">
        <input id={id} type="text" inputMode="decimal" autoComplete="off" value={value} onChange={(event) => onChange(sanitizeNumericDraft(event.target.value))} className={`${inputClass} pr-10`} />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
      </span>
    </label>
  );
}

/**
 * Contador com limites explícitos. Substitui o segmento «0 1 2 3 4+», em que o
 * «4+» enviava exatamente 4 ao motor: quem tinha cinco dependentes via a
 * retenção de quem tem quatro, 34,29 €/mês a mais, sem nenhum aviso.
 */
function Stepper({ id, value, min, max, onChange, decreaseLabel, increaseLabel }: {
  id: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  const button = "flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-lg font-semibold leading-none text-stone-600 transition hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400";
  return (
    <div className="flex flex-none items-center gap-2">
      <button type="button" aria-label={decreaseLabel} onClick={() => onChange(clamp(value - 1))} disabled={value <= min} className={button}>−</button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={String(value)}
        onChange={(event) => {
          const parsed = parseNumericDraft(sanitizeNumericDraft(event.target.value, { maxDecimals: 0 }), { maxDecimals: 0 });
          onChange(parsed === null ? min : clamp(Math.floor(parsed)));
        }}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-9 w-12 rounded-lg border border-stone-200 bg-white text-center text-sm font-bold tabular-nums text-stone-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      />
      <button type="button" aria-label={increaseLabel} onClick={() => onChange(clamp(value + 1))} disabled={value >= max} className={button}>+</button>
    </div>
  );
}

function SectionHeader({ step, icon, title, hint }: { step: string; icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-light text-brand dark:bg-brand/10">{icon}</span>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-[9px] font-bold uppercase tracking-[0.16em] text-brand">{step}</span><span className="h-px flex-1 bg-stone-100 dark:bg-stone-800" /></div><h3 className="mt-1 text-sm font-semibold text-stone-800 dark:text-stone-100">{title}</h3><p className="mt-0.5 text-[11px] leading-relaxed text-stone-400">{hint}</p></div>
    </div>
  );
}

/**
 * Salário-base que produz um dado líquido. Delega em
 * `solveNetToGross` (`src/lib/payroll-inverse.ts`), que é a bissecção do
 * motor `ReciboCerto-Fiscal-Engine` adaptada às rubricas desta superfície —
 * tolerância configurável e casos insolúveis tratados, em vez de uma
 * bissecção escrita dentro do componente com teto fixo.
 *
 * O invariante que a torna correta (o líquido é estritamente crescente no
 * bruto) está preso em teste — ver `payroll-inverse.test.ts`.
 */
function solveTargetGross(target: number, makeContext: (base: number) => PayrollSimulatorContext, rubrics: readonly PayrollRubricDraft[], duodecimos: boolean): { gross: number; reached: boolean } {
  return solveNetToGross({
    target,
    liquidoDe: (base) =>
      calculateLegacyPayroll(makeContext(base), includeMonthlyDuodecimos(rubrics, base, duodecimos)).result.liquido,
  });
}

interface SavedSnapshotV2 extends Record<string, unknown> {
  version: 2;
  mode: "gross" | "target";
  gross: string;
  target: string;
  month: number;
  dependants: number;
  dependantsWithDisability: number;
  disabilityFactor: number;
  spouseDisability: boolean;
  maritalStatus: EstadoCivilRet;
  disability: boolean;
  region: Regiao;
  weeklyHours: string;
  youthIrs: boolean;
  youthYear: number;
  duodecimos: boolean;
  mealEnabled: boolean;
  mealDaily: string;
  mealDays: string;
  mealCard: boolean;
  rubrics: PayrollRubricDraft[];
}

interface LegacySavedSnapshot extends Record<string, unknown> {
  brutoStr?: string;
  dependentes?: number;
  temSubsidio?: boolean;
  subsidioDiaStr?: string;
  cartao?: boolean;
  diasUteisStr?: string;
  diasSemSubsidioStr?: string;
  duodecimos?: boolean;
  estadoCivil?: EstadoCivilRet;
  deficiencia?: boolean;
  depDeficientes?: number;
  regiao?: Regiao;
  irsJovem?: boolean;
  irsJovemAno?: number;
  mes?: number;
  horasAusenciaStr?: string;
  horasSupStr?: string[];
  premioStr?: string;
  premioRegular?: boolean;
  subFeriasStr?: string;
  subNatalStr?: string;
  outrosSujeitosStr?: string;
  ajNDiasStr?: string;
  ajNValStr?: string;
  ajEDiasStr?: string;
  ajEValStr?: string;
}

const LEGACY_PAYROLL_STORAGE_KEY = "recibocerto:vencimentos:v1";
const LEGACY_OVERTIME_TYPES = [
  "overtime_workday_first",
  "overtime_workday_following",
  "overtime_rest",
  "overtime_over100_first",
  "overtime_over100_following",
  "overtime_over100_rest",
] as const;

function legacyNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, value) : 0;
  return typeof value === "string" ? parseNumber(value) : 0;
}

function legacyRubrics(saved: LegacySavedSnapshot): PayrollRubricDraft[] {
  const next: PayrollRubricDraft[] = [];
  const addAmount = (type: PayrollRubricDraft["type"], value: unknown, regularity: PayrollRubricDraft["regularity"] = "unknown") => {
    const amount = legacyNumber(value);
    if (amount > 0) next.push({ id: `migrated-${type}`, type, amount, hours: 0, days: 0, dailyAmount: 0, regularity });
  };
  const absenceHours = legacyNumber(saved.horasAusenciaStr);
  if (absenceHours > 0) next.push({ id: "migrated-unpaid-absence", type: "unpaid_absence", amount: 0, hours: absenceHours, days: 0, dailyAmount: 0, regularity: "unknown" });
  saved.horasSupStr?.slice(0, LEGACY_OVERTIME_TYPES.length).forEach((value, index) => {
    const hours = legacyNumber(value);
    if (hours > 0) next.push({ id: `migrated-${LEGACY_OVERTIME_TYPES[index]}`, type: LEGACY_OVERTIME_TYPES[index], amount: 0, hours, days: 0, dailyAmount: 0, regularity: "unknown" });
  });
  addAmount("performance_award", saved.premioStr, saved.premioRegular === false ? "not_regular" : "regular");
  addAmount("holiday_subsidy", saved.subFeriasStr);
  addAmount("christmas_subsidy", saved.subNatalStr);
  addAmount("other_taxable", saved.outrosSujeitosStr);
  const addTravel = (type: "travel_national" | "travel_foreign", daysValue: unknown, dailyValue: unknown) => {
    const days = Math.floor(legacyNumber(daysValue));
    const dailyAmount = legacyNumber(dailyValue);
    if (days > 0 && dailyAmount > 0) next.push({ id: `migrated-${type}`, type, amount: 0, hours: 0, days, dailyAmount, regularity: "unknown" });
  };
  addTravel("travel_national", saved.ajNDiasStr, saved.ajNValStr);
  addTravel("travel_foreign", saved.ajEDiasStr, saved.ajEValStr);
  return next;
}

function mirrorLegacyPayrollScenario(scenario: {
  name: string;
  baseSalary: number;
  dependants: number;
  mealDaily: number;
  mealCard: boolean;
  mealDays: number;
  duodecimos: boolean;
}) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEGACY_PAYROLL_STORAGE_KEY, JSON.stringify([{
      id: "atual",
      nome: scenario.name,
      salarioBruto: scenario.baseSalary,
      dependentes: scenario.dependants,
      subsidioRefeicaoDia: scenario.mealDaily,
      subsidioRefeicaoCartao: scenario.mealCard,
      diasUteis: scenario.mealDays,
      duodecimos: scenario.duodecimos,
      criadoEm: new Date().toISOString(),
    }]));
  } catch {
    // localStorage indisponível: o cenário principal continua guardado.
  }
}

export function MotorReciboVencimento() {
  const [mode, setMode] = useState<"gross" | "target">("gross");
  const [gross, setGross] = useState("1500");
  const [target, setTarget] = useState("1200");
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [dependants, setDependants] = useState(0);
  const [dependantsWithDisability, setDependantsWithDisability] = useState(0);
  const [disabilityFactor, setDisabilityFactor] = useState(1);
  const [spouseDisability, setSpouseDisability] = useState(false);
  const [maritalStatus, setMaritalStatus] = useState<EstadoCivilRet>("naoCasado");
  const [disability, setDisability] = useState(false);
  const [region, setRegion] = useState<Regiao>("continente");
  const [weeklyHours, setWeeklyHours] = useState("40");
  const [youthIrs, setYouthIrs] = useState(false);
  const [youthYear, setYouthYear] = useState(1);
  const [duodecimos, setDuodecimos] = useState(false);
  const [mealEnabled, setMealEnabled] = useState(true);
  const [mealDaily, setMealDaily] = useState("6,15");
  const [mealDays, setMealDays] = useState("22");
  const [mealCard, setMealCard] = useState(true);
  const [rubrics, setRubrics] = useState<PayrollRubricDraft[]>([]);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [imported, setImported] = useState<ReciboExtraido | null>(null);
  const [auditKey, setAuditKey] = useState(0);
  const [saveDialog, setSaveDialog] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [exportState, setExportState] = useState<{ estado: "inativo" | "a-compor" | "pronto" | "erro"; texto?: string }>({ estado: "inativo" });

  // Fator máximo do n.º 6 do Despacho: 3 (não casado / único titular) ou 6
  // (casado, dois titulares). Ao mudar de situação familiar, um fator acima do
  // máximo é limitado aqui e no motor — nunca aplicado em silêncio.
  const maxDisabilityFactor = fatorMaximoDependenteDeficiente(maritalStatus);
  const effectiveFactor = Math.min(maxDisabilityFactor, Math.max(1, disabilityFactor));
  const effectiveSpouseDisability = spouseDisability && maritalStatus === "casadoUnico";

  const makeContext = (baseSalary: number): PayrollSimulatorContext => ({
    baseSalary,
    weeklyHours: parseNumber(weeklyHours),
    dependants,
    maritalStatus,
    disability,
    dependantsWithDisability: Math.min(dependants, dependantsWithDisability),
    disabilityFactor: effectiveFactor,
    spouseDisability: effectiveSpouseDisability,
    region,
    youthIrsBenefitYear: youthIrs ? youthYear : undefined,
    meal: {
      enabled: mealEnabled,
      days: Math.min(31, Math.floor(parseNumber(mealDays))),
      dailyAmount: parseNumber(mealDaily),
      card: mealCard,
    },
  });

  const targetSolution = useMemo(
    () => mode === "target" ? solveTargetGross(parseNumber(target), makeContext, rubrics, duodecimos) : undefined,
    // makeContext is intentionally represented by its primitive dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, target, weeklyHours, dependants, dependantsWithDisability, effectiveFactor, effectiveSpouseDisability, maritalStatus, disability, region, youthIrs, youthYear, mealEnabled, mealDaily, mealDays, mealCard, rubrics, duodecimos],
  );
  const targetGross = targetSolution?.gross;
  const baseSalary = mode === "target" ? targetGross ?? 0 : parseNumber(gross);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const context = useMemo(() => makeContext(baseSalary), [
    baseSalary, weeklyHours, dependants, dependantsWithDisability, effectiveFactor, effectiveSpouseDisability, maritalStatus, disability, region, youthIrs, youthYear, mealEnabled, mealDaily, mealDays, mealCard,
  ]);
  const calculationRubrics = useMemo(
    () => includeMonthlyDuodecimos(rubrics, baseSalary, duodecimos),
    [rubrics, baseSalary, duodecimos],
  );
  const calculation = useMemo(() => calculateLegacyPayroll(context, calculationRubrics), [context, calculationRubrics]);
  const annual = useMemo(() => calcularVencimentoAnual({
    salarioBruto: baseSalary,
    dependentes: dependants,
    dependentesDeficientes: Math.min(dependants, dependantsWithDisability),
    fatorDependenteDeficiente: effectiveFactor,
    conjugeDeficiente: effectiveSpouseDisability,
    subsidioRefeicaoDia: mealEnabled ? parseNumber(mealDaily) : 0,
    subsidioRefeicaoCartao: mealCard,
    diasUteis: Math.min(31, Math.floor(parseNumber(mealDays))),
    estadoCivil: maritalStatus,
    deficiencia: disability,
    regiao: region,
    irsJovemAno: youthIrs ? youthYear : undefined,
  }), [baseSalary, dependants, dependantsWithDisability, effectiveFactor, effectiveSpouseDisability, mealEnabled, mealDaily, mealCard, mealDays, maritalStatus, disability, region, youthIrs, youthYear]);
  const issues = useMemo(() => [
    ...validateContext(context),
    ...validateRubrics(rubrics),
    ...(targetSolution && !targetSolution.reached ? ["O objetivo líquido excede o intervalo suportado (bruto até 50 000 €)."] : []),
  ], [context, rubrics, targetSolution]);
  const companyCost = employerCost(calculation.result);
  const { naNuvem, limite, limiteAtingido, guardar } = useCenarios();
  const exportAccess = useExportacaoPro();

  const snapshot: SavedSnapshotV2 = {
    version: 2,
    mode,
    gross,
    target,
    month,
    dependants,
    dependantsWithDisability,
    disabilityFactor: effectiveFactor,
    spouseDisability: effectiveSpouseDisability,
    maritalStatus,
    disability,
    region,
    weeklyHours,
    youthIrs,
    youthYear,
    duodecimos,
    mealEnabled,
    mealDaily,
    mealDays,
    mealCard,
    rubrics,
  };

  useEffect(() => {
    const saved = consumirReabertura("vencimento") as Partial<SavedSnapshotV2> | LegacySavedSnapshot | null;
    if (!saved) return;
    if (saved.version === 2) {
      const current = saved as Partial<SavedSnapshotV2>;
      if (current.mode) setMode(current.mode);
      if (current.gross !== undefined) setGross(sanitizeNumericDraft(current.gross));
      if (current.target !== undefined) setTarget(sanitizeNumericDraft(current.target));
      if (current.month !== undefined) setMonth(current.month);
      if (current.dependants !== undefined) setDependants(current.dependants);
      if (current.dependantsWithDisability !== undefined) setDependantsWithDisability(current.dependantsWithDisability);
      if (current.disabilityFactor !== undefined) setDisabilityFactor(current.disabilityFactor);
      if (current.spouseDisability !== undefined) setSpouseDisability(current.spouseDisability);
      if (current.maritalStatus) setMaritalStatus(current.maritalStatus);
      if (current.disability !== undefined) setDisability(current.disability);
      if (current.region) setRegion(current.region);
      if (current.weeklyHours !== undefined) setWeeklyHours(sanitizeNumericDraft(current.weeklyHours));
      if (current.youthIrs !== undefined) setYouthIrs(current.youthIrs);
      if (current.youthYear !== undefined) setYouthYear(current.youthYear);
      if (current.duodecimos !== undefined) setDuodecimos(current.duodecimos);
      if (current.mealEnabled !== undefined) setMealEnabled(current.mealEnabled);
      if (current.mealDaily !== undefined) setMealDaily(sanitizeNumericDraft(current.mealDaily));
      if (current.mealDays !== undefined) setMealDays(dayDraft(current.mealDays));
      if (current.mealCard !== undefined) setMealCard(current.mealCard);
      if (current.rubrics) setRubrics(current.rubrics);
      return;
    }

    // Cenários criados pelo simulador anterior não tinham versão. Migram para
    // o construtor por rubricas sem alterar os valores guardados pelo utilizador.
    const legacy = saved as LegacySavedSnapshot;
    if (legacy.brutoStr !== undefined) setGross(sanitizeNumericDraft(legacy.brutoStr));
    if (legacy.dependentes !== undefined) setDependants(legacy.dependentes);
    if (legacy.depDeficientes !== undefined) setDependantsWithDisability(legacy.depDeficientes);
    if (legacy.estadoCivil) setMaritalStatus(legacy.estadoCivil);
    if (legacy.deficiencia !== undefined) setDisability(legacy.deficiencia);
    if (legacy.regiao) setRegion(legacy.regiao);
    if (legacy.irsJovem !== undefined) setYouthIrs(legacy.irsJovem);
    if (legacy.irsJovemAno !== undefined) setYouthYear(legacy.irsJovemAno);
    if (legacy.duodecimos !== undefined) setDuodecimos(legacy.duodecimos);
    if (legacy.temSubsidio !== undefined) setMealEnabled(legacy.temSubsidio);
    if (legacy.subsidioDiaStr !== undefined) setMealDaily(sanitizeNumericDraft(legacy.subsidioDiaStr));
    if (legacy.cartao !== undefined) setMealCard(legacy.cartao);
    if (legacy.mes !== undefined) setMonth(legacy.mes);
    const paidMealDays = Math.max(0, Math.floor(legacyNumber(legacy.diasUteisStr) - legacyNumber(legacy.diasSemSubsidioStr)));
    if (legacy.diasUteisStr !== undefined) setMealDays(String(paidMealDays));
    setRubrics(legacyRubrics(legacy));
    setPendingNotice("Cenário antigo convertido para o novo construtor");
  }, []);

  function applyImportedReceipt(receipt: ReciboExtraido) {
    const next: PayrollRubricDraft[] = [];
    const now = Date.now();
    if (receipt.salarioBase !== undefined) setGross(String(receipt.salarioBase).replace(".", ","));
    setMode("gross");
    if ((receipt.subsidioRefeicaoDia ?? 0) > 0) {
      setMealEnabled(true);
      setMealDaily(String(receipt.subsidioRefeicaoDia).replace(".", ","));
      if (receipt.subsidioRefeicaoDias) setMealDays(String(receipt.subsidioRefeicaoDias));
      if (receipt.subsidioRefeicaoCartao !== undefined) setMealCard(receipt.subsidioRefeicaoCartao);
    } else if ((receipt.subsidioRefeicaoTotal ?? 0) > 0) {
      const days = receipt.subsidioRefeicaoDias ?? 22;
      setMealEnabled(true);
      setMealDays(String(days));
      setMealDaily(String(Math.round(((receipt.subsidioRefeicaoTotal ?? 0) / days) * 100) / 100).replace(".", ","));
    }
    if ((receipt.premio ?? 0) > 0) next.push({ id: `import-award-${now}`, type: "performance_award", amount: receipt.premio ?? 0, hours: 0, days: 0, dailyAmount: 0, regularity: "unknown" });
    // Os feriados reconhecidos passam a ser uma rubrica própria em vez de
    // desaparecerem dentro do resíduo: quem confere um recibo precisa de ver a
    // linha que o recibo tem, não um total agregado sem nome.
    if ((receipt.feriados ?? 0) > 0) next.push({ id: `import-holiday-work-${now}`, type: "other_taxable", amount: receipt.feriados ?? 0, hours: 0, days: 0, dailyAmount: 0, regularity: "unknown" });
    const base = receipt.salarioBase ?? 0;
    const knownAward = receipt.premio ?? 0;
    const knownHolidays = receipt.feriados ?? 0;
    const residual = Math.max(0, Math.round(((receipt.remuneracaoSujeita ?? base) - base - knownAward - knownHolidays) * 100) / 100);
    if (residual > 0) next.push({ id: `import-other-${now}`, type: "other_taxable", amount: residual, hours: 0, days: 0, dailyAmount: 0, regularity: "unknown" });
    setRubrics(next);
    if (receipt.mes !== undefined) setMonth(receipt.mes);
    setImported(receipt);
    setAuditKey((value) => value + 1);
  }

  function saveScenario(name: string) {
    const summary: ResumoCenario = {
      destaque: calculation.result.liquido,
      destaqueLabel: "Líquido do mês",
      destaqueFmt: "eur",
      linhas: [
        { label: "Bruto / caixa", valor: calculation.result.brutoTotal, fmt: "eur" },
        { label: "IRS + Segurança Social", valor: calculation.result.irsTotal + calculation.result.ssTrabalhador, fmt: "eur" },
        { label: "Custo da empresa", valor: companyCost, fmt: "eur" },
        { label: "Taxa efetiva", valor: calculation.result.taxaEfetiva, fmt: "pct" },
      ],
    };
    const result = guardar({ tipo: "vencimento", nome: name, resumo: summary, dados: snapshot });
    if (result.erro) {
      setSaveNotice({ type: "error", text: result.erro });
    } else {
      mirrorLegacyPayrollScenario({
        name,
        baseSalary,
        dependants,
        mealDaily: mealEnabled ? parseNumber(mealDaily) : 0,
        mealCard,
        mealDays: mealEnabled ? Math.min(31, Math.floor(parseNumber(mealDays))) : 0,
        duodecimos,
      });
      setSaveNotice({ type: "ok", text: "Cenário guardado com todas as rubricas." });
    }
    setSaveDialog(false);
  }

  /**
   * O documento — um modelo, quatro formatos. O PDF, o XLSX e os dois CSV leem
   * daqui, e é essa a razão de o líquido ser garantidamente o mesmo número nos
   * quatro: não há «cada formato», há um modelo.
   */
  async function construirDocumento(): Promise<DocumentoVencimento> {
    return {
      periodo: `${MONTHS[month]} de ${FISCAL_YEAR}`,
      proveniencia: await criarProveniencia("vencimento", snapshot),
      pressupostos: [
        { codigo: "mes", rotulo: "Mês", valor: `${MONTHS[month]} de ${FISCAL_YEAR}` },
        { codigo: "situacao_familiar", rotulo: "Situação familiar", valor: FAMILY_OPTIONS.find(([value]) => value === maritalStatus)?.[1] ?? "—" },
        { codigo: "regiao_fiscal", rotulo: "Região fiscal", valor: REGION_OPTIONS.find(([value]) => value === region)?.[1] ?? "Continente" },
        { codigo: "horas_por_semana", rotulo: "Horas por semana", valor: `${numeroDoc(parseNumber(weeklyHours))} h` },
        { codigo: "dependentes", rotulo: "Dependentes", valor: String(dependants) },
        { codigo: "dependentes_com_incapacidade", rotulo: "Dependentes com incapacidade ≥ 60%", valor: String(Math.min(dependants, dependantsWithDisability)) },
        { codigo: "fator_incapacidade", rotulo: "Fator comunicado à empresa", valor: dependantsWithDisability > 0 ? `${effectiveFactor}×` : "—" },
        { codigo: "conjuge_com_incapacidade", rotulo: "Cônjuge com incapacidade ≥ 60%", valor: effectiveSpouseDisability ? "Sim" : "Não" },
        { codigo: "titular_com_incapacidade", rotulo: "Titular com incapacidade ≥ 60%", valor: disability ? "Sim" : "Não" },
        { codigo: "subsidio_refeicao", rotulo: "Subsídio de refeição", valor: mealEnabled ? `${fmt(parseNumber(mealDaily))}/dia · ${mealCard ? "cartão" : "dinheiro"} · ${Math.min(31, Math.floor(parseNumber(mealDays)))} dias` : "Não aplicável" },
        { codigo: "duodecimos", rotulo: "Subsídios de férias e Natal", valor: duodecimos ? "Em duodécimos" : "Por inteiro" },
        { codigo: "irs_jovem", rotulo: "IRS Jovem", valor: youthIrs ? `${youthYear}.º ano` : "Não aplicável" },
      ],
      linhas: calculation.lines,
      mes: calculation.result,
      ano: annual,
      custoEmpresa: companyCost,
      baseLegal: [
        { norma: "Despacho n.º 233-A/2026", determina: "Tabelas de retenção na fonte aplicadas à remuneração deste mês e a cada subsídio", verificadoEm: DATA_LAST_REVIEW },
        { norma: "Código Contributivo, arts. 44.º-48.º", determina: "Base de incidência da Segurança Social e taxas de 11% e 23,75%", verificadoEm: DATA_LAST_REVIEW },
        { norma: "Art. 2.º, n.º 3 CIRS", determina: "Limites isentos do subsídio de refeição e das ajudas de custo", verificadoEm: DATA_LAST_REVIEW },
        { norma: "Art. 99.º-C CIRS", determina: "Retenção autónoma dos subsídios de férias e de Natal e do trabalho suplementar", verificadoEm: DATA_LAST_REVIEW },
        { norma: "CT arts. 262.º e 271.º", determina: "Retribuição horária que valoriza horas extra, trabalho noturno e faltas", verificadoEm: DATA_LAST_REVIEW },
      ],
      ambito: [
        "Não substitui o recibo emitido pela entidade empregadora.",
        "Mostra a RETENÇÃO na fonte do mês, não o IRS apurado no ano — o acerto depende da declaração completa.",
        "Não modela benefícios em espécie (viatura, seguros, planos de pensões) nem instrumentos de regulamentação coletiva mais favoráveis.",
        "O custo da empresa não inclui o seguro de acidentes de trabalho, formação nem custos indiretos.",
      ],
      memoria: [
        { rubrica: "Retribuição horária", formula: "(retribuição mensal × 12) ÷ (52 × horas semanais)", valor: calculation.result.retribuicaoHoraria, fonte: "CT art. 271.º" },
        { rubrica: "Base de incidência da SS", formula: "soma das rubricas contributivas do mês", valor: calculation.result.baseSS, fonte: "CRC arts. 44.º-48.º" },
        { rubrica: "Segurança Social do trabalhador", formula: `base × ${pct(SS_DEPENDENTE.trabalhador.value)}`, valor: calculation.result.ssTrabalhador, fonte: "CRC art. 53.º" },
        { rubrica: "Retenção da remuneração mensal", formula: "R × taxa marginal − parcela a abater − parcelas por dependente e por incapacidade", valor: calculation.result.irsBaseMensal, fonte: "Despacho 233-A/2026" },
        { rubrica: "Retenção do trabalho suplementar", formula: "suplementar × 50% da taxa efetiva do mês", valor: calculation.result.suplementarIRS, fonte: "Despacho 233-A/2026, n.º 5 al. f)" },
        { rubrica: "Retenção dos subsídios", formula: "imposto do direito completo × fração paga", valor: calculation.result.irsSubsidios, fonte: "Art. 99.º-C, n.º 6 CIRS" },
        { rubrica: "Líquido do mês", formula: "bruto/caixa − Segurança Social − IRS", valor: calculation.result.liquido, fonte: "—" },
      ],
    };
  }

  async function exportCsv() {
    if (!exportAccess.tentarExportar("vencimento")) return;
    const doc = await construirDocumento();
    for (const { variante, tabela } of tabelasCSV(doc)) {
      for (const dialeto of ["humano", "maquina"] as const) {
        descarregar(
          escreverCSV(tabela, { dialeto }),
          nomeFicheiro({
            assunto: "relatorio de vencimento",
            periodo: doc.periodo,
            referencia: doc.proveniencia.referencia,
            variante: dialeto === "maquina" ? `${variante}-dados` : variante,
            extensao: "csv",
          }),
          MIME.csv,
        );
      }
    }
  }

  async function exportXlsx() {
    if (!exportAccess.tentarExportar("vencimento")) return;
    const doc = await construirDocumento();
    const { construirXLSX } = await import("@/lib/export/xlsx");
    descarregar(
      await construirXLSX(livroXLSX(doc)),
      nomeFicheiro({
        assunto: "relatorio de vencimento",
        periodo: doc.periodo,
        referencia: doc.proveniencia.referencia,
        extensao: "xlsx",
      }),
      MIME.xlsx,
    );
  }

  /**
   * O PDF é composto NO SERVIDOR.
   *
   * Enquanto era gerado no cliente, `localStorage.clear()` devolvia as
   * exportações todas, para sempre, em qualquer browser — o servidor nunca via
   * o pedido, e o gate era decorativo. E o que saía era uma janela de impressão
   * com o desenho de cada computador, não o documento da marca.
   *
   * O cliente envia PRESSUPOSTOS, nunca resultados: se enviasse resultados, o
   * documento assinado pela marca podia dizer qualquer coisa.
   */
  async function exportPdf() {
    if (!exportAccess.tentarExportar("vencimento")) return;
    setExportState({ estado: "a-compor" });
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setExportState({ estado: "erro", texto: "Inicia sessão para descarregar o relatório." });
        return;
      }
      const resposta = await fetch("/api/documentos/vencimento", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          contexto: makeContext(baseSalary),
          rubricas: rubrics,
          duodecimos,
          periodo: `${MONTHS[month]} de ${FISCAL_YEAR}`,
          pressupostos: (await construirDocumento()).pressupostos,
        }),
      });
      if (resposta.status === 402) {
        // O cliente reage ao CÓDIGO, não a uma comparação de strings.
        setExportState({ estado: "erro", texto: "O relatório em PDF faz parte do Plus." });
        return;
      }
      if (!resposta.ok) {
        setExportState({ estado: "erro", texto: "Não foi possível compor o relatório. Tenta de novo." });
        return;
      }
      const referencia = resposta.headers.get("x-documento-referencia") ?? "";
      descarregar(
        await resposta.arrayBuffer(),
        nomeFicheiro({
          assunto: "relatorio de vencimento",
          periodo: `${MONTHS[month]} de ${FISCAL_YEAR}`,
          referencia: referencia || "RC",
          extensao: "pdf",
        }),
        MIME.pdf,
      );
      setExportState({ estado: "pronto", texto: referencia });
    } catch {
      setExportState({ estado: "erro", texto: "Não foi possível contactar o servidor." });
    }
  }

  const mealExceeds = mealEnabled && parseNumber(mealDaily) > mealLimit(mealCard);
  const weeklyHoursInvalid = validateContext(context).length > 0;
  const auditInput = {
    salarioBruto: baseSalary,
    dependentes: dependants,
    dependentesDeficientes: Math.min(dependants, dependantsWithDisability),
    fatorDependenteDeficiente: effectiveFactor,
    conjugeDeficiente: effectiveSpouseDisability,
    subsidioRefeicaoDia: mealEnabled ? parseNumber(mealDaily) : 0,
    subsidioRefeicaoCartao: mealCard,
    diasUteis: parseNumber(mealDays),
    estadoCivil: maritalStatus,
    deficiencia: disability,
    regiao: region,
    irsJovemAno: youthIrs ? youthYear : undefined,
  };
  const defaultScenarioName = `Recibo · ${MONTHS[month]} 2026 · ${fmt(calculation.result.liquido)} líquidos`;

  return (
    <div className="my-8 space-y-5">
      <div className="overflow-hidden rounded-3xl border border-brand/15 bg-gradient-to-br from-white to-brand-light/50 shadow-card dark:from-stone-900 dark:to-brand/5">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"><Sparkle size={11} /> Novo motor de recibo</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/15 bg-white px-2.5 py-1 text-[10px] font-semibold text-brand-dark dark:bg-stone-900 dark:text-brand-light"><ShieldCheck size={11} /> Explicado por rubrica</span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-stone-900 dark:text-white">Constrói o recibo como ele realmente é.</h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">Começa pelo salário, adiciona cada rubrica e vê o efeito em IRS, Segurança Social, líquido e custo da empresa — sem teres de saber a regra fiscal.</p>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-stone-100 bg-white p-1.5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            {[["01", "Contexto"], ["02", "Rubricas"], ["03", "Resultado"]].map(([number, label]) => <div key={number} className="rounded-xl px-3 py-2 text-center"><span className="block text-[9px] font-bold text-brand">{number}</span><span className="mt-0.5 block text-[10px] font-semibold text-stone-500">{label}</span></div>)}
          </div>
        </div>
      </div>

      <ImportarReciboPDF onAplicar={applyImportedReceipt} />
      {imported && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand/20 bg-brand-light/50 px-4 py-3 text-xs text-brand-dark dark:bg-brand/10 dark:text-brand-light">
            <span className="inline-flex items-center gap-2"><Check size={13} /> Recibo importado{imported.empresaNome ? ` · ${imported.empresaNome}` : ""}{imported.mes !== undefined ? ` · ${MONTHS[imported.mes]}` : ""}</span>
            <span className="text-[10px] opacity-70">Confirma as rubricas assinaladas antes de concluir.</span>
          </div>
          {imported.ano !== undefined && imported.ano !== FISCAL_YEAR && (
            /* As tabelas deste simulador são as de 2026. Recalcular um recibo de
               outro ano com elas dá um resultado errado — e a diferença apareceria
               como se fosse um erro da entidade empregadora. */
            <div className="flex items-start gap-2 rounded-2xl border border-alert-border bg-alert-bg p-3.5 text-[11px] leading-relaxed text-alert-text">
              <Warning size={13} className="mt-0.5 flex-none" />
              <span>O recibo importado é de <strong>{imported.ano}</strong>, mas este simulador aplica as tabelas de retenção de {FISCAL_YEAR}. Os valores esperados e a auditoria não são comparáveis com um recibo de outro ano.</span>
            </div>
          )}
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-12">
        {/* min-w-0: sem isto, o conteúdo de largura mínima intrínseca (ex.: a
            barra de filtros do construtor) alarga a coluna da grelha e provoca
            scroll horizontal em toda a página no telemóvel. */}
        <div className="min-w-0 space-y-5 lg:col-span-7">
          <section className="rounded-3xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6">
            <SectionHeader step="Passo 01" icon={<LayoutGrid size={17} />} title="Contexto do recibo" hint="Só pedimos dados que mudam a retenção ou o cálculo das rubricas." />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Mês <InfoTip label="Para que serve o mês">Identifica o período do recibo, do cenário guardado e das exportações. As tabelas de retenção de 2026 são iguais em todos os meses do ano, por isso mudar o mês não altera o IRS nem a Segurança Social.</InfoTip></span><span className="relative block"><Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><select value={month} onChange={(event) => setMonth(Number(event.target.value))} className={`${inputClass} pl-9`}>{MONTHS.map((label, index) => <option key={label} value={index}>{label} 2026</option>)}</select></span></label>
              <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-400">Horas por semana</span><span className="relative block"><input type="text" inputMode="decimal" value={weeklyHours} onChange={(event) => setWeeklyHours(sanitizeNumericDraft(event.target.value))} aria-invalid={weeklyHoursInvalid} aria-describedby={weeklyHoursInvalid ? "weekly-hours-error" : undefined} className={`${inputClass} pr-12 ${weeklyHoursInvalid ? "border-alert-border focus:border-alert-border focus:ring-alert-border/20" : ""}`} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">horas</span></span>{weeklyHoursInvalid && <span id="weekly-hours-error" className="mt-1.5 block text-[11px] leading-relaxed text-alert-text">Indica entre {WEEKLY_HOURS_RANGE.min} e {WEEKLY_HOURS_RANGE.max} horas — é a base do valor da hora extra e do desconto por falta.</span>}</label>
            </div>

            <div className="mt-4">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Situação familiar <InfoTip label="Despacho 233-A/2026, n.ºs 8 e 9">As tabelas de «casado» aplicam-se também à união de facto enquadrável no Art. 14.º do CIRS. A tabela de «único titular» só é aplicável se o outro cônjuge ou unido de facto não auferir rendimentos englobáveis ou se um dos dois tiver pelo menos {pct(RETENCAO_UNICO_TITULAR_FRACAO.value)} do rendimento englobado do agregado.</InfoTip></span>
              <div className="grid gap-1 rounded-2xl bg-stone-100 p-1 dark:bg-stone-800 sm:grid-cols-3">{FAMILY_OPTIONS.map(([value, label]) => <button key={value} type="button" aria-pressed={maritalStatus === value} onClick={() => setMaritalStatus(value)} className={segmentClass(maritalStatus === value)}>{label}</button>)}</div>
              {maritalStatus === "casadoUnico" && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-stone-400"><Warning size={12} className="mt-0.5 flex-none" /> Confirma a condição do n.º 9: só é «único titular» se o outro titular não tiver rendimentos englobáveis, ou se um dos dois concentrar {pct(RETENCAO_UNICO_TITULAR_FRACAO.value)} do rendimento do agregado. Caso contrário, a tabela correta é a de dois titulares.</p>
              )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="dependants-count" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Dependentes <InfoTip label="Art. 13.º CIRS">Contam os filhos, adotados e enteados menores; os maiores até aos 25 anos que não aufiram anualmente mais do que a retribuição mínima mensal garantida; e os inaptos para o trabalho e para angariar meios de subsistência. Em guarda partilhada, cada dependente conta para o agregado conforme a residência acordada e comunicada à AT.</InfoTip></label>
                <Stepper id="dependants-count" value={dependants} min={0} max={20} decreaseLabel="Menos dependentes" increaseLabel="Mais dependentes" onChange={(value) => { setDependants(value); if (value < dependantsWithDisability) setDependantsWithDisability(value); }} />
              </div>
              <div><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-400">Região fiscal</span><div className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-100 p-1 dark:bg-stone-800">{REGION_OPTIONS.map(([value, label]) => <button key={value} type="button" aria-pressed={region === value} onClick={() => setRegion(value)} className={segmentClass(region === value)}>{label}</button>)}</div></div>
            </div>

            {dependants > 0 && (
              <div className="mt-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Heart size={15} className="flex-none text-brand" />
                    <label htmlFor="dependants-disability" className="text-xs font-medium text-stone-600 dark:text-stone-300">Com incapacidade ≥ 60%</label>
                    <InfoTip label="Despacho 233-A/2026, n.º 5 al. a)">
                      Cada dependente com grau de incapacidade permanente ≥ 60% (atestado multiúso) acresce {fmt(maritalStatus === "casadoDois" ? RETENCAO_DEP_DEFICIENTE.value.casadoDois : RETENCAO_DEP_DEFICIENTE.value.naoCasadoOuUnico)} à parcela a abater da retenção — ou seja, reduz o IRS retido TODOS OS MESES. No acerto anual acresce ainda {fmt(DEDUCAO_DEPENDENTE_DEFICIENCIA.value)} de dedução à coleta por dependente (2,5 × IAS, Art. 87.º CIRS).
                    </InfoTip>
                  </div>
                  <Stepper id="dependants-disability" value={dependantsWithDisability} min={0} max={dependants} decreaseLabel="Menos dependentes com incapacidade" increaseLabel="Mais dependentes com incapacidade" onChange={setDependantsWithDisability} />
                </div>
                {dependantsWithDisability > 0 && (
                  <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Fator comunicado à empresa <InfoTip label="Despacho 233-A/2026, n.ºs 6 e 7">A parcela por dependente com incapacidade pode ser multiplicada até {maxDisabilityFactor}× nesta situação familiar. O fator não é automático: tem de ser comunicado à entidade que paga o rendimento antes do pagamento. Deixa em 1× se não o comunicaste.</InfoTip></span>
                    <div className={`grid gap-1 rounded-2xl bg-stone-100 p-1 dark:bg-stone-800 ${maxDisabilityFactor > 3 ? "grid-cols-6" : "grid-cols-3"}`}>
                      {Array.from({ length: maxDisabilityFactor }, (_, index) => index + 1).map((value) => (
                        <button key={value} type="button" aria-pressed={effectiveFactor === value} onClick={() => setDisabilityFactor(value)} className={segmentClass(effectiveFactor === value)}>{value}×</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {maritalStatus === "casadoUnico" && (
              <label className={`mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${spouseDisability ? "border-brand/30 bg-brand-light/40 dark:bg-brand/10" : "border-stone-200 dark:border-stone-700"}`}>
                <input type="checkbox" checked={spouseDisability} onChange={(event) => setSpouseDisability(event.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-brand" />
                <span>
                  <span className="block text-xs font-semibold text-stone-700 dark:text-stone-200">Cônjuge com incapacidade ≥ 60% e sem rendimentos</span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-stone-400">Acresce {fmt(RETENCAO_CONJUGE_DEFICIENTE.value)} à parcela a abater todos os meses (Despacho 233-A/2026, n.º 5 al. b). Só se aplica se o cônjuge ou unido de facto não auferir rendimentos das categorias A ou H.</span>
                </span>
              </label>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${disability ? "border-brand/30 bg-brand-light/40 dark:bg-brand/10" : "border-stone-200 dark:border-stone-700"}`}><input type="checkbox" checked={disability} onChange={(event) => setDisability(event.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" /><span><span className="block text-xs font-semibold text-stone-700 dark:text-stone-200">Incapacidade ≥ 60%</span><span className="mt-0.5 block text-[10px] leading-relaxed text-stone-400">Seleciona as tabelas próprias do titular.</span></span></label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${duodecimos ? "border-brand/30 bg-brand-light/40 dark:bg-brand/10" : "border-stone-200 dark:border-stone-700"}`}><input type="checkbox" checked={duodecimos} onChange={(event) => setDuodecimos(event.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" /><span><span className="block text-xs font-semibold text-stone-700 dark:text-stone-200">Recebo em duodécimos</span><span className="mt-0.5 block text-[10px] leading-relaxed text-stone-400">Acrescenta 1/12 de férias e Natal; a retenção de cada parcela é proporcional ao imposto do subsídio completo.</span></span></label>
            </div>

            <div className={`mt-4 rounded-2xl border p-4 ${youthIrs ? "border-brand/30 bg-brand-light/40 dark:bg-brand/10" : "border-stone-200 dark:border-stone-700"}`}>
              <div className="flex items-start gap-2.5">
                <label className="flex min-w-0 shrink cursor-pointer items-start gap-2.5"><input type="checkbox" checked={youthIrs} onChange={(event) => setYouthIrs(event.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-brand" /><Sparkle size={14} className="mt-0.5 flex-none text-brand" /><span className="min-w-0 text-xs font-semibold leading-snug text-stone-700 dark:text-stone-200">Pedi à entidade empregadora para aplicar IRS Jovem</span></label>
                <span className="mt-0.5 flex-none"><InfoTip label="Confirmação necessária">O regime não é ativado apenas pela idade. Esta opção confirma que o benefício foi invocado perante a entidade empregadora.</InfoTip></span>
              </div>
              {youthIrs && <div className="mt-3"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Ano do benefício</span><div className="grid grid-cols-5 gap-1 rounded-xl bg-white/70 p-1 dark:bg-stone-800">{Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <button key={value} type="button" onClick={() => setYouthYear(value)} className={segmentClass(youthYear === value)}>{value}.º</button>)}</div></div>}
            </div>
          </section>

          <section className="rounded-3xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6">
            <SectionHeader step="Passo 02" icon={<Receipt size={17} />} title="Rubricas do mês" hint="O vencimento base e a refeição ficam sempre visíveis. Adiciona apenas o que existe neste recibo." />

            <div className="rounded-2xl border border-brand/20 bg-brand-light/35 p-4 dark:bg-brand/5">
              <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-brand shadow-sm dark:bg-stone-800"><Wallet size={15} /></span><div><h4 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Vencimento base</h4><p className="text-[10px] text-stone-400">Remuneração mensal contratada</p></div></div><span className="rounded-full bg-brand px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white">Principal</span></div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="min-w-0">
                  {mode === "gross" ? <MoneyField id="gross-salary" label="Salário bruto" value={gross} onChange={setGross} /> : <MoneyField id="target-net" label="Líquido que queres receber" value={target} onChange={setTarget} hint="objetivo" />}
                </div>
                <div className="min-w-0"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-400">Modo</span><div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 dark:bg-stone-800"><button type="button" onClick={() => setMode("gross")} className={segmentClass(mode === "gross")}>Bruto → líquido</button><button type="button" onClick={() => setMode("target")} className={segmentClass(mode === "target")}>Quero receber</button></div></div>
              </div>
              {mode === "target" && <p className={`mt-2 text-[11px] ${targetSolution?.reached ? "text-brand-dark dark:text-brand-light" : "text-alert-text"}`}>{targetSolution?.reached ? `Para chegar a ${fmt(parseNumber(target))}, o salário-base estimado é ${fmt(targetGross ?? 0)}.` : "O objetivo indicado excede o intervalo suportado por esta simulação."}</p>}
            </div>

            <div className="mt-3 rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-500 dark:bg-stone-800"><Wallet size={15} /></span><div><h4 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Subsídio de refeição</h4><p className="text-[10px] text-stone-400">O limite é aplicado por dia, não ao total do mês.</p></div></div><label className="inline-flex cursor-pointer items-center gap-2 text-[10px] font-semibold text-stone-500"><input type="checkbox" checked={mealEnabled} onChange={(event) => setMealEnabled(event.target.checked)} className="h-4 w-4 accent-brand" /> Incluir</label></div>
              {mealEnabled && <div className="mt-3 grid gap-3 sm:grid-cols-3"><MoneyField id="meal-daily" label="Valor por dia" value={mealDaily} onChange={setMealDaily} hint={`limite ${fmt(mealLimit(mealCard))}`} /><label><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-400">Dias pagos</span><input type="text" inputMode="numeric" value={mealDays} onChange={(event) => setMealDays(dayDraft(event.target.value))} className={inputClass} /></label><div><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-400">Forma</span><div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800"><button type="button" onClick={() => setMealCard(false)} className={segmentClass(!mealCard)}>Dinheiro</button><button type="button" onClick={() => setMealCard(true)} className={segmentClass(mealCard)}>Cartão</button></div></div></div>}
              {mealExceeds && <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-alert-text"><Warning size={12} className="mt-0.5 flex-none" /> O excesso diário de {fmt(parseNumber(mealDaily) - mealLimit(mealCard))} integra as bases de IRS e Segurança Social.</p>}
            </div>

            <div className="mt-3"><ConstrutorRecibo rubrics={rubrics} onChange={setRubrics} onPendingBenefit={(label) => setPendingNotice(label)} /></div>
            {pendingNotice && <div className="mt-3 flex items-start justify-between gap-3 rounded-2xl border border-alert-border bg-alert-bg p-3.5"><div className="flex gap-2"><Warning size={14} className="mt-0.5 flex-none text-alert-text" /><div><p className="text-xs font-semibold text-alert-text">{pendingNotice}: precisamos de mais factos</p><p className="mt-1 text-[11px] leading-relaxed text-alert-text/80">Este benefício só será adicionado quando a matriz fiscal conseguir explicar IRS e SS sem presumir o enquadramento.</p></div></div><button type="button" onClick={() => setPendingNotice(null)} className="flex-none text-[11px] font-semibold text-alert-text underline">Fechar</button></div>}
          </section>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <ResultadoMotorRecibo
            result={calculation.result}
            lines={calculation.lines}
            annual={annual}
            employerCost={companyCost}
            hasMonthlyExtras={rubrics.length > 0}
            duodecimos={duodecimos}
            issues={issues}
            targetGross={mode === "target" ? targetGross : undefined}
            dependentesDeficientes={Math.min(dependants, dependantsWithDisability)}
            fatorDependentesDeficientes={effectiveFactor}
            conjugeDeficiente={effectiveSpouseDisability}
            estadoCivil={maritalStatus}
          />
        </div>
      </div>

      <section className="rounded-3xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6">
        <SectionHeader step="Passo 03" icon={<Calculator size={17} />} title="Confirma e guarda" hint="Compara com o recibo real, investiga diferenças e preserva o cenário completo." />
        <AuditoriaPainel
          key={auditKey}
          input={auditInput}
          irsInicial={imported?.irsRetido !== undefined ? String(imported.irsRetido).replace(".", ",") : ""}
          ssInicial={imported?.ssDesconto !== undefined ? String(imported.ssDesconto).replace(".", ",") : ""}
          remuneracaoSujeita={imported?.remuneracaoSujeita}
          esperado={{
            irs: calculation.result.irsTotal,
            ss: calculation.result.ssTrabalhador,
            irsBase: Math.round((calculation.result.brutoTotal - calculation.result.ajudasIsentas - calculation.result.subsidioRefeicaoIsento) * 100) / 100,
            brutoCaixa: calculation.result.brutoTotal,
            liquido: calculation.result.liquido,
            custoEmpresa: companyCost,
          }}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-100 p-4 dark:border-stone-800"><div className="flex items-center gap-2"><History size={15} className="text-brand" /><p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Guardar cenário</p></div><p className="mt-1 text-[10px] leading-relaxed text-stone-400">Preserva contexto, rubricas e modo de cálculo para comparar mais tarde.</p><button type="button" disabled={limiteAtingido} onClick={() => setSaveDialog(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-glow transition hover:shadow-float disabled:cursor-not-allowed disabled:opacity-50"><Plus size={13} /> Guardar</button><p className="mt-2 text-[9px] text-stone-400">{naNuvem ? "Sincronização na nuvem ativa" : `Plano grátis: ${limite} cenário`}</p></div>
          <ProGate title="Exportar recibo detalhado" description="Leva a decomposição por rubrica para a folha de cálculo, para PDF ou para dados.">
            <div className="rounded-2xl border border-stone-100 p-4 dark:border-stone-800">
              <div className="flex items-center gap-2"><Export size={15} className="text-brand" /><p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Relatório e dados</p></div>
              <p className="mt-1 text-[10px] leading-relaxed text-stone-400">Pressupostos, rubrica a rubrica, memória de cálculo e base legal. Os ficheiros partilham a mesma referência.</p>
              {/* A folha de cálculo é o formato humano: um recibo tem várias
                  tabelas e um CSV só sabe ter uma. Daí ser o botão em destaque. */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void exportXlsx().catch(() => {})} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-[11px] font-semibold text-white shadow-glow transition hover:shadow-float"><LayoutGrid size={13} /> Folha de cálculo</button>
                <button type="button" onClick={() => void exportPdf().catch(() => {})} className="inline-flex items-center gap-1.5 rounded-xl border border-brand/25 bg-brand-light px-3 py-2 text-[11px] font-semibold text-brand-dark"><FileSign size={13} /> PDF</button>
                <button type="button" onClick={() => void exportCsv().catch(() => {})} className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-[11px] font-semibold text-stone-600 transition hover:border-brand hover:text-brand dark:border-stone-700 dark:text-stone-300"><Export size={13} /> CSV</button>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-stone-400">O CSV sai em dois dialetos: um para o Excel em português, outro em RFC 4180 para importar noutro programa.</p>
              {exportState.estado !== "inativo" && (
                <p aria-live="polite" className={`mt-2 text-[10px] leading-relaxed ${exportState.estado === "erro" ? "text-alert-text" : "text-brand-dark dark:text-brand-light"}`}>
                  {exportState.estado === "a-compor" && "A compor o relatório…"}
                  {exportState.estado === "pronto" && `Relatório emitido${exportState.texto ? ` · referência ${exportState.texto}` : ""}.`}
                  {exportState.estado === "erro" && exportState.texto}
                </p>
              )}
            </div>
          </ProGate>
        </div>

        {saveNotice && <div className={`mt-3 flex items-start gap-2 rounded-2xl border p-3 text-xs ${saveNotice.type === "ok" ? "border-brand/20 bg-brand-light text-brand-dark" : "border-clay-border bg-clay-bg text-clay-text"}`}><ShieldCheck size={14} className="mt-0.5 flex-none" /><span>{saveNotice.text} {saveNotice.type === "ok" && <Link href="/dashboard/cenarios" className="ml-1 inline-flex items-center gap-0.5 font-semibold underline">Ver cenários <ArrowRight size={11} /></Link>}</span></div>}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3.5 dark:border-stone-800 dark:bg-stone-900/50"><div className="flex items-center gap-2 text-stone-600 dark:text-stone-300"><ShieldCheck size={14} className="text-brand" /><span className="text-[11px] font-semibold">Fontes oficiais 2026</span></div><p className="mt-1 text-[9px] leading-relaxed text-stone-400">AT, Diário da República e Segurança Social.</p></div>
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3.5 dark:border-stone-800 dark:bg-stone-900/50"><div className="flex items-center gap-2 text-stone-600 dark:text-stone-300"><Receipt size={14} className="text-brand" /><span className="text-[11px] font-semibold">Rubrica a rubrica</span></div><p className="mt-1 text-[9px] leading-relaxed text-stone-400">Bases e descontos nunca ficam escondidos num total.</p></div>
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3.5 dark:border-stone-800 dark:bg-stone-900/50"><div className="flex items-center gap-2 text-stone-600 dark:text-stone-300"><Building size={14} className="text-brand" /><span className="text-[11px] font-semibold">Custo completo</span></div><p className="mt-1 text-[9px] leading-relaxed text-stone-400">Inclui caixa e Segurança Social da entidade.</p></div>
      </div>

      <p className="px-2 text-center text-[10px] leading-relaxed text-stone-400">Estimativa informativa. O resultado depende dos factos e documentos introduzidos e não substitui o recibo oficial nem aconselhamento profissional.</p>

      <UpsellExportacao aberto={exportAccess.upsellAberto} onClose={exportAccess.fecharUpsell} />
      <GuardarCenarioDialog aberto={saveDialog} nomePadrao={defaultScenarioName} onGuardar={saveScenario} onFechar={() => setSaveDialog(false)} />
    </div>
  );
}
