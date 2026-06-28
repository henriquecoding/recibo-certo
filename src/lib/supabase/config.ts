// Verificação leve da configuração do Supabase.
//
// Propositadamente NÃO importa `@supabase/supabase-js` — só lê variáveis de
// ambiente. Os providers da raiz (`AuthProvider`, `SubscricaoProvider`) usam
// esta função para decidir se há nuvem, sem arrastar o SDK (~200 KB) para o
// bundle inicial de TODAS as páginas. O cliente em si carrega-se sob procura
// via `import("./client")` quando é mesmo preciso (login, sincronização).

export function supabaseConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
