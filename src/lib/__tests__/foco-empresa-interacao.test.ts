import { describe, expect, it } from "vitest";
import { dadosEmpresa } from "@/lib/foco/dados-servidor";
import { compararCategorias } from "@/lib/fiscal-dependente";

describe("palco Empresa: cenários interativos", () => {
  it("leva para o cliente apenas respostas calculadas pelo motor fiscal", () => {
    const dados = dadosEmpresa();

    expect(dados.cenarios.length).toBeGreaterThan(30);
    expect(dados.cenarios.map((ponto) => ponto.faturacao)).toContain(dados.cruzamento);

    for (const ponto of dados.cenarios) {
      const calculado = compararCategorias({ brutoAnual: ponto.faturacao, dependentes: 0 });
      expect(ponto.freelancer).toBe(Math.round(calculado.freelancer.liquido));
      expect(ponto.empresa).toBe(Math.round(calculado.empresa.liquido));
    }
  });

  it("oferece uma grelha ordenada e inclui o cenário editorial de 30 mil euros", () => {
    const dados = dadosEmpresa();
    const faturacoes = dados.cenarios.map((ponto) => ponto.faturacao);

    expect(faturacoes).toEqual([...faturacoes].sort((a, b) => a - b));
    expect(faturacoes).toContain(dados.exemplo);
    expect(new Set(faturacoes).size).toBe(faturacoes.length);
  });
});
