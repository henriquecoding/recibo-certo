/**
 * Registry único de módulos (§6).
 *
 * A biblioteca lateral, o validador, os loaders e o renderer leem SÓ
 * daqui. Duplicar metadados de widgets por vários componentes é como
 * esta classe de bug começa.
 *
 * Esta tabela é o espelho de `public.dashboard_modulos`. O SQL é a
 * autoridade — este ficheiro serve para feedback imediato na UI e para
 * tipagem. Há um teste que compara os dois.
 */

import type { WidgetSize, WidgetType, GridPlacement } from "./tipos";

export type WidgetCategoria = "operacao" | "clientes" | "trabalho" | "fiscal" | "negocio";
export type WidgetTom = "brand" | "rosa" | "azul" | "lilas" | "areia" | "alert";
export type WidgetPrioridade = "critical" | "normal" | "deferred";

/**
 * Formato do conteúdo. A biblioteca do painel mostra-o antes de se
 * arrastar («M · Lista», «XL · Kanban»): saber o que vai acontecer ao
 * painel antes de o mudar é metade da confiança no modo de edição.
 */
export type WidgetFormato = "lista" | "kanban" | "grafico" | "tabela" | "cartao" | "timeline";

/**
 * Domínios de dados. O broker de carregamento usa isto para pedir cada
 * fonte UMA vez por render, mesmo que três widgets a queiram (§12.3).
 */
export type DominioDados =
  | "agenda"
  | "atencao"
  | "prazos"
  | "partilhas"
  | "documentos"
  | "atividade"
  | "avisos"
  | "trabalho"
  | "clientes"
  /**
   * Uma linha por cliente, JÁ AGREGADA pelo servidor
   * (`resumo_clientes_do_contabilista`).
   *
   * Existe separado de `clientes` porque as contagens não se derivam de
   * uma lista de vínculos sem voltar a ler agenda e partilhas — e derivá-las
   * no cliente foi exatamente como «Consultas» passou a significar duas
   * coisas diferentes em dois ecrãs do mesmo painel.
   */
  | "resumo_clientes"
  | "casos"
  | "fidelidade"
  | "progressao"
  | "mensagens";

export interface WidgetDefinition {
  type: WidgetType;
  tagBase: string;
  titulo: string;
  descricao: string;
  categoria: WidgetCategoria;
  tom: WidgetTom;
  prioridade: WidgetPrioridade;
  formato: WidgetFormato;
  dominios: DominioDados[];
  tamanhos: WidgetSize[];
  tamanhoPadrao: WidgetSize;
  colSpan: { min: number; max: number };
  rowSpan: { min: number; max: number };
  posicaoPadrao: Pick<GridPlacement, "colSpan" | "rowSpan">;
  /** Carrega o componente só quando é preciso (§12.6). */
  lazy: boolean;
  /** Rota da superfície dedicada, para o CTA "Ver tudo". */
  rota?: string;
}

const D = (d: WidgetDefinition): WidgetDefinition => d;

export const MODULOS: Readonly<Record<WidgetType, WidgetDefinition>> = Object.freeze({
  agenda_hoje: D({
    type: "agenda_hoje", tagBase: "AGD", titulo: "Agenda de hoje",
    descricao: "As próximas consultas do dia, com estado e modalidade.",
    categoria: "operacao", tom: "brand", formato: "timeline", prioridade: "critical",
    dominios: ["agenda"], tamanhos: ["S", "M", "L"], tamanhoPadrao: "M",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 8 },
    posicaoPadrao: { colSpan: 4, rowSpan: 4 }, lazy: false, rota: "/contabilista/agenda",
  }),
  precisam_atencao: D({
    type: "precisam_atencao", tagBase: "ATN", titulo: "Precisam de atenção",
    descricao: "Pedidos de vínculo, consultas por confirmar, tarefas atrasadas.",
    categoria: "operacao", tom: "alert", formato: "lista", prioridade: "critical",
    dominios: ["atencao"], tamanhos: ["S", "M", "L"], tamanhoPadrao: "M",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 8 },
    posicaoPadrao: { colSpan: 4, rowSpan: 4 }, lazy: false,
  }),
  prazos_proximos: D({
    type: "prazos_proximos", tagBase: "PRZ", titulo: "Prazos próximos",
    descricao: "Obrigações do calendário fiscal relevantes para si.",
    categoria: "fiscal", tom: "areia", formato: "lista", prioridade: "critical",
    dominios: ["prazos"], tamanhos: ["S", "M", "L"], tamanhoPadrao: "M",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 8 },
    posicaoPadrao: { colSpan: 4, rowSpan: 4 }, lazy: false,
  }),
  partilhas_recebidas: D({
    type: "partilhas_recebidas", tagBase: "PAR", titulo: "Partilhas recebidas",
    descricao: "O que os clientes escolheram enviar-lhe.",
    categoria: "clientes", tom: "azul", formato: "lista", prioridade: "normal",
    dominios: ["partilhas"], tamanhos: ["S", "M", "L"], tamanhoPadrao: "M",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 8 },
    posicaoPadrao: { colSpan: 4, rowSpan: 3 }, lazy: false, rota: "/contabilista/partilhas",
  }),
  simulacoes_recebidas: D({
    type: "simulacoes_recebidas", tagBase: "SIM", titulo: "Simulações recebidas",
    // Este widget NÃO calcula. Apresenta o que o cliente enviou (§7.5).
    descricao: "Simulações que os clientes partilharam consigo. Não executa cálculos.",
    categoria: "clientes", tom: "lilas", formato: "lista", prioridade: "normal",
    dominios: ["partilhas"], tamanhos: ["S", "M", "L"], tamanhoPadrao: "M",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 8 },
    posicaoPadrao: { colSpan: 4, rowSpan: 3 }, lazy: false, rota: "/contabilista/partilhas",
  }),
  documentos_rever: D({
    type: "documentos_rever", tagBase: "DOC", titulo: "Documentos por rever",
    descricao: "Anexos de casos e partilhas que ainda não abriu.",
    categoria: "trabalho", tom: "rosa", formato: "lista", prioridade: "normal",
    dominios: ["documentos"], tamanhos: ["S", "M", "L"], tamanhoPadrao: "M",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 8 },
    posicaoPadrao: { colSpan: 4, rowSpan: 3 }, lazy: false,
  }),
  atividade_semana: D({
    type: "atividade_semana", tagBase: "ATV", titulo: "Atividade da semana",
    descricao: "Consultas e tarefas concluídas, partilhas recebidas, casos movimentados.",
    categoria: "operacao", tom: "azul", formato: "grafico", prioridade: "deferred",
    dominios: ["atividade"], tamanhos: ["S", "M", "L"], tamanhoPadrao: "M",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 6 },
    posicaoPadrao: { colSpan: 6, rowSpan: 3 }, lazy: true,
  }),
  centro_avisos: D({
    type: "centro_avisos", tagBase: "AVS", titulo: "Centro de avisos",
    descricao: "Resumo acionável. O sino continua a ser o feed cronológico.",
    categoria: "operacao", tom: "areia", formato: "lista", prioridade: "normal",
    dominios: ["avisos"], tamanhos: ["S", "M", "L"], tamanhoPadrao: "S",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 6 },
    posicaoPadrao: { colSpan: 6, rowSpan: 3 }, lazy: false,
  }),
  estado_trabalho: D({
    type: "estado_trabalho", tagBase: "TRB", titulo: "Estado do trabalho",
    descricao: "As suas tarefas por estado. Em XL aproxima-se do quadro completo.",
    categoria: "trabalho", tom: "brand", formato: "kanban", prioridade: "normal",
    dominios: ["trabalho"], tamanhos: ["S", "M", "L", "XL"], tamanhoPadrao: "L",
    colSpan: { min: 4, max: 12 }, rowSpan: { min: 2, max: 12 },
    posicaoPadrao: { colSpan: 12, rowSpan: 4 }, lazy: true, rota: "/contabilista/trabalho",
  }),
  clientes: D({
    type: "clientes", tagBase: "CLI", titulo: "Clientes",
    descricao: "Vínculos ativos, pedidos pendentes e quem está sem contacto há mais tempo.",
    categoria: "clientes", tom: "azul", formato: "lista", prioridade: "normal",
    dominios: ["clientes"], tamanhos: ["S", "M", "L"], tamanhoPadrao: "M",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 8 },
    posicaoPadrao: { colSpan: 4, rowSpan: 3 }, lazy: false, rota: "/contabilista/clientes",
  }),
  casos: D({
    type: "casos", tagBase: "CAS", titulo: "Casos",
    descricao: "Casos abertos, encaminhados e bloqueados.",
    categoria: "trabalho", tom: "lilas", formato: "lista", prioridade: "normal",
    dominios: ["casos"], tamanhos: ["S", "M", "L"], tamanhoPadrao: "M",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 8 },
    posicaoPadrao: { colSpan: 4, rowSpan: 3 }, lazy: false, rota: "/contabilista/casos",
  }),
  fidelidade: D({
    type: "fidelidade", tagBase: "FID", titulo: "Fidelidade",
    descricao: "Cartões em curso, clientes perto do benefício e benefícios por usar.",
    categoria: "negocio", tom: "brand", formato: "cartao", prioridade: "deferred",
    dominios: ["fidelidade"], tamanhos: ["S", "M"], tamanhoPadrao: "S",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 6 },
    posicaoPadrao: { colSpan: 4, rowSpan: 3 }, lazy: true, rota: "/contabilista/fidelidade",
  }),
  progressao_comissao: D({
    type: "progressao_comissao", tagBase: "PRG", titulo: "Progressão e comissão",
    // O Checkout vive na superfície dedicada, nunca dentro de um widget (§89).
    descricao: "A sua comissão atual e o próximo patamar. A compra abre em /contabilista/progressao.",
    categoria: "negocio", tom: "brand", formato: "cartao", prioridade: "deferred",
    dominios: ["progressao"], tamanhos: ["S", "M", "L"], tamanhoPadrao: "S",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 8 },
    posicaoPadrao: { colSpan: 4, rowSpan: 3 }, lazy: true, rota: "/contabilista/progressao",
  }),
  casos_em_risco: D({
    type: "casos_em_risco", tagBase: "RSK", titulo: "Casos em risco",
    // "Risco" precisa de uma definição de produto. A conservadora, que não
    // inventa um score: sem movimento há N dias, ou com prazo a expirar.
    descricao: "Casos parados, bloqueados ou com prazo a aproximar-se.",
    categoria: "trabalho", tom: "alert", prioridade: "normal", formato: "lista",
    dominios: ["casos"], tamanhos: ["S", "M", "L"], tamanhoPadrao: "M",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 8 },
    posicaoPadrao: { colSpan: 4, rowSpan: 3 }, lazy: false, rota: "/contabilista/casos",
  }),
  comunicacoes_recentes: D({
    type: "comunicacoes_recentes", tagBase: "COM", titulo: "Comunicações recentes",
    // `contabilista_mensagens` é privada às duas partes do vínculo e o corpo
    // é imutável depois de enviado. Este widget mostra QUEM e QUANDO — nunca
    // o conteúdo da mensagem no painel.
    descricao: "Quem falou consigo e quando. O conteúdo abre na conversa.",
    categoria: "clientes", tom: "azul", prioridade: "normal", formato: "lista",
    dominios: ["mensagens"], tamanhos: ["S", "M", "L"], tamanhoPadrao: "M",
    colSpan: { min: 3, max: 12 }, rowSpan: { min: 2, max: 8 },
    posicaoPadrao: { colSpan: 4, rowSpan: 3 }, lazy: false, rota: "/contabilista/clientes",
  }),
  resumo_por_cliente: D({
    type: "resumo_por_cliente", tagBase: "RES", titulo: "Resumo por cliente",
    descricao: "Uma linha por cliente: consultas, tarefas abertas e última atividade.",
    categoria: "clientes", tom: "lilas", prioridade: "deferred", formato: "tabela",
    // As contagens vêm agregadas do servidor. Recompô-las aqui a partir de
    // `clientes` + `agenda` dava um número diferente do da página de
    // clientes para a mesma palavra — e sobre listas truncadas.
    dominios: ["resumo_clientes", "trabalho"], tamanhos: ["M", "L", "XL"], tamanhoPadrao: "L",
    colSpan: { min: 4, max: 12 }, rowSpan: { min: 2, max: 10 },
    posicaoPadrao: { colSpan: 8, rowSpan: 4 }, lazy: true, rota: "/contabilista/clientes",
  }),
});

export const TIPOS_VALIDOS = Object.keys(MODULOS) as WidgetType[];

export function definicao(type: string): WidgetDefinition | undefined {
  return (MODULOS as Record<string, WidgetDefinition | undefined>)[type];
}

/** Traduz uma geometria em grelha para a variante de densidade a montar (§8). */
export function densidadeDe(colSpan: number, rowSpan: number): "compact" | "normal" | "expanded" | "full" {
  const area = colSpan * rowSpan;
  if (colSpan >= 10 && rowSpan >= 6) return "full";
  if (area >= 36) return "expanded";
  if (area >= 12) return "normal";
  return "compact";
}

/** Domínios que a vista atual realmente precisa. Nada mais é carregado (§12.4). */
export function dominiosNecessarios(
  items: ReadonlyArray<{ type: string; hidden?: boolean }>,
): DominioDados[] {
  const set = new Set<DominioDados>();
  for (const item of items) {
    if (item.hidden) continue;
    const def = definicao(item.type);
    if (!def) continue;
    for (const d of def.dominios) set.add(d);
  }
  return [...set];
}
