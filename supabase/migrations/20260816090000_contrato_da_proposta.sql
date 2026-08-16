-- =====================================================================
--  O CONTRATO DA PROPOSTA — LER O DOCUMENTO, E NÃO SÓ O RESUMO
--  ---------------------------------------------------------------------
--  A 051 já impede decidir uma proposta sem duas marcas: chegou ao fim do
--  TEXTO (`lida_ate_ao_fim_em`) e confirmou que leu (`confirmacao_em`).
--  Faltava a parte que interessa quando há contrato: o texto da proposta
--  é um resumo, e o que se aceita é o documento anexo.
--
--  Sem esta migração, alguém podia rolar seis linhas de resumo, marcar a
--  caixa e aceitar um contrato de doze páginas que nunca abriu. A caixa
--  dizia «li e compreendi» e era falsa por construção.
--
--  O que se acrescenta:
--
--   · `contrato_lido_em` — instante em que o cliente chegou ao fim do
--     documento anexo marcado como contrato;
--   · `marcar_contrato_lido()` — a única forma de o escrever;
--   · a mesma condição dentro de `confirmar_leitura_da_proposta` e de
--     `decidir_proposta`, para a garantia não viver na interface.
--
--  O QUE ISTO PROVA, E O QUE NÃO PROVA
--  -----------------------------------
--  Nenhum sistema sabe se uma pessoa leu. O que estas colunas registam é
--  que o fluxo de leitura foi percorrido até ao fim — a última página do
--  documento esteve no ecrã, ou foi alcançada por teclado. É o mesmo grau
--  de prova que `lida_ate_ao_fim_em` já tinha, e é honesto chamar-lhe o
--  que é: uma marca de percurso, não uma declaração de compreensão. O que
--  o produto NÃO pode fazer é dizer que a pessoa leu quando nem sequer
--  abriu — e é isso que aqui deixa de ser possível.
--
--  Propostas SEM contrato anexo continuam exatamente como estavam: a
--  condição só se aplica quando existe um anexo com `e_contrato = true`.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
--  1. A coluna
-- ---------------------------------------------------------------------
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS contrato_lido_em timestamptz;

COMMENT ON COLUMN public.propostas.contrato_lido_em IS
  'Quando o cliente chegou ao fim do documento anexo marcado como contrato. Nulo enquanto não chegar. Só `marcar_contrato_lido()` o escreve; ninguém o escreve por UPDATE direto, porque a política de escrita do cliente não inclui esta tabela.';

-- ---------------------------------------------------------------------
--  2. Esta proposta traz contrato?
-- ---------------------------------------------------------------------
--  Uma função e não um `EXISTS` repetido em três sítios: repetido, era o
--  tipo de condição que se corrige em dois e se esquece no terceiro.
CREATE OR REPLACE FUNCTION public.proposta_tem_contrato(p_proposta uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proposta_anexos a
     WHERE a.proposta_id = p_proposta AND a.e_contrato IS TRUE
  );
$$;

COMMENT ON FUNCTION public.proposta_tem_contrato(uuid) IS
  'True quando a proposta tem anexo marcado como contrato. É o que decide se a leitura do documento é exigida — uma proposta sem contrato não passa a ter um requisito que não pode cumprir.';

-- ---------------------------------------------------------------------
--  3. Marcar o contrato como lido até ao fim
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marcar_contrato_lido(p_proposta uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  IF NOT public.proposta_tem_contrato(p_proposta) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_contrato');
  END IF;

  -- `coalesce` mantém o PRIMEIRO instante: reabrir o documento não
  -- reescreve a hora em que a pessoa lá chegou pela primeira vez.
  UPDATE public.propostas p
     SET contrato_lido_em = coalesce(p.contrato_lido_em, now())
   WHERE p.id = p_proposta
     AND public.dono_do_caso(p.caso_id, auth.uid())
     AND p.estado IN ('enviada', 'lida')
  RETURNING p.id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_decidivel');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.marcar_contrato_lido(uuid) IS
  'Regista que o cliente chegou ao fim do contrato anexo. Chamada pelo leitor de documentos quando a última página é alcançada — a rolar ou por teclado.';

-- ---------------------------------------------------------------------
--  4. Confirmar leitura passa a exigir o contrato
-- ---------------------------------------------------------------------
--  A caixa «li e compreendi» é uma declaração. Deixá-la marcar antes de o
--  documento ter sido aberto é pedir a alguém que declare o que não pode
--  saber.
CREATE OR REPLACE FUNCTION public.confirmar_leitura_da_proposta(p_proposta uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  UPDATE public.propostas p
     SET confirmacao_em = coalesce(p.confirmacao_em, now())
   WHERE p.id = p_proposta
     AND public.dono_do_caso(p.caso_id, auth.uid())
     AND p.lida_ate_ao_fim_em IS NOT NULL
     AND (NOT public.proposta_tem_contrato(p.id) OR p.contrato_lido_em IS NOT NULL)
     AND p.estado IN ('enviada', 'lida')
  RETURNING p.id INTO v_id;

  IF v_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.propostas p
                WHERE p.id = p_proposta
                  AND public.dono_do_caso(p.caso_id, auth.uid())
                  AND p.contrato_lido_em IS NULL
                  AND public.proposta_tem_contrato(p.id)) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'contrato_por_ler');
    END IF;
    RETURN jsonb_build_object('ok', false, 'motivo', 'ainda_nao_leste_ate_ao_fim');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------
--  5. Decidir passa a exigir o contrato
-- ---------------------------------------------------------------------
--  A função é a da 051 com UMA condição a mais e UM motivo a mais. O
--  resto do corpo é igual — incluindo o vínculo que nasce ao aceitar, que
--  continua a ser consequência da decisão e não porta de entrada.
CREATE OR REPLACE FUNCTION public.decidir_proposta(
  p_proposta uuid,
  p_decisao  text,
  p_motivo   text DEFAULT NULL,
  p_valor_pedido integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  u uuid := auth.uid();
  v_id uuid; v_caso uuid; v_cc uuid; v_novo text; v_vinculo uuid;
BEGIN
  IF p_decisao NOT IN ('aceitar', 'recusar', 'pedir_desconto') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'decisao_invalida');
  END IF;
  IF p_decisao = 'pedir_desconto'
     AND (p_valor_pedido IS NULL OR p_valor_pedido < 0) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'falta_o_valor');
  END IF;

  v_novo := CASE p_decisao WHEN 'aceitar' THEN 'aceite'
                           WHEN 'recusar' THEN 'recusada'
                           ELSE 'desconto_pedido' END;

  UPDATE public.propostas p
     SET estado = v_novo,
         decidida_em = now(),
         motivo = nullif(btrim(coalesce(p_motivo, '')), '')
   WHERE p.id = p_proposta
     AND public.dono_do_caso(p.caso_id, u)
     AND p.estado IN ('enviada', 'lida')
     -- ⚠️ A regra, aqui. Sem estas linhas, a interface era a única coisa
     -- entre alguém e aceitar um contrato que não leu.
     AND p.lida_ate_ao_fim_em IS NOT NULL
     AND p.confirmacao_em IS NOT NULL
     -- ⚠️ E quando há documento, o documento também conta: o texto da
     -- proposta é o resumo; o contrato é o que fica a valer.
     AND (NOT public.proposta_tem_contrato(p.id) OR p.contrato_lido_em IS NOT NULL)
     AND (p.validade_ate IS NULL OR p.validade_ate >= current_date)
  RETURNING p.id, p.caso_id, p.contabilista_id INTO v_id, v_caso, v_cc;

  IF v_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = p_proposta
                AND public.dono_do_caso(p.caso_id, u)
                AND p.contrato_lido_em IS NULL
                AND public.proposta_tem_contrato(p.id)) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'contrato_por_ler');
    END IF;
    IF EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = p_proposta
                AND public.dono_do_caso(p.caso_id, u)
                AND (p.lida_ate_ao_fim_em IS NULL OR p.confirmacao_em IS NULL)) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'ainda_nao_leste_e_confirmaste');
    END IF;
    IF EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = p_proposta
                AND public.dono_do_caso(p.caso_id, u)
                AND p.validade_ate < current_date) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'proposta_expirada');
    END IF;
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_decidivel');
  END IF;

  IF p_decisao = 'aceitar' THEN
    UPDATE public.propostas SET estado = 'substituida'
     WHERE caso_id = v_caso AND id <> v_id AND estado IN ('enviada', 'lida');

    UPDATE public.casos SET estado = 'aceite' WHERE id = v_caso;

    INSERT INTO public.contabilista_vinculos
      (contabilista_id, cliente_id, origem, estado)
    VALUES (v_cc, u, 'cliente', 'ativo')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_vinculo;

    PERFORM public.avisar_utilizador(v_cc, 'vinculo_aceite',
      'A tua proposta foi aceite',
      'Já podes marcar consultas e falar diretamente.', '/contabilista/clientes');
  ELSIF p_decisao = 'pedir_desconto' THEN
    PERFORM public.avisar_utilizador(v_cc, 'mensagem',
      'Foi pedido um desconto',
      'Vê o pedido e envia uma proposta nova, se quiseres.', '/contabilista/casos');
  ELSE
    PERFORM public.avisar_utilizador(v_cc, 'mensagem',
      'Uma proposta tua foi recusada', NULL, '/contabilista/casos');
  END IF;

  RETURN jsonb_build_object('ok', true, 'estado', v_novo);
END;
$$;

COMMENT ON FUNCTION public.decidir_proposta(uuid, text, text, integer) IS
  'Recusa enquanto `lida_ate_ao_fim_em`, `confirmacao_em` — ou, havendo contrato anexo, `contrato_lido_em` — forem nulos. O botão desativado na interface é conveniência; a garantia é esta.';

-- ---------------------------------------------------------------------
--  6. Permissões: as mesmas das irmãs
-- ---------------------------------------------------------------------
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.marcar_contrato_lido(uuid)',
    'public.proposta_tem_contrato(uuid)',
    'public.confirmar_leitura_da_proposta(uuid)',
    'public.decidir_proposta(uuid, text, text, integer)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;

COMMIT;
