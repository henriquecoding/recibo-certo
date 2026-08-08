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
  // O único guia em que o pacote diz explicitamente o que falta: «o regime
  // dos organismos de investimento coletivo tem especificidades (DL 7/2015)
  // — confirmar antes de afirmar o tratamento de fundos nacionais». São
  // estes dois artigos, e nenhum deles constava da base legal do guia: o
  // art. 22.º do EBF (o que o fundo não paga) e o art. 22.º-A (o que o
  // participante paga, na distribuição e no resgate).
  "etf-irs": ["ebf22", "ebf22a"],
  // A exoneração do passivo restante discute-se contra esta norma, e a
  // base legal do pacote não a incluía: o art. 30.º da LGT declara o
  // crédito tributário indisponível e — no n.º 3, aditado em 2010 — manda
  // essa regra prevalecer sobre qualquer legislação especial. Sem ela, o
  // guia não conseguia mostrar de onde vem a divergência que descreve.
  "insolvencia-pessoal": ["lgt30"],
  // O pacote mandava ler «o CIRS e o EBF em vigor» sem dizer que artigos.
  // São dois, e vivem longe um do outro: o 56.º-A (exclusão de rendimentos,
  // com frações diferentes para trabalho e pensões) e o 87.º (definição de
  // pessoa com deficiência, deduções à coleta, despesa de acompanhamento e
  // a escada de descida do n.º 9). Sem os dois, metade do guia ficava sem
  // fonte — e a outra metade atribuída ao artigo errado.
  "deficiencia-irs": ["art56aCirs", "cirs87"],
  // O pacote dava a base legal deste guia como sendo o art. 12.º do CIRS e
  // duas circulares. O artigo que decide tudo é o 2.º, n.º 3: als. b) 2)
  // (subsídio de refeição e a majoração dos vales), c) (abono para falhas) e
  // d) (ajudas de custo, quilómetros e a condição dos pressupostos).
  "ajudas-de-custo-km": ["art2cirsSelo"],
  // O pacote deixou este guia sem base legal nenhuma. A lei-quadro das
  // ordens profissionais tem o artigo que responde à pergunta do título —
  // e responde-a ao contrário do que se assume.
  "rc-profissional": ["lei2013APP"],
};

export const fontesAcrescentadas = (slug: string): string[] => FONTES_ACRESCENTADAS[slug] ?? [];
