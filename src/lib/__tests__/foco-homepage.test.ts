import { describe, expect, it } from "vitest";
import { FOCOS_HOMEPAGE, normalizarFocoHomepage } from "@/lib/foco-homepage";
import { PILARES, hrefDaSuperficiePilar } from "@/lib/navegacao";
import {
  FOCOS,
  FOCO_POR_ID,
  FOCO_DO_PERFIL_ANTIGO,
  PERFIL_DO_FOCO,
} from "@/components/foco/focos";

describe("homepage adaptativa", () => {
  it("mantém Empresa imediatamente antes de Salário em todas as fontes", () => {
    const ordem = ["descobrir", "preco", "recibos", "empresa", "salario"];

    expect([...FOCOS_HOMEPAGE]).toEqual(ordem);
    expect(FOCOS.map((foco) => foco.id)).toEqual(ordem);
    expect(PILARES.map((pilar) => pilar.id)).toEqual(ordem);
  });

  it("reconhece os cinco focos, e cada um existe de ponta a ponta", () => {
    // ⚠️ Este teste fixava a lista literal `["descobrir", "preco"]`.
    //
    // Quando a homepage passou de dois focos para cinco, partiu — não por
    // ter apanhado um defeito, mas por estar a medir o número de focos em
    // vez do CONTRATO. O contrato é: nenhum foco é aceite sem que exista
    // uma página por trás dele, e a lista dos aceites é exatamente a dos
    // declarados.
    expect([...FOCOS_HOMEPAGE].sort()).toEqual(FOCOS.map((f) => f.id).sort());

    for (const foco of FOCOS) {
      expect(normalizarFocoHomepage(foco.id)).toBe(foco.id);
    }
    // O primeiro valor ganha quando o parâmetro vem repetido.
    expect(normalizarFocoHomepage(["preco", "descobrir"])).toBe("preco");
    expect(normalizarFocoHomepage("qualquer-coisa")).toBeNull();
    expect(normalizarFocoHomepage(undefined)).toBeNull();
  });

  it("todo o foco reconhecido corresponde a um pilar que o declara", () => {
    // Os dois lados do contrato: `FOCOS_HOMEPAGE` diz o que a página sabe
    // renderizar, `homepageHref` diz o que a navegação sabe abrir. Se
    // divergirem, ou há um separador que não leva a lado nenhum ou uma
    // experiência que ninguém consegue alcançar.
    const declarados = PILARES.filter((pilar) => pilar.homepageHref).map((pilar) => pilar.id);
    expect([...FOCOS_HOMEPAGE].sort()).toEqual([...declarados].sort());

    for (const pilar of PILARES) {
      expect(pilar.homepageHref, `${pilar.id} sem porta editorial`).toBe(`/?foco=${pilar.id}`);
      expect(normalizarFocoHomepage(pilar.id)).toBe(pilar.id);
    }
  });

  it("os cinco pilares têm porta editorial — a régua é homogénea", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ É ISTO QUE O DEFEITO MAIS GRAVE ERA                            │
    // │                                                               │
    // │ Dois pilares levavam a `/?foco=…` e trocavam o conteúdo na    │
    // │ mesma página; três levavam a `/ferramentas/<slug>` e saíam    │
    // │ dela. A NN/g é explícita: misturar separadores de página com  │
    // │ separadores de navegação no mesmo controlo desorienta.        │
    // │                                                               │
    // │ Se algum dia um pilar voltar a ficar sem `homepageHref`, a    │
    // │ régua volta a mentir — e este teste é o que impede isso de    │
    // │ acontecer em silêncio.                                        │
    // └───────────────────────────────────────────────────────────────┘
    expect(PILARES.every((pilar) => Boolean(pilar.homepageHref))).toBe(true);
    expect(PILARES).toHaveLength(FOCOS.length);
  });

  it("mantém o canónico da ferramenta separado da porta editorial", () => {
    // A régua leva à LEITURA; o CTA do hero leva à FERRAMENTA. As duas
    // tabelas têm de concordar sobre qual é qual.
    for (const pilar of PILARES) {
      const foco = FOCO_POR_ID.get(pilar.id as never);
      expect(foco, `o pilar ${pilar.id} não tem foco`).toBeDefined();
      expect(hrefDaSuperficiePilar(pilar)).toBe(`/?foco=${pilar.id}`);
      expect(pilar.href).toBe(foco!.ferramenta);
      expect(pilar.href.startsWith("/ferramentas/")).toBe(true);
    }
  });

  it("o perfil antigo aponta para um foco que existe", () => {
    // A migração de quem tem `perfil` guardado de visitas anteriores. Só
    // serve para MARCAR a régua — nunca para navegar. Redirecionar alguém
    // a partir de estado invisível é o defeito que esta reestruturação
    // existe para corrigir, com outra roupa.
    for (const [perfil, foco] of Object.entries(FOCO_DO_PERFIL_ANTIGO)) {
      expect(normalizarFocoHomepage(foco), `${perfil} → ${foco}`).toBe(foco);
    }
    // Os quatro perfis antigos, todos cobertos.
    expect(Object.keys(FOCO_DO_PERFIL_ANTIGO).sort()).toEqual([
      "comparar",
      "dependente",
      "empresa",
      "independente",
    ]);
    // «Comparar» deixou de ser um modo e passou a viver dentro de
    // Descobrir: quem o tinha guardado abre a mesa de decisão.
    expect(FOCO_DO_PERFIL_ANTIGO.comparar).toBe("descobrir");
  });

  it("cada foco tem uma pergunta e um verbo que mais nenhum tem", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ A REGRA QUE IMPEDE A RECAÍDA                                  │
    // │                                                               │
    // │ Havia UM `HeroCard` com uma coreografia só, e três dos quatro │
    // │ cartões declaravam `modoLinhas: "deducoes"` — Recibos verdes, │
    // │ Salário e Empresa mostravam a mesma cascata de deduções com   │
    // │ números diferentes. Uma máquina com três fatos, não três      │
    // │ palcos.                                                       │
    // │                                                               │
    // │ Com cinco verbos distintos, nenhum palco pode voltar a ser a  │
    // │ cascata do vizinho: só um dos cinco tem «repartir».           │
    // └───────────────────────────────────────────────────────────────┘
    const verbos = FOCOS.map((f) => f.verbo);
    expect(new Set(verbos).size).toBe(FOCOS.length);
    expect([...verbos].sort()).toEqual([
      "compor",
      "conferir",
      "eliminar",
      "repartir",
      "virar",
    ]);

    const perguntas = FOCOS.map((f) => f.pergunta);
    expect(new Set(perguntas).size).toBe(FOCOS.length);
    for (const pergunta of perguntas) expect(pergunta.endsWith("?")).toBe(true);

    // E cinco palcos com nomes distintos: dois focos com o mesmo palco
    // seriam dois focos a mais.
    expect(new Set(FOCOS.map((f) => f.palco)).size).toBe(FOCOS.length);
  });

  it("as duas metades da homepage falam a mesma língua", () => {
    // ┌─────────────────────────────────────────────────────────────────┐
    // │ O CONTRATO QUE VOLTOU A LIGAR `/`                               │
    // │                                                                 │
    // │ A homepage tem dois eixos: `foco` (a pergunta, no URL, manda no │
    // │ hero) e `Perfil` (em `localStorage`, manda na calculadora, no   │
    // │ «Explorar» e no FAQ). Enquanto o hero antigo existiu era ele    │
    // │ que escrevia o `Perfil`; ao substituí-lo pela bússola, as duas  │
    // │ metades deixaram de se falar — escolhias uma pergunta em cima e │
    // │ a calculadora continuava no que estivesse guardado de uma       │
    // │ visita anterior.                                                │
    // │                                                                 │
    // │ `PERFIL_DO_FOCO` é o caminho de volta, e tem de ser a INVERSA   │
    // │ EXATA da migração. Duas tabelas escritas à mão é ter duas       │
    // │ respostas para a mesma pergunta — que é o defeito de origem     │
    // │ desta página, com outra roupa.                                  │
    // └─────────────────────────────────────────────────────────────────┘
    for (const [perfil, foco] of Object.entries(FOCO_DO_PERFIL_ANTIGO)) {
      expect(PERFIL_DO_FOCO[foco], `${foco} tem de voltar a ${perfil}`).toBe(perfil);
    }
    for (const [foco, perfil] of Object.entries(PERFIL_DO_FOCO)) {
      expect(FOCO_DO_PERFIL_ANTIGO[perfil as string]).toBe(foco);
    }

    // É parcial de propósito: «Preço» não tem simulador na homepage.
    // Inventar-lhe um perfil levava a pergunta a um simulador que não a
    // responde — e nenhum outro foco pode ficar de fora sem razão.
    expect(PERFIL_DO_FOCO.preco).toBeUndefined();
    expect(Object.keys(PERFIL_DO_FOCO).sort()).toEqual(
      FOCOS.map((f) => f.id)
        .filter((id) => id !== "preco")
        .sort(),
    );
  });

  it("a porta editorial nunca carrega o parâmetro de perfil antigo", () => {
    for (const pilar of PILARES) {
      expect(pilar.homepageHref ?? "").not.toContain("modo=");
      expect(pilar.homepageHref ?? "").not.toContain("perfil=");
    }
  });
});
