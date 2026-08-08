// ═══════════════════════════════════════════════════════════════════════
//  DECISÕES VERIFICADAS MENSAIS (DVM) — a North Star
//  ---------------------------------------------------------------------
//  §7.1: «Número de utilizadores únicos que, num mês, concluem um
//  simulador/decisor e veem um resultado com premissas, explicação e
//  referência de dados. É uma métrica de valor, não de página vista.»
//
//  §19.1 exige, ao dia 14, «definir DVM e documentar o que conta/não
//  conta». Essa definição vive aqui, em código executável, e não num
//  documento que ninguém volta a abrir — porque a maneira de uma North
//  Star morrer é cada pessoa contá-la à sua maneira.
//
//  A escolha de contar UTILIZADORES ÚNICOS, e não decisões, é o que
//  impede a métrica de premiar quem carrega dez vezes no mesmo botão. A
//  contagem de decisões por utilizador existe à parte (§17.1,
//  «Decisões/user») justamente para «provar continuidade, não compulsão».
// ═══════════════════════════════════════════════════════════════════════

import type { EstadoConfianca, NomeEvento } from "./eventos";

/** O que é preciso acontecer, na mesma sessão, para haver uma decisão. */
export const CONDICOES_DVM: readonly NomeEvento[] = ["simulator_complete", "result_view"];

/**
 * O que conta e o que não conta. Este texto é apresentado tal e qual na
 * página `/metodologia` — a definição que a equipa usa é a mesma que o
 * público lê.
 */
export const DEFINICAO_DVM = {
  nome: "Decisões Verificadas Mensais",
  sigla: "DVM",
  frase:
    "Utilizadores únicos que, num mês, concluem um simulador ou decisor e veem um resultado com premissas, explicação e fonte.",
  conta: [
    "Um cálculo válido produzido a partir de entradas suficientes (simulator_complete).",
    "O resultado principal efetivamente renderizado no ecrã (result_view).",
    "Resultados estimados, desde que o intervalo e a razão da estimativa sejam mostrados.",
    "A mesma pessoa em ferramentas diferentes conta uma vez no total e uma vez por ferramenta.",
  ],
  naoConta: [
    "Ver uma página, um guia ou uma landing sem chegar a um resultado.",
    "Começar um simulador e abandoná-lo (isso é simulator_start — o denominador da ativação).",
    "Repetir a mesma simulação: a segunda decisão do mesmo utilizador no mesmo mês não soma DVM.",
    "Um resultado marcado como fora de escopo, porque não é uma decisão que se possa tomar.",
    "Tráfego de robôs, pré-visualizações e ambientes de desenvolvimento.",
  ],
  segmentacao: ["ICP", "ferramenta", "origem", "ano fiscal"],
} as const;

/** Um resultado fora de escopo não é uma decisão — não há o que decidir. */
export function confiancaContaParaDVM(estado: EstadoConfianca): boolean {
  return estado === "completo" || estado === "estimado";
}

// ─── Cálculo ───────────────────────────────────────────────────────────

export interface EventoParaDVM {
  nome: NomeEvento;
  /** Identificador anónimo ou pseudónimo — nunca a pessoa. */
  ator: string;
  /** Sessão em que ocorreu: as duas condições têm de coincidir nela. */
  sessao: string;
  tool_id?: string;
  confidence_state?: EstadoConfianca;
  /** ISO. */
  em: string;
}

export interface ResultadoDVM {
  /** A North Star: utilizadores únicos com decisão verificada no período. */
  dvm: number;
  /** Decisões totais — o numerador de «decisões por utilizador». */
  decisoes: number;
  /** DVM por ferramenta, para saber qual ativa e qual dilui. */
  porFerramenta: Record<string, number>;
}

/**
 * Apura a DVM de um conjunto de eventos.
 *
 * O par tem de ocorrer na MESMA sessão. Sem essa condição, um
 * `simulator_complete` de segunda-feira e um `result_view` de sexta —
 * possivelmente de uma ferramenta diferente — juntavam-se numa decisão que
 * nunca existiu.
 */
export function apurarDVM(eventos: readonly EventoParaDVM[]): ResultadoDVM {
  const completos = new Map<string, EventoParaDVM>();
  const vistos = new Set<string>();

  for (const e of eventos) {
    if (e.nome === "simulator_complete") {
      if (confiancaContaParaDVM(e.confidence_state ?? "completo")) {
        completos.set(chave(e), e);
      }
    } else if (e.nome === "result_view") {
      vistos.add(chave(e));
    }
  }

  const atores = new Set<string>();
  const porFerramentaAtores = new Map<string, Set<string>>();
  let decisoes = 0;

  for (const [k, e] of completos) {
    if (!vistos.has(k)) continue;
    decisoes++;
    atores.add(e.ator);
    const f = e.tool_id ?? "desconhecida";
    if (!porFerramentaAtores.has(f)) porFerramentaAtores.set(f, new Set());
    porFerramentaAtores.get(f)!.add(e.ator);
  }

  const porFerramenta: Record<string, number> = {};
  for (const [f, s] of porFerramentaAtores) porFerramenta[f] = s.size;

  return { dvm: atores.size, decisoes, porFerramenta };
}

const chave = (e: EventoParaDVM) => `${e.ator}|${e.sessao}|${e.tool_id ?? ""}`;

/** Ativação (§17.1): DVM / simulator_start. */
export function taxaDeAtivacao(dvm: number, starts: number): number {
  return starts > 0 ? dvm / starts : 0;
}

/** Receita por 1.000 DVM (§17.1) — a métrica que compara motores entre si. */
export function receitaPor1000DVM(receitaCents: number, dvm: number): number {
  return dvm > 0 ? (receitaCents / dvm) * 1000 : 0;
}
