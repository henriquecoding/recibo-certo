-- 038_admin_deixa_de_ler_dados_fiscais.sql
-- ═══════════════════════════════════════════════════════════════════════
--  «SÓ TU ACEDES AOS TEUS DADOS» PASSA A SER VERDADE
--  ---------------------------------------------------------------------
--  A página de privacidade afirma, textualmente:
--
--    «O acesso é restrito à tua conta através de políticas de segurança ao
--     nível da linha (Row-Level Security): só tu acedes aos teus dados.»
--
--  Era falso. Quatro políticas davam a QUALQUER conta com `role = 'admin'`
--  acesso ao conteúdo fiscal de toda a gente — e em `recibos_vencimento` e
--  `cenarios` o acesso era `ALL`, ou seja, também alterar e apagar.
--
--  Não era teórico: existem duas contas de administração, e um recibo de
--  vencimento guardado que a segunda conseguia ler na íntegra.
--
--  Nenhum ecrã de administração depende destas políticas — o painel só lê
--  `analytics_eventos`, que não tem dados pessoais. Eram superfície de
--  ataque pura, a sustentar uma afirmação falsa.
--
--  O que FICA: `profiles` continua legível pela administração, porque é o
--  que permite gerir contas e dar apoio (email e papel, não conteúdo
--  fiscal). Apoio que precise do conteúdo passa a exigir consentimento
--  explícito da pessoa — que é como deve ser.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "admin_ve_todos_recibos"   ON public.recibos;
DROP POLICY IF EXISTS "recibos_vencimento_admin" ON public.recibos_vencimento;
DROP POLICY IF EXISTS "cenarios_admin"           ON public.cenarios;

-- Havia duas políticas SELECT idênticas em `recibos`. Duas políticas com a
-- mesma condição não somam segurança; somam dúvida sobre qual delas manda.
DROP POLICY IF EXISTS "ler os proprios" ON public.recibos;

COMMENT ON TABLE public.recibos IS
  'Conteúdo fiscal pessoal. Só o dono acede — nem a administração. A afirmação da página de privacidade («só tu acedes aos teus dados») depende disto.';
COMMENT ON TABLE public.recibos_vencimento IS
  'Conteúdo fiscal pessoal. Só o dono acede — nem a administração.';
COMMENT ON TABLE public.cenarios IS
  'Conteúdo fiscal pessoal. Só o dono acede — nem a administração.';
