-- Identidade reconciliada com produção (relatório, MOT-P0-016).
--
-- O repositório trazia esta mesma migração como `20260830120000` enquanto
-- produção a tinha registada como `20260830071059`: dois nomes para a
-- mesma alteração, o que faz `supabase migration list` divergir e convida
-- a uma segunda aplicação. O ficheiro passa a ter a versão que produção
-- realmente registou, e o corpo é idempotente — se correr outra vez, o
-- CHECK é substituído por um igual.

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
