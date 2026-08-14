\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

\echo ''
\echo '── 18. Preparar uma conversa viva ──────────────────────────────'
RESET ROLE;
INSERT INTO auth.users (id, email) VALUES
  ('77777777-7777-7777-7777-777777777777', 'conversa@exemplo.pt')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, email, role) VALUES
  ('77777777-7777-7777-7777-777777777777', 'conversa@exemplo.pt', 'user')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contabilista_vinculos (id, contabilista_id, cliente_id, estado, nome_cliente)
VALUES ('aaaa0000-0000-0000-0000-00000000000a',
        '11111111-1111-1111-1111-111111111111',
        '77777777-7777-7777-7777-777777777777', 'ativo', 'Dora')
ON CONFLICT DO NOTHING;

-- E um vínculo de outro contabilista, para provar o isolamento.
INSERT INTO public.contabilista_vinculos (id, contabilista_id, cliente_id, estado)
VALUES ('bbbb0000-0000-0000-0000-00000000000b',
        '55555555-5555-5555-5555-555555555555',
        '22222222-2222-2222-2222-222222222222', 'ativo')
ON CONFLICT DO NOTHING;

SET ROLE authenticated;

\echo ''
\echo '── 19. Quem escreve, e em nome de quem ─────────────────────────'
SELECT t.entrar('77777777-7777-7777-7777-777777777777');
SELECT t.permite($$INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo)
  VALUES ('aaaa0000-0000-0000-0000-00000000000a',
          '77777777-7777-7777-7777-777777777777','Boa tarde, tenho uma duvida.')$$,
  'cliente escreve na sua conversa');

SELECT t.recusa($$INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo)
  VALUES ('aaaa0000-0000-0000-0000-00000000000a',
          '11111111-1111-1111-1111-111111111111','Mensagem falsa do contabilista.')$$,
  'cliente escreve fazendo-se passar pelo contabilista');

SELECT t.recusa($$INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo)
  VALUES ('bbbb0000-0000-0000-0000-00000000000b',
          '77777777-7777-7777-7777-777777777777','Mensagem numa conversa alheia.')$$,
  'escrever numa conversa de que não se é parte');

SELECT t.recusa($$INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo, lida_em)
  VALUES ('aaaa0000-0000-0000-0000-00000000000a',
          '77777777-7777-7777-7777-777777777777','Ja lida.', now())$$,
  'nascer já lida, para não contar no sino do outro');

\echo ''
\echo '── 20. Quem lê ─────────────────────────────────────────────────'
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_mensagens
  WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'$$, 1,
  'o contabilista lê a mensagem do seu cliente');

-- ⚠️ As três leituras que têm de dar zero.
SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_mensagens$$, 0,
  'outro contabilista aprovado não lê conversa nenhuma');
SELECT t.entrar('44444444-4444-4444-4444-444444444444');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_mensagens$$, 0,
  'a administração não lê conversas — como não lê partilhas');
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_mensagens$$, 0,
  'um terceiro qualquer não lê nada');

\echo ''
\echo '── 21. Uma mensagem enviada não se reescreve ───────────────────'
SELECT t.entrar('77777777-7777-7777-7777-777777777777');
SELECT t.recusa($$UPDATE public.contabilista_mensagens SET corpo='Afinal era outra coisa.'
  WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'$$,
  'o autor reescreve o que disse');
SELECT t.recusa($$DELETE FROM public.contabilista_mensagens
  WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'$$,
  'o autor apaga o que disse');

-- Marcar como lida é do destinatário, e só dele.
SELECT t.recusa($$UPDATE public.contabilista_mensagens SET lida_em=now()
  WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'$$,
  'o autor dá a própria mensagem por lida, escondendo-a do sino do outro');

SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.permite($$UPDATE public.contabilista_mensagens SET lida_em=now()
  WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a'$$,
  'o destinatário marca como lida');

\echo ''
\echo '── 22. Pausar deixa ler; terminar fecha tudo ───────────────────'
RESET ROLE;
SELECT t.sair();
UPDATE public.contabilista_vinculos SET estado='pausado'
  WHERE id='aaaa0000-0000-0000-0000-00000000000a';
SET ROLE authenticated;

SELECT t.entrar('77777777-7777-7777-7777-777777777777');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_mensagens$$, 1,
  'em pausa, o histórico continua legível');
SELECT t.recusa($$INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo)
  VALUES ('aaaa0000-0000-0000-0000-00000000000a',
          '77777777-7777-7777-7777-777777777777','Mensagem durante a pausa.')$$,
  'em pausa, não se escreve');

RESET ROLE;
SELECT t.sair();
UPDATE public.contabilista_vinculos SET estado='terminado', terminado_em=now()
  WHERE id='aaaa0000-0000-0000-0000-00000000000a';
SET ROLE authenticated;

SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_mensagens$$, 0,
  'terminado, o contabilista deixa de ler a conversa');
SELECT t.entrar('77777777-7777-7777-7777-777777777777');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_mensagens$$, 0,
  'terminado, o cliente também deixa de a ler');

\echo ''
\echo '── 23. Anexos: os tetos são do schema ──────────────────────────'
RESET ROLE;
SELECT t.sair();
UPDATE public.contabilista_vinculos SET estado='ativo', terminado_em=NULL
  WHERE id='aaaa0000-0000-0000-0000-00000000000a';

DO $$
DECLARE m uuid;
BEGIN
  SELECT id INTO m FROM public.contabilista_mensagens
   WHERE vinculo_id='aaaa0000-0000-0000-0000-00000000000a' LIMIT 1;

  -- Um ficheiro de 11 MB não entra.
  BEGIN
    INSERT INTO public.contabilista_anexos (mensagem_id, caminho, nome, bytes, tipo_mime)
    VALUES (m, 'x/a.pdf', 'a.pdf', 11534336, 'application/pdf');
    RAISE EXCEPTION 'FALHA: um anexo de 11 MB foi aceite';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '  ok  · recusado (erro): anexo acima de 10 MB';
  END;

  -- Cinco entram; o sexto não.
  FOR i IN 1..5 LOOP
    INSERT INTO public.contabilista_anexos (mensagem_id, caminho, nome, bytes, tipo_mime)
    VALUES (m, 'x/' || i || '.pdf', i || '.pdf', 1024, 'application/pdf');
  END LOOP;
  RAISE NOTICE '  ok  · cinco anexos numa mensagem';

  BEGIN
    INSERT INTO public.contabilista_anexos (mensagem_id, caminho, nome, bytes, tipo_mime)
    VALUES (m, 'x/6.pdf', '6.pdf', 1024, 'application/pdf');
    RAISE EXCEPTION 'FALHA: o sexto anexo foi aceite';
  EXCEPTION WHEN raise_exception THEN
    RAISE NOTICE '  ok  · recusado (erro): sexto anexo na mesma mensagem';
  END;
END $$;

\echo ''
\echo '── 24. Notificações: ninguém toca o sino de outro ──────────────'
RESET ROLE;
SELECT t.sair();
INSERT INTO public.notificacoes (user_id, tipo, titulo, url)
VALUES ('11111111-1111-1111-1111-111111111111','mensagem','Mensagem nova','/contabilista');
SET ROLE authenticated;

SELECT t.entrar('33333333-3333-3333-3333-333333333333');
-- Contar TUDO deixou de servir: desde a migração 047 as transições geram
-- avisos, e o 3333 tem os seus por ter sido aceite como cliente. O que a
-- invariante diz é outra coisa — que não vê os DE OUTRA PESSOA.
SELECT t.conta($$SELECT count(*) FROM public.notificacoes
  WHERE user_id <> '33333333-3333-3333-3333-333333333333'$$, 0,
  'ninguém vê as notificações de outra pessoa');
SELECT t.conta($$SELECT count(*) FROM public.notificacoes
  WHERE user_id = '11111111-1111-1111-1111-111111111111'$$, 0,
  'nem as de um contabilista, sabendo-lhe o id');
SELECT t.recusa($$INSERT INTO public.notificacoes (user_id, tipo, titulo)
  VALUES ('11111111-1111-1111-1111-111111111111','mensagem','Aviso forjado')$$,
  'inserir uma notificação na conta de outra pessoa');
SELECT t.recusa($$INSERT INTO public.notificacoes (user_id, tipo, titulo)
  VALUES ('33333333-3333-3333-3333-333333333333','mensagem','Aviso para mim')$$,
  'inserir uma notificação para si próprio');

SELECT t.entrar('11111111-1111-1111-1111-111111111111');
-- Um número exato aqui passaria a mudar sempre que uma transição nova
-- passasse a avisar. O que se prova é que o dono vê a sua, e que a que foi
-- inserida acima está entre as que vê.
SELECT t.conta($$SELECT count(*) FROM public.notificacoes
  WHERE lida_em IS NULL AND titulo = 'Mensagem nova'$$, 1,
  'o dono vê a sua notificação por ler');
SELECT t.permite($$UPDATE public.notificacoes SET lida_em=now()
  WHERE user_id='11111111-1111-1111-1111-111111111111'$$, 'o dono marca como lida');
