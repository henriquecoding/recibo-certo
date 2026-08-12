// ─────────────────────────────────────────────────────────────────────────
//  CONTRATO ÚNICO DO RESULTADO DE UM RECIBO — fonte de verdade partilhada.
//
//  Antes desta camada existiam dois motores a responder à mesma pergunta: o
//  dashboard lia o instantâneo `_computed` (IRS anual estimado) e a página de
//  Receitas, o resumo do repositório e o CSV recalculavam a retenção na fonte.
//  O mesmo recibo produzia um líquido no painel, outro na lista e um terceiro
//  no ficheiro entregue ao contabilista.
//
//  A partir daqui há UM resultado por recibo, com os campos separados pela
//  grandeza que representam — retenção efetivamente feita, IRS anual estimado,
//  IVA cobrado e IVA a entregar são coisas diferentes e deixam de partilhar
//  nome. Todas as superfícies (painel, Receitas, Recibos, CSV, PDF, importação
//  para IRS) consomem `resultadoDoRecibo`; nenhuma volta a chamar o motor
//  diretamente.
//
//  Cada resultado carrega `anoFiscal` e `metodologiaVersion`: sem escopo
//  temporal explícito, um recibo de 2026 continuava a somar ao acumulado de
//  2027 (RC-P0-01). Os seletores anuais vivem todos aqui.
//
//  Módulo puro (sem "use client"): serve o cliente, os testes e as rotas de
//  API que compõem documentos no servidor.
// ─────────────────────────────────────────────────────────────────────────

import {
  calcular,
  type CalcInput,
  type CalcResult,
  type TipoAtividade,
  type Regiao,
  type RegimeIVA,
  type BaseSS,
} from "@/lib/fiscal";
import { ATIVIDADES, efeitoFiscal } from "@/lib/fiscal-data";

/**
 * Versão da metodologia de cálculo. Sobe quando a semântica de um campo do
 * resultado muda (não quando muda uma taxa — isso é `FISCAL_YEAR` + os dados).
 * Vai em cada resultado exportado para que um CSV antigo continue legível.
 */
export const METODOLOGIA_VERSION = "2026.1";

// ─── Tipos do domínio ───────────────────────────────────────────────────

/**
 * Instantâneo gravado pelo simulador no momento em que o recibo é registado.
 * Guarda o IRS ANUAL estimado (apuramento do ano inteiro imputado ao recibo),
 * que a retenção na fonte não consegue reproduzir.
 */
export interface ReciboComputed {
  /** IRS real estimado por recibo (da simulação anual, não a retenção na fonte). */
  irsEstimado: number;
  segSocial: number;
  iva: number;
  liquido: number;
}

export interface Recibo {
  id: string;
  /**
   * Data EFETIVA da operação/documento (ISO yyyy-mm-dd) — não a data em que a
   * pessoa se lembrou de o registar. É esta que define mês, trimestre e ano
   * fiscal (RC-P0-09).
   */
  data: string;
  cliente: string;
  /** Valor base, sem IVA. */
  valor: number;
  tipo: TipoAtividade;
  /** Rótulo da atividade do catálogo (Art. 151.º / regime especial). Opcional para compatibilidade. */
  atividade?: string;
  regiao: Regiao;
  regimeIVA: RegimeIVA;
  baseSS: BaseSS;
  dispensaRetencao: boolean;
  /** ISO timestamp do registo no ReciboCerto. Distinto de `data`. */
  criadoEm?: string;
  /** ISO timestamp da última alteração. */
  atualizadoEm?: string;
  /** Valores pré-calculados pelo simulador (IRS real, não retenção na fonte). */
  _computed?: ReciboComputed;
}

export type NovoRecibo = Omit<Recibo, "id">;

// ─── Escopo temporal (RC-P0-01) ─────────────────────────────────────────

/**
 * Ano de um recibo, lido do prefixo da data ISO.
 *
 * Deliberadamente NÃO usa `new Date(...)`: construir uma data para depois ler
 * o ano faz o resultado depender do fuso do dispositivo, e um recibo de
 * 31/12 podia cair no ano seguinte (ou o de 01/01 no anterior) conforme o
 * relógio de quem abre o painel. O prefixo de uma data civil é o ano civil.
 */
export function anoDoRecibo(r: Pick<Recibo, "data">): number {
  return Number(r.data.slice(0, 4));
}

/** Mês (1–12) de um recibo, também pelo prefixo — sem fuso pelo meio. */
export function mesDoRecibo(r: Pick<Recibo, "data">): number {
  return Number(r.data.slice(5, 7));
}

/** Trimestre (0–3) de um recibo. */
export function trimestreDoRecibo(r: Pick<Recibo, "data">): number {
  return Math.floor((mesDoRecibo(r) - 1) / 3);
}

/** Ano fiscal corrente (o ano civil da referência). */
export function anoFiscalCorrente(ref: Date = new Date()): number {
  return ref.getFullYear();
}

/** Chave `AAAA-MM` de uma referência — o mesmo formato do prefixo de `data`. */
export function chaveMes(ref: Date = new Date()): string {
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
}

/** Os recibos de um ano civil. É o único filtro anual do produto. */
export function recibosDoAno(recibos: Recibo[], ano: number): Recibo[] {
  return recibos.filter((r) => anoDoRecibo(r) === ano);
}

/** Os recibos de um mês civil (ano + mês da referência). */
export function recibosDoMes(recibos: Recibo[], ref: Date = new Date()): Recibo[] {
  const p = chaveMes(ref);
  return recibos.filter((r) => r.data.startsWith(p));
}

/** Os recibos de um trimestre de um ano civil. */
export function recibosDoTrimestre(recibos: Recibo[], ano: number, trimestre: number): Recibo[] {
  return recibos.filter((r) => anoDoRecibo(r) === ano && trimestreDoRecibo(r) === trimestre);
}

/** Faturação bruta de um ano civil. */
export function faturadoNoAno(recibos: Recibo[], ano: number): number {
  return recibosDoAno(recibos, ano).reduce((s, r) => s + r.valor, 0);
}

/** Os anos civis com recibos, do mais recente para o mais antigo. */
export function anosComRecibos(recibos: Recibo[]): number[] {
  return [...new Set(recibos.map(anoDoRecibo))].filter(Number.isFinite).sort((a, b) => b - a);
}

// ─── Conversão para o motor de cálculo ──────────────────────────────────

export interface OpcoesCalcRecibo {
  isencaoSSPrimeiroAno?: boolean;
  acumulaEmprego?: boolean;
  irsJovemAno?: number;
}

/** Converte um recibo guardado no input do motor de cálculo. */
export function reciboParaInput(r: Recibo, opcoes?: OpcoesCalcRecibo): CalcInput {
  const ativ = r.atividade ? ATIVIDADES.find((a) => a.label === r.atividade) : undefined;
  const ef = ativ ? efeitoFiscal(ativ) : undefined;
  return {
    bruto: r.valor,
    tipo: r.tipo,
    regiao: r.regiao,
    regimeIVA: r.regimeIVA,
    baseSS: ef?.baseSS ?? r.baseSS,
    dispensaRetencao: r.dispensaRetencao,
    isencaoSSPrimeiroAno: opcoes?.isencaoSSPrimeiroAno ?? false,
    acumulaEmprego: opcoes?.acumulaEmprego ?? false,
    irsJovemAno: opcoes?.irsJovemAno,
    retencaoOverride: ef?.retencao,
  };
}

/** Resultado bruto do motor de tesouraria. Camada interna — preferir `resultadoDoRecibo`. */
export function calcularRecibo(r: Recibo, opcoes?: OpcoesCalcRecibo): CalcResult {
  return calcular(reciboParaInput(r, opcoes));
}

// ─── O contrato (RC-P0-02) ──────────────────────────────────────────────

/** De onde veio o IRS anual estimado deste recibo. */
export type OrigemIRS = "snapshot" | "indisponivel";

/**
 * O resultado de UM recibo, com cada grandeza no seu próprio campo.
 *
 * A separação é o ponto: `retencaoEfetiva` é o que o cliente retém e entrega
 * por conta (Art. 101.º-B); `irsEstimado` é a fatia do apuramento anual
 * imputada a este recibo — só existe se o simulador a gravou. Somar um pelo
 * outro era a origem de o painel e o CSV discordarem.
 */
export interface ResultadoRecibo {
  /** Ano civil da operação. Nunca inferido do relógio. */
  anoFiscal: number;
  metodologiaVersion: string;

  bruto: number;

  /** Retenção na fonte efetivamente aplicada (0 se dispensada). Sempre conhecida. */
  retencaoEfetiva: number;
  /** Fatia do IRS anual estimado imputada a este recibo. `null` sem instantâneo. */
  irsEstimado: number | null;
  origemIRS: OrigemIRS;

  segurancaSocialEstimada: number;

  /** IVA liquidado ao cliente. */
  ivaCobrado: number;
  /**
   * IVA a entregar ao Estado = cobrado − dedutível − regularizações.
   * `null` enquanto o produto não recolher despesas: sem elas o apuramento
   * não é conhecido e chamar-lhe "a entregar" seria afirmar o que não se sabe
   * (RC-P1-08).
   */
  ivaAEntregar: number | null;

  /** Tesouraria: bruto − retenção efetiva − SS estimada. A definição canónica. */
  liquido: number;
  /** Líquido depois do IRS anual estimado. `null` sem instantâneo. */
  liquidoAposIRSEstimado: number | null;
  /** O que entra na conta: bruto + IVA − retenção efetiva. */
  entradaConta: number;

  taxaRetencao: number;
  taxaIVA: number;
  avisos: string[];
}

/**
 * O resultado de um recibo. Ponto de entrada único de todas as superfícies.
 *
 * `retencaoEfetiva`, `ivaCobrado` e as taxas vêm sempre do motor — são
 * deterministas e não dependem de instantâneos, por isso não podem divergir
 * entre páginas. `irsEstimado` e a SS honram o instantâneo do simulador
 * quando existe (é apuramento anual, que o recibo isolado não reproduz).
 */
export function resultadoDoRecibo(r: Recibo, opcoes?: OpcoesCalcRecibo): ResultadoRecibo {
  const c = calcularRecibo(r, opcoes);
  const snap = r._computed;

  const segurancaSocialEstimada = snap ? snap.segSocial : c.segSocial;
  const irsEstimado = snap ? snap.irsEstimado : null;

  return {
    anoFiscal: anoDoRecibo(r),
    metodologiaVersion: METODOLOGIA_VERSION,
    bruto: c.bruto,
    retencaoEfetiva: c.retencaoIRS,
    irsEstimado,
    origemIRS: snap ? "snapshot" : "indisponivel",
    segurancaSocialEstimada,
    ivaCobrado: c.iva,
    ivaAEntregar: null,
    liquido: c.bruto - c.retencaoIRS - segurancaSocialEstimada,
    liquidoAposIRSEstimado: irsEstimado === null ? null : c.bruto - irsEstimado - segurancaSocialEstimada,
    entradaConta: c.bruto + c.iva - c.retencaoIRS,
    taxaRetencao: c.taxaRetencao,
    taxaIVA: c.taxaIVA,
    avisos: c.avisos,
  };
}

// ─── Resumos agregados ──────────────────────────────────────────────────

export interface ResumoRecibos {
  /** Ano civil do resumo; `null` só numa vista histórica explicitamente pedida. */
  anoFiscal: number | null;
  metodologiaVersion: string;
  total: number;
  bruto: number;
  ivaCobrado: number;
  /** `null` enquanto não houver IVA dedutível registado. */
  ivaAEntregar: number | null;
  retencaoEfetiva: number;
  /** Soma do IRS anual estimado. `null` se nenhum recibo tiver instantâneo. */
  irsEstimado: number | null;
  /** Quantos recibos do conjunto não têm instantâneo de IRS anual. */
  recibosSemIRSEstimado: number;
  segurancaSocialEstimada: number;
  liquido: number;
  liquidoAposIRSEstimado: number | null;
}

function resumoVazio(anoFiscal: number | null): ResumoRecibos {
  return {
    anoFiscal,
    metodologiaVersion: METODOLOGIA_VERSION,
    total: 0,
    bruto: 0,
    ivaCobrado: 0,
    ivaAEntregar: null,
    retencaoEfetiva: 0,
    irsEstimado: null,
    recibosSemIRSEstimado: 0,
    segurancaSocialEstimada: 0,
    liquido: 0,
    liquidoAposIRSEstimado: null,
  };
}

/**
 * Agrega uma lista já filtrada. `anoFiscal` descreve o escopo do conjunto:
 * passar `null` é declarar explicitamente que a vista é histórica.
 */
export function resumirRecibos(
  recibos: Recibo[],
  anoFiscal: number | null,
  opcoes?: OpcoesCalcRecibo,
): ResumoRecibos {
  return recibos.reduce<ResumoRecibos>((acc, r) => {
    const x = resultadoDoRecibo(r, opcoes);
    const temIRS = x.irsEstimado !== null;
    return {
      anoFiscal: acc.anoFiscal,
      metodologiaVersion: METODOLOGIA_VERSION,
      total: acc.total + 1,
      bruto: acc.bruto + x.bruto,
      ivaCobrado: acc.ivaCobrado + x.ivaCobrado,
      ivaAEntregar: null,
      retencaoEfetiva: acc.retencaoEfetiva + x.retencaoEfetiva,
      irsEstimado: temIRS ? (acc.irsEstimado ?? 0) + x.irsEstimado! : acc.irsEstimado,
      recibosSemIRSEstimado: acc.recibosSemIRSEstimado + (temIRS ? 0 : 1),
      segurancaSocialEstimada: acc.segurancaSocialEstimada + x.segurancaSocialEstimada,
      liquido: acc.liquido + x.liquido,
      liquidoAposIRSEstimado:
        x.liquidoAposIRSEstimado === null
          ? acc.liquidoAposIRSEstimado
          : (acc.liquidoAposIRSEstimado ?? 0) + x.liquidoAposIRSEstimado,
    };
  }, resumoVazio(anoFiscal));
}

/** Resumo de um ano civil. A forma correta de responder a "quanto este ano?". */
export function resumoDoAno(recibos: Recibo[], ano: number, opcoes?: OpcoesCalcRecibo): ResumoRecibos {
  return resumirRecibos(recibosDoAno(recibos, ano), ano, opcoes);
}

/** Resumo de um mês civil (escopado ao ano desse mês). */
export function resumoDoMes(
  recibos: Recibo[],
  ref: Date = new Date(),
  opcoes?: OpcoesCalcRecibo,
): ResumoRecibos {
  return resumirRecibos(recibosDoMes(recibos, ref), ref.getFullYear(), opcoes);
}

/** Resumo de um trimestre de um ano civil. */
export function resumoDoTrimestre(
  recibos: Recibo[],
  ano: number,
  trimestre: number,
  opcoes?: OpcoesCalcRecibo,
): ResumoRecibos {
  return resumirRecibos(recibosDoTrimestre(recibos, ano, trimestre), ano, opcoes);
}
