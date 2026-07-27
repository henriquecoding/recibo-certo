import { describe, it, expect } from "vitest";
import { situacaoIVA, IVA_LIMIAR_MENSAL } from "@/lib/fiscal-iva";
import { IVA_ISENCAO_LIMITE, IVA_ISENCAO_EXCESSO, IVA_TAXAS } from "@/lib/fiscal-data";

// ═══════════════════════════════════════════════════════════════════════
//  Cada teste aqui fixa uma regra que foi lida no articulado, não inferida.
//  A referência está no nome do teste para que, quando a lei mudar, se saiba
//  exatamente o que ir reler.
// ═══════════════════════════════════════════════════════════════════════

const LIMIAR = IVA_ISENCAO_LIMITE.value; // 15 000 €
const IMEDIATO = IVA_ISENCAO_EXCESSO.value; // 18 750 €

const ti = (faturacaoAnual: number, extra = {}) =>
  situacaoIVA({
    faturacaoAnual,
    regiao: "continente",
    regimeEscolhido: "isento",
    categoria: "art151",
    entidade: "ti",
    ...extra,
  });

describe("situação de IVA — trabalhador independente", () => {
  it("abaixo do limiar está isento pelo Art. 53.º n.º 1", () => {
    const s = ti(12_000);
    expect(s.zona).toBe("isento_limiar");
    expect(s.taxaEfetiva).toBe(0);
    expect(s.regimeParaFiz).toBe("EXEMPT_ART_53");
    expect(s.baseLegal.join(" ")).toContain("Art. 53.º, n.º 1");
  });

  it("entre o limiar e +25% perde a isenção só em janeiro (Art. 58.º n.º 2 a)", () => {
    const s = ti(LIMIAR + 1);
    expect(s.zona).toBe("transicao");
    expect(s.quandoAcontece).toMatch(/1 de janeiro/i);
    expect(s.baseLegal.join(" ")).toContain("Art. 58.º, n.º 2, al. a)");
    // Continua isento até lá — é o ponto todo desta zona.
    expect(s.regimeParaFiz).toBe("EXEMPT_ART_53");
  });

  it("acima de +25% perde imediatamente (Art. 58.º n.º 2 b)", () => {
    const s = ti(IMEDIATO + 1);
    expect(s.zona).toBe("tributado");
    expect(s.quandoAcontece).toMatch(/já/i);
    expect(s.baseLegal.join(" ")).toContain("Art. 58.º, n.º 2, al. b)");
    expect(s.regimeParaFiz).toBe("NORMAL");
  });

  it("o limiar imediato é exatamente o limiar + 25%", () => {
    // A regra é "excedido em mais de 25%", não um número solto.
    expect(IMEDIATO).toBe(LIMIAR * 1.25);
    expect(ti(IMEDIATO).zona).toBe("transicao");
    expect(ti(IMEDIATO + 1).zona).toBe("tributado");
  });

  it("abaixo do limiar mas a cobrar IVA é opção, não obrigação", () => {
    const s = ti(10_000, { regimeEscolhido: "normal" });
    expect(s.zona).toBe("tributado_por_opcao");
    expect(s.taxaEfetiva).toBe(IVA_TAXAS.continente.value.normal);
    expect(s.baseLegal.join(" ")).toContain("Art. 55.º");
  });

  it("o primeiro ano usa a ESTIMATIVA anual, não um limiar proporcional", () => {
    // Art. 53.º n.º 5 na redação do DL 35/2025. A redação antiga proporcionava
    // o limiar aos meses de atividade; esta não. Quem abrir em outubro e
    // estimar 12 000 € para o ano continua isento.
    const s = ti(12_000, { primeiroAno: true });
    expect(s.zona).toBe("isento_limiar");
    expect(s.limiar).toBe(LIMIAR); // não foi reduzido
    expect(s.oQueAcontece).toMatch(/estimativa/i);
  });
});

describe("situação de IVA — casos que os simuladores não sabiam", () => {
  it("um ato isolado nunca é isento (Art. 53.º n.º 6 a)", () => {
    const s = situacaoIVA({
      faturacaoAnual: 500,
      regiao: "continente",
      regimeEscolhido: "isento",
      categoria: "art151",
      entidade: "ato_isolado",
    });
    expect(s.zona).toBe("ato_isolado");
    expect(s.taxaEfetiva).toBeGreaterThan(0);
    expect(s.baseLegal.join(" ")).toContain("Art. 53.º, n.º 6, al. a)");
  });

  it("a isenção do Art. 9.º não depende de limiar nenhum", () => {
    const s = ti(100_000, { isentoPorNatureza: true });
    expect(s.zona).toBe("isento_natureza");
    expect(s.taxaEfetiva).toBe(0);
    expect(s.regimeParaFiz).toBe("EXEMPT_ART_9");
    expect(s.baseLegal.join(" ")).toContain("Art. 9.º");
  });

  it("a sociedade tem periodicidade segundo o Art. 41.º", () => {
    const soc = (v: number) =>
      situacaoIVA({ faturacaoAnual: v, regiao: "continente", regimeEscolhido: "normal", entidade: "sociedade" });
    expect(soc(IVA_LIMIAR_MENSAL - 1).periodicidade).toBe("trimestral");
    expect(soc(IVA_LIMIAR_MENSAL).periodicidade).toBe("mensal");
    expect(soc(1_000_000).baseLegal.join(" ")).toContain("Art. 41.º");
  });
});

describe("situação de IVA — região e coerência", () => {
  it("a taxa segue a região, não um valor fixo", () => {
    for (const regiao of ["continente", "madeira", "acores"] as const) {
      const s = situacaoIVA({
        faturacaoAnual: 30_000,
        regiao,
        regimeEscolhido: "normal",
        categoria: "art151",
      });
      expect(s.taxaEfetiva, regiao).toBe(IVA_TAXAS[regiao].value.normal);
      expect(s.opcoes.map((o) => o.taxa), regiao).toEqual([
        IVA_TAXAS[regiao].value.reduzida,
        IVA_TAXAS[regiao].value.intermedia,
        IVA_TAXAS[regiao].value.normal,
      ]);
    }
  });

  it("assinala quando a taxa escolhida não é a habitual da atividade", () => {
    // "art151" é normal por omissão; escolher reduzida tem de gerar nota.
    const s = ti(30_000, { regimeEscolhido: "reduzida" });
    expect(s.incoerencia).not.toBeNull();
    expect(s.incoerencia?.taxaHabitual).toBe("normal");
  });

  it("não assinala quando a taxa coincide com a habitual", () => {
    expect(ti(30_000, { regimeEscolhido: "normal" }).incoerencia).toBeNull();
  });

  it("toda a zona traz explicação em três tempos e base legal", () => {
    const casos = [
      ti(10_000),
      ti(LIMIAR + 1),
      ti(IMEDIATO + 1),
      ti(10_000, { regimeEscolhido: "normal" }),
      ti(1_000, { isentoPorNatureza: true }),
      situacaoIVA({ faturacaoAnual: 500, regiao: "continente", regimeEscolhido: "isento", entidade: "ato_isolado" }),
      situacaoIVA({ faturacaoAnual: 90_000, regiao: "continente", regimeEscolhido: "normal", entidade: "sociedade" }),
    ];
    for (const s of casos) {
      expect(s.titulo.length, s.zona).toBeGreaterThan(10);
      expect(s.oQueAcontece.length, s.zona).toBeGreaterThan(30);
      expect(s.quandoAcontece.length, s.zona).toBeGreaterThan(10);
      expect(s.oQueTensDeFazer.length, s.zona).toBeGreaterThan(30);
      expect(s.baseLegal.length, s.zona).toBeGreaterThan(0);
      for (const b of s.baseLegal) expect(b, s.zona).toMatch(/Art\. \d/);
    }
  });
});
