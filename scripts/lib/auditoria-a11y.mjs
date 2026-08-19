#!/usr/bin/env node
/**
 * O MOTOR DAS AUDITORIAS DE ACESSIBILIDADE.
 * ----------------------------------------------------------------------
 * Extraído de `auditar-a11y-preco.mjs`, sem lhe mudar uma regra: a
 * medição de alvos por área efetiva, a exceção «inline» da 2.5.8, o
 * detetor de texto que transborda a própria caixa e o `clientWidth > 4`
 * que poupa o padrão `sr-only` são todos herdados tal como estavam, com
 * os comentários que explicam porque é que cada um existe.
 *
 * Existe porque o estúdio de negócio precisava do MESMO instrumento, e
 * §45 do relatório é explícito: criar um script equivalente só se o atual
 * não puder ser parametrizado. Podia — e assim uma correção à medição
 * passa a valer para as duas ferramentas em vez de divergir na terceira.
 *
 * Quem o usa passa: os estados a auditar, o seletor do âmbito, e (se
 * quiser) as vistas. O resto é igual para toda a gente.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";

const VERSAO = readFileSync(join(RAIZ, "src/lib/version.ts"), "utf8").match(
  /APP_VERSION\s*=\s*"([^"]+)"/,
)?.[1];

/** Estado inicial do browser: sem onboarding, sem popup, sem banner. */
export const SEMEAR = `
  localStorage.setItem("recibocerto:onboarded", "1");
  localStorage.setItem("recibocerto:changelog_visto", ${JSON.stringify(VERSAO)});
  localStorage.setItem("recibocerto:cookie-consent", ${JSON.stringify(
    JSON.stringify({ necessarios: true, estatistica: false, marketing: false, versao: 1 }),
  )});
`;

/** As quatro vistas por omissão. Claro e escuro, 1280, 360 e 320 px. */
export const VISTAS = [
  { nome: "desktop claro", w: 1280, h: 900, tema: "light" },
  { nome: "mobile 360 claro", w: 360, h: 780, tema: "light" },
  { nome: "desktop escuro", w: 1280, h: 900, tema: "dark" },
  { nome: "mobile 320 claro", w: 320, h: 780, tema: "light" },
];

/**
 * O que o axe não vê e o WCAG 2.2 exige.
 *
 * É uma FUNÇÃO do seletor porque o âmbito tem de ser o mesmo do axe:
 * medir alvos e overflow na página inteira contaria o cabeçalho, a
 * navegação e o rodapé — que são partilhados e já auditados noutro sítio.
 */
const extrasPara = (seletor) => `(() => {
  const SELETOR = ${JSON.stringify(seletor)};
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none";
  };
  const raiz = document.querySelector(SELETOR) || document.body;

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

  // Texto que não cabe na sua própria caixa.
  //
  // O scrollWidth do documento não apanha isto: um valor monetário que
  // transborda a célula onde vive deixa a PÁGINA com a largura certa e o
  // número cortado ou por cima do vizinho. É o modo de falha típico de
  // 320 px com números longos — «1 234,56 €» numa coluna dimensionada
  // para «12,30 €» — e só se vê a olho, ou assim.
  // ⚠️ O clientWidth > 4 exclui o padrão sr-only, que recorta o texto
  // para uma caixa de 1x1 DE PROPÓSITO — é assim que se diz uma coisa a
  // um leitor de ecrã sem a desenhar. Sem esta condição, a região viva do
  // AnuncioResultado aparecia como «transborda +536px» nas quatro vistas,
  // que foi o primeiro resultado deste teste e não era defeito nenhum:
  // era o teste a não conhecer o padrão.
  const transbordam = [...raiz.querySelectorAll("*")]
    .filter(visivel)
    .filter((el) => el.clientWidth > 4)
    .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
    .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "auto")
    .map((el) => ({
      texto: (el.textContent || "").trim().slice(0, 32),
      excesso: el.scrollWidth - el.clientWidth,
    }));

  const doc = document.documentElement;
  return {
    alvosPequenos: pequenos.slice(0, 10),
    totalAlvosPequenos: pequenos.length,
    transbordam: transbordam.slice(0, 5),
    totalTransbordam: transbordam.length,
    scrollHorizontal: doc.scrollWidth > doc.clientWidth + 1,
    excesso: Math.max(0, doc.scrollWidth - doc.clientWidth),
    regioesVivas: raiz.querySelectorAll("[aria-live],[role=status],[role=alert]").length,
    semLabel: [...raiz.querySelectorAll("input,select,textarea")].filter(visivel).filter((el) => {
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
      return !(el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]'));
    }).length,
  };
})()`;

/**
 * Corre a auditoria e devolve os totais. Não sai do processo — quem
 * chama é que decide o que é uma falha, porque o portão pode ser
 * diferente para uma ferramenta nova e para uma que já está a zero.
 */
export async function auditar({ estados, seletor = "#ferramenta", vistas = VISTAS, titulo = "" }) {
  if (titulo) console.log(`\n${titulo}`);

  const navegador = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
  });

  let violacoesTotais = 0;
  let alvosTotais = 0;
  let overflowTotal = 0;

  try {
    for (const vista of vistas) {
      console.log(`\n═══ ${vista.nome} ═══`);

      for (const estado of estados) {
        // ── UM CONTEXTO POR ESTADO, e não por vista ───────────────
        //  O `localStorage` vive no contexto, não na página. Com um
        //  contexto partilhado, o rascunho que um estado grava é lido
        //  pelo estado seguinte — que abre já a meio do percurso, com os
        //  botões que a sua preparação procura a não existirem. A
        //  preparação falha em silêncio e audita-se outra coisa.
        //
        //  Numa ferramenta sem persistência isto nunca se nota; numa que
        //  retoma o trabalho por desenho, invalida a auditoria inteira.
        //  Custa alguns segundos por estado e é o que a torna honesta.
        const contexto = await navegador.newContext({
          viewport: { width: vista.w, height: vista.h },
          colorScheme: vista.tema,
          locale: "pt-PT",
        });
        await contexto.addInitScript(SEMEAR);
        if (vista.tema === "dark") {
          await contexto.addInitScript(`localStorage.setItem("recibocerto:tema","dark");`);
        }

        const pagina = await contexto.newPage();
        await pagina.goto(`${BASE}${estado.url}`, { waitUntil: "networkidle" });
        await pagina.waitForTimeout(400);
        if (estado.preparar) await estado.preparar(pagina);
        await pagina.waitForTimeout(300);

        // Sem esta guarda, uma página que não renderizou — servidor caído a
        // meio, build trocado, rota mudada — sai como um stack trace do
        // axe («No elements found for include in page Context») que não diz
        // o que correu mal nem em que estado.
        if ((await pagina.locator(seletor).count()) === 0) {
          console.log(`  ! ${estado.nome.padEnd(26)}${seletor} não existe — o servidor está de pé?`);
          violacoesTotais += 1;
          await pagina.close();
          await contexto.close();
          continue;
        }

        // ── A GUARDA QUE IMPEDE UM VERDE FALSO ────────────────────
        //  As preparações usam `.catch(() => {})` porque um clique que
        //  falha não deve derrubar a auditoria inteira. O efeito
        //  secundário é perigoso: se o clique falhar sempre — um seletor
        //  que passou a apanhar dois elementos, um botão renomeado — o
        //  estado nunca se materializa e o axe audita o ecrã VAZIO, seis
        //  vezes, e devolve zero violações.
        //
        //  Foi exatamente o que aconteceu na primeira execução desta
        //  auditoria: 24 combinações a verde sobre um estado que nunca
        //  existiu. Por isso cada estado pode declarar uma prova de vida.
        if (estado.verificar) {
          const texto = (await pagina.locator(seletor).innerText()).toUpperCase();
          const emFalta = [estado.verificar].flat().filter((s) => !texto.includes(s.toUpperCase()));
          if (emFalta.length) {
            console.log(
              `  ! ${estado.nome.padEnd(26)}não chegou ao estado esperado — falta «${emFalta[0]}»`,
            );
            violacoesTotais += 1;
            await pagina.close();
            await contexto.close();
            continue;
          }
        }

        const r = await new AxeBuilder({ page: pagina })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .include(seletor)
          .analyze();

        const extras = await pagina.evaluate(extrasPara(seletor));
        violacoesTotais += r.violations.length;
        alvosTotais += extras.totalAlvosPequenos;
        if (extras.scrollHorizontal) overflowTotal++;

        const sinais = [];
        if (r.violations.length) sinais.push(`${r.violations.length} axe`);
        if (extras.totalAlvosPequenos) sinais.push(`${extras.totalAlvosPequenos} alvos <24px`);
        if (extras.scrollHorizontal) sinais.push(`scrollX +${extras.excesso}px`);
        if (extras.totalTransbordam) sinais.push(`${extras.totalTransbordam} texto(s) a transbordar`);
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
        for (const t of extras.transbordam.slice(0, 4)) {
          console.log(`      transborda +${t.excesso}px — «${t.texto}»`);
        }

        await pagina.close();
        await contexto.close();
      }
    }
  } finally {
    await navegador.close();
  }


  return { violacoesTotais, alvosTotais, overflowTotal };
}
