import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import DiretorioCliente from "./DiretorioCliente";
import DiretorioComoFunciona from "./DiretorioComoFunciona";
import { ArrowRight, ShieldCheck } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Encontrar contabilista | Recibo Certo",
  description:
    "Encontra contabilistas por área de trabalho, localização e atendimento online ou presencial. Consulta o perfil profissional e pede vínculo, sem plano pago.",
  // Os filtros são estados de uso, não páginas: a canónica é sempre a
  // rota limpa, para não semear o índice com combinações infinitas (§74).
  alternates: { canonical: "/contabilistas" },
};

/**
 * O que muda nesta página: a ordem.
 *
 * Antes explicava-se («o que podes fazer aqui», quatro cartões, nota de
 * privacidade) e só depois se mostrava quem existe. Quem chega ao
 * diretório não veio aprender o modelo — veio saber QUEM o pode ajudar.
 * Por isso a procura vem antes da lista, a lista antes do tutorial, e a
 * candidatura de contabilistas fica no fim, onde não compete com nada
 * (§2, §16, §55).
 */
export default function DiretorioPage() {
  return (
    <main className="min-h-[100dvh] bg-cream dark:bg-stone-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <section className="grid grid-cols-1 items-end gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <header className="max-w-2xl">
            <p className="eyebrow">Diretório profissional</p>
            <h1 className="mt-2 font-display text-[2.15rem] leading-[1.08] text-ink dark:text-stone-50 sm:text-5xl">
              Encontra o contabilista certo para a tua situação.
            </h1>
            <p className="mt-3.5 text-base leading-relaxed text-stone-600 dark:text-stone-300">
              Procura por área de trabalho, localização e forma de atendimento.
              Consulta o perfil profissional e pede vínculo sem subscrição.
            </p>
          </header>

          {/* A promessa de privacidade em três linhas, e não em quatro
              cartões: é uma condição para confiar na página, não o assunto
              dela (§18). */}
          <aside className="rounded-4xl border border-brand/15 bg-gradient-to-br from-brand-light/70 to-white p-5 shadow-card dark:border-brand/25 dark:from-brand/10 dark:to-stone-900">
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand-dark dark:text-brand-mint">
                <ShieldCheck size={18} aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                  Tu decides o que é partilhado
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  Vincular-te a um contabilista não abre os teus dados fiscais.
                  Ele só recebe aquilo que enviares explicitamente.
                </p>
              </div>
            </div>
            <ul className="mt-3.5 flex flex-wrap gap-1.5">
              {["Sem plano pago", "Partilhas revogáveis", "Perfis aprovados"].map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-stone-200/70 bg-white/70 px-2.5 py-1 text-[0.6875rem] font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300"
                >
                  {t}
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <div className="mt-7">
          {/* `useSearchParams` obriga a uma fronteira de Suspense para o
              resto da página poder ser servido estático. O esqueleto tem a
              altura do finder, para a página não saltar (§78). */}
          <Suspense
            fallback={
              <div
                className="h-40 animate-pulse rounded-4xl border border-stone-200 bg-white/70 dark:border-stone-800 dark:bg-stone-900/60"
                aria-hidden
              />
            }
          >
            <DiretorioCliente />
          </Suspense>
        </div>

        <div className="mt-12 space-y-4">
          <DiretorioComoFunciona />

          <aside className="flex flex-wrap items-center justify-between gap-4 rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800 dark:bg-stone-900">
            <div className="min-w-0 max-w-2xl">
              <h2 className="font-display text-xl text-ink dark:text-stone-50">És contabilista?</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                Cria o teu perfil profissional e pede acesso ao painel de gestão: agenda,
                clientes, partilhas e cartão de fidelidade. Qualquer conta se pode
                candidatar; a administração analisa cada pedido antes de aprovar.
              </p>
            </div>
            <Link
              href="/contabilistas/candidatura"
              className="btn-shine focus-marca inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
            >
              Candidatar-me <ArrowRight size={16} aria-hidden />
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
