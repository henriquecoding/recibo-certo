-- 036_purga_dados_apos_cancelamento.sql
-- ═══════════════════════════════════════════════════════════════════════
--  OS DADOS NA NUVEM NÃO SOBREVIVEM AO FIM DA SUBSCRIÇÃO
--  ---------------------------------------------------------------------
--  Minimização de dados, e é uma medida de segurança a sério: dados que
--  não guardamos não podem ser expostos. Guardar indefinidamente o
--  histórico fiscal de quem deixou de usar o serviço é acumular risco sem
--  contrapartida nenhuma — para nós e para a pessoa.
--
--  ── PORQUÊ UMA JANELA, E NÃO APAGAR NO INSTANTE ──────────────────────
--  Uma subscrição também acaba quando um cartão expira. Apagar no momento
--  em que o estado muda para `canceled` destruiria os dados de quem nunca
--  escolheu sair — e de quem só precisava de atualizar o cartão. Os 30
--  dias existem para o pagamento poder ser resolvido sem perda, para a
--  pessoa exportar o que é dela (Art. 20.º do RGPD) e para quem cancelou
--  por engano poder voltar atrás.
--
--  O QUE NUNCA É APAGADO: o que está no dispositivo da pessoa.
--  O QUE FICA: a conta, o perfil e o histórico de faturação (obrigação
--  legal de conservação). Apaga-se o CONTEÚDO fiscal.
--
--  Idempotente — seguro correr múltiplas vezes.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS purga_agendada_para timestamptz;

COMMENT ON COLUMN public.profiles.purga_agendada_para IS
  'Quando o conteúdo fiscal na nuvem será apagado, por a subscrição ter terminado. NULL = nada agendado. Reativar a subscrição limpa esta data.';

CREATE INDEX IF NOT EXISTS profiles_purga_idx
  ON public.profiles (purga_agendada_para)
  WHERE purga_agendada_para IS NOT NULL;

CREATE OR REPLACE FUNCTION public.dias_ate_purga()
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT 30;
$$;

COMMENT ON FUNCTION public.dias_ate_purga IS
  'Janela entre o fim da subscrição e o apagamento do conteúdo na nuvem. Origem única do número — a aplicação lê daqui.';

CREATE OR REPLACE FUNCTION public.agendar_purga(p_user_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  quando timestamptz := now() + (public.dias_ate_purga() || ' days')::interval;
BEGIN
  -- Não reagendar se já houver data marcada: um webhook reentregue não pode
  -- empurrar o prazo para a frente indefinidamente.
  UPDATE public.profiles
     SET purga_agendada_para = coalesce(purga_agendada_para, quando)
   WHERE id = p_user_id;
  RETURN (SELECT purga_agendada_para FROM public.profiles WHERE id = p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_purga(p_user_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET purga_agendada_para = NULL WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.purgar_dados_expirados()
RETURNS TABLE (utilizadores integer, recibos integer, vencimentos integer, cenarios integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  alvos uuid[];
  n_rec integer := 0;
  n_ven integer := 0;
  n_cen integer := 0;
BEGIN
  SELECT array_agg(id) INTO alvos
    FROM public.profiles
   WHERE purga_agendada_para IS NOT NULL AND purga_agendada_para <= now();

  IF alvos IS NULL OR array_length(alvos, 1) IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0, 0;
    RETURN;
  END IF;

  -- Salvaguarda contra o pior engano possível: se, entretanto, a pessoa
  -- voltou a ter Plus, não se apaga nada. A data devia ter sido limpa pelo
  -- webhook; se não foi, é aqui que se repara em vez de destruir dados.
  SELECT array_agg(a) INTO alvos
    FROM unnest(alvos) AS a
   WHERE NOT EXISTS (
     SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = a
        AND s.status IN ('active', 'trialing', 'past_due')
        AND (s.concessao_termina_em IS NULL OR s.concessao_termina_em > now())
   );

  IF alvos IS NULL OR array_length(alvos, 1) IS NULL THEN
    UPDATE public.profiles SET purga_agendada_para = NULL
     WHERE purga_agendada_para IS NOT NULL AND purga_agendada_para <= now();
    RETURN QUERY SELECT 0, 0, 0, 0;
    RETURN;
  END IF;

  WITH d AS (DELETE FROM public.recibos WHERE user_id = ANY(alvos) RETURNING 1)
  SELECT count(*)::integer INTO n_rec FROM d;

  WITH d AS (DELETE FROM public.recibos_vencimento WHERE user_id = ANY(alvos) RETURNING 1)
  SELECT count(*)::integer INTO n_ven FROM d;

  WITH d AS (DELETE FROM public.cenarios WHERE user_id = ANY(alvos) RETURNING 1)
  SELECT count(*)::integer INTO n_cen FROM d;

  UPDATE public.profiles
     SET preferencias_fiscais = NULL, purga_agendada_para = NULL
   WHERE id = ANY(alvos);

  RETURN QUERY SELECT array_length(alvos, 1), n_rec, n_ven, n_cen;
END;
$$;

COMMENT ON FUNCTION public.purgar_dados_expirados IS
  'Apaga o conteúdo fiscal na nuvem de quem passou a janela pós-cancelamento. Nunca apaga a conta nem o histórico de faturação. Chamada por /api/cron/purgar-dados.';

REVOKE ALL ON FUNCTION public.purgar_dados_expirados() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.agendar_purga(uuid)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancelar_purga(uuid)     FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purgar_dados_expirados() TO service_role;
GRANT EXECUTE ON FUNCTION public.agendar_purga(uuid)      TO service_role;
GRANT EXECUTE ON FUNCTION public.cancelar_purga(uuid)     TO service_role;

-- A janela é pública: quem está a decidir se cancela tem de a poder ler.
GRANT EXECUTE ON FUNCTION public.dias_ate_purga() TO anon, authenticated, service_role;
