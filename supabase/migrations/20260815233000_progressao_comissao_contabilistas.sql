-- =====================================================================
-- PROGRESSÃO E COMISSÃO
--
-- Fonte de verdade: Relatório Mestre §52–119 e §164 (valores oficiais).
-- A Referência C governa hierarquia visual, não números.
--
-- Regra-mãe: cada patamar REDUZ a comissão do Recibo Certo. O próximo
-- patamar conquista-se por mérito (XP de atividade verificável) OU
-- antecipa-se com um pagamento único. As duas dimensões são
-- independentes e nunca se contaminam:
--
--     efetivo = max(conquistado, comprado)
--
-- Comprar não cria XP. Ganhar XP não cria compra.
--
-- Desenho defensivo desta migração:
--
--   * NADA de progressão vive em `public.contabilistas`. Essa tabela é
--     lida por `anon` (policy contabilistas_diretorio_publico) e uma
--     coluna `xp` ou `comissao_bps` lá dentro seria pública no dia em
--     que fosse criada. §138 proíbe mostrar isto ao cliente — aqui
--     a proibição é estrutural, não uma convenção de código.
--
--   * `authenticated` NÃO tem INSERT/UPDATE/DELETE em nenhum ledger nem
--     no estado materializado. Só SELECT da própria linha. Tudo o que
--     mexe em saldos é SECURITY DEFINER e recebe FACTOS
--     (`este agendamento foi concluído`), nunca deltas
--     (`soma-me 100 XP`).
--
--   * Feature flags são lidas no servidor. Uma flag só no cliente não
--     protege um write.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Flags de capacidade (§95)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progressao_flags (
  chave text PRIMARY KEY,
  ativa boolean NOT NULL DEFAULT false,
  nota text
);

INSERT INTO public.progressao_flags (chave, ativa, nota) VALUES
  ('accountant_progression_read', false, 'Mostrar a área de Progressão em leitura.'),
  ('accountant_progression_earn_xp', false, 'Registar XP a sério. Antes disto o registo é shadow.'),
  ('accountant_progression_shadow', true,  'Regista eventos com xp_delta real mas marcados shadow=true; não movem patamar.'),
  ('accountant_loyalty_credits', false,    'Emitir e gastar Créditos de Fidelidade.'),
  ('accountant_tier_purchase', false,      'Permitir desbloqueio pago do próximo patamar.'),
  ('accountant_commission_ledger', false,  'Fase B — ledger real de comissão por serviço.'),
  ('accountant_connect_payments', false,   'Fase C — só depois de gate jurídico/fiscal/PSP.')
ON CONFLICT (chave) DO NOTHING;

ALTER TABLE public.progressao_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS progressao_flags_leitura ON public.progressao_flags;
CREATE POLICY progressao_flags_leitura ON public.progressao_flags
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.progressao_flag(p_chave text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT coalesce((SELECT ativa FROM public.progressao_flags WHERE chave = p_chave), false);
$$;

-- ---------------------------------------------------------------------
-- 1. Catálogo versionado de patamares (§55, valores oficiais §164)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comissao_patamares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_catalogo integer NOT NULL CHECK (versao_catalogo >= 1),
  ordem smallint NOT NULL CHECK (ordem BETWEEN 1 AND 20),
  slug text NOT NULL CHECK (slug ~ '^[a-z][a-z0-9-]*$'),
  titulo text NOT NULL,
  comissao_bps integer NOT NULL CHECK (comissao_bps BETWEEN 0 AND 10000),
  xp_minimo integer NOT NULL CHECK (xp_minimo >= 0),
  -- Segundo eixo, proposto pelo mockup da Progressão («1 / 3 clientes»).
  -- Fica a 0 na versão 1 do catálogo: comportamento idêntico ao que a
  -- especificação define. Quando os valores por patamar forem decididos,
  -- é um UPDATE a esta tabela e mais nada.
  --
  -- Vale a pena: com progressão só por XP, 2300 XP são alcançáveis com um
  -- único cliente muito ativo. Exigir clientes distintos é um travão
  -- anti-farming estrutural, melhor do que as heurísticas de velocidade
  -- da §84.3 — porque não precisa de detetar nada.
  clientes_minimo smallint NOT NULL DEFAULT 0 CHECK (clientes_minimo >= 0),
  preco_desbloqueio_cents integer CHECK (preco_desbloqueio_cents IS NULL OR preco_desbloqueio_cents >= 0),
  ativo boolean NOT NULL DEFAULT true,
  valido_desde timestamptz NOT NULL DEFAULT now(),
  valido_ate timestamptz,
  UNIQUE (versao_catalogo, ordem),
  UNIQUE (versao_catalogo, slug)
);

COMMENT ON TABLE public.comissao_patamares IS
  'Fonte única de comissão, XP e preço. Recalibrar = inserir versao_catalogo nova. Uma compra já feita guarda a versão com que foi feita e continua explicável.';
COMMENT ON COLUMN public.comissao_patamares.comissao_bps IS
  'Basis points. 10% = 1000. Dinheiro e percentagens financeiras nunca em float.';

INSERT INTO public.comissao_patamares
  (versao_catalogo, ordem, slug, titulo, comissao_bps, xp_minimo, preco_desbloqueio_cents) VALUES
  (1, 1, 'base',         'Base',         1000,    0, NULL),
  (1, 2, 'ativo',        'Ativo',         900,  200, 1499),
  (1, 3, 'crescimento',  'Crescimento',   800,  500, 2499),
  (1, 4, 'consolidado',  'Consolidado',   700,  900, 3999),
  (1, 5, 'referencia',   'Referência',    600, 1500, 6499),
  (1, 6, 'parceiro',     'Parceiro',      500, 2300, 9999)
ON CONFLICT (versao_catalogo, ordem) DO NOTHING;

-- Invariantes do catálogo: a comissão desce, o XP sobe, o preço sobe.
-- Sem isto, uma recalibração distraída podia publicar um patamar que
-- aumenta a comissão — exatamente a copy que §164 proíbe.
CREATE OR REPLACE FUNCTION public.assert_catalogo_patamares_coerente(p_versao integer)
RETURNS void LANGUAGE plpgsql STABLE SET search_path TO '' AS $$
DECLARE
  r record;
  v_primeiro boolean := true;
  v_bps integer; v_xp integer; v_preco integer;
BEGIN
  FOR r IN SELECT * FROM public.comissao_patamares
            WHERE versao_catalogo = p_versao ORDER BY ordem LOOP
    IF NOT v_primeiro THEN
      IF r.comissao_bps >= v_bps THEN
        RAISE EXCEPTION 'Patamar % não reduz a comissão (% >= %).', r.slug, r.comissao_bps, v_bps;
      END IF;
      IF r.xp_minimo <= v_xp THEN
        RAISE EXCEPTION 'Patamar % não exige mais XP do que o anterior.', r.slug;
      END IF;
      IF coalesce(r.preco_desbloqueio_cents, 0) < coalesce(v_preco, 0) THEN
        RAISE EXCEPTION 'Patamar % é mais barato do que o anterior.', r.slug;
      END IF;
    END IF;
    v_primeiro := false;
    v_bps := r.comissao_bps; v_xp := r.xp_minimo; v_preco := r.preco_desbloqueio_cents;
  END LOOP;
END; $$;

SELECT public.assert_catalogo_patamares_coerente(1);

CREATE OR REPLACE FUNCTION public.catalogo_versao_corrente() RETURNS integer
LANGUAGE sql STABLE SET search_path TO '' AS $$
  SELECT max(versao_catalogo) FROM public.comissao_patamares
   WHERE ativo AND valido_desde <= now() AND (valido_ate IS NULL OR valido_ate > now());
$$;

ALTER TABLE public.comissao_patamares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comissao_patamares_leitura ON public.comissao_patamares;
CREATE POLICY comissao_patamares_leitura ON public.comissao_patamares
  FOR SELECT TO authenticated USING (ativo);
-- Deliberadamente NÃO exposto a `anon`: a grelha de comissões é uma
-- relação entre a plataforma e o profissional (§138).

-- ---------------------------------------------------------------------
-- 2. Estado materializado
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contabilista_progressao (
  contabilista_id uuid PRIMARY KEY REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  creditos_disponiveis integer NOT NULL DEFAULT 0 CHECK (creditos_disponiveis >= 0),
  creditos_reservados integer NOT NULL DEFAULT 0 CHECK (creditos_reservados >= 0),
  -- Clientes distintos com pelo menos um serviço PAGO concluído. Derivado
  -- dos eventos `new_client_first_service`, que já são idempotentes por par
  -- contabilista–cliente. Nunca retrocede: um cliente que sai continua a
  -- contar, senão o patamar recuava e a §112 proíbe-o.
  clientes_elegiveis integer NOT NULL DEFAULT 0 CHECK (clientes_elegiveis >= 0),
  highest_earned_tier smallint NOT NULL DEFAULT 1 CHECK (highest_earned_tier >= 1),
  highest_purchased_tier smallint NOT NULL DEFAULT 1 CHECK (highest_purchased_tier >= 1),
  revision bigint NOT NULL DEFAULT 1,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.contabilista_progressao IS
  'Cache de leitura. A verdade está nos ledgers. `authenticated` só faz SELECT da própria linha; escrever é exclusivo das RPCs SECURITY DEFINER.';

CREATE OR REPLACE FUNCTION public.patamar_efetivo(p_conquistado smallint, p_comprado smallint)
RETURNS smallint LANGUAGE sql IMMUTABLE SET search_path TO '' AS $$
  SELECT greatest(p_conquistado, p_comprado);
$$;

ALTER TABLE public.contabilista_progressao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS progressao_self ON public.contabilista_progressao;
CREATE POLICY progressao_self ON public.contabilista_progressao
  FOR SELECT TO authenticated USING (contabilista_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------
-- 3. Ledger de XP (§58)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progressao_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN (
    'service_completed', 'new_client_first_service', 'loyalty_cycle_completed',
    'admin_adjustment', 'reversal')),
  chave_idempotencia text NOT NULL,
  xp_delta integer NOT NULL,
  shadow boolean NOT NULL DEFAULT false,
  entidade_tipo text CHECK (entidade_tipo IS NULL OR entidade_tipo IN ('agendamento','vinculo','cartao')),
  entidade_id uuid,
  reversal_of uuid REFERENCES public.progressao_eventos(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contabilista_id, chave_idempotencia),
  CONSTRAINT progressao_eventos_metadata_pequena CHECK (pg_column_size(metadata) <= 512)
);

CREATE INDEX IF NOT EXISTS progressao_eventos_contabilista_idx
  ON public.progressao_eventos (contabilista_id, criado_em DESC);

COMMENT ON COLUMN public.progressao_eventos.shadow IS
  'Shadow XP (§96): o evento é registado com o valor real mas não move patamar. Serve para calibrar thresholds antes de os cristalizar.';
COMMENT ON COLUMN public.progressao_eventos.metadata IS
  'Só informação operacional. Nunca nomes, NIF, documentos, simulações ou conteúdo de partilhas (§58, §97).';

-- A observabilidade não pode passar a ser um canal de dados fiscais.
CREATE OR REPLACE FUNCTION public.progressao_metadata_sem_pii() RETURNS trigger
LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE v_permitidas constant text[] := ARRAY['catalogVersion','reason','meta','origem','regraVersao'];
BEGIN
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(NEW.metadata) k WHERE k <> ALL (v_permitidas)) THEN
    RAISE EXCEPTION 'metadata de progressão só aceita %.', array_to_string(v_permitidas, ', ')
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_progressao_metadata ON public.progressao_eventos;
CREATE TRIGGER trg_progressao_metadata BEFORE INSERT OR UPDATE ON public.progressao_eventos
  FOR EACH ROW EXECUTE FUNCTION public.progressao_metadata_sem_pii();

ALTER TABLE public.progressao_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS progressao_eventos_self ON public.progressao_eventos;
CREATE POLICY progressao_eventos_self ON public.progressao_eventos
  FOR SELECT TO authenticated USING (contabilista_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------
-- 4. Ledger de créditos (§66, §67)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creditos_fidelidade_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  cartao_id uuid REFERENCES public.fidelidade_cartoes(id) ON DELETE SET NULL,
  compra_id uuid,
  tipo text NOT NULL CHECK (tipo IN ('earned','held','released','spent','reversal','admin_adjustment')),
  delta integer NOT NULL,
  reversal_of uuid REFERENCES public.creditos_fidelidade_ledger(id),
  chave_idempotencia text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contabilista_id, chave_idempotencia)
);

CREATE INDEX IF NOT EXISTS creditos_ledger_contabilista_idx
  ON public.creditos_fidelidade_ledger (contabilista_id, criado_em DESC);

ALTER TABLE public.creditos_fidelidade_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS creditos_ledger_self ON public.creditos_fidelidade_ledger;
CREATE POLICY creditos_ledger_self ON public.creditos_fidelidade_ledger
  FOR SELECT TO authenticated USING (contabilista_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------
-- 5. Compras (§71)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progressao_compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  target_tier_order smallint NOT NULL CHECK (target_tier_order >= 2),
  catalog_version integer NOT NULL,
  base_price_cents integer NOT NULL CHECK (base_price_cents >= 0),
  loyalty_credits integer NOT NULL DEFAULT 0 CHECK (loyalty_credits >= 0),
  loyalty_discount_pct integer NOT NULL DEFAULT 0 CHECK (loyalty_discount_pct BETWEEN 0 AND 100),
  final_price_cents integer NOT NULL CHECK (final_price_cents >= 0),
  currency text NOT NULL DEFAULT 'eur' CHECK (currency = 'eur'),
  estado text NOT NULL CHECK (estado IN (
    'draft','checkout_created','paid','applied','expired','cancelled',
    'needs_refund','refunded','failed')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  idempotency_key text NOT NULL UNIQUE,
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  criado_em timestamptz NOT NULL DEFAULT now(),
  pago_em timestamptz,
  aplicado_em timestamptz
);

CREATE INDEX IF NOT EXISTS progressao_compras_contabilista_idx
  ON public.progressao_compras (contabilista_id, criado_em DESC);
-- Uma intenção viva de cada vez: evita duas abas a reservar créditos.
CREATE UNIQUE INDEX IF NOT EXISTS progressao_compra_viva_idx
  ON public.progressao_compras (contabilista_id)
  WHERE estado IN ('draft','checkout_created');

COMMENT ON TABLE public.progressao_compras IS
  'Snapshot comercial da compra: catálogo, preço base, créditos e desconto usados, preço final. Se o catálogo mudar depois, a compra histórica continua explicável.';

ALTER TABLE public.progressao_compras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS progressao_compras_self ON public.progressao_compras;
CREATE POLICY progressao_compras_self ON public.progressao_compras
  FOR SELECT TO authenticated USING (contabilista_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------
-- 6. Preço e desconto — cálculo do lado do servidor (§63, §64)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.desconto_por_creditos(p_creditos integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO '' AS $$
  -- Marcos, não escada acumulável. 10 créditos = 20%, nunca 5+15+20.
  SELECT CASE
    WHEN p_creditos >= 10 THEN 20
    WHEN p_creditos >= 5  THEN 15
    WHEN p_creditos >= 1  THEN 5
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.creditos_do_marco(p_creditos integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO '' AS $$
  -- Quantos créditos são efetivamente consumidos por essa escolha.
  SELECT CASE
    WHEN p_creditos >= 10 THEN 10
    WHEN p_creditos >= 5  THEN 5
    WHEN p_creditos >= 1  THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.preco_com_desconto(p_base_cents integer, p_pct integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO '' AS $$
  SELECT round(p_base_cents::numeric * (100 - p_pct) / 100.0)::integer;
$$;

-- ---------------------------------------------------------------------
-- 7. Recalcular estado a partir dos ledgers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalcular_progressao(p_contabilista uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_xp integer;
  v_earned smallint;
  v_disp integer;
  v_res integer;
  v_clientes integer;
BEGIN
  SELECT coalesce(sum(xp_delta) FILTER (WHERE NOT shadow), 0) INTO v_xp
    FROM public.progressao_eventos WHERE contabilista_id = p_contabilista;
  v_xp := greatest(v_xp, 0);

  SELECT count(DISTINCT entidade_id) INTO v_clientes
    FROM public.progressao_eventos
   WHERE contabilista_id = p_contabilista
     AND tipo = 'new_client_first_service' AND NOT shadow;

  -- Um patamar exige XP E clientes. Com clientes_minimo = 0 (versão 1 do
  -- catálogo) a segunda condição é sempre verdadeira e o comportamento é
  -- exatamente o especificado.
  SELECT coalesce(max(ordem), 1) INTO v_earned
    FROM public.comissao_patamares
   WHERE versao_catalogo = public.catalogo_versao_corrente()
     AND ativo AND xp_minimo <= v_xp AND clientes_minimo <= v_clientes;

  -- Contabilidade dos créditos, em duas contas que NÃO se sobrepõem:
  --
  --   disponíveis = ganhos + devolvidos + ajustes − reservados
  --   reservados  = reservados − devolvidos − gastos
  --
  -- `spent` NÃO volta a descontar de `disponíveis`: esses créditos já
  -- saíram de lá no momento do `held`. Descontá-los outra vez faria o
  -- saldo cair a dobrar em cada compra concluída.
  SELECT coalesce(sum(delta) FILTER (WHERE tipo IN ('earned','released','reversal','admin_adjustment')), 0)
       - coalesce(sum(delta) FILTER (WHERE tipo = 'held'), 0),
         coalesce(sum(delta) FILTER (WHERE tipo = 'held'), 0)
       - coalesce(sum(delta) FILTER (WHERE tipo IN ('released','spent')), 0)
    INTO v_disp, v_res
    FROM public.creditos_fidelidade_ledger WHERE contabilista_id = p_contabilista;

  INSERT INTO public.contabilista_progressao AS p (contabilista_id, xp, highest_earned_tier,
                                                   creditos_disponiveis, creditos_reservados,
                                                   clientes_elegiveis)
  VALUES (p_contabilista, v_xp, v_earned, greatest(coalesce(v_disp,0),0), greatest(coalesce(v_res,0),0),
          coalesce(v_clientes,0))
  ON CONFLICT (contabilista_id) DO UPDATE SET
    xp = EXCLUDED.xp,
    clientes_elegiveis = greatest(p.clientes_elegiveis, EXCLUDED.clientes_elegiveis),
    -- §60/§112: um patamar conquistado não recua por reversão antiga.
    highest_earned_tier = greatest(p.highest_earned_tier, EXCLUDED.highest_earned_tier),
    creditos_disponiveis = EXCLUDED.creditos_disponiveis,
    creditos_reservados = EXCLUDED.creditos_reservados,
    revision = p.revision + 1,
    atualizado_em = now();
END; $$;

REVOKE EXECUTE ON FUNCTION public.recalcular_progressao(uuid) FROM anon, authenticated, PUBLIC;

-- ---------------------------------------------------------------------
-- 8. Registar eventos — recebem FACTOS, derivam a recompensa (§86)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.progressao_registar(
  p_contabilista uuid, p_tipo text, p_chave text, p_xp integer,
  p_entidade_tipo text, p_entidade_id uuid, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_n integer; v_shadow boolean;
BEGIN
  IF NOT public.progressao_flag('accountant_progression_earn_xp')
     AND NOT public.progressao_flag('accountant_progression_shadow') THEN
    RETURN false;
  END IF;
  v_shadow := NOT public.progressao_flag('accountant_progression_earn_xp');

  INSERT INTO public.progressao_eventos
    (contabilista_id, tipo, chave_idempotencia, xp_delta, shadow, entidade_tipo, entidade_id, metadata)
  VALUES (p_contabilista, p_tipo, p_chave, p_xp, v_shadow, p_entidade_tipo, p_entidade_id, p_metadata)
  ON CONFLICT (contabilista_id, chave_idempotencia) DO NOTHING;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RETURN false; END IF;   -- já tinha sido registado
  RETURN true;
END; $$;

REVOKE EXECUTE ON FUNCTION public.progressao_registar(uuid,text,text,integer,text,uuid,jsonb)
  FROM anon, authenticated, PUBLIC;

-- +10 XP por serviço elegível, +25 na primeira vez com aquele cliente.
CREATE OR REPLACE FUNCTION public.progressao_servico_concluido_hook(
  p_contabilista uuid, p_cliente uuid, p_agendamento uuid, p_preco_cents integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_vinculo uuid; v_mudou boolean := false; v_cat integer;
BEGIN
  -- Um serviço a zero euros não é atividade económica elegível (§57).
  IF coalesce(p_preco_cents, 0) <= 0 THEN RETURN; END IF;

  v_cat := public.catalogo_versao_corrente();

  IF public.progressao_registar(p_contabilista, 'service_completed',
        'service_completed:' || p_agendamento::text, 10, 'agendamento', p_agendamento,
        jsonb_build_object('catalogVersion', v_cat, 'reason', 'service_completed')) THEN
    v_mudou := true;
  END IF;

  SELECT v.id INTO v_vinculo FROM public.contabilista_vinculos v
   WHERE v.contabilista_id = p_contabilista AND v.cliente_id = p_cliente
     AND v.estado <> 'terminado';

  IF v_vinculo IS NOT NULL THEN
    -- §84.2: uma vez por PAR contabilista–cliente, não por vínculo
    -- recriado. A chave usa o par, não o id do vínculo.
    IF public.progressao_registar(p_contabilista, 'new_client_first_service',
          'new_client_first_service:' || p_cliente::text, 25, 'vinculo', v_vinculo,
          jsonb_build_object('catalogVersion', v_cat, 'reason', 'new_client_first_service')) THEN
      v_mudou := true;
    END IF;
  END IF;

  IF v_mudou THEN PERFORM public.recalcular_progressao(p_contabilista); END IF;
END; $$;

REVOKE EXECUTE ON FUNCTION public.progressao_servico_concluido_hook(uuid,uuid,uuid,integer)
  FROM anon, authenticated, PUBLIC;

-- Cartão de fidelidade concluído: +100 XP e +1 crédito, mas só se a meta
-- do ciclo for >= 5 (§62 — impede configurar meta 3 para fabricar moeda).
CREATE OR REPLACE FUNCTION public.fidelidade_ciclo_concluido_hook(
  p_contabilista uuid, p_cliente uuid, p_cartao uuid, p_meta integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_mudou boolean := false; v_cat integer;
BEGIN
  IF coalesce(p_meta, 0) < 5 THEN RETURN; END IF;

  v_cat := public.catalogo_versao_corrente();

  IF public.progressao_registar(p_contabilista, 'loyalty_cycle_completed',
        'loyalty_cycle_completed:' || p_cartao::text, 100, 'cartao', p_cartao,
        jsonb_build_object('catalogVersion', v_cat, 'reason', 'loyalty_cycle_completed',
                           'meta', p_meta)) THEN
    v_mudou := true;
  END IF;

  IF public.progressao_flag('accountant_loyalty_credits') THEN
    INSERT INTO public.creditos_fidelidade_ledger
      (contabilista_id, cartao_id, tipo, delta, chave_idempotencia)
    VALUES (p_contabilista, p_cartao, 'earned', 1, 'loyalty_cycle_completed:' || p_cartao::text)
    ON CONFLICT (contabilista_id, chave_idempotencia) DO NOTHING;
    v_mudou := true;
  END IF;

  IF v_mudou THEN PERFORM public.recalcular_progressao(p_contabilista); END IF;
END; $$;

REVOKE EXECUTE ON FUNCTION public.fidelidade_ciclo_concluido_hook(uuid,uuid,uuid,integer)
  FROM anon, authenticated, PUBLIC;

-- ---------------------------------------------------------------------
-- 9. Estado para a UI
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.progressao_estado()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_p record; v_cat integer;
  v_efetivo smallint; v_atual record; v_proximo record;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;
  IF NOT public.progressao_flag('accountant_progression_read') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'indisponivel');
  END IF;

  v_cat := public.catalogo_versao_corrente();

  -- Um contabilista aprovado que ainda não tem linha lê o estado zero,
  -- sem escrever nada num caminho que é STABLE.
  SELECT coalesce(p.xp, 0)                          AS xp,
         coalesce(p.creditos_disponiveis, 0)        AS creditos_disponiveis,
         coalesce(p.creditos_reservados, 0)         AS creditos_reservados,
         coalesce(p.clientes_elegiveis, 0)          AS clientes_elegiveis,
         coalesce(p.highest_earned_tier, 1::smallint)    AS highest_earned_tier,
         coalesce(p.highest_purchased_tier, 1::smallint) AS highest_purchased_tier
    INTO v_p
    FROM (SELECT 1) AS z
    LEFT JOIN public.contabilista_progressao p ON p.contabilista_id = v_uid;

  v_efetivo := public.patamar_efetivo(v_p.highest_earned_tier, v_p.highest_purchased_tier);

  SELECT * INTO v_atual   FROM public.comissao_patamares
   WHERE versao_catalogo = v_cat AND ordem = v_efetivo;
  SELECT * INTO v_proximo FROM public.comissao_patamares
   WHERE versao_catalogo = v_cat AND ordem = v_efetivo + 1;

  RETURN jsonb_build_object(
    'ok', true,
    'catalogVersion', v_cat,
    'xp', v_p.xp,
    'clientesElegiveis', v_p.clientes_elegiveis,
    'creditosDisponiveis', v_p.creditos_disponiveis,
    'creditosReservados', v_p.creditos_reservados,
    'patamarConquistado', v_p.highest_earned_tier,
    'patamarComprado', v_p.highest_purchased_tier,
    'patamarEfetivo', v_efetivo,
    'atual', CASE WHEN v_atual.id IS NULL THEN NULL ELSE jsonb_build_object(
      'ordem', v_atual.ordem, 'slug', v_atual.slug, 'titulo', v_atual.titulo,
      'comissaoBps', v_atual.comissao_bps) END,
    'proximo', CASE WHEN v_proximo.id IS NULL THEN NULL ELSE jsonb_build_object(
      'ordem', v_proximo.ordem, 'slug', v_proximo.slug, 'titulo', v_proximo.titulo,
      'comissaoBps', v_proximo.comissao_bps, 'xpMinimo', v_proximo.xp_minimo,
      'xpEmFalta', greatest(v_proximo.xp_minimo - v_p.xp, 0),
      'clientesMinimo', v_proximo.clientes_minimo,
      'clientesEmFalta', greatest(v_proximo.clientes_minimo - v_p.clientes_elegiveis, 0),
      'precoBaseCents', v_proximo.preco_desbloqueio_cents,
      'descontoPct', public.desconto_por_creditos(v_p.creditos_disponiveis),
      'precoComDescontoCents', public.preco_com_desconto(
          v_proximo.preco_desbloqueio_cents,
          public.desconto_por_creditos(v_p.creditos_disponiveis))) END,
    'compraDisponivel', public.progressao_flag('accountant_tier_purchase')
  );
END; $$;

REVOKE EXECUTE ON FUNCTION public.progressao_estado() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.progressao_estado() TO authenticated;

-- ---------------------------------------------------------------------
-- 10. Intenção de compra — o browser não escolhe preço nem alvo (§72)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_intencao_desbloqueio(
  p_creditos_a_usar integer DEFAULT 0,
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_p record; v_cat integer; v_efetivo smallint;
  v_alvo record; v_creditos integer; v_pct integer; v_final integer;
  v_id uuid; v_key text;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao'); END IF;
  IF NOT public.progressao_flag('accountant_tier_purchase') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'compra_indisponivel'); END IF;

  SELECT * INTO v_p FROM public.contabilista_progressao
   WHERE contabilista_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.contabilista_progressao (contabilista_id) VALUES (v_uid)
    ON CONFLICT DO NOTHING;
    SELECT * INTO v_p FROM public.contabilista_progressao
     WHERE contabilista_id = v_uid FOR UPDATE;
  END IF;

  -- Libertar intenções mortas antes de decidir.
  PERFORM public.expirar_intencoes_desbloqueio(v_uid);

  v_cat := public.catalogo_versao_corrente();
  v_efetivo := public.patamar_efetivo(v_p.highest_earned_tier, v_p.highest_purchased_tier);

  -- §68: só o PRÓXIMO patamar.
  SELECT * INTO v_alvo FROM public.comissao_patamares
   WHERE versao_catalogo = v_cat AND ordem = v_efetivo + 1 AND ativo;
  IF NOT FOUND OR v_alvo.preco_desbloqueio_cents IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_patamar_seguinte'); END IF;

  v_creditos := public.creditos_do_marco(
    least(greatest(coalesce(p_creditos_a_usar, 0), 0), v_p.creditos_disponiveis));
  v_pct   := public.desconto_por_creditos(v_creditos);
  v_final := public.preco_com_desconto(v_alvo.preco_desbloqueio_cents, v_pct);
  v_key   := coalesce(p_idempotency_key, gen_random_uuid()::text);

  INSERT INTO public.progressao_compras
    (contabilista_id, target_tier_order, catalog_version, base_price_cents,
     loyalty_credits, loyalty_discount_pct, final_price_cents, estado, idempotency_key)
  VALUES (v_uid, v_alvo.ordem, v_cat, v_alvo.preco_desbloqueio_cents,
          v_creditos, v_pct, v_final, 'draft', v_key)
  RETURNING id INTO v_id;

  IF v_creditos > 0 THEN
    INSERT INTO public.creditos_fidelidade_ledger
      (contabilista_id, compra_id, tipo, delta, chave_idempotencia)
    VALUES (v_uid, v_id, 'held', v_creditos, 'held:' || v_id::text);
  END IF;

  PERFORM public.recalcular_progressao(v_uid);

  RETURN jsonb_build_object('ok', true, 'compraId', v_id,
    'targetTier', v_alvo.ordem, 'targetSlug', v_alvo.slug,
    'baseCents', v_alvo.preco_desbloqueio_cents,
    'creditos', v_creditos, 'descontoPct', v_pct, 'finalCents', v_final,
    'idempotencyKey', v_key);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'motivo', 'compra_em_curso');
END; $$;

CREATE OR REPLACE FUNCTION public.expirar_intencoes_desbloqueio(p_contabilista uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE r record; v_n integer := 0;
BEGIN
  FOR r IN SELECT * FROM public.progressao_compras
            WHERE estado IN ('draft','checkout_created') AND expira_em <= now()
              AND (p_contabilista IS NULL OR contabilista_id = p_contabilista)
            FOR UPDATE LOOP
    UPDATE public.progressao_compras SET estado = 'expired' WHERE id = r.id;
    IF r.loyalty_credits > 0 THEN
      INSERT INTO public.creditos_fidelidade_ledger
        (contabilista_id, compra_id, tipo, delta, chave_idempotencia)
      VALUES (r.contabilista_id, r.id, 'released', r.loyalty_credits, 'released:' || r.id::text)
      ON CONFLICT (contabilista_id, chave_idempotencia) DO NOTHING;
    END IF;
    PERFORM public.recalcular_progressao(r.contabilista_id);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END; $$;

-- ---------------------------------------------------------------------
-- 11. Aplicar a compra — só o servidor, só uma vez (§73)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aplicar_compra_patamar(
  p_compra uuid,
  p_stripe_payment_intent text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_c record; v_p record; v_efetivo smallint;
BEGIN
  SELECT * INTO v_c FROM public.progressao_compras WHERE id = p_compra FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'compra_inexistente'); END IF;

  -- Webhook repetido: mesmo resultado, sem efeitos novos.
  IF v_c.estado = 'applied' THEN
    RETURN jsonb_build_object('ok', true, 'repetido', true, 'compraId', v_c.id); END IF;
  IF v_c.estado IN ('refunded','cancelled','expired','failed') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'compra_encerrada', 'estado', v_c.estado); END IF;

  SELECT * INTO v_p FROM public.contabilista_progressao
   WHERE contabilista_id = v_c.contabilista_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.contabilista_progressao (contabilista_id)
    VALUES (v_c.contabilista_id) ON CONFLICT DO NOTHING;
    SELECT * INTO v_p FROM public.contabilista_progressao
     WHERE contabilista_id = v_c.contabilista_id FOR UPDATE;
  END IF;

  v_efetivo := public.patamar_efetivo(v_p.highest_earned_tier, v_p.highest_purchased_tier);

  -- §70: o XP alcançou o patamar durante o checkout. A compra ficou sem
  -- objeto. NUNCA transferir o pagamento para o patamar seguinte.
  IF v_efetivo >= v_c.target_tier_order THEN
    UPDATE public.progressao_compras
       SET estado = 'needs_refund', pago_em = coalesce(pago_em, now()),
           stripe_payment_intent_id = coalesce(p_stripe_payment_intent, stripe_payment_intent_id)
     WHERE id = v_c.id;
    IF v_c.loyalty_credits > 0 THEN
      INSERT INTO public.creditos_fidelidade_ledger
        (contabilista_id, compra_id, tipo, delta, chave_idempotencia)
      VALUES (v_c.contabilista_id, v_c.id, 'released', v_c.loyalty_credits, 'released:' || v_c.id::text)
      ON CONFLICT (contabilista_id, chave_idempotencia) DO NOTHING;
    END IF;
    PERFORM public.recalcular_progressao(v_c.contabilista_id);
    RETURN jsonb_build_object('ok', false, 'motivo', 'patamar_ja_conquistado',
                              'estado', 'needs_refund', 'compraId', v_c.id);
  END IF;

  UPDATE public.contabilista_progressao
     SET highest_purchased_tier = greatest(highest_purchased_tier, v_c.target_tier_order),
         revision = revision + 1, atualizado_em = now()
   WHERE contabilista_id = v_c.contabilista_id;
  -- Repare-se: `xp` não é tocado. Comprar não cria mérito (§69).

  IF v_c.loyalty_credits > 0 THEN
    INSERT INTO public.creditos_fidelidade_ledger
      (contabilista_id, compra_id, tipo, delta, chave_idempotencia)
    VALUES (v_c.contabilista_id, v_c.id, 'spent', v_c.loyalty_credits, 'spent:' || v_c.id::text)
    ON CONFLICT (contabilista_id, chave_idempotencia) DO NOTHING;
  END IF;

  UPDATE public.progressao_compras
     SET estado = 'applied', pago_em = coalesce(pago_em, now()), aplicado_em = now(),
         stripe_payment_intent_id = coalesce(p_stripe_payment_intent, stripe_payment_intent_id)
   WHERE id = v_c.id;

  PERFORM public.recalcular_progressao(v_c.contabilista_id);
  PERFORM public.avisar_utilizador(v_c.contabilista_id, 'patamar_desbloqueado',
    'Patamar desbloqueado', 'A tua comissão foi atualizada.', '/contabilista/progressao');

  RETURN jsonb_build_object('ok', true, 'repetido', false, 'compraId', v_c.id,
                            'patamar', v_c.target_tier_order);
END; $$;

-- Estas duas nunca são chamáveis pelo browser: são de webhook/servidor.
REVOKE EXECUTE ON FUNCTION public.aplicar_compra_patamar(uuid, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expirar_intencoes_desbloqueio(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.criar_intencao_desbloqueio(integer, text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.criar_intencao_desbloqueio(integer, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.progressao_flag(text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.progressao_flag(text) TO authenticated;

-- ---------------------------------------------------------------------
-- 12. Reversão (§85) — lançamento compensatório, nunca DELETE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverter_evento_progressao(p_evento uuid, p_motivo text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_e record;
BEGIN
  SELECT * INTO v_e FROM public.progressao_eventos WHERE id = p_evento;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'evento_inexistente'); END IF;
  IF EXISTS (SELECT 1 FROM public.progressao_eventos WHERE reversal_of = p_evento) THEN
    RETURN jsonb_build_object('ok', true, 'repetido', true); END IF;

  INSERT INTO public.progressao_eventos
    (contabilista_id, tipo, chave_idempotencia, xp_delta, shadow,
     entidade_tipo, entidade_id, reversal_of, metadata)
  VALUES (v_e.contabilista_id, 'reversal', 'reversal:' || p_evento::text, -v_e.xp_delta,
          v_e.shadow, v_e.entidade_tipo, v_e.entidade_id, p_evento,
          jsonb_build_object('reason', left(coalesce(p_motivo, 'reversal'), 60)));

  PERFORM public.recalcular_progressao(v_e.contabilista_id);
  RETURN jsonb_build_object('ok', true, 'repetido', false);
END; $$;

REVOKE EXECUTE ON FUNCTION public.reverter_evento_progressao(uuid, text) FROM anon, authenticated, PUBLIC;

-- ---------------------------------------------------------------------
-- 12b. Privilégios explícitos.
--
--   Nenhuma destas tabelas é legível por `anon` — nem sequer o catálogo
--   de comissões (§138: a grelha 10→5 é assunto entre a plataforma e o
--   profissional). E `authenticated` só LÊ: escrever é das RPCs.
-- ---------------------------------------------------------------------
REVOKE ALL ON public.progressao_flags            FROM anon, authenticated;
REVOKE ALL ON public.comissao_patamares          FROM anon, authenticated;
REVOKE ALL ON public.contabilista_progressao     FROM anon, authenticated;
REVOKE ALL ON public.progressao_eventos          FROM anon, authenticated;
REVOKE ALL ON public.creditos_fidelidade_ledger  FROM anon, authenticated;
REVOKE ALL ON public.progressao_compras          FROM anon, authenticated;

GRANT SELECT ON public.progressao_flags           TO authenticated;
GRANT SELECT ON public.comissao_patamares         TO authenticated;
GRANT SELECT ON public.contabilista_progressao    TO authenticated;
GRANT SELECT ON public.progressao_eventos         TO authenticated;
GRANT SELECT ON public.creditos_fidelidade_ledger TO authenticated;
GRANT SELECT ON public.progressao_compras         TO authenticated;

-- ---------------------------------------------------------------------
-- 13. Semear a linha de progressão dos contabilistas já aprovados
--     (§106: começa em 0. Sem XP fictício.)
-- ---------------------------------------------------------------------
INSERT INTO public.contabilista_progressao (contabilista_id)
SELECT user_id FROM public.contabilistas WHERE estado = 'aprovado'
ON CONFLICT (contabilista_id) DO NOTHING;

COMMIT;
