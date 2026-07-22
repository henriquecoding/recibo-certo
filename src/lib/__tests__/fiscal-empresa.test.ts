import { describe, expect, it } from "vitest";
import {
  calcularTributacaoAutonomaEmpresa,
  simularEmpresa,
  simularEmpresaGuiado,
} from "../fiscal-empresa";

function completo(rfaiInvest = 0) {
  return simularEmpresa(
    120_000, 12_000, 2_000, 2_500, true, false,
    0, "comb_baixo", 0, 0, 0, false, true,
    rfaiInvest, "interior", 0, "pme_normal", false, 360, 0,
  );
}

describe("motor empresarial canónico", () => {
  it("aplica 10% aos encargos de elétricos acima do limiar", () => {
    expect(
      calcularTributacaoAutonomaEmpresa(10_000, "eletrica_cara", 0, 0, 0, false, true),
    ).toMatchObject({ viatura: 1_000, total: 1_000 });
  });

  it("não aplica benefícios fiscais sem validação documental", () => {
    const result = completo(50_000);
    expect(result.beneficios.status).toBe("needs_professional_review");
    expect(result.beneficios.potencialTotal).toBeGreaterThan(0);
    expect(result.beneficios.total).toBe(0);
    expect(result.ircAposBeneficios).toBe(result.coleta);
  });

  it("usa o payroll mensal para retenção, SS e líquido do gerente", () => {
    const result = completo();
    expect(result.payrollGerente.retencaoIRSMensal).toBeGreaterThan(0);
    expect(result.retencaoSalarioGerente).toBeCloseTo(
      result.payrollGerente.retencaoIRSMensal * 12,
      2,
    );
    expect(result.payrollGerente.liquidoMensal).toBeLessThan(
      result.payrollGerente.salarioBrutoMensal,
    );
  });

  it("mantém paridade entre os adaptadores completo e guiado", () => {
    const full = completo();
    const guided = simularEmpresaGuiado(
      120_000, 12_000, 2_000, 2_500, true, false,
      true, 360, 1,
      "comb_baixo", 0, 0, 0, 0, false, true,
      "interior", 0, false, 0, "pme_normal", 0,
      false, 0, 0, false, 0, false, 1,
    );
    expect(guided.coleta).toBe(full.coleta);
    expect(guided.ircTotal).toBe(full.ircTotal);
    expect(guided.liquidoGerente).toBe(full.liquidoGerente);
    expect(guided.payrollGerente).toEqual(full.payrollGerente);
  });
});
