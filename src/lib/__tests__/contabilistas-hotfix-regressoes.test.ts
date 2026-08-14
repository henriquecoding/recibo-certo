import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

describe("hotfix do painel profissional", () => {
  it("mantém o helper anti-código fechado mas permite que a trigger o execute", () => {
    const sql = ler("supabase/migrations/20260814191500_corrigir_trigger_texto_seguro.sql");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.rejeitar_codigo_painel()")
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toContain("IF public.painel_texto_tem_codigo(valor) THEN");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.rejeitar_codigo_painel() FROM PUBLIC, anon, authenticated");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.painel_texto_tem_codigo(text) FROM PUBLIC, anon, authenticated");
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.rejeitar_codigo_painel\(\) TO authenticated/i);
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.painel_texto_tem_codigo\(text\) TO authenticated/i);
  });

  it("continua a validar o LinkedIn como URL HTTPS /in/ e não remove a barreira anti-código", () => {
    const lib = ler("src/lib/contabilistas/linkedin.ts");
    const linkedinSql = ler("supabase/migrations/20260814183000_linkedin_contabilistas.sql");
    expect(lib).toContain('url.protocol !== "https:"');
    expect(lib).toContain('partes[0].toLowerCase() !== "in"');
    expect(linkedinSql).toContain("contabilistas_linkedin_url_valido");
    expect(linkedinSql).toContain("'linkedin_url'");
    expect(linkedinSql).toContain("public.rejeitar_codigo_painel");
  });

  it("não deixa uma fotografia temporária do LinkedIn aparecer quebrada", () => {
    const conta = ler("src/components/contabilistas/LinkedInConta.tsx");
    const publico = ler("src/components/contabilistas/LinkedInPublico.tsx");
    const avatar = ler("src/components/contabilistas/AvatarContabilista.tsx");
    const lib = ler("src/lib/contabilistas/linkedin.ts");

    expect(lib).toContain("avatarLinkedInExpirou");
    expect(lib).toContain('url.searchParams.get("e")');
    expect(lib).toContain("renovarLinkedIn");
    expect(conta).toContain("/api/contabilistas/linkedin-avatar/");
    expect(conta).toContain("onError={() => setAvatarFalhou(true)}");
    expect(conta).toContain("Atualizar fotografia");
    expect(publico).toContain("AvatarContabilista");
    expect(avatar).toContain("/api/contabilistas/linkedin-avatar/");
    expect(avatar).toContain("onError={() => setFalhou(true)}");
    expect(avatar).toContain("avatarLinkedInExpirou");
  });

  it("liberta apenas o clipping do formulário de tarefa quando o calendário está aberto", () => {
    const layout = ler("src/app/contabilista/trabalho/layout.tsx");
    const trabalho = ler("src/app/contabilista/trabalho/page.tsx");
    expect(layout).toContain('.overflow-hidden:has(#prazo-tarefa[aria-expanded="true"])');
    expect(layout).toContain("overflow: visible !important");
    expect(trabalho).toContain('id="prazo-tarefa"');
    expect(trabalho).toContain('<DatePicker');
    expect(trabalho).toContain('className="overflow-hidden"');
  });
});
