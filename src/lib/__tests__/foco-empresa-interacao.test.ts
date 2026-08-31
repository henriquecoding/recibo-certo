import { describe, expect, it } from "vitest";
import { dadosEmpresa } from "@/lib/foco/dados-servidor";
import { compararCategorias } from "@/lib/fiscal-dependente";
import { AVENCA_SOCIEDADE_ANUAL_MEDIA } from "@/lib/contabilista";
import { REGIME_SIMPLIFICADO } from "@/lib/fiscal-data";

/**
 * Os pressupostos da cena. Estão aqui repetidos DE PROPÓSITO: se o palco
 * deixar de descontar a contabilidade — que foi exatamente o defeito que
 * esta suite não apanhava —, o teste falha em vez de acompanhar a mudança.
 */
const PRESSUPOSTOS = { dependentes: 0, custosEmpresa: AVENCA_SOCIEDADE_ANUAL_MEDIA } as const;

describe("palco Empresa: cenários interativos", () => {
  it("leva para o cliente apenas respostas calculadas pelo motor fiscal", () => {
    const dados = dadosEmpresa();

    expect(dados.cenarios.length).toBeGreaterThan(30);
    expect(dados.cenarios.map((ponto) => ponto.faturacao)).toContain(dados.cruzamento);

    for (const ponto of dados.cenarios) {
      const calculado = compararCategorias({ brutoAnual: ponto.faturacao, ...PRESSUPOSTOS });
      const semCusto = compararCategorias({ brutoAnual: ponto.faturacao, dependentes: 0 });
      expect(ponto.freelancer).toBe(Math.round(calculado.freelancer.liquido));
      expect(ponto.empresa).toBe(Math.round(calculado.empresa.liquido));
      expect(ponto.empresaSemCustos).toBe(Math.round(semCusto.empresa.liquido));
    }
  });

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ O CUSTO TEM DE ESTAR DESCONTADO, E NÃO SÓ NARRADO                 │
  // │                                                                   │
  // │ O palco afirmava — em `sr-only` e na página — que a contabilidade │
  // │ é contada antes de qualquer imposto e que é ela que empurra o     │
  // │ ponto de viragem. `compararCategorias` era chamado sem            │
  // │ `custosEmpresa`, cujo valor por omissão é zero, e o número        │
  // │ publicado era o de uma sociedade sem contabilista.                │
  // │                                                                   │
  // │ A suite anterior não podia apanhar isto: recalculava a esperança  │
  // │ com o mesmo argumento em falta que o código de produção.          │
  // └───────────────────────────────────────────────────────────────────┘
  it("desconta mesmo o custo fixo de ter empresa", () => {
    const dados = dadosEmpresa();
    expect(dados.custoFixo).toBe(Math.round(AVENCA_SOCIEDADE_ANUAL_MEDIA));

    for (const ponto of dados.cenarios) {
      expect(ponto.soc.contabilidade).toBe(Math.round(AVENCA_SOCIEDADE_ANUAL_MEDIA));
      // O líquido da sociedade é MENOR do que o da mesma sociedade sem
      // custo nenhum. É a asserção que o defeito não sobrevivia.
      expect(ponto.empresa).toBeLessThan(ponto.empresaSemCustos);
    }
  });

  /**
   * A curva compara líquidos, mas o payload conserva a decomposição que
   * explica cada resposta. Esta identidade impede uma curva visualmente certa
   * de esconder um cenário cuja conta deixou de fechar.
   */
  it("reparte cada euro sem sobrar nem faltar, nos dois caminhos", () => {
    for (const ponto of dadosEmpresa().cenarios) {
      const rv = ponto.freelancer + ponto.rv.irs + ponto.rv.ss;
      const soc =
        ponto.empresa + ponto.soc.irc + ponto.soc.dividendos + ponto.soc.contabilidade;
      // Tolerância de 4 €: cada parcela é arredondada ao euro em separado.
      expect(Math.abs(rv - ponto.faturacao)).toBeLessThanOrEqual(4);
      expect(Math.abs(soc - ponto.faturacao)).toBeLessThanOrEqual(4);
    }
  });

  it("oferece uma grelha ordenada e inclui o cenário editorial de 30 mil euros", () => {
    const dados = dadosEmpresa();
    const faturacoes = dados.cenarios.map((ponto) => ponto.faturacao);

    expect(faturacoes).toEqual([...faturacoes].sort((a, b) => a - b));
    expect(faturacoes).toContain(dados.exemplo);
    expect(new Set(faturacoes).size).toBe(faturacoes.length);
  });

  /**
   * A escala acaba na referência de acesso do Art. 28.º, n.º 2, e não num
   * número escolhido para o desenho ficar bonito. A interface deixa claro
   * que a cessação obedece às regras históricas próprias do n.º 6.
   */
  it("para exatamente na referência do regime simplificado", () => {
    const dados = dadosEmpresa();
    const faturacoes = dados.cenarios.map((ponto) => ponto.faturacao);

    expect(dados.limiteSimplificado).toBe(REGIME_SIMPLIFICADO.limite.value);
    expect(Math.max(...faturacoes)).toBe(REGIME_SIMPLIFICADO.limite.value);
    expect(faturacoes.every((f) => f <= REGIME_SIMPLIFICADO.limite.value)).toBe(true);
  });

  it("marca a viragem no primeiro cenário em que a sociedade passa à frente", () => {
    const dados = dadosEmpresa();
    if (dados.cruzamento === null) return;

    const antes = compararCategorias({ brutoAnual: dados.cruzamento - 250, ...PRESSUPOSTOS });
    const depois = compararCategorias({ brutoAnual: dados.cruzamento, ...PRESSUPOSTOS });
    expect(depois.empresa.liquido).toBeGreaterThan(depois.freelancer.liquido);
    expect(antes.empresa.liquido).toBeLessThanOrEqual(antes.freelancer.liquido);
  });
});
