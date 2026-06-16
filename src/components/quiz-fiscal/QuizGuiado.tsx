"use client";

import type { OpcaoEstado } from "./QuizBookShell";
import type { UseQuizFiscalReturn } from "@/hooks/useQuizFiscal";
import QuizDesktop from "./QuizDesktop";
import QuizMobile from "./QuizMobile";

const LETRAS = ["A", "B", "C", "D"];

interface QuizGuiadoProps {
  quiz: UseQuizFiscalReturn;
  onSair: () => void;
}

export default function QuizGuiado({ quiz, onSair }: QuizGuiadoProps) {
  const {
    atual, indice, sessao, selecionada, respondida, mostrarExplicacao,
    selecionarOpcao, confirmarResposta, seguinte, respostas,
    vantagens, eliminadas, dicaVisivel,
    usarEliminar2, usarDica, usarTempoExtra, usarExplicacao,
    config,
  } = quiz;

  if (!atual) return null;

  const { pergunta, opcoes, correta } = atual;
  const acertou = respondida ? selecionada === correta : null;

  const opcaoEstados: OpcaoEstado[] = opcoes.map((_, idx) => {
    if (eliminadas.includes(idx) && !respondida) return "eliminada";
    if (!respondida) return idx === selecionada ? "selecionada" : "default";
    if (idx === correta) return "correta";
    if (idx === selecionada) return "errada";
    return "apagada";
  });

  const acertosAteAgora = respostas.filter((r) => r.acertou).length;
  const errosAteAgora = respostas.filter((r) => !r.acertou).length;
  const vantagensUsadas = [vantagens.eliminar2, vantagens.dica, vantagens.tempoExtra, vantagens.explicacao].filter(Boolean).length;

  const explicacoesErradas = mostrarExplicacao
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
    onOpcaoClick: selecionarOpcao,
    respondida,
    acertou,
    vantagens,
    modo: "guiado" as const,
    onEliminar2: usarEliminar2,
    onDica: usarDica,
    onTempoExtra: usarTempoExtra,
    onExplicacao: usarExplicacao,
    dicaVisivel,
    legalBasis: pergunta.legalBasis,
    mostrarExplicacao,
    explicacaoCorreta: mostrarExplicacao ? opcoes[correta].porque : undefined,
    explicacoesErradas,
    fonteLabel: pergunta.fonte.label,
    fonteUrl: pergunta.fonte.url,
    onSeguinte: seguinte,
    onSair,
    ultimaPergunta: indice === sessao.length - 1,
    podeConfirmar: selecionada !== null,
    onConfirmar: confirmarResposta,
    acertosAteAgora,
    errosAteAgora,
    vantagensUsadas,
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
