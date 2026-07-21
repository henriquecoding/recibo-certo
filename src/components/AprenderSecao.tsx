"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Secção "Aprender" da homepage — guias curados para o perfil ativo + cartão do
// Quiz Fiscal com contagens reais (quiz-meta é leve por construção; nunca puxa
// os bancos de perguntas). Curadoria em src/lib/guias-config.ts, validada em
// ecossistema.test.ts. Transição em cascata na troca de perfil.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { m, AnimatePresence } from "motion/react";
import { usePerfil, type Perfil } from "@/lib/perfil";
import { GUIAS, guiasPorPerfil } from "@/lib/guias-config";
import { TOTAL_PERGUNTAS_META, ESTATISTICAS_BANCO } from "@/lib/quiz-fiscal/quiz-meta";
import Reveal from "@/components/ui/Reveal";
import { ArrowRight, BookOpen, Trophy, Clock, ShieldCheck } from "@/components/ui/Icons";
import { EASE } from "@/lib/motion";

const N_CATEGORIAS_QUIZ = Object.keys(ESTATISTICAS_BANCO).length;

const SUB: Record<Perfil, string> = {
  independente: "Guias curtos e práticos para quem passa recibos verdes — do primeiro dia de atividade ao IVA.",
  dependente: "Percebe o teu recibo de vencimento linha a linha — e o que te desconta cada mês.",
  empresa: "O essencial para constituir e gerir a sociedade sem sustos — IRC, tributação autónoma e custos reais.",
  comparar: "Os conceitos transversais que fazem a diferença em qualquer caminho — escalões, prazos e estruturas.",
};

const entrada = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE } },
};

export default function AprenderSecao() {
  const { perfil } = usePerfil();
  const guias = guiasPorPerfil(perfil);

  return (
    <div className="mx-auto max-w-5xl">
      <Reveal className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="max-w-xl">
            <div className="eyebrow mb-3 text-brand">Aprender</div>
            <h2 className="font-display display-2 font-semibold text-ink">
              Percebe o porquê de cada número.
            </h2>
            <AnimatePresence mode="wait" initial={false}>
              <m.p
                key={perfil}
                variants={entrada}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mt-3 text-stone-500 dark:text-stone-400"
              >
                {SUB[perfil] ?? SUB.independente}
              </m.p>
            </AnimatePresence>
          </div>
          <Link
            href="/guias"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          >
            Ver os {GUIAS.length} guias
            <ArrowRight size={14} />
          </Link>
        </div>
      </Reveal>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
        {/* Guias curados para o perfil ativo */}
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={perfil}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
              exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE } },
            }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {guias.map((g) => (
              <m.div key={g.href} variants={entrada} className="h-full">
                <Link
                  href={g.href}
                  className="group flex h-full items-start gap-4 rounded-4xl border border-stone-200/80 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:border-stone-800 dark:bg-stone-900"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand-light group-hover:text-brand dark:bg-stone-800 dark:text-stone-400">
                    <g.icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug text-stone-800 transition-colors group-hover:text-brand-dark dark:text-stone-100 dark:group-hover:text-brand">
                      {g.titulo}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      {g.descricao}
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-stone-400">
                      <Clock size={11} />
                      {g.tempo} min de leitura
                    </span>
                  </span>
                  <ArrowRight
                    size={14}
                    className="mt-1 flex-shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand"
                  />
                </Link>
              </m.div>
            ))}
          </m.div>
        </AnimatePresence>

        {/* Quiz Fiscal — contagens reais do banco de perguntas */}
        <Reveal delay={0.1}>
          <Link
            href="/quiz-fiscal"
            className="group relative block overflow-hidden rounded-4xl bg-brand p-6 text-white shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:shadow-float focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:p-7"
          >
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <Trophy size={20} />
            </span>
            <div className="mt-5 font-display text-4xl font-semibold leading-none tabular-nums">
              {TOTAL_PERGUNTAS_META.toLocaleString("pt-PT")}
            </div>
            <div className="mt-1.5 text-sm font-semibold text-white/90">
              perguntas com base legal
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/75">
              Testa-te no Quiz Fiscal: {N_CATEGORIAS_QUIZ} categorias — de IRS e IVA à Segurança
              Social — em sessões de 60 perguntas, todas com fonte oficial.
            </p>
            <div className="mt-5 space-y-1.5 border-t border-white/15 pt-4 text-xs text-white/80">
              <div className="flex items-center gap-2">
                <BookOpen size={12} /> Modo guiado com explicações
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={12} /> Base legal em cada resposta
              </div>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark transition-transform group-hover:-translate-y-0.5">
              Começar o quiz
              <ArrowRight size={13} />
            </span>
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
