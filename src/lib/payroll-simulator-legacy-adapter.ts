/**
 * Camada anticorrupção temporária entre o novo builder de rubricas e o motor
 * dependente atual. Deve desaparecer quando a Fiscal Engine aprovada expuser
 * o mesmo ViewModel. Não contém tabelas de retenção nem parâmetros duplicados.
 */
import {
  calcularReciboMensal,
  limiteDaLinha,
  taxaEntidadeDoRegime,
  type AjudaCustoLinha,
  type ReciboMensalInput,
  type ReciboMensalResult,
  type RegimeEntidade,
} from "./fiscal-dependente";
import {
  ABONO_PARA_FALHAS,
  SUBSIDIO_REFEICAO,
  type EscalaoAjudasCusto,
  type EstadoCivilRet,
  type Regiao,
} from "./fiscal-data";
import { calcularTrabalhoNoturno } from "./fiscal-laboral";
import { eur } from "./export/dinheiro";
import { pctExato } from "./format";

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
  | "travel_km"
  | "cash_handling_allowance"
  | "other_taxable";

export interface PayrollRubricDraft {
  id: string;
  type: PayrollRubricType;
  amount: number;
  hours: number;
  days: number;
  dailyAmount: number;
  regularity: "regular" | "not_regular" | "unknown";
  /**
   * Escalão de ajudas de custo da deslocação: o limite legal isento é o do
   * servidor do Estado equiparado (trabalhador ou administrador/gerente).
   */
  travelTier?: EscalaoAjudasCusto;
  /**
   * Direito ANUAL do subsídio quando `amount` é apenas a fração paga no mês
   * (duodécimos). O Art. 99.º-C, n.º 6 manda calcular a retenção sobre o
   * direito completo e reter a parte proporcional — tratar a fração como se
   * fosse o direito inteiro punha a retenção a zero na maioria dos casos.
   */
  entitlement?: number;
}

export interface PayrollSimulatorContext {
  baseSalary: number;
  weeklyHours: number;
  dependants: number;
  maritalStatus: EstadoCivilRet;
  disability: boolean;
  region: Regiao;
  /** Dependentes com grau de incapacidade permanente ≥ 60%. */
  dependantsWithDisability?: number;
  /** Fator comunicado à entidade devedora (Despacho 233-A/2026, n.ºs 6 e 7). */
  disabilityFactor?: number;
  /** Cônjuge/unido de facto sem rendimentos cat. A/H e com incapacidade ≥ 60%. */
  spouseDisability?: boolean;
  youthIrsBenefitYear?: number;
  meal: { enabled: boolean; days: number; dailyAmount: number; card: boolean };
  /**
   * Taxa inteira SUPERIOR à legalmente aplicável, comunicada por declaração à
   * entidade pagadora (Art. 98.º, n.º 6 CIRS). Em fração: 0,25 = 25%.
   */
  optionalWithholdingRate?: number;
  /** Regime contributivo da entidade empregadora (regime geral ou IPSS). */
  employerRegime?: RegimeEntidade;
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
  { type: "seniority", label: "Diuturnidades", shortLabel: "Diuturnidades", description: "Complemento por antiguidade previsto no contrato ou IRCT. Integra a retribuição horária, logo valoriza horas extra e trabalho noturno.", category: "fixed", editor: "amount", source: "CIRS art. 2.º · CT art. 262.º · CRC art. 46.º" },
  { type: "function_allowance", label: "Subsídio de função", shortLabel: "Função", description: "Complemento associado às funções exercidas.", category: "fixed", editor: "amount", source: "CIRS art. 2.º · CRC art. 46.º" },
  { type: "schedule_exemption", label: "Isenção de horário", shortLabel: "Isenção de horário", description: "Compensação prevista no contrato ou IRCT.", category: "fixed", editor: "amount", source: "CT art. 265.º" },
  { type: "shift_allowance", label: "Subsídio de turno", shortLabel: "Turno", description: "Complemento remuneratório por trabalho por turnos.", category: "fixed", editor: "amount", source: "CIRS art. 2.º · CRC art. 46.º" },
  { type: "commission", label: "Comissões", shortLabel: "Comissões", description: "Remuneração variável por objetivos ou vendas.", category: "variable", editor: "amount", source: "CIRS art. 2.º · CRC art. 46.º" },
  { type: "night_work", label: "Trabalho noturno", shortLabel: "Trabalho noturno", description: "Horas prestadas entre as 22h e as 7h — o acréscimo de 25% é calculado a partir da retribuição horária.", category: "time", editor: "hours", source: "CT arts. 223.º, 266.º e 271.º" },
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
  { type: "travel_national", label: "Ajuda de custo · Portugal", shortLabel: "Ajuda nacional", description: "Dias e valor diário de uma deslocação documentada. Adiciona uma linha por deslocação — o limite isento aplica-se a cada uma.", category: "travel", editor: "travel", source: "CIRS art. 2.º, n.º 3, al. d) · DGAEP" },
  { type: "travel_foreign", label: "Ajuda de custo · estrangeiro", shortLabel: "Ajuda estrangeiro", description: "Dias e valor diário de uma deslocação documentada ao estrangeiro. Uma linha por deslocação.", category: "travel", editor: "travel", source: "CIRS art. 2.º, n.º 3, al. d) · DGAEP" },
  { type: "travel_km", label: "Quilómetros em automóvel próprio", shortLabel: "Quilómetros", description: "Deslocações em serviço no teu carro. O limite isento é por QUILÓMETRO, não por dia, e é o mesmo para toda a gente. Portagens e estacionamento reembolsam-se à parte, contra documento.", category: "travel", editor: "travel", source: "CIRS art. 2.º, n.º 3, al. d) · DL 1/2025" },
  { type: "cash_handling_allowance", label: "Abono para falhas", shortLabel: "Abono para falhas", description: "Devido a quem movimenta numerário no seu trabalho. Não tem um limite em euros: é isento até 5% da remuneração mensal fixa, e só o excesso é tributado.", category: "variable", editor: "amount", source: "CIRS art. 2.º, n.º 3, al. c)" },
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
  "other_taxable",
]);

/**
 * Complementos que, na falta de disposição legal, convencional ou contratual em
 * contrário, integram a base de cálculo das prestações complementares
 * (Art. 262.º, n.º 2, al. a) CT): retribuição base E diuturnidades. É esta a
 * base da retribuição horária que valoriza horas extra, trabalho noturno e
 * descontos por falta — os restantes complementos ficam de fora por omissão,
 * porque depender de IRCT não é o mesmo que estar previsto na lei.
 */
const HOURLY_BASE_TYPES = new Set<PayrollRubricType>(["seniority"]);

/**
 * Complementos FIXOS que integram a «remuneração mensal fixa» do Art. 2.º,
 * n.º 3, al. c) — a base sobre a qual se mede os 5% isentos do abono para
 * falhas. Comissões e prémios ficam de fora por serem variáveis; medir os 5%
 * sobre um mês de boas comissões isentaria um abono que a lei tributa.
 */
const FIXED_PAY_TYPES = new Set<PayrollRubricType>([
  "seniority",
  "function_allowance",
  "schedule_exemption",
  "shift_allowance",
]);

/** Remuneração mensal fixa: vencimento base mais os complementos fixos. */
export function fixedMonthlyPay(baseSalary: number, rubrics: readonly PayrollRubricDraft[]): number {
  return cent(
    positive(baseSalary)
      + rubrics.reduce((total, rubric) => FIXED_PAY_TYPES.has(rubric.type) ? total + positive(rubric.amount) : total, 0),
  );
}

const SUBSIDY_TYPES: readonly PayrollRubricType[] = ["holiday_subsidy", "christmas_subsidy"];

const cent = (value: number) => Math.round(value * 100) / 100;
const positive = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);

/** Complementos com caráter retributivo que integram a retribuição horária. */
export function hourlyBaseComplements(rubrics: readonly PayrollRubricDraft[]): number {
  return cent(
    rubrics.reduce((total, rubric) => HOURLY_BASE_TYPES.has(rubric.type) ? total + positive(rubric.amount) : total, 0),
  );
}

/**
 * Acrescenta os duodécimos estimados quando o utilizador declarou esse modo de
 * pagamento. Um montante manual da mesma natureza prevalece, pois pode incluir
 * componentes retributivas que não conhecemos apenas pelo vencimento base — mas
 * passa a trazer o DIREITO ANUAL a que corresponde, para que a retenção seja a
 * fração do imposto do subsídio completo (Art. 99.º-C, n.º 6) e não a retenção
 * de uma remuneração de 180 €, que é quase sempre zero.
 */
export function includeMonthlyDuodecimos(
  rubrics: readonly PayrollRubricDraft[],
  baseSalary: number,
  enabled: boolean,
): PayrollRubricDraft[] {
  if (!enabled) return [...rubrics];
  const entitlement = cent(positive(baseSalary) + hourlyBaseComplements(rubrics));
  const monthlyPart = cent(entitlement / 12);
  const next = rubrics.map((rubric) =>
    SUBSIDY_TYPES.includes(rubric.type) && rubric.amount > 0 && rubric.entitlement === undefined
      ? { ...rubric, entitlement }
      : rubric,
  );
  for (const type of SUBSIDY_TYPES) {
    if (rubrics.some((rubric) => rubric.type === type && rubric.amount > 0)) continue;
    next.push({
      id: type === "holiday_subsidy" ? "auto-holiday-duodecimo" : "auto-christmas-duodecimo",
      type,
      amount: monthlyPart,
      hours: 0,
      days: 0,
      dailyAmount: 0,
      regularity: "unknown",
      entitlement,
    });
  }
  return next;
}

/**
 * Acréscimo do trabalho noturno de uma rubrica (Art. 266.º CT). Um `amount`
 * prevalece sobre as horas, para quem só conhece o total do recibo (importação
 * de PDF); caso contrário calcula-se a partir das horas e da retribuição
 * horária — que inclui as diuturnidades declaradas.
 */
function nightWorkAmount(
  rubric: PayrollRubricDraft,
  context: PayrollSimulatorContext,
  complements: number,
): number {
  if (positive(rubric.amount) > 0) return positive(rubric.amount);
  return calcularTrabalhoNoturno({
    retribuicaoMensal: positive(context.baseSalary) + complements,
    horasNoturnas: positive(rubric.hours),
    horasSemanais: context.weeklyHours,
  }).valorAcrescimo;
}

/** Deslocação de uma rubrica de ajudas de custo, com o seu limite próprio. */
const TRAVEL_TYPES = new Set<PayrollRubricType>(["travel_national", "travel_foreign", "travel_km"]);

function travelLine(rubric: PayrollRubricDraft): AjudaCustoLinha {
  // Os quilómetros contam-se ao quilómetro, não ao dia: arredondá-los a
  // inteiros como os dias perdia 0,4 km em cada viagem.
  const km = rubric.type === "travel_km";
  return {
    dias: km ? positive(rubric.days) : Math.floor(positive(rubric.days)),
    valorDia: positive(rubric.dailyAmount),
    estrangeiro: rubric.type === "travel_foreign",
    escalao: rubric.travelTier ?? "trabalhador",
    unidade: km ? "km" : "dia",
  };
}

export function buildLegacyPayrollInput(
  context: PayrollSimulatorContext,
  rubrics: readonly PayrollRubricDraft[],
): ReciboMensalInput {
  const overtime = [0, 0, 0, 0, 0, 0];
  const complements = hourlyBaseComplements(rubrics);
  const ajudas: AjudaCustoLinha[] = [];
  let regularAwards = 0;
  let nonRegularAwards = 0;
  let otherSubject = 0;
  let nightWork = 0;
  let cashHandling = 0;
  let holiday = 0;
  let holidayEntitlement = 0;
  let christmas = 0;
  let christmasEntitlement = 0;
  let absenceHours = 0;

  for (const rubric of rubrics) {
    if (FIXED_SUBJECT_TYPES.has(rubric.type)) otherSubject += positive(rubric.amount);
    else if (rubric.type === "performance_award") {
      if (rubric.regularity === "regular") regularAwards += positive(rubric.amount);
      else nonRegularAwards += positive(rubric.amount);
    } else if (rubric.type === "holiday_subsidy") {
      holiday += positive(rubric.amount);
      holidayEntitlement += Math.max(positive(rubric.amount), positive(rubric.entitlement ?? 0));
    } else if (rubric.type === "christmas_subsidy") {
      christmas += positive(rubric.amount);
      christmasEntitlement += Math.max(positive(rubric.amount), positive(rubric.entitlement ?? 0));
    } else if (rubric.type === "unpaid_absence") absenceHours += positive(rubric.hours);
    else if (rubric.type === "cash_handling_allowance") cashHandling += positive(rubric.amount);
    else if (TRAVEL_TYPES.has(rubric.type)) {
      ajudas.push(travelLine(rubric));
    } else if (rubric.type === "night_work") {
      nightWork += nightWorkAmount(rubric, context, complements);
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
    dependentesDeficientes: Math.max(0, Math.floor(context.dependantsWithDisability ?? 0)),
    fatorDependenteDeficiente: context.disabilityFactor,
    conjugeDeficiente: context.spouseDisability,
    regiao: context.region,
    taxaRetencaoOpcional: context.optionalWithholdingRate,
    regimeEntidade: context.employerRegime,
    irsJovemAno: context.youthIrsBenefitYear,
    horasSemanais: Math.max(1, context.weeklyHours),
    complementosRetributivos: complements,
    subsidioRefeicaoDia: context.meal.enabled ? positive(context.meal.dailyAmount) : 0,
    subsidioRefeicaoCartao: context.meal.card,
    diasSubsidio: context.meal.enabled ? Math.max(0, Math.floor(context.meal.days)) : 0,
    horasAusencia: absenceHours,
    horasSuplementares: overtime,
    premio: nonRegularAwards,
    premioRegular: false,
    subsidioFerias: holiday,
    subsidioFeriasDireitoTotal: holidayEntitlement,
    subsidioNatal: christmas,
    subsidioNatalDireitoTotal: christmasEntitlement,
    outrosRendimentosSujeitos: otherSubject + regularAwards + nightWork,
    abonoFalhas: cashHandling,
    remuneracaoFixaMensal: fixedMonthlyPay(context.baseSalary, rubrics),
    ajudas,
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
  context: PayrollSimulatorContext,
  result: ReciboMensalResult,
  overtimeShares: ReadonlyMap<string, number>,
  complements: number,
): { amount: number; irsBase: number; ssBase: number; treatment: PayrollDisplayLine["treatment"]; bucket: PayrollDisplayLine["bucket"]; detail?: string } {
  const index = OVERTIME_INDEX[rubric.type];
  if (index !== undefined) {
    // A parte DESTA linha no total do segmento. Atribuir o total agregado a
    // cada linha do mesmo segmento duplicava o valor no detalhe e no PDF, com
    // o cartão principal a mostrar o número certo.
    const amount = overtimeShares.get(rubric.id) ?? 0;
    return { amount, irsBase: amount, ssBase: amount, treatment: "subject", bucket: "overtime", detail: `${positive(rubric.hours)} h` };
  }
  if (rubric.type === "unpaid_absence") {
    return { amount: 0, irsBase: 0, ssBase: 0, treatment: "deduction", bucket: "normal", detail: `${positive(rubric.hours)} h` };
  }
  if (TRAVEL_TYPES.has(rubric.type)) {
    const linha = travelLine(rubric);
    const km = linha.unidade === "km";
    const limit = limiteDaLinha(linha);
    const amount = cent(linha.dias * linha.valorDia);
    const exempt = cent(linha.dias * Math.min(linha.valorDia, limit));
    const taxable = cent(amount - exempt);
    const unidades = km
      ? `${linha.dias.toLocaleString("pt-PT")} km · limite ${eur(limit)}/km`
      : `${linha.dias} dia${linha.dias === 1 ? "" : "s"} · limite ${eur(limit)}/dia`;
    return {
      amount,
      irsBase: taxable,
      ssBase: taxable,
      treatment: taxable <= 0 ? "exempt" : exempt > 0 ? "partial" : "subject",
      bucket: "normal",
      detail: `${unidades} · ${eur(exempt)} isentos`,
    };
  }
  if (rubric.type === "cash_handling_allowance") {
    // O limite não é um valor em euros: é 5% da remuneração mensal FIXA. Por
    // isso a linha diz sempre qual foi a base, ou o número parece arbitrário.
    const amount = positive(rubric.amount);
    const exempt = cent(Math.min(amount, result.abonoFalhasLimite));
    const taxable = cent(amount - exempt);
    return {
      amount,
      irsBase: taxable,
      ssBase: taxable,
      treatment: taxable <= 0 ? "exempt" : exempt > 0 ? "partial" : "subject",
      bucket: "normal",
      detail: `isento até ${eur(result.abonoFalhasLimite)} (${pctExato(ABONO_PARA_FALHAS.value)} da remuneração fixa) · ${eur(exempt)} isentos`,
    };
  }
  if (rubric.type === "night_work") {
    // Lê-se do MESMO apuramento que entrou no motor. Antes lia-se `amount`, que
    // fica a zero quando o utilizador declara horas: a rubrica contava para o
    // bruto e desaparecia do detalhe, do PDF e do CSV.
    const amount = cent(nightWorkAmount(rubric, context, complements));
    return {
      amount,
      irsBase: amount,
      ssBase: amount,
      treatment: "subject",
      bucket: "normal",
      detail: positive(rubric.amount) > 0
        ? "acréscimo declarado"
        : `${positive(rubric.hours)} h × ${result.retribuicaoHoraria.toFixed(2)} € × 25%`,
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
  const entitlement = positive(rubric.entitlement ?? 0);
  const fractionDetail = entitlement > amount
    ? `fração de um direito anual de ${eur(entitlement)}`
    : undefined;
  if (rubric.type === "holiday_subsidy") return { amount, irsBase: amount, ssBase: amount, treatment: "subject", bucket: "holiday", detail: fractionDetail };
  if (rubric.type === "christmas_subsidy") return { amount, irsBase: amount, ssBase: amount, treatment: "subject", bucket: "christmas", detail: fractionDetail };
  if (HOURLY_BASE_TYPES.has(rubric.type)) {
    return { amount, irsBase: amount, ssBase: amount, treatment: "subject", bucket: "normal", detail: "integra a retribuição horária (CT art. 262.º)" };
  }
  return { amount, irsBase: amount, ssBase: amount, treatment: "subject", bucket: "normal" };
}

/** Reparte `total` pelos pesos indicados, ao cêntimo e sem perder o resto. */
function allocateByWeights(total: number, weights: readonly number[]): number[] {
  const base = weights.reduce((sum, value) => sum + value, 0);
  if (Math.abs(base) < 0.00001 || Math.abs(total) < 0.00001) return weights.map(() => 0);
  const lastWeightedIndex = weights.reduce((last, weight, index) => Math.abs(weight) > 0.00001 ? index : last, -1);
  let usedCents = 0;
  const totalCents = Math.round(total * 100);
  return weights.map((weight, index) => {
    if (Math.abs(weight) <= 0.00001) return 0;
    if (index === lastWeightedIndex) return (totalCents - usedCents) / 100;
    const cents = Math.round(totalCents * weight / base);
    usedCents += cents;
    return cents / 100;
  });
}

function allocate(total: number, lines: readonly MutableLine[], select: (line: MutableLine) => number): number[] {
  return allocateByWeights(total, lines.map(select));
}

/**
 * Valor de cada linha de trabalho suplementar dentro do seu segmento. O motor
 * apura o total do segmento a partir das horas somadas; aqui devolve-se a esse
 * total a proporção de horas de cada linha, para que a soma das rubricas
 * continue a ser exatamente o bruto.
 */
function overtimeSharesByRubric(
  rubrics: readonly PayrollRubricDraft[],
  overtimeDetails: ReciboMensalResult["suplementarDetalhe"],
): Map<string, number> {
  const shares = new Map<string, number>();
  const bySegment = new Map<number, PayrollRubricDraft[]>();
  for (const rubric of rubrics) {
    const index = OVERTIME_INDEX[rubric.type];
    if (index === undefined) continue;
    const list = bySegment.get(index) ?? [];
    list.push(rubric);
    bySegment.set(index, list);
  }
  for (const [index, list] of bySegment) {
    const total = overtimeDetails[index]?.valor ?? 0;
    allocateByWeights(total, list.map((rubric) => positive(rubric.hours))).forEach((value, position) => {
      shares.set(list[position].id, value);
    });
  }
  return shares;
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

  const overtimeShares = overtimeSharesByRubric(rubrics, result.suplementarDetalhe);
  const complements = hourlyBaseComplements(rubrics);
  for (const rubric of rubrics) {
    if (rubric.type === "unpaid_absence") continue; // consolidada na linha real apurada
    const values = rubricAmount(rubric, context, result, overtimeShares, complements);
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
      mutable[mutable.length - 1].detail = "duodécimo estimado sobre a retribuição mensal";
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
      detail: `${context.meal.days} dias · ${eur(result.subsidioRefeicaoIsento)} isentos`,
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
    // O trabalho noturno aceita horas OU um acréscimo já apurado; exigir horas
    // marcaria como incompleta uma linha vinda de um recibo importado.
    if (meta.editor === "hours" && rubric.hours <= 0 && !(rubric.type === "night_work" && rubric.amount > 0)) {
      issues.push(`${meta.label}: indique as horas.`);
    }
    if (meta.editor === "travel" && (rubric.days <= 0 || rubric.dailyAmount <= 0)) issues.push(`${meta.label}: indique dias e valor diário.`);
    if (meta.editor === "award") {
      if (rubric.amount <= 0) issues.push(`${meta.label}: indique um montante.`);
      if (rubric.regularity === "unknown") issues.push(`${meta.label}: confirme se existe caráter regular para a Segurança Social.`);
    }
  }
  return issues;
}

/** Período normal de trabalho semanal aceite (Art. 203.º CT: máximo 40 h). */
export const WEEKLY_HOURS_RANGE = { min: 1, max: 40 } as const;

/**
 * Valida o horário semanal em vez de recuar em silêncio para 40 h. Um campo a
 * zero produzia um valor horário calculado sobre 40 h sem o dizer: o número
 * visível e o número usado eram diferentes.
 */
export function validateContext(context: PayrollSimulatorContext): string[] {
  const issues: string[] = [];
  const hours = context.weeklyHours;
  if (!Number.isFinite(hours) || hours < WEEKLY_HOURS_RANGE.min || hours > WEEKLY_HOURS_RANGE.max) {
    issues.push(
      `Horas por semana: indique um período normal de trabalho entre ${WEEKLY_HOURS_RANGE.min} e ${WEEKLY_HOURS_RANGE.max} horas (CT art. 203.º).`,
    );
  }
  return issues;
}

/**
 * Custo salarial direto da entidade empregadora.
 *
 * Lê o número que o motor já apurou em vez de o recalcular. Enquanto a fórmula
 * viveu aqui duplicada, a taxa da entidade estava presa ao regime geral: uma
 * IPSS via o custo de uma empresa comum e nada no ecrã dizia porquê.
 */
export function employerCost(result: ReciboMensalResult): number {
  return result.custoEmpresa;
}

/** Taxa contributiva patronal do regime, para a UI a poder mostrar e explicar. */
export function employerRate(regime: RegimeEntidade = "geral"): number {
  return taxaEntidadeDoRegime(regime);
}

export function mealLimit(card: boolean): number {
  return card ? SUBSIDIO_REFEICAO.cartao.value : SUBSIDIO_REFEICAO.dinheiro.value;
}
