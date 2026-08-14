-- 042_plataforma_contabilistas.sql
-- ═══════════════════════════════════════════════════════════════════════
--  PLATAFORMA DE CONTABILISTAS
--  ---------------------------------------------------------------------
--  Agenda, clientes, partilha de simulações e cartão de fidelidade.
--  Desenho completo em `docs/PLATAFORMA-CONTABILISTAS.md`.
--
--  A decisão que governa tudo o que está aqui:
--
--    A migração 038 tornou verdadeira a frase da página de privacidade —
--    «só tu acedes aos teus dados» — removendo quatro políticas que davam
--    à administração o conteúdo fiscal de toda a gente.
--
--    Um contabilista aprovado NÃO é um administrador e não pode herdar
--    aquilo que nem a administração tem. Por isso não há uma única
--    política, aqui ou em lado nenhum, que lhe dê leitura de `recibos`,
--    `cenarios`, `recibos_vencimento` ou `preferencias_fiscais`.
--
--    O que ele lê é `partilhas`: cópias imutáveis que o cliente enviou uma
--    a uma, com consentimento gravado e revogáveis a qualquer momento.
--    Estar vinculado dá acesso a ZERO dados — dá acesso ao que for enviado
--    a seguir, e a mais nada.
--
--  Três garantias que não dependem de o código se portar bem:
--
--    1. Ninguém se auto-aprova. `authenticated` não tem INSERT nem UPDATE
--       sobre `contabilistas`.`estado`; um gatilho tranca a coluna à
--       maneira da migração 019, e a linha só nasce pela chave de serviço,
--       depois de a administração decidir.
--    2. Ninguém marca duas consultas no mesmo horário. Restrição de
--       exclusão GIST — a segunda transação falha ao ESCREVER, não numa
--       leitura que correu antes.
--    3. Ninguém se oferece carimbos nem cupões. Como na migração 024, o
--       cliente LÊ e não escreve; quem escreve é o servidor.
--
--  Idempotente — seguro correr múltiplas vezes.
-- ═══════════════════════════════════════════════════════════════════════

-- `btree_gist` permite pôr uma coluna uuid (`=`) e um intervalo (`&&`) no
-- mesmo índice GIST. É o que torna a garantia 2 possível.
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- ════════════════════════════════════════════════════════════════════
--  1. CANDIDATURAS
-- ════════════════════════════════════════════════════════════════════
-- Qualquer conta se pode candidatar. Só a administração decide.

CREATE TABLE IF NOT EXISTS public.contabilista_pedidos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome           text NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 120),
  email_contacto text NOT NULL CHECK (char_length(email_contacto) BETWEEN 5 AND 180),
  telefone       text CHECK (telefone IS NULL OR char_length(telefone) <= 40),
  -- Justificação livre: porquê, que clientes, que experiência.
  mensagem       text NOT NULL CHECK (char_length(mensagem) BETWEEN 20 AND 4000),
  -- Credenciais protegidas: nº da OCC, códigos de validação, o que a pessoa
  -- entender. Legível só pelo próprio e pela administração — nunca no
  -- diretório público, nunca por outro contabilista.
  credenciais    text CHECK (credenciais IS NULL OR char_length(credenciais) <= 4000),
  -- Caminhos no bucket privado `contabilista-documentos`. Nunca URLs públicos.
  documentos     text[] NOT NULL DEFAULT '{}',
  estado         text NOT NULL DEFAULT 'pendente'
                   CHECK (estado IN ('pendente', 'em_analise', 'aprovado', 'recusado')),
  -- Preenchidos pela administração ao decidir.
  motivo_decisao text CHECK (motivo_decisao IS NULL OR char_length(motivo_decisao) <= 2000),
  decidido_por   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decidido_em    timestamptz,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contabilista_pedidos_user_idx
  ON public.contabilista_pedidos (user_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS contabilista_pedidos_estado_idx
  ON public.contabilista_pedidos (estado, criado_em DESC);

-- Uma candidatura em aberto de cada vez, por pessoa.
CREATE UNIQUE INDEX IF NOT EXISTS contabilista_pedidos_um_aberto_idx
  ON public.contabilista_pedidos (user_id)
  WHERE estado IN ('pendente', 'em_analise');


-- ════════════════════════════════════════════════════════════════════
--  2. CONTABILISTAS
-- ════════════════════════════════════════════════════════════════════
-- A linha nasce pela chave de serviço quando a administração aprova.
-- `authenticated` NUNCA tem INSERT: era por aí que alguém se inscrevia
-- com estado='aprovado' e entrava no painel sem passar por ninguém.

CREATE TABLE IF NOT EXISTS public.contabilistas (
  user_id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pedido_id          uuid REFERENCES public.contabilista_pedidos(id) ON DELETE SET NULL,
  slug               text NOT NULL UNIQUE
                       CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 60),
  nome               text NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 120),
  occ                text CHECK (occ IS NULL OR char_length(occ) <= 40),
  bio                text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 2000),
  distrito           text CHECK (distrito IS NULL OR char_length(distrito) <= 60),
  concelho           text CHECK (concelho IS NULL OR char_length(concelho) <= 60),
  especialidades     text[] NOT NULL DEFAULT '{}',
  modalidades        text[] NOT NULL DEFAULT '{presencial,online}',
  email_contacto     text CHECK (email_contacto IS NULL OR char_length(email_contacto) <= 180),
  telefone           text CHECK (telefone IS NULL OR char_length(telefone) <= 40),
  website            text CHECK (website IS NULL OR char_length(website) <= 300),

  estado             text NOT NULL DEFAULT 'pendente'
                       CHECK (estado IN ('pendente', 'aprovado', 'recusado', 'suspenso')),
  aceita_novos_clientes boolean NOT NULL DEFAULT true,

  -- ── Configuração comercial e do cartão de fidelidade ──────────────
  -- O preço é o «valor original» sobre o qual o cupão incide. Em cêntimos
  -- inteiros: em vírgula flutuante um cêntimo perde-se, e um cêntimo
  -- perdido numa fatura é um erro visível para quem a recebe.
  preco_consulta_cents integer NOT NULL DEFAULT 0 CHECK (preco_consulta_cents >= 0),
  duracao_consulta_min integer NOT NULL DEFAULT 60
                       CHECK (duracao_consulta_min BETWEEN 15 AND 240),
  -- As fronteiras do enunciado: começa em 10%, vai até 50%.
  fidelidade_desconto_pct integer NOT NULL DEFAULT 10
                       CHECK (fidelidade_desconto_pct BETWEEN 10 AND 50),
  fidelidade_meta      integer NOT NULL DEFAULT 5
                       CHECK (fidelidade_meta BETWEEN 3 AND 12),
  fidelidade_ativa     boolean NOT NULL DEFAULT false,
  -- Um cartão ativo sem preço prometeria uma percentagem de coisa nenhuma.
  CONSTRAINT contabilistas_fidelidade_precisa_de_preco
    CHECK (NOT fidelidade_ativa OR preco_consulta_cents > 0),

  criado_em          timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contabilistas_diretorio_idx
  ON public.contabilistas (estado, distrito, aceita_novos_clientes);


-- ── Gatilho: tranca as colunas que o próprio não pode mudar ──────────
-- Mesmo padrão da migração 019 (a escalada de privilégios do `role`).
-- Defesa em profundidade: mesmo que uma migração futura afrouxe a política
-- de UPDATE — foi exatamente assim que o bug de 019 entrou — o gatilho
-- continua a recusar.
CREATE OR REPLACE FUNCTION public.contabilistas_tranca_colunas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      RAISE EXCEPTION 'O estado da conta de contabilista só é alterado pela administração.';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'O titular de uma conta de contabilista não pode ser alterado.';
    END IF;
    -- O endereço público é atribuído na aprovação. Deixá-lo livre permitiria
    -- ocupar o endereço de outra pessoa assim que ela o libertasse.
    IF NEW.slug IS DISTINCT FROM OLD.slug THEN
      RAISE EXCEPTION 'O endereço público só é alterado pela administração.';
    END IF;
  END IF;
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.contabilistas_tranca_colunas() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS contabilistas_tranca ON public.contabilistas;
CREATE TRIGGER contabilistas_tranca
  BEFORE UPDATE ON public.contabilistas
  FOR EACH ROW EXECUTE FUNCTION public.contabilistas_tranca_colunas();


-- ── Funções de autorização usadas pelas políticas ────────────────────

CREATE OR REPLACE FUNCTION public.e_contabilista_aprovado(p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilistas c
    WHERE c.user_id = p_user AND c.estado = 'aprovado'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.e_contabilista_aprovado(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.e_contabilista_aprovado(uuid) TO authenticated;


-- ════════════════════════════════════════════════════════════════════
--  3. VÍNCULOS
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.contabilista_vinculos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  cliente_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  estado          text NOT NULL DEFAULT 'pendente'
                    CHECK (estado IN ('convidado', 'pendente', 'ativo', 'pausado', 'terminado')),
  origem          text NOT NULL DEFAULT 'cliente' CHECK (origem IN ('cliente', 'contabilista')),
  mensagem        text CHECK (mensagem IS NULL OR char_length(mensagem) <= 1000),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  terminado_em    timestamptz,
  -- Ninguém é cliente de si próprio: sem isto, um contabilista podia
  -- vincular-se a si mesmo e carimbar o seu próprio cartão.
  CONSTRAINT contabilista_vinculos_nao_proprio CHECK (contabilista_id <> cliente_id)
);

-- Um vínculo vivo de cada vez entre as mesmas duas pessoas. Terminados podem
-- coexistir no histórico — reatar não apaga o que houve antes.
CREATE UNIQUE INDEX IF NOT EXISTS contabilista_vinculos_vivo_idx
  ON public.contabilista_vinculos (contabilista_id, cliente_id)
  WHERE estado <> 'terminado';

CREATE INDEX IF NOT EXISTS contabilista_vinculos_cliente_idx
  ON public.contabilista_vinculos (cliente_id, estado);
CREATE INDEX IF NOT EXISTS contabilista_vinculos_contabilista_idx
  ON public.contabilista_vinculos (contabilista_id, estado, criado_em DESC);


CREATE OR REPLACE FUNCTION public.vinculo_ativo(p_contabilista uuid, p_cliente uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilista_vinculos v
    WHERE v.contabilista_id = p_contabilista
      AND v.cliente_id = p_cliente
      AND v.estado = 'ativo'
  );
$$;

-- Para LER o histórico basta o vínculo não ter terminado; para ESCREVER
-- (partilhar, agendar) é preciso estar ativo. São perguntas diferentes.
CREATE OR REPLACE FUNCTION public.vinculo_nao_terminado(p_contabilista uuid, p_cliente uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilista_vinculos v
    WHERE v.contabilista_id = p_contabilista
      AND v.cliente_id = p_cliente
      AND v.estado IN ('ativo', 'pausado')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.vinculo_ativo(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.vinculo_nao_terminado(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.vinculo_ativo(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vinculo_nao_terminado(uuid, uuid) TO authenticated;


-- ════════════════════════════════════════════════════════════════════
--  4. DISPONIBILIDADE E EXCEÇÕES
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.contabilista_disponibilidade (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  dia_semana      smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio     time NOT NULL,
  hora_fim        time NOT NULL,
  duracao_min     integer NOT NULL DEFAULT 60 CHECK (duracao_min BETWEEN 15 AND 240),
  intervalo_min   integer NOT NULL DEFAULT 0 CHECK (intervalo_min BETWEEN 0 AND 120),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT disponibilidade_ordem CHECK (hora_fim > hora_inicio)
);

CREATE INDEX IF NOT EXISTS contabilista_disponibilidade_idx
  ON public.contabilista_disponibilidade (contabilista_id, dia_semana);

CREATE TABLE IF NOT EXISTS public.contabilista_excecoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  data            date NOT NULL,
  hora_inicio     time,
  hora_fim        time,
  motivo          text CHECK (motivo IS NULL OR char_length(motivo) <= 200),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  -- Ou o dia inteiro (sem horas), ou um intervalo completo e coerente.
  CONSTRAINT excecoes_horas_coerentes CHECK (
    (hora_inicio IS NULL AND hora_fim IS NULL)
    OR (hora_inicio IS NOT NULL AND hora_fim IS NOT NULL AND hora_fim > hora_inicio)
  )
);

CREATE INDEX IF NOT EXISTS contabilista_excecoes_idx
  ON public.contabilista_excecoes (contabilista_id, data);


-- ════════════════════════════════════════════════════════════════════
--  5. AGENDAMENTOS
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.agendamentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE RESTRICT,
  cliente_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  inicio          timestamptz NOT NULL,
  fim             timestamptz NOT NULL,
  slot            tstzrange GENERATED ALWAYS AS (tstzrange(inicio, fim, '[)')) STORED,
  estado          text NOT NULL DEFAULT 'pedido'
                    CHECK (estado IN ('pedido', 'confirmado', 'realizada',
                                      'cancelado_cliente', 'cancelado_contabilista',
                                      'nao_compareceu')),
  modalidade      text NOT NULL DEFAULT 'online' CHECK (modalidade IN ('presencial', 'online')),
  assunto         text CHECK (assunto IS NULL OR char_length(assunto) <= 500),
  -- Preenchido pelo contabilista ao confirmar: morada ou ligação da chamada.
  local_ou_ligacao text CHECK (local_ou_ligacao IS NULL OR char_length(local_ou_ligacao) <= 500),
  -- O cupão que o cliente decidiu usar nesta consulta, se algum.
  cupao_id        uuid,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agendamentos_ordem CHECK (fim > inicio),

  -- ⚠️ A garantia contra duplo agendamento.
  -- Verificar em leitura não chega: entre ler os horários livres e gravar
  -- passa tempo, e nesse intervalo cabe outra pessoa. Aqui a segunda
  -- transação falha AO ESCREVER, e não há intervalo nenhum.
  CONSTRAINT agendamentos_sem_sobreposicao EXCLUDE USING gist (
    contabilista_id WITH =,
    slot WITH &&
  ) WHERE (estado IN ('pedido', 'confirmado'))
);

CREATE INDEX IF NOT EXISTS agendamentos_contabilista_idx
  ON public.agendamentos (contabilista_id, inicio DESC);
CREATE INDEX IF NOT EXISTS agendamentos_cliente_idx
  ON public.agendamentos (cliente_id, inicio DESC);


-- ════════════════════════════════════════════════════════════════════
--  6. PARTILHAS
-- ════════════════════════════════════════════════════════════════════
-- O único caminho pelo qual dados fiscais chegam a um contabilista.
-- Cópia imutável, com consentimento gravado, revogável.

CREATE TABLE IF NOT EXISTS public.partilhas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id      uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  cliente_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo                 text NOT NULL CHECK (tipo IN (
                         'simulador_irs', 'recibos_verdes', 'recibo_vencimento',
                         'comparador_regimes', 'simulador_empresa', 'simulador_herancas',
                         'cenario_guardado', 'resumo_anual')),
  titulo               text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 200),
  -- Cópia do que estava no ecrã. NUNCA um apontador para os dados vivos:
  -- um apontador daria leitura contínua de tudo, que é o que a 038 fechou.
  conteudo             jsonb NOT NULL,
  nota_cliente         text CHECK (nota_cliente IS NULL OR char_length(nota_cliente) <= 2000),
  estado               text NOT NULL DEFAULT 'enviada'
                         CHECK (estado IN ('enviada', 'vista', 'revogada')),
  -- Saber que alguém consentiu não chega se não se souber com o quê.
  consentimento_versao text NOT NULL,
  consentimento_em     timestamptz NOT NULL DEFAULT now(),
  vista_em             timestamptz,
  revogada_em          timestamptz,
  criado_em            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partilhas_contabilista_idx
  ON public.partilhas (contabilista_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS partilhas_cliente_idx
  ON public.partilhas (cliente_id, criado_em DESC);


-- ════════════════════════════════════════════════════════════════════
--  7. FIDELIDADE
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.fidelidade_cartoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  cliente_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carimbos        integer NOT NULL DEFAULT 0 CHECK (carimbos >= 0),
  -- Meta e percentagem CONGELADAS na abertura do cartão. Quem começou um
  -- cartão de 20% não pode ver a promessa cair para 10% na última consulta:
  -- mudar a configuração afeta cartões novos, nunca os que estão a decorrer.
  meta            integer NOT NULL CHECK (meta BETWEEN 3 AND 12),
  desconto_pct    integer NOT NULL CHECK (desconto_pct BETWEEN 10 AND 50),
  preco_base_cents integer NOT NULL CHECK (preco_base_cents >= 0),
  completo        boolean NOT NULL DEFAULT false,
  aberto_em       timestamptz NOT NULL DEFAULT now(),
  completo_em     timestamptz,
  CONSTRAINT fidelidade_cartoes_carimbos_ate_meta CHECK (carimbos <= meta)
);

-- Um cartão aberto de cada vez por par. Sem isto, duas consultas quase
-- simultâneas abriam dois cartões e os carimbos dividiam-se entre eles.
CREATE UNIQUE INDEX IF NOT EXISTS fidelidade_cartao_aberto_idx
  ON public.fidelidade_cartoes (contabilista_id, cliente_id)
  WHERE NOT completo;

CREATE INDEX IF NOT EXISTS fidelidade_cartoes_cliente_idx
  ON public.fidelidade_cartoes (cliente_id, contabilista_id);


CREATE TABLE IF NOT EXISTS public.fidelidade_carimbos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_id       uuid NOT NULL REFERENCES public.fidelidade_cartoes(id) ON DELETE CASCADE,
  -- ⚠️ A garantia de idempotência. Carimbar duas vezes a mesma consulta viola
  -- esta restrição — não depende de o código se lembrar de verificar.
  agendamento_id  uuid NOT NULL UNIQUE REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fidelidade_carimbos_cartao_idx
  ON public.fidelidade_carimbos (cartao_id);


CREATE TABLE IF NOT EXISTS public.fidelidade_cupoes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo           text NOT NULL UNIQUE,
  contabilista_id  uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  cliente_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cartao_id        uuid REFERENCES public.fidelidade_cartoes(id) ON DELETE SET NULL,
  percentagem      integer NOT NULL CHECK (percentagem BETWEEN 10 AND 50),
  -- O preço da consulta no instante da emissão. Guardado, e não lido do
  -- perfil na altura de usar: senão o desconto prometido mudava sozinho
  -- sempre que o contabilista mexesse na tabela de preços.
  valor_base_cents integer NOT NULL CHECK (valor_base_cents >= 0),
  estado           text NOT NULL DEFAULT 'disponivel'
                     CHECK (estado IN ('disponivel', 'usado', 'expirado')),
  usado_em         timestamptz,
  usado_agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  expira_em        timestamptz NOT NULL DEFAULT (now() + interval '365 days')
);

CREATE INDEX IF NOT EXISTS fidelidade_cupoes_cliente_idx
  ON public.fidelidade_cupoes (cliente_id, estado);
CREATE INDEX IF NOT EXISTS fidelidade_cupoes_contabilista_idx
  ON public.fidelidade_cupoes (contabilista_id, estado);

-- A referência do agendamento ao cupão só se pode criar depois da tabela.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agendamentos_cupao_fk'
  ) THEN
    ALTER TABLE public.agendamentos
      ADD CONSTRAINT agendamentos_cupao_fk
      FOREIGN KEY (cupao_id) REFERENCES public.fidelidade_cupoes(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════════════
--  8. CARIMBAR — a única forma de um carimbo ou um cupão nascer
-- ════════════════════════════════════════════════════════════════════
-- Lição da migração 024: validar QUEM escreve não chega, é preciso validar
-- O QUE é escrito. A legitimidade de um carimbo depende de a consulta ter
-- mesmo acontecido — informação que uma política RLS não consegue avaliar.
--
-- Por isso o cliente não escreve nestas três tabelas de todo, e o carimbo
-- nasce aqui: uma transação, chamada só pela chave de serviço, depois de o
-- servidor já ter confirmado que quem pediu é o contabilista da consulta.

CREATE OR REPLACE FUNCTION public.carimbar_consulta(
  p_agendamento_id uuid,
  p_codigo_cupao   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ag        record;
  v_cfg       record;
  v_cartao    record;
  v_carimbos  integer;
  v_cupao_id  uuid;
  v_inseridos integer;
BEGIN
  SELECT * INTO v_ag FROM public.agendamentos WHERE id = p_agendamento_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'agendamento_inexistente');
  END IF;

  -- Só uma consulta REALIZADA carimba. Um pedido por confirmar, um
  -- cancelamento ou uma falta não são consultas.
  IF v_ag.estado <> 'realizada' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'consulta_nao_realizada');
  END IF;

  SELECT preco_consulta_cents, fidelidade_desconto_pct, fidelidade_meta, fidelidade_ativa
    INTO v_cfg
    FROM public.contabilistas
   WHERE user_id = v_ag.contabilista_id;

  IF NOT FOUND OR NOT v_cfg.fidelidade_ativa THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'fidelidade_inativa');
  END IF;

  -- Cartão aberto, ou abre-se um com a configuração DE AGORA — que fica
  -- congelada nele até ao fim.
  SELECT * INTO v_cartao
    FROM public.fidelidade_cartoes
   WHERE contabilista_id = v_ag.contabilista_id
     AND cliente_id = v_ag.cliente_id
     AND NOT completo
   FOR UPDATE;

  IF NOT FOUND THEN
    -- Duas consultas marcadas como realizadas ao mesmo tempo para o mesmo par
    -- chegam aqui as duas. `fidelidade_cartao_aberto_idx` deixa nascer um só
    -- cartão; a transação que perder relê o da outra em vez de rebentar.
    INSERT INTO public.fidelidade_cartoes
      (contabilista_id, cliente_id, carimbos, meta, desconto_pct, preco_base_cents)
    VALUES
      (v_ag.contabilista_id, v_ag.cliente_id, 0,
       v_cfg.fidelidade_meta, v_cfg.fidelidade_desconto_pct, v_cfg.preco_consulta_cents)
    ON CONFLICT DO NOTHING
    RETURNING * INTO v_cartao;

    IF v_cartao.id IS NULL THEN
      SELECT * INTO v_cartao
        FROM public.fidelidade_cartoes
       WHERE contabilista_id = v_ag.contabilista_id
         AND cliente_id = v_ag.cliente_id
         AND NOT completo
       FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'cartao_indisponivel');
      END IF;
    END IF;
  END IF;

  -- Idempotência: a segunda tentativa não insere nada e sai por aqui.
  INSERT INTO public.fidelidade_carimbos (cartao_id, agendamento_id)
  VALUES (v_cartao.id, p_agendamento_id)
  ON CONFLICT (agendamento_id) DO NOTHING;

  GET DIAGNOSTICS v_inseridos = ROW_COUNT;

  IF v_inseridos = 0 THEN
    RETURN jsonb_build_object(
      'ok', true, 'repetido', true, 'cartao_id', v_cartao.id,
      'carimbos', v_cartao.carimbos, 'meta', v_cartao.meta, 'completou', false
    );
  END IF;

  v_carimbos := v_cartao.carimbos + 1;

  IF v_carimbos < v_cartao.meta THEN
    UPDATE public.fidelidade_cartoes
       SET carimbos = v_carimbos
     WHERE id = v_cartao.id;

    RETURN jsonb_build_object(
      'ok', true, 'repetido', false, 'cartao_id', v_cartao.id,
      'carimbos', v_carimbos, 'meta', v_cartao.meta, 'completou', false
    );
  END IF;

  -- Cartão completo: fecha, emite o cupão com a percentagem CONGELADA no
  -- cartão (não com a configuração atual do contabilista) e abre outro.
  UPDATE public.fidelidade_cartoes
     SET carimbos = v_cartao.meta, completo = true, completo_em = now()
   WHERE id = v_cartao.id;

  INSERT INTO public.fidelidade_cupoes
    (codigo, contabilista_id, cliente_id, cartao_id, percentagem, valor_base_cents)
  VALUES
    (p_codigo_cupao, v_ag.contabilista_id, v_ag.cliente_id, v_cartao.id,
     v_cartao.desconto_pct, v_cartao.preco_base_cents)
  RETURNING id INTO v_cupao_id;

  INSERT INTO public.fidelidade_cartoes
    (contabilista_id, cliente_id, carimbos, meta, desconto_pct, preco_base_cents)
  VALUES
    (v_ag.contabilista_id, v_ag.cliente_id, 0,
     v_cfg.fidelidade_meta, v_cfg.fidelidade_desconto_pct, v_cfg.preco_consulta_cents);

  RETURN jsonb_build_object(
    'ok', true, 'repetido', false, 'cartao_id', v_cartao.id,
    'carimbos', v_cartao.meta, 'meta', v_cartao.meta, 'completou', true,
    'cupao_id', v_cupao_id, 'codigo', p_codigo_cupao,
    'percentagem', v_cartao.desconto_pct, 'valor_base_cents', v_cartao.preco_base_cents
  );
END;
$$;

-- Só a chave de serviço. Exposta a `authenticated`, esta função seria
-- exatamente o buraco que a migração 024 fechou no quiz.
REVOKE EXECUTE ON FUNCTION public.carimbar_consulta(uuid, text) FROM anon, authenticated, public;


-- ════════════════════════════════════════════════════════════════════
--  9. RLS
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE public.contabilista_pedidos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contabilistas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contabilista_vinculos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contabilista_disponibilidade  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contabilista_excecoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partilhas                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fidelidade_cartoes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fidelidade_carimbos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fidelidade_cupoes             ENABLE ROW LEVEL SECURITY;


-- ── Candidaturas ────────────────────────────────────────────────────
-- O próprio lê e cria a sua. A administração lê todas — é o objetivo do
-- envio. Ninguém ALTERA pela API pública: a decisão é escrita pelo servidor.

DROP POLICY IF EXISTS "pedidos_proprio_le" ON public.contabilista_pedidos;
CREATE POLICY "pedidos_proprio_le" ON public.contabilista_pedidos
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "pedidos_proprio_cria" ON public.contabilista_pedidos;
CREATE POLICY "pedidos_proprio_cria" ON public.contabilista_pedidos
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    -- Candidatar-se não é aprovar-se.
    AND estado = 'pendente'
    AND motivo_decisao IS NULL
    AND decidido_por IS NULL
    AND decidido_em IS NULL
  );

REVOKE UPDATE, DELETE ON public.contabilista_pedidos FROM anon, authenticated;


-- ── Contabilistas ───────────────────────────────────────────────────

-- O diretório público mostra só quem está aprovado. `anon` incluído: é uma
-- página indexável.
DROP POLICY IF EXISTS "contabilistas_diretorio_publico" ON public.contabilistas;
CREATE POLICY "contabilistas_diretorio_publico" ON public.contabilistas
  FOR SELECT TO anon, authenticated
  USING (estado = 'aprovado');

-- O próprio vê a sua ficha em qualquer estado (para saber que está suspenso).
DROP POLICY IF EXISTS "contabilistas_proprio_le" ON public.contabilistas;
CREATE POLICY "contabilistas_proprio_le" ON public.contabilistas
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- Edita o seu perfil e a sua configuração — nunca o estado, o titular ou o
-- endereço público, que o gatilho `contabilistas_tranca` recusa.
DROP POLICY IF EXISTS "contabilistas_proprio_edita" ON public.contabilistas;
CREATE POLICY "contabilistas_proprio_edita" ON public.contabilistas
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND estado = 'aprovado')
  WITH CHECK (user_id = (SELECT auth.uid()) AND estado = 'aprovado');

-- ⚠️ SEM política de INSERT, de propósito. A linha nasce pela chave de
-- serviço quando a administração aprova. Com INSERT aberto, qualquer conta
-- se inscrevia com estado='aprovado' e entrava no painel sem passar por
-- ninguém — e nenhum gatilho de UPDATE apanha uma linha que já nasce errada.
REVOKE INSERT, DELETE ON public.contabilistas FROM anon, authenticated;


-- ── Vínculos ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "vinculos_partes_leem" ON public.contabilista_vinculos;
CREATE POLICY "vinculos_partes_leem" ON public.contabilista_vinculos
  FOR SELECT TO authenticated
  USING (cliente_id = (SELECT auth.uid()) OR contabilista_id = (SELECT auth.uid()));

-- O cliente pede vínculo a um contabilista aprovado que aceita clientes.
DROP POLICY IF EXISTS "vinculos_cliente_pede" ON public.contabilista_vinculos;
CREATE POLICY "vinculos_cliente_pede" ON public.contabilista_vinculos
  FOR INSERT TO authenticated
  WITH CHECK (
    cliente_id = (SELECT auth.uid())
    AND origem = 'cliente'
    -- Pedir não é ser aceite: quem decide é o contabilista.
    AND estado = 'pendente'
    AND EXISTS (
      SELECT 1 FROM public.contabilistas c
      WHERE c.user_id = contabilista_id
        AND c.estado = 'aprovado'
        AND c.aceita_novos_clientes
    )
  );

-- O contabilista aceita, pausa ou termina. O cliente só pode terminar.
DROP POLICY IF EXISTS "vinculos_contabilista_decide" ON public.contabilista_vinculos;
CREATE POLICY "vinculos_contabilista_decide" ON public.contabilista_vinculos
  FOR UPDATE TO authenticated
  USING (contabilista_id = (SELECT auth.uid()))
  WITH CHECK (contabilista_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "vinculos_cliente_termina" ON public.contabilista_vinculos;
CREATE POLICY "vinculos_cliente_termina" ON public.contabilista_vinculos
  FOR UPDATE TO authenticated
  USING (cliente_id = (SELECT auth.uid()))
  WITH CHECK (cliente_id = (SELECT auth.uid()) AND estado = 'terminado');

REVOKE DELETE ON public.contabilista_vinculos FROM anon, authenticated;


-- ── Disponibilidade e exceções ──────────────────────────────────────
-- A semana-tipo é pública: é o que permite mostrar horários livres a quem
-- ainda não é cliente. As exceções também — dizem que o dia está fechado,
-- não porquê (o motivo é do contabilista, e a interface não o mostra).

DROP POLICY IF EXISTS "disponibilidade_publica" ON public.contabilista_disponibilidade;
CREATE POLICY "disponibilidade_publica" ON public.contabilista_disponibilidade
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contabilistas c
    WHERE c.user_id = contabilista_id AND c.estado = 'aprovado'
  ));

DROP POLICY IF EXISTS "disponibilidade_dono_gere" ON public.contabilista_disponibilidade;
CREATE POLICY "disponibilidade_dono_gere" ON public.contabilista_disponibilidade
  FOR ALL TO authenticated
  USING (contabilista_id = (SELECT auth.uid()))
  WITH CHECK (contabilista_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "excecoes_publicas" ON public.contabilista_excecoes;
CREATE POLICY "excecoes_publicas" ON public.contabilista_excecoes
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contabilistas c
    WHERE c.user_id = contabilista_id AND c.estado = 'aprovado'
  ));

DROP POLICY IF EXISTS "excecoes_dono_gere" ON public.contabilista_excecoes;
CREATE POLICY "excecoes_dono_gere" ON public.contabilista_excecoes
  FOR ALL TO authenticated
  USING (contabilista_id = (SELECT auth.uid()))
  WITH CHECK (contabilista_id = (SELECT auth.uid()));


-- ── Agendamentos ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "agendamentos_partes_leem" ON public.agendamentos;
CREATE POLICY "agendamentos_partes_leem" ON public.agendamentos
  FOR SELECT TO authenticated
  USING (cliente_id = (SELECT auth.uid()) OR contabilista_id = (SELECT auth.uid()));

-- Marcar exige vínculo ATIVO. Não exige plano nenhum — ver
-- `PARTILHA_NUNCA_EXIGE_PLUS` em `src/lib/contabilistas/vinculo.ts`.
DROP POLICY IF EXISTS "agendamentos_cliente_marca" ON public.agendamentos;
CREATE POLICY "agendamentos_cliente_marca" ON public.agendamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    cliente_id = (SELECT auth.uid())
    AND estado = 'pedido'
    AND public.vinculo_ativo(contabilista_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "agendamentos_contabilista_gere" ON public.agendamentos;
CREATE POLICY "agendamentos_contabilista_gere" ON public.agendamentos
  FOR UPDATE TO authenticated
  USING (contabilista_id = (SELECT auth.uid()))
  WITH CHECK (contabilista_id = (SELECT auth.uid()));

-- O cliente só pode cancelar o que é seu. Não pode marcar uma consulta como
-- realizada: se pudesse, carimbava o cartão sozinho.
DROP POLICY IF EXISTS "agendamentos_cliente_cancela" ON public.agendamentos;
CREATE POLICY "agendamentos_cliente_cancela" ON public.agendamentos
  FOR UPDATE TO authenticated
  USING (cliente_id = (SELECT auth.uid()))
  WITH CHECK (cliente_id = (SELECT auth.uid()) AND estado = 'cancelado_cliente');

REVOKE DELETE ON public.agendamentos FROM anon, authenticated;


-- ── Partilhas ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "partilhas_cliente_le" ON public.partilhas;
CREATE POLICY "partilhas_cliente_le" ON public.partilhas
  FOR SELECT TO authenticated
  USING (cliente_id = (SELECT auth.uid()));

-- O contabilista lê o que lhe foi enviado, enquanto não for revogado e
-- enquanto o vínculo não terminar. Terminar não apaga o histórico do
-- cliente — fecha o acesso de quem o recebeu.
DROP POLICY IF EXISTS "partilhas_contabilista_le" ON public.partilhas;
CREATE POLICY "partilhas_contabilista_le" ON public.partilhas
  FOR SELECT TO authenticated
  USING (
    contabilista_id = (SELECT auth.uid())
    AND estado <> 'revogada'
    AND public.vinculo_nao_terminado(contabilista_id, cliente_id)
  );

DROP POLICY IF EXISTS "partilhas_cliente_envia" ON public.partilhas;
CREATE POLICY "partilhas_cliente_envia" ON public.partilhas
  FOR INSERT TO authenticated
  WITH CHECK (
    cliente_id = (SELECT auth.uid())
    AND estado = 'enviada'
    AND revogada_em IS NULL
    AND char_length(consentimento_versao) > 0
    AND public.vinculo_ativo(contabilista_id, (SELECT auth.uid()))
  );

-- Revogar é do cliente e de mais ninguém.
DROP POLICY IF EXISTS "partilhas_cliente_revoga" ON public.partilhas;
CREATE POLICY "partilhas_cliente_revoga" ON public.partilhas
  FOR UPDATE TO authenticated
  USING (cliente_id = (SELECT auth.uid()))
  WITH CHECK (cliente_id = (SELECT auth.uid()) AND estado = 'revogada');

-- Marcar como vista é o único UPDATE do contabilista.
DROP POLICY IF EXISTS "partilhas_contabilista_marca_vista" ON public.partilhas;
CREATE POLICY "partilhas_contabilista_marca_vista" ON public.partilhas
  FOR UPDATE TO authenticated
  USING (
    contabilista_id = (SELECT auth.uid())
    AND estado = 'enviada'
    AND public.vinculo_nao_terminado(contabilista_id, cliente_id)
  )
  WITH CHECK (contabilista_id = (SELECT auth.uid()) AND estado = 'vista');

REVOKE DELETE ON public.partilhas FROM anon, authenticated;


-- ── Fidelidade: as duas partes LEEM, ninguém escreve ────────────────
-- Sem políticas de INSERT/UPDATE/DELETE. Com RLS ativa e nenhuma política a
-- permitir, ninguém escreve pela API pública — só `carimbar_consulta`, com a
-- chave de serviço. É a mesma forma da migração 040 para `admin_auditoria`.

DROP POLICY IF EXISTS "cartoes_partes_leem" ON public.fidelidade_cartoes;
CREATE POLICY "cartoes_partes_leem" ON public.fidelidade_cartoes
  FOR SELECT TO authenticated
  USING (cliente_id = (SELECT auth.uid()) OR contabilista_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "carimbos_partes_leem" ON public.fidelidade_carimbos;
CREATE POLICY "carimbos_partes_leem" ON public.fidelidade_carimbos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.fidelidade_cartoes c
    WHERE c.id = cartao_id
      AND (c.cliente_id = (SELECT auth.uid()) OR c.contabilista_id = (SELECT auth.uid()))
  ));

DROP POLICY IF EXISTS "cupoes_partes_leem" ON public.fidelidade_cupoes;
CREATE POLICY "cupoes_partes_leem" ON public.fidelidade_cupoes
  FOR SELECT TO authenticated
  USING (cliente_id = (SELECT auth.uid()) OR contabilista_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.fidelidade_cartoes  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.fidelidade_carimbos FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.fidelidade_cupoes   FROM anon, authenticated;


-- ════════════════════════════════════════════════════════════════════
--  10. DOCUMENTOS DAS CANDIDATURAS (Storage)
-- ════════════════════════════════════════════════════════════════════
-- Bucket PRIVADO. Os comprovativos de inscrição na Ordem são documentos de
-- identificação profissional; um bucket público punha-os numa URL adivinhável.

INSERT INTO storage.buckets (id, name, public)
VALUES ('contabilista-documentos', 'contabilista-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Cada pessoa escreve e lê apenas dentro da pasta com o seu próprio id.
DROP POLICY IF EXISTS "cont_docs_proprio_envia" ON storage.objects;
CREATE POLICY "cont_docs_proprio_envia" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contabilista-documentos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "cont_docs_proprio_le" ON storage.objects;
CREATE POLICY "cont_docs_proprio_le" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contabilista-documentos'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "cont_docs_proprio_apaga" ON storage.objects;
CREATE POLICY "cont_docs_proprio_apaga" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'contabilista-documentos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );


-- ════════════════════════════════════════════════════════════════════
--  11. COMENTÁRIOS
-- ════════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.contabilistas IS
  'Perfil público e configuração de um contabilista. A linha nasce pela chave de serviço na aprovação; `estado`, `user_id` e `slug` estão trancados por gatilho.';
COMMENT ON TABLE public.contabilista_pedidos IS
  'Candidaturas a conta de contabilista. Legíveis pelo próprio e pela administração; a decisão é escrita pelo servidor e registada em admin_auditoria.';
COMMENT ON TABLE public.partilhas IS
  'Cópias imutáveis de simulações que o cliente enviou ao seu contabilista, com consentimento gravado e revogáveis. É o ÚNICO caminho pelo qual dados fiscais chegam a um contabilista — não há política nenhuma que lhe dê acesso a recibos, cenarios ou recibos_vencimento.';
COMMENT ON TABLE public.fidelidade_cartoes IS
  'Cartão de fidelidade por par cliente/contabilista. Meta e percentagem congeladas na abertura: mudar a configuração afeta cartões novos, nunca os que estão a decorrer. Escrita só pela chave de serviço.';
COMMENT ON CONSTRAINT agendamentos_sem_sobreposicao ON public.agendamentos IS
  'Impede duas consultas sobrepostas do mesmo contabilista. Falha AO ESCREVER: entre ler os horários livres e gravar cabe outra pessoa, e uma verificação de leitura não fecha essa janela.';
COMMENT ON FUNCTION public.carimbar_consulta(uuid, text) IS
  'Carimba uma consulta realizada e emite o cupão quando o cartão fecha. Idempotente por UNIQUE(agendamento_id). Só a chave de serviço a pode chamar.';
