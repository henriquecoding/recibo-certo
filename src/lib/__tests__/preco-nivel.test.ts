import { describe, expect, it } from "vitest";

import {
  NIVEL_DE_SECCAO,
  TOTAL_SECCOES,
  aberturaDe,
  abreSozinha,
  nivelDe,
  type SeccaoPreco,
} from "@/lib/pricing/nivel";
import type { EstadoPreenchimento } from "@/lib/pricing/preenchimento";

// ═══════════════════════════════════════════════════════════════════════
//  AS CAMADAS DE REVELAÇÃO
//  ---------------------------------------------------------------------
//  O objetivo desta passagem é «reduzir carga cognitiva sem reduzir
//  capacidade». As duas metades dessa frase falham de maneiras
//  diferentes, e por isso são verificadas separadamente:
//
//    · reduzir carga    → nada de mais abre no nível 1;
//    · sem reduzir      → todas as secções continuam a existir e a
//      capacidade         poder ser abertas.
//
//  A terceira asserção é a que se descobre a usar: a escolha da pessoa
//  tem de ganhar ao automatismo, senão responder a mais um campo desfaz
//  o que ela acabou de arrumar.
// ═══════════════════════════════════════════════════════════════════════

const ESTADOS: EstadoPreenchimento[] = ["exemplo", "estimado", "completo"];
const SECCOES = Object.keys(NIVEL_DE_SECCAO) as SeccaoPreco[];

describe("preco-nivel:progressao", () => {
  it("o nível acompanha o que a pessoa respondeu", () => {
    expect(nivelDe("exemplo")).toBe(1);
    expect(nivelDe("estimado")).toBe(2);
    expect(nivelDe("completo")).toBe(3);
  });

  it("no nível 1 não abre nada sozinho", () => {
    // O número ainda é do cenário, não da pessoa. Analisá-lo em
    // profundidade seria analisar uma ficção — e eram ~1 323 palavras de
    // aparato analítico sobre um valor que ninguém introduziu.
    const abertas = SECCOES.filter((s) => abreSozinha(s, "exemplo"));
    expect(abertas).toEqual([]);
  });

  it("a abertura só cresce à medida que se responde", () => {
    // Uma secção que abra no nível 1 e feche no 3 seria a interface a
    // esconder coisas por sua conta. A revelação é monótona.
    for (const seccao of SECCOES) {
      const abertura = ESTADOS.map((e) => abreSozinha(seccao, e));
      const ordenada = [...abertura].sort((a, b) => Number(a) - Number(b));
      expect(abertura).toEqual(ordenada);
    }
  });

  it("a prova nunca abre sozinha, em estado nenhum", () => {
    // Memória de cálculo, notas e sociedade estão SEMPRE a um clique e
    // NUNCA à entrada. É a diferença entre estar disponível e estar
    // exposto, que é a tese toda desta mudança.
    for (const seccao of ["memoria", "notas", "sociedade"] as SeccaoPreco[]) {
      for (const estado of ESTADOS) {
        expect(abreSozinha(seccao, estado)).toBe(false);
      }
    }
  });
});

describe("preco-nivel:capacidade", () => {
  it("nenhuma secção foi removida para limpar a interface", () => {
    // §23 do prompt-mestre. Se alguém «arrumar» a UI apagando uma secção,
    // isto falha — que é precisamente o ponto. Reduzir densidade é mover
    // no tempo, nunca amputar.
    expect(TOTAL_SECCOES).toBe(10);
    expect(SECCOES).toEqual(
      expect.arrayContaining([
        "slider",
        "objetivo_invertido",
        "desconto",
        "caixa",
        "tesouraria",
        "sociedade",
        "memoria",
        "notas",
        "cenarios",
        "conclusao",
      ]),
    );
  });

  it("toda a secção é alcançável em qualquer estado", () => {
    // Fechada não é inexistente: `aberturaDe` com uma escolha explícita
    // tem de abrir qualquer uma, mesmo as que nunca abrem sozinhas.
    for (const seccao of SECCOES) {
      for (const estado of ESTADOS) {
        expect(aberturaDe(seccao, estado, { [seccao]: true })).toBe(true);
      }
    }
  });
});

describe("preco-nivel:escolha-da-pessoa", () => {
  it("uma secção fechada à mão não reabre quando o nível sobe", () => {
    // O defeito que isto impede: a pessoa fecha a tesouraria, responde ao
    // campo seguinte, o estado passa a `completo` — e a tesouraria estava
    // outra vez aberta. Um formulário que desfaz o que acabámos de fazer
    // é pior do que um formulário comprido.
    expect(aberturaDe("caixa", "completo", { caixa: false })).toBe(false);
    expect(aberturaDe("tesouraria", "completo", { tesouraria: false })).toBe(false);
  });

  it("uma secção aberta à mão não se fecha sozinha", () => {
    expect(aberturaDe("memoria", "exemplo", { memoria: true })).toBe(true);
  });

  it("sem escolha explícita manda a camada", () => {
    expect(aberturaDe("caixa", "exemplo", {})).toBe(false);
    expect(aberturaDe("caixa", "estimado", {})).toBe(true);
    expect(aberturaDe("conclusao", "estimado", {})).toBe(false);
    expect(aberturaDe("conclusao", "completo", {})).toBe(true);
  });

  it("a escolha de uma secção não contamina as outras", () => {
    const escolhas = { memoria: true } as const;
    expect(aberturaDe("memoria", "exemplo", escolhas)).toBe(true);
    expect(aberturaDe("notas", "exemplo", escolhas)).toBe(false);
    expect(aberturaDe("caixa", "exemplo", escolhas)).toBe(false);
  });
});
