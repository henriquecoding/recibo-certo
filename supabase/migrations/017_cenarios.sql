-- 017_cenarios.sql
-- Repositório UNIFICADO de cenários de simulação (recibos verdes, recibo de
-- vencimento, abrir empresa e IRS). Guarda um instantâneo COMPLETO dos inputs
-- (jsonb `dados`) para o utilizador reabrir/importar, e um `resumo` jsonb com
-- os números-chave para apresentação.
-- Modo duplo: sem sessão fica em localStorage; com sessão (Pro) sincroniza aqui.
-- Idempotente — seguro correr múltiplas vezes.

-- ── Tabela: cenarios ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cenarios (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo       text NOT NULL CHECK (tipo IN ('recibos', 'vencimento', 'empresa', 'irs')),
  nome       text,
  resumo     jsonb NOT NULL DEFAULT '{}'::jsonb,
  dados      jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em  timestamptz DEFAULT now()
);

-- ── Índice ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS cenarios_user_criado_idx
  ON public.cenarios(user_id, criado_em DESC);

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.cenarios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Utilizador vê/edita apenas os seus cenários.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cenarios' AND policyname = 'cenarios_own'
  ) THEN
    CREATE POLICY "cenarios_own" ON public.cenarios
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Admin vê tudo.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cenarios' AND policyname = 'cenarios_admin'
  ) THEN
    CREATE POLICY "cenarios_admin" ON public.cenarios
      FOR ALL
      USING (public.is_admin());
  END IF;
END $$;
