-- 20260904140000_dossie_fecha_privilegios_de_anon.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O PRIVILÉGIO SAI, NÃO SÓ A POLÍTICA
--  ---------------------------------------------------------------------
--  As cinco tabelas do motor de dossiê nasceram certas no que importa:
--  RLS ligado, e nenhuma política que inclua `anon`. Com RLS ligado e
--  sem política, não há caminho — o `anon` não lê nem escreve nada.
--
--  Mas ficaram com os privilégios de tabela que o Supabase concede por
--  omissão a `anon` no esquema `public` (SELECT, INSERT, e num caso
--  UPDATE). Hoje isso é inofensivo. O problema é o dia em que alguém
--  acrescentar uma política para `public` — que inclui `anon` — a pensar
--  que está a abrir uma coluna a utilizadores autenticados. Nesse dia, o
--  privilégio que ficou aqui é a diferença entre uma política mal escrita
--  e uma fuga.
--
--  É a mesma lição da migração 038 e do contrato público de contactos, e
--  lá está escrita em duas linhas que este ficheiro se limita a aplicar:
--
--    «anon não tem UPDATE — o privilégio SAIU, não só a política.»
--    «Um USING errado um dia abre-se; o que não existe não se abre por
--     engano.»
--
--  Defesa em profundidade, portanto: a política é a fechadura, o
--  privilégio é a porta. Tirar as duas custa esta migração.
--
--  ⚠️ NÃO se mexe em `authenticated` nem em `service_role`. Toda a
--  leitura pública de um dossiê (a rota `/d/[id]`) passa por
--  `abrir_dossie_por_token`, que é SECURITY DEFINER e corre com a chave
--  de serviço — nunca precisou de privilégio de `anon` na tabela, e por
--  isso nada disto lhe toca.
--
--  Idempotente — seguro correr múltiplas vezes.
-- ═══════════════════════════════════════════════════════════════════════

REVOKE ALL ON TABLE public.caso_dossies        FROM anon;
REVOKE ALL ON TABLE public.dossie_ligacoes     FROM anon;
REVOKE ALL ON TABLE public.dossie_acessos      FROM anon;
REVOKE ALL ON TABLE public.dossie_pedidos      FROM anon;
REVOKE ALL ON TABLE public.dossie_pedido_itens FROM anon;

-- ── A guarda ────────────────────────────────────────────────────────
--
-- Sem isto, a migração seria uma boa intenção: o `REVOKE` corre, e uma
-- concessão futura — um `GRANT ALL ... TO anon` distraído, ou o
-- assistente de uma ferramenta — repunha o privilégio sem ninguém dar
-- por isso. A asserção falha a aplicação e é o mesmo padrão que
-- `assert_contrato_publico_contabilistas()` já usa para o diretório.
DO $verificacao$
DECLARE
  sobras text;
BEGIN
  SELECT string_agg(format('%s:%s', g.table_name, g.privilege_type), ', '
                    ORDER BY g.table_name, g.privilege_type)
    INTO sobras
    FROM information_schema.role_table_grants g
   WHERE g.table_schema = 'public'
     AND g.grantee = 'anon'
     AND g.table_name IN ('caso_dossies', 'dossie_ligacoes', 'dossie_acessos',
                          'dossie_pedidos', 'dossie_pedido_itens');

  IF sobras IS NOT NULL THEN
    RAISE EXCEPTION 'anon ainda tem privilégios nas tabelas de dossiê: %', sobras;
  END IF;

  -- E o que TEM de continuar a existir, continua: sem isto, uma migração
  -- que fechasse a porta a mais gente do que devia passava neste teste.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND table_name = 'dossie_ligacoes'
       AND grantee = 'authenticated' AND privilege_type = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'authenticated perdeu o SELECT em dossie_ligacoes — o revoke foi longe demais';
  END IF;

  -- RLS continua a ser a primeira linha, e não é substituída por isto.
  IF EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname IN ('caso_dossies', 'dossie_ligacoes', 'dossie_acessos',
                         'dossie_pedidos', 'dossie_pedido_itens')
       AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'alguma tabela de dossiê ficou sem RLS';
  END IF;
END
$verificacao$;

COMMENT ON TABLE public.dossie_ligacoes IS
  'Ligações opacas para o contabilista que está fora da plataforma. Guarda o sha-256 do token, nunca o token. `anon` não tem política nem privilégio: a leitura pública passa por `abrir_dossie_por_token`, com a chave de serviço.';
