// ═══════════════════════════════════════════════════════════════════════
//  COERÊNCIA DO PAINEL — as regras que voltavam a partir-se sozinhas
//  ---------------------------------------------------------------------
//  Estes testes não verificam comportamento: verificam CONVENÇÕES. Existem
//  porque cada uma delas já se partiu uma vez, em silêncio, e nenhuma teria
//  sido apanhada por um teste de domínio — o painel passou a ter vinte
//  problemas com 1941 testes verdes.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");
const PAINEL = [join(SRC, "app", "contabilista"), join(SRC, "components", "contabilistas")];

function fontesEm(diretorio: string): { caminho: string; texto: string }[] {
  const saida: { caminho: string; texto: string }[] = [];
  for (const nome of readdirSync(diretorio)) {
    const caminho = join(diretorio, nome);
    if (statSync(caminho).isDirectory()) saida.push(...fontesEm(caminho));
    else if (/\.tsx?$/.test(nome)) saida.push({ caminho, texto: readFileSync(caminho, "utf8") });
  }
  return saida;
}

const FONTES = PAINEL.flatMap(fontesEm);
const relativo = (c: string) => c.slice(SRC.length + 1);

describe("modo escuro — uma palete, não duas", () => {
  /**
   * O dark mode deste projeto é uma CAMADA DE OVERRIDE `.dark` em
   * `globals.css` que remapeia os neutros para uma palete quente
   * (`bg-white` → #1e221b). Escrever `dark:bg-stone-900` no elemento
   * contorna essa camada — e ganha, porque a variante do Tailwind sai
   * depois no CSS compilado com a mesma especificidade.
   *
   * O resultado era visível: ir de Agenda para Fidelidade mudava o fundo
   * dos cartões de #1e221b (quente) para #1c1917 (frio). Duas paletes
   * escuras no mesmo produto, a um clique de distância.
   */
  const COBERTAS = {
    bg: ["bg-white", "bg-cream", "bg-sand", "bg-stone-50", "bg-stone-100", "bg-stone-200", "bg-brand-light"],
    border: ["border-stone-100", "border-stone-200", "border-stone-300"],
    text: ["text-ink", "text-stone-200", "text-stone-300", "text-stone-400",
           "text-stone-500", "text-stone-600", "text-stone-700", "text-stone-800"],
  };

  it("não redeclara `dark:` num neutro que a camada `.dark` já remapeia", () => {
    const infracoes: string[] = [];

    for (const { caminho, texto } of FONTES) {
      // Cada lista de classes literal do ficheiro.
      for (const m of texto.matchAll(/"([^"\n]*\bdark:[^"\n]*)"/g)) {
        const partes = m[1].split(/\s+/).filter(Boolean);
        const base = new Set(partes.map((c) => c.split("/")[0]));
        for (const c of partes) {
          const familia =
            /^dark:bg-stone-\d/.test(c) ? "bg"
            : /^dark:border-stone-\d/.test(c) ? "border"
            : /^dark:text-stone-\d/.test(c) ? "text"
            : null;
          if (!familia) continue;
          if (COBERTAS[familia].some((b) => base.has(b))) {
            infracoes.push(`${relativo(caminho)}: «${c}» sobre um neutro já coberto`);
          }
        }
      }
    }

    expect(infracoes, infracoes.join("\n")).toEqual([]);
  });
});

describe("separadores — o padrão ARIA completo ou botões honestos", () => {
  /**
   * Havia cinco `role="tab"` à mão no painel, nenhum com `aria-controls`
   * nem `role="tabpanel"` nem tabIndex rotativo. Um separador que não
   * aponta para painel nenhum promete a um leitor de ecrã uma estrutura
   * que não existe.
   */
  it("todo o `role=\"tab\"` aponta para um painel e tem tabIndex rotativo", () => {
    // O componente partilhado é a forma mais fácil de cumprir isto, mas a
    // regra é a propriedade, não a implementação: o Workspace tem um menu
    // irmão em cada separador e por isso monta os seus à mão.
    const infratores: string[] = [];

    for (const { caminho, texto } of FONTES) {
      if (!/role="tab"/.test(texto)) continue;
      const c = relativo(caminho);
      if (!/aria-controls/.test(texto)) infratores.push(`${c}: sem aria-controls`);
      if (!/tabIndex/.test(texto)) infratores.push(`${c}: sem tabIndex rotativo`);
      if (!/role="tabpanel"|PainelDoSeparador|<Separadores/.test(texto)) {
        infratores.push(`${c}: sem painel associado`);
      }
    }

    expect(infratores, infratores.join("\n")).toEqual([]);
  });
});

describe("estados — «falhou» nunca se disfarça de «está vazio»", () => {
  /**
   * A página de casos não tinha `try/catch`: uma leitura falhada mostrava
   * «Ainda não te encaminhámos nenhum caso» — uma afirmação falsa sobre
   * trabalho que pode existir. E a progressão substituía a falha por
   * «patamar Base · 10% · 0 XP», um número inventado sobre a comissão da
   * própria pessoa.
   */
  it("todas as páginas do painel tratam a falha de carregamento", () => {
    const paginas = FONTES.filter(({ caminho }) =>
      caminho.includes(join("app", "contabilista")) && caminho.endsWith("page.tsx"));

    expect(paginas.length).toBeGreaterThan(5);

    // `catch` explícito ou um `ErrorBoundary` à volta — as duas formas
    // contam. O que não conta é não haver nenhuma.
    const semTratamento = paginas
      .filter(({ texto }) => !/catch|ErrorBoundary/.test(texto))
      .map(({ caminho }) => relativo(caminho));

    expect(semTratamento, `sem catch: ${semTratamento.join(", ")}`).toEqual([]);
  });

  it("a progressão não fabrica um patamar quando a leitura falha", () => {
    const progressao = FONTES.find(({ caminho }) =>
      caminho.endsWith(join("progressao", "page.tsx")))!.texto;

    // O `catch` não pode chamar `setEstado` com valores inventados.
    const catchDoEstado = /\.catch\([\s\S]{0,120}setEstado\(\s*\{/.test(progressao);
    expect(catchDoEstado, "o catch voltou a inventar um EstadoProgressao").toBe(false);
    expect(progressao).toContain("setErro");
  });
});

describe("rascunhos por gravar", () => {
  /**
   * Não havia um único `beforeunload` em todo o `src/`, e três ecrãs
   * mantinham rascunho sujo com nove destinos permanentemente a um clique
   * na barra lateral.
   */
  it("os três ecrãs com rascunho usam a guarda partilhada", () => {
    const comGuarda = ["perfil/page.tsx", "agenda/page.tsx", "fidelidade/page.tsx"];
    for (const alvo of comGuarda) {
      const f = FONTES.find(({ caminho }) => caminho.endsWith(join(...alvo.split("/"))));
      expect(f, `não encontrei ${alvo}`).toBeDefined();
      expect(f!.texto, `${alvo} perdeu a guarda de rascunho`).toContain("usarRascunhoSujo");
    }
  });
});

describe("cabeçalho — um sistema, não dois", () => {
  /**
   * Havia dois: o portal `TituloDoPainel` (quatro ecrãs) e o
   * `CabecalhoPainel` em página (seis ecrãs) — e dois ecrãs faziam ambos,
   * mostrando o mesmo título duas vezes. Seis rotas deixavam a barra do
   * topo vazia no desktop.
   */
  it("`CabecalhoPainel` monta sozinho o título do topo", () => {
    const cabecalho = FONTES.find(({ caminho }) =>
      caminho.endsWith("CabecalhoPainel.tsx"))!.texto;
    expect(cabecalho).toContain("TituloDoPainel");
    expect(cabecalho).toContain("tituloNoTopo");
  });

  it("nenhuma página monta os dois ao mesmo tempo", () => {
    const duplicadas = FONTES
      .filter(({ caminho, texto }) =>
        caminho.includes(join("app", "contabilista")) &&
        /<CabecalhoPainel/.test(texto) &&
        /<TituloDoPainel/.test(texto))
      .map(({ caminho }) => relativo(caminho));

    expect(duplicadas, `título duas vezes em: ${duplicadas.join(", ")}`).toEqual([]);
  });
});
