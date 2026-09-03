import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// ═══════════════════════════════════════════════════════════════════════
//  A MARCA APARECE UMA VEZ NO SEPARADOR — NÃO DUAS
//  ---------------------------------------------------------------------
//  `src/app/layout.tsx` declara `title.template = "%s | Recibo Certo"`.
//  Dezanove páginas escreviam TAMBÉM a marca no `metadata.title`, e o
//  template acrescentava-a por cima:
//
//    <title>Ferramentas fiscais 2026 — 17 simuladores e calculadoras
//           | Recibo Certo | Recibo Certo</title>
//
//  Passava em tudo. O `seo:audit` confere que a página TEM título, não a
//  forma dele; o build não tem opinião sobre strings; e a 1440px, num
//  separador largo, a segunda marca fica cortada e não se vê.
//
//  Este teste lê a fonte em vez do HTML renderizado de propósito: assim
//  corre em milissegundos no `npm test`, sem build e sem servidor, e
//  aponta o ficheiro e a linha em vez de uma rota.
//
//  Duas formas legítimas de escrever a marca no título, ambas aceites:
//    · `title: { absolute: "…" }` — não passa pelo template;
//    · `openGraph.title` / `twitter.title` — também não passam.
// ═══════════════════════════════════════════════════════════════════════

const RAIZ = join(process.cwd(), "src", "app");
const MARCA = "Recibo Certo";

function paginas(dir: string): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      saida.push(...paginas(caminho));
    } else if (nome === "page.tsx" || nome === "layout.tsx") {
      saida.push(caminho);
    }
  }
  return saida;
}

/**
 * As linhas `title:` do OBJETO DE TOPO — as únicas que passam pelo template.
 * A indentação é o discriminante: dois espaços é topo, quatro ou mais é
 * `openGraph`, `twitter` ou outro objeto encaixado.
 */
function titulosDeTopo(fonte: string): { linha: number; texto: string }[] {
  return fonte
    .split("\n")
    .map((texto, i) => ({ linha: i + 1, texto }))
    .filter(({ texto }) => /^ {2}title: ["'`]/.test(texto));
}

describe("metadata: a marca não se repete no separador", () => {
  const ficheiros = paginas(RAIZ);

  it("encontra páginas para verificar", () => {
    expect(ficheiros.length).toBeGreaterThan(100);
  });

  it("nenhum `metadata.title` de topo escreve a marca — o template já a acrescenta", () => {
    const infratores: string[] = [];

    for (const ficheiro of ficheiros) {
      const fonte = readFileSync(ficheiro, "utf8");
      for (const { linha, texto } of titulosDeTopo(fonte)) {
        if (!texto.includes(MARCA)) continue;
        infratores.push(
          `${ficheiro.replace(process.cwd() + "/", "")}:${linha}\n      ${texto.trim()}`,
        );
      }
    }

    expect(
      infratores,
      "Estes títulos passam pelo template `%s | Recibo Certo` e ficam com a marca duas vezes.\n" +
        "Retira « | Recibo Certo» do `metadata.title`, ou usa `title: { absolute: \"…\" }`\n" +
        "quando a marca fizer mesmo parte da frase:\n\n    " +
        infratores.join("\n    ") +
        "\n",
    ).toEqual([]);
  });

  it("o template da raiz continua a ser o que este teste pressupõe", () => {
    const raiz = readFileSync(join(RAIZ, "layout.tsx"), "utf8");
    expect(raiz).toContain('template: "%s | Recibo Certo"');
  });
});
