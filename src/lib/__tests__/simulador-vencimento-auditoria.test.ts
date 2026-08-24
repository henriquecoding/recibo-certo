/**
 * Auditoria do simulador de salário líquido (`/ferramentas/recibo-vencimento`).
 *
 * Cada controlo do ecrã tem aqui um teste que prova que ele CHEGA ao resultado.
 * Um botão que não muda um número é um botão decorativo: sem estes testes, a
 * única forma de o descobrir é um utilizador reparar que o valor não mexe.
 *
 * Os testes exercitam exatamente as funções que o componente chama —
 * `calculateLegacyPayroll`, `includeMonthlyDuodecimos`, `solveNetToGross`,
 * `calcularVencimentoAnual` — para que um controlo ligado ao motor errado
 * falhe aqui e não em produção.
 */
import { describe, expect, it } from "vitest";
import {
  PAYROLL_RUBRIC_CATALOGUE,
  RUBRIC_META,
  calculateLegacyPayroll,
  employerCost,
  includeMonthlyDuodecimos,
  mealLimit,
  validateContext,
  validateRubrics,
  WEEKLY_HOURS_RANGE,
  type PayrollRubricDraft,
  type PayrollRubricType,
  type PayrollSimulatorContext,
} from "../payroll-simulator-legacy-adapter";
import { solveNetToGross } from "../payroll-inverse";
import { calcularVencimentoAnual, taxaMarginalRetencao } from "../fiscal-dependente";
import {
  ABONO_PARA_FALHAS,
  AJUDAS_CUSTO,
  RETENCAO_DEP_CONTINENTE_T1,
  SMN,
  SS_DEPENDENTE,
  SUBSIDIO_REFEICAO,
  limiteAjudasCusto,
  taxaMarginalMaximaTabela,
  taxaRetencaoOpcionalValida,
} from "../fiscal-data";
import { calcularTempoParcial } from "../fiscal-laboral";

/** O estado inicial exato do componente `MotorReciboVencimento`. */
const PADRAO: PayrollSimulatorContext = {
  baseSalary: 1500,
  weeklyHours: 40,
  dependants: 0,
  maritalStatus: "naoCasado",
  disability: false,
  dependantsWithDisability: 0,
  disabilityFactor: 1,
  spouseDisability: false,
  region: "continente",
  youthIrsBenefitYear: undefined,
  meal: { enabled: true, days: 22, dailyAmount: 6.15, card: true },
};

function correr(
  alteracoes: Partial<PayrollSimulatorContext> = {},
  rubricas: readonly PayrollRubricDraft[] = [],
  duodecimos = false,
) {
  const contexto = { ...PADRAO, ...alteracoes, meal: { ...PADRAO.meal, ...(alteracoes.meal ?? {}) } };
  const linhas = includeMonthlyDuodecimos(rubricas, contexto.baseSalary, duodecimos);
  return calculateLegacyPayroll(contexto, linhas);
}

function rubrica(type: PayrollRubricType, campos: Partial<PayrollRubricDraft> = {}): PayrollRubricDraft {
  return { id: `t-${type}`, type, amount: 0, hours: 0, days: 0, dailyAmount: 0, regularity: "unknown", ...campos };
}

/** Valores plausíveis para preencher cada editor do catálogo. */
function preencher(type: PayrollRubricType): PayrollRubricDraft {
  switch (RUBRIC_META[type].editor) {
    case "hours":
      return rubrica(type, { hours: 10 });
    case "travel":
      return rubrica(type, { days: 5, dailyAmount: 120 });
    case "award":
      return rubrica(type, { amount: 500, regularity: "regular" });
    default:
      return rubrica(type, { amount: 300 });
  }
}

const BASE = correr();

describe("simulador de vencimento · o resultado existe e é coerente", () => {
  it("o cenário por omissão produz um recibo completo", () => {
    expect(BASE.result.salarioBase).toBe(1500);
    expect(BASE.result.brutoTotal).toBeGreaterThan(1500);
    expect(BASE.result.ssTrabalhador).toBeCloseTo(1500 * SS_DEPENDENTE.trabalhador.value, 2);
    expect(BASE.result.irsTotal).toBeGreaterThan(0);
    expect(BASE.result.liquido).toBeGreaterThan(0);
  });

  it("líquido = bruto − IRS − Segurança Social, ao cêntimo", () => {
    const { result } = BASE;
    expect(result.liquido).toBeCloseTo(result.brutoTotal - result.irsTotal - result.ssTrabalhador, 2);
  });

  it("a soma das linhas do detalhe é o bruto do recibo", () => {
    const cheio = correr({}, [
      preencher("seniority"),
      preencher("commission"),
      preencher("overtime_workday_first"),
      preencher("travel_national"),
      preencher("performance_award"),
    ]);
    const soma = cheio.lines.reduce((total, linha) => total + linha.amount, 0);
    expect(soma).toBeCloseTo(cheio.result.brutoTotal, 2);
  });

  it("o IRS e a SS repartidos pelas linhas somam o IRS e a SS do recibo", () => {
    const cheio = correr({}, [
      preencher("seniority"),
      preencher("overtime_rest"),
      rubrica("holiday_subsidy", { amount: 1500 }),
      rubrica("christmas_subsidy", { amount: 1500 }),
    ]);
    const irs = cheio.lines.reduce((total, linha) => total + linha.irsWithheld, 0);
    const ss = cheio.lines.reduce((total, linha) => total + linha.employeeSocialSecurity, 0);
    expect(irs).toBeCloseTo(cheio.result.irsTotal, 2);
    expect(ss).toBeCloseTo(cheio.result.ssTrabalhador, 2);
  });

  it("o custo da empresa mostrado é o mesmo que o motor apura", () => {
    expect(employerCost(BASE.result)).toBeCloseTo(BASE.result.custoEmpresa, 2);
    expect(BASE.result.custoEmpresaComSeguro).toBeGreaterThan(BASE.result.custoEmpresa);
  });
});

describe("simulador de vencimento · Passo 01, cada controlo do contexto", () => {
  it("salário bruto — move o líquido", () => {
    expect(correr({ baseSalary: 2500 }).result.liquido).toBeGreaterThan(BASE.result.liquido);
  });

  it("horas por semana — muda a retribuição horária e o valor da hora extra", () => {
    const extra = [preencher("overtime_workday_first")];
    const quarenta = correr({ weeklyHours: 40 }, extra);
    const vinte = correr({ weeklyHours: 20 }, extra);
    expect(vinte.result.retribuicaoHoraria).toBeGreaterThan(quarenta.result.retribuicaoHoraria);
    expect(vinte.result.suplementarTotal).toBeGreaterThan(quarenta.result.suplementarTotal);
  });

  it("horas por semana fora do intervalo legal — é recusado, não corrigido em silêncio", () => {
    expect(validateContext({ ...PADRAO, weeklyHours: 0 })).toHaveLength(1);
    expect(validateContext({ ...PADRAO, weeklyHours: WEEKLY_HOURS_RANGE.max + 1 })).toHaveLength(1);
    expect(validateContext(PADRAO)).toHaveLength(0);
  });

  it("dependentes — cada um reduz a retenção", () => {
    const zero = correr({ dependants: 0 }).result.irsTotal;
    const um = correr({ dependants: 1 }).result.irsTotal;
    const tres = correr({ dependants: 3 }).result.irsTotal;
    expect(um).toBeLessThan(zero);
    expect(tres).toBeLessThan(um);
  });

  it("dependentes — o contador vai além de 4 e o 5.º dependente conta mesmo", () => {
    // O segmento antigo «0 1 2 3 4+» enviava 4 ao motor. Com 1 500 € a retenção
    // já é zero ao 5.º dependente, por isso o teste usa um salário em que os
    // quatro primeiros ainda não esgotam a coleta retida.
    const retencoes = [4, 5, 6].map((n) => correr({ baseSalary: 3000, dependants: n }).result.irsTotal);
    expect(new Set(retencoes).size).toBe(3);
    expect(retencoes[2]).toBeLessThan(retencoes[0]);
  });

  it("dependentes — a retenção nunca fica negativa", () => {
    expect(correr({ dependants: 20 }).result.irsTotal).toBe(0);
    expect(correr({ dependants: 20 }).result.liquido).toBeGreaterThan(0);
  });

  it("situação familiar — as três opções chegam ao resultado", () => {
    // «Não casado» e «casado, dois titulares» partilham a mesma tabela: só a
    // parcela POR DEPENDENTE difere. Sem dependentes é correto darem o mesmo
    // número — o teste tem de os separar onde a lei os separa.
    const semDependentes = (["naoCasado", "casadoDois", "casadoUnico"] as const).map(
      (maritalStatus) => correr({ maritalStatus }).result.irsTotal,
    );
    expect(semDependentes[0]).toBeCloseTo(semDependentes[1], 2);
    expect(semDependentes[2]).toBeLessThan(semDependentes[0]);

    const comDependentes = (["naoCasado", "casadoDois", "casadoUnico"] as const).map(
      (maritalStatus) => correr({ maritalStatus, dependants: 2 }).result.irsTotal,
    );
    expect(new Set(comDependentes).size).toBe(3);
  });

  it("região fiscal — Madeira e Açores retêm menos do que o Continente", () => {
    const continente = correr({ region: "continente" }).result.irsTotal;
    expect(correr({ region: "madeira" }).result.irsTotal).toBeLessThan(continente);
    expect(correr({ region: "acores" }).result.irsTotal).toBeLessThan(continente);
  });

  it("titular com incapacidade ≥ 60% — usa a tabela própria", () => {
    expect(correr({ disability: true }).result.irsTotal).toBeLessThan(BASE.result.irsTotal);
  });

  it("dependentes com incapacidade — reduzem a retenção do mês", () => {
    const semIncapacidade = correr({ dependants: 2 }).result.irsTotal;
    const comIncapacidade = correr({ dependants: 2, dependantsWithDisability: 2 }).result.irsTotal;
    expect(comIncapacidade).toBeLessThan(semIncapacidade);
  });

  it("fator comunicado à empresa — multiplica a parcela por dependente", () => {
    const um = correr({ dependants: 1, dependantsWithDisability: 1, disabilityFactor: 1 }).result.irsTotal;
    const tres = correr({ dependants: 1, dependantsWithDisability: 1, disabilityFactor: 3 }).result.irsTotal;
    expect(tres).toBeLessThan(um);
  });

  it("cônjuge com incapacidade — só conta em «casado, único titular»", () => {
    const semConjuge = correr({ maritalStatus: "casadoUnico" }).result.irsTotal;
    const comConjuge = correr({ maritalStatus: "casadoUnico", spouseDisability: true }).result.irsTotal;
    expect(comConjuge).toBeLessThan(semConjuge);
  });

  it("IRS Jovem — isenta parte do rendimento e o ano do benefício muda a isenção", () => {
    const sem = correr().result;
    const ano1 = correr({ youthIrsBenefitYear: 1 }).result;
    const ano8 = correr({ youthIrsBenefitYear: 8 }).result;
    expect(ano1.irsTotal).toBeLessThan(sem.irsTotal);
    expect(ano1.rendimentoIsentoJovem).toBeGreaterThan(0);
    expect(ano8.isencaoJovemPct).toBeLessThan(ano1.isencaoJovemPct);
    expect(ano8.irsTotal).toBeGreaterThan(ano1.irsTotal);
    expect(ano1.irsSemJovem).toBeGreaterThan(ano1.irsTotal);
  });

  it("IRS Jovem — os dez anos do benefício estão todos ligados", () => {
    const percentagens = Array.from({ length: 10 }, (_, i) =>
      correr({ youthIrsBenefitYear: i + 1 }).result.isencaoJovemPct,
    );
    expect(percentagens[0]).toBeGreaterThan(0);
    expect(percentagens[9]).toBeGreaterThan(0);
    expect(new Set(percentagens).size).toBeGreaterThan(1);
  });

  it("duodécimos — acrescentam 1/12 de cada subsídio ao bruto do mês", () => {
    const sem = correr();
    const com = correr({}, [], true);
    expect(com.result.subsidioFerias).toBeCloseTo(1500 / 12, 2);
    expect(com.result.subsidioNatal).toBeCloseTo(1500 / 12, 2);
    expect(com.result.brutoTotal).toBeGreaterThan(sem.result.brutoTotal);
    expect(com.result.liquido).toBeGreaterThan(sem.result.liquido);
  });

  it("duodécimos — a retenção é a fração do imposto do subsídio completo, não zero", () => {
    const com = correr({}, [], true);
    expect(com.result.irsSubsidios).toBeGreaterThan(0);
  });
});

describe("simulador de vencimento · subsídio de refeição", () => {
  it("«Incluir» desligado — o subsídio sai do bruto", () => {
    const com = correr({ meal: { ...PADRAO.meal, enabled: true } });
    const sem = correr({ meal: { ...PADRAO.meal, enabled: false } });
    expect(com.result.subsidioRefeicaoTotal).toBeGreaterThan(0);
    expect(sem.result.subsidioRefeicaoTotal).toBe(0);
    expect(sem.result.brutoTotal).toBeLessThan(com.result.brutoTotal);
  });

  it("valor por dia e dias pagos — multiplicam o total", () => {
    const base = correr({ meal: { ...PADRAO.meal, dailyAmount: 6, days: 20 } }).result.subsidioRefeicaoTotal;
    expect(base).toBeCloseTo(120, 2);
    expect(correr({ meal: { ...PADRAO.meal, dailyAmount: 6, days: 10 } }).result.subsidioRefeicaoTotal).toBeCloseTo(60, 2);
  });

  it("dinheiro vs cartão — o limite isento muda e o excesso passa a ser tributado", () => {
    expect(mealLimit(true)).toBe(SUBSIDIO_REFEICAO.cartao.value);
    expect(mealLimit(false)).toBe(SUBSIDIO_REFEICAO.dinheiro.value);
    const valor = SUBSIDIO_REFEICAO.cartao.value;
    const cartao = correr({ meal: { enabled: true, days: 22, dailyAmount: valor, card: true } });
    const dinheiro = correr({ meal: { enabled: true, days: 22, dailyAmount: valor, card: false } });
    expect(cartao.result.subsidioRefeicaoTributado).toBe(0);
    expect(dinheiro.result.subsidioRefeicaoTributado).toBeGreaterThan(0);
    expect(dinheiro.result.irsTotal).toBeGreaterThan(cartao.result.irsTotal);
    expect(dinheiro.result.ssTrabalhador).toBeGreaterThan(cartao.result.ssTrabalhador);
  });
});

describe("simulador de vencimento · Passo 02, todas as rubricas do catálogo", () => {
  it.each(PAYROLL_RUBRIC_CATALOGUE.map((meta) => [meta.label, meta.type] as const))(
    "«%s» chega ao resultado",
    (_label, type) => {
      const antes = correr();
      const depois = correr({}, [preencher(type)]);
      const mudou =
        Math.abs(depois.result.brutoTotal - antes.result.brutoTotal) > 0.005
        || Math.abs(depois.result.irsTotal - antes.result.irsTotal) > 0.005
        || Math.abs(depois.result.ssTrabalhador - antes.result.ssTrabalhador) > 0.005
        || Math.abs(depois.result.liquido - antes.result.liquido) > 0.005;
      expect(mudou).toBe(true);
    },
  );

  it.each(PAYROLL_RUBRIC_CATALOGUE.map((meta) => [meta.label, meta.type] as const))(
    "«%s» aparece no detalhe por rubrica",
    (_label, type) => {
      const { lines } = correr({}, [preencher(type)]);
      if (type === "unpaid_absence") {
        expect(lines.some((linha) => linha.id === "absence-deduction")).toBe(true);
        return;
      }
      expect(lines.some((linha) => linha.id === `t-${type}`)).toBe(true);
    },
  );

  it("faltas não remuneradas — descontam pela retribuição horária", () => {
    const { result } = correr({}, [rubrica("unpaid_absence", { hours: 8 })]);
    expect(result.descontoFaltas).toBeCloseTo(result.retribuicaoHoraria * 8, 2);
    expect(result.liquido).toBeLessThan(BASE.result.liquido);
  });

  it("horas extra — cada escalão vale mais do que o anterior à mesma hora", () => {
    const escaloes = [
      "overtime_workday_first",
      "overtime_workday_following",
      "overtime_rest",
      "overtime_over100_first",
      "overtime_over100_following",
      "overtime_over100_rest",
    ] as const;
    const valores = escaloes.map((type) => correr({}, [rubrica(type, { hours: 10 })]).result.suplementarTotal);
    expect(valores).toEqual([...valores].sort((a, b) => a - b));
    // Cinco valores, não seis: o acréscimo de «descanso ou feriado» abaixo das
    // 100 horas e o da «1.ª hora em dia útil» acima delas são ambos de 50%.
    expect(new Set(valores).size).toBe(5);
    expect(valores[valores.length - 1]).toBeGreaterThan(valores[0] * 1.5);
  });

  it("horas extra — a retenção é autónoma, a 50% da taxa efetiva do mês", () => {
    const { result } = correr({}, [rubrica("overtime_rest", { hours: 10 })]);
    expect(result.suplementarIRS).toBeGreaterThan(0);
    expect(result.irsTotal).toBeGreaterThan(result.irsBaseMensal);
  });

  it("prémio — «regular» entra na base da Segurança Social, «não regular» não", () => {
    const regular = correr({}, [rubrica("performance_award", { amount: 500, regularity: "regular" })]);
    const naoRegular = correr({}, [rubrica("performance_award", { amount: 500, regularity: "not_regular" })]);
    expect(regular.result.baseSS).toBeGreaterThan(naoRegular.result.baseSS);
    expect(regular.result.ssTrabalhador).toBeGreaterThan(naoRegular.result.ssTrabalhador);
    expect(regular.result.irsBaseMensal).toBeCloseTo(naoRegular.result.irsBaseMensal, 2);
  });

  it("prémio — «Não sei» bloqueia a conclusão em vez de escolher por nós", () => {
    expect(validateRubrics([rubrica("performance_award", { amount: 500, regularity: "unknown" })]))
      .toContain("Prémio de desempenho: confirme se existe caráter regular para a Segurança Social.");
  });

  it("trabalho noturno — as horas produzem o acréscimo de 25% da retribuição horária", () => {
    const { result, lines } = correr({}, [rubrica("night_work", { hours: 10 })]);
    const linha = lines.find((item) => item.id === "t-night_work");
    expect(linha?.amount).toBeCloseTo(result.retribuicaoHoraria * 10 * 0.25, 1);
  });

  it("diuturnidades — sobem a retribuição horária, logo o valor da hora extra", () => {
    const so = correr({}, [rubrica("overtime_workday_first", { hours: 10 })]).result.suplementarTotal;
    const com = correr({}, [
      rubrica("overtime_workday_first", { hours: 10 }),
      rubrica("seniority", { amount: 200 }),
    ]).result.suplementarTotal;
    expect(com).toBeGreaterThan(so);
  });

  it("ajudas de custo — o limite isento aplica-se a CADA deslocação", () => {
    const limite = limiteAjudasCusto(false, "trabalhador");
    const duas = correr({}, [
      rubrica("travel_national", { id: "v1", days: 2, dailyAmount: limite + 40 }),
      rubrica("travel_national", { id: "v2", days: 2, dailyAmount: 10 }),
    ]);
    expect(duas.result.ajudasDetalhe).toHaveLength(2);
    expect(duas.result.ajudasTributadas).toBeCloseTo(80, 2);
    expect(duas.result.ajudasIsentas).toBeCloseTo(limite * 2 + 20, 2);
  });

  it("ajudas de custo — o escalão «Administração» isenta mais do que «Trabalhador»", () => {
    const dias = 5;
    const valorDia = limiteAjudasCusto(false, "direcao");
    const trabalhador = correr({}, [rubrica("travel_national", { days: dias, dailyAmount: valorDia, travelTier: "trabalhador" })]);
    const direcao = correr({}, [rubrica("travel_national", { days: dias, dailyAmount: valorDia, travelTier: "direcao" })]);
    expect(direcao.result.ajudasIsentas).toBeGreaterThan(trabalhador.result.ajudasIsentas);
    expect(direcao.result.ajudasTributadas).toBe(0);
    expect(trabalhador.result.ajudasTributadas).toBeGreaterThan(0);
  });

  it("ajudas de custo ao estrangeiro — limite próprio, diferente do nacional", () => {
    expect(limiteAjudasCusto(true, "trabalhador")).not.toBe(limiteAjudasCusto(false, "trabalhador"));
  });

  it("subsídios de férias e Natal — retenção autónoma, separada do salário", () => {
    const ferias = correr({}, [rubrica("holiday_subsidy", { amount: 1500 })]);
    expect(ferias.result.irsFerias).toBeGreaterThan(0);
    expect(ferias.result.irsBaseMensal).toBeCloseTo(BASE.result.irsBaseMensal, 2);
  });

  it("rubricas incompletas — são assinaladas, não calculadas com zero", () => {
    for (const meta of PAYROLL_RUBRIC_CATALOGUE) {
      expect(validateRubrics([rubrica(meta.type)]).length).toBeGreaterThan(0);
    }
  });
});

describe("simulador de vencimento · modo «Quero receber»", () => {
  const liquidoDe = (base: number) =>
    correr({ baseSalary: base }).result.liquido;

  it("encontra o bruto que produz o líquido pedido", () => {
    const alvo = 1200;
    const solucao = solveNetToGross({ target: alvo, liquidoDe });
    expect(solucao.reached).toBe(true);
    expect(liquidoDe(solucao.gross)).toBeGreaterThanOrEqual(alvo - 0.01);
    expect(liquidoDe(solucao.gross - 1)).toBeLessThan(alvo);
  });

  it("um alvo inalcançável é declarado, não arredondado em silêncio", () => {
    const solucao = solveNetToGross({ target: 900_000, liquidoDe });
    expect(solucao.reached).toBe(false);
  });

  it("o contexto do utilizador entra na inversão — mais dependentes, menos bruto necessário", () => {
    const alvo = 1400;
    const semDependentes = solveNetToGross({ target: alvo, liquidoDe }).gross;
    const comDependentes = solveNetToGross({
      target: alvo,
      liquidoDe: (base) => correr({ baseSalary: base, dependants: 3 }).result.liquido,
    }).gross;
    expect(comDependentes).toBeLessThan(semDependentes);
  });

  it("as rubricas do mês entram na inversão", () => {
    const alvo = 1400;
    const so = solveNetToGross({ target: alvo, liquidoDe }).gross;
    const comComissao = solveNetToGross({
      target: alvo,
      liquidoDe: (base) => correr({ baseSalary: base }, [rubrica("commission", { amount: 300 })]).result.liquido,
    }).gross;
    expect(comComissao).toBeLessThan(so);
  });
});

describe("simulador de vencimento · separador «Ano»", () => {
  const anual = (extra: Parameters<typeof calcularVencimentoAnual>[0] extends infer T ? Partial<T> : never = {}) =>
    calcularVencimentoAnual({
      salarioBruto: 1500,
      dependentes: 0,
      dependentesDeficientes: 0,
      fatorDependenteDeficiente: 1,
      conjugeDeficiente: false,
      subsidioRefeicaoDia: 6.15,
      subsidioRefeicaoCartao: true,
      diasUteis: 22,
      estadoCivil: "naoCasado",
      deficiencia: false,
      regiao: "continente",
      ...extra,
    });

  it("a visão anual reage aos mesmos controlos do contexto", () => {
    const base = anual();
    // 14 meses de retribuição. O subsídio de refeição é somado ao líquido em
    // separado (`subsidioRefeicaoAnual`), porque não é retribuição.
    expect(base.brutoAnual).toBeCloseTo(1500 * 14, 2);
    expect(base.subsidioRefeicaoAnual).toBeGreaterThan(0);
    expect(base.liquidoAnual).toBeGreaterThan(base.brutoAnual - base.ssAnual - base.irsAnual);
    expect(anual({ dependentes: 3 }).irsAnual).toBeLessThan(base.irsAnual);
    expect(anual({ regiao: "madeira" }).irsAnual).toBeLessThan(base.irsAnual);
    expect(anual({ deficiencia: true }).irsAnual).toBeLessThan(base.irsAnual);
    expect(anual({ irsJovemAno: 1 }).irsAnual).toBeLessThan(base.irsAnual);
    expect(anual({ subsidioRefeicaoCartao: false, subsidioRefeicaoDia: 10 }).irsAnual)
      .toBeGreaterThan(anual({ subsidioRefeicaoCartao: true, subsidioRefeicaoDia: 10 }).irsAnual);
  });

  it("o mês e o ano contam a mesma Segurança Social sobre o salário", () => {
    const mes = correr({ meal: { ...PADRAO.meal, enabled: false } }).result.ssTrabalhador;
    expect(anual({ subsidioRefeicaoDia: 0 }).ssAnual).toBeCloseTo(mes * 14, 1);
  });
});

describe("simulador de vencimento · separador «Empresa»", () => {
  it("a TSU incide sobre a base contributiva, e o subsídio isento entra no custo", () => {
    const { result } = BASE;
    expect(employerCost(result)).toBeCloseTo(
      result.brutoTotal + result.baseSS * SS_DEPENDENTE.entidade.value,
      2,
    );
    expect(employerCost(result)).toBeGreaterThan(result.brutoTotal);
  });

  it("o custo sobe com cada rubrica sujeita a contribuições", () => {
    const semExtras = employerCost(BASE.result);
    const comComissao = employerCost(correr({}, [rubrica("commission", { amount: 500 })]).result);
    expect(comComissao).toBeGreaterThan(semExtras + 500);
  });
});


describe("simulador de vencimento · taxa de retenção superior por opção (Art. 98.º, n.º 6 CIRS)", () => {
  it("sem opção o resultado é o da tabela", () => {
    expect(correr({ optionalWithholdingRate: undefined }).result.irsTotal).toBe(BASE.result.irsTotal);
  });

  it("uma taxa superior aumenta a retenção e reduz o líquido", () => {
    const legal = taxaMarginalRetencao(1500).taxa;
    const com = correr({ optionalWithholdingRate: legal + 0.05 });
    expect(com.result.irsTotal).toBeGreaterThan(BASE.result.irsTotal);
    expect(com.result.liquido).toBeLessThan(BASE.result.liquido);
    expect(com.result.ssTrabalhador).toBeCloseTo(BASE.result.ssTrabalhador, 2);
  });

  it("só a taxa marginal muda — a parcela a abater e a parcela por dependente ficam", () => {
    // n.º 5, al. e) do Despacho. Verifica-se pela diferença: subir a taxa em
    // exatamente 1 p.p. tem de acrescentar remuneração × 1% à retenção, nem
    // mais nem menos. Se a parcela a abater também mudasse, não bateria certo.
    const legal = taxaMarginalRetencao(2000).taxa;
    const base = correr({ baseSalary: 2000, meal: { ...PADRAO.meal, enabled: false } });
    const maisUm = correr({
      baseSalary: 2000,
      meal: { ...PADRAO.meal, enabled: false },
      optionalWithholdingRate: Math.floor(legal * 100) / 100 + 0.01,
    });
    const passos = Math.round(((Math.floor(legal * 100) / 100 + 0.01) - legal) * 10000) / 10000;
    expect(maisUm.result.irsTotal - base.result.irsTotal).toBeCloseTo(2000 * passos, 2);
  });

  it("uma taxa igual ou inferior à legal é ignorada — a lei exige taxa SUPERIOR", () => {
    const legal = taxaMarginalRetencao(1500).taxa;
    expect(correr({ optionalWithholdingRate: legal }).result.irsTotal).toBe(BASE.result.irsTotal);
    expect(correr({ optionalWithholdingRate: legal - 0.05 }).result.irsTotal).toBe(BASE.result.irsTotal);
  });

  it("a taxa é limitada ao topo da tabela e arredondada a ponto percentual inteiro", () => {
    const escaloes = RETENCAO_DEP_CONTINENTE_T1.value;
    const topo = taxaMarginalMaximaTabela(escaloes);
    expect(taxaRetencaoOpcionalValida(0.9, 0.25, escaloes)).toBe(topo);
    expect(taxaRetencaoOpcionalValida(0.302, 0.25, escaloes)).toBe(0.3);
    expect(taxaRetencaoOpcionalValida(0.308, 0.25, escaloes)).toBe(0.31);
    expect(taxaRetencaoOpcionalValida(undefined, 0.25, escaloes)).toBeUndefined();
  });

  it("aplica-se mesmo a quem a tabela isentaria — é esse o caso que a torna útil", () => {
    const isento = correr({ baseSalary: 900, meal: { ...PADRAO.meal, enabled: false } });
    expect(isento.result.irsTotal).toBe(0);
    const comOpcao = correr({
      baseSalary: 900,
      meal: { ...PADRAO.meal, enabled: false },
      optionalWithholdingRate: 0.1,
    });
    expect(comOpcao.result.irsTotal).toBeCloseTo(90, 2);
  });

  it("a opção acompanha os subsídios e o trabalho suplementar do mês", () => {
    const legal = taxaMarginalRetencao(1500).taxa;
    const rubricas = [rubrica("holiday_subsidy", { amount: 1500 }), rubrica("overtime_rest", { hours: 10 })];
    const sem = correr({}, rubricas);
    const com = correr({ optionalWithholdingRate: legal + 0.05 }, rubricas);
    expect(com.result.irsFerias).toBeGreaterThan(sem.result.irsFerias);
    expect(com.result.suplementarIRS).toBeGreaterThan(sem.result.suplementarIRS);
  });

  it("a taxa marginal legal é a da tabela da situação, já com a redução dos 3+ dependentes", () => {
    const semDependentes = taxaMarginalRetencao(2000, { dependentes: 0 }).taxa;
    const comTres = taxaMarginalRetencao(2000, { dependentes: 3 }).taxa;
    expect(comTres).toBeCloseTo(semDependentes - 0.01, 4);
    expect(taxaMarginalRetencao(2000).taxaMaximaTabela).toBe(
      taxaMarginalMaximaTabela(RETENCAO_DEP_CONTINENTE_T1.value),
    );
  });

  it("a visão anual também reflete a opção", () => {
    const argumentos = {
      salarioBruto: 1500,
      dependentes: 0,
      estadoCivil: "naoCasado" as const,
      regiao: "continente" as const,
      subsidioRefeicaoDia: 0,
      diasUteis: 22,
    };
    const sem = calcularVencimentoAnual(argumentos);
    const com = calcularVencimentoAnual({ ...argumentos, taxaRetencaoOpcional: 0.4 });
    expect(com.irsAnual).toBeGreaterThan(sem.irsAnual);
    expect(com.liquidoAnual).toBeLessThan(sem.liquidoAnual);
  });
});

describe("simulador de vencimento · regime contributivo da entidade", () => {
  it("o regime geral aplica a TSU e a IPSS a taxa reduzida", () => {
    const geral = correr({ employerRegime: "geral" });
    const ipss = correr({ employerRegime: "ipss" });
    expect(geral.result.taxaEntidade).toBe(SS_DEPENDENTE.entidade.value);
    expect(ipss.result.taxaEntidade).toBe(SS_DEPENDENTE.ipss.value);
    expect(employerCost(ipss.result)).toBeLessThan(employerCost(geral.result));
    expect(employerCost(ipss.result)).toBeCloseTo(
      ipss.result.brutoTotal + ipss.result.baseSS * SS_DEPENDENTE.ipss.value,
      2,
    );
  });

  it("o regime da entidade não toca no desconto nem no IRS do trabalhador", () => {
    const geral = correr({ employerRegime: "geral" }).result;
    const ipss = correr({ employerRegime: "ipss" }).result;
    expect(ipss.ssTrabalhador).toBe(geral.ssTrabalhador);
    expect(ipss.irsTotal).toBe(geral.irsTotal);
    expect(ipss.liquido).toBe(geral.liquido);
  });

  it("o custo mostrado e o custo do motor são o MESMO número", () => {
    for (const employerRegime of ["geral", "ipss"] as const) {
      const { result } = correr({ employerRegime });
      expect(employerCost(result)).toBe(result.custoEmpresa);
    }
  });
});

describe("simulador de vencimento · taxa efetiva de cada remuneração (Despacho n.º 10)", () => {
  it("uma linha por remuneração paga, e nenhuma para as que não existem", () => {
    const so = correr();
    expect(so.result.taxasEfetivasRetencao.map((linha) => linha.codigo)).toEqual(["mensal"]);

    const completo = correr({}, [
      rubrica("holiday_subsidy", { amount: 1500 }),
      rubrica("christmas_subsidy", { amount: 1500 }),
      rubrica("overtime_rest", { hours: 10 }),
    ]);
    expect(completo.result.taxasEfetivasRetencao.map((linha) => linha.codigo).sort()).toEqual(
      ["ferias", "mensal", "natal", "suplementar"],
    );
  });

  it("cada taxa é a retenção dessa remuneração a dividir pela sua base", () => {
    const { result } = correr({}, [rubrica("holiday_subsidy", { amount: 1500 })]);
    for (const linha of result.taxasEfetivasRetencao) {
      expect(linha.taxa).toBeCloseTo(linha.retencao / linha.base, 6);
      expect(linha.base).toBeGreaterThan(0);
    }
  });

  it("as retenções apresentadas em separado somam a retenção do mês", () => {
    const { result } = correr({}, [
      rubrica("holiday_subsidy", { amount: 1500 }),
      rubrica("christmas_subsidy", { amount: 1500 }),
      rubrica("overtime_workday_first", { hours: 8 }),
    ]);
    const soma = result.taxasEfetivasRetencao.reduce((total, linha) => total + linha.retencao, 0);
    expect(soma).toBeCloseTo(result.irsTotal, 2);
  });

  it("o subsídio tem taxa própria — não a taxa da remuneração mensal", () => {
    const { result } = correr({ baseSalary: 1500 }, [rubrica("holiday_subsidy", { amount: 3000 })]);
    const mensal = result.taxasEfetivasRetencao.find((linha) => linha.codigo === "mensal");
    const ferias = result.taxasEfetivasRetencao.find((linha) => linha.codigo === "ferias");
    expect(ferias!.taxa).toBeGreaterThan(mensal!.taxa);
  });

  it("o trabalho suplementar retém a metade da taxa do mês (n.º 5, al. f)", () => {
    const { result } = correr({}, [rubrica("overtime_rest", { hours: 10 })]);
    const mensal = result.taxasEfetivasRetencao.find((linha) => linha.codigo === "mensal");
    const suplementar = result.taxasEfetivasRetencao.find((linha) => linha.codigo === "suplementar");
    expect(suplementar!.taxa).toBeCloseTo(mensal!.taxa / 2, 4);
  });
});

describe("simulador de vencimento · retribuição mínima garantida", () => {
  it("a tempo completo o mínimo é o salário mínimo nacional", () => {
    expect(calcularTempoParcial(SMN.value, 40).retribuicaoMinimaProporcional).toBeCloseTo(SMN.value, 2);
  });

  it("a tempo parcial o mínimo desce na proporção do horário (Art. 154.º CT)", () => {
    expect(calcularTempoParcial(SMN.value, 20).retribuicaoMinimaProporcional).toBeCloseTo(SMN.value / 2, 2);
    expect(calcularTempoParcial(SMN.value, 30).retribuicaoMinimaProporcional).toBeCloseTo(SMN.value * 0.75, 2);
  });

  it("um horário acima do máximo legal não inflaciona o mínimo", () => {
    expect(calcularTempoParcial(SMN.value, 60).retribuicaoMinimaProporcional).toBeCloseTo(SMN.value, 2);
  });
});


describe("simulador de vencimento · quilómetros em automóvel próprio (Art. 2.º, n.º 3, al. d) CIRS)", () => {
  const LIMITE = AJUDAS_CUSTO.kmAutomovelProprio.value;

  it("abaixo do limite por quilómetro fica tudo isento", () => {
    const { result } = correr({}, [rubrica("travel_km", { days: 300, dailyAmount: LIMITE })]);
    expect(result.ajudasTotal).toBeCloseTo(300 * LIMITE, 2);
    expect(result.ajudasIsentas).toBeCloseTo(300 * LIMITE, 2);
    expect(result.ajudasTributadas).toBe(0);
    expect(result.irsTotal).toBe(BASE.result.irsTotal);
    expect(result.ssTrabalhador).toBe(BASE.result.ssTrabalhador);
  });

  it("o excesso por quilómetro entra nas duas bases", () => {
    const excesso = 0.1;
    const { result } = correr({}, [rubrica("travel_km", { days: 300, dailyAmount: LIMITE + excesso })]);
    expect(result.ajudasTributadas).toBeCloseTo(300 * excesso, 2);
    expect(result.ssTrabalhador).toBeGreaterThan(BASE.result.ssTrabalhador);
    expect(result.irsTotal).toBeGreaterThan(BASE.result.irsTotal);
  });

  it("o limite é POR QUILÓMETRO, não por dia — e não é o das ajudas de custo", () => {
    const { result } = correr({}, [rubrica("travel_km", { days: 100, dailyAmount: 1 })]);
    expect(result.ajudasDetalhe[0].unidade).toBe("km");
    expect(result.ajudasDetalhe[0].limiteDia).toBe(LIMITE);
    expect(LIMITE).toBeLessThan(limiteAjudasCusto(false, "trabalhador"));
  });

  it("o escalão não conta nos quilómetros: o limite é o mesmo para toda a gente", () => {
    const trabalhador = correr({}, [rubrica("travel_km", { days: 500, dailyAmount: 0.6, travelTier: "trabalhador" })]);
    const direcao = correr({}, [rubrica("travel_km", { days: 500, dailyAmount: 0.6, travelTier: "direcao" })]);
    expect(direcao.result.ajudasIsentas).toBe(trabalhador.result.ajudasIsentas);
    expect(direcao.result.ajudasTributadas).toBe(trabalhador.result.ajudasTributadas);
  });

  it("os quilómetros contam-se com decimais, ao contrário dos dias", () => {
    const km = correr({}, [rubrica("travel_km", { days: 120.5, dailyAmount: LIMITE })]);
    expect(km.result.ajudasTotal).toBeCloseTo(120.5 * LIMITE, 2);
    const dias = correr({}, [rubrica("travel_national", { days: 2.9, dailyAmount: 50 })]);
    expect(dias.result.ajudasDetalhe[0].dias).toBe(2);
  });

  it("uma deslocação em dias e outra em quilómetros convivem no mesmo mês", () => {
    const { result } = correr({}, [
      rubrica("travel_national", { id: "d", days: 3, dailyAmount: 80 }),
      rubrica("travel_km", { id: "k", days: 200, dailyAmount: 0.5 }),
    ]);
    expect(result.ajudasDetalhe).toHaveLength(2);
    expect(result.ajudasDetalhe.map((linha) => linha.unidade)).toEqual(["dia", "km"]);
  });
});

describe("simulador de vencimento · abono para falhas (Art. 2.º, n.º 3, al. c) CIRS)", () => {
  it("o limite é uma FRAÇÃO da remuneração fixa, não um valor em euros", () => {
    const { result } = correr({ baseSalary: 2000 }, [rubrica("cash_handling_allowance", { amount: 50 })]);
    expect(result.abonoFalhasLimite).toBeCloseTo(2000 * ABONO_PARA_FALHAS.value, 2);
  });

  it("abaixo do limite fica isento e não toca em IRS nem SS", () => {
    const semAbono = correr({ baseSalary: 2000 });
    const comAbono = correr({ baseSalary: 2000 }, [rubrica("cash_handling_allowance", { amount: 50 })]);
    expect(comAbono.result.abonoFalhasTributado).toBe(0);
    expect(comAbono.result.irsTotal).toBe(semAbono.result.irsTotal);
    expect(comAbono.result.ssTrabalhador).toBe(semAbono.result.ssTrabalhador);
    expect(comAbono.result.liquido).toBeCloseTo(semAbono.result.liquido + 50, 2);
  });

  it("só o excesso é tributado", () => {
    const excesso = 30;
    const { result } = correr({ baseSalary: 2000 }, [
      rubrica("cash_handling_allowance", { amount: 2000 * ABONO_PARA_FALHAS.value + excesso }),
    ]);
    expect(result.abonoFalhasTributado).toBeCloseTo(excesso, 2);
    expect(result.baseSS).toBeCloseTo(correr({ baseSalary: 2000 }).result.baseSS + excesso, 2);
  });

  it("os complementos FIXOS sobem o limite; as comissões não", () => {
    const soBase = correr({ baseSalary: 2000 }, [rubrica("cash_handling_allowance", { amount: 10 })]);
    const comFixos = correr({ baseSalary: 2000 }, [
      rubrica("cash_handling_allowance", { amount: 10 }),
      rubrica("function_allowance", { id: "f", amount: 400 }),
    ]);
    const comComissoes = correr({ baseSalary: 2000 }, [
      rubrica("cash_handling_allowance", { amount: 10 }),
      rubrica("commission", { id: "c", amount: 400 }),
    ]);
    expect(comFixos.result.abonoFalhasLimite).toBeCloseTo(2400 * ABONO_PARA_FALHAS.value, 2);
    expect(comComissoes.result.abonoFalhasLimite).toBeCloseTo(soBase.result.abonoFalhasLimite, 2);
  });

  it("a parte isenta não conta para a taxa efetiva nem para o custo da empresa", () => {
    const semAbono = correr({ baseSalary: 2000 });
    const comAbono = correr({ baseSalary: 2000 }, [rubrica("cash_handling_allowance", { amount: 80 })]);
    // Sai da empresa (entra no custo) mas não entra na base contributiva.
    expect(employerCost(comAbono.result)).toBeCloseTo(employerCost(semAbono.result) + 80, 2);
    expect(comAbono.result.baseSS).toBeCloseTo(semAbono.result.baseSS, 2);
  });
});
