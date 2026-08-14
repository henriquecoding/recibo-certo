-- 053_agendador_dos_avisos.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O AGENDADOR DOS AVISOS MUDA DE CASA. O TRABALHO FICA ONDE ESTAVA.
--  ---------------------------------------------------------------------
--  A fila de emails de aviso é esvaziada de quinze em quinze minutos.
--  Quem a acordava era um Cron Job do Vercel, e o Vercel no plano Hobby
--  recusa qualquer expressão que corra mais do que uma vez por dia:
--
--    Hobby accounts are limited to daily cron jobs.
--    This cron expression (*/15 * * * *) would run more than once per day.
--
--  A recusa é do DEPLOYMENT, não do build. Por isso não aparecia um
--  deployment falhado na lista — não chegava a existir deployment nenhum,
--  e a produção ficou parada no commit anterior sem sinal visível.
--
--  Havia duas saídas más e uma boa.
--
--  A primeira má: passar os avisos a uma vez por dia. Funcionava, e um
--  pedido de consulta podia demorar 24 horas a ser anunciado — numa
--  plataforma em que a outra parte está à espera, isso não é um ajuste de
--  configuração, é outra promessa.
--
--  A segunda má: reescrever o envio de emails em PL/pgSQL. A rota já tem
--  fila, reclamação com `SKIP LOCKED`, tentativas contadas, segredo e
--  lotes. Duplicar isso era passar a ter duas implementações e um dia
--  descobrir que divergiram.
--
--  A boa, e é esta: trocar SÓ O AGENDADOR. O `pg_cron` acorda de quinze em
--  quinze minutos e o `pg_net` faz o pedido HTTP à mesma rota, com o mesmo
--  segredo. Nada do que decide o que é enviado muda de sítio.
--
--      pg_cron (*/15)  →  pg_net  →  /api/cron/avisos-email  →  Resend
--
--  O segredo NÃO está aqui. Está no Vault, e esta migração lê-o pelo nome.
--  Ver a secção 4.
--
--  Idempotente. Correr duas vezes deixa exatamente um trabalho agendado.
--
--  Para ver se correu, junta `cron.job_run_details` a `cron.job` pelo
--  `jobid` — aquela tabela não tem `jobname`, e a consulta óbvia falha com
--  «column does not exist». Ver docs/AGENDADOR-DOS-AVISOS.md.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. As extensões ─────────────────────────────────────────────────
--
-- `pg_cron` vive no schema `cron` por imposição da extensão. `pg_net` vai
-- para `extensions`, que é onde o Supabase põe o que não é da aplicação.
--
-- Num PostgreSQL que não as tenha — o arreio de testes local, por exemplo
-- — a migração segue em frente e diz porquê. Uma migração que rebenta
-- fora de produção é uma migração que deixa de ser exercida por testes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  ELSE
    RAISE NOTICE 'pg_cron indisponível: o agendamento não é criado aqui.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  ELSE
    RAISE NOTICE 'pg_net indisponível: o agendamento não é criado aqui.';
  END IF;
END $$;


-- ── 2. Os nomes dos segredos ────────────────────────────────────────
--
-- Uma função e não uma constante repetida: os nomes são usados na função
-- que dispara e nos testes, e escritos à mão nos dois sítios acabariam
-- por divergir num deles.
CREATE OR REPLACE FUNCTION public.nome_do_segredo_url() RETURNS text
LANGUAGE sql IMMUTABLE AS $$ SELECT 'recibo_certo_cron_url' $$;

CREATE OR REPLACE FUNCTION public.nome_do_segredo_cron() RETURNS text
LANGUAGE sql IMMUTABLE AS $$ SELECT 'recibo_certo_cron_secret' $$;

CREATE OR REPLACE FUNCTION public.nome_do_agendamento_avisos() RETURNS text
LANGUAGE sql IMMUTABLE AS $$ SELECT 'recibo-certo-avisos-email' $$;


-- ── 3. Quem dispara ─────────────────────────────────────────────────
--
-- O `cron.job.command` fica guardado em claro na base de dados. Por isso
-- o comando agendado é uma chamada a esta função, e não o SQL que lê o
-- Vault: assim o que está escrito na tabela do agendador é o nome de uma
-- função, e o segredo nunca aparece — nem sequer o SELECT que lhe chega.
--
-- Não levanta exceção quando falta configuração. Um agendador que rebenta
-- de quinze em quinze minutos enche o registo de erros e esconde os que
-- interessam; um aviso é lido por quem for ver, e a fila fica intacta à
-- espera da configuração.
CREATE OR REPLACE FUNCTION public.disparar_avisos_email()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_url    text;
  v_segredo text;
  v_pedido bigint;
BEGIN
  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = public.nome_do_segredo_url();
  SELECT decrypted_secret INTO v_segredo
    FROM vault.decrypted_secrets WHERE name = public.nome_do_segredo_cron();

  IF v_url IS NULL OR v_segredo IS NULL THEN
    RAISE WARNING
      'Avisos por email: falta % ou % no Vault. A fila fica intacta.',
      public.nome_do_segredo_url(), public.nome_do_segredo_cron();
    RETURN NULL;
  END IF;

  -- Assíncrono por natureza: `net.http_get` devolve um id e a resposta
  -- aparece depois em `net._http_response`. Não se espera por ela — o
  -- trabalho a sério é do outro lado, e prender uma sessão do agendador
  -- durante um minuto seria pagar duas vezes pelo mesmo.
  -- `net.http_get`, e não `extensions.net.http_get`: o `WITH SCHEMA
  -- extensions` do CREATE EXTENSION põe a EXTENSÃO ali, mas o pg_net cria
  -- as suas funções no schema `net`. Confirmado no projeto antes de
  -- escrever isto — um nome de três partes teria falhado só em produção.
  SELECT net.http_get(
           url := v_url,
           headers := jsonb_build_object(
             'Authorization', 'Bearer ' || v_segredo,
             'User-Agent', 'recibo-certo-agendador'
           ),
           timeout_milliseconds := 60000
         )
    INTO v_pedido;

  RETURN v_pedido;
END;
$$;

-- Ninguém lhe chega a não ser o agendador. Se `authenticated` a pudesse
-- chamar, tinha um botão para disparar o envio de emails à vontade — e,
-- pior, um oráculo para saber se o segredo está configurado.
REVOKE EXECUTE ON FUNCTION public.disparar_avisos_email()
  FROM anon, authenticated, public;

COMMENT ON FUNCTION public.disparar_avisos_email() IS
  'Acorda a rota que esvazia a fila de emails. O segredo vem do Vault e nunca aparece em `cron.job.command` — por isso o comando agendado chama esta função em vez de ler o Vault por inteiro.';


-- ── 4. O agendamento ────────────────────────────────────────────────
--
-- `cron.unschedule` levanta exceção se o trabalho não existir, por isso a
-- remoção é condicionada. E é feita ANTES de agendar, para o resultado ser
-- sempre exatamente um trabalho com este nome — correr esta migração duas
-- vezes não pode deixar dois agendadores a disparar em paralelo.
DO $$
DECLARE v_nome text := public.nome_do_agendamento_avisos();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'Sem pg_cron: o agendamento «%» não foi criado.', v_nome;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_nome) THEN
    PERFORM cron.unschedule(v_nome);
  END IF;

  PERFORM cron.schedule(v_nome, '*/15 * * * *',
                        'SELECT public.disparar_avisos_email();');
END $$;
