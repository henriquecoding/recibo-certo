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

// ── O que entra no ficheiro junto ───────────────────────────────────
//
// A plataforma de contabilistas começou na 042 e continuou, a partir de
// agosto, em migrações com nome por data. O filtro antigo só apanhava as
// numeradas — e o resultado era um ficheiro que se anunciava como «todas
// as migrações da plataforma» e trazia doze de vinte e quatro. Quem o
// colasse ficava com a plataforma até à 053 e sem a conversa segura, sem o
// LinkedIn, sem o contrato público, sem a fidelidade v2, sem a progressão,
// sem os pagamentos, sem a sala e sem a fronteira de contacto.
//
// Passa a apanhar as duas famílias:
//
//   · numeradas de 042 a 099;
//   · datadas a partir de 20260814 — quando a plataforma passou a usar
//     nomes por data.
//
// O corte em 20260814 não é arbitrário: `20260802_documentos_emitidos` e
// `20260813_planos_operacionais` são da aplicação base (documentos e
// faturação), não da plataforma, e dependem de tabelas das migrações
// 001-041 que este ficheiro assume já aplicadas.
const DESDE = 42;
const ATE = 99;
const DATADA_DESDE = "20260814";

function daPlataforma(f) {
  if (!f.endsWith(".sql")) return false;

  const numerada = /^(\d{3})_/.exec(f);
  if (numerada) {
    const n = Number(numerada[1]);
    return n >= DESDE && n <= ATE;
  }

  const datada = /^(\d{8,14})_/.exec(f);
  return Boolean(datada) && datada[1] >= DATADA_DESDE;
}

// A ordenação por texto põe as numeradas primeiro («0» < «2») e as datadas
// por data — que é exatamente a ordem por que têm de correr.
const ficheiros = readdirSync(DIR).filter(daPlataforma).sort();

if (ficheiros.length === 0) {
  console.error("Nenhuma migração no intervalo — o filtro está errado.");
  process.exit(1);
}

const cabecalho = `-- ═══════════════════════════════════════════════════════════════════════
--  PLATAFORMA DE CONTABILISTAS — TODAS AS MIGRAÇÕES, POR ORDEM
--  ---------------------------------------------------------------------
--  Este ficheiro é GERADO. Não o edites: corrige a migração de origem e
--  volta a correr \`npm run migracoes:juntar\`.
--
--  PARA QUE SERVE
--  --------------
--  Estas ${ficheiros.length} migrações dependem umas das outras: a 046 usa tabelas
--  que a 042 cria, a 052 altera tabelas que a 048 e a 051 criam, e a
--  fronteira de contacto desfaz uma coluna que uma migração de agosto tinha
--  acabado de pôr numa RPC. Aplicá-las fora de ordem dá «relation does not
--  exist» no melhor dos casos, e o contacto do cliente de volta no pior.
--
--  Da primeira (${ficheiros[0]})
--  à última  (${ficheiros.at(-1)}).
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
