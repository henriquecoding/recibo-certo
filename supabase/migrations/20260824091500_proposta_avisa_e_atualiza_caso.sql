-- 20260824091500_proposta_avisa_e_atualiza_caso.sql
-- Uma proposta enviada passa a acordar o caso e a avisar o cliente.
--
-- `enviarProposta()` em src/lib/contabilistas/casos.ts insere diretamente em
-- `propostas` (a política `propostas_contabilista_envia` já permite ao
-- contabilista fazê-lo por REST) — mas nada fazia `casos.estado` avançar
-- para 'com_proposta', nem chamava `avisar_utilizador`. O sino do cliente
-- nunca acendia: ele continuava a ver "Avisamos-te quando houver proposta"
-- com uma proposta pronta à espera.
--
-- Segue o mesmo princípio do cabeçalho da 047: o aviso nasce da mesma
-- transação que causa o facto, nunca de um caminho à parte que alguém se
-- possa esquecer de chamar.
--
-- Idempotente.

CREATE OR REPLACE FUNCTION public.proposta_avisa_e_atualiza_caso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cliente uuid;
BEGIN
  -- Só a primeira proposta transita o estado — um segundo contabilista
  -- encaminhado que também proponha não reabre um caso já decidido.
  UPDATE public.casos SET estado = 'com_proposta'
   WHERE id = NEW.caso_id AND estado = 'encaminhado'
   RETURNING cliente_id INTO v_cliente;

  IF v_cliente IS NULL THEN
    SELECT cliente_id INTO v_cliente FROM public.casos WHERE id = NEW.caso_id;
  END IF;

  PERFORM public.avisar_utilizador(v_cliente, 'proposta',
    'Tens uma proposta à espera', NULL, '/dashboard/casos');

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS proposta_avisa_e_atualiza_caso ON public.propostas;
CREATE TRIGGER proposta_avisa_e_atualiza_caso
  AFTER INSERT ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.proposta_avisa_e_atualiza_caso();
