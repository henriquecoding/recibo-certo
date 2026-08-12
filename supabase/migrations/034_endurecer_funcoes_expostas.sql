-- 034_endurecer_funcoes_expostas.sql
-- ═══════════════════════════════════════════════════════════════════════
--  Fecha funções de manutenção que estavam expostas na API REST
--  ---------------------------------------------------------------------
--  O Supabase concede EXECUTE a PUBLIC por omissão, e PUBLIC inclui `anon`.
--  Duas funções de manutenção, SECURITY DEFINER e SEM guarda interna,
--  estavam chamáveis por qualquer pessoa via /rest/v1/rpc/:
--
--   · expirar_handoffs_pendentes() — marcava como expirados todos os
--     handoffs pendentes. Um pedido anónimo derrubava a integração.
--   · analytics_purgar_antigos()  — apagava eventos de medição.
--
--  NÃO se mexe em `is_admin()`: 32 políticas RLS em 18 tabelas avaliam-na, e
--  uma política é avaliada com os privilégios de quem consulta. Revogar o
--  EXECUTE a `authenticated` partiria o painel de administração inteiro.
-- ═══════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'expirar_handoffs_pendentes'
               AND pronamespace = 'public'::regnamespace) THEN
    REVOKE ALL ON FUNCTION public.expirar_handoffs_pendentes() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.expirar_handoffs_pendentes() TO service_role;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'analytics_purgar_antigos'
               AND pronamespace = 'public'::regnamespace) THEN
    REVOKE ALL ON FUNCTION public.analytics_purgar_antigos() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.analytics_purgar_antigos() TO service_role;
  END IF;
END $$;

-- `validar_feedback_xp` TEM guarda interna (is_admin) e é chamada pelo
-- browser com o JWT do administrador: `authenticated` mantém o EXECUTE.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validar_feedback_xp'
               AND pronamespace = 'public'::regnamespace) THEN
    REVOKE ALL ON FUNCTION public.validar_feedback_xp(uuid, integer) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.validar_feedback_xp(uuid, integer) TO authenticated, service_role;
  END IF;
END $$;

-- search_path fixo nas funções de gatilho: sem ele, a resolução de nomes
-- depende do caminho de quem dispara o gatilho.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'propostas_update_timestamp'
               AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.propostas_update_timestamp() SET search_path = public;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sanitizar_site_feedback'
               AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.sanitizar_site_feedback() SET search_path = public;
  END IF;
END $$;
