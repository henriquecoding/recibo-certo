/**
 * Motor canónico dos simuladores de empresa.
 *
 * Nenhuma fórmula fiscal deve viver nos componentes React. As superfícies
 * completa e guiada conservam as assinaturas históricas através dos dois
 * adaptadores exportados no fim deste ficheiro, mas partilham esta execução.
 */
import {
  DEDUCAO_ESPECIFICA_DEPENDENTE,
  DERRAMA_MAX,
  DIVIDENDOS_TAXA,
  DIV_INCLUSAO_ENGLOBAMENTO,
  ESCALOES_IRS,
  IRC_LIMITE_PME,
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IS_TAXA_AQUISICAO,
  IMT_TAXA_COMERCIAL,
  RFAI_LIMITE_COLETA,
  RFAI_LIMITE_INVESTIMENTO_INTERIOR,
  RFAI_TAXA_INTERIOR,
  RFAI_TAXA_INTERIOR_EXCEDENTE,
  RFAI_TAXA_LITORAL,
  SIFIDE_MAJORACAO_PME_JOVEM,
  SIFIDE_TAXA_BASE,
  SIFIDE_TAXA_INCREMENTAL,
  SS_DEPENDENTE,
  TA_AGRAVAMENTO_PREJUIZO,
  TA_AJUDAS_CUSTO,
  TA_NAO_DOCUMENTADAS,
  TA_REPRESENTACAO,
  TA_VIATURAS_COMBUSTAO,
  TA_VIATURAS_ELETRICA,
  TA_VIATURAS_ELETRICA_ACIMA_LIMITE,
  TA_VIATURAS_PHEV,
} from "./fiscal-data";
import { adicionalSolidariedade, calcularAbatimentoMinimoExistencia, coletaIRC, irsProgressivo } from "./fiscal";
import type { ParametrosFiscaisRegiao } from "./incentivos-regioes";
import { calculateLegacyPayroll } from "./payroll-simulator-legacy-adapter";

export type TipoViaturaEmpresa =
  | "nenhuma"
  | "eletrica"
  | "eletrica_cara"
  | "phev_baixo"
  | "phev_medio"
  | "phev_alto"
  | "comb_baixo"
  | "comb_medio"
  | "comb_alto";

export type RegiaoRFAIEmpresa = "interior" | "litoral";
export type TipoEmpresaSifide = "startup" | "pme_jovem" | "pme_normal" | "grande";

export interface ResultadoTA {
  viatura: number;
  representacao: number;
  ajudasCusto: number;
  naoDocumentadas: number;
  total: number;
}

export interface ResultadoBeneficios {
  /** Potencial limitado à coleta; não é deduzido sem dossier de elegibilidade. */
  rfai: number;
  rfaiBruto: number;
  /** Potencial limitado à coleta remanescente; não é deduzido automaticamente. */
  sifide: number;
  sifideBruto: number;
  /** Crédito indicado pelo utilizador, ainda não validado documentalmente. */
  rfaiContratual: number;
  /** Benefício efetivamente aplicado à coleta. É zero enquanto faltar revisão. */
  total: number;
  potencialTotal: number;
  status: "not_requested" | "needs_professional_review" | "verified";
  blockers: readonly string[];
}

export interface ResultadoPayrollGerente {
  salarioBrutoMensal: number;
  retencaoIRSMensal: number;
  ssTrabalhadorMensal: number;
  ssEntidadeMensal: number;
  liquidoMensal: number;
  custoEmpresaMensal: number;
}

export interface ResultadoEmpresa {
  faturacao: number;
  despesasOper: number;
  custosExtra: number;
  salGerente: number;
  ssSalGerente: number;
  custoConstituicao: number;
  totalCustos: number;
  lucroTributavel: number;
  coleta: number;
  beneficios: ResultadoBeneficios;
  ircAposBeneficios: number;
  ta: ResultadoTA;
  derramaMuni: number;
  ircTotal: number;
  lucroLiquido: number;
  dividendos: number;
  irsDividendosLiberatoria: number;
  irsDividendosEnglobamento: number;
  irsSalarioGerente: number;
  irsSalarioGerenteLiberatoria: number;
  irsSalarioGerenteEnglobamento: number;
  retencaoSalarioGerente: number;
  taxaMarginalGerente: number;
  liquidoGerenteLiberatoria: number;
  liquidoGerenteEnglobamento: number;
  liquidoGerente: number;
  taxaEfetiva: number;
  payrollGerente: ResultadoPayrollGerente;
}

export interface ResultadoEmpresaGuiado extends ResultadoEmpresa {
  custosEstrutura: number;
  derrama: number;
  irsDividendos: number;
  imiAnual: number;
  poupancaIMI: number;
  imtOneTime: number;
  poupancaIMT: number;
  custoMunicipalAnual: number;
  custoRepresentanteFiscal: number;
  custoSedeVirtual: number;
}

interface CompanySimulationInput {
  faturacao: number;
  despesasOper: number;
  custosExtra: number;
  salarioGerenteMensal: number;
  distribuirDividendos: boolean;
  opcaoEnglobamento: boolean;
  custoConstituicaoAnual: number;
  tipoViatura: TipoViaturaEmpresa;
  encargosViatura: number;
  despRepresentacao: number;
  ajudasCusto: number;
  naoDocumentadas: number;
  emPrejuizo: boolean;
  excecaoPrejuizo: boolean;
  rfaiRegiao: RegiaoRFAIEmpresa;
  rfaiInvest: number;
  primeirosAnos: boolean;
  sifideDespesas: number;
  tipoSifide: TipoEmpresaSifide;
  rfaiContratualValor: number;
  ircPME: number;
  ircGeral: number;
  derramaTaxa: number;
  custoSedeVirtualAnual: number;
  custoRepresentanteFiscal: number;
}

const cent = (value: number): number => Math.round(value * 100) / 100;
const amount = (value: number): number => Math.max(0, Number.isFinite(value) ? value : 0);

const TA_RATE: Record<TipoViaturaEmpresa, number> = {
  nenhuma: 0,
  eletrica: TA_VIATURAS_ELETRICA.value,
  eletrica_cara: TA_VIATURAS_ELETRICA_ACIMA_LIMITE.value,
  phev_baixo: TA_VIATURAS_PHEV.value.ate37500,
  phev_medio: TA_VIATURAS_PHEV.value.ate45000,
  phev_alto: TA_VIATURAS_PHEV.value.acima45000,
  comb_baixo: TA_VIATURAS_COMBUSTAO.value.ate37500,
  comb_medio: TA_VIATURAS_COMBUSTAO.value.ate45000,
  comb_alto: TA_VIATURAS_COMBUSTAO.value.acima45000,
};

export function calcularTributacaoAutonomaEmpresa(
  encargosViatura: number,
  tipoViatura: TipoViaturaEmpresa,
  despRepresentacao: number,
  ajudasCusto: number,
  naoDocumentadas: number,
  emPrejuizo: boolean,
  excecaoPrejuizo: boolean,
): ResultadoTA {
  const agravamento = emPrejuizo && !excecaoPrejuizo ? TA_AGRAVAMENTO_PREJUIZO.value : 0;
  const vehicleRate = TA_RATE[tipoViatura];
  const viatura = tipoViatura === "nenhuma" || tipoViatura === "eletrica"
    ? 0
    : amount(encargosViatura) * (vehicleRate + agravamento);
  const representacao = amount(despRepresentacao) * (TA_REPRESENTACAO.value + agravamento);
  const ajudas = amount(ajudasCusto) * (TA_AJUDAS_CUSTO.value + agravamento);
  const naoDoc = amount(naoDocumentadas) * (TA_NAO_DOCUMENTADAS.value + agravamento);
  return {
    viatura: cent(viatura),
    representacao: cent(representacao),
    ajudasCusto: cent(ajudas),
    naoDocumentadas: cent(naoDoc),
    total: cent(viatura + representacao + ajudas + naoDoc),
  };
}

function calculatePotentialBenefits(
  coleta: number,
  rfaiInvest: number,
  region: RegiaoRFAIEmpresa,
  sifideExpenses: number,
  sifideType: TipoEmpresaSifide,
  firstYears: boolean,
  contractualValue: number,
): ResultadoBeneficios {
  let rfaiBruto: number;
  if (region === "interior") {
    const base = Math.min(amount(rfaiInvest), RFAI_LIMITE_INVESTIMENTO_INTERIOR.value);
    const excess = Math.max(0, amount(rfaiInvest) - RFAI_LIMITE_INVESTIMENTO_INTERIOR.value);
    rfaiBruto = base * RFAI_TAXA_INTERIOR.value + excess * RFAI_TAXA_INTERIOR_EXCEDENTE.value;
  } else {
    rfaiBruto = amount(rfaiInvest) * RFAI_TAXA_LITORAL.value;
  }
  const rfai = Math.min(rfaiBruto, coleta * (firstYears ? 1 : RFAI_LIMITE_COLETA.value));
  const sifideRate = sifideType === "startup"
    ? SIFIDE_TAXA_BASE.value + SIFIDE_TAXA_INCREMENTAL.value
    : sifideType === "pme_jovem"
      ? SIFIDE_TAXA_BASE.value + SIFIDE_MAJORACAO_PME_JOVEM.value
      : SIFIDE_TAXA_BASE.value;
  const sifideBruto = amount(sifideExpenses) * sifideRate;
  const sifide = Math.min(sifideBruto, Math.max(0, coleta - rfai));
  const contractual = Math.min(amount(contractualValue), Math.max(0, coleta - rfai - sifide));
  const potencialTotal = cent(rfai + sifide + contractual);
  const requested = amount(rfaiInvest) > 0 || amount(sifideExpenses) > 0 || amount(contractualValue) > 0;
  return {
    rfai: cent(rfai),
    rfaiBruto: cent(rfaiBruto),
    sifide: cent(sifide),
    sifideBruto: cent(sifideBruto),
    rfaiContratual: cent(contractual),
    total: 0,
    potencialTotal,
    status: requested ? "needs_professional_review" : "not_requested",
    blockers: requested
      ? [
          "Atividade, CAE, região legal e ativos elegíveis não foram documentalmente validados.",
          "Auxílios de Estado, cumulação, efeito de incentivo e capacidade de coleta carecem de dossier.",
          "SIFIDE exige certificação/elementos históricos; RFAI contratual exige contrato aprovado.",
        ]
      : [],
  };
}

function managerPayroll(monthlySalary: number): ResultadoPayrollGerente {
  const salary = amount(monthlySalary);
  const { result } = calculateLegacyPayroll({
    baseSalary: salary,
    weeklyHours: 40,
    dependants: 0,
    maritalStatus: "naoCasado",
    disability: false,
    region: "continente",
    meal: { enabled: false, days: 0, dailyAmount: 0, card: false },
  }, []);
  const employerContribution = result.baseSS * SS_DEPENDENTE.entidade.value;
  return {
    salarioBrutoMensal: salary,
    retencaoIRSMensal: result.irsTotal,
    ssTrabalhadorMensal: result.ssTrabalhador,
    ssEntidadeMensal: cent(employerContribution),
    liquidoMensal: result.liquido,
    custoEmpresaMensal: cent(result.brutoTotal + employerContribution),
  };
}

function marginalRate(taxableIncome: number): number {
  for (const bracket of ESCALOES_IRS.value) {
    if (bracket.ate === null || taxableIncome <= bracket.ate) return bracket.taxa;
  }
  return ESCALOES_IRS.value.at(-1)?.taxa ?? 0;
}

function annualManagerTax(
  salaryGross: number,
  dividends: number,
  englobed: boolean,
): number {
  const employeeSS = salaryGross * SS_DEPENDENTE.trabalhador.value;
  const specific = Math.min(
    salaryGross,
    Math.max(DEDUCAO_ESPECIFICA_DEPENDENTE.value, employeeSS),
  );
  const grossIncome = salaryGross + dividends;
  const taxableBeforeMinimum = Math.max(
    0,
    salaryGross - specific + (englobed ? dividends * DIV_INCLUSAO_ENGLOBAMENTO.value : 0),
  );
  const minimum = calcularAbatimentoMinimoExistencia({
    eligibleIncome: true,
    dependentTaxpayer: false,
    grossIncome,
    specificDeductions: specific,
    householdGrossIncome: grossIncome,
    householdNonEnglobedIncome: englobed ? 0 : dividends,
    householdTaxpayers: 1,
  });
  const taxable = Math.max(0, taxableBeforeMinimum - minimum.abatement);
  return cent(irsProgressivo(taxable) + adicionalSolidariedade(taxable));
}

function calculateCompany(input: CompanySimulationInput): ResultadoEmpresa {
  const payroll = managerPayroll(input.salarioGerenteMensal);
  const salGerente = cent(payroll.salarioBrutoMensal * 12);
  const ssSalGerente = cent(payroll.ssEntidadeMensal * 12);
  const totalCustos = cent(
    amount(input.despesasOper)
      + amount(input.custosExtra)
      + salGerente
      + ssSalGerente
      + amount(input.custoConstituicaoAnual)
      + amount(input.custoSedeVirtualAnual)
      + amount(input.custoRepresentanteFiscal),
  );
  const lucroTributavel = Math.max(0, amount(input.faturacao) - totalCustos);
  // Escala progressiva PME partilhada com `compararRegimes` — ver `coletaIRC`.
  const coleta = cent(coletaIRC(lucroTributavel, input.ircPME, input.ircGeral));

  const beneficios = calculatePotentialBenefits(
    coleta,
    input.rfaiInvest,
    input.rfaiRegiao,
    input.sifideDespesas,
    input.tipoSifide,
    input.primeirosAnos,
    input.rfaiContratualValor,
  );
  // Fail closed: potenciais sem dossier não reduzem a coleta.
  const ircAposBeneficios = cent(Math.max(0, coleta - beneficios.total));
  const ta = calcularTributacaoAutonomaEmpresa(
    input.encargosViatura,
    input.tipoViatura,
    input.despRepresentacao,
    input.ajudasCusto,
    input.naoDocumentadas,
    input.emPrejuizo,
    input.excecaoPrejuizo,
  );
  const derramaMuni = cent(lucroTributavel * input.derramaTaxa);
  const ircTotal = cent(ircAposBeneficios + ta.total + derramaMuni);
  const lucroLiquido = cent(Math.max(0, lucroTributavel - ircTotal));
  const dividendos = input.distribuirDividendos ? lucroLiquido : 0;

  const irsSalarioSemDividendos = annualManagerTax(salGerente, 0, false);
  const irsSalarioLiberatoria = annualManagerTax(salGerente, dividendos, false);
  const irsTotalEnglobamento = annualManagerTax(salGerente, dividendos, true);
  const irsDividendosLiberatoria = cent(dividendos * DIVIDENDOS_TAXA.value);
  const irsDividendosEnglobamento = cent(
    Math.max(0, irsTotalEnglobamento - irsSalarioSemDividendos),
  );
  const trabalhadorSSAnual = cent(payroll.ssTrabalhadorMensal * 12);
  const liquidoGerenteLiberatoria = cent(
    salGerente - trabalhadorSSAnual - irsSalarioLiberatoria
      + dividendos - irsDividendosLiberatoria,
  );
  const liquidoGerenteEnglobamento = cent(
    salGerente - trabalhadorSSAnual - irsTotalEnglobamento + dividendos,
  );
  const liquidoGerente = input.opcaoEnglobamento
    ? liquidoGerenteEnglobamento
    : liquidoGerenteLiberatoria;
  const irsSalarioGerente = input.opcaoEnglobamento
    ? irsSalarioSemDividendos
    : irsSalarioLiberatoria;
  const baseMarginal = Math.max(
    0,
    salGerente - Math.max(DEDUCAO_ESPECIFICA_DEPENDENTE.value, trabalhadorSSAnual),
  );

  return {
    faturacao: amount(input.faturacao),
    despesasOper: amount(input.despesasOper),
    custosExtra: amount(input.custosExtra),
    salGerente,
    ssSalGerente,
    custoConstituicao: amount(input.custoConstituicaoAnual),
    totalCustos,
    lucroTributavel,
    coleta,
    beneficios,
    ircAposBeneficios,
    ta,
    derramaMuni,
    ircTotal,
    lucroLiquido,
    dividendos,
    irsDividendosLiberatoria,
    irsDividendosEnglobamento,
    irsSalarioGerente,
    irsSalarioGerenteLiberatoria: irsSalarioLiberatoria,
    irsSalarioGerenteEnglobamento: irsSalarioSemDividendos,
    retencaoSalarioGerente: cent(payroll.retencaoIRSMensal * 12),
    taxaMarginalGerente: marginalRate(baseMarginal),
    liquidoGerenteLiberatoria,
    liquidoGerenteEnglobamento,
    liquidoGerente,
    taxaEfetiva: input.faturacao > 0 ? 1 - liquidoGerente / input.faturacao : 0,
    payrollGerente: payroll,
  };
}

/** Assinatura histórica do modo completo. */
export function simularEmpresa(
  faturacao: number,
  despesasOper: number,
  custosExtra: number,
  salGerenteMensal: number,
  distribuirDividendos: boolean,
  opcaoEnglobamento: boolean,
  encargosViatura: number,
  tipoViatura: Exclude<TipoViaturaEmpresa, "nenhuma">,
  despRepresentacao: number,
  ajudasCusto: number,
  naoDocumentadas: number,
  emPrejuizo: boolean,
  excecaoPrejuizo: boolean,
  rfaiInvest: number,
  regiaoRFAI: RegiaoRFAIEmpresa,
  sifideDespesas: number,
  tipoSifide: TipoEmpresaSifide,
  primeirosAnos: boolean,
  custoConstituicao: number,
  rfaiContratualValor: number,
): ResultadoEmpresa {
  return calculateCompany({
    faturacao,
    despesasOper,
    custosExtra,
    salarioGerenteMensal: salGerenteMensal,
    distribuirDividendos,
    opcaoEnglobamento,
    custoConstituicaoAnual: custoConstituicao,
    tipoViatura,
    encargosViatura,
    despRepresentacao,
    ajudasCusto,
    naoDocumentadas,
    emPrejuizo,
    excecaoPrejuizo,
    rfaiRegiao: regiaoRFAI,
    rfaiInvest,
    primeirosAnos,
    sifideDespesas,
    tipoSifide,
    rfaiContratualValor,
    ircPME: IRC_TAXA_PME.value,
    ircGeral: IRC_TAXA_GERAL.value,
    derramaTaxa: DERRAMA_MAX.value,
    custoSedeVirtualAnual: 0,
    custoRepresentanteFiscal: 0,
  });
}

/** Assinatura histórica do modo guiado. */
export function simularEmpresaGuiado(
  faturacao: number,
  despesasOper: number,
  custosEstrutura: number,
  salGerenteMensal: number,
  distribuirDividendos: boolean,
  opcaoEnglobamento: boolean,
  incluirConstituicao: boolean,
  custoConstituicaoVal: number,
  anosAmortizacao: number,
  tipoViatura: TipoViaturaEmpresa,
  encargosViatura: number,
  despRepresentacao: number,
  ajudasCusto: number,
  naoDocumentadas: number,
  emPrejuizo: boolean,
  excecaoPrejuizo: boolean,
  rfaiRegiao: RegiaoRFAIEmpresa,
  rfaiInvest: number,
  primeirosAnos: boolean,
  sifideDespesas: number,
  tipoSifide: TipoEmpresaSifide,
  rfaiContratualValor: number,
  temImovel: boolean,
  vptImovel: number,
  taxaIMI: number,
  isencaoIMI: boolean,
  valorAquisicao: number,
  isencaoIMT: boolean,
  anosAmortIMT: number,
  paramLocal?: ParametrosFiscaisRegiao,
  sedeVirtualCusto = 0,
  isEstrangeiro = false,
  custoRepFiscal = 0,
): ResultadoEmpresaGuiado {
  const safeYears = Math.max(1, Math.floor(anosAmortizacao));
  const custoConstituicao = incluirConstituicao ? amount(custoConstituicaoVal) / safeYears : 0;
  const custoSedeVirtual = amount(sedeVirtualCusto) * 12;
  const custoRepresentanteFiscal = isEstrangeiro ? amount(custoRepFiscal) : 0;
  const core = calculateCompany({
    faturacao,
    despesasOper,
    custosExtra: custosEstrutura,
    salarioGerenteMensal: salGerenteMensal,
    distribuirDividendos,
    opcaoEnglobamento,
    custoConstituicaoAnual: custoConstituicao,
    tipoViatura,
    encargosViatura,
    despRepresentacao,
    ajudasCusto,
    naoDocumentadas,
    emPrejuizo,
    excecaoPrejuizo,
    rfaiRegiao,
    rfaiInvest,
    primeirosAnos,
    sifideDespesas,
    tipoSifide,
    rfaiContratualValor,
    ircPME: paramLocal?.ircPME ?? IRC_TAXA_PME.value,
    ircGeral: paramLocal?.ircGeral ?? IRC_TAXA_GERAL.value,
    derramaTaxa: paramLocal?.derramaEstimada ?? DERRAMA_MAX.value,
    custoSedeVirtualAnual: custoSedeVirtual,
    custoRepresentanteFiscal,
  });
  const imiAnual = temImovel ? amount(vptImovel) * Math.max(0, taxaIMI) : 0;
  const poupancaIMI = temImovel && isencaoIMI ? imiAnual : 0;
  const imtOneTime = temImovel
    ? amount(valorAquisicao) * (IMT_TAXA_COMERCIAL.value + IS_TAXA_AQUISICAO.value)
    : 0;
  const poupancaIMT = temImovel && isencaoIMT ? imtOneTime : 0;
  const custoMunicipalAnual = temImovel
    ? imiAnual - poupancaIMI
      + (imtOneTime - poupancaIMT) / Math.max(1, Math.floor(anosAmortIMT))
    : 0;
  return {
    ...core,
    custosEstrutura: core.custosExtra,
    derrama: core.derramaMuni,
    irsDividendos: opcaoEnglobamento
      ? core.irsDividendosEnglobamento
      : core.irsDividendosLiberatoria,
    imiAnual: cent(imiAnual),
    poupancaIMI: cent(poupancaIMI),
    imtOneTime: cent(imtOneTime),
    poupancaIMT: cent(poupancaIMT),
    custoMunicipalAnual: cent(custoMunicipalAnual),
    custoRepresentanteFiscal,
    custoSedeVirtual,
  };
}
