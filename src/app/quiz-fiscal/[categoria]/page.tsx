// ═══════════════════════════════════════════════════════════════════════
//  /quiz-fiscal/[categoria] — página pública com exposição mínima
//  ---------------------------------------------------------------------
//  A página continua indexável por título e ligação, mas já não publica em
//  massa respostas certas, explicações e opções erradas em HTML/JSON-LD.
//  Mostra apenas uma amostra pequena de enunciados e a respetiva fonte oficial.
//  O jogo continua deliberadamente local: não exige conta nem envia respostas
//  ou resultados ao servidor. O banco no bundle é o custo aceite dessa escolha
//  de privacidade, documentado em docs/PROTECAO-ATIVOS.md.
// ═══════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  META_CATEGORIA_QUIZ,
  META_GRUPO_QUIZ,
  carregarBancoQuiz,
  getEstatisticasBanco,
  type QuizCategoria,
} from "@/lib/quiz-fiscal";
import { generateBreadcrumbSchema, SITE_URL } from "@/lib/seo";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import QuizCategoriaCTA from "@/components/quiz-fiscal/QuizCategoriaCTA";

/** Perguntas mostradas em HTML por página. O jogo tem o banco completo. */
const AMOSTRA = 5;

export const dynamicParams = false;

export function generateStaticParams() {
  return (Object.keys(META_CATEGORIA_QUIZ) as QuizCategoria[]).map((categoria) => ({ categoria }));
}

function categoriaValida(v: string): v is QuizCategoria {
  return Object.prototype.hasOwnProperty.call(META_CATEGORIA_QUIZ, v);
}

export async function generateMetadata(
  { params }: { params: Promise<{ categoria: string }> },
): Promise<Metadata> {
  const { categoria } = await params;
  if (!categoriaValida(categoria)) return {};
  const meta = META_CATEGORIA_QUIZ[categoria];
  const total = getEstatisticasBanco()[categoria]?.total ?? 0;
  const url = `/quiz-fiscal/${categoria}`;

  return {
    title: `Quiz de ${meta.label} ${FISCAL_YEAR} — ${total} perguntas com base legal`,
    description: `${meta.descricao} ${total} perguntas interativas com base legal e ligação à fonte oficial.`,
    alternates: { canonical: `${SITE_URL}${url}` },
    openGraph: {
      title: `Quiz de ${meta.label} ${FISCAL_YEAR} — ReciboCerto`,
      description: `${meta.descricao} ${total} perguntas interativas com base legal.`,
      url: `${SITE_URL}${url}`,
      siteName: "ReciboCerto",
      locale: "pt_PT",
      type: "article",
    },
  };
}

export default async function QuizCategoriaPage(
  { params }: { params: Promise<{ categoria: string }> },
) {
  const { categoria } = await params;
  if (!categoriaValida(categoria)) notFound();

  const meta = META_CATEGORIA_QUIZ[categoria];
  const grupo = META_GRUPO_QUIZ[meta.grupo];
  const banco = await carregarBancoQuiz();
  const daCategoria = banco.filter((p) => p.categoria === categoria);
  // Amostra determinística (as primeiras): o HTML tem de ser estável entre
  // builds, senão o Google vê conteúdo diferente a cada visita.
  const amostra = daCategoria.slice(0, AMOSTRA);
  const url = `/quiz-fiscal/${categoria}`;

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Início", url: "/" },
    { name: "Quiz Fiscal", url: "/quiz-fiscal" },
    { name: meta.label, url },
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <nav aria-label="Caminho" className="mb-6 text-xs text-stone-500 dark:text-stone-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-brand">Início</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/quiz-fiscal" className="hover:text-brand">Quiz Fiscal</Link></li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-stone-700 dark:text-stone-200">{meta.label}</li>
        </ol>
      </nav>

      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">{grupo.label}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-ink dark:text-stone-100 sm:text-4xl">
          Quiz de {meta.label}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{meta.descricao}</p>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          {daCategoria.length} perguntas nesta categoria, cada uma com resposta explicada, base legal e ligação à
          fonte oficial.
        </p>
      </header>

      <QuizCategoriaCTA categoria={categoria} rotulo={meta.label} />

      <section className="mt-10" aria-labelledby="amostra">
        <h2 id="amostra" className="font-display text-xl font-semibold text-ink dark:text-stone-100">
          Perguntas desta categoria
        </h2>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Uma amostra de {amostra.length} das {daCategoria.length}. No quiz, as perguntas aparecem por ordem
          aleatória e sem a resposta à vista.
        </p>

        <ol className="mt-6 space-y-6">
          {amostra.map((p, i) => (
            <li
              key={p.id}
              className="rounded-2xl border border-stone-100 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
            >
              <h3 className="text-sm font-semibold leading-snug text-stone-800 dark:text-stone-100">
                {i + 1}. {p.pergunta}
              </h3>
              <p className="mt-3 border-t border-stone-100 pt-2 text-[11px] text-stone-500 dark:border-stone-800 dark:text-stone-400">
                {p.legalBasis} ·{" "}
                <a
                  href={p.fonte.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-brand"
                >
                  {p.fonte.label}
                </a>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10" aria-labelledby="outras">
        <h2 id="outras" className="font-display text-lg font-semibold text-ink dark:text-stone-100">
          Outras categorias
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(META_CATEGORIA_QUIZ) as QuizCategoria[])
            .filter((c) => c !== categoria)
            .map((c) => (
              <li key={c}>
                <Link
                  href={`/quiz-fiscal/${c}`}
                  className="inline-block rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:border-brand hover:text-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  {META_CATEGORIA_QUIZ[c].label}
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
