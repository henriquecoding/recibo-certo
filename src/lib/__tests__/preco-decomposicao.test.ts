import { describe, it, expect } from "vitest";
import {
  precificar,
  contextoBase,
  cenarioPorChave,
  decomporPreco,
  type ContextoPreco,
  type Regiao,
  type EscalaoIVA,
} from "@/lib/pricing";

// ═══════════════════════════════════════════════════════════════════════
//  A BARRA TEM DE EXPLICAR O NÚMERO
//  ---------------------------------------------------------------------
//  O defeito que este ficheiro existe para não deixar voltar: o cabeçalho
//  do resultado mostrava o PVP e a barra «a cada venda» somava custo +
//  custos de venda + impostos + fixos + lucro, o que dá o preço LÍQUIDO.
//  Num produto à taxa normal, a barra que decompunha 24,60 € somava
//  20,00 € — e o IVA, a segunda maior fatia, não aparecia em lado nenhum.
//
//  Quem some as parcelas com o dedo no ecrã e não chega ao total deixa de
//  acreditar em todas as outras contas da página. E o IVA fora da barra
//  apaga exatamente a frase que evita o erro mais caro de um trabalhador
//  independente: aquele dinheiro não é teu.
//
//  Um único invariante, verificado em todas as combinações que importam:
//  **a soma dos segmentos é o total, ao cêntimo.**
// ═══════════════════════════════════════════════════════════════════════

const soma = (ns: number[]) => Math.round(ns.reduce((a, b) => a + b, 0) * 100) / 100;

function ctx(patch: (c: ContextoPreco) => void = () => {}): ContextoPreco {
  const c = contextoBase();
  c.vendedor = { tipo: "empresa", regimeIVA: "normal", regiao: "continente" };
  c.custos = { direto: { valor: 10, incluiIVA: false, escalao: "normal" }, variaveis: [], fixos: [] };
  c.volume = { unidadesMes: 100 };
  c.objetivo = { modo: "margem", percentagem: 0.4 };
  patch(c);
  return c;
}

describe("a soma dos segmentos é o total", () => {
  const REGIOES: Regiao[] = ["continente", "madeira", "acores"];
  const ESCALOES: EscalaoIVA[] = ["normal", "intermedia", "reduzida"];

  it("nas três regiões e nos três escalões de IVA", () => {
    for (const regiao of REGIOES) {
      for (const escalao of ESCALOES) {
        const r = precificar(
          ctx((c) => {
            c.vendedor.regiao = regiao;
            c.produto.escalaoVenda = escalao;
          }),
        );
        const d = decomporPreco(r);
        expect(soma(d.segmentos.map((s) => s.valor)), `${regiao}/${escalao}`).toBeCloseTo(d.total, 2);
        expect(d.total, `${regiao}/${escalao}`).toBeCloseTo(r.pvp, 2);
      }
    }
  });

  it("com a fiscalidade de trabalhador independente ligada", () => {
    const r = precificar(
      ctx((c) => {
        c.vendedor = {
          tipo: "ti",
          regimeIVA: "normal",
          regiao: "continente",
          atividade: "art151",
          anoAtividade: 3,
          faturacaoAnualPrevista: 30_000,
        };
        c.produto.natureza = "servico";
      }),
    );
    const d = decomporPreco(r);
    expect(r.fiscal.aplicavel).toBe(true);
    expect(d.segmentos.some((s) => s.chave === "impostos")).toBe(true);
    expect(soma(d.segmentos.map((s) => s.valor))).toBeCloseTo(d.total, 2);
    expect(d.total).toBeCloseTo(r.pvp, 2);
  });

  it("com comissões, custos fixos, portes e devoluções ao mesmo tempo", () => {
    const r = precificar(
      ctx((c) => {
        c.canal = { canal: "marketplace", cliente: "consumidor", marketplaceId: "worten", metodoPagamentoId: "stripe_eee" };
        c.custos.variaveis = [{ id: "emb", rotulo: "Embalagem", porUnidade: 0.8 }];
        c.custos.fixos = [{ id: "f1", rotulo: "Renda", mensal: 400 }];
        c.custos.portesAbsorvidos = 3.5;
        c.custos.taxaDevolucao = 0.08;
        c.custos.custoDevolucao = 6;
      }),
    );
    const d = decomporPreco(r);
    expect(soma(d.segmentos.map((s) => s.valor))).toBeCloseTo(d.total, 2);
    expect(d.total).toBeCloseTo(r.pvp, 2);
  });

  it("em todos os cenários iniciais, tal como abrem", () => {
    for (const def of [
      "produto_revenda", "produto_proprio", "produto_digital", "servico", "servico_hora",
      "projeto", "encomenda", "loja_online", "marketplace", "objetivo", "ato_isolado", "nao_sei",
    ] as const) {
      const r = precificar(cenarioPorChave(def).contexto());
      if (!r.ok) continue;
      const d = decomporPreco(r);
      expect(soma(d.segmentos.map((s) => s.valor)), def).toBeCloseTo(d.total, 2);
    }
  });
});

describe("o IVA aparece, e aparece como não sendo do vendedor", () => {
  it("há um segmento de IVA sempre que se liquida IVA", () => {
    const d = decomporPreco(precificar(ctx()));
    const iva = d.segmentos.find((s) => s.chave === "iva");
    expect(iva, "o IVA voltou a desaparecer da barra").toBeDefined();
    expect(iva!.doEstado).toBe(true);
    expect(iva!.valor).toBeGreaterThan(0);
  });

  it("e não há segmento de IVA quando se está isento", () => {
    const r = precificar(
      ctx((c) => {
        c.vendedor.regimeIVA = "isento_art53";
        c.vendedor.faturacaoAnualPrevista = 8_000;
      }),
    );
    expect(r.taxaIVA).toBe(0);
    expect(decomporPreco(r).segmentos.some((s) => s.chave === "iva")).toBe(false);
  });

  it("a Segurança Social e o IRS também são marcados como do Estado", () => {
    const r = precificar(
      ctx((c) => {
        c.vendedor = {
          tipo: "ti", regimeIVA: "normal", regiao: "continente",
          atividade: "art151", anoAtividade: 3, faturacaoAnualPrevista: 30_000,
        };
      }),
    );
    const impostos = decomporPreco(r).segmentos.find((s) => s.chave === "impostos");
    expect(impostos?.doEstado).toBe(true);
  });
});

describe("o prejuízo não se esconde", () => {
  it("com o preço abaixo do custo, a barra é maior do que o preço e diz quanto falta", () => {
    const r = precificar(
      ctx((c) => {
        c.objetivo = { modo: "preco_fixo", valor: 6, valorEhPVP: true };
        c.custos.fixos = [{ id: "f1", rotulo: "Renda", mensal: 500 }];
      }),
    );
    const d = decomporPreco(r);
    expect(r.margem.lucroUnidade).toBeLessThan(0);
    expect(d.prejuizo).toBeGreaterThan(0);
    expect(d.total).toBeGreaterThan(d.pvp);
    expect(soma(d.segmentos.map((s) => s.valor))).toBeCloseTo(d.total, 2);
    // Sem lucro não há fatia verde a fingir que o negócio fecha.
    expect(d.segmentos.some((s) => s.chave === "lucro")).toBe(false);
  });

  it("com lucro, não há prejuízo nenhum a reportar", () => {
    const d = decomporPreco(precificar(ctx()));
    expect(d.prejuizo).toBe(0);
    expect(d.total).toBeCloseTo(d.pvp, 2);
  });
});

describe("nenhuma entrada produz NaN nem negativos", () => {
  it("um resultado impossível devolve uma decomposição vazia, não lixo", () => {
    const r = precificar(ctx((c) => void (c.objetivo = { modo: "margem", percentagem: 0.95 })));
    const d = decomporPreco(r);
    if (!r.ok) {
      expect(d.segmentos).toEqual([]);
      expect(d.total).toBe(0);
    }
    for (const s of d.segmentos) {
      expect(Number.isFinite(s.valor)).toBe(true);
      expect(s.valor).toBeGreaterThanOrEqual(0);
    }
  });

  it("volume zero não parte a decomposição", () => {
    const d = decomporPreco(precificar(ctx((c) => void (c.volume.unidadesMes = 0))));
    for (const s of d.segmentos) {
      expect(Number.isFinite(s.valor)).toBe(true);
    }
  });
});
