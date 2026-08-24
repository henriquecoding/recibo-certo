-- 20260824094500_lembrar_casos_sem_resposta.sql
-- Um caso encaminhado que ninguém responde deixa de ficar calado.
--
-- `caso_encaminhamentos.estado` nasce 'convidado' e ficava assim PARA
-- SEMPRE se nenhum dos até três contabilistas escolhidos respondesse: não
-- havia cron nenhum a detetá-lo (só existiam para anexos, propostas
-- expiradas e reconciliação Stripe). O cliente ficava à espera de uma
-- resposta que ninguém sabia que devia dar.
--
-- Duas medidas, uma por dia:
--   · ao fim de LEMBRETE_DIAS, lembra-se cada contabilista convidado;
--   · ao fim de AVISAR_CLIENTE_DIAS, avisa-se o CLIENTE de que ninguém
--     respondeu — para ele poder escolher outra pessoa em vez de esperar.
--
-- Não muda o estado do encaminhamento: um convite por responder continua
-- por responder, e inventar um estado 'esquecido' seria fechar a porta a
-- quem ainda vai responder.
--
-- Idempotente.

-- As marcas de «já foi lembrado» vivem nas tabelas e não numa fila à
-- parte: sem elas, o cron voltava a avisar todos os dias.
ALTER TABLE public.caso_encaminhamentos ADD COLUMN IF NOT EXISTS lembrado_em timestamptz;
ALTER TABLE public.casos ADD COLUMN IF NOT EXISTS cliente_avisado_sem_resposta_em timestamptz;

CREATE OR REPLACE FUNCTION public.lembrar_casos_sem_resposta()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  LEMBRETE_DIAS        constant integer := 3;
  AVISAR_CLIENTE_DIAS  constant integer := 7;
  v_lembrados integer := 0;
  v_avisados  integer := 0;
  r record;
BEGIN
  -- ── 1. Lembrar quem foi convidado e não respondeu ──────────────────
  FOR r IN
    SELECT e.id, e.contabilista_id, c.referencia
      FROM public.caso_encaminhamentos e
      JOIN public.casos c ON c.id = e.caso_id
     WHERE e.estado = 'convidado'
       AND e.encaminhado_em < now() - make_interval(days => LEMBRETE_DIAS)
       AND e.lembrado_em IS NULL
  LOOP
    PERFORM public.avisar_utilizador(r.contabilista_id, 'caso',
      'Tens um caso por responder',
      'O caso ' || r.referencia || ' está à tua espera há alguns dias.',
      '/contabilista/casos');
    UPDATE public.caso_encaminhamentos SET lembrado_em = now() WHERE id = r.id;
    v_lembrados := v_lembrados + 1;
  END LOOP;

  -- ── 2. Avisar o cliente de que ninguém respondeu ───────────────────
  -- Um caso só entra aqui se NENHUM dos convites teve resposta: basta um
  -- 'aceite' para o caso estar a andar.
  FOR r IN
    SELECT c.id, c.cliente_id, c.referencia
      FROM public.casos c
     WHERE c.estado = 'encaminhado'
       AND c.cliente_avisado_sem_resposta_em IS NULL
       AND EXISTS (
         SELECT 1 FROM public.caso_encaminhamentos e
          WHERE e.caso_id = c.id
            AND e.encaminhado_em < now() - make_interval(days => AVISAR_CLIENTE_DIAS)
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.caso_encaminhamentos e
          WHERE e.caso_id = c.id AND e.estado = 'aceite'
       )
  LOOP
    PERFORM public.avisar_utilizador(r.cliente_id, 'caso',
      'Ainda não tens resposta',
      'Ninguém respondeu ao caso ' || r.referencia || '. Podes escolher outro contabilista.',
      '/dashboard/casos');
    UPDATE public.casos SET cliente_avisado_sem_resposta_em = now() WHERE id = r.id;
    v_avisados := v_avisados + 1;
  END LOOP;

  RETURN jsonb_build_object('lembrados', v_lembrados, 'avisados', v_avisados);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lembrar_casos_sem_resposta() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.lembrar_casos_sem_resposta() TO service_role;
