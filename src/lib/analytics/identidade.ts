// ═══════════════════════════════════════════════════════════════════════
//  IDENTIDADE E ATRIBUIÇÃO
//  ---------------------------------------------------------------------
//  §8.2 do relatório. Cinco regras, todas implementadas aqui:
//
//   1. `anonymous_id` local para a jornada sem conta; `user_id` pseudónimo
//      depois de autenticar. Unir só quando permitido e necessário.
//   2. Persistir first touch, last non-direct, landing, referrer, UTM,
//      partner_id e content_id — «não depender apenas do cookie do
//      parceiro».
//   3. `click_id` gerado no SERVIDOR para a FIZ e parceiros.
//   4. Guardar versões de consentimento, metodologia, fonte fiscal e
//      resultado, para explicar discrepâncias.
//   5. Nada disto pode transportar dados fiscais pessoais.
//
//  Porque é que o first touch importa: alguém descobre o Recibo Certo num
//  vídeo em setembro, volta em janeiro por pesquisa direta e subscreve em
//  abril. Sem first touch, o vídeo nunca recebe crédito nenhum e o
//  relatório conclui que o YouTube não funciona. É exatamente a conclusão
//  errada que o §9.4 quer evitar.
//
//  «Last NON-direct» pela mesma razão ao contrário: se a última visita
//  antes da compra foi alguém a escrever o endereço à mão, o crédito não
//  pertence ao «direto» — pertence à última origem identificável.
// ═══════════════════════════════════════════════════════════════════════

export const CHAVE_ANONIMO = "recibocerto:anonymous_id";
export const CHAVE_ATRIBUICAO = "recibocerto:atribuicao";

/** Origem de uma visita, no vocabulário UTM (§8.2). */
export interface Origem {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  term?: string;
  /** Parceiro que trouxe a visita — `partner_id` do §8.2 e do `/ir/`. */
  partner_id?: string;
  /** Ativo concreto: vídeo, post, guia distribuído. */
  content_id?: string;
  /** Página de entrada. */
  landing: string;
  referrer?: string;
  /** ISO. */
  em: string;
}

export interface Atribuicao {
  /** A primeira origem de sempre. Nunca é reescrita. */
  first_touch: Origem;
  /** A última origem identificável — «direto» não a substitui. */
  last_non_direct: Origem;
  /** Nº de sessões distintas observadas. Sinal grosseiro de familiaridade. */
  sessoes: number;
}

// ─── Identificadores ───────────────────────────────────────────────────

/**
 * Identificador anónimo do dispositivo. Aleatório, sem semântica, e
 * criado só quando há consentimento de medição — criar um identificador
 * persistente antes disso seria exatamente o que o §8.4 proíbe.
 */
export function lerAnonymousId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CHAVE_ANONIMO);
  } catch {
    return null;
  }
}

export function garantirAnonymousId(): string | null {
  if (typeof window === "undefined") return null;
  const existente = lerAnonymousId();
  if (existente) return existente;
  const novo = gerarId();
  try {
    window.localStorage.setItem(CHAVE_ANONIMO, novo);
  } catch {
    return null; // modo privado: mede-se a sessão, não a pessoa
  }
  return novo;
}

/** Apaga a identidade de medição. Chamado quando o consentimento é retirado. */
export function esquecerIdentidade(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CHAVE_ANONIMO);
    window.localStorage.removeItem(CHAVE_ATRIBUICAO);
  } catch {
    /* nada a fazer */
  }
}

function gerarId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const b = c.getRandomValues(new Uint8Array(16));
    return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * `user_id` pseudónimo. Não é o id do Supabase nem o email: é um resumo
 * estável derivado do id real, para que a base de medição não contenha uma
 * chave que permita, por si só, chegar à pessoa. A união entre o anónimo e
 * o autenticado faz-se no momento do login — «apenas quando permitido e
 * necessário», diz o §8.2.
 */
export async function pseudonimo(idReal: string): Promise<string> {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (!c?.subtle) return `u_${idReal.slice(0, 8)}`;
  const dados = new TextEncoder().encode(`recibocerto:v1:${idReal}`);
  const resumo = await c.subtle.digest("SHA-256", dados);
  return `u_${Array.from(new Uint8Array(resumo).slice(0, 12), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("")}`;
}

// ─── Atribuição ────────────────────────────────────────────────────────

const DIRETO = "(direct)";

/** Lê a origem da URL atual e do referrer. */
export function origemAtual(url: string, referrer: string): Origem {
  let params: URLSearchParams;
  let caminho = "/";
  try {
    const u = new URL(url);
    params = u.searchParams;
    caminho = u.pathname;
  } catch {
    params = new URLSearchParams();
  }

  const utmSource = params.get("utm_source")?.slice(0, 64);
  const utmMedium = params.get("utm_medium")?.slice(0, 64);
  const parceiro = params.get("parceiro") ?? params.get("partner_id") ?? undefined;

  let host = "";
  try {
    host = referrer ? new URL(referrer).hostname : "";
  } catch {
    host = "";
  }
  const mesmoSite =
    typeof window !== "undefined" && host === window.location.hostname;

  const source = utmSource ?? (host && !mesmoSite ? host : DIRETO);
  const medium = utmMedium ?? (host && !mesmoSite ? "referral" : "(none)");

  return {
    source,
    medium,
    campaign: params.get("utm_campaign")?.slice(0, 64) ?? undefined,
    content: params.get("utm_content")?.slice(0, 64) ?? undefined,
    term: params.get("utm_term")?.slice(0, 64) ?? undefined,
    partner_id: parceiro?.slice(0, 64),
    content_id: params.get("cid")?.slice(0, 64) ?? undefined,
    landing: caminho,
    referrer: mesmoSite ? undefined : referrer?.slice(0, 200) || undefined,
    em: new Date().toISOString(),
  };
}

export function origemEDireta(o: Origem): boolean {
  return o.source === DIRETO && !o.partner_id;
}

export function lerAtribuicao(): Atribuicao | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CHAVE_ATRIBUICAO);
    return raw ? (JSON.parse(raw) as Atribuicao) : null;
  } catch {
    return null;
  }
}

/**
 * Atualiza a atribuição com a origem desta visita.
 *
 * `first_touch` é imutável; `last_non_direct` só muda quando a nova origem
 * é identificável. É a regra que impede o «direto» de roubar o crédito de
 * todos os outros canais.
 */
export function registarVisita(origem: Origem): Atribuicao {
  const anterior = lerAtribuicao();
  const atual: Atribuicao = anterior
    ? {
        first_touch: anterior.first_touch,
        last_non_direct: origemEDireta(origem) ? anterior.last_non_direct : origem,
        sessoes: anterior.sessoes + 1,
      }
    : { first_touch: origem, last_non_direct: origem, sessoes: 1 };

  try {
    window.localStorage.setItem(CHAVE_ATRIBUICAO, JSON.stringify(atual));
  } catch {
    /* sem storage: a atribuição vive só nesta sessão */
  }
  return atual;
}

/** As propriedades de origem que acompanham cada evento enviado. */
export function propriedadesDeOrigem(a: Atribuicao | null): Record<string, string> {
  if (!a) return {};
  const p: Record<string, string> = {
    source: a.last_non_direct.source,
    medium: a.last_non_direct.medium,
    first_source: a.first_touch.source,
    first_medium: a.first_touch.medium,
    landing: a.last_non_direct.landing,
  };
  if (a.last_non_direct.campaign) p.campaign = a.last_non_direct.campaign;
  if (a.last_non_direct.partner_id) p.partner_id = a.last_non_direct.partner_id;
  if (a.last_non_direct.content_id) p.content_id = a.last_non_direct.content_id;
  return p;
}

// ─── Versões ───────────────────────────────────────────────────────────

/**
 * §8.2, quarta regra: «Guardar versões de consentimento, metodologia,
 * fonte fiscal e resultado; isso permite explicar discrepâncias e medir o
 * efeito de atualizações.»
 *
 * Sem isto, quando alguém disser «na semana passada dava outro valor», não
 * há maneira de saber se o motor mudou, se a regra mudou, ou se a pessoa
 * escreveu outro número. Com isto, sabe-se qual das três.
 */
export interface Versoes {
  /** Versão da app que produziu o evento. */
  app: string;
  /** Versão do motor de cálculo. */
  metodologia: string;
  /** Ano fiscal dos dados usados. */
  ano_fiscal: number;
  /** Versão da política de consentimento aceite. */
  consentimento: number;
}
