-- 20260824093000_partilha_admite_preco_calculado.sql
-- Admite o tipo de partilha `preco_calculado` — enviar a conclusão da
-- engine de formação de preço (`/ferramentas/calcular-preco`) a um
-- contabilista.
--
-- Mesmo padrão de 20260824090000: um TipoPartilha novo em
-- src/lib/contabilistas/tipos.ts precisa de entrar aqui, ou o insert em
-- `partilhas` falha sempre com a violação 23514 do Postgres.
--
-- Idempotente.

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
    'cenario_guardado', 'resumo_anual', 'plano_negocio', 'preco_calculado'
  ));
