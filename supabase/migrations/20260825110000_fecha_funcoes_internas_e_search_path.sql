-- 20260825110000_fecha_funcoes_internas_e_search_path.sql
--
-- Duas superfícies diferentes, duas correções explícitas:
--
--  1. funções constantes, SECURITY INVOKER, tinham `search_path` herdado;
--     como não resolvem objeto nenhum, o caminho vazio é suficiente;
--  2. funções que só existem para triggers herdaram EXECUTE de PUBLIC e
--     apareciam como RPC para anon/authenticated. O trigger não precisa
--     dessa concessão e continua a executá-las depois da revogação.
--
-- Não altera `contabilistas_publico`: a view corre como o papel NOLOGIN
-- `contrato_publico`, sem BYPASSRLS, contra três políticas de leitura
-- próprias. É uma fronteira deliberada e verificada pela função
-- `assert_contrato_publico_contabilistas()`.

BEGIN;

ALTER FUNCTION public.nome_do_segredo_url()       SET search_path = '';
ALTER FUNCTION public.nome_do_segredo_cron()      SET search_path = '';
ALTER FUNCTION public.nome_do_agendamento_avisos() SET search_path = '';
ALTER FUNCTION public.lugares_fundadores_total()  SET search_path = '';
ALTER FUNCTION public.comissao_fundador_bps()     SET search_path = '';
ALTER FUNCTION public.agenda_antecedencia_horas() SET search_path = '';
ALTER FUNCTION public.agenda_janela_dias()        SET search_path = '';
ALTER FUNCTION public.limite_partilhas_dia()      SET search_path = '';
ALTER FUNCTION public.aviso_merece_email(text)    SET search_path = '';
ALTER FUNCTION public.conjuntos_todos()           SET search_path = '';
ALTER FUNCTION public.teto_de_encaminhamentos()   SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.aviso_candidatura_decidida()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aviso_marca_email()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aviso_mensagem_nova()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aviso_partilha_nova()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aviso_vinculo_novo()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.encaminhamentos_dentro_do_teto()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fundador_ao_aprovar()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.manifesto_imutavel()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mensagem_corpo_imutavel()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.partilhas_dentro_do_limite_diario() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proposta_avisa_e_atualiza_caso()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proposta_imutavel()                 FROM PUBLIC, anon, authenticated;

DO $verificacao$
DECLARE
  assinatura regprocedure;
BEGIN
  FOREACH assinatura IN ARRAY ARRAY[
    'public.aviso_candidatura_decidida()'::regprocedure,
    'public.aviso_marca_email()'::regprocedure,
    'public.aviso_mensagem_nova()'::regprocedure,
    'public.aviso_partilha_nova()'::regprocedure,
    'public.aviso_vinculo_novo()'::regprocedure,
    'public.encaminhamentos_dentro_do_teto()'::regprocedure,
    'public.fundador_ao_aprovar()'::regprocedure,
    'public.manifesto_imutavel()'::regprocedure,
    'public.mensagem_corpo_imutavel()'::regprocedure,
    'public.partilhas_dentro_do_limite_diario()'::regprocedure,
    'public.proposta_avisa_e_atualiza_caso()'::regprocedure,
    'public.proposta_imutavel()'::regprocedure
  ]
  LOOP
    IF has_function_privilege('anon', assinatura, 'EXECUTE')
       OR has_function_privilege('authenticated', assinatura, 'EXECUTE') THEN
      RAISE EXCEPTION 'A função interna % continua exposta como RPC', assinatura;
    END IF;
  END LOOP;
END
$verificacao$;

COMMIT;

