// ═══════════════════════════════════════════════════════════════════════
//  OFERTA — o termo que faltava à subtração
//  ---------------------------------------------------------------------
//  Durante todo o tempo em que este motor existiu, a leitura de lacuna
//  foi «por apurar». Não por preguiça: por honestidade. O ficheiro
//  `motor/procura.ts` escreveu-o com todas as letras —
//
//      «O motor de mercado deste repositório continua sem sinais de
//       oferta. (…) Sem um termo da subtração, a lacuna não é calculável
//       — e a resposta correta é `desconhecida`.»
//
//  Este módulo traz esse termo. E traz o segundo problema que o mesmo
//  ficheiro anteviu: mesmo com os dois sinais, «saber se a oferta é pouca
//  ou muita exige pôr as duas na mesma base». É isso que se faz aqui —
//  operadores por dez mil habitantes, comparados entre as nove NUTS II.
//
//  ── DUAS FONTES, UM SÓ INSTITUTO, A MESMA GEOGRAFIA ────────────────
//   · Oferta — INE 0014449, «Empresas (N.º) por Localização geográfica
//     (NUTS 2024) e Atividade económica (Divisão — CAE Rev. 3)», do
//     Sistema de contas integradas das empresas.
//   · Base   — INE 0012918, «População residente (N.º) por Local de
//     residência (NUTS 2024), Sexo e Grupo etário», Estimativas anuais.
//
//  As duas na mesma versão das NUTS (2024) e do mesmo instituto. Isso não
//  é conveniência: comparar uma contagem de empresas numa classificação
//  territorial com uma população noutra produziria rácios errados por
//  regiões inteiras, sem nada a assinalá-lo.
//
//  ── O QUE ESTE MÓDULO NÃO FAZ ──────────────────────────────────────
//  Não pondera concorrentes por qualidade, dimensão, horário ou recência.
//  Um relatório de mercado descreveria a oferta efetiva como uma soma
//  ponderada por proximidade, relevância, qualidade e capacidade — e tem
//  razão. Nada disso é derivável de uma contagem de empresas por divisão
//  CAE, e derivá-lo à força seria inventar. O que sai daqui é uma
//  contagem declarada como contagem, com a divisão que a produziu e a
//  ressalva de quão larga ela é.
// ═══════════════════════════════════════════════════════════════════════

import { fetchIneIndicator, normalizeIneAnnualIndicator } from "./connectors/ine";
import type { IneAnnualIndicatorManifest, IneFetchResult } from "./connectors/ine";
import { MARKET_REGIONS, type MarketRegion } from "./geografia";
import { CONCELHO_POR_CODIGO } from "./concelhos";
import type { MatrizOfertaConcelhos } from "./oferta-concelhos";
import type { MarketObservationLicense } from "./tipos";
import { DIVISOES_CAE } from "../descoberta/conhecimento/dados/divisoes-cae";
import { DIVISOES_USADAS } from "../descoberta/conhecimento/dados/ontologia";
import { DIVISOES_DE_CLIENTES } from "../descoberta/conhecimento/dados/problemas";

/** A mesma licença que os restantes indicadores do INE no dados.gov. */
const INE_CC_BY: MarketObservationLicense = {
  status: "approved",
  scope: "dataset",
  identifier: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/",
  attribution: "Fonte: INE, I.P. — dataset publicado no dados.gov.pt",
};

const NUTS2_2024: IneAnnualIndicatorManifest["geographyByCode"] = Object.freeze({
  PT: { level: "country", expectedName: "Portugal" },
  "11": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Norte" },
  "15": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Algarve" },
  "19": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Centro" },
  "1A": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Grande Lisboa" },
  "1B": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Península de Setúbal" },
  "1C": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Alentejo" },
  "1D": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Oeste e Vale do Tejo" },
  "20": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Região Autónoma dos Açores" },
  "30": { level: "nuts2", classificationVersion: "NUTS 2024", expectedName: "Região Autónoma da Madeira" },
} as const);

/** Os códigos NUTS que a aplicação usa, para pedir só esses ao servidor. */
export const CODIGOS_NUTS_PEDIDOS: readonly string[] = Object.freeze([
  "PT",
  ...MARKET_REGIONS.map((item) => item.nutsCode).filter((codigo): codigo is string => codigo !== null),
]);

export const EMPRESAS_POR_CAE = "0014449";
export const POPULACAO_RESIDENTE = "0012918";

const manifestoEmpresas = (divisao: string): IneAnnualIndicatorManifest => ({
  indicatorCode: EMPRESAS_POR_CAE,
  metricId: `business.count.cae_${divisao}`,
  unit: "empresas",
  // Contas integradas das empresas: o apuramento sai com mais de um ano
  // de desfasamento por natureza. Exigir frescura anual descartaria a
  // série inteira e devolveria «sem dados» a quem tem dados.
  maxReferenceAgeDays: 1460,
  geographyByCode: NUTS2_2024,
  dimensionFilters: { dim_3: [divisao] },
  decimalSeparator: ".",
  classifications: { cae: [divisao] },
  observationStatus: "observed",
  semanticMapping: "approved",
  methodologyRef: `https://www.ine.pt/xurl/indx/${EMPRESAS_POR_CAE}/PT`,
  datasetLicense: INE_CC_BY,
});

const MANIFESTO_POPULACAO: IneAnnualIndicatorManifest = {
  indicatorCode: POPULACAO_RESIDENTE,
  metricId: "population.resident",
  unit: "habitantes",
  maxReferenceAgeDays: 730,
  geographyByCode: NUTS2_2024,
  // dim_3 = T (ambos os sexos) · dim_4 = T (todas as idades). Sem estes
  // dois filtros somavam-se homens, mulheres e o total, e a população de
  // cada região vinha a dobrar — um erro que passa despercebido porque o
  // número continua a parecer plausível.
  dimensionFilters: { dim_3: ["T"], dim_4: ["T"] },
  decimalSeparator: ".",
  observationStatus: "estimated",
  semanticMapping: "approved",
  methodologyRef: `https://www.ine.pt/xurl/indx/${POPULACAO_RESIDENTE}/PT`,
  datasetLicense: INE_CC_BY,
};

export interface ContagemRegional {
  /** Código NUTS 2024, ou `PT`. */
  codigo: string;
  valor: number;
  periodo: string;
}

export interface OfertaPorDivisao {
  divisao: string;
  designacao: string;
  contagens: readonly ContagemRegional[];
  /** Quando a série falhou. A ausência é declarada, não silenciada. */
  falha?: string;
}

export interface PackOferta {
  schemaVersion: 1;
  geradoEm: string;
  indicadorEmpresas: string;
  indicadorPopulacao: string;
  licenca: MarketObservationLicense;
  divisoes: readonly OfertaPorDivisao[];
  populacao: readonly ContagemRegional[];
  /** Divisões pedidas que não trouxeram nada. Vai ao ecrã, não ao log. */
  emFalta: readonly string[];
  /**
   * A mesma leitura aos 308 concelhos, do instantâneo commitado.
   *
   * Opcional de propósito, e por duas razões independentes: o
   * instantâneo pode não passar a validação, e a NUTS II continua a ser
   * a resposta correta para quem não fixou concelho. Sem ela o motor lê
   * exatamente como lia antes de os concelhos existirem.
   */
  concelhos?: MatrizOfertaConcelhos;
}

export interface OpcoesOferta {
  fetchImpl?: typeof fetch;
  now?: () => string;
  signal?: AbortSignal;
  /** Restringe as divisões pedidas. Vazio = as que a ontologia usa. */
  divisoes?: readonly string[];
  /** Tentativas por série, incluindo a primeira. */
  tentativas?: number;
}

/**
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ VINTE E TRÊS PEDIDOS VIRARAM DOIS                                   │
 * │                                                                    │
 * │ A primeira versão pedia uma divisão de cada vez, em paralelo. O    │
 * │ INE respondeu a dezasseis das vinte e três e deixou cair também a  │
 * │ POPULAÇÃO — que é a base do rácio. Sem base, `lerOferta` devolve   │
 * │ `null` para tudo, e o efeito observável foi a funcionalidade       │
 * │ inteira desligada por um erro que não deu erro nenhum.             │
 * │                                                                    │
 * │ Estrangular a concorrência resolveu a correção e não a latência:   │
 * │ 22 de 23 divisões em 31 segundos, com a rota a cair para o cache   │
 * │ curto por estar incompleta.                                        │
 * │                                                                    │
 * │ A solução verdadeira é não fazer vinte e três pedidos. A API do    │
 * │ INE aceita várias categorias por dimensão separadas por vírgula:   │
 * │ as vinte e três divisões × dez regiões vêm num só pedido de 50 KB, │
 * │ em 1,4 segundos. Medido. O mesmo payload é depois normalizado uma  │
 * │ vez por divisão — o filtro do manifesto já sabe fazer isso.        │
 * │                                                                    │
 * │ Ficam dois pedidos: empresas e população. A tentativa repetida     │
 * │ fica, porque dois pedidos também falham.                           │
 * └────────────────────────────────────────────────────────────────────┘
 */
const TENTATIVAS_PADRAO = 3;

/**
 * Teto TOTAL da carga, e porque ele passou a existir.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ O QUE ISTO APANHOU, E NÃO FOI EM TEORIA                             │
 * │                                                                    │
 * │ Dois indicadores, cada um com três tentativas de oito segundos e   │
 * │ pausas entre elas: o pior caso desta função eram ~54 s. Esta rota  │
 * │ é chamada pelo browser ao abrir a página, e uma ligação segurada   │
 * │ um minuto não é um pack que demora — é uma página que parece       │
 * │ partida. O `descobrir:e2e` foi o primeiro a dizê-lo: `page.goto`   │
 * │ com `networkidle` expirou aos 30 s à espera desta rota.            │
 * │                                                                    │
 * │ Antes de a matriz ao concelho existir, esperar era defensável —    │
 * │ esta chamada era o ÚNICO caminho para a leitura de oferta. Já não  │
 * │ é: o instantâneo commitado cobre os 308 concelhos e não depende do │
 * │ INE estar de pé. Falhar depressa passou a custar pouco, e insistir │
 * │ passou a custar a página.                                           │
 * └────────────────────────────────────────────────────────────────────┘
 */
const TETO_TOTAL_MS = 20_000;

/**
 * Teto por tentativa, e a pausa entre elas.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ O QUE SE MEDIU, E PORQUE MUDOU DUAS VEZES                           │
 * │                                                                    │
 * │ Sob carga o INE não recusa depressa: pendura o pedido quinze        │
 * │ segundos e só depois devolve 503. Com duas tentativas seguidas e    │
 * │ sem pausa, uma leitura falhada custava 30 s e voltava a apanhar o   │
 * │ mesmo 503 — porque repetir no mesmo instante é exatamente o que um  │
 * │ servidor a rejeitar carga não quer.                                 │
 * │                                                                    │
 * │ Oito segundos chegam de sobra (as respostas boas vêm em ~500 ms) e  │
 * │ transformam um pendurado em falha rápida. A pausa cresce entre      │
 * │ tentativas para a segunda apanhar a fonte já aliviada.              │
 * └────────────────────────────────────────────────────────────────────┘
 */
const TETO_POR_TENTATIVA_MS = 8_000;
const PAUSAS_MS: readonly number[] = [600, 2_400];

/** `Promise.allSettled` para uma promessa só, sem perder o motivo da falha. */
async function promessaResolvida<T>(
  tarefa: () => Promise<T>,
): Promise<PromiseSettledResult<T>> {
  try {
    return { status: "fulfilled", value: await tarefa() };
  } catch (motivo) {
    return { status: "rejected", reason: motivo };
  }
}

const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

async function comTentativas<T>(
  tarefa: (sinal: AbortSignal) => Promise<T>,
  tentativas: number,
  externo?: AbortSignal,
): Promise<T> {
  let ultimoErro: unknown;
  const total = Math.max(1, tentativas);
  for (let numero = 0; numero < total; numero += 1) {
    // ── UM SINAL JÁ ABORTADO NÃO VOLTA A DISPARAR ──────────────────
    //  `addEventListener("abort", …)` num `AbortSignal` que JÁ abortou
    //  nunca chama o ouvinte — é a semântica da API, e é fácil de não
    //  ver. O efeito medido: com o prazo comum aos dois indicadores, o
    //  primeiro terminava certo aos 20 s e o segundo arrancava logo a
    //  seguir e corria uma tentativa INTEIRA de oito segundos, porque
    //  ninguém lhe disse que o prazo já tinha passado. Vinte segundos de
    //  orçamento davam vinte e oito.
    //
    //  O `if` tem de estar ANTES do trabalho, não só depois da falha.
    if (externo?.aborted) throw ultimoErro ?? externo.reason;
    const relogio = new AbortController();
    const temporizador = setTimeout(() => relogio.abort(), TETO_POR_TENTATIVA_MS);
    const cancelarExterno = () => relogio.abort();
    externo?.addEventListener("abort", cancelarExterno);
    try {
      return await tarefa(relogio.signal);
    } catch (erro) {
      ultimoErro = erro;
      // Um cancelamento de quem chamou é uma decisão, não uma falha da
      // fonte: repetir seria ignorá-la.
      if (externo?.aborted) throw erro;
      if (numero < total - 1) await esperar(PAUSAS_MS[Math.min(numero, PAUSAS_MS.length - 1)]!);
    } finally {
      clearTimeout(temporizador);
      externo?.removeEventListener("abort", cancelarExterno);
    }
  }
  throw ultimoErro;
}

/** Normaliza um payload já lido segundo um manifesto, sem voltar à rede. */
function contagensDe(
  bruto: IneFetchResult,
  manifesto: IneAnnualIndicatorManifest,
): readonly ContagemRegional[] {
  const normalizado = normalizeIneAnnualIndicator(bruto, manifesto);

  // Uma métrica com vários períodos devolve o mais recente por geografia.
  // Misturar 2023 com 2021 na mesma comparação entre regiões produziria
  // um rácio que não descreve nenhum ano.
  const porGeografia = new Map<string, ContagemRegional>();
  for (const observacao of normalizado.observations) {
    // `MarketObservation.value` é `number | string | boolean` porque há
    // séries qualitativas no registo. Estas duas são contagens: um valor
    // que não seja número é uma leitura que não serve para dividir, e
    // descarta-se em silêncio em vez de virar `NaN` a meio de um rácio.
    if (typeof observacao.value !== "number" || !Number.isFinite(observacao.value)) continue;
    const codigo = observacao.geography.code;
    const periodo = observacao.referencePeriod.label ?? observacao.referencePeriod.end;
    const atual = porGeografia.get(codigo);
    if (!atual || periodo > atual.periodo) {
      porGeografia.set(codigo, { codigo, valor: observacao.value, periodo });
    }
  }
  return [...porGeografia.values()].sort((esquerda, direita) =>
    esquerda.codigo.localeCompare(direita.codigo),
  );
}

/** Um pedido ao INE, com as dimensões pedidas ao servidor. */
const pedir = (
  indicador: string,
  opcoes: OpcoesOferta,
  dimensoes: Record<string, readonly string[]>,
  sinal: AbortSignal,
): Promise<IneFetchResult> =>
  fetchIneIndicator(indicador, {
    fetchImpl: opcoes.fetchImpl,
    now: opcoes.now,
    signal: sinal,
    dimensions: { Dim2: CODIGOS_NUTS_PEDIDOS, ...dimensoes },
  });

/**
 * O pack de oferta: quantos operadores existem por região, divisão a
 * divisão, mais a população que serve de base à comparação.
 *
 * Cada divisão degrada sozinha. Uma que falhe não leva as outras atrás,
 * e a sua ausência sai em `emFalta` — o motor prefere dizer que não sabe
 * uma coisa a fingir que a lista está completa.
 */
export async function carregarOferta(opcoes: OpcoesOferta = {}): Promise<PackOferta> {
  const agora = opcoes.now ?? (() => new Date().toISOString());
  // Os DOIS lados da subtração: as divisões em que o operador se
  // inscreve (ontologia) e aquelas em que os clientes estão (problemas).
  // Sem as segundas não há denominador, e sem denominador a lacuna volta
  // a ser uma densidade por habitante — que é o que já era.
  const pedidas =
    opcoes.divisoes && opcoes.divisoes.length > 0
      ? opcoes.divisoes
      : [...new Set([...DIVISOES_USADAS, ...DIVISOES_DE_CLIENTES])].sort();
  const tentativas = opcoes.tentativas ?? TENTATIVAS_PADRAO;

  // ── UM DE CADA VEZ, E NÃO POR CONSERVADORISMO ────────────────────
  //  Os dois pedidos partiram juntos numa versão e o segundo veio vazio,
  //  sempre. Medido isoladamente, cada URL responde em ~1,2 s e traz
  //  tudo; disparados ao mesmo tempo, o INE deixa cair um — e as duas
  //  tentativas seguintes gastaram trinta segundos para chegar ao mesmo
  //  resultado. Com a população em falta, a oferta inteira fica inútil,
  //  porque é ela a base do rácio.
  //
  //  Sequencial custa ~2,5 s no total e traz sempre os dois. A ordem é
  //  deliberada: a população primeiro, porque sem ela as contagens de
  //  empresas não produzem uma única leitura.
  //  O relógio é COMUM aos dois pedidos: o orçamento é da carga inteira,
  //  não de cada indicador. Sem isso, dois indicadores lentos somavam os
  //  seus tetos e a página ficava à espera do dobro.
  const prazo = AbortSignal.timeout(TETO_TOTAL_MS);
  const comPrazo = opcoes.signal
    ? AbortSignal.any([opcoes.signal, prazo])
    : prazo;

  const populacaoBruta = await promessaResolvida(() =>
    comTentativas(
      (sinal) => pedir(POPULACAO_RESIDENTE, opcoes, { Dim3: ["T"], Dim4: ["T"] }, sinal),
      tentativas,
      comPrazo,
    ),
  );
  const empresas = await promessaResolvida(() =>
    comTentativas(
      (sinal) => pedir(EMPRESAS_POR_CAE, opcoes, { Dim3: pedidas }, sinal),
      tentativas,
      comPrazo,
    ),
  );

  const divisoes: OfertaPorDivisao[] = [];
  const emFalta: string[] = [];

  for (const divisao of pedidas) {
    const designacao = DIVISOES_CAE.get(divisao) ?? divisao;
    if (empresas.status === "rejected") {
      divisoes.push({
        divisao,
        designacao,
        contagens: [],
        falha:
          empresas.reason instanceof Error ? empresas.reason.message : String(empresas.reason),
      });
      emFalta.push(divisao);
      continue;
    }
    // O mesmo payload, filtrado divisão a divisão pelo manifesto. Uma
    // divisão que o INE não devolva fica com zero contagens e entra em
    // `emFalta` — nunca com zero empresas, que se leria como mercado
    // livre e promoveria a hipótese por engano.
    const contagens = contagensDe(empresas.value, manifestoEmpresas(divisao));
    if (contagens.length === 0) {
      divisoes.push({
        divisao,
        designacao,
        contagens: [],
        falha: "A fonte respondeu sem nenhuma leitura utilizável para esta divisão.",
      });
      emFalta.push(divisao);
      continue;
    }
    divisoes.push({ divisao, designacao, contagens });
  }

  // Sem base não há rácio — e sem rácio a leitura volta a «por apurar».
  // É o comportamento correto: uma contagem de empresas sem população
  // por baixo não diz se é muita ou pouca.
  const populacao =
    populacaoBruta.status === "fulfilled"
      ? contagensDe(populacaoBruta.value, MANIFESTO_POPULACAO)
      : [];

  return {
    schemaVersion: 1,
    geradoEm: agora(),
    indicadorEmpresas: EMPRESAS_POR_CAE,
    indicadorPopulacao: POPULACAO_RESIDENTE,
    licenca: INE_CC_BY,
    divisoes: divisoes.sort((esquerda, direita) => esquerda.divisao.localeCompare(direita.divisao)),
    populacao,
    emFalta: emFalta.sort(),
  };
}

// ── A CONTA ──────────────────────────────────────────────────────────

export interface DensidadeRegional {
  regiao: MarketRegion;
  codigo: string;
  /** Nome da unidade lida — a região, ou o concelho. Vai ao ecrã. */
  nome: string;
  operadores: number;
  habitantes: number;
  /** Operadores por dez mil habitantes. A base comum. */
  porDezMil: number;
}

/**
 * A ESCALA da leitura, e é ela que decide o que a leitura significa.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ «Que negócio abrir» varia ao concelho, e a NUTS II escondia-o.      │
 * │ Medido nos dados que este módulo lê, para empresas de limpeza e     │
 * │ manutenção de edifícios (divisão 81), por dez mil habitantes:       │
 * │                                                                    │
 * │     Lisboa .....  8,3          Loulé ..... 84,5                     │
 * │     Mafra ...... 23,8          Espinho ...  5,9                     │
 * │                                                                    │
 * │ Lisboa e Mafra são a MESMA célula em NUTS II e diferem por um       │
 * │ fator de 2,9. Uma leitura de «Grande Lisboa» descreve um território │
 * │ que não é o de nenhum dos dois.                                     │
 * └────────────────────────────────────────────────────────────────────┘
 */
export type EscalaDaLeitura = "regiao" | "concelho";

export type ZonaDeAnalise =
  | { tipo: "regiao"; regiao: MarketRegion }
  | { tipo: "concelho"; codigo: string };

export interface LeituraDeOferta {
  divisoes: readonly string[];
  designacoes: readonly string[];
  /** A densidade da zona da pessoa. */
  aqui: DensidadeRegional;
  escala: EscalaDaLeitura;
  /** Mediana das unidades comparadas — o ponto de comparação. */
  medianaNacional: number;
  /** Desvio da zona face à média, em desvios-padrão. */
  z: number;
  /** Percentil da zona entre as unidades comparadas, 0–100. */
  percentil: number;
  /** Quantas unidades entraram na comparação. Abaixo de 5 não se conclui. */
  regioesComparadas: number;
  periodoOferta: string;
  periodoPopulacao: string;
}

const mediana = (valores: readonly number[]): number => {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0
    ? (ordenados[meio - 1]! + ordenados[meio]!) / 2
    : ordenados[meio]!;
};

/**
 * Densidade de operadores da zona, comparada com o resto do país.
 *
 * Devolve `null` — e não um número tímido — sempre que a comparação não
 * se sustenta: sem população, sem divisão mapeada, com menos de cinco
 * regiões, ou quando todas as regiões têm a mesma densidade (aí o desvio
 * padrão é zero e qualquer z seria uma divisão por zero disfarçada).
 */
export function lerOferta(
  pack: PackOferta,
  divisoesDaHipotese: readonly string[],
  zona: ZonaDeAnalise,
): LeituraDeOferta | null {
  if (divisoesDaHipotese.length === 0) return null;
  return zona.tipo === "concelho"
    ? lerAoConcelho(pack, divisoesDaHipotese, zona.codigo)
    : lerARegiao(pack, divisoesDaHipotese, zona.regiao);
}

/** A conta comum às duas escalas, para não haver duas aritméticas. */
function concluir(
  densidades: readonly DensidadeRegional[],
  aqui: DensidadeRegional,
  contexto: {
    divisoes: readonly string[];
    designacoes: readonly string[];
    escala: EscalaDaLeitura;
    periodoOferta: string;
    periodoPopulacao: string;
  },
): LeituraDeOferta | null {
  // Abaixo de cinco unidades não há distribuição de que falar, e um
  // desvio-padrão zero é uma divisão por zero disfarçada.
  if (densidades.length < 5) return null;
  const valores = densidades.map((item) => item.porDezMil);
  const media = valores.reduce((total, valor) => total + valor, 0) / valores.length;
  const variancia =
    valores.reduce((total, valor) => total + (valor - media) ** 2, 0) / valores.length;
  const desvio = Math.sqrt(variancia);
  if (desvio === 0) return null;

  // Percentil de mediana de posto: estável com empates, e é o que se
  // publica ao lado do z porque é o que se lê sem estatística.
  const abaixo = valores.filter((valor) => valor < aqui.porDezMil).length;
  const iguais = valores.filter((valor) => valor === aqui.porDezMil).length;

  return {
    divisoes: contexto.divisoes,
    designacoes: contexto.designacoes,
    aqui,
    escala: contexto.escala,
    medianaNacional: mediana(valores),
    z: (aqui.porDezMil - media) / desvio,
    percentil: Math.round(((abaixo + 0.5 * iguais) / valores.length) * 100),
    regioesComparadas: densidades.length,
    periodoOferta: contexto.periodoOferta,
    periodoPopulacao: contexto.periodoPopulacao,
  };
}

/**
 * A leitura ao CONCELHO — 308 unidades em vez de nove.
 *
 * Vem do instantâneo commitado (`oferta-concelhos.ts`) e não da chamada
 * ao vivo: 19,7 MB não cabem no caminho de um pedido. Ver o cabeçalho de
 * `scripts/gen-oferta-concelhos.mjs` para o que foi medido.
 */
function lerAoConcelho(
  pack: PackOferta,
  divisoesDaHipotese: readonly string[],
  codigo: string,
): LeituraDeOferta | null {
  const matriz = pack.concelhos;
  if (!matriz) return null;
  const indice = matriz.ordem.indexOf(codigo);
  if (indice < 0) return null;

  // Somar divisões é somar empresas distintas: a CAE atribui uma divisão
  // por empresa, portanto não há dupla contagem entre divisões.
  const designacoes: string[] = [];
  const somaPor = new Array<number>(matriz.ordem.length).fill(0);
  for (const divisao of divisoesDaHipotese) {
    const contagens = matriz.porDivisao[divisao];
    if (!contagens) return null;
    designacoes.push(DIVISOES_CAE.get(divisao) ?? divisao);
    for (let posicao = 0; posicao < contagens.length; posicao += 1) {
      somaPor[posicao] = somaPor[posicao]! + contagens[posicao]!;
    }
  }

  const densidades: DensidadeRegional[] = [];
  for (let posicao = 0; posicao < matriz.ordem.length; posicao += 1) {
    const habitantes = matriz.populacao[posicao]!;
    if (habitantes <= 0) continue;
    const concelho = CONCELHO_POR_CODIGO.get(matriz.ordem[posicao]!);
    if (!concelho) continue;
    densidades.push({
      regiao: concelho.regiao,
      codigo: concelho.codigo,
      nome: concelho.nome,
      operadores: somaPor[posicao]!,
      habitantes,
      porDezMil: (somaPor[posicao]! / habitantes) * 10_000,
    });
  }

  const aqui = densidades.find((item) => item.codigo === codigo);
  if (!aqui) return null;
  return concluir(densidades, aqui, {
    divisoes: divisoesDaHipotese,
    designacoes,
    escala: "concelho",
    periodoOferta: matriz.periodoEmpresas,
    periodoPopulacao: matriz.periodoPopulacao,
  });
}

/** A leitura às nove NUTS II, do pack ao vivo. É a que existia. */
function lerARegiao(
  pack: PackOferta,
  divisoesDaHipotese: readonly string[],
  regiao: MarketRegion,
): LeituraDeOferta | null {
  if (regiao === "portugal") return null;

  const codigoDaZona = MARKET_REGIONS.find((item) => item.id === regiao)?.nutsCode;
  if (!codigoDaZona) return null;

  const habitantesPor = new Map(pack.populacao.map((item) => [item.codigo, item]));

  const operadoresPor = new Map<string, number>();
  let periodoOferta = "";
  const designacoes: string[] = [];
  for (const divisao of divisoesDaHipotese) {
    const entrada = pack.divisoes.find((item) => item.divisao === divisao);
    if (!entrada || entrada.contagens.length === 0) return null;
    designacoes.push(entrada.designacao);
    for (const contagem of entrada.contagens) {
      operadoresPor.set(contagem.codigo, (operadoresPor.get(contagem.codigo) ?? 0) + contagem.valor);
      if (contagem.periodo > periodoOferta) periodoOferta = contagem.periodo;
    }
  }

  const densidades: DensidadeRegional[] = [];
  for (const definicao of MARKET_REGIONS) {
    if (definicao.nutsCode === null) continue;
    const operadores = operadoresPor.get(definicao.nutsCode);
    const habitantes = habitantesPor.get(definicao.nutsCode)?.valor;
    if (operadores === undefined || habitantes === undefined || habitantes <= 0) continue;
    densidades.push({
      regiao: definicao.id,
      codigo: definicao.nutsCode,
      nome: definicao.label,
      operadores,
      habitantes,
      porDezMil: (operadores / habitantes) * 10_000,
    });
  }

  const aqui = densidades.find((item) => item.codigo === codigoDaZona);
  if (!aqui) return null;
  return concluir(densidades, aqui, {
    divisoes: divisoesDaHipotese,
    designacoes,
    escala: "regiao",
    periodoOferta,
    periodoPopulacao: pack.populacao.find((item) => item.codigo === codigoDaZona)?.periodo ?? "",
  });
}

// ── O QUOCIENTE DE LOCALIZAÇÃO ───────────────────────────────────────

/**
 * Operadores por CLIENTE POSSÍVEL — a base que faltava.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ `motor/procura.ts` escreveu isto sobre si próprio, e esteve certo   │
 * │ durante todo o tempo em que foi verdade:                            │
 * │                                                                    │
 * │   «Para saber se a oferta é pouca ou muita é preciso compará-la     │
 * │    com a procura na MESMA base: operadores por habitante, por       │
 * │    cliente possível, por euro gasto. Duas séries com unidades       │
 * │    diferentes — uma taxa de ocupação e uma contagem de empresas —   │
 * │    não se subtraem.»                                                │
 * │                                                                    │
 * │ A densidade por habitante era metade do caminho: serve quando o     │
 * │ cliente é a população, e engana quando não é. Numa hipótese de      │
 * │ serviço a alojamento turístico, o denominador certo não são os      │
 * │ habitantes — são os alojamentos. Medido nos dados que este módulo   │
 * │ lê, operadores de limpeza por mil alojamentos:                      │
 * │                                                                    │
 * │     Albufeira ... 135          Lisboa ... 89                        │
 * │                                                                    │
 * │ Por habitante, Albufeira parecia muito mais servida do que Lisboa   │
 * │ (52,4 contra 8,3). Por cliente, a diferença encolhe para 1,5× —     │
 * │ porque Albufeira tem clientes a mais, não operadores a mais.        │
 * │ São conclusões opostas a partir dos mesmos números.                 │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * É o método canónico do Location Quotient, com o denominador que o
 * problema declara em vez de um genérico.
 */
export interface LeituraDeLacuna {
  /** Operadores da hipótese na zona. */
  operadores: number;
  /** Clientes possíveis na zona, na unidade declarada. */
  clientes: number;
  unidadeCliente: "empresas" | "residentes";
  /** Operadores por mil clientes. A base comparável. */
  porMilClientes: number;
  /** Mediana entre as unidades comparadas. */
  medianaNacional: number;
  /** Percentil da zona, 0–100. Acima de 50 é mercado mais servido. */
  percentil: number;
  z: number;
  escala: EscalaDaLeitura;
  nomeDaZona: string;
  unidadesComparadas: number;
  periodoEmpresas: string;
  /** O que a divisão dos clientes apanha para além deles. Vai ao ecrã. */
  ressalva?: string;
}

/** A base de clientes, na forma que esta camada sabe contar. */
export type BaseContavel =
  | { tipo: "empresas"; cae: readonly string[]; ressalva?: string }
  | { tipo: "residentes" };

/**
 * O quociente, ao concelho.
 *
 * Só ao concelho, e é deliberado: o pack ao vivo traz as nove NUTS II, e
 * nove unidades são poucas para um percentil dizer alguma coisa. Com 308
 * a distribuição tem forma. Quem não fixou concelho continua a receber a
 * densidade por habitante, que é o que recebia.
 */
export function lerLacuna(
  pack: PackOferta,
  divisoesDoOperador: readonly string[],
  base: BaseContavel,
  codigoDoConcelho: string,
): LeituraDeLacuna | null {
  const matriz = pack.concelhos;
  if (!matriz || divisoesDoOperador.length === 0) return null;
  const indice = matriz.ordem.indexOf(codigoDoConcelho);
  if (indice < 0) return null;

  const somar = (divisoes: readonly string[]): readonly number[] | null => {
    const total = new Array<number>(matriz.ordem.length).fill(0);
    for (const divisao of divisoes) {
      const contagens = matriz.porDivisao[divisao];
      // Uma divisão em falta devolve `null` e não zero: zero clientes
      // produziria uma divisão por zero, e zero operadores lê-se como
      // mercado livre. Os dois erros promovem a hipótese por engano.
      if (!contagens) return null;
      for (let posicao = 0; posicao < contagens.length; posicao += 1) {
        total[posicao] = total[posicao]! + contagens[posicao]!;
      }
    }
    return total;
  };

  const operadores = somar(divisoesDoOperador);
  if (!operadores) return null;
  const clientes = base.tipo === "residentes" ? matriz.populacao : somar(base.cae);
  if (!clientes) return null;

  const razoes: { posicao: number; valor: number }[] = [];
  for (let posicao = 0; posicao < matriz.ordem.length; posicao += 1) {
    const denominador = clientes[posicao]!;
    // Um concelho sem clientes não entra na distribuição. Entrar com
    // `Infinity` puxaria a média e o desvio para valores sem sentido.
    if (denominador <= 0) continue;
    razoes.push({ posicao, valor: (operadores[posicao]! / denominador) * 1000 });
  }
  if (razoes.length < 5) return null;

  const aqui = razoes.find((item) => item.posicao === indice);
  if (!aqui) return null;

  const valores = razoes.map((item) => item.valor);
  const media = valores.reduce((total, valor) => total + valor, 0) / valores.length;
  const variancia =
    valores.reduce((total, valor) => total + (valor - media) ** 2, 0) / valores.length;
  const desvio = Math.sqrt(variancia);
  if (desvio === 0) return null;

  const abaixo = valores.filter((valor) => valor < aqui.valor).length;
  const iguais = valores.filter((valor) => valor === aqui.valor).length;

  return {
    operadores: operadores[indice]!,
    clientes: clientes[indice]!,
    unidadeCliente: base.tipo === "residentes" ? "residentes" : "empresas",
    porMilClientes: aqui.valor,
    medianaNacional: mediana(valores),
    percentil: Math.round(((abaixo + 0.5 * iguais) / valores.length) * 100),
    z: (aqui.valor - media) / desvio,
    escala: "concelho",
    nomeDaZona: CONCELHO_POR_CODIGO.get(codigoDoConcelho)?.nome ?? codigoDoConcelho,
    unidadesComparadas: razoes.length,
    periodoEmpresas: matriz.periodoEmpresas,
    ressalva: base.tipo === "empresas" ? base.ressalva : undefined,
  };
}
