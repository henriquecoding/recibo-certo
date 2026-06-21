-- ================================================================
-- ReciboCerto — Campos adicionais no perfil do utilizador
-- Idempotente: seguro para correr múltiplas vezes.
-- ================================================================
-- Adiciona campos editáveis ao perfil: telefone, NIF, avatar URL.
-- O nome (nome) já existe na tabela profiles.
-- ================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS nif text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz DEFAULT now();
