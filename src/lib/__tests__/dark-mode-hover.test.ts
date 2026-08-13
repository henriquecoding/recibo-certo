// O ponto cego do dark mode: as variantes de estado (hover/focus/group-hover).
//
// A camada `.dark` do `globals.css` remapeia classes BASE — `.bg-stone-100`,
// `.text-brand`. Mas `hover:bg-stone-100` compila para uma classe PRÓPRIA
// (`.hover\:bg-stone-100`) que nenhum desses seletores apanha. Sem uma regra
// explícita, o hover pinta a cor de MODO CLARO por cima de um fundo escuro.
//
// Aconteceu, e foi assim que este teste nasceu:
//
//  · o CTA "Comprar o vitalício" (`hover:bg-brand` + `hover:text-white` +
//    `dark:text-brand`) ficava verde sobre verde — 1,00:1, texto invisível;
//  · um chip com `hover:bg-brand-light` acendia um retângulo quase branco
//    (#E1F5EE) debaixo de texto claro — 1,31:1.
//
// O segundo mecanismo é de precedência: `.dark .text-brand` e
// `.hover\:text-white:hover` têm a MESMA especificidade (0,2,0), e o `.dark`
// vem depois no ficheiro. O Tailwind também emite `dark:*` DEPOIS de `hover:*`.
// Em qualquer dos casos é a cor de repouso que ganha durante o hover.
//
// Este teste falha quando alguém introduz uma variante de estado nova sem lhe
// dar valor no escuro. A mensagem diz exatamente que regra falta escrever.
//
// Ver `globals.css`, secção "VARIANTES DE ESTADO", e CLAUDE.md regra 4
// (modo claro intacto) e 5 (acessibilidade/contraste).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");
const CSS = readFileSync(join(SRC, "app", "globals.css"), "utf8");

const VARIANTES = ["hover", "group-hover", "focus", "focus-within"] as const;

function ficheiros(dir: string, out: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) ficheiros(caminho, out);
    else if (/\.tsx?$/.test(nome) && !caminho.includes("__tests__")) out.push(caminho);
  }
  return out;
}

/** Cores que, no escuro, seriam claras de mais — ou que a camada `.dark`
 *  remapeia na classe base e portanto tem de remapear também no estado. */
function precisaDeEscuro(util: string): boolean {
  const [, prop, cor] = util.match(/^(bg|text|border)-(.+)$/) ?? [];
  if (!prop || !cor) return false;
  const base = cor.replace(/\/\d+$/, "");

  // Preenchimentos de marca: verdes FIXOS nos dois temas, por decisão de
  // design (os CTA mantêm presença). Não levam — nem podem levar — override.
  if (prop === "bg" && /^brand(-dark|-deep)?$/.test(base)) return false;
  // Vermelho sólido de ação destrutiva: já é escuro e leva texto branco.
  if (prop === "bg" && /^red-(500|600|700|800|900)$/.test(base)) return false;
  // Valores arbitrários (`bg-[#e8dcc8]`): o "livro" do quiz é pergaminho fixo
  // nos dois temas, por decisão explícita. Fora do alcance da camada `.dark`.
  if (base.startsWith("[")) return false;
  // Tons já escuros: em fundo escuro não há nada a corrigir.
  if (/-(600|700|800|900|950)$/.test(base)) return false;

  // Famílias que a camada `.dark` remapeia na base, mais os tons claros da
  // paleta de stock (que no escuro apareceriam como manchas claras).
  return (
    /^(stone|fiz)-(50|100|200|300|400|500)$/.test(base) ||
    /^(red|green|emerald|amber|blue|orange|rose|yellow)-(50|100|200|300)$/.test(base) ||
    /^(brand|brand-dark|brand-deep|brand-light|ink|cream|sand)$/.test(base) ||
    /^(alert|clay)-\w+$/.test(base) ||
    (prop === "text" && /^stone-(300|400|500|600|700|800|900)$/.test(base)) ||
    (prop === "text" && /^(white|red-400|red-500)$/.test(base)) ||
    (prop === "bg" && base === "white")
  );
}

/** Utilitários de estado escritos no código, sem `dark:` à frente, e que
 *  aparecem pelo menos uma vez SEM um `dark:<variante>:<prop>` no mesmo
 *  elemento (esse já resolve o caso à mão e manda sobre a camada). */
function variantesPorCobrir(): Map<string, string> {
  const encontradas = new Map<string, string>();
  for (const f of ficheiros(SRC)) {
    const texto = readFileSync(f, "utf8");
    for (const m of texto.matchAll(/className=\{?["`]([^"`]{4,600})["`]/g)) {
      const classes = m[1].split(/\s+/).filter(Boolean);
      for (const c of classes) {
        const partes = c.match(/^(hover|group-hover|focus|focus-within):(bg|text|border)-(.+)$/);
        if (!partes) continue;
        const [, variante, prop] = partes;
        const util = c.slice(variante.length + 1);
        if (!precisaDeEscuro(util)) continue;
        // Já resolvido à mão neste elemento? Então não exige regra genérica.
        if (classes.some((o) => o.startsWith(`dark:${variante}:${prop}-`))) continue;
        if (!encontradas.has(c)) encontradas.set(c, f.replace(`${SRC}/`, ""));
      }
    }
  }
  return encontradas;
}

/** Utilitários com regra na camada `.dark` — por token exato (`~=`) ou por
 *  prefixo de opacidade (`*=`, ex. `hover:bg-white/`). */
function cobertosPeloCss(): { exatos: Set<string>; prefixos: string[] } {
  const exatos = new Set<string>();
  const prefixos: string[] = [];
  for (const m of CSS.matchAll(/\[class~="([^"]+)"\]/g)) exatos.add(m[1]);
  for (const m of CSS.matchAll(/\[class\*="([^"]+)"\]/g)) {
    if (m[1].endsWith("/")) prefixos.push(m[1]);
  }
  return { exatos, prefixos };
}

describe("dark mode — variantes de estado (hover/focus/group-hover)", () => {
  it("toda a variante de cor usada no código tem valor no escuro", () => {
    const { exatos, prefixos } = cobertosPeloCss();
    const faltam: string[] = [];

    for (const [util, ficheiro] of variantesPorCobrir()) {
      const coberto =
        exatos.has(util) || prefixos.some((p) => util.startsWith(p));
      if (!coberto) faltam.push(`${util}  (${ficheiro})`);
    }

    expect(
      faltam,
      `Estas variantes ficam com a cor do MODO CLARO sobre fundo escuro.\n` +
        `Acrescenta a regra em globals.css, secção "VARIANTES DE ESTADO":\n\n` +
        faltam.map((f) => `  .dark [class~="${f.split("  ")[0]}"]:hover { … }`).join("\n") +
        `\n\nEm falta:\n  ${faltam.join("\n  ")}\n`,
    ).toEqual([]);
  });

  it("as regras de estado nunca tocam no modo claro", () => {
    const seccao = CSS.slice(CSS.indexOf("VARIANTES DE ESTADO"));
    const semDark = [...seccao.matchAll(/^\s*(\[class[~*]=[^\n]*)$/gm)]
      .map((m) => m[1])
      .filter((linha) => !linha.includes("/*"));

    // Toda a linha de seletor da secção tem de vir depois de `.dark`.
    expect(semDark, `Seletores sem \`.dark\` à frente partiriam o modo claro:\n${semDark.join("\n")}`)
      .toEqual([]);
  });

  it("um `dark:hover:` escrito à mão manda sobre a camada genérica", () => {
    const seccao = CSS.slice(CSS.indexOf("VARIANTES DE ESTADO"));
    const regras = [...seccao.matchAll(/\.dark \[class[~*]="((?:hover|group-hover|focus|focus-within):[^"]+)"\][^,{]*/g)];
    expect(regras.length).toBeGreaterThan(30);

    const semGuarda = regras
      .map((m) => m[0])
      .filter((sel) => !sel.includes(":not([class*=\"dark:"))
      // A exceção das superfícies de marca é deliberadamente sem guarda: ali o
      // branco translúcido é intencional e tem de ganhar sempre.
      .filter((sel) => !/\.bg-brand(-dark)? /.test(sel));

    expect(
      semGuarda,
      `Sem \`:not([class*="dark:…"])\`, esta camada passa por cima de um\n` +
        `\`dark:hover:\` escrito à mão no componente:\n${semGuarda.join("\n")}`,
    ).toEqual([]);
  });
});
