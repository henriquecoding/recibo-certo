// Gera o JSON do documento a partir do MOTOR do projeto e verifica-o.
// Corre como teste porque é assim que se garante que o protótipo nunca contém
// um número que o motor não produziu.
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { construirDocumentoExemplo, JSON_EXEMPLO } from "./exemplo-vencimento";
import { dadosTypst } from "../src/lib/export/documento-vencimento";

describe("dados do documento de exemplo", () => {
  it("são produzidos pelo motor e escritos para o compositor", async () => {
    const doc = await construirDocumentoExemplo();
    const dados = dadosTypst(doc);
    writeFileSync(JSON_EXEMPLO, JSON.stringify(dados, null, 2) + "\n");

    expect(dados.resposta.valor).toBe(doc.mes.liquido);
    expect(dados.rubricas.length).toBeGreaterThan(2);
    expect(dados.proveniencia.referencia).toMatch(/^RC-2026-VNC-/);
  });
});
