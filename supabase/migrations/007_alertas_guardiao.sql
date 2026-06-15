-- ================================================================
-- ReciboCerto — Guardião Fiscal: tabela de alertas enviados (v7)
--
-- Evita que o mesmo alerta de limiar de IVA seja enviado mais de
-- uma vez por utilizador/nível/ano.
--
-- Limiares geridos: aviso (80%), preparacao (90%), critico (95%),
--                   ultrapassado (100%+)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.alertas_guardiao (
  id          bigserial   PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nivel       text        NOT NULL
                          CHECK (nivel IN ('aviso', 'preparacao', 'critico', 'ultrapassado')),
  ano         smallint    NOT NULL,
  faturado    numeric(12,2) NOT NULL,
  enviado_em  timestamptz DEFAULT now(),

  -- Chave de unicidade: 1 alerta por utilizador/nível/ano
  UNIQUE (user_id, nivel, ano)
);

ALTER TABLE public.alertas_guardiao ENABLE ROW LEVEL SECURITY;

-- Apenas admins e service_role podem ler/escrever
CREATE POLICY "admin_ve_alertas_guardiao" ON public.alertas_guardiao
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Índice para queries do cron job
CREATE INDEX IF NOT EXISTS alertas_guardiao_user_ano_idx
  ON public.alertas_guardiao (user_id, ano);

COMMENT ON TABLE public.alertas_guardiao IS
  'Registo de alertas do Guardião Fiscal enviados por email (IVA 80/90/95/100%). '
  'Garante idempotência: cada nível só é enviado uma vez por utilizador/ano.';
