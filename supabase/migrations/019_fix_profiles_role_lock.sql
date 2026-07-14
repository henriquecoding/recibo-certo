-- ================================================================
-- ReciboCerto — Migration 019: Fecho da escalada de privilégios (role)
-- Cola no Supabase → SQL Editor e clica RUN.
-- Idempotente: seguro para correr múltiplas vezes.
-- ================================================================
-- Porquê:
--   A migration 004 recriou a política UPDATE de public.profiles com apenas
--   `WITH CHECK (auth.uid() = id)`, removendo o lock da coluna `role` que a 003
--   tinha. Resultado: qualquer utilizador autenticado podia executar
--     supabase.from('profiles').update({ role: 'admin' }).eq('id', <o-seu-uid>)
--   e tornar-se admin, ganhando acesso (via is_admin()) a toda a PII e às
--   tabelas de administração.
--
-- Correção (defesa em profundidade):
--   1. Trigger BEFORE UPDATE que bloqueia qualquer alteração de `role` feita por
--      um utilizador autenticado que NÃO seja admin. É resiliente a futuras
--      migrações que voltem a afrouxar a política RLS (foi assim que o bug entrou).
--   2. handle_new_user() deixa de auto-conceder admin por email (ver 019 §2 / H2).
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 1. TRIGGER — impede alteração de `role` por não-admin (fecha C1)
-- ────────────────────────────────────────────────────────────────
-- Condição para BLOQUEAR: o role muda E há um utilizador autenticado
-- (auth.uid() não nulo) que NÃO é admin.
--   • Utilizador normal a auto-editar-se  → auth.uid() != null, is_admin() false → BLOQUEADO
--   • Admin (painel autenticado)          → is_admin() true                      → permitido
--   • service_role / migrações / superuser → auth.uid() = null                    → permitido
-- SECURITY DEFINER + search_path = '' seguem o endurecimento da migration 011.
CREATE OR REPLACE FUNCTION public.enforce_profile_role_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Alteração de role não permitida (role só pode ser alterado por admin ou service_role).';
  END IF;
  RETURN NEW;
END;
$$;

-- Revogar chamada direta via /rest/v1/rpc/ (função de trigger; segue 011).
REVOKE EXECUTE ON FUNCTION public.enforce_profile_role_lock() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS profiles_role_lock ON public.profiles;
CREATE TRIGGER profiles_role_lock
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role_lock();


-- ────────────────────────────────────────────────────────────────
-- 2. handle_new_user() — remover auto-admin por email (fecha H2)
-- ────────────────────────────────────────────────────────────────
-- Novos registos passam SEMPRE a role 'user'. Os administradores devem ser
-- provisionados manualmente (ver §3). Mantém SECURITY DEFINER + search_path = ''
-- (011) e referências schema-qualified.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Re-aplicar o REVOKE de 011 (idempotente; CREATE OR REPLACE preserva permissões,
-- mas reafirmamos por segurança).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;


-- ────────────────────────────────────────────────────────────────
-- 3. PROVISIONAMENTO MANUAL DE ADMINS
-- ────────────────────────────────────────────────────────────────
-- Com o auto-admin removido, promove um admin explicitamente (uma vez), correndo
-- MANUALMENTE no SQL Editor com a conta já criada em Auth. Exemplo:
--
--   UPDATE public.profiles SET role = 'admin'
--   WHERE email = 'admin@recibocerto.pt';
--
-- (Corre como postgres/owner no SQL Editor → auth.uid() é null → o trigger
--  §1 permite. Via service_role no servidor idem.)
--
-- Não fazemos o UPDATE automaticamente aqui para não reintroduzir uma promoção
-- implícita por email; é uma ação deliberada do operador.


-- ────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO (opcional) — confirmar que o trigger existe
-- ────────────────────────────────────────────────────────────────
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass;
