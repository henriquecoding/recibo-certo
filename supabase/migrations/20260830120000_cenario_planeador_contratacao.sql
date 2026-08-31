-- O planeador só toca na lista fechada de tipos de cenário. As políticas
-- RLS existentes continuam intactas: cada utilizador lê, altera e apaga
-- apenas os próprios registos; guardar na nuvem continua reservado ao Plus.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.cenarios'::regclass
      AND conname = 'cenarios_tipo_check'
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
    'negocio'
  ));
