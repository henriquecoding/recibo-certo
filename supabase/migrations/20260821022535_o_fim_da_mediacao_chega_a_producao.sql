-- ═══════════════════════════════════════════════════════════════════════
--  O FIM DA MEDIAÇÃO CHEGA A PRODUÇÃO
--  ---------------------------------------------------------------------
--  A `20260818210000_fim_da_mediacao` está aplicada em produção — exceto
--  o fim dela. A verificação de 2026-08-21 construiu a base a partir
--  deste repositório e comparou-a com a que serve o site, objeto a
--  objeto: não falta uma tabela, não falta uma view, não falta um gatilho
--  — falta ESTE bloco, e só ele.
--
--  Continuavam vivos, e ATIVOS, quatro gatilhos que recusam texto que
--  pareça um contacto:
--
--    trg_sem_contacto_externo_mensagens @ contabilista_mensagens
--    trg_sem_contacto_externo_vinculos  @ contabilista_vinculos
--    trg_sem_contacto_externo_partilhas @ partilhas
--    trg_sem_contacto_externo_pedido    @ pedido_cliente
--
--  ⚠️ O efeito era visível para quem usa o produto: escrever o próprio
--  número de telefone numa mensagem ao contabilista devolvia «Para
--  proteger o acompanhamento, os contactos pessoais não se partilham
--  aqui.» — enquanto o código, os testes e o
--  `docs/CONTRATO-DE-PRIVACIDADE.md` §2.1 diziam o contrário. E nenhum
--  ecrã trata esse erro, porque foi escrito depois de a regra sair: o
--  erro da base saía em bruto.
--
--  Escrever um contacto à mão numa mensagem é uma decisão de quem
--  escreve, no momento em que escreve. O que a plataforma não deixa sair
--  sozinha é a ficha ESTRUTURADA — e disso trata a
--  `20260820165820_a_ficha_de_contactos_passa_a_ser_escolhida`.
--
--  ---------------------------------------------------------------------
--  PORQUÊ UM FICHEIRO NOVO, E NÃO REAPLICAR A ANTIGA
--
--  Forward-only. A `fim_da_mediacao` já correu nesta base e o resto dela
--  está confirmado igual ao repositório; repeti-la mexia em superfície
--  que não precisa de ser mexida, incluindo dois UPDATE sobre dados
--  vivos. Este ficheiro faz o que falta e nada mais.
--
--  Todos os DROP são IF EXISTS: numa base onde a `fim_da_mediacao` correu
--  até ao fim, isto não faz absolutamente nada. Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- Os gatilhos primeiro. Enquanto um deles existir, a função de que
-- dependem não se larga.
DROP TRIGGER IF EXISTS trg_sem_contacto_externo_mensagens ON public.contabilista_mensagens;
DROP TRIGGER IF EXISTS trg_sem_contacto_externo_vinculos  ON public.contabilista_vinculos;
DROP TRIGGER IF EXISTS trg_sem_contacto_externo_partilhas ON public.partilhas;
DROP TRIGGER IF EXISTS trg_sem_contacto_externo_pedido    ON public.pedido_cliente;

DROP FUNCTION IF EXISTS public.rejeitar_contacto_externo();
DROP FUNCTION IF EXISTS public.texto_parece_contacto_externo(text);

-- E as três funções da triagem manual. Nenhuma é chamada por `src/` — a
-- razão de saírem está na secção 9 da `20260818210000_fim_da_mediacao`:
-- deixá-las a devolver «indisponível» seria guardar a porta fechada com
-- a chave ao lado, e uma migração futura religa-a por distração.
DROP FUNCTION IF EXISTS public.rever_mensagem(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.encaminhar_caso(uuid, uuid);
DROP FUNCTION IF EXISTS public.libertar_documento(uuid, boolean);
