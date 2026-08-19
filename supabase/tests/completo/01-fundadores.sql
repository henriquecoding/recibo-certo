-- ═══════════════════════════════════════════════════════════════════════
--  O PROGRAMA FUNDADOR — comportamento, contra Postgres a sério
--  ---------------------------------------------------------------------
--  Corre no ESQUEMA COMPLETO (ver a segunda etapa de `scripts/testar-rls.sh`),
--  e não no de 042-053 como os testes da pasta acima: o benefício de
--  fundador vive em cima da progressão e dos pagamentos, e sem essas
--  migrações não há `comissao_bps_do_contabilista` para verificar.
--
--  ⚠️ A RAZÃO DE ESTE FICHEIRO EXISTIR
--  -----------------------------------
--  Tinha sido construído o programa inteiro — tabela, lugares, cartão no
--  ecrã, página a prometer 5% — e o número que a Stripe cobra vinha de
--  `comissao_bps_do_contabilista`, que não sabia que o programa existia.
--  Um fundador via 5% em todo o lado e pagava 10%. Nenhum teste de
--  TypeScript podia apanhar isso, porque a conta é toda em SQL.
--
--  A asserção que importa mais está na secção da comissão. As outras
--  guardam as decisões que se tomaram à volta dela: suspender não dá o
--  lugar a outro, recusar dá, e reaprovar não cria um segundo.
\set ON_ERROR_STOP on
CREATE SCHEMA IF NOT EXISTS t;
SET client_min_messages = notice;

CREATE OR REPLACE FUNCTION t.eq(got anyelement, want anyelement, rotulo text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'FALHA · %: esperava %, veio %', rotulo, want, got;
  END IF;
  RAISE NOTICE '  ok  · %', rotulo;
END; $$;

-- Doze contabilistas, aprovados por ordem.
DO $$
DECLARE i integer; u uuid;
BEGIN
  FOR i IN 1..12 LOOP
    u := ('f0000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    INSERT INTO auth.users (id, email) VALUES (u, 'cc' || i || '@exemplo.pt')
      ON CONFLICT DO NOTHING;
    INSERT INTO public.contabilistas (user_id, slug, nome, estado)
      VALUES (u, 'cc-' || i, 'Contabilista ' || i, 'pendente')
      ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

\echo '── Os lugares atribuem-se por ordem de aprovação ───────────────'
DO $$
DECLARE i integer;
BEGIN
  FOR i IN 1..12 LOOP
    UPDATE public.contabilistas SET estado = 'aprovado'
     WHERE user_id = ('f0000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
  END LOOP;
END $$;

SELECT t.eq((SELECT count(*)::int FROM public.contabilista_fundadores WHERE libertado_em IS NULL),
  10, 'aprovar doze dá exatamente dez lugares');
SELECT t.eq((SELECT numero FROM public.contabilista_fundadores
             WHERE contabilista_id='f0000000-0000-4000-8000-000000000001'), 1::smallint,
  'o primeiro a ser aprovado é o n.º 1');
SELECT t.eq((SELECT numero FROM public.contabilista_fundadores
             WHERE contabilista_id='f0000000-0000-4000-8000-000000000010'), 10::smallint,
  'o décimo é o n.º 10');
SELECT t.eq((SELECT count(*)::int FROM public.contabilista_fundadores
             WHERE contabilista_id IN ('f0000000-0000-4000-8000-000000000011',
                                       'f0000000-0000-4000-8000-000000000012')), 0,
  'o 11.º e o 12.º ficam de fora');
SELECT t.eq((SELECT restantes FROM public.lugares_fundadores()), 0,
  'o contador diz que esgotou');

\echo '── ⚠️ A COMISSÃO QUE VAI À FATURA ─────────────────────────────'
SELECT t.eq(public.comissao_bps_do_contabilista('f0000000-0000-4000-8000-000000000001'),
  500, 'um fundador é cobrado a 5%, e não a 10%');
SELECT t.eq(public.comissao_bps_do_contabilista('f0000000-0000-4000-8000-000000000011'),
  1000, 'quem não é fundador é cobrado ao patamar Base');

\echo '── Suspender guarda o lugar e para o benefício ────────────────'
UPDATE public.contabilistas SET estado='suspenso'
 WHERE user_id='f0000000-0000-4000-8000-000000000002';
SELECT t.eq((SELECT count(*)::int FROM public.contabilista_fundadores
             WHERE contabilista_id='f0000000-0000-4000-8000-000000000002'
               AND libertado_em IS NULL), 1, 'suspenso mantém o lugar');
SELECT t.eq(public.e_fundador_ativo('f0000000-0000-4000-8000-000000000002'), false,
  'mas o benefício suspende-se');
SELECT t.eq(public.comissao_bps_do_contabilista('f0000000-0000-4000-8000-000000000002'),
  1000, 'e volta a ser cobrado ao patamar');
SELECT t.eq((SELECT restantes FROM public.lugares_fundadores()), 0,
  'o lugar não vai para outro enquanto estiver só suspenso');

UPDATE public.contabilistas SET estado='aprovado'
 WHERE user_id='f0000000-0000-4000-8000-000000000002';
SELECT t.eq(public.comissao_bps_do_contabilista('f0000000-0000-4000-8000-000000000002'),
  500, 'levantada a suspensão, o benefício volta');

\echo '── Recusar liberta, e o lugar mais baixo é reaproveitado ──────'
UPDATE public.contabilistas SET estado='recusado'
 WHERE user_id='f0000000-0000-4000-8000-000000000003';
SELECT t.eq((SELECT restantes FROM public.lugares_fundadores()), 1,
  'uma conta recusada devolve o lugar');

UPDATE public.contabilistas SET estado='pendente'
 WHERE user_id='f0000000-0000-4000-8000-000000000011';
UPDATE public.contabilistas SET estado='aprovado'
 WHERE user_id='f0000000-0000-4000-8000-000000000011';
SELECT t.eq((SELECT numero FROM public.contabilista_fundadores
             WHERE contabilista_id='f0000000-0000-4000-8000-000000000011'), 3::smallint,
  'o lugar livre mais baixo (3) é o que se dá — e não «ocupados + 1»');
SELECT t.eq((SELECT count(*)::int FROM public.contabilista_fundadores WHERE libertado_em IS NULL),
  10, 'continuam a ser dez, nunca onze');

\echo '── Reaprovar não dá um segundo lugar ──────────────────────────'
UPDATE public.contabilistas SET estado='suspenso' WHERE user_id='f0000000-0000-4000-8000-000000000001';
UPDATE public.contabilistas SET estado='aprovado' WHERE user_id='f0000000-0000-4000-8000-000000000001';
SELECT t.eq((SELECT count(*)::int FROM public.contabilista_fundadores
             WHERE contabilista_id='f0000000-0000-4000-8000-000000000001'), 1,
  'reaprovar mantém o mesmo lugar, e um só');
SELECT t.eq((SELECT numero FROM public.contabilista_fundadores
             WHERE contabilista_id='f0000000-0000-4000-8000-000000000001'), 1::smallint,
  'e o número não muda');

\echo ''
\echo 'FUNDADORES: comportamento verificado.'
