import { describe, it, expect } from "vitest";
import { diagnosticoContabilista, LIMITE_ISENCAO_IVA, LIMITE_CONTAB_ORGANIZADA } from "../contabilista";

describe("diagnosticoContabilista", () => {
  it("abaixo da isenção de IVA, nacional, sem trabalhadores → gestão autónoma", () => {
    const d = diagnosticoContabilista({
      formaJuridica: "independente",
      faturacaoAnual: LIMITE_ISENCAO_IVA - 5000,
      despesasAnuais: 0,
      clientes: "nacional",
      trabalhadores: false,
    });
    expect(d.nivel).toBe("autonomo");
  });

  it("trabalhadores a cargo sobem a necessidade para, no mínimo, muito recomendado", () => {
    const base = {
      formaJuridica: "independente" as const,
      faturacaoAnual: LIMITE_ISENCAO_IVA - 5000,
      despesasAnuais: 0,
      clientes: "nacional" as const,
    };
    const sem = diagnosticoContabilista({ ...base, trabalhadores: false });
    const com = diagnosticoContabilista({ ...base, trabalhadores: true });
    expect(sem.nivel).toBe("autonomo");
    expect(com.nivel).toBe("muito_recomendado");
    // Acrescenta o motivo do processamento salarial e sobe os honorários.
    expect(com.motivos.some((m) => /trabalhadores/i.test(m))).toBe(true);
    expect(com.avencaMin).toBeGreaterThan(sem.avencaMin);
    expect(com.pontual).toBe(false);
  });

  it("sociedade é sempre obrigatório (mesmo sem trabalhadores)", () => {
    const d = diagnosticoContabilista({
      formaJuridica: "sociedade",
      faturacaoAnual: 30000,
      despesasAnuais: 0,
      clientes: "nacional",
      trabalhadores: false,
    });
    expect(d.nivel).toBe("obrigatorio");
  });

  it("acima do limite do regime simplificado → obrigatório", () => {
    const d = diagnosticoContabilista({
      formaJuridica: "independente",
      faturacaoAnual: LIMITE_CONTAB_ORGANIZADA + 1,
      despesasAnuais: 0,
      clientes: "nacional",
      trabalhadores: false,
    });
    expect(d.nivel).toBe("obrigatorio");
  });
});
