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
const TOPO = ler("components", "ChromeMobileTopo.tsx");
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
    // «Todas as ferramentas» fica de fora de propósito: o hub já está a um
    // clique de qualquer pilar e da fila da página inicial.
    expect(SECOES_TOPO.map((s) => s.href)).not.toContain("/ferramentas");
  });

  it("é um nível ABAIXO da cápsula, e o desenho di-lo", () => {
    // Duas filas de ligações com o mesmo peso seriam duas navegações
    // principais — o problema que a reestruturação foi resolver. A barra é
    // texto pequeno sem pastilha; a cápsula tem ícone, forma e a cor da
    // marca. Se um dia alguém lhes der o mesmo tratamento, isto reprova.
    expect(SECBAR).toContain("text-[13px]");
    expect(SECBAR).not.toContain("rc-capsula");
    expect(CAPSULA).toContain("rc-capsula");
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
  it("a barra de pesquisa vive numa linha só, em qualquer estado", () => {
    // Subia para o meio da primeira linha ao compactar e ficava encravada
    // entre a marca e a conta. Agora o que recolhe é a PRIMEIRA linha.
    expect(NAV).toContain("row-start-3");
    expect(semComentarios(NAV)).not.toContain("group-data-[compacto=true]:row-start-1");
    expect(NAV).toContain("group-data-[compacto=true]:grid-rows-[0px_var(--rc-linha-nav)_var(--rc-linha-busca)]");
  });

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
    expect(CAPSULA).toContain("<span>{pilar.label}</span>");
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
    for (const [nome, fonte] of [["cápsula", CAPSULA], ["topo do telemóvel", TOPO]] as const) {
      expect(fonte, `${nome}: gatilho sem aria-haspopup`).toContain('aria-haspopup="dialog"');
      expect(fonte, `${nome}: gatilho sem aria-expanded`).toContain("aria-expanded=");
    }
  });
});

describe("navegacao:material-da-capsula", () => {
  const iBase = CSS.indexOf(".rc-capsula {");
  const iSupports = CSS.indexOf("@supports ((backdrop-filter: blur(1px))");
  const iReduzida = CSS.indexOf("@media (prefers-reduced-transparency: reduce)");

  it("o fundo SÓLIDO é a regra base, e o vidro só é promovido depois", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ A ORDEM NÃO É ESTILÍSTICA                                      │
    // │                                                               │
    // │ `backdrop-filter` falha em silêncio onde não é suportado. Se a │
    // │ regra do vidro escrever o fundo, o que fica nesses browsers é  │
    // │ uma cápsula translúcida com o texto da página a ler-se por     │
    // │ trás dos rótulos. O sólido primeiro é o que garante que o pior │
    // │ caso é «sem efeito», e nunca «ilegível».                        │
    // └───────────────────────────────────────────────────────────────┘
    expect(iBase).toBeGreaterThan(-1);
    expect(iSupports).toBeGreaterThan(iBase);
    const base = CSS.slice(iBase, iSupports);
    expect(base).toContain("background: var(--rc-capsula-fundo)");
  });

  it("a preferência do sistema desliga o vidro E repõe o fundo opaco", () => {
    // Apagar só o desfoque deixaria a cor a 66% — ou seja, o problema que
    // a preferência existe para evitar, com um passo a menos.
    expect(iReduzida).toBeGreaterThan(iSupports);
    const bloco = CSS.slice(iReduzida, iReduzida + 400);
    expect(bloco).toContain(".rc-capsula");
    expect(bloco).toContain("backdrop-filter: none");
    expect(bloco).toContain("background: var(--rc-capsula-fundo)");
  });

  it("o material tem tokens para os dois temas", () => {
    // Um hexadecimal escrito à mão aqui parte o modo claro ou o escuro na
    // primeira afinação — e em silêncio, porque nada falha.
    expect(CSS).toContain("--rc-capsula-fundo");
    expect(CSS).toMatch(/\.dark\s*\{[^}]*--rc-capsula-fundo/);
  });
});
