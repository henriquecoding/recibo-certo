import { eurCents, eurFromDecimal, ratePpm } from "../core/money";
import { PORTUGAL_PAYROLL_POLICY_2026 } from "../domains/payroll/policy-2026";
import type {
  DemoScenario,
  EmployerPolicyRelease,
  HiringSupportCatalog,
  HiringSupportProgram,
  MinimumWagePolicy,
  SubsidyBasePolicy,
  SupportFactSheet,
  SupportRequirement,
  SupportRequirementOutcome,
  VacationPolicy,
  WorkingTimePolicy,
} from "./types";

/**
 * Release patronal de Portugal para 2026.
 *
 * Estado: `reviewed`. A revisão TÉCNICA está feita e assinada — cada valor
 * abaixo foi confrontado com a fonte oficial em 31 de agosto de 2026. A
 * revisão PROFISSIONAL (fiscal e laboral, independente) não está: por isso o
 * release não é `approved` e nenhuma superfície pode escrever «verificado»
 * ou «conforme». Um release em revisão calcula com aviso; um release em
 * `draft` não calcula de todo (relatório, §9.4 e §15.2).
 */

const KNOWLEDGE_AS_OF = "2026-08-31" as const;

/** IAS de 2026, publicado pelo IEFP nas fichas das medidas. */
const IAS_2026 = eurFromDecimal(537.13);

// ─── Piso remuneratório ────────────────────────────────────────────────────

/**
 * A RMMG não é um número nacional. O motor tinha 920 € numa constante e
 * usava-a sobretudo na penhora; um posto nos Açores ou na Madeira passava
 * pelo gate com um salário ilegal (MOT-P0-005).
 */
const MINIMUM_WAGE: MinimumWagePolicy = {
  entries: [
    {
      jurisdiction: "PT-CONTINENTE",
      monthly: eurCents(92_000),
      effective: { from: "2026-01-01", to: "2026-12-31" },
      sourceIds: ["pt.dr.decreto-lei-139-2025"],
      basis: "Decreto-Lei n.º 139/2025, de 29 de dezembro",
    },
    {
      jurisdiction: "PT-MADEIRA",
      monthly: eurCents(98_000),
      effective: { from: "2026-01-01", to: "2026-12-31" },
      sourceIds: ["pt.dr.decreto-legislativo-regional-1-2026-m"],
      basis: "Decreto Legislativo Regional n.º 1/2026/M, com efeitos a 1 de janeiro de 2026",
    },
    {
      jurisdiction: "PT-ACORES",
      monthly: eurCents(96_600),
      effective: { from: "2026-01-01", to: "2026-12-31" },
      sourceIds: [
        "pt.dr.decreto-legislativo-regional-8-2002-a",
        "pt.dr.decreto-lei-139-2025",
      ],
      basis: "920 € com o acréscimo regional de 5% do DLR n.º 8/2002/A",
    },
  ],
  fullTimeWeeklyHoursHundredths: 4_000,
  partTimeRule: "proportional_to_normal_period",
  partTimeSourceIds: ["pt.dr.codigo-trabalho.artigo-155"],
};

// ─── Tempo de trabalho ─────────────────────────────────────────────────────

const WORKING_TIME: WorkingTimePolicy = {
  normalDailyHoursHundredths: 800,
  normalWeeklyHoursHundredths: 4_000,
  individualAdaptability: {
    peakDailyHoursHundredths: 1_000,
    peakWeeklyHoursHundredths: 5_000,
    admissibleBasis: ["written_individual_agreement", "collective_agreement"],
    citation: "pt.dr.codigo-trabalho.artigo-205",
  },
  collectiveAdaptability: {
    peakDailyHoursHundredths: 1_200,
    peakWeeklyHoursHundredths: 6_000,
    admissibleBasis: ["collective_agreement"],
    citation: "pt.dr.codigo-trabalho.artigo-204",
  },
  averageWeeklyCeilingHundredths: 4_800,
  maxReferencePeriodMonths: 12,
  sourceIds: [
    "pt.dr.codigo-trabalho.artigo-203",
    "pt.dr.codigo-trabalho.artigo-204",
    "pt.dr.codigo-trabalho.artigo-205",
    "pt.dr.codigo-trabalho.artigo-207",
    "pt.dr.codigo-trabalho.artigo-211",
  ],
};

// ─── Férias e subsídios ────────────────────────────────────────────────────

const VACATION: VacationPolicy = {
  annualWorkdays: 22,
  admissionWorkdaysPerMonth: 2,
  admissionCapWorkdays: 20,
  minimumServiceMonthsBeforeLeave: 6,
  carryOverDeadline: { month: 6, day: 30 },
  combinedYearCapWorkdays: 30,
  sourceIds: [
    "pt.dr.codigo-trabalho.artigo-237",
    "pt.dr.codigo-trabalho.artigo-238",
    "pt.dr.codigo-trabalho.artigo-239",
  ],
};

/**
 * O subsídio de férias não é o salário base. O artigo 264.º, n.º 2 manda
 * incluir as prestações retributivas ligadas ao modo específico da execução
 * do trabalho — um prémio mensal fixo é uma delas (MOT-P0-009).
 */
const SUBSIDY_BASE: SubsidyBasePolicy = {
  holidaySubsidyIncludes: ["base_salary", "fixed_monthly_bonus"],
  christmasSubsidyIncludes: ["base_salary", "fixed_monthly_bonus"],
  sourceIds: [
    "pt.dr.codigo-trabalho.artigo-263",
    "pt.dr.codigo-trabalho.artigo-264",
  ],
};

// ─── Apoios à contratação ──────────────────────────────────────────────────

const met: SupportRequirementOutcome = { kind: "met" };
const unmet = (reason: string): SupportRequirementOutcome => ({ kind: "unmet", reason });
const unknown = (asks: string): SupportRequirementOutcome => ({ kind: "unknown", asks });

const bool = (
  value: boolean | undefined,
  asks: string,
  reason: string,
): SupportRequirementOutcome =>
  value === undefined ? unknown(asks) : value ? met : unmet(reason);

const REGISTERED_UNEMPLOYED: SupportRequirement = {
  key: "registeredUnemployed",
  subject: "candidate",
  label: "Pessoa desempregada inscrita no IEFP",
  detail: "A medida destina-se a quem está inscrito como desempregado no IEFP à data da oferta.",
  evaluate: (facts) =>
    bool(
      facts.registeredUnemployed,
      "A pessoa a contratar está inscrita como desempregada no IEFP?",
      "A medida exige inscrição como desempregado no IEFP.",
    ),
};

const PERMANENT_CONTRACT: SupportRequirement = {
  key: "permanentContract",
  subject: "contract",
  label: "Contrato de trabalho sem termo",
  detail: "Só o contrato sem termo é elegível; um contrato a termo não é aceite.",
  evaluate: (facts) =>
    bool(
      facts.permanentContract,
      "O contrato é sem termo?",
      "A medida exige contrato de trabalho sem termo.",
    ),
};

/**
 * O motor não validava tempo completo em nenhuma das medidas, apesar de
 * ambas o exigirem — um posto a meio tempo aparecia como potencial
 * (MOT-P0-010).
 */
const FULL_TIME: SupportRequirement = {
  key: "fullTime",
  subject: "contract",
  label: "Contrato a tempo completo",
  detail: "As duas medidas exigem contrato a tempo completo.",
  evaluate: (facts) =>
    bool(
      facts.fullTime,
      "O contrato é a tempo completo?",
      "A medida exige contrato a tempo completo.",
    ),
};

/**
 * A cronologia certa. O motor exigia «candidatura antes do contrato», que não
 * é o que a medida pede: o contrato pode ser celebrado antes da candidatura,
 * desde que depois do REGISTO DA OFERTA no iefponline, e a candidatura entra
 * dentro dos 30 dias seguidos a esse registo (MOT-P0-010).
 */
const OFFER_BEFORE_CONTRACT: SupportRequirement = {
  key: "jobOfferRegisteredBeforeContract",
  subject: "chronology",
  label: "Oferta registada antes do contrato",
  detail: "A oferta de emprego tem de ser registada no iefponline antes de o contrato ser celebrado.",
  evaluate: (facts) =>
    bool(
      facts.jobOfferRegisteredBeforeContract,
      "A oferta de emprego foi registada no iefponline antes de assinares o contrato?",
      "O contrato foi celebrado antes do registo da oferta no iefponline.",
    ),
};

const APPLICATION_WITHIN_WINDOW: SupportRequirement = {
  key: "applicationWithinWindowOfOffer",
  subject: "chronology",
  label: "Candidatura dentro dos 30 dias do registo da oferta",
  detail: "A candidatura é apresentada nos 30 dias seguidos após a data de registo da oferta.",
  evaluate: (facts) =>
    bool(
      facts.applicationWithinWindowOfOffer,
      "A candidatura entra nos 30 dias seguidos ao registo da oferta?",
      "O prazo de 30 dias seguidos após o registo da oferta já passou.",
    ),
};

const NET_JOB_CREATION: SupportRequirement = {
  key: "netJobCreation",
  subject: "employer",
  label: "Criação líquida de emprego",
  detail: "A contratação tem de representar criação líquida de emprego face ao nível anterior.",
  evaluate: (facts) =>
    bool(
      facts.netJobCreation,
      "Esta admissão aumenta o número de pessoas ao serviço face aos meses anteriores?",
      "Sem criação líquida de emprego a medida não é atribuída.",
    ),
};

const REGULARISED_STANDING: SupportRequirement = {
  key: "regularisedStanding",
  subject: "employer",
  label: "Situação regularizada perante AT e Segurança Social",
  detail: "A entidade tem de ter a situação tributária e contributiva regularizada.",
  evaluate: (facts) =>
    bool(
      facts.regularisedStanding,
      "A empresa tem a situação regularizada nas Finanças e na Segurança Social?",
      "A medida exige situação tributária e contributiva regularizada.",
    ),
};

const NO_RECENT_DISMISSALS: SupportRequirement = {
  key: "recentDismissals",
  subject: "employer",
  label: "Sem despedimentos recentes no posto equivalente",
  detail: "Despedimento coletivo, por extinção do posto ou por inadaptação no período relevante afasta a medida.",
  evaluate: (facts) =>
    facts.recentDismissals === undefined
      ? unknown("Houve despedimento coletivo, por extinção do posto ou por inadaptação no período relevante?")
      : facts.recentDismissals
        ? unmet("Despedimentos recentes no posto equivalente afastam a medida.")
        : met,
};

const AGE_UP_TO_35: SupportRequirement = {
  key: "candidateAge",
  subject: "candidate",
  label: "Até 35 anos, inclusive",
  detail: "A medida destina-se a jovens até aos 35 anos, inclusive.",
  evaluate: (facts) =>
    facts.candidateAge === undefined
      ? unknown("Que idade tem a pessoa a contratar?")
      : facts.candidateAge <= 35
        ? met
        : unmet("A medida abrange até aos 35 anos, inclusive."),
};

const QUALIFICATION_6_TO_8: SupportRequirement = {
  key: "qualificationLevel",
  subject: "candidate",
  label: "Licenciatura, mestrado ou doutoramento (níveis 6 a 8)",
  detail: "Exige-se qualificação de nível 6, 7 ou 8 do Quadro Nacional de Qualificações.",
  evaluate: (facts) =>
    facts.qualificationLevel === undefined
      ? unknown("Qual é o nível de qualificação da pessoa a contratar?")
      : facts.qualificationLevel >= 6 && facts.qualificationLevel <= 8
        ? met
        : unmet("A medida exige nível de qualificação 6, 7 ou 8."),
};

/** Piso remuneratório próprio da medida, acima da RMMG. */
const TALENT_SALARY_FLOOR = eurFromDecimal(1_499.15);

const TALENT_MINIMUM_SALARY: SupportRequirement = {
  key: "monthlyBaseSalary",
  subject: "contract",
  label: "Retribuição base igual ou superior a 1.499,15 €",
  detail: "O Emprego +Talento tem um piso remuneratório próprio, acima da RMMG.",
  evaluate: (facts) =>
    facts.monthlyBaseSalary === undefined
      ? unknown("Qual é a retribuição base mensal da proposta?")
      : facts.monthlyBaseSalary.cents >= TALENT_SALARY_FLOOR.cents
        ? met
        : unmet("A retribuição base proposta fica abaixo do piso de 1.499,15 € da medida."),
};

const MAJORATIONS_35 = [
  {
    id: "interior",
    label: "Posto de trabalho em território do interior",
    ratePpm: 350_000,
    detail: "Acresce 35% quando o posto de trabalho fica em território do interior.",
  },
  {
    id: "disability",
    label: "Pessoa com deficiência ou incapacidade",
    ratePpm: 350_000,
    detail: "Acresce 35% na contratação de pessoa com deficiência ou incapacidade.",
  },
  {
    id: "long_term_unemployed",
    label: "Desemprego de longa duração",
    ratePpm: 350_000,
    detail: "Acresce 35% na contratação de pessoa desempregada há 12 meses ou mais.",
  },
  {
    id: "under_represented_gender",
    label: "Profissão com sub-representação de género",
    ratePpm: 350_000,
    detail: "Acresce 35% quando a profissão tem sub-representação significativa de um dos géneros.",
  },
] as const;

const MAIS_EMPREGO: HiringSupportProgram = {
  id: "iefp-mais-emprego-2026",
  name: "+Emprego",
  authority: "IEFP, I.P.",
  programVersion: "2026.aviso-14-07-2026",
  sourceUrl: "https://iefponline.iefp.pt/IEFP/medida/mais-emprego.do?action=overview",
  sourceIds: ["pt.iefp.mais-emprego.2026", "pt.iefp.apoios-a-contratacao"],
  verifiedAt: KNOWLEDGE_AS_OF,
  applicationWindow: { from: "2026-07-15", to: "2026-12-15" },
  budgetStatus: "unknown",
  baseAmount: eurFromDecimal(6_445.56),
  baseAmountBasis: "12 × IAS de 2026 (537,13 €)",
  majorations: MAJORATIONS_35,
  maxMajorations: 4,
  maintenanceMonths: 24,
  clawback:
    "Quebrar a manutenção do nível de emprego nos 24 meses obriga à restituição total ou parcial do apoio.",
  incompatibilities: [
    "Não é acumulável com outro apoio público ao mesmo posto de trabalho pelo mesmo período.",
  ],
  requirements: [
    REGISTERED_UNEMPLOYED,
    PERMANENT_CONTRACT,
    FULL_TIME,
    OFFER_BEFORE_CONTRACT,
    APPLICATION_WITHIN_WINDOW,
    NET_JOB_CREATION,
    REGULARISED_STANDING,
    NO_RECENT_DISMISSALS,
  ],
};

const EMPREGO_MAIS_TALENTO: HiringSupportProgram = {
  id: "iefp-emprego-mais-talento-2026",
  name: "Emprego +Talento",
  authority: "IEFP, I.P.",
  programVersion: "2026.periodo-15-07-2026",
  sourceUrl: "https://iefponline.iefp.pt/IEFP/medida/emprego-mais-talento.do?action=overview",
  sourceIds: ["pt.iefp.emprego-mais-talento.2026", "pt.iefp.apoios-a-contratacao"],
  verifiedAt: KNOWLEDGE_AS_OF,
  applicationWindow: { from: "2026-07-15", to: "2026-12-15" },
  budgetStatus: "unknown",
  baseAmount: eurFromDecimal(9_668.34),
  baseAmountBasis: "18 × IAS de 2026 (537,13 €)",
  majorations: MAJORATIONS_35,
  maxMajorations: 4,
  maintenanceMonths: 24,
  clawback:
    "Quebrar a manutenção do nível de emprego nos 24 meses obriga à restituição total ou parcial do apoio.",
  incompatibilities: [
    "Não é acumulável com outro apoio público ao mesmo posto de trabalho pelo mesmo período.",
  ],
  requirements: [
    REGISTERED_UNEMPLOYED,
    PERMANENT_CONTRACT,
    FULL_TIME,
    TALENT_MINIMUM_SALARY,
    AGE_UP_TO_35,
    QUALIFICATION_6_TO_8,
    OFFER_BEFORE_CONTRACT,
    APPLICATION_WITHIN_WINDOW,
    NET_JOB_CREATION,
    REGULARISED_STANDING,
    NO_RECENT_DISMISSALS,
  ],
};

const SUPPORTS: HiringSupportCatalog = {
  programs: [MAIS_EMPREGO, EMPREGO_MAIS_TALENTO],
  socialSupportIndex: {
    amount: IAS_2026,
    year: 2026,
    sourceIds: ["pt.iefp.apoios-a-contratacao"],
  },
};

// ─── Cenário de demonstração ───────────────────────────────────────────────

/**
 * O cenário que a homepage mostra e que a ferramenta abre. Antes, cada
 * superfície repetia 42 000 €, 1 500 €, 10,20 € e 65% à mão; agora é uma
 * entrada do release, resolvida por ID (MOT-P0-015).
 */
const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    id: "pt-employer-2026.demo.primeira-contratacao",
    label: "Primeira contratação a tempo inteiro",
    jurisdiction: "PT-CONTINENTE",
    annualBudget: eurCents(4_200_000),
    baseSalaryMonthly: eurCents(150_000),
    mealDaily: eurCents(1_020),
    weeklyHoursHundredths: 4_000,
    productiveShare: ratePpm(650_000),
    startDate: "2026-09-01",
    workPeriod: "2026-09",
  },
];

// ─── O release ─────────────────────────────────────────────────────────────

export const PT_EMPLOYER_2026: EmployerPolicyRelease = Object.freeze({
  releaseId: "pt-employer-2026.2026-08-31.1",
  schemaVersion: "2.0.0",
  engineCompatibility: { min: "2.0.0", belowMajor: "3.0.0" },
  status: "reviewed",
  jurisdictions: ["PT-CONTINENTE", "PT-MADEIRA", "PT-ACORES"],
  effective: { from: "2026-01-01", to: "2026-12-31" },
  knowledgeAsOf: KNOWLEDGE_AS_OF,
  publishedAt: KNOWLEDGE_AS_OF,
  domains: {
    payroll: "reviewed",
    employment_terms: "reviewed",
    working_time: "reviewed",
    vacation_and_subsidies: "reviewed",
    post_costs: "reviewed",
    capacity: "reviewed",
    hiring_supports: "reviewed",
    // O relatório é explícito: ter uma data de fim reduz dias, não calcula
    // acertos, compensação, aviso prévio nem devolução de apoios. Declarar
    // isto como não suportado vale mais do que um número por inventar.
    termination: "unsupported",
    employer_obligations: "unsupported",
  },
  approvals: [
    {
      id: "technical-review-2026-08-31",
      role: "technical_review",
      by: "Equipa de engenharia do Recibo Certo",
      at: KNOWLEDGE_AS_OF,
      scope: [
        "payroll",
        "employment_terms",
        "working_time",
        "vacation_and_subsidies",
        "post_costs",
        "capacity",
        "hiring_supports",
      ],
      note:
        "Cada valor confrontado com a fonte oficial em 31 de agosto de 2026: RMMG das três jurisdições, limites do subsídio de refeição, taxas contributivas, janelas e montantes das medidas do IEFP.",
    },
  ],
  sourceIds: [
    "pt.dr.decreto-lei-139-2025",
    "pt.dr.decreto-legislativo-regional-1-2026-m",
    "pt.dr.decreto-legislativo-regional-8-2002-a",
    "pt.dr.portaria-51-b-2026",
    "pt.dr.despacho-233-a-2026",
    "pt.dr.codigo-trabalho.current",
    "pt.dr.codigo-contributivo.current",
    "pt.dr.lei-98-2009",
    "pt.iefp.mais-emprego.2026",
    "pt.iefp.emprego-mais-talento.2026",
    "pt.iefp.apoios-a-contratacao",
  ],
  payroll: PORTUGAL_PAYROLL_POLICY_2026,
  minimumWage: MINIMUM_WAGE,
  workingTime: WORKING_TIME,
  vacation: VACATION,
  subsidyBase: SUBSIDY_BASE,
  supports: SUPPORTS,
  demoScenarios: DEMO_SCENARIOS,
  notes: [
    "Revisão técnica assinada; revisão profissional fiscal e laboral independente por fazer.",
    "As tabelas de retenção chegam pelo adaptador do legado e continuam a exigir execução diferencial.",
    "Cessação e obrigações patronais estão declaradas como não suportadas — não há número por trás.",
    "A dotação das medidas do IEFP não é publicada em tempo real: o estado é «desconhecido», nunca «disponível».",
  ],
} satisfies EmployerPolicyRelease);

export const EMPLOYER_RELEASES: readonly EmployerPolicyRelease[] = Object.freeze([
  PT_EMPLOYER_2026,
]);

/** Fica exposto para os testes de fronteira e para a memória de cálculo. */
export const TALENT_MINIMUM_MONTHLY_SALARY = TALENT_SALARY_FLOOR;
export const SOCIAL_SUPPORT_INDEX_2026 = IAS_2026;

/** Montante com majorações, arredondado ao cêntimo (half-up). */
export function supportAmountWithMajorations(
  program: HiringSupportProgram,
  majorationIds: readonly string[],
): { cents: number; applied: readonly string[]; ratePpm: number } {
  const applied = program.majorations
    .filter((majoration) => majorationIds.includes(majoration.id))
    .slice(0, program.maxMajorations);
  const ppm = applied.reduce((sum, majoration) => sum + majoration.ratePpm, 1_000_000);
  return {
    cents: Math.round((program.baseAmount.cents * ppm) / 1_000_000),
    applied: applied.map((majoration) => majoration.id),
    ratePpm: ppm,
  };
}

export type { SupportFactSheet };
export { ratePpm };
