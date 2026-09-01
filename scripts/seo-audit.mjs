#!/usr/bin/env node
/**
 * Recibo Certo — Auditoria de SEO (só leitura)
 *
 * Análise estática, sem rede e sem segredos. Deteta as falhas estruturais que
 * tornam um site invisível ou que partem as pré-visualizações sociais:
 *
 *   1. Referências a imagens/ícones que não existem (ex.: `/og-home.png`).
 *   2. Divergência entre as páginas reais e o registo do sitemap
 *      (`PUBLIC_ROUTES` / `GUIA_SLUGS` / `FERRAMENTA_SLUGS` em `src/lib/seo.ts`).
 *   3. Páginas públicas sem `title`/`description` próprios (aviso).
 *
 * Uso: `npm run seo:audit`  (sai com código 1 se houver falhas).
 *
 * NÃO altera ficheiros nem publica nada — é um relatório. A correção é sempre
 * decidida por um humano.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "src", "app");
const PUBLIC = join(ROOT, "public");

const fails = [];
const warns = [];
const oks = [];

// ── utilitários ──────────────────────────────────────────────────────────────

/** Lista recursivamente todos os ficheiros sob `dir`. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** Subdiretórios com `page.tsx` (rotas reais), ignorando segmentos dinâmicos. */
function routeSlugs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("[") && !e.name.startsWith("("))
    .filter((e) => existsSync(join(dir, e.name, "page.tsx")))
    .map((e) => e.name);
}

function parseArray(src, name) {
  const m = src.match(new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!m) return [];
  return [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]);
}

// ── 1. Referências a assets inexistentes ─────────────────────────────────────

const SRC = join(ROOT, "src");
const codeFiles = walk(SRC).filter((f) => /\.(tsx?|jsx?)$/.test(f));
const assetRefs = new Map(); // path -> Set(ficheiros que o referenciam)

// Convenções do Next servidas a partir de src/app/* (não vivem em /public).
const APP_CONVENTIONS = new Set();
for (const f of walk(APP)) {
  const base = f.split("/").pop();
  if (/^(icon|apple-icon|opengraph-image|twitter-image|favicon)\.\w+$/.test(base)) {
    APP_CONVENTIONS.add("/" + base.replace(/\.(tsx|ts|jsx|js)$/, ".png"));
    APP_CONVENTIONS.add("/" + base);
  }
}

// Nem toda a string que se parece com um caminho de imagem É uma referência.
// `placeholder="/parceiros/fiz/logo.svg"` num formulário do admin é texto de
// exemplo a mostrar ao humano que preenche o campo o FORMATO esperado — o
// ficheiro não existe nem deve existir. A auditoria acusava-o como asset em
// falta e ficava vermelha para sempre; e uma verificação que ninguém consegue
// pôr a verde é uma verificação que se aprende a ignorar, o que custa muito
// mais do que o falso positivo que a manteve assim.
//
// O mesmo vale para exemplos em comentários: descrevem, não carregam.
const NAO_E_REFERENCIA = /(?:placeholder|example|exemplo|aria-label)\s*[:=]\s*$/;

for (const file of codeFiles) {
  const txt = readFileSync(file, "utf8");
  for (const m of txt.matchAll(/["'](\/[A-Za-z0-9_\-./]+\.(?:png|jpe?g|svg|webp|ico|gif))["']/g)) {
    const ref = m[1];
    // O que vem imediatamente antes da string decide se ela é uma referência.
    const antes = txt.slice(Math.max(0, m.index - 40), m.index).replace(/\{$/, "");
    if (NAO_E_REFERENCIA.test(antes)) continue;
    // Uma linha de comentário descreve um caminho; não o carrega.
    const inicioLinha = txt.lastIndexOf("\n", m.index) + 1;
    const linha = txt.slice(inicioLinha, m.index);
    if (/^\s*(?:\/\/|\*|\/\*)/.test(linha)) continue;
    if (!assetRefs.has(ref)) assetRefs.set(ref, new Set());
    assetRefs.get(ref).add(file.replace(ROOT + "/", ""));
  }
}

const missingAssets = [];
for (const [ref, files] of assetRefs) {
  const inPublic = existsSync(join(PUBLIC, ref));
  const isConvention =
    APP_CONVENTIONS.has(ref) ||
    /^\/(icon|apple-icon|opengraph-image|twitter-image|favicon)\b/.test(ref);
  if (!inPublic && !isConvention) {
    missingAssets.push({ ref, files: [...files] });
  }
}
if (missingAssets.length) {
  for (const { ref, files } of missingAssets) {
    fails.push(`Asset referenciado mas inexistente: ${ref}  (em ${files.join(", ")})`);
  }
} else {
  oks.push("Todas as imagens/ícones referenciados existem (ou são convenções do Next).");
}

// ── 2. Sitemap vs. ficheiros reais ───────────────────────────────────────────

const seoSrc = readFileSync(join(SRC, "lib", "seo.ts"), "utf8");
// GUIA_SLUGS deixou de ser uma lista literal: passou a derivar dos manifestos
// (src/lib/guias/manifests.ts), que são a fonte única desde a reestruturação
// dos Guias. É de lá que o registo é lido agora.
const manifestosSrc = readFileSync(join(SRC, "lib", "guias", "manifests.ts"), "utf8");
const guiaRegistry = [...manifestosSrc.matchAll(/^\s{4}id: "([a-z0-9-]+)", slug: "([a-z0-9-]+)",/gm)].map((m) => m[2]);
// FERRAMENTA_SLUGS deixou de ser uma lista literal: passou a derivar do
// catálogo único (src/lib/ferramentas/catalogo.ts), pela mesma razão que os
// Guias derivam dos manifestos. É de lá que o registo é lido agora.
const catalogoSrc = readFileSync(join(SRC, "lib", "ferramentas", "catalogo.ts"), "utf8");
const ferramentaRegistry = [...catalogoSrc.matchAll(/^\s{4}slug: "([a-z0-9-]+)",$/gm)].map((m) => m[1]);

if (guiaRegistry.length === 0) {
  fails.push("Não foi possível ler os slugs dos manifestos de Guias — o seo-audit ficaria cego.");
}
if (ferramentaRegistry.length === 0) {
  fails.push("Não foi possível ler os slugs do catálogo de ferramentas — o seo-audit ficaria cego.");
}

const guiaReal = routeSlugs(join(APP, "guias"));
const ferramentaReal = routeSlugs(join(APP, "ferramentas"));

function diff(real, registry, label) {
  const missing = real.filter((s) => !registry.includes(s));
  const dead = registry.filter((s) => !real.includes(s));
  if (missing.length) fails.push(`${label}: páginas fora do sitemap → ${missing.join(", ")}`);
  if (dead.length) warns.push(`${label}: no sitemap mas sem página → ${dead.join(", ")}`);
  if (!missing.length && !dead.length) oks.push(`${label}: ${real.length} páginas, todas no sitemap.`);
}

diff(guiaReal, guiaRegistry, "Guias");
diff(ferramentaReal, ferramentaRegistry, "Ferramentas");

// ── 3. Páginas públicas sem title/description próprios (aviso) ────────────────

// `contabilista` (singular) é o painel privado do contabilista — a mesma área
// que faltava ao `PRIVADAS` do robots.txt. Não sendo pública, exigir-lhe
// metadados de pesquisa era ruído: enchia o aviso com onze rotas que nunca
// deviam aparecer num resultado. NÃO apanha `contabilistas` (o diretório
// público): a comparação é por `contabilista/` e por igualdade exata.
const PRIVATE = ["dashboard", "admin", "api", "contabilista"];
const pages = walk(APP).filter((f) => f.endsWith("page.tsx"));
const semMeta = [];
for (const file of pages) {
  const rel = file.replace(APP + "/", "");
  if (PRIVATE.some((p) => rel.startsWith(p + "/") || rel === p + "/page.tsx")) continue;
  const txt = readFileSync(file, "utf8");
  // No App Router os metadados herdam-se do `layout.tsx` do segmento. Uma
  // página que não os declara pode tê-los perfeitamente — `/investidores` é
  // o caso: title, description e canónico vivem todos no seu layout. Ler só
  // o `page.tsx` acusava-a de estar sem metadados quando não está.
  const layout = file.replace(/page\.tsx$/, "layout.tsx");
  const txtLayout = existsSync(layout) ? readFileSync(layout, "utf8") : "";
  // Os Guias derivam os metadados do manifesto via `metadataDoGuia(slug)` —
  // continuam a ter title e description próprios, apenas não escritos à mão.
  const derivaDoManifesto = /metadataDoGuia\("([a-z0-9-]+)"\)/.test(txt);
  // Uma rota dinâmica não declara `metadata`: constrói-a por pedido em
  // `generateMetadata`. É o caso de `/guias/[slug]`, que devolve o title e a
  // description do manifesto do guia. Exigir-lhe a forma estática era exigir
  // a forma errada.
  const derivaEmTempoDeExecucao = /export\s+(?:async\s+)?function\s+generateMetadata/.test(txt);
  const dinamica = derivaDoManifesto || derivaEmTempoDeExecucao;
  const temTitle = dinamica || /\btitle\s*:/.test(txt) || /\btitle\s*:/.test(txtLayout);
  const temDesc = dinamica || /\bdescription\s*:/.test(txt) || /\bdescription\s*:/.test(txtLayout);
  // Uma página `noindex` não vai aparecer em resultado nenhum; cobrá-la por
  // não ter description é pedir-lhe que se venda a um público que ela recusa.
  const noindex = /index:\s*false/.test(txt) || /index:\s*false/.test(txtLayout);
  const route = "/" + rel.replace(/\/?page\.tsx$/, "");
  // A raiz é coberta pelos metadados completos do layout raiz (por design).
  if (route === "/") continue;
  if (noindex) continue;
  if (!temTitle || !temDesc) semMeta.push(route);
}
if (semMeta.length) {
  warns.push(
    `Páginas públicas sem title/description próprios (herdam do layout): ${semMeta.join(", ")}`,
  );
} else {
  oks.push("Todas as páginas públicas têm metadados próprios.");
}

// ── Relatório ────────────────────────────────────────────────────────────────

const line = "─".repeat(64);
console.log(`\n  Auditoria de SEO — Recibo Certo\n${line}`);
for (const o of oks) console.log(`  ✓  ${o}`);
for (const w of warns) console.log(`  !  ${w}`);
for (const f of fails) console.log(`  ✗  ${f}`);
console.log(line);
console.log(`  ${oks.length} ok · ${warns.length} aviso(s) · ${fails.length} falha(s)\n`);

process.exit(fails.length ? 1 : 0);
