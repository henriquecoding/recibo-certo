// Cliente Supabase para o browser (componentes "use client").
// Lê as chaves das variáveis NEXT_PUBLIC_* (definidas em .env.local e na Vercel).
// A chave é a "publishable" — segura no cliente DESDE QUE a RLS esteja ativa.
//
// NOTA: o ReciboCerto ainda usa localStorage como fonte de dados. Este cliente
// é a fundação para a migração do repositório (`src/lib/store/recibos.ts`) e
// para a autenticação (conta na nuvem do plano Pro). Ainda não é usado nas páginas.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Reexportado de `./config` (sem SDK) para retrocompatibilidade dos call sites.
export { supabaseConfigurado } from "./config";

let cliente: SupabaseClient | null = null;

/**
 * Normaliza a URL do projeto: o cliente espera a RAIZ (https://xxx.supabase.co).
 * Tolera o erro comum de colar a URL da API REST (…/rest/v1/) ou de Auth, e
 * remove barras finais — senão o cliente gera caminhos como /rest/v1/auth/v1/…
 * que o gateway rejeita ("Invalid path specified in request URL", PGRST125).
 */
function normalizarUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/, "")
    .replace(/\/auth\/v1$/, "")
    .replace(/\/+$/, "");
}

/** Devolve o cliente Supabase (singleton). Lança se as variáveis faltarem. */
export function getSupabase(): SupabaseClient {
  if (cliente) return cliente;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chave) {
    throw new Error(
      "Supabase não configurado: define NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  cliente = createClient(normalizarUrl(url), chave.trim());
  return cliente;
}
