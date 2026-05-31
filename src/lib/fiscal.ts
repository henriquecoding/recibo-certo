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
  REDUCAO_COEFICIENTE_ANO,
  DEDUCAO_DEPENDENTE,
  DEDUCAO_DESP_GERAIS,
  DEDUCAO_SAUDE,
  DEDUCAO_EDUCACAO,
  QUOCIENTE_CONJUGAL,
  LIMITE_GLOBAL_DEDUCOES,
  IAS_VALUE,
  CATEGORIA_F,
  type TipoAtividade,
  type Regiao,
  type EscalaoIVA,
  type BaseSS,
  type DuracaoArrendamento,
} from "./fiscal-data";

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

export interface DeducoesInput {
  /** Valor gasto em saúde no ano. */
  saude?: number;
  /** Valor gasto em educação no ano. */
  educacao?: number;
  /** Despesas gerais familiares (faturas com NIF). */
  gerais?: number;
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
  /** Coleta antes das deduções à coleta. */
  coletaBruta: number;
  deducaoDependentes: number;
  /** Deduções de despesas (saúde+educação+gerais) após limite global. */
  deducaoDespesas: number;
  irsEstimado: number;
  minimoExistenciaAplicado: boolean;
  taxaMediaEfetiva: number;
  retencoesPagas: number;
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
    const ssAnual = brutoAnual * SS_COEFICIENTE.servicos.value * SS_TAXA.value;
    const ssExcedente = Math.max(0, ssAnual - 0.1 * brutoAnual);
    despesasAutomaticas = Math.max(DEDUCAO_ESPECIFICA_CATB.value, ssExcedente);
    acrescimo15 = aplicaRegra15
      ? Math.max(0, REGIME_15PCT.value * brutoAnual - (despesasAutomaticas + despesasJustificadas))
      : 0;
    rendimentoTributavel = rendimentoCoeficiente + acrescimo15;
  }

  // IRS Jovem (sobre o rendimento da categoria B), até 55 × IAS.
  const isencaoJovem = isencaoIRSJovem(input.irsJovemAno);
  const tetoIsencao = IRS_JOVEM.tetoIAS.value * IAS_VALUE;
  const rendimentoIsentoJovem = Math.min(rendimentoTributavel * isencaoJovem, tetoIsencao);

  // Englobamento de outros rendimentos (cat. A).
  const outrosRendimentos = sanitize(input.outrosRendimentos ?? 0);
  const rendimentoColetavel = Math.max(0, rendimentoTributavel - rendimentoIsentoJovem) + outrosRendimentos;

  // Coleta com tributação conjunta (quociente conjugal).
  const conjunta = !!input.conjunta;
  const divisor = conjunta ? QUOCIENTE_CONJUGAL.value : 1;
  const coletaBruta = irsProgressivo(rendimentoColetavel / divisor) * divisor;

  // Deduções à coleta.
  const dependentes = Math.max(0, Math.floor(input.dependentes ?? 0));
  const deducaoDependentes = dependentes * DEDUCAO_DEPENDENTE.value;
  const ded = input.deducoes ?? {};
  const dGerais = Math.min(
    sanitize(ded.gerais ?? 0) * DEDUCAO_DESP_GERAIS.value.taxa,
    DEDUCAO_DESP_GERAIS.value.limite * (conjunta ? 2 : 1)
  );
  const dSaude = Math.min(sanitize(ded.saude ?? 0) * DEDUCAO_SAUDE.value.taxa, DEDUCAO_SAUDE.value.limite);
  const dEducacao = Math.min(sanitize(ded.educacao ?? 0) * DEDUCAO_EDUCACAO.value.taxa, DEDUCAO_EDUCACAO.value.limite);
  const deducaoDespesas = Math.min(dGerais + dSaude + dEducacao, limiteGlobalDeducoes(rendimentoColetavel));

  const deducoesColeta = deducaoDependentes + deducaoDespesas;
  let irsEstimado = Math.max(0, coletaBruta - deducoesColeta);

  // Mínimo de existência.
  const minimo = MINIMO_EXISTENCIA.value;
  let minimoExistenciaAplicado = false;
  if (rendimentoColetavel > 0 && rendimentoColetavel <= minimo) {
    irsEstimado = 0;
    minimoExistenciaAplicado = true;
  } else if (rendimentoColetavel > minimo && rendimentoColetavel - irsEstimado < minimo) {
    irsEstimado = Math.max(0, rendimentoColetavel - minimo);
    minimoExistenciaAplicado = true;
  }

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
    rendimentoColetavel,
    conjunta,
    coletaBruta,
    deducaoDependentes,
    deducaoDespesas,
    irsEstimado,
    minimoExistenciaAplicado,
    taxaMediaEfetiva,
    retencoesPagas,
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
