// ═══════════════════════════════════════════════════════════════════════
//  A ONTOLOGIA — e o modo de falhar mais caro que ela tem
//  ---------------------------------------------------------------------
//  Uma divisão CAE inventada não parte nada. O INE devolve zero empresas
//  para um código que não conhece, zero empresas lê-se como «ninguém faz
//  isto nesta zona», e o motor promove uma hipótese por causa de um erro
//  de digitação. É silencioso, é plausível e é exatamente o tipo de
//  alucinação que este produto existe para não ter.
//
//  Estes testes fecham essa porta: cada divisão usada tem de existir na
//  lista que o próprio INE publica, e cada capacidade do grafo tem de ter
//  uma posição declarada — mesmo que a posição seja «não há CAE para
//  isto», que é uma resposta legítima e frequente.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  CONCEITOS_OPERADOR,
  CONCEITO_POR_CAPACIDADE,
  DIVISOES_USADAS,
} from "@/lib/negocio/descoberta/conhecimento/dados/ontologia";
import { DIVISOES_CAE } from "@/lib/negocio/descoberta/conhecimento/dados/divisoes-cae";
import { CAPACIDADES } from "@/lib/negocio/descoberta/conhecimento/dados/capacidades";
import { COMPETENCIAS } from "@/lib/negocio/descoberta/conhecimento/dados/competencias";
import { CONTEXTO_INICIAL } from "@/lib/negocio/descoberta/contexto/tipos";
import { ATIVOS } from "@/lib/negocio/descoberta/contexto/perguntas";
import { descobrir } from "@/lib/negocio/descoberta/motor/pipeline";
import { MARKET_REGIONS } from "@/lib/negocio/market/geografia";
import { MATRIZ_CONCELHOS } from "@/lib/negocio/market/oferta-concelhos";

describe("ontologia: nenhuma divisão CAE inventada", () => {
  it("todas as divisões usadas existem na nomenclatura do INE", () => {
    const inexistentes = DIVISOES_USADAS.filter((codigo) => !DIVISOES_CAE.has(codigo));
    expect(inexistentes).toEqual([]);
  });

  it("os códigos têm a forma de uma divisão, não de uma secção nem de um total", () => {
    for (const codigo of DIVISOES_USADAS) {
      // Uma secção é uma letra («I»), um total é «TOT». Somar qualquer um
      // deles com uma divisão contaria as mesmas empresas duas vezes.
      expect(codigo).toMatch(/^\d{2}$/);
    }
  });

  it("nenhum conceito repete a mesma divisão duas vezes", () => {
    for (const conceito of CONCEITOS_OPERADOR) {
      expect(new Set(conceito.cae).size).toBe(conceito.cae.length);
    }
  });
});

describe("ontologia: cobre o grafo inteiro, com posição declarada", () => {
  it("cada capacidade do grafo tem um conceito", () => {
    const semConceito = CAPACIDADES.filter((item) => !CONCEITO_POR_CAPACIDADE.has(item.id));
    expect(semConceito.map((item) => item.id)).toEqual([]);
  });

  it("nenhum conceito aponta para uma capacidade que já não existe", () => {
    const ids = new Set(CAPACIDADES.map((item) => item.id));
    const orfaos = CONCEITOS_OPERADOR.filter((item) => !ids.has(item.capacidadeId));
    expect(orfaos.map((item) => item.capacidadeId)).toEqual([]);
  });

  it("nenhuma capacidade aparece duas vezes", () => {
    expect(CONCEITO_POR_CAPACIDADE.size).toBe(CONCEITOS_OPERADOR.length);
  });
});

describe("ontologia: uma divisão larga tem de o dizer", () => {
  it("todo o conceito «largo» com CAE publica a ressalva", () => {
    const semRessalva = CONCEITOS_OPERADOR.filter(
      (item) => item.precisao === "larga" && item.cae.length > 0 && !item.ressalva,
    );
    expect(semRessalva.map((item) => item.capacidadeId)).toEqual([]);
  });

  it("um conceito «justo» não precisa de ressalva nem a inventa", () => {
    for (const conceito of CONCEITOS_OPERADOR.filter((item) => item.precisao === "justa")) {
      expect(conceito.cae.length).toBeGreaterThan(0);
      expect(conceito.ressalva).toBeUndefined();
    }
  });

  it("mapear para duas ou mais divisões obriga a declarar largura", () => {
    // Somar divisões alarga sempre o universo contado. Chamar «justa» a
    // uma soma de três divisões seria a forma mais fácil de esconder que
    // o número não é o que a pessoa pensa que é.
    const suspeitos = CONCEITOS_OPERADOR.filter(
      (item) => item.cae.length > 2 && item.precisao === "justa",
    );
    expect(suspeitos.map((item) => item.capacidadeId)).toEqual([]);
  });
});

describe("ontologia: as ausências são deliberadas e visíveis", () => {
  it("há capacidades sem CAE, e isso é uma posição, não um esquecimento", () => {
    const semCae = CONCEITOS_OPERADOR.filter((item) => item.cae.length === 0);
    // Se um dia isto ficar vazio, alguém encheu a tabela para todas as
    // linhas terem número — e é isso que este teste vigia.
    expect(semCae.length).toBeGreaterThan(0);
    expect(semCae.length).toBeLessThan(CONCEITOS_OPERADOR.length / 2);
  });

  it("`DIVISOES_USADAS` é a união exata do que os conceitos declaram", () => {
    const esperado = [...new Set(CONCEITOS_OPERADOR.flatMap((item) => item.cae))].sort();
    expect([...DIVISOES_USADAS]).toEqual(esperado);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  NENHUMA COMPETÊNCIA É UM BOTÃO MORTO
//  --------------------------------------------------------------------
//  A lista passou de 22 para 28 competências. O risco de crescer uma
//  taxonomia é oferecer escolhas que não levam a lado nenhum — e o modo
//  de falhar é silencioso: a pessoa declara o que sabe fazer e recebe um
//  ecrã vazio.
//
//  ⚠️ A MEDIÇÃO TEM DE VARRER AS REGIÕES. Foi o erro que se cometeu a
//  escrever isto: medindo só em Grande Lisboa, a agricultura e a
//  jardinagem pareciam becos. Não eram — `terreno-por-manter` declara
//  `regioes: alentejo, centro, norte, algarve` e exclui Lisboa de
//  propósito, porque terreno de proprietário ausente é um problema do
//  interior. O motor estava certo e a medição é que estava errada.
// ══════════════════════════════════════════════════════════════════════

describe("ontologia · toda a competência leva a alguma parte", () => {
  const TODOS_OS_ATIVOS = ATIVOS.map((item) => item.id);
  const REGIOES = MARKET_REGIONS.filter((item) => item.nutsCode !== null).map((item) => item.id);

  /**
   * Competências que NÃO sustentam um negócio sozinhas — e é verdade,
   * não é lacuna. O motor tem um diagnóstico próprio para isto
   * (`competencia-de-apoio`) e explica-o a quem lá chegar.
   */
  const DE_APOIO = new Set(["linguas"]);

  const melhorCorrida = (id: string) => {
    let melhor = 0;
    for (const regiao of REGIOES) {
      const resultado = descobrir(
        {
          ...CONTEXTO_INICIAL,
          localizacao: { regiao, alcance: "regiao" },
          competencias: [{ id, nivel: "avancado" }],
          ativos: TODOS_OS_ATIVOS,
          capital: { disponivelAgora: 20_000 },
          tempo: { dedicacao: "integral" },
          rendimento: { ambicao: "substituir-salario" },
          equipa: { forma: "sozinho" },
          risco: { perfil: "arrojado" },
        },
        { agora: () => "2026-08-23T00:00:00.000Z", limite: 12 },
      );
      melhor = Math.max(melhor, resultado.candidatos.length);
    }
    return melhor;
  };

  for (const competencia of COMPETENCIAS) {
    if (DE_APOIO.has(competencia.id)) continue;
    it(`${competencia.id} gera hipóteses em pelo menos uma região`, () => {
      expect(melhorCorrida(competencia.id)).toBeGreaterThan(0);
    });
  }

  it("uma competência de apoio sai vazia mas COM diagnóstico", () => {
    // Vazio sem explicação é um ecrã partido; vazio explicado é uma
    // resposta. A diferença é tudo o que a pessoa tem para agir.
    const resultado = descobrir(
      {
        ...CONTEXTO_INICIAL,
        localizacao: { regiao: "norte", alcance: "regiao" },
        competencias: [{ id: "linguas", nivel: "avancado" }],
        ativos: TODOS_OS_ATIVOS,
      },
      { agora: () => "2026-08-23T00:00:00.000Z", limite: 12 },
    );
    expect(resultado.candidatos).toHaveLength(0);
    expect(resultado.diagnosticoVazio).not.toBeNull();
  });

  it("cada competência nova tem conceito de CAE com ressalva declarada", () => {
    // Todas as divisões novas são largas. Uma divisão larga sem ressalva
    // é uma leitura que parece precisa e não é — e `precisao` deixou de
    // ser decorativa: limita a confiança a média.
    for (const id of ["jardinagem", "estetica", "treino", "costura", "fotografia", "marketing"]) {
      const capacidade = CAPACIDADES.find(
        (item) => item.competenciasNecessarias.includes(id),
      );
      expect(capacidade, id).toBeDefined();
      const conceito = CONCEITO_POR_CAPACIDADE.get(capacidade!.id);
      expect(conceito, capacidade!.id).toBeDefined();
      expect(conceito!.cae.length, capacidade!.id).toBeGreaterThan(0);
      if (conceito!.precisao === "larga") {
        expect(conceito!.ressalva, capacidade!.id).toBeTruthy();
      }
    }
  });

  it("as divisões que a ontologia usa estão todas na matriz commitada", () => {
    // Uma divisão declarada e ausente da matriz é uma leitura de
    // concorrência que nunca acontece, em silêncio. Foi por isto que a
    // matriz teve de ser regenerada ao acrescentar 14, 74 e 93.
    expect(MATRIZ_CONCELHOS).not.toBeNull();
    const naMatriz = new Set(Object.keys(MATRIZ_CONCELHOS!.porDivisao));
    for (const divisao of DIVISOES_USADAS) {
      expect(naMatriz.has(divisao), `divisão ${divisao} não está na matriz`).toBe(true);
    }
  });
});
