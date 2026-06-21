-- ================================================================
-- ReciboCerto — Storage bucket para avatares de perfil
-- Idempotente: seguro para correr múltiplas vezes.
-- ================================================================
-- Bucket público para avatares dos utilizadores.
-- RLS: cada utilizador só pode ler/inserir/atualizar/apagar os seus.
-- ================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Qualquer pessoa autenticada pode ver avatares (bucket público).
CREATE POLICY IF NOT EXISTS "avatars_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Utilizador só pode inserir no seu próprio caminho (userId/*)
CREATE POLICY IF NOT EXISTS "avatars_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Utilizador só pode atualizar os seus próprios ficheiros
CREATE POLICY IF NOT EXISTS "avatars_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Utilizador só pode apagar os seus próprios ficheiros
CREATE POLICY IF NOT EXISTS "avatars_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
