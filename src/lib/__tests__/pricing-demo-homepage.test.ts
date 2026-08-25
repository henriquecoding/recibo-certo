import { describe, expect, it } from "vitest";
import {
  ENTRADAS_DEMO_PADRAO,
  LIMITES_DEMO_PRECO,
  composicaoDemo,
  reguaDemo,
  type EntradasDemoPreco,
} from "@/lib/pricing/demo-homepage";
import {
  VENDEDOR_EMPRESA,
  VENDEDOR_RECIBOS_VERDES,
  fracaoFaturacaoDe,
  parametrosDemoPreco,
  precoDaEngine,
} from "@/lib/pricing/demo-homepage.servidor";
import { IVA_TAXAS } from "@/lib/fiscal-data";

const PARAMETROS = parametrosDemoPreco();
const EMPRESA = PARAMETROS.regimes[0];
const RECIBOS = PARAMETROS.regimes[1];

/**
 * A grelha que a pessoa consegue mesmo produzir arrastando: os extremos de
 * cada controlo, o exemplo de abertura e alguns pontos pelo meio.
 */
function grelha(): EntradasDemoPreco[] {
  const eixos = {
    materiais: [LIMITES_DEMO_PRECO.materiais[0], 14.8, 27, LIMITES_DEMO_PRECO.materiais[1]],
    trabalho: [LIMITES_DEMO_PRECO.trabalho[0], 9.6, 21, LIMITES_DEMO_PRECO.trabalho[1]],
    estrutura: [LIMITES_DEMO_PRECO.estrutura[0], 4.5, 13, LIMITES_DEMO_PRECO.estrutura[1]],
    markup: [LIMITES_DEMO_PRECO.markup[0], 0.4038, 0.55, LIMITES_DEMO_PRECO.markup[1]],
  };

  const casos: EntradasDemoPreco[] = [];
  for (const materiais of eixos.materiais)
    for (const trabalho of eixos.trabalho)
      for (const estrutura of eixos.estrutura)
        for (const markup of eixos.markup) casos.push({ materiais, trabalho, estrutura, markup });
  return casos;
}

describe("demo de preço da homepage: a forma fechada não pode divergir da engine", () => {
  it("o exemplo de abertura fecha exatamente onde a engine o põe", () => {
    const c = composicaoDemo(ENTRADAS_DEMO_PADRAO, {
      taxaIVA: PARAMETROS.taxaIVA,
      fracaoFaturacao: EMPRESA.fracaoFaturacao,
    });

    expect(c.base).toBe(28.9);
    expect(c.liquido).toBe(40.57);
    expect(c.iva).toBe(9.33);
    expect(c.pvp).toBe(49.9);
    expect(c.lucro).toBe(11.67);
    expect(c.minimoPVP).toBe(35.55);
    // 40,4% de markup são 28,8% de margem. São grandezas diferentes, e a
    // interface mostra as duas com nomes diferentes por causa disto.
    expect(c.margem).toBeCloseTo(0.2876, 4);
    expect(c.markup).toBeCloseTo(0.4038, 4);
  });

  it.each([
    ["sociedade", VENDEDOR_EMPRESA, () => EMPRESA.fracaoFaturacao],
    ["recibos verdes", VENDEDOR_RECIBOS_VERDES, () => RECIBOS.fracaoFaturacao],
  ] as const)("concorda com precificar() em toda a grelha — %s", (_nome, vendedor, fracao) => {
    const fracaoFaturacao = fracao();

    /**
     * Duas implementações da mesma equação arredondam para o mesmo cêntimo
     * — EXCETO quando o valor exato cai em cima de meio cêntimo. Aí, meia
     * dúzia de operações em vírgula flutuante a mais chegam para uma cair
     * de um lado e a outra do outro: 25,00 € × 40,38% = 10,095 € dá 10,09 €
     * à engine e 10,10 € à forma fechada.
     *
     * O teste diz exatamente isso em vez de afrouxar a tolerância para todos:
     * fora das fronteiras exige-se o MESMO cêntimo, e em cima delas aceita-se
     * um — e mais nada. Uma divergência de dois cêntimos, ou um cêntimo longe
     * de uma fronteira, é um modelo diferente e parte o teste.
     */
    const naFronteiraDoCentimo = (exato: number) =>
      Math.abs(Math.abs(exato * 100 - Math.trunc(exato * 100)) - 0.5) < 1e-6;

    const concordam = (nosso: number, daEngine: number, exato: number, campo: string) => {
      const diferenca = Math.abs(nosso - daEngine);
      const limite = naFronteiraDoCentimo(exato) ? 0.0101 : 0.0001;
      expect(
        diferenca,
        `${campo}: nosso ${nosso}, engine ${daEngine}, exato ${exato}`,
      ).toBeLessThanOrEqual(limite);
    };

    for (const entradas of grelha()) {
      const nosso = composicaoDemo(entradas, { taxaIVA: PARAMETROS.taxaIVA, fracaoFaturacao });
      const engine = precoDaEngine(entradas, vendedor);
      expect(engine.ok).toBe(true);

      const base = entradas.materiais + entradas.trabalho + entradas.estrutura;
      const liquidoExato = (base * (1 + entradas.markup)) / (1 - fracaoFaturacao);
      const pvpExato = liquidoExato * (1 + PARAMETROS.taxaIVA);

      concordam(nosso.liquido, engine.precoLiquido, liquidoExato, "líquido");
      concordam(nosso.pvp, engine.pvp, pvpExato, "PVP");
      concordam(nosso.iva, engine.iva, pvpExato - liquidoExato, "IVA");
      concordam(nosso.lucro, engine.margem.lucroUnidade, base * entradas.markup, "lucro");
      expect(Math.abs(nosso.margem - engine.margem.margem)).toBeLessThanOrEqual(0.0005);
    }
  });

  it("o PVP é sempre o líquido mais o IVA, depois de arredondar", () => {
    for (const entradas of grelha()) {
      for (const fracaoFaturacao of [EMPRESA.fracaoFaturacao, RECIBOS.fracaoFaturacao]) {
        const c = composicaoDemo(entradas, { taxaIVA: PARAMETROS.taxaIVA, fracaoFaturacao });
        expect(c.liquido + c.iva).toBeCloseTo(c.pvp, 10);
      }
    }
  });

  it("as parcelas desenhadas somam o preço desenhado, ao cêntimo", () => {
    // A barra da composição mostra seis parcelas. Se somarem 49,91 € por baixo
    // de um preço de 49,90 €, a secção que existe para provar o número passa a
    // ser a que o desmente — e é o tipo de defeito que ninguém reporta.
    for (const entradas of grelha()) {
      for (const fracaoFaturacao of [EMPRESA.fracaoFaturacao, RECIBOS.fracaoFaturacao]) {
        const c = composicaoDemo(entradas, { taxaIVA: PARAMETROS.taxaIVA, fracaoFaturacao });
        const parcelas =
          c.base + c.retencaoPessoal + c.lucro + c.iva;
        expect(parcelas).toBeCloseTo(c.pvp, 10);
        expect(c.base + c.retencaoPessoal + c.lucro).toBeCloseTo(c.liquido, 10);
        // A parcela que fecha a coluna nunca pode fechá-la para trás.
        expect(c.retencaoPessoal).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("numa sociedade a parcela que fecha a coluna é exatamente zero", () => {
    // Não «aproximadamente»: se a retenção de uma sociedade aparecesse a
    // 0,01 €, a homepage estaria a desenhar um imposto por fatura que não
    // existe — e é a diferença inteira que a demonstração quer mostrar.
    for (const entradas of grelha()) {
      const c = composicaoDemo(entradas, {
        taxaIVA: PARAMETROS.taxaIVA,
        fracaoFaturacao: EMPRESA.fracaoFaturacao,
      });
      expect(c.retencaoPessoal).toBe(0);
    }
  });

  it("nenhuma entrada produz NaN, negativo ou infinito", () => {
    const absurdos: EntradasDemoPreco[] = [
      { materiais: Number.NaN, trabalho: 9.6, estrutura: 4.5, markup: 0.4 },
      { materiais: 0, trabalho: 0, estrutura: 0, markup: 0 },
      { materiais: -10, trabalho: -1, estrutura: -1, markup: -1 },
      { materiais: Number.POSITIVE_INFINITY, trabalho: 1, estrutura: 1, markup: 0.4 },
    ];

    for (const entradas of absurdos) {
      const c = composicaoDemo(entradas, { taxaIVA: PARAMETROS.taxaIVA, fracaoFaturacao: 0 });
      for (const [chave, valor] of Object.entries(c)) {
        expect(Number.isFinite(valor), `${chave} não é finito`).toBe(true);
        expect(valor, `${chave} é negativo`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("demo de preço da homepage: os parâmetros vêm da lei, não do ficheiro", () => {
  it("a taxa de IVA é a do Continente em fiscal-data, não um literal", () => {
    expect(PARAMETROS.taxaIVA).toBe(IVA_TAXAS.continente.value.normal);
    expect(PARAMETROS.fonteIVA).toBe(IVA_TAXAS.continente.legalBasis);
    expect(PARAMETROS.fonteIVA).toContain("Art. 18.º CIVA");
  });

  it("numa sociedade nenhum imposto sai da fatura; a recibos verdes sai", () => {
    expect(fracaoFaturacaoDe(VENDEDOR_EMPRESA)).toBe(0);
    expect(EMPRESA.fracaoFaturacao).toBe(0);
    expect(RECIBOS.fracaoFaturacao).toBeGreaterThan(0);
    // A Segurança Social do TI já são 21,4% × 20% da faturação de bens; com
    // o IRS do simplificado por cima, nunca pode ficar abaixo disso.
    expect(RECIBOS.fracaoFaturacao).toBeGreaterThan(0.0428);
    expect(RECIBOS.fracaoFaturacao).toBeLessThan(0.5);
  });

  it("o mesmo lucro por unidade custa um preço mais alto a recibos verdes", () => {
    const sociedade = composicaoDemo(ENTRADAS_DEMO_PADRAO, {
      taxaIVA: PARAMETROS.taxaIVA,
      fracaoFaturacao: EMPRESA.fracaoFaturacao,
    });
    const recibos = composicaoDemo(ENTRADAS_DEMO_PADRAO, {
      taxaIVA: PARAMETROS.taxaIVA,
      fracaoFaturacao: RECIBOS.fracaoFaturacao,
    });

    expect(recibos.lucro).toBe(sociedade.lucro);
    expect(recibos.pvp).toBeGreaterThan(sociedade.pvp);
    // E a margem desce, porque o lucro é o mesmo sobre um líquido maior.
    expect(recibos.margem).toBeLessThan(sociedade.margem);
  });
});

describe("demo de preço da homepage: a régua", () => {
  it("o marcador nunca encosta às pontas e o mínimo fica antes do preço", () => {
    for (const entradas of grelha()) {
      const c = composicaoDemo(entradas, {
        taxaIVA: PARAMETROS.taxaIVA,
        fracaoFaturacao: RECIBOS.fracaoFaturacao,
      });
      const r = reguaDemo(c);

      expect(r.preco).toBeGreaterThanOrEqual(2);
      expect(r.preco).toBeLessThanOrEqual(98);
      expect(r.minimo).toBeLessThanOrEqual(r.preco);
      expect(r.marcas).toHaveLength(6);
      expect(r.marcas[0]).toBe(r.inicio);
      expect(r.marcas[5]).toBe(r.fim);
    }
  });
});
