// ═══════════════════════════════════════════════════════════════════════
//  «A CONFERÊNCIA» — a coreografia do foco do salário
//  ---------------------------------------------------------------------
//  Verbo: CONFERIR. É o único palco do site com DUAS COLUNAS EM CONFRONTO,
//  e é essa a razão de o Salário deixar de ser «a calculadora com outro
//  número».
//
//  O foco do salário mostrava a mesma cascata de deduções do recibo verde.
//  Mas não é isso que a ferramenta faz de único: o que ela tem e mais
//  nenhuma tem é a AUDITORIA — confrontar o recibo real com o que devia
//  ser. Uma cascata de deduções não diz isso. Duas colunas encostadas
//  dizem-no sem uma palavra.
//
//  ── A regra de destino comum, ao contrário ──────────────────────────
//
//  Em todos os outros palcos, o que se move em conjunto agrupa-se. Aqui o
//  agrupamento serve para EXCLUIR: as linhas que batem acendem todas ao
//  mesmo tempo, e a que não bate vê-se por NÃO ter acendido com elas. É a
//  Lei do Destino Comum usada como pinça em vez de como cola.
//
//  Por isso este ato recebe o silêncio mais longo do site — `PASSO.outro`
//  entre a última linha certa e a linha errada. É o beat de que tudo
//  depende: sem ele, a linha errada seria só mais uma a acender.
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

export const ATOS_SALARIO: Ato[] = [
  {
    id: "chegar",
    rotulo: "O recibo",
    legenda: "Ler o recibo que recebeste",
    duracao: 2600,
    beats: [
      { id: "papel", em: 0 },
      { id: "bruto", em: 340 },
      // As linhas do recibo entram a `PASSO.irmao`: são partes de um mesmo
      // documento, e têm de se ler como um bloco e não como quatro avisos.
      { id: "linha1", em: 640 },
      { id: "linha2", em: 800 },
      { id: "linha3", em: 960 },
      { id: "liquidoRecibo", em: 1700 },
    ],
  },
  {
    id: "refazer",
    rotulo: "A conta",
    legenda: "Refazer a conta a partir do bruto",
    duracao: 3000,
    beats: [
      { id: "abreColuna", em: 0 },
      { id: "calcSS", em: 380 },
      { id: "calcIRS", em: 540 },
      { id: "calcSub", em: 700 },
      { id: "liquidoMotor", em: 1800 },
      { id: "prontoParaConferir", em: 2400 },
    ],
  },
  {
    id: "confrontar",
    rotulo: "Conferir",
    legenda: "Pôr as duas colunas lado a lado",
    duracao: 3000,
    beats: [
      { id: "encosta", em: 0 },
      // As três que batem acendem quase em simultâneo — `PASSO.uno` — para
      // se lerem como UMA confirmação e não como três.
      { id: "bate1", em: 620 },
      { id: "bate2", em: 710 },
      { id: "bate3", em: 800 },
      // ── SILÊNCIO · 380 ms (`PASSO.outro`) ──
      //  O beat de que tudo depende. Sem ele a linha errada seria só mais
      //  uma a acender; com ele, é a única que ficou de fora.
      { id: "falha", em: 1600 },
      { id: "marcaFalha", em: 2100 },
    ],
  },
  {
    id: "explicar",
    rotulo: "Porquê",
    legenda: "Explicar a linha que não bate",
    duracao: 3000,
    beats: [
      { id: "abreExplicacao", em: 0 },
      { id: "motivo", em: 460 },
      { id: "anual", em: 1300 },
      { id: "resolve", em: 2200 },
    ],
  },
];

export const ULTIMO_ATO_SALARIO = ATOS_SALARIO.length - 1;
