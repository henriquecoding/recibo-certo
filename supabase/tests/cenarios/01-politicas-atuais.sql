-- ═══════════════════════════════════════════════════════════════════════
--  As políticas de `public.cenarios` COMO ESTÃO HOJE em produção.
--  ---------------------------------------------------------------------
--  Copiadas, verbatim, de `20260813_planos_operacionais.sql`. Vivem num
--  ficheiro à parte para se ver de relance que a migração desta entrega
--  NÃO lhes toca — o que ela faz é acrescentar colunas, tipos, um índice
--  e um trigger, e depois EXIGIR que estas quatro continuem lá.
--
--  Histórico existente continua legível e eliminável pelo dono durante a
--  janela de retenção. Criar ou alterar dados na nuvem exige Plus na
--  própria base, não apenas um botão escondido no browser.
-- ═══════════════════════════════════════════════════════════════════════

-- A 038 tirou ao admin o acesso aos dados fiscais de quem quer que seja.
DROP POLICY IF EXISTS "cenarios_admin" ON public.cenarios;
DROP POLICY IF EXISTS cenarios_own ON public.cenarios;
DROP POLICY IF EXISTS cenarios_select_own ON public.cenarios;
DROP POLICY IF EXISTS cenarios_insert_plus ON public.cenarios;
DROP POLICY IF EXISTS cenarios_update_plus ON public.cenarios;
DROP POLICY IF EXISTS cenarios_delete_own ON public.cenarios;

CREATE POLICY cenarios_select_own ON public.cenarios FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY cenarios_insert_plus ON public.cenarios FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT private.current_user_has_plus()));
CREATE POLICY cenarios_update_plus ON public.cenarios FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND (SELECT private.current_user_has_plus()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT private.current_user_has_plus()));
CREATE POLICY cenarios_delete_own ON public.cenarios FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
