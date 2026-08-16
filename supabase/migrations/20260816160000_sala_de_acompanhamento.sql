-- 20260816160000_sala_de_acompanhamento.sql
-- ═══════════════════════════════════════════════════════════════════════
--  A SALA DE ACOMPANHAMENTO
--  ---------------------------------------------------------------------
--  Duas peças, e a segunda só faz sentido por causa da primeira.
--
--  1. `pedido_cliente` — o pedido deixa de ser uma frase no chat.
--
--     «Podes enviar o comprovativo de retenções?» é, hoje, texto solto. Não
--     tem estado, não tem prazo, não sabe quando foi satisfeito, e some-se
--     assim que mais três mensagens passarem por cima. As duas pessoas
--     ficam a fazer o mesmo trabalho por fora: uma tenta lembrar-se do que
--     falta, a outra tenta lembrar-se do que já mandou.
--
--     O que falta não é um chat melhor — é reconhecer que ali havia uma
--     COISA, e dar-lhe existência. Um pedido tem tipo, prazo, estado e uma
--     resposta ligada. É isso que torna possível haver um «próximo passo»
--     que não é uma opinião da interface.
--
--  2. `listar_timeline_vinculo` — uma linha do tempo, não seis separadores.
--
--     Mensagens, pedidos, partilhas, consultas, fidelidade e pagamentos
--     são hoje seis ecrãs. São a mesma relação vista por seis buracos, e
--     ninguém consegue responder a «como vai isto?» sem abrir os seis e
--     cruzá-los de cabeça.
--
--     De caminho corrige um defeito antigo: a conversa era lida com
--     `ORDER BY criado_em ASC LIMIT 500`. Numa relação com mais de 500
--     mensagens, isso mostra as MAIS ANTIGAS — a caixa abria em 2026 e a
--     pessoa tinha de rolar uma vida inteira para ver o que chegou hoje.
--     A paginação passa a ser por cursor, do mais recente para trás.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. A tabela ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pedido_cliente (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vinculo_id  uuid NOT NULL REFERENCES public.contabilista_vinculos(id) ON DELETE CASCADE,
  -- Quem pediu. Hoje é sempre o contabilista; a coluna existe para que o
  -- dia em que o cliente também puder pedir não seja uma migração de dados.
  criado_por  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  tipo        text NOT NULL CHECK (tipo IN (
                'documento', 'resposta', 'confirmacao', 'escolha',
                'pagamento', 'agendamento', 'dados')),
  titulo      text NOT NULL CHECK (char_length(titulo) BETWEEN 3 AND 120),
  descricao   text CHECK (descricao IS NULL OR char_length(descricao) <= 1000),

  -- Uma data, não um instante. «Até 21 de agosto» é o que se diz a uma
  -- pessoa; «até 21/08 às 23:59:59Z» é o que se diz a uma máquina, e
  -- guardá-lo assim só criava confusão de fuso à volta da meia-noite.
  prazo       date,
  obrigatorio boolean NOT NULL DEFAULT true,

  estado      text NOT NULL DEFAULT 'aberto' CHECK (estado IN (
                'aberto', 'respondido', 'em_analise', 'concluido', 'cancelado')),

  resposta_texto     text CHECK (resposta_texto IS NULL OR char_length(resposta_texto) <= 2000),
  -- Um ficheiro em resposta viaja como mensagem, e a mensagem fica ligada
  -- aqui. Reaproveita o canal de anexos já endurecido (048/050) em vez de
  -- abrir um segundo, que teria de ser endurecido outra vez.
  resposta_mensagem_id uuid REFERENCES public.contabilista_mensagens(id) ON DELETE SET NULL,

  respondido_em timestamptz,
  concluido_em  timestamptz,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),

  -- As datas não podem contar uma história impossível.
  CONSTRAINT pedido_respondido_tem_data CHECK (
    (estado IN ('aberto', 'cancelado')) OR respondido_em IS NOT NULL
      OR estado = 'concluido'),
  CONSTRAINT pedido_concluido_tem_data CHECK (
    (estado <> 'concluido') OR concluido_em IS NOT NULL)
);

COMMENT ON TABLE public.pedido_cliente IS
  'Uma coisa concreta que falta fazer numa relação: um documento, uma '
  'resposta, uma confirmação. Existe para que o que é pedido não dependa de '
  'alguém se lembrar de uma frase que passou no chat.';

CREATE INDEX IF NOT EXISTS pedido_cliente_vinculo_idx
  ON public.pedido_cliente (vinculo_id, criado_em DESC);
-- O índice que a sala usa a cada abertura: o que está por fazer, primeiro.
CREATE INDEX IF NOT EXISTS pedido_cliente_abertos_idx
  ON public.pedido_cliente (vinculo_id, prazo NULLS LAST)
  WHERE estado IN ('aberto', 'respondido', 'em_analise');

ALTER TABLE public.pedido_cliente ENABLE ROW LEVEL SECURITY;


-- ── 2. Quem lê, e quem escreve ──────────────────────────────────────
--
-- Ler é das duas partes. Escrever não é de ninguém por REST: todas as
-- transições passam por funções, porque cada uma delas tem uma precondição
-- que uma política não consegue exprimir (o estado de onde se vem) e um
-- aviso que tem de nascer na mesma transação.

DROP POLICY IF EXISTS "pedidos_partes_leem" ON public.pedido_cliente;
CREATE POLICY "pedidos_partes_leem" ON public.pedido_cliente
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contabilista_vinculos v
     WHERE v.id = pedido_cliente.vinculo_id
       AND (SELECT auth.uid()) IN (v.contabilista_id, v.cliente_id)
  ));

REVOKE INSERT, UPDATE, DELETE ON public.pedido_cliente FROM anon, authenticated;
GRANT SELECT ON public.pedido_cliente TO authenticated;

-- Texto seguro e fronteira de contacto, como em todo o texto que uma
-- pessoa escreve nesta plataforma.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc
              WHERE proname = 'rejeitar_codigo_painel'
                AND pronamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS trg_texto_seguro_pedido_cliente ON public.pedido_cliente;
    CREATE TRIGGER trg_texto_seguro_pedido_cliente
      BEFORE INSERT OR UPDATE ON public.pedido_cliente
      FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
        'titulo', 'descricao', 'resposta_texto');
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_sem_contacto_externo_pedido ON public.pedido_cliente;
CREATE TRIGGER trg_sem_contacto_externo_pedido
  BEFORE INSERT OR UPDATE ON public.pedido_cliente
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_contacto_externo(
    'titulo', 'descricao', 'resposta_texto');


-- ── 3. As transições ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.criar_pedido_cliente(
  p_vinculo     uuid,
  p_tipo        text,
  p_titulo      text,
  p_descricao   text DEFAULT NULL,
  p_prazo       date DEFAULT NULL,
  p_obrigatorio boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_v   public.contabilista_vinculos%ROWTYPE;
  v_id  uuid;
BEGIN
  SELECT * INTO v_v FROM public.contabilista_vinculos WHERE id = p_vinculo;
  IF NOT FOUND OR v_uid IS NULL OR v_v.contabilista_id <> v_uid THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;
  IF v_v.estado <> 'ativo' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'relacao_inativa');
  END IF;

  -- O CHECK da coluna também recusa isto, mas recusa-o levantando uma
  -- exceção — e quem chama fica com uma mensagem do PostgreSQL em vez de
  -- um motivo que a interface saiba traduzir. A validação repete-se aqui
  -- para que a recusa tenha nome.
  IF p_tipo IS NULL OR p_tipo NOT IN (
       'documento', 'resposta', 'confirmacao', 'escolha',
       'pagamento', 'agendamento', 'dados') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'tipo_desconhecido');
  END IF;

  IF char_length(btrim(coalesce(p_titulo, ''))) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'titulo_curto');
  END IF;

  -- Um prazo no passado não é um prazo, é um erro de escrita.
  IF p_prazo IS NOT NULL AND p_prazo < (now() AT TIME ZONE 'Europe/Lisbon')::date THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'prazo_no_passado');
  END IF;

  -- Um teto por relação. Sem ele, uma lista de pendências deixa de ser uma
  -- lista de pendências e passa a ser ruído — e o «próximo passo» perde o
  -- sentido quando há trinta primeiros passos.
  IF (SELECT count(*) FROM public.pedido_cliente
       WHERE vinculo_id = p_vinculo
         AND estado IN ('aberto', 'respondido', 'em_analise')) >= 20 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pedidos_a_mais');
  END IF;

  INSERT INTO public.pedido_cliente
      (vinculo_id, criado_por, tipo, titulo, descricao, prazo, obrigatorio)
  VALUES (p_vinculo, v_uid, p_tipo, btrim(p_titulo),
          nullif(btrim(coalesce(p_descricao, '')), ''), p_prazo, coalesce(p_obrigatorio, true))
  RETURNING id INTO v_id;

  PERFORM public.avisar_utilizador(
    v_v.cliente_id, 'pedido_criado',
    'Novo pedido do teu contabilista',
    btrim(p_titulo),
    '/dashboard/contabilista');

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;


CREATE OR REPLACE FUNCTION public.responder_pedido_cliente(
  p_pedido   uuid,
  p_texto    text DEFAULT NULL,
  p_mensagem uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_p   public.pedido_cliente%ROWTYPE;
  v_v   public.contabilista_vinculos%ROWTYPE;
BEGIN
  SELECT * INTO v_p FROM public.pedido_cliente WHERE id = p_pedido;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao'); END IF;

  SELECT * INTO v_v FROM public.contabilista_vinculos WHERE id = v_p.vinculo_id;
  IF v_uid IS NULL OR v_v.cliente_id <> v_uid THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  -- Responder a um pedido já concluído ou cancelado não é responder: é
  -- reabrir uma coisa que a outra pessoa deu por fechada.
  IF v_p.estado NOT IN ('aberto', 'respondido', 'em_analise') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pedido_fechado');
  END IF;

  IF nullif(btrim(coalesce(p_texto, '')), '') IS NULL AND p_mensagem IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'resposta_vazia');
  END IF;

  -- A mensagem indicada tem de ser desta relação e de quem responde. Sem
  -- esta verificação, um id de mensagem qualquer ficava colado a um pedido.
  IF p_mensagem IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.contabilista_mensagens m
        WHERE m.id = p_mensagem AND m.vinculo_id = v_p.vinculo_id AND m.autor_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'mensagem_invalida');
  END IF;

  UPDATE public.pedido_cliente
     SET estado               = 'respondido',
         resposta_texto       = coalesce(nullif(btrim(coalesce(p_texto, '')), ''), resposta_texto),
         resposta_mensagem_id = coalesce(p_mensagem, resposta_mensagem_id),
         respondido_em        = coalesce(respondido_em, now()),
         atualizado_em        = now()
   WHERE id = p_pedido;

  PERFORM public.avisar_utilizador(
    v_v.contabilista_id, 'pedido_respondido',
    public.tratamento_do_cliente(v_p.vinculo_id) || ' respondeu',
    v_p.titulo,
    '/contabilista/clientes/' || v_p.vinculo_id::text);

  RETURN jsonb_build_object('ok', true);
END;
$$;


CREATE OR REPLACE FUNCTION public.decidir_pedido_cliente(
  p_pedido  uuid,
  p_decisao text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_p   public.pedido_cliente%ROWTYPE;
  v_v   public.contabilista_vinculos%ROWTYPE;
  v_novo text;
BEGIN
  SELECT * INTO v_p FROM public.pedido_cliente WHERE id = p_pedido;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao'); END IF;

  SELECT * INTO v_v FROM public.contabilista_vinculos WHERE id = v_p.vinculo_id;
  IF v_uid IS NULL OR v_v.contabilista_id <> v_uid THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  v_novo := CASE p_decisao
              WHEN 'concluir' THEN 'concluido'
              WHEN 'analisar' THEN 'em_analise'
              WHEN 'reabrir'  THEN 'aberto'
              WHEN 'cancelar' THEN 'cancelado'
            END;
  IF v_novo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'decisao_desconhecida');
  END IF;

  -- A precondição vive no WHERE, e não numa leitura anterior: dois cliques
  -- ao mesmo tempo e o segundo não encontra linha, em vez de escrever por
  -- cima do primeiro.
  UPDATE public.pedido_cliente
     SET estado        = v_novo,
         concluido_em  = CASE WHEN v_novo = 'concluido' THEN now() ELSE NULL END,
         atualizado_em = now()
   WHERE id = p_pedido
     AND estado <> v_novo
     AND (v_novo <> 'concluido' OR estado IN ('aberto', 'respondido', 'em_analise'));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'transicao_nao_permitida');
  END IF;

  IF v_novo = 'concluido' THEN
    PERFORM public.avisar_utilizador(
      v_v.cliente_id, 'pedido_concluido',
      'Pedido tratado',
      v_p.titulo,
      '/dashboard/contabilista');
  END IF;

  RETURN jsonb_build_object('ok', true, 'estado', v_novo);
END;
$$;


-- Os avisos novos precisam de caber na restrição da migração 044.
ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_tipo_check CHECK (tipo IN (
  'vinculo_pedido', 'vinculo_aceite', 'mensagem',
  'consulta_pedida', 'consulta_confirmada', 'consulta_cancelada',
  'partilha_recebida', 'cupao_ganho', 'candidatura_decidida',
  'pedido_criado', 'pedido_respondido', 'pedido_concluido'));

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.criar_pedido_cliente(uuid, text, text, text, date, boolean)',
    'public.responder_pedido_cliente(uuid, text, uuid)',
    'public.decidir_pedido_cliente(uuid, text)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', f);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;


-- ── 4. A linha do tempo ─────────────────────────────────────────────
--
-- Uma função e não seis leituras. A alternativa — o browser lê seis
-- tabelas, junta-as e ordena — obriga a trazer tudo para poder mostrar as
-- últimas trinta, que é exatamente o defeito que isto vem corrigir.
--
-- É PL/pgSQL com SQL montado em texto por uma razão concreta: `pagamentos`
-- nasce numa migração com nome por data, e pode não existir na base onde
-- isto corre. Uma referência estática a uma tabela ausente rebenta na
-- CRIAÇÃO da função; montada em texto, só é lida quando existe.

CREATE OR REPLACE FUNCTION public.listar_timeline_vinculo(
  p_vinculo uuid,
  p_ate     timestamptz DEFAULT NULL,
  p_limite  integer     DEFAULT 30
)
RETURNS TABLE (
  tipo          text,
  referencia_id uuid,
  quando        timestamptz,
  autor_id      uuid,
  titulo        text,
  corpo         text,
  estado        text,
  meta          jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_v   public.contabilista_vinculos%ROWTYPE;
  v_sql text;
  v_lim integer := least(greatest(coalesce(p_limite, 30), 1), 100);
BEGIN
  SELECT * INTO v_v FROM public.contabilista_vinculos WHERE id = p_vinculo;
  -- SECURITY DEFINER passa por cima da RLS, por isso a autorização tem de
  -- ser feita aqui à mão. É a única linha desta função que não pode falhar.
  IF NOT FOUND OR v_uid IS NULL OR v_uid NOT IN (v_v.contabilista_id, v_v.cliente_id) THEN
    RETURN;
  END IF;

  v_sql := $q$
    SELECT 'mensagem'::text, m.id, m.criado_em, m.autor_id,
           NULL::text, m.corpo, NULL::text,
           jsonb_build_object(
             'anexos', (SELECT count(*) FROM public.contabilista_anexos a
                         WHERE a.mensagem_id = m.id),
             'lida', m.lida_em IS NOT NULL)
      FROM public.contabilista_mensagens m
     WHERE m.vinculo_id = $1

    UNION ALL
    SELECT 'pedido', p.id, p.criado_em, p.criado_por,
           p.titulo, p.descricao, p.estado,
           jsonb_build_object('tipoPedido', p.tipo, 'prazo', p.prazo,
                              'obrigatorio', p.obrigatorio,
                              'respondidoEm', p.respondido_em)
      FROM public.pedido_cliente p
     WHERE p.vinculo_id = $1

    UNION ALL
    SELECT 'partilha', s.id, s.criado_em, $3,
           s.titulo, s.nota_cliente, s.estado,
           jsonb_build_object('tipoPartilha', s.tipo)
      FROM public.partilhas s
     WHERE s.contabilista_id = $2 AND s.cliente_id = $3

    UNION ALL
    SELECT 'consulta', g.id, g.criado_em, NULL::uuid,
           coalesce(g.assunto, 'Consulta'), NULL::text, g.estado,
           jsonb_build_object('inicio', g.inicio, 'fim', g.fim,
                              'modalidade', g.modalidade,
                              'localOuLigacao', g.local_ou_ligacao)
      FROM public.agendamentos g
     WHERE g.contabilista_id = $2 AND g.cliente_id = $3

    UNION ALL
    SELECT 'fidelidade', c.id, c.criado_em, NULL::uuid,
           'Cupão de desconto', c.codigo, c.estado,
           jsonb_build_object('percentagem', c.percentagem,
                              'valorBaseCents', c.valor_base_cents,
                              'expiraEm', c.expira_em)
      FROM public.fidelidade_cupoes c
     WHERE c.contabilista_id = $2 AND c.cliente_id = $3

    UNION ALL
    SELECT 'vinculo', v.id, v.criado_em, NULL::uuid,
           'Início do acompanhamento', v.mensagem, v.estado,
           jsonb_build_object('origem', v.origem)
      FROM public.contabilista_vinculos v
     WHERE v.id = $1
  $q$;

  IF to_regclass('public.pagamentos') IS NOT NULL THEN
    v_sql := v_sql || $q$
      UNION ALL
      SELECT 'pagamento', g.id, g.criado_em, NULL::uuid,
             coalesce(g.descricao, 'Pagamento'), NULL::text, g.estado,
             jsonb_build_object('liquidoCents', g.liquido_cents,
                                'descontoCents', g.desconto_cents,
                                'pagoEm', g.pago_em)
        FROM public.pagamentos g
       WHERE g.contabilista_id = $2 AND g.cliente_id = $3
    $q$;
  END IF;

  RETURN QUERY EXECUTE
    'SELECT * FROM (' || v_sql || ') AS e(tipo, referencia_id, quando, autor_id,'
    || ' titulo, corpo, estado, meta)'
    || ' WHERE ($4::timestamptz IS NULL OR e.quando < $4)'
    || ' ORDER BY e.quando DESC LIMIT ' || v_lim
    USING p_vinculo, v_v.contabilista_id, v_v.cliente_id, p_ate;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.listar_timeline_vinculo(uuid, timestamptz, integer)
  FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.listar_timeline_vinculo(uuid, timestamptz, integer)
  TO authenticated;

COMMENT ON FUNCTION public.listar_timeline_vinculo(uuid, timestamptz, integer) IS
  'A relação inteira numa lista ordenada, do mais recente para trás, com '
  'cursor em `quando`. Autoriza à mão porque é SECURITY DEFINER: só devolve '
  'linhas a quem é parte do vínculo.';
