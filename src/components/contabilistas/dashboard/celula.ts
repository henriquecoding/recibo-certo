/**
 * As coordenadas de uma célula, como variáveis CSS.
 *
 * Porquê variáveis e não `gridColumn` escrito inline: um estilo inline
 * ganha a qualquer regra do módulo CSS, incluindo à que aplica a colocação
 * de tablet. Enquanto a grelha escrevia `gridColumn` diretamente, o painel
 * usava coordenadas de doze colunas numa grelha de oito entre os 640 e os
 * 1023px — e o CSS Grid respondia a isso criando faixas implícitas, o que
 * torcia a linha inteira.
 *
 * Escrevendo os dois conjuntos de coordenadas como variáveis, é o CSS que
 * escolhe qual usar. Sem `matchMedia`, sem render ao redimensionar, e sem
 * diferença entre o que o servidor desenha e o que o cliente hidrata.
 */

import type { CSSProperties } from "react";
import { derivarTablet } from "@/lib/contabilistas/dashboard/layout";
import type { GridPlacement, WorkspaceWidgetInstance } from "@/lib/contabilistas/dashboard/tipos";

export function estiloDaCelula(
  item: WorkspaceWidgetInstance,
  /** Geometria a usar no desktop. A grelha de edição passa o alvo do arrasto. */
  desktop: GridPlacement = item.desktop,
): CSSProperties {
  // `item.tablet` vem sempre preenchido por `validarLayout`. O `??` cobre
  // um item acabado de construir em memória que ainda não passou por lá.
  const tablet = item.tablet ?? derivarTablet(desktop);

  return {
    "--col": desktop.col,
    "--row": desktop.row,
    "--span": desktop.colSpan,
    "--rowspan": desktop.rowSpan,
    "--col-t": tablet.col,
    "--row-t": tablet.row,
    "--span-t": tablet.colSpan,
    "--rowspan-t": tablet.rowSpan,
    order: item.mobile?.order ?? 0,
  } as CSSProperties;
}
