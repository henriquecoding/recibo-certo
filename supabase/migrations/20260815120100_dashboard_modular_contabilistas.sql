-- =====================================================================
-- DASHBOARD MODULAR — VISTAS E LAYOUT
--
-- Fonte de verdade: Relatório Mestre §4–12, §47.
--
-- Princípios que este ficheiro impõe na base de dados e não apenas na UI:
--
--   * o layout guarda GEOMETRIA, nunca dados. Não há aqui uma segunda
--     base de dados disfarçada de JSON (§5.6);
--   * uma sessão de edição = uma escrita atómica (§5.8, §12.12);
--   * `revision` faz compare-and-swap e impede que o portátil apague o
--     que o telemóvel gravou há um minuto (§12.15);
--   * o tipo de widget vem de uma allow-list em SQL. Um `type`
--     desconhecido é recusado no servidor, não só ignorado no React
--     (§39 «widget desconhecido não executa componente arbitrário»);
--   * limites defensivos de tamanho, contagem e coordenadas (§12.16).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Registry de módulos em SQL (espelho de src/lib/.../modulos.ts)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dashboard_modulos (
  type text PRIMARY KEY,
  tag_base text NOT NULL CHECK (tag_base ~ '^[A-Z]{3}$'),
  categoria text NOT NULL CHECK (categoria IN ('operacao','clientes','trabalho','fiscal','negocio')),
  col_span_min smallint NOT NULL CHECK (col_span_min BETWEEN 1 AND 12),
  col_span_max smallint NOT NULL CHECK (col_span_max BETWEEN 1 AND 12),
  row_span_min smallint NOT NULL CHECK (row_span_min BETWEEN 1 AND 20),
  row_span_max smallint NOT NULL CHECK (row_span_max BETWEEN 1 AND 20),
  prioridade text NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('critical','normal','deferred')),
  -- A biblioteca do mockup anuncia o formato antes de se arrastar
  -- («M · Lista», «XL · Kanban»). Saber o que vai acontecer ao painel
  -- antes de o mudar é metade da confiança no modo de edição.
  formato text NOT NULL DEFAULT 'lista'
    CHECK (formato IN ('lista','kanban','grafico','tabela','cartao','timeline')),
  ativo boolean NOT NULL DEFAULT true,
  CONSTRAINT dashboard_modulos_spans CHECK (col_span_min <= col_span_max AND row_span_min <= row_span_max)
);

COMMENT ON TABLE public.dashboard_modulos IS
  'Allow-list de widgets. A RPC de gravação valida contra esta tabela: o browser não escolhe que componente o painel monta.';

INSERT INTO public.dashboard_modulos
  (type, tag_base, categoria, col_span_min, col_span_max, row_span_min, row_span_max, prioridade, formato) VALUES
  ('agenda_hoje',           'AGD', 'operacao', 3, 12, 2, 8,  'critical', 'timeline'),
  ('precisam_atencao',      'ATN', 'operacao', 3, 12, 2, 8,  'critical', 'lista'),
  ('prazos_proximos',       'PRZ', 'fiscal',   3, 12, 2, 8,  'critical', 'lista'),
  ('partilhas_recebidas',   'PAR', 'clientes', 3, 12, 2, 8,  'normal',   'lista'),
  ('simulacoes_recebidas',  'SIM', 'clientes', 3, 12, 2, 8,  'normal',   'lista'),
  ('documentos_rever',      'DOC', 'trabalho', 3, 12, 2, 8,  'normal',   'lista'),
  ('atividade_semana',      'ATV', 'operacao', 3, 12, 2, 6,  'deferred', 'grafico'),
  ('centro_avisos',         'AVS', 'operacao', 3, 12, 2, 6,  'normal',   'lista'),
  ('estado_trabalho',       'TRB', 'trabalho', 4, 12, 2, 12, 'normal',   'kanban'),
  ('clientes',              'CLI', 'clientes', 3, 12, 2, 8,  'normal',   'lista'),
  ('casos',                 'CAS', 'trabalho', 3, 12, 2, 8,  'normal',   'lista'),
  ('fidelidade',            'FID', 'negocio',  3, 12, 2, 6,  'deferred', 'cartao'),
  ('progressao_comissao',   'PRG', 'negocio',  3, 12, 2, 8,  'deferred', 'cartao'),
  -- Os três que a biblioteca do mockup mostra em RECOMENDADOS e que
  -- não existiam no registry.
  ('casos_em_risco',        'RSK', 'trabalho', 3, 12, 2, 8,  'normal',   'lista'),
  ('comunicacoes_recentes', 'COM', 'clientes', 3, 12, 2, 8,  'normal',   'lista'),
  ('resumo_por_cliente',    'RES', 'clientes', 4, 12, 2, 10, 'deferred', 'tabela')
ON CONFLICT (type) DO NOTHING;

ALTER TABLE public.dashboard_modulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dashboard_modulos_leitura ON public.dashboard_modulos;
CREATE POLICY dashboard_modulos_leitura ON public.dashboard_modulos
  FOR SELECT TO authenticated USING (ativo);

-- ---------------------------------------------------------------------
-- 2. Vistas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contabilista_dashboard_vistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 60),
  ordem integer NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 100),
  principal boolean NOT NULL DEFAULT false,
  sistema boolean NOT NULL DEFAULT false,
  layout jsonb NOT NULL DEFAULT '{"version":2,"revision":1,"grid":{"desktop":{"columns":12,"rowHeight":52,"gap":12},"tablet":{"columns":8,"rowHeight":52,"gap":12}},"items":[]}'::jsonb,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  -- teto de tamanho: um layout normal tem poucos KB (§5.6)
  CONSTRAINT dashboard_vista_layout_pequeno CHECK (pg_column_size(layout) <= 32768)
);

CREATE UNIQUE INDEX IF NOT EXISTS contabilista_dashboard_uma_principal
  ON public.contabilista_dashboard_vistas (contabilista_id) WHERE principal;
CREATE INDEX IF NOT EXISTS contabilista_dashboard_vistas_ordem
  ON public.contabilista_dashboard_vistas (contabilista_id, ordem);
CREATE UNIQUE INDEX IF NOT EXISTS contabilista_dashboard_nome_unico
  ON public.contabilista_dashboard_vistas (contabilista_id, lower(nome));

COMMENT ON TABLE public.contabilista_dashboard_vistas IS
  'Configuração de APRESENTAÇÃO do painel. Nunca contém nomes de clientes, valores fiscais, documentos ou resultados — só que módulos existem e onde estão.';
COMMENT ON COLUMN public.contabilista_dashboard_vistas.revision IS
  'Compare-and-swap. Guardar com uma revisão antiga devolve layout_desatualizado em vez de destruir a versão mais nova.';

DROP TRIGGER IF EXISTS trg_texto_seguro_dashboard_vistas ON public.contabilista_dashboard_vistas;
CREATE TRIGGER trg_texto_seguro_dashboard_vistas
  BEFORE INSERT OR UPDATE ON public.contabilista_dashboard_vistas
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('nome');

ALTER TABLE public.contabilista_dashboard_vistas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashboard_vistas_dono_le ON public.contabilista_dashboard_vistas;
CREATE POLICY dashboard_vistas_dono_le ON public.contabilista_dashboard_vistas
  FOR SELECT TO authenticated
  USING (contabilista_id = (SELECT auth.uid()) AND public.e_contabilista_aprovado((SELECT auth.uid())));

DROP POLICY IF EXISTS dashboard_vistas_dono_cria ON public.contabilista_dashboard_vistas;
CREATE POLICY dashboard_vistas_dono_cria ON public.contabilista_dashboard_vistas
  FOR INSERT TO authenticated
  WITH CHECK (contabilista_id = (SELECT auth.uid())
              AND public.e_contabilista_aprovado((SELECT auth.uid()))
              AND NOT sistema);

DROP POLICY IF EXISTS dashboard_vistas_dono_apaga ON public.contabilista_dashboard_vistas;
CREATE POLICY dashboard_vistas_dono_apaga ON public.contabilista_dashboard_vistas
  FOR DELETE TO authenticated
  USING (contabilista_id = (SELECT auth.uid()) AND NOT sistema);

-- Repare-se: NÃO há policy de UPDATE para `authenticated`.
-- Mudar layout, nome, ordem ou principal passa obrigatoriamente pelas
-- RPCs abaixo, que validam geometria e fazem compare-and-swap.

-- ---------------------------------------------------------------------
-- 3. Validação geométrica no servidor (§5.9)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_layout_invalido(p_layout jsonb)
RETURNS text
LANGUAGE plpgsql STABLE SET search_path TO '' AS $$
DECLARE
  v_item jsonb;
  v_n integer;
  v_cols integer;
  v_tags text[] := '{}';
  v_ids  text[] := '{}';
  v_mod  record;
  v_bp   text;
  v_pos  jsonb;
BEGIN
  IF jsonb_typeof(p_layout) <> 'object' THEN RETURN 'layout_nao_e_objeto'; END IF;
  IF coalesce((p_layout->>'version')::int, 0) <> 2 THEN RETURN 'versao_nao_suportada'; END IF;
  IF jsonb_typeof(p_layout->'items') <> 'array' THEN RETURN 'items_nao_e_lista'; END IF;

  v_n := jsonb_array_length(p_layout->'items');
  IF v_n > 24 THEN RETURN 'demasiados_modulos'; END IF;

  IF jsonb_typeof(p_layout->'grid') <> 'object' THEN RETURN 'grid_em_falta'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_layout->'items') LOOP
    -- identidade
    IF (v_item->>'instanceId') IS NULL OR (v_item->>'instanceId') !~
       '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      RETURN 'instanceId_invalido';
    END IF;
    IF (v_item->>'instanceId') = ANY (v_ids) THEN RETURN 'instanceId_repetido'; END IF;
    v_ids := v_ids || (v_item->>'instanceId');

    -- tipo tem de existir na allow-list
    SELECT * INTO v_mod FROM public.dashboard_modulos m
     WHERE m.type = (v_item->>'type') AND m.ativo;
    IF NOT FOUND THEN RETURN 'tipo_desconhecido:' || coalesce(v_item->>'type','null'); END IF;

    -- tag legível e única dentro da vista
    IF (v_item->>'tag') IS NULL OR (v_item->>'tag') !~ '^[A-Z]{3}-[0-9]{2}$' THEN
      RETURN 'tag_invalida';
    END IF;
    IF left(v_item->>'tag', 3) <> v_mod.tag_base THEN RETURN 'tag_nao_corresponde_ao_tipo'; END IF;
    IF (v_item->>'tag') = ANY (v_tags) THEN RETURN 'tag_repetida'; END IF;
    v_tags := v_tags || (v_item->>'tag');

    -- config só pode conter preferências de apresentação (§5.6)
    IF v_item ? 'config' THEN
      IF jsonb_typeof(v_item->'config') <> 'object' THEN RETURN 'config_nao_e_objeto'; END IF;
      IF pg_column_size(v_item->'config') > 512 THEN RETURN 'config_demasiado_grande'; END IF;
      IF EXISTS (
        SELECT 1 FROM jsonb_object_keys(v_item->'config') k
         WHERE k NOT IN ('density','maxItems','showCompleted','sort','periodo','agrupar')
      ) THEN RETURN 'config_com_chave_nao_permitida'; END IF;
    END IF;

    -- geometria por breakpoint
    FOREACH v_bp IN ARRAY ARRAY['desktop','tablet'] LOOP
      IF NOT (v_item ? v_bp) THEN
        IF v_bp = 'desktop' THEN RETURN 'desktop_em_falta'; ELSE CONTINUE; END IF;
      END IF;
      v_pos  := v_item->v_bp;
      v_cols := coalesce((p_layout->'grid'->v_bp->>'columns')::int, CASE v_bp WHEN 'desktop' THEN 12 ELSE 8 END);

      IF coalesce((v_pos->>'col')::int, 0) < 1 THEN RETURN 'col_invalida'; END IF;
      IF coalesce((v_pos->>'row')::int, 0) < 1 THEN RETURN 'row_invalida'; END IF;
      IF coalesce((v_pos->>'row')::int, 0) > 60 THEN RETURN 'row_fora_do_teto'; END IF;
      IF coalesce((v_pos->>'colSpan')::int, 0) < 1 THEN RETURN 'colSpan_invalido'; END IF;
      IF coalesce((v_pos->>'rowSpan')::int, 0) < 1 THEN RETURN 'rowSpan_invalido'; END IF;

      IF (v_pos->>'col')::int + (v_pos->>'colSpan')::int - 1 > v_cols THEN
        RETURN 'modulo_transborda_a_grelha';
      END IF;

      -- min/max do registry, medidos na grelha desktop de 12 colunas
      IF v_bp = 'desktop' THEN
        IF (v_pos->>'colSpan')::int NOT BETWEEN v_mod.col_span_min AND v_mod.col_span_max THEN
          RETURN 'colSpan_fora_do_registry:' || v_mod.type;
        END IF;
        IF (v_pos->>'rowSpan')::int NOT BETWEEN v_mod.row_span_min AND v_mod.row_span_max THEN
          RETURN 'rowSpan_fora_do_registry:' || v_mod.type;
        END IF;
      END IF;
    END LOOP;

    IF v_item ? 'mobile' THEN
      IF coalesce((v_item->'mobile'->>'order')::int, 0) < 0 THEN RETURN 'ordem_mobile_invalida'; END IF;
      IF coalesce(v_item->'mobile'->>'size','M') NOT IN ('S','M','L') THEN RETURN 'tamanho_mobile_invalido'; END IF;
    END IF;
  END LOOP;

  -- sobreposição no desktop: dois módulos não podem ocupar a mesma célula
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_layout->'items') a(i)
      JOIN jsonb_array_elements(p_layout->'items') b(j)
        ON (a.i->>'instanceId') < (b.j->>'instanceId')
     WHERE coalesce((a.i->>'hidden')::boolean, false) = false
       AND coalesce((b.j->>'hidden')::boolean, false) = false
       AND int4range((a.i->'desktop'->>'col')::int,
                     (a.i->'desktop'->>'col')::int + (a.i->'desktop'->>'colSpan')::int)
        && int4range((b.j->'desktop'->>'col')::int,
                     (b.j->'desktop'->>'col')::int + (b.j->'desktop'->>'colSpan')::int)
       AND int4range((a.i->'desktop'->>'row')::int,
                     (a.i->'desktop'->>'row')::int + (a.i->'desktop'->>'rowSpan')::int)
        && int4range((b.j->'desktop'->>'row')::int,
                     (b.j->'desktop'->>'row')::int + (b.j->'desktop'->>'rowSpan')::int)
  ) THEN
    RETURN 'modulos_sobrepostos';
  END IF;

  RETURN NULL;   -- válido
END; $$;

COMMENT ON FUNCTION public.dashboard_layout_invalido(jsonb) IS
  'Devolve NULL se o layout é válido, ou um código de erro. A mesma lógica existe em TypeScript para feedback imediato; esta é a que decide.';

-- ---------------------------------------------------------------------
-- 4. Gravar layout — compare-and-swap (§5.8)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guardar_dashboard_layout(
  p_vista uuid,
  p_revision_esperada integer,
  p_layout jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_erro text;
  v_nova integer;
  v_actual integer;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  IF pg_column_size(p_layout) > 32768 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'layout_demasiado_grande');
  END IF;

  v_erro := public.dashboard_layout_invalido(p_layout);
  IF v_erro IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'layout_invalido', 'detalhe', v_erro);
  END IF;

  UPDATE public.contabilista_dashboard_vistas v
     SET layout = jsonb_set(p_layout, '{revision}', to_jsonb(v.revision + 1)),
         revision = v.revision + 1,
         atualizado_em = now()
   WHERE v.id = p_vista
     AND v.contabilista_id = v_uid
     AND v.revision = p_revision_esperada
  RETURNING v.revision INTO v_nova;

  IF v_nova IS NULL THEN
    SELECT v.revision INTO v_actual FROM public.contabilista_dashboard_vistas v
     WHERE v.id = p_vista AND v.contabilista_id = v_uid;
    IF v_actual IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'vista_inexistente');
    END IF;
    RETURN jsonb_build_object('ok', false, 'motivo', 'layout_desatualizado', 'revision', v_actual);
  END IF;

  RETURN jsonb_build_object('ok', true, 'revision', v_nova);
END; $$;

REVOKE EXECUTE ON FUNCTION public.guardar_dashboard_layout(uuid, integer, jsonb) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.guardar_dashboard_layout(uuid, integer, jsonb) TO authenticated;

-- ---------------------------------------------------------------------
-- 5. Gerir vistas (criar / renomear / ordenar / principal)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_dashboard_vista(p_nome text, p_copiar_de uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quantas integer;
  v_layout jsonb;
  v_id uuid;
  v_ordem integer;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  SELECT count(*) INTO v_quantas FROM public.contabilista_dashboard_vistas WHERE contabilista_id = v_uid;
  IF v_quantas >= 8 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'demasiadas_vistas');
  END IF;

  IF p_copiar_de IS NOT NULL THEN
    SELECT layout INTO v_layout FROM public.contabilista_dashboard_vistas
     WHERE id = p_copiar_de AND contabilista_id = v_uid;
  END IF;

  SELECT coalesce(max(ordem), -1) + 1 INTO v_ordem
    FROM public.contabilista_dashboard_vistas WHERE contabilista_id = v_uid;

  INSERT INTO public.contabilista_dashboard_vistas (contabilista_id, nome, ordem, principal, layout)
  VALUES (v_uid, p_nome, v_ordem, v_quantas = 0,
          coalesce(v_layout, '{"version":2,"revision":1,"grid":{"desktop":{"columns":12,"rowHeight":52,"gap":12},"tablet":{"columns":8,"rowHeight":52,"gap":12}},"items":[]}'::jsonb))
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'motivo', 'nome_repetido');
END; $$;

CREATE OR REPLACE FUNCTION public.definir_dashboard_vista_principal(p_vista uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.contabilista_dashboard_vistas
                  WHERE id = p_vista AND contabilista_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'vista_inexistente');
  END IF;
  -- limpar antes de marcar: o índice único parcial não tolera duas.
  UPDATE public.contabilista_dashboard_vistas SET principal = false
   WHERE contabilista_id = v_uid AND principal;
  UPDATE public.contabilista_dashboard_vistas SET principal = true, atualizado_em = now()
   WHERE id = p_vista AND contabilista_id = v_uid;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.renomear_dashboard_vista(p_vista uuid, p_nome text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_uid uuid := auth.uid(); v_n integer;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;
  UPDATE public.contabilista_dashboard_vistas SET nome = p_nome, atualizado_em = now()
   WHERE id = p_vista AND contabilista_id = v_uid;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RETURN jsonb_build_object('ok', false, 'motivo', 'vista_inexistente'); END IF;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'motivo', 'nome_repetido');
END; $$;

REVOKE EXECUTE ON FUNCTION public.criar_dashboard_vista(text, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.definir_dashboard_vista_principal(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.renomear_dashboard_vista(uuid, text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.criar_dashboard_vista(text, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.definir_dashboard_vista_principal(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.renomear_dashboard_vista(uuid, text) TO authenticated;

-- Privilégios explícitos (ver nota na migração do perfil).
REVOKE ALL ON public.contabilista_dashboard_vistas FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.contabilista_dashboard_vistas TO authenticated;
-- Sem UPDATE de propósito: o layout muda por RPC validada.
REVOKE ALL ON public.dashboard_modulos FROM anon, authenticated;
GRANT SELECT ON public.dashboard_modulos TO authenticated;

COMMIT;
