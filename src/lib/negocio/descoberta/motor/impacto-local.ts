// ═══════════════════════════════════════════════════════════════════════
//  O QUE CADA RESPOSTA DE LOCALIZAÇÃO MUDA — contado, não prometido
//  ---------------------------------------------------------------------
//  ┌────────────────────────────────────────────────────────────────────┐
//  │ O DEFEITO QUE ISTO CORRIGE, E É DE PRODUTO                          │
//  │                                                                    │
//  │ «Onde vais operar» tem cinco controlos e nenhum deles diz o que    │
//  │ faz. Medido, com tudo o resto fixo:                                 │
//  │                                                                    │
//  │   zona        procura pontuada em 0 → 4 hipóteses; geografia       │
//  │               70 → 100; a pontuação varia 73–85 CONSOANTE a região │
//  │   concelho    leitura de concorrência em 0 → 4; Lisboa 85 · Cascais│
//  │               81 na mesma hipótese                                  │
//  │   território  geografia 85 → 100 (urbano) ou 85 → 35 (rural)       │
//  │   raio        com rural, 10 km leva a geografia a 24               │
//  │   alcance     troca a ENTREGA das hipóteses: presencial → híbrido  │
//  │                                                                    │
//  │ Ou seja: o motor responde a tudo. Só que a lista continua a ter os │
//  │ mesmos títulos, e quem olha conclui — com razão — que não mudou    │
//  │ nada. O caso do alcance é o mais enganador de todos: o motor troca │
//  │ silenciosamente a forma de entrega de todas as hipóteses e o cartão│
//  │ nunca o diz.                                                        │
//  └────────────────────────────────────────────────────────────────────┘
//
//  ── A REGRA DESTE FICHEIRO ─────────────────────────────────────────
//  Nenhuma frase daqui é escrita à mão sobre o que «costuma» mudar. Cada
//  número sai de correr o motor a sério com a resposta posta e com ela
//  tirada, e de comparar. É o mesmo princípio de `bloqueiosPorMeio`, que
//  já conta hipóteses correndo o pipeline em vez de as estimar — e pela
//  mesma razão: uma promessa que a análise depois não cumpre é pior do
//  que não prometer nada.
//
//  Quando um campo não muda nada NESTE contexto, isto di-lo. É uma
//  resposta útil: poupa a pessoa a uma decisão que não paga.
// ═══════════════════════════════════════════════════════════════════════

import { MARKET_REGIONS, type MarketRegion } from "@/lib/negocio/market/geografia";
import {
  escalaDoTerritorio,
  territorioAlcancavel,
  type BaseDoAlcance,
} from "@/lib/negocio/market/alcance";
import { PROBLEMAS } from "../conhecimento/dados/problemas";
import type { PackOferta } from "@/lib/negocio/market/oferta";
import type { MarketPilotEvidence } from "@/lib/negocio/market/opportunities";
import type { AlcanceOperacional, OpportunityContext, TipoTerritorio } from "../contexto/tipos";
import { descobrir } from "./pipeline";
import type { OpportunityCandidate } from "./tipos";

export type CampoLocal = "zona" | "concelho" | "territorio" | "alcance" | "raio";

/** Quanto pesa a resposta. Decide a ordem e o destaque no ecrã. */
export type PesoDoCampo = "decisivo" | "importante" | "ajuste" | "sem-efeito";

export interface EfeitoDeCampo {
  campo: CampoLocal;
  rotulo: string;
  respondido: boolean;
  peso: PesoDoCampo;
  /** A frase que vai ao ecrã. Construída a partir dos números medidos. */
  frase: string;
  /**
   * O que faria esta resposta passar a contar, quando ela não conta.
   *
   * ┌────────────────────────────────────────────────────────────────┐
   * │ A QUEIXA QUE ISTO RESOLVE                                       │
   * │                                                                │
   * │ «Onde vai operar diz que nada do que configurar importa, e     │
   * │ isso é falho, pois onde vais operar influencia completamente.» │
   * │                                                                │
   * │ Estava certa duas vezes. O motor não lia metade destes campos  │
   * │ — isso corrigiu-se em `market/alcance.ts`. E o painel, quando  │
   * │ media zero, dizia «não muda nada» e ficava por aí: uma frase   │
   * │ verdadeira e inútil, que se lê como a ferramenta a declarar    │
   * │ inúteis as suas próprias perguntas.                             │
   * │                                                                │
   * │ Um campo pode não contar AQUI e contar noutra combinação. Essa │
   * │ é a informação que falta, e é esta linha.                       │
   * └────────────────────────────────────────────────────────────────┘
   */
  condicao: string | null;
  /** Quantas hipóteses ganham leitura de PROCURA se isto for respondido. */
  ganhaProcura: number;
  /** Quantas ganham leitura de CONCORRÊNCIA. */
  ganhaConcorrencia: number;
  /** Quantas mudam de pontuação — em qualquer direção. */
  mudaPontuacao: number;
  /** Quantas mudam de FORMA DE ENTREGA. É o efeito próprio do alcance. */
  mudaEntrega: number;
}

/** O mercado que as respostas atuais deixam alcançar. Medido, não estimado. */
export interface TerritorioResumido {
  nome: string;
  base: BaseDoAlcance;
  concelhos: number;
  residentes: number | null;
  percentil: number | null;
  /** Os mais próximos do centro, quando o território é um círculo. */
  noRaio: readonly { nome: string; distanciaKm: number }[];
  raioIgnorado: string | null;
}

export interface ImpactoDaLocalizacao {
  efeitos: readonly EfeitoDeCampo[];
  /** Onde estas respostas te põem, em concelhos e em pessoas. */
  territorio: TerritorioResumido | null;
  /** Hipóteses na corrida atual. O denominador de tudo o resto. */
  hipotesesAgora: number;
  /** O campo por responder que mais paga, quando há algum. */
  proximoPasso: EfeitoDeCampo | null;
}

/** Como o alcance se chama numa frase. O mesmo texto que está no botão. */
const ALCANCES: Readonly<Record<string, string>> = Object.freeze({
  bairro: "o meu bairro",
  concelho: "o meu concelho",
  regiao: "a minha região",
  nacional: "todo o país",
  internacional: "fora de Portugal",
  online: "só online",
});
const rotuloDoAlcance = (alcance: string) => ALCANCES[alcance] ?? alcance;

const ROTULOS: Readonly<Record<CampoLocal, string>> = Object.freeze({
  zona: "Zona",
  concelho: "Concelho",
  territorio: "Território",
  alcance: "Alcance",
  raio: "Raio",
});

interface Entrada {
  contexto: OpportunityContext;
  evidencia?: readonly MarketPilotEvidence[];
  oferta?: PackOferta;
  agora?: () => string;
  /** Concelho a usar quando se quer medir o que ele traria. */
  concelhoParaTeste?: string;
}

/**
 * Uma corrida do motor reduzida ao que interessa comparar.
 *
 * `semBloqueios` é obrigatório aqui: cada uma destas corridas é já uma
 * simulação, e deixá-la calcular os bloqueios por meio faria o pipeline
 * chamar-se a si próprio mais uma vez por campo — o mesmo travão de
 * recursão que `bloqueiosPorMeio` usa, pela mesma razão.
 */
function correr(entrada: Entrada, localizacao: OpportunityContext["localizacao"]) {
  const resultado = descobrir(
    { ...entrada.contexto, localizacao },
    {
      evidencia: entrada.evidencia,
      oferta: entrada.oferta,
      agora: entrada.agora,
      limite: 12,
      semBloqueios: true,
    },
  );
  return resultado.candidatos;
}

/**
 * A identidade de uma hipótese ATRAVÉS das corridas.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ PORQUE NÃO SE USA O `id`                                            │
 * │                                                                    │
 * │ `gerador.ts` compõe-o assim:                                        │
 * │     problema :: modelo :: ENTREGA :: REGIÃO                         │
 * │                                                                    │
 * │ Os dois últimos são precisamente o que estas simulações fazem       │
 * │ variar. Comparar por `id` fazia toda a hipótese parecer NOVA quando │
 * │ só tinha mudado a zona ou a forma de entrega — e a primeira versão  │
 * │ deste ficheiro caiu nisso: dizia «o alcance traz até 4 hipóteses    │
 * │ diferentes» quando eram as mesmas quatro, recompostas de presencial │
 * │ para híbrido, e dizia que fixar a zona não ligava procura nenhuma   │
 * │ quando liga as quatro.                                              │
 * │                                                                    │
 * │ O par problema × modelo é o que se mantém: é A MESMA aposta, feita  │
 * │ noutro sítio ou entregue de outra maneira.                          │
 * └────────────────────────────────────────────────────────────────────┘
 */
function identidade(candidato: OpportunityCandidate): string {
  return `${candidato.problema.id}::${candidato.modelo.id}`;
}

/** Primeira ocorrência de cada hipótese — a mais bem classificada. */
function porId(candidatos: readonly OpportunityCandidate[]) {
  const mapa = new Map<string, OpportunityCandidate>();
  for (const item of candidatos) {
    const chave = identidade(item);
    if (!mapa.has(chave)) mapa.set(chave, item);
  }
  return mapa;
}

interface Diferenca {
  ganhaProcura: number;
  ganhaConcorrencia: number;
  mudaPontuacao: number;
  mudaEntrega: number;
  novas: number;
}

/**
 * O que a segunda corrida tem que a primeira não tinha.
 *
 * Compara hipótese a hipótese pelo id — comparar totais esconderia uma
 * troca em que uma entra e outra sai.
 */
function diferenca(
  antes: readonly OpportunityCandidate[],
  depois: readonly OpportunityCandidate[],
): Diferenca {
  const mapaAntes = porId(antes);
  let ganhaProcura = 0;
  let ganhaConcorrencia = 0;
  let mudaPontuacao = 0;
  let mudaEntrega = 0;
  let novas = 0;

  const vistas = new Set<string>();
  for (const candidato of depois) {
    const chave = identidade(candidato);
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    const anterior = mapaAntes.get(chave);
    if (!anterior) {
      novas += 1;
      continue;
    }
    if (anterior.scores.procura === null && candidato.scores.procura !== null) ganhaProcura += 1;
    if (anterior.procura.leitura === "desconhecida" && candidato.procura.leitura !== "desconhecida") {
      ganhaConcorrencia += 1;
    }
    if (anterior.pontuacaoGlobal !== candidato.pontuacaoGlobal) mudaPontuacao += 1;
    if (anterior.entrega !== candidato.entrega) mudaEntrega += 1;
  }
  return { ganhaProcura, ganhaConcorrencia, mudaPontuacao, mudaEntrega, novas };
}

const plural = (n: number, uma: string, muitas: string) => (n === 1 ? uma : muitas);
const hipoteses = (n: number) => `${n} ${plural(n, "hipótese", "hipóteses")}`;

function pesoDe(d: Diferenca): PesoDoCampo {
  if (d.ganhaProcura > 0 || d.ganhaConcorrencia > 0) return "decisivo";
  if (d.mudaEntrega > 0 || d.novas > 0) return "importante";
  if (d.mudaPontuacao > 0) return "ajuste";
  return "sem-efeito";
}

/**
 * O efeito da ZONA, medido nas nove regiões e não numa escolhida à sorte.
 *
 * Qual região a pessoa vai escolher é precisamente o que não sabemos. Dar
 * o número de uma só seria uma promessa que as outras oito não cumprem;
 * a mediana das nove é o que se pode dizer com verdade sobre «responder».
 */
function efeitoDaZona(entrada: Entrada, atual: readonly OpportunityCandidate[]): EfeitoDeCampo {
  const { localizacao } = entrada.contexto;
  const respondido = localizacao.regiao !== "portugal";

  if (respondido) {
    // Já respondida: o que se mede é o que ela está a dar, contra não a ter.
    const semZona = correr(entrada, { ...localizacao, regiao: "portugal", concelho: undefined });
    const d = diferenca(semZona, atual);
    return {
      campo: "zona",
      rotulo: ROTULOS.zona,
      respondido: true,
      peso: pesoDe(d),
      ganhaProcura: d.ganhaProcura,
      ganhaConcorrencia: d.ganhaConcorrencia,
      mudaPontuacao: d.mudaPontuacao,
      mudaEntrega: d.mudaEntrega,
      condicao:
        pesoDe(d) === "sem-efeito"
          ? "As séries oficiais que cobrem estas hipóteses ainda são nacionais. Muda quando o problema tiver uma série publicada por região."
          : null,
      frase:
        d.ganhaProcura > 0
          ? `É esta resposta que liga a leitura de procura em ${hipoteses(d.ganhaProcura)}. Sem ela, nenhuma teria.`
          : d.mudaPontuacao > 0
            ? `Muda a pontuação de ${hipoteses(d.mudaPontuacao)} face a não fixar zona.`
            : "As séries oficiais desta zona ainda não distinguem estas hipóteses.",
    };
  }

  // Por responder: medir nas nove, e reportar a mediana.
  const regioes = MARKET_REGIONS.filter((item) => item.nutsCode !== null).map((item) => item.id);
  const ganhos: number[] = [];
  const nascidas: number[] = [];
  let mudancas = 0;
  for (const regiao of regioes) {
    const d = diferenca(atual, correr(entrada, { ...localizacao, regiao: regiao as MarketRegion }));
    ganhos.push(d.ganhaProcura);
    nascidas.push(d.novas);
    mudancas = Math.max(mudancas, d.mudaPontuacao);
  }
  const medianaDe = (valores: number[]) => {
    const ordenados = [...valores].sort((a, b) => a - b);
    return ordenados[Math.floor(ordenados.length / 2)] ?? 0;
  };
  const mediana = medianaDe(ganhos);
  // ── HIPÓTESES QUE SÓ EXISTEM DEPOIS DE HAVER ZONA ─────────────────
  //  Vinte e cinco dos vinte e oito problemas são nacionais, mas três
  //  não são: `terreno-por-manter` declara Alentejo, Centro, Norte e
  //  Algarve, e exclui Lisboa de propósito — terreno de proprietário
  //  ausente é um problema do interior. Para quem só declara jardinagem,
  //  fixar a zona não melhora a análise: FÁ-LA existir.
  //
  //  A primeira versão só contava a procura ligada e ficava calada
  //  precisamente nesse caso — o caso em que tinha mais para dizer.
  const nasce = medianaDe(nascidas);

  const d: Diferenca = {
    ganhaProcura: mediana,
    ganhaConcorrencia: 0,
    mudaPontuacao: mudancas,
    mudaEntrega: 0,
    novas: nasce,
  };
  return {
    campo: "zona",
    rotulo: ROTULOS.zona,
    respondido: false,
    peso: pesoDe(d),
    ganhaProcura: mediana,
    ganhaConcorrencia: 0,
    mudaPontuacao: mudancas,
    mudaEntrega: 0,
    condicao: null,
    frase:
      atual.length === 0 && nasce > 0
        ? `Sem zona fixada não há hipótese nenhuma para o que declaraste — há problemas que só existem em parte do país. Escolher a zona faz aparecer cerca de ${hipoteses(nasce)}.`
        : mediana > 0
          ? `Fixar a zona liga a leitura de procura em ${hipoteses(mediana)} — é a mediana das nove regiões, medida agora. Sem zona, o motor não tem contra o que comparar e o eixo fica sem pontuar.`
          : nasce > 0
            ? `Fixar a zona faz aparecer cerca de ${hipoteses(nasce)} que hoje não vês: há problemas que só existem em parte do país.`
            : "Fixar a zona decide que leituras oficiais são tuas e quais entram como contexto nacional.",
  };
}

/** O efeito do CONCELHO, medido com um concelho real da região escolhida. */
function efeitoDoConcelho(
  entrada: Entrada,
  atual: readonly OpportunityCandidate[],
): EfeitoDeCampo | null {
  const { localizacao } = entrada.contexto;
  // Sem zona não há lista de concelhos: a pergunta ainda não existe.
  if (localizacao.regiao === "portugal") return null;

  if (localizacao.concelho) {
    const sem = correr(entrada, { ...localizacao, concelho: undefined });
    const d = diferenca(sem, atual);
    return {
      campo: "concelho",
      rotulo: ROTULOS.concelho,
      respondido: true,
      peso: pesoDe(d),
      ganhaProcura: d.ganhaProcura,
      ganhaConcorrencia: d.ganhaConcorrencia,
      mudaPontuacao: d.mudaPontuacao,
      mudaEntrega: d.mudaEntrega,
      // Sem efeito com o concelho JÁ escolhido quer quase sempre dizer
      // uma coisa concreta: o alcance declarado é maior do que ele, e
      // por isso a análise é do território, não do concelho. Dizer isso
      // é dizer o que fazer a seguir; «não muda nada» não é.
      condicao:
        pesoDe(d) === "sem-efeito" && localizacao.alcance !== "concelho"
          ? `Declaraste operar em «${rotuloDoAlcance(localizacao.alcance)}», e é essa a zona que a análise mede. O concelho passa a ser a zona se escolheres «o meu concelho» — ou o centro do círculo, se declarares um raio.`
          : null,
      frase:
        d.ganhaConcorrencia > 0
          ? `Dá a leitura de concorrência a ${hipoteses(d.ganhaConcorrencia)}, comparada entre os 308 concelhos em vez das nove regiões.`
          : d.mudaPontuacao > 0
            ? `Muda a pontuação de ${hipoteses(d.mudaPontuacao)} face a usar a região inteira.`
            : "Serve de referência local e de centro para o raio; a zona que a análise mede é a que o alcance declara.",
    };
  }

  const teste = entrada.concelhoParaTeste;
  if (!teste) return null;
  const com = correr(entrada, { ...localizacao, concelho: teste });
  const d = diferenca(atual, com);
  return {
    campo: "concelho",
    rotulo: ROTULOS.concelho,
    respondido: false,
    peso: pesoDe(d),
    ganhaProcura: d.ganhaProcura,
    ganhaConcorrencia: d.ganhaConcorrencia,
    mudaPontuacao: d.mudaPontuacao,
    mudaEntrega: d.mudaEntrega,
    // A primeira versão parava na leitura de concorrência: quando ela
    // era zero dizia «não muda nada» — e depois, escolhido o concelho, o
    // painel anunciava «muda a pontuação de 4 hipóteses». A previsão
    // desmentida pela própria ferramenta, dois cliques depois. Se a
    // concorrência não muda mas a pontuação muda, é a pontuação que se diz.
    condicao:
      pesoDe(d) === "sem-efeito" && localizacao.alcance !== "concelho"
        ? `Com alcance «${rotuloDoAlcance(localizacao.alcance)}» a análise é dessa zona inteira. O concelho passa a decidi-la se escolheres «o meu concelho» — ou se declarares um raio, que parte dele.`
        : null,
    frase:
      d.ganhaConcorrencia > 0
        ? `Escolher o concelho dá leitura de concorrência a ${hipoteses(d.ganhaConcorrencia)} — medido agora, num concelho desta região. Continua a não ser morada: é uma lista, e não sai do teu dispositivo.`
        : d.mudaPontuacao > 0
          ? `Escolher o concelho muda a pontuação de ${hipoteses(d.mudaPontuacao)} face a usar a região inteira — a densidade compara-se entre 308 concelhos em vez de nove regiões.`
          : "Fixa o ponto de partida do raio e a referência local da leitura de concorrência.",
  };
}

/** O efeito do TERRITÓRIO, medido no que ele muda face a não o declarar. */
function efeitoDoTerritorio(
  entrada: Entrada,
  atual: readonly OpportunityCandidate[],
): EfeitoDeCampo {
  const { localizacao } = entrada.contexto;
  const respondido = localizacao.territorio !== undefined;

  if (respondido) {
    const sem = correr(entrada, { ...localizacao, territorio: undefined });
    const d = diferenca(sem, atual);
    return {
      campo: "territorio",
      rotulo: ROTULOS.territorio,
      respondido: true,
      peso: pesoDe(d),
      ...d,
      condicao: pesoDe(d) === "sem-efeito" ? razaoDoTerritorioMudo(atual) : null,
      frase:
        d.mudaPontuacao > 0
          ? `Declarar ${localizacao.territorio} muda a pontuação de ${hipoteses(d.mudaPontuacao)}: há problemas mais intensos num tipo de território do que noutro.`
          : "As hipóteses que tens à frente existem com a mesma força nos três tipos de território.",
    };
  }

  // Por responder: o maior efeito entre os três, para não prometer pouco.
  let melhor: Diferenca = { ganhaProcura: 0, ganhaConcorrencia: 0, mudaPontuacao: 0, mudaEntrega: 0, novas: 0 };
  for (const tipo of ["urbano", "suburbano", "rural"] as TipoTerritorio[]) {
    const d = diferenca(atual, correr(entrada, { ...localizacao, territorio: tipo }));
    if (d.mudaPontuacao > melhor.mudaPontuacao) melhor = d;
  }
  return {
    campo: "territorio",
    rotulo: ROTULOS.territorio,
    respondido: false,
    peso: pesoDe(melhor),
    ...melhor,
    condicao: pesoDe(melhor) === "sem-efeito" ? razaoDoTerritorioMudo(atual) : null,
    frase:
      melhor.mudaPontuacao > 0
        ? `Declarar o território muda a pontuação de até ${hipoteses(melhor.mudaPontuacao)}: há problemas que só existem com densidade, e outros só sem ela.`
        : "As hipóteses que tens à frente existem com a mesma força nos três tipos de território.",
  };
}

/**
 * O efeito do ALCANCE — e é o mais mal contado de todos.
 *
 * O motor não penaliza um alcance incompatível: COMPÕE outra variante. Com
 * «só online», uma hipótese presencial passa a híbrida, e a pontuação mal
 * se mexe. Quem olha para a lista vê os mesmos títulos e conclui que o
 * botão não faz nada — quando na verdade acabou de trocar a forma de
 * entrega de tudo o que está no ecrã.
 */
function efeitoDoAlcance(entrada: Entrada, atual: readonly OpportunityCandidate[]): EfeitoDeCampo {
  const { localizacao } = entrada.contexto;
  const alternativas: AlcanceOperacional[] = ["concelho", "regiao", "nacional", "online"];
  let mudaEntrega = 0;
  let mudaPontuacao = 0;
  let novas = 0;
  for (const alcance of alternativas) {
    if (alcance === localizacao.alcance) continue;
    const d = diferenca(atual, correr(entrada, { ...localizacao, alcance }));
    mudaEntrega = Math.max(mudaEntrega, d.mudaEntrega);
    mudaPontuacao = Math.max(mudaPontuacao, d.mudaPontuacao);
    novas = Math.max(novas, d.novas);
  }
  const d: Diferenca = { ganhaProcura: 0, ganhaConcorrencia: 0, mudaPontuacao, mudaEntrega, novas };

  // ── O QUE O ALCANCE FAZ, DITO PELO TERRITÓRIO E NÃO SÓ PELO SCORE ──
  //  A conta de hipóteses é a consequência; a causa é o tamanho do
  //  mercado que cada alcance abrange. Mostrar as duas na mesma frase é
  //  o que torna a resposta compreensível — «muda a pontuação de 4»
  //  sozinho não explica porquê.
  const tamanhos = alternativas
    .map((alcance) => {
      const territorio = territorioAlcancavel({ ...localizacao, alcance });
      const escala = escalaDoTerritorio(territorio);
      return escala ? { alcance, nome: territorio.nome, residentes: escala.residentes } : null;
    })
    .filter((item): item is { alcance: AlcanceOperacional; nome: string; residentes: number } => item !== null);
  const menor = tamanhos.reduce<typeof tamanhos[number] | null>(
    (melhor, item) => (melhor === null || item.residentes < melhor.residentes ? item : melhor),
    null,
  );
  const maior = tamanhos.reduce<typeof tamanhos[number] | null>(
    (melhor, item) => (melhor === null || item.residentes > melhor.residentes ? item : melhor),
    null,
  );
  const escalas =
    menor && maior && menor.residentes !== maior.residentes
      ? ` Decide o tamanho do mercado analisado: de ${menor.residentes.toLocaleString("pt-PT")} pessoas em ${menor.nome} a ${maior.residentes.toLocaleString("pt-PT")} em ${maior.nome}.`
      : "";

  return {
    campo: "alcance",
    rotulo: ROTULOS.alcance,
    respondido: true,
    peso: escalas !== "" && pesoDe(d) === "sem-efeito" ? "importante" : pesoDe(d),
    ganhaProcura: 0,
    ganhaConcorrencia: 0,
    mudaPontuacao,
    mudaEntrega,
    condicao: null,
    frase:
      mudaEntrega > 0
        ? `Mudar o alcance troca a forma de entrega de ${hipoteses(mudaEntrega)} — o motor recompõe-as em vez de as apagar.${escalas}`
        : mudaPontuacao > 0
          ? `Mudar o alcance muda a pontuação de ${hipoteses(mudaPontuacao)}.${escalas}`
          : novas > 0
            ? `Mudar o alcance traz até ${hipoteses(novas)} diferentes.${escalas}`
            : `É o alcance que define a zona onde a concorrência é medida.${escalas}`,
  };
}

/**
 * O efeito do RAIO — agora com um círculo verdadeiro por baixo.
 *
 * Antes: uma regra escrita à mão que só disparava a 10 km em território
 * rural. Medido, três dos quatro raios que a interface oferece não
 * faziam nada, em contexto nenhum.
 *
 * Agora: o raio recorta um conjunto de concelhos reais à volta da sede
 * do concelho declarado, e é sobre esse conjunto que a concorrência é
 * medida. A frase diz os dois números que a pessoa quer — quantos
 * concelhos e quanta gente —, porque são eles que tornam a escolha
 * decidível.
 */
function efeitoDoRaio(entrada: Entrada, atual: readonly OpportunityCandidate[]): EfeitoDeCampo {
  const { localizacao } = entrada.contexto;
  const respondido = localizacao.raioKm !== undefined;
  const paraComparar = respondido ? undefined : 25;
  const d = diferenca(atual, correr(entrada, { ...localizacao, raioKm: paraComparar }));

  const comRaio = territorioAlcancavel({
    ...localizacao,
    raioKm: localizacao.raioKm ?? 25,
  });
  const escala = escalaDoTerritorio(comRaio);
  const km = localizacao.raioKm ?? 25;

  const alcanca =
    comRaio.base === "raio" && escala
      ? `${comRaio.noRaio.length === 1 ? "só o teu concelho" : `${comRaio.noRaio.length} concelhos`} e ${escala.residentes.toLocaleString("pt-PT")} pessoas`
      : null;

  return {
    campo: "raio",
    rotulo: ROTULOS.raio,
    respondido,
    // Um raio que recorta território é sempre uma resposta com
    // consequência, mesmo quando a ordem das hipóteses não se mexe: a
    // zona onde a concorrência é contada passou a ser outra.
    peso: comRaio.base === "raio" ? (pesoDe(d) === "sem-efeito" ? "ajuste" : pesoDe(d)) : pesoDe(d),
    ...d,
    // A razão de o raio não contar É a frase, e não uma segunda linha
    // por baixo dela: repetir a mesma coisa duas vezes lê-se como um
    // defeito, que foi o que a primeira versão fez.
    condicao: null,
    frase:
      comRaio.base === "raio" && alcanca
        ? respondido
          ? `Em linha reta a partir da sede do teu concelho, ${km} km apanham ${alcanca}. É essa a zona onde a concorrência é contada.`
          : `Um raio de ${km} km apanharia ${alcanca} — e a análise passaria a ser desse território em vez da zona inteira.`
        : (comRaio.raioIgnorado ??
          "Recorta um círculo de concelhos à volta de onde partes, e é aí que a concorrência passa a ser contada."),
  };
}

/**
 * Porque é que o território não mexe em nada, dito com o número do grafo.
 *
 * A resposta útil não é «não muda»: é quantos problemas do grafo
 * distinguem densidade, e que nenhum dos que estão à frente é um deles.
 */
function razaoDoTerritorioMudo(atual: readonly OpportunityCandidate[]): string {
  const discriminantes = PROBLEMAS.filter((problema) => problema.territoriosIntensos.length < 3).length;
  return atual.length === 0
    ? `Dos ${PROBLEMAS.length} problemas do grafo, ${discriminantes} mudam de intensidade conforme o território.`
    : `Dos ${PROBLEMAS.length} problemas do grafo, ${discriminantes} mudam de intensidade conforme o território — e nenhum deles está entre as hipóteses que tens à frente. Passa a contar se mudares o que sabes fazer.`;
}

const ORDEM_PESO: Readonly<Record<PesoDoCampo, number>> = Object.freeze({
  decisivo: 0,
  importante: 1,
  ajuste: 2,
  "sem-efeito": 3,
});

/**
 * O que cada resposta de localização muda, nesta análise concreta.
 *
 * ⚠️ Corre o motor várias vezes — até dezasseis, com a zona por
 * responder. O pipeline é síncrono e mede-se em milissegundos, mas quem
 * chamar isto de dentro de um componente tem de o memorizar pelo
 * contexto: recalcular a cada tecla seria trabalho por nada.
 */
export function impactoDaLocalizacao(entrada: Entrada): ImpactoDaLocalizacao {
  const atual = correr(entrada, entrada.contexto.localizacao);

  const efeitos: EfeitoDeCampo[] = [efeitoDaZona(entrada, atual)];
  const concelho = efeitoDoConcelho(entrada, atual);
  if (concelho) efeitos.push(concelho);
  efeitos.push(efeitoDoTerritorio(entrada, atual));
  efeitos.push(efeitoDoAlcance(entrada, atual));
  efeitos.push(efeitoDoRaio(entrada, atual));

  const porResponder = efeitos
    .filter((item) => !item.respondido && item.peso !== "sem-efeito")
    .sort((esquerda, direita) => ORDEM_PESO[esquerda.peso] - ORDEM_PESO[direita.peso]);

  // ── O QUE AS RESPOSTAS DE AGORA JÁ VALEM ───────────────────────────
  //  A secção mostrava só o que FALTA. Faltava o outro lado: o que as
  //  respostas atuais produziram — que território é analisado e quanta
  //  gente lá vive. É o resultado concreto de responder, e é o que
  //  transforma cinco controlos abstratos numa leitura do mapa.
  const territorio = territorioAlcancavel(entrada.contexto.localizacao);
  const escala = escalaDoTerritorio(territorio);

  return {
    efeitos,
    territorio: {
      nome: territorio.nome,
      base: territorio.base,
      concelhos: territorio.codigos.length,
      residentes: escala?.residentes ?? null,
      percentil: escala?.percentil ?? null,
      noRaio: territorio.noRaio.map((item) => ({ nome: item.nome, distanciaKm: item.distanciaKm })),
      raioIgnorado: territorio.raioIgnorado,
    },
    hipotesesAgora: atual.length,
    proximoPasso: porResponder[0] ?? null,
  };
}
