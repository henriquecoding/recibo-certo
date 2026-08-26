// ═══════════════════════════════════════════════════════════════════════
//  A GRAMÁTICA DE MOVIMENTO — partilhada por todos os palcos
//  ---------------------------------------------------------------------
//  Havia duas cópias disto: uma em `components/preco/coreografia.ts` e
//  outra em `components/descobrir/coreografia.ts`. Não eram parecidas —
//  eram a mesma coisa escrita duas vezes, com as mesmas quatro curvas, o
//  mesmo `bezier`, o mesmo `entre`, o mesmo `medir` e o mesmo `arco`.
//
//  Duas cópias de uma gramática de movimento não é redundância inofensiva:
//  é a garantia de que um dia os dois palcos animam de maneiras
//  ligeiramente diferentes e ninguém consegue apontar porquê. E já tinha
//  começado — `ASSENTA` divergia no segundo ponto de controlo (1,56 num
//  ficheiro, 1,42 no outro).
//
//  Aqui vive a MECÂNICA, que é comum. O significado das cores e os tempos
//  de cada cena continuam em cada palco, porque esses são específicos do
//  que cada um tem para dizer.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Uma curva de Bézier como o `motion` a quer: uma tupla de quatro, e não
 * `number[]`. A diferença é o que impede um `as unknown as` em cada
 * `transition` — e um `as unknown as` num tipo de animação é exatamente
 * onde uma curva errada passaria despercebida.
 */
export type Curva = [number, number, number, number];

/**
 * Chegadas, aparições, assentamentos. É o `EASE` da marca (`lib/motion.ts`).
 *
 * Sai depressa e assenta devagar — o `ease-out` forte que a literatura de
 * interface recomenda por omissão, porque a parte rápida acontece no
 * princípio e dá a impressão de resposta imediata.
 */
export const ENTRADA: Curva = [0.16, 1, 0.3, 1];

/** Partidas e rejeições. Acelera: o que parte tem de parecer puxado. */
export const SAIDA: Curva = [0.7, 0, 0.84, 0];

/** O trajeto de uma ficha. Simétrica — acelera a sair, trava a chegar. */
export const VIAGEM: Curva = [0.65, 0, 0.35, 1];

/**
 * Passa do alvo e volta. SÓ para coisas que pousam fisicamente.
 *
 * ── Porque 1,42 e não 1,56 ────────────────────────────────────────────
 *
 * Os dois palcos divergiam aqui. 1,56 dá um ressalto de ~5,6% acima do
 * alvo; 1,42 dá ~3,4%. Fica 1,42, e a regra do design system decide:
 * «premium é contenção». Um ressalto que se NOTA como ressalto lê-se como
 * efeito; um que só se sente como peso lê-se como massa. A diferença entre
 * os dois é precisamente a fronteira que separa uma interface séria de uma
 * que está a mostrar que sabe animar.
 */
export const ASSENTA: Curva = [0.34, 1.42, 0.64, 1];

/**
 * Avalia uma curva de Bézier — `y` em função de `x`, como o CSS faz.
 *
 * Existe porque as fichas não são animadas pelo `motion`: têm relógio
 * próprio, para a pausa as parar mesmo. Um relógio próprio precisa de saber
 * avaliar a curva, e é isto.
 *
 * Newton-Raphson sobre o eixo x, oito iterações. É o método que os browsers
 * usam e converge muito antes disso para as curvas que aqui vivem.
 */
export function bezier([x1, y1, x2, y2]: Curva): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const emX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const emY = (t: number) => ((ay * t + by) * t + cy) * t;
  const derivadaX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const erro = emX(t) - x;
      if (Math.abs(erro) < 1e-6) break;
      const d = derivadaX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= erro / d;
    }
    return emY(t);
  };
}

/** Interpolação linear, para poupar a escrita nos atores. */
export const entre = (de: number, para: number, t: number) => de + (para - de) * t;

/**
 * As escalas de duração, em ms.
 *
 * Não são números redondos por acaso: são degraus suficientemente
 * separados para que a diferença entre dois se NOTE. Uma escala com 400 e
 * 450 ms não é uma escala — é ruído com dois nomes.
 */
export const DUR = {
  /** Foco, hover, toque, um controlo a mudar de estado. */
  micro: 160,
  /** Uma peça a aparecer. */
  entrada: 420,
  /**
   * Uma peça a sair. Mais curta do que a entrada, de propósito.
   *
   * O Material 3 emparelha as curvas de entrada e de saída (*decelerate* +
   * *accelerate*) e dá à saída menos tempo: o que chega tem de ser lido, o
   * que parte já foi. Uma saída com a duração de uma entrada faz a peça
   * demorar-se — e uma peça que se demora a sair lê-se como indecisão.
   */
  saida: 280,
  // ── As três distâncias de uma viagem ────────────────────────────────
  //  A mesma duração em distâncias diferentes é VELOCIDADE diferente, e é
  //  a velocidade que o olho lê. Uma ficha que atravessa 200 px em 640 ms
  //  e outra que atravessa 400 px no mesmo tempo não parecem a mesma coisa
  //  a mover-se: parecem duas coisas com pesos diferentes.
  //
  //  Por isso a escala tem três degraus, e cada palco escolhe o seu — em
  //  vez de um número único a fingir que serve os dois.
  /** Dentro de uma coluna, ou entre colunas vizinhas. */
  viagem: 640,
  /** Entre zonas de uma mesa larga — o passo da «Mesa de decisão». */
  viagemAmpla: 740,
  /** Atravessa o palco inteiro. */
  viagemLonga: 820,
  /** Um candidato riscado e arquivado. */
  rejeicao: 500,
  /** Um contador a somar uma parcela. */
  contaParcela: 380,
  /** O contador do resultado. */
  contaResultado: 980,
  /** A régua a desenrolar-se. */
  desenrolar: 700,
  /** Overshoot + repouso. */
  assenta: 340,
  /** O anel que fica onde uma ficha chegou. */
  impacto: 280,
} as const;

// ═══════════════════════════════════════════════════════════════════════
//  O INTERVALO ENTRE DOIS EVENTOS É O QUE OS AGRUPA
//  ---------------------------------------------------------------------
//  Isto não estava no vocabulário e devia estar. Os desfasamentos da cena
//  eram números avulsos — 220 aqui, 90 ali, 180 acolá — escolhidos um a um
//  por parecerem bem. Mas o intervalo entre dois eventos não é decoração:
//  é o que decide se o olho os lê como UM acontecimento, como IRMÃOS, ou
//  como duas coisas diferentes.
//
//  Duas leituras da literatura obrigam a levar isto a sério:
//
//   · **Lei de Gestalt do Destino Comum** (Chalbi et al., *Common Fate for
//     Animated Transitions in Visualization*, IEEE VIS 2019): elementos que
//     se movem com a mesma velocidade e direção são vistos como um grupo.
//     Duas fichas que NÃO se sobrepõem no ar perdem essa pista de todo.
//
//   · **O desfasamento é um custo** (Chevalier, Dragicevic & Franconeri,
//     *The Not-so-Staggering Effect of Staggered Animated Transitions on
//     Visual Tracking*, IEEE TVCG 20(12), 2014). A conclusão deles é dura:
//     o benefício do desfasamento «é provavelmente ultrapassado pelos seus
//     custos — perda de previsibilidade nos instantes de partida, e
//     movimento mais rápido de cada elemento». Desfasar tem de COMPRAR
//     alguma coisa; se não compra, o certo é mover tudo junto.
//
//  Daí três degraus com nome, e não uma escada de números:
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
//  O ORÇAMENTO DA MÃO — o que um apontamento demora
//  ---------------------------------------------------------------------
//  Estava por escrever, e o resultado via-se: o ponteiro chegava ao campo
//  e carregava 160 ms depois. Nenhuma pessoa faz isso. Lia-se como um
//  script a executar passos, que é exatamente o que era.
//
//  ── `assenta` ────────────────────────────────────────────────────────
//
//  Quanto a mola do `palco/ponteiro.tsx` demora do arranque ao repouso,
//  na escala de distância destes palcos (a largura de uma coluna). Não é
//  um número escolhido: é o tempo medido com a rigidez e o amortecimento
//  de lá.
//
//  A lei de Fitts diz que o tempo de um apontamento cresce com o
//  logaritmo da distância sobre a largura do alvo — MT = a + b·log₂(A/W+1).
//  A mola dá essa dependência de graça na aceleração, que é proporcional
//  ao que falta; o que ela não dá é a variação no assentamento, que é
//  constante. Para as distâncias que estes palcos têm, a diferença não é
//  visível — daí um orçamento único e não uma função.
//
//  ── `espera` ─────────────────────────────────────────────────────────
//
//  A NN/g mediu em 0,3–0,5 s a paragem do cursor a partir da qual a
//  intenção se lê («Timing Guidelines for Exposing Hidden Content»: «o
//  melhor indício da intenção é o rato PARAR sobre um elemento»). 420 ms
//  fica no meio do intervalo.
//
//  Chegar e carregar são dois acontecimentos, e o silêncio entre eles é
//  o que os torna uma decisão em vez de uma sequência.
// ═══════════════════════════════════════════════════════════════════════

export const MAO = {
  /** Da partida ao repouso da mola, na escala de uma coluna. */
  assenta: 620,
  /** A paragem sobre o alvo antes de a intenção se ler. */
  espera: 420,
  /** Carregar e largar. */
  premir: 170,
} as const;

/** Partir daqui, chegar, parar — e só então o clique. */
export const aoChegar = (partida: number) => partida + MAO.assenta + MAO.espera;

export const PASSO = {
  /**
   * 90 ms — abaixo do limiar em que se julga a ordem de dois acontecimentos.
   * Duas peças a este intervalo não são duas: são uma a chegar com espessura.
   */
  uno: 90,
  /**
   * 160 ms — separadamente legíveis, mas ainda sobrepostas no ar.
   *
   * É o intervalo das partes de uma mesma soma. Com uma viagem de 640 ms,
   * três fichas a 160 ms estão as três no ar durante 320 ms — metade do
   * percurso — e é essa sobreposição que lhes dá destino comum. A 220 ms,
   * que era o valor anterior, a sobreposição caía para 200 ms e as fichas
   * liam-se como três acontecimentos sem relação.
   */
  irmao: 160,
  /**
   * 380 ms — uma fronteira. O que vem a seguir é outra ideia.
   *
   * Não é um desfasamento: é um silêncio. Separa a margem (que é tua) das
   * retenções (que não são).
   */
  outro: 380,
} as const;

/**
 * O **dwell** de um desfasamento — a métrica de Chevalier et al. (2014).
 *
 *   dwell = dt · |P| / t(A)
 *
 * `0` é movimento simultâneo; `1` é sequência pura, sem sobreposição
 * nenhuma. Serve para uma coisa muito concreta: transformar «acho que estas
 * fichas estão demasiado espalhadas» num número que se discute.
 *
 * @param dt     o intervalo entre partidas, em ms
 * @param pecas  quantas peças se movem
 * @param total  do instante da primeira partida ao da última chegada, em ms
 */
export const dwell = (dt: number, pecas: number, total: number) =>
  total > 0 ? (dt * pecas) / total : 0;
