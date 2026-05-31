-- ================================================================
-- ReciboCerto — Schema definitivo (v3)
-- Cola TUDO no Supabase → SQL Editor e clica RUN.
-- Idempotente: seguro para correr múltiplas vezes.
-- ================================================================
-- Tabelas criadas:
--   profiles         → perfil e role de cada utilizador autenticado
--   recibos          → recibos verdes dos utilizadores (nuvem)
--   admin_partners   → catálogo de parceiros gerido pelo admin
--   site_settings    → configurações chave-valor do site
--   email_waitlist   → lista de espera Pro (formulário da landing)
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 1. PROFILES — perfil e role de cada utilizador
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      text        NOT NULL,
  role       text        NOT NULL DEFAULT 'user'
                          CHECK (role IN ('user', 'admin')),
  nome       text,
  criado_em  timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- políticas
DROP POLICY IF EXISTS "perfil_proprio_leitura"    ON public.profiles;
DROP POLICY IF EXISTS "perfil_proprio_atualizacao" ON public.profiles;
DROP POLICY IF EXISTS "admin_leitura_perfis"       ON public.profiles;

CREATE POLICY "perfil_proprio_leitura" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "perfil_proprio_atualizacao" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "admin_leitura_perfis" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- trigger: cria perfil ao registar (atribui role 'admin' ao email admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email = 'admin@recibocerto.pt' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CORRECÇÃO: forçar role admin na conta já existente
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'admin@recibocerto.pt'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- índice
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);


-- ────────────────────────────────────────────────────────────────
-- 2. RECIBOS — recibos verdes dos utilizadores (sync na nuvem)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recibos (
  id                  text        PRIMARY KEY,   -- UUID gerado no cliente
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data                date        NOT NULL,       -- data de emissão (yyyy-mm-dd)
  cliente             text,
  valor               numeric(12,2) NOT NULL CHECK (valor >= 0),
  tipo                text        NOT NULL
                                   CHECK (tipo IN ('art151','outros','vendas','diretosAutor')),
  atividade           text,                       -- rótulo do catálogo fiscal (Art. 151.º)
  regiao              text        NOT NULL DEFAULT 'continente'
                                   CHECK (regiao IN ('continente','madeira','acores')),
  regime_iva          text        NOT NULL DEFAULT 'isento'
                                   CHECK (regime_iva IN ('isento','reduzida','intermedia','normal')),
  base_ss             text        NOT NULL DEFAULT 'servicos'
                                   CHECK (base_ss IN ('servicos','bens')),
  dispensa_retencao   boolean     NOT NULL DEFAULT false,
  criado_em           timestamptz DEFAULT now(),
  atualizado_em       timestamptz DEFAULT now()
);

ALTER TABLE public.recibos ENABLE ROW LEVEL SECURITY;

-- políticas
DROP POLICY IF EXISTS "utilizador_ve_proprios_recibos"    ON public.recibos;
DROP POLICY IF EXISTS "utilizador_insere_recibos"         ON public.recibos;
DROP POLICY IF EXISTS "utilizador_atualiza_recibos"       ON public.recibos;
DROP POLICY IF EXISTS "utilizador_elimina_recibos"        ON public.recibos;
DROP POLICY IF EXISTS "admin_ve_todos_recibos"            ON public.recibos;

CREATE POLICY "utilizador_ve_proprios_recibos" ON public.recibos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "utilizador_insere_recibos" ON public.recibos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "utilizador_atualiza_recibos" ON public.recibos
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "utilizador_elimina_recibos" ON public.recibos
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "admin_ve_todos_recibos" ON public.recibos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- trigger: atualiza atualizado_em
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recibos_set_atualizado ON public.recibos;
CREATE TRIGGER recibos_set_atualizado
  BEFORE UPDATE ON public.recibos
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- índices
CREATE INDEX IF NOT EXISTS recibos_user_id_idx ON public.recibos (user_id);
CREATE INDEX IF NOT EXISTS recibos_data_idx    ON public.recibos (data DESC);
CREATE INDEX IF NOT EXISTS recibos_user_data_idx ON public.recibos (user_id, data DESC);


-- ────────────────────────────────────────────────────────────────
-- 3. ADMIN_PARTNERS — catálogo de parceiros (gerido pelo admin)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_partners (
  id            text        PRIMARY KEY,
  nome          text        NOT NULL,
  descricao     text        NOT NULL,
  url           text        NOT NULL DEFAULT '#',
  cta           text        NOT NULL DEFAULT 'Saber mais',
  contextos     text[]      NOT NULL DEFAULT '{}',
  icone         text        NOT NULL DEFAULT 'bank'
                              CHECK (icone IN ('bank','building','file-sign','heart','invoice')),
  ativo         boolean     NOT NULL DEFAULT true,
  ordem         integer     NOT NULL DEFAULT 0,
  criado_em     timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

ALTER TABLE public.admin_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parceiros_ativos_publicos"  ON public.admin_partners;
DROP POLICY IF EXISTS "admin_ve_todos_parceiros"   ON public.admin_partners;
DROP POLICY IF EXISTS "admin_escreve_parceiros"    ON public.admin_partners;
DROP POLICY IF EXISTS "admin_atualiza_parceiros"   ON public.admin_partners;
DROP POLICY IF EXISTS "admin_elimina_parceiros"    ON public.admin_partners;

CREATE POLICY "parceiros_ativos_publicos" ON public.admin_partners
  FOR SELECT USING (ativo = true);

CREATE POLICY "admin_ve_todos_parceiros" ON public.admin_partners
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_escreve_parceiros" ON public.admin_partners
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_atualiza_parceiros" ON public.admin_partners
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_elimina_parceiros" ON public.admin_partners
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP TRIGGER IF EXISTS parceiros_set_atualizado ON public.admin_partners;
CREATE TRIGGER parceiros_set_atualizado
  BEFORE UPDATE ON public.admin_partners
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- seed: parceiros iniciais
INSERT INTO public.admin_partners (id, nome, descricao, url, cta, contextos, icone, ativo, ordem) VALUES
  ('conta-pj',
   'Conta profissional online',
   'Separa as finanças pessoais das profissionais numa conta dedicada ao trabalho independente. Sem mensalidades, com IBAN português e exportação de movimentos.',
   'https://parceiros.recibocerto.pt/conta-pj', 'Abrir conta gratuita',
   ARRAY['dashboard','receitas'], 'bank', true, 1),
  ('faturacao-eletronica',
   'Faturação eletrónica AT',
   'Emite recibos e faturas certificados pela AT sem sair do navegador. Arquivo digital automático, exportação para contabilista disponível.',
   'https://parceiros.recibocerto.pt/faturacao', 'Experimentar grátis',
   ARRAY['recibos','dashboard'], 'invoice', true, 2),
  ('contabilidade-online',
   'Contabilidade para independentes',
   'Acompanhamento fiscal mensal por um contabilista certificado, especializado em recibos verdes. Prazos e obrigações tratados por quem percebe do assunto.',
   'https://parceiros.recibocerto.pt/contabilidade', 'Ver planos',
   ARRAY['prazos','simulador'], 'building', true, 3),
  ('certificado-digital',
   'Certificado digital qualificado',
   'Assina e submete declarações fiscais sem sair de casa. Certificado qualificado emitido em 24h, reconhecido pela AT e por todos os portais do Estado.',
   'https://parceiros.recibocerto.pt/certificado', 'Obter certificado',
   ARRAY['prazos'], 'file-sign', true, 4),
  ('seguro-saude',
   'Seguro de saúde individual',
   'Sem empregador a pagar metade, o seguro de saúde é a tua rede de segurança. Planos para trabalhadores independentes com cobertura nacional.',
   'https://parceiros.recibocerto.pt/seguro', 'Simular seguro',
   ARRAY['dashboard'], 'heart', true, 5)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS admin_partners_ordem_idx ON public.admin_partners (ordem);


-- ────────────────────────────────────────────────────────────────
-- 4. SITE_SETTINGS — configurações chave-valor do site
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
  chave         text        PRIMARY KEY,
  valor         jsonb       NOT NULL DEFAULT '{}',
  atualizado_em timestamptz DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_gere_settings" ON public.site_settings;

CREATE POLICY "admin_gere_settings" ON public.site_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- seed: configurações por defeito
INSERT INTO public.site_settings (chave, valor) VALUES
  ('parceiros_ativados',  'true'),
  ('session_cap_parceiros', '2'),
  ('banner_ativo',        'false'),
  ('banner_texto',        '""'),
  ('manutencao',          'false')
ON CONFLICT (chave) DO NOTHING;


-- ────────────────────────────────────────────────────────────────
-- 5. EMAIL_WAITLIST — lista de espera Pro (landing / preços)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_waitlist (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  fonte      text        DEFAULT 'landing',    -- 'landing' | 'precos' | 'dashboard'
  criado_em  timestamptz DEFAULT now(),
  CONSTRAINT email_waitlist_email_unique UNIQUE (email)
);

ALTER TABLE public.email_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qualquer_um_insere_waitlist" ON public.email_waitlist;
DROP POLICY IF EXISTS "admin_ve_waitlist"           ON public.email_waitlist;

-- qualquer pessoa pode inscrever-se (mesmo sem conta)
CREATE POLICY "qualquer_um_insere_waitlist" ON public.email_waitlist
  FOR INSERT WITH CHECK (true);

-- só admin lê e gere a lista
CREATE POLICY "admin_ve_waitlist" ON public.email_waitlist
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_elimina_waitlist" ON public.email_waitlist
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS email_waitlist_criado_idx ON public.email_waitlist (criado_em DESC);


-- ────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL
-- ────────────────────────────────────────────────────────────────
SELECT
  u.email,
  p.role,
  CASE
    WHEN p.role = 'admin' THEN '✓ Admin configurado'
    WHEN p.id IS NULL      THEN '✗ Perfil não encontrado — verifica se o trigger funcionou'
    ELSE                        '✗ Role errado: ' || p.role
  END AS estado
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'admin@recibocerto.pt';
