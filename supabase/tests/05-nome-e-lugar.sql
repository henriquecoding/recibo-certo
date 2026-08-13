\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

\echo ''
\echo '── 14. O nome viaja no vínculo, e é o cliente que o dá ─────────'
SET ROLE authenticated;

-- 5555 ainda não tem vínculo com a Ana (1111). Pede um, e diz como quer ser
-- tratado. O nome NÃO vem da conta: vem deste formulário.
SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.permite($$INSERT INTO public.contabilista_vinculos
  (contabilista_id, cliente_id, nome_cliente, email_cliente)
  VALUES ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555',
          'Bruno C.','bruno@exemplo.pt')$$,
  'cliente pede vínculo e escolhe o nome por que quer ser tratado');

SELECT t.recusa($$INSERT INTO public.contabilista_vinculos
  (contabilista_id, cliente_id, nome_cliente)
  VALUES ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','X')$$,
  'nome com um caracter só');

-- Corrigir o nome não pode obrigar a terminar a relação.
SELECT t.permite($$UPDATE public.contabilista_vinculos SET nome_cliente='Bruno Costa'
  WHERE cliente_id='55555555-5555-5555-5555-555555555555'$$,
  'cliente corrige o nome sem terminar o acompanhamento');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_vinculos
  WHERE cliente_id='55555555-5555-5555-5555-555555555555' AND estado='pendente'$$, 1,
  'o vínculo continua pendente depois de corrigir o nome');

-- O que a política deixou de proibir, o gatilho continua a proibir.
SELECT t.recusa($$UPDATE public.contabilista_vinculos SET estado='ativo'
  WHERE cliente_id='55555555-5555-5555-5555-555555555555'$$,
  'cliente aceita-se a si próprio pela porta que a política abriu');
SELECT t.recusa($$UPDATE public.contabilista_vinculos SET origem='contabilista'
  WHERE cliente_id='55555555-5555-5555-5555-555555555555'$$,
  'cliente reescreve quem iniciou o vínculo');
SELECT t.recusa($$UPDATE public.contabilista_vinculos
  SET contabilista_id='55555555-5555-5555-5555-555555555555'
  WHERE cliente_id='55555555-5555-5555-5555-555555555555'$$,
  'cliente aponta o vínculo a outro contabilista');

\echo ''
\echo '── 15. Quem lê o nome ──────────────────────────────────────────'
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_vinculos
  WHERE cliente_id='55555555-5555-5555-5555-555555555555' AND nome_cliente='Bruno Costa'$$, 1,
  'o contabilista destinatário lê o nome');

-- Outro contabilista aprovado não lê nada disto.
SELECT t.entrar('66666666-6666-6666-6666-666666666666');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_vinculos
  WHERE nome_cliente IS NOT NULL$$, 0,
  'quem não é parte do vínculo não lê o nome de ninguém');

\echo ''
\echo '── 16. Terminar leva o nome e o contacto com ele ───────────────'
SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.permite($$UPDATE public.contabilista_vinculos
  SET estado='terminado', terminado_em=now()
  WHERE cliente_id='55555555-5555-5555-5555-555555555555'$$, 'cliente termina');

RESET ROLE;
SELECT t.conta($$SELECT count(*) FROM public.contabilista_vinculos
  WHERE cliente_id='55555555-5555-5555-5555-555555555555'
    AND (nome_cliente IS NOT NULL OR email_cliente IS NOT NULL)$$, 0,
  'o nome e o email desapareceram no instante em que a relação terminou');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_vinculos
  WHERE cliente_id='55555555-5555-5555-5555-555555555555'$$, 1,
  'a linha do vínculo fica — o que sai são os dados pessoais');

\echo ''
\echo '── 17. O contabilista também não fica com o nome ───────────────'
-- Terminar do lado do contabilista tem de apagar o mesmo. Se só o gatilho do
-- cliente limpasse, bastava ser o contabilista a terminar para ficar com tudo.
SET ROLE authenticated;
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.permite($$UPDATE public.contabilista_vinculos SET nome_cliente='Carla T.'
  WHERE cliente_id='33333333-3333-3333-3333-333333333333'$$, 'cliente 3333 dá o nome');
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.permite($$UPDATE public.contabilista_vinculos SET estado='terminado', terminado_em=now()
  WHERE cliente_id='33333333-3333-3333-3333-333333333333'
    AND contabilista_id='11111111-1111-1111-1111-111111111111'$$,
  'contabilista termina o acompanhamento');
RESET ROLE;
SELECT t.conta($$SELECT count(*) FROM public.contabilista_vinculos
  WHERE cliente_id='33333333-3333-3333-3333-333333333333' AND nome_cliente IS NOT NULL$$, 0,
  'terminado pelo contabilista, o nome desaparece na mesma');
