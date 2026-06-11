-- ────────────────────────────────────────────────────────────────
-- 006 — Adicionar segundo admin: taniasofiadt@gmail.com
-- ────────────────────────────────────────────────────────────────

-- 1. Atualizar o trigger para reconhecer ambos os emails de admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NEW.email IN ('admin@recibocerto.pt', 'taniasofiadt@gmail.com')
      THEN 'admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Se a conta já existir no auth.users, garantir role admin no perfil
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'taniasofiadt@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 3. Se a conta ainda não existir, será criada via Supabase Auth (dashboard ou signup).
--    O trigger acima atribuirá automaticamente role = 'admin'.
