import {
  EMPLOYMENT_OFFER_POLICY_DATE,
  eurFromDecimal,
  productiveShareRate,
  ratePpm,
  type CostKnowledge,
  type EmploymentOfferInput,
  type PlannerGoal,
} from "../../../ReciboCerto-Fiscal-Engine/src";

/**
 * Estado do planeador de contratação e a sua tradução para o domínio.
 *
 * Vive fora do React de propósito: é aqui que se garante que um campo vazio
 * NÃO vira um zero confirmado (relatório, CON-P0-04) e que o instantâneo
 * guardado tem versão de schema (CON-P0-23).
 */

export type Jurisdiction = "PT-CONTINENTE" | "PT-MADEIRA" | "PT-ACORES";
export type MaritalStatus = "not_married" | "married_single_holder" | "married_two_holders";
export type TriState = "unknown" | "yes" | "no";

export type EstadoCusto = "confirmado" | "estimado" | "intervalo" | "nao_aplicavel" | "nao_sei";

export interface CampoCusto {
  estado: EstadoCusto;
  valor: number;
  minimo: number;
  maximo: number;
}

export const CUSTOS_IDS = [
  "accidentInsurance",
  "healthAndSafety",
  "training",
  "equipmentFirstYear",
  "recruitmentFirstYear",
  "software",
  "remoteWork",
  "other",
] as const;

export type CustoId = (typeof CUSTOS_IDS)[number];

export interface MetaCusto {
  id: CustoId;
  label: string;
  hint: string;
  /** Encargo único do arranque em vez de recorrente. */
  unico: boolean;
  /** Obrigatório por lei: não aceita zero nem «não se aplica». */
  obrigatorio?: boolean;
  fonte?: { label: string; url: string };
}

export const META_CUSTOS: readonly MetaCusto[] = [
  {
    id: "accidentInsurance",
    label: "Seguro de acidentes de trabalho",
    hint: "Obrigatório. O prémio depende da atividade, do risco e da seguradora — por isso não é presumido.",
    unico: false,
    obrigatorio: true,
    fonte: {
      label: "Lei n.º 98/2009, artigo 79.º",
      url: "https://diariodarepublica.pt/dr/detalhe/lei/98-2009-489505",
    },
  },
  {
    id: "healthAndSafety",
    label: "Saúde e segurança no trabalho",
    hint: "A organização do serviço é obrigatória; o custo pode ser zero se já for suportado internamente.",
    unico: false,
  },
  {
    id: "training",
    label: "Formação externa",
    hint: "Só o custo do fornecedor. As 40 horas anuais de formação entram na capacidade mesmo sem fatura.",
    unico: false,
  },
  {
    id: "equipmentFirstYear",
    label: "Equipamento e EPI",
    hint: "Encargo único do arranque. Não entra no ano recorrente.",
    unico: true,
  },
  {
    id: "recruitmentFirstYear",
    label: "Recrutamento",
    hint: "Anúncios, agência, testes. Encargo único do arranque.",
    unico: true,
  },
  {
    id: "software",
    label: "Software e licenças",
    hint: "Postos de trabalho, ferramentas e subscrições atribuídas a esta pessoa.",
    unico: false,
  },
  {
    id: "remoteWork",
    label: "Trabalho remoto",
    hint: "Compensação de despesas adicionais de teletrabalho, quando acordada.",
    unico: false,
  },
  {
    id: "other",
    label: "Outros custos do posto",
    hint: "Deslocações, fardamento, comunicações e o que mais o posto obrigue.",
    unico: false,
  },
];

export const ROTULOS_ESTADO_CUSTO: Record<EstadoCusto, string> = {
  confirmado: "Confirmo o valor",
  estimado: "É uma estimativa",
  intervalo: "Está entre dois valores",
  nao_aplicavel: "Não se aplica",
  nao_sei: "Ainda não sei",
};

export interface PlannerState {
  goal: PlannerGoal;
  annualBudget: number;
  safetyMarginPercent: number;
  targetNet: number;
  baseSalary: number;
  startDate: string;
  contractKind: "permanent" | "fixed_term" | "unknown";
  contractEndDate: string;
  workingWeekdays: number[];
  weeklyHours: number;
  workingTimeRegime: "standard" | "adaptability_individual" | "adaptability_collective";
  irctStatus: "unknown" | "none" | "declared";
  irctName: string;
  jurisdiction: Jurisdiction;
  municipalHoliday: string;
  mainVacationMonth: number;
  contributionRegime: "regime_geral" | "outro" | "nao_sei";
  subsidyPayment: "normal" | "duodecimos";
  fixedMonthlyBonus: number;
  variableAnnualBonus: number;
  bonusRegularity: "regular" | "not_regular" | "unknown";
  bonusMonth: number;
  mealDaily: number;
  mealDaysMode: "calendario" | "declarado";
  mealDays: number;
  mealMethod: "cash" | "card_or_voucher";
  custos: Record<CustoId, CampoCusto>;
  productive: boolean;
  productiveSharePercent: number;
  onboardingHours: number;
  trainingHours: number;
  pricePerHour: number;
  contributionMarginPercent: number;
  expectedBillableHoursMonthly: number;
  candidateMode: "range" | "authorized";
  authorizationConfirmed: boolean;
  candidateDependants: number;
  candidateMaritalStatus: MaritalStatus;
  candidateDisability: boolean;
  registeredUnemployed: TriState;
  permanentContract: TriState;
  fullTime: TriState;
  applicationBeforeContract: TriState;
  candidateAge: number;
  qualificationLevel: number;
  revisto: boolean;
  calculated: boolean;
}

const custoVazio = (): CampoCusto => ({
  estado: "nao_sei",
  valor: 0,
  minimo: 0,
  maximo: 0,
});

const custosIniciais = (): Record<CustoId, CampoCusto> => ({
  accidentInsurance: custoVazio(),
  healthAndSafety: custoVazio(),
  training: custoVazio(),
  // Nenhuma parcela nasce com um valor escondido dentro de uma secção
  // fechada: era assim que 1 200 € de equipamento entravam no primeiro ano
  // sem ninguém os ter confirmado (relatório, CON-P0-07).
  equipmentFirstYear: custoVazio(),
  recruitmentFirstYear: custoVazio(),
  software: custoVazio(),
  remoteWork: custoVazio(),
  other: custoVazio(),
});

export const INITIAL: PlannerState = {
  goal: "employer_budget",
  annualBudget: 42_000,
  safetyMarginPercent: 5,
  targetNet: 1_500,
  baseSalary: 1_500,
  startDate: "2026-09-01",
  contractKind: "permanent",
  contractEndDate: "",
  workingWeekdays: [1, 2, 3, 4, 5],
  weeklyHours: 40,
  workingTimeRegime: "standard",
  irctStatus: "unknown",
  irctName: "",
  jurisdiction: "PT-CONTINENTE",
  municipalHoliday: "",
  mainVacationMonth: 8,
  contributionRegime: "regime_geral",
  subsidyPayment: "normal",
  fixedMonthlyBonus: 0,
  variableAnnualBonus: 0,
  bonusRegularity: "unknown",
  bonusMonth: 12,
  mealDaily: 10.2,
  mealDaysMode: "calendario",
  mealDays: 22,
  mealMethod: "card_or_voucher",
  custos: custosIniciais(),
  productive: true,
  productiveSharePercent: 65,
  onboardingHours: 0,
  trainingHours: 40,
  pricePerHour: 0,
  contributionMarginPercent: 65,
  expectedBillableHoursMonthly: 100,
  candidateMode: "range",
  authorizationConfirmed: false,
  candidateDependants: 0,
  candidateMaritalStatus: "not_married",
  candidateDisability: false,
  registeredUnemployed: "unknown",
  permanentContract: "unknown",
  fullTime: "unknown",
  applicationBeforeContract: "unknown",
  candidateAge: 0,
  qualificationLevel: 0,
  revisto: false,
  calculated: false,
};

export type Action =
  | { type: "set"; key: keyof PlannerState; value: PlannerState[keyof PlannerState] }
  | { type: "setCusto"; id: CustoId; patch: Partial<CampoCusto> }
  | { type: "hydrate"; state: PlannerState }
  | { type: "calculate" }
  | { type: "reset" };

export function reducer(state: PlannerState, action: Action): PlannerState {
  switch (action.type) {
    case "reset":
      return { ...INITIAL, custos: custosIniciais() };
    case "calculate":
      return { ...state, calculated: true };
    case "hydrate":
      return action.state;
    case "setCusto":
      return {
        ...state,
        custos: { ...state.custos, [action.id]: { ...state.custos[action.id], ...action.patch } },
        // Mexer num custo invalida uma revisão anterior.
        revisto: false,
      };
    case "set":
      return { ...state, [action.key]: action.value, revisto: action.key === "revisto" ? (action.value as boolean) : false };
  }
}

const money = (value: number) => eurFromDecimal(Math.max(0, Number.isFinite(value) ? value : 0));
const triBool = (value: TriState): boolean | undefined =>
  value === "unknown" ? undefined : value === "yes";

/** Traduz o campo do formulário no estado de conhecimento do domínio. */
export function conhecimentoDoCampo(campo: CampoCusto, meta: MetaCusto): CostKnowledge {
  switch (campo.estado) {
    case "confirmado":
      return { kind: "confirmed", amount: money(campo.valor) };
    case "estimado":
      return {
        kind: "estimated",
        amount: money(campo.valor),
        basis: "valor estimado pela empresa, ainda sem proposta fechada",
      };
    case "intervalo":
      return {
        kind: "range",
        min: money(Math.min(campo.minimo, campo.maximo)),
        max: money(Math.max(campo.minimo, campo.maximo)),
        basis: "intervalo indicado pela empresa",
      };
    case "nao_aplicavel":
      return { kind: "not_applicable", reason: `${meta.label} não se aplica a este posto` };
    case "nao_sei":
      return {
        kind: "unknown",
        reason: "ainda não foi orçamentado",
        blocking: meta.obrigatorio === true,
      };
  }
}

const isoOuIndefinido = (value: string): string | undefined =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;

export function inputFromState(state: PlannerState): EmploymentOfferInput {
  const comCandidato = state.candidateMode === "authorized" && state.authorizationConfirmed;
  const conhecimento = (id: CustoId): CostKnowledge => {
    const meta = META_CUSTOS.find((item) => item.id === id)!;
    return conhecimentoDoCampo(state.custos[id], meta);
  };
  const custos: EmploymentOfferInput["postCosts"] = {
    accidentInsurance: conhecimento("accidentInsurance"),
    healthAndSafety: conhecimento("healthAndSafety"),
    training: conhecimento("training"),
    equipmentFirstYear: conhecimento("equipmentFirstYear"),
    recruitmentFirstYear: conhecimento("recruitmentFirstYear"),
    software: conhecimento("software"),
    remoteWork: conhecimento("remoteWork"),
    other: conhecimento("other"),
  };

  return {
    period: "2026-08",
    policyDate: EMPLOYMENT_OFFER_POLICY_DATE,
    goal: state.goal,
    employer: {
      contributionRegime: state.contributionRegime,
      annualBudget: state.goal === "employer_budget" && state.annualBudget > 0
        ? money(state.annualBudget)
        : undefined,
      safetyMargin: state.goal === "employer_budget"
        ? ratePpm(Math.round(state.safetyMarginPercent * 10_000))
        : undefined,
    },
    role: {
      startDate: (isoOuIndefinido(state.startDate) ?? "2026-01-01") as EmploymentOfferInput["role"]["startDate"],
      contractEndDate: state.contractKind === "fixed_term"
        ? (isoOuIndefinido(state.contractEndDate) as EmploymentOfferInput["role"]["contractEndDate"])
        : undefined,
      contractKind: state.contractKind,
      workingWeekdays: state.workingWeekdays,
      weeklyHoursHundredths: Math.round(state.weeklyHours * 100),
      workingTimeRegime: state.workingTimeRegime,
      collectiveAgreement: state.irctStatus === "declared"
        ? { status: "declared", name: state.irctName.trim() || "IRCT indicado" }
        : { status: state.irctStatus },
      jurisdiction: state.jurisdiction,
      municipalHoliday: isoOuIndefinido(state.municipalHoliday) as EmploymentOfferInput["role"]["municipalHoliday"],
      mainVacationMonth: state.mainVacationMonth,
      productive: state.productive,
      productiveShare: state.productive
        ? productiveShareRate(state.productiveSharePercent)
        : undefined,
      annualTrainingHoursHundredths: Math.round(state.trainingHours * 100),
      onboardingHoursHundredths: Math.round(state.onboardingHours * 100),
    },
    package: {
      baseSalaryMonthly: money(
        state.goal === "known_offer" || state.goal === "required_capacity" ? state.baseSalary : 0,
      ),
      subsidyPayment: state.subsidyPayment,
      fixedMonthlyBonus: state.fixedMonthlyBonus > 0 ? money(state.fixedMonthlyBonus) : undefined,
      variableAnnualBonus: state.variableAnnualBonus > 0 ? money(state.variableAnnualBonus) : undefined,
      variableBonusSocialSecurityRegularity: state.variableAnnualBonus > 0
        ? state.bonusRegularity
        : undefined,
      bonusMonth: state.bonusMonth,
      mealAllowance: state.mealDaily > 0
        ? {
            dailyAmount: money(state.mealDaily),
            method: state.mealMethod,
            daysPerMonth: state.mealDaysMode === "declarado" ? Math.round(state.mealDays) : undefined,
          }
        : undefined,
    },
    postCosts: custos,
    targetNetMonthly: state.goal === "target_net" ? money(state.targetNet) : undefined,
    candidate: comCandidato
      ? {
          authorizationConfirmed: true,
          dependants: Math.round(state.candidateDependants),
          maritalStatus: state.candidateMaritalStatus,
          disability: state.candidateDisability,
          jurisdiction: state.jurisdiction,
        }
      : undefined,
    capacity: state.productive
      ? {
          pricePerProductiveHour: state.pricePerHour > 0 ? money(state.pricePerHour) : undefined,
          contributionMargin: state.contributionMarginPercent > 0
            ? productiveShareRate(state.contributionMarginPercent)
            : undefined,
          expectedBillableHoursMonthly: state.expectedBillableHoursMonthly > 0
            ? state.expectedBillableHoursMonthly
            : undefined,
        }
      : undefined,
    supportFacts: {
      registeredUnemployed: triBool(state.registeredUnemployed),
      permanentContract: triBool(state.permanentContract),
      fullTime: triBool(state.fullTime),
      applicationBeforeContract: triBool(state.applicationBeforeContract),
      candidateAge: state.candidateAge > 0 ? Math.round(state.candidateAge) : undefined,
      qualificationLevel: state.qualificationLevel > 0 ? Math.round(state.qualificationLevel) : undefined,
    },
    review: state.revisto
      ? { reviewedAt: new Date().toISOString().slice(0, 10) as EmploymentOfferInput["policyDate"] }
      : undefined,
  };
}

// ─── Instantâneo guardado ──────────────────────────────────────────────────

export const SCHEMA_CENARIO_CONTRATACAO = 2;

export interface CenarioContratacaoV2 {
  schemaVersion: 2;
  engineVersion: string;
  policyDate: string;
  estado: PlannerState;
}

export function montarSnapshot(
  state: PlannerState,
  engineVersion: string,
  policyDate: string,
): CenarioContratacaoV2 {
  return {
    schemaVersion: SCHEMA_CENARIO_CONTRATACAO,
    engineVersion,
    policyDate,
    estado: { ...state, calculated: false },
  };
}

const MESES_LEGADO = 12;

/**
 * Reidrata um cenário guardado. A versão 1 guardava o `EmploymentOfferInput`
 * antigo, com `startMonth` e custos como números soltos; a migração é
 * explícita para que um cenário incompatível não falhe em silêncio.
 */
export function estadoDeCenario(dados: Record<string, unknown> | null): PlannerState | null {
  if (!dados) return null;
  const versao = dados["schemaVersion"];
  if (versao === SCHEMA_CENARIO_CONTRATACAO) {
    const estado = (dados as unknown as CenarioContratacaoV2).estado;
    if (!estado || typeof estado !== "object") return null;
    return {
      ...INITIAL,
      ...estado,
      custos: { ...custosIniciais(), ...(estado.custos ?? {}) },
      calculated: false,
      revisto: false,
    };
  }
  return migrarV1(dados);
}

function migrarV1(dados: Record<string, unknown>): PlannerState | null {
  const input = dados["input"] as Record<string, unknown> | undefined;
  if (!input || typeof input !== "object") return null;
  const role = (input["role"] ?? {}) as Record<string, unknown>;
  const pacote = (input["package"] ?? {}) as Record<string, unknown>;
  const custos = (input["postCosts"] ?? {}) as Record<string, unknown>;
  const empregador = (input["employer"] ?? {}) as Record<string, unknown>;
  const centimos = (valor: unknown): number =>
    valor && typeof valor === "object" && "cents" in (valor as Record<string, unknown>)
      ? Number((valor as { cents: number }).cents) / 100
      : 0;
  const legado = (chave: string): CampoCusto => {
    const valor = centimos(custos[chave]);
    return valor > 0
      ? { estado: "confirmado", valor, minimo: 0, maximo: 0 }
      : custoVazio();
  };
  const mes = Number(role["startMonth"]);
  const mesValido = Number.isInteger(mes) && mes >= 1 && mes <= MESES_LEGADO ? mes : 1;

  return {
    ...INITIAL,
    goal: (input["goal"] as PlannerGoal) ?? INITIAL.goal,
    annualBudget: centimos(empregador["annualBudget"]) || INITIAL.annualBudget,
    baseSalary: centimos(pacote["baseSalaryMonthly"]) || INITIAL.baseSalary,
    startDate: `2026-${String(mesValido).padStart(2, "0")}-01`,
    weeklyHours: Number(role["weeklyHoursHundredths"] ?? 4_000) / 100,
    jurisdiction: (role["jurisdiction"] as Jurisdiction) ?? INITIAL.jurisdiction,
    productive: role["productive"] !== false,
    subsidyPayment: (pacote["subsidyPayment"] as "normal" | "duodecimos") ?? "normal",
    fixedMonthlyBonus: centimos(pacote["fixedMonthlyBonus"]),
    variableAnnualBonus: centimos(pacote["variableAnnualBonus"]),
    mealDaily: centimos((pacote["mealAllowance"] as Record<string, unknown> | undefined)?.["dailyAmount"])
      || INITIAL.mealDaily,
    custos: {
      ...custosIniciais(),
      accidentInsurance: legado("accidentInsuranceAnnual"),
      healthAndSafety: legado("healthAndSafetyAnnual"),
      training: legado("trainingAnnual"),
      equipmentFirstYear: legado("equipmentFirstYear"),
      other: legado("otherAnnual"),
    },
    calculated: false,
    revisto: false,
  };
}

// ─── Formatação ────────────────────────────────────────────────────────────

const formatador = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatador central: nunca se mostram cêntimos internos como texto. */
export const eur = (cents: number): string => formatador.format(cents / 100);

export const eurRedondo = (cents: number): string =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);

export const horas = (hundredths: number): string =>
  `${(hundredths / 100).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} h`;

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export const MESES_CURTOS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export const DIAS_SEMANA = [
  { valor: 1, label: "Seg" },
  { valor: 2, label: "Ter" },
  { valor: 3, label: "Qua" },
  { valor: 4, label: "Qui" },
  { valor: 5, label: "Sex" },
  { valor: 6, label: "Sáb" },
  { valor: 7, label: "Dom" },
];
