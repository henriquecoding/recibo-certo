// ═══════════════════════════════════════════════════════════════════════
//  O PIPELINE — e os números que ele publica são os que ele fez
//  ---------------------------------------------------------------------
//  Ponto 47: «Encontrámos 47 hipóteses · investigámos 18 · descartámos 11
//  · 7 passaram». Esses números só valem se vierem do sistema real, e é
//  isso que este ficheiro garante: cada etapa devolve a sua contagem, e a
//  interface não pode escrever nenhum número que não venha daqui.
//
//  Ponto 53: os estados de progresso correspondem às etapas REAIS. Não há
//  animação de «a analisar riscos» sem uma etapa que analise riscos.
//
//  ── DETERMINISMO ───────────────────────────────────────────────────
//  O mesmo contexto e o mesmo pack de evidência produzem exatamente o
//  mesmo resultado, incluindo a ordem. Há um teste que o obriga. É o que
//  torna possível comparar duas análises no tempo e dizer «esta subiu».
// ═══════════════════════════════════════════════════════════════════════

import type { MarketPilotEvidence } from "@/lib/negocio/market/opportunities";
import type { OpportunityContext } from "../contexto/tipos";
import type { Evidencia, LacunaDeEvidencia } from "../proveniencia";
import { avaliarConfianca } from "./confianca";
import { deduplicar, destaques, diversificar, type Destaque } from "./diversidade";
import { explicar } from "./explicacao";
import { calcularFit } from "./fit";
import { generateCandidates, type CandidatoBruto } from "./gerador";
import { buildResearchPlan, type PlanoDeInvestigacao } from "./planeador";
import { avaliarProcura } from "./procura";
import { avaliarRegulacao } from "./regulacao";
import { aplicarRestricoes } from "./restricoes";
import { avaliarRiscos } from "./risco";
import { calcularScores, pontuacaoGlobal } from "./scoring";
import { correrStressTest } from "./stress";
import { planoDeValidacao } from "./validacao";
import { avaliarViabilidade } from "./viabilidade";
import type { CandidatoDescartado, OpportunityCandidate } from "./tipos";

// ── ETAPAS ───────────────────────────────────────────────────────────

export type EtapaPipeline =
  | "contexto"
  | "geracao"
  | "restricoes"
  | "evidencia"
  | "viabilidade"
  | "risco"
  | "scoring"
  | "stress"
  | "diversificacao";

export const ROTULO_ETAPA: Readonly<Record<EtapaPipeline, string>> = Object.freeze({
  contexto: "A compreender o teu contexto",
  geracao: "A compor hipóteses a partir do que sabes fazer",
  restricoes: "A eliminar o que não respeita as tuas restrições",
  evidencia: "A procurar sinais oficiais de mercado",
  viabilidade: "A estimar capital e tempo até à primeira receita",
  risco: "A avaliar riscos e requisitos",
  scoring: "A pontuar cada dimensão em separado",
  stress: "A tentar destruir as melhores hipóteses",
  diversificacao: "A escolher resultados que não sejam todos iguais",
});

export interface ContagemEtapa {
  etapa: EtapaPipeline;
  /** Quantos itens entraram nesta etapa. */
  entraram: number;
  /** Quantos sobreviveram. */
  sairam: number;
}

export interface TelemetriaDescoberta {
  etapas: readonly ContagemEtapa[];
  combinacoesConsideradas: number;
  hipotesesGeradas: number;
  descartadasPorRestricao: number;
  descartadasPorDuplicacao: number;
  aprovadas: number;
  /** Observações oficiais realmente lidas, sem contar duas vezes. */
  observacoesUsadas: number;
  /** Fontes distintas por trás dessas observações. */
  fontesDistintas: number;
  /** Consultas que o planeador diz serem necessárias e não estão ligadas. */
  consultasPorLigar: number;
  /** Capacidades que a pessoa alcançaria com um meio que declarou não ter. */
  bloqueadasPorAtivo: number;
}

export interface ResultadoDescoberta {
  candidatos: readonly OpportunityCandidate[];
  descartados: readonly CandidatoDescartado[];
  destaques: readonly Destaque[];
  planos: ReadonlyMap<string, PlanoDeInvestigacao>;
  telemetria: TelemetriaDescoberta;
  /** Instante de referência da análise. Entra nos instantâneos. */
  geradoEm: string;
}

export interface OpcoesDescoberta {
  evidencia?: readonly MarketPilotEvidence[];
  /** Quantos candidatos apresentar. O resto continua a existir. */
  limite?: number;
  /** Incluir hipóteses que exigiriam um meio que a pessoa não tem. */
  incluirForaDePerfil?: boolean;
  agora?: () => string;
}

/**
 * Corre o motor inteiro.
 *
 * Síncrono e puro: não faz rede, não lê o relógio a meio, não depende do
 * browser. A evidência entra como argumento — quem a foi buscar foi o
 * pack público, que já existia e não muda.
 */
export function descobrir(
  contexto: OpportunityContext,
  opcoes: OpcoesDescoberta = {},
): ResultadoDescoberta {
  const {
    evidencia = [],
    limite = 12,
    incluirForaDePerfil = false,
    agora = () => new Date().toISOString(),
  } = opcoes;

  const etapas: ContagemEtapa[] = [];
  const evidencePorTemplate = new Map(evidencia.map((item) => [item.templateId, item]));

  // ── 1. Geração ────────────────────────────────────────────────────
  const geracao = generateCandidates(contexto, { incluirForaDePerfil });
  etapas.push({
    etapa: "geracao",
    entraram: geracao.combinacoesConsideradas,
    sairam: geracao.candidatos.length,
  });

  // ── 2. Restrições ─────────────────────────────────────────────────
  const restricoes = aplicarRestricoes(geracao.candidatos, contexto);
  etapas.push({
    etapa: "restricoes",
    entraram: geracao.candidatos.length,
    sairam: restricoes.aprovados.length,
  });

  // ── 3–7. Avaliação, candidato a candidato ─────────────────────────
  const avaliados: OpportunityCandidate[] = [];
  const planos = new Map<string, PlanoDeInvestigacao>();
  const observacoesVistas = new Set<string>();
  const fontesVistas = new Set<string>();
  let consultasPorLigar = 0;

  for (const bruto of restricoes.aprovados) {
    const regulacao = avaliarRegulacao(bruto);
    const procura = avaliarProcura({ candidato: bruto, evidencePorTemplate });
    const viabilidade = avaliarViabilidade(bruto, contexto, regulacao.barreira);
    const riscos = avaliarRiscos(bruto, contexto, regulacao);
    const { total: fit, detalhe: fitDetalhe } = calcularFit(bruto, contexto);

    const scores = calcularScores({ candidato: bruto, contexto, fit, viabilidade, regulacao, procura, riscos });
    const objecoes = correrStressTest({ candidato: bruto, contexto, viabilidade, regulacao, procura, riscos });
    const confianca = avaliarConfianca(bruto, scores, procura, regulacao);
    const explicacao = explicar({ candidato: bruto, contexto, fitDetalhe, viabilidade, regulacao, procura, riscos, objecoes });
    const plano = buildResearchPlan(bruto);
    planos.set(bruto.id, plano);
    consultasPorLigar += plano.consultas.filter((consulta) => !consulta.ligada).length;

    for (const item of procura.evidencias) {
      observacoesVistas.add(item.id);
      fontesVistas.add(item.proveniencia.fonte);
    }

    const evidencias: readonly Evidencia[] = procura.evidencias;
    const lacunas: readonly LacunaDeEvidencia[] = procura.lacunas;

    avaliados.push({
      id: bruto.id,
      titulo: bruto.titulo,
      promessa: bruto.promessa,
      problema: bruto.problema,
      modelo: bruto.modelo,
      entrega: bruto.entrega,
      regiao: bruto.regiao,
      setor: bruto.problema.setor,
      mercado: bruto.problema.mercado,
      naturezas: bruto.problema.naturezas,
      padraoReceita: bruto.modelo.padrao,
      cenarioPreco: bruto.modelo.cenarioPreco,
      capacidadesUsadas: bruto.capacidades.map((item) => item.capacidade),
      seedTemplateId: bruto.seedTemplateId,
      fit,
      fitDetalhe,
      viabilidade,
      regulacao,
      procura,
      riscos,
      scores,
      pontuacaoGlobal: pontuacaoGlobal(scores),
      confianca,
      objecoes,
      explicacao,
      validacao: planoDeValidacao(bruto),
      evidencias,
      lacunas,
    });
  }

  etapas.push({ etapa: "evidencia", entraram: avaliados.length, sairam: observacoesVistas.size });
  etapas.push({ etapa: "viabilidade", entraram: avaliados.length, sairam: avaliados.length });
  etapas.push({ etapa: "risco", entraram: avaliados.length, sairam: avaliados.length });
  etapas.push({ etapa: "scoring", entraram: avaliados.length, sairam: avaliados.length });
  etapas.push({
    etapa: "stress",
    entraram: avaliados.length,
    sairam: avaliados.filter((item) => !item.objecoes.some((objecao) => objecao.fatal && objecao.procede)).length,
  });

  // ── 8. Deduplicação e diversificação ──────────────────────────────
  const dedup = deduplicar(avaliados);
  const ordenados = diversificar(dedup.candidatos, { limite });
  etapas.push({
    etapa: "diversificacao",
    entraram: dedup.candidatos.length,
    sairam: ordenados.length,
  });

  const descartados = [...restricoes.descartados, ...dedup.descartados];

  return {
    candidatos: ordenados,
    descartados,
    destaques: destaques(ordenados),
    planos,
    geradoEm: agora(),
    telemetria: {
      etapas,
      combinacoesConsideradas: geracao.combinacoesConsideradas,
      hipotesesGeradas: geracao.candidatos.length,
      descartadasPorRestricao: restricoes.descartados.length,
      descartadasPorDuplicacao: dedup.descartados.length,
      aprovadas: dedup.candidatos.length,
      observacoesUsadas: observacoesVistas.size,
      fontesDistintas: fontesVistas.size,
      consultasPorLigar,
      bloqueadasPorAtivo: geracao.capacidadesBloqueadasPorAtivo.length,
    },
  };
}

/**
 * A frase que resume o trabalho do motor, com os números REAIS.
 *
 * Devolve `null` quando não há nada de honesto a dizer — em vez de uma
 * frase de impacto com números inventados, que é o que o ponto 47 proíbe
 * expressamente.
 */
export function resumoDoTrabalho(telemetria: TelemetriaDescoberta): string | null {
  if (telemetria.hipotesesGeradas === 0) return null;
  const partes = [
    `${telemetria.combinacoesConsideradas} combinações consideradas`,
    `${telemetria.hipotesesGeradas} hipóteses compostas`,
  ];
  if (telemetria.descartadasPorRestricao > 0) {
    partes.push(`${telemetria.descartadasPorRestricao} descartadas pelas tuas restrições`);
  }
  if (telemetria.observacoesUsadas > 0) {
    partes.push(
      `${telemetria.observacoesUsadas} leituras oficiais de ${telemetria.fontesDistintas} ${telemetria.fontesDistintas === 1 ? "fonte" : "fontes"}`,
    );
  }
  partes.push(`${telemetria.aprovadas} passaram os critérios`);
  return partes.join(" · ");
}
