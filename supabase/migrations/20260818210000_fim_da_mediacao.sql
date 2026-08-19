-- 20260818210000_fim_da_mediacao.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O FIM DA MEDIAÇÃO
--  ---------------------------------------------------------------------
--  A migração 051 pôs a plataforma no meio de tudo o que era dito: uma
--  mensagem nascia `submetida`, alguém da administração lia-a, e só depois
--  de aprovada é que existia para o outro lado.
--
--  A intenção era boa e está escrita em `docs/ESTRATEGIA-INTERMEDIACAO.md`:
--  «nada é dito sem passar por revisão». O custo estava escrito na mesma
--  página, com todas as letras: **a plataforma lê o que é escrito.**
--
--  É esse custo que deixa de se pagar. Não por ser caro em trabalho — é
--  caro nisso também — mas porque obriga uma pessoa a ler conversa
--  confidencial que não lhe foi dirigida. Um contabilista e o seu cliente
--  falam de dívidas, de divórcios, de heranças e de dinheiro que não
--  chegou. Um terceiro no meio disso não é uma salvaguarda: é uma pessoa a
--  ler o que não devia, por obrigação de ofício.
--
--  Quatro decisões, e nenhuma é uma política que alguém promete cumprir:
--
--   1. A MENSAGEM NASCE ENTREGUE. Não há estado intermédio, não há fila,
--      não há aprovação. Quem escreve, envia; quem recebe, lê.
--
--   2. A ADMINISTRAÇÃO DEIXA DE ALCANÇAR O CORPO. Sai o `is_admin()` da
--      política de leitura de `caso_mensagens`. Não é «deixámos de abrir o
--      ecrã»: é não haver caminho. Um `select` de administrador sobre esta
--      tabela devolve zero linhas.
--
--   3. EXCEÇÃO ÚNICA, E PEDIDA POR QUEM ESTÁ LÁ DENTRO. Se uma das partes
--      denunciar uma mensagem, ESSA mensagem — e apenas essa — passa a ser
--      legível pela administração, porque foi alguém de dentro que pediu
--      ajuda. Privacidade por omissão, acesso por consentimento explícito.
--
--   4. O CASO VAI DIRETO. O cliente escolhe a quem o envia. A triagem
--      manual sai: era o mesmo terceiro a ler a mesma coisa mais cedo.
--
--  E A FRONTEIRA DE CONTACTO
--  -------------------------
--  Cai com o resto. A migração `20260816150000` recusava um email ou um
--  telemóvel escritos numa mensagem, para que a relação não saísse daqui.
--  Isso é a mesma intermediação vista do outro lado — e era a fricção mais
--  visível do produto: uma parede a meio de uma frase, a quem não estava a
--  fazer nada de mal.
--
--  Os contactos passam a ser do cliente para dar: um interruptor no caso,
--  ligado por omissão porque descrever um caso é pedir para ser contactado,
--  e desligável a qualquer momento. O contabilista só os alcança enquanto
--  esse interruptor estiver ligado.
--
--  O QUE ISTO CUSTA, DITO SEM RODEIOS
--  ----------------------------------
--  Quem quiser combinar tudo fora da plataforma passa a poder. A comissão
--  incide sobre o que acontece por aqui, e o que sair daqui não conta. É
--  uma troca deliberada: menos controlo sobre a relação, nenhuma leitura
--  de conversa alheia.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. O interruptor dos contactos ──────────────────────────────────
--
-- Ligado por omissão. Não é um consentimento presumido escondido: o
-- formulário do caso mostra-o marcado, com o texto ao lado, e o cliente
-- desmarca-o antes de submeter se não quiser. Depois disso desliga-se e
-- religa-se no detalhe do caso, e o efeito é imediato — a política lê a
-- coluna, não uma cópia dela.
ALTER TABLE public.casos
  ADD COLUMN IF NOT EXISTS partilha_contactos boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.casos.partilha_contactos IS
  'Enquanto for verdadeiro, os contabilistas com o caso encaminhado alcançam `caso_contactos`. O cliente liga e desliga quando quiser.';


-- ── 2. A mensagem nasce entregue ────────────────────────────────────
--
-- `entregue` entra no CHECK e passa a ser o DEFAULT. Os estados antigos
-- ficam no domínio permitido porque as linhas antigas existem e um CHECK
-- que as invalida não deixa a tabela ser alterada.
ALTER TABLE public.caso_mensagens
  DROP CONSTRAINT IF EXISTS caso_mensagens_estado_check;

ALTER TABLE public.caso_mensagens
  ADD CONSTRAINT caso_mensagens_estado_check
  CHECK (estado IN ('entregue', 'submetida', 'aprovada', 'devolvida', 'recusada'));

ALTER TABLE public.caso_mensagens
  ALTER COLUMN estado SET DEFAULT 'entregue';

-- As que estavam à espera de uma revisão que deixou de existir seguem.
-- Foram escritas para serem enviadas, e ficarem paradas para sempre seria
-- a mediação a continuar a produzir efeito depois de removida.
--
-- `devolvida` e `recusada` NÃO se convertem: essas tiveram uma decisão, e
-- entregá-las agora seria publicar o que alguém foi informado que não
-- seguia. Quem as escreveu reescreve-as, e a mensagem nova nasce entregue.
UPDATE public.caso_mensagens
   SET estado = 'entregue'
 WHERE estado = 'submetida';


-- ── 3. A denúncia — a única porta, e abre-se por dentro ─────────────
ALTER TABLE public.caso_mensagens
  ADD COLUMN IF NOT EXISTS denunciada_em     timestamptz,
  ADD COLUMN IF NOT EXISTS denunciada_por    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS denuncia_motivo   text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'caso_mensagens_denuncia_motivo_check'
       AND conrelid = 'public.caso_mensagens'::regclass
  ) THEN
    ALTER TABLE public.caso_mensagens
      ADD CONSTRAINT caso_mensagens_denuncia_motivo_check
      CHECK (denuncia_motivo IS NULL OR char_length(denuncia_motivo) BETWEEN 1 AND 1000);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS caso_mensagens_denunciadas_idx
  ON public.caso_mensagens (denunciada_em DESC) WHERE denunciada_em IS NOT NULL;

COMMENT ON COLUMN public.caso_mensagens.denunciada_em IS
  'Enquanto for nulo, nem a administração alcança esta linha. Preenchido por `denunciar_mensagem`, chamada por uma das partes.';


-- ── 4. As políticas ─────────────────────────────────────────────────
--
-- LEITURA: quem escreveu, o dono do caso e o contabilista a quem o caso
-- foi encaminhado. Mais ninguém — e «mais ninguém» inclui a
-- administração, que é o ponto todo desta migração.
DROP POLICY IF EXISTS "caso_mensagens_le" ON public.caso_mensagens;
CREATE POLICY "caso_mensagens_le" ON public.caso_mensagens
  FOR SELECT TO authenticated
  USING (
    autor_id = (SELECT auth.uid())
    OR public.dono_do_caso(caso_id, (SELECT auth.uid()))
    OR public.encaminhado_para(caso_id, (SELECT auth.uid()))
    -- A porta que se abre por dentro: só a linha denunciada, e só depois
    -- de o ter sido.
    OR (denunciada_em IS NOT NULL AND public.is_admin())
  );

-- ESCRITA: nasce `entregue`, sem revisão, sem redação de terceiro.
DROP POLICY IF EXISTS "caso_mensagens_escreve" ON public.caso_mensagens;
CREATE POLICY "caso_mensagens_escreve" ON public.caso_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND estado = 'entregue'
    AND corpo_encaminhado IS NULL
    AND revisto_por IS NULL
    AND revisto_em IS NULL
    AND denunciada_em IS NULL
    AND (
      (autor_papel = 'cliente' AND public.dono_do_caso(caso_id, (SELECT auth.uid())))
      OR (autor_papel = 'contabilista'
          AND public.encaminhado_para(caso_id, (SELECT auth.uid())))
    )
  );

REVOKE UPDATE, DELETE ON public.caso_mensagens FROM anon, authenticated;


-- ── 5. Os contactos, para quem o cliente quiser ─────────────────────
--
-- A tabela continua separada de `casos` — essa separação nunca foi o
-- problema, e é ela que faz com que um `select` distraído não devolva um
-- telefone. O que muda é haver agora um caminho DECLARADO, que o cliente
-- abre e fecha.
-- Substitui a política com o mesmo nome, e não acrescenta uma ao lado: no
-- PostgreSQL as políticas permissivas somam-se com OR, e uma segunda a
-- dizer o contrário da primeira nunca restringe nada — só confunde quem
-- lê o esquema à procura de saber quem alcança o quê.
DROP POLICY IF EXISTS "contactos_dono_le" ON public.caso_contactos;
CREATE POLICY "contactos_dono_le" ON public.caso_contactos
  FOR SELECT TO authenticated
  USING (
    public.dono_do_caso(caso_id, (SELECT auth.uid()))
    OR public.is_admin()
    OR (
      public.encaminhado_para(caso_id, (SELECT auth.uid()))
      AND EXISTS (
        SELECT 1 FROM public.casos c
         WHERE c.id = caso_id AND c.partilha_contactos
      )
    )
  );


-- ── 6. O cliente liga e desliga a partilha ──────────────────────────
CREATE OR REPLACE FUNCTION public.definir_partilha_de_contactos(
  p_caso uuid, p_partilhar boolean
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  UPDATE public.casos SET partilha_contactos = coalesce(p_partilhar, false)
   WHERE id = p_caso AND cliente_id = u;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'caso_nao_encontrado');
  END IF;

  RETURN jsonb_build_object('ok', true, 'partilha', coalesce(p_partilhar, false));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.definir_partilha_de_contactos(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.definir_partilha_de_contactos(uuid, boolean)
  TO authenticated, service_role;


-- ── 7. O caso vai direto, escolhido por quem o descreveu ────────────
--
-- Substitui a triagem. O teto continua a ser imposto pelo gatilho da 051
-- — três contabilistas por caso — e continua a ser o gatilho a impô-lo,
-- não este código.
CREATE OR REPLACE FUNCTION public.enviar_caso_a_contabilista(
  p_caso uuid, p_contabilista uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  IF NOT public.dono_do_caso(p_caso, u) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_e_teu');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contabilistas c
                  WHERE c.user_id = p_contabilista AND c.estado = 'aprovado') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'contabilista_nao_aprovado');
  END IF;

  UPDATE public.casos SET estado = 'encaminhado'
   WHERE id = p_caso
     AND estado IN ('submetido', 'em_triagem', 'encaminhado', 'com_proposta');
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'caso_nao_encaminhavel');
  END IF;

  BEGIN
    INSERT INTO public.caso_encaminhamentos (caso_id, contabilista_id, encaminhado_por)
    VALUES (p_caso, p_contabilista, u);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'ja_encaminhado');
    WHEN raise_exception THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'teto_atingido');
  END;

  PERFORM public.avisar_utilizador(
    p_contabilista, 'vinculo_pedido', 'Um caso novo para ti',
    'Alguém te escolheu. Vê o pedido e responde.', '/contabilista/casos');

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enviar_caso_a_contabilista(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.enviar_caso_a_contabilista(uuid, uuid)
  TO authenticated, service_role;


-- ── 8. Denunciar ────────────────────────────────────────────────────
--
-- Só quem está no caso denuncia, e a denúncia é o que dá à administração
-- o direito de ler AQUELA linha. Sem denúncia, não há leitura.
CREATE OR REPLACE FUNCTION public.denunciar_mensagem(
  p_mensagem uuid, p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  u      uuid := auth.uid();
  v_caso uuid;
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  SELECT m.caso_id INTO v_caso FROM public.caso_mensagens m WHERE m.id = p_mensagem;
  IF v_caso IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'mensagem_nao_encontrada');
  END IF;

  -- Denunciar a própria mensagem não faz sentido nenhum, e abriria um
  -- caminho para entregar à administração o que ela não pode ler: bastava
  -- escrever e denunciar-se a si mesmo.
  IF NOT (public.dono_do_caso(v_caso, u) OR public.encaminhado_para(v_caso, u)) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_estas_no_caso');
  END IF;

  IF EXISTS (SELECT 1 FROM public.caso_mensagens m
              WHERE m.id = p_mensagem AND m.autor_id = u) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_denuncias_o_que_escreveste');
  END IF;

  UPDATE public.caso_mensagens
     SET denunciada_em   = coalesce(denunciada_em, now()),
         denunciada_por  = coalesce(denunciada_por, u),
         denuncia_motivo = coalesce(denuncia_motivo, nullif(btrim(coalesce(p_motivo, '')), ''))
   WHERE id = p_mensagem;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.denunciar_mensagem(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.denunciar_mensagem(uuid, text) TO authenticated, service_role;


-- ── 8b. Os documentos seguem com quem os enviou ─────────────────────
--
-- ⚠️ ISTO NÃO É UMA MELHORIA: É UMA AVARIA POR REPARAR.
--
-- `caso_documentos.libertado_em` nascia nulo, e o único caminho para o
-- preencher era `libertar_documento`, que só a administração podia
-- chamar. Com a triagem removida, um documento anexado pelo cliente
-- ficava para sempre invisível ao contabilista — sem erro, sem aviso, com
-- o cliente convencido de que tinha enviado a fatura.
--
-- A regra passa a ser a que a pessoa já assumia: anexar um documento a um
-- caso É entregá-lo a quem está a tratar dele. E porque isso é uma
-- decisão, tem de se poder desfazer — daí `retirar_documento_do_caso`.

-- Os que ficaram presos seguem. Foram anexados para serem vistos.
UPDATE public.caso_documentos
   SET libertado_em = coalesce(libertado_em, now())
 WHERE libertado_em IS NULL;

-- E os próximos nascem entregues. `CREATE OR REPLACE` sobre a função da
-- 052 muda só as duas linhas do `INSERT` dos documentos do caso — o resto
-- do corpo é copiado tal e qual, e tem de o ser: é ele que valida a vaga
-- e o tamanho anunciado. A assinatura é a mesma, ao tipo: mudá-la fazia o
-- PostgreSQL criar uma sobrecarga em vez de substituir, e ficavam duas.
CREATE OR REPLACE FUNCTION public.fechar_vaga(
  p_vaga uuid, p_nome text, p_bytes integer, p_e_contrato boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v record;
BEGIN
  UPDATE public.anexo_vagas a
     SET usada_em = now()
   WHERE a.id = p_vaga AND a.usada_em IS NULL AND a.expira_em > now()
  RETURNING a.* INTO v;

  IF v.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'vaga_fechada_ou_expirada');
  END IF;
  IF p_bytes > v.bytes_max THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'maior_do_que_o_anunciado');
  END IF;

  IF v.mensagem_id IS NOT NULL THEN
    INSERT INTO public.contabilista_anexos (mensagem_id, caminho, nome, bytes, tipo_mime)
    VALUES (v.mensagem_id, v.caminho, left(p_nome, 200), p_bytes, v.tipo_mime);

  ELSIF v.caso_id IS NOT NULL THEN
    -- Nasce ENTREGUE. Ver o cabeçalho desta secção.
    INSERT INTO public.caso_documentos
      (caso_id, caminho, nome, bytes, tipo_mime, libertado_em)
    VALUES (v.caso_id, v.caminho, left(p_nome, 200), p_bytes, v.tipo_mime, now());

  ELSE
    INSERT INTO public.proposta_anexos
      (proposta_id, caminho, nome, bytes, tipo_mime, e_contrato)
    VALUES (v.proposta_id, v.caminho, left(p_nome, 200), p_bytes, v.tipo_mime,
            coalesce(p_e_contrato, false));
  END IF;

  RETURN jsonb_build_object('ok', true, 'caminho', v.caminho);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fechar_vaga(uuid, text, integer, boolean)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fechar_vaga(uuid, text, integer, boolean) TO service_role;

-- Retirar é do CLIENTE, e só dele: é o dono do documento a mudar de
-- ideias. Não apaga o ficheiro — fecha o acesso, que é o que quem retira
-- quer. O apagar a sério vive na purga de anexos.
CREATE OR REPLACE FUNCTION public.retirar_documento_do_caso(
  p_documento uuid, p_retirar boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  u      uuid := auth.uid();
  v_caso uuid;
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  SELECT d.caso_id INTO v_caso
    FROM public.caso_documentos d WHERE d.id = p_documento;

  IF v_caso IS NULL OR NOT public.dono_do_caso(v_caso, u) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_e_teu');
  END IF;

  UPDATE public.caso_documentos
     SET libertado_em = CASE WHEN p_retirar THEN NULL ELSE now() END
   WHERE id = p_documento;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retirar_documento_do_caso(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.retirar_documento_do_caso(uuid, boolean)
  TO authenticated, service_role;


-- ── 9. O que sai ────────────────────────────────────────────────────
--
-- `rever_mensagem` desaparece. Deixá-la a devolver «indisponível» seria
-- guardar a porta fechada com a chave ao lado: uma migração futura
-- religa-a por distração, e a promessa desta desfaz-se sem ninguém dar
-- por isso.
DROP FUNCTION IF EXISTS public.rever_mensagem(uuid, text, text, text);

-- `encaminhar_caso` também: a triagem manual era o mesmo terceiro a ler a
-- mesma coisa, um passo antes.
DROP FUNCTION IF EXISTS public.encaminhar_caso(uuid, uuid);

-- E `libertar_documento`, que era a triagem aplicada aos ficheiros. Quem
-- decide se um documento segue é quem o anexou — ver a secção 8b.
DROP FUNCTION IF EXISTS public.libertar_documento(uuid, boolean);

-- A fronteira de contacto, e os gatilhos que a aplicavam nos quatro
-- sítios onde se escrevia texto.
DROP TRIGGER IF EXISTS trg_sem_contacto_externo_mensagens ON public.contabilista_mensagens;
DROP TRIGGER IF EXISTS trg_sem_contacto_externo_vinculos  ON public.contabilista_vinculos;
DROP TRIGGER IF EXISTS trg_sem_contacto_externo_partilhas ON public.partilhas;
DROP TRIGGER IF EXISTS trg_sem_contacto_externo_pedido    ON public.pedido_cliente;

DROP FUNCTION IF EXISTS public.rejeitar_contacto_externo();
DROP FUNCTION IF EXISTS public.texto_parece_contacto_externo(text);


-- ── 10. O que a fila da administração passa a ver ───────────────────
--
-- Uma vista, e não um `select` no ecrã, porque o que a administração pode
-- ver desta tabela é uma decisão de esquema e não de interface. Só linhas
-- denunciadas entram — a política da secção 4 já o garante, e a vista
-- torna-o legível para quem for ler o código daqui a um ano.
CREATE OR REPLACE VIEW public.caso_mensagens_denunciadas
WITH (security_invoker = true) AS
  SELECT m.id, m.caso_id, m.autor_papel, m.corpo, m.criado_em,
         m.denunciada_em, m.denunciada_por, m.denuncia_motivo,
         c.referencia
    FROM public.caso_mensagens m
    JOIN public.casos c ON c.id = m.caso_id
   WHERE m.denunciada_em IS NOT NULL;

REVOKE ALL ON public.caso_mensagens_denunciadas FROM anon, public;
GRANT SELECT ON public.caso_mensagens_denunciadas TO authenticated;

COMMENT ON VIEW public.caso_mensagens_denunciadas IS
  'As mensagens que alguém de dentro do caso entregou à administração. `security_invoker` mantém a política da tabela — a vista não é uma porta lateral.';


COMMENT ON TABLE public.caso_mensagens IS
  'Conversa direta entre o cliente e o contabilista. Nasce entregue: não há revisão, e a administração não alcança o corpo sem denúncia.';
