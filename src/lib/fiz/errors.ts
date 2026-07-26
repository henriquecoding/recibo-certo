// ═══════════════════════════════════════════════════════════════════════
//  ERROS E CIRCUITO DE PROTEÇÃO DA INTEGRAÇÃO FIZ
//  ---------------------------------------------------------------------
//  Regra do ponto 6.3 da arquitetura: uma falha da FIZ NUNCA pode inutilizar
//  um Guia, uma simulação ou o dashboard. Todos os erros aqui são
//  recuperáveis pela interface, que mostra um estado neutro.
// ═══════════════════════════════════════════════════════════════════════

export type CodigoErroFiz =
  | "desligada" // integração desativada por bandeira
  | "sem_credenciais" // falta configuração no servidor
  | "nao_autorizado" // 401/403 — token inválido ou scope em falta
  | "nao_encontrado" // 404
  | "conflito" // 409 — idempotência ou estado
  | "invalido" // 400/422 — pedido ou consentimento inválido
  | "limite_excedido" // 429
  | "indisponivel" // 5xx, timeout, rede
  | "circuito_aberto" // demasiadas falhas seguidas
  | "destino_recusado"; // a FIZ devolveu um destino fora dos domínios permitidos

export class FizError extends Error {
  readonly codigo: CodigoErroFiz;
  readonly status?: number;
  readonly requestId?: string;
  /** Se true, a interface pode continuar em modo degradado sem alarmar. */
  readonly silencioso: boolean;

  constructor(codigo: CodigoErroFiz, mensagem: string, opcoes: { status?: number; requestId?: string; silencioso?: boolean } = {}) {
    super(mensagem);
    this.name = "FizError";
    this.codigo = codigo;
    this.status = opcoes.status;
    this.requestId = opcoes.requestId;
    this.silencioso = opcoes.silencioso ?? (codigo === "desligada" || codigo === "sem_credenciais");
  }
}

export function codigoDeStatus(status: number): CodigoErroFiz {
  if (status === 401 || status === 403) return "nao_autorizado";
  if (status === 404) return "nao_encontrado";
  if (status === 409) return "conflito";
  if (status === 400 || status === 422) return "invalido";
  if (status === 429) return "limite_excedido";
  return "indisponivel";
}

/** Mensagens para o utilizador — pt-PT, sem culpar ninguém e sem jargão.
    Nunca prometem que a ação vai funcionar a seguir. */
export const MENSAGEM_UTILIZADOR: Record<CodigoErroFiz, string> = {
  desligada: "Esta continuação ainda não está disponível.",
  sem_credenciais: "Esta continuação ainda não está disponível.",
  nao_autorizado: "A ligação à FIZ precisa de ser autorizada outra vez.",
  nao_encontrado: "Não encontrámos este recurso na FIZ.",
  conflito: "Esta ação já tinha sido iniciada. Verifica na FIZ antes de repetir.",
  invalido: "Não foi possível preparar esta continuação com os dados atuais.",
  limite_excedido: "Demasiados pedidos seguidos. Tenta daqui a pouco.",
  indisponivel: "A FIZ está temporariamente indisponível. O guia e os simuladores continuam a funcionar.",
  circuito_aberto: "A FIZ está temporariamente indisponível. O guia e os simuladores continuam a funcionar.",
  destino_recusado: "Bloqueámos um destino que não reconhecemos como sendo da FIZ.",
};

// ─── Circuito de proteção ──────────────────────────────────────────────
//  Em memória e por instância: evita martelar uma API em baixa e evita que
//  cada pedido do utilizador espere pelo timeout. Não substitui o
//  alertismo de operação — apenas protege a experiência.

interface EstadoCircuito {
  falhas: number;
  abertoAte: number;
}

const LIMITE_FALHAS = 5;
const PAUSA_MS = 60_000;
const circuitos = new Map<string, EstadoCircuito>();

export function circuitoAberto(chave: string): boolean {
  const c = circuitos.get(chave);
  if (!c) return false;
  if (c.abertoAte > Date.now()) return true;
  if (c.abertoAte !== 0) circuitos.set(chave, { falhas: 0, abertoAte: 0 });
  return false;
}

export function registarFalha(chave: string): void {
  const c = circuitos.get(chave) ?? { falhas: 0, abertoAte: 0 };
  const falhas = c.falhas + 1;
  circuitos.set(chave, {
    falhas,
    abertoAte: falhas >= LIMITE_FALHAS ? Date.now() + PAUSA_MS : 0,
  });
}

export function registarSucesso(chave: string): void {
  circuitos.delete(chave);
}

/** Só para testes — o estado é global ao processo. */
export function reiniciarCircuitos(): void {
  circuitos.clear();
}
