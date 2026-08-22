// ═══════════════════════════════════════════════════════════════════════
//  SCORING — dez dimensões, pesos justificados, `null` que propaga
//  ---------------------------------------------------------------------
//  «92 % compatível contigo» sem explicação é o que este ficheiro existe
//  para não voltar a produzir. Cada dimensão nasce de uma coisa concreta,
//  tem um peso escrito com a razão ao lado, e a soma é auditável linha a
//  linha no ecrã.
//
//  ── AS TRÊS REGRAS ─────────────────────────────────────────────────
//   1. **`null` propaga.** Um eixo sem base para ser avaliado não vale
//      zero. Zero é uma afirmação sobre o mercado; ausência é uma
//      afirmação sobre nós. Um eixo `null` sai do denominador — e faz
//      descer a CONFIANÇA, que é onde deve doer.
//   2. **A confiança não multiplica o score.** `87 × 0,4 = 35` parece um
//      veredicto sobre o negócio e é um veredicto sobre os nossos dados.
//      As duas viajam lado a lado e nunca se misturam.
//   3. **Os pesos são discutíveis e estão num sítio só.** Mudar um exige
//      passar aqui e escrever porquê.
// ═══════════════════════════════════════════════════════════════════════

import type { AvaliacaoProcura, AvaliacaoRegulatoria, AvaliacaoViabilidade, OpportunityScore, RiscoAvaliado } from "./tipos";
import { riscosForaDaTolerancia } from "./risco";
import type { CandidatoBruto } from "./gerador";
import type { OpportunityContext } from "../contexto/tipos";

/**
 * Os pesos, e a razão de cada um.
 *
 * A soma dá 100 quando todas as dimensões existem. Quando alguma é
 * `null`, o peso dela sai do denominador e as outras crescem
 * proporcionalmente — em vez de a ausência ser contada como zero.
 */
export const PESOS_SCORE = Object.freeze({
  /** O maior. Uma oportunidade que a pessoa não consegue executar não é uma. */
  fitPessoal: 26,
  /** Sem procura não há negócio, por melhor que seja o resto. */
  procura: 14,
  /** Procura sem lacuna é um mercado servido. Pesa menos porque hoje raramente é apurável. */
  lacunaDeOferta: 8,
  /** Cabe no capital e no prazo declarados? É o que decide se chega a começar. */
  economia: 14,
  /** Tempo, equipa e meios — a diferença entre poder e conseguir. */
  exequibilidade: 10,
  /** Uma barreira regulatória alta não é só custo: é tempo antes da primeira venda. */
  regulacao: 8,
  /** Risco acima da tolerância DECLARADA, não risco em abstrato. */
  risco: 8,
  /** O problema existe onde a pessoa está? */
  geografia: 6,
  /** Quanta da análise assenta em observação e não em estrutura. */
  qualidadeDaEvidencia: 4,
  /** Dados velhos valem menos do que dados recentes. */
  frescura: 2,
});

const SOMA_PESOS = Object.values(PESOS_SCORE).reduce((total, peso) => total + peso, 0);

export interface EntradaScore {
  candidato: CandidatoBruto;
  contexto: OpportunityContext;
  fit: number;
  viabilidade: AvaliacaoViabilidade;
  regulacao: AvaliacaoRegulatoria;
  procura: AvaliacaoProcura;
  riscos: readonly RiscoAvaliado[];
}

export function calcularScores(entrada: EntradaScore): OpportunityScore {
  const { candidato, contexto, fit, viabilidade, regulacao, procura, riscos } = entrada;

  // ── Procura ───────────────────────────────────────────────────────
  //  `null` quando nenhuma fonte pública mede este problema. Não é zero:
  //  zero diria «não há procura», e não sabemos isso.
  const observacoesDeProcura = procura.evidencias.filter(
    (item) => item.tipo === "procura" || item.tipo === "mercado",
  );
  const scoreProcura = !candidato.problema.procuraObservavel
    ? null
    : observacoesDeProcura.length === 0
      ? null
      : Math.min(100, 40 + observacoesDeProcura.length * 20);

  // ── Lacuna ────────────────────────────────────────────────────────
  //  Hoje é sempre `null`: o motor não tem um único sinal de oferta. Isto
  //  é honesto e é o ponto 44 — ausência de concorrentes não é lacuna.
  const scoreLacuna =
    procura.leitura === "desconhecida"
      ? null
      : procura.leitura === "procura-com-pouca-oferta"
        ? 90
        : procura.leitura === "procura-com-muita-oferta"
          ? 45
          : 15;

  // ── Economia ──────────────────────────────────────────────────────
  const cabe = [viabilidade.cabeNoCapital, viabilidade.cabeNoPrazo].filter(
    (item): item is boolean => item !== null,
  );
  const scoreEconomia =
    cabe.length === 0 ? null : Math.round((cabe.filter(Boolean).length / cabe.length) * 100);

  // ── Exequibilidade ────────────────────────────────────────────────
  //  Deriva do fit mas não é o fit: mede se o trabalho CABE, e não se
  //  agrada. Um eixo de tempo ou de meios em falta pesa aqui.
  const semMeios = candidato.capacidades.some((item) => item.ativosEmFalta.length > 0);
  const scoreExequibilidade = Math.max(
    0,
    Math.min(100, 100 - (semMeios ? 45 : 0) - (candidato.modelo.precisaEquipa ? 20 : 0)),
  );

  // ── Regulação ─────────────────────────────────────────────────────
  const scoreRegulacao = [100, 75, 45, 20][regulacao.barreira]!;

  // ── Risco ─────────────────────────────────────────────────────────
  const fora = riscosForaDaTolerancia(riscos);
  const scoreRisco = Math.max(0, 100 - fora * 18);

  // ── Geografia ─────────────────────────────────────────────────────
  const nacional = candidato.problema.regioes.includes("portugal");
  const zonaFixada = contexto.localizacao.regiao !== "portugal";
  const scoreGeografia = nacional ? (zonaFixada ? 100 : 80) : zonaFixada ? 100 : 50;

  // ── Qualidade da evidência ────────────────────────────────────────
  const observadas = procura.evidencias.length;
  const scoreEvidencia = Math.min(100, observadas * 22);

  // ── Frescura ──────────────────────────────────────────────────────
  //  A frescura das observações do pack já foi verificada pelo gate do
  //  motor de mercado; aqui só se regista se existe alguma coisa cuja
  //  frescura faça sentido avaliar.
  const scoreFrescura = observadas === 0 ? null : 100;

  return {
    fitPessoal: fit,
    procura: scoreProcura,
    lacunaDeOferta: scoreLacuna,
    economia: scoreEconomia,
    exequibilidade: scoreExequibilidade,
    regulacao: scoreRegulacao,
    risco: scoreRisco,
    geografia: scoreGeografia,
    qualidadeDaEvidencia: scoreEvidencia,
    frescura: scoreFrescura,
  };
}

/**
 * A pontuação global — média ponderada que IGNORA as dimensões `null`.
 *
 * Ignorar é deliberado. Contar `null` como zero puniria uma hipótese por
 * nós não termos dados sobre ela, que é a definição de castigar o
 * mensageiro. A ausência aparece na confiança, e é lá que a pessoa a lê.
 */
export function pontuacaoGlobal(scores: OpportunityScore): number {
  let soma = 0;
  let pesoUsado = 0;
  for (const [chave, peso] of Object.entries(PESOS_SCORE) as [keyof OpportunityScore, number][]) {
    const valor = scores[chave];
    if (valor === null) continue;
    soma += valor * peso;
    pesoUsado += peso;
  }
  return pesoUsado === 0 ? 0 : Math.round(soma / pesoUsado);
}

/** Que fração do peso total tinha base para ser avaliada. Alimenta a confiança. */
export function cobertura(scores: OpportunityScore): number {
  let pesoUsado = 0;
  for (const [chave, peso] of Object.entries(PESOS_SCORE) as [keyof OpportunityScore, number][]) {
    if (scores[chave] !== null) pesoUsado += peso;
  }
  return pesoUsado / SOMA_PESOS;
}

export const ROTULO_DIMENSAO: Readonly<Record<keyof OpportunityScore, string>> = Object.freeze({
  fitPessoal: "Compatibilidade contigo",
  procura: "Procura",
  lacunaDeOferta: "Lacuna de oferta",
  economia: "Cabe no capital e no prazo",
  exequibilidade: "Exequibilidade",
  regulacao: "Barreira regulatória",
  risco: "Risco dentro da tua tolerância",
  geografia: "Adequação geográfica",
  qualidadeDaEvidencia: "Força das evidências",
  frescura: "Atualidade dos dados",
});
