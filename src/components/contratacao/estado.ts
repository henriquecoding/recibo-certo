import {
  eurFromDecimal,
  productiveShareRate,
  ratePpm,
  type CostKnowledge,
  type DemoScenario,
  type EmploymentOfferInput,
  type PlannerGoal,
  type SupportFactSheet,
  type WorkingTimeBasis,
  type WorkingTimeRegime,
} from "../../../ReciboCerto-Fiscal-Engine/src";

/**
 * Estado do planeador de contratação e a sua tradução para o domínio.
 *
 * Vive fora do React de propósito: é aqui que se garante que um campo vazio
 * NÃO vira um zero confirmado (relatório, CON-P0-04) e que o instantâneo
 * guardado tem versão de schema (CON-P0-23).
 *
 * O que mudou com o relatório de 31 de agosto (MOT-P0-003, MOT-P0-004,
 * MOT-P0-012, MOT-P0-015):
 *
 * - o período deixou de ser a string fixa `2026-08` e a data de entrada
 *   deixou de cair em silêncio para `2026-01-01` quando o campo trazia lixo:
 *   uma data inválida é agora `needs_input`;
 * - os valores de arranque deixaram de viver neste ficheiro. Vêm do cenário
 *   de demonstração do release, resolvido por ID — é o mesmo que a homepage
 *   mostra, porque é literalmente o mesmo objeto.
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
  /** Citação no catálogo legal do motor, resolvida na memória de cálculo. */
  citacao?: string;
}

export const META_CUSTOS: readonly MetaCusto[] = [
  {
    id: "accidentInsurance",
    label: "Seguro de acidentes de trabalho",
    hint: "Obrigatório. O prémio depende da atividade, do risco e da seguradora — por isso não é presumido.",
    unico: false,
    obrigatorio: true,
    citacao: "pt.dr.lei-98-2009.artigo-79",
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
    hint: "Só o custo do fornecedor. As horas anuais de formação entram na capacidade mesmo sem fatura.",
    unico: false,
    citacao: "pt.dr.codigo-trabalho.artigo-131",
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
  /** Período normal contratado. É a média semanal, nunca o pico. */
  normalWeeklyHours: number;
  workingTimeRegime: WorkingTimeRegime;
  workingTimeBasis: WorkingTimeBasis;
  /** Limite das semanas de acréscimo, só na adaptabilidade. */
  peakWeeklyHours: number;
  referencePeriodMonths: number;
  expectedOvertimeWeeklyHours: number;
  irctStatus: "unknown" | "none" | "declared";
  irctName: string;
  /** Mínimo da categoria no IRCT, quando conhecido. */
  irctMinimumMonthly: number;
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
  // ── Factos de elegibilidade a apoios ──────────────────────────────────
  registeredUnemployed: TriState;
  permanentContract: TriState;
  fullTime: TriState;
  /** Substitui «candidatura antes do contrato», que era o facto errado. */
  jobOfferRegisteredBeforeContract: TriState;
  applicationWithinWindowOfOffer: TriState;
  netJobCreation: TriState;
  regularisedStanding: TriState;
  recentDismissals: TriState;
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

/**
 * Estado de arranque, derivado do cenário de demonstração do release. Nenhum
 * número de negócio nasce neste ficheiro: a homepage, a ferramenta e os
 * documentos resolvem o MESMO cenário pelo mesmo ID (MOT-P0-015).
 */
export function estadoInicial(demo: DemoScenario): PlannerState {
  return {
    goal: "employer_budget",
    annualBudget: demo.annualBudget.cents / 100,
    safetyMarginPercent: 5,
    targetNet: demo.baseSalaryMonthly.cents / 100,
    baseSalary: demo.baseSalaryMonthly.cents / 100,
    startDate: demo.startDate,
    contractKind: "permanent",
    contractEndDate: "",
    workingWeekdays: [1, 2, 3, 4, 5],
    normalWeeklyHours: demo.weeklyHoursHundredths / 100,
    workingTimeRegime: "standard",
    workingTimeBasis: "none",
    peakWeeklyHours: 0,
    referencePeriodMonths: 0,
    expectedOvertimeWeeklyHours: 0,
    irctStatus: "unknown",
    irctName: "",
    irctMinimumMonthly: 0,
    jurisdiction: demo.jurisdiction,
    municipalHoliday: "",
    mainVacationMonth: 8,
    contributionRegime: "regime_geral",
    subsidyPayment: "normal",
    fixedMonthlyBonus: 0,
    variableAnnualBonus: 0,
    bonusRegularity: "unknown",
    bonusMonth: 12,
    mealDaily: demo.mealDaily.cents / 100,
    mealDaysMode: "calendario",
    mealDays: 22,
    mealMethod: "card_or_voucher",
    custos: custosIniciais(),
    productive: true,
    productiveSharePercent: demo.productiveShare.ppm / 10_000,
    onboardingHours: 0,
    trainingHours: 40,
    pricePerHour: 0,
    contributionMarginPercent: demo.productiveShare.ppm / 10_000,
    expectedBillableHoursMonthly: 100,
    candidateMode: "range",
    authorizationConfirmed: false,
    candidateDependants: 0,
    candidateMaritalStatus: "not_married",
    candidateDisability: false,
    registeredUnemployed: "unknown",
    permanentContract: "unknown",
    fullTime: "unknown",
    jobOfferRegisteredBeforeContract: "unknown",
    applicationWithinWindowOfOffer: "unknown",
    netJobCreation: "unknown",
    regularisedStanding: "unknown",
    recentDismissals: "unknown",
    candidateAge: 0,
    qualificationLevel: 0,
    revisto: false,
    calculated: false,
  };
}

export type Action =
  | { type: "set"; key: keyof PlannerState; value: PlannerState[keyof PlannerState] }
  | { type: "setCusto"; id: CustoId; patch: Partial<CampoCusto> }
  | { type: "hydrate"; state: PlannerState }
  | { type: "calculate" }
  | { type: "reset" };

/**
 * O redutor fecha sobre o estado inicial em vez de o importar de uma
 * constante de módulo: é o que permite que os valores de arranque venham do
 * release e não de literais escritos aqui.
 */
export function criarReducer(inicial: PlannerState) {
  return function reducer(state: PlannerState, action: Action): PlannerState {
    switch (action.type) {
      case "reset":
        return { ...inicial, custos: custosIniciais() };
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
        return {
          ...state,
          [action.key]: action.value,
          revisto: action.key === "revisto" ? (action.value as boolean) : false,
        };
    }
  };
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

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Uma data que não é uma data continua a não ser uma data. Devolver
 * `undefined` deixa a validação do motor falar; devolver `2026-01-01`
 * mudava em silêncio calendário, férias, refeição e custo (MOT-P0-003).
 */
export const isoOuIndefinido = (value: string): string | undefined => {
  if (!ISO.test(value)) return undefined;
  const [ano, mes, dia] = value.split("-").map(Number);
  if (!ano || !mes || !dia || mes < 1 || mes > 12) return undefined;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano
    && data.getUTCMonth() + 1 === mes
    && data.getUTCDate() === dia
    ? value
    : undefined;
};

/** Mês a que a remuneração respeita, derivado da entrada — nunca fixo. */
export const periodoDeTrabalho = (startDate: string): string =>
  isoOuIndefinido(startDate)?.slice(0, 7) ?? "";

/**
 * Data de pagamento assumida: o último dia do mês de trabalho. É um
 * pressuposto DECLARADO — não uma coincidência entre dois campos que a UI
 * calhava preencher com a mesma string.
 */
export const dataDePagamento = (startDate: string): string => {
  const iso = isoOuIndefinido(startDate);
  if (!iso) return "";
  const [ano, mes] = iso.split("-").map(Number);
  const ultimo = new Date(Date.UTC(ano!, mes!, 0)).getUTCDate();
  return `${iso.slice(0, 7)}-${String(ultimo).padStart(2, "0")}`;
};

export function inputFromState(
  state: PlannerState,
  simulationAsOf: string,
): EmploymentOfferInput {
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
  const adaptabilidade = state.workingTimeRegime !== "standard";
  const supportFacts: SupportFactSheet = {
    registeredUnemployed: triBool(state.registeredUnemployed),
    permanentContract: triBool(state.permanentContract),
    fullTime: triBool(state.fullTime),
    jobOfferRegisteredBeforeContract: triBool(state.jobOfferRegisteredBeforeContract),
    applicationWithinWindowOfOffer: triBool(state.applicationWithinWindowOfOffer),
    netJobCreation: triBool(state.netJobCreation),
    regularisedStanding: triBool(state.regularisedStanding),
    recentDismissals: triBool(state.recentDismissals),
    candidateAge: state.candidateAge > 0 ? Math.round(state.candidateAge) : undefined,
    qualificationLevel: state.qualificationLevel > 0 ? Math.round(state.qualificationLevel) : undefined,
  };

  return {
    context: {
      simulationAsOf: simulationAsOf as EmploymentOfferInput["context"]["simulationAsOf"],
      workPeriod: periodoDeTrabalho(state.startDate) as EmploymentOfferInput["context"]["workPeriod"],
      payDate: dataDePagamento(state.startDate) as EmploymentOfferInput["context"]["payDate"],
      contractStart: (isoOuIndefinido(state.startDate) ?? "") as EmploymentOfferInput["context"]["contractStart"],
      contractEnd: state.contractKind === "fixed_term"
        ? (isoOuIndefinido(state.contractEndDate) as EmploymentOfferInput["context"]["contractEnd"])
        : undefined,
      jurisdiction: state.jurisdiction,
    },
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
      contractKind: state.contractKind,
      workingTime: {
        normalWeeklyHoursHundredths: Math.round(state.normalWeeklyHours * 100),
        workingWeekdays: state.workingWeekdays,
        regime: state.workingTimeRegime,
        basis: state.workingTimeBasis,
        peakWeeklyHoursHundredths: adaptabilidade && state.peakWeeklyHours > 0
          ? Math.round(state.peakWeeklyHours * 100)
          : undefined,
        referencePeriodMonths: adaptabilidade && state.referencePeriodMonths > 0
          ? Math.round(state.referencePeriodMonths)
          : undefined,
        expectedOvertimeWeeklyHoursHundredths: state.expectedOvertimeWeeklyHours > 0
          ? Math.round(state.expectedOvertimeWeeklyHours * 100)
          : undefined,
      },
      collectiveAgreement: state.irctStatus === "declared"
        ? {
            status: "declared",
            name: state.irctName.trim() || "IRCT indicado",
            minimumMonthly: state.irctMinimumMonthly > 0
              ? money(state.irctMinimumMonthly)
              : undefined,
          }
        : { status: state.irctStatus },
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
    supportFacts,
    review: state.revisto
      ? { reviewedAt: simulationAsOf as EmploymentOfferInput["context"]["simulationAsOf"] }
      : undefined,
  };
}

// ─── Instantâneo guardado ──────────────────────────────────────────────────

export const SCHEMA_CENARIO_CONTRATACAO = 3;

export interface CenarioContratacaoV3 {
  schemaVersion: 3;
  engineVersion: string;
  /** Release que produziu o cenário — é o que permite reabri-lo tal como foi. */
  releaseId: string;
  calculadoEm: string;
  estado: PlannerState;
}

export function montarSnapshot(
  state: PlannerState,
  engineVersion: string,
  releaseId: string,
  calculadoEm: string,
): CenarioContratacaoV3 {
  return {
    schemaVersion: SCHEMA_CENARIO_CONTRATACAO,
    engineVersion,
    releaseId,
    calculadoEm,
    estado: { ...state, calculated: false },
  };
}

const MESES_LEGADO = 12;

/**
 * Reidrata um cenário guardado. As versões antigas guardavam outra forma do
 * estado; a migração é explícita para que um cenário incompatível não falhe
 * em silêncio. Um campo que não existia entra como desconhecido — nunca
 * como um valor inventado (relatório, §14.5).
 */
export function estadoDeCenario(
  dados: Record<string, unknown> | null,
  inicial: PlannerState,
): PlannerState | null {
  if (!dados) return null;
  const versao = dados["schemaVersion"];
  if (versao === SCHEMA_CENARIO_CONTRATACAO) {
    const estado = (dados as unknown as CenarioContratacaoV3).estado;
    if (!estado || typeof estado !== "object") return null;
    return {
      ...inicial,
      ...estado,
      custos: { ...custosIniciais(), ...(estado.custos ?? {}) },
      calculated: false,
      revisto: false,
    };
  }
  if (versao === 2) return migrarV2(dados, inicial);
  return migrarV1(dados, inicial);
}

/** V2 guardava o estado do formulário antes do modelo temporal explícito. */
function migrarV2(
  dados: Record<string, unknown>,
  inicial: PlannerState,
): PlannerState | null {
  const estado = dados["estado"] as Record<string, unknown> | undefined;
  if (!estado || typeof estado !== "object") return null;
  const horas = Number(estado["weeklyHours"]);
  const regime = estado["workingTimeRegime"];
  return {
    ...inicial,
    ...(estado as Partial<PlannerState>),
    // `weeklyHours` era o pico quando havia adaptabilidade. Como período
    // normal só pode valer até ao limite legal; o resto reentra como pico.
    normalWeeklyHours: Number.isFinite(horas) ? Math.min(horas, 40) : inicial.normalWeeklyHours,
    peakWeeklyHours: regime !== "standard" && Number.isFinite(horas) && horas > 40 ? horas : 0,
    workingTimeBasis: regime === "adaptability_collective"
      ? "collective_agreement"
      : regime === "adaptability_individual"
        ? "written_individual_agreement"
        : "none",
    // O facto antigo não é o facto certo: entra como desconhecido.
    jobOfferRegisteredBeforeContract: "unknown",
    applicationWithinWindowOfOffer: "unknown",
    netJobCreation: "unknown",
    regularisedStanding: "unknown",
    recentDismissals: "unknown",
    calculated: false,
    revisto: false,
  };
}

function migrarV1(
  dados: Record<string, unknown>,
  inicial: PlannerState,
): PlannerState | null {
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
  const mesValido = Number.isInteger(mes) && mes >= 1 && mes <= MESES_LEGADO ? mes : undefined;
  const anoDaEntrada = inicial.startDate.slice(0, 4);

  return {
    ...inicial,
    goal: (input["goal"] as PlannerGoal) ?? inicial.goal,
    annualBudget: centimos(empregador["annualBudget"]) || inicial.annualBudget,
    baseSalary: centimos(pacote["baseSalaryMonthly"]) || inicial.baseSalary,
    // Sem mês guardado não se inventa um: o campo fica por preencher e o
    // motor pede-o.
    startDate: mesValido
      ? `${anoDaEntrada}-${String(mesValido).padStart(2, "0")}-01`
      : "",
    normalWeeklyHours: Math.min(40, Number(role["weeklyHoursHundredths"] ?? 4_000) / 100),
    jurisdiction: (role["jurisdiction"] as Jurisdiction) ?? inicial.jurisdiction,
    productive: role["productive"] !== false,
    subsidyPayment: (pacote["subsidyPayment"] as "normal" | "duodecimos") ?? "normal",
    fixedMonthlyBonus: centimos(pacote["fixedMonthlyBonus"]),
    variableAnnualBonus: centimos(pacote["variableAnnualBonus"]),
    mealDaily: centimos((pacote["mealAllowance"] as Record<string, unknown> | undefined)?.["dailyAmount"])
      || inicial.mealDaily,
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
