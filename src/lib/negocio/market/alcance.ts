// ═══════════════════════════════════════════════════════════════════════
//  O TERRITÓRIO QUE O ALCANCE DECLARADO ABRANGE
//  ---------------------------------------------------------------------
//  ┌────────────────────────────────────────────────────────────────────┐
//  │ A MEDIÇÃO QUE OBRIGOU A ESCREVER ISTO                               │
//  │                                                                    │
//  │ «Onde vais operar» tem cinco controlos. Corrido o motor com tudo o │
//  │ resto fixo, mudando um de cada vez:                                 │
//  │                                                                    │
//  │   alcance   concelho = região = nacional, resultado IDÊNTICO;      │
//  │             só «online» produzia alguma diferença ...... 1 em 4    │
//  │   raio      10 = 25 = 40 = 80 km, exceto 10 km em rural . 1 em 4   │
//  │                                                                    │
//  │ A pessoa que escreveu «parece que não altera em nada» estava a ler │
//  │ o produto corretamente. A causa não era a interface: o motor não   │
//  │ tinha geografia com que responder. Sabia a que REGIÃO pertence     │
//  │ cada concelho e não sabia ONDE ele fica, e sem isso um raio de     │
//  │ 25 km não pode significar coisa nenhuma.                            │
//  └────────────────────────────────────────────────────────────────────┘
//
//  ── O QUE ESTE MÓDULO FAZ, E O QUE SE RECUSA A FAZER ────────────────
//  Faz uma coisa só: dada a localização declarada, devolve QUE
//  CONCELHOS ficam dentro dela. Não pontua, não conclui, não estima
//  procura. O território alcançável é depois usado como a ZONA sobre a
//  qual a densidade de operadores é medida — e é aí que o alcance e o
//  raio passam a mover números reais, porque mudam o denominador de uma
//  conta que já existia, em vez de acrescentarem um bónus inventado.
//
//  A distância é a de um círculo sobre a esfera entre as SEDES dos
//  concelhos. Não é a distância por estrada, e o ecrã tem de o dizer:
//  no Alentejo a estrada é próxima da reta, no Douro não é. É por isso
//  que o resultado se chama «alcançável», e não «a 25 minutos».
// ═══════════════════════════════════════════════════════════════════════

import geo from "./bulk/dados/concelhos-geo.json";
import { CONCELHOS, CONCELHO_POR_CODIGO, concelhosDaRegiao } from "./concelhos";
import { marketRegionLabel, type MarketRegion } from "./geografia";
import { MATRIZ_CONCELHOS } from "./oferta-concelhos";

export interface SedeDeConcelho {
  codigo: string;
  lat: number;
  lng: number;
}

interface DocumentoGeo {
  schemaVersion: number;
  ponto: string;
  metodo: string;
  fonte: string;
  licenca: string;
  licencaUrl: string;
  concelhos: readonly SedeDeConcelho[];
}

const documento = geo as unknown as DocumentoGeo;

/**
 * A proveniência das sedes, para quem mostrar uma distância no ecrã.
 *
 * Vai junto com o número por regra da casa: um raio calculado sobre
 * pontos sem origem declarada é um número com ar de facto.
 */
export const SEDES_FONTE = Object.freeze({
  ponto: documento.ponto,
  metodo: documento.metodo,
  fonte: documento.fonte,
  licenca: documento.licenca,
  licencaUrl: documento.licencaUrl,
});

/**
 * As sedes, indexadas pelo código do INE.
 *
 * Um ficheiro incompleto NÃO é aceite pela metade: sem os 308, um raio
 * daria certo numa parte do país e falharia calado na outra, que é a
 * pior das duas maneiras de estar errado. O gerador já se recusa a
 * escrever um ficheiro incompleto; aqui confirma-se do lado de quem lê.
 */
export const SEDES: ReadonlyMap<string, SedeDeConcelho> = (() => {
  const mapa = new Map<string, SedeDeConcelho>();
  if (documento?.schemaVersion !== 1 || !Array.isArray(documento.concelhos)) return mapa;
  for (const sede of documento.concelhos) {
    if (typeof sede?.codigo !== "string") continue;
    if (!Number.isFinite(sede.lat) || !Number.isFinite(sede.lng)) continue;
    if (!CONCELHO_POR_CODIGO.has(sede.codigo)) continue;
    mapa.set(sede.codigo, sede);
  }
  return mapa.size === CONCELHOS.length ? mapa : new Map<string, SedeDeConcelho>();
})();

/** Há geografia carregada? `false` degrada tudo o resto para «sem raio». */
export const TEM_GEOGRAFIA = SEDES.size > 0;

/** Distância em quilómetros entre dois pontos, pela fórmula do semiverseno. */
export function distanciaKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const rad = (graus: number) => (graus * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** O concelho cuja sede está mais perto de um ponto. Para GPS e pesquisa. */
export function concelhoMaisProximo(ponto: { lat: number; lng: number }): string | null {
  let melhor: { codigo: string; distancia: number } | null = null;
  for (const sede of SEDES.values()) {
    const distancia = distanciaKm(ponto, sede);
    if (melhor === null || distancia < melhor.distancia) {
      melhor = { codigo: sede.codigo, distancia };
    }
  }
  return melhor?.codigo ?? null;
}

export interface ConcelhoAlcancado {
  codigo: string;
  nome: string;
  /** Quilómetros entre as duas sedes. Zero para o próprio. */
  distanciaKm: number;
}

/**
 * Os concelhos cuja sede fica dentro do raio, o próprio incluído.
 *
 * Ordenados por distância. Um raio que não apanha ninguém devolve só o
 * concelho de partida — nunca uma lista vazia, que se leria como «não
 * chegas a lado nenhum» quando o que se passa é que estás sozinho lá.
 */
export function concelhosNoRaio(codigoCentro: string, raioKm: number): readonly ConcelhoAlcancado[] {
  const centro = SEDES.get(codigoCentro);
  if (!centro || !(raioKm > 0)) return [];
  const dentro: ConcelhoAlcancado[] = [];
  for (const sede of SEDES.values()) {
    const distancia = sede.codigo === codigoCentro ? 0 : distanciaKm(centro, sede);
    if (distancia > raioKm) continue;
    dentro.push({
      codigo: sede.codigo,
      nome: CONCELHO_POR_CODIGO.get(sede.codigo)?.nome ?? sede.codigo,
      distanciaKm: Math.round(distancia * 10) / 10,
    });
  }
  dentro.sort(
    (esquerda, direita) =>
      esquerda.distanciaKm - direita.distanciaKm ||
      esquerda.nome.localeCompare(direita.nome, "pt-PT"),
  );
  return dentro;
}

/** Como o território foi delimitado. Vai ao ecrã, porque muda o sentido. */
export type BaseDoAlcance = "concelho" | "raio" | "regiao" | "pais";

export interface TerritorioAlcancavel {
  /** Códigos INE dos concelhos abrangidos. Vazio = país inteiro. */
  codigos: readonly string[];
  base: BaseDoAlcance;
  /** Nome legível do território. «25 km à volta de Loulé», «Algarve». */
  nome: string;
  /** Os concelhos com a distância, quando a base é o raio. */
  noRaio: readonly ConcelhoAlcancado[];
  /**
   * Porque é que o raio declarado não entrou nesta conta, quando não
   * entrou. `null` quando entrou ou quando não há raio declarado.
   */
  raioIgnorado: string | null;
}

export interface LocalizacaoDoAlcance {
  regiao: MarketRegion;
  concelho?: string;
  alcance: "bairro" | "concelho" | "regiao" | "nacional" | "internacional" | "online";
  raioKm?: number;
}

const TODO_O_PAIS: readonly string[] = Object.freeze(CONCELHOS.map((item) => item.codigo));

/**
 * O território que o alcance declarado abrange, em concelhos.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ AS REGRAS, E PORQUE SÃO ESTAS                                       │
 * │                                                                    │
 * │ · «online» ignora o raio. Quem entrega remotamente não percorre    │
 * │   quilómetros, e deixar o raio cortar o mercado de um negócio      │
 * │   remoto seria uma penalização por uma resposta irrelevante.       │
 * │ · O raio, quando aplicável, MANDA sobre o alcance — mas nunca      │
 * │   ultrapassa a fronteira que o alcance declarou: quem disse «o meu │
 * │   concelho» e 80 km não passou a querer trabalhar a 80 km.         │
 * │ · Sem concelho escolhido não há centro, e sem centro não há        │
 * │   círculo. Recua-se ao alcance, e diz-se porquê.                    │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * `entregaRemota` deixa quem chama declarar que ESTA hipótese se entrega
 * sem deslocação — é por hipótese, não por pessoa, e é o que faz o mesmo
 * raio pesar num trabalho presencial e não pesar num remoto.
 */
export function territorioAlcancavel(
  localizacao: LocalizacaoDoAlcance,
  opcoes: { entregaRemota?: boolean } = {},
): TerritorioAlcancavel {
  const { regiao, concelho, alcance, raioKm } = localizacao;
  const remoto = alcance === "online" || opcoes.entregaRemota === true;

  const daRegiao = () =>
    regiao === "portugal"
      ? TODO_O_PAIS
      : concelhosDaRegiao(regiao).map((item) => item.codigo);

  const nomeDaRegiao = () =>
    regiao === "portugal" ? "todo o país" : marketRegionLabel(regiao);

  // 1. O que o alcance declara, sem raio nenhum.
  const semRaio: { codigos: readonly string[]; base: BaseDoAlcance; nome: string } =
    alcance === "nacional" || alcance === "internacional" || alcance === "online"
      ? { codigos: TODO_O_PAIS, base: "pais", nome: "todo o país" }
      : alcance === "regiao"
        ? { codigos: daRegiao(), base: "regiao", nome: nomeDaRegiao() }
        : concelho
          ? {
              codigos: [concelho],
              base: "concelho",
              nome: CONCELHO_POR_CODIGO.get(concelho)?.nome ?? concelho,
            }
          : { codigos: daRegiao(), base: "regiao", nome: nomeDaRegiao() };

  // 2. O raio, quando há um e quando faz sentido aplicá-lo.
  let raioIgnorado: string | null = null;
  if (raioKm !== undefined && raioKm > 0) {
    if (remoto) {
      raioIgnorado =
        alcance === "online"
          ? "Declaraste operar só online: o raio não corta um mercado que não se percorre."
          : "Esta hipótese entrega-se sem deslocação, e o raio não a limita.";
    } else if (!TEM_GEOGRAFIA) {
      raioIgnorado = "Sem as sedes dos concelhos carregadas não é possível desenhar o círculo.";
    } else if (!concelho) {
      raioIgnorado = "Um raio precisa de um centro — escolhe o concelho de onde partes.";
    } else if (alcance === "concelho" || alcance === "bairro") {
      // O alcance é mais apertado do que o círculo: o raio não tem por
      // onde alargar. Dizê-lo é melhor do que devolver «40 km à volta
      // de Loulé» para um território que é só Loulé — um nome que
      // promete uma coisa e entrega outra.
      raioIgnorado = `Declaraste operar em «${alcance === "bairro" ? "o meu bairro" : "o meu concelho"}»: o raio não alarga a análise para lá dele. Escolhe «a minha região» ou «todo o país» para o círculo contar.`;
    } else {
      const dentro = concelhosNoRaio(concelho, raioKm);
      if (dentro.length > 0) {
        // O círculo nunca ultrapassa a fronteira que o alcance declarou.
        const permitidos = new Set(semRaio.codigos);
        const cortados = dentro.filter((item) => permitidos.has(item.codigo));
        const finais = cortados.length > 0 ? cortados : dentro.filter((item) => item.codigo === concelho);
        const nomeDoCentro = CONCELHO_POR_CODIGO.get(concelho)?.nome ?? concelho;
        return {
          codigos: finais.map((item) => item.codigo),
          base: "raio",
          nome: `${raioKm} km à volta de ${nomeDoCentro}`,
          noRaio: finais,
          raioIgnorado: null,
        };
      }
    }
  }

  return { codigos: semRaio.codigos, base: semRaio.base, nome: semRaio.nome, noRaio: [], raioIgnorado };
}

// ── Quanta gente cabe no território ────────────────────────────────────

export interface EscalaDoTerritorio {
  /** Soma da população residente dos concelhos abrangidos. */
  residentes: number;
  /**
   * Onde essa soma cai na distribuição dos 308 concelhos, 0–100.
   *
   * Não é o percentil de um concelho: é o de um TERRITÓRIO comparado
   * com concelhos individuais. Quem o mostra tem de o dizer assim —
   * «tens tanta gente ao teu alcance como um concelho no percentil 74».
   */
  percentil: number;
  comparados: number;
  periodo: string;
}

const populacaoOrdenada: number[] = (() => {
  const matriz = MATRIZ_CONCELHOS;
  if (!matriz) return [];
  return [...matriz.populacao].filter((valor) => valor > 0).sort((a, b) => a - b);
})();

/**
 * Código do concelho → posição na matriz, indexado uma vez.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO NÃO É MICRO-OTIMIZAÇÃO                                  │
 * │                                                                    │
 * │ `indiceDoConcelho` é um `indexOf` sobre 308 códigos. A escala de   │
 * │ um território nacional precisa de 308 posições, o que dá 95 000    │
 * │ comparações de string — por CANDIDATO. O score corre isto para     │
 * │ centenas de candidatos, e o painel de impacto corre o motor        │
 * │ inteiro dezasseis vezes. Medido, era o dobro do tempo do painel.   │
 * └────────────────────────────────────────────────────────────────────┘
 */
const POSICAO_NA_MATRIZ: ReadonlyMap<string, number> = (() => {
  const mapa = new Map<string, number>();
  const matriz = MATRIZ_CONCELHOS;
  if (matriz) matriz.ordem.forEach((codigo, posicao) => mapa.set(codigo, posicao));
  return mapa;
})();

/**
 * A escala de cada território, calculada uma vez por território.
 *
 * O gerador partilha o MESMO objeto de território entre todos os
 * candidatos da mesma variante, pelo que a chave fraca acerta quase
 * sempre — e o que se poupa é a soma de até 308 populações por
 * candidato.
 */
const escalasEmCache = new WeakMap<object, EscalaDoTerritorio | null>();

export function escalaDoTerritorio(
  territorio: Pick<TerritorioAlcancavel, "codigos">,
): EscalaDoTerritorio | null {
  const matriz = MATRIZ_CONCELHOS;
  if (!matriz || populacaoOrdenada.length < 5 || territorio.codigos.length === 0) return null;

  const chave = territorio.codigos as unknown as object;
  const guardada = escalasEmCache.get(chave);
  if (guardada !== undefined) return guardada;

  let residentes = 0;
  for (const codigo of territorio.codigos) {
    const indice = POSICAO_NA_MATRIZ.get(codigo);
    if (indice === undefined) continue;
    residentes += matriz.populacao[indice] ?? 0;
  }
  if (residentes <= 0) {
    escalasEmCache.set(chave, null);
    return null;
  }

  let abaixo = 0;
  let iguais = 0;
  for (const valor of populacaoOrdenada) {
    if (valor < residentes) abaixo += 1;
    else if (valor === residentes) iguais += 1;
  }
  const escala: EscalaDoTerritorio = {
    residentes,
    percentil: Math.round(((abaixo + 0.5 * iguais) / populacaoOrdenada.length) * 100),
    comparados: populacaoOrdenada.length,
    periodo: matriz.periodoPopulacao,
  };
  escalasEmCache.set(chave, escala);
  return escala;
}
