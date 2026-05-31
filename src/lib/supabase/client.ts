// Cliente Supabase para o browser (componentes "use client").
// Lê as chaves das variáveis NEXT_PUBLIC_* (definidas em .env.local e na Vercel).
// A chave é a "publishable" — segura no cliente DESDE QUE a RLS esteja ativa.
//
// NOTA: o ReciboCerto ainda usa localStorage como fonte de dados. Este cliente
// é a fundação para a migração do repositório (`src/lib/store/recibos.ts`) e
// para a autenticação (conta na nuvem do plano Pro). Ainda não é usado nas páginas.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

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

  cliente = createClient(url, chave);
  return cliente;
}

/** True se as variáveis de ambiente do Supabase estão presentes. */
export function supabaseConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
