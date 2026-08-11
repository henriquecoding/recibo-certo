#!/usr/bin/env node
/**
 * Gerador do índice de pesquisa global.
 * ----------------------------------------------------------------------
 * A fonte de verdade continua a ser TypeScript: `src/lib/busca/documentos.ts`
 * deriva os documentos dos manifestos dos guias, do catálogo de ferramentas
 * e das atividades do Art. 151.º. Este script apenas SERIALIZA essa fonte
 * para um ficheiro estático que o browser possa buscar sem carregar código.
 *
 * PORQUÊ UM JSON E NÃO UM MÓDULO
 *
 * O lançador da pesquisa vive no cabeçalho, ou seja, no bundle inicial de
 * todas as páginas públicas. Enquanto o índice for um módulo importado, ele
 * está no grafo do cliente — mesmo que a função de pesquisa nunca corra
 * (ponto P1-02 da auditoria do cabeçalho: «o comentário diz que só carrega
 * ao abrir; a cadeia de imports diz o contrário»). Um JSON quebra o grafo:
 * não passa pelo parser de JavaScript, é `JSON.parse` puro, fica na CDN com
 * cache própria e só é pedido quando alguém mostra intenção de pesquisar.
 *
 * É o mesmo raciocínio de `gen-novidades.mjs`, e a mesma técnica: o módulo
 * da aplicação é carregado pelo Vite em modo SSR, para não haver uma segunda
 * leitura do catálogo com expressões regulares.
 *
 * Uso:
 *   node scripts/gen-busca-indice.mjs           escreve o ficheiro
 *   node scripts/gen-busca-indice.mjs --check   só verifica; falha se divergir
 *
 * Código de saída: 0 = em dia · 1 = divergente (em `--check`) ou erro.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..");
const PASTA = join(RAIZ, "public", "busca");

const modoCheck = process.argv.includes("--check");

async function carregar() {
  const { createServer } = await import("vite");
  const servidor = await createServer({
    root: RAIZ,
    logLevel: "error",
    server: { middlewareMode: true, watch: null },
    resolve: { alias: { "@": join(RAIZ, "src") } },
  });
  try {
    const docs = await servidor.ssrLoadModule("/src/lib/busca/documentos.ts");
    const esquema = await servidor.ssrLoadModule("/src/lib/busca/esquema.ts");
    return {
      // `construirDocumentos()` corre as invariantes (ids únicos, destinos
      // únicos, títulos não vazios). Se o catálogo estiver inconsistente,
      // este script falha pela mesma razão e com a mesma mensagem do teste.
      documentos: docs.construirDocumentos(),
      versao: esquema.VERSAO_INDICE,
      caminho: esquema.CAMINHO_INDICE,
    };
  } finally {
    await servidor.close();
  }
}

const { documentos, versao, caminho } = await carregar();

// `caminho` é "/busca/indice.v2.json" — o nome do ficheiro vem do esquema
// para não haver dois sítios a decidir a versão do índice.
const destino = join(RAIZ, "public", caminho.replace(/^\//, ""));

const saida = `${JSON.stringify({ versao, documentos })}\n`;

if (modoCheck) {
  const atual = await readFile(destino, "utf8").catch(() => "");
  if (atual !== saida) {
    console.error(
      "[busca] O índice de pesquisa está desatualizado.\n" +
        "        Corre `npm run busca:indice` e inclui o ficheiro gerado no commit.",
    );
    process.exit(1);
  }
  console.log(`[busca] Índice em dia — ${documentos.length} documentos.`);
} else {
  await mkdir(PASTA, { recursive: true });
  await writeFile(destino, saida, "utf8");
  const kb = (Buffer.byteLength(saida) / 1024).toFixed(1);
  const porTipo = documentos.reduce((acc, d) => ({ ...acc, [d.tipo]: (acc[d.tipo] ?? 0) + 1 }), {});
  console.log(
    `[busca] ${caminho} — ${documentos.length} documentos (${kb} KB): ` +
      Object.entries(porTipo)
        .map(([t, n]) => `${n} ${t}`)
        .join(", "),
  );
}
