\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

\echo ''
\echo '── 9. Fidelidade: ninguém se oferece carimbos nem cupões ───────'
SET ROLE authenticated;
SELECT t.entrar('22222222-2222-2222-2222-222222222222');
SELECT t.recusa($$INSERT INTO public.fidelidade_cupoes
  (codigo, contabilista_id, cliente_id, percentagem, valor_base_cents)
  VALUES ('RC-AAAA-BBBB','11111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222222',50,12000)$$,
  'cliente emite um cupão de 50% para si próprio');
SELECT t.recusa($$INSERT INTO public.fidelidade_cartoes
  (contabilista_id, cliente_id, carimbos, meta, desconto_pct, preco_base_cents)
  VALUES ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
          4,5,50,12000)$$, 'cliente abre um cartão quase cheio');

-- Nem o contabilista escreve à mão.
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.recusa($$INSERT INTO public.fidelidade_cartoes
  (contabilista_id, cliente_id, carimbos, meta, desconto_pct, preco_base_cents)
  VALUES ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
          0,5,20,12000)$$, 'contabilista abre um cartão à mão');

-- E `carimbar_consulta` não está ao alcance de `authenticated`.
SELECT t.recusa($$SELECT public.carimbar_consulta(
  '00000000-0000-0000-0000-000000000001'::uuid, 'RC-XXXX-YYYY')$$,
  'authenticated chama carimbar_consulta directamente');

\echo ''
\echo '── 10. O motor de carimbos, chamado pelo servidor ──────────────'
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

-- Meta de 3 e desconto de 20% para a Ana (definidos no arranque).
-- Três consultas realizadas devem dar exatamente um cupão.
INSERT INTO public.agendamentos (id, contabilista_id, cliente_id, inicio, fim, estado) VALUES
  ('aaaaaaa1-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222','2026-10-01T09:00:00Z','2026-10-01T10:00:00Z','realizada'),
  ('aaaaaaa1-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222','2026-10-08T09:00:00Z','2026-10-08T10:00:00Z','realizada'),
  ('aaaaaaa1-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222','2026-10-15T09:00:00Z','2026-10-15T10:00:00Z','realizada'),
  ('aaaaaaa1-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222','2026-10-22T09:00:00Z','2026-10-22T10:00:00Z','pedido');

DO $$
DECLARE r jsonb;
BEGIN
  r := public.carimbar_consulta('aaaaaaa1-0000-0000-0000-000000000001','RC-C001-C001');
  ASSERT (r->>'ok')::boolean AND (r->>'carimbos')::int = 1 AND NOT (r->>'completou')::boolean,
    format('1.º carimbo inesperado: %s', r);
  RAISE NOTICE '  ok  · 1.º carimbo: % de %', r->>'carimbos', r->>'meta';

  -- Repetir o MESMO agendamento não pode dar um segundo carimbo.
  r := public.carimbar_consulta('aaaaaaa1-0000-0000-0000-000000000001','RC-C002-C002');
  ASSERT (r->>'repetido')::boolean AND (r->>'carimbos')::int = 1,
    format('idempotência falhou: %s', r);
  RAISE NOTICE '  ok  · carimbar a mesma consulta outra vez não conta';

  r := public.carimbar_consulta('aaaaaaa1-0000-0000-0000-000000000002','RC-C003-C003');
  ASSERT (r->>'carimbos')::int = 2 AND NOT (r->>'completou')::boolean, format('2.º: %s', r);
  RAISE NOTICE '  ok  · 2.º carimbo';

  r := public.carimbar_consulta('aaaaaaa1-0000-0000-0000-000000000003','RC-C004-C004');
  ASSERT (r->>'completou')::boolean, format('devia ter completado: %s', r);
  ASSERT (r->>'percentagem')::int = 20, format('percentagem errada: %s', r);
  ASSERT (r->>'valor_base_cents')::int = 12000, format('valor base errado: %s', r);
  RAISE NOTICE '  ok  · 3.º carimbo fecha o cartão e emite cupão de %%% sobre % cêntimos',
    r->>'percentagem', r->>'valor_base_cents';

  -- Uma consulta que não foi realizada não carimba.
  r := public.carimbar_consulta('aaaaaaa1-0000-0000-0000-000000000004','RC-C005-C005');
  ASSERT NOT (r->>'ok')::boolean AND r->>'motivo' = 'consulta_nao_realizada',
    format('consulta por realizar carimbou: %s', r);
  RAISE NOTICE '  ok  · uma consulta ainda não realizada não carimba';
END $$;

SELECT t.conta($$SELECT count(*) FROM public.fidelidade_cupoes$$, 1,
  'exatamente um cupão emitido');
SELECT t.conta($$SELECT count(*) FROM public.fidelidade_cartoes WHERE NOT completo$$, 1,
  'um cartão novo aberto a seguir');
SELECT t.conta($$SELECT carimbos FROM public.fidelidade_cartoes WHERE NOT completo$$, 0,
  'o cartão novo começa a zero');

\echo ''
\echo '── 11. A percentagem fica congelada no cartão em curso ─────────'
-- A Ana baixa de 20% para 10% a meio do cartão seguinte.
UPDATE public.contabilistas SET fidelidade_desconto_pct = 10
  WHERE user_id='11111111-1111-1111-1111-111111111111';

INSERT INTO public.agendamentos (id, contabilista_id, cliente_id, inicio, fim, estado) VALUES
  ('aaaaaaa2-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222','2026-11-01T09:00:00Z','2026-11-01T10:00:00Z','realizada'),
  ('aaaaaaa2-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222','2026-11-08T09:00:00Z','2026-11-08T10:00:00Z','realizada'),
  ('aaaaaaa2-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222','2026-11-15T09:00:00Z','2026-11-15T10:00:00Z','realizada');

DO $$
DECLARE r jsonb;
BEGIN
  PERFORM public.carimbar_consulta('aaaaaaa2-0000-0000-0000-000000000001','RC-D001-D001');
  PERFORM public.carimbar_consulta('aaaaaaa2-0000-0000-0000-000000000002','RC-D002-D002');
  r := public.carimbar_consulta('aaaaaaa2-0000-0000-0000-000000000003','RC-D003-D003');
  ASSERT (r->>'completou')::boolean, format('devia completar: %s', r);
  -- O cartão foi ABERTO quando a configuração ainda era 20%.
  ASSERT (r->>'percentagem')::int = 20,
    format('a promessa do cartão em curso mudou para %s', r->>'percentagem');
  RAISE NOTICE '  ok  · quem começou a 20%% recebeu 20%%, apesar da nova config de 10%%';
END $$;

SELECT t.conta($$SELECT desconto_pct FROM public.fidelidade_cartoes WHERE NOT completo$$, 10,
  'o cartão aberto a seguir já usa os 10% novos');

\echo ''
\echo '── 12. Terminar o vínculo fecha o acesso ao histórico ──────────'
SET ROLE authenticated;
SELECT t.entrar('22222222-2222-2222-2222-222222222222');
SELECT t.permite($$INSERT INTO public.partilhas
  (contabilista_id, cliente_id, tipo, titulo, conteudo, consentimento_versao)
  VALUES ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
          'resumo_anual','Resumo 2026','{"ano":2026}'::jsonb,'2026-08-1')$$, 'nova partilha');
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.partilhas WHERE estado='enviada'$$, 1,
  'contabilista lê enquanto o vínculo dura');

SELECT t.entrar('22222222-2222-2222-2222-222222222222');
SELECT t.rpc_ok($$SELECT public.decidir_vinculo(
    (SELECT id FROM public.contabilista_vinculos WHERE cliente_id='22222222-2222-2222-2222-222222222222' AND contabilista_id='11111111-1111-1111-1111-111111111111' LIMIT 1), 'terminar')$$,
  'cliente termina o vínculo');

SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.partilhas$$, 0,
  'terminado o vínculo, o contabilista deixa de ler tudo o que recebeu');
SELECT t.entrar('22222222-2222-2222-2222-222222222222');
-- Duas: a de outubro (revogada) e o resumo anual. Revogar esconde-a de quem
-- a recebeu, não de quem a enviou.
SELECT t.conta($$SELECT count(*) FROM public.partilhas$$, 2,
  'o cliente continua a ver o seu próprio histórico, revogadas incluídas');

\echo ''
\echo '── 13. Documentos: cada um só na sua pasta ─────────────────────'
SELECT t.entrar('22222222-2222-2222-2222-222222222222');
SELECT t.permite($$INSERT INTO storage.objects (bucket_id, name)
  VALUES ('contabilista-documentos','22222222-2222-2222-2222-222222222222/cedula.pdf')$$,
  'envia para a sua própria pasta');
SELECT t.recusa($$INSERT INTO storage.objects (bucket_id, name)
  VALUES ('contabilista-documentos','11111111-1111-1111-1111-111111111111/falso.pdf')$$,
  'envia para a pasta de outra pessoa');
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.conta($$SELECT count(*) FROM storage.objects
  WHERE bucket_id='contabilista-documentos'$$, 0, 'terceiro não lê documentos alheios');
SELECT t.entrar('44444444-4444-4444-4444-444444444444');
SELECT t.conta($$SELECT count(*) FROM storage.objects
  WHERE bucket_id='contabilista-documentos'$$, 1, 'a administração lê, para poder decidir');
SELECT t.conta($$SELECT count(*) FROM storage.buckets
  WHERE id='contabilista-documentos' AND NOT public$$, 1, 'o bucket é privado');
