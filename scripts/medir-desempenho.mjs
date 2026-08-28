#!/usr/bin/env node
// Benchmark repetível da homepage. Deve correr contra uma BUILD servida.
// Mede hard reload, primeiro toque/clique, rota preparada, rota visitada e
// teclado. Falha de selector ou de marca é sempre erro, nunca um tempo válido.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium, firefox, webkit } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const SMOKE = process.argv.includes("--smoke") || process.env.RC_PERF_SMOKE === "1";
const GUARDAR = process.argv.includes("--guardar");
const GATE = process.argv.includes("--gate");
const REPETICOES = Number(process.env.RC_REPETICOES ?? (SMOKE ? 1 : 10));
const SAIDA = resolve(process.env.RC_PERF_OUTPUT ?? "artifacts/desempenho-homepage.json");

if (!SMOKE && (!Number.isInteger(REPETICOES) || REPETICOES < 10)) {
  throw new Error("RC_REPETICOES tem de ser ≥10; use --smoke apenas para diagnóstico local.");
}

const ROTAS = {
  descobrir: "/",
  preco: "/inicio/preco",
  recibos: "/inicio/recibos",
  empresa: "/inicio/empresa",
  salario: "/inicio/salario",
};

const REDES = {
  wifi: { rotulo: "Wi-Fi", latencia: 20, downloadMbps: 30, uploadMbps: 15 },
  fast4g: { rotulo: "Fast 4G", latencia: 75, downloadMbps: 9, uploadMbps: 1.5 },
  slow4g: { rotulo: "Slow 4G", latencia: 150, downloadMbps: 1.6, uploadMbps: 0.75 },
};

const CENARIOS = {
  "mobile-fast4g": {
    viewport: { width: 390, height: 844 }, touch: true, cpu: 6,
    rede: "fast4g", motion: "no-preference",
  },
  "mobile-slow4g": {
    viewport: { width: 390, height: 844 }, touch: true, cpu: 6,
    rede: "slow4g", motion: "no-preference",
  },
  "desktop-normal": {
    viewport: { width: 1366, height: 768 }, touch: false, cpu: 1,
    rede: "wifi", motion: "no-preference",
  },
  "desktop-cpu4": {
    viewport: { width: 1366, height: 768 }, touch: false, cpu: 4,
    rede: "wifi", motion: "no-preference",
  },
  "desktop-wide": {
    viewport: { width: 1440, height: 900 }, touch: false, cpu: 1,
    rede: "wifi", motion: "no-preference",
  },
  "mobile-reduced": {
    viewport: { width: 390, height: 844 }, touch: true, cpu: 6,
    rede: "fast4g", motion: "reduce",
  },
  "desktop-reduced": {
    viewport: { width: 1366, height: 768 }, touch: false, cpu: 1,
    rede: "wifi", motion: "reduce",
  },
};

const TIPOS_BROWSER = { chromium, firefox, webkit };

function selecionar(nome, todos) {
  const pedido = process.env[nome];
  if (!pedido) return todos;
  const ids = pedido.split(",").map((item) => item.trim()).filter(Boolean);
  for (const id of ids) {
    if (!todos.includes(id)) throw new Error(`${nome}: valor desconhecido «${id}».`);
  }
  return ids;
}

const browsersSelecionados = selecionar(
  "RC_BROWSERS",
  SMOKE ? ["chromium"] : Object.keys(TIPOS_BROWSER),
);
const cenariosSelecionados = selecionar(
  "RC_CENARIOS",
  SMOKE ? ["desktop-normal"] : Object.keys(CENARIOS),
);
const focosSelecionados = selecionar(
  "RC_FOCOS",
  SMOKE ? ["descobrir"] : Object.keys(ROTAS),
);

const versao = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;
const consentVersion = (() => {
  const fonte = readFileSync(
    new URL("../src/lib/cookie-consent.ts", import.meta.url),
    "utf8",
  );
  const correspondencia = fonte.match(/export const CONSENT_VERSION = (\d+);/);
  if (!correspondencia) {
    throw new Error("Não foi possível ler CONSENT_VERSION para preparar o benchmark.");
  }
  return Number(correspondencia[1]);
})();
const executarGit = (args, omissao) => {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return omissao;
  }
};
const commit = executarGit(["rev-parse", "HEAD"], "desconhecido");
const dirty = Boolean(executarGit(["status", "--porcelain"], ""));
const buildId = (() => {
  try {
    return readFileSync(new URL("../.next/BUILD_ID", import.meta.url), "utf8").trim();
  } catch {
    return null;
  }
})();

const esperar = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const mbpsParaBytes = (mbps) => (mbps * 1024 * 1024) / 8;

async function prepararPagina(
  navegador,
  browserNome,
  cenario,
  { cacheFria = false, saveData = false } = {},
) {
  const rede = REDES[cenario.rede];
  const contexto = await navegador.newContext({
    viewport: cenario.viewport,
    hasTouch: cenario.touch,
    reducedMotion: cenario.motion,
    colorScheme: "light",
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
    extraHTTPHeaders: cacheFria ? { "Cache-Control": "no-cache" } : undefined,
  });

  await contexto.addInitScript(
    ({ appVersion, consentimento, effectiveType, poupar }) => {
      try {
        localStorage.setItem("recibocerto:changelog_visto", appVersion);
        localStorage.setItem(
          "recibocerto:cookie-consent",
          JSON.stringify({
            necessarios: true,
            estatistica: false,
            marketing: false,
            versao: consentimento,
            data: new Date().toISOString(),
          }),
        );
      } catch {}

      try {
        Object.defineProperty(navigator, "connection", {
          configurable: true,
          value: {
            saveData: poupar,
            effectiveType,
            downlink: effectiveType === "4g" ? 9 : 1.6,
            rtt: effectiveType === "4g" ? 75 : 150,
            addEventListener() {},
            removeEventListener() {},
          },
        });
      } catch {}

      window.__rcPerf = { longtasks: [], eventos: [], shifts: [], lcp: [], frames: [] };
      const observar = (opcoes, guardar) => {
        try {
          new PerformanceObserver((lista) => guardar(lista.getEntries())).observe(opcoes);
        } catch {}
      };
      observar({ type: "longtask", buffered: true }, (entradas) => {
        window.__rcPerf.longtasks.push(
          ...entradas.map((e) => ({ start: e.startTime, duration: e.duration })),
        );
      });
      observar({ type: "event", buffered: true, durationThreshold: 16 }, (entradas) => {
        window.__rcPerf.eventos.push(
          ...entradas.map((e) => ({
            name: e.name,
            start: e.startTime,
            duration: e.duration,
            interactionId: e.interactionId ?? 0,
          })),
        );
      });
      observar({ type: "layout-shift", buffered: true }, (entradas) => {
        window.__rcPerf.shifts.push(
          ...entradas.map((e) => ({
            start: e.startTime,
            value: e.value,
            recent: e.hadRecentInput,
          })),
        );
      });
      observar({ type: "largest-contentful-paint", buffered: true }, (entradas) => {
        window.__rcPerf.lcp.push(...entradas.map((e) => e.startTime));
      });
      const frame = (agora) => {
        window.__rcPerf.frames.push(agora);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
    {
      appVersion: versao,
      consentimento: consentVersion,
      effectiveType: cenario.rede === "slow4g" ? "3g" : "4g",
      poupar: saveData,
    },
  );

  const pagina = await contexto.newPage();
  let redeAplicada = "latência aproximada; throughput nativo";
  let cpuAplicada = 1;
  if (browserNome === "chromium") {
    const cdp = await contexto.newCDPSession(pagina);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: cacheFria });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: rede.latencia,
      downloadThroughput: mbpsParaBytes(rede.downloadMbps),
      uploadThroughput: mbpsParaBytes(rede.uploadMbps),
      connectionType: cenario.rede === "wifi" ? "wifi" : "cellular4g",
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cenario.cpu });
    redeAplicada = "CDP: latência + throughput";
    cpuAplicada = cenario.cpu;
  } else {
    // Firefox/WebKit não expõem CPU/network CDP. Ainda recebem a mesma
    // latência; o relatório marca a diferença e nunca finge throughput/CPU.
    await pagina.route("**/*", async (rota) => {
      await esperar(Math.ceil(rede.latencia / 2));
      await rota.continue();
    });
  }
  return { contexto, pagina, redeAplicada, cpuAplicada };
}

const erroDeSelector = (mensagem, pagina) =>
  new Error(`${mensagem} · URL atual: ${pagina.url()}`);

async function exigirHomepage(pagina, foco) {
  const seletor = `main[data-homepage-foco="${foco}"]`;
  const principal = pagina.locator(seletor);
  // O App Router atualiza o URL no `commit` antes de substituir a árvore
  // visível. Esperar primeiro pelo destino evita transformar esse intervalo
  // legítimo numa falsa ausência de selector nos três motores.
  await principal.first().waitFor({ state: "visible", timeout: 10_000 });
  if ((await principal.count()) !== 1) {
    throw erroDeSelector(`Esperava exatamente ${seletor}`, pagina);
  }
  const h1 = principal.locator("h1");
  if ((await h1.count()) < 1) throw erroDeSelector(`${seletor} ficou sem h1`, pagina);
  if ((await principal.innerText()).trim().length < 500) {
    throw erroDeSelector(`${seletor} não contém HTML editorial útil`, pagina);
  }
  const overlay = pagina.locator(
    "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay",
  );
  if (await overlay.count()) throw erroDeSelector("Overlay de erro do framework", pagina);
  return (await h1.first().innerText()).trim();
}

async function medirCarga(navegador, browserNome, cenarioId, foco) {
  const cenario = CENARIOS[cenarioId];
  const { contexto, pagina, redeAplicada, cpuAplicada } = await prepararPagina(
    navegador,
    browserNome,
    cenario,
    { cacheFria: true },
  );
  try {
    const resposta = await pagina.goto(`${BASE}${ROTAS[foco]}`, {
      waitUntil: "load",
      timeout: 45_000,
    });
    if (!resposta || resposta.status() !== 200) {
      throw new Error(`${ROTAS[foco]} devolveu HTTP ${resposta?.status() ?? "sem resposta"}`);
    }
    const h1 = await exigirHomepage(pagina, foco);
    await pagina.waitForTimeout(2_500);
    const metricas = await pagina.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const recursos = performance.getEntriesByType("resource");
      const fcp = performance
        .getEntriesByType("paint")
        .find((e) => e.name === "first-contentful-paint")?.startTime ?? null;
      const limiteInicial = nav?.loadEventEnd || Infinity;
      const scripts = recursos.filter(
        (r) => r.initiatorType === "script" && r.responseEnd <= limiteInicial,
      );
      const tarefas = window.__rcPerf.longtasks.filter((t) => t.start <= 5_000);
      const eventos = window.__rcPerf.eventos.filter((e) => e.interactionId > 0);
      return {
        ttfb: nav ? nav.responseStart - nav.requestStart : null,
        fcp,
        lcp: window.__rcPerf.lcp.at(-1) ?? null,
        cls: window.__rcPerf.shifts
          .filter((s) => !s.recent)
          .reduce((total, s) => total + s.value, 0),
        inp: eventos.length ? Math.max(...eventos.map((e) => e.duration)) : null,
        domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : null,
        load: nav ? nav.loadEventEnd - nav.startTime : null,
        jsTransferido: scripts.reduce((total, r) => total + r.transferSize, 0),
        jsComprimido: scripts.reduce((total, r) => total + r.encodedBodySize, 0),
        jsDescodificado: scripts.reduce((total, r) => total + r.decodedBodySize, 0),
        scripts: scripts.length,
        htmlTransferido: nav?.transferSize ?? null,
        htmlComprimido: nav?.encodedBodySize ?? null,
        htmlDescodificado: nav?.decodedBodySize ?? null,
        maiorLongTask: tarefas.length ? Math.max(...tarefas.map((t) => t.duration)) : 0,
        tbt: tarefas.reduce((total, t) => total + Math.max(0, t.duration - 50), 0),
      };
    });
    const headers = await resposta.allHeaders();
    return {
      browser: browserNome,
      cenario: cenarioId,
      foco,
      rota: ROTAS[foco],
      h1,
      cacheControl: headers["cache-control"] ?? null,
      redeAplicada,
      cpuAplicada,
      ...metricas,
    };
  } finally {
    await contexto.close();
  }
}

const NOMES_MARCA = [
  "rc:foco:pointerdown",
  "rc:foco:ack-painted",
  "rc:foco:prefetch-start",
  "rc:foco:prefetch-end",
  "rc:foco:navigation-start",
  "rc:foco:rsc-end",
  "rc:foco:content-commit",
  "rc:foco:first-animation-frame",
];

async function ligacaoVisivel(pagina, foco) {
  const todas = pagina.locator(`[data-foco-destino="${foco}"]`);
  const quantidade = await todas.count();
  for (let indice = 0; indice < quantidade; indice += 1) {
    const candidata = todas.nth(indice);
    if (await candidata.isVisible()) return candidata;
  }
  throw erroDeSelector(`Sem ligação visível para o foco «${foco}»`, pagina);
}

async function limparJanela(pagina) {
  await pagina.evaluate((nomes) => {
    for (const nome of nomes) performance.clearMarks(nome);
    window.__rcPerf.longtasks = [];
    window.__rcPerf.eventos = [];
    window.__rcPerf.shifts = [];
    window.__rcPerf.frames = [];
  }, NOMES_MARCA);
}

async function prepararFoco(pagina, link, foco, metodo) {
  if (metodo === "focus") await link.focus();
  else if (metodo === "hover") await link.hover();
  // `idle` não sintetiza hover num ecrã tátil: espera o único adjacente que
  // a política real prepara depois de a página assentar.
  await pagina.waitForFunction(
    (destino) => performance
      .getEntriesByName("rc:foco:prefetch-start")
      .some((e) => e.detail?.foco === destino),
    foco,
    { timeout: 3_000 },
  );
  await pagina
    .waitForFunction(
      (destino) => performance
        .getEntriesByName("rc:foco:prefetch-end")
        .some((e) => e.detail?.foco === destino),
      foco,
      { timeout: 2_500 },
    )
    .catch(() => pagina.waitForTimeout(2_500));
}

async function interagir({
  pagina,
  contexto,
  foco,
  entrada,
  modo,
  motion,
  preparacao = "hover",
  offline = false,
}) {
  const link = await ligacaoVisivel(pagina, foco);
  await limparJanela(pagina);
  if (modo === "preparado") {
    await prepararFoco(pagina, link, foco, preparacao);
    await limparJanela(pagina);
  }
  if (offline) await contexto.setOffline(true);

  const destino = new URL(ROTAS[foco], BASE).href;
  const navegacao = pagina.waitForURL(destino, { waitUntil: "commit", timeout: 10_000 });
  if (entrada === "touch") await Promise.all([navegacao, link.tap()]);
  else if (entrada === "teclado") await Promise.all([navegacao, link.press("Enter")]);
  else await Promise.all([navegacao, link.click()]);

  await exigirHomepage(pagina, foco);
  await pagina.waitForFunction(
    () => performance.getEntriesByName("rc:foco:content-commit").length > 0,
    undefined,
    { timeout: 10_000 },
  );
  if (offline) await contexto.setOffline(false);

  const marcouFrame = await pagina.evaluate(
    () => performance.getEntriesByName("rc:foco:first-animation-frame").length > 0,
  );
  if (!marcouFrame && motion !== "reduce") {
    const palco = pagina.locator("[data-palco]").first();
    if (await palco.count()) await palco.scrollIntoViewIfNeeded().catch(() => {});
  }
  if (motion !== "reduce") {
    await pagina
      .waitForFunction(
        () => performance.getEntriesByName("rc:foco:first-animation-frame").length > 0,
        undefined,
        { timeout: 4_000 },
      )
      .catch(() => {});
  }
  await pagina.waitForTimeout(2_050);

  return pagina.evaluate((nomes) => {
    const marca = (nome) => performance.getEntriesByName(nome).at(-1)?.startTime ?? null;
    const pointer = marca(nomes[0]);
    const ack = marca(nomes[1]);
    const rsc = marca(nomes[5]);
    const commit = marca(nomes[6]);
    const primeiroFrame = marca(nomes[7]);
    if (pointer === null || ack === null || commit === null) {
      throw new Error(`Marcas obrigatórias ausentes: pointer=${pointer}, ack=${ack}, commit=${commit}`);
    }
    const fim = commit + 2_000;
    const recursos = performance.getEntriesByType("resource").filter(
      (r) => r.startTime >= pointer && r.startTime <= commit,
    );
    const tarefas = window.__rcPerf.longtasks.filter(
      (t) => t.start >= pointer && t.start <= fim,
    );
    const eventos = window.__rcPerf.eventos.filter(
      (e) => e.start >= pointer && e.start <= commit && e.interactionId > 0,
    );
    const frames = window.__rcPerf.frames.filter(
      (tempo) => tempo >= (primeiroFrame ?? commit) && tempo <= fim,
    );
    const duracaoFrames = frames.length > 1 ? frames.at(-1) - frames[0] : 0;
    const fps = duracaoFrames > 0 ? ((frames.length - 1) * 1_000) / duracaoFrames : null;
    let perdidos = 0;
    for (let indice = 1; indice < frames.length; indice += 1) {
      if (frames[indice] - frames[indice - 1] > 32) perdidos += 1;
    }
    return {
      ack: ack - pointer,
      ready: commit - pointer,
      rsc: rsc === null ? null : rsc - pointer,
      primeiraFrame: primeiroFrame === null ? null : primeiroFrame - commit,
      requests: recursos.length,
      bytesTransferidos: recursos.reduce((total, r) => total + r.transferSize, 0),
      bytesComprimidos: recursos.reduce((total, r) => total + r.encodedBodySize, 0),
      jsNovo: recursos
        .filter((r) => r.initiatorType === "script")
        .reduce((total, r) => total + r.encodedBodySize, 0),
      rscComprimido: recursos
        .filter((r) => /_rsc=|\.rsc(?:\?|$)/.test(r.name))
        .reduce((total, r) => total + r.encodedBodySize, 0),
      longTasks: tarefas.length,
      maiorLongTask: tarefas.length ? Math.max(...tarefas.map((t) => t.duration)) : 0,
      tbt: tarefas.reduce((total, t) => total + Math.max(0, t.duration - 50), 0),
      eventTiming: eventos.length ? Math.max(...eventos.map((e) => e.duration)) : null,
      cls: window.__rcPerf.shifts
        .filter((s) => !s.recent && s.start >= pointer && s.start <= fim)
        .reduce((total, s) => total + s.value, 0),
      fps,
      frames: frames.length,
      framesPerdidos: perdidos,
    };
  }, NOMES_MARCA);
}

async function medirTrocas(navegador, browserNome, cenarioId, repeticao) {
  const cenario = CENARIOS[cenarioId];
  const { contexto, pagina, redeAplicada, cpuAplicada } = await prepararPagina(
    navegador,
    browserNome,
    cenario,
  );
  try {
    await pagina.goto(`${BASE}/`, { waitUntil: "load", timeout: 45_000 });
    await exigirHomepage(pagina, "descobrir");
    await pagina.waitForTimeout(180);
    const entradaFria = cenario.touch ? "touch" : "pointer";
    const fria = await interagir({
      pagina, contexto, foco: "empresa", entrada: entradaFria,
      modo: "frio", motion: cenario.motion,
    });

    await pagina.goBack({ waitUntil: "commit", timeout: 10_000 });
    await exigirHomepage(pagina, "descobrir");
    const visitada = await interagir({
      pagina, contexto, foco: "empresa", entrada: entradaFria,
      modo: "visitado", motion: cenario.motion,
    });

    await pagina.goBack({ waitUntil: "commit", timeout: 10_000 });
    await exigirHomepage(pagina, "descobrir");
    const preparadas = [];
    if (cenario.touch) {
      preparadas.push({
        modo: "preparado",
        foco: "preco",
        entrada: "touch",
        ...await interagir({
          pagina, contexto, foco: "preco", entrada: "touch",
          modo: "preparado", motion: cenario.motion, preparacao: "idle",
          offline: repeticao === 0,
        }),
      });
    } else {
      preparadas.push({
        modo: "preparado",
        foco: "recibos",
        entrada: "pointer",
        ...await interagir({
          pagina, contexto, foco: "recibos", entrada: "pointer",
          modo: "preparado", motion: cenario.motion, preparacao: "hover",
          offline: repeticao === 0,
        }),
      });
      await pagina.goBack({ waitUntil: "commit", timeout: 10_000 });
      await exigirHomepage(pagina, "descobrir");
      preparadas.push({
        modo: "preparado",
        foco: "preco",
        entrada: "teclado",
        ...await interagir({
          pagina, contexto, foco: "preco", entrada: "teclado",
          modo: "preparado", motion: cenario.motion, preparacao: "focus",
        }),
      });
    }

    return [
      { modo: "frio", foco: "empresa", entrada: entradaFria, ...fria },
      { modo: "visitado", foco: "empresa", entrada: entradaFria, ...visitada },
      ...preparadas,
    ].map((amostra) => ({
      browser: browserNome,
      cenario: cenarioId,
      redeAplicada,
      cpuAplicada,
      ...amostra,
    }));
  } finally {
    await contexto.close();
  }
}

async function validarSaveData(navegador, browserNome) {
  const cenario = CENARIOS["mobile-fast4g"];
  const { contexto, pagina } = await prepararPagina(navegador, browserNome, cenario, {
    saveData: true,
  });
  try {
    await pagina.goto(`${BASE}/`, { waitUntil: "load", timeout: 45_000 });
    await exigirHomepage(pagina, "descobrir");
    await pagina.waitForTimeout(1_800);
    const idle = await pagina.evaluate(() =>
      performance
        .getEntriesByName("rc:foco:prefetch-start")
        .filter((e) => e.detail?.origem === "idle").length,
    );
    if (idle !== 0) throw new Error(`Save-Data permitiu ${idle} prefetch(es) especulativo(s).`);
    return { browser: browserNome, saveData: true, prefetchIdle: idle, passou: true };
  } finally {
    await contexto.close();
  }
}

const arredondar = (valor) => (valor == null ? null : Number(valor.toFixed(2)));
function percentil(valores, fracao) {
  if (!valores.length) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.max(0, Math.ceil(fracao * ordenados.length) - 1)];
}
function estatisticas(amostras, campo) {
  const valores = amostras.map((item) => item[campo]).filter(Number.isFinite);
  if (!valores.length) {
    return { n: 0, p50: null, p75: null, p95: null, min: null, max: null, dispersao: null };
  }
  const p50 = percentil(valores, 0.5);
  const p75 = percentil(valores, 0.75);
  const p95 = percentil(valores, 0.95);
  return {
    n: valores.length,
    p50: arredondar(p50),
    p75: arredondar(p75),
    p95: arredondar(p95),
    min: arredondar(Math.min(...valores)),
    max: arredondar(Math.max(...valores)),
    dispersao: arredondar(p95 - p50),
  };
}
function agrupar(amostras, chaves) {
  const grupos = new Map();
  for (const amostra of amostras) {
    const chave = chaves.map((campo) => amostra[campo]).join("|");
    const grupo = grupos.get(chave) ?? { amostras: [] };
    grupo.amostras.push(amostra);
    grupos.set(chave, grupo);
  }
  return [...grupos.values()];
}

const CAMPOS_CARGA = [
  "ttfb", "fcp", "lcp", "cls", "inp", "domContentLoaded", "load",
  "jsTransferido", "jsComprimido", "jsDescodificado", "scripts",
  "htmlTransferido", "htmlComprimido", "htmlDescodificado", "maiorLongTask", "tbt",
];
const CAMPOS_TROCA = [
  "ack", "ready", "rsc", "primeiraFrame", "requests", "bytesTransferidos",
  "bytesComprimidos", "jsNovo", "rscComprimido", "longTasks", "maiorLongTask",
  "tbt", "eventTiming", "cls", "fps", "frames", "framesPerdidos",
];

function resumir(amostras, chaves, campos) {
  return agrupar(amostras, chaves).map(({ amostras: itens }) => ({
    ...Object.fromEntries(chaves.map((chave) => [chave, itens[0][chave]])),
    amostras: itens.length,
    metricas: Object.fromEntries(campos.map((campo) => [campo, estatisticas(itens, campo)])),
  }));
}

function verificarBudgets(sumario) {
  const falhas = [];
  const exigir = (condicao, mensagem) => { if (!condicao) falhas.push(mensagem); };
  const dentro = (valor, limite) => Number.isFinite(valor) && valor <= limite;
  const minimo = (valor, limite) => Number.isFinite(valor) && valor >= limite;

  for (const grupo of sumario.cargas) {
    if (grupo.browser !== "chromium") continue;
    const m = grupo.metricas;
    if (grupo.cenario === "mobile-fast4g") {
      exigir(dentro(m.fcp.p75, 1_500), `${grupo.rota}: FCP p75 ausente ou >1500 ms`);
      exigir(dentro(m.lcp.p75, 2_500), `${grupo.rota}: LCP p75 ausente ou >2500 ms`);
      exigir(dentro(m.cls.p75, 0.1), `${grupo.rota}: CLS p75 ausente ou >0,10`);
      exigir(dentro(m.jsDescodificado.p75, 800 * 1024), `${grupo.rota}: JS inicial >800 KB`);
      exigir(dentro(m.maiorLongTask.p75, 100), `${grupo.rota}: maior long task p75 >100 ms`);
      exigir(dentro(m.tbt.p75, 300), `${grupo.rota}: TBT p75 >300 ms`);
    }
    if (grupo.cenario === "desktop-normal" || grupo.cenario === "desktop-cpu4") {
      exigir(dentro(m.fcp.p75, 1_000), `${grupo.cenario}/${grupo.rota}: FCP p75 >1000 ms`);
      exigir(dentro(m.lcp.p75, 1_800), `${grupo.cenario}/${grupo.rota}: LCP p75 >1800 ms`);
      exigir(dentro(m.cls.p75, 0.1), `${grupo.cenario}/${grupo.rota}: CLS p75 >0,10`);
      exigir(dentro(m.maiorLongTask.p75, 75), `${grupo.cenario}/${grupo.rota}: long task p75 >75 ms`);
    }
  }
  for (const grupo of sumario.trocas) {
    if (/reduced/.test(grupo.cenario)) continue;
    const m = grupo.metricas;
    exigir(dentro(m.ack.p95, 50), `${grupo.browser}/${grupo.cenario}/${grupo.modo}: ack p95 >50 ms`);
    exigir(dentro(m.jsNovo.p95, 45 * 1024), `${grupo.browser}/${grupo.cenario}/${grupo.modo}: JS novo >45 KB`);
    exigir(dentro(m.rscComprimido.p95, 40 * 1024), `${grupo.browser}/${grupo.cenario}/${grupo.modo}: RSC >40 KB`);
    exigir(
      dentro(m.cls.p95, grupo.modo === "frio" ? 0.049 : 0.019),
      `${grupo.browser}/${grupo.cenario}/${grupo.modo}: CLS da troca`,
    );
    if (grupo.modo === "preparado" || grupo.modo === "visitado") {
      exigir(
        dentro(m.ready.p75, 100) && dentro(m.ready.p95, 200),
        `${grupo.browser}/${grupo.cenario}/${grupo.modo}: ready fora de 100/200 ms`,
      );
      exigir(minimo(m.fps.p50, 55), `${grupo.browser}/${grupo.cenario}/${grupo.modo}: FPS p50 <55`);
    } else {
      exigir(dentro(m.ready.p95, 600), `${grupo.browser}/${grupo.cenario}/frio: ready p95 >600 ms`);
      exigir(minimo(m.fps.p50, 50), `${grupo.browser}/${grupo.cenario}/frio: FPS p50 <50`);
    }
  }
  return falhas;
}

const cargas = [];
const trocas = [];
const politicas = [];
const browsers = [];

for (const browserNome of browsersSelecionados) {
  const tipo = TIPOS_BROWSER[browserNome];
  const opcoes = browserNome === "chromium" && process.env.PLAYWRIGHT_CHROMIUM
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM }
    : {};
  const navegador = await tipo.launch(opcoes);
  browsers.push({ nome: browserNome, versao: navegador.version() });
  try {
    politicas.push(await validarSaveData(navegador, browserNome));
    for (const cenarioId of cenariosSelecionados) {
      for (let repeticao = 0; repeticao < REPETICOES; repeticao += 1) {
        for (const foco of focosSelecionados) {
          process.stdout.write(
            `\r${browserNome} · ${cenarioId} · ${foco} · ${repeticao + 1}/${REPETICOES}   `,
          );
          cargas.push(await medirCarga(navegador, browserNome, cenarioId, foco));
        }
        trocas.push(...await medirTrocas(navegador, browserNome, cenarioId, repeticao));
      }
    }
  } finally {
    await navegador.close();
  }
}
process.stdout.write("\n");

const sumario = {
  cargas: resumir(cargas, ["browser", "cenario", "foco", "rota"], CAMPOS_CARGA),
  trocas: resumir(trocas, ["browser", "cenario", "modo", "foco", "entrada"], CAMPOS_TROCA),
};
const falhasBudget = verificarBudgets(sumario);
const resultado = {
  schemaVersion: 2,
  protocolo: "homepage-performance-2026-08",
  metadata: {
    data: new Date().toISOString(),
    baseUrl: BASE,
    appVersion: versao,
    commit,
    dirty,
    buildId,
    browsers,
    repeticoes: REPETICOES,
    cenarios: cenariosSelecionados,
    focos: focosSelecionados,
    smoke: SMOKE,
  },
  politicas,
  sumario,
  amostras: { cargas, trocas },
  gate: { passou: falhasBudget.length === 0, falhas: falhasBudget },
};

console.log("\n═══ CARGA FRIA (p50 / p75 / p95) ═══");
for (const grupo of sumario.cargas) {
  const fcp = grupo.metricas.fcp;
  const lcp = grupo.metricas.lcp;
  const js = grupo.metricas.jsDescodificado;
  console.log(
    `${grupo.browser.padEnd(9)} ${grupo.cenario.padEnd(18)} ${grupo.rota.padEnd(18)} ` +
    `FCP ${fcp.p50}/${fcp.p75}/${fcp.p95} ms · ` +
    `LCP ${lcp.p50}/${lcp.p75}/${lcp.p95} ms · JS ${Math.round((js.p75 ?? 0) / 1024)} KB`,
  );
}
console.log("\n═══ TROCAS (p50 / p75 / p95) ═══");
for (const grupo of sumario.trocas) {
  const ack = grupo.metricas.ack;
  const ready = grupo.metricas.ready;
  const fps = grupo.metricas.fps;
  console.log(
    `${grupo.browser.padEnd(9)} ${grupo.cenario.padEnd(18)} ${grupo.modo.padEnd(10)} ` +
    `${grupo.entrada.padEnd(8)} ack ${ack.p50}/${ack.p75}/${ack.p95} ms · ` +
    `ready ${ready.p50}/${ready.p75}/${ready.p95} ms · FPS p50 ${fps.p50}`,
  );
}

if (GUARDAR) {
  mkdirSync(dirname(SAIDA), { recursive: true });
  writeFileSync(SAIDA, `${JSON.stringify(resultado, null, 2)}\n`);
  console.log(`\nRelatório guardado em ${SAIDA}`);
}

if (falhasBudget.length) {
  console.error("\nBudgets fora do limite:");
  for (const falha of falhasBudget) console.error(`- ${falha}`);
  if (GATE) process.exitCode = 1;
} else {
  console.log("\nBudgets laboratoriais aprovados.");
}
