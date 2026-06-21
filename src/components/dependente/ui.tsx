"use client";

// ─────────────────────────────────────────────────────────────────────
//  Primitivas de UI partilhadas do módulo "Recibo de vencimento".
//  Mantêm a coerência premium (design system) e tiram o "class soup" dos
//  componentes. Sem lógica fiscal — apresentação pura.
// ─────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

/** Classe de um botão de controlo segmentado (ativo/inativo). */
export function segClass(ativo: boolean): string {
  return cx(
    "rounded-xl border px-3 py-2 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand/40",
    ativo
      ? "border-brand bg-brand text-white shadow-glow"
      : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand"
  );
}

/** Secção com cabeçalho (eyebrow + ícone) que agrupa controlos. */
export function Section({
  icon,
  title,
  hint,
  action,
  children,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-3xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900/40 p-5", className)}>
      <div className="mb-4 flex items-center gap-2.5">
        {icon && (
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">{icon}</span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-800 dark:text-stone-100">{title}</h3>
          {hint && <p className="mt-0.5 text-[11px] leading-snug text-stone-400">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Cartão de métrica compacto (ícone, rótulo, valor, sub). */
export function StatTile({
  icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon?: ReactNode;
  label: ReactNode;
  value: string;
  sub?: ReactNode;
  tone?: "neutral" | "brand" | "alert";
}) {
  const toneCls =
    tone === "brand"
      ? "border-brand/20 bg-brand-light"
      : tone === "alert"
        ? "border-alert-border bg-alert-bg"
        : "border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-800/40";
  const valueCls =
    tone === "brand" ? "text-brand-dark" : tone === "alert" ? "text-alert-text" : "text-stone-800 dark:text-stone-100";
  return (
    <div className={cx("rounded-2xl border p-4", toneCls)}>
      <div className="mb-1.5 flex items-center gap-2">
        {icon && (
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-white/70 dark:bg-stone-900/40 text-brand">
            {icon}
          </span>
        )}
        <span className="flex items-center gap-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">{label}</span>
      </div>
      <p className={cx("font-display text-xl font-semibold tabular-nums", valueCls)}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-snug text-stone-400">{sub}</p>}
    </div>
  );
}

/** Campo com rótulo (label + InfoTip opcional) por cima do controlo. */
export function Field({
  label,
  htmlFor,
  tip,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  tip?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
        {label}
        {tip}
      </label>
      {children}
    </div>
  );
}

// ── Tipos e gráficos partilhados (donut + barra segmentada) ──

export type Seg = { label: string; value: number; color?: string; brand?: boolean; cls?: string };

/** Donut SVG sem dependências (segmentos proporcionais). */
export function Donut({ segs, centro, centroSub }: { segs: Seg[]; centro: string; centroSub: string }) {
  const total = segs.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const r = 52;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const arcs = segs.map((s) => {
    const len = (Math.max(0, s.value) / total) * C;
    const a = { ...s, len, offset: -acc };
    acc += len;
    return a;
  });
  return (
    <div className="relative flex-shrink-0">
      <svg width="128" height="128" viewBox="0 0 132 132" aria-hidden>
        <circle cx="66" cy="66" r={r} fill="none" stroke="currentColor" className="text-stone-100 dark:text-stone-800" strokeWidth="15" />
        {arcs.map((a) => (
          <circle
            key={a.label}
            cx="66"
            cy="66"
            r={r}
            fill="none"
            className={a.brand ? "text-brand" : a.cls}
            stroke={a.brand || a.cls ? "currentColor" : a.color}
            strokeWidth="15"
            strokeDasharray={`${a.len} ${C - a.len}`}
            strokeDashoffset={a.offset}
            transform="rotate(-90 66 66)"
            style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1)" }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold text-brand tabular-nums">{centro}</span>
        <span className="text-[11px] text-stone-400">{centroSub}</span>
      </div>
    </div>
  );
}

/** Barra segmentada horizontal. */
export function SegBar({ segs }: { segs: Seg[] }) {
  const total = segs.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  return (
    <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
      {segs.map((s, i) => (
        <div
          key={s.label}
          className={cx(i === 0 && "rounded-l-full", i === segs.length - 1 && "rounded-r-full", s.brand && "bg-brand", s.cls)}
          style={{
            width: `${(Math.max(0, s.value) / total) * 100}%`,
            background: s.brand ? undefined : s.cls ? "currentColor" : s.color,
            transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      ))}
    </div>
  );
}

/** Legenda de um conjunto de segmentos (ponto · rótulo · valor). */
export function SegLegend({ segs, format }: { segs: Seg[]; format: (n: number) => string }) {
  return (
    <ul className="w-full space-y-2.5">
      {segs.map((s) => (
        <li key={s.label} className="flex items-center gap-2.5">
          <span
            className={cx("h-2.5 w-2.5 flex-shrink-0 rounded-full", s.brand && "bg-brand", s.cls)}
            style={{ background: s.brand ? undefined : s.cls ? "currentColor" : s.color }}
          />
          <span className="flex-1 text-sm text-stone-600 dark:text-stone-400">{s.label}</span>
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">{format(s.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Linha rótulo · valor de uma decomposição de recibo. */
export function LinhaRecibo({ label, value, sub, muted }: { label: string; value: string; sub?: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <dt className={cx("text-sm", muted ? "text-stone-500 dark:text-stone-400" : "text-stone-600 dark:text-stone-300")}>{label}</dt>
        {sub && <p className="text-[11px] text-stone-400">{sub}</p>}
      </div>
      <dd className="flex-shrink-0 text-sm font-medium text-stone-800 dark:text-stone-100 tabular-nums">{value}</dd>
    </div>
  );
}
