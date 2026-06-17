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
  tabelaRetencaoDependente,
  type EscalaoRetencao,
  type EstadoCivilRet,
  type TipoAtividade,
} from "./fiscal-data";
import { compararRegimes, irsProgressivo, type ComparacaoResult } from "./fiscal";

const cent = (n: number) => Math.round(n * 100) / 100;

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
  deficiencia: boolean
): number {
  const tab = tabelaRetencaoDependente(estadoCivil, dependentes, deficiencia);
  return retencaoIRSDependente(salarioBruto, dependentes, tab.escaloes, tab.parcelaDependente);
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
}

export interface VencimentoResult {
  bruto: number;
  ssTrabalhador: number;
  irsRetido: number;
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

  const ssTrabalhador = cent(bruto * SS_DEPENDENTE.trabalhador.value);
  const irsRetido = retencaoPorSituacao(
    bruto,
    dependentes,
    input.estadoCivil ?? "naoCasado",
    input.deficiencia ?? false
  );

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
    subsidioRefeicaoTotal,
    subsidioRefeicaoIsento,
    subsidioRefeicaoTributado,
    liquido,
    taxaEfetiva,
    custoEmpresa,
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
  const irsSalario = cent(retencaoPorSituacao(bruto, dependentes, ec, def) * 12);
  const irsFerias = retencaoPorSituacao(subsidioFerias, dependentes, ec, def);
  const irsNatal = retencaoPorSituacao(subsidioNatal, dependentes, ec, def);
  const irsAnual = cent(irsSalario + irsFerias + irsNatal);

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
}

export interface MealheiroDependenteResult {
  brutoAnual: number;
  deducaoEspecifica: number;
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
  const rendimentoColetavel = cent(Math.max(0, brutoAnual - deducaoEspecifica));

  const irsBruto = irsProgressivo(rendimentoColetavel);
  const irsAposDeducoes = Math.max(0, irsBruto - deducaoDependentes(dep));
  // Mínimo de existência: o rendimento líquido não pode descer abaixo do limiar.
  const irsMaximo = Math.max(0, rendimentoColetavel - MINIMO_EXISTENCIA.value);
  const irsApurado = cent(Math.min(irsAposDeducoes, irsMaximo));

  // Retido na fonte estimado: salário (14 meses) + variável à taxa efetiva do mês.
  const ec = input.estadoCivil ?? "naoCasado";
  const def = input.deficiencia ?? false;
  const irsRetidoBase = calcularVencimentoAnual({ salarioBruto: base, dependentes: dep, subsidioRefeicaoDia: 0, estadoCivil: ec, deficiencia: def }).irsAnual;
  const taxaEfetivaMes = base > 0 ? retencaoPorSituacao(base, dep, ec, def) / base : 0;
  const irsRetido = cent(irsRetidoBase + variavel * taxaEfetivaMes);

  const acerto = cent(irsApurado - irsRetido);
  const reservaMensal = acerto > 0 ? cent(acerto / 12) : 0;

  return { brutoAnual, deducaoEspecifica, rendimentoColetavel, irsApurado, irsRetido, acerto, reservaMensal };
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
}

export interface AuditoriaResult {
  ssEsperado: number;
  irsEsperado: number;
  /** Declarado − esperado (positivo: desconto a mais). */
  ssDiferenca: number;
  irsDiferenca: number;
  ssOk: boolean;
  irsOk: boolean;
  /** Parte do subsídio de refeição acima do limite (tributável). */
  subsidioExcede: number;
  alertas: string[];
  tudoOk: boolean;
}

/** Tolerância (€) para divergências consideradas normais (arredondamentos). */
const AUDIT_TOLERANCIA = 2;

export function auditarRecibo(input: AuditoriaInput): AuditoriaResult {
  const r = calcularVencimento(input);
  const ssEsperado = r.ssTrabalhador;
  const irsEsperado = r.irsRetido;
  const ssDiferenca = cent(Math.max(0, input.ssDeclarado) - ssEsperado);
  const irsDiferenca = cent(Math.max(0, input.irsDeclarado) - irsEsperado);
  const ssOk = Math.abs(ssDiferenca) <= AUDIT_TOLERANCIA;
  const irsOk = Math.abs(irsDiferenca) <= AUDIT_TOLERANCIA;

  const alertas: string[] = [];
  if (!ssOk) {
    alertas.push(
      `Segurança Social: o recibo desconta ${input.ssDeclarado.toFixed(2)} €, mas a taxa de ${(SS_DEPENDENTE.trabalhador.value * 100).toFixed(0)}% dá ${ssEsperado.toFixed(2)} € (diferença de ${Math.abs(ssDiferenca).toFixed(2)} €).`
    );
  }
  if (!irsOk) {
    alertas.push(
      `Retenção de IRS: o recibo retém ${input.irsDeclarado.toFixed(2)} €, mas a tabela de 2026 dá ${irsEsperado.toFixed(2)} € (diferença de ${Math.abs(irsDiferenca).toFixed(2)} €).`
    );
  }
  if (r.subsidioRefeicaoTributado > 0) {
    alertas.push(
      `Subsídio de refeição: ${r.subsidioRefeicaoTributado.toFixed(2)} € estão acima do limite isento e deviam ser tributados.`
    );
  }

  return {
    ssEsperado,
    irsEsperado,
    ssDiferenca,
    irsDiferenca,
    ssOk,
    irsOk,
    subsidioExcede: r.subsidioRefeicaoTributado,
    alertas,
    tudoOk: ssOk && irsOk,
  };
}
