#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = (process.env.RC_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const EXECUTAVEL = process.env.PLAYWRIGHT_CHROMIUM;
const VERSAO = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const falhas = [];

function verificar(condicao, mensagem, detalhe = "") {
  if (condicao) console.log(`  ✓ ${mensagem}${detalhe ? ` — ${detalhe}` : ""}`);
  else {
    falhas.push(`${mensagem}${detalhe ? ` — ${detalhe}` : ""}`);
    console.log(`  ✗ ${mensagem}${detalhe ? ` — ${detalhe}` : ""}`);
  }
}

const browser = await chromium.launch(EXECUTAVEL ? { executablePath: EXECUTAVEL } : {});
const context = await browser.newContext({
  viewport: { width: 360, height: 800 },
  hasTouch: true,
  colorScheme: "light",
});
await context.addInitScript(([versao]) => {
  localStorage.setItem("recibocerto:changelog_visto", versao);
  localStorage.setItem("recibocerto:cookie-consent", JSON.stringify({
    necessarios: true,
    estatistica: false,
    marketing: false,
    data: new Date().toISOString(),
    versao: 2,
  }));
}, [VERSAO]);

const page = await context.newPage();
const erros = [];
page.on("pageerror", (erro) => erros.push(String(erro)));

try {
  console.log("\n▸ Homepage de salário · 360 px");
  await page.goto(`${BASE}/inicio/salario?percurso=trabalhador`, { waitUntil: "networkidle" });
  const grupo = page.getByRole("radiogroup", { name: "Escolhe o teu percurso" });
  await grupo.waitFor({ timeout: 30_000 });
  verificar(await grupo.getByRole("radio").count() === 2, "os dois percursos estão sempre visíveis");
  verificar(await grupo.getByRole("radio", { name: /Simular o meu salário/ }).getAttribute("aria-checked") === "true", "o percurso da query fica selecionado");
  const semOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  verificar(semOverflow, "a homepage não cria overflow horizontal");

  await grupo.getByRole("radio", { name: /Planear uma contratação/ }).click();
  await page.locator("#palco-contratacao").waitFor();
  verificar(new URL(page.url()).searchParams.get("percurso") === "empregador", "a escolha atualiza a query sem recarregar");
  verificar(await page.getByRole("link", { name: /Planear uma contratação/ }).getAttribute("href") === "/ferramentas/planeador-contratacao", "o CTA acompanha o percurso");
  verificar(await page.getByText("Régua do orçamento anual").count() === 1, "o palco patronal mostra orçamento, pacote e capacidade");

  await page.goto(`${BASE}/inicio/salario?percurso=trabalhador`, { waitUntil: "networkidle" });
  await page.goBack({ waitUntil: "networkidle" });
  verificar(new URL(page.url()).searchParams.get("percurso") === "empregador", "Back restaura o percurso da história");
  verificar(await page.locator("#palco-contratacao").count() === 1, "o palco acompanha Back/Forward");

  const a11yHome = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  verificar(a11yHome.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? "")).length === 0, "sem violações sérias ou críticas na bifurcação");

  console.log("\n▸ Planeador de contratação · 360 px");
  await page.goto(`${BASE}/ferramentas/planeador-contratacao`, { waitUntil: "networkidle" });
  await page.getByRole("radiogroup", { name: "Objetivo da contratação" }).waitFor({ timeout: 30_000 });
  verificar(await page.getByRole("radio").count() >= 4, "os quatro objetivos respondem por teclado e toque");
  verificar(await page.getByText("Custos do posto — opcionais").count() === 1, "custos avançados começam recolhidos");
  const toolOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  verificar(toolOverflow, "a ferramenta não cria overflow horizontal");

  await page.getByRole("button", { name: /Calcular a contratação/ }).click();
  await page.getByText("Decisão calculada · regras 2026").waitFor();
  verificar(await page.getByRole("tab").count() === 5, "o resultado expõe os cinco separadores previstos");
  await page.getByRole("button", { name: "Fixar pacote A" }).click();
  verificar(await page.getByText("Pacote A e proposta atual").count() === 1, "a comparação de pacotes é criada");

  const a11yTool = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  verificar(a11yTool.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? "")).length === 0, "sem violações sérias ou críticas no resultado");
  verificar(erros.length === 0, "sem exceções de runtime", erros.join(" | "));
} finally {
  await context.close();
  await browser.close();
}

if (falhas.length > 0) {
  console.error(`\n${falhas.length} falha(s) no planeador de contratação.`);
  process.exit(1);
}
console.log("\nPlaneador de contratação verificado ponta a ponta.");
