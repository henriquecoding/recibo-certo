\set ON_ERROR_STOP on
\set QUIET on

-- ═══════════════════════════════════════════════════════════════════════
--  A MATRIZ DE AUTORIZAÇÃO DE `cenarios` (§14.6 do relatório do painel)
--  ---------------------------------------------------------------------
--  Alargar uma tabela que já guarda dados de pessoas é o momento em que
--  uma política se perde sem ninguém dar por isso: a migração corre, o
--  esquema fica maior, e a única prova de que o isolamento continua de pé
--  é ninguém se ter queixado.
--
--  Isto corre a matriz inteira contra um PostgreSQL a sério, com três
--  identidades — anónimo, a Ana (Plus) e o Bruno (grátis) —, e falha à
--  primeira linha que uma delas consiga ler ou escrever fora do que lhe
--  pertence.
--
--  Nota sobre o que isto NÃO prova: as políticas são reproduzidas pelo
--  arreio (ver `01-politicas-atuais.sql`), não lidas de produção. O que
--  garante que produção tem estas quatro é o bloco de verificação no fim
--  da própria migração, que se recusa a aplicar se alguma faltar.
-- ═══════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS t;

CREATE OR REPLACE FUNCTION t.recusa(cmd text, rotulo text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  BEGIN
    EXECUTE cmd;
    GET DIAGNOSTICS n = ROW_COUNT;
  EXCEPTION
    WHEN insufficient_privilege OR check_violation OR unique_violation
      OR raise_exception OR foreign_key_violation OR invalid_parameter_value THEN
      RAISE NOTICE '  ok  · recusado (erro): %', rotulo;
      RETURN;
  END;
  -- Uma política que falha no USING de um UPDATE não levanta erro: afeta
  -- zero linhas, em silêncio. As duas vias contam como recusa.
  IF n = 0 THEN
    RAISE NOTICE '  ok  · recusado (0 linhas): %', rotulo;
    RETURN;
  END IF;
  RAISE EXCEPTION 'FALHA DE SEGURANCA · % escreveu % linha(s)', rotulo, n;
END;
$$;

CREATE OR REPLACE FUNCTION t.permite(cmd text, rotulo text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  EXECUTE cmd;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE EXCEPTION 'FALHA · % devia ter escrito e afetou 0 linhas', rotulo;
  END IF;
  RAISE NOTICE '  ok  · permitido (% linha/s): %', n, rotulo;
END;
$$;

CREATE OR REPLACE FUNCTION t.conta(cmd text, esperado bigint, rotulo text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  EXECUTE cmd INTO n;
  IF n IS DISTINCT FROM esperado THEN
    RAISE EXCEPTION 'FALHA · %: esperava %, veio %', rotulo, esperado, n;
  END IF;
  RAISE NOTICE '  ok  · % (%)', rotulo, n;
END;
$$;

CREATE OR REPLACE FUNCTION t.entrar(quem uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', quem::text, false);
END;
$$;

-- Os ajudantes correm DENTRO da identidade que está a ser testada — é
-- essa a graça. Sem estes grants, o `anon` batia num «permission denied
-- for schema t» e a suíte dava por recusado o que nunca chegou a ser
-- tentado: um falso verde, que é a pior espécie.
GRANT USAGE ON SCHEMA t TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA t TO anon, authenticated;

-- ── Três identidades ───────────────────────────────────────────────────
DO $$
DECLARE ana uuid; bruno uuid;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    ('11111111-1111-1111-1111-111111111111', 'ana@exemplo.pt'),
    ('22222222-2222-2222-2222-222222222222', 'bruno@exemplo.pt')
  ON CONFLICT (id) DO NOTHING;

  -- A Ana tem Plus. O Bruno não. É a única diferença entre os dois.
  INSERT INTO public.subscriptions (user_id, status)
  VALUES ('11111111-1111-1111-1111-111111111111', 'active')
  ON CONFLICT (user_id) DO UPDATE SET status = 'active';
END $$;

\echo '── 1. O anónimo continua local-only'
RESET ROLE;
SET ROLE anon;
SELECT t.recusa(
  $$INSERT INTO public.cenarios (user_id, tipo, nome) VALUES ('11111111-1111-1111-1111-111111111111','preco','x')$$,
  'anon insere');
SELECT t.recusa($$UPDATE public.cenarios SET nome = 'x'$$, 'anon altera');
SELECT t.recusa($$DELETE FROM public.cenarios$$, 'anon apaga');
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.cenarios;
    RAISE EXCEPTION 'FALHA DE SEGURANCA · anon conseguiu ler public.cenarios';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '  ok  · recusado (erro): anon lê';
  END;
END $$;

\echo '── 2. A Ana (Plus) guarda os dois tipos novos'
RESET ROLE;
SET ROLE authenticated;
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.permite(
  $$INSERT INTO public.cenarios (id, user_id, tipo, nome, estado, origem, motor_versao)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
            'descoberta','Hipótese revista','pronto','dashboard','descoberta-2026.08')$$,
  'Plus guarda um cenário de descoberta');
SELECT t.permite(
  $$INSERT INTO public.cenarios (id, user_id, tipo, nome, estado, schema_versao)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',
            'preco','Consultoria mensal','concluido',2)$$,
  'Plus guarda um preço');

\echo '── 3. Os valores por omissão são os que a migração promete'
SELECT t.conta(
  $$SELECT count(*) FROM public.cenarios
    WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'
      AND atualizado_em IS NOT NULL AND schema_versao = 1 AND origem = 'dashboard'$$,
  1, 'atualizado_em, schema_versao e origem preenchidos por omissão');

\echo '── 4. O vocabulário é fechado'
SELECT t.recusa(
  $$INSERT INTO public.cenarios (user_id, tipo, nome)
    VALUES ('11111111-1111-1111-1111-111111111111','marketing','x')$$,
  'um tipo fora da lista');
SELECT t.recusa(
  $$INSERT INTO public.cenarios (user_id, tipo, nome, estado)
    VALUES ('11111111-1111-1111-1111-111111111111','preco','x','quase_pronto')$$,
  'um estado fora da lista');
SELECT t.recusa(
  $$INSERT INTO public.cenarios (user_id, tipo, nome, origem)
    VALUES ('11111111-1111-1111-1111-111111111111','preco','x','sei_la')$$,
  'uma origem fora da lista');
SELECT t.recusa(
  $$INSERT INTO public.cenarios (user_id, tipo, nome, schema_versao)
    VALUES ('11111111-1111-1111-1111-111111111111','preco','x',0)$$,
  'uma versão de esquema não positiva');

\echo '── 5. O trigger marca a alteração, e a aplicação não a pode falsear'
DO $$
DECLARE antes timestamptz; depois timestamptz;
BEGIN
  SELECT atualizado_em INTO antes FROM public.cenarios WHERE id = 'aaaaaaaa-0000-0000-0000-000000000002';
  PERFORM pg_sleep(0.05);
  -- Escrever uma data no passado é EXATAMENTE o que o trigger existe para
  -- impedir: sem ele, um caminho de escrita esquecido punha a ordenação
  -- do painel a mentir em silêncio.
  UPDATE public.cenarios
  SET nome = 'Consultoria mensal (revisto)', atualizado_em = '2020-01-01'
  WHERE id = 'aaaaaaaa-0000-0000-0000-000000000002';
  SELECT atualizado_em INTO depois FROM public.cenarios WHERE id = 'aaaaaaaa-0000-0000-0000-000000000002';
  IF depois <= antes THEN
    RAISE EXCEPTION 'FALHA · atualizado_em não avançou (antes %, depois %)', antes, depois;
  END IF;
  RAISE NOTICE '  ok  · atualizado_em avança e ignora a data escrita à mão';
END $$;

\echo '── 6. O Bruno não vê nem toca no que é da Ana'
SELECT t.entrar('22222222-2222-2222-2222-222222222222');
SELECT t.conta($$SELECT count(*) FROM public.cenarios$$, 0, 'o Bruno vê zero linhas da Ana');
SELECT t.recusa(
  $$UPDATE public.cenarios SET nome = 'meu agora' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'o Bruno altera um cenário da Ana');
SELECT t.recusa(
  $$DELETE FROM public.cenarios WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'o Bruno apaga um cenário da Ana');

\echo '── 7. Sem Plus não se escreve na nuvem — e o rascunho local fica intacto'
SELECT t.recusa(
  $$INSERT INTO public.cenarios (user_id, tipo, nome)
    VALUES ('22222222-2222-2222-2222-222222222222','preco','tentativa')$$,
  'não-Plus guarda na nuvem');

\echo '── 8. Ninguém muda o dono de uma linha'
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.recusa(
  $$UPDATE public.cenarios SET user_id = '22222222-2222-2222-2222-222222222222'
    WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'a Ana passa um cenário para o Bruno');
SELECT t.recusa(
  $$INSERT INTO public.cenarios (user_id, tipo, nome)
    VALUES ('22222222-2222-2222-2222-222222222222','preco','em nome do Bruno')$$,
  'a Ana insere em nome do Bruno');

\echo '── 9. O dono continua a ler e a apagar o que é dele'
SELECT t.conta($$SELECT count(*) FROM public.cenarios$$, 2, 'a Ana vê os dois que guardou');
SELECT t.permite(
  $$DELETE FROM public.cenarios WHERE id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  'a Ana apaga um cenário seu');

\echo '── 10. A purga por cancelamento apanha os tipos novos'
-- A eliminação é por `user_id`, não por tipo: um tipo novo entra na purga
-- no dia em que existe, sem ninguém se lembrar dela. Isto prova-o.
RESET ROLE;
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SET ROLE authenticated;
SELECT t.permite(
  $$DELETE FROM public.cenarios WHERE user_id = '11111111-1111-1111-1111-111111111111'$$,
  'apagar tudo de uma conta leva descoberta e preco à frente');
SELECT t.conta($$SELECT count(*) FROM public.cenarios$$, 0, 'não sobra nada da Ana');

RESET ROLE;
\echo '✓ Matriz de autorização de cenarios verificada.'
