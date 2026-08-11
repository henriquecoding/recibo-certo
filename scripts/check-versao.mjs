#!/usr/bin/env node
/**
 * Uma fonte de versão — RC-DOC-003.
 * ----------------------------------------------------------------------
 * O `package.json` dizia 0.1.0 enquanto a aplicação se anunciava em 2.31.0.
 * Duas versões é o mesmo que nenhuma: um relatório de erro, um cabeçalho de
 * pedido ou um artefacto de build deixam de conseguir dizer que código os
 * produziu.
 *
 * A fonte de verdade é `APP_VERSION`, em `src/lib/version.ts` — é a que a
 * regra 9 do CLAUDE.md manda subir a cada merge para `main`, e a que o popup
 * de Novidades usa para decidir se há algo novo para mostrar. O
 * `package.json` passa a SEGUIR essa, e este guardião garante-o.
 *
 * Verifica por omissão e falha o build se as duas divergirem. Com `--fix`,
 * escreve o `package.json` a partir de `APP_VERSION` — é isso que se corre
 * depois de subir a versão. O build nunca escreve sozinho: um build que
 * modifica ficheiros versionados deixa de ser reproduzível.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION_TS = join(RAIZ, "src", "lib", "version.ts");
const PACKAGE_JSON = join(RAIZ, "package.json");

const corrigir = process.argv.includes("--fix");

// Leitura por padrão em vez de importar o módulo: `version.ts` importa o
// changelog inteiro, e carregá-lo aqui obrigaria a levantar um servidor de
// TypeScript só para ler três números. A forma da linha é fixa e está coberta
// por `assertChangelogIntegrity()`.
const fonte = readFileSync(VERSION_TS, "utf8");
const encontrado = fonte.match(/^export const APP_VERSION = "(\d+\.\d+\.\d+)";$/m);

if (!encontrado) {
  console.error(
    "✗ Não encontrei `export const APP_VERSION = \"x.y.z\";` em src/lib/version.ts.\n" +
      "  Se a linha mudou de forma, atualiza também scripts/check-versao.mjs.",
  );
  process.exit(1);
}

const appVersion = encontrado[1];
const pkgTexto = readFileSync(PACKAGE_JSON, "utf8");
const pkg = JSON.parse(pkgTexto);

if (pkg.version === appVersion) {
  console.log(`✓ Versão única: ${appVersion} (package.json e APP_VERSION).`);
  process.exit(0);
}

if (corrigir) {
  // Substituição pontual em vez de reescrever o JSON: `JSON.stringify` perde
  // a ordem das chaves e a formatação que o npm mantém.
  const novo = pkgTexto.replace(
    /^(\s*"version":\s*)"[^"]*"/m,
    (_m, prefixo) => `${prefixo}"${appVersion}"`,
  );
  if (novo === pkgTexto) {
    console.error('✗ Não consegui localizar a chave "version" no package.json.');
    process.exit(1);
  }
  writeFileSync(PACKAGE_JSON, novo);
  console.log(`✓ package.json alinhado: ${pkg.version} → ${appVersion}.`);
  process.exit(0);
}

console.error(
  `✗ Versões divergentes.\n` +
    `    APP_VERSION (src/lib/version.ts): ${appVersion}\n` +
    `    package.json:                     ${pkg.version}\n\n` +
    `  A fonte de verdade é APP_VERSION. Para alinhar:\n` +
    `    npm run versao:fix\n`,
);
process.exit(1);
