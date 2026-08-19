-- 20260818220000_agenda_em_calendarios_externos.sql
-- ═══════════════════════════════════════════════════════════════════════
--  A AGENDA NOS CALENDÁRIOS DE QUEM A USA
--  ---------------------------------------------------------------------
--  Uma consulta marcada aqui só servia para alguma coisa se a pessoa se
--  lembrasse de a copiar para o calendário onde vive o resto do dia dela.
--  Quem não copiava, faltava — e a plataforma ficava a achar que a culpa
--  era do cliente.
--
--  PORQUE É QUE ISTO É UM FEED E NÃO UMA INTEGRAÇÃO OAUTH
--  ------------------------------------------------------
--  Ligar-se ao Google Calendar de alguém pede um consentimento OAuth que
--  dá acesso de LEITURA E ESCRITA a tudo o que essa pessoa tem na agenda:
--  as consultas médicas, as férias, o que quer que lá esteja. Para pôr lá
--  três consultas por mês.
--
--  Um feed iCalendar subscrito dá o mesmo resultado prático — a consulta
--  aparece no telemóvel e atualiza-se sozinha quando muda — e o sentido é
--  um só: daqui para fora. A plataforma nunca vê o calendário de ninguém.
--  Funciona no Google, no Apple (iCloud), no Outlook e em tudo o que
--  entenda `webcal:`, sem uma conta de programador em lado nenhum.
--
--  O QUE ISTO CUSTA, DITO SEM RODEIOS
--  ----------------------------------
--  O endereço do feed É a credencial. Um calendário externo não sabe
--  autenticar-se — não há cabeçalho para pôr um token — e por isso o
--  segredo tem de viajar no próprio URL. Quem o tiver, lê a agenda.
--
--  Daí as três decisões que se seguem, e nenhuma é decorativa:
--
--   1. O token são DOIS `gen_random_uuid()` colados, sem os hífenes: 64
--      caracteres hexadecimais, à volta de 244 bits de aleatoriedade. Não
--      é derivado do id de ninguém nem de nada que seja público. Não se
--      usa `gen_random_bytes` de propósito — vive no pgcrypto, que no
--      Supabase mora no esquema `extensions` e no arreio de testes mora
--      no `public`; uma função com `search_path = ''` teria de escolher
--      um dos dois e partir-se no outro. O `gen_random_uuid` é do
--      `pg_catalog` e não tem esse problema.
--   2. REVOGA-SE E ROTACIONA-SE. Um segredo que não se pode trocar é um
--      segredo para a vida — e este vai parar ao histórico de um browser,
--      a um email, a um telemóvel que se perde.
--   3. `detalhe` decide o que sai. Em `ocupado`, o feed diz que há uma
--      consulta e a que horas, e mais nada: nem nome de cliente, nem
--      assunto, nem morada. É a opção certa para quem partilha o
--      calendário com a equipa ou com a família.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. A subscrição ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calendario_assinaturas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 32 bytes em hexadecimal. Em base64url seria mais curto, mas o
  -- hexadecimal sobrevive a ser copiado, colado e reencaminhado por
  -- clientes de email que se acham espertos com os sinais `+` e `=`.
  token         text NOT NULL UNIQUE
                  CHECK (token ~ '^[0-9a-f]{64}$'),

  -- De que lado da relação é esta agenda. Um contabilista e um cliente
  -- veem consultas diferentes na mesma tabela.
  papel         text NOT NULL CHECK (papel IN ('cliente', 'contabilista')),

  -- `completo` traz assunto, nome e morada. `ocupado` traz só o bloco de
  -- tempo. Ver o cabeçalho: é a diferença entre um calendário que se pode
  -- mostrar a alguém e um que não.
  detalhe       text NOT NULL DEFAULT 'completo'
                  CHECK (detalhe IN ('completo', 'ocupado')),

  /* Minutos antes da consulta para o alarme. Nulo = sem alarme. */
  alarme_min    integer CHECK (alarme_min IS NULL
                               OR alarme_min BETWEEN 5 AND 10080),

  criado_em     timestamptz NOT NULL DEFAULT now(),
  revogado_em   timestamptz,

  -- Serve para uma coisa só, e é uma coisa que vale a pena: dizer à
  -- pessoa «este endereço nunca foi usado» quando ela acha que subscreveu
  -- e afinal copiou mal.
  ultimo_acesso_em timestamptz,

  -- Uma por papel. Duas subscrições do mesmo lado seriam dois segredos a
  -- revogar em vez de um, e ninguém se lembraria do segundo.
  UNIQUE (user_id, papel)
);

CREATE INDEX IF NOT EXISTS calendario_assinaturas_token_idx
  ON public.calendario_assinaturas (token) WHERE revogado_em IS NULL;

ALTER TABLE public.calendario_assinaturas ENABLE ROW LEVEL SECURITY;


-- ── 2. Quem alcança o quê ───────────────────────────────────────────
--
-- Só o dono. Nem sequer a administração: uma linha desta tabela É a chave
-- da agenda de alguém, e não há trabalho de administração que precise de
-- a ler. Quem serve o feed é o `service_role`, do lado do servidor, e esse
-- não passa por políticas.
DROP POLICY IF EXISTS "calendario_dono_le" ON public.calendario_assinaturas;
CREATE POLICY "calendario_dono_le" ON public.calendario_assinaturas
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- O token nunca é escolhido por quem o usa. Um INSERT direto deixaria o
-- browser escolher o segredo — e um segredo escolhido no browser é um
-- segredo que alguém há de derivar do email.
REVOKE INSERT, UPDATE, DELETE ON public.calendario_assinaturas
  FROM anon, authenticated;


-- ── 3. Criar ou rodar ───────────────────────────────────────────────
--
-- A mesma função faz as duas coisas, de propósito: rodar É criar um
-- token novo por cima do antigo, e ter duas funções fazia com que uma
-- delas ficasse esquecida sem o `ON CONFLICT`.
CREATE OR REPLACE FUNCTION public.criar_assinatura_calendario(
  p_papel   text,
  p_detalhe text DEFAULT 'completo',
  p_alarme  integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  u       uuid := auth.uid();
  v_token text;
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  IF p_papel NOT IN ('cliente', 'contabilista') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'papel_invalido');
  END IF;

  IF p_papel = 'contabilista'
     AND NOT EXISTS (SELECT 1 FROM public.contabilistas c
                      WHERE c.user_id = u AND c.estado = 'aprovado') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_es_contabilista');
  END IF;

  IF p_detalhe NOT IN ('completo', 'ocupado') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'detalhe_invalido');
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '')
          || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.calendario_assinaturas
    (user_id, token, papel, detalhe, alarme_min)
  VALUES (u, v_token, p_papel, p_detalhe, p_alarme)
  ON CONFLICT (user_id, papel) DO UPDATE
    SET token            = excluded.token,
        detalhe          = excluded.detalhe,
        alarme_min       = excluded.alarme_min,
        criado_em        = now(),
        revogado_em      = NULL,
        -- O acesso anterior era do token antigo. Mantê-lo faria parecer
        -- que o endereço novo já tinha sido lido.
        ultimo_acesso_em = NULL;

  RETURN jsonb_build_object('ok', true, 'token', v_token);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_assinatura_calendario(text, text, integer)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.criar_assinatura_calendario(text, text, integer)
  TO authenticated, service_role;


-- ── 4. Mudar o que sai, sem trocar o endereço ───────────────────────
--
-- Existe à parte de `criar` por uma razão prática: passar de «completo»
-- para «ocupado» não devia obrigar a resubscrever o calendário em todos
-- os aparelhos. Quem quer trocar o segredo chama `criar`.
CREATE OR REPLACE FUNCTION public.ajustar_assinatura_calendario(
  p_papel   text,
  p_detalhe text,
  p_alarme  integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  IF p_detalhe NOT IN ('completo', 'ocupado') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'detalhe_invalido');
  END IF;

  UPDATE public.calendario_assinaturas
     SET detalhe = p_detalhe, alarme_min = p_alarme
   WHERE user_id = u AND papel = p_papel AND revogado_em IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_assinatura');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ajustar_assinatura_calendario(text, text, integer)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ajustar_assinatura_calendario(text, text, integer)
  TO authenticated, service_role;


-- ── 5. Revogar ──────────────────────────────────────────────────────
--
-- Marca-se em vez de se apagar, e a diferença importa: quem revoga quer
-- saber DEPOIS que revogou, e uma linha apagada não conta essa história.
-- O token é reescrito na mesma operação — deixá-lo lá era guardar um
-- segredo que já não serve para nada.
CREATE OR REPLACE FUNCTION public.revogar_assinatura_calendario(p_papel text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  UPDATE public.calendario_assinaturas
     SET revogado_em = now(),
         token = replace(gen_random_uuid()::text, '-', '')
              || replace(gen_random_uuid()::text, '-', '')
   WHERE user_id = u AND papel = p_papel AND revogado_em IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_assinatura');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revogar_assinatura_calendario(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.revogar_assinatura_calendario(text)
  TO authenticated, service_role;


COMMENT ON TABLE public.calendario_assinaturas IS
  'Feeds iCalendar subscritos. O token no URL É a credencial: roda-se com `criar_assinatura_calendario` e revoga-se com `revogar_assinatura_calendario`.';
