#!/usr/bin/env node

/*
 * ═══════════════════════════════════════════════════════════════════════
 *  A QUEM PERTENCE A MAIOR LONG TASK — o passo que faltava a §3.4
 *  ---------------------------------------------------------------------
 *  `npm run homepage:atribuicao` (com `npm run build && npm start` a servir).
 *
 *  O benchmark já dizia QUANTO custa a hidratação — `maiorLongTask` e
 *  `tbt`, por rota e por cenário. Não dizia A QUEM. E sem isso a única
 *  correção possível é adivinhar: adiar um componente ao calhas e voltar
 *  a medir.
 *
 *  Este script responde à pergunta com Long Animation Frames, que o
 *  Chromium expõe com atribuição por script, e cruza cada `sourceURL`
 *  com os manifestos de referência cliente do build. O resultado é uma
 *  frase que se pode agir: «163 ms a avaliar o chunk do React», «236 ms
 *  a avaliar o chunk que traz PalcoDescobrir», «347 ms em estilo e
 *  layout depois de o script acabar».
 *
 *  ── O que este script NÃO faz ────────────────────────────────────────
 *
 *  Não é um gate. Não falha o build. Falhar é o trabalho do benchmark,
 *  que tem budgets; isto é o microscópio que se usa quando ele falha.
 *
 *  Não inventa atribuição onde o motor não a dá: Firefox e WebKit não
 *  implementam Long Animation Frames, portanto isto é deliberadamente
 *  só Chromium, e diz-lo em vez de fingir cobertura.
 *
 *  ── Variáveis ───────────────────────────────────────────────────────
 *
 *  BASE_URL     por omissão, http://127.0.0.1:3000
 *  RC_FOCOS     lista separada por vírgulas; por omissão, os cinco
 *  RC_CPU       fator de estrangulamento de CPU; por omissão, 6
 *  RC_MOVEL     "0" mede em desktop 1366×768; por omissão, 390×844
 *  RC_SAIDA     caminho do JSON; por omissão não guarda
 *  RC_EXPERIENCIA  ver abaixo; por omissão, nenhuma
 *
 *  ── As experiências ─────────────────────────────────────────────────
 *
 *  `RC_EXPERIENCIA=sem-content-visibility` e `RC_EXPERIENCIA=sem-corpo`
 *  respondem à pergunta «vale a pena adiar mais conteúdo editorial?».
 *  Injetam uma folha de estilo que, respetivamente, desliga o
 *  `content-visibility` das secções abaixo da dobra e as esconde por
 *  completo. Comparadas com a corrida normal, mostraram que o
 *  `content-visibility` está a poupar ~263 ms de renderização na carga e
 *  que esconder o corpo inteiro não poupa nada — ou seja, o custo que
 *  resta é o herói visível e o piso do framework, não o editorial.
 *
 *  A folha de estilo não altera o build: é uma experiência, não uma
 *  opção de produto.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEXT = join(RAIZ, ".next");
const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const CPU = Number(process.env.RC_CPU ?? 6);
const MOVEL = process.env.RC_MOVEL !== "0";
const SAIDA = process.env.RC_SAIDA ? resolve(process.env.RC_SAIDA) : null;
const EXPERIENCIAS = {
  "sem-content-visibility":
    "[data-homepage-foco] .rc-home-deferred{content-visibility:visible !important}",
  "sem-corpo": "[data-homepage-foco] .rc-home-deferred{display:none !important}",
};
const EXPERIENCIA = process.env.RC_EXPERIENCIA ?? "";
if (EXPERIENCIA && !(EXPERIENCIA in EXPERIENCIAS)) {
  throw new Error(
    `RC_EXPERIENCIA desconhecida «${EXPERIENCIA}». Opções: ${Object.keys(EXPERIENCIAS).join(", ")}.`,
  );
}

const ROTAS = [
  { foco: "descobrir", rota: "/", manifesto: "page_client-reference-manifest.js" },
  { foco: "preco", rota: "/inicio/preco", manifesto: "inicio/preco/page_client-reference-manifest.js" },
  { foco: "recibos", rota: "/inicio/recibos", manifesto: "inicio/recibos/page_client-reference-manifest.js" },
  { foco: "empresa", rota: "/inicio/empresa", manifesto: "inicio/empresa/page_client-reference-manifest.js" },
  { foco: "salario", rota: "/inicio/salario", manifesto: "inicio/salario/page_client-reference-manifest.js" },
];

const focosPedidos = process.env.RC_FOCOS
  ? process.env.RC_FOCOS.split(",").map((item) => item.trim()).filter(Boolean)
  : ROTAS.map((entrada) => entrada.foco);
for (const foco of focosPedidos) {
  if (!ROTAS.some((entrada) => entrada.foco === foco)) {
    throw new Error(`RC_FOCOS: foco desconhecido «${foco}».`);
  }
}
const rotas = ROTAS.filter((entrada) => focosPedidos.includes(entrada.foco));

/**
 * Assinaturas para os chunks que NENHUM manifesto nomeia.
 *
 * O framework, o React e o runtime do bundler não são referências
 * cliente: entram no documento por outra via e o manifesto não os
 * conhece. Sem isto, as maiores avaliações de script do arranque ficavam
 * com o nome do ficheiro e mais nada — que é o mesmo que não ter nome.
 * As assinaturas são strings que só existem nesses pacotes.
 */
const ASSINATURAS = [
  { rotulo: "React (react-dom)", marcas: ["Minified React error", "unstable_scheduleCallback"] },
  { rotulo: "runtime do Turbopack", marcas: ["__turbopack_load__", "chunkListToChunks"] },
  { rotulo: "polyfills", marcas: ["Object.fromEntries", "globalThis.Promise"] },
  { rotulo: "App Router do Next", marcas: ["app-router", "useReducerWithReduxDevtools"] },
];

function lerManifesto(caminho) {
  const contexto = {};
  vm.runInNewContext(readFileSync(caminho, "utf8"), contexto, { filename: caminho });
  const registo = contexto.__RSC_MANIFEST;
  const chaves = registo ? Object.keys(registo) : [];
  if (chaves.length !== 1) {
    throw new Error(`${caminho} devia declarar exatamente um manifesto.`);
  }
  return registo[chaves[0]];
}

/** Nome curto e legível de um módulo cliente. `HeroPreco`, não o caminho. */
const nomeDoModulo = (modulo) => {
  const limpo = modulo.replace(/^\[project\]\//, "");
  if (limpo.startsWith("node_modules/")) return null;
  return limpo.replace(/^src\/(components|lib)\//, "").replace(/\.(tsx|ts|jsx|js)$/, "");
};

/**
 * chunk → o que ele traz.
 *
 * Um chunk do Turbopack junta vários módulos, e o manifesto só lista as
 * FRONTEIRAS cliente. Isto chega para a pergunta que interessa — que
 * ilhas é que este chunk acorda — e é honesto sobre o resto: um chunk
 * sem fronteiras nomeadas cai nas assinaturas, e depois no nome do
 * ficheiro.
 */
function catalogoDeChunks() {
  const catalogo = new Map();
  for (const entrada of ROTAS) {
    let manifesto;
    try {
      manifesto = lerManifesto(join(NEXT, "server", "app", entrada.manifesto));
    } catch {
      continue;
    }
    for (const [modulo, info] of Object.entries(manifesto.clientModules ?? {})) {
      const nome = nomeDoModulo(modulo);
      if (!nome) continue;
      for (const chunk of info.chunks ?? []) {
        const chave = chunk.replace(/^\//, "").replace(/^_next\//, "");
        if (!catalogo.has(chave)) catalogo.set(chave, new Set());
        catalogo.get(chave).add(nome);
      }
    }
  }
  return catalogo;
}

const catalogo = catalogoDeChunks();
const rotuloPorChunk = new Map();

function rotularChunk(caminho) {
  if (rotuloPorChunk.has(caminho)) return rotuloPorChunk.get(caminho);
  const relativo = caminho.replace(/^\/_next\//, "");
  const ilhas = catalogo.get(relativo);
  let rotulo;
  if (ilhas && ilhas.size > 0) {
    const lista = [...ilhas].sort();
    rotulo = lista.length > 3
      ? `${lista.slice(0, 3).join(", ")} +${lista.length - 3}`
      : lista.join(", ");
  } else {
    let fonte = "";
    try {
      fonte = readFileSync(join(NEXT, relativo), "utf8");
    } catch {
      fonte = "";
    }
    const assinatura = ASSINATURAS.find(
      (candidata) => candidata.marcas.filter((marca) => fonte.includes(marca)).length >= 2,
    );
    rotulo = assinatura?.rotulo ?? "não identificado";
  }
  rotuloPorChunk.set(caminho, rotulo);
  return rotulo;
}

const versao = JSON.parse(readFileSync(join(RAIZ, "package.json"), "utf8")).version;
const consentimento = Number(
  readFileSync(join(RAIZ, "src/lib/cookie-consent.ts"), "utf8")
    .match(/export const CONSENT_VERSION = (\d+);/)?.[1] ?? "0",
);

async function medir(navegador, rota) {
  const contexto = await navegador.newContext({
    viewport: MOVEL ? { width: 390, height: 844 } : { width: 1366, height: 768 },
    hasTouch: MOVEL,
    reducedMotion: "no-preference",
    colorScheme: "light",
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
  });
  await contexto.addInitScript(
    ({ appVersion, consent, css }) => {
      try {
        localStorage.setItem("recibocerto:changelog_visto", appVersion);
        localStorage.setItem(
          "recibocerto:cookie-consent",
          JSON.stringify({
            necessarios: true,
            estatistica: false,
            marketing: false,
            versao: consent,
            data: new Date().toISOString(),
          }),
        );
      } catch {}
      window.__rcAtribuicao = { loafs: [], longtasks: [] };
      const observar = (opcoes, guardar) => {
        try {
          new PerformanceObserver((lista) => guardar(lista.getEntries())).observe(opcoes);
        } catch {}
      };
      observar({ type: "long-animation-frame", buffered: true }, (entradas) => {
        window.__rcAtribuicao.loafs.push(...entradas.map((entrada) => entrada.toJSON()));
      });
      observar({ type: "longtask", buffered: true }, (entradas) => {
        window.__rcAtribuicao.longtasks.push(
          ...entradas.map((entrada) => ({ start: entrada.startTime, duration: entrada.duration })),
        );
      });
      if (css) {
        // O `head` ainda não existe quando este script corre; por isso a
        // folha entra assim que houver onde a pôr.
        const aplicar = () => {
          const estilo = document.createElement("style");
          estilo.textContent = css;
          (document.head ?? document.documentElement).append(estilo);
        };
        if (document.head) aplicar();
        else {
          document.addEventListener(
            "readystatechange",
            () => { if (document.head) aplicar(); },
            { once: true },
          );
        }
      }
    },
    {
      appVersion: versao,
      consent: consentimento,
      css: EXPERIENCIA ? EXPERIENCIAS[EXPERIENCIA] : null,
    },
  );

  const pagina = await contexto.newPage();
  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  try {
    const resposta = await pagina.goto(`${BASE}${rota.rota}`, {
      waitUntil: "load",
      timeout: 60_000,
    });
    if (!resposta || resposta.status() !== 200) {
      throw new Error(`${rota.rota} devolveu HTTP ${resposta?.status() ?? "sem resposta"}.`);
    }
    await pagina
      .locator(`main[data-homepage-foco="${rota.foco}"]`)
      .waitFor({ state: "visible", timeout: 20_000 });
    // A janela de 5 s cobre a hidratação e a licença de arranque da cena,
    // que é o que se quer separar: trabalho de montagem e trabalho de cena.
    await pagina.waitForTimeout(5_000);
    // `await` e não `return` cru: o `finally` fecha o contexto assim que a
    // expressão é avaliada, e sem esperar aqui a promessa resolvia contra
    // uma página já morta.
    return await pagina.evaluate(() => window.__rcAtribuicao);
  } finally {
    await contexto.close();
  }
}

const ms = (valor) => `${Math.round(valor)} ms`;

function analisar(dados) {
  const loafs = [...dados.loafs].sort((a, b) => b.duration - a.duration);
  const bloqueio = dados.longtasks.reduce(
    (total, tarefa) => total + Math.max(0, tarefa.duration - 50),
    0,
  );
  const maiorLongTask = dados.longtasks.reduce(
    (maximo, tarefa) => Math.max(maximo, tarefa.duration),
    0,
  );

  // Por chunk, quanto tempo de avaliação/execução se lhe pode imputar.
  const porRotulo = new Map();
  for (const loaf of dados.loafs) {
    for (const script of loaf.scripts ?? []) {
      const origem = script.sourceURL ?? "";
      const rotulo = origem.includes("/_next/static/")
        ? `${rotularChunk(new URL(origem).pathname)}`
        : "documento (bootstrap inline)";
      porRotulo.set(rotulo, (porRotulo.get(rotulo) ?? 0) + (script.duration ?? 0));
    }
  }

  // O que sobra de cada frame depois de o script acabar é estilo, layout e
  // pintura. É a parcela que `content-visibility` e um DOM menor atacam, e
  // a que nenhuma divisão de JavaScript resolve.
  const renderizacao = dados.loafs.reduce((total, loaf) => {
    const script = (loaf.scripts ?? []).reduce((soma, s) => soma + (s.duration ?? 0), 0);
    return total + Math.max(0, loaf.duration - script);
  }, 0);

  return { loafs, bloqueio, maiorLongTask, porRotulo, renderizacao };
}

const navegador = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
);
const relatorio = [];
try {
  console.log(
    `Atribuição de hidratação · chromium ${navegador.version()} · CPU ${CPU}× · ` +
      `${MOVEL ? "390×844" : "1366×768"} · ${BASE}` +
      `${EXPERIENCIA ? ` · experiência: ${EXPERIENCIA}` : ""}\n`,
  );
  for (const rota of rotas) {
    const dados = await medir(navegador, rota);
    const { loafs, bloqueio, maiorLongTask, porRotulo, renderizacao } = analisar(dados);
    console.log(`═══ ${rota.rota} ═══`);
    console.log(
      `  maior long task ${ms(maiorLongTask)} · TBT ${ms(bloqueio)} · ` +
        `${dados.longtasks.length} long tasks · ${dados.loafs.length} frames longas`,
    );

    console.log("  ── tempo de script, por dono ──");
    const donos = [...porRotulo.entries()].sort((a, b) => b[1] - a[1]);
    if (donos.length === 0) console.log("     (o motor não atribuiu nenhum script)");
    for (const [rotulo, duracao] of donos.slice(0, 8)) {
      console.log(`     ${ms(duracao).padStart(8)}  ${rotulo}`);
    }
    console.log(`     ${ms(renderizacao).padStart(8)}  estilo, layout e pintura (sem script)`);

    console.log("  ── as três frames mais longas ──");
    for (const loaf of loafs.slice(0, 3)) {
      const script = (loaf.scripts ?? []).reduce((soma, s) => soma + (s.duration ?? 0), 0);
      console.log(
        `     ${ms(loaf.duration).padStart(8)} em t=${Math.round(loaf.startTime)} ms · ` +
          `bloqueio ${ms(loaf.blockingDuration ?? 0)} · script ${ms(script)} · ` +
          `render ${ms(Math.max(0, loaf.duration - script))}`,
      );
      for (const script2 of (loaf.scripts ?? [])
        .slice()
        .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
        .slice(0, 4)) {
        const origem = script2.sourceURL ?? "";
        const rotulo = origem.includes("/_next/static/")
          ? rotularChunk(new URL(origem).pathname)
          : "documento (bootstrap inline)";
        console.log(
          `        ${ms(script2.duration ?? 0).padStart(8)}  ${String(script2.invokerType).padEnd(15)} ${rotulo}`,
        );
      }
    }
    console.log("");
    relatorio.push({
      rota: rota.rota,
      foco: rota.foco,
      maiorLongTask,
      tbt: bloqueio,
      renderizacao,
      porDono: Object.fromEntries(donos),
      frames: loafs.slice(0, 5).map((loaf) => ({
        inicio: loaf.startTime,
        duracao: loaf.duration,
        bloqueio: loaf.blockingDuration ?? 0,
        scripts: (loaf.scripts ?? []).map((script) => ({
          duracao: script.duration ?? 0,
          invocador: script.invokerType ?? null,
          origem: script.sourceURL ?? null,
          dono: (script.sourceURL ?? "").includes("/_next/static/")
            ? rotularChunk(new URL(script.sourceURL).pathname)
            : "documento (bootstrap inline)",
        })),
      })),
    });
  }
} finally {
  await navegador.close();
}

if (SAIDA) {
  mkdirSync(dirname(SAIDA), { recursive: true });
  writeFileSync(
    SAIDA,
    `${JSON.stringify({ base: BASE, cpu: CPU, movel: MOVEL, versao, rotas: relatorio }, null, 2)}\n`,
  );
  console.log(`Relatório guardado em ${SAIDA}`);
}
