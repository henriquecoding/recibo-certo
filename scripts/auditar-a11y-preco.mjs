#!/usr/bin/env node
/**
 * AUDITORIA DE ACESSIBILIDADE DA CALCULADORA DE PREÇO.
 * ----------------------------------------------------------------------
 * Corre o axe em vários estados — não só o inicial — porque a ferramenta
 * muda de forma consoante o que a pessoa responde: blocos abrem, secções
 * novas nascem, e um resultado impossível substitui o cartão inteiro. Um
 * axe só na primeira vista audita o folheto, não o produto.
 *
 * Cobre também o que o axe NÃO vê e o §18 exige:
 *   · alvos de toque abaixo de 24×24 (WCAG 2.2 AA, 2.5.8);
 *   · scroll horizontal a 320 px (1.4.10 reflow);
 *   · elementos sem foco visível;
 *   · regiões vivas em falta.
 *
 * Uso:  npx next start   (noutro terminal)
 *       node scripts/auditar-a11y-preco.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";
const VERSAO = readFileSync(join(RAIZ, "src/lib/version.ts"), "utf8").match(
  /APP_VERSION\s*=\s*"([^"]+)"/,
)?.[1];

const semear = `
  localStorage.setItem("recibocerto:onboarded", "1");
  localStorage.setItem("recibocerto:changelog_visto", ${JSON.stringify(VERSAO)});
  localStorage.setItem("recibocerto:cookie-consent", ${JSON.stringify(
    JSON.stringify({ necessarios: true, estatistica: false, marketing: false, versao: 1 }),
  )});
`;

/** Os estados a auditar. Cada um é uma forma diferente da ferramenta. */
const ESTADOS = [
  { nome: "seletor de cenário", url: "/ferramentas/calcular-preco", preparar: null },
  { nome: "cenário inicial", url: "/ferramentas/calcular-preco?c=produto_revenda", preparar: null },
  {
    nome: "blocos abertos",
    url: "/ferramentas/calcular-preco?c=marketplace",
    preparar: async (p) => {
      for (const t of ["enquadramento fiscal", "mesmo sem vender", "Comissões", "Devoluções", "Desconto"]) {
        const b = p.locator("button", { hasText: t }).first();
        if (await b.count()) await b.click().catch(() => {});
        await p.waitForTimeout(120);
      }
    },
  },
  {
    nome: "preço impossível",
    url: "/ferramentas/calcular-preco?c=marketplace",
    preparar: async (p) => {
      const el = p.locator("#objetivo-pct").first();
      if (await el.count()) { await el.fill("95"); await el.blur(); }
      await p.waitForTimeout(400);
    },
  },
  {
    nome: "memória de cálculo aberta",
    url: "/ferramentas/calcular-preco?c=servico",
    preparar: async (p) => {
      // Dois cliques desde as camadas de revelação: primeiro revela-se a
      // secção, depois abre-se a memória lá dentro. A memória nunca abre
      // sozinha em nível nenhum — ver `lib/pricing/nivel.ts`.
      for (const t of ["Como se chegou a este número", "Ver cálculo"]) {
        const b = p.locator("button", { hasText: t }).first();
        if (await b.count()) await b.click().catch(() => {});
        await p.waitForTimeout(250);
      }
    },
  },
  {
    // Estado novo: TUDO revelado. É o pior caso de densidade e de
    // acessibilidade, e sem ele a auditoria só via a ferramenta arrumada.
    nome: "tudo revelado",
    url: "/ferramentas/calcular-preco?c=marketplace",
    preparar: async (p) => {
      // `timeout` curto e explícito: o `.click()` do Playwright espera 30 s
      // por omissão, e um alvo que nunca fica estável multiplicava isso por
      // doze cliques e quatro vistas. A auditoria deixava de terminar.
      for (let i = 0; i < 12; i++) {
        const b = p.locator('button[aria-expanded="false"]').first();
        if (!(await b.count())) break;
        await b.click({ timeout: 1500 }).catch(() => {});
        await p.waitForTimeout(100);
      }
    },
  },
];

const VISTAS = [
  { nome: "desktop claro", w: 1280, h: 900, tema: "light" },
  { nome: "mobile 360 claro", w: 360, h: 780, tema: "light" },
  { nome: "desktop escuro", w: 1280, h: 900, tema: "dark" },
  { nome: "mobile 320 claro", w: 320, h: 780, tema: "light" },
];

/** O que o axe não vê e o WCAG 2.2 exige. */
const EXTRAS = `(() => {
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none";
  };
  const raiz = document.querySelector("#ferramenta") || document.body;

  // WCAG 2.2 · 2.5.8 Target Size (Minimum): 24×24 CSS px.
  //
  // Medir com getBoundingClientRect SOZINHO mente. O padrão do repositório
  // (ver InfoTip) desenha um botão pequeno e alarga a área de toque com um
  // pseudo-elemento absoluto de inset negativo (before:-inset-2.5). O rato
  // acerta nos 36x36 do pseudo-elemento, mas a caixa do botão continua a
  // dizer 16x16. Medir só a caixa dava aqui 141 «falhas» que não existem, e
  // um alarme que toca 141 vezes deixa de servir para travar regressões.
  //
  // Por isso a área efetiva soma os insets negativos de ::before/::after.
  // É analítico em vez de elementFromPoint de propósito: funciona para
  // elementos fora da janela, que são a maioria numa página deste tamanho.
  const areaEfetiva = (el) => {
    const r = el.getBoundingClientRect();
    let w = r.width;
    let h = r.height;
    for (const pseudo of ["::before", "::after"]) {
      const s = getComputedStyle(el, pseudo);
      if (!s.content || s.content === "none" || s.position !== "absolute") continue;
      const px = (v) => (typeof v === "string" && v.endsWith("px") ? parseFloat(v) : NaN);
      const [t, b, l, d] = [px(s.top), px(s.bottom), px(s.left), px(s.right)];
      if ([t, b, l, d].some(Number.isNaN)) continue;
      // inset negativo → o pseudo-elemento transborda a caixa nos dois lados
      w = Math.max(w, r.width - l - d);
      h = Math.max(h, r.height - t - b);
    }
    return { w: Math.round(w), h: Math.round(h) };
  };

  // Exceção «inline» da 2.5.8: «the target is in a sentence or its size is
  // otherwise constrained by the line-height of non-target text». Operacio-
  // nalizada como: é um link de fluxo E o parágrafo à volta tem texto que
  // não é dele. Um «Diz-nos» no meio de uma frase está coberto; um link
  // sozinho num item de lista ou num parágrafo não está — e é esse que se
  // corrige. (Sem plicas invertidas neste bloco: é um template literal.)
  const noMeioDeUmaFrase = (el) => {
    if (el.tagName !== "A") return false;
    const pai = el.parentElement;
    if (!pai) return false;
    const textoDoPai = (pai.textContent || "").trim();
    const textoDoLink = (el.textContent || "").trim();
    return textoDoPai.length > textoDoLink.length + 1;
  };

  const interativos = [...raiz.querySelectorAll("a,button,input,select,textarea,[role=radio],[role=slider],[tabindex]")].filter(visivel);
  const pequenos = interativos
    .filter((el) => !noMeioDeUmaFrase(el))
    .map((el) => ({
      el,
      caixa: el.getBoundingClientRect(),
      efetiva: areaEfetiva(el),
    }))
    .filter(({ efetiva }) => efetiva.w < 24 || efetiva.h < 24)
    .map(({ el, caixa, efetiva }) => ({
      tag: el.tagName.toLowerCase(),
      nome: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40),
      w: efetiva.w,
      h: efetiva.h,
      caixa: Math.round(caixa.width) + "×" + Math.round(caixa.height),
    }));

  const doc = document.documentElement;
  return {
    alvosPequenos: pequenos.slice(0, 10),
    totalAlvosPequenos: pequenos.length,
    scrollHorizontal: doc.scrollWidth > doc.clientWidth + 1,
    excesso: Math.max(0, doc.scrollWidth - doc.clientWidth),
    regioesVivas: raiz.querySelectorAll("[aria-live],[role=status],[role=alert]").length,
    semLabel: [...raiz.querySelectorAll("input,select,textarea")].filter(visivel).filter((el) => {
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
      return !(el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]'));
    }).length,
  };
})()`;

const navegador = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
});

let violacoesTotais = 0;
let alvosTotais = 0;
let overflowTotal = 0;

try {
  for (const vista of VISTAS) {
    console.log(`\n═══ ${vista.nome} ═══`);
    const contexto = await navegador.newContext({
      viewport: { width: vista.w, height: vista.h },
      colorScheme: vista.tema,
      locale: "pt-PT",
    });
    await contexto.addInitScript(semear);
    if (vista.tema === "dark") {
      await contexto.addInitScript(`localStorage.setItem("recibocerto:tema","dark");`);
    }

    for (const estado of ESTADOS) {
      const pagina = await contexto.newPage();
      await pagina.goto(`${BASE}${estado.url}`, { waitUntil: "networkidle" });
      await pagina.waitForTimeout(400);
      if (estado.preparar) await estado.preparar(pagina);
      await pagina.waitForTimeout(300);

      // Sem esta guarda, uma página que não renderizou — servidor caído a
      // meio, build trocado, rota mudada — sai como um stack trace do
      // axe («No elements found for include in page Context») que não diz
      // o que correu mal nem em que estado.
      if ((await pagina.locator("#ferramenta").count()) === 0) {
        console.log(`  ! ${estado.nome.padEnd(26)}#ferramenta não existe — o servidor está de pé?`);
        violacoesTotais += 1;
        await pagina.close();
        continue;
      }

      const r = await new AxeBuilder({ page: pagina })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .include("#ferramenta")
        .analyze();

      const extras = await pagina.evaluate(EXTRAS);
      violacoesTotais += r.violations.length;
      alvosTotais += extras.totalAlvosPequenos;
      if (extras.scrollHorizontal) overflowTotal++;

      const sinais = [];
      if (r.violations.length) sinais.push(`${r.violations.length} axe`);
      if (extras.totalAlvosPequenos) sinais.push(`${extras.totalAlvosPequenos} alvos <24px`);
      if (extras.scrollHorizontal) sinais.push(`scrollX +${extras.excesso}px`);
      if (extras.semLabel) sinais.push(`${extras.semLabel} sem label`);

      console.log(
        `  ${sinais.length ? "✗" : "✓"} ${estado.nome.padEnd(26)}` +
          (sinais.length ? sinais.join(" · ") : `sem problemas · ${extras.regioesVivas} região(ões) viva(s)`),
      );

      for (const v of r.violations) {
        console.log(`      [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length})`);
        for (const n of v.nodes.slice(0, 2)) console.log(`        ${n.target.join(" ").slice(0, 110)}`);
      }
      for (const a of extras.alvosPequenos.slice(0, 4)) {
        console.log(`      alvo ${a.w}×${a.h} (caixa ${a.caixa}) — ${a.tag} «${a.nome}»`);
      }

      await pagina.close();
    }
    await contexto.close();
  }
} finally {
  await navegador.close();
}

console.log(
  `\n═══ TOTAL: ${violacoesTotais} violações axe · ${alvosTotais} alvos abaixo de 24px · ${overflowTotal} vistas com scroll horizontal ═══\n`,
);
// Os alvos entram no portão agora que a medição é honesta (área efetiva, não
// caixa). Antes disto teria de ficar de fora — 141 falsos positivos nunca
// deixariam o portão fechar.
process.exit(violacoesTotais > 0 || overflowTotal > 0 || alvosTotais > 0 ? 1 : 0);
