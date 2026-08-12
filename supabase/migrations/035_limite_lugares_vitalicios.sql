-- 035_limite_lugares_vitalicios.sql
-- ═══════════════════════════════════════════════════════════════════════
--  MIL LUGARES VITALÍCIOS — e o milésimo primeiro não entra
--  ---------------------------------------------------------------------
--  Um limite que só existe na interface não é um limite: é uma sugestão.
--  Quem chamasse a API diretamente passava, e — pior — bastavam duas
--  compras simultâneas no lugar 1000 para as duas lerem «999 ocupados» e
--  as duas passarem. Um contador lido antes de escrever, sem serialização,
--  está sempre a responder sobre um passado que já mudou.
--
--  Por isso o limite vive AQUI, num gatilho que corre dentro da mesma
--  transação da escrita e que serializa os concorrentes com um lock. A
--  interface e a rota de checkout também verificam, mas para dar uma
--  mensagem decente — não para garantir coisa nenhuma.
--
--  As concessões manuais CONTAM. São lugares vitalícios como os outros: as
--  duas contas internas ocupam dois dos mil.
--
--  Idempotente — seguro correr múltiplas vezes.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.lugares_vitalicios_total()
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT 1000;
$$;

COMMENT ON FUNCTION public.lugares_vitalicios_total IS
  'Quantos acessos vitalícios existem para dar. Origem única do número: o gatilho e a aplicação leem daqui, para não haver dois limites diferentes a discordar.';

CREATE OR REPLACE FUNCTION public.vitalicio_respeita_limite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ocupados integer;
  teto     integer := public.lugares_vitalicios_total();
BEGIN
  IF new.origem IS NULL OR new.origem NOT IN ('vitalicio', 'manual') THEN
    RETURN new;
  END IF;

  -- Já ocupava lugar antes desta escrita? Então não há lugar novo a tomar.
  IF tg_op = 'UPDATE' AND old.origem IN ('vitalicio', 'manual') THEN
    RETURN new;
  END IF;

  -- Serializa quem estiver a tentar entrar ao mesmo tempo. Sem isto, N
  -- transações concorrentes leem todas o mesmo «ocupados» e passam todas.
  PERFORM pg_advisory_xact_lock(hashtext('recibocerto:lugares_vitalicios'));

  SELECT count(*) INTO ocupados
    FROM public.subscriptions
   WHERE origem IN ('vitalicio', 'manual')
     AND id <> new.id;

  IF ocupados >= teto THEN
    RAISE EXCEPTION
      'LUGARES_VITALICIOS_ESGOTADOS: os % lugares vitalícios estão todos ocupados.', teto
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_limite_vitalicio ON public.subscriptions;
CREATE TRIGGER subscriptions_limite_vitalicio
  BEFORE INSERT OR UPDATE OF origem ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.vitalicio_respeita_limite();

-- A contagem pública devolve só números. Nenhuma identidade, nenhum email,
-- nenhum montante — por isso pode ser lida por quem ainda não tem conta,
-- que é precisamente quem está a decidir se compra.
CREATE OR REPLACE FUNCTION public.lugares_vitalicios()
RETURNS TABLE (total integer, ocupados integer, restantes integer, esgotado boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.lugares_vitalicios_total(),
    count(*)::integer,
    greatest(public.lugares_vitalicios_total() - count(*)::integer, 0),
    count(*)::integer >= public.lugares_vitalicios_total()
  FROM public.subscriptions
  WHERE origem IN ('vitalicio', 'manual');
$$;

COMMENT ON FUNCTION public.lugares_vitalicios IS
  'Estado dos lugares vitalícios, só em números. Sem identidades: é lida pela página de planos, por quem ainda não tem conta.';

GRANT EXECUTE ON FUNCTION public.lugares_vitalicios() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lugares_vitalicios_total() TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS subscriptions_vitalicio_lugar_idx
  ON public.subscriptions (origem)
  WHERE origem IN ('vitalicio', 'manual');
