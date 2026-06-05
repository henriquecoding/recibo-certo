-- ================================================================
-- ReciboCerto — Migration 004: Sistema de Anúncios + Fix RLS
-- Cola no Supabase → SQL Editor e clica RUN.
-- Idempotente: seguro para correr múltiplas vezes.
-- ================================================================
-- Mudanças:
--   1. Função is_admin() SECURITY DEFINER (corrige recursão infinita)
--   2. Re-cria políticas de todos os recursos usando is_admin()
--   3. Tabela anuncios (parceiro | google_ads | banner | nativo)
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 1. FUNÇÃO is_admin() — evita recursão nas políticas RLS
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ────────────────────────────────────────────────────────────────
-- 2. PROFILES — corrigir políticas recursivas
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "perfil_proprio_atualizacao" ON public.profiles;
DROP POLICY IF EXISTS "admin_leitura_perfis"        ON public.profiles;

-- Atualização simples: só o próprio pode atualizar
CREATE POLICY "perfil_proprio_atualizacao" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin lê todos os perfis (via função SECURITY DEFINER, sem recursão)
CREATE POLICY "admin_leitura_perfis" ON public.profiles
  FOR SELECT USING (public.is_admin());


-- ────────────────────────────────────────────────────────────────
-- 3. ADMIN_PARTNERS — usar is_admin()
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_ve_todos_parceiros" ON public.admin_partners;
DROP POLICY IF EXISTS "admin_escreve_parceiros"  ON public.admin_partners;
DROP POLICY IF EXISTS "admin_atualiza_parceiros" ON public.admin_partners;
DROP POLICY IF EXISTS "admin_elimina_parceiros"  ON public.admin_partners;

CREATE POLICY "admin_ve_todos_parceiros" ON public.admin_partners
  FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_escreve_parceiros"  ON public.admin_partners
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_atualiza_parceiros" ON public.admin_partners
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_elimina_parceiros"  ON public.admin_partners
  FOR DELETE USING (public.is_admin());


-- ────────────────────────────────────────────────────────────────
-- 4. SITE_SETTINGS — usar is_admin()
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_gere_settings" ON public.site_settings;
CREATE POLICY "admin_gere_settings" ON public.site_settings
  FOR ALL USING (public.is_admin());


-- ────────────────────────────────────────────────────────────────
-- 5. EMAIL_WAITLIST — usar is_admin()
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_ve_waitlist"      ON public.email_waitlist;
DROP POLICY IF EXISTS "admin_elimina_waitlist" ON public.email_waitlist;

CREATE POLICY "admin_ve_waitlist" ON public.email_waitlist
  FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_elimina_waitlist" ON public.email_waitlist
  FOR DELETE USING (public.is_admin());


-- ────────────────────────────────────────────────────────────────
-- 6. RECIBOS — usar is_admin()
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_ve_todos_recibos" ON public.recibos;
CREATE POLICY "admin_ve_todos_recibos" ON public.recibos
  FOR SELECT USING (public.is_admin());


-- ────────────────────────────────────────────────────────────────
-- 7. ANUNCIOS — tabela principal do sistema de anúncios
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.anuncios (
  id                text        PRIMARY KEY,
  tipo              text        NOT NULL DEFAULT 'parceiro'
                                  CHECK (tipo IN ('parceiro','google_ads','banner','nativo')),
  nome              text        NOT NULL,
  descricao         text        NOT NULL DEFAULT '',
  ativo             boolean     NOT NULL DEFAULT true,
  ordem             integer     NOT NULL DEFAULT 0,

  -- Posicionamento: lista de páginas/secções onde aparece
  posicoes          text[]      NOT NULL DEFAULT '{}',
  mostrar_desktop   boolean     NOT NULL DEFAULT true,
  mostrar_mobile    boolean     NOT NULL DEFAULT true,

  -- Campos: parceiro nativo
  url               text,
  cta               text,
  icone             text,
  logo_url          text,

  -- Campos: Google Ads
  google_client_id  text,       -- ca-pub-XXXXXXXX
  google_slot_id    text,       -- slot ID
  google_format     text        DEFAULT 'auto',
  google_responsive boolean     DEFAULT true,

  -- Campos: Banner
  banner_titulo     text,
  banner_texto      text,
  banner_url        text,
  banner_cor_fundo  text,
  banner_cor_texto  text,
  banner_imagem_url text,

  criado_em         timestamptz DEFAULT now(),
  atualizado_em     timestamptz DEFAULT now()
);

ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anuncios_ativos_publicos" ON public.anuncios;
DROP POLICY IF EXISTS "admin_ve_todos_anuncios"  ON public.anuncios;
DROP POLICY IF EXISTS "admin_escreve_anuncios"   ON public.anuncios;
DROP POLICY IF EXISTS "admin_atualiza_anuncios"  ON public.anuncios;
DROP POLICY IF EXISTS "admin_elimina_anuncios"   ON public.anuncios;

-- Público vê apenas anúncios ativos
CREATE POLICY "anuncios_ativos_publicos" ON public.anuncios
  FOR SELECT USING (ativo = true);

CREATE POLICY "admin_ve_todos_anuncios" ON public.anuncios
  FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_escreve_anuncios"  ON public.anuncios
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_atualiza_anuncios" ON public.anuncios
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_elimina_anuncios"  ON public.anuncios
  FOR DELETE USING (public.is_admin());

DROP TRIGGER IF EXISTS anuncios_set_atualizado ON public.anuncios;
CREATE TRIGGER anuncios_set_atualizado
  BEFORE UPDATE ON public.anuncios
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE INDEX IF NOT EXISTS anuncios_ordem_idx ON public.anuncios (ordem);
CREATE INDEX IF NOT EXISTS anuncios_tipo_idx  ON public.anuncios (tipo);
