import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

describe("diretório e perfil profissional — apresentação e tema", () => {
  it("substitui os selects nativos pelos menus do design system", () => {
    const diretorio = ler("src/app/contabilistas/DiretorioCliente.tsx");
    const perfil = ler("src/app/contabilista/perfil/page.tsx");
    const select = ler("src/components/ui/SelectMenu.tsx");

    expect(diretorio).toContain("SelectMenu");
    expect(perfil).toContain("SelectMenu");
    expect(diretorio).not.toContain("<select");
    expect(perfil).not.toContain("<select");
    expect(select).toContain('role="listbox"');
    expect(select).toContain('role="option"');
    expect(select).toContain('evento.key === "ArrowDown"');
    expect(select).toContain('evento.key === "Escape"');
    expect(select).toContain("dark:bg-stone-950");
    expect(select).toContain("dark:text-stone-200");
  });

  it("mostra identidade profissional e LinkedIn sem criar uma query por cartão", () => {
    const diretorio = ler("src/app/contabilistas/DiretorioCliente.tsx");
    const linkedin = ler("src/lib/contabilistas/linkedin.ts");
    const avatar = ler("src/components/contabilistas/AvatarContabilista.tsx");

    expect(diretorio).toContain("obterLinkedInsPublicos");
    expect(diretorio).toContain("AvatarContabilista");
    expect(diretorio).toContain("LinkedIn ligado");
    expect(diretorio).toContain("Aceita novos clientes");
    expect(diretorio).toContain("Perfil profissional aprovado");
    expect(diretorio).toContain("Ver perfil");
    expect(linkedin).toContain("export async function obterLinkedInsPublicos");
    expect(linkedin).toContain('.in("user_id", ids)');
    expect(avatar).toContain("avatarLinkedInExpirou");
  });

  it("mantém contraste explícito no modo escuro no formulário profissional", () => {
    const perfil = ler("src/app/contabilista/perfil/page.tsx");
    const linkedinConta = ler("src/components/contabilistas/LinkedInConta.tsx");
    const diretorio = ler("src/app/contabilistas/DiretorioCliente.tsx");

    expect(perfil).toContain("dark:bg-stone-900");
    expect(perfil).toContain("dark:text-stone-100");
    expect(perfil).toContain("dark:border-stone-700");
    expect(linkedinConta).toContain("dark:bg-stone-950/55");
    expect(linkedinConta).toContain("dark:text-stone-100");
    expect(diretorio).toContain("dark:bg-stone-900");
    expect(diretorio).toContain("dark:text-stone-300");
  });
});
