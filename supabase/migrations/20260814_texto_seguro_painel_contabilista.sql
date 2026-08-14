-- 20260814_texto_seguro_painel_contabilista.sql
-- Defesa em profundidade para todo o texto escrito na plataforma profissional.
--
-- A interface já trata conteúdo como TEXTO (React escapa por omissão) e passa
-- a rejeitar código antes de uma submissão. Isso não pode ser a fronteira de
-- segurança: alguém pode falar diretamente com o PostgREST usando a própria
-- sessão. A base repete a regra, tal como `site_feedback` já fazia desde a
-- migração 018.
--
-- Não apaga, transforma nem reescreve dados existentes. Só recusa INSERT/UPDATE
-- futuro quando um campo editável contém uma assinatura executável/markup.
-- As policies RLS existentes não mudam.

CREATE OR REPLACE FUNCTION public.painel_texto_tem_codigo(p_texto text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT COALESCE(
    p_texto ~* '</?[A-Za-z!][^>]*>'
    OR p_texto ~* '<[[:space:]]*script'
    OR p_texto ~* 'javascript[[:space:]]*:'
    OR p_texto ~* 'vbscript[[:space:]]*:'
    OR p_texto ~* 'on[A-Za-z]+[[:space:]]*='
    OR p_texto ~* 'data[[:space:]]*:[[:space:]]*text/html'
    OR p_texto ~* 'srcdoc[[:space:]]*='
    OR p_texto ~ '\{\{'
    OR p_texto ~ '<%',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.rejeitar_codigo_painel()
RETURNS trigger
LANGUAGE plpgsql
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

-- Estas funções existem para triggers, não como RPC pública.
REVOKE ALL ON FUNCTION public.painel_texto_tem_codigo(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rejeitar_codigo_painel() FROM PUBLIC, anon, authenticated;

-- Perfil profissional e candidatura.
DROP TRIGGER IF EXISTS trg_texto_seguro_contabilistas ON public.contabilistas;
CREATE TRIGGER trg_texto_seguro_contabilistas
  BEFORE INSERT OR UPDATE ON public.contabilistas
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
    'nome', 'occ', 'bio', 'concelho', 'email_contacto', 'telefone', 'website'
  );

DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_pedidos ON public.contabilista_pedidos;
CREATE TRIGGER trg_texto_seguro_contabilista_pedidos
  BEFORE INSERT OR UPDATE ON public.contabilista_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
    'nome', 'email_contacto', 'telefone', 'mensagem', 'credenciais', 'motivo_decisao'
  );

-- Relação contabilista/cliente e conversa.
DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_vinculos ON public.contabilista_vinculos;
CREATE TRIGGER trg_texto_seguro_contabilista_vinculos
  BEFORE INSERT OR UPDATE ON public.contabilista_vinculos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
    'mensagem', 'nome_cliente', 'email_cliente'
  );

DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_mensagens ON public.contabilista_mensagens;
CREATE TRIGGER trg_texto_seguro_contabilista_mensagens
  BEFORE INSERT OR UPDATE ON public.contabilista_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('corpo');

DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_anexos ON public.contabilista_anexos;
CREATE TRIGGER trg_texto_seguro_contabilista_anexos
  BEFORE INSERT OR UPDATE ON public.contabilista_anexos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('nome');

-- Trabalho, agenda e tipos de consulta.
DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_tarefas ON public.contabilista_tarefas;
CREATE TRIGGER trg_texto_seguro_contabilista_tarefas
  BEFORE INSERT OR UPDATE ON public.contabilista_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('titulo', 'notas');

DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_tarefa_passos ON public.contabilista_tarefa_passos;
CREATE TRIGGER trg_texto_seguro_contabilista_tarefa_passos
  BEFORE INSERT OR UPDATE ON public.contabilista_tarefa_passos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('texto');

DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_tipos ON public.contabilista_tipos_consulta;
CREATE TRIGGER trg_texto_seguro_contabilista_tipos
  BEFORE INSERT OR UPDATE ON public.contabilista_tipos_consulta
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('nome', 'descricao');

DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_excecoes ON public.contabilista_excecoes;
CREATE TRIGGER trg_texto_seguro_contabilista_excecoes
  BEFORE INSERT OR UPDATE ON public.contabilista_excecoes
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('motivo');

DROP TRIGGER IF EXISTS trg_texto_seguro_agendamentos ON public.agendamentos;
CREATE TRIGGER trg_texto_seguro_agendamentos
  BEFORE INSERT OR UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('assunto', 'local_ou_ligacao');

DROP TRIGGER IF EXISTS trg_texto_seguro_partilhas ON public.partilhas;
CREATE TRIGGER trg_texto_seguro_partilhas
  BEFORE INSERT OR UPDATE ON public.partilhas
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('titulo', 'nota_cliente');

-- Intermediação de casos: inclui os campos que podem vir de cliente,
-- contabilista ou administração. Estados, enums, referências internas,
-- caminhos de storage e MIME não são texto livre e ficam de fora.
DROP TRIGGER IF EXISTS trg_texto_seguro_casos ON public.casos;
CREATE TRIGGER trg_texto_seguro_casos
  BEFORE INSERT OR UPDATE ON public.casos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
    'nome_completo', 'nif', 'assunto', 'situacao', 'nota_triagem'
  );

DROP TRIGGER IF EXISTS trg_texto_seguro_caso_contactos ON public.caso_contactos;
CREATE TRIGGER trg_texto_seguro_caso_contactos
  BEFORE INSERT OR UPDATE ON public.caso_contactos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('email', 'telefone', 'morada');

DROP TRIGGER IF EXISTS trg_texto_seguro_caso_documentos ON public.caso_documentos;
CREATE TRIGGER trg_texto_seguro_caso_documentos
  BEFORE INSERT OR UPDATE ON public.caso_documentos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('nome');

DROP TRIGGER IF EXISTS trg_texto_seguro_caso_encaminhamentos ON public.caso_encaminhamentos;
CREATE TRIGGER trg_texto_seguro_caso_encaminhamentos
  BEFORE INSERT OR UPDATE ON public.caso_encaminhamentos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel('motivo');

DROP TRIGGER IF EXISTS trg_texto_seguro_caso_mensagens ON public.caso_mensagens;
CREATE TRIGGER trg_texto_seguro_caso_mensagens
  BEFORE INSERT OR UPDATE ON public.caso_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
    'corpo', 'corpo_encaminhado', 'nota_revisao'
  );
