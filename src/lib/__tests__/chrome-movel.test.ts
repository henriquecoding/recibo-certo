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

/**
 * A fonte sem os comentários.
 *
 * Os ficheiros deste projecto explicam-se em quadros, e os quadros CITAM o
 * que não está lá: «declarar `aria-modal="true"` seria mentir», «disparava
 * `EVENTO_BUSCA_ABRIR`». Uma asserção de ausência sobre o texto todo
 * falha por causa da explicação de porque é que a coisa está ausente — e a
 * saída óbvia (apagar a explicação) é exactamente a errada.
 */
const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

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
  it("abre um painel ancorado, e NÃO o diálogo modal", () => {
    // A pesquisa do telemóvel era um `SuperficieModal`: véu por cima da
    // página, foco preso, scroll bloqueado e sem o rodapé com as teclas. O
    // computador nunca fez isso. Duas superfícies com o mesmo nome e duas
    // identidades — e a do telemóvel era a que quase ninguém revia.
    expect(DOCK).toContain('variante="movel"');
    expect(DOCK).toContain('import("./PainelPesquisa")');
    // Já não delega no diálogo global: dispará-lo abria os dois ao mesmo
    // gesto, com dois campos a disputar o foco.
    expect(semComentarios(DOCK)).not.toContain("EVENTO_BUSCA_ABRIR");
  });

  it("regista-se como barra ancorada, que é o que cala o diálogo global", () => {
    // A regra não é a largura, é «existe uma barra onde este gesto possa
    // abrir?». Sem este registo o diálogo continuava a responder ao ⌘K e ao
    // evento, por cima do painel que a barra acabou de abrir.
    // E regista-se pela LARGURA em que se vê. As duas barras escondem-se
    // por CSS e ficam montadas em todas as larguras; um registo
    // incondicional punha a do telemóvel a declarar-se presente num ecrã de
    // 1280 px, calando o diálogo global onde ninguém a vê.
    expect(DOCK).toContain("useRegistarLancador(CONSULTA_MOVEL)");
    expect(ler("components", "busca", "LancadorBusca.tsx")).toContain(
      "useRegistarLancador(CONSULTA_SECRETARIA)",
    );
    expect(BUSCA_GLOBAL).toContain("tambemQuando: () => !haLancadorAncorado()");
    // E deixa de responder por largura — era isso que o punha a abrir
    // ao mesmo tempo que a barra do telemóvel.
    expect(BUSCA_GLOBAL).not.toContain("ativaQuando: CONSULTA_MOVEL");
  });

  it("o painel do telemóvel continua a ser uma região, e não um diálogo", () => {
    const PAINEL = ler("components", "busca", "PainelPesquisa.tsx");
    // `aria-modal` é uma promessa: «o resto da página não existe agora».
    // Aqui a página continua legível e clicável por trás, portanto declará-lo
    // seria mentir ao leitor de ecrã — e é a razão de este painel não usar
    // `SuperficieModal` em nenhuma das duas variantes.
    // Sobre o CÓDIGO: o quadro no topo do ficheiro cita o atributo para
    // explicar porque é que ele não está lá.
    expect(semComentarios(PAINEL)).not.toMatch(/aria-modal=/);
    expect(semComentarios(PAINEL)).not.toContain("SuperficieModal");
    expect(PAINEL).toContain('role="search"');
    // Um só painel para as duas superfícies: o que muda é geometria.
    expect(PAINEL).toContain('variante === "movel"');
  });

  it("a ordem do DOM não se inverte com a ordem visual", () => {
    const PAINEL = ler("components", "busca", "PainelPesquisa.tsx");
    // No telemóvel o campo desce para a zona do polegar com `order-*`. Trocar
    // os elementos em vez disso trocava a ordem do `Tab` e a que o leitor de
    // ecrã anuncia, pondo quem navega por teclado a atravessar a lista
    // inteira antes de chegar ao sítio onde se escreve.
    expect(PAINEL).toContain("order-3");
    expect(PAINEL.indexOf("<FormularioBusca")).toBeLessThan(PAINEL.indexOf("<CorpoResultados"));
  });

  it("o tecto do painel conta com o que está por baixo da âncora", () => {
    // Esteve a ser medido dentro do painel, que não sabe onde está pousado:
    // media a janela toda, ignorava os 64 px da barra de navegação e o topo
    // do painel saía do ecrã, levando com ele o rodapé das teclas.
    expect(CSS).toContain("--rc-painel-movel-max");
    expect(CSS).toContain("calc(100dvh - var(--rc-barra-h)");
    expect(DOCK).toContain("visualViewport");
  });

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
