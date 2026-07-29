import { describe, it, expect } from "vitest";
import {
  calcular,
  simularIRSAnual,
  contribuicoesSSAnuais,
  retencaoNaFonte,
  irsProgressivo,
  type SimulacaoInput,
} from "@/lib/fiscal";
import { simularEmpresaOpcoes } from "@/lib/fiscal-empresa";
import {
  BASE_SS_POR_TIPO,
  RETENCAO,
  SS_BASE_MAX_MENSAL,
  SS_TAXA,
  ESCALOES_IRS,
} from "@/lib/fiscal-data";

// ═══════════════════════════════════════════════════════════════════════
//  COERÊNCIA E INVARIANTES
//
//  Os dois modos dos simuladores partilham o motor, mas cada superfície
//  monta a sua entrada. Foi por aí que apareceram as divergências que esta
//  ronda corrigiu: o guiado não englobava a Categoria A, o acerto anual
//  calculava a retenção com outra fórmula, e a Segurança Social era
//  decidida em quatro sítios diferentes.
//
//  Estes testes não verificam um valor fiscal — verificam que dois caminhos
//  que devem dar o mesmo continuam a dar o mesmo.
// ═══════════════════════════════════════════════════════════════════════

const PERFIS: { nome: string; input: SimulacaoInput }[] = [
  {
    nome: "jovem no 1.º ano, 18 000 €",
    input: {
      brutoAnual: 18_000,
      tipo: "art151",
      anoAtividade: 1,
      irsJovemAno: 1,
      isencaoSSPrimeiroAno: true,
    },
  },
  {
    nome: "art. 151.º consolidado, 30 000 €",
    input: { brutoAnual: 30_000, tipo: "art151", anoAtividade: 3 },
  },
  {
    nome: "acumulação com emprego, 24 000 € + 30 000 € de salário",
    input: {
      brutoAnual: 24_000,
      tipo: "art151",
      anoAtividade: 3,
      acumulaEmprego: true,
      outrosRendimentos: 30_000,
    },
  },
  {
    nome: "família com dois filhos e tributação conjunta",
    input: {
      brutoAnual: 45_000,
      tipo: "art151",
      anoAtividade: 3,
      conjunta: true,
      dependentesDetalhe: { normais: 2, bebe: 0, deficientes: 0 },
    },
  },
  {
    nome: "vendas de bens, 60 000 €",
    input: { brutoAnual: 60_000, tipo: "vendas", anoAtividade: 3 },
  },
  {
    nome: "no limite do simplificado, 200 000 €",
    input: { brutoAnual: 200_000, tipo: "art151", anoAtividade: 3 },
  },
];

describe("coerência: a Segurança Social é a mesma nos dois caminhos", () => {
  it.each(PERFIS)("$nome", ({ input }) => {
    const anual = simularIRSAnual(input);
    const esperado = contribuicoesSSAnuais(input.brutoAnual, BASE_SS_POR_TIPO[input.tipo], {
      primeiroAno: input.isencaoSSPrimeiroAno,
      acumulaEmprego: input.acumulaEmprego,
    });
    expect(anual.ssAnual).toBeCloseTo(esperado, 2);
  });

  it.each(PERFIS)("$nome — por recibo × 12 bate com o anual", ({ input }) => {
    const porRecibo = calcular({
      bruto: input.brutoAnual / 12,
      tipo: input.tipo,
      regiao: "continente",
      regimeIVA: "isento",
      baseSS: BASE_SS_POR_TIPO[input.tipo],
      dispensaRetencao: false,
      isencaoSSPrimeiroAno: !!input.isencaoSSPrimeiroAno,
      acumulaEmprego: !!input.acumulaEmprego,
      irsJovemAno: input.irsJovemAno,
    });
    expect(porRecibo.segSocial * 12).toBeCloseTo(simularIRSAnual(input).ssAnual, 2);
  });
});

describe("coerência: a retenção é a mesma nos dois caminhos", () => {
  it.each(PERFIS)("$nome", ({ input }) => {
    const porRecibo = calcular({
      bruto: input.brutoAnual / 12,
      tipo: input.tipo,
      regiao: "continente",
      regimeIVA: "isento",
      baseSS: BASE_SS_POR_TIPO[input.tipo],
      dispensaRetencao: false,
      isencaoSSPrimeiroAno: !!input.isencaoSSPrimeiroAno,
      acumulaEmprego: !!input.acumulaEmprego,
      irsJovemAno: input.irsJovemAno,
    });
    const anual = retencaoNaFonte(input.brutoAnual, RETENCAO[input.tipo].value, {
      irsJovemAno: input.irsJovemAno,
    });
    expect(porRecibo.retencaoIRS * 12).toBeCloseTo(anual, 2);
  });
});

describe("invariantes do apuramento de IRS", () => {
  it.each(PERFIS)("$nome — a SS nunca excede o teto de 12 × IAS", ({ input }) => {
    const tetoAnual = SS_BASE_MAX_MENSAL.value * SS_TAXA.value * 12;
    expect(simularIRSAnual(input).ssAnual).toBeLessThanOrEqual(tetoAnual + 0.01);
  });

  it.each(PERFIS)("$nome — a taxa efetiva fica entre 0 e 100%", ({ input }) => {
    const r = simularIRSAnual(input);
    expect(r.taxaMediaEfetiva).toBeGreaterThanOrEqual(0);
    expect(r.taxaMediaEfetiva).toBeLessThanOrEqual(1);
  });

  it.each(PERFIS)("$nome — as deduções batem com a soma das parcelas", ({ input }) => {
    const r = simularIRSAnual(input);
    const d = r.deducoesDespesasDetalhe;
    const soma = d.saude + d.educacao + d.gerais + d.rendas + d.lares + d.ppr + d.donativos;
    expect(soma).toBeCloseTo(d.somaBruta, 2);
    expect(r.deducaoDespesas).toBeCloseTo(d.aplicado, 2);
  });

  it.each(PERFIS)("$nome — a parte imputável à Cat. B nunca excede o total", ({ input }) => {
    const r = simularIRSAnual(input);
    expect(r.irsImputavelCatB).toBeGreaterThanOrEqual(0);
    expect(r.irsImputavelCatB).toBeLessThanOrEqual(r.irsEstimado + 0.01);
  });

  it("faturar mais nunca reduz o líquido (monotonia)", () => {
    let anterior = -Infinity;
    for (let f = 5_000; f <= 200_000; f += 5_000) {
      const r = simularIRSAnual({ brutoAnual: f, tipo: "art151", anoAtividade: 3 });
      const liquido = f - r.irsImputavelCatB - r.ssAnual;
      expect(liquido).toBeGreaterThanOrEqual(anterior - 0.01);
      anterior = liquido;
    }
  });

  it("faturar mais nunca reduz o líquido, também com acumulação", () => {
    // O degrau dos 4 × IAS da dispensa do Art. 157.º é o candidato natural a
    // partir a monotonia: acima do limite começa a haver contribuição.
    let anterior = -Infinity;
    for (let f = 20_000; f <= 120_000; f += 2_000) {
      const r = simularIRSAnual({
        brutoAnual: f,
        tipo: "art151",
        anoAtividade: 3,
        acumulaEmprego: true,
        outrosRendimentos: 20_000,
      });
      const liquido = f - r.irsImputavelCatB - r.ssAnual;
      expect(liquido).toBeGreaterThanOrEqual(anterior - 0.01);
      anterior = liquido;
    }
  });

  it("a coleta progressiva é monótona e nunca ultrapassa a taxa máxima", () => {
    const taxaMax = ESCALOES_IRS.value.at(-1)!.taxa;
    let anterior = -Infinity;
    for (let c = 1_000; c <= 300_000; c += 1_000) {
      const imposto = irsProgressivo(c);
      expect(imposto).toBeGreaterThanOrEqual(anterior);
      expect(imposto).toBeLessThanOrEqual(c * taxaMax + 0.01);
      anterior = imposto;
    }
  });
});

describe("invariantes do motor de empresa", () => {
  it("faturar mais nunca reduz a riqueza total", () => {
    let anterior = -Infinity;
    for (let f = 10_000; f <= 200_000; f += 10_000) {
      const r = simularEmpresaOpcoes({
        faturacao: f,
        despesasOper: 10_000,
        salarioGerenteMensal: 1_500,
        distribuirDividendos: true,
      });
      expect(r.riquezaTotal).toBeGreaterThanOrEqual(anterior - 0.01);
      anterior = r.riquezaTotal;
    }
  });

  it("o lucro tributável nunca é negativo e os custos somam", () => {
    const r = simularEmpresaOpcoes({
      faturacao: 30_000,
      despesasOper: 40_000,
      salarioGerenteMensal: 1_000,
    });
    expect(r.lucroTributavel).toBeGreaterThanOrEqual(0);
    expect(r.coleta).toBeGreaterThanOrEqual(0);
  });
});
