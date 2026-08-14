-- 048_storage_endurecido.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O BALDE DEIXA DE ACEITAR O QUE NÃO DEVE
--  ---------------------------------------------------------------------
--  Fecha PR-03. Os dois baldes foram criados só com `public = false`. Tudo
--  o resto — dez megabytes, cinco anexos por mensagem, os tipos aceites —
--  vivia em `conversa.ts`, no browser. Quem falasse diretamente com a API
--  de Storage não passava por nada disso:
--
--    · um ficheiro de dois gigabytes, porque `file_size_limit` era NULL;
--    · um executável anunciado como PDF, porque quem declara o tipo é
--      quem envia e ninguém olhava para os bytes;
--    · quinhentos objetos numa conversa, porque o teto de cinco estava
--      num gatilho da TABELA que descreve os anexos, e não no balde;
--    · um caminho à escolha, porque o nome do objeto vinha do cliente.
--
--  A tabela `contabilista_anexos` tem `bytes <= 10485760`. Não protegia
--  nada: é o cliente que escreve esse número, e o objeto já lá está de
--  qualquer maneira. Uma verificação sobre a linha que DESCREVE o ficheiro
--  não é uma verificação sobre o ficheiro.
--
--  O que passa a valer:
--
--    1. O balde recusa por tamanho e por tipo, no serviço, antes da linha.
--    2. O caminho é escolhido pelo servidor, numa vaga de uso único. Sem
--       vaga aberta com aquele caminho exato, o INSERT não passa.
--    3. O teto de cinco é uma restrição de unicidade sobre o ordinal, e
--       não uma contagem — `count(*)` perde a corrida, uma UNIQUE não.
--    4. Há quem possa apagar, e há como encontrar os órfãos.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Os baldes ganham limites ─────────────────────────────────────
--
-- Dez megabytes é o mesmo número que a interface já mostrava; a diferença
-- é que agora é verdade também para quem não passa pela interface.
--
-- A lista de tipos é curta de propósito. Não está cá `text/html` nem
-- `image/svg+xml`: os dois executam ao serem abertos, e um ficheiro que
-- executa servido do nosso domínio de armazenamento é XSS guardado.
UPDATE storage.buckets
   SET file_size_limit = 10485760,
       allowed_mime_types = ARRAY[
         'application/pdf',
         'image/jpeg', 'image/png', 'image/webp', 'image/heic',
         'text/plain', 'text/csv',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
       ]
 WHERE id IN ('contabilista-anexos', 'contabilista-documentos');


-- ── 2. Vagas de envio ───────────────────────────────────────────────
--
-- Uma vaga é uma autorização para escrever UM objeto, num caminho que o
-- servidor escolheu, durante alguns minutos. É o que tira do cliente as
-- três decisões que ele não devia estar a tomar: onde escrever, quantas
-- vezes, e com que nome.
CREATE TABLE IF NOT EXISTS public.anexo_vagas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id uuid NOT NULL REFERENCES public.contabilista_mensagens(id) ON DELETE CASCADE,
  vinculo_id  uuid NOT NULL REFERENCES public.contabilista_vinculos(id) ON DELETE CASCADE,
  pedida_por  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- O caminho completo do objeto. Gerado, nunca recebido: o nome que a
  -- pessoa deu ao ficheiro guarda-se em `contabilista_anexos.nome`, para
  -- se mostrar, e não vai para o caminho — onde seria um canal para
  -- caracteres que o armazenamento interpreta.
  caminho     text NOT NULL UNIQUE,
  -- 1 a 5. É este número, e não uma contagem, que faz o teto.
  ordinal     smallint NOT NULL CHECK (ordinal BETWEEN 1 AND 5),
  tipo_mime   text NOT NULL,
  bytes_max   integer NOT NULL CHECK (bytes_max > 0 AND bytes_max <= 10485760),
  expira_em   timestamptz NOT NULL,
  usada_em    timestamptz,
  criada_em   timestamptz NOT NULL DEFAULT now()
);

-- O teto de cinco, dito de uma maneira que não se pode perder à corrida.
-- Com `count(*)`, seis pedidos ao mesmo tempo leem todos «tenho quatro» e
-- passam todos. Aqui, o sexto colide.
CREATE UNIQUE INDEX IF NOT EXISTS anexo_vagas_ordinal_idx
  ON public.anexo_vagas (mensagem_id, ordinal);

CREATE INDEX IF NOT EXISTS anexo_vagas_abertas_idx
  ON public.anexo_vagas (expira_em) WHERE usada_em IS NULL;

ALTER TABLE public.anexo_vagas ENABLE ROW LEVEL SECURITY;

-- Quem pediu vê as suas, para saber para onde enviar. Mais ninguém, e
-- ninguém escreve à mão: quem abre vagas é a função abaixo.
DROP POLICY IF EXISTS "vagas_dono_le" ON public.anexo_vagas;
CREATE POLICY "vagas_dono_le" ON public.anexo_vagas
  FOR SELECT TO authenticated
  USING (pedida_por = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.anexo_vagas FROM anon, authenticated;


-- ── 3. Abrir uma vaga ───────────────────────────────────────────────
--
-- Devolve o caminho onde o ficheiro pode ser escrito. O ordinal é o
-- primeiro livre daquela mensagem; se dois pedidos escolherem o mesmo, o
-- índice único faz o segundo perder — e a função tenta o seguinte, em vez
-- de rebentar na cara de quem estava só a anexar um PDF.
CREATE OR REPLACE FUNCTION public.abrir_vaga_de_anexo(
  p_mensagem  uuid,
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
  v_ordinal smallint;
  v_caminho text;
  v_id      uuid;
  v_limite  bigint;
  v_tipos   text[];
BEGIN
  IF v_quem IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  -- A mensagem tem de ser desta pessoa, e o vínculo tem de estar vivo.
  -- Anexar a uma mensagem alheia era escrever dentro da conversa de outro.
  SELECT m.vinculo_id INTO v_vinculo
    FROM public.contabilista_mensagens m
   WHERE m.id = p_mensagem
     AND m.autor_id = v_quem
     AND public.parte_do_vinculo_ativo(m.vinculo_id, v_quem);

  IF v_vinculo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'mensagem_nao_e_tua');
  END IF;

  -- Os mesmos limites do balde, lidos do balde. Escrever os números outra
  -- vez aqui era criar um sítio onde poderiam divergir em silêncio.
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
      -- O caminho começa pelo id do vínculo: é assim que a política do
      -- balde sabe quem pode ler, e é o que faz terminar o acompanhamento
      -- fechar também os ficheiros.
      v_caminho := v_vinculo::text || '/' || p_mensagem::text || '/'
                   || v_ordinal::text || '-' || replace(gen_random_uuid()::text, '-', '');

      INSERT INTO public.anexo_vagas
        (mensagem_id, vinculo_id, pedida_por, caminho, ordinal,
         tipo_mime, bytes_max, expira_em)
      VALUES
        (p_mensagem, v_vinculo, v_quem, v_caminho, v_ordinal,
         p_tipo_mime, p_bytes, now() + interval '15 minutes')
      RETURNING id INTO v_id;

      RETURN jsonb_build_object('ok', true, 'id', v_id, 'caminho', v_caminho,
                                'ordinal', v_ordinal);
    EXCEPTION WHEN unique_violation THEN
      -- Ordinal ocupado. Segue para o próximo.
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', false, 'motivo', 'sem_vagas');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.abrir_vaga_de_anexo(uuid, text, integer)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.abrir_vaga_de_anexo(uuid, text, integer)
  TO authenticated, service_role;


-- ── 4. Sem vaga não se escreve ──────────────────────────────────────
--
-- A política antiga perguntava só «és parte deste vínculo?». Respondendo
-- que sim, escrevia-se onde se quisesse, o que se quisesse, quantas vezes
-- se quisesse. Agora o caminho tem de ser exatamente um que o servidor
-- abriu, ainda por usar e dentro do prazo.
DROP POLICY IF EXISTS "anexos_parte_envia" ON storage.objects;
CREATE POLICY "anexos_parte_envia" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contabilista-anexos'
    AND EXISTS (
      SELECT 1 FROM public.anexo_vagas v
       WHERE v.caminho = storage.objects.name
         AND v.pedida_por = (SELECT auth.uid())
         AND v.usada_em IS NULL
         AND v.expira_em > now()
    )
  );

-- Apagar um anexo era impossível: não havia política nenhuma de DELETE
-- neste balde, nem para quem o tinha enviado. Um ficheiro trocado ficava
-- lá para sempre.
DROP POLICY IF EXISTS "anexos_autor_apaga" ON storage.objects;
CREATE POLICY "anexos_autor_apaga" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'contabilista-anexos'
    AND EXISTS (
      SELECT 1 FROM public.anexo_vagas v
       WHERE v.caminho = storage.objects.name
         AND v.pedida_por = (SELECT auth.uid())
         AND public.parte_do_vinculo_ativo(v.vinculo_id, (SELECT auth.uid()))
    )
  );


-- ── 5. Fechar a vaga ────────────────────────────────────────────────
--
-- Chamada pelo servidor depois de olhar para os bytes do objeto. É aqui
-- que a linha do anexo nasce — e não antes, para não existir uma linha a
-- apontar para conteúdo que ninguém verificou.
CREATE OR REPLACE FUNCTION public.fechar_vaga_de_anexo(
  p_vaga  uuid,
  p_nome  text,
  p_bytes integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_vaga record;
BEGIN
  UPDATE public.anexo_vagas v
     SET usada_em = now()
   WHERE v.id = p_vaga
     AND v.usada_em IS NULL
     AND v.expira_em > now()
  RETURNING v.* INTO v_vaga;

  IF v_vaga.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'vaga_fechada_ou_expirada');
  END IF;

  IF p_bytes > v_vaga.bytes_max THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'maior_do_que_o_anunciado');
  END IF;

  INSERT INTO public.contabilista_anexos
    (mensagem_id, caminho, nome, bytes, tipo_mime)
  VALUES
    (v_vaga.mensagem_id, v_vaga.caminho, left(p_nome, 200), p_bytes, v_vaga.tipo_mime);

  RETURN jsonb_build_object('ok', true, 'caminho', v_vaga.caminho);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fechar_vaga_de_anexo(uuid, text, integer)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fechar_vaga_de_anexo(uuid, text, integer)
  TO service_role;

-- A linha do anexo deixa de poder ser escrita pelo cliente. Enquanto podia,
-- inventava-se um `caminho`, um `bytes` e um `tipo_mime` sem que existisse
-- objeto nenhum — ou existindo um completamente diferente.
REVOKE INSERT, UPDATE ON public.contabilista_anexos FROM anon, authenticated;


-- ── 6. Órfãos ───────────────────────────────────────────────────────
--
-- Um objeto sem linha que o descreva. Nascem de um envio que morre a meio
-- (a vaga abriu, o ficheiro subiu, o browser fechou-se antes de fechar a
-- vaga) e de vagas que expiram por usar. Ninguém os vê e ninguém os conta
-- — ocupam o plano em silêncio até alguém reparar na fatura.
CREATE OR REPLACE FUNCTION public.purgar_anexos_orfaos(p_idade interval DEFAULT '2 hours')
RETURNS TABLE (caminho text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM storage.objects o
   WHERE o.bucket_id = 'contabilista-anexos'
     AND o.created_at < now() - p_idade
     AND NOT EXISTS (
       SELECT 1 FROM public.contabilista_anexos a WHERE a.caminho = o.name
     )
  RETURNING o.name;
$$;

REVOKE EXECUTE ON FUNCTION public.purgar_anexos_orfaos(interval)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.purgar_anexos_orfaos(interval) TO service_role;

-- As vagas gastas e as que expiraram por usar não têm de ficar. As gastas
-- guardam-se um mês porque são o que liga um caminho a quem o enviou.
CREATE OR REPLACE FUNCTION public.purgar_vagas_velhas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_n integer;
BEGIN
  DELETE FROM public.anexo_vagas
   WHERE (usada_em IS NULL AND expira_em < now() - interval '1 day')
      OR (usada_em IS NOT NULL AND usada_em < now() - interval '30 days'
          AND NOT EXISTS (SELECT 1 FROM public.contabilista_anexos a
                           WHERE a.caminho = anexo_vagas.caminho));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purgar_vagas_velhas() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.purgar_vagas_velhas() TO service_role;


COMMENT ON TABLE public.anexo_vagas IS
  'Autorização para escrever UM objeto, num caminho escolhido pelo servidor. Tira do cliente as três decisões que não lhe cabiam: onde escrever, quantas vezes, e com que nome.';
COMMENT ON FUNCTION public.abrir_vaga_de_anexo(uuid, text, integer) IS
  'O teto de cinco anexos é o índice único sobre (mensagem_id, ordinal), e não uma contagem: com count(*), seis pedidos simultâneos leem todos o mesmo e passam todos.';
