import { describe, it, expect } from "vitest";
import {
  retencaoIRSDependente,
  calcularVencimento,
  calcularVencimentoAnual,
  calcularReciboMensal,
  compararCategorias,
  isencaoJovemRemuneracao,
  IRS_JOVEM_TETO_MENSAL,
} from "@/lib/fiscal-dependente";
import { SS_DEPENDENTE } from "@/lib/fiscal-data";

// ── retencaoIRSDependente ─────────────────────────────────────────────────────

describe("retencaoIRSDependente", () => {
  it("isenta remunerações até ao limiar (920€)", () => {
    expect(retencaoIRSDependente(920)).toBe(0);
    expect(retencaoIRSDependente(500)).toBe(0);
  });

  it("aplica a fórmula taxa marginal − parcela a abater", () => {
    // 1500€ cai no escalão até 1819 (taxa 0,241, parcela 193,33).
    expect(retencaoIRSDependente(1500, 0)).toBeCloseTo(1500 * 0.241 - 193.33, 2);
  });

  it("desconta a parcela por dependente e nunca devolve negativo", () => {
    const sem = retencaoIRSDependente(1500, 0);
    const com = retencaoIRSDependente(1500, 2);
    expect(com).toBeLessThan(sem);
    expect(retencaoIRSDependente(950, 4)).toBeGreaterThanOrEqual(0);
  });
});

// ── calcularVencimento (mensal) ───────────────────────────────────────────────

describe("calcularVencimento", () => {
  it("desconta SS (11%) e IRS ao bruto e soma o subsídio de refeição", () => {
    const r = calcularVencimento({ salarioBruto: 1500, subsidioRefeicaoDia: 6, diasUteis: 22 });
    expect(r.ssTrabalhador).toBeCloseTo(1500 * SS_DEPENDENTE.trabalhador.value, 2);
    expect(r.liquido).toBeCloseTo(1500 - r.ssTrabalhador - r.irsRetido + r.subsidioRefeicaoTotal, 2);
  });

  it("separa a parte tributada do subsídio de refeição acima do limite", () => {
    const r = calcularVencimento({ salarioBruto: 1500, subsidioRefeicaoDia: 12, subsidioRefeicaoCartao: true, diasUteis: 20 });
    // limite cartão 10,46 → excesso (12 − 10,46) × 20 dias.
    expect(r.subsidioRefeicaoTributado).toBeCloseTo((12 - 10.46) * 20, 2);
  });
});

// ── calcularVencimentoAnual (14 meses) ────────────────────────────────────────

describe("calcularVencimentoAnual", () => {
  it("modela 14 meses de salário base", () => {
    const a = calcularVencimentoAnual({ salarioBruto: 1500 });
    expect(a.brutoAnual).toBeCloseTo(1500 * 14, 2);
    expect(a.subsidioFerias).toBe(1500);
    expect(a.subsidioNatal).toBe(1500);
  });

  it("tributa os subsídios autonomamente (mesma fórmula da remuneração mensal)", () => {
    const a = calcularVencimentoAnual({ salarioBruto: 1500, dependentes: 0 });
    const mensal = retencaoIRSDependente(1500, 0);
    expect(a.irsFerias).toBeCloseTo(mensal, 2);
    expect(a.irsNatal).toBeCloseTo(mensal, 2);
    expect(a.irsSalario).toBeCloseTo(mensal * 12, 2);
    expect(a.irsAnual).toBeCloseTo(mensal * 14, 2);
  });

  it("aplica SS aos 14 meses", () => {
    const a = calcularVencimentoAnual({ salarioBruto: 1500 });
    expect(a.ssAnual).toBeCloseTo(1500 * 14 * SS_DEPENDENTE.trabalhador.value, 2);
  });

  it("a média mensal (duodécimos) é maior que um mês sem subsídio", () => {
    const args = { salarioBruto: 1500, subsidioRefeicaoDia: 6, diasUteis: 22 };
    const mensal = calcularVencimento(args);
    const anual = calcularVencimentoAnual(args);
    expect(anual.liquidoMedioMes).toBeGreaterThan(mensal.liquido);
    expect(anual.liquidoMedioMes).toBeCloseTo(anual.liquidoAnual / 12, 2);
  });
});

// ── compararCategorias ────────────────────────────────────────────────────────

describe("compararCategorias", () => {
  it("devolve os três cenários com líquido positivo e abaixo do bruto", () => {
    const c = compararCategorias({ brutoAnual: 30000 });
    for (const v of [c.dependente.liquido, c.freelancer.liquido, c.empresa.liquido]) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(30000);
    }
  });

  it("o bruto da Categoria A iguala o rendimento anual indicado", () => {
    const c = compararCategorias({ brutoAnual: 28000 });
    expect(c.dependente.bruto).toBeCloseTo(28000, 0);
  });

  it("'melhor' aponta para o cenário de maior líquido", () => {
    const c = compararCategorias({ brutoAnual: 45000, despesas: 2000 });
    const liq = {
      dependente: c.dependente.liquido,
      freelancer: c.freelancer.liquido,
      empresa: c.empresa.liquido,
    };
    const maxChave = (Object.keys(liq) as (keyof typeof liq)[]).reduce((a, b) =>
      liq[b] > liq[a] ? b : a
    );
    expect(c.melhor).toBe(maxChave);
  });
});

// ── gerarCSVCenarios ──────────────────────────────────────────────────────────

import { gerarCSVCenarios } from "@/lib/store/vencimentos";

describe("gerarCSVCenarios", () => {
  const cenario = {
    id: "x", nome: "Teste", salarioBruto: 1500, dependentes: 0,
    subsidioRefeicaoDia: 0, subsidioRefeicaoCartao: true, diasUteis: 22,
    duodecimos: false, criadoEm: "2026-06-17T00:00:00.000Z",
  };

  it("inclui um cabeçalho com a coluna do líquido anual e uma linha por cenário", () => {
    const csv = gerarCSVCenarios([cenario]);
    const linhas = csv.split("\r\n");
    expect(linhas.some((l) => l.includes("Líquido anual (€)"))).toBe(true);
    expect(linhas.some((l) => l.startsWith("Teste;"))).toBe(true);
  });

  it("usa ; como separador e vírgula decimal (Excel pt-PT)", () => {
    const csv = gerarCSVCenarios([cenario]);
    const dados = csv.split("\r\n").find((l) => l.startsWith("Teste;"))!;
    expect(dados).toContain(";");
    expect(dados).toContain("1500,00");
  });
});

// ── mealheiroDependente ───────────────────────────────────────────────────────

import { mealheiroDependente } from "@/lib/fiscal-dependente";
import { DEDUCAO_ESPECIFICA_DEPENDENTE, IAS } from "@/lib/fiscal-data";

describe("mealheiroDependente", () => {
  it("dedução específica é 8,54 × IAS", () => {
    expect(DEDUCAO_ESPECIFICA_DEPENDENTE.value).toBeCloseTo(8.54 * IAS.value, 2);
  });

  it("rendimentos variáveis aumentam o IRS apurado e o acerto", () => {
    const sem = mealheiroDependente({ salarioBruto: 2000 });
    const com = mealheiroDependente({ salarioBruto: 2000, variavelAnual: 6000 });
    expect(com.irsApurado).toBeGreaterThan(sem.irsApurado);
    expect(com.acerto).toBeGreaterThan(sem.acerto);
  });

  it("a reserva mensal é o acerto / 12 quando há acerto a pagar", () => {
    const m = mealheiroDependente({ salarioBruto: 3000, variavelAnual: 10000 });
    if (m.acerto > 0) expect(m.reservaMensal).toBeCloseTo(m.acerto / 12, 1);
    else expect(m.reservaMensal).toBe(0);
  });

  it("coletável = bruto anual − dedução específica", () => {
    const m = mealheiroDependente({ salarioBruto: 1500 });
    expect(m.rendimentoColetavel).toBeCloseTo(Math.max(0, m.brutoAnual - m.deducaoEspecifica), 2);
  });
});

// ── IRS Jovem (Art. 12.º-B CIRS) na Categoria A ───────────────────────────────

describe("IRS Jovem — retenção mensal", () => {
  it("isencaoJovemRemuneracao: 1.º ano isenta 100% (até ao teto mensal)", () => {
    const j = isencaoJovemRemuneracao(1500, 1);
    expect(j.pct).toBe(1);
    expect(j.isentoEur).toBeCloseTo(1500, 2); // 1500 < teto mensal
    expect(j.tributavel).toBeCloseTo(0, 2);
  });

  it("isencaoJovemRemuneracao: limita a isenção ao teto mensal (55×IAS÷14)", () => {
    const alto = 6000;
    const j = isencaoJovemRemuneracao(alto, 1);
    expect(j.isentoEur).toBeCloseTo(IRS_JOVEM_TETO_MENSAL, 2);
    expect(j.excedeTeto).toBe(true);
    expect(j.tributavel).toBeCloseTo(alto - IRS_JOVEM_TETO_MENSAL, 2);
  });

  it("sem ano de benefício não há isenção", () => {
    expect(isencaoJovemRemuneracao(2000).pct).toBe(0);
    expect(isencaoJovemRemuneracao(2000, 0).isentoEur).toBe(0);
  });

  it("calcularVencimento: o IRS Jovem reduz a retenção e expõe a poupança", () => {
    const sem = calcularVencimento({ salarioBruto: 1500 });
    const com = calcularVencimento({ salarioBruto: 1500, irsJovemAno: 1 });
    expect(com.irsRetido).toBeLessThan(sem.irsRetido);
    expect(com.irsRetido).toBe(0); // 100% isento abaixo do teto
    expect(com.irsSemJovem).toBeCloseTo(sem.irsRetido, 2);
    expect(com.rendimentoIsentoJovem).toBeGreaterThan(0);
  });

  it("a SS (11%) não é afetada pelo IRS Jovem", () => {
    const com = calcularVencimento({ salarioBruto: 1500, irsJovemAno: 1 });
    expect(com.ssTrabalhador).toBeCloseTo(1500 * SS_DEPENDENTE.trabalhador.value, 2);
  });

  it("anos posteriores isentam menos (5.º ano = 50%)", () => {
    const ano1 = calcularVencimento({ salarioBruto: 2500, irsJovemAno: 1 });
    const ano5 = calcularVencimento({ salarioBruto: 2500, irsJovemAno: 5 });
    expect(ano5.irsRetido).toBeGreaterThan(ano1.irsRetido);
    expect(ano5.isencaoJovemPct).toBe(0.5);
  });

  it("calcularReciboMensal expõe a isenção e a retenção sem regime", () => {
    const det = calcularReciboMensal({ salarioBruto: 1800, irsJovemAno: 2, premio: 200, premioRegular: true });
    expect(det.isencaoJovemPct).toBe(0.75);
    expect(det.rendimentoIsentoJovem).toBeGreaterThan(0);
    expect(det.irsSemJovem).toBeGreaterThanOrEqual(det.irsTotal);
  });

  it("calcularVencimentoAnual reflete a isenção anual", () => {
    const a = calcularVencimentoAnual({ salarioBruto: 1500, irsJovemAno: 1 });
    expect(a.isencaoJovemPct).toBe(1);
    expect(a.rendimentoIsentoJovemAnual).toBeGreaterThan(0);
    expect(a.irsAnual).toBe(0);
  });
});

// ── auditarRecibo ─────────────────────────────────────────────────────────────

import { auditarRecibo } from "@/lib/fiscal-dependente";

describe("auditarRecibo", () => {
  it("aprova um recibo com SS e IRS corretos", () => {
    const esperadoIrs = retencaoIRSDependente(1500, 0);
    const r = auditarRecibo({ salarioBruto: 1500, dependentes: 0, ssDeclarado: 165, irsDeclarado: esperadoIrs });
    expect(r.ssOk).toBe(true);
    expect(r.irsOk).toBe(true);
    expect(r.tudoOk).toBe(true);
    expect(r.alertas).toHaveLength(0);
  });

  it("deteta Segurança Social mal descontada", () => {
    const r = auditarRecibo({ salarioBruto: 1500, dependentes: 0, ssDeclarado: 120, irsDeclarado: retencaoIRSDependente(1500, 0) });
    expect(r.ssOk).toBe(false);
    expect(r.tudoOk).toBe(false);
    expect(r.alertas.length).toBeGreaterThan(0);
  });

  it("deteta retenção de IRS divergente", () => {
    const r = auditarRecibo({ salarioBruto: 1500, dependentes: 0, ssDeclarado: 165, irsDeclarado: 50 });
    expect(r.irsOk).toBe(false);
    expect(r.tudoOk).toBe(false);
  });

  it("expõe base, custo da entidade, taxa efetiva e líquido esperado", () => {
    const r = auditarRecibo({ salarioBruto: 1500, dependentes: 0, ssDeclarado: 165, irsDeclarado: retencaoIRSDependente(1500, 0) });
    expect(r.baseIncidencia).toBeCloseTo(1500, 2);
    expect(r.custoEmpresa).toBeCloseTo(1500 * (1 + SS_DEPENDENTE.entidade.value), 2);
    expect(r.taxaEfetiva).toBeGreaterThan(0);
    expect(r.liquidoEsperado).toBeCloseTo(1500 - r.ssEsperado - r.irsEsperado, 2);
  });

  it("com IRS Jovem o IRS esperado desce e a isenção é reportada", () => {
    const r = auditarRecibo({ salarioBruto: 1500, dependentes: 0, irsJovemAno: 1, ssDeclarado: 165, irsDeclarado: 0 });
    expect(r.isencaoJovemPct).toBe(1);
    expect(r.irsEsperado).toBe(0);
    expect(r.irsOk).toBe(true);
    expect(r.rendimentoIsentoJovem).toBeGreaterThan(0);
  });

  it("usa a remuneração sujeita como base quando fornecida", () => {
    const r = auditarRecibo({ salarioBruto: 1200, remuneracaoSujeita: 1800, dependentes: 0, ssDeclarado: 198, irsDeclarado: retencaoIRSDependente(1800, 0) });
    expect(r.baseIncidencia).toBeCloseTo(1800, 2);
    expect(r.ssEsperado).toBeCloseTo(1800 * SS_DEPENDENTE.trabalhador.value, 2);
    expect(r.ssOk).toBe(true);
  });
});

// ── Tabelas de retenção por situação (Despacho 233-A/2026) ────────────────────

import { tabelaRetencaoDependente } from "@/lib/fiscal-data";

describe("tabelaRetencaoDependente", () => {
  it("não casado: 0 dep → Tabela I (21,43); com dep → Tabela II (34,29)", () => {
    expect(tabelaRetencaoDependente("naoCasado", 0, false).parcelaDependente).toBe(21.43);
    expect(tabelaRetencaoDependente("naoCasado", 2, false).parcelaDependente).toBe(34.29);
  });
  it("casado único titular → Tabela III (42,86)", () => {
    expect(tabelaRetencaoDependente("casadoUnico", 1, false).parcelaDependente).toBe(42.86);
  });
  it("deficiência sem dependentes → Tabela IV (sem parcela por dependente)", () => {
    expect(tabelaRetencaoDependente("naoCasado", 0, true).parcelaDependente).toBe(0);
  });
});

describe("retenção por situação familiar", () => {
  it("Tabela I: escalão 20 221 usa a parcela 823,40 (corrigido do oficial)", () => {
    expect(retencaoIRSDependente(10000, 0)).toBeCloseTo(10000 * 0.4495 - 823.40, 2);
  });
  it("casado único titular retém menos que não casado (mesmo salário)", () => {
    const naoCasado = calcularVencimento({ salarioBruto: 1500, estadoCivil: "naoCasado" });
    const casadoUnico = calcularVencimento({ salarioBruto: 1500, estadoCivil: "casadoUnico" });
    expect(casadoUnico.irsRetido).toBeLessThan(naoCasado.irsRetido);
  });
  it("titular com deficiência retém menos", () => {
    const sem = calcularVencimento({ salarioBruto: 1500, deficiencia: false });
    const com = calcularVencimento({ salarioBruto: 1500, deficiencia: true });
    expect(com.irsRetido).toBeLessThan(sem.irsRetido);
  });
  it("3+ dependentes aplicam a redução de 1 p.p. (n.º 5 al. h)", () => {
    const r2 = calcularVencimento({ salarioBruto: 2000, dependentes: 2, estadoCivil: "casadoDois" });
    const r3 = calcularVencimento({ salarioBruto: 2000, dependentes: 3, estadoCivil: "casadoDois" });
    // Diferença excede só a parcela por dependente (21,43) graças ao −1 p.p.
    expect(r2.irsRetido - r3.irsRetido).toBeGreaterThan(21.43);
  });
});
