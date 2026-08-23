// ═══════════════════════════════════════════════════════════════════════
//  AFINIDADE — os tipos, e nada mais
//  ---------------------------------------------------------------------
//  Sem React, sem Supabase, sem o catálogo de ferramentas. O motor de
//  pontuação é uma função pura sobre estes objetos, e é essa pureza que o
//  torna testável sem arranque de aplicação nenhuma.
//
//  A decisão que atravessa este ficheiro: **nada chega ao ecrã sem saber
//  de onde veio**. Um `CandidatoAfinidade` carrega sempre as dimensões que
//  produziram a sua posição, e não há caminho no tipo para construir um
//  sem elas. É o mesmo princípio que a `Proveniencia` impõe no motor de
//  descoberta (`negocio/descoberta/`): uma ordenação que não sabe
//  explicar-se é uma ordenação que ninguém pode contestar.
// ═══════════════════════════════════════════════════════════════════════

import type { AreaCanonica } from "../personalizacao/taxonomia";
import type { CartaoDoDiretorio } from "../diretorio";

/**
 * De onde veio cada ponto.
 *
 * `area_declarada` e `area_implicita` são deliberadamente dois sinais e
 * não um: marcar «IRS» no perfil e escrever «declarações de rendimentos»
 * não provam a mesma coisa, e o cartão tem de poder dizer qual das duas
 * aconteceu sem fingir que é indiferente.
 */
export type FonteDoSinal =
  | "area_declarada"
  | "area_implicita"
  | "termo_proprio"
  | "cobertura"
  | "disponibilidade"
  | "identidade";

export interface Dimensao {
  fonte: FonteDoSinal;
  /** Entre 0 e 1. Nunca uma nota: é quanto desta dimensão foi satisfeito. */
  valor: number;
  /** O peso com que entra na soma. Ver `PESOS` em `motor.ts`. */
  peso: number;
  /** O que se pode dizer em voz alta sobre este sinal. `null` quando é zero. */
  nota: string | null;
}

/** Uma área pedida por um contexto, e o quanto ela pesa nesse contexto. */
export interface PesoDeArea {
  area: AreaCanonica;
  /** Entre 0 e 1. `1` é «é disto que esta ferramenta trata». */
  peso: number;
}

/**
 * O que um contexto — uma ferramenta, um guia, um resultado — precisa de
 * um contabilista.
 *
 * É calculada no servidor e desce como propriedade para o cliente: assim o
 * catálogo de ferramentas e a tabela de vocabulário nunca entram no pacote
 * do browser para responder a uma pergunta que já tem resposta.
 */
export interface Necessidade {
  /** Quem está a perguntar. O `id` da ferramenta, para a medição. */
  origem: string;
  /** Como se chama, para a copy. «Simulador de IRS anual». */
  rotulo: string;
  /** As áreas do eixo canónico, por ordem de peso decrescente. */
  areas: PesoDeArea[];
  /** As palavras com que este contexto se descreve — casam com os termos próprios. */
  vocabulario: string[];
  /**
   * Onde a pessoa está, quando se sabe. Nunca inferido de um IP nem de um
   * palpite: sem este dado, a dimensão de cobertura é omitida e o peso
   * redistribui-se.
   */
  distrito?: string | null;
  concelho?: string | null;
}

export interface CandidatoAfinidade {
  cartao: CartaoDoDiretorio;
  /** 0 a 100, arredondado. Ordena; não avalia. */
  pontuacao: number;
  /**
   * A posição publicada, a começar em 1. Empates PARTILHAM o número — ver
   * `empatadoCom`. Esconder um empate é fabricar uma ordem que não existe.
   */
  posicao: number;
  /** Os nomes com quem partilha a posição. Vazio quando não há empate. */
  empatadoCom: string[];
  dimensoes: Dimensao[];
  /** As áreas pedidas que este perfil cobre, pela ordem em que foram pedidas. */
  areasQueExplicam: AreaCanonica[];
  /** Os termos próprios que casaram com o vocabulário do contexto. */
  termosQueExplicam: string[];
  /**
   * A frase do cartão. «Trabalha com IRS e recibos verdes.»
   *
   * Nunca superlativa e nunca comparativa: descreve o que a pessoa
   * declarou, não o lugar que ocupa na lista.
   */
  motivo: string;
  /**
   * `false` quando nenhuma área pedida foi coberta — está na lista porque
   * havia lugar, não porque corresponde. A interface é OBRIGADA a dizê-lo.
   */
  correspondeAsAreas: boolean;
}
