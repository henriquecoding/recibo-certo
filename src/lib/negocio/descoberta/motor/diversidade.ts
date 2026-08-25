// ═══════════════════════════════════════════════════════════════════════
//  DIVERSIDADE — não dez versões do mesmo negócio
//  ---------------------------------------------------------------------
//  Um ranking puro produz, com frequência, cinco variantes do mesmo
//  trabalho no topo: limpeza residencial, limpeza empresarial, limpeza de
//  alojamento, limpeza pós-obras, limpeza de condomínios. Cada uma pontua
//  bem pela mesma razão, e o resultado é uma lista que não dá escolha
//  nenhuma a quem a lê.
//
//  ── COMO SE EVITA ──────────────────────────────────────────────────
//  Seleção gulosa com penalização de semelhança (a ideia do MMR): a cada
//  posição escolhe-se o candidato com melhor pontuação DEPOIS de
//  descontar o que ele repete do que já foi escolhido. A semelhança é
//  medida sobre o que a pessoa vê — problema, setor, capacidade dominante
//  e modelo — e não sobre o texto.
//
//  A deduplicação é anterior e é diferente: dois candidatos com o mesmo
//  problema e o mesmo modelo, distintos só na forma de entrega, são a
//  MESMA oportunidade em duas variantes. Fica a melhor, e a outra é
//  registada como variante em vez de ocupar uma linha.
// ═══════════════════════════════════════════════════════════════════════

import { forcaDaConfianca } from "./confianca";
import type { OpportunityCandidate, CandidatoDescartado } from "./tipos";

/** Quanto é que dois candidatos se sobrepõem, em [0, 1]. */
export function semelhanca(esquerda: OpportunityCandidate, direita: OpportunityCandidate): number {
  let pontos = 0;
  // O problema é o eixo mais forte: dois candidatos que atacam o mesmo
  // problema são, para quem lê, duas maneiras de fazer a mesma coisa.
  if (esquerda.problema.id === direita.problema.id) pontos += 0.5;
  if (esquerda.setor === direita.setor) pontos += 0.2;
  if (esquerda.capacidadesUsadas[0]?.id === direita.capacidadesUsadas[0]?.id) pontos += 0.2;
  if (esquerda.modelo.id === direita.modelo.id) pontos += 0.1;
  return pontos;
}

export interface ResultadoDeduplicacao {
  candidatos: readonly OpportunityCandidate[];
  descartados: readonly CandidatoDescartado[];
}

/**
 * Uma linha por (problema, modelo): as formas de entrega são variantes.
 *
 * Mostrar «rotas para oficinas, presencial» e «rotas para oficinas,
 * híbrido» como duas oportunidades seria encher a lista com a mesma
 * decisão duas vezes.
 */
export function deduplicar(candidatos: readonly OpportunityCandidate[]): ResultadoDeduplicacao {
  const melhorPorChave = new Map<string, OpportunityCandidate>();
  const descartados: CandidatoDescartado[] = [];

  for (const candidato of candidatos) {
    const chave = `${candidato.problema.id}::${candidato.modelo.id}`;
    const atual = melhorPorChave.get(chave);
    if (!atual) {
      melhorPorChave.set(chave, candidato);
      continue;
    }
    const perdedor = candidato.pontuacaoGlobal > atual.pontuacaoGlobal ? atual : candidato;
    const vencedor = perdedor === atual ? candidato : atual;
    melhorPorChave.set(chave, vencedor);
    descartados.push({
      id: perdedor.id,
      titulo: perdedor.titulo,
      motivo: "duplicado",
      explicacao: `É a mesma hipótese que «${vencedor.titulo}», noutra forma de entrega. Ficou a variante com melhor encaixe.`,
    });
  }

  return { candidatos: [...melhorPorChave.values()], descartados };
}

/**
 * Ordena com penalização de semelhança.
 *
 * `lambda` é o peso da pontuação face à diversidade. 0,75 mantém o
 * ranking reconhecível — o primeiro lugar é sempre o melhor candidato —
 * e evita que o segundo e o terceiro sejam variantes dele.
 */
export function diversificar(
  candidatos: readonly OpportunityCandidate[],
  {
    lambda = 0.75,
    limite = candidatos.length,
    maxPorProblema = 2,
    ajuste = () => 0,
  }: {
    lambda?: number;
    limite?: number;
    maxPorProblema?: number;
    /** Preferência aprendida nesta visita; não altera o score publicado. */
    ajuste?: (candidato: OpportunityCandidate) => number;
  } = {},
): readonly OpportunityCandidate[] {
  // ── ORDENAR PELO QUE SE PROVA, NÃO PELO QUE SE ESTIMA ─────────────
  //  ┌────────────────────────────────────────────────────────────────┐
  //  │ A chave era `pontuacaoGlobal` — o PONTO CENTRAL de um número    │
  //  │ que o próprio motor publica com um intervalo de ±20 ao lado.    │
  //  │ Medido: nenhum score é alguma vez um ponto quando falta         │
  //  │ evidência, e a hipótese em primeiro lugar tinha, em média, um   │
  //  │ intervalo de 39 pontos de largura. Ordenar por esse centro é    │
  //  │ apresentar ruído como ranking, e contradiz a doutrina do resto  │
  //  │ do motor.                                                       │
  //  │                                                                │
  //  │ A chave passa a ser lexicográfica:                              │
  //  │                                                                │
  //  │   1.º  o nível de CONFIANÇA (alta > média > baixa > insuf.)     │
  //  │   2.º  o LIMITE INFERIOR do intervalo — o que é defensável      │
  //  │   3.º  a pontuação global, só para desempatar dentro do estrato │
  //  │                                                                │
  //  │ Entre «77, entre 41 e 92» e «75, entre 70 e 80», a segunda é a  │
  //  │ melhor recomendação: está provada. Ordenar pelo mínimo          │
  //  │ recompensa SABER, que é o incentivo que o resto do motor tenta  │
  //  │ criar — responder a mais perguntas fecha o intervalo e sobe a   │
  //  │ hipótese.                                                       │
  //  └────────────────────────────────────────────────────────────────┘
  const fatal = (item: OpportunityCandidate) =>
    item.objecoes.some((objecao) => objecao.fatal && objecao.procede) ? 1 : 0;

  const restantes = [...candidatos].sort((esquerda, direita) => {
    // Uma objeção fatal nunca chega ao topo, por muito que pontue.
    return (
      fatal(esquerda) - fatal(direita) ||
      forcaDaConfianca(direita.confianca.nivel) - forcaDaConfianca(esquerda.confianca.nivel) ||
      direita.intervaloPontuacao.min + ajuste(direita) - (esquerda.intervaloPontuacao.min + ajuste(esquerda)) ||
      direita.pontuacaoGlobal - esquerda.pontuacaoGlobal ||
      esquerda.titulo.localeCompare(direita.titulo, "pt-PT")
    );
  });

  const escolhidos: OpportunityCandidate[] = [];
  const porProblema = new Map<string, number>();

  // ── Duas passagens, e a ordem entre elas é o que evita a monotonia ──
  //  A penalização por semelhança é gradual, e quando o contexto só
  //  alcança três ou quatro problemas isso não chega: três variantes do
  //  mesmo continuam a ganhar a tudo o resto. Por isso a primeira
  //  passagem leva UM candidato por problema — a melhor forma de atacar
  //  cada um — e só depois de todos terem lugar é que as variantes
  //  entram, se sobrarem posições.
  //
  //  Uma variante é informação real («o mesmo problema, por avença ou por
  //  sessão, muda o capital e o prazo»), mas nunca à frente de um
  //  problema que ainda não apareceu.
  const escolherUma = (tetoPorProblema: number) => {
    while (restantes.length > 0 && escolhidos.length < limite) {
      let melhorIndice = -1;
      let melhorValor = Number.NEGATIVE_INFINITY;

      for (let indice = 0; indice < restantes.length; indice += 1) {
        const candidato = restantes[indice]!;
        if ((porProblema.get(candidato.problema.id) ?? 0) >= tetoPorProblema) continue;
        const repeticao =
          escolhidos.length === 0 ? 0 : Math.max(...escolhidos.map((escolhido) => semelhanca(escolhido, candidato)));
        // O MMR usa o MESMO número defensável da chave de partida. Com
        // `pontuacaoGlobal` aqui, a ordenação por evidência acima era
        // desfeita logo a seguir — o ponto central voltava a mandar.
        const valor = lambda * (candidato.intervaloPontuacao.min + ajuste(candidato)) - (1 - lambda) * repeticao * 100;
        if (valor > melhorValor) {
          melhorValor = valor;
          melhorIndice = indice;
        }
      }

      if (melhorIndice === -1) return;
      const escolhido = restantes.splice(melhorIndice, 1)[0]!;
      porProblema.set(escolhido.problema.id, (porProblema.get(escolhido.problema.id) ?? 0) + 1);
      escolhidos.push(escolhido);
    }
  };

  escolherUma(1);
  if (maxPorProblema > 1) escolherUma(maxPorProblema);

  return escolhidos;
}

// ── ÂNGULOS DE LEITURA ───────────────────────────────────────────────

export type AnguloDeLeitura =
  | "melhor-combinacao"
  | "maior-afinidade"
  | "menor-investimento"
  | "receita-mais-rapida"
  | "maior-potencial"
  | "menor-risco"
  | "mais-evidencia"
  | "fora-do-obvio";

export const ROTULO_ANGULO: Readonly<Record<AnguloDeLeitura, string>> = Object.freeze({
  "melhor-combinacao": "Melhor combinação",
  "maior-afinidade": "Maior afinidade contigo",
  "menor-investimento": "Menor investimento",
  "receita-mais-rapida": "Receita mais rápida",
  "maior-potencial": "Maior potencial",
  "menor-risco": "Menor risco",
  "mais-evidencia": "Com mais evidência",
  "fora-do-obvio": "Fora do óbvio",
});

export const EXPLICACAO_ANGULO: Readonly<Record<AnguloDeLeitura, string>> = Object.freeze({
  "melhor-combinacao": "A que melhor equilibra tudo o que declaraste.",
  "maior-afinidade":
    "A que mais aproveita o que sabes fazer e o que já tens — mesmo quando o mercado é o menos conhecido.",
  "menor-investimento": "A que arranca com menos capital exposto.",
  "receita-mais-rapida": "A que chega mais depressa à primeira fatura.",
  "maior-potencial":
    "A que menos depende das tuas horas para crescer. Não é a que dá mais dinheiro — é a que não fica presa ao tempo que tens.",
  "menor-risco": "A que menos excede a tolerância de risco que declaraste.",
  "mais-evidencia": "A que tem mais leituras oficiais por trás.",
  "fora-do-obvio": "Um problema pouco disputado, com procura repetida e barreira operacional suportável.",
});

export interface Destaque {
  angulo: AnguloDeLeitura;
  candidato: OpportunityCandidate;
}

/**
 * Um destaque por ângulo, sem repetir candidatos.
 *
 * Ponto 27 do pedido. Não é decoração: uma pessoa com pouco capital lê a
 * lista de forma diferente de quem quer escalar, e o ranking único não
 * serve as duas.
 */
export function destaques(candidatos: readonly OpportunityCandidate[]): readonly Destaque[] {
  if (candidatos.length === 0) return [];
  const usados = new Set<string>();
  const resultado: Destaque[] = [];

  const escolher = (
    angulo: AnguloDeLeitura,
    comparar: (a: OpportunityCandidate, b: OpportunityCandidate) => number,
  ) => {
    const disponivel = candidatos.filter((item) => !usados.has(item.id));
    if (disponivel.length === 0) return;
    const melhor = [...disponivel].sort(comparar)[0]!;
    usados.add(melhor.id);
    resultado.push({ angulo, candidato: melhor });
  };

  escolher("melhor-combinacao", (a, b) => b.pontuacaoGlobal - a.pontuacaoGlobal);
  escolher("maior-afinidade", (a, b) => b.fit - a.fit || b.pontuacaoGlobal - a.pontuacaoGlobal);
  escolher("menor-investimento", (a, b) => {
    const custo = (item: OpportunityCandidate) => item.viabilidade.investimentoInicial?.min ?? Number.MAX_SAFE_INTEGER;
    return custo(a) - custo(b) || b.pontuacaoGlobal - a.pontuacaoGlobal;
  });
  escolher("receita-mais-rapida", (a, b) => {
    const meses = (item: OpportunityCandidate) => item.viabilidade.tempoAteReceitaMeses?.min ?? Number.MAX_SAFE_INTEGER;
    return meses(a) - meses(b) || b.pontuacaoGlobal - a.pontuacaoGlobal;
  });
  // ── O ângulo que faltava ──────────────────────────────────────────
  //  Os outros seis são todos, à sua maneira, conservadores: o mais
  //  equilibrado, o que melhor te encaixa, o mais barato, o mais rápido,
  //  o menos arriscado, o mais provado. Nenhum escolhia o AMBICIOSO, e um
  //  motor que nunca o mostra empurra toda a gente para o mesmo canto.
  //
  //  `escalabilidade` já existe no modelo, declarada com significado: 0 é
  //  trocar horas por dinheiro, 3 é crescer sem custo proporcional. Este
  //  ângulo lê-a e não inventa nada — em particular, não promete receita.
  //  «Maior potencial» aqui quer dizer «o teto não são as tuas horas», que
  //  é uma propriedade do modelo, não uma previsão sobre o negócio.
  //
  //  As recusas duras já eliminaram tudo o que a pessoa não aceita antes
  //  de chegar aqui, por isso ambicioso nunca quer dizer proibido.
  escolher(
    "maior-potencial",
    (a, b) =>
      b.modelo.escalabilidade - a.modelo.escalabilidade ||
      b.pontuacaoGlobal - a.pontuacaoGlobal,
  );
  escolher("menor-risco", (a, b) => {
    // Só riscos APURADOS decidem quem leva o selo. Com `!`, uma hipótese
    // penalizada por riscos que ninguém mediu perdia-o para outra com
    // risco medido maior — o selo saía errado, e ninguém o via.
    const fora = (item: OpportunityCandidate) =>
      item.riscos.filter((risco) => risco.dentroDaTolerancia === false).length;
    return fora(a) - fora(b) || b.pontuacaoGlobal - a.pontuacaoGlobal;
  });
  escolher(
    "mais-evidencia",
    (a, b) => b.evidencias.length - a.evidencias.length || b.pontuacaoGlobal - a.pontuacaoGlobal,
  );
  escolher("fora-do-obvio", (a, b) => {
    // Contrarian: problema com recorrência natural, B2B, poucos requisitos
    // e — sobretudo — que NÃO tem dossier curado. O que ninguém escreveu.
    const nota = (item: OpportunityCandidate) =>
      (item.seedTemplateId ? 0 : 3) +
      (item.problema.mercado === "b2b" ? 2 : 0) +
      (item.problema.recorrenciaNatural === "recorrente" ? 2 : 0) +
      (item.regulacao.barreira <= 1 ? 1 : 0);
    return nota(b) - nota(a) || b.pontuacaoGlobal - a.pontuacaoGlobal;
  });

  return resultado;
}
