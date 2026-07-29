// ─────────────────────────────────────────────────────────────────────
//  Motor laboral — Categoria A além do recibo mensal
//  ---------------------------------------------------------------------
//  O produto pergunta «o teu salário está certo?» mas só sabia responder
//  sobre o mês corrente. Faltavam as perguntas que as pessoas fazem quando
//  as coisas correm mal ou mudam: quanto recebo na baixa, na licença
//  parental, no desemprego, quando o contrato acaba — e quanto me podem
//  penhorar.
//
//  Como no resto do projeto: sem números mágicos. Tudo vem de
//  `fiscal-data.ts`, com base legal e fonte.
//
//  ESTIMATIVAS. Prestações sociais e direito laboral dependem de carreira
//  contributiva, IRCT aplicável e do caso concreto — a interface tem de o
//  dizer, e os guias que as explicam ficam em `status: "draft"` com revisor
//  por atribuir até revisão humana.
// ─────────────────────────────────────────────────────────────────────

import {
  COMPENSACAO_CESSACAO,
  FERIAS,
  HORARIO_SEMANAL_COMPLETO,
  IAS,
  LICENCA_PARENTAL,
  PENHORA,
  SMN,
  SUBSIDIO_DESEMPREGO,
  SUBSIDIO_DOENCA,
  SUBSIDIO_REFEICAO,
  TRABALHO_NOTURNO,
} from "./fiscal-data";

const cent = (n: number) => Math.round(n * 100) / 100;
const positivo = (n: number | undefined) => Math.max(0, n ?? 0);

// ─────────────────────────────────────────────────────────────────────
//  Retribuição horária (Art. 271.º CT) — base de quase tudo o que segue
// ─────────────────────────────────────────────────────────────────────

/** `(retribuição mensal × 12) ÷ (52 × horas semanais)` (Art. 271.º CT). */
export function retribuicaoHoraria(
  retribuicaoMensal: number,
  horasSemanais: number = HORARIO_SEMANAL_COMPLETO.value
): number {
  const horas = Math.max(1, horasSemanais);
  return cent((positivo(retribuicaoMensal) * 12) / (52 * horas));
}

// ─────────────────────────────────────────────────────────────────────
//  1.13 a) Trabalho noturno — o acréscimo CALCULA-SE, não se escreve
// ─────────────────────────────────────────────────────────────────────

export interface TrabalhoNoturnoInput {
  /** Retribuição base mensal. */
  retribuicaoMensal: number;
  /** Horas de trabalho prestadas em período noturno no mês. */
  horasNoturnas: number;
  horasSemanais?: number;
  /** Acréscimo do IRCT, se for mais favorável do que os 25% legais. */
  acrescimoIRCT?: number;
}

export interface TrabalhoNoturnoResult {
  retribuicaoHoraria: number;
  /** Acréscimo aplicado (0,25 legal, ou o do IRCT se superior). */
  acrescimo: number;
  /** Valor do acréscimo — é isto que acresce ao recibo. */
  valorAcrescimo: number;
  /** Janela legal do período noturno, para a UI explicar o que conta. */
  periodo: { inicio: number; fim: number };
}

/**
 * Acréscimo do trabalho noturno (Art. 266.º, n.º 1 CT): 25% sobre a
 * retribuição da hora equivalente prestada durante o dia.
 *
 * O construtor de recibo tinha uma rubrica «trabalho noturno» que pedia o
 * valor JÁ APURADO («insere o acréscimo já apurado pelo contrato ou IRCT»).
 * Num produto que promete verificar o salário, não poder conferir o
 * acréscimo é uma lacuna no centro da proposta, não na periferia.
 */
export function calcularTrabalhoNoturno(input: TrabalhoNoturnoInput): TrabalhoNoturnoResult {
  const hora = retribuicaoHoraria(input.retribuicaoMensal, input.horasSemanais);
  // O IRCT pode melhorar o mínimo legal, nunca reduzi-lo.
  const acrescimo = Math.max(TRABALHO_NOTURNO.acrescimo.value, positivo(input.acrescimoIRCT));
  const valorAcrescimo = cent(hora * positivo(input.horasNoturnas) * acrescimo);
  return {
    retribuicaoHoraria: hora,
    acrescimo,
    valorAcrescimo,
    periodo: { inicio: TRABALHO_NOTURNO.horaInicio.value, fim: TRABALHO_NOTURNO.horaFim.value },
  };
}

// ─────────────────────────────────────────────────────────────────────
//  1.13 b) Penhora de vencimento (Art. 738.º CPC)
// ─────────────────────────────────────────────────────────────────────

export interface PenhoraInput {
  /**
   * Parte LÍQUIDA do rendimento — só com os descontos legalmente
   * obrigatórios (Art. 738.º, n.º 2): Segurança Social e retenção de IRS.
   */
  liquidoMensal: number;
  /** O executado tem outro rendimento além deste? Muda o piso protegido. */
  temOutroRendimento?: boolean;
  /**
   * Execução por dívida de alimentos: o regime dos dois terços não se
   * aplica (Art. 738.º, n.º 4) e a proteção reduz-se ao equivalente à
   * pensão social do regime não contributivo.
   */
  porAlimentos?: boolean;
  /** Pensão social do regime não contributivo, quando `porAlimentos`. */
  pensaoSocial?: number;
}

export interface PenhoraResult {
  /** Parte que a lei protege (impenhorável). */
  impenhoravel: number;
  /** Parte que pode ser penhorada. */
  penhoravel: number;
  /** Teto legal da impenhorabilidade (3 × SMN). */
  teto: number;
  /** Piso legal (1 × SMN), quando não há outro rendimento. */
  piso: number;
  /** Qual das regras determinou o resultado — para a UI o poder explicar. */
  regra: "dois-tercos" | "teto" | "piso" | "alimentos";
}

/**
 * Limites da penhora de vencimentos e pensões (Art. 738.º CPC).
 *
 * Implementado no `ReciboCerto-Fiscal-Engine` (`garnishment.ts`) e
 * inalcançável a partir da aplicação, porque o adaptador que o ligaria não
 * era importado por ninguém. É uma funcionalidade de alto valor e alta
 * procura que já estava escrita — aqui fica ligada à app, com as regras
 * lidas de `fiscal-data.ts`.
 */
export function calcularPenhora(input: PenhoraInput): PenhoraResult {
  const liquido = positivo(input.liquidoMensal);
  const teto = cent(PENHORA.tetoSalariosMinimos.value * SMN.value);
  const piso = cent(PENHORA.pisoSalariosMinimos.value * SMN.value);

  if (liquido <= 0) {
    return { impenhoravel: 0, penhoravel: 0, teto, piso, regra: "dois-tercos" };
  }

  // Alimentos: fora do regime geral (Art. 738.º, n.º 4).
  if (input.porAlimentos) {
    const protegido = Math.min(liquido, positivo(input.pensaoSocial));
    return {
      impenhoravel: cent(protegido),
      penhoravel: cent(liquido - protegido),
      teto,
      piso,
      regra: "alimentos",
    };
  }

  let impenhoravel = liquido * PENHORA.fracaoImpenhoravel.value;
  let regra: PenhoraResult["regra"] = "dois-tercos";

  // Teto: a impenhorabilidade nunca protege mais do que três salários mínimos.
  if (impenhoravel > teto) {
    impenhoravel = teto;
    regra = "teto";
  }
  // Piso: não tendo outro rendimento, protege-se pelo menos um salário mínimo
  // — mas nunca mais do que o próprio rendimento.
  if (!input.temOutroRendimento && impenhoravel < piso) {
    impenhoravel = Math.min(liquido, piso);
    regra = "piso";
  }

  return {
    impenhoravel: cent(impenhoravel),
    penhoravel: cent(Math.max(0, liquido - impenhoravel)),
    teto,
    piso,
    regra,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  1.13 c) Baixa médica e licença parental
// ─────────────────────────────────────────────────────────────────────

export interface SubsidioDoencaInput {
  /**
   * Remuneração de referência = total das remunerações dos primeiros seis
   * meses dos últimos oito, a dividir por 180.
   */
  remuneracaoReferenciaMensal: number;
  /** Duração da incapacidade, em dias. */
  diasIncapacidade: number;
  /** Internamento hospitalar, tuberculose ou doença profissional: sem espera. */
  semPeriodoEspera?: boolean;
  /** Agregado com três ou mais descendentes: majoração de 5 p.p. */
  tresOuMaisDescendentes?: boolean;
}

export interface SubsidioDoencaResult {
  /** Dias do período de espera que não são subsidiados. */
  diasEspera: number;
  diasSubsidiados: number;
  /** Percentagem aplicada à remuneração de referência. */
  taxa: number;
  /** True se a majoração de 5 p.p. foi aplicada. */
  majorado: boolean;
  remuneracaoReferenciaDiaria: number;
  /** Total estimado do subsídio para o período. */
  total: number;
}

/**
 * Subsídio de doença (DL 28/2004). Os três primeiros dias não são
 * subsidiados para trabalhadores por conta de outrem, e a percentagem sobe
 * com a duração: 55% até 30 dias, 60% até 90, 70% até 365, 75% acima.
 */
export function calcularSubsidioDoenca(input: SubsidioDoencaInput): SubsidioDoencaResult {
  const referenciaMes = positivo(input.remuneracaoReferenciaMensal);
  const referenciaDia = cent(referenciaMes / 30);
  const dias = Math.max(0, Math.floor(input.diasIncapacidade));

  const diasEspera = input.semPeriodoEspera ? 0 : Math.min(dias, SUBSIDIO_DOENCA.periodoEsperaDias.value);
  const diasSubsidiados = Math.max(0, dias - diasEspera);

  const escalao =
    SUBSIDIO_DOENCA.escaloes.value.find((e) => dias <= e.ateDias) ??
    SUBSIDIO_DOENCA.escaloes.value[SUBSIDIO_DOENCA.escaloes.value.length - 1];

  // Majoração de 5 p.p. — só sobre os escalões de 55% e 60%.
  const elegivelMajoracao =
    escalao.taxa <= 0.6 + 1e-9 &&
    (referenciaMes <= SUBSIDIO_DOENCA.majoracaoRemuneracaoLimite.value || !!input.tresOuMaisDescendentes);
  const taxa = elegivelMajoracao ? escalao.taxa + SUBSIDIO_DOENCA.majoracao.value : escalao.taxa;

  return {
    diasEspera,
    diasSubsidiados,
    taxa,
    majorado: elegivelMajoracao,
    remuneracaoReferenciaDiaria: referenciaDia,
    total: cent(referenciaDia * diasSubsidiados * taxa),
  };
}

export interface LicencaParentalOpcao {
  dias: number;
  taxa: number;
  partilhada: boolean;
  /** Total estimado do subsídio parental inicial nesta modalidade. */
  total: number;
  rotulo: string;
}

/**
 * Modalidades da licença parental inicial, já valorizadas.
 *
 * A escolha faz-se no requerimento, condiciona os dois progenitores e é a
 * decisão financeira mais consequente do primeiro ano de vida de uma
 * criança — tomada, quase sempre, sem ninguém ter feito as contas.
 */
export function compararLicencaParental(remuneracaoReferenciaMensal: number): LicencaParentalOpcao[] {
  const referenciaDia = positivo(remuneracaoReferenciaMensal) / 30;
  return LICENCA_PARENTAL.modalidades.value.map((mod) => ({
    ...mod,
    total: cent(referenciaDia * mod.dias * mod.taxa),
    rotulo: mod.partilhada
      ? `${mod.dias} dias com partilha · ${Math.round(mod.taxa * 100)}%`
      : `${mod.dias} dias · ${Math.round(mod.taxa * 100)}%`,
  }));
}

/**
 * Licença exclusiva do pai: 28 dias obrigatórios mais 7 opcionais, pagos
 * SEMPRE a 100%, qualquer que seja a modalidade escolhida para a licença
 * inicial.
 */
export function licencaExclusivaPai(remuneracaoReferenciaMensal: number): {
  diasObrigatorios: number;
  diasOpcionais: number;
  taxa: number;
  total: number;
} {
  const referenciaDia = positivo(remuneracaoReferenciaMensal) / 30;
  const dias = LICENCA_PARENTAL.paiObrigatoriaDias.value + LICENCA_PARENTAL.paiOpcionaisDias.value;
  return {
    diasObrigatorios: LICENCA_PARENTAL.paiObrigatoriaDias.value,
    diasOpcionais: LICENCA_PARENTAL.paiOpcionaisDias.value,
    taxa: LICENCA_PARENTAL.paiTaxa.value,
    total: cent(referenciaDia * dias * LICENCA_PARENTAL.paiTaxa.value),
  };
}

// ─────────────────────────────────────────────────────────────────────
//  Subsídio de desemprego (DL 220/2006)
// ─────────────────────────────────────────────────────────────────────

export interface SubsidioDesempregoInput {
  /** Média das remunerações dos 12 meses anteriores aos dois que precedem o desemprego. */
  remuneracaoReferenciaMensal: number;
  /** Remunerações registadas não inferiores à RMMG (limite mínimo majorado). */
  remuneracoesAcimaSMN?: boolean;
  /** Remuneração de referência líquida de contribuições e IRS, se conhecida. */
  referenciaLiquida?: number;
}

export interface SubsidioDesempregoResult {
  /** 65% da remuneração de referência, antes dos limites. */
  montanteBase: number;
  minimo: number;
  maximo: number;
  /** Montante mensal após aplicação dos limites. */
  montanteMensal: number;
  /** Limite que ficou a decidir o valor. */
  limiteAplicado: "nenhum" | "minimo" | "maximo" | "teto-liquido";
  duracaoMinimaDias: number;
  duracaoMaximaDias: number;
}

/**
 * Subsídio de desemprego. ESTIMATIVA — a duração concreta depende da idade
 * e da carreira contributiva, e o direito depende de a cessação não ter sido
 * por iniciativa do trabalhador sem justa causa (a razão n.º 1 de
 * indeferimento).
 *
 * NOTA DE REVISÃO: a leitura do limite MÍNIMO diverge entre fontes
 * secundárias — umas dizem 1 × IAS, outras 65% do IAS. Está sinalizado em
 * `fiscal-data.ts` (`SUBSIDIO_DESEMPREGO.minimoIAS`) para confirmação na
 * revisão fiscal humana, e o guia que o explica fica em `draft`.
 */
export function calcularSubsidioDesemprego(input: SubsidioDesempregoInput): SubsidioDesempregoResult {
  const referencia = positivo(input.remuneracaoReferenciaMensal);
  const montanteBase = cent(referencia * SUBSIDIO_DESEMPREGO.taxa.value);

  const minimoIAS = input.remuneracoesAcimaSMN
    ? SUBSIDIO_DESEMPREGO.minimoMajoradoIAS.value
    : SUBSIDIO_DESEMPREGO.minimoIAS.value;
  // O mínimo nunca ultrapassa a própria remuneração de referência.
  const minimo = cent(Math.min(referencia, minimoIAS * IAS.value));
  const maximo = cent(SUBSIDIO_DESEMPREGO.maximoIAS.value * IAS.value);

  let montante = montanteBase;
  let limiteAplicado: SubsidioDesempregoResult["limiteAplicado"] = "nenhum";
  if (montante < minimo) {
    montante = minimo;
    limiteAplicado = "minimo";
  }
  if (montante > maximo) {
    montante = maximo;
    limiteAplicado = "maximo";
  }
  // Limite adicional: 75% da referência líquida, quando conhecida.
  const tetoLiquido = positivo(input.referenciaLiquida) * SUBSIDIO_DESEMPREGO.tetoReferenciaLiquida.value;
  if (tetoLiquido > 0 && montante > tetoLiquido) {
    montante = cent(tetoLiquido);
    limiteAplicado = "teto-liquido";
  }

  return {
    montanteBase,
    minimo,
    maximo,
    montanteMensal: cent(montante),
    limiteAplicado,
    duracaoMinimaDias: SUBSIDIO_DESEMPREGO.duracaoMinimaDias.value,
    duracaoMaximaDias: SUBSIDIO_DESEMPREGO.duracaoMaximaDias.value,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  1.13 d) Cessação do contrato — compensação e créditos finais
// ─────────────────────────────────────────────────────────────────────

export interface CessacaoContratoInput {
  /** Retribuição base mensal + diuturnidades. */
  retribuicaoBase: number;
  /** Diuturnidades mensais, se não incluídas acima. */
  diuturnidades?: number;
  /** Data de admissão (ISO), que determina as tranches transitórias. */
  dataAdmissao: string;
  /** Data de cessação (ISO). Default: hoje. */
  dataCessacao?: string;
  /** Dias de férias vencidas e não gozadas. */
  feriasNaoGozadasDias?: number;
  /** Meses completos trabalhados no ano da cessação (proporcionais). */
  mesesNoAnoCessacao?: number;
}

export interface CessacaoContratoResult {
  /** Base mensal considerada (retribuição base + diuturnidades), já com o teto. */
  baseMensal: number;
  /** True se o teto de 20 × RMMG limitou a base. */
  baseLimitada: boolean;
  antiguidadeAnos: number;
  /** Compensação por tranche do regime transitório. */
  tranches: { rotulo: string; anos: number; diasPorAno: number; valor: number }[];
  compensacao: number;
  /** True se o teto global (12 meses ou 240 × RMMG) limitou o total. */
  compensacaoLimitada: boolean;
  // Créditos finais que se somam à compensação
  feriasNaoGozadas: number;
  proporcionalFerias: number;
  proporcionalSubsidioFerias: number;
  proporcionalSubsidioNatal: number;
  creditosFinais: number;
  /** Compensação + créditos finais. */
  total: number;
}

const MS_ANO = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Contas finais do contrato de trabalho.
 *
 * A regra em vigor (Art. 366.º CT) são 12 dias por ano completo, mas os
 * REGIMES TRANSITÓRIOS são o essencial: quem foi admitido antes de
 * 01-11-2011 acumula tranches com contagens diferentes (um mês por ano até
 * 31-10-2012, 20 dias até 30-09-2013, 12 dias daí em diante). É a razão
 * pela qual dois colegas com a mesma antiguidade recebem valores muito
 * diferentes — e pela qual quase todas as contas feitas em casa dão errado.
 */
export function calcularCessacaoContrato(input: CessacaoContratoInput): CessacaoContratoResult {
  const baseBruta = positivo(input.retribuicaoBase) + positivo(input.diuturnidades);
  const tetoBase = COMPENSACAO_CESSACAO.tetoBaseRMMG.value * SMN.value;
  const baseLimitada = baseBruta > tetoBase;
  const baseMensal = cent(Math.min(baseBruta, tetoBase));

  const admissao = new Date(input.dataAdmissao);
  const cessacao = input.dataCessacao ? new Date(input.dataCessacao) : new Date();
  const antiguidadeAnos = Math.max(0, (cessacao.getTime() - admissao.getTime()) / MS_ANO);

  // Reparte a antiguidade pelas tranches transitórias, por data.
  const tranches: CessacaoContratoResult["tranches"] = [];
  let inicio = admissao;
  for (const t of COMPENSACAO_CESSACAO.transitorios.value) {
    const fim = t.ate ? new Date(t.ate) : cessacao;
    const fimEfetivo = fim < cessacao ? fim : cessacao;
    if (fimEfetivo <= inicio) continue;
    const anos = (fimEfetivo.getTime() - inicio.getTime()) / MS_ANO;
    // Valor da tranche = (dias por ano ÷ 30) × base × anos.
    tranches.push({
      rotulo: t.rotulo,
      anos: Math.round(anos * 100) / 100,
      diasPorAno: t.diasPorAno,
      valor: cent((t.diasPorAno / 30) * baseMensal * anos),
    });
    inicio = fimEfetivo;
    if (inicio >= cessacao) break;
  }

  const compensacaoBruta = tranches.reduce((s, t) => s + t.valor, 0);
  // Teto global: 12 meses de retribuição base, ou 240 × RMMG.
  const tetoGlobal = Math.min(
    COMPENSACAO_CESSACAO.tetoTotalMeses.value * baseMensal,
    COMPENSACAO_CESSACAO.tetoTotalRMMG.value * SMN.value
  );
  const compensacaoLimitada = compensacaoBruta > tetoGlobal;
  const compensacao = cent(Math.min(compensacaoBruta, tetoGlobal));

  // Créditos finais.
  const diaBase = baseMensal / 30;
  const feriasNaoGozadas = cent(diaBase * positivo(input.feriasNaoGozadasDias));
  const meses = Math.min(12, positivo(input.mesesNoAnoCessacao));
  const proporcionalFerias = cent((baseMensal * meses) / 12);
  const proporcionalSubsidioFerias = cent((baseMensal * meses) / 12);
  const proporcionalSubsidioNatal = cent((baseMensal * meses) / 12);
  const creditosFinais = cent(
    feriasNaoGozadas + proporcionalFerias + proporcionalSubsidioFerias + proporcionalSubsidioNatal
  );

  return {
    baseMensal,
    baseLimitada,
    antiguidadeAnos: Math.round(antiguidadeAnos * 100) / 100,
    tranches,
    compensacao,
    compensacaoLimitada,
    feriasNaoGozadas,
    proporcionalFerias,
    proporcionalSubsidioFerias,
    proporcionalSubsidioNatal,
    creditosFinais,
    total: cent(compensacao + creditosFinais),
  };
}

// ─────────────────────────────────────────────────────────────────────
//  1.13 g) Faltas — o que a falta arrasta consigo
// ─────────────────────────────────────────────────────────────────────

export interface FaltasInput {
  retribuicaoBase: number;
  horasSemanais?: number;
  /** Dias completos de falta no mês. */
  diasFalta: number;
  /** A falta é injustificada? Afeta férias e subsídios. */
  injustificada?: boolean;
  /** Valor diário do subsídio de refeição, se houver. */
  subsidioRefeicaoDia?: number;
  subsidioRefeicaoCartao?: boolean;
}

export interface FaltasResult {
  retribuicaoHoraria: number;
  horasDescontadas: number;
  /** Desconto na retribuição base. */
  descontoRetribuicao: number;
  /** Subsídio de refeição perdido nos dias de falta. */
  subsidioRefeicaoPerdido: number;
  /** Proporcional de férias e de subsídio de Natal perdido (só injustificadas). */
  proporcionalPerdido: number;
  /** Tudo somado — o impacto real da falta no recibo. */
  impactoTotal: number;
}

/**
 * Impacto de uma falta no recibo.
 *
 * O motor mensal já descontava a hora de ausência, mas parava aí: não
 * descontava o subsídio de refeição do dia (que se perde por não haver
 * trabalho prestado) nem o proporcional de férias e de Natal que a falta
 * injustificada faz perder. A pessoa via um desconto e recebia outro.
 */
export function calcularImpactoFaltas(input: FaltasInput): FaltasResult {
  const horasSemanais = Math.max(1, input.horasSemanais ?? HORARIO_SEMANAL_COMPLETO.value);
  const hora = retribuicaoHoraria(input.retribuicaoBase, horasSemanais);
  const dias = positivo(input.diasFalta);
  const horasDia = horasSemanais / 5;
  const horasDescontadas = cent(dias * horasDia);

  const descontoRetribuicao = cent(Math.min(positivo(input.retribuicaoBase), hora * horasDescontadas));

  // O subsídio de refeição compensa uma refeição em dia de trabalho: sem
  // trabalho prestado, não há subsídio nesse dia.
  const limite = input.subsidioRefeicaoCartao ? SUBSIDIO_REFEICAO.cartao.value : SUBSIDIO_REFEICAO.dinheiro.value;
  const valorDia = Math.min(positivo(input.subsidioRefeicaoDia), limite);
  const subsidioRefeicaoPerdido = cent(valorDia * dias);

  // Art. 231.º CT: a falta injustificada determina a perda do dia de férias
  // e do correspondente subsídio, na medida prevista na lei.
  const diaBase = positivo(input.retribuicaoBase) / 30;
  const proporcionalPerdido = input.injustificada ? cent(diaBase * dias * 2) : 0;

  return {
    retribuicaoHoraria: hora,
    horasDescontadas,
    descontoRetribuicao,
    subsidioRefeicaoPerdido,
    proporcionalPerdido,
    impactoTotal: cent(descontoRetribuicao + subsidioRefeicaoPerdido + proporcionalPerdido),
  };
}

// ─────────────────────────────────────────────────────────────────────
//  1.13 e) Tempo parcial — proporcionalidade da retribuição e das férias
// ─────────────────────────────────────────────────────────────────────

export interface TempoParcialResult {
  /** Fração do período normal de trabalho a tempo completo. */
  fracao: number;
  /** Retribuição base proporcional. */
  retribuicaoProporcional: number;
  /** Retribuição mínima proporcional (o SMN também se reduz). */
  retribuicaoMinimaProporcional: number;
  /** Dias de férias — NÃO se reduzem com o tempo parcial. */
  diasFerias: number;
}

/**
 * Contrato a tempo parcial. A retribuição é proporcional ao período normal
 * de trabalho, e a retribuição mínima também — mas o direito a férias
 * mantém-se nos 22 dias úteis: reduzi-lo é um erro comum.
 */
export function calcularTempoParcial(
  retribuicaoTempoCompleto: number,
  horasSemanais: number,
  horasTempoCompleto: number = HORARIO_SEMANAL_COMPLETO.value
): TempoParcialResult {
  const completo = Math.max(1, horasTempoCompleto);
  const fracao = Math.min(1, Math.max(0, horasSemanais / completo));
  return {
    fracao,
    retribuicaoProporcional: cent(positivo(retribuicaoTempoCompleto) * fracao),
    retribuicaoMinimaProporcional: cent(SMN.value * fracao),
    diasFerias: FERIAS.diasUteisAno.value,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  Férias — direito no ano de admissão e indemnização por não gozo
// ─────────────────────────────────────────────────────────────────────

export interface DireitoFeriasResult {
  diasAno: number;
  /** Dias no ano de admissão (2 por mês de contrato, máx. 20). */
  diasAnoAdmissao: number;
  /** Indemnização por férias não gozadas por culpa do empregador (triplo). */
  indemnizacaoNaoGozadas: number;
}

/**
 * Direito a férias e a indemnização do Art. 246.º, n.º 1 CT — o triplo da
 * retribuição correspondente às férias não gozadas por culpa do empregador.
 * É um direito real, frequentemente violado e raramente reclamado.
 */
export function calcularDireitoFerias(input: {
  retribuicaoMensal: number;
  mesesDeContratoNoAnoAdmissao?: number;
  diasNaoGozadosPorCulpaDoEmpregador?: number;
}): DireitoFeriasResult {
  const meses = positivo(input.mesesDeContratoNoAnoAdmissao);
  const diasAnoAdmissao = Math.min(
    FERIAS.anoAdmissaoMaximo.value,
    Math.floor(meses * FERIAS.anoAdmissaoDiasPorMes.value)
  );
  const diaBase = positivo(input.retribuicaoMensal) / 30;
  return {
    diasAno: FERIAS.diasUteisAno.value,
    diasAnoAdmissao,
    indemnizacaoNaoGozadas: cent(
      diaBase * positivo(input.diasNaoGozadosPorCulpaDoEmpregador) * FERIAS.indemnizacaoNaoGozadasFator.value
    ),
  };
}
