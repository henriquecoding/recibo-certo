-- ═══════════════════════════════════════════════════════════════════════
--  20260904121000_dossie_de_guia.sql
--  O SEGUNDO DESTINO DE UM GUIA — levar o caso ao contabilista
--  ---------------------------------------------------------------------
--  Ver `docs/architecture/motor-dossie-de-guia.md`.
--
--  Um Guia tinha uma porta e meia: a FIZ, quando havia capacidade acordada
--  (57 dos 169 guias), e um link para o registo público da Ordem, que
--  manda a pessoa procurar um desconhecido noutro sítio. Entretanto a
--  plataforma tem diretório verificado, casos, propostas, agenda e
--  pagamentos — e a maior superfície de intenção do site nunca apontava
--  para lá.
--
--  Esta migração abre os três destinos do §5 do relatório (o tipo de
--  partilha de D1 entra na migração anterior, `20260904120000`):
--
--    D1  o contabilista que a pessoa já tem   → `partilhas` (tipo novo)
--    D2  escolher na plataforma               → `caso_dossies`
--    D3  o contabilista dela, fora daqui      → `dossie_ligacoes`
--
--  E a VOLTA, que é o que faz disto um motor e não uma exportação:
--  `dossie_pedidos` + `dossie_pedido_itens` — a lista PBC que o
--  profissional devolve e que reaparece na checklist do próprio guia.
--
--  ⚠️ TRÊS DECISÕES QUE NÃO SÃO DETALHE
--
--   1. O DOSSIÊ NÃO É «MAIS UM TipoPartilha». A política de INSERT de
--      `partilhas` exige `vinculo_ativo` (042, linha 806). Quem ainda não
--      tem contabilista — que é a maioria de quem lê estes guias — não
--      consegue enviar nada por esse caminho. Daí D2 e D3 existirem.
--
--   2. O TOKEN DE D3 NUNCA ESTÁ NA BASE. Só o seu sha-256. É a mesma regra
--      que `partner_connections` aplica aos tokens da FIZ, levada ao fim:
--      ali cifram-se, aqui nem sequer se guardam. Quem lê a tabela — e a
--      administração lê — não abre dossiê nenhum.
--
--   3. `anon` NÃO TEM POLÍTICA NENHUMA em `dossie_ligacoes`. Com RLS ligado
--      e sem política, não há caminho — é a doutrina de `partner_events`.
--      A leitura pública passa por uma RPC de `service_role` que recebe o
--      token, calcula o hash, verifica expiração e revogação e devolve o
--      conteúdo. Um `USING` mal escrito abre-se um dia; o que não existe
--      não se abre por engano.
--
--  Idempotente — seguro correr múltiplas vezes.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── D2 · `caso_dossies` ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.caso_dossies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id     uuid NOT NULL REFERENCES public.casos(id) ON DELETE CASCADE,
  guia_slug   text NOT NULL CHECK (char_length(guia_slug) BETWEEN 2 AND 80),
  -- A versão LIDA. Sem isto, três semanas depois ninguém sabe sobre que
  -- texto se falou — e os guias mudam (é para isso que existe o histórico
  -- editorial). É a obrigação 3 do relatório, numa coluna.
  guia_revisao date NOT NULL,
  app_version  text NOT NULL,
  -- O dossiê, inteiro e INERTE. Cópia, nunca apontador para dados vivos:
  -- um apontador daria leitura contínua, que é o que a 038 fechou.
  dossie      jsonb NOT NULL,
  impressao   text NOT NULL CHECK (impressao ~ '^[0-9a-f]{64}$'),
  consentimento_versao  text NOT NULL,
  consentimento_seccoes text[] NOT NULL DEFAULT '{}',
  retirado_em timestamptz,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  -- O mesmo dossiê não entra duas vezes no mesmo caso. A impressão é o que
  -- torna isto possível sem comparar jsonb.
  UNIQUE (caso_id, guia_slug, impressao)
);

CREATE INDEX IF NOT EXISTS caso_dossies_caso_idx ON public.caso_dossies (caso_id, criado_em DESC);

ALTER TABLE public.caso_dossies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "caso_dossies_le" ON public.caso_dossies;
CREATE POLICY "caso_dossies_le" ON public.caso_dossies
  FOR SELECT TO authenticated
  USING (
    public.dono_do_caso(caso_id, (SELECT auth.uid()))
    OR public.encaminhado_para(caso_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "caso_dossies_dono_cria" ON public.caso_dossies;
CREATE POLICY "caso_dossies_dono_cria" ON public.caso_dossies
  FOR INSERT TO authenticated
  WITH CHECK (public.dono_do_caso(caso_id, (SELECT auth.uid())));

-- Retirar é uma TRANSIÇÃO, não um `delete`: o contabilista tem de poder
-- saber que houve ali um dossiê e que deixou de haver.
REVOKE UPDATE, DELETE ON public.caso_dossies FROM anon, authenticated;
GRANT UPDATE (retirado_em) ON public.caso_dossies TO authenticated;

DROP POLICY IF EXISTS "caso_dossies_dono_retira" ON public.caso_dossies;
CREATE POLICY "caso_dossies_dono_retira" ON public.caso_dossies
  FOR UPDATE TO authenticated
  USING (public.dono_do_caso(caso_id, (SELECT auth.uid())))
  WITH CHECK (public.dono_do_caso(caso_id, (SELECT auth.uid())));

COMMENT ON TABLE public.caso_dossies IS
  'Dossiês de guia anexados a um caso. Cópia inerte, com a versão lida e a impressão do conteúdo.';


-- ── D3 · `dossie_ligacoes` ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dossie_ligacoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guia_slug    text NOT NULL CHECK (char_length(guia_slug) BETWEEN 2 AND 80),
  guia_revisao date NOT NULL,
  dossie       jsonb NOT NULL,
  impressao    text NOT NULL CHECK (impressao ~ '^[0-9a-f]{64}$'),
  -- ⚠️ O TOKEN NUNCA ESTÁ AQUI. Só o seu sha-256.
  token_hash   text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  -- Uma etiqueta escolhida pela pessoa («O meu contabilista»). Não é um
  -- contacto e não se valida como tal: é para ela se lembrar de quem é.
  etiqueta     text CHECK (etiqueta IS NULL OR char_length(etiqueta) <= 60),
  consentimento_versao  text NOT NULL,
  consentimento_seccoes text[] NOT NULL DEFAULT '{}',
  expira_em    timestamptz NOT NULL,
  revogada_em  timestamptz,
  acessos      integer NOT NULL DEFAULT 0,
  ultimo_acesso timestamptz,
  criado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dossie_ligacoes_cliente_idx
  ON public.dossie_ligacoes (cliente_id, criado_em DESC);

ALTER TABLE public.dossie_ligacoes ENABLE ROW LEVEL SECURITY;

-- UMA política, e é do dono. `anon` não tem nenhuma — de propósito.
DROP POLICY IF EXISTS "dossie_ligacoes_dono" ON public.dossie_ligacoes;
CREATE POLICY "dossie_ligacoes_dono" ON public.dossie_ligacoes
  FOR SELECT TO authenticated
  USING (cliente_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "dossie_ligacoes_dono_cria" ON public.dossie_ligacoes;
CREATE POLICY "dossie_ligacoes_dono_cria" ON public.dossie_ligacoes
  FOR INSERT TO authenticated
  WITH CHECK (cliente_id = (SELECT auth.uid()));

REVOKE UPDATE, DELETE ON public.dossie_ligacoes FROM anon, authenticated;
-- Só duas colunas, e as duas são a mesma decisão: revogar, ou prorrogar.
GRANT UPDATE (revogada_em, expira_em) ON public.dossie_ligacoes TO authenticated;

DROP POLICY IF EXISTS "dossie_ligacoes_dono_revoga" ON public.dossie_ligacoes;
CREATE POLICY "dossie_ligacoes_dono_revoga" ON public.dossie_ligacoes
  FOR UPDATE TO authenticated
  USING (cliente_id = (SELECT auth.uid()))
  WITH CHECK (cliente_id = (SELECT auth.uid()));

COMMENT ON TABLE public.dossie_ligacoes IS
  'Ligações opacas para o contabilista que está fora da plataforma. Guarda o sha-256 do token, nunca o token.';


-- ── O limite diário, imposto e não declarado ─────────────────────────
--
-- A lição de `20260824100000`: uma constante em TypeScript é um espelho.
-- Quem impõe é o gatilho, porque o gatilho está em TODOS os caminhos —
-- incluindo o REST direto, que é precisamente o do abuso.
CREATE OR REPLACE FUNCTION public.limite_ligacoes_dia() RETURNS integer
LANGUAGE sql IMMUTABLE AS $$ SELECT 10 $$;

CREATE OR REPLACE FUNCTION public.ligacoes_dentro_do_limite_diario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.dossie_ligacoes l
   WHERE l.cliente_id = NEW.cliente_id
     AND l.criado_em >= date_trunc('day', now());

  IF n >= public.limite_ligacoes_dia() THEN
    RAISE EXCEPTION 'Já criaste % ligações hoje. Tenta amanhã.',
      public.limite_ligacoes_dia()
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ligacoes_dentro_do_limite_diario ON public.dossie_ligacoes;
CREATE TRIGGER ligacoes_dentro_do_limite_diario
  BEFORE INSERT ON public.dossie_ligacoes
  FOR EACH ROW EXECUTE FUNCTION public.ligacoes_dentro_do_limite_diario();


-- ── A auditoria de leitura ───────────────────────────────────────────
--
-- Serve a PESSOA — «o teu dossiê foi aberto duas vezes, o último a 3 de
-- setembro» — e não serve para vigiar ninguém: sem IP, sem user agent,
-- sem sessão. Purgada com o dossiê, em cascata.
CREATE TABLE IF NOT EXISTS public.dossie_acessos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ligacao_id  uuid REFERENCES public.dossie_ligacoes(id) ON DELETE CASCADE,
  caso_dossie_id uuid REFERENCES public.caso_dossies(id) ON DELETE CASCADE,
  CONSTRAINT dossie_acessos_uma_origem CHECK (
    (ligacao_id IS NOT NULL)::int + (caso_dossie_id IS NOT NULL)::int = 1),
  acao        text NOT NULL CHECK (acao IN ('abertura', 'extracao', 'pedido')),
  quando      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dossie_acessos_ligacao_idx
  ON public.dossie_acessos (ligacao_id, quando DESC);

ALTER TABLE public.dossie_acessos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dossie_acessos_dono_le" ON public.dossie_acessos;
CREATE POLICY "dossie_acessos_dono_le" ON public.dossie_acessos
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.dossie_ligacoes l
             WHERE l.id = ligacao_id AND l.cliente_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM public.caso_dossies d
                WHERE d.id = caso_dossie_id
                  AND public.dono_do_caso(d.caso_id, (SELECT auth.uid())))
  );

-- Escrita só por RPC de `service_role`: um acesso registado pelo próprio
-- browser de quem lê seria um contador que quem lê escolhe se incrementa.
REVOKE INSERT, UPDATE, DELETE ON public.dossie_acessos FROM anon, authenticated;


-- ── A leitura pública de D3, sem política nenhuma ────────────────────
--
-- Recebe o TOKEN JÁ EM HASH: a rota de servidor calcula o sha-256 e é só
-- isso que atravessa a fronteira para aqui. Verifica revogação e
-- expiração, incrementa o contador, regista o acesso e devolve o dossiê.
--
-- `SECURITY DEFINER` com `search_path = ''` e sem `GRANT` a `anon`: só o
-- `service_role` a pode chamar, e o `service_role` só existe no servidor.
CREATE OR REPLACE FUNCTION public.abrir_dossie_por_token(p_id uuid, p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE l public.dossie_ligacoes%ROWTYPE;
BEGIN
  SELECT * INTO l FROM public.dossie_ligacoes
   WHERE id = p_id AND token_hash = p_token_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'inexistente');
  END IF;
  IF l.revogada_em IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'revogada');
  END IF;
  IF l.expira_em <= now() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'expirada');
  END IF;

  UPDATE public.dossie_ligacoes
     SET acessos = acessos + 1, ultimo_acesso = now()
   WHERE id = l.id;

  INSERT INTO public.dossie_acessos (ligacao_id, acao) VALUES (l.id, 'abertura');

  RETURN jsonb_build_object(
    'ok', true,
    'dossie', l.dossie,
    'guia_slug', l.guia_slug,
    'etiqueta', l.etiqueta,
    'expira_em', l.expira_em,
    'acessos', l.acessos + 1
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.abrir_dossie_por_token(uuid, text) FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.abrir_dossie_por_token(uuid, text) TO service_role;


-- ── A volta · `dossie_pedidos` e `dossie_pedido_itens` ───────────────
CREATE TABLE IF NOT EXISTS public.dossie_pedidos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Exatamente uma das três origens. O CHECK impede um pedido órfão ou um
  -- pedido com dois donos — que é a forma de um pedido acabar visível a
  -- quem não devia vê-lo.
  partilha_id     uuid REFERENCES public.partilhas(id)        ON DELETE CASCADE,
  caso_dossie_id  uuid REFERENCES public.caso_dossies(id)     ON DELETE CASCADE,
  ligacao_id      uuid REFERENCES public.dossie_ligacoes(id)  ON DELETE CASCADE,
  CONSTRAINT dossie_pedidos_uma_origem CHECK (
    (partilha_id IS NOT NULL)::int + (caso_dossie_id IS NOT NULL)::int
    + (ligacao_id IS NOT NULL)::int = 1),
  -- Nulo em D3: quem pede a partir de uma ligação não tem conta, e o texto
  -- do lado do cliente diz exatamente isso.
  contabilista_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guia_slug       text NOT NULL CHECK (char_length(guia_slug) BETWEEN 2 AND 80),
  impressao       text NOT NULL CHECK (impressao ~ '^[0-9a-f]{64}$'),
  estado          text NOT NULL DEFAULT 'aberto'
                    CHECK (estado IN ('aberto', 'respondido', 'fechado')),
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dossie_pedidos_guia_idx
  ON public.dossie_pedidos (guia_slug, criado_em DESC);

CREATE TABLE IF NOT EXISTS public.dossie_pedido_itens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id  uuid NOT NULL REFERENCES public.dossie_pedidos(id) ON DELETE CASCADE,
  n          integer NOT NULL CHECK (n > 0),
  texto      text NOT NULL CHECK (char_length(texto) BETWEEN 3 AND 400),
  -- 'guia' quando o item veio do dossiê; 'profissional' quando foi
  -- escrito. Confundir os dois seria pôr na boca do Guia o que ele não
  -- disse — e é a mesma disciplina que separa `verified` de
  -- `review_required` nas afirmações.
  origem     text NOT NULL CHECK (origem IN ('guia', 'profissional')),
  item_id    text,
  prazo      date,
  nota       text CHECK (nota IS NULL OR char_length(nota) <= 400),
  estado     text NOT NULL DEFAULT 'pedido'
               CHECK (estado IN ('pedido', 'entregue', 'nao_aplica', 'dispensado')),
  respondido_em timestamptz,
  UNIQUE (pedido_id, n)
);

ALTER TABLE public.dossie_pedidos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossie_pedido_itens ENABLE ROW LEVEL SECURITY;

-- Quem é o CLIENTE de um pedido, seja qual for a origem. Uma função só,
-- porque as três origens têm de responder à mesma pergunta e escrever a
-- resposta três vezes é escrevê-la mal uma delas.
CREATE OR REPLACE FUNCTION public.cliente_do_pedido(p_pedido uuid)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT p.cliente_id FROM public.partilhas p
      JOIN public.dossie_pedidos d ON d.partilha_id = p.id WHERE d.id = p_pedido),
    (SELECT c.cliente_id FROM public.casos c
      JOIN public.caso_dossies cd ON cd.caso_id = c.id
      JOIN public.dossie_pedidos d ON d.caso_dossie_id = cd.id WHERE d.id = p_pedido),
    (SELECT l.cliente_id FROM public.dossie_ligacoes l
      JOIN public.dossie_pedidos d ON d.ligacao_id = l.id WHERE d.id = p_pedido)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.cliente_do_pedido(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.cliente_do_pedido(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "dossie_pedidos_partes_leem" ON public.dossie_pedidos;
CREATE POLICY "dossie_pedidos_partes_leem" ON public.dossie_pedidos
  FOR SELECT TO authenticated
  USING (
    contabilista_id = (SELECT auth.uid())
    OR public.cliente_do_pedido(id) = (SELECT auth.uid())
  );

-- Um pedido só nasce por RPC. A criação a partir de D3 não tem sessão
-- nenhuma e passa por `service_role`; a criação a partir de D1/D2 é do
-- contabilista e valida-se lá dentro.
REVOKE INSERT, UPDATE, DELETE ON public.dossie_pedidos FROM anon, authenticated;

DROP POLICY IF EXISTS "dossie_pedido_itens_partes_leem" ON public.dossie_pedido_itens;
CREATE POLICY "dossie_pedido_itens_partes_leem" ON public.dossie_pedido_itens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dossie_pedidos p
       WHERE p.id = pedido_id
         AND (p.contabilista_id = (SELECT auth.uid())
              OR public.cliente_do_pedido(p.id) = (SELECT auth.uid()))
    )
  );

REVOKE INSERT, DELETE ON public.dossie_pedido_itens FROM anon, authenticated;
-- O cliente responde a um item — e só isso. O TEXTO é imutável.
GRANT UPDATE (estado, respondido_em) ON public.dossie_pedido_itens TO authenticated;

DROP POLICY IF EXISTS "dossie_pedido_itens_cliente_responde" ON public.dossie_pedido_itens;
CREATE POLICY "dossie_pedido_itens_cliente_responde" ON public.dossie_pedido_itens
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.dossie_pedidos p
             WHERE p.id = pedido_id AND public.cliente_do_pedido(p.id) = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.dossie_pedidos p
             WHERE p.id = pedido_id AND public.cliente_do_pedido(p.id) = (SELECT auth.uid()))
  );

-- ⚠️ O texto de um item pedido é imutável depois de enviado, como
-- `mensagem_corpo_imutavel`. Quem quiser mudar envia outro pedido; o
-- anterior fica a dizer o que tinha sido pedido — que é a única forma de
-- «pedi-te isto» significar alguma coisa três semanas depois.
CREATE OR REPLACE FUNCTION public.pedido_item_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.texto IS DISTINCT FROM OLD.texto
     OR NEW.n IS DISTINCT FROM OLD.n
     OR NEW.origem IS DISTINCT FROM OLD.origem
     OR NEW.item_id IS DISTINCT FROM OLD.item_id
     OR NEW.prazo IS DISTINCT FROM OLD.prazo
     OR NEW.nota IS DISTINCT FROM OLD.nota THEN
    RAISE EXCEPTION 'O que foi pedido não se reescreve. Envia outro pedido.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedido_item_imutavel ON public.dossie_pedido_itens;
CREATE TRIGGER pedido_item_imutavel
  BEFORE UPDATE ON public.dossie_pedido_itens
  FOR EACH ROW EXECUTE FUNCTION public.pedido_item_imutavel();


-- ── Criar um pedido, numa transação ──────────────────────────────────
--
-- Cabeçalho e itens juntos: um pedido sem itens é ruído no painel do
-- cliente, e um pedido a meio é pior do que nenhum.
CREATE OR REPLACE FUNCTION public.criar_pedido_de_elementos(
  p_origem text,          -- 'partilha' | 'caso_dossie' | 'ligacao'
  p_origem_id uuid,
  p_guia_slug text,
  p_impressao text,
  p_itens jsonb           -- [{n, texto, origem, item_id, prazo, nota}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  u        uuid := auth.uid();
  novo     uuid;
  item     jsonb;
  total    integer := 0;
BEGIN
  IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_itens');
  END IF;
  IF jsonb_array_length(p_itens) > 60 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'demasiados_itens');
  END IF;

  INSERT INTO public.dossie_pedidos (
    partilha_id, caso_dossie_id, ligacao_id, contabilista_id, guia_slug, impressao
  ) VALUES (
    CASE WHEN p_origem = 'partilha'    THEN p_origem_id END,
    CASE WHEN p_origem = 'caso_dossie' THEN p_origem_id END,
    CASE WHEN p_origem = 'ligacao'     THEN p_origem_id END,
    u, p_guia_slug, p_impressao
  ) RETURNING id INTO novo;

  FOR item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
    total := total + 1;
    INSERT INTO public.dossie_pedido_itens (pedido_id, n, texto, origem, item_id, prazo, nota)
    VALUES (
      novo,
      total,
      left(item->>'texto', 400),
      COALESCE(item->>'origem', 'guia'),
      item->>'item_id',
      NULLIF(item->>'prazo', '')::date,
      left(item->>'nota', 400)
    );
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'pedido_id', novo, 'itens', total);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_pedido_de_elementos(text, uuid, text, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.criar_pedido_de_elementos(text, uuid, text, text, jsonb)
  TO authenticated, service_role;


-- ── Apagar leva tudo ─────────────────────────────────────────────────
--
-- `conta-catalogo.test.ts` compara `src/lib/conta/catalogo.ts` com estas
-- três funções. Uma tabela nova que não entre aqui faz o teste falhar —
-- antes de chegar a produção, e não quando alguém pede para ser esquecido.
CREATE OR REPLACE FUNCTION public.conjuntos_todos()
RETURNS text[]
LANGUAGE sql IMMUTABLE
AS $$
  SELECT ARRAY[
    'recibos','vencimentos','cenarios','prazos','perfil-fiscal',
    'quiz','quiz-cupoes','casos','dossies',
    'partilhas','conversas','consultas','calendario','fidelidade','vinculos',
    'painel-vistas','progressao','fundador','propostas-desbloqueio',
    'stripe-ligacao','fidelidade-regras',
    'perfil-contabilista','trabalho','candidatura',
    'alertas','notificacoes','parcerias','feedback'
  ]
$$;

CREATE OR REPLACE FUNCTION public.apagar_conjuntos(p_conjuntos text[])
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  u      uuid := auth.uid();
  linhas jsonb := '{}'::jsonb;
  n      integer;
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  IF p_conjuntos IS NULL OR array_length(p_conjuntos, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nada_escolhido');
  END IF;

  PERFORM public.reter_faturacao(u);

  IF 'recibos' = ANY(p_conjuntos) THEN
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

  IF 'casos' = ANY(p_conjuntos) THEN
    DELETE FROM public.casos WHERE cliente_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('casos', n);
  END IF;

  -- ⚠️ NOVO. As ligações opacas de dossiê. Uma linha destas É a chave de
  -- leitura de um caso inteiro por quem tiver o endereço: quem a mandou
  -- apagar não pode continuar com um dossiê seu aberto na secretária de
  -- alguém. Os `caso_dossies` saem com o caso, em cascata.
  IF 'dossies' = ANY(p_conjuntos) THEN
    DELETE FROM public.dossie_ligacoes WHERE cliente_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('dossie_ligacoes', n);
  END IF;

  IF 'partilhas' = ANY(p_conjuntos) THEN
    DELETE FROM public.partilhas WHERE cliente_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('partilhas', n);
  END IF;

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

  IF 'calendario' = ANY(p_conjuntos) THEN
    DELETE FROM public.calendario_assinaturas WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('calendario', n);
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

  IF 'painel-vistas' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_dashboard_vistas WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('painel_vistas', n);
  END IF;

  IF 'progressao' = ANY(p_conjuntos) THEN
    DELETE FROM public.progressao_eventos WHERE contabilista_id = u;
    DELETE FROM public.creditos_fidelidade_ledger WHERE contabilista_id = u;
    DELETE FROM public.contabilista_progressao WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('progressao', n);
  END IF;

  IF 'fundador' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_fundadores WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('fundador', n);
  END IF;

  IF 'propostas-desbloqueio' = ANY(p_conjuntos) THEN
    DELETE FROM public.desbloqueio_propostas WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('propostas_desbloqueio', n);
  END IF;

  IF 'stripe-ligacao' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_stripe WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('stripe_ligacao', n);
  END IF;

  IF 'fidelidade-regras' = ANY(p_conjuntos) THEN
    DELETE FROM public.fidelidade_regras WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('fidelidade_regras', n);
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


CREATE OR REPLACE FUNCTION public.inventario_do_utilizador()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
DECLARE u uuid := auth.uid(); r jsonb := '{}'::jsonb;
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
    'casos',        (SELECT count(*) FROM public.casos WHERE cliente_id = u),
    'dossies',      (SELECT count(*) FROM public.dossie_ligacoes WHERE cliente_id = u),
    'partilhas',    (SELECT count(*) FROM public.partilhas WHERE cliente_id = u),
    'conversas',    (SELECT count(*) FROM public.contabilista_mensagens WHERE autor_id = u),
    'consultas',    (SELECT count(*) FROM public.agendamentos
                      WHERE cliente_id = u OR contabilista_id = u),
    'calendario',   (SELECT count(*) FROM public.calendario_assinaturas WHERE user_id = u),
    'fidelidade',   (SELECT count(*) FROM public.fidelidade_cartoes WHERE cliente_id = u),
    'vinculos',     (SELECT count(*) FROM public.contabilista_vinculos WHERE cliente_id = u),
    'perfil-contabilista', (SELECT count(*) FROM public.contabilistas WHERE user_id = u),
    'painel-vistas',(SELECT count(*) FROM public.contabilista_dashboard_vistas
                      WHERE contabilista_id = u),
    'progressao',   (SELECT count(*) FROM public.progressao_eventos WHERE contabilista_id = u)
                  + (SELECT count(*) FROM public.creditos_fidelidade_ledger WHERE contabilista_id = u),
    'compras-patamar', (SELECT count(*) FROM public.progressao_compras WHERE contabilista_id = u),
    'fundador',     (SELECT count(*) FROM public.contabilista_fundadores WHERE contabilista_id = u),
    'propostas-desbloqueio', (SELECT count(*) FROM public.desbloqueio_propostas
                               WHERE contabilista_id = u),
    'recebimentos', (SELECT count(*) FROM public.pagamentos WHERE contabilista_id = u),
    'stripe-ligacao', (SELECT count(*) FROM public.contabilista_stripe WHERE contabilista_id = u),
    'fidelidade-regras', (SELECT count(*) FROM public.fidelidade_regras WHERE contabilista_id = u),
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

COMMENT ON FUNCTION public.abrir_dossie_por_token(uuid, text) IS
  'Leitura pública de uma ligação de dossiê. Recebe o token já em hash; verifica revogação e expiração; conta o acesso.';

COMMIT;
