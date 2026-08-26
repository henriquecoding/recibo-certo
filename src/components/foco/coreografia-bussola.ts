// ═══════════════════════════════════════════════════════════════════════
//  «A BÚSSOLA» — a coreografia do hero da homepage
//  ---------------------------------------------------------------------
//  O hero não demonstra um cálculo: demonstra o GESTO da página. Aponta-se
//  uma das cinco perguntas e a resposta aparece ao lado, com o número
//  verdadeiro. É a única coisa que `/` tem para ensinar, e ensina-a
//  fazendo-a — não descrevendo-a.
//
//  ── Porque três atos, e porque ESTES três ────────────────────────────
//
//  O percurso visita «Descobrir», «Empresa» e «Recibos verdes». Não são
//  três escolhidos por variedade: são as três FORMAS de resposta que o
//  produto tem, e vê-las seguidas é a prova de que a bússola não é uma
//  calculadora com cinco capas.
//
//    · Descobrir devolve uma HIPÓTESE — não tem número nenhum.
//    · Empresa devolve um LIMIAR — um valor a partir do qual a conta vira.
//    · Recibos verdes devolve uma REPARTIÇÃO — com uma data marcada.
//
//  Se os três atos mostrassem três montantes em euros, a demonstração
//  provava o contrário do que quer provar. É a mesma regra que obriga cada
//  foco a ter um verbo próprio, aplicada ao roteiro.
//
//  ── E acaba onde o HTML servido já está ──────────────────────────────
//
//  O último ato abre «Recibos verdes», que é o painel que o servidor
//  renderiza. Quem chega sem JavaScript, com movimento reduzido, ou
//  simplesmente depois de a cena acabar, vê exatamente a mesma coisa.
// ═══════════════════════════════════════════════════════════════════════

import { MAO, aoChegar } from "@/components/palco/curvas";
import type { Ato } from "@/components/palco/relogio";
import type { FocoHomepage } from "@/lib/foco-homepage";

/**
 * Chegar ao alvo, parar, e só então a resposta abrir.
 *
 * `MAO` é o orçamento partilhado por todos os palcos — quanto a mola do
 * ponteiro demora a assentar, e quanto tem de ficar parada antes de a
 * intenção se ler. Vive em `palco/curvas.ts`, com a leitura da NN/g e da
 * lei de Fitts que o justifica.
 */
const ABRE = aoChegar;

/** Qual pergunta cada ato aponta. O último é o que o servidor serve. */
export const PERCURSO: readonly FocoHomepage[] = Object.freeze([
  "descobrir",
  "empresa",
  "recibos",
]);

export const FOCO_EM_REPOUSO = PERCURSO[PERCURSO.length - 1];

export const ATOS_BUSSOLA: Ato[] = [
  {
    id: "chegar",
    rotulo: "Perguntar",
    legenda: "As cinco perguntas, e a primeira resposta",
    duracao: 3000,
    beats: [
      // As cinco a `PASSO.irmao` (160 ms): são cinco entradas do mesmo
      // instrumento e têm de estar no ar em conjunto. A 380 ms liam-se
      // como cinco anúncios sem relação uns com os outros.
      { id: "p0", em: 0 },
      { id: "p1", em: 160 },
      { id: "p2", em: 320 },
      { id: "p3", em: 480 },
      { id: "p4", em: 640 },
      // ── silêncio de `PASSO.outro` ──
      //  O painel é a outra metade da ideia, não a sexta linha da lista.
      { id: "painel", em: 1020 },
      { id: "ponteiroEntra", em: 1180 },
      { id: "vaiA", em: 1340 },
      { id: "abre", em: ABRE(1340) },
    ],
  },
  {
    id: "comparar",
    rotulo: "Comparar",
    legenda: "Apontar outra pergunta e ver outra resposta",
    duracao: 2800,
    beats: [
      { id: "vaiA", em: 220 },
      { id: "abre", em: ABRE(220) },
    ],
  },
  {
    id: "abrir",
    rotulo: "Abrir",
    legenda: "Escolher uma pergunta e abrir a ferramenta que a responde",
    duracao: 3200,
    beats: [
      { id: "vaiA", em: 220 },
      { id: "abre", em: ABRE(220) },
      // O clique acontece DEPOIS de a resposta estar aberta: primeiro
      // vê-se o que há, só depois se decide entrar. A ordem inversa
      // mostrava alguém a clicar às cegas, que é o que esta página existe
      // para deixar de ser preciso.
      { id: "preme", em: 1560 },
      { id: "solta", em: 1560 + MAO.premir },
      { id: "acende", em: 1860 },
      { id: "ponteiroSai", em: 2600 },
    ],
  },
];
