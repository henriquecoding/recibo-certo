#!/usr/bin/env node
/**
 * VERIFICAÇÃO DO DASHBOARD — fim a fim, num browser a sério.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO NÃO CABE NO VITEST                                       │
 * │                                                                     │
 * │ O `dashboard-invariantes.test.ts` cobre a verdade dos CÁLCULOS: que  │
 * │ o CSV e o painel dão o mesmo número, que 15 000,01 € cai no estado   │
 * │ certo, que um recibo de 2025 não entra no acumulado de 2026.         │
 * │                                                                     │
 * │ O que ele não consegue ver é o que só existe num motor de            │
 * │ renderização: se o número que sai do contrato é MESMO o que aparece  │
 * │ no ecrã, se o Tab sai do menu do telemóvel, se a página tem scroll   │
 * │ horizontal a 360px, e — o teste de privacidade que a secção 7 do     │
 * │ relatório pede — se um utilizador que RECUSA o consentimento gera    │
 * │ mesmo zero pedidos a /api/analytics.                                 │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   npm run build && npm run start        (noutro terminal)
 *   npm run dashboard:e2e
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
 * Dois recibos de anos DIFERENTES, de propósito: o acumulado do painel só
 * pode mostrar o do ano corrente (RC-P0-01).
 */
const ANO = new Date().getFullYear();
const semear = (consentimento) => `
  localStorage.setItem("recibocerto:onboarded", "1");
  localStorage.setItem("recibocerto:changelog_visto", ${JSON.stringify(VERSAO)});
  ${consentimento === null ? "" : `localStorage.setItem("recibocerto:cookie-consent", ${JSON.stringify(
    JSON.stringify({ necessarios: true, estatistica: consentimento, marketing: false, data: new Date().toISOString(), versao: 1 }),
  )});`}
  localStorage.setItem("recibocerto:recibos:v1", JSON.stringify([
    { id: "e2e-atual", data: "${ANO}-03-10", cliente: "Cliente do ano", valor: 1000, tipo: "art151",
      regiao: "continente", regimeIVA: "isento", baseSS: "servicos", dispensaRetencao: true },
    { id: "e2e-antigo", data: "${ANO - 1}-12-31", cliente: "Cliente do ano passado", valor: 9999, tipo: "art151",
      regiao: "continente", regimeIVA: "isento", baseSS: "servicos", dispensaRetencao: true }
  ]));
  localStorage.setItem("recibocerto:preferencias-fiscais:v1", JSON.stringify({
    v: 2, regimeIVA: "isento", dataInicioAtividade: "2020-01-01",
    pagamentosPorConta: "nao", atividadeAberta: true
  }));
`;

const navegador = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
});

try {
  // ═══ 1. Escopo anual e rótulos honestos ═══════════════════════════════
  console.log("\n▸ Escopo anual e contrato de cálculo");
  {
    const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 } });
    const p = await ctx.newPage();
    const errosPagina = [];
    p.on("pageerror", (e) => errosPagina.push(String(e)));
    await p.addInitScript(semear(false));
    await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);

    const acumulado = await p.locator("h2", { hasText: "Acumulado de" }).locator("xpath=../..").innerText();
    verificar("o acumulado diz de que ano é", acumulado.includes(`Acumulado de ${ANO}`));
    verificar(
      "o recibo do ano anterior fica fora do acumulado",
      !acumulado.includes("9 999") && !acumulado.includes("9999"),
      acumulado.replace(/\n/g, " | "),
    );
    verificar("mostra «Retenção IRS», não «IRS estimado»", acumulado.includes("Retenção IRS"));

    const corpo = await p.locator("body").innerText();
    verificar("mostra «IVA cobrado» e nunca «IVA a entregar»", corpo.includes("IVA cobrado") && !corpo.includes("IVA a entregar"));

    verificar(
      "sem scroll horizontal a 360px",
      await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    );
    verificar("nenhum erro de página", errosPagina.length === 0, errosPagina[0]);
    await ctx.close();
  }

  // ═══ 2. Separadores de lente com teclado (RC-P2-03) ═══════════════════
  console.log("\n▸ Acessibilidade dos separadores e do menu");
  {
    const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 } });
    const p = await ctx.newPage();
    await p.addInitScript(semear(false));
    await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);

    verificar("o tablist tem painel associado", (await p.locator('[role="tabpanel"]').count()) > 0);
    verificar(
      "só um separador está na ordem de tabulação",
      (await p.locator('[role="tab"][tabindex="0"]').count()) === 1,
    );

    const antes = await p.locator('[role="tab"][aria-selected="true"]').innerText();
    await p.locator('[role="tab"]').first().focus();
    await p.keyboard.press("ArrowRight");
    await p.waitForTimeout(500);
    const depois = await p.locator('[role="tab"][aria-selected="true"]').innerText();
    verificar("as setas mudam de separador", antes !== depois, `${antes} → ${depois}`);

    // Menu do telemóvel: foco preso e devolvido (RC-P2-04).
    await p.getByRole("button", { name: /menu/i }).first().click();
    await p.waitForTimeout(600);
    const dialogo = p.locator('[role="dialog"][aria-modal="true"]');
    verificar("o menu abre como diálogo modal", (await dialogo.count()) > 0);
    const focoDentro = await p.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-modal="true"]');
      return !!d && d.contains(document.activeElement);
    });
    verificar("o foco inicial cai dentro do menu", focoDentro);

    // Vinte Tabs não podem sair do painel.
    for (let i = 0; i < 20; i++) await p.keyboard.press("Tab");
    verificar(
      "o Tab não escapa do menu",
      await p.evaluate(() => {
        const d = document.querySelector('[role="dialog"][aria-modal="true"]');
        return !!d && d.contains(document.activeElement);
      }),
    );

    await p.keyboard.press("Escape");
    await p.waitForTimeout(500);
    verificar("Escape fecha o menu", (await p.locator('[role="dialog"][aria-modal="true"]').count()) === 0);
    await ctx.close();
  }

  // ═══ 3. Prazos: aplicabilidade e datas oficiais (RC-P0-06, RC-P1-05) ══
  console.log("\n▸ Prazos aplicáveis e datas oficiais");
  {
    const ctx = await navegador.newContext();
    const p = await ctx.newPage();
    await p.addInitScript(semear(false));
    await p.goto(`${BASE}/dashboard/prazos`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);
    await p.getByRole("button", { name: "Lista" }).click();
    await p.waitForTimeout(800);

    const t = await p.locator("body").innerText();
    verificar("distingue declaração de pagamento", /Declaração/i.test(t) && /Pagamento/i.test(t));
    verificar("mostra a aplicabilidade de cada obrigação", /Aplica-se a ti|Não se aplica/.test(t));
    verificar("quem está isento de IVA não vê prazos de IVA", !/Declaração periódica de IVA/.test(t));
    verificar("há estado de cumprimento", /Já tratei/.test(t));
    verificar("cada obrigação cita a fonte oficial", /Agenda Fiscal|CIVA|CIRS|Segurança Social/.test(t));

    // As datas de 2026 têm de bater com a Agenda Fiscal oficial.
    //
    // A data-limite é a que fica imediatamente antes de «Já tratei». O item
    // contém ANTES dela a nota «Prazo legal a 20/09, transferido para o dia
    // útil seguinte» — apanhar a primeira data do texto devolvia a data legal
    // por ajustar, não a data-limite real.
    if (ANO === 2026) {
      await p.getByRole("button", { name: "Calendário geral" }).click();
      await p.waitForTimeout(1000);
      const linhas = await p.locator("li").allInnerTexts();
      const dataDe = (titulo) =>
        linhas.find((x) => x.includes(titulo))?.match(/(\d{2}\/\d{2})\s*\n\s*Já tratei/)?.[1] ?? "";

      const pc2 = dataDe("2.º pagamento por conta de IRS");
      const pc3 = dataDe("3.º pagamento por conta de IRS");
      const ivaPag = dataDe("Pagamento de IVA (trimestral)");
      verificar("2.º pagamento por conta a 21/09", pc2 === "21/09", pc2);
      verificar("3.º pagamento por conta a 21/12", pc3 === "21/12", pc3);
      verificar("pagamento de IVA trimestral no dia 25", /^25\//.test(ivaPag), ivaPag);
      // E a data legal por ajustar aparece, para a pessoa perceber o desvio.
      verificar(
        "explica a transferência para o dia útil seguinte",
        (linhas.find((x) => x.includes("2.º pagamento por conta de IRS")) ?? "").includes("20/09"),
      );
    }
    await ctx.close();
  }

  // ═══ 4. Privacidade: consentimento recusado (secção 7 do relatório) ═══
  console.log("\n▸ Contrato de privacidade em rede");
  {
    const ctx = await navegador.newContext();
    const p = await ctx.newPage();
    const pedidos = [];
    p.on("request", (r) => {
      if (r.url().includes("/api/analytics")) pedidos.push(r.url());
    });
    // `false` = categoria de estatística RECUSADA explicitamente.
    await p.addInitScript(semear(false));
    for (const rota of ["/dashboard", "/dashboard/prazos", "/dashboard/recibos", "/dashboard/receitas"]) {
      await p.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
      await p.waitForTimeout(900);
    }
    verificar("consentimento recusado ⇒ zero pedidos a /api/analytics", pedidos.length === 0, pedidos[0]);

    // ┌──────────────────────────────────────────────────────────────────┐
    // │ O PADRÃO `anon` DEIXOU DE SERVIR QUANDO O COFRE APARECEU.         │
    // │                                                                  │
    // │ As chaves do cofre terminam em `::anonimo` — o NOME DO COFRE de   │
    // │ quem não tem sessão, não um identificador de ninguém. Um filtro   │
    // │ por `anon` passou a apanhá-las e a acusar uma fuga de privacidade │
    // │ onde só há dados locais da própria pessoa, no sítio certo.        │
    // │                                                                  │
    // │ Passa a verificar o que a promessa diz mesmo: sem consentimento   │
    // │ de estatística, nenhuma das chaves de IDENTIDADE de medição é     │
    // │ escrita. Os nomes vêm de `analytics/identidade.ts`, e o sufixo do │
    // │ cofre é excluído explicitamente para o padrão não voltar a        │
    // │ confundir uma coisa com a outra.                                  │
    // └──────────────────────────────────────────────────────────────────┘
    const identidade = await p.evaluate(() =>
      Object.keys(localStorage)
        .filter((k) => !k.includes("::"))
        .filter((k) => /anonymous_id|atribuicao|ator|actor|analytics/i.test(k)),
    );
    verificar("consentimento recusado ⇒ nenhum identificador anónimo guardado", identidade.length === 0, identidade.join(", "));

    // E o cofre continua a ser um cofre: nada do que lá está pode ser um
    // identificador de medição disfarçado de dados locais.
    const dentroDoCofre = await p.evaluate(() =>
      Object.keys(localStorage)
        .filter((k) => k.includes("::"))
        .filter((k) => /anonymous_id|atribuicao|analytics/i.test(k.split("::")[0])),
    );
    verificar(
      "e nenhum identificador de medição se esconde dentro do cofre",
      dentroDoCofre.length === 0,
      dentroDoCofre.join(", "),
    );

    // Uma simulação anónima continua a ser calculada NO DISPOSITIVO.
    const pedidosSimulacao = [];
    p.on("request", (r) => {
      const u = r.url();
      if (r.method() === "POST" && !u.includes("/_next/") && !u.includes("/api/documentos")) pedidosSimulacao.push(u);
    });
    await p.goto(`${BASE}/dashboard/recibos-verdes`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    verificar("a simulação anónima não sai do dispositivo", pedidosSimulacao.length === 0, pedidosSimulacao[0]);
    await ctx.close();
  }

  // ═══ 5. Ciclo de vida de um cenário (secção 9.4) ══════════════════════
  console.log("\n▸ Cenários: renderização e confirmação de eliminação");
  {
    const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 } });
    const p = await ctx.newPage();
    await p.addInitScript(`
      ${semear(false)}
      localStorage.setItem("recibocerto:cenarios:v1", JSON.stringify([{
        id: "e2e-heranca", tipo: "herancas", nome: "Herança de teste",
        criadoEm: new Date().toISOString(), versao: 1,
        resumo: { destaque: 1234, destaqueLabel: "Imposto do Selo total", destaqueFmt: "eur", linhas: [] },
        dados: { patrimonio: 100000 }
      }]));
    `);
    await p.goto(`${BASE}/dashboard/cenarios`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);

    const corpo = await p.locator("body").innerText();
    // Era guardado e nunca aparecia — a página renderizava de uma lista à
    // parte que esquecia este tipo (RC-P0-04).
    verificar("um cenário de heranças aparece na gestão", corpo.includes("Herança de teste"));
    verificar("a secção de heranças é desenhada", corpo.includes("Heranças e sucessões"));

    await p.getByRole("button", { name: /Apagar cenário/i }).first().click();
    await p.waitForTimeout(500);
    verificar(
      "eliminar pede confirmação",
      (await p.locator('[role="dialog"][aria-modal="true"]').count()) > 0,
    );
    const aindaLa = await p.locator("body").innerText();
    verificar("o cenário só desaparece depois de confirmar", aindaLa.includes("Herança de teste"));
    await ctx.close();
  }
} finally {
  await navegador.close();
}

console.log("");
if (falhas.length > 0) {
  console.error(`✗ ${falhas.length} verificação(ões) falharam:`);
  falhas.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log("✓ Dashboard verificado ponta a ponta.");
