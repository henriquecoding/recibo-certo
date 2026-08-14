\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

-- O modelo de intermediação (migração 051). A garantia central é uma só,
-- e é esta: o contabilista NUNCA alcança os contactos. Não por uma
-- política que o exclui — por não haver caminho nenhum.

\echo ''
\echo '── 61. Um caso submetido ───────────────────────────────────────'
RESET ROLE;
SELECT t.sair();

INSERT INTO auth.users (id, email) VALUES
  ('7a7a7a7a-0000-0000-0000-00000000007a','caso-cliente@exemplo.pt'),
  ('7b7b7b7b-0000-0000-0000-00000000007b','por-aprovar@exemplo.pt')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, email, role) VALUES
  ('7a7a7a7a-0000-0000-0000-00000000007a','caso-cliente@exemplo.pt','user'),
  ('7b7b7b7b-0000-0000-0000-00000000007b','por-aprovar@exemplo.pt','user')
ON CONFLICT (id) DO NOTHING;

-- Um contabilista ainda por aprovar, criado aqui: a Carla da 01 foi
-- aprovada por um teste anterior, e depender do estado que outro
-- ficheiro deixou é depender da ordem por que correm.
INSERT INTO public.contabilistas (user_id, slug, nome, estado)
VALUES ('7b7b7b7b-0000-0000-0000-00000000007b','duarte-por-aprovar','Duarte Por Aprovar','pendente')
ON CONFLICT (user_id) DO NOTHING;

SET ROLE authenticated;
SELECT t.entrar('7a7a7a7a-0000-0000-0000-00000000007a');

DO $$
DECLARE r jsonb;
BEGIN
  r := public.submeter_caso(
    'Preciso de ajuda com o IVA trimestral',
    'Abri atividade em março e nunca entreguei uma declaração periódica de IVA. Não sei se estou em falta nem quanto devo.',
    'iva', 'prazo_proximo',
    'Sofia Marques Pereira', '123456789', 'sofia@exemplo.pt', '912345678', 'Rua A, 12, Porto', 25000);
  ASSERT (r->>'ok')::boolean, format('devia submeter: %s', r);
  ASSERT r->>'referencia' ~ '^RC-[0-9]{4}-[0-9]{4}$',
    format('referência mal formada: %s', r->>'referencia');
  PERFORM set_config('t.caso', r->>'id', false);
  RAISE NOTICE '  ok  · o caso nasce com referência gerada pelo servidor';
END $$;

-- Dois casos abertos na mesma área ocupariam dois contabilistas com o
-- mesmo trabalho.
SELECT t.rpc_recusa($$SELECT public.submeter_caso(
  'Outra vez o IVA','A mesma coisa, submetida outra vez para ver se cola.',
  'iva','normal','Sofia','123456789','sofia@exemplo.pt')$$,
  'ja_tens_um_caso_aberto', 'submeter um segundo caso na mesma área');

-- Um NIF com letras não entra, e a recusa é dita.
SELECT t.rpc_recusa($$SELECT public.submeter_caso(
  'IRS de 2026','Uma situação com detalhe suficiente para passar o limite mínimo.',
  'irs','normal','Sofia','12345678A','sofia@exemplo.pt')$$,
  'dados_invalidos', 'submeter com um NIF que não são nove dígitos');

\echo ''
\echo '── 62. A administração encaminha, com teto ─────────────────────'
SELECT t.entrar('7a7a7a7a-0000-0000-0000-00000000007a');
SELECT t.rpc_recusa($$SELECT public.encaminhar_caso(
  current_setting('t.caso')::uuid, '11111111-1111-1111-1111-111111111111')$$,
  'so_a_administracao', 'o cliente encaminha o seu próprio caso');

SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.rpc_recusa($$SELECT public.encaminhar_caso(
  current_setting('t.caso')::uuid, '11111111-1111-1111-1111-111111111111')$$,
  'so_a_administracao', 'um contabilista encaminha um caso para si próprio');

SELECT t.entrar('44444444-4444-4444-4444-444444444444');
SELECT t.rpc_ok($$SELECT public.encaminhar_caso(
  current_setting('t.caso')::uuid, '11111111-1111-1111-1111-111111111111')$$,
  'a administração encaminha');
SELECT t.rpc_recusa($$SELECT public.encaminhar_caso(
  current_setting('t.caso')::uuid, '11111111-1111-1111-1111-111111111111')$$,
  'ja_encaminhado', 'encaminhar duas vezes para o mesmo');
SELECT t.rpc_recusa($$SELECT public.encaminhar_caso(
  current_setting('t.caso')::uuid, '7b7b7b7b-0000-0000-0000-00000000007b')$$,
  'contabilista_nao_aprovado', 'encaminhar para quem ainda não foi aprovado');

SELECT t.conta($$SELECT count(*) FROM public.admin_auditoria
  WHERE acao='caso_encaminhado'$$, 1, 'o encaminhamento ficou no registo');

\echo ''
\echo '── 63. ⚠️ O contabilista sabe QUEM é, e não POR ONDE falar ──────'
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.casos$$, 1,
  'vê o caso que lhe foi encaminhado');

-- O nome e o NIF são precisos para fazer o trabalho e para orçamentar com
-- seriedade. Escondê-los seria fingir que se pode trabalhar às cegas.
SELECT t.conta($$SELECT count(*) FROM public.casos
  WHERE nome_completo = 'Sofia Marques Pereira' AND nif = '123456789'$$, 1,
  'sabe com quem está a falar — nome e NIF');

-- ⚠️ A GARANTIA. O que ele não pode ter é por onde falar com a pessoa
-- fora daqui. Não há USING nenhum a excluí-lo desta tabela: não há
-- política em que ele caiba, e por isso não há linha nenhuma para ler.
SELECT t.conta($$SELECT count(*) FROM public.caso_contactos$$, 0,
  'não lê o email, o telefone nem a morada de ninguém');
SELECT t.conta($$SELECT count(*) FROM public.caso_contactos
  WHERE caso_id = current_setting('t.caso')::uuid$$, 0,
  'nem sabendo o id exato do caso que lhe foi encaminhado');
SELECT t.recusa($$INSERT INTO public.caso_contactos (caso_id, email)
  VALUES (current_setting('t.caso')::uuid,'x@y.pt')$$,
  'escrever um contacto para depois o ler');

-- E o email da conta também não: `auth.users` não lhe é legível, e o
-- caso nunca o traz consigo.
SELECT t.conta($$SELECT count(*) FROM public.casos c
  WHERE c.id = current_setting('t.caso')::uuid
    AND c.situacao LIKE '%@%'$$, 0,
  'nem a descrição da situação traz um email lá dentro');

-- Um terceiro contabilista, sem encaminhamento, não vê o caso sequer.
SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.conta($$SELECT count(*) FROM public.casos$$, 0,
  'um contabilista sem encaminhamento não vê o caso');

\echo ''
\echo '── 64. Nada é dito sem passar por revisão ──────────────────────'
SELECT t.entrar('7a7a7a7a-0000-0000-0000-00000000007a');
SELECT t.permite($$INSERT INTO public.caso_mensagens
  (caso_id, autor_id, autor_papel, corpo)
  VALUES (current_setting('t.caso')::uuid,'7a7a7a7a-0000-0000-0000-00000000007a',
          'cliente','O meu telemóvel é 912345678, liga-me.')$$,
  'o cliente submete uma mensagem');

-- ⚠️ Nasce SUBMETIDA. Tentar nascer aprovada é o caminho mais curto para
-- contornar a mediação inteira.
SELECT t.recusa($$INSERT INTO public.caso_mensagens
  (caso_id, autor_id, autor_papel, corpo, estado)
  VALUES (current_setting('t.caso')::uuid,'7a7a7a7a-0000-0000-0000-00000000007a',
          'cliente','Aprovada por mim próprio.','aprovada')$$,
  'submeter uma mensagem já aprovada');
SELECT t.recusa($$INSERT INTO public.caso_mensagens
  (caso_id, autor_id, autor_papel, corpo, revisto_por)
  VALUES (current_setting('t.caso')::uuid,'7a7a7a7a-0000-0000-0000-00000000007a',
          'cliente','Revista por mim próprio.','44444444-4444-4444-4444-444444444444')$$,
  'submeter uma mensagem já revista');
SELECT t.recusa($$UPDATE public.caso_mensagens SET estado='aprovada'$$,
  'aprovar a própria mensagem depois de a submeter');

-- O contabilista ainda não lê nada: a mensagem existe, mas não para ele.
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.caso_mensagens$$, 0,
  'antes da revisão, o outro lado não lê nada');

SELECT t.entrar('7a7a7a7a-0000-0000-0000-00000000007a');
SELECT t.conta($$SELECT count(*) FROM public.caso_mensagens$$, 1,
  'quem escreveu vê sempre o que escreveu');

\echo ''
\echo '── 65. Aprovar, devolver, recusar — e nunca reescrever ─────────'
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.rpc_recusa($$SELECT public.rever_mensagem(
  (SELECT id FROM public.caso_mensagens LIMIT 1), 'aprovar')$$,
  'so_a_administracao', 'o contabilista aprova a mensagem que quer ler');

SELECT t.entrar('44444444-4444-4444-4444-444444444444');
SELECT t.rpc_recusa($$SELECT public.rever_mensagem(
  (SELECT id FROM public.caso_mensagens LIMIT 1), 'devolver')$$,
  'falta_a_razao', 'devolver sem dizer o que corrigir');

-- Redigir é permitido; apagar o original não. O que o outro lado lê fica
-- em `corpo_encaminhado`, e o que foi dito fica em `corpo`.
SELECT t.rpc_ok($$SELECT public.rever_mensagem(
  (SELECT id FROM public.caso_mensagens LIMIT 1), 'aprovar', NULL,
  'O cliente pede contacto para tratar do assunto.')$$,
  'a administração aprova, redigindo');

RESET ROLE; SELECT t.sair();
SELECT t.conta($$SELECT count(*) FROM public.caso_mensagens
  WHERE corpo LIKE '%912345678%' AND corpo_encaminhado NOT LIKE '%912345678%'$$, 1,
  'o original fica intacto, e o que segue já não traz o telemóvel');
SELECT t.recusa($$UPDATE public.caso_mensagens SET corpo='outra coisa'$$,
  'reescrever o que foi submetido');

SET ROLE authenticated;
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.caso_mensagens$$, 1,
  'depois de aprovada, o contabilista lê');
-- Rever duas vezes não é possível: a precondição está no WHERE, e a
-- segunda revisão não encontra linha nenhuma para mudar.
SELECT t.entrar('44444444-4444-4444-4444-444444444444');
SELECT t.rpc_recusa($$SELECT public.rever_mensagem(
  (SELECT id FROM public.caso_mensagens LIMIT 1), 'recusar', 'mudei de ideias')$$,
  'ja_revista', 'rever uma segunda vez o que já foi encaminhado');

\echo ''
\echo '── 66. A proposta ──────────────────────────────────────────────'
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.permite($$INSERT INTO public.propostas
  (caso_id, contabilista_id, corpo, valor_cents, prazo_execucao)
  VALUES (current_setting('t.caso')::uuid,'11111111-1111-1111-1111-111111111111',
          'Regularizo as declarações periódicas em falta e acompanho o processo até ao fim, incluindo o contacto com a AT.',
          24000, 'Duas semanas')$$, 'o contabilista envia proposta');

-- ⚠️ Nascer já lida é aceitar-se a si própria.
SELECT t.recusa($$INSERT INTO public.propostas
  (caso_id, contabilista_id, corpo, valor_cents, lida_ate_ao_fim_em, confirmacao_em)
  VALUES (current_setting('t.caso')::uuid,'11111111-1111-1111-1111-111111111111',
          'Uma proposta que já vem lida e confirmada de fábrica.', 100, now(), now())$$,
  'enviar uma proposta já lida e confirmada');

SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.recusa($$INSERT INTO public.propostas
  (caso_id, contabilista_id, corpo, valor_cents)
  VALUES (current_setting('t.caso')::uuid,'55555555-5555-5555-5555-555555555555',
          'Uma proposta para um caso que ninguém me encaminhou.', 100)$$,
  'propor num caso para que não foi encaminhado');

\echo ''
\echo '── 67. ⚠️ Só decide quem leu até ao fim e confirmou ─────────────'
SELECT t.entrar('7a7a7a7a-0000-0000-0000-00000000007a');

-- A regra que o utilizador pediu. Sem isto, a interface era a única coisa
-- entre alguém e aceitar um contrato que não leu.
SELECT t.rpc_recusa($$SELECT public.decidir_proposta(
  (SELECT id FROM public.propostas WHERE valor_cents=24000), 'aceitar')$$,
  'ainda_nao_leste_e_confirmaste', 'aceitar sem ter aberto a proposta');

SELECT t.rpc_recusa($$SELECT public.confirmar_leitura_da_proposta(
  (SELECT id FROM public.propostas WHERE valor_cents=24000))$$,
  'ainda_nao_leste_ate_ao_fim', 'confirmar antes de chegar ao fim');

SELECT t.rpc_ok($$SELECT public.marcar_proposta_lida(
  (SELECT id FROM public.propostas WHERE valor_cents=24000))$$,
  'chegou ao fim do documento');

SELECT t.rpc_recusa($$SELECT public.decidir_proposta(
  (SELECT id FROM public.propostas WHERE valor_cents=24000), 'recusar')$$,
  'ainda_nao_leste_e_confirmaste', 'recusar tendo lido mas sem confirmar');

-- Escrever a confirmação à mão é o caminho óbvio para contornar isto.
SELECT t.recusa($$UPDATE public.propostas SET confirmacao_em=now()$$,
  'marcar a confirmação por escrita direta');

SELECT t.rpc_ok($$SELECT public.confirmar_leitura_da_proposta(
  (SELECT id FROM public.propostas WHERE valor_cents=24000))$$,
  'confirma que leu e compreendeu');

-- E a leitura não se desfaz: se pudesse, a garantia durava até alguém a apagar.
RESET ROLE; SELECT t.sair();
SELECT t.recusa($$UPDATE public.propostas SET lida_ate_ao_fim_em=NULL$$,
  'desfazer a leitura já registada');
SELECT t.recusa($$UPDATE public.propostas SET valor_cents=1$$,
  'baixar o valor de uma proposta já enviada');

SET ROLE authenticated;
SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.rpc_recusa($$SELECT public.decidir_proposta(
  (SELECT id FROM public.propostas WHERE valor_cents=24000), 'aceitar')$$,
  'nao_decidivel', 'um terceiro aceita a proposta de outra pessoa');

\echo ''
\echo '── 68. Aceitar faz nascer a relação ────────────────────────────'
SELECT t.entrar('7a7a7a7a-0000-0000-0000-00000000007a');
SELECT t.conta($$SELECT count(*) FROM public.contabilista_vinculos
  WHERE cliente_id='7a7a7a7a-0000-0000-0000-00000000007a'$$, 0,
  'antes de aceitar não há relação nenhuma — há um pedido');

SELECT t.rpc_ok($$SELECT public.decidir_proposta(
  (SELECT id FROM public.propostas WHERE valor_cents=24000), 'aceitar')$$,
  'aceita, depois de ler e confirmar');

SELECT t.conta($$SELECT count(*) FROM public.contabilista_vinculos
  WHERE cliente_id='7a7a7a7a-0000-0000-0000-00000000007a' AND estado='ativo'$$, 1,
  'o vínculo passa a ser consequência, e não porta de entrada');
SELECT t.conta($$SELECT count(*) FROM public.casos
  WHERE id=current_setting('t.caso')::uuid AND estado='aceite'$$, 1,
  'e o caso fica aceite');

SELECT t.rpc_recusa($$SELECT public.decidir_proposta(
  (SELECT id FROM public.propostas WHERE valor_cents=24000), 'recusar')$$,
  'nao_decidivel', 'mudar de ideias depois de aceitar');
RESET ROLE;

\echo ''
\echo '── 69. Apagar leva o caso inteiro ──────────────────────────────'
SET ROLE authenticated;
SELECT t.entrar('7a7a7a7a-0000-0000-0000-00000000007a');
DO $$
DECLARE inv jsonb;
BEGIN
  inv := public.inventario_do_utilizador();
  ASSERT (inv->>'casos')::int = 1, format('o inventário devia contar o caso: %s', inv->>'casos');
  RAISE NOTICE '  ok  · o inventário conta os casos';
END $$;

SELECT t.rpc_ok($$SELECT public.apagar_conjuntos(ARRAY['casos'])$$,
  'apaga os casos');

RESET ROLE; SELECT t.sair();
SELECT t.conta($$SELECT count(*) FROM public.casos
  WHERE cliente_id='7a7a7a7a-0000-0000-0000-00000000007a'$$, 0, 'o caso saiu');
SELECT t.conta($$SELECT count(*) FROM public.caso_contactos$$, 0,
  'os contactos saíram com ele');
SELECT t.conta($$SELECT count(*) FROM public.propostas$$, 0,
  'e as propostas também — pendem do caso');
SELECT t.conta($$SELECT count(*) FROM public.caso_mensagens$$, 0,
  'e as mensagens, incluindo as que já tinham sido aprovadas');

\echo ''
\echo '── 70. Anexos: uma vaga serve os três sítios ───────────────────'
RESET ROLE;
SELECT t.sair();

-- Cenário novo: o caso anterior foi apagado no teste 69.
INSERT INTO public.casos
  (id, cliente_id, referencia, nome_completo, nif, assunto, situacao, area, estado)
VALUES ('cafe0000-0000-0000-0000-00000000cafe',
        '7a7a7a7a-0000-0000-0000-00000000007a','RC-2026-9001',
        'Sofia Marques Pereira','123456789','IRS de 2026',
        'Preciso de ajuda a entregar o IRS deste ano, com rendimentos de dois países.',
        'irs','submetido');
INSERT INTO public.caso_contactos (caso_id, email)
VALUES ('cafe0000-0000-0000-0000-00000000cafe','sofia@exemplo.pt');

SET ROLE authenticated;
SELECT t.entrar('7a7a7a7a-0000-0000-0000-00000000007a');

DO $$
DECLARE r jsonb;
BEGIN
  r := public.abrir_vaga('caso','cafe0000-0000-0000-0000-00000000cafe','application/pdf', 90000);
  ASSERT (r->>'ok')::boolean, format('devia abrir vaga de caso: %s', r);
  ASSERT r->>'caminho' LIKE 'casos/cafe0000%', format('caminho: %s', r->>'caminho');
  RAISE NOTICE '  ok  · o cliente abre vaga para um documento do caso';
  PERFORM set_config('t.vaga_caso', r->>'id', false);
END $$;

-- Anexar ao caso de outra pessoa é o caminho óbvio.
SELECT t.entrar('33333333-3333-3333-3333-333333333333');
SELECT t.rpc_recusa($$SELECT public.abrir_vaga(
  'caso','cafe0000-0000-0000-0000-00000000cafe','application/pdf',1000)$$,
  'caso_nao_e_teu', 'anexar a um caso alheio');
SELECT t.rpc_recusa($$SELECT public.abrir_vaga(
  'nada','cafe0000-0000-0000-0000-00000000cafe','application/pdf',1000)$$,
  'contexto_invalido', 'inventar um contexto');

-- Os mesmos limites do balde, nos três contextos.
SELECT t.entrar('7a7a7a7a-0000-0000-0000-00000000007a');
SELECT t.rpc_recusa($$SELECT public.abrir_vaga(
  'caso','cafe0000-0000-0000-0000-00000000cafe','text/html',1000)$$,
  'tipo_recusado', 'anexar HTML ao caso');
SELECT t.rpc_recusa($$SELECT public.abrir_vaga(
  'caso','cafe0000-0000-0000-0000-00000000cafe','application/pdf',20000000)$$,
  'tamanho_recusado', 'anexar vinte megabytes ao caso');

-- A linha nasce por libertar. Um documento pode ter o nome da pessoa lá
-- dentro, e quem decide se segue é quem faz a triagem.
RESET ROLE; SELECT t.sair();
SET ROLE service_role;
SELECT t.rpc_ok($$SELECT public.fechar_vaga(
  current_setting('t.vaga_caso')::uuid, 'IRS 2025.pdf', 90000)$$,
  'o servidor fecha a vaga e regista o documento');
RESET ROLE;
SELECT t.conta($$SELECT count(*) FROM public.caso_documentos
  WHERE caso_id='cafe0000-0000-0000-0000-00000000cafe' AND libertado_em IS NULL$$, 1,
  'o documento nasce por libertar');
SELECT set_config('t.caminho_doc',
  (SELECT caminho FROM public.caso_documentos LIMIT 1), false);
SELECT set_config('t.doc_id',
  (SELECT id::text FROM public.caso_documentos LIMIT 1), false);

\echo ''
\echo '── 71. O contabilista só vê o que foi libertado ────────────────'
SET ROLE authenticated;
SELECT t.entrar('44444444-4444-4444-4444-444444444444');
SELECT t.rpc_ok($$SELECT public.encaminhar_caso(
  'cafe0000-0000-0000-0000-00000000cafe','11111111-1111-1111-1111-111111111111')$$,
  'a administração encaminha o caso novo');

SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.caso_documentos$$, 0,
  'antes de libertado, o contabilista não vê o documento');
-- Mesmo com o caminho exato: sem estar libertado, não segue.
SELECT t.rpc_recusa($$SELECT public.anexo_legivel(
  current_setting('t.caminho_doc'))$$,
  'sem_acesso', 'nem com o caminho exato o consegue descarregar');
SELECT t.rpc_recusa($$SELECT public.libertar_documento(
  current_setting('t.doc_id')::uuid, true)$$,
  'so_a_administracao', 'nem se liberta a si próprio o documento');

RESET ROLE; SELECT t.sair();
SET ROLE authenticated;
SELECT t.entrar('44444444-4444-4444-4444-444444444444');
SELECT t.rpc_ok($$SELECT public.libertar_documento(
  current_setting('t.doc_id')::uuid, true)$$,
  'a administração liberta o documento');

SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.conta($$SELECT count(*) FROM public.caso_documentos$$, 1,
  'depois de libertado, o contabilista vê');
SELECT t.rpc_ok($$SELECT public.anexo_legivel(
  current_setting('t.caminho_doc'))$$, 'e consegue descarregá-lo');

SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.rpc_recusa($$SELECT public.anexo_legivel(
  current_setting('t.caminho_doc'))$$,
  'sem_acesso', 'um contabilista de fora do caso não descarrega nada');

\echo ''
\echo '── 72. O contrato da proposta ──────────────────────────────────'
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.permite($$INSERT INTO public.propostas
  (id, caso_id, contabilista_id, corpo, valor_cents, validade_ate)
  VALUES ('beef0000-0000-0000-0000-00000000beef',
          'cafe0000-0000-0000-0000-00000000cafe','11111111-1111-1111-1111-111111111111',
          'Trato do IRS com rendimentos de dois países, incluindo o crédito de imposto.',
          30000, current_date + 7)$$, 'proposta com validade');

DO $$
DECLARE r jsonb;
BEGIN
  r := public.abrir_vaga('proposta','beef0000-0000-0000-0000-00000000beef','application/pdf', 40000);
  ASSERT (r->>'ok')::boolean, format('devia abrir vaga de proposta: %s', r);
  PERFORM set_config('t.vaga_prop', r->>'id', false);
  RAISE NOTICE '  ok  · o contabilista abre vaga para o contrato';
END $$;

SELECT t.entrar('7a7a7a7a-0000-0000-0000-00000000007a');
SELECT t.rpc_recusa($$SELECT public.abrir_vaga(
  'proposta','beef0000-0000-0000-0000-00000000beef','application/pdf',1000)$$,
  'proposta_nao_e_tua', 'o cliente anexa à proposta que recebeu');

RESET ROLE; SELECT t.sair();
SET ROLE service_role;
SELECT t.rpc_ok($$SELECT public.fechar_vaga(
  current_setting('t.vaga_prop')::uuid, 'Contrato.pdf', 40000, true)$$,
  'o contrato fica registado como contrato');
RESET ROLE;
SELECT t.conta($$SELECT count(*) FROM public.proposta_anexos WHERE e_contrato$$, 1,
  'e distingue-se de um anexo qualquer');

SET ROLE authenticated;
SELECT t.entrar('7a7a7a7a-0000-0000-0000-00000000007a');
SELECT t.rpc_ok($$SELECT public.anexo_legivel(
  (SELECT caminho FROM public.proposta_anexos LIMIT 1))$$,
  'quem recebeu a proposta lê o contrato');

-- O caminho é lido como `postgres`: para um terceiro, a RLS de
-- `proposta_anexos` devolve zero linhas, e a subconsulta traria NULL —
-- o teste passaria por «não existe» em vez de por «não é teu», que é uma
-- garantia diferente.
RESET ROLE; SELECT t.sair();
SELECT set_config('t.caminho_contrato',
  (SELECT caminho FROM public.proposta_anexos LIMIT 1), false);
SET ROLE authenticated;
SELECT t.entrar('55555555-5555-5555-5555-555555555555');
SELECT t.rpc_recusa($$SELECT public.anexo_legivel(
  current_setting('t.caminho_contrato'))$$,
  'sem_acesso', 'um terceiro não lê o contrato de outra pessoa');

\echo ''
\echo '── 73. O que passou da validade deixa de o prometer ────────────'
RESET ROLE; SELECT t.sair();
UPDATE public.propostas SET validade_ate = current_date - 1
 WHERE id = 'beef0000-0000-0000-0000-00000000beef';

SET ROLE authenticated;
SELECT t.entrar('7a7a7a7a-0000-0000-0000-00000000007a');
-- Já era recusada; o que faltava era deixar de aparecer como decidível.
SELECT t.rpc_ok($$SELECT public.marcar_proposta_lida(
  'beef0000-0000-0000-0000-00000000beef')$$, 'ainda se pode ler');
SELECT t.rpc_ok($$SELECT public.confirmar_leitura_da_proposta(
  'beef0000-0000-0000-0000-00000000beef')$$, 'e confirmar');
SELECT t.rpc_recusa($$SELECT public.decidir_proposta(
  'beef0000-0000-0000-0000-00000000beef','aceitar')$$,
  'proposta_expirada', 'aceitar uma proposta fora da validade');

RESET ROLE; SELECT t.sair();
SET ROLE service_role;
DO $$
DECLARE n integer;
BEGIN
  n := public.expirar_propostas();
  ASSERT n >= 1, format('devia expirar pelo menos uma, expirou %s', n);
  RAISE NOTICE '  ok  · a varredura fecha o que passou da validade';
  n := public.expirar_propostas();
  ASSERT n = 0, format('a segunda passagem expirou %s', n);
  RAISE NOTICE '  ok  · e a segunda passagem não encontra nada';
END $$;
RESET ROLE;
SELECT t.conta($$SELECT count(*) FROM public.propostas
  WHERE id='beef0000-0000-0000-0000-00000000beef' AND estado='expirada'$$, 1,
  'a proposta está marcada como expirada');

SET ROLE authenticated;
SELECT t.entrar('11111111-1111-1111-1111-111111111111');
SELECT t.rpc_recusa($$SELECT public.abrir_vaga(
  'proposta','beef0000-0000-0000-0000-00000000beef','application/pdf',1000)$$,
  'proposta_nao_e_tua', 'juntar um contrato a uma proposta já fechada');
RESET ROLE;
