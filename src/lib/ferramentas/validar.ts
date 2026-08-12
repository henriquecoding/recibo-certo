// ═══════════════════════════════════════════════════════════════════════
//  INVARIANTES DO CATÁLOGO — §7.4 do relatório do hub
//  ---------------------------------------------------------------------
//  Mesmo padrão de `assertFiscalDataIntegrity()`: a asserção corre ao
//  importar o catálogo, portanto o build FALHA se alguém partir uma regra.
//  Não é disciplina, é construção — a mesma razão por que o popup de
//  Novidades não pode carregar meses antigos: eles não estão lá.
//
//  O que fica de fora daqui e vive no teste (`ferramentas.test.ts`) são as
//  invariantes que precisam do sistema de ficheiros: «toda a ferramenta tem
//  página» e «toda a página está no catálogo». Um módulo do cliente não lê
//  o disco; um teste lê.
// ═══════════════════════════════════════════════════════════════════════

import { CATALOGO_FERRAMENTAS, PERCURSOS } from "./catalogo";
import { DESTAQUE_POR_PERFIL, ORDEM_POR_PERFIL } from "./homepage";
import type { ToolDefinition } from "./tipos";

/** Ao fim de quanto tempo uma revisão fiscal deixa de ser credível. */
const VALIDADE_REVISAO_DIAS = 400;

const duplicados = <T>(valores: T[]): T[] => {
  const vistos = new Set<T>();
  const repetidos = new Set<T>();
  for (const v of valores) {
    if (vistos.has(v)) repetidos.add(v);
    vistos.add(v);
  }
  return [...repetidos];
};

export function validarCatalogoFerramentas(
  catalogo: ToolDefinition[] = CATALOGO_FERRAMENTAS,
): string[] {
  const erros: string[] = [];
  const ids = new Set(catalogo.map((f) => f.id));

  // ── Unicidade ────────────────────────────────────────────────────────
  for (const [campo, valores] of [
    ["id", catalogo.map((f) => f.id)],
    ["slug", catalogo.map((f) => f.slug)],
    ["canonicalHref", catalogo.map((f) => f.canonicalHref)],
    ["title", catalogo.map((f) => f.title)],
  ] as const) {
    const repetidos = duplicados(valores as string[]);
    if (repetidos.length > 0) {
      erros.push(`Ferramentas com ${campo} duplicado: ${repetidos.join(", ")}`);
    }
  }

  const hoje = Date.now();

  for (const f of catalogo) {
    const onde = `[${f.id}]`;

    // ── Destino canónico ───────────────────────────────────────────────
    if (f.canonicalHref !== `/ferramentas/${f.slug}`) {
      erros.push(`${onde} canonicalHref tem de ser /ferramentas/${f.slug}, é ${f.canonicalHref}.`);
    }
    // P0-02: um cartão do hub nunca manda a pessoa para o topo da homepage
    // nem para o painel. O destino de uma ferramenta é a ferramenta.
    if (/[?#]/.test(f.canonicalHref) || f.canonicalHref.startsWith("/?")) {
      erros.push(`${onde} destino canónico não pode ser uma query da homepage: ${f.canonicalHref}.`);
    }
    if (f.dashboardHref && !f.dashboardHref.startsWith("/dashboard/")) {
      erros.push(`${onde} dashboardHref inválido: ${f.dashboardHref}.`);
    }

    // ── Completude editorial ───────────────────────────────────────────
    for (const [campo, valor] of [
      ["title", f.title], ["shortOutcome", f.shortOutcome],
      ["description", f.description], ["cta", f.cta], ["icon", f.icon],
    ] as const) {
      if (!valor.trim()) erros.push(`${onde} ${campo} está vazio.`);
    }
    if (f.profiles.length === 0) erros.push(`${onde} não declara nenhum perfil.`);
    if (f.intents.length === 0) erros.push(`${onde} não declara nenhum objetivo.`);
    if (f.topics.length === 0) erros.push(`${onde} não declara nenhum tema.`);
    if (f.aliases.length === 0) erros.push(`${onde} não declara aliases — fica invisível na pesquisa.`);
    if (f.requiredInputs.length === 0) {
      erros.push(`${onde} não declara requiredInputs — a pessoa não sabe o que precisa (P1-07).`);
    }
    if (f.estimatedMinutes <= 0) erros.push(`${onde} estimatedMinutes tem de ser positivo.`);

    // ── Superfícies ────────────────────────────────────────────────────
    // Uma ferramenta ativa aparece no hub E na pesquisa. Estar num sítio e
    // faltar no outro é exatamente a divergência silenciosa do P0-04.
    if (f.surfaces.includes("hub") && !f.surfaces.includes("search")) {
      erros.push(`${onde} está no hub mas não na pesquisa.`);
    }
    if (f.surfaces.includes("hub") && !f.surfaces.includes("sitemap")) {
      erros.push(`${onde} está no hub mas não no sitemap.`);
    }
    if (f.surfaces.includes("dashboard") && !f.dashboardHref) {
      erros.push(`${onde} declara a superfície dashboard sem dashboardHref.`);
    }

    // ── Modelo comercial (§11.3) ───────────────────────────────────────
    if (f.access.core !== "free") {
      erros.push(`${onde} o cálculo principal tem de ser grátis.`);
    }
    if (f.access.account !== "none" && f.access.account !== "optional") {
      erros.push(`${onde} acesso de conta inválido.`);
    }
    if (f.privacy !== "local-only") {
      erros.push(`${onde} toda a ferramenta processa localmente.`);
    }

    // ── Frescura fiscal ────────────────────────────────────────────────
    const revisto = Date.parse(f.reviewedAt);
    if (Number.isNaN(revisto)) {
      erros.push(`${onde} reviewedAt não é uma data ISO: ${f.reviewedAt}.`);
    } else {
      const dias = (hoje - revisto) / 86_400_000;
      if (dias > VALIDADE_REVISAO_DIAS) {
        erros.push(`${onde} revisão fiscal expirada (${Math.round(dias)} dias). Verificar fontes oficiais.`);
      }
    }
    if (f.fiscalYear !== 2026) erros.push(`${onde} fiscalYear tem de ser 2026.`);

    // ── Relações ───────────────────────────────────────────────────────
    for (const rel of f.relatedToolIds) {
      if (!ids.has(rel)) erros.push(`${onde} relatedToolId inexistente: ${rel}.`);
      if (rel === f.id) erros.push(`${onde} relaciona-se consigo própria.`);
    }
    if (duplicados(f.relatedToolIds).length > 0) {
      erros.push(`${onde} relatedToolIds repetidos.`);
    }
  }

  // ── Curadoria ────────────────────────────────────────────────────────
  const ranks = catalogo
    .map((f) => f.featuredRank)
    .filter((r): r is number => typeof r === "number");
  if (duplicados(ranks).length > 0) {
    erros.push(`featuredRank duplicado: ${duplicados(ranks).join(", ")}. A curadoria tem de ser uma ordem.`);
  }
  if (catalogo.filter((f) => f.surfaces.includes("hub")).length < 3) {
    erros.push("O hub precisa de pelo menos três ferramentas para «Começa por aqui».");
  }

  // ── Percursos ────────────────────────────────────────────────────────
  const idsPercursos = PERCURSOS.map((p) => p.id);
  if (duplicados(idsPercursos).length > 0) {
    erros.push(`Percursos com id duplicado: ${duplicados(idsPercursos).join(", ")}.`);
  }
  for (const p of PERCURSOS) {
    if (p.steps.length < 2) erros.push(`[percurso ${p.id}] precisa de pelo menos dois passos.`);
    for (const s of p.steps) {
      if (!ids.has(s.toolId)) {
        erros.push(`[percurso ${p.id}] passo aponta para ferramenta inexistente: ${s.toolId}.`);
      }
      if (!s.note.trim()) erros.push(`[percurso ${p.id}] passo ${s.toolId} sem nota.`);
    }
  }

  // ── Curadoria da homepage ────────────────────────────────────────────
  // Vive em `homepage.ts` como ids; se um id morrer, a homepage renderiza
  // menos cartões e a secção salta de altura — em silêncio.
  for (const [perfil, id] of Object.entries(DESTAQUE_POR_PERFIL)) {
    if (!ids.has(id)) {
      erros.push(`[homepage:${perfil}] destaque aponta para ferramenta inexistente: ${id}.`);
    }
  }
  for (const [perfil, lista] of Object.entries(ORDEM_POR_PERFIL)) {
    for (const id of lista) {
      if (!ids.has(id)) {
        erros.push(`[homepage:${perfil}] grelha aponta para ferramenta inexistente: ${id}.`);
      }
    }
    if (lista.includes(DESTAQUE_POR_PERFIL[perfil as keyof typeof DESTAQUE_POR_PERFIL])) {
      erros.push(`[homepage:${perfil}] o destaque repete-se na grelha.`);
    }
    if (duplicados(lista).length > 0) {
      erros.push(`[homepage:${perfil}] grelha com ferramentas repetidas.`);
    }
  }
  const tamanhos = new Set(Object.values(ORDEM_POR_PERFIL).map((l) => l.length));
  if (tamanhos.size > 1) {
    erros.push("A grelha da homepage tem de ter a mesma contagem em todos os perfis — senão a secção salta de altura na troca.");
  }

  return erros;
}

/**
 * Corre ao importar `index.ts`. Se o catálogo ficar inconsistente, o build
 * falha — que é a rede de segurança, não um aviso na consola.
 */
export function assertCatalogoFerramentas(): void {
  const erros = validarCatalogoFerramentas();
  if (erros.length > 0) {
    throw new Error(
      `Catálogo de ferramentas inconsistente (${erros.length}):\n  - ${erros.join("\n  - ")}`,
    );
  }
}
