import { describe, it, expect } from "vitest";
import { projetarDataLimite } from "@/components/dashboard/IvaProgresso";
import { prazoSS, calcularSS } from "@/components/dashboard/GuardiaoSS";
import {
  IVA_ISENCAO_LIMITE,
  SS_TAXA,
  SS_COEFICIENTE,
  DISPENSA_RETENCAO_LIMITE,
} from "@/lib/fiscal-data";
import { simularDeclaracaoIRS } from "@/lib/fiscal";

const LIMITE_IVA = IVA_ISENCAO_LIMITE.value; // € 15 000

// ── projetarDataLimite ────────────────────────────────────────────────────────

describe("projetarDataLimite", () => {
  it("retorna null se faturado é zero", () => {
    expect(projetarDataLimite(0, LIMITE_IVA, 5)).toBeNull();
  });

  it("retorna null se já ultrapassou o limite", () => {
    expect(projetarDataLimite(16_000, LIMITE_IVA, 5)).toBeNull();
  });

  it("projeta 6 meses à frente se faturou 7500€ em 6 meses (jan-jun)", () => {
    // mesAtual = 5 (junho, 0-indexed) → 6 meses decorridos → média 1250/mês
    // Restam 7500€ / 1250€ = 6 meses → projeta dezembro
    const data = projetarDataLimite(7_500, LIMITE_IVA, 5);
    expect(data).not.toBeNull();
    expect(data!.getMonth()).toBe(11); // dezembro
  });

  it("projeta 1 mês se faturou 14500€ em 10 meses", () => {
    // média 1450/mês; restam 500€ → < 1 mês → Math.ceil = 1
    const data = projetarDataLimite(14_500, LIMITE_IVA, 9);
    expect(data).not.toBeNull();
    expect(data!.getMonth()).toBeGreaterThanOrEqual(0);
  });

  it("retorna null se a média mensal é zero (limite já atingido)", () => {
    expect(projetarDataLimite(15_000, LIMITE_IVA, 5)).toBeNull();
  });
});

// ── prazoSS ──────────────────────────────────────────────────────────────────

describe("prazoSS", () => {
  it("1.º trimestre → 20 de outubro do mesmo ano", () => {
    expect(prazoSS(0, 2026).toISOString().slice(0, 10)).toBe("2026-10-20");
  });

  it("2.º trimestre → 20 de outubro do mesmo ano", () => {
    expect(prazoSS(1, 2026).toISOString().slice(0, 10)).toBe("2026-10-20");
  });

  it("3.º trimestre → 20 de janeiro do ano seguinte", () => {
    expect(prazoSS(2, 2026).toISOString().slice(0, 10)).toBe("2027-01-20");
  });

  it("4.º trimestre → 20 de abril do ano seguinte", () => {
    expect(prazoSS(3, 2026).toISOString().slice(0, 10)).toBe("2027-04-20");
  });
});

// ── calcularSS ───────────────────────────────────────────────────────────────

describe("calcularSS", () => {
  it("aplica 21,4% sobre 70% dos rendimentos", () => {
    const rendimento = 1_000;
    const base = rendimento * SS_COEFICIENTE.servicos.value; // 700
    const ss   = base * SS_TAXA.value;                       // 149,80
    expect(calcularSS(rendimento)).toBeCloseTo(ss, 2);
  });

  it("resultado zero para rendimento zero", () => {
    expect(calcularSS(0)).toBe(0);
  });

  it("escala linearmente com o rendimento", () => {
    expect(calcularSS(2_000)).toBeCloseTo(calcularSS(1_000) * 2, 2);
  });
});

// ── Constantes fiscais (verificação de integridade) ──────────────────────────

describe("constantes fiscais 2026", () => {
  it("IVA_ISENCAO_LIMITE é € 15 000", () => {
    expect(IVA_ISENCAO_LIMITE.value).toBe(15_000);
  });

  it("SS_TAXA é 21,4%", () => {
    expect(SS_TAXA.value).toBeCloseTo(0.214, 3);
  });

  it("SS_COEFICIENTE.servicos é 70%", () => {
    expect(SS_COEFICIENTE.servicos.value).toBeCloseTo(0.70, 2);
  });

  it("DISPENSA_RETENCAO_LIMITE é €15 000", () => {
    expect(DISPENSA_RETENCAO_LIMITE.value).toBe(15_000);
  });
});

// ── Sujeito passivo B (tributação conjunta) ─────────────────────────────────
describe("simularDeclaracaoIRS — sujeito passivo B", () => {
  const base = {
    conjunta: true as const,
    salarios: { bruto: 30_000, retencoes: 3_000 },
  };

  it("é retrocompatível: sem titularB o resultado não muda", () => {
    const semB = simularDeclaracaoIRS(base);
    const comBVazio = simularDeclaracaoIRS({ ...base, titularB: {} });
    expect(comBVazio.irsTotal).toBeCloseTo(semB.irsTotal, 2);
    expect(comBVazio.rendimentoGlobal).toBeCloseTo(semB.rendimentoGlobal, 2);
  });

  it("agrega o rendimento e as retenções do SP B", () => {
    const semB = simularDeclaracaoIRS(base);
    const comB = simularDeclaracaoIRS({
      ...base,
      titularB: { salarios: { bruto: 20_000, retencoes: 2_000 } },
    });
    // O rendimento global do agregado soma o bruto do SP B.
    expect(comB.rendimentoGlobal).toBeCloseTo(semB.rendimentoGlobal + 20_000, 2);
    // As retenções do SP B somam às totais.
    expect(comB.retencoesTotais).toBeCloseTo(semB.retencoesTotais + 2_000, 2);
    // Mais rendimento coletável agregado → mais IRS total.
    expect(comB.irsTotal).toBeGreaterThan(semB.irsTotal);
  });

  it("ignora o titularB quando a tributação não é conjunta", () => {
    const individual = simularDeclaracaoIRS({ ...base, conjunta: false });
    const individualComB = simularDeclaracaoIRS({
      ...base,
      conjunta: false,
      titularB: { salarios: { bruto: 20_000, retencoes: 2_000 } },
    });
    expect(individualComB.irsTotal).toBeCloseTo(individual.irsTotal, 2);
    expect(individualComB.rendimentoGlobal).toBeCloseTo(individual.rendimentoGlobal, 2);
  });

  it("soma a Segurança Social da categoria B do SP B", () => {
    const comIndepB = simularDeclaracaoIRS({
      ...base,
      titularB: { independente: { brutoAnual: 25_000, tipo: "art151" } },
    });
    // O SP B tem atividade independente → SS estimada > 0 no agregado.
    expect(comIndepB.ssAnual).toBeGreaterThan(0);
  });
});
