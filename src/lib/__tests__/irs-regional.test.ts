import { describe, it, expect } from "vitest";
import {
  ESCALOES_IRS,
  REDUCAO_IRS_REGIOES_AUTONOMAS,
  escaloesIRSDaRegiao,
  type Regiao,
} from "@/lib/fiscal-data";
import { irsProgressivo, simularDeclaracaoIRS } from "@/lib/fiscal";
import { residenciaParaRegiao } from "@/lib/irs-guiado";

// ═══════════════════════════════════════════════════════════════════════
//  IRS DAS REGIÕES AUTÓNOMAS
//
//  A Lei das Finanças das Regiões Autónomas (Lei Orgânica 2/2013) deixa as
//  assembleias regionais baixarem as taxas nacionais de IRS até 30%, e em
//  2026 a Madeira (DLR 8/2025/M) e os Açores (DLR 15-A/2021/A) aplicam o
//  máximo em TODOS os escalões.
//
//  O que estes testes protegem, por ordem de gravidade se falharem:
//
//   1. que a derivação reproduz a tabela PUBLICADA, cêntimo a cêntimo;
//   2. que o continente não mudou nada;
//   3. que a redução é da RESIDÊNCIA e não da origem do rendimento;
//   4. que um não residente nunca a apanha.
// ═══════════════════════════════════════════════════════════════════════

/** Tabela publicada para 2026 (Agenda da OCC) — Madeira e Açores. */
const PUBLICADA_2026 = [0.0875, 0.1099, 0.1484, 0.1687, 0.2177, 0.2443, 0.3017, 0.3122, 0.336];

/** Tabela nacional publicada para 2026, para não a ler do próprio dataset. */
const NACIONAL_2026 = [0.125, 0.157, 0.212, 0.241, 0.311, 0.349, 0.431, 0.446, 0.48];

describe("as taxas regionais reproduzem a tabela publicada", () => {
  it("o dataset nacional é o do Art. 68.º para 2026", () => {
    expect(ESCALOES_IRS.value.map((e) => e.taxa)).toEqual(NACIONAL_2026);
  });

  for (const regiao of ["madeira", "acores"] as const) {
    it(`${regiao}: os nove escalões batem certo com a tabela oficial`, () => {
      const taxas = escaloesIRSDaRegiao(regiao).map((e) => e.taxa);
      expect(taxas).toEqual(PUBLICADA_2026);
    });

    it(`${regiao}: a lei baixa a TAXA, não o limite do escalão`, () => {
      expect(escaloesIRSDaRegiao(regiao).map((e) => e.ate)).toEqual(
        ESCALOES_IRS.value.map((e) => e.ate),
      );
    });
  }

  it("o diferencial declarado nunca excede os 30% que a lei permite", () => {
    for (const r of ["madeira", "acores"] as const) {
      expect(REDUCAO_IRS_REGIOES_AUTONOMAS.value[r]).toBeGreaterThan(0);
      expect(REDUCAO_IRS_REGIOES_AUTONOMAS.value[r]).toBeLessThanOrEqual(0.3);
    }
  });

  it("o parâmetro carrega base legal, fonte e data — a regra 1 do projeto", () => {
    expect(REDUCAO_IRS_REGIOES_AUTONOMAS.legalBasis).toMatch(/Lei Orgânica n\.º 2\/2013/);
    expect(REDUCAO_IRS_REGIOES_AUTONOMAS.legalBasis).toMatch(/8\/2025\/M/);
    expect(REDUCAO_IRS_REGIOES_AUTONOMAS.legalBasis).toMatch(/15-A\/2021\/A/);
    expect(REDUCAO_IRS_REGIOES_AUTONOMAS.source).toBeTruthy();
    expect(REDUCAO_IRS_REGIOES_AUTONOMAS.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("o continente não mudou", () => {
  it("o valor por omissão é o continente", () => {
    for (const c of [0, 5000, 12000, 25000, 50000, 120000]) {
      expect(irsProgressivo(c)).toBe(irsProgressivo(c, "continente"));
    }
  });

  it("e o continente continua a dar exatamente o que a tabela nacional dá", () => {
    // Cálculo independente, à mão, a partir da tabela publicada.
    const aMao = (coletavel: number) => {
      let restante = coletavel;
      let inferior = 0;
      let imposto = 0;
      ESCALOES_IRS.value.forEach((e, i) => {
        const superior = e.ate ?? Infinity;
        const tranche = Math.min(restante + inferior, superior) - inferior;
        if (tranche > 0) {
          imposto += tranche * NACIONAL_2026[i];
          restante -= tranche;
          inferior = superior;
        }
      });
      return imposto;
    };
    for (const c of [8000, 20000, 45000, 100000]) {
      expect(irsProgressivo(c, "continente")).toBeCloseTo(aMao(c), 6);
    }
  });
});

describe("quanto é que a redução vale, na prática", () => {
  // Como TODAS as taxas descem na mesma proporção, o imposto total desce na
  // mesma proporção — seja qual for o rendimento. É uma identidade forte, e
  // por isso um teste que apanha qualquer desvio na derivação.
  it("o IRS de um residente numa região autónoma é 70% do continental", () => {
    for (const c of [1000, 8342, 20000, 43090, 86634, 250000]) {
      for (const r of ["madeira", "acores"] as const) {
        expect(irsProgressivo(c, r)).toBeCloseTo(irsProgressivo(c, "continente") * 0.7, 6);
      }
    }
  });

  it("zero de coletável continua a ser zero de imposto em qualquer região", () => {
    for (const r of ["continente", "madeira", "acores"] as const) {
      expect(irsProgressivo(0, r)).toBe(0);
      expect(irsProgressivo(-100, r)).toBe(0);
    }
  });

  it("nenhuma entrada finita produz NaN", () => {
    for (const r of ["continente", "madeira", "acores"] as const) {
      for (const c of [0.01, 1e-9, 999999999]) {
        expect(Number.isFinite(irsProgressivo(c, r))).toBe(true);
      }
    }
  });
});

describe("a redução é da RESIDÊNCIA, não da origem do rendimento", () => {
  const declaracao = (residenciaFiscal?: Regiao) =>
    simularDeclaracaoIRS({
      residenciaFiscal,
      independente: { brutoAnual: 40000, tipo: "art151", anoAtividade: 3 },
    });

  it("declarar residência numa região autónoma baixa o IRS apurado", () => {
    const cont = declaracao("continente").irsTotal;
    expect(declaracao("madeira").irsTotal).toBeLessThan(cont);
    expect(declaracao("acores").irsTotal).toBeLessThan(cont);
  });

  it("não declarar residência mantém o comportamento de sempre", () => {
    expect(declaracao(undefined).irsTotal).toBe(declaracao("continente").irsTotal);
  });

  it("um NÃO RESIDENTE nunca apanha a redução regional", () => {
    // «estrangeiro» não é uma região com taxa própria: é alguém fora do
    // âmbito das taxas gerais. Devolver-lhe Madeira seria dar um benefício
    // a quem a lei não o dá.
    expect(residenciaParaRegiao("estrangeiro")).toBe("continente");
    expect(residenciaParaRegiao(undefined)).toBe("continente");
    expect(residenciaParaRegiao("madeira")).toBe("madeira");
    expect(residenciaParaRegiao("acores")).toBe("acores");
    expect(residenciaParaRegiao("continente")).toBe("continente");
  });
});
