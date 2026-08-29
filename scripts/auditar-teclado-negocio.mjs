#!/usr/bin/env node
/**
 * O ESTÚDIO DE NEGÓCIO SÓ COM TECLADO.
 * ----------------------------------------------------------------------
 * O axe deu zero violações no estúdio enquanto três regiões com scroll
 * horizontal eram inalcançáveis sem rato — não deu, aliás: essa apanhou-a
 * ele. O que ele NUNCA apanha é o foco a cair no chão quando um painel
 * muda de forma, e é o defeito mais irritante que uma interface
 * progressiva pode ter: carregar em «recolher» e ser atirado para o topo
 * do documento a meio do trabalho.
 *
 * Este estúdio muda de forma mais vezes do que a calculadora de preço:
 * troca o ecrã inteiro para editar uma oferta e volta, abre painéis
 * dentro de cartões, e faz nascer secções novas quando o resultado passa
 * a existir. Cada uma dessas transições é uma oportunidade de perder o
 * foco.
 *
 * Uso:  npx next start   (noutro terminal)
 *       node scripts/auditar-teclado-negocio.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";
const ROTA = "/dashboard/negocio";
const VERSAO = readFileSync(join(RAIZ, "src/lib/version.ts"), "utf8").match(
  /APP_VERSION\s*=\s*"([^"]+)"/,
)?.[1];

const semear = `
  localStorage.setItem("recibocerto:onboarded", "1");
  localStorage.setItem("recibocerto:changelog_visto", ${JSON.stringify(VERSAO)});
  localStorage.setItem("recibocerto:cookie-consent", ${JSON.stringify(
    JSON.stringify({ necessarios: true, estatistica: false, marketing: false, versao: 2 }),
  )});
`;

let falhas = 0;
const verificar = (nome, ok, detalhe = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${nome}${ok || !detalhe ? "" : ` — ${detalhe}`}`);
  if (!ok) falhas++;
};

/** Levar o foco até ao primeiro elemento que satisfaça `condicao`. */
async function tabAte(pagina, condicao, limite = 120) {
  for (let i = 0; i < limite; i++) {
    await pagina.keyboard.press("Tab");
    if (await pagina.evaluate(condicao)) return true;
  }
  return false;
}

const focoVivo = (p) =>
  p.evaluate(() => document.activeElement !== document.body && document.activeElement !== null);

const navegador = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
});

/**
 * Um contexto LIMPO. Nunca reutilizar entre cenários: o estúdio guarda o
 * rascunho em `localStorage` por desenho, e um contexto partilhado faz o
 * cenário seguinte abrir já a meio do percurso — com «Tenho uma ideia» a
 * não existir e o teste a falhar por uma razão que não é a que mede.
 */
async function contextoLimpo(navegador) {
  const c = await navegador.newContext({ viewport: { width: 1280, height: 900 }, locale: "pt-PT" });
  await c.addInitScript(semear);
  return c;
}

/** Constrói um negócio com uma oferta, só com o rato — é o ponto de partida. */
async function comUmaOferta(contexto) {
  const p = await contexto.newPage();
  await p.goto(`${BASE}${ROTA}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await p.getByRole("button", { name: /Tenho uma ideia/ }).click();
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: /Um serviço/ }).first().click();
  await p.waitForTimeout(600);
  await p.locator("#horas-unidade").fill("6");
  await p.locator("#horas-unidade").blur();
  await p.waitForTimeout(300);
  await p.getByRole("button", { name: /Adicionar esta oferta ao negócio/ }).first().click();
  await p.waitForTimeout(800);
  return p;
}

try {
  // ── As três portas de entrada ────────────────────────────────────
  console.log("\n═══ as três portas ═══");
  {
    const contexto = await contextoLimpo(navegador);
    const p = await contexto.newPage();
    await p.goto(`${BASE}${ROTA}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(500);

    const chegou = await tabAte(p, () =>
      document.activeElement?.textContent?.includes("Tenho uma ideia"),
    );
    verificar("a primeira porta é alcançável por Tab", chegou);

    if (chegou) {
      await p.keyboard.press("Enter");
      await p.waitForTimeout(700);
      const avancou = await p.evaluate(() =>
        document.querySelector("#ferramenta")?.innerText.includes("O que queres definir?"),
      );
      verificar("Enter abre a calculadora de preço", avancou);
      verificar("o foco não cai para o body ao trocar de ecrã", await focoVivo(p));
    }
    await p.close();
    await contexto.close();
  }

  // ── Voltar da calculadora para o negócio ─────────────────────────
  console.log("\n═══ ida e volta à calculadora ═══");
  {
    const contexto = await contextoLimpo(navegador);
    const p = await comUmaOferta(contexto);
    const noNegocio = await p.evaluate(() =>
      document.querySelector("#ferramenta")?.innerText.includes("O teu negócio"),
    );
    verificar("adicionar a oferta devolve ao negócio", noNegocio);

    const chegouAoPreco = await tabAte(p, () =>
      document.activeElement?.textContent?.trim().startsWith("Preço"),
    );
    verificar("«Preço» (editar oferta) é alcançável por Tab", chegouAoPreco);

    if (chegouAoPreco) {
      await p.keyboard.press("Enter");
      await p.waitForTimeout(800);
      const naCalculadora = await p.evaluate(() =>
        document.querySelector("#ferramenta")?.innerText.includes("Estás a calcular"),
      );
      verificar("Enter reabre a oferta na calculadora", naCalculadora);
      verificar("o foco sobrevive à troca de ecrã", await focoVivo(p));

      const chegouAoVoltar = await tabAte(p, () =>
        document.activeElement?.textContent?.includes("Voltar ao negócio"),
      );
      verificar("«Voltar ao negócio» é alcançável por Tab", chegouAoVoltar);
      if (chegouAoVoltar) {
        await p.keyboard.press("Enter");
        await p.waitForTimeout(700);
        const voltou = await p.evaluate(() =>
          document.querySelector("#ferramenta")?.innerText.includes("O teu negócio"),
        );
        verificar("Enter volta ao negócio", voltou);
        verificar("o foco sobrevive ao regresso", await focoVivo(p));
      }
    }
    await p.close();
    await contexto.close();
  }

  // ── O painel de volume e capacidade ──────────────────────────────
  console.log("\n═══ volume e capacidade ═══");
  {
    const contexto = await contextoLimpo(navegador);
    const p = await comUmaOferta(contexto);

    const chegou = await tabAte(p, () =>
      document.activeElement?.textContent?.includes("Ajustar volume e capacidade"),
    );
    verificar("o painel é alcançável por Tab", chegou);

    if (chegou) {
      await p.keyboard.press("Enter");
      await p.waitForTimeout(500);
      const abriu = await p.evaluate(() => {
        const b = [...document.querySelectorAll("button")].find((x) =>
          x.textContent?.includes("Fechar volume e capacidade"),
        );
        return !!b && b.getAttribute("aria-expanded") === "true";
      });
      verificar("Enter abre o painel e o `aria-expanded` acompanha", abriu);
      verificar("o foco não cai para o body ao abrir", await focoVivo(p));

      // Espaço fecha, e o foco continua no mesmo botão — que é o que
      // substituiu aquilo em que a pessoa carregou.
      await p.keyboard.press("Space");
      await p.waitForTimeout(400);
      const fechou = await p.evaluate(
        () => document.activeElement?.getAttribute("aria-expanded") === "false",
      );
      verificar("Espaço fecha e o foco fica no mesmo botão", fechou);
    }
    await p.close();
    await contexto.close();
  }

  // ── As regiões com scroll ────────────────────────────────────────
  console.log("\n═══ regiões com scroll horizontal ═══");
  {
    const contexto = await contextoLimpo(navegador);
    const p = await comUmaOferta(contexto);
    // Abrir a sensibilidade, que traz a tabela de cenários.
    await p.getByRole("button", { name: /Testar o cenário/ }).first().click();
    await p.waitForTimeout(600);

    const regioes = await p.evaluate(
      () => document.querySelectorAll('#ferramenta [role="region"][tabindex="0"]').length,
    );
    verificar("as regiões com scroll são focáveis", regioes > 0, `${regioes} região(ões)`);

    const todasComNome = await p.evaluate(() =>
      [...document.querySelectorAll('#ferramenta [role="region"][tabindex="0"]')].every(
        (el) => (el.getAttribute("aria-label") || "").trim().length > 0,
      ),
    );
    verificar("todas têm nome acessível", todasComNome);

    const chegou = await tabAte(
      p,
      () => document.activeElement?.getAttribute("role") === "region",
      200,
    );
    verificar("uma delas é mesmo alcançável por Tab", chegou);
    await p.close();
    await contexto.close();
  }

  // ── Os `<details>` de prova ──────────────────────────────────────
  console.log("\n═══ tabelas de prova ═══");
  {
    const contexto = await contextoLimpo(navegador);
    const p = await comUmaOferta(contexto);
    await p.getByRole("button", { name: /Testar o cenário/ }).first().click();
    await p.waitForTimeout(600);

    const chegou = await tabAte(
      p,
      () => document.activeElement?.tagName === "SUMMARY",
      200,
    );
    verificar("o `<summary>` é alcançável por Tab", chegou);
    if (chegou) {
      await p.keyboard.press("Enter");
      await p.waitForTimeout(400);
      const abriu = await p.evaluate(() => document.activeElement?.closest("details")?.open === true);
      verificar("Enter abre a tabela", abriu);
      verificar("o foco sobrevive", await focoVivo(p));
    }
    await p.close();
    await contexto.close();
  }

  // ── Nenhum campo sem etiqueta, e nenhum foco invisível ──────────
  console.log("\n═══ campos e foco visível ═══");
  {
    const contexto = await contextoLimpo(navegador);
    const p = await comUmaOferta(contexto);
    const semEtiqueta = await p.evaluate(() =>
      [...document.querySelectorAll("#ferramenta input, #ferramenta select, #ferramenta textarea")].filter(
        (el) => {
          if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
          return !(el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`));
        },
      ).length,
    );
    verificar("nenhum campo sem etiqueta", semEtiqueta === 0, `${semEtiqueta} sem etiqueta`);

    // Um elemento focável sem indicação visível de foco é uma armadilha
    // para quem navega por teclado — e o Tailwind torna-o fácil de
    // esquecer, porque `focus:outline-none` é comum em componentes.
    const semAnel = await p.evaluate(() => {
      const focaveis = [...document.querySelectorAll("#ferramenta button, #ferramenta a[href]")];
      return focaveis.filter((el) => {
        const c = el.className;
        if (typeof c !== "string") return false;
        return c.includes("focus:outline-none") && !c.includes("focus-visible:ring");
      }).length;
    });
    verificar("todo o botão que tira o contorno põe um anel", semAnel === 0, `${semAnel} sem anel`);
    await p.close();
    await contexto.close();
  }

} finally {
  await navegador.close();
}

console.log(`\n═══ ${falhas === 0 ? "sem falhas" : `${falhas} falha(s)`} ═══\n`);
process.exit(falhas > 0 ? 1 : 0);
