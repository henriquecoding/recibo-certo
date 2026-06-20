-- 012_quiz_reportes.sql
-- Sistema de reporte de erros nas perguntas do Quiz Fiscal.
-- Qualquer pessoa (com ou sem conta) pode reportar uma pergunta; quem descreve
-- o erro ganha XP (atribuído do lado do cliente sobre quiz_profiles). Só o admin
-- lê e gere os reportes, na área administrativa.
-- Idempotente — seguro correr múltiplas vezes.

-- ── Tabela: quiz_question_reports ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quiz_question_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     text NOT NULL,                       -- id da pergunta (ex.: "dep-irs-c1")
  pergunta_texto  text,                                -- snapshot do enunciado (contexto p/ admin)
  categoria       text,                                -- categoria da pergunta
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  descricao       text,                                -- descrição opcional do erro
  xp_atribuido    integer NOT NULL DEFAULT 0 CHECK (xp_atribuido >= 0),
  estado          text NOT NULL DEFAULT 'novo'
                  CHECK (estado IN ('novo', 'em_analise', 'resolvido', 'rejeitado')),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  resolvido_em    timestamptz
);

-- ── Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS quiz_reports_criado_idx
  ON public.quiz_question_reports(criado_em DESC);

CREATE INDEX IF NOT EXISTS quiz_reports_estado_idx
  ON public.quiz_question_reports(estado);

CREATE INDEX IF NOT EXISTS quiz_reports_question_idx
  ON public.quiz_question_reports(question_id);

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.quiz_question_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Qualquer pessoa pode reportar (mesmo sem conta). Quem tem sessão só pode
  -- atribuir o reporte a si próprio (evita falsificar autoria).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_question_reports' AND policyname = 'quiz_reports_insert'
  ) THEN
    CREATE POLICY "quiz_reports_insert" ON public.quiz_question_reports
      FOR INSERT
      WITH CHECK (user_id IS NULL OR user_id = auth.uid());
  END IF;

  -- Só o admin lê os reportes.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_question_reports' AND policyname = 'quiz_reports_admin_select'
  ) THEN
    CREATE POLICY "quiz_reports_admin_select" ON public.quiz_question_reports
      FOR SELECT USING (public.is_admin());
  END IF;

  -- Só o admin atualiza (estado) e elimina.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_question_reports' AND policyname = 'quiz_reports_admin_update'
  ) THEN
    CREATE POLICY "quiz_reports_admin_update" ON public.quiz_question_reports
      FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_question_reports' AND policyname = 'quiz_reports_admin_delete'
  ) THEN
    CREATE POLICY "quiz_reports_admin_delete" ON public.quiz_question_reports
      FOR DELETE USING (public.is_admin());
  END IF;
END $$;
