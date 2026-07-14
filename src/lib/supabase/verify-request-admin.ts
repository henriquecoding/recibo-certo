// Verificação server-side de que um pedido HTTP vem de um admin autenticado.
//
// Usa o access token do Supabase enviado no cabeçalho Authorization: valida-o
// (auth.getUser) e confirma o role='admin' na tabela profiles sob a RLS do
// próprio utilizador. Não depende de cookies nem da service-role key.

import { createClient } from "@supabase/supabase-js";

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
