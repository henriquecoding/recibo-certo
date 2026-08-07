// ═══════════════════════════════════════════════════════════════════════
//  VALORES DO ANO QUE A REDAÇÃO ACRESCENTOU AO PACOTE
//  ---------------------------------------------------------------------
//  Irmão de `fontes-acrescentadas.ts`, e pela mesma razão: escrever o corpo
//  faz aparecer valores que o pacote não levantou porque ninguém tinha
//  ainda escrito a frase que precisa deles.
//
//  Entram AQUI e não no corpo do guia por causa da regra 5 do pacote — e da
//  regra de ouro deste projeto: percentagens, limiares e datas de calendário
//  vivem na tabela do ano, nunca no texto. Um número escrito no meio de um
//  parágrafo é um número que ninguém encontra quando a lei muda.
//
//  Cada entrada traz a fonte onde foi lida. Sem fonte não entra.
// ═══════════════════════════════════════════════════════════════════════

import type { DadoAnual } from "./conteudo";

/** Um valor acrescentado traz sempre a chave da fonte onde foi verificado. */
export interface DadoAcrescentado extends DadoAnual {
  /** Chave de `LEGAL_SOURCES`. */
  fonte: string;
}

export const DADOS_ACRESCENTADOS: Record<string, DadoAcrescentado[]> = {
  // O pacote trazia só a taxa da verba 1.1. O guia chama-se «Os dois selos
  // da compra de casa» e o segundo selo — o do crédito — não tinha um único
  // valor associado: ficava a promessa do título por cumprir.
  "imposto-selo-compra-casa": [
    { label: "Selo do crédito — prazo inferior a 1 ano", valor: "0,04%", nota: "por cada mês ou fração, sobre o capital · verba 17.1.1", porConfirmar: false, fonte: "tgis" },
    { label: "Selo do crédito — prazo ≥ 1 ano", valor: "0,50%", nota: "sobre o capital · verba 17.1.2", porConfirmar: false, fonte: "tgis" },
    { label: "Selo do crédito — prazo ≥ 5 anos", valor: "0,60%", nota: "sobre o capital · verba 17.1.3 — é a taxa do crédito à habitação típico", porConfirmar: false, fonte: "tgis" },
  ],

  // O art. 72.º tem DUAS taxas para rendimentos prediais, e o pacote só
  // trazia uma. Quem arrenda uma loja e assume os 25% do arrendamento
  // habitacional engana-se em três pontos percentuais.
  "arrendamento-categoria-f": [
    { label: "Taxa autónoma — arrendamento não habitacional", valor: "28%", nota: "rendimentos prediais não previstos no n.º 2 do art. 72.º — loja, escritório, armazém, publicidade", porConfirmar: false, fonte: "cirs72" },
    { label: "Reporte de perdas da categoria F", valor: "6 anos", nota: "caduca se o prédio não gerar rendimentos da categoria F em 36 meses dos 5 anos seguintes · art. 55.º", porConfirmar: false, fonte: "CIRS-55" },
  ],

  // O prazo da declaração alternativa ao recibo eletrónico. Está no n.º 5
  // do art. 115.º, o artigo que o pacote não conseguiu abrir.
  "recibo-renda-modelo-44": [
    { label: "Declaração anual de rendas (alternativa ao recibo)", valor: "até ao fim de fevereiro", nota: "por referência ao ano anterior · art. 115.º, n.º 5, al. b) CIRS, na redação do DL 49/2025", porConfirmar: false, fonte: "cirs115" },
  ],

  // A janela dos encargos de valorização é a informação que decide se vale
  // a pena guardar a fatura de uma obra. Doze anos é muito mais do que o
  // que as pessoas assumem.
  "despesas-senhorio": [
    { label: "Encargos com valorização — janela para a mais-valia", valor: "12 anos", nota: "comprovadamente realizados nos últimos 12 anos · art. 51.º, n.º 1, al. a) CIRS", porConfirmar: false, fonte: "CIRS-51" },
    { label: "Obras de conservação antes do arrendamento", valor: "24 meses", nota: "dedutíveis se o imóvel não tiver tido outro fim entretanto · art. 41.º, n.º 7 CIRS", porConfirmar: false, fonte: "CIRS-41" },
  ],
};

export const dadosAcrescentados = (slug: string): DadoAcrescentado[] =>
  DADOS_ACRESCENTADOS[slug] ?? [];
