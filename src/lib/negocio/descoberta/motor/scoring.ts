// ═══════════════════════════════════════════════════════════════════════
//  SCORING — oito dimensões, pesos justificados, `null` que propaga
//  ---------------------------------------------------------------------
//  «92 % compatível contigo» sem explicação é o que este ficheiro existe
//  para não voltar a produzir. Cada dimensão nasce de uma coisa concreta,
//  tem um peso escrito com a razão ao lado, e a soma é auditável linha a
//  linha no ecrã.
//
//  ── AS QUATRO REGRAS ───────────────────────────────────────────────
//   1. **`null` propaga.** Um eixo sem base para ser avaliado não vale
//      zero. Zero é uma afirmação sobre o mercado; ausência é uma
//      afirmação sobre nós. Um eixo `null` sai do denominador — e faz
//      descer a CONFIANÇA, que é onde deve doer.
//   2. **A confiança não multiplica o score, nem SOMA com ele.** A regra
//      estava escrita aqui e o ficheiro violava-a: `qualidadeDaEvidencia`
//      (4 pontos) e `frescura` (2) eram funções de quantas observações
//      tínhamos, e somavam-se ao score do NEGÓCIO. Com `procura`, que
//      era `40 + n × 20`, davam vinte pontos em cem a medir a quantidade
//      de dados. Não multiplicava — somava, que é pior, porque é
//      invisível. As duas saíram para a confiança e não voltam.
//   3. **Nenhuma dimensão pontua duas vezes.** Ver a matriz de
//      sobreposição em `fit.ts`: o fit responde «consegues fazer isto?»,
//      a economia responde «cabe no que tens?», a exequibilidade
//      responde «tens como executar?», a geografia responde «é aqui?».
//   4. **Os pesos são discutíveis e estão num sítio só.** Mudar um exige
//      passar aqui e escrever porquê.
// ═══════════════════════════════════════════════════════════════════════

import {
  horasSemanais,
  pessoasDisponiveis,
  type OpportunityContext,
} from "../contexto/tipos";
import { marketRegionLabel } from "@/lib/negocio/market/geografia";
import type { AvaliacaoProcura, AvaliacaoRegulatoria, AvaliacaoViabilidade, OpportunityScore, RiscoAvaliado } from "./tipos";
import { riscosForaDaTolerancia } from "./risco";
import type { CandidatoBruto } from "./gerador";

/**
 * Os pesos, e a razão de cada um.
 *
 * A soma dá 100 quando todas as dimensões existem. Quando alguma é
 * `null`, o peso dela sai do denominador e as outras crescem
 * proporcionalmente — em vez de a ausência ser contada como zero.
 */
export const PESOS_SCORE = Object.freeze({
  /** O maior. Uma oportunidade que a pessoa não consegue executar não é uma. */
  fitPessoal: 28,
  /** Sem procura não há negócio, por melhor que seja o resto. Lê VALOR. */
  procura: 17,
  /** Procura sem lacuna é um mercado servido. */
  lacunaDeOferta: 9,
  /** O capital e o prazo declarados cobrem que fração do intervalo? */
  economia: 15,
  /** Tempo, equipa, cobertura e dependências — poder não é conseguir. */
  exequibilidade: 11,
  /** Uma barreira regulatória alta não é só custo: é tempo antes da primeira venda. */
  regulacao: 8,
  /** Risco acima da tolerância DECLARADA, não risco em abstrato. */
  risco: 8,
  /** O problema é aqui — na região, no tipo de território e ao teu alcance. */
  geografia: 4,
});

const SOMA_PESOS = Object.values(PESOS_SCORE).reduce((total, peso) => total + peso, 0);

export interface EntradaScore {
  candidato: CandidatoBruto;
  contexto: OpportunityContext;
  fit: number;
  viabilidade: AvaliacaoViabilidade;
  regulacao: AvaliacaoRegulatoria;
  procura: AvaliacaoProcura;
  riscos: readonly RiscoAvaliado[];
}

/** Horas por semana que cada modelo exige, por estrutura. */
function horasExigidas(candidato: CandidatoBruto): number {
  if (candidato.modelo.precisaEquipa) return 30;
  if (candidato.modelo.precisaLojaFisica) return 25;
  return 10;
}

export function calcularScores(entrada: EntradaScore): OpportunityScore {
  const { candidato, contexto, fit, viabilidade, regulacao, procura, riscos } = entrada;

  // ── Procura ───────────────────────────────────────────────────────
  //  ┌──────────────────────────────────────────────────────────────┐
  //  │ ANTES:  min(100, 40 + n × 20)   com n = quantas observações   │
  //  │                                                              │
  //  │ Um mercado a explodir e um mercado a colapsar davam 89 e      │
  //  │ confiança alta, os dois. Cinco leituras medíocres batiam três │
  //  │ excelentes. O `observacao.value` atravessava o pipeline com   │
  //  │ unidade, período e checksum — e era descartado aqui.          │
  //  │                                                              │
  //  │ AGORA:  a posição da zona contra uma referência declarada —   │
  //  │ percentil entre as regiões, ou índice face ao valor nacional. │
  //  │ Ver `intensidade.ts`, incluindo a razão por que uma CONTAGEM  │
  //  │ absoluta não entra sem denominador.                           │
  //  └──────────────────────────────────────────────────────────────┘
  const scoreProcura = !candidato.problema.procuraObservavel
    ? null
    : procura.intensidade.posicao;

  // ── Lacuna ────────────────────────────────────────────────────────
  //  «Na média» era dito `desconhecida` e saía do denominador como se
  //  não soubéssemos nada. Sabemos: sabemos que a densidade desta zona
  //  está no meio do país, e isso é informação — nem espaço por ocupar,
  //  nem mercado cheio. Vale mais do que um mercado servido e menos do
  //  que uma lacuna a sério.
  const scoreLacuna =
    procura.leitura === "desconhecida"
      ? null
      : procura.leitura === "procura-com-pouca-oferta"
        ? 90
        : procura.leitura === "oferta-na-media"
          ? 60
          : procura.leitura === "procura-com-muita-oferta"
            ? 45
            : 15;

  // ── Economia ──────────────────────────────────────────────────────
  //  A FRAÇÃO do intervalo que o teto cobre, nunca o teste binário. Um
  //  intervalo de 4 500–30 000 € «cabia» num teto de 5 000 € porque o
  //  mínimo cabia; o eixo saturava em 94,9 de média. Ver `viabilidade.ts`.
  const fracoes = [viabilidade.fracaoCapitalCoberta, viabilidade.fracaoPrazoCoberta].filter(
    (item): item is number => item !== null,
  );
  const scoreEconomia =
    fracoes.length === 0
      ? null
      : Math.round((fracoes.reduce((total, item) => total + item, 0) / fracoes.length) * 100);

  // ── Exequibilidade ────────────────────────────────────────────────
  //  Media: 100 em todos os 1 652 candidatos, desvio 0,0. Os dois
  //  descontos que tinha — falta de meios e necessidade de equipa — já
  //  tinham eliminado o candidato nas restrições, por isso nunca
  //  disparavam. Um eixo constante é peso morto: não muda ordem nenhuma
  //  e reduz o peso relativo dos que mudam.
  //
  //  Passa a medir quatro coisas que variam mesmo, e que NÃO são
  //  pontuadas em mais lado nenhum: as horas que o modelo pede contra as
  //  declaradas, as pessoas que pede contra as que existem, quanto das
  //  capacidades está de facto coberto, e de quantos terceiros a
  //  operação depende antes da primeira venda.
  const horas = horasSemanais(contexto);
  const exigidas = horasExigidas(candidato);
  const parteTempo = Math.min(1, horas / exigidas);

  const pessoas = pessoasDisponiveis(contexto);
  const parteEquipa = candidato.modelo.precisaEquipa
    ? Math.min(1, pessoas / 2)
    : 1;

  const coberturaMedia =
    candidato.capacidades.reduce((total, item) => total + item.cobertura, 0) /
    candidato.capacidades.length;

  const dependencias =
    (candidato.modelo.precisaEquipa ? 1 : 0) +
    (candidato.modelo.precisaLojaFisica ? 1 : 0) +
    (candidato.modelo.precisaStock ? 1 : 0);
  const parteDependencias = Math.max(0, 1 - dependencias * 0.25);

  const scoreExequibilidade = Math.round(
    100 *
      (0.4 * parteTempo + 0.2 * parteEquipa + 0.2 * coberturaMedia + 0.2 * parteDependencias),
  );

  // ── Regulação ─────────────────────────────────────────────────────
  const scoreRegulacao = [100, 75, 45, 20][regulacao.barreira]!;

  // ── Risco ─────────────────────────────────────────────────────────
  const fora = riscosForaDaTolerancia(riscos);
  const scoreRisco = Math.max(0, 100 - fora * 18);

  // ── Geografia ─────────────────────────────────────────────────────
  //  ┌──────────────────────────────────────────────────────────────┐
  //  │ 25 dos 28 problemas são nacionais, e a fórmula anterior era   │
  //  │ `nacional ? (zonaFixada ? 100 : 80) : (zonaFixada ? 100 : 50)`│
  //  │ — para a esmagadora maioria dos candidatos o eixo respondia   │
  //  │ «o utilizador escolheu uma região?», não «o problema existe   │
  //  │ onde ele está?». Média 97,2, desvio 8,1. Numa ferramenta cujo │
  //  │ argumento é a localidade, era o eixo que menos discriminava.  │
  //  │                                                              │
  //  │ Passa a cruzar três coisas, duas delas recolhidas há muito e  │
  //  │ nunca lidas: a região, o TIPO DE TERRITÓRIO e o ALCANCE.      │
  //  └──────────────────────────────────────────────────────────────┘
  const scoreGeografia = Math.round(100 * fatorGeografico(candidato, contexto).valor);

  return {
    fitPessoal: fit,
    procura: scoreProcura,
    lacunaDeOferta: scoreLacuna,
    economia: scoreEconomia,
    exequibilidade: scoreExequibilidade,
    regulacao: scoreRegulacao,
    risco: scoreRisco,
    geografia: scoreGeografia,
  };
}

export interface FatorGeografico {
  valor: number;
  /** A frase que explica o valor. Vai ao ecrã, e diz o que NÃO sabemos. */
  nota: string;
}

/**
 * Região × território × alcance, com a frase que os explica.
 *
 * Exportado porque a explicação do candidato mostra a mesma frase: um
 * número no ecrã e uma razão noutro sítio divergem à primeira alteração.
 */
export function fatorGeografico(
  candidato: CandidatoBruto,
  contexto: OpportunityContext,
): FatorGeografico {
  const partes: string[] = [];
  const nacional = candidato.problema.regioes.includes("portugal");
  const zonaFixada = contexto.localizacao.regiao !== "portugal";

  // 1. A região onde o problema existe.
  let valor = nacional ? (zonaFixada ? 1 : 0.7) : zonaFixada ? 1 : 0.4;
  if (!nacional && !zonaFixada) {
    partes.push(
      `Depende de estar em ${candidato.problema.regioes.map(marketRegionLabel).join(" ou ")}, e ainda não fixaste zona.`,
    );
  } else if (!nacional) {
    partes.push(`O problema é específico desta zona, e é onde estás.`);
  } else if (!zonaFixada) {
    partes.push("O problema existe em todo o país; sem zona fixada não sabemos se é mais intenso onde estás.");
  }

  // 2. O tipo de território — a variável que mais muda o que funciona.
  const { territorio } = contexto.localizacao;
  const intensos = candidato.problema.territoriosIntensos;
  const decideDensidade = intensos.length < 3;
  if (territorio === undefined) {
    if (decideDensidade) {
      valor *= 0.85;
      partes.push(
        `Este problema é mais intenso em território ${listar(intensos)}, e não declaraste onde vives.`,
      );
    }
  } else if (!decideDensidade) {
    partes.push("A densidade do território não decide este problema: existe com a mesma força nos três.");
  } else if (intensos.includes(territorio)) {
    partes.push(`É mais intenso em território ${listar(intensos)}, que é o que declaraste.`);
  } else {
    valor *= 0.35;
    partes.push(
      `É mais intenso em território ${listar(intensos)}, e declaraste ${territorio}.`,
    );
  }

  // 3. O alcance declarado contra a forma de entrega.
  const { alcance, raioKm } = contexto.localizacao;
  if (alcance === "online" && candidato.entrega === "presencial") {
    valor *= 0.4;
    partes.push("Declaraste operar só online e esta variante é presencial.");
  } else if (alcance === "bairro" && candidato.entrega === "remoto") {
    valor *= 0.7;
    partes.push("Declaraste alcance de bairro e esta variante é remota — o alcance não é o limite aqui.");
  }

  // 4. Raio pequeno em território de baixa densidade: poucos clientes
  //    alcançáveis. Não é uma penalização abstrata — é aritmética de
  //    quantas portas cabem dentro do círculo que a pessoa desenhou.
  if (
    raioKm !== undefined &&
    raioKm <= 15 &&
    territorio === "rural" &&
    candidato.entrega !== "remoto"
  ) {
    valor *= 0.7;
    partes.push(
      `Num raio de ${raioKm} km em território rural cabem poucos clientes possíveis, e este trabalho é presencial.`,
    );
  }

  return {
    valor: Math.max(0, Math.min(1, valor)),
    nota: partes.length > 0 ? partes.join(" ") : "O problema existe onde estás, e o teu alcance chega-lhe.",
  };
}

function listar(itens: readonly string[]): string {
  if (itens.length === 1) return itens[0]!;
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/**
 * A pontuação global — média ponderada que IGNORA as dimensões `null`.
 *
 * Ignorar é deliberado. Contar `null` como zero puniria uma hipótese por
 * nós não termos dados sobre ela, que é a definição de castigar o
 * mensageiro. A ausência aparece na confiança, e é lá que a pessoa a lê.
 */
function mediaPonderada(
  scores: OpportunityScore,
  chaves: readonly (keyof OpportunityScore)[],
  substituirNulos?: number,
): number | null {
  let soma = 0;
  let pesoUsado = 0;
  for (const chave of chaves) {
    const valor = scores[chave] ?? substituirNulos ?? null;
    if (valor === null) continue;
    soma += valor * PESOS_SCORE[chave];
    pesoUsado += PESOS_SCORE[chave];
  }
  return pesoUsado === 0 ? null : soma / pesoUsado;
}

/**
 * Os três eixos que não se compensam uns aos outros.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ PORQUE A MÉDIA PONDERADA NÃO CHEGAVA                                │
 * │                                                                    │
 * │ As dimensões entravam numa média ponderada. Numa média, um valor    │
 * │ baixo é diluído pelos altos — e há valores baixos que não devem     │
 * │ ser diluíveis por nada:                                             │
 * │                                                                    │
 * │     Mercado 95 · Encaixe 92 · Viabilidade 22                        │
 * │                                                                    │
 * │ A média ponderada dava ~85 e apresentava isto como excelente. Não   │
 * │ é: é um negócio que a pessoa não consegue pagar. O mercado não      │
 * │ compra capital que não existe.                                      │
 * │                                                                    │
 * │ A média GEOMÉTRICA resolve-o pela própria aritmética: multiplicar   │
 * │ por 0,22 elevado a um expoente arrasta o produto para baixo, faça o │
 * │ resto o que fizer. Mesmo caso: ~62 em vez de ~85.                   │
 * │                                                                    │
 * │ ── E O QUE NÃO SE SABE NÃO PENALIZA ──────────────────────────────│
 * │ Um eixo sem uma única dimensão avaliável sai da conta e os          │
 * │ expoentes renormalizam-se. É a mesma regra que a média já seguia,   │
 * │ e pela mesma razão: contar ausência como zero puniria a hipótese    │
 * │ por NÓS não sabermos, que é castigar o mensageiro. A ausência       │
 * │ aparece na confiança — e, desde agora, no INTERVALO da pontuação.   │
 * └────────────────────────────────────────────────────────────────────┘
 */
export const EIXOS = Object.freeze({
  /** O mercado: existe procura, há espaço, e é aqui. */
  mercado: {
    expoente: 0.45,
    dimensoes: ["procura", "lacunaDeOferta", "geografia"],
  },
  /** A pessoa: consegue executar isto? */
  encaixe: { expoente: 0.3, dimensoes: ["fitPessoal"] },
  /** A conta: cabe no capital, no prazo, na lei e na tolerância ao risco. */
  viabilidade: {
    expoente: 0.25,
    dimensoes: ["economia", "exequibilidade", "regulacao", "risco"],
  },
} as const satisfies Record<
  string,
  { expoente: number; dimensoes: readonly (keyof OpportunityScore)[] }
>);

export type EixoId = keyof typeof EIXOS;

export const ROTULO_EIXO: Readonly<Record<EixoId, string>> = Object.freeze({
  mercado: "Mercado",
  encaixe: "Encaixe contigo",
  viabilidade: "Viabilidade",
});

/** O valor de cada eixo, 0–100, ou `null` quando nada nele foi avaliável. */
export function pontuacaoPorEixo(scores: OpportunityScore): Record<EixoId, number | null> {
  return {
    mercado: mediaPonderada(scores, EIXOS.mercado.dimensoes),
    encaixe: mediaPonderada(scores, EIXOS.encaixe.dimensoes),
    viabilidade: mediaPonderada(scores, EIXOS.viabilidade.dimensoes),
  };
}

function mediaGeometrica(eixos: Record<EixoId, number | null>): number {
  let logaritmo = 0;
  let expoenteUsado = 0;
  for (const [id, definicao] of Object.entries(EIXOS) as [EixoId, (typeof EIXOS)[EixoId]][]) {
    const valor = eixos[id];
    if (valor === null) continue;
    // Um eixo a zero levaria o produto a zero e o logaritmo a -infinito.
    // O piso de 1 ponto mantém a aritmética definida sem suavizar o
    // efeito: 1/100 elevado a 0,45 continua a arrasar o resultado.
    logaritmo += definicao.expoente * Math.log(Math.max(valor, 1) / 100);
    expoenteUsado += definicao.expoente;
  }
  if (expoenteUsado === 0) return 0;
  return Math.round(100 * Math.exp(logaritmo / expoenteUsado));
}

export function pontuacaoGlobal(scores: OpportunityScore): number {
  return mediaGeometrica(pontuacaoPorEixo(scores));
}

export interface IntervaloDePontuacao {
  /** O que a pontuação seria se tudo o que não sabemos fosse o pior caso. */
  min: number;
  /** O ponto que a lista mostra: as dimensões conhecidas, renormalizadas. */
  ponto: number;
  /** O que seria se tudo o que não sabemos fosse o melhor caso. */
  max: number;
  /** `true` quando tudo foi avaliável e o intervalo colapsa num ponto. */
  fechado: boolean;
}

/**
 * A pontuação como intervalo — porque um ponto único mente por omissão.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ Ignorar as dimensões `null` no denominador é a decisão certa e      │
 * │ está justificada acima. Mas tem um efeito colateral medido: como    │
 * │ os eixos que sobrevivem são quase todos altos, todas as hipóteses   │
 * │ sem dados convergiam para a mesma faixa estreita. O ranking         │
 * │ deixava de ser um ranking e passava a ser um empate com ruído — e   │
 * │ o ecrã mostrava um número com duas casas de autoridade que ele não  │
 * │ tinha.                                                              │
 * │                                                                     │
 * │ «77, ou entre 41 e 92 consoante o que ainda não sabemos» é mais     │
 * │ honesto do que «77», e o motor já tinha tudo o que precisava para   │
 * │ o calcular. Quando a cobertura é total, o intervalo colapsa no      │
 * │ ponto — e essa é a melhor recompensa possível por responder a mais  │
 * │ perguntas.                                                          │
 * └────────────────────────────────────────────────────────────────────┘
 */
export function intervaloDePontuacao(scores: OpportunityScore): IntervaloDePontuacao {
  const ponto = pontuacaoGlobal(scores);
  const fechado = Object.values(scores).every((valor) => valor !== null);
  if (fechado) return { min: ponto, ponto, max: ponto, fechado: true };

  const extremo = (substituto: number) =>
    mediaGeometrica({
      mercado: mediaPonderada(scores, EIXOS.mercado.dimensoes, substituto),
      encaixe: mediaPonderada(scores, EIXOS.encaixe.dimensoes, substituto),
      viabilidade: mediaPonderada(scores, EIXOS.viabilidade.dimensoes, substituto),
    });

  const min = extremo(0);
  const max = extremo(100);
  return {
    // O ponto é sempre lido dentro do intervalo: a renormalização pode,
    // em casos com um eixo inteiro por avaliar, produzir um ponto acima
    // do máximo teórico do extremo otimista. Prender é mais honesto do
    // que publicar «85, entre 41 e 80».
    min: Math.min(min, ponto),
    ponto,
    max: Math.max(max, ponto),
    fechado: false,
  };
}

/** Que fração do peso total tinha base para ser avaliada. Alimenta a confiança. */
export function cobertura(scores: OpportunityScore): number {
  let pesoUsado = 0;
  for (const [chave, peso] of Object.entries(PESOS_SCORE) as [keyof OpportunityScore, number][]) {
    if (scores[chave] !== null) pesoUsado += peso;
  }
  return pesoUsado / SOMA_PESOS;
}

export const ROTULO_DIMENSAO: Readonly<Record<keyof OpportunityScore, string>> = Object.freeze({
  fitPessoal: "Compatibilidade contigo",
  procura: "Procura",
  lacunaDeOferta: "Lacuna de oferta",
  economia: "Cabe no capital e no prazo",
  exequibilidade: "Exequibilidade",
  regulacao: "Barreira regulatória",
  risco: "Risco dentro da tua tolerância",
  geografia: "Adequação geográfica",
});

/** O que cada dimensão mede, para o ecrã não ter de adivinhar. */
export const EXPLICACAO_DIMENSAO: Readonly<Record<keyof OpportunityScore, string>> = Object.freeze({
  fitPessoal: "O que sabes fazer, com que nível, com que experiência e com que meios.",
  procura: "A posição da tua zona nas séries oficiais que medem este problema — percentil entre regiões, ou índice face ao país.",
  lacunaDeOferta: "Quantos operadores já servem isto por habitante, contra a mediana nacional.",
  economia: "Que fração do intervalo de investimento e de prazo o que declaraste cobre.",
  exequibilidade: "As horas que o modelo pede contra as que tens, as pessoas, a cobertura das capacidades e de quantos terceiros depende.",
  regulacao: "Licenças, seguros e habilitações a tratar antes da primeira venda.",
  risco: "Quantas dimensões de risco excedem a tolerância que declaraste.",
  geografia: "Se o problema existe na tua região, é intenso no teu tipo de território, e cabe no teu alcance.",
});
