-- 20260816170000_recebimentos_no_contrato_publico.sql
-- ═══════════════════════════════════════════════════════════════════════
--  «ESTE CONTABILISTA ACEITA PAGAMENTO AQUI?»
--  ---------------------------------------------------------------------
--  A pergunta é do cliente, e até agora não tinha resposta em lado nenhum.
--  Marcava-se a consulta, aparecia — ou não — um botão de pagar, e o
--  cliente descobria pelo silêncio.
--
--  O sinal existe: `contabilista_stripe.charges_enabled`. O que não existia
--  era maneira de o publicar sem publicar o resto. A tabela tem uma única
--  política — «só o próprio lê» — e está certa assim: o id da conta Stripe,
--  os requisitos por cumprir e o estado da verificação são dados de negócio
--  de outra pessoa. Que a Stripe pediu um documento a alguém não é
--  informação do cliente, e é das que fazem perder um cliente por uma razão
--  que não é dele.
--
--  A SOLUÇÃO É UMA COLUNA, NÃO UMA POLÍTICA NOVA
--  ---------------------------------------------
--  A view `contabilistas_publico` já é `security_invoker = false`: corre com
--  os privilégios de quem a criou e por isso consegue ler a tabela sem que
--  o cliente ganhe acesso a ela. Acrescenta-se UM booleano derivado, e mais
--  nada atravessa.
--
--  A regra de ouro do contrato público (migração 20260815200000) mantém-se:
--  acrescentar uma coluna aqui é uma DECISÃO, e esta está tomada — sai o
--  facto de que se pode pagar, não sai o porquê de não se poder.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. O contrato público, com mais um facto ────────────────────────
--
-- `CREATE OR REPLACE VIEW` não aceita acrescentar colunas no meio nem
-- mudar tipos, e a coluna nova entra no fim — mas as políticas e os grants
-- que dependem da view perdem-se com um DROP. Recria-se por inteiro e
-- devolve-se o grant a seguir, na mesma transação implícita da migração.
DROP VIEW IF EXISTS public.contabilistas_publico;

CREATE VIEW public.contabilistas_publico
WITH (security_invoker = false) AS
SELECT
  c.user_id,
  c.slug,
  c.nome,
  c.occ,
  (c.occ_verificado_em IS NOT NULL) AS occ_verificado,
  c.titulo_profissional,
  c.apresentacao_curta,
  c.bio,
  c.distrito,
  c.concelho,
  c.especialidades,
  c.modalidades,
  c.idiomas,
  c.anos_experiencia,
  c.resposta_media_horas,
  -- O email é público por decisão de produto: o editor de perfil diz, na
  -- própria página, que é isto que aparece no diretório. Está aqui porque
  -- foi escolhido, não por arrastamento.
  c.email_contacto,
  c.website,
  c.linkedin_url,
  c.linkedin_avatar_url,
  (c.linkedin_ligado_em IS NOT NULL) AS linkedin_ligado,
  c.aceita_novos_clientes,
  c.preco_consulta_cents,
  c.duracao_consulta_min,
  coalesce(r.ativa, false)                                   AS fidelidade_ativa,
  CASE WHEN coalesce(r.ativa, false) THEN r.meta         END AS fidelidade_meta,
  CASE WHEN coalesce(r.ativa, false) THEN r.desconto_pct END AS fidelidade_desconto_pct,
  -- ⚠️ O ÚNICO facto que sai da conta Stripe.
  --
  -- Não sai `stripe_account_id`, não saem os requisitos, não sai se está
  -- em análise ou restrita, e não sai sequer se a conta existe. Um cliente
  -- que veja «false» não consegue distinguir «nunca ligou» de «tem um
  -- documento por enviar» — e é isso que se pretende.
  --
  -- `charges_enabled` e não `payouts_enabled`: a pergunta do cliente é se
  -- CONSEGUE PAGAR. Que o dinheiro ainda não tenha saído para o IBAN do
  -- contabilista é problema entre ele e a Stripe, e não muda nada para
  -- quem paga.
  COALESCE(s.charges_enabled, false) AS recebe_pagamentos,
  c.criado_em
FROM public.contabilistas c
LEFT JOIN public.fidelidade_regras r
       ON r.contabilista_id = c.user_id AND r.substituida_em IS NULL
LEFT JOIN public.contabilista_stripe s
       ON s.contabilista_id = c.user_id
WHERE c.estado = 'aprovado';

COMMENT ON VIEW public.contabilistas_publico IS
  'O contrato público do diretório e do perfil público. Acrescentar uma '
  'coluna aqui é uma decisão; acrescentar uma coluna a `contabilistas` '
  'deixa de ser. Não expõe telefone (ver contacto_do_contabilista), '
  'linkedin_subject, pedido_id nem estado. De `contabilista_stripe` só sai '
  '`recebe_pagamentos` — nunca o id da conta nem os requisitos.';

GRANT SELECT ON public.contabilistas_publico TO anon, authenticated;


-- ── 2. O mesmo facto, para quem já é cliente ────────────────────────
--
-- O cliente com vínculo precisa de saber isto na sala, e ler a view do
-- diretório para uma pergunta sobre a SUA relação é ler a tabela pública
-- inteira. Uma função com um id devolve uma linha e um booleano.
--
-- SECURITY DEFINER com autorização escrita à mão: só responde a quem tem
-- vínculo, e a resposta é sempre o mesmo booleano que o diretório já
-- publica — não há aqui nada que não estivesse disponível.
CREATE OR REPLACE FUNCTION public.contabilista_recebe_pagamentos(p_contabilista uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT s.charges_enabled
       FROM public.contabilista_stripe s
      WHERE s.contabilista_id = p_contabilista
        AND EXISTS (
          SELECT 1 FROM public.contabilistas c
           WHERE c.user_id = p_contabilista AND c.estado = 'aprovado')),
    false);
$$;

COMMENT ON FUNCTION public.contabilista_recebe_pagamentos(uuid) IS
  'Se um contabilista aprovado consegue receber pagamentos pela plataforma. '
  'Devolve o mesmo booleano que `contabilistas_publico.recebe_pagamentos` e '
  'nada mais — nem o id da conta, nem os requisitos, nem o estado.';

REVOKE EXECUTE ON FUNCTION public.contabilista_recebe_pagamentos(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.contabilista_recebe_pagamentos(uuid) TO anon, authenticated;


-- ── 3. A tabela continua fechada ────────────────────────────────────
--
-- Isto não muda nada — é uma reafirmação executável. Se alguém abrir a
-- tabela por engano numa migração futura, o teste de RLS que acompanha
-- esta migração cai, e cai a dizer porquê.
DROP POLICY IF EXISTS "stripe_proprio_le" ON public.contabilista_stripe;
CREATE POLICY "stripe_proprio_le" ON public.contabilista_stripe
  FOR SELECT TO authenticated
  USING (contabilista_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.contabilista_stripe FROM anon, authenticated;
