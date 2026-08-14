-- 044_conversa_e_avisos.sql
-- ═══════════════════════════════════════════════════════════════════════
--  FALAR E TROCAR
--  ---------------------------------------------------------------------
--  Até aqui, a única comunicação possível entre um cliente e o seu
--  contabilista era o «assunto» de uma consulta e a «nota» de um envio — as
--  duas de sentido único, do cliente para o contabilista. Não havia forma
--  de responder.
--
--  ── Porque é que isto NÃO é o Teams nem o Intercom ──────────────────
--
--  Encostar a conversa a uma ferramenta pronta custaria dinheiro por
--  utilizador (o que escala ao contrário de um plano de 1,99 €/mês), mas o
--  problema decisivo não é o preço: é que a conversa entre um contabilista
--  e o seu cliente É informação fiscal. Mandá-la para a Microsoft ou para
--  a Intercom significa um subprocessador novo, um contrato de tratamento
--  de dados, e uma linha nova na página de privacidade a contradizer a
--  frase que a migração 038 existiu para tornar verdadeira.
--
--  Aqui, a conversa fica sujeita às mesmas políticas do resto: só as duas
--  partes de um vínculo vivo a leem, e ninguém mais — nem outro
--  contabilista, nem a administração.
--
--  ── Anexos ─────────────────────────────────────────────────────────
--
--  Guardar ficheiros de terceiros é uma decisão com consequências, e tem
--  três travões no schema em vez de um aviso na interface: tamanho por
--  ficheiro, número por mensagem, e um balde privado por vínculo.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Quem pode ver uma conversa ───────────────────────────────────
-- Uma função só, usada por todas as políticas: ser parte de um vínculo que
-- não terminou. Repetir o `EXISTS` em cada política seria repetir a regra —
-- e uma regra repetida é uma regra que se corrige em cinco sítios e se
-- esquece no sexto.
CREATE OR REPLACE FUNCTION public.parte_do_vinculo(p_vinculo uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilista_vinculos v
    WHERE v.id = p_vinculo
      AND v.estado IN ('ativo', 'pausado')
      AND (v.cliente_id = p_user OR v.contabilista_id = p_user)
  );
$$;

-- Escrever exige mais do que ler: um vínculo em pausa lê o histórico, mas
-- não recebe mensagens novas.
CREATE OR REPLACE FUNCTION public.parte_do_vinculo_ativo(p_vinculo uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilista_vinculos v
    WHERE v.id = p_vinculo
      AND v.estado = 'ativo'
      AND (v.cliente_id = p_user OR v.contabilista_id = p_user)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.parte_do_vinculo(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.parte_do_vinculo_ativo(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.parte_do_vinculo(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.parte_do_vinculo_ativo(uuid, uuid) TO authenticated;


-- ── 2. Mensagens ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contabilista_mensagens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vinculo_id  uuid NOT NULL REFERENCES public.contabilista_vinculos(id) ON DELETE CASCADE,
  autor_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  corpo       text NOT NULL CHECK (char_length(corpo) BETWEEN 1 AND 4000),
  -- Marcada por quem NÃO escreveu. É o que alimenta o «por ler» do sino.
  lida_em     timestamptz,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mensagens_vinculo_idx
  ON public.contabilista_mensagens (vinculo_id, criado_em DESC);
-- Índice do «quantas tenho por ler»: a pergunta que o sino faz a cada carga.
CREATE INDEX IF NOT EXISTS mensagens_por_ler_idx
  ON public.contabilista_mensagens (vinculo_id, autor_id)
  WHERE lida_em IS NULL;


-- ── 3. Anexos ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contabilista_anexos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id uuid NOT NULL REFERENCES public.contabilista_mensagens(id) ON DELETE CASCADE,
  -- Caminho no balde privado. Nunca um URL: os URLs assinam-se na hora e
  -- expiram; guardar um seria guardar uma chave que não caduca.
  caminho     text NOT NULL,
  nome        text NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 200),
  bytes       integer NOT NULL CHECK (bytes > 0 AND bytes <= 10485760),
  tipo_mime   text NOT NULL,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS anexos_mensagem_idx
  ON public.contabilista_anexos (mensagem_id);

-- Teto de anexos por mensagem. Um limite na interface é uma sugestão; este
-- é uma garantia, e é o que impede uma conversa de encher o armazenamento.
CREATE OR REPLACE FUNCTION public.anexos_teto_por_mensagem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.contabilista_anexos WHERE mensagem_id = NEW.mensagem_id;
  IF n >= 5 THEN
    RAISE EXCEPTION 'Uma mensagem não pode ter mais de 5 anexos.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anexos_teto_por_mensagem() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS anexos_teto ON public.contabilista_anexos;
CREATE TRIGGER anexos_teto
  BEFORE INSERT ON public.contabilista_anexos
  FOR EACH ROW EXECUTE FUNCTION public.anexos_teto_por_mensagem();


-- ── 4. Notificações ─────────────────────────────────────────────────
-- Escritas pelo servidor, lidas pelo dono. O cliente marca como lida e mais
-- nada: se pudesse inserir, o sino passava a ser um canal de qualquer um
-- para qualquer um.
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo       text NOT NULL CHECK (tipo IN (
               'vinculo_pedido', 'vinculo_aceite', 'mensagem',
               'consulta_pedida', 'consulta_confirmada', 'consulta_cancelada',
               'partilha_recebida', 'cupao_ganho', 'candidatura_decidida')),
  titulo     text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 200),
  corpo      text CHECK (corpo IS NULL OR char_length(corpo) <= 500),
  -- Para onde levar quem clica. Caminho interno, nunca um URL absoluto:
  -- uma notificação não pode ser um redirecionamento para fora.
  url        text CHECK (url IS NULL OR url ~ '^/'),
  lida_em    timestamptz,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notificacoes_por_ler_idx
  ON public.notificacoes (user_id, criado_em DESC)
  WHERE lida_em IS NULL;
CREATE INDEX IF NOT EXISTS notificacoes_user_idx
  ON public.notificacoes (user_id, criado_em DESC);


-- ── 5. RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.contabilista_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contabilista_anexos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes           ENABLE ROW LEVEL SECURITY;

-- Mensagens: as duas partes leem; escreve quem está num vínculo ATIVO.
DROP POLICY IF EXISTS "mensagens_partes_leem" ON public.contabilista_mensagens;
CREATE POLICY "mensagens_partes_leem" ON public.contabilista_mensagens
  FOR SELECT TO authenticated
  USING (public.parte_do_vinculo(vinculo_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "mensagens_partes_escrevem" ON public.contabilista_mensagens;
CREATE POLICY "mensagens_partes_escrevem" ON public.contabilista_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND lida_em IS NULL
    AND public.parte_do_vinculo_ativo(vinculo_id, (SELECT auth.uid()))
  );

-- Marcar como lida é do DESTINATÁRIO. `autor_id <> auth.uid()` é o que
-- impede alguém de dar as próprias mensagens por lidas para as esconder da
-- contagem do outro.
DROP POLICY IF EXISTS "mensagens_destinatario_marca_lida" ON public.contabilista_mensagens;
CREATE POLICY "mensagens_destinatario_marca_lida" ON public.contabilista_mensagens
  FOR UPDATE TO authenticated
  USING (
    autor_id <> (SELECT auth.uid())
    AND public.parte_do_vinculo(vinculo_id, (SELECT auth.uid()))
  )
  WITH CHECK (autor_id <> (SELECT auth.uid()));

-- Sem DELETE e sem edição do corpo: uma conversa em que uma das partes
-- reescreve o que disse deixa de servir para o que serve.
REVOKE DELETE ON public.contabilista_mensagens FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.mensagens_corpo_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (NEW.corpo IS DISTINCT FROM OLD.corpo
          OR NEW.autor_id IS DISTINCT FROM OLD.autor_id
          OR NEW.vinculo_id IS DISTINCT FROM OLD.vinculo_id) THEN
    RAISE EXCEPTION 'Uma mensagem enviada não se reescreve.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mensagens_corpo_imutavel() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS mensagens_imutaveis ON public.contabilista_mensagens;
CREATE TRIGGER mensagens_imutaveis
  BEFORE UPDATE ON public.contabilista_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.mensagens_corpo_imutavel();

-- Anexos: seguem a mensagem a que pertencem.
DROP POLICY IF EXISTS "anexos_pela_mensagem" ON public.contabilista_anexos;
CREATE POLICY "anexos_pela_mensagem" ON public.contabilista_anexos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contabilista_mensagens m
    WHERE m.id = mensagem_id
      AND public.parte_do_vinculo(m.vinculo_id, (SELECT auth.uid()))
  ));

DROP POLICY IF EXISTS "anexos_autor_cria" ON public.contabilista_anexos;
CREATE POLICY "anexos_autor_cria" ON public.contabilista_anexos
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contabilista_mensagens m
    WHERE m.id = mensagem_id
      AND m.autor_id = (SELECT auth.uid())
      AND public.parte_do_vinculo_ativo(m.vinculo_id, (SELECT auth.uid()))
  ));

REVOKE UPDATE, DELETE ON public.contabilista_anexos FROM anon, authenticated;

-- Notificações: o dono lê e marca como lida. Ninguém insere pela API.
DROP POLICY IF EXISTS "notificacoes_dono_le" ON public.notificacoes;
CREATE POLICY "notificacoes_dono_le" ON public.notificacoes
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notificacoes_dono_marca" ON public.notificacoes;
CREATE POLICY "notificacoes_dono_marca" ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE INSERT, DELETE ON public.notificacoes FROM anon, authenticated;


-- ── 6. Balde dos anexos ─────────────────────────────────────────────
-- Privado, e organizado por vínculo: o caminho é `<vinculo_id>/<ficheiro>`,
-- e a política pergunta se quem lê é parte desse vínculo. Assim, terminar o
-- acompanhamento fecha também os ficheiros — sem ser preciso apagá-los.
INSERT INTO storage.buckets (id, name, public)
VALUES ('contabilista-anexos', 'contabilista-anexos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anexos_parte_envia" ON storage.objects;
CREATE POLICY "anexos_parte_envia" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contabilista-anexos'
    AND public.parte_do_vinculo_ativo(
      ((storage.foldername(name))[1])::uuid, (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "anexos_parte_le" ON storage.objects;
CREATE POLICY "anexos_parte_le" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contabilista-anexos'
    AND public.parte_do_vinculo(
      ((storage.foldername(name))[1])::uuid, (SELECT auth.uid())
    )
  );


-- ── 7. Realtime ─────────────────────────────────────────────────────
-- Sem isto a conversa só atualiza a recarregar a página. `REPLICA IDENTITY
-- FULL` é o que faz o Postgres mandar a linha inteira no evento.
ALTER TABLE public.contabilista_mensagens REPLICA IDENTITY FULL;
ALTER TABLE public.notificacoes REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.contabilista_mensagens;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;


COMMENT ON TABLE public.contabilista_mensagens IS
  'Conversa entre as duas partes de um vínculo. Imutável depois de enviada. Só as partes a leem — nem outro contabilista, nem a administração.';
COMMENT ON TABLE public.contabilista_anexos IS
  'Ficheiros trocados na conversa. Balde privado por vínculo: terminar o acompanhamento fecha o acesso sem ser preciso apagar nada. Teto de 10 MB por ficheiro e 5 por mensagem, garantidos por CHECK e por gatilho.';
COMMENT ON TABLE public.notificacoes IS
  'Avisos por conta. Escritas pelo servidor; o dono lê e marca como lida. Sem INSERT pela API pública — senão o sino passava a ser um canal de qualquer um para qualquer um.';
