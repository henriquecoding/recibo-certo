// ─────────────────────────────────────────────────────────────────────
//  Motor de cálculo — TRABALHO DEPENDENTE (Categoria A)
//  ---------------------------------------------------------------------
//  "Verifica se o teu salário está correto". Calcula o vencimento líquido
//  a partir do salário bruto: contribuição do trabalhador para a Segurança
//  Social (11%), retenção na fonte de IRS (tabelas oficiais 2026) e
//  subsídio de refeição (parte isenta vs. tributada).
//
//  Tal como o motor da Categoria B (fiscal.ts), NÃO contém números mágicos:
//  lê tudo de `fiscal-data.ts`. É estimativa — rotular como tal na UI.
//  Etapa 1: Tabela I (não casado / casado dois titulares, Continente).
// ─────────────────────────────────────────────────────────────────────

import {
  SS_DEPENDENTE,
  SUBSIDIO_REFEICAO,
  RETENCAO_DEP_POR_DEPENDENTE,
  RETENCAO_DEP_CONTINENTE_T1,
  DEDUCAO_ESPECIFICA_DEPENDENTE,
  DEDUCAO_DEPENDENTE,
  DEDUCAO_DEPENDENTE_3MAIS,
  MINIMO_EXISTENCIA,
  HORARIO_SEMANAL_COMPLETO,
  TRABALHO_SUPLEMENTAR,
  RETENCAO_SUPLEMENTAR_FATOR,
  AJUDAS_CUSTO,
  IRS_JOVEM_TETO_CALC,
  tabelaRetencaoDependente,
  type EscalaoRetencao,
  type EstadoCivilRet,
  type TipoAtividade,
  type Regiao,
} from "./fiscal-data";
import { compararRegimes, irsProgressivo, isencaoIRSJovem, type ComparacaoResult } from "./fiscal";

const cent = (n: number) => Math.round(n * 100) / 100;

// ─────────────────────────────────────────────────────────────────────
//  IRS Jovem (Art. 12.º-B CIRS) na retenção mensal da Categoria A
//  ---------------------------------------------------------------------
//  Número de retribuições anuais (12 meses + subsídio de férias + de Natal).
//  Base do duodécimo/décimo-quarto e do teto MENSAL de isenção do IRS Jovem.
const MESES_RETRIBUICAO = 14;

/**
 * Teto MENSAL de rendimento isento pelo IRS Jovem = (55 × IAS) ÷ 14. O teto
 * legal é anual; reparte-se pelas 14 retribuições para a estimativa mensal.
 */
export const IRS_JOVEM_TETO_MENSAL = cent(IRS_JOVEM_TETO_CALC / MESES_RETRIBUICAO);

export interface IsencaoJovemMensal {
  /** Percentagem de isenção do ano de benefício (0 se inativo). */
  pct: number;
  /** Valor isento de IRS aplicado a esta remuneração (€), limitado pelo teto. */
  isentoEur: number;
  /** Remuneração tributável (sobre a qual incide a tabela de retenção). */
  tributavel: number;
  /** True se o teto mensal limitou a isenção (parte volta a ser tributada). */
  excedeTeto: boolean;
}

/**
 * Parte ISENTA de uma remuneração mensal de Categoria A pelo IRS Jovem, com o
 * teto mensal de (55 × IAS) ÷ 14. Devolve o valor isento e a parte tributável
 * (para mostrar a poupança/isenção na UI). A retenção na fonte NÃO se calcula
 * sobre `tributavel` — ver `retencaoJovem`, onde a isenção incide sobre o valor
 * da retenção. ESTIMATIVA — a aplicação oficial é mensal e a AT pode distribuir
 * o teto de forma diferente; o trabalhador tem de ter comunicado à entidade que
 * pretende beneficiar do regime (não é automático).
 */
export function isencaoJovemRemuneracao(remuneracao: number, irsJovemAno?: number): IsencaoJovemMensal {
  const pct = isencaoIRSJovem(irsJovemAno);
  const R = Math.max(0, remuneracao);
  if (pct <= 0 || R <= 0) return { pct: 0, isentoEur: 0, tributavel: R, excedeTeto: false };
  const bruto = R * pct;
  const isentoEur = Math.min(bruto, IRS_JOVEM_TETO_MENSAL);
  return { pct, isentoEur: cent(isentoEur), tributavel: cent(R - isentoEur), excedeTeto: bruto > IRS_JOVEM_TETO_MENSAL + 0.005 };
}

/** Parcela a abater do escalão (valor fixo ou fórmula do mínimo de existência). */
function parcelaAbater(esc: EscalaoRetencao, remuneracao: number): number {
  const p = esc.parcelaAbater;
  return typeof p === "number" ? p : esc.taxa * p.coef * (p.base - remuneracao);
}

/**
 * Retenção na fonte de IRS mensal de um trabalhador dependente, pela fórmula
 * oficial: `R × taxa marginal máxima − parcela a abater − (parcela por
 * dependente × n.º dependentes)`, nunca negativa. Com 3+ dependentes aplica-se
 * a redução de 1 p.p. na taxa marginal (Despacho 233-A/2026, n.º 5 al. h).
 */
export function retencaoIRSDependente(
  salarioBruto: number,
  dependentes = 0,
  tabela: EscalaoRetencao[] = RETENCAO_DEP_CONTINENTE_T1.value,
  parcelaDependente: number = RETENCAO_DEP_POR_DEPENDENTE.value
): number {
  const R = Math.max(0, salarioBruto);
  const dep = Math.max(0, dependentes);
  const esc = tabela.find((e) => R <= e.ate) ?? tabela[tabela.length - 1];
  if (esc.taxa === 0) return 0;
  // n.º 5 al. h): 3+ dependentes → −1 p.p. na taxa marginal (parcela inalterada).
  const taxa = dep >= 3 ? Math.max(0, esc.taxa - 0.01) : esc.taxa;
  const ret = R * taxa - parcelaAbater(esc, R) - parcelaDependente * dep;
  return Math.max(0, cent(ret));
}

/** Retenção mensal resolvendo a tabela pela situação familiar (estado civil + deficiência). */
function retencaoPorSituacao(
  salarioBruto: number,
  dependentes: number,
  estadoCivil: EstadoCivilRet,
  deficiencia: boolean,
  regiao: Regiao = "continente"
): number {
  const tab = tabelaRetencaoDependente(estadoCivil, dependentes, deficiencia, regiao);
  return retencaoIRSDependente(salarioBruto, dependentes, tab.escaloes, tab.parcelaDependente);
}

/**
 * Retenção mensal de IRS de um beneficiário do IRS Jovem.
 *
 * MECÂNICA OFICIAL (mensal): a isenção do IRS Jovem incide sobre o VALOR da
 * retenção, NÃO sobre a base. Apura-se a retenção normal (tabela da situação
 * familiar) e aplica-se a fração ISENTA da remuneração — fração que já respeita
 * o teto de 55×IAS. Equivale a `retenção_normal × (1 − isento/remuneração)`.
 *
 * Não se encolhe a base antes de consultar a tabela: ao fazê-lo, uma isenção
 * parcial (ex.: 25%) podia empurrar a remuneração para o patamar de 0% e zerar
 * indevidamente a retenção. A redução da base é a mecânica ANUAL (rendimento
 * coletável), não a da retenção na fonte mensal.
 * Fonte: tabelas de retenção 2026 (Despacho 233-A/2026); Doutor Finanças.
 */
function retencaoJovem(
  salarioBruto: number,
  dependentes: number,
  estadoCivil: EstadoCivilRet,
  deficiencia: boolean,
  regiao: Regiao,
  irsJovemAno?: number
): number {
  const R = Math.max(0, salarioBruto);
  const retNormal = retencaoPorSituacao(R, dependentes, estadoCivil, deficiencia, regiao);
  if (retNormal <= 0 || R <= 0) return retNormal;
  const { isentoEur } = isencaoJovemRemuneracao(R, irsJovemAno);
  return Math.max(0, cent(retNormal * (1 - isentoEur / R)));
}

export interface VencimentoInput {
  /** Remuneração base mensal ilíquida (bruto). */
  salarioBruto: number;
  /** Número de dependentes a cargo. */
  dependentes?: number;
  /** Valor diário do subsídio de refeição (0 se não houver). */
  subsidioRefeicaoDia?: number;
  /** Pago em cartão/vale (limite mais alto) em vez de numerário. */
  subsidioRefeicaoCartao?: boolean;
  /** Dias úteis do mês (default 22). */
  diasUteis?: number;
  /** Situação familiar para a tabela de retenção (default não casado). */
  estadoCivil?: EstadoCivilRet;
  /** Titular com deficiência ≥ 60% (tabelas IV-VII). */
  deficiencia?: boolean;
  /** Região fiscal (tabelas de retenção próprias na Madeira e nos Açores). */
  regiao?: Regiao;
  /** Ano de benefício do IRS Jovem (1 a 10); 0/undefined se não aplicável. */
  irsJovemAno?: number;
}

export interface VencimentoResult {
  bruto: number;
  ssTrabalhador: number;
  irsRetido: number;
  /** Retenção que haveria SEM IRS Jovem (para mostrar a poupança). */
  irsSemJovem: number;
  /** Percentagem de isenção do IRS Jovem aplicada (0 a 1). */
  isencaoJovemPct: number;
  /** Rendimento mensal isento de IRS pelo IRS Jovem (€). */
  rendimentoIsentoJovem: number;
  /** True se o teto mensal do IRS Jovem foi atingido. */
  excedeTetoJovem: boolean;
  subsidioRefeicaoTotal: number;
  subsidioRefeicaoIsento: number;
  /** Parte do subsídio acima do limite — sujeita a IRS/SS (modelado na Etapa 2). */
  subsidioRefeicaoTributado: number;
  /** Vencimento líquido a receber (inclui subsídio de refeição). */
  liquido: number;
  /** Peso de IRS + SS sobre o bruto (0–1). */
  taxaEfetiva: number;
  /** Custo total para a entidade empregadora (bruto + TSU). */
  custoEmpresa: number;
}

/**
 * Decompõe um vencimento mensal. Estimativa — a parte do subsídio de refeição
 * acima do limite é entregue na íntegra mas a tributação extra do excesso
 * ainda não é descontada (refinamento na Etapa 2).
 */
export function calcularVencimento(input: VencimentoInput): VencimentoResult {
  const bruto = Math.max(0, input.salarioBruto);
  const dependentes = Math.max(0, Math.floor(input.dependentes ?? 0));

  const ec = input.estadoCivil ?? "naoCasado";
  const def = input.deficiencia ?? false;
  const reg = input.regiao ?? "continente";

  const ssTrabalhador = cent(bruto * SS_DEPENDENTE.trabalhador.value);
  const jovem = isencaoJovemRemuneracao(bruto, input.irsJovemAno);
  const irsRetido = retencaoJovem(bruto, dependentes, ec, def, reg, input.irsJovemAno);
  const irsSemJovem = retencaoPorSituacao(bruto, dependentes, ec, def, reg);

  const dias = Math.max(0, input.diasUteis ?? 22);
  const valorDia = Math.max(0, input.subsidioRefeicaoDia ?? 0);
  const limiteDia = input.subsidioRefeicaoCartao
    ? SUBSIDIO_REFEICAO.cartao.value
    : SUBSIDIO_REFEICAO.dinheiro.value;

  const subsidioRefeicaoTotal = cent(valorDia * dias);
  const subsidioRefeicaoIsento = cent(Math.min(valorDia, limiteDia) * dias);
  const subsidioRefeicaoTributado = cent(subsidioRefeicaoTotal - subsidioRefeicaoIsento);

  const liquido = cent(bruto - ssTrabalhador - irsRetido + subsidioRefeicaoTotal);
  const taxaEfetiva = bruto > 0 ? (ssTrabalhador + irsRetido) / bruto : 0;
  const custoEmpresa = cent(bruto * (1 + SS_DEPENDENTE.entidade.value));

  return {
    bruto,
    ssTrabalhador,
    irsRetido,
    irsSemJovem,
    isencaoJovemPct: jovem.pct,
    rendimentoIsentoJovem: jovem.isentoEur,
    excedeTetoJovem: jovem.excedeTeto,
    subsidioRefeicaoTotal,
    subsidioRefeicaoIsento,
    subsidioRefeicaoTributado,
    liquido,
    taxaEfetiva,
    custoEmpresa,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  Recibo mensal DETALHADO — rendimentos adicionais e faltas
//  ---------------------------------------------------------------------
//  Estende o recibo base com: trabalho suplementar (horas extra),
//  prémios (regulares contam para a SS), subsídios de férias/Natal pagos
//  no mês, ajudas de custo (isentas até ao limite legal) e faltas (horas
//  de ausência não remuneradas). Cada regra fiscal vem de `fiscal-data.ts`:
//   · retribuição horária = (base × 12) ÷ (52 × horas semanais) [Art. 271.º CT];
//   · acréscimos do trabalho suplementar [Art. 268.º CT];
//   · retenção autónoma do suplementar = 50% da taxa efetiva mensal (2026);
//   · subsídios de férias/Natal: retenção autónoma (Art. 99.º-C CIRS);
//   · ajudas de custo isentas até ao limite diário (nacional/estrangeiro);
//   · prémios regulares integram a base de incidência da SS (Cód. Contributivo).
//  Com todos os extras a zero, reproduz exatamente `calcularVencimento`.
//  É ESTIMATIVA — não substitui o recibo oficial.
// ─────────────────────────────────────────────────────────────────────

export interface ReciboMensalInput {
  /** Remuneração base mensal ilíquida. */
  salarioBruto: number;
  dependentes?: number;
  estadoCivil?: EstadoCivilRet;
  deficiencia?: boolean;
  /** Região fiscal (tabelas de retenção próprias na Madeira e nos Açores). */
  regiao?: Regiao;
  /** Ano de benefício do IRS Jovem (1 a 10); 0/undefined se não aplicável. */
  irsJovemAno?: number;
  /** Período normal de trabalho semanal (horas). Default 40. */
  horasSemanais?: number;
  // Subsídio de refeição
  subsidioRefeicaoDia?: number;
  subsidioRefeicaoCartao?: boolean;
  /** Dias com subsídio de refeição (já líquido dos dias sem subsídio). */
  diasSubsidio?: number;
  /** Horas de ausência não remuneradas (faltas). */
  horasAusencia?: number;
  /** Horas de trabalho suplementar por acréscimo (ordem de TRABALHO_SUPLEMENTAR.acrescimos). */
  horasSuplementares?: number[];
  /** Prémio pago no mês. */
  premio?: number;
  /** Prémio de caráter regular → integra a base da Segurança Social. */
  premioRegular?: boolean;
  /** Subsídio de férias pago neste mês. */
  subsidioFerias?: number;
  /** Subsídio de Natal pago neste mês. */
  subsidioNatal?: number;
  /** Outros rendimentos sujeitos a IRS/SS (feriados, diuturnidades, etc.). */
  outrosRendimentosSujeitos?: number;
  // Ajudas de custo (deslocações)
  ajudasNacionalDias?: number;
  ajudasNacionalValorDia?: number;
  ajudasEstrangeiroDias?: number;
  ajudasEstrangeiroValorDia?: number;
}

export interface ReciboMensalResult {
  salarioBase: number;
  retribuicaoHoraria: number;
  horasAusencia: number;
  descontoFaltas: number;
  baseRemunerada: number;
  // Trabalho suplementar
  suplementarTotal: number;
  suplementarDetalhe: { acrescimo: number; horas: number; valor: number }[];
  suplementarIRS: number;
  // Prémio
  premio: number;
  premioRegular: boolean;
  // Subsídios de férias/Natal pagos no mês
  subsidioFerias: number;
  subsidioNatal: number;
  irsSubsidios: number;
  /** Outros rendimentos sujeitos a IRS/SS. */
  outrosSujeitos: number;
  // Ajudas de custo
  ajudasTotal: number;
  ajudasIsentas: number;
  ajudasTributadas: number;
  // Subsídio de refeição
  subsidioRefeicaoTotal: number;
  subsidioRefeicaoIsento: number;
  subsidioRefeicaoTributado: number;
  // Descontos
  baseSS: number;
  ssTrabalhador: number;
  irsBaseMensal: number;
  irsTotal: number;
  // IRS Jovem
  isencaoJovemPct: number;
  rendimentoIsentoJovem: number;
  excedeTetoJovem: boolean;
  /** Retenção total que haveria SEM IRS Jovem (poupança = irsSemJovem − irsTotal). */
  irsSemJovem: number;
  // Totais
  brutoTotal: number;
  liquido: number;
  taxaEfetiva: number;
  custoEmpresa: number;
  /** True se há algum rendimento adicional ou falta (para a UI decidir mostrar). */
  temExtras: boolean;
}

export function calcularReciboMensal(input: ReciboMensalInput): ReciboMensalResult {
  const salarioBase = Math.max(0, input.salarioBruto);
  const dependentes = Math.max(0, Math.floor(input.dependentes ?? 0));
  const ec = input.estadoCivil ?? "naoCasado";
  const def = input.deficiencia ?? false;
  const reg = input.regiao ?? "continente";

  // Retribuição horária (Art. 271.º CT).
  const horasSemanais = Math.max(1, input.horasSemanais ?? HORARIO_SEMANAL_COMPLETO.value);
  const retribuicaoHoraria = cent((salarioBase * 12) / (52 * horasSemanais));

  // Faltas — horas de ausência não remuneradas reduzem a base.
  const horasAusencia = Math.max(0, input.horasAusencia ?? 0);
  const descontoFaltas = cent(Math.min(salarioBase, retribuicaoHoraria * horasAusencia));
  const baseRemunerada = cent(salarioBase - descontoFaltas);

  // Trabalho suplementar — por cada acréscimo legal, valor = hora × (1 + acréscimo).
  const acrescimos = TRABALHO_SUPLEMENTAR.acrescimos.value;
  const horasSup = input.horasSuplementares ?? [];
  const suplementarDetalhe = acrescimos.map((acrescimo, i) => {
    const horas = Math.max(0, horasSup[i] ?? 0);
    return { acrescimo, horas, valor: cent(retribuicaoHoraria * horas * (1 + acrescimo)) };
  });
  const suplementarTotal = cent(suplementarDetalhe.reduce((s, x) => s + x.valor, 0));

  // Prémio.
  const premio = Math.max(0, input.premio ?? 0);
  const premioRegular = !!input.premioRegular;

  // Subsídios de férias/Natal pagos no mês.
  const subsidioFerias = Math.max(0, input.subsidioFerias ?? 0);
  const subsidioNatal = Math.max(0, input.subsidioNatal ?? 0);

  // Outros rendimentos sujeitos a IRS/SS (ex.: feriados, diuturnidades, prémios
  // não regulares já incluídos noutro campo) — captura o que um recibo real tem
  // além do salário base, para a base de incidência bater certo (ex.: importação
  // de PDF que conhece a "remuneração sujeita" mas não a decompõe linha a linha).
  const outrosSujeitos = Math.max(0, input.outrosRendimentosSujeitos ?? 0);

  // Ajudas de custo — isentas até ao limite diário; o excesso é tributado.
  const ajN = Math.max(0, input.ajudasNacionalDias ?? 0);
  const ajNv = Math.max(0, input.ajudasNacionalValorDia ?? 0);
  const ajE = Math.max(0, input.ajudasEstrangeiroDias ?? 0);
  const ajEv = Math.max(0, input.ajudasEstrangeiroValorDia ?? 0);
  const ajudasTotal = cent(ajN * ajNv + ajE * ajEv);
  const ajudasIsentas = cent(
    Math.min(ajNv, AJUDAS_CUSTO.nacionalDia.value) * ajN + Math.min(ajEv, AJUDAS_CUSTO.estrangeiroDia.value) * ajE
  );
  const ajudasTributadas = cent(ajudasTotal - ajudasIsentas);

  // Subsídio de refeição.
  const dias = Math.max(0, input.diasSubsidio ?? 22);
  const valorDia = Math.max(0, input.subsidioRefeicaoDia ?? 0);
  const limiteDia = input.subsidioRefeicaoCartao ? SUBSIDIO_REFEICAO.cartao.value : SUBSIDIO_REFEICAO.dinheiro.value;
  const subsidioRefeicaoTotal = cent(valorDia * dias);
  const subsidioRefeicaoIsento = cent(Math.min(valorDia, limiteDia) * dias);
  const subsidioRefeicaoTributado = cent(subsidioRefeicaoTotal - subsidioRefeicaoIsento);

  // Base de incidência da Segurança Social (11% do trabalhador): base remunerada,
  // suplementar, subsídios, prémio SE regular, e os excessos tributáveis.
  const baseSS = cent(
    baseRemunerada +
      suplementarTotal +
      (premioRegular ? premio : 0) +
      subsidioFerias +
      subsidioNatal +
      outrosSujeitos +
      ajudasTributadas +
      subsidioRefeicaoTributado
  );
  const ssTrabalhador = cent(baseSS * SS_DEPENDENTE.trabalhador.value);

  // IRS — retenção da remuneração mensal (tabela) sobre base + prémio + excessos.
  // O IRS Jovem isenta parte da remuneração; a tabela incide só sobre o tributável.
  const remMensal = cent(baseRemunerada + premio + outrosSujeitos + ajudasTributadas + subsidioRefeicaoTributado);
  const ano = input.irsJovemAno;
  const jovemMes = isencaoJovemRemuneracao(remMensal, ano);
  const irsBaseMensal = retencaoJovem(remMensal, dependentes, ec, def, reg, ano);
  // Trabalho suplementar: retenção autónoma = 50% da taxa efetiva mensal.
  const taxaEfetivaMes = remMensal > 0 ? irsBaseMensal / remMensal : 0;
  const suplementarIRS = cent(suplementarTotal * taxaEfetivaMes * RETENCAO_SUPLEMENTAR_FATOR.value);
  // Subsídios de férias/Natal: retenção autónoma (cada um pela tabela, em separado),
  // também com a isenção do IRS Jovem aplicada à sua base.
  const irsSubsidios = cent(
    retencaoJovem(subsidioFerias, dependentes, ec, def, reg, ano) +
      retencaoJovem(subsidioNatal, dependentes, ec, def, reg, ano)
  );
  const irsTotal = cent(irsBaseMensal + suplementarIRS + irsSubsidios);

  // Decomposição do IRS Jovem (para a UI mostrar a poupança e o isento).
  const isentoFerias = isencaoJovemRemuneracao(subsidioFerias, ano).isentoEur;
  const isentoNatal = isencaoJovemRemuneracao(subsidioNatal, ano).isentoEur;
  const rendimentoIsentoJovem = cent(jovemMes.isentoEur + isentoFerias + isentoNatal);
  const irsSemJovem = cent(
    retencaoPorSituacao(remMensal, dependentes, ec, def, reg) +
      cent(suplementarTotal * (remMensal > 0 ? retencaoPorSituacao(remMensal, dependentes, ec, def, reg) / remMensal : 0) * RETENCAO_SUPLEMENTAR_FATOR.value) +
      retencaoPorSituacao(subsidioFerias, dependentes, ec, def, reg) +
      retencaoPorSituacao(subsidioNatal, dependentes, ec, def, reg)
  );

  // Totais.
  const brutoTotal = cent(
    baseRemunerada + suplementarTotal + premio + subsidioFerias + subsidioNatal + outrosSujeitos + ajudasTotal + subsidioRefeicaoTotal
  );
  const liquido = cent(brutoTotal - ssTrabalhador - irsTotal);
  const rendimentoSujeito = cent(brutoTotal - ajudasIsentas - subsidioRefeicaoIsento);
  const taxaEfetiva = rendimentoSujeito > 0 ? (ssTrabalhador + irsTotal) / rendimentoSujeito : 0;
  const custoEmpresa = cent(baseSS * (1 + SS_DEPENDENTE.entidade.value));

  const temExtras =
    descontoFaltas > 0 ||
    suplementarTotal > 0 ||
    premio > 0 ||
    subsidioFerias > 0 ||
    subsidioNatal > 0 ||
    outrosSujeitos > 0 ||
    ajudasTotal > 0;

  return {
    salarioBase,
    retribuicaoHoraria,
    horasAusencia,
    descontoFaltas,
    baseRemunerada,
    suplementarTotal,
    suplementarDetalhe,
    suplementarIRS,
    premio,
    premioRegular,
    subsidioFerias,
    subsidioNatal,
    irsSubsidios,
    outrosSujeitos,
    ajudasTotal,
    ajudasIsentas,
    ajudasTributadas,
    subsidioRefeicaoTotal,
    subsidioRefeicaoIsento,
    subsidioRefeicaoTributado,
    baseSS,
    ssTrabalhador,
    irsBaseMensal,
    irsTotal,
    isencaoJovemPct: jovemMes.pct,
    rendimentoIsentoJovem,
    excedeTetoJovem: jovemMes.excedeTeto,
    irsSemJovem,
    brutoTotal,
    liquido,
    taxaEfetiva,
    custoEmpresa,
    temExtras,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  Visão anual — 14 meses (salário + subsídios de férias e de Natal)
//  ---------------------------------------------------------------------
//  Subsídios de férias e de Natal são objeto de RETENÇÃO AUTÓNOMA: nunca
//  se somam à remuneração mensal; a fórmula da tabela aplica-se ao valor
//  de cada subsídio em separado (Art. 99.º-C CIRS; Despacho 233-A/2026).
//  Estão sujeitos a Segurança Social como o salário (base contributiva do
//  Código Contributivo). Em duodécimos o TOTAL anual de IRS é o mesmo —
//  só muda a distribuição mensal (a taxa efetiva do subsídio inteiro
//  aplica-se a cada 1/12). Cada subsídio vale um mês de salário base.
// ─────────────────────────────────────────────────────────────────────

export interface VencimentoAnualInput extends VencimentoInput {
  /** Meses em que o subsídio de refeição é pago (default 11 — exclui férias). */
  mesesSubsidioRefeicao?: number;
}

export interface VencimentoAnualResult {
  /** Salário base × 14 (12 meses + férias + Natal). */
  brutoAnual: number;
  subsidioFerias: number;
  subsidioNatal: number;
  /** Segurança Social do trabalhador sobre os 14 meses. */
  ssAnual: number;
  irsAnual: number;
  /** Retenção dos 12 meses de salário. */
  irsSalario: number;
  /** Retenção autónoma do subsídio de férias. */
  irsFerias: number;
  /** Retenção autónoma do subsídio de Natal. */
  irsNatal: number;
  subsidioRefeicaoAnual: number;
  subsidioRefeicaoIsentoAnual: number;
  liquidoAnual: number;
  /** Líquido anual ÷ 12 — o que se recebe por mês se os subsídios forem em duodécimos. */
  liquidoMedioMes: number;
  taxaEfetiva: number;
  /** Percentagem de isenção do IRS Jovem aplicada (0 a 1). */
  isencaoJovemPct: number;
  /** Rendimento isento de IRS no ano pelo IRS Jovem (€). */
  rendimentoIsentoJovemAnual: number;
}

/**
 * Decompõe o vencimento ANUAL (14 meses), com os subsídios de férias e de
 * Natal e respetiva retenção autónoma. Estimativa — assume um ano completo de
 * trabalho e ambos os subsídios iguais ao salário base.
 */
export function calcularVencimentoAnual(input: VencimentoAnualInput): VencimentoAnualResult {
  const bruto = Math.max(0, input.salarioBruto);
  const dependentes = Math.max(0, Math.floor(input.dependentes ?? 0));

  const subsidioFerias = bruto;
  const subsidioNatal = bruto;
  const brutoAnual = cent(bruto * 14);

  // SS incide sobre salário + ambos os subsídios.
  const ssAnual = cent(brutoAnual * SS_DEPENDENTE.trabalhador.value);

  // Retenção autónoma: fórmula aplicada a cada remuneração em separado.
  const ec = input.estadoCivil ?? "naoCasado";
  const def = input.deficiencia ?? false;
  const reg = input.regiao ?? "continente";
  const ano = input.irsJovemAno;
  const irsSalario = cent(retencaoJovem(bruto, dependentes, ec, def, reg, ano) * 12);
  const irsFerias = retencaoJovem(subsidioFerias, dependentes, ec, def, reg, ano);
  const irsNatal = retencaoJovem(subsidioNatal, dependentes, ec, def, reg, ano);
  const irsAnual = cent(irsSalario + irsFerias + irsNatal);

  // Isenção do IRS Jovem no ano: salário (×12, com teto mensal) + ambos os subsídios.
  const jovemMes = isencaoJovemRemuneracao(bruto, ano);
  const rendimentoIsentoJovemAnual = cent(
    jovemMes.isentoEur * 12 +
      isencaoJovemRemuneracao(subsidioFerias, ano).isentoEur +
      isencaoJovemRemuneracao(subsidioNatal, ano).isentoEur
  );

  // Subsídio de refeição: pago só nos meses trabalhados (default 11).
  const meses = Math.max(0, input.mesesSubsidioRefeicao ?? 11);
  const dias = Math.max(0, input.diasUteis ?? 22);
  const valorDia = Math.max(0, input.subsidioRefeicaoDia ?? 0);
  const limiteDia = input.subsidioRefeicaoCartao
    ? SUBSIDIO_REFEICAO.cartao.value
    : SUBSIDIO_REFEICAO.dinheiro.value;
  const subsidioRefeicaoAnual = cent(valorDia * dias * meses);
  const subsidioRefeicaoIsentoAnual = cent(Math.min(valorDia, limiteDia) * dias * meses);

  const liquidoAnual = cent(brutoAnual - ssAnual - irsAnual + subsidioRefeicaoAnual);
  const liquidoMedioMes = cent(liquidoAnual / 12);
  const taxaEfetiva = brutoAnual > 0 ? (ssAnual + irsAnual) / brutoAnual : 0;

  return {
    brutoAnual,
    subsidioFerias,
    subsidioNatal,
    ssAnual,
    irsAnual,
    irsSalario,
    irsFerias,
    irsNatal,
    subsidioRefeicaoAnual,
    subsidioRefeicaoIsentoAnual,
    liquidoAnual,
    liquidoMedioMes,
    taxaEfetiva,
    isencaoJovemPct: jovemMes.pct,
    rendimentoIsentoJovemAnual,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  Comparador A vs B vs empresa
//  ---------------------------------------------------------------------
//  Para um mesmo rendimento anual ilíquido, estima o líquido como:
//   · trabalhador dependente (Cat. A) — salário em 14 meses;
//   · trabalhador independente (Cat. B) — recibos verdes (regime simplificado);
//   · sociedade — IRC + distribuição de dividendos.
//  Reutiliza compararRegimes (B vs empresa) e calcularVencimentoAnual (A).
//  ESTIMATIVA: o cenário empresa não modela salário/SS do gerente nem
//  tributação autónoma (ver compararRegimes). A Cat. A ignora o subsídio de
//  refeição para uma comparação limpa do bruto.
// ─────────────────────────────────────────────────────────────────────

export interface ComparacaoCategoriasInput {
  /** Rendimento anual ilíquido a comparar (salário de 14 meses OU faturação). */
  brutoAnual: number;
  /** Tipo de atividade para o cenário de recibos verdes (default art151). */
  tipo?: TipoAtividade;
  /** Dependentes (afeta a retenção na Categoria A). */
  dependentes?: number;
  /** Despesas de atividade (recibos verdes e empresa). */
  despesas?: number;
  /** Custos extra exclusivos da empresa (contabilista, admin…). */
  custosEmpresa?: number;
  derrama?: number;
  irsJovemAno?: number;
}

export interface ComparacaoCategoriasResult {
  dependente: { bruto: number; ss: number; irs: number; liquido: number; taxaEfetiva: number };
  freelancer: ComparacaoResult["freelancer"];
  empresa: ComparacaoResult["empresa"];
  /** Categoria com maior líquido disponível. */
  melhor: "dependente" | "freelancer" | "empresa";
}

export function compararCategorias(input: ComparacaoCategoriasInput): ComparacaoCategoriasResult {
  const bruto = Math.max(0, input.brutoAnual);

  // Cat. B (recibos verdes) + empresa — motor existente.
  const base = compararRegimes({
    brutoAnual: bruto,
    tipo: input.tipo ?? "art151",
    despesas: input.despesas,
    custosEmpresa: input.custosEmpresa,
    derrama: input.derrama,
    irsJovemAno: input.irsJovemAno,
  });

  // Cat. A (trabalho dependente): o mesmo bruto como salário de 14 meses,
  // sem subsídio de refeição para uma comparação limpa.
  const anual = calcularVencimentoAnual({
    salarioBruto: bruto / 14,
    dependentes: input.dependentes,
    subsidioRefeicaoDia: 0,
  });
  const dependente = {
    bruto: anual.brutoAnual,
    ss: anual.ssAnual,
    irs: anual.irsAnual,
    liquido: anual.liquidoAnual,
    taxaEfetiva: anual.taxaEfetiva,
  };

  const liquidos = {
    dependente: dependente.liquido,
    freelancer: base.freelancer.liquido,
    empresa: base.empresa.liquido,
  } as const;
  const melhor = (Object.keys(liquidos) as (keyof typeof liquidos)[]).reduce((a, b) =>
    liquidos[b] > liquidos[a] ? b : a
  );

  return { dependente, freelancer: base.freelancer, empresa: base.empresa, melhor };
}

// ─────────────────────────────────────────────────────────────────────
//  Mealheiro fiscal — acerto anual de IRS (Categoria A)
//  ---------------------------------------------------------------------
//  Os rendimentos variáveis (comissões, prémios, horas extra) são muitas
//  vezes sub-retidos: a retenção mensal segue o salário base, mas o IRS
//  anual incide sobre o total. Este motor estima o imposto anual devido
//  (dedução específica 8,54×IAS, escalões progressivos, deduções por
//  dependente, mínimo de existência) e compara com o retido — sugerindo
//  quanto reservar para o acerto. ESTIMATIVA — apuramento oficial difere.
// ─────────────────────────────────────────────────────────────────────

export interface MealheiroDependenteInput {
  salarioBruto: number;
  dependentes?: number;
  /** Rendimentos variáveis anuais (comissões, prémios, horas extra). */
  variavelAnual?: number;
  estadoCivil?: EstadoCivilRet;
  deficiencia?: boolean;
  regiao?: Regiao;
  /** Ano de benefício do IRS Jovem (1 a 10); 0/undefined se não aplicável. */
  irsJovemAno?: number;
}

export interface MealheiroDependenteResult {
  brutoAnual: number;
  deducaoEspecifica: number;
  /** Rendimento isento de IRS no ano pelo IRS Jovem (€). */
  rendimentoIsentoJovem: number;
  rendimentoColetavel: number;
  irsApurado: number;
  irsRetido: number;
  /** Positivo → falta pagar (reservar); negativo → reembolso esperado. */
  acerto: number;
  /** Reserva mensal sugerida para cobrir o acerto (0 se houver reembolso). */
  reservaMensal: number;
}

function deducaoDependentes(dep: number): number {
  const n = Math.max(0, Math.floor(dep));
  return Math.min(n, 2) * DEDUCAO_DEPENDENTE.value + Math.max(0, n - 2) * DEDUCAO_DEPENDENTE_3MAIS.value;
}

export function mealheiroDependente(input: MealheiroDependenteInput): MealheiroDependenteResult {
  const base = Math.max(0, input.salarioBruto);
  const dep = Math.max(0, Math.floor(input.dependentes ?? 0));
  const variavel = Math.max(0, input.variavelAnual ?? 0);

  const brutoAnual = cent(base * 14 + variavel);
  const ssAnual = cent(brutoAnual * SS_DEPENDENTE.trabalhador.value);

  // Dedução específica: 8,54 × IAS ou as contribuições para a SS, se superiores.
  const deducaoEspecifica = cent(Math.max(DEDUCAO_ESPECIFICA_DEPENDENTE.value, ssAnual));
  // IRS Jovem: isenta parte do rendimento bruto, até ao teto anual de 55 × IAS.
  const ano = input.irsJovemAno;
  const pctJovem = isencaoIRSJovem(ano);
  const rendimentoIsentoJovem = cent(Math.min(brutoAnual * pctJovem, IRS_JOVEM_TETO_CALC));
  const rendimentoColetavel = cent(Math.max(0, brutoAnual - deducaoEspecifica - rendimentoIsentoJovem));

  const irsBruto = irsProgressivo(rendimentoColetavel);
  const irsAposDeducoes = Math.max(0, irsBruto - deducaoDependentes(dep));
  // Mínimo de existência: o rendimento líquido não pode descer abaixo do limiar.
  const irsMaximo = Math.max(0, rendimentoColetavel - MINIMO_EXISTENCIA.value);
  const irsApurado = cent(Math.min(irsAposDeducoes, irsMaximo));

  // Retido na fonte estimado: salário (14 meses) + variável à taxa efetiva do mês.
  const ec = input.estadoCivil ?? "naoCasado";
  const def = input.deficiencia ?? false;
  const reg = input.regiao ?? "continente";
  const irsRetidoBase = calcularVencimentoAnual({ salarioBruto: base, dependentes: dep, subsidioRefeicaoDia: 0, estadoCivil: ec, deficiencia: def, regiao: reg, irsJovemAno: ano }).irsAnual;
  const taxaEfetivaMes = base > 0 ? retencaoJovem(base, dep, ec, def, reg, ano) / base : 0;
  const irsRetido = cent(irsRetidoBase + variavel * taxaEfetivaMes);

  const acerto = cent(irsApurado - irsRetido);
  const reservaMensal = acerto > 0 ? cent(acerto / 12) : 0;

  return { brutoAnual, deducaoEspecifica, rendimentoIsentoJovem, rendimentoColetavel, irsApurado, irsRetido, acerto, reservaMensal };
}

// ─────────────────────────────────────────────────────────────────────
//  Auditoria de recibo de vencimento (Pro)
//  ---------------------------------------------------------------------
//  Compara o que o recibo MOSTRA (introduzido pelo trabalhador) com o que
//  as tabelas de 2026 determinam, sinalizando divergências de SS e IRS.
//  Tolerância pequena para absorver arredondamentos e acertos legítimos.
// ─────────────────────────────────────────────────────────────────────

export interface AuditoriaInput extends VencimentoInput {
  /** IRS retido que consta no recibo. */
  irsDeclarado: number;
  /** Segurança Social descontada que consta no recibo. */
  ssDeclarado: number;
  /**
   * Remuneração mensal sujeita a IRS/SS que consta no recibo. Quando fornecida
   * (ex.: extraída de um PDF), é a base usada para o esperado — mais exata do
   * que reconstruir a partir do salário base, pois reflete todos os abonos
   * sujeitos (feriados, prémios, etc.).
   */
  remuneracaoSujeita?: number;
}

export interface AuditoriaResult {
  /** Base de incidência usada para o esperado (remuneração sujeita ou salário base). */
  baseIncidencia: number;
  ssEsperado: number;
  irsEsperado: number;
  /** Declarado − esperado (positivo: desconto a mais). */
  ssDiferenca: number;
  irsDiferenca: number;
  ssOk: boolean;
  irsOk: boolean;
  /** Custo estimado para a entidade (base + TSU 23,75%). */
  custoEmpresa: number;
  /** Taxa efetiva esperada (IRS + SS sobre a base). */
  taxaEfetiva: number;
  /** Líquido esperado (base − SS esperada − IRS esperado), sem subsídios isentos. */
  liquidoEsperado: number;
  /** Líquido que resulta dos descontos do recibo (base − SS declarada − IRS declarado). */
  liquidoDeclarado: number;
  // IRS Jovem
  /** Percentagem de isenção do IRS Jovem considerada (0 a 1). */
  isencaoJovemPct: number;
  /** Rendimento isento de IRS pelo IRS Jovem nesta base (€). */
  rendimentoIsentoJovem: number;
  excedeTetoJovem: boolean;
  /** Parte do subsídio de refeição acima do limite (tributável). */
  subsidioExcede: number;
  alertas: string[];
  tudoOk: boolean;
}

/** Tolerância (€) para divergências consideradas normais (arredondamentos). */
const AUDIT_TOLERANCIA = 2;

export function auditarRecibo(input: AuditoriaInput): AuditoriaResult {
  const r = calcularVencimento(input);
  const dep = Math.max(0, Math.floor(input.dependentes ?? 0));
  const ec = input.estadoCivil ?? "naoCasado";
  const def = input.deficiencia ?? false;
  const reg = input.regiao ?? "continente";
  const ano = input.irsJovemAno;

  // Se a remuneração sujeita do recibo for fornecida, o esperado é calculado
  // sobre ela (mais exato); caso contrário, sobre o salário base simulado.
  const sujeita = input.remuneracaoSujeita;
  const usaSujeita = typeof sujeita === "number" && sujeita > 0;
  const baseIncidencia = usaSujeita ? cent(sujeita) : r.bruto;
  const jovem = isencaoJovemRemuneracao(baseIncidencia, ano);

  const ssEsperado = usaSujeita ? cent(baseIncidencia * SS_DEPENDENTE.trabalhador.value) : r.ssTrabalhador;
  const irsEsperado = usaSujeita ? retencaoJovem(baseIncidencia, dep, ec, def, reg, ano) : r.irsRetido;
  const custoEmpresa = usaSujeita ? cent(baseIncidencia * (1 + SS_DEPENDENTE.entidade.value)) : r.custoEmpresa;

  const ssDiferenca = cent(Math.max(0, input.ssDeclarado) - ssEsperado);
  const irsDiferenca = cent(Math.max(0, input.irsDeclarado) - irsEsperado);
  const ssOk = Math.abs(ssDiferenca) <= AUDIT_TOLERANCIA;
  const irsOk = Math.abs(irsDiferenca) <= AUDIT_TOLERANCIA;

  const taxaEfetiva = baseIncidencia > 0 ? (ssEsperado + irsEsperado) / baseIncidencia : 0;
  const liquidoEsperado = cent(baseIncidencia - ssEsperado - irsEsperado);
  const liquidoDeclarado = cent(baseIncidencia - Math.max(0, input.ssDeclarado) - Math.max(0, input.irsDeclarado));

  const alertas: string[] = [];
  if (!irsOk) {
    const maisOuMenos = irsDiferenca > 0 ? "a mais" : "a menos";
    alertas.push(
      `Retenção de IRS: o recibo retém ${input.irsDeclarado.toFixed(2)} €, mas a tabela de 2026${ano ? " com IRS Jovem" : ""} dá ${irsEsperado.toFixed(2)} € — ${Math.abs(irsDiferenca).toFixed(2)} € ${maisOuMenos}.`
    );
  }
  if (!ssOk) {
    alertas.push(
      `Segurança Social: o recibo desconta ${input.ssDeclarado.toFixed(2)} €, mas a taxa de ${(SS_DEPENDENTE.trabalhador.value * 100).toFixed(0)}% sobre ${baseIncidencia.toFixed(2)} € dá ${ssEsperado.toFixed(2)} € (diferença de ${Math.abs(ssDiferenca).toFixed(2)} €).`
    );
  }
  if (ano && jovem.excedeTeto) {
    alertas.push(
      `IRS Jovem: a isenção está limitada ao teto mensal de ${IRS_JOVEM_TETO_MENSAL.toFixed(2)} € (55 × IAS ÷ 14). A parte do rendimento acima do teto é tributada normalmente.`
    );
  }
  if (r.subsidioRefeicaoTributado > 0) {
    alertas.push(
      `Subsídio de refeição: ${r.subsidioRefeicaoTributado.toFixed(2)} € estão acima do limite isento e deviam ser tributados (IRS e Segurança Social).`
    );
  }

  return {
    baseIncidencia,
    ssEsperado,
    irsEsperado,
    ssDiferenca,
    irsDiferenca,
    ssOk,
    irsOk,
    custoEmpresa,
    taxaEfetiva,
    liquidoEsperado,
    liquidoDeclarado,
    isencaoJovemPct: jovem.pct,
    rendimentoIsentoJovem: jovem.isentoEur,
    excedeTetoJovem: ano ? jovem.excedeTeto : false,
    subsidioExcede: r.subsidioRefeicaoTributado,
    alertas,
    tudoOk: ssOk && irsOk,
  };
}
