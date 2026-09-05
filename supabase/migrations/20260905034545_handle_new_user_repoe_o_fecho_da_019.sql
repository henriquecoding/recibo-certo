-- 20260905034545_handle_new_user_repoe_o_fecho_da_019.sql
-- ═══════════════════════════════════════════════════════════════════════
--  A 019 ESTÁ NO REGISTO, MAS NÃO ESTÁ NA FUNÇÃO
--  ---------------------------------------------------------------------
--  `supabase_migrations` diz que a 019 foi aplicada. A função que ela
--  reescreveu diz o contrário: em produção, `handle_new_user()` é ainda a
--  definição da 002/003 — sem `search_path` fixo, e com a promoção
--  automática por email que a 019 §2 existia para tirar.
--
--    CASE WHEN NEW.email = 'admin@recibocerto.pt' THEN 'admin' ELSE 'user' END
--
--  Não é mistério: as migrações 001–053 foram aplicadas à mão no editor de
--  SQL antes de haver registo, e o registo foi preenchido depois. Uma
--  entrada em `supabase_migrations` é a afirmação de que algo correu, não a
--  prova. Aqui as duas discordaram durante meses, e o que valia era a
--  função.
--
--  ---------------------------------------------------------------------
--  PORQUE É QUE A PROMOÇÃO POR EMAIL DEIXA DE FAZER FALTA
--
--  Quando a 002 a escreveu, era o único caminho para haver um admin. Hoje
--  não é: `PATCH /api/admin/contas` promove e despromove, recusa deixar a
--  base sem o último administrador, e escreve quem fez o quê a quem em
--  `admin_auditoria` — com IP. A UI está em `/admin/contas`.
--
--  Um caminho que ninguém usa e que ninguém vê é pior do que um caminho a
--  menos: promover por email não deixa rasto na auditoria, e faz depender
--  de quem regista um endereço aquilo que devia depender de quem já é
--  administrador. Esta migração não retira a capacidade de promover —
--  move-a toda para o sítio onde ela fica registada.
--
--  ---------------------------------------------------------------------
--  PORQUE É QUE `search_path = ''` NÃO PARTE O REGISTO DE CONTAS
--
--  Uma `SECURITY DEFINER` sem `search_path` resolve nomes pelo caminho de
--  QUEM CHAMA. Fixá-lo em '' só parte um corpo que dependa dessa
--  resolução, e este não depende: a única referência a um objeto é
--  `public.profiles`, já qualificada. `NEW.id` e `NEW.email` são campos do
--  registo do gatilho, não nomes a resolver. É a mesma disciplina da 011.
--
--  Forward-only e idempotente: a 019 continua a ser o registo histórico do
--  dia em que a decisão foi tomada; o que muda, muda aqui.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
--  1. A FUNÇÃO, COMO A 019 A DEIXOU ESCRITA
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Cria o perfil de quem se regista, sempre com role ''user''. A administração concede-se em /admin/contas, que a regista em admin_auditoria — nunca por email no momento do registo.';

--  `CREATE OR REPLACE` preserva as permissões existentes, e é por isso que
--  o REVOKE da 011 é reafirmado e não presumido: se esta função alguma vez
--  for recriada por engano num contexto que a conceda a `PUBLIC`, é esta
--  linha que fecha outra vez.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- ═══════════════════════════════════════════════════════════════════
--  2. A ASSERÇÃO — para a próxima discordância parar aqui
-- ═══════════════════════════════════════════════════════════════════
--  O que correu mal da primeira vez não foi escrever a 019: foi ninguém
--  reparar que ela não tinha pegado. Uma asserção dentro da transação
--  transforma isso num erro na aplicação em vez de num achado meses depois.
DO $$
DECLARE
  v_config text[];
  v_corpo  text;
BEGIN
  SELECT p.proconfig, pg_get_functiondef(p.oid)
    INTO v_config, v_corpo
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

  IF v_corpo IS NULL THEN
    RAISE EXCEPTION 'handle_new_user() não existe — o gatilho de registo perdeu a função.';
  END IF;

  -- (a) `search_path` fixo. Sem isto, a função resolve nomes pelo caminho
  --     de quem chama, e quem chama é o fluxo de registo.
  IF v_config IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(v_config) AS c WHERE c LIKE 'search_path=%'
  ) THEN
    RAISE EXCEPTION 'handle_new_user() ficou sem search_path fixo.';
  END IF;

  -- (b) Nenhuma promoção por email. Procura o nome da coluna a ser
  --     comparado com um literal 'admin' no corpo — que é a forma que a
  --     002, a 003 e a 006 tinham em comum.
  IF v_corpo ~* 'NEW\.email\s*(=|IN)' AND v_corpo ~* '''admin''' THEN
    RAISE EXCEPTION
      'handle_new_user() voltou a promover por email. A administração concede-se em /admin/contas, que a regista.';
  END IF;
END $$;

COMMIT;
