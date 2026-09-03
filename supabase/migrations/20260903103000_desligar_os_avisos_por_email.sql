-- 20260903103000_desligar_os_avisos_por_email.sql
-- ═══════════════════════════════════════════════════════════════════════
--  TODOS OS EMAILS PROMETIAM UM INTERRUPTOR QUE NÃO EXISTIA
--  ---------------------------------------------------------------------
--  O rodapé de cada aviso diz «Gerir ou desligar os avisos» e aponta para
--  `URL_GERIR_AVISOS`, que é `/dashboard/conta`. E a página de conta não
--  tem — nunca teve — nada que desligue avisos nenhuns. O cabeçalho
--  `List-Unsubscribe` que `email/send.ts` escreve aponta para o mesmo
--  sítio: um endereço que o Gmail e o Yahoo apresentam como «cancelar
--  subscrição» e que abre uma página onde não há o que cancelar.
--
--  Não é uma questão de conformidade só: um sistema de avisos sem
--  interruptor obriga quem quer menos email a marcar-nos como spam, que é
--  a única alavanca que lhe resta. A caixa de entrada aprende, e o aviso
--  que interessa mesmo — o do limite do IVA — deixa de chegar a toda a
--  gente por causa disso.
--
--  ── UM interruptor, e é do EMAIL ───────────────────────────────────
--
--  Uma matriz de categorias × canais seria mais fina e seria pior: obriga
--  a decidir treze coisas para resolver uma, e a mais provável é ficar
--  tudo como está. Há um botão: os avisos saem por email, ou não saem.
--
--  O SINO NÃO SE DESLIGA, e é de propósito. É a superfície do produto —
--  o sítio onde se vai VER se aconteceu alguma coisa — e desligá-la seria
--  desligar a funcionalidade, não o incómodo. O que interrompe o dia de
--  alguém é o email; é esse que tem o interruptor.
--
--  ── Desligar desliga AGORA ─────────────────────────────────────────
--
--  Não bastava o gatilho: as linhas já marcadas `por_enviar` continuariam
--  a sair depois de alguém carregar no botão, e o primeiro email a chegar
--  depois de desligar é o que faz a pessoa desistir de nós. Por isso a
--  preferência entra também em `avisos_email_reclamar`, que é quem tira
--  da fila.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. A preferência ────────────────────────────────────────────────
--
-- Sem linha = ligado. É o que faz a tabela crescer só com quem decidiu
-- alguma coisa, em vez de uma linha por conta criada — e é o que evita
-- ter de escrever a preferência no registo, num caminho que já é longo.
CREATE TABLE IF NOT EXISTS public.preferencias_avisos (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_ativo   boolean NOT NULL DEFAULT true,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.preferencias_avisos IS
  'Se os avisos desta conta saem por email. Sem linha, saem. O sino não se desliga: é a superfície do produto, não a interrupção.';

ALTER TABLE public.preferencias_avisos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "preferencias_avisos_dono_le" ON public.preferencias_avisos;
CREATE POLICY "preferencias_avisos_dono_le" ON public.preferencias_avisos
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "preferencias_avisos_dono_cria" ON public.preferencias_avisos;
CREATE POLICY "preferencias_avisos_dono_cria" ON public.preferencias_avisos
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "preferencias_avisos_dono_muda" ON public.preferencias_avisos;
CREATE POLICY "preferencias_avisos_dono_muda" ON public.preferencias_avisos
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- O mesmo instrumento das outras tabelas desta plataforma: grant por
-- coluna. `atualizado_em` é do servidor — deixá-lo escrever-se do browser
-- dava um carimbo que diz o que quem o escreve quiser, e é ele que serve
-- para responder «desde quando é que esta conta não recebe emails».
REVOKE ALL ON public.preferencias_avisos FROM anon, authenticated;
GRANT SELECT ON public.preferencias_avisos TO authenticated;
GRANT INSERT (user_id, email_ativo) ON public.preferencias_avisos TO authenticated;
GRANT UPDATE (email_ativo) ON public.preferencias_avisos TO authenticated;

CREATE OR REPLACE FUNCTION public.preferencias_avisos_carimbo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.preferencias_avisos_carimbo()
  FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS preferencias_avisos_carimbo ON public.preferencias_avisos;
CREATE TRIGGER preferencias_avisos_carimbo
  BEFORE INSERT OR UPDATE ON public.preferencias_avisos
  FOR EACH ROW EXECUTE FUNCTION public.preferencias_avisos_carimbo();


-- ── 2. Quem pergunta pela preferência ───────────────────────────────
--
-- `SECURITY DEFINER` porque quem pergunta é o gatilho, que corre na
-- transação de quem escreveu o facto — e essa pessoa não é a dona da
-- preferência. Sem isto, a política de leitura escondia a linha do
-- destinatário e todos os avisos saíam por email.
CREATE OR REPLACE FUNCTION public.avisos_por_email_ativos(p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT p.email_ativo FROM public.preferencias_avisos p WHERE p.user_id = p_user),
    true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.avisos_por_email_ativos(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.avisos_por_email_ativos(uuid) TO service_role;

COMMENT ON FUNCTION public.avisos_por_email_ativos(uuid) IS
  'Se esta conta recebe avisos por email. Sem preferência guardada, recebe.';


-- ── 3. O gatilho da fila passa a perguntar ──────────────────────────
--
-- A decisão continua a ser de um sítio só (`aviso_merece_email`), e ganha
-- uma segunda condição que é da PESSOA e não do tipo. As duas têm de
-- ficar juntas: separá-las dava um estado `por_enviar` para quem desligou,
-- e a fila a olhar todos os quinze minutos para uma linha que nunca sai.
CREATE OR REPLACE FUNCTION public.aviso_marca_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.email_estado := CASE
    WHEN public.aviso_merece_email(NEW.tipo)
     AND public.avisos_por_email_ativos(NEW.user_id)
    THEN 'por_enviar' ELSE 'dispensado' END;
  NEW.email_tentativas := 0;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.aviso_marca_email() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS aviso_marca_email ON public.notificacoes;
CREATE TRIGGER aviso_marca_email
  BEFORE INSERT ON public.notificacoes
  FOR EACH ROW EXECUTE FUNCTION public.aviso_marca_email();


-- ── 4. E a fila também, à saída ─────────────────────────────────────
--
-- Sem isto, desligar só valia para os avisos SEGUINTES: o que já estava
-- em fila saía na mesma, e o primeiro email a chegar depois de alguém
-- carregar no interruptor é o que faz essa pessoa carregar em «spam».
--
-- O resto da função fica exatamente como estava na 047 — a reclamação com
-- `SKIP LOCKED`, o resgate dos `a_enviar` mortos aos quinze minutos e o
-- teto das três tentativas. Só se acrescenta a condição.
CREATE OR REPLACE FUNCTION public.avisos_email_reclamar(p_limite integer DEFAULT 50)
RETURNS TABLE (id uuid, para text, titulo text, corpo text, url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH escolhidas AS (
    SELECT n.id FROM public.notificacoes n
     WHERE (n.email_estado = 'por_enviar'
            OR (n.email_estado = 'a_enviar' AND n.email_em < now() - interval '15 minutes'))
       AND n.email_tentativas < 3
       AND public.avisos_por_email_ativos(n.user_id)
     ORDER BY n.criado_em
     LIMIT greatest(1, least(p_limite, 200))
     FOR UPDATE SKIP LOCKED
  ),
  reclamadas AS (
    UPDATE public.notificacoes n
       SET email_estado = 'a_enviar',
           email_tentativas = n.email_tentativas + 1,
           email_em = now()
      FROM escolhidas e
     WHERE n.id = e.id
    RETURNING n.id, n.user_id, n.titulo, n.corpo, n.url
  )
  SELECT r.id, u.email::text, r.titulo, r.corpo, r.url
    FROM reclamadas r
    JOIN auth.users u ON u.id = r.user_id
   WHERE u.email IS NOT NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.avisos_email_reclamar(integer)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.avisos_email_reclamar(integer) TO service_role;


-- ── 5. E o Guardião Fiscal, que não passa pela fila ─────────────────
--
-- `/api/email/guardiao` chama o Resend diretamente (tem template próprio e
-- livro de registo próprio, em `alertas_guardiao`). A rota lê esta função
-- em lote antes de enviar — ver o comentário lá. Fica aqui a versão para
-- muitos, para não fazer uma consulta por pessoa num cron de mil.
CREATE OR REPLACE FUNCTION public.contas_com_avisos_por_email(p_users uuid[])
RETURNS TABLE (user_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT u FROM unnest(coalesce(p_users, '{}'::uuid[])) AS u
   WHERE public.avisos_por_email_ativos(u);
$$;

REVOKE EXECUTE ON FUNCTION public.contas_com_avisos_por_email(uuid[])
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.contas_com_avisos_por_email(uuid[]) TO service_role;
