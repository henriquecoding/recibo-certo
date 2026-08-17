import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { NAV_PRINCIPAL } from "@/components/nav-config";

// ═══════════════════════════════════════════════════════════════════════
//  O CHROME DO TELEMÓVEL — o contrato das três superfícies
//  ---------------------------------------------------------------------
//  Abaixo de `lg` o cabeçalho não existe: o que existe são três peças que
//  têm de continuar a encaixar umas nas outras.
//
//      ChromeMobileTopo   marca · tema · acção (em fluxo, no topo)
//      busca/DockMovel    a pesquisa (fixa, acima da barra)
//      ChromeMobile       os cinco destinos (fixa, no fundo)
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE ISTO SE VERIFICA LENDO A FONTE                                │
//  │                                                                     │
//  │ São acoplamentos que não dão erro quando partem — só deixam de       │
//  │ funcionar em silêncio, e num sítio (telemóvel, teclado, leitor de    │
//  │ ecrã) onde ninguém tropeça neles a desenvolver. O `focoDeRegresso`   │
//  │ do diálogo procura um selector escrito à mão noutro ficheiro; a      │
//  │ altura do chrome é lida por três componentes; e a ordem dos cinco    │
//  │ lugares é memória muscular de quem já usa o produto.                 │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

const SRC = join(__dirname, "..", "..");
const ler = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");

const CHROME = ler("components", "ChromeMobile.tsx");
const TOPO = ler("components", "ChromeMobileTopo.tsx");
const DOCK = ler("components", "busca", "DockMovel.tsx");
const BUSCA_GLOBAL = ler("components", "busca", "BuscaGlobal.tsx");
const BOTAO_TOPO = ler("components", "ui", "BotaoTopo.tsx");
const CSS = ler("app", "globals.css");
const LAYOUT = ler("app", "layout.tsx");

describe("chrome-movel:barra", () => {
  /** Os cinco `id` dos lugares, pela ordem em que aparecem na fonte. */
  const slots = [...CHROME.matchAll(/\{\s*tipo:\s*"(?:link|acao)",\s*id:\s*"([a-z]+)"/g)].map((m) => m[1]);

  it("são exactamente cinco lugares, nesta ordem", () => {
    // Seis lugares põem os alvos abaixo do mínimo de toque em 360 px e os
    // rótulos deixam de caber; quatro desperdiçam a linha. E a ORDEM é o
    // contrato: quem aprendeu onde está «Guias» acerta-lhe sem olhar, e
    // trocar as posições desfaz isso sem aviso nenhum.
    expect(slots).toEqual(["inicio", "guias", "quiz", "contabilistas", "conta"]);
  });

  it("«Pesquisar» não é um dos lugares — a pesquisa é o dock", () => {
    // Repô-la aqui seria repor o erro de nível que a mudança corrigiu: a
    // pesquisa não é um destino ao lado de «Guias», é como se chega a todos.
    expect(slots).not.toContain("pesquisar");
    expect(CHROME).not.toContain("EVENTO_BUSCA_ABRIR");
  });

  it("o destino de «Contabilistas» é o mesmo da barra de secretária", () => {
    // Duas barras a apontar para rotas diferentes com o mesmo nome é o
    // defeito que só se descobre quando uma das duas deixa de acender.
    const doDesktop = NAV_PRINCIPAL.find((i) => i.label === "Contabilistas");
    expect(doDesktop?.href).toBe("/contabilistas");
    expect(CHROME).toContain('href: "/contabilistas"');
  });

  it("«Contabilistas» aparece UMA vez no chrome — a barra, não a folha", () => {
    // Estava dentro da secção «Mais» da folha de «Conta». Mantê-lo nos dois
    // sítios daria dois caminhos para o mesmo destino na mesma superfície.
    // Contam-se DESTINOS (`href`), não menções: os quadros de comentário
    // falam da rota e não são caminhos que alguém possa carregar.
    expect(CHROME.match(/href[:=]\s*"\/contabilistas"/g) ?? []).toHaveLength(1);
  });

  it("o rótulo activo compara a rota exacta ou um segmento abaixo", () => {
    // Com um `startsWith` cru, `/contabilista` (o painel, no singular) e
    // `/contabilistas` (o directório) partilham o começo — e bastava uma
    // rota nova cair dentro do nome de outra para acender o lugar errado.
    expect(CHROME).toContain("pathname.startsWith(`${href}/`)");
  });

  it("carregar no separador onde já se está leva ao princípio da página", () => {
    // Uma `<Link>` para a rota actual não faz nada — o Next não navega e por
    // isso também não repõe o scroll. Quem estava no fim do quiz e carregava
    // em «Quiz» ficava no fim, sem sinal nenhum de que tinha tocado.
    expect(CHROME).toContain("const naRotaExacta = pathname === slot.href");
    expect(CHROME).toContain("window.scrollTo({ top: 0");
    // A rota EXACTA, e não o prefixo que acende o separador: em
    // `/contabilistas/joao` o toque tem de continuar a levar ao directório.
    expect(CHROME).not.toContain("naRotaExacta = on");
    // E o `behavior` explícito passa à frente do `prefers-reduced-motion` do
    // CSS, portanto a decisão tem de ser tomada aqui também.
    expect(CHROME).toContain("reduzMovimento");
  });

  it("nenhum lugar impede a barra de encolher abaixo do conteúdo", () => {
    // `min-w-0` com `flex-1` é o que reparte os cinco lugares em partes
    // iguais seja qual for o rótulo. Sem ele, «Contabilistas» — uma palavra
    // sem espaços, logo indivisível — decidia a largura dos cinco e a barra
    // ficava mais larga do que o ecrã: overflow horizontal, que é
    // inegociável neste projecto.
    expect(CHROME).toContain("min-w-0 flex-1");
    expect(CHROME).not.toContain("min-w-[3.25rem]");
  });
});

describe("chrome-movel:folha-de-conta", () => {
  /** As secções da folha, pela ordem em que são renderizadas. */
  const seccoes = [...CHROME.matchAll(/<SeccaoMenu titulo="([^"]+)"/g)].map((m) => m[1]);

  it("«Conta e apoio» vem primeiro, antes das ferramentas e dos guias", () => {
    // Estavam no fim, numa secção chamada «Mais», depois de nove ferramentas
    // e quatro páginas — dois ecrãs de rolagem numa folha de 88 dvh. São as
    // duas coisas que respondem a «e eu, aqui?»: o que estou a pagar e como
    // falo com alguém. Pertencem ao lado de «Entrar» e «Começar grátis».
    expect(seccoes).toEqual(["Conta e apoio", "Ferramentas", "Aprender"]);
    expect(CHROME).not.toContain('titulo="Mais"');
  });

  it("«Planos» e o feedback vivem nessa primeira secção", () => {
    const primeira = CHROME.slice(
      CHROME.indexOf('<SeccaoMenu titulo="Conta e apoio">'),
      CHROME.indexOf('<SeccaoMenu titulo="Ferramentas">'),
    );
    expect(primeira).toContain("PLANOS");
    expect(primeira).toContain("abrirFeedback");
  });
});

describe("chrome-movel:dock", () => {
  it("é uma ligação para /pesquisar e não um botão", () => {
    // O diálogo entra por `next/dynamic`: entre o HTML chegar e o chunk
    // carregar há uma janela real em que um `<button>` não faz nada. Uma
    // ligação continua a levar à pesquisa sem JavaScript nenhum.
    expect(DOCK).toContain('href="/pesquisar"');
  });

  it("carrega o gatilho que o diálogo usa para devolver o foco", () => {
    // Este selector está escrito em dois ficheiros e é a única coisa que
    // liga um ao outro. Se o atributo mudar de nome ou de sítio, fechar a
    // pesquisa com Escape deixa o foco no `<body>` — e nada dá erro.
    expect(DOCK).toContain('data-busca-gatilho="movel"');
    expect(BUSCA_GLOBAL).toContain('[data-busca-gatilho="movel"]');
  });

  it("NÃO declara um `inert` próprio", () => {
    // Custou um defeito. O `SuperficieModal` levanta o `inert` dos irmãos e
    // só DEPOIS chama `focus()` no gatilho; um `inert` próprio, vindo de um
    // evento de janela, ainda lá estava nesse instante, e um elemento
    // inerte recusa foco em silêncio. O dock já está coberto por ser filho
    // do `<body>` — ver o quadro em `DockMovel.tsx`.
    expect(DOCK).not.toMatch(/\binert=/);
  });

  it("não arrasta o catálogo da pesquisa para o bundle inicial", () => {
    // Vive no chrome de todas as páginas públicas. Só pode conhecer o
    // carregador do índice — nunca os documentos. (A fronteira completa,
    // pelo grafo de imports, está em `busca-fronteira.test.ts`.)
    expect(DOCK).toContain('from "@/lib/busca/indice"');
    expect(DOCK).not.toContain("lib/busca/documentos");
  });
});

describe("chrome-movel:geometria", () => {
  it("a altura do chrome é um token, e todos os interessados o leem", () => {
    // Estava escrita à mão em três sítios e já tinha divergido: o botão
    // «voltar ao topo» subia 124 px por causa de um dock que entretanto
    // fora removido, e o espaçador reservava 76 px sem contar com a área
    // segura — num iPhone os últimos píxeis da página ficavam por baixo da
    // barra. Nada partia; ficava só errado.
    expect(CSS).toContain("--rc-chrome-movel");
    expect(CSS).toContain("--rc-barra-h");
    for (const [nome, fonte] of [
      ["ChromeMobile", CHROME],
      ["BotaoTopo", BOTAO_TOPO],
    ] as const) {
      expect(fonte, `${nome} tem de ler --rc-chrome-movel`).toContain("var(--rc-chrome-movel)");
    }
    expect(DOCK).toContain("var(--rc-barra-h)");
  });

  it("a área segura do dispositivo entra na conta", () => {
    // Sem `env(safe-area-inset-bottom)` a barra fica por baixo do indicador
    // do iPhone e os alvos do fundo deixam de ser acertáveis.
    expect(CSS).toContain("env(safe-area-inset-bottom");
  });
});

describe("chrome-movel:topo", () => {
  it("vive em fluxo e é montado antes do conteúdo", () => {
    // Fixá-lo somaria 56 px de moldura permanente aos ~120 px do chrome de
    // baixo — 28% de um ecrã de 640 px gastos em navegação. Em fluxo custa
    // uma vez, no topo do documento, e zero enquanto se lê. É também por
    // isso que é montado ANTES do `{children}` e não ao lado do
    // `ChromeMobile`, que é o último elemento do corpo.
    expect(TOPO).not.toMatch(/\bfixed\b/);
    expect(TOPO).not.toMatch(/\bsticky\b/);
    expect(LAYOUT.indexOf("<ChromeMobileTopo />")).toBeGreaterThan(-1);
    expect(LAYOUT.indexOf("<ChromeMobileTopo />")).toBeLessThan(LAYOUT.indexOf("{children}"));
  });

  it("desaparece onde há cabeçalho de secretária e chrome próprio", () => {
    // A partir de `lg` manda o `Nav.tsx`; no /dashboard e no /admin manda o
    // chrome dessas áreas. Dois cabeçalhos ao mesmo tempo é o defeito.
    expect(TOPO).toContain("lg:hidden");
    expect(TOPO).toContain('pathname.startsWith("/dashboard")');
    expect(TOPO).toContain('pathname.startsWith("/admin")');
  });

  it("sai do caminho durante uma pergunta do quiz, como o resto do chrome", () => {
    // O de baixo já saía; este ficava, com «Começar» ao lado de uma pergunta
    // a contar tempo. Os dois leem agora o mesmo sinal, e o quiz — que o
    // emite — importa a constante em vez de reescrever a classe à mão.
    const QUIZ = ler("components", "quiz-fiscal", "QuizFiscalApp.tsx");
    for (const [nome, fonte] of [
      ["ChromeMobileTopo", TOPO],
      ["ChromeMobile", CHROME],
      ["QuizFiscalApp", QUIZ],
    ] as const) {
      expect(fonte, `${nome} tem de usar o módulo partilhado`).toContain("useQuizAJogar");
    }
    // A classe existe escrita UMA vez — no módulo que a define.
    expect(QUIZ).not.toContain('"quiz-playing"');
    expect(CHROME).not.toContain('"quiz-playing"');
  });

  it("não repete a entrada de conta, que é um dos cinco lugares", () => {
    // No computador há `MenuConta` porque não há barra em baixo. Aqui há —
    // e «Conta» é o quinto lugar. Repeti-lo em cima daria duas entradas
    // para o mesmo sítio no mesmo ecrã.
    expect(TOPO).not.toContain("MenuConta");
  });
});
