"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  EMPLOYMENT_OFFER_POLICY_DATE,
  PORTUGAL_PAYROLL_POLICY_2026,
  eurFromDecimal,
  planEmploymentOffer,
  productiveShareRate,
  ratePpm,
  type EmploymentOfferInput,
  type EmploymentOfferResult,
  type PlannerGoal,
} from "../../../ReciboCerto-Fiscal-Engine/src";
import { legacy2026WithholdingResolver } from "@/lib/payroll-engine-adapter";
import LocalizedNumberInput from "@/components/ui/LocalizedNumberInput";
import ContabilistasNoResultado from "@/components/diretorio/ContabilistasNoResultado";
import { registar } from "@/lib/analytics/cliente";
import { contextoContratacao } from "@/lib/analytics/contratacao";
import {
  ArrowRight,
  Briefcase,
  Building,
  Calendar,
  Calculator,
  Check,
  Clock,
  Coin,
  Download,
  FileSign,
  Lock,
  RotateCcw,
  ShieldCheck,
  Target,
  User,
  Warning,
} from "@/components/ui/Icons";

type Jurisdiction = "PT-CONTINENTE" | "PT-MADEIRA" | "PT-ACORES";
type MaritalStatus = "not_married" | "married_single_holder" | "married_two_holders";
type TriState = "unknown" | "yes" | "no";
type ResultTab = "package" | "calendar" | "capacity" | "supports" | "proposal";

interface PlannerState {
  goal: PlannerGoal;
  annualBudget: number;
  safetyMarginPercent: number;
  targetNet: number;
  baseSalary: number;
  startMonth: number;
  weeklyHours: number;
  jurisdiction: Jurisdiction;
  subsidyPayment: "normal" | "duodecimos";
  fixedMonthlyBonus: number;
  variableAnnualBonus: number;
  bonusRegularity: "regular" | "not_regular" | "unknown";
  mealDaily: number;
  mealDays: number;
  mealMethod: "cash" | "card_or_voucher";
  accidentInsurance: number;
  healthAndSafety: number;
  training: number;
  equipment: number;
  otherAnnual: number;
  productive: boolean;
  productiveSharePercent: number;
  pricePerHour: number;
  contributionMarginPercent: number;
  expectedBillableHoursMonthly: number;
  candidateMode: "range" | "authorized";
  candidateDependants: number;
  candidateMaritalStatus: MaritalStatus;
  candidateDisability: boolean;
  registeredUnemployed: TriState;
  permanentContract: TriState;
  fullTime: TriState;
  applicationBeforeContract: TriState;
  candidateAge: number;
  qualificationLevel: number;
  calculated: boolean;
}

const INITIAL: PlannerState = {
  goal: "employer_budget",
  annualBudget: 42_000,
  safetyMarginPercent: 5,
  targetNet: 1_500,
  baseSalary: 1_500,
  startMonth: 1,
  weeklyHours: 40,
  jurisdiction: "PT-CONTINENTE",
  subsidyPayment: "normal",
  fixedMonthlyBonus: 0,
  variableAnnualBonus: 0,
  bonusRegularity: "unknown",
  mealDaily: 10.2,
  mealDays: 22,
  mealMethod: "card_or_voucher",
  accidentInsurance: 0,
  healthAndSafety: 0,
  training: 0,
  equipment: 1_200,
  otherAnnual: 0,
  productive: true,
  productiveSharePercent: 65,
  pricePerHour: 0,
  contributionMarginPercent: 65,
  expectedBillableHoursMonthly: 100,
  candidateMode: "range",
  candidateDependants: 0,
  candidateMaritalStatus: "not_married",
  candidateDisability: false,
  registeredUnemployed: "unknown",
  permanentContract: "unknown",
  fullTime: "unknown",
  applicationBeforeContract: "unknown",
  candidateAge: 0,
  qualificationLevel: 0,
  calculated: false,
};

type Action =
  | { type: "set"; key: keyof PlannerState; value: PlannerState[keyof PlannerState] }
  | { type: "calculate" }
  | { type: "reset" };

function reducer(state: PlannerState, action: Action): PlannerState {
  if (action.type === "reset") return INITIAL;
  if (action.type === "calculate") return { ...state, calculated: true };
  return { ...state, [action.key]: action.value };
}

const GOALS: Array<{
  value: PlannerGoal;
  title: string;
  description: string;
  Icon: typeof Building;
}> = [
  {
    value: "employer_budget",
    title: "Tenho um orçamento",
    description: "Descobrir o salário e o pacote que cabem no custo anual máximo.",
    Icon: Building,
  },
  {
    value: "target_net",
    title: "Quero garantir um líquido",
    description: "Estimar o bruto e o custo necessário para chegar ao líquido pretendido.",
    Icon: Target,
  },
  {
    value: "known_offer",
    title: "Já tenho uma proposta",
    description: "Ver o custo total, o líquido provável e os meses mais pesados.",
    Icon: FileSign,
  },
  {
    value: "required_capacity",
    title: "O posto tem de se pagar",
    description: "Traduzir o custo em horas, receita e capacidade comercial necessária.",
    Icon: Clock,
  },
];

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const TABS: Array<{ value: ResultTab; label: string }> = [
  { value: "package", label: "Os três dinheiros" },
  { value: "calendar", label: "Calendário" },
  { value: "capacity", label: "Viabilidade" },
  { value: "supports", label: "Apoios" },
  { value: "proposal", label: "Proposta" },
];

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

const money = (value: number) => eurFromDecimal(Math.max(0, Number.isFinite(value) ? value : 0));
const triBool = (value: TriState): boolean | undefined =>
  value === "unknown" ? undefined : value === "yes";

function inputFromState(state: PlannerState): EmploymentOfferInput {
  const withCandidate = state.candidateMode === "authorized";
  return {
    period: "2026-08",
    policyDate: EMPLOYMENT_OFFER_POLICY_DATE,
    goal: state.goal,
    employer: {
      annualBudget: state.goal === "employer_budget" && state.annualBudget > 0
        ? money(state.annualBudget)
        : undefined,
      safetyMargin: state.goal === "employer_budget"
        ? ratePpm(Math.round(state.safetyMarginPercent * 10_000))
        : undefined,
    },
    role: {
      startMonth: Math.round(state.startMonth),
      weeklyHoursHundredths: Math.round(state.weeklyHours * 100),
      jurisdiction: state.jurisdiction,
      productive: state.productive,
      productiveShare: state.productive
        ? productiveShareRate(state.productiveSharePercent)
        : undefined,
    },
    package: {
      baseSalaryMonthly: money(
        state.goal === "known_offer" || state.goal === "required_capacity"
          ? state.baseSalary
          : 0,
      ),
      subsidyPayment: state.subsidyPayment,
      fixedMonthlyBonus: state.fixedMonthlyBonus > 0 ? money(state.fixedMonthlyBonus) : undefined,
      variableAnnualBonus: state.variableAnnualBonus > 0 ? money(state.variableAnnualBonus) : undefined,
      variableBonusSocialSecurityRegularity: state.variableAnnualBonus > 0
        ? state.bonusRegularity
        : undefined,
      mealAllowance: state.mealDaily > 0 && state.mealDays > 0
        ? {
            dailyAmount: money(state.mealDaily),
            daysPerMonth: Math.round(state.mealDays),
            method: state.mealMethod,
          }
        : undefined,
    },
    postCosts: {
      accidentInsuranceAnnual: state.accidentInsurance > 0 ? money(state.accidentInsurance) : undefined,
      healthAndSafetyAnnual: state.healthAndSafety > 0 ? money(state.healthAndSafety) : undefined,
      trainingAnnual: state.training > 0 ? money(state.training) : undefined,
      equipmentFirstYear: state.equipment > 0 ? money(state.equipment) : undefined,
      otherAnnual: state.otherAnnual > 0 ? money(state.otherAnnual) : undefined,
    },
    targetNetMonthly: state.goal === "target_net" ? money(state.targetNet) : undefined,
    candidate: withCandidate
      ? {
          authorizationConfirmed: true,
          dependants: Math.round(state.candidateDependants),
          maritalStatus: state.candidateMaritalStatus,
          disability: state.candidateDisability,
          jurisdiction: state.jurisdiction,
        }
      : undefined,
    capacity: state.productive
      ? {
          pricePerProductiveHour: state.pricePerHour > 0 ? money(state.pricePerHour) : undefined,
          contributionMargin: state.contributionMarginPercent > 0
            ? productiveShareRate(state.contributionMarginPercent)
            : undefined,
          expectedBillableHoursMonthly: state.expectedBillableHoursMonthly > 0
            ? state.expectedBillableHoursMonthly
            : undefined,
        }
      : undefined,
    supportFacts: {
      registeredUnemployed: triBool(state.registeredUnemployed),
      permanentContract: triBool(state.permanentContract),
      fullTime: triBool(state.fullTime),
      applicationBeforeContract: triBool(state.applicationBeforeContract),
      candidateAge: state.candidateAge > 0 ? Math.round(state.candidateAge) : undefined,
      qualificationLevel: state.qualificationLevel > 0 ? Math.round(state.qualificationLevel) : undefined,
    },
  };
}

const GuardarCenario = dynamic(() => import("./GuardarCenarioContratacao"), {
  ssr: false,
  loading: () => <p className="text-sm text-stone-500">A preparar a gravação…</p>,
});

function SectionTitle({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-light text-sm font-bold text-brand-dark dark:bg-brand/15 dark:text-brand-mint">
        {step}
      </span>
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{description}</p>
      </div>
    </div>
  );
}

const fieldClass =
  "mt-2 min-h-[46px] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-base font-medium tabular-nums text-stone-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 text-sm font-semibold text-stone-700 dark:text-stone-300">
      {label}
      {children}
      {hint ? <span className="mt-1.5 block text-xs font-normal leading-relaxed text-stone-500 dark:text-stone-400">{hint}</span> : null}
    </label>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <span className="relative block">
        <LocalizedNumberInput
          id={id}
          value={value}
          onValueChange={onChange}
          min={0}
          max={10_000_000}
          inputMode="decimal"
          className={`${fieldClass} pr-10`}
        />
        <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-sm text-stone-500">€</span>
      </span>
    </Field>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  max = 100_000,
  decimals = 0,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  max?: number;
  decimals?: number;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <span className="relative block">
        <LocalizedNumberInput
          id={id}
          value={value}
          onValueChange={onChange}
          min={0}
          max={max}
          maxDecimals={decimals}
          inputMode="decimal"
          className={`${fieldClass} ${suffix ? "pr-16" : ""}`}
        />
        {suffix ? <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-sm text-stone-500">{suffix}</span> : null}
      </span>
    </Field>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value as T)} className={fieldClass}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </Field>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${checked ? "border-brand bg-brand-light/70 dark:bg-brand/15" : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"}`}
    >
      <span className={`relative h-6 w-11 flex-none rounded-full transition ${checked ? "bg-brand" : "bg-stone-300 dark:bg-stone-600"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
      </span>
      <span>
        <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">{description}</span>
      </span>
    </button>
  );
}

function ResultCard({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail: string; tone?: "neutral" | "brand" | "dark" }) {
  const toneClass = tone === "brand"
    ? "border-brand/30 bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"
    : tone === "dark"
      ? "border-brand-dark bg-brand-dark text-white"
      : "border-stone-200 bg-white text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";
  return (
    <div className={`min-w-0 rounded-2xl border p-4 ${toneClass}`}>
      <p className={`text-xs font-bold uppercase tracking-[.12em] ${tone === "dark" ? "text-brand-mint" : "opacity-70"}`}>{label}</p>
      <p className="mt-2 break-words font-display text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
      <p className={`mt-1.5 text-xs leading-relaxed ${tone === "dark" ? "text-brand-light" : "opacity-70"}`}>{detail}</p>
    </div>
  );
}

function AmountLine({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2.5 ${strong ? "font-semibold text-stone-900 dark:text-white" : "text-stone-600 dark:text-stone-300"}`}>
      <span className="min-w-0 text-sm">{label}</span>
      <span className="flex-none text-sm tabular-nums">{fmt(value)}</span>
    </div>
  );
}

function workerMonthly(result: EmploymentOfferResult): string {
  const worker = result.workerOutcome;
  return worker.kind === "exact"
    ? fmt(worker.monthlyReference.cents)
    : `${fmt(worker.monthlyReference.min.cents)}–${fmt(worker.monthlyReference.max.cents)}`;
}

function delta(current: number, base: number): string {
  const difference = current - base;
  return `${difference > 0 ? "+" : ""}${fmt(difference)}`;
}

function ComparisonPanel({
  base,
  current,
  onClear,
}: {
  base: EmploymentOfferResult;
  current: EmploymentOfferResult;
  onClear: () => void;
}) {
  const rows = [
    {
      label: "Vencimento base mensal",
      base: base.resolvedBaseSalaryMonthly.cents,
      current: current.resolvedBaseSalaryMonthly.cents,
    },
    {
      label: "Custo anual estabilizado",
      base: base.employerCost.annualStabilized.cents,
      current: current.employerCost.annualStabilized.cents,
    },
    {
      label: "Custo do primeiro ano",
      base: base.employerCost.firstYear.cents,
      current: current.employerCost.firstYear.cents,
    },
  ];
  return (
    <section className="mt-6 rounded-2xl border border-brand/25 bg-brand-light/55 p-4 dark:bg-brand/10 sm:p-5" aria-labelledby="hiring-comparison-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-brand">Comparação criada</p>
          <h3 id="hiring-comparison-title" className="mt-1 font-display text-xl font-semibold text-ink">Pacote A e proposta atual</h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">Altera os campos acima e volta a calcular; o pacote A fica fixo até o removeres.</p>
        </div>
        <button type="button" onClick={onClear} className="min-h-[40px] rounded-xl px-3 text-xs font-semibold text-stone-500 hover:bg-white dark:hover:bg-stone-900">Remover comparação</button>
      </div>
      {/* A tabela tem `min-w-[34rem]` e rola de lado num telemóvel: uma
          região que rola tem de ser alcançável por teclado, senão quem não
          usa rato não chega às colunas da direita (axe:
          `scrollable-region-focusable`). É o mesmo padrão de
          `/ferramentas/calcular-preco`. */}
      <div
        className="mt-4 overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Pacote A e proposta atual, lado a lado"
      >
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-stone-500">
            <tr><th className="pb-2 font-semibold">Conta</th><th className="pb-2 text-right font-semibold">Pacote A</th><th className="pb-2 text-right font-semibold">Atual</th><th className="pb-2 text-right font-semibold">Diferença</th></tr>
          </thead>
          <tbody className="divide-y divide-brand/10">
            {rows.map((row) => (
              <tr key={row.label}>
                <th className="py-3 pr-4 font-medium text-stone-700 dark:text-stone-200">{row.label}</th>
                <td className="py-3 text-right tabular-nums text-stone-500">{fmt(row.base)}</td>
                <td className="py-3 text-right font-semibold tabular-nums text-stone-900 dark:text-white">{fmt(row.current)}</td>
                <td className="py-3 text-right font-semibold tabular-nums text-brand-dark dark:text-brand-mint">{delta(row.current, row.base)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ResultPanel({ result, tab }: { result: EmploymentOfferResult; tab: ResultTab }) {
  if (tab === "calendar") {
    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-ink">Tesouraria do primeiro ano</h3>
          <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            Entrada no mês {result.calendar.find((month) => month.active)?.month ?? 1}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {result.calendar.map((month) => (
            <div key={month.month} className={`rounded-xl border p-3 ${month.active ? "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900" : "border-stone-100 bg-stone-50 opacity-55 dark:border-stone-800 dark:bg-stone-900/40"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-stone-700 dark:text-stone-200">{MONTHS[month.month - 1]}</span>
                {month.labels.length > 0 ? <span className="h-2 w-2 rounded-full bg-brand" title={month.labels.join(", ")} /> : null}
              </div>
              <p className="mt-3 text-sm font-semibold tabular-nums text-stone-900 dark:text-white">{fmt(month.employerCost.cents)}</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">{month.active ? "saída da empresa" : "sem posto ativo"}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          O primeiro ano soma {fmt(result.employerCost.firstYear.cents)}. Equipamento e pagamentos extraordinários aparecem no mês em que pesam na tesouraria.
        </p>
      </div>
    );
  }

  if (tab === "capacity") {
    const capacity = result.capacity;
    if (!capacity) {
      return <p className="text-sm leading-relaxed text-stone-500">Marcaste este posto como não produtivo. A contratação continua calculada, mas não é convertida em horas ou receita.</p>;
    }
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
          <h3 className="font-display text-lg font-semibold text-ink">Capacidade anual</h3>
          <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
            <AmountLine label="Custo por hora produtiva" value={capacity.costPerProductiveHour?.cents ?? 0} strong />
            <AmountLine label="Receita necessária" value={capacity.revenueRequired?.cents ?? 0} />
          </div>
        </div>
        <div className={`rounded-2xl border p-5 ${capacity.capacityGapHours !== null && capacity.capacityGapHours < 0 ? "border-alert-border bg-alert-bg" : "border-brand/30 bg-brand-light dark:bg-brand/15"}`}>
          <h3 className="font-display text-lg font-semibold text-ink">Horas faturáveis</h3>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-ink">
            {capacity.billableHoursRequired !== null ? `${capacity.billableHoursRequired.toLocaleString("pt-PT")} h` : "—"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            {capacity.capacityGapHours === null
              ? "Indica preço por hora e horas esperadas para veres a folga real."
              : capacity.capacityGapHours >= 0
                ? `Há uma folga estimada de ${capacity.capacityGapHours.toLocaleString("pt-PT")} horas por ano.`
                : `Faltam cerca de ${Math.abs(capacity.capacityGapHours).toLocaleString("pt-PT")} horas por ano para pagar o posto.`}
          </p>
        </div>
      </div>
    );
  }

  if (tab === "supports") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-clay-border bg-clay-bg p-4 text-sm leading-relaxed text-clay-text">
          Nenhum apoio é abatido ao custo. A ferramenta apenas faz triagem; aprovação, dotação e candidatura continuam a depender do IEFP.
        </div>
        {result.supports.map((support) => (
          <article key={support.id} className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-ink">{support.name}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${support.status === "potential" ? "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint" : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"}`}>
                {support.status === "potential" ? "Compatibilidade potencial" : support.status === "needs_input" ? "Faltam respostas" : support.status === "window_closed" ? "Janela conhecida fechada" : "Não aplicável"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{support.explanation}</p>
            {support.missingFacts.length > 0 ? <p className="mt-2 text-xs leading-relaxed text-stone-500">Falta confirmar: {support.missingFacts.join(", ")}.</p> : null}
            <a
              href={support.sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => registar("hiring_support_opened", {
                ...contextoContratacao("ferramenta"),
                support_id: support.id,
              })}
              className="mt-3 inline-flex min-h-[40px] items-center text-sm font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand-mint"
            >
              Confirmar no IEFP <ArrowRight size={13} className="ml-1" />
            </a>
          </article>
        ))}
      </div>
    );
  }

  if (tab === "proposal") {
    return (
      <div className="rounded-2xl border border-brand/30 bg-brand-light/60 p-5 dark:bg-brand/10 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-brand">Resumo para conversar com o candidato</p>
        <h3 className="mt-3 font-display text-2xl font-semibold text-ink">Proposta-base de {fmt(result.resolvedBaseSalaryMonthly.cents)} por mês</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <ResultCard label="Líquido provável" value={workerMonthly(result)} detail={result.certainty === "exact" ? "com factos autorizados" : "intervalo sem dados pessoais"} />
          <ResultCard label="Custo anual" value={fmt(result.employerCost.annualStabilized.cents)} detail="posto estabilizado" />
          <ResultCard label="Primeiro ano" value={fmt(result.employerCost.firstYear.cents)} detail={`${result.employerCost.monthsWorkedFirstYear} meses ativos`} />
        </div>
        <p className="mt-5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          Apresenta bruto, subsídio de refeição e componentes variáveis em separado. O líquido é uma estimativa fiscal e deve ser afinado com os factos que o candidato autorizar a usar.
        </p>
      </div>
    );
  }

  const breakdown = result.employerCost.breakdown;
  const worker = result.workerOutcome;
  const charges = result.publicCharges.total;
  const chargesText = "min" in charges ? `${fmt(charges.min.cents)}–${fmt(charges.max.cents)}` : fmt(charges.cents);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-800 dark:text-stone-100"><Building size={17} className="text-brand" /> Empresa</div>
        <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
          <AmountLine label="Remuneração em dinheiro" value={breakdown.cashCompensation.cents} />
          <AmountLine label="Subsídio de refeição" value={breakdown.mealAllowance.cents} />
          <AmountLine label="Segurança Social patronal" value={breakdown.employerSocialSecurity.cents} />
          <AmountLine label="Custos do posto" value={breakdown.accidentInsurance.cents + breakdown.healthAndSafety.cents + breakdown.training.cents + breakdown.other.cents} />
          <AmountLine label="Custo anual estabilizado" value={result.employerCost.annualStabilized.cents} strong />
        </div>
      </section>
      <section className="rounded-2xl border border-brand/30 bg-brand-light/70 p-5 dark:bg-brand/15">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-dark dark:text-brand-mint"><User size={17} /> Trabalhador</div>
        <p className="mt-5 font-display text-3xl font-semibold tabular-nums text-ink">{workerMonthly(result)}</p>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">líquido mensal de referência</p>
        <div className="mt-5 border-t border-brand/20 pt-4 text-sm text-stone-600 dark:text-stone-300">
          Bruto anual: <strong className="tabular-nums text-stone-900 dark:text-white">{fmt(worker.annualGross.cents)}</strong>
        </div>
      </section>
      <section className="rounded-2xl border border-brand-dark bg-brand-dark p-5 text-white">
        <div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={17} className="text-brand-mint" /> Estado</div>
        <p className="mt-5 font-display text-3xl font-semibold tabular-nums">{chargesText}</p>
        <p className="mt-2 text-sm leading-relaxed text-brand-light">IRS retido + contribuições de trabalhador e empresa</p>
        <div className="mt-5 border-t border-white/15 pt-4 text-sm text-brand-light">
          A retenção não é o IRS anual final.
        </div>
      </section>
    </div>
  );
}

export default function PlaneadorContratacao() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [tab, setTab] = useState<ResultTab>("package");
  const [saveOpen, setSaveOpen] = useState(false);
  const [comparisonBase, setComparisonBase] = useState<EmploymentOfferResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const input = useMemo(() => inputFromState(state), [state]);
  const preparation = useMemo(
    () => planEmploymentOffer(input, PORTUGAL_PAYROLL_POLICY_2026, legacy2026WithholdingResolver),
    [input],
  );
  const set = <K extends keyof PlannerState>(key: K, value: PlannerState[K]) =>
    dispatch({ type: "set", key, value });

  useEffect(() => {
    registar("hiring_planner_started", contextoContratacao("ferramenta"));
  }, []);

  const calculate = () => {
    dispatch({ type: "calculate" });
    if (preparation.kind === "ready") {
      registar("hiring_result_viewed", {
        ...contextoContratacao("ferramenta"),
        goal: state.goal,
        certainty: preparation.result.certainty,
        completion_step: "resultado",
      });
      if (preparation.result.certainty === "range") {
        registar("hiring_range_explained", {
          ...contextoContratacao("ferramenta"),
          certainty: "range",
        });
      }
    }
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="space-y-5 print:space-y-3">
      <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6 lg:p-7">
        <SectionTitle step="01" title="O que precisas de decidir?" description="Escolhe o ponto de partida. A mesma conta adapta os campos e mantém os pressupostos visíveis." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Objetivo da contratação">
          {GOALS.map(({ value, title, description, Icon }) => {
            const active = state.goal === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  set("goal", value);
                  registar("hiring_goal_selected", {
                    ...contextoContratacao("ferramenta"),
                    goal: value,
                  });
                }}
                className={`min-h-[132px] rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${active ? "border-brand bg-brand-light shadow-sm dark:bg-brand/15" : "border-stone-200 bg-stone-50 hover:border-brand/40 dark:border-stone-700 dark:bg-stone-800/60"}`}
              >
                <Icon size={19} className={active ? "text-brand" : "text-stone-500"} />
                <span className="mt-3 block text-sm font-bold text-stone-900 dark:text-white">{title}</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">{description}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {state.goal === "employer_budget" ? (
            <>
              <MoneyField id="annual-budget" label="Orçamento anual máximo" value={state.annualBudget} onChange={(value) => set("annualBudget", value)} hint="Inclui remuneração, encargos e custos do posto." />
              <NumberField id="safety-margin" label="Margem que não queres gastar" value={state.safetyMarginPercent} onChange={(value) => set("safetyMarginPercent", value)} suffix="%" max={50} decimals={1} />
            </>
          ) : null}
          {state.goal === "target_net" ? <MoneyField id="target-net" label="Líquido mensal pretendido" value={state.targetNet} onChange={(value) => set("targetNet", value)} hint="Sem dados pessoais, o motor usa o cenário mais conservador do intervalo." /> : null}
          {state.goal === "known_offer" || state.goal === "required_capacity" ? <MoneyField id="base-salary" label="Vencimento base mensal" value={state.baseSalary} onChange={(value) => set("baseSalary", value)} /> : null}
          <NumberField id="weekly-hours" label="Horas por semana" value={state.weeklyHours} onChange={(value) => set("weeklyHours", value)} suffix="h" max={80} decimals={1} />
          <SelectField label="Mês de entrada" value={String(state.startMonth)} onChange={(value) => set("startMonth", Number(value))} options={MONTHS.map((label, index) => ({ value: String(index + 1), label }))} />
          <SelectField label="Região fiscal" value={state.jurisdiction} onChange={(value) => set("jurisdiction", value)} options={[{ value: "PT-CONTINENTE", label: "Continente" }, { value: "PT-MADEIRA", label: "Madeira" }, { value: "PT-ACORES", label: "Açores" }]} />
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6 lg:p-7">
        <SectionTitle step="02" title="Compor o pacote" description="O salário é só uma parcela. Refeição, prémios e forma de pagar subsídios mudam o líquido e a tesouraria." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField label="Subsídios de férias e Natal" value={state.subsidyPayment} onChange={(value) => set("subsidyPayment", value)} options={[{ value: "normal", label: "Nos meses próprios" }, { value: "duodecimos", label: "Em duodécimos" }]} />
          <MoneyField id="fixed-bonus" label="Complemento fixo mensal" value={state.fixedMonthlyBonus} onChange={(value) => set("fixedMonthlyBonus", value)} />
          <MoneyField id="variable-bonus" label="Prémio variável anual" value={state.variableAnnualBonus} onChange={(value) => set("variableAnnualBonus", value)} />
          {state.variableAnnualBonus > 0 ? <SelectField label="Regularidade do prémio" value={state.bonusRegularity} onChange={(value) => set("bonusRegularity", value)} options={[{ value: "unknown", label: "Ainda não sei" }, { value: "regular", label: "Pago de forma regular" }, { value: "not_regular", label: "Não regular e objetivo" }]} /> : null}
          <MoneyField id="meal-daily" label="Refeição por dia" value={state.mealDaily} onChange={(value) => set("mealDaily", value)} />
          <NumberField id="meal-days" label="Dias de refeição por mês" value={state.mealDays} onChange={(value) => set("mealDays", value)} suffix="dias" max={31} />
          <SelectField label="Forma do subsídio de refeição" value={state.mealMethod} onChange={(value) => set("mealMethod", value)} options={[{ value: "card_or_voucher", label: "Cartão ou vale" }, { value: "cash", label: "Dinheiro" }]} />
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6 lg:p-7">
        <SectionTitle step="03" title="Contar o posto inteiro" description="Se um custo é desconhecido, fica assumido como zero e aparece no resultado como lacuna — não é inventado." />
        <details className="rounded-2xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-stone-800 dark:text-stone-100">
            Custos do posto — opcionais
            <span className="ml-2 font-normal text-stone-500">equipamento, seguro, SST e formação</span>
          </summary>
          <div className="grid gap-4 border-t border-stone-200 p-4 dark:border-stone-700 sm:grid-cols-2 lg:grid-cols-5">
            <MoneyField id="insurance" label="Seguro de acidentes / ano" value={state.accidentInsurance} onChange={(value) => set("accidentInsurance", value)} />
            <MoneyField id="sst" label="Saúde e segurança / ano" value={state.healthAndSafety} onChange={(value) => set("healthAndSafety", value)} />
            <MoneyField id="training" label="Formação / ano" value={state.training} onChange={(value) => set("training", value)} />
            <MoneyField id="equipment" label="Equipamento no 1.º ano" value={state.equipment} onChange={(value) => set("equipment", value)} />
            <MoneyField id="other-costs" label="Outros custos / ano" value={state.otherAnnual} onChange={(value) => set("otherAnnual", value)} />
          </div>
        </details>

        <div className="mt-5 border-t border-stone-100 pt-5 dark:border-stone-800">
          <Toggle checked={state.productive} onChange={(value) => set("productive", value)} label="Este posto gera trabalho faturável" description="Ativa custo por hora produtiva, receita necessária e folga de capacidade." />
          {state.productive ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField id="productive-share" label="Tempo realmente produtivo" value={state.productiveSharePercent} onChange={(value) => set("productiveSharePercent", value)} suffix="%" max={100} decimals={1} hint="Já desconta coordenação, pausas e trabalho interno." />
              <MoneyField id="price-hour" label="Preço líquido por hora" value={state.pricePerHour} onChange={(value) => set("pricePerHour", value)} />
              <NumberField id="contribution-margin" label="Margem de contribuição" value={state.contributionMarginPercent} onChange={(value) => set("contributionMarginPercent", value)} suffix="%" max={100} decimals={1} />
              <NumberField id="billable-hours" label="Horas faturáveis esperadas / mês" value={state.expectedBillableHoursMonthly} onChange={(value) => set("expectedBillableHoursMonthly", value)} suffix="h" max={400} decimals={1} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6 lg:p-7">
        <SectionTitle step="04" title="Afinar sem invadir" description="O patrão pode calcular sem dados pessoais. Só usa factos do candidato se tiver autorização expressa." />
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => set("candidateMode", "range")} className={`min-h-[90px] rounded-2xl border p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${state.candidateMode === "range" ? "border-brand bg-brand-light dark:bg-brand/15" : "border-stone-200 dark:border-stone-700"}`}>
            <span className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-white"><Lock size={16} className="text-brand" /> Sem dados pessoais</span>
            <span className="mt-2 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">Devolve um intervalo baseado em quatro perfis fiscais, sem identificar ninguém.</span>
          </button>
          <button type="button" onClick={() => set("candidateMode", "authorized")} className={`min-h-[90px] rounded-2xl border p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${state.candidateMode === "authorized" ? "border-brand bg-brand-light dark:bg-brand/15" : "border-stone-200 dark:border-stone-700"}`}>
            <span className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-white"><Check size={16} className="text-brand" /> Tenho autorização</span>
            <span className="mt-2 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">Usa apenas estado civil, dependentes e deficiência para tornar o líquido exato.</span>
          </button>
        </div>
        {state.candidateMode === "authorized" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <NumberField id="dependants" label="Dependentes" value={state.candidateDependants} onChange={(value) => set("candidateDependants", value)} max={20} />
            <SelectField label="Estado civil fiscal" value={state.candidateMaritalStatus} onChange={(value) => set("candidateMaritalStatus", value)} options={[{ value: "not_married", label: "Não casado" }, { value: "married_single_holder", label: "Casado — único titular" }, { value: "married_two_holders", label: "Casado — dois titulares" }]} />
            <Toggle checked={state.candidateDisability} onChange={(value) => set("candidateDisability", value)} label="Deficiência fiscalmente relevante" description="Só ativa se este facto tiver sido autorizado." />
          </div>
        ) : null}

        <details className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-stone-800 dark:text-stone-100">Triar apoios à contratação — opcional</summary>
          <div className="grid gap-4 border-t border-stone-200 p-4 dark:border-stone-700 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField label="Inscrito no IEFP" value={state.registeredUnemployed} onChange={(value) => set("registeredUnemployed", value)} options={[{ value: "unknown", label: "Ainda não sei" }, { value: "yes", label: "Sim" }, { value: "no", label: "Não" }]} />
            <SelectField label="Contrato sem termo" value={state.permanentContract} onChange={(value) => set("permanentContract", value)} options={[{ value: "unknown", label: "Ainda não sei" }, { value: "yes", label: "Sim" }, { value: "no", label: "Não" }]} />
            <SelectField label="Tempo completo" value={state.fullTime} onChange={(value) => set("fullTime", value)} options={[{ value: "unknown", label: "Ainda não sei" }, { value: "yes", label: "Sim" }, { value: "no", label: "Não" }]} />
            <SelectField label="Candidatura antes do contrato" value={state.applicationBeforeContract} onChange={(value) => set("applicationBeforeContract", value)} options={[{ value: "unknown", label: "Ainda não sei" }, { value: "yes", label: "Sim" }, { value: "no", label: "Não" }]} />
            <NumberField id="candidate-age" label="Idade" value={state.candidateAge} onChange={(value) => set("candidateAge", value)} max={100} />
            <NumberField id="qualification" label="Nível de qualificação" value={state.qualificationLevel} onChange={(value) => set("qualificationLevel", value)} max={8} />
          </div>
        </details>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400"><Calculator size={15} className="flex-none text-brand" /> Cálculo local. Nada é guardado ao simular.</p>
          <button type="button" onClick={calculate} className="btn-shine inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
            Calcular a contratação <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {state.calculated ? (
        <div ref={resultRef} className="scroll-mt-24" aria-live="polite">
          {preparation.kind === "ready" ? (
            <section className="overflow-hidden rounded-3xl border border-brand/25 bg-stone-50 shadow-lift dark:bg-stone-950 print:border-stone-300 print:shadow-none">
              <div className="bg-brand-dark p-5 text-white sm:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-mint">Decisão calculada · regras 2026</p>
                    <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">O pacote cabe antes de a proposta sair.</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-light">Custo, líquido e capacidade são três números diferentes. O resultado mantém os três separados.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setComparisonBase(preparation.result);
                        registar("hiring_comparison_created", {
                          ...contextoContratacao("ferramenta"),
                          goal: state.goal,
                        });
                      }}
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold hover:bg-white/15"
                    >
                      <Calculator size={15} /> {comparisonBase ? "Atualizar pacote A" : "Fixar pacote A"}
                    </button>
                    <button type="button" onClick={() => setSaveOpen(true)} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold hover:bg-white/15"><Download size={15} /> Guardar cenário</button>
                    <button
                      type="button"
                      onClick={() => {
                        registar("hiring_offer_exported", {
                          ...contextoContratacao("ferramenta"),
                          export_format: "pdf",
                        });
                        window.print();
                      }}
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-dark hover:bg-brand-light"
                    >
                      <FileSign size={15} /> Guardar em PDF
                    </button>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <ResultCard label="Custo anual" value={fmt(preparation.result.employerCost.annualStabilized.cents)} detail="estabilizado" tone="dark" />
                  <ResultCard label="Base mensal" value={fmt(preparation.result.resolvedBaseSalaryMonthly.cents)} detail="14 pagamentos" tone="dark" />
                  <ResultCard label="Líquido provável" value={workerMonthly(preparation.result)} detail={preparation.result.certainty === "exact" ? "factos autorizados" : "intervalo responsável"} tone="dark" />
                  <ResultCard label="Primeiro ano" value={fmt(preparation.result.employerCost.firstYear.cents)} detail={`${preparation.result.employerCost.monthsWorkedFirstYear} meses ativos`} tone="dark" />
                </div>
              </div>

              <div className="border-b border-stone-200 bg-white px-3 py-3 dark:border-stone-800 dark:bg-stone-900 print:hidden">
                <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Detalhes do resultado">
                  {TABS.map((item) => (
                    <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => setTab(item.value)} className={`min-h-[42px] flex-none rounded-xl px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tab === item.value ? "bg-brand text-white" : "bg-stone-100 text-stone-600 hover:text-brand-dark dark:bg-stone-800 dark:text-stone-300"}`}>{item.label}</button>
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-6 lg:p-7">
                <ResultPanel result={preparation.result} tab={tab} />
                {comparisonBase ? (
                  <ComparisonPanel
                    base={comparisonBase}
                    current={preparation.result}
                    onClear={() => setComparisonBase(null)}
                  />
                ) : null}
                {preparation.result.assumptions.length > 0 ? (
                  <details className="mt-6 rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900" open={preparation.result.assumptions.some((item) => item.severity === "blocking") || undefined}>
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-stone-800 dark:text-stone-100">Pressupostos e lacunas ({preparation.result.assumptions.length})</summary>
                    <ul className="space-y-3 border-t border-stone-100 p-4 dark:border-stone-800">
                      {preparation.result.assumptions.map((assumption) => (
                        <li key={assumption.id} className="flex gap-2.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                          {assumption.severity === "blocking" ? <Warning size={15} className="mt-0.5 flex-none text-clay-text" /> : <Check size={15} className="mt-0.5 flex-none text-brand" />}
                          <span><strong className="text-stone-800 dark:text-stone-100">{assumption.label}.</strong> {assumption.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
                  <button type="button" onClick={() => { dispatch({ type: "reset" }); setTab("package"); setSaveOpen(false); setComparisonBase(null); }} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl px-3 text-sm font-semibold text-stone-500 hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"><RotateCcw size={15} /> Começar de novo</button>
                  <span className="text-xs text-stone-500">Motor {preparation.result.engineVersion} · política verificada em {preparation.result.policyDate}</span>
                </div>
                {saveOpen ? <GuardarCenario input={input} result={preparation.result} onClose={() => setSaveOpen(false)} /> : null}
              </div>
            </section>
          ) : (
            <section className="rounded-3xl border border-alert-border bg-alert-bg p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <Warning size={19} className="mt-0.5 flex-none text-alert-text" />
                <div>
                  <h2 className="font-display text-xl font-semibold text-alert-text">Falta confirmar antes de calcular</h2>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-alert-text">
                    {preparation.kind === "needs_input" ? preparation.missing.map((item) => <li key={`${item.path}-${item.reason}`}>{item.reason}</li>) : preparation.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </div>
      ) : null}
      <ContabilistasNoResultado pronto={state.calculated && preparation.kind === "ready"} />
    </div>
  );
}
