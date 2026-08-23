import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MENU_GRUPOS, PILARES } from "@/lib/navegacao";

// ═══════════════════════════════════════════════════════════════════════
//  O CHROME DO TELEMÓVEL — o contrato das três superfícies
//  ---------------------------------------------------------------------
//  Abaixo de `lg` o cabeçalho não existe: o que existe são três peças que
//  têm de continuar a encaixar umas nas outras.
//
//      ChromeMobileTopo   marca · menu · acção (em fluxo, no topo)
//      busca/DockMovel    a pesquisa (fixa, acima da barra)
//      ChromeMobile       os cinco pilares (fixa, no fundo)
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
  it("os lugares DERIVAM da fonte única — não são uma segunda lista", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ ESTE É O TESTE QUE ANTES NÃO EXISTIA, E ERA O DEFEITO           │
    // │                                                               │
    // │ A barra tinha «Início · Guias · Quiz · Contabilistas · Conta»  │
    // │ escrito à mão aqui, e a de secretária tinha «Simular · Guias · │
    // │ Quiz · Planos · Contabilistas» escrito à mão noutro ficheiro.  │
    // │ Divergiam em DOIS dos cinco lugares e nada dava erro: davam    │
    // │ apenas duas respostas diferentes a «onde posso ir?», conforme  │
    // │ o ecrã.                                                        │
    // │                                                               │
    // │ Agora a lista está num sítio só (`lib/navegacao.ts`) e as duas │
    // │ superfícies leem-na. Verificar a DERIVAÇÃO — e não os rótulos  │
    // │ — é o que impede alguém de repor a lista à mão «só desta vez». │
    // └───────────────────────────────────────────────────────────────┘
    expect(CHROME).toContain('from "@/lib/navegacao"');
    expect(CHROME).toContain("PILARES.map(");
    // Nenhum destino escrito à mão nesta barra.
    expect(semComentarios(CHROME).match(/href:\s*"\//g) ?? []).toHaveLength(0);
  });

  it("são exactamente cinco lugares, e a ordem é a da fonte", () => {
    // Seis lugares põem os rótulos abaixo do que cabe em 360 px; quatro
    // desperdiçam a linha. E a ORDEM é o contrato: quem aprendeu onde está
    // «Recibos» acerta-lhe sem olhar, e trocar as posições desfaz isso sem
    // aviso nenhum. Por isso o número vive na fonte e não aqui.
    expect(PILARES).toHaveLength(5);
    expect(PILARES.map((p) => p.id)).toEqual(["descobrir", "preco", "recibos", "salario", "empresa"]);
  });

  it("«Pesquisar» não é um dos lugares — a pesquisa é o dock", () => {
    // Repô-la aqui seria repor o erro de nível que a mudança corrigiu: a
    // pesquisa não é um destino ao lado dos pilares, é como se chega a todos.
    expect(PILARES.map((p) => p.id)).not.toContain("pesquisar");
    expect(CHROME).not.toContain("EVENTO_BUSCA_ABRIR");
    expect(CHROME).toContain("<DockMovel />");
  });

  it("cada lugar tem ícone E texto — nunca só o pictograma", () => {
    // Cinco ícones sem rótulo são cinco adivinhas, num sítio onde a pessoa
    // tem de acertar à primeira com o polegar.
    expect(CHROME).toContain("iconeDe(slot.icone)");
    expect(CHROME).toContain("{slot.label}");
  });

  it("o nome acessível é o COMPLETO, mesmo onde se vê o curto", () => {
    // O que um leitor de ecrã anuncia não pode depender da largura do ecrã:
    // «Recibos» na barra, «Recibos verdes» para quem ouve.
    expect(CHROME).toContain("aria-label={slot.nomeCompleto}");
    expect(CHROME).toContain("nomeCompleto: p.label");
    expect(CHROME).toContain("label: p.curto");
  });

  it("a folha de navegação já NÃO vive nesta barra", () => {
    // «Conta» era o quinto lugar e abria uma folha com tudo o resto. Os
    // cinco lugares passaram a ser cinco destinos de trabalho, e a folha
    // subiu para o `ChromeMobileTopo` — que é a MESMA que a cápsula do
    // computador abre. Deixá-la aqui também daria duas folhas iguais.
    // `semComentarios` porque o quadro no topo do ficheiro CITA o nome da
    // folha para explicar para onde ela foi — e apagar a explicação seria
    // exactamente a saída errada. Ver a nota no topo deste ficheiro.
    expect(semComentarios(CHROME)).not.toContain("SuperficieModal");
    expect(semComentarios(CHROME)).not.toContain("MenuCompleto");
    expect(TOPO).toContain("<MenuCompleto");
  });

  it("o lugar activo compara a rota exacta ou um segmento abaixo", () => {
    // Com um `startsWith` cru, bastava uma rota nova cair dentro do nome de
    // outra para acender o lugar errado. É a mesma regra que a cápsula de
    // secretária aplica em `destinoAtivo`.
    expect(CHROME).toContain("pathname.startsWith(`${href}/`)");
    expect(CHROME).toContain('aria-current={on ? "page" : undefined}');
  });

  it("carregar no separador onde já se está leva ao princípio da página", () => {
    // Uma `<Link>` para a rota actual não faz nada — o Next não navega e por
    // isso também não repõe o scroll. Quem estava no fim da página e
    // carregava no separador aceso ficava no fim, sem sinal nenhum de que
    // tinha tocado.
    expect(CHROME).toContain("const naRotaExacta = pathname === slot.href");
    expect(CHROME).toContain("window.scrollTo({ top: 0");
    // A rota EXACTA, e não o prefixo que acende o separador.
    expect(CHROME).not.toContain("naRotaExacta = on");
    // E o `behavior` explícito passa à frente do `prefers-reduced-motion` do
    // CSS, portanto a decisão tem de ser tomada aqui também.
    expect(CHROME).toContain("reduzMovimento");
  });

  it("nenhum lugar impede a barra de encolher abaixo do conteúdo", () => {
    // `min-w-0` com `flex-1` é o que reparte os cinco lugares em partes
    // iguais seja qual for o rótulo. Sem ele, um rótulo sem espaços — logo
    // indivisível — decidia a largura dos cinco e a barra ficava mais larga
    // do que o ecrã: overflow horizontal, que é inegociável neste projecto.
    expect(CHROME).toContain("min-w-0 flex-1");
    expect(CHROME).not.toContain("min-w-[3.25rem]");
  });
});

describe("chrome-movel:folha-de-navegacao", () => {
  const MENU = ler("components", "navegacao", "MenuCompleto.tsx");
  const NAV = ler("components", "Nav.tsx");

  it("é UM componente para os dois ecrãs, e não dois com o mesmo conteúdo", () => {
    // A pesquisa já teve duas superfícies com o mesmo nome e duas
    // identidades a divergir; custou uma reescrita. A folha nasce ao
    // contrário: o mesmo componente, montado pelo cabeçalho de secretária e
    // pelo topo do telemóvel. O que muda é geometria.
    expect(NAV).toContain("<MenuCompleto");
    expect(TOPO).toContain("<MenuCompleto");
    expect(MENU).toContain('superficie: "secretaria" | "movel"');
  });

  it("os destinos vêm da fonte única — nenhum está escrito na folha", () => {
    expect(MENU).toContain("MENU_GRUPOS.map(");
    // O que não pode estar escrito à mão são os DESTINOS. As rotas literais
    // que sobram na folha são de outra natureza — a marca (`/`) e o painel
    // (`/dashboard`), que é uma acção de conta e não uma entrada de
    // navegação. Se um dia uma delas passar a ser destino, esta asserção
    // apanha a duplicação: o mesmo sítio alcançável por dois caminhos na
    // mesma superfície é o defeito, não a conveniência.
    const destinos = new Set(MENU_GRUPOS.flatMap((g) => g.entradas).map((e) => e.href));
    const literais = (semComentarios(MENU).match(/href="(\/[^"]*)"/g) ?? [])
      .map((m) => m.slice(6, -1))
      .filter((href) => destinos.has(href));
    expect(literais, `destinos escritos à mão na folha: ${literais.join(", ")}`).toHaveLength(0);
  });

  it("é folha inferior no telemóvel e o corpo é que rola", () => {
    // Regra 5b do CLAUDE.md: modal = folha inferior, corpo `min-h-0
    // overflow-y-auto` dentro de `max-h-[90dvh]`, e área segura respeitada.
    expect(MENU).toContain("max-h-[90dvh]");
    expect(MENU).toContain("min-h-0 flex-1 overflow-y-auto");
    expect(MENU).toContain("env(safe-area-inset-bottom)");
    expect(MENU).toContain("rounded-t-4xl");
  });

  it("pede a vaga do coordenador uma vez, dentro da própria folha", () => {
    // É `aria-modal`, logo não pode coexistir com o consentimento, com a
    // pesquisa nem com o modal de conta. Pedir a vaga dentro do componente
    // — e não em cada um dos dois gatilhos — é o que garante que a regra é
    // a mesma nas duas superfícies sem ninguém ter de se lembrar dela.
    expect(MENU).toContain('useOverlay("menu"');
    expect(NAV).not.toContain('useOverlay("menu"');
    expect(TOPO).not.toContain('useOverlay("menu"');
  });

  it("a conta vem primeiro, antes dos destinos", () => {
    // É a pergunta «e eu, aqui?»: o que estou a pagar e como entro.
    // Estavam no fim de dois ecrãs de rolagem, numa secção chamada «Mais».
    expect(MENU.indexOf("Começar grátis")).toBeLessThan(MENU.indexOf("MENU_GRUPOS.map("));
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

  it("não repete a entrada de conta — a folha é que a tem", () => {
    // No computador há `MenuConta` ao lado da cápsula. Aqui a conta vive
    // dentro da folha que o botão «Menu» abre. Montar também o `MenuConta`
    // daria duas entradas para o mesmo sítio no mesmo ecrã.
    expect(TOPO).not.toContain("MenuConta");
    expect(TOPO).toContain('aria-haspopup="dialog"');
  });

  it("o tema saiu daqui e passou para o cabeçalho da folha", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ E FOI MEDIDO, NÃO ARBITRADO                                    │
    // │                                                               │
    // │ A 360 px esta linha tem 328 px úteis, e a marca (~149) mais a  │
    // │ acção (~109) mais os intervalos já ocupam ~300. O tema (36 px) │
    // │ e o botão do menu (36 px) não cabem os dois — a soma dava      │
    // │ ~350 px, ou seja, scroll horizontal em TODAS as páginas, que é │
    // │ inegociável neste projecto.                                    │
    // │                                                               │
    // │ Entra o menu, porque passou a ser o único caminho para os      │
    // │ guias, o quiz, os planos, os contabilistas e a conta. O tema   │
    // │ vai para o CABEÇALHO da folha — visível no instante em que ela │
    // │ abre, sem rolar nada. Um toque a mais, zero procura. Pô-lo no  │
    // │ FIM da folha seria a troca má, e é a que este teste impede.    │
    // └───────────────────────────────────────────────────────────────┘
    const MENU = ler("components", "navegacao", "MenuCompleto.tsx");
    expect(TOPO).not.toContain("ThemeToggle");
    expect(MENU).toContain("<ThemeToggle />");
    // No CABEÇALHO da folha: antes do corpo que rola.
    expect(MENU.indexOf("<ThemeToggle />")).toBeLessThan(MENU.indexOf("min-h-0 flex-1 overflow-y-auto"));
  });
});
