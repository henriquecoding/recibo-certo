import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("recibos verdes: integração canónica de preço", () => {
  it("incorpora o SimuladorPreco em vez de criar outra calculadora", () => {
    const studio = read("src/components/recibos-verdes/RecibosVerdesStudio.tsx");
    expect(studio).toContain('import SimuladorPreco from "@/components/precos/SimuladorPreco"');
    expect(studio).toContain('import { precificar, type ContextoPreco } from "@/lib/pricing"');
    expect(studio).toContain('superficie="recibos-verdes"');
    expect(studio).toContain("precificar(contexto)");
    expect(studio).toContain("resultado.precoLiquido");
  });

  it("transfere base sem IVA e projeção anual para o simulador fiscal", () => {
    const studio = read("src/components/recibos-verdes/RecibosVerdesStudio.tsx");
    const fiscal = read("src/components/SimuladorIntegrado.tsx");
    expect(studio).toContain("valorInicial={transferido?.liquido}");
    expect(studio).toContain("faturacaoAnualInicial={transferido?.anual}");
    expect(fiscal).toContain("valorInicial?: number");
    expect(fiscal).toContain("faturacaoAnualInicial?: number");
  });

  it("a landing carrega o estúdio unificado", () => {
    const lazy = read("src/app/ferramentas/recibos-verdes/lazy.tsx");
    expect(lazy).toContain('import("@/components/recibos-verdes/RecibosVerdesStudio")');
    expect(lazy).not.toContain('import("@/components/SimuladorIntegrado")');
  });
});
