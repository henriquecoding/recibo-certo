-- 022_fiz_partner_integration.sql
-- Integração com a FIZ (parceiro de execução fiscal).
-- Ponto 13.4 da arquitetura da parceria.
--
-- Princípio de minimização (ponto 13.5): o Recibo Certo NÃO replica o livro
-- fiscal da FIZ. Guarda apenas a ligação, os consentimentos, identificadores
-- opacos, estados resumidos para a interface e eventos para auditoria.
--
-- Segurança:
--   · os tokens ficam SEMPRE cifrados (AES-256-GCM em src/lib/fiz/tokens.server.ts);
--   · RLS ativo em tudo; `partner_events` é exclusivo do service role — nenhum
--     utilizador autenticado lê a fila de eventos do parceiro;
--   · nenhuma coluna guarda NIF, rendimentos ou dados de clientes.
--
-- Idempotente — seguro correr múltiplas vezes.

-- ── Ligações delegadas (OAuth por utilizador) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_connections (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner                  text NOT NULL CHECK (partner = 'fiz'),
  partner_user_id          text NOT NULL,
  scopes                   text[] NOT NULL DEFAULT '{}',
  access_token_ciphertext  text,
  refresh_token_ciphertext text,
  token_expires_at         timestamptz,
  status                   text NOT NULL DEFAULT 'connected'
                             CHECK (status IN ('connected', 'reauthorization_required', 'revoked')),
  connected_at             timestamptz NOT NULL DEFAULT now(),
  revoked_at               timestamptz,
  last_synced_at           timestamptz,
  UNIQUE (user_id, partner)
);

CREATE INDEX IF NOT EXISTS partner_connections_partner_user_idx
  ON public.partner_connections(partner, partner_user_id);

-- ── Handoffs consentidos ───────────────────────────────────────────────────
-- `payload_hash` permite provar o que foi enviado sem guardar os dados.
CREATE TABLE IF NOT EXISTS public.partner_handoffs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  external_handoff_id text NOT NULL UNIQUE,
  partner_handoff_id  text,
  source_type         text NOT NULL CHECK (source_type IN ('guia', 'simulador', 'dashboard')),
  source_id           text,
  intent              text NOT NULL,
  consent_receipt_id  text NOT NULL,
  consent_policy_version text NOT NULL,
  consent_fields      text[] NOT NULL DEFAULT '{}',
  payload_hash        text NOT NULL,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'deleted')),
  expires_at          timestamptz NOT NULL,
  accepted_at         timestamptz,
  criado_em           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_handoffs_user_idx
  ON public.partner_handoffs(user_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS partner_handoffs_expiracao_idx
  ON public.partner_handoffs(expires_at) WHERE status = 'pending';

-- ── Eventos recebidos (webhooks) ───────────────────────────────────────────
-- A restrição UNIQUE é a garantia real de idempotência (entrega at-least-once).
CREATE TABLE IF NOT EXISTS public.partner_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner          text NOT NULL DEFAULT 'fiz',
  partner_event_id text NOT NULL,
  event_type       text NOT NULL,
  event_version    integer NOT NULL DEFAULT 1,
  subject_id       text,
  payload          jsonb NOT NULL,
  received_at      timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz,
  processing_error text,
  UNIQUE (partner, partner_event_id)
);

CREATE INDEX IF NOT EXISTS partner_events_por_processar_idx
  ON public.partner_events(received_at) WHERE processed_at IS NULL;

-- ── Rotas dos Guias (espelho operável do manifesto em código) ──────────────
-- O código continua a ser a fonte única; esta tabela permite desativar uma
-- rota em produção sem esperar por um deploy.
CREATE TABLE IF NOT EXISTS public.guide_partner_routes (
  guide_slug      text PRIMARY KEY,
  guide_version   text NOT NULL,
  topic           text NOT NULL,
  intent          text NOT NULL,
  audience        text[] NOT NULL DEFAULT '{}',
  destination_key text NOT NULL,
  data_mode       text NOT NULL CHECK (data_mode IN ('NO_DATA', 'CONSENTED_HANDOFF', 'CONNECTED_ACCOUNT')),
  required_scopes text[] NOT NULL DEFAULT '{}',
  copy_key        text NOT NULL,
  enabled         boolean NOT NULL DEFAULT false,
  reviewed_at     timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.partner_connections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_handoffs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_partner_routes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- O utilizador vê a SUA ligação. Os tokens cifrados nunca são
  -- selecionados pelo cliente: as rotas de API leem-nos com service role.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'partner_connections' AND policyname = 'partner_connections_own'
  ) THEN
    CREATE POLICY "partner_connections_own" ON public.partner_connections
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  -- Só o utilizador pode desligar a própria conta.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'partner_connections' AND policyname = 'partner_connections_own_delete'
  ) THEN
    CREATE POLICY "partner_connections_own_delete" ON public.partner_connections
      FOR DELETE USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'partner_handoffs' AND policyname = 'partner_handoffs_own'
  ) THEN
    CREATE POLICY "partner_handoffs_own" ON public.partner_handoffs
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  -- Direito de eliminar um handoff pendente (ponto 8.3 da arquitetura).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'partner_handoffs' AND policyname = 'partner_handoffs_own_delete'
  ) THEN
    CREATE POLICY "partner_handoffs_own_delete" ON public.partner_handoffs
      FOR DELETE USING (user_id = auth.uid());
  END IF;

  -- Catálogo de rotas: leitura pública (não tem dados pessoais), escrita só
  -- por service role.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'guide_partner_routes' AND policyname = 'guide_partner_routes_leitura'
  ) THEN
    CREATE POLICY "guide_partner_routes_leitura" ON public.guide_partner_routes
      FOR SELECT USING (true);
  END IF;
END $$;

-- `partner_events` fica SEM políticas: com RLS ativo e nenhuma política,
-- nenhum papel autenticado ou anónimo lê ou escreve. Só o service role
-- (que ignora RLS) processa a fila. É intencional.

-- ── Higiene ────────────────────────────────────────────────────────────────
-- Handoffs expirados deixam de ser utilizáveis e o payload já não existe do
-- nosso lado (só guardámos o hash). Marcar o estado mantém a auditoria.
CREATE OR REPLACE FUNCTION public.expirar_handoffs_pendentes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  afetados integer;
BEGIN
  UPDATE public.partner_handoffs
     SET status = 'expired'
   WHERE status = 'pending'
     AND expires_at < now();
  GET DIAGNOSTICS afetados = ROW_COUNT;
  RETURN afetados;
END;
$$;

REVOKE ALL ON FUNCTION public.expirar_handoffs_pendentes() FROM PUBLIC;
