// ═══════════════════════════════════════════════════════════════════════
//  AS PERGUNTAS — o que transforma prosa em enquadramento
//  ---------------------------------------------------------------------
//  Cada Guia declara em que situações se aplica (`aplicaSe`) e em que
//  situações não (`naoAplicaSe`). São 462 critérios em 169 guias, já
//  escritos, já revistos — e até aqui só serviam para o leitor decidir
//  sozinho se estava no sítio certo.
//
//  Este módulo converte cada critério numa pergunta de três estados. É a
//  peça mais barata do motor e a que mais trabalho poupa do outro lado: o
//  contabilista deixa de começar a conversa por «e o teu caso é qual?».
//
//  TRÊS DECISÕES, COM MOTIVO
//
//   1. «NÃO SEI» É A RESPOSTA POR OMISSÃO, e não é um erro. É o sinal mais
//      útil que o dossiê transporta — é por aí que a consulta começa. Um
//      formulário que obriga a escolher produz respostas inventadas, e uma
//      resposta inventada é pior do que nenhuma porque parece informação.
//
//   2. UM «EXCLUI» RESPONDIDO «SIM» NÃO BLOQUEIA O ENVIO. Mostra um aviso e
//      sugere o guia certo. Bloquear seria fingir que o critério é
//      decisivo, e há casos em que não é — a fronteira entre dois guias é
//      editorial, não legal.
//
//   3. AS AFIRMAÇÕES `review_required` NÃO VIRAM PERGUNTAS AO CLIENTE. São
//      técnicas, assustam e não resolvem. Vão para a secção `julgamento`,
//      que é escrita para o profissional.
// ═══════════════════════════════════════════════════════════════════════

import type { PerguntaDeGuia, RespostaPergunta } from "./tipos";

/** Quantos critérios de cada sentido entram. Ver a nota em `perguntasDoGuia`. */
export const MAXIMO_POR_SENTIDO = 8;

/**
 * As perguntas de um guia, na ordem em que a página as mostra.
 *
 * Os `aplicaSe` vêm primeiro porque é assim que a pessoa lê o guia — e
 * porque confirmar é mais fácil do que excluir. Os identificadores são
 * posicionais (`aplica.0`, `nao-aplica.2`) e estáveis enquanto o texto do
 * guia não mudar; quando muda, muda também a `impressao` do dossiê, que é
 * exatamente o que se quer que aconteça.
 */
export function perguntasDoGuia(
  aplicaSe: readonly string[],
  naoAplicaSe: readonly string[],
): PerguntaDeGuia[] {
  const monta = (
    lista: readonly string[],
    sentido: PerguntaDeGuia["sentido"],
    prefixo: string,
  ): PerguntaDeGuia[] =>
    lista
      .slice(0, MAXIMO_POR_SENTIDO)
      .map((texto, i) => ({
        id: `${prefixo}.${i}`,
        texto,
        sentido,
        resposta: "nao_sei" as RespostaPergunta,
      }));

  return [
    ...monta(aplicaSe, "confirma", "aplica"),
    ...monta(naoAplicaSe, "exclui", "nao-aplica"),
  ];
}

/** As respostas que a pessoa deu, indexadas por `PerguntaDeGuia.id`. */
export type RespostasDeGuia = Record<string, RespostaPergunta>;

/** Aplica as respostas guardadas a um conjunto de perguntas. */
export function comRespostas(
  perguntas: readonly PerguntaDeGuia[],
  respostas: RespostasDeGuia,
): PerguntaDeGuia[] {
  return perguntas.map((p) => ({ ...p, resposta: respostas[p.id] ?? p.resposta }));
}

/**
 * As perguntas que ficaram por responder.
 *
 * Não é uma lista de pendências para envergonhar ninguém: é a agenda da
 * primeira pergunta do profissional, e o §6.1 mostra-a no resumo («3
 * perguntas em "não sei"»).
 */
export function porResponder(perguntas: readonly PerguntaDeGuia[]): PerguntaDeGuia[] {
  return perguntas.filter((p) => p.resposta === "nao_sei");
}

/**
 * Critérios de exclusão que a pessoa confirmou.
 *
 * Quando isto não é vazio, a folha de composição avisa — «este guia diz
 * que não se aplica a quem…; queres enviar na mesma?» — e sugere os guias
 * relacionados. Avisa; não impede.
 */
export function excluidosConfirmados(perguntas: readonly PerguntaDeGuia[]): PerguntaDeGuia[] {
  return perguntas.filter((p) => p.sentido === "exclui" && p.resposta === "sim");
}
