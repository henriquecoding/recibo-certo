-- 018_site_feedback.sql
-- Central de reportes, sugestões e dúvidas de TODO o site (não só do quiz).
-- Qualquer pessoa (com ou sem conta) pode enviar; só o admin lê e gere.
-- Quando o admin valida um feedback concreto e útil, é creditado XP ao autor
-- (se tinha sessão) no perfil do Quiz Fiscal — função SECURITY DEFINER abaixo.
-- Idempotente — seguro correr múltiplas vezes.

-- ── Tabela: site_feedback ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo          text NOT NULL
                CHECK (tipo IN ('sugestao', 'erro', 'duvida', 'mensagem')),
  mensagem      text NOT NULL CHECK (char_length(mensagem) BETWEEN 1 AND 4000),
  assunto       text,                                  -- título curto opcional
  area          text,                                  -- página/contexto (ex.: "/ferramentas/simulador-irs")
  nome          text,                                  -- opcional (para anónimos)
  email         text,                                  -- opcional (para resposta)
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  estado        text NOT NULL DEFAULT 'novo'
                CHECK (estado IN ('novo', 'em_analise', 'valido', 'resolvido', 'rejeitado')),
  xp_atribuido  integer NOT NULL DEFAULT 0 CHECK (xp_atribuido >= 0),
  nota_admin    text,                                  -- notas internas da equipa
  criado_em     timestamptz NOT NULL DEFAULT now(),
  resolvido_em  timestamptz
);

-- ── Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS site_feedback_criado_idx
  ON public.site_feedback(criado_em DESC);

CREATE INDEX IF NOT EXISTS site_feedback_estado_idx
  ON public.site_feedback(estado);

CREATE INDEX IF NOT EXISTS site_feedback_tipo_idx
  ON public.site_feedback(tipo);

CREATE INDEX IF NOT EXISTS site_feedback_user_idx
  ON public.site_feedback(user_id);

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.site_feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Qualquer pessoa pode enviar (mesmo sem conta). Quem tem sessão só pode
  -- atribuir o feedback a si próprio (evita falsificar autoria/XP).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'site_feedback' AND policyname = 'site_feedback_insert'
  ) THEN
    CREATE POLICY "site_feedback_insert" ON public.site_feedback
      FOR INSERT
      WITH CHECK (user_id IS NULL OR user_id = auth.uid());
  END IF;

  -- Só o admin lê.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'site_feedback' AND policyname = 'site_feedback_admin_select'
  ) THEN
    CREATE POLICY "site_feedback_admin_select" ON public.site_feedback
      FOR SELECT USING (public.is_admin());
  END IF;

  -- Só o admin atualiza (estado/notas) e elimina.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'site_feedback' AND policyname = 'site_feedback_admin_update'
  ) THEN
    CREATE POLICY "site_feedback_admin_update" ON public.site_feedback
      FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'site_feedback' AND policyname = 'site_feedback_admin_delete'
  ) THEN
    CREATE POLICY "site_feedback_admin_delete" ON public.site_feedback
      FOR DELETE USING (public.is_admin());
  END IF;
END $$;

-- ── Função: validar feedback e creditar XP ao autor ────────────────────────
-- Só o admin pode chamar. Marca o feedback como válido, regista o XP atribuído
-- e credita esse XP no perfil de Quiz do autor (se houver autor). Idempotente:
-- só credita enquanto xp_atribuido ainda for 0 (evita creditar duas vezes).

CREATE OR REPLACE FUNCTION public.validar_feedback_xp(p_id uuid, p_xp integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_xp_atual integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem validar feedback.';
  END IF;
  IF p_xp IS NULL OR p_xp < 0 THEN
    RAISE EXCEPTION 'Valor de XP inválido.';
  END IF;

  SELECT user_id, xp_atribuido INTO v_user, v_xp_atual
  FROM public.site_feedback WHERE id = p_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feedback não encontrado.';
  END IF;

  UPDATE public.site_feedback
  SET estado = 'valido',
      xp_atribuido = p_xp,
      resolvido_em = now()
  WHERE id = p_id;

  -- Credita o XP no perfil de Quiz do autor (só uma vez, e só se houver autor).
  IF v_user IS NOT NULL AND COALESCE(v_xp_atual, 0) = 0 AND p_xp > 0 THEN
    INSERT INTO public.quiz_profiles (id, xp)
    VALUES (v_user, p_xp)
    ON CONFLICT (id) DO UPDATE
      SET xp = quiz_profiles.xp + p_xp,
          atualizado_em = now();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_feedback_xp(uuid, integer) TO authenticated;

-- ── Segurança: trigger anti-código (defesa em profundidade no servidor) ──────
-- Mesmo que alguém contorne a app e chame a API diretamente, a BD remove tags
-- HTML/scripts dos campos de texto antes de gravar. A app nunca renderiza isto
-- como HTML, por isso o conteúdo nunca é executável — mas limpamos à mesma.

CREATE OR REPLACE FUNCTION public.sanitizar_site_feedback()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.mensagem := regexp_replace(COALESCE(NEW.mensagem, ''), '</?[A-Za-z!][^>]*>', '', 'g');
  IF NEW.assunto IS NOT NULL THEN
    NEW.assunto := regexp_replace(NEW.assunto, '</?[A-Za-z!][^>]*>', '', 'g');
  END IF;
  IF NEW.nome IS NOT NULL THEN
    NEW.nome := regexp_replace(NEW.nome, '</?[A-Za-z!][^>]*>', '', 'g');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitizar_site_feedback ON public.site_feedback;
CREATE TRIGGER trg_sanitizar_site_feedback
  BEFORE INSERT ON public.site_feedback
  FOR EACH ROW EXECUTE FUNCTION public.sanitizar_site_feedback();
