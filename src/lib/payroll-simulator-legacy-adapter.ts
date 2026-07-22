/**
 * Camada anticorrupção temporária entre o novo builder de rubricas e o motor
 * dependente atual. Deve desaparecer quando a Fiscal Engine aprovada expuser
 * o mesmo ViewModel. Não contém tabelas de retenção nem parâmetros duplicados.
 */
import {
  calcularReciboMensal,
  type ReciboMensalInput,
  type ReciboMensalResult,
} from "./fiscal-dependente";
import {
  AJUDAS_CUSTO,
  SS_DEPENDENTE,
  SUBSIDIO_REFEICAO,
  type EstadoCivilRet,
  type Regiao,
} from "./fiscal-data";

export type PayrollRubricType =
  | "seniority"
  | "function_allowance"
  | "schedule_exemption"
  | "shift_allowance"
  | "commission"
  | "night_work"
  | "performance_award"
  | "overtime_workday_first"
  | "overtime_workday_following"
  | "overtime_rest"
  | "overtime_over100_first"
  | "overtime_over100_following"
  | "overtime_over100_rest"
  | "holiday_subsidy"
  | "christmas_subsidy"
  | "unpaid_absence"
  | "travel_national"
  | "travel_foreign"
  | "other_taxable";

export interface PayrollRubricDraft {
  id: string;
  type: PayrollRubricType;
  amount: number;
  hours: number;
  days: number;
  dailyAmount: number;
  regularity: "regular" | "not_regular" | "unknown";
}

export interface PayrollSimulatorContext {
  baseSalary: number;
  weeklyHours: number;
  dependants: number;
  maritalStatus: EstadoCivilRet;
  disability: boolean;
  region: Regiao;
  youthIrsBenefitYear?: number;
  meal: { enabled: boolean; days: number; dailyAmount: number; card: boolean };
}

export interface PayrollRubricMeta {
  type: PayrollRubricType;
  label: string;
  shortLabel: string;
  description: string;
  category: "fixed" | "variable" | "time" | "subsidy" | "absence" | "travel";
  editor: "amount" | "hours" | "travel" | "award";
  source: string;
}

export const PAYROLL_RUBRIC_CATALOGUE: readonly PayrollRubricMeta[] = [
  { type: "seniority", label: "Diuturnidades", shortLabel: "Diuturnidades", description: "Complemento por antiguidade previsto no contrato ou IRCT.", category: "fixed", editor: "amount", source: "CIRS art. 2.º · CRC art. 46.º" },
  { type: "function_allowance", label: "Subsídio de função", shortLabel: "Função", description: "Complemento associado às funções exercidas.", category: "fixed", editor: "amount", source: "CIRS art. 2.º · CRC art. 46.º" },
  { type: "schedule_exemption", label: "Isenção de horário", shortLabel: "Isenção de horário", description: "Compensação prevista no contrato ou IRCT.", category: "fixed", editor: "amount", source: "CT art. 265.º" },
  { type: "shift_allowance", label: "Subsídio de turno", shortLabel: "Turno", description: "Complemento remuneratório por trabalho por turnos.", category: "fixed", editor: "amount", source: "CIRS art. 2.º · CRC art. 46.º" },
  { type: "commission", label: "Comissões", shortLabel: "Comissões", description: "Remuneração variável por objetivos ou vendas.", category: "variable", editor: "amount", source: "CIRS art. 2.º · CRC art. 46.º" },
  { type: "night_work", label: "Trabalho noturno", shortLabel: "Trabalho noturno", description: "Insere o acréscimo já apurado pelo contrato ou IRCT.", category: "time", editor: "amount", source: "CT art. 266.º" },
  { type: "performance_award", label: "Prémio de desempenho", shortLabel: "Prémio", description: "A incidência de SS depende da regularidade objetiva.", category: "variable", editor: "award", source: "CRC arts. 46.º–47.º" },
  { type: "overtime_workday_first", label: "Hora extra · 1.ª em dia útil", shortLabel: "Extra 25%", description: "Até 100 horas anuais, acréscimo de 25%.", category: "time", editor: "hours", source: "CT arts. 268.º e 271.º" },
  { type: "overtime_workday_following", label: "Hora extra · seguintes em dia útil", shortLabel: "Extra 37,5%", description: "Até 100 horas anuais, acréscimo de 37,5%.", category: "time", editor: "hours", source: "CT arts. 268.º e 271.º" },
  { type: "overtime_rest", label: "Hora extra · descanso ou feriado", shortLabel: "Extra 50%", description: "Até 100 horas anuais, acréscimo de 50%.", category: "time", editor: "hours", source: "CT arts. 268.º e 271.º" },
  { type: "overtime_over100_first", label: "Hora extra >100h · 1.ª em dia útil", shortLabel: "Extra 50% >100h", description: "Depois das 100 horas anuais, primeira hora a +50%.", category: "time", editor: "hours", source: "CT arts. 268.º e 271.º" },
  { type: "overtime_over100_following", label: "Hora extra >100h · seguintes", shortLabel: "Extra 75% >100h", description: "Depois das 100 horas anuais, seguintes a +75%.", category: "time", editor: "hours", source: "CT arts. 268.º e 271.º" },
  { type: "overtime_over100_rest", label: "Hora extra >100h · descanso/feriado", shortLabel: "Extra 100% >100h", description: "Depois das 100 horas anuais, descanso ou feriado a +100%.", category: "time", editor: "hours", source: "CT arts. 268.º e 271.º" },
  { type: "holiday_subsidy", label: "Subsídio de férias", shortLabel: "Subsídio de férias", description: "Retenção autónoma, separada do salário mensal.", category: "subsidy", editor: "amount", source: "CIRS art. 99.º-C" },
  { type: "christmas_subsidy", label: "Subsídio de Natal", shortLabel: "Subsídio de Natal", description: "Retenção autónoma, separada do salário mensal.", category: "subsidy", editor: "amount", source: "CIRS art. 99.º-C" },
  { type: "unpaid_absence", label: "Falta não remunerada", shortLabel: "Falta", description: "Desconto pela fórmula da retribuição horária.", category: "absence", editor: "hours", source: "CT art. 271.º" },
  { type: "travel_national", label: "Ajuda de custo · Portugal", shortLabel: "Ajuda nacional", description: "Dias e valor diário de deslocação documentada.", category: "travel", editor: "travel", source: "CIRS art. 2.º" },
  { type: "travel_foreign", label: "Ajuda de custo · estrangeiro", shortLabel: "Ajuda estrangeiro", description: "Dias e valor diário de deslocação documentada.", category: "travel", editor: "travel", source: "CIRS art. 2.º" },
  { type: "other_taxable", label: "Outra remuneração sujeita", shortLabel: "Outra remuneração", description: "Use só quando conhece a incidência em IRS e SS.", category: "variable", editor: "amount", source: "CIRS art. 2.º · CRC art. 46.º" },
] as const;

export const RUBRIC_META = Object.fromEntries(
  PAYROLL_RUBRIC_CATALOGUE.map((item) => [item.type, item]),
) as Record<PayrollRubricType, PayrollRubricMeta>;

const OVERTIME_INDEX: Partial<Record<PayrollRubricType, number>> = {
  overtime_workday_first: 0,
  overtime_workday_following: 1,
  overtime_rest: 2,
  overtime_over100_first: 3,
  overtime_over100_following: 4,
  overtime_over100_rest: 5,
};

const FIXED_SUBJECT_TYPES = new Set<PayrollRubricType>([
  "seniority",
  "function_allowance",
  "schedule_exemption",
  "shift_allowance",
  "commission",
  "night_work",
  "other_taxable",
]);

const cent = (value: number) => Math.round(value * 100) / 100;
const positive = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);

/**
 * Acrescenta os duodécimos estimados quando o utilizador declarou esse modo de
 * pagamento. Um montante manual da mesma natureza prevalece, pois pode incluir
 * componentes retributivas que não conhecemos apenas pelo vencimento base.
 */
export function includeMonthlyDuodecimos(
  rubrics: readonly PayrollRubricDraft[],
  baseSalary: number,
  enabled: boolean,
): PayrollRubricDraft[] {
  if (!enabled) return [...rubrics];
  const monthlyPart = cent(positive(baseSalary) / 12);
  const next = [...rubrics];
  if (!rubrics.some((rubric) => rubric.type === "holiday_subsidy" && rubric.amount > 0)) {
    next.push({ id: "auto-holiday-duodecimo", type: "holiday_subsidy", amount: monthlyPart, hours: 0, days: 0, dailyAmount: 0, regularity: "unknown" });
  }
  if (!rubrics.some((rubric) => rubric.type === "christmas_subsidy" && rubric.amount > 0)) {
    next.push({ id: "auto-christmas-duodecimo", type: "christmas_subsidy", amount: monthlyPart, hours: 0, days: 0, dailyAmount: 0, regularity: "unknown" });
  }
  return next;
}

export function buildLegacyPayrollInput(
  context: PayrollSimulatorContext,
  rubrics: readonly PayrollRubricDraft[],
): ReciboMensalInput {
  const overtime = [0, 0, 0, 0, 0, 0];
  let regularAwards = 0;
  let nonRegularAwards = 0;
  let otherSubject = 0;
  let holiday = 0;
  let christmas = 0;
  let absenceHours = 0;
  let nationalDays = 0;
  let nationalDaily = 0;
  let foreignDays = 0;
  let foreignDaily = 0;

  for (const rubric of rubrics) {
    if (FIXED_SUBJECT_TYPES.has(rubric.type)) otherSubject += positive(rubric.amount);
    else if (rubric.type === "performance_award") {
      if (rubric.regularity === "regular") regularAwards += positive(rubric.amount);
      else nonRegularAwards += positive(rubric.amount);
    } else if (rubric.type === "holiday_subsidy") holiday += positive(rubric.amount);
    else if (rubric.type === "christmas_subsidy") christmas += positive(rubric.amount);
    else if (rubric.type === "unpaid_absence") absenceHours += positive(rubric.hours);
    else if (rubric.type === "travel_national") {
      nationalDays += positive(rubric.days);
      // O legado aceita um valor/dia agregado. Múltiplas linhas são ponderadas.
      nationalDaily += positive(rubric.dailyAmount) * positive(rubric.days);
    } else if (rubric.type === "travel_foreign") {
      foreignDays += positive(rubric.days);
      foreignDaily += positive(rubric.dailyAmount) * positive(rubric.days);
    } else {
      const index = OVERTIME_INDEX[rubric.type];
      if (index !== undefined) overtime[index] += positive(rubric.hours);
    }
  }

  // Prémios regulares entram em `outros` (IRS+SS) e os não regulares em
  // `premio` com o gate de SS desligado. Assim a combinação conserva as bases.
  return {
    salarioBruto: positive(context.baseSalary),
    dependentes: Math.max(0, Math.floor(context.dependants)),
    estadoCivil: context.maritalStatus,
    deficiencia: context.disability,
    regiao: context.region,
    irsJovemAno: context.youthIrsBenefitYear,
    horasSemanais: Math.max(1, context.weeklyHours),
    subsidioRefeicaoDia: context.meal.enabled ? positive(context.meal.dailyAmount) : 0,
    subsidioRefeicaoCartao: context.meal.card,
    diasSubsidio: context.meal.enabled ? Math.max(0, Math.floor(context.meal.days)) : 0,
    horasAusencia: absenceHours,
    horasSuplementares: overtime,
    premio: nonRegularAwards,
    premioRegular: false,
    subsidioFerias: holiday,
    subsidioFeriasDireitoTotal: rubrics.some((rubric) => rubric.id === "auto-holiday-duodecimo")
      ? positive(context.baseSalary)
      : holiday,
    subsidioNatal: christmas,
    subsidioNatalDireitoTotal: rubrics.some((rubric) => rubric.id === "auto-christmas-duodecimo")
      ? positive(context.baseSalary)
      : christmas,
    outrosRendimentosSujeitos: otherSubject + regularAwards,
    ajudasNacionalDias: nationalDays,
    ajudasNacionalValorDia: nationalDays > 0 ? nationalDaily / nationalDays : 0,
    ajudasEstrangeiroDias: foreignDays,
    ajudasEstrangeiroValorDia: foreignDays > 0 ? foreignDaily / foreignDays : 0,
  };
}

export interface PayrollDisplayLine {
  id: string;
  label: string;
  source: string;
  amount: number;
  irsBase: number;
  socialSecurityBase: number;
  irsWithheld: number;
  employeeSocialSecurity: number;
  netImpact: number;
  treatment: "subject" | "partial" | "exempt" | "deduction";
  detail?: string;
  bucket: "normal" | "overtime" | "holiday" | "christmas";
}

interface MutableLine extends Omit<PayrollDisplayLine, "irsWithheld" | "employeeSocialSecurity" | "netImpact"> {}

function rubricAmount(
  rubric: PayrollRubricDraft,
  overtimeDetails: ReciboMensalResult["suplementarDetalhe"],
): { amount: number; irsBase: number; ssBase: number; treatment: PayrollDisplayLine["treatment"]; bucket: PayrollDisplayLine["bucket"]; detail?: string } {
  const index = OVERTIME_INDEX[rubric.type];
  if (index !== undefined) {
    const amount = overtimeDetails[index]?.valor ?? 0;
    return { amount, irsBase: amount, ssBase: amount, treatment: "subject", bucket: "overtime", detail: `${positive(rubric.hours)} h` };
  }
  if (rubric.type === "unpaid_absence") {
    return { amount: 0, irsBase: 0, ssBase: 0, treatment: "deduction", bucket: "normal", detail: `${positive(rubric.hours)} h` };
  }
  if (rubric.type === "travel_national" || rubric.type === "travel_foreign") {
    const amount = cent(positive(rubric.days) * positive(rubric.dailyAmount));
    const limit = rubric.type === "travel_national" ? AJUDAS_CUSTO.nacionalDia.value : AJUDAS_CUSTO.estrangeiroDia.value;
    const exempt = cent(positive(rubric.days) * Math.min(positive(rubric.dailyAmount), limit));
    const taxable = cent(amount - exempt);
    return {
      amount,
      irsBase: taxable,
      ssBase: taxable,
      treatment: taxable <= 0 ? "exempt" : exempt > 0 ? "partial" : "subject",
      bucket: "normal",
      detail: `${rubric.days} dia${rubric.days === 1 ? "" : "s"} · ${cent(exempt).toFixed(2)} € isentos`,
    };
  }
  const amount = positive(rubric.amount);
  if (rubric.type === "performance_award") {
    return {
      amount,
      irsBase: amount,
      ssBase: rubric.regularity === "regular" ? amount : 0,
      treatment: rubric.regularity === "regular" ? "subject" : "partial",
      bucket: "normal",
      detail: rubric.regularity === "regular" ? "regularidade confirmada" : "fora da base SS por não regularidade declarada",
    };
  }
  if (rubric.type === "holiday_subsidy") return { amount, irsBase: amount, ssBase: amount, treatment: "subject", bucket: "holiday" };
  if (rubric.type === "christmas_subsidy") return { amount, irsBase: amount, ssBase: amount, treatment: "subject", bucket: "christmas" };
  return { amount, irsBase: amount, ssBase: amount, treatment: "subject", bucket: "normal" };
}

function allocate(total: number, lines: readonly MutableLine[], select: (line: MutableLine) => number): number[] {
  const weights = lines.map(select);
  const base = weights.reduce((sum, value) => sum + value, 0);
  if (Math.abs(base) < 0.00001 || Math.abs(total) < 0.00001) return lines.map(() => 0);
  const lastWeightedIndex = weights.reduce((last, weight, index) => Math.abs(weight) > 0.00001 ? index : last, -1);
  let usedCents = 0;
  const totalCents = Math.round(total * 100);
  return lines.map((_, index) => {
    if (Math.abs(weights[index]) <= 0.00001) return 0;
    if (index === lastWeightedIndex) return (totalCents - usedCents) / 100;
    const cents = Math.round(totalCents * weights[index] / base);
    usedCents += cents;
    return cents / 100;
  });
}

export function buildPayrollDisplayLines(
  context: PayrollSimulatorContext,
  rubrics: readonly PayrollRubricDraft[],
  result: ReciboMensalResult,
): PayrollDisplayLine[] {
  const mutable: MutableLine[] = [{
    id: "base-salary",
    label: "Vencimento base",
    source: "CIRS art. 2.º · CRC art. 46.º",
    amount: result.salarioBase,
    irsBase: result.salarioBase,
    socialSecurityBase: result.salarioBase,
    treatment: "subject",
    bucket: "normal",
  }];

  if (result.descontoFaltas > 0) {
    mutable.push({
      id: "absence-deduction",
      label: "Faltas não remuneradas",
      source: "CT art. 271.º",
      amount: -result.descontoFaltas,
      irsBase: -result.descontoFaltas,
      socialSecurityBase: -result.descontoFaltas,
      treatment: "deduction",
      bucket: "normal",
      detail: `${result.horasAusencia} h`,
    });
  }

  for (const rubric of rubrics) {
    if (rubric.type === "unpaid_absence") continue; // consolidada na linha real apurada
    const values = rubricAmount(rubric, result.suplementarDetalhe);
    if (values.amount <= 0 && values.irsBase <= 0 && values.ssBase <= 0) continue;
    mutable.push({
      id: rubric.id,
      label: RUBRIC_META[rubric.type].shortLabel,
      source: RUBRIC_META[rubric.type].source,
      amount: values.amount,
      irsBase: values.irsBase,
      socialSecurityBase: values.ssBase,
      treatment: values.treatment,
      bucket: values.bucket,
      detail: values.detail,
    });
    if (rubric.id === "auto-holiday-duodecimo" || rubric.id === "auto-christmas-duodecimo") {
      mutable[mutable.length - 1].detail = "duodécimo estimado sobre o vencimento base";
    }
  }

  if (context.meal.enabled && result.subsidioRefeicaoTotal > 0) {
    mutable.push({
      id: "meal-allowance",
      label: "Subsídio de refeição",
      source: "CIRS art. 2.º · Portaria 51-B/2026",
      amount: result.subsidioRefeicaoTotal,
      irsBase: result.subsidioRefeicaoTributado,
      socialSecurityBase: result.subsidioRefeicaoTributado,
      treatment: result.subsidioRefeicaoTributado > 0 ? "partial" : "exempt",
      bucket: "normal",
      detail: `${context.meal.days} dias · ${cent(result.subsidioRefeicaoIsento)} € isentos`,
    });
  }

  const normal = mutable.filter((line) => line.bucket === "normal");
  const overtime = mutable.filter((line) => line.bucket === "overtime");
  const holidays = mutable.filter((line) => line.bucket === "holiday");
  const christmas = mutable.filter((line) => line.bucket === "christmas");
  const irs = new Map<string, number>();
  allocate(result.irsBaseMensal, normal, (line) => line.irsBase).forEach((value, index) => irs.set(normal[index].id, value));
  allocate(result.suplementarIRS, overtime, (line) => line.irsBase).forEach((value, index) => irs.set(overtime[index].id, value));
  allocate(result.irsFerias, holidays, (line) => line.irsBase)
    .forEach((value, index) => irs.set(holidays[index].id, value));
  allocate(result.irsNatal, christmas, (line) => line.irsBase)
    .forEach((value, index) => irs.set(christmas[index].id, value));

  const ssAllocated = allocate(result.ssTrabalhador, mutable, (line) => line.socialSecurityBase);
  return mutable.map((line, index) => {
    const irsWithheld = cent(irs.get(line.id) ?? 0);
    const employeeSocialSecurity = cent(ssAllocated[index] ?? 0);
    return {
      ...line,
      irsWithheld,
      employeeSocialSecurity,
      netImpact: cent(line.amount - irsWithheld - employeeSocialSecurity),
    };
  });
}

export function calculateLegacyPayroll(
  context: PayrollSimulatorContext,
  rubrics: readonly PayrollRubricDraft[],
): { input: ReciboMensalInput; result: ReciboMensalResult; lines: PayrollDisplayLine[] } {
  const input = buildLegacyPayrollInput(context, rubrics);
  const result = calcularReciboMensal(input);
  return { input, result, lines: buildPayrollDisplayLines(context, rubrics, result) };
}

export function validateRubrics(rubrics: readonly PayrollRubricDraft[]): string[] {
  const issues: string[] = [];
  for (const rubric of rubrics) {
    const meta = RUBRIC_META[rubric.type];
    if (meta.editor === "amount" && rubric.amount <= 0) issues.push(`${meta.label}: indique um montante.`);
    if (meta.editor === "hours" && rubric.hours <= 0) issues.push(`${meta.label}: indique as horas.`);
    if (meta.editor === "travel" && (rubric.days <= 0 || rubric.dailyAmount <= 0)) issues.push(`${meta.label}: indique dias e valor diário.`);
    if (meta.editor === "award") {
      if (rubric.amount <= 0) issues.push(`${meta.label}: indique um montante.`);
      if (rubric.regularity === "unknown") issues.push(`${meta.label}: confirme se existe caráter regular para a Segurança Social.`);
    }
  }
  return issues;
}

export function employerCost(result: ReciboMensalResult): number {
  return cent(result.brutoTotal + result.baseSS * SS_DEPENDENTE.entidade.value);
}

export function mealLimit(card: boolean): number {
  return card ? SUBSIDIO_REFEICAO.cartao.value : SUBSIDIO_REFEICAO.dinheiro.value;
}
