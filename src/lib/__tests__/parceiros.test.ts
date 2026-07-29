import { describe, it, expect, beforeEach, afterEach } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
//  O cartão de parceiro anuncia uma relação comercial e leva o selo
//  "Parceiro verificado". Mostrar ali um parceiro que não existe não é um
//  defeito visual — é uma afirmação falsa sobre o negócio.
//
//  Estes testes fixam a única regra que importa: sem catálogo real, não há
//  cartão.
// ═══════════════════════════════════════════════════════════════════════

const ambienteOriginal = { ...process.env };

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_PARTNERS_DEMO;
  // `getPartnerForContext` desiste sem `window`; o ambiente de teste é Node.
  (globalThis as { window?: unknown }).window = {
    sessionStorage: { getItem: () => null, setItem: () => {} },
    localStorage: { getItem: () => null, setItem: () => {} },
  };
  (globalThis as { sessionStorage?: unknown }).sessionStorage = { getItem: () => null, setItem: () => {} };
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => null, setItem: () => {} };
});

afterEach(() => {
  process.env = { ...ambienteOriginal };
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe("catálogo de parceiros", () => {
  it("sem catálogo real não mostra parceiro nenhum", async () => {
    const { getPartnerForContext } = await import("@/lib/partners");
    for (const contexto of ["dashboard", "simulador", "prazos", "recibos", "receitas"]) {
      expect(getPartnerForContext(contexto), contexto).toBeNull();
    }
  });

  it("um catálogo vazio vindo do Supabase não é substituído por demonstração", async () => {
    const { getPartnerForContext } = await import("@/lib/partners");
    // É este o caso do mundo real: Supabase ligado, zero parceiros ativos.
    expect(getPartnerForContext("simulador", [])).toBeNull();
  });

  it("a semente de demonstração está atrás de bandeira", async () => {
    const { catalogoDeDemonstracao, SEMENTE_DEMO } = await import("@/lib/partners");
    expect(catalogoDeDemonstracao()).toEqual([]);

    process.env.NEXT_PUBLIC_PARTNERS_DEMO = "true";
    expect(catalogoDeDemonstracao().length).toBe(SEMENTE_DEMO.length);
  });

  it("a semente não se disfarça de catálogo real", async () => {
    const { SEMENTE_DEMO } = await import("@/lib/partners");
    // Se alguém alguma vez copiar a semente para produção, estes URLs
    // denunciam-na: apontam para um domínio de exemplo, não para parceiros.
    for (const p of SEMENTE_DEMO) {
      expect(p.url, p.id).toMatch(/^https:\/\/parceiros\.recibocerto\.pt\//);
    }
  });

  it("um parceiro real precisa de contexto, destino e chamada à ação", async () => {
    const { SEMENTE_DEMO } = await import("@/lib/partners");
    // A forma é a mesma para os reais; validá-la na semente evita que o
    // componente rebente com uma linha incompleta vinda do admin.
    for (const p of SEMENTE_DEMO) {
      expect(p.contextos.length, p.id).toBeGreaterThan(0);
      expect(p.cta.length, p.id).toBeGreaterThan(2);
      expect(p.descricao.length, p.id).toBeGreaterThan(20);
      expect(["bank", "building", "file-sign", "heart", "invoice"]).toContain(p.icone);
    }
  });
});
