// Enquadramento legal e operacional da página de investidores.
//
// Tudo o que aqui está é texto que pode ter consequências jurídicas. Por isso
// vive num só ficheiro, com o estado de revisão à vista, em vez de espalhado
// por JSX onde ninguém o encontra para rever.

/**
 * Endereço operacional para investidores.
 *
 * ⚠️ O relatório recomenda `investidores@recibocerto.pt` (INV-019) em vez do
 * Gmail. NÃO foi escrito aqui: esse endereço depende de DNS, SPF, DKIM e DMARC
 * que não estão configurados, e publicar uma morada que não recebe é pior do
 * que publicar um Gmail — os contactos desapareciam em silêncio, que é
 * exatamente o problema que o relatório quer resolver.
 *
 * Esse dia chegou a 31/08/2026: o domínio passou a receber correio (MX da
 * Resend, reencaminhado em `/api/email/receber`), e o endereço deixou de ser
 * um Gmail. `INVESTIDORES_EMAIL` continua a poder sobrepor-se.
 */
export const EMAIL_INVESTIDORES =
  process.env.INVESTIDORES_EMAIL || "investidores@recibocerto.pt";

/** Prazo assumido publicamente para a primeira resposta humana. */
export const SLA_RESPOSTA = "até ao próximo dia útil";

/** Conservação dos contactos sem relação ativa. */
export const RETENCAO_MESES = 12;

/**
 * Aviso de comunicação de investimento.
 *
 * ⚠️ ESTADO: por rever juridicamente. O relatório (INV-P0-08) é explícito em
 * duas coisas — que uma página pública que fala de ronda deve ter um aviso, e
 * que uma IA não deve publicar este texto como definitivo sem validação
 * jurídica portuguesa. Fica publicado porque a sua ausência é o risco maior:
 * o texto DELIMITA o que a página é (informação) e o que não é (uma oferta).
 *
 * Não afirma nada sobre a empresa; apenas enquadra. Rever com advogado antes
 * de retirar o `noindex` e de qualquer divulgação ativa.
 */
export const AVISO_INVESTIMENTO =
  "Esta página tem caráter exclusivamente informativo e não constitui uma oferta ao público, " +
  "recomendação de investimento ou compromisso de aceitação de capital. Qualquer operação estará " +
  "sujeita a avaliação, documentação definitiva e enquadramento legal aplicável. Investir numa " +
  "empresa em fase inicial envolve risco, incluindo a perda total do capital.";

/** Nota de privacidade mostrada JUNTO ao formulário (artigo 13.º do RGPD). */
export const NOTA_PRIVACIDADE = {
  versao: "investor-privacy-v1",
  finalidade:
    "Avaliar o seu interesse, responder ao contacto e, se ambos quisermos avançar, conduzir a conversa de investimento.",
  baseLegal:
    "Diligências pré-contratuais a seu pedido e interesse legítimo em responder a quem nos contacta.",
  destinatarios:
    "Supabase (base de dados, UE) e Resend (envio de email) tratam os dados por nossa conta. Não vendemos nem cedemos os seus dados para fins de terceiros.",
  conservacao: `${RETENCAO_MESES} meses a contar do último contacto, salvo relação ativa.`,
  direitos:
    "Pode pedir acesso, retificação, apagamento, limitação, portabilidade ou oposição, e reclamar à CNPD.",
} as const;

/**
 * Frase curta que acompanha o botão. Substitui "Nunca partilhamos informação
 * com terceiros", que era falso: pelo menos a base de dados e o serviço de
 * email tratam os dados em nome do Recibo Certo. O que é verdade — e o que
 * importa a quem escreve — é que não os vendemos.
 */
export const RESUMO_PRIVACIDADE =
  "Usamos estes dados para responder ao seu contacto. Não os vendemos.";
