-- =====================================================================
--  O CONTRATO PÚBLICO DE `contabilistas` PASSA A SER UMA VIEW
--  ---------------------------------------------------------------------
--  Hoje o diretório lê a TABELA, através de uma política que dá a linha
--  inteira a `anon`:
--
--    CREATE POLICY contabilistas_diretorio_publico ON public.contabilistas
--      FOR SELECT TO anon, authenticated USING (estado = 'aprovado');
--
--  A política está certa na intenção — o diretório é uma página indexável
--  e tem de ser legível sem sessão. O que está errado é o alcance: ela não
--  escolhe colunas, escolhe linhas. Duas consequências, uma de hoje e uma
--  de amanhã:
--
--   · HOJE saem colunas que nenhum ecrã mostra e que ninguém decidiu
--     publicar. `linkedin_subject` é o `sub` do OIDC do LinkedIn — um
--     identificador de correlação de identidade. `pedido_id` liga a ficha
--     pública à candidatura. `telefone` não é renderizado em lado nenhum
--     e sai na mesma a quem peça a linha.
--
--   · AMANHÃ, qualquer coluna nova em `contabilistas` nasce pública. É o
--     problema estrutural, e é o que interessa: a Progressão e Comissão
--     desenhada para esta plataforma tem XP, patamar comprado e créditos.
--     Uma dessas colunas aqui seria a comissão de todos os contabilistas
--     à vista, sem ninguém escrever uma linha de frontend.
--
--  Esta migração cria o contrato explícito e NÃO fecha nada: a política
--  antiga continua de pé, e por isso nada quebra. O corte da política é
--  um passo separado e deliberado, depois de o frontend passar a ler a
--  view — ver o comentário no fim.
--
--  O que a view inclui é o que o produto MOSTRA hoje, mais os campos que
--  a especificação (§149) declara públicos. O que ela exclui é o que
--  ninguém mostra: identificadores internos e o telefone, que passa a
--  sair por função, a quem tem vínculo.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
--  1. A view: as colunas ditas uma a uma
-- ---------------------------------------------------------------------
--  `security_invoker = false` é deliberado: a view corre com os
--  privilégios do dono e continua a devolver as linhas aprovadas mesmo
--  depois de a política pública da tabela ser retirada. É este o
--  mecanismo que a substitui.
CREATE OR REPLACE VIEW public.contabilistas_publico
WITH (security_invoker = false) AS
SELECT
  c.user_id,
  c.slug,
  c.nome,
  c.occ,
  c.bio,
  c.distrito,
  c.concelho,
  c.especialidades,
  c.modalidades,
  -- O email é público por decisão de produto: o editor de perfil diz, na
  -- própria página, que é isto que aparece no diretório. Está aqui porque
  -- foi escolhido, não por arrastamento.
  c.email_contacto,
  c.website,
  c.aceita_novos_clientes,
  c.preco_consulta_cents,
  c.duracao_consulta_min,
  c.fidelidade_ativa,
  c.fidelidade_meta,
  c.fidelidade_desconto_pct,
  c.criado_em
FROM public.contabilistas c
WHERE c.estado = 'aprovado';

COMMENT ON VIEW public.contabilistas_publico IS
  'O contrato público do diretório e do perfil público. Acrescentar uma coluna aqui é uma decisão; acrescentar uma coluna a `contabilistas` deixa de ser. Não expõe telefone (ver contacto_do_contabilista), linkedin_subject, pedido_id nem estado.';

GRANT SELECT ON public.contabilistas_publico TO anon, authenticated;

-- ---------------------------------------------------------------------
--  2. O telefone sai por função, a quem tem relação
-- ---------------------------------------------------------------------
--  Nenhum ecrã público mostra o telefone hoje. Deixá-lo sair na linha
--  seria publicá-lo sem nunca o ter apresentado — o pior dos dois mundos:
--  invisível para quem o procura e disponível para quem o recolhe em
--  massa.
CREATE OR REPLACE FUNCTION public.contacto_do_contabilista(p_contabilista uuid)
RETURNS TABLE (email_contacto text, telefone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.email_contacto, c.telefone
    FROM public.contabilistas c
   WHERE c.user_id = p_contabilista
     AND c.estado = 'aprovado'
     AND (
          c.user_id = (SELECT auth.uid())
       OR public.vinculo_nao_terminado(p_contabilista, (SELECT auth.uid()))
     );
$$;

REVOKE EXECUTE ON FUNCTION public.contacto_do_contabilista(uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.contacto_do_contabilista(uuid) TO authenticated;

COMMENT ON FUNCTION public.contacto_do_contabilista(uuid) IS
  'Email e telefone do contabilista, só para o próprio e para quem tem vínculo vivo. O email também é público pela view; o telefone só sai por aqui.';

-- ---------------------------------------------------------------------
--  3. A guarda: impedir que a tabela volte a ser o contrato
-- ---------------------------------------------------------------------
--  Sem isto, a correção dura até alguém precisar de um campo novo no
--  diretório e recriar a política aberta — que é a solução óbvia para
--  quem não leu este ficheiro.
CREATE OR REPLACE FUNCTION public.assert_contrato_publico_contabilistas()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_politicas text[];
BEGIN
  -- `pg_policies.roles` é name[], não texto.
  SELECT array_agg(policyname ORDER BY policyname) INTO v_politicas
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'contabilistas'
     AND cmd IN ('SELECT', 'ALL')
     AND ('anon'::name = ANY (roles) OR 'public'::name = ANY (roles));

  IF v_politicas IS NOT NULL THEN
    RAISE EXCEPTION
      'contabilistas tem política de SELECT aberta a anon (%). O contrato público é a view contabilistas_publico.',
      array_to_string(v_politicas, ', ');
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_contrato_publico_contabilistas() IS
  'Falha enquanto existir uma política de SELECT aberta a anon em contabilistas. Hoje FALHA de propósito — a política antiga ainda está de pé. Passa a verde com a migração que a retira, depois de o frontend ler a view.';

COMMIT;

-- =====================================================================
--  O PASSO SEGUINTE, QUANDO O FRONTEND JÁ LER A VIEW
--  ---------------------------------------------------------------------
--  Não está aqui de propósito: é a única parte que QUEBRA leituras, e
--  quebrá-las no mesmo deploy que introduz a alternativa é pedir um
--  diretório vazio em produção. Aplicar só depois de confirmar que
--  `listarContabilistas` e `obterContabilistaPorSlug` já leem
--  `contabilistas_publico`:
--
--    DROP POLICY IF EXISTS "contabilistas_diretorio_publico"
--      ON public.contabilistas;
--    REVOKE SELECT ON public.contabilistas FROM anon;
--    SELECT public.assert_contrato_publico_contabilistas();
--
--  A partir daí, o próprio e a administração continuam a ler a tabela
--  pelas políticas que já existem (`contabilistas_proprio_le`), e o
--  público lê a view.
-- =====================================================================
