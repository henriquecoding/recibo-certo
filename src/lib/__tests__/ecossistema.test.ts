import { describe, it, expect } from "vitest";
import { GUIA_SLUGS, FERRAMENTA_SLUGS } from "@/lib/seo";
import { GUIAS, guiaSlug, GUIAS_DESTAQUE_POR_PERFIL, CATEGORIA_POR_PERFIL, guiasPorPerfil } from "@/lib/guias-config";
import { FERRAMENTAS, DESTAQUE_POR_PERFIL, ORDEM_POR_PERFIL, ferramentasPorPerfil } from "@/lib/ferramentas-config";
import type { Perfil } from "@/lib/perfil";

// ─────────────────────────────────────────────────────────────────────────
//  Rede de segurança do ecossistema: garante que o sitemap (seo.ts), as
//  configs partilhadas (guias/ferramentas) e a curadoria da homepage nunca
//  se dessincronizam — um guia novo sem entrada no sitemap, um slug com
//  gralha na curadoria ou um link morto falham aqui, não em produção.
// ─────────────────────────────────────────────────────────────────────────

const PERFIS: Perfil[] = ["independente", "dependente", "empresa", "comparar"];

describe("guias: seo.ts ↔ guias-config.ts", () => {
  it("GUIA_SLUGS e GUIAS são o mesmo conjunto", () => {
    const doSitemap = [...GUIA_SLUGS].sort();
    const daConfig = GUIAS.map(guiaSlug).sort();
    expect(daConfig).toEqual(doSitemap);
  });

  it("não há slugs duplicados", () => {
    const slugs = GUIAS.map(guiaSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("ferramentas: seo.ts ↔ ferramentas-config.ts", () => {
  it("FERRAMENTA_SLUGS e FERRAMENTAS (sem só-hub) são o mesmo conjunto", () => {
    const doSitemap = [...FERRAMENTA_SLUGS].sort();
    const daConfig = FERRAMENTAS.filter((f) => !f.soHub).map((f) => f.slug).sort();
    expect(daConfig).toEqual(doSitemap);
  });

  it("cada ferramenta oficial aponta para a própria landing pública", () => {
    for (const f of FERRAMENTAS.filter((x) => !x.soHub)) {
      expect(f.href).toBe(`/ferramentas/${f.slug}`);
    }
  });
});

describe("curadoria da homepage por perfil", () => {
  it("todo o destaque de ferramentas existe e cada perfil tem 4 cartões de grelha", () => {
    for (const p of PERFIS) {
      const { destaque, restantes } = ferramentasPorPerfil(p);
      expect(destaque.slug).toBe(DESTAQUE_POR_PERFIL[p]);
      expect(restantes).toHaveLength(ORDEM_POR_PERFIL[p].length);
      expect(restantes.length).toBeGreaterThanOrEqual(3);
      // o destaque não se repete na grelha
      expect(ORDEM_POR_PERFIL[p]).not.toContain(DESTAQUE_POR_PERFIL[p]);
    }
  });

  it("todos os guias em destaque existem e cada perfil tem 4", () => {
    for (const p of PERFIS) {
      expect(GUIAS_DESTAQUE_POR_PERFIL[p]).toHaveLength(4);
      const resolvidos = guiasPorPerfil(p);
      expect(resolvidos).toHaveLength(4);
      // sem repetidos dentro do mesmo perfil
      expect(new Set(resolvidos.map(guiaSlug)).size).toBe(4);
    }
  });

  it("cada perfil tem uma categoria de guias válida", () => {
    const categorias = new Set(GUIAS.map((g) => g.categoria));
    for (const p of PERFIS) {
      expect(categorias.has(CATEGORIA_POR_PERFIL[p])).toBe(true);
    }
  });
});
