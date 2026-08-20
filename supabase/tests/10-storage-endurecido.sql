\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

-- O balde dos anexos aceitava tudo: o tamanho, o tipo, o número de
-- ficheiros e o caminho vinham do browser (migração 048). Cada asserção
-- aqui FALHAVA antes dela.

\echo ''
\echo '── 44. Cenário dos anexos ──────────────────────────────────────'
RESET ROLE;
SELECT t.sair();

INSERT INTO auth.users (id, email) VALUES
  ('c1c1c1c1-0000-0000-0000-00000000000c','anexos-cliente@exemplo.pt')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, email, role) VALUES
  ('c1c1c1c1-0000-0000-0000-00000000000c','anexos-cliente@exemplo.pt','user')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contabilista_vinculos (id, contabilista_id, cliente_id, estado, nome_cliente)
VALUES ('eeee0000-0000-0000-0000-00000000000e',
        '11111111-1111-1111-1111-111111111111',
        'c1c1c1c1-0000-0000-0000-00000000000c','ativo','Rui')
ON CONFLICT DO NOTHING;

INSERT INTO public.contabilista_mensagens (id, vinculo_id, autor_id, corpo)
VALUES ('ffff0000-0000-0000-0000-00000000000f',
        'eeee0000-0000-0000-0000-00000000000e',
        'c1c1c1c1-0000-0000-0000-00000000000c','Envio os documentos.')
ON CONFLICT DO NOTHING;

SET ROLE authenticated;

\echo ''
\echo '── 45. O balde recusa o que é grande ou do tipo errado ─────────'
SELECT t.conta($$SELECT count(*) FROM storage.buckets
  WHERE id='contabilista-anexos' AND file_size_limit = 10485760$$, 1,
  'o limite de dez megabytes está no balde, e não só no browser');

SELECT t.conta($$SELECT count(*) FROM storage.buckets
  WHERE id='contabilista-anexos'
    AND NOT ('text/html' = ANY(allowed_mime_types))
    AND NOT ('image/svg+xml' = ANY(allowed_mime_types))$$, 1,
  'nem HTML nem SVG entram — os dois executam ao serem abertos');

\echo ''
\echo '── 46. Sem vaga não se escreve ─────────────────────────────────'
SELECT t.entrar('c1c1c1c1-0000-0000-0000-00000000000c');

-- ⚠️ ISTO ERA POSSÍVEL. A política antiga perguntava só «és parte deste
-- vínculo?» — e a resposta sim dava para escrever onde se quisesse.
SELECT t.recusa($$INSERT INTO storage.objects (bucket_id, name, metadata)
  VALUES ('contabilista-anexos','eeee0000-0000-0000-0000-00000000000e/a-meu-gosto.pdf',
          '{"size":1000,"mimetype":"application/pdf"}'::jsonb)$$,
  'escrever num caminho à escolha, sem vaga');

-- Quem não escreveu a mensagem não lhe anexa nada. Anexar a uma mensagem
-- alheia era escrever dentro da conversa de outra pessoa.
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.rpc_recusa($$SELECT public.abrir_vaga_de_anexo(
  'ffff0000-0000-0000-0000-00000000000f','application/pdf',1000)$$,
  'mensagem_nao_e_tua', 'abrir vaga numa mensagem alheia');

-- Nem o contabilista, que é a outra parte da conversa: a mensagem é de quem
-- a escreveu, e os anexos dela também.
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.rpc_recusa($$SELECT public.abrir_vaga_de_anexo(
  'ffff0000-0000-0000-0000-00000000000f','application/pdf',1000)$$,
  'mensagem_nao_e_tua', 'a outra parte anexa à mensagem de quem escreveu');

SELECT t.entrar('c1c1c1c1-0000-0000-0000-00000000000c');

\echo ''
\echo '── 47. A vaga diz onde, e uma só vez ───────────────────────────'
DO $$
DECLARE r jsonb; v_caminho text; v_id uuid;
BEGIN
  r := public.abrir_vaga_de_anexo('ffff0000-0000-0000-0000-00000000000f','application/pdf', 200000);
  ASSERT (r->>'ok')::boolean, format('devia abrir: %s', r);
  v_caminho := r->>'caminho';
  v_id := (r->>'id')::uuid;

  -- O caminho é escolhido pelo servidor e começa pelo vínculo: é o que faz
  -- terminar o acompanhamento fechar também os ficheiros.
  ASSERT v_caminho LIKE 'eeee0000-0000-0000-0000-00000000000e/%',
    format('o caminho não começa pelo vínculo: %s', v_caminho);
  ASSERT (r->>'ordinal')::int = 1, format('primeiro anexo, ordinal %s', r->>'ordinal');
  RAISE NOTICE '  ok  · a vaga devolve um caminho que o servidor escolheu';

  INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES ('contabilista-anexos', v_caminho,
            '{"size":200000,"mimetype":"application/pdf"}'::jsonb);
  RAISE NOTICE '  ok  · com a vaga aberta, o ficheiro entra';

  PERFORM set_config('t.caminho', v_caminho, false);
  PERFORM set_config('t.vaga', v_id::text, false);
END $$;

-- Recusado por tamanho e por tipo ANTES de existir vaga nenhuma: a
-- verificação está do lado de cá, e não na boa vontade de quem envia.
SELECT t.rpc_recusa($$SELECT public.abrir_vaga_de_anexo(
  'ffff0000-0000-0000-0000-00000000000f','application/pdf', 20000000)$$,
  'tamanho_recusado', 'pedir vaga para vinte megabytes');
SELECT t.rpc_recusa($$SELECT public.abrir_vaga_de_anexo(
  'ffff0000-0000-0000-0000-00000000000f','text/html', 1000)$$,
  'tipo_recusado', 'pedir vaga para um ficheiro HTML');

\echo ''
\echo '── 48. Cinco anexos, e o sexto não cabe ────────────────────────'
DO $$
DECLARE r jsonb; i integer;
BEGIN
  -- Já há um. Faltam quatro para o teto.
  FOR i IN 2..5 LOOP
    r := public.abrir_vaga_de_anexo('ffff0000-0000-0000-0000-00000000000f','image/png', 5000);
    ASSERT (r->>'ok')::boolean, format('a vaga %s devia abrir: %s', i, r);
  END LOOP;
  RAISE NOTICE '  ok  · cinco vagas abrem';

  r := public.abrir_vaga_de_anexo('ffff0000-0000-0000-0000-00000000000f','image/png', 5000);
  ASSERT NOT (r->>'ok')::boolean, format('a sexta não devia abrir: %s', r);
  ASSERT r->>'motivo' = 'sem_vagas', format('motivo inesperado: %s', r);
  RAISE NOTICE '  ok  · a sexta não abre — o teto é uma restrição, não uma contagem';
END $$;

\echo ''
\echo '── 49. A linha do anexo não se inventa ─────────────────────────'
-- ⚠️ ISTO ERA POSSÍVEL. Enquanto o cliente escrevia em `contabilista_anexos`,
-- inventava-se um caminho, um tamanho e um tipo sem existir objeto nenhum.
SELECT t.recusa($$INSERT INTO public.contabilista_anexos
  (mensagem_id, caminho, nome, bytes, tipo_mime)
  VALUES ('ffff0000-0000-0000-0000-00000000000f','inventado.pdf','Fatura',10,'application/pdf')$$,
  'escrever a linha do anexo à mão');
SELECT t.recusa($$SELECT public.fechar_vaga_de_anexo(
  current_setting('t.vaga')::uuid,'Fatura',200000)$$,
  'fechar a vaga sem ser o servidor');

\echo ''
\echo '── 50. Quem enviou pode apagar; mais ninguém ───────────────────'
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.recusa($$DELETE FROM storage.objects
  WHERE name = current_setting('t.caminho')$$,
  'um terceiro apaga o anexo de outra pessoa');
SELECT t.entrar('c1c1c1c1-0000-0000-0000-00000000000c');
SELECT t.permite($$DELETE FROM storage.objects
  WHERE name = current_setting('t.caminho')$$,
  'quem enviou apaga o que enviou');

\echo ''
\echo '── 51. Os órfãos são encontráveis ──────────────────────────────'
RESET ROLE;
SELECT t.sair();
-- Um envio que morreu a meio: a vaga abriu, o ficheiro subiu, e a linha
-- nunca chegou a existir. Ninguém o vê, e ocupa o plano em silêncio.
INSERT INTO storage.objects (bucket_id, name, metadata, created_at)
VALUES ('contabilista-anexos','eeee0000-0000-0000-0000-00000000000e/orfao',
        '{"size":900000,"mimetype":"application/pdf"}'::jsonb, now() - interval '3 hours');

-- ⚠️ E DOIS QUE NÃO SÃO ÓRFÃOS, e que a definição anterior teria apagado.
--
-- O balde `contabilista-anexos` não é só das mensagens: desde a 051/052,
-- os documentos dos casos e os anexos das propostas vivem lá, em `casos/…`.
-- Nenhum deles tem linha em `contabilista_anexos` — a única tabela que a
-- definição antiga conhecia. Ambos passavam no teste de «órfão» duas horas
-- depois de serem enviados.
--
-- A purga nunca chegou a correr em produção (fazia `DELETE FROM
-- storage.objects`, que o Supabase recusa), e foi só por isso que os
-- contratos e os documentos de casos ainda lá estão. Corrigir a remoção
-- sem corrigir a DEFINIÇÃO teria apagado tudo isso no dia seguinte.
INSERT INTO public.casos
  (id, cliente_id, referencia, nome_completo, nif, assunto, situacao, area, estado)
VALUES ('ca50d0c0-0000-4000-8000-00000000000a',
        'c1c1c1c1-0000-0000-0000-00000000000c',
        'RC-2026-9501', 'Cliente do Caso', '123456789',
        'IVA em atraso',
        'Tenho dois trimestres de IVA por entregar e preciso de ajuda.',
        'iva', 'submetido')
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.objects (bucket_id, name, metadata, created_at)
VALUES ('contabilista-anexos','casos/ca50d0c0-0000-4000-8000-00000000000a/1-doc',
        '{"size":1000,"mimetype":"application/pdf"}'::jsonb, now() - interval '3 hours')
ON CONFLICT DO NOTHING;
INSERT INTO public.caso_documentos (caso_id, caminho, nome, bytes, tipo_mime)
VALUES ('ca50d0c0-0000-4000-8000-00000000000a',
        'casos/ca50d0c0-0000-4000-8000-00000000000a/1-doc',
        'declaracao.pdf', 1000, 'application/pdf')
ON CONFLICT DO NOTHING;

-- E um envio ainda a decorrer: vaga aberta, por usar, dentro do prazo.
INSERT INTO storage.objects (bucket_id, name, metadata, created_at)
VALUES ('contabilista-anexos','casos/ca50d0c0-0000-4000-8000-00000000000a/2-avoar',
        '{"size":1000,"mimetype":"application/pdf"}'::jsonb, now() - interval '3 hours')
ON CONFLICT DO NOTHING;
INSERT INTO public.anexo_vagas
  (caso_id, pedida_por, caminho, ordinal, tipo_mime, bytes_max, expira_em)
VALUES ('ca50d0c0-0000-4000-8000-00000000000a',
        'c1c1c1c1-0000-0000-0000-00000000000c',
        'casos/ca50d0c0-0000-4000-8000-00000000000a/2-avoar',
        2, 'application/pdf', 1000, now() + interval '10 minutes')
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  ASSERT public.anexo_e_orfao('contabilista-anexos',
    'eeee0000-0000-0000-0000-00000000000e/orfao'),
    'o objeto sem nada que o reclame devia ser órfão';
  RAISE NOTICE '  ok  · o objeto sem dono é órfão';

  ASSERT NOT public.anexo_e_orfao('contabilista-anexos',
    'casos/ca50d0c0-0000-4000-8000-00000000000a/1-doc'),
    '⚠️ um documento de caso VIVO foi classificado como órfão';
  RAISE NOTICE '  ok  · um documento de caso não é órfão';

  ASSERT NOT public.anexo_e_orfao('contabilista-anexos',
    'casos/ca50d0c0-0000-4000-8000-00000000000a/2-avoar'),
    'um envio a decorrer foi classificado como órfão';
  RAISE NOTICE '  ok  · uma vaga aberta protege o objeto que está a subir';
END $$;

-- A reserva: deteta, regista, e entrega uma vez só.
DO $$
DECLARE v_n integer;
BEGIN
  SELECT count(*) INTO v_n
    FROM public.reservar_anexos_orfaos('2 hours', 200, '10 minutes');
  ASSERT v_n = 1, format('devia reservar um órfão, reservou %s', v_n);
  RAISE NOTICE '  ok  · o órfão de três horas foi reservado, e só ele';

  -- A segunda execução não o volta a entregar: está reservado, e a
  -- reserva ainda não caiu. É isto que impede duas execuções em paralelo
  -- de pedirem ao Storage a mesma remoção.
  SELECT count(*) INTO v_n
    FROM public.reservar_anexos_orfaos('2 hours', 200, '10 minutes');
  ASSERT v_n = 0, format('a segunda execução voltou a entregar %s caminho(s)', v_n);
  RAISE NOTICE '  ok  · a execução seguinte não repete o que está reservado';
END $$;

-- ⚠️ Fechar sem o objeto ter desaparecido NÃO escreve «removido». Sem
-- esta garantia, a metadata afirmava «apagado» sobre bytes que ficaram —
-- e essa mentira é pior do que o backlog, porque ninguém a procura.
DO $$
DECLARE r jsonb;
BEGIN
  r := public.fechar_purga_de_anexos(
         ARRAY['eeee0000-0000-0000-0000-00000000000e/orfao'], 'ensaio');
  ASSERT (r->>'removidos')::int = 0,
    'deu por removido um objeto que ainda está em storage.objects';
  ASSERT (r->>'pendentes')::int = 1, 'o caminho devia ter voltado à fila';
  RAISE NOTICE '  ok  · não se dá por removido o que ainda lá está';

  -- Agora sim: os bytes saem (aqui à mão; em produção, pela Storage API).
  DELETE FROM storage.objects
   WHERE bucket_id='contabilista-anexos'
     AND name='eeee0000-0000-0000-0000-00000000000e/orfao';

  r := public.fechar_purga_de_anexos(
         ARRAY['eeee0000-0000-0000-0000-00000000000e/orfao'], NULL);
  ASSERT (r->>'removidos')::int = 1, 'o objeto desapareceu e não foi dado por removido';
  RAISE NOTICE '  ok  · desaparecido o objeto, a fila fecha o caminho';

  -- Idempotente: fechar outra vez não conta duas.
  r := public.fechar_purga_de_anexos(
         ARRAY['eeee0000-0000-0000-0000-00000000000e/orfao'], NULL);
  ASSERT (r->>'removidos')::int = 0, 'fechar duas vezes contou duas remoções';
  RAISE NOTICE '  ok  · fechar duas vezes não conta duas';
END $$;

SET ROLE authenticated;
SELECT t.entrar('c1c1c1c1-0000-0000-0000-00000000000c');
SELECT t.recusa($$SELECT public.reservar_anexos_orfaos('2 hours', 10, '1 minute')$$,
  'varrer o armazenamento à mão');
SELECT t.recusa($$SELECT public.fechar_purga_de_anexos(ARRAY['x'], NULL)$$,
  'fechar a purga à mão');
RESET ROLE;

-- O cenário desta secção sai daqui. Um caso e um documento deixados para
-- trás mudam o que os ficheiros seguintes contam, e um teste que estraga
-- o vizinho é pior do que um teste a menos.
SELECT t.sair();
DELETE FROM public.casos WHERE id='ca50d0c0-0000-4000-8000-00000000000a';
DELETE FROM storage.objects
 WHERE bucket_id='contabilista-anexos'
   AND name LIKE 'casos/ca50d0c0-0000-4000-8000-00000000000a/%';

\echo ''
\echo '── 59. Um ficheiro só se abre a quem pode abri-lo AGORA ────────'
RESET ROLE;
SELECT t.sair();

-- Um anexo a sério, com a linha que o descreve.
INSERT INTO public.contabilista_mensagens (id, vinculo_id, autor_id, corpo)
VALUES ('bbbb1111-0000-0000-0000-00000000000b',
        'eeee0000-0000-0000-0000-00000000000e',
        'c1c1c1c1-0000-0000-0000-00000000000c','Segue a fatura.')
ON CONFLICT DO NOTHING;
INSERT INTO public.contabilista_anexos (mensagem_id, caminho, nome, bytes, tipo_mime)
VALUES ('bbbb1111-0000-0000-0000-00000000000b',
        'eeee0000-0000-0000-0000-00000000000e/fatura', 'Fatura.pdf', 5000, 'application/pdf')
ON CONFLICT DO NOTHING;

SET ROLE authenticated;
SELECT t.entrar('c1c1c1c1-0000-0000-0000-00000000000c');
SELECT t.rpc_ok($$SELECT public.anexo_legivel('eeee0000-0000-0000-0000-00000000000e/fatura')$$,
  'quem enviou pode descarregar');
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.rpc_ok($$SELECT public.anexo_legivel('eeee0000-0000-0000-0000-00000000000e/fatura')$$,
  'o contabilista do vínculo também');

SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.rpc_recusa($$SELECT public.anexo_legivel('eeee0000-0000-0000-0000-00000000000e/fatura')$$,
  'sem_acesso', 'um terceiro descarrega o anexo de outra conversa');

-- «Não existe» e «não é teu» respondem coisas diferentes à rota, mas a
-- rota responde 404 às duas: a diferença dizia a quem tenta se o ficheiro
-- existe.
SELECT t.rpc_recusa($$SELECT public.anexo_legivel('nao/existe')$$,
  'inexistente', 'descarregar um caminho inventado');

-- ⚠️ ISTO ERA POSSÍVEL. O URL era assinado por cinco minutos e sobrevivia
-- ao fim do acompanhamento — quem terminasse continuava a poder abrir.
SELECT t.entrar('c1c1c1c1-0000-0000-0000-00000000000c');
SELECT t.rpc_ok($$SELECT public.decidir_vinculo(
  'eeee0000-0000-0000-0000-00000000000e', 'terminar')$$, 'o cliente termina');
SELECT t.entrar('c1c1c1c1-0000-0000-0000-00000000000c');
SELECT t.rpc_recusa($$SELECT public.anexo_legivel('eeee0000-0000-0000-0000-00000000000e/fatura')$$,
  'sem_acesso', 'descarregar depois de o acompanhamento terminar');
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.rpc_recusa($$SELECT public.anexo_legivel('eeee0000-0000-0000-0000-00000000000e/fatura')$$,
  'sem_acesso', 'o contabilista descarrega depois de a relação acabar');

\echo ''
\echo '── 60. A administração lê, e fica escrito que leu ──────────────'
RESET ROLE; SELECT t.sair();
DELETE FROM public.admin_auditoria WHERE acao = 'documento_candidatura_lido';
SET ROLE authenticated;

-- O próprio lê o que é seu, e isso não é um ato de administração.
SELECT t.entrar('22222222-2222-2222-2222-222222222222');
SELECT t.rpc_ok($$SELECT public.documento_legivel_por_admin(
  '22222222-2222-2222-2222-222222222222/cedula.pdf')$$,
  'a pessoa lê o documento que enviou');
SELECT t.conta($$SELECT count(*) FROM public.admin_auditoria
  WHERE acao='documento_candidatura_lido'$$, 0,
  'ler o que é seu não fica registado como ato de administração');

SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.rpc_recusa($$SELECT public.documento_legivel_por_admin(
  '22222222-2222-2222-2222-222222222222/cedula.pdf')$$,
  'sem_acesso', 'um terceiro lê a cédula profissional de outra pessoa');

SELECT t.entrar('44444444-4444-4444-4444-444444444444');
SELECT t.rpc_ok($$SELECT public.documento_legivel_por_admin(
  '22222222-2222-2222-2222-222222222222/cedula.pdf')$$,
  'a administração lê, para poder decidir');

RESET ROLE; SELECT t.sair();
SELECT t.conta($$SELECT count(*) FROM public.admin_auditoria
  WHERE acao='documento_candidatura_lido'
    AND ator_id='44444444-4444-4444-4444-444444444444'
    AND alvo_id='22222222-2222-2222-2222-222222222222'$$, 1,
  'e a leitura ficou escrita, com quem leu e de quem');
