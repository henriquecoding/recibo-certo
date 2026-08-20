-- 20260820092000_a_ficha_de_contactos_passa_a_ser_escolhida.sql
-- ═══════════════════════════════════════════════════════════════════════
--  A PARTILHA DE CONTACTOS DEIXA DE NASCER LIGADA
--  ---------------------------------------------------------------------
--  A `20260818210000_fim_da_mediacao` criou:
--
--    casos.partilha_contactos boolean NOT NULL DEFAULT true
--
--  e justificou-o assim, no próprio ficheiro:
--
--    «Não é um consentimento presumido escondido: o formulário do caso
--     mostra-o marcado, com o texto ao lado, e o cliente desmarca-o antes
--     de submeter se não quiser.»
--
--  ⚠️ Esse formulário nunca teve essa caixa. `/dashboard/casos/novo` tem
--  três passos e nenhum interruptor de contactos — a ficha inteira (email,
--  telefone e morada) passava a estar ao alcance do contabilista no
--  instante em que o caso lhe era encaminhado, e a pessoa só descobria
--  isso ao abrir o detalhe do caso, depois de já ter acontecido.
--
--  Um consentimento presumido descrito como escolhido é pior do que um
--  consentimento presumido assumido: ninguém vai à procura do que o
--  comentário diz estar tratado.
--
--  ---------------------------------------------------------------------
--  O QUE MUDA
--
--  · O valor inicial passa a ser NÃO PARTILHAR.
--  · O formulário ganha a escolha, antes de submeter (ver
--    `src/app/dashboard/casos/novo/page.tsx`).
--  · A pessoa continua a poder ligar e desligar no detalhe do caso, com
--    efeito imediato — a política lê a coluna, não uma cópia dela.
--
--  Escrever um contacto À MÃO numa mensagem continua a ser possível e não
--  é tocado aqui: é uma decisão de quem escreve, no momento em que
--  escreve. O que se corrige é a ficha ESTRUTURADA sair sozinha.
--
--  ---------------------------------------------------------------------
--  ⚠️ AS LINHAS QUE JÁ EXISTEM — a decisão, e o que ficou de fora
--
--  Um caso que ainda NÃO foi encaminhado passa a `false`: ninguém tem os
--  contactos, ninguém os perde, e a pessoa passa a decidir como decidiria
--  se o caso fosse de hoje.
--
--  Um caso JÁ ENCAMINHADO fica como está. Do outro lado há alguém a
--  trabalhar nele, que recebeu aqueles contactos e pode estar a usá-los
--  agora. Cortá-los sem ninguém pedir partia trabalho a decorrer para
--  corrigir uma escolha que já foi feita — e o cliente continua a poder
--  desligar no detalhe do caso, que é onde a decisão dele vive.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.casos
  ALTER COLUMN partilha_contactos SET DEFAULT false;

COMMENT ON COLUMN public.casos.partilha_contactos IS
  'A ficha estruturada de contactos (email, telefone, morada) chega aos contabilistas com o caso encaminhado enquanto isto for verdadeiro. Nasce FALSO: partilhar é uma decisão, e uma decisão que ninguém tomou não é um sim. O cliente liga e desliga quando quiser, com efeito imediato.';

--  Só os que ainda não saíram das mãos de quem os escreveu.
UPDATE public.casos c
   SET partilha_contactos = false
 WHERE c.partilha_contactos
   AND c.estado IN ('rascunho', 'submetido')
   AND NOT EXISTS (
     SELECT 1 FROM public.caso_encaminhamentos e WHERE e.caso_id = c.id
   );

COMMIT;
