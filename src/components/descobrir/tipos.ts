export interface ExemploDescoberta {
  competencia: string;
  problema: string;
  modelo: string;
  /**
   * O título da hipótese que a demonstração compõe.
   *
   * Estava escrito à mão em quatro sítios — «Organização operacional para
   * microempresas» — e não existia em lado nenhum do grafo de descoberta.
   * Uma demonstração de um motor que jura não inventar nada não pode ela
   * própria inventar a sua conclusão: vem do dossier curado do par
   * (problema × modelo) que a página escolheu.
   */
  titulo: string;
  primeiroTeste: string;
  testeDeFalsificacao: string;
}

