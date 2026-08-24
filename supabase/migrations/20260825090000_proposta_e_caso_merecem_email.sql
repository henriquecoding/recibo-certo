-- 20260825090000_proposta_e_caso_merecem_email.sql
-- «Tens uma proposta à espera» passa a sair também por email.
--
-- A 20260824091500 fez a proposta acender o sino do cliente — que era o
-- defeito P0 da auditoria: uma proposta pronta e ninguém avisado. Mas
-- `aviso_merece_email()` só admitia sete tipos, e nem `proposta` nem `caso`
-- estavam lá: quem não voltasse ao site por iniciativa própria continuava
-- sem saber, que é exatamente a pessoa que o aviso existe para alcançar.
--
-- Os dois tipos que entram:
--   · `proposta` — há uma decisão pendente, com dinheiro em cima.
--   · `caso`     — os lembretes de um caso encaminhado sem resposta, dos
--                  dois lados (o contabilista que não respondeu, e o
--                  cliente a quem ninguém respondeu).
--
-- Os restantes ficam de fora de propósito. `mensagem` seria um email por
-- cada linha de conversa; `partilha_recebida`, `pagamento_recebido` e
-- `patamar_desbloqueado` são factos que se leem quando se entra, não
-- interrupções.
--
-- Idempotente.

CREATE OR REPLACE FUNCTION public.aviso_merece_email(p_tipo text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT p_tipo IN ('vinculo_pedido', 'vinculo_aceite', 'consulta_pedida',
                    'consulta_confirmada', 'consulta_cancelada', 'cupao_ganho',
                    'candidatura_decidida', 'proposta', 'caso')
$$;
