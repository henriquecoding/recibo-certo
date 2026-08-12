// ═══════════════════════════════════════════════════════════════════════
//  ToolStart — as condições da experiência, ANTES de começar (§P1-07)
//  ---------------------------------------------------------------------
//  Antes desta faixa não se sabia, de forma consistente, quanto tempo
//  demora, que informação é precisa, se exige conta, o que é grátis, se os
//  dados saem do dispositivo e quando as regras foram verificadas. Cada
//  ferramenta respondia a um subconjunto diferente, ou a nenhum.
//
//  Server Component: são metadados, não interação.
// ═══════════════════════════════════════════════════════════════════════

import { Clock, Lock, ShieldCheck, Check } from "@/components/ui/Icons";
import type { ToolDefinition } from "@/lib/ferramentas";

const dataPT = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(d);
};

export default function ToolStart({ tool }: { tool: ToolDefinition }) {
  const semConta = tool.access.account === "none";
  const exportPlus = tool.access.export === "plus";

  return (
    <section
      aria-label="Antes de começares"
      className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6"
    >
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
            <Clock size={16} />
          </span>
          <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Demora</dt>
            <dd className="text-sm text-stone-700 dark:text-stone-300">
              Cerca de {tool.estimatedMinutes} {tool.estimatedMinutes === 1 ? "minuto" : "minutos"}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
            <Check size={16} />
          </span>
          <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Custo</dt>
            <dd className="text-sm text-stone-700 dark:text-stone-300">
              Grátis{semConta ? ", sem conta" : ""}
              {exportPlus ? " · exportar em PDF/CSV é Plus" : ""}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
            <Lock size={16} />
          </span>
          <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Precisas de</dt>
            <dd className="text-sm text-stone-700 dark:text-stone-300">
              {tool.requiredInputs.join(" · ")}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
            <ShieldCheck size={16} />
          </span>
          <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Privacidade</dt>
            <dd className="text-sm text-stone-700 dark:text-stone-300">
              Os cálculos ficam no teu dispositivo
            </dd>
          </div>
        </div>
      </dl>

      <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
        Regras verificadas para {tool.fiscalYear} · última revisão a {dataPT(tool.reviewedAt)}.{" "}
        <a href="/metodologia" className="font-semibold text-brand underline-offset-2 hover:underline">
          Como verificamos
        </a>
      </p>
    </section>
  );
}
