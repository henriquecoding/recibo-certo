-- 20260819100000_fundadores_e_negociacao.sql
-- ═══════════════════════════════════════════════════════════════════════
--  OS DEZ PRIMEIROS, E O QUE ACONTECE AO DÉCIMO PRIMEIRO
--  ---------------------------------------------------------------------
--  Duas coisas, e a segunda só existe por causa da primeira.
--
--  1 · O PROGRAMA FUNDADOR
--
--  Os primeiros dez contabilistas aprovados ficam com 5% de comissão — o
--  patamar mais baixo que a tabela tem — de imediato e enquanto forem uma
--  conta de contabilista válida. Não é uma promoção de lançamento com
--  letra pequena: é o reconhecimento de quem aceita usar uma plataforma
--  sem histórico, sem outros profissionais lá dentro e sem provas dadas.
--
--  Como o plano vitalício da 035, e pela mesma razão: um limite anunciado
--  que a base de dados não impõe é um limite que um dia se atropela a si
--  próprio. Dois contabilistas aprovados no mesmo segundo não podem ficar
--  ambos com o lugar dez.
--
--  «Enquanto forem uma conta válida» é o que a palavra diz:
--   · `aprovado`  → o benefício vale;
--   · `suspenso`  → o benefício suspende-se, o LUGAR fica. Uma suspensão
--                   é temporária, e dar o lugar a outro tornava-a
--                   irreversível pela porta das traseiras;
--   · `recusado`  → o lugar volta ao bolo. Uma conta recusada não é uma
--                   conta que volta, e um lugar preso para sempre por
--                   alguém que não está cá é um lugar que ninguém ganha.
--
--  2 · A NEGOCIAÇÃO, PARA QUEM CHEGOU A SEGUIR
--
--  Esgotados os dez, o décimo primeiro não fica sem nada. Além dos
--  descontos que já existem — os créditos de fidelidade —, pode PROPOR um
--  valor para desbloquear o patamar seguinte e justificar porque é que
--  aquele valor faz sentido no caso dele. A proposta vai direta ao
--  administrador, que aceita, contrapõe ou recusa.
--
--  TRÊS COISAS QUE ISTO NÃO É, e que o esquema garante que não se tornam:
--
--   · Não é um leilão. Um valor aceite compra a PERCENTAGEM e mais nada.
--     `DESBLOQUEIO_NAO_COMPRA`, em `fronteiras.ts`, continua a valer
--     inteiro: nem posição no diretório, nem prioridade, nem selo.
--   · Não é um desconto secreto que se acumula. Uma proposta aceite
--     substitui o preço de catálogo daquela compra, uma vez, e caduca.
--   · Não é uma conversa. É um valor, uma justificação e uma decisão,
--     com o original guardado — o mesmo princípio da proposta ao cliente.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. Quantos lugares, e a que comissão ────────────────────────────
--
-- Em funções e não em constantes espalhadas: é aqui que se muda, e há um
-- teste do lado do TypeScript que compara os dois lados.
CREATE OR REPLACE FUNCTION public.lugares_fundadores_total() RETURNS integer
LANGUAGE sql IMMUTABLE AS $$ SELECT 10 $$;

CREATE OR REPLACE FUNCTION public.comissao_fundador_bps() RETURNS integer
LANGUAGE sql IMMUTABLE AS $$ SELECT 500 $$;

COMMENT ON FUNCTION public.lugares_fundadores_total IS
  'Dez. O limite vive aqui e não numa interface — um teto anunciado que a base não impõe atropela-se a si próprio.';


-- ── 2. O lugar ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contabilista_fundadores (
  contabilista_id uuid PRIMARY KEY
                    REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,

  -- 1 a 10. Único enquanto o lugar estiver ocupado — ver o índice parcial
  -- abaixo, que é o que impede dois «lugar 3» ao mesmo tempo sem impedir
  -- que o lugar 3 volte a ser dado depois de libertado.
  numero          smallint NOT NULL CHECK (numero >= 1),

  atribuido_em    timestamptz NOT NULL DEFAULT now(),
  libertado_em    timestamptz,
  motivo          text CHECK (motivo IS NULL OR char_length(motivo) <= 200)
);

CREATE UNIQUE INDEX IF NOT EXISTS fundadores_numero_ocupado_idx
  ON public.contabilista_fundadores (numero) WHERE libertado_em IS NULL;

ALTER TABLE public.contabilista_fundadores ENABLE ROW LEVEL SECURITY;

-- O próprio lê o seu lugar. A administração lê tudo. Mais ninguém:
-- «quem são os dez» é uma lista que, publicada, transforma um
-- reconhecimento num distintivo — e um distintivo no diretório é
-- exatamente o que `routing.ts` proíbe.
DROP POLICY IF EXISTS fundadores_self ON public.contabilista_fundadores;
CREATE POLICY fundadores_self ON public.contabilista_fundadores
  FOR SELECT TO authenticated
  USING (contabilista_id = (SELECT auth.uid()) OR public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.contabilista_fundadores
  FROM anon, authenticated;


-- ── 3. Quantos restam ───────────────────────────────────────────────
--
-- Público de propósito: o contador na página de candidatura é a razão de
-- alguém se decidir hoje em vez de «um dia destes». Devolve contagens, e
-- nunca nomes.
CREATE OR REPLACE FUNCTION public.lugares_fundadores()
RETURNS TABLE (total integer, ocupados integer, restantes integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.lugares_fundadores_total(),
         count(*)::integer,
         greatest(public.lugares_fundadores_total() - count(*)::integer, 0)
    FROM public.contabilista_fundadores f
   WHERE f.libertado_em IS NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.lugares_fundadores() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lugares_fundadores()
  TO anon, authenticated, service_role;


-- ── 4. A atribuição, sem espaço entre ver e escrever ────────────────
--
-- ⚠️ O bloqueio consultivo não é zelo a mais. Entre contar os ocupados e
-- inserir a linha passa tempo, e nesse intervalo cabe outra aprovação: as
-- duas contavam nove e as duas escreviam o lugar dez. O índice parcial
-- apanharia a segunda com um erro feio; o bloqueio faz a segunda ESPERAR
-- e recontar, que é o que devia acontecer. É o mesmo padrão da 035.
CREATE OR REPLACE FUNCTION public.atribuir_lugar_de_fundador(p_contabilista uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_ocupados integer;
  v_numero   smallint;
  v_ja       record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('recibocerto:lugares_fundadores'));

  -- Já tem lugar? Reaprovar não dá um segundo, e não devolve erro: é a
  -- mesma resposta de sucesso, com o número que já era dele.
  SELECT * INTO v_ja FROM public.contabilista_fundadores
   WHERE contabilista_id = p_contabilista;

  IF FOUND AND v_ja.libertado_em IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'numero', v_ja.numero, 'novo', false);
  END IF;

  SELECT count(*) INTO v_ocupados FROM public.contabilista_fundadores
   WHERE libertado_em IS NULL;

  IF v_ocupados >= public.lugares_fundadores_total() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'esgotado');
  END IF;

  -- O número mais baixo que estiver livre, e não «ocupados + 1»: com um
  -- lugar libertado a meio, esse contava mal e chocava com o índice.
  SELECT min(n)::smallint INTO v_numero
    FROM generate_series(1, public.lugares_fundadores_total()) AS g(n)
   WHERE NOT EXISTS (
     SELECT 1 FROM public.contabilista_fundadores f
      WHERE f.numero = g.n AND f.libertado_em IS NULL);

  IF v_numero IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'esgotado');
  END IF;

  -- Quem já teve lugar e o perdeu volta a entrar pela mesma porta: a
  -- linha é substituída, e o histórico de o ter perdido fica no registo
  -- de auditoria, não aqui.
  INSERT INTO public.contabilista_fundadores (contabilista_id, numero)
  VALUES (p_contabilista, v_numero)
  ON CONFLICT (contabilista_id) DO UPDATE
    SET numero = excluded.numero,
        atribuido_em = now(),
        libertado_em = NULL,
        motivo = NULL;

  RETURN jsonb_build_object('ok', true, 'numero', v_numero, 'novo', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.atribuir_lugar_de_fundador(uuid)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.atribuir_lugar_de_fundador(uuid) TO service_role;


-- ── 5. O gatilho — a atribuição não se esquece ──────────────────────
--
-- Vive num gatilho e não na rota que aprova, e a diferença é a de sempre:
-- uma rota é um sítio por onde se passa, um gatilho é o único caminho.
-- Há mais do que uma forma de aprovar um contabilista — a rota, a RPC, um
-- `UPDATE` de manutenção — e todas têm de dar o lugar.
CREATE OR REPLACE FUNCTION public.fundador_ao_aprovar()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.estado = 'aprovado' AND coalesce(OLD.estado, '') <> 'aprovado' THEN
    PERFORM public.atribuir_lugar_de_fundador(NEW.user_id);

  -- Recusado liberta. Suspenso NÃO: ver o cabeçalho — uma suspensão é
  -- temporária, e dar o lugar a outro tornava-a definitiva de lado.
  ELSIF NEW.estado = 'recusado' AND coalesce(OLD.estado, '') <> 'recusado' THEN
    UPDATE public.contabilista_fundadores
       SET libertado_em = now(), motivo = 'conta recusada'
     WHERE contabilista_id = NEW.user_id AND libertado_em IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fundador_ao_aprovar ON public.contabilistas;
CREATE TRIGGER trg_fundador_ao_aprovar
  AFTER INSERT OR UPDATE OF estado ON public.contabilistas
  FOR EACH ROW EXECUTE FUNCTION public.fundador_ao_aprovar();


-- ── 6. A comissão efetiva ───────────────────────────────────────────
--
-- `least` e não um `CASE` que devolve 500: se um dia existir um patamar
-- abaixo dos 5%, quem lá chegou por mérito não pode ser EMPURRADO PARA
-- CIMA pelo benefício que devia ajudá-lo. O fundador nunca paga mais do
-- que 5%; se o patamar dele já for melhor, fica com o dele.
--
-- E o benefício lê o estado da conta no instante em que é perguntado. Não
-- há cópia, não há cache: suspender a conta suspende a comissão sem que
-- alguém se tenha de lembrar de mexer em mais nada.
CREATE OR REPLACE FUNCTION public.e_fundador_ativo(p_contabilista uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.contabilista_fundadores f
      JOIN public.contabilistas c ON c.user_id = f.contabilista_id
     WHERE f.contabilista_id = p_contabilista
       AND f.libertado_em IS NULL
       AND c.estado = 'aprovado');
$$;

REVOKE EXECUTE ON FUNCTION public.e_fundador_ativo(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.e_fundador_ativo(uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.comissao_efetiva_bps(
  p_contabilista uuid, p_bps_do_patamar integer
)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN public.e_fundador_ativo(p_contabilista)
              THEN least(p_bps_do_patamar, public.comissao_fundador_bps())
              ELSE p_bps_do_patamar END;
$$;

REVOKE EXECUTE ON FUNCTION public.comissao_efetiva_bps(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.comissao_efetiva_bps(uuid, integer)
  TO authenticated, service_role;


-- ── 7. A proposta de valor ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.desbloqueio_propostas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,

  /* O patamar a que se propõe chegar. Guardado, e não deduzido no momento
     da decisão: entre propor e decidir o contabilista pode ter subido, e
     um valor aceite tem de dizer para o quê. */
  patamar_alvo    smallint NOT NULL CHECK (patamar_alvo >= 2),
  /* O preço de catálogo no instante da proposta. É contra ele que a
     administração lê o valor proposto — sem isto, «45 €» não diz nada. */
  preco_catalogo_cents integer NOT NULL CHECK (preco_catalogo_cents >= 0),

  valor_proposto_cents integer NOT NULL CHECK (valor_proposto_cents >= 0),

  /* Porque é que aquele valor faz sentido. Obrigatória, e com um mínimo:
     uma justificação de três palavras não é uma justificação, e recebê-la
     sem a ler é pior do que não a pedir. */
  justificacao    text NOT NULL CHECK (char_length(justificacao) BETWEEN 40 AND 2000),

  estado          text NOT NULL DEFAULT 'enviada'
                    CHECK (estado IN ('enviada', 'aceite', 'contraproposta',
                                      'recusada', 'expirada', 'usada')),

  /* Preenchido quando a administração contrapõe. É este o valor que passa
     a valer se o contabilista o aceitar. */
  contraproposta_cents integer CHECK (contraproposta_cents IS NULL
                                      OR contraproposta_cents >= 0),
  nota_admin      text CHECK (nota_admin IS NULL OR char_length(nota_admin) <= 1000),

  decidido_por    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decidida_em     timestamptz,
  /* Um valor aceite não vale para sempre: caduca. Sem isto, uma proposta
     de há dois anos comprava ao preço de há dois anos. */
  valida_ate      timestamptz,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS desbloqueio_propostas_contabilista_idx
  ON public.desbloqueio_propostas (contabilista_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS desbloqueio_propostas_fila_idx
  ON public.desbloqueio_propostas (criado_em) WHERE estado = 'enviada';

/* Uma de cada vez. Cinco propostas abertas do mesmo contabilista são
   cinco pessoas a decidir a mesma coisa, e a última a ser decidida
   ganhava por acidente. */
CREATE UNIQUE INDEX IF NOT EXISTS desbloqueio_propostas_uma_aberta_idx
  ON public.desbloqueio_propostas (contabilista_id)
  WHERE estado IN ('enviada', 'contraproposta');

ALTER TABLE public.desbloqueio_propostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS desbloqueio_propostas_le ON public.desbloqueio_propostas;
CREATE POLICY desbloqueio_propostas_le ON public.desbloqueio_propostas
  FOR SELECT TO authenticated
  USING (contabilista_id = (SELECT auth.uid()) OR public.is_admin());

-- Nem o autor escreve diretamente: o estado e a validade são decisões da
-- RPC, e um INSERT livre deixava alguém nascer «aceite».
REVOKE INSERT, UPDATE, DELETE ON public.desbloqueio_propostas
  FROM anon, authenticated;


-- ── 8. Propor ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.propor_valor_de_desbloqueio(
  p_valor_cents integer,
  p_justificacao text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_p    record;
  v_cat  integer;
  v_efetivo smallint;
  v_alvo record;
  v_id   uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  IF char_length(coalesce(btrim(p_justificacao), '')) < 40 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'justificacao_curta');
  END IF;

  IF coalesce(p_valor_cents, -1) < 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'valor_invalido');
  END IF;

  SELECT * INTO v_p FROM public.contabilista_progressao
   WHERE contabilista_id = v_uid;

  v_cat := public.catalogo_versao_corrente();
  v_efetivo := public.patamar_efetivo(
    coalesce(v_p.highest_earned_tier, 1::smallint),
    coalesce(v_p.highest_purchased_tier, 1::smallint));

  SELECT * INTO v_alvo FROM public.comissao_patamares
   WHERE versao_catalogo = v_cat AND ordem = v_efetivo + 1 AND ativo;
  IF NOT FOUND OR v_alvo.preco_desbloqueio_cents IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_patamar_seguinte');
  END IF;

  -- Propor MAIS do que o catálogo não é negociar: é distração ou é uma
  -- tentativa de comprar simpatia. Recusa-se com a razão à frente.
  IF p_valor_cents >= v_alvo.preco_desbloqueio_cents THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'acima_do_catalogo');
  END IF;

  BEGIN
    INSERT INTO public.desbloqueio_propostas
      (contabilista_id, patamar_alvo, preco_catalogo_cents,
       valor_proposto_cents, justificacao)
    VALUES (v_uid, v_alvo.ordem, v_alvo.preco_desbloqueio_cents,
            p_valor_cents, btrim(p_justificacao))
    RETURNING id INTO v_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'ja_tens_uma_aberta');
  END;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'patamarAlvo', v_alvo.ordem);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.propor_valor_de_desbloqueio(integer, text)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.propor_valor_de_desbloqueio(integer, text)
  TO authenticated, service_role;


-- ── 8b. Um tipo de aviso novo ───────────────────────────────────────
--
-- A lista dos tipos é um CHECK, e um CHECK não se contorna com um
-- `coalesce` esperto: sem esta linha, a decisão gravava e o aviso
-- rebentava a transação inteira.
ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_tipo_check CHECK (tipo IN (
  'vinculo_pedido', 'vinculo_aceite', 'mensagem',
  'consulta_pedida', 'consulta_confirmada', 'consulta_cancelada',
  'partilha_recebida', 'cupao_ganho', 'candidatura_decidida',
  'pedido_criado', 'pedido_respondido', 'pedido_concluido',
  'consulta_local_mudou', 'proposta_desbloqueio_decidida'));

-- E merece email: quem propôs um valor e justificou está à espera de uma
-- resposta, e essa resposta não pode depender de a pessoa voltar ao site.
CREATE OR REPLACE FUNCTION public.aviso_merece_email(p_tipo text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT p_tipo IN ('vinculo_pedido', 'vinculo_aceite', 'consulta_pedida',
                    'consulta_confirmada', 'consulta_cancelada', 'cupao_ganho',
                    'candidatura_decidida', 'consulta_local_mudou',
                    'proposta_desbloqueio_decidida')
$$;


-- ── 9. Decidir ──────────────────────────────────────────────────────
--
-- Aceitar, contrapor ou recusar. Não há «editar o valor proposto»: o que
-- a administração acha que devia ser é uma CONTRAPROPOSTA, que o
-- contabilista aceita ou não. Reescrever o número dele e chamar-lhe
-- «aceite» era decidir por ele.
CREATE OR REPLACE FUNCTION public.decidir_proposta_de_desbloqueio(
  p_proposta uuid,
  p_decisao  text,
  p_valor    integer DEFAULT NULL,
  p_nota     text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  u     uuid := auth.uid();
  email text;
  v     record;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'so_a_administracao');
  END IF;

  IF p_decisao NOT IN ('aceitar', 'contrapor', 'recusar') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'decisao_invalida');
  END IF;

  IF p_decisao = 'contrapor' AND coalesce(p_valor, -1) < 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'falta_o_valor');
  END IF;

  -- Recusar sem dizer porquê deixa a pessoa a adivinhar o que corrigir.
  IF p_decisao = 'recusar'
     AND char_length(coalesce(btrim(p_nota), '')) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'falta_a_razao');
  END IF;

  UPDATE public.desbloqueio_propostas d
     SET estado = CASE p_decisao
                    WHEN 'aceitar'   THEN 'aceite'
                    WHEN 'contrapor' THEN 'contraproposta'
                    ELSE 'recusada' END,
         contraproposta_cents = CASE WHEN p_decisao = 'contrapor'
                                     THEN p_valor ELSE NULL END,
         nota_admin  = nullif(btrim(coalesce(p_nota, '')), ''),
         decidido_por = u,
         decidida_em  = now(),
         -- Trinta dias. Chega para decidir e não chega para uma proposta
         -- ficar a valer depois de os preços mudarem.
         valida_ate = CASE WHEN p_decisao = 'recusar'
                           THEN NULL ELSE now() + interval '30 days' END
   WHERE d.id = p_proposta AND d.estado = 'enviada'
  RETURNING * INTO v;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_decidivel');
  END IF;

  SELECT p.email INTO email FROM public.profiles p WHERE p.id = u;
  INSERT INTO public.admin_auditoria (ator_id, ator_email, acao, alvo_id, detalhe)
  VALUES (u, email, 'desbloqueio_proposta_decidida', v.contabilista_id,
          jsonb_build_object('proposta', p_proposta, 'decisao', p_decisao,
                             'valor', p_valor));

  PERFORM public.avisar_utilizador(
    v.contabilista_id, 'proposta_desbloqueio_decidida',
    CASE p_decisao
      WHEN 'aceitar'   THEN 'A tua proposta foi aceite'
      WHEN 'contrapor' THEN 'Há uma contraproposta para ti'
      ELSE 'A tua proposta não foi aceite' END,
    'Vê a decisão na tua progressão.', '/contabilista/progressao');

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decidir_proposta_de_desbloqueio(uuid, text, integer, text)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.decidir_proposta_de_desbloqueio(uuid, text, integer, text)
  TO authenticated, service_role;


-- ── 10. Aceitar a contraproposta ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.aceitar_contraproposta(p_proposta uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  UPDATE public.desbloqueio_propostas
     SET estado = 'aceite',
         -- O valor passa a ser o da contraproposta. É esta linha que faz
         -- com que a secção 11 leia um número só, venha ele de onde vier.
         valor_proposto_cents = coalesce(contraproposta_cents, valor_proposto_cents)
   WHERE id = p_proposta
     AND contabilista_id = u
     AND estado = 'contraproposta'
     AND (valida_ate IS NULL OR valida_ate > now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_aceitavel');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.aceitar_contraproposta(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.aceitar_contraproposta(uuid)
  TO authenticated, service_role;


-- ── 11. O preço que a compra vai usar ───────────────────────────────
--
-- Uma função e não uma coluna copiada para `progressao_compras`: o preço
-- tem de ser lido no instante em que a compra nasce, contra as condições
-- desse instante. Devolve NULL quando não há nada negociado, e quem
-- chama trata o NULL como «usa o catálogo».
CREATE OR REPLACE FUNCTION public.preco_negociado_cents(
  p_contabilista uuid, p_patamar smallint
)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT d.valor_proposto_cents
    FROM public.desbloqueio_propostas d
   WHERE d.contabilista_id = p_contabilista
     AND d.patamar_alvo = p_patamar
     AND d.estado = 'aceite'
     AND (d.valida_ate IS NULL OR d.valida_ate > now())
   ORDER BY d.decidida_em DESC NULLS LAST
   LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.preco_negociado_cents(uuid, smallint) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.preco_negociado_cents(uuid, smallint)
  TO authenticated, service_role;


-- ── 12. A compra passa a olhar para o valor negociado ───────────────
--
-- `CREATE OR REPLACE` sobre a função da migração da progressão. O corpo é
-- o mesmo, com uma diferença: o preço-base deixa de vir só do catálogo.
--
-- ⚠️ A ORDEM ENTRE O NEGOCIADO E OS CRÉDITOS. O desconto de fidelidade
-- aplica-se DEPOIS, sobre o valor negociado. É a leitura generosa, e é a
-- que corresponde ao que a interface diz: os créditos são uma coisa que
-- se ganhou, e não um teto que a negociação gasta.
CREATE OR REPLACE FUNCTION public.criar_intencao_desbloqueio(
  p_creditos_a_usar integer DEFAULT 0,
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_p record; v_cat integer; v_efetivo smallint;
  v_alvo record; v_creditos integer; v_pct integer; v_final integer;
  v_id uuid; v_key text;
  v_base integer; v_negociado integer;
BEGIN
  IF v_uid IS NULL OR NOT public.e_contabilista_aprovado(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_permissao'); END IF;
  IF NOT public.progressao_flag('accountant_tier_purchase') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'compra_indisponivel'); END IF;

  SELECT * INTO v_p FROM public.contabilista_progressao
   WHERE contabilista_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.contabilista_progressao (contabilista_id) VALUES (v_uid)
    ON CONFLICT DO NOTHING;
    SELECT * INTO v_p FROM public.contabilista_progressao
     WHERE contabilista_id = v_uid FOR UPDATE;
  END IF;

  PERFORM public.expirar_intencoes_desbloqueio(v_uid);

  v_cat := public.catalogo_versao_corrente();
  v_efetivo := public.patamar_efetivo(v_p.highest_earned_tier, v_p.highest_purchased_tier);

  SELECT * INTO v_alvo FROM public.comissao_patamares
   WHERE versao_catalogo = v_cat AND ordem = v_efetivo + 1 AND ativo;
  IF NOT FOUND OR v_alvo.preco_desbloqueio_cents IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_patamar_seguinte'); END IF;

  -- A única linha nova do corpo. `least` porque um valor negociado ACIMA
  -- do catálogo nunca pode encarecer a compra — a RPC de propor já o
  -- recusa, e isto é a segunda fechadura na mesma porta.
  v_negociado := public.preco_negociado_cents(v_uid, v_alvo.ordem);
  v_base := CASE WHEN v_negociado IS NULL THEN v_alvo.preco_desbloqueio_cents
                 ELSE least(v_negociado, v_alvo.preco_desbloqueio_cents) END;

  v_creditos := public.creditos_do_marco(
    least(greatest(coalesce(p_creditos_a_usar, 0), 0), v_p.creditos_disponiveis));
  v_pct   := public.desconto_por_creditos(v_creditos);
  v_final := public.preco_com_desconto(v_base, v_pct);
  v_key   := coalesce(p_idempotency_key, gen_random_uuid()::text);

  INSERT INTO public.progressao_compras
    (contabilista_id, target_tier_order, catalog_version, base_price_cents,
     loyalty_credits, loyalty_discount_pct, final_price_cents, estado, idempotency_key)
  VALUES (v_uid, v_alvo.ordem, v_cat, v_base,
          v_creditos, v_pct, v_final, 'draft', v_key)
  RETURNING id INTO v_id;

  IF v_creditos > 0 THEN
    INSERT INTO public.creditos_fidelidade_ledger
      (contabilista_id, compra_id, tipo, delta, chave_idempotencia)
    VALUES (v_uid, v_id, 'held', v_creditos, 'held:' || v_id::text);
  END IF;

  PERFORM public.recalcular_progressao(v_uid);

  RETURN jsonb_build_object('ok', true, 'compraId', v_id,
    'targetTier', v_alvo.ordem, 'targetSlug', v_alvo.slug,
    'baseCents', v_base,
    'precoCatalogoCents', v_alvo.preco_desbloqueio_cents,
    'negociado', v_negociado IS NOT NULL,
    'creditosUsados', v_creditos, 'descontoPct', v_pct,
    'finalCents', v_final, 'idempotencyKey', v_key);
END; $$;

REVOKE EXECUTE ON FUNCTION public.criar_intencao_desbloqueio(integer, text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.criar_intencao_desbloqueio(integer, text) TO authenticated;


COMMENT ON TABLE public.contabilista_fundadores IS
  'Os dez primeiros. 5% de comissão enquanto a conta estiver aprovada. O lugar é único por construção — índice parcial mais bloqueio consultivo, como o vitalício da 035.';
COMMENT ON TABLE public.desbloqueio_propostas IS
  'Negociação do preço de desbloqueio. Um valor aceite compra a percentagem e mais nada — `DESBLOQUEIO_NAO_COMPRA` continua a valer inteiro.';
