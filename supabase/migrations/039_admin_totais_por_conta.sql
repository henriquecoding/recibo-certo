-- 039_admin_totais_por_conta.sql
-- ═══════════════════════════════════════════════════════════════════════
--  CONTAGENS PARA A ADMINISTRAÇÃO — SEM ABRIR O CONTEÚDO
--  ---------------------------------------------------------------------
--  A secção de contas mostra quantos registos cada conta tem. Contar do
--  lado do cliente obrigava a TRAZER as linhas para as somar — e a API do
--  Supabase corta em 1000 linhas por omissão, pelo que as contagens
--  ficavam simplesmente erradas a partir daí, sem avisar.
--
--  Pior do que erradas: trazer linhas de conteúdo fiscal para as contar
--  contraria o que a 038 acabou de garantir. Uma contagem não precisa do
--  conteúdo; esta função devolve NÚMEROS e mais nada.
--
--  Fechada a `service_role`. Não é chamável por `anon` nem por
--  `authenticated` — nem sequer por uma conta de administração a falar
--  diretamente com a API. Só o servidor da app, que já validou o token e
--  o papel antes de chegar aqui (`pedidoDeAdmin`).
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_totais_por_conta()
RETURNS TABLE (
  user_id      uuid,
  recibos      bigint,
  vencimentos  bigint,
  cenarios     bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    u.id AS user_id,
    (SELECT count(*) FROM public.recibos             r WHERE r.user_id = u.id) AS recibos,
    (SELECT count(*) FROM public.recibos_vencimento  v WHERE v.user_id = u.id) AS vencimentos,
    (SELECT count(*) FROM public.cenarios            c WHERE c.user_id = u.id) AS cenarios
  FROM public.profiles u;
$$;

REVOKE ALL ON FUNCTION public.admin_totais_por_conta() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_totais_por_conta() TO service_role;

COMMENT ON FUNCTION public.admin_totais_por_conta() IS
  'Contagens por conta para a administração. Devolve números, nunca conteúdo. Só service_role.';
