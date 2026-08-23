// ═══════════════════════════════════════════════════════════════════════
//  CONFIANÇA ≠ FIT ≠ MERCADO
//  ---------------------------------------------------------------------
//  Ponto 21 do pedido, e é uma das ideias mais importantes do motor. Uma
//  oportunidade pode ser:
//
//      Fit: alto  ·  Mercado: alto  ·  Confiança: média
//
//  e isso é informação completamente diferente de um número único. A
//  confiança fala do QUE SABEMOS, não do negócio: baixa confiança não
//  significa má oportunidade — significa que a análise ainda não tem em
//  que se apoiar, e diz o que falta.
//
//  ── O QUE VEIO PARA AQUI, E DE ONDE ────────────────────────────────
//  Duas dimensões viviam no SCORE do negócio e não pertenciam lá:
//
//   · `qualidadeDaEvidencia` (4 pontos em 100) — quantas observações
//     apanhámos. É uma medida de nós, não do mercado.
//   · `frescura` (2 pontos) — e era binária: `observadas === 0 ? null :
//     100`, com uma leitura de 2019 a valer o mesmo que uma de 2026.
//
//  Somadas a uma `procura` que contava linhas, davam VINTE pontos em cem
//  a medir a quantidade de dados dentro de um número apresentado como
//  juízo sobre o negócio. Mudar de sítio não é cosmética: é a diferença
//  entre «este negócio vale 89» e «sabemos bastante sobre este negócio».
//
//  ── E O GATE, QUE JÁ CÁ DEVIA ESTAR ────────────────────────────────
//  `market/evidence-gate.ts` decide, com oito estados e triangulação
//  entre origens estatísticas independentes, se uma hipótese está
//  sustentada. O motor de descoberta ignorava-o por completo. Passa a ser
//  o TETO: nenhuma quantidade de linhas faz um `template` chegar a
//  «confiança alta», e um `contradicted` não passa de «insuficiente».
// ═══════════════════════════════════════════════════════════════════════

import type { MarketOpportunityState } from "@/lib/negocio/market/tipos";
import { CONCEITO_POR_CAPACIDADE, type PrecisaoCae } from "../conhecimento/dados/ontologia";
import { cobertura } from "./scoring";
import type { AvaliacaoConfianca, AvaliacaoProcura, AvaliacaoRegulatoria, NivelConfianca, OpportunityScore } from "./tipos";
import type { CandidatoBruto } from "./gerador";

/**
 * Do mais fraco para o mais forte. Exportada porque a ordenação dos
 * resultados estratifica por confiança e as duas não podem divergir.
 */
export const ORDEM_NIVEL: readonly NivelConfianca[] = ["insuficiente", "baixa", "media", "alta"];

/** 0 = insuficiente … 3 = alta. Para comparar níveis sem repetir a lista. */
export function forcaDaConfianca(nivel: NivelConfianca): number {
  return ORDEM_NIVEL.indexOf(nivel);
}

/**
 * O teto de confiança que cada estado do gate autoriza.
 *
 * Um piloto em `stale` ou `contradicted` contribuía para o score de
 * procura exatamente como um `evidence_qualified`. Aqui isso acaba: o
 * estado não soma, limita.
 */
const TETO_POR_ESTADO: Readonly<Record<MarketOpportunityState, NivelConfianca>> = Object.freeze({
  contradicted: "insuficiente",
  stale: "insuficiente",
  template: "baixa",
  signal_detected: "media",
  candidate: "media",
  evidence_qualified: "alta",
  user_validated: "alta",
  operating: "alta",
});

/**
 * O teto de confiança que cada precisão de CAE permite.
 *
 * `justa` não limita nada — a divisão descreve a hipótese. `larga`
 * trava em «média»: a leitura é real, a fonte é oficial, e mesmo assim
 * conta gente que não faz isto.
 */
const TETO_POR_PRECISAO_CAE: Readonly<Record<PrecisaoCae, NivelConfianca>> = Object.freeze({
  justa: "alta",
  larga: "media",
});

function limitar(nivel: NivelConfianca, teto: NivelConfianca): NivelConfianca {
  return ORDEM_NIVEL.indexOf(nivel) <= ORDEM_NIVEL.indexOf(teto) ? nivel : teto;
}

export function avaliarConfianca(
  candidato: CandidatoBruto,
  scores: OpportunityScore,
  procura: AvaliacaoProcura,
  regulacao: AvaliacaoRegulatoria,
): AvaliacaoConfianca {
  const motivos: string[] = [];
  const parte = cobertura(scores);

  const observacoes = procura.evidencias.length;
  const forcaDaEvidencia = Math.min(100, observacoes * 22);

  if (observacoes === 0) {
    motivos.push("Nenhuma observação oficial ligada a esta composição.");
  } else {
    motivos.push(
      `${observacoes} ${observacoes === 1 ? "leitura oficial" : "leituras oficiais"} com fonte, período e geografia.`,
    );
  }

  if (procura.bloqueadasPeloGate > 0) {
    motivos.push(
      `${procura.bloqueadasPeloGate} ${procura.bloqueadasPeloGate === 1 ? "leitura foi recusada" : "leituras foram recusadas"} pelo gate de evidência e não conta${procura.bloqueadasPeloGate === 1 ? "" : "m"} para nada.`,
    );
  }

  if (procura.frescura !== null && procura.frescura < 50) {
    motivos.push(
      "As leituras que temos já passaram de metade da sua meia-vida — descrevem um mercado que pode já não ser este.",
    );
  }

  if (scores.lacunaDeOferta === null) {
    motivos.push("Sem sinal de oferta, não é possível dizer se o mercado já está servido.");
  }
  if (scores.procura === null) {
    motivos.push(
      candidato.problema.procuraObservavel
        ? "Há séries ligadas mas nenhuma comparável com esta zona, por isso a intensidade da procura não foi lida."
        : "A procura deste problema não é medida por fonte pública portuguesa.",
    );
  }
  if (scores.economia === null) {
    motivos.push("Não declaraste capital nem prazo, por isso a economia não foi confrontada com nada.");
  }
  if (regulacao.temIncerteza) {
    motivos.push("Pelo menos um requisito regulatório depende do caso concreto e tem de ser confirmado.");
  }
  if (candidato.seedTemplateId) {
    motivos.push("Existe um dossier curado equivalente, revisto por uma pessoa.");
  }

  // A escala é da COBERTURA e da força da evidência, nunca do score. Uma
  // hipótese excelente sobre a qual não sabemos nada tem confiança
  // insuficiente, e é assim que deve ser apresentada.
  const bruto: NivelConfianca =
    parte >= 0.9 && forcaDaEvidencia >= 44 && (procura.frescura ?? 0) >= 50
      ? "alta"
      : parte >= 0.75 && forcaDaEvidencia >= 22
        ? "media"
        : parte >= 0.6
          ? "baixa"
          : "insuficiente";

  const tetoDoGate = procura.estadoGate;
  let nivel = tetoDoGate === null ? bruto : limitar(bruto, TETO_POR_ESTADO[tetoDoGate]);

  // ── A PRECISÃO DA DIVISÃO DA CAE PASSA A CUSTAR ───────────────────
  //  ┌────────────────────────────────────────────────────────────────┐
  //  │ `precisao` existia, estava correta, e não entrava em cálculo    │
  //  │ nenhum: uma leitura da divisão 81 — que junta limpeza de        │
  //  │ edifícios COM jardinagem — produzia exatamente a mesma          │
  //  │ confiança que uma da 53, que é justa. Dezanove dos vinte e      │
  //  │ cinco conceitos são `larga`. O campo era decorativo.            │
  //  │                                                                │
  //  │ Uma leitura de oferta vinda de uma divisão larga limita a       │
  //  │ confiança a «média». NÃO altera o score do negócio: a força da  │
  //  │ evidência vive na confiança e nunca no score — é a regra que o  │
  //  │ cabeçalho do `scoring.ts` defende em letra grande, e alargar a  │
  //  │ divisão para obter números maiores é sabotagem silenciosa.      │
  //  │                                                                │
  //  │ Só se aplica quando HOUVE leitura de oferta. Sem ela não há     │
  //  │ nada de largo a descontar, e a cobertura já trata do resto.     │
  //  └────────────────────────────────────────────────────────────────┘
  const conceito = CONCEITO_POR_CAPACIDADE.get(candidato.dominante.id);
  if (scores.lacunaDeOferta !== null && conceito?.precisao === "larga") {
    const limitado = limitar(nivel, TETO_POR_PRECISAO_CAE.larga);
    if (limitado !== nivel) {
      motivos.push(
        `A leitura de oferta vem de uma divisão da CAE mais larga do que esta hipótese${conceito.ressalva ? ` — ${conceito.ressalva.replace(/\.$/, "")}` : ""}, por isso a confiança não passa de média.`,
      );
      nivel = limitado;
    }
  }
  if (tetoDoGate !== null && nivel !== bruto) {
    motivos.push(
      `O gate de evidência classifica o dossier equivalente como «${tetoDoGate}», e isso limita a confiança possível independentemente do que já sabemos.`,
    );
  }

  return { nivel, cobertura: parte, motivos, forcaDaEvidencia, frescura: procura.frescura, tetoDoGate };
}

export const ROTULO_CONFIANCA: Readonly<Record<NivelConfianca, string>> = Object.freeze({
  alta: "Confiança alta",
  media: "Confiança média",
  baixa: "Confiança baixa",
  insuficiente: "Ainda sem base para confiar",
});

/** A frase honesta que acompanha cada nível. Ponto 20: não esconder incerteza. */
export const FRASE_CONFIANCA: Readonly<Record<NivelConfianca, string>> = Object.freeze({
  alta: "A análise assenta em observações com fonte e período, quase todas as dimensões tinham base para ser avaliadas, e os dados ainda estão dentro da sua meia-vida.",
  media: "Há sinais oficiais a sustentar parte da análise, e outras dimensões ficaram por apurar.",
  baixa: "Há sinais interessantes, mas ainda temos pouca evidência local — a maior parte desta leitura é estrutural, não observada.",
  insuficiente:
    "Não temos dados suficientes para sustentar esta hipótese. Aparece porque encaixa no teu contexto, e é tudo o que podemos afirmar hoje.",
});
