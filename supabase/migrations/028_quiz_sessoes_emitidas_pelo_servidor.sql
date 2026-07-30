-- ═══════════════════════════════════════════════════════════════════════
--  QUIZ — a sessão de desafio passa a ser EMITIDA pelo servidor
--  ---------------------------------------------------------------------
--  A migração 024 tirou ao cliente a escrita em `quiz_cupoes` e mandou a
--  verificação para `/api/quiz/sessao`, que reapura os acertos a partir do
--  banco de perguntas. Isso fechou a porta de inventar um cupão, mas não a
--  de o MERECER repetidamente sem jogar.
--
--  O que ficou aberto: o endpoint não emitia nem validava identificador de
--  sessão nenhum. Bastava enviar dez `perguntaId` válidos com o índice certo
--  para `sequencia_atual` avançar — e outra vez, e outra. O banco inteiro,
--  incluindo cada `correta`, é carregado no browser por `useQuizFiscal`, por
--  isso ter mudado a comparação para o servidor não torna as respostas
--  secretas. Um utilizador autenticado podia gerar cupões sem limite.
--
--  ── O que se pode e o que não se pode garantir ────────────────────────
--  Esconder as respostas não é possível sem reescrever o quiz de alto a
--  baixo (as explicações, o modo guiado e a revisão do resultado precisam
--  delas no cliente). O que se pode garantir é OUTRA coisa, e é a que conta:
--  quantas sessões existem. Se cada sessão tem de ser aberta pelo servidor,
--  vale uma única submissão e traz as perguntas que o servidor escolheu,
--  então o número de cupões deixa de depender de quantos pedidos alguém faz.
--
--  Daí esta tabela. Não é um registo de auditoria — é um BILHETE:
--   · `pergunta_ids` é a lista que o servidor sorteou. A submissão tem de
--     trazer exatamente estes ids, nem mais nem menos;
--   · `submetido_em` NULL significa aberto. Fecha-se com um UPDATE
--     condicional (`submetido_em is null`), que é o que faz dois pedidos
--     simultâneos não contarem duas vezes — o mesmo padrão que já se usa
--     para queimar um cupão;
--   · `criado_em` serve o limite diário e o piso de tempo (dez perguntas em
--     200 ms não é uma sessão jogada).
--
--  O cliente NUNCA lê nem escreve aqui: sem policies, e com os privilégios
--  revogados, só o `service_role` chega à tabela. Um bilhete que o próprio
--  jogador pudesse editar não era um bilhete.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.quiz_sessoes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dificuldade   smallint    NOT NULL,
  pergunta_ids  text[]      NOT NULL,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  submetido_em  timestamptz,

  -- Uma sessão de desafio tem sempre dez perguntas. Se um dia mudar, muda
  -- aqui e em `PERGUNTAS_SESSAO_DESAFIO` — e o build parte se divergirem.
  CONSTRAINT quiz_sessoes_dez_perguntas CHECK (array_length(pergunta_ids, 1) = 10),
  -- Só as dificuldades que dão prémio abrem bilhete.
  CONSTRAINT quiz_sessoes_dificuldade_de_desafio CHECK (dificuldade IN (2, 3))
);

ALTER TABLE public.quiz_sessoes ENABLE ROW LEVEL SECURITY;

-- Sem policy para `authenticated` ou `anon`: com RLS ligada e nenhuma policy,
-- ninguém fora do `service_role` vê ou escreve uma linha. É deliberado.
REVOKE ALL ON public.quiz_sessoes FROM authenticated, anon;

-- Suporta o limite diário por utilizador e a procura do bilhete aberto.
CREATE INDEX IF NOT EXISTS quiz_sessoes_user_criado_idx
  ON public.quiz_sessoes (user_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS quiz_sessoes_abertas_idx
  ON public.quiz_sessoes (user_id)
  WHERE submetido_em IS NULL;

COMMENT ON TABLE public.quiz_sessoes IS
  'Bilhetes de sessão de desafio, emitidos por /api/quiz/sessao/abrir. ESCRITA E LEITURA EXCLUSIVAS DO service_role. Uma submissão em /api/quiz/sessao só conta se apresentar um bilhete aberto desta tabela, com exatamente os pergunta_ids que o servidor escolheu.';

COMMENT ON COLUMN public.quiz_sessoes.pergunta_ids IS
  'As dez perguntas sorteadas pelo SERVIDOR. A submissão tem de corresponder exatamente — é isto que impede repetir a mesma sessão vencedora.';

COMMENT ON COLUMN public.quiz_sessoes.submetido_em IS
  'NULL enquanto aberto. Fechado por UPDATE condicional (submetido_em IS NULL), o que garante uso único mesmo com pedidos simultâneos.';
