-- 20260824100000_limite_diario_de_partilhas.sql
-- `LIMITE_PARTILHAS_DIA` passa a ser imposto, e não só declarado.
--
-- A constante existia em src/lib/contabilistas/vinculo.ts (20 por cliente
-- e por dia) e era usada nos testes de unidade — mas `partilhar()` escreve
-- diretamente na tabela sem contagem prévia, e a política de INSERT só
-- verifica `cliente_id`, `estado` e vínculo ativo. Alguém com acesso
-- direto à API REST do Supabase podia inundar o painel de um contabilista
-- com partilhas sem limite.
--
-- É um GATILHO e não uma RPC de propósito: uma RPC só protege quem passa
-- por ela, e o caminho REST direto — que é precisamente o do abuso —
-- continuava aberto. O gatilho está em todos os caminhos.
--
-- Não é um risco de fuga de dados (continua a exigir vínculo ativo e
-- sessão autenticada); é o único vetor de abuso na camada de escrita.
--
-- Idempotente.

/* O limite vive aqui, e não num ecrã: um teto que vive na interface é uma
   sugestão. O espelho em JavaScript é `LIMITE_PARTILHAS_DIA`. */
CREATE OR REPLACE FUNCTION public.limite_partilhas_dia() RETURNS integer
LANGUAGE sql IMMUTABLE AS $$ SELECT 20 $$;

CREATE OR REPLACE FUNCTION public.partilhas_dentro_do_limite_diario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.partilhas p
   WHERE p.cliente_id = NEW.cliente_id
     AND p.criado_em >= date_trunc('day', now());

  IF n >= public.limite_partilhas_dia() THEN
    RAISE EXCEPTION 'Já enviaste % simulações hoje. Tenta amanhã.',
      public.limite_partilhas_dia()
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partilhas_dentro_do_limite_diario ON public.partilhas;
CREATE TRIGGER partilhas_dentro_do_limite_diario
  BEFORE INSERT ON public.partilhas
  FOR EACH ROW EXECUTE FUNCTION public.partilhas_dentro_do_limite_diario();
