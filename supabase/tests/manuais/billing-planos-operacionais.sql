-- ═══════════════════════════════════════════════════════════════════════
--  TESTE MANUAL — planos operacionais e faturação
--  ---------------------------------------------------------------------
--  Vive em `manuais/` e não na raiz de `tests/` porque o arreio de RLS
--  (`npm run rls:check`) NÃO o consegue correr, e o motivo é estrutural:
--  o arreio monta um esquema mínimo a partir da migração 042, e isto
--  precisa de `subscriptions`, `profiles`, `cenarios` e das tabelas
--  `billing_*`, que vêm das migrações 001-041.
--
--  Durante muito tempo esteve na raiz sem prefixo numérico. O arreio corre
--  `[0-9][0-9]-*.sql`, por isso nunca lhe tocou — e um teste que ninguém
--  corre parece um teste que passa. Fica aqui com o nome do que é.
--
--  COMO CORRER
--  -----------
--    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--      -f supabase/tests/manuais/billing-planos-operacionais.sql
--
--  Correr depois de `20260813_planos_operacionais.sql`.
--  Tudo é revertido: não deixa contas, cobranças nem dados fiscais.
-- ═══════════════════════════════════════════════════════════════════════
BEGIN;

DO $$
DECLARE
  v_plus uuid := '10000000-0000-4000-8000-000000000001';
  v_admin uuid := '10000000-0000-4000-8000-000000000002';
  v_free uuid := '10000000-0000-4000-8000-000000000003';
  v_decision text;
  v_attempt integer;
  v_before integer;
  v_after integer;
BEGIN
  INSERT INTO auth.users (id, email, aud, role, created_at, updated_at)
  VALUES
    (v_plus, 'billing-plus@invalid.example', 'authenticated', 'authenticated', now(), now()),
    (v_admin, 'billing-admin@invalid.example', 'authenticated', 'authenticated', now(), now()),
    (v_free, 'billing-free@invalid.example', 'authenticated', 'authenticated', now(), now());

  INSERT INTO public.profiles (id, email, role)
  VALUES
    (v_plus, 'billing-plus@invalid.example', 'user'),
    (v_admin, 'billing-admin@invalid.example', 'admin'),
    (v_free, 'billing-free@invalid.example', 'user')
  ON CONFLICT (id) DO UPDATE SET email = excluded.email, role = excluded.role;

  INSERT INTO public.billing_price_catalog (
    stripe_price_id, stripe_product_id, modalidade, currency,
    unit_amount, recurring_interval, concede_plus, livemode
  ) VALUES
    ('price_BillingMonthlyTest', 'prod_BillingTest', 'monthly', 'eur', 199, 'month', true, false),
    ('price_BillingLifetimeTest', 'prod_BillingTest', 'lifetime', 'eur', 1999, NULL, true, false);

  INSERT INTO public.subscriptions (
    user_id, origem, status, intervalo, price_id,
    stripe_subscription_id, motivo, concedido_por
  ) VALUES (
    v_plus, 'stripe', 'active', 'monthly', 'price_BillingMonthlyTest',
    'sub_BillingTest', NULL, NULL
  );

  IF NOT private.user_has_plus(v_plus) THEN
    RAISE EXCEPTION 'uma subscrição Stripe verificada devia conceder Plus';
  END IF;

  UPDATE public.subscriptions
  SET status = 'past_due', periodo_graca_termina_em = now() - interval '1 second'
  WHERE stripe_subscription_id = 'sub_BillingTest';
  IF private.user_has_plus(v_plus) THEN
    RAISE EXCEPTION 'uma graça expirada não pode conceder Plus';
  END IF;

  UPDATE public.subscriptions
  SET periodo_graca_termina_em = now() + interval '1 day'
  WHERE stripe_subscription_id = 'sub_BillingTest';
  IF NOT private.user_has_plus(v_plus) THEN
    RAISE EXCEPTION 'past_due dentro da graça devia conceder Plus';
  END IF;

  UPDATE public.billing_price_catalog
  SET concede_plus = false
  WHERE stripe_price_id = 'price_BillingMonthlyTest';
  IF private.user_has_plus(v_plus) THEN
    RAISE EXCEPTION 'um preço retirado do catálogo não pode conceder Plus';
  END IF;

  DELETE FROM public.subscriptions WHERE user_id = v_plus;
  INSERT INTO public.subscriptions (
    user_id, origem, status, intervalo, motivo, concedido_por
  ) VALUES (
    v_plus, 'manual', 'active', 'lifetime', 'teste transacional', v_admin
  );
  IF NOT private.user_has_plus(v_plus) THEN
    RAISE EXCEPTION 'uma concessão manual auditável devia conceder Plus';
  END IF;

  BEGIN
    INSERT INTO public.subscriptions (
      user_id, origem, status, intervalo, motivo, concedido_por
    ) VALUES (
      v_free, 'manual', 'active', 'lifetime', 'autor sem poderes', v_free
    );
    RAISE EXCEPTION 'uma conta não-admin conseguiu conceder Plus manualmente';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  SELECT ocupados INTO v_before FROM public.lugares_vitalicios();
  UPDATE public.subscriptions SET status = 'canceled' WHERE user_id = v_plus;
  SELECT ocupados INTO v_after FROM public.lugares_vitalicios();
  IF v_after <> v_before - 1 THEN
    RAISE EXCEPTION 'cancelar/reembolsar devia libertar um lugar vitalício';
  END IF;

  SELECT decision, attempt INTO v_decision, v_attempt
  FROM public.billing_claim_stripe_event('evt_BillingTest', 'test.event', 1786579200, 'obj_test');
  IF v_decision <> 'process' OR v_attempt <> 1 THEN
    RAISE EXCEPTION 'primeira entrega devia reivindicar o evento';
  END IF;

  SELECT decision, attempt INTO v_decision, v_attempt
  FROM public.billing_claim_stripe_event('evt_BillingTest', 'test.event', 1786579200, 'obj_test');
  IF v_decision <> 'busy' THEN
    RAISE EXCEPTION 'entrega concorrente devia encontrar a lease ocupada';
  END IF;

  PERFORM public.billing_finish_stripe_event('evt_BillingTest', 'processed', NULL);
  SELECT decision, attempt INTO v_decision, v_attempt
  FROM public.billing_claim_stripe_event('evt_BillingTest', 'test.event', 1786579200, 'obj_test');
  IF v_decision <> 'processed' THEN
    RAISE EXCEPTION 'reentrega concluída devia ser um no-op';
  END IF;

  SELECT decision, attempt INTO v_decision, v_attempt
  FROM public.billing_claim_stripe_event('evt_BillingDeadLetter', 'test.event', 1786579200, 'obj_test');
  IF v_decision <> 'process' THEN
    RAISE EXCEPTION 'o evento para dead-letter devia começar em processamento';
  END IF;
  PERFORM public.billing_finish_stripe_event('evt_BillingDeadLetter', 'dead_letter', 'teste');
  SELECT decision, attempt INTO v_decision, v_attempt
  FROM public.billing_claim_stripe_event('evt_BillingDeadLetter', 'test.event', 1786579200, 'obj_test');
  IF v_decision <> 'processed' THEN
    RAISE EXCEPTION 'um evento em dead-letter não deve repetir efeitos automaticamente';
  END IF;
END;
$$;

-- Policies: uma conta grátis pode ler/apagar o que já era seu, mas não pode
-- criar conteúdo de nuvem; a conta Plus pode.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.cenarios (user_id, tipo, nome)
    VALUES ('10000000-0000-4000-8000-000000000003', 'irs', 'não deve entrar');
    RAISE EXCEPTION 'a policy deixou uma conta grátis gravar na nuvem';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.profiles
    SET preferencias_fiscais = '{"v": 2, "regimeIVA": "isento"}'::jsonb
    WHERE id = '10000000-0000-4000-8000-000000000003';
    RAISE EXCEPTION 'uma conta grátis conseguiu sincronizar o perfil fiscal';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
-- A concessão foi cancelada acima; volta a existir de forma auditável para o
-- teste da policy.
RESET ROLE;
INSERT INTO public.subscriptions (user_id, origem, status, intervalo, motivo, concedido_por)
VALUES (
  '10000000-0000-4000-8000-000000000001', 'manual', 'active', 'lifetime',
  'teste RLS', '10000000-0000-4000-8000-000000000002'
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
INSERT INTO public.cenarios (user_id, tipo, nome)
VALUES ('10000000-0000-4000-8000-000000000001', 'irs', 'entra com Plus');
UPDATE public.profiles
SET preferencias_fiscais = '{"v": 2, "regimeIVA": "isento"}'::jsonb
WHERE id = '10000000-0000-4000-8000-000000000001';

ROLLBACK;
