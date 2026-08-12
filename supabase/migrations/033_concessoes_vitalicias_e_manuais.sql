-- 033_concessoes_vitalicias_e_manuais.sql
-- ═══════════════════════════════════════════════════════════════════════
--  ORIGEM DA CONCESSÃO — vitalício e manual deixam de ser preços fingidos
--  ---------------------------------------------------------------------
--  `subscriptions` já era a única resposta a «esta pessoa tem Plus?», com
--  uma coluna de identificação por origem (008 abriu o padrão para o Lemon
--  Squeezy, 027 para os cupões do Quiz). Faltavam duas origens que não são
--  subscrições de todo — e, por não existirem, tinham sido improvisadas:
--
--   · uma linha com `stripe_subscription_id = 'manual_lifetime_admin'`;
--   · outra com `ls_subscription_id = 'lifetime_admin_grant'`, escrita na
--     coluna de um provedor que nunca emitiu subscrição nenhuma.
--
--  As duas eram acesso vitalício interno. E as duas estavam NEGADAS desde o
--  endurecimento RC-BILL-002: sem `price_id`, `concedePlus()` recusava. O
--  acesso vitalício da equipa estava, na prática, desligado.
--
--  A origem passa a ser explícita e cada uma traz a prova que lhe compete.
--  Idempotente — seguro correr múltiplas vezes.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS origem                text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent text,
  ADD COLUMN IF NOT EXISTS motivo                text,
  ADD COLUMN IF NOT EXISTS concedido_por         uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Classificar o que já existe, ANTES de exigir a coluna. As concessões
-- improvisadas em colunas de provedor voltam a ser o que sempre foram.
UPDATE public.subscriptions
   SET origem = CASE
     WHEN cupao_id IS NOT NULL                              THEN 'cupao'
     WHEN stripe_subscription_id = 'manual_lifetime_admin'  THEN 'manual'
     WHEN ls_subscription_id     = 'lifetime_admin_grant'   THEN 'manual'
     WHEN ls_subscription_id IS NOT NULL                    THEN 'lemon_squeezy'
     ELSE 'stripe'
   END
 WHERE origem IS NULL;

UPDATE public.subscriptions
   SET ls_subscription_id = NULL
 WHERE origem = 'manual' AND ls_subscription_id = 'lifetime_admin_grant';

UPDATE public.subscriptions
   SET motivo = coalesce(motivo, 'Acesso vitalício interno da equipa (migrado de concessão sem origem declarada).'),
       concedido_por = coalesce(concedido_por, user_id)
 WHERE origem = 'manual';

ALTER TABLE public.subscriptions ALTER COLUMN origem SET DEFAULT 'stripe';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_origem_check') THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_origem_check
      CHECK (origem IN ('stripe', 'lemon_squeezy', 'cupao', 'vitalicio', 'manual'));
  END IF;
END $$;

-- Uma compra vitalícia identifica-se pelo pagamento que a originou.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_vitalicio_tem_prova') THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_vitalicio_tem_prova CHECK (
      origem <> 'vitalicio' OR (stripe_payment_intent IS NOT NULL AND concessao_termina_em IS NULL)
    );
  END IF;
END $$;

-- Uma concessão manual exige uma razão escrita: é o que a distingue de um
-- engano, e é o que o apoio ao cliente lê daqui a um ano.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_manual_tem_motivo') THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_manual_tem_motivo CHECK (
      origem <> 'manual' OR motivo IS NOT NULL
    );
  END IF;
END $$;

-- RC-BILL-002 passa a ser estrutural para o Stripe. NOT VALID porque pode
-- haver linhas antigas por classificar — mas nenhuma NOVA passa sem preço.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_provedor_tem_preco') THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_provedor_tem_preco CHECK (
      origem NOT IN ('stripe') OR price_id IS NOT NULL
    ) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_payment_intent_unique') THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_payment_intent_unique UNIQUE (stripe_payment_intent);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS subscriptions_origem_idx ON public.subscriptions (origem);

-- O `intervalo` só admitia 'monthly' e 'annual'. Uma compra única não é
-- nenhum dos dois — e sem isto o webhook escreveria 'lifetime', a constraint
-- recusava, e a compra ficava paga e por conceder.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_intervalo_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_intervalo_check
  CHECK (intervalo IN ('monthly', 'annual', 'lifetime'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_vitalicio_sem_intervalo') THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_vitalicio_sem_intervalo CHECK (
      origem <> 'vitalicio' OR intervalo = 'lifetime'
    );
  END IF;
END $$;

COMMENT ON COLUMN public.subscriptions.origem IS
  'De onde vem esta concessão: stripe | lemon_squeezy | cupao | vitalicio | manual. Decide QUE prova é exigida — ver concedePlus() em src/lib/stripe/precos-autorizados.ts.';
COMMENT ON COLUMN public.subscriptions.stripe_payment_intent IS
  'Pagamento único que originou uma compra vitalícia. Único: o mesmo pagamento não concede duas vezes.';
COMMENT ON COLUMN public.subscriptions.motivo IS
  'Porquê, em português, de uma concessão manual. Obrigatório quando origem = manual.';
COMMENT ON COLUMN public.subscriptions.concedido_por IS
  'Quem concedeu, numa concessão manual. Deixa rasto de quem decidiu.';
