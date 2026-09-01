-- ═══════════════════════════════════════════════════════════════════════
--  A POLÍTICA DE LEITURA DE `profiles` DEIXA DE SE CONSULTAR A SI PRÓPRIA
--  ---------------------------------------------------------------------
--  SINTOMA (produção, 2026-09-01)
--    Entrar na conta e não ver a fotografia de perfil, nem o nome, nem o
--    painel de administração — com todos esses dados intactos na base.
--
--  CAUSA
--    A política de SELECT `admin_leitura_perfis` estava assim:
--
--      EXISTS (SELECT 1 FROM public.profiles p
--               WHERE p.id = auth.uid() AND p.role = 'admin')
--
--    Para decidir se alguém pode ler `profiles`, o Postgres tem de ler
--    `profiles` — o que volta a avaliar a política, que volta a ler a
--    tabela. O Postgres corta o ciclo com um erro:
--
--      42P17: infinite recursion detected in policy for relation "profiles"
--
--    As políticas de uma tabela combinam-se por OR, e o OR avalia as duas.
--    Por isso a política sã (`perfil_proprio_leitura`, `auth.uid() = id`)
--    não salvava nada: bastava a outra existir para TODA a leitura
--    autenticada de `profiles` rebentar. Não era um problema de
--    administradores — era toda a gente a não conseguir ler o próprio
--    perfil.
--
--  PORQUE É QUE NINGUÉM DEU POR ISSO
--    O erro morria em silêncio no cliente. `obterPerfil()` e
--    `verificarAdmin()` faziam `const { data } = await …` e deitavam o
--    `error` fora, devolvendo «perfil vazio» e «não é admin». Uma falha de
--    leitura ficava indistinguível de «esta pessoa não pôs fotografia» e
--    de «esta pessoa não é administradora». A correção do lado do código
--    vive em `src/lib/supabase/profile.ts` e `admin.ts`.
--
--  CORREÇÃO
--    `public.is_admin()` já existe, é SECURITY DEFINER, corre como dono da
--    tabela e por isso lê `profiles` sem passar pela RLS — não recorre.
--    Era exatamente esta a correção que a migração 004 tinha feito; a
--    política recursiva voltou a produção porque as migrações 002 e 003 a
--    recriam e alguma delas foi reaplicada por cima da 004.
--
--    Para o ciclo não se repetir, esta migração não se limita a trocar a
--    política: acrescenta um teste que a impede de voltar. Ver §2.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. A política, sem recursão ─────────────────────────────────────────
DROP POLICY IF EXISTS "admin_leitura_perfis" ON public.profiles;

CREATE POLICY "admin_leitura_perfis" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- A política do próprio é reafirmada por ser a que sustenta a app inteira.
-- `IF NOT EXISTS` não existe para políticas: dropar e recriar é idempotente.
DROP POLICY IF EXISTS "perfil_proprio_leitura" ON public.profiles;
CREATE POLICY "perfil_proprio_leitura" ON public.profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);


-- ── 2. O PORTÃO: uma política de `profiles` não pode citar `profiles` ────
--
--  Um comentário a dizer «não voltes a fazer isto» não impediu que isto
--  acontecesse três vezes (002, 003 e a reaplicação). Um event trigger
--  impede: qualquer CREATE POLICY em `public.profiles` cuja expressão
--  mencione a própria tabela é recusado no momento em que é criada, com a
--  explicação à frente.
--
--  Só olha para `profiles` de propósito. As outras políticas do esquema
--  que fazem `EXISTS (SELECT … FROM outra_tabela)` são legítimas e não
--  recorrem — a recursão só existe quando a tabela citada é a própria.
CREATE OR REPLACE FUNCTION public.impedir_politica_recursiva_em_profiles()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  objeto record;
  expressao text;
BEGIN
  FOR objeto IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
    IF objeto.command_tag <> 'CREATE POLICY' THEN
      CONTINUE;
    END IF;

    SELECT coalesce(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid), '')
           || ' ' ||
           coalesce(pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid), '')
      INTO expressao
      FROM pg_catalog.pg_policy pol
      JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE pol.oid = objeto.objid
       AND n.nspname = 'public'
       AND c.relname = 'profiles';

    IF expressao IS NULL THEN
      CONTINUE;
    END IF;

    IF expressao ~* '\mprofiles\M' THEN
      RAISE EXCEPTION
        'Política de public.profiles não pode consultar public.profiles (recursão infinita, 42P17). Usa public.is_admin(), que é SECURITY DEFINER e não passa pela RLS.'
        USING ERRCODE = '42P17';
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS impedir_politica_recursiva_em_profiles;
CREATE EVENT TRIGGER impedir_politica_recursiva_em_profiles
  ON ddl_command_end
  WHEN TAG IN ('CREATE POLICY')
  EXECUTE FUNCTION public.impedir_politica_recursiva_em_profiles();

COMMENT ON FUNCTION public.impedir_politica_recursiva_em_profiles() IS
  'Recusa qualquer política de public.profiles que cite a própria tabela. A recursão em RLS não falha na criação — falha em cada leitura, em silêncio, e foi assim que a fotografia de perfil e o painel de admin desapareceram para toda a gente.';

-- Uma função de event trigger não tem por que ser chamável pela API REST.
-- Sem isto, aparece em /rest/v1/rpc/ para `anon` e `authenticated`.
REVOKE ALL ON FUNCTION public.impedir_politica_recursiva_em_profiles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.impedir_politica_recursiva_em_profiles() FROM anon;
REVOKE ALL ON FUNCTION public.impedir_politica_recursiva_em_profiles() FROM authenticated;


-- ── 3. O bucket dos avatares passa a impor o que o código já promete ─────
--
--  `uploadAvatar()` recusa acima de 2 MB e fora de JPG/PNG/WebP — mas isso é
--  validação no browser, e o bucket aceitava qualquer coisa por a API estar
--  aberta a quem tem sessão. Alinhar os dois lados custa uma linha e fecha a
--  diferença entre o que a interface diz e o que o servidor aceita.
UPDATE storage.buckets
   SET file_size_limit = 2097152,
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'avatars';
