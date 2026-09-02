#!/usr/bin/env node
/**
 * VERIFICAÇÃO DA ZONA DE RISCO — num browser a sério.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO NÃO CABE NO VITEST                                       │
 * │                                                                     │
 * │ `conta-catalogo.test.ts` cobre a verdade dos CATÁLOGOS: que todo o   │
 * │ conjunto apagável tem bloco no SQL, que o inventário tem uma chave   │
 * │ por conjunto, que um apagamento na nuvem não pode arrastar o         │
 * │ estúdio de negócio.                                                  │
 * │                                                                     │
 * │ O que ele não consegue ver é o `localStorage` a ser mesmo mexido.    │
 * │ O defeito que isto apanha — apagar uma coisa e o cofre inteiro sair  │
 * │ atrás — só existe em runtime, e passou despercebido durante meses    │
 * │ porque nenhum teste tocava no armazenamento do browser.              │
 * │                                                                     │
 * │ Também o que só existe num motor de renderização: a secção aparecer  │
 * │ a quem NÃO tem sessão (era `if (!user) return null`), não haver      │
 * │ scroll horizontal a 360px, e o piso tipográfico.                     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   npm run build && npm run start        (noutro terminal)
 *   npm run zona:e2e
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

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";
const ROTA = `${BASE}/dashboard/conta`;

const VERSAO = readFileSync(join(RAIZ, "src/lib/version.ts"), "utf8").match(
  /APP_VERSION\s*=\s*"([^"]+)"/,
)?.[1];

const falhas = [];
const ok = (nome) => console.log(`  ✓ ${nome}`);
const falhar = (nome, detalhe) => {
  falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};
const verificar = (nome, condicao, detalhe) => (condicao ? ok(nome) : falhar(nome, detalhe));

/**
 * O cofre de quem não tem sessão é o `anonimo` — e é o caso que interessa,
 * porque é o de quem nunca criou conta. `sim-irs` entra SEM sufixo de
 * cofre de propósito: é a chave pré-cofre, a que o simulador de IRS ainda
 * escreve, e a que sobrevivia a um apagamento.
 */
const SEMENTE = {
  "recibocerto:onboarded": "1",
  "recibocerto:changelog_visto": VERSAO ?? "0",
  // Sem isto, o painel de cookies fica por cima e intercepta os cliques.
  "recibocerto:cookie-consent": JSON.stringify({
    necessarios: true, estatistica: false, marketing: false,
    data: new Date().toISOString(), versao: 2,
  }),
  "recibocerto:negocio:v1::anonimo": JSON.stringify({ nome: "Padaria", custos: [1, 2, 3] }),
  "recibocerto:precos-guardados:v1::anonimo": JSON.stringify([{ a: 1 }, { a: 2 }]),
  "recibocerto:cenarios:v1::anonimo": JSON.stringify([{ c: 1 }]),
  "recibocerto:sim-irs:v1": JSON.stringify({ rendimento: 20000 }),
};

const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
});

async function abrir(tema = "light") {
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 760 },
    colorScheme: tema,
  });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => falhar(`erro de runtime (${tema})`, e.message));
  await p.goto(BASE, { waitUntil: "domcontentloaded" });
  await p.evaluate((s) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, SEMENTE);
  await p.goto(ROTA, { waitUntil: "networkidle" });
  return { ctx, p, zona: p.locator('section[aria-labelledby="zona-risco"]') };
}

/**
 * Existe, numa das DUAS formas da chave?
 *
 * A verificação tem de olhar para as duas: o recarregamento que vem a
 * seguir a apagar corre `migrarParaCofre`, que move a chave pré-cofre para
 * dentro do cofre. Olhar só para a forma antiga dava «apagado» a uma chave
 * que apenas tinha mudado de nome, e o teste passava sem provar nada.
 */
const existe = (p, chave) =>
  p.evaluate(
    (k) => localStorage.getItem(k) !== null || localStorage.getItem(`${k}::anonimo`) !== null,
    chave,
  );

const chaves = async (p) => ({
  precos: await existe(p, "recibocerto:precos-guardados:v1"),
  negocio: await existe(p, "recibocerto:negocio:v1"),
  cenarios: await existe(p, "recibocerto:cenarios:v1"),
  irs: await existe(p, "recibocerto:sim-irs:v1"),
});

async function apagarUm(p, zona, rotulo) {
  await p.getByText(rotulo, { exact: true }).click();
  await zona.getByRole("button", { name: /^Apagar 1 conjunto/ }).click();
  await p.locator("#conf-selecao").pressSequentially("apagar o que escolhi", { delay: 3 });
  await zona.getByRole("button", { name: /^Apagar 1 conjunto/ }).click();
  await p.waitForTimeout(700);
}

// ── 1. Existe, e é legível, nos dois temas e a 360px ────────────────
for (const tema of ["light", "dark"]) {
  console.log(`\n── A secção a 360px · ${tema} ──────────────────────────`);
  const { ctx, p, zona } = await abrir(tema);

  const apareceu = await zona.count().then((n) => n > 0);
  // ⚠️ Começava por `if (!user) return null`: quem não tem conta — e tem
  // tudo no aparelho — não via zona de risco nenhuma.
  verificar("aparece sem sessão iniciada", apareceu);
  if (!apareceu) { await ctx.close(); continue; }

  const txt = await zona.innerText();
  // `innerText` respeita `text-transform`, e o título é `uppercase`.
  verificar("tem a secção «Neste dispositivo»", /neste dispositivo/i.test(txt));
  verificar("lista o estúdio de negócio", /Estúdio de negócio/.test(txt));
  verificar("conta os registos locais", /2 registos/.test(txt));
  verificar("explica que não há nuvem sem sessão", /não há nada teu na nuvem/i.test(txt));
  // ⚠️ `retidos` não filtrava por papel nem por inventário: mostrava
  // «Recebimentos e conta Stripe» a quem nunca tinha sido contabilista.
  verificar("não fala de recebimentos a quem nunca os teve", !/Recebimentos/.test(txt));

  const over = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  verificar("sem scroll horizontal a 360px", over <= 0, over > 0 ? `${over}px` : "");

  const pequenos = await p.evaluate(() => {
    const z = document.querySelector('section[aria-labelledby="zona-risco"]');
    let n = 0;
    for (const el of z.querySelectorAll("*")) {
      if (!el.textContent?.trim() || el.children.length) continue;
      if (parseFloat(getComputedStyle(el).fontSize) < 12) n += 1;
    }
    return n;
  });
  verificar("nenhum texto abaixo do piso de 12px", pequenos === 0, `${pequenos} elementos`);

  await ctx.close();
}

// ── 2. A confirmação diz a verdade ──────────────────────────────────
console.log("\n── A confirmação ──────────────────────────────────────");
{
  const { ctx, p, zona } = await abrir();
  await p.getByText("Preços guardados", { exact: true }).click();
  const botao = zona.getByRole("button", { name: /^Apagar 1 conjunto/ });
  verificar("o botão conta o que está escolhido", (await botao.count()) > 0);
  await botao.click();

  const caixa = await zona.innerText();
  verificar("mostra o que vai sair antes de pedir a frase", /Vai sair isto/.test(caixa));
  verificar("a frase descreve a seleção", /apagar o que escolhi/.test(caixa));
  // ⚠️ Escolher uma coisa pedia «apagar todos os dados».
  verificar("já não pede «apagar todos os dados»", !/apagar todos os dados/.test(caixa));

  const desativado = await zona
    .getByRole("button", { name: /^Apagar 1 conjunto/ })
    .isDisabled();
  verificar("o botão está desativado até a frase bater certo", desativado);
  await ctx.close();
}

// ── 3. Apagar UM não pode levar o resto ─────────────────────────────
console.log("\n── O apagamento é o que foi escolhido, e mais nada ─────");
{
  const { ctx, p, zona } = await abrir();
  await apagarUm(p, zona, "Preços guardados");
  const d = await chaves(p);
  verificar("o que foi escolhido saiu", d.precos === false);
  // ⚠️ Era `esvaziarCofre`: apagar uma coisa levava os dezoito domínios.
  verificar("o estúdio de negócio ficou", d.negocio === true);
  verificar("os cenários ficaram", d.cenarios === true);
  verificar("a simulação de IRS ficou", d.irs === true);
  await ctx.close();
}

// ── 4. A chave pré-cofre sai quando É escolhida ─────────────────────
console.log("\n── A chave pré-cofre ──────────────────────────────────");
{
  const { ctx, p, zona } = await abrir();
  await apagarUm(p, zona, "Simulação de IRS a meio");
  const d = await chaves(p);
  // ⚠️ `esvaziarCofre` só removia `chave::cofre`, e o simulador de IRS
  // escreve na chave global. O rascunho sobrevivia ao apagamento — e o
  // recarregamento seguinte copiava-o de volta para o cofre.
  verificar("a simulação de IRS saiu nas DUAS formas da chave", d.irs === false);
  verificar("e não levou os preços guardados à frente", d.precos === true);
  await ctx.close();
}

await browser.close();

console.log("");
if (falhas.length) {
  console.log(`✗ ${falhas.length} falha(s) na zona de risco:`);
  for (const f of falhas) console.log(`   · ${f}`);
  process.exit(1);
}
console.log("✓ zona de risco: aparece sem sessão, conta o que existe, e apaga só o que foi escolhido.");
