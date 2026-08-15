/**
 * Contrato de layout do painel modular — V2.
 *
 * A persistência usa unidades de grelha, nunca pixels. `left: 423px` é
 * frágil, muda com o viewport, é difícil de migrar e produz escritas a
 * cada `pointermove`. `col/row/colSpan/rowSpan` reconstrói o painel de
 * forma determinística a partir de quatro inteiros por módulo.
 *
 * Relatório Mestre §5.3–5.5.
 */

export type WorkspaceBreakpoint = "desktop" | "tablet" | "mobile";

export type WidgetType =
  | "agenda_hoje"
  | "precisam_atencao"
  | "prazos_proximos"
  | "partilhas_recebidas"
  | "simulacoes_recebidas"
  | "documentos_rever"
  | "atividade_semana"
  | "centro_avisos"
  | "estado_trabalho"
  | "clientes"
  | "casos"
  | "fidelidade"
  | "progressao_comissao"
  | "casos_em_risco"
  | "comunicacoes_recentes"
  | "resumo_por_cliente";

export type WidgetSize = "S" | "M" | "L" | "XL";
export type WidgetDensity = "compact" | "normal" | "expanded" | "full";

export interface GridDefinition {
  columns: number;
  rowHeight: number;
  gap: number;
}

export interface GridPlacement {
  /** 1-based. Legível em debug e em mensagens de acessibilidade. */
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export interface MobilePlacement {
  order: number;
  size: Extract<WidgetSize, "S" | "M" | "L">;
  hidden?: boolean;
}

/**
 * Preferências de APRESENTAÇÃO. Nada aqui pode identificar um cliente
 * nem transportar um valor fiscal — a RPC recusa chaves fora desta
 * lista e o mesmo contrato existe em SQL (§5.6).
 */
export interface WidgetPresentationConfig {
  density?: WidgetDensity;
  maxItems?: number;
  showCompleted?: boolean;
  sort?: "deadline" | "recent" | "alpha";
  periodo?: "hoje" | "semana" | "mes";
  agrupar?: "estado" | "cliente" | "nenhum";
}

export interface WorkspaceWidgetInstance {
  /** UUID técnico. Nunca é a identificação mostrada ao utilizador. */
  instanceId: string;
  type: WidgetType;
  /** Etiqueta curta e estável: AGD-01, PRZ-01. Visível em modo de edição. */
  tag: string;
  configVersion: number;
  config?: WidgetPresentationConfig;
  desktop: GridPlacement;
  tablet?: GridPlacement;
  mobile?: MobilePlacement;
  hidden?: boolean;
}

export interface WorkspaceLayoutV2 {
  version: 2;
  revision: number;
  grid: { desktop: GridDefinition; tablet: GridDefinition };
  items: WorkspaceWidgetInstance[];
}

export interface WorkspaceView {
  id: string;
  nome: string;
  ordem: number;
  principal: boolean;
  sistema: boolean;
  revision: number;
  layout: WorkspaceLayoutV2;
}

/** Formato antigo, mantido só para migrar layouts já gravados. */
export interface WorkspaceLayoutV1 {
  version: 1;
  items: Array<{
    id: string;
    type: WidgetType;
    config?: Record<string, unknown>;
    desktop: { x: number; y: number; w: number; h: number };
    hidden?: boolean;
  }>;
}

export type CodigoErroLayout =
  | "layout_nao_e_objeto"
  | "versao_nao_suportada"
  | "items_nao_e_lista"
  | "demasiados_modulos"
  | "instanceId_invalido"
  | "instanceId_repetido"
  | "tipo_desconhecido"
  | "tag_invalida"
  | "tag_nao_corresponde_ao_tipo"
  | "tag_repetida"
  | "config_com_chave_nao_permitida"
  | "col_invalida"
  | "row_invalida"
  | "colSpan_invalido"
  | "rowSpan_invalido"
  | "modulo_transborda_a_grelha"
  | "colSpan_fora_do_registry"
  | "rowSpan_fora_do_registry"
  | "modulos_sobrepostos";

export interface ResultadoValidacao {
  valido: boolean;
  erros: Array<{ codigo: CodigoErroLayout; tag?: string; detalhe?: string }>;
  /** Layout normalizado: sempre devolvido, mesmo com erros recuperáveis. */
  layout: WorkspaceLayoutV2;
}
