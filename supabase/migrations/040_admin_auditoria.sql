-- 040_admin_auditoria.sql
-- ═══════════════════════════════════════════════════════════════════════
--  REGISTO DE ATOS DE ADMINISTRAÇÃO
--  ---------------------------------------------------------------------
--  Promover alguém a administrador é o ato mais consequente que existe
--  nesta app: dá-lhe a lista de todas as contas. Até agora acontecia sem
--  deixar rasto — não havia forma de responder a «quem fez isto, e
--  quando?». Numa investigação, a ausência de registo é indistinguível
--  da ausência de acesso indevido, e as duas coisas não são iguais.
--
--  O registo é imutável por construção: `anon` e `authenticated` não têm
--  INSERT, UPDATE nem DELETE. Quem escreve é o servidor, com a chave de
--  serviço, depois de já ter validado o token e o papel de quem pediu.
--  A administração LÊ, e mais nada — nem para corrigir, nem para limpar.
--
--  Não guarda conteúdo fiscal. Guarda quem, o quê, sobre quem, quando.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_auditoria (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Quem praticou o ato. ON DELETE SET NULL: se a conta desaparecer, o
  -- registo do ato FICA. Apagar a conta não pode apagar o rasto.
  ator_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ator_email  text,
  acao        text NOT NULL,
  alvo_id     uuid,
  alvo_email  text,
  detalhe     jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip          text,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_auditoria_criado_em_idx
  ON public.admin_auditoria (criado_em DESC);
CREATE INDEX IF NOT EXISTS admin_auditoria_alvo_idx
  ON public.admin_auditoria (alvo_id);

ALTER TABLE public.admin_auditoria ENABLE ROW LEVEL SECURITY;

-- Só leitura, e só para quem administra.
DROP POLICY IF EXISTS "admin_auditoria_leitura" ON public.admin_auditoria;
CREATE POLICY "admin_auditoria_leitura" ON public.admin_auditoria
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Sem políticas de INSERT/UPDATE/DELETE: com RLS ativa e nenhuma política a
-- permitir, ninguém escreve pela API pública. Só a chave de serviço, que a
-- contorna — e que só o servidor tem.
REVOKE INSERT, UPDATE, DELETE ON public.admin_auditoria FROM anon, authenticated;

COMMENT ON TABLE public.admin_auditoria IS
  'Rasto imutável dos atos de administração (quem, o quê, sobre quem, quando). Sem conteúdo fiscal. Escrita só pela chave de serviço; a administração apenas lê.';
