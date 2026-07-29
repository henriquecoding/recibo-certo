import { describe, it, expect } from "vitest";
import { contribuicoesSS, contribuicoesSSAnuais, simularIRSAnual, calcular } from "@/lib/fiscal";
import {
  IAS,
  SS_ACUMULACAO_LIMITE_MENSAL,
  SS_BASE_MAX_MENSAL,
  SS_COEFICIENTE,
  SS_MIN_MENSAL,
  SS_TAXA,
  DEDUCAO_ESPECIFICA_CATB,
} from "@/lib/fiscal-data";

// ─────────────────────────────────────────────────────────────────────────
//  SEGURANÇA SOCIAL — o cálculo que estava escrito três vezes
//
//  Antes: `calcular()` não tinha mínimo mensal, `simularIRSAnual` tratava a
//  acumulação com emprego como isenção total, e a regra dos 15% ignorava
//  teto, coeficiente por tipo e isenções. Cada um destes testes fixa uma das
//  divergências para ela não voltar.
// ─────────────────────────────────────────────────────────────────────────

const TETO_ANUAL = SS_BASE_MAX_MENSAL.value * SS_TAXA.value * 12;

describe("contribuicoesSS — teto, piso e coeficiente", () => {
  it("aplica o teto de 12 × IAS ao rendimento relevante", () => {
    // 200 000 € × 70% / 12 = 11 667 €/mês, muito acima do teto de 6 445,56 €.
    const s = contribuicoesSS(200_000, "servicos");
    expect(s.limitadoPeloTeto).toBe(true);
    expect(s.contribuicaoAnual).toBeCloseTo(TETO_ANUAL, 2);
    // O valor que o motor creditava antes — 0,7 × 21,4% sem teto — era quase o
    // dobro. É esta diferença que valia ~6 400 € de IRS.
    expect(200_000 * SS_COEFICIENTE.servicos.value * SS_TAXA.value).toBeGreaterThan(
      s.contribuicaoAnual * 1.7,
    );
  });

  it("respeita o coeficiente da natureza da atividade", () => {
    const servicos = contribuicoesSSAnuais(50_000, "servicos");
    const bens = contribuicoesSSAnuais(50_000, "bens");
    expect(servicos).toBeCloseTo(50_000 * 0.7 * SS_TAXA.value, 2);
    expect(bens).toBeCloseTo(50_000 * 0.2 * SS_TAXA.value, 2);
    expect(bens).toBeLessThan(servicos);
  });

  it("aplica a contribuição mínima mensal a rendimentos baixos", () => {
    const s = contribuicoesSS(1_000, "servicos");
    expect(s.contribuicaoMensal).toBe(SS_MIN_MENSAL.value);
  });

  it("sem faturação não há contribuição a mostrar", () => {
    expect(contribuicoesSSAnuais(0, "servicos")).toBe(0);
  });

  it("a isenção do 1.º ano é mesmo total", () => {
    expect(contribuicoesSSAnuais(50_000, "servicos", { primeiroAno: true })).toBe(0);
  });
});

describe("contribuicoesSS — acumulação com emprego (Art. 157.º n.º 1 al. a)", () => {
  it("dispensa total enquanto o rendimento relevante fica abaixo de 4 × IAS", () => {
    const s = contribuicoesSS(20_000, "servicos", { acumulaEmprego: true });
    expect(s.dispensaAcumulacao).toBe("total");
    expect(s.contribuicaoAnual).toBe(0);
  });

  it("acima de 4 × IAS contribui sobre o EXCEDENTE, não sobre tudo", () => {
    // O erro era zerar incondicionalmente. Mas a correção também não é cobrar
    // sobre a base toda: a lei manda contribuir só sobre o que excede.
    const bruto = 60_000;
    const s = contribuicoesSS(bruto, "servicos", { acumulaEmprego: true });
    const baseMensal = (bruto * SS_COEFICIENTE.servicos.value) / 12;
    const excedente = baseMensal - SS_ACUMULACAO_LIMITE_MENSAL.value;
    expect(s.dispensaAcumulacao).toBe("parcial");
    expect(s.contribuicaoAnual).toBeCloseTo(excedente * SS_TAXA.value * 12, 2);
    expect(s.contribuicaoAnual).toBeLessThan(contribuicoesSSAnuais(bruto, "servicos"));
    expect(s.contribuicaoAnual).toBeGreaterThan(0);
  });

  it("o excedente não tem contribuição mínima de 20 €", () => {
    // Um cêntimo acima do limite não pode saltar para 20 €/mês: o mínimo é do
    // regime geral, não desta dispensa.
    const limiteAnual = (SS_ACUMULACAO_LIMITE_MENSAL.value * 12) / SS_COEFICIENTE.servicos.value;
    const s = contribuicoesSS(limiteAnual + 12, "servicos", { acumulaEmprego: true });
    expect(s.contribuicaoMensal).toBeGreaterThan(0);
    expect(s.contribuicaoMensal).toBeLessThan(SS_MIN_MENSAL.value);
  });

  it("a dispensa nunca ultrapassa o teto: a base já vem limitada", () => {
    const s = contribuicoesSS(500_000, "servicos", { acumulaEmprego: true });
    const excedenteMax = SS_BASE_MAX_MENSAL.value - SS_ACUMULACAO_LIMITE_MENSAL.value;
    expect(s.contribuicaoAnual).toBeCloseTo(excedenteMax * SS_TAXA.value * 12, 2);
  });

  it("4 × IAS é mesmo 4 × IAS", () => {
    expect(SS_ACUMULACAO_LIMITE_MENSAL.value).toBeCloseTo(4 * IAS.value, 2);
  });
});

describe("regra dos 15% (Art. 31.º n.º 13 al. a) — usa as contribuições reais", () => {
  it("acima do teto da SS, a regra dos 15% passa a morder", () => {
    // Com as contribuições sem teto, o abatimento cobria quase todos os 15% e o
    // acréscimo ficava em ~40 €. Com o teto real, aparecem ~13 400 €.
    const r = simularIRSAnual({ brutoAnual: 200_000, tipo: "art151", anoAtividade: 3 });
    expect(r.despesasAutomaticas).toBeCloseTo(TETO_ANUAL, 2);
    expect(r.acrescimo15).toBeGreaterThan(10_000);
  });

  it("não credita contribuições que a isenção do 1.º ano dispensou", () => {
    const isento = simularIRSAnual({
      brutoAnual: 50_000,
      tipo: "art151",
      anoAtividade: 1,
      isencaoSSPrimeiroAno: true,
    });
    // Sem contribuições, resta a dedução específica — não 7 490 € inventados.
    expect(isento.despesasAutomaticas).toBeCloseTo(DEDUCAO_ESPECIFICA_CATB.value, 2);
  });

  it("quem vende bens não é tratado como prestador de serviços", () => {
    const bens = simularIRSAnual({ brutoAnual: 50_000, tipo: "vendas", anoAtividade: 3 });
    // 50 000 × 20% × 21,4% = 2 140 €, abaixo da dedução específica.
    expect(bens.despesasAutomaticas).toBeCloseTo(DEDUCAO_ESPECIFICA_CATB.value, 2);
  });
});

describe("calcular() e simularIRSAnual concordam sobre a Segurança Social", () => {
  const casos = [
    { bruto: 1_000, tipo: "art151" as const, baseSS: "servicos" as const },
    { bruto: 4_000, tipo: "art151" as const, baseSS: "servicos" as const },
    { bruto: 20_000, tipo: "art151" as const, baseSS: "servicos" as const },
  ];

  it.each(casos)("$bruto €/mês dá a mesma SS nos dois motores", ({ bruto, tipo, baseSS }) => {
    const porRecibo = calcular({
      bruto,
      tipo,
      regiao: "continente",
      regimeIVA: "isento",
      baseSS,
      dispensaRetencao: false,
      isencaoSSPrimeiroAno: false,
      acumulaEmprego: false,
    });
    const anual = simularIRSAnual({ brutoAnual: bruto * 12, tipo, anoAtividade: 3 });
    expect(porRecibo.segSocial * 12).toBeCloseTo(anual.ssAnual, 2);
  });

  it("a acumulação com emprego também concorda nos dois motores", () => {
    const bruto = 5_000;
    const porRecibo = calcular({
      bruto,
      tipo: "art151",
      regiao: "continente",
      regimeIVA: "isento",
      baseSS: "servicos",
      dispensaRetencao: false,
      isencaoSSPrimeiroAno: false,
      acumulaEmprego: true,
    });
    const anual = simularIRSAnual({
      brutoAnual: bruto * 12,
      tipo: "art151",
      anoAtividade: 3,
      acumulaEmprego: true,
    });
    expect(porRecibo.segSocial * 12).toBeCloseTo(anual.ssAnual, 2);
    expect(anual.ssAnual).toBeGreaterThan(0);
  });
});
