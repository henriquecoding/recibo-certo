// Confere que o JSON do documento continua a ser o que o MOTOR produz.
// Gera-se com `npm run docs:dados`; aqui só se confirma — ver a nota em
// `documento-exemplo.ts` sobre porque é que escrever a cada `vitest run`
// sujava a árvore e escondia alterações ao protótipo.
import { describe, expect, it } from "vitest";
import { construirDocumentoExemplo, JSON_EXEMPLO } from "./exemplo-vencimento";
import { guardarOuConferir } from "./documento-exemplo";
import { dadosTypst } from "../src/lib/export/documento-vencimento";

describe("dados do documento de exemplo", () => {
  it("são os que o motor produz, e é isso que o compositor lê", async () => {
    const doc = await construirDocumentoExemplo();
    const dados = dadosTypst(doc);
    guardarOuConferir(JSON_EXEMPLO, dados);

    expect(dados.resposta.valor).toBe(doc.mes.liquido);
    expect(dados.rubricas.length).toBeGreaterThan(2);
    expect(dados.proveniencia.referencia).toMatch(/^RC-2026-VNC-/);
  });
});
