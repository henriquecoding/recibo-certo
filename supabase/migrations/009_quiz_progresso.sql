-- 009_quiz_progresso.sql
-- Sistema de progressão do Quiz Fiscal: perfil de XP/nível/energia e histórico de sessões.
-- Idempotente — seguro correr múltiplas vezes.

-- ── Tabela: quiz_profiles ──────────────────────────────────────────────────
-- Um registo por utilizador. Criado automaticamente ao registar.

CREATE TABLE IF NOT EXISTS public.quiz_profiles (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp               integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  streak_record    integer NOT NULL DEFAULT 0 CHECK (streak_record >= 0),
  energia_restante integer NOT NULL DEFAULT 5 CHECK (energia_restante >= 0),
  energia_reset_at timestamptz,
  atualizado_em    timestamptz DEFAULT now()
);

-- ── Tabela: quiz_sessions ──────────────────────────────────────────────────
-- Uma linha por sessão concluída. Usada para histórico e ranking.

CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modo             text NOT NULL CHECK (modo IN ('normal', 'guiado')),
  categoria        text,                        -- NULL = todas as categorias
  total_perguntas  integer NOT NULL CHECK (total_perguntas > 0),
  acertos          integer NOT NULL CHECK (acertos >= 0),
  pontos           integer NOT NULL DEFAULT 0 CHECK (pontos >= 0),
  xp_ganho         integer NOT NULL DEFAULT 0 CHECK (xp_ganho >= 0),
  streak_maximo    integer NOT NULL DEFAULT 0 CHECK (streak_maximo >= 0),
  tempo_total_seg  integer NOT NULL DEFAULT 0 CHECK (tempo_total_seg >= 0),
  criado_em        timestamptz DEFAULT now()
);

-- ── Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS quiz_profiles_xp_idx
  ON public.quiz_profiles(xp DESC);

CREATE INDEX IF NOT EXISTS quiz_sessions_user_criado_idx
  ON public.quiz_sessions(user_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS quiz_sessions_criado_idx
  ON public.quiz_sessions(criado_em DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.quiz_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

-- quiz_profiles: utilizador vê/edita apenas o seu; admin vê tudo.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_profiles' AND policyname = 'quiz_profiles_own'
  ) THEN
    CREATE POLICY "quiz_profiles_own" ON public.quiz_profiles
      FOR ALL
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_profiles' AND policyname = 'quiz_profiles_admin'
  ) THEN
    CREATE POLICY "quiz_profiles_admin" ON public.quiz_profiles
      FOR ALL
      USING (public.is_admin());
  END IF;

  -- quiz_sessions: utilizador insere/lê as suas; admin lê tudo.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_sessions' AND policyname = 'quiz_sessions_own'
  ) THEN
    CREATE POLICY "quiz_sessions_own" ON public.quiz_sessions
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_sessions' AND policyname = 'quiz_sessions_admin'
  ) THEN
    CREATE POLICY "quiz_sessions_admin" ON public.quiz_sessions
      FOR ALL
      USING (public.is_admin());
  END IF;
END $$;

-- ── Função: criar quiz_profile ao registar ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.criar_quiz_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.quiz_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Reusa o trigger de criação de utilizador (idempotente via OR REPLACE acima).
-- Nota: o trigger on_auth_user_created já existe em 003_schema_definitivo.sql
-- para criar profiles. Adicionamos o quiz_profile via chamada na função existente
-- ou com trigger separado (mais seguro para não quebrar o existente).

DROP TRIGGER IF EXISTS on_quiz_user_created ON auth.users;
CREATE TRIGGER on_quiz_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_quiz_profile();

-- ── Retroativamente criar perfis para utilizadores existentes ──────────────

INSERT INTO public.quiz_profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
