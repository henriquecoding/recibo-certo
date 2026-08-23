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
import type { MarketObservationLicense } from "./tipos";
import { DIVISOES_CAE } from "../descoberta/conhecimento/dados/divisoes-cae";
import { DIVISOES_USADAS } from "../descoberta/conhecimento/dados/ontologia";

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
  const pedidas = opcoes.divisoes && opcoes.divisoes.length > 0 ? opcoes.divisoes : DIVISOES_USADAS;
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
  const populacaoBruta = await promessaResolvida(() =>
    comTentativas(
      (sinal) => pedir(POPULACAO_RESIDENTE, opcoes, { Dim3: ["T"], Dim4: ["T"] }, sinal),
      tentativas,
      opcoes.signal,
    ),
  );
  const empresas = await promessaResolvida(() =>
    comTentativas(
      (sinal) => pedir(EMPRESAS_POR_CAE, opcoes, { Dim3: pedidas }, sinal),
      tentativas,
      opcoes.signal,
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
  operadores: number;
  habitantes: number;
  /** Operadores por dez mil habitantes. A base comum. */
  porDezMil: number;
}

export interface LeituraDeOferta {
  divisoes: readonly string[];
  designacoes: readonly string[];
  /** A densidade da zona da pessoa. */
  aqui: DensidadeRegional;
  /** Mediana das nove NUTS II — o ponto de comparação. */
  medianaNacional: number;
  /** Desvio da zona face à mediana, em desvios-padrão. */
  z: number;
  /** Quantas regiões entraram na comparação. Abaixo de 5 não se conclui. */
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
  regiao: MarketRegion,
): LeituraDeOferta | null {
  if (divisoesDaHipotese.length === 0) return null;
  if (regiao === "portugal") return null;

  const codigoDaZona = MARKET_REGIONS.find((item) => item.id === regiao)?.nutsCode;
  if (!codigoDaZona) return null;

  const habitantesPor = new Map(pack.populacao.map((item) => [item.codigo, item]));

  // Somar divisões é somar empresas distintas: a CAE atribui uma divisão
  // por empresa, portanto não há dupla contagem entre divisões.
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
      operadores,
      habitantes,
      porDezMil: (operadores / habitantes) * 10_000,
    });
  }

  if (densidades.length < 5) return null;
  const aqui = densidades.find((item) => item.codigo === codigoDaZona);
  if (!aqui) return null;

  const valores = densidades.map((item) => item.porDezMil);
  const media = valores.reduce((total, valor) => total + valor, 0) / valores.length;
  const variancia =
    valores.reduce((total, valor) => total + (valor - media) ** 2, 0) / valores.length;
  const desvio = Math.sqrt(variancia);
  if (desvio === 0) return null;

  return {
    divisoes: divisoesDaHipotese,
    designacoes,
    aqui,
    medianaNacional: mediana(valores),
    z: (aqui.porDezMil - media) / desvio,
    regioesComparadas: densidades.length,
    periodoOferta,
    periodoPopulacao:
      pack.populacao.find((item) => item.codigo === codigoDaZona)?.periodo ?? "",
  };
}
