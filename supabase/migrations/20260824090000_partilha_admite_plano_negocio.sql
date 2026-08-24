-- 20260824090000_partilha_admite_plano_negocio.sql
-- Admite o tipo de partilha `plano_negocio` — enviar a conclusão de
-- "Descobrir o meu negócio" a um contabilista.
--
-- src/lib/contabilistas/tipos.ts já declara `plano_negocio` como
-- TipoPartilha válido, e ConclusaoNegocio.tsx já monta o botão de envio
-- com esse tipo — mas esta constraint, criada na 042, nunca foi
-- atualizada para o admitir. Todo o envio falha hoje com a violação
-- 23514 do Postgres. É o mesmo defeito que a 20260819120000 já fechou
-- para `cenarios.tipo`, agora para `partilhas.tipo`.
--
-- Idempotente — seguro correr múltiplas vezes.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.partilhas'::regclass AND conname = 'partilhas_tipo_check'
  ) THEN
    ALTER TABLE public.partilhas DROP CONSTRAINT partilhas_tipo_check;
  END IF;
END $$;

ALTER TABLE public.partilhas
  ADD CONSTRAINT partilhas_tipo_check
  CHECK (tipo IN (
    'simulador_irs', 'recibos_verdes', 'recibo_vencimento',
    'comparador_regimes', 'simulador_empresa', 'simulador_herancas',
    'cenario_guardado', 'resumo_anual', 'plano_negocio'
  ));
