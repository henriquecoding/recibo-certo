import type { ReactNode } from "react";

type Tone = "neutral" | "brand" | "alert" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
  brand: "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand",
  alert: "bg-alert-bg text-alert-text",
  danger: "bg-clay-bg text-clay-text",
};

// Etiqueta compacta do design system.
export default function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
