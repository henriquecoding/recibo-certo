import { Check, Close, Lightbulb } from "@/components/ui/Icons";
import { aplicabilidade } from "@/lib/guias/aplicabilidade";

// ─────────────────────────────────────────────────────────────────────────
//  Resposta curta + aplicabilidade (pontos 6.1 e 6.3 da auditoria).
//
//  Aparece antes do corpo do Guia para que ninguém tenha de ler um artigo
//  inteiro só para descobrir que a regra não se lhe aplica. A coluna "não
//  se aplica" é tão importante como a outra — é a que poupa tempo.
// ─────────────────────────────────────────────────────────────────────────

export default function RespostaCurtaGuia({ slug }: { slug: string }) {
  const a = aplicabilidade(slug);
  if (!a) return null;

  return (
    <section aria-labelledby={`resposta-${slug}`} className="mb-10">
      <div className="rounded-4xl border border-brand/25 bg-brand-light/50 p-5 dark:bg-brand/10 sm:p-6">
        <h2 id={`resposta-${slug}`} className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-dark">
          <Lightbulb size={13} /> Resposta curta
        </h2>
        <p className="text-base leading-relaxed text-stone-800 dark:text-stone-100">{a.respostaCurta}</p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
          <p className="mb-2 text-xs font-semibold text-stone-700 dark:text-stone-300">Aplica-se a ti se…</p>
          <ul className="space-y-2">
            {a.aplicaSe.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                <Check size={14} className="mt-0.5 flex-shrink-0 text-brand" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900/50">
          <p className="mb-2 text-xs font-semibold text-stone-700 dark:text-stone-300">Não se aplica se…</p>
          <ul className="space-y-2">
            {a.naoAplicaSe.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                <Close size={14} className="mt-0.5 flex-shrink-0 text-stone-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
