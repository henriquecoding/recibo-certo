// ─────────────────────────────────────────────────────────────────────────
//  Resultado de persistência — o vocabulário comum dos repositórios.
//
//  Antes, gravar devolvia um objeto e os erros iam para a consola: a interface
//  dizia "Guardado" e o registo desaparecia no recarregamento seguinte
//  (RC-P0-03). Aqui uma escrita ou confirma ou explica porque falhou, e quem
//  chama tem de olhar para a resposta antes de anunciar sucesso.
// ─────────────────────────────────────────────────────────────────────────

export type TipoErroPersistencia =
  /** localStorage inacessível (modo privado, política do browser). */
  | "armazenamento-indisponivel"
  /** Espaço esgotado. */
  | "quota"
  /** Sem rede ou servidor inacessível — recuperável, vai para a fila. */
  | "rede"
  /** RLS, sessão expirada ou permissão negada. */
  | "permissao"
  /** Dados recusados pela validação de domínio. */
  | "invalido"
  /** Limite do plano atingido. */
  | "limite"
  | "desconhecido";

export interface ErroPersistencia {
  tipo: TipoErroPersistencia;
  /** Mensagem em pt-PT, mostrável ao utilizador. */
  mensagem: string;
  /** Erro original, para diagnóstico. Nunca mostrado. */
  causa?: unknown;
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: ErroPersistencia };

export const ok = <T,>(valor: T): Resultado<T> => ({ ok: true, valor });
export const falha = <T,>(erro: ErroPersistencia): Resultado<T> => ({ ok: false, erro });

/** Erros de rede são recuperáveis: a operação fica em fila e é repetida. */
export const recuperavel = (e: ErroPersistencia): boolean => e.tipo === "rede";

/** Um `DOMException` de quota (o nome varia entre browsers). */
function ehQuota(e: unknown): boolean {
  if (typeof DOMException !== "undefined" && e instanceof DOMException) {
    return e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22;
  }
  return false;
}

/** Traduz uma falha de `localStorage` para o vocabulário comum. */
export function erroLocal(e: unknown): ErroPersistencia {
  if (ehQuota(e)) {
    return {
      tipo: "quota",
      mensagem: "O armazenamento deste dispositivo está cheio. Liberta espaço ou exporta os dados antes de continuar.",
      causa: e,
    };
  }
  return {
    tipo: "armazenamento-indisponivel",
    mensagem: "Não foi possível gravar neste dispositivo. Se estás numa janela privada, os dados não podem ser guardados.",
    causa: e,
  };
}

/** Traduz um erro do Supabase/PostgREST para o vocabulário comum. */
export function erroNuvem(e: unknown): ErroPersistencia {
  const o = (e ?? {}) as { code?: string; message?: string; status?: number };
  const msg = typeof o.message === "string" ? o.message : "";

  // Falha de rede: fetch rejeitado, offline, timeout.
  if (
    (typeof navigator !== "undefined" && navigator.onLine === false) ||
    /failed to fetch|networkerror|timeout|aborted|econnrefused/i.test(msg)
  ) {
    return {
      tipo: "rede",
      mensagem: "Sem ligação. A alteração fica guardada neste dispositivo e sobe assim que houver rede.",
      causa: e,
    };
  }

  // RLS, JWT expirado, permissão.
  if (o.code === "42501" || o.code === "PGRST301" || o.status === 401 || o.status === 403 || /jwt|permission|row-level/i.test(msg)) {
    return {
      tipo: "permissao",
      mensagem: "A tua sessão expirou ou não tens permissão para esta operação. Entra de novo e tenta outra vez.",
      causa: e,
    };
  }

  // Violação de constraint / check.
  if (o.code === "23514" || o.code === "23502" || o.code === "22P02") {
    return {
      tipo: "invalido",
      mensagem: "Os dados não foram aceites pelo servidor. Confirma os campos e tenta novamente.",
      causa: e,
    };
  }

  return {
    tipo: "desconhecido",
    mensagem: "Não foi possível guardar na nuvem. Tenta novamente daqui a pouco.",
    causa: e,
  };
}

// ─── localStorage que não engole falhas ─────────────────────────────────

/** Lê uma chave; devolve `null` se não existir ou não for legível. */
export function lerChave(chave: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

/**
 * Grava uma chave. Ao contrário do `writeLocal` anterior, devolve a falha em
 * vez de a ignorar — quem chama decide se pode dizer "Guardado".
 */
export function gravarChave(chave: string, valor: string): Resultado<void> {
  if (typeof window === "undefined") {
    return falha({ tipo: "armazenamento-indisponivel", mensagem: "Sem armazenamento disponível." });
  }
  try {
    window.localStorage.setItem(chave, valor);
    return ok(undefined);
  } catch (e) {
    return falha(erroLocal(e));
  }
}

/** Grava um valor JSON. */
export function gravarJSON(chave: string, valor: unknown): Resultado<void> {
  try {
    return gravarChave(chave, JSON.stringify(valor));
  } catch (e) {
    return falha(erroLocal(e));
  }
}

/** Remove uma chave, sem rebentar se o armazenamento estiver indisponível. */
export function removerChave(chave: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(chave);
  } catch {
    /* nada a fazer — a chave já é inalcançável */
  }
}

// ── Onde é que isto vai ficar? ──────────────────────────────────────
//
// Cada repositório decidia sozinho: `disponivel && !!userId && plano ===
// "plus"`. O defeito não está na regra, está no momento em que é feita a
// pergunta. `plano` começa em "free" e só passa a "plus" quando a
// subscrição responde — e nesse intervalo um assinante do Plus é tratado
// como grátis.
//
// Nada disto dá erro. O recibo é guardado, a interface diz «Guardado», e
// fica no aparelho. Depois a subscrição chega, a aplicação passa a ler da
// nuvem, e o recibo desaparece do ecrã — está em disco, no sítio errado,
// e ninguém sabe que existe.
//
// Por isso o destino tem três valores, e não dois. «Ainda não sei» é uma
// resposta legítima, e é a única honesta enquanto a subscrição não
// responde.

export type Destino = "nuvem" | "local" | "por-decidir";

export interface CondicoesDeDestino {
  /** Há Supabase configurado. */
  disponivel: boolean;
  /** Quem está com sessão, se alguém. */
  userId: string | null;
  /** A autenticação já respondeu. */
  authPronto: boolean;
  plano: string;
  /** A subscrição já respondeu. */
  planoPronto: boolean;
}

export function destinoDosDados(c: CondicoesDeDestino): Destino {
  if (!c.disponivel) return "local";
  // Sem saber quem é, nem que plano tem, não há destino nenhum a
  // escolher — e escolher na mesma é escolher mal metade das vezes.
  if (!c.authPronto) return "por-decidir";
  if (!c.userId) return "local";
  if (!c.planoPronto) return "por-decidir";
  return c.plano === "plus" ? "nuvem" : "local";
}

/** A falha a devolver a quem tenta gravar antes de haver destino. */
export const aindaSemDestino = (): ErroPersistencia => ({
  tipo: "rede",
  mensagem: "Ainda estamos a confirmar a tua conta. Tenta outra vez daqui a um instante.",
});
