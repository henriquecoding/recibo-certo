-- ═══════════════════════════════════════════════════════════════════════
--  ANALYTICS_EVENTOS — a camada de medição que a auditoria não encontrou
--  ---------------------------------------------------------------------
--  §8 do relatório estratégico: sem medição, qualquer debate entre SEO,
--  Reddit, YouTube, subscrição ou leads é uma disputa de opiniões. Esta
--  tabela é o destino do dicionário de eventos de `src/lib/analytics`.
--
--  Três decisões de desenho, todas com consequências:
--
--  1. NENHUMA CHAVE ESTRANGEIRA PARA `auth.users`. O ator é um
--     identificador anónimo do dispositivo ou um pseudónimo derivado por
--     resumo (ver `identidade.ts`). A base de medição não pode conter, por
--     si só, uma chave que leve a uma pessoa — e apagar uma conta não pode
--     obrigar a apagar histórico agregado que já não a identifica.
--
--  2. `props` É JSONB VALIDADO NA APLICAÇÃO, NÃO COLUNAS. O dicionário tem
--     21 eventos com propriedades diferentes; 21 tabelas seria pior e uma
--     tabela com 60 colunas nulas também. A garantia de que não entra PII
--     está em `pii.ts` e corre duas vezes — no cliente e no servidor.
--
--  3. NENHUMA POLÍTICA DE LEITURA. Só a `service_role` escreve (pela API)
--     e só o admin lê (pelo painel). RLS ligada sem policy nenhuma é
--     exatamente isso: ninguém com a chave anónima toca nesta tabela.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.analytics_eventos (
  id          bigserial PRIMARY KEY,
  nome        text        NOT NULL,
  -- Identificador anónimo do dispositivo ou pseudónimo (u_…). Nunca o
  -- `auth.uid()` nem o email.
  ator        text        NOT NULL,
  sessao      text        NOT NULL,
  props       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Momento declarado pelo cliente (pode vir com relógio errado) e momento
  -- de receção pelo servidor (é este que manda em qualquer análise).
  ocorrido_em timestamptz NOT NULL,
  recebido_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.analytics_eventos IS
  'Eventos de produto do dicionário §8.1. Sem dados fiscais pessoais: a barreira de pii.ts corre no cliente e no servidor. O ator é anónimo ou pseudónimo.';

COMMENT ON COLUMN public.analytics_eventos.ocorrido_em IS
  'Momento declarado pelo cliente. Não confiar para janelas temporais — usar recebido_em.';

-- A DVM apura-se por (ator, sessão, ferramenta) dentro de um mês; o painel
-- semanal lê por nome e por data de receção. São estes dois acessos.
CREATE INDEX IF NOT EXISTS analytics_eventos_recebido_idx
  ON public.analytics_eventos (recebido_em DESC);

CREATE INDEX IF NOT EXISTS analytics_eventos_nome_recebido_idx
  ON public.analytics_eventos (nome, recebido_em DESC);

CREATE INDEX IF NOT EXISTS analytics_eventos_ator_sessao_idx
  ON public.analytics_eventos (ator, sessao);

ALTER TABLE public.analytics_eventos ENABLE ROW LEVEL SECURITY;

-- Retenção: §8.4 exige prazos definidos. Doze meses cobrem a comparação
-- homóloga (a sazonalidade fiscal do §4.4 é anual e um ano de histórico é o
-- mínimo para a ler); mais do que isso é guardar por guardar.
CREATE OR REPLACE FUNCTION public.analytics_purgar_antigos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  apagados integer;
BEGIN
  DELETE FROM public.analytics_eventos
   WHERE recebido_em < now() - interval '12 months';
  GET DIAGNOSTICS apagados = ROW_COUNT;
  RETURN apagados;
END;
$$;

COMMENT ON FUNCTION public.analytics_purgar_antigos IS
  'Aplica o prazo de retenção de 12 meses exigido pelo §8.4. Correr periodicamente (pg_cron ou rotina mensal).';
