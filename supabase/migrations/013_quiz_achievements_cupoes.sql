-- 013_quiz_achievements_cupoes.sql
-- Sistema de conquistas e cupões do Quiz Fiscal.
-- Regista sequências de quizzes perfeitos e gera cupões de 3 meses de Pro
-- quando o utilizador completa o desafio (5×Médio ou 3×Difícil, 10 perguntas,
-- 100% acerto). O cupão é um código único que o utilizador ativa na sua conta.
-- Idempotente — seguro correr múltiplas vezes.

-- ── Tabela: quiz_achievement_progress ─────────────────────────────────────
-- Rastreia a sequência atual do utilizador para cada caminho do desafio.

CREATE TABLE IF NOT EXISTS public.quiz_achievement_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caminho         text NOT NULL CHECK (caminho IN ('medio', 'dificil')),
  sequencia_atual integer NOT NULL DEFAULT 0,
  sequencia_meta  integer NOT NULL CHECK (sequencia_meta > 0),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, caminho)
);

CREATE INDEX IF NOT EXISTS quiz_achieve_user_idx
  ON public.quiz_achievement_progress(user_id);

-- ── Tabela: quiz_cupoes ───────────────────────────────────────────────────
-- Cupões gerados quando o desafio é completado.

CREATE TABLE IF NOT EXISTS public.quiz_cupoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo          text NOT NULL UNIQUE,
  caminho         text NOT NULL CHECK (caminho IN ('medio', 'dificil')),
  meses           integer NOT NULL DEFAULT 3,
  estado          text NOT NULL DEFAULT 'disponivel'
                  CHECK (estado IN ('disponivel', 'ativado', 'expirado')),
  stripe_coupon_id text,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  ativado_em      timestamptz,
  expira_em       timestamptz NOT NULL DEFAULT (now() + interval '90 days')
);

CREATE INDEX IF NOT EXISTS quiz_cupoes_user_idx
  ON public.quiz_cupoes(user_id);

CREATE INDEX IF NOT EXISTS quiz_cupoes_codigo_idx
  ON public.quiz_cupoes(codigo);

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.quiz_achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_cupoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- quiz_achievement_progress: o utilizador só vê e modifica o seu próprio progresso.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_achievement_progress' AND policyname = 'quiz_achieve_own_select'
  ) THEN
    CREATE POLICY "quiz_achieve_own_select" ON public.quiz_achievement_progress
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_achievement_progress' AND policyname = 'quiz_achieve_own_insert'
  ) THEN
    CREATE POLICY "quiz_achieve_own_insert" ON public.quiz_achievement_progress
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_achievement_progress' AND policyname = 'quiz_achieve_own_update'
  ) THEN
    CREATE POLICY "quiz_achieve_own_update" ON public.quiz_achievement_progress
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  -- quiz_cupoes: o utilizador só vê e ativa os seus cupões.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_cupoes' AND policyname = 'quiz_cupoes_own_select'
  ) THEN
    CREATE POLICY "quiz_cupoes_own_select" ON public.quiz_cupoes
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_cupoes' AND policyname = 'quiz_cupoes_own_insert'
  ) THEN
    CREATE POLICY "quiz_cupoes_own_insert" ON public.quiz_cupoes
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_cupoes' AND policyname = 'quiz_cupoes_own_update'
  ) THEN
    CREATE POLICY "quiz_cupoes_own_update" ON public.quiz_cupoes
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Admin pode ver tudo (para gestão).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_cupoes' AND policyname = 'quiz_cupoes_admin_select'
  ) THEN
    CREATE POLICY "quiz_cupoes_admin_select" ON public.quiz_cupoes
      FOR SELECT USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_achievement_progress' AND policyname = 'quiz_achieve_admin_select'
  ) THEN
    CREATE POLICY "quiz_achieve_admin_select" ON public.quiz_achievement_progress
      FOR SELECT USING (public.is_admin());
  END IF;
END $$;
