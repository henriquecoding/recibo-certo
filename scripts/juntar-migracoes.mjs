// ═══════════════════════════════════════════════════════════════════════
//  Junta as migrações da plataforma num ficheiro só, pela ordem certa.
//  ---------------------------------------------------------------------
//  As migrações 042 a 052 dependem umas das outras. Aplicá-las fora de
//  ordem dá «relation does not exist» — e o editor de SQL do Supabase não
//  tem por onde saber qual é a ordem.
//
//  Correr: npm run migracoes:juntar
//  Verificar que está em dia: npm run migracoes:juntar -- --check
// ═══════════════════════════════════════════════════════════════════════

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";
const SAIDA = "supabase/bundle/plataforma-contabilistas.sql";
const DESDE = 42;

const ficheiros = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql") && Number(f.slice(0, 3)) >= DESDE)
  .sort();

const cabecalho = `-- ═══════════════════════════════════════════════════════════════════════
--  PLATAFORMA DE CONTABILISTAS — TODAS AS MIGRAÇÕES, POR ORDEM
--  ---------------------------------------------------------------------
--  Este ficheiro é GERADO. Não o edites: corrige a migração de origem e
--  volta a correr \`npm run migracoes:juntar\`.
--
--  PARA QUE SERVE
--  --------------
--  As migrações ${ficheiros[0].slice(0, 3)} a ${ficheiros.at(-1).slice(0, 3)} dependem umas das outras: a 046 usa tabelas que
--  a 042 cria, a 052 altera tabelas que a 048 e a 051 criam. Aplicá-las
--  fora de ordem dá exatamente o erro que dá — «relation does not exist».
--
--  Este ficheiro tem-nas todas, pela ordem certa, num só bloco. Cola no
--  editor de SQL do Supabase e corre uma vez.
--
--  ANTES DE CORRER
--  ---------------
--   · As migrações 001 a ${String(Number(ficheiros[0].slice(0, 3)) - 1).padStart(3, "0")} já têm de estar aplicadas. Este bloco
--     assume \`public.profiles\`, \`public.is_admin()\` e
--     \`public.admin_auditoria\`.
--   · É idempotente: correr duas vezes não estraga nada. Se falhar a
--     meio, corrige e volta a correr o ficheiro inteiro.
--   · Corre primeiro num branch do Supabase, e só depois em produção.
--
--  DEPOIS DE CORRER
--  ----------------
--  Configura \`CRON_SECRET\` no Vercel. Sem ele, os três trabalhos
--  periódicos recusam (que é o comportamento certo) — mas os emails de
--  aviso não saem, os anexos órfãos não são varridos e as propostas não
--  expiram.
-- ═══════════════════════════════════════════════════════════════════════

`;

const corpo = ficheiros
  .map((nome) => {
    const barra = "═".repeat(69);
    return `
-- ╔${barra}╗
-- ║  ${nome.padEnd(66)}║
-- ╚${barra}╝

${readFileSync(join(DIR, nome), "utf8").trimEnd()}
`;
  })
  .join("");

const saida = cabecalho + corpo;

if (process.argv.includes("--check")) {
  let atual = "";
  try { atual = readFileSync(SAIDA, "utf8"); } catch { /* ainda não existe */ }
  if (atual !== saida) {
    console.error(
      `\n${SAIDA} está desatualizado.\n` +
      "Uma migração nova foi acrescentada e o ficheiro junto não a tem —\n" +
      "quem o colar no Supabase fica com metade do esquema.\n" +
      "Corre: npm run migracoes:juntar\n",
    );
    process.exit(1);
  }
  console.log(`ok · ${ficheiros.length} migrações, ficheiro junto em dia`);
  process.exit(0);
}

mkdirSync("supabase/bundle", { recursive: true });
writeFileSync(SAIDA, saida);
console.log(`· ${SAIDA} — ${ficheiros.length} migrações, ${saida.split("\n").length} linhas`);
