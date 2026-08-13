-- 045_trabalho_e_tipos.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O TRABALHO, EM ESTADOS — e as consultas, com feitios diferentes
--  ---------------------------------------------------------------------
--  Duas coisas que faltavam a quem gere clientes a sério.
--
--  1. TAREFAS. «Pedir o comprovativo ao cliente X», «entregar o IVA até
--     dia 20». A coluna que justifica o quadro inteiro é «à espera do
--     cliente»: é onde vive o trabalho parado, e é exatamente o que uma
--     lista esconde.
--
--     ⚠️ Sem percentagens. Um IVA não está «40% feito» — ou tem os
--     documentos ou não tem. O progresso é «3 de 5 passos», e é por isso
--     que os passos são uma tabela e não um número numa coluna.
--
--     As tarefas são PRIVADAS do contabilista. São as notas de trabalho
--     dele, e o cliente não as vê — para lhe pedir alguma coisa há a
--     conversa, que é onde uma pergunta a alguém deve ser feita.
--
--  2. TIPOS DE CONSULTA. Até aqui havia uma duração e um preço para tudo.
--     Uma «primeira conversa de 20 minutos, grátis» e um «fecho de contas
--     de duas horas» não são a mesma coisa, e tratá-las como se fossem
--     obriga o contabilista a escolher qual das duas mente.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Tarefas ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contabilista_tarefas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  -- Opcional: há trabalho que não é de ninguém em particular.
  vinculo_id      uuid REFERENCES public.contabilista_vinculos(id) ON DELETE SET NULL,
  titulo          text NOT NULL CHECK (char_length(titulo) BETWEEN 2 AND 200),
  notas           text CHECK (notas IS NULL OR char_length(notas) <= 2000),
  estado          text NOT NULL DEFAULT 'por_tratar'
                    CHECK (estado IN ('por_tratar', 'espera_cliente', 'em_curso', 'entregue')),
  prazo           date,
  etiquetas       text[] NOT NULL DEFAULT '{}',
  -- Id de uma obrigação do calendário fiscal (`src/lib/prazos.ts`), quando
  -- a tarefa nasce de uma. Texto e não referência: o calendário é código,
  -- não uma tabela, e inventar-lhe uma tabela para ter uma chave
  -- estrangeira seria duplicar a fonte de verdade.
  obrigacao       text CHECK (obrigacao IS NULL OR char_length(obrigacao) <= 80),
  -- Posição dentro da coluna. Reordenar é uma escrita só.
  ordem           integer NOT NULL DEFAULT 0,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  concluido_em    timestamptz,
  CONSTRAINT tarefas_entregue_tem_data CHECK (
    (estado = 'entregue' AND concluido_em IS NOT NULL)
    OR (estado <> 'entregue' AND concluido_em IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS tarefas_quadro_idx
  ON public.contabilista_tarefas (contabilista_id, estado, ordem, criado_em);
CREATE INDEX IF NOT EXISTS tarefas_prazo_idx
  ON public.contabilista_tarefas (contabilista_id, prazo)
  WHERE estado <> 'entregue';

-- `concluido_em` acompanha o estado sozinho. Deixá-lo a cargo de quem
-- escreve dava duas verdades: a coluna a dizer que está entregue e a data
-- a dizer que nunca o foi.
CREATE OR REPLACE FUNCTION public.tarefas_marca_conclusao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.estado = 'entregue' AND (TG_OP = 'INSERT' OR OLD.estado <> 'entregue') THEN
    NEW.concluido_em := now();
  ELSIF NEW.estado <> 'entregue' THEN
    NEW.concluido_em := NULL;
  END IF;
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tarefas_marca_conclusao() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS tarefas_conclusao ON public.contabilista_tarefas;
CREATE TRIGGER tarefas_conclusao
  BEFORE INSERT OR UPDATE ON public.contabilista_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.tarefas_marca_conclusao();


-- ── 2. Passos ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contabilista_tarefa_passos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL REFERENCES public.contabilista_tarefas(id) ON DELETE CASCADE,
  texto     text NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 200),
  feito     boolean NOT NULL DEFAULT false,
  ordem     integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS passos_tarefa_idx
  ON public.contabilista_tarefa_passos (tarefa_id, ordem);


-- ── 3. Tipos de consulta ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contabilista_tipos_consulta (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilista_id uuid NOT NULL REFERENCES public.contabilistas(user_id) ON DELETE CASCADE,
  nome            text NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 80),
  descricao       text CHECK (descricao IS NULL OR char_length(descricao) <= 300),
  duracao_min     integer NOT NULL CHECK (duracao_min BETWEEN 15 AND 240),
  -- Zero é um preço legítimo: a primeira conversa costuma ser grátis, e
  -- não poder dizê-lo obrigaria a inventar um valor.
  preco_cents     integer NOT NULL DEFAULT 0 CHECK (preco_cents >= 0),
  ativo           boolean NOT NULL DEFAULT true,
  ordem           integer NOT NULL DEFAULT 0,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tipos_consulta_idx
  ON public.contabilista_tipos_consulta (contabilista_id, ativo, ordem);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'agendamentos'
      AND column_name = 'tipo_consulta_id'
  ) THEN
    ALTER TABLE public.agendamentos
      ADD COLUMN tipo_consulta_id uuid
        REFERENCES public.contabilista_tipos_consulta(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ── 4. RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.contabilista_tarefas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contabilista_tarefa_passos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contabilista_tipos_consulta ENABLE ROW LEVEL SECURITY;

-- As tarefas são só do contabilista. Não há política para o cliente, e é
-- deliberado: são notas de trabalho, e o sítio para lhe pedir alguma coisa
-- é a conversa.
DROP POLICY IF EXISTS "tarefas_dono" ON public.contabilista_tarefas;
CREATE POLICY "tarefas_dono" ON public.contabilista_tarefas
  FOR ALL TO authenticated
  USING (contabilista_id = (SELECT auth.uid()))
  WITH CHECK (contabilista_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "passos_pela_tarefa" ON public.contabilista_tarefa_passos;
CREATE POLICY "passos_pela_tarefa" ON public.contabilista_tarefa_passos
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contabilista_tarefas t
    WHERE t.id = tarefa_id AND t.contabilista_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contabilista_tarefas t
    WHERE t.id = tarefa_id AND t.contabilista_id = (SELECT auth.uid())
  ));

-- Os tipos de consulta são públicos: é o que permite a quem ainda não é
-- cliente perceber o que pode marcar, e por quanto.
DROP POLICY IF EXISTS "tipos_publicos" ON public.contabilista_tipos_consulta;
CREATE POLICY "tipos_publicos" ON public.contabilista_tipos_consulta
  FOR SELECT TO anon, authenticated
  USING (ativo AND EXISTS (
    SELECT 1 FROM public.contabilistas c
    WHERE c.user_id = contabilista_id AND c.estado = 'aprovado'
  ));

DROP POLICY IF EXISTS "tipos_dono_gere" ON public.contabilista_tipos_consulta;
CREATE POLICY "tipos_dono_gere" ON public.contabilista_tipos_consulta
  FOR ALL TO authenticated
  USING (contabilista_id = (SELECT auth.uid()))
  WITH CHECK (contabilista_id = (SELECT auth.uid()));


COMMENT ON TABLE public.contabilista_tarefas IS
  'Trabalho do contabilista, em quatro estados. Privado: o cliente não vê tarefas — para lhe pedir alguma coisa há a conversa. Sem percentagens: o progresso são passos concluídos.';
COMMENT ON TABLE public.contabilista_tarefa_passos IS
  'Passos de uma tarefa. Existem como tabela, e não como número, porque «3 de 5» é uma afirmação verificável e «60%» é uma estimativa inventada.';
COMMENT ON TABLE public.contabilista_tipos_consulta IS
  'Feitios de consulta com duração e preço próprios. Preço zero é legítimo — a primeira conversa costuma ser grátis.';
