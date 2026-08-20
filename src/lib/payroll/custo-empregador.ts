// ═══════════════════════════════════════════════════════════════════════
//  O CUSTO DE UM POSTO DE TRABALHO — três dinheiros, não um
//  ---------------------------------------------------------------------
//  §25-28 do relatório. O estúdio calculava isto:
//
//      salário bruto × n.º de prestações × (1 + TSU) ÷ 12
//
//  e escrevia «Pessoal: X €/mês, já com encargos». O número não estava
//  errado no que fazia — estava incompleto no que dizia, e não respondia
//  a nenhuma das perguntas que se fazem antes de contratar alguém:
//
//    · quanto é que a pessoa recebe ao fim do mês?
//    · quanto é contribuição e quanto é imposto?
//    · e a refeição, o seguro, a medicina do trabalho, a formação?
//    · e se ela entrar em julho?
//
//  ── A REGRA DO §26 ─────────────────────────────────────────────────
//  «Nenhuma fórmula de payroll nova deve viver em `lib/negocio`.»
//
//  Este módulo vive em `lib/payroll` e não calcula NADA de novo: chama
//  `calcularReciboMensal()`, que já sabe retenção de 2026, Segurança
//  Social, subsídio de refeição isento e tributado, IRS Jovem, subsídios
//  de férias e Natal com retenção autónoma, e situação familiar. Um
//  segundo motor de salários seria a segunda fonte de verdade que
//  `fiscal-data.ts` existe para impedir.
//
//  ── OS TRÊS DINHEIROS (§28) ────────────────────────────────────────
//  · EMPRESA PAGA        — o custo económico do posto;
//  · TRABALHADOR RECEBE  — o líquido;
//  · ESTADO E SEG. SOCIAL — retenção e contribuições.
//
//  E não se chama «impostos» ao conjunto: a Segurança Social é uma
//  contribuição com contrapartida, o seguro de acidentes vai para uma
//  seguradora e a medicina do trabalho é um custo do empregador. Somá-los
//  numa palavra só é a maneira mais rápida de os tornar todos
//  incompreensíveis.
//
//  ── O QUE NÃO SE INVENTA ───────────────────────────────────────────
//  Estado civil e dependentes de alguém que ainda não foi contratado
//  (§29). Sem perfil declarado, o líquido é `null` — e diz-se «ainda não
//  estimado», em vez de mostrar o líquido de uma pessoa solteira sem
//  filhos como se fosse o daquela pessoa.
// ═══════════════════════════════════════════════════════════════════════

import {
  calcularReciboMensal,
  type ReciboMensalResult,
  type SituacaoRetencao,
} from "@/lib/fiscal-dependente";
import { SS_DEPENDENTE } from "@/lib/fiscal-data";

// ─── Entrada ───────────────────────────────────────────────────────────

/**
 * Como os subsídios de férias e de Natal são pagos.
 *
 * §30: o seletor «12 ou 14 meses por ano» perguntava à pessoa se o
 * trabalhador «tem direito» a subsídios — que não é uma escolha do
 * empregador, é lei. O que É uma escolha é o CALENDÁRIO do pagamento.
 */
export type PagamentoSubsidios =
  /** Pagos por inteiro, no mês próprio. É o caso corrente. */
  | "normal"
  /** Em duodécimos, diluídos pelos doze meses. */
  | "duodecimos"
  /**
   * Migrado de `meses: 12`, onde o valor antigo não guardava calendário
   * nenhum (§71). Mantém a conta que a pessoa tinha — mudar-lhe o
   * resultado por baixo seria pior — e levanta um pressuposto para ela
   * confirmar.
   */
  | "legado";

/** Um custo que pode ser conhecido, estimado ou ainda por orçamentar. */
export interface CustoOpcional {
  /** Euros por ano. `undefined` = ainda não se sabe. */
  anual?: number;
}

export interface RefeicaoPosto {
  valorDia: number;
  diasMes: number;
  /** Cartão/vale tem limite isento mais alto do que numerário. */
  cartao?: boolean;
}

/** A situação pessoal, quando ela é conhecida. Nunca se inventa (§29). */
export interface PerfilPessoalPosto extends SituacaoRetencao {
  /** Ano de benefício do IRS Jovem (1 a 10). */
  irsJovemAno?: number;
}

export interface EntradaCustoPosto {
  salarioBaseMensal: number;
  pagamentoSubsidios?: PagamentoSubsidios;
  /**
   * Mês do horizonte em que a pessoa entra. 0 = desde o início.
   * §38: existe no contrato antigo e não fechava o ciclo — o custo anual
   * ignorava-o, e o primeiro ano de um negócio saía errado.
   */
  inicioMes?: number;
  refeicao?: RefeicaoPosto;
  /** §35 — prémio real do seguro de acidentes de trabalho, se conhecido. */
  seguroAT?: CustoOpcional;
  /** §36 — saúde e segurança no trabalho / medicina do trabalho. */
  sst?: CustoOpcional;
  /** §37 — formação contínua (Art. 131.º CT: 40 h anuais mínimas). */
  formacao?: CustoOpcional;
  /** Fardas, equipamento, deslocações fixas — o que mais existir. */
  outrosAnual?: number;
  /** Sem isto, o líquido não é estimado. Ver §29. */
  perfil?: PerfilPessoalPosto;
}

// ─── Saída ─────────────────────────────────────────────────────────────

export interface ResultadoCustoPosto {
  /** O que sai da empresa. */
  empresa: {
    remuneracao: number;
    subsidioFerias: number;
    subsidioNatal: number;
    ssEntidade: number;
    refeicao: number;
    seguroAT: number;
    sst: number;
    formacao: number;
    outros: number;
    custoAnual: number;
    custoMedioMensal: number;
  };
  /** O que a pessoa recebe. `null` quando a situação pessoal não é dada. */
  trabalhador: {
    bruto: number;
    ss: number;
    irsRetido: number | null;
    liquido: number | null;
    refeicao: number;
  };
  /** Para onde vai o que não fica com nenhum dos dois. */
  publico: {
    segurancaSocialTrabalhador: number;
    segurancaSocialEmpresa: number;
    irsRetido: number | null;
  };
  /** O que aqui é ESTIMATIVA, e não um valor declarado (§35, §42). */
  estimado: {
    seguroAT: boolean;
    sst: boolean;
    formacao: boolean;
    /** `true` quando o líquido não pôde ser calculado. */
    liquidoPorEstimar: boolean;
    /** `true` no modo legado: calendário de subsídios por confirmar (§71). */
    calendarioPorConfirmar: boolean;
  };
  /**
   * O primeiro ano, com a data de entrada respeitada (§38).
   *
   * Separado do estado estabilizado de propósito: o break-even pode usar
   * o custo mensal estabilizado, mas a caixa e o primeiro ano têm de usar
   * o calendário real. Confundi-los faz um negócio que contrata em julho
   * parecer que paga doze meses de salários no primeiro ano.
   */
  primeiroAno: {
    mesesTrabalhados: number;
    custoAnual: number;
    custoMedioMensal: number;
  };
}

// ─── O cálculo ─────────────────────────────────────────────────────────

const cent = (n: number): number => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const naoNeg = (n: number | undefined): number =>
  Number.isFinite(n) && (n as number) > 0 ? (n as number) : 0;

/**
 * O custo completo de um posto de trabalho.
 *
 * Chama o motor de vencimento para o mês corrente e, quando os subsídios
 * são pagos por inteiro, para cada um dos meses de subsídio — que têm
 * retenção autónoma (Art. 99.º-C CIRS) e não a taxa do mês. Somar
 * `14 × retenção do mês` seria simples e estaria errado.
 */
export function custoDoPosto(entrada: EntradaCustoPosto): ResultadoCustoPosto {
  const base = naoNeg(entrada.salarioBaseMensal);
  const calendario = entrada.pagamentoSubsidios ?? "normal";
  const temPerfil = entrada.perfil !== undefined;
  const perfil: PerfilPessoalPosto = entrada.perfil ?? {};

  const refeicao = entrada.refeicao;
  const refeicaoDia = naoNeg(refeicao?.valorDia);
  const refeicaoDias = naoNeg(refeicao?.diasMes);

  // ── O mês corrente ────────────────────────────────────────────────
  //  Em duodécimos, os subsídios entram aqui, um doze avos de cada. O
  //  `DireitoTotal` diz ao motor qual é o direito ANUAL, para ele poder
  //  calcular a retenção autónoma sobre o valor certo em vez de a
  //  calcular sobre um doze avos.
  const duodecimos = calendario === "duodecimos";
  const mes = calcularReciboMensal({
    ...perfil,
    salarioBruto: base,
    subsidioRefeicaoDia: refeicaoDia,
    diasSubsidio: refeicaoDias,
    subsidioRefeicaoCartao: refeicao?.cartao,
    irsJovemAno: perfil.irsJovemAno,
    subsidioFerias: duodecimos ? base / 12 : 0,
    subsidioFeriasDireitoTotal: duodecimos ? base : 0,
    subsidioNatal: duodecimos ? base / 12 : 0,
    subsidioNatalDireitoTotal: duodecimos ? base : 0,
  });

  // ── Os meses de subsídio, quando são pagos por inteiro ────────────
  const pagaSubsidiosAParte = calendario === "normal";
  const mesFerias = pagaSubsidiosAParte ? mesDeSubsidio(base, perfil, "ferias") : null;
  const mesNatal = pagaSubsidiosAParte ? mesDeSubsidio(base, perfil, "natal") : null;

  // ── Os doze meses, mais os subsídios ──────────────────────────────
  const remuneracaoAnual = cent(base * 12);
  const subsidioFeriasAnual = calendario === "legado" ? 0 : cent(base);
  const subsidioNatalAnual = calendario === "legado" ? 0 : cent(base);

  // A base contributiva anual sai do motor, não de uma multiplicação
  // nossa: é ela que decide a TSU, e inclui a parte tributada do
  // subsídio de refeição que a empresa paga acima do limite isento.
  const baseSSAnual = cent(
    mes.baseSS * 12 + (mesFerias?.baseSS ?? 0) + (mesNatal?.baseSS ?? 0),
  );
  const ssEntidadeAnual = cent(baseSSAnual * SS_DEPENDENTE.entidade.value);

  const refeicaoAnual = cent(mes.subsidioRefeicaoTotal * 12);

  // ── Os custos que podem ser conhecidos ou estimados ───────────────
  const seguroConhecido = entrada.seguroAT?.anual !== undefined;
  const seguroAT = seguroConhecido
    ? cent(naoNeg(entrada.seguroAT?.anual))
    : // §35: estimativa de planeamento, sempre rotulada como tal. O prémio
      // real depende da atividade e da seguradora, e apresentá-lo como
      // exato seria inventar um contrato que ninguém assinou.
      cent(mes.seguroAcidentesEstimado * 12 + (mesFerias?.seguroAcidentesEstimado ?? 0) + (mesNatal?.seguroAcidentesEstimado ?? 0));

  const sstConhecido = entrada.sst?.anual !== undefined;
  // §36: sem orçamento, o custo é ZERO na conta e um PRESSUPOSTO no
  // livro. Um valor inventado seria pior do que a omissão declarada.
  const sst = sstConhecido ? cent(naoNeg(entrada.sst?.anual)) : 0;

  const formacaoConhecida = entrada.formacao?.anual !== undefined;
  const formacao = formacaoConhecida ? cent(naoNeg(entrada.formacao?.anual)) : 0;

  const outros = cent(naoNeg(entrada.outrosAnual));

  const custoAnual = cent(
    remuneracaoAnual +
      subsidioFeriasAnual +
      subsidioNatalAnual +
      ssEntidadeAnual +
      refeicaoAnual +
      seguroAT +
      sst +
      formacao +
      outros,
  );

  // ── O que a pessoa recebe ─────────────────────────────────────────
  //  Sem perfil, o IRS não é estimado — mas a Segurança Social é, porque
  //  a taxa do trabalhador não depende da situação familiar.
  const ssTrabalhadorAnual = cent(
    mes.ssTrabalhador * 12 + (mesFerias?.ssTrabalhador ?? 0) + (mesNatal?.ssTrabalhador ?? 0),
  );
  const irsAnual = temPerfil
    ? cent(mes.irsTotal * 12 + (mesFerias?.irsTotal ?? 0) + (mesNatal?.irsTotal ?? 0))
    : null;
  const brutoAnual = cent(
    mes.brutoTotal * 12 + (mesFerias?.brutoTotal ?? 0) + (mesNatal?.brutoTotal ?? 0),
  );
  const liquidoAnual = irsAnual === null ? null : cent(brutoAnual - ssTrabalhadorAnual - irsAnual);

  return {
    empresa: {
      remuneracao: remuneracaoAnual,
      subsidioFerias: subsidioFeriasAnual,
      subsidioNatal: subsidioNatalAnual,
      ssEntidade: ssEntidadeAnual,
      refeicao: refeicaoAnual,
      seguroAT,
      sst,
      formacao,
      outros,
      custoAnual,
      custoMedioMensal: cent(custoAnual / 12),
    },
    trabalhador: {
      bruto: brutoAnual,
      ss: ssTrabalhadorAnual,
      irsRetido: irsAnual,
      liquido: liquidoAnual,
      refeicao: refeicaoAnual,
    },
    publico: {
      segurancaSocialTrabalhador: ssTrabalhadorAnual,
      segurancaSocialEmpresa: ssEntidadeAnual,
      irsRetido: irsAnual,
    },
    estimado: {
      seguroAT: !seguroConhecido,
      sst: !sstConhecido,
      formacao: !formacaoConhecida,
      liquidoPorEstimar: !temPerfil,
      calendarioPorConfirmar: calendario === "legado",
    },
    primeiroAno: primeiroAnoDe(entrada, {
      remuneracaoAnual,
      subsidioFeriasAnual,
      subsidioNatalAnual,
      ssEntidadeAnual,
      refeicaoAnual,
      seguroAT,
      sst,
      formacao,
      outros,
    }),
  };
}

/**
 * Um mês em que só se paga um subsídio.
 *
 * Salário base a zero e o subsídio por inteiro: é assim que o motor
 * aplica a retenção AUTÓNOMA do Art. 99.º-C CIRS, que é diferente da
 * taxa do mês corrente.
 */
function mesDeSubsidio(
  base: number,
  perfil: PerfilPessoalPosto,
  qual: "ferias" | "natal",
): ReciboMensalResult {
  return calcularReciboMensal({
    ...perfil,
    salarioBruto: 0,
    irsJovemAno: perfil.irsJovemAno,
    subsidioFerias: qual === "ferias" ? base : 0,
    subsidioFeriasDireitoTotal: qual === "ferias" ? base : 0,
    subsidioNatal: qual === "natal" ? base : 0,
    subsidioNatalDireitoTotal: qual === "natal" ? base : 0,
  });
}

interface ParcelasAnuais {
  remuneracaoAnual: number;
  subsidioFeriasAnual: number;
  subsidioNatalAnual: number;
  ssEntidadeAnual: number;
  refeicaoAnual: number;
  seguroAT: number;
  sst: number;
  formacao: number;
  outros: number;
}

/**
 * O primeiro ano, com a entrada respeitada (§38).
 *
 * Só contém os meses em que a pessoa trabalha e as prestações
 * proporcionais aplicáveis: quem entra em julho tem direito a metade dos
 * subsídios desse ano, não a nenhum nem a todos.
 *
 * Os custos anuais fixos (seguro, SST, formação) também são
 * proporcionais — um seguro contratado em julho cobre meio ano.
 */
function primeiroAnoDe(
  entrada: EntradaCustoPosto,
  p: ParcelasAnuais,
): ResultadoCustoPosto["primeiroAno"] {
  const inicio = Math.max(0, Math.min(12, Math.floor(naoNeg(entrada.inicioMes))));
  const meses = 12 - inicio;

  if (meses >= 12) {
    const total = cent(
      p.remuneracaoAnual +
        p.subsidioFeriasAnual +
        p.subsidioNatalAnual +
        p.ssEntidadeAnual +
        p.refeicaoAnual +
        p.seguroAT +
        p.sst +
        p.formacao +
        p.outros,
    );
    return { mesesTrabalhados: 12, custoAnual: total, custoMedioMensal: cent(total / 12) };
  }

  if (meses <= 0) {
    return { mesesTrabalhados: 0, custoAnual: 0, custoMedioMensal: 0 };
  }

  const fracao = meses / 12;
  const custoAnual = cent(
    (p.remuneracaoAnual +
      p.subsidioFeriasAnual +
      p.subsidioNatalAnual +
      p.ssEntidadeAnual +
      p.refeicaoAnual +
      p.seguroAT +
      p.sst +
      p.formacao +
      p.outros) *
      fracao,
  );

  return {
    mesesTrabalhados: meses,
    custoAnual,
    // Repartido pelos DOZE meses do ano, não pelos meses trabalhados: é o
    // impacto no ano, que é a pergunta a que o primeiro ano responde.
    custoMedioMensal: cent(custoAnual / 12),
  };
}

// ─── Invariantes, em código ────────────────────────────────────────────

/**
 * As identidades do §102, verificáveis a partir de qualquer resultado.
 *
 * Estão aqui, e não só nos testes, porque são a definição do que estes
 * números significam:
 *
 *  · a Segurança Social do TRABALHADOR sai do bruto dele — não acrescenta
 *    nada ao custo da empresa;
 *  · a Segurança Social da EMPRESA acrescenta;
 *  · o IRS retido é dinheiro do trabalhador entregue ao Estado pela
 *    empresa — não é custo do empregador;
 *  · o líquido nunca pode exceder o que a pessoa recebe.
 */
export function invariantesDoPosto(r: ResultadoCustoPosto): boolean {
  const e = r.empresa;
  const t = r.trabalhador;

  const somaDaEmpresa = cent(
    e.remuneracao + e.subsidioFerias + e.subsidioNatal + e.ssEntidade + e.refeicao + e.seguroAT + e.sst + e.formacao + e.outros,
  );
  if (Math.abs(somaDaEmpresa - e.custoAnual) > 0.05) return false;

  // O IRS do trabalhador não entra em nenhuma parcela do custo da empresa.
  if (t.irsRetido !== null && t.irsRetido > 0 && e.custoAnual < t.bruto) return false;

  // O líquido nunca excede o bruto recebido.
  if (t.liquido !== null && t.liquido > t.bruto + 0.01) return false;

  return true;
}
