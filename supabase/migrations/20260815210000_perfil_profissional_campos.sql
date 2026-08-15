-- =====================================================================
--  PERFIL PROFISSIONAL — OS CAMPOS QUE A IDENTIDADE PRECISA
--  ---------------------------------------------------------------------
--  O perfil deixa de ser um formulário e passa a ser a identidade
--  profissional de quem vende o serviço (§120). Para isso faltavam-lhe
--  seis factos que o cartão do diretório e o hero público mostram.
--
--  Todos os campos aqui são PÚBLICOS por desenho — vão para a view
--  `contabilistas_publico`, que é o contrato. Nenhum deles é calculado:
--  a §139 proíbe inventar sinais de confiança, e por isso anos de
--  experiência e tempo de resposta são DECLARADOS, com a interface
--  obrigada a dizê-lo.
--
--  A verificação da OCC é a exceção e a razão de ser desta migração ter
--  mais do que `ALTER TABLE`: a §124 diz que um número escrito no
--  formulário nunca pode virar um selo de «verificado». O selo passa a
--  ter uma fonte administrativa, e mudar o número apaga-a.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
--  1. Identidade declarada
-- ---------------------------------------------------------------------
ALTER TABLE public.contabilistas
  ADD COLUMN IF NOT EXISTS titulo_profissional text
    CHECK (titulo_profissional IS NULL OR char_length(titulo_profissional) BETWEEN 2 AND 80),
  ADD COLUMN IF NOT EXISTS apresentacao_curta text
    CHECK (apresentacao_curta IS NULL OR char_length(apresentacao_curta) <= 200),
  ADD COLUMN IF NOT EXISTS idiomas text[] NOT NULL DEFAULT '{}'::text[]
    CHECK (cardinality(idiomas) <= 8),
  ADD COLUMN IF NOT EXISTS anos_experiencia smallint
    CHECK (anos_experiencia IS NULL OR anos_experiencia BETWEEN 0 AND 60),
  ADD COLUMN IF NOT EXISTS resposta_media_horas smallint
    CHECK (resposta_media_horas IS NULL OR resposta_media_horas BETWEEN 1 AND 168);

COMMENT ON COLUMN public.contabilistas.apresentacao_curta IS
  'Uma linha para o cartão do diretório e para o hero público. NÃO substitui a bio: o cartão precisa de uma linha, o perfil de um parágrafo.';
COMMENT ON COLUMN public.contabilistas.anos_experiencia IS
  'DECLARADO. A §139 proíbe calcular anos de experiência a partir de dados que não os provam — a data de criação da conta não é experiência profissional.';
COMMENT ON COLUMN public.contabilistas.resposta_media_horas IS
  'COMPROMISSO declarado, não medição. A interface tem de dizer «responde normalmente em X» e nunca apresentá-lo como métrica verificada.';

-- ---------------------------------------------------------------------
--  2. Idiomas com vocabulário fechado
-- ---------------------------------------------------------------------
--  A §129 pede o mesmo princípio das especialidades: uma lista curta e
--  deliberada, não centenas de tags livres. Sem vocabulário fechado, o
--  diretório deixa de conseguir filtrar por idioma — «Inglês», «ingles»
--  e «EN» seriam três coisas.
CREATE TABLE IF NOT EXISTS public.catalogo_idiomas (
  codigo text PRIMARY KEY CHECK (codigo ~ '^[a-z]{2}$'),
  nome   text NOT NULL,
  ordem  smallint NOT NULL DEFAULT 0
);

INSERT INTO public.catalogo_idiomas (codigo, nome, ordem) VALUES
  ('pt', 'Português', 1),
  ('en', 'Inglês',    2),
  ('es', 'Espanhol',  3),
  ('fr', 'Francês',   4),
  ('de', 'Alemão',    5),
  ('it', 'Italiano',  6),
  ('nl', 'Neerlandês',7),
  ('uk', 'Ucraniano', 8)
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE public.catalogo_idiomas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "catalogo_idiomas_publico" ON public.catalogo_idiomas;
CREATE POLICY "catalogo_idiomas_publico" ON public.catalogo_idiomas
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.catalogo_idiomas TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.catalogo_idiomas FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.idiomas_validos(p_idiomas text[])
RETURNS boolean
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT p_idiomas IS NULL
      OR NOT EXISTS (
           SELECT 1 FROM unnest(p_idiomas) AS x(c)
            WHERE c NOT IN (SELECT codigo FROM public.catalogo_idiomas)
         );
$$;

ALTER TABLE public.contabilistas
  DROP CONSTRAINT IF EXISTS contabilistas_idiomas_conhecidos;
ALTER TABLE public.contabilistas
  ADD CONSTRAINT contabilistas_idiomas_conhecidos
  CHECK (public.idiomas_validos(idiomas)) NOT VALID;
-- NOT VALID não revalida as linhas antigas — todas têm '{}' hoje — mas
-- impõe a regra em todos os writes futuros.

-- ---------------------------------------------------------------------
--  3. A verificação da OCC é um facto administrativo (§124)
-- ---------------------------------------------------------------------
ALTER TABLE public.contabilistas
  ADD COLUMN IF NOT EXISTS occ_verificado_em timestamptz,
  ADD COLUMN IF NOT EXISTS occ_verificado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.contabilistas.occ_verificado_em IS
  'Quando a administração confirmou o número junto da Ordem. Sem isto, a interface só pode escrever «informado» — nunca «verificado».';

--  Duas garantias que fazem o selo significar alguma coisa:
--
--   1. o contabilista não escreve a verificação a si próprio;
--   2. mudar o número apaga-a. Sem isto, verificava-se o 12345 e
--      trocava-se depois para outro qualquer, mantendo o selo — que é
--      exatamente a fraude que a verificação existe para impedir.
CREATE OR REPLACE FUNCTION public.contabilistas_tranca_verificacao_occ()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.occ_verificado_em IS DISTINCT FROM OLD.occ_verificado_em
       OR NEW.occ_verificado_por IS DISTINCT FROM OLD.occ_verificado_por THEN
      RAISE EXCEPTION 'A verificação do número OCC só é feita pela administração.';
    END IF;
  END IF;

  IF NEW.occ IS DISTINCT FROM OLD.occ THEN
    NEW.occ_verificado_em  := NULL;
    NEW.occ_verificado_por := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.contabilistas_tranca_verificacao_occ() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS contabilistas_tranca_occ ON public.contabilistas;
CREATE TRIGGER contabilistas_tranca_occ
  BEFORE UPDATE ON public.contabilistas
  FOR EACH ROW EXECUTE FUNCTION public.contabilistas_tranca_verificacao_occ();

-- ---------------------------------------------------------------------
--  4. O trigger anti-código passa a cobrir os campos novos
-- ---------------------------------------------------------------------
--  `rejeitar_codigo_painel` corre por coluna e a lista era explícita.
--  Um campo novo não entra nela sozinho — e `titulo_profissional` vai
--  direto para o hero público.
--  `distrito` também não estava na lista original. Vem do mesmo SelectMenu
--  fechado, mas a proteção é por coluna e não por widget: quem escreve na
--  base de dados não passa necessariamente pelo formulário.
DROP TRIGGER IF EXISTS trg_texto_seguro_contabilistas ON public.contabilistas;
CREATE TRIGGER trg_texto_seguro_contabilistas
  BEFORE INSERT OR UPDATE ON public.contabilistas
  FOR EACH ROW EXECUTE FUNCTION public.rejeitar_codigo_painel(
    'nome', 'occ', 'bio', 'distrito', 'concelho', 'email_contacto',
    'telefone', 'website', 'titulo_profissional', 'apresentacao_curta'
  );

-- ---------------------------------------------------------------------
--  5. O contrato público cresce com eles — e só com eles
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.contabilistas_publico
WITH (security_invoker = false) AS
SELECT
  c.user_id,
  c.slug,
  c.nome,
  c.occ,
  (c.occ_verificado_em IS NOT NULL) AS occ_verificado,
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
  c.email_contacto,
  c.website,
  c.linkedin_url,
  (c.linkedin_ligado_em IS NOT NULL) AS linkedin_ligado,
  c.aceita_novos_clientes,
  c.preco_consulta_cents,
  c.duracao_consulta_min,
  c.fidelidade_ativa,
  c.fidelidade_meta,
  c.fidelidade_desconto_pct,
  c.criado_em
FROM public.contabilistas c
WHERE c.estado = 'aprovado';

COMMENT ON VIEW public.contabilistas_publico IS
  'O contrato público do diretório e do perfil público. Acrescentar uma coluna aqui é uma decisão; acrescentar uma coluna a `contabilistas` deixa de ser. Não expõe telefone (ver contacto_do_contabilista), linkedin_subject, pedido_id nem estado.';

GRANT SELECT ON public.contabilistas_publico TO anon, authenticated;

COMMIT;
