// ═══════════════════════════════════════════════════════════════════════
//  A PONTUAÇÃO GLOBAL — e o caso que a média ponderada apresentava mal
//  ---------------------------------------------------------------------
//  As dez dimensões entravam numa média ponderada, e numa média um valor
//  baixo é diluído pelos altos. Medido, com o resto dos eixos a 90:
//
//               eixo a 0     média antiga   geométrica
//      mercado                     59            12
//      encaixe                     67            23
//      viabilidade                 56            30
//
//  Sessenta e sete pontos em cem para uma hipótese que a pessoa NÃO
//  CONSEGUE EXECUTAR. Cinquenta e nove para uma sem sinal nenhum de
//  mercado. O `fitPessoal` era já a dimensão mais pesada da tabela (26
//  em 100) e mesmo assim os outros 74 puxavam-na para o meio da lista.
//
//  ── ONDE A MUDANÇA NÃO MUDA NADA, E É BOM QUE NÃO MUDE ─────────────
//  A meio da escala as duas concordam: com mercado 95, encaixe 92 e
//  viabilidade 22, ambas dão 65. Acima disso a geométrica chega a dar
//  quatro pontos A MAIS. Isto não é uma calibração para baixo — é uma
//  correção nos extremos, que é onde a média estava errada e onde uma
//  recomendação errada custa mais.
//
//  Estes testes prendem o comportamento, não os números exatos: um eixo
//  arrasado não é compensável, e a ausência de dados não penaliza.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  EIXOS,
  PESOS_SCORE,
  pontuacaoGlobal,
  pontuacaoPorEixo,
} from "@/lib/negocio/descoberta/motor/scoring";
import type { OpportunityScore } from "@/lib/negocio/descoberta/motor/tipos";

const score = (over: Partial<OpportunityScore> = {}): OpportunityScore => ({
  fitPessoal: 70,
  procura: 70,
  lacunaDeOferta: 70,
  economia: 70,
  exequibilidade: 70,
  regulacao: 70,
  risco: 70,
  geografia: 70,
  ...over,
});

/** A média ponderada antiga, para o antes/depois ser confrontável. */
const mediaAntiga = (scores: OpportunityScore): number => {
  let soma = 0;
  let peso = 0;
  for (const [chave, p] of Object.entries(PESOS_SCORE) as [keyof OpportunityScore, number][]) {
    const valor = scores[chave];
    if (valor === null) continue;
    soma += valor * p;
    peso += p;
  }
  return peso === 0 ? 0 : Math.round(soma / peso);
};

describe("pontuação: um eixo mau não é compensável", () => {
  const comEixoArrasado = (eixo: keyof typeof EIXOS, valor: number): OpportunityScore =>
    score(
      Object.fromEntries(
        EIXOS[eixo].dimensoes.map((chave) => [chave, valor]),
      ) as Partial<OpportunityScore>,
    );

  it("uma hipótese que a pessoa não consegue executar deixa de valer 67 em 100", () => {
    const semEncaixe = score({
      procura: 90,
      lacunaDeOferta: 90,
      geografia: 90,
      fitPessoal: 0,
      economia: 90,
      exequibilidade: 90,
      regulacao: 90,
      risco: 90,
    });
    expect(mediaAntiga(semEncaixe)).toBeGreaterThan(60);
    expect(pontuacaoGlobal(semEncaixe)).toBeLessThan(30);
  });

  it("uma hipótese sem sinal nenhum de mercado deixa de valer 59 em 100", () => {
    const semMercado = score({
      procura: 0,
      lacunaDeOferta: 0,
      geografia: 0,
      fitPessoal: 90,
      economia: 90,
      exequibilidade: 90,
      regulacao: 90,
      risco: 90,
    });
    expect(mediaAntiga(semMercado)).toBeGreaterThan(55);
    expect(pontuacaoGlobal(semMercado)).toBeLessThan(20);
  });

  it("a diferença cresce à medida que o eixo piora", () => {
    // Acima de ~22 as duas cruzam-se e a geométrica chega a dar alguns
    // pontos A MAIS — está medido e é intencional: a correção é dos
    // extremos, não uma calibração global para baixo. A monotonia que
    // interessa começa onde a hipótese começa a ser má.
    let anterior = -Infinity;
    for (const valor of [20, 15, 10, 5, 2, 0]) {
      const caso = comEixoArrasado("viabilidade", valor);
      const diferenca = mediaAntiga(caso) - pontuacaoGlobal(caso);
      expect(diferenca, `viabilidade ${valor}`).toBeGreaterThanOrEqual(anterior);
      anterior = diferenca;
    }
    // Com o eixo a zero, a nova pontuação fica bem abaixo de metade da
    // antiga. O limiar é relativo de propósito: prender o número exato
    // fazia este teste falhar por causa da base escolhida, e não por
    // causa do comportamento que ele existe para guardar.
    const arrasada = comEixoArrasado("viabilidade", 0);
    expect(pontuacaoGlobal(arrasada)).toBeLessThan(mediaAntiga(arrasada) * 0.65);
  });

  it("a meio da escala não há calibração escondida para baixo", () => {
    const equilibrada = score({ economia: 60, exequibilidade: 60, regulacao: 60, risco: 60 });
    expect(Math.abs(pontuacaoGlobal(equilibrada) - mediaAntiga(equilibrada))).toBeLessThanOrEqual(6);
  });

  it("baixar um eixo baixa sempre o total, por muito alto que esteja o resto", () => {
    const otima = score({ fitPessoal: 98, procura: 98, economia: 98 });
    for (const eixo of Object.values(EIXOS)) {
      const arrasada = score(
        Object.fromEntries(eixo.dimensoes.map((chave) => [chave, 10])) as Partial<OpportunityScore>,
      );
      expect(pontuacaoGlobal(arrasada)).toBeLessThan(pontuacaoGlobal(otima) - 20);
    }
  });

  it("o eixo mais pesado é o mercado, e vê-se no efeito", () => {
    const base = score();
    const semMercado = score({ procura: 10, lacunaDeOferta: 10, geografia: 10 });
    const semViabilidade = score({ economia: 10, exequibilidade: 10, regulacao: 10, risco: 10 });
    const quedaMercado = pontuacaoGlobal(base) - pontuacaoGlobal(semMercado);
    const quedaViabilidade = pontuacaoGlobal(base) - pontuacaoGlobal(semViabilidade);
    expect(quedaMercado).toBeGreaterThan(quedaViabilidade);
  });
});

describe("pontuação: a ausência não penaliza", () => {
  // Três dimensões podem ser `null` — procura, lacuna de oferta e
  // economia. As outras cinco são sempre um número, e é por isso que
  // nenhum eixo fica hoje inteiramente por avaliar.
  it("não declarar capital não transforma uma boa hipótese numa má", () => {
    const semCapital = score({ economia: null });
    expect(pontuacaoPorEixo(semCapital).viabilidade).not.toBeNull();
    // Sem o valor de `economia`, o eixo é a média das três que sobram —
    // e não uma média onde a ausência entrou como zero.
    expect(pontuacaoGlobal(semCapital)).toBe(pontuacaoGlobal(score()));
  });

  it("uma procura por medir não empurra a hipótese para o fundo", () => {
    const semProcura = score({ procura: null, lacunaDeOferta: null });
    expect(pontuacaoPorEixo(semProcura).mercado).not.toBeNull();
    expect(pontuacaoGlobal(semProcura)).toBe(pontuacaoGlobal(score()));
  });

  it("um eixo inteiramente por avaliar sai da conta — a guarda defensiva", () => {
    // O tipo torna isto inalcançável hoje: `exequibilidade`, `regulacao`
    // e `risco` são sempre números. A guarda fica porque a nulidade de
    // uma dimensão é uma decisão de produto que pode mudar, e nesse dia
    // a conta não pode passar a ler ausência como zero sem ninguém dar
    // por isso.
    const semViabilidade = {
      ...score(),
      economia: null,
      exequibilidade: null,
      regulacao: null,
      risco: null,
    } as unknown as OpportunityScore;
    expect(pontuacaoPorEixo(semViabilidade).viabilidade).toBeNull();
    expect(pontuacaoGlobal(semViabilidade)).toBe(pontuacaoGlobal(score()));
  });

  it("sem nada avaliável a pontuação é zero, e não um número inventado", () => {
    const nada = Object.fromEntries(
      (Object.keys(PESOS_SCORE) as (keyof OpportunityScore)[]).map((chave) => [chave, null]),
    ) as unknown as OpportunityScore;
    expect(pontuacaoGlobal(nada)).toBe(0);
  });
});

describe("pontuação: a aritmética mantém-se sã", () => {
  it("tudo igual devolve esse valor", () => {
    for (const valor of [10, 40, 70, 100]) {
      const uniforme = Object.fromEntries(
        (Object.keys(PESOS_SCORE) as (keyof OpportunityScore)[]).map((chave) => [chave, valor]),
      ) as unknown as OpportunityScore;
      expect(pontuacaoGlobal(uniforme)).toBe(valor);
    }
  });

  it("fica sempre entre 0 e 100", () => {
    for (const valor of [0, 1, 50, 99, 100]) {
      const uniforme = Object.fromEntries(
        (Object.keys(PESOS_SCORE) as (keyof OpportunityScore)[]).map((chave) => [chave, valor]),
      ) as unknown as OpportunityScore;
      const total = pontuacaoGlobal(uniforme);
      expect(total).toBeGreaterThanOrEqual(0);
      expect(total).toBeLessThanOrEqual(100);
    }
  });

  it("um eixo a zero não produz NaN nem -Infinity", () => {
    const zero = score({ fitPessoal: 0 });
    const total = pontuacaoGlobal(zero);
    expect(Number.isFinite(total)).toBe(true);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(pontuacaoGlobal(score()));
  });

  it("é monótona: subir uma dimensão nunca baixa o total", () => {
    let anterior = -1;
    for (const valor of [10, 20, 40, 60, 80, 100]) {
      const total = pontuacaoGlobal(score({ fitPessoal: valor }));
      expect(total).toBeGreaterThanOrEqual(anterior);
      anterior = total;
    }
  });

  it("os expoentes são os três e somam um", () => {
    const soma = Object.values(EIXOS).reduce((total, eixo) => total + eixo.expoente, 0);
    expect(soma).toBeCloseTo(1, 9);
  });

  it("cada dimensão pertence a exatamente um eixo", () => {
    const todas = Object.values(EIXOS).flatMap((eixo) => [...eixo.dimensoes]);
    expect(new Set(todas).size).toBe(todas.length);
    expect(new Set(todas)).toEqual(new Set(Object.keys(PESOS_SCORE)));
  });
});
