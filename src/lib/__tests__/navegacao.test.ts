import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MENU_GRUPOS, PILARES, SECOES, SECOES_TOPO, destinoAtivo, hrefAtivo } from "@/lib/navegacao";
import { CATALOGO_FERRAMENTAS } from "@/lib/ferramentas";

// ═══════════════════════════════════════════════════════════════════════
//  A SINCRONIA DAS SUPERFÍCIES DE NAVEGAÇÃO
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O DEFEITO QUE ISTO EXISTE PARA IMPEDIR                               │
//  │                                                                     │
//  │ Havia duas navegações e não concordavam uma com a outra:             │
//  │                                                                     │
//  │   secretária  Simular · Guias · Quiz · Planos · Contabilistas        │
//  │   telemóvel   Início · Guias · Quiz · Contabilistas · Conta          │
//  │                                                                     │
//  │ Duas listas, dois ficheiros, e nada que as obrigasse a concordar.    │
//  │ Divergiam em DOIS dos cinco lugares — e a divergência não dava erro  │
//  │ nenhum: dava apenas duas respostas diferentes à pergunta «onde       │
//  │ posso ir?», conforme o ecrã. É o tipo de defeito que só se descobre  │
//  │ quando alguém usa o produto nos dois sítios no mesmo dia.            │
//  │                                                                     │
//  │ A cura foi pôr a lista num sítio só (`lib/navegacao.ts`). Este       │
//  │ ficheiro é o que impede que ela volte a ser copiada — verifica a     │
//  │ DERIVAÇÃO, e não os rótulos, porque rótulos iguais hoje voltam a     │
//  │ divergir amanhã.                                                     │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

const SRC = join(__dirname, "..", "..");
const ler = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");

/** A fonte sem comentários — os quadros deste projecto CITAM o que não lá está. */
const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const CAPSULA = ler("components", "navegacao", "CapsulaNav.tsx");
const MENU = ler("components", "navegacao", "MenuCompleto.tsx");
const FILA = ler("components", "navegacao", "FilaPilares.tsx");
const SECBAR = ler("components", "navegacao", "BarraSecoes.tsx");
const CHROME = ler("components", "ChromeMobile.tsx");
const MARCA = ler("components", "ChromeMobileMarca.tsx");
const NAV = ler("components", "Nav.tsx");
const RODAPE = ler("components", "Footer.tsx");
const CSS = ler("app", "globals.css");

/** As quatro superfícies que têm de dizer a mesma coisa. */
const SUPERFICIES = [
  ["cápsula de secretária", CAPSULA],
  ["barra do telemóvel", CHROME],
  ["fila da homepage", FILA],
  ["rodapé", RODAPE],
] as const;

/** As superfícies que leem a fonte, incluindo as que só levam secções. */
const TODAS_AS_SUPERFICIES = [...SUPERFICIES, ["barra de secções", SECBAR] as const];

describe("navegacao:fonte-unica", () => {
  it("já não existe uma segunda lista de navegação", () => {
    // `nav-config.tsx` tinha `NAV_PRINCIPAL`, e a barra do telemóvel tinha
    // `SLOTS`. Recriar qualquer um deles é recriar a divergência.
    expect(existsSync(join(SRC, "components", "nav-config.tsx"))).toBe(false);
    for (const [nome, fonte] of SUPERFICIES) {
      expect(semComentarios(fonte), `${nome} declara uma lista própria`).not.toContain("NAV_PRINCIPAL");
    }
  });

  it("todas as superfícies derivam da fonte", () => {
    for (const [nome, fonte] of SUPERFICIES) {
      expect(fonte, `${nome} não lê @/lib/navegacao`).toContain('from "@/lib/navegacao"');
      expect(fonte, `${nome} não itera os pilares`).toContain("PILARES");
    }
    expect(CAPSULA).toContain("PILARES.map(");
    expect(CHROME).toContain("PILARES.map(");
    expect(FILA).toContain("PILARES.map(");
    expect(RODAPE).toContain("...PILARES.map(");
  });

  it("nenhuma superfície escreve um PILAR à mão", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ O QUE SE MEDE É A LISTA, NÃO CADA LIGAÇÃO                      │
    // │                                                               │
    // │ Uma superfície pode ter uma ligação para uma secção — o «Ver   │
    // │ tudo» da fila aponta para `/ferramentas`, e é conteúdo, não    │
    // │ navegação copiada. O que nunca pode acontecer é os CINCO       │
    // │ PILARES aparecerem escritos noutro sítio: é assim que a        │
    // │ segunda lista nasce, e foi assim que a barra do telemóvel e a  │
    // │ de secretária chegaram a discordar em dois lugares.            │
    // └───────────────────────────────────────────────────────────────┘
    const doPilar = new Set(PILARES.map((p) => p.href));
    for (const [nome, fonte] of [...TODAS_AS_SUPERFICIES, ["folha do menu", MENU] as const]) {
      const literais = [...semComentarios(fonte).matchAll(/href[:=]\s*["'{]?"?(\/[^"'\s}]*)"?/g)]
        .map((m) => m[1])
        .filter((href) => doPilar.has(href));
      expect(literais, `${nome} escreve pilares à mão: ${literais.join(", ")}`).toHaveLength(0);
    }
  });

  it("o rodapé leva os cinco pilares, com o canónico verdadeiro", () => {
    // Tinha «Calculadora de recibos verdes» a apontar para `/#calculadora`
    // — o TOPO da homepage, e não uma página. É o defeito P0-02.
    for (const pilar of PILARES) {
      expect(RODAPE.includes("...PILARES.map("), `rodapé sem os pilares (${pilar.id})`).toBe(true);
    }
    expect(semComentarios(RODAPE)).not.toContain('href: "/#calculadora"');
  });
});

describe("navegacao:barra-de-seccoes", () => {
  it("mostra um SUBCONJUNTO das secções, filtrado na fonte", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ A TENTAÇÃO ERA ESCREVER OS QUATRO RÓTULOS OUTRA VEZ            │
    // │                                                               │
    // │ E era exactamente o defeito que este ficheiro existe para não  │
    // │ repetir. A barra do topo e a folha do menu são a MESMA lista   │
    // │ vista com dois recortes: quem declara `topo` aparece nas duas, │
    // │ quem não declara aparece só na folha. Acrescentar uma secção   │
    // │ nova ao menu deixa de poder pô-las a discordar.                 │
    // └───────────────────────────────────────────────────────────────┘
    expect(SECBAR).toContain("SECOES_TOPO.map(");
    expect(SECOES_TOPO.length).toBeGreaterThan(0);
    for (const s of SECOES_TOPO) {
      expect(SECOES, `«${s.label}» está na barra do topo e não é uma secção`).toContain(s);
    }
    // ┌───────────────────────────────────────────────────────────────┐
    // │ «SIMULAR» É O PRIMEIRO, E A ORDEM ESTÁ PINADA                  │
    // │                                                               │
    // │ Esteve fora da barra, com o argumento de que o hub já estava a │
    // │ um clique de qualquer pilar. É verdade e é irrelevante: chegar │
    // │ lá A PARTIR de um pilar não é o mesmo que chegar lá sem ter    │
    // │ escolhido pilar nenhum — que é o estado de quem ainda não sabe │
    // │ qual é o seu.                                                  │
    // │                                                               │
    // │ Fica à esquerda de «Guias», onde sempre esteve, porque é a     │
    // │ ordem que quem já usa o site tem na memória.                    │
    // └───────────────────────────────────────────────────────────────┘
    const naBarra = SECOES_TOPO.map((s) => s.href);
    expect(naBarra).toContain("/ferramentas");
    expect(naBarra.indexOf("/ferramentas")).toBeLessThan(naBarra.indexOf("/guias"));
  });

  it("«Simular» é o nome VISÍVEL e o nome ACESSÍVEL — não um por cima do outro", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ NADA DE `aria-label` A REPOR O RÓTULO LONGO                    │
    // │                                                               │
    // │ A folha diz «Todas as ferramentas» e a barra diz «Simular» —   │
    // │ dois recortes do mesmo destino, o mesmo padrão de              │
    // │ `Pilar.curto`. A tentação é pôr o longo num `aria-label` «para │
    // │ ser mais descritivo», e isso quebra WCAG 2.5.3: o nome         │
    // │ acessível deixa de conter o texto visível, e quem usa comando  │
    // │ de voz diz «Simular» a um alvo que se chama outra coisa.        │
    // └───────────────────────────────────────────────────────────────┘
    const ferramentas = SECOES.find((s) => s.id === "ferramentas");
    expect(ferramentas?.curto).toBe("Simular");
    expect(SECBAR).toContain("{secao.curto ?? secao.label}");
    // Só nas LIGAÇÕES. O `<nav aria-label="Secções">` é outra coisa — é o
    // nome do marco, que não tem texto visível nenhum para contradizer.
    const ligacao = semComentarios(SECBAR).slice(
      semComentarios(SECBAR).indexOf("<Link"),
      semComentarios(SECBAR).indexOf("</Link>"),
    );
    expect(ligacao).not.toContain("aria-label");
  });

  it("é um nível ABAIXO da navegação, e o desenho di-lo", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ O RANK NÃO VEM DO TAMANHO — VEM DO PESO E DO CONTENTOR         │
    // │                                                               │
    // │ As duas filas têm o mesmo corpo de letra. O que as separa é a  │
    // │ navegação estar em negrito, dentro de uma bandeja, com o       │
    // │ activo em relevo, e esta ser texto de peso normal sem          │
    // │ contentor nenhum. Um pixel de diferença de tamanho não se lê;  │
    // │ isto lê-se de relance.                                         │
    // │                                                               │
    // │ Duas filas de ligações com o mesmo tratamento seriam duas      │
    // │ navegações principais — o problema que a reestruturação foi    │
    // │ resolver. Se alguém lhes der o mesmo peso, isto reprova.        │
    // └───────────────────────────────────────────────────────────────┘
    // A bandeja e o relevo do pilar aceso são da navegação, não daqui: esta
    // fila são ligações soltas sobre o cartão, sem contentor nenhum.
    // `rounded-full bg-stone-100` e não só a cor: um `hover:bg-stone-100`
    // nestas ligações é uma lavagem de rato, não uma bandeja.
    expect(SECBAR).not.toContain("rounded-full bg-stone-100");
    expect(SECBAR).not.toContain("shadow-card");
    expect(CAPSULA).toContain("rounded-full bg-stone-100");
    expect(CAPSULA).toContain("shadow-card");
  });

  it("«Sugestões» é uma acção e não finge ser um destino", () => {
    // Os outros levam a uma página; este abre uma caixa de escrita. Uma
    // régua separa-os, e é um `<button>` e não uma `<a>`.
    expect(SECBAR).toContain("abrirFeedback");
    expect(SECBAR).toContain('type="button"');
    expect(SECBAR).toMatch(/w-px[\s\S]{0,400}abrirFeedback/);
  });

  it("acende como qualquer outro destino, e pela mesma função", () => {
    expect(SECBAR).toContain("hrefAtivo(pathname)");
    expect(SECBAR).toContain('aria-current={ativo ? "page" : undefined}');
    // O marco tem nome próprio: dois `<nav>` sem distinção no mesmo
    // cabeçalho dizem a um leitor de ecrã que há duas navegações iguais.
    expect(SECBAR).toContain('aria-label="Secções"');
    expect(CAPSULA).toContain('aria-label="Principal"');
  });
});

describe("navegacao:contrato-dos-destinos", () => {
  it("todo o pilar aponta para o canónico de uma ferramenta real", () => {
    const porId = new Map(CATALOGO_FERRAMENTAS.map((f) => [f.id, f]));
    for (const pilar of PILARES) {
      const ferramenta = porId.get(pilar.toolId);
      expect(ferramenta, `${pilar.id}: ferramenta ${pilar.toolId} não existe`).toBeDefined();
      expect(pilar.href).toBe(ferramenta!.canonicalHref);
    }
  });

  it("uma experiência editorial nunca substitui o canónico da ferramenta", () => {
    const adaptativos = PILARES.filter((pilar) => pilar.homepageHref);
    expect(adaptativos.map((pilar) => pilar.id)).toEqual(["descobrir", "preco"]);

    for (const pilar of adaptativos) {
      // A porta editorial é uma query da homepage; o canónico é a rota da
      // ferramenta. Se um dia o `homepageHref` passasse a apontar para
      // `/ferramentas/…`, o menu, o rodapé e a pesquisa deixavam de ter um
      // destino distinto — e a homepage adaptada deixava de ser alcançável.
      expect(pilar.homepageHref).toBe(`/?foco=${pilar.id}`);
      expect(pilar.href.startsWith("/ferramentas/")).toBe(true);
      expect(pilar.href).not.toContain("?");
    }
  });

  it("não há um único destino repetido em toda a navegação", () => {
    // Dois caminhos para o mesmo sítio na mesma superfície ensinam duas
    // convenções para a mesma coisa.
    const hrefs = [...PILARES.map((p) => p.href), ...MENU_GRUPOS.flatMap((g) => g.entradas).map((e) => e.href)];
    const repetidos = hrefs.filter((h, i) => hrefs.indexOf(h) !== i);
    expect(repetidos, `destinos repetidos: ${[...new Set(repetidos)].join(", ")}`).toHaveLength(0);
  });

  it("as secções que saíram da barra continuam todas alcançáveis", () => {
    const hrefs = MENU_GRUPOS.flatMap((g) => g.entradas).map((e) => e.href);
    for (const rota of SECOES.map((s) => s.href)) {
      expect(hrefs, `${rota} saiu da barra e não está no menu`).toContain(rota);
    }
  });

  it("o pilar ganha à secção, e nunca acendem os dois", () => {
    expect(destinoAtivo("/ferramentas/recibos-verdes")?.tipo).toBe("pilar");
    expect(hrefAtivo("/ferramentas/simulador-irs")).toBe("/ferramentas");
    expect(destinoAtivo("/")).toBeNull();
  });
});

describe("navegacao:acessibilidade", () => {


  it("há UM marco de navegação principal, e é a cápsula", () => {
    // O cabeçalho era `<nav aria-label="Principal">` e a cápsula é outro:
    // dois marcos com o mesmo nome no mesmo documento dizem a um leitor de
    // ecrã que há duas navegações principais.
    expect(CAPSULA).toContain('aria-label="Principal"');
    // `semComentarios` porque o quadro do `Nav.tsx` CITA o atributo para
    // explicar porque é que ele já não está lá — apagar a explicação seria
    // exactamente a saída errada.
    expect(semComentarios(NAV)).not.toContain('aria-label="Principal"');
    expect(NAV).toContain("<header");
  });

  it("o nome acessível de um destino nunca depende da largura do ecrã", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ DUAS SUPERFÍCIES, DUAS QUANTIDADES DE ESPAÇO, UM SÓ NOME       │
    // │                                                               │
    // │ A cápsula tem uma linha inteira: mostra o nome COMPLETO em     │
    // │ qualquer largura de secretária. A barra do telemóvel tem cinco │
    // │ lugares a dividir 360 px: mostra o CURTO — e carrega o completo │
    // │ em `aria-label`, porque o que um leitor de ecrã anuncia não     │
    // │ pode depender do tamanho do ecrã.                              │
    // └───────────────────────────────────────────────────────────────┘
    expect(CAPSULA).toContain("aria-label={pilar.label}");
    expect(CAPSULA).toContain('<span className="truncate">{pilar.label}</span>');
    // O rótulo curto é da barra do telemóvel — na cápsula seria uma segunda
    // regra a decidir o que se vê, e foi de onde veio a troca de rótulos por
    // largura que a linha própria tornou desnecessária.
    expect(semComentarios(CAPSULA)).not.toContain("pilar.curto");
    expect(CHROME).toContain("aria-label={slot.nomeCompleto}");
    expect(CHROME).toContain("label: p.curto");
  });

  it("é o `aria-current` que comanda a pintura, e não uma classe", () => {
    // Assim o DOM carrega o estado para a tecnologia de apoio e a pintura
    // segue-o, em vez de serem duas verdades a manter à mão.
    for (const [nome, fonte] of [["cápsula", CAPSULA], ["barra do telemóvel", CHROME]] as const) {
      expect(fonte, `${nome} sem aria-current`).toContain('aria-current=');
      expect(fonte, `${nome} devia anunciar "page"`).toContain('"page"');
    }
  });

  it("o gatilho do menu declara que abre um diálogo, nas duas superfícies", () => {
    for (const [nome, fonte] of [["cabeçalho", NAV], ["linha da marca do telemóvel", MARCA]] as const) {
      expect(fonte, `${nome}: gatilho sem aria-haspopup`).toContain('aria-haspopup="dialog"');
      expect(fonte, `${nome}: gatilho sem aria-expanded`).toContain("aria-expanded=");
    }
    // E NÃO dentro da bandeja: «Menu» não é o sexto pilar. Esteve lá,
    // separado por uma régua, e uma régua é sinal fraco de mais para dizer
    // «isto é de outra natureza».
    expect(semComentarios(CAPSULA)).not.toContain("aria-haspopup");
  });

  it("cada gatilho do menu tem nome próprio, e não só o papel", () => {
    // `aria-haspopup="dialog"` diz o que o botão FAZ, não qual dos dois é.
    // As duas superfícies estão sempre montadas e há outros botões no
    // produto que abrem diálogos — na homepage o «Como funciona» do hero
    // vem antes destes no documento. É o mesmo contrato que a pesquisa já
    // tem em `data-busca-gatilho`.
    expect(NAV).toContain('data-menu-gatilho="secretaria"');
    expect(MARCA).toContain('data-menu-gatilho="movel"');
  });
});

describe("navegacao:cartao-do-cabecalho", () => {
  it("o cabeçalho é um CARTÃO a flutuar, e não uma faixa", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ A FAIXA PUNHA O CABEÇALHO NOUTRO SISTEMA                       │
    // │                                                               │
    // │ Era de extremo a extremo, com uma régua por baixo, enquanto a  │
    // │ página é uma pilha de cartões brancos sobre papel quente. Duas │
    // │ gramáticas coladas uma à outra.                                │
    // │                                                               │
    // │ Agora é o primeiro desses cartões: margem à volta, cantos de   │
    // │ 2 rem, sombra, e o papel da página a passar-lhe ao lado. A     │
    // │ régua inferior desaparece porque a sombra e a margem já dizem  │
    // │ onde ele acaba.                                                │
    // └───────────────────────────────────────────────────────────────┘
    expect(NAV).toContain("rounded-4xl");
    // O elemento fixo é só geometria: sem fundo, sem contorno, sem régua.
    // Quem tem material é o cartão lá dentro.
    expect(NAV).toContain(
      'className="fixed inset-x-0 top-0 z-50 hidden px-6 pt-[var(--rc-header-margem)] lg:block"',
    );
    // A margem e o `padding` do cartão entram na conta que o espaçador
    // reserva — senão o conteúdo nasce por baixo dele.
    expect(CSS).toMatch(/--rc-header-compacto:\s*calc\([\s\S]*--rc-header-margem/);
    expect(CSS).toMatch(/--rc-header-compacto:\s*calc\([\s\S]*--rc-cartao-p/);
    // E a altura aberta cresce a partir da fechada, em vez de repetir a
    // conta: duas somas independentes divergiriam à primeira afinação.
    expect(CSS).toMatch(/--rc-header-alto:\s*calc\([\s\S]*--rc-header-compacto/);
  });

  it("as três linhas do cabeçalho têm a mesma largura", () => {
    // Houve uma versão em que a bandeja e a barra tinham 704 px e a
    // primeira linha ocupava o contentor todo: num ecrã largo dava um «T»,
    // e o desequilíbrio não era de espaçamento — era duas das três linhas
    // não pertencerem à mesma grelha. Nenhuma leva largura própria: são
    // filhas do cartão, e o cartão é uma coluna só.
    expect(semComentarios(NAV)).not.toContain("max-w-[var(--rc-dock-larga)]");
    expect(semComentarios(CAPSULA)).not.toContain("max-w-");
    expect(CAPSULA).toContain("flex w-full");
  });

  it("nasce ABERTO, e recolhe ao descer na página", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ ABERTO À ENTRADA, RECOLHIDO A LER                              │
    // │                                                               │
    // │ Quem chega precisa de ver para onde pode ir; quem já está a    │
    // │ ler precisa do ecrã. São dois momentos e não têm de ter a      │
    // │ mesma resposta: o cartão nasce com as três linhas e recolhe    │
    // │ para uma quando a faixa que ele reserva sai do ecrã.            │
    // │                                                               │
    // │ O que NUNCA recolhe é a primeira linha. A marca, as secções,   │
    // │ a conta e o «Começar» ficam. Um cabeçalho que se despe às      │
    // │ peças ao rolar já foi tentado e lê-se como avaria.              │
    // │                                                               │
    // │ `hidden` e não altura zero com `overflow-hidden`: o painel da  │
    // │ pesquisa é `position:absolute` dentro do cartão, e um          │
    // │ `overflow-hidden` cortava-o ao abrir. É também por isso que a  │
    // │ mudança é instantânea — animar a altura obrigaria ao mesmo     │
    // │ corte durante a transição.                                     │
    // └───────────────────────────────────────────────────────────────┘
    expect(NAV).toContain("useState(true)");
    expect(NAV).toContain("const corpoVisivel = (abertoManual && !recolhidoPorScroll) || buscaAberta;");
    expect(NAV).toContain("hidden={!corpoVisivel}");
    expect(NAV).toContain("data-cabecalho-alternar");
    expect(NAV).toContain('aria-controls="rc-cabecalho-corpo"');
    expect(NAV).toContain("aria-expanded={corpoVisivel}");
    // A escolha é do momento e não do aparelho: nada de `localStorage`. Um
    // cabeçalho que abre fechado porque alguém o fechou há três semanas
    // contradiz «à entrada aparece aberto».
    expect(semComentarios(NAV)).not.toContain("localStorage");
  });

  it("o corpo recolhido NUNCA leva o foco consigo", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ ESCONDER O QUE TEM O FOCO ATIRA-O PARA O `<body>`              │
    // │                                                               │
    // │ Já aconteceu: com o campo de pesquisa em `display:none`,       │
    // │ fechar o painel com Escape deixava o foco no `<body>`, porque  │
    // │ o efeito que o devolve chama `focus()` num elemento que já não │
    // │ é focável. Quem navega por teclado recomeçava a tabulação no   │
    // │ topo do documento. Apanhado pelo `verificar-cabecalho.mjs`.     │
    // │                                                               │
    // │ Agora que o scroll também recolhe, há DUAS defesas:            │
    // │  · `corpoVisivel` inclui `buscaAberta` — com o painel aberto o │
    // │    campo existe, aconteça o que acontecer ao scroll;           │
    // │  · o observador recusa recolher se o foco estiver lá dentro.   │
    // └───────────────────────────────────────────────────────────────┘
    expect(NAV).toContain("corpo?.contains(document.activeElement)");
    expect(NAV).toContain("if (buscaAberta) {");
    expect(NAV).toContain("setRecolhidoPorScroll(false);");
  });

  it("o clique com o cartão recolhido pelo scroll ABRE — nunca fecha", () => {
    // A lingueta diz «Navegação e pesquisa» quando está recolhido pelo
    // scroll, portanto o clique é abrir. Alternar `abertoManual` aqui
    // punha-o a `false` — estava a `true` todo esse tempo, só escondido —
    // e o cartão ficava igual, como se o clique não tivesse feito nada.
    const alternar = NAV.slice(NAV.indexOf("const alternar = () =>"));
    expect(alternar.slice(0, 220)).toContain("if (recolhidoPorScroll)");
  });

  it("o espaçador e as âncoras leem a altura ACTUAL, não uma das duas", () => {
    // Duas alturas e três interessados — o espaçador em fluxo, o
    // `scroll-padding-top` e o `scroll-margin-top`. Cada um a decidir por si
    // divergia em silêncio: o conteúdo nascia por baixo do cartão, ou com um
    // buraco à frente. A ponte é `:has()`, para o valor mudar no MESMO frame
    // em que o cartão muda, sem um efeito a escrever no DOM pelo meio.
    expect(CSS).toContain("--rc-header-atual");
    // `data-reserva` e NÃO `data-expandido`: o espaçador está em fluxo, e
    // encolhê-lo a meio da leitura tira 116 px ao documento e atira o
    // conteúdo todo para cima enquanto a pessoa rola. Recolher ao rolar
    // deixa a reserva onde está — acima da dobra, onde ninguém a vê.
    expect(CSS).toContain(':root:has(header[data-reserva="baixa"])');
    expect(semComentarios(CSS)).not.toContain('header[data-expandido');
    expect(NAV).toContain('data-reserva={abertoManual ? "alta" : "baixa"}');
    // E o padrão é a altura ABERTA, porque é assim que o cartão nasce:
    // escrever o contrário dava um salto no primeiro frame de cada
    // carregamento.
    expect(CSS).toContain("--rc-header-atual: var(--rc-header-alto);");
    expect(CSS).toContain("scroll-padding-top: calc(var(--rc-header-atual)");
    expect(CSS).toContain("scroll-margin-top: calc(var(--rc-header-atual)");
    expect(NAV).toContain("h-[var(--rc-header-atual)]");
    // O contorno do cartão entra na conta: `border-box` não o absorve, e o
    // espaçador ficava 2 px curto — medido, e o `navegacao:e2e` reprova-o.
    expect(CSS).toContain("--rc-cartao-borda");
    expect(CSS).toMatch(/--rc-header-compacto:\s*calc\([\s\S]*--rc-cartao-borda/);
  });

  it("ao rolar muda a sombra e o CORPO — nunca a primeira linha", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ DUAS TENTATIVAS DE ENCOLHER, DOIS CUSTOS MAIORES QUE OS PÍXEIS │
    // │                                                               │
    // │ Recolher a primeira linha fazia sumir a marca, as secções, a   │
    // │ conta e o «Começar» de uma vez — um cabeçalho que fica no ecrã  │
    // │ e se despe às peças lê-se como avaria.                          │
    // │                                                               │
    // │ Recolher só a da pesquisa partia o teclado: com o campo em      │
    // │ `display:none`, fechar o painel com Escape deixava o foco no    │
    // │ `<body>`. Está pinado em `verificar-cabecalho.mjs`.             │
    // │                                                               │
    // │ Sobra o que o scroll pode mudar: a sombra do cartão, e o corpo  │
    // │ (navegação + pesquisa) — que tem lingueta própria para voltar.  │
    // │ A primeira linha é a que fica.                                   │
    // └───────────────────────────────────────────────────────────────┘
    expect(semComentarios(NAV)).not.toContain("group-data-[compacto=true]");
    // A sentinela do recolher é uma CAIXA com a altura que o cabeçalho
    // aberto reserva — e altura fixa, não a actual: se seguisse a actual, o
    // limiar mudava de sítio de cada vez que o cartão mudava de tamanho.
    expect(NAV).toContain("h-[var(--rc-header-alto)]");
    expect(NAV).toContain("sentinelaRecolher");
    expect(NAV).toContain("transition-shadow");
    expect(NAV).toContain("data-opaco={opaco}");
    expect(NAV).toContain("shadow-float");
  });
});
