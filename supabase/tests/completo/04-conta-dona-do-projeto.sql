-- ═══════════════════════════════════════════════════════════════════════
--  A CONTA DONA NÃO SE PERDE PARA QUEM RECEBEU DELA O PAINEL
--  ---------------------------------------------------------------------
--  `PATCH /api/admin/contas` deixava qualquer administrador despromover
--  qualquer outro. A única trava era não ficar a base sem nenhum — o que,
--  havendo dois, não trava nada: o segundo despromovia o primeiro e ficava
--  sozinho, e quem lhe deu a chave perdia a entrada sem caminho de volta
--  pela aplicação.
--
--  A fronteira que compara ATOR com ALVO vive na rota, porque a base fala
--  com ela como `service_role` e não distingue em nome de QUEM ela age.
--  Este ficheiro guarda a OUTRA metade: o gatilho que fecha a escrita
--  direta pelo PostgREST, que saltaria a rota inteira.
--
--  Corre no esquema completo porque a migração que instala o gatilho é
--  datada, e a primeira etapa do arreio não a aplica.
--
--  ⚠️ O QUE ISTO TEM DE PROVAR, E PORQUÊ CADA UM
--  ---------------------------------------------
--  Uma proteção destas parte-se de três maneiras, e as três são silenciosas:
--
--    · o gatilho deixa de estar pendurado, e a coluna fica a decorar;
--    · a marca passa a ser levantável por quem ela protege — e então
--      bastam dois pedidos, levantar e despromover;
--    · a condição perde o «e não é ele», e a conta dona fica trancada
--      fora da sua própria decisão.
--
--  O caminho de `auth.uid()` nulo (SQL, migrações, service_role) PASSA de
--  propósito, e isso também é afirmado aqui: sem ele, uma conta dona cuja
--  pessoa perdesse o acesso trancava o projeto para sempre.
-- ═══════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
CREATE SCHEMA IF NOT EXISTS t;
SET client_min_messages = notice;

-- Os mesmos auxiliares dos ficheiros 02 e 03. Correm na mesma base, e um
-- `CREATE OR REPLACE` que renomeasse os parâmetros seria recusado pelo
-- PostgreSQL — por isso os nomes são os deles.
CREATE OR REPLACE FUNCTION t.eq(got anyelement, want anyelement, rotulo text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'FALHA · %: esperava %, veio %', rotulo, want, got;
  END IF;
  RAISE NOTICE '  ok  · %', rotulo;
END; $$;

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

-- ── As duas contas ──────────────────────────────────────────────────
--  `d…01` é a dona; `d…02` é um administrador a quem ela emprestou o
--  painel. Ids fixos para o ficheiro poder reaplicar-se.
DO $$
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    ('d0000000-0000-4000-8000-000000000001', 'dona@exemplo.pt'),
    ('d0000000-0000-4000-8000-000000000002', 'convidado@exemplo.pt')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, email, role) VALUES
    ('d0000000-0000-4000-8000-000000000001', 'dona@exemplo.pt', 'admin'),
    ('d0000000-0000-4000-8000-000000000002', 'convidado@exemplo.pt', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

  -- Estado de partida limpo: só a dona protegida.
  UPDATE public.profiles SET protegido = true
   WHERE id = 'd0000000-0000-4000-8000-000000000001';
  UPDATE public.profiles SET protegido = false
   WHERE id = 'd0000000-0000-4000-8000-000000000002';
END $$;


\echo ''
\echo '── 01. O gatilho está mesmo pendurado ──────────────────────────'

-- Sem isto, tudo o que se segue passaria por não haver nada a travar — e
-- um ficheiro que passa por não haver guarda é pior do que não existir.
SELECT t.eq(
  (SELECT count(*)::int FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'profiles'
      AND t.tgname = 'profiles_protegido_lock' AND NOT t.tgisinternal),
  1, 'o gatilho profiles_protegido_lock existe em profiles');

SELECT t.eq(
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'protegido'),
  1, 'a coluna protegido existe');


\echo ''
\echo '── 02. Com sessão de outro administrador ───────────────────────'

-- A partir daqui, quem age é o convidado. `auth.uid()` do arreio lê
-- `request.jwt.claim.sub`, que é o que a Supabase põe numa sessão real.
SELECT set_config('request.jwt.claim.sub', 'd0000000-0000-4000-8000-000000000002', false);

SELECT t.recusa(
  $cmd$ UPDATE public.profiles SET role = 'user'
         WHERE id = 'd0000000-0000-4000-8000-000000000001' $cmd$,
  'um administrador despromove a conta dona');

-- A marca não se concede a si próprio: se se concedesse, o convidado
-- tornava-se intocável e a hierarquia invertia-se num pedido.
SELECT t.recusa(
  $cmd$ UPDATE public.profiles SET protegido = true
         WHERE id = 'd0000000-0000-4000-8000-000000000002' $cmd$,
  'um administrador marca-se a si próprio como conta dona');

-- Nem se levanta a de outrem: era o caminho de dois passos que tornava
-- toda a proteção decorativa.
SELECT t.recusa(
  $cmd$ UPDATE public.profiles SET protegido = false
         WHERE id = 'd0000000-0000-4000-8000-000000000001' $cmd$,
  'um administrador levanta a proteção da conta dona');

-- E o que ele PODE continuar a fazer, que é tudo o resto. Uma proteção que
-- travasse administração normal seria uma regressão, não uma correção.
-- `email` e não `nome`: a coluna `nome` chega numa migração anterior ao
-- corte deste arreio, e afirmar contra uma coluna que aqui não existe
-- media o esquema do teste em vez da guarda.
BEGIN;
UPDATE public.profiles SET email = 'dona-nova@exemplo.pt'
 WHERE id = 'd0000000-0000-4000-8000-000000000001';
SELECT t.eq(
  (SELECT email FROM public.profiles
    WHERE id = 'd0000000-0000-4000-8000-000000000001'),
  'dona-nova@exemplo.pt', 'a proteção é só do papel — o resto da linha não trava');
ROLLBACK;


\echo ''
\echo '── 03. O caminho de recuperação continua aberto ────────────────'

-- Sem sessão: migrações, editor de SQL e a rota administrativa. É por aqui
-- que a conta dona se marca e se desmarca, e é deliberado que passe — sem
-- ele, perder o acesso à conta dona trancava o projeto para sempre.
SELECT set_config('request.jwt.claim.sub', '', false);

BEGIN;
UPDATE public.profiles SET role = 'user'
 WHERE id = 'd0000000-0000-4000-8000-000000000002';
SELECT t.eq(
  (SELECT role FROM public.profiles
    WHERE id = 'd0000000-0000-4000-8000-000000000002'),
  'user', 'o painel da conta dona continua a despromover outro administrador');
ROLLBACK;

BEGIN;
UPDATE public.profiles SET protegido = false
 WHERE id = 'd0000000-0000-4000-8000-000000000001';
SELECT t.eq(
  (SELECT protegido FROM public.profiles
    WHERE id = 'd0000000-0000-4000-8000-000000000001'),
  false, 'o SQL levanta a marca — é o caminho de recuperação');
ROLLBACK;


\echo ''
\echo '── 04. Depois de tudo, a conta dona está como estava ───────────'

SELECT t.eq(
  (SELECT role FROM public.profiles
    WHERE id = 'd0000000-0000-4000-8000-000000000001'),
  'admin', 'a conta dona continua administradora');

SELECT t.eq(
  (SELECT protegido FROM public.profiles
    WHERE id = 'd0000000-0000-4000-8000-000000000001'),
  true, 'a conta dona continua protegida');
