"use client";

import type { OpcaoEstado } from "./QuizBookShell";
import type { UseQuizFiscalReturn } from "@/hooks/useQuizFiscal";
import type { QuizProgressoProps } from "./QuizFiscalApp";
import { TIMER_NORMAL_SEGUNDOS } from "@/hooks/useQuizFiscal";
import QuizDesktop from "./QuizDesktop";
import QuizMobile from "./QuizMobile";

const LETRAS = ["A", "B", "C", "D"];

interface QuizNormalProps {
  quiz: UseQuizFiscalReturn;
  progresso: QuizProgressoProps;
  onSair: () => void;
}

export default function QuizNormal({ quiz, progresso, onSair }: QuizNormalProps) {
  const {
    atual, indice, sessao, selecionada, respondida, tempoRestante,
    responderNormal, vantagens, eliminadas, dicaVisivel,
    mostrarExplicacao, verExplicacaoAtiva, seguinte, respostas,
    usarEliminar2, usarDica, usarTempoExtra, usarExplicacao,
    usarPular, usarDobrar, usarSegundaChance, usarEscudo,
    config, pontosAtuais, streakAtual,
  } = quiz;
  if (!atual) return null;

  const { pergunta, opcoes, correta } = atual;
  const acertou = respondida ? selecionada === correta : null;

  const opcaoEstados: OpcaoEstado[] = opcoes.map((_, idx) => {
    if (eliminadas.includes(idx) && !respondida) return "eliminada";
    if (!respondida) return "default";
    if (idx === correta) return "correta";
    if (idx === selecionada) return "errada";
    return "apagada";
  });

  const acertosAteAgora = respostas.filter((r) => r.acertou).length;
  const errosAteAgora = respostas.filter((r) => !r.acertou).length;
  const vantagensUsadas = Object.values(vantagens).filter(Boolean).length;
  const shouldShowExplanation = mostrarExplicacao && verExplicacaoAtiva && respondida;

  const explicacoesErradas = shouldShowExplanation
    ? opcoes
        .map((o, i) => ({ letra: LETRAS[i], texto: o.texto, porque: o.porque, idx: i }))
        .filter((o) => o.idx !== correta)
    : undefined;

  const sharedProps = {
    categoriaAtiva: config?.categoria,
    indice,
    total: sessao.length,
    pergunta: pergunta.pergunta,
    opcoes,
    opcaoEstados,
    onOpcaoClick: responderNormal,
    respondida,
    acertou,
    tempoRestante,
    tempoTotal: TIMER_NORMAL_SEGUNDOS,
    vantagens,
    modo: "normal" as const,
    onEliminar2: usarEliminar2,
    onDica: usarDica,
    onTempoExtra: usarTempoExtra,
    onExplicacao: usarExplicacao,
    onPular: usarPular,
    onDobrar: usarDobrar,
    onSegundaChance: usarSegundaChance,
    onEscudo: usarEscudo,
    dicaVisivel,
    legalBasis: pergunta.legalBasis,
    mostrarExplicacao: shouldShowExplanation,
    explicacaoCorreta: shouldShowExplanation ? opcoes[correta].porque : undefined,
    explicacoesErradas,
    fonteLabel: pergunta.fonte.label,
    fonteUrl: pergunta.fonte.url,
    onSeguinte: seguinte,
    onSair,
    ultimaPergunta: indice === sessao.length - 1,
    acertosAteAgora,
    errosAteAgora,
    vantagensUsadas,
    pontosAtuais,
    streakAtual,
    progresso,
  };

  return (
    <>
      <div className="hidden md:block">
        <QuizDesktop {...sharedProps} />
      </div>
      <div className="block md:hidden">
        <QuizMobile {...sharedProps} />
      </div>
    </>
  );
}
