import { describe, expect, it } from "vitest";
import { FOCOS_HOMEPAGE, normalizarFocoHomepage } from "@/lib/foco-homepage";
import { PILARES, hrefDaSuperficiePilar } from "@/lib/navegacao";

describe("homepage adaptativa", () => {
  it("reconhece apenas experiências que existem de ponta a ponta", () => {
    expect(FOCOS_HOMEPAGE).toEqual(["descobrir"]);
    expect(normalizarFocoHomepage("descobrir")).toBe("descobrir");
    expect(normalizarFocoHomepage(["descobrir", "preco"])).toBe("descobrir");
    expect(normalizarFocoHomepage("preco")).toBeNull();
    expect(normalizarFocoHomepage(undefined)).toBeNull();
  });

  it("mantém o canónico da ferramenta separado da porta editorial", () => {
    const descobrir = PILARES.find((pilar) => pilar.id === "descobrir");
    const preco = PILARES.find((pilar) => pilar.id === "preco");

    expect(descobrir?.href).toBe("/ferramentas/descobrir-negocio");
    expect(descobrir && hrefDaSuperficiePilar(descobrir)).toBe("/?foco=descobrir");
    expect(preco && hrefDaSuperficiePilar(preco)).toBe(preco?.href);
  });

  it("não confunde foco editorial com o parâmetro de perfil", () => {
    expect(normalizarFocoHomepage("independente")).toBeNull();
    expect(PILARES.find((pilar) => pilar.id === "descobrir")?.homepageHref).not.toContain("modo=");
  });
});
