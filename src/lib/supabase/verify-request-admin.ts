// Verificação server-side de que um pedido HTTP vem de um admin autenticado.
//
// Usa o access token do Supabase enviado no cabeçalho Authorization: valida-o
// (auth.getUser) e confirma o role='admin' na tabela profiles sob a RLS do
// próprio utilizador. Não depende de cookies nem da service-role key.

import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Quem fez o pedido, quando é mesmo uma conta de administração. */
export interface AdminDoPedido {
  id: string;
  email: string | null;
}

/**
 * Como `pedidoDeAdmin`, mas devolve QUEM é — para que um ato de administração
 * possa ficar registado com nome próprio em `admin_auditoria`. Um booleano diz
 * que alguém tinha autorização; não diz quem foi, e é isso que faz falta
 * quando é preciso responder «quem fez isto?».
 */
export async function adminDoPedido(req: Request): Promise<AdminDoPedido | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;

  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error } = await sb.auth.getUser(token);
  if (error || !userData.user) return null;

  const { data: perfil } = await sb
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (perfil?.role !== "admin") return null;
  return { id: userData.user.id, email: userData.user.email ?? null };
}

export async function pedidoDeAdmin(req: Request): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return false;

  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error } = await sb.auth.getUser(token);
  if (error || !userData.user) return false;

  const { data: perfil } = await sb
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  return perfil?.role === "admin";
}
