-- 20260902120000_cenarios_descoberta_e_preco.sql
--
-- ═══════════════════════════════════════════════════════════════════════
--  A ENTREGA D DO RELATÓRIO DO PAINEL — o esquema, e só o esquema.
--  ---------------------------------------------------------------------
--  O painel v2 já integra Descobrir, Preços, Projeto e Contratação SEM
--  escrever nada aqui: lê os cofres locais por adaptadores, mostra
--  «Neste dispositivo» e permite retomar. Essa é a entrega que está em
--  produção, e é deliberadamente a primeira.
--
--  Esta migração prepara a SEGUNDA: um «Guardar na minha conta» explícito,
--  para quem tem Plus, depois de uma pré-visualização dos campos. Nada
--  disto sobe sozinho — nem ao entrar na conta, nem ao fazer upgrade, nem
--  ao abrir a página. Continua a ser preciso alguém carregar num botão que
--  ainda não existe.
--
--  ┌─────────────────────────────────────────────────────────────────────┐
--  │ PORQUE SE ALARGA `cenarios` E NÃO SE CRIA `workspace_items`          │
--  │                                                                     │
--  │ `cenarios` já tem propriedade por `user_id`, RLS, políticas por      │
--  │ plano, migração local→nuvem, gestão, eliminação, exportação e uma    │
--  │ suíte que verifica a paridade entre os tipos do cliente e o CHECK    │
--  │ desta tabela. Uma tabela paralela duplicava as sete coisas — e a     │
--  │ purga por cancelamento teria de aprender a segunda, o que é          │
--  │ exatamente o tipo de coisa que se descobre tarde.                    │
--  └─────────────────────────────────────────────────────────────────────┘
--
--  ┌─────────────────────────────────────────────────────────────────────┐
--  │ O QUE ESTA MIGRAÇÃO NÃO FAZ, DE PROPÓSITO                            │
--  │                                                                     │
--  │  · não toca nas políticas RLS existentes — continuam a ser as de     │
--  │    `20260813_planos_operacionais.sql`: ler e apagar é do dono,       │
--  │    escrever na nuvem exige Plus na PRÓPRIA BASE e não um botão       │
--  │    escondido no browser;                                             │
--  │  · não cria nenhuma função `security definer` nova (a única função   │
--  │    aqui é de trigger, SECURITY INVOKER, com `search_path` vazio);    │
--  │  · não relaxa o `user_id`: a política de UPDATE já exige             │
--  │    `user_id = auth.uid()` no USING **e** no WITH CHECK, e é isso     │
--  │    que impede mover uma linha para outra conta;                      │
--  │  · não desce nenhum dado sensível de Descobrir para a nuvem. O que   │
--  │    pode subir, quando o botão existir, é o resumo revisto — nunca o  │
--  │    perfil profundo, a zona detalhada, competências, restrições,      │
--  │    entrevistas, contactos, orçamentos ou notas.                      │
--  └─────────────────────────────────────────────────────────────────────┘
--
--  Idempotente: correr duas vezes deixa a base no mesmo sítio. O bloco de
--  verificação no fim recusa-se a mentir — se alguma coisa não ficou como
--  esta migração diz, a transação inteira falha.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. As colunas novas ────────────────────────────────────────────────
--
-- Entram anuláveis, são preenchidas para as linhas que já existem, e só
-- depois ganham `NOT NULL`. Pela ordem inversa, a migração falhava numa
-- base com dados — que é onde ela vai correr.
ALTER TABLE public.cenarios
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS estado        text,
  ADD COLUMN IF NOT EXISTS schema_versao smallint,
  ADD COLUMN IF NOT EXISTS motor_versao  text,
  ADD COLUMN IF NOT EXISTS origem        text;

-- O que já lá está foi guardado por uma pessoa a carregar em «Guardar»:
-- é um resultado concluído, e a data que se sabe dele é a de criação.
-- Chamar-lhe «rascunho» seria inventar um estado que nunca teve.
UPDATE public.cenarios
SET
  atualizado_em = COALESCE(atualizado_em, criado_em, now()),
  estado        = COALESCE(estado, 'concluido'),
  schema_versao = COALESCE(schema_versao, 1),
  origem        = COALESCE(origem, 'legado')
WHERE atualizado_em IS NULL
   OR estado IS NULL
   OR schema_versao IS NULL
   OR origem IS NULL;

ALTER TABLE public.cenarios
  ALTER COLUMN atualizado_em SET DEFAULT now(),
  ALTER COLUMN atualizado_em SET NOT NULL,
  ALTER COLUMN estado        SET DEFAULT 'rascunho',
  ALTER COLUMN estado        SET NOT NULL,
  ALTER COLUMN schema_versao SET DEFAULT 1,
  ALTER COLUMN schema_versao SET NOT NULL,
  ALTER COLUMN origem        SET DEFAULT 'dashboard',
  ALTER COLUMN origem        SET NOT NULL;

-- `motor_versao` fica anulável: nem toda a decisão tem um motor versionado
-- por trás. Um cenário de heranças não tem; um preço tem.
COMMENT ON COLUMN public.cenarios.atualizado_em IS
  'Última alteração. Mantida por trigger — é por ela que o painel ordena o trabalho.';
COMMENT ON COLUMN public.cenarios.estado IS
  'Estado do trabalho, do vocabulário fechado de cenarios_estado_check.';
COMMENT ON COLUMN public.cenarios.schema_versao IS
  'Versão da forma de `dados`, para os adaptadores de importação.';
COMMENT ON COLUMN public.cenarios.motor_versao IS
  'Versão do motor que produziu o resultado. NULL quando não há motor versionado.';
COMMENT ON COLUMN public.cenarios.origem IS
  'De onde veio a linha: dashboard, importacao ou legado.';

-- ── 2. Os vocabulários fechados ────────────────────────────────────────
--
-- Cada CHECK é largado e reposto para a migração se deixar reaplicar. Só
-- se larga por NOME EXATO: apagar constraints por pesquisa vaga é como se
-- perdem regras que ninguém sabia que existiam.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cenarios'::regclass AND conname = 'cenarios_estado_check'
  ) THEN
    ALTER TABLE public.cenarios DROP CONSTRAINT cenarios_estado_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cenarios'::regclass AND conname = 'cenarios_schema_versao_check'
  ) THEN
    ALTER TABLE public.cenarios DROP CONSTRAINT cenarios_schema_versao_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cenarios'::regclass AND conname = 'cenarios_origem_check'
  ) THEN
    ALTER TABLE public.cenarios DROP CONSTRAINT cenarios_origem_check;
  END IF;
END $$;

ALTER TABLE public.cenarios
  ADD CONSTRAINT cenarios_estado_check CHECK (estado IN (
    'rascunho', 'a_validar', 'pronto', 'em_teste', 'bloqueado', 'concluido', 'arquivado'
  )),
  ADD CONSTRAINT cenarios_schema_versao_check CHECK (schema_versao > 0),
  ADD CONSTRAINT cenarios_origem_check CHECK (origem IN ('dashboard', 'importacao', 'legado'));

-- ── 3. `atualizado_em` mantida pela base, não pela aplicação ───────────
--
-- Se fosse a aplicação a escrevê-la, bastava um caminho de escrita
-- esquecido para a ordenação do painel passar a mentir — e mentiria em
-- silêncio, porque uma data errada tem exatamente o aspeto de uma certa.
--
-- SECURITY INVOKER (o omisso): não precisa de privilégios que quem escreve
-- não tenha. `search_path = ''` porque não resolve objeto nenhum.
--
-- O esquema já existe em produção desde `20260813_planos_operacionais.sql`.
-- A guarda está aqui para esta migração se poder aplicar sozinha sobre uma
-- base limpa — numa branch de pré-visualização, por exemplo.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION private.marcar_atualizacao_cenario()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.marcar_atualizacao_cenario() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS cenarios_marcar_atualizacao ON public.cenarios;
CREATE TRIGGER cenarios_marcar_atualizacao
  BEFORE UPDATE ON public.cenarios
  FOR EACH ROW EXECUTE FUNCTION private.marcar_atualizacao_cenario();

-- ── 4. O índice da nova ordenação ──────────────────────────────────────
--
-- NÃO substitui `cenarios_user_criado_idx`: são ordenações diferentes
-- sobre a mesma tabela — «quando guardei» e «quando mexi pela última
-- vez» —, e o painel passa a pedir a segunda. Um índice a mais custa
-- escrita; a alternativa aqui era uma ordenação sem índice em cima da
-- lista que se abre mais vezes.
CREATE INDEX IF NOT EXISTS cenarios_user_atualizado_idx
  ON public.cenarios (user_id, atualizado_em DESC);

-- ── 5. Grants explícitos ───────────────────────────────────────────────
--
-- O anónimo continua LOCAL-ONLY: não lê nem escreve esta tabela, e agora
-- diz-se em SQL em vez de se depender de um default de plataforma. O
-- changelog do Supabase é explícito quanto a novas exposições ao Data API
-- deixarem de ser automáticas; mesmo reutilizando uma tabela antiga, os
-- grants ficam escritos para a segurança não depender de omissões.
REVOKE ALL ON TABLE public.cenarios FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cenarios TO authenticated;

-- ── 6. Os dois tipos novos ─────────────────────────────────────────────
--
-- ⚠️ Esta é a ÚLTIMA definição de `cenarios_tipo_check` do repositório, e
-- é por ela que `dashboard-invariantes.test.ts` compara `TIPOS_CENARIO`
-- com o SQL. Acrescentar um tipo aqui sem o acrescentar ao cliente (ou o
-- contrário) reprova o build.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cenarios'::regclass AND conname = 'cenarios_tipo_check'
  ) THEN
    ALTER TABLE public.cenarios DROP CONSTRAINT cenarios_tipo_check;
  END IF;
END $$;

ALTER TABLE public.cenarios
  ADD CONSTRAINT cenarios_tipo_check
  CHECK (tipo IN (
    'recibos',
    'vencimento',
    'contratacao',
    'empresa',
    'irs',
    'herancas',
    'negocio',
    'descoberta',
    'preco'
  ));

-- ── 7. A migração não se acredita a si própria ─────────────────────────
DO $verificacao$
DECLARE
  em_falta text;
BEGIN
  SELECT string_agg(c, ', ') INTO em_falta
  FROM unnest(ARRAY['atualizado_em', 'estado', 'schema_versao', 'motor_versao', 'origem']) AS c
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cenarios' AND column_name = c
  );
  IF em_falta IS NOT NULL THEN
    RAISE EXCEPTION 'colunas em falta em public.cenarios: %', em_falta;
  END IF;

  SELECT string_agg(c, ', ') INTO em_falta
  FROM unnest(ARRAY[
    'cenarios_tipo_check', 'cenarios_estado_check',
    'cenarios_schema_versao_check', 'cenarios_origem_check'
  ]) AS c
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cenarios'::regclass AND conname = c
  );
  IF em_falta IS NOT NULL THEN
    RAISE EXCEPTION 'constraints em falta em public.cenarios: %', em_falta;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.cenarios'::regclass AND tgname = 'cenarios_marcar_atualizacao'
  ) THEN
    RAISE EXCEPTION 'o trigger de atualizado_em não ficou instalado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'cenarios_user_atualizado_idx'
  ) THEN
    RAISE EXCEPTION 'o índice de (user_id, atualizado_em) não ficou criado';
  END IF;

  -- RLS ligada. Sem isto, os grants acima seriam acesso a tudo.
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE oid = 'public.cenarios'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS desligada em public.cenarios';
  END IF;

  -- O anónimo não pode ter ficado com privilégio nenhum.
  IF EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'cenarios' AND grantee = 'anon'
  ) THEN
    RAISE EXCEPTION 'anon ainda tem privilégios em public.cenarios';
  END IF;

  -- E as quatro políticas de sempre continuam lá: esta migração não as
  -- toca, e uma delas ter desaparecido pelo caminho é a coisa mais cara
  -- que podia acontecer sem dar erro.
  SELECT string_agg(p, ', ') INTO em_falta
  FROM unnest(ARRAY[
    'cenarios_select_own', 'cenarios_insert_plus',
    'cenarios_update_plus', 'cenarios_delete_own'
  ]) AS p
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cenarios' AND policyname = p
  );
  IF em_falta IS NOT NULL THEN
    RAISE EXCEPTION 'políticas RLS em falta em public.cenarios: %', em_falta;
  END IF;
END
$verificacao$;

COMMIT;
