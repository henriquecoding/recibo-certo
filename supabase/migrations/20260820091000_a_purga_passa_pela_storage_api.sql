-- 20260820091000_a_purga_passa_pela_storage_api.sql
-- ═══════════════════════════════════════════════════════════════════════
--  A PURGA DE ÓRFÃOS DEIXA DE MENTIR (E DEIXA DE PODER APAGAR O QUE NÃO É)
--  ---------------------------------------------------------------------
--  Duas coisas erradas no mesmo sítio, e a primeira estava a esconder a
--  segunda.
--
--  ── (A) A PURGA NUNCA CORREU ────────────────────────────────────────
--
--  `purgar_anexos_orfaos` faz `DELETE FROM storage.objects`. O Supabase
--  recusa:
--
--    «Direct deletion from storage tables is not allowed.
--     Use the Storage API instead.»
--
--  Nos logs de produção isso repete-se todos os dias. O cron devolve 500,
--  os bytes ficam, e a retenção prometida na página de privacidade é uma
--  frase sem nada por trás. Um órfão nunca foi apagado — nem um.
--
--  ── (B) SE TIVESSE CORRIDO, TERIA APAGADO DOCUMENTOS VIVOS ──────────
--
--  ⚠️ Esta é a mais grave das duas, e só se vê depois de a primeira
--  estar corrigida.
--
--  A definição de órfão era «objeto em `contabilista-anexos` sem linha em
--  `contabilista_anexos`». Mas o balde não é só das mensagens: desde a
--  051/052, os documentos dos CASOS (`caso_documentos`) e os anexos das
--  PROPOSTAS (`proposta_anexos`) vivem no mesmo balde, em `casos/…`.
--
--  Nenhum deles tem linha em `contabilista_anexos`. Todos passavam no
--  teste de «órfão» duas horas depois de serem enviados. O primeiro
--  deploy que corrigisse só o (A) teria apagado, no dia seguinte, todos
--  os contratos e documentos de casos da plataforma.
--
--  ---------------------------------------------------------------------
--  O QUE PASSA A ACONTECER
--
--  A base de dados deixa de apagar bytes — não pode, e fingir que podia
--  era o defeito. Passa a fazer o que sabe fazer: identificar candidatos,
--  reservá-los para um executor de cada vez, e confirmar a remoção só
--  depois de o objeto ter REALMENTE desaparecido.
--
--    1. `reservar_anexos_orfaos()`  → deteta, regista e reserva um lote
--    2. a rota cron                 → `storage.remove(caminhos)`
--    3. `fechar_purga_de_anexos()`  → confirma contra `storage.objects`
--
--  O passo 3 é o que impede a metadata de dizer «apagado» sobre um objeto
--  que ainda existe: ele não acredita na rota, verifica.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
--  1. O REGISTO DA PURGA
-- ═══════════════════════════════════════════════════════════════════
--  Sem isto, a purga é uma operação sem memória: uma falha a meio não se
--  distingue de um começo, duas execuções em paralelo pedem ao Storage
--  para apagar as mesmas coisas, e ninguém consegue responder a «quantos
--  ficaram para trás?» — que é a pergunta que dá o alarme.
CREATE TABLE IF NOT EXISTS public.anexo_purgas (
  balde         text        NOT NULL,
  caminho       text        NOT NULL,
  detetado_em   timestamptz NOT NULL DEFAULT now(),
  --  A reserva é um prazo, não uma tranca. Um executor que morra a meio
  --  não deixa o caminho preso para sempre: passado o prazo, o caminho
  --  volta a estar disponível para a execução seguinte.
  reservado_ate timestamptz,
  tentativas    integer     NOT NULL DEFAULT 0,
  removido_em   timestamptz,
  ultimo_erro   text,
  PRIMARY KEY (balde, caminho)
);

COMMENT ON TABLE public.anexo_purgas IS
  'Fila de objetos órfãos por remover do Storage. A base de dados não apaga bytes — regista, reserva e confirma. `removido_em` só é escrito depois de o objeto ter desaparecido de storage.objects.';

--  A fila de trabalho: por remover, não reservado, mais antigo primeiro.
CREATE INDEX IF NOT EXISTS anexo_purgas_por_fazer_idx
  ON public.anexo_purgas (detetado_em)
  WHERE removido_em IS NULL;

ALTER TABLE public.anexo_purgas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.anexo_purgas FROM anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
--  2. O QUE É, E O QUE NÃO É, UM ÓRFÃO
-- ═══════════════════════════════════════════════════════════════════
--  Uma função só para isto, e não uma cláusula dentro da purga: é a
--  definição mais perigosa de todo o sistema de ficheiros, e tem de ser
--  legível, testável e citável a partir de um sítio só.
--
--  Um objeto é órfão quando NENHUMA das quatro coisas o reclama:
--   · uma mensagem (`contabilista_anexos`);
--   · um caso (`caso_documentos`);
--   · uma proposta (`proposta_anexos`);
--   · uma vaga de envio ainda por fechar.
--
--  A vaga entra na lista porque um envio a decorrer tem objeto e ainda
--  não tem linha. A tolerância de duas horas já o protegia, mas fazer a
--  proteção depender de um intervalo é fazê-la depender de quem o
--  configura.
CREATE OR REPLACE FUNCTION public.anexo_e_orfao(p_balde text, p_caminho text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_balde = 'contabilista-anexos'
     AND NOT EXISTS (SELECT 1 FROM public.contabilista_anexos a WHERE a.caminho = p_caminho)
     AND NOT EXISTS (SELECT 1 FROM public.caso_documentos      d WHERE d.caminho = p_caminho)
     AND NOT EXISTS (SELECT 1 FROM public.proposta_anexos      x WHERE x.caminho = p_caminho)
     AND NOT EXISTS (SELECT 1 FROM public.anexo_vagas          v
                      WHERE v.caminho = p_caminho AND v.usada_em IS NULL AND v.expira_em > now());
$$;

REVOKE EXECUTE ON FUNCTION public.anexo_e_orfao(text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.anexo_e_orfao(text, text) TO service_role;

COMMENT ON FUNCTION public.anexo_e_orfao(text, text) IS
  '⚠️ A definição de órfão. O balde `contabilista-anexos` serve mensagens, casos E propostas — a versão anterior só conhecia as mensagens, e teria apagado todos os documentos de casos e contratos da plataforma. Uma tabela nova que guarde caminhos TEM de ser acrescentada aqui.';

-- ═══════════════════════════════════════════════════════════════════
--  3. DETETAR E RESERVAR
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.reservar_anexos_orfaos(
  p_idade  interval DEFAULT '2 hours',
  p_limite integer  DEFAULT 200,
  p_reserva interval DEFAULT '10 minutes'
)
RETURNS TABLE (balde text, caminho text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
--  ⚠️ `RETURNS TABLE (balde, caminho)` declara duas VARIÁVEIS PL/pgSQL com
--  o nome de duas colunas desta tabela. Sem esta diretiva, qualquer
--  referência não qualificada — o `ON CONFLICT (balde, caminho)` abaixo,
--  por exemplo — falha com «column reference is ambiguous», e a função
--  nem chega a correr.
#variable_conflict use_column
BEGIN
  --  Os que já foram removidos há muito saem do registo. Guardam-se 30
  --  dias porque são a prova de que a retenção foi cumprida.
  DELETE FROM public.anexo_purgas
   WHERE removido_em IS NOT NULL AND removido_em < now() - interval '30 days';

  --  Detetar. `ON CONFLICT DO NOTHING` porque um caminho já em fila não
  --  volta ao início da fila só por ainda lá estar.
  INSERT INTO public.anexo_purgas (balde, caminho)
  SELECT o.bucket_id, o.name
    FROM storage.objects o
   WHERE o.bucket_id = 'contabilista-anexos'
     AND o.created_at < now() - p_idade
     AND public.anexo_e_orfao(o.bucket_id, o.name)
  ON CONFLICT (balde, caminho) DO NOTHING;

  --  Reservar um lote. `SKIP LOCKED` é o que torna duas execuções
  --  simultâneas inofensivas: a segunda salta o que a primeira já tem, em
  --  vez de esperar por ela ou de pedir ao Storage a mesma remoção.
  --  ⚠️ As colunas do lote são renomeadas (`l_balde`, `l_caminho`) porque
  --  `RETURNS TABLE (balde, caminho)` declara duas VARIÁVEIS PL/pgSQL com
  --  esses nomes. Um `lote.balde` ao lado delas dá «column reference is
  --  ambiguous» e a função nem chega a correr.
  RETURN QUERY
  WITH lote AS (
    SELECT p.balde AS l_balde, p.caminho AS l_caminho
      FROM public.anexo_purgas p
     WHERE p.removido_em IS NULL
       AND (p.reservado_ate IS NULL OR p.reservado_ate < now())
     ORDER BY p.detetado_em
     LIMIT greatest(1, least(coalesce(p_limite, 200), 1000))
       FOR UPDATE SKIP LOCKED
  )
  UPDATE public.anexo_purgas p
     SET reservado_ate = now() + p_reserva,
         tentativas    = p.tentativas + 1
    FROM lote
   WHERE p.balde = lote.l_balde AND p.caminho = lote.l_caminho
  RETURNING p.balde, p.caminho;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reservar_anexos_orfaos(interval, integer, interval)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.reservar_anexos_orfaos(interval, integer, interval)
  TO service_role;

-- ═══════════════════════════════════════════════════════════════════
--  4. CONFIRMAR — contra o Storage, não contra a palavra de quem chama
-- ═══════════════════════════════════════════════════════════════════
--  ⚠️ Esta função NÃO acredita no executor. Recebe os caminhos que ele
--  diz ter mandado apagar e vai VER se o objeto desapareceu. Sem isto, um
--  `remove()` que falha em silêncio para metade do lote deixava a
--  metadata a afirmar «apagado» sobre bytes que continuam lá — e essa
--  mentira é pior do que o backlog, porque ninguém a procura.
CREATE OR REPLACE FUNCTION public.fechar_purga_de_anexos(
  p_caminhos text[],
  p_erro     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_removidos integer; v_pendentes integer;
BEGIN
  IF p_caminhos IS NULL OR array_length(p_caminhos, 1) IS NULL THEN
    RETURN jsonb_build_object('removidos', 0, 'pendentes', 0);
  END IF;

  UPDATE public.anexo_purgas p
     SET removido_em   = now(),
         reservado_ate = NULL,
         ultimo_erro   = NULL
   WHERE p.caminho = ANY (p_caminhos)
     AND p.removido_em IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM storage.objects o
        WHERE o.bucket_id = p.balde AND o.name = p.caminho
     );
  GET DIAGNOSTICS v_removidos = ROW_COUNT;

  --  O que sobrou continua lá. Larga-se a reserva para a execução
  --  seguinte poder tentar, e guarda-se o motivo para o alarme ter o que
  --  dizer.
  UPDATE public.anexo_purgas p
     SET reservado_ate = NULL,
         ultimo_erro   = coalesce(p_erro, 'o objeto continuava em storage.objects')
   WHERE p.caminho = ANY (p_caminhos)
     AND p.removido_em IS NULL;
  GET DIAGNOSTICS v_pendentes = ROW_COUNT;

  RETURN jsonb_build_object('removidos', v_removidos, 'pendentes', v_pendentes);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fechar_purga_de_anexos(text[], text)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fechar_purga_de_anexos(text[], text) TO service_role;

-- ═══════════════════════════════════════════════════════════════════
--  5. O ESTADO DA PURGA — para haver alarme, e não só logs
-- ═══════════════════════════════════════════════════════════════════
--  «Falhou» é um evento; «falha há seis dias e a fila cresce» é um
--  problema. A diferença entre os dois é esta função.
CREATE OR REPLACE FUNCTION public.estado_da_purga_de_anexos()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'pendentes',      count(*) FILTER (WHERE removido_em IS NULL),
    'reservados',     count(*) FILTER (WHERE removido_em IS NULL AND reservado_ate > now()),
    'teimosos',       count(*) FILTER (WHERE removido_em IS NULL AND tentativas >= 3),
    'mais_antigo_h',  coalesce(
                        round(extract(epoch FROM now() - min(detetado_em)
                          FILTER (WHERE removido_em IS NULL)) / 3600)::int, 0),
    'removidos_24h',  count(*) FILTER (WHERE removido_em > now() - interval '24 hours')
  )
  FROM public.anexo_purgas;
$$;

REVOKE EXECUTE ON FUNCTION public.estado_da_purga_de_anexos() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.estado_da_purga_de_anexos() TO service_role;

-- ═══════════════════════════════════════════════════════════════════
--  6. A FUNÇÃO ANTIGA SAI
-- ═══════════════════════════════════════════════════════════════════
--  Não fica depreciada: fica FORA. Enquanto existir, é a que aparece a
--  quem procurar «purgar órfãos» — e é a que não funciona e apagaria o
--  que não devia.
DROP FUNCTION IF EXISTS public.purgar_anexos_orfaos(interval);

-- ═══════════════════════════════════════════════════════════════════
--  7. O MANIFESTO DE APAGAR CONTA CONHECE OS CASOS
-- ═══════════════════════════════════════════════════════════════════
--  `ficheiros_do_utilizador` devolvia os anexos das mensagens e os
--  documentos da candidatura. Os documentos dos casos e os anexos das
--  propostas ficavam de fora — apagar a conta declarava o ficheiro
--  apagado e os bytes ficavam no balde. A rota já usa a Storage API; o
--  que faltava era a lista.
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

  IF 'casos' = ANY(p_conjuntos) THEN
    --  Os documentos que a pessoa anexou ao caso que descreveu.
    RETURN QUERY
      SELECT 'contabilista-anexos'::text, d.caminho
        FROM public.caso_documentos d
        JOIN public.casos c ON c.id = d.caso_id
       WHERE c.cliente_id = u;

    --  E os anexos das propostas que ela escreveu, do outro lado.
    RETURN QUERY
      SELECT 'contabilista-anexos'::text, x.caminho
        FROM public.proposta_anexos x
        JOIN public.propostas p ON p.id = x.proposta_id
       WHERE p.contabilista_id = u;
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

COMMIT;
