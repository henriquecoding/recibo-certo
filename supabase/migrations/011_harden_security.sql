-- 011_harden_security.sql
-- Endurecimento de segurança da base de dados, na sequência do Supabase
-- database linter (advisors). Idempotente — seguro correr múltiplas vezes.
--
-- Aplicado em produção via MCP (migration `harden_security_functions`).

-- ── search_path fixo (advisor 0011: function_search_path_mutable) ───────────
-- Todas as referências internas destas funções já são schema-qualified
-- (public.profiles, public.quiz_profiles, auth.uid()), pelo que fixar o
-- search_path a vazio não altera o comportamento — apenas impede o sequestro
-- do search_path por objetos maliciosos.
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.set_atualizado_em() SET search_path = '';
ALTER FUNCTION public.is_admin() SET search_path = '';
ALTER FUNCTION public.criar_quiz_profile() SET search_path = '';

-- ── Revogar EXECUTE das funções de gatilho (advisors 0028/0029) ─────────────
-- handle_new_user e criar_quiz_profile são funções de TRIGGER SECURITY DEFINER.
-- O gatilho continua a disparar sob o dono da tabela; revogar o EXECUTE apenas
-- impede a chamada direta via /rest/v1/rpc/. is_admin() MANTÉM o EXECUTE porque
-- é invocada dentro das políticas RLS (admin) e precisa de ser executável.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.criar_quiz_profile() FROM anon, authenticated, public;
