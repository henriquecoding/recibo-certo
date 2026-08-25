// ═══════════════════════════════════════════════════════════════════════
//  QUEM TEM PLUS, E ATÉ QUANDO
//  ---------------------------------------------------------------------
//  Este módulo mantém compatibilidade com os consumidores antigos. A
//  decisão canónica para novas leituras vive em billing/access e na função
//  SQL private.user_has_plus().
// ═══════════════════════════════════════════════════════════════════════

/** Estados que podem valer Plus. `past_due` só concede acesso dentro da
    janela de graça explícita; nunca indefinidamente. */
export const ESTADOS_COM_PLUS = ["active", "trialing", "past_due"] as const;

/**
 * Filtro legado para a validade temporal de concessões. Não decide sozinho
 * a janela de graça de `past_due`; consumidores novos devem usar a decisão
 * canónica do servidor.
 */
export function plusAtivoFiltro(agora: Date = new Date()): string {
  return `concessao_termina_em.is.null,concessao_termina_em.gt.${agora.toISOString()}`;
}

/** A mesma decisão para uma linha já lida, incluindo a graça de cobrança. */
export function concessaoValida(
  linha: {
    status?: string | null;
    concessao_termina_em?: string | null;
    periodo_graca_termina_em?: string | null;
  },
  agora: Date = new Date(),
): boolean {
  const estado = linha.status ?? "";
  if (!(ESTADOS_COM_PLUS as readonly string[]).includes(estado)) return false;
  if (linha.concessao_termina_em && new Date(linha.concessao_termina_em) <= agora) return false;
  if (estado === "past_due") {
    return Boolean(linha.periodo_graca_termina_em && new Date(linha.periodo_graca_termina_em) > agora);
  }
  return true;
}

/** Fim de uma concessão de N meses a contar de agora. */
export function fimDaConcessao(meses: number, inicio: Date = new Date()): Date {
  const fim = new Date(inicio);
  // A concessão é um prazo de calendário, não um prazo no fuso da
  // máquina que estiver a processá-la. `setMonth` local atravessava a
  // mudança para a hora de verão e transformava 1 de abril UTC em 31 de
  // março. Fixar o dia em 1 antes de mudar de mês também evita que 31 de
  // janeiro salte para março; no destino, limita-se ao último dia real.
  const dia = fim.getUTCDate();
  fim.setUTCDate(1);
  fim.setUTCMonth(fim.getUTCMonth() + meses);
  const ultimoDia = new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth() + 1, 0)).getUTCDate();
  fim.setUTCDate(Math.min(dia, ultimoDia));
  return fim;
}
