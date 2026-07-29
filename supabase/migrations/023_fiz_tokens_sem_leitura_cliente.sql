-- ═══════════════════════════════════════════════════════════════════════
--  Tokens da ligação FIZ: sem leitura pelo cliente
--  ---------------------------------------------------------------------
--  A migração 022 criou a política `partner_connections_own`, com este
--  comentário: "os tokens cifrados nunca são selecionados pelo cliente".
--  A intenção estava certa; a garantia não existia.
--
--  RLS é ao nível da LINHA, não da coluna. Com `FOR SELECT USING (user_id =
--  auth.uid())`, qualquer sessão autenticada podia ler as suas próprias
--  colunas `access_token_ciphertext` e `refresh_token_ciphertext`
--  diretamente do browser, com a chave anónima.
--
--  Na prática o conteúdo é AES-256-GCM e a chave nunca sai do servidor, por
--  isso não havia fuga aproveitável. Mas a política deve dizer a verdade, e
--  se um dia a chave de cifra escapar, a diferença entre "o atacante precisa
--  do service role" e "basta uma sessão de utilizador" é toda.
--
--  O Postgres permite privilégios por coluna, e compõem-se com a RLS: a
--  linha continua visível, aquelas duas colunas não. As rotas de API leem-nas
--  com o service role, que ignora ambos.
-- ═══════════════════════════════════════════════════════════════════════

REVOKE SELECT (access_token_ciphertext, refresh_token_ciphertext)
  ON public.partner_connections
  FROM authenticated, anon;

-- Idem para a escrita: quem gere tokens é o servidor, nunca o cliente.
REVOKE INSERT (access_token_ciphertext, refresh_token_ciphertext)
  ON public.partner_connections
  FROM authenticated, anon;

REVOKE UPDATE (access_token_ciphertext, refresh_token_ciphertext)
  ON public.partner_connections
  FROM authenticated, anon;

COMMENT ON COLUMN public.partner_connections.access_token_ciphertext IS
  'AES-256-GCM. Sem SELECT para authenticated/anon — só service role (ver 023).';
COMMENT ON COLUMN public.partner_connections.refresh_token_ciphertext IS
  'AES-256-GCM. Sem SELECT para authenticated/anon — só service role (ver 023).';
