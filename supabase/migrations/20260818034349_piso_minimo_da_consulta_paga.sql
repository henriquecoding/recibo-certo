-- 20260818034349_piso_minimo_da_consulta_paga.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O PISO DA CONSULTA PAGA
--  ---------------------------------------------------------------------
--  A plataforma declara `fees.payer: "application"` no Connect (ver
--  `src/lib/stripe/connect.ts`): a taxa da Stripe é debitada a ELA, não ao
--  contabilista. Ele recebe o que combinou menos a nossa comissão, e é
--  isso que torna a promessa simples de dizer.
--
--  O reverso é aritmético. A comissão é uma PERCENTAGEM (1000 bps no
--  patamar Base, 500 no Parceiro) e a taxa da Stripe tem uma parte FIXA —
--  cerca de 1,5% + 0,25 € num cartão europeu. Abaixo de um certo valor a
--  parte fixa come a percentagem inteira e a plataforma paga para
--  intermediar:
--
--    · patamar Base (10%)    → equilíbrio a ~2,94 €
--    · patamar Parceiro (5%) → equilíbrio a ~7,15 €
--
--  10 € cobre qualquer patamar com cartão europeu, com folga.
--
--  ZERO CONTINUA A SER UM PREÇO LEGÍTIMO, e é o ponto todo do desenho: a
--  primeira conversa costuma ser grátis, e obrigar a inventar um valor era
--  pior do que não ter piso nenhum. O piso é sobre COBRAR, não sobre
--  atender — por isso a regra é «ou grátis, ou pelo menos 10 €», e nunca
--  «pelo menos 10 €».
--
--  Espelhado em `src/lib/contabilistas/preco-consulta.ts`, que dá a razão
--  a quem escreve o valor antes de o Postgres a dar em bruto.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. O catálogo do contabilista ───────────────────────────────────
ALTER TABLE public.contabilista_tipos_consulta
  DROP CONSTRAINT IF EXISTS tipos_consulta_preco_piso;

ALTER TABLE public.contabilista_tipos_consulta
  ADD CONSTRAINT tipos_consulta_preco_piso
  CHECK (preco_cents = 0 OR preco_cents >= 1000);

COMMENT ON CONSTRAINT tipos_consulta_preco_piso ON public.contabilista_tipos_consulta IS
  'Ou grátis (0), ou pelo menos 10 €. Entre os dois, a taxa fixa da Stripe — '
  'que a plataforma paga — excede a comissão e intermediar dá prejuízo.';

-- ── 2. O preço fixado ao concluir a consulta ────────────────────────
--
-- `concluir_consulta` escreve aqui. A restrição vale seja qual for o
-- caminho que escreva, hoje ou amanhã — é por isso que está na tabela e
-- não dentro da função.
ALTER TABLE public.agendamentos
  DROP CONSTRAINT IF EXISTS agendamentos_preco_piso;

ALTER TABLE public.agendamentos
  ADD CONSTRAINT agendamentos_preco_piso
  CHECK (preco_cents IS NULL OR preco_cents = 0 OR preco_cents >= 1000);

COMMENT ON CONSTRAINT agendamentos_preco_piso ON public.agendamentos IS
  'O mesmo piso do catálogo, para o preço fixado ao concluir a consulta.';
