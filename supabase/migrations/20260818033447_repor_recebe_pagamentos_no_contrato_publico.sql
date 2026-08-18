-- 20260818033447_repor_recebe_pagamentos_no_contrato_publico.sql
-- ═══════════════════════════════════════════════════════════════════════
--  A VIEW QUE VOLTOU PARA TRÁS SOZINHA
--  ---------------------------------------------------------------------
--  `20260816170000_recebimentos_no_contrato_publico.sql` acrescentou
--  `recebe_pagamentos` ao contrato público. Correu, e consta como aplicada
--  — a função `contabilista_recebe_pagamentos` que ela cria na secção 2
--  existe em produção. Mas a VIEW ficou sem a coluna e sem o LEFT JOIN a
--  `contabilista_stripe`: foi reposta depois por uma definição anterior,
--  fora do histórico de migrações.
--
--  O efeito não era cosmético. `CAMPOS_DO_CARTAO`, em
--  `src/lib/contabilistas/diretorio.ts`, pede `recebe_pagamentos`; o
--  PostgREST respondia 400 «column does not exist» e o diretório público
--  mostrava «Não foi possível carregar o diretório» a QUALQUER visitante.
--  Não era o estado vazio de quem ainda não tem contabilistas — era o
--  estado de erro, e escondia o facto de o diretório estar simplesmente
--  vazio.
--
--  Nada em código o teria apanhado: o código estava certo e a migração
--  também. Quem derivou foi a base de dados viva. É essa a razão de
--  `scripts/check-contrato-publico.mjs` perguntar à base de dados que
--  serve o site, e não aos ficheiros deste repositório.
--
--  Definição idêntica à de 20260816170000. Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

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
