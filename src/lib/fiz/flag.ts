// Bandeira pública da integração FIZ, isolada num módulo próprio.
//
// Os componentes-cliente importam DAQUI e nunca de `config.ts`: assim não
// arrastam para o bundle o módulo que lê segredos do servidor. (Variáveis
// sem prefixo NEXT_PUBLIC_ nunca chegariam ao browser, mas manter a
// separação torna a fronteira óbvia em vez de implícita.)

export function fizAtiva(): boolean {
  return process.env.NEXT_PUBLIC_FIZ_ENABLED === "true";
}
