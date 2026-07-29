#!/usr/bin/env node
/**
 * Gerador das contagens do banco de perguntas do Quiz Fiscal.
 * ----------------------------------------------------------------------
 * `src/lib/quiz-fiscal/quiz-meta.ts` existe para o ecrã de seleção poder
 * mostrar os totais por categoria SEM importar os ~900 KB de bancos. É,
 * portanto, uma cópia — e uma cópia que ninguém conseguia regenerar: o
 * cabeçalho mandava correr `__gen_meta.test.ts`, um ficheiro que não está no
 * repositório. A meta ficou congelada em 1.592 enquanto o banco crescia para
 * 1.614, e o site anunciava um número que já não era verdade.
 *
 * Este script recria essa capacidade como ferramenta de primeira classe, ao
 * lado de `fiscal:check` e `skills:check`.
 *
 * Uso:
 *   node scripts/gen-quiz-meta.mjs            escreve o ficheiro
 *   node scripts/gen-quiz-meta.mjs --check    só verifica; falha se divergir
 *
 * Código de saída: 0 = em dia · 1 = divergente (em `--check`) ou erro.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..");
const DESTINO = join(RAIZ, "src", "lib", "quiz-fiscal", "quiz-meta.ts");

const modoCheck = process.argv.includes("--check");

/**
 * Carrega o banco através do próprio módulo da aplicação, para a contagem ser
 * exatamente a que o jogo vê — incluindo as perguntas geradas em tempo de
 * importação pelos três `gerador-*.ts`. Contar por análise textual dos
 * ficheiros daria um número errado precisamente por causa dessas.
 *
 * O Node não resolve TypeScript com importações sem extensão, por isso
 * usa-se o servidor SSR do Vite — que já é dependência do projeto (via
 * vitest) e aplica as mesmas regras de resolução e o mesmo alias `@/` que a
 * aplicação usa.
 */
async function carregarBanco() {
  const { createServer } = await import("vite");
  const servidor = await createServer({
    root: RAIZ,
    logLevel: "error",
    server: { middlewareMode: true, watch: null },
    resolve: { alias: { "@": join(RAIZ, "src") } },
  });
  try {
    const mod = await servidor.ssrLoadModule("/src/lib/quiz-fiscal/index.ts");
    return await mod.carregarBancoQuiz();
  } finally {
    await servidor.close();
  }
}

function contar(perguntas) {
  /** @type {Record<string, {total:number,facil:number,medio:number,dificil:number}>} */
  const porCategoria = {};
  for (const p of perguntas) {
    const c = (porCategoria[p.categoria] ??= { total: 0, facil: 0, medio: 0, dificil: 0 });
    c.total += 1;
    if (p.dificuldade === 1) c.facil += 1;
    else if (p.dificuldade === 2) c.medio += 1;
    else c.dificil += 1;
  }
  return porCategoria;
}

function renderizar(porCategoria, total) {
  const corpo = Object.entries(porCategoria)
    .map(
      ([cat, c]) =>
        `  ${JSON.stringify(cat)}: {\n` +
        `    "total": ${c.total},\n` +
        `    "facil": ${c.facil},\n` +
        `    "medio": ${c.medio},\n` +
        `    "dificil": ${c.dificil}\n` +
        `  }`,
    )
    .join(",\n");

  return `// GERADO automaticamente por scripts/gen-quiz-meta.mjs — não editar à mão.
// Contagens do banco de perguntas, para o ecrã de seleção poder mostrar os
// totais SEM importar (e descarregar) os ~900 KB de bancos.
//
// Regenerar com:  npm run quiz:meta
// Verificar com:  npm run quiz:meta:check   (corre no CI e falha se divergir)
import type { QuizCategoria } from "./types";

export interface ContagemCategoria { total: number; facil: number; medio: number; dificil: number }

export const ESTATISTICAS_BANCO: Record<QuizCategoria, ContagemCategoria> = {
${corpo}
};

export const TOTAL_PERGUNTAS_META = ${total};
`;
}

async function main() {
  const perguntas = await carregarBanco();
  const porCategoria = contar(perguntas);
  const total = perguntas.length;
  const conteudo = renderizar(porCategoria, total);

  if (modoCheck) {
    const atual = await readFile(DESTINO, "utf8").catch(() => "");
    if (atual.trim() === conteudo.trim()) {
      console.log(`[quiz:meta] Em dia — ${total} perguntas em ${Object.keys(porCategoria).length} categorias.`);
      process.exit(0);
    }
    const totalAtual = (atual.match(/TOTAL_PERGUNTAS_META = (\d+)/) || [])[1];
    console.error(
      "[quiz:meta] As contagens do ecrã de seleção divergem do banco real.\n" +
        `  banco: ${total} perguntas · quiz-meta.ts: ${totalAtual ?? "?"}\n` +
        "  Corrigir com: npm run quiz:meta",
    );
    process.exit(1);
  }

  await writeFile(DESTINO, conteudo, "utf8");
  console.log(`[quiz:meta] Escrito ${DESTINO}\n  ${total} perguntas em ${Object.keys(porCategoria).length} categorias.`);
}

main().catch((erro) => {
  console.error("[quiz:meta] Falha inesperada:", erro);
  process.exit(1);
});
