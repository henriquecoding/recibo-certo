// ═══════════════════════════════════════════════════════════════════════
//  INSTANTÂNEOS — o que mudou desde a última análise
//  ---------------------------------------------------------------------
//  Pontos 18 e 41. Uma ferramenta de oportunidades que não guarda nada
//  responde sempre à mesma pergunta pela primeira vez. Com instantâneos,
//  passa a poder dizer «esta hipótese está a fortalecer-se» — que é uma
//  afirmação sobre o mundo, não sobre o algoritmo.
//
//  ── PRIVACIDADE ────────────────────────────────────────────────────
//  Nada disto sai do dispositivo, e nada é guardado sem a pessoa o pedir
//  (ponto 40). O instantâneo guarda a PONTUAÇÃO e a composição, não o
//  contexto: assim, comparar duas análises não obriga a conservar o
//  perfil — e o perfil é a parte identificadora.
// ═══════════════════════════════════════════════════════════════════════

import type { ResultadoDescoberta } from "../motor/pipeline";

export const INSTANTANEO_VERSAO = 1;

export interface LinhaInstantaneo {
  /**
   * A chave de comparação: `problema::modelo`.
   *
   * NÃO é o id do candidato. O id inclui a zona e a forma de entrega, e a
   * zona é parte do perfil — guardá-la aqui era conservar contexto num
   * ficheiro que promete não o conservar. A chave mais curta também é a
   * mais correta para comparar no tempo: a mesma hipótese continua a ser
   * a mesma quando a pessoa muda de presencial para híbrido.
   */
  candidatoId: string;
  titulo: string;
  pontuacao: number;
  fit: number;
  confianca: string;
  /** Quantas observações oficiais sustentavam esta leitura nesse dia. */
  observacoes: number;
}

export interface InstantaneoDescoberta {
  versao: typeof INSTANTANEO_VERSAO;
  /** ISO. É a data da análise, não a do build. */
  geradoEm: string;
  /** Quantas hipóteses foram compostas nessa execução. */
  hipoteses: number;
  linhas: readonly LinhaInstantaneo[];
}

export function comoInstantaneo(resultado: ResultadoDescoberta): InstantaneoDescoberta {
  return {
    versao: INSTANTANEO_VERSAO,
    geradoEm: resultado.geradoEm,
    hipoteses: resultado.telemetria.hipotesesGeradas,
    linhas: resultado.candidatos.map((item) => ({
      candidatoId: `${item.problema.id}::${item.modelo.id}`,
      titulo: item.titulo,
      pontuacao: item.pontuacaoGlobal,
      fit: item.fit,
      confianca: item.confianca.nivel,
      observacoes: item.evidencias.length,
    })),
  };
}

export type MovimentoLinha = "nova" | "subiu" | "desceu" | "igual" | "saiu";

export interface DiferencaAnalise {
  anterior: string;
  atual: string;
  novas: readonly LinhaInstantaneo[];
  subiram: readonly { linha: LinhaInstantaneo; delta: number }[];
  desceram: readonly { linha: LinhaInstantaneo; delta: number }[];
  sairam: readonly LinhaInstantaneo[];
}

/**
 * Compara duas análises.
 *
 * Uma pontuação que sobe pode significar duas coisas muito diferentes: o
 * mercado mudou, ou o contexto mudou. Esta função não sabe distinguir, e
 * por isso a interface tem de dizer qual dos dois — nunca apresentar uma
 * subida como se fosse notícia de mercado quando foi a pessoa a mudar de
 * resposta.
 */
export function compararAnalises(
  anterior: InstantaneoDescoberta,
  atual: InstantaneoDescoberta,
): DiferencaAnalise {
  const antes = new Map(anterior.linhas.map((linha) => [linha.candidatoId, linha]));
  const agora = new Map(atual.linhas.map((linha) => [linha.candidatoId, linha]));

  const novas = atual.linhas.filter((linha) => !antes.has(linha.candidatoId));
  const sairam = anterior.linhas.filter((linha) => !agora.has(linha.candidatoId));

  const subiram: { linha: LinhaInstantaneo; delta: number }[] = [];
  const desceram: { linha: LinhaInstantaneo; delta: number }[] = [];
  for (const linha of atual.linhas) {
    const anteriorLinha = antes.get(linha.candidatoId);
    if (!anteriorLinha) continue;
    const delta = linha.pontuacao - anteriorLinha.pontuacao;
    if (delta > 0) subiram.push({ linha, delta });
    else if (delta < 0) desceram.push({ linha, delta });
  }

  return {
    anterior: anterior.geradoEm,
    atual: atual.geradoEm,
    novas,
    subiram: subiram.sort((esquerda, direita) => direita.delta - esquerda.delta),
    desceram: desceram.sort((esquerda, direita) => esquerda.delta - direita.delta),
    sairam,
  };
}

/** A frase de abertura, só quando há mesmo alguma coisa a dizer. */
export function resumoDaDiferenca(diferenca: DiferencaAnalise): string | null {
  const partes: string[] = [];
  if (diferenca.novas.length > 0) {
    partes.push(`${diferenca.novas.length} ${diferenca.novas.length === 1 ? "hipótese nova" : "hipóteses novas"}`);
  }
  if (diferenca.subiram.length > 0) partes.push(`${diferenca.subiram.length} subiram`);
  if (diferenca.desceram.length > 0) partes.push(`${diferenca.desceram.length} perderam força`);
  if (diferenca.sairam.length > 0) partes.push(`${diferenca.sairam.length} deixaram de aparecer`);
  return partes.length === 0 ? null : partes.join(" · ");
}
