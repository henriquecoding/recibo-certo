-- ═══════════════════════════════════════════════════════════════════════
--  PARCERIAS CONFIGURÁVEIS — a Fase 1 (afiliado) sobre a Fase 2 já construída
--  ---------------------------------------------------------------------
--  A tentação era pôr um `<a href="https://fiz.co/?ref=…">` em meia dúzia de
--  sítios. Resolvia esta semana e criava trabalho a deitar fora daqui a três
--  meses — precisamente quando a FIZ estiver a olhar para os nossos números e
--  a decidir se abre a API.
--
--  Em vez disso, o modo passa a ser uma PROPRIEDADE DA PARCERIA, guardada
--  aqui. A rota diz o que PODERIA fazer; a parceria diz o que ESTÁ
--  CONTRATADO hoje; o modo efetivo é o mínimo dos dois. Nenhum componente da
--  Fase 2 é apagado: em modo LIGACAO simplesmente nunca é aberto.
--
--  NOTA DE NUMERAÇÃO: o plano chamava-lhe `024`, mas esse número já pertence
--  a `024_quiz_premios_so_no_servidor.sql`. Renumerada para 025 — duas
--  migrações com o mesmo prefixo aplicam-se por ordem alfabética e é assim
--  que se perde uma.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. `admin_partners` ganha o eixo do modo ─────────────────────────────
ALTER TABLE public.admin_partners
  ADD COLUMN IF NOT EXISTS parceiro_key text,            -- 'fiz' — liga esta linha ao adaptador
  ADD COLUMN IF NOT EXISTS modo text NOT NULL DEFAULT 'LIGACAO'
    CHECK (modo IN ('LIGACAO','HANDOFF_CONSENTIDO','CONTA_LIGADA')),
  ADD COLUMN IF NOT EXISTS link_afiliado text,           -- o link pessoal enviado pelo parceiro
  -- Destino de ALTA INTENÇÃO: o formulário de registo, em vez da homepage.
  -- A FIZ emite os dois. Quem vem do fim de um simulador já decidiu; mandá-lo
  -- para a homepage é pedir-lhe que volte a procurar o botão.
  ADD COLUMN IF NOT EXISTS link_afiliado_registo text,
  ADD COLUMN IF NOT EXISTS dominios_permitidos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subid_param text,             -- ex.: 'subid'  [por confirmar com a FIZ]
  ADD COLUMN IF NOT EXISTS caminho_suportado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS divulgacao text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS cor_marca text,
  ADD COLUMN IF NOT EXISTS comissao_descricao text,      -- '30% do valor líquido, 12 meses'
  ADD COLUMN IF NOT EXISTS atribuicao_janela_dias integer,
  ADD COLUMN IF NOT EXISTS validacao_dias integer,
  ADD COLUMN IF NOT EXISTS atribuicao_nota text,
  ADD COLUMN IF NOT EXISTS inicio_em timestamptz,
  ADD COLUMN IF NOT EXISTS fim_em timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS admin_partners_parceiro_key_idx
  ON public.admin_partners (parceiro_key) WHERE parceiro_key IS NOT NULL;

-- Um link de afiliado sem domínios permitidos é um redirecionador aberto:
-- quem conseguisse escrever na linha escolhia para onde o site aponta.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_partners_link_com_dominios'
  ) THEN
    ALTER TABLE public.admin_partners
      ADD CONSTRAINT admin_partners_link_com_dominios
      CHECK (link_afiliado IS NULL OR array_length(dominios_permitidos, 1) >= 1)
      NOT VALID;
  END IF;

  -- A divulgação não é opcional: sem ela o link não pode existir.
  -- Cl. 11.2 do Contrato de Afiliado — identificar o conteúdo como
  -- publicidade E divulgar que se recebe comissão. O incumprimento é
  -- qualificado como violação material, por isso a regra vive aqui e não
  -- só no formulário.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_partners_link_com_divulgacao'
  ) THEN
    ALTER TABLE public.admin_partners
      ADD CONSTRAINT admin_partners_link_com_divulgacao
      CHECK (link_afiliado IS NULL OR char_length(btrim(divulgacao)) >= 20)
      NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN public.admin_partners.modo IS
  'O que está CONTRATADO com este parceiro hoje. O modo efetivo de uma superfície é o mínimo entre este valor e o que a rota declara precisar.';
COMMENT ON COLUMN public.admin_partners.dominios_permitidos IS
  'Lista branca de hosts do destino. Sem ela, `link_afiliado` seria uma URL arbitrária vinda da base de dados.';
COMMENT ON COLUMN public.admin_partners.caminho_suportado IS
  'true só depois de o parceiro confirmar que o link pessoal preserva um caminho de aterragem. Sem confirmação, nunca se inventa um caminho no site deles.';

-- ── 2. `partner_creatives` — o kit do parceiro ───────────────────────────
--  Criada ANTES de `partner_placements`, que lhe faz referência.
CREATE TABLE IF NOT EXISTS public.partner_creatives (
  id          text PRIMARY KEY,
  parceiro_id text NOT NULL REFERENCES public.admin_partners(id) ON DELETE CASCADE,
  tipo        text NOT NULL CHECK (tipo IN ('banner','logo','texto')),
  idioma      text NOT NULL DEFAULT 'pt' CHECK (idioma IN ('pt','en')),
  largura     integer,
  altura      integer,
  url         text NOT NULL,            -- /parceiros/<key>/… no NOSSO domínio
  alt         text NOT NULL,
  nota        text,
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.partner_creatives IS
  'Criativos servidos a partir do NOSSO domínio, nunca do parceiro: um pedido a terceiros na primeira dobra custa LCP e um banner que muda do outro lado sem aviso é um risco editorial. A licença de marca é revogável — `ativo = false` apaga todos os criativos de um parceiro num só UPDATE.';

-- ── 3. `partner_placements` — onde a parceria aparece ────────────────────
CREATE TABLE IF NOT EXISTS public.partner_placements (
  id            text PRIMARY KEY,
  parceiro_id   text NOT NULL REFERENCES public.admin_partners(id) ON DELETE CASCADE,
  superficie    text NOT NULL,
  variante      text NOT NULL DEFAULT 'padrao'
                  CHECK (variante IN ('padrao','compacta','faixa','banner','texto')),
  criativo_id   text REFERENCES public.partner_creatives(id) ON DELETE SET NULL,
  copy_titulo   text,
  copy_sub      text,
  copy_cta      text,
  copy_nota     text,
  divulgacao    text,
  ativo         boolean NOT NULL DEFAULT false,
  ordem         integer NOT NULL DEFAULT 0,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parceiro_id, superficie, variante)
);

COMMENT ON COLUMN public.partner_placements.ativo IS
  'Arranca a false por decisão deliberada: nenhuma superfície começa a anunciar por ter sido criada.';

CREATE INDEX IF NOT EXISTS partner_placements_superficie_idx
  ON public.partner_placements (superficie) WHERE ativo = true;

-- ── 4. `partner_link_clicks` — atribuição própria, sem estado no browser ──
CREATE TABLE IF NOT EXISTS public.partner_link_clicks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id     text NOT NULL,
  click_id        text NOT NULL UNIQUE,
  superficie      text NOT NULL,
  variante        text,
  origem_slug     text,
  intent          text,
  destino_host    text NOT NULL,
  destino_caminho text,
  dispositivo     text CHECK (dispositivo IN ('desktop','mobile','tablet','desconhecido')),
  criado_em       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.partner_link_clicks IS
  'Sem coluna de sessão, sem user_id, sem IP, sem user-agent em bruto — e é deliberado. Uma sessão anónima estável exigiria um identificador no browser, e um banner de cookies para contar cliques com mais precisão custa fricção a 100% dos visitantes para melhorar uma métrica interna. O click_id é gerado por pedido e não liga dois cliques da mesma pessoa.';

CREATE INDEX IF NOT EXISTS partner_link_clicks_parceiro_dia_idx
  ON public.partner_link_clicks (parceiro_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS partner_link_clicks_superficie_idx
  ON public.partner_link_clicks (superficie, criado_em DESC);
CREATE INDEX IF NOT EXISTS partner_link_clicks_intent_idx
  ON public.partner_link_clicks (intent, criado_em DESC);

-- ── 5. `partner_commissions` — reconciliação com estados ─────────────────
--  A comissão não é um número final: é provisória durante a janela de
--  validação, pode ser anulada por reembolso e caduca se não for levantada.
--  Um painel que mostre um total único anuncia receita que ainda pode
--  desaparecer.
CREATE TABLE IF NOT EXISTS public.partner_commissions (
  id             text PRIMARY KEY,
  parceiro_id    text NOT NULL REFERENCES public.admin_partners(id) ON DELETE CASCADE,
  referencia     text,
  estado         text NOT NULL CHECK (estado IN ('pendente','confirmada','anulada','paga')),
  valor_liquido  numeric(10,2) NOT NULL,
  valor_comissao numeric(10,2) NOT NULL,
  plano          text,
  ocorrido_em    date NOT NULL,
  confirmavel_em date,
  origem         text NOT NULL DEFAULT 'csv' CHECK (origem IN ('csv','api')),
  importado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parceiro_id, id)
);

COMMENT ON COLUMN public.partner_commissions.origem IS
  'Distingue o relatório semanal do parceiro (Fase 1, importação de CSV) do que virá da API (Fase 2, listarComissoes()) — que só então terá credenciais para correr.';

CREATE INDEX IF NOT EXISTS partner_commissions_parceiro_estado_idx
  ON public.partner_commissions (parceiro_id, estado, ocorrido_em DESC);

-- ── 6. RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.partner_placements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_creatives    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_link_clicks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Leitura pública só do que está ativo (segue o padrão de `anuncios_ativos_publicos`).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partner_placements' AND policyname = 'placements_ativos_publicos') THEN
    CREATE POLICY "placements_ativos_publicos" ON public.partner_placements
      FOR SELECT USING (ativo = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partner_creatives' AND policyname = 'creatives_ativos_publicos') THEN
    CREATE POLICY "creatives_ativos_publicos" ON public.partner_creatives
      FOR SELECT USING (ativo = true);
  END IF;

  -- Escrita: só admin.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partner_placements' AND policyname = 'admin_gere_placements') THEN
    CREATE POLICY "admin_gere_placements" ON public.partner_placements
      FOR ALL USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partner_creatives' AND policyname = 'admin_gere_creatives') THEN
    CREATE POLICY "admin_gere_creatives" ON public.partner_creatives
      FOR ALL USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partner_commissions' AND policyname = 'admin_gere_comissoes') THEN
    CREATE POLICY "admin_gere_comissoes" ON public.partner_commissions
      FOR ALL USING (public.is_admin());
  END IF;

  -- Cliques: só o service role escreve (a partir de /ir/[parceiro]) e só o
  -- admin lê. A AUSÊNCIA de política de INSERT é intencional — mesmo
  -- princípio de `partner_events` na 022.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partner_link_clicks' AND policyname = 'admin_le_cliques') THEN
    CREATE POLICY "admin_le_cliques" ON public.partner_link_clicks
      FOR SELECT USING (public.is_admin());
  END IF;
END $$;

-- Defesa em profundidade, como na 024: mesmo que uma policy apareça por
-- engano numa migração futura, o role não tem o privilégio para a exercer.
REVOKE INSERT, UPDATE, DELETE ON public.partner_link_clicks FROM authenticated, anon;
GRANT SELECT ON public.partner_placements TO authenticated, anon;
GRANT SELECT ON public.partner_creatives  TO authenticated, anon;

-- ── 7. `anuncios` aceita criativos de parceiro ───────────────────────────
ALTER TABLE public.anuncios DROP CONSTRAINT IF EXISTS anuncios_tipo_check;
ALTER TABLE public.anuncios ADD CONSTRAINT anuncios_tipo_check
  CHECK (tipo IN ('parceiro','google_ads','banner','nativo','criativo_parceiro'));

-- ── 8. Semente da parceria FIZ ───────────────────────────────────────────
--  Os dois links pessoais emitidos pela FIZ. Vivem AQUI e não em código: se a
--  FIZ mudar o formato, é um `UPDATE` nesta linha e mais nada.
--
--    · `link_afiliado`         → https://fiz.co/?ref=…        (site, baixa intenção)
--    · `link_afiliado_registo` → https://app.fiz.co/auth?ref=… (registo, alta intenção)
--
--  O mesmo código de referência (`gpZWdtnhQPIsWJYR`) serve os dois. O código
--  numérico 295633948 é a variante por NIF do mesmo programa e não é usada
--  aqui — um só identificador significa uma só coluna a reconciliar.
--
--  Isto NÃO põe nada no ar. São precisas três coisas ao mesmo tempo:
--    · `PARCERIAS_ATIVAS=true` no ambiente (só produção);
--    · pelo menos uma linha ativa em `partner_placements` (nascem a false);
--    · a rota do Guia/simulador em `ROTAS_ATIVAS` / `ATIVAS`.
--
--  Nota sobre a cl. 12.1 (autoreferenciação): em desenvolvimento este
--  destino aponta para a raiz do domínio permitido e NÃO leva código de
--  afiliado. Testar o percurso com o link real e uma conta nossa é proibido
--  por contrato.
INSERT INTO public.admin_partners (
  id, nome, descricao, url, cta, contextos, icone, ativo, ordem,
  parceiro_key, modo, link_afiliado, link_afiliado_registo, dominios_permitidos,
  caminho_suportado, divulgacao, comissao_descricao,
  atribuicao_janela_dias, validacao_dias, atribuicao_nota
) VALUES (
  'fiz',
  'FIZ',
  'Software de faturação e contabilidade para trabalhadores independentes e empresas em Portugal.',
  'https://fiz.co/',
  'Conhecer a FIZ',
  ARRAY[]::text[],
  'invoice',
  true,
  0,
  'fiz',
  'LIGACAO',
  'https://fiz.co/?ref=gpZWdtnhQPIsWJYR',
  'https://app.fiz.co/auth?ref=gpZWdtnhQPIsWJYR',
  ARRAY['fiz.co','app.fiz.co','help.fiz.co','blog.fiz.co','diretorio.fiz.co'],
  false,
  'Ligação de afiliado (#publicidade): se subscreveres a FIZ através daqui, recebemos uma comissão. Não muda o preço para ti e não altera o que escrevemos nos Guias.',
  '30% do valor líquido sem IVA, durante 12 meses a contar do primeiro pagamento',
  90,
  30,
  'Last-click, cookie de 90 dias, permanente após o registo. Um clique nosso hoje pode virar registo daqui a dois meses — a divergência com o relatório do parceiro é esperada.'
)
ON CONFLICT (id) DO NOTHING;

-- ── 9. Criativos do kit da FIZ ───────────────────────────────────────────
--  Só os que fazem sentido num site. O kit tem também formatos de redes
--  sociais (1080×1080, 1080×1920) e variantes WhatsApp — não há lugar para
--  eles aqui e não há obrigação de usar todos.
--
--  Metade do kit é literalmente uma frase, um logótipo e um botão sobre fundo
--  creme. Esses NÃO entram aqui: são gerados em código (`FizCriativoTexto`),
--  onde pesam zero bytes de imagem, têm texto que um leitor de ecrã lê, e
--  sabem se a página está em modo escuro. Só os que têm captura do produto —
--  que não se reproduzem com CSS — são servidos como ficheiro.
--
--  Convertidos para AVIF/WebP com o PNG de recurso. Converter e comprimir é
--  permitido pela cl. 15.1; recortar, recolorir ou sobrepor texto, não.
INSERT INTO public.partner_creatives (id, parceiro_id, tipo, idioma, largura, altura, url, alt, nota, ativo)
VALUES
  ('fiz-300x600-pt', 'fiz', 'banner', 'pt', 300, 600,
   '/parceiros/fiz/fiz-300x600-pt.avif',
   'FIZ — impostos no automático, para freelancers em Portugal',
   'half-page; ficheiro 2x retina (600x1200); tem captura do produto', true),
  ('fiz-1200x628-pt', 'fiz', 'banner', 'pt', 1200, 628,
   '/parceiros/fiz/fiz-1200x628-pt.avif',
   'FIZ — faturação e impostos em piloto automático',
   'social/OG; sem uso no site, guardado para partilhas', false)
ON CONFLICT (id) DO NOTHING;

-- ── 10. Superfícies — todas INATIVAS ─────────────────────────────────────
--  As linhas são criadas para o admin as poder ligar com um interruptor, em
--  vez de as ter de inventar. `ativo = false` é o ponto do desenho: nenhuma
--  superfície começa a anunciar por ter sido criada, e a ativação faseada
--  (5 Guias → 1 semana → simuladores → demos → resto) faz-se aqui.
INSERT INTO public.partner_placements (id, parceiro_id, superficie, variante, ativo, ordem)
VALUES
  ('fiz:guia.next_step:padrao',        'fiz', 'guia.next_step',        'padrao',   false, 0),
  ('fiz:simulador.plano_acao:padrao',  'fiz', 'simulador.plano_acao',  'padrao',   false, 0),
  ('fiz:demo.hero:compacta',           'fiz', 'demo.hero',             'compacta', false, 0),
  ('fiz:demo.hero.faixa:faixa',        'fiz', 'demo.hero.faixa',       'faixa',    false, 0),
  ('fiz:demo.irs:compacta',            'fiz', 'demo.irs',              'compacta', false, 0),
  ('fiz:demo.irs.faixa:faixa',         'fiz', 'demo.irs.faixa',        'faixa',    false, 0),
  ('fiz:precos.faixa:faixa',           'fiz', 'precos.faixa',          'faixa',    false, 0),
  ('fiz:dashboard.partner_spot:padrao','fiz', 'dashboard.partner_spot','padrao',   false, 0),
  ('fiz:anuncio.landing_pricing:texto','fiz', 'anuncio.landing_pricing','texto',   false, 0),
  ('fiz:anuncio.dashboard:texto',      'fiz', 'anuncio.dashboard',     'texto',    false, 0),
  ('fiz:anuncio.simulador:texto',      'fiz', 'anuncio.simulador',     'texto',    false, 0),
  ('fiz:anuncio.prazos:texto',         'fiz', 'anuncio.prazos',        'texto',    false, 0),
  ('fiz:anuncio.receitas:texto',       'fiz', 'anuncio.receitas',      'texto',    false, 0),
  ('fiz:anuncio.recibos:texto',        'fiz', 'anuncio.recibos',       'texto',    false, 0),
  ('fiz:anuncio.comparador:texto',     'fiz', 'anuncio.comparador',    'texto',    false, 0),
  ('fiz:anuncio.landing_hero:texto',   'fiz', 'anuncio.landing_hero',  'texto',    false, 0)
ON CONFLICT (id) DO NOTHING;
