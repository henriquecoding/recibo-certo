-- ─────────────────────────────────────────────────────────────────────
--  documentos_emitidos — a linha de verificação, e só ela
--  ---------------------------------------------------------------------
--  O que fica registado quando alguém exporta um documento: referência,
--  impressão digital dos dados, tipo, quem o pediu e quando.
--
--  O que NÃO fica: os dados. Nem o salário, nem os dependentes, nem o líquido.
--  Quem consulta uma referência confirma que ela existe e a que digest
--  corresponde — e mais nada. É isso que permite a alguém provar que um
--  documento é autêntico sem que a confirmação exponha o seu conteúdo.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.documentos_emitidos (
  referencia   text primary key,
  -- SHA-256 dos DADOS (não do PDF, que muda a cada geração porque a data de
  -- criação muda). 64 carateres hexadecimais.
  digest       text not null check (digest ~ '^[0-9a-f]{64}$'),
  tipo         text not null check (tipo in ('vencimento', 'irs', 'recibos', 'cenarios', 'auditoria')),
  utilizador   uuid not null references auth.users (id) on delete cascade,
  motor        text not null,
  criado_em    timestamptz not null default now()
);

-- A consulta pública é por referência (chave primária) e a listagem interna é
-- por utilizador e data.
create index if not exists documentos_emitidos_utilizador_idx
  on public.documentos_emitidos (utilizador, criado_em desc);

alter table public.documentos_emitidos enable row level security;

-- Escrita: SÓ o service role, a partir da rota que verifica sessão e direito.
-- Sem política de insert para `authenticated`, o cliente não consegue forjar
-- uma emissão que nunca aconteceu.
drop policy if exists "documentos_emitidos_leitura_propria" on public.documentos_emitidos;
create policy "documentos_emitidos_leitura_propria"
  on public.documentos_emitidos
  for select
  to authenticated
  using (utilizador = auth.uid());

comment on table public.documentos_emitidos is
  'Linha de verificação dos documentos exportados. Nunca guarda os dados do documento — só a referência, o digest e a proveniência.';
comment on column public.documentos_emitidos.digest is
  'SHA-256 da serialização canónica dos DADOS. Do PDF seria inútil: dois PDF do mesmo cálculo diferem na data de criação.';
