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
    // ┌───────────────────────────────────────────────────────────────────┐
    // │ O CARTÃO NASCE ABERTO — e recolhe quando se desce na página        │
    // │                                                                   │
    // │ Quem chega precisa de ver para onde pode ir; quem já está a ler    │
    // │ precisa do ecrã. Tudo o que vem a seguir mede o cartão ABERTO,     │
    // │ porque é aí que a geometria das três linhas existe.                 │
    // └───────────────────────────────────────────────────────────────────┘
    const medir = () =>
      page.evaluate(() => {
        const h = document.querySelector("header");
        const esp = h.previousElementSibling;
        return {
          estado: h.dataset.expandido,
          reserva: h.dataset.reserva,
          corpoVisivel: !!document.querySelector("#rc-cabecalho-corpo")?.offsetParent,
          espacador: Math.round(esp.getBoundingClientRect().height),
          cartao: Math.round(h.querySelector("div").getBoundingClientRect().height),
          lingueta: !!document.querySelector("[data-cabecalho-alternar]")?.offsetParent,
        };
      });

    const aberto = await medir();
    if (aberto.estado !== "true") mal(`${vp.nome}px: o cartão devia nascer ABERTO`);
    else if (!aberto.corpoVisivel) mal(`${vp.nome}px: nasceu aberto mas o corpo não está visível`);
    else if (!aberto.lingueta) mal(`${vp.nome}px: a lingueta não está visível`);
    // O espaçador em fluxo tem de seguir a altura do cartão mais a margem —
    // senão o conteúdo nasce por baixo dele ou com um buraco à frente.
    else if (Math.abs(aberto.espacador - aberto.cartao - 16) > 1) {
      mal(`${vp.nome}px: espaçador (${aberto.espacador}) não acompanha o cartão (${aberto.cartao} + 16)`);
    } else ok(`${vp.nome}px: cartão aberto à entrada — ${aberto.espacador}px reservados, e o espaçador acompanha`);

    // ┌───────────────────────────────────────────────────────────────────┐
    // │ RECOLHER A CLIQUE: O ESPAÇADOR ACOMPANHA                           │
    // │                                                                   │
    // │ Um clique é causa directa e pode mexer na reserva — no topo da     │
    // │ página é a única forma de o espaço voltar a ser da página.          │
    // └───────────────────────────────────────────────────────────────────┘
    await page.click("[data-cabecalho-alternar]");
    await page.waitForTimeout(300);
    const fechado = await medir();
    if (fechado.estado !== "false") mal(`${vp.nome}px: a lingueta não recolheu o cartão`);
    else if (fechado.corpoVisivel) mal(`${vp.nome}px: recolhido, mas o corpo continua visível`);
    else if (fechado.reserva !== "baixa") mal(`${vp.nome}px: recolhido a clique e a reserva ficou «${fechado.reserva}»`);
    else if (Math.abs(fechado.espacador - fechado.cartao - 16) > 1) {
      mal(`${vp.nome}px: espaçador (${fechado.espacador}) não acompanha o cartão fechado (${fechado.cartao} + 16)`);
    } else ok(`${vp.nome}px: cartão fechado a clique — ${fechado.espacador}px reservados, com lingueta`);

    await page.click("[data-cabecalho-alternar]");
    await page.waitForTimeout(300);
    if ((await medir()).estado !== "true") mal(`${vp.nome}px: a lingueta não voltou a abrir o cartão`);

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
      // CINCO e não seis: «Menu» saiu da bandeja para a primeira linha do
      // cartão. Esteve lá dentro, separado por uma régua, e uma régua é
      // sinal fraco de mais para dizer «isto é de outra natureza».
      if (capsula.itens.length !== 5) mal(`${vp.nome}px: bandeja com ${capsula.itens.length} pilares (esperados 5)`);
      else ok(`${vp.nome}px: bandeja com 5 pilares (${capsula.largura}px) — ${capsula.itens.map((i) => i.nome).join(" · ")}`);
      const menuNaLinha1 = await page.evaluate(() => {
        const gat = document.querySelector('[data-menu-gatilho="secretaria"]');
        const bandeja = document.querySelector('nav[aria-label="Principal"]');
        return { existe: !!gat, dentroDaBandeja: !!(gat && bandeja?.contains(gat)) };
      });
      if (!menuNaLinha1.existe) mal(`${vp.nome}px: gatilho do menu ausente do cartão`);
      else if (menuNaLinha1.dentroDaBandeja) mal(`${vp.nome}px: «Menu» voltou para dentro da bandeja`);
      else ok(`${vp.nome}px: «Menu» na primeira linha, fora da bandeja`);
      if (!capsula.cabe) mal(`${vp.nome}px: cápsula sai do ecrã`);
      // ┌───────────────────────────────────────────────────────────────┐
      // │ AS TRÊS MEDIÇÕES QUE FALTARAM, E CADA UMA APANHOU UM DEFEITO   │
      // │                                                               │
      // │ 1. COLISÃO. Numa versão a barra de navegação cabia no ecrã e   │
      // │    passava POR CIMA do logótipo — 8 px a 1024, 17 px a 1440.   │
      // │    «Cabe na janela» e «não se sobrepõe aos vizinhos» são       │
      // │    perguntas diferentes, e mede-se nos DOIS eixos: as linhas   │
      // │    partilham colunas sem partilharem linha.                     │
      // │                                                               │
      // │ 2. ARESTAS. As três linhas do cartão têm de começar e acabar   │
      // │    no mesmo píxel. Já tiveram larguras diferentes — a bandeja  │
      // │    e a barra com 704 px e a linha de cima com o contentor      │
      // │    todo: num ecrã largo isso dava um «T».                       │
      // │                                                               │
      // │ 3. QUIETUDE. Ao rolar não pode mexer-se nada. Já se recolheu   │
      // │    a linha de cima (sumiam marca, secções, conta e «Começar»)  │
      // │    e a da pesquisa (o campo ia a `display:none` e o Escape     │
      // │    deixava o foco no `<body>`). Muda a sombra, e mais nada.     │
      // └───────────────────────────────────────────────────────────────┘
      const medida = `() => {
        const cartao = document.querySelector("header > div");
        const linhas = [...cartao.children];
        const r = (el) => {
          if (!el || !el.offsetParent) return null;
          const b = el.getBoundingClientRect();
          return { e: Math.round(b.left), d: Math.round(b.right), w: Math.round(b.width) };
        };
        const marca = cartao.querySelector('a[aria-label^="ReciboCerto"]');
        const accoes = linhas[0].lastElementChild;
        const cruza = (x, y) => {
          if (!x || !y) return 0;
          const a = x.getBoundingClientRect(), b = y.getBoundingClientRect();
          const h = a.right > b.left + 1 && b.right > a.left + 1;
          const v = a.bottom > b.top + 1 && b.bottom > a.top + 1;
          return h && v ? Math.round(Math.min(a.right, b.right) - Math.max(a.left, b.left)) : 0;
        };
        return {
          linha1: r(linhas[0]),
          bandeja: r(cartao.querySelector('nav[aria-label="Principal"]')),
          busca: r(cartao.querySelector("#rc-cabecalho-corpo")?.children?.[1]),
          altura: Math.round(cartao.getBoundingClientRect().height),
          colideMarca: cruza(marca, cartao.querySelector('nav[aria-label="Principal"]')),
          colideAccoes: cruza(accoes, cartao.querySelector('nav[aria-label="Principal"]')),
        };
      }`;
      const antes = await page.evaluate(`(${medida})()`);

      if (antes.colideMarca > 0) mal(`${vp.nome}px: a navegação sobrepõe o logótipo em ${antes.colideMarca}px`);
      else if (antes.colideAccoes > 0) mal(`${vp.nome}px: a navegação sobrepõe as acções em ${antes.colideAccoes}px`);
      else ok(`${vp.nome}px: sem colisões dentro do cartão`);

      const arestas = ["linha1", "bandeja", "busca"].map((k) => antes[k]);
      const desalinhadas = arestas.some(
        (a) => !a || Math.abs(a.e - arestas[0].e) > 1 || Math.abs(a.d - arestas[0].d) > 1,
      );
      if (desalinhadas) {
        mal(
          `${vp.nome}px: as três linhas não partilham as arestas — ` +
            arestas.map((a) => (a ? `${a.e}…${a.d}` : "ausente")).join(" / "),
        );
      } else ok(`${vp.nome}px: três linhas nas mesmas arestas (${arestas[0].e}…${arestas[0].d})`);

      // A bandeja ocupa a linha inteira, e é a régua entre fatias que torna
      // isso legítimo: sem ela eram seis rótulos a boiar num tubo.
      const reguas = await page.evaluate(() =>
        document.querySelectorAll('nav[aria-label="Principal"] > span[aria-hidden]').length);
      if (reguas < 1) mal(`${vp.nome}px: a bandeja perdeu as réguas entre os pilares`);
      else ok(`${vp.nome}px: bandeja com ${reguas} réguas entre fatias`);

      // ┌───────────────────────────────────────────────────────────────┐
      // │ AO DESCER RECOLHE — E O CONTEÚDO NÃO PODE SALTAR               │
      // │                                                               │
      // │ Este é o defeito que a separação `data-expandido` /            │
      // │ `data-reserva` existe para impedir. O espaçador está EM FLUXO: │
      // │ encolhê-lo a meio da leitura tira 116 px ao documento e atira  │
      // │ tudo para cima debaixo dos olhos de quem rola. Mede-se a       │
      // │ posição de um elemento real do documento, com o scroll parado, │
      // │ antes e depois de o cartão recolher.                            │
      // └───────────────────────────────────────────────────────────────┘
      await page.evaluate(() => window.scrollTo(0, 1200));
      await page.waitForTimeout(900);
      const rolado = await page.evaluate(`(${medida})()`);
      const posDepois = await page.evaluate(() => {
        const h = document.querySelector("header");
        return {
          y: Math.round(window.scrollY),
          reserva: h.dataset.reserva,
          estado: h.dataset.expandido,
          espacador: Math.round(h.previousElementSibling.getBoundingClientRect().height),
        };
      });

      const igual = (a, b) => a && b && Math.abs(a.e - b.e) <= 1 && Math.abs(a.w - b.w) <= 1;
      if (posDepois.estado !== "false") {
        mal(`${vp.nome}px: descer 1200px não recolheu o cartão (estado ${posDepois.estado})`);
      } else if (!igual(antes.linha1, rolado.linha1)) {
        // A queixa que originou a regra: «ao fazer scroll some um monte de
        // coisas». A marca, as secções, a conta e o «Começar» FICAM.
        mal(`${vp.nome}px: ao rolar mexeu-se a primeira linha`);
      } else if (posDepois.reserva !== "alta") {
        mal(`${vp.nome}px: recolher ao rolar mexeu na reserva (${posDepois.reserva}) — o conteúdo salta`);
      } else if (Math.abs(posDepois.espacador - antes.altura - 16) > 1) {
        mal(`${vp.nome}px: o espaçador encolheu ao rolar (${posDepois.espacador}) — o conteúdo salta`);
      } else {
        ok(
          `${vp.nome}px: ao descer recolhe (${antes.altura} → ${rolado.altura}px) ` +
            `sem mexer na primeira linha nem nos ${posDepois.espacador}px reservados`,
        );
      }

      // Recolhido pelo scroll, a lingueta ABRE — nunca fecha outra vez.
      await page.click("[data-cabecalho-alternar]");
      await page.waitForTimeout(400);
      const reaberto = await page.evaluate(() => document.querySelector("header").dataset.expandido);
      if (reaberto !== "true") mal(`${vp.nome}px: a lingueta não reabriu o cartão recolhido pelo scroll`);
      else ok(`${vp.nome}px: recolhido pelo scroll, a lingueta volta a abrir`);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(700);
      const noTopo = await page.evaluate(() => ({
        estado: document.querySelector("header").dataset.expandido,
        reserva: document.querySelector("header").dataset.reserva,
      }));
      if (noTopo.estado !== "true" || noTopo.reserva !== "alta") {
        mal(`${vp.nome}px: de volta ao topo o cartão ficou ${noTopo.estado}/${noTopo.reserva}`);
      } else ok(`${vp.nome}px: de volta ao topo abre outra vez, sem buraco por baixo`);

      // ┌───────────────────────────────────────────────────────────────┐
      // │ COM O CARTÃO FECHADO, O ATALHO TEM DE O ABRIR                  │
      // │                                                               │
      // │ A linha da pesquisa vive dentro de um `hidden`, e um elemento  │
      // │ escondido não aceita foco. Foi assim que uma tentativa          │
      // │ anterior de encolher o cabeçalho partiu o teclado: o Escape     │
      // │ deixava o foco no `<body>`.                                     │
      // │                                                               │
      // │ A cura é derivar a expansão de `buscaAberta` no MESMO render, e │
      // │ FIXÁ-LA quando a pesquisa abre — senão fechar o painel          │
      // │ recolhia o cartão no commit em que o foco volta ao campo.        │
      // └───────────────────────────────────────────────────────────────┘
      await page.click("[data-cabecalho-alternar]");
      await page.waitForTimeout(400);
      const antesDoAtalho = await page.evaluate(() => document.querySelector("header").dataset.expandido);
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(900);
      const comAtalho = await page.evaluate(() => ({
        estado: document.querySelector("header").dataset.expandido,
        foco: document.activeElement?.id ?? "",
      }));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      const depois = await page.evaluate(() => ({
        estado: document.querySelector("header").dataset.expandido,
        foco: document.activeElement?.id ?? "",
      }));
      if (antesDoAtalho !== "false") mal(`${vp.nome}px: a lingueta não voltou a fechar o cartão`);
      else if (comAtalho.estado !== "true" || comAtalho.foco !== "rc-header-busca") {
        mal(`${vp.nome}px: ⌘K com o cartão fechado — estado ${comAtalho.estado}, foco «${comAtalho.foco}»`);
      } else if (depois.foco !== "rc-header-busca") {
        mal(`${vp.nome}px: Escape deixa o foco em «${depois.foco}» em vez do lançador`);
      } else ok(`${vp.nome}px: ⌘K abre o cartão fechado e o Escape mantém o foco no campo`);
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
  //
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ PELO NOME, E NÃO PELA POSIÇÃO NO DOM                               │
  // │                                                                   │
  // │ `button[aria-haspopup="dialog"]` parecia bastar e não bastava, por │
  // │ duas razões que só apareceram a correr: as duas superfícies estão  │
  // │ SEMPRE montadas (uma é `hidden lg:block`, a outra `lg:hidden`),    │
  // │ portanto o primeiro do documento pode ser o invisível; e há outros │
  // │ botões no produto que abrem diálogos — na homepage, o «Como        │
  // │ funciona» do hero vem antes. O teste clicava-o e depois queixava-  │
  // │ -se de que o menu não tinha os destinos.                            │
  // │                                                                   │
  // │ `data-menu-gatilho` é o mesmo contrato que a pesquisa já tem.       │
  // └───────────────────────────────────────────────────────────────────┘
  const gatilho = `[data-menu-gatilho="${vp.width >= 1024 ? "secretaria" : "movel"}"]`;
  const g = page.locator(gatilho);
  if ((await g.count()) === 0) mal(`${vp.nome}px: gatilho do menu ausente`);
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
