/**
 * As vistas por omissão do painel modular.
 *
 * ⚠️ «Meu dia» NÃO é uma composição inventada: é a grelha da REFERÊNCIA A,
 * lida cartão a cartão. Doze colunas, e cada módulo na posição e com o
 * tamanho que a imagem mostra — incluindo as etiquetas S/M/L/XL, que aqui
 * saem da área ocupada e coincidem com as da imagem:
 *
 *   linha  1 │ AGD-01 (4×5, L) │ ATN-01 (4×4, M) │ PRZ-01 (4×4, M) │
 *   linha  6 │ PAR-01 (4×3, M) │ SIM-01 (4×3, M) │ DOC-01 (4×3, M) │
 *   linha  9 │ ATV-01 (6×4, L)         │ AVS-01 (6×3, M)           │
 *   linha 13 │ TRB-01 (12×6, XL) — o Kanban a toda a largura       │
 *
 * As outras três vistas — «Fecho mensal», «Clientes», «Fiscal» — são as
 * que o Relatório Mestre §4.2 lista como sugestão, e a imagem mostra
 * apenas os seus separadores. A composição de cada uma é escolhida a
 * partir do registry pelo que a vista serve; está identificada como tal e
 * é a parte destas omissões que não vem de uma imagem.
 */

import { GRID_DESKTOP, GRID_TABLET, validarLayout } from "./layout";
import { MODULOS } from "./modulos";
import type {
  GridPlacement, WidgetType, WorkspaceLayoutV2, WorkspaceWidgetInstance,
} from "./tipos";

const TAG_BASE: Record<WidgetType, string> = Object.fromEntries(
  Object.values(MODULOS).map((d) => [d.type, d.tagBase]),
) as Record<WidgetType, string>;

/** Uma posição por módulo, na ordem em que a vista as apresenta. */
type Pos = readonly [WidgetType, number, number, number, number];

/** Doze colunas, exatamente como a referência A. */
const MEU_DIA: readonly Pos[] = [
  ["agenda_hoje", 1, 1, 4, 5],
  ["precisam_atencao", 5, 1, 4, 4],
  ["prazos_proximos", 9, 1, 4, 4],
  ["partilhas_recebidas", 1, 6, 4, 3],
  ["simulacoes_recebidas", 5, 6, 4, 3],
  ["documentos_rever", 9, 6, 4, 3],
  ["atividade_semana", 1, 9, 6, 4],
  ["centro_avisos", 7, 9, 6, 3],
  ["estado_trabalho", 1, 13, 12, 6],
];

const FECHO_MENSAL: readonly Pos[] = [
  ["estado_trabalho", 1, 1, 12, 6],
  ["prazos_proximos", 1, 7, 4, 4],
  ["documentos_rever", 5, 7, 4, 4],
  ["resumo_por_cliente", 1, 11, 8, 4],
];

const CLIENTES: readonly Pos[] = [
  ["clientes", 1, 1, 4, 4],
  ["comunicacoes_recentes", 5, 1, 4, 4],
  ["partilhas_recebidas", 9, 1, 4, 4],
  ["resumo_por_cliente", 1, 5, 8, 4],
];

const FISCAL: readonly Pos[] = [
  ["prazos_proximos", 1, 1, 4, 5],
  ["simulacoes_recebidas", 5, 1, 4, 5],
  ["documentos_rever", 9, 1, 4, 5],
  ["centro_avisos", 1, 6, 6, 3],
];

export interface VistaPorOmissao {
  nome: string;
  ordem: number;
  principal: boolean;
  /** As quatro vistas de partida não se apagam; as que a pessoa criar, sim. */
  sistema: boolean;
  posicoes: readonly Pos[];
}

export const VISTAS_POR_OMISSAO: readonly VistaPorOmissao[] = [
  { nome: "Meu dia", ordem: 0, principal: true, sistema: true, posicoes: MEU_DIA },
  { nome: "Fecho mensal", ordem: 1, principal: false, sistema: true, posicoes: FECHO_MENSAL },
  { nome: "Clientes", ordem: 2, principal: false, sistema: true, posicoes: CLIENTES },
  { nome: "Fiscal", ordem: 3, principal: false, sistema: true, posicoes: FISCAL },
];

/**
 * Constrói o layout de uma vista por omissão.
 *
 * Passa por `validarLayout` de propósito: as omissões não têm direito a
 * uma porta lateral. Se uma posição escrita à mão transbordasse a grelha
 * ou colidisse, é aqui que se corrige — e não num painel que abre torto.
 */
export function layoutDaOmissao(
  posicoes: readonly Pos[],
  novoId: () => string,
): WorkspaceLayoutV2 {
  const items: WorkspaceWidgetInstance[] = posicoes.map(([type, col, row, colSpan, rowSpan]) => {
    const desktop: GridPlacement = { col, row, colSpan, rowSpan };
    return {
      instanceId: novoId(),
      type,
      // Uma instância por tipo em cada vista de omissão, logo o sufixo é 01.
      tag: `${TAG_BASE[type]}-01`,
      configVersion: 1,
      desktop,
      // `tablet` e `mobile` saem de `validarLayout`, abaixo. Escrevê-los
      // aqui era uma segunda derivação a envelhecer em paralelo — e a de
      // tablet, feita módulo a módulo, produzia sobreposições.
    };
  });

  return validarLayout({
    version: 2,
    revision: 1,
    grid: { desktop: { ...GRID_DESKTOP }, tablet: { ...GRID_TABLET } },
    items,
  }).layout;
}
