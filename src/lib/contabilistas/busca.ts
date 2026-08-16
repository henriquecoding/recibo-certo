// ═══════════════════════════════════════════════════════════════════════
//  A PESQUISA DO PAINEL — o mesmo motor do site, sobre outros registos
//  ---------------------------------------------------------------------
//  O campo do topo prometia «clientes, casos, documentos» e por trás fazia
//  `texto.includes(termo)`. Três consequências, todas visíveis a quem usa
//  o painel a sério:
//
//   · escrever «jose» não encontrava «José» a não ser por sorte, e uma
//     gralha não encontrava nada;
//   · a ordem dos resultados era a ordem por que os dados chegaram —
//     um cliente cujo email contém a palavra aparecia antes do cliente
//     que se chama exatamente aquilo;
//   · e a lista nunca estava vazia por razão nenhuma: qualquer letra
//     encontrava alguma coisa, o que faz com que a primeira linha deixe
//     de significar nada.
//
//  Este ficheiro resolve isso sem inventar um segundo motor: usa
//  `pontuarTexto` — a mesma escala da pesquisa do site, com frase exata,
//  prefixo, subcadeia em fronteira de palavra, tokens e uma gralha
//  perdoada a partir de cinco letras — e aplica-a a registos do painel.
//
//  O QUE É DE PROPÓSITO
//  · **Há limiar.** Abaixo de `LIMIAR` não se mostra nada, para «sem
//    resultados» poder ser uma resposta honesta.
//  · **A ordem é determinística.** Empates desfazem-se por prioridade,
//    depois por tipo, depois por id — nunca pela ordem de chegada dos
//    dados, que muda entre carregamentos.
//  · **Nada disto vai para o disco.** No painel, o que se escreve na
//    barra é o nome de um cliente. Não há histórico de pesquisa aqui, e
//    é uma decisão, não um esquecimento: ver `lib/busca/recentes.ts`
//    para o mesmo raciocínio aplicado ao site.
// ═══════════════════════════════════════════════════════════════════════

import { normalizar } from "@/lib/busca/normalizar";
import { LIMIAR, MIN_CARACTERES, pontuarTexto } from "@/lib/busca/pontuar";

export type TipoRegisto =
  | "navegacao" | "cliente" | "caso" | "tarefa" | "consulta" | "partilha";

/** Como cada grupo se chama no ecrã. */
export const ROTULO_DO_TIPO: Record<TipoRegisto, string> = {
  navegacao: "Ir para",
  cliente: "Clientes",
  caso: "Casos",
  tarefa: "Trabalho",
  consulta: "Agenda",
  partilha: "Partilhas",
};

/**
 * A ordem editorial dos grupos — só para DESEMPATAR.
 *
 * Quem manda é a relevância: o grupo vale o que vale o seu melhor
 * resultado. Uma ordem fixa enterraria o cliente que se procurava debaixo
 * de dois atalhos de navegação.
 */
const ORDEM_DOS_TIPOS: TipoRegisto[] = [
  "cliente", "caso", "tarefa", "consulta", "partilha", "navegacao",
];

export interface RegistoDoPainel {
  id: string;
  tipo: TipoRegisto;
  titulo: string;
  /** Outras formas de lhe chamar: referência, email, obrigação, assunto. */
  aliases: string[];
  descricao: string;
  href: string;
  /** 0–100. Desempata resultados com a mesma pontuação. */
  prioridade: number;
  /** Uma palavra de estado, mostrada à direita («Por responder»). */
  distintivo?: string;
}

export interface ResultadoDoPainel {
  registo: RegistoDoPainel;
  pontos: number;
  /** Que campo produziu a pontuação — o «porquê» de cada linha. */
  campo: "titulo" | "aliases" | "descricao";
}

/** Os mesmos pesos do site: o título manda, a descrição confirma. */
const PESO = { titulo: 1, aliases: 0.9, descricao: 0.45 } as const;

export function pontuarRegisto(
  consulta: string,
  registo: RegistoDoPainel,
): ResultadoDoPainel | null {
  const q = normalizar(consulta);
  if (q.length < MIN_CARACTERES) return null;

  const candidatos: [ResultadoDoPainel["campo"], number][] = [
    ["titulo", pontuarTexto(q, registo.titulo) * PESO.titulo],
    ["aliases", pontuarTexto(q, registo.aliases.join(" ")) * PESO.aliases],
    ["descricao", pontuarTexto(q, registo.descricao) * PESO.descricao],
  ];

  let campo: ResultadoDoPainel["campo"] = "titulo";
  let melhor = 0;
  for (const [nome, pontos] of candidatos) {
    if (pontos > melhor) { melhor = pontos; campo = nome; }
  }
  if (melhor <= 0) return null;

  // A prioridade entra depois do limiar e só desempata (0–100 → 0–1).
  return { registo, pontos: melhor + registo.prioridade / 100, campo };
}

export function pesquisarNoPainel(
  consulta: string,
  registos: readonly RegistoDoPainel[],
  limite = 40,
): ResultadoDoPainel[] {
  if (normalizar(consulta).length < MIN_CARACTERES) return [];

  const encontrados: ResultadoDoPainel[] = [];
  for (const r of registos) {
    const resultado = pontuarRegisto(consulta, r);
    if (resultado && resultado.pontos >= LIMIAR) encontrados.push(resultado);
  }

  encontrados.sort(
    (a, b) =>
      b.pontos - a.pontos ||
      b.registo.prioridade - a.registo.prioridade ||
      ORDEM_DOS_TIPOS.indexOf(a.registo.tipo) - ORDEM_DOS_TIPOS.indexOf(b.registo.tipo) ||
      // Sem o id, dois empates trocavam de lugar entre renders.
      a.registo.id.localeCompare(b.registo.id, "pt-PT"),
  );

  return limite > 0 ? encontrados.slice(0, limite) : encontrados;
}

/** Agrupa mantendo a ordem do ranking: o grupo vale o seu melhor membro. */
export function agruparPorTipo(
  resultados: readonly ResultadoDoPainel[],
): [TipoRegisto, ResultadoDoPainel[]][] {
  const mapa = new Map<TipoRegisto, ResultadoDoPainel[]>();
  for (const r of resultados) {
    const lista = mapa.get(r.registo.tipo);
    if (lista) lista.push(r);
    else mapa.set(r.registo.tipo, [r]);
  }

  return [...mapa.entries()].sort(
    ([tipoA, listaA], [tipoB, listaB]) =>
      listaB[0].pontos - listaA[0].pontos ||
      ORDEM_DOS_TIPOS.indexOf(tipoA) - ORDEM_DOS_TIPOS.indexOf(tipoB),
  );
}

/**
 * O que mostrar quando ainda não se escreveu nada.
 *
 * Um histórico de pesquisas seria o caminho fácil e é precisamente o que
 * não se faz aqui — guardaria nomes de clientes no dispositivo. Em vez
 * disso mostra-se o que está mesmo à espera de alguém: pedidos por
 * responder, casos sem proposta, tarefas atrasadas. É a mesma pergunta
 * («por onde começo?») respondida com dados de hoje em vez de com o
 * passado de quem usa o painel.
 */
export function sugestoesDeEntrada(
  registos: readonly RegistoDoPainel[],
  limite = 6,
): RegistoDoPainel[] {
  return registos
    .filter((r) => r.tipo !== "navegacao" && r.distintivo)
    .sort((a, b) => b.prioridade - a.prioridade || a.titulo.localeCompare(b.titulo, "pt-PT"))
    .slice(0, limite);
}
