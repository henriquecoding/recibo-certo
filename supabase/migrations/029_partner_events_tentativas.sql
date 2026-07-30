-- ═══════════════════════════════════════════════════════════════════════
--  PARTNER_EVENTS: contador de tentativas, para o reprocessamento parar
--  ---------------------------------------------------------------------
--  A 022 criou `partner_events_por_processar_idx` — um índice sobre as linhas
--  com `processed_at IS NULL` — para um consumidor de reprocessamento que
--  nunca foi escrito. O webhook escrevia `processing_error`, respondia 202 e
--  ninguém voltava a ler a linha: o efeito do evento (apagar os tokens de uma
--  ligação revogada, por exemplo) ficava por aplicar para sempre.
--
--  O consumidor existe agora em
--  `/api/integrations/fiz/webhooks/reprocessar`. Falta-lhe uma coisa para ser
--  seguro: saber quantas vezes já tentou. Um evento que falha sempre — porque
--  se refere a uma ligação que já não existe, ou porque o payload é de uma
--  versão que deixámos de entender — não pode ficar na fila a ser tentado de
--  minuto a minuto até ao fim dos tempos.
--
--  Ao esgotar as tentativas, o consumidor preenche `processed_at` e guarda o
--  motivo em `processing_error`: sai da fila (o índice parcial deixa de o
--  incluir) e fica visível para quem for ver o que aconteceu.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.partner_events
  ADD COLUMN IF NOT EXISTS tentativas integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.partner_events.tentativas IS
  'Tentativas de processamento falhadas. O reprocessador desiste ao chegar ao limite e marca processed_at para tirar a linha da fila, guardando o motivo em processing_error.';

COMMENT ON COLUMN public.partner_events.processed_at IS
  'Momento em que o EFEITO do evento ficou aplicado — não o momento em que foi recebido. NULL significa que ainda há trabalho a fazer, e é isso que o reprocessador procura. O webhook só o preenche depois de `processar()` correr sem erro.';
