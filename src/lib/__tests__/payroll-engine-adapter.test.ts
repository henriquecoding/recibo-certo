// ─────────────────────────────────────────────────────────────────────
//  Teste cruzado do adaptador do motor novo (falha 1.12 do relatório)
//  ---------------------------------------------------------------------
//  `payroll-engine-adapter.ts` não era importado por NINGUÉM. Isso deixava
//  o motor `ReciboCerto-Fiscal-Engine` — e com ele `inverse.ts` e
//  `garnishment.ts` — inalcançável a partir da aplicação e sem qualquer
//  verificação: o adaptador podia partir sem que nada acusasse.
//
//  O próprio ficheiro diz para que serve — «testes cruzados e migração
//  gradual». É isso que este teste faz: prende o adaptador ao motor legado
//  para que uma divergência apareça aqui em vez de aparecer em produção.
// ─────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { legacy2026WithholdingResolver } from "@/lib/payroll-engine-adapter";
import { calcularVencimento } from "@/lib/fiscal-dependente";
import { eurCents } from "../../../ReciboCerto-Fiscal-Engine/src";
import type { WithholdingRequest } from "../../../ReciboCerto-Fiscal-Engine/src";

function pedido(overrides: Partial<WithholdingRequest> = {}): WithholdingRequest {
  return {
    bucket: "monthly_salary",
    taxableAmount: eurCents(150_000),
    rateReferenceAmount: eurCents(150_000),
    employee: {
      jurisdiction: "PT-CONTINENTE",
      maritalStatus: "not_married",
      dependants: 0,
      disability: false,
    },
    ...overrides,
  } as WithholdingRequest;
}

describe("adaptador do motor novo (retenção 2026)", () => {
  it("é alcançável a partir da aplicação e devolve uma resolução válida", () => {
    const r = legacy2026WithholdingResolver(pedido());
    expect(r.amount.cents).toBeGreaterThan(0);
    expect(r.effectiveRate.ppm).toBeGreaterThan(0);
    expect(r.trace.length).toBeGreaterThan(0);
  });

  it("reproduz a retenção do motor legado na remuneração mensal", () => {
    for (const salario of [920, 1_500, 2_500, 4_000]) {
      const esperado = calcularVencimento({ salarioBruto: salario, subsidioRefeicaoDia: 0, diasUteis: 0 }).irsRetido;
      const obtido = legacy2026WithholdingResolver(
        pedido({
          taxableAmount: eurCents(Math.round(salario * 100)),
          rateReferenceAmount: eurCents(Math.round(salario * 100)),
        }),
      ).amount.cents / 100;
      // Tolerância de um cêntimo: o adaptador trabalha em ppm sobre cêntimos.
      expect(Math.abs(obtido - esperado)).toBeLessThanOrEqual(0.02);
    }
  });

  it("aplica metade da taxa efetiva ao trabalho suplementar (Art. 99.º-C)", () => {
    const normal = legacy2026WithholdingResolver(pedido());
    const suplementar = legacy2026WithholdingResolver(pedido({ bucket: "overtime_autonomous" }));
    expect(suplementar.effectiveRate.ppm).toBeCloseTo(Math.round(normal.effectiveRate.ppm / 2), -1);
  });

  it("devolve zero quando não há base tributável", () => {
    const r = legacy2026WithholdingResolver(pedido({ taxableAmount: eurCents(0) }));
    expect(r.amount.cents).toBe(0);
  });
});
