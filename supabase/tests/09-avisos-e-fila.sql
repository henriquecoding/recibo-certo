\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

-- Os avisos deixaram de vir de um pedido do browser (migração 047). Nascem
-- da mesma transação que escreve o facto — por dentro das RPCs, ou por
-- gatilho quando o facto é um INSERT. Estas asserções provam as duas metades:
-- não há aviso sem facto, e não há facto sem aviso.

\echo ''
\echo '── 34. Cenário dos avisos ──────────────────────────────────────'
RESET ROLE;
SELECT t.sair();

INSERT INTO auth.users (id, email) VALUES
  ('a1a1a1a1-0000-0000-0000-00000000000a','avisos-cliente@exemplo.pt'),
  ('b1b1b1b1-0000-0000-0000-00000000000b','avisos-terceiro@exemplo.pt')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, email, role) VALUES
  ('a1a1a1a1-0000-0000-0000-00000000000a','avisos-cliente@exemplo.pt','user'),
  ('b1b1b1b1-0000-0000-0000-00000000000b','avisos-terceiro@exemplo.pt','user')
ON CONFLICT (id) DO NOTHING;

-- Uma folha limpa: o que se conta a seguir é o que estes testes causaram.
DELETE FROM public.notificacoes;

SET ROLE authenticated;

\echo ''
\echo '── 35. O pedido de vínculo avisa sozinho ───────────────────────'
SELECT t.entrar('a1a1a1a1-0000-0000-0000-00000000000a');
SELECT t.permite($$INSERT INTO public.contabilista_vinculos
  (contabilista_id, cliente_id, origem, nome_cliente)
  VALUES ('11111111-1111-1111-1111-111111111111',
          'a1a1a1a1-0000-0000-0000-00000000000a','cliente','Marta')$$,
  'cliente pede vínculo');

-- Quem escreveu não recebe aviso nenhum: o sino é do outro lado.
SELECT t.conta($$SELECT count(*) FROM public.notificacoes
  WHERE user_id='a1a1a1a1-0000-0000-0000-00000000000a'$$, 0,
  'quem pediu não se avisa a si próprio');

SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.notificacoes
  WHERE tipo='vinculo_pedido' AND titulo='Marta quer ser teu cliente'$$, 1,
  'o contabilista foi avisado, e pelo nome que a pessoa deu');

-- O aviso trata a pessoa pelo nome que ELA deu, e nunca pelo email.
SELECT t.conta($$SELECT count(*) FROM public.notificacoes
  WHERE titulo LIKE '%@%' OR coalesce(corpo,'') LIKE '%@%'$$, 0,
  'nenhum aviso deixa escapar um email');

\echo ''
\echo '── 36. Aceitar avisa o cliente ─────────────────────────────────'
SELECT t.rpc_ok($$SELECT public.decidir_vinculo(
    (SELECT id FROM public.contabilista_vinculos
      WHERE cliente_id='a1a1a1a1-0000-0000-0000-00000000000a' LIMIT 1), 'aceitar')$$,
  'contabilista aceita');
SELECT t.entrar('a1a1a1a1-0000-0000-0000-00000000000a');
SELECT t.conta($$SELECT count(*) FROM public.notificacoes
  WHERE tipo='vinculo_aceite'$$, 1, 'o cliente soube que foi aceite');

\echo ''
\echo '── 37. A mensagem avisa quem não a escreveu ────────────────────'
SELECT t.permite($$INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo)
  VALUES ((SELECT id FROM public.contabilista_vinculos
            WHERE cliente_id='a1a1a1a1-0000-0000-0000-00000000000a' LIMIT 1),
          'a1a1a1a1-0000-0000-0000-00000000000a','Boa tarde.')$$,
  'cliente escreve');
SELECT t.conta($$SELECT count(*) FROM public.notificacoes WHERE tipo='mensagem'$$, 0,
  'quem escreveu não recebe o aviso da sua própria mensagem');
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.notificacoes
  WHERE tipo='mensagem' AND titulo='Mensagem de Marta'$$, 1,
  'o contabilista foi avisado da mensagem');

\echo ''
\echo '── 38. A simulação enviada avisa quem a recebe ─────────────────'
SELECT t.entrar('a1a1a1a1-0000-0000-0000-00000000000a');
SELECT t.permite($$INSERT INTO public.partilhas
  (contabilista_id, cliente_id, tipo, titulo, conteudo, consentimento_versao)
  VALUES ('11111111-1111-1111-1111-111111111111',
          'a1a1a1a1-0000-0000-0000-00000000000a','simulador_irs','IRS 2026',
          '{"ano":2026}'::jsonb,'2026-08-1')$$, 'cliente envia simulação');
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.notificacoes
  WHERE tipo='partilha_recebida'$$, 1, 'o contabilista foi avisado da simulação');

\echo ''
\echo '── 39. Ninguém escreve no sino de outra pessoa ─────────────────'
SELECT t.entrar('b1b1b1b1-0000-0000-0000-00000000000b');
SELECT t.recusa($$INSERT INTO public.notificacoes (user_id, tipo, titulo)
  VALUES ('a1a1a1a1-0000-0000-0000-00000000000a','mensagem','Clica aqui')$$,
  'escrever uma notificação na conta de outra pessoa');
SELECT t.recusa($$INSERT INTO public.notificacoes (user_id, tipo, titulo)
  VALUES ('b1b1b1b1-0000-0000-0000-00000000000b','mensagem','Aviso meu')$$,
  'escrever uma notificação na sua própria conta');

-- As primitivas dos avisos estão fechadas: se `authenticated` lhes chegasse,
-- o gatilho deixava de ser a única porta.
SELECT t.recusa($$SELECT public.avisar_utilizador(
  'a1a1a1a1-0000-0000-0000-00000000000a','mensagem','Falso','','/dashboard')$$,
  'chamar avisar_utilizador à mão');
SELECT t.recusa($$SELECT public.avisar_parte(
  (SELECT id FROM public.contabilista_vinculos LIMIT 1),
  '11111111-1111-1111-1111-111111111111','mensagem','Falso','','/dashboard')$$,
  'chamar avisar_parte à mão');
SELECT t.recusa($$SELECT public.tratamento_do_cliente(
  (SELECT id FROM public.contabilista_vinculos LIMIT 1))$$,
  'espreitar o nome de um cliente alheio por função');
SELECT t.recusa($$SELECT public.gerar_codigo_cupao()$$,
  'gerar um código de cupão à mão');

\echo ''
\echo '── 40. A candidatura decidida chega a quem se candidatou ───────'
RESET ROLE;
SELECT t.sair();
UPDATE public.contabilistas SET estado='aprovado'
 WHERE user_id='66666666-6666-6666-6666-666666666666';
SET ROLE authenticated;
SELECT t.entrar('66666666-6666-6666-6666-666666666666');
SELECT t.conta($$SELECT count(*) FROM public.notificacoes
  WHERE tipo='candidatura_decidida'$$, 1, 'a candidata soube da decisão');

\echo ''
\echo '── 41. A fila de email: só o que interrompe o dia ──────────────'
RESET ROLE;
SELECT t.sair();
SELECT t.conta($$SELECT count(*) FROM public.notificacoes
  WHERE tipo='mensagem' AND email_estado='dispensado'$$, 1,
  'uma mensagem não manda email — uma conversa assim abandona-se');
SELECT t.conta($$SELECT count(*) FROM public.notificacoes
  WHERE tipo='partilha_recebida' AND email_estado='dispensado'$$, 1,
  'uma simulação também não');
SELECT t.conta($$SELECT count(*) FROM public.notificacoes
  WHERE tipo='vinculo_pedido' AND email_estado='por_enviar'$$, 1,
  'um pedido de vínculo espera na fila');

SET ROLE authenticated;
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.recusa($$SELECT public.avisos_email_reclamar(10)$$,
  'reclamar a fila — devolveria endereços de email');
SELECT t.recusa($$UPDATE public.notificacoes SET email_estado='enviado'$$,
  'mexer no estado do email das suas notificações');
SELECT t.recusa($$UPDATE public.notificacoes SET email_tentativas=0$$,
  'pôr as tentativas a zero para o email sair para sempre');
SELECT t.permite($$UPDATE public.notificacoes SET lida_em=now()
  WHERE tipo='mensagem' AND lida_em IS NULL$$,
  'marcar o seu aviso como lido, que é a única coluna que lhe pertence');

\echo ''
\echo '── 42. Reclamar não entrega duas vezes o mesmo aviso ───────────'
RESET ROLE;
SELECT t.sair();
SET ROLE service_role;
DO $$
DECLARE v_primeira integer; v_segunda integer; v_falhado uuid;
BEGIN
  SELECT count(*) INTO v_primeira FROM public.avisos_email_reclamar(50);
  ASSERT v_primeira >= 3, format('a fila devia ter trabalho, veio %s', v_primeira);
  RAISE NOTICE '  ok  · a fila entregou % avisos por enviar', v_primeira;

  -- Já reclamados. Uma segunda passagem logo a seguir não os repete: sem
  -- isto, um reinício a meio duplicava emails.
  SELECT count(*) INTO v_segunda FROM public.avisos_email_reclamar(50);
  ASSERT v_segunda = 0, format('a segunda passagem repetiu %s avisos', v_segunda);
  RAISE NOTICE '  ok  · a segunda passagem não repete nada';
END $$;

DO $$
DECLARE v_id uuid; v_estado text; v_tent smallint;
BEGIN
  SELECT id INTO v_id FROM public.notificacoes WHERE email_estado='a_enviar' LIMIT 1;

  PERFORM public.avisos_email_concluir(ARRAY[v_id], '{}'::uuid[]);
  SELECT email_estado INTO v_estado FROM public.notificacoes WHERE id=v_id;
  ASSERT v_estado = 'enviado', format('devia ficar enviado, ficou %s', v_estado);
  RAISE NOTICE '  ok  · o que saiu fica marcado como enviado';

  SELECT id INTO v_id FROM public.notificacoes WHERE email_estado='a_enviar' LIMIT 1;
  PERFORM public.avisos_email_concluir('{}'::uuid[], ARRAY[v_id]);
  SELECT email_estado, email_tentativas INTO v_estado, v_tent
    FROM public.notificacoes WHERE id=v_id;
  ASSERT v_estado = 'por_enviar', format('devia voltar à fila, ficou %s', v_estado);
  ASSERT v_tent = 1, format('devia contar a tentativa, conta %s', v_tent);
  RAISE NOTICE '  ok  · o que falhou volta à fila, com a tentativa contada';

  -- À terceira, desiste. Insistir para sempre num endereço que não existe
  -- é gastar a reputação de quem envia.
  UPDATE public.notificacoes SET email_tentativas = 3 WHERE id = v_id;
  PERFORM public.avisos_email_concluir('{}'::uuid[], ARRAY[v_id]);
  SELECT email_estado INTO v_estado FROM public.notificacoes WHERE id=v_id;
  ASSERT v_estado = 'falhado', format('devia desistir, ficou %s', v_estado);
  RAISE NOTICE '  ok  · à terceira tentativa desiste, em vez de insistir para sempre';
END $$;

\echo ''
\echo '── 43. O código do cupão é gerado, não escolhido ───────────────'
-- Só quem é dono das funções lhe chega — nem o `service_role` a tem.
RESET ROLE;
DO $$
DECLARE v_codigo text;
BEGIN
  v_codigo := public.gerar_codigo_cupao();
  ASSERT v_codigo ~ '^RC-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$',
    format('formato inesperado: %s', v_codigo);
  RAISE NOTICE '  ok  · o código sai no formato lido em voz alta, sem 0/O nem 1/I/L';

  ASSERT (SELECT count(DISTINCT public.gerar_codigo_cupao()) FROM generate_series(1, 40)) >= 35,
    'os códigos repetem-se de mais para serem aleatórios';
  RAISE NOTICE '  ok  · quarenta códigos seguidos não se repetem';
END $$;
RESET ROLE;
