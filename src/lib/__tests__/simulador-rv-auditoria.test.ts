// ═══════════════════════════════════════════════════════════════════════
//  Auditoria do simulador de recibos verdes — invariantes do motor.
//
//  Cada teste aqui nasceu de um defeito encontrado a correr o simulador,
//  não de uma hipótese. O nome diz o que estava errado; a asserção impede
//  que volte.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  simularDeclaracaoIRS,
  contribuicoesSS,
  contribuicoesSSAnuais,
  ajusteBaseValido,
  pagamentosPorContaIRS,
  calcular,
} from "@/lib/fiscal";
import {
  ATIVIDADES,
  efeitoFiscal,
  BASE_SS_POR_TIPO,
  SS_AJUSTE_BASE,
  PAGAMENTOS_CONTA_IRS,
  DEDUCAO_SAUDE,
  DEDUCAO_EDUCACAO,
  DEDUCAO_RENDAS,
  DEDUCAO_DESP_GERAIS,
} from "@/lib/fiscal-data";

const CAT_B = { brutoAnual: 30_000, tipo: "art151" as const, anoAtividade: 3 };

describe("residência fiscal", () => {
  it("as regiões autónomas reduzem o IRS — e a diferença é material", () => {
    const cont = simularDeclaracaoIRS({ independente: CAT_B, residenciaFiscal: "continente" }).englobamento;
    const mad = simularDeclaracaoIRS({ independente: CAT_B, residenciaFiscal: "madeira" }).englobamento;
    const aco = simularDeclaracaoIRS({ independente: CAT_B, residenciaFiscal: "acores" }).englobamento;
    expect(mad.irsEstimado).toBeLessThan(cont.irsEstimado);
    expect(aco.irsEstimado).toBeLessThan(cont.irsEstimado);
    // Para 30 000 €/ano a diferença passa de 1 000 €: um simulador que a
    // ignore não está a estimar, está a errar.
    expect(cont.irsEstimado - mad.irsEstimado).toBeGreaterThan(1_000);
  });

  it("omitir a residência equivale ao continente (nunca a uma região)", () => {
    const omitido = simularDeclaracaoIRS({ independente: CAT_B }).englobamento;
    const cont = simularDeclaracaoIRS({ independente: CAT_B, residenciaFiscal: "continente" }).englobamento;
    expect(omitido.irsEstimado).toBeCloseTo(cont.irsEstimado, 2);
  });
});

describe("base de Segurança Social por atividade", () => {
  it("toda a atividade com baseSS própria é representável no motor anual", () => {
    const divergentes = ATIVIDADES.filter(
      (a) => efeitoFiscal(a).baseSS !== BASE_SS_POR_TIPO[a.tipo],
    );
    // Se este número for zero, o `baseSSOverride` deixou de ser preciso —
    // mas enquanto houver atividades assim, o motor tem de as saber ouvir.
    expect(divergentes.length).toBeGreaterThan(0);
    for (const a of divergentes) {
      const ef = efeitoFiscal(a);
      const semOverride = simularDeclaracaoIRS({
        independente: { brutoAnual: 30_000, tipo: a.tipo, coefOverride: ef.coef, anoAtividade: 3 },
      }).englobamento;
      const comOverride = simularDeclaracaoIRS({
        independente: {
          brutoAnual: 30_000, tipo: a.tipo, coefOverride: ef.coef,
          baseSSOverride: ef.baseSS, anoAtividade: 3,
        },
      }).englobamento;
      expect(comOverride.ssAnual).toBeCloseTo(
        contribuicoesSSAnuais(30_000, ef.baseSS),
        2,
      );
      expect(comOverride.ssAnual).not.toBeCloseTo(semOverride.ssAnual, 2);
    }
  });

  it("o recibo e o ano concordam na base de SS de quem vende bens", () => {
    const porRecibo = calcular({
      bruto: 2_500, tipo: "vendas", regiao: "continente", regimeIVA: "isento",
      baseSS: "bens", dispensaRetencao: false, isencaoSSPrimeiroAno: false, acumulaEmprego: false,
    });
    const anual = simularDeclaracaoIRS({
      independente: { brutoAnual: 2_500 * 12, tipo: "vendas", anoAtividade: 3 },
    }).englobamento;
    expect(porRecibo.segSocial * 12).toBeCloseTo(anual.ssAnual, 2);
  });
});

describe("ajuste do rendimento relevante (Art. 163.º CRC)", () => {
  it("apara ao limite legal e alinha ao passo", () => {
    const { limite, passo } = SS_AJUSTE_BASE.value;
    expect(ajusteBaseValido(undefined)).toBe(0);
    expect(ajusteBaseValido(Number.NaN)).toBe(0);
    expect(ajusteBaseValido(10)).toBeCloseTo(limite);
    expect(ajusteBaseValido(-10)).toBeCloseTo(-limite);
    expect(ajusteBaseValido(passo * 1.4)).toBeCloseTo(passo);
  });

  it("move a contribuição proporcionalmente, dentro do teto", () => {
    const base = contribuicoesSS(30_000, "servicos").contribuicaoAnual;
    expect(contribuicoesSS(30_000, "servicos", {}, { ajusteBase: 0.25 }).contribuicaoAnual)
      .toBeCloseTo(base * 1.25, 2);
    expect(contribuicoesSS(30_000, "servicos", {}, { ajusteBase: -0.25 }).contribuicaoAnual)
      .toBeCloseTo(base * 0.75, 2);
  });

  it("descer a base sobe o IRS — a regra dos 15% credita o que se paga", () => {
    const irs = (aj: number) =>
      simularDeclaracaoIRS({
        independente: { brutoAnual: 60_000, tipo: "art151", anoAtividade: 3, ajusteBaseSS: aj },
      }).englobamento.irsEstimado;
    expect(irs(-0.25)).toBeGreaterThan(irs(0));
  });
});

describe("pagamentos por conta de IRS (Art. 102.º CIRS)", () => {
  it("aplica a fórmula 65% × (C − R) × RLB / RLT em três prestações", () => {
    const r = pagamentosPorContaIRS({
      coleta: 6_000, retencoesCatB: 1_000,
      rendimentoLiquidoCatB: 30_000, rendimentoLiquidoTotal: 30_000,
    });
    expect(r.total).toBeCloseTo(PAGAMENTOS_CONTA_IRS.taxa.value * 5_000, 2);
    expect(r.numero).toBe(PAGAMENTOS_CONTA_IRS.numero.value);
    expect(r.meses).toEqual(PAGAMENTOS_CONTA_IRS.meses.value);
    expect(r.prestacao * r.numero).toBeCloseTo(r.total, 6);
  });

  it("reparte pela fração da categoria B quando há salário", () => {
    const so = pagamentosPorContaIRS({
      coleta: 6_000, retencoesCatB: 0,
      rendimentoLiquidoCatB: 30_000, rendimentoLiquidoTotal: 30_000,
    });
    const misto = pagamentosPorContaIRS({
      coleta: 6_000, retencoesCatB: 0,
      rendimentoLiquidoCatB: 15_000, rendimentoLiquidoTotal: 30_000,
    });
    expect(misto.total).toBeCloseTo(so.total / 2, 2);
  });

  it("não é exigível abaixo do mínimo legal por prestação", () => {
    const r = pagamentosPorContaIRS({
      coleta: 200, retencoesCatB: 0,
      rendimentoLiquidoCatB: 5_000, rendimentoLiquidoTotal: 5_000,
    });
    expect(r.total).toBe(0);
    expect(r.abaixoDoMinimo).toBe(true);
    expect(r.totalAntesDoMinimo).toBeGreaterThan(0);
  });

  it("cai a zero quando a retenção já cobre a coleta, ou sem categoria B", () => {
    expect(pagamentosPorContaIRS({
      coleta: 1_000, retencoesCatB: 1_200,
      rendimentoLiquidoCatB: 30_000, rendimentoLiquidoTotal: 30_000,
    }).total).toBe(0);
    expect(pagamentosPorContaIRS({
      coleta: 6_000, retencoesCatB: 0,
      rendimentoLiquidoCatB: 0, rendimentoLiquidoTotal: 30_000,
    }).total).toBe(0);
  });
});

describe("deduções à coleta — os tetos são os da fonte de verdade", () => {
  it("o topo útil de cada campo faz a dedução bater exatamente no limite", () => {
    for (const d of [DEDUCAO_SAUDE, DEDUCAO_EDUCACAO, DEDUCAO_RENDAS, DEDUCAO_DESP_GERAIS]) {
      const { taxa, limite } = d.value;
      const despesaMax = Math.ceil(limite / taxa);
      expect(Math.min(despesaMax * taxa, limite)).toBeCloseTo(limite, 6);
      // E abaixo desse topo a dedução ainda não bateu no limite — é o que
      // torna o campo útil em vez de decorativo.
      expect((despesaMax - 1) * taxa).toBeLessThan(limite + 1e-9);
    }
  });

  it("o limite das rendas de 2026 exige um campo bem acima dos 3 347 € antigos", () => {
    const { taxa, limite } = DEDUCAO_RENDAS.value;
    expect(Math.ceil(limite / taxa)).toBeGreaterThan(3_347);
  });
});
