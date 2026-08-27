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
      expect(ponto.freelancer).toBe(Math.round(calculado.freelancer.liquido));
      expect(ponto.empresa).toBe(Math.round(calculado.empresa.liquido));
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
      const semCusto = compararCategorias({ brutoAnual: ponto.faturacao, dependentes: 0 });
      expect(ponto.empresa).toBeLessThan(Math.round(semCusto.empresa.liquido));
    }
  });

  /**
   * As duas colunas do palco têm a MESMA altura porque partem da mesma
   * faturação, e o que se compara é o tamanho da fatia que fica. Isso só é
   * honesto enquanto cada repartição fechar a conta — e é uma identidade do
   * motor (`bruto = líquido + o que sai`), não uma coincidência a explorar.
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
   * A escala acaba no limite do regime simplificado, e não num número
   * escolhido para o desenho ficar bonito. Acima do Art. 28.º do CIRS a
   * contabilidade organizada deixa de ser opcional e a comparação desta
   * página perde uma das duas respostas que compara.
   */
  it("para exatamente no limite legal do regime simplificado", () => {
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
