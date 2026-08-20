#!/usr/bin/env node
/**
 * VERIFICAÇÃO DO PERCURSO NEGÓCIO → EMPRESA — fim a fim, num browser.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO NÃO CABE NO VITEST                                       │
 * │                                                                     │
 * │ Os testes de `negocio-*` cobrem a verdade dos CÁLCULOS e dos         │
 * │ contratos: que a soma do handoff fecha, que um portefólio misto não  │
 * │ é reduzido a uma natureza, que o IVA sai no mês certo.               │
 * │                                                                     │
 * │ O que eles não conseguem ver é o que só existe num motor de          │
 * │ renderização: se «Já vendo» abre MESMO pelo preço atual, se o        │
 * │ projeto chega mesmo ao outro lado da ponte, se o ecrã tem scroll     │
 * │ horizontal a 360 px, e se o URL fica sem dados financeiros depois de │
 * │ a navegação acontecer de verdade.                                    │
 * │                                                                     │
 * │ São as promessas do relatório mestre §4, §19, §20, §24, §76 e §100 — │
 * │ e todas elas se cumprem ou não no ecrã.                              │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   npm run build && npm run start        (noutro terminal)
 *   npm run negocio:e2e
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

/** A versão real, lida da fonte — para o popup de Novidades não interferir. */
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
 * O preço com que o percurso é testado.
 *
 * Alto de propósito: o convite para continuar no simulador de empresa só
 * aparece quando o negócio dá resultado positivo — e isso é uma guarda,
 * não um defeito. Um preço que dá prejuízo esconderia o CTA com razão, e
 * o teste não estaria a verificar o que julga verificar.
 */
const PRECO_VIAVEL = "900";

const semear = () => {
  try {
    localStorage.setItem("recibocerto:onboarded", "1");
    localStorage.setItem("recibocerto:cookie-consent", JSON.stringify({
      necessarios: true, estatistica: false, marketing: false,
      data: new Date().toISOString(), versao: 1,
    }));
  } catch {
    /* modo privado: os overlays fecham-se por Escape */
  }
};

/** Fecha qualquer modal de entrada que ainda esteja por cima do ecrã. */
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

async function semErroDeRuntime(pagina, onde) {
  const erro = await pagina.evaluate(
    () =>
      document.querySelector("nextjs-portal") !== null ||
      /Application error|Unhandled Runtime Error|This page couldn/i.test(document.body.innerText),
  );
  verificar(`${onde}: sem erro de runtime`, !erro);
}

/**
 * Regra 5b do CLAUDE.md: alvos ≥ 36 px.
 *
 * Só CONTROLOS. Uma ligação dentro de prosa tem a altura do texto por
 * natureza, e a WCAG 2.5.8 isenta-a explicitamente — exigir-lhe 36 px
 * daria uma lista de falsos positivos que ninguém voltaria a ler.
 */
async function controlosTocaveis(pagina, onde) {
  const pequenos = await pagina.evaluate(() => {
    const maus = [];
    for (const el of document.querySelectorAll("button, select, input[type=range]")) {
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

      // ═══ 1. As três portas (§4, §5, §96) ═════════════════════════
      await pagina.goto(`${BASE}/dashboard/negocio`, { waitUntil: "networkidle" });
      await fecharOverlays(pagina);
      await pagina.getByRole("button", { name: /Tenho uma ideia/ }).waitFor({ timeout: 20000 });

      await semErroDeRuntime(pagina, "estúdio: entrada");
      await semOverflow(pagina, "estúdio: entrada");

      const entrada = await pagina.evaluate(() => document.body.innerText);
      for (const porta of ["Tenho uma ideia", "Já vendo", "Já tenho sociedade"]) {
        verificar(`porta «${porta}» presente`, entrada.includes(porta));
      }

      // ═══ 2. «Já vendo» começa pelo preço atual (§4.2) ════════════
      await pagina.getByRole("button", { name: /Já vendo/ }).click();
      await pagina.waitForTimeout(1500);
      await fecharOverlays(pagina);

      const cenario = pagina.getByRole("button", { name: /Um servi/i }).first();
      verificar("seletor de cenário responde", (await cenario.count()) > 0);
      if (await cenario.count()) {
        await cenario.click();
        await pagina.waitForTimeout(1200);
      }

      const noPortao = await pagina.evaluate(() => document.body.innerText);
      verificar("«Já vendo» abre pelo preço atual", /Quanto cobras hoje/.test(noPortao));
      await semOverflow(pagina, "estúdio: preço atual");
      await controlosTocaveis(pagina, "estúdio: preço atual");

      await pagina.fill("#preco-atual", PRECO_VIAVEL);
      await pagina.getByRole("button", { name: /Validar este preço/ }).click();
      await pagina.waitForTimeout(1500);

      const naCalculadora = await pagina.evaluate(() => document.body.innerText);
      verificar("a calculadora abre em modo de validação", /Estás a validar/.test(naCalculadora));
      await semErroDeRuntime(pagina, "estúdio: calculadora");
      await semOverflow(pagina, "estúdio: calculadora");

      // ═══ 3. O negócio, com as secções novas ══════════════════════
      const concluir = pagina.getByRole("button", { name: /Adicionar esta oferta ao negócio/ }).first();
      verificar("botão de concluir a oferta existe", (await concluir.count()) > 0);
      if ((await concluir.count()) === 0) {
        await contexto.close();
        continue;
      }
      await concluir.click();
      await pagina.waitForTimeout(2500);

      const negocio = await pagina.evaluate(() => document.body.innerText);
      for (const seccao of [
        "Onde é que o negócio acontece",
        "Como se distribui o ano",
        "A tua situação de IVA",
      ]) {
        verificar(`secção «${seccao}» presente`, negocio.includes(seccao));
      }
      verificar(
        "CTA de continuidade presente",
        /Queres ver este mesmo negócio como empresa/.test(negocio),
      );
      await semErroDeRuntime(pagina, "estúdio: negócio");
      await semOverflow(pagina, "estúdio: negócio");
      await controlosTocaveis(pagina, "estúdio: negócio");

      // ═══ 4. A revisão antes de sair (§19) ════════════════════════
      await pagina.getByRole("button", { name: /Ver o que vamos levar/ }).click();
      await pagina.waitForSelector("#revisao-handoff", { timeout: 10000 });
      await pagina.waitForTimeout(400);

      const revisao = await pagina.evaluate(
        () => document.querySelector("#revisao-handoff")?.textContent ?? "",
      );
      verificar(
        "revisão mostra «vamos levar» e «ainda vais decidir»",
        /Vamos levar/.test(revisao) && /Ainda vais decidir/.test(revisao),
        revisao.slice(0, 160),
      );
      verificar(
        "cada valor levado diz de onde veio (§67)",
        /Volume de negócios/.test(revisao) && /oferta/.test(revisao),
      );

      // ═══ 5. A ponte, e o URL sem dados (§10, §20, §24) ═══════════
      await pagina.getByRole("button", { name: /Continuar com estes dados/ }).click();
      await pagina.waitForURL(/simulador-empresa/, { timeout: 15000 });
      await pagina.waitForTimeout(2500);

      const importado = await pagina.evaluate(() => document.body.innerText);
      verificar("banner de importação aparece", /Continuamos de onde ficaste/.test(importado));
      verificar("saída «ignorar importação» presente", /Ignorar importação/.test(importado));
      verificar("saída «voltar ao projeto» presente", /Voltar ao projeto/.test(importado));

      const url = new URL(pagina.url());
      verificar(
        "URL sem dados financeiros (§10)",
        url.search.length === 0 && url.hash.length === 0,
        pagina.url(),
      );

      await semErroDeRuntime(pagina, "empresa: importado");
      await semOverflow(pagina, "empresa: importado");

      verificar("sem erros de JavaScript", errosJS.length === 0, errosJS.slice(0, 2).join(" | "));
      await contexto.close();
    }
  }
} finally {
  await navegador.close();
}

console.log(
  falhas.length === 0
    ? "\n✓ Percurso negócio → empresa verificado nas quatro combinações."
    : `\n✗ ${falhas.length} falhas:\n${falhas.map((f) => `  · ${f}`).join("\n")}`,
);
process.exit(falhas.length === 0 ? 0 : 1);
