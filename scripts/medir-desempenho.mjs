// ═══════════════════════════════════════════════════════════════════════
//  O MEDIDOR — desempenho das rotas, em números e não em impressões
//  ---------------------------------------------------------------------
//  `npm run desempenho` (com `npx next start` a servir uma BUILD).
//
//  Existe porque «o site está lento» não é acionável e «o primeiro ecrã
//  de `/` transfere 1,4 MB de JavaScript, dos quais 900 KB são de palcos
//  que não estão a ser mostrados» é.
//
//  ── O que mede, e porquê cada coisa ──────────────────────────────────
//
//   · **JS transferido** — o custo real na rede, já comprimido. É o
//     número que decide o tempo até a página responder ao primeiro
//     toque num telemóvel com rede fraca.
//   · **JS descomprimido** — o custo de PARSE e execução, que o gzip
//     não desconta. Um megabyte comprimido a 300 KB continua a ser um
//     megabyte para o motor de JavaScript analisar.
//   · **Tempo de bloqueio da tarefa longa** — quanto tempo a thread
//     principal esteve ocupada e incapaz de responder a um toque.
//   · **Transição entre abas** — o que a pessoa sente. Medido do clique
//     ao momento em que o novo título está no ecrã.
//
//  ── Como comparar ────────────────────────────────────────────────────
//
//  `--guardar` escreve o resultado em `desempenho.json` na raiz.
//  Correr outra vez compara com o guardado e mostra a diferença. Sem
//  base de comparação, uma otimização é uma opinião.
//
//  PLAYWRIGHT_CHROMIUM  caminho para um Chromium já instalado (opcional)
//  BASE_URL             por omissão, http://localhost:3000
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { chromium } from "playwright";

const EXEC = process.env.PLAYWRIGHT_CHROMIUM;
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const GUARDAR = process.argv.includes("--guardar");
const FICHEIRO = new URL("../desempenho.json", import.meta.url);

/** As rotas que importam. A primeira é a porta de entrada. */
const ROTAS = [
  { id: "/", url: "/" },
  { id: "/?foco=descobrir", url: "/?foco=descobrir" },
  { id: "/?foco=preco", url: "/?foco=preco" },
  { id: "/?foco=recibos", url: "/?foco=recibos" },
  { id: "/?foco=salario", url: "/?foco=salario" },
  { id: "/?foco=empresa", url: "/?foco=empresa" },
];

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const ms = (n) => `${n.toFixed(0)} ms`;

async function contexto(navegador) {
  const ctx = await navegador.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const versao = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
    .version;
  await ctx.addInitScript((v) => {
    try {
      localStorage.setItem("recibocerto:changelog_visto", v);
      localStorage.setItem(
        "recibocerto:cookie-consent",
        JSON.stringify({
          necessarios: true,
          estatistica: false,
          marketing: false,
          versao: 1,
          data: new Date().toISOString(),
        }),
      );
    } catch {}
  }, versao);
  return ctx;
}

/** Uma carga fria: tudo o que a rota puxa, sem cache nenhuma. */
async function medirRota(navegador, rota) {
  const ctx = await contexto(navegador);
  const p = await ctx.newPage();

  const recursos = [];
  p.on("response", async (r) => {
    const tipo = r.request().resourceType();
    if (!["script", "stylesheet", "document", "font", "image"].includes(tipo)) return;
    let transferido = 0;
    let corpo = 0;
    try {
      const cabecalhos = await r.allHeaders();
      transferido = Number(cabecalhos["content-length"] ?? 0);
      const b = await r.body();
      corpo = b.length;
      if (!transferido) transferido = corpo;
    } catch {
      /* respostas sem corpo acessível */
    }
    recursos.push({ url: r.url(), tipo, transferido, corpo });
  });

  await p.goto(`${BASE}${rota.url}`, { waitUntil: "load" });
  // Deixar assentar o que é adiado (`next/dynamic`, observadores).
  await p.waitForTimeout(2500);

  const soma = (tipo, campo) =>
    recursos.filter((r) => r.tipo === tipo).reduce((s, r) => s + r[campo], 0);

  const tempos = await p.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0];
    const tarefas = performance.getEntriesByType("longtask") ?? [];
    return {
      domContentLoaded: n ? n.domContentLoaded - n.startTime : 0,
      load: n ? n.loadEventEnd - n.startTime : 0,
      bloqueio: tarefas.reduce((s, t) => s + Math.max(0, t.duration - 50), 0),
    };
  });

  await ctx.close();
  return {
    id: rota.id,
    jsTransferido: soma("script", "transferido"),
    jsCru: soma("script", "corpo"),
    nScripts: recursos.filter((r) => r.tipo === "script").length,
    cssTransferido: soma("stylesheet", "transferido"),
    html: soma("document", "transferido"),
    ...tempos,
  };
}

/**
 * A transição entre abas — o que a pessoa sente.
 *
 * Do clique na cápsula de navegação até o `h1` da leitura nova estar no
 * ecrã. Uma navegação do App Router que já tenha o código em cache devia
 * ser quase instantânea; se não for, ou falta pré-carregamento ou está a
 * chegar código novo a cada troca.
 */
async function medirTransicoes(navegador, latencia) {
  const ctx = await contexto(navegador);
  const p = await ctx.newPage();

  // ── Com latência, ou não se vê nada ────────────────────────────────
  //  Medido no mesmo computador que serve, tudo parece instantâneo: o
  //  servidor responde em 40 ms e a diferença entre pré-carregar e não
  //  pré-carregar desaparece. Com 150 ms de ida-e-volta — uma ligação
  //  móvel decente em Portugal — a diferença é a que a pessoa sente.
  if (latencia) {
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: latencia,
      downloadThroughput: (4 * 1024 * 1024) / 8,
      uploadThroughput: (1 * 1024 * 1024) / 8,
    });
  }

  await p.goto(`${BASE}/?foco=descobrir`, { waitUntil: "load" });
  await p.waitForTimeout(2000);

  const bytesPorTroca = [];
  p.on("response", async (r) => {
    if (r.request().resourceType() !== "script") return;
    try {
      bytesPorTroca.push((await r.body()).length);
    } catch {}
  });

  const passos = [];
  for (const alvo of ["Preço", "Recibos verdes", "Empresa", "Salário", "Descobrir"]) {
    bytesPorTroca.length = 0;
    const ligacao = p.locator(`a[href*="foco="]:has-text("${alvo}")`).first();
    if (!(await ligacao.count())) continue;
    // O sinal é o H1 MUDAR — e não o título do separador conter uma
    // palavra, que era o que estava aqui e dava 15 s (o tempo limite) em
    // três das cinco trocas. Uma medição que falha em silêncio é pior do
    // que não medir: parece um resultado.
    const antesH1 = await p.locator("h1").first().innerText().catch(() => "");
    // Sobrevoar e esperar um pouco: é o que uma pessoa faz antes de
    // clicar, e é o que dispara o pré-carregamento do `<Link>`. Medir sem
    // isso mede um caso que quase não existe.
    await ligacao.hover().catch(() => {});
    await p.waitForTimeout(320);
    const inicio = Date.now();
    await ligacao.click();
    await p
      .waitForFunction(
        (anterior) => {
          const h = document.querySelector("h1");
          return Boolean(h?.textContent) && h.textContent.trim() !== anterior;
        },
        antesH1.trim(),
        { timeout: 10000 },
      )
      .catch(() => {});
    const decorrido = Date.now() - inicio;
    await p.waitForTimeout(600);
    passos.push({
      para: alvo,
      ms: decorrido,
      jsNovo: bytesPorTroca.reduce((s, n) => s + n, 0),
    });
  }
  await ctx.close();
  return passos;
}

// ── Correr ─────────────────────────────────────────────────────────────
const navegador = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
const rotas = [];
for (const rota of ROTAS) rotas.push(await medirRota(navegador, rota));
const LATENCIA = Number(process.env.LATENCIA ?? 150);
const transicoes = await medirTransicoes(navegador, LATENCIA);
await navegador.close();

const agora = { data: new Date().toISOString(), rotas, transicoes };
const antes = existsSync(FICHEIRO) ? JSON.parse(readFileSync(FICHEIRO, "utf8")) : null;

const delta = (novo, velho, formata) => {
  if (velho == null) return "";
  const d = novo - velho;
  if (Math.abs(d) < velho * 0.02) return "  (igual)";
  return `  ${d < 0 ? "▼" : "▲"} ${formata(Math.abs(d))}`;
};

console.log("\n═══ CARGA FRIA POR ROTA ═══");
console.log(
  "rota".padEnd(20) + "JS rede".padStart(11) + "JS cru".padStart(12) + "n.º".padStart(6) +
    "DOM".padStart(10) + "bloqueio".padStart(11),
);
for (const r of rotas) {
  const v = antes?.rotas.find((x) => x.id === r.id);
  console.log(
    r.id.padEnd(20) +
      kb(r.jsTransferido).padStart(11) +
      kb(r.jsCru).padStart(12) +
      String(r.nScripts).padStart(6) +
      ms(r.domContentLoaded).padStart(10) +
      ms(r.bloqueio).padStart(11) +
      delta(r.jsCru, v?.jsCru, kb),
  );
}

console.log(`\n═══ TRANSIÇÃO ENTRE ABAS (com ${LATENCIA} ms de latência) ═══`);
for (const t of transicoes) {
  const v = antes?.transicoes.find((x) => x.para === t.para);
  console.log(
    `→ ${t.para}`.padEnd(20) + ms(t.ms).padStart(10) + `  ${kb(t.jsNovo)} de JS novo` +
      delta(t.ms, v?.ms, ms),
  );
}

const totalCru = rotas.reduce((s, r) => s + r.jsCru, 0) / rotas.length;
console.log(`\nMédia de JS por rota: ${kb(totalCru)} (descomprimido)`);

if (GUARDAR) {
  writeFileSync(FICHEIRO, JSON.stringify(agora, null, 2));
  console.log(`\nGuardado em desempenho.json — a próxima corrida compara com esta.`);
}
