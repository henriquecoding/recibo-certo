-- 043_nome_e_lugar.sql
-- ═══════════════════════════════════════════════════════════════════════
--  QUEM É QUEM, E ONDE É
--  ---------------------------------------------------------------------
--  Duas lacunas que a plataforma tinha desde a 042, e que só se veem a usar.
--
--  1. O contabilista abria a lista de clientes e lia «Cliente desde outubro
--     de 2025». Mais nada. `contabilista_vinculos` guardava um id e um
--     estado — sem nome, não há lista ordenável, não há ficha de cliente,
--     não há forma de falar de alguém.
--
--     A correção NÃO é ir buscar o nome à conta. É o cliente que decide, no
--     momento em que pede o vínculo, por que nome quer ser tratado — e pode
--     não dizer nenhum: o vínculo funciona à mesma e o contabilista vê um
--     identificador curto.
--
--     O nome viaja no VÍNCULO, não na conta. Consequências deliberadas:
--       · dois contabilistas podem ver nomes diferentes da mesma pessoa;
--       · terminar o acompanhamento apaga o nome e o email de contacto,
--         porque a autorização para os ter acabou nesse instante.
--
--  2. `agendamentos.local_ou_ligacao` existe desde a 042, a rota de API
--     aceita-a e grava-a — e nenhum ecrã a lê. Quem marcava uma consulta
--     presencial nunca ficava a saber a morada, e quem marcava online nunca
--     recebia o link. Aqui só se documenta a coluna; a correção é de
--     interface, e é a mais barata de toda a lista.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. O nome e o contacto que o cliente escolhe dar ────────────────
ALTER TABLE public.contabilista_vinculos
  ADD COLUMN IF NOT EXISTS nome_cliente text
    CHECK (nome_cliente IS NULL OR char_length(nome_cliente) BETWEEN 2 AND 80),
  ADD COLUMN IF NOT EXISTS email_cliente text
    CHECK (email_cliente IS NULL OR char_length(email_cliente) BETWEEN 5 AND 180);

COMMENT ON COLUMN public.contabilista_vinculos.nome_cliente IS
  'Nome por que o cliente quer ser tratado NESTE vínculo. Opcional — sem ele o contabilista vê um identificador curto. Apagado ao terminar o acompanhamento.';
COMMENT ON COLUMN public.contabilista_vinculos.email_cliente IS
  'Email de contacto que o cliente decidiu partilhar com ESTE contabilista. Nunca vem da conta. Apagado ao terminar o acompanhamento.';


-- ── 2. O cliente pode mudar o nome; não pode mudar mais nada ────────
--
-- A política de UPDATE do cliente exigia `estado = 'terminado'`: qualquer
-- escrita dele tinha de ser uma despedida. Para poder corrigir o nome sem
-- terminar a relação, a política abre — e o que fecha passa a ser um
-- gatilho, que ao contrário de um `WITH CHECK` consegue comparar com a
-- linha antiga.
CREATE OR REPLACE FUNCTION public.vinculos_tranca_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Terminar leva o nome e o contacto com ele, seja quem for a terminar.
  -- A autorização para os ter acabou; guardá-los «só por histórico» seria
  -- ficar com dados pessoais para além do consentimento que os trouxe.
  IF NEW.estado = 'terminado' AND OLD.estado <> 'terminado' THEN
    NEW.nome_cliente := NULL;
    NEW.email_cliente := NULL;
  END IF;

  -- A chave de serviço e o contabilista seguem sem mais perguntas.
  IF auth.uid() IS NULL OR auth.uid() = NEW.contabilista_id THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = NEW.cliente_id THEN
    IF NEW.contabilista_id IS DISTINCT FROM OLD.contabilista_id
       OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
       OR NEW.origem IS DISTINCT FROM OLD.origem THEN
      RAISE EXCEPTION 'O cliente não pode alterar as partes do vínculo.';
    END IF;
    -- Aceitar-se a si próprio como cliente continua fora de questão: quem
    -- decide isso é o contabilista.
    IF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado <> 'terminado' THEN
      RAISE EXCEPTION 'O cliente só pode terminar o acompanhamento.';
    END IF;
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.vinculos_tranca_cliente() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS vinculos_tranca ON public.contabilista_vinculos;
CREATE TRIGGER vinculos_tranca
  BEFORE UPDATE ON public.contabilista_vinculos
  FOR EACH ROW EXECUTE FUNCTION public.vinculos_tranca_cliente();

-- Com o gatilho a fechar, a política pode deixar de exigir a despedida.
DROP POLICY IF EXISTS "vinculos_cliente_termina" ON public.contabilista_vinculos;
CREATE POLICY "vinculos_cliente_termina" ON public.contabilista_vinculos
  FOR UPDATE TO authenticated
  USING (cliente_id = (SELECT auth.uid()))
  WITH CHECK (cliente_id = (SELECT auth.uid()));


-- ── 3. A coluna que já existia e ninguém mostrava ───────────────────
COMMENT ON COLUMN public.agendamentos.local_ou_ligacao IS
  'Morada da consulta presencial, ou link da chamada. Preenchida pelo contabilista ao confirmar e mostrada ao cliente. Existe desde a 042; até à 043 nenhum ecrã a lia.';
