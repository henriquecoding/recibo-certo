\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

\echo ''
\echo '── 25. Tarefas: privadas de quem as escreve ────────────────────'
SET ROLE authenticated;
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.permite($$INSERT INTO public.contabilista_tarefas (contabilista_id, titulo, estado, prazo)
  VALUES ('11111111-1111-1111-1111-111111111111','Entregar o IVA do 3.º trimestre','por_tratar','2026-11-15')$$,
  'contabilista cria uma tarefa');

SELECT t.recusa($$INSERT INTO public.contabilista_tarefas (contabilista_id, titulo)
  VALUES ('55555555-5555-5555-5555-555555555555','Tarefa na lista de outro')$$,
  'criar uma tarefa na lista de outro contabilista');

SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_tarefas$$, 0,
  'outro contabilista não vê tarefas alheias');
SELECT t.entrar('77777777-7777-7777-7777-777777777777');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_tarefas$$, 0,
  'o cliente não vê as tarefas que o contabilista escreve sobre o trabalho dele');
SELECT t.entrar('44444444-4444-4444-4444-444444444444');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_tarefas$$, 0,
  'a administração também não');

\echo ''
\echo '── 26. «Entregue» e a data andam juntos ────────────────────────'
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.permite($$UPDATE public.contabilista_tarefas SET estado='entregue'
  WHERE contabilista_id='11111111-1111-1111-1111-111111111111'$$, 'marcar entregue');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_tarefas
  WHERE estado='entregue' AND concluido_em IS NOT NULL$$, 1,
  'a data de conclusão apareceu sozinha');

SELECT t.permite($$UPDATE public.contabilista_tarefas SET estado='em_curso'
  WHERE contabilista_id='11111111-1111-1111-1111-111111111111'$$, 'reabrir');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_tarefas
  WHERE concluido_em IS NULL$$, 1,
  'ao reabrir, a data de conclusão desapareceu — não ficam duas verdades');

\echo ''
\echo '── 27. Passos, e nunca percentagens ────────────────────────────'
DO $$
DECLARE tf uuid;
BEGIN
  SELECT id INTO tf FROM public.contabilista_tarefas
   WHERE contabilista_id='11111111-1111-1111-1111-111111111111' LIMIT 1;
  INSERT INTO public.contabilista_tarefa_passos (tarefa_id, texto, ordem) VALUES
    (tf,'Pedir os extratos ao cliente',1),
    (tf,'Conferir o e-fatura',2),
    (tf,'Submeter',3);
  RAISE NOTICE '  ok  · três passos numa tarefa';
END $$;

SELECT t.conta($$SELECT count(*) FROM public.contabilista_tarefa_passos$$, 3,
  'o dono lê os passos');
SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_tarefa_passos$$, 0,
  'os passos seguem a tarefa: quem não vê a tarefa não vê os passos');

\echo ''
\echo '── 28. Tipos de consulta ───────────────────────────────────────'
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.permite($$INSERT INTO public.contabilista_tipos_consulta
  (contabilista_id, nome, duracao_min, preco_cents)
  VALUES ('11111111-1111-1111-1111-111111111111','Primeira conversa',20,0)$$,
  'um tipo de consulta grátis — zero é um preço legítimo');
SELECT t.permite($$INSERT INTO public.contabilista_tipos_consulta
  (contabilista_id, nome, duracao_min, preco_cents)
  VALUES ('11111111-1111-1111-1111-111111111111','Fecho de contas',120,18000)$$,
  'e outro de duas horas');
SELECT t.recusa($$INSERT INTO public.contabilista_tipos_consulta
  (contabilista_id, nome, duracao_min, preco_cents)
  VALUES ('11111111-1111-1111-1111-111111111111','Meia hora a mais',300,1000)$$,
  'uma consulta de cinco horas');

-- O diretório mostra-os a quem ainda não é cliente: é o que permite
-- perceber o que se pode marcar, e por quanto.
SET ROLE anon;
SELECT t.sair();
SELECT t.conta($$SELECT count(*) FROM public.contabilista_tipos_consulta$$, 2,
  'anónimo vê os tipos de um contabilista aprovado');

SET ROLE authenticated;
SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.recusa($$UPDATE public.contabilista_tipos_consulta SET preco_cents=1
  WHERE contabilista_id='11111111-1111-1111-1111-111111111111'$$,
  'outro contabilista mexe nos preços alheios');
