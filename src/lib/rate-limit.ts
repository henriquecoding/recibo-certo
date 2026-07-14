// Rate limiting simples em memória (janela fixa por chave).
//
// LIMITAÇÃO: em serverless (Vercel) o estado é por-instância e reinicia em cold
// start, pelo que não é um limite global rigoroso. Ainda assim, corta rajadas e
// abuso trivial sem depender de infraestrutura externa. Para um limite durável
// e distribuído, trocar por Upstash/Redis mantendo esta mesma assinatura.

interface Janela {
  count: number;
  reset: number; // epoch ms em que a contagem reinicia
}

const store = new Map<string, Janela>();
const MAX_KEYS = 10_000; // trava de segurança contra crescimento ilimitado

export interface RateLimitResult {
  ok: boolean;
  /** Segundos até poder tentar de novo (0 quando ok). */
  retryAfter: number;
  /** Pedidos restantes na janela atual. */
  remaining: number;
}

/**
 * Regista um acesso a `key` e diz se está dentro do limite.
 * @param key    identificador (ex.: `email:waitlist:<ip>`)
 * @param limit  máximo de pedidos por janela
 * @param windowMs duração da janela em ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const janela = store.get(key);

  if (!janela || janela.reset <= now) {
    if (store.size > MAX_KEYS) prune(now);
    store.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0, remaining: limit - 1 };
  }

  if (janela.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((janela.reset - now) / 1000), remaining: 0 };
  }

  janela.count += 1;
  return { ok: true, retryAfter: 0, remaining: limit - janela.count };
}

function prune(now: number): void {
  for (const [k, v] of store) {
    if (v.reset <= now) store.delete(k);
  }
}

/** IP do cliente a partir dos cabeçalhos do proxy (Vercel usa x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "desconhecido";
}
