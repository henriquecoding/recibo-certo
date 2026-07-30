// ═══════════════════════════════════════════════════════════════════════
//  QUEM TEM PLUS, E ATÉ QUANDO
//  ---------------------------------------------------------------------
//  `subscriptions` tem agora duas espécies de linha:
//
//   · subscrição de PROVEDOR (Stripe, Lemon Squeezy) — `concessao_termina_em`
//     é NULL, e é o webhook do provedor que muda `status` quando acaba;
//   · CONCESSÃO nossa (cupão do Quiz) — não há webhook nenhum, e é
//     `concessao_termina_em` que a faz acabar.
//
//  Para o cliente, a policy da migração 027 já esconde a concessão expirada.
//  Quem lê com `service_role` IGNORA a RLS, e portanto tem de aplicar a
//  mesma regra à mão. Este módulo existe para essa regra viver num sítio só:
//  quatro consultas espalhadas a repetir a condição é uma condição que a
//  quinta consulta esquece.
// ═══════════════════════════════════════════════════════════════════════

/** Estados que valem Plus. `past_due` inclui-se: o pagamento falhou mas o
    acesso mantém-se durante o período de graça do provedor. */
export const ESTADOS_COM_PLUS = ["active", "trialing", "past_due"] as const;

/**
 * Filtro `.or()` do Supabase que exclui concessões expiradas.
 *
 * Usar SEMPRE em leituras com `service_role`:
 *
 *   sb.from("subscriptions")
 *     .select("user_id")
 *     .in("status", ESTADOS_COM_PLUS)
 *     .or(plusAtivoFiltro())
 *
 * Uma subscrição de provedor tem `concessao_termina_em` NULL e passa pelo
 * primeiro ramo; uma concessão de cupão só passa enquanto for válida.
 */
export function plusAtivoFiltro(agora: Date = new Date()): string {
  return `concessao_termina_em.is.null,concessao_termina_em.gt.${agora.toISOString()}`;
}

/**
 * A mesma decisão, para uma linha já lida.
 *
 * Serve para verificar em memória o que veio de uma consulta que não pôde
 * filtrar (ou de um teste).
 */
export function concessaoValida(
  linha: { status?: string | null; concessao_termina_em?: string | null },
  agora: Date = new Date(),
): boolean {
  const estadoOk = (ESTADOS_COM_PLUS as readonly string[]).includes(linha.status ?? "");
  if (!estadoOk) return false;
  if (!linha.concessao_termina_em) return true;
  return new Date(linha.concessao_termina_em) > agora;
}

/** Fim de uma concessão de N meses a contar de agora. */
export function fimDaConcessao(meses: number, inicio: Date = new Date()): Date {
  const fim = new Date(inicio);
  // `setMonth` trata os meses como meses de calendário — 1 de janeiro + 1 mês
  // é 1 de fevereiro, não 31 dias depois. Antes usava-se `30 dias por mês`,
  // o que dava ao utilizador menos 5 dias por trimestre do que o prometido.
  fim.setMonth(fim.getMonth() + meses);
  return fim;
}
