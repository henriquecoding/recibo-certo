-- 047_rpcs_transacionais.sql
-- ═══════════════════════════════════════════════════════════════════════
--  AS TRANSIÇÕES PASSAM A SER COMANDOS, NÃO ESCRITAS LIVRES
--  ---------------------------------------------------------------------
--  Fecha P0.5 / PR-12 e a metade que faltava do P0.6.
--
--  O problema: `agendamentos` tinha INSERT e UPDATE genéricos para o papel
--  `authenticated`. A política verificava QUEM escrevia e o estado FINAL —
--  nunca o estado ANTERIOR nem as regras do negócio. Por REST, isso
--  significava:
--
--    · marcar às 3 da manhã de domingo, fora de qualquer disponibilidade;
--    · marcar daqui a cinco minutos, ignorando a antecedência;
--    · marcar daqui a dois anos;
--    · mudar a hora de uma consulta já confirmada;
--    · saltar de «pedido» para «realizada» sem passar por «confirmado»;
--    · dois pedidos simultâneos a competir pelo mesmo estado (TOCTOU).
--
--  A correção não é apertar a política — é tirar a escrita livre. Cada
--  transição passa a ser uma função com precondição:
--
--      UPDATE … WHERE id = ? AND estado = <esperado> RETURNING …
--
--  Se a linha não voltar, alguém chegou primeiro, e a função diz isso em
--  vez de escrever por cima. É o que fecha a corrida sem lock explícito.
--
--  E `concluir_consulta` faz numa só transação o que a rota fazia em duas:
--  marcar realizada, carimbar e emitir cupão. Antes, se o carimbo falhasse,
--  a consulta ficava concluída sem recompensa e a rota respondia sucesso.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Os avisos nascem das transições, não de um endpoint ─────────────
--
-- Fecha PR-09 / E3. Havia `/api/contabilistas/avisar`: quem soubesse um id
-- de vínculo disparava notificações na conta de outra pessoa, com o texto
-- escolhido de um catálogo — mas com o momento e o destinatário escolhidos
-- por quem chamava. Um canal de qualquer um para qualquer um.
--
-- Aqui o aviso é escrito pela mesma transação que causa o facto. Não há
-- como disparar um sem o facto acontecer, nem o facto acontecer sem aviso.

-- ── Escrever no sino, sem passar por vínculo ────────────────────────
-- `avisar_parte` deriva o destinatário de um vínculo. Nem tudo tem um: uma
-- candidatura decidida não é uma relação entre duas pessoas. Esta é a
-- primitiva; fica fechada a toda a gente e só as funções de segurança
-- definida acima lhe chegam.
CREATE OR REPLACE FUNCTION public.avisar_utilizador(
  p_destino uuid,
  p_tipo    text,
  p_titulo  text,
  p_corpo   text,
  p_url     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_destino IS NULL THEN RETURN; END IF;
  INSERT INTO public.notificacoes (user_id, tipo, titulo, corpo, url)
  VALUES (p_destino, p_tipo, left(p_titulo, 200), left(p_corpo, 500), p_url);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.avisar_utilizador(uuid, text, text, text, text)
  FROM anon, authenticated, public;


-- ── Como se chama quem escreveu, do lado de quem lê ─────────────────
-- O contabilista vê o nome que o cliente lhe deu, ou o identificador curto
-- se não deu nenhum. Nunca o email: o aviso não é um sítio para contornar
-- a fronteira que a plataforma inteira mantém.
CREATE OR REPLACE FUNCTION public.tratamento_do_cliente(p_vinculo uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(
           nullif(btrim(coalesce(v.nome_cliente, '')), ''),
           'Cliente ' || upper(left(replace(v.cliente_id::text, '-', ''), 4))
         )
    FROM public.contabilista_vinculos v
   WHERE v.id = p_vinculo;
$$;

REVOKE EXECUTE ON FUNCTION public.tratamento_do_cliente(uuid)
  FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.avisar_parte(
  p_vinculo uuid,
  p_autor   uuid,
  p_tipo    text,
  p_titulo  text,
  p_corpo   text,
  p_url     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_destino uuid;
BEGIN
  SELECT CASE WHEN v.contabilista_id = p_autor THEN v.cliente_id ELSE v.contabilista_id END
    INTO v_destino
    FROM public.contabilista_vinculos v
   WHERE v.id = p_vinculo
     AND v.estado <> 'terminado'
     AND (v.contabilista_id = p_autor OR v.cliente_id = p_autor);

  IF v_destino IS NULL THEN RETURN; END IF;

  INSERT INTO public.notificacoes (user_id, tipo, titulo, corpo, url)
  VALUES (v_destino, p_tipo, left(p_titulo, 200), left(p_corpo, 500), p_url);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.avisar_parte(uuid, uuid, text, text, text, text)
  FROM anon, authenticated, public;

-- ── Antecedência e janela ───────────────────────────────────────────
-- Os mesmos números que `agenda.ts` usa no cliente. Aqui são a garantia;
-- lá são a conveniência de não mostrar o que vai ser recusado.
CREATE OR REPLACE FUNCTION public.agenda_antecedencia_horas() RETURNS integer
LANGUAGE sql IMMUTABLE AS $$ SELECT 12 $$;

CREATE OR REPLACE FUNCTION public.agenda_janela_dias() RETURNS integer
LANGUAGE sql IMMUTABLE AS $$ SELECT 60 $$;


-- ── O horário cabe mesmo na agenda publicada? ───────────────────────
--
-- Responde à pergunta que a política nunca fazia. Trabalha em hora de
-- parede de Lisboa, porque é isso que o contabilista publica: «terças, das
-- 9 às 13». Um intervalo em UTC não sabe nada sobre isso, e Portugal muda
-- a hora duas vezes por ano.
CREATE OR REPLACE FUNCTION public.horario_disponivel(
  p_contabilista uuid,
  p_inicio       timestamptz,
  p_fim          timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_local_ini timestamp;
  v_local_fim timestamp;
  v_dia       date;
  v_dow       smallint;
BEGIN
  IF p_fim <= p_inicio THEN RETURN false; END IF;

  v_local_ini := p_inicio AT TIME ZONE 'Europe/Lisbon';
  v_local_fim := p_fim    AT TIME ZONE 'Europe/Lisbon';
  v_dia := v_local_ini::date;

  -- Uma consulta não atravessa a meia-noite. Se atravessasse, «o dia da
  -- semana» deixava de ter resposta única.
  IF v_local_fim::date <> v_dia THEN RETURN false; END IF;

  v_dow := EXTRACT(dow FROM v_local_ini)::smallint;  -- 0 = domingo

  -- Tem de caber INTEIRA dentro de um período publicado, e a duração tem
  -- de ser a que esse período anuncia — senão marcava-se uma consulta de
  -- dez minutos num período de uma hora e ocupava-se a hora toda.
  IF NOT EXISTS (
    SELECT 1
    FROM public.contabilista_disponibilidade d
    WHERE d.contabilista_id = p_contabilista
      AND d.dia_semana = v_dow
      AND v_local_ini::time >= d.hora_inicio
      AND v_local_fim::time <= d.hora_fim
      AND (v_local_fim - v_local_ini) = make_interval(mins => d.duracao_min)
  ) THEN
    RETURN false;
  END IF;

  -- Exceções: sem horas, o dia inteiro está fechado.
  IF EXISTS (
    SELECT 1
    FROM public.contabilista_excecoes e
    WHERE e.contabilista_id = p_contabilista
      AND e.data = v_dia
      AND (
        (e.hora_inicio IS NULL AND e.hora_fim IS NULL)
        OR (v_local_ini::time < e.hora_fim AND e.hora_inicio < v_local_fim::time)
      )
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.horario_disponivel(uuid, timestamptz, timestamptz)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.horario_disponivel(uuid, timestamptz, timestamptz)
  TO authenticated, service_role;

-- ── Marcar ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.marcar_consulta(
  p_contabilista uuid, p_inicio timestamptz, p_fim timestamptz,
  p_modalidade text, p_assunto text DEFAULT NULL, p_tipo uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_cliente uuid := auth.uid(); v_id uuid; v_vinculo uuid;
BEGIN
  IF v_cliente IS NULL THEN RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado'); END IF;
  IF NOT public.vinculo_ativo(p_contabilista, v_cliente) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_vinculo_ativo'); END IF;
  IF p_modalidade NOT IN ('presencial','online') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'modalidade_invalida'); END IF;
  IF p_inicio < now() + make_interval(hours => public.agenda_antecedencia_horas()) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_antecedencia'); END IF;
  IF p_inicio > now() + make_interval(days => public.agenda_janela_dias()) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'fora_da_janela'); END IF;
  IF NOT public.horario_disponivel(p_contabilista, p_inicio, p_fim) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'horario_nao_publicado'); END IF;
  IF p_tipo IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.contabilista_tipos_consulta t
    WHERE t.id = p_tipo AND t.contabilista_id = p_contabilista AND t.ativo
  ) THEN RETURN jsonb_build_object('ok', false, 'motivo', 'tipo_invalido'); END IF;

  BEGIN
    INSERT INTO public.agendamentos
      (contabilista_id, cliente_id, inicio, fim, estado, modalidade, assunto, tipo_consulta_id)
    VALUES (p_contabilista, v_cliente, p_inicio, p_fim, 'pedido', p_modalidade,
            nullif(btrim(coalesce(p_assunto,'')), ''), p_tipo)
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'horario_ocupado');
  END;

  SELECT v.id INTO v_vinculo FROM public.contabilista_vinculos v
   WHERE v.contabilista_id = p_contabilista AND v.cliente_id = v_cliente AND v.estado = 'ativo';
  IF v_vinculo IS NOT NULL THEN
    PERFORM public.avisar_parte(v_vinculo, v_cliente, 'consulta_pedida',
      'Pedido de consulta', 'Confirma o horário para a marcação ficar fechada.',
      '/contabilista/agenda');
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- ── Confirmar ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.confirmar_consulta(p_agendamento uuid, p_local text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid; v_vinculo uuid; v_cliente uuid;
BEGIN
  UPDATE public.agendamentos a
     SET estado = 'confirmado',
         local_ou_ligacao = coalesce(nullif(btrim(coalesce(p_local, '')), ''), a.local_ou_ligacao),
         atualizado_em = now()
   WHERE a.id = p_agendamento
     AND a.contabilista_id = auth.uid()
     AND a.estado = 'pedido'
     AND public.contabilista_ativo(auth.uid())
  RETURNING a.id, a.cliente_id INTO v_id, v_cliente;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_estava_por_confirmar');
  END IF;

  SELECT v.id INTO v_vinculo FROM public.contabilista_vinculos v
   WHERE v.contabilista_id = auth.uid() AND v.cliente_id = v_cliente AND v.estado <> 'terminado';
  IF v_vinculo IS NOT NULL THEN
    PERFORM public.avisar_parte(v_vinculo, auth.uid(), 'consulta_confirmada',
      'A tua consulta foi confirmada', 'Vê a hora e o local na tua área.',
      '/dashboard/contabilista');
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- ── Cancelar ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancelar_consulta(p_agendamento uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_quem uuid := auth.uid();
  v_estado text; v_id uuid; v_cliente uuid; v_cc uuid; v_vinculo uuid;
BEGIN
  SELECT CASE
           WHEN a.cliente_id = v_quem THEN 'cancelado_cliente'
           WHEN a.contabilista_id = v_quem THEN 'cancelado_contabilista'
         END,
         a.cliente_id, a.contabilista_id
    INTO v_estado, v_cliente, v_cc
    FROM public.agendamentos a
   WHERE a.id = p_agendamento;

  IF v_estado IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_autorizacao');
  END IF;

  UPDATE public.agendamentos a
     SET estado = v_estado, atualizado_em = now()
   WHERE a.id = p_agendamento
     AND a.estado IN ('pedido', 'confirmado')
  RETURNING a.id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ja_fechada');
  END IF;

  SELECT v.id INTO v_vinculo FROM public.contabilista_vinculos v
   WHERE v.contabilista_id = v_cc AND v.cliente_id = v_cliente AND v.estado <> 'terminado';
  IF v_vinculo IS NOT NULL THEN
    PERFORM public.avisar_parte(v_vinculo, v_quem, 'consulta_cancelada',
      'Uma consulta foi cancelada', 'Vê a agenda para remarcar.',
      CASE WHEN v_quem = v_cc THEN '/dashboard/contabilista' ELSE '/contabilista/agenda' END);
  END IF;

  RETURN jsonb_build_object('ok', true, 'estado', v_estado);
END;
$$;

-- ── Concluir: uma transação, não duas ───────────────────────────────
-- O código do cupão nasce aqui dentro, e não no parâmetro.
--
-- Enquanto vinha de fora, quem chamasse escolhia-o — e um código escolhido
-- é um código adivinhável por quem o escolheu. `gen_random_uuid()` usa a
-- mesma fonte de aleatoriedade do sistema e não precisa de extensão nenhuma.
CREATE OR REPLACE FUNCTION public.gerar_codigo_cupao()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $$
DECLARE
  -- Sem caracteres ambíguos (0/O, 1/I/L): o código é lido em voz alta.
  v_alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_hex text := replace(gen_random_uuid()::text, '-', '');
  v_letras text := '';
  i integer;
BEGIN
  FOR i IN 0..7 LOOP
    v_letras := v_letras || substr(
      v_alfabeto,
      (('x' || substr(v_hex, i * 2 + 1, 2))::bit(8)::integer % length(v_alfabeto)) + 1,
      1);
  END LOOP;
  RETURN 'RC-' || substr(v_letras, 1, 4) || '-' || substr(v_letras, 5, 4);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.gerar_codigo_cupao() FROM anon, authenticated, public;

DROP FUNCTION IF EXISTS public.concluir_consulta(uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.concluir_consulta(
  p_agendamento uuid, p_compareceu boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_id uuid; v_estado text; v_fidelidade jsonb; v_cliente uuid; v_vinculo uuid;
BEGIN
  v_estado := CASE WHEN p_compareceu THEN 'realizada' ELSE 'nao_compareceu' END;

  UPDATE public.agendamentos a
     SET estado = v_estado, atualizado_em = now()
   WHERE a.id = p_agendamento
     AND a.contabilista_id = auth.uid()
     AND a.estado IN ('pedido', 'confirmado')
     AND a.inicio <= now()
     AND public.contabilista_ativo(auth.uid())
  RETURNING a.id, a.cliente_id INTO v_id, v_cliente;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_concluivel');
  END IF;

  IF NOT p_compareceu THEN
    RETURN jsonb_build_object('ok', true, 'estado', v_estado, 'fidelidade', NULL);
  END IF;

  v_fidelidade := public.carimbar_consulta(p_agendamento, public.gerar_codigo_cupao());

  IF coalesce((v_fidelidade->>'completou')::boolean, false) THEN
    SELECT v.id INTO v_vinculo FROM public.contabilista_vinculos v
     WHERE v.contabilista_id = auth.uid() AND v.cliente_id = v_cliente
       AND v.estado <> 'terminado';
    IF v_vinculo IS NOT NULL THEN
      PERFORM public.avisar_parte(v_vinculo, auth.uid(), 'cupao_ganho',
        'Completaste o cartão de fidelidade',
        'Tens um desconto à espera na tua área.', '/dashboard/contabilista');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'estado', v_estado, 'fidelidade', v_fidelidade);
END;
$$;

-- ── Vínculo: aceitar, recusar, pausar, terminar ─────────────────────
CREATE OR REPLACE FUNCTION public.decidir_vinculo(p_vinculo uuid, p_decisao text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_quem uuid := auth.uid(); v_id uuid; v_novo text; v_esperado text[];
BEGIN
  IF p_decisao NOT IN ('aceitar','recusar','pausar','reativar','terminar') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'decisao_invalida');
  END IF;

  v_novo := CASE p_decisao WHEN 'aceitar' THEN 'ativo' WHEN 'reativar' THEN 'ativo'
                           WHEN 'pausar' THEN 'pausado' ELSE 'terminado' END;
  v_esperado := CASE p_decisao
                  WHEN 'aceitar'  THEN ARRAY['pendente','convidado']
                  WHEN 'recusar'  THEN ARRAY['pendente','convidado']
                  WHEN 'pausar'   THEN ARRAY['ativo']
                  WHEN 'reativar' THEN ARRAY['pausado']
                  ELSE ARRAY['pendente','convidado','ativo','pausado'] END;

  UPDATE public.contabilista_vinculos v
     SET estado = v_novo,
         terminado_em = CASE WHEN v_novo = 'terminado' THEN now() ELSE v.terminado_em END
   WHERE v.id = p_vinculo
     AND v.estado = ANY(v_esperado)
     AND (
       (v.contabilista_id = v_quem AND public.contabilista_ativo(v_quem))
       OR (v.cliente_id = v_quem AND p_decisao = 'terminar')
     )
  RETURNING v.id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'transicao_nao_permitida');
  END IF;

  IF p_decisao = 'aceitar' THEN
    PERFORM public.avisar_parte(p_vinculo, v_quem, 'vinculo_aceite',
      'O teu pedido foi aceite', 'Já podes marcar consultas e enviar simulações.',
      '/dashboard/contabilista');
  END IF;

  RETURN jsonb_build_object('ok', true, 'estado', v_novo);
END;
$$;

-- ── Fechar a escrita livre ──────────────────────────────────────────
-- As políticas saem. Sem elas e sem grant, `authenticated` deixa de poder
-- escrever em `agendamentos` por REST — e o único caminho passam a ser as
-- funções acima, que validam tudo o que a política não conseguia ver.
DROP POLICY IF EXISTS "agendamentos_cliente_marca"      ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_contabilista_gere"  ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_cliente_cancela"    ON public.agendamentos;
REVOKE INSERT, UPDATE, DELETE ON public.agendamentos FROM anon, authenticated;

-- Os vínculos também: criar continua a ser um INSERT (é um pedido, não uma
-- transição), mas decidir passa pela função.
DROP POLICY IF EXISTS "vinculos_contabilista_decide" ON public.contabilista_vinculos;
DROP POLICY IF EXISTS "vinculos_cliente_termina"     ON public.contabilista_vinculos;
REVOKE UPDATE ON public.contabilista_vinculos FROM anon, authenticated;

-- Uma exceção, e é precisa: corrigir o nome por que se quer ser tratado NÃO
-- é uma transição de estado, é editar um campo. Fechar o UPDATE inteiro
-- tirava isso ao cliente sem ganhar nada.
--
-- O instrumento certo aqui não é uma RPC nem uma política mais esperta: é o
-- grant POR COLUNA. Um UPDATE que toque em `estado` falha ao nível do
-- privilégio, antes sequer de a política ser avaliada — e as duas colunas
-- que sobram são exatamente as que o próprio deu.
GRANT UPDATE (nome_cliente, email_cliente)
  ON public.contabilista_vinculos TO authenticated;

DROP POLICY IF EXISTS "vinculos_cliente_corrige_identidade" ON public.contabilista_vinculos;
CREATE POLICY "vinculos_cliente_corrige_identidade" ON public.contabilista_vinculos
  FOR UPDATE TO authenticated
  USING (cliente_id = (SELECT auth.uid()) AND estado <> 'terminado')
  WITH CHECK (cliente_id = (SELECT auth.uid()) AND estado <> 'terminado');

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.marcar_consulta(uuid, timestamptz, timestamptz, text, text, uuid)',
    'public.confirmar_consulta(uuid, text)',
    'public.cancelar_consulta(uuid)',
    'public.concluir_consulta(uuid, boolean)',
    'public.decidir_vinculo(uuid, text)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.marcar_consulta(uuid, timestamptz, timestamptz, text, text, uuid) IS
  'Único caminho para marcar. Valida vínculo, antecedência, janela, disponibilidade publicada, exceções e tipo. O duplo agendamento continua a ser fechado pela restrição GIST, e aqui distingue-se de um erro do pedido.';
COMMENT ON FUNCTION public.concluir_consulta(uuid, boolean) IS
  'Conclui e carimba na MESMA transação. Antes eram duas: se o carimbo falhasse, a consulta ficava concluída sem recompensa e a rota respondia sucesso.';
COMMENT ON FUNCTION public.decidir_vinculo(uuid, text) IS
  'Transições do vínculo com precondição de estado no WHERE. Dois pedidos simultâneos: o segundo não encontra linha e diz que a transição não é possível, em vez de escrever por cima.';

-- ═══════════════════════════════════════════════════════════════════════
--  O RESTO DOS AVISOS: GATILHOS, NÃO CHAMADAS
--  ---------------------------------------------------------------------
--  As transições acima já avisam de dentro da própria transação. Faltavam
--  três factos que não são transições e continuavam a depender de o browser
--  se lembrar de chamar `/api/contabilistas/avisar` a seguir:
--
--    · pedir vínculo (um INSERT);
--    · escrever uma mensagem (um INSERT);
--    · enviar uma simulação (um INSERT).
--
--  Depender do browser tem dois defeitos ao mesmo tempo. Fecha-se o
--  separador a seguir a enviar e o aviso não chega. E, ao contrário, sabe-se
--  um id e o aviso chega sem que nada tenha acontecido.
--
--  Um gatilho não tem nem um nem outro: o aviso nasce da linha, na mesma
--  transação, e não há maneira de o pedir sem escrever a linha.
-- ═══════════════════════════════════════════════════════════════════════
-- ── Pedido de vínculo ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.aviso_vinculo_novo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.origem = 'cliente' THEN
    PERFORM public.avisar_utilizador(
      NEW.contabilista_id, 'vinculo_pedido',
      public.tratamento_do_cliente(NEW.id) || ' quer ser teu cliente',
      'Vê o pedido e decide se aceitas.', '/contabilista/clientes');
  ELSE
    -- Convite do contabilista. Quem recebe é o cliente, e o que lhe chega é
    -- o nome público do contabilista — esse não é dado de contacto.
    PERFORM public.avisar_utilizador(
      NEW.cliente_id, 'vinculo_pedido',
      coalesce((SELECT c.nome FROM public.contabilistas c
                 WHERE c.user_id = NEW.contabilista_id), 'Um contabilista')
        || ' convidou-te',
      'Vê o convite na tua área e decide.', '/dashboard/contabilista');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS aviso_vinculo_novo ON public.contabilista_vinculos;
CREATE TRIGGER aviso_vinculo_novo
  AFTER INSERT ON public.contabilista_vinculos
  FOR EACH ROW EXECUTE FUNCTION public.aviso_vinculo_novo();


-- ── Mensagem nova ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.aviso_mensagem_nova()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_quem text;
BEGIN
  SELECT CASE WHEN v.contabilista_id = NEW.autor_id
              THEN coalesce((SELECT c.nome FROM public.contabilistas c
                              WHERE c.user_id = v.contabilista_id), 'O teu contabilista')
              ELSE public.tratamento_do_cliente(v.id)
         END
    INTO v_quem
    FROM public.contabilista_vinculos v WHERE v.id = NEW.vinculo_id;

  PERFORM public.avisar_parte(
    NEW.vinculo_id, NEW.autor_id, 'mensagem',
    'Mensagem de ' || coalesce(v_quem, 'alguém'), NULL,
    '/contabilista/clientes/' || NEW.vinculo_id::text);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS aviso_mensagem_nova ON public.contabilista_mensagens;
CREATE TRIGGER aviso_mensagem_nova
  AFTER INSERT ON public.contabilista_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.aviso_mensagem_nova();


-- ── Simulação enviada ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.aviso_partilha_nova()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_vinculo uuid;
BEGIN
  SELECT v.id INTO v_vinculo FROM public.contabilista_vinculos v
   WHERE v.contabilista_id = NEW.contabilista_id
     AND v.cliente_id = NEW.cliente_id
     AND v.estado <> 'terminado';

  IF v_vinculo IS NOT NULL THEN
    PERFORM public.avisar_utilizador(
      NEW.contabilista_id, 'partilha_recebida',
      public.tratamento_do_cliente(v_vinculo) || ' enviou-te uma simulação',
      NULL, '/contabilista/partilhas');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS aviso_partilha_nova ON public.partilhas;
CREATE TRIGGER aviso_partilha_nova
  AFTER INSERT ON public.partilhas
  FOR EACH ROW EXECUTE FUNCTION public.aviso_partilha_nova();


-- ── Candidatura decidida ────────────────────────────────────────────
-- Estava no catálogo e nunca era enviada: quem se candidatava só sabia da
-- decisão se voltasse à página. Agora nasce da própria decisão.
CREATE OR REPLACE FUNCTION public.aviso_candidatura_decidida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado
     AND NEW.estado IN ('aprovado', 'recusado', 'suspenso') THEN
    PERFORM public.avisar_utilizador(
      NEW.user_id, 'candidatura_decidida',
      'Há novidades sobre a tua candidatura',
      CASE NEW.estado
        WHEN 'aprovado' THEN 'O teu perfil está aprovado. Já podes receber clientes.'
        WHEN 'recusado' THEN 'Vê o que falta na página da candidatura.'
        ELSE 'O teu perfil está suspenso. Vê a página da candidatura.'
      END,
      '/contabilistas/candidatura');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS aviso_candidatura_decidida ON public.contabilistas;
CREATE TRIGGER aviso_candidatura_decidida
  AFTER UPDATE OF estado ON public.contabilistas
  FOR EACH ROW EXECUTE FUNCTION public.aviso_candidatura_decidida();

-- ═══════════════════════════════════════════════════════════════════════
--  O EMAIL PASSA A SER UMA FILA, NÃO UM PEDIDO PENDURADO
--  ---------------------------------------------------------------------
--  Fecha PR-13. Enquanto o aviso era escrito por uma rota, o email saía na
--  mesma chamada com `void`: se o Resend estivesse em baixo, ou se a função
--  terminasse antes da promessa resolver, o email perdia-se em silêncio e
--  ninguém ficava a saber.
--
--  Agora o aviso nasce dentro da transação, e o email é uma consequência
--  dele — anotada na própria linha. Um trabalho periódico esvazia a fila.
--  Um email por dar fica por dar até ser dado, ou até três tentativas
--  dizerem que não vale a pena insistir.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS email_estado     text NOT NULL DEFAULT 'dispensado',
  ADD COLUMN IF NOT EXISTS email_tentativas smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_em         timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notificacoes_email_estado_ck'
  ) THEN
    ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_email_estado_ck
      CHECK (email_estado IN ('dispensado', 'por_enviar', 'a_enviar', 'enviado', 'falhado'));
  END IF;
END $$;

-- Só o que interrompe o dia de alguém. Uma conversa que manda um email por
-- linha é uma conversa que se abandona, e é por isso que `mensagem` e
-- `partilha_recebida` ficam de fora.
CREATE OR REPLACE FUNCTION public.aviso_merece_email(p_tipo text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT p_tipo IN ('vinculo_pedido', 'vinculo_aceite', 'consulta_pedida',
                    'consulta_confirmada', 'consulta_cancelada', 'cupao_ganho',
                    'candidatura_decidida')
$$;

CREATE OR REPLACE FUNCTION public.aviso_marca_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.email_estado := CASE WHEN public.aviso_merece_email(NEW.tipo)
                           THEN 'por_enviar' ELSE 'dispensado' END;
  NEW.email_tentativas := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aviso_marca_email ON public.notificacoes;
CREATE TRIGGER aviso_marca_email
  BEFORE INSERT ON public.notificacoes
  FOR EACH ROW EXECUTE FUNCTION public.aviso_marca_email();

-- A política de `notificacoes` deixava o dono escrever em qualquer coluna
-- sua — o que agora inclui a fila. Marcar o próprio aviso como «enviado»
-- fazia o email nunca sair; pôr as tentativas a zero fazia-o sair para
-- sempre. Nenhuma das duas é uma escolha que caiba a quem recebe.
--
-- O mesmo instrumento dos vínculos: grant por coluna. `lida_em` é a única
-- que o dono pode tocar, e um UPDATE que roce na fila falha ao nível do
-- privilégio, antes de a política ser sequer avaliada.
REVOKE UPDATE ON public.notificacoes FROM anon, authenticated;
GRANT UPDATE (lida_em) ON public.notificacoes TO authenticated;

-- A fila só tem trabalho quando tem trabalho: o índice parcial mantém-na
-- pequena mesmo com um histórico grande de avisos já entregues.
CREATE INDEX IF NOT EXISTS notificacoes_email_fila_idx
  ON public.notificacoes (email_em NULLS FIRST, criado_em)
  WHERE email_estado IN ('por_enviar', 'a_enviar');


-- ── Tirar da fila ───────────────────────────────────────────────────
--
-- Reclama as linhas antes de as entregar a quem envia. `SKIP LOCKED` faz
-- com que dois trabalhos a correr ao mesmo tempo não peguem no mesmo aviso
-- — sem isso, um reinício a meio duplicava emails.
--
-- Um `a_enviar` com mais de quinze minutos é um trabalho que morreu a meio:
-- volta à fila. Três tentativas chegam; à quarta, o problema não é passageiro.
CREATE OR REPLACE FUNCTION public.avisos_email_reclamar(p_limite integer DEFAULT 50)
RETURNS TABLE (id uuid, para text, titulo text, corpo text, url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH escolhidas AS (
    SELECT n.id FROM public.notificacoes n
     WHERE (n.email_estado = 'por_enviar'
            OR (n.email_estado = 'a_enviar' AND n.email_em < now() - interval '15 minutes'))
       AND n.email_tentativas < 3
     ORDER BY n.criado_em
     LIMIT greatest(1, least(p_limite, 200))
     FOR UPDATE SKIP LOCKED
  ),
  reclamadas AS (
    UPDATE public.notificacoes n
       SET email_estado = 'a_enviar',
           email_tentativas = n.email_tentativas + 1,
           email_em = now()
      FROM escolhidas e
     WHERE n.id = e.id
    RETURNING n.id, n.user_id, n.titulo, n.corpo, n.url
  )
  SELECT r.id, u.email::text, r.titulo, r.corpo, r.url
    FROM reclamadas r
    JOIN auth.users u ON u.id = r.user_id
   WHERE u.email IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.avisos_email_concluir(
  p_enviados uuid[],
  p_falhados uuid[]
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH ok AS (
    UPDATE public.notificacoes SET email_estado = 'enviado'
     WHERE id = ANY(coalesce(p_enviados, '{}'::uuid[])) RETURNING 1
  )
  UPDATE public.notificacoes
     SET email_estado = CASE WHEN email_tentativas >= 3 THEN 'falhado' ELSE 'por_enviar' END
   WHERE id = ANY(coalesce(p_falhados, '{}'::uuid[]));
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.avisos_email_reclamar(integer)',
    'public.avisos_email_concluir(uuid[], uuid[])'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated, public', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.avisos_email_reclamar(integer) IS
  'Reclama avisos por enviar. Só a chave de serviço lhe chega: devolve endereços de email, que nenhuma outra via da plataforma expõe.';
