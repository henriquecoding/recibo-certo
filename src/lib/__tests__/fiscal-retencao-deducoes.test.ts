import { describe, it, expect } from "vitest";
import { calcular, retencaoNaFonte, simularIRSAnual } from "@/lib/fiscal";
import { RETENCAO, DEDUCAO_SAUDE, DEDUCAO_EDUCACAO } from "@/lib/fiscal-data";

// ─────────────────────────────────────────────────────────────────────────
//  RETENÇÃO NA FONTE — o reembolso que não existia
//
//  O acerto anual do modo completo calculava `faturação × taxa`, sem
//  condições. Quem marcava a dispensa do Art. 101.º-B via na mesma
//  «reembolso de X (retiveste Y)» com um Y que nunca tinha sido retido; e no
//  IRS Jovem a base da retenção também é reduzida, o que tornava o reembolso
//  fantasma ainda maior justamente para quem está no 1.º ano.
// ─────────────────────────────────────────────────────────────────────────

const TAXA = RETENCAO.art151.value;

describe("retencaoNaFonte", () => {
  it("a dispensa do Art. 101.º-B zera a retenção", () => {
    expect(retencaoNaFonte(14_000, TAXA, { dispensa: true })).toBe(0);
    expect(retencaoNaFonte(14_000, TAXA)).toBeCloseTo(14_000 * TAXA, 2);
  });

  it("o IRS Jovem reduz a base da retenção", () => {
    // 1.º ano: 100% de isenção → nada a reter.
    expect(retencaoNaFonte(14_000, TAXA, { irsJovemAno: 1 })).toBe(0);
    // Um ano mais tarde a isenção é parcial: retém-se sobre o resto.
    const ano4 = retencaoNaFonte(14_000, TAXA, { irsJovemAno: 4 });
    expect(ano4).toBeGreaterThan(0);
    expect(ano4).toBeLessThan(14_000 * TAXA);
  });

  it("dá o mesmo que `calcular()` — os dois caminhos não podem divergir", () => {
    const casos = [
      { dispensa: false, jovem: undefined },
      { dispensa: true, jovem: undefined },
      { dispensa: false, jovem: 1 },
      { dispensa: false, jovem: 4 },
      { dispensa: true, jovem: 4 },
    ] as const;

    for (const { dispensa, jovem } of casos) {
      const mensal = calcular({
        bruto: 14_000 / 12,
        tipo: "art151",
        regiao: "continente",
        regimeIVA: "isento",
        baseSS: "servicos",
        dispensaRetencao: dispensa,
        isencaoSSPrimeiroAno: false,
        acumulaEmprego: false,
        irsJovemAno: jovem,
      });
      const anual = retencaoNaFonte(14_000, TAXA, { dispensa, irsJovemAno: jovem });
      expect(mensal.retencaoIRS * 12).toBeCloseTo(anual, 2);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
//  DEDUÇÕES À COLETA — as parcelas têm de somar o total
// ─────────────────────────────────────────────────────────────────────────

describe("detalhe das deduções de despesas", () => {
  const comDespesas = () =>
    simularIRSAnual({
      brutoAnual: 40_000,
      tipo: "art151",
      anoAtividade: 3,
      deducoes: { saude: 2_000, educacao: 1_500, gerais: 3_000, rendas: 4_000 },
    });

  it("cada parcela vem preenchida e a soma bate com o aplicado", () => {
    const d = comDespesas().deducoesDespesasDetalhe;
    expect(d.saude).toBeCloseTo(2_000 * DEDUCAO_SAUDE.value.taxa, 2);
    expect(d.educacao).toBeCloseTo(1_500 * DEDUCAO_EDUCACAO.value.taxa, 2);
    expect(d.gerais).toBeGreaterThan(0);
    expect(d.rendas).toBeGreaterThan(0);

    // `somaBruta` cobre só as rubricas SUJEITAS ao teto do Art. 78.º n.º 7
    // (alíneas c) a h), k) e m). As despesas gerais familiares são a alínea b)
    // e ficam de fora — por isso não entram nesta soma, mas entram no aplicado.
    const sujeitasAoTeto = d.saude + d.educacao + d.rendas + d.lares + d.ppr + d.donativos + d.pensaoAlimentos;
    expect(sujeitasAoTeto).toBeCloseTo(d.somaBruta, 2);
    expect(d.geraisForaDoLimite).toBe(true);
    expect(d.dentroDoLimite).toBeCloseTo(Math.min(d.somaBruta, d.limiteGlobal), 2);
    expect(d.aplicado).toBeCloseTo(Math.min(d.somaBruta, d.limiteGlobal) + d.gerais, 2);
  });

  it("o aplicado é o que o resultado usa", () => {
    const r = comDespesas();
    expect(r.deducoesDespesasDetalhe.aplicado).toBeCloseTo(r.deducaoDespesas, 2);
  });

  it("assinala quando o limite global do Art. 78.º n.º 7 corta", () => {
    // Rendimento alto → limite global baixo; despesas altas → corte.
    const r = simularIRSAnual({
      brutoAnual: 150_000,
      tipo: "art151",
      anoAtividade: 3,
      deducoes: { saude: 10_000, educacao: 8_000, gerais: 20_000, rendas: 12_000 },
    });
    const d = r.deducoesDespesasDetalhe;
    expect(d.limitado).toBe(true);
    expect(d.dentroDoLimite).toBeLessThan(d.somaBruta);
    expect(d.dentroDoLimite).toBeCloseTo(d.limiteGlobal, 2);
    // As despesas gerais sobrevivem ao corte: estão fora do perímetro do n.º 7.
    expect(d.aplicado).toBeCloseTo(d.limiteGlobal + d.gerais, 2);
  });

  it("majora o limite global em 5% por dependente a partir do terceiro (n.º 8)", () => {
    const base = {
      brutoAnual: 150_000,
      tipo: "art151" as const,
      anoAtividade: 3,
      deducoes: { saude: 10_000, educacao: 8_000, rendas: 12_000 },
    };
    const semDeps = simularIRSAnual(base).deducoesDespesasDetalhe.limiteGlobal;
    const doisDeps = simularIRSAnual({ ...base, dependentes: 2 }).deducoesDespesasDetalhe.limiteGlobal;
    const quatroDeps = simularIRSAnual({ ...base, dependentes: 4 }).deducoesDespesasDetalhe.limiteGlobal;
    expect(doisDeps).toBeCloseTo(semDeps, 2);
    expect(quatroDeps).toBeCloseTo(semDeps * 1.2, 2);
  });

  it("sem despesas, tudo a zero e nada limitado", () => {
    const d = simularIRSAnual({ brutoAnual: 30_000, tipo: "art151", anoAtividade: 3 })
      .deducoesDespesasDetalhe;
    expect(d.somaBruta).toBe(0);
    expect(d.aplicado).toBe(0);
    expect(d.limitado).toBe(false);
  });
});
