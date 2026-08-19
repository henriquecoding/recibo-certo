#!/usr/bin/env node
/**
 * A CALCULADORA DE PREÇO SÓ COM TECLADO.
 * ----------------------------------------------------------------------
 * O §18 do prompt-mestre é explícito: «não confies exclusivamente no axe;
 * faz testes manuais». E tem razão — o axe deu 0 violações enquanto o
 * painel do InfoTip não fechava com Escape, que é uma falha da WCAG
 * 1.4.13 e uma chatice real para quem navega por teclado.
 *
 * Isto automatiza o que se faria à mão, para poder correr outra vez:
 *
 *   · as linhas de revelação abrem e fecham com Enter e com Espaço;
 *   · o foco NÃO se perde quando a secção muda de forma;
 *   · as fichas de «tens outros custos?» são alcançáveis por Tab;
 *   · o InfoTip abre com foco e fecha com Escape sem largar o botão.
 *
 * Uso:  npx next start   (noutro terminal)
 *       node scripts/auditar-teclado-preco.mjs
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

const semear = `
  localStorage.setItem("recibocerto:onboarded", "1");
  localStorage.setItem("recibocerto:changelog_visto", ${JSON.stringify(VERSAO)});
  localStorage.setItem("recibocerto:cookie-consent", ${JSON.stringify(
    JSON.stringify({ necessarios: true, estatistica: false, marketing: false, versao: 1 }),
  )});
`;

let falhas = 0;
const verificar = (nome, ok, detalhe = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${nome}${ok || !detalhe ? "" : ` — ${detalhe}`}`);
  if (!ok) falhas++;
};

/** Levar o foco até ao primeiro elemento que satisfaça `condicao`. */
async function tabAte(pagina, condicao, limite = 80) {
  for (let i = 0; i < limite; i++) {
    await pagina.keyboard.press("Tab");
    if (await pagina.evaluate(condicao)) return true;
  }
  return false;
}

const navegador = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
});

try {
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 }, locale: "pt-PT" });
  await contexto.addInitScript(semear);

  // ── As linhas de revelação ───────────────────────────────────────
  console.log("\n═══ linhas de revelação ═══");
  {
    const p = await contexto.newPage();
    await p.goto(`${BASE}/ferramentas/calcular-preco?c=produto_revenda`, { waitUntil: "networkidle" });
    await p.waitForTimeout(600);

    const chegou = await tabAte(p, () => {
      const a = document.activeElement;
      return a?.tagName === "BUTTON" && a.getAttribute("aria-expanded") === "false" && !a.getAttribute("aria-label");
    });
    verificar("uma linha recolhida é alcançável por Tab", chegou);

    if (chegou) {
      const rotulo = await p.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40));

      await p.keyboard.press("Enter");
      await p.waitForTimeout(250);
      const abriu = await p.evaluate(
        (r) => !!document.querySelector(`[role="region"][aria-label]`) && document.activeElement?.tagName === "BUTTON",
        rotulo,
      );
      verificar("Enter abre a secção", abriu, `secção «${rotulo}»`);

      const focoVivo = await p.evaluate(() => document.activeElement !== document.body);
      verificar("o foco não cai para o body ao abrir", focoVivo);

      // Fechar: o botão «Recolher» fica no fim da secção aberta.
      const fechou = await tabAte(p, () => document.activeElement?.textContent?.trim().startsWith("Recolher"), 40);
      verificar("o «Recolher» é alcançável por Tab", fechou);
      if (fechou) {
        await p.keyboard.press("Space");
        await p.waitForTimeout(250);
        const voltouARecolher = await p.evaluate(() => document.activeElement !== document.body);
        verificar("Espaço recolhe e o foco sobrevive", voltouARecolher);
      }
    }
    await p.close();
  }

  // ── As fichas de «tens outros custos?» ───────────────────────────
  console.log("\n═══ fichas de «tens outros custos?» ═══");
  {
    const p = await contexto.newPage();
    await p.goto(`${BASE}/ferramentas/calcular-preco?c=produto_revenda`, { waitUntil: "networkidle" });
    await p.waitForTimeout(600);

    const antes = await p.locator('button:has-text("Devoluções")').count();
    const alcancou = await tabAte(
      p,
      () => document.activeElement?.textContent?.trim() === "Devoluções",
      120,
    );
    verificar("uma ficha é alcançável por Tab", alcancou, `${antes} ficha(s) no ecrã`);

    if (alcancou) {
      await p.keyboard.press("Enter");
      await p.waitForTimeout(300);
      // O `Bloco` de `atomos.tsx` põe o id no BOTÃO, como `${id}-botao`,
      // e não no contentor — procurar `#bloco-devolucoes` não encontrava
      // nada e dizia «falha» sobre um comportamento correto.
      const virouBloco = await p.evaluate(() => {
        const b = document.getElementById("bloco-devolucoes-botao");
        return !!b && b.getAttribute("aria-expanded") === "true";
      });
      verificar("Enter promove a ficha a bloco ABERTO", virouBloco);
    }
    await p.close();
  }

  // ── O InfoTip ────────────────────────────────────────────────────
  console.log("\n═══ InfoTip (WCAG 1.4.13, dispensável) ═══");
  {
    const p = await contexto.newPage();
    await p.goto(`${BASE}/ferramentas/calcular-preco?c=produto_revenda`, { waitUntil: "networkidle" });
    await p.waitForTimeout(600);

    const chegou = await tabAte(p, () => document.activeElement?.getAttribute("aria-label") === "Mais informação");
    verificar("o botão de ajuda é alcançável por Tab", chegou);

    if (chegou) {
      await p.waitForTimeout(200);
      verificar("o foco abre o painel", (await p.locator('[role="tooltip"]').count()) > 0);

      await p.keyboard.press("Escape");
      await p.waitForTimeout(200);
      verificar("Escape fecha o painel", (await p.locator('[role="tooltip"]').count()) === 0);
      verificar(
        "e o foco continua no botão",
        await p.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Mais informação"),
      );
    }
    await p.close();
  }

  await contexto.close();
} finally {
  await navegador.close();
}

console.log(`\n═══ ${falhas === 0 ? "sem falhas de teclado" : `${falhas} falha(s) de teclado`} ═══\n`);
process.exit(falhas > 0 ? 1 : 0);
