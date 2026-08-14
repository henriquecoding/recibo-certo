-- ═══════════════════════════════════════════════════════════════════════
--  PLATAFORMA DE CONTABILISTAS — TODAS AS MIGRAÇÕES, POR ORDEM
--  ---------------------------------------------------------------------
--  Este ficheiro é GERADO. Não o edites: corrige a migração de origem e
--  volta a correr `npm run migracoes:juntar`.
--
--  PARA QUE SERVE
--  --------------
--  As migrações 042 a 053 dependem umas das outras: a 046 usa tabelas que
--  a 042 cria, a 052 altera tabelas que a 048 e a 051 criam. Aplicá-las
--  fora de ordem dá exatamente o erro que dá — «relation does not exist».
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
--
--  Para ver se correu, junta `cron.job_run_details` a `cron.job` pelo
--  `jobid` — aquela tabela não tem `jobname`, e a consulta óbvia falha com
--  «column does not exist». Ver docs/AGENDADOR-DOS-AVISOS.md.
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
