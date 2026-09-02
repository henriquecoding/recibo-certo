import "server-only";

// ═══════════════════════════════════════════════════════════════════════
//  OS NÚMEROS DOS TRÊS PALCOS NOVOS — calculados aqui, no servidor
//  ---------------------------------------------------------------------
//  Nenhum destes valores é escrito à mão. Saem dos mesmos motores que as
//  ferramentas usam, e por isso não podem divergir delas.
//
//  Já aconteceu: os cartões do Hero de recibo verde e de vencimento
//  estavam escritos à mão e a Segurança Social de um recibo de 2 000 €
//  tinha 299 € por alguém ter truncado 299,60 em vez de arredondar. Um
//  valor a menos não é grave; o mecanismo que o deixou envelhecer sozinho
//  é que era.
//
//  Para o cliente atravessam só as strings e os números que a demonstração
//  desenha — os motores ficam deste lado da fronteira.
// ═══════════════════════════════════════════════════════════════════════

import { calcular } from "@/lib/fiscal";
import { calcularVencimento, compararCategorias } from "@/lib/fiscal-dependente";
import { proximoPagamentoSS } from "@/lib/fiscal-ss-prazos";
import { REGIME_SIMPLIFICADO } from "@/lib/fiscal-data";
import { AVENCA_SOCIEDADE_ANUAL_MEDIA } from "@/lib/contabilista";
import type { DadosRecibo } from "@/components/foco/recibos/PalcoRecibos";
import type { DadosSalario } from "@/components/foco/salario/PalcoSalario";
import type { DadosContratacao } from "@/components/foco/salario/PalcoContratacao";
import type { DadosEmpresa, PontoComparacao } from "@/components/foco/empresa/PalcoEmpresa";
import {
  eurFromDecimal,
  planEmploymentOffer,
  productiveShareRate,
  ratePpm,
} from "../../../ReciboCerto-Fiscal-Engine/src";
import { resolverReleasePatronal } from "@/lib/motor/release";

const RECIBO_EXEMPLO = 2_000;
const SALARIO_EXEMPLO = 1_500;
const FATURACAO_EXEMPLO = 30_000;

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

/** «20 de julho», a partir de uma data. */
const porExtenso = (d: Date) => `${d.getDate()} de ${MESES[d.getMonth()]}`;

// ── Recibos verdes ────────────────────────────────────────────────────

/**
 * Um recibo de 2 000 € ao abrigo do Art. 151.º, atividade estabelecida
 * (2.º ano ou seguinte). É o mesmo exemplo que a homepage antiga usava,
 * agora com a data do próximo pagamento à Segurança Social a sério.
 */
export function dadosRecibo(agora = new Date()): DadosRecibo {
  const r = calcular({
    bruto: RECIBO_EXEMPLO,
    tipo: "art151",
    regiao: "continente",
    regimeIVA: "isento",
    baseSS: "servicos",
    dispensaRetencao: false,
    isencaoSSPrimeiroAno: false,
    acumulaEmprego: false,
  });

  const prazo = proximoPagamentoSS(agora);
  const dias = Math.max(
    0,
    Math.ceil((prazo.getTime() - agora.getTime()) / 86_400_000),
  );

  return {
    bruto: r.bruto,
    liquido: r.liquido,
    retencaoIRS: r.retencaoIRS,
    segSocial: r.segSocial,
    taxaRetencao: r.taxaRetencao,
    prazoSS: porExtenso(prazo),
    diasParaPrazo: dias,
  };
}

// ── Salário ───────────────────────────────────────────────────────────

/**
 * O erro encenado é REAL e comum: a entidade aplicou a tabela de retenção
 * sem o dependente que a pessoa declarou. É o tipo de engano que ninguém
 * apanha a olho e que só se vê pondo as duas contas lado a lado — que é
 * exatamente o que este palco existe para fazer.
 *
 * As duas colunas saem do mesmo motor com a única diferença a ser o
 * dependente. Inventar a linha errada à mão seria encenar uma auditoria
 * em vez de a fazer.
 */
export function dadosSalario(): DadosSalario {
  const comDependente = calcularVencimento({
    salarioBruto: SALARIO_EXEMPLO,
    dependentes: 1,
  });
  const semDependente = calcularVencimento({
    salarioBruto: SALARIO_EXEMPLO,
    dependentes: 0,
  });

  const diferencaMensal = Math.abs(comDependente.liquido - semDependente.liquido);

  return {
    bruto: comDependente.bruto,
    ss: comDependente.ssTrabalhador,
    // O recibo aplicou a tabela SEM o dependente — reteve a mais.
    irsRecibo: semDependente.irsRetido,
    irsCerto: comDependente.irsRetido,
    liquidoRecibo: semDependente.liquido,
    liquidoCerto: comDependente.liquido,
    // Projeção condicional: doze vencimentos e os dois subsídios, caso a
    // mesma tabela errada seja repetida em cada um desses pagamentos.
    pagamentosProjetados: 14,
    diferenca14Pagamentos: diferencaMensal * 14,
    motivo:
      "A retenção foi calculada pela tabela de quem não tem dependentes. Com um dependente declarado, a tabela é outra e a retenção é mais baixa.",
  };
}

// ── Planeamento da contratação ────────────────────────────────────────

/** O cenário de demonstração vive no release; aqui fica só o ID. */
const DEMO_SCENARIO_ID = "pt-employer-2026.demo.primeira-contratacao";
const DEMO_AS_OF = "2026-08-31" as const;
const DEMO_WORK_PERIOD = "2026-09" as const;
const DEMO_PAY_DATE = "2026-09-30" as const;

/**
 * A demonstração patronal usa exatamente o mesmo motor da ferramenta.
 * Para o browser seguem apenas números serializáveis; regras, tabelas e
 * resolução inversa ficam no servidor e fora do chunk da homepage.
 */
export function dadosContratacao(): DadosContratacao {
  // O cenário da homepage é o cenário do RELEASE, resolvido por ID. Antes,
  // este ficheiro repetia 42 000 €, 1 500 €, 10,20 € e 65% à mão, e a
  // ferramenta repetia-os outra vez: o comentário «usa exatamente o mesmo
  // motor» era verdade quanto ao algoritmo e mentira quanto aos
  // pressupostos (relatório, MOT-P0-015, P0-12).
  const selecao = resolverReleasePatronal({
    simulationAsOf: DEMO_AS_OF,
    workPeriod: DEMO_WORK_PERIOD,
    payDate: DEMO_PAY_DATE,
    jurisdiction: "PT-CONTINENTE",
  });
  if (selecao.kind !== "ready") {
    throw new Error("Não há release patronal publicado para a demonstração da homepage.");
  }
  const demo = selecao.bundle.release.demoScenarios.find(
    (cenario) => cenario.id === DEMO_SCENARIO_ID,
  );
  if (!demo) {
    throw new Error(`O release ativo não traz o cenário de demonstração ${DEMO_SCENARIO_ID}.`);
  }

  const orcamentoAnual = demo.annualBudget.cents / 100;
  const margemSegurancaPercentagem = 5;
  const seguroAnual = 480;
  const sstAnual = 220;
  const preparacao = planEmploymentOffer({
    context: {
      simulationAsOf: DEMO_AS_OF,
      workPeriod: DEMO_WORK_PERIOD,
      payDate: DEMO_PAY_DATE,
      contractStart: demo.startDate,
      jurisdiction: demo.jurisdiction,
    },
    goal: "employer_budget",
    employer: {
      contributionRegime: "regime_geral",
      annualBudget: demo.annualBudget,
      safetyMargin: ratePpm(margemSegurancaPercentagem * 10_000),
    },
    role: {
      contractKind: "permanent",
      workingTime: {
        normalWeeklyHoursHundredths: demo.weeklyHoursHundredths,
        workingWeekdays: [1, 2, 3, 4, 5],
        regime: "standard",
        basis: "none",
      },
      collectiveAgreement: { status: "none" },
      mainVacationMonth: 8,
      productive: true,
      productiveShare: demo.productiveShare,
    },
    package: {
      baseSalaryMonthly: eurFromDecimal(0),
      subsidyPayment: "normal",
      mealAllowance: {
        dailyAmount: demo.mealDaily,
        method: "card_or_voucher",
      },
    },
    // A demonstração mostra um posto INTEIRO. Enquanto o seguro obrigatório
    // ficava de fora, o palco anunciava «a proposta cabe» com uma lacuna
    // dentro (relatório, CON-P0-00B).
    postCosts: {
      accidentInsurance: { kind: "estimated", amount: eurFromDecimal(seguroAnual), basis: "prémio médio de referência; depende da atividade e da seguradora" },
      healthAndSafety: { kind: "estimated", amount: eurFromDecimal(sstAnual), basis: "avença de serviço externo de SST" },
      training: { kind: "confirmed", amount: eurFromDecimal(0) },
      equipmentFirstYear: { kind: "confirmed", amount: eurFromDecimal(1_200) },
      recruitmentFirstYear: { kind: "confirmed", amount: eurFromDecimal(0) },
      software: { kind: "confirmed", amount: eurFromDecimal(0) },
      remoteWork: { kind: "confirmed", amount: eurFromDecimal(0) },
      other: { kind: "confirmed", amount: eurFromDecimal(0) },
    },
    capacity: {
      contributionMargin: demo.productiveShare,
      expectedBillableHoursMonthly: 100,
    },
  }, selecao.bundle);

  if (preparacao.kind !== "ready") {
    throw new Error("A demonstração patronal deixou de produzir um resultado suportado.");
  }

  const resultado = preparacao.result;
  const liquido = resultado.workerOutcome.monthlyReference;
  const encargos = resultado.publicCharges.total;
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ A REPARTIÇÃO É DO MOTOR, NÃO DO PALCO                             │
  // │                                                                   │
  // │ O ato do pacote mostra o orçamento a partir-se nas parcelas do    │
  // │ posto. Sem isto, o palco teria de as compor à mão — multiplicar   │
  // │ a refeição pelos dias, aplicar 23,75% ao bruto — e seria a        │
  // │ terceira cópia da mesma aritmética, livre de divergir das outras  │
  // │ duas no dia em que uma taxa mudasse. `breakdown` já existe no     │
  // │ resultado e é a mesma soma que produz `annualStabilized`.         │
  // └───────────────────────────────────────────────────────────────────┘
  const parcelas = resultado.employerCost.breakdown;

  return {
    orcamentoAnual,
    margemSegurancaPercentagem,
    orcamentoUtilizavel: orcamentoAnual * (1 - margemSegurancaPercentagem / 100),
    vencimentoBaseMensal: resultado.resolvedBaseSalaryMonthly.cents / 100,
    refeicaoDia: demo.mealDaily.cents / 100,
    refeicaoDiasElegiveis: resultado.workCalendar.mealEligibleDays,
    seguroAnual,
    sstAnual,
    prontidao: resultado.status.readiness,
    veredicto: resultado.status.headline,
    custoAnual: resultado.employerCost.annualStabilized.cents / 100,
    custoPrimeiroAno: resultado.employerCost.firstCalendarYear.cents / 100,
    picoTesouraria: resultado.employerCost.peakMonth
      ? {
          mes: resultado.employerCost.peakMonth.month,
          valor: resultado.employerCost.peakMonth.amount.cents / 100,
        }
      : null,
    liquidoMensalMinimo: ("min" in liquido ? liquido.min : liquido).cents / 100,
    liquidoMensalMaximo: ("max" in liquido ? liquido.max : liquido).cents / 100,
    encargosPublicosMinimos: ("min" in encargos ? encargos.min : encargos).cents / 100,
    encargosPublicosMaximos: ("max" in encargos ? encargos.max : encargos).cents / 100,
    custoHoraProdutiva: resultado.capacity?.costPerProductiveHour?.cents
      ? resultado.capacity.costPerProductiveHour.cents / 100
      : null,
    receitaAnualNecessaria: resultado.capacity?.revenueRequired?.cents
      ? resultado.capacity.revenueRequired.cents / 100
      : null,
    horasProdutivasAno: resultado.capacity
      ? resultado.capacity.annualProductiveHoursHundredths / 100
      : null,
    parcelas: {
      salarioEsubsidios: parcelas.cashCompensation.cents / 100,
      refeicao: parcelas.mealAllowance.cents / 100,
      tsuPatronal: parcelas.employerSocialSecurity.cents / 100,
      // Tudo o que o posto obriga e é RECORRENTE. `equipment` e
      // `recruitment` ficam de fora porque são custos de arranque e o
      // total que a cena reparte é `annualStabilized`, o ano recorrente —
      // somá-los aqui punha a barra composta a exceder o próprio total.
      // Que as quatro parcelas continuem a somar `custoAnual` é uma
      // asserção de `coreografia-contratacao.test.ts`, não uma esperança.
      posto:
        (parcelas.accidentInsurance.cents +
          parcelas.healthAndSafety.cents +
          parcelas.benefits.cents +
          parcelas.training.cents +
          parcelas.software.cents +
          parcelas.remoteWork.cents +
          parcelas.other.cents) /
        100,
    },
  };
}

// ── Empresa ───────────────────────────────────────────────────────────

// ┌───────────────────────────────────────────────────────────────────────┐
// │ A CONTABILIDADE ERA NARRADA E NÃO ERA DESCONTADA                      │
// │                                                                       │
// │ O palco dizia, por palavras e em `sr-only`, que «ter empresa custa    │
// │ cerca de 1 920 € por ano em contabilidade, antes de qualquer          │
// │ imposto, e é esse custo que empurra o ponto de viragem para a         │
// │ direita». Mas `compararCategorias` recebia o cenário SEM              │
// │ `custosEmpresa`, e o seu valor por omissão é zero. O ponto de         │
// │ viragem publicado era o de uma sociedade que não paga contabilista.   │
// │                                                                       │
// │ `empresaSemCustos` — o «contrafactual» — era `liquido + avença`, ou   │
// │ seja: um custo que nunca tinha sido subtraído, somado de volta. Não   │
// │ havia fosso nenhum para mostrar porque não havia fosso nenhum.        │
// │                                                                       │
// │ Com a avença contada, a viragem passa de ~148 000 € para ~180 500 €.  │
// │ É uma resposta diferente e é a verdadeira — e diz uma coisa que a     │
// │ anterior escondia: com os lucros todos retirados, a sociedade só      │
// │ passa à frente perto do TETO do regime simplificado.                  │
// └───────────────────────────────────────────────────────────────────────┘

/**
 * A escala vai de 15 000 € à referência de 200 000 € do regime
 * simplificado.
 *
 * O Art. 28.º, n.º 2, do CIRS usa este montante como condição de acesso.
 * A cessação do regime, porém, obedece às regras próprias do n.º 6 — não
 * acontece automaticamente ao primeiro euro acima. A página usa os
 * 200 000 € como fronteira editorial comparável, sem a apresentar como uma
 * mudança instantânea e universal de regime.
 */
const ESCALA_MIN = 15_000;
const ESCALA_MAX = REGIME_SIMPLIFICADO.limite.value;
const DEGRAU = 5_000;

/** Os pressupostos da cena, num sítio só. Ver a secção «Fontes» da página. */
const PRESSUPOSTOS = {
  dependentes: 0,
  custosEmpresa: AVENCA_SOCIEDADE_ANUAL_MEDIA,
} as const;

/**
 * Um cenário, com a diferença de líquido e a decomposição dos dois caminhos.
 *
 * A curva usa os líquidos; as parcelas ficam no payload para explicar e
 * testar a resposta. Cada lado continua a somar a faturação: é a identidade
 * do motor (`bruto = líquido + o que sai`), não um detalhe do desenho.
 */
const pontoEmpresa = (faturacao: number): PontoComparacao => {
  const c = compararCategorias({ brutoAnual: faturacao, ...PRESSUPOSTOS });
  const semCusto = compararCategorias({ brutoAnual: faturacao, dependentes: 0 });
  return {
    faturacao,
    freelancer: Math.round(c.freelancer.liquido),
    empresa: Math.round(c.empresa.liquido),
    // Contrafactual calculado de novo pelo motor — não se soma a avença ao
    // líquido, porque a contabilidade é custo dedutível e também altera IRC,
    // derrama e dividendos.
    empresaSemCustos: Math.round(semCusto.empresa.liquido),
    rv: {
      irs: Math.round(c.freelancer.irs),
      ss: Math.round(c.freelancer.ss),
    },
    soc: {
      // IRC e derrama juntos: a derrama são 1,5% do lucro e sozinha nunca
      // chega a ser uma fatia visível. Separá-la seria uma linha de legenda
      // a apontar para dois pixéis.
      irc: Math.round(c.empresa.irc + c.empresa.derrama),
      dividendos: Math.round(c.empresa.dividendos),
      contabilidade: Math.round(c.empresa.custosEmpresa),
    },
  };
};

/**
 * A faturação a partir da qual a sociedade passa à frente.
 *
 * Varre em dois passos — degraus de 5 000 € para encontrar o intervalo,
 * depois 250 € dentro dele. A varredura fina de ponta a ponta custava
 * ~370 simulações fiscais por pedido numa rota que é dinâmica; esta custa
 * menos de sessenta e dá a mesma resposta ao quarto de milhar.
 */
function encontrarViragem(): number | null {
  const ganha = (f: number) => {
    const c = compararCategorias({ brutoAnual: f, ...PRESSUPOSTOS });
    return c.empresa.liquido > c.freelancer.liquido;
  };
  let anterior = ESCALA_MIN;
  for (let f = ESCALA_MIN; f <= ESCALA_MAX; f += DEGRAU) {
    if (ganha(f)) {
      for (let fino = anterior; fino <= f; fino += 250) if (ganha(fino)) return fino;
      return f;
    }
    anterior = f;
  }
  return null;
}

/** Memória do processo: a cena não depende da data nem do pedido. */
let cacheEmpresa: DadosEmpresa | null = null;

/**
 * Os dois caminhos repartidos euro a euro, e o ponto onde se cruzam.
 *
 * Tudo o que atravessa a fronteira já são respostas: o browser escolhe
 * entre cenários calculados aqui e nunca reimplementa a conta a cada pixel
 * nem recebe o motor fiscal no pacote.
 */
export function dadosEmpresa(): DadosEmpresa {
  if (cacheEmpresa) return cacheEmpresa;

  const cruzamento = encontrarViragem();
  const degraus = Array.from(
    { length: Math.floor((ESCALA_MAX - ESCALA_MIN) / DEGRAU) + 1 },
    (_, indice) => ESCALA_MIN + indice * DEGRAU,
  );

  // O ponto exato da viragem entra na régua mesmo quando não cai num dos
  // degraus de 5 000 €. Assim é possível pousar precisamente na resposta
  // que o palco destaca — sem interpolar nem arredondar no cliente.
  const cenarios = [...new Set([...degraus, ...(cruzamento ? [cruzamento] : [])])]
    .sort((a, b) => a - b)
    .map(pontoEmpresa);

  const exemplo = compararCategorias({ brutoAnual: FATURACAO_EXEMPLO, ...PRESSUPOSTOS });

  cacheEmpresa = {
    cenarios,
    cruzamento,
    limiteSimplificado: ESCALA_MAX,
    custoFixo: Math.round(AVENCA_SOCIEDADE_ANUAL_MEDIA),
    exemplo: FATURACAO_EXEMPLO,
    exemploFreelancer: Math.round(exemplo.freelancer.liquido),
    exemploEmpresa: Math.round(exemplo.empresa.liquido),
  };
  return cacheEmpresa;
}
