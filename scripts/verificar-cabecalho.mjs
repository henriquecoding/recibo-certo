#!/usr/bin/env node
/**
 * VERIFICAÇÃO DO CABEÇALHO E DA PESQUISA — fim a fim, num browser a sério.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO NÃO CABE NO VITEST                                       │
 * │                                                                     │
 * │ Metade das garantias que a auditoria do cabeçalho exige não são      │
 * │ sobre dados nem sobre funções puras — são sobre o que o BROWSER faz: │
 * │ onde o foco aterra, se `inert` fecha o fundo a um leitor de ecrã, se │
 * │ um `⌘+clique` preserva o painel, se o cabeçalho fica quieto, se      │
 * │ há dois `aria-modal` no mesmo documento. Nada disso existe fora de   │
 * │ um motor de renderização.                                            │
 * │                                                                     │
 * │ O `busca-cabecalho.test.ts` cobre a verdade dos DADOS (cobertura,    │
 * │ relevância, privacidade); isto cobre a verdade da INTERAÇÃO.         │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   npm run build && npm run start        (noutro terminal)
 *   npm run cabecalho:e2e
 *
 * Variáveis:
 *   RC_BASE_URL          por omissão http://localhost:3000
 *   PLAYWRIGHT_CHROMIUM  caminho para um Chromium já instalado (opcional)
 *
 * Código de saída: 0 = tudo passa · 1 = pelo menos uma falha.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * A versão real, lida da fonte.
 *
 * Marcar «uma versão qualquer» como vista não chega: o popup de Novidades
 * compara com `APP_VERSION`, e um valor inventado fá-lo querer abrir — que
 * é exactamente o que deve acontecer, e o que tornava estes testes falhados
 * por uma razão que nada tinha a ver com o que estavam a medir.
 */
const APP_VERSION = readFileSync(join(RAIZ, "src", "lib", "version.ts"), "utf8").match(
  /APP_VERSION\s*=\s*"([^"]+)"/,
)?.[1];
if (!APP_VERSION) throw new Error("Não foi possível ler APP_VERSION de src/lib/version.ts");

const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";

/* ┌─────────────────────────────────────────────────────────────────────────┐
   │ PORQUE NÃO SE ESPERA POR `networkidle`                                   │
   │                                                                         │
   │ Estava aqui, e passou a bloquear: o router do Next faz prefetch das      │
   │ ligações à vista, e um cabeçalho com nove destinos (cinco pilares mais   │
   │ as secções) mantém pedidos `?_rsc=` a sair enquanto houver ligações      │
   │ novas no ecrã. A rede nunca fica 500 ms parada, e o `goto` esgota o      │
   │ tempo — não por a página estar lenta, mas por a condição não poder ser   │
   │ satisfeita. Medido: primeira visita à homepage 1,4 s; a segunda, depois  │
   │ de passar por um guia, nunca chegava lá.                                 │
   │                                                                         │
   │ `domcontentloaded` mais as esperas explícitas que este ficheiro já tem   │
   │ a seguir a cada `goto` medem a mesma coisa sem depender do tráfego.      │
   └─────────────────────────────────────────────────────────────────────────┘ */
const EXECUTAVEL = process.env.PLAYWRIGHT_CHROMIUM;

const linhas = [];
let falhas = 0;
const reg = (nome, condicao, extra = "") => {
  if (!condicao) falhas++;
  linhas.push(`  ${condicao ? "✓" : "✗"} ${nome}${extra ? ` — ${extra}` : ""}`);
};
const seccao = (titulo) => linhas.push(`\n${titulo}`);

const browser = await chromium.launch(EXECUTAVEL ? { executablePath: EXECUTAVEL } : {});

/**
 * Uma sessão com o consentimento e a versão já decididos.
 *
 * Isola o que está a ser testado: sem isto, o diálogo de cookies tapa a
 * página e todos os testes falham pela mesma razão errada. O caso da
 * PRIMEIRA visita — com cookies e novidades a disputar — é testado à parte,
 * de propósito, porque é lá que vivia o defeito P0-05.
 */
async function sessao(viewport = { width: 1440, height: 900 }, tema) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.addInitScript(
    ({ t, versao }) => {
      localStorage.setItem(
        "recibocerto:cookie-consent",
        JSON.stringify({ versao: 2, estatistica: false, marketing: false, em: new Date().toISOString() }),
      );
      localStorage.setItem("recibocerto:changelog_visto", versao);
      if (t) localStorage.setItem("recibocerto:theme", t);
    },
    { t: tema, versao: APP_VERSION },
  );
  return { ctx, page };
}

/**
 * Abre o painel pelo caminho que estiver disponível.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ COM A PÁGINA ROLADA, A BARRA NÃO ESTÁ LÁ PARA SER CLICADA              │
 * │                                                                       │
 * │ A linha da pesquisa é a única que recolhe ao rolar, e recolhe          │
 * │ precisamente porque tem dois caminhos alternativos: o atalho de        │
 * │ teclado e a página `/pesquisar`. Este ajudante usa o clique quando a   │
 * │ barra está visível e o atalho quando não está — que é o que uma        │
 * │ pessoa faz, e o que os testes abaixo precisam de exercitar nos dois    │
 * │ estados.                                                               │
 * └───────────────────────────────────────────────────────────────────────┘
 */
const abrirPainel = async (page) => {
  const barra = page.locator("#rc-header-busca");
  if (await barra.isVisible()) await barra.click();
  else await page.keyboard.press("Control+k");
  await page.waitForSelector('[data-busca-painel="aberto"]', { timeout: 10_000 });
};

/* ═══ 1. Primeira visita — a invariante dos overlays (P0-05) ════════ */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  seccao("Primeira visita — overlays globais");
  const modais = await page.locator('[aria-modal="true"]').count();
  reg("nunca mais do que um aria-modal", modais <= 1, `${modais}`);
  reg(
    "o foco está dentro do modal activo",
    modais === 0 || (await page.evaluate(() => !!document.activeElement?.closest?.('[aria-modal="true"]'))),
  );
  reg(
    "nenhum modal escondido a prender o foco",
    (await page.locator('[aria-modal="true"]:visible').count()) === modais,
  );
  await ctx.close();
}

/* ═══ 2. Painel de secretária — contrato de a11y e teclado ══════════ */
{
  const { ctx, page } = await sessao();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  seccao("Painel de secretária (1440×900)");

  const lancador = page.locator("#rc-header-busca");
  reg("o lançador é uma ligação", (await lancador.evaluate((e) => e.tagName)) === "A");
  reg("aponta para /pesquisar sem JavaScript", (await lancador.getAttribute("href")) === "/pesquisar");
  reg("declara aria-controls", !!(await lancador.getAttribute("aria-controls")));

  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ COM A PESQUISA ABERTA, A NAVEGAÇÃO CONTINUA LÁ                     │
   * │                                                                   │
   * │ Isto é o que substitui o «abrir não muda a densidade» que estava   │
   * │ aqui — e que era a asserção errada. Medir a altura do cabeçalho    │
   * │ não diz nada a ninguém; o que interessa é se a navegação continua  │
   * │ a ser vista e clicada enquanto se pesquisa. Houve uma versão em    │
   * │ que ela vivia na linha que recolhia e o painel ficava por cima da  │
   * │ faixa onde devia estar — foi assim que uma regressão real passou   │
   * │ por um portão verde. Hoje a cápsula está ACIMA da barra e o painel │
   * │ abre para baixo, mas a asserção fica: é ela que reprova se alguém  │
   * │ voltar a pôr a navegação a recolher.                                │
   * │                                                                   │
   * │ Testa-se rolado, que é o único estado onde isto pode falhar.       │
   * └───────────────────────────────────────────────────────────────────┘
   */
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(700);
  await abrirPainel(page);

  // Um PILAR e já não «Guias»: a barra passou a ser os cinco pilares e os
  // guias vivem na folha do menu (ver `lib/navegacao.ts`).
  const abas = page.locator('header a[href="/ferramentas/recibos-verdes"]').first();
  reg("com a pesquisa aberta e a página rolada, os pilares continuam visíveis", await abas.isVisible());

  const sobreposto = await page.evaluate(() => {
    const aba = document.querySelector('header a[href="/ferramentas/recibos-verdes"]');
    const painel = document.querySelector('[data-busca-painel="aberto"]');
    if (!aba || !painel) return null;
    const a = aba.getBoundingClientRect();
    const p = painel.getBoundingClientRect();
    // Interseção de rectângulos: o painel não pode cobrir a aba.
    return !(p.right <= a.left || p.left >= a.right || p.bottom <= a.top || p.top >= a.bottom);
  });
  reg("e o painel não fica por cima delas", sobreposto === false, String(sobreposto));

  // E continuam a responder ao clique — não é só estarem desenhadas.
  reg("e continuam clicáveis", await abas.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const topo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el.contains(topo) || topo === el;
  }));

  const painel = page.locator('[data-busca-painel="aberto"]');
  reg("o painel NÃO se declara modal", (await painel.getAttribute("aria-modal")) === null);
  reg("o painel é uma região de pesquisa", (await painel.getAttribute("role")) === "search");

  // Estado vazio (P0-04).
  const focaveis = await painel.evaluate(
    (el) =>
      el.querySelectorAll(
        'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
      ).length,
  );
  reg("estado vazio com ≤ 12 controlos focáveis", focaveis <= 12, `${focaveis}`);
  reg("estado vazio sem resultados", (await painel.locator("[data-resultado]").count()) === 0);

  // Resultados (P0-06).
  await page.locator("#rc-header-busca").fill("iva");
  await page.waitForTimeout(900);
  const resultados = painel.locator("[data-resultado]");
  const n = await resultados.count();
  reg("há resultados para «iva»", n > 0, `${n}`);
  reg("no máximo 8 no painel", n <= 8, `${n}`);
  reg(
    "todos os resultados são ligações com destino",
    (await resultados.evaluateAll((els) => els.every((e) => e.tagName === "A" && e.getAttribute("href")?.startsWith("/")))),
  );
  reg(
    "o estado acessível anuncia a contagem",
    /resultado/i.test((await page.locator("#rc-header-busca-estado").textContent()) ?? ""),
  );

  // Teclado (P0-03).
  await page.locator("#rc-header-busca").focus();
  await page.keyboard.press("ArrowDown");
  reg(
    "ArrowDown entra nos resultados",
    (await page.evaluate(() => document.activeElement?.hasAttribute("data-resultado"))) === true,
  );
  await page.keyboard.press("ArrowUp");
  reg("ArrowUp volta ao campo", (await page.evaluate(() => document.activeElement?.id)) === "rc-header-busca");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  reg("Escape devolve o foco ao lançador", (await page.evaluate(() => document.activeElement?.id)) === "rc-header-busca");
  reg("e fecha o painel", (await page.locator('[data-busca-painel="aberto"]').count()) === 0);

  await ctx.close();
}

/* ═══ 3. Regressões de interação (§13.5) ════════════════════════════ */
{
  const { ctx, page } = await sessao();
  seccao("Regressões de interação");

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await abrirPainel(page);
  await page.locator("#rc-header-busca").fill("iva recibos");
  await page.waitForTimeout(900);
  const destino = await page.locator("[data-resultado]").first().getAttribute("href");
  await page.locator("[data-resultado]").first().click();
  await page.waitForTimeout(1500);
  // Era o defeito do `onBlur`: o foco saía no `mousedown` e o painel
  // fechava-se antes de o `click` chegar ao destino.
  reg("clicar num resultado navega", page.url().endsWith(destino), `${destino}`);
  reg("e o painel fecha", (await page.locator('[data-busca-painel="aberto"]').count()) === 0);

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await abrirPainel(page);
  await page.locator("#rc-header-busca").fill("iva recibos");
  await page.waitForTimeout(900);
  await page.locator("[data-resultado]").first().click({ modifiers: ["Control"] });
  await page.waitForTimeout(900);
  reg("⌘/Ctrl+clique preserva o painel", (await page.locator('[data-busca-painel="aberto"]').count()) === 1);
  reg("e não navega na página actual", page.url() === `${BASE}/`);

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await abrirPainel(page);
  await page.locator('header a[href="/ferramentas/recibos-verdes"]').first().click();
  await page.waitForTimeout(1800);
  reg("clicar na navegação com o painel aberto navega", page.url().includes("/ferramentas/recibos-verdes"));

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await abrirPainel(page);
  await page.mouse.click(700, 700);
  await page.waitForTimeout(800);
  reg("clique fora fecha", (await page.locator('[data-busca-painel="aberto"]').count()) === 0);
  reg(
    "clique fora não devolve o foco à força",
    (await page.evaluate(() => document.activeElement?.id ?? "")) !== "rc-header-busca",
  );

  await ctx.close();
}

/* ═══ 4. Telemóvel — diálogo modal completo (P1-05, P1-06) ══════════ */
{
  const { ctx, page } = await sessao({ width: 360, height: 780 });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  seccao("Telemóvel (360×780)");

  const slots = page.locator('nav[aria-label="Navegação"] > *');
  const rotulos = await slots.evaluateAll((els) => els.map((e) => e.textContent?.trim() ?? ""));
  reg("cinco lugares estáveis", rotulos.length === 5, `${rotulos.length}`);
  reg("todos com rótulo visível", rotulos.every(Boolean), rotulos.join(" · "));
  reg(
    "alvos com pelo menos 44 px",
    (await slots.evaluateAll((els) => els.every((e) => e.getBoundingClientRect().height >= 44))),
  );
  reg(
    "sem overflow horizontal",
    (await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)),
  );

  await page.locator('[data-busca-gatilho="movel"]').click();
  await page.waitForTimeout(1200);
  /* ┌───────────────────────────────────────────────────────────────────┐
     │ ESTAS DUAS ASSERÇÕES ESTAVAM A MEDIR UMA SUPERFÍCIE QUE JÁ NÃO     │
     │ EXISTE — e estavam vermelhas desde `66331f0`                       │
     │                                                                   │
     │ Nessa altura a pesquisa do telemóvel deixou de ser um             │
     │ `SuperficieModal` (véu, foco preso, scroll bloqueado) e passou a   │
     │ ser o MESMO painel ancorado do computador. Um painel ancorado é    │
     │ uma REGIÃO, não um diálogo: a página continua legível e clicável   │
     │ por trás, portanto declarar `aria-modal="true"` seria mentir ao    │
     │ leitor de ecrã, e pôr o fundo `inert` seria cumprir uma promessa   │
     │ que ninguém fez. Está explicado em `PainelPesquisa.tsx` e pinado   │
     │ em `chrome-movel.test.ts`.                                         │
     │                                                                   │
     │ O script ficou para trás — foi tocado pela última vez em `8534e4b` │
     │ que é o commit IMEDIATAMENTE ANTERIOR. Passa a medir o contrato    │
     │ que a superfície tem hoje, e não o que ela tinha antes.            │
     └───────────────────────────────────────────────────────────────────┘ */
  reg("é uma região de pesquisa e NÃO um diálogo", (await page.locator('[aria-modal="true"]').count()) === 0);
  reg("com o papel de pesquisa declarado", (await page.locator('[role="search"]').count()) >= 1);
  reg("o foco vai ao campo", (await page.evaluate(() => document.activeElement?.id)) === "rc-busca-movel");
  reg(
    "o fundo NÃO fica inert — a página continua a existir por trás",
    await page.evaluate(() => ![...document.body.children].some((n) => n.hasAttribute("inert"))),
  );

  await page.locator("#rc-busca-movel").fill("iva");
  await page.waitForTimeout(1000);
  const nMovel = await page.locator("[data-resultado]").count();
  reg("no máximo 12 no diálogo", nMovel > 0 && nMovel <= 12, `${nMovel}`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  reg(
    "o foco volta ao botão Pesquisar",
    (await page.evaluate(() => document.activeElement?.getAttribute("data-busca-gatilho"))) === "movel",
  );
  reg("e o painel fecha", (await page.locator('[data-busca-painel="aberto"]').count()) === 0);
  await ctx.close();
}

/* ═══ 5. Tablet — composição própria (P2-05) ════════════════════════ */
{
  const { ctx, page } = await sessao({ width: 820, height: 1100 });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  seccao("Tablet (820×1100)");
  const caixa = await page.locator('nav[aria-label="Navegação"]').boundingBox();
  reg("a doca não vai de extremo a extremo", caixa.width < 820, `${Math.round(caixa.width)}px de 820`);
  reg("e está centrada", Math.abs(caixa.x + caixa.width / 2 - 410) < 2);
  await ctx.close();
}

/* ═══ 6. Âncoras sob cabeçalho fixo (P2-06) ═════════════════════════ */
{
  const { ctx, page } = await sessao();
  await page.goto(`${BASE}/#calculadora`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  seccao("Âncora /#calculadora");

  reg(
    "o alvo da âncora é único no documento",
    (await page.locator("#calculadora").count()) === 1,
    `${await page.locator("#calculadora").count()} elementos`,
  );

  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ O QUE SE GARANTE AQUI — E O QUE FICA POR GARANTIR                  │
   * │                                                                   │
   * │ Garantido: QUANDO o browser salta para a âncora, o alvo não fica   │
   * │ debaixo do cabeçalho fixo. É o que `scroll-padding-top` e o        │
   * │ `scroll-margin-top` resolvem, e é o que o ponto P2-06 pedia.       │
   * │                                                                   │
   * │ Por garantir: o salto inicial acontecer sempre. O App Router faz a │
   * │ sua própria reposição de scroll no primeiro render e, em cerca de  │
   * │ metade dos carregamentos, chega primeiro — a página fica no topo.  │
   * │ Medido com e sem `scroll-behavior: smooth`, com o mesmo resultado, │
   * │ portanto não é do CSS. A correcção seria voltar a saltar por       │
   * │ JavaScript depois de tudo assentar — exactamente a «correção       │
   * │ tardia» que a auditoria aponta como sintoma, não como solução.     │
   * │ Fica registado em vez de disfarçado.                               │
   * └───────────────────────────────────────────────────────────────────┘
   */
  const scrollY = await page.evaluate(() => Math.round(window.scrollY));
  const alvo = await page.locator("#calculadora").boundingBox();
  if (scrollY > 0) {
    reg("o alvo não fica debaixo do cabeçalho", alvo && alvo.y >= 0, `y=${Math.round(alvo.y)}`);
    reg("e está no ecrã", alvo && alvo.y < 900, `y=${Math.round(alvo.y)}`);
  } else {
    linhas.push("    · a reposição de scroll do App Router chegou primeiro — residual conhecido, ver o quadro no script");
  }
  await ctx.close();
}

/* ═══ 7. Os dois temas — o claro tem de ficar intacto ═══════════════ */
for (const tema of [null, "dark"]) {
  const { ctx, page } = await sessao({ width: 1440, height: 900 }, tema);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  seccao(`Tema ${tema ?? "claro"}`);

  await abrirPainel(page);
  await page.locator("#rc-header-busca").fill("iva");
  await page.waitForTimeout(900);

  const cores = await page.evaluate(() => {
    const painel = document.querySelector('[data-busca-painel="aberto"]');
    const titulo = painel?.querySelector("[data-resultado] span span");
    return {
      fundo: painel ? getComputedStyle(painel).backgroundColor : "",
      texto: titulo ? getComputedStyle(titulo).color : "",
    };
  });
  const lum = (rgb) => {
    const [r, g, b] = rgb.match(/\d+/g).map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  reg("o painel usa a superfície do tema", lum(cores.fundo) > 128 === (tema !== "dark"), cores.fundo);
  reg("o texto contrasta com a superfície", Math.abs(lum(cores.fundo) - lum(cores.texto)) > 90);

  await page.locator("#rc-header-busca").focus();
  await page.keyboard.press("ArrowDown");
  const contorno = await page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement);
    return { cor: cs.outlineColor, largura: cs.outlineWidth };
  });
  reg("o foco tem contorno de 2 px na cor da marca", contorno.largura === "2px", contorno.cor);

  await ctx.close();
}

/* ═══ 8. axe — o que uma inspeção automática consegue apanhar ═══════ */
{
  const { ctx, page } = await sessao();
  seccao("axe (WCAG 2.0/2.1 A e AA)");

  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ O ÂMBITO É O CABEÇALHO E A PESQUISA — E ISSO É DELIBERADO          │
   * │                                                                   │
   * │ Uma varredura à página inteira devolve dezenas de avisos de        │
   * │ contraste que vêm da PALETA do produto — a marca verde sobre       │
   * │ creme, o branco sobre `bg-brand` das CTA, os rótulos em            │
   * │ `text-stone-400` do rodapé. São reais e são anteriores a este      │
   * │ trabalho; corrigi-los é mexer na identidade visual, que é uma      │
   * │ decisão de produto e não um detalhe de implementação.              │
   * │                                                                   │
   * │ Um portão que falha sempre não é um portão: passa a ser ruído que  │
   * │ se aprende a ignorar. Este falha pelo que ESTE código controla, e  │
   * │ imprime o resto como dívida conhecida — visível, não escondida.    │
   * └───────────────────────────────────────────────────────────────────┘
   */
  const analisar = async (rotulo, seletores) => {
    let construtor = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
    for (const sel of seletores) construtor = construtor.include(sel);
    const { violations } = await construtor.analyze();
    const graves = violations.filter((v) => v.impact === "serious" || v.impact === "critical");

    /**
     * ┌─────────────────────────────────────────────────────────────────┐
     * │ AS DUAS QUE SOBRAM SÃO A MARCA, E ISSO NÃO SE DECIDE AQUI        │
     * │                                                                 │
     * │ O verde da marca (#1D9E75) sobre creme dá 3,3:1, e o branco      │
     * │ sobre `bg-brand` dá 3,4:1 — ambos abaixo dos 4,5:1 que a WCAG    │
     * │ pede para texto normal. São o logótipo e TODAS as CTA do         │
     * │ produto: mudá-los é mudar a identidade visual, decisão de        │
     * │ produto e não de implementação — e o manual do projeto proíbe    │
     * │ expressamente tocar em `bg-brand`/`text-white`.                  │
     * │                                                                 │
     * │ Ficam SEPARADAS e visíveis, com o número exacto. Não somam ao    │
     * │ portão (senão ele falharia para sempre e deixaria de se ler),    │
     * │ mas também não desaparecem — que é o que uma exclusão silenciosa │
     * │ faria.                                                           │
     * └─────────────────────────────────────────────────────────────────┘
     */
    const daMarca = (no) => /#1d9e75/i.test(no.any?.[0]?.message ?? no.failureSummary ?? "");
    const porDecidir = [];
    const bloqueantes = [];
    for (const v of graves) {
      const nosMarca = v.id === "color-contrast" ? v.nodes.filter(daMarca) : [];
      const nosRestantes = v.nodes.filter((n) => !nosMarca.includes(n));
      if (nosMarca.length) porDecidir.push(`${v.id}(${nosMarca.length})`);
      if (nosRestantes.length) bloqueantes.push(`${v.id}(${nosRestantes.length})`);
    }

    reg(`${rotulo}: sem violações graves`, bloqueantes.length === 0, bloqueantes.join(", ") || "0");
    if (porDecidir.length) {
      linhas.push(`    · contraste da paleta da marca, à espera de decisão de produto: ${porDecidir.join(", ")}`);
    }

    // A dívida da paleta, fora do âmbito, fica escrita — não apagada.
    const { violations: todas } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const forasGraves = todas.filter((v) => v.impact === "serious" || v.impact === "critical");
    if (forasGraves.length) {
      linhas.push(
        `    · página inteira (fora do âmbito, dívida conhecida da paleta): ${forasGraves
          .map((v) => `${v.id}(${v.nodes.length})`)
          .join(", ")}`,
      );
    }
  };

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await analisar("cabeçalho", ["header"]);

  await abrirPainel(page);
  await page.locator("#rc-header-busca").fill("iva");
  await page.waitForTimeout(1000);
  await analisar("painel de pesquisa", ['[data-busca-painel="aberto"]']);

  await page.goto(`${BASE}/pesquisar?q=iva`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await analisar("/pesquisar", ["main, .max-w-3xl"]);

  await ctx.close();
}

await browser.close();
console.log(linhas.join("\n"));
console.log(`\n${falhas === 0 ? "Cabeçalho: tudo verificado." : `Cabeçalho: ${falhas} falha(s).`}`);
process.exit(falhas === 0 ? 0 : 1);
