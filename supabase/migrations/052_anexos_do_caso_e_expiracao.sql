-- 052_anexos_do_caso_e_expiracao.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O QUE FALTAVA À INTERMEDIAÇÃO
--  ---------------------------------------------------------------------
--  Três coisas, e as três estavam declaradas mas por ligar:
--
--   1. ANEXOS. `caso_documentos` e `proposta_anexos` existem desde a 051,
--      mas nada os escrevia — e escrevê-los por REST era a mesma porta que
--      a migração 048 fechou para os anexos da conversa. As vagas de uso
--      único passam a servir os três sítios, em vez de haver três
--      mecanismos parecidos e um deles mais fraco.
--
--   2. EXPIRAÇÃO. Uma proposta tem `validade_ate`, e `decidir_proposta`
--      recusa depois dela. Mas ninguém mudava o estado: a lista mostrava
--      «à espera da tua decisão» sobre uma proposta que já não se podia
--      aceitar. Dizer a verdade tarde é melhor do que nunca; dizê-la a
--      tempo é o que se quer.
--
--   3. TEMPO REAL. A conversa mediada só se atualizava a recarregar. Numa
--      conversa com revisão pelo meio isso é pior do que num chat: a
--      pessoa fica sem saber se a mensagem foi aprovada, e recarrega à
--      espera de uma resposta que já lá está.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Uma vaga serve três sítios ───────────────────────────────────
--
-- `anexo_vagas` era só para as mensagens da conversa. Passa a poder
-- pertencer também a um caso ou a uma proposta — e exatamente a um dos
-- três, o que a restrição garante e nenhum código precisa de lembrar.
ALTER TABLE public.anexo_vagas
  ADD COLUMN IF NOT EXISTS caso_id     uuid REFERENCES public.casos(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS proposta_id uuid REFERENCES public.propostas(id) ON DELETE CASCADE;

ALTER TABLE public.anexo_vagas ALTER COLUMN mensagem_id DROP NOT NULL;
ALTER TABLE public.anexo_vagas ALTER COLUMN vinculo_id  DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'anexo_vagas_um_dono_ck') THEN
    ALTER TABLE public.anexo_vagas ADD CONSTRAINT anexo_vagas_um_dono_ck CHECK (
      (mensagem_id IS NOT NULL)::int
      + (caso_id IS NOT NULL)::int
      + (proposta_id IS NOT NULL)::int = 1
    );
  END IF;
END $$;

-- O teto de cinco, agora por cada um dos três donos. Eram um índice único
-- sobre (mensagem_id, ordinal); passam a ser três parciais, porque uma
-- coluna nula não colide com outra coluna nula.
DROP INDEX IF EXISTS public.anexo_vagas_ordinal_idx;
CREATE UNIQUE INDEX IF NOT EXISTS anexo_vagas_ordinal_msg_idx
  ON public.anexo_vagas (mensagem_id, ordinal) WHERE mensagem_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS anexo_vagas_ordinal_caso_idx
  ON public.anexo_vagas (caso_id, ordinal) WHERE caso_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS anexo_vagas_ordinal_prop_idx
  ON public.anexo_vagas (proposta_id, ordinal) WHERE proposta_id IS NOT NULL;


-- ── 2. Abrir uma vaga, seja para o que for ──────────────────────────
--
-- Uma função só. Três funções parecidas seriam três sítios onde os
-- limites poderiam divergir — e o que diverge primeiro é sempre o que se
-- copiou por último.
CREATE OR REPLACE FUNCTION public.abrir_vaga(
  p_contexto  text,          -- 'mensagem' | 'caso' | 'proposta'
  p_alvo      uuid,
  p_tipo_mime text,
  p_bytes     integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_quem    uuid := auth.uid();
  v_vinculo uuid;
  v_caso    uuid;
  v_pasta   text;
  v_ordinal smallint;
  v_caminho text;
  v_id      uuid;
  v_limite  bigint;
  v_tipos   text[];
BEGIN
  IF v_quem IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  IF p_contexto NOT IN ('mensagem', 'caso', 'proposta') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'contexto_invalido');
  END IF;

  -- Quem pode anexar a quê. Cada resposta é uma pergunta diferente, e é
  -- por isso que estão aqui e não numa política genérica.
  IF p_contexto = 'mensagem' THEN
    SELECT m.vinculo_id INTO v_vinculo
      FROM public.contabilista_mensagens m
     WHERE m.id = p_alvo AND m.autor_id = v_quem
       AND public.parte_do_vinculo_ativo(m.vinculo_id, v_quem);
    IF v_vinculo IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'mensagem_nao_e_tua');
    END IF;
    v_pasta := v_vinculo::text || '/' || p_alvo::text;

  ELSIF p_contexto = 'caso' THEN
    -- Só quem descreveu o caso lhe anexa documentos, e só enquanto ele
    -- estiver vivo: anexar a um caso fechado não chega a ninguém.
    SELECT c.id INTO v_caso FROM public.casos c
     WHERE c.id = p_alvo AND c.cliente_id = v_quem
       AND c.estado NOT IN ('fechado', 'recusado');
    IF v_caso IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'caso_nao_e_teu');
    END IF;
    v_pasta := 'casos/' || v_caso::text;

  ELSE
    SELECT p.caso_id INTO v_caso FROM public.propostas p
     WHERE p.id = p_alvo AND p.contabilista_id = v_quem
       -- Depois de decidida, a proposta é um documento fechado. Juntar-lhe
       -- um contrato a seguir mudava o que foi aceite.
       AND p.estado IN ('enviada', 'lida');
    IF v_caso IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'proposta_nao_e_tua');
    END IF;
    v_pasta := 'casos/' || v_caso::text || '/propostas/' || p_alvo::text;
  END IF;

  SELECT b.file_size_limit, b.allowed_mime_types INTO v_limite, v_tipos
    FROM storage.buckets b WHERE b.id = 'contabilista-anexos';

  IF p_bytes IS NULL OR p_bytes <= 0 OR p_bytes > coalesce(v_limite, 10485760) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'tamanho_recusado');
  END IF;
  IF v_tipos IS NOT NULL AND NOT (p_tipo_mime = ANY(v_tipos)) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'tipo_recusado');
  END IF;

  FOR v_ordinal IN 1..5 LOOP
    BEGIN
      v_caminho := v_pasta || '/' || v_ordinal::text || '-'
                   || replace(gen_random_uuid()::text, '-', '');

      INSERT INTO public.anexo_vagas
        (mensagem_id, caso_id, proposta_id, vinculo_id, pedida_por,
         caminho, ordinal, tipo_mime, bytes_max, expira_em)
      VALUES
        (CASE WHEN p_contexto = 'mensagem' THEN p_alvo END,
         CASE WHEN p_contexto = 'caso'     THEN p_alvo END,
         CASE WHEN p_contexto = 'proposta' THEN p_alvo END,
         v_vinculo, v_quem,
         v_caminho, v_ordinal, p_tipo_mime, p_bytes, now() + interval '15 minutes')
      RETURNING id INTO v_id;

      RETURN jsonb_build_object('ok', true, 'id', v_id, 'caminho', v_caminho,
                                'ordinal', v_ordinal);
    EXCEPTION WHEN unique_violation THEN
      NULL;  -- ordinal ocupado; segue para o próximo
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', false, 'motivo', 'sem_vagas');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.abrir_vaga(text, uuid, text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.abrir_vaga(text, uuid, text, integer)
  TO authenticated, service_role;

-- A função antiga passa a ser um atalho para a nova. Mantê-la evita mudar
-- a rota que já a chama, e ter DUAS implementações era o que se queria
-- evitar — esta não tem nenhuma.
CREATE OR REPLACE FUNCTION public.abrir_vaga_de_anexo(
  p_mensagem uuid, p_tipo_mime text, p_bytes integer
)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.abrir_vaga('mensagem', p_mensagem, p_tipo_mime, p_bytes) $$;


-- ── 3. Fechar a vaga, escrevendo na tabela certa ────────────────────
CREATE OR REPLACE FUNCTION public.fechar_vaga(
  p_vaga uuid, p_nome text, p_bytes integer, p_e_contrato boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v record;
BEGIN
  UPDATE public.anexo_vagas a
     SET usada_em = now()
   WHERE a.id = p_vaga AND a.usada_em IS NULL AND a.expira_em > now()
  RETURNING a.* INTO v;

  IF v.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'vaga_fechada_ou_expirada');
  END IF;
  IF p_bytes > v.bytes_max THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'maior_do_que_o_anunciado');
  END IF;

  IF v.mensagem_id IS NOT NULL THEN
    INSERT INTO public.contabilista_anexos (mensagem_id, caminho, nome, bytes, tipo_mime)
    VALUES (v.mensagem_id, v.caminho, left(p_nome, 200), p_bytes, v.tipo_mime);

  ELSIF v.caso_id IS NOT NULL THEN
    -- Nasce por libertar. Um documento que o cliente anexou pode ter o
    -- nome dele lá dentro, e quem decide se segue é quem faz a triagem.
    INSERT INTO public.caso_documentos (caso_id, caminho, nome, bytes, tipo_mime)
    VALUES (v.caso_id, v.caminho, left(p_nome, 200), p_bytes, v.tipo_mime);

  ELSE
    INSERT INTO public.proposta_anexos
      (proposta_id, caminho, nome, bytes, tipo_mime, e_contrato)
    VALUES (v.proposta_id, v.caminho, left(p_nome, 200), p_bytes, v.tipo_mime,
            coalesce(p_e_contrato, false));
  END IF;

  RETURN jsonb_build_object('ok', true, 'caminho', v.caminho);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fechar_vaga(uuid, text, integer, boolean)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fechar_vaga(uuid, text, integer, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.fechar_vaga_de_anexo(
  p_vaga uuid, p_nome text, p_bytes integer
)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.fechar_vaga(p_vaga, p_nome, p_bytes, false) $$;

REVOKE EXECUTE ON FUNCTION public.fechar_vaga_de_anexo(uuid, text, integer)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fechar_vaga_de_anexo(uuid, text, integer) TO service_role;


-- ── 4. Libertar um documento ────────────────────────────────────────
--
-- A administração vê o documento e decide se segue. É o mesmo princípio
-- da revisão das mensagens: nada passa de um lado para o outro sem que
-- alguém tenha olhado.
CREATE OR REPLACE FUNCTION public.libertar_documento(p_documento uuid, p_libertar boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE u uuid := auth.uid(); v_id uuid; v_caso uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'so_a_administracao');
  END IF;

  UPDATE public.caso_documentos d
     SET libertado_em = CASE WHEN p_libertar THEN now() ELSE NULL END
   WHERE d.id = p_documento
  RETURNING d.id, d.caso_id INTO v_id, v_caso;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'inexistente');
  END IF;

  INSERT INTO public.admin_auditoria (ator_id, acao, alvo_id, detalhe)
  VALUES (u, 'documento_do_caso_libertado', v_id,
          jsonb_build_object('caso', v_caso, 'libertado', p_libertar));

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.libertar_documento(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.libertar_documento(uuid, boolean)
  TO authenticated, service_role;


-- ── 5. Descarregar também estes ─────────────────────────────────────
--
-- `anexo_legivel` só conhecia os anexos da conversa. Um documento de caso
-- ou um contrato de proposta não tinham por onde ser abertos — e a
-- alternativa era abrir o balde ao browser, que é o que a 050 fechou.
CREATE OR REPLACE FUNCTION public.anexo_legivel(p_caminho text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
DECLARE
  u uuid := auth.uid();
  v record;
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  -- Anexo de uma conversa.
  SELECT a.nome, a.tipo_mime, m.vinculo_id
    INTO v
    FROM public.contabilista_anexos a
    JOIN public.contabilista_mensagens m ON m.id = a.mensagem_id
   WHERE a.caminho = p_caminho;
  IF v.vinculo_id IS NOT NULL THEN
    IF NOT public.parte_do_vinculo(v.vinculo_id, u) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'sem_acesso');
    END IF;
    RETURN jsonb_build_object('ok', true, 'nome', v.nome, 'tipo', v.tipo_mime);
  END IF;

  -- Documento de um caso. O contabilista só chega ao que foi libertado.
  DECLARE d record;
  BEGIN
    SELECT dd.nome, dd.tipo_mime, dd.caso_id, dd.libertado_em INTO d
      FROM public.caso_documentos dd WHERE dd.caminho = p_caminho;
    IF d.caso_id IS NOT NULL THEN
      IF public.dono_do_caso(d.caso_id, u) OR public.is_admin()
         OR (d.libertado_em IS NOT NULL AND public.encaminhado_para(d.caso_id, u)) THEN
        RETURN jsonb_build_object('ok', true, 'nome', d.nome, 'tipo', d.tipo_mime);
      END IF;
      RETURN jsonb_build_object('ok', false, 'motivo', 'sem_acesso');
    END IF;
  END;

  -- Anexo de uma proposta: quem a enviou e quem a recebeu.
  DECLARE pa record;
  BEGIN
    SELECT aa.nome, aa.tipo_mime, p.caso_id, p.contabilista_id INTO pa
      FROM public.proposta_anexos aa
      JOIN public.propostas p ON p.id = aa.proposta_id
     WHERE aa.caminho = p_caminho;
    IF pa.caso_id IS NOT NULL THEN
      IF pa.contabilista_id = u OR public.dono_do_caso(pa.caso_id, u) OR public.is_admin() THEN
        RETURN jsonb_build_object('ok', true, 'nome', pa.nome, 'tipo', pa.tipo_mime);
      END IF;
      RETURN jsonb_build_object('ok', false, 'motivo', 'sem_acesso');
    END IF;
  END;

  RETURN jsonb_build_object('ok', false, 'motivo', 'inexistente');
END;
$$;


-- ── 6. Propostas que passaram da validade ───────────────────────────
--
-- `decidir_proposta` já recusava depois da validade. O que faltava era a
-- lista deixar de dizer «à espera da tua decisão» sobre algo que já não se
-- podia aceitar — uma interface que promete o que o servidor recusa.
CREATE OR REPLACE FUNCTION public.expirar_propostas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE n integer;
BEGIN
  UPDATE public.propostas
     SET estado = 'expirada', decidida_em = now()
   WHERE estado IN ('enviada', 'lida')
     AND validade_ate IS NOT NULL
     AND validade_ate < current_date;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expirar_propostas() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.expirar_propostas() TO service_role;

-- Uma proposta expirada não é uma proposta reescrita: o gatilho de
-- imutabilidade deixa passar a mudança de estado, e nada mais.


-- ── 7. A conversa mediada em tempo real ─────────────────────────────
--
-- Numa conversa com revisão pelo meio, não ver a mudança é pior do que num
-- chat: a pessoa fica sem saber se a mensagem foi aprovada, e recarrega à
-- espera de uma resposta que já lá está.
ALTER TABLE public.caso_mensagens REPLICA IDENTITY FULL;
ALTER TABLE public.propostas      REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                    WHERE pubname = 'supabase_realtime'
                      AND schemaname = 'public' AND tablename = 'caso_mensagens') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.caso_mensagens;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                    WHERE pubname = 'supabase_realtime'
                      AND schemaname = 'public' AND tablename = 'propostas') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.propostas;
    END IF;
  END IF;
END $$;


COMMENT ON FUNCTION public.abrir_vaga(text, uuid, text, integer) IS
  'Uma função para os três sítios que aceitam ficheiros. Três funções parecidas seriam três sítios onde os limites poderiam divergir.';
COMMENT ON FUNCTION public.expirar_propostas() IS
  'Fecha o que passou da validade. `decidir_proposta` já recusava; o que faltava era a lista deixar de prometer o que o servidor recusa.';
