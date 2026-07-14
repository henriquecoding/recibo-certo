-- ================================================================
-- ReciboCerto — Migration 020: Tabela propostas_investidores (+ RLS)
-- Cola no Supabase → SQL Editor e clica RUN.
-- Idempotente: seguro para correr múltiplas vezes.
-- ================================================================
-- Porquê:
--   A tabela public.propostas_investidores era lida/escrita por
--   src/lib/supabase/admin.ts (insert público submeterProposta + gestão admin)
--   mas NÃO existia migração — foi criada à mão no dashboard, deixando a RLS de
--   produção inverificável a partir do repositório. Esta migração fixa o schema
--   e a RLS, e endurece contra spam com CHECKs de comprimento a nível de BD.
--
-- Modelo de acesso:
--   • INSERT anónimo permitido (formulário público em /investidores), mas só com
--     estado 'pendente' e sem notas de admin.
--   • SELECT/UPDATE/DELETE apenas para admin (via public.is_admin()).
-- ================================================================

CREATE TABLE IF NOT EXISTS public.propostas_investidores (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                      text        NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 200),
  email                     text        NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254
                                          AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  empresa                   text        CHECK (empresa IS NULL OR char_length(empresa) <= 200),
  cargo                     text        CHECK (cargo IS NULL OR char_length(cargo) <= 200),
  telefone                  text        CHECK (telefone IS NULL OR char_length(telefone) <= 40),
  interesse                 text        NOT NULL CHECK (char_length(interesse) BETWEEN 1 AND 2000),
  montante_minimo           numeric(14,2) CHECK (montante_minimo IS NULL OR montante_minimo >= 0),
  montante_maximo           numeric(14,2) CHECK (montante_maximo IS NULL OR montante_maximo >= 0),
  horizonte                 text        CHECK (horizonte IS NULL OR char_length(horizonte) <= 200),
  experiencia_investimento  text        CHECK (experiencia_investimento IS NULL OR char_length(experiencia_investimento) <= 2000),
  setores_interesse         text        CHECK (setores_interesse IS NULL OR char_length(setores_interesse) <= 2000),
  como_conheceu             text        CHECK (como_conheceu IS NULL OR char_length(como_conheceu) <= 500),
  website                   text        CHECK (website IS NULL OR char_length(website) <= 500),
  linkedin                  text        CHECK (linkedin IS NULL OR char_length(linkedin) <= 500),
  mensagem                  text        CHECK (mensagem IS NULL OR char_length(mensagem) <= 5000),
  estado                    text        NOT NULL DEFAULT 'pendente'
                                          CHECK (estado IN ('pendente','em_analise','contactado','aprovado','rejeitado')),
  notas_admin               text        CHECK (notas_admin IS NULL OR char_length(notas_admin) <= 5000),
  submetido_em              timestamptz DEFAULT now(),
  atualizado_em             timestamptz DEFAULT now()
);

ALTER TABLE public.propostas_investidores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "propostas_insere_publico"   ON public.propostas_investidores;
DROP POLICY IF EXISTS "admin_ve_propostas"          ON public.propostas_investidores;
DROP POLICY IF EXISTS "admin_atualiza_propostas"    ON public.propostas_investidores;
DROP POLICY IF EXISTS "admin_elimina_propostas"     ON public.propostas_investidores;

-- Qualquer pessoa pode submeter, mas apenas como 'pendente' e sem notas de admin.
CREATE POLICY "propostas_insere_publico" ON public.propostas_investidores
  FOR INSERT WITH CHECK (estado = 'pendente' AND notas_admin IS NULL);

CREATE POLICY "admin_ve_propostas" ON public.propostas_investidores
  FOR SELECT USING (public.is_admin());

CREATE POLICY "admin_atualiza_propostas" ON public.propostas_investidores
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "admin_elimina_propostas" ON public.propostas_investidores
  FOR DELETE USING (public.is_admin());

-- atualizado_em automático (reutiliza a função existente set_atualizado_em).
DROP TRIGGER IF EXISTS propostas_set_atualizado ON public.propostas_investidores;
CREATE TRIGGER propostas_set_atualizado
  BEFORE UPDATE ON public.propostas_investidores
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE INDEX IF NOT EXISTS propostas_submetido_idx ON public.propostas_investidores (submetido_em DESC);
CREATE INDEX IF NOT EXISTS propostas_estado_idx    ON public.propostas_investidores (estado);

-- ── Endurecimento da tabela EXISTENTE ──────────────────────────
-- Em produção esta tabela foi criada à mão (migração `create_propostas_investidores`),
-- por isso o `CREATE TABLE IF NOT EXISTS` acima é no-op e os CHECKs de comprimento
-- não se aplicam. Aplicamo-los aqui via ALTER idempotente (depois das políticas,
-- para que a RLS — o mais importante — fique aplicada mesmo que um CHECK falhe por
-- dados legados). Garantimos também o DEFAULT de `estado` para a política de insert.
ALTER TABLE public.propostas_investidores ALTER COLUMN estado SET DEFAULT 'pendente';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propostas_nome_len') THEN
    ALTER TABLE public.propostas_investidores
      ADD CONSTRAINT propostas_nome_len CHECK (char_length(nome) BETWEEN 1 AND 200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propostas_email_len') THEN
    ALTER TABLE public.propostas_investidores
      ADD CONSTRAINT propostas_email_len CHECK (char_length(email) BETWEEN 3 AND 254);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propostas_interesse_len') THEN
    ALTER TABLE public.propostas_investidores
      ADD CONSTRAINT propostas_interesse_len CHECK (char_length(interesse) BETWEEN 1 AND 2000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propostas_mensagem_len') THEN
    ALTER TABLE public.propostas_investidores
      ADD CONSTRAINT propostas_mensagem_len CHECK (mensagem IS NULL OR char_length(mensagem) <= 5000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propostas_notas_len') THEN
    ALTER TABLE public.propostas_investidores
      ADD CONSTRAINT propostas_notas_len CHECK (notas_admin IS NULL OR char_length(notas_admin) <= 5000);
  END IF;
END $$;
