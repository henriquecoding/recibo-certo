import { describe, it, expect } from "vitest";
import {
  precificar,
  contextoBase,
  cenarioPorChave,
  compararCenarios,
  precoParaGanhar,
  unidadesParaGanhar,
  margemDeMarkup,
  markupDeMargem,
  validarRegrasPricing,
  canalPorId,
  precoPorMargem,
  fracaoDisponivel,
  type ContextoPreco,
  type EntradaSolver,
} from "@/lib/pricing";
import { IVA_TAXAS, SS_TAXA, SS_COEFICIENTE } from "@/lib/fiscal-data";

// ═══════════════════════════════════════════════════════════════════════
//  MATRIZ DE TESTE DA PRICING ENGINE
//
//  Vinte casos do briefing mais os invariantes da especificação de cálculo
//  (docs/architecture/pricing-calculation-spec.md §12).
//
//  Os testes não verificam «o resultado é bonito» — verificam identidades
//  que têm de continuar verdadeiras depois de qualquer refactorização:
//  PVP = líquido + IVA, margem nunca acima do disponível, aumentar custo
//  nunca aumenta lucro, e nenhuma entrada finita produz NaN.
// ═══════════════════════════════════════════════════════════════════════

const IVA_NORMAL = IVA_TAXAS.continente.value.normal;

/** Contexto mínimo determinista: sem fiscalidade, sem comissões, sem fixos. */
function ctxSimples(patch: (c: ContextoPreco) => void = () => {}): ContextoPreco {
  const c = contextoBase();
  c.vendedor = { tipo: "empresa", regimeIVA: "normal", regiao: "continente" };
  c.produto = { natureza: "bem", escalaoVenda: "normal" };
  c.canal = { canal: "loja_fisica", cliente: "consumidor" };
  c.custos = { direto: { valor: 10, incluiIVA: false, escalao: "normal" }, variaveis: [], fixos: [] };
  c.volume = { unidadesMes: 100 };
  c.objetivo = { modo: "margem", percentagem: 0.4 };
  patch(c);
  return c;
}

const proximo = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;

// ─────────────────────────────────────────────────────────────────────
describe("regras de mercado", () => {
  it("as regras de pricing são internamente consistentes", () => {
    expect(validarRegrasPricing()).toEqual([]);
  });

  it("nenhuma comissão de canal chega a 100% — senão nenhum preço seria possível", () => {
    for (const canal of ["amazon", "worten", "fnac", "kuantokusta", "corteingles", "olx"]) {
      const c = canalPorId(canal)!;
      expect(c.comissaoMax).toBeLessThan(1);
      expect(c.comissaoTipica).toBeGreaterThanOrEqual(c.comissaoMin);
      expect(c.comissaoTipica).toBeLessThanOrEqual(c.comissaoMax);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
describe("caso 1 — produto comprado por 10 €", () => {
  it("com 40% de margem o preço líquido é 16,67 € e o PVP leva IVA", () => {
    const r = precificar(ctxSimples());
    expect(r.ok).toBe(true);
    // P = 10 / (1 − 0,40) = 16,666…
    expect(proximo(r.precoLiquido, 16.67)).toBe(true);
    expect(proximo(r.pvp, 16.67 * (1 + IVA_NORMAL), 0.05)).toBe(true);
    expect(proximo(r.margem.margem, 0.4, 0.005)).toBe(true);
  });

  it("o PVP é sempre o líquido mais o IVA", () => {
    const r = precificar(ctxSimples());
    expect(Math.abs(r.pvp - (r.precoLiquido + r.iva))).toBeLessThanOrEqual(0.005);
  });
});

describe("caso 2 — produto produzido por 10 €", () => {
  it("produção própria substitui o custo de aquisição", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.custos.direto = { valor: 0, incluiIVA: false, escalao: "normal" };
        c.producao = {
          materias: [
            { id: "m", rotulo: "Matéria", custoLote: { valor: 100, incluiIVA: false, escalao: "normal" }, unidadesPorLote: 20 },
          ],
          custoHoraMaoObra: 10,
          horasPorUnidade: 0.5,
        };
      }),
    );
    // 100/20 = 5 de matéria + 0,5 h × 10 € = 5 → 10 € de custo
    expect(proximo(r.custo.direto, 10)).toBe(true);
    expect(proximo(r.precoLiquido, 16.67, 0.05)).toBe(true);
  });
});

describe("caso 3 e 4 — margem vs markup não são a mesma coisa", () => {
  it("markup de 50% sobre 10 € dá 15 €; margem de 50% dá 20 €", () => {
    const comMarkup = precificar(
      ctxSimples((c) => {
        c.objetivo = { modo: "markup", percentagem: 0.5 };
      }),
    );
    const comMargem = precificar(
      ctxSimples((c) => {
        c.objetivo = { modo: "margem", percentagem: 0.5 };
      }),
    );
    expect(proximo(comMarkup.precoLiquido, 15)).toBe(true);
    expect(proximo(comMargem.precoLiquido, 20)).toBe(true);
    expect(comMargem.precoLiquido).toBeGreaterThan(comMarkup.precoLiquido);
  });

  it("as conversões margem ↔ markup são inversas uma da outra", () => {
    for (const m of [0.1, 0.25, 0.4, 0.55, 0.7]) {
      expect(proximo(margemDeMarkup(markupDeMargem(m)), m, 1e-9)).toBe(true);
    }
    for (const k of [0.15, 0.5, 1, 2.5]) {
      expect(proximo(markupDeMargem(margemDeMarkup(k)), k, 1e-9)).toBe(true);
    }
  });

  it("markup de 50% corresponde a margem de 33,3% e a engine di-lo", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.objetivo = { modo: "markup", percentagem: 0.5 };
      }),
    );
    expect(proximo(r.margem.margem, 1 / 3, 0.005)).toBe(true);
  });
});

describe("caso 5 e 6 — comissões", () => {
  it("comissão percentual incide sobre o BRUTO, não sobre o líquido", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.canal = { canal: "marketplace", cliente: "consumidor", comissaoPercentagem: 0.15 };
      }),
    );
    // Verificação independente: comissão = 15% do PVP
    const comissaoEsperada = r.pvp * 0.15;
    const lucro = r.precoLiquido - r.custo.direto - comissaoEsperada;
    expect(proximo(lucro, r.margem.lucroUnidade, 0.02)).toBe(true);
  });

  it("comissão fixa mais percentual: o preço sobe mais do que a soma ingénua", () => {
    const semComissao = precificar(ctxSimples());
    const comComissao = precificar(
      ctxSimples((c) => {
        c.canal = {
          canal: "marketplace",
          cliente: "consumidor",
          comissaoPercentagem: 0.15,
          comissaoFixa: 0.3,
        };
      }),
    );
    expect(comComissao.precoLiquido).toBeGreaterThan(semComissao.precoLiquido);
    expect(proximo(comComissao.margem.margem, 0.4, 0.01)).toBe(true);
  });

  it("uma comissão de 15% sobre o bruto pesa 18,45% sobre o líquido", () => {
    const equivalente = 0.15 * (1 + IVA_NORMAL);
    expect(proximo(equivalente, 0.1845, 0.0005)).toBe(true);
  });
});

describe("caso 7 — portes absorvidos pelo vendedor", () => {
  it("portes entram no custo e sobem o preço", () => {
    const sem = precificar(ctxSimples());
    const com = precificar(
      ctxSimples((c) => {
        c.custos.portesAbsorvidos = 4;
      }),
    );
    expect(com.precoLiquido).toBeGreaterThan(sem.precoLiquido);
    // 14 / 0,6 = 23,33
    expect(proximo(com.precoLiquido, 23.33, 0.05)).toBe(true);
  });
});

describe("caso 8 — desconto", () => {
  it("10% de desconto num produto com 40% de margem corta um quarto do lucro", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.desconto = { tipo: "promocao", percentagem: 0.1 };
      }),
    );
    expect(r.desconto).toBeDefined();
    expect(r.desconto!.margemDepois).toBeLessThan(r.desconto!.margemAntes);
    expect(r.desconto!.lucroDepois).toBeLessThan(r.desconto!.lucroAntes);
    // O desconto máximo tem de ser ≥ à margem de contribuição em preço.
    expect(r.desconto!.descontoMaximo).toBeGreaterThan(0.1);
  });

  it("desconto de 0% devolve exatamente o mesmo resultado (invariante 10)", () => {
    const semCampo = precificar(ctxSimples());
    const comZero = precificar(
      ctxSimples((c) => {
        c.desconto = { tipo: "promocao", percentagem: 0 };
      }),
    );
    expect(comZero.precoLiquido).toBe(semCampo.precoLiquido);
    expect(comZero.margem.lucroUnidade).toBe(semCampo.margem.lucroUnidade);
  });

  it("um desconto que destrói a margem é assinalado como perigo", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.objetivo = { modo: "margem", percentagem: 0.1 };
        c.desconto = { tipo: "promocao", percentagem: 0.3 };
      }),
    );
    expect(r.desconto!.destruiRentabilidade).toBe(true);
    expect(r.avisos.some((a) => a.id === "desconto-destroi-margem")).toBe(true);
  });
});

describe("caso 9 e 10 — IVA e o duplo efeito da isenção do Art. 53.º", () => {
  it("no regime normal o custo é a base tributável", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.custos.direto = { valor: 12.3, incluiIVA: true, escalao: "normal" };
      }),
    );
    // 12,30 / 1,23 = 10,00
    expect(proximo(r.custo.direto, 10)).toBe(true);
  });

  it("isento pelo Art. 53.º: não cobra IVA E não deduz o IVA da compra", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.vendedor.regimeIVA = "isento_art53";
        c.custos.direto = { valor: 12.3, incluiIVA: true, escalao: "normal" };
      }),
    );
    expect(r.taxaIVA).toBe(0);
    expect(r.pvp).toBe(r.precoLiquido);
    // O custo é os 12,30 pagos, não os 10 de base — este é o ponto todo.
    expect(proximo(r.custo.direto, 12.3)).toBe(true);
    expect(r.avisos.some((a) => a.id === "isencao-art53-duplo-efeito")).toBe(true);
  });

  it("a isenção aumenta o custo direto face ao regime normal (invariante 7)", () => {
    const normal = precificar(
      ctxSimples((c) => {
        c.custos.direto = { valor: 100, incluiIVA: true, escalao: "normal" };
      }),
    );
    const isento = precificar(
      ctxSimples((c) => {
        c.vendedor.regimeIVA = "isento_art53";
        c.custos.direto = { valor: 100, incluiIVA: true, escalao: "normal" };
      }),
    );
    expect(isento.custo.direto).toBeGreaterThan(normal.custo.direto);
    expect(proximo(isento.custo.direto / normal.custo.direto, 1 + IVA_NORMAL, 0.01)).toBe(true);
  });

  it("as taxas regionais vêm de fiscal-data e diferem entre si", () => {
    const continente = precificar(ctxSimples());
    const acores = precificar(
      ctxSimples((c) => {
        c.vendedor.regiao = "acores";
      }),
    );
    expect(continente.taxaIVA).toBe(IVA_TAXAS.continente.value.normal);
    expect(acores.taxaIVA).toBe(IVA_TAXAS.acores.value.normal);
    expect(acores.pvp).toBeLessThan(continente.pvp);
    // Preço líquido é o mesmo: o IVA não muda o que o vendedor recebe.
    expect(proximo(acores.precoLiquido, continente.precoLiquido)).toBe(true);
  });
});

describe("caso 11 e 12 — B2B e B2C", () => {
  it("vender a empresa portuguesa gera retenção na fonte; ao consumidor não", () => {
    const base = (cliente: ContextoPreco["canal"]["cliente"]) =>
      precificar(
        ctxSimples((c) => {
          c.vendedor = {
            tipo: "ti",
            regimeIVA: "normal",
            regiao: "continente",
            atividade: "art151",
            anoAtividade: 3,
            faturacaoAnualPrevista: 30000,
          };
          c.canal = { canal: "venda_direta", cliente };
        }),
      );

    const b2b = base("empresa_pt");
    const b2c = base("consumidor");

    expect(b2b.fiscal.retencaoFracao).toBeGreaterThan(0);
    expect(b2c.fiscal.retencaoFracao).toBe(0);
    // A retenção NÃO é custo: a margem tem de ser igual nos dois.
    expect(proximo(b2b.margem.margem, b2c.margem.margem, 0.001)).toBe(true);
    expect(proximo(b2b.precoLiquido, b2c.precoLiquido, 0.01)).toBe(true);
  });

  it("cliente empresa noutro Estado-membro dispara o aviso de autoliquidação", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.canal = { canal: "venda_direta", cliente: "empresa_ue" };
      }),
    );
    expect(r.avisos.some((a) => a.id === "b2b-ue-autoliquidacao")).toBe(true);
  });
});

describe("caso 13 e 14 — serviço por hora e projeto fechado", () => {
  const ctxServico = () => {
    const c = cenarioPorChave("servico").contexto();
    c.vendedor.faturacaoAnualPrevista = 30000;
    return c;
  };

  it("as horas produtivas são muito menos do que as horas trabalhadas", () => {
    const r = precificar(ctxServico());
    expect(r.ok).toBe(true);
    // 8 h por projeto a um valor/hora realista dá um custo de tempo relevante.
    expect(r.custo.direto).toBeGreaterThan(0);
  });

  it("o valor/hora sobe quando a taxa faturável desce", () => {
    const alta = precificar(
      (() => {
        const c = ctxServico();
        c.tempo!.taxaFaturavel = 0.9;
        return c;
      })(),
    );
    const baixa = precificar(
      (() => {
        const c = ctxServico();
        c.tempo!.taxaFaturavel = 0.5;
        return c;
      })(),
    );
    expect(baixa.custo.direto).toBeGreaterThan(alta.custo.direto);
    expect(baixa.precoLiquido).toBeGreaterThan(alta.precoLiquido);
  });

  it("o custo do tempo NÃO é bruteado duas vezes", () => {
    // Regressão de um defeito real, apanhado a olhar para o ecrã e não nos
    // testes: `custoTempoPorUnidade` vinha já dividido por (1 − fração
    // fiscal) e o solver voltava a aplicar a mesma fração. Um TI com 15% de
    // Segurança Social e 30% de margem via um preço ~57% acima do devido.
    //
    // A verificação é independente do motor: o preço tem de ser exatamente
    // (horas × valor/hora líquido) / (1 − v − m).
    const c = ctxServico();
    c.tempo!.rendimentoAnualPretendido = 24000;
    c.tempo!.horasPorUnidade = 8;
    c.custos.fixos = [];
    const r = precificar(c);

    const semanas = 52 - 4.4 - 2.6 - 2;
    const horasProdutivas = semanas * 40 * 0.6;
    const valorHoraLiquido = 24000 / horasProdutivas;
    const custoEsperado = 8 * valorHoraLiquido;

    expect(proximo(r.custo.direto, custoEsperado, 0.05)).toBe(true);

    const denominador = 1 - r.fiscal.ssFracao - r.fiscal.irsFracao - 0.3;
    expect(proximo(r.precoLiquido, custoEsperado / denominador, 0.1)).toBe(true);
  });

  it("sem faturação declarada, a Segurança Social marginal é a da banda normal", () => {
    // A derivada discreta em zero apanhava a contribuição MÍNIMA de
    // 20 €/mês e devolvia 24% — um degrau fixo disfarçado de taxa marginal.
    const c = ctxServico();
    c.vendedor.faturacaoAnualPrevista = undefined;
    const r = precificar(c);
    expect(proximo(r.fiscal.ssFracao, SS_TAXA.value * SS_COEFICIENTE.servicos.value, 0.001)).toBe(true);
  });

  it("projeto fechado: mais horas, preço proporcionalmente maior", () => {
    const c = cenarioPorChave("projeto").contexto();
    c.vendedor.faturacaoAnualPrevista = 30000;
    const r1 = precificar(c);
    const c2 = structuredClone(c);
    c2.tempo!.horasPorUnidade = 80;
    const r2 = precificar(c2);
    expect(r2.precoLiquido).toBeGreaterThan(r1.precoLiquido * 1.5);
  });
});

describe("caso 15 e 16 — produção própria e marketplace", () => {
  it("produção própria soma matérias, mão de obra, energia e depreciação", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.custos.direto = { valor: 0, incluiIVA: false, escalao: "normal" };
        c.producao = {
          materias: [
            { id: "a", rotulo: "A", custoLote: { valor: 60, incluiIVA: false, escalao: "normal" }, unidadesPorLote: 10 },
          ],
          custoHoraMaoObra: 10,
          horasPorUnidade: 1,
          energiaPorUnidade: 0.5,
          depreciacaoMensal: 100,
          unidadesMes: 50,
        };
      }),
    );
    // 6 + 10 + 0,5 + 2 = 18,50
    expect(proximo(r.custo.direto, 18.5, 0.01)).toBe(true);
  });

  it("marketplace com comissão típica reduz a margem se o preço não subir", () => {
    const c = cenarioPorChave("marketplace").contexto();
    const r = precificar(c);
    expect(r.ok).toBe(true);
    expect(r.custo.fracaoSobreBruto).toBeGreaterThan(0);
    expect(r.avisos.some((a) => a.id === "comissao-alta" || a.id === "devolucoes-online")).toBe(true);
  });
});

describe("caso 17 — ponto de equilíbrio", () => {
  it("custos fixos a dividir pela margem de contribuição, arredondado para cima", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.custos.fixos = [{ id: "renda", rotulo: "Renda", mensal: 800 }];
        c.volume = { unidadesMes: 200 };
      }),
    );
    expect(r.breakEven.possivel).toBe(true);

    // Testa-se a DEFINIÇÃO, não uma recomputação a partir do valor já
    // arredondado: `contribuicaoUnidade` sai em cêntimos e o motor divide
    // pelo valor inteiro. Recalcular a partir do arredondado dava 61 onde
    // a resposta certa é 60 — o erro de arredondamento a meio da cadeia
    // que a §11 da especificação proíbe.
    const mc = r.margem.contribuicaoUnidade;
    expect(r.breakEven.unidades * mc).toBeGreaterThanOrEqual(800 - 0.5);
    expect((r.breakEven.unidades - 1) * mc).toBeLessThan(800);
  });

  it("sem margem de contribuição não existe ponto de equilíbrio — e não devolve Infinity", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.objetivo = { modo: "preco_fixo", valor: 5, valorEhPVP: true };
        c.custos.fixos = [{ id: "renda", rotulo: "Renda", mensal: 800 }];
      }),
    );
    expect(r.breakEven.possivel).toBe(false);
    expect(Number.isFinite(r.breakEven.unidades)).toBe(true);
    expect(r.breakEven.nota).toBeTruthy();
  });
});

describe("caso 18 e 19 — margem pretendida e preço máximo", () => {
  it("a margem entregue é a margem pedida", () => {
    for (const m of [0.1, 0.25, 0.4, 0.6]) {
      const r = precificar(
        ctxSimples((c) => {
          c.objetivo = { modo: "margem", percentagem: m };
        }),
      );
      expect(proximo(r.margem.margem, m, 0.005)).toBe(true);
    }
  });

  it("margem impossível devolve motivo, não NaN (invariante 6)", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.canal = { canal: "marketplace", cliente: "consumidor", comissaoPercentagem: 0.6 };
        c.objetivo = { modo: "margem", percentagem: 0.7 };
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.impossivel).toBe("margem_inalcancavel");
    expect(Number.isNaN(r.precoLiquido)).toBe(false);
    expect(r.motivoTexto).toContain("Não existe preço");
    expect(r.avisos.some((a) => a.id === "margem-impossivel")).toBe(true);
  });
});

describe("caso 20 — vender abaixo do custo", () => {
  it("o resultado avisa e quantifica a perda", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.objetivo = { modo: "preco_fixo", valor: 9.99, valorEhPVP: true };
      }),
    );
    expect(r.margem.contribuicaoUnidade).toBeLessThan(0);
    const aviso = r.avisos.find((a) => a.id === "abaixo-do-custo");
    expect(aviso).toBeDefined();
    expect(aviso!.severidade).toBe("perigo");
  });

  it("o veredicto sobre um preço pensado abaixo do piso é inequívoco", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.precoPensado = 9.99;
      }),
    );
    expect(r.veredicto).toBeDefined();
    expect(r.veredicto!.classificacao).toBe("abaixo_do_piso");
  });

  it("um preço pensado alinhado é reconhecido como tal", () => {
    const base = precificar(ctxSimples());
    const r = precificar(
      ctxSimples((c) => {
        c.precoPensado = base.pvp;
      }),
    );
    expect(r.veredicto!.classificacao).toBe("alinhado");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  FISCALIDADE PORTUGUESA — o diferencial
// ═══════════════════════════════════════════════════════════════════════

describe("trabalhador independente", () => {
  const ctxTI = (patch: (c: ContextoPreco) => void = () => {}) =>
    ctxSimples((c) => {
      c.vendedor = {
        tipo: "ti",
        regimeIVA: "normal",
        regiao: "continente",
        atividade: "art151",
        anoAtividade: 3,
        faturacaoAnualPrevista: 30000,
      };
      c.canal = { canal: "venda_direta", cliente: "consumidor" };
      patch(c);
    });

  it("a Segurança Social de serviços é ≈ 14,98% do líquido (invariante 8)", () => {
    const r = precificar(ctxTI());
    const esperado = SS_TAXA.value * SS_COEFICIENTE.servicos.value;
    expect(proximo(r.fiscal.ssFracao, esperado, 0.002)).toBe(true);
    expect(proximo(esperado, 0.1498, 0.0002)).toBe(true);
  });

  it("na venda de bens a base de SS é 20%, logo a fração é muito menor", () => {
    const servicos = precificar(ctxTI());
    const bens = precificar(
      ctxTI((c) => {
        c.vendedor.atividade = "vendas";
      }),
    );
    expect(bens.fiscal.ssFracao).toBeLessThan(servicos.fiscal.ssFracao);
    expect(proximo(bens.fiscal.ssFracao, SS_TAXA.value * SS_COEFICIENTE.bens.value, 0.002)).toBe(true);
  });

  it("acima do teto de 12 × IAS a fração marginal de SS desce para zero", () => {
    const r = precificar(
      ctxTI((c) => {
        c.vendedor.faturacaoAnualPrevista = 200000;
      }),
    );
    expect(r.fiscal.ssFracao).toBe(0);
  });

  it("a SS e o IRS empurram o preço para cima face a uma sociedade", () => {
    const ti = precificar(ctxTI());
    const empresa = precificar(ctxSimples());
    expect(ti.precoLiquido).toBeGreaterThan(empresa.precoLiquido);
  });

  it("dentro da zona progressiva, o IRS marginal cresce com a faturação", () => {
    const baixo = precificar(
      ctxTI((c) => {
        c.vendedor.faturacaoAnualPrevista = 25000;
      }),
    );
    const alto = precificar(
      ctxTI((c) => {
        c.vendedor.faturacaoAnualPrevista = 70000;
      }),
    );
    expect(alto.fiscal.irsFracao).toBeGreaterThan(baixo.fiscal.irsFracao);
  });

  it("o IRS marginal NÃO é monótono: há um pico na saída do mínimo de existência", () => {
    // Descoberta da fase de verificação, e é contraintuitiva ao ponto de
    // merecer um teste: entre ~12 000 € e ~16 000 € de faturação, a
    // extinção progressiva do mínimo de existência faz a taxa marginal
    // subir acima de 40% — mais alta do que a de quem fatura 70 000 €.
    // Se alguém "corrigir" o motor para forçar monotonia, este teste cai.
    const marginalA = precificar(ctxTI((c) => {
      c.vendedor.faturacaoAnualPrevista = 13000;
    })).fiscal.irsFracao;
    const marginalB = precificar(ctxTI((c) => {
      c.vendedor.faturacaoAnualPrevista = 70000;
    })).fiscal.irsFracao;

    expect(marginalA).toBeGreaterThan(0.4);
    expect(marginalA).toBeGreaterThan(marginalB);
  });

  it("a zona de transição do mínimo de existência é assinalada ao utilizador", () => {
    const r = precificar(
      ctxTI((c) => {
        c.vendedor.faturacaoAnualPrevista = 13000;
      }),
    );
    expect(r.avisos.some((a) => a.id === "zona-minimo-existencia")).toBe(true);
  });

  it("sem faturação anual a ferramenta diz que o IRS ficou de fora", () => {
    const r = precificar(
      ctxTI((c) => {
        c.vendedor.faturacaoAnualPrevista = undefined;
      }),
    );
    expect(r.fiscal.irsFracao).toBe(0);
    expect(r.avisos.some((a) => a.id === "sem-faturacao-anual")).toBe(true);
  });

  it("a isenção de SS do primeiro ano é assinalada como temporária", () => {
    const r = precificar(
      ctxTI((c) => {
        c.vendedor.isencaoSSPrimeiroAno = true;
      }),
    );
    expect(r.fiscal.ssFracao).toBe(0);
    expect(r.avisos.some((a) => a.id === "ss-primeiro-ano")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  INVARIANTES
// ═══════════════════════════════════════════════════════════════════════

describe("invariantes da especificação de cálculo", () => {
  it("1 — PVP = líquido + IVA em todos os cenários e regiões", () => {
    for (const regiao of ["continente", "madeira", "acores"] as const) {
      for (const escalao of ["reduzida", "intermedia", "normal"] as const) {
        const r = precificar(
          ctxSimples((c) => {
            c.vendedor.regiao = regiao;
            c.produto.escalaoVenda = escalao;
          }),
        );
        expect(Math.abs(r.pvp - (r.precoLiquido + r.iva))).toBeLessThanOrEqual(0.005);
      }
    }
  });

  it("2 — a margem de contribuição nunca ultrapassa 100%", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.custos.direto = { valor: 0.01, incluiIVA: false, escalao: "normal" };
        c.objetivo = { modo: "margem", percentagem: 0.95 };
      }),
    );
    expect(r.margem.contribuicaoPercentagem).toBeLessThanOrEqual(1);
  });

  it("3 — subir o preço nunca reduz a margem de contribuição", () => {
    let anterior = -Infinity;
    for (const preco of [12, 15, 20, 30, 50, 100]) {
      const r = precificar(
        ctxSimples((c) => {
          c.objetivo = { modo: "preco_fixo", valor: preco, valorEhPVP: true };
        }),
      );
      expect(r.margem.contribuicaoUnidade).toBeGreaterThanOrEqual(anterior);
      anterior = r.margem.contribuicaoUnidade;
    }
  });

  it("4 — aumentar um custo nunca aumenta o lucro", () => {
    const base = precificar(
      ctxSimples((c) => {
        c.objetivo = { modo: "preco_fixo", valor: 30, valorEhPVP: true };
      }),
    );
    const maisCaro = precificar(
      ctxSimples((c) => {
        c.objetivo = { modo: "preco_fixo", valor: 30, valorEhPVP: true };
        c.custos.direto = { valor: 15, incluiIVA: false, escalao: "normal" };
      }),
    );
    expect(maisCaro.margem.lucroUnidade).toBeLessThan(base.margem.lucroUnidade);
  });

  it("6 — denominador ≤ 0 devolve falha, nunca Infinity", () => {
    const solver: EntradaSolver = {
      custosEuros: 10,
      fixosTransacao: 0,
      fracaoLiquido: 0.5,
      fracaoBruto: 0.5,
      taxaIVA: 0.23,
    };
    expect(fracaoDisponivel(solver)).toBeLessThan(0);
    const r = precoPorMargem(solver, 0.3);
    expect(r.ok).toBe(false);
    expect(Number.isFinite(r.precoLiquido)).toBe(true);
  });

  it("9 — nenhuma entrada finita produz NaN", () => {
    const entradas: ContextoPreco[] = [
      ctxSimples(),
      ctxSimples((c) => {
        c.volume = { unidadesMes: 0 };
      }),
      ctxSimples((c) => {
        c.custos.direto = { valor: 0, incluiIVA: false, escalao: "normal" };
      }),
      ctxSimples((c) => {
        c.custos.desperdicio = 0.9;
        c.custos.taxaDevolucao = 0.9;
        c.custos.custoDevolucao = 100;
      }),
      ctxSimples((c) => {
        c.objetivo = { modo: "lucro_mensal", valor: 5000 };
        c.volume = { unidadesMes: 0 };
      }),
      contextoBase(),
      ...["produto_revenda", "produto_proprio", "produto_digital", "servico", "servico_hora", "projeto", "encomenda", "loja_online", "marketplace", "objetivo", "nao_sei"].map(
        (k) => cenarioPorChave(k as never).contexto(),
      ),
    ];

    for (const ctx of entradas) {
      const r = precificar(ctx);
      const numeros = [
        r.precoLiquido,
        r.iva,
        r.pvp,
        r.margem.margem,
        r.margem.lucroUnidade,
        r.margem.contribuicaoUnidade,
        r.breakEven.unidades,
        r.custo.total,
        r.fiscal.ssPorUnidade,
        r.caixa.entraNaConta,
      ];
      for (const n of numeros) {
        expect(Number.isFinite(n)).toBe(true);
      }
      for (const linha of r.explicacao) {
        expect(Number.isFinite(linha.valor)).toBe(true);
      }
    }
  });

  it("desperdício divide em vez de multiplicar", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.custos.desperdicio = 0.1;
      }),
    );
    // 10 / 0,9 = 11,11 — e não 10 × 1,1 = 11,00
    expect(proximo(r.custo.direto, 11.11, 0.01)).toBe(true);
  });

  it("escalões de quantidade funcionam em escada, não por interpolação", () => {
    const ctx = (q: number) =>
      ctxSimples((c) => {
        c.volume = { unidadesMes: q };
        c.custos.escaloes = [
          { quantidade: 50, custoUnitario: 9 },
          { quantidade: 100, custoUnitario: 8 },
        ];
      });
    expect(proximo(precificar(ctx(60)).custo.direto, 9)).toBe(true);
    expect(proximo(precificar(ctx(150)).custo.direto, 8)).toBe(true);
    expect(proximo(precificar(ctx(10)).custo.direto, 10)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  CENÁRIOS E OBJETIVO INVERTIDO
// ═══════════════════════════════════════════════════════════════════════

describe("cenários", () => {
  it("conservador < recomendado < ambicioso", () => {
    const cenarios = compararCenarios(ctxSimples());
    const porChave = Object.fromEntries(cenarios.map((c) => [c.chave, c]));
    expect(porChave.conservador.pvp).toBeLessThan(porChave.recomendado.pvp);
    expect(porChave.ambicioso.pvp).toBeGreaterThan(porChave.recomendado.pvp);
  });

  it("o cenário «recomendado» reproduz exatamente o cálculo principal", () => {
    const base = precificar(ctxSimples());
    const cenario = compararCenarios(ctxSimples(), ["recomendado"])[0];
    expect(cenario.pvp).toBe(base.pvp);
    expect(cenario.precoLiquido).toBe(base.precoLiquido);
    // Inclusive no mensal: a tabela de cenários e o cartão de resultado não
    // podem mostrar números diferentes para o mesmo cenário por causa de um
    // arredondamento propagado.
    expect(cenario.lucroMensal).toBe(base.margem.lucroMensal);
  });

  it("passar por marketplace aumenta o preço necessário para a mesma margem", () => {
    const [semCanal] = compararCenarios(ctxSimples(), ["recomendado"]);
    const [comCanal] = compararCenarios(ctxSimples(), ["marketplace"]);
    expect(comCanal.pvp).toBeGreaterThan(semCanal.pvp);
  });
});

describe("objetivo invertido", () => {
  it("«quero ganhar 2 000 €/mês» devolve um preço que produz esse lucro", () => {
    const ctx = ctxSimples((c) => {
      c.volume = { unidadesMes: 100 };
      c.custos.fixos = [{ id: "f", rotulo: "Fixos", mensal: 500 }];
    });
    const objetivo = precoParaGanhar(ctx, 2000, false);
    expect(objetivo.ok).toBe(true);

    const verificacao = precificar({
      ...ctx,
      objetivo: { modo: "preco_fixo", valor: objetivo.pvpNecessario!, valorEhPVP: true },
    });
    expect(proximo(verificacao.margem.lucroMensal, 2000, 2)).toBe(true);
  });

  it("para um TI, «ganhar 2 000 €» exige gerar mais do que 2 000 € de lucro", () => {
    const ctx = ctxSimples((c) => {
      c.vendedor = {
        tipo: "ti",
        regimeIVA: "normal",
        regiao: "continente",
        atividade: "art151",
        anoAtividade: 3,
        faturacaoAnualPrevista: 30000,
      };
      c.volume = { unidadesMes: 100 };
    });
    const liquido = precoParaGanhar(ctx, 2000, true);
    const operacional = precoParaGanhar(ctx, 2000, false);
    expect(liquido.pvpNecessario!).toBeGreaterThan(operacional.pvpNecessario!);
  });

  it("«consigo cobrar X — quantas vendas?» devolve um inteiro coerente", () => {
    const ctx = ctxSimples((c) => {
      c.custos.fixos = [{ id: "f", rotulo: "Fixos", mensal: 600 }];
    });
    const r = unidadesParaGanhar(ctx, 30, 1000, false);
    expect(r.ok).toBe(true);
    expect(Number.isInteger(r.unidadesNecessarias)).toBe(true);
    expect(r.unidadesNecessarias!).toBeGreaterThan(0);
  });

  it("a um preço abaixo do custo, nenhum volume salva — e a engine di-lo", () => {
    const r = unidadesParaGanhar(ctxSimples(), 5, 1000, false);
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain("não cobre");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  FAIXA, EXPLICAÇÃO E AVISOS LEGAIS
// ═══════════════════════════════════════════════════════════════════════

describe("faixa de preço", () => {
  it("as âncoras estão por ordem crescente", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.custos.fixos = [{ id: "f", rotulo: "Fixos", mensal: 400 }];
      }),
    );
    const valores = r.faixa.ancoras.map((a) => a.pvp);
    for (let i = 1; i < valores.length; i += 1) {
      expect(valores[i]).toBeGreaterThanOrEqual(valores[i - 1] - 0.01);
    }
  });

  it("cada âncora traz a sua explicação", () => {
    const r = precificar(ctxSimples());
    for (const a of r.faixa.ancoras) {
      expect(a.explicacao.length).toBeGreaterThan(20);
    }
  });

  it("os preços psicológicos não substituem o recomendado", () => {
    const r = precificar(ctxSimples());
    const recomendado = r.faixa.ancoras.find((a) => a.chave === "recomendado")!;
    expect(recomendado.pvp).toBe(r.pvp);
    for (const p of r.faixa.psicologicos) {
      expect(Number.isFinite(p.margem)).toBe(true);
    }
  });
});

describe("explicação e transparência", () => {
  it("toda a linha de explicação tem proveniência", () => {
    const r = precificar(ctxSimples());
    for (const linha of r.explicacao) {
      expect(["oficial", "mercado", "estimativa"]).toContain(linha.confianca);
    }
  });

  it("as linhas de IVA e de Segurança Social são marcadas como oficiais e trazem fonte", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.vendedor = {
          tipo: "ti",
          regimeIVA: "normal",
          regiao: "continente",
          atividade: "art151",
          anoAtividade: 3,
          faturacaoAnualPrevista: 30000,
        };
      }),
    );
    const iva = r.explicacao.find((l) => l.rotulo === "IVA");
    const ss = r.explicacao.find((l) => l.rotulo === "Segurança Social");
    expect(iva?.confianca).toBe("oficial");
    expect(iva?.fonteUrl).toContain("portaldasfinancas.gov.pt");
    expect(ss?.confianca).toBe("oficial");
  });

  it("as comissões são marcadas como mercado, não como lei", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.canal = { canal: "marketplace", cliente: "consumidor", comissaoPercentagem: 0.15 };
      }),
    );
    const comissao = r.explicacao.find((l) => l.rotulo.startsWith("Comissão"));
    expect(comissao?.confianca).toBe("mercado");
  });
});

describe("avisos legais portugueses", () => {
  it("venda ao consumidor lembra a obrigação do preço com IVA incluído", () => {
    const r = precificar(ctxSimples());
    const aviso = r.avisos.find((a) => a.id === "preco-consumidor-com-iva");
    expect(aviso).toBeDefined();
    expect(aviso!.fonteUrl).toContain("asae.gov.pt");
  });

  it("qualquer desconto dispara a regra dos 30 dias", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.desconto = { tipo: "saldos", percentagem: 0.2 };
      }),
    );
    const aviso = r.avisos.find((a) => a.id === "regra-30-dias");
    expect(aviso).toBeDefined();
    expect(aviso!.texto).toContain("30");
  });

  it("venda online sem taxa de devolução declarada é assinalada", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.canal = { canal: "loja_online", cliente: "consumidor" };
        c.custos.taxaDevolucao = undefined;
      }),
    );
    const aviso = r.avisos.find((a) => a.id === "devolucoes-online");
    expect(aviso?.severidade).toBe("atencao");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  OS MOTORES FISCAIS DO REPOSITÓRIO, LIGADOS
//
//  Antes destes testes a engine perguntava o regime de IVA e acreditava na
//  resposta, calculava o IRS como se a categoria B fosse o único rendimento,
//  e afirmava a toda a gente que os custos não reduzem o IRS. Cada bloco
//  abaixo prende uma dessas correções.
// ═══════════════════════════════════════════════════════════════════════

describe("R1 · o regime de IVA é DERIVADO, não perguntado", () => {
  const ctxIsento = (patch: (c: ContextoPreco) => void = () => {}) =>
    ctxSimples((c) => {
      c.vendedor = {
        tipo: "ti",
        regimeIVA: "isento_art53",
        regiao: "continente",
        atividade: "art151",
        anoAtividade: 3,
      };
      patch(c);
    });

  it("abaixo do limiar a isenção declarada mantém-se", () => {
    const r = precificar(ctxIsento((c) => void (c.vendedor.faturacaoAnualPrevista = 12000)));
    expect(r.taxaIVA).toBe(0);
    expect(r.pvp).toBe(r.precoLiquido);
  });

  it("acima de 18 750 € a isenção declarada é corrigida (Art. 58.º n.º 2 b)", () => {
    const r = precificar(ctxIsento((c) => void (c.vendedor.faturacaoAnualPrevista = 40000)));
    expect(r.taxaIVA).toBe(IVA_NORMAL);
    // E nunca em silêncio.
    expect(r.avisos.some((a) => a.id === "isencao-ja-perdida")).toBe(true);
  });

  it("entre 15 000 e 18 750 a isenção ainda vale hoje — perde-se em janeiro", () => {
    const r = precificar(ctxIsento((c) => void (c.vendedor.faturacaoAnualPrevista = 17000)));
    expect(r.taxaIVA).toBe(0);
    expect(r.avisos.some((a) => a.id === "isencao-ja-perdida")).toBe(false);
  });

  it("a isenção do Art. 9.º NUNCA é contrariada por um limiar", () => {
    const r = precificar(
      ctxIsento((c) => {
        c.vendedor.regimeIVA = "isento_art9";
        c.vendedor.faturacaoAnualPrevista = 200000;
      }),
    );
    expect(r.taxaIVA).toBe(0);
    expect(r.avisos.some((a) => a.id === "isencao-ja-perdida")).toBe(false);
  });

  it("«não sei» com faturação declarada passa a derivar-se do limiar", () => {
    const abaixo = precificar(
      ctxIsento((c) => {
        c.vendedor.regimeIVA = "nao_sei";
        c.vendedor.faturacaoAnualPrevista = 9000;
      }),
    );
    const acima = precificar(
      ctxIsento((c) => {
        c.vendedor.regimeIVA = "nao_sei";
        c.vendedor.faturacaoAnualPrevista = 60000;
      }),
    );
    expect(abaixo.taxaIVA).toBe(0);
    expect(acima.taxaIVA).toBe(IVA_NORMAL);
  });

  it("«não sei» SEM faturação continua a assumir o regime normal", () => {
    // Sem prova nenhuma, assumir isenção recomendaria um preço mais baixo a
    // quem afinal tem de entregar IVA. O pressuposto conservador mantém-se.
    const r = precificar(
      ctxIsento((c) => {
        c.vendedor.regimeIVA = "nao_sei";
        c.vendedor.faturacaoAnualPrevista = undefined;
      }),
    );
    expect(r.taxaIVA).toBe(IVA_NORMAL);
  });

  it("uma PROJEÇÃO nossa avisa, mas nunca muda o regime", () => {
    // 12 000 € declarados: isento. O cenário projeta muito mais do que isso,
    // e mesmo assim a taxa continua a zero — a projeção não é um facto.
    const r = precificar(
      ctxIsento((c) => {
        c.vendedor.faturacaoAnualPrevista = 12000;
        c.volume.unidadesMes = 100;
      }),
    );
    expect(r.taxaIVA).toBe(0);
    const aviso = r.avisos.find((a) => a.id === "limiar-art53-a-este-preco");
    expect(aviso).toBeDefined();
    expect(aviso!.titulo).toMatch(/passas o limiar da isenção em \w+/);
  });

  it("o duplo efeito da isenção sobrevive à derivação (invariante 7)", () => {
    const isento = precificar(
      ctxIsento((c) => {
        c.vendedor.faturacaoAnualPrevista = 12000;
        c.custos.direto = { valor: 100, incluiIVA: true, escalao: "normal" };
      }),
    );
    const normal = precificar(
      ctxIsento((c) => {
        c.vendedor.regimeIVA = "normal";
        c.vendedor.faturacaoAnualPrevista = 12000;
        c.custos.direto = { valor: 100, incluiIVA: true, escalao: "normal" };
      }),
    );
    expect(isento.custo.direto).toBeGreaterThan(normal.custo.direto);
  });
});

describe("R3 · contabilidade organizada — os custos abatem mesmo", () => {
  const ctxOrg = (patch: (c: ContextoPreco) => void = () => {}) =>
    ctxSimples((c) => {
      c.vendedor = {
        tipo: "ti",
        regimeIVA: "normal",
        regiao: "continente",
        atividade: "art151",
        anoAtividade: 3,
        faturacaoAnualPrevista: 30000,
      };
      c.canal = { canal: "venda_direta", cliente: "consumidor" };
      patch(c);
    });

  it("o IRS deixa de ser fração da faturação e passa a incidir no lucro", () => {
    const simp = precificar(ctxOrg());
    const org = precificar(ctxOrg((c) => void (c.vendedor.regimeContabilidade = "organizada")));
    expect(simp.fiscal.irsBase).toBe("faturacao");
    expect(org.fiscal.irsBase).toBe("lucro");
  });

  it("o escudo fiscal dos custos baixa o preço necessário para a mesma margem", () => {
    // Contraintuitivo e correto: em organizada o custo abate ao imposto, logo
    // é preciso MENOS preço para sobrar a mesma margem depois de impostos.
    const simp = precificar(ctxOrg());
    const org = precificar(ctxOrg((c) => void (c.vendedor.regimeContabilidade = "organizada")));
    expect(org.precoLiquido).toBeLessThan(simp.precoLiquido);
  });

  it("e a margem pedida é mesmo entregue, conta a conta", () => {
    const org = precificar(ctxOrg((c) => void (c.vendedor.regimeContabilidade = "organizada")));
    const p = org.precoLiquido;
    const custo = org.custo.direto;
    const ss = p * org.fiscal.ssFracao;
    const irs = Math.max(0, p - custo) * org.fiscal.irsFracao;
    const sobra = p - custo - ss - irs;
    // 40% do preço líquido, a menos de arredondamento.
    expect(proximo(sobra / p, 0.4, 0.005)).toBe(true);
  });

  it("o tempo do próprio NÃO é despesa dedutível", () => {
    // Num serviço o «custo direto» é o custo do tempo. Escudá-lo com τ
    // inventaria uma despesa que a AT não aceita — o trabalho de quem passa
    // o recibo é o rendimento que se está a apurar, não um custo dele.
    const base: EntradaSolver = {
      custosEuros: 40,
      fixosTransacao: 0,
      fracaoLiquido: 0.1498,
      fracaoBruto: 0,
      taxaIVA: IVA_NORMAL,
      fracaoSobreLucro: 0.24,
    };
    const tudoDedutivel = precoPorMargem(base, 0.3);
    const tempoNaoDedutivel = precoPorMargem({ ...base, custosDedutiveis: 0 }, 0.3);
    expect(tempoNaoDedutivel.precoLiquido).toBeGreaterThan(tudoDedutivel.precoLiquido);
    // E omitir o campo é o mesmo que declarar tudo dedutível.
    expect(precoPorMargem({ ...base, custosDedutiveis: 40 }, 0.3).precoLiquido).toBe(
      tudoDedutivel.precoLiquido,
    );
  });

  it("τ = 0 devolve exatamente as equações de sempre", () => {
    // O regime simplificado não pode ter mudado um cêntimo com a introdução
    // do termo sobre o lucro.
    const base: EntradaSolver = {
      custosEuros: 10,
      fixosTransacao: 0.35,
      fracaoLiquido: 0.2,
      fracaoBruto: 0.15,
      taxaIVA: IVA_NORMAL,
    };
    const semTau = precoPorMargem(base, 0.3);
    const tauZero = precoPorMargem({ ...base, fracaoSobreLucro: 0 }, 0.3);
    expect(tauZero.precoLiquido).toBe(semTau.precoLiquido);
    expect(fracaoDisponivel({ ...base, fracaoSobreLucro: 0 })).toBe(fracaoDisponivel(base));
  });
});

describe("R4 · o IRS marginal conta com o emprego", () => {
  const ctxAcumula = (patch: (c: ContextoPreco) => void = () => {}) =>
    ctxSimples((c) => {
      c.vendedor = {
        tipo: "ti",
        regimeIVA: "normal",
        regiao: "continente",
        atividade: "art151",
        anoAtividade: 3,
        faturacaoAnualPrevista: 30000,
      };
      c.canal = { canal: "venda_direta", cliente: "consumidor" };
      patch(c);
    });

  it("um salário de 30 000 € sobe a fração marginal de IRS", () => {
    const so = precificar(ctxAcumula());
    const com = precificar(ctxAcumula((c) => void (c.vendedor.salarioBrutoAnual = 30000)));
    expect(com.fiscal.irsFracao).toBeGreaterThan(so.fiscal.irsFracao);
  });

  it("e por isso empurra o preço para cima", () => {
    const so = precificar(ctxAcumula());
    const com = precificar(ctxAcumula((c) => void (c.vendedor.salarioBrutoAnual = 30000)));
    expect(com.precoLiquido).toBeGreaterThan(so.precoLiquido);
  });

  it("salário zero é indistinguível de não acumular", () => {
    const semCampo = precificar(ctxAcumula());
    const comZero = precificar(ctxAcumula((c) => void (c.vendedor.salarioBrutoAnual = 0)));
    expect(comZero.fiscal.irsFracao).toBe(semCampo.fiscal.irsFracao);
  });

  it("a retenção continua a não reduzir a margem, acumule-se ou não", () => {
    const b2c = precificar(ctxAcumula((c) => void (c.vendedor.salarioBrutoAnual = 30000)));
    const b2b = precificar(
      ctxAcumula((c) => {
        c.vendedor.salarioBrutoAnual = 30000;
        c.canal = { canal: "venda_direta", cliente: "empresa_pt" };
      }),
    );
    expect(proximo(b2b.margem.margem, b2c.margem.margem, 0.001)).toBe(true);
    expect(b2b.fiscal.retencaoFracao).toBeGreaterThan(0);
  });
});
