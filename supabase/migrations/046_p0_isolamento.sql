-- 046_p0_isolamento.sql
-- ═══════════════════════════════════════════════════════════════════════
--  TRÊS BURACOS QUE A AUDITORIA DA PR #102 ENCONTROU
--  ---------------------------------------------------------------------
--  Ver `docs/auditorias/pr102/auditoria-profunda-pr102/part-02.md`, §10.
--  Os três são reais e foram confirmados contra o código antes de mexer.
--
--  P0.2 — O VÍNCULO PODIA MUDAR DE CLIENTE.
--    O gatilho da migração 043 só apertava quando `auth.uid()` era o
--    CLIENTE. Sendo o contabilista, saía por `RETURN NEW` sem verificar
--    nada — e podia reescrever `cliente_id` mantendo o seu próprio
--    `contabilista_id`. Como as mensagens pendem do vínculo, isso levava
--    o histórico de uma pessoa para dentro da conversa de outra.
--
--  P0.3 — SUSPENDER NÃO TIRAVA NADA.
--    As políticas perguntavam «és o contabilista deste vínculo?» e nunca
--    «ainda estás aprovado?». Um contabilista suspenso perdia o painel
--    (que é interface) e mantinha a leitura por REST (que é o que
--    interessa). A suspensão era um aviso, não uma sanção.
--
--  P0.4 — O SNAPSHOT NÃO ERA SNAPSHOT.
--    «Marcar como vista» era um UPDATE genérico com `WITH CHECK` sobre o
--    estado. Nada impedia reescrever `conteudo`, `tipo` ou `cliente_id` no
--    mesmo comando. Uma partilha é uma cópia do que estava no ecrã; se
--    pode ser reescrita depois, deixa de provar o que provava.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── P0.3 · Uma pergunta só, feita em todo o lado ────────────────────
--
-- «Este utilizador é um contabilista que PODE trabalhar agora?» —
-- diferente de `e_contabilista_aprovado`, que responde sobre a conta e
-- não sobre o momento. Centralizada para não haver a política que se
-- esqueceu: uma regra repetida em oito sítios corrige-se em sete.
CREATE OR REPLACE FUNCTION public.contabilista_ativo(p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilistas c
    WHERE c.user_id = p_user AND c.estado = 'aprovado'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.contabilista_ativo(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.contabilista_ativo(uuid) TO authenticated;

-- As funções de vínculo passam a exigir que o contabilista esteja ativo.
-- Como são elas que sustentam as políticas de mensagens, anexos, partilhas
-- e agendamentos, apertar aqui aperta tudo o que delas depende.
CREATE OR REPLACE FUNCTION public.vinculo_ativo(p_contabilista uuid, p_cliente uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilista_vinculos v
    JOIN public.contabilistas c ON c.user_id = v.contabilista_id
    WHERE v.contabilista_id = p_contabilista
      AND v.cliente_id = p_cliente
      AND v.estado = 'ativo'
      AND c.estado = 'aprovado'
  );
$$;

CREATE OR REPLACE FUNCTION public.vinculo_nao_terminado(p_contabilista uuid, p_cliente uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilista_vinculos v
    JOIN public.contabilistas c ON c.user_id = v.contabilista_id
    WHERE v.contabilista_id = p_contabilista
      AND v.cliente_id = p_cliente
      AND v.estado IN ('ativo', 'pausado')
      AND c.estado = 'aprovado'
  );
$$;

CREATE OR REPLACE FUNCTION public.parte_do_vinculo(p_vinculo uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilista_vinculos v
    JOIN public.contabilistas c ON c.user_id = v.contabilista_id
    WHERE v.id = p_vinculo
      AND v.estado IN ('ativo', 'pausado')
      AND c.estado = 'aprovado'
      AND (v.cliente_id = p_user OR v.contabilista_id = p_user)
  );
$$;

CREATE OR REPLACE FUNCTION public.parte_do_vinculo_ativo(p_vinculo uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilista_vinculos v
    JOIN public.contabilistas c ON c.user_id = v.contabilista_id
    WHERE v.id = p_vinculo
      AND v.estado = 'ativo'
      AND c.estado = 'aprovado'
      AND (v.cliente_id = p_user OR v.contabilista_id = p_user)
  );
$$;

-- A leitura dos vínculos também: um suspenso deixa de ver a sua carteira.
DROP POLICY IF EXISTS "vinculos_partes_leem" ON public.contabilista_vinculos;
CREATE POLICY "vinculos_partes_leem" ON public.contabilista_vinculos
  FOR SELECT TO authenticated
  USING (
    cliente_id = (SELECT auth.uid())
    OR (contabilista_id = (SELECT auth.uid())
        AND public.contabilista_ativo((SELECT auth.uid())))
  );

-- E a escrita. Um suspenso não aceita clientes novos nem mexe nos que tem.
DROP POLICY IF EXISTS "vinculos_contabilista_decide" ON public.contabilista_vinculos;
CREATE POLICY "vinculos_contabilista_decide" ON public.contabilista_vinculos
  FOR UPDATE TO authenticated
  USING (
    contabilista_id = (SELECT auth.uid())
    AND public.contabilista_ativo((SELECT auth.uid()))
  )
  WITH CHECK (
    contabilista_id = (SELECT auth.uid())
    AND public.contabilista_ativo((SELECT auth.uid()))
  );

-- As tarefas são do contabilista, mas só enquanto ele o for.
DROP POLICY IF EXISTS "tarefas_dono" ON public.contabilista_tarefas;
CREATE POLICY "tarefas_dono" ON public.contabilista_tarefas
  FOR ALL TO authenticated
  USING (contabilista_id = (SELECT auth.uid()) AND public.contabilista_ativo((SELECT auth.uid())))
  WITH CHECK (contabilista_id = (SELECT auth.uid()) AND public.contabilista_ativo((SELECT auth.uid())));


-- ── P0.2 · O vínculo não muda de partes, e ponto ────────────────────
--
-- O gatilho passa a apertar SEMPRE que há utilizador autenticado, e não
-- só quando ele é o cliente. As colunas de identidade ficam imutáveis
-- para toda a gente menos para a chave de serviço.
CREATE OR REPLACE FUNCTION public.vinculos_tranca_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.estado = 'terminado' AND OLD.estado <> 'terminado' THEN
    NEW.nome_cliente := NULL;
    NEW.email_cliente := NULL;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    -- As duas partes e a origem são a identidade do vínculo. Deixá-las
    -- mudar era permitir que uma conversa inteira trocasse de dono.
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.contabilista_id IS DISTINCT FROM OLD.contabilista_id
       OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
       OR NEW.origem IS DISTINCT FROM OLD.origem
       OR NEW.criado_em IS DISTINCT FROM OLD.criado_em THEN
      RAISE EXCEPTION 'As partes de um vínculo não se alteram.';
    END IF;

    -- Terminado é terminado. Ressuscitar um vínculo devolveria acesso a
    -- tudo o que tinha sido fechado, sem passar por pedido nenhum.
    IF OLD.estado = 'terminado' AND NEW.estado <> 'terminado' THEN
      RAISE EXCEPTION 'Um acompanhamento terminado não se reabre; pede-se de novo.';
    END IF;

    IF auth.uid() = NEW.cliente_id AND auth.uid() <> NEW.contabilista_id THEN
      IF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado <> 'terminado' THEN
        RAISE EXCEPTION 'O cliente só pode terminar o acompanhamento.';
      END IF;
      -- O recado é de quem o escreveu; reescrevê-lo depois de aceite
      -- mudaria o que o contabilista leu quando decidiu.
      IF NEW.mensagem IS DISTINCT FROM OLD.mensagem THEN
        RAISE EXCEPTION 'O recado do pedido não se altera.';
      END IF;
    END IF;

    -- O contabilista decide o estado; não escreve pelo cliente.
    IF auth.uid() = NEW.contabilista_id THEN
      IF NEW.nome_cliente IS DISTINCT FROM OLD.nome_cliente
         OR NEW.email_cliente IS DISTINCT FROM OLD.email_cliente THEN
        -- Exceto quando é a limpeza automática do fecho, tratada acima.
        IF NOT (NEW.estado = 'terminado' AND NEW.nome_cliente IS NULL) THEN
          RAISE EXCEPTION 'O nome e o contacto são dados pelo cliente.';
        END IF;
      END IF;
    END IF;
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.vinculos_tranca_cliente() FROM anon, authenticated, public;


-- ── P0.4 · Uma partilha é uma cópia, e cópias não se reescrevem ─────
CREATE OR REPLACE FUNCTION public.partilhas_imutaveis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  -- Tudo o que descreve O QUE foi enviado, e A QUEM, é imutável. O que
  -- pode mudar é só o percurso da partilha: vista, revogada.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.contabilista_id IS DISTINCT FROM OLD.contabilista_id
     OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
     OR NEW.tipo IS DISTINCT FROM OLD.tipo
     OR NEW.titulo IS DISTINCT FROM OLD.titulo
     OR NEW.conteudo IS DISTINCT FROM OLD.conteudo
     OR NEW.nota_cliente IS DISTINCT FROM OLD.nota_cliente
     OR NEW.consentimento_versao IS DISTINCT FROM OLD.consentimento_versao
     OR NEW.consentimento_em IS DISTINCT FROM OLD.consentimento_em
     OR NEW.criado_em IS DISTINCT FROM OLD.criado_em THEN
    RAISE EXCEPTION 'O conteúdo de uma partilha não se altera depois de enviada.';
  END IF;

  -- Revogar é definitivo. Sem isto, o contabilista que perdeu o acesso
  -- por revogação podia recuperá-lo pondo o estado de volta em «vista».
  IF OLD.estado = 'revogada' AND NEW.estado <> 'revogada' THEN
    RAISE EXCEPTION 'Uma partilha revogada não volta atrás.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.partilhas_imutaveis() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS partilhas_imutabilidade ON public.partilhas;
CREATE TRIGGER partilhas_imutabilidade
  BEFORE UPDATE ON public.partilhas
  FOR EACH ROW EXECUTE FUNCTION public.partilhas_imutaveis();


-- ── P0.6 (parte) · A chave de serviço precisa de poder carimbar ─────
-- `REVOKE … FROM public` tirou o direito a toda a gente, incluindo ao
-- papel que o servidor usa. A função existia e ninguém a podia chamar.
GRANT EXECUTE ON FUNCTION public.carimbar_consulta(uuid, text) TO service_role;


COMMENT ON FUNCTION public.contabilista_ativo(uuid) IS
  'Este utilizador é um contabilista que pode trabalhar AGORA. Diferente de e_contabilista_aprovado: responde sobre o momento, não sobre a conta. Usada por todas as políticas para que suspender signifique mesmo alguma coisa.';
COMMENT ON FUNCTION public.partilhas_imutaveis() IS
  'Uma partilha é uma cópia do que estava no ecrã. Só o percurso muda (vista, revogada); conteúdo, destinatário e consentimento não. Revogar é definitivo.';
