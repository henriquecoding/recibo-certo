import type { ISODate, MissingInput, TraceStep } from "../../core/model";
import type { Money, Rate } from "../../core/money";
import type { SupportFactSheet, WorkingTimeBasis } from "../../releases/types";
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
 * Regime de tempo de trabalho.
 *
 * O erro que este tipo passou a impedir (MOT-P0-007): 50 h e 60 h eram
 * aceites como período normal PERMANENTE do posto, e entravam nas horas
 * pagas e na capacidade. Não são. O período normal continua a ser o do
 * artigo 203.º (8 h/dia, 40 h/semana); a adaptabilidade só autoriza um
 * ACRÉSCIMO em semanas determinadas, compensado dentro de um período de
 * referência, com fundamento escrito ou IRCT, e com a média — incluindo
 * trabalho suplementar — a não exceder 48 h (artigos 204.º, 205.º, 207.º
 * e 211.º).
 */
export type WorkingTimeRegime =
  | "standard"
  | "adaptability_individual"
  | "adaptability_collective";

export interface WorkingTimeArrangement {
  /** Período normal contratado. É a média, nunca o pico. */
  normalWeeklyHoursHundredths: number;
  /** Dias da semana contratados: 1 = segunda … 7 = domingo. */
  workingWeekdays: readonly number[];
  regime: WorkingTimeRegime;
  /** Sem fundamento admissível não há adaptabilidade que se declare. */
  basis: WorkingTimeBasis;
  /** Limite das semanas de acréscimo, quando há adaptabilidade. */
  peakWeeklyHoursHundredths?: number;
  /** Período de referência da compensação, em meses. */
  referencePeriodMonths?: number;
  /** Trabalho suplementar médio previsto por semana. Conta para as 48 h. */
  expectedOvertimeWeeklyHoursHundredths?: number;
}

export interface WorkingTimeAssessment {
  /** Horas pagas por semana: o período normal, não o pico. */
  paidWeeklyHoursHundredths: number;
  /** Média semanal incluindo trabalho suplementar previsto. */
  averageWeeklyHoursHundredths: number;
  partTime: boolean;
  /** Fração do tempo completo, em ppm — comanda o piso proporcional. */
  fullTimeFraction: Rate;
  citations: readonly string[];
}

// ─── Piso remuneratório ────────────────────────────────────────────────────

/**
 * Resultado do gate do piso legal. `unconfirmed` não é «cumpre»: sem IRCT
 * identificado, o motor não afirma conformidade salarial (MOT-P0-006).
 */
export type MinimumWageVerdict =
  | {
      kind: "meets_floor";
      floor: Money;
      statutoryFloor: Money;
      basis: string;
      sourceIds: readonly string[];
      /** Verdadeiro só quando o piso convencional foi confirmado. */
      collectiveFloorConfirmed: boolean;
    }
  | {
      kind: "below_floor";
      floor: Money;
      statutoryFloor: Money;
      offered: Money;
      basis: string;
      sourceIds: readonly string[];
    }
  | {
      kind: "legal_floor_unconfirmed";
      statutoryFloor: Money;
      offered: Money;
      reason: string;
      sourceIds: readonly string[];
    };

export interface EmployerFacts {
  /** Orçamento anual máximo, já com todos os custos do posto. */
  annualBudget?: Money;
  /** Parte do orçamento que fica intocável. Zero por omissão. */
  safetyMargin?: Rate;
  contributionRegime: EmployerContributionRegime;
}

export type ContractKind = "permanent" | "fixed_term" | "unknown";

/**
 * Contexto legal e temporal da simulação.
 *
 * Estas datas NÃO são intercambiáveis (MOT-P0-003, MOT-P0-004). Uma lei pode
 * ser publicada em fevereiro com efeitos a janeiro; a tabela de retenção
 * aplica-se à data de pagamento; as férias dependem do vínculo; uma
 * candidatura depende do dia da oferta. Antes, tudo isto era um `period`
 * fixo em `2026-08` e uma data de entrada que caía em silêncio para
 * `2026-01-01` quando o formulário trazia lixo.
 */
export interface EmploymentSimulationContext {
  /** Conhecimento regulamentar disponível. */
  simulationAsOf: ISODate;
  /** Mês a que a remuneração respeita. */
  workPeriod: `${number}-${number}`;
  /** Data de pagamento — comanda a tabela de retenção. */
  payDate: ISODate;
  contractStart: ISODate;
  contractEnd?: ISODate;
  /** Jurisdição do LOCAL DE TRABALHO: é ela que fixa a RMMG e os feriados. */
  jurisdiction: PayrollEmployee["jurisdiction"];
}

export interface RoleFacts {
  title?: string;
  contractKind: ContractKind;
  workingTime: WorkingTimeArrangement;
  /** IRCT aplicável. Desconhecido é um risco declarado, não uma inexistência. */
  collectiveAgreement:
    | { status: "unknown" }
    | { status: "none" }
    | { status: "declared"; name: string; minimumMonthly?: Money };
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

export interface EmploymentOfferInput {
  context: EmploymentSimulationContext;
  goal: PlannerGoal;
  employer: EmployerFacts;
  role: RoleFacts;
  package: CompensationPackage;
  postCosts: PostCosts;
  /** Obrigatório apenas no objetivo target_net. */
  targetNetMonthly?: Money;
  candidate?: CandidateTaxFacts;
  capacity?: CapacityFacts;
  supportFacts?: SupportFactSheet;
  /**
   * Revisão explícita da pessoa sobre os DADOS QUE INTRODUZIU. Não é
   * aprovação da política nem validação fiscal — três coisas diferentes que
   * a copy tinha fundido numa só (MOT-P0-002).
   */
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

/**
 * Estados da triagem. `potential` significa apenas «compatível com os factos
 * declarados»: não é candidatura aberta, não é dotação disponível e não é
 * aprovação. Só um apoio aprovado poderia entrar em caixa — e mesmo esse
 * nunca reduz o custo bruto do posto (relatório, §8.9).
 */
export type SupportAssessmentStatus =
  | "potential"
  | "needs_input"
  | "not_applicable"
  | "window_closed";

export interface SupportRequirementVerdict {
  key: string;
  subject: "employer" | "candidate" | "contract" | "chronology";
  label: string;
  detail: string;
  outcome: "met" | "unmet" | "unknown";
  /** Razão da recusa ou pergunta em falta, na voz de quem lê. */
  message?: string;
}

export interface SupportAssessment {
  id: string;
  name: string;
  authority: string;
  programVersion: string;
  status: SupportAssessmentStatus;
  explanation: string;
  sourceUrl: string;
  sourceIds: readonly string[];
  verifiedAt: ISODate;
  applicationWindow: { from: ISODate; to: ISODate };
  /** A dotação esgota antes do fim da janela e não é publicada em tempo real. */
  budgetStatus: "unknown" | "open" | "exhausted";
  baseAmount: Money;
  baseAmountBasis: string;
  /** Montante máximo com todas as majorações admitidas pela medida. */
  maxAmountWithMajorations: Money;
  majorations: readonly { id: string; label: string; detail: string }[];
  maintenanceMonths: number;
  clawback: string;
  requirements: readonly SupportRequirementVerdict[];
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
  /** Proveniência: que release produziu este resultado e em que estado. */
  provenance: ResultProvenance;
  /** Verificação do piso legal da oferta. Corre antes de qualquer payroll. */
  minimumWage: MinimumWageVerdict;
  workingTime: WorkingTimeAssessment;
  /** Direito, gozo e transporte de férias, separados. */
  vacation: VacationEntitlement;
  /** Resultado mensal de referência para memória de cálculo. */
  referencePayroll: PayrollResult;
}

/**
 * Proveniência do resultado. A copy pública deriva daqui — nenhuma frase de
 * confiança pode ser escrita à mão num componente (MOT-P0-002).
 */
export interface ResultProvenance {
  releaseId: string;
  releaseStatus: "draft" | "reviewed" | "approved" | "retired";
  knowledgeAsOf: ISODate;
  effective: { from: ISODate; to: ISODate };
  jurisdiction: PayrollEmployee["jurisdiction"];
  /** Cobertura declarada domínio a domínio, sem selo global. */
  coverage: Readonly<Record<string, "approved" | "reviewed" | "draft" | "unsupported">>;
  approvals: readonly { role: string; by: string; at: ISODate }[];
  /** A política foi aprovada por revisão profissional independente? */
  policyApproved: boolean;
  /** A pessoa reviu os dados que introduziu? Não é o mesmo. */
  userReviewedInputs: boolean;
  /** O cálculo é reproduzível a partir do input e do release? */
  calculationReproducible: boolean;
}

export interface VacationEntitlement {
  /** Dias úteis adquiridos no ano da admissão (CT, artigo 239.º, n.º 1). */
  admissionYearAccruedWorkdays: number;
  /** Data a partir da qual podem ser gozados: seis meses completos. */
  earliestLeaveDate: ISODate;
  /** Dias que a lei permite gozar DENTRO do ano da admissão. */
  admissionYearUsableWorkdays: number;
  /** Saldo que transita para o ano seguinte. */
  carriedOverWorkdays: number;
  /** Prazo-limite do gozo transportado (CT, artigo 239.º, n.º 2). */
  carryOverDeadline?: ISODate;
  /** Dias do ano seguinte: os 22 do artigo 238.º mais o saldo, com teto. */
  secondYearWorkdays: number;
  citations: readonly string[];
}

export type EmploymentOfferPreparation =
  | { kind: "ready"; result: EmploymentOfferResult }
  | { kind: "needs_input"; missing: readonly MissingInput[]; trace: readonly TraceStep[] }
  | { kind: "unsupported"; reasons: readonly string[]; trace: readonly TraceStep[] }
  | { kind: "conflict"; reasons: readonly string[]; trace: readonly TraceStep[] };

export type { SupportFactSheet, WorkingTimeBasis };
