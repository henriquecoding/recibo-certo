\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

-- ═══════════════════════════════════════════════════════════════════════
--  A SALA DE ACOMPANHAMENTO (migração da sala de acompanhamento)
--  ---------------------------------------------------------------------
--  O pedido ao cliente e a linha do tempo. As duas garantias que interessam
--  provar contra a base de dados a sério:
--
--   · quem pede, quem responde e quem fecha são papéis distintos, e nenhum
--     deles se consegue exercer pelo lado errado da relação;
--   · a linha do tempo só devolve a relação de quem pergunta — é
--     SECURITY DEFINER, portanto passa por cima da RLS, e a autorização
--     está escrita à mão lá dentro. Se alguém a apagar, este teste cai.
--
--  O vínculo `aaaa…a` (contabilista 1111, cliente 7777) vem do teste 06.
-- ═══════════════════════════════════════════════════════════════════════

\echo ''
\echo '── 60. Só o contabilista pede ──────────────────────────────────'
SET ROLE authenticated;

SELECT t.entrar('77777777-7777-7777-7777-777777777777');
SELECT t.rpc_recusa($$SELECT public.criar_pedido_cliente(
    'aaaa0000-0000-0000-0000-00000000000a', 'documento', 'Pedido feito pelo cliente')$$,
  'sem_permissao', 'o cliente cria um pedido a si próprio');

SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.rpc_recusa($$SELECT public.criar_pedido_cliente(
    'aaaa0000-0000-0000-0000-00000000000a', 'documento', 'Pedido de um estranho')$$,
  'sem_permissao', 'um terceiro cria um pedido numa relação alheia');

SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.rpc_ok($$SELECT public.criar_pedido_cliente(
    'aaaa0000-0000-0000-0000-00000000000a', 'documento',
    'Comprovativo de retencoes', 'De julho, se tiveres.',
    (now() + interval '10 days')::date)$$,
  'o contabilista pede um documento');

SELECT t.rpc_recusa($$SELECT public.criar_pedido_cliente(
    'aaaa0000-0000-0000-0000-00000000000a', 'documento', 'Ja passou',
    NULL, (now() - interval '2 days')::date)$$,
  'prazo_no_passado', 'um prazo que já passou');

SELECT t.rpc_recusa($$SELECT public.criar_pedido_cliente(
    'aaaa0000-0000-0000-0000-00000000000a', 'inventado', 'Tipo que nao existe')$$,
  'tipo_desconhecido', 'um tipo de pedido fora do catálogo');

SELECT t.rpc_recusa($$SELECT public.criar_pedido_cliente(
    'aaaa0000-0000-0000-0000-00000000000a', 'documento', 'ab')$$,
  'titulo_curto', 'um título que não diz nada');

-- A fronteira de contacto vale aqui como em todo o texto escrito. Recusa
-- por exceção do gatilho, e não por motivo devolvido: é a base a dizer que
-- não, e é assim que tem de ser — a RPC não é a única porta da tabela.
SELECT t.recusa($$SELECT public.criar_pedido_cliente(
    'aaaa0000-0000-0000-0000-00000000000a', 'resposta',
    'Liga-me quando puderes', 'O meu numero e 912 345 678.')$$,
  'um pedido que oferece um telemóvel');

\echo ''
\echo '── 61. Ninguém escreve na tabela por fora ──────────────────────'
SELECT t.recusa($$INSERT INTO public.pedido_cliente (vinculo_id, criado_por, tipo, titulo)
  VALUES ('aaaa0000-0000-0000-0000-00000000000a',
          '11111111-1111-1111-1111-111111111111', 'documento', 'Por REST')$$,
  'INSERT direto, sem passar pela função');

SELECT t.recusa($$UPDATE public.pedido_cliente SET estado='concluido'$$,
  'UPDATE direto do estado');

SELECT t.recusa($$DELETE FROM public.pedido_cliente$$,
  'apagar um pedido');

\echo ''
\echo '── 62. Só o cliente responde ───────────────────────────────────'
SELECT t.rpc_recusa($$SELECT public.responder_pedido_cliente(
    (SELECT id FROM public.pedido_cliente
      WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'
        AND titulo='Comprovativo de retencoes' LIMIT 1),
    'Respondo eu proprio.')$$,
  'sem_permissao', 'o contabilista responde ao seu próprio pedido');

SELECT t.entrar('77777777-7777-7777-7777-777777777777');
SELECT t.rpc_recusa($$SELECT public.responder_pedido_cliente(
    (SELECT id FROM public.pedido_cliente
      WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'
        AND titulo='Comprovativo de retencoes' LIMIT 1))$$,
  'resposta_vazia', 'responder sem texto nem ficheiro');

SELECT t.rpc_ok($$SELECT public.responder_pedido_cliente(
    (SELECT id FROM public.pedido_cliente
      WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'
        AND titulo='Comprovativo de retencoes' LIMIT 1),
    'Aqui vai, ja enviei o ficheiro.')$$,
  'o cliente responde');

-- Uma mensagem que não é desta relação não se cola a um pedido.
SELECT t.rpc_recusa($$SELECT public.responder_pedido_cliente(
    (SELECT id FROM public.pedido_cliente
      WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'
        AND titulo='Comprovativo de retencoes' LIMIT 1),
    'Com anexo', gen_random_uuid())$$,
  'mensagem_invalida', 'apontar para uma mensagem que não é desta conversa');

\echo ''
\echo '── 63. Só o contabilista fecha ─────────────────────────────────'
SELECT t.rpc_recusa($$SELECT public.decidir_pedido_cliente(
    (SELECT id FROM public.pedido_cliente
      WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'
        AND titulo='Comprovativo de retencoes' LIMIT 1), 'concluir')$$,
  'sem_permissao', 'o cliente dá o seu próprio pedido por concluído');

SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.rpc_recusa($$SELECT public.decidir_pedido_cliente(
    (SELECT id FROM public.pedido_cliente
      WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'
        AND titulo='Comprovativo de retencoes' LIMIT 1), 'teletransportar')$$,
  'decisao_desconhecida', 'uma decisão que não existe');

SELECT t.rpc_ok($$SELECT public.decidir_pedido_cliente(
    (SELECT id FROM public.pedido_cliente
      WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'
        AND titulo='Comprovativo de retencoes' LIMIT 1), 'concluir')$$,
  'o contabilista conclui');

-- Concluir duas vezes não é concluir: é escrever por cima de uma decisão.
SELECT t.rpc_recusa($$SELECT public.decidir_pedido_cliente(
    (SELECT id FROM public.pedido_cliente
      WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'
        AND titulo='Comprovativo de retencoes' LIMIT 1), 'concluir')$$,
  'transicao_nao_permitida', 'concluir o que já estava concluído');

-- E responder a um pedido fechado também não.
SELECT t.entrar('77777777-7777-7777-7777-777777777777');
SELECT t.rpc_recusa($$SELECT public.responder_pedido_cliente(
    (SELECT id FROM public.pedido_cliente
      WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'
        AND titulo='Comprovativo de retencoes' LIMIT 1),
    'Afinal era outra coisa.')$$,
  'pedido_fechado', 'responder a um pedido já concluído');

\echo ''
\echo '── 64. O pedido concluído guarda a data ────────────────────────'
RESET ROLE;
SELECT t.conta($$SELECT count(*) FROM public.pedido_cliente
  WHERE titulo='Comprovativo de retencoes'
    AND estado='concluido' AND concluido_em IS NOT NULL
    AND respondido_em IS NOT NULL$$, 1,
  'concluído, respondido, e as duas datas gravadas');

\echo ''
\echo '── 65. A linha do tempo só serve quem é parte ──────────────────'
SET ROLE authenticated;

SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.listar_timeline_vinculo(
    'aaaa0000-0000-0000-0000-00000000000a')
   WHERE tipo='pedido'$$, 1,
  'o contabilista vê o pedido na linha do tempo');

SELECT t.entrar('77777777-7777-7777-7777-777777777777');
SELECT t.conta($$SELECT count(*) FROM public.listar_timeline_vinculo(
    'aaaa0000-0000-0000-0000-00000000000a')
   WHERE tipo='vinculo'$$, 1,
  'o cliente vê o início do acompanhamento');

-- ⚠️ A leitura que TEM de dar zero. `listar_timeline_vinculo` é SECURITY
-- DEFINER: sem a verificação lá dentro, isto devolvia a conversa inteira
-- de outra pessoa a quem soubesse um id.
SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.conta($$SELECT count(*) FROM public.listar_timeline_vinculo(
    'aaaa0000-0000-0000-0000-00000000000a')$$, 0,
  'um terceiro não lê a linha do tempo de uma relação alheia');

-- 5555 é o contabilista do vínculo `bbbb`, e por isso lê-o — seria erro se
-- não lesse. Quem não é parte de nenhum dos dois é o 3333.
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.conta($$SELECT count(*) FROM public.listar_timeline_vinculo(
    'bbbb0000-0000-0000-0000-00000000000b')$$, 0,
  'nem a de um vínculo de que não é parte nenhuma');

\echo ''
\echo '── 66. O cursor anda para trás, e o limite tem teto ────────────'
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.listar_timeline_vinculo(
    'aaaa0000-0000-0000-0000-00000000000a', NULL, 1)$$, 1,
  'o limite é respeitado');

-- Um limite absurdo não traz a base de dados inteira.
SELECT t.conta($$SELECT count(*) FROM (
    SELECT 1 FROM public.listar_timeline_vinculo(
      'aaaa0000-0000-0000-0000-00000000000a', NULL, 100000) LIMIT 200) x$$,
  (SELECT least(count(*), 100) FROM public.listar_timeline_vinculo(
      'aaaa0000-0000-0000-0000-00000000000a', NULL, 100)),
  'um limite absurdo é aparado para 100');

-- O cursor: nada é anterior ao princípio dos tempos.
SELECT t.conta($$SELECT count(*) FROM public.listar_timeline_vinculo(
    'aaaa0000-0000-0000-0000-00000000000a', '2000-01-01T00:00:00Z'::timestamptz)$$, 0,
  'com cursor no ano 2000 não há nada antes');

SELECT t.sair();
