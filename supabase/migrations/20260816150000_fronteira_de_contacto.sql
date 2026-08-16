-- 20260816150000_fronteira_de_contacto.sql
-- ═══════════════════════════════════════════════════════════════════════
--  A FRONTEIRA DE CONTACTO
--  ---------------------------------------------------------------------
--  A migração 043 deu ao cliente a hipótese de dar um email ao contabilista
--  «só se quiseres que ele te possa escrever». Era uma boa intenção com uma
--  consequência que só se vê passado um ano: o canal de acompanhamento
--  passa a ter uma porta lateral, e quem sai por ela leva a relação inteira
--  — sem histórico, sem partilhas revogáveis, sem prova de nada.
--
--  Isto não é uma questão de retenção artificial. É que TUDO o que a
--  plataforma promete ao cliente — a partilha que se revoga, o ficheiro que
--  deixa de abrir quando o acompanhamento termina, o registo do que foi
--  pedido e quando — vale exatamente zero no instante em que a conversa
--  migra para o WhatsApp. A promessa de privacidade e a promessa de canal
--  são a mesma promessa.
--
--  Três decisões, por ordem de dureza:
--
--   1. `email_cliente` DESAPARECE. Não é revogado por policy, não é
--      escondido pela interface, não fica «lá mas sem grant»: a coluna é
--      removida da tabela. Uma coluna que existe é uma coluna que uma RPC
--      futura devolve por distração — e a promessa passa a depender de
--      ninguém se distrair. Ver §4.3 do relatório: por arquitetura, não
--      por promessa.
--
--   2. A RPC de resumo deixa de a declarar. Como a assinatura muda, é
--      DROP e não CREATE OR REPLACE — o PostgreSQL recusa-se, e bem, a
--      trocar o tipo de retorno de uma função existente.
--
--   3. O texto passa a ser examinado. Um email escrito à mão numa mensagem
--      é o mesmo buraco por outro caminho, e a interface não pode ser a
--      fronteira: quem quiser contorná-la fala com o PostgREST. A regra
--      vive aqui, e a interface repete-a antes de submeter só para dar
--      resposta imediata.
--
--  O QUE ISTO NÃO PROMETE
--  ----------------------
--  Um PDF ou uma imagem podem conter um email ou um número, e nada aqui os
--  lê. Enquanto não houver leitura de anexos, a plataforma não pode
--  afirmar — e a interface não afirma — que o contacto é impossível de
--  passar. Diz o que faz: protege o canal escrito.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. A coluna sai da tabela ───────────────────────────────────────
--
-- O gatilho da 046 e o grant por coluna da 047 nomeiam `email_cliente`.
-- Ambos têm de deixar de o nomear ANTES de a coluna cair: um `DROP COLUMN`
-- leva o grant com ele, mas a função em PL/pgSQL só falha quando corre, e
-- falharia na primeira pessoa a terminar um acompanhamento.

CREATE OR REPLACE FUNCTION public.vinculos_tranca_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Terminar leva o nome com ele. A autorização para o ter acabou nesse
  -- instante, e guardá-lo «só por histórico» seria ficar com um dado
  -- pessoal para além do consentimento que o trouxe.
  IF NEW.estado = 'terminado' AND OLD.estado <> 'terminado' THEN
    NEW.nome_cliente := NULL;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.contabilista_id IS DISTINCT FROM OLD.contabilista_id
       OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
       OR NEW.origem IS DISTINCT FROM OLD.origem
       OR NEW.criado_em IS DISTINCT FROM OLD.criado_em THEN
      RAISE EXCEPTION 'As partes de um vínculo não se alteram.';
    END IF;

    IF OLD.estado = 'terminado' AND NEW.estado <> 'terminado' THEN
      RAISE EXCEPTION 'Um acompanhamento terminado não se reabre; pede-se de novo.';
    END IF;

    IF auth.uid() = NEW.cliente_id AND auth.uid() <> NEW.contabilista_id THEN
      IF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado <> 'terminado' THEN
        RAISE EXCEPTION 'O cliente só pode terminar o acompanhamento.';
      END IF;
      IF NEW.mensagem IS DISTINCT FROM OLD.mensagem THEN
        RAISE EXCEPTION 'O recado do pedido não se altera.';
      END IF;
    END IF;

    IF auth.uid() = NEW.contabilista_id THEN
      IF NEW.nome_cliente IS DISTINCT FROM OLD.nome_cliente THEN
        IF NOT (NEW.estado = 'terminado' AND NEW.nome_cliente IS NULL) THEN
          RAISE EXCEPTION 'O nome é dado pelo cliente.';
        END IF;
      END IF;
    END IF;
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.vinculos_tranca_cliente() FROM anon, authenticated, public;

-- O gatilho de texto seguro da 20260814 nomeia a coluna nos argumentos.
--
-- Nomear uma coluna que já não existe não rebentava nada — `to_jsonb(NEW)
-- ->> 'email_cliente'` devolve NULL e a verificação passa ao lado. Mas
-- deixar lá o nome era deixar uma pista falsa para quem lesse a seguir, e
-- as pistas falsas em SQL de segurança pagam-se caras.
--
-- A condição existe porque `rejeitar_codigo_painel` nasce numa migração com
-- nome por data, fora do intervalo que a suíte de RLS aplica. Sem ela, esta
-- migração não corre no arreio de testes — e uma migração que os testes não
-- conseguem aplicar é uma migração que ninguém verifica.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc
     WHERE proname = 'rejeitar_codigo_painel'
       AND pronamespace = 'public'::regnamespace
  ) THEN
    DROP TRIGGER IF EXISTS trg_texto_seguro_contabilista_vinculos
      ON public.contabilista_vinculos;
    CREATE TRIGGER trg_texto_seguro_contabilista_vinculos
      BEFORE INSERT OR UPDATE ON public.contabilista_vinculos
      FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
        'mensagem', 'nome_cliente'
      );
  END IF;
END $$;

-- A RPC de resumo declara a coluna no tipo de retorno.
DROP FUNCTION IF EXISTS public.resumo_clientes_do_contabilista();

-- E agora a coluna pode cair. O grant por coluna cai com ela.
ALTER TABLE public.contabilista_vinculos DROP COLUMN IF EXISTS email_cliente;

-- O que sobra do grant da 047: o nome, e só o nome.
GRANT UPDATE (nome_cliente) ON public.contabilista_vinculos TO authenticated;

COMMENT ON TABLE public.contabilista_vinculos IS
  'A relação entre um cliente e um contabilista. Não guarda, e não pode voltar '
  'a guardar, nenhum canal de contacto do cliente: o acompanhamento acontece '
  'dentro da plataforma, onde é revogável e fica registado.';


-- ── 2. A RPC de resumo, sem a coluna ────────────────────────────────

CREATE FUNCTION public.resumo_clientes_do_contabilista()
RETURNS TABLE (
  vinculo_id            uuid,
  cliente_id            uuid,
  estado                text,
  origem                text,
  criado_em             timestamptz,
  nome_cliente          text,
  mensagem              text,
  consultas_realizadas  integer,
  ultima                timestamptz,
  proxima               timestamptz,
  partilhas             integer,
  partilhas_por_ler     integer,
  cartao_carimbos       integer,
  cartao_meta           integer,
  cartao_desconto_pct   integer,
  cartao_preco_base     integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  WITH quem AS (
    SELECT auth.uid() AS uid
  ),
  vinculos AS (
    SELECT v.*
      FROM public.contabilista_vinculos v, quem
     WHERE v.contabilista_id = quem.uid
       AND quem.uid IS NOT NULL
       AND public.e_contabilista_aprovado(quem.uid)
  ),
  ags AS (
    SELECT
      a.cliente_id,
      COUNT(*) FILTER (WHERE a.estado = 'realizada')::integer AS realizadas,
      MAX(a.inicio) FILTER (WHERE a.estado = 'realizada')     AS ultima,
      MIN(a.inicio) FILTER (
        WHERE a.estado IN ('pedido', 'confirmado') AND a.inicio >= now()
      )                                                        AS proxima
      FROM public.agendamentos a, quem
     WHERE a.contabilista_id = quem.uid
     GROUP BY a.cliente_id
  ),
  pts AS (
    SELECT
      p.cliente_id,
      COUNT(*)::integer                                          AS total,
      COUNT(*) FILTER (WHERE p.estado = 'enviada')::integer      AS por_ler
      FROM public.partilhas p, quem
     WHERE p.contabilista_id = quem.uid
       AND p.estado <> 'revogada'
     GROUP BY p.cliente_id
  ),
  cartoes AS (
    SELECT c.cliente_id, c.carimbos, c.meta, c.desconto_pct, c.preco_base_cents
      FROM public.fidelidade_cartoes c, quem
     WHERE c.contabilista_id = quem.uid
       AND c.completo = false
  )
  SELECT
    v.id, v.cliente_id, v.estado::text, v.origem::text, v.criado_em,
    v.nome_cliente, v.mensagem,
    COALESCE(ags.realizadas, 0),
    ags.ultima,
    ags.proxima,
    COALESCE(pts.total, 0),
    COALESCE(pts.por_ler, 0),
    cartoes.carimbos, cartoes.meta, cartoes.desconto_pct, cartoes.preco_base_cents
    FROM vinculos v
    LEFT JOIN ags     ON ags.cliente_id     = v.cliente_id
    LEFT JOIN pts     ON pts.cliente_id     = v.cliente_id
    LEFT JOIN cartoes ON cartoes.cliente_id = v.cliente_id
   ORDER BY v.criado_em DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.resumo_clientes_do_contabilista() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.resumo_clientes_do_contabilista() TO authenticated;

COMMENT ON FUNCTION public.resumo_clientes_do_contabilista() IS
  'Uma linha por cliente do contabilista autenticado. Não devolve nenhum canal '
  'de contacto — ver migração da fronteira de contacto — e não lê tabelas fiscais (migração 038).';


-- ── 3. O texto também é uma porta ───────────────────────────────────
--
-- O equilíbrio desta função é todo entre dois erros. Deixar passar um
-- número é perder a relação; recusar um NIF é estragar uma conversa
-- legítima e ensinar as pessoas a desconfiar da caixa de texto. O segundo
-- erro é pior, porque acontece a quem não estava a fazer nada de errado.
--
-- Daí a regra central: NÚMEROS SOZINHOS NÃO CHEGAM. Um NIF, um IBAN, uma
-- referência de pagamento e um telemóvel são todos dígitos; o que distingue
-- um contacto é a FORMA de contacto — o indicativo, os separadores, ou a
-- palavra que o apresenta. Um `912345678` cru só é recusado quando nada no
-- texto o apresenta como outra coisa.

CREATE OR REPLACE FUNCTION public.texto_parece_contacto_externo(p_texto text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  s        text;
  m        text[];
  bruto    text;
  digitos  text;
  com_sep  boolean := false;
  cru      boolean := false;
BEGIN
  -- Minúsculas e espaços normalizados. Os separadores FICAM: são eles que
  -- distinguem «912 345 678» de um número de documento.
  s := pg_catalog.lower(
         pg_catalog.regexp_replace(COALESCE(p_texto, ''), '[[:space:]]+', ' ', 'g'));

  -- Os dígitos que já têm dono declarado saem de cena antes da análise. É
  -- assim que um NIF deixa de se parecer com um telemóvel sem que a deteção
  -- de telemóveis tenha de ficar mais fraca.
  s := pg_catalog.regexp_replace(
         s,
         '(nif|nipc|n\.?i\.?f|contribuinte|iban|nib|refer[êe]ncia|ref\.?|entidade|multibanco|mb ?way|fatura|factura|recibo|documento|processo|ap[óo]lice|matr[íi]cula)[^0-9]{0,24}[0-9 .-]{6,34}',
         ' ',
         'g');

  -- ── Email, por extenso ou disfarçado ──────────────────────────────
  IF s ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
     OR s ~ '[a-z0-9._%+-]+ ?[([{] ?(at|arroba) ?[)\]}] ?[a-z0-9-]+\.[a-z]{2,}'
     OR s ~ '[a-z0-9._%+-]+ ?[([{] ?(at|arroba) ?[)\]}] ?[a-z0-9.-]+ ?[([{] ?(dot|ponto) ?[)\]}] ?[a-z]{2,}'
     OR s ~ '[a-z0-9._%+-]+ (at|arroba) [a-z0-9.-]+ ?\.? ?[a-z]{2,}'
     OR s ~ 'mailto ?:' THEN
    RETURN true;
  END IF;

  -- ── Indicativo de país ────────────────────────────────────────────
  IF s ~ '(\+ ?351|00 ?351)[ .-]?[0-9]' OR s ~ 'tel ?: ?[+0-9]' THEN
    RETURN true;
  END IF;

  -- ── Números portugueses de nove dígitos ───────────────────────────
  --
  -- Enumerar agrupamentos («912 345 678», «91 234 5678», «912-345-678»…)
  -- falha sempre num que ninguém se lembrou. Procura-se uma corrida de
  -- nove dígitos com separadores opcionais e normaliza-se. As âncoras
  -- impedem que um número de doze dígitos dê um telemóvel por recorte.
  FOR m IN
    SELECT r FROM pg_catalog.regexp_matches(
      s, '(?<![0-9])([0-9](?:[ .-]?[0-9]){8})(?![0-9])', 'g') AS r
  LOOP
    bruto   := m[1];
    digitos := pg_catalog.regexp_replace(bruto, '[ .-]', '', 'g');
    IF pg_catalog.length(digitos) = 9 AND digitos ~ '^(9[1236]|2[1-9])' THEN
      IF pg_catalog.length(bruto) > 9 THEN com_sep := true; ELSE cru := true; END IF;
    END IF;
  END LOOP;

  -- Com separadores dispensa contexto: é a forma de ditar um número a
  -- alguém. Cru precisa de uma palavra que o apresente como contacto —
  -- sem ela, nove dígitos são só nove dígitos.
  IF com_sep THEN RETURN true; END IF;
  IF cru AND s ~ '(telem[oó]vel|telefone|contacto|contato|whats|wpp|liga|ligar|chama|telefona|sms|n[uú]mero|call)' THEN
    RETURN true;
  END IF;

  -- ── Canais com nome próprio ───────────────────────────────────────
  IF s ~ '\m(whats ?app|whatsap|wpp|telegram|signal|viber|messenger|skype|imessage|facetime)\M'
     OR s ~ '(wa\.me|api\.whatsapp|t\.me/|m\.me/|join\.skype)'
     OR s ~ '(instagram\.com/|facebook\.com/|linkedin\.com/in/|tiktok\.com/@)' THEN
    RETURN true;
  END IF;

  -- ── Convites a sair, sem número à vista ───────────────────────────
  IF s ~ '\m(o|meu) (meu )?(email|e-mail|mail|telem[oó]vel|telefone|contacto|n[uú]mero) (é|e|:) '
     OR s ~ '(manda|envia|escreve|passa|d[áa]|liga)[- ](me )?(um |o |para o |para )?(email|e-mail|mail|whats|sms|telem[oó]vel|telefone)'
     OR s ~ 'fora (da|desta) plataforma'
     OR s ~ '(falamos|continuamos|combinamos) (por|no|pelo) (whats|email|e-mail|telefone|telem[oó]vel)' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.texto_parece_contacto_externo(text) IS
  'Verdadeiro quando o texto oferece um canal de contacto fora da plataforma. '
  'Números com dono declarado (NIF, IBAN, referência, fatura) são retirados '
  'antes da análise — um NIF nunca é lido como telemóvel.';

REVOKE ALL ON FUNCTION public.texto_parece_contacto_externo(text) FROM PUBLIC, anon;
-- O cliente da aplicação não precisa de a chamar: a versão em TypeScript
-- dá a resposta imediata. Fica disponível para quem quiser confirmar a
-- regra a partir da própria sessão, e não revela nada ao devolvê-la.
GRANT EXECUTE ON FUNCTION public.texto_parece_contacto_externo(text) TO authenticated;


CREATE OR REPLACE FUNCTION public.rejeitar_contacto_externo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  i     integer;
  valor text;
BEGIN
  FOR i IN 0..GREATEST(TG_NARGS - 1, 0) LOOP
    EXIT WHEN TG_NARGS = 0;
    valor := pg_catalog.to_jsonb(NEW) ->> TG_ARGV[i];
    IF public.texto_parece_contacto_externo(valor) THEN
      RAISE EXCEPTION
        'Para proteger o acompanhamento, os contactos pessoais não se partilham aqui.'
        USING ERRCODE = '22023', HINT = 'contacto_externo';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.rejeitar_contacto_externo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sem_contacto_externo_mensagens ON public.contabilista_mensagens;
CREATE TRIGGER trg_sem_contacto_externo_mensagens
  BEFORE INSERT OR UPDATE ON public.contabilista_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_contacto_externo('corpo');

-- O recado que abre a relação segue a mesma regra: era o primeiro sítio
-- por onde um número passava, e passava antes de haver conversa nenhuma.
DROP TRIGGER IF EXISTS trg_sem_contacto_externo_vinculos ON public.contabilista_vinculos;
CREATE TRIGGER trg_sem_contacto_externo_vinculos
  BEFORE INSERT OR UPDATE ON public.contabilista_vinculos
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_contacto_externo('mensagem', 'nome_cliente');

-- E a nota que acompanha uma partilha.
DROP TRIGGER IF EXISTS trg_sem_contacto_externo_partilhas ON public.partilhas;
CREATE TRIGGER trg_sem_contacto_externo_partilhas
  BEFORE INSERT OR UPDATE ON public.partilhas
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_contacto_externo('nota');
