"use client";

import { m, AnimatePresence } from "motion/react";
import Reveal from "@/components/ui/Reveal";
import { Check, Close, Clock, ArrowRight, ExternalLink, Scale } from "@/components/ui/Icons";
import { resolveQuizIcon } from "./icon-map";
import VantagensBar from "./VantagensBar";
import { META_CATEGORIA_QUIZ } from "@/lib/quiz-fiscal";
import type { UseQuizFiscalReturn } from "@/hooks/useQuizFiscal";
import { TIMER_NORMAL_SEGUNDOS } from "@/hooks/useQuizFiscal";

const LETRAS = ["A", "B", "C", "D"];

interface QuizNormalProps {
  quiz: UseQuizFiscalReturn;
  onSair: () => void;
}

export default function QuizNormal({ quiz, onSair }: QuizNormalProps) {
  const {
    atual, indice, sessao, selecionada, respondida, tempoRestante,
    responderNormal, vantagens, eliminadas, dicaVisivel,
    mostrarExplicacao, verExplicacaoAtiva, seguinte,
    usarEliminar2, usarDica, usarTempoExtra, usarExplicacao,
  } = quiz;
  if (!atual) return null;

  const { pergunta, opcoes, correta } = atual;
  const meta = META_CATEGORIA_QUIZ[pergunta.categoria];
  const Icon = resolveQuizIcon(meta.icon);

  const tPct = (tempoRestante / TIMER_NORMAL_SEGUNDOS) * 100;
  const corTempo = tPct > 60 ? "bg-quiz-olive" : tPct > 30 ? "bg-quiz-leather" : "bg-clay";
  const corTexto = tPct > 60 ? "text-quiz-olive" : tPct > 30 ? "text-quiz-leather-dark" : "text-clay-text";

  const acertou = respondida && selecionada === correta;

  const estadoOpcao = (idx: number): "default" | "correta" | "errada" | "apagada" | "eliminada" => {
    if (eliminadas.includes(idx) && !respondida) return "eliminada";
    if (!respondida) return "default";
    if (idx === correta) return "correta";
    if (idx === selecionada) return "errada";
    return "apagada";
  };

  const ultimaPergunta = indice === sessao.length - 1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onSair}
          className="text-sm font-medium text-quiz-sage transition-colors hover:text-quiz-forest-deep dark:hover:text-quiz-parchment"
        >
          ← Sair
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-quiz-sage-border bg-quiz-sage-light px-3 py-1 text-xs font-semibold text-quiz-forest-deep dark:border-quiz-olive dark:bg-quiz-olive/30 dark:text-quiz-sage-light">
          <Icon size={12} />
          {meta.label}
        </span>
      </div>

      {/* Progress + Timer */}
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-quiz-sage dark:text-quiz-sage">
          Pergunta <span className="text-quiz-forest-deep dark:text-quiz-parchment">{indice + 1}</span> / {sessao.length}
        </span>
        <span className={`flex items-center gap-1 font-mono font-semibold ${corTexto} dark:text-quiz-parchment`}>
          <Clock size={14} />
          {tempoRestante}s
        </span>
      </div>
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-quiz-parchment-border dark:bg-quiz-olive/40">
        <m.div
          className={`h-full rounded-full ${corTempo}`}
          animate={{ width: `${tPct}%` }}
          transition={{ duration: 0.9, ease: "linear" }}
        />
      </div>

      {/* Vantagens */}
      <div className="mb-4">
        <VantagensBar
          vantagens={vantagens}
          modo="normal"
          respondida={respondida}
          onEliminar2={usarEliminar2}
          onDica={usarDica}
          onTempoExtra={usarTempoExtra}
          onExplicacao={usarExplicacao}
        />
      </div>

      {/* Dica */}
      <AnimatePresence>
        {dicaVisivel && !respondida && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="rounded-2xl border-2 border-quiz-sage/30 bg-quiz-sage-light p-3.5 text-sm text-quiz-forest-deep dark:border-quiz-sage-dark/40 dark:bg-quiz-olive/30 dark:text-quiz-sage-light">
              <span className="font-semibold">Dica Fiscal: </span>
              {pergunta.legalBasis}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Question */}
      <Reveal key={pergunta.id}>
        <div className="rounded-2xl border-2 border-quiz-parchment-mid bg-quiz-parchment-warm p-6 shadow-md dark:border-quiz-olive/40 dark:bg-quiz-forest/60 sm:p-7">
          <p className="font-display text-lg font-medium leading-relaxed text-quiz-forest-deep dark:text-quiz-parchment sm:text-xl">
            {pergunta.pergunta}
          </p>
        </div>

        {/* Options */}
        <div className="mt-4 flex flex-col gap-3">
          {opcoes.map((opcao, idx) => {
            const estado = estadoOpcao(idx);
            return (
              <button
                key={idx}
                type="button"
                disabled={respondida || estado === "eliminada"}
                onClick={() => responderNormal(idx)}
                className={opcaoClasses(estado)}
              >
                <span className={letraClasses(estado)}>
                  {estado === "correta" ? <Check size={14} /> : estado === "errada" ? <Close size={14} /> : LETRAS[idx]}
                </span>
                <span className="text-sm leading-snug sm:text-base">{opcao.texto}</span>
              </button>
            );
          })}
        </div>
      </Reveal>

      {/* Explanation (when "Ver explicacao" vantagem is active) */}
      <AnimatePresence>
        {mostrarExplicacao && verExplicacaoAtiva && respondida && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
          >
            <div
              className={`mt-4 flex items-center gap-2 rounded-2xl border-2 p-3.5 text-sm font-semibold ${
                acertou
                  ? "border-quiz-sage-border bg-quiz-sage-light text-quiz-forest-deep dark:border-quiz-sage-dark/40 dark:bg-quiz-olive/30 dark:text-quiz-sage-light"
                  : "border-clay-border bg-clay-bg text-clay-text"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  acertou ? "bg-quiz-sage-dark text-white" : "bg-clay text-white"
                }`}
              >
                {acertou ? <Check size={14} /> : <Close size={14} />}
              </span>
              {acertou ? "Resposta correta!" : "Resposta incorreta"}
            </div>

            <div className="mt-3 rounded-2xl border-2 border-quiz-parchment-mid bg-quiz-parchment p-4 dark:border-quiz-olive/40 dark:bg-quiz-forest/60">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-quiz-parchment-warm text-quiz-forest-deep shadow-sm dark:bg-quiz-olive/40 dark:text-quiz-sage-light">
                  <Scale size={14} />
                </span>
                <div className="text-sm">
                  <p className="font-semibold text-quiz-forest-deep dark:text-quiz-parchment">Base legal</p>
                  <p className="mt-0.5 text-quiz-sage-dark dark:text-quiz-sage">{pergunta.legalBasis}</p>
                  <p className="mt-1.5 text-quiz-forest-deep/80 dark:text-quiz-parchment/80">
                    {opcoes[correta].porque}
                  </p>
                  <a
                    href={pergunta.fonte.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-quiz-olive hover:underline dark:text-quiz-sage-light"
                  >
                    {pergunta.fonte.label}
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={seguinte}
                className="inline-flex items-center gap-2 rounded-2xl bg-quiz-forest px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-quiz-forest-deep active:scale-[0.98] dark:bg-quiz-olive dark:hover:bg-quiz-sage-dark"
              >
                {ultimaPergunta ? "Ver resultado" : "Seguinte"}
                <ArrowRight size={16} />
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Progress dots */}
      <div className="mt-7 flex justify-center gap-1.5">
        {sessao.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === indice
                ? "w-5 bg-quiz-olive dark:bg-quiz-sage-dark"
                : i < indice
                ? "w-1.5 bg-quiz-olive/40 dark:bg-quiz-sage-dark/40"
                : "w-1.5 bg-quiz-parchment-border dark:bg-quiz-olive/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function opcaoClasses(estado: "default" | "correta" | "errada" | "apagada" | "eliminada"): string {
  const base = "flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200";
  switch (estado) {
    case "correta":
      return `${base} border-quiz-sage-border bg-quiz-sage-light text-quiz-forest-deep dark:border-quiz-sage-dark/60 dark:bg-quiz-olive/30 dark:text-quiz-parchment`;
    case "errada":
      return `${base} border-clay-border bg-clay-bg text-clay-text`;
    case "apagada":
      return `${base} border-quiz-parchment-mid bg-quiz-parchment opacity-50 dark:border-quiz-olive/20 dark:bg-quiz-forest/30`;
    case "eliminada":
      return `${base} border-quiz-parchment-mid bg-quiz-parchment opacity-30 line-through dark:border-quiz-olive/20 dark:bg-quiz-forest/30`;
    default:
      return `${base} border-quiz-parchment-mid bg-quiz-parchment-warm shadow-md hover:border-quiz-sage/60 hover:shadow-lg active:scale-[0.99] dark:border-quiz-olive/40 dark:bg-quiz-forest/60 dark:hover:border-quiz-sage/50`;
  }
}

function letraClasses(estado: "default" | "correta" | "errada" | "apagada" | "eliminada"): string {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold";
  switch (estado) {
    case "correta":
      return `${base} bg-quiz-sage-dark text-white`;
    case "errada":
      return `${base} bg-clay text-white`;
    case "apagada":
    case "eliminada":
      return `${base} bg-quiz-parchment-border text-quiz-sage dark:bg-quiz-olive/30 dark:text-quiz-sage/60`;
    default:
      return `${base} bg-quiz-sage text-white dark:bg-quiz-sage/80`;
  }
}
