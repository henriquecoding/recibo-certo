#!/usr/bin/env node
/**
 * PORTÃO: os workflows e o package.json têm de estar de acordo — NOS DOIS SENTIDOS.
 *
 *   ①  Todo o `npm run <x>` dos workflows existe no package.json.
 *   ②  Todo o portão do package.json é alcançável a partir do CI.
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
 * O sentido ② existe porque o sentido ① não chega. Um portão pode estar
 * escrito, testado e a passar, e mesmo assim nunca correr — foi o P1-11 desta
 * auditoria (treze portões órfãos), e voltou a acontecer no mesmo dia: o
 * `nuts:geo:check`, escrito para fechar o P1-8, ficou fora do CI porque
 * ligá-lo era um passo separado de escrevê-lo. Um portão que ninguém corre
 * não é um portão; é um ficheiro.
 *
 * Uso:  node scripts/check-scripts-workflows.mjs
 * Saída: 0 = os dois sentidos de acordo · 1 = pelo menos um falha.
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

// ─────────────────────────────────────────────────────────────────────────
//  ②  O SENTIDO INVERSO: todo o portão é alcançável a partir do CI
// ─────────────────────────────────────────────────────────────────────────
const guioes = JSON.parse(readFileSync(join(RAIZ, "package.json"), "utf8")).scripts ?? {};
const textoWorkflows = readdirSync(PASTA)
  .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
  .map((f) => readFileSync(join(PASTA, f), "utf8"))
  .join("\n");

/**
 * Guiões que a heurística abaixo apanha mas que NÃO são portões: correm um
 * verificador para outro fim (corrigir, apontar a produção). Cada isenção diz
 * porquê — e uma isenção que deixa de ser precisa reprova, para a lista não
 * apodrecer a proteger nada.
 */
const ISENTOS = new Map([
  ["contrato:check:producao", "aponta ao ambiente de produção; o CI usa `contrato:check`"],
  ["versao:fix", "corrige a versão em vez de a verificar"],
  [
    "concelhos:geo:check",
    "faz 306 pedidos ao Nominatim (um por concelho), sem soft-fail quando a " +
      "rede recusa — já devolveu 429 a meio de uma corrida local. Um serviço " +
      "público, limitado por taxa e partilhado por todos os runners do " +
      "GitHub, não pertence a um portão que bloqueia PRs; o mesmo raciocínio " +
      "que mantém `procura:nuts2:check` fora daqui.",
  ],
]);

/** Um guião é um portão se verifica algo e reprova: `--check`, `check-`, `:check`. */
const ehPortao = (nome, cmd) =>
  /(^|:)check($|:)/.test(nome) ||
  nome.endsWith(":check") ||
  /--check\b/.test(cmd) ||
  /\bcheck-[a-z-]+\.mjs/.test(cmd);

/** Corre sempre que o CI faz `npm run build`. */
const viaBuild = (parte) =>
  [guioes.prebuild ?? "", guioes.postbuild ?? ""].some((gancho) =>
    [...parte.matchAll(/scripts\/[A-Za-z0-9._-]+/g)].some((m) => gancho.includes(m[0])),
  );

/** Corre dentro do `npm test` — o conjunto inteiro do vitest. */
const soVitest = (parte) => /^(npx\s+)?vitest run/.test(parte.trim()) && !/scripts\//.test(parte);

/**
 * Um guião composto (`a && b && c`) só está coberto se CADA metade estiver.
 * É o caso que enganava à vista: o `quiz:check` corre no `npm test` a parte
 * dos testes e deixa cair o `gen-quiz-meta.mjs --check`, que é justamente a
 * parte que ninguém mais corre.
 *
 * Um guião pode também ser alcançado por outro que o componha
 * (`motor:check` → `motor:no-hardcodes`), e essa cadeia segue-se até ao fim.
 */
function alcancavel(nome, cmd, visitados = new Set()) {
  if (visitados.has(nome)) return false;
  visitados.add(nome);

  const porNome = new RegExp(`npm run ${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "m")
    .test(textoWorkflows);
  if (porNome) return true;

  // Composto por outro guião que já é alcançável?
  for (const [outro, outroCmd] of Object.entries(guioes)) {
    if (outro === nome) continue;
    if (!new RegExp(`npm run ${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|&|$)`).test(outroCmd)) continue;
    if (alcancavel(outro, outroCmd, visitados)) return true;
  }

  // Todas as metades cobertas por si próprias?
  const partes = cmd.split("&&").map((x) => x.trim()).filter(Boolean);
  return partes.every((parte) => {
    const ficheiros = [...parte.matchAll(/scripts\/[A-Za-z0-9._-]+/g)].map((m) => m[0]);
    if (ficheiros.length > 0 && ficheiros.every((f) => textoWorkflows.includes(f))) return true;
    if (viaBuild(parte)) return true;
    if (soVitest(parte)) return true;
    const chamada = parte.match(/npm run ([A-Za-z0-9:._-]+)/);
    if (chamada && guioes[chamada[1]]) return alcancavel(chamada[1], guioes[chamada[1]], visitados);
    // Outro guião que corre exatamente esta metade e que já é alcançável.
    // É o caso do `avisos:check`, cuja primeira metade é o `avisos:tipos`
    // inteiro — que tem passo próprio no workflow.
    for (const [outro, outroCmd] of Object.entries(guioes)) {
      if (outro === nome) continue;
      if (!outroCmd.split("&&").map((x) => x.trim()).includes(parte)) continue;
      if (alcancavel(outro, outroCmd, new Set(visitados))) return true;
    }
    return false;
  });
}

const orfaos = [];
const isencoesUsadas = new Set();
for (const [nome, cmd] of Object.entries(guioes)) {
  if (!ehPortao(nome, cmd)) continue;
  if (ISENTOS.has(nome)) {
    isencoesUsadas.add(nome);
    continue;
  }
  if (alcancavel(nome, cmd)) continue;
  orfaos.push({ nome, cmd });
}

// Uma isenção que já não é precisa é uma mentira sobre o que este portão
// cobre. Reprova, e diz qual.
const isencoesMortas = [...ISENTOS.keys()].filter((n) => !isencoesUsadas.has(n));
if (isencoesMortas.length > 0) {
  console.error("✗ Isenções que já não protegem nada — retira-as do ISENTOS:\n");
  for (const n of isencoesMortas) {
    console.error(`  ${n}  ${guioes[n] ? "(já não é apanhado como portão)" : "(o guião deixou de existir)"}`);
  }
  console.error("");
  process.exit(1);
}

if (orfaos.length > 0) {
  console.error("✗ Portões que nunca correm — nem no CI, nem pelo build, nem pelo vitest:\n");
  for (const o of orfaos) console.error(`  ${o.nome}\n    ${o.cmd}\n`);
  console.error(
    "Acrescenta um passo num workflow, ou — se for um diagnóstico e não um\n" +
      "portão — declara-o em ISENTOS com a razão, aqui neste ficheiro.",
  );
  process.exit(1);
}

console.log(
  `✓ Workflows e package.json de acordo — ${vistos.size} scripts referidos, todos declarados;\n` +
    `  todos os portões alcançáveis a partir do CI (${ISENTOS.size} isenções, todas em uso).`,
);
