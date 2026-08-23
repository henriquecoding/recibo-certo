#!/usr/bin/env node
/**
 * VERIFICAÇÃO DA NAVEGAÇÃO — as quatro superfícies, num browser a sério.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ O QUE ISTO MEDE QUE O VITEST NÃO PODE MEDIR                          │
 * │                                                                     │
 * │ `navegacao.test.ts` garante que as superfícies DERIVAM da fonte      │
 * │ única. Isso não diz nada sobre geometria — e foi na geometria que os │
 * │ dois defeitos reais desta reestruturação apareceram:                 │
 * │                                                                     │
 * │  · a cápsula CABIA no ecrã e passava por CIMA do logótipo (8 px a    │
 * │    1024, 17 px a 1440). «Cabe na janela» e «não colide com os        │
 * │    vizinhos» são duas perguntas diferentes, e só a segunda importa.  │
 * │  · a folha do menu era centrada com `-translate-x-1/2`, e o          │
 * │    `transform` da animação de entrada substituía-o: metade da folha  │
 * │    ficava fora do ecrã, com a última coluna cortada.                 │
 * │                                                                     │
 * │ Nenhum dos dois dá erro. Os dois só se vêem a olhar — ou a medir.    │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   npm run build && npm run start        (noutro terminal)
 *   npm run navegacao:e2e
 *
 * Variáveis:
 *   RC_BASE_URL          por omissão http://localhost:3000
 *   PLAYWRIGHT_CHROMIUM  caminho para um Chromium já instalado (opcional)
 *   RC_CAPTURAS          pasta onde gravar as imagens (opcional)
 *
 * Código de saída: 0 = tudo passa · 1 = pelo menos uma falha.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

/** A versão real, lida da fonte — ver a nota em `verificar-cabecalho.mjs`. */
const APP_VERSION = readFileSync(join(RAIZ, "src", "lib", "version.ts"), "utf8").match(
  /APP_VERSION\s*=\s*"([^"]+)"/,
)?.[1];
if (!APP_VERSION) throw new Error("Não foi possível ler APP_VERSION de src/lib/version.ts");

const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.RC_CAPTURAS ?? null;
const EXECUTAVEL = process.env.PLAYWRIGHT_CHROMIUM;

const falhas = [];
const ok = (m) => console.log("  OK   " + m);
const mal = (m) => { falhas.push(m); console.log("  FALHA " + m); };

const VIEWPORTS = [
  { nome: "360", width: 360, height: 780 },
  { nome: "768", width: 768, height: 900 },
  { nome: "1024", width: 1024, height: 800 },
  { nome: "1440", width: 1440, height: 900 },
];

const ROTAS = ["/", "/ferramentas/calcular-preco", "/ferramentas/descobrir-negocio", "/guias", "/ferramentas"];

const browser = await chromium.launch(EXECUTAVEL ? { executablePath: EXECUTAVEL } : {});

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  // Primeira visita mostra o consentimento e o popup de Novidades — dois
  // modais legítimos que tapam a navegação. Semeia-se a escolha para o
  // smoke medir o chrome, e não o onboarding.
  await ctx.addInitScript((versao) => {
    try {
      localStorage.setItem("recibocerto:cookie-consent", JSON.stringify({
        necessarios: true, estatistica: false, marketing: false,
        data: new Date().toISOString(), versao: 1,
      }));
      localStorage.setItem("recibocerto:changelog_visto", versao);
    } catch { /* ignora */ }
  }, APP_VERSION);
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));

  for (const rota of ROTAS) {
    const r = await page.goto(BASE + rota, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    if (r.status() !== 200) mal(`${vp.nome}px ${rota}: HTTP ${r.status()}`);

    // 1 — sem overflow horizontal (inegociável)
    const over = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) mal(`${vp.nome}px ${rota}: overflow horizontal de ${over}px`);
    else ok(`${vp.nome}px ${rota}: sem overflow`);

    // 2 — um só aria-current="page" VISÍVEL.
    //
    // Conta-se o que está renderizado, e não os nós do DOM: o cabeçalho de
    // secretária (`hidden lg:block`) e o chrome do telemóvel (`lg:hidden`)
    // estão ambos montados em qualquer largura e um deles tem sempre
    // `display:none` — logo, está fora da árvore de acessibilidade. Contar
    // nós dava sempre dois numa rota de pilar, e o defeito real (dois
    // destinos acesos na MESMA barra) ficava escondido nesse ruído.
    const acesos = await page.evaluate(() =>
      [...document.querySelectorAll('[aria-current="page"]')]
        .filter((el) => el.getBoundingClientRect().width > 0 && el.offsetParent !== null)
        .map((el) => el.getAttribute("aria-label") || el.textContent.trim()));
    if (acesos.length > 1) mal(`${vp.nome}px ${rota}: ${acesos.length} destinos acesos — ${acesos.join(", ")}`);

    // 3 — um só <nav aria-label="Principal"> visível
    const principais = await page.evaluate(() =>
      [...document.querySelectorAll('nav[aria-label="Principal"]')]
        .filter((el) => el.getBoundingClientRect().width > 0).length);
    if (principais > 1) mal(`${vp.nome}px ${rota}: ${principais} marcos "Principal"`);

    // 4 — overlay de erro do Next
    const erroNext = await page.evaluate(() => !!document.querySelector("nextjs-portal"));
    if (erroNext) mal(`${vp.nome}px ${rota}: overlay de erro do Next`);
  }

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  if (vp.width >= 1024) {
    // A cápsula: cinco pilares + Menu, visíveis.
    const capsula = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Principal"]');
      if (!nav) return null;
      const r = nav.getBoundingClientRect();
      return {
        classes: nav.className,
        itens: [...nav.querySelectorAll("a,button")].map((el) => ({
          nome: el.getAttribute("aria-label") || el.textContent.trim(),
          visivel: el.getBoundingClientRect().width > 0,
          alturaOk: el.getBoundingClientRect().height >= 36,
        })),
        largura: Math.round(r.width),
        cabe: r.left >= 0 && r.right <= window.innerWidth,
      };
    });
    if (!capsula) mal(`${vp.nome}px: cápsula ausente`);
    else {
      if (capsula.itens.length !== 6) mal(`${vp.nome}px: cápsula com ${capsula.itens.length} itens (esperados 6)`);
      else ok(`${vp.nome}px: cápsula com 6 itens (${capsula.largura}px) — ${capsula.itens.map((i) => i.nome).join(" · ")}`);
      if (!capsula.cabe) mal(`${vp.nome}px: cápsula sai do ecrã`);
      // ┌───────────────────────────────────────────────────────────────┐
      // │ DUAS MEDIÇÕES QUE FALTARAM, E CADA UMA APANHOU UM DEFEITO      │
      // │                                                               │
      // │ 1. COLISÃO. A cápsula cabia no ecrã e passava POR CIMA do      │
      // │    logótipo — 8 px a 1024, 17 px a 1440. «Cabe na janela» e    │
      // │    «não se sobrepõe aos vizinhos» são perguntas diferentes.    │
      // │    A sobreposição mede-se nos DOIS eixos: desde que o          │
      // │    cabeçalho passou a três linhas, a cápsula e a marca         │
      // │    partilham colunas sem partilharem linha, e um teste só      │
      // │    horizontal daria um falso positivo permanente.               │
      // │                                                               │
      // │ 2. EIXO. A cápsula ficava centrada no espaço que SOBRAVA entre │
      // │    duas colunas de larguras diferentes, e a barra de pesquisa  │
      // │    por baixo ficava centrada na página: a 1920 px os centros   │
      // │    caíam a 886 e a 960. Dois elementos centrados, empilhados,  │
      // │    desalinhados — nada falha, e vê-se logo.                     │
      // └───────────────────────────────────────────────────────────────┘
      const geometria = await page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Principal"]');
        const grelha = nav?.closest("div.grid");
        const marca = grelha?.querySelector('a[aria-label^="ReciboCerto"]');
        const accoes = grelha?.querySelector("div.col-start-3");
        const busca = grelha?.querySelector("div.row-start-3");
        const r = (el) => (el ? el.getBoundingClientRect() : null);
        const n = r(nav), m = r(marca), a = r(accoes), b = r(busca), g = r(grelha);
        const cruza = (x, y) =>
          x && y && x.right > y.left + 1 && y.right > x.left + 1 && x.bottom > y.top + 1 && y.bottom > x.top + 1;
        const meio = (x) => (x ? Math.round(x.left + x.width / 2) : null);
        return {
          comMarca: cruza(m, n) ? Math.round(m.right - n.left) : 0,
          comAccoes: cruza(n, a) ? Math.round(n.right - a.left) : 0,
          eixoCapsula: meio(n),
          eixoBusca: meio(b),
          eixoGrelha: meio(g),
        };
      });
      if (geometria.comMarca > 0) mal(`${vp.nome}px: cápsula sobrepõe o logótipo em ${geometria.comMarca}px`);
      if (geometria.comAccoes > 0) mal(`${vp.nome}px: cápsula sobrepõe as acções em ${geometria.comAccoes}px`);
      if (!geometria.comMarca && !geometria.comAccoes) ok(`${vp.nome}px: cápsula sem colisão com marca nem acções`);

      const desvioCapsula = Math.abs(geometria.eixoCapsula - geometria.eixoGrelha);
      const desvioBusca = Math.abs(geometria.eixoBusca - geometria.eixoGrelha);
      if (desvioCapsula > 2 || desvioBusca > 2) {
        mal(
          `${vp.nome}px: eixos desalinhados — cápsula ${geometria.eixoCapsula}, ` +
            `pesquisa ${geometria.eixoBusca}, página ${geometria.eixoGrelha}`,
        );
      } else {
        ok(`${vp.nome}px: cápsula e pesquisa no mesmo eixo da página (${geometria.eixoGrelha})`);
      }

      // E a MESMA largura, não uma parecida: 715 contra 704 são 5 px de
      // desvio de cada lado, que é o pior sítio onde parar — lê-se como
      // erro, não como diferença. As duas leem `--rc-dock-larga`.
      const larguras = await page.evaluate(() => {
        const grelha = document.querySelector('nav[aria-label="Principal"]')?.closest("div.grid");
        const l = (sel) => Math.round(grelha?.querySelector(sel)?.getBoundingClientRect().width ?? 0);
        return { capsula: l('nav[aria-label="Principal"]'), busca: l("div.row-start-3 form, div.row-start-3 > *") };
      });
      if (Math.abs(larguras.capsula - larguras.busca) > 1) {
        mal(`${vp.nome}px: cápsula ${larguras.capsula}px e pesquisa ${larguras.busca}px — quase igual não é igual`);
      } else ok(`${vp.nome}px: cápsula e pesquisa com a mesma largura (${larguras.capsula}px)`);
      if (!capsula.classes.includes("rc-capsula")) mal(`${vp.nome}px: cápsula sem a classe do material`);
      for (const i of capsula.itens) {
        if (!i.visivel) mal(`${vp.nome}px: item «${i.nome}» invisível`);
        if (!i.alturaOk) mal(`${vp.nome}px: item «${i.nome}» abaixo de 36px de alvo`);
      }
    }
  } else {
    // A barra do telemóvel: cinco lugares, cada um com ícone E texto.
    const barra = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Navegação"]');
      if (!nav) return null;
      return [...nav.querySelectorAll("a")].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          nome: el.getAttribute("aria-label"),
          texto: el.textContent.trim(),
          temSvg: !!el.querySelector("svg"),
          w: Math.round(r.width), h: Math.round(r.height),
          truncado: [...el.querySelectorAll("span")].some((s) => s.scrollWidth > s.clientWidth + 1),
        };
      });
    });
    if (!barra) mal(`${vp.nome}px: barra inferior ausente`);
    else {
      if (barra.length !== 5) mal(`${vp.nome}px: barra com ${barra.length} lugares (esperados 5)`);
      else ok(`${vp.nome}px: barra com 5 lugares — ${barra.map((b) => b.texto).join(" · ")}`);
      for (const b of barra) {
        if (!b.temSvg) mal(`${vp.nome}px: lugar «${b.texto}» sem ícone`);
        if (!b.texto) mal(`${vp.nome}px: lugar sem texto`);
        if (!b.nome) mal(`${vp.nome}px: lugar «${b.texto}» sem nome acessível`);
        if (b.h < 36) mal(`${vp.nome}px: lugar «${b.texto}» com ${b.h}px de altura`);
        if (b.truncado) mal(`${vp.nome}px: rótulo «${b.texto}» truncado (${b.w}px)`);
      }
    }
  }

  // O menu abre, tem os destinos e fecha com Escape devolvendo o foco.
  const gatilho = vp.width >= 1024
    ? 'nav[aria-label="Principal"] button[aria-haspopup="dialog"]'
    : 'button[aria-haspopup="dialog"]';
  const g = await page.$(gatilho);
  if (!g) mal(`${vp.nome}px: gatilho do menu ausente`);
  else {
    await g.click();
    await page.waitForTimeout(450);
    const menu = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (!d) return null;
      return {
        destinos: [...d.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
        temTema: !!d.querySelector('button[aria-label*="escuro"],button[aria-label*="claro"],button[aria-label*="tema"],[data-tema]'),
      };
    });
    if (!menu) mal(`${vp.nome}px: menu não abriu`);
    else {
      const esperados = ["/guias", "/quiz-fiscal", "/precos", "/contabilistas", "/ferramentas"];
      const faltam = esperados.filter((h) => !menu.destinos.includes(h));
      if (faltam.length) mal(`${vp.nome}px: menu sem ${faltam.join(", ")}`);
      else ok(`${vp.nome}px: menu com os ${esperados.length} destinos que saíram da barra`);
      // A folha tem de caber INTEIRA no ecrã. Estava a ser centrada com
      // `-translate-x-1/2`, e o `transform` da animação de entrada
      // substituía-o: metade da folha ficava fora do ecrã à direita, com a
      // última coluna cortada — sem erro nenhum, só olhando.
      const caixa = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"][aria-modal="true"] .rc-menu-folha, [role="dialog"][aria-modal="true"] > div:last-child');
        if (!d) return null;
        const r = d.getBoundingClientRect();
        return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom),
                 vw: window.innerWidth, vh: window.innerHeight };
      });
      if (!caixa) mal(`${vp.nome}px: folha sem caixa medível`);
      else if (caixa.l < -1 || caixa.r > caixa.vw + 1) {
        mal(`${vp.nome}px: folha fora do ecrã (${caixa.l}…${caixa.r} em ${caixa.vw}px)`);
      } else ok(`${vp.nome}px: folha inteira dentro do ecrã (${caixa.l}…${caixa.r})`);
      if (OUT) await page.screenshot({ path: `${OUT}/menu-${vp.nome}.png` });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(350);
      const aindaAberto = await page.evaluate(() => !!document.querySelector('[role="dialog"][aria-modal="true"]'));
      if (aindaAberto) mal(`${vp.nome}px: Escape não fechou o menu`);
      const foco = await page.evaluate(() => document.activeElement?.tagName + ":" + (document.activeElement?.getAttribute("aria-haspopup") ?? ""));
      if (!foco.includes("dialog")) mal(`${vp.nome}px: Escape deixou o foco em ${foco}`);
      else ok(`${vp.nome}px: Escape fecha e devolve o foco ao gatilho`);
    }
  }
      if (OUT) await page.screenshot({ path: `${OUT}/home-${vp.nome}.png` });

  // A fila dos pilares na homepage — cinco ligações REAIS, servidas.
  await page.evaluate(() => document.querySelector("#pilares")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(700);
  const fila = await page.evaluate(() => {
    const sec = document.querySelector("#pilares");
    if (!sec) return null;
    return [...sec.querySelectorAll("a[href^='/ferramentas/']")].map((a) => a.getAttribute("href"));
  });
  if (!fila) mal(`${vp.nome}px: fila de pilares ausente na homepage`);
  else if (fila.length !== 5) mal(`${vp.nome}px: fila com ${fila.length} pilares`);
  else ok(`${vp.nome}px: fila da homepage com os 5 pilares`);
      if (OUT) await page.screenshot({ path: `${OUT}/pilares-${vp.nome}.png` });

  // Uma rota de pilar, com o destino aceso e a página rolada (o vidro só é
  // material se passar conteúdo por baixo).
  await page.goto(BASE + "/ferramentas/calcular-preco", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(700);
      if (OUT) await page.screenshot({ path: `${OUT}/pilar-rolado-${vp.nome}.png` });

  // Modo escuro, na mesma rota.
  await page.evaluate(() => { document.documentElement.classList.add("dark"); });
  await page.waitForTimeout(400);
      if (OUT) await page.screenshot({ path: `${OUT}/escuro-${vp.nome}.png` });
  await page.evaluate(() => { document.documentElement.classList.remove("dark"); });
  if (erros.length) mal(`${vp.nome}px: erros de página — ${erros.slice(0, 3).join(" | ")}`);
  await ctx.close();
}

await browser.close();
console.log(falhas.length ? `\nFALHAS (${falhas.length}):\n - ` + falhas.join("\n - ") : "\nTUDO VERDE");
process.exit(falhas.length ? 1 : 0);
