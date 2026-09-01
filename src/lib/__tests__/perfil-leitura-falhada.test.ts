import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ O QUE ESTE TESTE IMPEDE                                               │
 * │                                                                      │
 * │ Em produção, a política de RLS de `profiles` consultava `profiles` e  │
 * │ o Postgres recusava TODA a leitura autenticada com 42P17. Os dados    │
 * │ estavam intactos — fotografia, nome, `role = 'admin'` — e mesmo assim │
 * │ a aplicação mostrava a inicial em vez da foto, o email em vez do      │
 * │ nome, e escondia o painel de administração.                           │
 * │                                                                      │
 * │ O que tornou isso invisível durante meses não foi a política: foi o   │
 * │ código deitar o `error` fora. `obterPerfil()` devolvia «perfil        │
 * │ vazio» e `verificarAdmin()` devolvia `false` — as MESMAS respostas    │
 * │ que dariam se a pessoa não tivesse foto e não fosse administradora.   │
 * │ Sem um sinal, não há nada para investigar.                            │
 * │                                                                      │
 * │ Estes testes fixam a distinção: falha atira, ausência devolve vazio.  │
 * └──────────────────────────────────────────────────────────────────────┘
 */

type Resposta = { data: unknown; error: unknown };

let resposta: Resposta = { data: null, error: null };

vi.mock("@/lib/supabase/client", () => ({
  supabaseConfigurado: () => true,
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => resposta,
          single: async () => resposta,
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/supabase/config", () => ({ supabaseConfigurado: () => true }));

const ERRO_RECURSAO = {
  code: "42P17",
  message: 'infinite recursion detected in policy for relation "profiles"',
};

describe("leitura do perfil: falhar não é o mesmo que estar vazio", () => {
  beforeEach(() => {
    resposta = { data: null, error: null };
    vi.resetModules();
  });

  it("obterPerfil atira quando a leitura falha", async () => {
    resposta = { data: null, error: ERRO_RECURSAO };
    const { obterPerfil } = await import("@/lib/supabase/profile");
    await expect(obterPerfil("id-qualquer")).rejects.toThrow(/recursion|perfil/i);
  });

  it("obterPerfil devolve perfil vazio quando não há linha (e não atira)", async () => {
    resposta = { data: null, error: null };
    const { obterPerfil } = await import("@/lib/supabase/profile");
    await expect(obterPerfil("id-qualquer")).resolves.toEqual({
      nome: "",
      telefone: "",
      nif: "",
      avatarUrl: "",
    });
  });

  it("obterPerfil devolve o avatar quando ele existe", async () => {
    resposta = {
      data: { nome: "Henrique Silva", telefone: null, nif: null, avatar_url: "https://exemplo/a.jpg" },
      error: null,
    };
    const { obterPerfil } = await import("@/lib/supabase/profile");
    const perfil = await obterPerfil("id-qualquer");
    expect(perfil.avatarUrl).toBe("https://exemplo/a.jpg");
    expect(perfil.nome).toBe("Henrique Silva");
  });

  it("verificarAdmin atira quando a leitura falha — nunca devolve false", async () => {
    resposta = { data: null, error: ERRO_RECURSAO };
    const { verificarAdmin } = await import("@/lib/supabase/admin");
    // O `false` silencioso era o que expulsava o administrador do /admin.
    await expect(verificarAdmin("id-qualquer")).rejects.toThrow(/administração|recursion/i);
  });

  it("verificarAdmin devolve false quando o perfil existe sem role de admin", async () => {
    resposta = { data: { role: "user" }, error: null };
    const { verificarAdmin } = await import("@/lib/supabase/admin");
    await expect(verificarAdmin("id-qualquer")).resolves.toBe(false);
  });

  it("verificarAdmin devolve false quando não há sequer linha", async () => {
    resposta = { data: null, error: null };
    const { verificarAdmin } = await import("@/lib/supabase/admin");
    await expect(verificarAdmin("id-qualquer")).resolves.toBe(false);
  });

  it("verificarAdmin devolve true para role admin", async () => {
    resposta = { data: { role: "admin" }, error: null };
    const { verificarAdmin } = await import("@/lib/supabase/admin");
    await expect(verificarAdmin("id-qualquer")).resolves.toBe(true);
  });
});
