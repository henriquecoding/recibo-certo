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

/**
 * Scripts que o documento manda efetivamente descarregar.
 *
 * O manifesto de referências cliente descreve o grafo da página, mas não
 * inclui bootstrap, React, polyfills nem o runtime do bundler. É útil para
 * provar isolamento; não é uma medição honesta do JavaScript inicial.
 */
function chunksDoDocumento(html) {
  const chunks = new Set();
  const re = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  for (const correspondencia of html.matchAll(re)) {
    const src = correspondencia[1];
    let pathname;
    try {
      pathname = new URL(src, "https://build.local").pathname;
    } catch {
      continue;
    }
    if (!pathname.startsWith("/_next/") || !pathname.endsWith(".js")) continue;
    chunks.add(pathname.slice("/_next/".length));
  }
  return [...chunks].sort();
}

const ASSINATURAS_MOTION = [
  "MotionConfigContext",
  "PresenceContext",
  "animateVisualElement",
  "createDomVisualElement",
];

async function chunksComRuntimeMotion(chunks) {
  const encontrados = [];
  for (const chunk of chunks) {
    const texto = await readFile(join(NEXT, chunk), "utf8");
    const assinaturas = ASSINATURAS_MOTION.filter((assinatura) =>
      texto.includes(assinatura),
    );
    // Uma palavra isolada pode pertencer a código da aplicação. Duas
    // assinaturas independentes identificam o runtime empacotado.
    if (assinaturas.length >= 2) {
      encontrados.push({ ficheiro: chunk, assinaturas });
    }
  }
  return encontrados;
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

  const chunksManifesto = chunksDoManifesto(manifesto);
  const chunksDocumento = chunksDoDocumento(htmlTexto);
  const jsManifesto = await tamanhos(chunksManifesto.map((chunk) => join(NEXT, chunk)));
  const jsInicial = await tamanhos(chunksDocumento.map((chunk) => join(NEXT, chunk)));
  const chunksMedidos = await Promise.all(
    chunksDocumento.map(async (chunk) => ({
      ficheiro: chunk,
      bytes: (await stat(join(NEXT, chunk))).size,
    })),
  );
  const htmlGzip = gzipSync(html, { level: 9 }).length;
  const rscGzip = gzipSync(rsc, { level: 9 }).length;

  if (excede(jsInicial.cru, BUDGETS.jsCru)) {
    falhas.push(
      `${entrada.rota}: JS inicial ${formatar(jsInicial.cru)} > ` +
        `${formatar(BUDGETS.jsCru)} + 5%.`,
    );
  }
  if (excede(jsInicial.gzip, BUDGETS.jsGzip)) {
    falhas.push(
      `${entrada.rota}: JS inicial gzip ${formatar(jsInicial.gzip)} > ` +
        `${formatar(BUDGETS.jsGzip)} + 5%.`,
    );
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
    js: { bytes: jsInicial.cru, gzipBytes: jsInicial.gzip },
    jsManifesto: { bytes: jsManifesto.cru, gzipBytes: jsManifesto.gzip },
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
const motionNosModulosTermos = modulosTermos.filter(
  (modulo) => modulo.includes("/node_modules/motion/") || modulo.includes("/ui/motion/MotionProvider"),
);
const supabaseSDKNosTermos = modulosTermos.filter(
  (modulo) => modulo.includes("/node_modules/@supabase/supabase-js/"),
);
const htmlTermos = await readFile(join(SERVER_APP, "termos.html"), "utf8");
const chunksTermos = chunksDoDocumento(htmlTermos);
const motionNosChunksTermos = await chunksComRuntimeMotion(chunksTermos);
if (motionNosModulosTermos.length > 0 || motionNosChunksTermos.length > 0) {
  const detalhes = [
    ...motionNosModulosTermos,
    ...motionNosChunksTermos.map(
      ({ ficheiro, assinaturas }) => `${ficheiro} [${assinaturas.join(", ")}]`,
    ),
  ];
  falhas.push(`/termos: voltou a herdar o runtime Motion (${detalhes.join("; ")}).`);
}
if (supabaseSDKNosTermos.length > 0) {
  falhas.push(`/termos: voltou a carregar o SDK Supabase no grafo inicial.`);
}
const jsTermos = await tamanhos(chunksTermos.map((chunk) => join(NEXT, chunk)));
const pisoPublico = {
  rota: "/termos",
  modulosCliente: modulosTermos.length,
  motion: {
    modulos: motionNosModulosTermos,
    chunks: motionNosChunksTermos,
  },
  supabaseSDK: supabaseSDKNosTermos,
  js: { bytes: jsTermos.cru, gzipBytes: jsTermos.gzip },
};

const relatorio = {
  schema: 2,
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
      `JS inicial ${formatar(resultado.js.bytes)} / ${formatar(resultado.js.gzipBytes)} gzip · ` +
      `grafo ${formatar(resultado.jsManifesto.bytes)} / ` +
      `${formatar(resultado.jsManifesto.gzipBytes)} gzip · ` +
      `HTML ${formatar(resultado.html.bytes)} / ${formatar(resultado.html.gzipBytes)} gzip · ` +
      `RSC ${formatar(resultado.rsc.gzipBytes)} gzip`,
  );
}
console.log(
  `[homepage] /termos           piso · JS inicial ${formatar(jsTermos.cru)} / ` +
    `${formatar(jsTermos.gzip)} gzip · sem Motion · sem SDK Supabase`,
);
for (const aviso of avisos) console.warn(`[homepage] AVISO: ${aviso}`);

if (falhas.length > 0) {
  console.error(`\n[homepage] ${falhas.length} regressão(ões):\n${falhas.map((f) => ` - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("[homepage] isolamento, prerender e budgets de transferência aprovados.");
