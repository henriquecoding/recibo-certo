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
import type { CapacidadeAlcancada } from "../conhecimento/grafo";
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
import { calcularScores, intervaloDePontuacao, pontuacaoGlobal } from "./scoring";
import { correrStressTest } from "./stress";
import { planoDeValidacao } from "./validacao";
import { avaliarViabilidade } from "./viabilidade";
import type { CandidatoDescartado, OpportunityCandidate } from "./tipos";
import { aplicarAprendizagem, type AjusteAprendido } from "../sessao/aprendizagem";
import type { FeedbackDescoberta, ModoSessao, SessaoDescoberta } from "../sessao/tipos";
import { calcularRelaxamentos, type Relaxamento } from "./relaxamento";

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
  | "personalizacao"
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
  personalizacao: "A respeitar o que disseste sobre os resultados",
  diversificacao: "A escolher resultados que não sejam todos iguais",
});

export interface ContagemEtapa {
  etapa: EtapaPipeline;
  /** Quantos itens entraram nesta etapa. */
  entraram: number;
  /** Quantos sobreviveram. */
  sairam: number;
  /**
   * O que está a ser contado.
   *
   * ┌──────────────────────────────────────────────────────────────┐
   * │ A etapa «evidência» era publicada como `entraram → sairam`    │
   * │ ao lado das outras, mas `entraram` eram CANDIDATOS e `sairam` │
   * │ eram OBSERVAÇÕES distintas. Numa corrida real: `17 → 3`, que  │
   * │ se lê como «catorze hipóteses foram eliminadas na procura de  │
   * │ evidência». Nenhuma foi. Duas unidades na mesma linha, sem    │
   * │ nada a assinalá-lo, é um número errado com ar de telemetria.  │
   * └──────────────────────────────────────────────────────────────┘
   */
  unidadeEntrada: "hipoteses" | "observacoes";
  unidadeSaida: "hipoteses" | "observacoes";
  /** `true` quando a etapa não filtra nada — só produz. */
  naoFiltra?: boolean;
}

export interface TelemetriaDescoberta {
  etapas: readonly ContagemEtapa[];
  combinacoesConsideradas: number;
  hipotesesGeradas: number;
  descartadasPorRestricao: number;
  descartadasPorDuplicacao: number;
  aprovadas: number;
  /** Quantas a diversificação escolheu mostrar. Nem sempre é `aprovadas`. */
  apresentadas: number;
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
  /**
   * Saídas medidas para um resultado vazio. Vazio quando há candidatos,
   * e TAMBÉM quando nenhuma mudança razoável abriria alguma coisa —
   * encher isto com opções que não funcionam seria a versão educada de
   * mentir. Ver `motor/relaxamento.ts`.
   */
  relaxamentos: readonly Relaxamento[];
  aprendizagem: {
    modo: ModoSessao;
    feedbackAplicado: number;
    excluidos: number;
    ocultosPorJaVistos: number;
    rejeitadosPelasEscolhas: number;
    totalElegiveis: number;
    haMais: boolean;
    ajustes: ReadonlyMap<string, AjusteAprendido>;
    decisoes: readonly FeedbackDescoberta[];
  };
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
  /** Cada linha é OU; linhas diferentes são E. */
  gruposAlternativos: readonly (readonly AtivoId[])[];
  rotulosAlternativos: readonly (readonly string[])[];
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
  | { tipo: "meios-inadequados" }
  | { tipo: "competencia-de-apoio"; competencias: readonly string[] }
  | { tipo: "restricoes"; quantas: number }
  | { tipo: "sessao-esgotada" }
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
  /** Preferências e recusas desta visita; nunca persistidas pelo motor. */
  sessao?: SessaoDescoberta;
  agora?: () => string;
  /**
   * Travão de recursão. Calcular os bloqueios exige correr o motor outra
   * vez com o meio acrescentado; essa passagem não volta a calculá-los.
   * Interno — não faz parte da API de quem chama de fora.
   */
  semBloqueios?: boolean;
  /**
   * O mesmo travão, para as relaxações: medir o efeito de uma exige
   * correr o motor com a mudança aplicada, e essa passagem não pode
   * voltar a medir relaxações.
   */
  semRelaxamentos?: boolean;
}

/**
 * Corre o motor inteiro.
 *
 * Síncrono e puro: não faz rede, não lê o relógio a meio, não depende do
 * browser. A evidência entra como argumento — quem a foi buscar foi o
 * pack público, que já existia e não muda.
 */
export function descobrir(contexto: OpportunityContext, opcoes: OpcoesDescoberta = {}): ResultadoDescoberta {
  const {
    evidencia = [],
    limite = 12,
    incluirForaDePerfil = false,
    agora = () => new Date().toISOString(),
    semBloqueios = false,
    semRelaxamentos = false,
    oferta,
    sessao,
  } = opcoes;

  const etapas: ContagemEtapa[] = [];
  const evidencePorTemplate = new Map(evidencia.map((item) => [item.templateId, item]));
  // Lido UMA vez: o pipeline é puro e não pode consultar o relógio a
  // meio, senão duas observações da mesma corrida teriam idades
  // diferentes e o determinismo caía.
  const instante = agora();

  // ── 1. Geração ────────────────────────────────────────────────────
  const geracao = generateCandidates(contexto, { incluirForaDePerfil });
  etapas.push({
    etapa: "geracao",
    entraram: geracao.combinacoesConsideradas,
    sairam: geracao.candidatos.length,
    unidadeEntrada: "hipoteses",
    unidadeSaida: "hipoteses",
  });

  // ── 2. Restrições ─────────────────────────────────────────────────
  const restricoes = aplicarRestricoes(geracao.candidatos, contexto);
  etapas.push({
    etapa: "restricoes",
    entraram: geracao.candidatos.length,
    sairam: restricoes.aprovados.length,
    unidadeEntrada: "hipoteses",
    unidadeSaida: "hipoteses",
  });

  // ── 3–7. Avaliação, candidato a candidato ─────────────────────────
  const avaliados: OpportunityCandidate[] = [];
  const planos = new Map<string, PlanoDeInvestigacao>();
  const observacoesVistas = new Set<string>();
  const fontesVistas = new Set<string>();
  let consultasPorLigar = 0;

  for (const bruto of restricoes.aprovados) {
    const regulacao = avaliarRegulacao(bruto);
    const procura = avaliarProcura({
      candidato: bruto,
      evidencePorTemplate,
      oferta,
      agora: instante,
    });
    const viabilidade = avaliarViabilidade(bruto, contexto, regulacao.barreira);
    const riscos = avaliarRiscos(bruto, contexto, regulacao, procura);
    const { total: fit, detalhe: fitDetalhe } = calcularFit(bruto, contexto);

    const scores = calcularScores({
      candidato: bruto,
      contexto,
      fit,
      viabilidade,
      regulacao,
      procura,
      riscos,
    });
    const objecoes = correrStressTest({
      candidato: bruto,
      contexto,
      viabilidade,
      regulacao,
      procura,
      riscos,
    });
    const confianca = avaliarConfianca(bruto, scores, procura, regulacao);
    const explicacao = explicar({
      candidato: bruto,
      contexto,
      fitDetalhe,
      viabilidade,
      regulacao,
      procura,
      riscos,
      objecoes,
    });
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
      intervaloPontuacao: intervaloDePontuacao(scores),
      confianca,
      objecoes,
      explicacao,
      validacao: planoDeValidacao(bruto),
      evidencias,
      lacunas,
    });
  }

  // A evidência NÃO filtra hipóteses: anexa leituras. As unidades dizem-no
  // e a interface tem de as respeitar em vez de escrever uma seta entre
  // dois números que não são a mesma coisa.
  etapas.push({
    etapa: "evidencia",
    entraram: avaliados.length,
    sairam: observacoesVistas.size,
    unidadeEntrada: "hipoteses",
    unidadeSaida: "observacoes",
    naoFiltra: true,
  });
  for (const etapa of ["viabilidade", "risco", "scoring"] as const) {
    etapas.push({
      etapa,
      entraram: avaliados.length,
      sairam: avaliados.length,
      unidadeEntrada: "hipoteses",
      unidadeSaida: "hipoteses",
      naoFiltra: true,
    });
  }
  etapas.push({
    etapa: "stress",
    entraram: avaliados.length,
    sairam: avaliados.filter((item) => !item.objecoes.some((objecao) => objecao.fatal && objecao.procede)).length,
    unidadeEntrada: "hipoteses",
    unidadeSaida: "hipoteses",
  });

  // ── 8. Deduplicação e diversificação ──────────────────────────────
  const dedup = deduplicar(avaliados);
  const aprendizagem = aplicarAprendizagem(dedup.candidatos, sessao);
  if (sessao && (sessao.feedback.length > 0 || sessao.vistos.length > 0 || sessao.modo !== "normal")) {
    etapas.push({
      etapa: "personalizacao",
      entraram: dedup.candidatos.length,
      sairam: aprendizagem.candidatos.length,
      unidadeEntrada: "hipoteses",
      unidadeSaida: "hipoteses",
    });
  }
  const ordenados = diversificar(aprendizagem.candidatos, {
    limite,
    ajuste: (candidato) => aprendizagem.ajustes.get(candidato.id)?.ajuste ?? 0,
  });
  etapas.push({
    etapa: "diversificacao",
    entraram: dedup.candidatos.length,
    sairam: ordenados.length,
    unidadeEntrada: "hipoteses",
    unidadeSaida: "hipoteses",
  });

  const descartados = [...restricoes.descartados, ...dedup.descartados];
  const bloqueios =
    semBloqueios || incluirForaDePerfil
      ? []
      : bloqueiosPorMeio(contexto, geracao.capacidadesBloqueadasPorAtivo, ordenados.length, {
          evidencia,
          limite,
          oferta,
        });
  const bloqueadasPorInadequacao = geracao.capacidadesBloqueadasPorAtivo.filter((item) =>
    item.avaliacoesAtivos.some((avaliacao) => avaliacao.estado === "inadequado"),
  ).length;
  const passaramStress = ordenados.filter(
    (candidato) => !candidato.objecoes.some((objecao) => objecao.fatal && objecao.procede),
  );

  // ── Saídas para um resultado vazio ────────────────────────────────
  //  Só se calculam quando não há nada a mostrar. Custam uma passagem do
  //  motor por cada mudança testada, e num resultado com candidatos isso
  //  seria trabalho para deitar fora.
  const relaxamentos =
    semRelaxamentos || ordenados.length > 0
      ? []
      : calcularRelaxamentos(contexto, (proximo) =>
          descobrir(proximo, {
            evidencia,
            limite,
            oferta,
            incluirForaDePerfil,
            sessao,
            agora,
            semBloqueios: true,
            semRelaxamentos: true,
          }).candidatos.length,
        );

  return {
    candidatos: ordenados,
    descartados,
    // Uma hipótese condicional ou destruída pelo stress não pode voltar
    // à lista principal pela porta lateral de um “ângulo de leitura”.
    destaques: destaques(passaramStress),
    planos,
    bloqueiosPorMeio: bloqueios,
    relaxamentos,
    diagnosticoVazio:
      ordenados.length > 0
        ? null
        : dedup.candidatos.length > 0 && aprendizagem.candidatos.length === 0
          ? { tipo: "sessao-esgotada" }
          : diagnosticar(contexto, bloqueios.length, bloqueadasPorInadequacao, restricoes.descartados.length),
    aprendizagem: {
      modo: sessao?.modo ?? "normal",
      feedbackAplicado: sessao?.feedback.length ?? 0,
      excluidos: aprendizagem.excluidos,
      ocultosPorJaVistos: aprendizagem.ocultosPorJaVistos,
      rejeitadosPelasEscolhas: aprendizagem.rejeitadosPelasEscolhas,
      totalElegiveis: aprendizagem.candidatos.length,
      haMais: aprendizagem.candidatos.length > ordenados.length,
      ajustes: aprendizagem.ajustes,
      decisoes: sessao?.feedback ?? [],
    },
    geradoEm: instante,
    telemetria: {
      etapas,
      combinacoesConsideradas: geracao.combinacoesConsideradas,
      hipotesesGeradas: geracao.candidatos.length,
      descartadasPorRestricao: restricoes.descartados.length,
      descartadasPorDuplicacao: dedup.descartados.length,
      aprovadas: dedup.candidatos.length,
      apresentadas: ordenados.length,
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
  inadequadas: number,
  descartadas: number,
): DiagnosticoVazio {
  if (bloqueadas > 0) return { tipo: "meios-em-falta" };
  if (inadequadas > 0) return { tipo: "meios-inadequados" };
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
      competencias: soDeApoio.map((id) => COMPETENCIA_POR_ID.get(id)?.rotulo ?? id),
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
  bloqueadas: readonly CapacidadeAlcancada[],
  jaVisiveis: number,
  opcoes: {
    evidencia: readonly MarketPilotEvidence[];
    limite: number;
    oferta?: PackOferta;
  },
): readonly BloqueioPorMeio[] {
  if (bloqueadas.length === 0) return [];

  // Cada grupo interno é OU; grupos diferentes são E. Isto evita dizer
  // que alguém precisa de uma viatura ligeira E de carga quando qualquer
  // uma das duas serve para uma rota.
  const porConjunto = new Map<string, { gruposAlternativos: AtivoId[][]; capacidades: string[] }>();
  for (const bloqueada of bloqueadas) {
    const gruposAlternativos = bloqueada.avaliacoesAtivos
      .flatMap((avaliacao) => {
        if (avaliacao.estado === "em-falta") return [[...avaliacao.alternativas].sort()] as AtivoId[][];
        if (avaliacao.estado !== "inadequado") return [];
        // Se uma alternativa presente é inadequada, só sugerimos OUTRA.
        // Voltar a acrescentar o mesmo id não repararia nada.
        const outras = avaliacao.alternativas.filter((id) => !contexto.ativos.includes(id)).sort();
        return outras.length > 0 ? [outras] : [];
      })
      .sort((a, b) => a.join("|").localeCompare(b.join("|")));
    if (gruposAlternativos.length === 0) continue;
    const chave = gruposAlternativos.map((grupo) => grupo.join("|")).join("+");
    const entrada = porConjunto.get(chave) ?? {
      gruposAlternativos,
      capacidades: [],
    };
    entrada.capacidades.push(bloqueada.capacidade.rotulo);
    porConjunto.set(chave, entrada);
  }

  const resultado: BloqueioPorMeio[] = [];
  for (const { gruposAlternativos, capacidades } of porConjunto.values()) {
    // Produto cartesiano pequeno: uma escolha por grupo alternativo.
    const combinacoes = gruposAlternativos.reduce<AtivoId[][]>(
      (parciais, grupo) => parciais.flatMap((parcial) => grupo.map((id) => [...new Set([...parcial, id])])),
      [[]],
    );
    let melhor: { ativos: AtivoId[]; abre: number } | null = null;
    for (const ativos of combinacoes) {
      const comEstes = descobrir(
        { ...contexto, ativos: [...new Set([...contexto.ativos, ...ativos])] },
        { ...opcoes, semBloqueios: true },
      );
      const abre = comEstes.candidatos.length - jaVisiveis;
      if (
        melhor === null ||
        abre > melhor.abre ||
        (abre === melhor.abre && ativos.join().localeCompare(melhor.ativos.join()) < 0)
      ) {
        melhor = { ativos, abre };
      }
    }
    if (!melhor || melhor.abre <= 0) continue;
    resultado.push({
      ativos: melhor.ativos,
      gruposAlternativos,
      rotulosAlternativos: gruposAlternativos.map((grupo) =>
        grupo.map((id) => ATIVOS.find((item) => item.id === id)?.rotulo ?? id),
      ),
      rotulos: melhor.ativos.map((id) => ATIVOS.find((item) => item.id === id)?.rotulo ?? id),
      capacidades,
      hipotesesQueAbriria: melhor.abre,
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
  // ┌──────────────────────────────────────────────────────────────────┐
  // │ Este número e o do cabeçalho são DIFERENTES e diziam a mesma      │
  // │ frase: «14 passaram os critérios» aqui, «10 hipóteses passaram    │
  // │ os critérios» duas linhas acima. Um é o que sobreviveu aos        │
  // │ filtros, o outro é o que a diversificação escolheu mostrar. Duas  │
  // │ contagens verdadeiras com as mesmas palavras é uma contradição    │
  // │ visível, e a auditoria apanhou-a na irmã desta (a etapa da        │
  // │ evidência, que misturava candidatos com observações).             │
  // └──────────────────────────────────────────────────────────────────┘
  partes.push(`${telemetria.aprovadas} sobreviveram aos filtros`);
  if (telemetria.apresentadas < telemetria.aprovadas) {
    partes.push(`${telemetria.apresentadas} apresentadas, sem repetir o mesmo problema`);
  }
  return partes.join(" · ");
}
