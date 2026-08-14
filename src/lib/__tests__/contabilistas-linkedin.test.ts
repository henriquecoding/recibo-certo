import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

describe("LinkedIn dos contabilistas", () => {
  it("liga uma identidade LinkedIn OIDC sem transformar o login principal", () => {
    const codigo = ler("src/lib/contabilistas/linkedin.ts");
    expect(codigo).toContain('provider: LINKEDIN_PROVIDER');
    expect(codigo).toContain('LINKEDIN_PROVIDER = "linkedin_oidc"');
    expect(codigo).toContain("auth.linkIdentity");
    expect(codigo).toContain("auth.getUserIdentities");
    expect(codigo).toContain("auth.unlinkIdentity");
    expect(codigo).not.toContain("signInWithOAuth");
  });

  it("não inventa o URL do perfil a partir do subject OIDC", () => {
    const codigo = ler("src/lib/contabilistas/linkedin.ts");
    expect(codigo).toContain("normalizarUrlLinkedIn");
    expect(codigo).toContain('partes[0].toLowerCase() !== "in"');
    expect(codigo).toContain("www.linkedin.com/in/");
    expect(codigo).not.toMatch(/linkedin\.com\/in\/\$\{[^}]*subject/i);
  });

  it("protege a fotografia verificada na base de dados", () => {
    const sql = ler("supabase/migrations/20260814183000_linkedin_contabilistas.sql");
    expect(sql).toContain("auth.identities");
    expect(sql).toContain("i.provider = 'linkedin_oidc'");
    expect(sql).toContain("proteger_identidade_linkedin_contabilista");
    expect(sql).toContain("sincronizar_linkedin_contabilista");
    expect(sql).toContain("linkedin_avatar_url");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.proteger_identidade_linkedin_contabilista() FROM PUBLIC, anon, authenticated");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.sincronizar_linkedin_contabilista() TO authenticated");
  });

  it("mantém o URL LinkedIn dentro da mesma fronteira anti-código do painel", () => {
    const sql = ler("supabase/migrations/20260814183000_linkedin_contabilistas.sql");
    expect(sql).toContain("contabilistas_linkedin_url_valido");
    expect(sql).toContain("'linkedin_url'");
    expect(sql).toContain("public.rejeitar_codigo_painel");
  });

  it("mostra a ligação no editor e no perfil público", () => {
    const editor = ler("src/app/contabilista/perfil/page.tsx");
    const publico = ler("src/app/contabilistas/[slug]/PerfilPublico.tsx");
    expect(editor).toContain("<LinkedInConta contabilistaId={ficha.userId} />");
    expect(publico).toContain("<LinkedInPublico contabilistaId={cc.userId} nome={cc.nome} />");
  });

  it("serve a fotografia pública pelo próprio domínio e valida a origem no servidor", () => {
    const componente = ler("src/components/contabilistas/LinkedInPublico.tsx");
    const rota = ler("src/app/api/contabilistas/linkedin-avatar/[userId]/route.ts");
    expect(componente).toContain("/api/contabilistas/linkedin-avatar/");
    expect(componente).not.toMatch(/<img[\s\S]*src=\{dados\.avatarUrl\}/);
    expect(rota).toContain("origemLinkedInPermitida");
    expect(rota).toContain('tipo.startsWith("image/")');
    expect(rota).toContain("MAX_BYTES");
    expect(rota).toContain('Cross-Origin-Resource-Policy');
  });
});
