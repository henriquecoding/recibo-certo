import { Clock, BookOpen } from "@/components/ui/Icons";
import { CONTEUDO_EXPANSAO } from "@/lib/guias/expansao/conteudo";

// ─────────────────────────────────────────────────────────────────────────
//  GUIA EM PREPARAÇÃO
//
//  O que se mostra a quem chega a um guia cujo corpo ainda não foi escrito.
//
//  A alternativa fácil era devolver 404 até haver texto. Seria pior: a
//  página TEM conteúdo verificado — a resposta curta, a aplicabilidade, os
//  dados do ano e a base legal completa, com os artigos e as epígrafes
//  oficiais. Quem procura «qual é o artigo do IMT sobre a isenção jovem»
//  encontra aqui a resposta, e escondê-la não protege ninguém.
//
//  O que não se pode é fingir que está acabado. Daí este bloco: diz em que
//  pé está, mostra o plano do que falta e não é indexado (`robots:
//  noindex` na página) nem aparece no índice ou na barra lateral.
// ─────────────────────────────────────────────────────────────────────────

export default function EmPreparacao({ slug }: { slug: string }) {
  const conteudo = CONTEUDO_EXPANSAO[slug];
  if (!conteudo) return null;

  return (
    <section aria-labelledby={`preparacao-${slug}`} className="mb-10">
      <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-stone-800/50 sm:p-6">
        <h2
          id={`preparacao-${slug}`}
          className="flex items-center gap-2 font-display text-lg font-semibold text-stone-800 dark:text-stone-100"
        >
          <Clock size={16} className="flex-shrink-0 text-brand" />
          Este guia está em preparação
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          A base legal está levantada e verificada — vês os artigos e as fontes oficiais mais
          abaixo, e podes ir lá confirmar tudo. O que falta é o texto que explica a regra por
          palavras nossas, e preferimos não o publicar antes de o termos escrito e revisto.
        </p>

        <div className="mt-5">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            <BookOpen size={12} />
            O que este guia vai cobrir
          </p>
          <ol className="space-y-1.5">
            {conteudo.estruturaH2.map((h2, i) => (
              <li key={h2} className="flex gap-2.5 text-sm text-stone-600 dark:text-stone-400">
                <span className="w-4 flex-shrink-0 text-right text-xs tabular-nums text-stone-400">
                  {i + 1}.
                </span>
                <span className="min-w-0">{h2}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
