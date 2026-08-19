// ═══════════════════════════════════════════════════════════════════════
//  CAMADAS DE REVELAÇÃO — o que se mostra, e QUANDO
//  ---------------------------------------------------------------------
//  A ferramenta sabe muita coisa. O defeito medido não era falta de
//  profundidade: era mostrá-la toda ao mesmo tempo, antes de a pessoa ter
//  respondido a alguma coisa.
//
//  Medido em navegador real, no estado inicial e a 360 px:
//
//      13,8 ecrãs de altura     ·  1 941 palavras visíveis
//      2 004 palavras no total  ·  ~1 323 delas são aparato analítico
//
//  E o número sobre o qual esse aparato discorre é um EXEMPLO — sai dos
//  valores por omissão do cenário, ninguém o introduziu. Ou seja: mil
//  trezentas palavras a analisar em profundidade um número que não é de
//  ninguém. A primeira dobra em telemóvel não continha calculadora
//  nenhuma; a segunda continuava sem mostrar um preço.
//
//  ── A regra ────────────────────────────────────────────────────────
//  Nada é removido. O que muda é QUANDO aparece aberto:
//
//    nível 1  ·  exemplo    ninguém respondeu nada
//                → o trabalho da pessoa é RESPONDER, não analisar.
//                  Fica aberto o preço, os campos e os avisos graves.
//
//    nível 2  ·  estimado   já respondeu parte do essencial
//                → o número começa a ser dela; abre-se COMO se lá chegou
//                  (o dinheiro que entra, os prazos, o cursor do preço).
//
//    nível 3  ·  completo   o essencial está respondido
//                → agora decide-se; abrem-se os cenários, o objetivo
//                  invertido e a conclusão.
//
//  Repare-se no que NUNCA abre sozinho, em nível nenhum: a memória de
//  cálculo, as notas informativas e a sociedade. São prova a pedido. Estar
//  disponível não é o mesmo que estar exposto — e é essa diferença que
//  permite baixar a densidade percebida sem perder capacidade.
//
//  ── Porque é que isto vive na engine ───────────────────────────────
//  Porque a decisão «que profundidade é apropriada agora» depende do
//  `EstadoPreenchimento`, que já vive aqui e já é o mesmo que
//  `simulator_complete` e `escolherRota()` consomem. Em componente seria
//  uma segunda definição de «a pessoa já respondeu», a divergir da
//  primeira ao terceiro cenário novo.
//
//  ⚠️ A ESCOLHA DA PESSOA GANHA SEMPRE. Isto define o que está aberto de
//  PARTIDA. Quem fechar um bloco não pode vê-lo reabrir sozinho quando
//  responder ao campo seguinte — nem quem abriu um vê-lo fechar-se. Ver
//  `aberturaDe()` e o mapa de escolhas explícitas em `SimuladorPreco`.
// ═══════════════════════════════════════════════════════════════════════

import type { EstadoPreenchimento } from "./preenchimento";

export type NivelRevelacao = 1 | 2 | 3;

/**
 * As secções que a composição pode revelar ou recolher.
 *
 * NÃO estão aqui — e é deliberado — as que são sempre visíveis:
 *
 *   · o resumo, o cartão do preço, os campos essenciais e os avisos
 *     graves, porque não são profundidade: são a ferramenta;
 *   · os PRESSUPOSTOS, porque são o mecanismo de honestidade. São o que
 *     responde a «porque é que este número ainda não é meu?», e escondê-
 *     los seria devolver à ferramenta o defeito que eles vieram fechar.
 *     Regulam-se sozinhos: encolhem à medida que a pessoa responde e
 *     desaparecem quando não falta nada;
 *   · o ANÚNCIO do resultado, que é uma região viva `sr-only` para
 *     leitores de ecrã. Embrulhá-lo num revelador esconderia de quem não
 *     vê exatamente aquilo que ele existe para dizer.
 */
export type SeccaoPreco =
  | "slider"
  | "objetivo_invertido"
  | "desconto"
  | "caixa"
  | "tesouraria"
  | "sociedade"
  | "memoria"
  | "notas"
  | "cenarios"
  | "conclusao";

/**
 * A partir de que nível cada secção abre sozinha.
 *
 * `Infinity` diz «nunca por omissão» — disponível a um clique, nunca
 * aberta à entrada. É onde vive a prova: quem a quer, pede-a.
 */
export const NIVEL_DE_SECCAO: Record<SeccaoPreco, NivelRevelacao | typeof Infinity> = {
  // Nível 2 — como se lá chegou.
  //  Nenhuma abre no nível 1: com um número que ninguém introduziu, saber
  //  «quanto entra na conta» é analisar uma ficção com quatro casas.
  caixa: 2,
  tesouraria: 2,
  slider: 2,

  // Nível 3 — o que fazer com isto.
  cenarios: 3,
  desconto: 3,
  conclusao: 3,

  // Nunca por omissão — prova, casos raros, e as PERGUNTAS AO CONTRÁRIO.
  //
  //  O `objetivo_invertido` está aqui e não no nível 3 porque não é uma
  //  parte do resultado: é outra pergunta. «Quanto devo cobrar?» e
  //  «quanto tenho de vender para ganhar 2 000 €?» são dois modos da
  //  ferramenta, e abrir o segundo a quem fez o primeiro é responder a
  //  uma coisa que não foi perguntada — 815 px dela, medidos. A linha
  //  recolhida faz a pergunta em voz alta, que é melhor convite do que
  //  um painel aberto.
  objetivo_invertido: Infinity,
  memoria: Infinity,
  notas: Infinity,
  sociedade: Infinity,
};

/** O nível de revelação apropriado ao que a pessoa já respondeu. */
export function nivelDe(estado: EstadoPreenchimento): NivelRevelacao {
  switch (estado) {
    case "exemplo":
      return 1;
    case "estimado":
      return 2;
    case "completo":
      return 3;
  }
}

/** Uma secção abre sozinha neste estado? */
export function abreSozinha(seccao: SeccaoPreco, estado: EstadoPreenchimento): boolean {
  return NIVEL_DE_SECCAO[seccao] <= nivelDe(estado);
}

/**
 * O estado de abertura final de uma secção.
 *
 * A escolha explícita da pessoa, quando existe, ganha ao automatismo —
 * sempre, e nos dois sentidos. Sem isto, responder a mais um campo
 * reabriria por baixo tudo o que ela tinha acabado de fechar, que é o
 * comportamento mais irritante que uma revelação progressiva pode ter.
 */
export function aberturaDe(
  seccao: SeccaoPreco,
  estado: EstadoPreenchimento,
  escolhas: Readonly<Partial<Record<SeccaoPreco, boolean>>>,
): boolean {
  const escolhido = escolhas[seccao];
  return escolhido === undefined ? abreSozinha(seccao, estado) : escolhido;
}

/**
 * Quantas secções estão disponíveis — abertas ou não.
 *
 * Serve a métrica que impede esta mudança de se tornar uma amputação: a
 * capacidade não pode descer enquanto a densidade desce. Ver §23 do
 * prompt-mestre («não remover profundidade para limpar a UI»).
 */
export const TOTAL_SECCOES: number = Object.keys(NIVEL_DE_SECCAO).length;
