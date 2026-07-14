-- ================================================================
-- ReciboCerto — Migration 021: Limites anti-spam em inserts anónimos
-- Cola no Supabase → SQL Editor e clica RUN.
-- Idempotente: seguro para correr múltiplas vezes.
-- ================================================================
-- Porquê:
--   email_waitlist e quiz_question_reports aceitam INSERT anónimo (por design).
--   Sem rate-limit/captcha (que exigem mover os inserts para trás de uma rota de
--   API — trabalho futuro), a mitigação achievable a nível de BD é limitar o
--   TAMANHO do payload, cortando floods de texto gigante. CHECKs de comprimento
--   são validados no servidor e não são contornáveis pelo cliente.
-- ================================================================

-- ── email_waitlist ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_waitlist_email_len') THEN
    ALTER TABLE public.email_waitlist
      ADD CONSTRAINT email_waitlist_email_len CHECK (char_length(email) BETWEEN 3 AND 254);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_waitlist_fonte_len') THEN
    ALTER TABLE public.email_waitlist
      ADD CONSTRAINT email_waitlist_fonte_len CHECK (fonte IS NULL OR char_length(fonte) <= 60);
  END IF;
END $$;

-- ── quiz_question_reports ──────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_reports_question_id_len') THEN
    ALTER TABLE public.quiz_question_reports
      ADD CONSTRAINT quiz_reports_question_id_len CHECK (char_length(question_id) BETWEEN 1 AND 120);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_reports_pergunta_len') THEN
    ALTER TABLE public.quiz_question_reports
      ADD CONSTRAINT quiz_reports_pergunta_len CHECK (pergunta_texto IS NULL OR char_length(pergunta_texto) <= 2000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_reports_categoria_len') THEN
    ALTER TABLE public.quiz_question_reports
      ADD CONSTRAINT quiz_reports_categoria_len CHECK (categoria IS NULL OR char_length(categoria) <= 120);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_reports_descricao_len') THEN
    ALTER TABLE public.quiz_question_reports
      ADD CONSTRAINT quiz_reports_descricao_len CHECK (descricao IS NULL OR char_length(descricao) <= 2000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_reports_xp_max') THEN
    ALTER TABLE public.quiz_question_reports
      ADD CONSTRAINT quiz_reports_xp_max CHECK (xp_atribuido BETWEEN 0 AND 1000);
  END IF;
END $$;
