-- Arreio mínimo que imita o Supabase o suficiente para correr a migração 042
-- e exercer as políticas RLS a sério.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text
);

-- `auth.uid()` lê a definição de sessão, como no Supabase (que a lê do JWT).
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- As colunas com o mesmo nome e tipo das do Supabase. `file_size_limit` e
-- `allowed_mime_types` não estavam aqui, e por isso a suíte não conseguia
-- provar que os baldes recusam o que é grande ou do tipo errado.
CREATE TABLE storage.buckets (
  id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb,
  UNIQUE (bucket_id, name)
);

-- O Supabase recusa no serviço de Storage, antes de a linha existir. Aqui
-- não há serviço nenhum, e sem isto a suíte «provava» um limite que na
-- verdade nunca era exercido.
CREATE OR REPLACE FUNCTION storage.limites_do_balde() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE b record;
BEGIN
  SELECT file_size_limit, allowed_mime_types INTO b
    FROM storage.buckets WHERE id = NEW.bucket_id;

  IF b.file_size_limit IS NOT NULL
     AND coalesce((NEW.metadata->>'size')::bigint, 0) > b.file_size_limit THEN
    RAISE EXCEPTION 'Payload too large';
  END IF;

  IF b.allowed_mime_types IS NOT NULL
     AND NOT (coalesce(NEW.metadata->>'mimetype', '') = ANY(b.allowed_mime_types)) THEN
    RAISE EXCEPTION 'mime type not supported';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER limites_do_balde BEFORE INSERT ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION storage.limites_do_balde();
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT string_to_array(name, '/');
$$;

-- `profiles` + `is_admin()` como nas migrações 001/004/011.
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin'))
);

-- `preferencias_fiscais` nasceu na migração 032, que este arreio não aplica.
-- Sem ela, `apagar_conjuntos` falhava aqui e passava em produção — que é a
-- pior maneira de um teste estar errado.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferencias_fiscais jsonb;

-- ── As tabelas anteriores à 042 que o apagamento toca ────────────────
--
-- Só o esqueleto: a chave e a coluna de dono. O que aqui se exercita é a
-- migração 049, e não o esquema destas — mas sem elas a função não corre,
-- e uma função de apagar que nunca correu num teste não é uma garantia.
DO $arreio$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'recibos','recibos_vencimento','cenarios','prazos_cumpridos',
    'quiz_question_reports','quiz_achievement_progress','quiz_sessoes',
    'quiz_sessions','quiz_cupoes','alertas_guardiao',
    'partner_handoffs','partner_connections','site_feedback','subscriptions'
  ] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS public.%I (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        tipo text, canal text,
        criado_em timestamptz NOT NULL DEFAULT now()
      )$f$, t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR ALL TO authenticated
        USING (user_id = (SELECT auth.uid()))
        WITH CHECK (user_id = (SELECT auth.uid()))$f$, t || '_dono', t);
  END LOOP;
END $arreio$;

-- `quiz_profiles` é chaveada pelo id da pessoa, e não por `user_id` — foi
-- isso que o teste do catálogo apanhou.
CREATE TABLE IF NOT EXISTS public.quiz_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

-- `admin_auditoria` nasceu na 040. Sem ela, a leitura de documentos pela
-- administração não tinha onde ficar escrita — e o teste que prova que
-- fica não podia sequer correr.
CREATE TABLE IF NOT EXISTS public.admin_auditoria (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ator_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ator_email text,
  acao       text NOT NULL,
  alvo_id    uuid,
  alvo_email text,
  detalhe    jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip         text,
  criado_em  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auditoria_admin_le" ON public.admin_auditoria
  FOR SELECT TO authenticated USING (public.is_admin());


-- O Supabase concede isto por omissão às tabelas do schema public.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.buckets TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated, service_role;
