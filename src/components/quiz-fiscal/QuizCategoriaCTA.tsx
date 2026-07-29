"use client";

import Link from "next/link";
import { prefetchBancoQuiz, type QuizCategoria } from "@/lib/quiz-fiscal";

/**
 * Chamada para jogar, a partir de uma página de categoria.
 *
 * É o único pedaço de cliente destas rotas — o resto é HTML servido, que é
 * precisamente o que faltava para o Google ter o que indexar. Aproveita para
 * pré-aquecer o banco no hover, como já faz o ecrã de seleção.
 */
export default function QuizCategoriaCTA({
  categoria,
  rotulo,
}: {
  categoria: QuizCategoria;
  rotulo: string;
}) {
  return (
    <div className="rounded-2xl border border-brand/20 bg-brand-light/60 p-5 dark:border-brand/15 dark:bg-brand/10">
      <p className="text-sm font-semibold text-brand-dark dark:text-brand">
        Testa-te em {rotulo}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-brand-dark/75 dark:text-brand/70">
        Sessões de 5 a 20 perguntas, com cronómetro ou com explicações passo a passo.
      </p>
      <Link
        href={`/quiz-fiscal?categoria=${categoria}`}
        onPointerEnter={() => prefetchBancoQuiz()}
        onFocus={() => prefetchBancoQuiz()}
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        Começar o quiz
      </Link>
    </div>
  );
}
