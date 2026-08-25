-- 20260825120000_contadores_publicos_sem_grant_implicito.sql
--
-- Três funções ficaram de fora da limpeza das 11:00, e ficaram por um
-- motivo compreensível: são públicas DE PROPÓSITO. A página de planos
-- mostra quantos lugares vitalícios restam a quem ainda não tem conta, a
-- de candidatura mostra os lugares de fundador, e a janela até à purga é
-- o número que a aplicação lê para dizer quanto tempo há para exportar.
--
-- Serem públicas não é o problema. O problema é COMO chegaram a público:
--
--   GRANT EXECUTE ON FUNCTION public.lugares_vitalicios() TO anon, …;
--
-- sem `REVOKE … FROM PUBLIC` antes. Em PostgreSQL, `EXECUTE` numa função
-- é concedido a `PUBLIC` por omissão — a concessão explícita a `anon` não
-- substitui a implícita, soma-se a ela. Na prática a superfície REST é a
-- mesma, porque só `anon`, `authenticated` e `service_role` lá chegam;
-- mas qualquer papel criado no futuro herda o direito sem ninguém decidir
-- que devia, e é essa herança silenciosa que se corta aqui.
--
-- As migrações de agosto já fazem `REVOKE … FROM PUBLIC` seguido de
-- `GRANT` explícito (ver `contabilista_recebe_pagamentos` na
-- 20260816170000 e `lugares_fundadores` na 20260819100000). Isto põe as
-- três antigas no mesmo padrão, sem lhes mudar o alcance.
--
-- O `search_path` passa de `public` para `''` pela mesma razão que na
-- migração das 11:00: os corpos já qualificam tudo — `public.subscriptions`,
-- `public.lugares_vitalicios_total()` — e as duas constantes não resolvem
-- objeto nenhum. Um caminho vazio deixa de depender do que estiver no
-- `search_path` de quem chama.
--
-- ── PORQUE É QUE ISTO É TODO CONDICIONAL ────────────────────────────
--
-- As três funções nascem nas migrações 035 e 036, que são ANTERIORES à
-- 042 e por isso não entram no ficheiro junto da plataforma de
-- contabilistas — o arreio de RLS aplica esse ficheiro contra um
-- PostgreSQL vazio, onde `lugares_vitalicios()` legitimamente não existe.
-- A primeira versão desta migração assumiu que existiam e rebentou o
-- arreio com «function public.lugares_vitalicios() does not exist».
--
-- Guardar cada instrução atrás de `to_regprocedure(...) IS NOT NULL`
-- resolve as duas situações com o mesmo ficheiro: no projeto real, onde
-- a 035 e a 036 estão aplicadas, endurece; num esquema onde elas não
-- entraram, não faz nada e não mente sobre isso. Uma migração que só
-- funciona quando aplicada na ordem certa a partir do zero é uma
-- migração que o CI não consegue verificar.
--
-- NÃO muda quem consegue chamar o quê. Quem lê a página de planos sem
-- conta continua a ler; o bloco de verificação no fim prova-o.
--
-- Idempotente — seguro correr múltiplas vezes.

BEGIN;

DO $endurecer$
DECLARE
  alvo       text;
  assinatura regprocedure;
  papel      text;
BEGIN
  FOREACH alvo IN ARRAY ARRAY[
    'public.lugares_vitalicios()',
    'public.lugares_vitalicios_total()',
    'public.dias_ate_purga()'
  ]
  LOOP
    assinatura := to_regprocedure(alvo);

    -- A função pode não existir neste esquema. Ver a nota acima.
    IF assinatura IS NULL THEN
      RAISE NOTICE '% não existe neste esquema — nada a endurecer', alvo;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER FUNCTION %s SET search_path = %L', assinatura, '');
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', assinatura);
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role',
      assinatura
    );

    -- ── A prova de que o alcance não mudou ────────────────────────
    --
    -- Revogar de `PUBLIC` e conceder a três papéis nomeados só está certo
    -- se os três continuarem a conseguir executar. Uma migração que
    -- endurece e parte a página de planos é pior do que a herança que
    -- veio corrigir, por isso não se sai daqui sem verificar.
    IF has_function_privilege('public', assinatura, 'EXECUTE') THEN
      RAISE EXCEPTION
        '% continua executável por PUBLIC — a revogação não pegou', assinatura;
    END IF;

    FOREACH papel IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
    LOOP
      -- Num esquema de ensaio os papéis do Supabase podem não existir.
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = papel) THEN
        CONTINUE;
      END IF;
      IF NOT has_function_privilege(papel, assinatura, 'EXECUTE') THEN
        RAISE EXCEPTION
          '% deixou de ser executável por % — os contadores são públicos de propósito',
          assinatura, papel;
      END IF;
    END LOOP;
  END LOOP;
END
$endurecer$;

COMMIT;
