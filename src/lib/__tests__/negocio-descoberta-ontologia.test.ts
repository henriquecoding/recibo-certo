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
