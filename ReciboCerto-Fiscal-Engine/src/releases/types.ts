import type { ISODate, PortugueseJurisdiction } from "../core/model";
import type { Money, Rate } from "../core/money";
import type { PayrollPolicy, WithholdingResolver } from "../domains/payroll/types";

/**
 * Release patronal — a unidade pública de consumo do motor.
 *
 * O relatório de 31 de agosto de 2026 descreve o problema que este módulo
 * existe para fechar: o gate de aprovação vivia no núcleo e a superfície
 * pública contornava-o, importando `policy-2026.ts` diretamente
 * (MOT-P0-001, MOT-P0-013).
 *
 * A partir daqui o caminho é um só: um release declara estado, vigência,
 * jurisdições, compatibilidade de engine e cobertura POR DOMÍNIO; o seletor
 * central resolve-o; e o motor público só aceita o `EmploymentPolicyBundle`
 * que o seletor devolve. Não há assinatura que aceite uma política solta.
 */

export type YearMonth = `${number}-${number}`;

/** Estado do release. Só `approved` autoriza a linguagem de conformidade. */
export type ReleaseStatus = "draft" | "reviewed" | "approved" | "retired";

/**
 * Cobertura de um domínio dentro do release. Um selo global escondia áreas
 * incompletas; a cobertura é declarada domínio a domínio (MOT-P0-019).
 */
export type ReleaseDomainCoverage = "approved" | "reviewed" | "draft" | "unsupported";

export type EmployerDomain =
  | "payroll"
  | "employment_terms"
  | "working_time"
  | "vacation_and_subsidies"
  | "post_costs"
  | "capacity"
  | "hiring_supports"
  | "termination"
  | "employer_obligations";

export const EMPLOYER_DOMAINS: readonly EmployerDomain[] = [
  "payroll",
  "employment_terms",
  "working_time",
  "vacation_and_subsidies",
  "post_costs",
  "capacity",
  "hiring_supports",
  "termination",
  "employer_obligations",
];

export const EMPLOYER_DOMAIN_LABELS: Readonly<Record<EmployerDomain, string>> = {
  payroll: "Processamento salarial",
  employment_terms: "Termos do vínculo",
  working_time: "Tempo de trabalho",
  vacation_and_subsidies: "Férias e subsídios",
  post_costs: "Custos do posto",
  capacity: "Capacidade e horas",
  hiring_supports: "Apoios à contratação",
  termination: "Cessação",
  employer_obligations: "Obrigações patronais",
};

/**
 * Aprovação registada. São precisas duas funções distintas: a revisão
 * técnica, que a equipa de engenharia pode assinar, e a revisão profissional
 * fiscal/laboral, que não. Um release só chega a `approved` com as duas.
 */
export interface ReleaseApproval {
  id: string;
  role: "technical_review" | "professional_review";
  by: string;
  at: ISODate;
  scope: readonly EmployerDomain[];
  note: string;
}

// ─── Piso remuneratório ────────────────────────────────────────────────────

export interface MinimumWageEntry {
  jurisdiction: PortugueseJurisdiction;
  /** Retribuição mínima mensal garantida a tempo completo. */
  monthly: Money;
  effective: { from: ISODate; to?: ISODate };
  sourceIds: readonly string[];
  basis: string;
}

export interface MinimumWagePolicy {
  entries: readonly MinimumWageEntry[];
  /**
   * Horas semanais do período normal completo que servem de referência à
   * proporcionalidade do tempo parcial (CT, artigo 155.º, n.º 1).
   */
  fullTimeWeeklyHoursHundredths: number;
  partTimeRule: "proportional_to_normal_period";
  partTimeSourceIds: readonly string[];
}

// ─── Tempo de trabalho ─────────────────────────────────────────────────────

/**
 * Limites do tempo de trabalho. O erro corrigido (MOT-P0-007): 50 h e 60 h
 * eram tratadas como período normal permanente. Não são — são o limite do
 * ACRÉSCIMO num regime de adaptabilidade, que trabalha por médias dentro de
 * um período de referência.
 */
export interface WorkingTimePolicy {
  /** CT, artigo 203.º, n.º 1: 8 h por dia e 40 h por semana. */
  normalDailyHoursHundredths: number;
  normalWeeklyHoursHundredths: number;
  /** CT, artigo 205.º, n.º 1: acréscimo até 2 h diárias e 50 h semanais. */
  individualAdaptability: AdaptabilityLimits;
  /** CT, artigo 204.º, n.º 1: acréscimo até 4 h diárias e 60 h semanais. */
  collectiveAdaptability: AdaptabilityLimits;
  /**
   * CT, artigo 211.º, n.º 1: a duração média do trabalho semanal, incluindo
   * trabalho suplementar, não pode exceder 48 h no período de referência.
   */
  averageWeeklyCeilingHundredths: number;
  /** CT, artigo 207.º: período de referência máximo, em meses. */
  maxReferencePeriodMonths: number;
  sourceIds: readonly string[];
}

export interface AdaptabilityLimits {
  /** Limite do período normal em semana de acréscimo. */
  peakDailyHoursHundredths: number;
  peakWeeklyHoursHundredths: number;
  /** Fundamentos que a lei admite para este regime. */
  admissibleBasis: readonly WorkingTimeBasis[];
  citation: string;
}

export type WorkingTimeBasis =
  | "written_individual_agreement"
  | "collective_agreement"
  | "none";

// ─── Férias e subsídios ────────────────────────────────────────────────────

export interface VacationPolicy {
  /** CT, artigo 238.º, n.º 1: 22 dias úteis por ano civil. */
  annualWorkdays: number;
  /** CT, artigo 239.º, n.º 1: 2 dias úteis por mês, até 20 no ano da admissão. */
  admissionWorkdaysPerMonth: number;
  admissionCapWorkdays: number;
  /** CT, artigo 239.º, n.º 1: só gozáveis após seis meses completos. */
  minimumServiceMonthsBeforeLeave: number;
  /**
   * CT, artigo 239.º, n.º 2: se o ano civil terminar antes dos seis meses, o
   * gozo vai até 30 de junho do ano seguinte.
   */
  carryOverDeadline: { month: number; day: number };
  /** CT, artigo 239.º, n.º 3: limite do gozo conjunto no ano seguinte. */
  combinedYearCapWorkdays: number;
  sourceIds: readonly string[];
}

/**
 * Rubricas que entram na base do subsídio de férias. O artigo 264.º, n.º 2
 * manda incluir a retribuição base e as demais prestações retributivas
 * ligadas ao modo específico da execução do trabalho — não só o salário base
 * (MOT-P0-009).
 */
export interface SubsidyBasePolicy {
  holidaySubsidyIncludes: readonly SubsidyBaseComponent[];
  christmasSubsidyIncludes: readonly SubsidyBaseComponent[];
  sourceIds: readonly string[];
}

export type SubsidyBaseComponent =
  | "base_salary"
  | "fixed_monthly_bonus"
  | "seniority_payments"
  | "exemption_from_schedule";

// ─── Apoios à contratação ──────────────────────────────────────────────────

export type SupportRequirementSubject = "employer" | "candidate" | "contract" | "chronology";

/**
 * Requisito declarativo de uma medida. Cada um sabe dizer porque falhou, o
 * que evita a triagem binária que dava falsos positivos (MOT-P0-010).
 */
export interface SupportRequirement {
  key: string;
  subject: SupportRequirementSubject;
  label: string;
  /** Razão material, na voz de quem lê. */
  detail: string;
  /** Avaliação pura sobre os factos declarados. */
  evaluate: (facts: SupportFactSheet) => SupportRequirementOutcome;
}

export type SupportRequirementOutcome =
  | { kind: "met" }
  | { kind: "unmet"; reason: string }
  | { kind: "unknown"; asks: string };

export interface SupportMajoration {
  id: string;
  label: string;
  ratePpm: number;
  detail: string;
}

export interface HiringSupportProgram {
  id: string;
  name: string;
  authority: string;
  programVersion: string;
  sourceUrl: string;
  sourceIds: readonly string[];
  verifiedAt: ISODate;
  applicationWindow: { from: ISODate; to: ISODate };
  /** A dotação esgota antes do fim da janela e não é publicada em tempo real. */
  budgetStatus: "unknown" | "open" | "exhausted";
  /** Montante base e o índice que o gera. */
  baseAmount: Money;
  baseAmountBasis: string;
  majorations: readonly SupportMajoration[];
  maxMajorations: number;
  /** Dever de manutenção do nível de emprego, em meses. */
  maintenanceMonths: number;
  /** Devolução do apoio quando o dever de manutenção é quebrado. */
  clawback: string;
  incompatibilities: readonly string[];
  requirements: readonly SupportRequirement[];
}

export interface HiringSupportCatalog {
  programs: readonly HiringSupportProgram[];
  /** Índice que dá os montantes. Guardado para a memória de cálculo. */
  socialSupportIndex: { amount: Money; year: number; sourceIds: readonly string[] };
}

/**
 * Factos de elegibilidade. Distintos dos factos fiscais do candidato: a
 * finalidade é outra e o consentimento também (relatório, §9.2, passo 5).
 */
export interface SupportFactSheet {
  registeredUnemployed?: boolean;
  permanentContract?: boolean;
  fullTime?: boolean;
  /** O contrato foi celebrado DEPOIS do registo da oferta no iefponline. */
  jobOfferRegisteredBeforeContract?: boolean;
  /** A candidatura entra dentro dos 30 dias seguidos ao registo da oferta. */
  applicationWithinWindowOfOffer?: boolean;
  candidateAge?: number;
  qualificationLevel?: number;
  monthlyBaseSalary?: Money;
  /** Criação líquida de emprego e manutenção do nível de emprego. */
  netJobCreation?: boolean;
  /** Situação regularizada perante AT e Segurança Social. */
  regularisedStanding?: boolean;
  /** Despedimento coletivo, por extinção ou inadaptação no período relevante. */
  recentDismissals?: boolean;
}

// ─── Cenário de demonstração ───────────────────────────────────────────────

/**
 * Cenário nomeado que a homepage, a ferramenta e os documentos resolvem pelo
 * mesmo ID em vez de repetirem números à mão (MOT-P0-015, P0-12).
 */
export interface DemoScenario {
  id: string;
  label: string;
  jurisdiction: PortugueseJurisdiction;
  annualBudget: Money;
  baseSalaryMonthly: Money;
  mealDaily: Money;
  weeklyHoursHundredths: number;
  productiveShare: Rate;
  startDate: ISODate;
  workPeriod: YearMonth;
}

// ─── O release ─────────────────────────────────────────────────────────────

export interface EmployerPolicyRelease {
  releaseId: string;
  schemaVersion: string;
  /** Intervalo semver de engines compatíveis com este payload. */
  engineCompatibility: { min: string; belowMajor: string };
  status: ReleaseStatus;
  jurisdictions: readonly PortugueseJurisdiction[];
  effective: { from: ISODate; to: ISODate };
  /** Data até à qual o conhecimento regulamentar foi levantado. */
  knowledgeAsOf: ISODate;
  publishedAt: ISODate;
  supersedes?: string;
  domains: Readonly<Record<EmployerDomain, ReleaseDomainCoverage>>;
  approvals: readonly ReleaseApproval[];
  sourceIds: readonly string[];
  payroll: PayrollPolicy;
  minimumWage: MinimumWagePolicy;
  workingTime: WorkingTimePolicy;
  vacation: VacationPolicy;
  subsidyBase: SubsidyBasePolicy;
  supports: HiringSupportCatalog;
  demoScenarios: readonly DemoScenario[];
  notes: readonly string[];
}

export interface ReleaseRef {
  releaseId: string;
  status: ReleaseStatus;
  effective: { from: ISODate; to: ISODate };
}

export const releaseRef = (release: EmployerPolicyRelease): ReleaseRef => ({
  releaseId: release.releaseId,
  status: release.status,
  effective: release.effective,
});

// ─── O bundle ──────────────────────────────────────────────────────────────

declare const bundleBrand: unique symbol;

/**
 * A chave que abre o motor público. É opaca de propósito: nenhum componente a
 * consegue fabricar, só o seletor central a devolve. É assim que
 * «impossível por tipo chamar o motor com um release não aprovado» deixa de
 * ser disciplina e passa a ser uma propriedade do tipo (MOT-P0-001).
 */
export interface EmploymentPolicyBundle {
  readonly [bundleBrand]: "employment-policy-bundle";
  readonly release: EmployerPolicyRelease;
  readonly jurisdiction: PortugueseJurisdiction;
  readonly withholding: WithholdingResolver;
  /**
   * Uso autorizado. `public` exige release não-draft; `internal_review` só
   * existe para testes e para a consola editorial, nunca para uma rota.
   */
  readonly usage: "public" | "internal_review";
}

/** Só o seletor chama isto. Fica fora do índice público do pacote. */
export function sealBundle(
  parts: Omit<EmploymentPolicyBundle, typeof bundleBrand>,
): EmploymentPolicyBundle {
  return Object.freeze({ ...parts }) as EmploymentPolicyBundle;
}
