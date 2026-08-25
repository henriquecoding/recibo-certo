import { describe, expect, it } from "vitest";
import { FOCOS_HOMEPAGE, normalizarFocoHomepage } from "@/lib/foco-homepage";
import { PILARES, hrefDaSuperficiePilar } from "@/lib/navegacao";

describe("homepage adaptativa", () => {
  it("reconhece apenas experiências que existem de ponta a ponta", () => {
    // A lista cresce quando uma experiência fica pronta, e não antes. Um foco
    // aceite sem homepage por trás devolvia a homepage normal com um separador
    // aceso a apontar para lado nenhum.
    expect(FOCOS_HOMEPAGE).toEqual(["descobrir", "preco"]);
    expect(normalizarFocoHomepage("descobrir")).toBe("descobrir");
    expect(normalizarFocoHomepage("preco")).toBe("preco");
    expect(normalizarFocoHomepage(["preco", "descobrir"])).toBe("preco");
    expect(normalizarFocoHomepage("recibos")).toBeNull();
    expect(normalizarFocoHomepage("salario")).toBeNull();
    expect(normalizarFocoHomepage(undefined)).toBeNull();
  });

  it("todo o foco reconhecido corresponde a um pilar que o declara", () => {
    // Os dois lados do contrato: `FOCOS_HOMEPAGE` diz o que a página sabe
    // renderizar, `homepageHref` diz o que a navegação sabe abrir. Se
    // divergirem, ou há um separador que não leva a lado nenhum ou uma
    // experiência que ninguém consegue alcançar.
    const declarados = PILARES.filter((pilar) => pilar.homepageHref).map((pilar) => pilar.id);
    expect([...FOCOS_HOMEPAGE].sort()).toEqual([...declarados].sort());

    for (const pilar of PILARES) {
      if (!pilar.homepageHref) continue;
      expect(pilar.homepageHref).toBe(`/?foco=${pilar.id}`);
      expect(normalizarFocoHomepage(pilar.id)).toBe(pilar.id);
    }
  });

  it("mantém o canónico da ferramenta separado da porta editorial", () => {
    const descobrir = PILARES.find((pilar) => pilar.id === "descobrir");
    const preco = PILARES.find((pilar) => pilar.id === "preco");
    const recibos = PILARES.find((pilar) => pilar.id === "recibos");

    expect(descobrir?.href).toBe("/ferramentas/descobrir-negocio");
    expect(descobrir && hrefDaSuperficiePilar(descobrir)).toBe("/?foco=descobrir");

    expect(preco?.href).toBe("/ferramentas/calcular-preco");
    expect(preco && hrefDaSuperficiePilar(preco)).toBe("/?foco=preco");

    // Um pilar sem experiência editorial continua a abrir a ferramenta.
    expect(recibos?.homepageHref).toBeUndefined();
    expect(recibos && hrefDaSuperficiePilar(recibos)).toBe(recibos?.href);
  });

  it("não confunde foco editorial com o parâmetro de perfil", () => {
    expect(normalizarFocoHomepage("independente")).toBeNull();
    expect(normalizarFocoHomepage("empresa")).toBeNull();
    for (const pilar of PILARES) {
      expect(pilar.homepageHref ?? "").not.toContain("modo=");
    }
  });
});
