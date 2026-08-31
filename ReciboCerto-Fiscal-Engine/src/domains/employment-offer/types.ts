import type { ISODate, MissingInput, TraceStep } from "../../core/model";
import type { Money, Rate } from "../../core/money";
import type {
  PayrollEmployee,
  PayrollResult,
  RoutedBenefitKind,
} from "../payroll/types";

export type PlannerGoal =
  | "employer_budget"
  | "target_net"
  | "known_offer"
  | "required_capacity";

export type ResultCertainty = "exact" | "range" | "needs_input" | "unsupported";

export type SubsidyPayment = "normal" | "duodecimos";

export interface EmployerFacts {
  /** Orçamento anual máximo, já com todos os custos do posto. */
  annualBudget?: Money;
  /** Parte do orçamento que fica intocável. Zero por omissão. */
  safetyMargin?: Rate;
}

export interface RoleFacts {
  title?: string;
  /** Janeiro = 1, dezembro = 12. */
  startMonth: number;
  weeklyHoursHundredths: number;
  jurisdiction: PayrollEmployee["jurisdiction"];
  productive: boolean;
  /** Fração das horas disponíveis que é realmente faturável. */
  productiveShare?: Rate;
  annualVacationHoursHundredths?: number;
  annualTrainingHoursHundredths?: number;
}

export interface MealAllowanceOffer {
  dailyAmount: Money;
  daysPerMonth: number;
  method: "cash" | "card_or_voucher";
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
}

export interface PostCosts {
  accidentInsuranceAnnual?: Money;
  healthAndSafetyAnnual?: Money;
  trainingAnnual?: Money;
  equipmentFirstYear?: Money;
  otherAnnual?: Money;
}

export interface CandidateTaxFacts extends PayrollEmployee {
  /** Confirma que estes factos foram cedidos para esta estimativa. */
  authorizationConfirmed: boolean;
}

export interface CapacityFacts {
  /** Preço líquido/margem por hora produtiva. */
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
  other: Money;
}

export interface EmployerCostResult {
  annualStabilized: Money;
  monthlyAverageStabilized: Money;
  firstYear: Money;
  firstYearMonthlyAverage: Money;
  monthsWorkedFirstYear: number;
  budget?: Money;
  budgetHeadroom?: Money;
  breakdown: EmployerCostBreakdown;
}

export interface ExactWorkerOutcome {
  kind: "exact";
  monthlyReference: Money;
  annualNet: Money;
  annualGross: Money;
  annualEmployeeSocialSecurity: Money;
  annualIrsWithheld: Money;
  profile: PayrollEmployee;
}

export interface WorkerOutcomeRange {
  kind: "range";
  monthlyReference: { min: Money; max: Money };
  annualNet: { min: Money; max: Money };
  annualGross: Money;
  annualEmployeeSocialSecurity: Money;
  annualIrsWithheld: { min: Money; max: Money };
  profilesEvaluated: number;
}

export type WorkerOutcome = ExactWorkerOutcome | WorkerOutcomeRange;

export interface PublicChargesResult {
  employerSocialSecurity: Money;
  employeeSocialSecurity: Money;
  irsWithheld: Money | { min: Money; max: Money };
  total: Money | { min: Money; max: Money };
}

export interface CashCalendarMonth {
  month: number;
  active: boolean;
  labels: readonly string[];
  employerCost: Money;
  workerNet: Money | { min: Money; max: Money };
  publicCharges: Money | { min: Money; max: Money };
}

export interface CapacityResult {
  annualAvailableHoursHundredths: number;
  annualProductiveHoursHundredths: number;
  costPerProductiveHour: Money | null;
  revenueRequired: Money | null;
  billableHoursRequired: number | null;
  expectedAnnualBillableHours: number | null;
  capacityGapHours: number | null;
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
  certainty: Exclude<ResultCertainty, "needs_input" | "unsupported">;
  goal: PlannerGoal;
  resolvedBaseSalaryMonthly: Money;
  employerCost: EmployerCostResult;
  workerOutcome: WorkerOutcome;
  publicCharges: PublicChargesResult;
  calendar: readonly CashCalendarMonth[];
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

