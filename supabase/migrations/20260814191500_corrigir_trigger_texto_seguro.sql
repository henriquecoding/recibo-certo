-- Corrige a fronteira anti-código do painel profissional.
--
-- `rejeitar_codigo_painel()` é uma trigger function e não é uma RPC pública.
-- A versão anterior executava como INVOKER e chamava o helper
-- `painel_texto_tem_codigo(text)`, cujo EXECUTE foi corretamente revogado a
-- anon/authenticated. Num UPDATE legítimo feito pelo browser, a trigger era
-- executada mas a chamada ao helper falhava com "permission denied".
--
-- A trigger passa a SECURITY DEFINER, com search_path vazio e referências
-- totalmente qualificadas. Mantemos EXECUTE revogado aos papéis da API, pelo
-- que não se transforma numa operação privilegiada invocável por PostgREST.
-- RLS, triggers existentes e a regra anti-HTML/script não são removidos.

CREATE OR REPLACE FUNCTION public.rejeitar_codigo_painel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  i integer;
  campo text;
  valor text;
BEGIN
  IF TG_NARGS = 0 THEN
    RETURN NEW;
  END IF;

  FOR i IN 0..TG_NARGS - 1 LOOP
    campo := TG_ARGV[i];
    valor := pg_catalog.to_jsonb(NEW) ->> campo;

    IF public.painel_texto_tem_codigo(valor) THEN
      RAISE EXCEPTION 'O campo "%" não aceita código, HTML ou scripts.', campo
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- A função só é chamada por triggers já instalados. Não expor como RPC.
REVOKE ALL ON FUNCTION public.rejeitar_codigo_painel() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rejeitar_codigo_painel() TO service_role;

-- O helper continua privado para os papéis da API; a trigger, agora executada
-- como o owner postgres, consegue chamá-lo sem abrir uma superfície RPC.
REVOKE ALL ON FUNCTION public.painel_texto_tem_codigo(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.painel_texto_tem_codigo(text) TO service_role;
