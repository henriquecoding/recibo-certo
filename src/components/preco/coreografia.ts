// ═══════════════════════════════════════════════════════════════════════
//  A MAQUINARIA DA COREOGRAFIA DO PALCO DO PREÇO
//  ---------------------------------------------------------------------
//  Os tempos e as curvas daqui são os de `docs/design/roteiro-animacao-preco.md`.
//  Esse documento é a fonte de verdade; este ficheiro é a sua execução, e
//  `coreografia.test.ts` verifica que os dois não divergem.
//
//  Aqui vive UMA decisão que vale a pena explicar antes do código:
//
//  ── Porque é que os beats não são `setTimeout` ────────────────────────
//
//  Porque a demonstração pode ser pausada, e uma cadeia de temporizadores
//  não sabe o que é uma pausa. Suspender e retomar dez `setTimeout` com o
//  tempo restante de cada um é possível, e é exatamente o tipo de código
//  que fica dessincronizado ao segundo bug.
//
//  Em vez disso há UM relógio por ato — o mesmo padrão que
//  `simulador/palco.tsx` já usa para a barra de progresso: um
//  `requestAnimationFrame` acumula tempo decorrido enquanto não está
//  parado, e dispara os beats cujo instante já passou. Pausar é deixar de
//  acumular. Não há nada para ressincronizar porque nunca houve dois
//  relógios.
// ═══════════════════════════════════════════════════════════════════════

// A mecânica — curvas, avaliador de Bézier, escalas de duração, relógio e
// medição — vive agora em `components/palco/`, partilhada com o palco de
// «Descobrir». Estava duplicada byte a byte nos dois sítios, e já tinha
// começado a divergir: `ASSENTA` tinha 1,56 aqui e 1,42 lá.
//
// O que fica NESTE ficheiro é o que é específico desta cena: a sua linha
// temporal.
export {
  ENTRADA,
  SAIDA,
  VIAGEM,
  ASSENTA,
  DUR,
  PASSO,
  bezier,
  dwell,
  entre,
  type Curva,
} from "@/components/palco/curvas";
export { medir, arco, type Ponto } from "@/components/palco/medida";
export { useRelogioDeAtos, type Ato, type Beat, type Relogio } from "@/components/palco/relogio";

import type { Ato } from "@/components/palco/relogio";

// ── A linha temporal desta cena ────────────────────────────────────────

export const ATOS: Ato[] = [
  {
    id: "custos",
    rotulo: "Custos",
    legenda: "Separar o que é custo do que não é",
    duracao: 1800,
    beats: [
      { id: "regua", em: 0 },
      { id: "materiais", em: 140 },
      { id: "trabalho", em: 320 },
      { id: "fixos", em: 500 },
      // O beat que faltava a este ato. Antes o markup NASCIA apagado, o que
      // é uma afirmação: a pessoa via um controlo esbatido e não sabia
      // porquê. Agora as quatro linhas começam iguais e o markup ESCURECE —
      // uma triagem visível, que é o que o ato tem para dizer.
      { id: "apagaMarkup", em: 820 },
      { id: "pegas", em: 1180 },
    ],
  },
  {
    id: "base",
    rotulo: "Base",
    legenda: "Somar a base de custos",
    duracao: 2100,
    beats: [
      { id: "cartao", em: 0 },
      // ── As três fichas partem a `PASSO.irmao` (160 ms) ─────────────────
      //  Estavam a 220 ms. Com uma viagem de 640 ms isso deixava-as no ar
      //  em conjunto apenas 200 ms — 31% do percurso — e três fichas que
      //  mal se cruzam não têm destino comum: leem-se como três
      //  acontecimentos separados, que é o contrário do que este ato diz.
      //
      //  A 160 ms a sobreposição sobe para 320 ms (50% do percurso) e o
      //  dwell de Chevalier et al. desce de 0,61 para 0,50. As aterragens
      //  continuam a 160 ms umas das outras — bem acima do limiar em que
      //  dois acontecimentos se fundem —, portanto a base continua a contar
      //  em três degraus visíveis. O desfasamento comprou o que tinha de
      //  comprar e não mais do que isso.
      { id: "fichaA", em: 180 },
      { id: "fichaB", em: 340 },
      { id: "fichaC", em: 500 },
      // As aterragens não são beats: acontecem quando a ficha chega, e é a
      // chegada que faz o contador andar. Um beat de aterragem seria um
      // segundo relógio a dizer o que o primeiro já sabe — e a primeira
      // oportunidade para os dois discordarem.
      { id: "assenta", em: 1300 },
      // As três linhas de origem acendem AO MESMO TEMPO — luminância
      // dinâmica simultânea, que Chalbi et al. mostram ser uma pista de
      // destino comum tão forte como a posição. É o grupo a responder: «as
      // três, juntas, são esta base.» Nenhuma ficha o podia dizer sozinha.
      { id: "confirmaOrigens", em: 1400 },
      { id: "parcelas", em: 1560 },
    ],
  },
  {
    id: "impostos",
    rotulo: "Markup e IVA",
    legenda: "Aplicar markup e IVA",
    duracao: 2500,
    beats: [
      { id: "acordaMarkup", em: 0 },
      { id: "chipMargem", em: 260 },
      // ── silêncio de 380 ms · `PASSO.outro` ──
      //  Uma fronteira, não um desfasamento: o que vem a seguir é outra
      //  ideia. A margem é tua; o que se segue não é.
      { id: "chipRetencao", em: 1280 },
      // …e as duas retenções partem a `PASSO.uno` (90 ms), não a 220.
      //  Abaixo do limiar de ordem: não são dois acontecimentos, é um só —
      //  «isto sai» — visto duas vezes. O intervalo passa a codificar a
      //  pertença ao grupo, que é trabalho que nenhum rótulo faz sozinho.
      { id: "chipIVA", em: 1370 },
      { id: "estado", em: 1980 },
    ],
  },
  {
    id: "preco",
    rotulo: "Preço",
    legenda: "Fixar o preço recomendado",
    // ── Este ato cresceu de propósito: 3 400 → 4 500 ms ─────────────────
    //  Tinha nove beats em 3,4 s, com três a dispararem em 300 ms: o preço
    //  a contar (980 ms), a régua a desenrolar-se (700 ms) e as zonas a
    //  ganharem cor — as zonas a colorir uma régua que ia em 20% do seu
    //  desenrolar. É o princípio da apreensão de Tversky, Morrison &
    //  Bétrancourt (2002) a ser violado à letra: a animação é depressa e
    //  complexa demais para ser percebida com exatidão.
    //
    //  Encurtar não era opção — o que lá está é preciso todo. Espalhar é.
    duracao: 4500,
    beats: [
      { id: "handoff", em: 0 },
      { id: "chega", em: 880 },
      // ── silêncio de 260 ms ──
      { id: "contaPreco", em: 1140 },
      { id: "regua", em: 1300 },
      // As zonas deixaram de aparecer em bloco e passaram a ser ALCANÇADAS
      // pelo desenrolar da régua: a primeira quando a borda a passa, a
      // última quando a régua fecha (1300 + 700 = 2000). O princípio da
      // congruência diz que a forma do gráfico tem de corresponder à forma
      // da ideia — e a ideia aqui é que a régua se está a pintar a si
      // própria, não que três rótulos apareceram por cima dela.
      { id: "zonas", em: 1530 },
      // E o marcador só cai depois de a régua estar fechada (2000) e de o
      // preço ter parado de contar (2120). Um marcador a aterrar sobre uma
      // escala a meio-desenhar, enquanto o número ainda muda, são três
      // afirmações ao mesmo tempo — e o §7 proíbe duas.
      { id: "marcadorCai", em: 2200 },
      { id: "marcadorViaja", em: 2520 },
      { id: "barra", em: 3240 },
      { id: "resolve", em: 4000 },
    ],
  },
];

export const ULTIMO_ATO = ATOS.length - 1;
