// ═══════════════════════════════════════════════════════════════════════
//  SELEÇÃO, FILTROS E RANKING — a lógica que o hub consome
//  ---------------------------------------------------------------------
//  Puro e sem dependências: corre no servidor (grelha inicial) e no cliente
//  (filtrar enquanto se escreve) com o mesmo código e o mesmo resultado.
//
//  Nenhuma dependência nova para filtrar 14–20 itens (§13.3). Um `filter`
//  sobre catorze objetos não precisa de um motor de pesquisa; precisa de
//  uma função de pontuação honesta e de um desempate estável.
// ═══════════════════════════════════════════════════════════════════════

import { CATALOGO_FERRAMENTAS, PERCURSOS } from "./catalogo";
import type {
  ToolDefinition, ToolIntent, ToolKind, ToolPathway, ToolProfile,
} from "./tipos";

/** Ferramentas visíveis no hub. A contagem do produto sai daqui. */
export const FERRAMENTAS_ATIVAS: ToolDefinition[] = CATALOGO_FERRAMENTAS.filter(
  (f) => f.surfaces.includes("hub"),
);

/** A contagem real (§2.3). Guias e Quiz não entram — não são ferramentas. */
export const TOTAL_FERRAMENTAS = FERRAMENTAS_ATIVAS.length;

export const porId = (id: string): ToolDefinition | undefined =>
  CATALOGO_FERRAMENTAS.find((f) => f.id === id);

export const porSlug = (slug: string): ToolDefinition | undefined =>
  CATALOGO_FERRAMENTAS.find((f) => f.slug === slug);

/** A ferramenta a que um caminho corresponde — pública ou do painel. */
export function porHref(href: string): ToolDefinition | undefined {
  const limpo = href.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
  return CATALOGO_FERRAMENTAS.find(
    (f) => f.canonicalHref === limpo || f.dashboardHref === limpo,
  );
}

/** Curadoria explícita primeiro; depois prioridade; depois alfabética. */
export function ordenarCurado(lista: ToolDefinition[]): ToolDefinition[] {
  return [...lista].sort((a, b) => {
    const ra = a.featuredRank ?? Number.POSITIVE_INFINITY;
    const rb = b.featuredRank ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    if (a.searchPriority !== b.searchPriority) return b.searchPriority - a.searchPriority;
    return a.title.localeCompare(b.title, "pt-PT");
  });
}

/** As três ferramentas de «Começa por aqui», sensíveis ao contexto. */
export function comecarPorAqui(perfil?: ToolProfile): ToolDefinition[] {
  const base = perfil
    ? FERRAMENTAS_ATIVAS.filter((f) => f.profiles.includes(perfil))
    : FERRAMENTAS_ATIVAS;
  const ordenadas = ordenarCurado(base.length > 0 ? base : FERRAMENTAS_ATIVAS);
  return ordenadas.slice(0, 3);
}

export interface FiltrosFerramentas {
  q?: string;
  perfil?: ToolProfile;
  objetivo?: ToolIntent;
  tema?: string;
  tipo?: ToolKind;
}

/** Acentos e caixa fora: «heranças» e «herancas» têm de encontrar o mesmo. */
export const normalizar = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Pontuação de uma ferramenta face a um texto livre.
 *
 * Devolve 0 quando não há correspondência — o chamador filtra por > 0. Os
 * pesos são deliberadamente grosseiros: com catorze itens, o que importa é
 * que o título ganhe ao alias e o alias ganhe à descrição.
 */
export function pontuar(f: ToolDefinition, consulta: string): number {
  const q = normalizar(consulta);
  if (!q) return 1;
  const termos = q.split(/\s+/).filter(Boolean);
  if (termos.length === 0) return 1;

  const titulo = normalizar(f.title);
  const resultado = normalizar(f.shortOutcome);
  const descricao = normalizar(f.description);
  const aliases = f.aliases.map(normalizar);
  const temas = f.topics.map(normalizar);

  // Bónus de consulta inteira. Sem ele, «recibos verdes» era ganho pelo
  // comparador — cujo título COMEÇA por «Recibos verdes, contrato ou
  // empresa?» — em vez do simulador de recibos verdes, que é literalmente
  // o que a pessoa escreveu. Somar termo a termo premeia quem tem as
  // palavras cedo no título; o que importa aqui é quem É a coisa procurada.
  let bonus = 0;
  if (aliases.includes(q)) bonus += 400;
  else if (titulo === q) bonus += 500;
  else if (aliases.some((a) => a.startsWith(q))) bonus += 150;

  let total = bonus;
  for (const termo of termos) {
    let melhor = 0;
    if (titulo.startsWith(termo)) melhor = 100;
    else if (titulo.includes(termo)) melhor = 70;
    if (melhor < 60 && aliases.some((a) => a === termo)) melhor = 60;
    if (melhor < 50 && aliases.some((a) => a.startsWith(termo))) melhor = 50;
    if (melhor < 40 && aliases.some((a) => a.includes(termo))) melhor = 40;
    if (melhor < 30 && temas.some((t) => t.includes(termo))) melhor = 30;
    if (melhor < 20 && resultado.includes(termo)) melhor = 20;
    if (melhor < 10 && descricao.includes(termo)) melhor = 10;
    // Todos os termos têm de pontuar: «salário empresa» não pode devolver
    // tudo o que fala de salário OU de empresa.
    if (melhor === 0) return 0;
    total += melhor;
  }
  return total;
}

/** Aplica filtros e devolve a lista já ordenada por relevância e curadoria. */
export function selecionar(
  filtros: FiltrosFerramentas,
  lista: ToolDefinition[] = FERRAMENTAS_ATIVAS,
): ToolDefinition[] {
  const { q, perfil, objetivo, tema, tipo } = filtros;

  const filtradas = lista.filter((f) => {
    if (perfil && !f.profiles.includes(perfil)) return false;
    if (objetivo && !f.intents.includes(objetivo)) return false;
    if (tema && !f.topics.includes(tema)) return false;
    if (tipo && f.kind !== tipo) return false;
    return true;
  });

  if (!q?.trim()) return ordenarCurado(filtradas);

  return filtradas
    .map((f) => ({ f, p: pontuar(f, q) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => {
      if (a.p !== b.p) return b.p - a.p;
      if (a.f.searchPriority !== b.f.searchPriority) {
        return b.f.searchPriority - a.f.searchPriority;
      }
      return a.f.title.localeCompare(b.f.title, "pt-PT");
    })
    .map((x) => x.f);
}

/** Agrupamento por objetivo, na ordem editorial da taxonomia (§4.3). */
export const ORDEM_OBJETIVOS: ToolIntent[] = ["calcular", "comparar", "verificar", "cumprir"];

export function agruparPorObjetivo(
  lista: ToolDefinition[] = FERRAMENTAS_ATIVAS,
): Array<{ objetivo: ToolIntent; ferramentas: ToolDefinition[] }> {
  return ORDEM_OBJETIVOS.map((objetivo) => ({
    objetivo,
    ferramentas: ordenarCurado(lista.filter((f) => f.intents.includes(objetivo))),
  })).filter((g) => g.ferramentas.length > 0);
}

/** Temas presentes no catálogo, com contagem — os filtros não inventam opções. */
export function temasDisponiveis(
  lista: ToolDefinition[] = FERRAMENTAS_ATIVAS,
): Array<{ tema: string; total: number }> {
  const contagem = new Map<string, number>();
  for (const f of lista) {
    for (const t of f.topics) contagem.set(t, (contagem.get(t) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([tema, total]) => ({ tema, total }))
    .sort((a, b) => b.total - a.total || a.tema.localeCompare(b.tema, "pt-PT"));
}

/** Tipos presentes no catálogo, com contagem. */
export function tiposDisponiveis(
  lista: ToolDefinition[] = FERRAMENTAS_ATIVAS,
): Array<{ tipo: ToolKind; total: number }> {
  const contagem = new Map<ToolKind, number>();
  for (const f of lista) contagem.set(f.kind, (contagem.get(f.kind) ?? 0) + 1);
  return [...contagem.entries()]
    .map(([tipo, total]) => ({ tipo, total }))
    .sort((a, b) => b.total - a.total);
}

/** Ferramentas relacionadas, resolvidas e sem a própria. */
export function relacionadas(f: ToolDefinition): ToolDefinition[] {
  return f.relatedToolIds
    .map(porId)
    .filter((r): r is ToolDefinition => r !== undefined && r.id !== f.id);
}

/** Percursos que passam por esta ferramenta. */
export function percursosCom(toolId: string): ToolPathway[] {
  return PERCURSOS.filter((p) => p.steps.some((s) => s.toolId === toolId));
}

/** Percurso com as ferramentas já resolvidas — para renderizar sem lookups. */
export function resolverPercurso(p: ToolPathway): Array<{
  ferramenta: ToolDefinition;
  note: string;
}> {
  return p.steps
    .map((s) => ({ ferramenta: porId(s.toolId), note: s.note }))
    .filter((x): x is { ferramenta: ToolDefinition; note: string } => Boolean(x.ferramenta));
}

/** Slugs públicos — o que o sitemap e `seo.ts` consomem. */
export const SLUGS_PUBLICOS: string[] = CATALOGO_FERRAMENTAS
  .filter((f) => f.surfaces.includes("sitemap"))
  .map((f) => f.slug);

/** Um filtro ativo conta para o resumo «3 filtros ativos» do telemóvel. */
export function contarFiltrosAtivos(f: FiltrosFerramentas): number {
  return [f.q?.trim(), f.perfil, f.objetivo, f.tema, f.tipo].filter(Boolean).length;
}
