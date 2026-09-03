import { describe, expect, it } from "vitest";
import { jsonLd } from "@/lib/jsonld";

describe("jsonLd", () => {
  it("neutraliza uma tentativa de fechar a etiqueta", () => {
    const carga = "</scr" + "ipt><img src=x onerror=alert(1)>";
    const saida = jsonLd({ nome: carga });
    expect(saida).not.toContain("</scr" + "ipt>");
    expect(saida).not.toContain("<img");
    expect(JSON.parse(saida)).toEqual({ nome: carga });
  });

  it("continua a ser JSON válido e a devolver o mesmo objeto", () => {
    const original = { "@context": "https://schema.org", nome: "Ação & Cª", n: 1, b: true, l: [1, 2] };
    expect(JSON.parse(jsonLd(original))).toEqual(original);
  });

  it("escapa os separadores de linha do Unicode", () => {
    const texto = `a\u2028b\u2029c`;
    const saida = jsonLd({ t: texto });
    expect(saida).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(saida).t).toBe(texto);
  });
});
