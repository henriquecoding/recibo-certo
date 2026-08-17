// ═══════════════════════════════════════════════════════════════════════
//  O REPOSITÓRIO AINDA DIZ A VERDADE SOBRE A BASE?
//  ---------------------------------------------------------------------
//  Escrito depois de uma auditoria que encontrou a pasta `supabase/` a
//  divergir da realidade em quatro sítios ao mesmo tempo, e nenhum deles
//  dava erro:
//
//   · o ficheiro junto anunciava-se como «todas as migrações da
//     plataforma» e trazia 12 de 28 — o filtro só apanhava nomes numerados;
//   · um teste sem prefixo numérico nunca era corrido pelo arreio, e um
//     teste que ninguém corre parece um teste que passa;
//   · cinco entradas do registo não tinham ficheiro no repositório;
//   · não havia `config.toml`, e portanto nada dizia a que projeto isto
//     pertence.
//
//  A pergunta que importa, e a que este script responde: **existe algum
//  objeto na base que nenhuma migração deste repositório cria?** Se
//  existir, reconstruir a base a partir do repositório dá um esquema
//  diferente do real — e ninguém dá por isso até precisar.
//
//  ── Como correr ─────────────────────────────────────────────────────
//    SUPABASE_DB_URL=postgresql://... node scripts/check-supabase.mjs
//
//  Sem ligação verifica só o que consegue offline (a estrutura da pasta) e
//  DIZ que o resto ficou por verificar. Um visto verde a quem não olhou é
//  pior do que não haver verificação nenhuma.
// ═══════════════════════════════════════════════════════════════════════

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR_MIGRACOES = "supabase/migrations";
const DIR_TESTES = "supabase/tests";
const BUNDLE = "supabase/bundle/plataforma-contabilistas.sql";

const problemas = [];
const avisos = [];
const oks = [];

// ── 1. A estrutura da pasta ────────────────────────────────────────────

for (const [caminho, porque] of [
  ["supabase/config.toml", "a CLI não sabe a que projeto isto pertence"],
  ["supabase/README.md", "ninguém sabe o que é usado nem o que corre quando"],
  [BUNDLE, "não há por onde montar uma base nova"],
]) {
  if (existsSync(caminho)) oks.push(`${caminho} existe`);
  else problemas.push(`Falta ${caminho} — ${porque}.`);
}

const migracoes = readdirSync(DIR_MIGRACOES).filter((f) => f.endsWith(".sql"));

// Os nomes têm de ser ordenáveis por texto, porque é assim que toda a
// gente os aplica — a CLI, o arreio de RLS e o ficheiro junto.
const semPrefixo = migracoes.filter((f) => !/^(\d{3}_|\d{8,14}_)/.test(f));
if (semPrefixo.length > 0) {
  problemas.push(
    `Migrações sem prefixo ordenável: ${semPrefixo.join(", ")}. ` +
      "A ordem de aplicação passa a depender do sistema de ficheiros.",
  );
} else {
  oks.push(`${migracoes.length} migrações, todas com prefixo ordenável`);
}

// Um teste na raiz sem prefixo numérico é um teste que o arreio nunca
// corre — e que por isso parece passar. Se for mesmo manual, vai para
// `tests/manuais/`, onde o nome diz o que é.
const testes = readdirSync(DIR_TESTES).filter((f) => f.endsWith(".sql"));
const testesOrfaos = testes.filter((f) => !/^\d{2}-/.test(f));
if (testesOrfaos.length > 0) {
  problemas.push(
    `Testes na raiz de tests/ que o arreio nunca corre: ${testesOrfaos.join(", ")}. ` +
      "Ou ganham prefixo `NN-`, ou mudam-se para `tests/manuais/`.",
  );
} else {
  oks.push(`${testes.length} testes, todos apanhados pelo arreio`);
}

// ── 2. O ficheiro junto está em dia ────────────────────────────────────

if (existsSync(BUNDLE)) {
  const junto = readFileSync(BUNDLE, "utf8");
  const daPlataforma = migracoes.filter((f) => {
    const n = /^(\d{3})_/.exec(f);
    if (n) return Number(n[1]) >= 42;
    const d = /^(\d{8,14})_/.exec(f);
    return Boolean(d) && d[1] >= "20260814";
  });

  const foraDoJunto = daPlataforma.filter((f) => !junto.includes(f));
  if (foraDoJunto.length > 0) {
    problemas.push(
      `O ficheiro junto não tem ${foraDoJunto.length} migração(ões) da plataforma: ` +
        `${foraDoJunto.slice(0, 5).join(", ")}${foraDoJunto.length > 5 ? "…" : ""}. ` +
        "Corre `npm run migracoes:juntar`.",
    );
  } else {
    oks.push(`o ficheiro junto tem as ${daPlataforma.length} migrações da plataforma`);
  }
}

// ── 3. A base, se houver ligação ───────────────────────────────────────

const url = process.env.SUPABASE_DB_URL?.trim();

if (!url) {
  avisos.push(
    "Sem SUPABASE_DB_URL não se compara com a base. Os objetos que existem " +
      "lá e não têm origem aqui ficaram POR VERIFICAR — não confundas isso " +
      "com não existirem.",
  );
} else {
  // `psql` e não o pacote `pg`, de propósito: o arreio de RLS já depende
  // dos binários do PostgreSQL, e o CI já os tem. Acrescentar uma
  // dependência de npm para fazer uma pergunta que uma linha de `psql`
  // responde era pagar peso por nada.
  const CONSULTA = `
    WITH ext AS (SELECT objid FROM pg_depend WHERE deptype = 'e')
    SELECT c.relname
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r','v')
       AND c.oid NOT IN (SELECT objid FROM ext)
    UNION
    SELECT p.proname
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.oid NOT IN (SELECT objid FROM ext)`;

  let objetos = null;
  try {
    objetos = execFileSync("psql", [url, "-tAc", CONSULTA], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch (e) {
    avisos.push(
      `Não foi possível ler a base com o psql (${String(e.message).split("\n")[0]}). ` +
        "A comparação ficou por fazer.",
    );
  }

  if (objetos) {
    const sql = migracoes
      .map((f) => readFileSync(join(DIR_MIGRACOES, f), "utf8"))
      .join("\n");

    const orfaos = objetos.filter(
      (nome) =>
        // Maiúsculas e minúsculas: metade das migrações antigas está em
        // minúsculas, e um `grep` sensível dava quatro falsos positivos na
        // primeira vez que isto correu.
        !new RegExp(
          `(table|view|function)\\s+(if not exists\\s+)?(public\\.)?${nome}\\b`,
          "i",
        ).test(sql),
    );

    if (orfaos.length > 0) {
      problemas.push(
        `${orfaos.length} objeto(s) existem na base e nenhuma migração os cria: ` +
          `${orfaos.join(", ")}. Reconstruir a base a partir deste repositório ` +
          "daria um esquema diferente do real.",
      );
    } else {
      oks.push(`os ${objetos.length} objetos da base têm origem numa migração`);
    }
  }
}

// ── 4. O relatório ─────────────────────────────────────────────────────

for (const o of oks) console.log(`  ok   · ${o}`);
for (const a of avisos) console.warn(`  aviso· ${a}`);
for (const p of problemas) console.error(`  FALHA· ${p}`);

console.log("");
if (problemas.length > 0) {
  console.error(`A pasta supabase/ tem ${problemas.length} problema(s).`);
  process.exit(1);
}
console.log(
  avisos.length > 0
    ? "Pasta supabase/ sem falhas conhecidas, com verificações por fazer (ver avisos)."
    : "Pasta supabase/ verificada, e o repositório cria tudo o que a base tem.",
);
