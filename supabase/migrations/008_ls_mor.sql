-- ================================================================
-- ReciboCerto — Migração MoR: Lemon Squeezy (v8)
--
-- Adiciona suporte a subscrições do Lemon Squeezy (Merchant of Record)
-- à tabela `subscriptions` existente, sem quebrar as subscrições
-- Stripe já em produção.
--
-- Alterações:
--   1. Tornar stripe_subscription_id e stripe_customer_id anuláveis
--      (serão NULL para novas subscrições via LS)
--   2. Adicionar colunas ls_subscription_id, ls_customer_id,
--      customer_portal_url
--   3. Adicionar constraint UNIQUE para ls_subscription_id
--   4. Atualizar CHECK de status para incluir "paused"
-- ================================================================

-- 1. Tornar colunas Stripe anuláveis (existiam como NOT NULL)
ALTER TABLE public.subscriptions
  ALTER COLUMN stripe_subscription_id DROP NOT NULL,
  ALTER COLUMN stripe_customer_id     DROP NOT NULL;

-- 2. Adicionar colunas Lemon Squeezy
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS ls_subscription_id  text,
  ADD COLUMN IF NOT EXISTS ls_customer_id      text,
  ADD COLUMN IF NOT EXISTS customer_portal_url text;

-- 3. Unique constraint para upsert idempotente por ls_subscription_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_ls_id_unique'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_ls_id_unique
      UNIQUE (ls_subscription_id);
  END IF;
END$$;

-- 4. Índices para queries do webhook e provider
CREATE INDEX IF NOT EXISTS subscriptions_ls_sub_idx
  ON public.subscriptions (ls_subscription_id)
  WHERE ls_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscriptions_ls_customer_idx
  ON public.subscriptions (ls_customer_id)
  WHERE ls_customer_id IS NOT NULL;

COMMENT ON COLUMN public.subscriptions.ls_subscription_id IS
  'ID da subscrição no Lemon Squeezy (ex: "sub_xxxxxxxx"). NULL para subscrições Stripe.';

COMMENT ON COLUMN public.subscriptions.ls_customer_id IS
  'ID do cliente no Lemon Squeezy. Usado para encontrar a subscrição ativa.';

COMMENT ON COLUMN public.subscriptions.customer_portal_url IS
  'URL do portal de cliente do Lemon Squeezy. Guardada no webhook subscription_created. '
  'Permite ao utilizador gerir, cancelar e atualizar o método de pagamento.';
