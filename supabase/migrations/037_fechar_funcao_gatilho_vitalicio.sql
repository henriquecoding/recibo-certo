-- 037_fechar_funcao_gatilho_vitalicio.sql
-- `vitalicio_respeita_limite()` é uma função de GATILHO: o Postgres chama-a
-- ao inserir, e ninguém a deve chamar à mão. Ficou, ainda assim, exposta em
-- /rest/v1/rpc/ pelo GRANT que o Supabase dá a PUBLIC por omissão — foi o
-- linter de segurança a apanhá-la, depois de a 035 a criar.
--
-- Chamá-la diretamente falharia (falta-lhe o contexto de gatilho), mas uma
-- função interna não tem nada que estar na superfície pública da API.
--
-- `lugares_vitalicios()` FICA aberta de propósito: é o contador público e
-- devolve só números. Quem a chama é quem ainda não tem conta.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'vitalicio_respeita_limite'
               AND pronamespace = 'public'::regnamespace) THEN
    REVOKE ALL ON FUNCTION public.vitalicio_respeita_limite() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
