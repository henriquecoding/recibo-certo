// Escreve os moldes de autenticação da Supabase em ficheiros prontos a
// colar no painel dela (Authentication → Emails). Ver
// `src/lib/email/auth-supabase.ts` para o porquê de viverem no código.
//
//   node scripts/gen-moldes-auth.mjs
//   node scripts/gen-moldes-auth.mjs --check

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require_ = createRequire(import.meta.url);
require_("sucrase/register");
const Module = require_("node:module");
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const resolverOriginal = Module._resolveFilename;
Module._resolveFilename = function (pedido, ...resto) {
  return resolverOriginal.call(this, pedido.startsWith("@/") ? join(RAIZ, "src", pedido.slice(2)) : pedido, ...resto);
};

const { MOLDES_AUTH } = require_(join(RAIZ, "src/lib/email/auth-supabase.ts"));
const SAIDA = join(RAIZ, "docs", "moldes-auth-supabase");
const VERIFICAR = process.argv.includes("--check");

const indice = [
  "# Moldes de autenticação da Supabase",
  "",
  "Gerados por `npm run auth:moldes`. **Não editar à mão** — a fonte é",
  "`src/lib/email/auth-supabase.ts`, que partilha o layout com os restantes",
  "emails do produto.",
  "",
  "Colar em **Authentication → Emails**, no painel da Supabase, um a um.",
  "",
  "| Molde no painel | Assunto | Ficheiro |",
  "|---|---|---|",
  ...MOLDES_AUTH.map((m) => `| ${m.painel} | ${m.assunto} | \`${m.ficheiro}\` |`),
  "",
].join("\n");

mkdirSync(SAIDA, { recursive: true });
const desatualizados = [];
for (const molde of [...MOLDES_AUTH.map((m) => [m.ficheiro, m.html]), ["README.md", indice]]) {
  const [nome, conteudo] = molde;
  const destino = join(SAIDA, nome);
  if (VERIFICAR) {
    if (!existsSync(destino) || readFileSync(destino, "utf8") !== conteudo) desatualizados.push(nome);
  } else {
    writeFileSync(destino, conteudo);
    console.log(`  ${nome}`);
  }
}

if (VERIFICAR && desatualizados.length) {
  console.error("Moldes de autenticação desatualizados. Corre `npm run auth:moldes`:");
  for (const d of desatualizados) console.error(`  · ${d}`);
  process.exit(1);
}
console.log(VERIFICAR ? "Moldes de autenticação em dia." : `\n${MOLDES_AUTH.length} moldes em docs/moldes-auth-supabase/`);
