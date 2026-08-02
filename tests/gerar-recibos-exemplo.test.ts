// Gera o JSON do mapa de recibos a partir do MOTOR e verifica-o.
//
// Como o do relatório de vencimento, corre como teste para que o protótipo
// nunca contenha um número que `calcularRecibo` não tenha produzido — e para
// que `npm run docs` tenha sempre dados frescos para compor.
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { construirMapaExemplo, JSON_EXEMPLO_RECIBOS, RECIBOS_EXEMPLO } from "./exemplo-recibos";
import { dadosTypst } from "../src/lib/export/documento-recibos";
import { arredondar } from "../src/lib/export/dinheiro";

describe("dados do mapa de recibos", () => {
  it("são produzidos pelo motor e escritos para o compositor", async () => {
    const doc = await construirMapaExemplo();
    const dados = dadosTypst(doc);
    writeFileSync(JSON_EXEMPLO_RECIBOS, JSON.stringify(dados, null, 2) + "\n");

    expect(dados.quantos).toBe(RECIBOS_EXEMPLO.length);
    expect(dados.linhas).toHaveLength(RECIBOS_EXEMPLO.length);
    expect(dados.proveniencia.referencia).toMatch(/^RC-2026-RCB-/);
  });

  it("os totais fecham com a soma das linhas — é o que a tabela promete", async () => {
    const dados = dadosTypst(await construirMapaExemplo());
    for (const campo of ["bruto", "iva", "retencao", "ss", "liquido"] as const) {
      const soma = arredondar(dados.linhas.reduce((s, l) => s + l[campo], 0));
      expect(soma, `coluna ${campo}`).toBe(dados.total[campo]);
    }
  });

  it("a concentração por cliente soma o período inteiro", async () => {
    const dados = dadosTypst(await construirMapaExemplo());
    const daTabela = arredondar(
      dados.clientes.topo.reduce((s, c) => s + c.bruto, 0) + (dados.clientes.cauda?.bruto ?? 0),
    );
    expect(daTabela).toBe(dados.total.bruto);
    // Três clientes distintos no cenário, e o maior é o que se repete.
    expect(dados.clientes.distintos).toBe(3);
    expect(dados.concentracao?.cliente).toBe("Câmara Municipal de Aveiro");
  });

  it("um recibo sem cliente não vira uma célula vazia", async () => {
    const doc = await construirMapaExemplo();
    doc.recibos = [{ ...RECIBOS_EXEMPLO[0], cliente: "   " }];
    expect(dadosTypst(doc).linhas[0].cliente).toBe("—");
  });
});
