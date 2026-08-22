// ═══════════════════════════════════════════════════════════════════════
//  DOCUMENTAÇÃO QUE APONTA PARA COMANDOS QUE NÃO EXISTEM
//  ---------------------------------------------------------------------
//  `npm run mercado:ingerir` estava escrito em três sítios — no
//  `CLAUDE.md`, no documento de arquitetura do motor de mercado e no
//  cabeçalho de uso do próprio script — e não existia no `package.json`.
//  O script funcionava; o atalho é que nunca tinha sido criado, e o
//  workflow chamava-o por caminho direto.
//
//  Um comando documentado que não corre não dá erro a ninguém: dá um
//  «Missing script» a quem seguiu a documentação, e envelhece em silêncio.
//  Este teste é barato e apanha a classe inteira do problema.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function ficheirosMarkdown(raiz: string): string[] {
  const encontrados: string[] = [];
  const percorrer = (pasta: string) => {
    for (const entrada of readdirSync(pasta)) {
      const caminho = join(pasta, entrada);
      if (statSync(caminho).isDirectory()) percorrer(caminho);
      else if (entrada.endsWith(".md")) encontrados.push(caminho);
    }
  };
  percorrer(raiz);
  return encontrados;
}

describe("documentação: os comandos citados existem mesmo", () => {
  it("todo o `npm run <x>` do CLAUDE.md e de docs/ está no package.json", () => {
    const pacote = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    const declarados = new Set(Object.keys(pacote.scripts));

    const fontes = ["CLAUDE.md", ...ficheirosMarkdown("docs")];
    const emFalta: string[] = [];

    for (const ficheiro of fontes) {
      const texto = readFileSync(ficheiro, "utf8");
      // `npm run x -- --flag` conta como `x`; o que interessa é o script.
      for (const encontrado of texto.matchAll(/npm run ([a-z][a-z0-9:.-]*)/g)) {
        const nome = encontrado[1]!.replace(/[.:-]+$/, "");
        if (!declarados.has(nome)) emFalta.push(`${ficheiro}: npm run ${nome}`);
      }
    }

    expect([...new Set(emFalta)]).toEqual([]);
  });
});
