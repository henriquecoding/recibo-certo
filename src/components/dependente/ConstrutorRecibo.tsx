"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Receipt, Trash, Warning } from "@/components/ui/Icons";
import {
  PAYROLL_RUBRIC_CATALOGUE,
  RUBRIC_META,
  type PayrollRubricDraft,
  type PayrollRubricType,
} from "@/lib/payroll-simulator-legacy-adapter";
import {
  numericDraftOnBlur,
  parseNumericDraft,
  sanitizeNumericDraft,
} from "@/lib/numeric-input";

const CATEGORY_LABEL = {
  fixed: "Fixos",
  variable: "Variáveis",
  time: "Tempo de trabalho",
  subsidy: "Subsídios",
  absence: "Faltas",
  travel: "Deslocações",
} as const;

const BENEFITS_PENDING = [
  ["Seguro de saúde ou vida", "Depende do âmbito, beneficiários e direito adquirido."],
  ["PPR ou plano de pensões", "Exige contrato, beneficiários e condições de resgate."],
  ["Viatura de empresa", "Exige acordo escrito, uso pessoal e valores da viatura."],
  ["Stock options", "Exige plano, datas de aquisição/exercício e residência."],
] as const;

const SINGLETON_TYPES = new Set<PayrollRubricType>([
  "holiday_subsidy",
  "christmas_subsidy",
  "travel_national",
  "travel_foreign",
]);

const inputClass = "w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium tabular-nums text-stone-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

function Field({ label, suffix, value, onChange, inputMode = "decimal" }: {
  label: string;
  suffix: string;
  value: number;
  onChange: (value: number) => void;
  inputMode?: "decimal" | "numeric";
}) {
  const maxDecimals = inputMode === "numeric" ? 0 : 2;
  const [draft, setDraft] = useState(value > 0 ? String(value).replace(".", ",") : "");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(value > 0 ? String(value).replace(".", ",") : "");
  }, [focused, value]);

  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</span>
      <span className="relative block">
        <input
          type="text"
          inputMode={inputMode}
          value={draft}
          onFocus={() => setFocused(true)}
          onChange={(event) => {
            const next = sanitizeNumericDraft(event.target.value, { maxDecimals });
            setDraft(next);
            const parsed = parseNumericDraft(next, { maxDecimals });
            if (parsed !== null) onChange(Math.max(0, parsed));
          }}
          onBlur={() => {
            setFocused(false);
            const normalized = numericDraftOnBlur(draft, value, { min: 0, maxDecimals });
            setDraft(normalized.value > 0 ? normalized.draft : "");
            onChange(normalized.value);
          }}
          className={`${inputClass} pr-10`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">{suffix}</span>
      </span>
    </label>
  );
}

function RubricEditor({ rubric, onChange, onRemove }: {
  rubric: PayrollRubricDraft;
  onChange: (next: PayrollRubricDraft) => void;
  onRemove: () => void;
}) {
  const meta = RUBRIC_META[rubric.type];
  const incomplete =
    (meta.editor === "amount" && rubric.amount <= 0)
    || (meta.editor === "hours" && rubric.hours <= 0)
    || (meta.editor === "travel" && (rubric.days <= 0 || rubric.dailyAmount <= 0))
    || (meta.editor === "award" && (rubric.amount <= 0 || rubric.regularity === "unknown"));

  return (
    <article className={`group rounded-2xl border bg-white p-4 transition dark:bg-stone-900 ${incomplete ? "border-alert-border" : "border-stone-200 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700"}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
          <Receipt size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-100">{meta.label}</h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-400">{meta.description}</p>
            </div>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remover ${meta.label}`}
              className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-stone-300 transition hover:bg-clay-bg hover:text-clay-text focus:outline-none focus:ring-2 focus:ring-clay-border dark:hover:bg-clay/20"
            >
              <Trash size={15} />
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(meta.editor === "amount" || meta.editor === "award") && (
              <Field label="Montante" suffix="€" value={rubric.amount} onChange={(amount) => onChange({ ...rubric, amount })} />
            )}
            {meta.editor === "hours" && (
              <Field label="Horas" suffix="h" value={rubric.hours} onChange={(hours) => onChange({ ...rubric, hours })} />
            )}
            {meta.editor === "travel" && (
              <>
                <Field label="Dias" suffix="dias" value={rubric.days} inputMode="numeric" onChange={(days) => onChange({ ...rubric, days: Math.floor(days) })} />
                <Field label="Valor por dia" suffix="€" value={rubric.dailyAmount} onChange={(dailyAmount) => onChange({ ...rubric, dailyAmount })} />
              </>
            )}
            {meta.editor === "award" && (
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Caráter para Segurança Social</legend>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
                  {([
                    ["regular", "Regular"],
                    ["not_regular", "Não regular"],
                    ["unknown", "Não sei"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={rubric.regularity === value}
                      onClick={() => onChange({ ...rubric, regularity: value })}
                      className={`rounded-lg px-2 py-2 text-[11px] font-semibold transition ${rubric.regularity === value ? "bg-white text-brand shadow-sm dark:bg-stone-700 dark:text-brand-light" : "text-stone-500 hover:text-stone-700 dark:text-stone-400"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-stone-100 pt-2.5 text-[10px] dark:border-stone-800">
            <span className="text-stone-400">{meta.source}</span>
            {incomplete ? (
              <span className="inline-flex items-center gap-1 font-semibold text-alert-text"><Warning size={11} /> Falta confirmar</span>
            ) : (
              <span className="font-semibold text-brand">Pronta</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ConstrutorRecibo({ rubrics, onChange, onPendingBenefit }: {
  rubrics: readonly PayrollRubricDraft[];
  onChange: (rubrics: PayrollRubricDraft[]) => void;
  onPendingBenefit: (label: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<PayrollRubricMetaCategory | "all">("all");
  const categories = useMemo(() => Array.from(new Set(PAYROLL_RUBRIC_CATALOGUE.map((item) => item.category))), []);
  const visible = filter === "all" ? PAYROLL_RUBRIC_CATALOGUE : PAYROLL_RUBRIC_CATALOGUE.filter((item) => item.category === filter);

  function add(type: PayrollRubricType) {
    if (SINGLETON_TYPES.has(type) && rubrics.some((rubric) => rubric.type === type)) return;
    const id = `rubric-${type}-${Date.now()}-${rubrics.length}`;
    onChange([...rubrics, { id, type, amount: 0, hours: 0, days: 0, dailyAmount: 0, regularity: "unknown" }]);
    setAdding(false);
  }

  return (
    <div>
      <div className="space-y-3">
        {rubrics.map((rubric) => (
          <RubricEditor
            key={rubric.id}
            rubric={rubric}
            onChange={(next) => onChange(rubrics.map((item) => item.id === rubric.id ? next : item))}
            onRemove={() => onChange(rubrics.filter((item) => item.id !== rubric.id))}
          />
        ))}
      </div>

      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-brand/35 bg-brand-light/40 px-4 py-3.5 text-sm font-semibold text-brand-dark transition hover:border-brand hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand/20 dark:bg-brand/5 dark:text-brand-light"
        >
          <Plus size={15} /> Adicionar rubrica
        </button>
      ) : (
        <div className="mt-3 overflow-hidden rounded-3xl border border-brand/25 bg-white shadow-float dark:bg-stone-900">
          <div className="border-b border-stone-100 p-4 dark:border-stone-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Que rubrica aparece no recibo?</h4>
                <p className="mt-0.5 text-[11px] text-stone-400">Escolhe o nome mais próximo. Pedimos os factos necessários a seguir.</p>
              </div>
              <button type="button" onClick={() => setAdding(false)} className="rounded-lg px-2 py-1 text-xs font-semibold text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800">Fechar</button>
            </div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar rubricas">
              <button type="button" onClick={() => setFilter("all")} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold ${filter === "all" ? "bg-brand text-white" : "bg-stone-100 text-stone-500 dark:bg-stone-800"}`}>Todas</button>
              {categories.map((category) => (
                <button key={category} type="button" onClick={() => setFilter(category)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold ${filter === category ? "bg-brand text-white" : "bg-stone-100 text-stone-500 dark:bg-stone-800"}`}>{CATEGORY_LABEL[category]}</button>
              ))}
            </div>
          </div>
          <div className="grid max-h-[26rem] gap-2 overflow-y-auto p-3 sm:grid-cols-2">
            {visible.map((item) => {
              const alreadyAdded = SINGLETON_TYPES.has(item.type) && rubrics.some((rubric) => rubric.type === item.type);
              return (
                <button
                  key={item.type}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => add(item.type)}
                  className="rounded-2xl border border-stone-100 p-3 text-left transition hover:border-brand/40 hover:bg-brand-light/40 focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-45 dark:border-stone-800 dark:hover:bg-brand/5"
                >
                  <span className="flex items-center justify-between gap-2 text-xs font-semibold text-stone-700 dark:text-stone-200"><span>{item.label}</span>{alreadyAdded && <span className="text-[9px] font-semibold text-brand">Adicionada</span>}</span>
                  <span className="mt-1 block text-[10px] leading-relaxed text-stone-400">{item.description}</span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-stone-100 bg-stone-50/80 p-3 dark:border-stone-800 dark:bg-stone-950/30">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400">Benefícios — validação factual necessária</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {BENEFITS_PENDING.map(([label, description]) => (
                <button key={label} type="button" onClick={() => onPendingBenefit(label)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-left opacity-80 transition hover:border-alert-border dark:border-stone-700 dark:bg-stone-900">
                  <span className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300">{label}</span>
                  <span className="mt-0.5 block text-[9px] leading-relaxed text-stone-400">{description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type PayrollRubricMetaCategory = (typeof PAYROLL_RUBRIC_CATALOGUE)[number]["category"];
