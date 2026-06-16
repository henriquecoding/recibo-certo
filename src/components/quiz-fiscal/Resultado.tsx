"use client";

import Reveal from "@/components/ui/Reveal";
import { Check, Close, Rocket, LayoutGrid, ChartProjection, Sparkle, ShieldCheck, Star, Zap } from "@/components/ui/Icons";
import { resolveQuizIcon } from "./icon-map";
import { META_CATEGORIA_QUIZ } from "@/lib/quiz-fiscal";
import type { UseQuizFiscalReturn, ClassificacaoQuiz } from "@/hooks/useQuizFiscal";

const CLASSIFICACAO_ICON: Record<ClassificacaoQuiz["icone"], (props: { size?: number; className?: string }) => React.ReactElement> = {
  trophy: ShieldCheck,
  chart: ChartProjection,
  book: Sparkle,
  seedling: Rocket,
};

interface ResultadoProps {
  quiz: UseQuizFiscalReturn;
  xpGanho?: number;
  levelUp?: boolean;
  nivelNovo?: { nivel: number; titulo: string };
}

export default function Resultado({ quiz, xpGanho = 0, levelUp = false, nivelNovo }: ResultadoProps) {
  const { resultado, sessao, jogarNovamente, reiniciar } = quiz;
  if (!resultado) return null;

  const { acertos, totalPerguntas, percentagem, porCategoria, classificacao, respostas, modo } = resultado;
  const ClassIcon = CLASSIFICACAO_ICON[classificacao.icone];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      {/* Hero */}
      <Reveal>
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-quiz-sage-light text-quiz-forest-deep dark:bg-quiz-olive/30 dark:text-quiz-sage-light">
            <ClassIcon size={32} />
          </div>
          <h1 className="mt-3 font-display text-2xl font-semibold text-quiz-forest-deep dark:text-quiz-parchment sm:text-3xl">
            {classificacao.titulo}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-quiz-sage-dark dark:text-quiz-sage">
            {classificacao.mensagem}
          </p>
        </div>
      </Reveal>

      {/* Score */}
      <Reveal delay={0.05}>
        <div className="mt-8 rounded-2xl border-2 border-quiz-parchment-mid bg-quiz-parchment-warm p-6 shadow-md dark:border-quiz-olive/40 dark:bg-quiz-forest/60 sm:p-7">
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <div className="text-center">
              <div className="font-display text-4xl font-semibold text-quiz-olive dark:text-quiz-sage-light sm:text-5xl">
                {acertos}
                <span className="text-xl text-quiz-sage/50 dark:text-quiz-sage/40">/{totalPerguntas}</span>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-quiz-sage dark:text-quiz-sage">
                respostas certas
              </p>
            </div>
            <div className="h-12 w-px bg-quiz-parchment-mid dark:bg-quiz-olive/40" />
            <div className="text-center">
              <div className="font-display text-4xl font-semibold text-quiz-forest-deep dark:text-quiz-parchment sm:text-5xl">{percentagem}%</div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-quiz-sage dark:text-quiz-sage">
                aproveitamento
              </p>
            </div>
            {resultado.pontos > 0 && (
              <>
                <div className="h-12 w-px bg-quiz-parchment-mid dark:bg-quiz-olive/40" />
                <div className="text-center">
                  <div className="font-display text-4xl font-semibold text-quiz-forest-deep dark:text-quiz-parchment sm:text-5xl tabular-nums">{resultado.pontos}</div>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-quiz-sage dark:text-quiz-sage">
                    pontos
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </Reveal>

      {/* XP ganho + level-up */}
      {xpGanho > 0 && (
        <Reveal delay={0.08}>
          <div className="mt-4 flex flex-col gap-3">
            {/* XP gained pill */}
            <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-quiz-parchment-mid bg-quiz-parchment-warm px-5 py-3 shadow-sm dark:border-quiz-olive/40 dark:bg-quiz-forest/60">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-quiz-olive/10 text-quiz-olive dark:bg-quiz-sage-dark/20 dark:text-quiz-sage-light">
                <Star size={16} />
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-quiz-sage dark:text-quiz-sage">XP ganho</span>
                <span className="mt-0.5 font-display text-xl font-semibold text-quiz-forest-deep dark:text-quiz-parchment">
                  +{xpGanho} XP
                </span>
              </div>
            </div>

            {/* Level up banner */}
            {levelUp && nivelNovo && (
              <div className="flex items-center gap-3 rounded-2xl border-2 border-quiz-olive/40 bg-quiz-olive/10 px-5 py-3.5 shadow-sm dark:border-quiz-sage-dark/40 dark:bg-quiz-olive/20">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-quiz-olive text-white dark:bg-quiz-sage-dark">
                  <Zap size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-quiz-olive dark:text-quiz-sage-light">
                    Subiste de nivel!
                  </p>
                  <p className="mt-0.5 font-display text-base font-semibold text-quiz-forest-deep dark:text-quiz-parchment truncate">
                    Nivel {nivelNovo.nivel} — {nivelNovo.titulo}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* Per-category breakdown */}
      {porCategoria.length > 0 && (
        <Reveal delay={0.1}>
          <div className="mt-6">
            <h2 className="mb-3 font-display text-base font-semibold text-quiz-forest-deep dark:text-quiz-parchment">Desempenho por tema</h2>
            <div className="flex flex-col gap-2.5">
              {porCategoria.map((cat) => {
                const meta = META_CATEGORIA_QUIZ[cat.categoria];
                const CatIcon = resolveQuizIcon(meta.icon);
                const pct = cat.total > 0 ? Math.round((cat.acertos / cat.total) * 100) : 0;
                return (
                  <div key={cat.categoria} className="rounded-2xl border-2 border-quiz-parchment-mid bg-quiz-parchment-warm p-3.5 shadow-sm dark:border-quiz-olive/40 dark:bg-quiz-forest/60">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-quiz-forest-deep dark:text-quiz-parchment">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-quiz-sage text-white dark:bg-quiz-sage/80">
                          <CatIcon size={14} />
                        </span>
                        {meta.label}
                      </span>
                      <span className="font-mono text-xs font-semibold text-quiz-sage dark:text-quiz-sage">
                        {cat.acertos}/{cat.total}
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-quiz-parchment-border dark:bg-quiz-olive/40">
                      <div
                        className="h-full rounded-full bg-quiz-olive transition-all duration-700 dark:bg-quiz-sage-dark"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      )}

      {/* Review */}
      <Reveal delay={0.15}>
        <div className="mt-6">
          <h2 className="mb-3 font-display text-base font-semibold text-quiz-forest-deep dark:text-quiz-parchment">Revisao</h2>
          <div className="flex flex-col gap-2.5">
            {respostas.map((resp, i) => {
              const item = sessao[i];
              if (!item) return null;
              const opcaoCorreta = item.opcoes[item.correta];
              const opcaoEscolhida = resp.opcaoSelecionada !== null ? item.opcoes[resp.opcaoSelecionada] : null;

              return (
                <div
                  key={resp.perguntaId}
                  className={`rounded-2xl border-2 p-3.5 text-sm ${
                    resp.acertou
                      ? "border-quiz-sage-border/60 bg-quiz-sage-light/60 dark:border-quiz-sage-dark/30 dark:bg-quiz-olive/20"
                      : "border-clay-border bg-clay-bg/60"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        resp.acertou ? "bg-quiz-sage-dark text-white" : "bg-clay text-white"
                      }`}
                    >
                      {resp.acertou ? <Check size={11} /> : <Close size={11} />}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium leading-snug text-quiz-forest-deep dark:text-quiz-parchment">{item.pergunta.pergunta}</p>
                      {!resp.acertou && (
                        <div className="mt-1.5 space-y-0.5 text-xs">
                          {opcaoEscolhida && (
                            <p className="text-clay-text">
                              <span className="font-semibold">A tua resposta: </span>
                              {opcaoEscolhida.texto}
                            </p>
                          )}
                          <p className="text-quiz-olive dark:text-quiz-sage-light">
                            <span className="font-semibold">Resposta certa: </span>
                            {opcaoCorreta.texto}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* Actions */}
      <Reveal delay={0.2}>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={jogarNovamente}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-quiz-forest px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-quiz-forest-deep active:scale-[0.98] dark:bg-quiz-olive dark:hover:bg-quiz-sage-dark"
          >
            <Rocket size={16} />
            Jogar novamente
          </button>
          <button
            type="button"
            onClick={reiniciar}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-quiz-parchment-mid bg-quiz-parchment-warm px-6 py-3.5 text-sm font-semibold text-quiz-forest-deep shadow-md transition-all hover:border-quiz-sage/60 hover:shadow-lg active:scale-[0.98] dark:border-quiz-olive/40 dark:bg-quiz-forest/60 dark:text-quiz-parchment dark:hover:border-quiz-sage/50"
          >
            <LayoutGrid size={16} />
            Escolher outro tema
          </button>
        </div>
        {modo === "normal" && (
          <p className="mt-3 text-center text-xs text-quiz-sage">
            Queres entender o porque de cada resposta? Experimenta o Modo Guiado.
          </p>
        )}
      </Reveal>
    </div>
  );
}
