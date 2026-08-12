-- 041_auditoria_cobre_o_painel.sql
-- ═══════════════════════════════════════════════════════════════════════
--  O RASTO PASSA A COBRIR O PAINEL INTEIRO
--  ---------------------------------------------------------------------
--  A 040 registava um único ato: promover ou despromover administradores.
--  Mas o painel apaga reportes, apaga feedback, apaga emails da lista de
--  espera, arquiva propostas de investidores, cria e remove parceiros e
--  anúncios. Um registo que cobre um oitavo do painel dá uma sensação de
--  prestação de contas que não corresponde ao que existe.
--
--  Podia ter feito isto no servidor da app, rota a rota. Ficaria pior:
--  estas escritas partem do browser, direto para o PostgREST sob a RLS,
--  e uma rota nova que se esquecesse do registo passava despercebida —
--  exatamente o erro que a 040 diz querer evitar.
--
--  Aqui é o Postgres que regista, no mesmo momento da escrita. Não há
--  caminho por onde entrar sem deixar rasto: nem outra página, nem um
--  script, nem a consola do Supabase com sessão de utilizador.
--
--  O QUE O REGISTO GUARDA: quem, que operação, em que tabela, sobre que
--  linha, quando. NÃO guarda o conteúdo da linha. Um rasto de auditoria
--  que copia as linhas apagadas transforma-se numa segunda cópia dos
--  dados — e passaria a valer a pena atacá-lo.
--
--  Só regista quando quem escreve é administração. Uma pessoa a submeter
--  feedback seu não pratica um ato de administração e não entra aqui.
--
--  Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.registar_ato_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ator  uuid := auth.uid();
  v_email text;
  v_linha jsonb := to_jsonb(COALESCE(OLD, NEW));
  v_id    text  := v_linha->>'id';
BEGIN
  -- Sem sessão (chave de serviço, cron, migrações) ou sem papel de
  -- administração, não há ato de administração a registar.
  IF v_ator IS NULL OR NOT public.is_admin() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_ator;

  INSERT INTO public.admin_auditoria (ator_id, ator_email, acao, alvo_id, detalhe)
  VALUES (
    v_ator,
    v_email,
    lower(TG_OP) || ':' || TG_TABLE_NAME,
    CASE WHEN v_id ~ '^[0-9a-fA-F-]{36}$' THEN v_id::uuid ELSE NULL END,
    jsonb_build_object('tabela', TG_TABLE_NAME, 'operacao', TG_OP, 'linha', v_id)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.registar_ato_admin() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.registar_ato_admin() IS
  'Gatilho: regista em admin_auditoria os atos praticados por administração. Guarda quem/o quê/onde, nunca o conteúdo da linha.';

-- `profiles` fica DE FORA: a mudança de papel já é registada pela rota
-- /api/admin/contas, com o antes e o depois. Um gatilho aqui duplicava.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'site_feedback',
    'quiz_question_reports',
    'email_waitlist',
    'propostas_investidores',
    'admin_partners',
    'anuncios',
    'partner_placements',
    'partner_creatives'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = t AND relnamespace = 'public'::regnamespace) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS auditar_admin ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER auditar_admin AFTER INSERT OR UPDATE OR DELETE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.registar_ato_admin()', t);
    END IF;
  END LOOP;
END $$;
