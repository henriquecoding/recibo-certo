-- ================================================================
-- ReciboCerto — Migration 031: endurecimento dos contactos de investidores
-- Cola no Supabase → SQL Editor e clica RUN.
-- Idempotente: seguro para correr múltiplas vezes.
-- ================================================================
-- Porquê (relatório mestre, INV-P0-07):
--   A migração 020 deixava INSERT anónimo direto na tabela, a partir do
--   browser. Os CHECKs de comprimento que lá estavam descritos como
--   "endurecimento contra spam" limitam o TAMANHO de um payload; não limitam
--   o NÚMERO de payloads válidos. Um script podia escrever mil linhas
--   perfeitamente formadas numa tarde.
--
--   A partir daqui os contactos entram por UM caminho só: a rota
--   /api/investidores/interesse, no servidor, com service role. O anónimo
--   perde o INSERT.
--
-- O que NÃO faz:
--   Não apaga nem altera propostas existentes. Os dados legados ficam como
--   estão; as colunas novas entram com NULL e só são preenchidas daqui para a
--   frente. Nenhum CHECK novo é aplicado retroativamente a linhas antigas —
--   ver a nota sobre NOT VALID no fim.
-- ================================================================

begin;

-- ── 1 · Fechar a porta anónima ─────────────────────────────────
-- A política é removida E a permissão de tabela é revogada. Só a política
-- deixaria o GRANT de pé; só o REVOKE deixaria a política a prometer um acesso
-- que já não existe. Fecham-se as duas para não ficar ambiguidade sobre quem
-- pode escrever.
drop policy if exists "propostas_insere_publico" on public.propostas_investidores;
revoke insert on public.propostas_investidores from anon, authenticated;

-- ── 2 · Proveniência, consentimento e retenção ─────────────────
alter table public.propostas_investidores
  add column if not exists source_url             text,
  add column if not exists utm_source             text,
  add column if not exists utm_medium             text,
  add column if not exists utm_campaign           text,
  add column if not exists privacy_version        text,
  add column if not exists privacy_acknowledged_at timestamptz,
  add column if not exists ip_hash                text,
  add column if not exists idempotency_key        uuid,
  add column if not exists retention_until        timestamptz,
  -- Operação do pipeline (relatório §14.2). `owner` é texto livre e não uma FK
  -- para auth.users: quem trata de um investidor pode não ter conta na app.
  add column if not exists owner                  text,
  add column if not exists next_action_at         timestamptz,
  add column if not exists last_contacted_at      timestamptz,
  add column if not exists ticket_band            text;

comment on column public.propostas_investidores.ip_hash is
  'HMAC-SHA256 do IP com sal diário. NUNCA o IP em claro — serve para limitar abuso, não para identificar pessoas.';
comment on column public.propostas_investidores.retention_until is
  'Fim do prazo de conservação. Passada esta data e sem relação ativa, o registo entra na fila de eliminação revisável.';

-- ── 3 · Idempotência ───────────────────────────────────────────
-- Um duplo-clique, um retry do browser ou uma repetição de rede não podem
-- criar duas linhas. O índice é parcial para não colidir com as linhas
-- legadas, que têm a chave a NULL.
create unique index if not exists propostas_idempotency_unique
  on public.propostas_investidores (idempotency_key)
  where idempotency_key is not null;

-- ── 4 · Estados do pipeline ────────────────────────────────────
-- "aprovado/rejeitado" descrevia mal um primeiro contacto: dava a entender que
-- o ReciboCerto aprova unilateralmente uma proposta antes de haver relação ou
-- diligência. Os estados novos descrevem onde a CONVERSA está.
-- Os antigos continuam aceites para não invalidar linhas existentes.
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'propostas_investidores_estado_check') then
    alter table public.propostas_investidores
      drop constraint propostas_investidores_estado_check;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'propostas_estado_valido') then
    alter table public.propostas_investidores
      add constraint propostas_estado_valido check (estado in (
        -- novos
        'new','qualified','deck_sent','meeting_booked','diligence','passed','invested',
        -- legados, preservados
        'pendente','em_analise','contactado','aprovado','rejeitado'
      ));
  end if;
end $$;

-- ── 5 · Limite de abuso, persistente e atómico ─────────────────
-- Em serverless o limite em memória é por-instância e reinicia a cada arranque
-- a frio: não é um limite, é uma sugestão. Este vive na base de dados, é
-- contado com `on conflict do update ... returning`, que é atómico, e por isso
-- resiste a pedidos concorrentes.
create table if not exists public.investor_rate_limits (
  key_hash     text        not null,
  kind         text        not null check (kind in ('ip', 'email')),
  window_start date        not null,
  attempts     integer     not null default 0 check (attempts >= 0),
  updated_at   timestamptz not null default now(),
  primary key (key_hash, kind, window_start)
);

alter table public.investor_rate_limits enable row level security;
revoke all on public.investor_rate_limits from anon, authenticated;

-- Sem política de leitura: nem o admin precisa de ver isto pela API. A tabela
-- só é tocada pela função abaixo, que corre como definer.
create index if not exists investor_rate_limits_janela_idx
  on public.investor_rate_limits (window_start);

create or replace function public.consume_investor_rate_limit(
  p_ip_hash     text,
  p_email_hash  text,
  p_window_start date,
  p_ip_limit    integer,
  p_email_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ip_count    integer;
  email_count integer;
begin
  insert into public.investor_rate_limits (key_hash, kind, window_start, attempts)
  values (p_ip_hash, 'ip', p_window_start, 1)
  on conflict (key_hash, kind, window_start)
  do update set attempts = investor_rate_limits.attempts + 1, updated_at = now()
  returning attempts into ip_count;

  insert into public.investor_rate_limits (key_hash, kind, window_start, attempts)
  values (p_email_hash, 'email', p_window_start, 1)
  on conflict (key_hash, kind, window_start)
  do update set attempts = investor_rate_limits.attempts + 1, updated_at = now()
  returning attempts into email_count;

  return ip_count <= p_ip_limit and email_count <= p_email_limit;
end;
$$;

revoke all on function public.consume_investor_rate_limit(text, text, date, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_investor_rate_limit(text, text, date, integer, integer)
  to service_role;

-- Higiene: janelas antigas não servem para nada e a tabela só cresceria.
create or replace function public.purge_investor_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removidas integer;
begin
  delete from public.investor_rate_limits
   where window_start < current_date - interval '30 days';
  get diagnostics removidas = row_count;
  return removidas;
end;
$$;

revoke all on function public.purge_investor_rate_limits() from public, anon, authenticated;
grant execute on function public.purge_investor_rate_limits() to service_role;

commit;

-- ================================================================
-- NOTA sobre constraints em tabela legada (relatório §13.5)
--
-- Não se acrescentam aqui CHECKs novos e validados sobre colunas antigas
-- (email, telefone, URLs, montantes). A tabela de produção foi criada à mão e
-- pode ter linhas que não os cumprem; um ALTER ... ADD CONSTRAINT validado
-- falharia a migração inteira e deixaria a RLS por aplicar — que é a parte que
-- realmente protege.
--
-- A sequência correta, quando se quiser apertar:
--   1. auditar as linhas existentes;
--   2. corrigir ou pôr em quarentena as que falham;
--   3. ADD CONSTRAINT ... NOT VALID;
--   4. VALIDATE CONSTRAINT;
--   5. só então SET NOT NULL onde fizer sentido.
--
-- Daqui para a frente a validação completa acontece ANTES da escrita, na rota
-- /api/investidores/interesse — que é o único caminho que resta.
-- ================================================================
