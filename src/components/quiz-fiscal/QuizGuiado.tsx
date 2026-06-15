"use client";

import QuizBookShell from "./QuizBookShell";
import type { OpcaoEstado } from "./QuizBookShell";
import type { UseQuizFiscalReturn } from "@/hooks/useQuizFiscal";

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

  return (
    <QuizBookShell
      categoriaAtiva={config?.categoria}
      indice={indice}
      total={sessao.length}
      pergunta={pergunta.pergunta}
      opcoes={opcoes}
      opcaoEstados={opcaoEstados}
      onOpcaoClick={selecionarOpcao}
      respondida={respondida}
      acertou={acertou}
      vantagens={vantagens}
      modo="guiado"
      onEliminar2={usarEliminar2}
      onDica={usarDica}
      onTempoExtra={usarTempoExtra}
      onExplicacao={usarExplicacao}
      dicaVisivel={dicaVisivel}
      legalBasis={pergunta.legalBasis}
      mostrarExplicacao={mostrarExplicacao}
      explicacaoCorreta={mostrarExplicacao ? opcoes[correta].porque : undefined}
      explicacoesErradas={explicacoesErradas}
      fonteLabel={pergunta.fonte.label}
      fonteUrl={pergunta.fonte.url}
      onSeguinte={seguinte}
      onSair={onSair}
      ultimaPergunta={indice === sessao.length - 1}
      podeConfirmar={selecionada !== null}
      onConfirmar={confirmarResposta}
      acertosAteAgora={acertosAteAgora}
      errosAteAgora={errosAteAgora}
      vantagensUsadas={vantagensUsadas}
    />
  );
}
