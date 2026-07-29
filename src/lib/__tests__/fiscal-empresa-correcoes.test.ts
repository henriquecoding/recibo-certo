import { describe, it, expect } from "vitest";
import { simularEmpresaOpcoes, PERFIL_GERENTE_PADRAO } from "@/lib/fiscal-empresa";
import {
  IAS,
  MOE_BASE_MINIMA_MENSAL,
  SS_DEPENDENTE,
  DEDUCAO_DEPENDENTE,
  IFICI_TAXA,
} from "@/lib/fiscal-data";

// ─────────────────────────────────────────────────────────────────────────
//  Correções do motor de empresa apontadas na análise dos simuladores.
// ─────────────────────────────────────────────────────────────────────────

const BASE = {
  faturacao: 100_000,
  despesasOper: 20_000,
  salarioGerenteMensal: 2_000,
  distribuirDividendos: true,
} as const;

describe("encargos com tributação autónoma reduzem o lucro tributável", () => {
  it("a viatura abate ao lucro, além de pagar TA", () => {
    // Antes: a TA era cobrada sobre o encargo mas o encargo não abatia — a
    // empresa pagava IRC sobre lucro que não teve, mais TA sobre a despesa.
    const sem = simularEmpresaOpcoes(BASE);
    const com = simularEmpresaOpcoes({
      ...BASE,
      tipoViatura: "comb_baixo",
      encargosViatura: 10_000,
    });
    expect(com.lucroTributavel).toBeCloseTo(sem.lucroTributavel - 10_000, 2);
    expect(com.ta.total).toBeGreaterThan(0);
    expect(com.encargosDedutiveis).toBe(10_000);
  });

  it("representação e ajudas de custo também abatem", () => {
    const r = simularEmpresaOpcoes({
      ...BASE,
      despRepresentacao: 3_000,
      ajudasCusto: 2_000,
    });
    expect(r.encargosDedutiveis).toBe(5_000);
    expect(r.lucroTributavel).toBeCloseTo(
      simularEmpresaOpcoes(BASE).lucroTributavel - 5_000,
      2,
    );
  });

  it("as despesas NÃO documentadas continuam a não abater (Art. 23.º-A n.º 1 al. b)", () => {
    const sem = simularEmpresaOpcoes(BASE);
    const com = simularEmpresaOpcoes({ ...BASE, naoDocumentadas: 5_000 });
    expect(com.lucroTributavel).toBeCloseTo(sem.lucroTributavel, 2);
    expect(com.encargosDedutiveis).toBe(0);
    // Mas pagam TA de 50%.
    expect(com.ta.naoDocumentadas).toBeCloseTo(2_500, 2);
  });
});

describe("gerente sem salário paga Segurança Social (Art. 55.º CC)", () => {
  it("a base de incidência tem o mínimo de 1 × IAS", () => {
    const r = simularEmpresaOpcoes({ ...BASE, salarioGerenteMensal: 0 });
    const tsuEsperada = MOE_BASE_MINIMA_MENSAL.value * SS_DEPENDENTE.entidade.value * 12;
    const gerenteEsperada = MOE_BASE_MINIMA_MENSAL.value * SS_DEPENDENTE.trabalhador.value * 12;

    // Precisão de 0 casas: o motor arredonda ao cêntimo MENSAL, por isso o
    // total anual pode afastar-se do produto exato em alguns cêntimos.
    expect(r.ssSalGerente).toBeCloseTo(tsuEsperada, 0);
    expect(r.payrollGerente.ssTrabalhadorMensal * 12).toBeCloseTo(gerenteEsperada, 0);
    expect(r.ssSalGerente).toBeGreaterThan(0);
  });

  it("o mínimo é mesmo 1 × IAS", () => {
    expect(MOE_BASE_MINIMA_MENSAL.value).toBeCloseTo(IAS.value, 2);
  });

  it("com salário acima do mínimo, o mínimo não morde", () => {
    const r = simularEmpresaOpcoes({ ...BASE, salarioGerenteMensal: 3_000 });
    expect(r.ssSalGerente).toBeCloseTo(3_000 * SS_DEPENDENTE.entidade.value * 12, 1);
  });
});

describe("IFICI — deixou de ser um botão que não faz nada", () => {
  const comIfici = {
    ...BASE,
    faturacao: 150_000,
    salarioGerenteMensal: 4_000,
    perfil: { ...PERFIL_GERENTE_PADRAO, ifici: true },
  };

  it("baixa o IRS do gerente face aos escalões progressivos", () => {
    const sem = simularEmpresaOpcoes({ ...comIfici, perfil: PERFIL_GERENTE_PADRAO });
    const com = simularEmpresaOpcoes(comIfici);
    expect(com.irsSalarioGerente).toBeLessThan(sem.irsSalarioGerente);
    expect(sem.irsSalarioGerente - com.irsSalarioGerente).toBeGreaterThan(1_000);
  });

  it("aplica a taxa de 20% ao salário", () => {
    const com = simularEmpresaOpcoes(comIfici);
    // O IRS do salário não pode exceder 20% do bruto: é o teto do regime.
    expect(com.irsSalarioGerente).toBeLessThanOrEqual(com.salGerente * IFICI_TAXA.value + 1);
  });

  it("NÃO se estende aos dividendos nacionais", () => {
    // Art. 58.º-A n.º 2 EBF: só categorias A e B. Os dividendos seguem a
    // liberatória — aplicar-lhes 20% seria inventar um benefício.
    const com = simularEmpresaOpcoes(comIfici);
    expect(com.irsDividendosLiberatoria).toBeCloseTo(com.dividendos * 0.28, 2);
  });
});

describe("riqueza total — o lucro retido não desapareceu", () => {
  it("sem distribuir dividendos, o lucro fica contabilizado", () => {
    const r = simularEmpresaOpcoes({ ...BASE, distribuirDividendos: false });
    expect(r.dividendos).toBe(0);
    expect(r.lucroRetido).toBeGreaterThan(0);
    expect(r.riquezaTotal).toBeCloseTo(r.liquidoGerente + r.lucroRetido, 2);
    // A taxa que só olha ao bolso pessoal exagera a carga; a da riqueza não.
    expect(r.taxaEfetivaRiqueza).toBeLessThan(r.taxaEfetiva);
  });

  it("distribuindo tudo, as duas taxas coincidem", () => {
    const r = simularEmpresaOpcoes(BASE);
    expect(r.lucroRetido).toBe(0);
    expect(r.taxaEfetivaRiqueza).toBeCloseTo(r.taxaEfetiva, 6);
  });
});

describe("perfil pessoal do gerente", () => {
  it("os dependentes reduzem o IRS, como do lado dos recibos verdes", () => {
    const solteiro = simularEmpresaOpcoes({ ...BASE, salarioGerenteMensal: 3_000 });
    const comFilhos = simularEmpresaOpcoes({
      ...BASE,
      salarioGerenteMensal: 3_000,
      perfil: { ...PERFIL_GERENTE_PADRAO, dependentes: 2 },
    });
    expect(comFilhos.liquidoGerente - solteiro.liquidoGerente).toBeCloseTo(
      2 * DEDUCAO_DEPENDENTE.value,
      2,
    );
  });

  it("o perfil vem no resultado, para a interface poder dizer o que assumiu", () => {
    const r = simularEmpresaOpcoes(BASE);
    expect(r.perfil).toEqual(PERFIL_GERENTE_PADRAO);
  });
});

describe("subsídios de férias e Natal", () => {
  it("14 meses aumentam o salário anual e o custo da empresa", () => {
    const m12 = simularEmpresaOpcoes({ ...BASE, mesesSalarioGerente: 12 });
    const m14 = simularEmpresaOpcoes({ ...BASE, mesesSalarioGerente: 14 });
    expect(m14.salGerente).toBeCloseTo((m12.salGerente / 12) * 14, 2);
    expect(m14.totalCustos).toBeGreaterThan(m12.totalCustos);
    expect(m14.mesesSalarioGerente).toBe(14);
  });
});

describe("invariantes do motor de empresa", () => {
  it("a taxa efetiva da riqueza nunca passa de 100%", () => {
    for (const faturacao of [10_000, 50_000, 100_000, 200_000]) {
      const r = simularEmpresaOpcoes({ ...BASE, faturacao });
      expect(r.taxaEfetivaRiqueza).toBeLessThanOrEqual(1);
    }
  });

  it("faturar mais nunca reduz a riqueza total", () => {
    let anterior = -Infinity;
    for (let f = 20_000; f <= 200_000; f += 20_000) {
      const r = simularEmpresaOpcoes({ ...BASE, faturacao: f });
      expect(r.riquezaTotal).toBeGreaterThanOrEqual(anterior);
      anterior = r.riquezaTotal;
    }
  });

  it("os custos somam as parcelas que os compõem", () => {
    const r = simularEmpresaOpcoes({
      ...BASE,
      custosExtra: 2_000,
      custoConstituicaoAnual: 400,
      despRepresentacao: 1_000,
      encargosViatura: 3_000,
      tipoViatura: "comb_baixo",
    });
    expect(r.totalCustos).toBeCloseTo(
      r.despesasOper + r.custosExtra + r.salGerente + r.ssSalGerente
        + r.encargosDedutiveis + r.custoConstituicao,
      2,
    );
  });
});
