// ═══════════════════════════════════════════════════════════════════════
//  OS ENDEREÇOS DA MARCA — RC-CONTACTO-001
//  ---------------------------------------------------------------------
//  Estavam escritos à mão em nove ficheiros, e o valor era o mesmo em
//  todos: `recibocerto.pt@gmail.com`. Um Gmail.
//
//  O problema não era só de imagem. Aquele endereço aparecia na política
//  de privacidade como o canal de exercício de direitos do RGPD, nos
//  termos como o contacto do responsável, e no rodapé de todas as
//  páginas. Um site que trata dados fiscais e dá um Gmail como morada do
//  responsável está a dizer, sem querer, que é um projeto de fim de
//  semana — e a auditoria de marca de 31/08/2026 encontrou-o em nove
//  sítios que ninguém conseguiria mudar de uma vez.
//
//  Agora é aqui. Um sítio, um valor, e mudar o endereço é mudar UMA
//  linha.
//
//  ⚠️ ESTES ENDEREÇOS SÓ FUNCIONAM COM O REGISTO MX PUBLICADO.
//  O domínio `recibocerto.pt` não recebia email nenhum até se acrescentar
//  o MX da Resend no DNS (ver `docs/IDENTIDADE-PASSO-A-PASSO.md`, passo
//  1). Sem ele, isto são endereços bonitos que não chegam a ninguém —
//  que é PIOR do que o Gmail que substituíram. Publicar o MX primeiro.
// ═══════════════════════════════════════════════════════════════════════

/**
 * O endereço público de apoio, privacidade e assuntos legais.
 *
 * É também o `Reply-To` de tudo o que o produto envia, o `support_email`
 * da Stripe e o destino para onde a Stripe encaminha as respostas dos
 * clientes aos recibos.
 */
export const EMAIL_APOIO = "apoio@recibocerto.pt";

/**
 * O remetente do produto.
 *
 * Era `noreply@`. Um remetente que anuncia à cabeça que não lê respostas
 * é uma porta fechada — e, sem MX no domínio, era uma porta fechada que
 * dava para uma parede: as respostas não iam para lado nenhum, nem
 * sequer devolviam erro a quem escrevia.
 */
export const EMAIL_REMETENTE = `Recibo Certo <ola@recibocerto.pt>`;

/** O endereço, sem o nome — para cabeçalhos que não aceitam o formato longo. */
export const EMAIL_REMETENTE_ENDERECO = "ola@recibocerto.pt";

/** `mailto:` para o apoio, com assunto opcional. */
export function mailtoApoio(assunto?: string): string {
  return assunto
    ? `mailto:${EMAIL_APOIO}?subject=${encodeURIComponent(assunto)}`
    : `mailto:${EMAIL_APOIO}`;
}
