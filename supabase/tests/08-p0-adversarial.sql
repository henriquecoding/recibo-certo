\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

-- Os três bloqueadores P0 da auditoria da PR #102. Cada asserção aqui
-- FALHAVA antes da migração 046.

\echo ''
\echo '── 29. Cenário limpo ───────────────────────────────────────────'
RESET ROLE;
SELECT t.sair();
INSERT INTO auth.users (id, email) VALUES
  ('88888888-8888-8888-8888-888888888888','alvo@exemplo.pt'),
  ('99999999-9999-9999-9999-999999999999','terceiro@exemplo.pt')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, email, role) VALUES
  ('88888888-8888-8888-8888-888888888888','alvo@exemplo.pt','user'),
  ('99999999-9999-9999-9999-999999999999','terceiro@exemplo.pt','user')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contabilista_vinculos (id, contabilista_id, cliente_id, estado, nome_cliente, mensagem)
VALUES ('cccc0000-0000-0000-0000-00000000000c',
        '11111111-1111-1111-1111-111111111111',
        '88888888-8888-8888-8888-888888888888','ativo','Elsa','Preciso de ajuda com o IVA.')
ON CONFLICT DO NOTHING;

INSERT INTO public.partilhas
  (id, contabilista_id, cliente_id, tipo, titulo, conteudo, consentimento_versao)
VALUES ('dddd0000-0000-0000-0000-00000000000d',
        '11111111-1111-1111-1111-111111111111',
        '88888888-8888-8888-8888-888888888888',
        'simulador_irs','Simulacao original','{"ano":2026,"irsEstimado":4200}'::jsonb,'2026-08-1')
ON CONFLICT DO NOTHING;

SET ROLE authenticated;

\echo ''
\echo '── 30. P0.2 · As partes de um vínculo não se trocam ─────────────'
SELECT t.entrar('11111111-1111-1111-1111-111111111111');

-- ⚠️ ISTO ERA POSSÍVEL. O gatilho só apertava quando quem escrevia era o
-- cliente; sendo o contabilista, saía sem verificar. Como as mensagens
-- pendem do vínculo, trocar o cliente levava a conversa de uma pessoa
-- para dentro da de outra.
SELECT t.recusa($$UPDATE public.contabilista_vinculos
  SET cliente_id='99999999-9999-9999-9999-999999999999'
  WHERE id='cccc0000-0000-0000-0000-00000000000c'$$,
  'contabilista aponta o vínculo a outro cliente');

SELECT t.recusa($$UPDATE public.contabilista_vinculos
  SET contabilista_id='55555555-5555-5555-5555-555555555555'
  WHERE id='cccc0000-0000-0000-0000-00000000000c'$$,
  'contabilista entrega o vínculo a um colega');

SELECT t.recusa($$UPDATE public.contabilista_vinculos SET origem='contabilista'
  WHERE id='cccc0000-0000-0000-0000-00000000000c'$$,
  'reescrever quem iniciou o vínculo');

SELECT t.recusa($$UPDATE public.contabilista_vinculos SET nome_cliente='Outro Nome'
  WHERE id='cccc0000-0000-0000-0000-00000000000c'$$,
  'contabilista escreve o nome pelo cliente');

SELECT t.entrar('88888888-8888-8888-8888-888888888888');
SELECT t.recusa($$UPDATE public.contabilista_vinculos SET mensagem='Afinal era outra coisa.'
  WHERE id='cccc0000-0000-0000-0000-00000000000c'$$,
  'cliente reescreve o recado depois de o contabilista o ter lido');

-- O que continua a poder mudar.
SELECT t.permite($$UPDATE public.contabilista_vinculos SET nome_cliente='Elsa Martins'
  WHERE id='cccc0000-0000-0000-0000-00000000000c'$$, 'o cliente corrige o seu nome');

\echo ''
\echo '── 31. P0.4 · Uma partilha é uma cópia, e não se reescreve ──────'
SELECT t.entrar('11111111-1111-1111-1111-111111111111');

-- ⚠️ ISTO ERA POSSÍVEL. «Marcar como vista» era um UPDATE genérico: o
-- `WITH CHECK` olhava para o estado e mais nada, e o conteúdo seguia na
-- mesma instrução.
SELECT t.recusa($$UPDATE public.partilhas
  SET estado='vista', conteudo='{"ano":2026,"irsEstimado":99999}'::jsonb
  WHERE id='dddd0000-0000-0000-0000-00000000000d'$$,
  'contabilista reescreve o conteúdo ao marcar como vista');

SELECT t.recusa($$UPDATE public.partilhas SET estado='vista', titulo='Outra coisa'
  WHERE id='dddd0000-0000-0000-0000-00000000000d'$$,
  'reescrever o título');

SELECT t.recusa($$UPDATE public.partilhas
  SET estado='vista', cliente_id='99999999-9999-9999-9999-999999999999'
  WHERE id='dddd0000-0000-0000-0000-00000000000d'$$,
  'atribuir a partilha a outro cliente');

SELECT t.permite($$UPDATE public.partilhas SET estado='vista', vista_em=now()
  WHERE id='dddd0000-0000-0000-0000-00000000000d'$$,
  'marcar como vista, e só isso');

SELECT t.conta($$SELECT count(*) FROM public.partilhas
  WHERE id='dddd0000-0000-0000-0000-00000000000d'
    AND conteudo->>'irsEstimado' = '4200'$$, 1,
  'o conteúdo original está intacto depois de tudo');

-- Revogar é definitivo.
SELECT t.entrar('88888888-8888-8888-8888-888888888888');
SELECT t.permite($$UPDATE public.partilhas SET estado='revogada', revogada_em=now()
  WHERE id='dddd0000-0000-0000-0000-00000000000d'$$, 'cliente revoga');
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.recusa($$UPDATE public.partilhas SET estado='vista'
  WHERE id='dddd0000-0000-0000-0000-00000000000d'$$,
  'contabilista desfaz a revogação para recuperar o acesso');

\echo ''
\echo '── 32. P0.3 · Suspender tira mesmo o acesso ─────────────────────'
-- Antes: as políticas perguntavam «és o contabilista?» e nunca «ainda
-- estás aprovado?». A suspensão tirava o painel — que é interface — e
-- deixava o REST aberto, que é o que interessa.
RESET ROLE;
SELECT t.sair();
INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo)
VALUES ('cccc0000-0000-0000-0000-00000000000c',
        '88888888-8888-8888-8888-888888888888','Bom dia.');
INSERT INTO public.contabilista_tarefas (contabilista_id, titulo)
VALUES ('11111111-1111-1111-1111-111111111111','Tarefa da Ana');

SET ROLE authenticated;
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_vinculos
  WHERE id='cccc0000-0000-0000-0000-00000000000c'$$, 1, 'aprovado: vê o vínculo');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_mensagens
  WHERE vinculo_id='cccc0000-0000-0000-0000-00000000000c'$$, 1, 'aprovado: lê a conversa');

-- A administração suspende.
RESET ROLE;
SELECT t.sair();
UPDATE public.contabilistas SET estado='suspenso'
  WHERE user_id='11111111-1111-1111-1111-111111111111';

SET ROLE authenticated;
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_vinculos
  WHERE id='cccc0000-0000-0000-0000-00000000000c'$$, 0,
  'suspenso: deixa de ver a sua carteira de clientes');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_mensagens$$, 0,
  'suspenso: deixa de ler as conversas');
SELECT t.conta($$SELECT count(*) FROM public.partilhas$$, 0,
  'suspenso: deixa de ler as partilhas que recebeu');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_tarefas$$, 0,
  'suspenso: deixa de ver as suas tarefas');
SELECT t.recusa($$INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo)
  VALUES ('cccc0000-0000-0000-0000-00000000000c',
          '11111111-1111-1111-1111-111111111111','Continuo aqui.')$$,
  'suspenso: escrever ao cliente');
SELECT t.recusa($$UPDATE public.contabilista_vinculos SET estado='pausado'
  WHERE id='cccc0000-0000-0000-0000-00000000000c'$$,
  'suspenso: mexer no vínculo');

-- E o cliente? Continua dono do que é dele.
SELECT t.entrar('88888888-8888-8888-8888-888888888888');
SELECT t.conta($$SELECT count(*) FROM public.partilhas
  WHERE cliente_id='88888888-8888-8888-8888-888888888888'$$, 1,
  'o cliente continua a ver o seu próprio histórico');

-- Reativar devolve o acesso.
RESET ROLE;
SELECT t.sair();
UPDATE public.contabilistas SET estado='aprovado'
  WHERE user_id='11111111-1111-1111-1111-111111111111';
SET ROLE authenticated;
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_vinculos
  WHERE id='cccc0000-0000-0000-0000-00000000000c'$$, 1,
  'reativado: volta a ver a carteira');

\echo ''
\echo '── 33. P0.2 · Terminado é terminado ────────────────────────────'
SELECT t.entrar('88888888-8888-8888-8888-888888888888');
SELECT t.permite($$UPDATE public.contabilista_vinculos SET estado='terminado', terminado_em=now()
  WHERE id='cccc0000-0000-0000-0000-00000000000c'$$, 'cliente termina');
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.recusa($$UPDATE public.contabilista_vinculos SET estado='ativo'
  WHERE id='cccc0000-0000-0000-0000-00000000000c'$$,
  'contabilista ressuscita o vínculo para recuperar o histórico');
