#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
//  O PORTÃO DOS AVISOS — três listas que têm de dizer o mesmo
//  ---------------------------------------------------------------------
//  Correr:  npm run avisos:check
//
//  ── O defeito que este ficheiro existe para não voltar ──────────────
//
//  A lista de tipos aceites por `notificacoes.tipo` foi reescrita à mão
//  quatro vezes (044, 20260816160000, 20260817120000, 20260819100000).
//  De cada vez foi copiada da versão anterior — nunca de quem escreve
//  avisos. Quatro tipos que a produção escreve ficaram de fora:
//
//      proposta · caso · pagamento_recebido · patamar_desbloqueado
//
//  E não ficou um sino calado. `avisar_utilizador` corre DENTRO da
//  transação que escreve o facto (é a garantia da migração 047), por isso
//  a recusa do aviso desfazia o facto: a proposta não se enviava, o
//  pagamento da Stripe não liquidava, o patamar comprado não se aplicava,
//  e o cron diário dos casos morria na primeira linha.
//
//  Nada disto dava erro em lado nenhum que alguém estivesse a ver: o
//  build passava, os testes passavam, e o arreio de RLS não aplica as
//  quatro migrações onde os tipos nascem.
//
//  ── O que este portão compara ──────────────────────────────────────
//
//    A. os tipos que as MIGRAÇÕES escrevem
//       (2.º argumento de `avisar_utilizador`/`avisar_utilizador_uma_vez`,
//        3.º de `avisar_parte`, e o `tipo` de um INSERT direto);
//    B. a lista AUTORITATIVA — `tipos_de_notificacao()` na migração mais
//       recente que a define;
//    C. a lista do TypeScript — `TIPOS_NOTIFICACAO` no catálogo.
//
//  Mais duas, do mesmo tamanho e pelo mesmo motivo:
//    D. `tipos_de_notificacao_com_email()` vs `TIPOS_NOTIFICACAO_COM_EMAIL`;
//    E. quem merece email é subconjunto de quem existe.
//
//  ── O que ele NÃO faz ──────────────────────────────────────────────
//
//  Não corre SQL. É análise de texto sobre os ficheiros do repositório, de
//  propósito: tem de reprovar num PR, sem base de dados nenhuma. A prova
//  contra PostgreSQL a sério está em
//  `supabase/tests/completo/03-tipos-de-notificacao.sql`, que corre no
//  workflow `rls-check.yml`. São as duas metades da mesma garantia — esta
//  apanha a intenção no diff, aquela apanha o comportamento.
// ═══════════════════════════════════════════════════════════════════════

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** Todos os `.ts`/`.tsx` debaixo de uma pasta, em profundidade. */
function ficheirosDe(raiz) {
  const encontrados = [];
  const andar = (dir) => {
    for (const entrada of readdirSync(dir)) {
      const caminho = join(dir, entrada);
      if (statSync(caminho).isDirectory()) andar(caminho);
      else if (/\.tsx?$/.test(entrada)) encontrados.push(caminho);
    }
  };
  andar(raiz);
  return encontrados;
}

const DIR_MIGRACOES = "supabase/migrations";
const CATALOGO_TS = "src/lib/notificacoes/catalogo.ts";

/** As portas por onde um aviso é escrito, e em que argumento vai o tipo. */
const PORTAS = [
  { nome: "avisar_utilizador", indiceDoTipo: 1 },
  { nome: "avisar_utilizador_uma_vez", indiceDoTipo: 1 },
  { nome: "avisar_parte", indiceDoTipo: 2 },
];

const problemas = [];
const avisos = [];

// ── Ler os ficheiros ────────────────────────────────────────────────

const migracoes = readdirSync(DIR_MIGRACOES)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => ({ nome: f, fonte: readFileSync(join(DIR_MIGRACOES, f), "utf8") }));

if (migracoes.length === 0) {
  console.error("Nenhuma migração encontrada — o filtro está errado.");
  process.exit(2);
}

// ── B. A lista autoritativa ─────────────────────────────────────────

/**
 * Lê o corpo da definição MAIS RECENTE de uma função que devolve um
 * `text[]` literal, e extrai as strings.
 *
 * A busca é pela última migração que a define porque é essa que fica de
 * pé: `CREATE OR REPLACE` aplicado por ordem de nome deixa a última a
 * ganhar, e é essa a lista que a base de dados tem.
 */
function listaDaFuncao(nomeFuncao) {
  for (let i = migracoes.length - 1; i >= 0; i -= 1) {
    const { nome, fonte } = migracoes[i];
    const inicio = fonte.indexOf(`FUNCTION public.${nomeFuncao}()`);
    if (inicio === -1) continue;

    // O corpo vai do `$$` (ou `$func$`) de abertura ao de fecho.
    const abertura = /\$([a-z_]*)\$/.exec(fonte.slice(inicio));
    if (!abertura) continue;
    const marca = abertura[0];
    const depois = inicio + abertura.index + marca.length;
    const fim = fonte.indexOf(marca, depois);
    if (fim === -1) continue;

    const corpo = fonte.slice(depois, fim);
    const tipos = [...corpo.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
    return { migracao: nome, tipos };
  }
  return null;
}

const autoritativa = listaDaFuncao("tipos_de_notificacao");
const comEmailSql = listaDaFuncao("tipos_de_notificacao_com_email");

if (!autoritativa) {
  console.error(
    "Não encontrei `tipos_de_notificacao()` em migração nenhuma.\n" +
      "É ela a lista autoritativa — sem ela não há nada com que comparar.",
  );
  process.exit(2);
}
if (!comEmailSql) {
  console.error("Não encontrei `tipos_de_notificacao_com_email()` em migração nenhuma.");
  process.exit(2);
}

const declarados = new Set(autoritativa.tipos);
const declaradosComEmail = new Set(comEmailSql.tipos);

// ── A. Os tipos que as migrações escrevem ───────────────────────────

/**
 * Reparte uma lista de argumentos SQL em argumentos, respeitando parêntesis
 * aninhados e plicas (incluindo `''` como plica escapada).
 *
 * Escrito à mão e não por regex porque um argumento pode ser uma chamada
 * com vírgulas lá dentro — `coalesce(a, b)` é UM argumento — e porque um
 * título pode ter uma vírgula no texto.
 */
function repartirArgumentos(texto) {
  const args = [];
  let atual = "";
  let profundidade = 0;
  let emPlicas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (emPlicas) {
      atual += c;
      if (c === "'") {
        if (texto[i + 1] === "'") {
          atual += texto[i + 1];
          i += 1;
        } else {
          emPlicas = false;
        }
      }
      continue;
    }
    if (c === "'") {
      emPlicas = true;
      atual += c;
      continue;
    }
    if (c === "(") profundidade += 1;
    if (c === ")") profundidade -= 1;
    if (c === "," && profundidade === 0) {
      args.push(atual.trim());
      atual = "";
      continue;
    }
    atual += c;
  }
  args.push(atual.trim());
  return args;
}

/** O conteúdo entre o parêntesis que abre em `de` e o que lhe corresponde. */
function argumentosDaChamada(fonte, de) {
  let profundidade = 0;
  let emPlicas = false;
  for (let i = de; i < fonte.length; i += 1) {
    const c = fonte[i];
    if (emPlicas) {
      if (c === "'") {
        if (fonte[i + 1] === "'") i += 1;
        else emPlicas = false;
      }
      continue;
    }
    if (c === "'") { emPlicas = true; continue; }
    if (c === "(") profundidade += 1;
    if (c === ")") {
      profundidade -= 1;
      if (profundidade === 0) return fonte.slice(de + 1, i);
    }
  }
  return null;
}

const escritos = new Map(); // tipo → [migrações]
const dinamicos = []; // chamadas cujo tipo não é literal

for (const { nome, fonte } of migracoes) {
  for (const porta of PORTAS) {
    // Só CHAMADAS. A própria definição da função tem o nome seguido de
    // `(` e uma lista de parâmetros — apanhá-la dava um falso «dinâmico».
    const padrao = new RegExp(`(?<!FUNCTION\\s)(?<!FUNCTION\\s{1,20})public\\.${porta.nome}\\s*\\(`, "g");
    let m;
    while ((m = padrao.exec(fonte)) !== null) {
      const antes = fonte.slice(Math.max(0, m.index - 120), m.index);
      // `REVOKE`/`GRANT`/`COMMENT`/`CREATE FUNCTION` nomeiam a função sem
      // a chamar, e a assinatura que trazem não é uma lista de argumentos.
      if (/(?:FUNCTION|GRANT|REVOKE|COMMENT ON)\s*$/i.test(antes.replace(/\s+/g, " "))) continue;
      if (/\b(?:REVOKE|GRANT|COMMENT ON FUNCTION|CREATE OR REPLACE FUNCTION|CREATE FUNCTION)\b[^;]*$/i.test(antes)) continue;

      const dentro = argumentosDaChamada(fonte, padrao.lastIndex - 1);
      if (dentro === null) continue;
      const args = repartirArgumentos(dentro);
      const bruto = args[porta.indiceDoTipo] ?? "";
      const literal = /^'([a-z0-9_]+)'$/.exec(bruto.trim());

      if (!literal) {
        dinamicos.push(`${nome}: ${porta.nome}(…) com tipo não literal → ${bruto || "(vazio)"}`);
        continue;
      }
      const tipo = literal[1];
      if (!escritos.has(tipo)) escritos.set(tipo, []);
      if (!escritos.get(tipo).includes(nome)) escritos.get(tipo).push(nome);
    }
  }

  // Um INSERT direto na tabela salta as portas — e é exatamente assim que
  // um tipo novo entra em produção sem passar por lado nenhum.
  const padraoInsert = /INSERT\s+INTO\s+public\.notificacoes\s*\(([^)]*)\)\s*VALUES\s*\(/gi;
  let mi;
  while ((mi = padraoInsert.exec(fonte)) !== null) {
    const colunas = mi[1].split(",").map((c) => c.trim().toLowerCase());
    const iTipo = colunas.indexOf("tipo");
    if (iTipo === -1) continue;
    const dentro = argumentosDaChamada(fonte, padraoInsert.lastIndex - 1);
    if (dentro === null) continue;
    const bruto = (repartirArgumentos(dentro)[iTipo] ?? "").trim();
    const literal = /^'([a-z0-9_]+)'$/.exec(bruto);
    if (!literal) continue; // `p_tipo` vindo de `avisar_utilizador` — já contado.
    const tipo = literal[1];
    if (!escritos.has(tipo)) escritos.set(tipo, []);
    if (!escritos.get(tipo).includes(nome)) escritos.get(tipo).push(nome);
  }
}

// ── A. (continuação) o que o SERVIDOR TypeScript escreve ────────────
//
// O Guardião Fiscal chama `avisar_utilizador_uma_vez` por RPC a partir de
// uma rota. Um tipo escrito por aí não aparece em migração nenhuma, e sem
// isto passava ao lado do portão — que é exatamente o buraco que fecha.
for (const ficheiro of ficheirosDe("src/app/api")) {
  const fonte = readFileSync(ficheiro, "utf8");
  if (!fonte.includes("avisar_utilizador")) continue;
  for (const m of fonte.matchAll(/p_tipo\s*:\s*"([a-z0-9_]+)"/g)) {
    const tipo = m[1];
    if (!escritos.has(tipo)) escritos.set(tipo, []);
    if (!escritos.get(tipo).includes(ficheiro)) escritos.get(tipo).push(ficheiro);
  }
}

for (const [tipo, onde] of escritos) {
  if (!declarados.has(tipo)) {
    problemas.push(
      `A produção escreve «${tipo}» e a tabela recusa-o.\n` +
        `    escrito em: ${onde.join(", ")}\n` +
        `    A transação que escreve o facto é a mesma que escreve o aviso:\n` +
        `    a recusa desfaz o facto. Acrescenta o tipo a tipos_de_notificacao().`,
    );
  }
}

// Um tipo declarado que ninguém escreve não é um erro — pode estar a ser
// preparado — mas é ruído que vale a pena ver.
for (const tipo of declarados) {
  if (!escritos.has(tipo)) {
    avisos.push(`«${tipo}» está declarado e nenhuma migração o escreve.`);
  }
}

for (const d of dinamicos) avisos.push(d);

// ── C. O TypeScript ─────────────────────────────────────────────────

const catalogo = readFileSync(CATALOGO_TS, "utf8");

function listaDoTs(nomeConst) {
  const inicio = catalogo.indexOf(`export const ${nomeConst} = [`);
  if (inicio === -1) return null;
  const fim = catalogo.indexOf("]", inicio);
  if (fim === -1) return null;
  return [...catalogo.slice(inicio, fim).matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
}

const tsTipos = listaDoTs("TIPOS_NOTIFICACAO");
const tsComEmail = listaDoTs("TIPOS_NOTIFICACAO_COM_EMAIL");

if (!tsTipos || !tsComEmail) {
  console.error(
    `Não consegui ler TIPOS_NOTIFICACAO / TIPOS_NOTIFICACAO_COM_EMAIL de ${CATALOGO_TS}.`,
  );
  process.exit(2);
}

function compararConjuntos(a, b, rotuloA, rotuloB) {
  const soA = [...a].filter((x) => !b.has(x));
  const soB = [...b].filter((x) => !a.has(x));
  const linhas = [];
  if (soA.length) linhas.push(`    só em ${rotuloA}: ${soA.join(", ")}`);
  if (soB.length) linhas.push(`    só em ${rotuloB}: ${soB.join(", ")}`);
  return linhas;
}

const difTipos = compararConjuntos(
  declarados, new Set(tsTipos),
  `tipos_de_notificacao() (${autoritativa.migracao})`, CATALOGO_TS,
);
if (difTipos.length) {
  problemas.push(
    "A lista de tipos do SQL e a do TypeScript não são a mesma.\n" + difTipos.join("\n"),
  );
}

const difEmail = compararConjuntos(
  declaradosComEmail, new Set(tsComEmail),
  `tipos_de_notificacao_com_email() (${comEmailSql.migracao})`, CATALOGO_TS,
);
if (difEmail.length) {
  problemas.push(
    "A lista de tipos com email do SQL e a do TypeScript não são a mesma.\n" + difEmail.join("\n"),
  );
}

// ── E. Quem merece email tem de existir ─────────────────────────────

for (const tipo of declaradosComEmail) {
  if (!declarados.has(tipo)) {
    problemas.push(
      `«${tipo}» merece email e não é um tipo de aviso válido.\n` +
        `    O gatilho marcaria a fila como «por_enviar» para uma linha que a\n` +
        `    tabela nunca aceita: um email que nunca sai e um facto que se desfaz.`,
    );
  }
}

// ── O catálogo do TypeScript descreve todos ─────────────────────────
//
// O `Record<TipoNotificacao, …>` já obriga a isto em tempo de compilação.
// Está aqui porque este script corre sozinho, sem `tsc`, e porque a
// mensagem que ele dá diz o que fazer.
const descritos = new Set(
  [...catalogo.matchAll(/^\s{2}([a-z0-9_]+):\s*\{\s*icone:/gm)].map((m) => m[1]),
);
for (const tipo of tsTipos) {
  if (!descritos.has(tipo)) {
    problemas.push(
      `«${tipo}» não tem entrada em CATALOGO_NOTIFICACOES.\n` +
        `    Sem ela o aviso aparece sem ícone e sem assunto.`,
    );
  }
}

// ── Relatório ───────────────────────────────────────────────────────

console.log(`Avisos — portão de tipos`);
console.log(`  lista autoritativa: ${autoritativa.migracao}`);
console.log(`  tipos declarados:   ${declarados.size}`);
console.log(`  tipos escritos:     ${escritos.size}`);
console.log(`  com email:          ${declaradosComEmail.size}`);

if (avisos.length) {
  console.log("");
  for (const a of avisos) console.log(`  nota · ${a}`);
}

if (problemas.length) {
  console.error("");
  for (const p of problemas) console.error(`  FALHA · ${p}`);
  console.error(`\n${problemas.length} problema(s). Ver o cabeçalho de ${import.meta.filename ?? "scripts/check-notificacoes.mjs"}.`);
  process.exit(1);
}

console.log("\nOK — as três listas dizem o mesmo.");
