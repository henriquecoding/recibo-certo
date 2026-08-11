import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
//  A FRONTEIRA DO BUNDLE — verificada, e não prometida em comentário
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE UM TESTE DE IMPORTS, E NÃO UMA CONVENÇÃO (P1-02)              │
//  │                                                                     │
//  │ O componente da pesquisa dizia, em comentário, que o motor e o       │
//  │ índice só chegavam quando a pesquisa abria. Não era verdade: o       │
//  │ cabeçalho importava o painel, o painel importava o motor, o motor    │
//  │ importava o índice e o índice importava `fiscal-data.ts`. Quatro     │
//  │ importações estáticas, nenhuma fronteira dinâmica, e o catálogo      │
//  │ fiscal no bundle inicial de todas as páginas públicas.               │
//  │                                                                     │
//  │ O comentário estava lá havia meses. Nada o contradizia porque nada   │
//  │ o verificava — e uma cadeia de imports não dá erro, só engorda. Este │
//  │ teste percorre o grafo a partir do que o cabeçalho monta e falha se  │
//  │ alguém voltar a ligá-lo ao catálogo.                                 │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

const SRC = join(__dirname, "..", "..");

/** Resolve um import relativo ou com alias `@/` para um ficheiro real. */
function resolver(deQue: string, especificador: string): string | null {
  if (!especificador.startsWith(".") && !especificador.startsWith("@/")) return null;
  const base = especificador.startsWith("@/")
    ? join(SRC, especificador.slice(2))
    : join(deQue, "..", especificador);

  for (const sufixo of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const caminho = `${base}${sufixo}`;
    try {
      if (statSync(caminho).isFile()) return caminho;
    } catch {
      /* segue */
    }
  }
  return null;
}

/**
 * `import type` NÃO conta.
 *
 * O TypeScript apaga-o na compilação: não sobra nem um byte no bundle. Um
 * scanner que o contasse reprovaria por um `import type { X }` — e a
 * correcção seria contorná-lo, não emagrecer nada. O que interessa medir é
 * o que chega ao browser.
 */
const IMPORT_ESTATICO = /^\s*import\s+(?!type\s)(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/gm;
const IMPORT_DINAMICO = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

/**
 * Percorre só as importações ESTÁTICAS.
 *
 * É essa a distinção que interessa: um `import()` é outro chunk, pedido
 * quando alguém o pede. Uma importação estática é peso no primeiro
 * carregamento, quer o código chegue a correr, quer não.
 */
function grafoEstatico(entradas: string[]): Set<string> {
  const vistos = new Set<string>();
  const porVer = [...entradas];

  while (porVer.length) {
    const ficheiro = porVer.pop()!;
    if (vistos.has(ficheiro)) continue;
    vistos.add(ficheiro);

    let fonte: string;
    try {
      fonte = readFileSync(ficheiro, "utf8");
    } catch {
      continue;
    }
    // Os dinâmicos são retirados do texto ANTES de procurar os estáticos,
    // para um `import("./X")` dentro de uma linha não ser confundido.
    const semDinamicos = fonte.replace(IMPORT_DINAMICO, "import(DINAMICO)");

    for (const m of semDinamicos.matchAll(IMPORT_ESTATICO)) {
      const destino = resolver(ficheiro, m[1]);
      if (destino) porVer.push(destino);
    }
  }
  return vistos;
}

const rel = (f: string) => relative(SRC, f);

describe("busca:fronteira", () => {
  const entradas = [
    join(SRC, "components", "Nav.tsx"),
    join(SRC, "components", "ChromeMobile.tsx"),
    join(SRC, "components", "busca", "LancadorBusca.tsx"),
    join(SRC, "components", "busca", "BuscaTrigger.tsx"),
  ];

  const grafo = grafoEstatico(entradas);
  const nomes = [...grafo].map(rel);

  it("o cabeçalho não arrasta o catálogo fiscal", () => {
    // 123 atividades, coeficientes, escalões, tabelas de retenção — tudo
    // isto para desenhar uma barra onde ainda ninguém escreveu nada.
    expect(nomes.filter((n) => n.includes("fiscal-data"))).toEqual([]);
  });

  it("o cabeçalho não arrasta os manifestos dos guias nem o índice", () => {
    expect(nomes.filter((n) => n.startsWith("lib/guias/"))).toEqual([]);
    expect(nomes.filter((n) => n === "lib/busca/documentos.ts")).toEqual([]);
  });

  it("o painel e o diálogo da pesquisa ficam do OUTRO lado da fronteira", () => {
    // Se estes entrarem no grafo estático do cabeçalho, o `next/dynamic`
    // deixou de ser uma fronteira e passou a ser um comentário.
    expect(nomes).not.toContain("components/busca/PainelPesquisa.tsx");
    expect(nomes).not.toContain("components/busca/useControladorBusca.ts");
  });

  it("o lançador só conhece o esquema e o carregador — nunca os documentos", () => {
    const doLancador = [...grafoEstatico([join(SRC, "components", "busca", "LancadorBusca.tsx")])].map(rel);
    expect(doLancador).toContain("lib/busca/indice.ts");
    expect(doLancador).not.toContain("lib/busca/documentos.ts");
  });
});

describe("busca:documentos-fora-do-cliente", () => {
  it("nenhum componente de cliente importa `documentos.ts`", () => {
    // O módulo pesado tem exactamente três consumidores legítimos: o script
    // do build, a página `/pesquisar` (servidor) e os testes. Um `"use
    // client"` a importá-lo põe o catálogo inteiro no browser.
    const ficheiros: string[] = [];
    const percorrer = (pasta: string) => {
      for (const nome of readdirSync(pasta)) {
        const caminho = join(pasta, nome);
        if (statSync(caminho).isDirectory()) percorrer(caminho);
        else if (/\.tsx?$/.test(nome)) ficheiros.push(caminho);
      }
    };
    percorrer(SRC);

    const infratores = ficheiros.filter((f) => {
      const fonte = readFileSync(f, "utf8");
      return fonte.startsWith('"use client"') && fonte.includes("busca/documentos");
    });

    expect(infratores.map(rel)).toEqual([]);
  });
});
