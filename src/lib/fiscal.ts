// ═══════════════════════════════════════════════════════════════════════
//  MOTOR DE CÁLCULO — recibos verdes (trabalhadores independentes PT 2026)
//
//  Modelo de TESOURARIA por recibo: estima o que entra na conta e o que
//  deves reservar (retenção de IRS, IVA, Segurança Social). NÃO é o
//  apuramento final de IRS — esse depende do regime simplificado, dos
//  escalões progressivos e do englobamento anual (ver `rendimentoTributavel`).
//
//  Todos os parâmetros vêm de `fiscal-data.ts` (fonte de verdade verificada).
// ═══════════════════════════════════════════════════════════════════════

import {
  RETENCAO,
  DISPENSA_RETENCAO_LIMITE,
  IVA_TAXAS,
  IVA_ISENCAO_LIMITE,
  SS_TAXA,
  SS_COEFICIENTE,
  SS_BASE_MAX_MENSAL,
  SS_ACUMULACAO_LIMITE_MENSAL,
  REGIME_SIMPLIFICADO,
  IRS_JOVEM,
  ESCALOES_IRS,
  DEDUCAO_ESPECIFICA_CATB,
  REGIME_15PCT,
  MINIMO_EXISTENCIA,
  MINIMO_EXISTENCIA_FORMULA,
  ADICIONAL_SOLIDARIEDADE,
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IRC_LIMITE_PME,
  DERRAMA_MAX,
  DIVIDENDOS_TAXA,
  COEFICIENTE_POR_TIPO,
  BASE_SS_POR_TIPO,
  REDUCAO_COEFICIENTE_ANO,
  DEDUCAO_DEPENDENTE,
  DEDUCAO_DEPENDENTE_3MAIS,
  DEDUCAO_DESP_GERAIS,
  DEDUCAO_SAUDE,
  DEDUCAO_EDUCACAO,
  QUOCIENTE_CONJUGAL,
  LIMITE_GLOBAL_DEDUCOES,
  LIMITE_GLOBAL_MAJORACAO_DEPENDENTES,
  DEDUCAO_ESPECIFICA_DEP_MAX_ORDENS,
  QUOTIZACOES_SINDICAIS,
  IAS_VALUE,
  CATEGORIA_F,
  // Tributação Autónoma
  // Deficiência e extras
  EXCLUSAO_DEFICIENCIA_TAXA,
  EXCLUSAO_DEFICIENCIA_MAX,
  DEDUCAO_DEFICIENCIA_COLETA,
  DEDUCAO_DEPENDENTE_DEFICIENCIA,
  DEDUCAO_RENDAS,
  DEDUCAO_DEPENDENTE_BEBE,
  SS_MIN_MENSAL,
  // Benefícios fiscais IRC
  RFAI_TAXA_INTERIOR,
  RFAI_TAXA_INTERIOR_EXCEDENTE,
  RFAI_TAXA_LITORAL,
  RFAI_LIMITE_INVESTIMENTO_INTERIOR,
  RFAI_LIMITE_COLETA,
  SIFIDE_TAXA_BASE,
  SIFIDE_TAXA_INCREMENTAL,
  SIFIDE_TETO_INCREMENTAL,
  SIFIDE_MAJORACAO_PME_JOVEM,
  // IFICI e Deficiência (Art. 56.º-A + 87.º CIRS)
  IFICI_TAXA,
  // Categoria G — mais-valias (mobiliárias, criptoativos, imóveis) + estrangeiros
  MAIS_VALIAS_MOBILIARIAS_TAXA,
  CRIPTO_TAXA_CURTO_PRAZO,
  MAIS_VALIAS_IMOBILIARIO_INCLUSAO,
  DIV_INCLUSAO_ENGLOBAMENTO,
  DEDUCAO_ESPECIFICA_DEPENDENTE,
  DEDUCAO_PPR,
  DEDUCAO_DONATIVOS,
  DEDUCAO_ASCENDENTE,
  DEDUCAO_ASCENDENTE_UNICO,
  DEDUCAO_PENSAO_ALIMENTOS,
  DEDUCAO_LARES,
  type TipoAtividade,
  type Regiao,
  type EscalaoIVA,
  type BaseSS,
  type DuracaoArrendamento,
  type TAViaturasTaxas,
} from "./fiscal-data";
import { fmt, pct } from "./format";

export type { TipoAtividade, Regiao, EscalaoIVA, BaseSS, DuracaoArrendamento };

/** Regime de IVA escolhido: isento ou uma das três taxas regionais. */
export type RegimeIVA = "isento" | EscalaoIVA;

export interface CalcInput {
  /** Valor do recibo, sem IVA. */
  bruto: number;
  tipo: TipoAtividade;
  regiao: Regiao;
  regimeIVA: RegimeIVA;
  baseSS: BaseSS;
  /** Dispensa de retenção (1.º ano ou rendimento anual < limite legal). */
  dispensaRetencao: boolean;
  /** Isenção de SS nos primeiros 12 meses de atividade. */
  isencaoSSPrimeiroAno: boolean;
  /** Acumulação com trabalho dependente que já cobre a SS. */
  acumulaEmprego: boolean;
  /** Ano de benefício do IRS Jovem (1 a 10) ou 0/undefined se não aplicável. */
  irsJovemAno?: number;
  /** Taxa de retenção da atividade (regime especial), se diferente do `tipo`. */
  retencaoOverride?: number;
}

export interface CalcResult {
  bruto: number;
  retencaoIRS: number;
  iva: number;
  segSocial: number;
  /** O que efetivamente fica para o trabalhador (bruto − retenção − SS). */
  liquido: number;
  /** Valor que entra na conta bancária (bruto + IVA − retenção). */
  entradaConta: number;
  taxaRetencao: number;
  taxaIVA: number;
  /** Percentagem de isenção do IRS Jovem aplicada (0 a 1). */
  isencaoJovem: number;
  /** Avisos contextuais (limiares ultrapassados, etc.). */
  avisos: string[];
}

const sanitize = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** Taxa de IVA efetiva para a região e regime escolhidos. */
export function taxaIVAEfetiva(regiao: Regiao, regime: RegimeIVA): number {
  if (regime === "isento") return 0;
  return IVA_TAXAS[regiao].value[regime];
}

/** Isenção do IRS Jovem para o ano de benefício indicado (0 se inaplicável). */
export function isencaoIRSJovem(ano?: number): number {
  if (!ano || ano < 1) return 0;
  return IRS_JOVEM.isencaoPorAno.value[ano] ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────
//  SEGURANÇA SOCIAL DO TRABALHADOR INDEPENDENTE — um só cálculo
//  ---------------------------------------------------------------------
//  Havia três versões disto no motor e as três discordavam:
//
//    · `calcular()` aplicava o teto mas não o mínimo mensal;
//    · o `ssAnual` de `simularIRSAnual` aplicava teto e mínimo, mas tratava
//      a acumulação com emprego como isenção TOTAL;
//    · a regra dos 15% (Art. 31.º n.º 13) usava sempre o coeficiente de
//      serviços, sem teto e sem olhar a isenções — a 200 000 € de faturação
//      creditava 29 960 € de contribuições contra uns reais de 16 552 €.
//
//  As três decidem a mesma coisa: quanto se paga de Segurança Social. Passa a
//  ser esta função a decidi-lo, e cada chamador escolhe apenas o período.
// ─────────────────────────────────────────────────────────────────────────

export interface IsencoesSS {
  /**
   * Art. 157.º n.º 1 al. b): primeiros 12 meses de atividade. Isenção total —
   * esta é mesmo uma isenção.
   */
  primeiroAno?: boolean;
  /**
   * Art. 157.º n.º 1 al. a): acumulação com trabalho por conta de outrem.
   * Dispensa **condicionada** — só vale enquanto o rendimento relevante
   * mensal médio ficar abaixo de 4 × IAS. Acima, contribui-se sobre o
   * excedente e sem contribuição mínima.
   */
  acumulaEmprego?: boolean;
}

export interface ContribuicoesSS {
  /** Rendimento relevante mensal médio, já com o teto de 12 × IAS aplicado. */
  baseMensal: number;
  /** Rendimento relevante mensal médio antes do teto (para explicar o corte). */
  baseMensalSemTeto: number;
  contribuicaoMensal: number;
  contribuicaoAnual: number;
  /** O teto de 12 × IAS mordeu? */
  limitadoPeloTeto: boolean;
  /** A dispensa por acumulação está a ser aplicada, total ou parcialmente? */
  dispensaAcumulacao: "total" | "parcial" | "nenhuma";
}

/**
 * Contribuições anuais de um trabalhador independente, com teto (12 × IAS),
 * contribuição mínima (20 €/mês), coeficiente por natureza da atividade e as
 * isenções do Art. 157.º.
 */
export function contribuicoesSS(
  brutoAnual: number,
  baseSS: BaseSS,
  isencoes: IsencoesSS = {},
): ContribuicoesSS {
  const bruto = sanitize(brutoAnual);
  const coeficiente = SS_COEFICIENTE[baseSS].value;
  const baseMensalSemTeto = (bruto * coeficiente) / 12;
  const baseMensal = Math.min(baseMensalSemTeto, SS_BASE_MAX_MENSAL.value);
  const limitadoPeloTeto = baseMensalSemTeto > SS_BASE_MAX_MENSAL.value;

  const vazio = (dispensa: ContribuicoesSS["dispensaAcumulacao"]): ContribuicoesSS => ({
    baseMensal,
    baseMensalSemTeto,
    contribuicaoMensal: 0,
    contribuicaoAnual: 0,
    limitadoPeloTeto,
    dispensaAcumulacao: dispensa,
  });

  // Sem faturação não há nada a mostrar. A contribuição mínima de 20 €/mês é
  // real — paga-se mesmo declarando zero — mas é uma obrigação de quem TEM
  // atividade aberta, não o resultado de uma simulação por preencher. Dizê-la
  // é trabalho da copy; aqui devolvê-la faria a interface anunciar 240 €/ano
  // de encargo a quem ainda não escreveu um número.
  if (bruto <= 0) return vazio("nenhuma");

  if (isencoes.primeiroAno) return vazio("nenhuma");

  if (isencoes.acumulaEmprego) {
    // Art. 157.º n.º 1 al. a): contribui-se sobre o EXCEDENTE a 4 × IAS. Abaixo
    // disso não há contribuição nenhuma — e acima não há mínimo de 20 €, porque
    // o mínimo é do regime geral, não desta dispensa.
    const excedente = Math.max(0, baseMensal - SS_ACUMULACAO_LIMITE_MENSAL.value);
    if (excedente <= 0) return vazio("total");
    const contribuicaoMensal = excedente * SS_TAXA.value;
    return {
      baseMensal,
      baseMensalSemTeto,
      contribuicaoMensal,
      contribuicaoAnual: contribuicaoMensal * 12,
      limitadoPeloTeto,
      dispensaAcumulacao: "parcial",
    };
  }

  const contribuicaoMensal = Math.max(SS_MIN_MENSAL.value, baseMensal * SS_TAXA.value);
  return {
    baseMensal,
    baseMensalSemTeto,
    contribuicaoMensal,
    contribuicaoAnual: contribuicaoMensal * 12,
    limitadoPeloTeto,
    dispensaAcumulacao: "nenhuma",
  };
}

/** Atalho para quem só quer o total anual. */
export const contribuicoesSSAnuais = (
  brutoAnual: number,
  baseSS: BaseSS,
  isencoes: IsencoesSS = {},
): number => contribuicoesSS(brutoAnual, baseSS, isencoes).contribuicaoAnual;

/**
 * Retenção na fonte sobre um valor faturado.
 *
 * Duas condições que se esquecem com facilidade quando a conta é escrita à
 * mão — e foram esquecidas: a dispensa do Art. 101.º-B zera a retenção, e o
 * IRS Jovem reduz a base, porque só se retém sobre a parte tributável.
 * Escrever `faturado × taxa` no acerto anual produzia um «reembolso» de
 * retenções que nunca tinham sido feitas.
 */
export function retencaoNaFonte(
  base: number,
  taxa: number,
  opcoes: { dispensa?: boolean; irsJovemAno?: number } = {},
): number {
  if (opcoes.dispensa) return 0;
  return sanitize(base) * (1 - isencaoIRSJovem(opcoes.irsJovemAno)) * taxa;
}

export function calcular(input: CalcInput): CalcResult {
  const bruto = sanitize(input.bruto);
  const avisos: string[] = [];

  // ── Retenção na fonte (adiantamento de IRS) ──
  // O IRS Jovem isenta parte do rendimento, logo a retenção incide apenas
  // sobre a parte tributável (estimativa — a tabela oficial da AT é progressiva).
  const isencaoJovem = isencaoIRSJovem(input.irsJovemAno);
  const retencaoBase = input.retencaoOverride ?? RETENCAO[input.tipo].value;
  const taxaRetencao = input.dispensaRetencao ? 0 : retencaoBase;
  const retencaoIRS = retencaoNaFonte(bruto, retencaoBase, {
    dispensa: input.dispensaRetencao,
    irsJovemAno: input.irsJovemAno,
  });

  // ── IVA ──
  const taxaIVA = taxaIVAEfetiva(input.regiao, input.regimeIVA);
  const iva = bruto * taxaIVA;

  // ── Segurança Social (estimativa proporcional ao recibo) ──
  // Mesmo cálculo do apuramento anual, anualizado e dividido de volta: assim a
  // tesouraria por recibo e o acerto do ano não podem divergir. Traz para aqui
  // o mínimo mensal de 20 € (que faltava) e a dispensa por acumulação passa a
  // ser condicionada aos 4 × IAS em vez de zerar tudo.
  const segSocial = contribuicoesSS(bruto * 12, input.baseSS, {
    primeiroAno: input.isencaoSSPrimeiroAno,
    acumulaEmprego: input.acumulaEmprego,
  }).contribuicaoMensal;

  const entradaConta = bruto + iva - retencaoIRS;
  const liquido = bruto - retencaoIRS - segSocial;

  // ── Avisos contextuais ──
  if (input.regimeIVA === "isento" && bruto > IVA_ISENCAO_LIMITE.value) {
    avisos.push(
      `Este recibo isolado já ultrapassa o limite anual de isenção de IVA (${IVA_ISENCAO_LIMITE.value.toLocaleString("pt-PT")} €). Confirma o teu enquadramento.`
    );
  }
  if (!input.dispensaRetencao && bruto > 0 && bruto * 12 < DISPENSA_RETENCAO_LIMITE.value) {
    avisos.push(
      "Se a tua faturação anual ficar abaixo de 15.000 €, podes dispensar a retenção na fonte (Art. 101.º-B CIRS)."
    );
  }

  return {
    bruto,
    retencaoIRS,
    iva,
    segSocial,
    liquido,
    entradaConta,
    taxaRetencao,
    taxaIVA,
    isencaoJovem,
    avisos,
  };
}

/**
 * Estima o rendimento tributável anual em IRS pelo regime simplificado.
 * Aplica o coeficiente da categoria B ao rendimento bruto anual.
 * (Não calcula o imposto final — só a matéria coletável estimada.)
 */
export function rendimentoTributavelSimplificado(
  brutoAnual: number,
  tipo: TipoAtividade
): number {
  const valor = sanitize(brutoAnual);
  if (valor > REGIME_SIMPLIFICADO.limite.value) {
    // Acima do limite, o regime simplificado não se aplica.
    return valor;
  }
  return valor * COEFICIENTE_POR_TIPO[tipo];
}

/**
 * Limite global das deduções à coleta (Art. 78.º, n.º 7 e n.º 8).
 *
 * O `coletavel` a passar é o do AGREGADO JÁ DIVIDIDO pelo quociente do
 * Art. 69.º quando a tributação é conjunta — o n.º 7 diz «após aplicação do
 * divisor previsto no artigo 69.º», e passar o coletável inteiro empurra o
 * casal para o patamar dos 1 000 € muito antes do que a lei manda.
 *
 * `dependentes` é a contagem total de dependentes do agregado: a partir do
 * terceiro, o n.º 8 majora o limite em 5% por cada um (todos, não só os que
 * excedem dois).
 */
export function limiteGlobalDeducoes(coletavel: number, dependentes = 0): number {
  const g = LIMITE_GLOBAL_DEDUCOES.value;
  const maj = LIMITE_GLOBAL_MAJORACAO_DEPENDENTES.value;
  const n = Math.max(0, Math.floor(dependentes));
  const majoracao = n >= maj.minDependentes ? 1 + maj.porDependente * n : 1;
  if (coletavel <= g.semLimiteAte) return Infinity;
  const base =
    coletavel >= g.escalaoSuperior
      ? g.limiteBaixo
      : g.limiteBaixo +
        (g.limiteAlto - g.limiteBaixo) * ((g.escalaoSuperior - coletavel) / (g.escalaoSuperior - g.semLimiteAte));
  return base * majoracao;
}

/** Escalão aplicado no cálculo progressivo do IRS. */
export interface EscalaoAplicado {
  /** Limite superior do escalão (null = sem limite). */
  ate: number | null;
  /** Taxa marginal aplicada. */
  taxa: number;
  /** Rendimento que caiu dentro deste escalão. */
  rendimento: number;
  /** Imposto calculado neste escalão (rendimento × taxa). */
  imposto: number;
}

/**
 * IRS sobre o rendimento coletável, pelo método progressivo por escalões
 * (cada fração do rendimento é tributada à taxa marginal do seu escalão).
 */
export function irsProgressivo(coletavel: number): number {
  let restante = sanitize(coletavel);
  if (restante === 0) return 0;
  let imposto = 0;
  let inferior = 0;
  for (const escalao of ESCALOES_IRS.value) {
    const superior = escalao.ate ?? Infinity;
    const tranche = Math.min(restante + inferior, superior) - inferior;
    if (tranche <= 0) break;
    imposto += tranche * escalao.taxa;
    restante -= tranche;
    inferior = superior;
    if (restante <= 0) break;
  }
  return imposto;
}

/**
 * Versão detalhada de irsProgressivo: retorna o imposto total e o detalhamento
 * por escalão (quais escalões foram tocados e quanto).
 */
export function irsProgressivoDetalhado(coletavel: number): {
  imposto: number;
  escaloes: EscalaoAplicado[];
} {
  let restante = sanitize(coletavel);
  if (restante === 0) return { imposto: 0, escaloes: [] };
  let imposto = 0;
  let inferior = 0;
  const escaloes: EscalaoAplicado[] = [];
  for (const escalao of ESCALOES_IRS.value) {
    const superior = escalao.ate ?? Infinity;
    const tranche = Math.min(restante + inferior, superior) - inferior;
    if (tranche <= 0) break;
    const impostoEscalao = tranche * escalao.taxa;
    imposto += impostoEscalao;
    escaloes.push({
      ate: escalao.ate,
      taxa: escalao.taxa,
      rendimento: tranche,
      imposto: impostoEscalao,
    });
    restante -= tranche;
    inferior = superior;
    if (restante <= 0) break;
  }
  return { imposto, escaloes };
}

export interface MinimoExistenciaFacts {
  /** A origem predominante está abrangida pelo art. 70.º, n.º 2. */
  eligibleIncome: boolean;
  /** O titular é dependente fiscal; nesse caso o limite de despesas gerais é zero. */
  dependentTaxpayer: boolean;
  /** Rendimentos brutos de todas as categorias deste titular. */
  grossIncome: number;
  /** Deduções específicas do titular na aceção do art. 70.º, n.º 5, al. b). */
  specificDeductions: number;
  /** Soma dos rendimentos brutos de todos os titulares do agregado. */
  householdGrossIncome: number;
  /** Rendimentos não englobados/liberatórios de sujeitos passivos e dependentes. */
  householdNonEnglobedIncome: number;
  /** Número de sujeitos passivos do agregado (1 ou 2). */
  householdTaxpayers: number;
}

export type MinimoExistenciaDecision = {
  status: "applied" | "no_effect" | "not_applicable" | "excluded" | "needs_input";
  abatement: number;
  thresholdL: number;
  reason: string;
  missingFields?: readonly (keyof MinimoExistenciaFacts)[];
};

/**
 * Abatimento por mínimo de existência — fórmula integral do artigo 70.º CIRS.
 *
 * Esta função trabalha sobre rendimentos brutos e deduções específicas. Não é
 * um teto ao imposto nem um clamp ao rendimento líquido. O resultado deve ser
 * subtraído ao rendimento coletável antes dos escalões do artigo 68.º.
 */
export function calcularAbatimentoMinimoExistencia(
  facts: Partial<MinimoExistenciaFacts>,
): MinimoExistenciaDecision {
  const required: readonly (keyof MinimoExistenciaFacts)[] = [
    "eligibleIncome",
    "dependentTaxpayer",
    "grossIncome",
    "specificDeductions",
    "householdGrossIncome",
    "householdNonEnglobedIncome",
    "householdTaxpayers",
  ];
  const missing = required.filter((field) => facts[field] === undefined || facts[field] === null);
  if (missing.length > 0) {
    return {
      status: "needs_input",
      abatement: 0,
      thresholdL: 0,
      reason: "Faltam factos exigidos pelo artigo 70.º para calcular o abatimento sem pressupostos.",
      missingFields: missing,
    };
  }

  const complete = facts as MinimoExistenciaFacts;
  const numeric = [
    complete.grossIncome,
    complete.specificDeductions,
    complete.householdGrossIncome,
    complete.householdNonEnglobedIncome,
    complete.householdTaxpayers,
  ];
  if (
    numeric.some((value) => !Number.isFinite(value) || value < 0)
    || !Number.isInteger(complete.householdTaxpayers)
    || complete.householdTaxpayers < 1
    || complete.householdTaxpayers > 2
    || complete.grossIncome > complete.householdGrossIncome
    || complete.specificDeductions > complete.grossIncome
  ) {
    return {
      status: "needs_input",
      abatement: 0,
      thresholdL: 0,
      reason: "Os factos do mínimo de existência são incoerentes ou inválidos.",
    };
  }

  const reference = MINIMO_EXISTENCIA.value;
  const firstBracket = ESCALOES_IRS.value[0];
  if (!firstBracket || firstBracket.ate === null || firstBracket.taxa <= 0) {
    return {
      status: "needs_input",
      abatement: 0,
      thresholdL: 0,
      reason: "O dataset não contém taxa e limite válidos para o primeiro escalão.",
    };
  }

  const generalExpenseLimit = complete.dependentTaxpayer
    ? 0
    : MINIMO_EXISTENCIA_FORMULA.limiteDespesasGeraisPorTitular.value;
  const divisorL = MINIMO_EXISTENCIA_FORMULA.divisorPatamarL.value;
  const thresholdL =
    reference
    - generalExpenseLimit / (firstBracket.taxa * divisorL)
    + firstBracket.ate / divisorL;

  if (!complete.eligibleIncome) {
    return {
      status: "not_applicable",
      abatement: 0,
      thresholdL,
      reason: "A origem predominante do rendimento não está abrangida pelo artigo 70.º, n.º 2.",
    };
  }

  const exclusionGross =
    MINIMO_EXISTENCIA_FORMULA.multiplicadorExclusaoRendimentoAgregado.value
    * MINIMO_EXISTENCIA_FORMULA.multiplicadorIASExclusao.value
    * IAS_VALUE
    * complete.householdTaxpayers;
  const exclusionNonEnglobed =
    MINIMO_EXISTENCIA_FORMULA.multiplicadorIASExclusao.value
    * IAS_VALUE
    * complete.householdTaxpayers;
  if (complete.householdGrossIncome > exclusionGross) {
    return {
      status: "excluded",
      abatement: 0,
      thresholdL,
      reason: "O rendimento bruto do agregado excede o limite do artigo 70.º, n.º 4, al. a).",
    };
  }
  if (complete.householdNonEnglobedIncome > exclusionNonEnglobed) {
    return {
      status: "excluded",
      abatement: 0,
      thresholdL,
      reason: "Os rendimentos não englobados excedem o limite do artigo 70.º, n.º 4, al. b).",
    };
  }

  const gross = complete.grossIncome;
  const specific = complete.specificDeductions;
  const generalExpenseEquivalent = generalExpenseLimit / firstBracket.taxa;
  let rawAbatement: number;
  if (gross <= reference) {
    rawAbatement = reference - (specific + generalExpenseEquivalent);
  } else if (gross <= thresholdL) {
    rawAbatement =
      reference
      - MINIMO_EXISTENCIA_FORMULA.coeficienteTrocoIntermedio.value * (gross - reference)
      - (specific + generalExpenseEquivalent);
  } else {
    rawAbatement =
      thresholdL
      - firstBracket.ate
      - MINIMO_EXISTENCIA_FORMULA.coeficienteTrocoSuperior.value * (gross - thresholdL)
      - specific;
  }

  const abatement = Math.min(Math.max(0, rawAbatement), Math.max(0, gross - specific));
  return {
    status: abatement > 0 ? "applied" : "no_effect",
    abatement,
    thresholdL,
    reason: abatement > 0
      ? "Abatimento calculado pela fórmula por troços do artigo 70.º."
      : "A fórmula por troços resulta num abatimento nulo.",
  };
}

/**
 * Junta as decisões do artigo 70.º de cada titular numa só.
 *
 * O abatimento é pessoal: soma-se. O estado é o do caso mais grave, e
 * `needs_input` ganha sempre — uma ferramenta financeira não pode devolver um
 * abatimento parcial como se fosse o total sem dizer que lhe faltam factos.
 */
function combinarDecisoesMinimoExistencia(
  decisoes: MinimoExistenciaDecision[]
): MinimoExistenciaDecision {
  if (decisoes.length === 1) return decisoes[0];
  const faltam = decisoes.find((d) => d.status === "needs_input");
  const abatement = decisoes.reduce((s, d) => s + d.abatement, 0);
  const thresholdL = decisoes.reduce((m, d) => Math.max(m, d.thresholdL), 0);
  if (faltam) {
    return {
      status: "needs_input",
      abatement: 0,
      thresholdL,
      reason: faltam.reason,
      missingFields: faltam.missingFields,
    };
  }
  const status: MinimoExistenciaDecision["status"] = decisoes.some((d) => d.status === "applied")
    ? "applied"
    : decisoes.every((d) => d.status === "excluded")
      ? "excluded"
      : decisoes.every((d) => d.status === "not_applicable")
        ? "not_applicable"
        : "no_effect";
  return {
    status,
    abatement,
    thresholdL,
    reason:
      status === "applied"
        ? "Abatimento do artigo 70.º apurado por titular e somado."
        : decisoes[0]?.reason ?? "Sem abatimento pelo artigo 70.º.",
  };
}

export interface DeducoesInput {
  /** Valor gasto em saúde no ano. */
  saude?: number;
  /** Valor gasto em educação no ano. */
  educacao?: number;
  /** Despesas gerais familiares (faturas com NIF). */
  gerais?: number;
  /** Rendas de habitação permanente pagas (Art. 78.º-E CIRS): 15% até €900 (Lei 36/2024). */
  rendas?: number;
  /** Encargos com lares e apoio domiciliário (Art. 84.º CIRS): 25% até €403,75. */
  lares?: number;
}

/**
 * Detalhamento de dependentes para cálculo preciso das deduções à coleta.
 * Todos os campos são contagens (número de dependentes no escalão).
 */
export interface DependentesDetalhe {
  /** Dependentes com mais de 3 anos → €600 cada (1.º e 2.º) / €900 (3.º+). */
  normais?: number;
  /** Dependentes com 3 anos ou menos → €726 cada. */
  bebe?: number;
  /** Dependentes com grau de deficiência ≥ 60% → +2,5×IAS adicional. */
  deficientes?: number;
}

export interface SimulacaoInput {
  brutoAnual: number;
  tipo: TipoAtividade;
  /** Ano de atividade (1.º e 2.º reduzem o coeficiente); 3+ sem redução. */
  anoAtividade?: number;
  irsJovemAno?: number;
  /**
   * Parte do teto do IRS Jovem (55 × IAS) já consumida por outras categorias
   * do MESMO titular — tipicamente a categoria A. O Art. 12.º-B tem um teto por
   * titular, não um por categoria: sem isto, quem tem salário e recibos verdes
   * usaria o teto duas vezes.
   */
  irsJovemTetoConsumido?: number;
  /** Despesas de atividade documentadas (e-fatura, rendas, pessoal…). */
  despesasJustificadas?: number;
  /** Total de retenções na fonte já pagas no ano. */
  retencoesPagas?: number;
  // ── Módulos opcionais (toggles) ──
  /** Tributação conjunta (casado / unido de facto). */
  conjunta?: boolean;
  /** Número de dependentes (>3 anos, simplificação). */
  dependentes?: number;
  /** Outros rendimentos líquidos (cat. A) para englobamento. */
  outrosRendimentos?: number;
  /**
   * Uso interno: corta o cálculo de `irsImputavelCatB`, que corre o motor uma
   * segunda vez sem a Categoria B. Sem isto a chamada seria recursiva.
   */
  semDecomposicao?: boolean;
  /** Despesas dedutíveis à coleta. */
  deducoes?: DeducoesInput;
  /** Regime de tributação da categoria B. Por defeito "simplificado". */
  regimeContabilidade?: "simplificado" | "organizada";
  /** Coeficiente da atividade (regime especial), se diferente do `tipo`. */
  coefOverride?: number;
  /** Sujeita à regra dos 15% (override do que deriva do `tipo`). */
  aplicaRegra15Override?: boolean;
  /**
   * IFICI (ex-NHR 2.0): aplica taxa flat de 20% ao rendimento coletável em vez
   * dos escalões progressivos (Art. 58.º-A EBF). Incompatível com IRS Jovem.
   * Exige estatuto aprovado pela AT e não ter sido residente nos últimos 5 anos.
   */
  ifici?: boolean;
  /**
   * RNH antigo (pré-2024): beneficiário ainda dentro dos 10 anos de estatuto.
   * Aplica taxa flat de 20% — mesmo mecanismo que IFICI. Incompatível com IFICI.
   * Art. 16.º n.º 1 CIRS (regime transitório OE2024).
   */
  rnhAntigo?: boolean;
  /**
   * Programa Regressar / Ex-Residentes (Art. 12.º-A CIRS):
   * 50% dos rendimentos Cat. A e B excluídos de tributação durante 5 anos,
   * a contar do regresso (residente após ≥ 3 anos de ausência, desde 2020).
   * Incompatível com IFICI e RNH antigo.
   */
  programaRegressar?: boolean;
  /**
   * Sujeito passivo com deficiência permanente ≥ 60%:
   * - Art. 56.º-A CIRS: exclui 15% dos rendimentos Cat. B (máx €2 500) do tributável
   * - Art. 87.º CIRS: dedução adicional à coleta de 4 × IAS (€2 148,52 em 2026)
   */
  deficiencia?: boolean;
  /**
   * Detalhamento de dependentes para cálculo preciso das deduções.
   * Se fornecido, sobrepõe-se ao campo `dependentes`.
   */
  dependentesDetalhe?: DependentesDetalhe;
  /**
   * Lista detalhada de dependentes (com guarda partilhada). Se fornecida,
   * tem prioridade sobre `dependentesDetalhe`/`dependentes`: cada dependente
   * conta com a sua fração de guarda (Art. 78.º-A n.º 4 CIRS).
   */
  dependentesLista?: Array<{ ate3: boolean; deficiente: boolean; guarda: number }>;
  /**
   * Acumulação com trabalho dependente que cobre Segurança Social.
   * Não afecta o IRS, mas é considerado para o cálculo de SS no resultado.
   */
  acumulaEmprego?: boolean;
  /** Isenção de SS nos primeiros 12 meses de atividade (Art. 157.º CC). */
  isencaoSSPrimeiroAno?: boolean;
  /** Número de ascendentes em comunhão de habitação (Art. 78.º-A CIRS). */
  ascendentes?: number;
  /** PPR: valor aplicado no ano + escalão de idade do sujeito passivo (Art. 21.º EBF). */
  ppr?: { valor: number; escalaoIdade: "ate35" | "de35a50" | "mais50" };
  /**
   * Donativos do ano (Art. 62.º/63.º EBF): valor, fator de majoração
   * (1,0 / 1,3 / 1,4) e se está isento do limite de 15% da coleta (Estado).
   */
  donativos?: { valor: number; fator: number; semLimite: boolean };
  /** Pensões de alimentos pagas (Art. 83.º-A CIRS): 20%, fora do limite global. */
  pensaoAlimentos?: number;
  /**
   * Factos completos para o mínimo de existência. Necessários quando há
   * tributação conjunta ou rendimentos agregados sem decomposição. Nos casos
   * simples de um titular com apenas Cat. B Art. 151.º, o motor deriva estes
   * valores do próprio pedido.
   */
  minimoExistenciaFacts?: Partial<MinimoExistenciaFacts>;
  /**
   * Factos do artigo 70.º POR TITULAR. O abatimento é uma regra pessoal — em
   * tributação conjunta cada sujeito passivo tem o seu, calculado sobre o seu
   * rendimento bruto e as suas deduções específicas, e os dois somam-se. Quando
   * preenchido, sobrepõe-se a `minimoExistenciaFacts`.
   */
  minimoExistenciaFactsTitulares?: Array<Partial<MinimoExistenciaFacts>>;
  /**
   * Desliga o abatimento do artigo 70.º nesta passagem. Usado quando o
   * chamador apura o abatimento de todo o agregado noutro sítio (é o caso do
   * sujeito passivo B, cujo coletável é calculado à parte e depois somado):
   * sem isto o abatimento seria aplicado duas vezes à mesma pessoa.
   */
  semMinimoExistencia?: boolean;
  /**
   * Rendimento isento com progressividade (Art. 81.º n.º 8): não é tributado,
   * mas conta para determinar a taxa aplicável ao restante rendimento.
   */
  rendimentoIsentoComProgressividade?: number;
}

export interface SimulacaoIRS {
  brutoAnual: number;
  regimeContabilidade: "simplificado" | "organizada";
  coeficienteBase: number;
  reducaoAno: number;
  coeficiente: number;
  rendimentoCoeficiente: number;
  despesasAutomaticas: number;
  despesasJustificadas: number;
  acrescimo15: number;
  rendimentoTributavel: number;
  isencaoJovem: number;
  rendimentoIsentoJovem: number;
  outrosRendimentos: number;
  rendimentoColetavel: number;
  conjunta: boolean;
  /** true quando IFICI foi aplicado (taxa flat 20%). */
  ificiAplicado: boolean;
  /** true quando o RNH antigo foi aplicado (taxa flat 20%). */
  rnhAntigoAplicado: boolean;
  /** true quando o Programa Regressar foi aplicado (exclusão 50%, Art. 12.º-A CIRS). */
  programaRegressarAplicado: boolean;
  /** Montante excluído de tributação pelo Programa Regressar. 0 se não aplicado. */
  exclusaoProgramaRegressar: number;
  /** Montante excluído do rendimento tributável por deficiência (Art. 56.º-A). */
  exclusaoDeficiencia: number;
  /** Coleta antes das deduções à coleta (já inclui `adicionalSolidariedade`). */
  coletaBruta: number;
  /** Adicional de solidariedade (Art. 68.º-A CIRS): 2,5%/5% acima de 80 000 €/250 000 €. 0 se não aplicável ou regime de taxa fixa. */
  adicionalSolidariedade: number;
  /** Detalhamento por escalão progressivo (vazio quando IFICI/RNH aplicado). */
  escaloesAplicados: EscalaoAplicado[];
  deducaoDependentes: number;
  /** Dedução à coleta por ascendentes (Art. 78.º-A). Fora do limite global. */
  deducaoAscendentes: number;
  /**
   * Total das deduções de despesas que abate à coleta: a soma sujeita ao teto
   * do Art. 78.º n.º 7 (já cortada) mais as despesas gerais familiares, que a
   * lei deixa de fora desse teto.
   */
  deducaoDespesas: number;
  /**
   * As parcelas por trás de `deducaoDespesas`, já com os limites individuais
   * de cada rubrica aplicados. `somaBruta` é o total das rubricas SUJEITAS ao
   * limite global do Art. 78.º n.º 7 (alíneas c) a h), k) e m) — inclui a
   * pensão de alimentos e exclui as despesas gerais); `dentroDoLimite` é essa
   * soma já cortada pelo teto; `aplicado` é o que efetivamente abate à coleta.
   */
  deducoesDespesasDetalhe: {
    saude: number;
    educacao: number;
    gerais: number;
    rendas: number;
    lares: number;
    ppr: number;
    donativos: number;
    pensaoAlimentos: number;
    /** As despesas gerais familiares (alínea b) não contam para o teto do n.º 7. */
    geraisForaDoLimite: boolean;
    somaBruta: number;
    limiteGlobal: number;
    limitado: boolean;
    dentroDoLimite: number;
    aplicado: number;
  };
  /** Dedução à coleta por PPR (Art. 21.º EBF), antes do limite global. */
  deducaoPPR: number;
  /** Dedução à coleta por donativos (Art. 63.º EBF), antes do limite global. */
  deducaoDonativos: number;
  /**
   * Dedução à coleta por pensões de alimentos (Art. 83.º-A): 20% do pago.
   * Valor bruto da rubrica — já contabilizado dentro de `deducaoDespesas`
   * (a alínea f) está no perímetro do limite global do Art. 78.º n.º 7).
   */
  deducaoPensaoAlimentos: number;
  /** Dedução coleta por deficiência do contribuinte (Art. 87.º: 4×IAS). */
  deducaoDeficiencia: number;
  /**
   * Total das deduções à coleta efetivamente abatidas (dependentes +
   * ascendentes + despesas + deficiência). É o número a usar para mostrar
   * «deduções à coleta»: somar as parcelas à mão duplica rubricas que já estão
   * agregadas dentro de `deducaoDespesas` (pensão de alimentos, despesas
   * gerais).
   */
  deducoesColetaTotal: number;
  /** IRS de TODO o rendimento englobado (Cat. B + `outrosRendimentos`). */
  irsEstimado: number;
  /**
   * Parte do `irsEstimado` imputável à Categoria B — o imposto marginal que a
   * atividade independente acrescenta por cima dos outros rendimentos. Igual a
   * `irsEstimado` quando não há englobamento.
   *
   * É este o número que se compara com a faturação e com as retenções; usar o
   * `irsEstimado` aí faria a atividade parecer responsável pelo imposto do
   * salário.
   */
  irsImputavelCatB: number;
  minimoExistenciaAplicado: boolean;
  /** Estado auditável da regra do artigo 70.º. */
  minimoExistenciaDecision: MinimoExistenciaDecision;
  /** Rendimento coletável antes do abatimento do artigo 70.º. */
  rendimentoColetavelAntesMinimo: number;
  /** Abatimento efetivamente subtraído ao coletável. */
  abatimentoMinimoExistencia: number;
  taxaMediaEfetiva: number;
  retencoesPagas: number;
  /** Estimativa de SS anual (21,4% sobre base de SS). 0 se isento. */
  ssAnual: number;
  acumulaEmprego: boolean;
  /** Maior que 0: reembolso estimado. Menor que 0: imposto a pagar. */
  saldo: number;
}

/**
 * NÚCLEO do apuramento anual. Estimativa do IRS no regime simplificado, com
 * módulos opcionais.
 *
 * ⚠️ ENTRADA PREFERIDA: `simularDeclaracaoIRS`. Esta função continua exportada
 * porque há ecrãs (a demo da landing, o modo guiado, o simulador integrado) que
 * só têm um rendimento de categoria B e não precisam da declaração inteira —
 * mas ela trata as outras categorias como um número anónimo em
 * `outrosRendimentos`, e é dessa cegueira que nascem os enganos: sem saber que
 * o rendimento é um salário, não sabe a dedução específica que ele sofreu nem
 * se está abrangido pelo artigo 70.º. Por isso recusa-se a inferir os factos do
 * mínimo de existência num agregado que não decomponha — devolve `needs_input`,
 * que o chamador TEM de tratar.
 *
 * Quem tiver mais do que categoria B deve usar `simularDeclaracaoIRS`, que
 * decompõe por titular e por categoria e alimenta este núcleo com os factos
 * certos. O teste `fiscal-declaracao-referencia.test.ts` exige que os dois
 * caminhos deem o mesmo resultado ao cêntimo no caso comum a ambos.
 *
 * Modela: coeficiente por atividade (Art. 31.º) com redução do 1.º/2.º ano,
 * regra dos 15% (só coef. 0,75 e 0,35), IRS Jovem, exclusão por deficiência
 * (Art. 56.º-A), englobamento de outros rendimentos, tributação conjunta
 * (quociente), deduções à coleta com limite global, escalões e mínimo de
 * existência.
 *
 * ESTIMATIVA: não cobre todas as deduções/benefícios nem casos especiais;
 * não substitui o apuramento oficial.
 */
export function simularIRSAnual(input: SimulacaoInput): SimulacaoIRS {
  const brutoAnual = sanitize(input.brutoAnual);
  const tipo = input.tipo;
  const regimeContabilidade = input.regimeContabilidade ?? "simplificado";
  const despesasJustificadas = sanitize(input.despesasJustificadas ?? 0);

  // ── Art. 56.º-A CIRS: exclusão por deficiência ────────────────────────────
  // A norma incide sobre o rendimento BRUTO da categoria («considerados apenas
  // por 85%»), não sobre o tributável. Aplicá-la depois do coeficiente excluía
  // mais do que a lei permite: 2 500 € de exclusão a coef. 0,75 valem 1 875 €
  // de matéria coletável, não 2 500 €.
  const exclusaoDeficiencia = exclusaoDeficienciaCategoria(brutoAnual, input.deficiencia);
  const brutoConsiderado = Math.max(0, brutoAnual - exclusaoDeficiencia);

  let coeficienteBase: number;
  let reducaoAno: number;
  let coeficiente: number;
  let rendimentoCoeficiente: number;
  let despesasAutomaticas: number;
  let acrescimo15: number;
  let rendimentoTributavel: number;

  if (regimeContabilidade === "organizada") {
    // Contabilidade organizada: rendimento tributável = receita − despesas reais.
    // Sem coeficiente nem regra dos 15%; as despesas reduzem diretamente.
    coeficienteBase = 1;
    reducaoAno = 0;
    coeficiente = 1;
    despesasAutomaticas = 0;
    acrescimo15 = 0;
    rendimentoCoeficiente = Math.max(0, brutoConsiderado - despesasJustificadas);
    rendimentoTributavel = rendimentoCoeficiente;
  } else {
    // Regime simplificado: coeficiente por atividade + redução do 1.º/2.º ano.
    coeficienteBase = input.coefOverride ?? COEFICIENTE_POR_TIPO[tipo];
    reducaoAno = REDUCAO_COEFICIENTE_ANO.value[input.anoAtividade ?? 3] ?? 0;
    coeficiente = coeficienteBase * (1 - reducaoAno);
    rendimentoCoeficiente = brutoConsiderado * coeficiente;

    // Regra dos 15% — só para coeficientes 0,75 (art151) e 0,35 (outros serviços).
    const aplicaRegra15 = input.aplicaRegra15Override ?? (tipo === "art151" || tipo === "outros");
    // Art. 31.º n.º 13 al. a) CIRS: do somatório que abate aos 15% do rendimento
    // bruto, a componente automática é a dedução específica (4 104 €/8,54×IAS)
    // OU as contribuições obrigatórias TOTAIS para a Segurança Social, a maior.
    // (Não é a parte que excede 10% — isso é a dedução autónoma do n.º 2.)
    //
    // «Contribuições obrigatórias» são as que a pessoa PAGA. A linha anterior
    // multiplicava a faturação por 0,7 × 21,4% sem teto, sem coeficiente por
    // tipo e sem olhar às isenções: a 200 000 € creditava 29 960 € contra
    // 16 552 € reais (≈ 6 400 € de IRS a menos), a quem vende bens creditava
    // 7 490 € em vez de 4 587 €, e a quem estava isento no 1.º ano creditava
    // contribuições que nunca pagou.
    const ssContribuicoes = contribuicoesSSAnuais(brutoAnual, BASE_SS_POR_TIPO[tipo], {
      primeiroAno: input.isencaoSSPrimeiroAno,
      acumulaEmprego: input.acumulaEmprego,
    });
    despesasAutomaticas = Math.max(DEDUCAO_ESPECIFICA_CATB.value, ssContribuicoes);
    acrescimo15 = aplicaRegra15
      ? Math.max(0, REGIME_15PCT.value * brutoConsiderado - (despesasAutomaticas + despesasJustificadas))
      : 0;
    rendimentoTributavel = rendimentoCoeficiente + acrescimo15;
  }

  // ── IRS Jovem (Art. 12.º-B) sobre o rendimento da categoria B ─────────────
  // O teto de 55 × IAS é POR TITULAR e partilhado entre as categorias A e B.
  // `irsJovemTetoConsumido` traz o que a categoria A do mesmo titular já gastou
  // do teto, para as duas categorias não o usarem cada uma por inteiro.
  const isencaoJovem = isencaoIRSJovem(input.irsJovemAno);
  const tetoIsencao = IRS_JOVEM.tetoIAS.value * IAS_VALUE;
  const tetoDisponivelJovem = Math.max(0, tetoIsencao - sanitize(input.irsJovemTetoConsumido ?? 0));
  const rendimentoIsentoJovem = Math.min(rendimentoTributavel * isencaoJovem, tetoDisponivelJovem);

  // Rendimento coletável base (após IRS Jovem, exclusão deficiência, outros)
  const conjunta = !!input.conjunta;
  const ificiAplicado = !!input.ifici;
  const rnhAntigoAplicado = !!input.rnhAntigo && !ificiAplicado;
  const programaRegressarAplicado = !!input.programaRegressar && !ificiAplicado && !rnhAntigoAplicado;
  // Regime de taxa flat: IFICI (20%) ou RNH antigo (20%) — sem escalões
  const regimeFlatRate = ificiAplicado || rnhAntigoAplicado;
  const outrosRendimentos = sanitize(input.outrosRendimentos ?? 0);
  // Base elegível para a taxa fixa do IFICI/RNH (só rendimento da atividade,
  // Cat. A/B — Art. 58.º-A, n.º 2 EBF). `outrosRendimentos` (outras
  // categorias, sem detalhe de elegibilidade) NUNCA entra na taxa fixa —
  // segue sempre os escalões gerais do Art. 68.º, mesmo com IFICI/RNH ativo.
  // A exclusão do Art. 56.º-A já saiu do bruto (antes do coeficiente), por isso
  // não volta a ser subtraída aqui.
  const rendimentoElegivel = Math.max(0, rendimentoTributavel - rendimentoIsentoJovem);

  // Programa Regressar (Art. 12.º-A CIRS): 50% do rendimento elegível excluído
  const exclusaoProgramaRegressar = programaRegressarAplicado ? rendimentoElegivel * 0.5 : 0;
  const rendimentoElegivelFinal = Math.max(0, rendimentoElegivel - exclusaoProgramaRegressar);
  // Rendimento total antes do abatimento por mínimo de existência.
  const rendimentoColetavelAntesMinimo = rendimentoElegivelFinal + outrosRendimentos;

  // ── Mínimo de existência (Art. 70.º) ──────────────────────────────────────
  // A regra é um abatimento ao coletável calculado por troços a partir do
  // rendimento bruto e das deduções específicas. Nunca é um clamp pós-imposto.
  const inferredMinimumFacts: Partial<MinimoExistenciaFacts> =
    !conjunta && outrosRendimentos === 0
      ? {
          eligibleIncome: tipo === "art151",
          dependentTaxpayer: false,
          grossIncome: brutoAnual,
          specificDeductions: Math.max(0, brutoAnual - rendimentoTributavel),
          householdGrossIncome: brutoAnual,
          householdNonEnglobedIncome: 0,
          householdTaxpayers: 1,
        }
      : {
          // Estes dois factos continuam seguros; os restantes têm de ser
          // fornecidos por titular quando a entrada agregada não os preserva.
          eligibleIncome: tipo === "art151",
          dependentTaxpayer: false,
        };
  // Os factos são POR TITULAR. Quando o chamador os fornece por pessoa
  // (`minimoExistenciaFactsTitulares`), cada abatimento é calculado à parte e
  // somado — é assim que a regra funciona num agregado com dois sujeitos
  // passivos. Sem essa decomposição, mantém-se o caso de um só titular.
  const factsPorTitular: Array<Partial<MinimoExistenciaFacts>> =
    input.minimoExistenciaFactsTitulares && input.minimoExistenciaFactsTitulares.length > 0
      ? input.minimoExistenciaFactsTitulares
      : [{ ...inferredMinimumFacts, ...(input.minimoExistenciaFacts ?? {}) }];

  const minimoExistenciaDecision: MinimoExistenciaDecision = regimeFlatRate
    ? {
        status: "not_applicable",
        abatement: 0,
        thresholdL: 0,
        reason: "O regime de taxa fixa selecionado não usa o abatimento dos escalões gerais.",
      }
    : input.semMinimoExistencia
      ? {
          status: "not_applicable",
          abatement: 0,
          thresholdL: 0,
          reason: "O abatimento do artigo 70.º é apurado ao nível do agregado, fora desta passagem.",
        }
      : combinarDecisoesMinimoExistencia(factsPorTitular.map(calcularAbatimentoMinimoExistencia));
  const abatimentoMinimoExistencia = minimoExistenciaDecision.abatement;
  const rendimentoColetavelFinal = Math.max(
    0,
    rendimentoColetavelAntesMinimo - abatimentoMinimoExistencia,
  );

  // ── Coleta: flat 20% (IFICI / RNH antigo, só na parte elegível) + escalões
  //    progressivos (outrosRendimentos sempre; toda a base sem regime flat) ──
  const divisor = conjunta ? QUOCIENTE_CONJUGAL.value : 1;
  const rendimentoIsentoProgressividade = sanitize(input.rendimentoIsentoComProgressividade ?? 0);
  let coletaBruta: number;
  let escaloesAplicados: EscalaoAplicado[];
  if (regimeFlatRate) {
    const coletaFlat = rendimentoElegivelFinal * IFICI_TAXA.value;
    // outrosRendimentos é tributado aos escalões progressivos, empilhado por
    // cima do rendimento elegível (que já "ocupa" os escalões mais baixos,
    // mesmo sendo tributado à parte, à taxa fixa) — não do zero. A diferença
    // entre a coleta progressiva do total e a do elegível isola o imposto
    // marginal da parte de outrosRendimentos, nos escalões certos.
    const detalhadoTotal = irsProgressivoDetalhado(rendimentoColetavelFinal / divisor);
    const detalhadoElegivel = irsProgressivoDetalhado(rendimentoElegivelFinal / divisor);
    const coletaOutros = detalhadoTotal.imposto - detalhadoElegivel.imposto;
    coletaBruta = coletaFlat + coletaOutros * divisor;
    // Sem detalhe por escalão aqui: misturaria a taxa fixa (elegível) com os
    // escalões gerais (outrosRendimentos), confundindo a leitura. A UI não
    // mostra este detalhe quando o regime de taxa fixa está ativo.
    escaloesAplicados = [];
  } else if (rendimentoIsentoProgressividade > 0) {
    // ── Isenção com progressividade (Art. 81.º n.º 8 CIRS) ───────────────────
    // O rendimento isento não é tributado, mas conta para determinar a TAXA
    // aplicável ao restante. Calcula-se a taxa média sobre o total (isento
    // incluído) e aplica-se essa taxa só à parte tributável.
    const baseComIsento = (rendimentoColetavelFinal + rendimentoIsentoProgressividade) / divisor;
    const detalhado = irsProgressivoDetalhado(baseComIsento);
    const taxaMediaProgressividade = baseComIsento > 0 ? detalhado.imposto / baseComIsento : 0;
    coletaBruta = rendimentoColetavelFinal * taxaMediaProgressividade;
    // O detalhe por escalão é o da base COM o rendimento isento — é essa a
    // repartição que determinou a taxa, e escondê-la deixaria o utilizador sem
    // perceber porque paga uma taxa acima da que o coletável isolado daria.
    escaloesAplicados = divisor !== 1
      ? detalhado.escaloes.map((e) => ({
          ...e,
          rendimento: e.rendimento * divisor,
          imposto: e.imposto * divisor,
        }))
      : detalhado.escaloes;
  } else {
    const detalhado = irsProgressivoDetalhado(rendimentoColetavelFinal / divisor);
    coletaBruta = detalhado.imposto * divisor;
    // Escalar de volta se divisor != 1 (tributação conjunta)
    escaloesAplicados = divisor !== 1
      ? detalhado.escaloes.map(e => ({
          ...e,
          rendimento: e.rendimento * divisor,
          imposto: e.imposto * divisor,
        }))
      : detalhado.escaloes;
  }

  // ── Adicional de solidariedade (Art. 68.º-A CIRS) ─────────────────────────
  // Acresce às taxas gerais do Art. 68.º — 2,5% na parte do coletável entre
  // 80 000 € e 250 000 €, 5% acima de 250 000 €. Não se aplica aos regimes de
  // taxa fixa (IFICI/RNH), que substituem — em vez de acrescer a — as taxas
  // gerais. Em tributação conjunta, aplica-se por titular (metade do
  // coletável) e duplica-se o resultado, tal como os escalões gerais.
  const baseColetavelPorTitular = rendimentoColetavelFinal / divisor;
  const parteEntre80e250 = regimeFlatRate
    ? 0
    : Math.max(
        0,
        Math.min(baseColetavelPorTitular, ADICIONAL_SOLIDARIEDADE.limiar2.value) -
          ADICIONAL_SOLIDARIEDADE.limiar1.value
      );
  const parteAcima250 = regimeFlatRate
    ? 0
    : Math.max(0, baseColetavelPorTitular - ADICIONAL_SOLIDARIEDADE.limiar2.value);
  const adicionalSolidariedade =
    (parteEntre80e250 * ADICIONAL_SOLIDARIEDADE.taxa1.value +
      parteAcima250 * ADICIONAL_SOLIDARIEDADE.taxa2.value) *
    divisor;
  coletaBruta += adicionalSolidariedade;

  // ── Deduções à coleta ─────────────────────────────────────────────────────
  // Dependentes: suporta detalhe (bebe, deficientes) ou contagem simples
  const det = input.dependentesDetalhe;
  const depNormais = Math.max(0, Math.floor(det?.normais ?? input.dependentes ?? 0));
  const depBebe = Math.max(0, Math.floor(det?.bebe ?? 0));
  const depDefic = Math.max(0, Math.floor(det?.deficientes ?? 0));

  // Regra do 3.º dependente (Art. 78.º-A):
  //  - Bebés (≤ 3 anos): €726 cada
  //  - Normais (> 3 anos): os primeiros max(0, 2−depBebe) ficam no escalão base €600;
  //    a partir do 3.º na contagem global passa a €900
  const deducaoDependentes = (() => {
    // Caminho detalhado: lista com guarda partilhada (cada dependente conta com
    // a sua fração). Bebés (≤3 anos) ocupam as primeiras posições; do 3.º
    // dependente em diante, os de >3 anos passam de 600 € para 900 €.
    if (input.dependentesLista && input.dependentesLista.length > 0) {
      const ordenada = [...input.dependentesLista].sort((a, b) => Number(b.ate3) - Number(a.ate3));
      let pos = 0;
      let total = 0;
      for (const d of ordenada) {
        pos++;
        const base = d.ate3
          ? DEDUCAO_DEPENDENTE_BEBE.value
          : pos <= 2
            ? DEDUCAO_DEPENDENTE.value
            : DEDUCAO_DEPENDENTE_3MAIS.value;
        const extra = d.deficiente ? DEDUCAO_DEPENDENTE_DEFICIENCIA.value : 0;
        const guarda = d.guarda > 0 ? Math.min(1, d.guarda) : 1;
        total += (base + extra) * guarda;
      }
      return total;
    }
    // Bebés têm sempre €726 (ocupam as primeiras posições na fila global)
    const dedBebe = depBebe * DEDUCAO_DEPENDENTE_BEBE.value;
    // Normais: quantas posições ainda estão no bloco 1.º/2.º
    const normaisBase = Math.max(0, Math.min(depNormais, 2 - depBebe));
    const normaisMajor = Math.max(0, depNormais - normaisBase);
    const dedNormais =
      normaisBase * DEDUCAO_DEPENDENTE.value +
      normaisMajor * DEDUCAO_DEPENDENTE_3MAIS.value;
    // Dependentes com deficiência → +2,5×IAS adicional por cada um
    const dedDefic = depDefic * DEDUCAO_DEPENDENTE_DEFICIENCIA.value;
    return dedBebe + dedNormais + dedDefic;
  })();

  const ded = input.deducoes ?? {};
  const dGerais = Math.min(
    sanitize(ded.gerais ?? 0) * DEDUCAO_DESP_GERAIS.value.taxa,
    DEDUCAO_DESP_GERAIS.value.limite * (conjunta ? 2 : 1)
  );
  const dSaude = Math.min(sanitize(ded.saude ?? 0) * DEDUCAO_SAUDE.value.taxa, DEDUCAO_SAUDE.value.limite);
  const dEducacao = Math.min(sanitize(ded.educacao ?? 0) * DEDUCAO_EDUCACAO.value.taxa, DEDUCAO_EDUCACAO.value.limite);
  const dRendas = Math.min(sanitize(ded.rendas ?? 0) * DEDUCAO_RENDAS.value.taxa, DEDUCAO_RENDAS.value.limite);
  const dLares = Math.min(sanitize(ded.lares ?? 0) * DEDUCAO_LARES.value.taxa, DEDUCAO_LARES.value.limite);

  // PPR (Art. 21.º EBF): 20% do aplicado, com limite por idade do sujeito passivo.
  const deducaoPPR = input.ppr
    ? Math.min(sanitize(input.ppr.valor) * DEDUCAO_PPR.value.taxa, DEDUCAO_PPR.value[input.ppr.escalaoIdade])
    : 0;
  // Donativos (Art. 62.º/63.º EBF): 25% do valor majorado, limitado a 15% da
  // coleta (exceto donativos ao Estado, sem limite).
  const deducaoDonativos = input.donativos
    ? (() => {
        const base = sanitize(input.donativos.valor) * (input.donativos.fator || 1) * DEDUCAO_DONATIVOS.value.taxa;
        return input.donativos.semLimite ? base : Math.min(base, DEDUCAO_DONATIVOS.value.limiteColeta * coletaBruta);
      })()
    : 0;

  // Pensões de alimentos (Art. 83.º-A): 20% do valor pago. A alínea f) do
  // Art. 78.º n.º 1 está expressamente dentro do intervalo «c) a h)» do n.º 7,
  // por isso entra no limite global — estava fora, e 12 000 € de pensão davam
  // 2 400 € de dedução por cima de um teto já esgotado.
  const deducaoPensaoAlimentos = sanitize(input.pensaoAlimentos ?? 0) * DEDUCAO_PENSAO_ALIMENTOS.value;

  // ── Perímetro do limite global (Art. 78.º n.º 7) ──────────────────────────
  // O n.º 7 limita as alíneas «c) a h), k) e m)» do n.º 1. As despesas gerais
  // familiares são a alínea b) — ficam FORA do teto, e mantê-las lá dentro
  // gastava até 250 €/sujeito passivo de teto que não lhes pertence.
  const somaDespesasBruta =
    dSaude + dEducacao + dRendas + dLares + deducaoPPR + deducaoDonativos + deducaoPensaoAlimentos;
  // Total de dependentes do agregado, para a majoração do n.º 8. Na contagem
  // simples, `deficientes` é uma parcela adicional sobre dependentes já
  // contados em `normais`/`bebe` — somá-la duplicaria pessoas.
  const totalDependentes =
    input.dependentesLista && input.dependentesLista.length > 0
      ? input.dependentesLista.length
      : depNormais + depBebe;
  const limiteGlobal = limiteGlobalDeducoes(rendimentoColetavelFinal / divisor, totalDependentes);
  const dentroDoLimite = Math.min(somaDespesasBruta, limiteGlobal);
  const deducaoDespesas = dentroDoLimite + dGerais;
  // Parcela a parcela, para quem quiser abrir o detalhe. A UI do modo completo
  // montava este objeto à mão com zeros em todas as linhas e o total certo —
  // qualquer detalhe aberto a partir dali mostrava números que não somavam.
  const deducoesDespesasDetalhe = {
    saude: dSaude,
    educacao: dEducacao,
    gerais: dGerais,
    rendas: dRendas,
    lares: dLares,
    ppr: deducaoPPR,
    donativos: deducaoDonativos,
    pensaoAlimentos: deducaoPensaoAlimentos,
    /** As despesas gerais (alínea b) não contam para o teto do n.º 7. */
    geraisForaDoLimite: true,
    somaBruta: somaDespesasBruta,
    limiteGlobal,
    /** O limite do Art. 78.º n.º 7 cortou alguma coisa? */
    limitado: somaDespesasBruta > limiteGlobal,
    /** Parte sujeita ao teto, já cortada. */
    dentroDoLimite,
    aplicado: deducaoDespesas,
  };

  // Ascendentes (Art. 78.º-A): 525 € por ascendente; 635 € se existir só um.
  // Fora do limite global, tal como a dedução por dependentes.
  const numAscendentes = Math.max(0, Math.floor(input.ascendentes ?? 0));
  const deducaoAscendentes =
    numAscendentes === 1 ? DEDUCAO_ASCENDENTE_UNICO.value : numAscendentes * DEDUCAO_ASCENDENTE.value;

  // Art. 87.º CIRS: dedução à coleta de 4×IAS pelo contribuinte com deficiência
  const deducaoDeficiencia = input.deficiencia ? DEDUCAO_DEFICIENCIA_COLETA.value : 0;

  // `deducaoDespesas` já inclui a pensão de alimentos (dentro do teto) e as
  // despesas gerais (fora dele) — somá-las outra vez aqui duplicaria a dedução.
  const deducoesColeta = deducaoDependentes + deducaoAscendentes + deducaoDespesas + deducaoDeficiencia;
  const irsEstimado = Math.max(0, coletaBruta - deducoesColeta);
  const minimoExistenciaAplicado = minimoExistenciaDecision.status === "applied";

  // ── SS anual estimado (para display; não afecta o IRS) ───────────────────
  // A acumulação com emprego NÃO é isenção total (Art. 157.º n.º 1 al. a): é
  // dispensa até 4 × IAS de rendimento relevante mensal médio, com contribuição
  // sobre o excedente acima disso. Zerar incondicionalmente escondia perto de
  // 9 000 €/ano a quem faturasse acima de ~36 800 €.
  const acumulaEmprego = !!input.acumulaEmprego;
  const ss = contribuicoesSS(brutoAnual, BASE_SS_POR_TIPO[tipo], {
    primeiroAno: input.isencaoSSPrimeiroAno,
    acumulaEmprego,
  });
  const ssAnual = ss.contribuicaoAnual;

  // ── Quanto deste IRS é dos recibos verdes? ──────────────────────────────
  //
  //  Com englobamento, `irsEstimado` é o imposto do agregado TODO — salário
  //  incluído. Mostrar esse número ao lado da faturação da Cat. B, ou subtraí-lo
  //  a ela para chegar a um "líquido", dá um resultado sem sentido.
  //
  //  A parte imputável à Cat. B é marginal, não proporcional: o salário ocupa
  //  os escalões de baixo e a atividade independente é tributada por cima. Por
  //  isso é a diferença entre o imposto com e sem ela — a mesma lógica que o
  //  regime de taxa fixa já usava acima para isolar `outrosRendimentos`.
  //
  //  Sem outros rendimentos as duas coisas coincidem e não se corre nada.
  const irsImputavelCatB =
    outrosRendimentos > 0 && !input.semDecomposicao
      ? Math.max(
          0,
          irsEstimado -
            simularIRSAnual({ ...input, brutoAnual: 0, semDecomposicao: true }).irsEstimado,
        )
      : irsEstimado;

  const taxaMediaEfetiva = brutoAnual > 0 ? irsImputavelCatB / brutoAnual : 0;
  const retencoesPagas = sanitize(input.retencoesPagas ?? 0);

  return {
    brutoAnual,
    irsImputavelCatB,
    regimeContabilidade,
    coeficienteBase,
    reducaoAno,
    coeficiente,
    rendimentoCoeficiente,
    despesasAutomaticas,
    despesasJustificadas,
    acrescimo15,
    rendimentoTributavel,
    isencaoJovem,
    rendimentoIsentoJovem,
    outrosRendimentos,
    exclusaoDeficiencia,
    rendimentoColetavel: rendimentoColetavelFinal,
    conjunta,
    ificiAplicado,
    rnhAntigoAplicado,
    programaRegressarAplicado,
    exclusaoProgramaRegressar,
    coletaBruta,
    adicionalSolidariedade,
    escaloesAplicados,
    deducaoDependentes,
    deducaoAscendentes,
    deducaoDespesas,
    deducoesDespesasDetalhe,
    deducaoPPR,
    deducaoDonativos,
    deducaoPensaoAlimentos,
    deducaoDeficiencia,
    deducoesColetaTotal: deducoesColeta,
    irsEstimado,
    minimoExistenciaAplicado,
    minimoExistenciaDecision,
    rendimentoColetavelAntesMinimo,
    abatimentoMinimoExistencia,
    taxaMediaEfetiva,
    retencoesPagas,
    ssAnual,
    acumulaEmprego,
    saldo: retencoesPagas - irsEstimado,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  COMPARADOR — recibos verdes (cat. B) vs sociedade (IRC + dividendos)
// ─────────────────────────────────────────────────────────────────────
export interface ComparacaoInput {
  brutoAnual: number;
  tipo: TipoAtividade;
  /** Despesas de atividade comuns aos dois regimes. */
  despesas?: number;
  /** Custos extra exclusivos da empresa (contabilista, admin…). */
  custosEmpresa?: number;
  /** Taxa de derrama municipal (0 a 0,015). */
  derrama?: number;
  irsJovemAno?: number;
}

export interface ComparacaoResult {
  freelancer: { irs: number; ss: number; despesas: number; liquido: number };
  empresa: {
    lucroTributavel: number;
    irc: number;
    derrama: number;
    dividendos: number;
    custosEmpresa: number;
    liquido: number;
  };
  /** Líquido empresa − líquido freelancer (positivo: empresa compensa). */
  diferenca: number;
}

/**
 * Compara o rendimento líquido disponível como trabalhador independente
 * (recibos verdes) vs. através de uma sociedade (IRC + distribuição de
 * dividendos).
 *
 * ESTIMATIVA de ordem de grandeza. NÃO modela: salário/SS do gerente,
 * tributação autónoma, opção de englobamento de dividendos, custos de
 * constituição, IMI/IUC, nem otimizações salário/dividendos. Assume SS de
 * prestação de serviços para o freelancer.
 */
export function compararRegimes(input: ComparacaoInput): ComparacaoResult {
  const bruto = sanitize(input.brutoAnual);
  const despesas = sanitize(input.despesas ?? 0);
  const custosEmpresa = sanitize(input.custosEmpresa ?? 0);
  const derramaTaxa = Math.min(Math.max(input.derrama ?? DERRAMA_MAX.value, 0), DERRAMA_MAX.value);

  // Freelancer (recibos verdes).
  const sim = simularIRSAnual({ brutoAnual: bruto, tipo: input.tipo, irsJovemAno: input.irsJovemAno, despesasJustificadas: despesas });
  // Base de SS com o teto de 12×IAS (coerente com calcular/simularIRSAnual): sem
  // este limite, a SS do independente ficava sobrestimada para rendimentos altos.
  const baseSSAnual = Math.min(bruto * SS_COEFICIENTE.servicos.value, SS_BASE_MAX_MENSAL.value * 12);
  const ss = baseSSAnual * SS_TAXA.value;
  const freelancerLiquido = bruto - despesas - sim.irsEstimado - ss;

  // Empresa (sociedade): IRC progressivo PME + derrama, depois dividendos.
  const lucroTributavel = Math.max(0, bruto - despesas - custosEmpresa);
  const irc =
    IRC_TAXA_PME.value * Math.min(lucroTributavel, IRC_LIMITE_PME.value) +
    IRC_TAXA_GERAL.value * Math.max(0, lucroTributavel - IRC_LIMITE_PME.value);
  const derrama = derramaTaxa * lucroTributavel;
  const aposIRC = Math.max(0, lucroTributavel - irc - derrama);
  const dividendos = DIVIDENDOS_TAXA.value * aposIRC;
  const empresaLiquido = aposIRC - dividendos;

  return {
    freelancer: { irs: sim.irsEstimado, ss, despesas, liquido: freelancerLiquido },
    empresa: { lucroTributavel, irc, derrama, dividendos, custosEmpresa, liquido: empresaLiquido },
    diferenca: empresaLiquido - freelancerLiquido,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  TRIBUTAÇÃO AUTÓNOMA — vive em `fiscal-empresa.ts`
//
//  Havia aqui um segundo motor de TA, e os dois discordavam: este não
//  aplicava o agravamento do Art. 88.º n.º 14 às despesas não documentadas,
//  quando a norma manda agravar «as taxas de tributação autónoma previstas
//  no presente artigo» sem excluir o n.º 1. Além disso não era usado por
//  componente nenhum — só pelo seu próprio teste.
//
//  Duas implementações da mesma regra é exatamente o problema que o
//  `fiscal-iva.ts` foi criado para resolver. Fica uma:
//  `calcularTributacaoAutonomaEmpresa` em `fiscal-empresa.ts`.
//
//  A única peça que só existia aqui — derivar a taxa do CUSTO DE AQUISIÇÃO
//  da viatura, incluindo o limite do Art. 88.º n.º 20 para as elétricas —
//  passou para `taxaTAViatura()` em `fiscal-empresa.ts`, para a capacidade
//  não se perder com a duplicação.
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
//  RFAI — Regime Fiscal de Apoio ao Investimento (Art. 22.º–26.º CFI)
// ─────────────────────────────────────────────────────────────────────

export interface RFAIInput {
  /** Investimento elegível do período (ativos corpóreos/incorpóreos produtivos). */
  investimentoElegivel: number;
  /** "interior" = Norte/Centro/Alentejo/Açores/Madeira; "litoral" = Lisboa/Algarve. */
  regiaoRFAI: "interior" | "litoral";
  /** Coleta de IRC do período (limite de dedução). */
  coletaIRC: number;
  /** true nos primeiros 3 anos de atividade elegível (limite de coleta = 100%). */
  primeirosTresAnos?: boolean;
  /** Saldo de RFAI reportado de anos anteriores ainda não deduzido. */
  reporteAnterior?: number;
}

export interface RFAIResult {
  deducaoCalculada: number;
  limiteColeta: number;
  deducaoAplicavel: number;
  reporteParaProximo: number;
}

/**
 * Estima a dedução RFAI à coleta de IRC.
 * Nota: não modela o RFAI contratual (Art. 8.º–22.º CFI) nem a elegibilidade
 * das despesas. Apenas estima o benefício máximo legal.
 */
export function estimarRFAI(input: RFAIInput): RFAIResult {
  const inv = sanitize(input.investimentoElegivel);
  const reporte = sanitize(input.reporteAnterior ?? 0);

  let deducaoCalculada: number;
  if (input.regiaoRFAI === "litoral") {
    deducaoCalculada = inv * RFAI_TAXA_LITORAL.value;
  } else {
    const limInv = RFAI_LIMITE_INVESTIMENTO_INTERIOR.value;
    deducaoCalculada =
      Math.min(inv, limInv) * RFAI_TAXA_INTERIOR.value +
      Math.max(0, inv - limInv) * RFAI_TAXA_INTERIOR_EXCEDENTE.value;
  }

  const totalDisponivel = deducaoCalculada + reporte;
  const limColeta = input.primeirosTresAnos
    ? input.coletaIRC
    : input.coletaIRC * RFAI_LIMITE_COLETA.value;
  const deducaoAplicavel = Math.min(totalDisponivel, limColeta);
  const reporteParaProximo = Math.max(0, totalDisponivel - deducaoAplicavel);

  return { deducaoCalculada, limiteColeta: limColeta, deducaoAplicavel, reporteParaProximo };
}

// ─────────────────────────────────────────────────────────────────────
//  DLRR — REVOGADA desde 1 jan 2023 (Art. 281.º da Lei 24-D/2022).
//  O motor `estimarDLRR` foi removido: simular a DLRR em 2026 produziria
//  uma poupança fiscal que já não existe. O benefício sucessor é o ICE
//  (Art. 43.º-D EBF) — ver `DLRR_REVOGADA_NOTA` em fiscal-data.ts.
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
//  SIFIDE II — Incentivos Fiscais à I&D (Art. 35.º–42.º CFI)
// ─────────────────────────────────────────────────────────────────────

export interface SIFIDEInput {
  /** Despesas com I&D do período atual. */
  despesasID: number;
  /**
   * Média das despesas I&D dos 2 anos anteriores.
   * 0 significa que não houve despesas nos últimos 2 anos (startup/sem histórico).
   */
  mediaAnterior: number;
  /** true se PME com < 2 exercícios sem benefício incremental anterior. */
  isPMEJovem?: boolean;
  /** Coleta de IRC do período. */
  coletaIRC: number;
  /** Saldo de SIFIDE reportado de anos anteriores ainda não deduzido. */
  reporteAnterior?: number;
}

export interface SIFIDEResult {
  creditoBase: number;
  incremento: number;
  creditoIncremental: number;
  majoracao: number;
  totalCredito: number;
  deducaoAplicavel: number;
  reporteParaProximo: number;
}

/**
 * Estima o crédito fiscal SIFIDE II.
 * A taxa incremental aplica-se ao aumento das despesas I&D face à média dos
 * 2 anos anteriores, com um teto de €1 500 000 de incremento.
 */
export function estimarSIFIDE(input: SIFIDEInput): SIFIDEResult {
  const despesas = sanitize(input.despesasID);
  const media = sanitize(input.mediaAnterior);
  const reporte = sanitize(input.reporteAnterior ?? 0);

  // Taxa base
  const creditoBase = despesas * SIFIDE_TAXA_BASE.value;

  // Taxa incremental (sobre aumento das despesas, capped ao teto)
  const incremento = Math.min(Math.max(0, despesas - media), SIFIDE_TETO_INCREMENTAL.value);
  const creditoIncremental = incremento * SIFIDE_TAXA_INCREMENTAL.value;

  // Majoração para PME jovem (sem histórico incremental)
  const majoracao = input.isPMEJovem ? despesas * SIFIDE_MAJORACAO_PME_JOVEM.value : 0;

  const totalCredito = creditoBase + creditoIncremental + majoracao + reporte;

  // Sem limite percentual de coleta explícito no SIFIDE — aplica na totalidade
  const deducaoAplicavel = Math.min(totalCredito, input.coletaIRC);
  const reporteParaProximo = Math.max(0, totalCredito - deducaoAplicavel);

  return { creditoBase, incremento, creditoIncremental, majoracao, totalCredito, deducaoAplicavel, reporteParaProximo };
}

// ─────────────────────────────────────────────────────────────────────
//  CATEGORIA F — rendimentos prediais (rendas puras, sem alojamento local)
//
//  Tributação autónoma sobre as rendas líquidas de despesas dedutíveis
//  (Art. 41.º CIRS): conservação/manutenção, IMI, imposto do selo, condomínio
//  e seguros pagos pelo senhorio — não mobiliário, equipamento nem juros de
//  financiamento. Sem Segurança Social e sem IVA. Não modela a opção pelo
//  englobamento (taxas progressivas). É estimativa, não apuramento oficial.
// ─────────────────────────────────────────────────────────────────────
export interface CategoriaFInput {
  /** Rendas brutas anuais. */
  rendaAnual: number;
  /** Despesas dedutíveis suportadas e pagas (Art. 41.º). */
  despesas?: number;
  /** Habitação (25%) vs. não habitacional (28%). */
  habitacao: boolean;
  /** Duração do contrato (só reduz a taxa no arrendamento habitacional). */
  duracao?: DuracaoArrendamento;
  /** Retenções na fonte já efetuadas (25% quando o inquilino tem contabilidade organizada). */
  retencoesPagas?: number;
}

export interface CategoriaFResult {
  rendaAnual: number;
  despesas: number;
  /** Rendimento líquido tributável = rendas − despesas (nunca negativo). */
  rendimentoLiquido: number;
  taxaBase: number;
  /** Redução por duração do contrato (pontos percentuais, como fração). */
  reducao: number;
  /** Taxa autónoma efetiva aplicada. */
  taxa: number;
  imposto: number;
  retencoesPagas: number;
  /** Maior que 0: reembolso estimado. Menor que 0: imposto a pagar. */
  saldo: number;
  avisos: string[];
}

/**
 * Estima o IRS de rendimentos prediais (categoria F) pela tributação autónoma.
 * A redução por duração do contrato só se aplica ao arrendamento habitacional.
 */
export function calcularCategoriaF(input: CategoriaFInput): CategoriaFResult {
  const rendaAnual = sanitize(input.rendaAnual);
  const despesas = sanitize(input.despesas ?? 0);
  const rendimentoLiquido = Math.max(0, rendaAnual - despesas);

  const taxaBase = input.habitacao
    ? CATEGORIA_F.taxaHabitacao.value
    : CATEGORIA_F.taxaNaoHabitacao.value;
  const reducao =
    input.habitacao && input.duracao ? CATEGORIA_F.reducaoDuracao.value[input.duracao] ?? 0 : 0;
  const taxa = Math.max(0, taxaBase - reducao);

  const imposto = rendimentoLiquido * taxa;
  const retencoesPagas = sanitize(input.retencoesPagas ?? 0);

  const avisos: string[] = [];
  if (reducao > 0) {
    avisos.push(
      "A redução por duração exige que o contrato de arrendamento esteja comunicado à Autoridade Tributária."
    );
  }
  if (!input.habitacao && input.duracao && input.duracao !== "curto") {
    avisos.push("As reduções por duração só se aplicam ao arrendamento para habitação.");
  }

  return {
    rendaAnual,
    despesas,
    rendimentoLiquido,
    taxaBase,
    reducao,
    taxa,
    imposto,
    retencoesPagas,
    saldo: retencoesPagas - imposto,
    avisos,
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  DECLARAÇÃO GUIADA — apuramento global de IRS por categorias
//
//  Combina todas as categorias de rendimento numa única simulação anual,
//  reaproveitando o núcleo verificado `simularIRSAnual` para o englobamento
//  (escalões progressivos, quociente conjugal, deduções à coleta, mínimo de
//  existência) e somando a tributação autónoma (mais-valias, dividendos e
//  rendas não englobadas) e o crédito por dupla tributação internacional.
//
//  ESTIMATIVA — não substitui o apuramento oficial. Cada resultado expõe a
//  sua memória de cálculo (fórmula, valores e base legal).
// ═══════════════════════════════════════════════════════════════════════

/** Linha da memória de cálculo: o que foi calculado, como e com que base legal. */
/**
 * Categoria de um rendimento obtido no estrangeiro (Anexo J). Determina a
 * dedução específica aplicável antes do englobamento.
 */
export type CategoriaEstrangeiro =
  | "trabalho"
  | "pensoes"
  | "capitais"
  | "prediais"
  | "maisvalias"
  | "outros";

export interface MemoriaLinha {
  /** Anexo/correspondência fiscal (ex.: "Anexo G"). */
  anexo?: string;
  rotulo: string;
  /** Fórmula textual já formatada (ex.: "1 000 € × 28%"). */
  formula?: string;
  valor: number;
  baseLegal?: string;
}

/** Componente de rendimento por categoria, para a revisão final. */
export interface ComponenteCategoria {
  id: string;
  anexo: string;
  rotulo: string;
  /** Rendimento bruto declarado na categoria. */
  bruto: number;
  /** Parte levada a englobamento (taxas progressivas). */
  englobado: number;
  /** Imposto autónomo da categoria (se não englobada). */
  impostoAutonomo: number;
}

/** Categoria A — trabalho dependente (Anexo A), com os encargos do Art. 25.º. */
export interface RendimentoCatAInput extends EncargosCatA {
  bruto: number;
  retencoes?: number;
}

/** Categoria H — pensões (Anexo A). A dedução do Art. 53.º não tem encargos. */
export interface RendimentoPensoesInput {
  bruto: number;
  retencoes?: number;
}

/** Entrada do Anexo J, com a categoria a que o rendimento pertence. */
export interface EntradaEstrangeiroInput {
  pais?: string;
  rendimento: number;
  impostoPago: number;
  /**
   * Categoria de origem. Determina a dedução específica aplicável antes do
   * englobamento (Art. 25.º/53.º) e, com ela, o numerador do crédito do
   * Art. 81.º. Sem categoria, o rendimento entra bruto e o crédito fica
   * inflacionado.
   */
  categoria?: CategoriaEstrangeiro;
  /**
   * A convenção para evitar a dupla tributação manda isentar este rendimento
   * com progressividade: não é tributado em Portugal, mas conta para determinar
   * a taxa aplicável ao resto (Art. 81.º n.º 8 CIRS e cláusula 23.º das CDT).
   */
  isencaoComProgressividade?: boolean;
}

export interface DeclaracaoInput {
  conjunta?: boolean;
  /** Categoria A — trabalho dependente (Anexo A). */
  salarios?: RendimentoCatAInput;
  /** Categoria H/A — pensões (Anexo A). */
  pensoes?: RendimentoPensoesInput;
  /**
   * Ano de obtenção de rendimentos para o IRS Jovem (Art. 12.º-B), ao nível do
   * TITULAR: a isenção abrange as categorias A e B, com um teto de 55 × IAS
   * partilhado entre as duas. Sobrepõe-se ao `independente.irsJovemAno`, que
   * só cobria a categoria B.
   */
  irsJovemAno?: number;
  /** Data de nascimento ISO do titular, para validar o limite de idade do Art. 12.º-B. */
  nascimento?: string;
  /** Categoria B — trabalho independente (Anexo B/C). */
  independente?: {
    brutoAnual: number;
    tipo: TipoAtividade;
    coefOverride?: number;
    aplicaRegra15Override?: boolean;
    anoAtividade?: number;
    regimeContabilidade?: "simplificado" | "organizada";
    despesasJustificadas?: number;
    retencoesPagas?: number;
    irsJovemAno?: number;
  };
  /** Categoria E — capitais: dividendos e juros (Anexo E). */
  capitais?: { dividendos?: number; juros?: number; retencoes?: number; englobar?: boolean };
  /** Categoria F — rendimentos prediais / rendas (Anexo F). */
  prediais?: {
    rendaAnual: number;
    despesas?: number;
    habitacao: boolean;
    duracao?: DuracaoArrendamento;
    retencoes?: number;
    englobar?: boolean;
  };
  /** Categoria G — mais-valias mobiliárias: ações, ETF, fundos, obrigações (Anexo G). */
  investimentos?: { saldo: number; algumCurtoPrazo?: boolean; englobar?: boolean };
  /** Categoria G — criptoativos (Anexo G). Longo prazo (≥365 dias) é isento. */
  cripto?: { ganhoCurtoPrazo?: number; ganhoLongoPrazo?: number; englobar?: boolean };
  /** Categoria G — venda de imóveis / mais-valias imobiliárias (Anexo G). */
  imoveisVenda?: {
    ganho: number;
    valorRealizacao?: number;
    valorReinvestido?: number;
    reinvesteHPP?: boolean;
    /**
     * Amortização do empréstimo contraído para a aquisição do imóvel vendido.
     * O Art. 10.º n.º 5 manda deduzi-la ao valor de realização antes de medir a
     * fração reinvestida — sem isto o denominador vem grande demais e a
     * exclusão fica menor do que a lei concede.
     */
    amortizacaoEmprestimo?: number;
  };
  /**
   * Rendimentos obtidos no estrangeiro (Anexo J). `porPais` permite o crédito
   * por dupla tributação calculado país a país (Art. 81.º), mais rigoroso que
   * o agregado.
   */
  estrangeiros?: {
    rendimento: number;
    impostoPago?: number;
    porPais?: EntradaEstrangeiroInput[];
  };
  /** Deduções à coleta (Anexo H). */
  deducoes?: DeducoesInput;
  dependentesDetalhe?: DependentesDetalhe;
  /** Lista detalhada de dependentes com guarda partilhada. */
  dependentesLista?: Array<{ ate3: boolean; deficiente: boolean; guarda: number }>;
  /** Ascendentes em comunhão de habitação (Art. 78.º-A). */
  ascendentes?: number;
  /** PPR aplicado no ano + escalão de idade (Art. 21.º EBF). */
  ppr?: { valor: number; escalaoIdade: "ate35" | "de35a50" | "mais50" };
  /** Donativos do ano (Art. 62.º/63.º EBF): valor + majoração + sem-limite. */
  donativos?: { valor: number; fator: number; semLimite: boolean };
  /** Pensões de alimentos pagas (Art. 83.º-A CIRS). */
  pensaoAlimentos?: number;
  /** Encargos com lares (Art. 84.º CIRS). */
  lares?: number;
  deficiencia?: boolean;
  ifici?: boolean;
  /** Isenção de SS no 1.º ano de atividade (independente). */
  isencaoSSPrimeiroAno?: boolean;
  /** Acumulação com trabalho dependente que cobre a SS (independente). */
  acumulaEmprego?: boolean;
  /**
   * Sujeito passivo B (cônjuge / unido de facto). Só relevante em tributação
   * conjunta: o seu rendimento coletável é apurado por pessoa (dedução
   * específica cat. A, coeficiente e IRS Jovem cat. B) e agregado ao do SP A
   * antes do quociente conjugal (Art. 69.º CIRS).
   */
  titularB?: {
    salarios?: RendimentoCatAInput;
    pensoes?: RendimentoPensoesInput;
    /** IRS Jovem do SP B (Art. 12.º-B), com teto próprio de 55 × IAS. */
    irsJovemAno?: number;
    nascimento?: string;
    independente?: {
      brutoAnual: number;
      tipo: TipoAtividade;
      coefOverride?: number;
      aplicaRegra15Override?: boolean;
      anoAtividade?: number;
      regimeContabilidade?: "simplificado" | "organizada";
      despesasJustificadas?: number;
      retencoesPagas?: number;
      irsJovemAno?: number;
    };
    isencaoSSPrimeiroAno?: boolean;
    acumulaEmprego?: boolean;
    deficiencia?: boolean;
  };
  pagamentosPorConta?: number;
}

export interface DeclaracaoResult {
  rendimentoGlobal: number;
  rendimentoColetavel: number;
  coletaEnglobamento: number;
  impostoAutonomo: number;
  deducoesColeta: number;
  creditoDuplaTributacao: number;
  irsTotal: number;
  ssAnual: number;
  retencoesTotais: number;
  pagamentosPorConta: number;
  /** > 0: reembolso estimado. < 0: imposto a pagar. */
  saldo: number;
  /** Taxa efetiva (IRS total / rendimento global). */
  taxaEfetiva: number;
  componentes: ComponenteCategoria[];
  memoria: MemoriaLinha[];
  /** Resultado interno do englobamento (núcleo verificado). */
  englobamento: SimulacaoIRS;
  /** true quando o englobamento de mais-valias mobiliárias foi obrigatório. */
  englobamentoMobObrigatorio: boolean;
  avisos: string[];
}

/** Encargos do titular que entram na dedução específica da categoria A. */
export interface EncargosCatA {
  /** Contribuições obrigatórias para regimes de proteção social (TSU de 11%). */
  contribuicoesSS?: number;
  /** Quotizações sindicais suportadas pelo titular. */
  quotizacoesSindicais?: number;
  /** Quotizações para ordens profissionais indispensáveis à atividade. */
  quotizacoesOrdem?: number;
}

/** Decomposição da dedução específica da categoria A, para a memória de cálculo. */
export interface DeducaoEspecificaCatA {
  liquido: number;
  especifica: number;
  /** Parcela da alínea a) do n.º 1, já com o n.º 2 e o n.º 4 aplicados. */
  base: number;
  /** Parcela das quotizações sindicais, já majorada em 100%. */
  sindicais: number;
  /** A dedução foi determinada pelas contribuições para a SS (n.º 2)? */
  porContribuicoes: boolean;
  /** A dedução foi elevada por quotizações para ordens profissionais (n.º 4)? */
  elevadaPorOrdem: boolean;
}

/**
 * Dedução específica anual da categoria A (Art. 25.º CIRS).
 *
 * Não é um valor fixo. A alínea a) do n.º 1 dá o piso de 8,54 × IAS, mas:
 *  · n.º 2 — se as contribuições obrigatórias para a proteção social excederem
 *    esse piso, a dedução é o TOTAL dessas contribuições. Acima de ~41 701 €
 *    de salário a TSU de 11% já ultrapassa o piso, e ignorar isto cobrava
 *    imposto sobre rendimento que a lei manda deduzir;
 *  · n.º 4 — quotizações para ordens profissionais elevam a dedução até 75% de
 *    12 × IAS (relevante para advogados, médicos, engenheiros, contabilistas);
 *  · n.º 1 al. c) — quotizações sindicais até 1% do bruto, acrescidas de 100%,
 *    somam-se por cima.
 *
 * A categoria B já fazia `max(dedução específica; contribuições SS)` — isto é
 * o mesmo padrão do lado da categoria A.
 */
function rendimentoLiquidoCatA(bruto: number, encargos?: EncargosCatA): DeducaoEspecificaCatA {
  const brutoSan = sanitize(bruto);
  const piso = DEDUCAO_ESPECIFICA_DEPENDENTE.value;
  const ss = sanitize(encargos?.contribuicoesSS ?? 0);
  const ordem = sanitize(encargos?.quotizacoesOrdem ?? 0);
  const sindicaisPagas = sanitize(encargos?.quotizacoesSindicais ?? 0);

  // n.º 4: só a DIFERENÇA face à alínea a) pode vir das quotizações de ordem,
  // e o resultado nunca passa de 75% × 12 × IAS.
  const comOrdem = Math.min(DEDUCAO_ESPECIFICA_DEP_MAX_ORDENS.value, piso + ordem);
  const base = Math.max(piso, ss, comOrdem);

  // n.º 1 al. c): limite de 1% do bruto, depois acrescidas de 100%.
  const q = QUOTIZACOES_SINDICAIS.value;
  const sindicais =
    Math.min(sindicaisPagas, brutoSan * q.limiteFracaoBruto) * (1 + q.majoracao);

  // «Até à sua concorrência» (n.º 1): a dedução nunca ultrapassa o rendimento.
  const especifica = Math.min(brutoSan, base + sindicais);
  return {
    liquido: Math.max(0, brutoSan - especifica),
    especifica,
    base,
    sindicais,
    porContribuicoes: ss > piso && ss >= comOrdem,
    elevadaPorOrdem: comOrdem > Math.max(piso, ss),
  };
}

/**
 * Exclusão de tributação por deficiência (Art. 56.º-A CIRS): os rendimentos
 * brutos de CADA UMA das categorias A, B e H contam apenas por 85%, com um
 * limite de 2 500 € POR CATEGORIA. O motor aplicava-a só à categoria B — quem
 * tinha salário ou pensão via a exclusão desaparecer, apesar de a UI a
 * prometer.
 */
function exclusaoDeficienciaCategoria(brutoCategoria: number, temDeficiencia?: boolean): number {
  if (!temDeficiencia) return 0;
  return Math.min(
    sanitize(brutoCategoria) * EXCLUSAO_DEFICIENCIA_TAXA.value,
    EXCLUSAO_DEFICIENCIA_MAX.value
  );
}

/** Apuramento de uma categoria de rendimento com dedução específica (A ou H). */
interface CategoriaDependenteApurada {
  bruto: number;
  /** Exclusão do Art. 56.º-A desta categoria (teto próprio de 2 500 €). */
  exclusaoDeficiencia: number;
  /** Dedução específica aplicada (Art. 25.º ou 53.º). */
  especifica: number;
  /** Decomposição do Art. 25.º; ausente nas pensões. */
  detalheEspecifica?: DeducaoEspecificaCatA;
  /** Isenção do IRS Jovem imputada a esta categoria. */
  isentoJovem: number;
  /** Percentagem de isenção do ano (0 se não aplicável). */
  percentagemJovem: number;
  /** Rendimento que vai a englobamento, já líquido de tudo. */
  liquido: number;
}

/**
 * Apura uma categoria com dedução específica (A — trabalho dependente; H —
 * pensões), pela ordem que a lei impõe: exclusão do Art. 56.º-A sobre o bruto,
 * dedução específica sobre o que resta e, por fim, a isenção do Art. 12.º-B.
 */
function apurarCategoriaDependente(args: {
  bruto?: number;
  encargos?: EncargosCatA;
  deficiencia?: boolean;
  irsJovemAno?: number;
  /** Teto do IRS Jovem ainda disponível para o titular. */
  tetoJovemDisponivel: number;
}): CategoriaDependenteApurada {
  const bruto = sanitize(args.bruto ?? 0);
  if (bruto <= 0) {
    return { bruto: 0, exclusaoDeficiencia: 0, especifica: 0, isentoJovem: 0, percentagemJovem: 0, liquido: 0 };
  }
  const exclusaoDeficiencia = exclusaoDeficienciaCategoria(bruto, args.deficiencia);
  const considerado = Math.max(0, bruto - exclusaoDeficiencia);
  const detalhe = rendimentoLiquidoCatA(considerado, args.encargos);
  const percentagemJovem = isencaoIRSJovem(args.irsJovemAno);
  const isentoJovem = Math.min(detalhe.liquido * percentagemJovem, Math.max(0, args.tetoJovemDisponivel));
  return {
    bruto,
    exclusaoDeficiencia,
    especifica: detalhe.especifica,
    detalheEspecifica: detalhe,
    isentoJovem,
    percentagemJovem,
    liquido: Math.max(0, detalhe.liquido - isentoJovem),
  };
}

/** Texto da fórmula da dedução específica da categoria A, para a memória. */
function descreverDeducaoCatA(c: CategoriaDependenteApurada): string {
  const d = c.detalheEspecifica;
  const partes = [fmt(c.bruto)];
  if (c.exclusaoDeficiencia > 0) partes.push(`− exclusão ${fmt(c.exclusaoDeficiencia)}`);
  if (d?.porContribuicoes) {
    partes.push(`− contribuições para a SS ${fmt(d.base)} (Art. 25.º n.º 2)`);
  } else if (d?.elevadaPorOrdem) {
    partes.push(`− dedução específica elevada ${fmt(d.base)} (Art. 25.º n.º 4)`);
  } else {
    partes.push(`− dedução específica ${fmt(d?.base ?? c.especifica)}`);
  }
  if (d && d.sindicais > 0) partes.push(`− quotizações sindicais majoradas ${fmt(d.sindicais)}`);
  if (c.isentoJovem > 0) partes.push(`− IRS Jovem ${fmt(c.isentoJovem)}`);
  return partes.join(" ");
}

/**
 * Normaliza o Anexo J numa lista de entradas. Quando só existe o agregado
 * (`rendimento`/`impostoPago`, sem `porPais`), devolve uma entrada única sem
 * categoria — o rendimento entra bruto, como entrava antes, mas o caminho
 * detalhado passa a estar disponível a quem o preencha.
 */
function normalizarEntradasEstrangeiro(
  ext: DeclaracaoInput["estrangeiros"]
): EntradaEstrangeiroInput[] {
  if (!ext) return [];
  const porPais = ext.porPais?.filter((p) => sanitize(p.rendimento) > 0) ?? [];
  if (porPais.length > 0) return porPais;
  const total = sanitize(ext.rendimento);
  if (total <= 0) return [];
  return [{ rendimento: total, impostoPago: sanitize(ext.impostoPago ?? 0) }];
}

/**
 * Rendimento estrangeiro líquido da dedução específica da sua categoria.
 *
 * O Art. 15.º manda tributar o rendimento mundial pelas regras da categoria
 * correspondente — um salário pago no estrangeiro tem a mesma dedução
 * específica do Art. 25.º que um salário nacional. As categorias E, F e G não
 * têm dedução específica no Anexo J (as despesas do Art. 41.º declaram-se à
 * parte), por isso entram pelo valor declarado.
 */
function liquidoEstrangeiroPorCategoria(
  bruto: number,
  categoria?: CategoriaEstrangeiro
): { liquido: number; especifica: number; rotulo: string } {
  const b = sanitize(bruto);
  switch (categoria) {
    case "trabalho": {
      const d = rendimentoLiquidoCatA(b);
      return { liquido: d.liquido, especifica: d.especifica, rotulo: "trabalho" };
    }
    case "pensoes": {
      const d = rendimentoLiquidoCatA(b);
      return { liquido: d.liquido, especifica: d.especifica, rotulo: "pensões" };
    }
    case "capitais":
      return { liquido: b, especifica: 0, rotulo: "capitais" };
    case "prediais":
      return { liquido: b, especifica: 0, rotulo: "rendas" };
    case "maisvalias":
      return { liquido: b, especifica: 0, rotulo: "mais-valias" };
    default:
      return { liquido: b, especifica: 0, rotulo: "sem categoria indicada" };
  }
}

/** Limite do último escalão de IRS (gatilho do englobamento obrigatório). */
function limiteUltimoEscalao(): number {
  const e = ESCALOES_IRS.value;
  return e.length >= 2 ? (e[e.length - 2].ate ?? Infinity) : Infinity;
}

/**
 * ENTRADA PÚBLICA do apuramento de IRS.
 *
 * Apura a declaração inteira a partir das categorias declaradas: decompõe cada
 * uma (deduções específicas do Art. 25.º/53.º, exclusão do Art. 56.º-A, IRS
 * Jovem do Art. 12.º-B), monta os factos do artigo 70.º POR TITULAR, delega o
 * englobamento em `simularIRSAnual` e acrescenta a tributação autónoma e o
 * crédito por dupla tributação internacional.
 *
 * É esta a função a usar sempre que exista mais do que categoria B. Chamar o
 * núcleo diretamente com um agregado em `outrosRendimentos` perde a informação
 * de categoria — e com ela o mínimo de existência, a isenção do IRS Jovem da
 * categoria A e a exclusão por deficiência das categorias A e H.
 */
export function simularDeclaracaoIRS(input: DeclaracaoInput): DeclaracaoResult {
  const conjunta = !!input.conjunta;
  const memoria: MemoriaLinha[] = [];
  const componentes: ComponenteCategoria[] = [];
  const avisos: string[] = [];

  const indep = input.independente;
  const cap = input.capitais;
  const pred = input.prediais;
  const inv = input.investimentos;
  const cripto = input.cripto;
  const venda = input.imoveisVenda;
  const ext = input.estrangeiros;

  // ── Rendimentos englobáveis fora da categoria B ───────────────────────────
  // (a categoria B é processada dentro de `simularIRSAnual` via brutoAnual)
  let englobaveisBase = 0;

  const tetoJovem = IRS_JOVEM.tetoIAS.value * IAS_VALUE;
  // Teto do IRS Jovem já gasto pela categoria A de cada titular. É por titular:
  // o Art. 12.º-B dá 55 × IAS a cada pessoa, para repartir entre as categorias
  // A e B — não 55 × IAS a cada categoria.
  let jovemConsumidoA = 0;
  let jovemConsumidoB = 0;

  // ── Categorias A e H do sujeito passivo A ─────────────────────────────────
  // Cada categoria é apurada por inteiro aqui: exclusão do Art. 56.º-A sobre o
  // bruto, dedução específica do Art. 25.º/53.º e isenção do IRS Jovem sobre o
  // líquido. Antes, tudo isto era exclusivo da categoria B e a categoria A
  // entrava como um número anónimo — o que desligava as três regras a quem
  // tivesse salário ou pensão.
  const catA = apurarCategoriaDependente({
    bruto: input.salarios?.bruto,
    encargos: input.salarios,
    deficiencia: input.deficiencia,
    irsJovemAno: input.irsJovemAno,
    tetoJovemDisponivel: tetoJovem,
  });
  const salBruto = catA.bruto;
  if (salBruto > 0) {
    jovemConsumidoA += catA.isentoJovem;
    englobaveisBase += catA.liquido;
    memoria.push({
      anexo: "Anexo A",
      rotulo: "Rendimento líquido de trabalho dependente",
      formula: descreverDeducaoCatA(catA),
      valor: catA.liquido,
      baseLegal: "Art. 25.º CIRS",
    });
    if (catA.exclusaoDeficiencia > 0) {
      memoria.push({
        anexo: "Anexo A",
        rotulo: "Exclusão por deficiência — trabalho dependente",
        formula: `${fmt(salBruto)} × ${pct(EXCLUSAO_DEFICIENCIA_TAXA.value)} (máx. ${fmt(EXCLUSAO_DEFICIENCIA_MAX.value)})`,
        valor: -catA.exclusaoDeficiencia,
        baseLegal: "Art. 56.º-A CIRS",
      });
    }
    if (catA.isentoJovem > 0) {
      memoria.push({
        anexo: "Anexo A",
        rotulo: "IRS Jovem — trabalho dependente",
        formula: `${pct(catA.percentagemJovem)} do rendimento líquido (teto ${fmt(tetoJovem)} por titular)`,
        valor: -catA.isentoJovem,
        baseLegal: "Art. 12.º-B CIRS",
      });
    }
    componentes.push({ id: "salarios", anexo: "Anexo A", rotulo: "Trabalho dependente", bruto: salBruto, englobado: catA.liquido, impostoAutonomo: 0 });
  }

  // Categoria H — pensões. Dedução específica própria (Art. 53.º), sem os
  // encargos do Art. 25.º, mas com exclusão por deficiência própria: o teto de
  // 2 500 € do Art. 56.º-A é POR CATEGORIA, não por pessoa.
  const catH = apurarCategoriaDependente({
    bruto: input.pensoes?.bruto,
    deficiencia: input.deficiencia,
    tetoJovemDisponivel: 0,
  });
  const pensBruto = catH.bruto;
  if (pensBruto > 0) {
    englobaveisBase += catH.liquido;
    memoria.push({
      anexo: "Anexo A",
      rotulo: "Rendimento líquido de pensões",
      formula: `${fmt(pensBruto)}${catH.exclusaoDeficiencia > 0 ? ` − exclusão ${fmt(catH.exclusaoDeficiencia)}` : ""} − dedução específica ${fmt(catH.especifica)}`,
      valor: catH.liquido,
      baseLegal: "Art. 53.º CIRS",
    });
    if (catH.exclusaoDeficiencia > 0) {
      memoria.push({
        anexo: "Anexo A",
        rotulo: "Exclusão por deficiência — pensões",
        formula: `${fmt(pensBruto)} × ${pct(EXCLUSAO_DEFICIENCIA_TAXA.value)} (máx. ${fmt(EXCLUSAO_DEFICIENCIA_MAX.value)})`,
        valor: -catH.exclusaoDeficiencia,
        baseLegal: "Art. 56.º-A CIRS",
      });
    }
    componentes.push({ id: "pensoes", anexo: "Anexo A", rotulo: "Pensões", bruto: pensBruto, englobado: catH.liquido, impostoAutonomo: 0 });
  }

  // Categoria E — capitais (dividendos + juros)
  const dividendos = sanitize(cap?.dividendos ?? 0);
  const juros = sanitize(cap?.juros ?? 0);
  const capEnglobar = !!cap?.englobar;
  let impostoAutonomoCapitais = 0;
  if (dividendos > 0 || juros > 0) {
    if (capEnglobar) {
      // Dividendos: só 50% incluído (Art. 40.º-A); juros: 100%.
      const incluido = dividendos * DIV_INCLUSAO_ENGLOBAMENTO.value + juros;
      englobaveisBase += incluido;
      memoria.push({
        anexo: "Anexo E",
        rotulo: "Capitais englobados",
        formula: `${fmt(dividendos)} × ${pct(DIV_INCLUSAO_ENGLOBAMENTO.value)} + ${fmt(juros)}`,
        valor: incluido,
        baseLegal: "Art. 40.º-A CIRS (opção de englobamento)",
      });
      componentes.push({ id: "capitais", anexo: "Anexo E", rotulo: "Dividendos e juros", bruto: dividendos + juros, englobado: incluido, impostoAutonomo: 0 });
    } else {
      impostoAutonomoCapitais = (dividendos + juros) * DIVIDENDOS_TAXA.value;
      memoria.push({
        anexo: "Anexo E",
        rotulo: "Capitais — taxa liberatória",
        formula: `${fmt(dividendos + juros)} × ${pct(DIVIDENDOS_TAXA.value)}`,
        valor: impostoAutonomoCapitais,
        baseLegal: "Art. 71.º CIRS",
      });
      componentes.push({ id: "capitais", anexo: "Anexo E", rotulo: "Dividendos e juros", bruto: dividendos + juros, englobado: 0, impostoAutonomo: impostoAutonomoCapitais });
    }
  }

  // Categoria F — rendas
  let impostoAutonomoF = 0;
  if (pred && sanitize(pred.rendaAnual) > 0) {
    const liquidaF = Math.max(0, sanitize(pred.rendaAnual) - sanitize(pred.despesas ?? 0));
    if (pred.englobar) {
      englobaveisBase += liquidaF;
      memoria.push({ anexo: "Anexo F", rotulo: "Rendas englobadas", formula: `${fmt(pred.rendaAnual)} − despesas ${fmt(pred.despesas ?? 0)}`, valor: liquidaF, baseLegal: "Art. 41.º CIRS (opção de englobamento)" });
      componentes.push({ id: "prediais", anexo: "Anexo F", rotulo: "Rendimentos prediais", bruto: sanitize(pred.rendaAnual), englobado: liquidaF, impostoAutonomo: 0 });
    } else {
      const simF = calcularCategoriaF({ rendaAnual: pred.rendaAnual, despesas: pred.despesas, habitacao: pred.habitacao, duracao: pred.duracao });
      impostoAutonomoF = simF.imposto;
      memoria.push({ anexo: "Anexo F", rotulo: "Rendas — taxa autónoma", formula: `${fmt(simF.rendimentoLiquido)} × ${pct(simF.taxa)}`, valor: impostoAutonomoF, baseLegal: "Art. 72.º CIRS" });
      componentes.push({ id: "prediais", anexo: "Anexo F", rotulo: "Rendimentos prediais", bruto: sanitize(pred.rendaAnual), englobado: 0, impostoAutonomo: impostoAutonomoF });
    }
  }

  // Categoria G — mais-valias imobiliárias (venda): só 50% englobado, com
  // exclusão por reinvestimento em HPP (proporcional ao valor reinvestido).
  if (venda && sanitize(venda.ganho) > 0) {
    const ganho = sanitize(venda.ganho);
    let fracaoExcluida = 0;
    // Art. 10.º n.º 5: o denominador é o valor de realização DEDUZIDO da
    // amortização de eventual empréstimo contraído para adquirir o imóvel
    // vendido. Sem essa dedução o denominador vem inflacionado e a fração
    // reinvestida — logo, a exclusão — fica menor do que a lei concede.
    const amortizacao = sanitize(venda.amortizacaoEmprestimo ?? 0);
    const realizacaoRelevante = Math.max(0, sanitize(venda.valorRealizacao ?? 0) - amortizacao);
    if (venda.reinvesteHPP && realizacaoRelevante > 0) {
      fracaoExcluida = Math.min(1, sanitize(venda.valorReinvestido ?? 0) / realizacaoRelevante);
    }
    const ganhoTributavel = ganho * (1 - fracaoExcluida);
    const incluido = ganhoTributavel * MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value;
    englobaveisBase += incluido;
    memoria.push({
      anexo: "Anexo G",
      rotulo: "Mais-valia imobiliária englobada",
      formula: fracaoExcluida > 0
        ? `(${fmt(ganho)} × ${pct(1 - fracaoExcluida)} reinvestimento) × ${pct(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)}`
        : `${fmt(ganho)} × ${pct(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)}`,
      valor: incluido,
      baseLegal: "Art. 43.º n.º 2 + Art. 10.º n.º 5 CIRS",
    });
    componentes.push({ id: "imoveisVenda", anexo: "Anexo G", rotulo: "Venda de imóvel", bruto: ganho, englobado: incluido, impostoAutonomo: 0 });
    if (fracaoExcluida > 0 && fracaoExcluida < 1) {
      avisos.push("O reinvestimento parcial em habitação própria exclui apenas a fração do ganho proporcional ao valor reinvestido (Art. 10.º n.º 5 CIRS).");
    }
    if (amortizacao > 0) {
      memoria.push({
        anexo: "Anexo G",
        rotulo: "Amortização do empréstimo do imóvel vendido",
        formula: `valor de realização ${fmt(sanitize(venda.valorRealizacao ?? 0))} − ${fmt(amortizacao)}`,
        valor: -amortizacao,
        baseLegal: "Art. 10.º n.º 5 CIRS",
      });
    }
  }

  // ── Rendimentos estrangeiros (Anexo J) ────────────────────────────────────
  // Entravam brutos no englobamento: um salário de 30 000 € ganho lá fora
  // pagava imposto sobre 30 000 € enquanto o mesmo salário nacional pagava
  // sobre 25 412,91 €. A categoria de cada entrada determina a dedução
  // específica a aplicar antes do englobamento — e é o rendimento LÍQUIDO
  // dessa dedução que serve de numerador ao crédito do Art. 81.º n.º 1 al. b).
  const entradasExt = normalizarEntradasEstrangeiro(ext);
  let rendEstrangeiroEnglobado = 0;
  let rendEstrangeiroBruto = 0;
  let rendEstrangeiroIsentoProgressividade = 0;
  const creditoPorEntrada: Array<{ pais?: string; impostoPago: number; liquido: number }> = [];
  for (const e of entradasExt) {
    const bruto = sanitize(e.rendimento);
    if (bruto <= 0) continue;
    rendEstrangeiroBruto += bruto;
    const { liquido, especifica, rotulo } = liquidoEstrangeiroPorCategoria(bruto, e.categoria);
    if (e.isencaoComProgressividade) {
      // Método da isenção com progressividade: não é tributado em Portugal,
      // mas conta para determinar a taxa aplicável ao resto (Art. 81.º n.º 8).
      rendEstrangeiroIsentoProgressividade += liquido;
      memoria.push({
        anexo: "Anexo J",
        rotulo: `Isento com progressividade${e.pais ? ` — ${e.pais}` : ""} (${rotulo})`,
        formula: `${fmt(bruto)}${especifica > 0 ? ` − dedução específica ${fmt(especifica)}` : ""} · conta só para a taxa`,
        valor: liquido,
        baseLegal: "Art. 81.º n.º 8 CIRS + CDT",
      });
      continue;
    }
    rendEstrangeiroEnglobado += liquido;
    creditoPorEntrada.push({ pais: e.pais, impostoPago: sanitize(e.impostoPago), liquido });
    memoria.push({
      anexo: "Anexo J",
      rotulo: `Rendimento obtido no estrangeiro${e.pais ? ` — ${e.pais}` : ""} (${rotulo})`,
      formula: especifica > 0 ? `${fmt(bruto)} − dedução específica ${fmt(especifica)}` : undefined,
      valor: liquido,
      baseLegal: "Art. 15.º + Art. 81.º CIRS",
    });
  }
  if (rendEstrangeiroBruto > 0) {
    englobaveisBase += rendEstrangeiroEnglobado;
    componentes.push({
      id: "estrangeiros",
      anexo: "Anexo J",
      rotulo: "Rendimentos estrangeiros",
      bruto: rendEstrangeiroBruto,
      englobado: rendEstrangeiroEnglobado,
      impostoAutonomo: 0,
    });
  }
  if (rendEstrangeiroIsentoProgressividade > 0) {
    avisos.push(
      "Há rendimento estrangeiro isento com progressividade: não é tributado em Portugal, mas eleva a taxa aplicada ao restante rendimento (Art. 81.º n.º 8 CIRS)."
    );
  }

  // ── Sujeito passivo B (tributação conjunta) ───────────────────────────────
  // Em declaração conjunta agregam-se os rendimentos coletáveis de ambos e
  // aplica-se o quociente conjugal (Art. 69.º CIRS). A dedução específica da
  // categoria A (Art. 25.º) e o coeficiente/IRS Jovem da categoria B
  // (Art. 31.º/12.º-B) são por pessoa — por isso o coletável do SP B é apurado
  // de forma independente, reaproveitando o motor verificado, e só depois
  // somado à base englobável do agregado.
  const tb = input.titularB;
  let ssAnualB = 0;
  let retencoesB = 0;
  let rendimentoGlobalB = 0;
  // Factos do artigo 70.º do SP B, montados aqui porque é aqui que se conhece
  // o bruto e as deduções específicas dele.
  let brutoTitularB = 0;
  let especificasTitularB = 0;
  let tributavelCatB_B = 0;
  let catBElegivelB = false;
  if (conjunta && tb) {
    let outrosB = 0;
    const catAB = apurarCategoriaDependente({
      bruto: tb.salarios?.bruto,
      encargos: tb.salarios,
      deficiencia: tb.deficiencia,
      irsJovemAno: tb.irsJovemAno,
      tetoJovemDisponivel: tetoJovem,
    });
    const salB = catAB.bruto;
    if (salB > 0) {
      jovemConsumidoB += catAB.isentoJovem;
      outrosB += catAB.liquido;
      rendimentoGlobalB += salB;
      retencoesB += sanitize(tb.salarios?.retencoes ?? 0);
      memoria.push({ anexo: "Anexo A", rotulo: "SP B — rendimento líquido de trabalho dependente", formula: descreverDeducaoCatA(catAB), valor: catAB.liquido, baseLegal: "Art. 25.º CIRS" });
      componentes.push({ id: "salarios-b", anexo: "Anexo A", rotulo: "Trabalho dependente (SP B)", bruto: salB, englobado: catAB.liquido, impostoAutonomo: 0 });
    }
    const catHB = apurarCategoriaDependente({
      bruto: tb.pensoes?.bruto,
      deficiencia: tb.deficiencia,
      tetoJovemDisponivel: 0,
    });
    const pensB = catHB.bruto;
    if (pensB > 0) {
      outrosB += catHB.liquido;
      rendimentoGlobalB += pensB;
      retencoesB += sanitize(tb.pensoes?.retencoes ?? 0);
      memoria.push({ anexo: "Anexo A", rotulo: "SP B — rendimento líquido de pensões", formula: `${fmt(pensB)}${catHB.exclusaoDeficiencia > 0 ? ` − exclusão ${fmt(catHB.exclusaoDeficiencia)}` : ""} − dedução específica ${fmt(catHB.especifica)}`, valor: catHB.liquido, baseLegal: "Art. 53.º CIRS" });
      componentes.push({ id: "pensoes-b", anexo: "Anexo A", rotulo: "Pensões (SP B)", bruto: pensB, englobado: catHB.liquido, impostoAutonomo: 0 });
    }
    const indepB = tb.independente;
    const brutoIndepB = sanitize(indepB?.brutoAnual ?? 0);
    // Coletável e SS do SP B isolados: sem quociente, sem deduções à coleta e
    // sem IFICI (estes aplicam-se ao agregado na simulação principal).
    const simB = simularIRSAnual({
      brutoAnual: brutoIndepB,
      tipo: indepB?.tipo ?? "art151",
      coefOverride: indepB?.coefOverride,
      aplicaRegra15Override: indepB?.aplicaRegra15Override,
      anoAtividade: indepB?.anoAtividade,
      regimeContabilidade: indepB?.regimeContabilidade,
      despesasJustificadas: indepB?.despesasJustificadas,
      irsJovemAno: indepB?.irsJovemAno ?? tb.irsJovemAno,
      irsJovemTetoConsumido: jovemConsumidoB,
      outrosRendimentos: outrosB,
      conjunta: false,
      deficiencia: tb.deficiencia,
      isencaoSSPrimeiroAno: tb.isencaoSSPrimeiroAno,
      acumulaEmprego: tb.acumulaEmprego,
      retencoesPagas: 0,
      // O artigo 70.º é apurado por titular na simulação do agregado, mais
      // abaixo: aplicá-lo aqui também abateria duas vezes ao mesmo rendimento.
      semMinimoExistencia: true,
    });
    tributavelCatB_B = simB.rendimentoTributavel;
    englobaveisBase += simB.rendimentoColetavel;
    ssAnualB = simB.ssAnual;
    retencoesB += sanitize(indepB?.retencoesPagas ?? 0);
    if (brutoIndepB > 0) {
      rendimentoGlobalB += brutoIndepB;
      memoria.push({
        anexo: "Anexo B",
        rotulo: simB.regimeContabilidade === "organizada" ? "SP B — rendimento tributável (contab. organizada)" : "SP B — rendimento tributável (regime simplificado)",
        formula: simB.regimeContabilidade === "organizada"
          ? `${fmt(simB.brutoAnual)} − despesas ${fmt(simB.despesasJustificadas)}`
          : `${fmt(simB.brutoAnual)} × coef. ${pct(simB.coeficiente)}${simB.acrescimo15 > 0 ? ` + acréscimo 15% ${fmt(simB.acrescimo15)}` : ""}`,
        valor: simB.rendimentoTributavel,
        baseLegal: "Art. 31.º CIRS",
      });
      componentes.push({ id: "independente-b", anexo: "Anexo B", rotulo: "Trabalho independente (SP B)", bruto: simB.brutoAnual, englobado: simB.rendimentoTributavel, impostoAutonomo: 0 });
    }
    brutoTitularB = salB + pensB + brutoIndepB;
    especificasTitularB =
      catAB.especifica + catHB.especifica + Math.max(0, brutoIndepB - tributavelCatB_B);
    catBElegivelB = (indepB?.tipo ?? "art151") === "art151";
  }

  // ── Pré-passagem: decidir englobamento obrigatório das mais-valias mobiliárias ──
  const baseSimInput = (
    outros: number,
    factsTitulares?: Array<Partial<MinimoExistenciaFacts>>
  ): SimulacaoInput => ({
    brutoAnual: sanitize(indep?.brutoAnual ?? 0),
    tipo: indep?.tipo ?? "art151",
    coefOverride: indep?.coefOverride,
    aplicaRegra15Override: indep?.aplicaRegra15Override,
    anoAtividade: indep?.anoAtividade,
    regimeContabilidade: indep?.regimeContabilidade,
    despesasJustificadas: indep?.despesasJustificadas,
    irsJovemAno: indep?.irsJovemAno ?? input.irsJovemAno,
    irsJovemTetoConsumido: jovemConsumidoA,
    outrosRendimentos: outros,
    conjunta,
    dependentesDetalhe: input.dependentesDetalhe,
    dependentesLista: input.dependentesLista,
    deducoes: input.deducoes ? { ...input.deducoes, lares: input.lares } : { lares: input.lares },
    ascendentes: input.ascendentes,
    ppr: input.ppr,
    donativos: input.donativos,
    pensaoAlimentos: input.pensaoAlimentos,
    deficiencia: input.deficiencia,
    ifici: input.ifici,
    isencaoSSPrimeiroAno: input.isencaoSSPrimeiroAno,
    acumulaEmprego: input.acumulaEmprego,
    retencoesPagas: 0,
    rendimentoIsentoComProgressividade: rendEstrangeiroIsentoProgressividade,
    // Na pré-passagem ainda não há factos do artigo 70.º (dependem do
    // tributável da categoria B que ela própria produz): fica desligado, e a
    // passagem final é que aplica o abatimento.
    minimoExistenciaFactsTitulares: factsTitulares,
    semMinimoExistencia: !factsTitulares,
  });

  const saldoMob = sanitize(inv?.saldo ?? 0);
  const criptoCurto = sanitize(cripto?.ganhoCurtoPrazo ?? 0);
  const criptoLongo = sanitize(cripto?.ganhoLongoPrazo ?? 0);

  // Coletável provisório sem as mais-valias mobiliárias/cripto ainda por decidir.
  const sim0 = simularIRSAnual(baseSimInput(englobaveisBase));
  const obrigatorioMob = !!inv?.algumCurtoPrazo && saldoMob > 0 && sim0.rendimentoColetavel >= limiteUltimoEscalao();
  const englobarMob = !!inv?.englobar || obrigatorioMob;
  const englobarCripto = !!cripto?.englobar;

  // ── Mais-valias mobiliárias (Anexo G) ─────────────────────────────────────
  let impostoAutonomoMob = 0;
  if (saldoMob > 0) {
    if (englobarMob) {
      englobaveisBase += saldoMob;
      memoria.push({
        anexo: "Anexo G",
        rotulo: obrigatorioMob ? "Mais-valias mobiliárias (englobamento obrigatório)" : "Mais-valias mobiliárias englobadas",
        formula: `saldo ${fmt(saldoMob)} às taxas progressivas`,
        valor: saldoMob,
        baseLegal: obrigatorioMob ? "Art. 72.º n.º 18 CIRS" : "Art. 72.º n.º 13 CIRS (opção)",
      });
      componentes.push({ id: "investimentos", anexo: "Anexo G", rotulo: "Mais-valias mobiliárias", bruto: saldoMob, englobado: saldoMob, impostoAutonomo: 0 });
      if (obrigatorioMob) avisos.push("Englobamento obrigatório das mais-valias mobiliárias: ativos detidos < 365 dias e rendimento coletável no último escalão (Art. 72.º n.º 18 CIRS).");
    } else {
      impostoAutonomoMob = saldoMob * MAIS_VALIAS_MOBILIARIAS_TAXA.value;
      memoria.push({ anexo: "Anexo G", rotulo: "Mais-valias mobiliárias — taxa especial", formula: `${fmt(saldoMob)} × ${pct(MAIS_VALIAS_MOBILIARIAS_TAXA.value)}`, valor: impostoAutonomoMob, baseLegal: "Art. 72.º n.º 1 CIRS" });
      componentes.push({ id: "investimentos", anexo: "Anexo G", rotulo: "Mais-valias mobiliárias", bruto: saldoMob, englobado: 0, impostoAutonomo: impostoAutonomoMob });
    }
  }

  // ── Criptoativos (Anexo G) ────────────────────────────────────────────────
  let impostoAutonomoCripto = 0;
  if (criptoLongo > 0) {
    memoria.push({ anexo: "Anexo G", rotulo: "Criptoativos detidos ≥ 365 dias (isentos)", valor: 0, baseLegal: "Art. 10.º n.º 19 CIRS" });
  }
  if (criptoCurto > 0) {
    if (englobarCripto) {
      englobaveisBase += criptoCurto;
      memoria.push({ anexo: "Anexo G", rotulo: "Criptoativos < 365 dias englobados", valor: criptoCurto, baseLegal: "Art. 72.º CIRS (opção)" });
      componentes.push({ id: "cripto", anexo: "Anexo G", rotulo: "Criptoativos", bruto: criptoCurto + criptoLongo, englobado: criptoCurto, impostoAutonomo: 0 });
    } else {
      impostoAutonomoCripto = criptoCurto * CRIPTO_TAXA_CURTO_PRAZO.value;
      memoria.push({ anexo: "Anexo G", rotulo: "Criptoativos < 365 dias — taxa especial", formula: `${fmt(criptoCurto)} × ${pct(CRIPTO_TAXA_CURTO_PRAZO.value)}`, valor: impostoAutonomoCripto, baseLegal: "Art. 10.º n.º 1 al. k) + Art. 72.º CIRS" });
      componentes.push({ id: "cripto", anexo: "Anexo G", rotulo: "Criptoativos", bruto: criptoCurto + criptoLongo, englobado: 0, impostoAutonomo: impostoAutonomoCripto });
    }
  } else if (criptoLongo > 0) {
    componentes.push({ id: "cripto", anexo: "Anexo G", rotulo: "Criptoativos", bruto: criptoLongo, englobado: 0, impostoAutonomo: 0 });
  }

  // ── Factos do artigo 70.º, por titular ────────────────────────────────────
  // O abatimento do mínimo de existência só se calcula com sete factos por
  // pessoa. `simularIRSAnual` sabe inferi-los no caso puro de categoria B sem
  // mais nada; aqui, onde as categorias estão decompostas, montam-se de facto.
  // Sem isto, quem tinha salário ou pensão caía em `needs_input`, ficava com
  // abatimento zero e — pior — sem aviso nenhum: alguém ao salário mínimo via
  // «IRS a pagar 676,61 €» onde a lei manda zero.
  const brutoIndepA = sanitize(indep?.brutoAnual ?? 0);
  const brutoTitularA =
    salBruto + pensBruto + brutoIndepA + dividendos + juros +
    sanitize(pred?.rendaAnual ?? 0) + saldoMob + criptoCurto + criptoLongo +
    sanitize(venda?.ganho ?? 0) + rendEstrangeiroBruto;
  const especificasTitularA =
    catA.especifica + catH.especifica + Math.max(0, brutoIndepA - sim0.rendimentoTributavel);
  // Rendimentos não englobados do agregado (Art. 70.º n.º 4 al. b): os que
  // ficaram sujeitos a taxa liberatória ou especial em vez das taxas gerais.
  const naoEnglobados =
    (capEnglobar ? 0 : dividendos + juros) +
    (pred?.englobar ? 0 : sanitize(pred?.rendaAnual ?? 0)) +
    (englobarMob ? 0 : saldoMob) +
    (englobarCripto ? 0 : criptoCurto);
  const householdGross = brutoTitularA + brutoTitularB;
  const householdTaxpayers = conjunta && tb ? 2 : 1;

  // Art. 70.º n.º 2: a regra cobre trabalho dependente, pensões e as atividades
  // da tabela do Art. 151.º (exceto o código 15, «outros prestadores de
  // serviços»). O que conta é a categoria PREDOMINANTE do titular — não o tipo
  // de atividade isolado, como o motor assumia.
  const elegivelPredominante = (
    catARendimento: number,
    catHRendimento: number,
    catBRendimento: number,
    catBElegivel: boolean,
    outrosNaoElegiveis: number
  ): boolean => {
    const candidatos = [
      { valor: catARendimento, elegivel: true },
      { valor: catHRendimento, elegivel: true },
      { valor: catBRendimento, elegivel: catBElegivel },
      { valor: outrosNaoElegiveis, elegivel: false },
    ];
    const maior = candidatos.reduce((a, b) => (b.valor > a.valor ? b : a));
    return maior.valor > 0 && maior.elegivel;
  };

  const outrosTitularA = brutoTitularA - salBruto - pensBruto - brutoIndepA;
  const factsTitularA: Partial<MinimoExistenciaFacts> = {
    eligibleIncome: elegivelPredominante(
      salBruto,
      pensBruto,
      brutoIndepA,
      (indep?.tipo ?? "art151") === "art151",
      outrosTitularA
    ),
    dependentTaxpayer: false,
    grossIncome: brutoTitularA,
    specificDeductions: Math.min(brutoTitularA, especificasTitularA),
    householdGrossIncome: householdGross,
    householdNonEnglobedIncome: naoEnglobados,
    householdTaxpayers,
  };
  const factsTitulares: Array<Partial<MinimoExistenciaFacts>> = [factsTitularA];
  if (conjunta && tb) {
    factsTitulares.push({
      eligibleIncome: elegivelPredominante(
        sanitize(tb.salarios?.bruto ?? 0),
        sanitize(tb.pensoes?.bruto ?? 0),
        sanitize(tb.independente?.brutoAnual ?? 0),
        catBElegivelB,
        0
      ),
      dependentTaxpayer: false,
      grossIncome: brutoTitularB,
      specificDeductions: Math.min(brutoTitularB, especificasTitularB),
      householdGrossIncome: householdGross,
      householdNonEnglobedIncome: naoEnglobados,
      householdTaxpayers,
    });
  }

  // ── Simulação final do englobamento (núcleo verificado) ────────────────────
  const sim = simularIRSAnual(baseSimInput(englobaveisBase, factsTitulares));

  // Nunca falhar em silêncio: se o artigo 70.º ficou por apurar, o utilizador
  // tem de o saber — é uma regra que pode valer o imposto todo.
  if (sim.minimoExistenciaDecision.status === "needs_input") {
    avisos.push(
      "Não foi possível apurar o mínimo de existência (Art. 70.º CIRS) com os dados introduzidos: " +
        `${sim.minimoExistenciaDecision.reason} O imposto mostrado pode estar sobreavaliado.`
    );
  }

  // Categoria B na memória (quando há atividade independente)
  if (sanitize(indep?.brutoAnual ?? 0) > 0) {
    memoria.push({
      anexo: "Anexo B",
      rotulo: sim.regimeContabilidade === "organizada" ? "Rendimento tributável (contab. organizada)" : "Rendimento tributável (regime simplificado)",
      formula: sim.regimeContabilidade === "organizada"
        ? `${fmt(sim.brutoAnual)} − despesas ${fmt(sim.despesasJustificadas)}`
        : `${fmt(sim.brutoAnual)} × coef. ${pct(sim.coeficiente)}${sim.acrescimo15 > 0 ? ` + acréscimo 15% ${fmt(sim.acrescimo15)}` : ""}`,
      valor: sim.rendimentoTributavel,
      baseLegal: "Art. 31.º CIRS",
    });
    componentes.push({ id: "independente", anexo: "Anexo B", rotulo: "Trabalho independente", bruto: sim.brutoAnual, englobado: sim.rendimentoTributavel, impostoAutonomo: 0 });
  }

  const coletaEnglobamento = sim.coletaBruta;
  const impostoAutonomo = impostoAutonomoCapitais + impostoAutonomoF + impostoAutonomoMob + impostoAutonomoCripto;

  // ── Crédito por dupla tributação internacional (Art. 81.º CIRS) ────────────
  // Para cada país: menor de (imposto pago nesse país; fração da coleta
  // proporcional ao rendimento desse país). O limite é por país, por isso o
  // cálculo país a país é mais rigoroso do que o agregado.
  //
  // O numerador é o rendimento do país LÍQUIDO das deduções específicas —
  // Art. 81.º n.º 1 al. b) — para bater com o denominador, que é o rendimento
  // coletável (também líquido). Usar o bruto contra o líquido inflacionava a
  // fração e tornava o limite do crédito mais generoso do que a lei permite.
  // Os rendimentos isentos com progressividade não entram: não geraram coleta
  // portuguesa, logo não há dupla tributação a eliminar.
  let creditoDuplaTributacao = 0;
  if (sim.rendimentoColetavel > 0 && coletaEnglobamento > 0) {
    for (const p of creditoPorEntrada) {
      if (p.impostoPago <= 0) continue;
      const fracaoColeta = coletaEnglobamento * (p.liquido / sim.rendimentoColetavel);
      const credito = Math.min(p.impostoPago, fracaoColeta);
      if (credito > 0) {
        creditoDuplaTributacao += credito;
        memoria.push({
          anexo: "Anexo J",
          rotulo: `Crédito dupla tributação${p.pais ? ` — ${p.pais}` : ""}`,
          formula: `mín(imposto pago ${fmt(p.impostoPago)}; fração da coleta ${fmt(fracaoColeta)})`,
          valor: -credito,
          baseLegal: "Art. 81.º CIRS",
        });
      }
    }
  }

  // Deduções à coleta já aplicadas dentro de `simularIRSAnual` (sim.irsEstimado).
  // O total vem do motor: as parcelas somadas à mão duplicavam a pensão de
  // alimentos, que passou a estar agregada dentro de `deducaoDespesas`.
  const deducoesColeta = sim.deducoesColetaTotal;
  if (sim.deducaoAscendentes > 0) {
    memoria.push({ anexo: "Anexo H", rotulo: "Dedução por ascendentes", valor: -sim.deducaoAscendentes, baseLegal: "Art. 78.º-A CIRS" });
  }
  if (sim.deducaoPensaoAlimentos > 0) {
    memoria.push({ anexo: "Anexo H", rotulo: "Dedução de pensões de alimentos", formula: `20% do valor pago`, valor: -sim.deducaoPensaoAlimentos, baseLegal: "Art. 83.º-A CIRS" });
  }
  if (sim.deducaoPPR > 0) {
    memoria.push({ anexo: "Anexo H", rotulo: "Benefício PPR", formula: `20% do aplicado (limite por idade)`, valor: -sim.deducaoPPR, baseLegal: "Art. 21.º EBF" });
  }
  if (sim.deducaoDonativos > 0) {
    memoria.push({ anexo: "Anexo H", rotulo: "Benefício donativos", formula: `25% do donativo (máx 15% da coleta)`, valor: -sim.deducaoDonativos, baseLegal: "Art. 63.º EBF" });
  }

  // IRS total = imposto do englobamento (após deduções/mínimo) + autónomo − crédito.
  const irsTotal = Math.max(0, sim.irsEstimado + impostoAutonomo - creditoDuplaTributacao);

  // ── Retenções e pagamentos por conta ──────────────────────────────────────
  const retencoesTotais =
    sanitize(input.salarios?.retencoes ?? 0) +
    sanitize(input.pensoes?.retencoes ?? 0) +
    sanitize(indep?.retencoesPagas ?? 0) +
    sanitize(cap?.retencoes ?? 0) +
    sanitize(pred?.retencoes ?? 0) +
    retencoesB;
  const pagamentosPorConta = sanitize(input.pagamentosPorConta ?? 0);

  // ── Rendimento global (todas as categorias, brutas/líquidas declaradas) ────
  const rendimentoGlobal =
    salBruto + pensBruto + sanitize(indep?.brutoAnual ?? 0) + dividendos + juros +
    sanitize(pred?.rendaAnual ?? 0) + saldoMob + criptoCurto + criptoLongo +
    sanitize(venda?.ganho ?? 0) + rendEstrangeiroBruto + rendimentoGlobalB;

  const saldo = retencoesTotais + pagamentosPorConta - irsTotal;

  memoria.push({ rotulo: "Coleta do englobamento", formula: `IRS sobre ${fmt(sim.rendimentoColetavel)} (escalões${conjunta ? " · quociente conjugal" : ""})`, valor: coletaEnglobamento, baseLegal: "Art. 68.º + 69.º CIRS" });
  if (impostoAutonomo > 0) memoria.push({ rotulo: "Tributação autónoma", valor: impostoAutonomo, baseLegal: "Art. 72.º CIRS" });
  if (deducoesColeta > 0) memoria.push({ rotulo: "Deduções à coleta", valor: -deducoesColeta, baseLegal: "Art. 78.º CIRS" });
  memoria.push({ rotulo: "IRS total estimado", valor: irsTotal });
  memoria.push({ rotulo: retencoesTotais + pagamentosPorConta > 0 ? "Retenções e pagamentos por conta" : "Sem retenções", valor: -(retencoesTotais + pagamentosPorConta) });
  memoria.push({ rotulo: saldo >= 0 ? "Reembolso estimado" : "Imposto a pagar estimado", valor: Math.abs(saldo) });

  if (input.ifici && (salBruto > 0 || pensBruto > 0 || dividendos > 0 || juros > 0)) {
    avisos.push("Com IFICI ativo, esta estimativa aplica a taxa única ao rendimento englobado. O IFICI só abrange rendimentos elegíveis — confirma o enquadramento de cada categoria.");
  }

  return {
    rendimentoGlobal,
    rendimentoColetavel: sim.rendimentoColetavel,
    coletaEnglobamento,
    impostoAutonomo,
    deducoesColeta,
    creditoDuplaTributacao,
    irsTotal,
    ssAnual: sim.ssAnual + ssAnualB,
    retencoesTotais,
    pagamentosPorConta,
    saldo,
    taxaEfetiva: rendimentoGlobal > 0 ? irsTotal / rendimentoGlobal : 0,
    componentes,
    memoria,
    englobamento: sim,
    englobamentoMobObrigatorio: obrigatorioMob,
    avisos,
  };
}
