import { History, ChevronDown } from "@/components/ui/Icons";
import { historicoDoGuia, ROTULO_ALTERACAO } from "@/lib/guias/historico";

// ─────────────────────────────────────────────────────────────────────────
//  "O que mudou e desde quando" (ponto 6.3/10 da auditoria).
//
//  Disclosure nativa: acessível por teclado, sem estado nem JavaScript, e
//  fechada por omissão para não competir com o conteúdo.
// ─────────────────────────────────────────────────────────────────────────

const dataLonga = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });

export default function HistoricoGuia({ slug }: { slug: string }) {
  const alteracoes = historicoDoGuia(slug);
  if (alteracoes.length === 0) return null;

  return (
    <details className="group mt-6 rounded-3xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-5 py-3.5 text-sm font-semibold text-stone-700 dark:text-stone-200 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <History size={15} className="text-brand" />
          Alterações a este guia
          <span className="text-xs font-normal text-stone-400">({alteracoes.length})</span>
        </span>
        <ChevronDown size={16} className="flex-shrink-0 text-stone-400 transition-transform group-open:rotate-180" />
      </summary>

      <ul className="border-t border-stone-100 px-5 py-4 dark:border-stone-800">
        {alteracoes.map((a, i) => (
          <li key={`${a.data}-${i}`} className={i > 0 ? "mt-4" : ""}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                {ROTULO_ALTERACAO[a.tipo]}
              </span>
              <time dateTime={a.data} className="text-[11px] text-stone-400">
                {dataLonga(a.data)}
              </time>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{a.descricao}</p>
            {a.origem && <p className="mt-1 text-[11px] text-stone-400">Origem: {a.origem}</p>}
          </li>
        ))}
      </ul>
    </details>
  );
}
