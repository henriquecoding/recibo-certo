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
