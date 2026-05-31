-- ============================================================
-- ReciboCerto — Setup completo (versão idempotente)
-- Cola TUDO isto no Supabase → SQL Editor e clica RUN.
-- Seguro para correr múltiplas vezes.
-- ============================================================


-- ── 1. Tabela de perfis ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id        uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email     text NOT NULL,
  role      text NOT NULL DEFAULT 'user',
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfil_proprio_leitura"  ON public.profiles;
DROP POLICY IF EXISTS "admin_leitura_perfis"    ON public.profiles;

CREATE POLICY "perfil_proprio_leitura" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "admin_leitura_perfis" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ── 2. Trigger: cria perfil automaticamente em novos registos ─
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


-- ── 3. ATRIBUIR ROLE ADMIN À CONTA JÁ EXISTENTE ─────────────
--    (cobre o caso de a conta ter sido criada antes do trigger)
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'admin@recibocerto.pt'
ON CONFLICT (id) DO UPDATE SET role = 'admin';


-- ── 4. Tabela de parceiros (catálogo gerido pelo admin) ───────
CREATE TABLE IF NOT EXISTS public.admin_partners (
  id            text PRIMARY KEY,
  nome          text NOT NULL,
  descricao     text NOT NULL,
  url           text NOT NULL DEFAULT '#',
  cta           text NOT NULL DEFAULT 'Saber mais',
  contextos     text[] NOT NULL DEFAULT '{}',
  icone         text NOT NULL DEFAULT 'bank',
  ativo         boolean NOT NULL DEFAULT true,
  ordem         integer NOT NULL DEFAULT 0,
  criado_em     timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

ALTER TABLE public.admin_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parceiros_ativos_publicos"  ON public.admin_partners;
DROP POLICY IF EXISTS "admin_ve_todos_parceiros"    ON public.admin_partners;
DROP POLICY IF EXISTS "admin_escreve_parceiros"     ON public.admin_partners;
DROP POLICY IF EXISTS "admin_atualiza_parceiros"    ON public.admin_partners;
DROP POLICY IF EXISTS "admin_elimina_parceiros"     ON public.admin_partners;

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

-- Auto-update de atualizado_em
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS parceiros_set_atualizado ON public.admin_partners;
CREATE TRIGGER parceiros_set_atualizado
  BEFORE UPDATE ON public.admin_partners
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();


-- ── 5. Tabela de configurações ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
  chave         text PRIMARY KEY,
  valor         jsonb NOT NULL DEFAULT '{}',
  atualizado_em timestamptz DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_gere_settings" ON public.site_settings;
CREATE POLICY "admin_gere_settings" ON public.site_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ── 6. Seed: catálogo inicial de parceiros ────────────────────
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


-- ── Verificação final ─────────────────────────────────────────
SELECT
  u.email,
  p.role,
  CASE WHEN p.role = 'admin' THEN '✓ Admin configurado com sucesso'
       ELSE '✗ Sem role admin — verifica o email'
  END AS estado
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'admin@recibocerto.pt';
