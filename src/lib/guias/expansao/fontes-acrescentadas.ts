// ═══════════════════════════════════════════════════════════════════════
//  FONTES QUE A REDAÇÃO ACRESCENTOU AO QUE O PACOTE TRAZIA
//  ---------------------------------------------------------------------
//  O pacote levantou a base legal antes de o corpo estar escrito. Escrever
//  o corpo faz aparecer lacunas que só se veem com a frase à frente: uma
//  taxa que o artigo citado não contém, um prazo que vive noutro artigo,
//  uma obrigação que remete para lado nenhum.
//
//  Quando isso acontece o caminho é acrescentar a fonte — não é escrever a
//  afirmação sem ela, nem calar a afirmação. Cada entrada aqui foi
//  verificada por HTTP na data indicada no catálogo legal.
//
//  Ficam separadas das do pacote de propósito: `catalogo.ts` continua a ser
//  o pacote tal e qual, e vê-se de relance o que foi preciso juntar-lhe.
// ═══════════════════════════════════════════════════════════════════════

/** Chaves de `LEGAL_SOURCES` a juntar ao bloco de fontes de cada guia. */
export const FONTES_ACRESCENTADAS: Record<string, string[]> = {
  // As taxas do imposto do selo não estão em nenhum artigo do CIS: o
  // articulado remete para a Tabela Geral, e a Tabela Geral só existe no
  // PDF do código consolidado. Sem ela, os 0,8% da escritura e os 0,60% do
  // crédito de longo prazo ficavam sem fonte.
  "imposto-selo-compra-casa": ["tgis"],
  // O guia explica que documento se emite e em que prazo. Isso é o art.
  // 115.º, n.º 5 — que o pacote não incluía porque não conseguiu abrir a
  // página. Abre: verificada a 06/08/2026.
  "recibo-renda-modelo-44": ["cirs115"],
  // Do outro lado da Tabela Geral: a verba 1.2 fixa a taxa das transmissões
  // gratuitas, e a isenção da al. e) do art. 6.º só faz sentido ao lado
  // dela. E quem herda não paga (quase sempre) — quem vende o que herdou,
  // paga, e o valor de aquisição a título gratuito é o do art. 45.º.
  "herdar-imovel": ["tgis", "cirs45"],
  // A decisão empresa-ou-pessoal joga-se na venda, não na compra: o art.
  // 46.º manda deduzir ao valor de aquisição as depreciações que a empresa
  // foi deduzindo, e o art. 47.º só corrige a inflação a partir de dois
  // anos. Nenhum dos dois vinha no pacote.
  "imovel-empresa-ou-pessoal": ["circ46", "circ47"],
};

export const fontesAcrescentadas = (slug: string): string[] => FONTES_ACRESCENTADAS[slug] ?? [];
