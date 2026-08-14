-- 049_apagar_com_manifesto.sql
-- ═══════════════════════════════════════════════════════════════════════
--  APAGAR PASSA A SER UMA TRANSAÇÃO, COM REGISTO DO QUE SAIU
--  ---------------------------------------------------------------------
--  Fecha RC-08 / P0.7. A rota `/api/conta/apagar` apagava cinco tabelas,
--  uma a uma, com a chave de serviço. Três coisas estavam mal, e a
--  terceira é a pior.
--
--  PRIMEIRA — não era uma transação. Um `DELETE` por tabela, em série. Se
--  o terceiro falhasse, os dois primeiros já tinham ido, e a resposta
--  dizia «Nada foi perdido — tenta de novo». Era falso.
--
--  SEGUNDA — não havia registo. A pessoa recebia «apagadas: 5» e mais
--  nada. Nem ela nem nós conseguíamos dizer, depois, o que tinha saído.
--
--  TERCEIRA, e a que magoa — a lista tinha cinco tabelas. A base de dados
--  tem vinte e oito com dados de pessoas. Quem pedia para ser esquecido
--  ficava com as conversas, as consultas, as partilhas, os cartões de
--  fidelidade, as notificações e a candidatura por apagar. E, se alguma
--  vez tinha escrito uma mensagem ou marcado uma consulta, `auth.users`
--  recusava sair (`ON DELETE RESTRICT` em `contabilista_mensagens.autor_id`
--  e em `agendamentos.cliente_id`) — a conta NÃO era apagada, e a resposta
--  mandava a pessoa contactar-nos.
--
--  Aqui, apagar é uma função: uma transação, na ordem das dependências,
--  com um manifesto imutável do que saiu. Se alguma coisa levantar, não
--  saiu nada.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. O manifesto ──────────────────────────────────────────────────
--
-- Fica depois de a pessoa sair. É a única coisa que fica, e é de propósito:
-- sem ele não há como responder a «o que é que vocês apagaram?».
--
-- Não tem o id do utilizador por acaso — tem-no porque, se a conta for
-- apagada, a chave estrangeira levava o manifesto com ela e ficávamos sem
-- resposta nenhuma. Guarda-se o id em texto, sem referência.
CREATE TABLE IF NOT EXISTS public.conta_apagamentos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Texto, e não uuid com referência: ver acima.
  utilizador  text NOT NULL,
  conjuntos   text[] NOT NULL,
  -- Quantas linhas saíram de cada tabela. Contagens, nunca conteúdo.
  linhas      jsonb NOT NULL DEFAULT '{}'::jsonb,
  ficheiros   text[] NOT NULL DEFAULT '{}',
  apagou_conta boolean NOT NULL DEFAULT false,
  pedido_em   timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz
);

CREATE INDEX IF NOT EXISTS conta_apagamentos_utilizador_idx
  ON public.conta_apagamentos (utilizador, pedido_em DESC);

ALTER TABLE public.conta_apagamentos ENABLE ROW LEVEL SECURITY;

-- Cada pessoa lê os seus. Ninguém escreve à mão: escreve a função.
DROP POLICY IF EXISTS "apagamentos_dono_le" ON public.conta_apagamentos;
CREATE POLICY "apagamentos_dono_le" ON public.conta_apagamentos
  FOR SELECT TO authenticated
  USING (utilizador = (SELECT auth.uid())::text);

REVOKE INSERT, UPDATE, DELETE ON public.conta_apagamentos FROM anon, authenticated;

-- O manifesto não se reescreve. Um registo do que foi apagado que se pode
-- alterar depois não é um registo — é uma alegação.
CREATE OR REPLACE FUNCTION public.manifesto_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Um manifesto de apagamento não se apaga.';
  END IF;
  -- Só a conclusão pode ser preenchida, e só uma vez.
  IF NEW.utilizador IS DISTINCT FROM OLD.utilizador
     OR NEW.conjuntos IS DISTINCT FROM OLD.conjuntos
     OR NEW.linhas    IS DISTINCT FROM OLD.linhas
     OR NEW.ficheiros IS DISTINCT FROM OLD.ficheiros
     OR NEW.pedido_em IS DISTINCT FROM OLD.pedido_em
     OR OLD.concluido_em IS NOT NULL THEN
    RAISE EXCEPTION 'Um manifesto de apagamento não se reescreve.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS manifesto_imutavel ON public.conta_apagamentos;
CREATE TRIGGER manifesto_imutavel
  BEFORE UPDATE OR DELETE ON public.conta_apagamentos
  FOR EACH ROW EXECUTE FUNCTION public.manifesto_imutavel();


-- ── 2. O que existe, antes de se decidir ────────────────────────────
--
-- A zona de perigo mostrava a lista sempre igual, tivesse a pessoa dados
-- ou não. Pedir para apagar coisas que não existem é pedir às cegas.
CREATE OR REPLACE FUNCTION public.inventario_do_utilizador()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  u uuid := auth.uid();
  r jsonb := '{}'::jsonb;
BEGIN
  IF u IS NULL THEN RETURN r; END IF;

  SELECT jsonb_build_object(
    'recibos',      (SELECT count(*) FROM public.recibos WHERE user_id = u),
    'vencimentos',  (SELECT count(*) FROM public.recibos_vencimento WHERE user_id = u),
    'cenarios',     (SELECT count(*) FROM public.cenarios WHERE user_id = u),
    'prazos',       (SELECT count(*) FROM public.prazos_cumpridos WHERE user_id = u),
    'perfil-fiscal',(SELECT count(*) FROM public.profiles
                      WHERE id = u AND preferencias_fiscais IS NOT NULL),
    'quiz',         (SELECT count(*) FROM public.quiz_sessoes WHERE user_id = u)
                  + (SELECT count(*) FROM public.quiz_achievement_progress WHERE user_id = u),
    'quiz-cupoes',  (SELECT count(*) FROM public.quiz_cupoes WHERE user_id = u),
    'partilhas',    (SELECT count(*) FROM public.partilhas WHERE cliente_id = u),
    'conversas',    (SELECT count(*) FROM public.contabilista_mensagens WHERE autor_id = u),
    'consultas',    (SELECT count(*) FROM public.agendamentos WHERE cliente_id = u),
    'fidelidade',   (SELECT count(*) FROM public.fidelidade_cartoes WHERE cliente_id = u),
    'vinculos',     (SELECT count(*) FROM public.contabilista_vinculos WHERE cliente_id = u),
    'perfil-contabilista', (SELECT count(*) FROM public.contabilistas WHERE user_id = u),
    'trabalho',     (SELECT count(*) FROM public.contabilista_tarefas WHERE contabilista_id = u),
    'candidatura',  (SELECT count(*) FROM public.contabilista_pedidos WHERE user_id = u),
    'alertas',      (SELECT count(*) FROM public.alertas_guardiao WHERE user_id = u),
    'notificacoes', (SELECT count(*) FROM public.notificacoes WHERE user_id = u),
    'parcerias',    (SELECT count(*) FROM public.partner_connections WHERE user_id = u),
    'subscricao',   (SELECT count(*) FROM public.subscriptions WHERE user_id = u),
    'feedback',     (SELECT count(*) FROM public.site_feedback WHERE user_id = u)
  ) INTO r;

  RETURN r;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.inventario_do_utilizador() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.inventario_do_utilizador() TO authenticated, service_role;


-- ── 3. Os ficheiros que saem com os dados ───────────────────────────
--
-- Chamada ANTES de apagar as linhas: depois de o vínculo sair, já não há
-- como saber que caminhos lhe pertenciam. Devolver e não apagar é de
-- propósito — quem apaga os bytes é o Storage, do lado da rota.
CREATE OR REPLACE FUNCTION public.ficheiros_do_utilizador(p_conjuntos text[])
RETURNS TABLE (balde text, caminho text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN RETURN; END IF;

  IF 'conversas' = ANY(p_conjuntos) OR 'vinculos' = ANY(p_conjuntos) THEN
    RETURN QUERY
      SELECT 'contabilista-anexos'::text, a.caminho
        FROM public.contabilista_anexos a
        JOIN public.contabilista_mensagens m ON m.id = a.mensagem_id
        JOIN public.contabilista_vinculos v ON v.id = m.vinculo_id
       WHERE v.cliente_id = u OR v.contabilista_id = u;
  END IF;

  IF 'candidatura' = ANY(p_conjuntos) OR 'perfil-contabilista' = ANY(p_conjuntos) THEN
    RETURN QUERY
      SELECT 'contabilista-documentos'::text, o.name
        FROM storage.objects o
       WHERE o.bucket_id = 'contabilista-documentos'
         AND (storage.foldername(o.name))[1] = u::text;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ficheiros_do_utilizador(text[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ficheiros_do_utilizador(text[]) TO authenticated, service_role;


-- ── 4. Apagar ───────────────────────────────────────────────────────
--
-- Uma transação. A ordem é a das dependências, e não a do catálogo: o que
-- pende sai primeiro, senão a chave estrangeira recusa.
--
-- As duas referências `ON DELETE RESTRICT` a `auth.users` — as mensagens e
-- os agendamentos — são a razão pela qual apagar a conta falhava a quem
-- tivesse usado a plataforma. Saem aqui, antes de a conta ser tocada.
CREATE OR REPLACE FUNCTION public.apagar_conjuntos(p_conjuntos text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  u        uuid := auth.uid();
  linhas   jsonb := '{}'::jsonb;
  n        integer;
  quer     boolean;
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  IF p_conjuntos IS NULL OR array_length(p_conjuntos, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nada_escolhido');
  END IF;

  -- Um bloco por conjunto. `quer` evita repetir o `= ANY` em cada linha.

  quer := 'recibos' = ANY(p_conjuntos);
  IF quer THEN
    DELETE FROM public.recibos WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('recibos', n);
  END IF;

  IF 'vencimentos' = ANY(p_conjuntos) THEN
    DELETE FROM public.recibos_vencimento WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('recibos_vencimento', n);
  END IF;

  IF 'cenarios' = ANY(p_conjuntos) THEN
    DELETE FROM public.cenarios WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('cenarios', n);
  END IF;

  IF 'prazos' = ANY(p_conjuntos) THEN
    DELETE FROM public.prazos_cumpridos WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('prazos_cumpridos', n);
  END IF;

  IF 'perfil-fiscal' = ANY(p_conjuntos) THEN
    UPDATE public.profiles SET preferencias_fiscais = NULL WHERE id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('perfil_fiscal', n);
  END IF;

  IF 'quiz' = ANY(p_conjuntos) THEN
    DELETE FROM public.quiz_question_reports WHERE user_id = u;
    DELETE FROM public.quiz_achievement_progress WHERE user_id = u;
    DELETE FROM public.quiz_sessoes WHERE user_id = u;
    DELETE FROM public.quiz_sessions WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT;
    DELETE FROM public.quiz_profiles WHERE id = u;
    linhas := linhas || jsonb_build_object('quiz', n);
  END IF;

  IF 'quiz-cupoes' = ANY(p_conjuntos) THEN
    DELETE FROM public.quiz_cupoes WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('quiz_cupoes', n);
  END IF;

  IF 'partilhas' = ANY(p_conjuntos) THEN
    DELETE FROM public.partilhas WHERE cliente_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('partilhas', n);
  END IF;

  -- As conversas: os anexos e as vagas pendem das mensagens, e saem com
  -- elas em cascata. Apaga as duas pontas — as que escreveu e as que
  -- recebeu — porque uma conversa com metade das falas não é um registo,
  -- é uma confusão para quem ficar com ela.
  IF 'conversas' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_mensagens m
     USING public.contabilista_vinculos v
     WHERE m.vinculo_id = v.id AND (v.cliente_id = u OR v.contabilista_id = u);
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('mensagens', n);
  END IF;

  IF 'consultas' = ANY(p_conjuntos) THEN
    DELETE FROM public.agendamentos WHERE cliente_id = u OR contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('agendamentos', n);
  END IF;

  IF 'fidelidade' = ANY(p_conjuntos) THEN
    DELETE FROM public.fidelidade_cupoes WHERE cliente_id = u;
    DELETE FROM public.fidelidade_cartoes WHERE cliente_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('fidelidade', n);
  END IF;

  IF 'vinculos' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_vinculos WHERE cliente_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('vinculos', n);
  END IF;

  IF 'trabalho' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_tarefas WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('tarefas', n);
  END IF;

  IF 'perfil-contabilista' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_tipos_consulta WHERE contabilista_id = u;
    DELETE FROM public.contabilista_excecoes WHERE contabilista_id = u;
    DELETE FROM public.contabilista_disponibilidade WHERE contabilista_id = u;
    DELETE FROM public.contabilistas WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('contabilista', n);
  END IF;

  IF 'candidatura' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_pedidos WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('candidatura', n);
  END IF;

  IF 'alertas' = ANY(p_conjuntos) THEN
    DELETE FROM public.alertas_guardiao WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('alertas', n);
  END IF;

  IF 'notificacoes' = ANY(p_conjuntos) THEN
    DELETE FROM public.notificacoes WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('notificacoes', n);
  END IF;

  IF 'parcerias' = ANY(p_conjuntos) THEN
    DELETE FROM public.partner_handoffs WHERE user_id = u;
    DELETE FROM public.partner_connections WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('parcerias', n);
  END IF;

  IF 'feedback' = ANY(p_conjuntos) THEN
    DELETE FROM public.site_feedback WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('feedback', n);
  END IF;

  INSERT INTO public.conta_apagamentos (utilizador, conjuntos, linhas, concluido_em)
  VALUES (u::text, p_conjuntos, linhas, now());

  RETURN jsonb_build_object('ok', true, 'linhas', linhas);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apagar_conjuntos(text[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.apagar_conjuntos(text[]) TO authenticated, service_role;


-- ── 5. Tudo, para quando a conta sai ────────────────────────────────
--
-- Chamada pela rota antes de apagar `auth.users`. É a lista completa, e
-- estar aqui — e não na rota — é o que a impede de ficar por atualizar:
-- uma migração que acrescente um conjunto acrescenta-o também aqui.
CREATE OR REPLACE FUNCTION public.conjuntos_todos()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'recibos','vencimentos','cenarios','prazos','perfil-fiscal',
    'quiz','quiz-cupoes',
    'partilhas','conversas','consultas','fidelidade','vinculos',
    'perfil-contabilista','trabalho','candidatura',
    'alertas','notificacoes','parcerias','feedback'
  ]
$$;


COMMENT ON TABLE public.conta_apagamentos IS
  'Manifesto imutável do que foi apagado. Fica depois de a pessoa sair — sem ele não há como responder a «o que é que vocês apagaram?».';
COMMENT ON FUNCTION public.apagar_conjuntos(text[]) IS
  'Uma transação, na ordem das dependências. Antes eram DELETE em série numa rota: falhar a meio deixava metade apagada e a resposta dizia que nada se tinha perdido.';
