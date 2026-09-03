-- ═══════════════════════════════════════════════════════════════════════
--  O SINO ACEITA O QUE A PRODUÇÃO ESCREVE — contra Postgres a sério
--  ---------------------------------------------------------------------
--  Corre no ESQUEMA COMPLETO, e tem de ser aí: a deriva que este ficheiro
--  guarda nasceu precisamente de quatro migrações que a primeira etapa do
--  arreio NÃO aplica. `pagamento_recebido` (20260816140000) e
--  `patamar_desbloqueado` (20260815233000) estão fora da lista explícita
--  de `testar-rls.sh`; `proposta` e `caso` (20260824…) também. A restrição
--  que os recusava vivia dentro dessa lista. Ninguém os viu juntos.
--
--  ⚠️ A RAZÃO DE ESTE FICHEIRO EXISTIR
--  -----------------------------------
--  A lista de tipos aceites por `notificacoes` foi copiada à mão quatro
--  vezes, sempre a partir da cópia anterior e nunca a partir de quem
--  escreve avisos. Quatro tipos escritos em produção deixaram de caber:
--
--      proposta · caso · pagamento_recebido · patamar_desbloqueado
--
--  E, porque `avisar_utilizador` é chamada DENTRO da transação que escreve
--  o facto — a garantia da 047 —, a recusa do aviso desfazia o facto. Não
--  era um sino calado: era uma proposta que não se enviava, um pagamento
--  da Stripe que não liquidava, um patamar comprado que não se aplicava, e
--  um cron diário que morria na primeira linha.
--
--  Nenhum teste de TypeScript podia apanhar isto: a lista está em SQL, e a
--  consequência é uma exceção do PostgreSQL.
-- ═══════════════════════════════════════════════════════════════════════
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

-- Levanta se o comando NÃO levantar. Para provar que uma guarda guarda.
-- Os nomes dos parâmetros são os que `02-contrato-publico-de-contactos.sql`
-- já usa: um `CREATE OR REPLACE` que os renomeie é recusado pelo
-- PostgreSQL, e os dois ficheiros correm na mesma base.
CREATE OR REPLACE FUNCTION t.recusa(cmd text, rotulo text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE cmd;
  RAISE EXCEPTION 'FALHA · %: passou, e devia ter sido recusado', rotulo;
EXCEPTION
  WHEN check_violation OR unique_violation THEN
    RAISE NOTICE '  ok  · recusado: %', rotulo;
  WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALHA ·%' THEN RAISE; END IF;
    RAISE NOTICE '  ok  · recusado: %', rotulo;
END; $$;

DO $$
BEGIN
  INSERT INTO auth.users (id, email)
  VALUES ('a0000000-0000-4000-8000-00000000000f', 'avisos-tipos@exemplo.pt')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (id, email, role)
  VALUES ('a0000000-0000-4000-8000-00000000000f', 'avisos-tipos@exemplo.pt', 'user')
  ON CONFLICT (id) DO NOTHING;
END $$;

DELETE FROM public.notificacoes
 WHERE user_id = 'a0000000-0000-4000-8000-00000000000f';


\echo ''
\echo '── 01. Todos os tipos declarados cabem mesmo na tabela ─────────'

-- A asserção central. Não afirma uma lista escrita à mão neste ficheiro:
-- percorre a lista AUTORITATIVA e exige que cada um entre. Um tipo novo
-- passa a ser exercido aqui no dia em que for declarado, sem ninguém
-- tocar neste teste — que é exatamente o contrário do que falhou.
DO $$
DECLARE tipo text; n integer;
BEGIN
  FOREACH tipo IN ARRAY public.tipos_de_notificacao() LOOP
    PERFORM public.avisar_utilizador(
      'a0000000-0000-4000-8000-00000000000f', tipo,
      'Aviso de teste', NULL, '/dashboard');
  END LOOP;

  SELECT count(*) INTO n FROM public.notificacoes
   WHERE user_id = 'a0000000-0000-4000-8000-00000000000f';
  PERFORM t.eq(n, array_length(public.tipos_de_notificacao(), 1),
    'cada tipo declarado escreve uma linha');
END $$;

-- Os quatro que a restrição recusava, um a um e pelo nome. Estão aqui
-- nomeados de propósito: se um deles voltar a sair da lista, o que falha é
-- uma linha que diz qual, e não uma contagem.
DO $$
DECLARE tipo text;
BEGIN
  FOREACH tipo IN ARRAY ARRAY[
    'proposta', 'caso', 'pagamento_recebido', 'patamar_desbloqueado'
  ] LOOP
    PERFORM t.eq(tipo = ANY (public.tipos_de_notificacao()), true,
      'a produção escreve «' || tipo || '» e a tabela aceita-o');
  END LOOP;
END $$;

SELECT t.recusa($$
  INSERT INTO public.notificacoes (user_id, tipo, titulo)
  VALUES ('a0000000-0000-4000-8000-00000000000f', 'tipo_que_ninguem_declarou', 'x')
$$, 'um tipo fora da lista continua a não entrar');


\echo ''
\echo '── 02. A restrição e a lista dizem o mesmo ─────────────────────'

SELECT t.eq(
  (SELECT count(*)::integer FROM pg_constraint c
     JOIN pg_class r ON r.oid = c.conrelid
     JOIN pg_namespace ns ON ns.oid = r.relnamespace
    WHERE ns.nspname = 'public' AND r.relname = 'notificacoes'
      AND c.conname = 'notificacoes_tipo_check'),
  1, 'a restrição existe (sem ela, qualquer tipo passava)');

DO $$ BEGIN
  PERFORM public.assert_tipos_de_notificacao();
  RAISE NOTICE '  ok  · assert_tipos_de_notificacao() passa';
END $$;

-- E a guarda guarda: nos DOIS sentidos. Uma guarda que só apanha o que
-- falta deixa entrar o que sobra, e é por aí que uma lista volta a crescer
-- à mão sem passar pela função que os portões leem.
DO $$
DECLARE v_notificacoes jsonb;
BEGIN
  -- Guardar e esvaziar: uma restrição mais curta não se aplica a uma
  -- tabela que já tem linhas fora dela.
  SELECT jsonb_agg(to_jsonb(n)) INTO v_notificacoes FROM public.notificacoes n;
  DELETE FROM public.notificacoes;

  BEGIN
    ALTER TABLE public.notificacoes DROP CONSTRAINT notificacoes_tipo_check;
    ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_tipo_check
      CHECK (tipo = ANY (ARRAY['vinculo_pedido'::text]));
    BEGIN
      PERFORM public.assert_tipos_de_notificacao();
      RAISE EXCEPTION 'FALHA · a guarda deixou passar uma restrição a menos';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM LIKE 'FALHA ·%' THEN RAISE; END IF;
      RAISE NOTICE '  ok  · a guarda apanha um tipo declarado que não cabe';
    END;

    ALTER TABLE public.notificacoes DROP CONSTRAINT notificacoes_tipo_check;
    EXECUTE format(
      'ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_tipo_check '
      || 'CHECK (tipo = ANY (ARRAY[%s, ''inventado_a_mao'']::text[]))',
      (SELECT string_agg(quote_literal(x), ', ' ORDER BY x)
         FROM unnest(public.tipos_de_notificacao()) AS x));
    BEGIN
      PERFORM public.assert_tipos_de_notificacao();
      RAISE EXCEPTION 'FALHA · a guarda deixou passar uma restrição a mais';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM LIKE 'FALHA ·%' THEN RAISE; END IF;
      RAISE NOTICE '  ok  · a guarda apanha um tipo aceite que ninguém declarou';
    END;
  END;

  -- Repor exatamente o que a migração fabrica, e repor as linhas.
  ALTER TABLE public.notificacoes DROP CONSTRAINT notificacoes_tipo_check;
  EXECUTE format(
    'ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_tipo_check '
    || 'CHECK (tipo = ANY (ARRAY[%s]::text[]))',
    (SELECT string_agg(quote_literal(x), ', ' ORDER BY x)
       FROM unnest(public.tipos_de_notificacao()) AS x));

  IF v_notificacoes IS NOT NULL THEN
    INSERT INTO public.notificacoes
    SELECT * FROM jsonb_populate_recordset(NULL::public.notificacoes, v_notificacoes);
  END IF;

  PERFORM public.assert_tipos_de_notificacao();
  RAISE NOTICE '  ok  · a restrição verdadeira foi reposta';
END $$;


\echo ''
\echo '── 03. Quem merece email é subconjunto de quem existe ──────────'

DO $$
DECLARE tipo text;
BEGIN
  FOREACH tipo IN ARRAY public.tipos_de_notificacao_com_email() LOOP
    PERFORM t.eq(tipo = ANY (public.tipos_de_notificacao()), true,
      '«' || tipo || '» merece email e é um tipo que existe');
  END LOOP;
END $$;

-- As duas que a 20260825090000 apagou sem o dizer. Uma morada que muda na
-- véspera é o que faz alguém aparecer na porta errada; uma proposta de
-- desbloqueio é dinheiro à espera de resposta. Nenhuma das duas pode
-- depender de a pessoa voltar ao site.
SELECT t.eq(public.aviso_merece_email('consulta_local_mudou'), true,
  'a mudança de local volta a sair por email');
SELECT t.eq(public.aviso_merece_email('proposta_desbloqueio_decidida'), true,
  'a decisão sobre o desbloqueio volta a sair por email');

-- E o que fica de fora fica de fora: um email por linha de conversa é a
-- maneira mais rápida de fazer alguém desligar todos os avisos.
SELECT t.eq(public.aviso_merece_email('mensagem'), false,
  'uma mensagem da conversa não interrompe o dia de ninguém');
SELECT t.eq(public.aviso_merece_email('partilha_recebida'), false,
  'uma simulação enviada lê-se quando se entra');

-- O gatilho da 047 usa a mesma função: o que a lista diz, a fila faz.
DO $$
DECLARE n_email integer; n_dispensado integer;
BEGIN
  SELECT count(*) FILTER (WHERE email_estado = 'por_enviar'),
         count(*) FILTER (WHERE email_estado = 'dispensado')
    INTO n_email, n_dispensado
    FROM public.notificacoes
   WHERE user_id = 'a0000000-0000-4000-8000-00000000000f';

  PERFORM t.eq(n_email, array_length(public.tipos_de_notificacao_com_email(), 1),
    'a fila do email tem exatamente os tipos que merecem email');
  PERFORM t.eq(n_dispensado,
    array_length(public.tipos_de_notificacao(), 1)
      - array_length(public.tipos_de_notificacao_com_email(), 1),
    'e dispensa exatamente os outros');
END $$;


\echo ''
\echo '── 04. O Guardião avisa uma vez, não uma vez por dia ───────────'

-- `alertas_guardiao` garante um EMAIL por utilizador/nível/ano desde a
-- migração 007. O sino não tinha garantia nenhuma: o cron corre todos os
-- dias e a mesma pessoa continua acima de 80% todos os dias.
DO $$
DECLARE primeira boolean; segunda boolean; n integer;
BEGIN
  primeira := public.avisar_utilizador_uma_vez(
    'a0000000-0000-4000-8000-00000000000f', 'guardiao_iva',
    'Estás nos 80% do limite do IVA', NULL, '/dashboard', 'guardiao:2026:aviso');
  segunda := public.avisar_utilizador_uma_vez(
    'a0000000-0000-4000-8000-00000000000f', 'guardiao_iva',
    'Estás nos 80% do limite do IVA', NULL, '/dashboard', 'guardiao:2026:aviso');

  PERFORM t.eq(primeira, true,  'a primeira passagem escreve');
  PERFORM t.eq(segunda,  false, 'a segunda não escreve, e diz que não escreveu');

  SELECT count(*) INTO n FROM public.notificacoes
   WHERE user_id = 'a0000000-0000-4000-8000-00000000000f'
     AND chave = 'guardiao:2026:aviso';
  PERFORM t.eq(n, 1, 'e o sino tem uma linha, não duas');
END $$;

-- Níveis diferentes são avisos diferentes: passar de 80% para 95% é uma
-- notícia nova, e a chave leva o nível de propósito.
DO $$
DECLARE n integer;
BEGIN
  PERFORM public.avisar_utilizador_uma_vez(
    'a0000000-0000-4000-8000-00000000000f', 'guardiao_iva',
    'Estás nos 95% do limite do IVA', NULL, '/dashboard', 'guardiao:2026:critico');
  SELECT count(*) INTO n FROM public.notificacoes
   WHERE user_id = 'a0000000-0000-4000-8000-00000000000f'
     AND tipo = 'guardiao_iva';
  PERFORM t.eq(n, 3, 'o nível seguinte avisa (e o do bloco 01 conta)');
END $$;

-- Sem chave não há deduplicação — e não pode haver: os avisos que nascem
-- de uma transição não se repetem por construção, e um índice que os
-- juntasse esconderia dois pedidos de consulta seguidos.
DO $$
DECLARE n integer;
BEGIN
  PERFORM public.avisar_utilizador(
    'a0000000-0000-4000-8000-00000000000f', 'consulta_pedida', 'Igual', NULL, '/x');
  PERFORM public.avisar_utilizador(
    'a0000000-0000-4000-8000-00000000000f', 'consulta_pedida', 'Igual', NULL, '/x');
  SELECT count(*) INTO n FROM public.notificacoes
   WHERE user_id = 'a0000000-0000-4000-8000-00000000000f'
     AND titulo = 'Igual';
  PERFORM t.eq(n, 2, 'dois factos iguais sem chave continuam a ser dois avisos');
END $$;


\echo ''
\echo '── 05. A porta continua fechada ao browser ─────────────────────'

-- O grant a `service_role` da migração de setembro não pode ter aberto a
-- porta a mais ninguém: `avisar_utilizador` acessível a `authenticated`
-- era outra vez o canal de qualquer um para qualquer um que a 047 fechou.
SELECT t.eq(
  has_function_privilege('authenticated',
    'public.avisar_utilizador(uuid, text, text, text, text)', 'EXECUTE'),
  false, 'authenticated não chama avisar_utilizador');
SELECT t.eq(
  has_function_privilege('anon',
    'public.avisar_utilizador(uuid, text, text, text, text)', 'EXECUTE'),
  false, 'anon também não');
SELECT t.eq(
  has_function_privilege('service_role',
    'public.avisar_utilizador(uuid, text, text, text, text)', 'EXECUTE'),
  true, 'a chave de serviço chama — é por aí que o Guardião entra');
SELECT t.eq(
  has_function_privilege('authenticated',
    'public.avisar_utilizador_uma_vez(uuid, text, text, text, text, text)', 'EXECUTE'),
  false, 'nem a versão com chave');

-- E a coluna `chave` é do servidor: o dono do aviso só pode tocar em
-- `lida_em`, como a 047 deixou.
SELECT t.eq(
  has_column_privilege('authenticated', 'public.notificacoes', 'chave', 'UPDATE'),
  false, 'o dono do aviso não reescreve a chave de deduplicação');
SELECT t.eq(
  has_column_privilege('authenticated', 'public.notificacoes', 'lida_em', 'UPDATE'),
  true, 'e continua a poder marcar como lida');


\echo ''
\echo '── 06. O interruptor dos avisos por email ──────────────────────'

-- Cada email deste produto prometia, no rodapé e no `List-Unsubscribe`,
-- um sítio para os desligar. Esse sítio não existia.

DELETE FROM public.notificacoes
 WHERE user_id = 'a0000000-0000-4000-8000-00000000000f';
DELETE FROM public.preferencias_avisos
 WHERE user_id = 'a0000000-0000-4000-8000-00000000000f';

-- Sem linha guardada, os avisos saem. É o que evita ter de escrever uma
-- preferência por conta criada.
SELECT t.eq(public.avisos_por_email_ativos('a0000000-0000-4000-8000-00000000000f'),
  true, 'sem preferência guardada, os avisos saem por email');

DO $$
DECLARE v_estado text;
BEGIN
  PERFORM public.avisar_utilizador(
    'a0000000-0000-4000-8000-00000000000f', 'consulta_pedida',
    'Antes de desligar', NULL, '/x');
  SELECT email_estado INTO v_estado FROM public.notificacoes
   WHERE titulo = 'Antes de desligar';
  PERFORM t.eq(v_estado, 'por_enviar', 'e a fila marca-os para sair');
END $$;

INSERT INTO public.preferencias_avisos (user_id, email_ativo)
VALUES ('a0000000-0000-4000-8000-00000000000f', false)
ON CONFLICT (user_id) DO UPDATE SET email_ativo = false;

SELECT t.eq(public.avisos_por_email_ativos('a0000000-0000-4000-8000-00000000000f'),
  false, 'depois de desligar, a resposta muda');

DO $$
DECLARE v_estado text;
BEGIN
  PERFORM public.avisar_utilizador(
    'a0000000-0000-4000-8000-00000000000f', 'consulta_pedida',
    'Depois de desligar', NULL, '/x');
  SELECT email_estado INTO v_estado FROM public.notificacoes
   WHERE titulo = 'Depois de desligar';
  PERFORM t.eq(v_estado, 'dispensado', 'um aviso novo já não entra na fila do email');
END $$;

-- ⚠️ A metade que faltaria com o gatilho sozinho: o que JÁ estava em fila
-- antes de alguém carregar no interruptor. Um email que chega depois de
-- desligar é o que faz a pessoa carregar em «spam» em vez de voltar.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.avisos_email_reclamar(50) r
   WHERE r.titulo IN ('Antes de desligar', 'Depois de desligar');
  PERFORM t.eq(n, 0, 'e o que já estava em fila também não sai');
END $$;

-- Voltar a ligar volta a ligar. Um interruptor de sentido único seria
-- outra coisa, e não é isto que a página diz que faz.
UPDATE public.preferencias_avisos SET email_ativo = true
 WHERE user_id = 'a0000000-0000-4000-8000-00000000000f';

DO $$
DECLARE v_estado text;
BEGIN
  PERFORM public.avisar_utilizador(
    'a0000000-0000-4000-8000-00000000000f', 'vinculo_pedido',
    'Depois de voltar a ligar', NULL, '/x');
  SELECT email_estado INTO v_estado FROM public.notificacoes
   WHERE titulo = 'Depois de voltar a ligar';
  PERFORM t.eq(v_estado, 'por_enviar', 'voltar a ligar volta a mandar');
END $$;

-- O SINO não se desliga. É a superfície do produto: desligá-la seria
-- desligar a funcionalidade em vez da interrupção.
DO $$
DECLARE n integer;
BEGIN
  UPDATE public.preferencias_avisos SET email_ativo = false
   WHERE user_id = 'a0000000-0000-4000-8000-00000000000f';
  PERFORM public.avisar_utilizador(
    'a0000000-0000-4000-8000-00000000000f', 'proposta',
    'O sino continua a tocar', NULL, '/x');
  SELECT count(*) INTO n FROM public.notificacoes
   WHERE titulo = 'O sino continua a tocar';
  PERFORM t.eq(n, 1, 'com o email desligado, o aviso continua a chegar ao sino');
END $$;

-- A preferência é do dono, e o carimbo é do servidor.
SELECT t.eq(
  has_column_privilege('authenticated', 'public.preferencias_avisos', 'email_ativo', 'UPDATE'),
  true, 'o dono muda a sua preferência');
SELECT t.eq(
  has_column_privilege('authenticated', 'public.preferencias_avisos', 'atualizado_em', 'UPDATE'),
  false, 'e não forja a data em que a mudou');
SELECT t.eq(
  has_table_privilege('anon', 'public.preferencias_avisos', 'SELECT'),
  false, 'anon não lê preferências de ninguém');

DELETE FROM public.notificacoes
 WHERE user_id = 'a0000000-0000-4000-8000-00000000000f';
DELETE FROM public.preferencias_avisos
 WHERE user_id = 'a0000000-0000-4000-8000-00000000000f';
