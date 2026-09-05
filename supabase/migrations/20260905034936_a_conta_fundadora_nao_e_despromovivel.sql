-- 20260905034936_a_conta_fundadora_nao_e_despromovivel.sql
-- ═══════════════════════════════════════════════════════════════════════
--  QUEM CONCEDE A ADMINISTRAÇÃO NÃO PODE PERDÊ-LA PARA QUEM A RECEBEU
--  ---------------------------------------------------------------------
--  `PATCH /api/admin/contas` deixa qualquer administrador despromover
--  qualquer outro. A única trava é não ficar a base sem nenhum:
--
--    if (role === 'user') { se só houver 1 admin, recusa }
--
--  Com dois administradores, essa trava não trava nada. O segundo pode
--  despromover o primeiro e ficar sozinho no painel — e o primeiro, que
--  concedeu a administração, deixa de ter caminho de volta pela aplicação.
--  Não é hipótese de laboratório: a conta fundadora e uma conta promovida
--  à mão foi exatamente a situação que existiu aqui durante meses.
--
--  Administrar não é um só nível. Há a conta que é dona do projeto, e há
--  as contas a quem ela empresta o painel. As segundas fazem tudo o que as
--  primeiras fazem — menos mexer em quem lhes deu a chave.
--
--  ---------------------------------------------------------------------
--  PORQUÊ UMA COLUNA, E NÃO UM ROLE NOVO
--
--  A tentação é `role = 'owner'`. Seria um erro caro: `is_admin()` testa
--  `role = 'admin'`, e é ela que abre as políticas RLS de meia base de
--  dados. Mudar o role da conta fundadora para outra coisa tirava-lhe, no
--  mesmo instante, o acesso a tudo o que a proteção existe para lhe
--  garantir.
--
--  A proteção é ORTOGONAL ao papel: `protegido` diz que aquele role não é
--  de outro alterar, e não diz nada sobre o que a conta pode fazer.
--  `is_admin()` fica intocada, e nenhuma política existente muda.
--
--  ---------------------------------------------------------------------
--  ONDE ESTÁ A FRONTEIRA, E ONDE ELA NÃO PODE ESTAR
--
--  A rota administrativa fala com a base como `service_role`, onde
--  `auth.uid()` é nulo — de propósito, para poder ler `auth.users` e
--  escrever a auditoria. Um gatilho não distingue «a rota a agir em nome
--  da Ana» de «a rota a agir em nome do João»: vê `service_role` nas duas.
--
--  Então a fronteira que compara ATOR com ALVO vive na rota, que é quem
--  sabe os dois, e é lá que a recusa fica registada. O que este gatilho
--  faz é a segunda tranca: fecha a escrita DIRETA, feita por um
--  administrador autenticado que salte a rota e vá à tabela pelo
--  PostgREST. Sem ele, a fronteira da rota seria uma porta com aviso ao
--  lado de uma janela aberta.
--
--  Idempotente e forward-only.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
--  1. A MARCA
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS protegido boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.protegido IS
  'Conta dona do projeto: o seu role não é alterável por outro administrador, nem pela rota de administração nem por escrita direta. Só se concede e retira por SQL — nunca pelo painel.';

-- ═══════════════════════════════════════════════════════════════════
--  2. A TRANCA DE BAIXO
-- ═══════════════════════════════════════════════════════════════════
--  Duas coisas que um utilizador autenticado nunca faz, seja ele admin ou
--  não:
--
--    (a) mexer no `role` de uma conta protegida que não é a dele;
--    (b) mexer na própria marca `protegido`, de quem quer que seja —
--        incluindo a dele. Uma proteção que o protegido possa levantar
--        sozinho seria contornável em dois pedidos: levanta, despromove.
--
--  `auth.uid() IS NULL` (migrações, SQL editor, service_role) passa nas
--  duas. É o caminho de recuperação, e é deliberado: se não houvesse
--  nenhum, uma conta protegida cuja pessoa perdesse o acesso trancava o
--  projeto para sempre.
CREATE OR REPLACE FUNCTION public.enforce_profile_protegido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- (a) o role de uma conta protegida, mexido por outra pessoa
  IF OLD.protegido
     AND NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND auth.uid() <> OLD.id THEN
    RAISE EXCEPTION
      'Esta é a conta dona do projeto. A sua administração não é alterável por outro administrador.';
  END IF;

  -- (b) a própria marca, mexida por quem quer que seja com sessão
  IF NEW.protegido IS DISTINCT FROM OLD.protegido
     AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION
      'A marca de conta protegida não se concede nem se retira pela aplicação.';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_profile_protegido() IS
  'Recusa que um administrador altere o role da conta dona do projeto, e que alguém com sessão mexa na marca `protegido`. Complementa a fronteira da rota /api/admin/contas, que é quem compara ator com alvo.';

REVOKE EXECUTE ON FUNCTION public.enforce_profile_protegido() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS profiles_protegido_lock ON public.profiles;
CREATE TRIGGER profiles_protegido_lock
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_protegido();

-- ═══════════════════════════════════════════════════════════════════
--  3. A CONTA DONA
-- ═══════════════════════════════════════════════════════════════════
--  Marcada por email UMA vez, aqui, e não por regra viva: nada no
--  funcionamento da aplicação volta a olhar para este endereço. É o
--  oposto da promoção automática que a migração anterior retirou — aquela
--  decidia a cada registo, esta decide uma vez e fica escrita na linha.
--
--  Correr isto num projeto onde o endereço não exista não marca ninguém,
--  não falha, e a alínea (a) da asserção abaixo diz que ficou por marcar.
UPDATE public.profiles
   SET protegido = true
 WHERE email = 'admin@recibocerto.pt'
   AND role = 'admin'
   AND protegido = false;

-- ═══════════════════════════════════════════════════════════════════
--  4. AS ASSERÇÕES
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_protegidas int;
  v_admins     int;
BEGIN
  SELECT count(*) FILTER (WHERE protegido),
         count(*) FILTER (WHERE role = 'admin')
    INTO v_protegidas, v_admins
    FROM public.profiles;

  -- (a) Uma proteção que não protege ninguém é uma coluna a mentir.
  IF v_admins > 0 AND v_protegidas = 0 THEN
    RAISE WARNING
      'Há % administradores e nenhuma conta protegida. Marca a conta dona: UPDATE public.profiles SET protegido = true WHERE email = ''<o-teu-email>'';',
      v_admins;
  END IF;

  -- (b) Proteger quem não administra não faz sentido nenhum: a marca só
  --     diz respeito a alterações de `role`, e num perfil sem `admin` não
  --     há nada para segurar.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE protegido AND role <> 'admin') THEN
    RAISE EXCEPTION 'Há contas protegidas que não são administradores.';
  END IF;

  -- (c) O gatilho tem de estar mesmo pendurado. Criar a função e esquecer
  --     o trigger deixaria a coluna a existir e a não travar nada.
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'profiles'
       AND t.tgname = 'profiles_protegido_lock' AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'O gatilho profiles_protegido_lock não ficou instalado.';
  END IF;
END $$;

COMMIT;
