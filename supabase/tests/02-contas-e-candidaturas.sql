\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

\echo ''
\echo '── 1. Ninguém se auto-aprova como contabilista ─────────────────'
SET ROLE authenticated;
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.recusa($$INSERT INTO public.contabilistas (user_id, slug, nome, estado)
  VALUES ('33333333-3333-3333-3333-333333333333','intruso','Intruso','aprovado')$$,
  'utilizador insere-se a si próprio como aprovado');
SELECT t.recusa($$INSERT INTO public.contabilistas (user_id, slug, nome)
  VALUES ('33333333-3333-3333-3333-333333333333','intruso2','Intruso')$$,
  'utilizador insere-se mesmo sem pedir estado');

\echo ''
\echo '── 2. Um contabilista não muda o seu próprio estado nem o endereço ──'
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
-- Escrever 'aprovado' por cima de 'aprovado' não muda nada e é inofensivo.
-- O que interessa é: (a) sair de aprovado para outro estado, e (b) voltar de
-- suspenso para aprovado. São essas as transições que dariam acesso indevido.
SELECT t.recusa($$UPDATE public.contabilistas SET estado='suspenso'
  WHERE user_id='11111111-1111-1111-1111-111111111111'$$,
  'contabilista aprovado muda o seu estado');
SELECT t.recusa($$UPDATE public.contabilistas SET estado='recusado'
  WHERE user_id='11111111-1111-1111-1111-111111111111'$$,
  'contabilista aprovado marca-se como recusado');
SELECT t.recusa($$UPDATE public.contabilistas SET slug='ana-premium'
  WHERE user_id='11111111-1111-1111-1111-111111111111'$$,
  'contabilista muda o seu endereço público');
SELECT t.permite($$UPDATE public.contabilistas SET bio='Especialista em recibos verdes.'
  WHERE user_id='11111111-1111-1111-1111-111111111111'$$,
  'contabilista edita a sua bio');

-- O caso que mais importa: um contabilista SUSPENSO a reabilitar-se.
-- A cláusula USING da política exige estado='aprovado' na linha ANTIGA, por
-- isso quem está suspenso não alcança sequer a sua própria linha para a
-- escrever — e é por isso que a suspensão é uma sanção e não um aviso.
SELECT t.entrar('66666666-6666-6666-6666-666666666666');
SELECT t.recusa($$UPDATE public.contabilistas SET estado='aprovado'
  WHERE user_id='66666666-6666-6666-6666-666666666666'$$,
  'candidato pendente aprova-se a si próprio');
SELECT t.conta($$SELECT count(*) FROM public.contabilistas
  WHERE user_id='66666666-6666-6666-6666-666666666666' AND estado='pendente'$$, 1,
  'continua pendente depois da tentativa');
SELECT t.entrar('11111111-1111-1111-1111-111111111111');

\echo ''
\echo '── 3. As fronteiras do desconto são da base de dados ───────────'
SELECT t.recusa($$UPDATE public.contabilistas SET fidelidade_desconto_pct=90
  WHERE user_id='11111111-1111-1111-1111-111111111111'$$, 'desconto de 90%');
SELECT t.recusa($$UPDATE public.contabilistas SET fidelidade_desconto_pct=5
  WHERE user_id='11111111-1111-1111-1111-111111111111'$$, 'desconto de 5%');
SELECT t.recusa($$UPDATE public.contabilistas SET fidelidade_meta=99
  WHERE user_id='11111111-1111-1111-1111-111111111111'$$, 'cartão de 99 consultas');
SELECT t.permite($$UPDATE public.contabilistas SET fidelidade_desconto_pct=50
  WHERE user_id='11111111-1111-1111-1111-111111111111'$$, 'desconto de 50%');
SELECT t.recusa($$UPDATE public.contabilistas
  SET fidelidade_ativa=true, preco_consulta_cents=0
  WHERE user_id='11111111-1111-1111-1111-111111111111'$$, 'cartão ativo sem preço');
SELECT t.permite($$UPDATE public.contabilistas SET fidelidade_desconto_pct=20
  WHERE user_id='11111111-1111-1111-1111-111111111111'$$, 'repor 20%');

\echo ''
\echo '── 4. O diretório público só mostra aprovados ──────────────────'
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT t.conta($$SELECT count(*) FROM public.contabilistas$$, 2,
  'anónimo vê os 2 aprovados e não a candidata pendente');
SELECT t.conta($$SELECT count(*) FROM public.contabilistas WHERE slug='carla-pendente'$$, 0,
  'anónimo não vê quem está por aprovar');

\echo ''
\echo '── 5. Candidaturas: cada um a sua; a administração vê todas ────'
SET ROLE authenticated;
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.permite($$INSERT INTO public.contabilista_pedidos
  (user_id, nome, email_contacto, mensagem, credenciais)
  VALUES ('33333333-3333-3333-3333-333333333333','Intruso','i@e.pt',
          'Quero acesso ao painel de gestao de contabilista.','OCC 12345')$$,
  'candidatar-se');
SELECT t.recusa($$INSERT INTO public.contabilista_pedidos
  (user_id, nome, email_contacto, mensagem, estado)
  VALUES ('33333333-3333-3333-3333-333333333333','Intruso','i@e.pt',
          'Candidatura ja aprovada por mim proprio.','aprovado')$$,
  'candidatar-se já aprovado');
SELECT t.recusa($$INSERT INTO public.contabilista_pedidos
  (user_id, nome, email_contacto, mensagem)
  VALUES ('22222222-2222-2222-2222-222222222222','Outro','o@e.pt',
          'Candidatura em nome de outra pessoa qualquer.')$$,
  'candidatar-se em nome de outrem');
SELECT t.recusa($$UPDATE public.contabilista_pedidos SET estado='aprovado'
  WHERE user_id='33333333-3333-3333-3333-333333333333'$$,
  'candidato aprova a sua própria candidatura');

SELECT t.entrar('22222222-2222-2222-2222-222222222222');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_pedidos$$, 0,
  'cliente não vê a candidatura de outra pessoa (nem as credenciais)');

SELECT t.entrar('44444444-4444-4444-4444-444444444444');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_pedidos$$, 1,
  'a administração vê a candidatura');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_pedidos WHERE credenciais IS NOT NULL$$, 1,
  'a administração lê as credenciais — é para isso que foram enviadas');
