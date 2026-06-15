"use client";

import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import { Check, Close, Rocket, LayoutGrid, ChartProjection, Sparkle, ShieldCheck } from "@/components/ui/Icons";
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
}

export default function Resultado({ quiz }: ResultadoProps) {
  const { resultado, sessao, jogarNovamente, reiniciar } = quiz;
  if (!resultado) return null;

  const { acertos, totalPerguntas, percentagem, porCategoria, classificacao, respostas, modo } = resultado;
  const ClassIcon = CLASSIFICACAO_ICON[classificacao.icone];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      {/* Hero */}
      <Reveal>
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-light text-brand-dark">
            <ClassIcon size={32} />
          </div>
          <h1 className="mt-3 font-display text-2xl font-semibold text-ink dark:text-stone-100 sm:text-3xl">
            {classificacao.titulo}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            {classificacao.mensagem}
          </p>
        </div>
      </Reveal>

      {/* Score */}
      <Reveal delay={0.05}>
        <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-7">
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="font-display text-4xl font-semibold text-brand-dark dark:text-brand-light sm:text-5xl">
                {acertos}
                <span className="text-xl text-stone-300 dark:text-stone-600">/{totalPerguntas}</span>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                respostas certas
              </p>
            </div>
            <div className="h-12 w-px bg-stone-200 dark:bg-stone-700" />
            <div className="text-center">
              <div className="font-display text-4xl font-semibold text-ink dark:text-stone-100 sm:text-5xl">{percentagem}%</div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                aproveitamento
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Per-category breakdown */}
      {porCategoria.length > 0 && (
        <Reveal delay={0.1}>
          <div className="mt-6">
            <h2 className="mb-3 font-display text-base font-semibold text-ink dark:text-stone-100">Desempenho por tema</h2>
            <div className="flex flex-col gap-2.5">
              {porCategoria.map((cat) => {
                const meta = META_CATEGORIA_QUIZ[cat.categoria];
                const CatIcon = resolveQuizIcon(meta.icon);
                const pct = cat.total > 0 ? Math.round((cat.acertos / cat.total) * 100) : 0;
                return (
                  <div key={cat.categoria} className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-card dark:border-stone-700 dark:bg-stone-900">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-ink dark:text-stone-100">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cream text-brand-dark dark:bg-stone-800">
                          <CatIcon size={14} />
                        </span>
                        {meta.label}
                      </span>
                      <span className="font-mono text-xs font-semibold text-stone-500 dark:text-stone-400">
                        {cat.acertos}/{cat.total}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-700"
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
          <h2 className="mb-3 font-display text-base font-semibold text-ink dark:text-stone-100">Revisao</h2>
          <div className="flex flex-col gap-2.5">
            {respostas.map((resp, i) => {
              const item = sessao[i];
              if (!item) return null;
              const opcaoCorreta = item.opcoes[item.correta];
              const opcaoEscolhida = resp.opcaoSelecionada !== null ? item.opcoes[resp.opcaoSelecionada] : null;

              return (
                <div
                  key={resp.perguntaId}
                  className={`rounded-2xl border p-3.5 text-sm ${
                    resp.acertou ? "border-brand/20 bg-brand-light/40" : "border-clay-border bg-clay-bg/60"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        resp.acertou ? "bg-brand text-white" : "bg-clay text-white"
                      }`}
                    >
                      {resp.acertou ? <Check size={11} /> : <Close size={11} />}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium leading-snug text-ink dark:text-stone-100">{item.pergunta.pergunta}</p>
                      {!resp.acertou && (
                        <div className="mt-1.5 space-y-0.5 text-xs">
                          {opcaoEscolhida && (
                            <p className="text-clay-text">
                              <span className="font-semibold">A tua resposta: </span>
                              {opcaoEscolhida.texto}
                            </p>
                          )}
                          <p className="text-brand-dark dark:text-brand-light">
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
          <Button variant="primary" size="lg" onClick={jogarNovamente} className="flex-1">
            <Rocket size={16} />
            Jogar novamente
          </Button>
          <Button variant="secondary" size="lg" onClick={reiniciar} className="flex-1">
            <LayoutGrid size={16} />
            Escolher outro tema
          </Button>
        </div>
        {modo === "normal" && (
          <p className="mt-3 text-center text-xs text-stone-400">
            Queres entender o porque de cada resposta? Experimenta o Modo Guiado.
          </p>
        )}
      </Reveal>
    </div>
  );
}
