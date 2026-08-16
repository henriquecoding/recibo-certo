-- ═══════════════════════════════════════════════════════════════════════
--  Correções do painel de contabilistas
--  ---------------------------------------------------------------------
--  Duas frentes, ambas de correção — nada de funcionalidade nova aqui.
--
--  1. `guardar_disponibilidade` passa a ser TRANSACIONAL.
--     O cliente fazia DELETE e depois INSERT em duas idas à base. Se o
--     INSERT falhasse, a semana-tipo do contabilista já tinha desaparecido
--     e ele ficava sem horários publicados — ninguém conseguia marcar
--     consulta com ele. Era o único fluxo de escrita do painel que ainda
--     não passava por RPC; todos os outros já aprenderam esta lição.
--
--  2. `resumo_clientes_do_contabilista` agrega no SERVIDOR.
--     A página de clientes lia até 300 agendamentos e 200 partilhas e
--     derivava os totais em JavaScript. Pior: `listarAgendamentos` ordena
--     por `inicio` ASCENDENTE, por isso o `limit(300)` guardava as
--     consultas MAIS ANTIGAS — acima desse número, «última consulta» e
--     «próxima consulta» passavam a estar simplesmente errados, sem aviso
--     nenhum, e são exatamente as colunas por que a tabela ordena.
--
--  A fronteira da migração 038 continua intacta: nada aqui lê `recibos`,
--  `cenarios`, `recibos_vencimento` ou `preferencias_fiscais`. Só se conta
--  o que passou por esta plataforma.
-- ═══════════════════════════════════════════════════════════════════════

-- ---------------------------------------------------------------------
-- 1. Semana-tipo numa transação
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guardar_disponibilidade(p_regras jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_regra  jsonb;
  v_inicio time;
  v_fim    time;
  v_dur    integer;
  v_int    integer;
  v_dia    integer;
  v_n      integer := 0;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  IF jsonb_typeof(p_regras) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'formato_invalido');
  END IF;

  IF jsonb_array_length(p_regras) > 60 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'periodos_a_mais');
  END IF;

  -- Validar TUDO antes de apagar seja o que for. É esta ordem que torna a
  -- função segura: um período mal escrito no fim da lista não pode deixar
  -- o contabilista sem os que estavam bem escritos no princípio.
  FOR v_regra IN SELECT * FROM jsonb_array_elements(p_regras) LOOP
    v_dia := (v_regra ->> 'diaSemana')::integer;
    IF v_dia IS NULL OR v_dia < 0 OR v_dia > 6 THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'dia_invalido');
    END IF;

    BEGIN
      v_inicio := (v_regra ->> 'inicio')::time;
      v_fim    := (v_regra ->> 'fim')::time;
    EXCEPTION WHEN others THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'hora_invalida');
    END;

    v_dur := COALESCE((v_regra ->> 'duracaoMin')::integer, 0);
    v_int := COALESCE((v_regra ->> 'intervaloMin')::integer, 0);

    IF v_fim <= v_inicio THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'fim_antes_do_inicio');
    END IF;
    IF v_dur <= 0 OR v_dur > 480 THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'duracao_invalida');
    END IF;
    IF v_int < 0 OR v_int > 240 THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'intervalo_invalido');
    END IF;
    IF EXTRACT(EPOCH FROM (v_fim - v_inicio)) / 60 < v_dur THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'periodo_mais_curto_que_a_consulta');
    END IF;
  END LOOP;

  -- Uma transação: o DELETE e o INSERT vivem ou morrem juntos.
  DELETE FROM public.contabilista_disponibilidade WHERE contabilista_id = v_uid;

  INSERT INTO public.contabilista_disponibilidade
    (contabilista_id, dia_semana, hora_inicio, hora_fim, duracao_min, intervalo_min)
  SELECT
    v_uid,
    (r ->> 'diaSemana')::integer,
    (r ->> 'inicio')::time,
    (r ->> 'fim')::time,
    (r ->> 'duracaoMin')::integer,
    COALESCE((r ->> 'intervaloMin')::integer, 0)
  FROM jsonb_array_elements(p_regras) AS r;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'periodos', v_n);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guardar_disponibilidade(jsonb) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.guardar_disponibilidade(jsonb) TO authenticated;

COMMENT ON FUNCTION public.guardar_disponibilidade(jsonb) IS
  'Substitui a semana-tipo do contabilista autenticado numa só transação. '
  'Valida tudo antes de apagar: um período inválido não deixa a agenda vazia.';

-- ---------------------------------------------------------------------
-- 2. Resumo por cliente, agregado no servidor
-- ---------------------------------------------------------------------
--
-- Uma linha por vínculo, com os números já contados. Substitui três
-- leituras grandes e truncadas por uma leitura exata.
--
-- As regras de derivação são as mesmas que `src/lib/contabilistas/resumo.ts`
-- já aplicava, e continuam lá para a demonstração e para os testes:
--   · «última»  = a consulta REALIZADA mais recente (uma cancelada não
--     conta como contacto — dizer «última consulta em março» quando essa
--     consulta foi desmarcada era uma afirmação falsa sobre a relação);
--   · «próxima» = a mais próxima por acontecer (pedido ou confirmado)
--     ainda no futuro;
--   · partilhas revogadas não contam: o cliente retirou-as.

-- ⚠️ DROP antes do CREATE, e não `CREATE OR REPLACE` sozinho.
--
-- Uma migração posterior — a da fronteira de contacto — reescreve esta
-- função SEM a coluna `email_cliente`. Ao reaplicar o conjunto todo, este
-- `CREATE OR REPLACE` tentava devolver uma assinatura diferente da que
-- existe e falhava com «cannot change return type of existing function».
-- O DROP torna cada migração idempotente por si, e a ordem dentro de uma
-- passagem continua a decidir o estado final — que é o desta função sem o
-- contacto do cliente.
DROP FUNCTION IF EXISTS public.resumo_clientes_do_contabilista();

CREATE FUNCTION public.resumo_clientes_do_contabilista()
RETURNS TABLE (
  vinculo_id            uuid,
  cliente_id            uuid,
  estado                text,
  origem                text,
  criado_em             timestamptz,
  nome_cliente          text,
  email_cliente         text,
  mensagem              text,
  consultas_realizadas  integer,
  ultima                timestamptz,
  proxima               timestamptz,
  partilhas             integer,
  partilhas_por_ler     integer,
  cartao_carimbos       integer,
  cartao_meta           integer,
  cartao_desconto_pct   integer,
  cartao_preco_base     integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  WITH quem AS (
    SELECT auth.uid() AS uid
  ),
  vinculos AS (
    SELECT v.*
      FROM public.contabilista_vinculos v, quem
     WHERE v.contabilista_id = quem.uid
       AND quem.uid IS NOT NULL
       AND public.e_contabilista_aprovado(quem.uid)
  ),
  ags AS (
    SELECT
      a.cliente_id,
      COUNT(*) FILTER (WHERE a.estado = 'realizada')::integer AS realizadas,
      MAX(a.inicio) FILTER (WHERE a.estado = 'realizada')     AS ultima,
      MIN(a.inicio) FILTER (
        WHERE a.estado IN ('pedido', 'confirmado') AND a.inicio >= now()
      )                                                        AS proxima
      FROM public.agendamentos a, quem
     WHERE a.contabilista_id = quem.uid
     GROUP BY a.cliente_id
  ),
  pts AS (
    SELECT
      p.cliente_id,
      COUNT(*)::integer                                          AS total,
      COUNT(*) FILTER (WHERE p.estado = 'enviada')::integer      AS por_ler
      FROM public.partilhas p, quem
     WHERE p.contabilista_id = quem.uid
       AND p.estado <> 'revogada'
     GROUP BY p.cliente_id
  ),
  cartoes AS (
    SELECT c.cliente_id, c.carimbos, c.meta, c.desconto_pct, c.preco_base_cents
      FROM public.fidelidade_cartoes c, quem
     WHERE c.contabilista_id = quem.uid
       AND c.completo = false
  )
  SELECT
    v.id, v.cliente_id, v.estado::text, v.origem::text, v.criado_em,
    v.nome_cliente, v.email_cliente, v.mensagem,
    COALESCE(ags.realizadas, 0),
    ags.ultima,
    ags.proxima,
    COALESCE(pts.total, 0),
    COALESCE(pts.por_ler, 0),
    cartoes.carimbos, cartoes.meta, cartoes.desconto_pct, cartoes.preco_base_cents
    FROM vinculos v
    LEFT JOIN ags     ON ags.cliente_id     = v.cliente_id
    LEFT JOIN pts     ON pts.cliente_id     = v.cliente_id
    LEFT JOIN cartoes ON cartoes.cliente_id = v.cliente_id
   ORDER BY v.criado_em DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.resumo_clientes_do_contabilista() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.resumo_clientes_do_contabilista() TO authenticated;

COMMENT ON FUNCTION public.resumo_clientes_do_contabilista() IS
  'Uma linha por cliente do contabilista autenticado, com consultas, envios '
  'e cartão já agregados. Substitui a derivação em JavaScript sobre listas '
  'truncadas por limite. Não lê tabelas fiscais (migração 038).';
