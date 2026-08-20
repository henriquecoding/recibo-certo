-- 20260820090000_o_contrato_publico_fecha_a_tabela.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O PASSO SEGUINTE DA 20260815200000 — AGORA QUE O FRONTEND JÁ LÊ A VIEW
--  ---------------------------------------------------------------------
--  A 20260815200000 criou `contabilistas_publico` e deixou escrito, no fim
--  do ficheiro, o SQL que fecharia a tabela. Ficou por aplicar. Onze meses
--  de migrações depois, a política aberta continua de pé, e é isto que ela
--  significa em produção hoje:
--
--    contabilistas_diretorio_publico FOR SELECT TO anon, authenticated
--      USING (estado = 'aprovado')
--
--  RLS escolhe LINHAS, não colunas. Quem não tem sessão nenhuma pede a
--  linha inteira de qualquer contabilista aprovado e recebe `telefone`,
--  `linkedin_subject` (o `sub` do OIDC — um identificador de correlação de
--  identidade), `pedido_id`, e tudo o que a verificação da Ordem guarda.
--  Nenhum ecrã mostra nada disso. O diretório nunca precisou.
--
--  E os grants estavam pior do que a política: `anon` e `authenticated`
--  tinham SELECT, UPDATE, REFERENCES, TRIGGER e TRUNCATE em TODAS as
--  colunas. O que impedia um `UPDATE` anónimo não era o privilégio, era a
--  falta de política — uma segunda tranca a segurar uma porta que estava
--  destrancada.
--
--  ---------------------------------------------------------------------
--  A REGRA DE PRODUTO QUE ESTA MIGRAÇÃO PASSA A IMPOR
--
--    Antes de o contabilista aceitar a pessoa como cliente, o que é
--    público sobre ele é NOME, OCC e LINKEDIN. Email, telefone, site e
--    qualquer outro canal direto só existem depois da aceitação.
--
--  O LinkedIn fica público de propósito, e não por esquecimento: é o
--  instrumento de validação profissional que não depende de nós. Quem
--  quiser confirmar quem está do outro lado consegue fazê-lo sem pedir
--  autorização a ninguém. O que continua privado é a identidade TÉCNICA
--  dessa ligação — `linkedin_subject`, claims, tokens.
--
--  O email e o site SAEM do contrato público. Estavam lá por uma decisão
--  anterior, e o comentário da view dizia-o com todas as letras. A decisão
--  mudou; o esquema muda com ela, e o editor de perfil passa a dizer a
--  verdade nova.
--
--  ---------------------------------------------------------------------
--  Forward-only. Nenhuma migração já aplicada é reescrita — o que muda
--  muda aqui, com data posterior, e a 042 continua a ser o registo
--  histórico do dia em que a política aberta foi criada.
--
--  Idempotente: aplicar duas vezes dá o mesmo resultado.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
--  1. O DONO DO CONTRATO PÚBLICO
-- ═══════════════════════════════════════════════════════════════════
--  A view corre com `security_invoker = false`: os privilégios de quem a
--  lê são irrelevantes, valem os do DONO. É esse o mecanismo que a faz
--  continuar a servir o diretório depois de a política pública sair.
--
--  Só que o dono era o `postgres`, e o `postgres` do Supabase tem
--  BYPASSRLS. Uma view assim não tem fronteira nenhuma: se alguém lhe
--  acrescentar amanhã um `JOIN` a uma tabela privada, RLS nenhuma o
--  impede — nem a da tabela nova, nem a de `contabilistas`. A lista de
--  colunas era a ÚNICA coisa entre o público e o resto da base de dados,
--  e uma lista é um documento, não uma tranca.
--
--  Passa a haver um papel só para isto: sem login, sem BYPASSRLS, e com
--  exatamente três autorizações de leitura, dadas uma a uma. Uma coluna
--  nova numa tabela que ele não pode ler continua a não poder ser lida.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'contrato_publico') THEN
    CREATE ROLE contrato_publico NOLOGIN;
  END IF;
END $$;

--  Um papel sem login não é assumível por ninguém que venha da API: nem
--  `anon`, nem `authenticated`, nem a chave de serviço. Chega-se-lhe pela
--  view e por mais nada.
ALTER ROLE contrato_publico NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;

COMMENT ON ROLE contrato_publico IS
  'Dono de `contabilistas_publico`. Sem login e sem BYPASSRLS: a view lê o que as políticas deste papel deixam ler, e nada mais. Não conceder aqui nada que não seja para ser público.';

GRANT USAGE ON SCHEMA public TO contrato_publico;

-- ── 1.1 O que este papel pode ler ───────────────────────────────────
--  Sem BYPASSRLS, a view passa a estar sujeita a RLS como qualquer outro
--  leitor. Estas três políticas são o alcance total dela.
GRANT SELECT ON public.contabilistas      TO contrato_publico;
GRANT SELECT ON public.fidelidade_regras  TO contrato_publico;
GRANT SELECT ON public.contabilista_stripe TO contrato_publico;

DROP POLICY IF EXISTS "contabilistas_contrato_publico_le" ON public.contabilistas;
CREATE POLICY "contabilistas_contrato_publico_le" ON public.contabilistas
  FOR SELECT TO contrato_publico
  USING (estado = 'aprovado');

--  A regra corrente de fidelidade de um contabilista aprovado. É o que o
--  cartão do diretório mostra: se há cartão, quantos carimbos e quanto
--  desconto. As regras substituídas não interessam a ninguém de fora.
DROP POLICY IF EXISTS "fidelidade_regras_contrato_publico_le" ON public.fidelidade_regras;
CREATE POLICY "fidelidade_regras_contrato_publico_le" ON public.fidelidade_regras
  FOR SELECT TO contrato_publico
  USING (substituida_em IS NULL);

--  ⚠️ A tabela da Stripe é privada e continua a sê-lo. Desta linha sai UM
--  facto para a view — `charges_enabled` — e a política existe para que a
--  view o possa ler sem ganhar acesso a mais nada. Quem vir «não recebe
--  pagamentos» não distingue «nunca ligou» de «tem um documento por
--  enviar», e é o pretendido: que a Stripe pediu um documento a alguém é
--  informação privada, e das que fazem perder um cliente por uma razão
--  que não é dele.
DROP POLICY IF EXISTS "contabilista_stripe_contrato_publico_le" ON public.contabilista_stripe;
CREATE POLICY "contabilista_stripe_contrato_publico_le" ON public.contabilista_stripe
  FOR SELECT TO contrato_publico
  USING (true);

-- ═══════════════════════════════════════════════════════════════════
--  2. A VIEW, SEM O EMAIL E SEM O SITE
-- ═══════════════════════════════════════════════════════════════════
--  `DROP` antes de `CREATE`, nunca `CREATE OR REPLACE`: esta definição
--  RETIRA duas colunas do meio da lista, e o `REPLACE` só sabe acrescentar
--  no fim — recusaria com «42P16: cannot drop columns from view». Vale
--  para todas as definições desta série; ver a mesma nota em
--  20260815200000, 20260815210000, 20260815230000 e 20260818054500.
DROP VIEW IF EXISTS public.contabilistas_publico;
CREATE VIEW public.contabilistas_publico
WITH (security_invoker = false) AS
SELECT
  c.user_id,
  c.slug,
  c.nome,
  -- ── Identidade verificável ────────────────────────────────────────
  c.occ,
  (
    c.occ_verificado_ate IS NOT NULL
    AND c.occ_verificado_ate > now()
    AND c.occ_numero_confirmado IS NOT NULL
    AND c.occ_numero_confirmado
        = NULLIF(ltrim(regexp_replace(COALESCE(c.occ, ''), '\D', '', 'g'), '0'), '')
  ) AS occ_verificado,
  CASE WHEN c.occ_verificado_ate > now() THEN c.occ_verificado_metodo END AS occ_verificado_metodo,
  CASE WHEN c.occ_verificado_ate > now() THEN c.occ_verificado_em     END AS occ_verificado_em,
  CASE WHEN c.occ_verificado_ate > now() THEN c.occ_verificado_ate    END AS occ_verificado_ate,
  -- ── Perfil profissional, publicado pelo próprio ───────────────────
  --  Isto não são contactos: é o que ajuda alguém a escolher. Tirá-lo
  --  daqui não fecharia uma fuga, fecharia o diretório.
  c.titulo_profissional,
  c.apresentacao_curta,
  c.bio,
  c.distrito,
  c.concelho,
  c.especialidades,
  c.modalidades,
  c.idiomas,
  c.anos_experiencia,
  c.resposta_media_horas,
  c.perfil_blocos,
  c.perfil_termos,
  c.cobertura,
  -- ── LinkedIn: público de propósito ────────────────────────────────
  --  É a validação profissional que não depende de nós. A URL canónica
  --  sai, e a identidade técnica da ligação (`linkedin_subject`) nunca.
  --  ⚠️ Nenhum comentário DENTRO desta view leva ponto e vírgula, e é de
  --  propósito. O teste que guarda a última definição da view corta o
  --  corpo no primeiro que encontrar, e um escondido num comentário
  --  truncava-o a meio — a asserção passava a olhar para meia view.
  c.linkedin_url,
  c.linkedin_avatar_url,
  (c.linkedin_ligado_em IS NOT NULL) AS linkedin_ligado,
  -- ── Condições de trabalho ─────────────────────────────────────────
  c.aceita_novos_clientes,
  c.preco_consulta_cents,
  c.duracao_consulta_min,
  coalesce(r.ativa, false)                                   AS fidelidade_ativa,
  CASE WHEN coalesce(r.ativa, false) THEN r.meta         END AS fidelidade_meta,
  CASE WHEN coalesce(r.ativa, false) THEN r.desconto_pct END AS fidelidade_desconto_pct,
  COALESCE(s.charges_enabled, false) AS recebe_pagamentos,
  c.criado_em
  -- ── O que SAIU, e porquê ──────────────────────────────────────────
  --  `email_contacto` e `website` estavam aqui por uma decisão de produto
  --  anterior — o editor de perfil dizia, na própria página, que era isto
  --  que aparecia no diretório. A decisão mudou: são canais diretos, e
  --  canais diretos abrem-se com a aceitação, não com a pesquisa. Saem
  --  por `contacto_do_contabilista`, a quem tem vínculo vivo.
  --
  --  `telefone`, `linkedin_subject`, `pedido_id`, `estado` e as colunas de
  --  auditoria da verificação nunca cá estiveram e não podem cá entrar:
  --  ver `assert_contrato_publico_contabilistas()` no fim deste ficheiro.
FROM public.contabilistas c
LEFT JOIN public.fidelidade_regras r
       ON r.contabilista_id = c.user_id AND r.substituida_em IS NULL
LEFT JOIN public.contabilista_stripe s
       ON s.contabilista_id = c.user_id
WHERE c.estado = 'aprovado';

ALTER VIEW public.contabilistas_publico OWNER TO contrato_publico;

COMMENT ON VIEW public.contabilistas_publico IS
  'O contrato público do diretório e do perfil. Nome, OCC e LinkedIn identificam; o perfil profissional ajuda a escolher. Nenhum canal direto sai daqui — email, telefone e site saem por contacto_do_contabilista, a quem tem vínculo vivo. Acrescentar uma coluna aqui é uma decisão explícita, e assert_contrato_publico_contabilistas() recusa as que nunca podem entrar.';

--  Os grants são refeitos DEPOIS da mudança de dono: o `ALTER ... OWNER`
--  remapeia o concedente, e um grant dado antes ficaria com o `postgres`
--  como origem.
GRANT SELECT ON public.contabilistas_publico TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
--  3. A TABELA FECHA
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "contabilistas_diretorio_publico" ON public.contabilistas;

--  `anon` deixa de ter alguma coisa a fazer nesta tabela. Lê a view.
REVOKE ALL ON public.contabilistas FROM anon;

--  `authenticated` recomeça do zero e recebe só o que os fluxos reais
--  precisam. SELECT continua a ser a tabela toda porque a POLÍTICA é que
--  escolhe as linhas — `contabilistas_proprio_le` dá a linha do próprio e,
--  à administração, todas. Um estranho autenticado recebe zero linhas.
REVOKE ALL ON public.contabilistas FROM authenticated;
GRANT SELECT ON public.contabilistas TO authenticated;

--  O UPDATE passa a ser por coluna. Antes era a tabela inteira: com a
--  política do próprio, um contabilista podia reescrever o seu `slug`
--  (roubando o de outro), o `pedido_id` e o `linkedin_subject`. Estas são
--  as colunas que o editor de perfil escreve, e mais nenhuma.
--
--  `occ_pedido_em` entra porque pedir verificação não é confirmá-la — é a
--  única coluna de verificação que o próprio escreve, e o trigger
--  `contabilistas_tranca_occ` guarda as outras oito.
GRANT UPDATE (
  nome, occ, bio, distrito, concelho, especialidades, modalidades,
  email_contacto, telefone, website,
  aceita_novos_clientes, preco_consulta_cents, duracao_consulta_min,
  fidelidade_meta, fidelidade_desconto_pct, fidelidade_ativa,
  titulo_profissional, apresentacao_curta, idiomas, anos_experiencia,
  resposta_media_horas, perfil_blocos, perfil_termos, cobertura,
  linkedin_url, occ_pedido_em
) ON public.contabilistas TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
--  4. O CONTACTO PRIVADO PASSA A INCLUIR O SITE
-- ═══════════════════════════════════════════════════════════════════
--  O site saiu do contrato público na secção 2. Se ficasse só por aí,
--  desaparecia do produto — e não é isso que se decidiu: é um canal
--  direto, e canais diretos pertencem a quem já é cliente.
--
--  ⚠️ MUDA DE NOME, e não é cosmético. `contacto_do_contabilista` devolvia
--  duas colunas; esta devolve três. Mantendo o nome e a assinatura de
--  argumentos, o `CREATE OR REPLACE` da 20260815200000 recusaria a segunda
--  aplicação com «42P13: cannot change return type of existing function» —
--  e uma migração antiga não se reescreve para acomodar uma nova. Com nome
--  novo são duas funções distintas: a antiga é largada aqui, e se alguém
--  reaplicar o conjunto todo ela volta a nascer e volta a ser largada,
--  sem erro e sem sobrevivência.
--
--  O plural também diz melhor o que isto é: não é «o contacto», são os
--  TRÊS canais diretos, e os três abrem-se ao mesmo tempo — com a
--  aceitação.
DROP FUNCTION IF EXISTS public.contacto_do_contabilista(uuid);

DROP FUNCTION IF EXISTS public.contactos_do_contabilista(uuid);
CREATE FUNCTION public.contactos_do_contabilista(p_contabilista uuid)
RETURNS TABLE (email_contacto text, telefone text, website text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.email_contacto, c.telefone, c.website
    FROM public.contabilistas c
   WHERE c.user_id = p_contabilista
     AND c.estado = 'aprovado'
     AND (
          c.user_id = (SELECT auth.uid())
       OR public.vinculo_nao_terminado(p_contabilista, (SELECT auth.uid()))
     );
$$;

REVOKE EXECUTE ON FUNCTION public.contactos_do_contabilista(uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.contactos_do_contabilista(uuid) TO authenticated;

COMMENT ON FUNCTION public.contactos_do_contabilista(uuid) IS
  'Email, telefone e site do contabilista — os três canais diretos, e os três privados. Só para o próprio e para quem tem vínculo vivo (pedido pendente não conta, terminado deixa de contar). O contabilista tem de estar aprovado: uma suspensão corta o contacto no mesmo instante em que corta o diretório.';

-- ═══════════════════════════════════════════════════════════════════
--  5. A GUARDA
-- ═══════════════════════════════════════════════════════════════════
--  Sem isto, a correção dura até alguém precisar de um campo novo no
--  diretório e recriar a política aberta — que é a solução óbvia para quem
--  não leu este ficheiro. A guarda de 20260815200000 verificava uma coisa;
--  esta verifica quatro, porque foram quatro as maneiras de o contrato se
--  ter partido:
--
--    (a) uma política de SELECT aberta a `anon` na tabela;
--    (b) um privilégio de `anon` na tabela, com ou sem política;
--    (c) uma coluna proibida na view;
--    (d) a view a voltar a ser dona de si mesma pelo `postgres` — o que
--        acontece SEM AVISO se alguém a redefinir sem repor o dono, e que
--        lhe devolveria o BYPASSRLS.
CREATE OR REPLACE FUNCTION public.assert_contrato_publico_contabilistas()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_politicas text[];
  v_colunas   text[];
  v_dono      text;
  --  As colunas que NUNCA podem ser públicas. Não é a lista do que está
  --  fora da view: é a lista do que não pode entrar nela.
  --   · os três canais diretos, que pertencem a quem já é cliente;
  --   · os identificadores internos, que não pertencem a ninguém de fora;
  --   · a auditoria da verificação — o selo é público, a prova não é;
  --   · `estado`, que diria «suspenso» sobre quem a view já não devolve.
  c_proibidas constant text[] := ARRAY[
    'email_contacto', 'telefone', 'website',
    'linkedin_subject', 'pedido_id', 'estado',
    'occ_evidencia', 'occ_numero_confirmado', 'occ_verificado_por',
    'occ_pedido_em', 'occ_recusa_motivo', 'occ_recusado_em'
  ];
BEGIN
  -- (a) ────────────────────────────────────────────────────────────
  SELECT array_agg(policyname ORDER BY policyname) INTO v_politicas
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'contabilistas'
     AND cmd IN ('SELECT', 'ALL')
     AND ('anon'::name = ANY (roles) OR 'public'::name = ANY (roles));

  IF v_politicas IS NOT NULL THEN
    RAISE EXCEPTION
      'contabilistas tem política de SELECT aberta a anon (%). O contrato público é a view contabilistas_publico.',
      array_to_string(v_politicas, ', ');
  END IF;

  -- (b) ────────────────────────────────────────────────────────────
  --  Uma política é só metade: sem privilégio, a política não chega a ser
  --  consultada, e com privilégio basta alguém recriar a política para a
  --  fuga voltar inteira.
  IF has_any_column_privilege('anon', 'public.contabilistas', 'SELECT')
     OR has_any_column_privilege('anon', 'public.contabilistas', 'UPDATE')
     OR has_any_column_privilege('anon', 'public.contabilistas', 'INSERT') THEN
    RAISE EXCEPTION
      'anon tem privilégios em contabilistas. O diretório lê contabilistas_publico; a tabela não é dele.';
  END IF;

  -- (c) ────────────────────────────────────────────────────────────
  SELECT array_agg(a.attname::text ORDER BY a.attname) INTO v_colunas
    FROM pg_attribute a
   WHERE a.attrelid = 'public.contabilistas_publico'::regclass
     AND a.attnum > 0
     AND NOT a.attisdropped
     AND a.attname::text = ANY (c_proibidas);

  IF v_colunas IS NOT NULL THEN
    RAISE EXCEPTION
      'contabilistas_publico expõe %. Nome, OCC e LinkedIn identificam; canais diretos e identificadores internos não são públicos.',
      array_to_string(v_colunas, ', ');
  END IF;

  -- (d) ────────────────────────────────────────────────────────────
  SELECT r.rolname::text INTO v_dono
    FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner
   WHERE c.oid = 'public.contabilistas_publico'::regclass;

  IF EXISTS (SELECT 1 FROM pg_roles
              WHERE rolname = v_dono AND (rolbypassrls OR rolcanlogin)) THEN
    RAISE EXCEPTION
      'contabilistas_publico é de %, que tem login ou BYPASSRLS. Uma view security_invoker=false com esse dono não tem fronteira nenhuma — repõe: ALTER VIEW public.contabilistas_publico OWNER TO contrato_publico;',
      v_dono;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_contrato_publico_contabilistas() IS
  'Recusa as quatro maneiras de o contrato público se partir: política aberta a anon, privilégio de anon na tabela, coluna proibida na view, e dono da view com login ou BYPASSRLS. Corre no fim de cada migração que toque no contrato, e na suíte de RLS.';

--  Corre agora. Se esta migração deixou alguma coisa por fechar, é aqui
--  que ela pára — dentro da transação, sem chegar a produção.
SELECT public.assert_contrato_publico_contabilistas();

COMMIT;
