import type { FiscalWarning, MissingInput, PortugueseJurisdiction, TraceStep } from "../../core/model";
import type { Money, Rate } from "../../core/money";

export type PayrollLineId = string;

export type PayrollTaxBucket =
  | "normal_monthly"
  | "overtime_autonomous"
  | "holiday_subsidy_autonomous"
  | "christmas_subsidy_autonomous"
  | "prior_years";

export interface PayrollEmployee {
  dependants: number;
  maritalStatus: "not_married" | "married_single_holder" | "married_two_holders";
  disability: boolean;
  jurisdiction: PortugueseJurisdiction;
  /** Só deve ser preenchido depois de o trabalhador invocar o regime ao empregador. */
  youthIrs?: { benefitYear: number; invokedWithEmployer: boolean };
}

interface PayrollLineBase {
  id: PayrollLineId;
  label: string;
}

export type FixedTaxableKind =
  | "base_salary"
  | "seniority"
  | "function_allowance"
  | "shift_allowance"
  | "schedule_exemption"
  | "commission"
  | "holiday_pay"
  | "other_taxable";

export interface FixedTaxableLine extends PayrollLineBase {
  kind: FixedTaxableKind;
  amount: Money;
}

export interface PerformanceAwardLine extends PayrollLineBase {
  kind: "performance_award";
  amount: Money;
  /** A incidência de SS depende da regularidade objetiva do artigo 47.º do CRC. */
  socialSecurityRegularity: "regular" | "not_regular" | "unknown";
}

export interface SubsidyLine extends PayrollLineBase {
  kind: "holiday_subsidy" | "christmas_subsidy";
  amountPaid: Money;
  /** Valor total do subsídio usado para determinar a taxa quando o pagamento é fracionado. */
  fullEntitlement: Money;
}

export type OvertimeSegment =
  | "working_day_first_hour"
  | "working_day_following"
  | "rest_day_or_holiday";

export interface OvertimeLine extends PayrollLineBase {
  kind: "overtime";
  hoursHundredths: number;
  segment: OvertimeSegment;
  /** Total anual antes destas horas; decide o patamar até/acima de 100 horas. */
  annualHoursBeforeHundredths: number;
  /** Só usar quando um IRCT aplicável substitui o acréscimo legal. */
  collectiveAgreementPremium?: Rate;
}

export interface NightWorkLine extends PayrollLineBase {
  kind: "night_work";
  hoursHundredths: number;
  /** O CT prevê exceções e permite disciplina por IRCT; não se presume que não existam. */
  regime:
    | { type: "statutory"; exceptionApplies: false }
    | { type: "collective_agreement"; premium: Rate }
    | { type: "unknown" };
}

export interface UnpaidAbsenceLine extends PayrollLineBase {
  kind: "unpaid_absence";
  hoursHundredths: number;
}

export interface MealAllowanceLine extends PayrollLineBase {
  kind: "meal_allowance";
  days: number;
  dailyAmount: Money;
  method: "cash" | "card_or_voucher";
}

export interface TravelAllowanceLine extends PayrollLineBase {
  kind: "travel_allowance";
  days: number;
  dailyAmount: Money;
  /** Limite oficial aplicável à categoria/função, vindo do dataset revisto. */
  exemptDailyLimit?: Money;
  businessTravelConfirmed?: boolean;
  documentationPresent?: boolean;
}

export interface CashShortageLine extends PayrollLineBase {
  kind: "cash_shortage_allowance";
  amount: Money;
  /** Um IRCT geral pode alterar o limite contributivo; exige valor explícito e fonte. */
  collectiveAgreementLimit?: Money;
}

export interface PriorYearsLine extends PayrollLineBase {
  kind: "prior_years_pay";
  amount: Money;
  monthsRepresented?: number;
}

export type RoutedBenefitKind =
  | "health_insurance"
  | "life_insurance"
  | "employer_pension_or_ppr"
  | "stock_option"
  | "childcare_support"
  | "education_support"
  | "culture_card"
  | "social_pass"
  | "company_car"
  | "termination_payment"
  | "other_benefit";

/** Rubricas cujo enquadramento depende de factos/documentos não redutíveis ao nome da rubrica. */
export interface RoutedBenefitLine extends PayrollLineBase {
  kind: "routed_benefit";
  benefitKind: RoutedBenefitKind;
  amount?: Money;
  facts?: Readonly<Record<string, string | number | boolean>>;
}

export type PayrollLineInput =
  | FixedTaxableLine
  | PerformanceAwardLine
  | SubsidyLine
  | OvertimeLine
  | NightWorkLine
  | UnpaidAbsenceLine
  | MealAllowanceLine
  | TravelAllowanceLine
  | CashShortageLine
  | PriorYearsLine
  | RoutedBenefitLine;

export interface GarnishmentOrder {
  type: "ordinary" | "maintenance" | "court_defined";
  /** Necessário para ordens de alimentos ou montante fixado judicialmente. */
  orderedAmount?: Money;
  otherIncomeAvailable?: boolean;
}

export interface PayrollInput {
  period: `${number}-${number}`;
  weeklyHoursHundredths: number;
  /** Rm da fórmula do artigo 271.º do CT; obrigatório quando há rubricas horárias. */
  hourlyReferenceRemuneration?: Money;
  employee: PayrollEmployee;
  lines: readonly PayrollLineInput[];
  garnishment?: GarnishmentOrder;
}

export interface PayrollPolicy {
  id: string;
  employeeSocialSecurityRate: Rate;
  employerSocialSecurityRate: Rate;
  mealCashDailyExemption: Money;
  mealCardDailyExemption: Money;
  minimumMonthlyWage: Money;
  standardNightPremium: Rate;
  cashShortageIrsLimitRate: Rate;
  overtimePremiums: Readonly<
    Record<"up_to_100_hours" | "above_100_hours", Readonly<Record<OvertimeSegment, Rate>>>
  >;
  citations: readonly string[];
}

export interface WithholdingRequest {
  bucket: PayrollTaxBucket;
  taxableAmount: Money;
  /** Base que determina a taxa; pode diferir no pagamento fracionado e nos retroativos. */
  rateReferenceAmount: Money;
  employee: PayrollEmployee;
  youthIrs?: PayrollEmployee["youthIrs"];
}

export interface WithholdingResolution {
  amount: Money;
  effectiveRate: Rate;
  trace: readonly TraceStep[];
  warnings?: readonly FiscalWarning[];
}

export type WithholdingResolver = (request: WithholdingRequest) => WithholdingResolution;

export interface PayrollLineResult {
  id: PayrollLineId;
  label: string;
  kind: PayrollLineInput["kind"];
  bucket: PayrollTaxBucket;
  cashGross: Money;
  irsTaxable: Money;
  socialSecurityBase: Money;
  irsWithheld: Money;
  employeeSocialSecurity: Money;
  employerSocialSecurity: Money;
  netImpact: Money;
  employerCost: Money;
  classification: "taxable" | "partially_exempt" | "exempt" | "deduction";
  explanation: string;
  citations: readonly string[];
}

export interface PayrollTotals {
  cashGross: Money;
  irsTaxable: Money;
  socialSecurityBase: Money;
  irsWithheld: Money;
  employeeSocialSecurity: Money;
  netBeforeGarnishment: Money;
  garnishment: Money;
  netPayable: Money;
  employerSocialSecurity: Money;
  employerCost: Money;
}

export interface PayrollResult {
  policyId: string;
  period: PayrollInput["period"];
  lines: readonly PayrollLineResult[];
  totals: PayrollTotals;
  trace: readonly TraceStep[];
  warnings: readonly FiscalWarning[];
}

export type PayrollPreparation =
  | { kind: "ready"; result: PayrollResult }
  | { kind: "needs_input"; missing: readonly MissingInput[]; trace: readonly TraceStep[] }
  | { kind: "unsupported"; reasons: readonly string[]; trace: readonly TraceStep[] }
  | { kind: "conflict"; reasons: readonly string[]; trace: readonly TraceStep[] };
