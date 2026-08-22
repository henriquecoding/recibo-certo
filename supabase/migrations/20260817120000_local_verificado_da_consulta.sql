-- 20260817120000_local_verificado_da_consulta.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O LOCAL DA CONSULTA DEIXA DE SER UMA FRASE
--  ---------------------------------------------------------------------
--  Desde a 042 que `agendamentos.local_ou_ligacao` é uma linha de texto de
--  500 caracteres. É onde cabe «https://meet…/marta» e é também onde cabe
--  «Rua de exemplo, 1 · Matosinhos» — e é aí que a promessa parte.
--
--  Um link é auto-suficiente: clica-se e chega-se lá. Uma morada escrita à
--  mão não é. «Rua de exemplo, 1 · Matosinhos» não diz a que Matosinhos, não
--  diz se o número existe, não abre no telemóvel de ninguém e não sobrevive
--  a uma gralha. O cliente que a lê fica exatamente onde estava: a copiar
--  texto para outro sítio e a torcer para o mapa adivinhar.
--
--  Esta migração acrescenta ao agendamento o par de coordenadas do ponto
--  que o contabilista escolheu MESMO — num mapa, com o pino em cima da
--  porta. Não substitui a morada: acompanha-a. A morada continua a ser o
--  que se lê; as coordenadas são o que se verifica e o que abre direito na
--  aplicação de mapas do cliente.
--
--  Três decisões:
--
--   1. Duas colunas, não um jsonb. Um par de números com domínio conhecido
--      não ganha nada em ser um documento, e ganha muito em ser verificável
--      por CHECK. Latitude fora de [-90, 90] é um erro de programa, não um
--      dado — e a base recusa-o.
--
--   2. As coordenadas só existem juntas. Meia coordenada não é meia
--      informação: é um ponto no meridiano de Greenwich, que fica no mar.
--      A restrição exige as duas ou nenhuma.
--
--   3. `confirmar_consulta` muda de assinatura, e por isso é DROP e não
--      CREATE OR REPLACE — deixar a versão de dois argumentos viva daria
--      uma sobrecarga ambígua ao PostgREST, que escolheria a errada
--      exatamente nas chamadas que trazem o ponto.
--
--      Caem as DUAS assinaturas, e a segunda linha não é zelo a mais: é o
--      que torna esta migração re-aplicável. Ver a nota na secção 2.
--
--  E uma quarta, que é a que faltava ao ecrã:
--
--   4. `definir_local_consulta`. Até aqui o local só se escrevia no
--      instante da confirmação. Quem confirmasse primeiro e recebesse a
--      morada da sala depois não tinha por onde a corrigir — a consulta já
--      não estava «por confirmar», e a única RPC que escrevia o campo
--      exigia esse estado. Mudar de sala, corrigir o andar ou trocar o link
--      da chamada passa a ser uma operação com nome próprio, que avisa o
--      cliente como qualquer outra mudança que lhe diga respeito.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. As colunas ───────────────────────────────────────────────────────

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS local_lat double precision,
  ADD COLUMN IF NOT EXISTS local_lng double precision;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.agendamentos'::regclass
       AND conname = 'agendamentos_local_ponto_completo'
  ) THEN
    ALTER TABLE public.agendamentos
      ADD CONSTRAINT agendamentos_local_ponto_completo CHECK (
        (local_lat IS NULL AND local_lng IS NULL)
        OR (
          local_lat IS NOT NULL AND local_lng IS NOT NULL
          AND local_lat BETWEEN -90 AND 90
          AND local_lng BETWEEN -180 AND 180
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.agendamentos.local_lat IS
  'Latitude do ponto escolhido no mapa ao marcar o local da consulta presencial. Nula quando o local é só texto (linhas anteriores a esta migração) ou quando a consulta é online.';
COMMENT ON COLUMN public.agendamentos.local_lng IS
  'Longitude do ponto escolhido no mapa. Só existe em par com local_lat — ver a restrição agendamentos_local_ponto_completo.';

-- O cliente já lia `local_ou_ligacao` pela policy da própria consulta; as
-- colunas novas seguem o mesmo caminho por herdarem a policy da tabela.
-- Nada a conceder à parte: `agendamentos` não tem grants por coluna.

-- ── 2. Confirmar passa a aceitar o ponto ────────────────────────────────

-- Caem as duas assinaturas, e por motivos diferentes.
--
-- A de dois argumentos porque é a que esta migração vem substituir. A de
-- quatro porque `CREATE FUNCTION` não é `CREATE OR REPLACE`: se ela já
-- existir, o comando falha com 42723 e leva a transação inteira atrás.
--
-- E ela já existe sempre que isto corre uma segunda vez — o que acontece,
-- porque o `bundle/` inclui a 047, e a 047 ressuscita a de dois argumentos
-- com CREATE OR REPLACE. Sem esta segunda linha, a segunda passagem
-- deixava a base com as duas vivas ao mesmo tempo e qualquer chamada de
-- dois argumentos passava a devolver 42725 («is not unique») — exatamente
-- a ambiguidade que a decisão 3 existe para evitar.
DROP FUNCTION IF EXISTS public.confirmar_consulta(uuid, text);
DROP FUNCTION IF EXISTS public.confirmar_consulta(uuid, text, double precision, double precision);

CREATE FUNCTION public.confirmar_consulta(
  p_agendamento uuid,
  p_local text DEFAULT NULL,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid; v_vinculo uuid; v_cliente uuid;
BEGIN
  -- Meia coordenada é ruído: ou vêm as duas, ou não vem ponto nenhum.
  IF (p_lat IS NULL) <> (p_lng IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ponto_incompleto');
  END IF;

  UPDATE public.agendamentos a
     SET estado = 'confirmado',
         local_ou_ligacao = coalesce(nullif(btrim(coalesce(p_local, '')), ''), a.local_ou_ligacao),
         -- O ponto acompanha a morada que veio com ele. Sem morada nova,
         -- o ponto antigo fica — trocar um pelo outro deixaria o pino
         -- numa rua e o texto noutra.
         local_lat = CASE WHEN p_lat IS NOT NULL THEN p_lat ELSE a.local_lat END,
         local_lng = CASE WHEN p_lng IS NOT NULL THEN p_lng ELSE a.local_lng END,
         atualizado_em = now()
   WHERE a.id = p_agendamento
     AND a.contabilista_id = auth.uid()
     AND a.estado = 'pedido'
     AND public.contabilista_ativo(auth.uid())
  RETURNING a.id, a.cliente_id INTO v_id, v_cliente;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_estava_por_confirmar');
  END IF;

  SELECT v.id INTO v_vinculo FROM public.contabilista_vinculos v
   WHERE v.contabilista_id = auth.uid() AND v.cliente_id = v_cliente AND v.estado <> 'terminado';
  IF v_vinculo IS NOT NULL THEN
    PERFORM public.avisar_parte(v_vinculo, auth.uid(), 'consulta_confirmada',
      'A tua consulta foi confirmada', 'Vê a hora e o local na tua área.',
      '/dashboard/contabilista');
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- ── 3. Corrigir o local depois de confirmada ────────────────────────────

-- O aviso novo tem de caber na restrição da 044 (alargada pela sala).
ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_tipo_check CHECK (tipo IN (
  'vinculo_pedido', 'vinculo_aceite', 'mensagem',
  'consulta_pedida', 'consulta_confirmada', 'consulta_cancelada',
  'partilha_recebida', 'cupao_ganho', 'candidatura_decidida',
  'pedido_criado', 'pedido_respondido', 'pedido_concluido',
  'consulta_local_mudou'));

-- Uma morada que muda na véspera é precisamente o que faz alguém aparecer
-- na porta errada. Entra na lista curta do que justifica um email.
--
-- ⚠️ A etiqueta do dólar é `$func$` e não `$$` de propósito: aplicada por um
-- runner que separa instruções por `$$`, esta declaração é engolida em
-- silêncio no meio das outras — a migração diz que correu e a função fica
-- com o corpo antigo. Aconteceu, e só se viu porque o valor foi conferido
-- na base a seguir. Uma etiqueta com nome não colide com nada.
--
-- O `SET search_path` vem do mesmo sítio que o resto do painel: o corpo não
-- referencia nome nenhum — compara um texto com literais — por isso fixá-lo
-- não muda o significado e tira a dependência de quem chama (lint 0011).
CREATE OR REPLACE FUNCTION public.aviso_merece_email(p_tipo text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = '' AS $func$
  SELECT p_tipo IN ('vinculo_pedido', 'vinculo_aceite', 'consulta_pedida',
                    'consulta_confirmada', 'consulta_cancelada', 'cupao_ganho',
                    'candidatura_decidida', 'consulta_local_mudou')
$func$;

CREATE OR REPLACE FUNCTION public.definir_local_consulta(
  p_agendamento uuid,
  p_local text,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid; v_vinculo uuid; v_cliente uuid; v_texto text;
BEGIN
  IF (p_lat IS NULL) <> (p_lng IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ponto_incompleto');
  END IF;

  v_texto := nullif(btrim(coalesce(p_local, '')), '');
  IF v_texto IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'local_vazio');
  END IF;

  -- Só numa consulta que ainda vai acontecer. Reescrever o local de uma
  -- consulta fechada mudava o registo do que aconteceu, e isso não é uma
  -- correção — é outra coisa.
  UPDATE public.agendamentos a
     SET local_ou_ligacao = v_texto,
         local_lat = p_lat,
         local_lng = p_lng,
         atualizado_em = now()
   WHERE a.id = p_agendamento
     AND a.contabilista_id = auth.uid()
     AND a.estado IN ('pedido', 'confirmado')
     AND public.contabilista_ativo(auth.uid())
  RETURNING a.id, a.cliente_id INTO v_id, v_cliente;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_editavel');
  END IF;

  SELECT v.id INTO v_vinculo FROM public.contabilista_vinculos v
   WHERE v.contabilista_id = auth.uid() AND v.cliente_id = v_cliente AND v.estado <> 'terminado';
  IF v_vinculo IS NOT NULL THEN
    PERFORM public.avisar_parte(v_vinculo, auth.uid(), 'consulta_local_mudou',
      'O local da consulta mudou', 'Vê onde é, na tua área.',
      '/dashboard/contabilista');
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- ── 4. Quem pode chamar ─────────────────────────────────────────────────

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.confirmar_consulta(uuid, text, double precision, double precision)',
    'public.definir_local_consulta(uuid, text, double precision, double precision)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.confirmar_consulta(uuid, text, double precision, double precision) IS
  'Confirma e grava o local. O ponto é opcional e só entra em par; sem morada nova, o ponto anterior mantém-se para o pino não ficar noutra rua que o texto.';
COMMENT ON FUNCTION public.definir_local_consulta(uuid, text, double precision, double precision) IS
  'Corrige o local de uma consulta ainda por acontecer, sem a reconfirmar. Existe porque quem confirma primeiro e recebe a morada da sala depois não tinha por onde a escrever, e porque salas mudam.';
