#!/usr/bin/env node
/**
 * O PORTÃO DA VISIBILIDADE REAL — o que o olho vê, e não o que o DOM diz.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO TEVE DE EXISTIR                                              │
 * │                                                                         │
 * │ O painel da pesquisa esteve semanas a abrir com `opacity: 0`. Estava lá: │
 * │ 1370×330 px, campo com foco, oito resultados certos, teclado a           │
 * │ funcionar. Simplesmente ninguém o via. Quem carregava na barra concluía, │
 * │ com toda a razão, que a pesquisa estava avariada.                        │
 * │                                                                         │
 * │ E NENHUM portão o apanhou — nem o `cabecalho:e2e`, que tem trinta        │
 * │ verificações sobre esse painel e as passou todas. A razão é a mesma para │
 * │ os dois instrumentos que lá estavam:                                     │
 * │                                                                         │
 * │   · `isVisible()` do Playwright responde «tem caixa e não tem            │
 * │     `visibility:hidden`». Um elemento a `opacity: 0` passa.              │
 * │   · o axe mede contraste de COR; um elemento transparente não tem par de │
 * │     cores para avaliar, e sai do âmbito sem uma queixa.                  │
 * │                                                                         │
 * │ Os dois medem estrutura. Nenhum mede se a coisa se vê. Este mede — pela  │
 * │ opacidade computada, que é a única pergunta que interessa a quem olha.   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   npm run build && npm run start        (noutro terminal)
 *   npm run visivel:e2e
 *
 * Variáveis:
 *   RC_BASE_URL          por omissão http://localhost:3000
 *   PLAYWRIGHT_CHROMIUM  caminho para um Chromium já instalado (opcional)
 *
 * Código de saída: 0 = tudo se vê · 1 = pelo menos uma superfície invisível.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP_VERSION = readFileSync(join(RAIZ, "src", "lib", "version.ts"), "utf8").match(
  /APP_VERSION\s*=\s*"([^"]+)"/,
)?.[1];
if (!APP_VERSION) throw new Error("Não foi possível ler APP_VERSION de src/lib/version.ts");

const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";
const EXECUTAVEL = process.env.PLAYWRIGHT_CHROMIUM;

/**
 * As rotas que representam cada família de layout.
 *
 * A questão que isto responde é «esta superfície tem um motor de animação por
 * cima dela?», e essa resposta muda por LAYOUT, não por página. Uma rota de
 * cada família chega — e uma família nova entra aqui no dia em que nascer.
 */
const ROTAS = [
  "/", //                        casca dos cinco focos (sem layout próprio)
  "/inicio/preco", //            idem
  "/guias", //                   layout com provider próprio
  "/guias/assedio-trabalho",
  "/ferramentas",
  "/contabilistas",
  "/quiz-fiscal",
  "/precos",
  "/pesquisar?q=irs", //         a pesquisa em página, sem layout próprio
];

const linhas = [];
let falhas = 0;
const reg = (nome, condicao, extra = "") => {
  if (!condicao) falhas++;
  linhas.push(`  ${condicao ? "✓" : "✗"} ${nome}${extra ? ` — ${extra}` : ""}`);
};

const browser = await chromium.launch(EXECUTAVEL ? { executablePath: EXECUTAVEL } : {});

async function sessao(viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.addInitScript((versao) => {
    localStorage.setItem(
      "recibocerto:cookie-consent",
      JSON.stringify({ versao: 2, necessarios: true, estatistica: false, marketing: false, data: new Date().toISOString() }),
    );
    localStorage.setItem("recibocerto:changelog_visto", versao);
  }, APP_VERSION);
  return { ctx, page };
}

/** A opacidade computada de uma superfície — ou `null` se ela não existir. */
const opacidadeDe = (page, selector) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { opacidade: Number(getComputedStyle(el).opacity), largura: Math.round(r.width), altura: Math.round(r.height) };
  }, selector);

/* ═══ 1. O painel da pesquisa, em TODAS as famílias de rota ══════════
   Foi aqui que o defeito viveu, e é aqui que ele voltaria: o painel vive
   no chrome, e o chrome não pertence a nenhum layout de rota. */
linhas.push("\nO painel da pesquisa vê-se — em todas as rotas");
for (const rota of ROTAS) {
  const { ctx, page } = await sessao();
  try {
    await page.goto(BASE + rota, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);

    const barra = page.locator("#rc-header-busca");
    if (await barra.isVisible().catch(() => false)) await barra.click({ timeout: 6000 });
    else await page.keyboard.press("Control+k");

    await page.waitForSelector("[data-busca-painel]", { timeout: 8000 });
    // Depois da animação de entrada (160 ms) e com margem para um runner lento.
    await page.waitForTimeout(1200);

    const p = await opacidadeDe(page, "[data-busca-painel]");
    reg(
      `${rota}`,
      !!p && p.opacidade > 0.9 && p.largura > 200 && p.altura > 100,
      p ? `opacity=${p.opacidade} ${p.largura}×${p.altura}` : "o painel não abriu",
    );
  } catch (erro) {
    reg(`${rota}`, false, String(erro?.message ?? erro).split("\n")[0].slice(0, 70));
  }
  await ctx.close();
}

/* ═══ 2. O mesmo no telemóvel ════════════════════════════════════════ */
linhas.push("\nO painel da pesquisa vê-se — telemóvel (390×780)");
{
  const { ctx, page } = await sessao({ width: 390, height: 780 });
  try {
    await page.goto(`${BASE}/guias/assedio-trabalho`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    const gatilho = page.locator('[data-busca-gatilho="movel"]').first();
    if (await gatilho.count()) await gatilho.click({ timeout: 6000 });
    else await page.keyboard.press("Control+k");
    await page.waitForSelector("[data-busca-painel]", { timeout: 8000 });
    await page.waitForTimeout(1200);
    const p = await opacidadeDe(page, "[data-busca-painel]");
    reg("dock do telemóvel", !!p && p.opacidade > 0.9, p ? `opacity=${p.opacidade} ${p.largura}×${p.altura}` : "não abriu");
  } catch (erro) {
    reg("dock do telemóvel", false, String(erro?.message ?? erro).split("\n")[0].slice(0, 70));
  }
  await ctx.close();
}

/* ═══ 3. As outras superfícies que abrem a pedido ════════════════════
   Todas entram com uma animação, e todas partiriam da mesma maneira. */
linhas.push("\nAs outras superfícies que abrem a pedido");
{
  const { ctx, page } = await sessao();
  await page.goto(`${BASE}/guias`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);

  await page.locator("[data-menu-gatilho]").first().click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(1400);
  const menu = await opacidadeDe(page, ".rc-menu-folha");
  reg("a folha do «Menu»", !!menu && menu.opacidade > 0.9, menu ? `opacity=${menu.opacidade}` : "não abriu");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);

  await ctx.close();
}

/* ═══ 4. O consentimento, que é a primeira coisa que alguém vê ═══════ */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  const banner = await opacidadeDe(page, '[class*="z-[120]"]');
  reg(
    "o diálogo de cookies da primeira visita",
    !!banner && banner.opacidade > 0.9,
    banner ? `opacity=${banner.opacidade}` : "não apareceu",
  );
  await ctx.close();
}

await browser.close();
console.log(linhas.join("\n"));
console.log(
  `\n${falhas === 0 ? "Visibilidade: tudo o que abre, vê-se." : `Visibilidade: ${falhas} superfície(s) invisível(eis).`}`,
);
process.exit(falhas === 0 ? 0 : 1);
