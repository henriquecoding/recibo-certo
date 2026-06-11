-- ================================================================
-- ReciboCerto — Stripe Subscriptions (v5)
-- Tabela para guardar o estado das subscrições Stripe.
-- Atualizada via webhook (/api/stripe/webhook).
-- Idempotente: seguro para correr múltiplas vezes.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id  text        NOT NULL,
  stripe_customer_id      text        NOT NULL,
  status                  text        NOT NULL DEFAULT 'incomplete'
                                       CHECK (status IN (
                                         'active','trialing','past_due',
                                         'canceled','incomplete','incomplete_expired',
                                         'unpaid','paused'
                                       )),
  price_id                text,
  intervalo               text        NOT NULL DEFAULT 'monthly'
                                       CHECK (intervalo IN ('monthly','annual')),
  inicio                  timestamptz,
  cancelado_em            timestamptz,
  criado_em               timestamptz DEFAULT now(),
  atualizado_em           timestamptz DEFAULT now(),

  CONSTRAINT subscriptions_stripe_id_unique UNIQUE (stripe_subscription_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- O utilizador vê as suas próprias subscrições
DROP POLICY IF EXISTS "utilizador_ve_subscricoes" ON public.subscriptions;
CREATE POLICY "utilizador_ve_subscricoes" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Admin vê todas
DROP POLICY IF EXISTS "admin_ve_subscricoes" ON public.subscriptions;
CREATE POLICY "admin_ve_subscricoes" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- O service role (webhook) pode inserir/atualizar/eliminar
DROP POLICY IF EXISTS "service_role_gere_subscricoes" ON public.subscriptions;
CREATE POLICY "service_role_gere_subscricoes" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger para atualizar timestamp
DROP TRIGGER IF EXISTS subscriptions_set_atualizado ON public.subscriptions;
CREATE TRIGGER subscriptions_set_atualizado
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- Índices
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx
  ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx
  ON public.subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_idx
  ON public.subscriptions (stripe_customer_id);
