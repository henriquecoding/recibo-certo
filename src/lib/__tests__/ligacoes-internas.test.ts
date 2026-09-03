import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
//  UMA LIGAÇÃO PARTIDA PARA DENTRO DO PRÓPRIO SITE NÃO DÁ ERRO NENHUM
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O DEFEITO QUE ESTE FICHEIRO EXISTE PARA IMPEDIR                      │
//  │                                                                     │
//  │ O rodapé prometia «Perguntas frequentes» (`/#faq`) e «Fontes         │
//  │ fiscais» (`/#fontes`), e a barra legal e o cartão «Dados oficiais»   │
//  │ repetiam a segunda. As duas secções viviam na homepage. A homepage   │
//  │ foi reescrita à volta dos cinco focos, elas saíram — e as quatro     │
//  │ ligações continuaram exactamente iguais.                             │
//  │                                                                     │
//  │ Nada acusou. Uma âncora para um id que já não é renderizado não dá   │
//  │ 404, não falha o build, não falha o TypeScript e não falha teste     │
//  │ nenhum: o navegador entrega a página de destino pelo TOPO, como se   │
//  │ a pessoa não tivesse clicado. O sintoma é indistinguível de um       │
//  │ clique que não pegou, e por isso ninguém reporta.                     │
//  │                                                                     │
//  │ O mesmo já tinha acontecido com `/#calculadora`, em SETE sítios —    │
//  │ incluindo a primeira sugestão da pesquisa global. Não é um lapso     │
//  │ que se corrige uma vez: é a consequência inevitável de uma âncora    │
//  │ ser um sítio DENTRO de uma página, e as páginas mudarem de forma.    │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  A verificação da âncora faz-se contra o GRAFO DE IMPORTS da página de
//  destino, e não contra o conjunto de todos os ids do projeto. A
//  diferença é a que separa este teste de um teste inútil: quando as
//  secções saíram da homepage, `components/Fontes.tsx` ficou órfão — sem
//  ninguém a importá-lo — e o seu `id="fontes"` continuou lá, no disco,
//  pronto a dar por boa a âncora que já não levava a lado nenhum.
// ═══════════════════════════════════════════════════════════════════════

const RAIZ = process.cwd();
const APP = join(RAIZ, "src", "app");

function ficheirosDeCodigo(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) ficheirosDeCodigo(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

/**
 * A pasta que serve um caminho, resolvendo segmentos dinâmicos.
 *
 * O Next dá precedência ao segmento estático sobre o dinâmico, e é essa
 * ordem que se replica aqui: `/guias/escaloes-irs` tem pasta própria,
 * `/guias/iva-de-caixa` é servido por `/guias/[slug]`.
 */
function dirDaRota(rota: string): string | null {
  let dir = APP;
  for (const seg of rota.split("/").filter(Boolean)) {
    const estatico = join(dir, seg);
    if (existsSync(estatico) && statSync(estatico).isDirectory()) {
      dir = estatico;
      continue;
    }
    const dinamico = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith("["))
      .map((e) => e.name)[0];
    if (!dinamico) return null;
    dir = join(dir, dinamico);
  }
  return dir;
}

function ficheiroDaRota(rota: string): string | null {
  const dir = dirDaRota(rota);
  if (!dir) return null;
  for (const nome of ["page.tsx", "route.ts"]) {
    if (existsSync(join(dir, nome))) return join(dir, nome);
  }
  return null;
}

function resolverImport(especificador: string, deFicheiro: string): string | null {
  let base: string;
  if (especificador.startsWith("@/")) base = join(RAIZ, "src", especificador.slice(2));
  else if (especificador.startsWith(".")) base = resolve(dirname(deFicheiro), especificador);
  else return null; // dependência externa: não tem ids nossos
  for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    if (existsSync(base + ext)) return base + ext;
  }
  return existsSync(base) && statSync(base).isFile() ? base : null;
}

/** Todos os ids que uma rota consegue mesmo renderizar, seguindo os imports. */
const cacheIds = new Map<string, Set<string>>();
function idsDaRota(rota: string): Set<string> {
  const emCache = cacheIds.get(rota);
  if (emCache) return emCache;

  const ids = new Set<string>();
  const entrada = ficheiroDaRota(rota);
  if (!entrada) {
    cacheIds.set(rota, ids);
    return ids;
  }

  // A página mais todos os layouts que a envolvem: uma âncora pode viver
  // no chrome (o `id="top"` da casca das homepages é o caso).
  const sementes = [entrada];
  let dir: string | null = dirDaRota(rota);
  while (dir && dir.startsWith(APP)) {
    const layout = join(dir, "layout.tsx");
    if (existsSync(layout)) sementes.push(layout);
    if (dir === APP) break;
    dir = join(dir, "..");
  }

  const porVer = [...sementes];
  const vistos = new Set(sementes);
  while (porVer.length) {
    const f = porVer.pop()!;
    const texto = readFileSync(f, "utf8");
    for (const m of texto.matchAll(/\bid=(?:"([^"]+)"|\{"([^"]+)"\})/g)) {
      ids.add((m[1] ?? m[2])!);
    }
    // `import ... from "x"` e `import("x")` — o segundo apanha o
    // `next/dynamic`, que é como as secções pesadas entram.
    for (const m of texto.matchAll(/from\s+["']([^"']+)["']|import\(["']([^"']+)["']\)/g)) {
      const alvo = resolverImport((m[1] ?? m[2])!, f);
      if (alvo && !vistos.has(alvo)) {
        vistos.add(alvo);
        porVer.push(alvo);
      }
    }
  }

  cacheIds.set(rota, ids);
  return ids;
}

interface Ligacao {
  href: string;
  local: string;
}

/**
 * Os destinos internos escritos à mão em todo o `src/`.
 *
 * Apanha as duas formas em que este projeto os escreve: o atributo JSX
 * (`href="/x"`) e a propriedade de um objeto numa lista de navegação
 * (`href: "/x"`) — foi nesta segunda que `/#faq` e `/#fontes` viveram, e é
 * a que qualquer expressão regular ingénua deixa passar.
 */
function ligacoesInternas(): Ligacao[] {
  const encontradas: Ligacao[] = [];
  for (const f of ficheirosDeCodigo(join(RAIZ, "src"))) {
    if (f.includes("__tests__")) continue;
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((linha, i) => {
        for (const m of linha.matchAll(/href(?:=|:\s*)(?:"([^"]+)"|\{"([^"]+)"\})/g)) {
          const href = (m[1] ?? m[2])!;
          if (href.startsWith("/")) {
            encontradas.push({ href, local: `${relative(RAIZ, f)}:${i + 1}` });
          }
        }
      });
  }
  return encontradas;
}

const LIGACOES = ligacoesInternas();

describe("ligacoes:internas", () => {
  it("há ligações internas para verificar", () => {
    // Uma expressão regular que deixe de casar transforma este ficheiro
    // inteiro num teste que passa sempre — o pior resultado possível.
    expect(LIGACOES.length).toBeGreaterThan(100);
  });

  it("toda a ligação interna aponta para uma rota que existe", () => {
    const partidas = LIGACOES
      .filter(({ href }) => {
        const caminho = href.split("#")[0]!.split("?")[0] || "/";
        return ficheiroDaRota(caminho) === null;
      })
      .map(({ href, local }) => `${local} → ${href}`);
    expect(partidas).toEqual([]);
  });

  it("toda a âncora existe na página que a promete", () => {
    // `/#fontes` e `/#faq` viveram aqui durante uma reescrita inteira da
    // homepage sem ninguém dar por elas. É este o teste que as apanha.
    const mortas = LIGACOES
      .filter(({ href }) => {
        const [rota, ancora] = href.split("#");
        if (!ancora) return false;
        const caminho = rota!.split("?")[0] || "/";
        return ficheiroDaRota(caminho) !== null && !idsDaRota(caminho).has(ancora);
      })
      .map(({ href, local }) => `${local} → ${href}`);
    expect(mortas).toEqual([]);
  });

  it("o rodapé aponta para páginas, e não para sítios dentro de páginas", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ PORQUE É QUE O RODAPÉ TEM UMA REGRA MAIS APERTADA              │
    // │                                                               │
    // │ Uma âncora dentro de uma página é legítima — o índice de       │
    // │ `/metodologia` é feito delas, e vive no mesmo documento a que  │
    // │ aponta. O rodapé é outra coisa: está em TODAS as páginas do    │
    // │ site, e uma âncora sua é sempre uma promessa sobre a forma de  │
    // │ uma página que ele não controla. Foi assim que quatro das suas │
    // │ ligações passaram a entregar o topo da homepage.               │
    // └───────────────────────────────────────────────────────────────┘
    const comAncora = LIGACOES
      .filter(({ local, href }) => local.endsWith("components/Footer.tsx") && href.includes("#"))
      .map(({ href }) => href);
    expect(comAncora).toEqual([]);
  });
});
