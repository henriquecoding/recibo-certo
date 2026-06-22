-- 016_recibos_computed.sql
-- Valores pré-calculados pelo simulador, guardados com cada recibo.
-- ================================================================
-- Porquê: o dashboard NÃO recalcula impostos — exibe os valores que o
-- simulador (guiado/completo) apurou. Esses valores (IRS real estimado,
-- Segurança Social, IVA e líquido por recibo) vêm da simulação anual e não
-- da retenção na fonte. Sem uma coluna para os guardar, perdiam-se no
-- round-trip à nuvem e o painel caía no recálculo da retenção (23%).
--
-- `computed` é um JSON com a forma:
--   { "irsEstimado": number, "segSocial": number, "iva": number, "liquido": number }
-- Opcional (NULL para recibos antigos) — nesse caso o cliente recalcula.
-- Idempotente: seguro correr múltiplas vezes.
-- ================================================================

ALTER TABLE public.recibos
  ADD COLUMN IF NOT EXISTS computed jsonb;
