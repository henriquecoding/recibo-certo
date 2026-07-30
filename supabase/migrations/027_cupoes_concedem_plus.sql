-- ═══════════════════════════════════════════════════════════════════════
--  CUPÕES DO QUIZ: um prémio que se pode entregar e que ACABA
--  ---------------------------------------------------------------------
--  `/api/quiz/cupao` escreve em `subscriptions` com
--  `{ onConflict: "user_id" }`. Não existe constraint única em `user_id` —
--  há só um índice normal (005) —, e o PostgreSQL exige uma restrição única
--  ou de exclusão que corresponda à especificação do ON CONFLICT. Logo TODA
--  a ativação de cupão falhava com «no unique or exclusion constraint
--  matching the ON CONFLICT specification», o utilizador recebia 500, e os
--  meses de Plus que ganhou eram inalcançáveis.
--
--  ── A parte que quase passou em claro ────────────────────────────────
--  Dar um alvo ao ON CONFLICT resolvia o 500 e criava um problema pior.
--  Todos os leitores de `subscriptions` decidem o plano por `status IN
--  ('active','trialing','past_due')` — nenhum olha para uma data de fim. No
--  Stripe e no Lemon Squeezy isso está certo, porque é o webhook do provedor
--  que muda `status` quando a subscrição termina de facto.
--
--  Um cupão não tem provedor. Não há webhook, não há pg_cron neste projeto,
--  não há nada que volte a tocar na linha. Uma linha de cupão escrita com
--  `status = 'active'` seria Plus PARA SEMPRE — três meses prometidos, uma
--  vida inteira entregue.
--
--  ── Desenho ──────────────────────────────────────────────────────────
--  1. `cupao_id` único é o alvo do ON CONFLICT. Escolhido em vez de
--     `user_id` porque é a chave natural: quem tem uma subscrição Stripe e
--     ganha um cupão fica com duas linhas legítimas em vez de perder uma, e
--     ativar o MESMO cupão duas vezes não pode criar duas concessões
--     (idempotência pela chave, não pela ordem das escritas).
--
--  2. `concessao_termina_em` é a data em que uma concessão sem provedor
--     deixa de valer. O `CHECK` garante que uma linha de cupão a tem de
--     trazer: sem isto, esquecer o campo no código voltava a produzir Plus
--     eterno, e em silêncio.
--
--  3. A validade passa a estar na POLICY, não só no código. É o único sítio
--     por onde todos os leitores do cliente passam — e há quatro. Corrigir
--     quatro consultas à mão é uma correção que a quinta consulta desfaz;
--     aqui a linha expirada simplesmente deixa de existir para o cliente.
--     (Quem lê com `service_role` ignora a RLS e tem de filtrar à mão — ver
--     `plusAtivoFiltro()` em `src/lib/plus/concessao.ts`.)
--
--  Segue o padrão que a 008 abriu para o Lemon Squeezy: cada origem tem a
--  sua coluna de identificação e a sua constraint única, e `subscriptions`
--  continua a ser a única resposta à pergunta «esta pessoa tem Plus?».
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Identificação da origem ─────────────────────────────────────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cupao_id             uuid REFERENCES public.quiz_cupoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS concessao_termina_em timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_cupao_id_unique'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_cupao_id_unique UNIQUE (cupao_id);
  END IF;
END$$;

-- ── 2. Uma concessão de cupão tem SEMPRE fim ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_cupao_tem_fim'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_cupao_tem_fim CHECK (
        cupao_id IS NULL OR concessao_termina_em IS NOT NULL
      );
  END IF;
END$$;

-- ── 3. A linha expirada deixa de ser visível ao próprio ────────────────
-- Mesma condição de sempre (`auth.uid() = user_id`), mais a validade. Uma
-- subscrição de provedor tem `concessao_termina_em` NULL e não é afetada.
DROP POLICY IF EXISTS "utilizador_ve_subscricoes" ON public.subscriptions;
CREATE POLICY "utilizador_ve_subscricoes" ON public.subscriptions
  FOR SELECT USING (
    auth.uid() = user_id
    AND (concessao_termina_em IS NULL OR concessao_termina_em > now())
  );

-- O admin continua a ver tudo, incluindo as concessões já expiradas: para
-- apoio ao cliente, o histórico é precisamente o que interessa.

-- ── 4. Índices ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS subscriptions_cupao_idx
  ON public.subscriptions (cupao_id)
  WHERE cupao_id IS NOT NULL;

-- Suporta o filtro de validade nas leituras com service_role.
CREATE INDEX IF NOT EXISTS subscriptions_concessao_fim_idx
  ON public.subscriptions (concessao_termina_em)
  WHERE concessao_termina_em IS NOT NULL;

COMMENT ON COLUMN public.subscriptions.cupao_id IS
  'Cupão do Quiz que originou esta concessão. NULL para subscrições de provedor (Stripe/LS). Único: ativar o mesmo cupão duas vezes não cria duas concessões.';

COMMENT ON COLUMN public.subscriptions.concessao_termina_em IS
  'Fim de uma concessão SEM provedor (cupão). NULL nas subscrições Stripe/LS, onde é o webhook que muda o status. Enquanto não houver cron, é esta data — via policy e via plusAtivoFiltro() — que faz a concessão acabar.';
