#!/usr/bin/env node
/**
 * AUDITORIA DE DENSIDADE DA CALCULADORA DE PREÇO — num browser a sério.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO EXISTE                                                   │
 * │                                                                     │
 * │ «A ferramenta está a tentar explicar tudo ao mesmo tempo» é uma      │
 * │ impressão, e uma impressão não se refuta nem se confirma lendo       │
 * │ código. Precisa de ser MEDIDA: quantos ecrãs de altura, quantos      │
 * │ elementos de texto simultaneamente visíveis, quantos abaixo de 12px, │
 * │ quantas secções competem pela atenção, e como é que isso muda entre  │
 * │ o estado inicial e um cenário totalmente preenchido.                 │
 * │                                                                     │
 * │ O `preco-navegacao.test.ts` lê a FONTE. Isto lê o ECRÃ.              │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   npm run build && npx next start        (noutro terminal)
 *   node scripts/auditar-densidade-preco.mjs
 *
 * Variáveis:
 *   RC_BASE_URL          por omissão http://localhost:3000
 *   RC_LARGURA           largura do viewport (por omissão 1280)
 *   RC_TEMA              "claro" (por omissão) ou "escuro"
 *   RC_CENARIOS          lista separada por vírgulas; por omissão, todos
 *   RC_CAPTURAS          diretório para screenshots (opcional)
 */

import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";
const LARGURA = Number(process.env.RC_LARGURA ?? 1280);
const ALTURA = Number(process.env.RC_ALTURA ?? 900);
const TEMA = process.env.RC_TEMA ?? "claro";
const CAPTURAS = process.env.RC_CAPTURAS ?? "";

const VERSAO = readFileSync(join(RAIZ, "src/lib/version.ts"), "utf8").match(
  /APP_VERSION\s*=\s*"([^"]+)"/,
)?.[1];

/** Os onze cenários que o pedido manda percorrer, pela chave da URL. */
const TODOS = [
  "produto_revenda", "produto_proprio", "produto_digital", "encomenda",
  "servico", "servico_hora", "projeto", "marketplace", "loja_online",
  "objetivo", "nao_sei",
];
const CENARIOS = (process.env.RC_CENARIOS ?? TODOS.join(",")).split(",").filter(Boolean);

/**
 * O estado de partida: sem popups a tapar a ferramenta.
 *
 * O consentimento de estatística fica a `false` de propósito. Isto é uma
 * auditoria de interface, e uma auditoria não tem de sujar a medição do
 * produto com dezenas de simulações que nunca existiram.
 */
const semear = `
  localStorage.setItem("recibocerto:onboarded", "1");
  localStorage.setItem("recibocerto:changelog_visto", ${JSON.stringify(VERSAO)});
  localStorage.setItem("recibocerto:cookie-consent", ${JSON.stringify(
    JSON.stringify({ necessarios: true, estatistica: false, marketing: false, data: new Date().toISOString(), versao: 1 }),
  )});
`;

/**
 * A medição.
 *
 * Corre dentro da página. Conta o que está MESMO visível — não o que
 * existe no DOM: um bloco fechado não pesa no ecrã de ninguém, e contá-lo
 * dava um número grande e falso.
 */
const MEDIR = `(() => {
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };

  const raiz = document.querySelector("#ferramenta") || document.body;
  const todos = [...raiz.querySelectorAll("*")].filter(visivel);

  // Elementos de TEXTO: os que têm texto próprio, não os contentores.
  const comTexto = todos.filter((el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0),
  );

  const tamanho = (el) => parseFloat(getComputedStyle(el).fontSize) || 0;
  const pequenos = comTexto.filter((el) => tamanho(el) < 12);
  const muitoPequenos = comTexto.filter((el) => tamanho(el) < 11);

  const palavras = comTexto.reduce(
    (s, el) =>
      s +
      [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join(" ")
        .split(/\\s+/)
        .filter(Boolean).length,
    0,
  );

  const seccoes = [...raiz.querySelectorAll("section, article")].filter(visivel);
  const cabecalhos = [...raiz.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visivel);
  const controlos = [...raiz.querySelectorAll("input,select,textarea,button,[role=radio],[role=slider]")].filter(visivel);

  // Cartões dentro de cartões dentro de cartões — o §17 proíbe-o.
  const cartoes = [...raiz.querySelectorAll("[class*=rounded-4xl],[class*=rounded-3xl],[class*=rounded-2xl]")].filter(visivel);
  let aninhamentoMax = 0;
  for (const c of cartoes) {
    let n = 0, p = c.parentElement;
    while (p && p !== raiz) {
      if (cartoes.includes(p)) n++;
      p = p.parentElement;
    }
    aninhamentoMax = Math.max(aninhamentoMax, n);
  }

  const doc = document.documentElement;
  return {
    alturaFerramenta: Math.round(raiz.getBoundingClientRect().height),
    alturaPagina: Math.round(doc.scrollHeight),
    ecrasFerramenta: +(raiz.getBoundingClientRect().height / window.innerHeight).toFixed(1),
    ecrasPagina: +(doc.scrollHeight / window.innerHeight).toFixed(1),
    elementosTexto: comTexto.length,
    palavras,
    textoAbaixo12: pequenos.length,
    textoAbaixo11: muitoPequenos.length,
    seccoes: seccoes.length,
    cabecalhos: cabecalhos.length,
    controlos: controlos.length,
    cartoes: cartoes.length,
    aninhamentoCartoes: aninhamentoMax,
    scrollHorizontal: doc.scrollWidth > doc.clientWidth + 1,
    larguraExcedida: Math.max(0, doc.scrollWidth - doc.clientWidth),
  };
})()`;

/**
 * Preenche o cenário com valores realistas.
 *
 * Não são valores aleatórios: são os que fazem APARECER cada peça que o
 * pedido manda auditar — fiscalidade, comissões, custos fixos, desconto,
 * tesouraria, sociedade. Medir a ferramenta vazia mediria o folheto, não
 * o produto.
 */
async function preencher(pagina, cenario) {
  const escrever = async (id, valor) => {
    const el = pagina.locator(`#${id}`).first();
    if ((await el.count()) === 0) return false;
    await el.fill(String(valor));
    await el.blur();
    return true;
  };
  const escolher = async (id, valor) => {
    const el = pagina.locator(`select#${id}`).first();
    if ((await el.count()) === 0) return false;
    await el.selectOption(valor).catch(() => {});
    return true;
  };
  const abrirBloco = async (texto) => {
    const b = pagina.locator("button", { hasText: texto }).first();
    if ((await b.count()) === 0) return false;
    await b.click().catch(() => {});
    await pagina.waitForTimeout(120);
    return true;
  };

  // ── O essencial, o que existir neste cenário ──────────────────────
  for (const [id, v] of [
    ["custo-direto", 12], ["custo-producao", 3], ["materia-lote", 40],
    ["materia-unidades", 8], ["horas-unidade", 2], ["rendimento-ano", 30000],
    ["ganho-mensal", 2000], ["volume", 60], ["objetivo-pct", 40],
  ]) {
    await escrever(id, v);
  }
  await escolher("regime-iva", "normal");
  await escolher("canal-venda", "worten");

  // ── O avançado: abrir e preencher o que faz aparecer cada peça ────
  await abrirBloco("enquadramento fiscal");
  await escolher("tipo-vendedor", "ti");
  await escrever("faturacao-anual", 32000);

  await abrirBloco("mesmo sem vender");           // custos fixos
  const renda = pagina.locator("button", { hasText: "Renda" }).first();
  if (await renda.count()) {
    await renda.click().catch(() => {});
    await pagina.waitForTimeout(100);
    const val = pagina.locator('input[aria-label*="valor em euros"]').first();
    if (await val.count()) { await val.fill("450"); await val.blur(); }
  }

  await abrirBloco("só existem quando vendes");   // variáveis
  await escrever("portes", 3.5);
  await escrever("desperdicio", 8);

  await abrirBloco("Comissões");
  await escrever("afiliado", 5);

  await abrirBloco("Devoluções");
  await escrever("taxa-devolucao", 6);
  await escrever("custo-devolucao", 5);

  await abrirBloco("Desconto");
  await escrever("desconto", 20);

  await abrirBloco("preço que tinhas em mente");
  await escrever("preco-pensado", 30);

  await pagina.waitForTimeout(400);
}

// ─── Corrida ───────────────────────────────────────────────────────────

if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

const navegador = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
  // O Chromium não herda o `HTTPS_PROXY` do ambiente como o `curl` faz.
  // Isto encaminha-o, mas note-se que num ambiente com proxy de
  // inspeção o Chromium ainda pode recusar o certificado — nesse caso
  // meça-se contra um `next start` local, que é o que este script faz
  // por omissão. Nunca desligar a verificação de TLS para contornar.
  ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),
});

const resultados = [];

try {
  const contexto = await navegador.newContext({
    viewport: { width: LARGURA, height: ALTURA },
    colorScheme: TEMA === "escuro" ? "dark" : "light",
    locale: "pt-PT",
  });
  await contexto.addInitScript(semear);
  if (TEMA === "escuro") {
    await contexto.addInitScript(`localStorage.setItem("recibocerto:theme", "dark");`);
  }

  for (const cenario of CENARIOS) {
    const pagina = await contexto.newPage();
    await pagina.goto(`${BASE}/ferramentas/calcular-preco?c=${cenario}`, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(500);

    const inicial = await pagina.evaluate(MEDIR);
    if (CAPTURAS) {
      await pagina.screenshot({ path: join(CAPTURAS, `${cenario}-${LARGURA}-${TEMA}-inicial.png`), fullPage: true });
    }

    await preencher(pagina, cenario);
    const cheio = await pagina.evaluate(MEDIR);
    if (CAPTURAS) {
      await pagina.screenshot({ path: join(CAPTURAS, `${cenario}-${LARGURA}-${TEMA}-cheio.png`), fullPage: true });
    }

    resultados.push({ cenario, inicial, cheio });
    await pagina.close();
  }
} finally {
  await navegador.close();
}

// ─── Relatório ─────────────────────────────────────────────────────────

const n = (v) => String(v).padStart(6);
console.log(`\n═══ DENSIDADE — ${LARGURA}px · tema ${TEMA} ═══\n`);
console.log(
  "cenário".padEnd(18) +
    "ecrãs".padStart(7) + "texto".padStart(7) + "palavr".padStart(7) +
    "<12px".padStart(7) + "<11px".padStart(7) + "secç".padStart(6) +
    "ctrl".padStart(6) + "cards".padStart(7) + "aninh".padStart(6) + "  scrollX",
);
console.log("─".repeat(96));

for (const r of resultados) {
  for (const [rotulo, m] of [["  · inicial", r.inicial], ["  · cheio", r.cheio]]) {
    const nome = rotulo === "  · inicial" ? r.cenario.padEnd(18) : "".padEnd(18);
    console.log(
      nome + n(m.ecrasFerramenta) + n(m.elementosTexto) + n(m.palavras) +
        n(m.textoAbaixo12) + n(m.textoAbaixo11) + n(m.seccoes) +
        n(m.controlos) + n(m.cartoes) + n(m.aninhamentoCartoes) +
        (m.scrollHorizontal ? `  SIM +${m.larguraExcedida}px` : "  não"),
    );
  }
}

const media = (chave, estado) =>
  Math.round(resultados.reduce((s, r) => s + r[estado][chave], 0) / resultados.length);

console.log("\n─── médias ───");
for (const [chave, rotulo] of [
  ["ecrasFerramenta", "ecrãs de altura"],
  ["elementosTexto", "elementos de texto"],
  ["palavras", "palavras"],
  ["textoAbaixo12", "texto < 12px"],
  ["textoAbaixo11", "texto < 11px"],
  ["seccoes", "secções"],
  ["cartoes", "cartões"],
]) {
  console.log(`  ${rotulo.padEnd(22)} inicial ${String(media(chave, "inicial")).padStart(5)}   cheio ${String(media(chave, "cheio")).padStart(5)}`);
}

const comScroll = resultados.filter((r) => r.inicial.scrollHorizontal || r.cheio.scrollHorizontal);
if (comScroll.length > 0) {
  console.log(`\n⚠  scroll horizontal em: ${comScroll.map((r) => r.cenario).join(", ")}`);
}

console.log("");
