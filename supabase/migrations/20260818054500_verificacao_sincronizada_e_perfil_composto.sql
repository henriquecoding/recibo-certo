-- 20260818054500_verificacao_sincronizada_e_perfil_composto.sql
-- ═══════════════════════════════════════════════════════════════════════
--  A VERIFICAÇÃO DEIXA DE SER UM CARIMBO, E O PERFIL DEIXA DE SER UM FORMULÁRIO
--  ---------------------------------------------------------------------
--  Duas mudanças, e a mesma razão por trás das duas: o que estava aqui
--  não conseguia dizer a verdade sobre uma pessoa.
--
--  (A) VERIFICAÇÃO
--
--  Havia `occ_verificado_em` e `occ_verificado_por`. Isso responde a
--  «quando» e a «quem», e não responde às outras duas perguntas que um
--  cliente faz sem dar por isso ao ver o selo: confirmado COMO, e isso
--  ainda é verdade HOJE?
--
--  A segunda é a que parte tudo. Uma inscrição na Ordem pode ser suspensa
--  ou cancelada, e a própria Ordem publica esses movimentos de trimestre a
--  trimestre (art. 21.º, n.º 2 do EOCC). Um carimbo sem prazo continuaria
--  a afirmar «verificado» anos depois sobre quem já não é membro — e nesse
--  dia o selo é uma mentira com a nossa assinatura.
--
--  Passa a haver método, evidência e VALIDADE. O selo público deixa de ser
--  «foi verificado alguma vez» e passa a ser «está verificado agora»:
--
--      occ_verificado = occ_verificado_ate > now()
--
--  A view faz essa conta. Nenhum cliente da API pode enganar-se nela
--  porque nenhum cliente da API a faz.
--
--  (B) PERFIL COMPOSTO
--
--  O perfil tinha campos fixos: bio, especialidades de uma lista de dez,
--  um distrito, um concelho. Duas pessoas com práticas opostas saíam com
--  páginas indistinguíveis.
--
--  Entram três colunas JSONB — blocos, termos próprios e cobertura — que
--  são a persistência dos motores em `src/lib/contabilistas/personalizacao/`.
--  O Postgres impõe aqui a forma e os limites; o motor impõe o sentido.
--  Nenhum dos dois confia no outro, e é por isso que a regra vale mesmo:
--  quem escrever na base de dados por fora do formulário encontra os
--  mesmos limites.
--
--  A liberdade é sobre o CONTEÚDO. Não há HTML, não há estilos à escolha,
--  não há bloco de testemunhos nem de métricas — pelas mesmas razões de
--  sempre: um testemunho escrito pelo próprio não é prova de nada, e uma
--  percentagem que ninguém mediu é um número inventado.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
--  A. VERIFICAÇÃO
-- ═══════════════════════════════════════════════════════════════════

-- ── A.1 As colunas que faltavam ─────────────────────────────────────
ALTER TABLE public.contabilistas
  ADD COLUMN IF NOT EXISTS occ_verificado_metodo text,
  ADD COLUMN IF NOT EXISTS occ_verificado_ate timestamptz,
  ADD COLUMN IF NOT EXISTS occ_numero_confirmado text,
  ADD COLUMN IF NOT EXISTS occ_evidencia jsonb,
  ADD COLUMN IF NOT EXISTS occ_pedido_em timestamptz,
  ADD COLUMN IF NOT EXISTS occ_recusa_motivo text,
  ADD COLUMN IF NOT EXISTS occ_recusado_em timestamptz;

ALTER TABLE public.contabilistas
  DROP CONSTRAINT IF EXISTS contabilistas_occ_metodo_conhecido;
ALTER TABLE public.contabilistas
  ADD CONSTRAINT contabilistas_occ_metodo_conhecido
  CHECK (occ_verificado_metodo IS NULL
         OR occ_verificado_metodo IN ('scap', 'registo_publico', 'documento'));

--  Uma verificação sem prazo é o problema que esta migração existe para
--  resolver. Se há método, há data e há validade — as três ou nenhuma.
ALTER TABLE public.contabilistas
  DROP CONSTRAINT IF EXISTS contabilistas_occ_verificacao_completa;
ALTER TABLE public.contabilistas
  ADD CONSTRAINT contabilistas_occ_verificacao_completa
  CHECK (
    (occ_verificado_metodo IS NULL
      AND occ_verificado_em IS NULL
      AND occ_verificado_ate IS NULL)
    OR
    (occ_verificado_metodo IS NOT NULL
      AND occ_verificado_em IS NOT NULL
      AND occ_verificado_ate IS NOT NULL
      AND occ_verificado_ate > occ_verificado_em
      AND occ_numero_confirmado IS NOT NULL)
  ) NOT VALID;

--  `NOT VALID` porque as linhas antigas têm `occ_verificado_em` sem método
--  nem validade. São arrumadas em A.2, e a restrição é validada a seguir.

ALTER TABLE public.contabilistas
  DROP CONSTRAINT IF EXISTS contabilistas_occ_numero_confirmado_forma;
ALTER TABLE public.contabilistas
  ADD CONSTRAINT contabilistas_occ_numero_confirmado_forma
  CHECK (occ_numero_confirmado IS NULL
         OR occ_numero_confirmado ~ '^[1-9][0-9]{0,6}$');

ALTER TABLE public.contabilistas
  DROP CONSTRAINT IF EXISTS contabilistas_occ_recusa_com_motivo;
ALTER TABLE public.contabilistas
  ADD CONSTRAINT contabilistas_occ_recusa_com_motivo
  CHECK ((occ_recusado_em IS NULL AND occ_recusa_motivo IS NULL)
         OR (occ_recusado_em IS NOT NULL AND char_length(occ_recusa_motivo) BETWEEN 10 AND 500));

COMMENT ON COLUMN public.contabilistas.occ_verificado_ate IS
  'Até quando o selo vale. Passada esta data o perfil público deixa de o mostrar — a inscrição pode ter sido suspensa entretanto, e a Ordem publica esses movimentos por trimestre.';
COMMENT ON COLUMN public.contabilistas.occ_evidencia IS
  'O que foi lido na fonte, para responder a «com base em quê?» meses depois sem depender da memória de ninguém. Não guarda a morada do registo: não é precisa para provar a inscrição.';
COMMENT ON COLUMN public.contabilistas.occ_numero_confirmado IS
  'O número que FOI verificado — não o que está na ficha. Se forem diferentes, não há selo.';

-- ── A.2 As verificações antigas ─────────────────────────────────────
--  Foram feitas por uma pessoa, contra o registo público, e não deixam
--  de valer por a migração ter chegado depois. Ganham o método que
--  tiveram e a validade que lhes cabe a contar da data em que foram
--  feitas — o que significa que as antigas entram já expiradas, e é o
--  comportamento certo: ninguém confirmou nada este trimestre.
--  O número é normalizado à mesma forma canónica que o motor usa: só
--  dígitos, sem zeros à esquerda. Sem o `ltrim`, «012345» entra como
--  «012345», a restrição de forma recusa-o, e a migração pára — que foi
--  exactamente o que aconteceu ao correr isto pela primeira vez.
UPDATE public.contabilistas
   SET occ_verificado_metodo   = 'registo_publico',
       occ_numero_confirmado   = NULLIF(ltrim(regexp_replace(COALESCE(occ, ''), '\D', '', 'g'), '0'), ''),
       occ_verificado_ate      = occ_verificado_em + interval '90 days'
 WHERE occ_verificado_em IS NOT NULL
   AND occ_verificado_metodo IS NULL
   AND NULLIF(ltrim(regexp_replace(COALESCE(occ, ''), '\D', '', 'g'), '0'), '') IS NOT NULL;

--  Uma verificação antiga sem número legível não é recuperável: fica sem
--  método, e a pessoa é convidada a pedir de novo.
UPDATE public.contabilistas
   SET occ_verificado_em = NULL, occ_verificado_por = NULL
 WHERE occ_verificado_em IS NOT NULL AND occ_verificado_metodo IS NULL;

UPDATE public.contabilistas
   SET occ_verificado_metodo = NULL, occ_verificado_em = NULL,
       occ_verificado_ate = NULL, occ_verificado_por = NULL
 WHERE occ_verificado_metodo IS NOT NULL AND occ_numero_confirmado IS NULL;

ALTER TABLE public.contabilistas
  VALIDATE CONSTRAINT contabilistas_occ_verificacao_completa;

-- ── A.3 O trigger cresce com o modelo ───────────────────────────────
--  O trigger antigo trancava duas colunas. Agora são nove, e a lista tem
--  de estar completa: uma coluna de verificação esquecida aqui é uma
--  coluna que o próprio contabilista consegue escrever a si mesmo.
CREATE OR REPLACE FUNCTION public.contabilistas_tranca_verificacao_occ()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.occ_verificado_em     IS DISTINCT FROM OLD.occ_verificado_em
    OR NEW.occ_verificado_por    IS DISTINCT FROM OLD.occ_verificado_por
    OR NEW.occ_verificado_metodo IS DISTINCT FROM OLD.occ_verificado_metodo
    OR NEW.occ_verificado_ate    IS DISTINCT FROM OLD.occ_verificado_ate
    OR NEW.occ_numero_confirmado IS DISTINCT FROM OLD.occ_numero_confirmado
    OR NEW.occ_evidencia         IS DISTINCT FROM OLD.occ_evidencia
    OR NEW.occ_recusa_motivo     IS DISTINCT FROM OLD.occ_recusa_motivo
    OR NEW.occ_recusado_em       IS DISTINCT FROM OLD.occ_recusado_em THEN
      RAISE EXCEPTION 'A verificação do número OCC só é feita pela administração.';
    END IF;
  END IF;

  --  Mudar o número apaga TUDO o que dizia respeito ao número antigo.
  --  Sem isto, verificava-se um número e trocava-se depois por outro,
  --  ficando com o selo — que é exactamente a fraude que a verificação
  --  existe para impedir.
  IF NEW.occ IS DISTINCT FROM OLD.occ THEN
    NEW.occ_verificado_em     := NULL;
    NEW.occ_verificado_por    := NULL;
    NEW.occ_verificado_metodo := NULL;
    NEW.occ_verificado_ate    := NULL;
    NEW.occ_numero_confirmado := NULL;
    NEW.occ_evidencia         := NULL;
    NEW.occ_recusa_motivo     := NULL;
    NEW.occ_recusado_em       := NULL;
    NEW.occ_pedido_em         := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.contabilistas_tranca_verificacao_occ() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS contabilistas_tranca_occ ON public.contabilistas;
CREATE TRIGGER contabilistas_tranca_occ
  BEFORE UPDATE ON public.contabilistas
  FOR EACH ROW EXECUTE FUNCTION public.contabilistas_tranca_verificacao_occ();

-- ═══════════════════════════════════════════════════════════════════
--  B. PERFIL COMPOSTO
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.contabilistas
  ADD COLUMN IF NOT EXISTS perfil_blocos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS perfil_termos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cobertura jsonb;

-- ── B.1 Blocos ──────────────────────────────────────────────────────
--  A função é imutável e sem acesso a tabelas para poder viver dentro de
--  um CHECK. Valida a FORMA — array, tipos conhecidos, limites — e não o
--  sentido: o guardião de afirmações corre em TypeScript, onde consegue
--  explicar à pessoa o que está errado em vez de recusar a escrita.
CREATE OR REPLACE FUNCTION public.perfil_blocos_validos(p jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT p IS NULL
      OR (
        jsonb_typeof(p) = 'array'
        AND jsonb_array_length(p) <= 8
        AND NOT EXISTS (
          SELECT 1
            FROM jsonb_array_elements(p) AS b
           WHERE jsonb_typeof(b) <> 'object'
              OR b->>'tipo' IS NULL
              OR b->>'tipo' NOT IN ('texto', 'lista', 'faq', 'percurso', 'publico')
              OR char_length(COALESCE(b->>'titulo', '')) > 60
              OR jsonb_typeof(COALESCE(b->'itens', '[]'::jsonb)) <> 'array'
              OR jsonb_array_length(COALESCE(b->'itens', '[]'::jsonb)) > 8
              OR EXISTS (
                   SELECT 1
                     FROM jsonb_array_elements(COALESCE(b->'itens', '[]'::jsonb)) AS i
                    WHERE jsonb_typeof(i) <> 'object'
                       OR char_length(COALESCE(i->>'principal', '')) > 1200
                       OR char_length(COALESCE(i->>'secundario', '')) > 1200
                 )
        )
      );
$$;

ALTER TABLE public.contabilistas
  DROP CONSTRAINT IF EXISTS contabilistas_perfil_blocos_forma;
ALTER TABLE public.contabilistas
  ADD CONSTRAINT contabilistas_perfil_blocos_forma
  CHECK (public.perfil_blocos_validos(perfil_blocos)) NOT VALID;

-- ── B.2 Termos próprios ─────────────────────────────────────────────
--  Um termo próprio DESCREVE; nunca cria um filtro novo no diretório. A
--  coluna `area`, quando existe, tem de ser uma das áreas do eixo — é
--  isso que impede o diretório de se fragmentar em vocabulário privado.
CREATE OR REPLACE FUNCTION public.perfil_termos_validos(p jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT p IS NULL
      OR (
        jsonb_typeof(p) = 'array'
        AND jsonb_array_length(p) <= 8
        AND NOT EXISTS (
          SELECT 1
            FROM jsonb_array_elements(p) AS t
           WHERE jsonb_typeof(t) <> 'object'
              OR COALESCE(t->>'texto', '') = ''
              OR char_length(t->>'texto') > 48
              OR (t->>'area' IS NOT NULL AND t->>'area' NOT IN (
                    'Recibos verdes', 'IRS', 'IVA', 'Contabilidade organizada',
                    'Abertura de atividade', 'Sociedades e IRC',
                    'Trabalhadores e salários', 'Clientes internacionais',
                    'Heranças e sucessões', 'Dívidas e execuções'))
        )
      );
$$;

ALTER TABLE public.contabilistas
  DROP CONSTRAINT IF EXISTS contabilistas_perfil_termos_forma;
ALTER TABLE public.contabilistas
  ADD CONSTRAINT contabilistas_perfil_termos_forma
  CHECK (public.perfil_termos_validos(perfil_termos)) NOT VALID;

-- ── B.3 Cobertura ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cobertura_valida(p jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT p IS NULL
      OR (
        jsonb_typeof(p) = 'object'
        AND p->>'modo' IN ('local', 'concelhos', 'distritos', 'pais')
        AND jsonb_typeof(COALESCE(p->'concelhos', '[]'::jsonb)) = 'array'
        AND jsonb_array_length(COALESCE(p->'concelhos', '[]'::jsonb)) <= 12
        AND jsonb_typeof(COALESCE(p->'distritos', '[]'::jsonb)) = 'array'
        AND jsonb_array_length(COALESCE(p->'distritos', '[]'::jsonb)) <= 20
        AND char_length(COALESCE(p->>'nota', '')) <= 160
      );
$$;

ALTER TABLE public.contabilistas
  DROP CONSTRAINT IF EXISTS contabilistas_cobertura_forma;
ALTER TABLE public.contabilistas
  ADD CONSTRAINT contabilistas_cobertura_forma
  CHECK (public.cobertura_valida(cobertura)) NOT VALID;

ALTER TABLE public.contabilistas VALIDATE CONSTRAINT contabilistas_perfil_blocos_forma;
ALTER TABLE public.contabilistas VALIDATE CONSTRAINT contabilistas_perfil_termos_forma;
ALTER TABLE public.contabilistas VALIDATE CONSTRAINT contabilistas_cobertura_forma;

COMMENT ON COLUMN public.contabilistas.perfil_blocos IS
  'Secções compostas pelo próprio. Forma imposta aqui; sentido imposto pelo guardião em src/lib/contabilistas/personalizacao/. Sem HTML, sem estilos, sem testemunhos, sem métricas.';
COMMENT ON COLUMN public.contabilistas.perfil_termos IS
  'Termos próprios ligados ao eixo de áreas. Descrevem o perfil; nunca criam um filtro novo no diretório.';

-- ── B.4 O trigger anti-código não sabe olhar para JSONB ─────────────
--  `rejeitar_codigo_painel` corre por coluna de texto. Os blocos e os
--  termos são texto que vai para uma página pública e não passam por lá —
--  por isso ganham um trigger próprio. A alternativa (confiar no
--  formulário) falha assim que alguém escrever pela API.
CREATE OR REPLACE FUNCTION public.contabilistas_texto_seguro_jsonb()
RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  amostra text;
BEGIN
  amostra := COALESCE(NEW.perfil_blocos::text, '') || ' ' ||
             COALESCE(NEW.perfil_termos::text, '') || ' ' ||
             COALESCE(NEW.cobertura::text, '');

  IF amostra ~* '<\s*(script|iframe|object|embed|style|link|form)\M'
     OR amostra ~* 'javascript\s*:'
     OR amostra ~* '\mon(click|error|load|mouseover|focus)\s*=' THEN
    RAISE EXCEPTION 'O perfil aceita texto, não marcação nem código.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.contabilistas_texto_seguro_jsonb() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS contabilistas_texto_seguro_jsonb ON public.contabilistas;
CREATE TRIGGER contabilistas_texto_seguro_jsonb
  BEFORE INSERT OR UPDATE OF perfil_blocos, perfil_termos, cobertura
  ON public.contabilistas
  FOR EACH ROW EXECUTE FUNCTION public.contabilistas_texto_seguro_jsonb();

-- ═══════════════════════════════════════════════════════════════════
--  C. O CONTRATO PÚBLICO
-- ═══════════════════════════════════════════════════════════════════
--  `occ_verificado` deixa de significar «foi verificado alguma vez» e
--  passa a significar «está verificado AGORA». A conta é feita aqui, uma
--  só vez, e não em cada cliente que lê a view — a alternativa era um
--  perfil dizer «verificado» e outro «por verificar» sobre a mesma pessoa
--  na mesma tarde.
--
--  Duas condições, e ambas são necessárias:
--    · a validade não passou;
--    · o número verificado é AINDA o número que está na ficha.
--  A segunda é redundante com o trigger — e é para ser. O trigger protege
--  a escrita; esta condição protege a leitura, e é a que continua de pé se
--  alguém escrever na tabela com a chave de serviço, que ignora triggers
--  de nada mas não ignora esta view.
--
--  O que NÃO entra no contrato: `occ_numero_confirmado` (diz qual dos
--  números foi o verificado, e a quem lê o perfil não acrescenta nada) e
--  `occ_evidencia` (é matéria de auditoria, não de página pública).
--
--  Partido da definição viva de 20260818033447 — com os dois LEFT JOIN
--  intactos. Recriar esta view a partir de uma versão antiga apagaria em
--  silêncio a fidelidade e os recebimentos, que foi exactamente o
--  acidente que aquela migração existiu para reparar.
DROP VIEW IF EXISTS public.contabilistas_publico;

CREATE VIEW public.contabilistas_publico
WITH (security_invoker = false) AS
SELECT
  c.user_id,
  c.slug,
  c.nome,
  c.occ,
  (
    c.occ_verificado_ate IS NOT NULL
    AND c.occ_verificado_ate > now()
    AND c.occ_numero_confirmado IS NOT NULL
    AND c.occ_numero_confirmado
        = NULLIF(ltrim(regexp_replace(COALESCE(c.occ, ''), '\D', '', 'g'), '0'), '')
  ) AS occ_verificado,
  -- O método e a data só saem enquanto o selo vale. Um método visível ao
  -- lado de um selo caído diria «confirmado pela Ordem» sobre uma
  -- confirmação que já ninguém sustenta.
  CASE WHEN c.occ_verificado_ate > now() THEN c.occ_verificado_metodo END AS occ_verificado_metodo,
  CASE WHEN c.occ_verificado_ate > now() THEN c.occ_verificado_em     END AS occ_verificado_em,
  CASE WHEN c.occ_verificado_ate > now() THEN c.occ_verificado_ate    END AS occ_verificado_ate,
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
  -- O perfil composto. É texto escrito pelo próprio e é público por
  -- desenho — é a página dele.
  c.perfil_blocos,
  c.perfil_termos,
  c.cobertura,
  -- O email é público por decisão de produto: o editor de perfil diz, na
  -- própria página, que é isto que aparece no diretório. Está aqui porque
  -- foi escolhido, não por arrastamento.
  c.email_contacto,
  c.website,
  c.linkedin_url,
  c.linkedin_avatar_url,
  (c.linkedin_ligado_em IS NOT NULL) AS linkedin_ligado,
  c.aceita_novos_clientes,
  c.preco_consulta_cents,
  c.duracao_consulta_min,
  coalesce(r.ativa, false)                                   AS fidelidade_ativa,
  CASE WHEN coalesce(r.ativa, false) THEN r.meta         END AS fidelidade_meta,
  CASE WHEN coalesce(r.ativa, false) THEN r.desconto_pct END AS fidelidade_desconto_pct,
  -- ⚠️ O ÚNICO facto que sai da conta Stripe. Não sai o id, não saem os
  -- requisitos, não sai se está em análise. Quem vê «false» não distingue
  -- «nunca ligou» de «tem um documento por enviar» — e é o pretendido.
  COALESCE(s.charges_enabled, false) AS recebe_pagamentos,
  c.criado_em
FROM public.contabilistas c
LEFT JOIN public.fidelidade_regras r
       ON r.contabilista_id = c.user_id AND r.substituida_em IS NULL
LEFT JOIN public.contabilista_stripe s
       ON s.contabilista_id = c.user_id
WHERE c.estado = 'aprovado';

COMMENT ON VIEW public.contabilistas_publico IS
  'O contrato público do diretório e do perfil público. `occ_verificado` é '
  'CALCULADO: exige verificação dentro do prazo E que o número verificado '
  'seja ainda o da ficha. Não expõe telefone (ver contacto_do_contabilista), '
  'occ_numero_confirmado, occ_evidencia, linkedin_subject, pedido_id nem '
  'estado. De `contabilista_stripe` só sai `recebe_pagamentos`.';

GRANT SELECT ON public.contabilistas_publico TO anon, authenticated;

COMMIT;
