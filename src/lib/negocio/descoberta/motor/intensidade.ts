// ═══════════════════════════════════════════════════════════════════════
//  INTENSIDADE — ler o número, e não contar quantos números havia
//  ---------------------------------------------------------------------
//  Durante muito tempo o eixo da procura foi isto:
//
//      min(100, 40 + n × 20)      // n = quantas observações apanhámos
//
//  O `observacao.value` atravessava o pipeline inteiro — com unidade,
//  período e checksum — e era deitado fora no último passo. O efeito
//  medido: um mercado com ocupação de 98 % e um mercado com ocupação de
//  2 % produziam a MESMA pontuação (89) e a MESMA confiança (alta). Cinco
//  leituras medíocres batiam três leituras excelentes.
//
//  ── O QUE UM NÚMERO SOLTO NÃO É ────────────────────────────────────
//  «Ocupação 62 %» não diz nada sem referência. 62 % é bom? É mau? A
//  resposta só existe contra alguma coisa, e este módulo só admite duas
//  referências, ambas derivadas dos dados que já temos:
//
//   1. **A distribuição das regiões.** A mesma série, medida nas nove
//      NUTS II, dá um percentil: «esta zona está no percentil 80 do país
//      nesta série». É verificável e é o que as ferramentas sérias
//      publicam (o Location Quotient do CBP e o SizeUp fazem isto).
//   2. **O valor nacional da mesma série.** Índice 100 = igual ao país.
//      Mais fraco do que o percentil, e é por isso que fica em segundo.
//
//  Sem nenhuma das duas, a resposta é `null` — e `null` não vale zero.
//
//  ── A ARMADILHA DAS CONTAGENS ──────────────────────────────────────
//  Metade das séries são CONTAGENS absolutas: sociedades nascidas,
//  alojamentos registados, transações de casas. Comparar o Norte com o
//  Algarve numa contagem absoluta mede o tamanho da região, não a
//  intensidade do problema — e produziria um ranking em que o Norte ganha
//  sempre tudo, com ar de análise.
//
//  Por isso uma contagem só é comparável depois de dividida pela
//  população residente da mesma região (INE 0012918, que o pack de oferta
//  já traz). Sem esse denominador, uma contagem NÃO é normalizável e o
//  módulo devolve `null` em vez de comparar o incomparável. As séries que
//  já vêm em percentagem ou em índice (ocupação, envelhecimento) são
//  comparáveis tal como estão.
// ═══════════════════════════════════════════════════════════════════════

import { MARKET_REGIONS, type MarketRegion } from "@/lib/negocio/market/geografia";
import type { ContagemRegional } from "@/lib/negocio/market/oferta";
import type { MarketObservationSummary } from "@/lib/negocio/market/opportunities";

/**
 * Contra o que é que o valor foi lido.
 *
 * A ordem é de força decrescente e está publicada de propósito: quem lê o
 * ecrã tem direito a saber se «alto» significa «alto contra as outras
 * nove regiões» ou apenas «acima da média nacional».
 */
export type BaseDeComparacao = "distribuicao-regional" | "referencia-nacional";

export const ROTULO_BASE: Readonly<Record<BaseDeComparacao, string>> = Object.freeze({
  "distribuicao-regional": "Percentil entre as regiões do país",
  "referencia-nacional": "Índice face ao valor nacional",
});

export interface LeituraDeIntensidade {
  seriesId: string;
  seriesLabel: string;
  /** 0–100. Percentil, ou índice truncado, consoante a base. */
  posicao: number;
  base: BaseDeComparacao;
  /** O valor lido na zona, na unidade em que a fonte o publicou. */
  valor: number;
  unidade: string;
  /** Se foi preciso dividir por população para comparar. */
  porHabitante: boolean;
  /** Quantas regiões entraram na distribuição. 0 na base nacional. */
  regioesComparadas: number;
  /** A frase que diz contra o que foi normalizado. Vai ao ecrã. */
  referencia: string;
}

/**
 * Unidades que JÁ são relativas e por isso se comparam entre regiões.
 *
 * A lista é explícita e não uma heurística sobre o texto: uma unidade
 * nova que ninguém classifique cai no caso conservador — conta como
 * contagem absoluta, exige denominador, e sem ele não pontua. O modo de
 * falha é «não sabemos», nunca «comparámos à sorte».
 */
const UNIDADES_RELATIVAS: readonly string[] = Object.freeze([
  "%",
  "% de empresas",
  "% de pessoas",
  "idosos por 100 jovens",
]);

export function unidadeJaRelativa(unidade: string): boolean {
  return UNIDADES_RELATIVAS.includes(unidade.trim());
}

/** Percentil de mediana de posto, em [0, 100]. Estável com empates. */
function percentil(valores: readonly number[], valor: number): number {
  const abaixo = valores.filter((item) => item < valor).length;
  const iguais = valores.filter((item) => item === valor).length;
  return ((abaixo + 0.5 * iguais) / valores.length) * 100;
}

const CODIGO_POR_REGIAO = new Map(MARKET_REGIONS.map((item) => [item.id, item.nutsCode]));

interface ValorComparavel {
  codigo: string;
  valor: number;
}

/**
 * Põe as leituras de UMA série numa base comparável entre regiões.
 *
 * Devolve `null` quando a série é uma contagem e não há população para a
 * dividir — que é o caso em que comparar seria comparar tamanhos.
 */
function comparaveis(
  observacoes: readonly MarketObservationSummary[],
  populacaoPor: ReadonlyMap<string, number>,
  relativa: boolean,
): { regionais: readonly ValorComparavel[]; nacional: number | null } | null {
  const regionais: ValorComparavel[] = [];
  let nacional: number | null = null;

  for (const observacao of observacoes) {
    if (typeof observacao.value !== "number" || !Number.isFinite(observacao.value)) continue;
    const nacionalLeitura = observacao.geography.level === "country";
    const codigo = nacionalLeitura ? "PT" : observacao.geography.code;

    let valor = observacao.value;
    if (!relativa) {
      const habitantes = populacaoPor.get(codigo);
      // Sem denominador, uma contagem não entra. Deixá-la entrar seria
      // pôr o Norte à frente por ser o Norte.
      if (habitantes === undefined || habitantes <= 0) continue;
      valor = (valor / habitantes) * 10_000;
    }

    if (nacionalLeitura) nacional = valor;
    else regionais.push({ codigo, valor });
  }

  if (regionais.length === 0 && nacional === null) return null;
  return { regionais, nacional };
}

/** Abaixo disto a distribuição regional é pequena de mais para dar percentil. */
const MINIMO_REGIOES = 5;

export interface EntradaIntensidade {
  observacoes: readonly MarketObservationSummary[];
  regiao: MarketRegion;
  /** População residente por código NUTS. Do pack de oferta (INE 0012918). */
  populacao?: readonly ContagemRegional[];
}

/**
 * A intensidade de cada série na zona da pessoa.
 *
 * Uma série sem referência não aparece — não porque seja irrelevante, mas
 * porque não temos como a ler. Ela continua a ser mostrada como evidência
 * (o número existe e tem fonte); o que não faz é pontuar.
 */
export function lerIntensidade({
  observacoes,
  regiao,
  populacao = [],
}: EntradaIntensidade): readonly LeituraDeIntensidade[] {
  // Sem zona fixada não há leitura local, e comparar o país consigo
  // próprio não é uma comparação. É a resposta certa e é acionável: a
  // interface diz que fixar a zona faz a procura passar a ser medida.
  const codigoDaZona = CODIGO_POR_REGIAO.get(regiao) ?? null;
  if (codigoDaZona === null) return [];

  const populacaoPor = new Map(populacao.map((item) => [item.codigo, item.valor]));

  const porSerie = new Map<string, MarketObservationSummary[]>();
  for (const observacao of observacoes) {
    const lista = porSerie.get(observacao.seriesId);
    if (lista) lista.push(observacao);
    else porSerie.set(observacao.seriesId, [observacao]);
  }

  const leituras: LeituraDeIntensidade[] = [];
  for (const [seriesId, doGrupo] of porSerie) {
    const primeira = doGrupo[0]!;
    const relativa = unidadeJaRelativa(primeira.unit);
    const base = comparaveis(doGrupo, populacaoPor, relativa);
    if (!base) continue;

    const aqui = base.regionais.find((item) => item.codigo === codigoDaZona);
    if (!aqui) continue;

    const original = doGrupo.find(
      (item) => item.geography.level !== "country" && item.geography.code === codigoDaZona,
    );
    const valorOriginal =
      original && typeof original.value === "number" ? original.value : aqui.valor;

    const comum = {
      seriesId,
      seriesLabel: primeira.seriesLabel,
      valor: valorOriginal,
      unidade: primeira.unit,
      porHabitante: !relativa,
    };

    if (base.regionais.length >= MINIMO_REGIOES) {
      const valores = base.regionais.map((item) => item.valor);
      leituras.push({
        ...comum,
        posicao: Math.round(percentil(valores, aqui.valor)),
        base: "distribuicao-regional",
        regioesComparadas: base.regionais.length,
        referencia: `Percentil desta zona entre ${base.regionais.length} regiões${relativa ? "" : ", por dez mil habitantes"}.`,
      });
      continue;
    }

    if (base.nacional !== null && base.nacional > 0) {
      const indice = aqui.valor / base.nacional;
      leituras.push({
        ...comum,
        // Índice 1 (igual ao país) fica a meio da escala; o dobro do país
        // satura no topo. É uma escala declarada, não uma calibração.
        posicao: Math.max(0, Math.min(100, Math.round(50 * indice))),
        base: "referencia-nacional",
        regioesComparadas: 0,
        referencia: `${Math.round(indice * 100)} face a 100 do valor nacional${relativa ? "" : ", por habitante"}.`,
      });
    }
  }

  // Ordem estável: o motor é determinístico e esta lista vai ao ecrã.
  return leituras.sort((esquerda, direita) => esquerda.seriesId.localeCompare(direita.seriesId));
}

export interface IntensidadeAgregada {
  /** 0–100, média das séries lidas. `null` quando nenhuma foi normalizável. */
  posicao: number | null;
  /** A base mais fraca das que entraram — é a que descreve o conjunto. */
  base: BaseDeComparacao | null;
  leituras: readonly LeituraDeIntensidade[];
}

/**
 * A média das séries, e a base mais fraca das que entraram.
 *
 * Média simples, e é uma decisão: ponderar por «importância da série»
 * exigiria um juízo editorial que não temos como sustentar, e ponderar
 * pelo número de regiões premiaria a série mais bem publicada em vez do
 * mercado. Duas séries a dizerem coisas opostas devem dar um valor a
 * meio — que é exatamente o que a média faz e o que a contagem antiga
 * nunca fez.
 */
export function agregarIntensidade(
  leituras: readonly LeituraDeIntensidade[],
): IntensidadeAgregada {
  if (leituras.length === 0) return { posicao: null, base: null, leituras };
  const soma = leituras.reduce((total, item) => total + item.posicao, 0);
  const base: BaseDeComparacao = leituras.every(
    (item) => item.base === "distribuicao-regional",
  )
    ? "distribuicao-regional"
    : "referencia-nacional";
  return { posicao: Math.round(soma / leituras.length), base, leituras };
}
