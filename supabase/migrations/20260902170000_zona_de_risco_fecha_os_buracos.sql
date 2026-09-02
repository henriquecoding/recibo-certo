-- 20260902170000_zona_de_risco_fecha_os_buracos.sql
-- ═══════════════════════════════════════════════════════════════════════
--  A ZONA DE RISCO DIZIA QUE APAGAVA. HAVIA CINCO CONJUNTOS QUE NÃO.
--  ---------------------------------------------------------------------
--  Auditoria de 02/09/2026. Três buracos, e o terceiro contradiz uma
--  promessa escrita no ecrã.
--
--  PRIMEIRO — `apagar_conjuntos` não conhecia cinco conjuntos que o
--  catálogo declara apagáveis: `calendario`, `painel-vistas`, `fundador`,
--  `propostas-desbloqueio` e `fidelidade-regras`. A rota validava-os contra
--  `APAGAVEIS`, mandava-os para aqui, e aqui nenhum `IF` lhes correspondia.
--  A função devolvia `ok: true`, a rota respondia «apagado», e as linhas
--  ficavam. Um endereço de calendário é a chave de leitura de uma agenda:
--  quem o quis apagar continuou a ter a agenda a ser lida pelo Google.
--
--  SEGUNDO — `inventario_do_utilizador` não devolvia chave para esses
--  cinco. A interface lê o inventário para saber o que a pessoa TEM; sem
--  chave, `?? 0` dava zero, a linha aparecia a cinzento e a caixa
--  desativada. Ou seja: o primeiro buraco estava tapado pelo segundo. Nem
--  dava para escolher o que, escolhido, não seria apagado.
--
--  TERCEIRO, e o que magoa — «O que fica, e porquê» prometia que os
--  pagamentos e as compras de patamar ficam retidos pelo prazo legal de
--  conservação de documentos de faturação. O esquema garante o contrário:
--  `pagamentos`, `progressao_compras`, `contabilista_stripe` e as restantes
--  pendem de `contabilistas(user_id)` com `ON DELETE CASCADE`, e
--  `contabilistas.user_id` pende de `auth.users` com `ON DELETE CASCADE`.
--  Apagar o perfil de contabilista — uma caixa normal, sem aviso nenhum —
--  levava com ele o histórico de pagamentos inteiro. E `pagamentos.cliente_id`
--  também cascateia de `auth.users`: um CLIENTE a apagar a conta apagava a
--  prova de uma transação que é do contabilista, exatamente o que a mesma
--  frase diz que não pode acontecer a pedido de um dos dois.
--
--  A correção não mexe nas chaves estrangeiras — mexer nelas obrigaria a
--  tornar colunas nulas e a mudar RLS de tabelas em produção. Em vez disso
--  os registos protegidos são COPIADOS para `faturacao_retida` antes de
--  qualquer coisa cascatear, sem referência a ninguém: valores, datas e
--  identificadores da Stripe, e um número de ordem pseudónimo para os
--  poder agrupar sem os poder atribuir. É o que a promessa diz —
--  «deixam de estar ligados ao teu perfil, mas o registo não é apagável».
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. O que a lei manda guardar, sem dizer de quem é ────────────────
--
-- Dez anos civis subsequentes ao ano do documento — art. 52.º n.º 1 do
-- Código do IVA, e art. 123.º n.º 4 do Código do IRC para o suporte da
-- contabilidade. `retido_ate` é calculado e guardado, e não deduzido na
-- leitura: se a lei mudar, o que já cá está mantém o prazo com que entrou.
--
-- Não tem `user_id`, nem chave estrangeira nenhuma, e é de propósito: uma
-- referência a `auth.users` levava isto com a conta e a retenção deixava de
-- existir no momento exato em que é para existir.
CREATE TABLE IF NOT EXISTS public.faturacao_retida (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'pagamento_consulta' | 'compra_patamar'
  origem        text NOT NULL,
  -- O id da linha original. Serve para não duplicar; não diz de quem era.
  origem_id     uuid NOT NULL,
  -- Pseudónimos estáveis: dois registos da mesma pessoa continuam a
  -- poder ser agrupados, sem que a pessoa possa ser identificada a partir
  -- daqui. Não são reversíveis — não guardamos o id que os gerou.
  vendedor_ref  text,
  comprador_ref text,
  valor_cents   integer,
  moeda         text,
  estado        text,
  stripe_ref    text,
  ocorrido_em   timestamptz,
  retido_em     timestamptz NOT NULL DEFAULT now(),
  retido_ate    date NOT NULL,
  UNIQUE (origem, origem_id)
);

ALTER TABLE public.faturacao_retida ENABLE ROW LEVEL SECURITY;

-- Ninguém lê isto pela API. Não há política de SELECT, e não é esquecimento:
-- um registo que deixou de estar ligado a uma pessoa não pode ser lido por
-- essa pessoa — se pudesse, continuava ligado.
REVOKE ALL ON public.faturacao_retida FROM anon, authenticated;

COMMENT ON TABLE public.faturacao_retida IS
  'Documentos de faturação retidos pelo prazo legal (art. 52.º CIVA), sem ligação a ninguém. A zona de risco prometia esta retenção; o esquema cascateava-a para fora.';


-- ── 2. O pseudónimo ──────────────────────────────────────────────────
--
-- `md5` de um id com um sal fixo por instalação. Não é para resistir a um
-- ataque — é para o registo deixar de nomear a pessoa continuando a poder
-- ser agrupado. O sal está no corpo da função, que é `SECURITY DEFINER` e
-- não é legível por `authenticated`.
CREATE OR REPLACE FUNCTION public.ref_pseudonima(p_id uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_id IS NULL THEN NULL
    ELSE substr(md5('recibo-certo/faturacao-retida/' || p_id::text), 1, 16)
  END
$$;

REVOKE EXECUTE ON FUNCTION public.ref_pseudonima(uuid) FROM anon, authenticated, public;


-- ── 3. Reter antes de cascatear ──────────────────────────────────────
--
-- Chamada no início de `apagar_conjuntos`, dentro da mesma transação. Tem
-- de correr ANTES de `public.contabilistas` sair, porque é essa saída que
-- leva `pagamentos` e `progressao_compras` à frente.
--
-- Copia as duas pontas: as linhas em que a pessoa é o contabilista e as
-- linhas em que é o cliente. A segunda existe porque `pagamentos.cliente_id`
-- também cascateia — e o registo é tão do contabilista como do cliente.
CREATE OR REPLACE FUNCTION public.reter_faturacao(p_utilizador uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE n integer := 0;
BEGIN
  IF p_utilizador IS NULL THEN RETURN 0; END IF;

  -- Só o que chegou a ser uma transação. Um pagamento `pendente` ou
  -- `expirado` não é documento de faturação nenhum, e retê-lo seria
  -- guardar dados a pretexto de uma lei que não os pede.
  INSERT INTO public.faturacao_retida (
    origem, origem_id, vendedor_ref, comprador_ref,
    valor_cents, moeda, estado, stripe_ref, ocorrido_em, retido_ate
  )
  SELECT
    'pagamento_consulta',
    p.id,
    public.ref_pseudonima(p.contabilista_id),
    public.ref_pseudonima(p.cliente_id),
    p.liquido_cents,
    p.moeda,
    p.estado,
    p.stripe_payment_intent_id,
    COALESCE(p.pago_em, p.criado_em),
    make_date(EXTRACT(YEAR FROM COALESCE(p.pago_em, p.criado_em))::int + 10, 12, 31)
  FROM public.pagamentos p
  WHERE (p.contabilista_id = p_utilizador OR p.cliente_id = p_utilizador)
    AND p.estado IN ('pago', 'reembolsado')
  ON CONFLICT (origem, origem_id) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;

  INSERT INTO public.faturacao_retida (
    origem, origem_id, vendedor_ref, comprador_ref,
    valor_cents, moeda, estado, stripe_ref, ocorrido_em, retido_ate
  )
  SELECT
    'compra_patamar',
    c.id,
    NULL,
    public.ref_pseudonima(c.contabilista_id),
    c.final_price_cents,
    c.currency,
    c.estado,
    c.stripe_payment_intent_id,
    COALESCE(c.pago_em, c.criado_em),
    make_date(EXTRACT(YEAR FROM COALESCE(c.pago_em, c.criado_em))::int + 10, 12, 31)
  FROM public.progressao_compras c
  WHERE c.contabilista_id = p_utilizador
    AND c.estado IN ('paid', 'applied', 'refunded', 'needs_refund')
  ON CONFLICT (origem, origem_id) DO NOTHING;

  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reter_faturacao(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.reter_faturacao(uuid) TO service_role;

COMMENT ON FUNCTION public.reter_faturacao(uuid) IS
  'Copia os documentos de faturação para `faturacao_retida` antes de o cascade de `contabilistas` os levar. Sem isto, a promessa de retenção da zona de risco era falsa.';


-- ── 4. Apagar, agora com os cinco conjuntos que faltavam ─────────────
CREATE OR REPLACE FUNCTION public.apagar_conjuntos(p_conjuntos text[])
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  u      uuid := auth.uid();
  linhas jsonb := '{}'::jsonb;
  n      integer;
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;
  IF p_conjuntos IS NULL OR array_length(p_conjuntos, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nada_escolhido');
  END IF;

  -- PRIMEIRO de tudo, e sem depender do que foi escolhido: apagar o perfil
  -- de contabilista cascateia para os pagamentos, e apagar a conta
  -- cascateia para tudo. Reter aqui é a única altura em que os registos
  -- ainda existem para serem retidos.
  PERFORM public.reter_faturacao(u);

  IF 'recibos' = ANY(p_conjuntos) THEN
    DELETE FROM public.recibos WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('recibos', n);
  END IF;

  IF 'vencimentos' = ANY(p_conjuntos) THEN
    DELETE FROM public.recibos_vencimento WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('recibos_vencimento', n);
  END IF;

  IF 'cenarios' = ANY(p_conjuntos) THEN
    DELETE FROM public.cenarios WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('cenarios', n);
  END IF;

  IF 'prazos' = ANY(p_conjuntos) THEN
    DELETE FROM public.prazos_cumpridos WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('prazos_cumpridos', n);
  END IF;

  IF 'perfil-fiscal' = ANY(p_conjuntos) THEN
    UPDATE public.profiles SET preferencias_fiscais = NULL WHERE id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('perfil_fiscal', n);
  END IF;

  IF 'quiz' = ANY(p_conjuntos) THEN
    DELETE FROM public.quiz_question_reports WHERE user_id = u;
    DELETE FROM public.quiz_achievement_progress WHERE user_id = u;
    DELETE FROM public.quiz_sessoes WHERE user_id = u;
    DELETE FROM public.quiz_sessions WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT;
    DELETE FROM public.quiz_profiles WHERE id = u;
    linhas := linhas || jsonb_build_object('quiz', n);
  END IF;

  IF 'quiz-cupoes' = ANY(p_conjuntos) THEN
    DELETE FROM public.quiz_cupoes WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('quiz_cupoes', n);
  END IF;

  IF 'casos' = ANY(p_conjuntos) THEN
    DELETE FROM public.casos WHERE cliente_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('casos', n);
  END IF;

  IF 'partilhas' = ANY(p_conjuntos) THEN
    DELETE FROM public.partilhas WHERE cliente_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('partilhas', n);
  END IF;

  IF 'conversas' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_mensagens m
     USING public.contabilista_vinculos v
     WHERE m.vinculo_id = v.id AND (v.cliente_id = u OR v.contabilista_id = u);
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('mensagens', n);
  END IF;

  IF 'consultas' = ANY(p_conjuntos) THEN
    DELETE FROM public.agendamentos WHERE cliente_id = u OR contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('agendamentos', n);
  END IF;

  -- ⚠️ NOVO. Uma linha desta tabela É a chave de leitura de uma agenda: o
  -- Google, o Apple e o Outlook leem por ela sem sessão nenhuma. Quem a
  -- mandou apagar continuava a ter a agenda a ser lida.
  IF 'calendario' = ANY(p_conjuntos) THEN
    DELETE FROM public.calendario_assinaturas WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('calendario', n);
  END IF;

  IF 'fidelidade' = ANY(p_conjuntos) THEN
    DELETE FROM public.fidelidade_cupoes WHERE cliente_id = u;
    DELETE FROM public.fidelidade_cartoes WHERE cliente_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('fidelidade', n);
  END IF;

  IF 'vinculos' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_vinculos WHERE cliente_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('vinculos', n);
  END IF;

  IF 'trabalho' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_tarefas WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('tarefas', n);
  END IF;

  -- ⚠️ NOVO. Configuração de apresentação do painel do contabilista.
  IF 'painel-vistas' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_dashboard_vistas WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('painel_vistas', n);
  END IF;

  -- ⚠️ NOVO. As três tabelas de percurso. `progressao_compras` NÃO está
  -- aqui: é um documento de faturação, foi separada para `compras-patamar`
  -- e é retida — ver `reter_faturacao`.
  IF 'progressao' = ANY(p_conjuntos) THEN
    DELETE FROM public.progressao_eventos WHERE contabilista_id = u;
    DELETE FROM public.creditos_fidelidade_ledger WHERE contabilista_id = u;
    DELETE FROM public.contabilista_progressao WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('progressao', n);
  END IF;

  -- ⚠️ NOVO. Liberta o lugar para outra pessoa.
  IF 'fundador' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_fundadores WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('fundador', n);
  END IF;

  -- ⚠️ NOVO.
  IF 'propostas-desbloqueio' = ANY(p_conjuntos) THEN
    DELETE FROM public.desbloqueio_propostas WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('propostas_desbloqueio', n);
  END IF;

  -- ⚠️ NOVO. A ligação à conta de recebimentos. Estava retida sob a
  -- justificação legal que só cobre os pagamentos, o que deixava a pessoa
  -- sem forma nenhuma de a desligar.
  IF 'stripe-ligacao' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_stripe WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('stripe_ligacao', n);
  END IF;

  -- ⚠️ NOVO. As versões das regras do cartão de fidelidade.
  IF 'fidelidade-regras' = ANY(p_conjuntos) THEN
    DELETE FROM public.fidelidade_regras WHERE contabilista_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('fidelidade_regras', n);
  END IF;

  -- Por último dos do contabilista: é esta saída que cascateia para as
  -- outras, e a retenção já correu lá em cima.
  IF 'perfil-contabilista' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_tipos_consulta WHERE contabilista_id = u;
    DELETE FROM public.contabilista_excecoes WHERE contabilista_id = u;
    DELETE FROM public.contabilista_disponibilidade WHERE contabilista_id = u;
    DELETE FROM public.contabilistas WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('contabilista', n);
  END IF;

  IF 'candidatura' = ANY(p_conjuntos) THEN
    DELETE FROM public.contabilista_pedidos WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('candidatura', n);
  END IF;

  IF 'alertas' = ANY(p_conjuntos) THEN
    DELETE FROM public.alertas_guardiao WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('alertas', n);
  END IF;

  IF 'notificacoes' = ANY(p_conjuntos) THEN
    DELETE FROM public.notificacoes WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('notificacoes', n);
  END IF;

  IF 'parcerias' = ANY(p_conjuntos) THEN
    DELETE FROM public.partner_handoffs WHERE user_id = u;
    DELETE FROM public.partner_connections WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('parcerias', n);
  END IF;

  IF 'feedback' = ANY(p_conjuntos) THEN
    DELETE FROM public.site_feedback WHERE user_id = u;
    GET DIAGNOSTICS n = ROW_COUNT; linhas := linhas || jsonb_build_object('feedback', n);
  END IF;

  INSERT INTO public.conta_apagamentos (utilizador, conjuntos, linhas, concluido_em)
  VALUES (u::text, p_conjuntos, linhas, now());

  RETURN jsonb_build_object('ok', true, 'linhas', linhas);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apagar_conjuntos(text[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.apagar_conjuntos(text[]) TO authenticated, service_role;


-- ── 5. A lista completa ──────────────────────────────────────────────
--
-- Tem de bater certo com `APAGAVEIS` em `src/lib/conta/catalogo.ts`. Já
-- não é disciplina: `conta-catalogo.test.ts` lê este texto e compara.
CREATE OR REPLACE FUNCTION public.conjuntos_todos()
RETURNS text[]
LANGUAGE sql IMMUTABLE
AS $$
  SELECT ARRAY[
    'recibos','vencimentos','cenarios','prazos','perfil-fiscal',
    'quiz','quiz-cupoes','casos',
    'partilhas','conversas','consultas','calendario','fidelidade','vinculos',
    'painel-vistas','progressao','fundador','propostas-desbloqueio',
    'stripe-ligacao','fidelidade-regras',
    'perfil-contabilista','trabalho','candidatura',
    'alertas','notificacoes','parcerias','feedback'
  ]
$$;


-- ── 6. O inventário, com uma chave por conjunto ──────────────────────
--
-- Sem chave, a interface desativava a linha e a pessoa não conseguia
-- escolher o que existia mesmo. Os conjuntos retidos entram também: a
-- interface precisa de saber se a pessoa TEM pagamentos para lhe explicar
-- o que fica — e mostrava «Recebimentos e conta Stripe» a toda a gente,
-- incluindo a quem nunca foi contabilista.
CREATE OR REPLACE FUNCTION public.inventario_do_utilizador()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
DECLARE u uuid := auth.uid(); r jsonb := '{}'::jsonb;
BEGIN
  IF u IS NULL THEN RETURN r; END IF;

  SELECT jsonb_build_object(
    'recibos',      (SELECT count(*) FROM public.recibos WHERE user_id = u),
    'vencimentos',  (SELECT count(*) FROM public.recibos_vencimento WHERE user_id = u),
    'cenarios',     (SELECT count(*) FROM public.cenarios WHERE user_id = u),
    'prazos',       (SELECT count(*) FROM public.prazos_cumpridos WHERE user_id = u),
    'perfil-fiscal',(SELECT count(*) FROM public.profiles
                      WHERE id = u AND preferencias_fiscais IS NOT NULL),
    'quiz',         (SELECT count(*) FROM public.quiz_sessoes WHERE user_id = u)
                  + (SELECT count(*) FROM public.quiz_achievement_progress WHERE user_id = u),
    'quiz-cupoes',  (SELECT count(*) FROM public.quiz_cupoes WHERE user_id = u),
    'casos',        (SELECT count(*) FROM public.casos WHERE cliente_id = u),
    'partilhas',    (SELECT count(*) FROM public.partilhas WHERE cliente_id = u),
    'conversas',    (SELECT count(*) FROM public.contabilista_mensagens WHERE autor_id = u),
    'consultas',    (SELECT count(*) FROM public.agendamentos
                      WHERE cliente_id = u OR contabilista_id = u),
    'calendario',   (SELECT count(*) FROM public.calendario_assinaturas WHERE user_id = u),
    'fidelidade',   (SELECT count(*) FROM public.fidelidade_cartoes WHERE cliente_id = u),
    'vinculos',     (SELECT count(*) FROM public.contabilista_vinculos WHERE cliente_id = u),
    'perfil-contabilista', (SELECT count(*) FROM public.contabilistas WHERE user_id = u),
    'painel-vistas',(SELECT count(*) FROM public.contabilista_dashboard_vistas
                      WHERE contabilista_id = u),
    'progressao',   (SELECT count(*) FROM public.progressao_eventos WHERE contabilista_id = u)
                  + (SELECT count(*) FROM public.creditos_fidelidade_ledger WHERE contabilista_id = u),
    'compras-patamar', (SELECT count(*) FROM public.progressao_compras WHERE contabilista_id = u),
    'fundador',     (SELECT count(*) FROM public.contabilista_fundadores WHERE contabilista_id = u),
    'propostas-desbloqueio', (SELECT count(*) FROM public.desbloqueio_propostas
                               WHERE contabilista_id = u),
    'recebimentos', (SELECT count(*) FROM public.pagamentos WHERE contabilista_id = u),
    'stripe-ligacao', (SELECT count(*) FROM public.contabilista_stripe WHERE contabilista_id = u),
    'fidelidade-regras', (SELECT count(*) FROM public.fidelidade_regras WHERE contabilista_id = u),
    'trabalho',     (SELECT count(*) FROM public.contabilista_tarefas WHERE contabilista_id = u),
    'candidatura',  (SELECT count(*) FROM public.contabilista_pedidos WHERE user_id = u),
    'alertas',      (SELECT count(*) FROM public.alertas_guardiao WHERE user_id = u),
    'notificacoes', (SELECT count(*) FROM public.notificacoes WHERE user_id = u),
    'parcerias',    (SELECT count(*) FROM public.partner_connections WHERE user_id = u),
    'subscricao',   (SELECT count(*) FROM public.subscriptions WHERE user_id = u),
    'feedback',     (SELECT count(*) FROM public.site_feedback WHERE user_id = u)
  ) INTO r;

  RETURN r;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.inventario_do_utilizador() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.inventario_do_utilizador() TO authenticated, service_role;

COMMENT ON FUNCTION public.apagar_conjuntos(text[]) IS
  'Uma transação, na ordem das dependências. Cinco conjuntos declarados apagáveis não tinham aqui bloco nenhum: a rota respondia «apagado» e as linhas ficavam.';

COMMIT;
