-- 20260813_planos_operacionais.sql
-- Cobrança idempotente, direitos de acesso canónicos e fronteiras Plus na base.

-- O catálogo é preenchido apenas depois de o servidor confirmar o preço na
-- Stripe. Assim, uma variável mal configurada ou um price_id inventado nunca
-- concede o produto pago nem permite escrever dados Plus.
CREATE TABLE IF NOT EXISTS public.billing_price_catalog (
  stripe_price_id text PRIMARY KEY CHECK (stripe_price_id ~ '^price_[A-Za-z0-9]+$'),
  stripe_product_id text NOT NULL CHECK (stripe_product_id ~ '^prod_[A-Za-z0-9]+$'),
  modalidade text NOT NULL CHECK (modalidade IN ('monthly', 'lifetime', 'legacy')),
  currency text NOT NULL CHECK (currency = lower(currency)),
  unit_amount bigint,
  recurring_interval text,
  concede_plus boolean NOT NULL DEFAULT false,
  livemode boolean NOT NULL,
  verificado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_price_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.billing_price_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_price_catalog TO service_role;

-- Uma identidade interna estável para cada Customer. Procurar por email era
-- ambíguo e podia abrir o portal de uma conta antiga que reutilizasse o email.
CREATE TABLE IF NOT EXISTS public.billing_customers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE CHECK (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.billing_customers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_customers TO service_role;

INSERT INTO public.billing_customers (user_id, stripe_customer_id)
SELECT DISTINCT ON (s.user_id) s.user_id, s.stripe_customer_id
FROM public.subscriptions s
WHERE s.stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'
ORDER BY s.user_id, s.atualizado_em DESC NULLS LAST, s.criado_em DESC NULLS LAST
ON CONFLICT DO NOTHING;

-- Ledger mínimo: não guarda payloads (PII), apenas identidade, tipo, estado e
-- erro sanitizado. A lease impede duas entregas concorrentes de processarem o
-- mesmo evento e permite recuperar de uma função que tenha morrido a meio.
CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  event_id text PRIMARY KEY CHECK (event_id ~ '^evt_[A-Za-z0-9]+$'),
  event_type text NOT NULL,
  object_id text,
  stripe_created_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed', 'dead_letter')),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  lease_until timestamptz,
  last_error text,
  recebido_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  processado_em timestamptz
);

ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.billing_webhook_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_webhook_events TO service_role;

CREATE INDEX IF NOT EXISTS billing_webhook_events_pendentes_idx
  ON public.billing_webhook_events (status, atualizado_em)
  WHERE status <> 'processed';

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS periodo_atual_termina_em timestamptz,
  ADD COLUMN IF NOT EXISTS periodo_graca_termina_em timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_sincronizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS revogado_em timestamptz,
  ADD COLUMN IF NOT EXISTS revogacao_motivo text;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_checkout_session_unique
  ON public.subscriptions (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscriptions_user_access_idx
  ON public.subscriptions (user_id, status, origem);

CREATE INDEX IF NOT EXISTS subscriptions_concedido_por_idx
  ON public.subscriptions (concedido_por)
  WHERE concedido_por IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass
      AND conname = 'subscriptions_graca_so_em_atraso'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_graca_so_em_atraso
      CHECK (periodo_graca_termina_em IS NULL OR status = 'past_due');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_normalizar_subscricao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.atualizado_em := now();

  IF NEW.status = 'past_due' THEN
    NEW.periodo_graca_termina_em := coalesce(
      NEW.periodo_graca_termina_em,
      CASE WHEN TG_OP = 'UPDATE' AND OLD.status = 'past_due'
        THEN OLD.periodo_graca_termina_em END,
      now() + interval '14 days'
    );
  ELSE
    NEW.periodo_graca_termina_em := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_normalizar_subscricao() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_normalizar_subscricao() TO service_role;

DROP TRIGGER IF EXISTS subscriptions_normalizar_billing ON public.subscriptions;
CREATE TRIGGER subscriptions_normalizar_billing
  BEFORE INSERT OR UPDATE OF status, periodo_graca_termina_em
  ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.billing_normalizar_subscricao();

-- Uma concessão manual é uma ação administrativa, nunca apenas uma linha
-- com `status = active`. O gatilho mantém a prova auditável mesmo quando a
-- escrita usa service_role (que, por definição, ignora RLS).
CREATE OR REPLACE FUNCTION public.billing_validar_concessao_manual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.origem = 'manual' AND (
    nullif(btrim(NEW.motivo), '') IS NULL
    OR NEW.concedido_por IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = NEW.concedido_por AND p.role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'CONCESSAO_MANUAL_SEM_ADMIN: motivo e administrador válidos são obrigatórios.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_validar_concessao_manual()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_validar_concessao_manual() TO service_role;

DROP TRIGGER IF EXISTS subscriptions_validar_concessao_manual ON public.subscriptions;
CREATE TRIGGER subscriptions_validar_concessao_manual
  BEFORE INSERT OR UPDATE OF origem, motivo, concedido_por
  ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.billing_validar_concessao_manual();

UPDATE public.subscriptions
SET periodo_graca_termina_em = coalesce(periodo_graca_termina_em, now() + interval '14 days')
WHERE status = 'past_due';

-- Reivindicação transacional de um evento Stripe. A função devolve:
--   process   — esta invocação ficou dona do trabalho;
--   processed — uma entrega anterior já terminou;
--   busy      — outra invocação ainda tem uma lease válida.
CREATE OR REPLACE FUNCTION public.billing_claim_stripe_event(
  p_event_id text,
  p_event_type text,
  p_stripe_created bigint,
  p_object_id text DEFAULT NULL
)
RETURNS TABLE (decision text, attempt integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status text;
  v_lease timestamptz;
  v_attempt integer;
BEGIN
  IF p_event_id IS NULL OR p_event_id !~ '^evt_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'event_id Stripe inválido' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.billing_webhook_events (
    event_id, event_type, object_id, stripe_created_at, status, attempts, lease_until
  ) VALUES (
    p_event_id,
    left(coalesce(p_event_type, 'unknown'), 200),
    left(p_object_id, 255),
    to_timestamp(p_stripe_created),
    'processing',
    1,
    now() + interval '5 minutes'
  )
  ON CONFLICT (event_id) DO NOTHING;

  IF FOUND THEN
    RETURN QUERY SELECT 'process'::text, 1;
    RETURN;
  END IF;

  SELECT e.status, e.lease_until, e.attempts
    INTO v_status, v_lease, v_attempt
  FROM public.billing_webhook_events e
  WHERE e.event_id = p_event_id
  FOR UPDATE;

  IF v_status IN ('processed', 'dead_letter') THEN
    RETURN QUERY SELECT 'processed'::text, v_attempt;
    RETURN;
  END IF;

  IF v_status = 'processing' AND v_lease > now() THEN
    RETURN QUERY SELECT 'busy'::text, v_attempt;
    RETURN;
  END IF;

  UPDATE public.billing_webhook_events
  SET status = 'processing',
      attempts = attempts + 1,
      lease_until = now() + interval '5 minutes',
      atualizado_em = now(),
      last_error = NULL
  WHERE event_id = p_event_id
  RETURNING attempts INTO v_attempt;

  RETURN QUERY SELECT 'process'::text, v_attempt;
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_finish_stripe_event(
  p_event_id text,
  p_status text,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_status NOT IN ('processed', 'failed', 'dead_letter') THEN
    RAISE EXCEPTION 'estado de evento inválido' USING ERRCODE = '22023';
  END IF;

  UPDATE public.billing_webhook_events
  SET status = p_status,
      lease_until = NULL,
      last_error = CASE WHEN p_error IS NULL THEN NULL ELSE left(p_error, 500) END,
      atualizado_em = now(),
      processado_em = CASE WHEN p_status IN ('processed', 'dead_letter') THEN now() ELSE NULL END
  WHERE event_id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'evento Stripe não reivindicado' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_claim_stripe_event(text, text, bigint, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.billing_finish_stripe_event(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_claim_stripe_event(text, text, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_finish_stripe_event(text, text, text) TO service_role;

-- A mesma decisão de acesso é usada pelas policies e pelos crons. A função
-- parametrizada nunca é concedida ao cliente; o wrapper sem argumentos só
-- pode perguntar pelo próprio auth.uid().
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

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
      AND (s.status <> 'past_due' OR s.periodo_graca_termina_em > now())
      AND (
        (
          coalesce(s.origem, 'stripe') = 'stripe'
          AND s.stripe_subscription_id IS NOT NULL
          AND (
            EXISTS (
              SELECT 1 FROM public.billing_price_catalog p
              WHERE p.stripe_price_id = s.price_id AND p.concede_plus
            )
            -- Arranque: entre esta migração e a primeira validação de preço na
            -- Stripe o catálogo está vazio. Sem esta salvaguarda, todas as
            -- contas pagantes deixariam de poder escrever na nuvem, enquanto a
            -- aplicação (que tem as variáveis de ambiente como alternativa)
            -- continuaria a dizer-lhes que têm Plus. A porta fecha sozinha e
            -- para sempre assim que o primeiro preço autorizado é gravado.
            OR NOT EXISTS (SELECT 1 FROM public.billing_price_catalog p WHERE p.concede_plus)
          )
        )
        OR (
          s.origem = 'vitalicio'
          AND s.stripe_payment_intent IS NOT NULL
          AND (
            EXISTS (
              SELECT 1 FROM public.billing_price_catalog p
              WHERE p.stripe_price_id = s.price_id
                AND p.modalidade = 'lifetime'
                AND p.concede_plus
            )
            OR NOT EXISTS (
              SELECT 1 FROM public.billing_price_catalog p
              WHERE p.modalidade = 'lifetime' AND p.concede_plus
            )
          )
        )
        OR (s.origem = 'lemon_squeezy' AND s.ls_subscription_id IS NOT NULL)
        OR (s.origem = 'cupao' AND s.cupao_id IS NOT NULL AND s.concessao_termina_em > now())
        OR (
          s.origem = 'manual'
          AND nullif(btrim(s.motivo), '') IS NOT NULL
          AND s.concedido_por IS NOT NULL
        )
      )
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
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_has_plus() TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_has_plus(uuid) TO service_role;

-- O cliente já mantém o perfil fiscal no dispositivo para contas Grátis,
-- mas a mesma fronteira precisa de existir na base: esconder o update na UI
-- não impede um pedido direto à Data API. O gatilho só trava o próprio
-- utilizador autenticado; service_role e rotinas administrativas continuam a
-- poder executar purgas e tarefas de suporte.
CREATE OR REPLACE FUNCTION private.profiles_restringir_preferencias_fiscais()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (
    (TG_OP = 'INSERT' AND NEW.preferencias_fiscais IS NOT NULL)
    OR (
      TG_OP = 'UPDATE'
      AND NEW.preferencias_fiscais IS DISTINCT FROM OLD.preferencias_fiscais
    )
  )
  AND (SELECT auth.uid()) = NEW.id
  AND NOT private.user_has_plus(NEW.id)
  THEN
    RAISE EXCEPTION 'PLANO_PLUS_NECESSARIO: sincronizar o perfil fiscal exige Plus.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.profiles_restringir_preferencias_fiscais()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.profiles_restringir_preferencias_fiscais() TO service_role;

DROP TRIGGER IF EXISTS profiles_restringir_preferencias_fiscais ON public.profiles;
CREATE TRIGGER profiles_restringir_preferencias_fiscais
  BEFORE INSERT OR UPDATE OF preferencias_fiscais
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.profiles_restringir_preferencias_fiscais();

-- Histórico existente continua legível e eliminável pelo dono durante a
-- janela de retenção. Criar ou alterar dados na nuvem exige Plus na própria
-- base, não apenas um botão escondido no browser.
DROP POLICY IF EXISTS cenarios_own ON public.cenarios;
DROP POLICY IF EXISTS cenarios_select_own ON public.cenarios;
DROP POLICY IF EXISTS cenarios_insert_plus ON public.cenarios;
DROP POLICY IF EXISTS cenarios_update_plus ON public.cenarios;
DROP POLICY IF EXISTS cenarios_delete_own ON public.cenarios;
CREATE POLICY cenarios_select_own ON public.cenarios FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY cenarios_insert_plus ON public.cenarios FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT private.current_user_has_plus()));
CREATE POLICY cenarios_update_plus ON public.cenarios FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND (SELECT private.current_user_has_plus()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT private.current_user_has_plus()));
CREATE POLICY cenarios_delete_own ON public.cenarios FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "apagar os proprios" ON public.recibos;
DROP POLICY IF EXISTS "atualizar os proprios" ON public.recibos;
DROP POLICY IF EXISTS "inserir os proprios" ON public.recibos;
DROP POLICY IF EXISTS utilizador_atualiza_recibos ON public.recibos;
DROP POLICY IF EXISTS utilizador_elimina_recibos ON public.recibos;
DROP POLICY IF EXISTS utilizador_insere_recibos ON public.recibos;
DROP POLICY IF EXISTS utilizador_ve_proprios_recibos ON public.recibos;
DROP POLICY IF EXISTS recibos_select_own ON public.recibos;
DROP POLICY IF EXISTS recibos_insert_plus ON public.recibos;
DROP POLICY IF EXISTS recibos_update_plus ON public.recibos;
DROP POLICY IF EXISTS recibos_delete_own ON public.recibos;
CREATE POLICY recibos_select_own ON public.recibos FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY recibos_insert_plus ON public.recibos FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT private.current_user_has_plus()));
CREATE POLICY recibos_update_plus ON public.recibos FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND (SELECT private.current_user_has_plus()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT private.current_user_has_plus()));
CREATE POLICY recibos_delete_own ON public.recibos FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS recibos_vencimento_own ON public.recibos_vencimento;
DROP POLICY IF EXISTS vencimentos_select_own ON public.recibos_vencimento;
DROP POLICY IF EXISTS vencimentos_insert_plus ON public.recibos_vencimento;
DROP POLICY IF EXISTS vencimentos_update_plus ON public.recibos_vencimento;
DROP POLICY IF EXISTS vencimentos_delete_own ON public.recibos_vencimento;
CREATE POLICY vencimentos_select_own ON public.recibos_vencimento FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY vencimentos_insert_plus ON public.recibos_vencimento FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT private.current_user_has_plus()));
CREATE POLICY vencimentos_update_plus ON public.recibos_vencimento FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND (SELECT private.current_user_has_plus()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT private.current_user_has_plus()));
CREATE POLICY vencimentos_delete_own ON public.recibos_vencimento FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS avatars_insert ON storage.objects;
DROP POLICY IF EXISTS avatars_update ON storage.objects;
CREATE POLICY avatars_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND (SELECT private.current_user_has_plus())
  );
CREATE POLICY avatars_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND (SELECT private.current_user_has_plus())
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND (SELECT private.current_user_has_plus())
  );

DROP POLICY IF EXISTS service_role_gere_subscricoes ON public.subscriptions;
DROP POLICY IF EXISTS utilizador_ve_subscricoes ON public.subscriptions;
CREATE POLICY utilizador_ve_subscricoes ON public.subscriptions FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND (concessao_termina_em IS NULL OR concessao_termina_em > now())
  );

-- Um lugar só está ocupado enquanto a concessão vitalícia está ativa. Um
-- reembolso ou disputa perdida liberta-o. Reativar volta a adquirir o lock.
CREATE OR REPLACE FUNCTION public.vitalicio_respeita_limite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_counted boolean := false;
  v_new_counted boolean;
  v_occupied integer;
  v_limit integer := public.lugares_vitalicios_total();
BEGIN
  v_new_counted := NEW.origem IN ('vitalicio', 'manual')
    AND NEW.status IN ('active', 'trialing', 'past_due', 'paused');
  IF TG_OP = 'UPDATE' THEN
    v_old_counted := OLD.origem IN ('vitalicio', 'manual')
      AND OLD.status IN ('active', 'trialing', 'past_due', 'paused');
  END IF;

  IF NOT v_new_counted OR v_old_counted THEN
    RETURN NEW;
  END IF;

  -- Um upsert repetido dispara BEFORE INSERT antes de descobrir o conflito.
  IF TG_OP = 'INSERT' AND NEW.stripe_payment_intent IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.stripe_payment_intent = NEW.stripe_payment_intent
  ) THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('recibocerto:lugares_vitalicios'));

  SELECT count(*) INTO v_occupied
  FROM public.subscriptions s
  WHERE s.origem IN ('vitalicio', 'manual')
    AND s.status IN ('active', 'trialing', 'past_due', 'paused')
    AND s.id <> NEW.id;

  IF v_occupied >= v_limit THEN
    RAISE EXCEPTION
      'LUGARES_VITALICIOS_ESGOTADOS: os % lugares vitalícios estão todos ocupados.', v_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_limite_vitalicio ON public.subscriptions;
CREATE TRIGGER subscriptions_limite_vitalicio
  BEFORE INSERT OR UPDATE OF origem, status ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.vitalicio_respeita_limite();

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_um_vitalicio_ativo_por_user
  ON public.subscriptions (user_id)
  WHERE origem IN ('vitalicio', 'manual')
    AND status IN ('active', 'trialing', 'past_due', 'paused');

CREATE OR REPLACE FUNCTION public.lugares_vitalicios()
RETURNS TABLE (total integer, ocupados integer, restantes integer, esgotado boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.lugares_vitalicios_total(),
    count(*)::integer,
    greatest(public.lugares_vitalicios_total() - count(*)::integer, 0),
    count(*)::integer >= public.lugares_vitalicios_total()
  FROM public.subscriptions
  WHERE origem IN ('vitalicio', 'manual')
    AND status IN ('active', 'trialing', 'past_due', 'paused');
$$;

-- A contagem é deliberadamente pública: contém apenas quatro números que a
-- página de preços já mostra. O checkout usa service_role e o gatilho continua
-- a ser a autoridade transacional para o lugar 1001.
REVOKE ALL ON FUNCTION public.lugares_vitalicios() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lugares_vitalicios() TO anon, authenticated, service_role;

-- Não se agenda nem executa uma purga se existir qualquer concessão válida,
-- incluindo vitalícia. past_due só protege dados enquanto durar a graça.
CREATE OR REPLACE FUNCTION public.agendar_purga(p_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_when timestamptz := now() + (public.dias_ate_purga() || ' days')::interval;
BEGIN
  IF private.user_has_plus(p_user_id) THEN
    UPDATE public.profiles SET purga_agendada_para = NULL WHERE id = p_user_id;
    RETURN NULL;
  END IF;

  UPDATE public.profiles
  SET purga_agendada_para = coalesce(purga_agendada_para, v_when)
  WHERE id = p_user_id;
  RETURN (SELECT purga_agendada_para FROM public.profiles WHERE id = p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.purgar_dados_expirados()
RETURNS TABLE (utilizadores integer, recibos integer, vencimentos integer, cenarios integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_targets uuid[];
  v_receipts integer := 0;
  v_payroll integer := 0;
  v_scenarios integer := 0;
BEGIN
  SELECT array_agg(p.id) INTO v_targets
  FROM public.profiles p
  WHERE p.purga_agendada_para IS NOT NULL
    AND p.purga_agendada_para <= now()
    AND NOT private.user_has_plus(p.id);

  IF v_targets IS NULL OR array_length(v_targets, 1) IS NULL THEN
    UPDATE public.profiles p
    SET purga_agendada_para = NULL
    WHERE p.purga_agendada_para IS NOT NULL
      AND p.purga_agendada_para <= now()
      AND private.user_has_plus(p.id);
    RETURN QUERY SELECT 0, 0, 0, 0;
    RETURN;
  END IF;

  WITH d AS (DELETE FROM public.recibos WHERE user_id = ANY(v_targets) RETURNING 1)
  SELECT count(*)::integer INTO v_receipts FROM d;
  WITH d AS (DELETE FROM public.recibos_vencimento WHERE user_id = ANY(v_targets) RETURNING 1)
  SELECT count(*)::integer INTO v_payroll FROM d;
  WITH d AS (DELETE FROM public.cenarios WHERE user_id = ANY(v_targets) RETURNING 1)
  SELECT count(*)::integer INTO v_scenarios FROM d;

  UPDATE public.profiles
  SET preferencias_fiscais = NULL, purga_agendada_para = NULL
  WHERE id = ANY(v_targets);

  RETURN QUERY SELECT array_length(v_targets, 1), v_receipts, v_payroll, v_scenarios;
END;
$$;

REVOKE ALL ON FUNCTION public.agendar_purga(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purgar_dados_expirados() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agendar_purga(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.purgar_dados_expirados() TO service_role;

-- is_admin é útil nas policies autenticadas, mas não há razão para anon o
-- executar.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
