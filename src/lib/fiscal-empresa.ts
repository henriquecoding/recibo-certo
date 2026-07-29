/**
 * Motor canónico dos simuladores de empresa.
 *
 * Nenhuma fórmula fiscal deve viver nos componentes React. As superfícies
 * completa e guiada conservam as assinaturas históricas através dos dois
 * adaptadores exportados no fim deste ficheiro, mas partilham esta execução.
 */
import {
  ADICIONAL_SOLIDARIEDADE,
  DEDUCAO_DEPENDENTE,
  DEDUCAO_DEPENDENTE_3MAIS,
  DEDUCAO_ESPECIFICA_DEPENDENTE,
  DERRAMA_MAX,
  DIVIDENDOS_TAXA,
  DIV_INCLUSAO_ENGLOBAMENTO,
  ESCALOES_IRS,
  IRC_LIMITE_PME,
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IFICI_TAXA,
  IS_TAXA_AQUISICAO,
  MOE_BASE_MINIMA_MENSAL,
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
import { calcularAbatimentoMinimoExistencia, irsProgressivo } from "./fiscal";
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
  /** Carga sobre a faturação medindo só o que chegou ao sócio. */
  taxaEfetiva: number;
  /** Lucro que ficou na empresa por não ter sido distribuído. */
  lucroRetido: number;
  /** Líquido pessoal + lucro retido — o que sobrou no conjunto. */
  riquezaTotal: number;
  /** Carga sobre a faturação medindo a riqueza total. */
  taxaEfetivaRiqueza: number;
  /** Viatura + representação + ajudas de custo: com TA, mas dedutíveis. */
  encargosDedutiveis: number;
  mesesSalarioGerente: 12 | 14;
  perfil: PerfilGerente;
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

/**
 * Perfil pessoal do gerente. Sem isto, a comparação com os recibos verdes
 * estava enviesada: do lado da Cat. B o simulador aceita dependentes,
 * tributação conjunta, região e deduções, e do lado da empresa o gerente era
 * sempre solteiro, sem filhos e no continente. A mesma pessoa era comparada
 * consigo própria sem filhos.
 */
export interface PerfilGerente {
  dependentes: number;
  conjunta: boolean;
  regiao: "continente" | "madeira" | "acores";
  /**
   * IFICI (Art. 58.º-A EBF): taxa de 20% sobre os rendimentos das categorias
   * A e B das atividades elegíveis. Os dividendos de fonte portuguesa ficam
   * de fora — seguem a taxa liberatória.
   */
  ifici: boolean;
}

export const PERFIL_GERENTE_PADRAO: PerfilGerente = {
  dependentes: 0,
  conjunta: false,
  regiao: "continente",
  ifici: false,
};

interface CompanySimulationInput {
  faturacao: number;
  despesasOper: number;
  custosExtra: number;
  salarioGerenteMensal: number;
  /** Salário pago em 12 ou 14 meses (subsídios de férias e Natal). */
  mesesSalarioGerente?: 12 | 14;
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
  perfil?: PerfilGerente;
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

function managerPayroll(
  monthlySalary: number,
  perfil: PerfilGerente = PERFIL_GERENTE_PADRAO,
): ResultadoPayrollGerente {
  const salary = amount(monthlySalary);
  const { result } = calculateLegacyPayroll({
    baseSalary: salary,
    weeklyHours: 40,
    dependants: Math.max(0, Math.floor(perfil.dependentes)),
    // Casado com um único titular: é a tabela que corresponde ao cenário
    // típico de quem abre a empresa sozinho e declara em conjunto.
    maritalStatus: perfil.conjunta ? "casadoUnico" : "naoCasado",
    disability: false,
    region: perfil.regiao,
    meal: { enabled: false, days: 0, dailyAmount: 0, card: false },
  }, []);

  // Art. 55.º do Código Contributivo: a base de incidência dos membros de
  // órgãos estatutários é a remuneração efetivamente auferida, COM O MÍNIMO
  // DE 1 IAS. `managerPayroll(0)` devolvia tudo a zero — e, como o comparador
  // assume salário zero, o erro entrava direto na resposta a «vale a pena
  // abrir empresa?».
  //
  // O mínimo não se aplica se o MOE acumular com outra atividade remunerada
  // cuja base contributiva já seja ≥ 1 IAS; isso o simulador não sabe, por
  // isso aplica o caso geral e a interface remete para o contabilista.
  const baseSSMinima = Math.max(result.baseSS, MOE_BASE_MINIMA_MENSAL.value);
  const employerContribution = baseSSMinima * SS_DEPENDENTE.entidade.value;
  const ssTrabalhador = salary > 0
    ? result.ssTrabalhador
    : cent(baseSSMinima * SS_DEPENDENTE.trabalhador.value);

  return {
    salarioBrutoMensal: salary,
    retencaoIRSMensal: result.irsTotal,
    ssTrabalhadorMensal: cent(Math.max(result.ssTrabalhador, ssTrabalhador)),
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

function solidarity(taxableIncome: number): number {
  const middle = Math.max(
    0,
    Math.min(taxableIncome, ADICIONAL_SOLIDARIEDADE.limiar2.value)
      - ADICIONAL_SOLIDARIEDADE.limiar1.value,
  );
  const upper = Math.max(0, taxableIncome - ADICIONAL_SOLIDARIEDADE.limiar2.value);
  return middle * ADICIONAL_SOLIDARIEDADE.taxa1.value
    + upper * ADICIONAL_SOLIDARIEDADE.taxa2.value;
}

function annualManagerTax(
  salaryGross: number,
  dividends: number,
  englobed: boolean,
  perfil: PerfilGerente = PERFIL_GERENTE_PADRAO,
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

  // IFICI (Art. 58.º-A EBF): 20% sobre os rendimentos das categorias A e B.
  //
  // A interface mostrava o badge «IFICI ativo», uma nota sobre o âmbito do
  // regime e um passo do plano de ação a dizer «Requerer estatuto IFICI na
  // AT» — e o motor nunca recebia a flag, porque a assinatura não a aceitava.
  // A copy prometia o benefício e os números continuavam nos escalões
  // progressivos.
  //
  // Os dividendos de fonte portuguesa (Cat. E) NÃO entram na taxa de 20%:
  // seguem a liberatória do Art. 71.º ou o englobamento. Aplicar-lhes os 20%
  // seria inventar um benefício que a lei não dá.
  if (perfil.ifici) {
    const salarioTributavel = Math.max(0, salaryGross - specific - minimum.abatement);
    const coletaSalario = salarioTributavel * IFICI_TAXA.value;
    if (!englobed) return cent(coletaSalario);
    // Com englobamento os dividendos são tributados pelos escalões, empilhados
    // por cima do rendimento que já ocupa os primeiros — a mesma lógica que o
    // motor de IRS usa para `outrosRendimentos`.
    const parteDividendos = dividends * DIV_INCLUSAO_ENGLOBAMENTO.value;
    const coletaDividendos =
      irsProgressivo(salarioTributavel + parteDividendos) - irsProgressivo(salarioTributavel);
    return cent(coletaSalario + Math.max(0, coletaDividendos));
  }

  // Deduções à coleta que o gerente também tem. Sem elas, a comparação com os
  // recibos verdes punha a mesma pessoa com filhos de um lado e sem filhos do
  // outro.
  const deducaoDependentes = deducaoPorDependentes(perfil.dependentes);
  const coleta = irsProgressivo(taxable) + solidarity(taxable);
  return cent(Math.max(0, coleta - deducaoDependentes));
}

/** Art. 78.º-A: 600 € pelos dois primeiros dependentes, 900 € do 3.º em diante. */
function deducaoPorDependentes(dependentes: number): number {
  const n = Math.max(0, Math.floor(dependentes));
  const primeiros = Math.min(n, 2);
  return primeiros * DEDUCAO_DEPENDENTE.value + Math.max(0, n - 2) * DEDUCAO_DEPENDENTE_3MAIS.value;
}

function calculateCompany(input: CompanySimulationInput): ResultadoEmpresa {
  const perfil = input.perfil ?? PERFIL_GERENTE_PADRAO;
  const payroll = managerPayroll(input.salarioGerenteMensal, perfil);
  // Subsídios de férias e Natal: `mensal × 12` assumia que o gerente não os
  // recebe. Recebe, salvo opção em contrário — daí a escolha 12/14.
  const mesesSalario = input.mesesSalarioGerente ?? 12;
  const salGerente = cent(payroll.salarioBrutoMensal * mesesSalario);
  const ssSalGerente = cent(payroll.ssEntidadeMensal * mesesSalario);

  // Encargos que a tributação autónoma atinge — e que, ao contrário do que
  // este cálculo fazia, TAMBÉM são custos fiscais dedutíveis.
  //
  // A TA era cobrada sobre eles em `ircTotal`, mas eles não abatiam ao lucro
  // tributável: a empresa pagava IRC sobre lucro que não teve, mais TA sobre o
  // encargo. Ou o utilizador introduzia o valor duas vezes (aqui e em despesas
  // operacionais), o que nada na interface dizia, ou o resultado estava
  // errado.
  //
  // As despesas NÃO DOCUMENTADAS são a exceção legítima: o Art. 23.º-A n.º 1
  // al. b) exclui-as da dedutibilidade — pagam TA de 50% e não abatem nada.
  const encargosDedutiveis = cent(
    amount(input.encargosViatura) + amount(input.despRepresentacao) + amount(input.ajudasCusto),
  );

  const totalCustos = cent(
    amount(input.despesasOper)
      + amount(input.custosExtra)
      + salGerente
      + ssSalGerente
      + encargosDedutiveis
      + amount(input.custoConstituicaoAnual)
      + amount(input.custoSedeVirtualAnual)
      + amount(input.custoRepresentanteFiscal),
  );
  const lucroTributavel = Math.max(0, amount(input.faturacao) - totalCustos);
  const coleta = cent(
    lucroTributavel <= IRC_LIMITE_PME.value
      ? lucroTributavel * input.ircPME
      : IRC_LIMITE_PME.value * input.ircPME
        + (lucroTributavel - IRC_LIMITE_PME.value) * input.ircGeral,
  );

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

  const irsSalarioSemDividendos = annualManagerTax(salGerente, 0, false, perfil);
  const irsSalarioLiberatoria = annualManagerTax(salGerente, dividendos, false, perfil);
  const irsTotalEnglobamento = annualManagerTax(salGerente, dividendos, true, perfil);
  const irsDividendosLiberatoria = cent(dividendos * DIVIDENDOS_TAXA.value);
  const irsDividendosEnglobamento = cent(
    Math.max(0, irsTotalEnglobamento - irsSalarioSemDividendos),
  );
  const trabalhadorSSAnual = cent(payroll.ssTrabalhadorMensal * mesesSalario);
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
    // ── Riqueza total: o lucro retido não desapareceu ──────────────────────
    //
    //  Com 100 000 € de faturação e sem distribuir dividendos, a "taxa
    //  efetiva" dava 85,9% — e 47 891 € estavam na conta da empresa. A
    //  interface tratava como catástrofe uma estratégia legítima e frequente.
    //
    //  Ficam as duas taxas, porque as duas leituras são verdadeiras: quanto
    //  chegou ao bolso do sócio este ano, e quanto sobrou no conjunto
    //  pessoa + empresa. Não distribuir adia o IRS dos dividendos; não o
    //  elimina — daí o nome ser «riqueza», não «líquido».
    lucroRetido: cent(Math.max(0, lucroLiquido - dividendos)),
    riquezaTotal: cent(liquidoGerente + Math.max(0, lucroLiquido - dividendos)),
    taxaEfetivaRiqueza:
      input.faturacao > 0
        ? 1 - (liquidoGerente + Math.max(0, lucroLiquido - dividendos)) / input.faturacao
        : 0,
    encargosDedutiveis,
    mesesSalarioGerente: mesesSalario,
    perfil,
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

// ─────────────────────────────────────────────────────────────────────────
//  ENTRADA POR OBJETO — a assinatura a usar daqui para a frente
//  ---------------------------------------------------------------------
//  As duas assinaturas históricas têm 20 e 30 argumentos posicionais, vários
//  deles booleanos adjacentes (`distribuirDividendos, opcaoEnglobamento,
//  incluirConstituicao`, depois `emPrejuizo, excecaoPrejuizo`, depois
//  `temImovel, …, isencaoIMI, …, isencaoIMT`). Trocar dois passa silenciosamente
//  pelo TypeScript — e foi assim que o IFICI ficou por ligar durante meses: a
//  flag estava no array de dependências do `useMemo` e nunca chegava ao motor,
//  porque a assinatura não a aceitava.
//
//  Ficam as duas antigas, para não obrigar a reescrever tudo de uma vez, mas
//  os chamadores novos usam estas.
// ─────────────────────────────────────────────────────────────────────────

export interface OpcoesEmpresa {
  faturacao: number;
  despesasOper?: number;
  custosExtra?: number;
  salarioGerenteMensal?: number;
  mesesSalarioGerente?: 12 | 14;
  distribuirDividendos?: boolean;
  opcaoEnglobamento?: boolean;
  custoConstituicaoAnual?: number;
  tipoViatura?: TipoViaturaEmpresa;
  encargosViatura?: number;
  despRepresentacao?: number;
  ajudasCusto?: number;
  naoDocumentadas?: number;
  emPrejuizo?: boolean;
  excecaoPrejuizo?: boolean;
  rfaiRegiao?: RegiaoRFAIEmpresa;
  rfaiInvest?: number;
  primeirosAnos?: boolean;
  sifideDespesas?: number;
  tipoSifide?: TipoEmpresaSifide;
  rfaiContratualValor?: number;
  custoSedeVirtualAnual?: number;
  custoRepresentanteFiscal?: number;
  /** Taxas locais (regiões autónomas / interior). */
  paramLocal?: ParametrosFiscaisRegiao;
  perfil?: PerfilGerente;
}

/** Ponto de entrada canónico do motor de empresa. */
export function simularEmpresaOpcoes(opcoes: OpcoesEmpresa): ResultadoEmpresa {
  return calculateCompany({
    faturacao: opcoes.faturacao,
    despesasOper: opcoes.despesasOper ?? 0,
    custosExtra: opcoes.custosExtra ?? 0,
    salarioGerenteMensal: opcoes.salarioGerenteMensal ?? 0,
    mesesSalarioGerente: opcoes.mesesSalarioGerente ?? 12,
    distribuirDividendos: opcoes.distribuirDividendos ?? false,
    opcaoEnglobamento: opcoes.opcaoEnglobamento ?? false,
    custoConstituicaoAnual: opcoes.custoConstituicaoAnual ?? 0,
    tipoViatura: opcoes.tipoViatura ?? "nenhuma",
    encargosViatura: opcoes.encargosViatura ?? 0,
    despRepresentacao: opcoes.despRepresentacao ?? 0,
    ajudasCusto: opcoes.ajudasCusto ?? 0,
    naoDocumentadas: opcoes.naoDocumentadas ?? 0,
    emPrejuizo: opcoes.emPrejuizo ?? false,
    excecaoPrejuizo: opcoes.excecaoPrejuizo ?? false,
    rfaiRegiao: opcoes.rfaiRegiao ?? "litoral",
    rfaiInvest: opcoes.rfaiInvest ?? 0,
    primeirosAnos: opcoes.primeirosAnos ?? false,
    sifideDespesas: opcoes.sifideDespesas ?? 0,
    tipoSifide: opcoes.tipoSifide ?? "pme_normal",
    rfaiContratualValor: opcoes.rfaiContratualValor ?? 0,
    ircPME: opcoes.paramLocal?.ircPME ?? IRC_TAXA_PME.value,
    ircGeral: opcoes.paramLocal?.ircGeral ?? IRC_TAXA_GERAL.value,
    derramaTaxa: opcoes.paramLocal?.derramaEstimada ?? DERRAMA_MAX.value,
    custoSedeVirtualAnual: opcoes.custoSedeVirtualAnual ?? 0,
    custoRepresentanteFiscal: opcoes.custoRepresentanteFiscal ?? 0,
    perfil: opcoes.perfil,
  });
}

export interface OpcoesEmpresaGuiado extends OpcoesEmpresa {
  /** Custo de constituição a amortizar (bruto) e por quantos anos. */
  incluirConstituicao?: boolean;
  custoConstituicao?: number;
  anosAmortizacao?: number;
  /** Sede virtual: valor MENSAL (anualizado internamente). */
  sedeVirtualCustoMensal?: number;
  isEstrangeiro?: boolean;
  custoRepFiscal?: number;
  temImovel?: boolean;
  vptImovel?: number;
  taxaIMI?: number;
  isencaoIMI?: boolean;
  valorAquisicao?: number;
  isencaoIMT?: boolean;
  anosAmortIMT?: number;
}

/** Ponto de entrada canónico do modo guiado de empresa. */
export function simularEmpresaGuiadoOpcoes(
  o: OpcoesEmpresaGuiado,
): ResultadoEmpresaGuiado {
  return simularEmpresaGuiado(
    o.faturacao,
    o.despesasOper ?? 0,
    o.custosExtra ?? 0,
    o.salarioGerenteMensal ?? 0,
    o.distribuirDividendos ?? false,
    o.opcaoEnglobamento ?? false,
    o.incluirConstituicao ?? false,
    o.custoConstituicao ?? 0,
    o.anosAmortizacao ?? 1,
    o.tipoViatura ?? "nenhuma",
    o.encargosViatura ?? 0,
    o.despRepresentacao ?? 0,
    o.ajudasCusto ?? 0,
    o.naoDocumentadas ?? 0,
    o.emPrejuizo ?? false,
    o.excecaoPrejuizo ?? false,
    o.rfaiRegiao ?? "litoral",
    o.rfaiInvest ?? 0,
    o.primeirosAnos ?? false,
    o.sifideDespesas ?? 0,
    o.tipoSifide ?? "pme_normal",
    o.rfaiContratualValor ?? 0,
    o.temImovel ?? false,
    o.vptImovel ?? 0,
    o.taxaIMI ?? 0,
    o.isencaoIMI ?? false,
    o.valorAquisicao ?? 0,
    o.isencaoIMT ?? false,
    o.anosAmortIMT ?? 1,
    o.paramLocal,
    o.sedeVirtualCustoMensal ?? 0,
    o.isEstrangeiro ?? false,
    o.custoRepFiscal ?? 0,
    o.perfil ?? PERFIL_GERENTE_PADRAO,
    o.mesesSalarioGerente ?? 12,
  );
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
  perfil: PerfilGerente = PERFIL_GERENTE_PADRAO,
  mesesSalarioGerente: 12 | 14 = 12,
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
    perfil,
    mesesSalarioGerente,
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
