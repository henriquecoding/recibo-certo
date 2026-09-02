-- ═══════════════════════════════════════════════════════════════════════
--  Arreio mínimo para exercer as políticas RLS de `public.cenarios`.
--  ---------------------------------------------------------------------
--  O arreio da plataforma de contabilistas (`00-arreio-supabase.sql`) não
--  serve aqui: ele monta o esquema de 042 em diante, e `cenarios` nasce na
--  017. E aplicar `20260813_planos_operacionais.sql` inteiro — que é onde
--  as políticas atuais de `cenarios` vivem — arrastaria a faturação toda e
--  mudaria comportamento que quatro ficheiros dessa suíte afirmam.
--
--  Por isso este arreio faz três coisas, e só três:
--
--    1. imita o que o Supabase dá de graça (papéis, `auth.uid()`);
--    2. dá o mínimo de que `private.current_user_has_plus()` precisa;
--    3. REPRODUZ as políticas de `cenarios` tal como estão hoje em
--       produção — copiadas de `20260813_planos_operacionais.sql`.
--
--  ⚠️ O ponto 3 é uma cópia, e uma cópia pode divergir. É por isso que a
--  migração que esta suíte testa termina com um bloco que EXIGE que as
--  quatro políticas existam pelo nome: se alguém as renomear ou remover
--  na base a sério, é a migração que se recusa a aplicar — não é este
--  ficheiro que finge que está tudo bem.
-- ═══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text
);

-- Como no Supabase: lê a sessão, que na plataforma vem do JWT.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- A 017 cria uma política de admin que precisa desta função. A 038 larga
-- essa política — o admin deixou de poder ler dados fiscais —, e este
-- arreio reproduz as duas coisas: a função existe para a 017 aplicar, e a
-- política é largada em `01-politicas-atuais.sql`, como em produção.
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT false; $$;

-- ── O mínimo de que a 032 precisa ──────────────────────────────────────
--
-- A 032 fecha lacunas em três tabelas ao mesmo tempo. Aqui só interessa o
-- que ela faz a `cenarios` — mas ela é UMA migração, e aplicá-la a meio
-- seria testar outra coisa. As duas tabelas entram com o mínimo: as
-- colunas que a 032 espera encontrar para lhes acrescentar as suas.
CREATE TABLE IF NOT EXISTS public.recibos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT current_date,
  criado_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ── O mínimo do plano ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL,
  concessao_termina_em timestamptz
);

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Cópia fiel de `20260813_planos_operacionais.sql`.
CREATE OR REPLACE FUNCTION private.user_has_plus(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'trialing', 'past_due')
      AND (s.concessao_termina_em IS NULL OR s.concessao_termina_em > now())
  );
$$;

CREATE OR REPLACE FUNCTION private.current_user_has_plus()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.user_has_plus((SELECT auth.uid()));
$$;

REVOKE ALL ON FUNCTION private.user_has_plus(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.current_user_has_plus() FROM PUBLIC, anon;
-- Sem este GRANT, a política de INSERT recusava toda a gente — inclusive
-- quem tem Plus — e a suíte dava por «bem protegido» o que estava era
-- partido. É a linha 360 da 20260813, e é preciso estar aqui pelo mesmo
-- motivo por que está lá.
GRANT EXECUTE ON FUNCTION private.current_user_has_plus() TO authenticated;
