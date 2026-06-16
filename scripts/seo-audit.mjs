#!/usr/bin/env node
/**
 * ReciboCerto — Auditoria de SEO (só leitura)
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

for (const file of codeFiles) {
  const txt = readFileSync(file, "utf8");
  for (const m of txt.matchAll(/["'](\/[A-Za-z0-9_\-./]+\.(?:png|jpe?g|svg|webp|ico|gif))["']/g)) {
    const ref = m[1];
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
const guiaRegistry = parseArray(seoSrc, "GUIA_SLUGS");
const ferramentaRegistry = parseArray(seoSrc, "FERRAMENTA_SLUGS");

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

const PRIVATE = ["dashboard", "admin", "api"];
const pages = walk(APP).filter((f) => f.endsWith("page.tsx"));
const semMeta = [];
for (const file of pages) {
  const rel = file.replace(APP + "/", "");
  if (PRIVATE.some((p) => rel.startsWith(p + "/") || rel === p + "/page.tsx")) continue;
  const txt = readFileSync(file, "utf8");
  const temTitle = /\btitle\s*:/.test(txt);
  const temDesc = /\bdescription\s*:/.test(txt);
  const route = "/" + rel.replace(/\/?page\.tsx$/, "");
  // A raiz é coberta pelos metadados completos do layout raiz (por design).
  if (route === "/") continue;
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
console.log(`\n  Auditoria de SEO — ReciboCerto\n${line}`);
for (const o of oks) console.log(`  ✓  ${o}`);
for (const w of warns) console.log(`  !  ${w}`);
for (const f of fails) console.log(`  ✗  ${f}`);
console.log(line);
console.log(`  ${oks.length} ok · ${warns.length} aviso(s) · ${fails.length} falha(s)\n`);

process.exit(fails.length ? 1 : 0);
