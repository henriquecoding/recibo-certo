// AS DUAS COREOGRAFIAS DA ROTA BIFURCADA
// ─────────────────────────────────────────────────────────────────────────
// `/inicio/salario` tem dois palcos no MESMO lugar, trocados por um
// radiogroup: quem recebe vê «A conferência», quem contrata vê «O que
// cabe». São duas perguntas diferentes e por isso dois verbos diferentes,
// mas partilham a rota, a moldura e esta gramática de movimento — e é por
// isso que as duas coreografias vivem no mesmo ficheiro em vez de uma
// delas nascer sozinha, à mão, com as suas próprias durações.
//
// «A CONFERÊNCIA» — verbo: CONFERIR.
//
// Um bruto comum abre em dois recibos. A varredura confirma primeiro a
// Segurança Social e só depois isola o IRS; a projeção anual nasce da linha
// divergente e é apresentada como hipótese, não como facto consumado.
//
// «O QUE CABE» — verbo: CABER.
//
// Um orçamento anual entra inteiro e sai repartido. Três parcelas saem dele
// e viajam para as caixas do posto; o vencimento é o que FICA depois disso,
// e não uma escolha de quem contrata. É a lição inteira do palco, e a única
// forma de a dizer é mostrar a subtração a acontecer.

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
    id: "receber",
    rotulo: "O recibo",
    legenda: "Ler a conta que foi processada",
    duracao: 2500,
    beats: [
      { id: "origem", em: 0 },
      { id: "recibo", em: 300 },
      { id: "linhaSS", em: 720 },
      { id: "linhaIRS", em: 900 },
      { id: "liquidoRecibo", em: 1550 },
    ],
  },
  {
    id: "refazer",
    rotulo: "A conta",
    legenda: "Refazer o recibo com o dependente declarado",
    duracao: 2800,
    beats: [
      { id: "recalculo", em: 0 },
      { id: "calcSS", em: 420 },
      { id: "calcIRS", em: 650 },
      { id: "liquidoCerto", em: 1450 },
    ],
  },
  {
    id: "inspecionar",
    rotulo: "A inspeção",
    legenda: "Percorrer as linhas e isolar a divergência",
    duracao: 2800,
    beats: [
      { id: "varre", em: 0 },
      { id: "ssBate", em: 850 },
      { id: "irsFalha", em: 1450 },
      { id: "delta", em: 2050 },
    ],
  },
  {
    id: "explicar",
    rotulo: "O impacto",
    legenda: "Explicar a tabela e projetar a repetição do erro",
    duracao: 3300,
    beats: [
      { id: "causa", em: 0 },
      { id: "motivo", em: 480 },
      { id: "pagamentos", em: 1050 },
      { id: "total", em: 1850 },
      { id: "resolve", em: 2550 },
    ],
  },
];

export const ULTIMO_ATO_SALARIO = ATOS_SALARIO.length - 1;

// ═══════════════════════════════════════════════════════════════════════
//  «O QUE CABE» — a coreografia do lado de quem contrata
//  ---------------------------------------------------------------------
//  ── Porque é que esta coreografia teve de ser escrita de raiz ─────────
//
//  Existia, e tinha os quatro atos com `beats: []`. Quatro atos sem um
//  único beat é um relógio a andar sem nada ligado a ele: a régua do
//  rodapé enchia-se, o cabeçalho mudava de legenda, e no palco não
//  acontecia coisa nenhuma além de uma borda a acender por CSS. Uma
//  demonstração em que nada chega a lado nenhum não demonstra — decora.
//
//  ── A aritmética que a cena mostra, e que é verdadeira ao cêntimo ─────
//
//    42 000,00   orçamento anual
//    −  2 100,00   5% que fica protegido
//    = 39 900,00   o que pode ser usado
//    −  2 356,20   refeição (10,20 € × 231 dias)
//    −  7 070,98   contribuição do lado da empresa
//    −    700,00   seguro de acidentes + SST
//    = 29 772,82   salário e subsídios ── ÷ 14 ──▸ 2 126,63 €/mês
//
//  As quatro parcelas vêm de `employerCost.breakdown` e somam
//  `annualStabilized` porque é essa a soma que o motor faz para o
//  produzir. Não é uma conta refeita aqui: é a MESMA conta, mostrada.
//
//  ── Os intervalos ────────────────────────────────────────────────────
//
//  As três fichas partem a `PASSO.irmao` (160 ms) umas das outras: com a
//  viagem de 640 ms, estão as três no ar durante 320 ms e o olho lê-as
//  como as partes de uma subtração, não como três acontecimentos avulsos.
//  O `dwell` resultante é 160 × 3 / (640 + 320) = 0,5 — metade do caminho
//  em sequência, metade em simultâneo.
//
//  Entre a última ficha se dissolver (≈1 280 ms) e o resto assumir
//  (1 620 ms) há `PASSO.outro`: é um silêncio, não um desfasamento. Separa
//  o que SAIU do que FICOU, que é a fronteira que a cena existe para
//  mostrar.
// ═══════════════════════════════════════════════════════════════════════

export const ATOS_CONTRATACAO: Ato[] = [
  {
    id: "orcamento",
    rotulo: "A verba",
    legenda: "Reservar o que a empresa pode mesmo gastar",
    duracao: 2900,
    beats: [
      { id: "envelope", em: 0 },
      { id: "enche", em: 260 },
      { id: "protege", em: 1300 },
      { id: "sobra", em: 1720 },
      { id: "pergunta", em: 2320 },
    ],
  },
  {
    id: "pacote",
    rotulo: "O pacote",
    legenda: "Repartir o orçamento pelas parcelas do posto",
    duracao: 3500,
    beats: [
      { id: "abre", em: 0 },
      // As três que SAEM, a `PASSO.irmao` uma da outra.
      { id: "refeicao", em: 320 },
      { id: "tsu", em: 480 },
      { id: "posto", em: 640 },
      // E, depois do silêncio, o que FICA.
      { id: "resto", em: 1620 },
      { id: "salario", em: 2060 },
      { id: "licao", em: 2700 },
    ],
  },
  {
    id: "dinheiros",
    rotulo: "Os três",
    legenda: "Separar a empresa, o trabalhador e o Estado",
    duracao: 3100,
    beats: [
      { id: "sai", em: 0 },
      { id: "divide", em: 620 },
      { id: "trabalhador", em: 1080 },
      { id: "estado", em: 1480 },
      { id: "intervalo", em: 2200 },
    ],
  },
  {
    id: "decisao",
    rotulo: "Decisão",
    legenda: "Confirmar que o posto se paga antes da proposta",
    duracao: 3400,
    beats: [
      { id: "equilibrio", em: 0 },
      { id: "receita", em: 380 },
      { id: "hora", em: 1140 },
      { id: "pico", em: 1680 },
      { id: "veredicto", em: 2280 },
      { id: "resolve", em: 2900 },
    ],
  },
];

export const ULTIMO_ATO_CONTRATACAO = ATOS_CONTRATACAO.length - 1;

/**
 * A cena inteira, em ms. Os portões esperam por ela em vez de repetirem a
 * soma — que foi como `verificar-palcos.mjs` ficou com `12_500` escrito à
 * mão para duas cenas que já não duravam isso.
 */
export const DURACAO_CONTRATACAO = ATOS_CONTRATACAO.reduce(
  (total, ato) => total + ato.duracao,
  0,
);
