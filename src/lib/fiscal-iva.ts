// ═══════════════════════════════════════════════════════════════════════
//  MOTOR DA SITUAÇÃO DE IVA
//  ---------------------------------------------------------------------
//  Antes disto, a "Situação de IVA" existia TRÊS vezes: rica no simulador
//  completo (`IvaZonas`), pobre no guiado, e uma terceira cópia num
//  componente que nunca chegou a ser usado. Cada uma decidia as zonas à sua
//  maneira, escrevia a sua própria copy e divergia das outras. É o mesmo
//  problema que a regra 1 do projeto existe para evitar.
//
//  Aqui há uma só função pura, alimentada só por `fiscal-data.ts`, que
//  devolve a situação COMPLETA e a base legal de cada conclusão. Quem
//  desenha limita-se a desenhar.
//
//  ── Base legal, verificada no Portal das Finanças em 2026-07-27 ───────
//
//  Art. 53.º CIVA (redação do DL 35/2025, de 24 de março):
//    n.º 1 — beneficiam da isenção os sujeitos passivos que não tenham
//            atingido, NO ANO CIVIL ANTERIOR, um volume de negócios em
//            território nacional superior a 15 000 €;
//    n.º 3 — quem beneficia da isenção está EXCLUÍDO do direito à dedução
//            (Art. 19.º e 20.º) e do direito ao reembolso;
//    n.º 5 — quem INICIA ATIVIDADE usa o volume de negócios ESTIMADO PARA O
//            ANO CIVIL CORRENTE. Atenção: não é um limiar proporcional aos
//            meses de atividade — essa era a redação antiga, e é o erro que
//            eu próprio ia cometer antes de ir ler o artigo;
//    n.º 6 a) — a isenção NÃO se aplica a quem pratique UMA SÓ OPERAÇÃO
//            TRIBUTÁVEL. Ou seja: um ato isolado nunca é isento pelo
//            Art. 53.º, por muito baixo que seja o valor.
//
//  Art. 58.º, n.º 2 CIVA (epígrafe alterada pelo mesmo DL):
//    a) perde a isenção quem, NO ANO ANTERIOR, ultrapassou o limiar;
//    b) perde quem, NO ANO CORRENTE, exceder o limiar em MAIS DE 25 %
//       (15 000 × 1,25 = 18 750 €).
//    É daqui que vêm as duas zonas: entre 15 000 e 18 750 a mudança é para o
//    ano seguinte; acima de 18 750 é imediata.
//
//  Art. 41.º, n.º 1 CIVA (redação da Lei n.º 12/2022):
//    a) volume de negócios ≥ 650 000 € no ano anterior → declaração MENSAL;
//    b) abaixo disso → TRIMESTRAL (com opção pelo mensal, n.º 2).
//
//  Art. 9.º CIVA — isenções pela NATUREZA da operação (saúde, ensino, obra
//    própria de autor no n.º 16). Não dependem de limiar nenhum, e por isso
//    são uma zona própria e não um caso especial escondido num simulador.
// ═══════════════════════════════════════════════════════════════════════

import {
  IVA_TAXAS,
  IVA_ISENCAO_LIMITE,
  IVA_ISENCAO_EXCESSO,
  IVA_ESPERADO_POR_CATEGORIA,
  type Regiao,
  type EscalaoIVA,
  type IvaEsperado,
  type CategoriaSimuladorRV,
} from "./fiscal-data";
import type { RegimeIVA } from "./fiscal";

export type ZonaIVA =
  /** Abaixo do limiar do Art. 53.º e sem cobrar IVA. */
  | "isento_limiar"
  /** Isento pela natureza da operação (Art. 9.º) — sem limiar aplicável. */
  | "isento_natureza"
  /** Entre 15 000 € e 18 750 €: perde a isenção a 1 de janeiro seguinte. */
  | "transicao"
  /** Acima de 18 750 €: perde imediatamente (Art. 58.º n.º 2 b). */
  | "tributado"
  /** Abaixo do limiar mas escolheu cobrar IVA. */
  | "tributado_por_opcao"
  /** Uma só operação tributável: nunca isento (Art. 53.º n.º 6 a). */
  | "ato_isolado";

export type EntidadeIVA = "ti" | "ato_isolado" | "sociedade";

export interface EntradaSituacaoIVA {
  /** Volume de negócios anual em território nacional. */
  faturacaoAnual: number;
  regiao: Regiao;
  /** O que o utilizador escolheu na interface. */
  regimeEscolhido: RegimeIVA;
  /** Categoria do simulador de recibos verdes, para a taxa habitual. */
  categoria?: CategoriaSimuladorRV;
  entidade?: EntidadeIVA;
  /**
   * Primeiro ano de atividade. Art. 53.º n.º 5: o valor a considerar é a
   * ESTIMATIVA para o ano civil corrente — que é exatamente o que
   * `faturacaoAnual` já representa nos nossos simuladores. Serve para a
   * copy dizer que é uma estimativa, não para mudar o limiar.
   */
  primeiroAno?: boolean;
  /** Art. 9.º: a operação é isenta pela sua natureza, haja o que houver. */
  isentoPorNatureza?: boolean;
  /**
   * Já se sabe, por cálculo, que não está a cobrar IVA (ex.: desdobramento
   * de direitos de autor sem royalties tributados). Quando presente, manda
   * sobre a dedução por limiar.
   */
  isentoEfetivo?: boolean;
}

export interface OpcaoTaxaIVA {
  escalao: EscalaoIVA;
  taxa: number;
  rotulo: string;
  /** Exemplos concretos, para se escolher sem ter de saber a lista do CIVA. */
  exemplos: string;
}

export interface SituacaoIVA {
  zona: ZonaIVA;
  regimeEfetivo: RegimeIVA;
  taxaEfetiva: number;
  limiar: number;
  limiarImediato: number;
  /** Quanto falta para o limiar (negativo se já passou). */
  margemAteLimiar: number;
  nivel: "brand" | "aviso" | "info" | "critico";
  titulo: string;
  /** A explicação em três tempos — a versão rica, agora em todo o lado. */
  oQueAcontece: string;
  quandoAcontece: string;
  oQueTensDeFazer: string;
  baseLegal: string[];
  /** Opções de taxa a apresentar, já com a taxa da região. */
  opcoes: OpcaoTaxaIVA[];
  /** A taxa escolhida diverge da habitual para a atividade? */
  incoerencia: { taxaEscolhida: number; taxaHabitual: IvaEsperado; texto: string } | null;
  /** Só para sociedades (Art. 41.º). */
  periodicidade: "mensal" | "trimestral" | null;
  /** Vocabulário do contrato da FIZ, derivado da zona — não da escolha crua. */
  regimeParaFiz: "EXEMPT_ART_53" | "EXEMPT_ART_9" | "NORMAL" | "UNKNOWN";
}

/** Art. 41.º n.º 1 a): a partir daqui a declaração é mensal. */
export const IVA_LIMIAR_MENSAL = 650_000;

const ROTULO: Record<EscalaoIVA, string> = {
  reduzida: "Reduzida",
  intermedia: "Intermédia",
  normal: "Normal",
};

/** Exemplos das Listas I e II anexas ao CIVA, em linguagem corrente. */
const EXEMPLOS: Record<EscalaoIVA, string> = {
  reduzida: "saúde, alimentação, livros",
  intermedia: "restauração, alojamento local",
  normal: "maioria dos serviços, TI, consultoria",
};

const eur = (v: number) => `${v.toLocaleString("pt-PT")} €`;

function opcoesDaRegiao(regiao: Regiao): OpcaoTaxaIVA[] {
  const taxas = IVA_TAXAS[regiao].value;
  return (["reduzida", "intermedia", "normal"] as EscalaoIVA[]).map((e) => ({
    escalao: e,
    taxa: taxas[e],
    rotulo: ROTULO[e],
    exemplos: EXEMPLOS[e],
  }));
}

function taxaDoRegime(regime: RegimeIVA, regiao: Regiao): number {
  if (regime === "isento") return 0;
  return IVA_TAXAS[regiao].value[regime];
}

/**
 * A situação de IVA completa, para qualquer simulador.
 *
 * É pura: dois inputs iguais dão sempre o mesmo resultado, e não sabe nada
 * sobre React. Toda a copy que a interface mostra sai daqui, para que o
 * guiado e o completo não possam voltar a dizer coisas diferentes sobre o
 * mesmo enquadramento.
 */
export function situacaoIVA(entrada: EntradaSituacaoIVA): SituacaoIVA {
  const {
    faturacaoAnual,
    regiao,
    regimeEscolhido,
    categoria,
    entidade = "ti",
    primeiroAno = false,
    isentoPorNatureza = false,
    isentoEfetivo,
  } = entrada;

  const limiar = IVA_ISENCAO_LIMITE.value;
  const limiarImediato = IVA_ISENCAO_EXCESSO.value;
  const opcoes = opcoesDaRegiao(regiao);
  const habitual = categoria ? IVA_ESPERADO_POR_CATEGORIA.value[categoria].esperado : undefined;

  // Incoerência: escolheu uma taxa que não é a habitual da atividade. Não é
  // um erro — há atividades mistas — por isso é uma nota, não um bloqueio.
  const taxaEscolhida = taxaDoRegime(regimeEscolhido, regiao);
  const incoerencia =
    habitual && regimeEscolhido !== "isento" && habitual !== "isento" && regimeEscolhido !== habitual
      ? {
          taxaEscolhida,
          taxaHabitual: habitual,
          texto:
            `A taxa que escolheste não é a habitual para esta atividade, que ` +
            `normalmente aplica a taxa ${ROTULO[habitual].toLowerCase()} ` +
            `(${(IVA_TAXAS[regiao].value[habitual] * 100).toLocaleString("pt-PT")} %). ` +
            `Pode estar certo — há atividades mistas — mas confirma com o teu contabilista.`,
        }
      : null;

  const base = {
    limiar,
    limiarImediato,
    margemAteLimiar: limiar - faturacaoAnual,
    opcoes,
    incoerencia,
    periodicidade: null as SituacaoIVA["periodicidade"],
  };

  // ── Art. 9.º: isenção pela natureza da operação ─────────────────────
  // Vem primeiro porque não depende de limiar nenhum.
  if (isentoPorNatureza) {
    return {
      ...base,
      zona: "isento_natureza",
      regimeEfetivo: "isento",
      taxaEfetiva: 0,
      nivel: "brand",
      titulo: "Isento de IVA pela natureza da atividade",
      oQueAcontece:
        "A tua operação está isenta de IVA pelo Art. 9.º do CIVA — é a natureza do que fazes que a isenta, não o valor que faturas.",
      quandoAcontece: "Sempre, independentemente do que faturares no ano.",
      oQueTensDeFazer:
        "Não cobras IVA nem o entregas ao Estado. Em contrapartida, também não podes deduzir o IVA das tuas compras.",
      baseLegal: ["Art. 9.º CIVA", "Art. 53.º, n.º 3 CIVA (exclusão do direito à dedução)"],
      regimeParaFiz: "EXEMPT_ART_9",
    };
  }

  // ── Ato isolado: nunca isento (Art. 53.º n.º 6 a) ───────────────────
  if (entidade === "ato_isolado") {
    const regime: RegimeIVA = regimeEscolhido === "isento" ? (habitual === "isento" ? "normal" : habitual ?? "normal") : regimeEscolhido;
    return {
      ...base,
      zona: "ato_isolado",
      regimeEfetivo: regime,
      taxaEfetiva: taxaDoRegime(regime, regiao),
      nivel: "aviso",
      titulo: "Num ato isolado há sempre IVA",
      oQueAcontece:
        "A isenção do Art. 53.º não se aplica a quem pratica uma só operação tributável. Mesmo que o valor seja baixo, o ato isolado leva IVA.",
      quandoAcontece: "Já — na própria fatura-recibo do ato isolado.",
      oQueTensDeFazer:
        "Liquida o IVA à taxa da operação e entrega-o ao Estado até ao fim do mês seguinte. Escolhe abaixo a taxa aplicável.",
      baseLegal: ["Art. 53.º, n.º 6, al. a) CIVA", "Art. 2.º, n.º 1, al. a) CIVA"],
      regimeParaFiz: "NORMAL",
    };
  }

  // ── Sociedade: regime normal e periodicidade do Art. 41.º ───────────
  if (entidade === "sociedade") {
    const regime: RegimeIVA = regimeEscolhido === "isento" ? "normal" : regimeEscolhido;
    const mensal = faturacaoAnual >= IVA_LIMIAR_MENSAL;
    return {
      ...base,
      zona: "tributado",
      regimeEfetivo: regime,
      taxaEfetiva: taxaDoRegime(regime, regiao),
      nivel: "info",
      titulo: `IVA no regime normal · declaração ${mensal ? "mensal" : "trimestral"}`,
      oQueAcontece:
        "Uma sociedade liquida IVA nas suas operações e deduz o IVA suportado nas compras. A isenção do Art. 53.º raramente se aplica a uma sociedade em atividade.",
      quandoAcontece: mensal
        ? `Com ${eur(faturacaoAnual)} de volume de negócios (≥ ${eur(IVA_LIMIAR_MENSAL)}), a declaração periódica é mensal — até ao dia 20 do 2.º mês seguinte.`
        : `Com ${eur(faturacaoAnual)} de volume de negócios (< ${eur(IVA_LIMIAR_MENSAL)}), a declaração periódica é trimestral — até ao dia 20 do 2.º mês seguinte ao trimestre.`,
      oQueTensDeFazer:
        "Garante a faturação certificada e a entrega da declaração periódica dentro do prazo. Podes optar pelo regime mensal ainda que estejas abaixo do limiar.",
      baseLegal: ["Art. 41.º, n.º 1 CIVA", "Art. 29.º, n.º 1, al. c) CIVA"],
      periodicidade: mensal ? "mensal" : "trimestral",
      regimeParaFiz: "NORMAL",
    };
  }

  // ── Trabalhador independente ────────────────────────────────────────
  const cobraIva = isentoEfetivo === undefined ? regimeEscolhido !== "isento" : !isentoEfetivo;
  const acimaDoLimiar = faturacaoAnual > limiar;
  const acimaDoImediato = faturacaoAnual > limiarImediato;

  const notaPrimeiroAno = primeiroAno
    ? " Como estás no primeiro ano, o que conta é a estimativa que fizeres para o ano civil corrente (Art. 53.º, n.º 5)."
    : "";

  // Isento e abaixo do limiar.
  if (!acimaDoLimiar && !cobraIva) {
    return {
      ...base,
      zona: "isento_limiar",
      regimeEfetivo: "isento",
      taxaEfetiva: 0,
      nivel: "brand",
      titulo: "Estás isento de IVA",
      oQueAcontece: `Com ${eur(Math.round(faturacaoAnual))} por ano estás abaixo de ${eur(limiar)} — beneficias da isenção do Art. 53.º.${notaPrimeiroAno}`,
      quandoAcontece: `A isenção mantém-se em cada ano em que ficares abaixo de ${eur(limiar)}.`,
      oQueTensDeFazer:
        "Não cobras IVA ao cliente nem o entregas ao Estado. Em contrapartida, não podes deduzir o IVA das tuas compras. Nos recibos, indica a menção de isenção do Art. 53.º.",
      baseLegal: ["Art. 53.º, n.º 1 CIVA", "Art. 53.º, n.º 3 CIVA"],
      regimeParaFiz: "EXEMPT_ART_53",
    };
  }

  // Abaixo do limiar mas optou por cobrar.
  if (!acimaDoLimiar && cobraIva) {
    const regime: RegimeIVA = regimeEscolhido === "isento" ? habitual && habitual !== "isento" ? habitual : "normal" : regimeEscolhido;
    return {
      ...base,
      zona: "tributado_por_opcao",
      regimeEfetivo: regime,
      taxaEfetiva: taxaDoRegime(regime, regiao),
      nivel: "info",
      titulo: "Cobras IVA por opção",
      oQueAcontece: `Podias estar isento — faturas ${eur(Math.round(faturacaoAnual))}, abaixo de ${eur(limiar)} — mas escolheste o regime normal.`,
      quandoAcontece: "Desde a renúncia à isenção, e por um período mínimo de cinco anos.",
      oQueTensDeFazer:
        "Liquida o IVA nas tuas faturas e entrega a declaração periódica. Em troca, passas a poder deduzir o IVA das tuas compras.",
      baseLegal: ["Art. 53.º, n.º 1 CIVA", "Art. 55.º CIVA (renúncia)"],
      regimeParaFiz: "NORMAL",
    };
  }

  // Zona de transição: 15 000 € < faturação ≤ 18 750 €.
  if (!acimaDoImediato) {
    const regime: RegimeIVA = regimeEscolhido === "isento" ? habitual && habitual !== "isento" ? habitual : "normal" : regimeEscolhido;
    return {
      ...base,
      zona: "transicao",
      regimeEfetivo: regimeEscolhido === "isento" ? "isento" : regime,
      taxaEfetiva: regimeEscolhido === "isento" ? 0 : taxaDoRegime(regime, regiao),
      nivel: "aviso",
      titulo: "Vais perder a isenção em janeiro",
      oQueAcontece: `Faturaste ${eur(Math.round(faturacaoAnual))} este ano — entre ${eur(limiar)} e ${eur(limiarImediato)}. Vais perder a isenção de IVA, mas só no futuro, não já.${notaPrimeiroAno}`,
      quandoAcontece: "A 1 de janeiro do próximo ano. Continuas isento até lá.",
      oQueTensDeFazer: `Prepara-te para cobrar IVA a partir de janeiro e entrega a declaração de alterações. Se ainda este ano ultrapassares ${eur(limiarImediato)}, a mudança passa a ser imediata.`,
      baseLegal: ["Art. 58.º, n.º 2, al. a) CIVA", "Art. 53.º, n.º 1 CIVA"],
      regimeParaFiz: "EXEMPT_ART_53",
    };
  }

  // Acima de 18 750 €: perde imediatamente.
  const regime: RegimeIVA = regimeEscolhido === "isento" ? habitual && habitual !== "isento" ? habitual : "normal" : regimeEscolhido;
  return {
    ...base,
    zona: "tributado",
    regimeEfetivo: regime,
    taxaEfetiva: taxaDoRegime(regime, regiao),
    nivel: "critico",
    titulo: "Perdes a isenção imediatamente",
    oQueAcontece: `Ultrapassaste ${eur(limiarImediato)} — o limiar excedido em mais de 25 %. A isenção cessa já, não no próximo ano.${notaPrimeiroAno}`,
    quandoAcontece: "Já. A partir do momento em que ultrapassaste, as operações passam a ser tributadas.",
    oQueTensDeFazer:
      "Entrega a declaração de alterações e começa a liquidar IVA. Fala com o teu contabilista com urgência — há prazos associados a esta mudança.",
    baseLegal: ["Art. 58.º, n.º 2, al. b) CIVA", "Art. 58.º, n.º 5 CIVA"],
    regimeParaFiz: "NORMAL",
  };
}
