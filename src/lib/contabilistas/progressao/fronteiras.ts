/**
 * As fronteiras comerciais da Progressão, ditas em texto.
 *
 * Vive à parte de `catalogo.ts` — esse são os valores oficiais e há teste
 * que o compara com o SQL. Aqui está o que a INTERFACE é obrigada a dizer,
 * e há teste que o exige nos dois lados.
 *
 * A razão de existir: a partir do momento em que há um botão de pagar, o
 * `MONETIZACAO_PROIBIDA` do `routing.ts` — «ordenar parceiros pelo valor
 * pago» — só continua verdade se o patamar não for um sinal que o
 * diretório ou o routing consigam ler. Um dia alguém vai querer
 * «destacar os melhores contabilistas» e a coluna do patamar vai parecer a
 * resposta óbvia. É esse dia que estas linhas esperam.
 */

/**
 * Sobre o que a taxa incide.
 *
 * Decisão de produto: as DUAS bases. Uma só delas deixava metade do
 * negócio intermediado fora da conta.
 */
export const COPY_BASE_DA_COMISSAO =
  "A taxa incide sobre o valor das propostas aceites e das consultas realizadas através do Recibo Certo.";

/**
 * Quem cobra, e a quem.
 *
 * O Recibo Certo FATURA a taxa ao contabilista. Não retém nada do que o
 * cliente paga, porque não é intermediário financeiro entre os dois (§10
 * de `docs/PLATAFORMA-CONTABILISTAS.md`). A diferença não é de
 * contabilidade, é de licença: retirar uma percentagem do dinheiro de um
 * cliente antes de o entregar a outro é outra atividade.
 */
export const COPY_QUEM_FATURA =
  "A taxa é faturada a ti pelo Recibo Certo. O cliente paga-te diretamente — a plataforma não retém nem processa esse pagamento.";

/**
 * «Elegível» é uma palavra que exclui, e quem a lê tem direito a saber o
 * que exclui: trabalho combinado fora da plataforma não conta, porque a
 * plataforma não o viu acontecer. Dizê-lo é o que impede a pessoa de
 * pensar que o contador está avariado.
 */
export const COPY_ELEGIBILIDADE =
  "Apenas clientes e serviços elegíveis contam para XP: os que chegaram pelo Recibo Certo e foram concluídos por aqui.";

/**
 * O que o desbloqueio pago compra — a percentagem — e o que NUNCA compra.
 *
 * Está escrito porque um pagamento cujo efeito não está explícito é um
 * pagamento mal informado.
 */
export const DESBLOQUEIO_NAO_COMPRA: readonly string[] = [
  "Posição no diretório ou no resultado de uma pesquisa.",
  "Prioridade no encaminhamento de casos.",
  "Selo, distintivo ou verificação no perfil público.",
  "Acesso a dados de clientes que o patamar anterior não dava.",
];

/**
 * O estado da cobrança nesta etapa.
 *
 * O desbloqueio está desenhado e o preço é real, mas o Checkout ainda não
 * está ligado. Um botão que aceita o clique e não cobra nada seria pior do
 * que um botão que explica: a pessoa ficava à espera de uma fatura que não
 * vinha, e a acreditar que já tinha o patamar.
 */
export const COPY_DESBLOQUEIO_INDISPONIVEL =
  "O desbloqueio pago ainda não está disponível. Assim que a cobrança abrir, avisamos-te — até lá, os patamares sobem por XP e clientes elegíveis.";

export const DESBLOQUEIO_PAGO_ATIVO = false;
