// ═══════════════════════════════════════════════════════════════════════
//  O GRAFO — travessias e integridade referencial
//  ---------------------------------------------------------------------
//  Um grafo com arestas partidas não dá erro: dá menos resultados, em
//  silêncio. Um `capacidades: ["reparar-equipamentos"]` escrito no plural
//  errado faz um problema inteiro desaparecer do motor sem ninguém dar por
//  isso — e a única pista seria uma hipótese que nunca mais aparece.
//
//  Por isso `assertGrafoIntegro()` corre no import, como o resto do
//  projeto já faz com os dados fiscais e com o changelog: se uma aresta
//  apontar para o vazio, o build falha.
// ═══════════════════════════════════════════════════════════════════════

import { CAPACIDADES, CAPACIDADE_POR_ID } from "./dados/capacidades";
import { COMPETENCIAS, COMPETENCIA_POR_ID } from "./dados/competencias";
import { MODELOS_RECEITA, MODELO_POR_ID } from "./dados/modelos";
import { PROBLEMAS, PROBLEMA_POR_ID } from "./dados/problemas";
import { REGULACOES, REGULACAO_POR_ID } from "./dados/regulacao";
import { SETORES, SETOR_POR_ID } from "./dados/setores";
import type { Capacidade, GrafoConhecimento, ModeloReceita, Problema } from "./tipos";
import type { AtivoId, OpportunityContext } from "../contexto/tipos";
import { nivelDe } from "../contexto/tipos";

export const GRAFO: GrafoConhecimento = Object.freeze({
  competencias: COMPETENCIAS,
  capacidades: CAPACIDADES,
  setores: SETORES,
  problemas: PROBLEMAS,
  modelos: MODELOS_RECEITA,
  regulacoes: REGULACOES,
});

export {
  CAPACIDADES,
  CAPACIDADE_POR_ID,
  COMPETENCIAS,
  COMPETENCIA_POR_ID,
  MODELOS_RECEITA,
  MODELO_POR_ID,
  PROBLEMAS,
  PROBLEMA_POR_ID,
  REGULACOES,
  REGULACAO_POR_ID,
  SETORES,
  SETOR_POR_ID,
};

// ── INTEGRIDADE ──────────────────────────────────────────────────────

export function verificarGrafo(): readonly string[] {
  const erros: string[] = [];
  const competencias = new Set(COMPETENCIAS.map((item) => item.id));
  const capacidades = new Set(CAPACIDADES.map((item) => item.id));
  const setores = new Set(SETORES.map((item) => item.id));
  const modelos = new Set(MODELOS_RECEITA.map((item) => item.id));
  const regulacoes = new Set(REGULACOES.map((item) => item.id));

  const unico = (nome: string, ids: readonly string[]) => {
    const vistos = new Set<string>();
    for (const id of ids) {
      if (vistos.has(id)) erros.push(`${nome}: id repetido «${id}»`);
      vistos.add(id);
    }
  };
  unico("competencias", COMPETENCIAS.map((item) => item.id));
  unico("capacidades", CAPACIDADES.map((item) => item.id));
  unico("problemas", PROBLEMAS.map((item) => item.id));
  unico("modelos", MODELOS_RECEITA.map((item) => item.id));

  for (const capacidade of CAPACIDADES) {
    for (const id of [...capacidade.competenciasNecessarias, ...capacidade.competenciasUteis]) {
      if (!competencias.has(id)) erros.push(`capacidade ${capacidade.id}: competência «${id}» não existe`);
    }
    if (capacidade.competenciasNecessarias.length === 0) {
      erros.push(`capacidade ${capacidade.id}: sem competência necessária — seria alcançável por toda a gente`);
    }
  }

  for (const problema of PROBLEMAS) {
    if (!setores.has(problema.setor)) erros.push(`problema ${problema.id}: setor «${problema.setor}» não existe`);
    for (const id of problema.capacidades) {
      if (!capacidades.has(id)) erros.push(`problema ${problema.id}: capacidade «${id}» não existe`);
    }
    for (const id of problema.modelos) {
      if (!modelos.has(id)) erros.push(`problema ${problema.id}: modelo «${id}» não existe`);
    }
    for (const id of problema.regulacoes) {
      if (!regulacoes.has(id)) erros.push(`problema ${problema.id}: regulação «${id}» não existe`);
    }
    for (const id of problema.capacidadesEssenciais ?? []) {
      if (!problema.capacidades.includes(id)) {
        erros.push(`problema ${problema.id}: capacidade essencial «${id}» não está entre as suas capacidades`);
      }
    }
    if (problema.capacidades.length === 0) erros.push(`problema ${problema.id}: sem capacidade que o resolva`);
    if (problema.modelos.length === 0) erros.push(`problema ${problema.id}: sem modelo de receita viável`);
    if (problema.comoValidar.length < 2) erros.push(`problema ${problema.id}: precisa de pelo menos dois passos de validação`);
    if (problema.testeDeFalsificacao.trim().length < 40) {
      erros.push(`problema ${problema.id}: teste de falsificação demasiado vago para poder falhar`);
    }
  }

  // Uma competência que nenhuma capacidade usa é um botão morto no
  // formulário — foi exatamente esse o defeito de «resolver problemas
  // técnicos» no catálogo anterior.
  for (const competencia of COMPETENCIAS) {
    const usada = CAPACIDADES.some(
      (capacidade) =>
        capacidade.competenciasNecessarias.includes(competencia.id) ||
        capacidade.competenciasUteis.includes(competencia.id),
    );
    if (!usada) erros.push(`competência ${competencia.id}: nenhuma capacidade a usa`);
  }

  // Uma capacidade que nenhum problema usa não é alcançável pelo motor.
  for (const capacidade of CAPACIDADES) {
    if (!PROBLEMAS.some((problema) => problema.capacidades.includes(capacidade.id))) {
      erros.push(`capacidade ${capacidade.id}: nenhum problema a usa`);
    }
  }

  // Um modelo que nenhum problema aceita é capital e tempo declarados
  // que nunca chegam a um resultado.
  for (const modelo of MODELOS_RECEITA) {
    if (!PROBLEMAS.some((problema) => problema.modelos.includes(modelo.id))) {
      erros.push(`modelo ${modelo.id}: nenhum problema o aceita`);
    }
  }

  return erros;
}

export function assertGrafoIntegro(): void {
  const erros = verificarGrafo();
  if (erros.length > 0) {
    throw new Error(`Grafo de conhecimento inconsistente:\n  · ${erros.join("\n  · ")}`);
  }
}

assertGrafoIntegro();

// ── TRAVESSIAS ───────────────────────────────────────────────────────

export interface CapacidadeAlcancada {
  capacidade: Capacidade;
  /**
   * 0–1. Quanto da capacidade está coberto pelo que a pessoa declarou.
   *
   * As competências NECESSÁRIAS pesam três quartos e as úteis um quarto:
   * ter o essencial e faltar o acessório é uma capacidade real com folga
   * por preencher; ter o acessório e faltar o essencial não é capacidade
   * nenhuma. Sem esta assimetria, alguém com «organização» ficava
   * qualificado para reparar equipamento.
   */
  cobertura: number;
  /** O que falta para a capacidade estar completa. */
  competenciasEmFalta: readonly string[];
  ativosEmFalta: readonly AtivoId[];
}

/**
 * Que capacidades esta pessoa alcança, e com que folga.
 *
 * `ativosNecessarios` é uma condição DURA: sem carta de condução não há
 * rota, por muito que a pessoa saiba de logística. É isto que faz «não
 * tenho carro» eliminar hipóteses em vez de as penalizar.
 */
export function capacidadesAlcancadas(
  contexto: OpportunityContext,
  { exigirAtivos = true }: { exigirAtivos?: boolean } = {},
): readonly CapacidadeAlcancada[] {
  const ativos = new Set(contexto.ativos);
  const alcancadas: CapacidadeAlcancada[] = [];

  for (const capacidade of CAPACIDADES) {
    const ativosEmFalta = capacidade.ativosNecessarios.filter((id) => !ativos.has(id));
    if (exigirAtivos && ativosEmFalta.length > 0) continue;

    const necessarias = capacidade.competenciasNecessarias;
    const temNecessarias = necessarias.filter((id) => nivelDe(contexto, id) > 0);
    if (temNecessarias.length === 0) continue;

    const uteis = capacidade.competenciasUteis;
    const temUteis = uteis.filter((id) => nivelDe(contexto, id) > 0);

    const parteNecessaria = necessarias.length === 0 ? 1 : temNecessarias.length / necessarias.length;
    const parteUtil = uteis.length === 0 ? 1 : temUteis.length / uteis.length;
    const cobertura = 0.75 * parteNecessaria + 0.25 * parteUtil;

    alcancadas.push({
      capacidade,
      cobertura,
      competenciasEmFalta: necessarias.filter((id) => nivelDe(contexto, id) === 0),
      ativosEmFalta,
    });
  }

  return alcancadas.sort((esquerda, direita) => direita.cobertura - esquerda.cobertura);
}

/** Os problemas que alguma das capacidades alcançadas consegue atacar. */
export function problemasAlcancaveis(
  alcancadas: readonly CapacidadeAlcancada[],
): readonly { problema: Problema; capacidades: readonly CapacidadeAlcancada[] }[] {
  const porId = new Map(alcancadas.map((item) => [item.capacidade.id, item]));
  const resultado: { problema: Problema; capacidades: CapacidadeAlcancada[] }[] = [];

  for (const problema of PROBLEMAS) {
    const usadas = problema.capacidades
      .map((id) => porId.get(id))
      .filter((item): item is CapacidadeAlcancada => item !== undefined);
    if (usadas.length === 0) continue;

    // A capacidade essencial é uma condição, não uma preferência: sem
    // ela, a composição sai semanticamente errada mesmo quando alguma
    // das outras está coberta.
    const essenciais = problema.capacidadesEssenciais;
    if (essenciais && essenciais.length > 0) {
      if (!usadas.some((item) => essenciais.includes(item.capacidade.id))) continue;
      // A dominante passa a ser a melhor ESSENCIAL: é ela que dá o título.
      usadas.sort((esquerda, direita) => {
        const pesoEsq = essenciais.includes(esquerda.capacidade.id) ? 1 : 0;
        const pesoDir = essenciais.includes(direita.capacidade.id) ? 1 : 0;
        return pesoDir - pesoEsq || direita.cobertura - esquerda.cobertura;
      });
    }

    resultado.push({ problema, capacidades: usadas });
  }

  return resultado;
}

/** Os modelos de receita que este problema aceita. */
export function modelosDoProblema(problema: Problema): readonly ModeloReceita[] {
  return problema.modelos
    .map((id) => MODELO_POR_ID.get(id))
    .filter((item): item is ModeloReceita => item !== undefined);
}
