-- ═══════════════════════════════════════════════════════════════════════
--  Tokens da ligação FIZ: a revogação de 023 não revogava nada
--  ---------------------------------------------------------------------
--  A migração 023 escreveu:
--
--    REVOKE SELECT (access_token_ciphertext, refresh_token_ciphertext)
--      ON public.partner_connections FROM authenticated, anon;
--
--  e ficou-se por aí. Isso não fecha a porta, porque no PostgreSQL os
--  privilégios SOMAM-SE: um REVOKE ao nível da COLUNA só retira uma
--  concessão feita ao nível da coluna. Não subtrai nada a um `GRANT SELECT`
--  feito à TABELA inteira — e é exatamente esse que o Supabase dá a `anon` e
--  `authenticated` no schema `public`, e de que a política
--  `partner_connections_own` precisa para servir de alguma coisa.
--
--  Resultado prático: qualquer sessão autenticada continuava a poder fazer
--    select access_token_ciphertext from partner_connections
--  a partir do browser, com a chave anónima, sobre as suas próprias linhas.
--  Ou seja, a 023 declarava uma garantia que não tinha — que é precisamente
--  o defeito que ela própria dizia estar a corrigir na 022.
--
--  A ordem correta é a inversa: tirar o privilégio à tabela e devolvê-lo
--  coluna a coluna, deixando as duas de fora. O que não for concedido não é
--  legível, e uma coluna nova que apareça amanhã fica de fora por omissão —
--  o padrão seguro, porque exige uma decisão para passar a ser visível.
--
--  O conteúdo é AES-256-GCM e a chave nunca sai do servidor, por isso não
--  havia fuga aproveitável nem agora nem antes. Mas a diferença entre «o
--  atacante precisa do service role» e «basta uma sessão de utilizador»
--  continua a valer tudo no dia em que a chave escapar.
--
--  O `service_role` não é afetado: ignora a RLS e tem os seus próprios
--  privilégios. É por lá que as rotas de API leem os tokens.
-- ═══════════════════════════════════════════════════════════════════════

REVOKE SELECT ON public.partner_connections FROM authenticated, anon;

-- Devolve-se a leitura coluna a coluna. Lista explícita, sem as duas de
-- cifra: é a enumeração que faz a garantia, não o REVOKE.
GRANT SELECT (
  id,
  user_id,
  partner,
  partner_user_id,
  scopes,
  token_expires_at,
  status,
  connected_at,
  revoked_at,
  last_synced_at
) ON public.partner_connections TO authenticated;

-- `anon` não tem nada que ler ligações de ninguém: a política já exige
-- `user_id = auth.uid()`, e sem sessão não há `auth.uid()`. Fica sem SELECT
-- nenhum, para o privilégio dizer o mesmo que a política.

-- A escrita dos tokens é do servidor. Mesmo raciocínio: revoga-se à tabela e
-- não se devolve nada nestas colunas.
REVOKE INSERT, UPDATE ON public.partner_connections FROM authenticated, anon;

COMMENT ON COLUMN public.partner_connections.access_token_ciphertext IS
  'AES-256-GCM. Sem SELECT/INSERT/UPDATE para authenticated/anon — o GRANT por coluna (026) não os inclui. Só service role.';
COMMENT ON COLUMN public.partner_connections.refresh_token_ciphertext IS
  'AES-256-GCM. Sem SELECT/INSERT/UPDATE para authenticated/anon — o GRANT por coluna (026) não os inclui. Só service role.';
