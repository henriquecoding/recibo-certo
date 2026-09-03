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

/**
 * Limpa as janelas expiradas e, se ainda assim o mapa passar do tecto, corta
 * as que faltam menos tempo para expirar.
 *
 * A versão anterior só apagava expiradas. Com `MAX_KEYS` janelas TODAS ativas
 * não apagava nada e o mapa continuava a crescer — o comentário prometia uma
 * «trava de segurança contra crescimento ilimitado» que o código não tinha.
 * Cortar as que expiram primeiro é a escolha certa: perde-se a contagem de
 * quem já estava quase a poder tentar outra vez, não a de quem acabou de ser
 * travado.
 */
function prune(now: number): void {
  for (const [k, v] of store) {
    if (v.reset <= now) store.delete(k);
  }
  if (store.size <= MAX_KEYS) return;
  const porFim = [...store.entries()].sort((a, b) => a[1].reset - b[1].reset);
  for (let i = 0; i < porFim.length && store.size > MAX_KEYS; i++) {
    store.delete(porFim[i][0]);
  }
}

/**
 * IP do cliente, na ordem em que se pode confiar nos cabeçalhos.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ `x-forwarded-for` É ESCRITO PELO CLIENTE ATÉ ALGUÉM O REESCREVER        │
 * │                                                                       │
 * │ Ler o primeiro valor de `x-forwarded-for` é o idioma comum, e na       │
 * │ Vercel funciona porque a plataforma reescreve o cabeçalho. Mas é uma   │
 * │ dependência TÁCITA do alojamento: servido de outro lado — ou           │
 * │ alcançado diretamente, contornando o proxy —, qualquer cliente pode    │
 * │ enviar um `X-Forwarded-For` diferente a cada pedido e ficar sem        │
 * │ limite nenhum. E as rotas que dependem disto são as caras: envio de    │
 * │ email, geração de cupões, prémios do quiz, sessões de checkout.        │
 * │                                                                       │
 * │ `x-vercel-forwarded-for` é preenchido pela infraestrutura e não        │
 * │ sobrevive a ser enviado de fora, por isso vem primeiro. Só depois o    │
 * │ idioma comum. E quando nenhum existe, a chave passa a ser              │
 * │ «desconhecido» — que junta toda a gente no mesmo balde, o que é        │
 * │ restritivo de propósito: preferir travar a mais do que não travar.     │
 * └───────────────────────────────────────────────────────────────────────┘
 */
export function clientIp(req: Request): string {
  const daPlataforma = req.headers.get("x-vercel-forwarded-for");
  if (daPlataforma) return daPlataforma.split(",")[0].trim();

  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();

  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  return "desconhecido";
}
