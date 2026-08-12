import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// ═══════════════════════════════════════════════════════════════════════
//  A ÁREA DE ADMINISTRAÇÃO É GUARDADA NO SERVIDOR
//  ---------------------------------------------------------------------
//  O ecrã de administração verifica o papel no cliente. Isso é conforto,
//  não segurança: quem chama a API não passa pelo ecrã. A garantia a
//  sério é `pedidoDeAdmin`/`adminDoPedido` — validam o token com o
//  Supabase e confirmam `role = 'admin'` na base de dados.
//
//  Este teste é estrutural de propósito: é fácil acrescentar uma rota
//  nova sob /api/admin e esquecer a guarda, e um esquecimento desses não
//  se vê a olho nu — a rota funciona na perfeição, só que para toda a
//  gente. Aqui, falha o build.
// ═══════════════════════════════════════════════════════════════════════

const raiz = join(process.cwd(), "src/app/api/admin");

function rotas(dir: string): string[] {
  const achadas: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) achadas.push(...rotas(caminho));
    else if (nome === "route.ts") achadas.push(caminho);
  }
  return achadas;
}

const METODOS = /export\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE)\s*\(/g;

describe("RC-SEC-001 · guarda de administração", () => {
  const ficheiros = rotas(raiz);

  it("existe pelo menos uma rota de administração para verificar", () => {
    expect(ficheiros.length).toBeGreaterThan(0);
  });

  it.each(ficheiros)("%s importa a guarda do servidor", (f) => {
    const src = readFileSync(f, "utf-8");
    expect(src).toMatch(/from "@\/lib\/supabase\/verify-request-admin"/);
  });

  it.each(ficheiros)("%s chama a guarda em cada método exportado", (f) => {
    const src = readFileSync(f, "utf-8");
    const metodos = [...src.matchAll(METODOS)].map((m) => m[1]);
    expect(metodos.length).toBeGreaterThan(0);

    // Cada corpo de método tem de conter uma chamada à guarda. Fatia-se o
    // ficheiro pelos pontos de exportação: o corpo de um método vai do seu
    // `export async function` até ao seguinte (ou ao fim).
    const inicios = [...src.matchAll(METODOS)].map((m) => m.index ?? 0);
    inicios.forEach((inicio, i) => {
      const fim = inicios[i + 1] ?? src.length;
      const corpo = src.slice(inicio, fim);
      expect(
        /await\s+(pedidoDeAdmin|adminDoPedido)\s*\(/.test(corpo),
        `${f} · ${metodos[i]} não chama pedidoDeAdmin nem adminDoPedido`,
      ).toBe(true);
    });
  });

  it("a guarda confirma o papel na base de dados, não um email conhecido", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/supabase/verify-request-admin.ts"),
      "utf-8",
    );
    // Valida o token com o Supabase…
    expect(src).toContain("auth.getUser(token)");
    // …e o papel vem de `profiles`, não de uma lista no código.
    expect(src).toContain('.from("profiles")');
    expect(src).toContain('role === "admin"');
    // Nunca a chave de serviço aqui: a leitura do papel corre sob a RLS da
    // própria pessoa, para que um token de não-admin não consiga fingir.
    expect(src).not.toContain("SERVICE_ROLE");
  });

  it("a administração não devolve conteúdo fiscal, só contagens", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/api/admin/contas/route.ts"),
      "utf-8",
    );
    // As contagens vêm de uma função que devolve números (migração 039).
    expect(src).toContain("admin_totais_por_conta");
    // E nenhuma das tabelas de conteúdo é lida diretamente.
    for (const tabela of ["recibos", "recibos_vencimento", "cenarios"]) {
      expect(src).not.toContain(`.from("${tabela}")`);
    }
  });
});
