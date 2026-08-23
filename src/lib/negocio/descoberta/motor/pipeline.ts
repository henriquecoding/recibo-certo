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
import type { PackOferta } from "@/lib/negocio/market/oferta";
import { ATIVOS } from "../contexto/perguntas";
import { CAPACIDADES } from "../conhecimento/dados/capacidades";
import { COMPETENCIA_POR_ID } from "../conhecimento/dados/competencias";
import type { AtivoId, OpportunityContext } from "../contexto/tipos";
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
  /**
   * O que está a impedir o motor de compor mais — por meio em falta.
   *
   * Existe sempre, e não só quando o resultado é vazio: alguém com três
   * hipóteses e uma carrinha por declarar merece saber que a carrinha
   * abre mais nove tanto quanto quem tem zero.
   */
  bloqueiosPorMeio: readonly BloqueioPorMeio[];
  /** Preenchido só quando não há candidatos. `null` quando há. */
  diagnosticoVazio: DiagnosticoVazio | null;
  telemetria: TelemetriaDescoberta;
  /** Instante de referência da análise. Entra nos instantâneos. */
  geradoEm: string;
}

/**
 * O que impede o motor de compor mais — e quanto custa destrancar.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ O DEFEITO QUE ISTO CORRIGE, MEDIDO                                  │
 * │                                                                    │
 * │ Quinze das vinte e cinco capacidades exigem um meio declarado, e   │
 * │ dez delas exigem «computador» ou «ferramentas» — coisas que quase  │
 * │ toda a gente tem e ninguém se lembra de declarar. Resultado: DOZE  │
 * │ das vinte e duas competências, escolhidas sozinhas, geravam ZERO   │
 * │ hipóteses, e o ecrã respondia «nada passou os critérios · abre o   │
 * │ que descartámos» — um painel que nesse estado não existe, porque   │
 * │ não houve descarte nenhum: não houve geração.                      │
 * │                                                                    │
 * │ O motor sempre soube o que faltava (`capacidadesBloqueadasPorAtivo`│
 * │ está lá desde o início). Só o deitava fora antes de chegar ao ecrã.│
 * │                                                                    │
 * │ ── DUAS REGRAS QUE ISTO TEM DE RESPEITAR ─────────────────────────│
 * │  1. Agrupa pelo CONJUNTO de meios em falta, não meio a meio. Uma  │
 * │     intervenção elétrica exige ferramentas E equipamento técnico;  │
 * │     prometer que só as ferramentas destrancam alguma coisa seria   │
 * │     mentira, e foi o que a primeira versão fez.                    │
 * │  2. Conta o que a pessoa VAI VER, não o que o gerador produz. O    │
 * │     gerador produzia 2 e o ecrã mostrava 1 — a deduplicação e a    │
 * │     diversificação vêm depois. Um número ao lado de «declara isto» │
 * │     tem de ser o número que aparece depois de declarar.            │
 * └────────────────────────────────────────────────────────────────────┘
 */
export interface BloqueioPorMeio {
  /** Os meios que têm de existir, todos, para isto destrancar. */
  ativos: readonly AtivoId[];
  /** Como se chamam na lista «Meios que já tens». */
  rotulos: readonly string[];
  /** As capacidades que este conjunto destranca. */
  capacidades: readonly string[];
  /** Hipóteses que a pessoa passa a ver. Contado a correr o motor. */
  hipotesesQueAbriria: number;
}

/**
 * Porque é que não saiu nada — dito com precisão, e só quando é verdade.
 *
 * Havia três causas possíveis para um resultado vazio e o ecrã dava a
 * mesma frase às três, a mandar abrir um painel que em duas delas não
 * existe. São problemas diferentes e têm saídas diferentes:
 *
 *  · `meios-em-falta`  — o grafo tem o que fazer, falta declarar a
 *    ferramenta. É a causa de doze das vinte e duas competências.
 *  · `competencia-de-apoio` — a competência declarada reforça outras e
 *    não sustenta um negócio sozinha (é o caso das línguas, que aparecem
 *    sempre como competência ÚTIL e nunca como necessária). Não é uma
 *    falha: é o grafo a dizer a verdade, e a interface tem de a passar.
 *  · `restricoes` — houve hipóteses e as recusas declaradas apagaram-nas
 *    todas. Aí sim, «o que descartámos» tem o que mostrar.
 */
export type DiagnosticoVazio =
  | { tipo: "meios-em-falta" }
  | { tipo: "competencia-de-apoio"; competencias: readonly string[] }
  | { tipo: "restricoes"; quantas: number }
  | { tipo: "sem-causa-identificada" };

export interface OpcoesDescoberta {
  evidencia?: readonly MarketPilotEvidence[];
  /**
   * Contagem de operadores por divisão da CAE, do INE.
   *
   * Opcional de propósito: o motor tem de correr sem ela — e correu
   * sempre — devolvendo «lacuna por apurar». Torná-la obrigatória faria
   * uma falha de rede apagar a análise inteira.
   */
  oferta?: PackOferta;
  /** Quantos candidatos apresentar. O resto continua a existir. */
  limite?: number;
  /** Incluir hipóteses que exigiriam um meio que a pessoa não tem. */
  incluirForaDePerfil?: boolean;
  agora?: () => string;
  /**
   * Travão de recursão. Calcular os bloqueios exige correr o motor outra
   * vez com o meio acrescentado; essa passagem não volta a calculá-los.
   * Interno — não faz parte da API de quem chama de fora.
   */
  semBloqueios?: boolean;
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
    semBloqueios = false,
    oferta,
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
    const procura = avaliarProcura({ candidato: bruto, evidencePorTemplate, oferta });
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
    bloqueiosPorMeio:
      semBloqueios || incluirForaDePerfil
        ? []
        : bloqueiosPorMeio(contexto, geracao.capacidadesBloqueadasPorAtivo, ordenados.length, {
            evidencia,
            limite,
            oferta,
          }),
    diagnosticoVazio:
      ordenados.length > 0
        ? null
        : diagnosticar(contexto, geracao.capacidadesBloqueadasPorAtivo.length, restricoes.descartados.length),
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
 * A causa de um resultado vazio, na ordem em que é acionável.
 *
 * A ordem não é arbitrária: primeiro o que a pessoa resolve com um clique
 * (declarar um meio), depois o que exige responder outra pergunta, e só
 * no fim o que exige rever as recusas.
 */
function diagnosticar(
  contexto: OpportunityContext,
  bloqueadas: number,
  descartadas: number,
): DiagnosticoVazio {
  if (bloqueadas > 0) return { tipo: "meios-em-falta" };
  if (descartadas > 0) return { tipo: "restricoes", quantas: descartadas };

  // Uma competência que o grafo só conhece como reforço de outras nunca
  // alcança capacidade nenhuma sozinha. Dizer «nada passou os critérios»
  // a quem escolheu «Línguas estrangeiras» é verdade e não é resposta.
  const declaradas = contexto.competencias.map((item) => item.id);
  const soDeApoio = declaradas.filter(
    (id) =>
      !CAPACIDADES.some((capacidade) => capacidade.competenciasNecessarias.includes(id)) &&
      CAPACIDADES.some((capacidade) => capacidade.competenciasUteis.includes(id)),
  );
  if (soDeApoio.length > 0 && soDeApoio.length === declaradas.length) {
    return {
      tipo: "competencia-de-apoio",
      competencias: soDeApoio.map(
        (id) => COMPETENCIA_POR_ID.get(id)?.rotulo ?? id,
      ),
    };
  }

  return { tipo: "sem-causa-identificada" };
}

/**
 * Agrupa os bloqueios pelo CONJUNTO de meios em falta e conta, a sério,
 * quantas hipóteses cada conjunto destranca.
 *
 * A conta corre o motor inteiro com os meios acrescentados e subtrai o
 * que já havia. É mais caro do que estimar — e é a única forma de o
 * número ao lado de «declara isto» ser o mesmo que aparece a seguir.
 * O motor é puro e síncrono (dezenas de milissegundos para o grafo todo),
 * por isso o custo cabe no orçamento de uma análise.
 */
function bloqueiosPorMeio(
  contexto: OpportunityContext,
  bloqueadas: readonly { capacidade: { rotulo: string }; ativosEmFalta: readonly AtivoId[] }[],
  jaVisiveis: number,
  opcoes: { evidencia: readonly MarketPilotEvidence[]; limite: number; oferta?: PackOferta },
): readonly BloqueioPorMeio[] {
  if (bloqueadas.length === 0) return [];

  // A chave é o conjunto ordenado — «ferramentas+equipamento-tecnico» é
  // um bloqueio só, não dois meios bloqueios.
  const porConjunto = new Map<string, { ativos: AtivoId[]; capacidades: string[] }>();
  for (const bloqueada of bloqueadas) {
    if (bloqueada.ativosEmFalta.length === 0) continue;
    const ativos = [...bloqueada.ativosEmFalta].sort();
    const chave = ativos.join("+");
    const entrada = porConjunto.get(chave) ?? { ativos, capacidades: [] };
    entrada.capacidades.push(bloqueada.capacidade.rotulo);
    porConjunto.set(chave, entrada);
  }

  const resultado: BloqueioPorMeio[] = [];
  for (const { ativos, capacidades } of porConjunto.values()) {
    const comEstes = descobrir(
      { ...contexto, ativos: [...contexto.ativos, ...ativos] },
      { ...opcoes, semBloqueios: true },
    );
    const abre = comEstes.candidatos.length - jaVisiveis;
    if (abre <= 0) continue;
    resultado.push({
      ativos,
      rotulos: ativos.map((id) => ATIVOS.find((item) => item.id === id)?.rotulo ?? id),
      capacidades,
      hipotesesQueAbriria: abre,
    });
  }

  // Primeiro o que mais destranca; depois o conjunto mais pequeno (pedir
  // um meio é mais barato do que pedir dois); o rótulo desempata, para a
  // ordem ser estável — o motor é determinístico e esta lista também.
  return resultado.sort(
    (esquerda, direita) =>
      direita.hipotesesQueAbriria - esquerda.hipotesesQueAbriria ||
      esquerda.ativos.length - direita.ativos.length ||
      esquerda.rotulos.join().localeCompare(direita.rotulos.join(), "pt-PT"),
  );
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
