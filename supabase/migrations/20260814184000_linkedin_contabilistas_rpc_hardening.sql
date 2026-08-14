-- Mantém o RPC público como SECURITY INVOKER e move a leitura privilegiada de
-- auth.identities para o schema private, que não é exposto pelo PostgREST.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION private.sincronizar_linkedin_contabilista_interno(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_identidade record;
  v_avatar text;
  v_subject text;
BEGIN
  IF p_user IS NULL OR auth.uid() IS NULL OR p_user IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Sessão necessária.' USING ERRCODE = '42501';
  END IF;

  SELECT i.identity_data
    INTO v_identidade
  FROM auth.identities i
  WHERE i.user_id = p_user
    AND i.provider = 'linkedin_oidc'
  ORDER BY i.created_at DESC
  LIMIT 1;

  PERFORM pg_catalog.set_config('app.sincronizar_linkedin', '1', true);

  IF NOT FOUND THEN
    UPDATE public.contabilistas
       SET linkedin_avatar_url = NULL,
           linkedin_subject = NULL,
           linkedin_ligado_em = NULL
     WHERE user_id = p_user;
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

  IF v_avatar IS NOT NULL AND v_avatar !~ '^https://' THEN v_avatar := NULL; END IF;

  UPDATE public.contabilistas
     SET linkedin_avatar_url = v_avatar,
         linkedin_subject = v_subject,
         linkedin_ligado_em = COALESCE(linkedin_ligado_em, pg_catalog.now())
   WHERE user_id = p_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não existe ficha de contabilista para esta conta.' USING ERRCODE = 'P0002';
  END IF;

  RETURN pg_catalog.jsonb_build_object('ligado', true, 'avatar_url', v_avatar, 'subject', v_subject);
END;
$$;

REVOKE ALL ON FUNCTION private.sincronizar_linkedin_contabilista_interno(uuid) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.sincronizar_linkedin_contabilista_interno(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sincronizar_linkedin_contabilista()
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.sincronizar_linkedin_contabilista_interno(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.sincronizar_linkedin_contabilista() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sincronizar_linkedin_contabilista() TO authenticated;
