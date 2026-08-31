import type { ISODate, MissingInput, TraceStep } from "../../core/model";
import type { Money, Rate } from "../../core/money";
import type {
  PayrollEmployee,
  PayrollResult,
  RoutedBenefitKind,
} from "../payroll/types";
import type { CapacityResult } from "./capacity";
import type { CashCalendarMonth } from "./calendar";
import type {
  CostKnowledge,
  CostSummary,
  EmploymentDecisionStatus,
} from "./completeness";
import type { WorkCalendarResult } from "./work-calendar";

export type PlannerGoal =
  | "employer_budget"
  | "target_net"
  | "known_offer"
  | "required_capacity";

/**
 * Nível da projeção do líquido. Deixou de haver «exact»: um conjunto
 * incompleto de factos fiscais nunca produz um valor exato, produz uma
 * projeção personalizada (relatório, CON-P0-17).
 */
export type ProjectionLevel = "personalized_projection" | "reference_scenarios";

export type SubsidyPayment = "normal" | "duodecimos";

/**
 * Enquadramento contributivo da entidade. A taxa nunca é inferida pelo nome:
 * ou o regime é declarado e suportado, ou o motor recusa em vez de
 * aproximar (relatório, CON-P0-08).
 */
export type EmployerContributionRegime = "regime_geral" | "outro" | "nao_sei";

/**
 * Regime de tempo de trabalho. Os limites são os do Código do Trabalho:
 * 8 h/dia e 40 h/semana no regime normal (artigo 203.º, n.º 1); 10 h e 50 h na
 * adaptabilidade individual (artigo 205.º); 12 h e 60 h na adaptabilidade por
 * regulamentação coletiva (artigo 204.º, n.º 1).
 */
export type WorkingTimeRegime =
  | "standard"
  | "adaptability_individual"
  | "adaptability_collective";

export interface WorkingTimeLimits {
  dailyHoursHundredths: number;
  weeklyHoursHundredths: number;
  citation: string;
}

export interface EmployerFacts {
  /** Orçamento anual máximo, já com todos os custos do posto. */
  annualBudget?: Money;
  /** Parte do orçamento que fica intocável. Zero por omissão. */
  safetyMargin?: Rate;
  contributionRegime: EmployerContributionRegime;
}

export type ContractKind = "permanent" | "fixed_term" | "unknown";

export interface RoleFacts {
  title?: string;
  /** Data de entrada real. Substitui o mês solto que prendia tudo a 2026-08. */
  startDate: ISODate;
  contractEndDate?: ISODate;
  contractKind: ContractKind;
  /** Dias da semana contratados: 1 = segunda … 7 = domingo. */
  workingWeekdays: readonly number[];
  weeklyHoursHundredths: number;
  workingTimeRegime: WorkingTimeRegime;
  /** IRCT aplicável. Desconhecido é um risco declarado, não uma inexistência. */
  collectiveAgreement: { status: "unknown" } | { status: "none" } | { status: "declared"; name: string };
  jurisdiction: PayrollEmployee["jurisdiction"];
  /** Feriado municipal do local de trabalho, quando conhecido. */
  municipalHoliday?: ISODate;
  /** Mês do gozo principal de férias — comanda o subsídio de férias. */
  mainVacationMonth: number;
  productive: boolean;
  /** Fração das horas disponíveis que é realmente faturável. */
  productiveShare?: Rate;
  /** Horas de formação contínua do ano (CT, artigo 131.º: mínimo 40 h). */
  annualTrainingHoursHundredths?: number;
  /** Horas de integração no arranque. */
  onboardingHoursHundredths?: number;
}

export interface MealAllowanceOffer {
  dailyAmount: Money;
  method: "cash" | "card_or_voucher";
  /**
   * Dias por mês declarados pela empresa. Quando ausente, o motor usa os dias
   * elegíveis do calendário laboral em vez de assumir 22 × 12.
   */
  daysPerMonth?: number;
}

export interface EmploymentBenefitOffer {
  id: string;
  label: string;
  kind: RoutedBenefitKind;
  /** Valor fiscal mensal, quando a rubrica o exige. */
  monthlyTaxValue?: Money;
  /** Custo económico anual suportado pela empresa. */
  employerAnnualCost: Money;
  facts?: Readonly<Record<string, string | number | boolean>>;
}

export interface CompensationPackage {
  baseSalaryMonthly: Money;
  subsidyPayment: SubsidyPayment;
  fixedMonthlyBonus?: Money;
  variableAnnualBonus?: Money;
  /** Sem esta classificação o motor não presume incidência contributiva. */
  variableBonusSocialSecurityRegularity?: "regular" | "not_regular" | "unknown";
  mealAllowance?: MealAllowanceOffer;
  benefits?: readonly EmploymentBenefitOffer[];
  /** Mês de pagamento do prémio anual. Dezembro por omissão declarada. */
  bonusMonth?: number;
}

/**
 * Custos do posto. Todas as parcelas são obrigatórias em ESTADO — não em
 * valor: o formulário tem de dizer se confirma, estima, exclui ou desconhece.
 * É a tradução em tipo do invariante «um custo desconhecido não é zero».
 */
export interface PostCosts {
  accidentInsurance: CostKnowledge;
  healthAndSafety: CostKnowledge;
  training: CostKnowledge;
  equipmentFirstYear: CostKnowledge;
  recruitmentFirstYear: CostKnowledge;
  software: CostKnowledge;
  remoteWork: CostKnowledge;
  other: CostKnowledge;
}

export interface CandidateTaxFacts extends PayrollEmployee {
  /** Confirma que estes factos foram cedidos para esta estimativa. */
  authorizationConfirmed: boolean;
}

export interface CapacityFacts {
  /** Preço de venda por hora produtiva. */
  pricePerProductiveHour?: Money;
  /** Margem de contribuição da receita, em ppm. */
  contributionMargin?: Rate;
  expectedBillableHoursMonthly?: number;
}

export interface HiringSupportFacts {
  registeredUnemployed?: boolean;
  permanentContract?: boolean;
  fullTime?: boolean;
  applicationBeforeContract?: boolean;
  candidateAge?: number;
  qualificationLevel?: number;
  monthlyBaseSalary?: Money;
}

export interface EmploymentOfferInput {
  period: `${number}-${number}`;
  policyDate: ISODate;
  goal: PlannerGoal;
  employer: EmployerFacts;
  role: RoleFacts;
  package: CompensationPackage;
  postCosts: PostCosts;
  /** Obrigatório apenas no objetivo target_net. */
  targetNetMonthly?: Money;
  candidate?: CandidateTaxFacts;
  capacity?: CapacityFacts;
  supportFacts?: HiringSupportFacts;
  /** Revisão explícita da pessoa: é o que autoriza o estado «validado». */
  review?: { reviewedAt: ISODate };
}

export interface EmployerCostBreakdown {
  cashCompensation: Money;
  mealAllowance: Money;
  employerSocialSecurity: Money;
  benefits: Money;
  accidentInsurance: Money;
  healthAndSafety: Money;
  training: Money;
  equipment: Money;
  recruitment: Money;
  software: Money;
  remoteWork: Money;
  other: Money;
}

export interface EmployerCostResult {
  /** Ano recorrente, sem custos de arranque. */
  annualStabilized: Money;
  monthlyAverageStabilized: Money;
  /** Ano civil da entrada. */
  firstCalendarYear: Money;
  /** Doze primeiros meses do vínculo, que atravessam dois anos civis. */
  firstTwelveMonths: Money;
  firstCalendarYearMonthlyAverage: Money;
  monthsWorkedFirstYear: number;
  /** Mês mais pesado dos doze primeiros e a razão do pico. */
  peakMonth: { year: number; month: number; amount: Money; labels: readonly string[] } | null;
  budget?: Money;
  effectiveBudget?: Money;
  budgetHeadroom?: Money;
  /** Intervalo do custo anual com estimativas e lacunas incluídas. */
  annualRange: { low: Money; high: Money };
  /** Só o que foi mesmo confirmado. */
  annualConfirmed: Money;
  breakdown: EmployerCostBreakdown;
  postCostSummary: CostSummary;
}

export interface PersonalizedWorkerOutcome {
  kind: "personalized_projection";
  monthlyReference: Money;
  annualNet: Money;
  annualGross: Money;
  annualEmployeeSocialSecurity: Money;
  annualIrsWithheld: Money;
  profile: PayrollEmployee;
}

export interface ReferenceScenarioOutcome {
  kind: "reference_scenarios";
  monthlyReference: { min: Money; max: Money };
  annualNet: { min: Money; max: Money };
  annualGross: Money;
  annualEmployeeSocialSecurity: Money;
  annualIrsWithheld: { min: Money; max: Money };
  profilesEvaluated: number;
  /** Os cenários avaliados, nomeados. Não são um envelope universal. */
  scenarioLabels: readonly string[];
}

export type WorkerOutcome = PersonalizedWorkerOutcome | ReferenceScenarioOutcome;

export interface PublicChargesResult {
  employerSocialSecurity: Money;
  employeeSocialSecurity: Money;
  irsWithheld: Money | { min: Money; max: Money };
  total: Money | { min: Money; max: Money };
}

export type SupportAssessmentStatus =
  | "potential"
  | "needs_input"
  | "not_applicable"
  | "window_closed";

export interface SupportAssessment {
  id: string;
  name: string;
  status: SupportAssessmentStatus;
  explanation: string;
  sourceUrl: string;
  verifiedAt: ISODate;
  applicationWindow?: { from: ISODate; to: ISODate };
  missingFacts: readonly string[];
  /** Nunca é abatido automaticamente ao custo. */
  conditionalOnly: true;
}

export interface Assumption {
  id: string;
  label: string;
  detail: string;
  severity: "info" | "estimate" | "blocking";
}

export interface EmploymentOfferResult {
  /** O estado que autoriza — ou proíbe — qualquer veredicto. */
  status: EmploymentDecisionStatus;
  projection: ProjectionLevel;
  goal: PlannerGoal;
  resolvedBaseSalaryMonthly: Money;
  employerCost: EmployerCostResult;
  workerOutcome: WorkerOutcome;
  publicCharges: PublicChargesResult;
  calendar: readonly CashCalendarMonth[];
  workCalendar: WorkCalendarResult;
  capacity?: CapacityResult;
  supports: readonly SupportAssessment[];
  assumptions: readonly Assumption[];
  missingFacts: readonly MissingInput[];
  trace: readonly TraceStep[];
  citations: readonly string[];
  engineVersion: string;
  policyDate: ISODate;
  /** Resultado mensal de referência para memória de cálculo. */
  referencePayroll: PayrollResult;
}

export type EmploymentOfferPreparation =
  | { kind: "ready"; result: EmploymentOfferResult }
  | { kind: "needs_input"; missing: readonly MissingInput[]; trace: readonly TraceStep[] }
  | { kind: "unsupported"; reasons: readonly string[]; trace: readonly TraceStep[] }
  | { kind: "conflict"; reasons: readonly string[]; trace: readonly TraceStep[] };
