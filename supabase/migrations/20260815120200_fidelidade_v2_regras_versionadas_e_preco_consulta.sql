-- =====================================================================
-- FIDELIDADE V2 — REGRAS VERSIONADAS, PREÇO POR CONSULTA E BENEFÍCIO
-- PENDENTE
--
-- Fonte de verdade: Relatório Mestre §13–29, §48.
--
-- Três correções de domínio, não de aparência:
--
--  A. O preço deixa de ser global. Hoje existe até um CHECK
--     (`contabilistas_fidelidade_precisa_de_preco`) que PROÍBE ligar a
--     fidelidade sem um preço universal. Esse CHECK cai. O preço real
--     passa a viver na consulta concreta.
--
--  B. A regra do cartão passa a ser uma linha imutável e versionada.
--     Alterar a configuração publica uma versão nova; os cartões em
--     curso continuam agarrados à versão com que nasceram.
--
--  C. Completar um cartão deixa de abrir logo o seguinte. Hoje
--     `carimbar_consulta` emite o cupão e insere já outro cartão com a
--     configuração ATUAL — o que quebra a promessa duas vezes: fecha o
--     ciclo cedo demais e aplica ao cliente uma regra que ele nunca viu.
--     Passa a existir o estado BENEFÍCIO PENDENTE.
--
-- Nada de legacy é reescrito: cupões antigos mantêm a semântica de
-- preço congelado com que foram prometidos.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Regras versionadas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fidelidade_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  versao integer NOT NULL CHECK (versao >= 1),
  meta integer NOT NULL CHECK (meta BETWEEN 3 AND 12),
  desconto_pct integer NOT NULL CHECK (desconto_pct BETWEEN 10 AND 50),
  -- Só consultas efetivamente pagas carimbam. Uma primeira conversa
  -- grátis é legítima (contabilista_tipos_consulta.preco_cents = 0),
  -- mas não deve encher o cartão. Fica congelado na regra porque é
  -- parte da promessa.
  exige_pagamento boolean NOT NULL DEFAULT true,
  validade_dias integer NOT NULL DEFAULT 365 CHECK (validade_dias BETWEEN 30 AND 1095),
  ativa boolean NOT NULL DEFAULT true,
  publicada_em timestamptz NOT NULL DEFAULT now(),
  substituida_em timestamptz,
  UNIQUE (contabilista_id, versao)
);

CREATE UNIQUE INDEX IF NOT EXISTS fidelidade_regra_corrente_idx
  ON public.fidelidade_regras (contabilista_id) WHERE substituida_em IS NULL;
CREATE INDEX IF NOT EXISTS fidelidade_regras_contabilista_idx
  ON public.fidelidade_regras (contabilista_id, versao DESC);

COMMENT ON TABLE public.fidelidade_regras IS
  'Uma regra publicada é imutável. Mudar a configuração fecha a versão corrente e publica outra. Nunca UPDATE meta/desconto numa versão que já pode estar ligada a um cartão.';

-- Imutabilidade: só `substituida_em` e `ativa` podem mudar depois de publicada.
CREATE OR REPLACE FUNCTION public.fidelidade_regras_imutaveis() RETURNS trigger
LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF NEW.meta            IS DISTINCT FROM OLD.meta
  OR NEW.desconto_pct    IS DISTINCT FROM OLD.desconto_pct
  OR NEW.exige_pagamento IS DISTINCT FROM OLD.exige_pagamento
  OR NEW.validade_dias   IS DISTINCT FROM OLD.validade_dias
  OR NEW.versao          IS DISTINCT FROM OLD.versao
  OR NEW.contabilista_id IS DISTINCT FROM OLD.contabilista_id
  OR NEW.publicada_em    IS DISTINCT FROM OLD.publicada_em THEN
    RAISE EXCEPTION 'Uma regra de fidelidade publicada não se altera. Publica uma versão nova.'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS fidelidade_regras_imutabilidade ON public.fidelidade_regras;
CREATE TRIGGER fidelidade_regras_imutabilidade BEFORE UPDATE ON public.fidelidade_regras
  FOR EACH ROW EXECUTE FUNCTION public.fidelidade_regras_imutaveis();

ALTER TABLE public.fidelidade_regras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fidelidade_regras_dono_le ON public.fidelidade_regras;
CREATE POLICY fidelidade_regras_dono_le ON public.fidelidade_regras
  FOR SELECT TO authenticated USING (contabilista_id = (SELECT auth.uid()));

-- A policy de leitura do cliente depende de `fidelidade_cartoes.regra_id`,
-- que só existe a partir do passo 2. É criada lá.
--
-- Sem policy de INSERT/UPDATE/DELETE: publicar é uma RPC.

-- ---------------------------------------------------------------------
-- 2. Cartões referenciam a regra
-- ---------------------------------------------------------------------
ALTER TABLE public.fidelidade_cartoes
  ADD COLUMN IF NOT EXISTS regra_id uuid REFERENCES public.fidelidade_regras(id),
  ADD COLUMN IF NOT EXISTS regra_versao integer;

CREATE INDEX IF NOT EXISTS fidelidade_cartoes_regra_idx ON public.fidelidade_cartoes (regra_id);

COMMENT ON COLUMN public.fidelidade_cartoes.meta IS
  'Snapshot redundante da regra, mantido de propósito: se a linha da regra desaparecesse por acidente, o cartão continua a saber a promessa que fez.';

DROP POLICY IF EXISTS fidelidade_regras_cliente_le ON public.fidelidade_regras;
CREATE POLICY fidelidade_regras_cliente_le ON public.fidelidade_regras
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.fidelidade_cartoes c
             WHERE c.regra_id = fidelidade_regras.id AND c.cliente_id = (SELECT auth.uid()))
    OR (substituida_em IS NULL
        AND public.vinculo_nao_terminado(contabilista_id, (SELECT auth.uid())))
  );

-- ---------------------------------------------------------------------
-- 3. Cupões: modelo legacy vs. percentagem sobre a consulta real
-- ---------------------------------------------------------------------
ALTER TABLE public.fidelidade_cupoes
  ADD COLUMN IF NOT EXISTS modelo text NOT NULL DEFAULT 'legacy_preco_congelado'
    CHECK (modelo IN ('legacy_preco_congelado','percentagem_consulta')),
  ADD COLUMN IF NOT EXISTS desconto_cents integer CHECK (desconto_cents IS NULL OR desconto_cents >= 0),
  ADD COLUMN IF NOT EXISTS valor_final_cents integer CHECK (valor_final_cents IS NULL OR valor_final_cents >= 0),
  ADD COLUMN IF NOT EXISTS regra_id uuid REFERENCES public.fidelidade_regras(id);

-- Cupões novos não sabem o valor base até serem usados.
ALTER TABLE public.fidelidade_cupoes ALTER COLUMN valor_base_cents DROP NOT NULL;

ALTER TABLE public.fidelidade_cupoes DROP CONSTRAINT IF EXISTS fidelidade_cupoes_coerente;
ALTER TABLE public.fidelidade_cupoes ADD CONSTRAINT fidelidade_cupoes_coerente CHECK (
  (modelo = 'legacy_preco_congelado' AND valor_base_cents IS NOT NULL)
  OR
  (modelo = 'percentagem_consulta' AND (
      (estado <> 'usado' AND valor_base_cents IS NULL)
      OR
      (estado = 'usado'  AND valor_base_cents IS NOT NULL
                         AND desconto_cents IS NOT NULL
                         AND valor_final_cents IS NOT NULL
                         AND valor_final_cents = valor_base_cents - desconto_cents)
  ))
);

-- Um só benefício pendente por par. É esta linha que torna a máquina de
-- estados verdadeira na base de dados e não apenas na RPC.
CREATE UNIQUE INDEX IF NOT EXISTS fidelidade_beneficio_pendente_idx
  ON public.fidelidade_cupoes (contabilista_id, cliente_id) WHERE estado = 'disponivel';

COMMENT ON INDEX public.fidelidade_beneficio_pendente_idx IS
  'Invariante §15: nunca coexistem benefício pendente de um ciclo antigo e cartão novo a acumular carimbos.';

-- ---------------------------------------------------------------------
-- 4. Preço real na consulta (§18)
-- ---------------------------------------------------------------------
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS preco_cents integer CHECK (preco_cents IS NULL OR preco_cents >= 0),
  ADD COLUMN IF NOT EXISTS desconto_aplicado_cents integer
    CHECK (desconto_aplicado_cents IS NULL OR desconto_aplicado_cents >= 0),
  ADD COLUMN IF NOT EXISTS valor_final_cents integer
    CHECK (valor_final_cents IS NULL OR valor_final_cents >= 0),
  ADD COLUMN IF NOT EXISTS preco_definido_em timestamptz;

ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_valores_coerentes;
ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_valores_coerentes CHECK (
  preco_cents IS NULL
  OR valor_final_cents = preco_cents - coalesce(desconto_aplicado_cents, 0)
);

COMMENT ON COLUMN public.agendamentos.preco_cents IS
  'Preço REAL desta consulta, em cêntimos, definido pelo contabilista ao concluir. É a base sobre a qual um benefício em percentagem incide. O Recibo Certo regista o valor; não processa o pagamento.';

-- ---------------------------------------------------------------------
-- 5. Cai a trava do preço global
-- ---------------------------------------------------------------------
ALTER TABLE public.contabilistas
  DROP CONSTRAINT IF EXISTS contabilistas_fidelidade_precisa_de_preco;

COMMENT ON COLUMN public.contabilistas.preco_consulta_cents IS
  'DEPRECADO como fonte de verdade. Mantido por compatibilidade e como sugestão comercial. A fidelidade V2 não depende dele (§14.1).';

-- As três colunas de configuração passam a ser um espelho da regra
-- corrente. Só a RPC de publicação lhes toca.
CREATE OR REPLACE FUNCTION public.contabilistas_tranca_colunas() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      RAISE EXCEPTION 'O estado da conta de contabilista só é alterado pela administração.'; END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'O titular de uma conta de contabilista não pode ser alterado.'; END IF;
    IF NEW.slug IS DISTINCT FROM OLD.slug THEN
      RAISE EXCEPTION 'O endereço público só é alterado pela administração.'; END IF;
    IF NEW.occ_verificado_em IS DISTINCT FROM OLD.occ_verificado_em
       OR NEW.occ_verificado_por IS DISTINCT FROM OLD.occ_verificado_por THEN
      RAISE EXCEPTION 'A verificação do número OCC só é registada pela administração.'; END IF;

    IF current_setting('rc.publicando_regra', true) IS DISTINCT FROM 'on' THEN
      IF NEW.fidelidade_meta         IS DISTINCT FROM OLD.fidelidade_meta
      OR NEW.fidelidade_desconto_pct IS DISTINCT FROM OLD.fidelidade_desconto_pct
      OR NEW.fidelidade_ativa        IS DISTINCT FROM OLD.fidelidade_ativa THEN
        RAISE EXCEPTION 'A configuração de fidelidade muda por publicação de regra (publicar_regra_fidelidade), não por UPDATE direto.'
          USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;
  NEW.atualizado_em := now();
  RETURN NEW;
END; $$;

-- ---------------------------------------------------------------------
-- 6. BACKFILL — versão legacy por contabilista, cartões ligados
-- ---------------------------------------------------------------------
INSERT INTO public.fidelidade_regras
  (contabilista_id, versao, meta, desconto_pct, exige_pagamento, ativa, publicada_em)
SELECT c.user_id, 1, c.fidelidade_meta, c.fidelidade_desconto_pct,
       false,               -- a promessa antiga não exigia pagamento; não a apertamos retroativamente
       c.fidelidade_ativa, c.criado_em
  FROM public.contabilistas c
 WHERE NOT EXISTS (SELECT 1 FROM public.fidelidade_regras r WHERE r.contabilista_id = c.user_id);

UPDATE public.fidelidade_cartoes ca
   SET regra_id = r.id, regra_versao = r.versao
  FROM public.fidelidade_regras r
 WHERE r.contabilista_id = ca.contabilista_id
   AND r.versao = 1
   AND ca.regra_id IS NULL;

UPDATE public.fidelidade_cupoes cu
   SET regra_id = ca.regra_id
  FROM public.fidelidade_cartoes ca
 WHERE ca.id = cu.cartao_id AND cu.regra_id IS NULL;

-- Cartões sem carimbos abertos antecipadamente pelo bug §14.2:
-- fecham-se aqui. Um cartão a zero não é uma promessa em curso.
DELETE FROM public.fidelidade_cartoes ca
 WHERE NOT ca.completo
   AND ca.carimbos = 0
   AND EXISTS (SELECT 1 FROM public.fidelidade_cupoes cu
                WHERE cu.contabilista_id = ca.contabilista_id
                  AND cu.cliente_id = ca.cliente_id
                  AND cu.estado = 'disponivel');

-- ---------------------------------------------------------------------
-- 7. Publicar uma regra (§28)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.impacto_nova_regra_fidelidade()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT jsonb_build_object(
    'cartoes_em_curso', (SELECT count(*) FROM public.fidelidade_cartoes
                          WHERE contabilista_id = auth.uid() AND NOT completo),
    'beneficios_pendentes', (SELECT count(*) FROM public.fidelidade_cupoes
                              WHERE contabilista_id = auth.uid() AND estado = 'disponivel'),
    'clientes_sem_ciclo', (SELECT count(*) FROM public.contabilista_vinculos v
                            WHERE v.contabilista_id = auth.uid() AND v.estado = 'ativo'
                              AND NOT EXISTS (SELECT 1 FROM public.fidelidade_cartoes ca
                                               WHERE ca.contabilista_id = v.contabilista_id
                                                 AND ca.cliente_id = v.cliente_id AND NOT ca.completo)
                              AND NOT EXISTS (SELECT 1 FROM public.fidelidade_cupoes cu
                                               WHERE cu.contabilista_id = v.contabilista_id
                                                 AND cu.cliente_id = v.cliente_id AND cu.estado = 'disponivel'))
  );
$$;

CREATE OR REPLACE FUNCTION public.publicar_regra_fidelidade(
  p_meta integer,
  p_desconto_pct integer,
  p_ativa boolean DEFAULT true,
  p_exige_pagamento boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_corrente record;
  v_versao integer;
  v_id uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  SELECT * INTO v_corrente FROM public.fidelidade_regras
   WHERE contabilista_id = v_uid AND substituida_em IS NULL FOR UPDATE;

  -- Republicar exatamente o mesmo não cria versão nova (§12.13 aplicado
  -- ao domínio: não escrever história por um clique sem alteração).
  IF FOUND
     AND v_corrente.meta = p_meta
     AND v_corrente.desconto_pct = p_desconto_pct
     AND v_corrente.exige_pagamento = p_exige_pagamento
     AND v_corrente.ativa = p_ativa THEN
    RETURN jsonb_build_object('ok', true, 'inalterada', true,
                              'regra_id', v_corrente.id, 'versao', v_corrente.versao);
  END IF;

  SELECT coalesce(max(versao), 0) + 1 INTO v_versao
    FROM public.fidelidade_regras WHERE contabilista_id = v_uid;

  IF FOUND AND v_corrente.id IS NOT NULL THEN
    UPDATE public.fidelidade_regras SET substituida_em = now(), ativa = false
     WHERE id = v_corrente.id;
  END IF;

  INSERT INTO public.fidelidade_regras
    (contabilista_id, versao, meta, desconto_pct, exige_pagamento, ativa)
  VALUES (v_uid, v_versao, p_meta, p_desconto_pct, p_exige_pagamento, p_ativa)
  RETURNING id INTO v_id;

  PERFORM set_config('rc.publicando_regra', 'on', true);
  UPDATE public.contabilistas
     SET fidelidade_meta = p_meta,
         fidelidade_desconto_pct = p_desconto_pct,
         fidelidade_ativa = p_ativa
   WHERE user_id = v_uid;
  PERFORM set_config('rc.publicando_regra', 'off', true);

  RETURN jsonb_build_object('ok', true, 'inalterada', false, 'regra_id', v_id, 'versao', v_versao);
END; $$;

-- ---------------------------------------------------------------------
-- 8. Hook de progressão (preenchido pela migração seguinte)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fidelidade_ciclo_concluido_hook(
  p_contabilista uuid, p_cliente uuid, p_cartao uuid, p_meta integer
) RETURNS void
LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  -- No-op até a migração de Progressão e Comissão a substituir.
  -- Existe já aqui para que a Fidelidade V2 possa ser lançada primeiro
  -- sem depender do domínio comercial.
  RETURN;
END; $$;

REVOKE EXECUTE ON FUNCTION public.fidelidade_ciclo_concluido_hook(uuid,uuid,uuid,integer) FROM anon, authenticated, PUBLIC;

CREATE OR REPLACE FUNCTION public.progressao_servico_concluido_hook(
  p_contabilista uuid, p_cliente uuid, p_agendamento uuid, p_preco_cents integer
) RETURNS void
LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  -- No-op até à migração de Progressão e Comissão. Existe aqui para que
  -- `concluir_consulta` seja escrita UMA vez: a migração seguinte troca
  -- só o corpo deste gancho, não a RPC de negócio.
  RETURN;
END; $$;

REVOKE EXECUTE ON FUNCTION public.progressao_servico_concluido_hook(uuid,uuid,uuid,integer) FROM anon, authenticated, PUBLIC;

-- ---------------------------------------------------------------------
-- 9. Máquina de estados nova
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fidelidade_expirar_cupoes(p_contabilista uuid, p_cliente uuid)
RETURNS integer
LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE v_n integer;
BEGIN
  UPDATE public.fidelidade_cupoes
     SET estado = 'expirado'
   WHERE contabilista_id = p_contabilista AND cliente_id = p_cliente
     AND estado = 'disponivel' AND expira_em <= now();
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END; $$;

CREATE OR REPLACE FUNCTION public.carimbar_consulta(p_agendamento_id uuid, p_codigo_cupao text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_ag       record;
  v_regra    record;
  v_cartao   record;
  v_carimbos integer;
  v_cupao_id uuid;
  v_inseridos integer;
BEGIN
  SELECT * INTO v_ag FROM public.agendamentos WHERE id = p_agendamento_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'agendamento_inexistente'); END IF;
  IF v_ag.estado <> 'realizada' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'consulta_nao_realizada'); END IF;

  PERFORM public.fidelidade_expirar_cupoes(v_ag.contabilista_id, v_ag.cliente_id);

  -- Regra corrente do contabilista.
  SELECT * INTO v_regra FROM public.fidelidade_regras
   WHERE contabilista_id = v_ag.contabilista_id AND substituida_em IS NULL;
  IF NOT FOUND OR NOT v_regra.ativa THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'fidelidade_inativa'); END IF;

  -- Cartão em curso?
  SELECT * INTO v_cartao FROM public.fidelidade_cartoes
   WHERE contabilista_id = v_ag.contabilista_id AND cliente_id = v_ag.cliente_id
     AND NOT completo FOR UPDATE;

  IF NOT FOUND THEN
    -- REGRA NOVA (§15): sem cartão aberto, mas com benefício por usar,
    -- o ciclo seguinte ainda não nasce.
    IF EXISTS (SELECT 1 FROM public.fidelidade_cupoes
                WHERE contabilista_id = v_ag.contabilista_id
                  AND cliente_id = v_ag.cliente_id AND estado = 'disponivel') THEN
      RETURN jsonb_build_object('ok', true, 'carimbado', false,
                                'motivo', 'beneficio_pendente', 'completou', false);
    END IF;

    -- Consulta grátis não abre ciclo quando a regra exige pagamento.
    IF v_regra.exige_pagamento AND coalesce(v_ag.preco_cents, 0) <= 0 THEN
      RETURN jsonb_build_object('ok', true, 'carimbado', false,
                                'motivo', 'consulta_nao_elegivel', 'completou', false);
    END IF;

    INSERT INTO public.fidelidade_cartoes
      (contabilista_id, cliente_id, carimbos, meta, desconto_pct, preco_base_cents,
       regra_id, regra_versao)
    VALUES (v_ag.contabilista_id, v_ag.cliente_id, 0,
            v_regra.meta, v_regra.desconto_pct, 0, v_regra.id, v_regra.versao)
    ON CONFLICT DO NOTHING
    RETURNING * INTO v_cartao;

    IF v_cartao.id IS NULL THEN
      SELECT * INTO v_cartao FROM public.fidelidade_cartoes
       WHERE contabilista_id = v_ag.contabilista_id AND cliente_id = v_ag.cliente_id
         AND NOT completo FOR UPDATE;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'cartao_indisponivel'); END IF;
    END IF;
  ELSE
    -- Cartão em curso: a elegibilidade segue a regra CONGELADA nele.
    SELECT * INTO v_regra FROM public.fidelidade_regras WHERE id = v_cartao.regra_id;
    IF v_regra.id IS NOT NULL AND v_regra.exige_pagamento
       AND coalesce(v_ag.preco_cents, 0) <= 0 THEN
      RETURN jsonb_build_object('ok', true, 'carimbado', false,
                                'motivo', 'consulta_nao_elegivel',
                                'cartao_id', v_cartao.id,
                                'carimbos', v_cartao.carimbos, 'meta', v_cartao.meta,
                                'completou', false);
    END IF;
  END IF;

  INSERT INTO public.fidelidade_carimbos (cartao_id, agendamento_id)
  VALUES (v_cartao.id, p_agendamento_id) ON CONFLICT (agendamento_id) DO NOTHING;
  GET DIAGNOSTICS v_inseridos = ROW_COUNT;

  IF v_inseridos = 0 THEN
    RETURN jsonb_build_object('ok', true, 'repetido', true, 'carimbado', false,
      'cartao_id', v_cartao.id, 'carimbos', v_cartao.carimbos,
      'meta', v_cartao.meta, 'completou', false);
  END IF;

  v_carimbos := v_cartao.carimbos + 1;

  IF v_carimbos < v_cartao.meta THEN
    UPDATE public.fidelidade_cartoes SET carimbos = v_carimbos WHERE id = v_cartao.id;
    RETURN jsonb_build_object('ok', true, 'repetido', false, 'carimbado', true,
      'cartao_id', v_cartao.id, 'carimbos', v_carimbos,
      'meta', v_cartao.meta, 'completou', false);
  END IF;

  -- Cartão completo: fecha, emite benefício e PÁRA. O ciclo seguinte só
  -- nasce depois de o benefício ser usado.
  UPDATE public.fidelidade_cartoes
     SET carimbos = v_cartao.meta, completo = true, completo_em = now()
   WHERE id = v_cartao.id;

  INSERT INTO public.fidelidade_cupoes
    (codigo, contabilista_id, cliente_id, cartao_id, percentagem,
     valor_base_cents, modelo, regra_id, expira_em)
  VALUES (p_codigo_cupao, v_ag.contabilista_id, v_ag.cliente_id, v_cartao.id,
          v_cartao.desconto_pct, NULL, 'percentagem_consulta', v_cartao.regra_id,
          now() + make_interval(days => coalesce(
            (SELECT validade_dias FROM public.fidelidade_regras WHERE id = v_cartao.regra_id), 365)))
  RETURNING id INTO v_cupao_id;

  PERFORM public.fidelidade_ciclo_concluido_hook(
    v_ag.contabilista_id, v_ag.cliente_id, v_cartao.id, v_cartao.meta);

  RETURN jsonb_build_object('ok', true, 'repetido', false, 'carimbado', true,
    'cartao_id', v_cartao.id, 'carimbos', v_cartao.meta, 'meta', v_cartao.meta,
    'completou', true, 'cupao_id', v_cupao_id, 'codigo', p_codigo_cupao,
    'percentagem', v_cartao.desconto_pct, 'modelo', 'percentagem_consulta');
END; $$;

REVOKE EXECUTE ON FUNCTION public.carimbar_consulta(uuid, text) FROM anon, authenticated, PUBLIC;

-- ---------------------------------------------------------------------
-- 10. concluir_consulta com preço e resgate (§20)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.concluir_consulta(uuid, boolean);

CREATE OR REPLACE FUNCTION public.concluir_consulta(
  p_agendamento uuid,
  p_compareceu boolean DEFAULT true,
  p_preco_cents integer DEFAULT NULL,
  p_cupao uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ag record;
  v_cupao record;
  v_desconto integer := 0;
  v_final integer;
  v_fidelidade jsonb := NULL;
  v_vinculo uuid;
  v_beneficio jsonb := NULL;
BEGIN
  IF v_uid IS NULL OR NOT public.contabilista_ativo(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  SELECT * INTO v_ag FROM public.agendamentos a
   WHERE a.id = p_agendamento AND a.contabilista_id = v_uid
     AND a.estado IN ('pedido','confirmado') AND a.inicio <= now()
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_concluivel');
  END IF;

  -- Não compareceu: fecha e termina. Sem preço, sem carimbo.
  IF NOT p_compareceu THEN
    UPDATE public.agendamentos SET estado = 'nao_compareceu', atualizado_em = now()
     WHERE id = p_agendamento;
    RETURN jsonb_build_object('ok', true, 'estado', 'nao_compareceu', 'fidelidade', NULL);
  END IF;

  IF p_preco_cents IS NULL OR p_preco_cents < 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'preco_obrigatorio');
  END IF;

  -- Resgate do benefício, se houver.
  IF p_cupao IS NOT NULL THEN
    SELECT * INTO v_cupao FROM public.fidelidade_cupoes
     WHERE id = p_cupao AND contabilista_id = v_uid AND cliente_id = v_ag.cliente_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'cupao_invalido'); END IF;
    IF v_cupao.estado <> 'disponivel' THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'cupao_indisponivel'); END IF;
    IF v_cupao.expira_em <= now() THEN
      UPDATE public.fidelidade_cupoes SET estado = 'expirado' WHERE id = v_cupao.id;
      RETURN jsonb_build_object('ok', false, 'motivo', 'cupao_expirado'); END IF;

    -- Legacy: a promessa foi sobre um valor congelado. Não se reescreve.
    IF v_cupao.modelo = 'legacy_preco_congelado' THEN
      v_desconto := round(v_cupao.valor_base_cents::numeric * v_cupao.percentagem / 100.0);
      v_desconto := least(v_desconto, p_preco_cents);
    ELSE
      v_desconto := round(p_preco_cents::numeric * v_cupao.percentagem / 100.0);
    END IF;
  END IF;

  v_final := p_preco_cents - v_desconto;

  UPDATE public.agendamentos SET
      estado = 'realizada',
      preco_cents = p_preco_cents,
      desconto_aplicado_cents = v_desconto,
      valor_final_cents = v_final,
      preco_definido_em = now(),
      cupao_id = p_cupao,
      atualizado_em = now()
   WHERE id = p_agendamento;

  -- Um serviço concluído é um facto; a Progressão decide o que vale.
  -- Acontece com ou sem resgate de benefício.
  PERFORM public.progressao_servico_concluido_hook(
    v_uid, v_ag.cliente_id, p_agendamento, p_preco_cents);

  IF p_cupao IS NOT NULL THEN
    UPDATE public.fidelidade_cupoes SET
        estado = 'usado', usado_em = now(), usado_agendamento_id = p_agendamento,
        valor_base_cents = coalesce(valor_base_cents, p_preco_cents),
        desconto_cents = v_desconto,
        valor_final_cents = v_final
     WHERE id = p_cupao;

    v_beneficio := jsonb_build_object(
      'usado', true, 'codigo', v_cupao.codigo, 'percentagem', v_cupao.percentagem,
      'base_cents', p_preco_cents, 'desconto_cents', v_desconto, 'final_cents', v_final);

    -- §20: a consulta de resgate encerra o ciclo anterior e NÃO carimba
    -- o ciclo seguinte. O próximo cartão nasce na consulta a seguir.
    RETURN jsonb_build_object('ok', true, 'estado', 'realizada',
      'preco_cents', p_preco_cents, 'valor_final_cents', v_final,
      'beneficio', v_beneficio, 'fidelidade', NULL);
  END IF;

  v_fidelidade := public.carimbar_consulta(p_agendamento, public.gerar_codigo_cupao());

  IF coalesce((v_fidelidade->>'completou')::boolean, false) THEN
    SELECT v.id INTO v_vinculo FROM public.contabilista_vinculos v
     WHERE v.contabilista_id = v_uid AND v.cliente_id = v_ag.cliente_id
       AND v.estado <> 'terminado';
    IF v_vinculo IS NOT NULL THEN
      PERFORM public.avisar_parte(v_vinculo, v_uid, 'cupao_ganho',
        'Completaste o cartão de fidelidade',
        'Tens um desconto à espera para usar na próxima consulta.', '/dashboard/contabilista');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'estado', 'realizada',
    'preco_cents', p_preco_cents, 'valor_final_cents', v_final,
    'beneficio', NULL, 'fidelidade', v_fidelidade);
END; $$;

REVOKE EXECUTE ON FUNCTION public.concluir_consulta(uuid, boolean, integer, uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.concluir_consulta(uuid, boolean, integer, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.publicar_regra_fidelidade(integer,integer,boolean,boolean) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.publicar_regra_fidelidade(integer,integer,boolean,boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.impacto_nova_regra_fidelidade() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.impacto_nova_regra_fidelidade() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.fidelidade_expirar_cupoes(uuid,uuid) FROM anon, authenticated, PUBLIC;

-- Privilégios explícitos: as regras são lidas, nunca escritas pelo cliente.
REVOKE ALL ON public.fidelidade_regras FROM anon, authenticated;
GRANT SELECT ON public.fidelidade_regras TO authenticated;

-- ---------------------------------------------------------------------
-- 11. A view pública passa a ler a regra corrente, não as colunas espelho
-- ---------------------------------------------------------------------
--  Só as TRÊS colunas de fidelidade mudam de origem: passam a vir da
--  regra corrente em vez das colunas espelho de `contabilistas`. Todo o
--  resto do contrato fica exatamente como a migração do perfil o deixou
--  — em particular `email_contacto`, `preco_consulta_cents` e
--  `duracao_consulta_min`, que o cartão do diretório e a ficha pública
--  mostram. O preço deixou de ser a fonte de verdade da fidelidade
--  (§14.1), mas continua a ser a SUGESTÃO comercial que a ficha publica
--  e que o diálogo de concluir consulta pré-enche.
--
--  `DROP` antes de `CREATE`, pela mesma razão da migração do perfil: a
--  lista de colunas muda de forma e `CREATE OR REPLACE VIEW` só sabe
--  acrescentar no fim.
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
  c.email_contacto,
  c.website,
  c.linkedin_url,
  c.linkedin_avatar_url,
  (c.linkedin_ligado_em IS NOT NULL) AS linkedin_ligado,
  c.aceita_novos_clientes,
  c.preco_consulta_cents,
  c.duracao_consulta_min,
  coalesce(r.ativa, false)                                  AS fidelidade_ativa,
  CASE WHEN coalesce(r.ativa, false) THEN r.meta         END AS fidelidade_meta,
  CASE WHEN coalesce(r.ativa, false) THEN r.desconto_pct END AS fidelidade_desconto_pct,
  c.criado_em
FROM public.contabilistas c
LEFT JOIN public.fidelidade_regras r
       ON r.contabilista_id = c.user_id AND r.substituida_em IS NULL
WHERE c.estado = 'aprovado';

COMMENT ON VIEW public.contabilistas_publico IS
  'O contrato público do diretório e do perfil público. Acrescentar uma coluna aqui é uma decisão; acrescentar uma coluna a `contabilistas` deixa de ser. Não expõe telefone (ver contacto_do_contabilista), linkedin_subject, pedido_id nem estado. A fidelidade vem da regra corrente, não das colunas espelho.';

GRANT SELECT ON public.contabilistas_publico TO anon, authenticated;

COMMIT;
