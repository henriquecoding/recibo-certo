/**
 * Portão: nenhum `<script type="application/ld+json">` escapa ao serializador.
 *
 * O `JSON.stringify` não escapa `<`, por isso um valor que contenha
 * `</script>` fecha o bloco e o resto passa a ser HTML executável. O
 * `jsonLd()` de `@/lib/jsonld` escapa `<`, `>`, `&`, U+2028 e U+2029.
 *
 * Este teste existe porque a regra não se aguenta por disciplina: duas páginas
 * novas (`/fontes-fiscais` e `/perguntas-frequentes`) nasceram já depois de
 * todas as outras estarem corrigidas e voltaram a usar `JSON.stringify`.
 */
import { describe, expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(import.meta.dirname, "..", "..");

/** O `layout.tsx` injeta o script do tema, que não é JSON-LD. */
const ISENTOS = new Set(["app/layout.tsx"]);

describe("JSON-LD: nenhuma injeção passa ao lado do serializador seguro", () => {
  it("todo `__html` de um bloco ld+json vem de `jsonLd()`", () => {
    const ficheiros = globSync("**/*.tsx", { cwd: RAIZ }).sort();
    const infratores: string[] = [];

    for (const rel of ficheiros) {
      if (ISENTOS.has(rel)) continue;
      const fonte = readFileSync(join(RAIZ, rel), "utf8");
      if (!fonte.includes("dangerouslySetInnerHTML")) continue;

      const linhas = fonte.split("\n");
      linhas.forEach((linha, i) => {
        if (!linha.includes("__html")) return;
        // A injeção pode ocupar mais do que uma linha; junta as três seguintes.
        const bloco = linhas.slice(i, i + 3).join(" ");
        if (/\bjsonLd\s*\(/.test(bloco)) return;
        infratores.push(`${rel}:${i + 1}\n      ${linha.trim()}`);
      });
    }

    expect(
      infratores,
      "Estas injeções de HTML não passam pelo `jsonLd()` de `@/lib/jsonld`.\n" +
        "O `JSON.stringify` não escapa `<`, por isso um `</script>` no conteúdo\n" +
        "fecha o bloco e o resto vira HTML executável. Troca por `jsonLd(...)`:\n\n    " +
        infratores.join("\n    ") +
        "\n",
    ).toEqual([]);
  });
});
