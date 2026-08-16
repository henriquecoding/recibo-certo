/**
 * Geometria pura do painel: validação, normalização, colisões, tags,
 * derivação de tablet/mobile e migração V1→V2.
 *
 * Sem React, sem Supabase, sem `window`. É a camada testável. A RPC
 * `guardar_dashboard_layout` repete as invariantes essenciais em SQL —
 * este ficheiro existe para dar resposta imediata ao utilizador, não
 * para ser a única guarda.
 *
 * Relatório Mestre §5.9, §5.10, §5.11.
 */

import {
  MODULOS, definicao, type WidgetDefinition,
} from "./modulos";
import type {
  GridDefinition, GridPlacement, ResultadoValidacao, WidgetType,
  WorkspaceLayoutV1, WorkspaceLayoutV2, WorkspaceWidgetInstance,
} from "./tipos";

export const GRID_DESKTOP: GridDefinition = { columns: 12, rowHeight: 52, gap: 12 };
export const GRID_TABLET: GridDefinition = { columns: 8, rowHeight: 52, gap: 12 };

export const MAX_MODULOS_POR_VISTA = 24;
export const MAX_VISTAS = 8;
export const MAX_LINHA = 60;

const CHAVES_CONFIG = new Set([
  "density", "maxItems", "showCompleted", "sort", "periodo", "agrupar",
]);

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RE_TAG = /^[A-Z]{3}-\d{2}$/;

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/* ------------------------------------------------------------------ */
/* Tags                                                                */
/* ------------------------------------------------------------------ */

/**
 * Etiqueta curta e estável por instância. `#1`, `#2`, `#3` deixam de
 * fazer sentido assim que se remove um módulo do meio; `AGD-01`
 * continua legível e continua a apontar para o mesmo cartão.
 */
export function proximaTag(type: WidgetType, existentes: ReadonlyArray<string>): string {
  const base = MODULOS[type].tagBase;
  const usados = new Set(
    existentes.filter((t) => t.startsWith(`${base}-`)).map((t) => Number(t.slice(4))),
  );
  let n = 1;
  while (usados.has(n)) n += 1;
  return `${base}-${String(n).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Colisões                                                            */
/* ------------------------------------------------------------------ */

const cruza = (a: GridPlacement, b: GridPlacement): boolean =>
  a.col < b.col + b.colSpan && b.col < a.col + a.colSpan &&
  a.row < b.row + b.rowSpan && b.row < a.row + a.rowSpan;

export function colide(
  alvo: GridPlacement,
  outros: ReadonlyArray<GridPlacement>,
): boolean {
  return outros.some((o) => cruza(alvo, o));
}

/**
 * Compactação conservadora (§5.10).
 *
 * A regra de UX é: o módulo movido muda; os vizinhos só mudam se for
 * mesmo preciso resolver a colisão. Um "Tetris" automático que
 * reorganiza cinco cartões por causa de um arrasto destrói a
 * previsibilidade — e engorda o diff que vai ser persistido.
 */
export function resolverColisoes(
  items: WorkspaceWidgetInstance[],
  movidoId: string,
  columns = GRID_DESKTOP.columns,
): WorkspaceWidgetInstance[] {
  const out = items.map((i) => ({ ...i, desktop: { ...i.desktop } }));
  const movido = out.find((i) => i.instanceId === movidoId);
  if (!movido) return out;

  const visiveis = () => out.filter((i) => !i.hidden);
  let guarda = 0;

  // Empurra para baixo apenas quem realmente choca, em cascata.
  for (;;) {
    if (guarda++ > 200) break;
    const fixos = [movido];
    const restantes = visiveis()
      .filter((i) => i.instanceId !== movidoId)
      .sort((a, b) => a.desktop.row - b.desktop.row || a.desktop.col - b.desktop.col);

    let houve = false;
    for (const item of restantes) {
      const conflito = fixos.find((f) => cruza(item.desktop, f.desktop));
      if (conflito) {
        const novaLinha = conflito.desktop.row + conflito.desktop.rowSpan;
        if (item.desktop.row !== novaLinha) {
          item.desktop.row = novaLinha;
          houve = true;
        }
      }
      fixos.push(item);
    }
    if (!houve) break;
  }

  for (const i of out) {
    i.desktop.col = clamp(i.desktop.col, 1, Math.max(1, columns - i.desktop.colSpan + 1));
    i.desktop.row = clamp(i.desktop.row, 1, MAX_LINHA);
  }
  return out;
}

/** Sobe tudo o que puder subir sem colidir. Evita buracos após remoções. */
export function compactarVertical(items: WorkspaceWidgetInstance[]): WorkspaceWidgetInstance[] {
  const out = items
    .map((i) => ({ ...i, desktop: { ...i.desktop } }))
    .sort((a, b) => a.desktop.row - b.desktop.row || a.desktop.col - b.desktop.col);

  const colocados: GridPlacement[] = [];
  for (const item of out) {
    if (item.hidden) continue;
    let row = 1;
    while (colide({ ...item.desktop, row }, colocados)) row += 1;
    item.desktop.row = row;
    colocados.push({ ...item.desktop });
  }
  return out;
}

/** Primeiro sítio livre para um módulo novo vindo da biblioteca. */
export function primeiroEncaixe(
  colSpan: number,
  rowSpan: number,
  ocupados: ReadonlyArray<GridPlacement>,
  columns = GRID_DESKTOP.columns,
): GridPlacement {
  for (let row = 1; row <= MAX_LINHA; row += 1) {
    for (let col = 1; col <= columns - colSpan + 1; col += 1) {
      const cand = { col, row, colSpan, rowSpan };
      if (!colide(cand, ocupados)) return cand;
    }
  }
  return { col: 1, row: MAX_LINHA, colSpan, rowSpan };
}

/* ------------------------------------------------------------------ */
/* Derivação responsiva (§5.11)                                        */
/* ------------------------------------------------------------------ */

/**
 * Tablet é derivado do desktop até o contabilista personalizar nesse
 * breakpoint. Guardar três painéis independentes desde o início
 * duplicaria coordenadas sem ninguém ter pedido nada.
 */
export function derivarTablet(desktop: GridPlacement, colunasTablet = GRID_TABLET.columns): GridPlacement {
  const escala = colunasTablet / GRID_DESKTOP.columns;
  const colSpan = clamp(Math.round(desktop.colSpan * escala), 1, colunasTablet);
  const col = clamp(Math.round((desktop.col - 1) * escala) + 1, 1, colunasTablet - colSpan + 1);
  return { col, row: desktop.row, colSpan, rowSpan: desktop.rowSpan };
}

/**
 * Mobile é uma lista, não uma matriz espremida. A ordem sai da leitura
 * natural do desktop: de cima para baixo, da esquerda para a direita.
 */
export function derivarMobile(
  items: ReadonlyArray<WorkspaceWidgetInstance>,
): Array<{ instanceId: string; order: number; size: "S" | "M" | "L" }> {
  return [...items]
    .sort((a, b) => a.desktop.row - b.desktop.row || a.desktop.col - b.desktop.col)
    .map((item, idx) => {
      const area = item.desktop.colSpan * item.desktop.rowSpan;
      const size: "S" | "M" | "L" = area >= 36 ? "L" : area >= 12 ? "M" : "S";
      return { instanceId: item.instanceId, order: idx + 1, size: item.mobile?.size ?? size };
    });
}

/* ------------------------------------------------------------------ */
/* Validação e normalização                                            */
/* ------------------------------------------------------------------ */

function normalizarConfig(config: unknown): Record<string, unknown> | undefined {
  if (!config || typeof config !== "object" || Array.isArray(config)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config as Record<string, unknown>)) {
    if (CHAVES_CONFIG.has(k)) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizarPlacement(
  p: Partial<GridPlacement> | undefined,
  def: WidgetDefinition,
  columns: number,
): GridPlacement {
  const colSpan = clamp(
    Math.round(p?.colSpan ?? def.posicaoPadrao.colSpan),
    def.colSpan.min,
    Math.min(def.colSpan.max, columns),
  );
  const rowSpan = clamp(
    Math.round(p?.rowSpan ?? def.posicaoPadrao.rowSpan),
    def.rowSpan.min,
    def.rowSpan.max,
  );
  const col = clamp(Math.round(p?.col ?? 1), 1, Math.max(1, columns - colSpan + 1));
  const row = clamp(Math.round(p?.row ?? 1), 1, MAX_LINHA);
  return { col, row, colSpan, rowSpan };
}

export function validarLayout(entrada: unknown): ResultadoValidacao {
  const erros: ResultadoValidacao["erros"] = [];
  const vazio: WorkspaceLayoutV2 = {
    version: 2, revision: 1,
    grid: { desktop: { ...GRID_DESKTOP }, tablet: { ...GRID_TABLET } },
    items: [],
  };

  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    return { valido: false, erros: [{ codigo: "layout_nao_e_objeto" }], layout: vazio };
  }

  const bruto = entrada as Partial<WorkspaceLayoutV2>;
  if (bruto.version !== 2) {
    return { valido: false, erros: [{ codigo: "versao_nao_suportada" }], layout: vazio };
  }
  if (!Array.isArray(bruto.items)) {
    return { valido: false, erros: [{ codigo: "items_nao_e_lista" }], layout: vazio };
  }

  const columns = bruto.grid?.desktop?.columns ?? GRID_DESKTOP.columns;
  const items: WorkspaceWidgetInstance[] = [];
  const idsVistos = new Set<string>();
  const tagsVistas = new Set<string>();

  for (const raw of bruto.items.slice(0, MAX_MODULOS_POR_VISTA)) {
    const item = raw as Partial<WorkspaceWidgetInstance>;
    const def = definicao(String(item.type));

    // Um `type` desconhecido é descartado, nunca montado. É assim que
    // um layout adulterado não consegue pedir um componente arbitrário.
    if (!def) {
      erros.push({ codigo: "tipo_desconhecido", detalhe: String(item.type) });
      continue;
    }
    if (typeof item.instanceId !== "string" || !RE_UUID.test(item.instanceId)) {
      erros.push({ codigo: "instanceId_invalido", detalhe: def.type });
      continue;
    }
    if (idsVistos.has(item.instanceId)) {
      erros.push({ codigo: "instanceId_repetido", detalhe: item.instanceId });
      continue;
    }
    idsVistos.add(item.instanceId);

    let tag = typeof item.tag === "string" ? item.tag : "";
    if (!RE_TAG.test(tag)) { erros.push({ codigo: "tag_invalida", detalhe: tag }); tag = ""; }
    else if (!tag.startsWith(`${def.tagBase}-`)) {
      erros.push({ codigo: "tag_nao_corresponde_ao_tipo", tag });
      tag = "";
    } else if (tagsVistas.has(tag)) { erros.push({ codigo: "tag_repetida", tag }); tag = ""; }
    if (!tag) tag = proximaTag(def.type, [...tagsVistas]);
    tagsVistas.add(tag);

    const configOriginal = item.config as Record<string, unknown> | undefined;
    const config = normalizarConfig(configOriginal);
    if (configOriginal && Object.keys(configOriginal).some((k) => !CHAVES_CONFIG.has(k))) {
      erros.push({ codigo: "config_com_chave_nao_permitida", tag });
    }

    const desktop = normalizarPlacement(item.desktop, def, columns);
    if (item.desktop && (item.desktop.col + item.desktop.colSpan - 1 > columns)) {
      erros.push({ codigo: "modulo_transborda_a_grelha", tag });
    }

    const novo: WorkspaceWidgetInstance = {
      instanceId: item.instanceId,
      type: def.type,
      tag,
      configVersion: typeof item.configVersion === "number" ? item.configVersion : 1,
      desktop,
      tablet: item.tablet
        ? normalizarPlacement(item.tablet, def, bruto.grid?.tablet?.columns ?? GRID_TABLET.columns)
        : derivarTablet(desktop, bruto.grid?.tablet?.columns ?? GRID_TABLET.columns),
      ...(config ? { config } : {}),
      ...(item.hidden ? { hidden: true as const } : {}),
    };
    items.push(novo);
  }

  // Sobreposições: resolve-as em vez de recusar o layout inteiro. Um
  // painel que não abre é pior do que um painel arrumado.
  //
  // ⚠️ A comparação é por `instanceId` e NÃO por índice. `compactarVertical`
  // devolve o array ORDENADO por (row, col): comparar `arrumados[i]` com
  // `antes[i]` põe lado a lado módulos que não são o mesmo módulo, e
  // qualquer layout guardado fora dessa ordem era assinalado como
  // sobreposto sem ter uma única célula em comum.
  const antes = new Map(items.map((i) => [i.instanceId, i.desktop.row]));
  const arrumados = compactarVertical(items);
  if (arrumados.some((i) => antes.get(i.instanceId) !== i.desktop.row)) {
    erros.push({ codigo: "modulos_sobrepostos" });
  }

  const mobile = derivarMobile(arrumados);
  for (const item of arrumados) {
    const m = mobile.find((x) => x.instanceId === item.instanceId);
    if (m) item.mobile = { order: m.order, size: m.size, ...(item.hidden ? { hidden: true } : {}) };
  }

  return {
    valido: erros.length === 0,
    erros,
    layout: {
      version: 2,
      revision: typeof bruto.revision === "number" ? bruto.revision : 1,
      grid: {
        desktop: bruto.grid?.desktop ?? { ...GRID_DESKTOP },
        tablet: bruto.grid?.tablet ?? { ...GRID_TABLET },
      },
      items: arrumados,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Migração V1 → V2                                                    */
/* ------------------------------------------------------------------ */

export function migrarV1(v1: WorkspaceLayoutV1, novoId: () => string): WorkspaceLayoutV2 {
  const tags: string[] = [];
  const items: WorkspaceWidgetInstance[] = [];
  for (const antigo of v1.items) {
    const def = definicao(antigo.type);
    if (!def) continue;               // módulo que já não existe desaparece em silêncio
    const tag = proximaTag(def.type, tags);
    tags.push(tag);
    const desktop: GridPlacement = {
      col: clamp(Math.round(antigo.desktop.x) + 1, 1, GRID_DESKTOP.columns),
      row: clamp(Math.round(antigo.desktop.y) + 1, 1, MAX_LINHA),
      colSpan: clamp(Math.round(antigo.desktop.w), def.colSpan.min, def.colSpan.max),
      rowSpan: clamp(Math.round(antigo.desktop.h), def.rowSpan.min, def.rowSpan.max),
    };
    items.push({
      instanceId: RE_UUID.test(antigo.id) ? antigo.id : novoId(),
      type: def.type, tag, configVersion: 1, desktop,
      tablet: derivarTablet(desktop),
      ...(antigo.hidden ? { hidden: true as const } : {}),
    });
  }
  return validarLayout({
    version: 2, revision: 1,
    grid: { desktop: { ...GRID_DESKTOP }, tablet: { ...GRID_TABLET } },
    items,
  }).layout;
}

/* ------------------------------------------------------------------ */
/* Diff canónico (§12.13)                                              */
/* ------------------------------------------------------------------ */

/**
 * Concluir a edição sem ter mudado nada não deve gerar uma escrita.
 * Comparar JSON cru falharia por ordem incidental de propriedades, por
 * isso normaliza-se primeiro.
 */
export function assinaturaCanonica(layout: WorkspaceLayoutV2): string {
  const items = [...layout.items]
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId))
    .map((i) => [
      i.instanceId, i.type, i.tag, i.hidden ? 1 : 0,
      i.desktop.col, i.desktop.row, i.desktop.colSpan, i.desktop.rowSpan,
      i.tablet ? `${i.tablet.col},${i.tablet.row},${i.tablet.colSpan},${i.tablet.rowSpan}` : "-",
      i.mobile ? `${i.mobile.order},${i.mobile.size}` : "-",
      i.config ? JSON.stringify(Object.entries(i.config).sort()) : "-",
    ].join(":"));
  return `${layout.version}|${layout.grid.desktop.columns}|${items.join("|")}`;
}

export function mudou(a: WorkspaceLayoutV2, b: WorkspaceLayoutV2): boolean {
  return assinaturaCanonica(a) !== assinaturaCanonica(b);
}
