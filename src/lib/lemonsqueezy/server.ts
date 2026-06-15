// Cliente servidor do Lemon Squeezy
// Todas as chamadas à API usam a chave secreta (nunca exposta ao cliente).

import crypto from "crypto";

const LS_API_BASE = "https://api.lemonsqueezy.com/v1";

function getApiKey(): string {
  const key = process.env.LS_API_KEY;
  if (!key) throw new Error("LS_API_KEY não definida.");
  return key;
}

async function lsFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${LS_API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${getApiKey()}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const texto = await res.text().catch(() => res.statusText);
    throw new Error(`LS API ${res.status}: ${texto}`);
  }
  return res.json() as Promise<T>;
}

// ── Criar checkout ───────────────────────────────────────────────────────────

interface CriarCheckoutParams {
  storeId:    string;
  variantId:  string;
  email?:     string;
  supabaseUid: string;
  buttonColor?: string;
  successUrl: string;
  cancelUrl:  string;
}

interface LsCheckoutResponse {
  data: {
    attributes: { url: string };
  };
}

export async function criarCheckoutLS(params: CriarCheckoutParams): Promise<string> {
  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_options: {
          dark: false,
          button_color: params.buttonColor ?? "#1D9E75",
          // Não mostrar logo próprio — usar o checkout limpo da LS
          logo: false,
          // Obrigar recolha de billing address (exigido para IVA correto)
          billing_address: true,
        },
        checkout_data: {
          email: params.email ?? undefined,
          custom: {
            supabase_uid: params.supabaseUid,
          },
        },
        // Sem expiração — checkout permanente
        expires_at: null,
        // URLs de redirecionamento
        success_url: params.successUrl,
        cancel_url:  params.cancelUrl,
      },
      relationships: {
        store:   { data: { type: "stores",   id: params.storeId   } },
        variant: { data: { type: "variants", id: params.variantId } },
      },
    },
  };

  const res = await lsFetch<LsCheckoutResponse>("/checkouts", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return res.data.attributes.url;
}

// ── Verificar assinatura do webhook ─────────────────────────────────────────

export function verificarAssinaturaLS(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.LS_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hash, "utf8"),
    Buffer.from(signature, "utf8"),
  );
}

// ── Estrutura dos eventos de webhook ────────────────────────────────────────

export type LsEventNome =
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "subscription_resumed"
  | "subscription_expired"
  | "subscription_paused"
  | "subscription_unpaused"
  | "subscription_payment_failed"
  | "order_created";

export interface LsWebhookPayload {
  meta: {
    event_name: LsEventNome;
    custom_data?: { supabase_uid?: string };
  };
  data: {
    id: string; // ls_sub_xxxxx
    attributes: {
      status:               string;
      variant_id:           number;
      customer_id:          number;
      order_id:             number;
      user_email:           string;
      user_name:            string;
      customer_portal_url?: string;
      // "month" | "year"
      interval_unit?:       string;
      interval_count?:      number;
      cancelled_at?:        string | null;
      trial_ends_at?:       string | null;
      renews_at?:           string | null;
      ends_at?:             string | null;
    };
  };
}

// Mapeamento de status LS → status interno (compatible com tabela existente)
export function mapearStatusLS(lsStatus: string): string {
  const mapa: Record<string, string> = {
    active:      "active",
    on_trial:    "trialing",
    past_due:    "past_due",
    cancelled:   "canceled",
    expired:     "canceled",
    paused:      "paused",
    unpaid:      "unpaid",
  };
  return mapa[lsStatus] ?? "incomplete";
}

export function mapearIntervaloLS(unitInterval?: string): "monthly" | "annual" {
  return unitInterval === "year" ? "annual" : "monthly";
}
