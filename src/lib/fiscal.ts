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
  REGIME_SIMPLIFICADO,
  IRS_JOVEM,
  ESCALOES_IRS,
  DEDUCAO_ESPECIFICA_CATB,
  REGIME_15PCT,
  MINIMO_EXISTENCIA,
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
  IAS_VALUE,
  CATEGORIA_F,
  // Tributação Autónoma
  TA_THRESHOLDS,
  TA_VIATURAS_COMBUSTAO,
  TA_VIATURAS_PHEV,
  TA_VIATURAS_ELETRICA,
  TA_REPRESENTACAO,
  TA_AJUDAS_CUSTO,
  TA_NAO_DOCUMENTADAS,
  TA_AGRAVAMENTO_PREJUIZO,
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
  DLRR_TAXA,
  DLRR_LIMITE_LUCROS,
  DLRR_LIMITE_COLETA,
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

export function calcular(input: CalcInput): CalcResult {
  const bruto = sanitize(input.bruto);
  const avisos: string[] = [];

  // ── Retenção na fonte (adiantamento de IRS) ──
  const isencaoJovem = isencaoIRSJovem(input.irsJovemAno);
  const retencaoBase = input.retencaoOverride ?? RETENCAO[input.tipo].value;
  const taxaRetencao = input.dispensaRetencao ? 0 : retencaoBase;
  // O IRS Jovem isenta parte do rendimento, logo a retenção incide apenas
  // sobre a parte tributável (estimativa — a tabela oficial da AT é progressiva).
  const baseRetencao = bruto * (1 - isencaoJovem);
  const retencaoIRS = baseRetencao * taxaRetencao;

  // ── IVA ──
  const taxaIVA = taxaIVAEfetiva(input.regiao, input.regimeIVA);
  const iva = bruto * taxaIVA;

  // ── Segurança Social (estimativa proporcional ao recibo) ──
  let segSocial = 0;
  if (!input.isencaoSSPrimeiroAno && !input.acumulaEmprego) {
    const baseSS = Math.min(bruto * SS_COEFICIENTE[input.baseSS].value, SS_BASE_MAX_MENSAL.value);
    segSocial = baseSS * SS_TAXA.value;
  }

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

/** Limite global das deduções à coleta para um dado rendimento coletável. */
export function limiteGlobalDeducoes(coletavel: number): number {
  const g = LIMITE_GLOBAL_DEDUCOES.value;
  if (coletavel <= g.semLimiteAte) return Infinity;
  if (coletavel >= g.escalaoSuperior) return g.limiteBaixo;
  return (
    g.limiteBaixo +
    (g.limiteAlto - g.limiteBaixo) * ((g.escalaoSuperior - coletavel) / (g.escalaoSuperior - g.semLimiteAte))
  );
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

export interface DeducoesInput {
  /** Valor gasto em saúde no ano. */
  saude?: number;
  /** Valor gasto em educação no ano. */
  educacao?: number;
  /** Despesas gerais familiares (faturas com NIF). */
  gerais?: number;
  /** Rendas de habitação permanente pagas (Art. 78.º-E CIRS): 15% até €900 (Lei 36/2024). */
  rendas?: number;
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
  /** Donativos do ano (Art. 63.º EBF). */
  donativos?: number;
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
  /** Coleta antes das deduções à coleta. */
  coletaBruta: number;
  /** Detalhamento por escalão progressivo (vazio se IFICI aplicado). */
  escaloesAplicados: EscalaoAplicado[];
  deducaoDependentes: number;
  /** Dedução à coleta por ascendentes (Art. 78.º-A). Fora do limite global. */
  deducaoAscendentes: number;
  /** Deduções de despesas (saúde+educação+gerais+rendas+PPR+donativos) após limite global. */
  deducaoDespesas: number;
  /** Dedução à coleta por PPR (Art. 21.º EBF), antes do limite global. */
  deducaoPPR: number;
  /** Dedução à coleta por donativos (Art. 63.º EBF), antes do limite global. */
  deducaoDonativos: number;
  /** Dedução coleta por deficiência do contribuinte (Art. 87.º: 4×IAS). */
  deducaoDeficiencia: number;
  irsEstimado: number;
  minimoExistenciaAplicado: boolean;
  taxaMediaEfetiva: number;
  retencoesPagas: number;
  /** Estimativa de SS anual (21,4% sobre base de SS). 0 se isento. */
  ssAnual: number;
  acumulaEmprego: boolean;
  /** Maior que 0: reembolso estimado. Menor que 0: imposto a pagar. */
  saldo: number;
}

/**
 * Estimativa do IRS anual no regime simplificado, com módulos opcionais.
 *
 * Modela: coeficiente por atividade (Art. 31.º) com redução do 1.º/2.º ano,
 * regra dos 15% (só coef. 0,75 e 0,35), IRS Jovem, englobamento de outros
 * rendimentos, tributação conjunta (quociente), deduções à coleta (dependentes,
 * saúde, educação, despesas gerais) com limite global, escalões e mínimo de
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
    rendimentoCoeficiente = Math.max(0, brutoAnual - despesasJustificadas);
    rendimentoTributavel = rendimentoCoeficiente;
  } else {
    // Regime simplificado: coeficiente por atividade + redução do 1.º/2.º ano.
    coeficienteBase = input.coefOverride ?? COEFICIENTE_POR_TIPO[tipo];
    reducaoAno = REDUCAO_COEFICIENTE_ANO.value[input.anoAtividade ?? 3] ?? 0;
    coeficiente = coeficienteBase * (1 - reducaoAno);
    rendimentoCoeficiente = brutoAnual * coeficiente;

    // Regra dos 15% — só para coeficientes 0,75 (art151) e 0,35 (outros serviços).
    const aplicaRegra15 = input.aplicaRegra15Override ?? (tipo === "art151" || tipo === "outros");
    // Art. 31.º n.º 13 al. a) CIRS: do somatório que abate aos 15% do rendimento
    // bruto, a componente automática é a dedução específica (4 104 €/8,54×IAS)
    // OU as contribuições obrigatórias TOTAIS para a Segurança Social, a maior.
    // (Não é a parte que excede 10% — isso é a dedução autónoma do n.º 2.)
    const ssContribuicoes = brutoAnual * SS_COEFICIENTE.servicos.value * SS_TAXA.value;
    despesasAutomaticas = Math.max(DEDUCAO_ESPECIFICA_CATB.value, ssContribuicoes);
    acrescimo15 = aplicaRegra15
      ? Math.max(0, REGIME_15PCT.value * brutoAnual - (despesasAutomaticas + despesasJustificadas))
      : 0;
    rendimentoTributavel = rendimentoCoeficiente + acrescimo15;
  }

  // IRS Jovem (sobre o rendimento da categoria B), até 55 × IAS.
  const isencaoJovem = isencaoIRSJovem(input.irsJovemAno);
  const tetoIsencao = IRS_JOVEM.tetoIAS.value * IAS_VALUE;
  const rendimentoIsentoJovem = Math.min(rendimentoTributavel * isencaoJovem, tetoIsencao);

  // ── Art. 56.º-A CIRS: exclusão de 15% dos rendimentos Cat. B do coletável ──
  // Aplicada ANTES do cálculo da coleta (reduz rendimento tributável).
  const exclusaoDeficiencia = input.deficiencia
    ? Math.min(rendimentoTributavel * EXCLUSAO_DEFICIENCIA_TAXA.value, EXCLUSAO_DEFICIENCIA_MAX.value)
    : 0;

  // Rendimento coletável base (após IRS Jovem, exclusão deficiência, outros)
  const conjunta = !!input.conjunta;
  const ificiAplicado = !!input.ifici;
  const rnhAntigoAplicado = !!input.rnhAntigo && !ificiAplicado;
  const programaRegressarAplicado = !!input.programaRegressar && !ificiAplicado && !rnhAntigoAplicado;
  // Regime de taxa flat: IFICI (20%) ou RNH antigo (20%) — sem escalões
  const regimeFlatRate = ificiAplicado || rnhAntigoAplicado;
  const outrosRendimentos = sanitize(input.outrosRendimentos ?? 0);
  const rendimentoColetavel = Math.max(
    0,
    rendimentoTributavel - exclusaoDeficiencia - rendimentoIsentoJovem
  ) + outrosRendimentos;

  // Programa Regressar (Art. 12.º-A CIRS): 50% do rendimento coletável base excluído
  const exclusaoProgramaRegressar = programaRegressarAplicado ? rendimentoColetavel * 0.5 : 0;
  // Rendimento efetivamente sujeito a IRS (após todas as exclusões)
  const rendimentoColetavelFinal = Math.max(0, rendimentoColetavel - exclusaoProgramaRegressar);

  // ── Coleta: flat 20% (IFICI / RNH antigo) ou escalões progressivos ────────
  const divisor = conjunta ? QUOCIENTE_CONJUGAL.value : 1;
  let coletaBruta: number;
  let escaloesAplicados: EscalaoAplicado[];
  if (regimeFlatRate) {
    coletaBruta = rendimentoColetavelFinal * IFICI_TAXA.value;
    escaloesAplicados = [];
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

  // PPR (Art. 21.º EBF): 20% do aplicado, com limite por idade do sujeito passivo.
  const deducaoPPR = input.ppr
    ? Math.min(sanitize(input.ppr.valor) * DEDUCAO_PPR.value.taxa, DEDUCAO_PPR.value[input.ppr.escalaoIdade])
    : 0;
  // Donativos (Art. 63.º EBF): 25% do donativo, limitado a 15% da coleta.
  const deducaoDonativos = input.donativos
    ? Math.min(sanitize(input.donativos) * DEDUCAO_DONATIVOS.value.taxa, DEDUCAO_DONATIVOS.value.limiteColeta * coletaBruta)
    : 0;

  // Limite global (Art. 78.º n.º 7): saúde + educação + gerais + rendas + PPR + donativos.
  const deducaoDespesas = Math.min(
    dGerais + dSaude + dEducacao + dRendas + deducaoPPR + deducaoDonativos,
    limiteGlobalDeducoes(rendimentoColetavelFinal)
  );

  // Ascendentes (Art. 78.º-A): 525 € por ascendente; 635 € se existir só um.
  // Fora do limite global, tal como a dedução por dependentes.
  const numAscendentes = Math.max(0, Math.floor(input.ascendentes ?? 0));
  const deducaoAscendentes =
    numAscendentes === 1 ? DEDUCAO_ASCENDENTE_UNICO.value : numAscendentes * DEDUCAO_ASCENDENTE.value;

  // Art. 87.º CIRS: dedução à coleta de 4×IAS pelo contribuinte com deficiência
  const deducaoDeficiencia = input.deficiencia ? DEDUCAO_DEFICIENCIA_COLETA.value : 0;

  const deducoesColeta = deducaoDependentes + deducaoAscendentes + deducaoDespesas + deducaoDeficiencia;
  let irsEstimado = Math.max(0, coletaBruta - deducoesColeta);

  // ── Mínimo de existência (não aplicável com regime de taxa flat) ─────────
  const minimo = MINIMO_EXISTENCIA.value;
  let minimoExistenciaAplicado = false;
  if (!regimeFlatRate) {
    if (rendimentoColetavelFinal > 0 && rendimentoColetavelFinal <= minimo) {
      irsEstimado = 0;
      minimoExistenciaAplicado = true;
    } else if (rendimentoColetavelFinal > minimo && rendimentoColetavelFinal - irsEstimado < minimo) {
      irsEstimado = Math.max(0, rendimentoColetavelFinal - minimo);
      minimoExistenciaAplicado = true;
    }
  }

  // ── SS anual estimado (para display; não afecta o IRS) ───────────────────
  const acumulaEmprego = !!input.acumulaEmprego;
  const isencaoSSEntrada = acumulaEmprego || !!input.isencaoSSPrimeiroAno;
  const ssAnual = (() => {
    if (isencaoSSEntrada) return 0;
    const baseSS = SS_COEFICIENTE[BASE_SS_POR_TIPO[tipo]].value;
    const rendMensalMedio = (brutoAnual * baseSS) / 12;
    const mensal = Math.min(
      Math.max(SS_MIN_MENSAL.value, rendMensalMedio * SS_TAXA.value),
      SS_BASE_MAX_MENSAL.value * SS_TAXA.value
    );
    return mensal * 12;
  })();

  const taxaMediaEfetiva = brutoAnual > 0 ? irsEstimado / brutoAnual : 0;
  const retencoesPagas = sanitize(input.retencoesPagas ?? 0);

  return {
    brutoAnual,
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
    escaloesAplicados,
    deducaoDependentes,
    deducaoAscendentes,
    deducaoDespesas,
    deducaoPPR,
    deducaoDonativos,
    deducaoDeficiencia,
    irsEstimado,
    minimoExistenciaAplicado,
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
  const ss = bruto * SS_COEFICIENTE.servicos.value * SS_TAXA.value;
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
//  TRIBUTAÇÃO AUTÓNOMA — IRC (Art. 88.º CIRC)
//
//  Aplica-se sobre encargos específicos de empresas (encargos anuais de
//  viaturas, representação, ajudas de custo, despesas não documentadas),
//  independentemente do IRC regular. O custo de aquisição da viatura
//  determina o escalão; a base tributável são os encargos anuais.
// ─────────────────────────────────────────────────────────────────────

export type TipoViatura = "combustao" | "phev" | "eletrica";

export interface TAViaturaInput {
  tipo: TipoViatura;
  /** Custo de aquisição (determina o escalão/taxa). */
  custoAquisicao: number;
  /** Encargos anuais suportados (base tributável da TA). */
  encargosAnuais: number;
}

export interface TributacaoAutonomaInput {
  /** Lista de viaturas ligeiras de passageiros da empresa. */
  viaturas?: TAViaturaInput[];
  /** Despesas de representação do período (Art. 88.º, n.º 7). */
  despesasRepresentacao?: number;
  /** Ajudas de custo + km em viatura própria (Art. 88.º, n.º 9). */
  ajudasCusto?: number;
  /** Despesas não documentadas (Art. 88.º, n.º 1). */
  despesasNaoDocumentadas?: number;
  /**
   * true se a empresa tem prejuízo fiscal no período — agrava a TA em +10 p.p.
   * Exceção: ignorar o agravamento se primeirosTresAnos=true ou lucroRecente=true.
   */
  comPrejuizo?: boolean;
  /** true nos primeiros 3 anos de atividade — isenta do agravamento de prejuízo. */
  primeirosTresAnos?: boolean;
  /** true se teve lucro em ≥ 1 dos 3 exercícios anteriores — isenta do agravamento. */
  lucroRecente?: boolean;
}

export interface TributacaoAutonomaResult {
  taViaturas: number;
  taRepresentacao: number;
  taAjudas: number;
  taNaoDocumentadas: number;
  subtotal: number;
  agravamentoAplicado: boolean;
  agravamento: number;
  totalTA: number;
  detalheViaturas: Array<{ tipo: TipoViatura; taxa: number; encargos: number; ta: number }>;
}

/** Devolve a taxa de TA para uma viatura dado o tipo e custo de aquisição. */
function taxaTA(tipo: TipoViatura, custoAquisicao: number): number {
  if (tipo === "eletrica") return TA_VIATURAS_ELETRICA.value;
  const tabela: TAViaturasTaxas = tipo === "phev" ? TA_VIATURAS_PHEV.value : TA_VIATURAS_COMBUSTAO.value;
  const { t1, t2 } = TA_THRESHOLDS.value;
  if (custoAquisicao <= t1) return tabela.ate37500;
  if (custoAquisicao <= t2) return tabela.ate45000;
  return tabela.acima45000;
}

/**
 * Calcula a Tributação Autónoma (Art. 88.º CIRC) de uma empresa.
 * Inclui viaturas (combustão, PHEV e elétrica), representação, ajudas de
 * custo e despesas não documentadas. Modela o agravamento por prejuízo fiscal.
 *
 * ESTIMATIVA — não cobre todas as situações (ex.: viaturas de mercadorias,
 * taxas especiais de setores regulados). Não substitui apuramento oficial.
 */
export function calcularTributacaoAutonoma(
  input: TributacaoAutonomaInput
): TributacaoAutonomaResult {
  const agravamentoIsento = !!input.primeirosTresAnos || !!input.lucroRecente;
  const agravamento = input.comPrejuizo && !agravamentoIsento ? TA_AGRAVAMENTO_PREJUIZO.value : 0;

  // Viaturas
  const detalheViaturas: TributacaoAutonomaResult["detalheViaturas"] = [];
  let taViaturas = 0;
  for (const v of input.viaturas ?? []) {
    const encargos = sanitize(v.encargosAnuais);
    const taxa = taxaTA(v.tipo, sanitize(v.custoAquisicao));
    const ta = encargos * (taxa + agravamento);
    taViaturas += ta;
    detalheViaturas.push({ tipo: v.tipo, taxa, encargos, ta });
  }

  const taRepresentacao =
    sanitize(input.despesasRepresentacao ?? 0) * (TA_REPRESENTACAO.value + agravamento);
  const taAjudas = sanitize(input.ajudasCusto ?? 0) * (TA_AJUDAS_CUSTO.value + agravamento);
  const taNaoDocumentadas =
    sanitize(input.despesasNaoDocumentadas ?? 0) * TA_NAO_DOCUMENTADAS.value;

  const subtotal = taViaturas + taRepresentacao + taAjudas + taNaoDocumentadas;
  const agravamentoTotal = agravamento > 0
    ? (input.viaturas ?? []).reduce((s, v) => s + sanitize(v.encargosAnuais), 0) * agravamento
      + sanitize(input.despesasRepresentacao ?? 0) * agravamento
      + sanitize(input.ajudasCusto ?? 0) * agravamento
    : 0;

  return {
    taViaturas,
    taRepresentacao,
    taAjudas,
    taNaoDocumentadas,
    subtotal,
    agravamentoAplicado: agravamento > 0,
    agravamento: agravamentoTotal,
    totalTA: subtotal,
    detalheViaturas,
  };
}

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
//  DLRR — Dedução por Lucros Retidos e Reinvestidos (Art. 27.º–34.º CFI)
//  Apenas PME e Small Mid Cap (≤ 3 000 trabalhadores).
// ─────────────────────────────────────────────────────────────────────

export interface DLRRInput {
  /** Lucros retidos e reinvestidos em ativos elegíveis no período. */
  lucrosRetidos: number;
  /** Coleta de IRC do período. */
  coletaIRC: number;
  /** Saldo de DLRR reportado de anos anteriores ainda não deduzido. */
  reporteAnterior?: number;
}

export interface DLRRResult {
  deducaoCalculada: number;
  limiteColeta: number;
  deducaoAplicavel: number;
  reporteParaProximo: number;
}

/**
 * Estima a dedução DLRR à coleta de IRC para PME.
 * Não verifica elegibilidade PME/Small Mid Cap — tarefa do contabilista.
 */
export function estimarDLRR(input: DLRRInput): DLRRResult {
  const lucros = Math.min(sanitize(input.lucrosRetidos), DLRR_LIMITE_LUCROS.value);
  const reporte = sanitize(input.reporteAnterior ?? 0);
  const deducaoCalculada = lucros * DLRR_TAXA.value;
  const totalDisponivel = deducaoCalculada + reporte;
  const limColeta = input.coletaIRC * DLRR_LIMITE_COLETA.value;
  const deducaoAplicavel = Math.min(totalDisponivel, limColeta);
  return {
    deducaoCalculada,
    limiteColeta: limColeta,
    deducaoAplicavel,
    reporteParaProximo: Math.max(0, totalDisponivel - deducaoAplicavel),
  };
}

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

export interface DeclaracaoInput {
  conjunta?: boolean;
  /** Categoria A — trabalho dependente (Anexo A). */
  salarios?: { bruto: number; retencoes?: number };
  /** Categoria H/A — pensões (Anexo A). */
  pensoes?: { bruto: number; retencoes?: number };
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
  imoveisVenda?: { ganho: number; valorRealizacao?: number; valorReinvestido?: number; reinvesteHPP?: boolean };
  /** Rendimentos obtidos no estrangeiro (Anexo J). */
  estrangeiros?: { rendimento: number; impostoPago?: number };
  /** Deduções à coleta (Anexo H). */
  deducoes?: DeducoesInput;
  dependentesDetalhe?: DependentesDetalhe;
  /** Ascendentes em comunhão de habitação (Art. 78.º-A). */
  ascendentes?: number;
  /** PPR aplicado no ano + escalão de idade (Art. 21.º EBF). */
  ppr?: { valor: number; escalaoIdade: "ate35" | "de35a50" | "mais50" };
  /** Donativos do ano (Art. 63.º EBF). */
  donativos?: number;
  deficiencia?: boolean;
  ifici?: boolean;
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

/** Dedução específica anual da categoria A (Art. 25.º CIRS): 8,54 × IAS. */
function rendimentoLiquidoCatA(bruto: number): { liquido: number; especifica: number } {
  const especifica = DEDUCAO_ESPECIFICA_DEPENDENTE.value;
  return { liquido: Math.max(0, sanitize(bruto) - especifica), especifica };
}

/** Limite do último escalão de IRS (gatilho do englobamento obrigatório). */
function limiteUltimoEscalao(): number {
  const e = ESCALOES_IRS.value;
  return e.length >= 2 ? (e[e.length - 2].ate ?? Infinity) : Infinity;
}

/**
 * Apuramento global de IRS a partir das categorias selecionadas no simulador
 * guiado. Reaproveita `simularIRSAnual` para o englobamento e acrescenta a
 * tributação autónoma e o crédito por dupla tributação internacional.
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

  // Categoria A — salários
  const salBruto = sanitize(input.salarios?.bruto ?? 0);
  if (salBruto > 0) {
    const { liquido, especifica } = rendimentoLiquidoCatA(salBruto);
    englobaveisBase += liquido;
    memoria.push({
      anexo: "Anexo A",
      rotulo: "Rendimento líquido de trabalho dependente",
      formula: `${fmt(salBruto)} − dedução específica ${fmt(especifica)}`,
      valor: liquido,
      baseLegal: "Art. 25.º CIRS",
    });
    componentes.push({ id: "salarios", anexo: "Anexo A", rotulo: "Trabalho dependente", bruto: salBruto, englobado: liquido, impostoAutonomo: 0 });
  }

  // Categoria A — pensões (dedução específica equiparada)
  const pensBruto = sanitize(input.pensoes?.bruto ?? 0);
  if (pensBruto > 0) {
    const { liquido, especifica } = rendimentoLiquidoCatA(pensBruto);
    englobaveisBase += liquido;
    memoria.push({
      anexo: "Anexo A",
      rotulo: "Rendimento líquido de pensões",
      formula: `${fmt(pensBruto)} − dedução específica ${fmt(especifica)}`,
      valor: liquido,
      baseLegal: "Art. 53.º CIRS",
    });
    componentes.push({ id: "pensoes", anexo: "Anexo A", rotulo: "Pensões", bruto: pensBruto, englobado: liquido, impostoAutonomo: 0 });
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
    if (venda.reinvesteHPP && sanitize(venda.valorRealizacao ?? 0) > 0) {
      fracaoExcluida = Math.min(1, sanitize(venda.valorReinvestido ?? 0) / sanitize(venda.valorRealizacao ?? 0));
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
  }

  // Rendimentos estrangeiros (Anexo J) — englobados, com crédito de imposto.
  let rendEstrangeiroEnglobado = 0;
  const impostoPagoEstrangeiro = sanitize(ext?.impostoPago ?? 0);
  if (ext && sanitize(ext.rendimento) > 0) {
    rendEstrangeiroEnglobado = sanitize(ext.rendimento);
    englobaveisBase += rendEstrangeiroEnglobado;
    memoria.push({ anexo: "Anexo J", rotulo: "Rendimentos obtidos no estrangeiro", valor: rendEstrangeiroEnglobado, baseLegal: "Art. 15.º + Art. 81.º CIRS" });
    componentes.push({ id: "estrangeiros", anexo: "Anexo J", rotulo: "Rendimentos estrangeiros", bruto: rendEstrangeiroEnglobado, englobado: rendEstrangeiroEnglobado, impostoAutonomo: 0 });
  }

  // ── Pré-passagem: decidir englobamento obrigatório das mais-valias mobiliárias ──
  const baseSimInput = (outros: number): SimulacaoInput => ({
    brutoAnual: sanitize(indep?.brutoAnual ?? 0),
    tipo: indep?.tipo ?? "art151",
    coefOverride: indep?.coefOverride,
    aplicaRegra15Override: indep?.aplicaRegra15Override,
    anoAtividade: indep?.anoAtividade,
    regimeContabilidade: indep?.regimeContabilidade,
    despesasJustificadas: indep?.despesasJustificadas,
    irsJovemAno: indep?.irsJovemAno,
    outrosRendimentos: outros,
    conjunta,
    dependentesDetalhe: input.dependentesDetalhe,
    deducoes: input.deducoes,
    ascendentes: input.ascendentes,
    ppr: input.ppr,
    donativos: input.donativos,
    deficiencia: input.deficiencia,
    ifici: input.ifici,
    retencoesPagas: 0,
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

  // ── Simulação final do englobamento (núcleo verificado) ────────────────────
  const sim = simularIRSAnual(baseSimInput(englobaveisBase));

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
  // Menor de: imposto pago no estrangeiro vs. fração da coleta proporcional
  // ao rendimento estrangeiro englobado.
  let creditoDuplaTributacao = 0;
  if (impostoPagoEstrangeiro > 0 && rendEstrangeiroEnglobado > 0 && sim.rendimentoColetavel > 0) {
    const fracaoColeta = coletaEnglobamento * (rendEstrangeiroEnglobado / sim.rendimentoColetavel);
    creditoDuplaTributacao = Math.min(impostoPagoEstrangeiro, fracaoColeta);
    memoria.push({
      anexo: "Anexo J",
      rotulo: "Crédito por dupla tributação internacional",
      formula: `mín(imposto pago ${fmt(impostoPagoEstrangeiro)}; fração da coleta ${fmt(fracaoColeta)})`,
      valor: -creditoDuplaTributacao,
      baseLegal: "Art. 81.º CIRS",
    });
  }

  // Deduções à coleta já aplicadas dentro de `simularIRSAnual` (sim.irsEstimado).
  const deducoesColeta =
    sim.deducaoDependentes + sim.deducaoAscendentes + sim.deducaoDespesas + sim.deducaoDeficiencia;
  if (sim.deducaoAscendentes > 0) {
    memoria.push({ anexo: "Anexo H", rotulo: "Dedução por ascendentes", valor: -sim.deducaoAscendentes, baseLegal: "Art. 78.º-A CIRS" });
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
    sanitize(pred?.retencoes ?? 0);
  const pagamentosPorConta = sanitize(input.pagamentosPorConta ?? 0);

  // ── Rendimento global (todas as categorias, brutas/líquidas declaradas) ────
  const rendimentoGlobal =
    salBruto + pensBruto + sanitize(indep?.brutoAnual ?? 0) + dividendos + juros +
    sanitize(pred?.rendaAnual ?? 0) + saldoMob + criptoCurto + criptoLongo +
    sanitize(venda?.ganho ?? 0) + rendEstrangeiroEnglobado;

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
    ssAnual: sim.ssAnual,
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
