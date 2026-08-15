-- =====================================================================
--  PROGRESSÃO E COMISSÃO — o estado, o registo, e o que nunca é público
--  ---------------------------------------------------------------------
--  A taxa de intermediação do ReciboCerto começa nos 10% e desce até 5%.
--  Desce por trabalho feito — XP e clientes elegíveis — ou, em opção, por
--  desbloqueio pago. Esta migração guarda esse estado.
--
--  ── PORQUE É UMA TABELA À PARTE, E NÃO COLUNAS EM `contabilistas`
--
--  Porque `contabilistas` ainda é PÚBLICA. A migração
--  `20260815200000_contrato_publico_contabilistas.sql` criou a view
--  `contabilistas_publico` mas NÃO fechou a política antiga, de propósito:
--
--    CREATE POLICY contabilistas_diretorio_publico ON public.contabilistas
--      FOR SELECT TO anon, authenticated USING (estado = 'aprovado');
--
--  Enquanto essa política existe, uma coluna nova em `contabilistas` nasce
--  legível por quem não tem sessão — view ou não view. `xp` e
--  `patamar_comprado` ali seriam a comissão e o histórico de compras de
--  todos os contabilistas aprovados, à vista, sem ninguém escrever uma
--  linha de frontend. É exatamente o cenário que a §138 e o comentário
--  dessa migração anteciparam; a resposta é não pôr os dados no alcance
--  dela.
--
--  ── PORQUE O CLIENTE NÃO ESCREVE XP
--
--  A lição da migração 024 (os prémios do quiz eram escritos pelo cliente
--  e qualquer conta se auto-oferecia três meses de Pro): validar QUEM
--  escreve não chega, é preciso validar O QUE é escrito. Aqui isso
--  significa que nenhuma política dá INSERT ou UPDATE a `authenticated`.
--  O XP nasce de transições que o servidor observa, com a chave de
--  serviço. Quem tem a página aberta não tem por onde se promover.
--
--  ── O QUE O DESBLOQUEIO PAGO COMPRA
--
--  A percentagem, e nada mais. Não compra posição no diretório, não compra
--  prioridade no encaminhamento, não compra selo. O `MONETIZACAO_PROIBIDA`
--  do `routing.ts` proíbe «ordenar parceiros pelo valor pago» — e a única
--  forma de isso continuar verdade quando existe um botão de pagar é o
--  patamar não ser um sinal que o diretório consiga ler. A guarda no fim
--  deste ficheiro recusa-o.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
--  1. O estado da progressão
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contabilista_progressao (
  contabilista_id    uuid PRIMARY KEY
                       REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  xp                 integer  NOT NULL DEFAULT 0 CHECK (xp >= 0),
  clientes_elegiveis integer  NOT NULL DEFAULT 0 CHECK (clientes_elegiveis >= 0),
  -- Nulo = nunca comprou. O patamar em vigor é o MAIOR entre o merecido e
  -- este: quem pagou não o perde por o XP baixar, e quem sobe por mérito
  -- acima do que comprou fica com o mérito.
  patamar_comprado   smallint CHECK (patamar_comprado IS NULL OR patamar_comprado BETWEEN 1 AND 6),
  cartoes_concluidos integer  NOT NULL DEFAULT 0 CHECK (cartoes_concluidos >= 0),
  atualizado_em      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.contabilista_progressao IS
  'Estado da progressão de cada contabilista. NUNCA público: não entra em contabilistas_publico nem em nenhuma política aberta a anon. Ver assert_progressao_nao_publica().';
COMMENT ON COLUMN public.contabilista_progressao.xp IS
  'Soma dos eventos de contabilista_xp_eventos. Derivado, mantido pelo servidor — o cliente não tem INSERT nem UPDATE.';
COMMENT ON COLUMN public.contabilista_progressao.patamar_comprado IS
  'Compra a PERCENTAGEM e mais nada: não compra posição no diretório, prioridade no encaminhamento nem selo no perfil.';

-- ---------------------------------------------------------------------
--  2. O registo do XP — com idempotência estrutural
-- ---------------------------------------------------------------------
--  `UNIQUE (origem_tipo, origem_id, evento)` é o mesmo mecanismo do
--  `UNIQUE (agendamento_id)` de `fidelidade_carimbos`: dar XP duas vezes
--  pela mesma consulta viola uma restrição da base de dados, em vez de
--  depender de o código se lembrar de verificar antes de escrever.
CREATE TABLE IF NOT EXISTS public.contabilista_xp_eventos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL
                    REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  evento          text NOT NULL CHECK (evento IN (
                    'cliente_elegivel', 'servico_concluido', 'cartao_fidelidade_concluido'
                  )),
  xp              smallint NOT NULL CHECK (xp > 0 AND xp <= 500),
  -- De onde veio, para o evento ser reconciliável e não um número solto.
  origem_tipo     text NOT NULL CHECK (origem_tipo IN (
                    'vinculo', 'agendamento', 'cartao', 'proposta'
                  )),
  origem_id       uuid NOT NULL,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origem_tipo, origem_id, evento)
);

CREATE INDEX IF NOT EXISTS contabilista_xp_eventos_por_contabilista
  ON public.contabilista_xp_eventos (contabilista_id, criado_em DESC);

COMMENT ON TABLE public.contabilista_xp_eventos IS
  'O registo de onde veio cada XP. Só o servidor escreve. UNIQUE (origem_tipo, origem_id, evento) torna a dupla contagem impossível por construção.';

-- ---------------------------------------------------------------------
--  3. RLS — o próprio lê, ninguém escreve
-- ---------------------------------------------------------------------
ALTER TABLE public.contabilista_progressao  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contabilista_xp_eventos  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progressao_propria_le" ON public.contabilista_progressao;
CREATE POLICY "progressao_propria_le" ON public.contabilista_progressao
  FOR SELECT TO authenticated
  USING (contabilista_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "xp_eventos_proprios_le" ON public.contabilista_xp_eventos;
CREATE POLICY "xp_eventos_proprios_le" ON public.contabilista_xp_eventos
  FOR SELECT TO authenticated
  USING (contabilista_id = (SELECT auth.uid()));

--  Nenhuma política de INSERT/UPDATE/DELETE, para ninguém. Não é
--  esquecimento: sem política, a RLS recusa a escrita, e a única via que
--  resta é a chave de serviço. É o que a migração 024 ensinou.
REVOKE INSERT, UPDATE, DELETE ON public.contabilista_progressao FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.contabilista_xp_eventos FROM anon, authenticated;
REVOKE SELECT ON public.contabilista_progressao FROM anon;
REVOKE SELECT ON public.contabilista_xp_eventos FROM anon;
GRANT  SELECT ON public.contabilista_progressao TO authenticated;
GRANT  SELECT ON public.contabilista_xp_eventos TO authenticated;

-- ---------------------------------------------------------------------
--  4. Creditar XP — a única porta de escrita, do lado do servidor
-- ---------------------------------------------------------------------
--  Recebe a ORIGEM, não o número: quem chama diz «este agendamento foi
--  realizado», e a função decide quanto vale. Deixar o chamador escolher
--  o XP era recriar o problema da 024 um nível acima.
CREATE OR REPLACE FUNCTION public.creditar_xp_contabilista(
  p_contabilista uuid,
  p_evento       text,
  p_origem_tipo  text,
  p_origem_id    uuid
)
RETURNS TABLE (creditado boolean, xp_total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_xp smallint;
  v_inseriu boolean := false;
  v_total integer;
BEGIN
  v_xp := CASE p_evento
            WHEN 'cliente_elegivel'            THEN 20
            WHEN 'servico_concluido'           THEN 15
            WHEN 'cartao_fidelidade_concluido' THEN 100
          END;

  IF v_xp IS NULL THEN
    RAISE EXCEPTION 'Evento de XP desconhecido: %', p_evento;
  END IF;

  INSERT INTO public.contabilista_xp_eventos
    (contabilista_id, evento, xp, origem_tipo, origem_id)
  VALUES (p_contabilista, p_evento, v_xp, p_origem_tipo, p_origem_id)
  ON CONFLICT (origem_tipo, origem_id, evento) DO NOTHING;

  v_inseriu := FOUND;

  -- O agregado é recalculado da soma do registo, e não incrementado. Um
  -- `+= 20` perde-se numa transação repetida; a soma não tem como
  -- divergir do que está escrito.
  INSERT INTO public.contabilista_progressao (contabilista_id, xp)
  VALUES (p_contabilista, 0)
  ON CONFLICT (contabilista_id) DO NOTHING;

  UPDATE public.contabilista_progressao p
     SET xp = COALESCE((
           SELECT sum(e.xp)::integer
             FROM public.contabilista_xp_eventos e
            WHERE e.contabilista_id = p_contabilista
         ), 0),
         clientes_elegiveis = COALESCE((
           SELECT count(DISTINCT e.origem_id)::integer
             FROM public.contabilista_xp_eventos e
            WHERE e.contabilista_id = p_contabilista
              AND e.evento = 'cliente_elegivel'
         ), 0),
         cartoes_concluidos = COALESCE((
           SELECT count(*)::integer
             FROM public.contabilista_xp_eventos e
            WHERE e.contabilista_id = p_contabilista
              AND e.evento = 'cartao_fidelidade_concluido'
         ), 0),
         atualizado_em = now()
   WHERE p.contabilista_id = p_contabilista
  RETURNING p.xp INTO v_total;

  RETURN QUERY SELECT v_inseriu, COALESCE(v_total, 0);
END;
$$;

--  Nem `anon` nem `authenticated`. Só a chave de serviço.
REVOKE EXECUTE ON FUNCTION public.creditar_xp_contabilista(uuid, text, text, uuid)
  FROM anon, authenticated, public;

COMMENT ON FUNCTION public.creditar_xp_contabilista(uuid, text, text, uuid) IS
  'Credita XP a partir da ORIGEM do evento, nunca de um valor recebido. Idempotente pela restrição UNIQUE. Sem EXECUTE para anon nem authenticated: só o servidor.';

-- ---------------------------------------------------------------------
--  5. A guarda: a progressão nunca é pública
-- ---------------------------------------------------------------------
--  Um dia alguém vai querer «destacar os melhores contabilistas» e a
--  coluna do patamar vai parecer a resposta óbvia. É esse dia que esta
--  função espera. Duas perguntas: as tabelas estão fora do alcance de
--  anon, e a view pública não ganhou nenhuma coluna de progressão?
CREATE OR REPLACE FUNCTION public.assert_progressao_nao_publica()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_politicas text[];
  v_colunas   text[];
BEGIN
  SELECT array_agg(tablename || '.' || policyname ORDER BY policyname)
    INTO v_politicas
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('contabilista_progressao', 'contabilista_xp_eventos')
     AND ('anon'::name = ANY (roles) OR 'public'::name = ANY (roles));

  IF v_politicas IS NOT NULL THEN
    RAISE EXCEPTION
      'A progressão ficou legível sem sessão (%). O patamar não é um sinal público.',
      array_to_string(v_politicas, ', ');
  END IF;

  --  A view é o contrato do diretório. Uma coluna de progressão aqui é a
  --  comissão de todos à vista — e, pior, um sinal que a ordenação do
  --  diretório passaria a poder ler.
  SELECT array_agg(column_name ORDER BY column_name) INTO v_colunas
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'contabilistas_publico'
     AND (
          column_name IN ('xp', 'patamar', 'patamar_comprado', 'comissao_pct',
                          'clientes_elegiveis', 'cartoes_concluidos', 'creditos')
       OR column_name LIKE 'patamar%'
       OR column_name LIKE 'comissao%'
     );

  IF v_colunas IS NOT NULL THEN
    RAISE EXCEPTION
      'contabilistas_publico expõe progressão (%). Ver §138 e MONETIZACAO_PROIBIDA.',
      array_to_string(v_colunas, ', ');
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_progressao_nao_publica() IS
  'Falha se a progressão se tornar legível sem sessão, ou se uma coluna de patamar/comissão entrar no contrato público do diretório.';

SELECT public.assert_progressao_nao_publica();

COMMIT;

-- =====================================================================
--  O QUE FICA PARA QUANDO A COBRANÇA ABRIR
--  ---------------------------------------------------------------------
--  `patamar_comprado` existe e a coluna aceita o valor, mas nada nesta
--  migração o escreve — nem há por onde, do lado do cliente. O
--  desbloqueio pago está desenhado e o preço é real
--  (`progressao.ts`: PATAMARES), e a interface diz que a cobrança ainda
--  não está ligada.
--
--  Quando o Stripe entrar, o passo que falta é UM: a rota do webhook
--  escreve `patamar_comprado` com a chave de serviço, depois de confirmar
--  o pagamento — e nunca a partir de um clique no browser, que é o mesmo
--  princípio desta migração inteira. Não escrever isso agora não é uma
--  omissão: um desbloqueio que o cliente pudesse pedir sem pagar seria a
--  migração 024 outra vez.
-- =====================================================================
