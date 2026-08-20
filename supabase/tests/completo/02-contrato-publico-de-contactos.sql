-- ═══════════════════════════════════════════════════════════════════════
--  A FRONTEIRA DE CONTACTO — contra Postgres a sério, papel a papel
--  ---------------------------------------------------------------------
--  Corre no ESQUEMA COMPLETO (segunda etapa de `scripts/testar-rls.sh`).
--
--  ⚠️ A RAZÃO DE ESTE FICHEIRO EXISTIR
--  -----------------------------------
--  Havia testes sobre o contrato público. Eram todos de TEXTO: liam o SQL
--  da migração e o TypeScript do frontend e afirmavam coisas sobre o que
--  lá estava escrito. Nenhum deles pedia uma linha à base de dados.
--
--  O que isso não conseguia ver, e não viu durante meses: a política
--  `contabilistas_diretorio_publico` continuava de pé em produção, a dar a
--  `anon` a LINHA INTEIRA de qualquer contabilista aprovado. A view
--  existia, o frontend lia-a, os testes liam a view — e ao lado disso
--  tudo, um pedido HTTP sem sessão nenhuma trazia o telefone, o
--  `linkedin_subject` e o `pedido_id` de toda a gente.
--
--  Um teste que lê o ficheiro da migração prova que alguém escreveu a
--  intenção certa. Só um teste que PEDE prova que a base a cumpre.
--
--  ---------------------------------------------------------------------
--  A REGRA QUE ISTO GUARDA
--
--    Nome, OCC e LinkedIn são públicos. Email, telefone e site só depois
--    de o contabilista aceitar a pessoa como cliente.
--
--  Cada estado da relação é exercido aqui, com o papel certo: sem sessão,
--  autenticado sem relação, convidado, pedido pendente, ativo, pausado,
--  terminado, o próprio, e o contabilista suspenso.
-- ═══════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
\set QUIET on
\pset pager off
CREATE SCHEMA IF NOT EXISTS t;
SET client_min_messages = notice;

--  As asserções correm DENTRO do papel que está a ser exercido — é essa a
--  ideia: quem pergunta é o `anon`, não o `postgres`. Sem isto o próprio
--  ajudante era recusado por falta de USAGE no esquema, e a suíte
--  confundia isso com a garantia que queria provar.
GRANT USAGE ON SCHEMA t TO PUBLIC;

CREATE OR REPLACE FUNCTION t.eq(got anyelement, want anyelement, rotulo text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'FALHA · %: esperava %, veio %', rotulo, want, got;
  END IF;
  RAISE NOTICE '  ok  · %', rotulo;
END; $$;

--  Entrar como alguém: `auth.uid()` lê a definição de sessão, como no
--  Supabase lê o JWT.
CREATE OR REPLACE FUNCTION t.entrar(u uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN PERFORM set_config('request.jwt.claim.sub', u::text, false); END; $$;

CREATE OR REPLACE FUNCTION t.sair() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN PERFORM set_config('request.jwt.claim.sub', '', false); END; $$;

--  Espera que o comando seja RECUSADO. Só as famílias que são mesmo uma
--  recusa: um erro de sintaxe volta a subir, senão um teste com um typo
--  passava sozinho.
CREATE OR REPLACE FUNCTION t.recusa(cmd text, rotulo text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  BEGIN
    EXECUTE cmd;
    GET DIAGNOSTICS n = ROW_COUNT;
  EXCEPTION
    WHEN insufficient_privilege OR undefined_function OR undefined_table
      OR check_violation OR raise_exception THEN
      RAISE NOTICE '  ok  · recusado (erro): %', rotulo;
      RETURN;
  END;
  IF n = 0 THEN
    RAISE NOTICE '  ok  · recusado (0 linhas): %', rotulo;
    RETURN;
  END IF;
  RAISE EXCEPTION 'FALHA · % devia ter sido recusado e afetou % linha(s)', rotulo, n;
END; $$;

--  Quantos canais diretos é que esta pessoa consegue obter deste
--  contabilista. É o número que resume o teste todo: 0 ou 3.
CREATE OR REPLACE FUNCTION t.canais(p_contabilista uuid) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE r record; n integer := 0;
BEGIN
  SELECT * INTO r FROM public.contactos_do_contabilista(p_contabilista);
  IF NOT FOUND THEN RETURN 0; END IF;
  IF r.email_contacto IS NOT NULL THEN n := n + 1; END IF;
  IF r.telefone       IS NOT NULL THEN n := n + 1; END IF;
  IF r.website        IS NOT NULL THEN n := n + 1; END IF;
  RETURN n;
END; $$;


-- ═══════════════════════════════════════════════════════════════════
--  O CENÁRIO
-- ═══════════════════════════════════════════════════════════════════
RESET ROLE;
SELECT t.sair();

--  Um contabilista aprovado, com os três canais preenchidos, LinkedIn
--  ligado e OCC verificado — e com as colunas internas que nunca podem
--  sair também preenchidas, para que «não sai» signifique alguma coisa.
INSERT INTO auth.users (id, email) VALUES
  ('c0000000-0000-4000-8000-00000000000a', 'contabilista@exemplo.pt'),
  ('c0000000-0000-4000-8000-00000000000b', 'suspenso@exemplo.pt'),
  ('c1000000-0000-4000-8000-000000000001', 'estranho@exemplo.pt'),
  ('c1000000-0000-4000-8000-000000000002', 'convidado@exemplo.pt'),
  ('c1000000-0000-4000-8000-000000000003', 'pendente@exemplo.pt'),
  ('c1000000-0000-4000-8000-000000000004', 'ativo@exemplo.pt'),
  ('c1000000-0000-4000-8000-000000000005', 'pausado@exemplo.pt'),
  ('c1000000-0000-4000-8000-000000000006', 'terminado@exemplo.pt'),
  ('c1000000-0000-4000-8000-000000000007', 'clientedosuspenso@exemplo.pt')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contabilistas
  (user_id, slug, nome, occ, estado, email_contacto, telefone, website,
   linkedin_url, linkedin_avatar_url, linkedin_ligado_em, linkedin_subject,
   occ_verificado_metodo, occ_verificado_em, occ_verificado_ate,
   occ_numero_confirmado, occ_evidencia)
VALUES
  ('c0000000-0000-4000-8000-00000000000a', 'ana-fronteira', 'Ana Fronteira', '12345',
   'aprovado', 'ana@exemplo.pt', '+351910000000', 'https://ana.exemplo.pt',
   'https://www.linkedin.com/in/ana-fronteira', 'https://media.exemplo.pt/ana.jpg',
   now(), 'oidc-sub-secreto-da-ana',
   'registo_publico', now() - interval '1 day', now() + interval '89 days',
   '12345', '{"fonte":"registo publico"}'::jsonb),
  ('c0000000-0000-4000-8000-00000000000b', 'bruno-suspenso', 'Bruno Suspenso', '54321',
   'aprovado', 'bruno@exemplo.pt', '+351920000000', 'https://bruno.exemplo.pt',
   'https://www.linkedin.com/in/bruno-suspenso', NULL, NULL, 'oidc-sub-do-bruno',
   NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.contabilista_vinculos (id, contabilista_id, cliente_id, estado, nome_cliente)
VALUES
  ('11110000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-00000000000a','c1000000-0000-4000-8000-000000000002','convidado','Convidado'),
  ('11110000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-00000000000a','c1000000-0000-4000-8000-000000000003','pendente','Pendente'),
  ('11110000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-00000000000a','c1000000-0000-4000-8000-000000000004','ativo','Ativo'),
  ('11110000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-00000000000a','c1000000-0000-4000-8000-000000000005','pausado','Pausado'),
  ('11110000-0000-4000-8000-000000000006','c0000000-0000-4000-8000-00000000000a','c1000000-0000-4000-8000-000000000006','terminado','Terminado'),
  ('11110000-0000-4000-8000-000000000007','c0000000-0000-4000-8000-00000000000b','c1000000-0000-4000-8000-000000000007','ativo','Do suspenso')
ON CONFLICT (id) DO NOTHING;


\echo ''
\echo '── 01. A tabela deixou de ser o contrato ───────────────────────'

--  A guarda da migração é a primeira asserção: se ela passa, as quatro
--  maneiras conhecidas de partir o contrato estão fechadas.
SELECT public.assert_contrato_publico_contabilistas();
SELECT t.eq(true, true, 'assert_contrato_publico_contabilistas() passa');

SELECT t.eq(
  (SELECT count(*)::int FROM pg_policies
    WHERE schemaname='public' AND tablename='contabilistas'
      AND 'anon'::name = ANY (roles)), 0,
  'não há política nenhuma de anon em contabilistas');

SELECT t.eq(has_any_column_privilege('anon','public.contabilistas','SELECT'), false,
  'anon não tem SELECT em coluna nenhuma da tabela');
SELECT t.eq(has_any_column_privilege('anon','public.contabilistas','UPDATE'), false,
  'anon não tem UPDATE — o privilégio saiu, não só a política');

--  O que impedia um UPDATE anónimo era a falta de política; o privilégio
--  estava lá. Duas trancas, e uma delas estava aberta.
SET ROLE anon;
SELECT t.sair();
SELECT t.recusa($$SELECT nome FROM public.contabilistas$$,
  'anon lê a tabela dos contabilistas');
SELECT t.recusa($$SELECT telefone FROM public.contabilistas$$,
  'anon pede o telefone diretamente à tabela');
SELECT t.recusa($$UPDATE public.contabilistas SET nome='Invadida'$$,
  'anon escreve na tabela');
RESET ROLE;


\echo ''
\echo '── 02. A view diz as colunas uma a uma ─────────────────────────'

--  ⚠️ Esta é a asserção que impede o problema de AMANHÃ. Uma coluna nova
--  em `contabilistas` — XP, comissão, patamar comprado — nasce privada, e
--  para ficar pública tem de ser escrita na lista da view por alguém que
--  decidiu escrevê-la.
DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY['email_contacto','telefone','website','linkedin_subject',
                           'pedido_id','estado','occ_evidencia','occ_numero_confirmado',
                           'occ_verificado_por','occ_recusa_motivo'] LOOP
    IF EXISTS (SELECT 1 FROM pg_attribute
                WHERE attrelid='public.contabilistas_publico'::regclass
                  AND attnum > 0 AND NOT attisdropped AND attname::text = c) THEN
      RAISE EXCEPTION 'FALHA · a view pública expõe %', c;
    END IF;
  END LOOP;
  RAISE NOTICE '  ok  · nenhuma das dez colunas proibidas está na view';
END $$;

--  E o que TEM de continuar lá. Uma correção de privacidade que apagasse
--  o diretório não seria uma correção.
DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY['nome','occ','occ_verificado','linkedin_url',
                           'linkedin_avatar_url','linkedin_ligado','bio',
                           'especialidades','distrito','preco_consulta_cents'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_attribute
                    WHERE attrelid='public.contabilistas_publico'::regclass
                      AND attnum > 0 AND NOT attisdropped AND attname::text = c) THEN
      RAISE EXCEPTION 'FALHA · a view pública perdeu %', c;
    END IF;
  END LOOP;
  RAISE NOTICE '  ok  · nome, OCC, LinkedIn e o perfil profissional continuam públicos';
END $$;

SET ROLE anon;
SELECT t.sair();
SELECT t.eq((SELECT nome FROM public.contabilistas_publico WHERE slug='ana-fronteira'),
  'Ana Fronteira', 'sem sessão nenhuma, o nome sai');
SELECT t.eq((SELECT occ FROM public.contabilistas_publico WHERE slug='ana-fronteira'),
  '12345', 'o OCC sai — é o que torna a identidade verificável');
SELECT t.eq((SELECT occ_verificado FROM public.contabilistas_publico WHERE slug='ana-fronteira'),
  true, 'o selo válido sai calculado, não em bruto');
SELECT t.eq((SELECT linkedin_url FROM public.contabilistas_publico WHERE slug='ana-fronteira'),
  'https://www.linkedin.com/in/ana-fronteira',
  'o LinkedIn sai — é a validação que não depende de nós');
SELECT t.eq((SELECT linkedin_ligado FROM public.contabilistas_publico WHERE slug='ana-fronteira'),
  true, 'e diz-se ligado, sem revelar a identidade OIDC');
RESET ROLE;


\echo ''
\echo '── 03. A view não é dona de si mesma pelo postgres ─────────────'

--  `security_invoker = false` faz a view correr com os privilégios do
--  DONO. Com o `postgres` — que tem BYPASSRLS — a lista de colunas era a
--  única fronteira, e uma lista é um documento, não uma tranca. Com um
--  papel sem login nem BYPASSRLS, um JOIN novo a uma tabela privada
--  devolve zero linhas em vez de a publicar.
SELECT t.eq(
  (SELECT r.rolcanlogin OR r.rolbypassrls
     FROM pg_class c JOIN pg_roles r ON r.oid=c.relowner
    WHERE c.oid='public.contabilistas_publico'::regclass),
  false, 'o dono da view não tem login nem BYPASSRLS');

--  E o alcance dele é o que lhe foi dado, uma tabela de cada vez.
SELECT t.eq(has_table_privilege('contrato_publico','public.contabilista_vinculos','SELECT'),
  false, 'o dono da view não lê os vínculos');
SELECT t.eq(has_table_privilege('contrato_publico','public.contabilista_mensagens','SELECT'),
  false, 'nem as mensagens');


\echo ''
\echo '── 04. Os canais diretos, estado a estado ──────────────────────'

SET ROLE anon;
SELECT t.sair();
SELECT t.recusa(
  $$SELECT * FROM public.contactos_do_contabilista('c0000000-0000-4000-8000-00000000000a')$$,
  'anon nem sequer pode executar a função dos contactos');
RESET ROLE;

SET ROLE authenticated;

SELECT t.entrar('c1000000-0000-4000-8000-000000000001');
SELECT t.eq(t.canais('c0000000-0000-4000-8000-00000000000a'), 0,
  'autenticado sem relação nenhuma: zero canais');

SELECT t.entrar('c1000000-0000-4000-8000-000000000002');
SELECT t.eq(t.canais('c0000000-0000-4000-8000-00000000000a'), 0,
  'convidado, ainda sem aceitar: zero canais');

SELECT t.entrar('c1000000-0000-4000-8000-000000000003');
SELECT t.eq(t.canais('c0000000-0000-4000-8000-00000000000a'), 0,
  'pedido pendente: zero canais — pedir não é ser aceite');

SELECT t.entrar('c1000000-0000-4000-8000-000000000004');
SELECT t.eq(t.canais('c0000000-0000-4000-8000-00000000000a'), 3,
  'cliente ativo: email, telefone e site');

--  ⚠️ DECISÃO EXPLÍCITA, e é por isso que tem teste próprio. Uma pausa é
--  uma pausa no trabalho, não uma quebra de confiança: quem já tinha o
--  telefone do seu contabilista não o perde por estar entre épocas. O que
--  a pausa trava são ações operacionais novas, não o contacto.
--  Se um dia «pausado» passar a significar suspensão de confiança, é ESTE
--  teste que muda — e a mudança fica visível em vez de implícita.
SELECT t.entrar('c1000000-0000-4000-8000-000000000005');
SELECT t.eq(t.canais('c0000000-0000-4000-8000-00000000000a'), 3,
  'vínculo pausado: os canais mantêm-se (decisão de produto)');

SELECT t.entrar('c1000000-0000-4000-8000-000000000006');
SELECT t.eq(t.canais('c0000000-0000-4000-8000-00000000000a'), 0,
  'vínculo terminado: os canais fecham no mesmo instante');

SELECT t.entrar('c0000000-0000-4000-8000-00000000000a');
SELECT t.eq(t.canais('c0000000-0000-4000-8000-00000000000a'), 3,
  'o próprio vê sempre os seus contactos');

RESET ROLE;


\echo ''
\echo '── 05. Suspender corta o diretório e o contacto ────────────────'

RESET ROLE;
SELECT t.sair();
UPDATE public.contabilistas SET estado='suspenso'
 WHERE user_id='c0000000-0000-4000-8000-00000000000b';

SET ROLE anon;
SELECT t.sair();
SELECT t.eq((SELECT count(*)::int FROM public.contabilistas_publico WHERE slug='bruno-suspenso'),
  0, 'um contabilista suspenso desaparece do diretório');
RESET ROLE;

SET ROLE authenticated;
--  O vínculo continua 'ativo' — ninguém o terminou. O que mudou foi o
--  estado do contabilista, e é isso que tem de chegar ao contacto: sem
--  esta condição, uma suspensão tirava a pessoa do diretório e deixava-a
--  a ser contactada na mesma.
SELECT t.entrar('c1000000-0000-4000-8000-000000000007');
SELECT t.eq(t.canais('c0000000-0000-4000-8000-00000000000b'), 0,
  'e o cliente ativo dele deixa de obter os canais');
RESET ROLE;

SELECT t.sair();
UPDATE public.contabilistas SET estado='aprovado'
 WHERE user_id='c0000000-0000-4000-8000-00000000000b';


\echo ''
\echo '── 06. A guarda recusa a política antiga a voltar ──────────────'

--  Sem esta secção, a correção dura até alguém precisar de um campo novo
--  no diretório e recriar a política aberta — que é a solução óbvia para
--  quem não leu a migração. Aqui recria-se de propósito, prova-se que a
--  guarda a apanha, e desfaz-se.
DO $$
DECLARE apanhou boolean := false;
BEGIN
  CREATE POLICY "contabilistas_diretorio_publico" ON public.contabilistas
    FOR SELECT TO anon, authenticated USING (estado = 'aprovado');
  BEGIN
    PERFORM public.assert_contrato_publico_contabilistas();
  EXCEPTION WHEN raise_exception THEN
    apanhou := true;
  END;
  DROP POLICY "contabilistas_diretorio_publico" ON public.contabilistas;

  IF NOT apanhou THEN
    RAISE EXCEPTION 'FALHA · a guarda deixou recriar a política aberta a anon';
  END IF;
  RAISE NOTICE '  ok  · recriar a política aberta faz a guarda falhar';
END $$;

--  E o mesmo para uma coluna proibida a entrar na view. Este é o caminho
--  por onde o email voltaria: alguém precisa dele num ecrã, acrescenta-o
--  à lista, e nada falha.
--
--  O ensaio mexe mesmo na view, e por isso corre dentro de uma transação
--  que se desfaz a seguir — DDL em Postgres é transacional, e é a forma
--  honesta de provar isto sem deixar a base num estado de ensaio.
BEGIN;
DROP VIEW public.contabilistas_publico;
CREATE VIEW public.contabilistas_publico WITH (security_invoker=false) AS
  SELECT c.user_id, c.slug, c.nome, c.email_contacto
    FROM public.contabilistas c WHERE c.estado='aprovado';

DO $$
DECLARE apanhou boolean := false;
BEGIN
  BEGIN
    PERFORM public.assert_contrato_publico_contabilistas();
  EXCEPTION WHEN raise_exception THEN
    apanhou := true;
  END;
  IF NOT apanhou THEN
    RAISE EXCEPTION 'FALHA · a guarda deixou o email_contacto entrar na view pública';
  END IF;
  RAISE NOTICE '  ok  · pôr o email na view faz a guarda falhar';
END $$;
ROLLBACK;

--  E a view verdadeira ficou como estava.
SELECT public.assert_contrato_publico_contabilistas();
SELECT t.eq(
  (SELECT count(*)::int FROM pg_attribute
    WHERE attrelid='public.contabilistas_publico'::regclass
      AND attnum>0 AND NOT attisdropped AND attname='email_contacto'),
  0, 'desfeito o ensaio, a view verdadeira continua sem o email');
SELECT t.eq((SELECT nome FROM public.contabilistas_publico WHERE slug='ana-fronteira'),
  'Ana Fronteira', 'e continua a servir o diretório');
