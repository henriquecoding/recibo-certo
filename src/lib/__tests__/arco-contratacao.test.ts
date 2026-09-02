// ═══════════════════════════════════════════════════════════════════════
//  O QUARTO PASSO DO ARCO — o que não pode voltar a desaparecer
//  ---------------------------------------------------------------------
//  O defeito auditado: o painel declarava quatro etapas de negócio
//  (descobrir → preço → projeto → contratar) e a leitura pública só
//  contava três. «Depois do preço» bifurcava em recibos verdes e empresa e
//  acabava ali; o planeador de contratação só se alcançava pelo lado
//  patronal do foco «Salário», atrás de um botão que ninguém carrega sem
//  já saber que ele existe; e a única menção a salário nas outras leituras
//  mandava quem tem negócio simular o recibo de vencimento DELE.
//
//  E uma segunda vez, em ponto pequeno: a correção inicial tratou três
//  leituras e esqueceu a raiz — `/`, que desenha o MESMO percurso noutro
//  ficheiro. O teste percorria a lista que ele próprio escrevia, portanto
//  não podia apanhar a página que faltava. Agora percorre `ORIGENS_ARCO`,
//  e exige que as leituras conhecidas sejam exatamente essas.
//
//  Estes testes prendem as quatro propriedades que fecham o buraco:
//   ① o passo aparece em TODAS as leituras do arco;
//   ② a moldura vem de UMA tabela, não de copy repetida em cada página;
//   ③ o lado patronal tem percurso próprio e passagem explicada;
//   ④ o guia e a ferramenta da mesma decisão conhecem-se um ao outro.
//
//  Não há jsdom nesta suíte, por isso a parte de UI lê a fonte como texto
//  — o mesmo método de `salario-contratacao-mobile.test.ts`, e pela mesma
//  razão: sem browser, prende-se o que se consegue prender.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGO_FERRAMENTAS, PERCURSOS, percursosCom } from "@/lib/ferramentas";
import { GUIDE_MANIFESTS } from "@/lib/guias/manifests";
import { FOCOS } from "@/components/foco/focos";
import { ROTA_POR_FOCO } from "@/lib/foco-homepage";
import {
  ENTRADA_CONTRATACAO,
  ORIGENS_ARCO,
  PASSO_CONTRATACAO,
  hrefPlaneador,
  type OrigemArcoContratacao,
} from "@/lib/foco/arco-contratacao";

const SRC = join(__dirname, "..", "..");
const read = (...partes: string[]) => readFileSync(join(SRC, ...partes), "utf8");

/**
 * A leitura de cada origem, indexada pela MESMA chave de `ORIGENS_ARCO`.
 *
 * ── Porque é que este mapa é `Record` e não um objeto solto ───────────
 *
 * A primeira versão listava três páginas à mão e a raiz — `/`, que desenha
 * o mesmo percurso noutro ficheiro — ficou de fora sem nada reprovar: o
 * teste percorria as origens que ele próprio conhecia. Tipar o mapa contra
 * `OrigemArcoContratacao` faz o TypeScript exigir uma entrada por origem,
 * e o `it` por origem exige o cartão. Uma origem nova sem leitura deixa de
 * poder passar em silêncio, que foi exatamente o defeito.
 */
const PAGINAS: Record<OrigemArcoContratacao, string> = {
  descobrir: read("components", "descobrir", "HomepageDescobrir.tsx"),
  preco: read("components", "preco", "HomepagePreco.tsx"),
  recibos: read("components", "foco", "recibos", "HomepageRecibos.tsx"),
  empresa: read("components", "foco", "empresa", "HomepageEmpresa.tsx"),
};

describe("① o passo de contratar está em TODAS as leituras do arco", () => {
  it("as origens declaradas e as leituras com cartão são a mesma lista", () => {
    // A raiz — a leitura «Descobrir» — desenha o percurso 01/02/03 num
    // ficheiro próprio e foi a que ficou esquecida. Esta asserção existe
    // para que «faltou uma página» seja uma falha, e não uma descoberta
    // feita a olhar para o ecrã.
    expect(Object.keys(PAGINAS).sort()).toEqual([...ORIGENS_ARCO].sort());
  });

  for (const origem of ORIGENS_ARCO) {
    it(`«${origem}» mostra o cartão da quarta etapa`, () => {
      expect(
        PAGINAS[origem].includes(`<CartaoContratacao origem="${origem}" />`),
        "o percurso voltou a acabar na escolha da estrutura — quem chega aqui " +
          "fica sem saber que existe um passo a seguir",
      ).toBe(true);
    });
  }

  it("e o cartão não custa JavaScript a nenhuma delas", () => {
    // As quatro rotas têm budget de bundle medido (`homepage:chunks:check`).
    // Um cartão de percurso é markup: se precisar de cliente, é porque
    // alguém lhe pôs estado que ele não devia ter.
    const cartao = read("components", "foco", "CartaoContratacao.tsx");
    expect(cartao.startsWith('"use client"')).toBe(false);
    expect(cartao).not.toMatch(/useState|useEffect/);
  });
});

describe("② a moldura vem da tabela, não de cada página", () => {
  it("nenhuma das leituras escreve o destino à mão", () => {
    for (const [origem, fonte] of Object.entries(PAGINAS)) {
      expect(
        fonte.includes(PASSO_CONTRATACAO.ferramenta),
        `${origem} voltou a escrever o href do planeador — é assim que os ` +
          "percursos começam a discordar",
      ).toBe(false);
    }
  });

  it("cada origem tem a sua razão, e nenhuma repete a do vizinho", () => {
    const textos = ORIGENS_ARCO.map((o) => ENTRADA_CONTRATACAO[o].texto);
    expect(new Set(textos).size).toBe(ORIGENS_ARCO.length);
    for (const origem of ORIGENS_ARCO) {
      const entrada = ENTRADA_CONTRATACAO[origem];
      expect(entrada.sobrancelha.startsWith(PASSO_CONTRATACAO.etapa)).toBe(true);
      expect(entrada.texto.length).toBeGreaterThan(80);
    }
  });

  it("a origem viaja no URL como atribuição, com vocabulário fechado", () => {
    expect(hrefPlaneador("empresa")).toBe(`${PASSO_CONTRATACAO.ferramenta}?de=empresa`);

    const medicao = read("lib", "analytics", "contratacao.ts");
    expect(
      medicao.includes("ORIGENS_ARCO.find"),
      "a origem deixou de ser validada contra a lista — passa a haver um " +
        "caminho do texto do URL até ao payload de medição",
    ).toBe(true);

    const eventos = read("lib", "analytics", "eventos.ts");
    for (const origem of ORIGENS_ARCO) {
      expect(eventos.includes(`"arco-${origem}"`), `arco-${origem} não é vocabulário declarado`).toBe(true);
    }
  });

  it("e o passo NÃO inventou um sexto foco", () => {
    // Cinco perguntas, cinco verbos, cinco rotas, cinco palcos e uma matriz
    // móvel que os mede. Contratar é o outro lado do foco do salário.
    expect(FOCOS).toHaveLength(5);
    expect(PASSO_CONTRATACAO.leitura.startsWith(ROTA_POR_FOCO.salario)).toBe(true);
    expect(PASSO_CONTRATACAO.leitura).toContain("percurso=empregador");
  });
});

describe("③ o lado patronal tem percurso próprio", () => {
  const FORK = read("components", "foco", "salario", "HeroSalarioBifurcado.tsx");

  it("a secção existe e é alcançável", () => {
    expect(FORK).toContain('id="percurso-contratacao"');
    expect(FORK).toContain('aria-labelledby="percurso-contratacao-titulo"');
  });

  it("liga o passo anterior e o guia da decisão", () => {
    expect(FORK).toContain('foco="empresa"');
    expect(FORK).toContain("PASSO_CONTRATACAO.guia");
  });

  it("e explica a passagem para o lado de quem recebe", () => {
    // Sem isto, escolher «para quem contrata» mudava o hero e o método e
    // deixava o resto da página a falar de outra pessoa, sem uma linha a
    // dizer porquê.
    expect(FORK).toContain("Daqui para baixo, a página fala do outro lado");
    expect(FORK).toContain('escolher("trabalhador")');
  });
});

describe("④ o guia e a ferramenta da mesma decisão conhecem-se", () => {
  const planeador = CATALOGO_FERRAMENTAS.find((f) => f.id === "planeador-contratacao")!;
  const guia = GUIDE_MANIFESTS.find((g) => g.id === "contratar-primeiro-trabalhador")!;

  it("a ferramenta aponta para o guia", () => {
    expect(planeador.relatedGuideSlugs).toContain("contratar-primeiro-trabalhador");
  });

  it("o guia aponta para a ferramenta", () => {
    expect(guia.relatedToolIds).toContain("planeador-contratacao");
  });

  it("e o simulador de empresa também, porque o passo vem a seguir a ele", () => {
    const empresa = CATALOGO_FERRAMENTAS.find((f) => f.id === "simulador-empresa")!;
    expect(empresa.relatedToolIds).toContain("planeador-contratacao");
  });

  it("o planeador pertence a um percurso — deixou de ser um destino solto", () => {
    const percursos = percursosCom("planeador-contratacao");
    expect(percursos.length).toBeGreaterThan(0);
    // E o percurso acaba no recibo que a proposta vai gerar: quem contrata
    // só vê esse lado depois de já ter dito um número em voz alta.
    const percurso = PERCURSOS.find((p) => p.id === "contratar-a-primeira-pessoa")!;
    expect(percurso.steps.map((s) => s.toolId)).toEqual([
      "calcular-preco",
      "planeador-contratacao",
      "recibo-vencimento",
    ]);
  });
});
