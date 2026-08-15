/**
 * Derivações de APRESENTAÇÃO do painel modular.
 *
 * Vive à parte de `layout.ts` e `modulos.ts` — esses vieram do pacote de
 * implementação auditado e há testes que os comparam com o SQL. O que é
 * só da interface fica aqui, para os dois não se misturarem.
 */

import { MODULOS } from "./modulos";
import type { GridPlacement, WidgetSize, WidgetType } from "./tipos";

/**
 * A etiqueta S/M/L/XL que o modo de edição mostra no canto do módulo.
 *
 * Deriva da ÁREA ocupada, e os limiares são os que reproduzem as
 * etiquetas da referência A: Agenda 4×5 é «L», Precisam de atenção 4×4 é
 * «M», Atividade 6×4 é «L», Estado do trabalho 12×6 é «XL». Não é um
 * campo guardado: guardá-lo permitia que a etiqueta e a geometria
 * divergissem, e a etiqueta existe precisamente para descrever a
 * geometria.
 */
export function tamanhoDaGeometria(colSpan: number, rowSpan: number): WidgetSize {
  const area = Math.max(1, colSpan) * Math.max(1, rowSpan);
  if (area >= 48) return "XL";
  if (area >= 20) return "L";
  if (area >= 12) return "M";
  return "S";
}

export function tamanhoDoModulo(p: GridPlacement): WidgetSize {
  return tamanhoDaGeometria(p.colSpan, p.rowSpan);
}

/**
 * O passo seguinte no ciclo de tamanhos, para o menu «Tamanho» e para o
 * atalho de teclado. Só devolve tamanhos que o registry permite àquele
 * módulo — o Kanban não desce a S, e a Fidelidade não sobe a XL.
 */
export function tamanhosPermitidos(type: WidgetType): WidgetSize[] {
  return [...MODULOS[type].tamanhos];
}

/** Geometria-alvo para um tamanho pedido pelo menu, dentro dos limites. */
export function geometriaDoTamanho(
  type: WidgetType,
  tamanho: WidgetSize,
  atual: GridPlacement,
): GridPlacement {
  const def = MODULOS[type];
  const alvo: Record<WidgetSize, { colSpan: number; rowSpan: number }> = {
    S: { colSpan: 3, rowSpan: 3 },
    M: { colSpan: 4, rowSpan: 3 },
    L: { colSpan: 6, rowSpan: 4 },
    XL: { colSpan: 12, rowSpan: 6 },
  };
  const pedido = alvo[tamanho];
  const colSpan = Math.min(Math.max(pedido.colSpan, def.colSpan.min), def.colSpan.max);
  const rowSpan = Math.min(Math.max(pedido.rowSpan, def.rowSpan.min), def.rowSpan.max);
  return { ...atual, colSpan, rowSpan };
}

/**
 * «M · Lista», «XL · Kanban», «L · Gráfico».
 *
 * A biblioteca da referência A diz o tamanho e o formato ANTES de se
 * arrastar. Saber o que vai acontecer ao painel antes de o mudar é o que
 * torna o modo de edição confiável, e é por isso que esta legenda não é
 * decorativa.
 */
const NOME_DO_FORMATO: Record<string, string> = {
  lista: "Lista",
  kanban: "Kanban",
  grafico: "Gráfico",
  tabela: "Tabela",
  cartao: "Cartão",
  timeline: "Lista",
};

export function legendaDaBiblioteca(type: WidgetType): string {
  const def = MODULOS[type];
  const tamanho = tamanhoDaGeometria(def.posicaoPadrao.colSpan, def.posicaoPadrao.rowSpan);
  return `${tamanho} · ${NOME_DO_FORMATO[def.formato] ?? "Lista"}`;
}

/**
 * As classes de cor por tom, nos dois temas.
 *
 * O verde da marca é ação e marca; rosa/azul/lilás/areia são categoria;
 * o alerta é prazo e atenção. Um painel todo verde perdia a distinção
 * (§3.2 do Relatório Mestre).
 */
export const CLASSES_DO_TOM: Record<string, { icone: string; fundo: string }> = {
  brand: {
    icone: "text-brand-dark dark:text-brand-mint",
    fundo: "bg-brand-light/70 dark:bg-brand/12",
  },
  rosa: {
    icone: "text-categoria-rosa-text dark:text-rose-300",
    fundo: "bg-categoria-rosa-bg dark:bg-rose-500/10",
  },
  azul: {
    icone: "text-categoria-azul-text dark:text-sky-300",
    fundo: "bg-categoria-azul-bg dark:bg-sky-500/10",
  },
  lilas: {
    icone: "text-categoria-lilas-text dark:text-violet-300",
    fundo: "bg-categoria-lilas-bg dark:bg-violet-500/10",
  },
  areia: {
    icone: "text-categoria-areia-text dark:text-amber-300",
    fundo: "bg-categoria-areia-bg dark:bg-amber-500/10",
  },
  alert: {
    icone: "text-alert-text dark:text-amber-300",
    fundo: "bg-alert-bg dark:bg-amber-500/10",
  },
};

export function classesDoTom(type: WidgetType) {
  return CLASSES_DO_TOM[MODULOS[type].tom] ?? CLASSES_DO_TOM.brand;
}

/**
 * O anúncio para leitores de ecrã depois de mover um módulo.
 *
 * A §10 exige que o teclado consiga o que o rato consegue, e que a
 * mudança seja anunciada — «Agenda movida para coluna 2, linha 1». A tag
 * entra na frase porque é o que identifica o cartão de forma legível.
 */
export function anuncioDeMovimento(tag: string, titulo: string, p: GridPlacement): string {
  return `${titulo} (${tag}) movido para coluna ${p.col}, linha ${p.row}.`;
}

export function anuncioDeTamanho(tag: string, titulo: string, p: GridPlacement): string {
  return `${titulo} (${tag}) redimensionado para ${p.colSpan} colunas por ${p.rowSpan} linhas, tamanho ${tamanhoDoModulo(p)}.`;
}
