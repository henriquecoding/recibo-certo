import { describe, it, expect } from "vitest";
import { projetarDataLimite } from "@/components/dashboard/IvaProgresso";
import { prazoDeclaracaoSS, proximoPagamentoSS, calcularSS } from "@/components/dashboard/GuardiaoSS";
import {
  IVA_ISENCAO_LIMITE,
  SS_TAXA,
  SS_COEFICIENTE,
  DISPENSA_RETENCAO_LIMITE,
  IVA_ESPERADO_POR_CATEGORIA,
} from "@/lib/fiscal-data";
import {
  calcularAbatimentoMinimoExistencia,
  calcularTributacaoAutonoma,
  simularDeclaracaoIRS,
  simularIRSAnual,
} from "@/lib/fiscal";
import { ADICIONAL_SOLIDARIEDADE, IFICI_TAXA, TA_ELETRICA_LIMITE_CUSTO, TA_VIATURAS_ELETRICA_ACIMA_LIMITE } from "@/lib/fiscal-data";

const IFICI_TAXA_ESPERADA = IFICI_TAXA.value;

const LIMITE_IVA = IVA_ISENCAO_LIMITE.value; // € 15 000

// ── Mínimo de existência exato (Art. 70.º CIRS) — P0-01 ────────────────────
describe("mínimo de existência — fórmula por troços do artigo 70.º", () => {
  const baseFacts = {
    eligibleIncome: true,
    dependentTaxpayer: false,
    specificDeductions: 3_500,
    householdNonEnglobedIncome: 0,
    householdTaxpayers: 1,
  } as const;

  it("calcula o patamar L de 2026 a partir do primeiro escalão e do divisor 3,60", () => {
    const result = calcularAbatimentoMinimoExistencia({
      ...baseFacts,
      grossIncome: 14_000,
      householdGrossIncome: 14_000,
    });
    // 12 880 − 250/(12,5%×3,60) + 8 342/3,60
    expect(result.thresholdL).toBeCloseTo(14_641.666_666, 5);
  });

  it("aplica o troço intermédio com coeficiente 2,60", () => {
    const result = calcularAbatimentoMinimoExistencia({
      ...baseFacts,
      grossIncome: 14_000,
      householdGrossIncome: 14_000,
    });
    // 12 880 − 2,60×(14 000−12 880) − (3 500 + 250/12,5%)
    expect(result.status).toBe("applied");
    expect(result.abatement).toBeCloseTo(4_468, 6);
  });

  it("aplica o troço superior com coeficiente 1,35", () => {
    const result = calcularAbatimentoMinimoExistencia({
      ...baseFacts,
      specificDeductions: 3_750,
      grossIncome: 15_000,
      householdGrossIncome: 15_000,
    });
    expect(result.status).toBe("applied");
    expect(result.abatement).toBeCloseTo(2_065.916_666, 5);
  });

  it("aplica a exclusão do n.º 4 quando o rendimento agregado excede 2,2×14×IAS", () => {
    const result = calcularAbatimentoMinimoExistencia({
      ...baseFacts,
      grossIncome: 17_000,
      householdGrossIncome: 17_000,
    });
    expect(result.status).toBe("excluded");
    expect(result.abatement).toBe(0);
  });

  it("integra o abatimento antes dos escalões, sem o antigo clamp pós-imposto", () => {
    const result = simularIRSAnual({ brutoAnual: 14_000, tipo: "art151" });
    expect(result.rendimentoColetavelAntesMinimo).toBeCloseTo(10_500, 2);
    expect(result.abatimentoMinimoExistencia).toBeCloseTo(4_468, 2);
    expect(result.rendimentoColetavel).toBeCloseTo(6_032, 2);
    expect(result.minimoExistenciaDecision.status).toBe("applied");
  });

  it("não inventa factos quando há rendimento agregado sem decomposição", () => {
    const result = simularIRSAnual({
      brutoAnual: 14_000,
      tipo: "art151",
      outrosRendimentos: 1_000,
    });
    expect(result.minimoExistenciaDecision.status).toBe("needs_input");
    expect(result.abatimentoMinimoExistencia).toBe(0);
  });

  it("não aplica a atividades fora do âmbito material do n.º 2", () => {
    const result = simularIRSAnual({ brutoAnual: 14_000, tipo: "vendas" });
    expect(result.minimoExistenciaDecision.status).toBe("not_applicable");
    expect(result.abatimentoMinimoExistencia).toBe(0);
  });
});

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
    // Restam 7500€ / 1250€ = 6 meses. Base fixa (junho) → projeta dezembro.
    const base = new Date(2026, 5, 1); // junho 2026, determinístico
    const data = projetarDataLimite(7_500, LIMITE_IVA, 5, base);
    expect(data).not.toBeNull();
    expect(data!.getMonth()).toBe(11); // dezembro
  });

  it("projeta 1 mês se faturou 14500€ em 10 meses", () => {
    // média 1450/mês; restam 500€ → < 1 mês → Math.ceil = 1
    const base = new Date(2026, 9, 1); // outubro 2026, determinístico
    const data = projetarDataLimite(14_500, LIMITE_IVA, 9, base);
    expect(data).not.toBeNull();
    expect(data!.getMonth()).toBe(10); // novembro (outubro + 1)
  });

  it("retorna null se a média mensal é zero (limite já atingido)", () => {
    expect(projetarDataLimite(15_000, LIMITE_IVA, 5)).toBeNull();
  });
});

// ── prazoDeclaracaoSS / proximoPagamentoSS ──────────────────────────────────
// Comparações por componentes locais (getFullYear/getMonth/getDate) — nunca
// via toISOString(), que desloca o dia consoante o fuso horário do runner.

const ymd = (d: Date) => [d.getFullYear(), d.getMonth(), d.getDate()] as const;

describe("prazoDeclaracaoSS (declaração trimestral — último dia do mês seguinte)", () => {
  it("1.º trimestre → 30 de abril do mesmo ano", () => {
    expect(ymd(prazoDeclaracaoSS(0, 2026))).toEqual([2026, 3, 30]);
  });

  it("2.º trimestre → 31 de julho do mesmo ano", () => {
    expect(ymd(prazoDeclaracaoSS(1, 2026))).toEqual([2026, 6, 31]);
  });

  it("3.º trimestre → 31 de outubro do mesmo ano", () => {
    expect(ymd(prazoDeclaracaoSS(2, 2026))).toEqual([2026, 9, 31]);
  });

  it("4.º trimestre → 31 de janeiro do ano seguinte", () => {
    expect(ymd(prazoDeclaracaoSS(3, 2026))).toEqual([2027, 0, 31]);
  });
});

describe("proximoPagamentoSS (pagamento mensal — dia 10 a 20 do mês seguinte)", () => {
  it("antes do dia 20 → dia 20 do próprio mês", () => {
    expect(ymd(proximoPagamentoSS(new Date(2026, 6, 15)))).toEqual([2026, 6, 20]);
  });

  it("depois do dia 20 → dia 20 do mês seguinte", () => {
    expect(ymd(proximoPagamentoSS(new Date(2026, 6, 25)))).toEqual([2026, 7, 20]);
  });

  it("dezembro depois do dia 20 → 20 de janeiro do ano seguinte", () => {
    expect(ymd(proximoPagamentoSS(new Date(2026, 11, 28)))).toEqual([2027, 0, 20]);
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

// ── IVA esperado por categoria — fonte única partilhada guiado + completo ────
describe("IVA_ESPERADO_POR_CATEGORIA (fonte única dos dois modos de simulação)", () => {
  const cat = IVA_ESPERADO_POR_CATEGORIA.value;

  it("cobre exatamente as 5 categorias dos simuladores de recibos verdes", () => {
    expect(Object.keys(cat).sort()).toEqual(
      ["art151", "hosped", "outras", "prop_int", "vendas"],
    );
  });

  it("serviços (art151 e outros serviços) têm IVA habitual normal — independente da retenção", () => {
    // Retenção difere (23% vs 11,5%), mas a taxa de IVA habitual é a mesma (normal).
    expect(cat.art151.esperado).toBe("normal");
    expect(cat.outras.esperado).toBe("normal");
  });

  it("alojamento/restauração (hosped) tem IVA intermédio — Verba 3.1 Lista II CIVA", () => {
    expect(cat.hosped.esperado).toBe("intermedia");
  });

  it("vendas de bens têm IVA habitual normal", () => {
    expect(cat.vendas.esperado).toBe("normal");
  });

  it("direitos de autor levam a nota de dupla situação (obra própria isenta vs royalties)", () => {
    expect(cat.prop_int.esperado).toBe("normal");
    expect(cat.prop_int.notaIVA).toContain("Art. 9.º, n.º 16 CIVA");
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

// ── Adicional de solidariedade (Art. 68.º-A CIRS) — P0-02 da auditoria 2026 ──
describe("simularIRSAnual — adicional de solidariedade (Art. 68.º-A)", () => {
  it("não se aplica abaixo de 80 000 € de coletável", () => {
    // 60 000 € × coef. 0,75 (art151) = 45 000 € de coletável, bem abaixo de 80 000 €.
    const r = simularIRSAnual({ brutoAnual: 60_000, tipo: "art151" });
    expect(r.adicionalSolidariedade).toBe(0);
  });

  it("aplica 2,5% só na parte entre 80 000 € e 250 000 €", () => {
    // Usa contabilidade organizada para controlar o coletável exatamente.
    const r = simularIRSAnual({
      brutoAnual: 100_000,
      tipo: "art151",
      regimeContabilidade: "organizada",
      despesasJustificadas: 0,
    });
    expect(r.rendimentoColetavel).toBeCloseTo(100_000, 2);
    // (100 000 − 80 000) × 2,5% = 500 €
    expect(r.adicionalSolidariedade).toBeCloseTo(500, 2);
  });

  it("aplica 5% na parte acima de 250 000 €, e 2,5% nos 170 000 € intermédios", () => {
    const r = simularIRSAnual({
      brutoAnual: 300_000,
      tipo: "art151",
      regimeContabilidade: "organizada",
      despesasJustificadas: 0,
    });
    // (250 000 − 80 000) × 2,5% + (300 000 − 250 000) × 5% = 4 250 + 2 500 = 6 750 €
    expect(r.adicionalSolidariedade).toBeCloseTo(6_750, 2);
  });

  it("em tributação conjunta, aplica-se por titular (metade do coletável)", () => {
    // 160 000 € coletável conjunto ÷ 2 titulares = 80 000 € cada → ainda no limiar, sem adicional.
    const semAdicional = simularIRSAnual({
      brutoAnual: 160_000,
      tipo: "art151",
      regimeContabilidade: "organizada",
      despesasJustificadas: 0,
      conjunta: true,
    });
    expect(semAdicional.adicionalSolidariedade).toBeCloseTo(0, 2);

    // 200 000 € coletável conjunto ÷ 2 = 100 000 € cada → (100 000-80 000)×2,5%×2 titulares = 1 000 €
    const comAdicional = simularIRSAnual({
      brutoAnual: 200_000,
      tipo: "art151",
      regimeContabilidade: "organizada",
      despesasJustificadas: 0,
      conjunta: true,
    });
    expect(comAdicional.adicionalSolidariedade).toBeCloseTo(1_000, 2);
  });

  it("não se aplica sob regime de taxa fixa (IFICI)", () => {
    const r = simularIRSAnual({
      brutoAnual: 300_000,
      tipo: "art151",
      regimeContabilidade: "organizada",
      despesasJustificadas: 0,
      ifici: true,
    });
    expect(r.adicionalSolidariedade).toBe(0);
  });

  it("os limiares/taxas vêm de fiscal-data.ts (nada hardcoded no motor)", () => {
    expect(ADICIONAL_SOLIDARIEDADE.limiar1.value).toBe(80_000);
    expect(ADICIONAL_SOLIDARIEDADE.limiar2.value).toBe(250_000);
    expect(ADICIONAL_SOLIDARIEDADE.taxa1.value).toBeCloseTo(0.025, 3);
    expect(ADICIONAL_SOLIDARIEDADE.taxa2.value).toBeCloseTo(0.05, 3);
  });
});

// ── IFICI: âmbito do rendimento elegível — P0-03 da auditoria 2026 ──────────
describe("simularIRSAnual — IFICI aplica-se só ao rendimento elegível (Art. 58.º-A EBF)", () => {
  const baseIFICI = {
    brutoAnual: 50_000,
    tipo: "art151" as const,
    regimeContabilidade: "organizada" as const,
    despesasJustificadas: 0,
    ifici: true,
  };

  it("outrosRendimentos NÃO entra na taxa fixa de 20% — segue os escalões gerais, empilhado por cima do elegível", () => {
    const comOutros = simularIRSAnual({ ...baseIFICI, outrosRendimentos: 20_000 });
    const semOutros = simularIRSAnual(baseIFICI);
    // A diferença de coleta pelos 20 000 € de outrosRendimentos reflete os
    // escalões progressivos, empilhados por cima dos 50 000 € elegíveis — bem
    // acima da taxa fixa de 20% (marginal no topo dos escalões 2026).
    const coletaDosOutros = comOutros.coletaBruta - semOutros.coletaBruta;
    expect(coletaDosOutros).toBeGreaterThan(20_000 * IFICI_TAXA_ESPERADA);
  });

  it("o rendimento elegível (atividade) continua à taxa fixa de 20% com IFICI", () => {
    const r = simularIRSAnual(baseIFICI);
    // Contabilidade organizada, sem despesas: coletável elegível = 50 000 €.
    // Coleta = 50 000 × 20% = 10 000 € (sem outrosRendimentos, sem adicional — abaixo de 80 000 €).
    expect(r.rendimentoColetavel).toBeCloseTo(50_000, 2);
    expect(r.coletaBruta).toBeCloseTo(50_000 * IFICI_TAXA_ESPERADA, 2);
  });
});

// ── TA de viaturas elétricas acima do limite — P0-06 da auditoria 2026 ──────
describe("calcularTributacaoAutonoma — elétrica acima do limite de custo (Art. 88.º, n.º 20 CIRC)", () => {
  it("isenta (0%) uma elétrica com custo de aquisição igual ao limite", () => {
    const r = calcularTributacaoAutonoma({
      viaturas: [{ tipo: "eletrica", custoAquisicao: TA_ELETRICA_LIMITE_CUSTO.value, encargosAnuais: 10_000 }],
    });
    expect(r.taViaturas).toBe(0);
  });

  it("já NÃO isenta (10%) uma elétrica com custo de aquisição acima do limite", () => {
    const r = calcularTributacaoAutonoma({
      viaturas: [
        { tipo: "eletrica", custoAquisicao: TA_ELETRICA_LIMITE_CUSTO.value + 1, encargosAnuais: 10_000 },
      ],
    });
    expect(r.taViaturas).toBeCloseTo(10_000 * TA_VIATURAS_ELETRICA_ACIMA_LIMITE.value, 2);
  });
});
