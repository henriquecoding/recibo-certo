\set ON_ERROR_STOP on
\set QUIET on

CREATE SCHEMA IF NOT EXISTS t;

-- Espera que o comando seja RECUSADO. Só apanha as famílias de erro que
-- correspondem a uma recusa real; um erro de sintaxe volta a subir, senão um
-- teste com um typo passava sozinho.
-- Uma escrita pode não acontecer por duas vias, e as duas contam como recusa:
-- um erro, ou zero linhas afetadas. A distinção interessa porque uma política
-- RLS que falha no USING de um UPDATE não levanta erro nenhum — afeta zero
-- linhas em silêncio. Um teste que só procurasse a exceção enganava-se nas
-- duas direções: dava por recusada uma escrita que aconteceu, e por permitida
-- uma que não aconteceu.
CREATE OR REPLACE FUNCTION t.recusa(cmd text, rotulo text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  BEGIN
    EXECUTE cmd;
    GET DIAGNOSTICS n = ROW_COUNT;
  EXCEPTION
    -- Só as famílias de erro que são mesmo uma recusa. Um erro de sintaxe
    -- volta a subir, senão um teste com um typo passava sozinho.
    WHEN insufficient_privilege OR check_violation OR unique_violation
      OR exclusion_violation OR raise_exception OR foreign_key_violation THEN
      RAISE NOTICE '  ok  · recusado (erro): %', rotulo;
      RETURN;
  END;
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
    RAISE EXCEPTION 'FALHA · %: esperava % linha(s), veio %', rotulo, esperado, n;
  END IF;
  RAISE NOTICE '  ok  · % (% linha/s)', rotulo, n;
END;
$$;

-- Sair da sessão: `auth.uid()` volta a ser NULL, que é como a chave de
-- serviço vê o mundo.
--
-- `RESET ROLE` sozinho NÃO faz isto — a definição da sessão persiste, e sem
-- esta função uma operação feita «como postgres» continuava a ser avaliada
-- pelos gatilhos como sendo do último utilizador que entrou. Foi assim que
-- um teste de anexos se viu recusado por uma regra que só se aplica a
-- clientes.
CREATE OR REPLACE FUNCTION t.sair() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', false);
END;
$$;

CREATE OR REPLACE FUNCTION t.entrar(quem uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', quem::text, false);
END;
$$;

-- ── Dados de partida (como postgres, fora de RLS) ────────────────────
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'contabilista@exemplo.pt'),
  ('22222222-2222-2222-2222-222222222222', 'cliente@exemplo.pt'),
  ('33333333-3333-3333-3333-333333333333', 'intruso@exemplo.pt'),
  ('44444444-4444-4444-4444-444444444444', 'admin@exemplo.pt'),
  ('55555555-5555-5555-5555-555555555555', 'outro-contabilista@exemplo.pt');

INSERT INTO public.profiles (id, email, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'contabilista@exemplo.pt', 'user'),
  ('22222222-2222-2222-2222-222222222222', 'cliente@exemplo.pt', 'user'),
  ('33333333-3333-3333-3333-333333333333', 'intruso@exemplo.pt', 'user'),
  ('44444444-4444-4444-4444-444444444444', 'admin@exemplo.pt', 'admin'),
  ('55555555-5555-5555-5555-555555555555', 'outro@exemplo.pt', 'user');

-- Contabilistas criados pela chave de serviço, como na aprovação real.
INSERT INTO public.contabilistas
  (user_id, slug, nome, estado, preco_consulta_cents, fidelidade_desconto_pct,
   fidelidade_meta, fidelidade_ativa)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'ana-silva', 'Ana Silva', 'aprovado', 12000, 20, 3, true),
  ('55555555-5555-5555-5555-555555555555', 'bruno-costa', 'Bruno Costa', 'aprovado', 9000, 10, 5, true);

-- Um terceiro, ainda por aprovar — não pode aparecer no diretório.
INSERT INTO auth.users (id, email) VALUES ('66666666-6666-6666-6666-666666666666', 'pendente@exemplo.pt');
INSERT INTO public.contabilistas (user_id, slug, nome, estado)
VALUES ('66666666-6666-6666-6666-666666666666', 'carla-pendente', 'Carla Pendente', 'pendente');


GRANT USAGE ON SCHEMA t TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA t TO anon, authenticated, service_role;
