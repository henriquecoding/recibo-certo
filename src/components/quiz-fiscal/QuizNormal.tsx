"use client";

import { m, AnimatePresence } from "motion/react";
import Reveal from "@/components/ui/Reveal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
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
  const corTempo = tPct > 60 ? "bg-brand" : tPct > 30 ? "bg-alert" : "bg-clay";
  const corTexto = tPct > 60 ? "text-brand-dark" : tPct > 30 ? "text-alert-text" : "text-clay-text";

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
          className="text-sm font-medium text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
        >
          ← Sair
        </button>
        <Badge tone="brand">
          <Icon size={12} className="mr-1" />
          {meta.label}
        </Badge>
      </div>

      {/* Progress + Timer */}
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-stone-500 dark:text-stone-400">
          Pergunta <span className="text-ink dark:text-stone-100">{indice + 1}</span> / {sessao.length}
        </span>
        <span className={`flex items-center gap-1 font-mono font-semibold ${corTexto}`}>
          <Clock size={14} />
          {tempoRestante}s
        </span>
      </div>
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
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
            <div className="rounded-2xl border border-brand/30 bg-brand-light p-3.5 text-sm text-brand-dark dark:bg-brand-light/10 dark:text-brand-light">
              <span className="font-semibold">Dica Fiscal: </span>
              {pergunta.legalBasis}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Question */}
      <Reveal key={pergunta.id}>
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-7">
          <p className="font-display text-lg font-medium leading-relaxed text-ink dark:text-stone-100 sm:text-xl">
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
              className={`mt-4 flex items-center gap-2 rounded-2xl border p-3.5 text-sm font-semibold ${
                acertou ? "border-brand/30 bg-brand-light text-brand-dark" : "border-clay-border bg-clay-bg text-clay-text"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  acertou ? "bg-brand text-white" : "bg-clay text-white"
                }`}
              >
                {acertou ? <Check size={14} /> : <Close size={14} />}
              </span>
              {acertou ? "Resposta correta!" : "Resposta incorreta"}
            </div>

            <div className="mt-3 rounded-2xl border border-stone-200 bg-cream p-4 dark:border-stone-700 dark:bg-stone-900">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-brand-dark shadow-card dark:bg-stone-800">
                  <Scale size={14} />
                </span>
                <div className="text-sm">
                  <p className="font-semibold text-ink dark:text-stone-100">Base legal</p>
                  <p className="mt-0.5 text-stone-500 dark:text-stone-400">{pergunta.legalBasis}</p>
                  <p className="mt-1.5 text-stone-600 dark:text-stone-300">
                    {opcoes[correta].porque}
                  </p>
                  <a
                    href={pergunta.fonte.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-dark hover:underline dark:text-brand-light"
                  >
                    {pergunta.fonte.label}
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="primary" size="lg" onClick={seguinte}>
                {ultimaPergunta ? "Ver resultado" : "Seguinte"}
                <ArrowRight size={16} />
              </Button>
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
                ? "w-5 bg-brand"
                : i < indice
                ? "w-1.5 bg-brand/40"
                : "w-1.5 bg-stone-200 dark:bg-stone-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function opcaoClasses(estado: "default" | "correta" | "errada" | "apagada" | "eliminada"): string {
  const base = "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200";
  switch (estado) {
    case "correta":
      return `${base} border-brand bg-brand-light`;
    case "errada":
      return `${base} border-clay-border bg-clay-bg`;
    case "apagada":
      return `${base} border-stone-100 bg-stone-50 opacity-50 dark:border-stone-800 dark:bg-stone-900`;
    case "eliminada":
      return `${base} border-stone-100 bg-stone-50 opacity-30 line-through dark:border-stone-800 dark:bg-stone-900`;
    default:
      return `${base} border-stone-200 bg-white shadow-card hover:border-brand/40 hover:bg-brand-light/40 active:scale-[0.99] dark:border-stone-700 dark:bg-stone-900 dark:hover:border-brand/30`;
  }
}

function letraClasses(estado: "default" | "correta" | "errada" | "apagada" | "eliminada"): string {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold";
  switch (estado) {
    case "correta":
      return `${base} bg-brand text-white`;
    case "errada":
      return `${base} bg-clay text-white`;
    case "apagada":
    case "eliminada":
      return `${base} bg-stone-200 text-stone-400 dark:bg-stone-700 dark:text-stone-500`;
    default:
      return `${base} bg-cream text-brand-dark dark:bg-stone-800`;
  }
}
