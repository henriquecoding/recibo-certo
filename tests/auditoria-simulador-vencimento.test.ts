// ─────────────────────────────────────────────────────────────────────
//  Vetores oficiais e invariantes do simulador de recibos de vencimento
//  ---------------------------------------------------------------------
//  Cada bloco prende ao código um caso concreto da auditoria de 1 de agosto
//  de 2026. Os valores esperados vêm das fontes oficiais, não da versão
//  anterior do motor: se uma refatoração voltar a perder a incapacidade dos
//  dependentes, a retificação da Madeira ou o excesso de refeição no ano, é
//  aqui que falha.
//
//  Fontes:
//   · Despacho n.º 233-A/2026 (Continente) — n.ºs 3, 5, 6, 7 e 9;
//   · Declaração de Retificação n.º 10/2026 (Madeira);
//   · Despacho n.º 1179/2026 (Açores);
//   · Art. 99.º-C CIRS; Art. 262.º e 271.º do Código do Trabalho;
//   · Portaria n.º 51-B/2026 (subsídio de refeição);
//   · Tabela de ajudas de custo da DGAEP.
// ─────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  calcularReciboMensal,
  calcularVencimento,
  calcularVencimentoAnual,
  auditarRecibo,
} from "../src/lib/fiscal-dependente";
import {
  buildLegacyPayrollInput,
  calculateLegacyPayroll,
  includeMonthlyDuodecimos,
  validateContext,
  type PayrollRubricDraft,
  type PayrollSimulatorContext,
} from "../src/lib/payroll-simulator-legacy-adapter";
import {
  AJUDAS_CUSTO,
  RETENCAO_CONJUGE_DEFICIENTE,
  RETENCAO_DEP_DEFICIENTE,
  RETENCAO_DEP_MADEIRA,
  parcelaIncapacidadeFamiliar,
} from "../src/lib/fiscal-data";

const cent = (value: number) => Math.round(value * 100) / 100;

const context: PayrollSimulatorContext = {
  baseSalary: 2_000,
  weeklyHours: 40,
  dependants: 0,
  maritalStatus: "naoCasado",
  disability: false,
  region: "continente",
  meal: { enabled: false, days: 0, dailyAmount: 0, card: false },
};

const rubric = (partial: Partial<PayrollRubricDraft> & Pick<PayrollRubricDraft, "id" | "type">): PayrollRubricDraft => ({
  amount: 0,
  hours: 0,
  days: 0,
  dailyAmount: 0,
  regularity: "unknown",
  ...partial,
});

// ── P0 · Incapacidade de dependentes e do cônjuge ────────────────────────────

describe("incapacidade no agregado (Despacho 233-A/2026, n.ºs 5 a 7)", () => {
  it("o cenário da auditoria com um dependente com incapacidade", () => {
    // 1 500 € · não casado · 2 dependentes · 1 com incapacidade ≥ 60% ·
    // refeição em cartão 6,15 € × 22 dias (dentro do limite, logo isenta).
    const base = {
      salarioBruto: 1_500,
      dependentes: 2,
      estadoCivil: "naoCasado" as const,
      subsidioRefeicaoDia: 6.15,
      subsidioRefeicaoCartao: true,
      diasUteis: 22,
    };
    const sem = calcularVencimento(base);
    expect(sem.irsRetido).toBe(99.59);
    expect(sem.ssTrabalhador).toBe(165);
    expect(sem.liquido).toBe(1_370.71);

    const com = calcularVencimento({ ...base, dependentesDeficientes: 1 });
    expect(com.irsRetido).toBe(14.77);
    expect(com.liquido).toBe(1_455.53);
    // A Segurança Social não depende da situação familiar.
    expect(com.ssTrabalhador).toBe(sem.ssTrabalhador);
    expect(cent(sem.irsRetido - com.irsRetido)).toBe(RETENCAO_DEP_DEFICIENTE.value.naoCasadoOuUnico);
  });

  it("casado dois titulares: 3 000 €, dois dependentes, um com incapacidade", () => {
    const r = calcularVencimento({
      salarioBruto: 3_000,
      dependentes: 2,
      dependentesDeficientes: 1,
      estadoCivil: "casadoDois",
      subsidioRefeicaoDia: 0,
      diasUteis: 0,
    });
    expect(r.irsRetido).toBe(577.87);
  });

  it("casado único titular: cônjuge com incapacidade abate 135,71 €", () => {
    const base = {
      salarioBruto: 2_500,
      dependentes: 0,
      estadoCivil: "casadoUnico" as const,
      subsidioRefeicaoDia: 0,
      diasUteis: 0,
    };
    expect(calcularVencimento(base).irsRetido).toBe(279.78);
    expect(calcularVencimento({ ...base, conjugeDeficiente: true }).irsRetido).toBe(144.07);
    expect(RETENCAO_CONJUGE_DEFICIENTE.value).toBe(135.71);
  });

  it("a parcela do cônjuge é exclusiva de «casado, único titular»", () => {
    // N.º 5, al. b) só prevê esta situação familiar. Aplicá-la a outras seria
    // inventar uma dedução que a tabela dessa pessoa não contempla.
    for (const estadoCivil of ["naoCasado", "casadoDois"] as const) {
      expect(parcelaIncapacidadeFamiliar(estadoCivil, { conjugeDeficiente: true })).toBe(0);
      expect(
        calcularVencimento({ salarioBruto: 2_500, estadoCivil, conjugeDeficiente: true, subsidioRefeicaoDia: 0, diasUteis: 0 }).irsRetido,
      ).toBe(
        calcularVencimento({ salarioBruto: 2_500, estadoCivil, subsidioRefeicaoDia: 0, diasUteis: 0 }).irsRetido,
      );
    }
  });

  it("o fator do n.º 6 multiplica a parcela até ao máximo da situação familiar", () => {
    const semFator = calcularVencimento({ salarioBruto: 3_000, dependentes: 1, dependentesDeficientes: 1, subsidioRefeicaoDia: 0, diasUteis: 0 });
    const comFator3 = calcularVencimento({ salarioBruto: 3_000, dependentes: 1, dependentesDeficientes: 1, fatorDependenteDeficiente: 3, subsidioRefeicaoDia: 0, diasUteis: 0 });
    expect(cent(semFator.irsRetido - comFator3.irsRetido)).toBe(cent(2 * RETENCAO_DEP_DEFICIENTE.value.naoCasadoOuUnico));

    // Acima do máximo legal (3× para não casado), o fator é limitado — não
    // aplicado como o utilizador pediu.
    const excessivo = calcularVencimento({ salarioBruto: 3_000, dependentes: 1, dependentesDeficientes: 1, fatorDependenteDeficiente: 6, subsidioRefeicaoDia: 0, diasUteis: 0 });
    expect(excessivo.irsRetido).toBe(comFator3.irsRetido);

    // Casado dois titulares chega a 6×, sobre uma parcela de metade.
    const seisVezes = calcularVencimento({ salarioBruto: 3_000, dependentes: 1, dependentesDeficientes: 1, estadoCivil: "casadoDois", fatorDependenteDeficiente: 6, subsidioRefeicaoDia: 0, diasUteis: 0 });
    const umaVez = calcularVencimento({ salarioBruto: 3_000, dependentes: 1, dependentesDeficientes: 1, estadoCivil: "casadoDois", subsidioRefeicaoDia: 0, diasUteis: 0 });
    expect(cent(umaVez.irsRetido - seisVezes.irsRetido)).toBe(cent(5 * RETENCAO_DEP_DEFICIENTE.value.casadoDois));
  });

  it("nunca conta mais dependentes com incapacidade do que dependentes", () => {
    const r = calcularVencimento({ salarioBruto: 3_000, dependentes: 1, dependentesDeficientes: 4, subsidioRefeicaoDia: 0, diasUteis: 0 });
    const limitado = calcularVencimento({ salarioBruto: 3_000, dependentes: 1, dependentesDeficientes: 1, subsidioRefeicaoDia: 0, diasUteis: 0 });
    expect(r.irsRetido).toBe(limitado.irsRetido);
  });

  it("a incapacidade chega aos subsídios, ao suplementar, ao ano e à auditoria", () => {
    const comum = { salarioBruto: 2_000, dependentes: 2, dependentesDeficientes: 2, estadoCivil: "naoCasado" as const };

    const mes = calcularReciboMensal({ ...comum, subsidioFerias: 2_000, horasSuplementares: [10, 0, 0, 0, 0, 0] });
    const mesSem = calcularReciboMensal({ ...comum, dependentesDeficientes: 0, subsidioFerias: 2_000, horasSuplementares: [10, 0, 0, 0, 0, 0] });
    expect(mes.irsBaseMensal).toBeLessThan(mesSem.irsBaseMensal);
    expect(mes.irsFerias).toBeLessThan(mesSem.irsFerias);
    expect(mes.suplementarIRS).toBeLessThan(mesSem.suplementarIRS);

    const ano = calcularVencimentoAnual({ ...comum, subsidioRefeicaoDia: 0, diasUteis: 0 });
    const anoSem = calcularVencimentoAnual({ ...comum, dependentesDeficientes: 0, subsidioRefeicaoDia: 0, diasUteis: 0 });
    expect(ano.irsAnual).toBeLessThan(anoSem.irsAnual);

    const auditoria = auditarRecibo({ ...comum, irsDeclarado: 0, ssDeclarado: 0, remuneracaoSujeita: 2_000 });
    const auditoriaSem = auditarRecibo({ ...comum, dependentesDeficientes: 0, irsDeclarado: 0, ssDeclarado: 0, remuneracaoSujeita: 2_000 });
    expect(auditoria.irsEsperado).toBeLessThan(auditoriaSem.irsEsperado);
  });

  it("o adaptador transporta a incapacidade do contexto para o motor", () => {
    const entrada = buildLegacyPayrollInput(
      { ...context, dependants: 2, dependantsWithDisability: 1, disabilityFactor: 2, maritalStatus: "casadoUnico", spouseDisability: true },
      [],
    );
    expect(entrada).toMatchObject({ dependentes: 2, dependentesDeficientes: 1, fatorDependenteDeficiente: 2, conjugeDeficiente: true });
  });
});

// ── P0 · Número real de dependentes ──────────────────────────────────────────

describe("número de dependentes", () => {
  it("cinco dependentes não são tratados como quatro", () => {
    const quatro = calcularVencimento({ salarioBruto: 3_000, dependentes: 4, subsidioRefeicaoDia: 0, diasUteis: 0 });
    const cinco = calcularVencimento({ salarioBruto: 3_000, dependentes: 5, subsidioRefeicaoDia: 0, diasUteis: 0 });
    expect(quatro.irsRetido).toBe(495.98);
    expect(cinco.irsRetido).toBe(461.69);
    expect(cent(quatro.irsRetido - cinco.irsRetido)).toBe(34.29);
  });
});

// ── P0 · Madeira retificada ──────────────────────────────────────────────────

describe("Madeira — Declaração de Retificação n.º 10/2026", () => {
  it("aplica a tabela republicada, não a versão inicial do Despacho 19/2026", () => {
    expect(calcularVencimento({ salarioBruto: 7_000, dependentes: 0, regiao: "madeira", subsidioRefeicaoDia: 0, diasUteis: 0 }).irsRetido).toBe(1_529.45);
  });

  it("os escalões retificados da Tabela I estão transcritos", () => {
    const esperado = [
      { ate: 3_614, taxa: 0.2727, parcelaAbater: 398.26 },
      { ate: 6_585, taxa: 0.2778, parcelaAbater: 416.7 },
      { ate: 6_954, taxa: 0.2802, parcelaAbater: 432.51 },
      { ate: 21_411, taxa: 0.2924, parcelaAbater: 517.35 },
      { ate: Infinity, taxa: 0.3278, parcelaAbater: 1_275.3 },
    ];
    for (const linha of esperado) {
      expect(RETENCAO_DEP_MADEIRA.value.i.escaloes).toContainEqual(linha);
      // A Tabela II partilha os escalões da I; só muda a parcela por dependente.
      expect(RETENCAO_DEP_MADEIRA.value.ii.escaloes).toContainEqual(linha);
    }
  });
});

// ── P1 · Refeição no ano ─────────────────────────────────────────────────────

describe("visão anual", () => {
  it("tributa o excesso de refeição, como os meses", () => {
    const anual = calcularVencimentoAnual({
      salarioBruto: 1_500,
      dependentes: 0,
      subsidioRefeicaoDia: 11,
      subsidioRefeicaoCartao: false,
      diasUteis: 22,
      mesesSubsidioRefeicao: 11,
    });
    const comRefeicao = calcularReciboMensal({ salarioBruto: 1_500, subsidioRefeicaoDia: 11, diasSubsidio: 22 });
    const semRefeicao = calcularReciboMensal({ salarioBruto: 1_500, subsidioRefeicaoDia: 0, diasSubsidio: 0 });
    const subsidio = calcularReciboMensal({ salarioBruto: 0, subsidioFerias: 1_500, subsidioRefeicaoDia: 0, diasSubsidio: 0 });
    const somaDosMeses = cent(comRefeicao.liquido * 11 + semRefeicao.liquido + subsidio.liquido * 2);

    // Doze arredondamentos ao cêntimo podem divergir uns cêntimos do apuramento
    // anual; o que não pode existir é a diferença de 411,95 € que a auditoria
    // encontrou por tratar todo o subsídio como isento.
    expect(Math.abs(anual.liquidoAnual - somaDosMeses)).toBeLessThanOrEqual(0.1);
    expect(anual.subsidioRefeicaoTributadoAnual).toBe(cent(comRefeicao.subsidioRefeicaoTributado * 11));
    expect(anual.baseSSAnual).toBe(cent(1_500 * 14 + anual.subsidioRefeicaoTributadoAnual));
  });

  it("um subsídio dentro do limite não altera bases nem retenção", () => {
    const isento = calcularVencimentoAnual({ salarioBruto: 1_500, subsidioRefeicaoDia: 6.15, subsidioRefeicaoCartao: false, diasUteis: 22, mesesSubsidioRefeicao: 11 });
    expect(isento.subsidioRefeicaoTributadoAnual).toBe(0);
    expect(isento.baseSSAnual).toBe(cent(1_500 * 14));
  });
});

// ── P1 · Ajudas de custo ─────────────────────────────────────────────────────

describe("ajudas de custo", () => {
  it("usa os limites em vigor da tabela da DGAEP", () => {
    expect(AJUDAS_CUSTO.nacionalDia.value).toBe(65.89);
    expect(AJUDAS_CUSTO.estrangeiroDia.value).toBe(148.91);
    expect(AJUDAS_CUSTO.nacionalDiaDirecao.value).toBe(72.65);
    expect(AJUDAS_CUSTO.estrangeiroDiaDirecao.value).toBe(167.07);
  });

  it("cinco dias a 148,91 € no estrangeiro ficam integralmente isentos", () => {
    const r = calcularReciboMensal({ salarioBruto: 2_000, ajudas: [{ dias: 5, valorDia: 148.91, estrangeiro: true }] });
    expect(r.ajudasTributadas).toBe(0);
    expect(r.baseSS).toBe(2_000);
  });

  it("cada deslocação tem o seu limite — sem média entre linhas", () => {
    // 100 €/dia e 30 €/dia num só dia cada. Pela média (65 €/dia) nada seria
    // tributado; individualmente, 100 − 65,89 = 34,11 € excedem o limite.
    const r = calcularReciboMensal({
      salarioBruto: 1_000,
      ajudas: [{ dias: 1, valorDia: 100 }, { dias: 1, valorDia: 30 }],
    });
    expect(r.ajudasTotal).toBe(130);
    expect(r.ajudasTributadas).toBe(cent(100 - AJUDAS_CUSTO.nacionalDia.value));
    expect(cent(r.ajudasDetalhe.reduce((total, linha) => total + linha.total, 0))).toBe(r.ajudasTotal);
    expect(cent(r.ajudasDetalhe.reduce((total, linha) => total + linha.tributado, 0))).toBe(r.ajudasTributadas);
  });

  it("o escalão de direção usa o limite equiparado a membro do Governo", () => {
    const trabalhador = calcularReciboMensal({ salarioBruto: 2_000, ajudas: [{ dias: 1, valorDia: 70 }] });
    const direcao = calcularReciboMensal({ salarioBruto: 2_000, ajudas: [{ dias: 1, valorDia: 70, escalao: "direcao" }] });
    expect(trabalhador.ajudasTributadas).toBe(cent(70 - AJUDAS_CUSTO.nacionalDia.value));
    expect(direcao.ajudasTributadas).toBe(0);
  });
});

// ── P1 · Diuturnidades na retribuição horária ────────────────────────────────

describe("retribuição horária (CT art. 262.º e 271.º)", () => {
  it("as diuturnidades valorizam a hora extra", () => {
    const rubrics = [
      rubric({ id: "diut", type: "seniority", amount: 200 }),
      rubric({ id: "extra", type: "overtime_workday_first", hours: 10 }),
    ];
    const comDiuturnidades = calculateLegacyPayroll(context, rubrics);
    const sem = calculateLegacyPayroll(context, [rubric({ id: "extra", type: "overtime_workday_first", hours: 10 })]);

    expect(sem.result.retribuicaoHoraria).toBe(11.54);
    expect(comDiuturnidades.result.retribuicaoHoraria).toBe(12.69);
    expect(sem.result.suplementarTotal).toBe(144.25);
    expect(comDiuturnidades.result.suplementarTotal).toBe(158.63);
  });

  it("as diuturnidades não são somadas duas vezes ao bruto", () => {
    const r = calculateLegacyPayroll(context, [rubric({ id: "diut", type: "seniority", amount: 200 })]);
    expect(r.result.brutoTotal).toBe(2_200);
    expect(r.result.baseSS).toBe(2_200);
  });
});

// ── P1 · Decomposição por rubrica ────────────────────────────────────────────

describe("decomposição por rubrica", () => {
  const somaLinhas = (lines: readonly { amount: number }[]) =>
    cent(lines.reduce((total, line) => total + line.amount, 0));

  it("duas linhas do mesmo segmento de horas extra não duplicam o valor", () => {
    const r = calculateLegacyPayroll(context, [
      rubric({ id: "extra-a", type: "overtime_workday_first", hours: 1 }),
      rubric({ id: "extra-b", type: "overtime_workday_first", hours: 1 }),
    ]);
    expect(somaLinhas(r.lines)).toBe(r.result.brutoTotal);
    const linhas = r.lines.filter((line) => line.bucket === "overtime");
    expect(linhas).toHaveLength(2);
    expect(cent(linhas[0].amount + linhas[1].amount)).toBe(r.result.suplementarTotal);
  });

  it("o trabalho noturno declarado em horas aparece nas linhas", () => {
    const r = calculateLegacyPayroll(context, [rubric({ id: "noturno", type: "night_work", hours: 10 })]);
    const linha = r.lines.find((line) => line.id === "noturno");
    expect(r.result.brutoTotal).toBe(2_028.85);
    expect(linha?.amount).toBe(28.85);
    expect(somaLinhas(r.lines)).toBe(r.result.brutoTotal);
  });

  it("invariantes: as linhas reconstroem sempre bruto, IRS, SS e líquido", () => {
    const rubrics = includeMonthlyDuodecimos(
      [
        rubric({ id: "diut", type: "seniority", amount: 150 }),
        rubric({ id: "noturno", type: "night_work", hours: 12 }),
        rubric({ id: "extra-a", type: "overtime_workday_first", hours: 3 }),
        rubric({ id: "extra-b", type: "overtime_workday_first", hours: 2 }),
        rubric({ id: "extra-c", type: "overtime_rest", hours: 4 }),
        rubric({ id: "premio", type: "performance_award", amount: 300, regularity: "not_regular" }),
        rubric({ id: "viagem-pt", type: "travel_national", days: 3, dailyAmount: 80 }),
        rubric({ id: "viagem-ue", type: "travel_foreign", days: 2, dailyAmount: 200 }),
        rubric({ id: "falta", type: "unpaid_absence", hours: 4 }),
      ],
      2_000,
      true,
    );
    const r = calculateLegacyPayroll(
      { ...context, dependants: 3, dependantsWithDisability: 1, meal: { enabled: true, days: 20, dailyAmount: 12, card: true } },
      rubrics,
    );
    const soma = (field: "amount" | "irsWithheld" | "employeeSocialSecurity" | "netImpact") =>
      cent(r.lines.reduce((total, line) => total + line[field], 0));

    expect(soma("amount")).toBe(r.result.brutoTotal);
    expect(soma("irsWithheld")).toBe(r.result.irsTotal);
    expect(soma("employeeSocialSecurity")).toBe(r.result.ssTrabalhador);
    expect(soma("netImpact")).toBe(r.result.liquido);
    // Nenhuma rubrica com valor pode ficar de fora do detalhe exportado.
    for (const id of ["diut", "noturno", "extra-a", "extra-b", "extra-c", "premio", "viagem-pt", "viagem-ue"]) {
      expect(r.lines.some((line) => line.id === id)).toBe(true);
    }
  });
});

// ── P2 · Validação do horário semanal ────────────────────────────────────────

describe("horário semanal", () => {
  it("assinala valores fora do intervalo em vez de recuar para 40 h", () => {
    expect(validateContext({ ...context, weeklyHours: 0 })).toHaveLength(1);
    expect(validateContext({ ...context, weeklyHours: 41 })).toHaveLength(1);
    expect(validateContext({ ...context, weeklyHours: 35 })).toHaveLength(0);
  });
});
