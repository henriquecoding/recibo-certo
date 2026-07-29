import { ExternalLink } from "@/components/ui/Icons";
import { fontesDoGuia, AUTORIDADES, type LegalSource } from "@/lib/guias";

// ─────────────────────────────────────────────────────────────────────────
//  Fontes de um Guia — DERIVADAS do catálogo legal, não escritas na página.
//
//  Antes, cada página declarava o seu array `FONTES` com um campo
//  `tipo: "oficial" | "referencia"` — foi assim que um artigo bancário
//  acabou marcado como despacho oficial (falha 3.3 da auditoria).
//
//  Agora: `LEGAL_SOURCES` (só autoridades) e `LEITURAS_COMPLEMENTARES` são
//  tipos distintos. Marcar uma fonte secundária como oficial deixou de ser
//  possível — não é uma convenção, é o sistema de tipos.
// ─────────────────────────────────────────────────────────────────────────

function Fonte({ fonte }: { fonte: LegalSource }) {
  const historica = fonte.status === "historical";
  return (
    <li>
      <a
        href={fonte.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-2 text-sm text-stone-600 transition-colors hover:text-brand dark:text-stone-400"
      >
        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
        <span className="min-w-0">
          <span className="underline decoration-stone-200 underline-offset-2 group-hover:decoration-brand">
            {fonte.title}
          </span>
          <ExternalLink size={11} className="ml-1 inline opacity-50 group-hover:opacity-100" />
          <span className="mt-0.5 block text-[11px] text-stone-400">
            {AUTORIDADES[fonte.authority]}
            {fonte.consolidada && " · versão consolidada"}
            {historica && " · versão histórica, citada apenas para comparação"}
            {` · verificada em ${new Date(fonte.lastCheckedAt).toLocaleDateString("pt-PT")}`}
          </span>
        </span>
      </a>
    </li>
  );
}

export function FontesGuia({ slug }: { slug: string }) {
  const { oficiais, complementares } = fontesDoGuia(slug);
  if (oficiais.length === 0 && complementares.length === 0) return null;

  return (
    <section
      aria-labelledby={`fontes-${slug}`}
      className="mt-10 rounded-3xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-stone-900/50 sm:p-6"
    >
      <h2 id={`fontes-${slug}`} className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
        Fontes e base legal
      </h2>

      {oficiais.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Fontes oficiais
          </p>
          <ul className="space-y-2.5">
            {oficiais.map((f) => (
              <Fonte key={f.id} fonte={f} />
            ))}
          </ul>
        </div>
      )}

      {complementares.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Leitura complementar
          </p>
          {/* Explicita o estatuto: explica, não fundamenta. */}
          <p className="mb-2 text-[11px] leading-relaxed text-stone-400">
            Publicações de terceiros que ajudam a compreender o tema. Não são fonte de direito.
          </p>
          <ul className="space-y-2">
            {complementares.map((r) => (
              <li key={r.id}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 text-sm text-stone-500 transition-colors hover:text-brand dark:text-stone-500"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-stone-300" />
                  <span className="min-w-0">
                    <span className="underline decoration-stone-200 underline-offset-2 group-hover:decoration-brand">
                      {r.title}
                    </span>
                    <ExternalLink size={11} className="ml-1 inline opacity-50 group-hover:opacity-100" />
                    <span className="ml-1 text-[11px] text-stone-400">· {r.publisher}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default FontesGuia;
