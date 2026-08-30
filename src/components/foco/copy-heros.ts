// ═══════════════════════════════════════════════════════════════════════
//  OS TÍTULOS DOS CINCO HEROS — numa tabela só, com as regras à vista
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE É QUE ISTO DEIXOU DE VIVER EM CINCO FICHEIROS                │
//  │                                                                     │
//  │ Estavam escritos dentro de cada `Homepage*.tsx`, cada um no dia em  │
//  │ que aquele palco foi construído. Lidos um a um passavam; lidos      │
//  │ SEGUIDOS não eram um produto — eram cinco textos:                   │
//  │                                                                     │
//  │   · «Compensa a partir de 140 000 € por ano.»  ← um número          │
//  │   · «O teu recibo está certo? Há uma forma de saber.» ← pergunta    │
//  │      com resposta adiada                                            │
//  │   · «Recebeste 2000,00 €. Teus são 1240,40 €.» ← um exemplo         │
//  │      apresentado como se fosse o do leitor                          │
//  │   · «O preço não nasce de um palpite.» ← um slogan                  │
//  │   · «Uma ideia só interessa depois de resistir à realidade.»        │
//  │      ← um aforismo                                                  │
//  │                                                                     │
//  │ Cinco formas diferentes é o que se obtém quando não há forma        │
//  │ nenhuma declarada. Uma tabela obriga a ver os cinco ao mesmo tempo. │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ── Três defeitos que os cinco tinham, e que não eram de estilo ──────
//
//  1. **Nenhum continha a pergunta que a pessoa escreveu.** «O preço não
//     nasce de um palpite» não tem uma única palavra do que alguém
//     procura. A prática documentada para um H1 é a palavra-chave perto
//     do princípio, uma oração, 50–60 caracteres, e escrito para
//     pessoas — não uma frase que apenas *soa* bem.
//
//  2. **Descreviam a MÁQUINA, não o problema.** «Os dois caminhos
//     traçados sobre o mesmo eixo», «as linhas que batem acendem». Isso
//     é o que o palco faz, e o palco está logo a seguir a explicá-lo
//     sozinho. Um título gasta-se a dizer porque é que alguém devia
//     continuar a ler.
//
//  3. **Um deles afirmava um exemplo como se fosse universal.**
//     «Compensa a partir de 140 000 € por ano» — esse cruzamento é o de
//     um conjunto de pressupostos, não uma verdade. O número continua na
//     demonstração, com os pressupostos ao lado; o título deixou de o
//     declarar como lei.
//
//  ── A forma, agora ───────────────────────────────────────────────────
//
//  **Título:** uma oração, 42–62 caracteres, com as palavras da procura
//  no primeiro terço, dita ao leitor (`tu`) e sobre o dinheiro dele.
//
//  **Subtítulo:** 28–42 palavras. Diz o mecanismo em concreto e acaba no
//  que distingue esta resposta das outras — a data, a diferença anual, o
//  pressuposto, o teste. Sem primeira pessoa do plural: o produto não é
//  uma equipa a apresentar-se, é uma conta a ser feita.
//
//  As regras acima são verificadas por `foco-heros.test.ts`. Não é
//  disciplina: é uma barreira.
// ═══════════════════════════════════════════════════════════════════════

import type { FocoHomepage } from "@/lib/foco-homepage";

export interface CopyHero {
  /** O H1. Uma oração, 42–62 caracteres. */
  titulo: string;
  /**
   * Onde o título parte em duas linhas nos ecrãs largos.
   *
   * O índice do caractere, e não um `<br>` escrito no meio do texto: o
   * título tem de continuar a ser UMA string para se poder medir e
   * testar. No telemóvel não se aplica — lá quem parte é o `text-balance`.
   */
  quebra?: number;
  subtitulo: string;
}

export const COPY_HEROS: Record<FocoHomepage, CopyHero> = Object.freeze({
  // ── «Que negócio abrir» ────────────────────────────────────────────
  //  Procura-se «que negócio abrir em Portugal», «ideias de negócio
  //  rentável», «validar uma ideia». O que distingue esta ferramenta de
  //  todas essas listas é não devolver uma lista — e é isso que o
  //  subtítulo tem de dizer antes de alguém desistir por já ter visto
  //  quarenta listas iguais.
  descobrir: {
    titulo: "Que negócio testar primeiro — e como saber se falha.",
    quebra: 28,
    subtitulo:
      "O que sabes fazer, cruzado com as tuas restrições e com sinais oficiais de Portugal. " +
      "O resultado não é uma lista de ideias: é uma hipótese, com o primeiro teste que a pode deitar abaixo.",
  },

  // ── «Quanto cobrar» ────────────────────────────────────────────────
  //  A procura é «quanto cobrar como freelancer», «calcular valor hora»,
  //  «preço de venda com margem». O medo por trás dela é sempre o mesmo,
  //  e é ele que abre o título: trabalhar e ficar a perder.
  preco: {
    titulo: "Quanto tens de cobrar para não trabalhares a perder.",
    // 21 e não o meio: partir depois de «para» deixava a preposição
    // órfã no fim da primeira linha.
    quebra: 21,
    subtitulo:
      "Custos, o teu tempo, as comissões do canal, o IVA e a margem entram todos na mesma conta. " +
      "Sai um preço que se explica em parcelas — e que muda consoante vendas direto, num marketplace ou a recibos verdes.",
  },

  // ── «Recibos verdes» ───────────────────────────────────────────────
  //  O termo de procura mais disputado dos cinco, e onde todos os
  //  concorrentes dizem a mesma coisa («simulador de recibos verdes
  //  2026, quanto recebes líquido»). O que mais nenhum diz é a DATA — e
  //  a dívida à Segurança Social nasce precisamente de ninguém a saber.
  recibos: {
    titulo: "Quanto fica de cada recibo verde — e o que tens de guardar.",
    quebra: 33,
    subtitulo:
      "De cada recibo sai retenção de IRS e sai Segurança Social — e a segunda só sai um trimestre depois, " +
      "quando o dinheiro já parece teu. Aqui vês as duas, e o dia em que saem da conta.",
  },

  // ── «Recibo de vencimento» ─────────────────────────────────────────
  //  Quem procura isto tem o papel à frente e uma dúvida concreta. O
  //  título anterior — «Há uma forma de saber» — prometia a resposta
  //  para o parágrafo seguinte. O imperativo dá-a já.
  salario: {
    // Sem «teu»: com ele a primeira linha ficava com 34 caracteres, dois
    // acima do que cabe a 3,75 rem, e o título caía em TRÊS linhas — com
    // «vencimento,» sozinha no meio. O «teu» está no subtítulo, que tem
    // espaço para ele.
    titulo: "Confere o recibo de vencimento, linha a linha.",
    // Duas linhas desequilibradas de propósito: partir ao meio dava
    // «Confere o recibo de / vencimento», e «recibo de vencimento» é o
    // termo inteiro — é por ele que a pessoa chegou aqui. A segunda
    // linha, curta, lê-se como remate.
    quebra: 31,
    subtitulo:
      "O líquido é recalculado a partir do bruto — Segurança Social, retenção de IRS e os dois subsídios — " +
      "e fica lado a lado com o que a empresa te pagou. Se houver diferença, aparece em euros por ano.",
  },

  // ── «Recibos verdes ou empresa» ────────────────────────────────────
  //  A procura tem os dois lados lá dentro, e por isso o título também.
  //  O subtítulo acaba no pressuposto de propósito: o cruzamento é dos
  //  números de cada um, e afirmá-lo como universal era a única coisa
  //  factualmente errada nos cinco títulos antigos.
  empresa: {
    titulo: "Recibos verdes ou empresa — a partir de quanto compensa.",
    quebra: 26,
    subtitulo:
      "Os dois caminhos sobre o mesmo eixo de faturação, com o custo de ter contabilidade contado antes de qualquer imposto. " +
      "Onde as linhas se cruzam, a resposta muda — e o cruzamento depende dos teus números.",
  },
});

/**
 * O título partido em duas linhas para ecrãs largos.
 *
 * Devolve `[antes, depois]`. Quem desenha põe um `<br className="hidden
 * sm:block" />` entre os dois — no telemóvel a quebra fixa dava linhas
 * de três palavras, e lá quem manda é o `text-balance`.
 */
export function tituloEmDuasLinhas(copy: CopyHero): [string, string] {
  if (!copy.quebra) return [copy.titulo, ""];
  return [copy.titulo.slice(0, copy.quebra).trimEnd(), copy.titulo.slice(copy.quebra).trimStart()];
}
