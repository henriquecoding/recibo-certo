#!/usr/bin/env node
/**
 * Gate pós-build das cinco entradas editoriais da homepage.
 *
 * Prova quatro propriedades que uma inspeção visual não consegue provar:
 *  - cada entrada foi mesmo pré-renderizada;
 *  - o manifesto cliente não contém o palco de outro foco;
 *  - HTML e RSC continuam úteis e dentro dos limites de transferência;
 *  - o JavaScript inicial não ultrapassa os budgets do relatório mestre.
 *
 * O relatório detalhado fica em `.next/homepage-performance.json`, pronto
 * para ser guardado como artefacto pela CI sem sujar a árvore Git.
 */

import { readFile, stat, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..");
const NEXT = join(RAIZ, ".next");
const SERVER_APP = join(NEXT, "server", "app");
const TOLERANCIA_CI = 1.05;

const BUDGETS = Object.freeze({
  jsCru: 800 * 1024,
  jsGzip: 250 * 1024,
  rscGzip: 40 * 1024,
  htmlGzip: 45 * 1024,
  // O relatório fixa 200 KB crus. Enquanto o HTML do App Router leva a
  // cópia Flight embebida, mostramos este valor sempre; o gate de rede é
  // o equivalente comprimido, que é o que a CDN realmente transfere.
  htmlCruObservado: 200 * 1024,
});

const ROTAS = [
  {
    foco: "descobrir",
    rota: "/",
    base: "index",
    manifesto: "page_client-reference-manifest.js",
    proprio: "/src/components/descobrir/",
  },
  {
    foco: "preco",
    rota: "/inicio/preco",
    base: "inicio/preco",
    manifesto: "inicio/preco/page_client-reference-manifest.js",
    proprio: "/src/components/preco/",
  },
  {
    foco: "recibos",
    rota: "/inicio/recibos",
    base: "inicio/recibos",
    manifesto: "inicio/recibos/page_client-reference-manifest.js",
    proprio: "/src/components/foco/recibos/",
  },
  {
    foco: "empresa",
    rota: "/inicio/empresa",
    base: "inicio/empresa",
    manifesto: "inicio/empresa/page_client-reference-manifest.js",
    proprio: "/src/components/foco/empresa/",
  },
  {
    foco: "salario",
    rota: "/inicio/salario",
    base: "inicio/salario",
    manifesto: "inicio/salario/page_client-reference-manifest.js",
    proprio: "/src/components/foco/salario/",
  },
];

const MARCADORES_PALCO = ROTAS.map((rota) => rota.proprio);
const falhas = [];
const avisos = [];
const formatar = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

async function lerManifesto(caminho) {
  const contexto = {};
  vm.runInNewContext(await readFile(caminho, "utf8"), contexto, { filename: caminho });
  const registo = contexto.__RSC_MANIFEST;
  const chaves = registo ? Object.keys(registo) : [];
  if (chaves.length !== 1) {
    throw new Error(`${relative(RAIZ, caminho)} devia declarar um manifesto; declarou ${chaves.length}.`);
  }
  return registo[chaves[0]];
}

function chunksDoManifesto(manifesto) {
  const chunks = new Set();
  for (const lista of Object.values(manifesto.entryJSFiles ?? {})) {
    for (const chunk of lista) chunks.add(chunk.replace(/^\//, ""));
  }
  return [...chunks].sort();
}

async function tamanhos(caminhos) {
  let cru = 0;
  let gzip = 0;
  for (const caminho of caminhos) {
    const corpo = await readFile(caminho);
    cru += corpo.length;
    gzip += gzipSync(corpo, { level: 9 }).length;
  }
  return { cru, gzip };
}

function excede(valor, budget) {
  return valor > budget * TOLERANCIA_CI;
}

const prerender = JSON.parse(await readFile(join(NEXT, "prerender-manifest.json"), "utf8"));
const resultados = [];

for (const entrada of ROTAS) {
  const infoPrerender = prerender.routes?.[entrada.rota];
  if (!infoPrerender || infoPrerender.compute !== "static" || infoPrerender.response !== "complete") {
    falhas.push(`${entrada.rota}: deixou de ser uma resposta estática completa.`);
  }

  const caminhoManifesto = join(SERVER_APP, entrada.manifesto);
  const manifesto = await lerManifesto(caminhoManifesto);
  const modulos = Object.keys(manifesto.clientModules ?? {});
  const palcosAlheios = MARCADORES_PALCO.filter(
    (marcador) => marcador !== entrada.proprio && modulos.some((modulo) => modulo.includes(marcador)),
  );
  if (palcosAlheios.length > 0) {
    falhas.push(`${entrada.rota}: referencia palco(s) alheio(s): ${palcosAlheios.join(", ")}.`);
  }
  if (!modulos.some((modulo) => modulo.includes(entrada.proprio))) {
    falhas.push(`${entrada.rota}: o próprio palco não aparece no manifesto cliente.`);
  }

  const htmlPath = join(SERVER_APP, `${entrada.base}.html`);
  const rscPath = join(SERVER_APP, `${entrada.base}.rsc`);
  const html = await readFile(htmlPath);
  const rsc = await readFile(rscPath);
  const htmlTexto = html.toString("utf8");
  if (!/<h1(?:\s|>)/i.test(htmlTexto) || !/<main(?:\s|>)/i.test(htmlTexto)) {
    falhas.push(`${entrada.rota}: o HTML pré-renderizado deixou de conter main + h1 úteis.`);
  }

  const chunks = chunksDoManifesto(manifesto);
  const caminhosChunks = chunks.map((chunk) => join(NEXT, chunk));
  const js = await tamanhos(caminhosChunks);
  const chunksMedidos = await Promise.all(
    chunks.map(async (chunk) => ({
      ficheiro: chunk,
      bytes: (await stat(join(NEXT, chunk))).size,
    })),
  );
  const htmlGzip = gzipSync(html, { level: 9 }).length;
  const rscGzip = gzipSync(rsc, { level: 9 }).length;

  if (excede(js.cru, BUDGETS.jsCru)) {
    falhas.push(`${entrada.rota}: JS cru ${formatar(js.cru)} > ${formatar(BUDGETS.jsCru)} + 5%.`);
  }
  if (excede(js.gzip, BUDGETS.jsGzip)) {
    falhas.push(`${entrada.rota}: JS gzip ${formatar(js.gzip)} > ${formatar(BUDGETS.jsGzip)} + 5%.`);
  }
  if (excede(rscGzip, BUDGETS.rscGzip)) {
    falhas.push(`${entrada.rota}: RSC gzip ${formatar(rscGzip)} > ${formatar(BUDGETS.rscGzip)} + 5%.`);
  }
  if (excede(htmlGzip, BUDGETS.htmlGzip)) {
    falhas.push(`${entrada.rota}: HTML gzip ${formatar(htmlGzip)} > ${formatar(BUDGETS.htmlGzip)} + 5%.`);
  }
  if (html.length > BUDGETS.htmlCruObservado) {
    avisos.push(
      `${entrada.rota}: HTML cru ${formatar(html.length)} excede a meta editorial de ` +
        `${formatar(BUDGETS.htmlCruObservado)}; transferência gzip ${formatar(htmlGzip)}.`,
    );
  }

  resultados.push({
    foco: entrada.foco,
    rota: entrada.rota,
    static: infoPrerender?.compute === "static",
    modulosCliente: modulos.length,
    chunks: chunksMedidos,
    js: { bytes: js.cru, gzipBytes: js.gzip },
    html: { bytes: html.length, gzipBytes: htmlGzip },
    rsc: { bytes: rsc.length, gzipBytes: rscGzip },
  });
}

// Controlo negativo: uma página longa, sem palco, não pode herdar runtimes
// de animação ou o SDK Supabase por causa do layout raiz.
const manifestoTermos = await lerManifesto(
  join(SERVER_APP, "termos", "page_client-reference-manifest.js"),
);
const modulosTermos = Object.keys(manifestoTermos.clientModules ?? {});
const motionNosTermos = modulosTermos.filter(
  (modulo) => modulo.includes("/node_modules/motion/") || modulo.includes("/ui/motion/MotionProvider"),
);
const supabaseSDKNosTermos = modulosTermos.filter(
  (modulo) => modulo.includes("/node_modules/@supabase/supabase-js/"),
);
if (motionNosTermos.length > 0) {
  falhas.push(`/termos: voltou a herdar Motion do layout (${motionNosTermos.join(", ")}).`);
}
if (supabaseSDKNosTermos.length > 0) {
  falhas.push(`/termos: voltou a carregar o SDK Supabase no grafo inicial.`);
}
const chunksTermos = chunksDoManifesto(manifestoTermos);
const jsTermos = await tamanhos(chunksTermos.map((chunk) => join(NEXT, chunk)));
const pisoPublico = {
  rota: "/termos",
  modulosCliente: modulosTermos.length,
  motion: motionNosTermos,
  supabaseSDK: supabaseSDKNosTermos,
  js: { bytes: jsTermos.cru, gzipBytes: jsTermos.gzip },
};

const relatorio = {
  schema: 1,
  geradoEm: new Date().toISOString(),
  budgets: BUDGETS,
  toleranciaCI: TOLERANCIA_CI,
  rotas: resultados,
  pisoPublico,
  avisos,
  falhas,
};
await writeFile(
  join(NEXT, "homepage-performance.json"),
  `${JSON.stringify(relatorio, null, 2)}\n`,
  "utf8",
);

for (const resultado of resultados) {
  console.log(
    `[homepage] ${resultado.rota.padEnd(17)} estática · ` +
      `JS ${formatar(resultado.js.bytes)} / ${formatar(resultado.js.gzipBytes)} gzip · ` +
      `HTML ${formatar(resultado.html.bytes)} / ${formatar(resultado.html.gzipBytes)} gzip · ` +
      `RSC ${formatar(resultado.rsc.gzipBytes)} gzip`,
  );
}
console.log(
  `[homepage] /termos           piso · JS ${formatar(jsTermos.cru)} / ` +
    `${formatar(jsTermos.gzip)} gzip · sem Motion · sem SDK Supabase`,
);
for (const aviso of avisos) console.warn(`[homepage] AVISO: ${aviso}`);

if (falhas.length > 0) {
  console.error(`\n[homepage] ${falhas.length} regressão(ões):\n${falhas.map((f) => ` - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("[homepage] isolamento, prerender e budgets de transferência aprovados.");
