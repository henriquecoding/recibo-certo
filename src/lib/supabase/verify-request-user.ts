import "server-only";
import { createClient } from "@supabase/supabase-js";

export interface UserDoPedido {
  id: string;
  email: string | null;
}

/** Valida o JWT na Auth API; nunca confia apenas no conteúdo local do token. */
export async function userDoPedido(req: Request): Promise<UserDoPedido | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!url || !anon || !token) return null;

  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
