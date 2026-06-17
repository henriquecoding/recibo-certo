-- 010_recibos_vencimento.sql
-- Cenários guardados do simulador de recibo de vencimento (Categoria A).
-- Modo duplo: sem sessão fica em localStorage; com sessão sincroniza aqui.
-- Idempotente — seguro correr múltiplas vezes.

-- ── Tabela: recibos_vencimento ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recibos_vencimento (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome                     text,
  salario_bruto            numeric(10,2) NOT NULL DEFAULT 0 CHECK (salario_bruto >= 0),
  dependentes              integer NOT NULL DEFAULT 0 CHECK (dependentes >= 0),
  subsidio_refeicao_dia    numeric(6,2) NOT NULL DEFAULT 0 CHECK (subsidio_refeicao_dia >= 0),
  subsidio_refeicao_cartao boolean NOT NULL DEFAULT true,
  dias_uteis               integer NOT NULL DEFAULT 22 CHECK (dias_uteis >= 0 AND dias_uteis <= 31),
  duodecimos               boolean NOT NULL DEFAULT false,
  criado_em                timestamptz DEFAULT now()
);

-- ── Índice ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS recibos_vencimento_user_criado_idx
  ON public.recibos_vencimento(user_id, criado_em DESC);

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.recibos_vencimento ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Utilizador vê/edita apenas os seus cenários.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recibos_vencimento' AND policyname = 'recibos_vencimento_own'
  ) THEN
    CREATE POLICY "recibos_vencimento_own" ON public.recibos_vencimento
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Admin vê tudo.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recibos_vencimento' AND policyname = 'recibos_vencimento_admin'
  ) THEN
    CREATE POLICY "recibos_vencimento_admin" ON public.recibos_vencimento
      FOR ALL
      USING (public.is_admin());
  END IF;
END $$;
