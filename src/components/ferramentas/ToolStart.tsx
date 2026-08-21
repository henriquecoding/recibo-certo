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
      {/* ── Porque é uma lista e não um `<dl>` ─────────────────────────
          Era um `<dl>` com o ícone dentro de cada grupo. A especificação só
          deixa um `<div>` agrupar um par `dt`/`dd` se esse `div` contiver
          APENAS o par — e o ícone estava lá dentro, o que tornava a árvore
          inválida em todas as ferramentas ao mesmo tempo.
          Uma lista de rótulo + valor diz a mesma coisa a um leitor de ecrã,
          é válida, e não obriga a mexer no aspeto. */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <li className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
            <Clock size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Demora</p>
            <p className="text-sm text-stone-700 dark:text-stone-300">
              Cerca de {tool.estimatedMinutes} {tool.estimatedMinutes === 1 ? "minuto" : "minutos"}
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
            <Check size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Custo</p>
            <p className="text-sm text-stone-700 dark:text-stone-300">
              Grátis{semConta ? ", sem conta" : ""}
              {exportPlus ? " · exportar em PDF/CSV é Plus" : ""}
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
            <Lock size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Precisas de</p>
            <p className="text-sm text-stone-700 dark:text-stone-300">
              {tool.requiredInputs.join(" · ")}
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
            <ShieldCheck size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Privacidade</p>
            <p className="text-sm text-stone-700 dark:text-stone-300">
              Os cálculos ficam no teu dispositivo
            </p>
          </div>
        </li>
      </ul>

      <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
        Regras verificadas para {tool.fiscalYear} · última revisão a {dataPT(tool.reviewedAt)}.{" "}
        <a href="/metodologia" className="font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand-mint">
          Como verificamos
        </a>
      </p>
    </section>
  );
}
