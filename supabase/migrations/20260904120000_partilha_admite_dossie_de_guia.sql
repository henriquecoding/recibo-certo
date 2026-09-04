-- ═══════════════════════════════════════════════════════════════════════
--  20260904120000_partilha_admite_dossie_de_guia.sql
--  `partilhas` admite o tipo `dossie_guia` — o primeiro destino do motor
--  de dossiê de guia (D1: o contabilista que a pessoa já tem).
--
--  Mesmo padrão de 20260824090000 e 20260824093000, e pela mesma razão: um
--  `TipoPartilha` novo em src/lib/contabilistas/tipos.ts sem entrar aqui
--  faz o insert falhar sempre com a violação 23514 do Postgres, e o erro
--  aparece ao utilizador como uma mensagem da base de dados.
--
--  Fica numa migração PRÓPRIA, separada das tabelas do motor, porque é a
--  única alteração desta série que toca numa tabela em produção. Uma
--  constraint que se recria isolada lê-se, revê-se e reverte-se sem
--  arrastar quatrocentas linhas de esquema novo atrás.
--
--  Idempotente — seguro correr múltiplas vezes.
-- ═══════════════════════════════════════════════════════════════════════

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
    'cenario_guardado', 'resumo_anual', 'plano_negocio', 'preco_calculado',
    'dossie_guia'
  ));
