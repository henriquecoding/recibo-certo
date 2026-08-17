-- ═══════════════════════════════════════════════════════════════════════
--  PLATAFORMA DE CONTABILISTAS — TODAS AS MIGRAÇÕES, POR ORDEM
--  ---------------------------------------------------------------------
--  Este ficheiro é GERADO. Não o edites: corrige a migração de origem e
--  volta a correr `npm run migracoes:juntar`.
--
--  PARA QUE SERVE
--  --------------
--  Estas 29 migrações dependem umas das outras: a 046 usa tabelas
--  que a 042 cria, a 052 altera tabelas que a 048 e a 051 criam, e a
--  fronteira de contacto desfaz uma coluna que uma migração de agosto tinha
--  acabado de pôr numa RPC. Aplicá-las fora de ordem dá «relation does not
--  exist» no melhor dos casos, e o contacto do cliente de volta no pior.
--
--  Da primeira (042_plataforma_contabilistas.sql)
--  à última  (20260817120000_local_verificado_da_consulta.sql).
--
--  Este ficheiro tem-nas todas, pela ordem certa, num só bloco. Cola no
--  editor de SQL do Supabase e corre uma vez.
--
--  ANTES DE CORRER
--  ---------------
--   · As migrações 001 a 041 já têm de estar aplicadas. Este bloco
--     assume `public.profiles`, `public.is_admin()` e
--     `public.admin_auditoria`.
--   · É idempotente: correr duas vezes não estraga nada. Se falhar a
--     meio, corrige e volta a correr o ficheiro inteiro.
--   · Corre primeiro num branch do Supabase, e só depois em produção.
--
--  DEPOIS DE CORRER
--  ----------------
--  Configura `CRON_SECRET` no Vercel. Sem ele, os três trabalhos
--  periódicos recusam (que é o comportamento certo) — mas os emails de
--  aviso não saem, os anexos órfãos não são varridos e as propostas não
--  expiram.
-- ═══════════════════════════════════════════════════════════════════════


-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  042_plataforma_contabilistas.sql                                  ║
-- ╚═════════════════════════════════════════════════════════════════════╝

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

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  043_nome_e_lugar.sql                                              ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- 043_nome_e_lugar.sql
-- ═══════════════════════════════════════════════════════════════════════
--  QUEM É QUEM, E ONDE É
--  ---------------------------------------------------------------------
--  Duas lacunas que a plataforma tinha desde a 042, e que só se veem a usar.
--
--  1. O contabilista abria a lista de clientes e lia «Cliente desde outubro
--     de 2025». Mais nada. `contabilista_vinculos` guardava um id e um
--     estado — sem nome, não há lista ordenável, não há ficha de cliente,
--     não há forma de falar de alguém.
--
--     A correção NÃO é ir buscar o nome à conta. É o cliente que decide, no
--     momento em que pede o vínculo, por que nome quer ser tratado — e pode
--     não dizer nenhum: o vínculo funciona à mesma e o contabilista vê um
--     identificador curto.
--
--     O nome viaja no VÍNCULO, não na conta. Consequências deliberadas:
--       · dois contabilistas podem ver nomes diferentes da mesma pessoa;
--       · terminar o acompanhamento apaga o nome e o email de contacto,
--         porque a autorização para os ter acabou nesse instante.
--
--  2. `agendamentos.local_ou_ligacao` existe desde a 042, a rota de API
--     aceita-a e grava-a — e nenhum ecrã a lê. Quem marcava uma consulta
--     presencial nunca ficava a saber a morada, e quem marcava online nunca
--     recebia o link. Aqui só se documenta a coluna; a correção é de
--     interface, e é a mais barata de toda a lista.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. O nome e o contacto que o cliente escolhe dar ────────────────
ALTER TABLE public.contabilista_vinculos
  ADD COLUMN IF NOT EXISTS nome_cliente text
    CHECK (nome_cliente IS NULL OR char_length(nome_cliente) BETWEEN 2 AND 80),
  ADD COLUMN IF NOT EXISTS email_cliente text
    CHECK (email_cliente IS NULL OR char_length(email_cliente) BETWEEN 5 AND 180);

COMMENT ON COLUMN public.contabilista_vinculos.nome_cliente IS
  'Nome por que o cliente quer ser tratado NESTE vínculo. Opcional — sem ele o contabilista vê um identificador curto. Apagado ao terminar o acompanhamento.';
COMMENT ON COLUMN public.contabilista_vinculos.email_cliente IS
  'Email de contacto que o cliente decidiu partilhar com ESTE contabilista. Nunca vem da conta. Apagado ao terminar o acompanhamento.';


-- ── 2. O cliente pode mudar o nome; não pode mudar mais nada ────────
--
-- A política de UPDATE do cliente exigia `estado = 'terminado'`: qualquer
-- escrita dele tinha de ser uma despedida. Para poder corrigir o nome sem
-- terminar a relação, a política abre — e o que fecha passa a ser um
-- gatilho, que ao contrário de um `WITH CHECK` consegue comparar com a
-- linha antiga.
CREATE OR REPLACE FUNCTION public.vinculos_tranca_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Terminar leva o nome e o contacto com ele, seja quem for a terminar.
  -- A autorização para os ter acabou; guardá-los «só por histórico» seria
  -- ficar com dados pessoais para além do consentimento que os trouxe.
  IF NEW.estado = 'terminado' AND OLD.estado <> 'terminado' THEN
    NEW.nome_cliente := NULL;
    NEW.email_cliente := NULL;
  END IF;

  -- A chave de serviço e o contabilista seguem sem mais perguntas.
  IF auth.uid() IS NULL OR auth.uid() = NEW.contabilista_id THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = NEW.cliente_id THEN
    IF NEW.contabilista_id IS DISTINCT FROM OLD.contabilista_id
       OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
       OR NEW.origem IS DISTINCT FROM OLD.origem THEN
      RAISE EXCEPTION 'O cliente não pode alterar as partes do vínculo.';
    END IF;
    -- Aceitar-se a si próprio como cliente continua fora de questão: quem
    -- decide isso é o contabilista.
    IF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado <> 'terminado' THEN
      RAISE EXCEPTION 'O cliente só pode terminar o acompanhamento.';
    END IF;
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.vinculos_tranca_cliente() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS vinculos_tranca ON public.contabilista_vinculos;
CREATE TRIGGER vinculos_tranca
  BEFORE UPDATE ON public.contabilista_vinculos
  FOR EACH ROW EXECUTE FUNCTION public.vinculos_tranca_cliente();

-- Com o gatilho a fechar, a política pode deixar de exigir a despedida.
DROP POLICY IF EXISTS "vinculos_cliente_termina" ON public.contabilista_vinculos;
CREATE POLICY "vinculos_cliente_termina" ON public.contabilista_vinculos
  FOR UPDATE TO authenticated
  USING (cliente_id = (SELECT auth.uid()))
  WITH CHECK (cliente_id = (SELECT auth.uid()));


-- ── 3. A coluna que já existia e ninguém mostrava ───────────────────
COMMENT ON COLUMN public.agendamentos.local_ou_ligacao IS
  'Morada da consulta presencial, ou link da chamada. Preenchida pelo contabilista ao confirmar e mostrada ao cliente. Existe desde a 042; até à 043 nenhum ecrã a lia.';

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  044_conversa_e_avisos.sql                                         ║
-- ╚═════════════════════════════════════════════════════════════════════╝

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

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  045_trabalho_e_tipos.sql                                          ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- 045_trabalho_e_tipos.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O TRABALHO, EM ESTADOS — e as consultas, com feitios diferentes
--  ---------------------------------------------------------------------
--  Duas coisas que faltavam a quem gere clientes a sério.
--
--  1. TAREFAS. «Pedir o comprovativo ao cliente X», «entregar o IVA até
--     dia 20». A coluna que justifica o quadro inteiro é «à espera do
--     cliente»: é onde vive o trabalho parado, e é exatamente o que uma
--     lista esconde.
--
--     ⚠️ Sem percentagens. Um IVA não está «40% feito» — ou tem os
--     documentos ou não tem. O progresso é «3 de 5 passos», e é por isso
--     que os passos são uma tabela e não um número numa coluna.
--
--     As tarefas são PRIVADAS do contabilista. São as notas de trabalho
--     dele, e o cliente não as vê — para lhe pedir alguma coisa há a
--     conversa, que é onde uma pergunta a alguém deve ser feita.
--
--  2. TIPOS DE CONSULTA. Até aqui havia uma duração e um preço para tudo.
--     Uma «primeira conversa de 20 minutos, grátis» e um «fecho de contas
--     de duas horas» não são a mesma coisa, e tratá-las como se fossem
--     obriga o contabilista a escolher qual das duas mente.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Tarefas ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contabilista_tarefas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  -- Opcional: há trabalho que não é de ninguém em particular.
  vinculo_id      uuid REFERENCES public.contabilista_vinculos(id) ON DELETE SET NULL,
  titulo          text NOT NULL CHECK (char_length(titulo) BETWEEN 2 AND 200),
  notas           text CHECK (notas IS NULL OR char_length(notas) <= 2000),
  estado          text NOT NULL DEFAULT 'por_tratar'
                    CHECK (estado IN ('por_tratar', 'espera_cliente', 'em_curso', 'entregue')),
  prazo           date,
  etiquetas       text[] NOT NULL DEFAULT '{}',
  -- Id de uma obrigação do calendário fiscal (`src/lib/prazos.ts`), quando
  -- a tarefa nasce de uma. Texto e não referência: o calendário é código,
  -- não uma tabela, e inventar-lhe uma tabela para ter uma chave
  -- estrangeira seria duplicar a fonte de verdade.
  obrigacao       text CHECK (obrigacao IS NULL OR char_length(obrigacao) <= 80),
  -- Posição dentro da coluna. Reordenar é uma escrita só.
  ordem           integer NOT NULL DEFAULT 0,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  concluido_em    timestamptz,
  CONSTRAINT tarefas_entregue_tem_data CHECK (
    (estado = 'entregue' AND concluido_em IS NOT NULL)
    OR (estado <> 'entregue' AND concluido_em IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS tarefas_quadro_idx
  ON public.contabilista_tarefas (contabilista_id, estado, ordem, criado_em);
CREATE INDEX IF NOT EXISTS tarefas_prazo_idx
  ON public.contabilista_tarefas (contabilista_id, prazo)
  WHERE estado <> 'entregue';

-- `concluido_em` acompanha o estado sozinho. Deixá-lo a cargo de quem
-- escreve dava duas verdades: a coluna a dizer que está entregue e a data
-- a dizer que nunca o foi.
CREATE OR REPLACE FUNCTION public.tarefas_marca_conclusao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.estado = 'entregue' AND (TG_OP = 'INSERT' OR OLD.estado <> 'entregue') THEN
    NEW.concluido_em := now();
  ELSIF NEW.estado <> 'entregue' THEN
    NEW.concluido_em := NULL;
  END IF;
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tarefas_marca_conclusao() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS tarefas_conclusao ON public.contabilista_tarefas;
CREATE TRIGGER tarefas_conclusao
  BEFORE INSERT OR UPDATE ON public.contabilista_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.tarefas_marca_conclusao();


-- ── 2. Passos ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contabilista_tarefa_passos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL REFERENCES public.contabilista_tarefas(id) ON DELETE CASCADE,
  texto     text NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 200),
  feito     boolean NOT NULL DEFAULT false,
  ordem     integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS passos_tarefa_idx
  ON public.contabilista_tarefa_passos (tarefa_id, ordem);


-- ── 3. Tipos de consulta ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contabilista_tipos_consulta (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  nome            text NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 80),
  descricao       text CHECK (descricao IS NULL OR char_length(descricao) <= 300),
  duracao_min     integer NOT NULL CHECK (duracao_min BETWEEN 15 AND 240),
  -- Zero é um preço legítimo: a primeira conversa costuma ser grátis, e
  -- não poder dizê-lo obrigaria a inventar um valor.
  preco_cents     integer NOT NULL DEFAULT 0 CHECK (preco_cents >= 0),
  ativo           boolean NOT NULL DEFAULT true,
  ordem           integer NOT NULL DEFAULT 0,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tipos_consulta_idx
  ON public.contabilista_tipos_consulta (contabilista_id, ativo, ordem);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'agendamentos'
      AND column_name = 'tipo_consulta_id'
  ) THEN
    ALTER TABLE public.agendamentos
      ADD COLUMN tipo_consulta_id uuid
        REFERENCES public.contabilista_tipos_consulta(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ── 4. RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.contabilista_tarefas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contabilista_tarefa_passos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contabilista_tipos_consulta ENABLE ROW LEVEL SECURITY;

-- As tarefas são só do contabilista. Não há política para o cliente, e é
-- deliberado: são notas de trabalho, e o sítio para lhe pedir alguma coisa
-- é a conversa.
DROP POLICY IF EXISTS "tarefas_dono" ON public.contabilista_tarefas;
CREATE POLICY "tarefas_dono" ON public.contabilista_tarefas
  FOR ALL TO authenticated
  USING (contabilista_id = (SELECT auth.uid()))
  WITH CHECK (contabilista_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "passos_pela_tarefa" ON public.contabilista_tarefa_passos;
CREATE POLICY "passos_pela_tarefa" ON public.contabilista_tarefa_passos
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contabilista_tarefas t
    WHERE t.id = tarefa_id AND t.contabilista_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contabilista_tarefas t
    WHERE t.id = tarefa_id AND t.contabilista_id = (SELECT auth.uid())
  ));

-- Os tipos de consulta são públicos: é o que permite a quem ainda não é
-- cliente perceber o que pode marcar, e por quanto.
DROP POLICY IF EXISTS "tipos_publicos" ON public.contabilista_tipos_consulta;
CREATE POLICY "tipos_publicos" ON public.contabilista_tipos_consulta
  FOR SELECT TO anon, authenticated
  USING (ativo AND EXISTS (
    SELECT 1 FROM public.contabilistas c
    WHERE c.user_id = contabilista_id AND c.estado = 'aprovado'
  ));

DROP POLICY IF EXISTS "tipos_dono_gere" ON public.contabilista_tipos_consulta;
CREATE POLICY "tipos_dono_gere" ON public.contabilista_tipos_consulta
  FOR ALL TO authenticated
  USING (contabilista_id = (SELECT auth.uid()))
  WITH CHECK (contabilista_id = (SELECT auth.uid()));


COMMENT ON TABLE public.contabilista_tarefas IS
  'Trabalho do contabilista, em quatro estados. Privado: o cliente não vê tarefas — para lhe pedir alguma coisa há a conversa. Sem percentagens: o progresso são passos concluídos.';
COMMENT ON TABLE public.contabilista_tarefa_passos IS
  'Passos de uma tarefa. Existem como tabela, e não como número, porque «3 de 5» é uma afirmação verificável e «60%» é uma estimativa inventada.';
COMMENT ON TABLE public.contabilista_tipos_consulta IS
  'Feitios de consulta com duração e preço próprios. Preço zero é legítimo — a primeira conversa costuma ser grátis.';

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  046_p0_isolamento.sql                                             ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- 046_p0_isolamento.sql
-- ═══════════════════════════════════════════════════════════════════════
--  TRÊS BURACOS QUE A AUDITORIA DA PR #102 ENCONTROU
--  ---------------------------------------------------------------------
--  Ver `docs/auditorias/pr102/auditoria-profunda-pr102/part-02.md`, §10.
--  Os três são reais e foram confirmados contra o código antes de mexer.
--
--  P0.2 — O VÍNCULO PODIA MUDAR DE CLIENTE.
--    O gatilho da migração 043 só apertava quando `auth.uid()` era o
--    CLIENTE. Sendo o contabilista, saía por `RETURN NEW` sem verificar
--    nada — e podia reescrever `cliente_id` mantendo o seu próprio
--    `contabilista_id`. Como as mensagens pendem do vínculo, isso levava
--    o histórico de uma pessoa para dentro da conversa de outra.
--
--  P0.3 — SUSPENDER NÃO TIRAVA NADA.
--    As políticas perguntavam «és o contabilista deste vínculo?» e nunca
--    «ainda estás aprovado?». Um contabilista suspenso perdia o painel
--    (que é interface) e mantinha a leitura por REST (que é o que
--    interessa). A suspensão era um aviso, não uma sanção.
--
--  P0.4 — O SNAPSHOT NÃO ERA SNAPSHOT.
--    «Marcar como vista» era um UPDATE genérico com `WITH CHECK` sobre o
--    estado. Nada impedia reescrever `conteudo`, `tipo` ou `cliente_id` no
--    mesmo comando. Uma partilha é uma cópia do que estava no ecrã; se
--    pode ser reescrita depois, deixa de provar o que provava.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── P0.3 · Uma pergunta só, feita em todo o lado ────────────────────
--
-- «Este utilizador é um contabilista que PODE trabalhar agora?» —
-- diferente de `e_contabilista_aprovado`, que responde sobre a conta e
-- não sobre o momento. Centralizada para não haver a política que se
-- esqueceu: uma regra repetida em oito sítios corrige-se em sete.
CREATE OR REPLACE FUNCTION public.contabilista_ativo(p_user uuid)
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

REVOKE EXECUTE ON FUNCTION public.contabilista_ativo(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.contabilista_ativo(uuid) TO authenticated;

-- As funções de vínculo passam a exigir que o contabilista esteja ativo.
-- Como são elas que sustentam as políticas de mensagens, anexos, partilhas
-- e agendamentos, apertar aqui aperta tudo o que delas depende.
CREATE OR REPLACE FUNCTION public.vinculo_ativo(p_contabilista uuid, p_cliente uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilista_vinculos v
    JOIN public.contabilistas c ON c.user_id = v.contabilista_id
    WHERE v.contabilista_id = p_contabilista
      AND v.cliente_id = p_cliente
      AND v.estado = 'ativo'
      AND c.estado = 'aprovado'
  );
$$;

CREATE OR REPLACE FUNCTION public.vinculo_nao_terminado(p_contabilista uuid, p_cliente uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilista_vinculos v
    JOIN public.contabilistas c ON c.user_id = v.contabilista_id
    WHERE v.contabilista_id = p_contabilista
      AND v.cliente_id = p_cliente
      AND v.estado IN ('ativo', 'pausado')
      AND c.estado = 'aprovado'
  );
$$;

CREATE OR REPLACE FUNCTION public.parte_do_vinculo(p_vinculo uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilista_vinculos v
    JOIN public.contabilistas c ON c.user_id = v.contabilista_id
    WHERE v.id = p_vinculo
      AND v.estado IN ('ativo', 'pausado')
      AND c.estado = 'aprovado'
      AND (v.cliente_id = p_user OR v.contabilista_id = p_user)
  );
$$;

CREATE OR REPLACE FUNCTION public.parte_do_vinculo_ativo(p_vinculo uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contabilista_vinculos v
    JOIN public.contabilistas c ON c.user_id = v.contabilista_id
    WHERE v.id = p_vinculo
      AND v.estado = 'ativo'
      AND c.estado = 'aprovado'
      AND (v.cliente_id = p_user OR v.contabilista_id = p_user)
  );
$$;

-- A leitura dos vínculos também: um suspenso deixa de ver a sua carteira.
DROP POLICY IF EXISTS "vinculos_partes_leem" ON public.contabilista_vinculos;
CREATE POLICY "vinculos_partes_leem" ON public.contabilista_vinculos
  FOR SELECT TO authenticated
  USING (
    cliente_id = (SELECT auth.uid())
    OR (contabilista_id = (SELECT auth.uid())
        AND public.contabilista_ativo((SELECT auth.uid())))
  );

-- E a escrita. Um suspenso não aceita clientes novos nem mexe nos que tem.
DROP POLICY IF EXISTS "vinculos_contabilista_decide" ON public.contabilista_vinculos;
CREATE POLICY "vinculos_contabilista_decide" ON public.contabilista_vinculos
  FOR UPDATE TO authenticated
  USING (
    contabilista_id = (SELECT auth.uid())
    AND public.contabilista_ativo((SELECT auth.uid()))
  )
  WITH CHECK (
    contabilista_id = (SELECT auth.uid())
    AND public.contabilista_ativo((SELECT auth.uid()))
  );

-- As tarefas são do contabilista, mas só enquanto ele o for.
DROP POLICY IF EXISTS "tarefas_dono" ON public.contabilista_tarefas;
CREATE POLICY "tarefas_dono" ON public.contabilista_tarefas
  FOR ALL TO authenticated
  USING (contabilista_id = (SELECT auth.uid()) AND public.contabilista_ativo((SELECT auth.uid())))
  WITH CHECK (contabilista_id = (SELECT auth.uid()) AND public.contabilista_ativo((SELECT auth.uid())));


-- ── P0.2 · O vínculo não muda de partes, e ponto ────────────────────
--
-- O gatilho passa a apertar SEMPRE que há utilizador autenticado, e não
-- só quando ele é o cliente. As colunas de identidade ficam imutáveis
-- para toda a gente menos para a chave de serviço.
CREATE OR REPLACE FUNCTION public.vinculos_tranca_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.estado = 'terminado' AND OLD.estado <> 'terminado' THEN
    NEW.nome_cliente := NULL;
    NEW.email_cliente := NULL;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    -- As duas partes e a origem são a identidade do vínculo. Deixá-las
    -- mudar era permitir que uma conversa inteira trocasse de dono.
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.contabilista_id IS DISTINCT FROM OLD.contabilista_id
       OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
       OR NEW.origem IS DISTINCT FROM OLD.origem
       OR NEW.criado_em IS DISTINCT FROM OLD.criado_em THEN
      RAISE EXCEPTION 'As partes de um vínculo não se alteram.';
    END IF;

    -- Terminado é terminado. Ressuscitar um vínculo devolveria acesso a
    -- tudo o que tinha sido fechado, sem passar por pedido nenhum.
    IF OLD.estado = 'terminado' AND NEW.estado <> 'terminado' THEN
      RAISE EXCEPTION 'Um acompanhamento terminado não se reabre; pede-se de novo.';
    END IF;

    IF auth.uid() = NEW.cliente_id AND auth.uid() <> NEW.contabilista_id THEN
      IF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado <> 'terminado' THEN
        RAISE EXCEPTION 'O cliente só pode terminar o acompanhamento.';
      END IF;
      -- O recado é de quem o escreveu; reescrevê-lo depois de aceite
      -- mudaria o que o contabilista leu quando decidiu.
      IF NEW.mensagem IS DISTINCT FROM OLD.mensagem THEN
        RAISE EXCEPTION 'O recado do pedido não se altera.';
      END IF;
    END IF;

    -- O contabilista decide o estado; não escreve pelo cliente.
    IF auth.uid() = NEW.contabilista_id THEN
      IF NEW.nome_cliente IS DISTINCT FROM OLD.nome_cliente
         OR NEW.email_cliente IS DISTINCT FROM OLD.email_cliente THEN
        -- Exceto quando é a limpeza automática do fecho, tratada acima.
        IF NOT (NEW.estado = 'terminado' AND NEW.nome_cliente IS NULL) THEN
          RAISE EXCEPTION 'O nome e o contacto são dados pelo cliente.';
        END IF;
      END IF;
    END IF;
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.vinculos_tranca_cliente() FROM anon, authenticated, public;


-- ── P0.4 · Uma partilha é uma cópia, e cópias não se reescrevem ─────
CREATE OR REPLACE FUNCTION public.partilhas_imutaveis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  -- Tudo o que descreve O QUE foi enviado, e A QUEM, é imutável. O que
  -- pode mudar é só o percurso da partilha: vista, revogada.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.contabilista_id IS DISTINCT FROM OLD.contabilista_id
     OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
     OR NEW.tipo IS DISTINCT FROM OLD.tipo
     OR NEW.titulo IS DISTINCT FROM OLD.titulo
     OR NEW.conteudo IS DISTINCT FROM OLD.conteudo
     OR NEW.nota_cliente IS DISTINCT FROM OLD.nota_cliente
     OR NEW.consentimento_versao IS DISTINCT FROM OLD.consentimento_versao
     OR NEW.consentimento_em IS DISTINCT FROM OLD.consentimento_em
     OR NEW.criado_em IS DISTINCT FROM OLD.criado_em THEN
    RAISE EXCEPTION 'O conteúdo de uma partilha não se altera depois de enviada.';
  END IF;

  -- Revogar é definitivo. Sem isto, o contabilista que perdeu o acesso
  -- por revogação podia recuperá-lo pondo o estado de volta em «vista».
  IF OLD.estado = 'revogada' AND NEW.estado <> 'revogada' THEN
    RAISE EXCEPTION 'Uma partilha revogada não volta atrás.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.partilhas_imutaveis() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS partilhas_imutabilidade ON public.partilhas;
CREATE TRIGGER partilhas_imutabilidade
  BEFORE UPDATE ON public.partilhas
  FOR EACH ROW EXECUTE FUNCTION public.partilhas_imutaveis();


-- ── P0.6 (parte) · A chave de serviço precisa de poder carimbar ─────
-- `REVOKE … FROM public` tirou o direito a toda a gente, incluindo ao
-- papel que o servidor usa. A função existia e ninguém a podia chamar.
GRANT EXECUTE ON FUNCTION public.carimbar_consulta(uuid, text) TO service_role;


COMMENT ON FUNCTION public.contabilista_ativo(uuid) IS
  'Este utilizador é um contabilista que pode trabalhar AGORA. Diferente de e_contabilista_aprovado: responde sobre o momento, não sobre a conta. Usada por todas as políticas para que suspender signifique mesmo alguma coisa.';
COMMENT ON FUNCTION public.partilhas_imutaveis() IS
  'Uma partilha é uma cópia do que estava no ecrã. Só o percurso muda (vista, revogada); conteúdo, destinatário e consentimento não. Revogar é definitivo.';

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  047_rpcs_transacionais.sql                                        ║
-- ╚═════════════════════════════════════════════════════════════════════╝

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

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  048_storage_endurecido.sql                                        ║
-- ╚═════════════════════════════════════════════════════════════════════╝

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

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  049_apagar_com_manifesto.sql                                      ║
-- ╚═════════════════════════════════════════════════════════════════════╝

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

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  050_descarregar_com_autorizacao.sql                               ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- 050_descarregar_com_autorizacao.sql
-- ═══════════════════════════════════════════════════════════════════════
--  UM FICHEIRO SÓ SE ABRE A QUEM PODE ABRI-LO AGORA
--  ---------------------------------------------------------------------
--  Os anexos abriam-se com um URL assinado de cinco minutos, pedido pelo
--  browser. O problema não é a duração — é que a assinatura sobrevive à
--  autorização que a produziu.
--
--  Terminar o acompanhamento fecha o acesso a tudo (é o que a 042 garante
--  na base de dados). Mas um URL assinado um segundo antes continua a
--  funcionar durante os cinco minutos seguintes, porque o serviço de
--  armazenamento não sabe nada de vínculos: só verifica se a assinatura
--  bate certo. O mesmo se aplica a um contabilista suspenso.
--
--  E há uma segunda metade, mais silenciosa: a administração podia ler os
--  documentos de candidatura sem deixar rasto nenhum. `admin_auditoria`
--  existe desde a 040 e registava aprovações e recusas; abrir a cédula
--  profissional de alguém não passava por lá.
--
--  Aqui ficam as duas perguntas que a rota de descarregamento faz antes de
--  entregar seja o que for.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Este caminho é meu de ler, agora? ────────────────────────────
--
-- Devolve o nome do ficheiro se a resposta for sim, e NULL se for não. A
-- pergunta é feita com a identidade de quem pede, e no instante do pedido
-- — não no instante em que alguma coisa foi assinada.
CREATE OR REPLACE FUNCTION public.anexo_legivel(p_caminho text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  u    uuid := auth.uid();
  v_r  record;
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  SELECT a.nome, a.tipo_mime, a.bytes, m.vinculo_id
    INTO v_r
    FROM public.contabilista_anexos a
    JOIN public.contabilista_mensagens m ON m.id = a.mensagem_id
   WHERE a.caminho = p_caminho;

  IF v_r.vinculo_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'inexistente');
  END IF;

  -- `parte_do_vinculo` recusa vínculos terminados E contabilistas que não
  -- estejam aprovados. É a mesma função que governa a leitura das
  -- mensagens: um anexo não pode ser mais acessível do que a conversa a
  -- que pertence.
  IF NOT public.parte_do_vinculo(v_r.vinculo_id, u) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_acesso');
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'nome', v_r.nome, 'tipo', v_r.tipo_mime, 'bytes', v_r.bytes);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anexo_legivel(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.anexo_legivel(text) TO authenticated, service_role;


-- ── 2. A administração lê, e fica escrito que leu ───────────────────
--
-- Um documento de candidatura é a cédula profissional de alguém, ou o seu
-- cartão de cidadão. Ler isso é um ato, e um ato de administração que não
-- deixa rasto é indistinguível de um que não aconteceu.
--
-- O registo é escrito ANTES de o ficheiro ser entregue, e na mesma
-- transação da verificação: não há como ler sem ficar registado.
CREATE OR REPLACE FUNCTION public.documento_legivel_por_admin(p_caminho text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  u     uuid := auth.uid();
  dono  uuid;
  email text;
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  -- A pasta é o id de quem enviou — é assim que a 042 organiza este balde.
  BEGIN
    dono := ((storage.foldername(p_caminho))[1])::uuid;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'caminho_invalido');
  END;

  -- O próprio lê o que é seu, sem ficar registado: ler os próprios
  -- documentos não é um ato de administração.
  IF dono = u THEN
    RETURN jsonb_build_object('ok', true, 'proprio', true);
  END IF;

  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_acesso');
  END IF;

  SELECT p.email INTO email FROM public.profiles p WHERE p.id = u;

  INSERT INTO public.admin_auditoria (ator_id, ator_email, acao, alvo_id, detalhe)
  VALUES (u, email, 'documento_candidatura_lido', dono,
          jsonb_build_object('caminho', p_caminho));

  RETURN jsonb_build_object('ok', true, 'proprio', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.documento_legivel_por_admin(text)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.documento_legivel_por_admin(text)
  TO authenticated, service_role;


-- ── 3. Fechar a porta do lado do armazenamento ──────────────────────
--
-- Com o descarregamento a passar por uma rota, o browser deixa de precisar
-- de ler o balde por si — e o que não é preciso não fica aberto. A leitura
-- direta sai; quem entrega é a chave de serviço, depois de perguntar.
--
-- A política de leitura própria dos DOCUMENTOS fica: a página da
-- candidatura mostra à pessoa o que ela enviou, e isso não passa por
-- rota nenhuma.
-- Não basta apagar a política: um DELETE precisa de ver a linha que apaga,
-- e sem SELECT nenhum quem tinha enviado um anexo deixava de o poder
-- remover. O que se estreita é o alcance — de «qualquer parte do vínculo
-- lê qualquer objeto dele» para «cada um vê o que enviou».
DROP POLICY IF EXISTS "anexos_parte_le" ON storage.objects;
DROP POLICY IF EXISTS "anexos_autor_ve_o_que_enviou" ON storage.objects;
CREATE POLICY "anexos_autor_ve_o_que_enviou" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contabilista-anexos'
    AND EXISTS (
      SELECT 1 FROM public.anexo_vagas v
       WHERE v.caminho = storage.objects.name
         AND v.pedida_por = (SELECT auth.uid())
    )
  );

COMMENT ON FUNCTION public.anexo_legivel(text) IS
  'A autorização é verificada no instante do descarregamento. Um URL assinado sobrevive ao acesso que o produziu: terminar o acompanhamento não o invalidava.';
COMMENT ON FUNCTION public.documento_legivel_por_admin(text) IS
  'Regista a leitura ANTES de entregar. Um ato de administração que não deixa rasto é indistinguível de um que não aconteceu.';

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  051_intermediacao_casos.sql                                       ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- 051_intermediacao_casos.sql
-- ═══════════════════════════════════════════════════════════════════════
--  A RELAÇÃO PASSA A SER MEDIADA
--  ---------------------------------------------------------------------
--  Fases A, B e C de `docs/ESTRATEGIA-INTERMEDIACAO.md`.
--
--  Até aqui o cliente escolhia um contabilista e falavam livremente. Passa
--  a ser: o cliente DESCREVE O CASO, a plataforma intermedeia tudo o que é
--  dito, e o contabilista responde com uma PROPOSTA — sem nunca receber os
--  contactos.
--
--  A fronteira NÃO é entre saber quem é a pessoa e não saber. Um
--  contabilista precisa do nome e do NIF para fazer o trabalho e para
--  orçamentar com seriedade — escondê-los seria fingir que se pode
--  trabalhar às cegas.
--
--  A fronteira é o CANAL. O que ele não pode ter é por onde falar com a
--  pessoa fora daqui: email, telefone, morada. Sem isso, quem quiser
--  continuar a conversa volta à plataforma — e quem quiser mais clientes
--  sabe onde os encontrar.
--
--  E essa garantia não é uma política de privacidade nem uma coluna que
--  alguém se lembra de não devolver no `select`. São DUAS TABELAS:
--
--    · `caso_contactos` — email, telefone, morada. Só o próprio e a
--      administração lhe chegam.
--    · `casos` — a referência, o assunto, a situação, o nome e o NIF. É o
--      que o contabilista vê, e o `JOIN` que ele precisaria de fazer para
--      chegar à outra não passa por política nenhuma.
--
--  Não há `select` distraído que devolva um telefone, porque o telefone
--  não está na tabela que ele alcança. É o princípio da migração 038
--  levado ao fim.
--
--  As três decisões que estavam por tomar (§8 da estratégia), tomadas:
--
--    1. Um caso pode ir para VÁRIOS contabilistas, com um teto declarado
--       na interface e imposto aqui. Não é a mesma lead vendida a vários:
--       o cliente sabe, escolhe entre propostas, e nenhum deles recebe
--       dados pessoais.
--    2. A administração APROVA, DEVOLVE ou RECUSA. Pode redigir, mas o
--       original fica — uma revisão que apaga a prova do que foi dito não
--       é revisão, é reescrita.
--    3. A conversa livre só abre DEPOIS de uma proposta aceite. Aí já há
--       contrato, e a mediação deixa de fazer sentido.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. O caso ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.casos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Como o contabilista trata o caso. É isto que aparece no painel dele,
  -- e nunca um nome: «RC-2026-0041».
  referencia  text NOT NULL UNIQUE,
  -- O nome e o NIF ficam AQUI, do lado que o contabilista vê. Não são
  -- canais: com eles não se telefona a ninguém nem se manda um email — e
  -- sem eles não se faz o trabalho nem se orçamenta com seriedade.
  nome_completo text NOT NULL CHECK (char_length(nome_completo) BETWEEN 2 AND 160),
  -- Nove dígitos. O dígito de controlo valida-se na aplicação; aqui
  -- garante-se a forma, que é o que impede lixo de entrar.
  nif         text NOT NULL CHECK (nif ~ '^[0-9]{9}$'),
  assunto     text NOT NULL CHECK (char_length(assunto) BETWEEN 3 AND 160),
  situacao    text NOT NULL CHECK (char_length(situacao) BETWEEN 20 AND 4000),
  area        text NOT NULL CHECK (area IN (
                'irs', 'iva', 'contabilidade_organizada', 'inicio_atividade',
                'seguranca_social', 'empresa', 'herancas', 'outro')),
  urgencia    text NOT NULL DEFAULT 'normal'
                CHECK (urgencia IN ('normal', 'prazo_proximo', 'urgente')),
  -- Em cêntimos, como todo o dinheiro nesta base de dados. Opcional: nem
  -- toda a gente sabe quanto está disposta a pagar antes de perguntar.
  orcamento_cents integer CHECK (orcamento_cents IS NULL OR orcamento_cents >= 0),
  estado      text NOT NULL DEFAULT 'submetido' CHECK (estado IN (
                'rascunho', 'submetido', 'em_triagem', 'encaminhado',
                'com_proposta', 'aceite', 'recusado', 'fechado')),
  -- Por que é que a administração o recusou. Recusar sem dizer porquê
  -- deixa a pessoa sem saber o que corrigir.
  nota_triagem text CHECK (nota_triagem IS NULL OR char_length(nota_triagem) <= 1000),
  criado_em   timestamptz NOT NULL DEFAULT now(),
  submetido_em timestamptz,
  fechado_em  timestamptz
);

CREATE INDEX IF NOT EXISTS casos_cliente_idx ON public.casos (cliente_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS casos_triagem_idx ON public.casos (estado, criado_em)
  WHERE estado IN ('submetido', 'em_triagem');


-- ── 2. Os contactos, à parte ────────────────────────────────────────
--
-- Tabela separada, e não colunas separadas. A diferença é toda: uma
-- coluna alcança-se com um `select *` distraído; uma tabela sem política
-- para o contabilista não se alcança de maneira nenhuma.
--
-- A morada está aqui e não em `casos` porque também é um canal: sabe-se
-- onde a pessoa mora, aparece-se lá ou manda-se uma carta.
CREATE TABLE IF NOT EXISTS public.caso_contactos (
  caso_id       uuid PRIMARY KEY REFERENCES public.casos(id) ON DELETE CASCADE,
  email         text NOT NULL CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  telefone      text CHECK (telefone IS NULL OR char_length(telefone) BETWEEN 6 AND 20),
  morada        text CHECK (morada IS NULL OR char_length(morada) <= 300),
  criado_em     timestamptz NOT NULL DEFAULT now()
);


-- ── 3. Documentos do caso ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.caso_documentos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id     uuid NOT NULL REFERENCES public.casos(id) ON DELETE CASCADE,
  caminho     text NOT NULL UNIQUE,
  nome        text NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 200),
  bytes       integer NOT NULL CHECK (bytes > 0 AND bytes <= 10485760),
  tipo_mime   text NOT NULL,
  -- Um documento que o cliente anexou pode conter o nome dele. Só passa
  -- ao contabilista depois de a administração o ver e libertar.
  libertado_em timestamptz,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS caso_documentos_caso_idx ON public.caso_documentos (caso_id);


-- ── 4. Encaminhamento ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.caso_encaminhamentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id         uuid NOT NULL REFERENCES public.casos(id) ON DELETE CASCADE,
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  estado          text NOT NULL DEFAULT 'convidado'
                    CHECK (estado IN ('convidado', 'aceite', 'recusado', 'retirado')),
  encaminhado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  encaminhado_em  timestamptz NOT NULL DEFAULT now(),
  decidido_em     timestamptz,
  motivo          text CHECK (motivo IS NULL OR char_length(motivo) <= 500),
  UNIQUE (caso_id, contabilista_id)
);

CREATE INDEX IF NOT EXISTS encaminhamentos_contabilista_idx
  ON public.caso_encaminhamentos (contabilista_id, estado, encaminhado_em DESC);

/* Quantos contabilistas por caso. Está aqui, e não na interface, porque
   um teto que vive num ecrã é uma sugestão. */
CREATE OR REPLACE FUNCTION public.teto_de_encaminhamentos() RETURNS integer
LANGUAGE sql IMMUTABLE AS $$ SELECT 3 $$;

CREATE OR REPLACE FUNCTION public.encaminhamentos_dentro_do_teto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.caso_encaminhamentos e
   WHERE e.caso_id = NEW.caso_id AND e.estado <> 'retirado';
  IF n > public.teto_de_encaminhamentos() THEN
    RAISE EXCEPTION 'Um caso vai no máximo para % contabilistas.',
      public.teto_de_encaminhamentos();
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS encaminhamentos_dentro_do_teto ON public.caso_encaminhamentos;
CREATE TRIGGER encaminhamentos_dentro_do_teto
  AFTER INSERT ON public.caso_encaminhamentos
  FOR EACH ROW EXECUTE FUNCTION public.encaminhamentos_dentro_do_teto();


-- ── 5. A conversa mediada ───────────────────────────────────────────
--
-- Nada do que aqui se escreve existe para o outro lado antes de ser
-- aprovado. Não é uma regra da aplicação: é o estado inicial da linha, e
-- não há política que deixe nascer aprovada.
CREATE TABLE IF NOT EXISTS public.caso_mensagens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id      uuid NOT NULL REFERENCES public.casos(id) ON DELETE CASCADE,
  autor_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  autor_papel  text NOT NULL CHECK (autor_papel IN ('cliente', 'contabilista')),
  corpo        text NOT NULL CHECK (char_length(corpo) BETWEEN 1 AND 4000),
  estado       text NOT NULL DEFAULT 'submetida'
                 CHECK (estado IN ('submetida', 'aprovada', 'devolvida', 'recusada')),
  -- O que o outro lado lê, quando difere do original. O original FICA:
  -- uma revisão que o apaga não é revisão, é reescrita.
  corpo_encaminhado text CHECK (corpo_encaminhado IS NULL
                                OR char_length(corpo_encaminhado) BETWEEN 1 AND 4000),
  revisto_por  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revisto_em   timestamptz,
  -- «Devolvida» existe de propósito: recusar sem dizer o que corrigir
  -- deixa a pessoa a adivinhar.
  nota_revisao text CHECK (nota_revisao IS NULL OR char_length(nota_revisao) <= 500),
  criado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS caso_mensagens_caso_idx
  ON public.caso_mensagens (caso_id, criado_em);
CREATE INDEX IF NOT EXISTS caso_mensagens_fila_idx
  ON public.caso_mensagens (criado_em) WHERE estado = 'submetida';

-- O corpo submetido não se reescreve, nem por quem o escreveu nem por
-- quem o revê. Sem isto, «aprovado» deixava de dizer o que foi aprovado.
CREATE OR REPLACE FUNCTION public.mensagem_corpo_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.corpo IS DISTINCT FROM OLD.corpo
     OR NEW.autor_id IS DISTINCT FROM OLD.autor_id
     OR NEW.autor_papel IS DISTINCT FROM OLD.autor_papel
     OR NEW.caso_id IS DISTINCT FROM OLD.caso_id THEN
    RAISE EXCEPTION 'O que foi submetido não se reescreve.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mensagem_corpo_imutavel ON public.caso_mensagens;
CREATE TRIGGER mensagem_corpo_imutavel
  BEFORE UPDATE ON public.caso_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.mensagem_corpo_imutavel();


-- ── 6. A proposta ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.propostas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id         uuid NOT NULL REFERENCES public.casos(id) ON DELETE CASCADE,
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  corpo           text NOT NULL CHECK (char_length(corpo) BETWEEN 20 AND 20000),
  valor_cents     integer NOT NULL CHECK (valor_cents >= 0),
  iva_incluido    boolean NOT NULL DEFAULT false,
  prazo_execucao  text CHECK (prazo_execucao IS NULL OR char_length(prazo_execucao) <= 200),
  validade_ate    date,
  estado          text NOT NULL DEFAULT 'enviada' CHECK (estado IN (
                    'enviada', 'lida', 'aceite', 'desconto_pedido',
                    'recusada', 'expirada', 'substituida')),
  -- As duas colunas que fazem a regra que o utilizador pediu ser
  -- estrutural, e não um botão desativado.
  lida_ate_ao_fim_em timestamptz,
  confirmacao_em     timestamptz,
  decidida_em     timestamptz,
  motivo          text CHECK (motivo IS NULL OR char_length(motivo) <= 1000),
  -- Uma proposta nova não reescreve a anterior: aponta-lhe.
  substitui       uuid REFERENCES public.propostas(id) ON DELETE SET NULL,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS propostas_caso_idx ON public.propostas (caso_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS propostas_contabilista_idx
  ON public.propostas (contabilista_id, criado_em DESC);

CREATE TABLE IF NOT EXISTS public.proposta_anexos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  caminho     text NOT NULL UNIQUE,
  nome        text NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 200),
  bytes       integer NOT NULL CHECK (bytes > 0 AND bytes <= 10485760),
  tipo_mime   text NOT NULL,
  -- Um contrato é diferente de um anexo qualquer: é o que a pessoa tem
  -- de ler até ao fim antes de poder decidir.
  e_contrato  boolean NOT NULL DEFAULT false,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposta_anexos_idx ON public.proposta_anexos (proposta_id);

-- Uma proposta enviada é um documento. O valor, o corpo e o prazo não se
-- mexem depois de sair — quem quiser mudar envia outra, e a anterior fica
-- no histórico a dizer o que tinha sido oferecido.
CREATE OR REPLACE FUNCTION public.proposta_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.corpo IS DISTINCT FROM OLD.corpo
     OR NEW.valor_cents IS DISTINCT FROM OLD.valor_cents
     OR NEW.iva_incluido IS DISTINCT FROM OLD.iva_incluido
     OR NEW.prazo_execucao IS DISTINCT FROM OLD.prazo_execucao
     OR NEW.caso_id IS DISTINCT FROM OLD.caso_id
     OR NEW.contabilista_id IS DISTINCT FROM OLD.contabilista_id THEN
    RAISE EXCEPTION 'Uma proposta enviada não se reescreve. Envia outra.';
  END IF;
  -- Nem a leitura se desfaz: se pudesse voltar a nulo, a garantia de «só
  -- decide quem leu» durava até alguém a apagar.
  IF OLD.lida_ate_ao_fim_em IS NOT NULL AND NEW.lida_ate_ao_fim_em IS NULL THEN
    RAISE EXCEPTION 'A leitura não se desfaz.';
  END IF;
  IF OLD.confirmacao_em IS NOT NULL AND NEW.confirmacao_em IS NULL THEN
    RAISE EXCEPTION 'A confirmação não se desfaz.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proposta_imutavel ON public.propostas;
CREATE TRIGGER proposta_imutavel
  BEFORE UPDATE ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.proposta_imutavel();


-- ═══════════════════════════════════════════════════════════════════════
--  RLS — quem alcança o quê
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.casos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caso_contactos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caso_documentos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caso_encaminhamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caso_mensagens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propostas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposta_anexos      ENABLE ROW LEVEL SECURITY;

-- ── Quem está encaminhado para este caso? ───────────────────────────
CREATE OR REPLACE FUNCTION public.encaminhado_para(p_caso uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.caso_encaminhamentos e
      JOIN public.contabilistas c ON c.user_id = e.contabilista_id
     WHERE e.caso_id = p_caso
       AND e.contabilista_id = p_user
       AND e.estado IN ('convidado', 'aceite')
       -- Um contabilista suspenso deixa de alcançar o que já lhe tinha
       -- sido encaminhado. É a mesma regra da migração 046.
       AND c.estado = 'aprovado'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.encaminhado_para(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.encaminhado_para(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dono_do_caso(p_caso uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.casos c
                  WHERE c.id = p_caso AND c.cliente_id = p_user);
$$;

REVOKE EXECUTE ON FUNCTION public.dono_do_caso(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.dono_do_caso(uuid, uuid) TO authenticated, service_role;


-- ── `casos` ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "casos_dono_le" ON public.casos;
CREATE POLICY "casos_dono_le" ON public.casos
  FOR SELECT TO authenticated
  USING (
    cliente_id = (SELECT auth.uid())
    OR public.encaminhado_para(id, (SELECT auth.uid()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "casos_dono_cria" ON public.casos;
CREATE POLICY "casos_dono_cria" ON public.casos
  FOR INSERT TO authenticated
  WITH CHECK (cliente_id = (SELECT auth.uid()));

-- As transições passam por RPC. Aqui não há UPDATE para ninguém — nem
-- para a administração, que também transita por função e deixa rasto.
REVOKE UPDATE, DELETE ON public.casos FROM anon, authenticated;


-- ── `caso_contactos` — a tabela que o contabilista não alcança ──────
--
-- Não há política nenhuma que o inclua. Não é um `USING` que o exclui: é
-- a ausência de qualquer caminho. Um `USING` errado um dia abre-se; o que
-- não existe não se abre por engano.
DROP POLICY IF EXISTS "contactos_dono_le" ON public.caso_contactos;
CREATE POLICY "contactos_dono_le" ON public.caso_contactos
  FOR SELECT TO authenticated
  USING (
    public.dono_do_caso(caso_id, (SELECT auth.uid()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "contactos_dono_cria" ON public.caso_contactos;
CREATE POLICY "contactos_dono_cria" ON public.caso_contactos
  FOR INSERT TO authenticated
  WITH CHECK (public.dono_do_caso(caso_id, (SELECT auth.uid())));

-- Corrigir um telefone mal escrito é legítimo; trocar o email depois de o
-- caso seguir não é — era mudar para onde vão os avisos. O que se pode
-- mexer está no grant, por coluna.
REVOKE UPDATE, DELETE ON public.caso_contactos FROM anon, authenticated;
GRANT UPDATE (telefone, morada) ON public.caso_contactos TO authenticated;

DROP POLICY IF EXISTS "contactos_dono_corrige" ON public.caso_contactos;
CREATE POLICY "contactos_dono_corrige" ON public.caso_contactos
  FOR UPDATE TO authenticated
  USING (public.dono_do_caso(caso_id, (SELECT auth.uid())))
  WITH CHECK (public.dono_do_caso(caso_id, (SELECT auth.uid())));


-- ── `caso_documentos` ───────────────────────────────────────────────
DROP POLICY IF EXISTS "caso_docs_le" ON public.caso_documentos;
CREATE POLICY "caso_docs_le" ON public.caso_documentos
  FOR SELECT TO authenticated
  USING (
    public.dono_do_caso(caso_id, (SELECT auth.uid()))
    OR public.is_admin()
    -- O contabilista só vê o que a administração libertou: um documento
    -- que o cliente anexou pode ter o nome dele lá dentro.
    OR (libertado_em IS NOT NULL
        AND public.encaminhado_para(caso_id, (SELECT auth.uid())))
  );

REVOKE INSERT, UPDATE, DELETE ON public.caso_documentos FROM anon, authenticated;


-- ── `caso_encaminhamentos` ──────────────────────────────────────────
DROP POLICY IF EXISTS "encaminhamentos_partes_leem" ON public.caso_encaminhamentos;
CREATE POLICY "encaminhamentos_partes_leem" ON public.caso_encaminhamentos
  FOR SELECT TO authenticated
  USING (
    contabilista_id = (SELECT auth.uid())
    OR public.dono_do_caso(caso_id, (SELECT auth.uid()))
    OR public.is_admin()
  );

REVOKE INSERT, UPDATE, DELETE ON public.caso_encaminhamentos FROM anon, authenticated;


-- ── `caso_mensagens` — o coração da mediação ────────────────────────
--
-- Quem escreveu vê sempre o que escreveu, em qualquer estado. O outro
-- lado vê apenas o que foi APROVADO. A administração vê tudo, porque é o
-- trabalho dela.
DROP POLICY IF EXISTS "caso_mensagens_le" ON public.caso_mensagens;
CREATE POLICY "caso_mensagens_le" ON public.caso_mensagens
  FOR SELECT TO authenticated
  USING (
    autor_id = (SELECT auth.uid())
    OR public.is_admin()
    OR (
      estado = 'aprovada'
      AND (
        public.dono_do_caso(caso_id, (SELECT auth.uid()))
        OR public.encaminhado_para(caso_id, (SELECT auth.uid()))
      )
    )
  );

-- Nasce SUBMETIDA. O `WITH CHECK` não deixa outra coisa entrar, e por
-- isso «aprovada» é um estado a que só a revisão chega.
DROP POLICY IF EXISTS "caso_mensagens_escreve" ON public.caso_mensagens;
CREATE POLICY "caso_mensagens_escreve" ON public.caso_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND estado = 'submetida'
    AND corpo_encaminhado IS NULL
    AND revisto_por IS NULL
    AND revisto_em IS NULL
    AND (
      (autor_papel = 'cliente' AND public.dono_do_caso(caso_id, (SELECT auth.uid())))
      OR (autor_papel = 'contabilista'
          AND public.encaminhado_para(caso_id, (SELECT auth.uid())))
    )
  );

REVOKE UPDATE, DELETE ON public.caso_mensagens FROM anon, authenticated;


-- ── `propostas` ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "propostas_partes_leem" ON public.propostas;
CREATE POLICY "propostas_partes_leem" ON public.propostas
  FOR SELECT TO authenticated
  USING (
    contabilista_id = (SELECT auth.uid())
    OR public.dono_do_caso(caso_id, (SELECT auth.uid()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "propostas_contabilista_envia" ON public.propostas;
CREATE POLICY "propostas_contabilista_envia" ON public.propostas
  FOR INSERT TO authenticated
  WITH CHECK (
    contabilista_id = (SELECT auth.uid())
    AND public.encaminhado_para(caso_id, (SELECT auth.uid()))
    AND estado = 'enviada'
    -- Nasce por ler e por confirmar. Chegar cá com as duas preenchidas
    -- seria uma proposta que se aceita a si própria.
    AND lida_ate_ao_fim_em IS NULL
    AND confirmacao_em IS NULL
    AND decidida_em IS NULL
  );

REVOKE UPDATE, DELETE ON public.propostas FROM anon, authenticated;

DROP POLICY IF EXISTS "proposta_anexos_leem" ON public.proposta_anexos;
CREATE POLICY "proposta_anexos_leem" ON public.proposta_anexos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.propostas p
     WHERE p.id = proposta_id
       AND (p.contabilista_id = (SELECT auth.uid())
            OR public.dono_do_caso(p.caso_id, (SELECT auth.uid()))
            OR public.is_admin())
  ));

REVOKE INSERT, UPDATE, DELETE ON public.proposta_anexos FROM anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════
--  AS TRANSIÇÕES — funções com precondição, como na migração 047
-- ═══════════════════════════════════════════════════════════════════════

-- ── A referência do caso ────────────────────────────────────────────
-- «RC-2026-0041». Sequencial por ano, e gerada aqui: se viesse de fora,
-- quem submetesse escolhia a sua — e a referência é o nome pelo qual o
-- contabilista trata a pessoa.
CREATE SEQUENCE IF NOT EXISTS public.caso_referencia_seq;

CREATE OR REPLACE FUNCTION public.gerar_referencia_de_caso()
RETURNS text
LANGUAGE sql VOLATILE SET search_path = ''
AS $$
  SELECT 'RC-' || to_char(now(), 'YYYY') || '-'
         || lpad(nextval('public.caso_referencia_seq')::text, 4, '0');
$$;

REVOKE EXECUTE ON FUNCTION public.gerar_referencia_de_caso()
  FROM anon, authenticated, public;


-- ── Submeter um caso ────────────────────────────────────────────────
--
-- Cria o caso E a identidade na MESMA transação. Separadas, um caso podia
-- ficar sem identidade — e um caso sem identidade não se pode encaminhar
-- nem devolver a ninguém.
CREATE OR REPLACE FUNCTION public.submeter_caso(
  p_assunto   text,
  p_situacao  text,
  p_area      text,
  p_urgencia  text,
  p_nome      text,
  p_nif       text,
  p_email     text,
  p_telefone  text DEFAULT NULL,
  p_morada    text DEFAULT NULL,
  p_orcamento integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  u    uuid := auth.uid();
  v_id uuid;
  v_ref text;
  v_abertos integer;
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  -- Um caso de cada vez por área. Sem isto, o mesmo pedido submetido
  -- cinco vezes ocupava cinco contabilistas com o mesmo trabalho.
  SELECT count(*) INTO v_abertos FROM public.casos c
   WHERE c.cliente_id = u
     AND c.area = p_area
     AND c.estado IN ('submetido', 'em_triagem', 'encaminhado', 'com_proposta');
  IF v_abertos >= 1 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ja_tens_um_caso_aberto');
  END IF;

  v_ref := public.gerar_referencia_de_caso();

  INSERT INTO public.casos
    (cliente_id, referencia, nome_completo, nif, assunto, situacao, area,
     urgencia, orcamento_cents, estado, submetido_em)
  VALUES
    (u, v_ref, btrim(p_nome), btrim(p_nif), btrim(p_assunto), btrim(p_situacao),
     p_area, coalesce(p_urgencia, 'normal'), p_orcamento, 'submetido', now())
  RETURNING id INTO v_id;

  INSERT INTO public.caso_contactos (caso_id, email, telefone, morada)
  VALUES
    (v_id, lower(btrim(p_email)),
     nullif(btrim(coalesce(p_telefone, '')), ''),
     nullif(btrim(coalesce(p_morada, '')), ''));

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'referencia', v_ref);
EXCEPTION
  WHEN check_violation THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'dados_invalidos');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submeter_caso(text, text, text, text, text, text, text, text, text, integer)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submeter_caso(text, text, text, text, text, text, text, text, text, integer)
  TO authenticated, service_role;


-- ── Encaminhar ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.encaminhar_caso(
  p_caso uuid, p_contabilista uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE u uuid := auth.uid(); email text;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'so_a_administracao');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contabilistas c
                  WHERE c.user_id = p_contabilista AND c.estado = 'aprovado') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'contabilista_nao_aprovado');
  END IF;

  UPDATE public.casos SET estado = 'encaminhado'
   WHERE id = p_caso AND estado IN ('submetido', 'em_triagem', 'encaminhado');
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'caso_nao_encaminhavel');
  END IF;

  BEGIN
    INSERT INTO public.caso_encaminhamentos (caso_id, contabilista_id, encaminhado_por)
    VALUES (p_caso, p_contabilista, u);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'ja_encaminhado');
    WHEN raise_exception THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'teto_atingido');
  END;

  SELECT p.email INTO email FROM public.profiles p WHERE p.id = u;
  INSERT INTO public.admin_auditoria (ator_id, ator_email, acao, alvo_id, detalhe)
  VALUES (u, email, 'caso_encaminhado', p_contabilista,
          jsonb_build_object('caso', p_caso));

  PERFORM public.avisar_utilizador(
    p_contabilista, 'vinculo_pedido', 'Um caso novo para ti',
    'Vê o pedido e decide se o queres.', '/contabilista/casos');

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.encaminhar_caso(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.encaminhar_caso(uuid, uuid) TO authenticated, service_role;


-- ── Rever uma mensagem ──────────────────────────────────────────────
--
-- Aprovar, devolver ou recusar. Não há «editar»: se a administração
-- precisa de redigir, escreve em `corpo_encaminhado` e o original fica.
CREATE OR REPLACE FUNCTION public.rever_mensagem(
  p_mensagem uuid,
  p_decisao  text,
  p_nota     text DEFAULT NULL,
  p_redigido text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  u uuid := auth.uid();
  v_id uuid; v_caso uuid; v_papel text; v_destino uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'so_a_administracao');
  END IF;
  IF p_decisao NOT IN ('aprovar', 'devolver', 'recusar') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'decisao_invalida');
  END IF;
  -- Devolver sem dizer o que corrigir deixa a pessoa a adivinhar.
  IF p_decisao IN ('devolver', 'recusar')
     AND nullif(btrim(coalesce(p_nota, '')), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'falta_a_razao');
  END IF;

  UPDATE public.caso_mensagens m
     SET estado = CASE p_decisao WHEN 'aprovar' THEN 'aprovada'
                                 WHEN 'devolver' THEN 'devolvida'
                                 ELSE 'recusada' END,
         corpo_encaminhado = CASE WHEN p_decisao = 'aprovar'
                                  THEN nullif(btrim(coalesce(p_redigido, '')), '')
                                  ELSE NULL END,
         revisto_por = u,
         revisto_em = now(),
         nota_revisao = nullif(btrim(coalesce(p_nota, '')), '')
   WHERE m.id = p_mensagem
     AND m.estado = 'submetida'
  RETURNING m.id, m.caso_id, m.autor_papel INTO v_id, v_caso, v_papel;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ja_revista');
  END IF;

  INSERT INTO public.admin_auditoria (ator_id, acao, alvo_id, detalhe)
  VALUES (u, 'mensagem_revista', v_id,
          jsonb_build_object('decisao', p_decisao, 'caso', v_caso,
                             'redigida', p_redigido IS NOT NULL));

  -- Só o outro lado é avisado, e só quando há o que ler.
  IF p_decisao = 'aprovar' THEN
    IF v_papel = 'cliente' THEN
      SELECT e.contabilista_id INTO v_destino FROM public.caso_encaminhamentos e
       WHERE e.caso_id = v_caso AND e.estado IN ('convidado', 'aceite') LIMIT 1;
      PERFORM public.avisar_utilizador(v_destino, 'mensagem',
        'Mensagem nova no caso', NULL, '/contabilista/casos');
    ELSE
      SELECT c.cliente_id INTO v_destino FROM public.casos c WHERE c.id = v_caso;
      PERFORM public.avisar_utilizador(v_destino, 'mensagem',
        'Tens resposta no teu caso', NULL, '/dashboard/casos');
    END IF;
  ELSE
    SELECT m.autor_id INTO v_destino FROM public.caso_mensagens m WHERE m.id = v_id;
    PERFORM public.avisar_utilizador(v_destino, 'mensagem',
      CASE WHEN p_decisao = 'devolver'
           THEN 'A tua mensagem precisa de um ajuste'
           ELSE 'A tua mensagem não foi encaminhada' END,
      left(coalesce(p_nota, ''), 500), '/dashboard/casos');
  END IF;

  RETURN jsonb_build_object('ok', true, 'estado', p_decisao);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rever_mensagem(uuid, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rever_mensagem(uuid, text, text, text)
  TO authenticated, service_role;


-- ── Ler até ao fim, e confirmar ─────────────────────────────────────
--
-- A regra que o utilizador pediu, e que tem de ser estrutural: para
-- aceitar, pedir desconto ou recusar, o cliente tem primeiro de ler até ao
-- fim e confirmar.
--
-- O botão desativado na interface é conveniência. A garantia é isto: duas
-- colunas que só estas funções escrevem, e uma decisão que as exige.
CREATE OR REPLACE FUNCTION public.marcar_proposta_lida(p_proposta uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  UPDATE public.propostas p
     SET lida_ate_ao_fim_em = coalesce(p.lida_ate_ao_fim_em, now()),
         estado = CASE WHEN p.estado = 'enviada' THEN 'lida' ELSE p.estado END
   WHERE p.id = p_proposta
     AND public.dono_do_caso(p.caso_id, auth.uid())
     AND p.estado IN ('enviada', 'lida')
  RETURNING p.id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_e_tua_ou_ja_decidida');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_leitura_da_proposta(p_proposta uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  -- Confirmar sem ter chegado ao fim não é confirmar. A ordem é imposta
  -- aqui, e não na ordem por que os botões aparecem no ecrã.
  UPDATE public.propostas p
     SET confirmacao_em = coalesce(p.confirmacao_em, now())
   WHERE p.id = p_proposta
     AND public.dono_do_caso(p.caso_id, auth.uid())
     AND p.lida_ate_ao_fim_em IS NOT NULL
     AND p.estado IN ('enviada', 'lida')
  RETURNING p.id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ainda_nao_leste_ate_ao_fim');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;


-- ── Decidir ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.decidir_proposta(
  p_proposta uuid,
  p_decisao  text,
  p_motivo   text DEFAULT NULL,
  p_valor_pedido integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  u uuid := auth.uid();
  v_id uuid; v_caso uuid; v_cc uuid; v_novo text; v_vinculo uuid;
BEGIN
  IF p_decisao NOT IN ('aceitar', 'recusar', 'pedir_desconto') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'decisao_invalida');
  END IF;
  IF p_decisao = 'pedir_desconto'
     AND (p_valor_pedido IS NULL OR p_valor_pedido < 0) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'falta_o_valor');
  END IF;

  v_novo := CASE p_decisao WHEN 'aceitar' THEN 'aceite'
                           WHEN 'recusar' THEN 'recusada'
                           ELSE 'desconto_pedido' END;

  UPDATE public.propostas p
     SET estado = v_novo,
         decidida_em = now(),
         motivo = nullif(btrim(coalesce(p_motivo, '')), '')
   WHERE p.id = p_proposta
     AND public.dono_do_caso(p.caso_id, u)
     AND p.estado IN ('enviada', 'lida')
     -- ⚠️ A regra, aqui. Sem estas duas linhas, a interface era a única
     -- coisa entre alguém e aceitar um contrato que não leu.
     AND p.lida_ate_ao_fim_em IS NOT NULL
     AND p.confirmacao_em IS NOT NULL
     -- Uma proposta com validade passada não se aceita por se ter
     -- deixado o separador aberto.
     AND (p.validade_ate IS NULL OR p.validade_ate >= current_date)
  RETURNING p.id, p.caso_id, p.contabilista_id INTO v_id, v_caso, v_cc;

  IF v_id IS NULL THEN
    -- Distinguir os motivos ajuda quem está a decidir, e não diz nada a
    -- quem não devia estar aqui: só o dono do caso chega a esta função.
    IF EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = p_proposta
                AND public.dono_do_caso(p.caso_id, u)
                AND (p.lida_ate_ao_fim_em IS NULL OR p.confirmacao_em IS NULL)) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'ainda_nao_leste_e_confirmaste');
    END IF;
    IF EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = p_proposta
                AND public.dono_do_caso(p.caso_id, u)
                AND p.validade_ate < current_date) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'proposta_expirada');
    END IF;
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_decidivel');
  END IF;

  IF p_decisao = 'aceitar' THEN
    -- As outras propostas do mesmo caso deixam de estar em jogo, mas
    -- ficam: são o histórico do que foi oferecido.
    UPDATE public.propostas SET estado = 'substituida'
     WHERE caso_id = v_caso AND id <> v_id AND estado IN ('enviada', 'lida');

    UPDATE public.casos SET estado = 'aceite' WHERE id = v_caso;

    -- ⚠️ O vínculo passa a ser CONSEQUÊNCIA, e não porta de entrada. É
    -- aqui que nasce, e é a partir daqui que a conversa livre, a agenda e
    -- o cartão de fidelidade fazem sentido — antes disto não há relação,
    -- há um pedido.
    INSERT INTO public.contabilista_vinculos
      (contabilista_id, cliente_id, origem, estado)
    VALUES (v_cc, u, 'cliente', 'ativo')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_vinculo;

    PERFORM public.avisar_utilizador(v_cc, 'vinculo_aceite',
      'A tua proposta foi aceite',
      'Já podes marcar consultas e falar diretamente.', '/contabilista/clientes');
  ELSIF p_decisao = 'pedir_desconto' THEN
    PERFORM public.avisar_utilizador(v_cc, 'mensagem',
      'Foi pedido um desconto',
      'Vê o pedido e envia uma proposta nova, se quiseres.', '/contabilista/casos');
  ELSE
    PERFORM public.avisar_utilizador(v_cc, 'mensagem',
      'Uma proposta tua foi recusada', NULL, '/contabilista/casos');
  END IF;

  RETURN jsonb_build_object('ok', true, 'estado', v_novo);
END;
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.marcar_proposta_lida(uuid)',
    'public.confirmar_leitura_da_proposta(uuid)',
    'public.decidir_proposta(uuid, text, text, integer)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;


COMMENT ON TABLE public.caso_contactos IS
  'Email, telefone e morada. O nome e o NIF ficam em `casos`, porque não são canais: o contabilista precisa deles para trabalhar. Aqui está o que lhe daria como falar com a pessoa fora da plataforma — e não há política nenhuma que o inclua.';
COMMENT ON FUNCTION public.decidir_proposta(uuid, text, text, integer) IS
  'Recusa enquanto `lida_ate_ao_fim_em` ou `confirmacao_em` forem nulos. O botão desativado na interface é conveniência; a garantia é esta.';
COMMENT ON FUNCTION public.rever_mensagem(uuid, text, text, text) IS
  'Aprovar, devolver ou recusar. Não há editar: a redação vai para `corpo_encaminhado` e o original fica — senão a revisão apaga a prova do que foi dito.';


-- ── Apagar leva os casos com ele ────────────────────────────────────
--
-- `apagar_conjuntos` (migração 049) tem de saber destes. O catálogo em
-- `src/lib/conta/catalogo.ts` tem um teste que compara o que lá está com
-- as tabelas que estas migrações criam — foi ele que apanhou isto antes
-- de chegar a produção, e é por isso que existe.
--
-- As propostas, as mensagens, os encaminhamentos, os documentos e os
-- contactos pendem do caso e saem com ele em cascata.
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

  -- Os casos saem inteiros: as propostas, as mensagens, os encaminhamentos,
  -- os documentos e os contactos pendem deles.
  IF 'casos' = ANY(p_conjuntos) THEN
    DELETE FROM public.casos WHERE cliente_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('casos', n);
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

CREATE OR REPLACE FUNCTION public.conjuntos_todos()
RETURNS text[]
LANGUAGE sql IMMUTABLE
AS $$
  SELECT ARRAY[
    'recibos','vencimentos','cenarios','prazos','perfil-fiscal',
    'quiz','quiz-cupoes','casos',
    'partilhas','conversas','consultas','fidelidade','vinculos',
    'perfil-contabilista','trabalho','candidatura',
    'alertas','notificacoes','parcerias','feedback'
  ]
$$;


-- O inventário também. Reescrito aqui, e não na 049, porque é aqui que a
-- tabela `casos` passa a existir: uma função que a nomeasse antes disso
-- falhava ao correr, e não ao ser criada.
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

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  052_anexos_do_caso_e_expiracao.sql                                ║
-- ╚═════════════════════════════════════════════════════════════════════╝

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

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  053_agendador_dos_avisos.sql                                      ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- 053_agendador_dos_avisos.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O AGENDADOR DOS AVISOS MUDA DE CASA. O TRABALHO FICA ONDE ESTAVA.
--  ---------------------------------------------------------------------
--  A fila de emails de aviso é esvaziada de quinze em quinze minutos.
--  Quem a acordava era um Cron Job do Vercel, e o Vercel no plano Hobby
--  recusa qualquer expressão que corra mais do que uma vez por dia:
--
--    Hobby accounts are limited to daily cron jobs.
--    This cron expression (*/15 * * * *) would run more than once per day.
--
--  A recusa é do DEPLOYMENT, não do build. Por isso não aparecia um
--  deployment falhado na lista — não chegava a existir deployment nenhum,
--  e a produção ficou parada no commit anterior sem sinal visível.
--
--  Havia duas saídas más e uma boa.
--
--  A primeira má: passar os avisos a uma vez por dia. Funcionava, e um
--  pedido de consulta podia demorar 24 horas a ser anunciado — numa
--  plataforma em que a outra parte está à espera, isso não é um ajuste de
--  configuração, é outra promessa.
--
--  A segunda má: reescrever o envio de emails em PL/pgSQL. A rota já tem
--  fila, reclamação com `SKIP LOCKED`, tentativas contadas, segredo e
--  lotes. Duplicar isso era passar a ter duas implementações e um dia
--  descobrir que divergiram.
--
--  A boa, e é esta: trocar SÓ O AGENDADOR. O `pg_cron` acorda de quinze em
--  quinze minutos e o `pg_net` faz o pedido HTTP à mesma rota, com o mesmo
--  segredo. Nada do que decide o que é enviado muda de sítio.
--
--      pg_cron (*/15)  →  pg_net  →  /api/cron/avisos-email  →  Resend
--
--  O segredo NÃO está aqui. Está no Vault, e esta migração lê-o pelo nome.
--  Ver a secção 4.
--
--  Idempotente. Correr duas vezes deixa exatamente um trabalho agendado.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. As extensões ─────────────────────────────────────────────────
--
-- `pg_cron` vive no schema `cron` por imposição da extensão. `pg_net` vai
-- para `extensions`, que é onde o Supabase põe o que não é da aplicação.
--
-- Num PostgreSQL que não as tenha — o arreio de testes local, por exemplo
-- — a migração segue em frente e diz porquê. Uma migração que rebenta
-- fora de produção é uma migração que deixa de ser exercida por testes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  ELSE
    RAISE NOTICE 'pg_cron indisponível: o agendamento não é criado aqui.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  ELSE
    RAISE NOTICE 'pg_net indisponível: o agendamento não é criado aqui.';
  END IF;
END $$;


-- ── 2. Os nomes dos segredos ────────────────────────────────────────
--
-- Uma função e não uma constante repetida: os nomes são usados na função
-- que dispara e nos testes, e escritos à mão nos dois sítios acabariam
-- por divergir num deles.
CREATE OR REPLACE FUNCTION public.nome_do_segredo_url() RETURNS text
LANGUAGE sql IMMUTABLE AS $$ SELECT 'recibo_certo_cron_url' $$;

CREATE OR REPLACE FUNCTION public.nome_do_segredo_cron() RETURNS text
LANGUAGE sql IMMUTABLE AS $$ SELECT 'recibo_certo_cron_secret' $$;

CREATE OR REPLACE FUNCTION public.nome_do_agendamento_avisos() RETURNS text
LANGUAGE sql IMMUTABLE AS $$ SELECT 'recibo-certo-avisos-email' $$;


-- ── 3. Quem dispara ─────────────────────────────────────────────────
--
-- O `cron.job.command` fica guardado em claro na base de dados. Por isso
-- o comando agendado é uma chamada a esta função, e não o SQL que lê o
-- Vault: assim o que está escrito na tabela do agendador é o nome de uma
-- função, e o segredo nunca aparece — nem sequer o SELECT que lhe chega.
--
-- Não levanta exceção quando falta configuração. Um agendador que rebenta
-- de quinze em quinze minutos enche o registo de erros e esconde os que
-- interessam; um aviso é lido por quem for ver, e a fila fica intacta à
-- espera da configuração.
CREATE OR REPLACE FUNCTION public.disparar_avisos_email()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_url    text;
  v_segredo text;
  v_pedido bigint;
BEGIN
  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = public.nome_do_segredo_url();
  SELECT decrypted_secret INTO v_segredo
    FROM vault.decrypted_secrets WHERE name = public.nome_do_segredo_cron();

  IF v_url IS NULL OR v_segredo IS NULL THEN
    RAISE WARNING
      'Avisos por email: falta % ou % no Vault. A fila fica intacta.',
      public.nome_do_segredo_url(), public.nome_do_segredo_cron();
    RETURN NULL;
  END IF;

  -- Assíncrono por natureza: `net.http_get` devolve um id e a resposta
  -- aparece depois em `net._http_response`. Não se espera por ela — o
  -- trabalho a sério é do outro lado, e prender uma sessão do agendador
  -- durante um minuto seria pagar duas vezes pelo mesmo.
  -- `net.http_get`, e não `extensions.net.http_get`: o `WITH SCHEMA
  -- extensions` do CREATE EXTENSION põe a EXTENSÃO ali, mas o pg_net cria
  -- as suas funções no schema `net`. Confirmado no projeto antes de
  -- escrever isto — um nome de três partes teria falhado só em produção.
  SELECT net.http_get(
           url := v_url,
           headers := jsonb_build_object(
             'Authorization', 'Bearer ' || v_segredo,
             'User-Agent', 'recibo-certo-agendador'
           ),
           timeout_milliseconds := 60000
         )
    INTO v_pedido;

  RETURN v_pedido;
END;
$$;

-- Ninguém lhe chega a não ser o agendador. Se `authenticated` a pudesse
-- chamar, tinha um botão para disparar o envio de emails à vontade — e,
-- pior, um oráculo para saber se o segredo está configurado.
REVOKE EXECUTE ON FUNCTION public.disparar_avisos_email()
  FROM anon, authenticated, public;

COMMENT ON FUNCTION public.disparar_avisos_email() IS
  'Acorda a rota que esvazia a fila de emails. O segredo vem do Vault e nunca aparece em `cron.job.command` — por isso o comando agendado chama esta função em vez de ler o Vault por inteiro.';


-- ── 4. O agendamento ────────────────────────────────────────────────
--
-- `cron.unschedule` levanta exceção se o trabalho não existir, por isso a
-- remoção é condicionada. E é feita ANTES de agendar, para o resultado ser
-- sempre exatamente um trabalho com este nome — correr esta migração duas
-- vezes não pode deixar dois agendadores a disparar em paralelo.
DO $$
DECLARE v_nome text := public.nome_do_agendamento_avisos();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'Sem pg_cron: o agendamento «%» não foi criado.', v_nome;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_nome) THEN
    PERFORM cron.unschedule(v_nome);
  END IF;

  PERFORM cron.schedule(v_nome, '*/15 * * * *',
                        'SELECT public.disparar_avisos_email();');
END $$;

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260814181500_texto_seguro_painel_contabilista.sql               ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- 20260814_texto_seguro_painel_contabilista.sql
-- Defesa em profundidade para todo o texto escrito na plataforma profissional.
--
-- A interface já trata conteúdo como TEXTO (React escapa por omissão) e passa
-- a rejeitar código antes de uma submissão. Isso não pode ser a fronteira de
-- segurança: alguém pode falar diretamente com o PostgREST usando a própria
-- sessão. A base repete a regra, tal como `site_feedback` já fazia desde a
-- migração 018.
--
-- Não apaga, transforma nem reescreve dados existentes. Só recusa INSERT/UPDATE
-- futuro quando um campo editável contém uma assinatura executável/markup.
-- As policies RLS existentes não mudam.

CREATE OR REPLACE FUNCTION public.painel_texto_tem_codigo(p_texto text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT COALESCE(
    p_texto ~* '</?[A-Za-z!][^>]*>'
    OR p_texto ~* '<[[:space:]]*script'
    OR p_texto ~* 'javascript[[:space:]]*:'
    OR p_texto ~* 'vbscript[[:space:]]*:'
    OR p_texto ~* 'on[A-Za-z]+[[:space:]]*='
    OR p_texto ~* 'data[[:space:]]*:[[:space:]]*text/html'
    OR p_texto ~* 'srcdoc[[:space:]]*='
    OR p_texto ~ '\{\{'
    OR p_texto ~ '<%',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.rejeitar_codigo_painel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  i integer;
  campo text;
  valor text;
BEGIN
  IF TG_NARGS = 0 THEN
    RETURN NEW;
  END IF;

  FOR i IN 0..TG_NARGS - 1 LOOP
    campo := TG_ARGV[i];
    valor := pg_catalog.to_jsonb(NEW) ->> campo;

    IF public.painel_texto_tem_codigo(valor) THEN
      RAISE EXCEPTION 'O campo "%" não aceita código, HTML ou scripts.', campo
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Estas funções existem para triggers, não como RPC pública.
REVOKE ALL ON FUNCTION public.painel_texto_tem_codigo(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rejeitar_codigo_painel() FROM PUBLIC, anon, authenticated;

-- Perfil profissional e candidatura.
DROP TRIGGER IF EXISTS trg_texto_seguro_contabilistas ON public.contabilistas;
CREATE TRIGGER trg_texto_seguro_contabilistas
  BEFORE INSERT OR UPDATE ON public.contabilistas
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
    'nome', 'occ', 'bio', 'concelho', 'email_contacto', 'telefone', 'website'
  );

DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_pedidos ON public.contabilista_pedidos;
CREATE TRIGGER trg_texto_seguro_contabilista_pedidos
  BEFORE INSERT OR UPDATE ON public.contabilista_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
    'nome', 'email_contacto', 'telefone', 'mensagem', 'credenciais', 'motivo_decisao'
  );

-- Relação contabilista/cliente e conversa.
DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_vinculos ON public.contabilista_vinculos;
CREATE TRIGGER trg_texto_seguro_contabilista_vinculos
  BEFORE INSERT OR UPDATE ON public.contabilista_vinculos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
    'mensagem', 'nome_cliente', 'email_cliente'
  );

DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_mensagens ON public.contabilista_mensagens;
CREATE TRIGGER trg_texto_seguro_contabilista_mensagens
  BEFORE INSERT OR UPDATE ON public.contabilista_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('corpo');

DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_anexos ON public.contabilista_anexos;
CREATE TRIGGER trg_texto_seguro_contabilista_anexos
  BEFORE INSERT OR UPDATE ON public.contabilista_anexos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('nome');

-- Trabalho, agenda e tipos de consulta.
DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_tarefas ON public.contabilista_tarefas;
CREATE TRIGGER trg_texto_seguro_contabilista_tarefas
  BEFORE INSERT OR UPDATE ON public.contabilista_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('titulo', 'notas');

DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_tarefa_passos ON public.contabilista_tarefa_passos;
CREATE TRIGGER trg_texto_seguro_contabilista_tarefa_passos
  BEFORE INSERT OR UPDATE ON public.contabilista_tarefa_passos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('texto');

DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_tipos ON public.contabilista_tipos_consulta;
CREATE TRIGGER trg_texto_seguro_contabilista_tipos
  BEFORE INSERT OR UPDATE ON public.contabilista_tipos_consulta
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('nome', 'descricao');

DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_excecoes ON public.contabilista_excecoes;
CREATE TRIGGER trg_texto_seguro_contabilista_excecoes
  BEFORE INSERT OR UPDATE ON public.contabilista_excecoes
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('motivo');

DROP TRIGGER IF EXISTS trg_texto_seguro_agendamentos ON public.agendamentos;
CREATE TRIGGER trg_texto_seguro_agendamentos
  BEFORE INSERT OR UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('assunto', 'local_ou_ligacao');

DROP TRIGGER IF EXISTS trg_texto_seguro_partilhas ON public.partilhas;
CREATE TRIGGER trg_texto_seguro_partilhas
  BEFORE INSERT OR UPDATE ON public.partilhas
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('titulo', 'nota_cliente');

-- Intermediação de casos: inclui os campos que podem vir de cliente,
-- contabilista ou administração. Estados, enums, referências internas,
-- caminhos de storage e MIME não são texto livre e ficam de fora.
DROP TRIGGER IF EXISTS trg_texto_seguro_casos ON public.casos;
CREATE TRIGGER trg_texto_seguro_casos
  BEFORE INSERT OR UPDATE ON public.casos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
    'nome_completo', 'nif', 'assunto', 'situacao', 'nota_triagem'
  );

DROP TRIGGER IF EXISTS trg_texto_seguro_caso_contactos ON public.caso_contactos;
CREATE TRIGGER trg_texto_seguro_caso_contactos
  BEFORE INSERT OR UPDATE ON public.caso_contactos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('email', 'telefone', 'morada');

DROP TRIGGER IF EXISTS trg_texto_seguro_caso_documentos ON public.caso_documentos;
CREATE TRIGGER trg_texto_seguro_caso_documentos
  BEFORE INSERT OR UPDATE ON public.caso_documentos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('nome');

DROP TRIGGER IF EXISTS trg_texto_seguro_caso_encaminhamentos ON public.caso_encaminhamentos;
CREATE TRIGGER trg_texto_seguro_caso_encaminhamentos
  BEFORE INSERT OR UPDATE ON public.caso_encaminhamentos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('motivo');

DROP TRIGGER IF EXISTS trg_texto_seguro_caso_mensagens ON public.caso_mensagens;
CREATE TRIGGER trg_texto_seguro_caso_mensagens
  BEFORE INSERT OR UPDATE ON public.caso_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
    'corpo', 'corpo_encaminhado', 'nota_revisao'
  );

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260814183000_linkedin_contabilistas.sql                         ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- LinkedIn no perfil profissional dos contabilistas.
--
-- A conta é ligada por Supabase Auth (`linkedin_oidc`). A fotografia pública
-- não pode ser escrita diretamente pelo browser: só a função de sincronização
-- a copia de `auth.identities`, depois de confirmar que a identidade pertence
-- ao utilizador autenticado. O URL `/in/...` é confirmado manualmente porque
-- o OpenID Connect do LinkedIn fornece nome/foto, mas não o endereço público.

ALTER TABLE public.contabilistas
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS linkedin_avatar_url text,
  ADD COLUMN IF NOT EXISTS linkedin_subject text,
  ADD COLUMN IF NOT EXISTS linkedin_ligado_em timestamptz;

ALTER TABLE public.contabilistas
  DROP CONSTRAINT IF EXISTS contabilistas_linkedin_url_valido;
ALTER TABLE public.contabilistas
  ADD CONSTRAINT contabilistas_linkedin_url_valido CHECK (
    linkedin_url IS NULL OR linkedin_url ~ '^https://([[:alnum:]-]+\.)*linkedin\.com/in/[A-Za-z0-9%._~+-]+/?$'
  );

CREATE OR REPLACE FUNCTION public.proteger_identidade_linkedin_contabilista()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (
    NEW.linkedin_avatar_url IS DISTINCT FROM OLD.linkedin_avatar_url OR
    NEW.linkedin_subject IS DISTINCT FROM OLD.linkedin_subject OR
    NEW.linkedin_ligado_em IS DISTINCT FROM OLD.linkedin_ligado_em
  ) AND COALESCE(pg_catalog.current_setting('app.sincronizar_linkedin', true), '') <> '1' THEN
    RAISE EXCEPTION 'Os dados verificados do LinkedIn só podem ser alterados pela sincronização da identidade.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.proteger_identidade_linkedin_contabilista() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_proteger_identidade_linkedin_contabilista ON public.contabilistas;
CREATE TRIGGER trg_proteger_identidade_linkedin_contabilista
BEFORE UPDATE ON public.contabilistas
FOR EACH ROW EXECUTE FUNCTION public.proteger_identidade_linkedin_contabilista();

CREATE OR REPLACE FUNCTION public.sincronizar_linkedin_contabilista()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_identidade record;
  v_avatar text;
  v_subject text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária.' USING ERRCODE = '42501';
  END IF;

  SELECT i.identity_data
    INTO v_identidade
  FROM auth.identities i
  WHERE i.user_id = v_user
    AND i.provider = 'linkedin_oidc'
  ORDER BY i.created_at DESC
  LIMIT 1;

  PERFORM pg_catalog.set_config('app.sincronizar_linkedin', '1', true);

  IF NOT FOUND THEN
    UPDATE public.contabilistas
       SET linkedin_avatar_url = NULL,
           linkedin_subject = NULL,
           linkedin_ligado_em = NULL
     WHERE user_id = v_user;

    RETURN pg_catalog.jsonb_build_object('ligado', false);
  END IF;

  v_avatar := NULLIF(pg_catalog.btrim(COALESCE(
    v_identidade.identity_data ->> 'picture',
    v_identidade.identity_data ->> 'avatar_url'
  )), '');
  v_subject := NULLIF(pg_catalog.btrim(COALESCE(
    v_identidade.identity_data ->> 'sub',
    v_identidade.identity_data ->> 'provider_id'
  )), '');

  IF v_avatar IS NOT NULL AND v_avatar !~ '^https://' THEN
    v_avatar := NULL;
  END IF;

  UPDATE public.contabilistas
     SET linkedin_avatar_url = v_avatar,
         linkedin_subject = v_subject,
         linkedin_ligado_em = COALESCE(linkedin_ligado_em, pg_catalog.now())
   WHERE user_id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não existe ficha de contabilista para esta conta.' USING ERRCODE = 'P0002';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'ligado', true,
    'avatar_url', v_avatar,
    'subject', v_subject
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_linkedin_contabilista() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sincronizar_linkedin_contabilista() TO authenticated;

-- Mantém a mesma fronteira anti-HTML/script já usada pelo resto do painel.
DROP TRIGGER IF EXISTS trg_texto_seguro_contabilistas ON public.contabilistas;
CREATE TRIGGER trg_texto_seguro_contabilistas
BEFORE INSERT OR UPDATE ON public.contabilistas
FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
  'nome', 'occ', 'bio', 'concelho', 'email_contacto', 'telefone', 'website', 'linkedin_url'
);

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260814184000_linkedin_contabilistas_rpc_hardening.sql           ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- Mantém o RPC público como SECURITY INVOKER e move a leitura privilegiada de
-- auth.identities para o schema private, que não é exposto pelo PostgREST.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION private.sincronizar_linkedin_contabilista_interno(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_identidade record;
  v_avatar text;
  v_subject text;
BEGIN
  IF p_user IS NULL OR auth.uid() IS NULL OR p_user IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Sessão necessária.' USING ERRCODE = '42501';
  END IF;

  SELECT i.identity_data
    INTO v_identidade
  FROM auth.identities i
  WHERE i.user_id = p_user
    AND i.provider = 'linkedin_oidc'
  ORDER BY i.created_at DESC
  LIMIT 1;

  PERFORM pg_catalog.set_config('app.sincronizar_linkedin', '1', true);

  IF NOT FOUND THEN
    UPDATE public.contabilistas
       SET linkedin_avatar_url = NULL,
           linkedin_subject = NULL,
           linkedin_ligado_em = NULL
     WHERE user_id = p_user;
    RETURN pg_catalog.jsonb_build_object('ligado', false);
  END IF;

  v_avatar := NULLIF(pg_catalog.btrim(COALESCE(
    v_identidade.identity_data ->> 'picture',
    v_identidade.identity_data ->> 'avatar_url'
  )), '');
  v_subject := NULLIF(pg_catalog.btrim(COALESCE(
    v_identidade.identity_data ->> 'sub',
    v_identidade.identity_data ->> 'provider_id'
  )), '');

  IF v_avatar IS NOT NULL AND v_avatar !~ '^https://' THEN v_avatar := NULL; END IF;

  UPDATE public.contabilistas
     SET linkedin_avatar_url = v_avatar,
         linkedin_subject = v_subject,
         linkedin_ligado_em = COALESCE(linkedin_ligado_em, pg_catalog.now())
   WHERE user_id = p_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não existe ficha de contabilista para esta conta.' USING ERRCODE = 'P0002';
  END IF;

  RETURN pg_catalog.jsonb_build_object('ligado', true, 'avatar_url', v_avatar, 'subject', v_subject);
END;
$$;

REVOKE ALL ON FUNCTION private.sincronizar_linkedin_contabilista_interno(uuid) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.sincronizar_linkedin_contabilista_interno(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sincronizar_linkedin_contabilista()
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.sincronizar_linkedin_contabilista_interno(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.sincronizar_linkedin_contabilista() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sincronizar_linkedin_contabilista() TO authenticated;

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260814191500_corrigir_trigger_texto_seguro.sql                  ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- Corrige a fronteira anti-código do painel profissional.
--
-- `rejeitar_codigo_painel()` é uma trigger function e não é uma RPC pública.
-- A versão anterior executava como INVOKER e chamava o helper
-- `painel_texto_tem_codigo(text)`, cujo EXECUTE foi corretamente revogado a
-- anon/authenticated. Num UPDATE legítimo feito pelo browser, a trigger era
-- executada mas a chamada ao helper falhava com "permission denied".
--
-- A trigger passa a SECURITY DEFINER, com search_path vazio e referências
-- totalmente qualificadas. Mantemos EXECUTE revogado aos papéis da API, pelo
-- que não se transforma numa operação privilegiada invocável por PostgREST.
-- RLS, triggers existentes e a regra anti-HTML/script não são removidos.

CREATE OR REPLACE FUNCTION public.rejeitar_codigo_painel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  i integer;
  campo text;
  valor text;
BEGIN
  IF TG_NARGS = 0 THEN
    RETURN NEW;
  END IF;

  FOR i IN 0..TG_NARGS - 1 LOOP
    campo := TG_ARGV[i];
    valor := pg_catalog.to_jsonb(NEW) ->> campo;

    IF public.painel_texto_tem_codigo(valor) THEN
      RAISE EXCEPTION 'O campo "%" não aceita código, HTML ou scripts.', campo
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- A função só é chamada por triggers já instalados. Não expor como RPC.
REVOKE ALL ON FUNCTION public.rejeitar_codigo_painel() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rejeitar_codigo_painel() TO service_role;

-- O helper continua privado para os papéis da API; a trigger, agora executada
-- como o owner postgres, consegue chamá-lo sem abrir uma superfície RPC.
REVOKE ALL ON FUNCTION public.painel_texto_tem_codigo(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.painel_texto_tem_codigo(text) TO service_role;

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260815200000_contrato_publico_contabilistas.sql                 ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- =====================================================================
--  O CONTRATO PÚBLICO DE `contabilistas` PASSA A SER UMA VIEW
--  ---------------------------------------------------------------------
--  Hoje o diretório lê a TABELA, através de uma política que dá a linha
--  inteira a `anon`:
--
--    CREATE POLICY contabilistas_diretorio_publico ON public.contabilistas
--      FOR SELECT TO anon, authenticated USING (estado = 'aprovado');
--
--  A política está certa na intenção — o diretório é uma página indexável
--  e tem de ser legível sem sessão. O que está errado é o alcance: ela não
--  escolhe colunas, escolhe linhas. Duas consequências, uma de hoje e uma
--  de amanhã:
--
--   · HOJE saem colunas que nenhum ecrã mostra e que ninguém decidiu
--     publicar. `linkedin_subject` é o `sub` do OIDC do LinkedIn — um
--     identificador de correlação de identidade. `pedido_id` liga a ficha
--     pública à candidatura. `telefone` não é renderizado em lado nenhum
--     e sai na mesma a quem peça a linha.
--
--   · AMANHÃ, qualquer coluna nova em `contabilistas` nasce pública. É o
--     problema estrutural, e é o que interessa: a Progressão e Comissão
--     desenhada para esta plataforma tem XP, patamar comprado e créditos.
--     Uma dessas colunas aqui seria a comissão de todos os contabilistas
--     à vista, sem ninguém escrever uma linha de frontend.
--
--  Esta migração cria o contrato explícito e NÃO fecha nada: a política
--  antiga continua de pé, e por isso nada quebra. O corte da política é
--  um passo separado e deliberado, depois de o frontend passar a ler a
--  view — ver o comentário no fim.
--
--  O que a view inclui é o que o produto MOSTRA hoje, mais os campos que
--  a especificação (§149) declara públicos. O que ela exclui é o que
--  ninguém mostra: identificadores internos e o telefone, que passa a
--  sair por função, a quem tem vínculo.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
--  1. A view: as colunas ditas uma a uma
-- ---------------------------------------------------------------------
--  `security_invoker = false` é deliberado: a view corre com os
--  privilégios do dono e continua a devolver as linhas aprovadas mesmo
--  depois de a política pública da tabela ser retirada. É este o
--  mecanismo que a substitui.
--
--  `DROP` antes de `CREATE`, e nunca `CREATE OR REPLACE`: as migrações
--  seguintes desta série acrescentam colunas a esta view NO MEIO da
--  lista, e o `REPLACE` só sabe acrescentar no fim. Reaplicar esta
--  migração sobre a view já crescida recusaria com
--  «42P16: cannot drop columns from view». Vale para as três definições
--  desta série — ver a mesma nota em 20260815210000 e 20260815230000.
DROP VIEW IF EXISTS public.contabilistas_publico;
CREATE VIEW public.contabilistas_publico
WITH (security_invoker = false) AS
SELECT
  c.user_id,
  c.slug,
  c.nome,
  c.occ,
  c.bio,
  c.distrito,
  c.concelho,
  c.especialidades,
  c.modalidades,
  -- O email é público por decisão de produto: o editor de perfil diz, na
  -- própria página, que é isto que aparece no diretório. Está aqui porque
  -- foi escolhido, não por arrastamento.
  c.email_contacto,
  c.website,
  c.aceita_novos_clientes,
  c.preco_consulta_cents,
  c.duracao_consulta_min,
  c.fidelidade_ativa,
  c.fidelidade_meta,
  c.fidelidade_desconto_pct,
  c.criado_em
FROM public.contabilistas c
WHERE c.estado = 'aprovado';

COMMENT ON VIEW public.contabilistas_publico IS
  'O contrato público do diretório e do perfil público. Acrescentar uma coluna aqui é uma decisão; acrescentar uma coluna a `contabilistas` deixa de ser. Não expõe telefone (ver contacto_do_contabilista), linkedin_subject, pedido_id nem estado.';

GRANT SELECT ON public.contabilistas_publico TO anon, authenticated;

-- ---------------------------------------------------------------------
--  2. O telefone sai por função, a quem tem relação
-- ---------------------------------------------------------------------
--  Nenhum ecrã público mostra o telefone hoje. Deixá-lo sair na linha
--  seria publicá-lo sem nunca o ter apresentado — o pior dos dois mundos:
--  invisível para quem o procura e disponível para quem o recolhe em
--  massa.
CREATE OR REPLACE FUNCTION public.contacto_do_contabilista(p_contabilista uuid)
RETURNS TABLE (email_contacto text, telefone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.email_contacto, c.telefone
    FROM public.contabilistas c
   WHERE c.user_id = p_contabilista
     AND c.estado = 'aprovado'
     AND (
          c.user_id = (SELECT auth.uid())
       OR public.vinculo_nao_terminado(p_contabilista, (SELECT auth.uid()))
     );
$$;

REVOKE EXECUTE ON FUNCTION public.contacto_do_contabilista(uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.contacto_do_contabilista(uuid) TO authenticated;

COMMENT ON FUNCTION public.contacto_do_contabilista(uuid) IS
  'Email e telefone do contabilista, só para o próprio e para quem tem vínculo vivo. O email também é público pela view; o telefone só sai por aqui.';

-- ---------------------------------------------------------------------
--  3. A guarda: impedir que a tabela volte a ser o contrato
-- ---------------------------------------------------------------------
--  Sem isto, a correção dura até alguém precisar de um campo novo no
--  diretório e recriar a política aberta — que é a solução óbvia para
--  quem não leu este ficheiro.
CREATE OR REPLACE FUNCTION public.assert_contrato_publico_contabilistas()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_politicas text[];
BEGIN
  -- `pg_policies.roles` é name[], não texto.
  SELECT array_agg(policyname ORDER BY policyname) INTO v_politicas
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'contabilistas'
     AND cmd IN ('SELECT', 'ALL')
     AND ('anon'::name = ANY (roles) OR 'public'::name = ANY (roles));

  IF v_politicas IS NOT NULL THEN
    RAISE EXCEPTION
      'contabilistas tem política de SELECT aberta a anon (%). O contrato público é a view contabilistas_publico.',
      array_to_string(v_politicas, ', ');
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_contrato_publico_contabilistas() IS
  'Falha enquanto existir uma política de SELECT aberta a anon em contabilistas. Hoje FALHA de propósito — a política antiga ainda está de pé. Passa a verde com a migração que a retira, depois de o frontend ler a view.';

COMMIT;

-- =====================================================================
--  O PASSO SEGUINTE, QUANDO O FRONTEND JÁ LER A VIEW
--  ---------------------------------------------------------------------
--  Não está aqui de propósito: é a única parte que QUEBRA leituras, e
--  quebrá-las no mesmo deploy que introduz a alternativa é pedir um
--  diretório vazio em produção. Aplicar só depois de confirmar que
--  `listarContabilistas` e `obterContabilistaPorSlug` já leem
--  `contabilistas_publico`:
--
--    DROP POLICY IF EXISTS "contabilistas_diretorio_publico"
--      ON public.contabilistas;
--    REVOKE SELECT ON public.contabilistas FROM anon;
--    SELECT public.assert_contrato_publico_contabilistas();
--
--  A partir daí, o próprio e a administração continuam a ler a tabela
--  pelas políticas que já existem (`contabilistas_proprio_le`), e o
--  público lê a view.
-- =====================================================================

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260815210000_perfil_profissional_campos.sql                     ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- =====================================================================
--  PERFIL PROFISSIONAL — OS CAMPOS QUE A IDENTIDADE PRECISA
--  ---------------------------------------------------------------------
--  O perfil deixa de ser um formulário e passa a ser a identidade
--  profissional de quem vende o serviço (§120). Para isso faltavam-lhe
--  seis factos que o cartão do diretório e o hero público mostram.
--
--  Todos os campos aqui são PÚBLICOS por desenho — vão para a view
--  `contabilistas_publico`, que é o contrato. Nenhum deles é calculado:
--  a §139 proíbe inventar sinais de confiança, e por isso anos de
--  experiência e tempo de resposta são DECLARADOS, com a interface
--  obrigada a dizê-lo.
--
--  A verificação da OCC é a exceção e a razão de ser desta migração ter
--  mais do que `ALTER TABLE`: a §124 diz que um número escrito no
--  formulário nunca pode virar um selo de «verificado». O selo passa a
--  ter uma fonte administrativa, e mudar o número apaga-a.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
--  1. Identidade declarada
-- ---------------------------------------------------------------------
ALTER TABLE public.contabilistas
  ADD COLUMN IF NOT EXISTS titulo_profissional text
    CHECK (titulo_profissional IS NULL OR char_length(titulo_profissional) BETWEEN 2 AND 80),
  ADD COLUMN IF NOT EXISTS apresentacao_curta text
    CHECK (apresentacao_curta IS NULL OR char_length(apresentacao_curta) <= 200),
  ADD COLUMN IF NOT EXISTS idiomas text[] NOT NULL DEFAULT '{}'::text[]
    CHECK (cardinality(idiomas) <= 8),
  ADD COLUMN IF NOT EXISTS anos_experiencia smallint
    CHECK (anos_experiencia IS NULL OR anos_experiencia BETWEEN 0 AND 60),
  ADD COLUMN IF NOT EXISTS resposta_media_horas smallint
    CHECK (resposta_media_horas IS NULL OR resposta_media_horas BETWEEN 1 AND 168);

COMMENT ON COLUMN public.contabilistas.apresentacao_curta IS
  'Uma linha para o cartão do diretório e para o hero público. NÃO substitui a bio: o cartão precisa de uma linha, o perfil de um parágrafo.';
COMMENT ON COLUMN public.contabilistas.anos_experiencia IS
  'DECLARADO. A §139 proíbe calcular anos de experiência a partir de dados que não os provam — a data de criação da conta não é experiência profissional.';
COMMENT ON COLUMN public.contabilistas.resposta_media_horas IS
  'COMPROMISSO declarado, não medição. A interface tem de dizer «responde normalmente em X» e nunca apresentá-lo como métrica verificada.';

-- ---------------------------------------------------------------------
--  2. Idiomas com vocabulário fechado
-- ---------------------------------------------------------------------
--  A §129 pede o mesmo princípio das especialidades: uma lista curta e
--  deliberada, não centenas de tags livres. Sem vocabulário fechado, o
--  diretório deixa de conseguir filtrar por idioma — «Inglês», «ingles»
--  e «EN» seriam três coisas.
CREATE TABLE IF NOT EXISTS public.catalogo_idiomas (
  codigo text PRIMARY KEY CHECK (codigo ~ '^[a-z]{2}$'),
  nome   text NOT NULL,
  ordem  smallint NOT NULL DEFAULT 0
);

INSERT INTO public.catalogo_idiomas (codigo, nome, ordem) VALUES
  ('pt', 'Português', 1),
  ('en', 'Inglês',    2),
  ('es', 'Espanhol',  3),
  ('fr', 'Francês',   4),
  ('de', 'Alemão',    5),
  ('it', 'Italiano',  6),
  ('nl', 'Neerlandês',7),
  ('uk', 'Ucraniano', 8)
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE public.catalogo_idiomas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "catalogo_idiomas_publico" ON public.catalogo_idiomas;
CREATE POLICY "catalogo_idiomas_publico" ON public.catalogo_idiomas
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.catalogo_idiomas TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.catalogo_idiomas FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.idiomas_validos(p_idiomas text[])
RETURNS boolean
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT p_idiomas IS NULL
      OR NOT EXISTS (
           SELECT 1 FROM unnest(p_idiomas) AS x(c)
            WHERE c NOT IN (SELECT codigo FROM public.catalogo_idiomas)
         );
$$;

ALTER TABLE public.contabilistas
  DROP CONSTRAINT IF EXISTS contabilistas_idiomas_conhecidos;
ALTER TABLE public.contabilistas
  ADD CONSTRAINT contabilistas_idiomas_conhecidos
  CHECK (public.idiomas_validos(idiomas)) NOT VALID;
-- NOT VALID não revalida as linhas antigas — todas têm '{}' hoje — mas
-- impõe a regra em todos os writes futuros.

-- ---------------------------------------------------------------------
--  3. A verificação da OCC é um facto administrativo (§124)
-- ---------------------------------------------------------------------
ALTER TABLE public.contabilistas
  ADD COLUMN IF NOT EXISTS occ_verificado_em timestamptz,
  ADD COLUMN IF NOT EXISTS occ_verificado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.contabilistas.occ_verificado_em IS
  'Quando a administração confirmou o número junto da Ordem. Sem isto, a interface só pode escrever «informado» — nunca «verificado».';

--  Duas garantias que fazem o selo significar alguma coisa:
--
--   1. o contabilista não escreve a verificação a si próprio;
--   2. mudar o número apaga-a. Sem isto, verificava-se o 12345 e
--      trocava-se depois para outro qualquer, mantendo o selo — que é
--      exatamente a fraude que a verificação existe para impedir.
CREATE OR REPLACE FUNCTION public.contabilistas_tranca_verificacao_occ()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.occ_verificado_em IS DISTINCT FROM OLD.occ_verificado_em
       OR NEW.occ_verificado_por IS DISTINCT FROM OLD.occ_verificado_por THEN
      RAISE EXCEPTION 'A verificação do número OCC só é feita pela administração.';
    END IF;
  END IF;

  IF NEW.occ IS DISTINCT FROM OLD.occ THEN
    NEW.occ_verificado_em  := NULL;
    NEW.occ_verificado_por := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.contabilistas_tranca_verificacao_occ() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS contabilistas_tranca_occ ON public.contabilistas;
CREATE TRIGGER contabilistas_tranca_occ
  BEFORE UPDATE ON public.contabilistas
  FOR EACH ROW EXECUTE FUNCTION public.contabilistas_tranca_verificacao_occ();

-- ---------------------------------------------------------------------
--  4. O trigger anti-código passa a cobrir os campos novos
-- ---------------------------------------------------------------------
--  `rejeitar_codigo_painel` corre por coluna e a lista era explícita.
--  Um campo novo não entra nela sozinho — e `titulo_profissional` vai
--  direto para o hero público.
--  `distrito` também não estava na lista original. Vem do mesmo SelectMenu
--  fechado, mas a proteção é por coluna e não por widget: quem escreve na
--  base de dados não passa necessariamente pelo formulário.
DROP TRIGGER IF EXISTS trg_texto_seguro_contabilistas ON public.contabilistas;
CREATE TRIGGER trg_texto_seguro_contabilistas
  BEFORE INSERT OR UPDATE ON public.contabilistas
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
    'nome', 'occ', 'bio', 'distrito', 'concelho', 'email_contacto',
    'telefone', 'website', 'titulo_profissional', 'apresentacao_curta'
  );

-- ---------------------------------------------------------------------
--  5. O contrato público cresce com eles — e só com eles
-- ---------------------------------------------------------------------
--  `DROP` antes de `CREATE`, e não `CREATE OR REPLACE`: as colunas novas
--  (`occ_verificado`, `titulo_profissional`, `apresentacao_curta`, …)
--  entram NO MEIO da lista que a migração anterior criou, e o `REPLACE`
--  só sabe acrescentar colunas no fim — recusa com «cannot change name of
--  view column "bio"». Nada depende ainda desta view, por isso o `DROP` é
--  barato; a partir do momento em que dependa, este passo precisa de
--  recriar também os dependentes.
DROP VIEW IF EXISTS public.contabilistas_publico;
CREATE VIEW public.contabilistas_publico
WITH (security_invoker = false) AS
SELECT
  c.user_id,
  c.slug,
  c.nome,
  c.occ,
  (c.occ_verificado_em IS NOT NULL) AS occ_verificado,
  c.titulo_profissional,
  c.apresentacao_curta,
  c.bio,
  c.distrito,
  c.concelho,
  c.especialidades,
  c.modalidades,
  c.idiomas,
  c.anos_experiencia,
  c.resposta_media_horas,
  c.email_contacto,
  c.website,
  c.linkedin_url,
  (c.linkedin_ligado_em IS NOT NULL) AS linkedin_ligado,
  c.aceita_novos_clientes,
  c.preco_consulta_cents,
  c.duracao_consulta_min,
  c.fidelidade_ativa,
  c.fidelidade_meta,
  c.fidelidade_desconto_pct,
  c.criado_em
FROM public.contabilistas c
WHERE c.estado = 'aprovado';

COMMENT ON VIEW public.contabilistas_publico IS
  'O contrato público do diretório e do perfil público. Acrescentar uma coluna aqui é uma decisão; acrescentar uma coluna a `contabilistas` deixa de ser. Não expõe telefone (ver contacto_do_contabilista), linkedin_subject, pedido_id nem estado.';

GRANT SELECT ON public.contabilistas_publico TO anon, authenticated;

COMMIT;

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260815220000_dashboard_modular_contabilistas.sql                ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- =====================================================================
-- DASHBOARD MODULAR — VISTAS E LAYOUT
--
-- Fonte de verdade: Relatório Mestre §4–12, §47.
--
-- Princípios que este ficheiro impõe na base de dados e não apenas na UI:
--
--   * o layout guarda GEOMETRIA, nunca dados. Não há aqui uma segunda
--     base de dados disfarçada de JSON (§5.6);
--   * uma sessão de edição = uma escrita atómica (§5.8, §12.12);
--   * `revision` faz compare-and-swap e impede que o portátil apague o
--     que o telemóvel gravou há um minuto (§12.15);
--   * o tipo de widget vem de uma allow-list em SQL. Um `type`
--     desconhecido é recusado no servidor, não só ignorado no React
--     (§39 «widget desconhecido não executa componente arbitrário»);
--   * limites defensivos de tamanho, contagem e coordenadas (§12.16).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Registry de módulos em SQL (espelho de src/lib/.../modulos.ts)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dashboard_modulos (
  type text PRIMARY KEY,
  tag_base text NOT NULL CHECK (tag_base ~ '^[A-Z]{3}$'),
  categoria text NOT NULL CHECK (categoria IN ('operacao','clientes','trabalho','fiscal','negocio')),
  col_span_min smallint NOT NULL CHECK (col_span_min BETWEEN 1 AND 12),
  col_span_max smallint NOT NULL CHECK (col_span_max BETWEEN 1 AND 12),
  row_span_min smallint NOT NULL CHECK (row_span_min BETWEEN 1 AND 20),
  row_span_max smallint NOT NULL CHECK (row_span_max BETWEEN 1 AND 20),
  prioridade text NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('critical','normal','deferred')),
  -- A biblioteca do mockup anuncia o formato antes de se arrastar
  -- («M · Lista», «XL · Kanban»). Saber o que vai acontecer ao painel
  -- antes de o mudar é metade da confiança no modo de edição.
  formato text NOT NULL DEFAULT 'lista'
    CHECK (formato IN ('lista','kanban','grafico','tabela','cartao','timeline')),
  ativo boolean NOT NULL DEFAULT true,
  CONSTRAINT dashboard_modulos_spans CHECK (col_span_min <= col_span_max AND row_span_min <= row_span_max)
);

COMMENT ON TABLE public.dashboard_modulos IS
  'Allow-list de widgets. A RPC de gravação valida contra esta tabela: o browser não escolhe que componente o painel monta.';

INSERT INTO public.dashboard_modulos
  (type, tag_base, categoria, col_span_min, col_span_max, row_span_min, row_span_max, prioridade, formato) VALUES
  ('agenda_hoje',           'AGD', 'operacao', 3, 12, 2, 8,  'critical', 'timeline'),
  ('precisam_atencao',      'ATN', 'operacao', 3, 12, 2, 8,  'critical', 'lista'),
  ('prazos_proximos',       'PRZ', 'fiscal',   3, 12, 2, 8,  'critical', 'lista'),
  ('partilhas_recebidas',   'PAR', 'clientes', 3, 12, 2, 8,  'normal',   'lista'),
  ('simulacoes_recebidas',  'SIM', 'clientes', 3, 12, 2, 8,  'normal',   'lista'),
  ('documentos_rever',      'DOC', 'trabalho', 3, 12, 2, 8,  'normal',   'lista'),
  ('atividade_semana',      'ATV', 'operacao', 3, 12, 2, 6,  'deferred', 'grafico'),
  ('centro_avisos',         'AVS', 'operacao', 3, 12, 2, 6,  'normal',   'lista'),
  ('estado_trabalho',       'TRB', 'trabalho', 4, 12, 2, 12, 'normal',   'kanban'),
  ('clientes',              'CLI', 'clientes', 3, 12, 2, 8,  'normal',   'lista'),
  ('casos',                 'CAS', 'trabalho', 3, 12, 2, 8,  'normal',   'lista'),
  ('fidelidade',            'FID', 'negocio',  3, 12, 2, 6,  'deferred', 'cartao'),
  ('progressao_comissao',   'PRG', 'negocio',  3, 12, 2, 8,  'deferred', 'cartao'),
  -- Os três que a biblioteca do mockup mostra em RECOMENDADOS e que
  -- não existiam no registry.
  ('casos_em_risco',        'RSK', 'trabalho', 3, 12, 2, 8,  'normal',   'lista'),
  ('comunicacoes_recentes', 'COM', 'clientes', 3, 12, 2, 8,  'normal',   'lista'),
  ('resumo_por_cliente',    'RES', 'clientes', 4, 12, 2, 10, 'deferred', 'tabela')
ON CONFLICT (type) DO NOTHING;

ALTER TABLE public.dashboard_modulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dashboard_modulos_leitura ON public.dashboard_modulos;
CREATE POLICY dashboard_modulos_leitura ON public.dashboard_modulos
  FOR SELECT TO authenticated USING (ativo);

-- ---------------------------------------------------------------------
-- 2. Vistas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contabilista_dashboard_vistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 60),
  ordem integer NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 100),
  principal boolean NOT NULL DEFAULT false,
  sistema boolean NOT NULL DEFAULT false,
  layout jsonb NOT NULL DEFAULT '{"version":2,"revision":1,"grid":{"desktop":{"columns":12,"rowHeight":52,"gap":12},"tablet":{"columns":8,"rowHeight":52,"gap":12}},"items":[]}'::jsonb,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  -- teto de tamanho: um layout normal tem poucos KB (§5.6)
  CONSTRAINT dashboard_vista_layout_pequeno CHECK (pg_column_size(layout) <= 32768)
);

CREATE UNIQUE INDEX IF NOT EXISTS contabilista_dashboard_uma_principal
  ON public.contabilista_dashboard_vistas (contabilista_id) WHERE principal;
CREATE INDEX IF NOT EXISTS contabilista_dashboard_vistas_ordem
  ON public.contabilista_dashboard_vistas (contabilista_id, ordem);
CREATE UNIQUE INDEX IF NOT EXISTS contabilista_dashboard_nome_unico
  ON public.contabilista_dashboard_vistas (contabilista_id, lower(nome));

COMMENT ON TABLE public.contabilista_dashboard_vistas IS
  'Configuração de APRESENTAÇÃO do painel. Nunca contém nomes de clientes, valores fiscais, documentos ou resultados — só que módulos existem e onde estão.';
COMMENT ON COLUMN public.contabilista_dashboard_vistas.revision IS
  'Compare-and-swap. Guardar com uma revisão antiga devolve layout_desatualizado em vez de destruir a versão mais nova.';

DROP TRIGGER IF EXISTS trg_texto_seguro_dashboard_vistas ON public.contabilista_dashboard_vistas;
CREATE TRIGGER trg_texto_seguro_dashboard_vistas
  BEFORE INSERT OR UPDATE ON public.contabilista_dashboard_vistas
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('nome');

ALTER TABLE public.contabilista_dashboard_vistas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashboard_vistas_dono_le ON public.contabilista_dashboard_vistas;
CREATE POLICY dashboard_vistas_dono_le ON public.contabilista_dashboard_vistas
  FOR SELECT TO authenticated
  USING (contabilista_id = (SELECT auth.uid()) AND public.e_contabilista_aprovado((SELECT auth.uid())));

DROP POLICY IF EXISTS dashboard_vistas_dono_cria ON public.contabilista_dashboard_vistas;
CREATE POLICY dashboard_vistas_dono_cria ON public.contabilista_dashboard_vistas
  FOR INSERT TO authenticated
  WITH CHECK (contabilista_id = (SELECT auth.uid())
              AND public.e_contabilista_aprovado((SELECT auth.uid()))
              AND NOT sistema);

DROP POLICY IF EXISTS dashboard_vistas_dono_apaga ON public.contabilista_dashboard_vistas;
CREATE POLICY dashboard_vistas_dono_apaga ON public.contabilista_dashboard_vistas
  FOR DELETE TO authenticated
  USING (contabilista_id = (SELECT auth.uid()) AND NOT sistema);

-- Repare-se: NÃO há policy de UPDATE para `authenticated`.
-- Mudar layout, nome, ordem ou principal passa obrigatoriamente pelas
-- RPCs abaixo, que validam geometria e fazem compare-and-swap.

-- ---------------------------------------------------------------------
-- 3. Validação geométrica no servidor (§5.9)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_layout_invalido(p_layout jsonb)
RETURNS text
LANGUAGE plpgsql STABLE SET search_path TO '' AS $$
DECLARE
  v_item jsonb;
  v_n integer;
  v_cols integer;
  v_tags text[] := '{}';
  v_ids  text[] := '{}';
  v_mod  record;
  v_bp   text;
  v_pos  jsonb;
BEGIN
  IF jsonb_typeof(p_layout) <> 'object' THEN RETURN 'layout_nao_e_objeto'; END IF;
  IF coalesce((p_layout->>'version')::int, 0) <> 2 THEN RETURN 'versao_nao_suportada'; END IF;
  IF jsonb_typeof(p_layout->'items') <> 'array' THEN RETURN 'items_nao_e_lista'; END IF;

  v_n := jsonb_array_length(p_layout->'items');
  IF v_n > 24 THEN RETURN 'demasiados_modulos'; END IF;

  IF jsonb_typeof(p_layout->'grid') <> 'object' THEN RETURN 'grid_em_falta'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_layout->'items') LOOP
    -- identidade
    IF (v_item->>'instanceId') IS NULL OR (v_item->>'instanceId') !~
       '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      RETURN 'instanceId_invalido';
    END IF;
    IF (v_item->>'instanceId') = ANY (v_ids) THEN RETURN 'instanceId_repetido'; END IF;
    v_ids := v_ids || (v_item->>'instanceId');

    -- tipo tem de existir na allow-list
    SELECT * INTO v_mod FROM public.dashboard_modulos m
     WHERE m.type = (v_item->>'type') AND m.ativo;
    IF NOT FOUND THEN RETURN 'tipo_desconhecido:' || coalesce(v_item->>'type','null'); END IF;

    -- tag legível e única dentro da vista
    IF (v_item->>'tag') IS NULL OR (v_item->>'tag') !~ '^[A-Z]{3}-[0-9]{2}$' THEN
      RETURN 'tag_invalida';
    END IF;
    IF left(v_item->>'tag', 3) <> v_mod.tag_base THEN RETURN 'tag_nao_corresponde_ao_tipo'; END IF;
    IF (v_item->>'tag') = ANY (v_tags) THEN RETURN 'tag_repetida'; END IF;
    v_tags := v_tags || (v_item->>'tag');

    -- config só pode conter preferências de apresentação (§5.6)
    IF v_item ? 'config' THEN
      IF jsonb_typeof(v_item->'config') <> 'object' THEN RETURN 'config_nao_e_objeto'; END IF;
      IF pg_column_size(v_item->'config') > 512 THEN RETURN 'config_demasiado_grande'; END IF;
      IF EXISTS (
        SELECT 1 FROM jsonb_object_keys(v_item->'config') k
         WHERE k NOT IN ('density','maxItems','showCompleted','sort','periodo','agrupar')
      ) THEN RETURN 'config_com_chave_nao_permitida'; END IF;
    END IF;

    -- geometria por breakpoint
    FOREACH v_bp IN ARRAY ARRAY['desktop','tablet'] LOOP
      IF NOT (v_item ? v_bp) THEN
        IF v_bp = 'desktop' THEN RETURN 'desktop_em_falta'; ELSE CONTINUE; END IF;
      END IF;
      v_pos  := v_item->v_bp;
      v_cols := coalesce((p_layout->'grid'->v_bp->>'columns')::int, CASE v_bp WHEN 'desktop' THEN 12 ELSE 8 END);

      IF coalesce((v_pos->>'col')::int, 0) < 1 THEN RETURN 'col_invalida'; END IF;
      IF coalesce((v_pos->>'row')::int, 0) < 1 THEN RETURN 'row_invalida'; END IF;
      IF coalesce((v_pos->>'row')::int, 0) > 60 THEN RETURN 'row_fora_do_teto'; END IF;
      IF coalesce((v_pos->>'colSpan')::int, 0) < 1 THEN RETURN 'colSpan_invalido'; END IF;
      IF coalesce((v_pos->>'rowSpan')::int, 0) < 1 THEN RETURN 'rowSpan_invalido'; END IF;

      IF (v_pos->>'col')::int + (v_pos->>'colSpan')::int - 1 > v_cols THEN
        RETURN 'modulo_transborda_a_grelha';
      END IF;

      -- min/max do registry, medidos na grelha desktop de 12 colunas
      IF v_bp = 'desktop' THEN
        IF (v_pos->>'colSpan')::int NOT BETWEEN v_mod.col_span_min AND v_mod.col_span_max THEN
          RETURN 'colSpan_fora_do_registry:' || v_mod.type;
        END IF;
        IF (v_pos->>'rowSpan')::int NOT BETWEEN v_mod.row_span_min AND v_mod.row_span_max THEN
          RETURN 'rowSpan_fora_do_registry:' || v_mod.type;
        END IF;
      END IF;
    END LOOP;

    IF v_item ? 'mobile' THEN
      IF coalesce((v_item->'mobile'->>'order')::int, 0) < 0 THEN RETURN 'ordem_mobile_invalida'; END IF;
      IF coalesce(v_item->'mobile'->>'size','M') NOT IN ('S','M','L') THEN RETURN 'tamanho_mobile_invalido'; END IF;
    END IF;
  END LOOP;

  -- sobreposição no desktop: dois módulos não podem ocupar a mesma célula
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_layout->'items') a(i)
      JOIN jsonb_array_elements(p_layout->'items') b(j)
        ON (a.i->>'instanceId') < (b.j->>'instanceId')
     WHERE coalesce((a.i->>'hidden')::boolean, false) = false
       AND coalesce((b.j->>'hidden')::boolean, false) = false
       AND int4range((a.i->'desktop'->>'col')::int,
                     (a.i->'desktop'->>'col')::int + (a.i->'desktop'->>'colSpan')::int)
        && int4range((b.j->'desktop'->>'col')::int,
                     (b.j->'desktop'->>'col')::int + (b.j->'desktop'->>'colSpan')::int)
       AND int4range((a.i->'desktop'->>'row')::int,
                     (a.i->'desktop'->>'row')::int + (a.i->'desktop'->>'rowSpan')::int)
        && int4range((b.j->'desktop'->>'row')::int,
                     (b.j->'desktop'->>'row')::int + (b.j->'desktop'->>'rowSpan')::int)
  ) THEN
    RETURN 'modulos_sobrepostos';
  END IF;

  RETURN NULL;   -- válido
END; $$;

COMMENT ON FUNCTION public.dashboard_layout_invalido(jsonb) IS
  'Devolve NULL se o layout é válido, ou um código de erro. A mesma lógica existe em TypeScript para feedback imediato; esta é a que decide.';

-- ---------------------------------------------------------------------
-- 4. Gravar layout — compare-and-swap (§5.8)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guardar_dashboard_layout(
  p_vista uuid,
  p_revision_esperada integer,
  p_layout jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_erro text;
  v_nova integer;
  v_actual integer;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  IF pg_column_size(p_layout) > 32768 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'layout_demasiado_grande');
  END IF;

  v_erro := public.dashboard_layout_invalido(p_layout);
  IF v_erro IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'layout_invalido', 'detalhe', v_erro);
  END IF;

  UPDATE public.contabilista_dashboard_vistas v
     SET layout = jsonb_set(p_layout, '{revision}', to_jsonb(v.revision + 1)),
         revision = v.revision + 1,
         atualizado_em = now()
   WHERE v.id = p_vista
     AND v.contabilista_id = v_uid
     AND v.revision = p_revision_esperada
  RETURNING v.revision INTO v_nova;

  IF v_nova IS NULL THEN
    SELECT v.revision INTO v_actual FROM public.contabilista_dashboard_vistas v
     WHERE v.id = p_vista AND v.contabilista_id = v_uid;
    IF v_actual IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'vista_inexistente');
    END IF;
    RETURN jsonb_build_object('ok', false, 'motivo', 'layout_desatualizado', 'revision', v_actual);
  END IF;

  RETURN jsonb_build_object('ok', true, 'revision', v_nova);
END; $$;

REVOKE EXECUTE ON FUNCTION public.guardar_dashboard_layout(uuid, integer, jsonb) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.guardar_dashboard_layout(uuid, integer, jsonb) TO authenticated;

-- ---------------------------------------------------------------------
-- 5. Gerir vistas (criar / renomear / ordenar / principal)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_dashboard_vista(p_nome text, p_copiar_de uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quantas integer;
  v_layout jsonb;
  v_id uuid;
  v_ordem integer;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  SELECT count(*) INTO v_quantas FROM public.contabilista_dashboard_vistas WHERE contabilista_id = v_uid;
  IF v_quantas >= 8 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'demasiadas_vistas');
  END IF;

  IF p_copiar_de IS NOT NULL THEN
    SELECT layout INTO v_layout FROM public.contabilista_dashboard_vistas
     WHERE id = p_copiar_de AND contabilista_id = v_uid;
  END IF;

  SELECT coalesce(max(ordem), -1) + 1 INTO v_ordem
    FROM public.contabilista_dashboard_vistas WHERE contabilista_id = v_uid;

  INSERT INTO public.contabilista_dashboard_vistas (contabilista_id, nome, ordem, principal, layout)
  VALUES (v_uid, p_nome, v_ordem, v_quantas = 0,
          coalesce(v_layout, '{"version":2,"revision":1,"grid":{"desktop":{"columns":12,"rowHeight":52,"gap":12},"tablet":{"columns":8,"rowHeight":52,"gap":12}},"items":[]}'::jsonb))
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'motivo', 'nome_repetido');
END; $$;

CREATE OR REPLACE FUNCTION public.definir_dashboard_vista_principal(p_vista uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.contabilista_dashboard_vistas
                  WHERE id = p_vista AND contabilista_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'vista_inexistente');
  END IF;
  -- limpar antes de marcar: o índice único parcial não tolera duas.
  UPDATE public.contabilista_dashboard_vistas SET principal = false
   WHERE contabilista_id = v_uid AND principal;
  UPDATE public.contabilista_dashboard_vistas SET principal = true, atualizado_em = now()
   WHERE id = p_vista AND contabilista_id = v_uid;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.renomear_dashboard_vista(p_vista uuid, p_nome text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_uid uuid := auth.uid(); v_n integer;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;
  UPDATE public.contabilista_dashboard_vistas SET nome = p_nome, atualizado_em = now()
   WHERE id = p_vista AND contabilista_id = v_uid;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RETURN jsonb_build_object('ok', false, 'motivo', 'vista_inexistente'); END IF;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'motivo', 'nome_repetido');
END; $$;

REVOKE EXECUTE ON FUNCTION public.criar_dashboard_vista(text, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.definir_dashboard_vista_principal(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.renomear_dashboard_vista(uuid, text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.criar_dashboard_vista(text, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.definir_dashboard_vista_principal(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.renomear_dashboard_vista(uuid, text) TO authenticated;

-- Privilégios explícitos (ver nota na migração do perfil).
REVOKE ALL ON public.contabilista_dashboard_vistas FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.contabilista_dashboard_vistas TO authenticated;
-- Sem UPDATE de propósito: o layout muda por RPC validada.
REVOKE ALL ON public.dashboard_modulos FROM anon, authenticated;
GRANT SELECT ON public.dashboard_modulos TO authenticated;

COMMIT;

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260815230000_fidelidade_v2_regras_versionadas_e_preco_consulta.sql║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- =====================================================================
-- FIDELIDADE V2 — REGRAS VERSIONADAS, PREÇO POR CONSULTA E BENEFÍCIO
-- PENDENTE
--
-- Fonte de verdade: Relatório Mestre §13–29, §48.
--
-- Três correções de domínio, não de aparência:
--
--  A. O preço deixa de ser global. Hoje existe até um CHECK
--     (`contabilistas_fidelidade_precisa_de_preco`) que PROÍBE ligar a
--     fidelidade sem um preço universal. Esse CHECK cai. O preço real
--     passa a viver na consulta concreta.
--
--  B. A regra do cartão passa a ser uma linha imutável e versionada.
--     Alterar a configuração publica uma versão nova; os cartões em
--     curso continuam agarrados à versão com que nasceram.
--
--  C. Completar um cartão deixa de abrir logo o seguinte. Hoje
--     `carimbar_consulta` emite o cupão e insere já outro cartão com a
--     configuração ATUAL — o que quebra a promessa duas vezes: fecha o
--     ciclo cedo demais e aplica ao cliente uma regra que ele nunca viu.
--     Passa a existir o estado BENEFÍCIO PENDENTE.
--
-- Nada de legacy é reescrito: cupões antigos mantêm a semântica de
-- preço congelado com que foram prometidos.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Regras versionadas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fidelidade_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  versao integer NOT NULL CHECK (versao >= 1),
  meta integer NOT NULL CHECK (meta BETWEEN 3 AND 12),
  desconto_pct integer NOT NULL CHECK (desconto_pct BETWEEN 10 AND 50),
  -- Só consultas efetivamente pagas carimbam. Uma primeira conversa
  -- grátis é legítima (contabilista_tipos_consulta.preco_cents = 0),
  -- mas não deve encher o cartão. Fica congelado na regra porque é
  -- parte da promessa.
  exige_pagamento boolean NOT NULL DEFAULT true,
  validade_dias integer NOT NULL DEFAULT 365 CHECK (validade_dias BETWEEN 30 AND 1095),
  ativa boolean NOT NULL DEFAULT true,
  publicada_em timestamptz NOT NULL DEFAULT now(),
  substituida_em timestamptz,
  UNIQUE (contabilista_id, versao)
);

CREATE UNIQUE INDEX IF NOT EXISTS fidelidade_regra_corrente_idx
  ON public.fidelidade_regras (contabilista_id) WHERE substituida_em IS NULL;
CREATE INDEX IF NOT EXISTS fidelidade_regras_contabilista_idx
  ON public.fidelidade_regras (contabilista_id, versao DESC);

COMMENT ON TABLE public.fidelidade_regras IS
  'Uma regra publicada é imutável. Mudar a configuração fecha a versão corrente e publica outra. Nunca UPDATE meta/desconto numa versão que já pode estar ligada a um cartão.';

-- Imutabilidade: só `substituida_em` e `ativa` podem mudar depois de publicada.
CREATE OR REPLACE FUNCTION public.fidelidade_regras_imutaveis() RETURNS trigger
LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF NEW.meta            IS DISTINCT FROM OLD.meta
  OR NEW.desconto_pct    IS DISTINCT FROM OLD.desconto_pct
  OR NEW.exige_pagamento IS DISTINCT FROM OLD.exige_pagamento
  OR NEW.validade_dias   IS DISTINCT FROM OLD.validade_dias
  OR NEW.versao          IS DISTINCT FROM OLD.versao
  OR NEW.contabilista_id IS DISTINCT FROM OLD.contabilista_id
  OR NEW.publicada_em    IS DISTINCT FROM OLD.publicada_em THEN
    RAISE EXCEPTION 'Uma regra de fidelidade publicada não se altera. Publica uma versão nova.'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS fidelidade_regras_imutabilidade ON public.fidelidade_regras;
CREATE TRIGGER fidelidade_regras_imutabilidade BEFORE UPDATE ON public.fidelidade_regras
  FOR EACH ROW EXECUTE FUNCTION public.fidelidade_regras_imutaveis();

ALTER TABLE public.fidelidade_regras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fidelidade_regras_dono_le ON public.fidelidade_regras;
CREATE POLICY fidelidade_regras_dono_le ON public.fidelidade_regras
  FOR SELECT TO authenticated USING (contabilista_id = (SELECT auth.uid()));

-- A policy de leitura do cliente depende de `fidelidade_cartoes.regra_id`,
-- que só existe a partir do passo 2. É criada lá.
--
-- Sem policy de INSERT/UPDATE/DELETE: publicar é uma RPC.

-- ---------------------------------------------------------------------
-- 2. Cartões referenciam a regra
-- ---------------------------------------------------------------------
ALTER TABLE public.fidelidade_cartoes
  ADD COLUMN IF NOT EXISTS regra_id uuid REFERENCES public.fidelidade_regras(id),
  ADD COLUMN IF NOT EXISTS regra_versao integer;

CREATE INDEX IF NOT EXISTS fidelidade_cartoes_regra_idx ON public.fidelidade_cartoes (regra_id);

COMMENT ON COLUMN public.fidelidade_cartoes.meta IS
  'Snapshot redundante da regra, mantido de propósito: se a linha da regra desaparecesse por acidente, o cartão continua a saber a promessa que fez.';

DROP POLICY IF EXISTS fidelidade_regras_cliente_le ON public.fidelidade_regras;
CREATE POLICY fidelidade_regras_cliente_le ON public.fidelidade_regras
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.fidelidade_cartoes c
             WHERE c.regra_id = fidelidade_regras.id AND c.cliente_id = (SELECT auth.uid()))
    OR (substituida_em IS NULL
        AND public.vinculo_nao_terminado(contabilista_id, (SELECT auth.uid())))
  );

-- ---------------------------------------------------------------------
-- 3. Cupões: modelo legacy vs. percentagem sobre a consulta real
-- ---------------------------------------------------------------------
ALTER TABLE public.fidelidade_cupoes
  ADD COLUMN IF NOT EXISTS modelo text NOT NULL DEFAULT 'legacy_preco_congelado'
    CHECK (modelo IN ('legacy_preco_congelado','percentagem_consulta')),
  ADD COLUMN IF NOT EXISTS desconto_cents integer CHECK (desconto_cents IS NULL OR desconto_cents >= 0),
  ADD COLUMN IF NOT EXISTS valor_final_cents integer CHECK (valor_final_cents IS NULL OR valor_final_cents >= 0),
  ADD COLUMN IF NOT EXISTS regra_id uuid REFERENCES public.fidelidade_regras(id);

-- Cupões novos não sabem o valor base até serem usados.
ALTER TABLE public.fidelidade_cupoes ALTER COLUMN valor_base_cents DROP NOT NULL;

ALTER TABLE public.fidelidade_cupoes DROP CONSTRAINT IF EXISTS fidelidade_cupoes_coerente;
ALTER TABLE public.fidelidade_cupoes ADD CONSTRAINT fidelidade_cupoes_coerente CHECK (
  (modelo = 'legacy_preco_congelado' AND valor_base_cents IS NOT NULL)
  OR
  (modelo = 'percentagem_consulta' AND (
      (estado <> 'usado' AND valor_base_cents IS NULL)
      OR
      (estado = 'usado'  AND valor_base_cents IS NOT NULL
                         AND desconto_cents IS NOT NULL
                         AND valor_final_cents IS NOT NULL
                         AND valor_final_cents = valor_base_cents - desconto_cents)
  ))
);

-- Um só benefício pendente por par. É esta linha que torna a máquina de
-- estados verdadeira na base de dados e não apenas na RPC.
CREATE UNIQUE INDEX IF NOT EXISTS fidelidade_beneficio_pendente_idx
  ON public.fidelidade_cupoes (contabilista_id, cliente_id) WHERE estado = 'disponivel';

COMMENT ON INDEX public.fidelidade_beneficio_pendente_idx IS
  'Invariante §15: nunca coexistem benefício pendente de um ciclo antigo e cartão novo a acumular carimbos.';

-- ---------------------------------------------------------------------
-- 4. Preço real na consulta (§18)
-- ---------------------------------------------------------------------
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS preco_cents integer CHECK (preco_cents IS NULL OR preco_cents >= 0),
  ADD COLUMN IF NOT EXISTS desconto_aplicado_cents integer
    CHECK (desconto_aplicado_cents IS NULL OR desconto_aplicado_cents >= 0),
  ADD COLUMN IF NOT EXISTS valor_final_cents integer
    CHECK (valor_final_cents IS NULL OR valor_final_cents >= 0),
  ADD COLUMN IF NOT EXISTS preco_definido_em timestamptz;

ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_valores_coerentes;
ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_valores_coerentes CHECK (
  preco_cents IS NULL
  OR valor_final_cents = preco_cents - coalesce(desconto_aplicado_cents, 0)
);

COMMENT ON COLUMN public.agendamentos.preco_cents IS
  'Preço REAL desta consulta, em cêntimos, definido pelo contabilista ao concluir. É a base sobre a qual um benefício em percentagem incide. O Recibo Certo regista o valor; não processa o pagamento.';

-- ---------------------------------------------------------------------
-- 5. Cai a trava do preço global
-- ---------------------------------------------------------------------
ALTER TABLE public.contabilistas
  DROP CONSTRAINT IF EXISTS contabilistas_fidelidade_precisa_de_preco;

COMMENT ON COLUMN public.contabilistas.preco_consulta_cents IS
  'DEPRECADO como fonte de verdade. Mantido por compatibilidade e como sugestão comercial. A fidelidade V2 não depende dele (§14.1).';

-- As três colunas de configuração passam a ser um espelho da regra
-- corrente. Só a RPC de publicação lhes toca.
CREATE OR REPLACE FUNCTION public.contabilistas_tranca_colunas() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      RAISE EXCEPTION 'O estado da conta de contabilista só é alterado pela administração.'; END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'O titular de uma conta de contabilista não pode ser alterado.'; END IF;
    IF NEW.slug IS DISTINCT FROM OLD.slug THEN
      RAISE EXCEPTION 'O endereço público só é alterado pela administração.'; END IF;
    IF NEW.occ_verificado_em IS DISTINCT FROM OLD.occ_verificado_em
       OR NEW.occ_verificado_por IS DISTINCT FROM OLD.occ_verificado_por THEN
      RAISE EXCEPTION 'A verificação do número OCC só é registada pela administração.'; END IF;

    IF current_setting('rc.publicando_regra', true) IS DISTINCT FROM 'on' THEN
      IF NEW.fidelidade_meta         IS DISTINCT FROM OLD.fidelidade_meta
      OR NEW.fidelidade_desconto_pct IS DISTINCT FROM OLD.fidelidade_desconto_pct
      OR NEW.fidelidade_ativa        IS DISTINCT FROM OLD.fidelidade_ativa THEN
        RAISE EXCEPTION 'A configuração de fidelidade muda por publicação de regra (publicar_regra_fidelidade), não por UPDATE direto.'
          USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;
  NEW.atualizado_em := now();
  RETURN NEW;
END; $$;

-- ---------------------------------------------------------------------
-- 6. BACKFILL — versão legacy por contabilista, cartões ligados
-- ---------------------------------------------------------------------
INSERT INTO public.fidelidade_regras
  (contabilista_id, versao, meta, desconto_pct, exige_pagamento, ativa, publicada_em)
SELECT c.user_id, 1, c.fidelidade_meta, c.fidelidade_desconto_pct,
       false,               -- a promessa antiga não exigia pagamento; não a apertamos retroativamente
       c.fidelidade_ativa, c.criado_em
  FROM public.contabilistas c
 WHERE NOT EXISTS (SELECT 1 FROM public.fidelidade_regras r WHERE r.contabilista_id = c.user_id);

UPDATE public.fidelidade_cartoes ca
   SET regra_id = r.id, regra_versao = r.versao
  FROM public.fidelidade_regras r
 WHERE r.contabilista_id = ca.contabilista_id
   AND r.versao = 1
   AND ca.regra_id IS NULL;

UPDATE public.fidelidade_cupoes cu
   SET regra_id = ca.regra_id
  FROM public.fidelidade_cartoes ca
 WHERE ca.id = cu.cartao_id AND cu.regra_id IS NULL;

-- Cartões sem carimbos abertos antecipadamente pelo bug §14.2:
-- fecham-se aqui. Um cartão a zero não é uma promessa em curso.
DELETE FROM public.fidelidade_cartoes ca
 WHERE NOT ca.completo
   AND ca.carimbos = 0
   AND EXISTS (SELECT 1 FROM public.fidelidade_cupoes cu
                WHERE cu.contabilista_id = ca.contabilista_id
                  AND cu.cliente_id = ca.cliente_id
                  AND cu.estado = 'disponivel');

-- ---------------------------------------------------------------------
-- 7. Publicar uma regra (§28)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.impacto_nova_regra_fidelidade()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT jsonb_build_object(
    'cartoes_em_curso', (SELECT count(*) FROM public.fidelidade_cartoes
                          WHERE contabilista_id = auth.uid() AND NOT completo),
    'beneficios_pendentes', (SELECT count(*) FROM public.fidelidade_cupoes
                              WHERE contabilista_id = auth.uid() AND estado = 'disponivel'),
    'clientes_sem_ciclo', (SELECT count(*) FROM public.contabilista_vinculos v
                            WHERE v.contabilista_id = auth.uid() AND v.estado = 'ativo'
                              AND NOT EXISTS (SELECT 1 FROM public.fidelidade_cartoes ca
                                               WHERE ca.contabilista_id = v.contabilista_id
                                                 AND ca.cliente_id = v.cliente_id AND NOT ca.completo)
                              AND NOT EXISTS (SELECT 1 FROM public.fidelidade_cupoes cu
                                               WHERE cu.contabilista_id = v.contabilista_id
                                                 AND cu.cliente_id = v.cliente_id AND cu.estado = 'disponivel'))
  );
$$;

CREATE OR REPLACE FUNCTION public.publicar_regra_fidelidade(
  p_meta integer,
  p_desconto_pct integer,
  p_ativa boolean DEFAULT true,
  p_exige_pagamento boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_corrente record;
  v_versao integer;
  v_id uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  SELECT * INTO v_corrente FROM public.fidelidade_regras
   WHERE contabilista_id = v_uid AND substituida_em IS NULL FOR UPDATE;

  -- Republicar exatamente o mesmo não cria versão nova (§12.13 aplicado
  -- ao domínio: não escrever história por um clique sem alteração).
  IF FOUND
     AND v_corrente.meta = p_meta
     AND v_corrente.desconto_pct = p_desconto_pct
     AND v_corrente.exige_pagamento = p_exige_pagamento
     AND v_corrente.ativa = p_ativa THEN
    RETURN jsonb_build_object('ok', true, 'inalterada', true,
                              'regra_id', v_corrente.id, 'versao', v_corrente.versao);
  END IF;

  SELECT coalesce(max(versao), 0) + 1 INTO v_versao
    FROM public.fidelidade_regras WHERE contabilista_id = v_uid;

  IF FOUND AND v_corrente.id IS NOT NULL THEN
    UPDATE public.fidelidade_regras SET substituida_em = now(), ativa = false
     WHERE id = v_corrente.id;
  END IF;

  INSERT INTO public.fidelidade_regras
    (contabilista_id, versao, meta, desconto_pct, exige_pagamento, ativa)
  VALUES (v_uid, v_versao, p_meta, p_desconto_pct, p_exige_pagamento, p_ativa)
  RETURNING id INTO v_id;

  PERFORM set_config('rc.publicando_regra', 'on', true);
  UPDATE public.contabilistas
     SET fidelidade_meta = p_meta,
         fidelidade_desconto_pct = p_desconto_pct,
         fidelidade_ativa = p_ativa
   WHERE user_id = v_uid;
  PERFORM set_config('rc.publicando_regra', 'off', true);

  RETURN jsonb_build_object('ok', true, 'inalterada', false, 'regra_id', v_id, 'versao', v_versao);
END; $$;

-- ---------------------------------------------------------------------
-- 8. Hook de progressão (preenchido pela migração seguinte)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fidelidade_ciclo_concluido_hook(
  p_contabilista uuid, p_cliente uuid, p_cartao uuid, p_meta integer
) RETURNS void
LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  -- No-op até a migração de Progressão e Comissão a substituir.
  -- Existe já aqui para que a Fidelidade V2 possa ser lançada primeiro
  -- sem depender do domínio comercial.
  RETURN;
END; $$;

REVOKE EXECUTE ON FUNCTION public.fidelidade_ciclo_concluido_hook(uuid,uuid,uuid,integer) FROM anon, authenticated, PUBLIC;

CREATE OR REPLACE FUNCTION public.progressao_servico_concluido_hook(
  p_contabilista uuid, p_cliente uuid, p_agendamento uuid, p_preco_cents integer
) RETURNS void
LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  -- No-op até à migração de Progressão e Comissão. Existe aqui para que
  -- `concluir_consulta` seja escrita UMA vez: a migração seguinte troca
  -- só o corpo deste gancho, não a RPC de negócio.
  RETURN;
END; $$;

REVOKE EXECUTE ON FUNCTION public.progressao_servico_concluido_hook(uuid,uuid,uuid,integer) FROM anon, authenticated, PUBLIC;

-- ---------------------------------------------------------------------
-- 9. Máquina de estados nova
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fidelidade_expirar_cupoes(p_contabilista uuid, p_cliente uuid)
RETURNS integer
LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE v_n integer;
BEGIN
  UPDATE public.fidelidade_cupoes
     SET estado = 'expirado'
   WHERE contabilista_id = p_contabilista AND cliente_id = p_cliente
     AND estado = 'disponivel' AND expira_em <= now();
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END; $$;

CREATE OR REPLACE FUNCTION public.carimbar_consulta(p_agendamento_id uuid, p_codigo_cupao text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_ag       record;
  v_regra    record;
  v_cartao   record;
  v_carimbos integer;
  v_cupao_id uuid;
  v_inseridos integer;
BEGIN
  SELECT * INTO v_ag FROM public.agendamentos WHERE id = p_agendamento_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'agendamento_inexistente'); END IF;
  IF v_ag.estado <> 'realizada' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'consulta_nao_realizada'); END IF;

  PERFORM public.fidelidade_expirar_cupoes(v_ag.contabilista_id, v_ag.cliente_id);

  -- Regra corrente do contabilista.
  SELECT * INTO v_regra FROM public.fidelidade_regras
   WHERE contabilista_id = v_ag.contabilista_id AND substituida_em IS NULL;
  IF NOT FOUND OR NOT v_regra.ativa THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'fidelidade_inativa'); END IF;

  -- Cartão em curso?
  SELECT * INTO v_cartao FROM public.fidelidade_cartoes
   WHERE contabilista_id = v_ag.contabilista_id AND cliente_id = v_ag.cliente_id
     AND NOT completo FOR UPDATE;

  IF NOT FOUND THEN
    -- REGRA NOVA (§15): sem cartão aberto, mas com benefício por usar,
    -- o ciclo seguinte ainda não nasce.
    IF EXISTS (SELECT 1 FROM public.fidelidade_cupoes
                WHERE contabilista_id = v_ag.contabilista_id
                  AND cliente_id = v_ag.cliente_id AND estado = 'disponivel') THEN
      RETURN jsonb_build_object('ok', true, 'carimbado', false,
                                'motivo', 'beneficio_pendente', 'completou', false);
    END IF;

    -- Consulta grátis não abre ciclo quando a regra exige pagamento.
    IF v_regra.exige_pagamento AND coalesce(v_ag.preco_cents, 0) <= 0 THEN
      RETURN jsonb_build_object('ok', true, 'carimbado', false,
                                'motivo', 'consulta_nao_elegivel', 'completou', false);
    END IF;

    INSERT INTO public.fidelidade_cartoes
      (contabilista_id, cliente_id, carimbos, meta, desconto_pct, preco_base_cents,
       regra_id, regra_versao)
    VALUES (v_ag.contabilista_id, v_ag.cliente_id, 0,
            v_regra.meta, v_regra.desconto_pct, 0, v_regra.id, v_regra.versao)
    ON CONFLICT DO NOTHING
    RETURNING * INTO v_cartao;

    IF v_cartao.id IS NULL THEN
      SELECT * INTO v_cartao FROM public.fidelidade_cartoes
       WHERE contabilista_id = v_ag.contabilista_id AND cliente_id = v_ag.cliente_id
         AND NOT completo FOR UPDATE;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'cartao_indisponivel'); END IF;
    END IF;
  ELSE
    -- Cartão em curso: a elegibilidade segue a regra CONGELADA nele.
    SELECT * INTO v_regra FROM public.fidelidade_regras WHERE id = v_cartao.regra_id;
    IF v_regra.id IS NOT NULL AND v_regra.exige_pagamento
       AND coalesce(v_ag.preco_cents, 0) <= 0 THEN
      RETURN jsonb_build_object('ok', true, 'carimbado', false,
                                'motivo', 'consulta_nao_elegivel',
                                'cartao_id', v_cartao.id,
                                'carimbos', v_cartao.carimbos, 'meta', v_cartao.meta,
                                'completou', false);
    END IF;
  END IF;

  INSERT INTO public.fidelidade_carimbos (cartao_id, agendamento_id)
  VALUES (v_cartao.id, p_agendamento_id) ON CONFLICT (agendamento_id) DO NOTHING;
  GET DIAGNOSTICS v_inseridos = ROW_COUNT;

  IF v_inseridos = 0 THEN
    RETURN jsonb_build_object('ok', true, 'repetido', true, 'carimbado', false,
      'cartao_id', v_cartao.id, 'carimbos', v_cartao.carimbos,
      'meta', v_cartao.meta, 'completou', false);
  END IF;

  v_carimbos := v_cartao.carimbos + 1;

  IF v_carimbos < v_cartao.meta THEN
    UPDATE public.fidelidade_cartoes SET carimbos = v_carimbos WHERE id = v_cartao.id;
    RETURN jsonb_build_object('ok', true, 'repetido', false, 'carimbado', true,
      'cartao_id', v_cartao.id, 'carimbos', v_carimbos,
      'meta', v_cartao.meta, 'completou', false);
  END IF;

  -- Cartão completo: fecha, emite benefício e PÁRA. O ciclo seguinte só
  -- nasce depois de o benefício ser usado.
  UPDATE public.fidelidade_cartoes
     SET carimbos = v_cartao.meta, completo = true, completo_em = now()
   WHERE id = v_cartao.id;

  INSERT INTO public.fidelidade_cupoes
    (codigo, contabilista_id, cliente_id, cartao_id, percentagem,
     valor_base_cents, modelo, regra_id, expira_em)
  VALUES (p_codigo_cupao, v_ag.contabilista_id, v_ag.cliente_id, v_cartao.id,
          v_cartao.desconto_pct, NULL, 'percentagem_consulta', v_cartao.regra_id,
          now() + make_interval(days => coalesce(
            (SELECT validade_dias FROM public.fidelidade_regras WHERE id = v_cartao.regra_id), 365)))
  RETURNING id INTO v_cupao_id;

  PERFORM public.fidelidade_ciclo_concluido_hook(
    v_ag.contabilista_id, v_ag.cliente_id, v_cartao.id, v_cartao.meta);

  RETURN jsonb_build_object('ok', true, 'repetido', false, 'carimbado', true,
    'cartao_id', v_cartao.id, 'carimbos', v_cartao.meta, 'meta', v_cartao.meta,
    'completou', true, 'cupao_id', v_cupao_id, 'codigo', p_codigo_cupao,
    'percentagem', v_cartao.desconto_pct, 'modelo', 'percentagem_consulta');
END; $$;

REVOKE EXECUTE ON FUNCTION public.carimbar_consulta(uuid, text) FROM anon, authenticated, PUBLIC;

-- ---------------------------------------------------------------------
-- 10. concluir_consulta com preço e resgate (§20)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.concluir_consulta(uuid, boolean);

CREATE OR REPLACE FUNCTION public.concluir_consulta(
  p_agendamento uuid,
  p_compareceu boolean DEFAULT true,
  p_preco_cents integer DEFAULT NULL,
  p_cupao uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ag record;
  v_cupao record;
  v_desconto integer := 0;
  v_final integer;
  v_fidelidade jsonb := NULL;
  v_vinculo uuid;
  v_beneficio jsonb := NULL;
BEGIN
  IF v_uid IS NULL OR NOT public.contabilista_ativo(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  SELECT * INTO v_ag FROM public.agendamentos a
   WHERE a.id = p_agendamento AND a.contabilista_id = v_uid
     AND a.estado IN ('pedido','confirmado') AND a.inicio <= now()
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_concluivel');
  END IF;

  -- Não compareceu: fecha e termina. Sem preço, sem carimbo.
  IF NOT p_compareceu THEN
    UPDATE public.agendamentos SET estado = 'nao_compareceu', atualizado_em = now()
     WHERE id = p_agendamento;
    RETURN jsonb_build_object('ok', true, 'estado', 'nao_compareceu', 'fidelidade', NULL);
  END IF;

  IF p_preco_cents IS NULL OR p_preco_cents < 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'preco_obrigatorio');
  END IF;

  -- Resgate do benefício, se houver.
  IF p_cupao IS NOT NULL THEN
    SELECT * INTO v_cupao FROM public.fidelidade_cupoes
     WHERE id = p_cupao AND contabilista_id = v_uid AND cliente_id = v_ag.cliente_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'cupao_invalido'); END IF;
    IF v_cupao.estado <> 'disponivel' THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'cupao_indisponivel'); END IF;
    IF v_cupao.expira_em <= now() THEN
      UPDATE public.fidelidade_cupoes SET estado = 'expirado' WHERE id = v_cupao.id;
      RETURN jsonb_build_object('ok', false, 'motivo', 'cupao_expirado'); END IF;

    -- Legacy: a promessa foi sobre um valor congelado. Não se reescreve.
    IF v_cupao.modelo = 'legacy_preco_congelado' THEN
      v_desconto := round(v_cupao.valor_base_cents::numeric * v_cupao.percentagem / 100.0);
      v_desconto := least(v_desconto, p_preco_cents);
    ELSE
      v_desconto := round(p_preco_cents::numeric * v_cupao.percentagem / 100.0);
    END IF;
  END IF;

  v_final := p_preco_cents - v_desconto;

  UPDATE public.agendamentos SET
      estado = 'realizada',
      preco_cents = p_preco_cents,
      desconto_aplicado_cents = v_desconto,
      valor_final_cents = v_final,
      preco_definido_em = now(),
      cupao_id = p_cupao,
      atualizado_em = now()
   WHERE id = p_agendamento;

  -- Um serviço concluído é um facto; a Progressão decide o que vale.
  -- Acontece com ou sem resgate de benefício.
  PERFORM public.progressao_servico_concluido_hook(
    v_uid, v_ag.cliente_id, p_agendamento, p_preco_cents);

  IF p_cupao IS NOT NULL THEN
    UPDATE public.fidelidade_cupoes SET
        estado = 'usado', usado_em = now(), usado_agendamento_id = p_agendamento,
        valor_base_cents = coalesce(valor_base_cents, p_preco_cents),
        desconto_cents = v_desconto,
        valor_final_cents = v_final
     WHERE id = p_cupao;

    v_beneficio := jsonb_build_object(
      'usado', true, 'codigo', v_cupao.codigo, 'percentagem', v_cupao.percentagem,
      'base_cents', p_preco_cents, 'desconto_cents', v_desconto, 'final_cents', v_final);

    -- §20: a consulta de resgate encerra o ciclo anterior e NÃO carimba
    -- o ciclo seguinte. O próximo cartão nasce na consulta a seguir.
    RETURN jsonb_build_object('ok', true, 'estado', 'realizada',
      'preco_cents', p_preco_cents, 'valor_final_cents', v_final,
      'beneficio', v_beneficio, 'fidelidade', NULL);
  END IF;

  v_fidelidade := public.carimbar_consulta(p_agendamento, public.gerar_codigo_cupao());

  IF coalesce((v_fidelidade->>'completou')::boolean, false) THEN
    SELECT v.id INTO v_vinculo FROM public.contabilista_vinculos v
     WHERE v.contabilista_id = v_uid AND v.cliente_id = v_ag.cliente_id
       AND v.estado <> 'terminado';
    IF v_vinculo IS NOT NULL THEN
      PERFORM public.avisar_parte(v_vinculo, v_uid, 'cupao_ganho',
        'Completaste o cartão de fidelidade',
        'Tens um desconto à espera para usar na próxima consulta.', '/dashboard/contabilista');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'estado', 'realizada',
    'preco_cents', p_preco_cents, 'valor_final_cents', v_final,
    'beneficio', NULL, 'fidelidade', v_fidelidade);
END; $$;

REVOKE EXECUTE ON FUNCTION public.concluir_consulta(uuid, boolean, integer, uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.concluir_consulta(uuid, boolean, integer, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.publicar_regra_fidelidade(integer,integer,boolean,boolean) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.publicar_regra_fidelidade(integer,integer,boolean,boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.impacto_nova_regra_fidelidade() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.impacto_nova_regra_fidelidade() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.fidelidade_expirar_cupoes(uuid,uuid) FROM anon, authenticated, PUBLIC;

-- Privilégios explícitos: as regras são lidas, nunca escritas pelo cliente.
REVOKE ALL ON public.fidelidade_regras FROM anon, authenticated;
GRANT SELECT ON public.fidelidade_regras TO authenticated;

-- ---------------------------------------------------------------------
-- 11. A view pública passa a ler a regra corrente, não as colunas espelho
-- ---------------------------------------------------------------------
--  Só as TRÊS colunas de fidelidade mudam de origem: passam a vir da
--  regra corrente em vez das colunas espelho de `contabilistas`. Todo o
--  resto do contrato fica exatamente como a migração do perfil o deixou
--  — em particular `email_contacto`, `preco_consulta_cents` e
--  `duracao_consulta_min`, que o cartão do diretório e a ficha pública
--  mostram. O preço deixou de ser a fonte de verdade da fidelidade
--  (§14.1), mas continua a ser a SUGESTÃO comercial que a ficha publica
--  e que o diálogo de concluir consulta pré-enche.
--
--  `DROP` antes de `CREATE`, pela mesma razão da migração do perfil: a
--  lista de colunas muda de forma e `CREATE OR REPLACE VIEW` só sabe
--  acrescentar no fim.
DROP VIEW IF EXISTS public.contabilistas_publico;
CREATE VIEW public.contabilistas_publico
WITH (security_invoker = false) AS
SELECT
  c.user_id,
  c.slug,
  c.nome,
  c.occ,
  (c.occ_verificado_em IS NOT NULL) AS occ_verificado,
  c.titulo_profissional,
  c.apresentacao_curta,
  c.bio,
  c.distrito,
  c.concelho,
  c.especialidades,
  c.modalidades,
  c.idiomas,
  c.anos_experiencia,
  c.resposta_media_horas,
  c.email_contacto,
  c.website,
  c.linkedin_url,
  c.linkedin_avatar_url,
  (c.linkedin_ligado_em IS NOT NULL) AS linkedin_ligado,
  c.aceita_novos_clientes,
  c.preco_consulta_cents,
  c.duracao_consulta_min,
  coalesce(r.ativa, false)                                  AS fidelidade_ativa,
  CASE WHEN coalesce(r.ativa, false) THEN r.meta         END AS fidelidade_meta,
  CASE WHEN coalesce(r.ativa, false) THEN r.desconto_pct END AS fidelidade_desconto_pct,
  c.criado_em
FROM public.contabilistas c
LEFT JOIN public.fidelidade_regras r
       ON r.contabilista_id = c.user_id AND r.substituida_em IS NULL
WHERE c.estado = 'aprovado';

COMMENT ON VIEW public.contabilistas_publico IS
  'O contrato público do diretório e do perfil público. Acrescentar uma coluna aqui é uma decisão; acrescentar uma coluna a `contabilistas` deixa de ser. Não expõe telefone (ver contacto_do_contabilista), linkedin_subject, pedido_id nem estado. A fidelidade vem da regra corrente, não das colunas espelho.';

GRANT SELECT ON public.contabilistas_publico TO anon, authenticated;

COMMIT;

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260815233000_progressao_comissao_contabilistas.sql              ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- =====================================================================
-- PROGRESSÃO E COMISSÃO
--
-- Fonte de verdade: Relatório Mestre §52–119 e §164 (valores oficiais).
-- A Referência C governa hierarquia visual, não números.
--
-- Regra-mãe: cada patamar REDUZ a comissão do Recibo Certo. O próximo
-- patamar conquista-se por mérito (XP de atividade verificável) OU
-- antecipa-se com um pagamento único. As duas dimensões são
-- independentes e nunca se contaminam:
--
--     efetivo = max(conquistado, comprado)
--
-- Comprar não cria XP. Ganhar XP não cria compra.
--
-- Desenho defensivo desta migração:
--
--   * NADA de progressão vive em `public.contabilistas`. Essa tabela é
--     lida por `anon` (policy contabilistas_diretorio_publico) e uma
--     coluna `xp` ou `comissao_bps` lá dentro seria pública no dia em
--     que fosse criada. §138 proíbe mostrar isto ao cliente — aqui
--     a proibição é estrutural, não uma convenção de código.
--
--   * `authenticated` NÃO tem INSERT/UPDATE/DELETE em nenhum ledger nem
--     no estado materializado. Só SELECT da própria linha. Tudo o que
--     mexe em saldos é SECURITY DEFINER e recebe FACTOS
--     (`este agendamento foi concluído`), nunca deltas
--     (`soma-me 100 XP`).
--
--   * Feature flags são lidas no servidor. Uma flag só no cliente não
--     protege um write.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Flags de capacidade (§95)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progressao_flags (
  chave text PRIMARY KEY,
  ativa boolean NOT NULL DEFAULT false,
  nota text
);

INSERT INTO public.progressao_flags (chave, ativa, nota) VALUES
  ('accountant_progression_read', false, 'Mostrar a área de Progressão em leitura.'),
  ('accountant_progression_earn_xp', false, 'Registar XP a sério. Antes disto o registo é shadow.'),
  ('accountant_progression_shadow', true,  'Regista eventos com xp_delta real mas marcados shadow=true; não movem patamar.'),
  ('accountant_loyalty_credits', false,    'Emitir e gastar Créditos de Fidelidade.'),
  ('accountant_tier_purchase', false,      'Permitir desbloqueio pago do próximo patamar.'),
  ('accountant_commission_ledger', false,  'Fase B — ledger real de comissão por serviço.'),
  ('accountant_connect_payments', false,   'Fase C — só depois de gate jurídico/fiscal/PSP.')
ON CONFLICT (chave) DO NOTHING;

ALTER TABLE public.progressao_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS progressao_flags_leitura ON public.progressao_flags;
CREATE POLICY progressao_flags_leitura ON public.progressao_flags
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.progressao_flag(p_chave text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT coalesce((SELECT ativa FROM public.progressao_flags WHERE chave = p_chave), false);
$$;

-- ---------------------------------------------------------------------
-- 1. Catálogo versionado de patamares (§55, valores oficiais §164)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comissao_patamares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_catalogo integer NOT NULL CHECK (versao_catalogo >= 1),
  ordem smallint NOT NULL CHECK (ordem BETWEEN 1 AND 20),
  slug text NOT NULL CHECK (slug ~ '^[a-z][a-z0-9-]*$'),
  titulo text NOT NULL,
  comissao_bps integer NOT NULL CHECK (comissao_bps BETWEEN 0 AND 10000),
  xp_minimo integer NOT NULL CHECK (xp_minimo >= 0),
  -- Segundo eixo, proposto pelo mockup da Progressão («1 / 3 clientes»).
  -- Fica a 0 na versão 1 do catálogo: comportamento idêntico ao que a
  -- especificação define. Quando os valores por patamar forem decididos,
  -- é um UPDATE a esta tabela e mais nada.
  --
  -- Vale a pena: com progressão só por XP, 2300 XP são alcançáveis com um
  -- único cliente muito ativo. Exigir clientes distintos é um travão
  -- anti-farming estrutural, melhor do que as heurísticas de velocidade
  -- da §84.3 — porque não precisa de detetar nada.
  clientes_minimo smallint NOT NULL DEFAULT 0 CHECK (clientes_minimo >= 0),
  preco_desbloqueio_cents integer CHECK (preco_desbloqueio_cents IS NULL OR preco_desbloqueio_cents >= 0),
  ativo boolean NOT NULL DEFAULT true,
  valido_desde timestamptz NOT NULL DEFAULT now(),
  valido_ate timestamptz,
  UNIQUE (versao_catalogo, ordem),
  UNIQUE (versao_catalogo, slug)
);

COMMENT ON TABLE public.comissao_patamares IS
  'Fonte única de comissão, XP e preço. Recalibrar = inserir versao_catalogo nova. Uma compra já feita guarda a versão com que foi feita e continua explicável.';
COMMENT ON COLUMN public.comissao_patamares.comissao_bps IS
  'Basis points. 10% = 1000. Dinheiro e percentagens financeiras nunca em float.';

INSERT INTO public.comissao_patamares
  (versao_catalogo, ordem, slug, titulo, comissao_bps, xp_minimo, preco_desbloqueio_cents) VALUES
  (1, 1, 'base',         'Base',         1000,    0, NULL),
  (1, 2, 'ativo',        'Ativo',         900,  200, 1499),
  (1, 3, 'crescimento',  'Crescimento',   800,  500, 2499),
  (1, 4, 'consolidado',  'Consolidado',   700,  900, 3999),
  (1, 5, 'referencia',   'Referência',    600, 1500, 6499),
  (1, 6, 'parceiro',     'Parceiro',      500, 2300, 9999)
ON CONFLICT (versao_catalogo, ordem) DO NOTHING;

-- Invariantes do catálogo: a comissão desce, o XP sobe, o preço sobe.
-- Sem isto, uma recalibração distraída podia publicar um patamar que
-- aumenta a comissão — exatamente a copy que §164 proíbe.
CREATE OR REPLACE FUNCTION public.assert_catalogo_patamares_coerente(p_versao integer)
RETURNS void LANGUAGE plpgsql STABLE SET search_path TO '' AS $$
DECLARE
  r record;
  v_primeiro boolean := true;
  v_bps integer; v_xp integer; v_preco integer;
BEGIN
  FOR r IN SELECT * FROM public.comissao_patamares
            WHERE versao_catalogo = p_versao ORDER BY ordem LOOP
    IF NOT v_primeiro THEN
      IF r.comissao_bps >= v_bps THEN
        RAISE EXCEPTION 'Patamar % não reduz a comissão (% >= %).', r.slug, r.comissao_bps, v_bps;
      END IF;
      IF r.xp_minimo <= v_xp THEN
        RAISE EXCEPTION 'Patamar % não exige mais XP do que o anterior.', r.slug;
      END IF;
      IF coalesce(r.preco_desbloqueio_cents, 0) < coalesce(v_preco, 0) THEN
        RAISE EXCEPTION 'Patamar % é mais barato do que o anterior.', r.slug;
      END IF;
    END IF;
    v_primeiro := false;
    v_bps := r.comissao_bps; v_xp := r.xp_minimo; v_preco := r.preco_desbloqueio_cents;
  END LOOP;
END; $$;

SELECT public.assert_catalogo_patamares_coerente(1);

CREATE OR REPLACE FUNCTION public.catalogo_versao_corrente() RETURNS integer
LANGUAGE sql STABLE SET search_path TO '' AS $$
  SELECT max(versao_catalogo) FROM public.comissao_patamares
   WHERE ativo AND valido_desde <= now() AND (valido_ate IS NULL OR valido_ate > now());
$$;

ALTER TABLE public.comissao_patamares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comissao_patamares_leitura ON public.comissao_patamares;
CREATE POLICY comissao_patamares_leitura ON public.comissao_patamares
  FOR SELECT TO authenticated USING (ativo);
-- Deliberadamente NÃO exposto a `anon`: a grelha de comissões é uma
-- relação entre a plataforma e o profissional (§138).

-- ---------------------------------------------------------------------
-- 2. Estado materializado
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contabilista_progressao (
  contabilista_id uuid PRIMARY KEY REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  creditos_disponiveis integer NOT NULL DEFAULT 0 CHECK (creditos_disponiveis >= 0),
  creditos_reservados integer NOT NULL DEFAULT 0 CHECK (creditos_reservados >= 0),
  -- Clientes distintos com pelo menos um serviço PAGO concluído. Derivado
  -- dos eventos `new_client_first_service`, que já são idempotentes por par
  -- contabilista–cliente. Nunca retrocede: um cliente que sai continua a
  -- contar, senão o patamar recuava e a §112 proíbe-o.
  clientes_elegiveis integer NOT NULL DEFAULT 0 CHECK (clientes_elegiveis >= 0),
  highest_earned_tier smallint NOT NULL DEFAULT 1 CHECK (highest_earned_tier >= 1),
  highest_purchased_tier smallint NOT NULL DEFAULT 1 CHECK (highest_purchased_tier >= 1),
  revision bigint NOT NULL DEFAULT 1,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.contabilista_progressao IS
  'Cache de leitura. A verdade está nos ledgers. `authenticated` só faz SELECT da própria linha; escrever é exclusivo das RPCs SECURITY DEFINER.';

CREATE OR REPLACE FUNCTION public.patamar_efetivo(p_conquistado smallint, p_comprado smallint)
RETURNS smallint LANGUAGE sql IMMUTABLE SET search_path TO '' AS $$
  SELECT greatest(p_conquistado, p_comprado);
$$;

ALTER TABLE public.contabilista_progressao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS progressao_self ON public.contabilista_progressao;
CREATE POLICY progressao_self ON public.contabilista_progressao
  FOR SELECT TO authenticated USING (contabilista_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------
-- 3. Ledger de XP (§58)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progressao_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN (
    'service_completed', 'new_client_first_service', 'loyalty_cycle_completed',
    'admin_adjustment', 'reversal')),
  chave_idempotencia text NOT NULL,
  xp_delta integer NOT NULL,
  shadow boolean NOT NULL DEFAULT false,
  entidade_tipo text CHECK (entidade_tipo IS NULL OR entidade_tipo IN ('agendamento','vinculo','cartao')),
  entidade_id uuid,
  reversal_of uuid REFERENCES public.progressao_eventos(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contabilista_id, chave_idempotencia),
  CONSTRAINT progressao_eventos_metadata_pequena CHECK (pg_column_size(metadata) <= 512)
);

CREATE INDEX IF NOT EXISTS progressao_eventos_contabilista_idx
  ON public.progressao_eventos (contabilista_id, criado_em DESC);

COMMENT ON COLUMN public.progressao_eventos.shadow IS
  'Shadow XP (§96): o evento é registado com o valor real mas não move patamar. Serve para calibrar thresholds antes de os cristalizar.';
COMMENT ON COLUMN public.progressao_eventos.metadata IS
  'Só informação operacional. Nunca nomes, NIF, documentos, simulações ou conteúdo de partilhas (§58, §97).';

-- A observabilidade não pode passar a ser um canal de dados fiscais.
CREATE OR REPLACE FUNCTION public.progressao_metadata_sem_pii() RETURNS trigger
LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE v_permitidas constant text[] := ARRAY['catalogVersion','reason','meta','origem','regraVersao'];
BEGIN
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(NEW.metadata) k WHERE k <> ALL (v_permitidas)) THEN
    RAISE EXCEPTION 'metadata de progressão só aceita %.', array_to_string(v_permitidas, ', ')
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_progressao_metadata ON public.progressao_eventos;
CREATE TRIGGER trg_progressao_metadata BEFORE INSERT OR UPDATE ON public.progressao_eventos
  FOR EACH ROW EXECUTE FUNCTION public.progressao_metadata_sem_pii();

ALTER TABLE public.progressao_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS progressao_eventos_self ON public.progressao_eventos;
CREATE POLICY progressao_eventos_self ON public.progressao_eventos
  FOR SELECT TO authenticated USING (contabilista_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------
-- 4. Ledger de créditos (§66, §67)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creditos_fidelidade_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  cartao_id uuid REFERENCES public.fidelidade_cartoes(id) ON DELETE SET NULL,
  compra_id uuid,
  tipo text NOT NULL CHECK (tipo IN ('earned','held','released','spent','reversal','admin_adjustment')),
  delta integer NOT NULL,
  reversal_of uuid REFERENCES public.creditos_fidelidade_ledger(id),
  chave_idempotencia text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contabilista_id, chave_idempotencia)
);

CREATE INDEX IF NOT EXISTS creditos_ledger_contabilista_idx
  ON public.creditos_fidelidade_ledger (contabilista_id, criado_em DESC);

ALTER TABLE public.creditos_fidelidade_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS creditos_ledger_self ON public.creditos_fidelidade_ledger;
CREATE POLICY creditos_ledger_self ON public.creditos_fidelidade_ledger
  FOR SELECT TO authenticated USING (contabilista_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------
-- 5. Compras (§71)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progressao_compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  target_tier_order smallint NOT NULL CHECK (target_tier_order >= 2),
  catalog_version integer NOT NULL,
  base_price_cents integer NOT NULL CHECK (base_price_cents >= 0),
  loyalty_credits integer NOT NULL DEFAULT 0 CHECK (loyalty_credits >= 0),
  loyalty_discount_pct integer NOT NULL DEFAULT 0 CHECK (loyalty_discount_pct BETWEEN 0 AND 100),
  final_price_cents integer NOT NULL CHECK (final_price_cents >= 0),
  currency text NOT NULL DEFAULT 'eur' CHECK (currency = 'eur'),
  estado text NOT NULL CHECK (estado IN (
    'draft','checkout_created','paid','applied','expired','cancelled',
    'needs_refund','refunded','failed')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  idempotency_key text NOT NULL UNIQUE,
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  criado_em timestamptz NOT NULL DEFAULT now(),
  pago_em timestamptz,
  aplicado_em timestamptz
);

CREATE INDEX IF NOT EXISTS progressao_compras_contabilista_idx
  ON public.progressao_compras (contabilista_id, criado_em DESC);
-- Uma intenção viva de cada vez: evita duas abas a reservar créditos.
CREATE UNIQUE INDEX IF NOT EXISTS progressao_compra_viva_idx
  ON public.progressao_compras (contabilista_id)
  WHERE estado IN ('draft','checkout_created');

COMMENT ON TABLE public.progressao_compras IS
  'Snapshot comercial da compra: catálogo, preço base, créditos e desconto usados, preço final. Se o catálogo mudar depois, a compra histórica continua explicável.';

ALTER TABLE public.progressao_compras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS progressao_compras_self ON public.progressao_compras;
CREATE POLICY progressao_compras_self ON public.progressao_compras
  FOR SELECT TO authenticated USING (contabilista_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------
-- 6. Preço e desconto — cálculo do lado do servidor (§63, §64)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.desconto_por_creditos(p_creditos integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO '' AS $$
  -- Marcos, não escada acumulável. 10 créditos = 20%, nunca 5+15+20.
  SELECT CASE
    WHEN p_creditos >= 10 THEN 20
    WHEN p_creditos >= 5  THEN 15
    WHEN p_creditos >= 1  THEN 5
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.creditos_do_marco(p_creditos integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO '' AS $$
  -- Quantos créditos são efetivamente consumidos por essa escolha.
  SELECT CASE
    WHEN p_creditos >= 10 THEN 10
    WHEN p_creditos >= 5  THEN 5
    WHEN p_creditos >= 1  THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.preco_com_desconto(p_base_cents integer, p_pct integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO '' AS $$
  SELECT round(p_base_cents::numeric * (100 - p_pct) / 100.0)::integer;
$$;

-- ---------------------------------------------------------------------
-- 7. Recalcular estado a partir dos ledgers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalcular_progressao(p_contabilista uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_xp integer;
  v_earned smallint;
  v_disp integer;
  v_res integer;
  v_clientes integer;
BEGIN
  SELECT coalesce(sum(xp_delta) FILTER (WHERE NOT shadow), 0) INTO v_xp
    FROM public.progressao_eventos WHERE contabilista_id = p_contabilista;
  v_xp := greatest(v_xp, 0);

  SELECT count(DISTINCT entidade_id) INTO v_clientes
    FROM public.progressao_eventos
   WHERE contabilista_id = p_contabilista
     AND tipo = 'new_client_first_service' AND NOT shadow;

  -- Um patamar exige XP E clientes. Com clientes_minimo = 0 (versão 1 do
  -- catálogo) a segunda condição é sempre verdadeira e o comportamento é
  -- exatamente o especificado.
  SELECT coalesce(max(ordem), 1) INTO v_earned
    FROM public.comissao_patamares
   WHERE versao_catalogo = public.catalogo_versao_corrente()
     AND ativo AND xp_minimo <= v_xp AND clientes_minimo <= v_clientes;

  -- Contabilidade dos créditos, em duas contas que NÃO se sobrepõem:
  --
  --   disponíveis = ganhos + devolvidos + ajustes − reservados
  --   reservados  = reservados − devolvidos − gastos
  --
  -- `spent` NÃO volta a descontar de `disponíveis`: esses créditos já
  -- saíram de lá no momento do `held`. Descontá-los outra vez faria o
  -- saldo cair a dobrar em cada compra concluída.
  SELECT coalesce(sum(delta) FILTER (WHERE tipo IN ('earned','released','reversal','admin_adjustment')), 0)
       - coalesce(sum(delta) FILTER (WHERE tipo = 'held'), 0),
         coalesce(sum(delta) FILTER (WHERE tipo = 'held'), 0)
       - coalesce(sum(delta) FILTER (WHERE tipo IN ('released','spent')), 0)
    INTO v_disp, v_res
    FROM public.creditos_fidelidade_ledger WHERE contabilista_id = p_contabilista;

  INSERT INTO public.contabilista_progressao AS p (contabilista_id, xp, highest_earned_tier,
                                                   creditos_disponiveis, creditos_reservados,
                                                   clientes_elegiveis)
  VALUES (p_contabilista, v_xp, v_earned, greatest(coalesce(v_disp,0),0), greatest(coalesce(v_res,0),0),
          coalesce(v_clientes,0))
  ON CONFLICT (contabilista_id) DO UPDATE SET
    xp = EXCLUDED.xp,
    clientes_elegiveis = greatest(p.clientes_elegiveis, EXCLUDED.clientes_elegiveis),
    -- §60/§112: um patamar conquistado não recua por reversão antiga.
    highest_earned_tier = greatest(p.highest_earned_tier, EXCLUDED.highest_earned_tier),
    creditos_disponiveis = EXCLUDED.creditos_disponiveis,
    creditos_reservados = EXCLUDED.creditos_reservados,
    revision = p.revision + 1,
    atualizado_em = now();
END; $$;

REVOKE EXECUTE ON FUNCTION public.recalcular_progressao(uuid) FROM anon, authenticated, PUBLIC;

-- ---------------------------------------------------------------------
-- 8. Registar eventos — recebem FACTOS, derivam a recompensa (§86)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.progressao_registar(
  p_contabilista uuid, p_tipo text, p_chave text, p_xp integer,
  p_entidade_tipo text, p_entidade_id uuid, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_n integer; v_shadow boolean;
BEGIN
  IF NOT public.progressao_flag('accountant_progression_earn_xp')
     AND NOT public.progressao_flag('accountant_progression_shadow') THEN
    RETURN false;
  END IF;
  v_shadow := NOT public.progressao_flag('accountant_progression_earn_xp');

  INSERT INTO public.progressao_eventos
    (contabilista_id, tipo, chave_idempotencia, xp_delta, shadow, entidade_tipo, entidade_id, metadata)
  VALUES (p_contabilista, p_tipo, p_chave, p_xp, v_shadow, p_entidade_tipo, p_entidade_id, p_metadata)
  ON CONFLICT (contabilista_id, chave_idempotencia) DO NOTHING;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RETURN false; END IF;   -- já tinha sido registado
  RETURN true;
END; $$;

REVOKE EXECUTE ON FUNCTION public.progressao_registar(uuid,text,text,integer,text,uuid,jsonb)
  FROM anon, authenticated, PUBLIC;

-- +10 XP por serviço elegível, +25 na primeira vez com aquele cliente.
CREATE OR REPLACE FUNCTION public.progressao_servico_concluido_hook(
  p_contabilista uuid, p_cliente uuid, p_agendamento uuid, p_preco_cents integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_vinculo uuid; v_mudou boolean := false; v_cat integer;
BEGIN
  -- Um serviço a zero euros não é atividade económica elegível (§57).
  IF coalesce(p_preco_cents, 0) <= 0 THEN RETURN; END IF;

  v_cat := public.catalogo_versao_corrente();

  IF public.progressao_registar(p_contabilista, 'service_completed',
        'service_completed:' || p_agendamento::text, 10, 'agendamento', p_agendamento,
        jsonb_build_object('catalogVersion', v_cat, 'reason', 'service_completed')) THEN
    v_mudou := true;
  END IF;

  SELECT v.id INTO v_vinculo FROM public.contabilista_vinculos v
   WHERE v.contabilista_id = p_contabilista AND v.cliente_id = p_cliente
     AND v.estado <> 'terminado';

  IF v_vinculo IS NOT NULL THEN
    -- §84.2: uma vez por PAR contabilista–cliente, não por vínculo
    -- recriado. A chave usa o par, não o id do vínculo.
    IF public.progressao_registar(p_contabilista, 'new_client_first_service',
          'new_client_first_service:' || p_cliente::text, 25, 'vinculo', v_vinculo,
          jsonb_build_object('catalogVersion', v_cat, 'reason', 'new_client_first_service')) THEN
      v_mudou := true;
    END IF;
  END IF;

  IF v_mudou THEN PERFORM public.recalcular_progressao(p_contabilista); END IF;
END; $$;

REVOKE EXECUTE ON FUNCTION public.progressao_servico_concluido_hook(uuid,uuid,uuid,integer)
  FROM anon, authenticated, PUBLIC;

-- Cartão de fidelidade concluído: +100 XP e +1 crédito, mas só se a meta
-- do ciclo for >= 5 (§62 — impede configurar meta 3 para fabricar moeda).
CREATE OR REPLACE FUNCTION public.fidelidade_ciclo_concluido_hook(
  p_contabilista uuid, p_cliente uuid, p_cartao uuid, p_meta integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_mudou boolean := false; v_cat integer;
BEGIN
  IF coalesce(p_meta, 0) < 5 THEN RETURN; END IF;

  v_cat := public.catalogo_versao_corrente();

  IF public.progressao_registar(p_contabilista, 'loyalty_cycle_completed',
        'loyalty_cycle_completed:' || p_cartao::text, 100, 'cartao', p_cartao,
        jsonb_build_object('catalogVersion', v_cat, 'reason', 'loyalty_cycle_completed',
                           'meta', p_meta)) THEN
    v_mudou := true;
  END IF;

  IF public.progressao_flag('accountant_loyalty_credits') THEN
    INSERT INTO public.creditos_fidelidade_ledger
      (contabilista_id, cartao_id, tipo, delta, chave_idempotencia)
    VALUES (p_contabilista, p_cartao, 'earned', 1, 'loyalty_cycle_completed:' || p_cartao::text)
    ON CONFLICT (contabilista_id, chave_idempotencia) DO NOTHING;
    v_mudou := true;
  END IF;

  IF v_mudou THEN PERFORM public.recalcular_progressao(p_contabilista); END IF;
END; $$;

REVOKE EXECUTE ON FUNCTION public.fidelidade_ciclo_concluido_hook(uuid,uuid,uuid,integer)
  FROM anon, authenticated, PUBLIC;

-- ---------------------------------------------------------------------
-- 9. Estado para a UI
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.progressao_estado()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_p record; v_cat integer;
  v_efetivo smallint; v_atual record; v_proximo record;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;
  IF NOT public.progressao_flag('accountant_progression_read') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'indisponivel');
  END IF;

  v_cat := public.catalogo_versao_corrente();

  -- Um contabilista aprovado que ainda não tem linha lê o estado zero,
  -- sem escrever nada num caminho que é STABLE.
  SELECT coalesce(p.xp, 0)                          AS xp,
         coalesce(p.creditos_disponiveis, 0)        AS creditos_disponiveis,
         coalesce(p.creditos_reservados, 0)         AS creditos_reservados,
         coalesce(p.clientes_elegiveis, 0)          AS clientes_elegiveis,
         coalesce(p.highest_earned_tier, 1::smallint)    AS highest_earned_tier,
         coalesce(p.highest_purchased_tier, 1::smallint) AS highest_purchased_tier
    INTO v_p
    FROM (SELECT 1) AS z
    LEFT JOIN public.contabilista_progressao p ON p.contabilista_id = v_uid;

  v_efetivo := public.patamar_efetivo(v_p.highest_earned_tier, v_p.highest_purchased_tier);

  SELECT * INTO v_atual   FROM public.comissao_patamares
   WHERE versao_catalogo = v_cat AND ordem = v_efetivo;
  SELECT * INTO v_proximo FROM public.comissao_patamares
   WHERE versao_catalogo = v_cat AND ordem = v_efetivo + 1;

  RETURN jsonb_build_object(
    'ok', true,
    'catalogVersion', v_cat,
    'xp', v_p.xp,
    'clientesElegiveis', v_p.clientes_elegiveis,
    'creditosDisponiveis', v_p.creditos_disponiveis,
    'creditosReservados', v_p.creditos_reservados,
    'patamarConquistado', v_p.highest_earned_tier,
    'patamarComprado', v_p.highest_purchased_tier,
    'patamarEfetivo', v_efetivo,
    'atual', CASE WHEN v_atual.id IS NULL THEN NULL ELSE jsonb_build_object(
      'ordem', v_atual.ordem, 'slug', v_atual.slug, 'titulo', v_atual.titulo,
      'comissaoBps', v_atual.comissao_bps) END,
    'proximo', CASE WHEN v_proximo.id IS NULL THEN NULL ELSE jsonb_build_object(
      'ordem', v_proximo.ordem, 'slug', v_proximo.slug, 'titulo', v_proximo.titulo,
      'comissaoBps', v_proximo.comissao_bps, 'xpMinimo', v_proximo.xp_minimo,
      'xpEmFalta', greatest(v_proximo.xp_minimo - v_p.xp, 0),
      'clientesMinimo', v_proximo.clientes_minimo,
      'clientesEmFalta', greatest(v_proximo.clientes_minimo - v_p.clientes_elegiveis, 0),
      'precoBaseCents', v_proximo.preco_desbloqueio_cents,
      'descontoPct', public.desconto_por_creditos(v_p.creditos_disponiveis),
      'precoComDescontoCents', public.preco_com_desconto(
          v_proximo.preco_desbloqueio_cents,
          public.desconto_por_creditos(v_p.creditos_disponiveis))) END,
    'compraDisponivel', public.progressao_flag('accountant_tier_purchase')
  );
END; $$;

REVOKE EXECUTE ON FUNCTION public.progressao_estado() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.progressao_estado() TO authenticated;

-- ---------------------------------------------------------------------
-- 10. Intenção de compra — o browser não escolhe preço nem alvo (§72)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_intencao_desbloqueio(
  p_creditos_a_usar integer DEFAULT 0,
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_p record; v_cat integer; v_efetivo smallint;
  v_alvo record; v_creditos integer; v_pct integer; v_final integer;
  v_id uuid; v_key text;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao'); END IF;
  IF NOT public.progressao_flag('accountant_tier_purchase') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'compra_indisponivel'); END IF;

  SELECT * INTO v_p FROM public.contabilista_progressao
   WHERE contabilista_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.contabilista_progressao (contabilista_id) VALUES (v_uid)
    ON CONFLICT DO NOTHING;
    SELECT * INTO v_p FROM public.contabilista_progressao
     WHERE contabilista_id = v_uid FOR UPDATE;
  END IF;

  -- Libertar intenções mortas antes de decidir.
  PERFORM public.expirar_intencoes_desbloqueio(v_uid);

  v_cat := public.catalogo_versao_corrente();
  v_efetivo := public.patamar_efetivo(v_p.highest_earned_tier, v_p.highest_purchased_tier);

  -- §68: só o PRÓXIMO patamar.
  SELECT * INTO v_alvo FROM public.comissao_patamares
   WHERE versao_catalogo = v_cat AND ordem = v_efetivo + 1 AND ativo;
  IF NOT FOUND OR v_alvo.preco_desbloqueio_cents IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_patamar_seguinte'); END IF;

  v_creditos := public.creditos_do_marco(
    least(greatest(coalesce(p_creditos_a_usar, 0), 0), v_p.creditos_disponiveis));
  v_pct   := public.desconto_por_creditos(v_creditos);
  v_final := public.preco_com_desconto(v_alvo.preco_desbloqueio_cents, v_pct);
  v_key   := coalesce(p_idempotency_key, gen_random_uuid()::text);

  INSERT INTO public.progressao_compras
    (contabilista_id, target_tier_order, catalog_version, base_price_cents,
     loyalty_credits, loyalty_discount_pct, final_price_cents, estado, idempotency_key)
  VALUES (v_uid, v_alvo.ordem, v_cat, v_alvo.preco_desbloqueio_cents,
          v_creditos, v_pct, v_final, 'draft', v_key)
  RETURNING id INTO v_id;

  IF v_creditos > 0 THEN
    INSERT INTO public.creditos_fidelidade_ledger
      (contabilista_id, compra_id, tipo, delta, chave_idempotencia)
    VALUES (v_uid, v_id, 'held', v_creditos, 'held:' || v_id::text);
  END IF;

  PERFORM public.recalcular_progressao(v_uid);

  RETURN jsonb_build_object('ok', true, 'compraId', v_id,
    'targetTier', v_alvo.ordem, 'targetSlug', v_alvo.slug,
    'baseCents', v_alvo.preco_desbloqueio_cents,
    'creditos', v_creditos, 'descontoPct', v_pct, 'finalCents', v_final,
    'idempotencyKey', v_key);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'motivo', 'compra_em_curso');
END; $$;

CREATE OR REPLACE FUNCTION public.expirar_intencoes_desbloqueio(p_contabilista uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE r record; v_n integer := 0;
BEGIN
  FOR r IN SELECT * FROM public.progressao_compras
            WHERE estado IN ('draft','checkout_created') AND expira_em <= now()
              AND (p_contabilista IS NULL OR contabilista_id = p_contabilista)
            FOR UPDATE LOOP
    UPDATE public.progressao_compras SET estado = 'expired' WHERE id = r.id;
    IF r.loyalty_credits > 0 THEN
      INSERT INTO public.creditos_fidelidade_ledger
        (contabilista_id, compra_id, tipo, delta, chave_idempotencia)
      VALUES (r.contabilista_id, r.id, 'released', r.loyalty_credits, 'released:' || r.id::text)
      ON CONFLICT (contabilista_id, chave_idempotencia) DO NOTHING;
    END IF;
    PERFORM public.recalcular_progressao(r.contabilista_id);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END; $$;

-- ---------------------------------------------------------------------
-- 11. Aplicar a compra — só o servidor, só uma vez (§73)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aplicar_compra_patamar(
  p_compra uuid,
  p_stripe_payment_intent text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_c record; v_p record; v_efetivo smallint;
BEGIN
  SELECT * INTO v_c FROM public.progressao_compras WHERE id = p_compra FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'compra_inexistente'); END IF;

  -- Webhook repetido: mesmo resultado, sem efeitos novos.
  IF v_c.estado = 'applied' THEN
    RETURN jsonb_build_object('ok', true, 'repetido', true, 'compraId', v_c.id); END IF;
  IF v_c.estado IN ('refunded','cancelled','expired','failed') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'compra_encerrada', 'estado', v_c.estado); END IF;

  SELECT * INTO v_p FROM public.contabilista_progressao
   WHERE contabilista_id = v_c.contabilista_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.contabilista_progressao (contabilista_id)
    VALUES (v_c.contabilista_id) ON CONFLICT DO NOTHING;
    SELECT * INTO v_p FROM public.contabilista_progressao
     WHERE contabilista_id = v_c.contabilista_id FOR UPDATE;
  END IF;

  v_efetivo := public.patamar_efetivo(v_p.highest_earned_tier, v_p.highest_purchased_tier);

  -- §70: o XP alcançou o patamar durante o checkout. A compra ficou sem
  -- objeto. NUNCA transferir o pagamento para o patamar seguinte.
  IF v_efetivo >= v_c.target_tier_order THEN
    UPDATE public.progressao_compras
       SET estado = 'needs_refund', pago_em = coalesce(pago_em, now()),
           stripe_payment_intent_id = coalesce(p_stripe_payment_intent, stripe_payment_intent_id)
     WHERE id = v_c.id;
    IF v_c.loyalty_credits > 0 THEN
      INSERT INTO public.creditos_fidelidade_ledger
        (contabilista_id, compra_id, tipo, delta, chave_idempotencia)
      VALUES (v_c.contabilista_id, v_c.id, 'released', v_c.loyalty_credits, 'released:' || v_c.id::text)
      ON CONFLICT (contabilista_id, chave_idempotencia) DO NOTHING;
    END IF;
    PERFORM public.recalcular_progressao(v_c.contabilista_id);
    RETURN jsonb_build_object('ok', false, 'motivo', 'patamar_ja_conquistado',
                              'estado', 'needs_refund', 'compraId', v_c.id);
  END IF;

  UPDATE public.contabilista_progressao
     SET highest_purchased_tier = greatest(highest_purchased_tier, v_c.target_tier_order),
         revision = revision + 1, atualizado_em = now()
   WHERE contabilista_id = v_c.contabilista_id;
  -- Repare-se: `xp` não é tocado. Comprar não cria mérito (§69).

  IF v_c.loyalty_credits > 0 THEN
    INSERT INTO public.creditos_fidelidade_ledger
      (contabilista_id, compra_id, tipo, delta, chave_idempotencia)
    VALUES (v_c.contabilista_id, v_c.id, 'spent', v_c.loyalty_credits, 'spent:' || v_c.id::text)
    ON CONFLICT (contabilista_id, chave_idempotencia) DO NOTHING;
  END IF;

  UPDATE public.progressao_compras
     SET estado = 'applied', pago_em = coalesce(pago_em, now()), aplicado_em = now(),
         stripe_payment_intent_id = coalesce(p_stripe_payment_intent, stripe_payment_intent_id)
   WHERE id = v_c.id;

  PERFORM public.recalcular_progressao(v_c.contabilista_id);
  PERFORM public.avisar_utilizador(v_c.contabilista_id, 'patamar_desbloqueado',
    'Patamar desbloqueado', 'A tua comissão foi atualizada.', '/contabilista/progressao');

  RETURN jsonb_build_object('ok', true, 'repetido', false, 'compraId', v_c.id,
                            'patamar', v_c.target_tier_order);
END; $$;

-- Estas duas nunca são chamáveis pelo browser: são de webhook/servidor.
REVOKE EXECUTE ON FUNCTION public.aplicar_compra_patamar(uuid, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expirar_intencoes_desbloqueio(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.criar_intencao_desbloqueio(integer, text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.criar_intencao_desbloqueio(integer, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.progressao_flag(text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.progressao_flag(text) TO authenticated;

-- ---------------------------------------------------------------------
-- 12. Reversão (§85) — lançamento compensatório, nunca DELETE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverter_evento_progressao(p_evento uuid, p_motivo text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_e record;
BEGIN
  SELECT * INTO v_e FROM public.progressao_eventos WHERE id = p_evento;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'evento_inexistente'); END IF;
  IF EXISTS (SELECT 1 FROM public.progressao_eventos WHERE reversal_of = p_evento) THEN
    RETURN jsonb_build_object('ok', true, 'repetido', true); END IF;

  INSERT INTO public.progressao_eventos
    (contabilista_id, tipo, chave_idempotencia, xp_delta, shadow,
     entidade_tipo, entidade_id, reversal_of, metadata)
  VALUES (v_e.contabilista_id, 'reversal', 'reversal:' || p_evento::text, -v_e.xp_delta,
          v_e.shadow, v_e.entidade_tipo, v_e.entidade_id, p_evento,
          jsonb_build_object('reason', left(coalesce(p_motivo, 'reversal'), 60)));

  PERFORM public.recalcular_progressao(v_e.contabilista_id);
  RETURN jsonb_build_object('ok', true, 'repetido', false);
END; $$;

REVOKE EXECUTE ON FUNCTION public.reverter_evento_progressao(uuid, text) FROM anon, authenticated, PUBLIC;

-- ---------------------------------------------------------------------
-- 12b. Privilégios explícitos.
--
--   Nenhuma destas tabelas é legível por `anon` — nem sequer o catálogo
--   de comissões (§138: a grelha 10→5 é assunto entre a plataforma e o
--   profissional). E `authenticated` só LÊ: escrever é das RPCs.
-- ---------------------------------------------------------------------
REVOKE ALL ON public.progressao_flags            FROM anon, authenticated;
REVOKE ALL ON public.comissao_patamares          FROM anon, authenticated;
REVOKE ALL ON public.contabilista_progressao     FROM anon, authenticated;
REVOKE ALL ON public.progressao_eventos          FROM anon, authenticated;
REVOKE ALL ON public.creditos_fidelidade_ledger  FROM anon, authenticated;
REVOKE ALL ON public.progressao_compras          FROM anon, authenticated;

GRANT SELECT ON public.progressao_flags           TO authenticated;
GRANT SELECT ON public.comissao_patamares         TO authenticated;
GRANT SELECT ON public.contabilista_progressao    TO authenticated;
GRANT SELECT ON public.progressao_eventos         TO authenticated;
GRANT SELECT ON public.creditos_fidelidade_ledger TO authenticated;
GRANT SELECT ON public.progressao_compras         TO authenticated;

-- ---------------------------------------------------------------------
-- 13. Semear a linha de progressão dos contabilistas já aprovados
--     (§106: começa em 0. Sem XP fictício.)
-- ---------------------------------------------------------------------
INSERT INTO public.contabilista_progressao (contabilista_id)
SELECT user_id FROM public.contabilistas WHERE estado = 'aprovado'
ON CONFLICT (contabilista_id) DO NOTHING;

COMMIT;

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260816090000_contrato_da_proposta.sql                           ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- =====================================================================
--  O CONTRATO DA PROPOSTA — LER O DOCUMENTO, E NÃO SÓ O RESUMO
--  ---------------------------------------------------------------------
--  A 051 já impede decidir uma proposta sem duas marcas: chegou ao fim do
--  TEXTO (`lida_ate_ao_fim_em`) e confirmou que leu (`confirmacao_em`).
--  Faltava a parte que interessa quando há contrato: o texto da proposta
--  é um resumo, e o que se aceita é o documento anexo.
--
--  Sem esta migração, alguém podia rolar seis linhas de resumo, marcar a
--  caixa e aceitar um contrato de doze páginas que nunca abriu. A caixa
--  dizia «li e compreendi» e era falsa por construção.
--
--  O que se acrescenta:
--
--   · `contrato_lido_em` — instante em que o cliente chegou ao fim do
--     documento anexo marcado como contrato;
--   · `marcar_contrato_lido()` — a única forma de o escrever;
--   · a mesma condição dentro de `confirmar_leitura_da_proposta` e de
--     `decidir_proposta`, para a garantia não viver na interface.
--
--  O QUE ISTO PROVA, E O QUE NÃO PROVA
--  -----------------------------------
--  Nenhum sistema sabe se uma pessoa leu. O que estas colunas registam é
--  que o fluxo de leitura foi percorrido até ao fim — a última página do
--  documento esteve no ecrã, ou foi alcançada por teclado. É o mesmo grau
--  de prova que `lida_ate_ao_fim_em` já tinha, e é honesto chamar-lhe o
--  que é: uma marca de percurso, não uma declaração de compreensão. O que
--  o produto NÃO pode fazer é dizer que a pessoa leu quando nem sequer
--  abriu — e é isso que aqui deixa de ser possível.
--
--  Propostas SEM contrato anexo continuam exatamente como estavam: a
--  condição só se aplica quando existe um anexo com `e_contrato = true`.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
--  1. A coluna
-- ---------------------------------------------------------------------
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS contrato_lido_em timestamptz;

COMMENT ON COLUMN public.propostas.contrato_lido_em IS
  'Quando o cliente chegou ao fim do documento anexo marcado como contrato. Nulo enquanto não chegar. Só `marcar_contrato_lido()` o escreve; ninguém o escreve por UPDATE direto, porque a política de escrita do cliente não inclui esta tabela.';

-- ---------------------------------------------------------------------
--  2. Esta proposta traz contrato?
-- ---------------------------------------------------------------------
--  Uma função e não um `EXISTS` repetido em três sítios: repetido, era o
--  tipo de condição que se corrige em dois e se esquece no terceiro.
CREATE OR REPLACE FUNCTION public.proposta_tem_contrato(p_proposta uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proposta_anexos a
     WHERE a.proposta_id = p_proposta AND a.e_contrato IS TRUE
  );
$$;

COMMENT ON FUNCTION public.proposta_tem_contrato(uuid) IS
  'True quando a proposta tem anexo marcado como contrato. É o que decide se a leitura do documento é exigida — uma proposta sem contrato não passa a ter um requisito que não pode cumprir.';

-- ---------------------------------------------------------------------
--  3. Marcar o contrato como lido até ao fim
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marcar_contrato_lido(p_proposta uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  IF NOT public.proposta_tem_contrato(p_proposta) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_contrato');
  END IF;

  -- `coalesce` mantém o PRIMEIRO instante: reabrir o documento não
  -- reescreve a hora em que a pessoa lá chegou pela primeira vez.
  UPDATE public.propostas p
     SET contrato_lido_em = coalesce(p.contrato_lido_em, now())
   WHERE p.id = p_proposta
     AND public.dono_do_caso(p.caso_id, auth.uid())
     AND p.estado IN ('enviada', 'lida')
  RETURNING p.id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_decidivel');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.marcar_contrato_lido(uuid) IS
  'Regista que o cliente chegou ao fim do contrato anexo. Chamada pelo leitor de documentos quando a última página é alcançada — a rolar ou por teclado.';

-- ---------------------------------------------------------------------
--  4. Confirmar leitura passa a exigir o contrato
-- ---------------------------------------------------------------------
--  A caixa «li e compreendi» é uma declaração. Deixá-la marcar antes de o
--  documento ter sido aberto é pedir a alguém que declare o que não pode
--  saber.
CREATE OR REPLACE FUNCTION public.confirmar_leitura_da_proposta(p_proposta uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  UPDATE public.propostas p
     SET confirmacao_em = coalesce(p.confirmacao_em, now())
   WHERE p.id = p_proposta
     AND public.dono_do_caso(p.caso_id, auth.uid())
     AND p.lida_ate_ao_fim_em IS NOT NULL
     AND (NOT public.proposta_tem_contrato(p.id) OR p.contrato_lido_em IS NOT NULL)
     AND p.estado IN ('enviada', 'lida')
  RETURNING p.id INTO v_id;

  IF v_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.propostas p
                WHERE p.id = p_proposta
                  AND public.dono_do_caso(p.caso_id, auth.uid())
                  AND p.contrato_lido_em IS NULL
                  AND public.proposta_tem_contrato(p.id)) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'contrato_por_ler');
    END IF;
    RETURN jsonb_build_object('ok', false, 'motivo', 'ainda_nao_leste_ate_ao_fim');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------
--  5. Decidir passa a exigir o contrato
-- ---------------------------------------------------------------------
--  A função é a da 051 com UMA condição a mais e UM motivo a mais. O
--  resto do corpo é igual — incluindo o vínculo que nasce ao aceitar, que
--  continua a ser consequência da decisão e não porta de entrada.
CREATE OR REPLACE FUNCTION public.decidir_proposta(
  p_proposta uuid,
  p_decisao  text,
  p_motivo   text DEFAULT NULL,
  p_valor_pedido integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  u uuid := auth.uid();
  v_id uuid; v_caso uuid; v_cc uuid; v_novo text; v_vinculo uuid;
BEGIN
  IF p_decisao NOT IN ('aceitar', 'recusar', 'pedir_desconto') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'decisao_invalida');
  END IF;
  IF p_decisao = 'pedir_desconto'
     AND (p_valor_pedido IS NULL OR p_valor_pedido < 0) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'falta_o_valor');
  END IF;

  v_novo := CASE p_decisao WHEN 'aceitar' THEN 'aceite'
                           WHEN 'recusar' THEN 'recusada'
                           ELSE 'desconto_pedido' END;

  UPDATE public.propostas p
     SET estado = v_novo,
         decidida_em = now(),
         motivo = nullif(btrim(coalesce(p_motivo, '')), '')
   WHERE p.id = p_proposta
     AND public.dono_do_caso(p.caso_id, u)
     AND p.estado IN ('enviada', 'lida')
     -- ⚠️ A regra, aqui. Sem estas linhas, a interface era a única coisa
     -- entre alguém e aceitar um contrato que não leu.
     AND p.lida_ate_ao_fim_em IS NOT NULL
     AND p.confirmacao_em IS NOT NULL
     -- ⚠️ E quando há documento, o documento também conta: o texto da
     -- proposta é o resumo; o contrato é o que fica a valer.
     AND (NOT public.proposta_tem_contrato(p.id) OR p.contrato_lido_em IS NOT NULL)
     AND (p.validade_ate IS NULL OR p.validade_ate >= current_date)
  RETURNING p.id, p.caso_id, p.contabilista_id INTO v_id, v_caso, v_cc;

  IF v_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = p_proposta
                AND public.dono_do_caso(p.caso_id, u)
                AND p.contrato_lido_em IS NULL
                AND public.proposta_tem_contrato(p.id)) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'contrato_por_ler');
    END IF;
    IF EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = p_proposta
                AND public.dono_do_caso(p.caso_id, u)
                AND (p.lida_ate_ao_fim_em IS NULL OR p.confirmacao_em IS NULL)) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'ainda_nao_leste_e_confirmaste');
    END IF;
    IF EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = p_proposta
                AND public.dono_do_caso(p.caso_id, u)
                AND p.validade_ate < current_date) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'proposta_expirada');
    END IF;
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_decidivel');
  END IF;

  IF p_decisao = 'aceitar' THEN
    UPDATE public.propostas SET estado = 'substituida'
     WHERE caso_id = v_caso AND id <> v_id AND estado IN ('enviada', 'lida');

    UPDATE public.casos SET estado = 'aceite' WHERE id = v_caso;

    INSERT INTO public.contabilista_vinculos
      (contabilista_id, cliente_id, origem, estado)
    VALUES (v_cc, u, 'cliente', 'ativo')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_vinculo;

    PERFORM public.avisar_utilizador(v_cc, 'vinculo_aceite',
      'A tua proposta foi aceite',
      'Já podes marcar consultas e falar diretamente.', '/contabilista/clientes');
  ELSIF p_decisao = 'pedir_desconto' THEN
    PERFORM public.avisar_utilizador(v_cc, 'mensagem',
      'Foi pedido um desconto',
      'Vê o pedido e envia uma proposta nova, se quiseres.', '/contabilista/casos');
  ELSE
    PERFORM public.avisar_utilizador(v_cc, 'mensagem',
      'Uma proposta tua foi recusada', NULL, '/contabilista/casos');
  END IF;

  RETURN jsonb_build_object('ok', true, 'estado', v_novo);
END;
$$;

COMMENT ON FUNCTION public.decidir_proposta(uuid, text, text, integer) IS
  'Recusa enquanto `lida_ate_ao_fim_em`, `confirmacao_em` — ou, havendo contrato anexo, `contrato_lido_em` — forem nulos. O botão desativado na interface é conveniência; a garantia é esta.';

-- ---------------------------------------------------------------------
--  6. Permissões: as mesmas das irmãs
-- ---------------------------------------------------------------------
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.marcar_contrato_lido(uuid)',
    'public.proposta_tem_contrato(uuid)',
    'public.confirmar_leitura_da_proposta(uuid)',
    'public.decidir_proposta(uuid, text, text, integer)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;

COMMIT;

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260816120000_correcoes_painel_contabilista.sql                  ║
-- ╚═════════════════════════════════════════════════════════════════════╝

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

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260816140000_pagamentos_stripe_connect.sql                      ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════
--  PAGAMENTOS — Stripe Connect, com cobranças DIRETAS
--  ---------------------------------------------------------------------
--  O QUE MUDA NO MODELO, e porque é que a diferença importa.
--
--  Até aqui, `progressao/fronteiras.ts` dizia: «A taxa é faturada a ti pelo
--  Recibo Certo. O cliente paga-te diretamente — a plataforma não retém nem
--  processa esse pagamento.» O raciocínio por trás está escrito lá e
--  continua a valer: *retirar uma percentagem do dinheiro de um cliente
--  antes de o entregar a outro é outra atividade.*
--
--  A decisão de produto passou a ser que o cliente paga o contabilista
--  ATRAVÉS do Recibo Certo. A forma escolhida é a que preserva o essencial
--  daquele raciocínio: **direct charges**.
--
--    · a cobrança nasce NA CONTA DO CONTABILISTA (cabeçalho `Stripe-Account`);
--    · o contabilista é o comerciante de registo — é o nome dele no extrato
--      do cliente, e é dele o recibo;
--    · o dinheiro NUNCA entra no saldo do Recibo Certo. Vai direto para o
--      saldo dele;
--    · a comissão sai como `application_fee_amount`, que a Stripe encaminha
--      para a plataforma. Não é a plataforma a reter e depois entregar.
--
--  A alternativa (destination charges) punha o dinheiro no saldo da
--  plataforma primeiro. Era isso, e só isso, que a fronteira antiga proibia.
--
--  ── O QUE ESTA MIGRAÇÃO NÃO FAZ, de propósito
--
--  A compra de patamares pelo contabilista JÁ ESTÁ CONSTRUÍDA na migração
--  `20260815233000`: `progressao_compras`, `criar_intencao_desbloqueio`,
--  `aplicar_compra_patamar`, o ledger de créditos com held/released/spent,
--  e o caso §70 — o XP alcançar o patamar a meio do checkout, que marca
--  `needs_refund` e nunca transfere o pagamento para o patamar seguinte.
--
--  Aqui só se acrescenta o que faltava para a ligar à Stripe (guardar o id
--  da sessão) e se abre a bandeira. Reescrever aquilo seria criar um
--  segundo sistema de compras a competir com o primeiro.
--
--  ── AS INVARIANTES DE DINHEIRO, todas do lado do servidor
--
--   1. O VALOR NUNCA VEM DO CLIENTE. O browser manda um id de agendamento;
--      o preço sai daqui. Um preço que viaja pelo browser é um preço que se
--      edita no browser.
--   2. A COMISSÃO É LIDA NO INSTANTE DA COBRANÇA, do patamar efetivo, e
--      guardada com o pagamento. Subir de patamar depois não muda o que já
--      foi cobrado.
--   3. O BENEFÍCIO DE FIDELIDADE é reservado na preparação e só GASTO
--      quando o pagamento liquida. Um checkout abandonado não queima um cupão.
--   4. IDEMPOTÊNCIA por `stripe_checkout_session_id` e
--      `stripe_payment_intent_id`, ambos UNIQUE — o webhook repete-se por
--      desenho.
-- ═══════════════════════════════════════════════════════════════════════

-- ---------------------------------------------------------------------
-- 1. A conta Connect do contabilista
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contabilista_stripe (
  contabilista_id    uuid PRIMARY KEY REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  stripe_account_id  text NOT NULL UNIQUE,
  -- Os três sinais que decidem se se pode cobrar. Vêm do webhook
  -- `account.updated`, nunca de uma leitura do browser.
  charges_enabled    boolean NOT NULL DEFAULT false,
  payouts_enabled    boolean NOT NULL DEFAULT false,
  details_submitted  boolean NOT NULL DEFAULT false,
  -- O que a Stripe ainda pede, mostrado ao contabilista tal e qual.
  requisitos         jsonb   NOT NULL DEFAULT '[]'::jsonb,
  pais               text    NOT NULL DEFAULT 'PT',
  moeda              text    NOT NULL DEFAULT 'eur',
  criado_em          timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contabilista_stripe ENABLE ROW LEVEL SECURITY;

-- Só o próprio lê o seu estado. NENHUMA política de escrita: a conta é
-- criada e atualizada pelo servidor com a chave de serviço. É a lição da
-- migração 024 — validar quem pede não chega, é preciso validar o que é
-- escrito.
DROP POLICY IF EXISTS "stripe_proprio_le" ON public.contabilista_stripe;
CREATE POLICY "stripe_proprio_le" ON public.contabilista_stripe
  FOR SELECT TO authenticated
  USING (contabilista_id = auth.uid());

COMMENT ON TABLE public.contabilista_stripe IS
  'Conta Stripe Connect de cada contabilista. Cobranças diretas: ele é o '
  'comerciante e o dinheiro nunca passa pelo saldo da plataforma. Escrita '
  'exclusiva do servidor.';

-- ---------------------------------------------------------------------
-- 2. Política de pagamento por tipo de consulta
-- ---------------------------------------------------------------------
--
--  `no_pedido`      — paga-se ao marcar. É o que faz sentido para quem não
--                     quer perseguir pagamentos.
--  `depois`         — marca-se sem pagar; ao concluir com o preço real, o
--                     contabilista emite o pedido e o cliente paga da área
--                     dele. É a omissão, porque é o que já acontecia.
--  `sem_pagamento`  — não se cobra por aqui. Uma primeira conversa
--                     gratuita, ou um acerto feito fora da plataforma.

ALTER TABLE public.contabilista_tipos_consulta
  ADD COLUMN IF NOT EXISTS pagamento text NOT NULL DEFAULT 'depois';

DO $$ BEGIN
  ALTER TABLE public.contabilista_tipos_consulta
    ADD CONSTRAINT tipos_consulta_pagamento_valido
    CHECK (pagamento IN ('no_pedido', 'depois', 'sem_pagamento'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.contabilista_tipos_consulta.pagamento IS
  'Quando se paga: no_pedido (pré-pago), depois (ao concluir) ou '
  'sem_pagamento (não se cobra pela plataforma).';

-- ---------------------------------------------------------------------
-- 3. Os pagamentos de consultas (cliente → contabilista)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pagamentos (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id             uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  cliente_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agendamento_id              uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  tipo_consulta_id            uuid REFERENCES public.contabilista_tipos_consulta(id) ON DELETE SET NULL,

  momento                     text NOT NULL DEFAULT 'no_pedido',
  estado                      text NOT NULL DEFAULT 'pendente',

  -- Dinheiro sempre em cêntimos. Nunca float.
  bruto_cents                 integer NOT NULL CHECK (bruto_cents >= 0),
  desconto_cents              integer NOT NULL DEFAULT 0 CHECK (desconto_cents >= 0),
  liquido_cents               integer NOT NULL CHECK (liquido_cents >= 0),
  comissao_cents              integer NOT NULL DEFAULT 0 CHECK (comissao_cents >= 0),
  -- O patamar no INSTANTE da cobrança. Guarda-se em vez de se recalcular:
  -- subir de patamar amanhã não muda o que foi cobrado ontem.
  comissao_bps                integer NOT NULL DEFAULT 0,
  moeda                       text NOT NULL DEFAULT 'eur',

  cupao_id                    uuid REFERENCES public.fidelidade_cupoes(id) ON DELETE SET NULL,

  stripe_account_id           text NOT NULL,
  stripe_checkout_session_id  text UNIQUE,
  stripe_payment_intent_id    text UNIQUE,
  erro                        text,

  descricao                   text,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  pago_em                     timestamptz,
  expira_em                   timestamptz NOT NULL DEFAULT now() + interval '7 days',

  CONSTRAINT pagamentos_estado_valido
    CHECK (estado IN ('pendente', 'pago', 'falhado', 'reembolsado', 'cancelado', 'expirado')),
  CONSTRAINT pagamentos_momento_valido
    CHECK (momento IN ('no_pedido', 'depois')),
  CONSTRAINT pagamentos_liquido_coerente
    CHECK (liquido_cents = bruto_cents - desconto_cents)
);

CREATE INDEX IF NOT EXISTS pagamentos_contabilista_idx
  ON public.pagamentos (contabilista_id, estado, criado_em DESC);
CREATE INDEX IF NOT EXISTS pagamentos_cliente_idx
  ON public.pagamentos (cliente_id, estado, criado_em DESC);

-- Um agendamento não pode ter dois pagamentos vivos ao mesmo tempo. Sem
-- isto, dois separadores abertos geravam duas sessões e a consulta podia
-- ser paga duas vezes.
CREATE UNIQUE INDEX IF NOT EXISTS pagamentos_um_vivo_por_agendamento
  ON public.pagamentos (agendamento_id)
  WHERE agendamento_id IS NOT NULL AND estado IN ('pendente', 'pago');

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- As duas partes leem. Ninguém escreve pelo cliente — nem o valor, nem o
-- estado, nem a comissão. Tudo passa por RPC de servidor ou pelo webhook.
DROP POLICY IF EXISTS "pagamentos_partes_leem" ON public.pagamentos;
CREATE POLICY "pagamentos_partes_leem" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (cliente_id = auth.uid() OR contabilista_id = auth.uid());

COMMENT ON TABLE public.pagamentos IS
  'Cobranças de consultas. Direct charges: nascem na conta Stripe do '
  'contabilista e o dinheiro nunca entra no saldo da plataforma. A comissão '
  'sai como application_fee. Escrita só por RPC de servidor e webhook.';

-- ---------------------------------------------------------------------
-- 4. A comissão em vigor de um contabilista
-- ---------------------------------------------------------------------
--
-- Reutiliza `patamar_efetivo` e `catalogo_versao_corrente` da migração
-- `20260815233000` — o catálogo é versionado, e ler `ordem` sem filtrar
-- pela versão devolveria o patamar de uma recalibração antiga.

CREATE OR REPLACE FUNCTION public.comissao_bps_do_contabilista(p_contabilista uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_p       record;
  v_efetivo smallint;
  v_bps     integer;
BEGIN
  SELECT * INTO v_p FROM public.contabilista_progressao
   WHERE contabilista_id = p_contabilista;

  v_efetivo := public.patamar_efetivo(
    COALESCE(v_p.highest_earned_tier, 1::smallint),
    COALESCE(v_p.highest_purchased_tier, 1::smallint));

  SELECT comissao_bps INTO v_bps FROM public.comissao_patamares
   WHERE versao_catalogo = public.catalogo_versao_corrente()
     AND ordem = v_efetivo AND ativo;

  -- Sem linha, o patamar Base. É a comissão mais ALTA — falhar para o lado
  -- que não prejudica a plataforma seria falhar a favor de quem não pagou.
  RETURN COALESCE(v_bps, 1000);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.comissao_bps_do_contabilista(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.comissao_bps_do_contabilista(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5. Preparar um pagamento de consulta
-- ---------------------------------------------------------------------
--
-- Chamada pelo SERVIDOR depois de validar a sessão. Devolve tudo o que a
-- rota precisa para criar o Checkout — incluindo o valor, que nasce aqui.

CREATE OR REPLACE FUNCTION public.preparar_pagamento_consulta(
  p_cliente     uuid,
  p_agendamento uuid,
  p_cupao       uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_ag       record;
  v_tipo     record;
  v_conta    record;
  v_bruto    integer;
  v_desconto integer := 0;
  v_liquido  integer;
  v_bps      integer;
  v_comissao integer;
  v_cupao    record;
  v_id       uuid;
  v_momento  text;
  v_cupao_a_reservar uuid := NULL;
BEGIN
  SELECT * INTO v_ag FROM public.agendamentos WHERE id = p_agendamento;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'agendamento_inexistente');
  END IF;
  IF v_ag.cliente_id <> p_cliente THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_e_teu');
  END IF;
  IF v_ag.estado IN ('cancelado_cliente', 'cancelado_contabilista') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'consulta_cancelada');
  END IF;

  -- Já pago: não se cobra duas vezes.
  IF EXISTS (SELECT 1 FROM public.pagamentos
              WHERE agendamento_id = p_agendamento AND estado = 'pago') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ja_pago');
  END IF;

  -- A conta Connect tem de existir e conseguir cobrar. Sem isto o Checkout
  -- falhava na Stripe com uma mensagem que ninguém entende.
  SELECT * INTO v_conta FROM public.contabilista_stripe
   WHERE contabilista_id = v_ag.contabilista_id;
  IF NOT FOUND OR NOT v_conta.charges_enabled THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'contabilista_sem_pagamentos');
  END IF;

  SELECT * INTO v_tipo FROM public.contabilista_tipos_consulta
   WHERE id = v_ag.tipo_consulta_id;

  IF v_tipo.id IS NOT NULL AND v_tipo.pagamento = 'sem_pagamento' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'tipo_nao_cobra');
  END IF;

  -- ── O preço. Dois caminhos, e a ordem importa.
  --
  -- Se a consulta JÁ FOI CONCLUÍDA, `concluir_consulta` (Fidelidade V2) já
  -- fixou `preco_cents`, já aplicou o benefício e já GASTOU o cupão. O que
  -- há a cobrar é `valor_final_cents`, e aplicar outro desconto aqui era
  -- descontar duas vezes sobre o mesmo cartão.
  IF v_ag.valor_final_cents IS NOT NULL THEN
    v_momento  := 'depois';
    v_bruto    := v_ag.preco_cents;
    v_desconto := COALESCE(v_ag.desconto_aplicado_cents, 0);
    v_liquido  := v_ag.valor_final_cents;

  -- Caso contrário é um pré-pagamento: o preço vem do catálogo e o
  -- benefício, se a pessoa o aplicar, é reservado agora e gasto na
  -- liquidação.
  ELSE
    v_momento := COALESCE(v_tipo.pagamento, 'depois');
    v_bruto   := COALESCE(v_tipo.preco_cents, 0);

    IF p_cupao IS NOT NULL THEN
      SELECT * INTO v_cupao FROM public.fidelidade_cupoes
       WHERE id = p_cupao
         AND cliente_id = p_cliente
         AND contabilista_id = v_ag.contabilista_id
         AND estado = 'disponivel';
      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'cupao_invalido');
      END IF;
      IF v_cupao.expira_em < now() THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'cupao_expirado');
      END IF;
      v_desconto := ROUND(v_bruto * v_cupao.percentagem / 100.0);
      v_cupao_a_reservar := p_cupao;
    END IF;

    v_liquido := GREATEST(v_bruto - v_desconto, 0);
  END IF;

  IF v_bruto <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_valor_a_cobrar');
  END IF;
  IF v_liquido <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nada_a_cobrar');
  END IF;

  -- ── A comissão. Lida agora, guardada com o pagamento.
  v_bps := public.comissao_bps_do_contabilista(v_ag.contabilista_id);
  v_comissao := ROUND(v_liquido * v_bps / 10000.0);

  -- Reaproveita o lugar de um pendente sem sessão em vez de chocar com o
  -- índice único: quem carregou duas vezes não merece um erro.
  DELETE FROM public.pagamentos
   WHERE agendamento_id = p_agendamento
     AND estado = 'pendente'
     AND stripe_checkout_session_id IS NULL;

  INSERT INTO public.pagamentos (
    contabilista_id, cliente_id, agendamento_id, tipo_consulta_id,
    momento, bruto_cents, desconto_cents, liquido_cents,
    comissao_cents, comissao_bps, cupao_id, stripe_account_id, descricao
  ) VALUES (
    v_ag.contabilista_id, p_cliente, p_agendamento, v_ag.tipo_consulta_id,
    v_momento, v_bruto, v_desconto, v_liquido,
    v_comissao, v_bps, v_cupao_a_reservar, v_conta.stripe_account_id,
    COALESCE(v_tipo.nome, 'Consulta')
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true,
    'pagamentoId', v_id,
    'stripeAccountId', v_conta.stripe_account_id,
    'brutoCents', v_bruto,
    'descontoCents', v_desconto,
    'liquidoCents', v_liquido,
    'comissaoCents', v_comissao,
    'comissaoBps', v_bps,
    'descricao', COALESCE(v_tipo.nome, 'Consulta')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.preparar_pagamento_consulta(uuid, uuid, uuid)
  FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.preparar_pagamento_consulta(uuid, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.preparar_pagamento_consulta(uuid, uuid, uuid) IS
  'Calcula valor e comissão de uma consulta e abre um pagamento pendente. '
  'Só o servidor a chama: é aqui que o preço nasce, e um preço que passasse '
  'pelo browser era um preço editável no browser.';

-- ---------------------------------------------------------------------
-- 6. Registar a sessão de Checkout
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.marcar_checkout_pagamento(
  p_pagamento uuid,
  p_sessao    text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  UPDATE public.pagamentos
     SET stripe_checkout_session_id = p_sessao
   WHERE id = p_pagamento AND estado = 'pendente';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pagamento_nao_pendente');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marcar_checkout_pagamento(uuid, text)
  FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.marcar_checkout_pagamento(uuid, text) TO service_role;

-- O equivalente para a compra de patamar, que vive em `progressao_compras`.
CREATE OR REPLACE FUNCTION public.marcar_checkout_desbloqueio(
  p_compra uuid,
  p_sessao text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  UPDATE public.progressao_compras
     SET estado = 'checkout_created', stripe_checkout_session_id = p_sessao
   WHERE id = p_compra AND estado = 'draft';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'compra_nao_esta_em_rascunho');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marcar_checkout_desbloqueio(uuid, text)
  FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.marcar_checkout_desbloqueio(uuid, text) TO service_role;

-- Encontrar a compra pela sessão — é tudo o que o webhook tem em mão.
CREATE OR REPLACE FUNCTION public.compra_por_sessao(p_sessao text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT id FROM public.progressao_compras WHERE stripe_checkout_session_id = p_sessao;
$$;

REVOKE EXECUTE ON FUNCTION public.compra_por_sessao(text) FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.compra_por_sessao(text) TO service_role;

-- ---------------------------------------------------------------------
-- 7. Liquidar um pagamento de consulta (webhook)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.liquidar_pagamento(
  p_sessao         text,
  p_payment_intent text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_pag record;
BEGIN
  SELECT * INTO v_pag FROM public.pagamentos
   WHERE stripe_checkout_session_id = p_sessao
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pagamento_desconhecido');
  END IF;

  -- Idempotência: o webhook repete-se por desenho.
  IF v_pag.estado = 'pago' THEN
    RETURN jsonb_build_object('ok', true, 'repetido', true);
  END IF;

  UPDATE public.pagamentos
     SET estado = 'pago',
         pago_em = now(),
         stripe_payment_intent_id = COALESCE(p_payment_intent, stripe_payment_intent_id)
   WHERE id = v_pag.id;

  -- O benefício só se gasta AGORA — e só no pré-pagamento. Numa consulta
  -- já concluída, `concluir_consulta` gastou-o na altura, e `cupao_id`
  -- ficou nulo de propósito.
  IF v_pag.cupao_id IS NOT NULL THEN
    UPDATE public.fidelidade_cupoes
       SET estado = 'usado', usado_em = now(),
           usado_agendamento_id = COALESCE(usado_agendamento_id, v_pag.agendamento_id),
           valor_base_cents = COALESCE(valor_base_cents, v_pag.bruto_cents)
     WHERE id = v_pag.cupao_id AND estado = 'disponivel';
  END IF;

  -- Uma consulta pré-paga fica confirmada: o cliente pagou, e deixá-la
  -- «por confirmar» obrigava a uma segunda ação para nada.
  IF v_pag.agendamento_id IS NOT NULL AND v_pag.momento = 'no_pedido' THEN
    UPDATE public.agendamentos
       SET estado = 'confirmado'
     WHERE id = v_pag.agendamento_id AND estado = 'pedido';
  END IF;

  PERFORM public.avisar_utilizador(
    v_pag.contabilista_id, 'pagamento_recebido', 'Pagamento recebido',
    'Um cliente pagou uma consulta.', '/contabilista/clientes');

  RETURN jsonb_build_object('ok', true, 'pagamentoId', v_pag.id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.liquidar_pagamento(text, text)
  FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.liquidar_pagamento(text, text) TO service_role;

-- Marcar como falhado/expirado sem perder o registo.
CREATE OR REPLACE FUNCTION public.encerrar_pagamento(
  p_sessao text,
  p_estado text,
  p_erro   text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF p_estado NOT IN ('falhado', 'expirado', 'cancelado') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'estado_invalido');
  END IF;
  UPDATE public.pagamentos
     SET estado = p_estado, erro = LEFT(COALESCE(p_erro, ''), 500)
   WHERE stripe_checkout_session_id = p_sessao AND estado = 'pendente';
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.encerrar_pagamento(text, text, text)
  FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.encerrar_pagamento(text, text, text) TO service_role;

-- ---------------------------------------------------------------------
-- 8. O que o cliente e o contabilista precisam de saber
-- ---------------------------------------------------------------------
--
-- Consultas concluídas com preço fixado e ainda por pagar. É isto que
-- alimenta o «tens uma consulta por pagar» na área do cliente e o «à espera
-- de pagamento» no painel.

CREATE OR REPLACE FUNCTION public.consultas_por_pagar(p_cliente uuid DEFAULT NULL)
RETURNS TABLE (
  agendamento_id   uuid,
  contabilista_id  uuid,
  cliente_id       uuid,
  inicio           timestamptz,
  valor_cents      integer,
  descricao        text,
  pagamento_id     uuid,
  pagamento_estado text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT
    a.id, a.contabilista_id, a.cliente_id, a.inicio,
    a.valor_final_cents,
    COALESCE(t.nome, 'Consulta'),
    p.id, p.estado
    FROM public.agendamentos a
    LEFT JOIN public.contabilista_tipos_consulta t ON t.id = a.tipo_consulta_id
    LEFT JOIN public.pagamentos p
           ON p.agendamento_id = a.id AND p.estado IN ('pendente', 'pago')
   WHERE a.estado = 'realizada'
     AND a.valor_final_cents IS NOT NULL
     AND a.valor_final_cents > 0
     AND (p.id IS NULL OR p.estado = 'pendente')
     AND COALESCE(t.pagamento, 'depois') <> 'sem_pagamento'
     AND (
       (p_cliente IS NOT NULL AND a.cliente_id = p_cliente AND a.cliente_id = auth.uid())
       OR (p_cliente IS NULL AND a.contabilista_id = auth.uid())
     )
   ORDER BY a.inicio DESC
   LIMIT 100;
$$;

REVOKE EXECUTE ON FUNCTION public.consultas_por_pagar(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.consultas_por_pagar(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 9. Abrir o desbloqueio pago
-- ---------------------------------------------------------------------
--
-- A máquina já existe (migração `20260815233000`). O que faltava era a
-- bandeira: `criar_intencao_desbloqueio` recusa com `compra_indisponivel`
-- enquanto estiver desligada, e era isso que `COPY_DESBLOQUEIO_INDISPONIVEL`
-- explicava ao contabilista.

UPDATE public.progressao_flags
   SET ativa = true
 WHERE chave = 'accountant_tier_purchase';

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260816150000_fronteira_de_contacto.sql                          ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- 20260816150000_fronteira_de_contacto.sql
-- ═══════════════════════════════════════════════════════════════════════
--  A FRONTEIRA DE CONTACTO
--  ---------------------------------------------------------------------
--  A migração 043 deu ao cliente a hipótese de dar um email ao contabilista
--  «só se quiseres que ele te possa escrever». Era uma boa intenção com uma
--  consequência que só se vê passado um ano: o canal de acompanhamento
--  passa a ter uma porta lateral, e quem sai por ela leva a relação inteira
--  — sem histórico, sem partilhas revogáveis, sem prova de nada.
--
--  Isto não é uma questão de retenção artificial. É que TUDO o que a
--  plataforma promete ao cliente — a partilha que se revoga, o ficheiro que
--  deixa de abrir quando o acompanhamento termina, o registo do que foi
--  pedido e quando — vale exatamente zero no instante em que a conversa
--  migra para o WhatsApp. A promessa de privacidade e a promessa de canal
--  são a mesma promessa.
--
--  Três decisões, por ordem de dureza:
--
--   1. `email_cliente` DESAPARECE. Não é revogado por policy, não é
--      escondido pela interface, não fica «lá mas sem grant»: a coluna é
--      removida da tabela. Uma coluna que existe é uma coluna que uma RPC
--      futura devolve por distração — e a promessa passa a depender de
--      ninguém se distrair. Ver §4.3 do relatório: por arquitetura, não
--      por promessa.
--
--   2. A RPC de resumo deixa de a declarar. Como a assinatura muda, é
--      DROP e não CREATE OR REPLACE — o PostgreSQL recusa-se, e bem, a
--      trocar o tipo de retorno de uma função existente.
--
--   3. O texto passa a ser examinado. Um email escrito à mão numa mensagem
--      é o mesmo buraco por outro caminho, e a interface não pode ser a
--      fronteira: quem quiser contorná-la fala com o PostgREST. A regra
--      vive aqui, e a interface repete-a antes de submeter só para dar
--      resposta imediata.
--
--  O QUE ISTO NÃO PROMETE
--  ----------------------
--  Um PDF ou uma imagem podem conter um email ou um número, e nada aqui os
--  lê. Enquanto não houver leitura de anexos, a plataforma não pode
--  afirmar — e a interface não afirma — que o contacto é impossível de
--  passar. Diz o que faz: protege o canal escrito.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. A coluna sai da tabela ───────────────────────────────────────
--
-- O gatilho da 046 e o grant por coluna da 047 nomeiam `email_cliente`.
-- Ambos têm de deixar de o nomear ANTES de a coluna cair: um `DROP COLUMN`
-- leva o grant com ele, mas a função em PL/pgSQL só falha quando corre, e
-- falharia na primeira pessoa a terminar um acompanhamento.

CREATE OR REPLACE FUNCTION public.vinculos_tranca_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Terminar leva o nome com ele. A autorização para o ter acabou nesse
  -- instante, e guardá-lo «só por histórico» seria ficar com um dado
  -- pessoal para além do consentimento que o trouxe.
  IF NEW.estado = 'terminado' AND OLD.estado <> 'terminado' THEN
    NEW.nome_cliente := NULL;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.contabilista_id IS DISTINCT FROM OLD.contabilista_id
       OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
       OR NEW.origem IS DISTINCT FROM OLD.origem
       OR NEW.criado_em IS DISTINCT FROM OLD.criado_em THEN
      RAISE EXCEPTION 'As partes de um vínculo não se alteram.';
    END IF;

    IF OLD.estado = 'terminado' AND NEW.estado <> 'terminado' THEN
      RAISE EXCEPTION 'Um acompanhamento terminado não se reabre; pede-se de novo.';
    END IF;

    IF auth.uid() = NEW.cliente_id AND auth.uid() <> NEW.contabilista_id THEN
      IF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado <> 'terminado' THEN
        RAISE EXCEPTION 'O cliente só pode terminar o acompanhamento.';
      END IF;
      IF NEW.mensagem IS DISTINCT FROM OLD.mensagem THEN
        RAISE EXCEPTION 'O recado do pedido não se altera.';
      END IF;
    END IF;

    IF auth.uid() = NEW.contabilista_id THEN
      IF NEW.nome_cliente IS DISTINCT FROM OLD.nome_cliente THEN
        IF NOT (NEW.estado = 'terminado' AND NEW.nome_cliente IS NULL) THEN
          RAISE EXCEPTION 'O nome é dado pelo cliente.';
        END IF;
      END IF;
    END IF;
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.vinculos_tranca_cliente() FROM anon, authenticated, public;

-- O gatilho de texto seguro da 20260814 nomeia a coluna nos argumentos.
--
-- Nomear uma coluna que já não existe não rebentava nada — `to_jsonb(NEW)
-- ->> 'email_cliente'` devolve NULL e a verificação passa ao lado. Mas
-- deixar lá o nome era deixar uma pista falsa para quem lesse a seguir, e
-- as pistas falsas em SQL de segurança pagam-se caras.
--
-- A condição existe porque `rejeitar_codigo_painel` nasce numa migração com
-- nome por data, fora do intervalo que a suíte de RLS aplica. Sem ela, esta
-- migração não corre no arreio de testes — e uma migração que os testes não
-- conseguem aplicar é uma migração que ninguém verifica.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc
     WHERE proname = 'rejeitar_codigo_painel'
       AND pronamespace = 'public'::regnamespace
  ) THEN
    DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_vinculos
      ON public.contabilista_vinculos;
    CREATE TRIGGER trg_texto_seguro_contabilista_vinculos
      BEFORE INSERT OR UPDATE ON public.contabilista_vinculos
      FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
        'mensagem', 'nome_cliente'
      );
  END IF;
END $$;

-- A RPC de resumo declara a coluna no tipo de retorno.
DROP FUNCTION IF EXISTS public.resumo_clientes_do_contabilista();

-- E agora a coluna pode cair. O grant por coluna cai com ela.
ALTER TABLE public.contabilista_vinculos DROP COLUMN IF EXISTS email_cliente;

-- O que sobra do grant da 047: o nome, e só o nome.
GRANT UPDATE (nome_cliente) ON public.contabilista_vinculos TO authenticated;

COMMENT ON TABLE public.contabilista_vinculos IS
  'A relação entre um cliente e um contabilista. Não guarda, e não pode voltar '
  'a guardar, nenhum canal de contacto do cliente: o acompanhamento acontece '
  'dentro da plataforma, onde é revogável e fica registado.';


-- ── 2. A RPC de resumo, sem a coluna ────────────────────────────────

CREATE FUNCTION public.resumo_clientes_do_contabilista()
RETURNS TABLE (
  vinculo_id            uuid,
  cliente_id            uuid,
  estado                text,
  origem                text,
  criado_em             timestamptz,
  nome_cliente          text,
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
    v.nome_cliente, v.mensagem,
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
  'Uma linha por cliente do contabilista autenticado. Não devolve nenhum canal '
  'de contacto — ver migração da fronteira de contacto — e não lê tabelas fiscais (migração 038).';


-- ── 3. O texto também é uma porta ───────────────────────────────────
--
-- O equilíbrio desta função é todo entre dois erros. Deixar passar um
-- número é perder a relação; recusar um NIF é estragar uma conversa
-- legítima e ensinar as pessoas a desconfiar da caixa de texto. O segundo
-- erro é pior, porque acontece a quem não estava a fazer nada de errado.
--
-- Daí a regra central: NÚMEROS SOZINHOS NÃO CHEGAM. Um NIF, um IBAN, uma
-- referência de pagamento e um telemóvel são todos dígitos; o que distingue
-- um contacto é a FORMA de contacto — o indicativo, os separadores, ou a
-- palavra que o apresenta. Um `912345678` cru só é recusado quando nada no
-- texto o apresenta como outra coisa.

CREATE OR REPLACE FUNCTION public.texto_parece_contacto_externo(p_texto text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  s        text;
  m        text[];
  bruto    text;
  digitos  text;
  com_sep  boolean := false;
  cru      boolean := false;
BEGIN
  -- Minúsculas e espaços normalizados. Os separadores FICAM: são eles que
  -- distinguem «912 345 678» de um número de documento.
  s := pg_catalog.lower(
         pg_catalog.regexp_replace(COALESCE(p_texto, ''), '[[:space:]]+', ' ', 'g'));

  -- Os dígitos que já têm dono declarado saem de cena antes da análise. É
  -- assim que um NIF deixa de se parecer com um telemóvel sem que a deteção
  -- de telemóveis tenha de ficar mais fraca.
  s := pg_catalog.regexp_replace(
         s,
         '(nif|nipc|n\.?i\.?f|contribuinte|iban|nib|refer[êe]ncia|ref\.?|entidade|multibanco|mb ?way|fatura|factura|recibo|documento|processo|ap[óo]lice|matr[íi]cula)[^0-9]{0,24}[0-9 .-]{6,34}',
         ' ',
         'g');

  -- ── Email, por extenso ou disfarçado ──────────────────────────────
  IF s ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
     OR s ~ '[a-z0-9._%+-]+ ?[([{] ?(at|arroba) ?[)\]}] ?[a-z0-9-]+\.[a-z]{2,}'
     OR s ~ '[a-z0-9._%+-]+ ?[([{] ?(at|arroba) ?[)\]}] ?[a-z0-9.-]+ ?[([{] ?(dot|ponto) ?[)\]}] ?[a-z]{2,}'
     OR s ~ '[a-z0-9._%+-]+ (at|arroba) [a-z0-9.-]+ ?\.? ?[a-z]{2,}'
     OR s ~ 'mailto ?:' THEN
    RETURN true;
  END IF;

  -- ── Indicativo de país ────────────────────────────────────────────
  IF s ~ '(\+ ?351|00 ?351)[ .-]?[0-9]' OR s ~ 'tel ?: ?[+0-9]' THEN
    RETURN true;
  END IF;

  -- ── Números portugueses de nove dígitos ───────────────────────────
  --
  -- Enumerar agrupamentos («912 345 678», «91 234 5678», «912-345-678»…)
  -- falha sempre num que ninguém se lembrou. Procura-se uma corrida de
  -- nove dígitos com separadores opcionais e normaliza-se. As âncoras
  -- impedem que um número de doze dígitos dê um telemóvel por recorte.
  FOR m IN
    SELECT r FROM pg_catalog.regexp_matches(
      s, '(?<![0-9])([0-9](?:[ .-]?[0-9]){8})(?![0-9])', 'g') AS r
  LOOP
    bruto   := m[1];
    digitos := pg_catalog.regexp_replace(bruto, '[ .-]', '', 'g');
    IF pg_catalog.length(digitos) = 9 AND digitos ~ '^(9[1236]|2[1-9])' THEN
      IF pg_catalog.length(bruto) > 9 THEN com_sep := true; ELSE cru := true; END IF;
    END IF;
  END LOOP;

  -- Com separadores dispensa contexto: é a forma de ditar um número a
  -- alguém. Cru precisa de uma palavra que o apresente como contacto —
  -- sem ela, nove dígitos são só nove dígitos.
  IF com_sep THEN RETURN true; END IF;
  IF cru AND s ~ '(telem[oó]vel|telefone|contacto|contato|whats|wpp|liga|ligar|chama|telefona|sms|n[uú]mero|call)' THEN
    RETURN true;
  END IF;

  -- ── Canais com nome próprio ───────────────────────────────────────
  IF s ~ '\m(whats ?app|whatsap|wpp|telegram|signal|viber|messenger|skype|imessage|facetime)\M'
     OR s ~ '(wa\.me|api\.whatsapp|t\.me/|m\.me/|join\.skype)'
     OR s ~ '(instagram\.com/|facebook\.com/|linkedin\.com/in/|tiktok\.com/@)' THEN
    RETURN true;
  END IF;

  -- ── Convites a sair, sem número à vista ───────────────────────────
  IF s ~ '\m(o|meu) (meu )?(email|e-mail|mail|telem[oó]vel|telefone|contacto|n[uú]mero) (é|e|:) '
     OR s ~ '(manda|envia|escreve|passa|d[áa]|liga)[- ](me )?(um |o |para o |para )?(email|e-mail|mail|whats|sms|telem[oó]vel|telefone)'
     OR s ~ 'fora (da|desta) plataforma'
     OR s ~ '(falamos|continuamos|combinamos) (por|no|pelo) (whats|email|e-mail|telefone|telem[oó]vel)' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.texto_parece_contacto_externo(text) IS
  'Verdadeiro quando o texto oferece um canal de contacto fora da plataforma. '
  'Números com dono declarado (NIF, IBAN, referência, fatura) são retirados '
  'antes da análise — um NIF nunca é lido como telemóvel.';

REVOKE ALL ON FUNCTION public.texto_parece_contacto_externo(text) FROM PUBLIC, anon;
-- O cliente da aplicação não precisa de a chamar: a versão em TypeScript
-- dá a resposta imediata. Fica disponível para quem quiser confirmar a
-- regra a partir da própria sessão, e não revela nada ao devolvê-la.
GRANT EXECUTE ON FUNCTION public.texto_parece_contacto_externo(text) TO authenticated;


CREATE OR REPLACE FUNCTION public.rejeitar_contacto_externo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  i     integer;
  valor text;
BEGIN
  FOR i IN 0..GREATEST(TG_NARGS - 1, 0) LOOP
    EXIT WHEN TG_NARGS = 0;
    valor := pg_catalog.to_jsonb(NEW) ->> TG_ARGV[i];
    IF public.texto_parece_contacto_externo(valor) THEN
      RAISE EXCEPTION
        'Para proteger o acompanhamento, os contactos pessoais não se partilham aqui.'
        USING ERRCODE = '22023', HINT = 'contacto_externo';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.rejeitar_contacto_externo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sem_contacto_externo_mensagens ON public.contabilista_mensagens;
CREATE TRIGGER trg_sem_contacto_externo_mensagens
  BEFORE INSERT OR UPDATE ON public.contabilista_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_contacto_externo('corpo');

-- O recado que abre a relação segue a mesma regra: era o primeiro sítio
-- por onde um número passava, e passava antes de haver conversa nenhuma.
DROP TRIGGER IF EXISTS trg_sem_contacto_externo_vinculos ON public.contabilista_vinculos;
CREATE TRIGGER trg_sem_contacto_externo_vinculos
  BEFORE INSERT OR UPDATE ON public.contabilista_vinculos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_contacto_externo('mensagem', 'nome_cliente');

-- E a nota que acompanha uma partilha.
DROP TRIGGER IF EXISTS trg_sem_contacto_externo_partilhas ON public.partilhas;
CREATE TRIGGER trg_sem_contacto_externo_partilhas
  BEFORE INSERT OR UPDATE ON public.partilhas
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_contacto_externo('nota');

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260816160000_sala_de_acompanhamento.sql                         ║
-- ╚═════════════════════════════════════════════════════════════════════╝

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

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260816170000_recebimentos_no_contrato_publico.sql               ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- 20260816170000_recebimentos_no_contrato_publico.sql
-- ═══════════════════════════════════════════════════════════════════════
--  «ESTE CONTABILISTA ACEITA PAGAMENTO AQUI?»
--  ---------------------------------------------------------------------
--  A pergunta é do cliente, e até agora não tinha resposta em lado nenhum.
--  Marcava-se a consulta, aparecia — ou não — um botão de pagar, e o
--  cliente descobria pelo silêncio.
--
--  O sinal existe: `contabilista_stripe.charges_enabled`. O que não existia
--  era maneira de o publicar sem publicar o resto. A tabela tem uma única
--  política — «só o próprio lê» — e está certa assim: o id da conta Stripe,
--  os requisitos por cumprir e o estado da verificação são dados de negócio
--  de outra pessoa. Que a Stripe pediu um documento a alguém não é
--  informação do cliente, e é das que fazem perder um cliente por uma razão
--  que não é dele.
--
--  A SOLUÇÃO É UMA COLUNA, NÃO UMA POLÍTICA NOVA
--  ---------------------------------------------
--  A view `contabilistas_publico` já é `security_invoker = false`: corre com
--  os privilégios de quem a criou e por isso consegue ler a tabela sem que
--  o cliente ganhe acesso a ela. Acrescenta-se UM booleano derivado, e mais
--  nada atravessa.
--
--  A regra de ouro do contrato público (migração 20260815200000) mantém-se:
--  acrescentar uma coluna aqui é uma DECISÃO, e esta está tomada — sai o
--  facto de que se pode pagar, não sai o porquê de não se poder.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. O contrato público, com mais um facto ────────────────────────
--
-- `CREATE OR REPLACE VIEW` não aceita acrescentar colunas no meio nem
-- mudar tipos, e a coluna nova entra no fim — mas as políticas e os grants
-- que dependem da view perdem-se com um DROP. Recria-se por inteiro e
-- devolve-se o grant a seguir, na mesma transação implícita da migração.
DROP VIEW IF EXISTS public.contabilistas_publico;

CREATE VIEW public.contabilistas_publico
WITH (security_invoker = false) AS
SELECT
  c.user_id,
  c.slug,
  c.nome,
  c.occ,
  (c.occ_verificado_em IS NOT NULL) AS occ_verificado,
  c.titulo_profissional,
  c.apresentacao_curta,
  c.bio,
  c.distrito,
  c.concelho,
  c.especialidades,
  c.modalidades,
  c.idiomas,
  c.anos_experiencia,
  c.resposta_media_horas,
  -- O email é público por decisão de produto: o editor de perfil diz, na
  -- própria página, que é isto que aparece no diretório. Está aqui porque
  -- foi escolhido, não por arrastamento.
  c.email_contacto,
  c.website,
  c.linkedin_url,
  c.linkedin_avatar_url,
  (c.linkedin_ligado_em IS NOT NULL) AS linkedin_ligado,
  c.aceita_novos_clientes,
  c.preco_consulta_cents,
  c.duracao_consulta_min,
  coalesce(r.ativa, false)                                   AS fidelidade_ativa,
  CASE WHEN coalesce(r.ativa, false) THEN r.meta         END AS fidelidade_meta,
  CASE WHEN coalesce(r.ativa, false) THEN r.desconto_pct END AS fidelidade_desconto_pct,
  -- ⚠️ O ÚNICO facto que sai da conta Stripe.
  --
  -- Não sai `stripe_account_id`, não saem os requisitos, não sai se está
  -- em análise ou restrita, e não sai sequer se a conta existe. Um cliente
  -- que veja «false» não consegue distinguir «nunca ligou» de «tem um
  -- documento por enviar» — e é isso que se pretende.
  --
  -- `charges_enabled` e não `payouts_enabled`: a pergunta do cliente é se
  -- CONSEGUE PAGAR. Que o dinheiro ainda não tenha saído para o IBAN do
  -- contabilista é problema entre ele e a Stripe, e não muda nada para
  -- quem paga.
  COALESCE(s.charges_enabled, false) AS recebe_pagamentos,
  c.criado_em
FROM public.contabilistas c
LEFT JOIN public.fidelidade_regras r
       ON r.contabilista_id = c.user_id AND r.substituida_em IS NULL
LEFT JOIN public.contabilista_stripe s
       ON s.contabilista_id = c.user_id
WHERE c.estado = 'aprovado';

COMMENT ON VIEW public.contabilistas_publico IS
  'O contrato público do diretório e do perfil público. Acrescentar uma '
  'coluna aqui é uma decisão; acrescentar uma coluna a `contabilistas` '
  'deixa de ser. Não expõe telefone (ver contacto_do_contabilista), '
  'linkedin_subject, pedido_id nem estado. De `contabilista_stripe` só sai '
  '`recebe_pagamentos` — nunca o id da conta nem os requisitos.';

GRANT SELECT ON public.contabilistas_publico TO anon, authenticated;


-- ── 2. O mesmo facto, para quem já é cliente ────────────────────────
--
-- O cliente com vínculo precisa de saber isto na sala, e ler a view do
-- diretório para uma pergunta sobre a SUA relação é ler a tabela pública
-- inteira. Uma função com um id devolve uma linha e um booleano.
--
-- SECURITY DEFINER com autorização escrita à mão: só responde a quem tem
-- vínculo, e a resposta é sempre o mesmo booleano que o diretório já
-- publica — não há aqui nada que não estivesse disponível.
CREATE OR REPLACE FUNCTION public.contabilista_recebe_pagamentos(p_contabilista uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT s.charges_enabled
       FROM public.contabilista_stripe s
      WHERE s.contabilista_id = p_contabilista
        AND EXISTS (
          SELECT 1 FROM public.contabilistas c
           WHERE c.user_id = p_contabilista AND c.estado = 'aprovado')),
    false);
$$;

COMMENT ON FUNCTION public.contabilista_recebe_pagamentos(uuid) IS
  'Se um contabilista aprovado consegue receber pagamentos pela plataforma. '
  'Devolve o mesmo booleano que `contabilistas_publico.recebe_pagamentos` e '
  'nada mais — nem o id da conta, nem os requisitos, nem o estado.';

REVOKE EXECUTE ON FUNCTION public.contabilista_recebe_pagamentos(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.contabilista_recebe_pagamentos(uuid) TO anon, authenticated;


-- ── 3. A tabela continua fechada ────────────────────────────────────
--
-- Isto não muda nada — é uma reafirmação executável. Se alguém abrir a
-- tabela por engano numa migração futura, o teste de RLS que acompanha
-- esta migração cai, e cai a dizer porquê.
DROP POLICY IF EXISTS "stripe_proprio_le" ON public.contabilista_stripe;
CREATE POLICY "stripe_proprio_le" ON public.contabilista_stripe
  FOR SELECT TO authenticated
  USING (contabilista_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.contabilista_stripe FROM anon, authenticated;

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260816180000_stripe_fecha_grant_anon.sql                        ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- 20260816180000_stripe_fecha_grant_anon.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O GRANT QUE NÃO DEVIA LÁ ESTAR
--  ---------------------------------------------------------------------
--  Encontrado a olhar para a base a sério, e não para o SQL: `anon` tinha
--  SELECT em `contabilista_stripe`.
--
--  NÃO HAVIA FUGA, e vale a pena dizer porquê antes de dizer o resto. A
--  RLS está ligada nessa tabela e a única política é `TO authenticated`;
--  um anónimo com privilégio de SELECT e sem política que o cubra lê zero
--  linhas. Quem fosse ao PostgREST buscar `contabilista_stripe` recebia
--  uma lista vazia, e não o id da conta Stripe de ninguém.
--
--  Mas um GRANT que só é inofensivo porque uma política o cobre é uma
--  armadilha à espera. Basta alguém, daqui a seis meses, acrescentar uma
--  política mais larga — para um painel de administração, por exemplo —
--  sem reparar que o grant ao anónimo já lá estava. A proteção passa a
--  depender de duas coisas ao mesmo tempo, e a segunda não está escrita em
--  lado nenhum.
--
--  O sinal público não precisa disto para nada: sai por
--  `contabilistas_publico`, que corre com `security_invoker = false` e por
--  isso lê a tabela com os privilégios de quem criou a view.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

REVOKE ALL ON public.contabilista_stripe FROM anon;

-- O contabilista continua a ler a SUA linha — é o que alimenta o cartão
-- de recebimentos no perfil. Quem decide o que ele vê é a política, não
-- este grant.
GRANT SELECT ON public.contabilista_stripe TO authenticated;

-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║  20260817120000_local_verificado_da_consulta.sql                   ║
-- ╚═════════════════════════════════════════════════════════════════════╝

-- 20260817120000_local_verificado_da_consulta.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O LOCAL DA CONSULTA DEIXA DE SER UMA FRASE
--  ---------------------------------------------------------------------
--  Desde a 042 que `agendamentos.local_ou_ligacao` é uma linha de texto de
--  500 caracteres. É onde cabe «https://meet…/marta» e é também onde cabe
--  «Rua de exemplo, 1 · Matosinhos» — e é aí que a promessa parte.
--
--  Um link é auto-suficiente: clica-se e chega-se lá. Uma morada escrita à
--  mão não é. «Rua de exemplo, 1 · Matosinhos» não diz a que Matosinhos, não
--  diz se o número existe, não abre no telemóvel de ninguém e não sobrevive
--  a uma gralha. O cliente que a lê fica exatamente onde estava: a copiar
--  texto para outro sítio e a torcer para o mapa adivinhar.
--
--  Esta migração acrescenta ao agendamento o par de coordenadas do ponto
--  que o contabilista escolheu MESMO — num mapa, com o pino em cima da
--  porta. Não substitui a morada: acompanha-a. A morada continua a ser o
--  que se lê; as coordenadas são o que se verifica e o que abre direito na
--  aplicação de mapas do cliente.
--
--  Três decisões:
--
--   1. Duas colunas, não um jsonb. Um par de números com domínio conhecido
--      não ganha nada em ser um documento, e ganha muito em ser verificável
--      por CHECK. Latitude fora de [-90, 90] é um erro de programa, não um
--      dado — e a base recusa-o.
--
--   2. As coordenadas só existem juntas. Meia coordenada não é meia
--      informação: é um ponto no meridiano de Greenwich, que fica no mar.
--      A restrição exige as duas ou nenhuma.
--
--   3. `confirmar_consulta` muda de assinatura, e por isso é DROP e não
--      CREATE OR REPLACE — deixar a versão de dois argumentos viva daria
--      uma sobrecarga ambígua ao PostgREST, que escolheria a errada
--      exatamente nas chamadas que trazem o ponto.
--
--  E uma quarta, que é a que faltava ao ecrã:
--
--   4. `definir_local_consulta`. Até aqui o local só se escrevia no
--      instante da confirmação. Quem confirmasse primeiro e recebesse a
--      morada da sala depois não tinha por onde a corrigir — a consulta já
--      não estava «por confirmar», e a única RPC que escrevia o campo
--      exigia esse estado. Mudar de sala, corrigir o andar ou trocar o link
--      da chamada passa a ser uma operação com nome próprio, que avisa o
--      cliente como qualquer outra mudança que lhe diga respeito.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. As colunas ───────────────────────────────────────────────────────

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS local_lat double precision,
  ADD COLUMN IF NOT EXISTS local_lng double precision;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.agendamentos'::regclass
       AND conname = 'agendamentos_local_ponto_completo'
  ) THEN
    ALTER TABLE public.agendamentos
      ADD CONSTRAINT agendamentos_local_ponto_completo CHECK (
        (local_lat IS NULL AND local_lng IS NULL)
        OR (
          local_lat IS NOT NULL AND local_lng IS NOT NULL
          AND local_lat BETWEEN -90 AND 90
          AND local_lng BETWEEN -180 AND 180
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.agendamentos.local_lat IS
  'Latitude do ponto escolhido no mapa ao marcar o local da consulta presencial. Nula quando o local é só texto (linhas anteriores a esta migração) ou quando a consulta é online.';
COMMENT ON COLUMN public.agendamentos.local_lng IS
  'Longitude do ponto escolhido no mapa. Só existe em par com local_lat — ver a restrição agendamentos_local_ponto_completo.';

-- O cliente já lia `local_ou_ligacao` pela policy da própria consulta; as
-- colunas novas seguem o mesmo caminho por herdarem a policy da tabela.
-- Nada a conceder à parte: `agendamentos` não tem grants por coluna.

-- ── 2. Confirmar passa a aceitar o ponto ────────────────────────────────

DROP FUNCTION IF EXISTS public.confirmar_consulta(uuid, text);

CREATE FUNCTION public.confirmar_consulta(
  p_agendamento uuid,
  p_local text DEFAULT NULL,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid; v_vinculo uuid; v_cliente uuid;
BEGIN
  -- Meia coordenada é ruído: ou vêm as duas, ou não vem ponto nenhum.
  IF (p_lat IS NULL) <> (p_lng IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ponto_incompleto');
  END IF;

  UPDATE public.agendamentos a
     SET estado = 'confirmado',
         local_ou_ligacao = coalesce(nullif(btrim(coalesce(p_local, '')), ''), a.local_ou_ligacao),
         -- O ponto acompanha a morada que veio com ele. Sem morada nova,
         -- o ponto antigo fica — trocar um pelo outro deixaria o pino
         -- numa rua e o texto noutra.
         local_lat = CASE WHEN p_lat IS NOT NULL THEN p_lat ELSE a.local_lat END,
         local_lng = CASE WHEN p_lng IS NOT NULL THEN p_lng ELSE a.local_lng END,
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

-- ── 3. Corrigir o local depois de confirmada ────────────────────────────

-- O aviso novo tem de caber na restrição da 044 (alargada pela sala).
ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_tipo_check CHECK (tipo IN (
  'vinculo_pedido', 'vinculo_aceite', 'mensagem',
  'consulta_pedida', 'consulta_confirmada', 'consulta_cancelada',
  'partilha_recebida', 'cupao_ganho', 'candidatura_decidida',
  'pedido_criado', 'pedido_respondido', 'pedido_concluido',
  'consulta_local_mudou'));

-- Uma morada que muda na véspera é precisamente o que faz alguém aparecer
-- na porta errada. Entra na lista curta do que justifica um email.
CREATE OR REPLACE FUNCTION public.aviso_merece_email(p_tipo text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT p_tipo IN ('vinculo_pedido', 'vinculo_aceite', 'consulta_pedida',
                    'consulta_confirmada', 'consulta_cancelada', 'cupao_ganho',
                    'candidatura_decidida', 'consulta_local_mudou')
$$;

CREATE OR REPLACE FUNCTION public.definir_local_consulta(
  p_agendamento uuid,
  p_local text,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid; v_vinculo uuid; v_cliente uuid; v_texto text;
BEGIN
  IF (p_lat IS NULL) <> (p_lng IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ponto_incompleto');
  END IF;

  v_texto := nullif(btrim(coalesce(p_local, '')), '');
  IF v_texto IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'local_vazio');
  END IF;

  -- Só numa consulta que ainda vai acontecer. Reescrever o local de uma
  -- consulta fechada mudava o registo do que aconteceu, e isso não é uma
  -- correção — é outra coisa.
  UPDATE public.agendamentos a
     SET local_ou_ligacao = v_texto,
         local_lat = p_lat,
         local_lng = p_lng,
         atualizado_em = now()
   WHERE a.id = p_agendamento
     AND a.contabilista_id = auth.uid()
     AND a.estado IN ('pedido', 'confirmado')
     AND public.contabilista_ativo(auth.uid())
  RETURNING a.id, a.cliente_id INTO v_id, v_cliente;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_editavel');
  END IF;

  SELECT v.id INTO v_vinculo FROM public.contabilista_vinculos v
   WHERE v.contabilista_id = auth.uid() AND v.cliente_id = v_cliente AND v.estado <> 'terminado';
  IF v_vinculo IS NOT NULL THEN
    PERFORM public.avisar_parte(v_vinculo, auth.uid(), 'consulta_local_mudou',
      'O local da consulta mudou', 'Vê onde é, na tua área.',
      '/dashboard/contabilista');
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- ── 4. Quem pode chamar ─────────────────────────────────────────────────

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.confirmar_consulta(uuid, text, double precision, double precision)',
    'public.definir_local_consulta(uuid, text, double precision, double precision)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.confirmar_consulta(uuid, text, double precision, double precision) IS
  'Confirma e grava o local. O ponto é opcional e só entra em par; sem morada nova, o ponto anterior mantém-se para o pino não ficar noutra rua que o texto.';
COMMENT ON FUNCTION public.definir_local_consulta(uuid, text, double precision, double precision) IS
  'Corrige o local de uma consulta ainda por acontecer, sem a reconfirmar. Existe porque quem confirma primeiro e recebe a morada da sala depois não tinha por onde a escrever, e porque salas mudam.';
