\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

-- ═══════════════════════════════════════════════════════════════════════
--  A FRONTEIRA DE CONTACTO (migração da fronteira de contacto)
--  ---------------------------------------------------------------------
--  Duas garantias, e as duas têm de ser provadas contra a base de dados
--  a sério, porque as duas são fáceis de reintroduzir sem dar por isso:
--
--   1. Não há caminho — coluna, RPC ou grant — por onde o contabilista
--      chegue a um contacto do cliente.
--   2. O texto não é uma porta lateral. E, do outro lado do mesmo fio: um
--      NIF continua a poder ser escrito, senão a proteção custa mais do
--      que vale.
--
--  A lista de casos do ponto 2 é a MESMA de
--  `src/lib/__tests__/contacto-externo.test.ts`. É de propósito: a versão
--  em TypeScript existe para avisar cedo, e uma versão que avisasse por
--  regras diferentes das que recusam seria pior do que não avisar nada.
-- ═══════════════════════════════════════════════════════════════════════

\echo ''
\echo '── 40. A coluna de contacto não existe ─────────────────────────'
RESET ROLE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
     WHERE attrelid = 'public.contabilista_vinculos'::regclass
       AND attname  = 'email_cliente'
       AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'FALHA: contabilista_vinculos ainda tem email_cliente.';
  END IF;
  RAISE NOTICE 'ok · contabilista_vinculos não tem coluna de contacto';
END $$;

-- Nenhuma coluna de contacto pode reaparecer com outro nome. Isto apanha o
-- caso que a verificação acima não apanha: alguém acrescenta `telemovel` ou
-- `email_contacto` ao vínculo daqui a seis meses, com boa intenção.
DO $$
DECLARE achada text;
BEGIN
  SELECT string_agg(attname, ', ') INTO achada
    FROM pg_catalog.pg_attribute
   WHERE attrelid = 'public.contabilista_vinculos'::regclass
     AND NOT attisdropped AND attnum > 0
     AND attname ~ '(email|mail|telem|telefone|phone|whats|contacto|contato)';
  IF achada IS NOT NULL THEN
    RAISE EXCEPTION 'FALHA: o vínculo ganhou colunas de contacto: %', achada;
  END IF;
  RAISE NOTICE 'ok · nenhuma coluna de contacto no vínculo, com nome nenhum';
END $$;

\echo ''
\echo '── 41. A RPC de resumo não devolve contactos ───────────────────'
DO $$
DECLARE achada text;
BEGIN
  SELECT string_agg(p.proargnames[i], ', ') INTO achada
    FROM pg_catalog.pg_proc p,
         LATERAL generate_subscripts(p.proargnames, 1) AS i
   WHERE p.proname = 'resumo_clientes_do_contabilista'
     AND p.pronamespace = 'public'::regnamespace
     AND p.proargnames[i] ~ '(email|mail|telem|telefone|phone|contacto)';
  IF achada IS NOT NULL THEN
    RAISE EXCEPTION 'FALHA: a RPC de resumo devolve %', achada;
  END IF;
  RAISE NOTICE 'ok · resumo_clientes_do_contabilista não devolve contactos';
END $$;

\echo ''
\echo '── 42. O detetor: o que tem de ser recusado ────────────────────'
DO $$
DECLARE
  caso   text;
  falhas text := '';
BEGIN
  FOREACH caso IN ARRAY ARRAY[
    -- email
    'escreve para joao.silva@gmail.com',
    'o meu mail: a@b.pt',
    'joao (arroba) gmail (ponto) com',
    'joao [at] gmail.com',
    'joao arroba gmail.com',
    -- indicativo
    '+351 912 345 678',
    '00351912345678',
    '+351912345678',
    -- telemóvel e fixo com separadores
    '912 345 678',
    '912-345-678',
    '936.123.456',
    '961 234 567',
    '21 123 4567',
    '22-123-4567',
    -- cru, apresentado como contacto
    'o meu telemóvel é 912345678',
    'liga 912345678',
    'manda whats para 936123456',
    -- canais
    'falamos por whatsapp',
    'tenho telegram',
    'wa.me/351912345678',
    't.me/joaosilva',
    'segue-me em instagram.com/joao',
    -- convites
    'continuamos por email',
    'manda-me um email',
    'é mais fácil fora da plataforma',
    'o meu contacto é o seguinte',
    -- maiúsculas e espaços a mais
    'WhatsApp',
    '+351   912   345   678',
    E'Escreve   para\n  JOAO@EXEMPLO.PT'
  ] LOOP
    IF NOT public.texto_parece_contacto_externo(caso) THEN
      falhas := falhas || E'\n  escapou: ' || caso;
    END IF;
  END LOOP;

  IF falhas <> '' THEN
    RAISE EXCEPTION 'FALHA: contactos que passaram a fronteira: %', falhas;
  END IF;
  RAISE NOTICE 'ok · 29 formas de partilhar contacto, todas recusadas';
END $$;

\echo ''
\echo '── 43. O detetor: o que NÃO pode ser recusado ──────────────────'
--
-- Esta é a metade que interessa mais. Um contacto que escapa custa uma
-- relação; um NIF recusado custa a confiança de quem não estava a fazer
-- nada — e essa perde-se com toda a gente ao mesmo tempo.
DO $$
DECLARE
  caso   text;
  falhas text := '';
BEGIN
  FOREACH caso IN ARRAY ARRAY[
    -- NIF, incluindo as séries que começam por 9 e são indistinguíveis
    -- de um telemóvel se se olhar só para os dígitos.
    'o NIF é 912345678',
    'NIF 123456789',
    'nif: 245 678 901',
    'o contribuinte dele é 918273645',
    'NIPC 501234567',
    -- IBAN e referências
    'IBAN PT50 0002 0123 1234 5678 9015 4',
    'o nib é 0002 0123 12345678901 54',
    'entidade 10925 referência 123 456 789',
    'ref. 987654321 no multibanco',
    -- valores, datas, percentagens
    'são 1.234,56 € de IVA',
    'o prazo é 20 de fevereiro de 2026',
    'retenção de 25% sobre 3.000 €',
    'o coeficiente é 0,75',
    -- documentos
    'fatura 2026/000123 de 15 de janeiro',
    'o recibo 912345678 já foi emitido',
    -- conversa fiscal normal
    'Podes enviar o comprovativo de retenções de julho?',
    'Já submeti o IRS. Ficou a pagar 340,20 €.',
    'A consulta fica marcada para dia 20 às 16:30.',
    'O regime simplificado compensa-te este ano.',
    'obrigado!',
    '',
    '   '
  ] LOOP
    IF public.texto_parece_contacto_externo(caso) THEN
      falhas := falhas || E'\n  recusado sem ser: ' || caso;
    END IF;
  END LOOP;

  IF falhas <> '' THEN
    RAISE EXCEPTION 'FALHA: falsos positivos: %', falhas;
  END IF;
  RAISE NOTICE 'ok · 22 textos legítimos, nenhum recusado';
END $$;

\echo ''
\echo '── 44. O gatilho recusa mesmo, na conversa ─────────────────────'
--
-- O detetor pode estar certo e o gatilho não estar ligado. São coisas
-- diferentes, e é a segunda que protege.
SET ROLE authenticated;
SELECT t.entrar('77777777-7777-7777-7777-777777777777');

SELECT t.recusa($$INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo)
  VALUES ('aaaa0000-0000-0000-0000-00000000000a',
          '77777777-7777-7777-7777-777777777777',
          'O meu telemovel e 912 345 678, liga quando puderes.')$$,
  'mensagem com telemóvel');

SELECT t.recusa($$INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo)
  VALUES ('aaaa0000-0000-0000-0000-00000000000a',
          '77777777-7777-7777-7777-777777777777',
          'Manda para joao@exemplo.pt que e mais rapido.')$$,
  'mensagem com email');

SELECT t.recusa($$INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo)
  VALUES ('aaaa0000-0000-0000-0000-00000000000a',
          '77777777-7777-7777-7777-777777777777',
          'Tens whatsapp? E mais facil por la.')$$,
  'mensagem a propor outro canal');

-- E a conversa normal continua a passar, que é o ponto todo.
SELECT t.permite($$INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo)
  VALUES ('aaaa0000-0000-0000-0000-00000000000a',
          '77777777-7777-7777-7777-777777777777',
          'O meu NIF e 912345678 e a fatura e a 2026/000123. Ja submeti.')$$,
  'mensagem com NIF e número de fatura');

SELECT t.permite($$INSERT INTO public.contabilista_mensagens (vinculo_id, autor_id, corpo)
  VALUES ('aaaa0000-0000-0000-0000-00000000000a',
          '77777777-7777-7777-7777-777777777777',
          'Podes enviar o comprovativo de retencoes de julho?')$$,
  'mensagem de trabalho normal');

\echo ''
\echo '── 45. O recado do pedido segue a mesma regra ──────────────────'
--
-- Era por aqui que um número passava antes de haver conversa nenhuma.
SELECT t.entrar('22222222-2222-2222-2222-222222222222');
SELECT t.recusa($$INSERT INTO public.contabilista_vinculos
    (contabilista_id, cliente_id, estado, origem, mensagem)
  VALUES ('55555555-5555-5555-5555-555555555555',
          '22222222-2222-2222-2222-222222222222', 'pendente', 'cliente',
          'Ola, o meu numero e 912 345 678.')$$,
  'recado do pedido com telemóvel');

SELECT t.sair();
