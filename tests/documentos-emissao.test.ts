// Contrato entre a rota que calcula e a função que compõe.
//
// A assinatura HMAC é o que impede a função de ser um serviço público de
// composição: sem ela, qualquer pessoa mandava compor um documento com o
// cabeçalho da marca e o conteúdo que quisesse.

import { beforeAll, describe, expect, it } from "vitest";
import { assinar, urlCompositor } from "../src/lib/documentos/emissao";

const SEGREDO = "segredo-de-teste";

beforeAll(() => {
  process.env.DOCUMENTOS_HMAC_SEGREDO = SEGREDO;
});

/** A mesma conta que a função Python faz, escrita de outra maneira. */
async function hmacDeReferencia(corpo: string): Promise<string> {
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", SEGREDO).update(corpo, "utf8").digest("hex");
}

describe("assinatura dos pedidos de composição", () => {
  it("bate certo com a implementação de referência", async () => {
    const corpo = JSON.stringify({ tipo: "vencimento", dados: { liquido: 2087.74 } });
    expect(await assinar(corpo)).toBe(await hmacDeReferencia(corpo));
    expect(await assinar(corpo)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("muda com o corpo — um cêntimo diferente é outra assinatura", async () => {
    const a = await assinar(JSON.stringify({ liquido: 2087.74 }));
    const b = await assinar(JSON.stringify({ liquido: 2087.75 }));
    expect(a).not.toBe(b);
  });

  it("recusa-se a assinar sem segredo configurado", async () => {
    const guardado = process.env.DOCUMENTOS_HMAC_SEGREDO;
    delete process.env.DOCUMENTOS_HMAC_SEGREDO;
    await expect(assinar("{}")).rejects.toThrow(/DOCUMENTOS_HMAC_SEGREDO/);
    process.env.DOCUMENTOS_HMAC_SEGREDO = guardado;
  });

  it("o compositor por omissão é a própria implantação", () => {
    delete process.env.DOCUMENTOS_COMPOSITOR_URL;
    const url = urlCompositor(new Request("https://recibocerto.pt/api/documentos/vencimento"));
    expect(url).toBe("https://recibocerto.pt/api/compor-documento");
  });
});
