\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

-- Apagar era um `DELETE` por tabela dentro de uma rota, sobre cinco
-- tabelas de vinte e oito (migração 049). Cada asserção aqui FALHAVA antes.

\echo ''
\echo '── 52. Uma pessoa que usou tudo ────────────────────────────────'
RESET ROLE;
SELECT t.sair();

INSERT INTO auth.users (id, email) VALUES
  ('d1d1d1d1-0000-0000-0000-00000000000d','apagar@exemplo.pt')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, email, role) VALUES
  ('d1d1d1d1-0000-0000-0000-00000000000d','apagar@exemplo.pt','user')
ON CONFLICT (id) DO NOTHING;
UPDATE public.profiles SET preferencias_fiscais = '{"regimeIva":"isento"}'::jsonb
 WHERE id = 'd1d1d1d1-0000-0000-0000-00000000000d';

INSERT INTO public.contabilista_vinculos (id, contabilista_id, cliente_id, estado, nome_cliente)
VALUES ('a9a90000-0000-0000-0000-00000000000a',
        '11111111-1111-1111-1111-111111111111',
        'd1d1d1d1-0000-0000-0000-00000000000d','ativo','Sofia');

INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo) VALUES
  ('a9a90000-0000-0000-0000-00000000000a','d1d1d1d1-0000-0000-0000-00000000000d','Olá.'),
  ('a9a90000-0000-0000-0000-00000000000a','11111111-1111-1111-1111-111111111111','Olá, Sofia.');

INSERT INTO public.agendamentos (contabilista_id, cliente_id, inicio, fim, estado, modalidade)
VALUES ('11111111-1111-1111-1111-111111111111','d1d1d1d1-0000-0000-0000-00000000000d',
        '2027-03-02T09:00:00Z','2027-03-02T10:00:00Z','confirmado','online');

INSERT INTO public.partilhas (contabilista_id, cliente_id, tipo, titulo, conteudo, consentimento_versao)
VALUES ('11111111-1111-1111-1111-111111111111','d1d1d1d1-0000-0000-0000-00000000000d',
        'simulador_irs','IRS','{"ano":2026}'::jsonb,'2026-08-1');

INSERT INTO public.alertas_guardiao (user_id, tipo, canal)
VALUES ('d1d1d1d1-0000-0000-0000-00000000000d','iva','email');

SET ROLE authenticated;
SELECT t.entrar('d1d1d1d1-0000-0000-0000-00000000000d');

\echo ''
\echo '── 53. O inventário diz o que existe, e só o próprio o vê ──────'
DO $$
DECLARE inv jsonb;
BEGIN
  inv := public.inventario_do_utilizador();
  ASSERT (inv->>'conversas')::int = 1, format('conversas: %s', inv->>'conversas');
  ASSERT (inv->>'consultas')::int = 1, format('consultas: %s', inv->>'consultas');
  ASSERT (inv->>'partilhas')::int = 1, format('partilhas: %s', inv->>'partilhas');
  ASSERT (inv->>'perfil-fiscal')::int = 1, format('perfil: %s', inv->>'perfil-fiscal');
  ASSERT (inv->>'recibos')::int = 0, 'não tem recibos e o inventário devia dizê-lo';
  RAISE NOTICE '  ok  · o inventário conta o que a pessoa tem, e o que não tem';
END $$;

-- Outra pessoa a pedir o inventário recebe o DELA, e não o desta: a
-- função não aceita id nenhum — lê `auth.uid()`.
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
DO $$
DECLARE inv jsonb;
BEGIN
  inv := public.inventario_do_utilizador();
  ASSERT (inv->>'conversas')::int = 0, 'o inventário de um terceiro trouxe dados alheios';
  RAISE NOTICE '  ok  · o inventário é sempre o de quem pergunta';
END $$;

\echo ''
\echo '── 54. Apagar o que se escolheu, e só isso ─────────────────────'
SELECT t.entrar('d1d1d1d1-0000-0000-0000-00000000000d');
DO $$
DECLARE r jsonb;
BEGIN
  r := public.apagar_conjuntos(ARRAY['alertas']);
  ASSERT (r->>'ok')::boolean, format('devia apagar: %s', r);
  ASSERT (r->'linhas'->>'alertas')::int = 1, format('linhas: %s', r->'linhas');
  RAISE NOTICE '  ok  · apagou o alerta, e disse quantas linhas saíram';
END $$;

SELECT t.conta($$SELECT count(*) FROM public.alertas_guardiao$$, 0, 'o alerta saiu');
SELECT t.conta($$SELECT count(*) FROM public.partilhas$$, 1,
  'a partilha ficou — não foi escolhida');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_mensagens$$, 2,
  'as mensagens ficaram — não foram escolhidas');

-- ⚠️ ISTO ERA IMPOSSÍVEL. As mensagens e as consultas nem sequer estavam
-- na lista que a rota apagava, e as duas referem `auth.users` com
-- RESTRICT — apagar a conta falhava a quem tivesse usado a plataforma.
\echo ''
\echo '── 55. As conversas e as consultas saem mesmo ──────────────────'
DO $$
DECLARE r jsonb;
BEGIN
  r := public.apagar_conjuntos(ARRAY['conversas','consultas','partilhas']);
  ASSERT (r->'linhas'->>'mensagens')::int = 2,
    format('as duas falas da conversa deviam sair: %s', r->'linhas');
  ASSERT (r->'linhas'->>'agendamentos')::int = 1, format('consultas: %s', r->'linhas');
  RAISE NOTICE '  ok  · as duas pontas da conversa saem, e a consulta também';
END $$;

RESET ROLE; SELECT t.sair();
SELECT t.conta($$SELECT count(*) FROM public.contabilista_mensagens
  WHERE vinculo_id='a9a90000-0000-0000-0000-00000000000a'$$, 0,
  'nem a fala do contabilista fica — meia conversa não é um registo');

\echo ''
\echo '── 56. Nada se apaga por conta de outrem ───────────────────────'
-- As contagens leem-se as duas como `postgres`: comparar o que um papel
-- vê com o que outro vê media a RLS, e não o apagamento.
RESET ROLE; SELECT t.sair();
-- Os que NÃO são do terceiro. Contar todos media outra coisa: o intruso
-- é cliente nalguns testes anteriores, e apagar os seus é o comportamento
-- certo — o que não pode acontecer é tocar nos dos outros.
SELECT set_config('t.antes',
  (SELECT count(*)::text FROM public.contabilista_vinculos
    WHERE cliente_id <> '33333333-3333-3333-3333-333333333333'), false);

SET ROLE authenticated;
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
-- A função não aceita id nenhum: lê `auth.uid()`. Um terceiro a pedir
-- «apaga tudo» apaga o que é dele, que é nada.
SELECT t.rpc_ok($$SELECT public.apagar_conjuntos(public.conjuntos_todos())$$,
  'um terceiro pede para apagar tudo');

RESET ROLE; SELECT t.sair();
DO $$
DECLARE v_antes integer; v_depois integer;
BEGIN
  v_antes := current_setting('t.antes')::integer;
  SELECT count(*) INTO v_depois FROM public.contabilista_vinculos
   WHERE cliente_id <> '33333333-3333-3333-3333-333333333333';
  ASSERT v_antes = v_depois,
    format('um terceiro apagou vínculos alheios: %s → %s', v_antes, v_depois);
  RAISE NOTICE '  ok  · apagar tudo, sendo terceiro, não tira nada a ninguém';
END $$;

\echo ''
\echo '── 57. O manifesto fica, e não se reescreve ────────────────────'
SET ROLE authenticated;
SELECT t.entrar('d1d1d1d1-0000-0000-0000-00000000000d');
SELECT t.conta($$SELECT count(*) FROM public.conta_apagamentos$$, 2,
  'os dois apagamentos ficaram registados');
SELECT t.conta($$SELECT count(*) FROM public.conta_apagamentos
  WHERE conjuntos @> ARRAY['conversas']$$, 1,
  'o manifesto diz o que foi pedido');

SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.conta($$SELECT count(*) FROM public.conta_apagamentos
  WHERE utilizador = 'd1d1d1d1-0000-0000-0000-00000000000d'$$, 0,
  'o manifesto de outra pessoa não se lê');

RESET ROLE; SELECT t.sair();
SELECT t.recusa($$UPDATE public.conta_apagamentos SET linhas='{"recibos":0}'::jsonb$$,
  'reescrever o que um manifesto diz ter apagado');
SELECT t.recusa($$DELETE FROM public.conta_apagamentos$$,
  'apagar o registo de um apagamento');

\echo ''
\echo '── 58. Escolher nada não é apagar tudo ─────────────────────────'
SET ROLE authenticated;
SELECT t.entrar('d1d1d1d1-0000-0000-0000-00000000000d');
SELECT t.rpc_recusa($$SELECT public.apagar_conjuntos(ARRAY[]::text[])$$,
  'nada_escolhido', 'apagar com a lista vazia');
SELECT t.rpc_recusa($$SELECT public.apagar_conjuntos(NULL)$$,
  'nada_escolhido', 'apagar com a lista por preencher');

-- Um conjunto que não existe não faz nada e não rebenta: é o que impede
-- uma versão antiga do browser de falhar contra um servidor novo.
SELECT t.rpc_ok($$SELECT public.apagar_conjuntos(ARRAY['nao-existe'])$$,
  'apagar um conjunto desconhecido não é um erro');
RESET ROLE;
