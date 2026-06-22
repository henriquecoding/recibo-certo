"use client";

import { useState, type ReactNode } from "react";
import InfoTip from "@/components/ui/InfoTip";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { Check, Warning, ArrowRight, ChevronDown } from "@/components/ui/Icons";
import type { NivelValidacao } from "@/lib/irs-guiado";

// Classes partilhadas (coerentes com o resto do painel).
export const campoCls =
  "w-full px-3.5 py-2.5 text-[16px] text-stone-800 bg-stone-50 rounded-xl border border-stone-200 " +
  "focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all " +
  "dark:bg-stone-800/50 dark:text-stone-100 dark:border-stone-700";

export const rotuloCls =
  "text-xs font-medium text-stone-500 uppercase tracking-wider dark:text-stone-400";

// ─── Campo numérico ─────────────────────────────────────────────────────────
export function Campo({
  id,
  label,
  value,
  onChange,
  step = 100,
  placeholder = "0",
  tooltip,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  placeholder?: string;
  tooltip?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label htmlFor={id} className={rotuloCls}>
          {label}
        </label>
        {tooltip && <InfoTip>{tooltip}</InfoTip>}
      </div>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={campoCls}
      />
    </div>
  );
}

// ─── Cartões de opção (seleção única) ───────────────────────────────────────
export function SeletorCartoes<T extends string | boolean>({
  label,
  tooltip,
  opcoes,
  valor,
  onChange,
  colunas,
}: {
  label?: string;
  tooltip?: ReactNode;
  opcoes: { id: T; label: string; sub?: string }[];
  valor: T;
  onChange: (v: T) => void;
  colunas?: number;
}) {
  const cols = colunas ?? opcoes.length;
  const gridCls =
    cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : cols === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2";
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className={rotuloCls}>{label}</span>
          {tooltip && <InfoTip>{tooltip}</InfoTip>}
        </div>
      )}
      <div className={`grid gap-2 ${gridCls}`}>
        {opcoes.map((o) => {
          const active = valor === o.id;
          return (
            <button
              key={String(o.id)}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.id)}
              className={`rounded-xl border p-3 text-center transition-all ${
                active
                  ? "border-brand bg-brand-light"
                  : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40"
              }`}
            >
              <div className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>
                {o.label}
              </div>
              {o.sub && <div className={`text-xs ${active ? "text-brand" : "text-stone-400"}`}>{o.sub}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Caixa de verificação grande ────────────────────────────────────────────
export function Checkbox({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
        checked ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 ${
          checked ? "border-brand bg-brand text-white" : "border-stone-300 text-transparent dark:border-stone-600"
        }`}
      >
        <Check size={12} />
      </span>
      <div>
        <div className={`text-sm font-semibold ${checked ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>{label}</div>
        {sub && <div className={`mt-0.5 text-xs leading-relaxed ${checked ? "text-brand" : "text-stone-400 dark:text-stone-500"}`}>{sub}</div>}
      </div>
    </button>
  );
}

// ─── Interruptor (toggle) com rótulo ────────────────────────────────────────
export function Interruptor({
  on,
  onChange,
  label,
  tooltip,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  tooltip?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-stone-200 dark:bg-stone-700"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`} />
      </button>
      <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{label}</span>
      {tooltip && <InfoTip>{tooltip}</InfoTip>}
    </div>
  );
}

// ─── Chip de correspondência fiscal (anexo) ─────────────────────────────────
// Discreto; ao clicar/passar o cursor mostra a explicação detalhada.
export function AnexoChip({ anexo, nome, explicacao }: { anexo: string; nome: string; explicacao: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
      <span className="font-semibold text-brand-dark dark:text-brand">{anexo}</span>
      <span aria-hidden>·</span>
      <span>{nome}</span>
      <InfoTip label={`O que é o ${anexo}`}>{explicacao}</InfoTip>
    </span>
  );
}

// ─── Painel educativo expansível ("Saber mais") ─────────────────────────────
export function Explicador({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50/70 dark:border-stone-700 dark:bg-stone-800/40">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left"
      >
        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">{titulo}</span>
        <ChevronDown size={14} className={`flex-shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{children}</div>}
    </div>
  );
}

// ─── Linha de resultado (rótulo / valor) ────────────────────────────────────
export function Linha({
  label,
  value,
  note,
  sinal,
  forte = false,
}: {
  label: string;
  value: number;
  note?: string;
  sinal?: "+" | "−";
  forte?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-stone-200/60 py-1.5 last:border-0 dark:border-stone-700/60">
      <div>
        <span className={`text-sm ${forte ? "font-semibold text-stone-800 dark:text-stone-100" : "text-stone-600 dark:text-stone-400"}`}>{label}</span>
        {note && <div className="text-[11px] text-stone-400">{note}</div>}
      </div>
      <span className={`text-sm font-semibold tabular-nums ${forte ? "text-brand" : "text-stone-700 dark:text-stone-300"}`}>
        {sinal && `${sinal} `}
        <AnimatedNumber value={value} />
      </span>
    </div>
  );
}

// ─── Cartão de validação (erro / aviso / oportunidade) ──────────────────────
export function CartaoValidacao({
  nivel,
  titulo,
  detalhe,
  anexo,
}: {
  nivel: NivelValidacao;
  titulo: string;
  detalhe: string;
  anexo?: string;
}) {
  const estilos: Record<NivelValidacao, { wrapper: string; icon: ReactNode; cor: string }> = {
    erro: {
      wrapper: "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20",
      icon: <Warning size={13} className="text-red-600 dark:text-red-400" />,
      cor: "text-red-700 dark:text-red-300",
    },
    aviso: {
      wrapper: "border-alert-border bg-alert-bg",
      icon: <Warning size={13} className="text-alert-text" />,
      cor: "text-alert-text",
    },
    oportunidade: {
      wrapper: "border-brand/20 bg-brand-light/50",
      icon: <ArrowRight size={13} className="text-brand" />,
      cor: "text-brand-dark",
    },
  };
  const { wrapper, icon, cor } = estilos[nivel];
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-3.5 ${wrapper}`}>
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className={`text-xs font-semibold ${cor}`}>
          {titulo}
          {anexo && <span className="ml-2 font-normal opacity-70">{anexo}</span>}
        </p>
        <p className={`mt-0.5 text-xs leading-relaxed ${cor} opacity-80`}>{detalhe}</p>
      </div>
    </div>
  );
}

// ─── Cabeçalho de secção/módulo numerado ────────────────────────────────────
export function CabecalhoModulo({
  titulo,
  anexo,
  anexoNome,
  explicacao,
  icon,
}: {
  titulo: string;
  anexo: string;
  anexoNome: string;
  explicacao: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div className="flex items-center gap-2">
        {icon && <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15">{icon}</span>}
        <h3 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">{titulo}</h3>
      </div>
      <AnexoChip anexo={anexo} nome={anexoNome} explicacao={explicacao} />
    </div>
  );
}
