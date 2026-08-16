-- 20260816180000_stripe_fecha_grant_anon.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O GRANT QUE NÃO DEVIA LÁ ESTAR
--  ---------------------------------------------------------------------
--  Encontrado a olhar para a base a sério, e não para o SQL: `anon` tinha
--  SELECT em `contabilista_stripe`.
--
--  NÃO HAVIA FUGA, e vale a pena dizer porquê antes de dizer o resto. A
--  RLS está ligada nessa tabela e a única política é `TO authenticated`;
--  um anónimo com privilégio de SELECT e sem política que o cubra lê zero
--  linhas. Quem fosse ao PostgREST buscar `contabilista_stripe` recebia
--  uma lista vazia, e não o id da conta Stripe de ninguém.
--
--  Mas um GRANT que só é inofensivo porque uma política o cobre é uma
--  armadilha à espera. Basta alguém, daqui a seis meses, acrescentar uma
--  política mais larga — para um painel de administração, por exemplo —
--  sem reparar que o grant ao anónimo já lá estava. A proteção passa a
--  depender de duas coisas ao mesmo tempo, e a segunda não está escrita em
--  lado nenhum.
--
--  O sinal público não precisa disto para nada: sai por
--  `contabilistas_publico`, que corre com `security_invoker = false` e por
--  isso lê a tabela com os privilégios de quem criou a view.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

REVOKE ALL ON public.contabilista_stripe FROM anon;

-- O contabilista continua a ler a SUA linha — é o que alimenta o cartão
-- de recebimentos no perfil. Quem decide o que ele vê é a política, não
-- este grant.
GRANT SELECT ON public.contabilista_stripe TO authenticated;
