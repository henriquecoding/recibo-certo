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
 * ── O QUE MUDOU, e o que continua igual
 *
 * A versão anterior dizia: «A taxa é faturada a ti pelo Recibo Certo. O
 * cliente paga-te diretamente — a plataforma não retém nem processa esse
 * pagamento.» O raciocínio por trás continua a valer inteiro: *retirar uma
 * percentagem do dinheiro de um cliente antes de o entregar a outro é
 * outra atividade.*
 *
 * O cliente passou a poder pagar pelo Recibo Certo. A forma escolhida foi
 * a única que não atravessa aquela linha: **cobranças diretas** (Stripe
 * Connect direct charges).
 *
 *   · a cobrança nasce na conta Stripe DO CONTABILISTA;
 *   · ele é o comerciante de registo — é o nome dele no extrato do cliente;
 *   · o dinheiro NUNCA entra no saldo do Recibo Certo, vai direto para o
 *     saldo dele;
 *   · a comissão sai como `application_fee`, que a Stripe encaminha.
 *
 * Ou seja: continua a ser verdade que o cliente paga ao contabilista e que
 * a plataforma não retém o dinheiro de ninguém. O que deixou de ser
 * verdade — e por isso mudou aqui — é que a plataforma não *processa* o
 * pagamento. Processa: é ela que abre o checkout. Dizer o contrário passou
 * a ser falso, e uma frase falsa sobre dinheiro é pior do que uma frase
 * incómoda.
 */
export const COPY_QUEM_FATURA =
  "O cliente paga-te diretamente: a cobrança nasce na tua conta Stripe e é o teu nome que aparece no extrato dele. A comissão é retida nesse momento — o dinheiro nunca passa pela conta do Recibo Certo.";

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
 * Ficou ligado. O texto mantém-se porque a bandeira do lado do servidor
 * (`accountant_tier_purchase`) continua a poder ser desligada sem tocar em
 * código — e quando o for, é isto que a pessoa lê em vez de um botão que
 * aceita o clique e não cobra nada.
 */
export const COPY_DESBLOQUEIO_INDISPONIVEL =
  "O desbloqueio pago está temporariamente indisponível. Os patamares continuam a subir por XP e clientes elegíveis.";

/**
 * ⚠️ Isto é só o que a INTERFACE mostra. Quem decide mesmo é a bandeira
 * `accountant_tier_purchase` na base de dados: `criar_intencao_desbloqueio`
 * recusa com `compra_indisponivel` se ela estiver desligada, aconteça o
 * que acontecer aqui. Uma constante de front-end nunca pode ser a única
 * guarda de uma cobrança.
 */
export const DESBLOQUEIO_PAGO_ATIVO = true;
