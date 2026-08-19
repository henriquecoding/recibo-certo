import { describe, expect, it } from "vitest";

import {
  BLOCOS,
  CENARIOS_INICIAIS_DEF,
  blocoDestacado,
  cenarioPorChave,
  ordenarBlocos,
  particionarBlocos,
  precificar,
  type BlocoAvancado,
} from "@/lib/pricing";

// ═══════════════════════════════════════════════════════════════════════
//  A PARTIÇÃO DE «AFINAR O PREÇO»
//  ---------------------------------------------------------------------
//  «Afinar o preço» abria com doze acordeões fechados — 235 palavras e
//  978 px — num cenário onde tipicamente três dizem respeito à pessoa.
//  A partição põe à vista o que já tem dados dela e o que o motor aponta
//  como em falta, e manda o resto para uma linha de fichas.
//
//  A asserção que interessa não é «ficam menos»: é «não se perdeu
//  nenhum». Uma lista mais curta é fácil de obter apagando coisas, e é
//  exatamente isso que o §23 do prompt-mestre proíbe.
// ═══════════════════════════════════════════════════════════════════════

/** Os blocos declarados por um cenário, já ordenados como a interface faz. */
function ordemDe(chave: (typeof CENARIOS_INICIAIS_DEF)[number]["chave"]) {
  const definicao = cenarioPorChave(chave);
  const contexto = definicao.contexto();
  const resultado = precificar(contexto);
  const declarados = definicao.avancado.filter(
    (b) => !(b === "pagamento" && definicao.avancado.includes("comissoes")),
  );
  return { contexto, resultado, ordem: ordenarBlocos(declarados, contexto, resultado.avisos) };
}

describe("preco-blocos-particao:nada-se-perde", () => {
  it("visíveis + disponíveis é sempre o total, em todos os cenários", () => {
    for (const def of CENARIOS_INICIAIS_DEF) {
      const { contexto, resultado, ordem } = ordemDe(def.chave);
      const { visiveis, disponiveis } = particionarBlocos(ordem, contexto, resultado.avisos);

      expect(
        [...visiveis, ...disponiveis].sort(),
        `cenário ${def.chave}: a partição perdeu ou duplicou blocos`,
      ).toEqual([...ordem].sort());
    }
  });

  it("nenhum bloco aparece dos dois lados", () => {
    for (const def of CENARIOS_INICIAIS_DEF) {
      const { contexto, resultado, ordem } = ordemDe(def.chave);
      const { visiveis, disponiveis } = particionarBlocos(ordem, contexto, resultado.avisos);
      for (const b of visiveis) expect(disponiveis).not.toContain(b);
    }
  });

  it("mantém a ordem de relevância dos dois lados", () => {
    // `ordenarBlocos` põe em primeiro o que o motor aponta como em falta.
    // Se a partição baralhasse essa ordem, o bloco mais urgente podia
    // acabar em último — e a ordenação existe precisamente para isso.
    for (const def of CENARIOS_INICIAIS_DEF) {
      const { contexto, resultado, ordem } = ordemDe(def.chave);
      const { visiveis, disponiveis } = particionarBlocos(ordem, contexto, resultado.avisos);
      for (const lista of [visiveis, disponiveis]) {
        const indices = lista.map((b) => ordem.indexOf(b));
        expect(indices).toEqual([...indices].sort((a, b) => a - b));
      }
    }
  });
});

describe("preco-blocos-particao:densidade", () => {
  it("no total, mostra bem menos do que a lista completa", () => {
    // A razão de existir desta mudança, medida no agregado e não cenário a
    // cenário: quantos blocos é que a ferramenta põe à frente das pessoas
    // à entrada, somando os onze cenários. A asserção é agregada de
    // propósito — num cenário como o `marketplace` o motor aponta
    // legitimamente quatro blocos em falta, e obrigá-lo a esconder um
    // deles seria esconder o que o próprio motor diz ser preciso.
    let mostrados = 0;
    let existentes = 0;
    for (const def of CENARIOS_INICIAIS_DEF) {
      const { contexto, resultado, ordem } = ordemDe(def.chave);
      mostrados += particionarBlocos(ordem, contexto, resultado.avisos).visiveis.length;
      existentes += ordem.length;
    }
    expect(mostrados).toBeLessThan(existentes * 0.7);
  });

  it("só fica à vista o que o piso ou o motor reclamam", () => {
    // O invariante, dito ao contrário: nenhum bloco aparece à entrada «por
    // acaso». Se um dia aparecer, ou entrou no piso ou algo o reclamou.
    for (const def of CENARIOS_INICIAIS_DEF) {
      const { contexto, resultado, ordem } = ordemDe(def.chave);
      const { visiveis } = particionarBlocos(ordem, contexto, resultado.avisos);
      const piso = ordem.slice(0, 2);
      for (const b of visiveis) {
        const reclamado =
          piso.includes(b) || BLOCOS[b].preenchido(contexto) || blocoDestacado(b, contexto, resultado.avisos);
        expect(reclamado, `cenário ${def.chave}: ${b} apareceu sem motivo`).toBe(true);
      }
    }
  });

  it("nunca mostra a secção vazia", () => {
    // «Afinar o preço» sem um único bloco lê-se como uma secção partida.
    for (const def of CENARIOS_INICIAIS_DEF) {
      const { contexto, resultado, ordem } = ordemDe(def.chave);
      const { visiveis } = particionarBlocos(ordem, contexto, resultado.avisos);
      expect(visiveis.length, `cenário ${def.chave}`).toBeGreaterThanOrEqual(Math.min(2, ordem.length));
    }
  });
});

describe("preco-blocos-particao:promocao", () => {
  it("um bloco promovido passa a visível e sai das fichas", () => {
    const { contexto, resultado, ordem } = ordemDe("produto_revenda");
    const semPromocao = particionarBlocos(ordem, contexto, resultado.avisos);
    const alvo = semPromocao.disponiveis[0] as BlocoAvancado;
    expect(alvo).toBeDefined();

    const comPromocao = particionarBlocos(ordem, contexto, resultado.avisos, new Set([alvo]));
    expect(comPromocao.visiveis).toContain(alvo);
    expect(comPromocao.disponiveis).not.toContain(alvo);
  });

  it("promover um bloco não faz desaparecer nenhum outro", () => {
    // ⚠️ ESTE TESTE APANHOU UM DEFEITO REAL. Com o piso implementado como
    // «encher até chegar a dois», promover uma ficha satisfazia a
    // contagem por outra via e um bloco que estava à vista caía para a
    // linha de fichas: carregava-se em «Embalagem» e via-se «Contas
    // fixas» sumir-se. O piso passou a ser os dois primeiros da ordem,
    // fixos, e acrescentar passou a só acrescentar.
    for (const def of CENARIOS_INICIAIS_DEF) {
      const { contexto, resultado, ordem } = ordemDe(def.chave);
      const antes = particionarBlocos(ordem, contexto, resultado.avisos);
      const alvo = antes.disponiveis[0] as BlocoAvancado | undefined;
      if (!alvo) continue;

      const depois = particionarBlocos(ordem, contexto, resultado.avisos, new Set([alvo]));
      for (const b of antes.visiveis) {
        expect(depois.visiveis, `cenário ${def.chave}: ${b} desapareceu ao promover ${alvo}`).toContain(b);
      }
      expect(depois.visiveis.length).toBe(antes.visiveis.length + 1);
    }
  });
});
