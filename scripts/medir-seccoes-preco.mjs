#!/usr/bin/env node
/**
 * ALTURA POR SECÇÃO DA CALCULADORA DE PREÇO.
 * ----------------------------------------------------------------------
 * A auditoria de densidade dá o total. Este dá a repartição — que é o que
 * é preciso para decidir ONDE cortar sem cortar às cegas.
 *
 * Mede os filhos diretos das duas colunas, mais as sub-secções do cartão
 * de resultado, que é o maior bloco único e onde o total engana: 1 200 px
 * repartidos por cinco coisas não se tratam como 1 200 px de uma só.
 *
 * Uso:  npx next start   (noutro terminal)
 *       RC_ESTADO=inicial|cheio node scripts/medir-seccoes-preco.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";
const VERSAO = readFileSync(join(RAIZ, "src/lib/version.ts"), "utf8").match(
  /APP_VERSION\s*=\s*"([^"]+)"/,
)?.[1];

const LARGURA = Number(process.env.RC_LARGURA ?? 360);
const ALTURA = Number(process.env.RC_ALTURA ?? 780);
const ESTADO = process.env.RC_ESTADO ?? "inicial";
const CENARIOS = (process.env.RC_CENARIOS ?? "produto_revenda,servico,marketplace").split(",");

const semear = `
  localStorage.setItem("recibocerto:onboarded", "1");
  localStorage.setItem("recibocerto:changelog_visto", ${JSON.stringify(VERSAO)});
  localStorage.setItem("recibocerto:cookie-consent", ${JSON.stringify(
    JSON.stringify({ necessarios: true, estatistica: false, marketing: false, versao: 2 }),
  )});
`;

const MEDIR = `(() => {
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const nome = (el) => {
    const rotulo = el.getAttribute("aria-label");
    if (rotulo) return rotulo;
    const h = el.querySelector("h1,h2,h3");
    if (h) return (h.textContent || "").trim().slice(0, 42);
    const b = el.querySelector("button");
    if (b) return (b.textContent || "").trim().slice(0, 42);
    return el.className.split(" ").slice(0, 2).join(" ").slice(0, 42) || el.tagName;
  };

  const raiz = document.querySelector("#ferramenta");
  if (!raiz) return { seccoes: [], total: 0 };

  // Os filhos diretos das colunas da grelha.
  const colunas = [...raiz.querySelectorAll(".grid > div")];
  const blocos = colunas.flatMap((c) => [...c.children]).filter(visivel);

  const seccoes = blocos.map((el) => ({
    nome: nome(el),
    altura: Math.round(el.getBoundingClientRect().height),
    palavras: ((el.innerText || "").match(/\\S+/g) || []).length,
  }));

  // O cartão de resultado por dentro: é o maior e o total engana.
  const cartao = raiz.querySelector('section[aria-label="Resultado"]');
  const dentro = cartao
    ? [...cartao.children].filter(visivel).map((el) => ({
        nome: "  ↳ " + nome(el),
        altura: Math.round(el.getBoundingClientRect().height),
        palavras: ((el.innerText || "").match(/\\S+/g) || []).length,
      }))
    : [];

  return {
    seccoes: seccoes.sort((a, b) => b.altura - a.altura),
    dentroDoResultado: dentro.sort((a, b) => b.altura - a.altura),
    total: Math.round(raiz.getBoundingClientRect().height),
  };
})()`;

const navegador = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
});

try {
  const contexto = await navegador.newContext({
    viewport: { width: LARGURA, height: ALTURA },
    locale: "pt-PT",
  });
  await contexto.addInitScript(semear);

  for (const cenario of CENARIOS) {
    const p = await contexto.newPage();
    await p.goto(`${BASE}/ferramentas/calcular-preco?c=${cenario}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(700);

    if (ESTADO === "cheio") {
      // Os campos ESSENCIAIS de cada cenário — são eles que levam o
      // `EstadoPreenchimento` a `completo` e abrem o nível 3. Encher às
      // cegas todos os `input[type=number]` não servia: os avançados não
      // contam para o essencial, e o estado ficava em `estimado`.
      for (const [id, v] of [
        ["custo-direto", 12], ["custo-producao", 3], ["materia-lote", 40],
        ["materia-unidades", 8], ["horas-unidade", 2], ["rendimento-ano", 30000],
        ["ganho-mensal", 2000], ["volume", 60], ["objetivo-pct", 40],
        ["preco-pensado", 20],
      ]) {
        const el = p.locator(`#${id}`).first();
        if (await el.count()) {
          await el.fill(String(v)).catch(() => {});
          await el.blur().catch(() => {});
        }
      }
      for (const [id, v] of [["regime-iva", "normal"], ["canal-venda", "worten"]]) {
        const el = p.locator(`select#${id}`).first();
        if (await el.count()) await el.selectOption(v).catch(() => {});
      }
      // O IVA das compras é um par de opções, não um campo.
      const semIva = p.locator('#ferramenta [role="radio"]').first();
      if (await semIva.count()) await semIva.click({ timeout: 1000 }).catch(() => {});
      await p.waitForTimeout(900);
    }

    const r = await p.evaluate(MEDIR);
    console.log(`\n═══ ${cenario} · ${ESTADO} · ${LARGURA}px — ${r.total} px (${(r.total / ALTURA).toFixed(1)} ecrãs) ═══`);
    for (const s of r.seccoes) {
      console.log(`  ${String(s.altura).padStart(5)} px  ${String(s.palavras).padStart(4)} pal.  ${s.nome}`);
    }
    if (r.dentroDoResultado.length) {
      console.log(`  ── dentro do cartão de resultado ──`);
      for (const s of r.dentroDoResultado) {
        console.log(`  ${String(s.altura).padStart(5)} px  ${String(s.palavras).padStart(4)} pal.  ${s.nome}`);
      }
    }
    await p.close();
  }

  await contexto.close();
} finally {
  await navegador.close();
}
