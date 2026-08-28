#!/usr/bin/env node
/**
 * VERIFICAÇÃO DO MOTOR DE DESCOBERTA — fim a fim, num browser.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO NÃO CABE NO VITEST                                       │
 * │                                                                     │
 * │ Os testes de `negocio-market-*` provam o motor: que uma observação  │
 * │ nacional serve qualquer zona, que uma entrevista não promove a      │
 * │ hipótese, que um cenário inviável a contradiz.                       │
 * │                                                                     │
 * │ O que eles não veem é o ecrã. E foi no ecrã que os dois defeitos    │
 * │ mais caros deste checkpoint viveram:                                 │
 * │                                                                     │
 * │  · a leitura NACIONAL era filtrada contra `null` e desaparecia,     │
 * │    com a página a dizer «falta sinal na tua zona» enquanto a fonte  │
 * │    oficial estava a responder com o valor de Portugal;              │
 * │  · o preço de UMA unidade era escrito no campo do recibo MENSAL,    │
 * │    a discordar da projeção anual por um fator igual ao volume.      │
 * │                                                                     │
 * │ Nenhum dos dois partia o build, os testes ou o type-check.          │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   npm run build && npm run start        (noutro terminal)
 *   npm run descobrir:e2e
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
const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";

const VERSAO = readFileSync(join(RAIZ, "src/lib/version.ts"), "utf8").match(/APP_VERSION\s*=\s*"([^"]+)"/)?.[1];

const falhas = [];
const ok = (nome) => console.log(`  ✓ ${nome}`);
const falhar = (nome, detalhe) => {
  falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};
const verificar = (nome, condicao, detalhe) => (condicao ? ok(nome) : falhar(nome, detalhe));

const semear = () => {
  try {
    localStorage.setItem("recibocerto:onboarded", "1");
    localStorage.setItem(
      "recibocerto:cookie-consent",
      JSON.stringify({
        necessarios: true,
        estatistica: false,
        marketing: false,
        data: new Date().toISOString(),
        versao: 2,
      }),
    );
  } catch {
    /* modo privado: os overlays fecham-se por Escape */
  }
};

async function fecharOverlays(pagina) {
  for (let i = 0; i < 3; i++) {
    const aberto = await pagina.evaluate(() => Boolean(document.querySelector('[role="dialog"]')));
    if (!aberto) return;
    await pagina.keyboard.press("Escape");
    await pagina.waitForTimeout(400);
  }
}

/** §76 — a 360 px, nada pode empurrar o documento para o lado. */
async function semOverflow(pagina, onde) {
  const r = await pagina.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  verificar(`${onde}: sem overflow horizontal`, r.scroll <= r.client + 1, `${r.scroll} > ${r.client}`);
}

/**
 * §5b — o mapa não pode pintar por cima da barra de topo.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ O DEFEITO QUE ISTO PRENDE, VISTO EM PRODUÇÃO                          │
 * │                                                                      │
 * │ O CSS do Leaflet põe os painéis em `z-index: 400` e os controlos em  │
 * │ `1000`; a caixa de pesquisa sobreposta soma outro `1000`. A barra do │
 * │ site é `fixed … z-50`. Sem contexto de empilhamento próprio, esses   │
 * │ números competem na RAIZ e o mapa ganha — a pesquisa do mapa passa a │
 * │ tapar o logótipo ao percorrer a página.                               │
 * │                                                                      │
 * │ Medido a 1876 px, antes da correção: 28 pontos tapados na linha da   │
 * │ barra, de x=416 a x=1064. Um `isolate` no invólucro leva-o a zero.   │
 * │                                                                      │
 * │ Isto não é um teste de estilo — é o teste de que o mapa não rouba a  │
 * │ navegação. Vale para QUALQUER caixa marcada `data-mapa-onde-operar`. │
 * └──────────────────────────────────────────────────────────────────────┘
 */
async function mapaNaoTapaABarra(pagina, onde) {
  // O mapa é `dynamic({ ssr:false })`: no instante em que a fase A é
  // avaliada ainda não existe. Esperar por ele é a diferença entre
  // vigiar a sobreposição e dar-se por satisfeito com a ausência dela.
  await pagina
    .locator("[data-mapa-onde-operar] .leaflet-container")
    .first()
    .waitFor({ state: "attached", timeout: 8000 })
    .catch(() => {});

  const r = await pagina.evaluate(() => {
    const mapa = document.querySelector("[data-mapa-onde-operar]");
    if (!mapa) return { semMapa: true };
    const barra = [...document.querySelectorAll("nav, header")].find((n) => {
      const estilo = getComputedStyle(n);
      const caixa = n.getBoundingClientRect();
      return estilo.position === "fixed" && caixa.top <= 1 && caixa.height > 30 && caixa.width > 300;
    });
    if (!barra) return { semBarra: true };

    // Pôr o topo do mapa debaixo da barra — é aí que a corrida acontece.
    mapa.scrollIntoView({ block: "start", behavior: "instant" });
    window.scrollBy(0, -10);

    const caixa = barra.getBoundingClientRect();
    const y = Math.round(caixa.top + caixa.height / 2);
    let tapados = 0;
    for (let x = 8; x < caixa.width; x += 24) {
      if (document.elementFromPoint(x, y)?.closest?.("[data-mapa-onde-operar]")) tapados += 1;
    }
    return { tapados };
  });
  // Um salto silencioso esconderia precisamente o caso que isto vigia.
  // Se o mapa está no ecrã, a verificação TEM de correr; se não está,
  // diz-se que não está em vez de se dar por passada.
  if (r.semMapa) {
    console.log(`  · ${onde}: mapa ainda não montado, verificação de sobreposição adiada`);
    return;
  }
  if (r.semBarra) {
    console.log(`  · ${onde}: sem barra fixa neste viewport, nada a sobrepor`);
    return;
  }
  verificar(`${onde}: o mapa não tapa a barra de topo`, r.tapados === 0, `${r.tapados} pontos tapados`);
}

async function semErroDeRuntime(pagina, onde) {
  const erro = await pagina.evaluate(
    () =>
      document.querySelector("nextjs-portal") !== null ||
      /Application error|Unhandled Runtime Error|This page couldn/i.test(document.body.innerText),
  );
  verificar(`${onde}: sem erro de runtime`, !erro);
}

/**
 * Regra 5b do CLAUDE.md: alvos ≥ 36 px. Só controlos, e só dentro de `main`.
 *
 * O âmbito não é preguiça. Estas são rotas PÚBLICAS, e o rodapé do site
 * tem ligações de texto («Cookies», «Termos») desenhadas como botões: têm
 * a altura da linha por natureza e a WCAG 2.5.8 isenta-as explicitamente.
 * Contá-las daria uma falha permanente, igual em todas as páginas, que
 * ninguém voltaria a ler — e que esconderia um alvo pequeno a sério na
 * ferramenta.
 */
async function controlosTocaveis(pagina, onde) {
  const pequenos = await pagina.evaluate(() => {
    const maus = [];
    const raiz = document.querySelector("main") ?? document.body;
    for (const el of raiz.querySelectorAll("button, select, input[type=range], input[type=date]")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const est = getComputedStyle(el);
      if (est.visibility === "hidden" || est.display === "none") continue;
      if (r.height < 36) maus.push(`${el.tagName} h=${Math.round(r.height)}`);
    }
    return maus.slice(0, 6);
  });
  verificar(`${onde}: controlos com 36 px ou mais`, pequenos.length === 0, pequenos.join(" | "));
}

/** Axe sobre o que está no ecrã naquele instante, não sobre a rota vazia. */
async function semViolacoesAxe(pagina, onde) {
  const resultado = await new AxeBuilder({ page: pagina })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  verificar(
    `${onde}: sem violações axe`,
    resultado.violations.length === 0,
    resultado.violations.map((v) => `${v.id} (${v.nodes.length}×)`).join(" | "),
  );
}

/** O cartão do piloto turístico, aberto e pronto a ler. */
async function abrirCartaoTurismo(pagina) {
  const cartao = pagina.locator("article").filter({ hasText: "alojamento turístico" }).first();
  await cartao.scrollIntoViewIfNeeded();
  if ((await cartao.getByRole("button", { expanded: true }).count()) === 0) {
    await cartao.locator("button").first().click();
    await pagina.waitForTimeout(500);
  }
  return cartao;
}

const navegador = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
});

try {
  for (const [rotulo, viewport] of [
    ["telemóvel 360", { width: 360, height: 740 }],
    ["desktop 1280", { width: 1280, height: 900 }],
  ]) {
    for (const tema of ["light", "dark"]) {
      console.log(`\n═══ ${rotulo} · ${tema} ═══`);

      const contexto = await navegador.newContext({ viewport, colorScheme: tema });
      await contexto.addInitScript(semear);
      await contexto.addInitScript(
        `try { localStorage.setItem("recibocerto:changelog_visto", ${JSON.stringify(VERSAO)}); } catch {}`,
      );

      const pagina = await contexto.newPage();
      const errosJS = [];
      pagina.on("pageerror", (e) => errosJS.push(String(e)));

      // ═══ 1. FASE A — configurar antes de ver resultados ═════════
      //  ┌────────────────────────────────────────────────────────────┐
      //  │ NÃO `networkidle`, E A RAZÃO É DO PRODUTO                   │
      //  │                                                            │
      //  │ Esta página pede dois packs públicos ao abrir, e trata os   │
      //  │ dois como OPCIONAIS por desenho: se o INE não responder, o  │
      //  │ motor corre na mesma e cada dossier diz que não tem leitura │
      //  │ ligada. Esperar por `networkidle` amarrava a verificação à  │
      //  │ latência de um terceiro que o produto decidiu não precisar  │
      //  │ — e amarrou mesmo: o CI expirou aos 30 s à espera da rota   │
      //  │ da oferta enquanto ela gastava o orçamento de tentativas.   │
      //  │                                                            │
      //  │ O que interessa verificar é a página ficar USÁVEL, e isso é │
      //  │ o `waitFor` da linha seguinte. É um acoplamento mais forte  │
      //  │ ao que importa e mais fraco ao que não importa.             │
      //  └────────────────────────────────────────────────────────────┘
      await pagina.goto(`${BASE}/ferramentas/descobrir-negocio`, { waitUntil: "domcontentloaded" });
      await fecharOverlays(pagina);
      await pagina.locator("#contexto-descoberta").waitFor({ timeout: 20000 });

      await semErroDeRuntime(pagina, "descoberta: fase A");
      await semOverflow(pagina, "descoberta: fase A");
      await controlosTocaveis(pagina, "descoberta: fase A");
      await mapaNaoTapaABarra(pagina, "descoberta: fase A");

      const faseA = await pagina.evaluate(() => document.body.innerText);
      verificar(
        "abre na configuração, não em resultados",
        /O teu perfil está a formar-se/.test(faseA) && !/passaram os critérios/.test(faseA),
      );
      verificar(
        "a barra é de profundidade do contexto, nunca de precisão",
        // `innerText` devolve o texto JÁ transformado por CSS, e este
        // rótulo é `uppercase`. Comparar sem ignorar a caixa dava um
        // falso negativo permanente.
        /quanto já conhecemos do teu cenário/i.test(faseA) && !/precisão do perfil/i.test(faseA),
      );
      verificar(
        "não despeja cartões de negócio durante a configuração",
        (await pagina.locator("#ferramenta article").count()) === 0,
      );

      const botaoDescobrir = pagina.getByRole("button", { name: /Descobrir oportunidades/ });
      verificar("o botão de descoberta existe", (await botaoDescobrir.count()) > 0);

      // ── O TETO DE CAPITAL É UM ELIMINADOR, E PODE NÃO SER O REAL ──
      //  Este campo não ordena: apaga modelos que não arrancam com o que
      //  a pessoa declarou. Quem desconhece os apoios públicos fixa aqui
      //  um teto mais baixo do que o que lhe é acessível e perde
      //  hipóteses por uma razão que não é verdadeira. O aviso vem ANTES
      //  de responder — e nomeia programas, nunca valores, porque as
      //  condições mudam e a elegibilidade é decidida no IEFP.
      const notaCapital = await pagina.evaluate(() => {
        const texto = document.querySelector("#ferramenta")?.innerText ?? "";
        const linha = texto.split("\n").find((l) => /Antes de fixares o teto/.test(l));
        return linha ?? "";
      });
      verificar("o teto de capital avisa que há apoios públicos", notaCapital.length > 0);
      verificar(
        "e esse aviso nomeia programas, nunca valores",
        notaCapital.length > 0 && !/\d[\d\s.,]*\s*(€|%)/.test(notaCapital),
        notaCapital.slice(0, 160),
      );
      verificar("e está desativado enquanto não houver o mínimo", await botaoDescobrir.first().isDisabled());

      // ═══ 2. Responder o essencial ═══════════════════════════════
      await pagina
        .getByRole("button", { name: /Logística e transporte/ })
        .first()
        .click();
      await pagina
        .getByRole("button", { name: /Organizar e executar/ })
        .first()
        .click();
      await pagina.selectOption("#ode-regiao", "grande-lisboa");
      await pagina.getByRole("button", { name: "1 000 – 5 000 €", exact: true }).first().click();
      await pagina
        .getByRole("button", { name: /Carta de condução/ })
        .first()
        .click();
      await pagina
        .getByRole("button", { name: /Viatura de carga/ })
        .first()
        .click();

      // Presença não chega. Confirma-se cada dimensão que o motor usa —
      // esta é a regressão da carrinha “existe, logo serve”.
      const carta = pagina.locator('[data-adequacao-meios] [data-ativo="carta-conducao"]');
      await carta.getByLabel("Estado real").selectOption("adequado");
      await carta.getByLabel("Disponibilidade").selectOption("sempre");
      await carta.getByLabel("Forma de acesso").selectOption("proprio");
      await carta.getByLabel("Pode ser usado profissionalmente?").selectOption("confirmado");

      const viatura = pagina.locator('[data-adequacao-meios] [data-ativo="veiculo-carga"]');
      await viatura.locator("button[aria-expanded]").click();
      await viatura.getByLabel("Estado real").selectOption("adequado");
      await viatura.getByLabel("Disponibilidade").selectOption("sempre");
      await viatura.getByLabel("Forma de acesso").selectOption("proprio");
      await viatura.getByLabel("Pode ser usado profissionalmente?").selectOption("confirmado");
      await viatura.getByLabel("Configuração").selectOption("mercadorias");
      await viatura.getByLabel("Lugares").fill("2");
      await viatura.getByLabel("Capacidade de carga útil").selectOption("media");
      await viatura.getByLabel("Inspeção").selectOption("valida");

      // Antes de o ano, a circulação e as medidas serem respondidos, a
      // viatura NÃO pode contar como confirmada. É a regressão de «tenho
      // carrinha»: uma carrinha de 2004, de dois lugares e com uma zona de
      // carga onde não entra uma palete não faz o mesmo trabalho que uma
      // de 2023, e o motor tratava-as como o mesmo meio.
      await pagina.waitForTimeout(200);
      verificar(
        "sem ano, circulação e medidas, a viatura ainda não está confirmada",
        (await pagina.getByText("Confirmado", { exact: true }).count()) < 2,
      );

      await viatura.getByLabel("Ano da primeira matrícula").fill("2019");
      await viatura.getByLabel("Circulação").selectOption("sem-restricoes");
      await viatura
        .getByLabel("Comprimento da zona de carga, em centímetros")
        .fill("180");
      await viatura
        .getByLabel("Largura da zona de carga, em centímetros")
        .fill("110");
      await viatura.getByLabel("Altura da zona de carga, em centímetros").fill("120");
      await pagina.waitForTimeout(300);

      verificar(
        "carta e viatura só contam depois de confirmar adequação",
        (await pagina.getByText("Confirmado", { exact: true }).count()) >= 2,
      );

      // O emblema responde a «já disseste?», não a «serve para este
      // trabalho?». Se a zona de carga for pequena de mais para uma palete,
      // a viatura continua declarada — o que muda é a hipótese que o motor
      // deixa de apresentar, e isso está fixado nos testes de unidade
      // (`negocio-descoberta-personalizacao-adaptativa`). Aqui só se
      // verifica que a leitura da idade aparece no ecrã com a base legal.
      await viatura.getByLabel("Ano da primeira matrícula").fill("2010");
      await pagina.waitForTimeout(300);
      verificar(
        "a idade declarada traz a periodicidade legal da inspeção",
        /inspeção desta viatura já é anual/.test(
          await viatura.innerText(),
        ),
      );
      await viatura.getByLabel("Ano da primeira matrícula").fill("2019");
      await pagina.waitForTimeout(300);

      const profundidade = await pagina.evaluate(
        () => document.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow") ?? "0",
      );
      verificar("a profundidade sobe com as respostas", Number(profundidade) > 30, profundidade);
      verificar("o botão fica ativo", !(await botaoDescobrir.first().isDisabled()));
      await semOverflow(pagina, "descoberta: contexto preenchido");

      // ═══ 3. FASE B — os resultados, com o trabalho à vista ══════
      await botaoDescobrir.first().click();
      await pagina.locator("#resultado-descoberta").waitFor({ timeout: 20000 });
      await pagina.waitForTimeout(600);

      const faseB = await pagina.evaluate(() => document.body.innerText);
      verificar(
        "diz o que o motor fez, com contagens",
        /combinações consideradas/.test(faseB) && /hipóteses compostas/.test(faseB),
      );
      verificar("separa encaixe de confiança", /Encaixa contigo \d+%/.test(faseB) && /Confiança/.test(faseB));
      verificar("mostra as etapas reais do pipeline", /A compor hipóteses/.test(faseB));

      const cartoes = await pagina.locator("#ferramenta article").count();
      verificar("apresenta hipóteses", cartoes > 0, `${cartoes} cartões`);
      await semErroDeRuntime(pagina, "descoberta: fase B");
      await semOverflow(pagina, "descoberta: fase B");
      await controlosTocaveis(pagina, "descoberta: fase B");

      // ═══ 3b. O motor compõe o que ninguém escreveu ══════════════
      //  A afirmação central: pelo menos um resultado tem de ser uma
      //  composição, e não um dos 24 dossiers curados.
      const titulos = await pagina.locator("#ferramenta article strong").allInnerTexts();
      const curados = await pagina.getByText("Dossier curado").count();
      verificar(
        "há hipóteses compostas que não são dossiers curados",
        titulos.length > curados,
        `${titulos.length} hipóteses, ${curados} curadas`,
      );

      // ═══ 4. O dossier explica-se ════════════════════════════════
      let cartao = pagina.locator("#ferramenta article").first();
      // O primeiro dossier abre já expandido. Clicar às cegas fechava-o —
      // e todas as verificações seguintes falhavam por não haver nada.
      if ((await cartao.getByRole("button", { expanded: true }).count()) === 0) {
        await cartao.locator("button").first().click();
      }
      // Os packs de mercado chegam de forma independente e podem reordenar
      // a lista enquanto este dossier está aberto. `.first()` passava então
      // a apontar para outro cartão a meio de um clique. A partir daqui a
      // âncora é o dossier realmente aberto, não a posição transitória.
      cartao = pagina
        .locator("#ferramenta article:has(> button[aria-expanded='true'])")
        .first();
      await cartao.waitFor({ state: "visible" });
      await pagina.waitForTimeout(500);
      let texto = await cartao.innerText();
      verificar("explica porque apareceu para esta pessoa", /Porque apareceu para ti/.test(texto));
      verificar("mostra capital e prazo em intervalo", /Investimento inicial/.test(texto));
      // ── A regra: nenhum número chega ao ecrã sem proveniência ──────
      //  Esta verificação já foi `/Estimativa/ || /Dado observado/` sobre
      //  o texto do cartão, e falhou duas vezes por duas razões
      //  diferentes — ambas de acoplamento ao texto, nenhuma do produto:
      //
      //   1. Uma hipótese sem evidência ligada e com capital não
      //      estimável mostra «não estimável com o que sabemos» e nenhum
      //      dos rótulos, o que está CERTO. A verificação dependia de
      //      qual hipótese calhava em primeiro.
      //   2. `innerText` devolve o texto JÁ transformado por CSS, e o
      //      rótulo que acompanha cada número é `uppercase`: sai
      //      «ESTIMATIVA». A comparação sensível à caixa só passava pela
      //      linha da evidência, a única em caixa normal — ou seja, só
      //      quando o pack de mercado respondia.
      //
      //  Ignorar a caixa resolvia (2) e destruía a verificação: `/hipótese/i`
      //  acerta em «31 → 27 hipóteses» e em «Nenhuma hipótese nova», e o
      //  teste passava a passar sempre, dissesse o produto o que dissesse.
      //
      //  Passa a ler o DOM. Cada número traz `data-numero`, e a origem
      //  viaja em `data-proveniencia` — em dados, não em prosa. A regra
      //  fica afirmada como o produto a promete: TODOS os números do
      //  cartão dizem de onde vêm, ou declaram-se não estimáveis.
      const blocosDeNumero = await cartao.evaluate((raiz) =>
        Array.from(raiz.querySelectorAll("[data-numero]")).map((no) => ({
          rotulo: no.getAttribute("data-numero") ?? "",
          origem: no.querySelector("[data-proveniencia]")?.getAttribute("data-proveniencia") ?? null,
          ausente: no.querySelector("[data-numero-ausente]") !== null,
        })),
      );
      // Sem este guarda a verificação seguinte passaria com zero números
      // no ecrã — que é exatamente o modo de falhar que interessa apanhar.
      verificar(
        "o dossier traz mesmo os números de capital e prazo",
        blocosDeNumero.length >= 3,
        `${blocosDeNumero.length} blocos`,
      );
      const mudos = blocosDeNumero.filter((bloco) => bloco.origem === null && !bloco.ausente);
      verificar(
        "o cartão nunca mostra um número sem dizer de onde vem",
        blocosDeNumero.length > 0 && mudos.length === 0,
        mudos.length > 0 ? `sem origem: ${mudos.map((bloco) => bloco.rotulo).join(", ")}` : "",
      );

      const ORIGENS = ["observado", "estimativa", "calculo", "hipotese"];
      const marcas = await pagina.$$eval("#ferramenta [data-proveniencia]", (nos) =>
        nos.map((no) => no.getAttribute("data-proveniencia")),
      );
      verificar(
        "marca o que é estimativa e o que é observação",
        marcas.length > 0 && marcas.every((origem) => ORIGENS.includes(origem)),
        `${marcas.length} marcas: ${[...new Set(marcas)].join(", ")}`,
      );
      verificar(
        "nunca lê ausência de concorrentes como oportunidade",
        !/pouca oferta/i.test(texto) || /por apurar/i.test(texto),
      );
      verificar(
        "traz plano de validação com critério",
        /Validar esta oportunidade/.test(texto) && /Feito quando:/.test(texto),
      );

      // «Como chegámos a esta conclusão?»
      // `evaluate(click)` é deliberado: a geometria/tamanho dos controlos já
      // foi verificada acima; aqui testamos a transição de estado. Um clique
      // Playwright normal espera estabilidade visual e pode perder 30 s se
      // uma fonte ao vivo reordenar o cartão durante o scroll automático.
      await cartao
        .getByRole("button", { name: /Como chegámos a esta conclusão/ })
        .evaluate((botao) => botao.click());
      await pagina.waitForTimeout(400);
      texto = await cartao.innerText();
      verificar(
        "abre as dimensões em separado",
        /Compatibilidade contigo/.test(texto) && /Exequibilidade/.test(texto) && /Lacuna de oferta/.test(texto),
      );
      // A força da evidência e a atualidade dos dados SAÍRAM do score e
      // viajam com a confiança. Somadas ao score mediam a quantidade de
      // dados dentro de um número apresentado como juízo sobre o negócio.
      verificar(
        "a força da evidência viaja com a confiança, não com o score",
        /Força da evidência/.test(texto) && !/Força das evidências/.test(texto),
      );
      verificar(
        "a pontuação vai publicada com a incerteza ao lado",
        /Pontuação \d+/.test(texto) && (/entre \d+ e \d+/.test(texto) || /não há intervalo/.test(texto)),
      );
      // ┌────────────────────────────────────────────────────────────┐
      // │ A GARANTIA É «NUNCA EM BRANCO», NÃO «HÁ SEMPRE UMA LACUNA»  │
      // │                                                            │
      // │ Isto assertava `/sem base para avaliar/` no dossier, o que  │
      // │ exigia que a hipótese aberta TIVESSE uma dimensão por       │
      // │ avaliar. Passou a falhar quando o motor deixou de eliminar  │
      // │ por meios compráveis e a hipótese de topo passou a ter as   │
      // │ oito dimensões com leitura — ou seja, falhava por ter       │
      // │ melhorado, que é o pior motivo para um teste falhar.        │
      // │                                                            │
      // │ O que interessa proteger é outro: uma dimensão sem base     │
      // │ NUNCA pode aparecer vazia nem valer zero por omissão. Cada  │
      // │ uma das oito mostra um número ou di-lo por palavras.        │
      // └────────────────────────────────────────────────────────────┘
      const painel = texto.slice(texto.indexOf("AS OITO DIMENSÕES"));
      const semLeitura = [
        "Compatibilidade contigo",
        "Procura",
        "Lacuna de oferta",
        "Cabe no capital e no prazo",
        "Exequibilidade",
        "Barreira regulatória",
        "Risco dentro da tua tolerância",
        "Adequação geográfica",
      ].filter((dimensao) => {
        const seguinte = painel.match(
          new RegExp(`${dimensao.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([^\\n]*)`),
        );
        return !seguinte || !(/^\d+$/.test(seguinte[1].trim()) || /sem base para avaliar/.test(seguinte[1]));
      });
      verificar(
        "nenhuma das oito dimensões aparece em branco",
        semLeitura.length === 0,
        semLeitura.join(", "),
      );
      verificar("publica o plano de investigação por executar", /por ligar/.test(texto));

      await semViolacoesAxe(pagina, "descoberta: dossier aberto");

      // ═══ 4b. A prova local sobrevive ao recarregamento ══════════
      await cartao.getByRole("button", { name: "Piloto pago", exact: true }).click();
      await cartao.locator('input[type="date"]').fill("2026-08-01");
      await cartao.getByRole("button", { name: /Registar/ }).click();
      await pagina.waitForTimeout(500);
      texto = await cartao.innerText();
      verificar(
        "um piloto pago é registado como prova de mercado",
        /prova de mercado/.test(texto),
        texto.slice(0, 160),
      );
      verificar("e a entrevista continua a não promover", /Enquanto não houver prova paga|alguém pagou/.test(texto));

      // ═══ 4c. O que descartámos ══════════════════════════════════
      const descartadas = pagina.getByRole("button", { name: /O que descartámos/ });
      if ((await descartadas.count()) > 0) {
        await descartadas.click();
        await pagina.waitForTimeout(400);
        const corpoDescartes = await pagina.evaluate(() => document.body.innerText);
        verificar(
          "as descartadas dizem o motivo e o que mudaria",
          /Deixaria de ser descartada se:/.test(corpoDescartes) || /Variante do mesmo/.test(corpoDescartes),
        );
      }

      // ═══ 5. A ponte para o preço leva o cenário ════════════════
      const paraPreco = cartao.getByRole("link", { name: /Formar o preço desta hipótese/ });
      const href = await paraPreco.getAttribute("href");
      verificar(
        "o CTA de preço leva o cenário do motor canónico",
        /modo=preco/.test(href ?? "") && /cenario=/.test(href ?? ""),
        href ?? "(sem href)",
      );

      const acoes = await cartao.evaluate((el) => {
        const principais = [...el.querySelectorAll("a")].filter(
          (a) => /rounded-full/.test(a.className) && /bg-brand\b/.test(a.className),
        );
        return principais.length;
      });
      verificar("há uma só ação principal no dossier", acoes === 1, String(acoes));

      // ═══ 5a. TODA a hipótese continua para o estúdio ════════════
      //  ┌──────────────────────────────────────────────────────────┐
      //  │ A continuidade para o estúdio era um `?o=<id do          │
      //  │ catálogo>`, e por isso existia SÓ para as composições que │
      //  │ coincidem com um dos 24 dossiers curados. Numa corrida    │
      //  │ real com duas hipóteses apresentadas, uma seguia e a      │
      //  │ outra acabava ali — e a que acabava era a GERADA, que é   │
      //  │ o que este motor existe para produzir.                    │
      //  │                                                          │
      //  │ Verifica-se por cartão e não no primeiro: era exatamente  │
      //  │ olhar só para o primeiro que deixava passar isto.         │
      //  └──────────────────────────────────────────────────────────┘
      //  ── Esperar pelo dossier, não pelo relógio ─────────────────
      //  Isto esperava 400 ms fixos depois de cada clique e contava a
      //  saída logo a seguir. Com poucos cartões chegava; com mais — e
      //  passou a haver mais — o quinto dossier ainda não tinha
      //  renderizado quando a contagem corria, e o guião concluía que
      //  faltava a saída. Pior: tentava depois ler o título para dizer
      //  QUAL cartão falhava, e morria nesse `textContent` com um
      //  timeout de trinta segundos. Uma verificação que rebenta em vez
      //  de falhar não diz o que encontrou.
      //
      //  A saída é incondicional dentro do dossier (`Dossier.tsx`): se
      //  ele abriu, ela existe. Esperar por ELA é portanto a mesma
      //  pergunta, feita sem cronómetro.
      const todosOsCartoes = await pagina.locator("section[aria-label='Oportunidades'] article").all();
      const semContinuidade = [];
      for (const artigo of todosOsCartoes) {
        const cabecalho = artigo.locator("button[aria-expanded]").first();
        if ((await cabecalho.getAttribute("aria-expanded")) !== "true") {
          await cabecalho.click();
        }
        const saida = artigo
          .getByRole("link", { name: /construir no estúdio/i })
          .or(artigo.getByRole("button", { name: /construir no estúdio/i }))
          .first();
        const abriu = await saida
          .waitFor({ state: "attached", timeout: 10000 })
          .then(() => true)
          .catch(() => false);
        if (!abriu) {
          const titulo = await artigo
            .locator("strong")
            .first()
            .textContent({ timeout: 2000 })
            .catch(() => null);
          semContinuidade.push(titulo?.trim() ?? "(cartão sem título legível)");
        }
      }
      verificar(
        "toda a hipótese apresentada continua para o estúdio",
        todosOsCartoes.length > 0 && semContinuidade.length === 0,
        semContinuidade.join(" | "),
      );

      // ═══ 5b. A lista aprende, explica e desfaz ═════════════════
      const primeiroAntesDoFeedback = pagina.locator("section[aria-label='Oportunidades'] article").first();
      await primeiroAntesDoFeedback.getByRole("button", { name: /Não é para mim/ }).click();
      await primeiroAntesDoFeedback.getByRole("button", { name: "Não quero este setor", exact: true }).click();
      await pagina.getByText(/Já respeitámos 1 escolha/).waitFor({ timeout: 5000 });
      verificar(
        "uma recusa muda a seleção e fica explicada",
        (await pagina.getByText(/Já respeitámos 1 escolha/).count()) === 1 &&
          (await pagina.getByText("Não quero este setor", { exact: true }).count()) >= 1,
      );
      await pagina.getByRole("button", { name: /Desfazer última/ }).click();
      await pagina.waitForTimeout(300);
      verificar(
        "a última escolha pode ser desfeita",
        (await pagina.getByText(/Já respeitámos 1 escolha/).count()) === 0 &&
          (await pagina.locator("section[aria-label='Oportunidades'] article").count()) > 0,
      );

      // ═══ 5c. Voltar ao contexto não perde as respostas ══════════
      await pagina.getByRole("button", { name: /Ajustar contexto/ }).click();
      await pagina.waitForTimeout(400);
      const devolta = await pagina.evaluate(() => document.body.innerText);
      verificar(
        "voltar ao contexto conserva o que já foi respondido",
        /O teu perfil está a formar-se/.test(devolta) && /2 competências/.test(devolta),
      );
      await pagina
        .getByRole("button", { name: /Voltar a analisar/ })
        .first()
        .click();
      await pagina.locator("#resultado-descoberta").waitFor({ timeout: 20000 });

      // ═══ 6. O preço que chega ao recibo é MENSAL (regressão) ════
      await pagina.goto(`${BASE}/ferramentas/recibos-verdes?modo=preco&cenario=servico&h=tourism-guest-operations`, {
        waitUntil: "networkidle",
      });
      await fecharOverlays(pagina);

      const concluir = pagina.getByRole("button", { name: /Usar este preço no recibo verde/ }).first();
      verificar("o estúdio de preço abre dentro dos recibos verdes", (await concluir.count()) > 0);
      await semOverflow(pagina, "recibos verdes: preço");

      if ((await concluir.count()) > 0) {
        await concluir.click();
        await pagina.waitForTimeout(2000);

        const painel = await pagina.evaluate(
          () => document.querySelector("#resultado-preco-transferido")?.innerText ?? "",
        );
        verificar("o painel de transferência aparece", painel.length > 0, painel.slice(0, 120));
        verificar(
          "o painel distingue preço por unidade de base mensal",
          /por unidade/.test(painel) && /por mês/.test(painel),
          painel.slice(0, 240),
        );

        // Quem acabou de formar um preço não pode cair no «Como queres
        // simular?»: o número que a página acabou de prometer transferir
        // ficava escondido atrás de mais uma escolha.
        const corpo = await pagina.evaluate(() => document.body.innerText);
        verificar(
          "o simulador abre já com o valor, sem voltar a perguntar o modo",
          !/Como queres simular\?/.test(corpo),
          corpo.slice(corpo.indexOf("Rever o preço"), corpo.indexOf("Rever o preço") + 120),
        );

        // O campo do recibo tem de conter a base MENSAL, não o unitário.
        const numeros = await pagina.evaluate(() => {
          const painelTexto = document.querySelector("#resultado-preco-transferido")?.innerText ?? "";
          const euros = [...painelTexto.matchAll(/([\d\s.]+,\d{2})\s*€/g)].map((m) =>
            Number(m[1].replace(/[\s. ]/g, "").replace(",", ".")),
          );
          const valores = [...document.querySelectorAll("input")]
            .map((input) =>
              Number(
                String(input.value)
                  .replace(/[\s. ]/g, "")
                  .replace(",", "."),
              ),
            )
            .filter((valor) => Number.isFinite(valor) && valor > 0);
          return { euros, valores };
        });
        const unitario = numeros.euros.length ? Math.min(...numeros.euros) : null;
        const mensal = numeros.euros.length ? Math.max(...numeros.euros) : null;
        const detalhe = `campos=${JSON.stringify(numeros.valores)} unitário=${unitario} mensal=${mensal}`;
        verificar(
          "o valor do recibo é a base mensal, não o preço de uma unidade",
          mensal !== null &&
            numeros.valores.some((valor) => Math.abs(valor - mensal) <= 1) &&
            // Com volume > 1 os dois números são diferentes: o unitário não
            // pode estar sozinho no campo mensal, que era o defeito.
            (unitario === mensal || !numeros.valores.some((valor) => Math.abs(valor - unitario) <= 0.01)),
          detalhe,
        );

        await semErroDeRuntime(pagina, "recibos verdes: transferido");
        await semOverflow(pagina, "recibos verdes: transferido");
      }

      // ═══ 7. O handoff para o estúdio de empresa ═════════════════
      await pagina.goto(`${BASE}/dashboard/negocio?o=tourism-guest-operations`, { waitUntil: "networkidle" });
      await fecharOverlays(pagina);
      await pagina.waitForTimeout(1500);

      const estudio = await pagina.evaluate(() => document.body.innerText);
      verificar(
        "a oportunidade abre na pricing engine, pelo nome",
        /Operações locais para alojamento turístico/.test(estudio),
      );
      await semErroDeRuntime(pagina, "estúdio: oportunidade");
      await semOverflow(pagina, "estúdio: oportunidade");

      // Recarregar não pode duplicar a oferta.
      await pagina.reload({ waitUntil: "networkidle" });
      await fecharOverlays(pagina);
      await pagina.waitForTimeout(1500);
      const repetido = await pagina.evaluate(
        () => (document.body.innerText.match(/Operações locais para alojamento turístico/g) ?? []).length,
      );
      const primeira = (estudio.match(/Operações locais para alojamento turístico/g) ?? []).length;
      verificar("atualizar a página não duplica a oferta", repetido === primeira, `${primeira} → ${repetido}`);

      // ═══ 8. O conteúdo essencial existe sem JavaScript ══════════
      //  A parte personalizada é, por natureza, dinâmica: depende de um
      //  contexto que só existe no browser de quem responde. O que TEM de
      //  existir no HTML é «Explorar mercado» — os dossiers curados, com
      //  problema, cliente, modelo de receita e teste de falsificação —
      //  para quem navega sem JavaScript e para um motor de busca.
      const contextoSemJs = await navegador.newContext({ viewport, javaScriptEnabled: false });
      const semJs = await contextoSemJs.newPage();
      await semJs.goto(`${BASE}/ferramentas/descobrir-negocio`, { waitUntil: "domcontentloaded" });
      const htmlSemJs = await semJs.content();
      const textoSemJs = htmlSemJs
        .replace(/<script[\s\S]*?<\/script>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ");
      for (const essencial of [
        "Explorar mercado",
        "alojamento turístico",
        "Entrevistar dez operadores",
        "Teste que pode matar a ideia",
        "Formar o preço desta hipótese",
      ]) {
        verificar(`sem JavaScript: «${essencial}» está no HTML`, textoSemJs.includes(essencial));
      }
      verificar(
        "sem JavaScript: os 24 dossiers curados estão no HTML",
        (textoSemJs.match(/Teste que pode matar a ideia|Problema:/g) ?? []).length >= 20,
      );
      verificar("sem JavaScript: não promete análise que não fez", !/passaram os critérios/.test(textoSemJs));
      await contextoSemJs.close();

      verificar("sem erros de JavaScript", errosJS.length === 0, errosJS.slice(0, 2).join(" | "));
      await contexto.close();
    }
  }
} finally {
  await navegador.close();
}

console.log(
  falhas.length === 0
    ? "\n✓ Motor de descoberta verificado nas quatro combinações."
    : `\n✗ ${falhas.length} falhas:\n${falhas.map((f) => `  · ${f}`).join("\n")}`,
);
process.exit(falhas.length === 0 ? 0 : 1);
