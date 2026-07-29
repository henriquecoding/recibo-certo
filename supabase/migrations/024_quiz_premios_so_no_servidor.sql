-- ═══════════════════════════════════════════════════════════════════════
--  QUIZ — os prémios passam a ser escritos só pelo servidor
--  ---------------------------------------------------------------------
--  A migração 013 deu ao role `authenticated` INSERT e UPDATE sobre
--  `quiz_cupoes` e `quiz_achievement_progress`, com `WITH CHECK
--  (auth.uid() = user_id)` como única condição. Isso valida QUEM escreve,
--  não O QUE é escrito: qualquer utilizador autenticado podia, pela consola
--  do browser, inserir um cupão de 3 meses de Pro para si próprio, ou pôr
--  `sequencia_atual` no valor que quisesse.
--
--  Não há forma de resolver isto com uma policy mais apertada, porque a
--  legitimidade do prémio depende das RESPOSTAS DADAS — informação que a
--  base de dados não tem. Por isso a verificação passou para
--  `/api/quiz/sessao`, que recalcula os acertos a partir do banco de
--  perguntas e escreve com `service_role`.
--
--  Aqui fecha-se a porta que resta: o cliente mantém a LEITURA (precisa dela
--  para mostrar o progresso e a lista de cupões) e perde a escrita.
--
--  A tabela `subscriptions` NÃO é aberta ao cliente — era essa a "correção
--  óbvia" que teria transformado o problema em Pro grátis para toda a gente.
--  Continua a ser escrita apenas por `service_role`, agora a partir de
--  `/api/quiz/cupao`.
-- ═══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- ── quiz_cupoes: só leitura para o utilizador ────────────────────────
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_cupoes' AND policyname = 'quiz_cupoes_own_insert'
  ) THEN
    DROP POLICY "quiz_cupoes_own_insert" ON public.quiz_cupoes;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_cupoes' AND policyname = 'quiz_cupoes_own_update'
  ) THEN
    DROP POLICY "quiz_cupoes_own_update" ON public.quiz_cupoes;
  END IF;

  -- ── quiz_achievement_progress: só leitura para o utilizador ──────────
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_achievement_progress' AND policyname = 'quiz_achieve_own_insert'
  ) THEN
    DROP POLICY "quiz_achieve_own_insert" ON public.quiz_achievement_progress;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_achievement_progress' AND policyname = 'quiz_achieve_own_update'
  ) THEN
    DROP POLICY "quiz_achieve_own_update" ON public.quiz_achievement_progress;
  END IF;
END $$;

-- Revogação ao nível dos privilégios, além das policies: mesmo que uma
-- policy volte a aparecer por engano numa migração futura, o role não tem
-- o privilégio para a exercer.
REVOKE INSERT, UPDATE, DELETE ON public.quiz_cupoes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.quiz_achievement_progress FROM authenticated;

-- A leitura mantém-se: a interface mostra o progresso e os cupões do próprio.
GRANT SELECT ON public.quiz_cupoes TO authenticated;
GRANT SELECT ON public.quiz_achievement_progress TO authenticated;

COMMENT ON TABLE public.quiz_cupoes IS
  'Cupões de Pro ganhos no Quiz Fiscal. ESCRITA EXCLUSIVA DO SERVIDOR (service_role, via /api/quiz/sessao e /api/quiz/cupao): a legitimidade do prémio depende das respostas dadas, que a base de dados não conhece.';

COMMENT ON TABLE public.quiz_achievement_progress IS
  'Sequência de sessões perfeitas por caminho de desafio. ESCRITA EXCLUSIVA DO SERVIDOR (service_role, via /api/quiz/sessao), que recalcula os acertos a partir do banco de perguntas.';
