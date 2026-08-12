// Cliente Supabase com service role — SÓ NO SERVIDOR.
//
// `import "server-only"` faz o build FALHAR se algum componente de cliente
// importar este módulo, por engano ou por refactor distraído. É a diferença
// entre uma convenção e uma garantia: a chave de service role dá acesso total
// à base de dados, ignora RLS, e um único import errado punha-a no bundle que
// o browser descarrega.
//
// A chave NUNCA pode ter prefixo `NEXT_PUBLIC_`, aparecer em logs, ser passada
// como prop a um componente ou entrar numa resposta HTTP.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

/**
 * Devolve o cliente admin, ou `null` se as credenciais não estiverem
 * configuradas — devolver `null` em vez de lançar deixa quem chama decidir se
 * a ausência é um erro (uma rota de escrita) ou um caso normal (um ambiente de
 * pré-visualização sem Supabase).
 */
export function supabaseAdmin(): SupabaseClient | null {
  if (cliente) return cliente;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  cliente = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cliente;
}
