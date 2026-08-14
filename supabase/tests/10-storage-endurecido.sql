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

DO $$
DECLARE v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM public.purgar_anexos_orfaos('2 hours');
  ASSERT v_n = 1, format('devia varrer um órfão, varreu %s', v_n);
  RAISE NOTICE '  ok  · o órfão de três horas foi varrido';

  SELECT count(*) INTO v_n FROM public.purgar_anexos_orfaos('2 hours');
  ASSERT v_n = 0, 'a segunda passagem varreu alguma coisa que já não existia';
  RAISE NOTICE '  ok  · a segunda passagem não encontra nada';
END $$;

SET ROLE authenticated;
SELECT t.entrar('c1c1c1c1-0000-0000-0000-00000000000c');
SELECT t.recusa($$SELECT public.purgar_anexos_orfaos('2 hours')$$,
  'varrer o armazenamento à mão');
RESET ROLE;
