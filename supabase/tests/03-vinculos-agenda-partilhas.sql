\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

\echo ''
\echo '── 6. Vínculos ────────────────────────────────────────────────'
SET ROLE authenticated;
SELECT t.entrar('22222222-2222-2222-2222-222222222222');
SELECT t.permite($$INSERT INTO public.contabilista_vinculos (contabilista_id, cliente_id)
  VALUES ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')$$,
  'cliente pede vínculo');
SELECT t.recusa($$UPDATE public.contabilista_vinculos SET estado='ativo'
  WHERE cliente_id='22222222-2222-2222-2222-222222222222'$$,
  'cliente aceita-se a si próprio como cliente');
SELECT t.recusa($$INSERT INTO public.contabilista_vinculos (contabilista_id, cliente_id, estado)
  VALUES ('55555555-5555-5555-5555-555555555555','22222222-2222-2222-2222-222222222222','ativo')$$,
  'cliente cria vínculo já ativo');
SELECT t.recusa($$INSERT INTO public.contabilista_vinculos (contabilista_id, cliente_id)
  VALUES ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333')$$,
  'cliente cria vínculo em nome de outra pessoa');

-- O contabilista aceita.
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.permite($$UPDATE public.contabilista_vinculos SET estado='ativo'
  WHERE contabilista_id='11111111-1111-1111-1111-111111111111'$$, 'contabilista aceita o cliente');

-- Um terceiro não vê o vínculo de ninguém.
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_vinculos$$, 0,
  'terceiro não vê vínculos alheios');

\echo ''
\echo '── 7. Agendamentos: sem duplo agendamento, sem auto-carimbo ────'
SELECT t.entrar('22222222-2222-2222-2222-222222222222');
SELECT t.permite($$INSERT INTO public.agendamentos (contabilista_id, cliente_id, inicio, fim)
  VALUES ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
          '2026-09-01T09:00:00Z','2026-09-01T10:00:00Z')$$, 'cliente marca consulta');

-- A garantia estrutural: outra pessoa não ocupa o mesmo horário.
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.permite($$INSERT INTO public.contabilista_vinculos (contabilista_id, cliente_id)
  VALUES ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333')$$,
  'segundo cliente pede vínculo');
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.permite($$UPDATE public.contabilista_vinculos SET estado='ativo'
  WHERE cliente_id='33333333-3333-3333-3333-333333333333'$$, 'aceite');
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.recusa($$INSERT INTO public.agendamentos (contabilista_id, cliente_id, inicio, fim)
  VALUES ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333',
          '2026-09-01T09:30:00Z','2026-09-01T10:30:00Z')$$,
  'segunda pessoa marca por cima do mesmo horário');
SELECT t.permite($$INSERT INTO public.agendamentos (contabilista_id, cliente_id, inicio, fim)
  VALUES ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333',
          '2026-09-01T11:00:00Z','2026-09-01T12:00:00Z')$$, 'horário livre a seguir');

-- O cliente não marca a consulta como realizada — carimbava o cartão sozinho.
SELECT t.entrar('22222222-2222-2222-2222-222222222222');
SELECT t.recusa($$UPDATE public.agendamentos SET estado='realizada'
  WHERE cliente_id='22222222-2222-2222-2222-222222222222'$$,
  'cliente marca a consulta como realizada');
SELECT t.permite($$UPDATE public.agendamentos SET estado='cancelado_cliente'
  WHERE cliente_id='22222222-2222-2222-2222-222222222222'$$, 'cliente cancela a sua consulta');

-- Sem vínculo ativo não se marca.
SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.recusa($$INSERT INTO public.agendamentos (contabilista_id, cliente_id, inicio, fim)
  VALUES ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555',
          '2026-09-02T09:00:00Z','2026-09-02T10:00:00Z')$$,
  'marcar sem vínculo ativo');

\echo ''
\echo '── 8. Partilhas: a fronteira de privacidade da migração 038 ────'
SET ROLE authenticated;
SELECT t.entrar('22222222-2222-2222-2222-222222222222');
SELECT t.permite($$INSERT INTO public.partilhas
  (contabilista_id, cliente_id, tipo, titulo, conteudo, consentimento_versao)
  VALUES ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
          'simulador_irs','Simulacao 2026','{"ano":2026}'::jsonb,'2026-08-1')$$,
  'cliente partilha com o seu contabilista');
SELECT t.recusa($$INSERT INTO public.partilhas
  (contabilista_id, cliente_id, tipo, titulo, conteudo, consentimento_versao)
  VALUES ('55555555-5555-5555-5555-555555555555','22222222-2222-2222-2222-222222222222',
          'simulador_irs','Para outro','{"ano":2026}'::jsonb,'2026-08-1')$$,
  'partilhar com um contabilista sem vínculo');
SELECT t.recusa($$INSERT INTO public.partilhas
  (contabilista_id, cliente_id, tipo, titulo, conteudo, consentimento_versao)
  VALUES ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
          'simulador_irs','Sem consentimento','{"ano":2026}'::jsonb,'')$$,
  'partilhar sem versão de consentimento');

-- O contabilista lê o que lhe foi enviado.
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.partilhas$$, 1, 'contabilista lê a partilha');

-- ⚠️ O OUTRO contabilista não lê nada, mesmo tendo conta aprovada.
SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.conta($$SELECT count(*) FROM public.partilhas$$, 0,
  'outro contabilista não lê partilhas que não lhe foram enviadas');

-- ⚠️ A administração NÃO lê conteúdo fiscal (migração 038).
SELECT t.entrar('44444444-4444-4444-4444-444444444444');
SELECT t.conta($$SELECT count(*) FROM public.partilhas$$, 0,
  'a administração não lê partilhas — «só tu acedes aos teus dados»');

-- Revogar fecha a porta.
SELECT t.entrar('22222222-2222-2222-2222-222222222222');
SELECT t.permite($$UPDATE public.partilhas SET estado='revogada', revogada_em=now()
  WHERE cliente_id='22222222-2222-2222-2222-222222222222'$$, 'cliente revoga');
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.partilhas$$, 0,
  'depois de revogada, o contabilista deixa de a ler');
SELECT t.recusa($$UPDATE public.partilhas SET estado='enviada'$$,
  'contabilista desfaz a revogação');
