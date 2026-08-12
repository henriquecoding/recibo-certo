-- 032_dashboard_contrato.sql
-- Fecha as lacunas de schema que a auditoria do dashboard identificou: colunas
-- e restrições que o TypeScript já usava mas que não existiam em migration
-- nenhuma. Sem isto, uma base criada do zero pelo repositório não corresponde
-- ao que a aplicação espera — e foi assim que os cenários de heranças
-- passaram a ser recusados em silêncio.
--
-- Idempotente — seguro correr múltiplas vezes.

-- ═══════════════════════════════════════════════════════════════════════
--  1. RC-P0-04 — cenários de heranças eram recusados pela constraint
-- ═══════════════════════════════════════════════════════════════════════
-- O cliente conhece o tipo `herancas` (ver META_TIPO_CENARIO) e o simulador
-- guarda com esse tipo, mas a constraint de 017 só admitia quatro valores. Em
-- conta Plus o insert era rejeitado; a interface, otimista, dizia "Guardado".
-- A lista de tipos passa a ser a mesma nos dois lados.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cenarios'::regclass AND conname = 'cenarios_tipo_check'
  ) THEN
    ALTER TABLE public.cenarios DROP CONSTRAINT cenarios_tipo_check;
  END IF;
END $$;

ALTER TABLE public.cenarios
  ADD CONSTRAINT cenarios_tipo_check
  CHECK (tipo IN ('recibos', 'vencimento', 'empresa', 'irs', 'herancas'));

-- ═══════════════════════════════════════════════════════════════════════
--  2. RC-P0-09 — data efetiva do documento ≠ data do registo
-- ═══════════════════════════════════════════════════════════════════════
-- `data` é a data da operação (é ela que define mês, trimestre e ano fiscal).
-- `criado_em` já existia; falta poder distinguir uma edição posterior, para o
-- histórico não fingir que o registo nunca mudou.
ALTER TABLE public.recibos
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz DEFAULT now();

-- ═══════════════════════════════════════════════════════════════════════
--  3. RC-P1-01 — preferências fiscais liam/escreviam uma coluna inexistente
-- ═══════════════════════════════════════════════════════════════════════
-- `usePreferenciasFiscais` faz select/update de `profiles.preferencias_fiscais`
-- desde que existe, mas nenhuma migration a criava: em produção só funcionava
-- se alguém a tivesse acrescentado à mão, e uma base nova falhava em silêncio
-- (os erros eram engolidos). Fica versionada.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferencias_fiscais jsonb;

COMMENT ON COLUMN public.profiles.preferencias_fiscais IS
  'Preferências fiscais do utilizador (schema versionado em src/lib/store/preferencias-fiscais.ts). '
  'Inclui a versão do schema no campo `v` para permitir migração de forma.';

-- ═══════════════════════════════════════════════════════════════════════
--  4. RC-P1-05 — estado de cumprimento das obrigações
-- ═══════════════════════════════════════════════════════════════════════
-- Um calendário que não sabe o que já foi entregue não pode alimentar um
-- indicador de saúde. Cada marca é de uma obrigação concreta (id do prazo)
-- de um ano concreto.
CREATE TABLE IF NOT EXISTS public.prazos_cumpridos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prazo_id    text NOT NULL,
  ano         integer NOT NULL CHECK (ano BETWEEN 2000 AND 2200),
  cumprido_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, prazo_id, ano)
);

CREATE INDEX IF NOT EXISTS prazos_cumpridos_user_ano_idx
  ON public.prazos_cumpridos(user_id, ano);

ALTER TABLE public.prazos_cumpridos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'prazos_cumpridos' AND policyname = 'prazos_cumpridos_own'
  ) THEN
    CREATE POLICY "prazos_cumpridos_own" ON public.prazos_cumpridos
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
