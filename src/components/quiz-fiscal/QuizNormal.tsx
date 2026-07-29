"use client";

import type { OpcaoEstado } from "./tipos";
import type { SelecaoDiagnostico } from "@/lib/quiz-fiscal";
import type { UseQuizFiscalReturn } from "@/hooks/useQuizFiscal";
import type { QuizProgressoProps } from "./QuizFiscalApp";
import { TIMER_NORMAL_SEGUNDOS } from "@/hooks/useQuizFiscal";
import Quiz from "./Quiz";

const LETRAS = ["A", "B", "C", "D"];

interface QuizNormalProps {
  quiz: UseQuizFiscalReturn;
  progresso: QuizProgressoProps;
  onSair: () => void;
}

/**
 * Frase curta a explicar o que a seleção teve de ceder para encher a sessão.
 * `null` quando correu tudo como pedido — que é o caso normal.
 */
function descreverCedencia(d: SelecaoDiagnostico | null): string | undefined {
  if (!d) return undefined;
  const partes: string[] = [];
  if (d.outraDificuldade > 0) {
    partes.push(
      `${d.outraDificuldade} ${d.outraDificuldade === 1 ? "pergunta" : "perguntas"} de outra dificuldade`,
    );
  }
  if (d.repetidas > 0) {
    partes.push(`${d.repetidas} que já tinhas visto`);
  }
  if (d.foraDaCategoria > 0) {
    partes.push(
      `${d.foraDaCategoria} de outras categorias`,
    );
  }
  if (partes.length === 0) return undefined;
  return `Esta categoria não tinha perguntas suficientes: incluímos ${partes.join(", ")}.`;
}

export default function QuizNormal({ quiz, progresso, onSair }: QuizNormalProps) {
  const {
    atual, indice, sessao, selecionada, respondida, tempoRestante,
    responderNormal, vantagens, eliminadas, dicaVisivel,
    mostrarExplicacao, verExplicacaoAtiva, seguinte, respostas,
    usarEliminar2, usarDica, usarTempoExtra, usarExplicacao,
    usarPular, usarDobrar, usarSegundaChance, usarEscudo,
    config, pontosAtuais, streakAtual, diagnosticoSelecao,
  } = quiz;
  if (!atual) return null;

  // Pedir «Difícil» e receber perguntas fáceis, ou pedir uma categoria e
  // receber outra, nunca era comunicado. Se a seleção teve de ceder alguma
  // coisa para encher a sessão, diz-se — uma vez, sem alarme.
  const avisoSelecao = descreverCedencia(diagnosticoSelecao);

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
  const shouldShowExplanation =
    mostrarExplicacao && respondida && (verExplicacaoAtiva || !!config?.explicacoesAutomaticas);

  const explicacoesErradas = shouldShowExplanation
    ? opcoes
        .map((o, i) => ({ letra: LETRAS[i], texto: o.texto, porque: o.porque, idx: i }))
        .filter((o) => o.idx !== correta)
    : undefined;

  const sharedProps = {
    categoriaAtiva: config?.categoria,
    perguntaId: pergunta.id,
    perguntaTexto: pergunta.pergunta,
    categoriaPergunta: pergunta.categoria,
    indice,
    total: sessao.length,
    pergunta: pergunta.pergunta,
    opcoes,
    opcaoEstados,
    onOpcaoClick: responderNormal,
    respondida,
    acertou,
    tempoRestante,
    // O total mostrado na barra tem de ser o tempo REALMENTE em uso, não o
    // default: com 60s escolhidos e 20 aqui, a barra esvaziava-se a um terço.
    tempoTotal: config?.tempoPorPergunta ?? TIMER_NORMAL_SEGUNDOS,
    avisoSelecao,
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

  return <Quiz {...sharedProps} />;
}
