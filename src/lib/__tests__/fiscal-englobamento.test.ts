import { describe, it, expect } from "vitest";
import { simularIRSAnual } from "@/lib/fiscal";

// ─────────────────────────────────────────────────────────────────────────
//  ENGLOBAMENTO (Art. 22.º CIRS) — quem acumula emprego com recibos verdes
//
//  O modo guiado desligava a Segurança Social pela acumulação e calculava o
//  IRS como se a pessoa só tivesse os recibos verdes — a começar no primeiro
//  escalão. É provavelmente o perfil mais comum do produto, e era aquele a
//  quem o simulador dava o número mais errado, sempre no sentido em que se
//  reserva a menos.
// ─────────────────────────────────────────────────────────────────────────

const CAT_B = { brutoAnual: 15_000, tipo: "art151" as const, anoAtividade: 3 };

describe("englobamento da Categoria A", () => {
  it("o salário empurra os recibos verdes para escalões mais altos", () => {
    const sozinho = simularIRSAnual(CAT_B);
    const comSalario = simularIRSAnual({
      ...CAT_B,
      outrosRendimentos: 30_000,
      acumulaEmprego: true,
    });

    // O imposto imputável à Cat. B mais do que triplica — é este o buraco.
    expect(comSalario.irsImputavelCatB).toBeGreaterThan(sozinho.irsEstimado * 3);
    expect(comSalario.irsImputavelCatB - sozinho.irsEstimado).toBeGreaterThan(2_500);
  });

  it("o coletável soma as duas categorias", () => {
    const r = simularIRSAnual({ ...CAT_B, outrosRendimentos: 30_000 });
    expect(r.outrosRendimentos).toBe(30_000);
    expect(r.rendimentoColetavel).toBeCloseTo(r.rendimentoTributavel + 30_000, 2);
  });

  it("a parte imputável à Cat. B é marginal, não proporcional", () => {
    // Não é o imposto total × (Cat. B / total): o salário ocupa os escalões
    // de baixo e a atividade é tributada por cima.
    const soSalario = simularIRSAnual({
      brutoAnual: 0,
      tipo: "art151",
      anoAtividade: 3,
      outrosRendimentos: 30_000,
    });
    const tudo = simularIRSAnual({ ...CAT_B, outrosRendimentos: 30_000 });
    expect(tudo.irsImputavelCatB).toBeCloseTo(tudo.irsEstimado - soSalario.irsEstimado, 2);

    const proporcional = tudo.irsEstimado * (CAT_B.brutoAnual / (CAT_B.brutoAnual + 30_000));
    expect(tudo.irsImputavelCatB).toBeGreaterThan(proporcional);
  });

  it("sem outros rendimentos, imputável e total são o mesmo número", () => {
    const r = simularIRSAnual(CAT_B);
    expect(r.irsImputavelCatB).toBe(r.irsEstimado);
  });

  it("a taxa média efetiva usa a parte imputável, não o imposto do agregado", () => {
    const r = simularIRSAnual({ ...CAT_B, outrosRendimentos: 30_000 });
    expect(r.taxaMediaEfetiva).toBeCloseTo(r.irsImputavelCatB / CAT_B.brutoAnual, 6);
    // Com o total, a taxa "efetiva" da atividade passaria de 60% — absurdo.
    expect(r.taxaMediaEfetiva).toBeLessThan(0.5);
  });

  it("a decomposição nunca é negativa", () => {
    // Rendimento baixo + mínimo de existência podem dar imposto zero nos dois
    // cenários; a diferença tem de continuar a ser um número apresentável.
    const r = simularIRSAnual({
      brutoAnual: 5_000,
      tipo: "art151",
      anoAtividade: 3,
      outrosRendimentos: 6_000,
    });
    expect(r.irsImputavelCatB).toBeGreaterThanOrEqual(0);
    expect(r.irsImputavelCatB).toBeLessThanOrEqual(r.irsEstimado);
  });
});
