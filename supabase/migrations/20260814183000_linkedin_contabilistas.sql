-- LinkedIn no perfil profissional dos contabilistas.
--
-- A conta é ligada por Supabase Auth (`linkedin_oidc`). A fotografia pública
-- não pode ser escrita diretamente pelo browser: só a função de sincronização
-- a copia de `auth.identities`, depois de confirmar que a identidade pertence
-- ao utilizador autenticado. O URL `/in/...` é confirmado manualmente porque
-- o OpenID Connect do LinkedIn fornece nome/foto, mas não o endereço público.

ALTER TABLE public.contabilistas
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS linkedin_avatar_url text,
  ADD COLUMN IF NOT EXISTS linkedin_subject text,
  ADD COLUMN IF NOT EXISTS linkedin_ligado_em timestamptz;

ALTER TABLE public.contabilistas
  DROP CONSTRAINT IF EXISTS contabilistas_linkedin_url_valido;
ALTER TABLE public.contabilistas
  ADD CONSTRAINT contabilistas_linkedin_url_valido CHECK (
    linkedin_url IS NULL OR linkedin_url ~ '^https://([[:alnum:]-]+\.)*linkedin\.com/in/[A-Za-z0-9%._~+-]+/?$'
  );

CREATE OR REPLACE FUNCTION public.proteger_identidade_linkedin_contabilista()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (
    NEW.linkedin_avatar_url IS DISTINCT FROM OLD.linkedin_avatar_url OR
    NEW.linkedin_subject IS DISTINCT FROM OLD.linkedin_subject OR
    NEW.linkedin_ligado_em IS DISTINCT FROM OLD.linkedin_ligado_em
  ) AND COALESCE(pg_catalog.current_setting('app.sincronizar_linkedin', true), '') <> '1' THEN
    RAISE EXCEPTION 'Os dados verificados do LinkedIn só podem ser alterados pela sincronização da identidade.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.proteger_identidade_linkedin_contabilista() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_proteger_identidade_linkedin_contabilista ON public.contabilistas;
CREATE TRIGGER trg_proteger_identidade_linkedin_contabilista
BEFORE UPDATE ON public.contabilistas
FOR EACH ROW EXECUTE FUNCTION public.proteger_identidade_linkedin_contabilista();

CREATE OR REPLACE FUNCTION public.sincronizar_linkedin_contabilista()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_identidade record;
  v_avatar text;
  v_subject text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária.' USING ERRCODE = '42501';
  END IF;

  SELECT i.identity_data
    INTO v_identidade
  FROM auth.identities i
  WHERE i.user_id = v_user
    AND i.provider = 'linkedin_oidc'
  ORDER BY i.created_at DESC
  LIMIT 1;

  PERFORM pg_catalog.set_config('app.sincronizar_linkedin', '1', true);

  IF NOT FOUND THEN
    UPDATE public.contabilistas
       SET linkedin_avatar_url = NULL,
           linkedin_subject = NULL,
           linkedin_ligado_em = NULL
     WHERE user_id = v_user;

    RETURN pg_catalog.jsonb_build_object('ligado', false);
  END IF;

  v_avatar := NULLIF(pg_catalog.btrim(COALESCE(
    v_identidade.identity_data ->> 'picture',
    v_identidade.identity_data ->> 'avatar_url'
  )), '');
  v_subject := NULLIF(pg_catalog.btrim(COALESCE(
    v_identidade.identity_data ->> 'sub',
    v_identidade.identity_data ->> 'provider_id'
  )), '');

  IF v_avatar IS NOT NULL AND v_avatar !~ '^https://' THEN
    v_avatar := NULL;
  END IF;

  UPDATE public.contabilistas
     SET linkedin_avatar_url = v_avatar,
         linkedin_subject = v_subject,
         linkedin_ligado_em = COALESCE(linkedin_ligado_em, pg_catalog.now())
   WHERE user_id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não existe ficha de contabilista para esta conta.' USING ERRCODE = 'P0002';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'ligado', true,
    'avatar_url', v_avatar,
    'subject', v_subject
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_linkedin_contabilista() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sincronizar_linkedin_contabilista() TO authenticated;

-- Mantém a mesma fronteira anti-HTML/script já usada pelo resto do painel.
DROP TRIGGER IF EXISTS trg_texto_seguro_contabilistas ON public.contabilistas;
CREATE TRIGGER trg_texto_seguro_contabilistas
BEFORE INSERT OR UPDATE ON public.contabilistas
FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
  'nome', 'occ', 'bio', 'concelho', 'email_contacto', 'telefone', 'website', 'linkedin_url'
);
