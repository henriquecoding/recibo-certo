#!/usr/bin/env node

/*
 * ═══════════════════════════════════════════════════════════════════════
 *  AS CINCO ROTAS ESTÃO VIVAS? — a pergunta que nenhum gate fazia
 *  ---------------------------------------------------------------------
 *  `npm run homepage:hidratacao` (com `npm run build && npm start` a servir).
 *
 *  `/inicio/preco` foi a deploy MORTA e três gates deram verde:
 *
 *   · `smoke-production.mjs` lê o status HTTP. A rota é estática e servia
 *     200 com o HTML completo — o defeito só existia DEPOIS, na hidratação.
 *   · `verificar-visual-homepage.mjs` corre com `reducedMotion: "reduce"`,
 *     que é obrigatório para haver píxel estável a comparar. Só que o
 *     adaptador de movimento sai pela porta de `prefers-reduced-motion`
 *     ANTES de tocar no WAAPI: as 20 screenshots nunca correram uma única
 *     linha do caminho que estava partido.
 *   · `homepage-performance.test.ts` lê o TEXTO do adaptador. O defeito
 *     estava no VALOR que ele devolvia — `ease: "easeInOut"`, um nome do
 *     Motion, entregue cru a `Element.animate()`, que atira `TypeError`.
 *     Atirado num efeito de layout durante a hidratação, levava a rota
 *     inteira para o `global-error` («This page couldn't load»).
 *
 *  Este script faz a pergunta que faltava, e faz--na com movimento LIGADO:
 *  a rota monta, percorre a coreografia até ao último ato e continua viva?
 *  Sem screenshots, sem ImageMagick, sem baselines — por isso corre em
 *  qualquer máquina, em segundos, e falha alto.
 *
 *  BASE_URL   por omissão, http://127.0.0.1:3000
 * ═══════════════════════════════════════════════════════════════════════
 */

import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const EXEC = process.env.PLAYWRIGHT_CHROMIUM;

const ROTAS = {
  descobrir: "/",
  preco: "/inicio/preco",
  recibos: "/inicio/recibos",
  empresa: "/inicio/empresa",
  salario: "/inicio/salario",
};

const pacote = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const fonteConsentimento = await readFile(
  new URL("../src/lib/cookie-consent.ts", import.meta.url),
  "utf8",
);
const correspondencia = fonteConsentimento.match(
  /export const CONSENT_VERSION = (\d+);/,
);
if (!correspondencia) throw new Error("CONSENT_VERSION não encontrado.");
const consentimento = Number(correspondencia[1]);

/**
 * Erros de infraestrutura local que não dizem nada sobre a rota.
 *
 * Sem credenciais de Supabase, um componente de diretório grita — e teria
 * gritado igual antes desta alteração. A lista é curta e explícita de
 * propósito: tudo o que não estiver aqui faz falhar.
 */
const RUIDO = [/Supabase não configurado/i];
const ruido = (mensagem) => RUIDO.some((padrao) => padrao.test(mensagem));

async function verificar(navegador, foco, rota) {
  const contexto = await navegador.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    // ── O ponto do script. Não mudar para "reduce". ──────────────────
    reducedMotion: "no-preference",
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
  });
  await contexto.addInitScript(
    ({ appVersion, consentVersion }) => {
      try {
        localStorage.setItem("recibocerto:changelog_visto", appVersion);
        localStorage.setItem(
          "recibocerto:cookie-consent",
          JSON.stringify({
            necessarios: true,
            estatistica: false,
            marketing: false,
            versao: consentVersion,
            data: "2026-08-28T12:00:00.000Z",
          }),
        );
      } catch {}
    },
    { appVersion: pacote.version, consentVersion: consentimento },
  );

  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on("pageerror", (erro) => erros.push(erro.message));
  pagina.on("console", (mensagem) => {
    if (mensagem.type() === "error") erros.push(mensagem.text());
  });

  try {
    const resposta = await pagina.goto(`${BASE}${rota}`, {
      waitUntil: "load",
      timeout: 45_000,
    });
    if (!resposta || resposta.status() !== 200) {
      throw new Error(`${rota} devolveu HTTP ${resposta?.status() ?? "sem resposta"}.`);
    }
    await pagina
      .locator(`main[data-homepage-foco="${foco}"]`)
      .waitFor({ state: "visible", timeout: 15_000 });

    // A cena arranca no primeiro ato e o defeito vivia no ÚLTIMO — a pega a
    // respirar quando o resultado assenta. A régua leva lá em três cliques
    // em vez de treze segundos de espera, e de caminho prova que o salto
    // manual entre atos também não atira.
    const passos = pagina.locator('[data-palco] button[aria-label^="Passo "]');
    const quantos = await passos.count();
    let interrompido = null;
    try {
      for (const indice of quantos > 1 ? [quantos - 1, 0, quantos - 1] : []) {
        await passos.nth(indice).click({ timeout: 10_000 });
        await pagina.waitForTimeout(700);
      }
      await pagina.waitForTimeout(2_500);
    } catch (erro) {
      // Quando a rota morre, a árvore inteira é desmontada e o clique falha
      // com «element was detached». Isso é sintoma, não diagnóstico: guarda-se
      // e a causa real sai do estado do documento, logo a seguir.
      interrompido = erro.message.split("\n")[0];
    }

    const estado = await pagina.evaluate((seletor) => {
      const principal = document.querySelector(seletor);
      return {
        global: document.documentElement.id === "__next_error__",
        main: Boolean(principal),
        h1: principal?.querySelector("h1")?.textContent?.trim() ?? "",
      };
    }, `main[data-homepage-foco="${foco}"]`);

    const reais = [...new Set(erros)].filter((mensagem) => !ruido(mensagem));
    const morta = estado.global || !estado.main || estado.h1.length === 0;

    if (morta) {
      throw new Error(
        `${rota} não sobreviveu à hidratação com movimento ligado` +
          (estado.global ? " — caiu no global-error" : "") +
          (reais.length > 0 ? `. Erro: ${reais.join(" | ")}` : ".") +
          (interrompido ? ` (a interação parou em: ${interrompido})` : ""),
      );
    }
    if (reais.length > 0) {
      throw new Error(`${rota} produziu erro no browser: ${reais.join(" | ")}`);
    }
    if (interrompido) {
      throw new Error(`${rota} não deixou percorrer os atos: ${interrompido}`);
    }
    return { rota, atos: quantos, h1: estado.h1 };
  } finally {
    await contexto.close();
  }
}

const navegador = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
const falhas = [];
try {
  for (const [foco, rota] of Object.entries(ROTAS)) {
    try {
      const ok = await verificar(navegador, foco, rota);
      console.log(
        `[hidratação] OK ${ok.rota} — ${ok.atos} atos · «${ok.h1.slice(0, 52)}»`,
      );
    } catch (erro) {
      falhas.push(erro.message);
      console.error(`[hidratação] FALHA ${rota}: ${erro.message}`);
    }
  }
} finally {
  await navegador.close();
}

if (falhas.length > 0) {
  console.error(
    `\n[hidratação] ${falhas.length}/${Object.keys(ROTAS).length} rotas de foco não sobreviveram com movimento ligado.`,
  );
  process.exit(1);
}
console.log(
  `[hidratação] ${Object.keys(ROTAS).length} rotas de foco vivas com movimento ligado.`,
);
