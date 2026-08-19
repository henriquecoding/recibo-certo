-- 20260819120000_cenario_projeto_de_negocio.sql
-- Admite o tipo de cenário `negocio` — o projeto do estúdio de viabilidade
-- (ofertas, volumes, estrutura e resultado).
--
-- É o mesmo defeito que a migração 032 fechou para `herancas`, e fecha-se
-- pela mesma razão: `META_TIPO_CENARIO` do cliente passa a conhecer o tipo
-- e a guardar com ele, mas a constraint só admitia cinco valores. Numa
-- conta Plus o insert seria recusado, e — como `guardar()` espera
-- confirmação durável desde a RC-P0-03 — a pessoa veria um erro sem
-- perceber que o problema era de esquema, não do que escreveu.
--
-- Idempotente — seguro correr múltiplas vezes.

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
  CHECK (tipo IN ('recibos', 'vencimento', 'empresa', 'irs', 'herancas', 'negocio'));
