-- 20260903090000_o_sino_aceita_o_que_a_producao_escreve.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O SINO RECUSAVA QUATRO DOS AVISOS QUE A PRODUÇÃO ESCREVE — E LEVAVA O
--  FACTO ATRÁS
--  ---------------------------------------------------------------------
--  A lista de tipos aceites por `notificacoes` foi reescrita quatro vezes
--  (044, 20260816160000, 20260817120000, 20260819100000). De cada vez foi
--  copiada à mão, e de cada vez foi copiada a partir da versão anterior —
--  nunca a partir de quem escreve avisos. O resultado, medido contra um
--  PostgreSQL com todas as migrações aplicadas:
--
--      RECUSA  proposta              ← gatilho em `propostas`
--      RECUSA  caso                  ← `lembrar_casos_sem_resposta()`
--      RECUSA  pagamento_recebido    ← `liquidar_pagamento()`
--      RECUSA  patamar_desbloqueado  ← `aplicar_compra_patamar()`
--
--  Isto não é um sino calado. `avisar_utilizador` não apanha exceções, e
--  os quatro sítios que a chamam fazem-no DENTRO da transação que escreve
--  o facto — que é a garantia que a 047 montou de propósito («não há
--  maneira de pedir um aviso sem escrever a linha»). A garantia funciona
--  nos dois sentidos: com a restrição a recusar o aviso, a transação
--  inteira é desfeita e o FACTO também não acontece.
--
--      · enviar uma proposta a um cliente — falha;
--      · liquidar um pagamento vindo da Stripe — falha, e o webhook
--        volta a tentar contra a mesma parede;
--      · aplicar um patamar de comissão comprado — falha;
--      · o cron diário dos casos sem resposta — morre na primeira linha
--        e não lembra ninguém, nem nesse dia nem nunca.
--
--  A 20260825090000 pôs `proposta` e `caso` a merecer email sem os pôr a
--  caber na tabela: metade da correção, e a metade que não se vê.
--
--  ── A segunda deriva, no mesmo sítio ───────────────────────────────
--
--  `aviso_merece_email` foi reescrita pelas mesmas mãos e com o mesmo
--  método. A 20260817120000 acrescentou `consulta_local_mudou` («uma
--  morada que muda na véspera é precisamente o que faz alguém aparecer na
--  porta errada»); a 20260819100000 acrescentou
--  `proposta_desbloqueio_decidida`. A 20260825090000 reescreveu a função
--  a partir da lista de 047 e apagou as duas sem o dizer. Voltam.
--
--  ── A correção não é «acrescentar quatro nomes» ────────────────────
--
--  Acrescentar nomes deixa o método intacto, e o método é o defeito: uma
--  lista copiada à mão em cinco sítios diverge no sexto. A lista passa a
--  nascer de UMA função, e a restrição é FABRICADA a partir dela:
--
--      tipos_de_notificacao()  ──┬─→  notificacoes_tipo_check (catálogo)
--                                └─→  aviso_merece_email()  (subconjunto)
--
--  A restrição continua a ser um `IN (...)` literal no catálogo — nada
--  fica a depender de uma função em tempo de escrita, e um `pg_dump`
--  continua a restaurar sem ordem especial. O que muda é quem a escreve.
--
--  E `assert_tipos_de_notificacao()` recusa a deriva a voltar: compara o
--  que está no catálogo com o que a função diz, e falha se diferirem. É
--  chamada pelos testes e pode ser chamada em produção a qualquer hora.
--
--  O lado do repositório tem o portão gémeo: `npm run avisos:check` lê os
--  tipos que as migrações escrevem, a lista desta função e a união
--  TypeScript, e reprova quando os três discordam.
--
--  ── `guardiao_iva` entra aqui ──────────────────────────────────────
--
--  O Guardião Fiscal existe desde a migração 007 e só sabia mandar email.
--  Passa a acender o sino — é o único aviso deste produto que interessa a
--  quem não tem contabilista na plataforma, ou seja, à quase totalidade
--  de quem cá está.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. A lista, num sítio só ────────────────────────────────────────
--
-- IMMUTABLE porque é uma constante escrita como função. É o que permite
-- usá-la para fabricar a restrição e para a conferir depois.
CREATE OR REPLACE FUNCTION public.tipos_de_notificacao()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ARRAY[
    -- Vínculo com um contabilista
    'vinculo_pedido', 'vinculo_aceite',
    -- Conversa
    'mensagem',
    -- Consultas
    'consulta_pedida', 'consulta_confirmada', 'consulta_cancelada',
    'consulta_local_mudou',
    -- Trabalho partilhado
    'partilha_recebida',
    -- Pedidos dentro da sala de acompanhamento
    'pedido_criado', 'pedido_respondido', 'pedido_concluido',
    -- Casos encaminhados e propostas
    'caso', 'proposta',
    -- Fidelidade, candidatura e progressão do contabilista
    'cupao_ganho', 'candidatura_decidida',
    'patamar_desbloqueado', 'proposta_desbloqueio_decidida',
    -- Dinheiro
    'pagamento_recebido',
    -- Fiscalidade da própria pessoa (não depende de contabilista nenhum)
    'guardiao_iva'
  ]::text[];
$$;

COMMENT ON FUNCTION public.tipos_de_notificacao() IS
  'A lista autoritativa de tipos de aviso. A restrição de `notificacoes.tipo` é fabricada a partir daqui, e `assert_tipos_de_notificacao()` recusa que as duas divirjam.';


-- ── 2. Quais deles interrompem o dia de alguém ──────────────────────
--
-- Subconjunto, e é verificado como tal mais abaixo. Fica de fora o que se
-- lê quando se entra: `mensagem` seria um email por linha de conversa;
-- `partilha_recebida`, `pagamento_recebido`, `patamar_desbloqueado` e os
-- três `pedido_*` são factos, não interrupções.
CREATE OR REPLACE FUNCTION public.tipos_de_notificacao_com_email()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ARRAY[
    'vinculo_pedido', 'vinculo_aceite',
    'consulta_pedida', 'consulta_confirmada', 'consulta_cancelada',
    'consulta_local_mudou',
    'cupao_ganho', 'candidatura_decidida',
    'caso', 'proposta', 'proposta_desbloqueio_decidida',
    'guardiao_iva'
  ]::text[];
$$;

-- Um subconjunto que deixou de o ser é uma fila de emails que nunca sai:
-- `aviso_marca_email` marcaria 'por_enviar' um tipo que a tabela recusa.
DO $$
DECLARE v_fora text[];
BEGIN
  SELECT array_agg(t) INTO v_fora
    FROM unnest(public.tipos_de_notificacao_com_email()) AS t
   WHERE NOT (t = ANY (public.tipos_de_notificacao()));

  IF v_fora IS NOT NULL THEN
    RAISE EXCEPTION 'Tipos com email que não são tipos de aviso: %', v_fora;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.aviso_merece_email(p_tipo text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_tipo = ANY (public.tipos_de_notificacao_com_email());
$$;


-- ── 3. A restrição, fabricada a partir da lista ─────────────────────
--
-- Fabricada como `ARRAY['a', 'b', …]` e não como um literal de array
-- (`'{a,b}'::text[]`) de propósito: é assim que o catálogo a guarda com
-- cada valor entre plicas, e é isso que torna a guarda da secção 4 — e
-- qualquer leitura humana de `pg_get_constraintdef` — legível. Ordenada,
-- para que duas aplicações da mesma lista deem exatamente o mesmo texto.
DO $$
DECLARE v_lista text;
BEGIN
  SELECT string_agg(quote_literal(t), ', ' ORDER BY t)
    INTO v_lista
    FROM unnest(public.tipos_de_notificacao()) AS t;

  ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
  EXECUTE format(
    'ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_tipo_check '
    || 'CHECK (tipo = ANY (ARRAY[%s]::text[]))', v_lista);
END $$;


-- ── 4. A guarda que recusa a deriva a voltar ────────────────────────
--
-- Não confia na função: pergunta ao CATÁLOGO quais os valores que a
-- restrição aceita mesmo, e compara. Uma restrição editada à mão no
-- editor de SQL do Supabase é apanhada por isto.
CREATE OR REPLACE FUNCTION public.assert_tipos_de_notificacao()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_def   text;
  v_falta text[];
  v_sobra text[];
  t       text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_def
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
   WHERE n.nspname = 'public' AND r.relname = 'notificacoes'
     AND c.conname = 'notificacoes_tipo_check';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'notificacoes_tipo_check não existe: qualquer tipo passaria.';
  END IF;

  -- O que a função declara e a restrição não aceita.
  SELECT array_agg(x) INTO v_falta
    FROM unnest(public.tipos_de_notificacao()) AS x
   WHERE position('''' || x || '''' IN v_def) = 0;

  IF v_falta IS NOT NULL THEN
    RAISE EXCEPTION 'A restrição não aceita tipos declarados: %', v_falta;
  END IF;

  -- E o contrário: um tipo na restrição que ninguém declarou. Não é
  -- inofensivo — é exatamente a folga por onde a lista voltaria a crescer
  -- à mão, sem passar pela função que os portões leem.
  FOR t IN
    SELECT DISTINCT (regexp_matches(v_def, '''([a-z_]+)''', 'g'))[1]
  LOOP
    IF NOT (t = ANY (public.tipos_de_notificacao())) THEN
      v_sobra := coalesce(v_sobra, '{}'::text[]) || t;
    END IF;
  END LOOP;

  IF v_sobra IS NOT NULL THEN
    RAISE EXCEPTION 'A restrição aceita tipos que ninguém declarou: %', v_sobra;
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.assert_tipos_de_notificacao() FROM anon, public;

DO $$ BEGIN PERFORM public.assert_tipos_de_notificacao(); END $$;


-- ── 5. A porta única abre-se também ao servidor ─────────────────────
--
-- `avisar_utilizador` estava fechada a toda a gente e alcançável apenas
-- por dentro de outras funções `SECURITY DEFINER`. O Guardião Fiscal corre
-- num cron com a chave de serviço e não tem RPC nenhuma por onde entrar —
-- ficava com duas saídas: um INSERT direto na tabela (que salta o gatilho
-- de estado do email... não salta, mas salta o `left()` dos limites e a
-- validação de destino), ou este grant.
--
-- O grant é a saída certa: continua a haver UMA função que escreve avisos,
-- e continua a ser impossível chamá-la do browser.
GRANT EXECUTE ON FUNCTION public.avisar_utilizador(uuid, text, text, text, text)
  TO service_role;


-- ── 6. O Guardião não repete o mesmo aviso ──────────────────────────
--
-- A migração 007 garante um email por utilizador/nível/ano com uma chave
-- única em `alertas_guardiao`. O sino precisa da mesma garantia, e não a
-- podia ter: `notificacoes` não tem por onde dizer «este aviso é o do
-- nível crítico de 2026». Um índice único parcial sobre o título é frágil;
-- a coluna é honesta.
ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS chave text;

-- Só onde há chave. Os avisos que nascem de transições não têm nenhuma —
-- e não podem passar a ter uma que os deduplique por engano.
CREATE UNIQUE INDEX IF NOT EXISTS notificacoes_chave_idx
  ON public.notificacoes (user_id, chave)
  WHERE chave IS NOT NULL;

-- A coluna é do servidor, como o resto da fila. `GRANT UPDATE (lida_em)`
-- da 047 já a deixa de fora; o REVOKE de INSERT também. Fica dito.
COMMENT ON COLUMN public.notificacoes.chave IS
  'Chave de idempotência de quem escreve o aviso (ex.: «guardiao:2026:critico»). Única por conta. Nula nos avisos que nascem de uma transição, que não se repetem por construção.';

CREATE OR REPLACE FUNCTION public.avisar_utilizador_uma_vez(
  p_destino uuid,
  p_tipo    text,
  p_titulo  text,
  p_corpo   text,
  p_url     text,
  p_chave   text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_destino IS NULL OR p_chave IS NULL THEN RETURN false; END IF;

  INSERT INTO public.notificacoes (user_id, tipo, titulo, corpo, url, chave)
  VALUES (p_destino, p_tipo, left(p_titulo, 200), left(p_corpo, 500), p_url, p_chave)
  ON CONFLICT (user_id, chave) WHERE chave IS NOT NULL DO NOTHING;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.avisar_utilizador_uma_vez(uuid, text, text, text, text, text)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION
  public.avisar_utilizador_uma_vez(uuid, text, text, text, text, text)
  TO service_role;

COMMENT ON FUNCTION public.avisar_utilizador_uma_vez(uuid, text, text, text, text, text) IS
  'Escreve um aviso no máximo uma vez por conta e por chave. Devolve `true` se escreveu. Para quem avisa a partir de um estado contínuo (o Guardião Fiscal) e não de uma transição.';
