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

  it("o reconhecimento e o plano ficam locais — sem catálogo, sem SDK", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ A PROMESSA «TUDO FICA NESTE DISPOSITIVO» É UM GRAFO DE IMPORTS │
    // │                                                               │
    // │ O reconhecimento lê a frase que a pessoa escreveu — a mais     │
    // │ sensível de todo o produto. Basta uma importação do cliente    │
    // │ Supabase nesta cadeia para a superfície passar a poder falar   │
    // │ com um servidor enquanto alguém escreve, e a promessa da barra │
    // │ («Pesquisa global · Tudo fica neste dispositivo») deixa de ser │
    // │ verdadeira sem uma única linha de copy mudar.                  │
    // │                                                               │
    // │ Também não pode arrastar `fiscal-data.ts`: a pesquisa NÃO      │
    // │ calcula imposto. Se o catálogo fiscal aparecer aqui, é porque  │
    // │ alguém começou a calcular no sítio errado.                     │
    // └───────────────────────────────────────────────────────────────┘
    const cadeia = [...grafoEstatico([
      join(SRC, "lib", "busca", "reconhecer.ts"),
      join(SRC, "lib", "busca", "plano.ts"),
    ])].map(rel);

    expect(cadeia.filter((n) => n.includes("supabase"))).toEqual([]);
    expect(cadeia.filter((n) => n.includes("fiscal-data"))).toEqual([]);
    expect(cadeia.filter((n) => n === "lib/busca/documentos.ts")).toEqual([]);
    expect(cadeia.filter((n) => n.startsWith("lib/guias/"))).toEqual([]);
    // O motor fiscal e os motores de negócio são pesados e não têm nada
    // que fazer numa frase por interpretar.
    expect(cadeia.filter((n) => n.startsWith("lib/negocio/"))).toEqual([]);
    expect(cadeia.filter((n) => n.startsWith("lib/motor/"))).toEqual([]);
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

// ═══════════════════════════════════════════════════════════════════════
//  A PESQUISA CONTINUA LIGADA AO QUE A RODEIA
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O DEFEITO QUE ESTE BLOCO EXISTE PARA TORNAR IMPOSSÍVEL                │
//  │                                                                     │
//  │ O painel de pesquisa tinha, escrito à mão lá dentro, o selector do   │
//  │ chrome que não pode ser destruído pelo gesto que lhe toca:           │
//  │ `nav[data-compacto]`. O cabeçalho foi reescrito — passou a ser o     │
//  │ cartão do desenho, com `data-expandido` —, o atributo desapareceu do │
//  │ DOM e o selector ficou a casar com ZERO elementos.                   │
//  │                                                                     │
//  │ Nada falhou. Nada avisou. A protecção que o painel descreve em três  │
//  │ parágrafos passou a ser uma string morta, e ninguém tinha como o     │
//  │ saber sem abrir um browser e ir lá ver.                              │
//  │                                                                     │
//  │ Um selector escrito num sítio e cumprido noutro é uma ligação que    │
//  │ nenhum compilador verifica. Passa a ser uma constante partilhada, e  │
//  │ o par (constante ↔ atributo) é verificado aqui.                      │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

describe("busca:chrome-ancorado", () => {
  const ler = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");

  const MOTOR = ler("components", "busca", "motor.ts");
  const PAINEL = ler("components", "busca", "PainelPesquisa.tsx");
  const NAV = ler("components", "Nav.tsx");
  const CHROME = ler("components", "ChromeMobile.tsx");

  it("o painel não escreve selectores de chrome à mão", () => {
    // Qualquer selector literal aqui é o defeito a voltar: escrito num
    // ficheiro, cumprido noutro, verificado em lado nenhum.
    expect(PAINEL).not.toMatch(/chrome:\s*(movel\s*\?\s*)?["'`]/);
    expect(PAINEL).toContain("CHROME_MOVEL");
    expect(PAINEL).toContain("CHROME_SECRETARIA");
  });

  it("as duas constantes existem e derivam do mesmo atributo", () => {
    expect(MOTOR).toContain('export const MARCA_CHROME = "data-rc-chrome"');
    expect(MOTOR).toMatch(/CHROME_SECRETARIA\s*=\s*`\[\$\{MARCA_CHROME\}="secretaria"\]`/);
    expect(MOTOR).toMatch(/CHROME_MOVEL\s*=\s*`\[\$\{MARCA_CHROME\}="movel"\]`/);
  });

  it("os dois chromes declaram o marcador que o painel procura", () => {
    // À letra, e não por interpolação: é a forma de este teste poder exigir
    // que o atributo esteja mesmo lá quando o cabeçalho for reescrito outra
    // vez — e vai ser.
    expect(NAV).toContain('data-rc-chrome="secretaria"');
    expect(CHROME).toContain('data-rc-chrome="movel"');
  });

  it("o marcador do telemóvel está na barra INTEIRA, não só nos pilares", () => {
    // Antes apontava a `nav[aria-label="Navegação"]`, que é só a fila dos
    // cinco lugares: a linha da marca, o menu e a acção ficavam de fora, e
    // tocar-lhes com a pesquisa aberta podia levar o alvo do próprio toque.
    const posMarcador = CHROME.indexOf('data-rc-chrome="movel"');
    const posNav = CHROME.indexOf('aria-label="Navegação"');
    expect(posMarcador).toBeGreaterThan(-1);
    expect(posNav).toBeGreaterThan(posMarcador);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  MONTAR NÃO É NAVEGAR
//  ---------------------------------------------------------------------
//  O diálogo global fechava-se a si próprio na montagem: tinha
//  `useEffect(() => setQuerAbrir(false), [pathname])`, e um efeito com
//  dependências corre também à entrada. Como o `SearchIntentLoader` só o
//  monta QUANDO alguém pede a pesquisa — e lhe passa `abrirInicialmente` —,
//  o pedido era deitado fora pelo próprio ato de o servir: nas superfícies
//  sem barra ancorada (/dashboard, /admin), o primeiro `⌘K` e o primeiro
//  clique no botão de pesquisa não faziam NADA.
// ═══════════════════════════════════════════════════════════════════════

describe("busca:pedido-inicial", () => {
  const GLOBAL = readFileSync(join(SRC, "components", "busca", "BuscaGlobal.tsx"), "utf8");
  const MENU = readFileSync(join(SRC, "components", "navegacao", "MenuCompleto.tsx"), "utf8");

  it("o diálogo global não se fecha na montagem", () => {
    expect(GLOBAL).not.toMatch(/useEffect\(\(\)\s*=>\s*\{\s*setQuerAbrir\(false\);?\s*\}\s*,\s*\[pathname\]\)/);
    expect(GLOBAL).toContain("rotaMontada");
  });

  it("aceita o pedido inicial de quem o monta", () => {
    expect(GLOBAL).toContain("useState(abrirInicialmente)");
  });

  it("a folha do menu fecha na mudança de rota, e não na montagem", () => {
    expect(MENU).toContain("rotaMontada");
    expect(MENU).not.toMatch(/useEffect\(\(\)\s*=>\s*\{\s*aoFechar\(\);?\s*\}\s*,\s*\[pathname\]\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  O PAINEL TRAZ O MOTOR DE ANIMAÇÃO CONSIGO
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O DEFEITO: A PESQUISA ABRIA TRANSPARENTE                             │
//  │                                                                     │
//  │ O painel entra com `m.div initial={{opacity:0}} animate={{opacity:1}}│
//  │ `. Um `m.*` sem `LazyMotion` por cima renderiza e NUNCA aplica o     │
//  │ `animate`: fica parado no `initial`. O `MotionProvider` vivia no     │
//  │ layout de raiz e saiu de lá quando os overlays passaram a carregar   │
//  │ por intenção; cada superfície de `IntentOverlays` recebeu o seu, as  │
//  │ rotas com layout próprio também, e este painel — que vive no CHROME  │
//  │ e não pertence a nenhum dos dois — ficou sem nenhum.                 │
//  │                                                                     │
//  │ Durante semanas a pesquisa abriu com 1370×330 px de resultados       │
//  │ certos, foco no campo, teclado a responder, e opacidade ZERO.        │
//  │                                                                     │
//  │ Este teste é o aviso rápido; quem mede a verdade é o `visivel:e2e`,  │
//  │ que lê a opacidade computada num browser — porque `isVisible()` do   │
//  │ Playwright e o axe dão `opacity: 0` como visível, e foi por isso que │
//  │ trinta verificações sobre este painel passaram verdes por cima dele. │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

describe("busca:painel-visivel", () => {
  const PAINEL = readFileSync(join(SRC, "components", "busca", "PainelPesquisa.tsx"), "utf8");

  it("o painel monta o seu próprio MotionProvider", () => {
    expect(PAINEL).toContain('import MotionProvider from "@/components/ui/motion/MotionProvider"');
    expect(PAINEL).toMatch(/<MotionProvider>\s*<PainelPesquisaInterno/);
  });

  it("e o provider fica FORA do componente que anima", () => {
    // Se o provider ficasse dentro, o `m.div` continuaria sem features: o
    // que importa é ele envolver quem anima, não estar no ficheiro.
    const posProvider = PAINEL.indexOf("<MotionProvider>");
    const posAnima = PAINEL.indexOf("initial={{ opacity: 0 }}");
    expect(posProvider).toBeGreaterThan(-1);
    expect(posAnima).toBeGreaterThan(posProvider);
  });

  it("quem anima continua a declarar a entrada", () => {
    // Guarda contra a «correção» tentadora: tirar a animação em vez de lhe
    // dar o motor. Sem `initial` o defeito desaparecia por acidente, e a
    // próxima superfície animada voltaria a apanhá-lo.
    expect(PAINEL).toContain("initial={{ opacity: 0 }}");
    expect(PAINEL).toContain("animate={{ opacity: 1 }}");
  });
});
