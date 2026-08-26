// ═══════════════════════════════════════════════════════════════════════
//  «A REPARTIÇÃO» — a coreografia do foco dos recibos verdes
//  ---------------------------------------------------------------------
//  Verbo: REPARTIR. É o único dos cinco palcos que reparte, e é isso que o
//  impede de ser a cascata de deduções que os três focos antigos
//  partilhavam com números diferentes.
//
//  ── O que este palco tem para dizer ──────────────────────────────────
//
//  Deste recibo, uma parte é tua, outra é do Estado, e uma tem DATA.
//
//  ── A diferença estrutural face ao palco do preço ────────────────────
//
//  No preço, as fichas CONVERGEM: três origens diferentes viajam para um
//  destino comum e o cartão soma. Aqui DIVERGEM: uma origem única parte-se
//  em três e cada pedaço vai para o seu lado. É a mesma gramática lida ao
//  contrário, e por isso a mesma maquinaria a serve — mas o argumento é
//  outro, e vê-se.
//
//  ── E o ato 4 constrói ao contrário ──────────────────────────────────
//
//  Todos os outros palcos do site constroem para cima. Este constrói e
//  depois TIRA: o «disponível para gastar» desce quando a reserva se
//  enche. É deliberado. A mentira que este produto existe para desfazer é
//  «recebi 2 000 €», e uma animação que só some nunca a desfaz.
// ═══════════════════════════════════════════════════════════════════════

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
export { useRelogioDeAtos, type Ato, type Beat } from "@/components/palco/relogio";

import type { Ato } from "@/components/palco/relogio";

/**
 * A hesitação da digitação, em beats.
 *
 * Herdada do `HeroCard` da homepage antiga, que é a melhor coisa que lá
 * existe: escrever `2 → 20 → 200 → 2003 → 200 → 2000` engana-se de
 * propósito e corrige-se. Um campo que se preenche sozinho e certo à
 * primeira não é uma pessoa a escrever — é um vídeo.
 *
 * O que MUDA na mudança de casa: lá era uma cadeia de `setTimeout`, que
 * não sabe o que é uma pausa. Aqui são beats do relógio do ato, e a pausa
 * pára-os como pára tudo o resto.
 */
export const DIGITACAO: readonly { beat: string; texto: string }[] = [
  { beat: "d1", texto: "2" },
  { beat: "d2", texto: "20" },
  { beat: "d3", texto: "200" },
  { beat: "d4", texto: "2003" },
  { beat: "d5", texto: "200" },
  { beat: "d6", texto: "2000" },
];

export const ATOS_RECIBOS: Ato[] = [
  {
    id: "escrever",
    rotulo: "Valor",
    legenda: "Escrever o valor do recibo e calcular",
    duracao: 2900,
    beats: [
      { id: "campo", em: 0 },
      { id: "d1", em: 420 },
      { id: "d2", em: 620 },
      { id: "d3", em: 800 },
      // O engano. 180 ms depois do anterior e depois 420 ms parado: é o
      // tempo de alguém ver que escreveu um dígito a mais.
      { id: "d4", em: 980 },
      { id: "d5", em: 1400 },
      { id: "d6", em: 1580 },
      { id: "formata", em: 1900 },
      { id: "calcula", em: 2300 },
    ],
  },
  {
    id: "repartir",
    rotulo: "Repartir",
    legenda: "Partir o recibo nos seus três destinos",
    duracao: 2500,
    beats: [
      { id: "nota", em: 0 },
      // As três partem a `PASSO.irmao` (160 ms): são partes de uma mesma
      // nota e têm de estar no ar em conjunto para se lerem como uma
      // repartição em vez de três acontecimentos sem relação.
      { id: "fichaTeu", em: 260 },
      { id: "fichaIRS", em: 420 },
      { id: "fichaSS", em: 580 },
      { id: "assenta", em: 1420 },
      { id: "parcelas", em: 1620 },
    ],
  },
  {
    id: "datar",
    rotulo: "Datar",
    legenda: "O que é do Estado tem prazo",
    duracao: 2400,
    beats: [
      { id: "acordaEstado", em: 0 },
      { id: "dataIRS", em: 420 },
      // `PASSO.uno` (90 ms): a retenção e a Segurança Social não são dois
      // acontecimentos — é um só, «isto tem prazo», visto duas vezes.
      { id: "dataSS", em: 510 },
      { id: "contaDias", em: 1200 },
      { id: "avisa", em: 1800 },
    ],
  },
  {
    id: "reservar",
    rotulo: "Reservar",
    legenda: "Separar o que não é para gastar",
    duracao: 3000,
    beats: [
      { id: "abreReserva", em: 0 },
      { id: "moveIRS", em: 460 },
      { id: "moveSS", em: 620 },
      // ── silêncio de 380 ms · `PASSO.outro` ──
      //  Uma fronteira antes de o número descer. O que vem a seguir é a
      //  única coisa desta cena que anda para trás, e tem de aterrar.
      { id: "desceDisponivel", em: 1640 },
      { id: "resolve", em: 2500 },
    ],
  },
];

export const ULTIMO_ATO_RECIBOS = ATOS_RECIBOS.length - 1;
