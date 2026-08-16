-- ═══════════════════════════════════════════════════════════════════════
--  PAGAMENTOS — Stripe Connect, com cobranças DIRETAS
--  ---------------------------------------------------------------------
--  O QUE MUDA NO MODELO, e porque é que a diferença importa.
--
--  Até aqui, `progressao/fronteiras.ts` dizia: «A taxa é faturada a ti pelo
--  Recibo Certo. O cliente paga-te diretamente — a plataforma não retém nem
--  processa esse pagamento.» O raciocínio por trás está escrito lá e
--  continua a valer: *retirar uma percentagem do dinheiro de um cliente
--  antes de o entregar a outro é outra atividade.*
--
--  A decisão de produto passou a ser que o cliente paga o contabilista
--  ATRAVÉS do Recibo Certo. A forma escolhida é a que preserva o essencial
--  daquele raciocínio: **direct charges**.
--
--    · a cobrança nasce NA CONTA DO CONTABILISTA (cabeçalho `Stripe-Account`);
--    · o contabilista é o comerciante de registo — é o nome dele no extrato
--      do cliente, e é dele o recibo;
--    · o dinheiro NUNCA entra no saldo do Recibo Certo. Vai direto para o
--      saldo dele;
--    · a comissão sai como `application_fee_amount`, que a Stripe encaminha
--      para a plataforma. Não é a plataforma a reter e depois entregar.
--
--  A alternativa (destination charges) punha o dinheiro no saldo da
--  plataforma primeiro. Era isso, e só isso, que a fronteira antiga proibia.
--
--  ── O QUE ESTA MIGRAÇÃO NÃO FAZ, de propósito
--
--  A compra de patamares pelo contabilista JÁ ESTÁ CONSTRUÍDA na migração
--  `20260815233000`: `progressao_compras`, `criar_intencao_desbloqueio`,
--  `aplicar_compra_patamar`, o ledger de créditos com held/released/spent,
--  e o caso §70 — o XP alcançar o patamar a meio do checkout, que marca
--  `needs_refund` e nunca transfere o pagamento para o patamar seguinte.
--
--  Aqui só se acrescenta o que faltava para a ligar à Stripe (guardar o id
--  da sessão) e se abre a bandeira. Reescrever aquilo seria criar um
--  segundo sistema de compras a competir com o primeiro.
--
--  ── AS INVARIANTES DE DINHEIRO, todas do lado do servidor
--
--   1. O VALOR NUNCA VEM DO CLIENTE. O browser manda um id de agendamento;
--      o preço sai daqui. Um preço que viaja pelo browser é um preço que se
--      edita no browser.
--   2. A COMISSÃO É LIDA NO INSTANTE DA COBRANÇA, do patamar efetivo, e
--      guardada com o pagamento. Subir de patamar depois não muda o que já
--      foi cobrado.
--   3. O BENEFÍCIO DE FIDELIDADE é reservado na preparação e só GASTO
--      quando o pagamento liquida. Um checkout abandonado não queima um cupão.
--   4. IDEMPOTÊNCIA por `stripe_checkout_session_id` e
--      `stripe_payment_intent_id`, ambos UNIQUE — o webhook repete-se por
--      desenho.
-- ═══════════════════════════════════════════════════════════════════════

-- ---------------------------------------------------------------------
-- 1. A conta Connect do contabilista
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contabilista_stripe (
  contabilista_id    uuid PRIMARY KEY REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  stripe_account_id  text NOT NULL UNIQUE,
  -- Os três sinais que decidem se se pode cobrar. Vêm do webhook
  -- `account.updated`, nunca de uma leitura do browser.
  charges_enabled    boolean NOT NULL DEFAULT false,
  payouts_enabled    boolean NOT NULL DEFAULT false,
  details_submitted  boolean NOT NULL DEFAULT false,
  -- O que a Stripe ainda pede, mostrado ao contabilista tal e qual.
  requisitos         jsonb   NOT NULL DEFAULT '[]'::jsonb,
  pais               text    NOT NULL DEFAULT 'PT',
  moeda              text    NOT NULL DEFAULT 'eur',
  criado_em          timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contabilista_stripe ENABLE ROW LEVEL SECURITY;

-- Só o próprio lê o seu estado. NENHUMA política de escrita: a conta é
-- criada e atualizada pelo servidor com a chave de serviço. É a lição da
-- migração 024 — validar quem pede não chega, é preciso validar o que é
-- escrito.
DROP POLICY IF EXISTS "stripe_proprio_le" ON public.contabilista_stripe;
CREATE POLICY "stripe_proprio_le" ON public.contabilista_stripe
  FOR SELECT TO authenticated
  USING (contabilista_id = auth.uid());

COMMENT ON TABLE public.contabilista_stripe IS
  'Conta Stripe Connect de cada contabilista. Cobranças diretas: ele é o '
  'comerciante e o dinheiro nunca passa pelo saldo da plataforma. Escrita '
  'exclusiva do servidor.';

-- ---------------------------------------------------------------------
-- 2. Política de pagamento por tipo de consulta
-- ---------------------------------------------------------------------
--
--  `no_pedido`      — paga-se ao marcar. É o que faz sentido para quem não
--                     quer perseguir pagamentos.
--  `depois`         — marca-se sem pagar; ao concluir com o preço real, o
--                     contabilista emite o pedido e o cliente paga da área
--                     dele. É a omissão, porque é o que já acontecia.
--  `sem_pagamento`  — não se cobra por aqui. Uma primeira conversa
--                     gratuita, ou um acerto feito fora da plataforma.

ALTER TABLE public.contabilista_tipos_consulta
  ADD COLUMN IF NOT EXISTS pagamento text NOT NULL DEFAULT 'depois';

DO $$ BEGIN
  ALTER TABLE public.contabilista_tipos_consulta
    ADD CONSTRAINT tipos_consulta_pagamento_valido
    CHECK (pagamento IN ('no_pedido', 'depois', 'sem_pagamento'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.contabilista_tipos_consulta.pagamento IS
  'Quando se paga: no_pedido (pré-pago), depois (ao concluir) ou '
  'sem_pagamento (não se cobra pela plataforma).';

-- ---------------------------------------------------------------------
-- 3. Os pagamentos de consultas (cliente → contabilista)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pagamentos (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id             uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  cliente_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agendamento_id              uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  tipo_consulta_id            uuid REFERENCES public.contabilista_tipos_consulta(id) ON DELETE SET NULL,

  momento                     text NOT NULL DEFAULT 'no_pedido',
  estado                      text NOT NULL DEFAULT 'pendente',

  -- Dinheiro sempre em cêntimos. Nunca float.
  bruto_cents                 integer NOT NULL CHECK (bruto_cents >= 0),
  desconto_cents              integer NOT NULL DEFAULT 0 CHECK (desconto_cents >= 0),
  liquido_cents               integer NOT NULL CHECK (liquido_cents >= 0),
  comissao_cents              integer NOT NULL DEFAULT 0 CHECK (comissao_cents >= 0),
  -- O patamar no INSTANTE da cobrança. Guarda-se em vez de se recalcular:
  -- subir de patamar amanhã não muda o que foi cobrado ontem.
  comissao_bps                integer NOT NULL DEFAULT 0,
  moeda                       text NOT NULL DEFAULT 'eur',

  cupao_id                    uuid REFERENCES public.fidelidade_cupoes(id) ON DELETE SET NULL,

  stripe_account_id           text NOT NULL,
  stripe_checkout_session_id  text UNIQUE,
  stripe_payment_intent_id    text UNIQUE,
  erro                        text,

  descricao                   text,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  pago_em                     timestamptz,
  expira_em                   timestamptz NOT NULL DEFAULT now() + interval '7 days',

  CONSTRAINT pagamentos_estado_valido
    CHECK (estado IN ('pendente', 'pago', 'falhado', 'reembolsado', 'cancelado', 'expirado')),
  CONSTRAINT pagamentos_momento_valido
    CHECK (momento IN ('no_pedido', 'depois')),
  CONSTRAINT pagamentos_liquido_coerente
    CHECK (liquido_cents = bruto_cents - desconto_cents)
);

CREATE INDEX IF NOT EXISTS pagamentos_contabilista_idx
  ON public.pagamentos (contabilista_id, estado, criado_em DESC);
CREATE INDEX IF NOT EXISTS pagamentos_cliente_idx
  ON public.pagamentos (cliente_id, estado, criado_em DESC);

-- Um agendamento não pode ter dois pagamentos vivos ao mesmo tempo. Sem
-- isto, dois separadores abertos geravam duas sessões e a consulta podia
-- ser paga duas vezes.
CREATE UNIQUE INDEX IF NOT EXISTS pagamentos_um_vivo_por_agendamento
  ON public.pagamentos (agendamento_id)
  WHERE agendamento_id IS NOT NULL AND estado IN ('pendente', 'pago');

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- As duas partes leem. Ninguém escreve pelo cliente — nem o valor, nem o
-- estado, nem a comissão. Tudo passa por RPC de servidor ou pelo webhook.
DROP POLICY IF EXISTS "pagamentos_partes_leem" ON public.pagamentos;
CREATE POLICY "pagamentos_partes_leem" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (cliente_id = auth.uid() OR contabilista_id = auth.uid());

COMMENT ON TABLE public.pagamentos IS
  'Cobranças de consultas. Direct charges: nascem na conta Stripe do '
  'contabilista e o dinheiro nunca entra no saldo da plataforma. A comissão '
  'sai como application_fee. Escrita só por RPC de servidor e webhook.';

-- ---------------------------------------------------------------------
-- 4. A comissão em vigor de um contabilista
-- ---------------------------------------------------------------------
--
-- Reutiliza `patamar_efetivo` e `catalogo_versao_corrente` da migração
-- `20260815233000` — o catálogo é versionado, e ler `ordem` sem filtrar
-- pela versão devolveria o patamar de uma recalibração antiga.

CREATE OR REPLACE FUNCTION public.comissao_bps_do_contabilista(p_contabilista uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_p       record;
  v_efetivo smallint;
  v_bps     integer;
BEGIN
  SELECT * INTO v_p FROM public.contabilista_progressao
   WHERE contabilista_id = p_contabilista;

  v_efetivo := public.patamar_efetivo(
    COALESCE(v_p.highest_earned_tier, 1::smallint),
    COALESCE(v_p.highest_purchased_tier, 1::smallint));

  SELECT comissao_bps INTO v_bps FROM public.comissao_patamares
   WHERE versao_catalogo = public.catalogo_versao_corrente()
     AND ordem = v_efetivo AND ativo;

  -- Sem linha, o patamar Base. É a comissão mais ALTA — falhar para o lado
  -- que não prejudica a plataforma seria falhar a favor de quem não pagou.
  RETURN COALESCE(v_bps, 1000);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.comissao_bps_do_contabilista(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.comissao_bps_do_contabilista(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5. Preparar um pagamento de consulta
-- ---------------------------------------------------------------------
--
-- Chamada pelo SERVIDOR depois de validar a sessão. Devolve tudo o que a
-- rota precisa para criar o Checkout — incluindo o valor, que nasce aqui.

CREATE OR REPLACE FUNCTION public.preparar_pagamento_consulta(
  p_cliente     uuid,
  p_agendamento uuid,
  p_cupao       uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_ag       record;
  v_tipo     record;
  v_conta    record;
  v_bruto    integer;
  v_desconto integer := 0;
  v_liquido  integer;
  v_bps      integer;
  v_comissao integer;
  v_cupao    record;
  v_id       uuid;
  v_momento  text;
  v_cupao_a_reservar uuid := NULL;
BEGIN
  SELECT * INTO v_ag FROM public.agendamentos WHERE id = p_agendamento;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'agendamento_inexistente');
  END IF;
  IF v_ag.cliente_id <> p_cliente THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_e_teu');
  END IF;
  IF v_ag.estado IN ('cancelado_cliente', 'cancelado_contabilista') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'consulta_cancelada');
  END IF;

  -- Já pago: não se cobra duas vezes.
  IF EXISTS (SELECT 1 FROM public.pagamentos
              WHERE agendamento_id = p_agendamento AND estado = 'pago') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ja_pago');
  END IF;

  -- A conta Connect tem de existir e conseguir cobrar. Sem isto o Checkout
  -- falhava na Stripe com uma mensagem que ninguém entende.
  SELECT * INTO v_conta FROM public.contabilista_stripe
   WHERE contabilista_id = v_ag.contabilista_id;
  IF NOT FOUND OR NOT v_conta.charges_enabled THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'contabilista_sem_pagamentos');
  END IF;

  SELECT * INTO v_tipo FROM public.contabilista_tipos_consulta
   WHERE id = v_ag.tipo_consulta_id;

  IF v_tipo.id IS NOT NULL AND v_tipo.pagamento = 'sem_pagamento' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'tipo_nao_cobra');
  END IF;

  -- ── O preço. Dois caminhos, e a ordem importa.
  --
  -- Se a consulta JÁ FOI CONCLUÍDA, `concluir_consulta` (Fidelidade V2) já
  -- fixou `preco_cents`, já aplicou o benefício e já GASTOU o cupão. O que
  -- há a cobrar é `valor_final_cents`, e aplicar outro desconto aqui era
  -- descontar duas vezes sobre o mesmo cartão.
  IF v_ag.valor_final_cents IS NOT NULL THEN
    v_momento  := 'depois';
    v_bruto    := v_ag.preco_cents;
    v_desconto := COALESCE(v_ag.desconto_aplicado_cents, 0);
    v_liquido  := v_ag.valor_final_cents;

  -- Caso contrário é um pré-pagamento: o preço vem do catálogo e o
  -- benefício, se a pessoa o aplicar, é reservado agora e gasto na
  -- liquidação.
  ELSE
    v_momento := COALESCE(v_tipo.pagamento, 'depois');
    v_bruto   := COALESCE(v_tipo.preco_cents, 0);

    IF p_cupao IS NOT NULL THEN
      SELECT * INTO v_cupao FROM public.fidelidade_cupoes
       WHERE id = p_cupao
         AND cliente_id = p_cliente
         AND contabilista_id = v_ag.contabilista_id
         AND estado = 'disponivel';
      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'cupao_invalido');
      END IF;
      IF v_cupao.expira_em < now() THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'cupao_expirado');
      END IF;
      v_desconto := ROUND(v_bruto * v_cupao.percentagem / 100.0);
      v_cupao_a_reservar := p_cupao;
    END IF;

    v_liquido := GREATEST(v_bruto - v_desconto, 0);
  END IF;

  IF v_bruto <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_valor_a_cobrar');
  END IF;
  IF v_liquido <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nada_a_cobrar');
  END IF;

  -- ── A comissão. Lida agora, guardada com o pagamento.
  v_bps := public.comissao_bps_do_contabilista(v_ag.contabilista_id);
  v_comissao := ROUND(v_liquido * v_bps / 10000.0);

  -- Reaproveita o lugar de um pendente sem sessão em vez de chocar com o
  -- índice único: quem carregou duas vezes não merece um erro.
  DELETE FROM public.pagamentos
   WHERE agendamento_id = p_agendamento
     AND estado = 'pendente'
     AND stripe_checkout_session_id IS NULL;

  INSERT INTO public.pagamentos (
    contabilista_id, cliente_id, agendamento_id, tipo_consulta_id,
    momento, bruto_cents, desconto_cents, liquido_cents,
    comissao_cents, comissao_bps, cupao_id, stripe_account_id, descricao
  ) VALUES (
    v_ag.contabilista_id, p_cliente, p_agendamento, v_ag.tipo_consulta_id,
    v_momento, v_bruto, v_desconto, v_liquido,
    v_comissao, v_bps, v_cupao_a_reservar, v_conta.stripe_account_id,
    COALESCE(v_tipo.nome, 'Consulta')
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true,
    'pagamentoId', v_id,
    'stripeAccountId', v_conta.stripe_account_id,
    'brutoCents', v_bruto,
    'descontoCents', v_desconto,
    'liquidoCents', v_liquido,
    'comissaoCents', v_comissao,
    'comissaoBps', v_bps,
    'descricao', COALESCE(v_tipo.nome, 'Consulta')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.preparar_pagamento_consulta(uuid, uuid, uuid)
  FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.preparar_pagamento_consulta(uuid, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.preparar_pagamento_consulta(uuid, uuid, uuid) IS
  'Calcula valor e comissão de uma consulta e abre um pagamento pendente. '
  'Só o servidor a chama: é aqui que o preço nasce, e um preço que passasse '
  'pelo browser era um preço editável no browser.';

-- ---------------------------------------------------------------------
-- 6. Registar a sessão de Checkout
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.marcar_checkout_pagamento(
  p_pagamento uuid,
  p_sessao    text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  UPDATE public.pagamentos
     SET stripe_checkout_session_id = p_sessao
   WHERE id = p_pagamento AND estado = 'pendente';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pagamento_nao_pendente');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marcar_checkout_pagamento(uuid, text)
  FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.marcar_checkout_pagamento(uuid, text) TO service_role;

-- O equivalente para a compra de patamar, que vive em `progressao_compras`.
CREATE OR REPLACE FUNCTION public.marcar_checkout_desbloqueio(
  p_compra uuid,
  p_sessao text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  UPDATE public.progressao_compras
     SET estado = 'checkout_created', stripe_checkout_session_id = p_sessao
   WHERE id = p_compra AND estado = 'draft';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'compra_nao_esta_em_rascunho');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marcar_checkout_desbloqueio(uuid, text)
  FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.marcar_checkout_desbloqueio(uuid, text) TO service_role;

-- Encontrar a compra pela sessão — é tudo o que o webhook tem em mão.
CREATE OR REPLACE FUNCTION public.compra_por_sessao(p_sessao text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT id FROM public.progressao_compras WHERE stripe_checkout_session_id = p_sessao;
$$;

REVOKE EXECUTE ON FUNCTION public.compra_por_sessao(text) FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.compra_por_sessao(text) TO service_role;

-- ---------------------------------------------------------------------
-- 7. Liquidar um pagamento de consulta (webhook)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.liquidar_pagamento(
  p_sessao         text,
  p_payment_intent text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_pag record;
BEGIN
  SELECT * INTO v_pag FROM public.pagamentos
   WHERE stripe_checkout_session_id = p_sessao
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pagamento_desconhecido');
  END IF;

  -- Idempotência: o webhook repete-se por desenho.
  IF v_pag.estado = 'pago' THEN
    RETURN jsonb_build_object('ok', true, 'repetido', true);
  END IF;

  UPDATE public.pagamentos
     SET estado = 'pago',
         pago_em = now(),
         stripe_payment_intent_id = COALESCE(p_payment_intent, stripe_payment_intent_id)
   WHERE id = v_pag.id;

  -- O benefício só se gasta AGORA — e só no pré-pagamento. Numa consulta
  -- já concluída, `concluir_consulta` gastou-o na altura, e `cupao_id`
  -- ficou nulo de propósito.
  IF v_pag.cupao_id IS NOT NULL THEN
    UPDATE public.fidelidade_cupoes
       SET estado = 'usado', usado_em = now(),
           usado_agendamento_id = COALESCE(usado_agendamento_id, v_pag.agendamento_id),
           valor_base_cents = COALESCE(valor_base_cents, v_pag.bruto_cents)
     WHERE id = v_pag.cupao_id AND estado = 'disponivel';
  END IF;

  -- Uma consulta pré-paga fica confirmada: o cliente pagou, e deixá-la
  -- «por confirmar» obrigava a uma segunda ação para nada.
  IF v_pag.agendamento_id IS NOT NULL AND v_pag.momento = 'no_pedido' THEN
    UPDATE public.agendamentos
       SET estado = 'confirmado'
     WHERE id = v_pag.agendamento_id AND estado = 'pedido';
  END IF;

  PERFORM public.avisar_utilizador(
    v_pag.contabilista_id, 'pagamento_recebido', 'Pagamento recebido',
    'Um cliente pagou uma consulta.', '/contabilista/clientes');

  RETURN jsonb_build_object('ok', true, 'pagamentoId', v_pag.id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.liquidar_pagamento(text, text)
  FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.liquidar_pagamento(text, text) TO service_role;

-- Marcar como falhado/expirado sem perder o registo.
CREATE OR REPLACE FUNCTION public.encerrar_pagamento(
  p_sessao text,
  p_estado text,
  p_erro   text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF p_estado NOT IN ('falhado', 'expirado', 'cancelado') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'estado_invalido');
  END IF;
  UPDATE public.pagamentos
     SET estado = p_estado, erro = LEFT(COALESCE(p_erro, ''), 500)
   WHERE stripe_checkout_session_id = p_sessao AND estado = 'pendente';
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.encerrar_pagamento(text, text, text)
  FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.encerrar_pagamento(text, text, text) TO service_role;

-- ---------------------------------------------------------------------
-- 8. O que o cliente e o contabilista precisam de saber
-- ---------------------------------------------------------------------
--
-- Consultas concluídas com preço fixado e ainda por pagar. É isto que
-- alimenta o «tens uma consulta por pagar» na área do cliente e o «à espera
-- de pagamento» no painel.

CREATE OR REPLACE FUNCTION public.consultas_por_pagar(p_cliente uuid DEFAULT NULL)
RETURNS TABLE (
  agendamento_id   uuid,
  contabilista_id  uuid,
  cliente_id       uuid,
  inicio           timestamptz,
  valor_cents      integer,
  descricao        text,
  pagamento_id     uuid,
  pagamento_estado text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT
    a.id, a.contabilista_id, a.cliente_id, a.inicio,
    a.valor_final_cents,
    COALESCE(t.nome, 'Consulta'),
    p.id, p.estado
    FROM public.agendamentos a
    LEFT JOIN public.contabilista_tipos_consulta t ON t.id = a.tipo_consulta_id
    LEFT JOIN public.pagamentos p
           ON p.agendamento_id = a.id AND p.estado IN ('pendente', 'pago')
   WHERE a.estado = 'realizada'
     AND a.valor_final_cents IS NOT NULL
     AND a.valor_final_cents > 0
     AND (p.id IS NULL OR p.estado = 'pendente')
     AND COALESCE(t.pagamento, 'depois') <> 'sem_pagamento'
     AND (
       (p_cliente IS NOT NULL AND a.cliente_id = p_cliente AND a.cliente_id = auth.uid())
       OR (p_cliente IS NULL AND a.contabilista_id = auth.uid())
     )
   ORDER BY a.inicio DESC
   LIMIT 100;
$$;

REVOKE EXECUTE ON FUNCTION public.consultas_por_pagar(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.consultas_por_pagar(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 9. Abrir o desbloqueio pago
-- ---------------------------------------------------------------------
--
-- A máquina já existe (migração `20260815233000`). O que faltava era a
-- bandeira: `criar_intencao_desbloqueio` recusa com `compra_indisponivel`
-- enquanto estiver desligada, e era isso que `COPY_DESBLOQUEIO_INDISPONIVEL`
-- explicava ao contabilista.

UPDATE public.progressao_flags
   SET ativa = true
 WHERE chave = 'accountant_tier_purchase';
