// ═══════════════════════════════════════════════════════════════════════
//  FONTES EM BLOCO — o que se descarrega, de onde, e de quando
//  ---------------------------------------------------------------------
//  Um conector normal pergunta a um endpoint e recebe umas centenas de
//  números. Estas fontes não: são dezenas de megabytes comprimidos que
//  descomprimem para centenas, com centenas de milhares de registos lá
//  dentro. Não se leem a pedido — leem-se num job agendado, e o que fica
//  no repositório são as contagens.
//
//  Este ficheiro é a declaração dessa leitura. É deliberadamente pequeno:
//  o que ele decide é O QUE se vai buscar, não como. O «como» está em
//  `zip.ts`, `json-array.ts` e `contratos.ts`, que são testados; o «onde»
//  é resolvido pela API do dados.gov, nunca por um URL fixo.
// ═══════════════════════════════════════════════════════════════════════

/**
 * As métricas que a ingestão em bloco pode publicar.
 *
 * Existem como constantes — e não como texto solto no script — para que
 * um piloto que as consuma falhe na compilação se alguma mudar de nome.
 * Um `metricId` errado não dá erro: dá um cartão vazio, que é pior.
 */
export const METRICAS_EM_BLOCO = Object.freeze({
  /** Contratos de serviços e bens celebrados e registados no ano. */
  contratosDeServicos: "procurement.contracts.services",
  /** Os que correram por procedimento aberto à concorrência. */
  procedimentosAbertos: "procurement.open_procedures",
} as const);

export interface FonteEmBloco {
  /** Nome do ficheiro do instantâneo. Estável ao longo dos anos. */
  id: string;
  /** Rótulo curto em pt-PT, para os registos do job. */
  rotulo: string;
  /** Slug do conjunto de dados no dados.gov. */
  dataset: string;
  /** Como encontrar o recurso certo dentro do conjunto de dados. */
  recurso: { ficheiro: string; formato: string };
  /** O ano civil que este instantâneo conta. */
  ano: number;
  /**
   * Indicador do INE de onde se derivam os 308 concelhos com a NUTS II no
   * prefixo do código. Não é o dado publicado — é a tabela de conversão.
   */
  indicadorGeografias: string;
  /** Muda quando a contagem passa a significar outra coisa. */
  transformVersion: string;
  metricas: readonly string[];
}

/**
 * O último ano civil COMPLETO.
 *
 * A escolha não é conservadorismo: o portal publica um ficheiro por ano e
 * o do ano em curso é, por definição, uma contagem parcial que cresce
 * todas as semanas. Publicá-la ao lado de séries anuais convidaria a lê-la
 * como se fosse um ano — e o número seria verdadeiro, o que torna a
 * leitura errada mais difícil de detetar.
 *
 * A consequência prática é que em janeiro isto roda sozinho: o job passa a
 * pedir o ficheiro do ano que acabou de fechar, sem ninguém editar código.
 */
export function ultimoAnoCompleto(referencia: Date = new Date()): number {
  return referencia.getUTCFullYear() - 1;
}

/**
 * As fontes a ingerir nesta execução.
 *
 * É uma função e não uma constante porque o ano faz parte da declaração:
 * o ficheiro a descarregar chama-se `contratos2025.zip` e esse nome muda
 * com o calendário. Uma constante teria de ser editada à mão todos os
 * janeiros — e o sintoma de esquecer seria a ferramenta continuar a
 * mostrar números de há dois anos, com ar de atuais.
 */
export function fontesEmBloco(referencia: Date = new Date()): readonly FonteEmBloco[] {
  const ano = ultimoAnoCompleto(referencia);

  return Object.freeze([
    Object.freeze({
      id: "contratos-publicos",
      rotulo: `Contratos públicos celebrados em ${ano}`,
      // O IMPIC publica aqui, num só conjunto de dados, um ZIP por ano
      // desde 2012. O slug inclui o intervalo e não muda quando um ano
      // novo é acrescentado.
      dataset: "contratos-publicos-portal-base-impic-contratos-de-2012-a-2026",
      recurso: { ficheiro: `contratos${ano}.zip`, formato: "zip" },
      ano,
      // `0012909` é o índice de envelhecimento, publicado ao concelho.
      // O que interessa dele não são os valores — é a lista das 308
      // unidades com o código hierárquico, que é onde vive a NUTS II.
      indicadorGeografias: "0012909",
      transformVersion: "base-contratos-por-nuts2@1",
      metricas: Object.freeze([
        METRICAS_EM_BLOCO.contratosDeServicos,
        METRICAS_EM_BLOCO.procedimentosAbertos,
      ]),
    }),
  ] as const);
}

/** Conveniência para quem só quer a lista de hoje. */
export const FONTES_EM_BLOCO: readonly FonteEmBloco[] = fontesEmBloco();
