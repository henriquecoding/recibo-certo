#!/usr/bin/env node
/**
 * PORTÃO: todo o `npm run <x>` dos workflows tem de existir no package.json.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO EXISTE                                                   │
 * │                                                                     │
 * │ `zona:e2e` foi acrescentado ao package.json em 2.157.0, com o        │
 * │ guião e o passo no workflow. Em 2.157.1 uma resolução de conflito    │
 * │ levou a linha do package.json à frente — só a linha, porque a        │
 * │ vírgula final mudava no mesmo sítio. O guião ficou, o passo do       │
 * │ workflow ficou, e o CI passou a morrer em «Missing script».          │
 * │                                                                     │
 * │ O custo real não foi o passo que falhou: foi o que vinha DEPOIS      │
 * │ dele. A matriz visual — vinte capturas comparadas píxel a píxel —    │
 * │ ficou `skipped` em todas as corridas seguintes. Um passo que morre   │
 * │ cedo apaga tudo o que vem atrás, e ninguém repara porque o job já    │
 * │ estava vermelho por outra razão.                                     │
 * │                                                                     │
 * │ Isto corre em segundos e é estático: não precisa de rede, de build   │
 * │ nem de browser. Reprova no PR, não na madrugada seguinte.            │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Uso:  node scripts/check-scripts-workflows.mjs
 * Saída: 0 = todos os scripts referidos existem · 1 = pelo menos um falta.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PASTA = join(RAIZ, ".github", "workflows");

const declarados = new Set(
  Object.keys(JSON.parse(readFileSync(join(RAIZ, "package.json"), "utf8")).scripts ?? {}),
);

// `npm run x`, `npm run x -- …`, e a forma com variáveis à frente
// (`BASE_URL=… npm run x`). O nome de um script pode levar `:`, `-`, `.`
// e dígitos; para aqui não interessa mais nada.
const CHAMADA = /\bnpm run ([A-Za-z0-9:._-]+)/g;

const faltam = [];
const vistos = new Set();

for (const ficheiro of readdirSync(PASTA).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))) {
  const texto = readFileSync(join(PASTA, ficheiro), "utf8");
  texto.split("\n").forEach((linha, i) => {
    // Linhas comentadas não executam nada. O `#` tem de vir antes do `npm`,
    // senão um comentário no fim da linha escondia a chamada verdadeira.
    const semComentario = linha.replace(/#.*$/, "");
    for (const m of semComentario.matchAll(CHAMADA)) {
      const nome = m[1];
      vistos.add(nome);
      if (!declarados.has(nome)) {
        faltam.push({ ficheiro, linha: i + 1, nome, texto: linha.trim() });
      }
    }
  });
}

if (faltam.length > 0) {
  console.error("✗ Workflows a chamar scripts que o package.json não declara:\n");
  for (const f of faltam) {
    console.error(`  .github/workflows/${f.ficheiro}:${f.linha}`);
    console.error(`    npm run ${f.nome}`);
    console.error(`    ${f.texto}\n`);
  }
  console.error("Acrescenta o script ao package.json, ou corrige o nome no workflow.");
  process.exit(1);
}

console.log(`✓ Workflows e package.json de acordo — ${vistos.size} scripts referidos, todos declarados.`);
