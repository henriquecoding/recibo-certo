#!/usr/bin/env node
/**
 * CAPTURAR A CALCULADORA DE PREÇO — só a ferramenta, sem a página.
 * ----------------------------------------------------------------------
 * O §31 do prompt-mestre pede um ciclo de QA visual, e uma captura de
 * página inteira não serve para isso: a `/ferramentas/calcular-preco` tem
 * ~13 500 px a 360 px de largura, dos quais a ferramenta é menos de
 * metade. O resto é conteúdo editorial, e olhar para ele em cada
 * iteração esconde exatamente aquilo que se está a mudar.
 *
 * Por isso isto recorta o `#ferramenta` e imprime a altura — que é a
 * métrica de densidade em bruto, útil entre auditorias completas.
 *
 * Uso:  npx next start        (noutro terminal)
 *       RC_CENARIOS=produto_revenda,servico node scripts/capturar-preco.mjs
 *
 *   RC_DIR        diretório de saída (por omissão, o atual)
 *   RC_LARGURA    largura do viewport (360)
 *   RC_TEMA       "light" | "dark"
 *   RC_CENARIOS   lista separada por vírgulas
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

const DIR = process.env.RC_DIR ?? ".";
const LARGURA = Number(process.env.RC_LARGURA ?? 360);
const TEMA = process.env.RC_TEMA ?? "light";
const CENARIOS = (process.env.RC_CENARIOS ?? "produto_revenda").split(",");

// Semear o consentimento e o changelog: sem isto a captura sai com o
// banner de cookies ou o popup de Novidades por cima da ferramenta — que
// foi exatamente o que aconteceu da primeira vez.
const semear = `
  localStorage.setItem("recibocerto:onboarded", "1");
  localStorage.setItem("recibocerto:changelog_visto", ${JSON.stringify(VERSAO)});
  localStorage.setItem("recibocerto:cookie-consent", ${JSON.stringify(
    JSON.stringify({ necessarios: true, estatistica: false, marketing: false, versao: 1 }),
  )});
  ${TEMA === "dark" ? 'localStorage.setItem("recibocerto:tema","dark");' : ""}
`;

const navegador = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
});

try {
  const contexto = await navegador.newContext({
    viewport: { width: LARGURA, height: 900 },
    colorScheme: TEMA,
    locale: "pt-PT",
  });
  await contexto.addInitScript(semear);

  for (const cenario of CENARIOS) {
    const pagina = await contexto.newPage();
    await pagina.goto(`${BASE}/ferramentas/calcular-preco?c=${cenario}`, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(700);

    const alvo = pagina.locator("#ferramenta").first();
    if (await alvo.count()) {
      const ficheiro = join(DIR, `ferramenta-${cenario}-${LARGURA}-${TEMA}.png`);
      await alvo.screenshot({ path: ficheiro });
      const caixa = await alvo.boundingBox();
      const altura = Math.round(caixa?.height ?? 0);
      console.log(`${cenario.padEnd(18)} ${String(altura).padStart(6)} px  ·  ${(altura / 780).toFixed(1)} ecrãs`);
    }
    await pagina.close();
  }
  await contexto.close();
} finally {
  await navegador.close();
}
