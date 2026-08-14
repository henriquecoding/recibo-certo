-- 050_descarregar_com_autorizacao.sql
-- ═══════════════════════════════════════════════════════════════════════
--  UM FICHEIRO SÓ SE ABRE A QUEM PODE ABRI-LO AGORA
--  ---------------------------------------------------------------------
--  Os anexos abriam-se com um URL assinado de cinco minutos, pedido pelo
--  browser. O problema não é a duração — é que a assinatura sobrevive à
--  autorização que a produziu.
--
--  Terminar o acompanhamento fecha o acesso a tudo (é o que a 042 garante
--  na base de dados). Mas um URL assinado um segundo antes continua a
--  funcionar durante os cinco minutos seguintes, porque o serviço de
--  armazenamento não sabe nada de vínculos: só verifica se a assinatura
--  bate certo. O mesmo se aplica a um contabilista suspenso.
--
--  E há uma segunda metade, mais silenciosa: a administração podia ler os
--  documentos de candidatura sem deixar rasto nenhum. `admin_auditoria`
--  existe desde a 040 e registava aprovações e recusas; abrir a cédula
--  profissional de alguém não passava por lá.
--
--  Aqui ficam as duas perguntas que a rota de descarregamento faz antes de
--  entregar seja o que for.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Este caminho é meu de ler, agora? ────────────────────────────
--
-- Devolve o nome do ficheiro se a resposta for sim, e NULL se for não. A
-- pergunta é feita com a identidade de quem pede, e no instante do pedido
-- — não no instante em que alguma coisa foi assinada.
CREATE OR REPLACE FUNCTION public.anexo_legivel(p_caminho text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  u    uuid := auth.uid();
  v_r  record;
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  SELECT a.nome, a.tipo_mime, a.bytes, m.vinculo_id
    INTO v_r
    FROM public.contabilista_anexos a
    JOIN public.contabilista_mensagens m ON m.id = a.mensagem_id
   WHERE a.caminho = p_caminho;

  IF v_r.vinculo_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'inexistente');
  END IF;

  -- `parte_do_vinculo` recusa vínculos terminados E contabilistas que não
  -- estejam aprovados. É a mesma função que governa a leitura das
  -- mensagens: um anexo não pode ser mais acessível do que a conversa a
  -- que pertence.
  IF NOT public.parte_do_vinculo(v_r.vinculo_id, u) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_acesso');
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'nome', v_r.nome, 'tipo', v_r.tipo_mime, 'bytes', v_r.bytes);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anexo_legivel(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.anexo_legivel(text) TO authenticated, service_role;


-- ── 2. A administração lê, e fica escrito que leu ───────────────────
--
-- Um documento de candidatura é a cédula profissional de alguém, ou o seu
-- cartão de cidadão. Ler isso é um ato, e um ato de administração que não
-- deixa rasto é indistinguível de um que não aconteceu.
--
-- O registo é escrito ANTES de o ficheiro ser entregue, e na mesma
-- transação da verificação: não há como ler sem ficar registado.
CREATE OR REPLACE FUNCTION public.documento_legivel_por_admin(p_caminho text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  u     uuid := auth.uid();
  dono  uuid;
  email text;
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  -- A pasta é o id de quem enviou — é assim que a 042 organiza este balde.
  BEGIN
    dono := ((storage.foldername(p_caminho))[1])::uuid;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'caminho_invalido');
  END;

  -- O próprio lê o que é seu, sem ficar registado: ler os próprios
  -- documentos não é um ato de administração.
  IF dono = u THEN
    RETURN jsonb_build_object('ok', true, 'proprio', true);
  END IF;

  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_acesso');
  END IF;

  SELECT p.email INTO email FROM public.profiles p WHERE p.id = u;

  INSERT INTO public.admin_auditoria (ator_id, ator_email, acao, alvo_id, detalhe)
  VALUES (u, email, 'documento_candidatura_lido', dono,
          jsonb_build_object('caminho', p_caminho));

  RETURN jsonb_build_object('ok', true, 'proprio', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.documento_legivel_por_admin(text)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.documento_legivel_por_admin(text)
  TO authenticated, service_role;


-- ── 3. Fechar a porta do lado do armazenamento ──────────────────────
--
-- Com o descarregamento a passar por uma rota, o browser deixa de precisar
-- de ler o balde por si — e o que não é preciso não fica aberto. A leitura
-- direta sai; quem entrega é a chave de serviço, depois de perguntar.
--
-- A política de leitura própria dos DOCUMENTOS fica: a página da
-- candidatura mostra à pessoa o que ela enviou, e isso não passa por
-- rota nenhuma.
-- Não basta apagar a política: um DELETE precisa de ver a linha que apaga,
-- e sem SELECT nenhum quem tinha enviado um anexo deixava de o poder
-- remover. O que se estreita é o alcance — de «qualquer parte do vínculo
-- lê qualquer objeto dele» para «cada um vê o que enviou».
DROP POLICY IF EXISTS "anexos_parte_le" ON storage.objects;
DROP POLICY IF EXISTS "anexos_autor_ve_o_que_enviou" ON storage.objects;
CREATE POLICY "anexos_autor_ve_o_que_enviou" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contabilista-anexos'
    AND EXISTS (
      SELECT 1 FROM public.anexo_vagas v
       WHERE v.caminho = storage.objects.name
         AND v.pedida_por = (SELECT auth.uid())
    )
  );

COMMENT ON FUNCTION public.anexo_legivel(text) IS
  'A autorização é verificada no instante do descarregamento. Um URL assinado sobrevive ao acesso que o produziu: terminar o acompanhamento não o invalidava.';
COMMENT ON FUNCTION public.documento_legivel_por_admin(text) IS
  'Regista a leitura ANTES de entregar. Um ato de administração que não deixa rasto é indistinguível de um que não aconteceu.';
