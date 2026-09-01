import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { baseFiscalDoPreco } from "@/lib/negocio/market/preco-handoff";
import { cenarioPorChave, precificar, type ContextoPreco } from "@/lib/pricing";

const read = (path: string) => readFileSync(path, "utf8");

/** Um contexto real do motor, com o volume que o teste precisa. */
function contextoCom(unidadesMes: number): ContextoPreco {
  const base = cenarioPorChave("servico").contexto();
  return { ...base, volume: { ...base.volume, unidadesMes } };
}

describe("recibos verdes: integração canónica de preço", () => {
  it("incorpora o SimuladorPreco em vez de criar outra calculadora", () => {
    const studio = read("src/components/recibos-verdes/RecibosVerdesStudio.tsx");
    expect(studio).toContain('import SimuladorPreco from "@/components/precos/SimuladorPreco"');
    expect(studio).toContain('import { precificar, type ContextoPreco } from "@/lib/pricing"');
    expect(studio).toContain('superficie="recibos-verdes"');
    expect(studio).toContain("precificar(contexto)");
  });

  it("a base que chega ao simulador fiscal é MENSAL, não o preço de uma unidade", () => {
    // A regressão que isto tranca: durante um checkpoint inteiro, o preço
    // unitário foi escrito no campo mensal («Valor do recibo») enquanto a
    // projeção anual já contava o volume. Os dois números discordavam por
    // um fator igual às unidades vendidas.
    const contexto = contextoCom(40);
    const resultado = precificar(contexto);
    const base = baseFiscalDoPreco(resultado, contexto.volume.unidadesMes)!;

    expect(base.unitario).toBe(resultado.precoLiquido);
    expect(base.unidadesMes).toBe(40);
    expect(base.mensal).toBeCloseTo(resultado.precoLiquido * 40, 6);
    expect(base.anual).toBeCloseTo(base.mensal * 12, 6);
  });

  it("com uma unidade por mês, unitário e mensal coincidem", () => {
    const contexto = contextoCom(1);
    const base = baseFiscalDoPreco(precificar(contexto), 1)!;
    expect(base.mensal).toBe(base.unitario);
    expect(base.anual).toBe(base.unitario * 12);
  });

  it("um volume ausente ou absurdo não apaga a venda nem inventa outra", () => {
    const contexto = contextoCom(1);
    const resultado = precificar(contexto);
    for (const volume of [0, -3, Number.NaN, 0.4]) {
      const base = baseFiscalDoPreco(resultado, volume)!;
      expect(base.unidadesMes).toBe(1);
      expect(base.mensal).toBe(base.unitario);
    }
  });

  it("sem preço executável não transfere nada — nem um valor plausível", () => {
    expect(baseFiscalDoPreco(null, 3)).toBeNull();
  });

  it("transfere a base mensal e a projeção anual, e não o preço unitário", () => {
    const studio = read("src/components/recibos-verdes/RecibosVerdesStudio.tsx");
    const fiscal = read("src/components/SimuladorIntegrado.tsx");
    // Sem a chaveta final: o estúdio passou a aceitar também o contexto da
    // pesquisa global (`?ctx=`), e o que este teste fixa é a PRECEDÊNCIA —
    // o preço vem primeiro porque foi calculado aqui, agora, pelo motor.
    expect(studio).toContain("valorInicial={transferido?.mensal");
    expect(studio).toContain("faturacaoAnualInicial={transferido?.anual");
    expect(studio).toContain("valorInicial={transferido?.mensal ?? daBusca?.mensal}");
    expect(studio).not.toContain("valorInicial={transferido?.unitario}");
    expect(fiscal).toContain("valorInicial?: number");
    expect(fiscal).toContain("faturacaoAnualInicial?: number");
  });

  it("a landing carrega o estúdio unificado", () => {
    const lazy = read("src/app/ferramentas/recibos-verdes/lazy.tsx");
    expect(lazy).toContain('import("@/components/recibos-verdes/RecibosVerdesStudio")');
    expect(lazy).not.toContain('import("@/components/SimuladorIntegrado")');
  });
});
