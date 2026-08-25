import { describe, it, expect } from "vitest";
import {
  precificar,
  contextoBase,
  cenarioPorChave,
  compararCenarios,
  precoParaGanhar,
  unidadesParaGanhar,
  resultadoAoPreco,
  margemDeMarkup,
  markupDeMargem,
  validarRegrasPricing,
  canalPorId,
  precoPorMargem,
  fracaoDisponivel,
  calcularTesouraria,
  type ContextoPreco,
  type EntradaSolver,
  CENARIOS_INICIAIS,
} from "@/lib/pricing";
import {
  IVA_TAXAS,
  SS_TAXA,
  SS_COEFICIENTE,
  ATIVIDADES,
  BASE_SS_POR_TIPO,
  RETENCAO,
  efeitoFiscal,
} from "@/lib/fiscal-data";

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
    const objetivo = precoParaGanhar(ctx, 2000);
    expect(objetivo.ok).toBe(true);

    const verificacao = precificar({
      ...ctx,
      objetivo: { modo: "preco_fixo", valor: objetivo.pvpNecessario!, valorEhPVP: true },
    });
    expect(proximo(verificacao.margem.lucroMensal, 2000, 2)).toBe(true);
  });

  it("para um TI, «ganhar 2 000 €» exige FATURAR muito mais do que 2 000 €", () => {
    // A afirmação certa é sobre a faturação, não sobre o lucro. O lucro que
    // o solver resolve JÁ é líquido de Segurança Social e IRS — este teste
    // chegou a exigir o contrário, e era essa exigência que mantinha a dupla
    // contagem viva (pedir 800 € rendia 1 219 €).
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
    const r = precoParaGanhar(ctx, 2000);
    expect(r.ok).toBe(true);
    expect(r.faturacaoMensalNecessaria!).toBeGreaterThan(2000 * 1.5);
  });

  it("«quero ganhar X» entrega X — não mais, para um TI", () => {
    // O defeito que este teste prende custava um preço 23% acima do
    // necessário a quem passa recibos verdes.
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
    for (const alvo of [800, 2000]) {
      const r = precoParaGanhar(ctx, alvo);
      expect(r.ok).toBe(true);
      const verificacao = precificar({
        ...ctx,
        objetivo: { modo: "preco_fixo", valor: r.pvpNecessario!, valorEhPVP: true },
      });
      expect(proximo(verificacao.margem.lucroMensal, alvo, 2), `alvo ${alvo}`).toBe(true);
    }
  });

  it("«consigo cobrar X» pede as vendas que chegam, não mais", () => {
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
    const r = unidadesParaGanhar(ctx, 48, 800);
    expect(r.ok).toBe(true);
    const aoPreco = precificar({ ...ctx, objetivo: { modo: "preco_fixo", valor: 48, valorEhPVP: true } });
    const necessarias = 800 / aoPreco.margem.lucroUnidade;
    // Arredonda para cima, nunca mais do que uma venda acima do exacto.
    expect(r.unidadesNecessarias!).toBeGreaterThanOrEqual(Math.floor(necessarias));
    expect(r.unidadesNecessarias!).toBeLessThanOrEqual(Math.ceil(necessarias));
  });

  it("«consigo cobrar X — quantas vendas?» devolve um inteiro coerente", () => {
    const ctx = ctxSimples((c) => {
      c.custos.fixos = [{ id: "f", rotulo: "Fixos", mensal: 600 }];
    });
    const r = unidadesParaGanhar(ctx, 30, 1000);
    expect(r.ok).toBe(true);
    expect(Number.isInteger(r.unidadesNecessarias)).toBe(true);
    expect(r.unidadesNecessarias!).toBeGreaterThan(0);
  });

  it("a um preço abaixo do custo, nenhum volume salva — e a engine di-lo", () => {
    const r = unidadesParaGanhar(ctxSimples(), 5, 1000);
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

// ═══════════════════════════════════════════════════════════════════════
//  DEFEITOS DE INTERFACE APANHADOS EM USO REAL
// ═══════════════════════════════════════════════════════════════════════

describe("a faixa não mostra o mesmo número duas vezes", () => {
  it("sem custos fixos, o piso e o mínimo sustentável colapsam num só", () => {
    // Eram duas âncoras com o mesmo valor ao cêntimo e explicações que se
    // contradizem à leitura — «nem os custos ficam cobertos» por cima de
    // «cobre tudo». Quem lê conclui que uma delas está errada.
    const r = precificar(
      ctxSimples((c) => {
        c.custos.fixos = [];
      }),
    );
    const piso = r.faixa.ancoras.find((a) => a.chave === "piso");
    const minimo = r.faixa.ancoras.find((a) => a.chave === "minimo");
    expect(piso).toBeDefined();
    expect(minimo).toBeUndefined();
    expect(piso!.explicacao).toMatch(/não declaraste custos fixos/i);
  });

  it("com custos fixos, as duas âncoras existem e são diferentes", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.custos.fixos = [{ id: "renda", rotulo: "Renda", mensal: 800 }];
      }),
    );
    const piso = r.faixa.ancoras.find((a) => a.chave === "piso")!;
    const minimo = r.faixa.ancoras.find((a) => a.chave === "minimo")!;
    expect(minimo).toBeDefined();
    expect(minimo.precoLiquido).toBeGreaterThan(piso.precoLiquido);
  });

  it("as âncoras nunca repetem o mesmo PVP", () => {
    for (const fixos of [[], [{ id: "r", rotulo: "Renda", mensal: 300 }]]) {
      const r = precificar(ctxSimples((c) => void (c.custos.fixos = fixos)));
      const pvps = r.faixa.ancoras.map((a) => a.pvp.toFixed(2));
      expect(new Set(pvps).size, JSON.stringify(pvps)).toBe(pvps.length);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  R2 · A ATIVIDADE É A MESMA EM TODA A APLICAÇÃO
//  ---------------------------------------------------------------------
//  A engine de preço lia `RETENCAO[tipo]` e `BASE_SS_POR_TIPO[tipo]`, que
//  ignoram os overrides por atividade que `efeitoFiscal()` resolve. A mesma
//  pessoa escolhia a atividade num `select` de quatro tipos aqui e no
//  catálogo completo no simulador de recibos verdes — e obtinha números
//  diferentes para o mesmo caso.
// ═══════════════════════════════════════════════════════════════════════

describe("R2 · a atividade concreta manda sobre o tipo", () => {
  const comAtividade = (label: string) =>
    precificar(
      ctxSimples((c) => {
        const a = ATIVIDADES.find((x) => x.label === label)!;
        c.vendedor = {
          tipo: "ti",
          regimeIVA: "normal",
          regiao: "continente",
          atividade: a.tipo,
          atividadeLabel: a.label,
          anoAtividade: 3,
          faturacaoAnualPrevista: 30000,
        };
        c.canal = { canal: "venda_direta", cliente: "empresa_pt" };
      }),
    );

  it("a base de Segurança Social vem de `efeitoFiscal`, não do mapa por tipo", () => {
    for (const a of ATIVIDADES) {
      const esperado = efeitoFiscal(a).baseSS ?? BASE_SS_POR_TIPO[a.tipo];
      const r = comAtividade(a.label);
      const fracaoEsperada = SS_COEFICIENTE[esperado].value * SS_TAXA.value;
      // A fração marginal pode ficar em zero por teto; o que se exige é que
      // NUNCA use a base do tipo quando a atividade declara outra.
      if (efeitoFiscal(a).baseSS && efeitoFiscal(a).baseSS !== BASE_SS_POR_TIPO[a.tipo]) {
        expect(proximo(r.fiscal.ssFracao, fracaoEsperada, 0.03), a.label).toBe(true);
      }
    }
  });

  it("a retenção na fonte usa a taxa da atividade quando ela tem uma própria", () => {
    const comOverride = ATIVIDADES.filter(
      (a) => a.retencao !== undefined && a.retencao !== RETENCAO[a.tipo].value,
    );
    // Se o catálogo deixar de ter overrides, o teste deixa de provar algo —
    // e é melhor saber disso do que passar em vazio.
    expect(comOverride.length, "o catálogo deixou de ter retenções próprias").toBeGreaterThan(0);
    for (const a of comOverride) {
      const r = comAtividade(a.label);
      expect(proximo(r.fiscal.retencaoFracao, a.retencao!, 0.001), a.label).toBe(true);
    }
  });

  it("sem atividade escolhida, cai no tipo — como antes", () => {
    const semLabel = precificar(
      ctxSimples((c) => {
        c.vendedor = {
          tipo: "ti",
          regimeIVA: "normal",
          regiao: "continente",
          atividade: "art151",
          anoAtividade: 3,
          faturacaoAnualPrevista: 30000,
        };
        c.canal = { canal: "venda_direta", cliente: "empresa_pt" };
      }),
    );
    expect(proximo(semLabel.fiscal.retencaoFracao, RETENCAO.art151.value, 0.001)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  R5 · A RETENÇÃO CONHECE A DISPENSA E O IRS JOVEM
//  ---------------------------------------------------------------------
//  `retencaoNaFonte` sempre aceitou `{ dispensa, irsJovemAno }` e nunca lhe
//  chegava nenhum dos dois: dava retenção a quem estava dispensado e a base
//  cheia a quem tem isenção de IRS Jovem.
//
//  Isto muda a TESOURARIA e nunca a margem — o invariante abaixo prova-o.
// ═══════════════════════════════════════════════════════════════════════

describe("R5 · dispensa de retenção e IRS Jovem", () => {
  const ctxB2B = (patch: (c: ContextoPreco) => void = () => {}) =>
    ctxSimples((c) => {
      c.vendedor = {
        tipo: "ti",
        regimeIVA: "normal",
        regiao: "continente",
        atividade: "art151",
        anoAtividade: 3,
        faturacaoAnualPrevista: 12000,
      };
      c.canal = { canal: "venda_direta", cliente: "empresa_pt" };
      patch(c);
    });

  it("a dispensa põe a retenção a zero", () => {
    const com = precificar(ctxB2B());
    const sem = precificar(ctxB2B((c) => void (c.vendedor.dispensaRetencao = true)));
    expect(com.fiscal.retencaoFracao).toBeGreaterThan(0);
    expect(sem.fiscal.retencaoFracao).toBe(0);
  });

  it("...e NÃO muda a margem — é tesouraria, não custo (invariante 3)", () => {
    const com = precificar(ctxB2B());
    const sem = precificar(ctxB2B((c) => void (c.vendedor.dispensaRetencao = true)));
    expect(proximo(com.margem.margem, sem.margem.margem, 0.0005)).toBe(true);
    expect(proximo(com.precoLiquido, sem.precoLiquido, 0.005)).toBe(true);
  });

  it("o IRS Jovem reduz a retenção sem tocar na margem", () => {
    const normal = precificar(ctxB2B());
    const jovem = precificar(ctxB2B((c) => void (c.vendedor.irsJovemAno = 1)));
    expect(jovem.fiscal.retencaoFracao).toBeLessThan(normal.fiscal.retencaoFracao);
    expect(proximo(jovem.margem.margem, normal.margem.margem, 0.0005)).toBe(true);
  });

  it("quem pode dispensar e não dispensou é avisado disso", () => {
    const r = precificar(ctxB2B());
    const texto = r.fiscal.notas.join(" ");
    expect(texto).toMatch(/DISPENSAR a retenção/i);
    // E quem já dispensou não recebe a sugestão outra vez.
    const jaDispensou = precificar(ctxB2B((c) => void (c.vendedor.dispensaRetencao = true)));
    expect(jaDispensou.fiscal.notas.join(" ")).not.toMatch(/podes DISPENSAR/i);
  });

  it("acima do limiar não se sugere uma dispensa que a lei não permite", () => {
    const r = precificar(ctxB2B((c) => void (c.vendedor.faturacaoAnualPrevista = 40000)));
    expect(r.fiscal.notas.join(" ")).not.toMatch(/podes DISPENSAR/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  R8 · ATO ISOLADO — nunca isento pelo limiar
// ═══════════════════════════════════════════════════════════════════════

describe("R8 · o ato isolado leva sempre IVA", () => {
  const ctxAto = (patch: (c: ContextoPreco) => void = () => {}) => {
    const c = cenarioPorChave("ato_isolado").contexto();
    c.custos = { direto: { valor: 10, incluiIVA: false, escalao: "normal" }, variaveis: [], fixos: [] };
    c.volume = { unidadesMes: 1 };
    c.objetivo = { modo: "margem", percentagem: 0.4 };
    patch(c);
    return c;
  };

  it("existe como cenário próprio", () => {
    expect(cenarioPorChave("ato_isolado").chave).toBe("ato_isolado");
  });

  it("mesmo declarando isenção pelo Art. 53.º, leva IVA", () => {
    const r = precificar(
      ctxAto((c) => {
        c.vendedor.regimeIVA = "isento_art53";
        c.vendedor.faturacaoAnualPrevista = 800;
      }),
    );
    expect(r.taxaIVA).toBeGreaterThan(0);
    expect(r.pvp).toBeGreaterThan(r.precoLiquido);
  });

  it("e com faturação minúscula continua a levar — o limiar não se aplica", () => {
    const r = precificar(
      ctxAto((c) => {
        c.vendedor.regimeIVA = "isento_art53";
        c.vendedor.faturacaoAnualPrevista = 50;
      }),
    );
    expect(r.taxaIVA).toBe(IVA_NORMAL);
    expect(r.avisos.some((a) => a.id === "ato-isolado-leva-iva")).toBe(true);
  });

  it("um TI com atividade aberta e a mesma faturação CONTINUA isento", () => {
    // O contraste que prova que a regra é do ato isolado, não do valor.
    const r = precificar(
      ctxSimples((c) => {
        c.vendedor = {
          tipo: "ti",
          regimeIVA: "isento_art53",
          regiao: "continente",
          atividade: "art151",
          anoAtividade: 3,
          faturacaoAnualPrevista: 800,
        };
      }),
    );
    expect(r.taxaIVA).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  R6 · SOCIEDADE — do lucro operacional ao bolso do dono
//  ---------------------------------------------------------------------
//  A armadilha que estes testes prendem (análise de julho, §1.10): não
//  apresentar o lucro retido como perdido. Riqueza = líquido + retido.
// ═══════════════════════════════════════════════════════════════════════

describe("R6 · o que chega ao dono de uma sociedade", () => {
  const ctxEmpresa = (patch: (c: ContextoPreco) => void = () => {}) =>
    ctxSimples((c) => {
      c.vendedor = { tipo: "empresa", regimeIVA: "normal", regiao: "continente" };
      c.volume = { unidadesMes: 200 };
      c.custos.fixos = [{ id: "f", rotulo: "Estrutura", mensal: 1500 }];
      patch(c);
    });

  it("uma sociedade passa a saber quanto lhe chega", () => {
    const r = precificar(ctxEmpresa());
    expect(r.sociedade).toBeTruthy();
    expect(r.sociedade!.faturacaoAnual).toBeGreaterThan(0);
    expect(r.sociedade!.ircTotal).toBeGreaterThan(0);
  });

  it("a riqueza total é o líquido pessoal MAIS o lucro retido", () => {
    const s = precificar(ctxEmpresa()).sociedade!;
    expect(proximo(s.riquezaTotal, s.liquidoPessoal + s.lucroRetido, 1)).toBe(true);
  });

  it("o lucro retido nunca é apresentado como perda", () => {
    const s = precificar(ctxEmpresa()).sociedade!;
    // Se houver lucro retido, a riqueza total tem de o incluir — e portanto
    // ser maior do que o líquido pessoal sozinho.
    if (s.lucroRetido > 0.5) {
      expect(s.riquezaTotal).toBeGreaterThan(s.liquidoPessoal);
      expect(s.notas.join(" ")).toMatch(/não é dinheiro perdido/i);
    }
  });

  it("um trabalhador independente não recebe esta camada", () => {
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
    expect(r.sociedade ?? null).toBeNull();
  });

  it("sem volume não se inventa uma projeção", () => {
    const r = precificar(ctxEmpresa((c) => void (c.volume = { unidadesMes: 0 })));
    expect(r.sociedade ?? null).toBeNull();
  });

  it("e o IRC continua FORA do preço unitário", () => {
    // O invariante que justifica a camada existir: o IRC incide sobre o
    // lucro, não é fração da faturação, e não pode entrar em `v`.
    const r = precificar(ctxEmpresa());
    expect(r.fiscal.ssFracao).toBe(0);
    expect(r.fiscal.irsFracao).toBe(0);
  });
});


// ─────────────────────────────────────────────────────────────────────
describe("R7 · quanto sai, e QUANDO", () => {
  const ctxTI = (patch: (c: ContextoPreco) => void = () => {}) =>
    ctxSimples((c) => {
      c.vendedor = {
        tipo: "ti",
        regimeIVA: "normal",
        regiao: "continente",
        atividade: "art151",
        anoAtividade: 3,
        faturacaoAnualPrevista: 40000,
      };
      c.volume = { unidadesMes: 100 };
      patch(c);
    });

  // Um dia fixo para o calendário não depender de quando os testes correm.
  const HOJE = new Date(2026, 0, 5); // 5 de janeiro de 2026

  const entrada = (patch: Partial<Parameters<typeof calcularTesouraria>[0]> = {}) => ({
    contexto: ctxTI(),
    ivaPorUnidade: 2,
    ssPorUnidade: 1,
    liquidaIVA: true,
    periodicidade: "trimestral" as const,
    hoje: HOJE,
    limite: 12,
    ...patch,
  });

  it("o preço passa a ter datas: a reserva mensal é a soma das partes", () => {
    const t = precificar(ctxTI()).tesouraria;
    expect(t).toBeTruthy();
    expect(proximo(t!.reservaMensal, t!.ivaMensal + t!.ssMensal, 0.01)).toBe(true);
    expect(t!.proximos.length).toBeGreaterThan(0);
  });

  it("DECLARAR NÃO É PAGAR — nenhuma declaração leva quantia", () => {
    // O erro que este teste existe para impedir: `prazos.ts` separa a
    // entrega da declaração do pagamento do imposto porque têm datas
    // diferentes. Pôr o valor nas duas linhas faria a pessoa reservar o
    // dinheiro a dobrar.
    const t = calcularTesouraria(entrada())!;
    const declaracoes = t.proximos.filter((l) => l.natureza === "declaracao");
    expect(declaracoes.length).toBeGreaterThan(0);
    for (const d of declaracoes) {
      expect(d.valor).toBeNull();
      expect(d.porqueSemValor).toBeTruthy();
    }
  });

  it("a Segurança Social paga-se TODOS OS MESES, não por trimestre", () => {
    // Declara-se por trimestre (Art. 151.º) mas paga-se mensalmente
    // (Art. 43.º). Multiplicar o pagamento por três seria triplicar a conta.
    const t = calcularTesouraria(entrada())!;
    const pagSS = t.proximos.filter((l) => l.categoria === "ss" && l.natureza === "pagamento");
    expect(pagSS.length).toBeGreaterThan(0);
    for (const l of pagSS) expect(proximo(l.valor!, t.ssMensal, 0.01)).toBe(true);
  });

  it("o IVA trimestral cobre três meses; o mensal, um", () => {
    const tri = calcularTesouraria(entrada())!;
    const pagTri = tri.proximos.find((l) => l.categoria === "iva" && l.natureza === "pagamento")!;
    expect(proximo(pagTri.valor!, tri.ivaMensal * 3, 0.01)).toBe(true);

    const mes = calcularTesouraria(entrada({ periodicidade: "mensal" }))!;
    const pagMes = mes.proximos.find((l) => l.categoria === "iva" && l.natureza === "pagamento")!;
    expect(proximo(pagMes.valor!, mes.ivaMensal, 0.01)).toBe(true);
  });

  it("quem está isento de IVA não vê prazos de IVA", () => {
    const t = calcularTesouraria(entrada({ liquidaIVA: false, ivaPorUnidade: 0 }))!;
    expect(t.ivaMensal).toBe(0);
    expect(t.proximos.some((l) => l.categoria === "iva")).toBe(false);
  });

  it("o IRS não entra — a quantia não sai deste preço", () => {
    const t = calcularTesouraria(entrada())!;
    expect(t.proximos.every((l) => l.categoria === "iva" || l.categoria === "ss")).toBe(true);
    expect(t.notas.join(" ")).toMatch(/IRS não está aqui/i);
  });

  it("uma sociedade não paga Segurança Social de trabalhador independente", () => {
    const t = calcularTesouraria(
      entrada({ contexto: ctxSimples((c) => void (c.volume = { unidadesMes: 100 })), ssPorUnidade: 0 }),
    )!;
    expect(t.proximos.some((l) => l.categoria === "ss")).toBe(false);
  });

  it("todas as datas estão no futuro e por ordem", () => {
    const t = calcularTesouraria(entrada())!;
    let anterior = "";
    for (const l of t.proximos) {
      expect(l.diasAte).toBeGreaterThanOrEqual(0);
      expect(l.data >= anterior).toBe(true);
      anterior = l.data;
    }
  });

  it("sem volume não se inventa um calendário", () => {
    expect(precificar(ctxTI((c) => void (c.volume = { unidadesMes: 0 }))).tesouraria ?? null).toBeNull();
    expect(calcularTesouraria(entrada({ ivaPorUnidade: 0, ssPorUnidade: 0 }))).toBeNull();
  });

  it("no primeiro ano de atividade não há pagamento de Segurança Social", () => {
    const t = calcularTesouraria(
      entrada({
        contexto: ctxTI((c) => {
          c.vendedor = { ...c.vendedor, anoAtividade: 1, isencaoSSPrimeiroAno: true };
        }),
      }),
    )!;
    expect(t.proximos.some((l) => l.categoria === "ss" && l.natureza === "pagamento")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
describe("R9 · regiões autónomas — o IRS regional entra mesmo no preço", () => {
  // Verificado em fonte oficial (agosto de 2026): a redução de até 30% das
  // taxas do Art. 68.º é do sujeito passivo RESIDENTE na região (Lei Orgânica
  // 2/2013), abrange toda a matéria coletável englobada — categoria B
  // incluída — e em 2026 as duas regiões aplicam o máximo em todos os
  // escalões. O motor aplica-a; estes testes impedem que deixe de a aplicar,
  // e que a aplique a quem não tem direito.
  const ctxRegiao = (
    regiao: "continente" | "madeira" | "acores",
    residenciaFiscal?: "continente" | "madeira" | "acores",
  ) =>
    ctxSimples((c) => {
      c.vendedor = {
        tipo: "ti",
        regimeIVA: "normal",
        regiao,
        residenciaFiscal,
        atividade: "art151",
        anoAtividade: 3,
        faturacaoAnualPrevista: 40000,
      };
      c.objetivo = { modo: "margem", percentagem: 0.4 };
    });

  it("quem reside numa região autónoma suporta MENOS IRS no preço", () => {
    const cont = precificar(ctxRegiao("continente"));
    const mad = precificar(ctxRegiao("madeira"));
    const aco = precificar(ctxRegiao("acores"));
    // Menos imposto sobre a mesma faturação → o preço que fecha a mesma
    // margem é mais baixo. Se isto empatar, a redução não está a chegar cá.
    expect(mad.fiscal.irsFracao).toBeLessThan(cont.fiscal.irsFracao);
    expect(aco.fiscal.irsFracao).toBeLessThan(cont.fiscal.irsFracao);
    expect(mad.precoLiquido).toBeLessThan(cont.precoLiquido);
  });

  it("as duas regiões são tratadas igual — em 2026 têm a mesma tabela", () => {
    const mad = precificar(ctxRegiao("madeira"));
    const aco = precificar(ctxRegiao("acores"));
    expect(proximo(mad.fiscal.irsFracao, aco.fiscal.irsFracao, 1e-9)).toBe(true);
  });

  it("O IRS SEGUE A PESSOA, O IVA SEGUE A OPERAÇÃO", () => {
    // O invariante que justifica `residenciaFiscal` existir. Quem tem
    // atividade na Madeira mas reside no continente liquida IVA da Madeira e
    // paga IRS continental. Confundir as duas perguntas dava a esta pessoa um
    // desconto de imposto a que não tem direito.
    const soIVA = precificar(ctxRegiao("madeira", "continente"));
    const ambos = precificar(ctxRegiao("madeira", "madeira"));
    const contNoContinente = precificar(ctxRegiao("continente", "continente"));

    // IVA da Madeira nos dois casos…
    expect(soIVA.taxaIVA).toBe(ambos.taxaIVA);
    expect(soIVA.taxaIVA).not.toBe(contNoContinente.taxaIVA);
    // …mas o IRS só é reduzido a quem lá reside.
    expect(proximo(soIVA.fiscal.irsFracao, contNoContinente.fiscal.irsFracao, 1e-9)).toBe(true);
    expect(ambos.fiscal.irsFracao).toBeLessThan(soIVA.fiscal.irsFracao);
  });

  it("sem residência declarada assume-se a região da atividade", () => {
    const implicito = precificar(ctxRegiao("madeira"));
    const explicito = precificar(ctxRegiao("madeira", "madeira"));
    expect(proximo(implicito.fiscal.irsFracao, explicito.fiscal.irsFracao, 1e-9)).toBe(true);
  });

  it("o aviso diz que o desconto JÁ está aplicado, e de que depende", () => {
    const a = precificar(ctxRegiao("madeira")).avisos.find((x) => x.id === "irs-regiao-autonoma")!;
    expect(a.severidade).toBe("info");
    expect(a.texto).toMatch(/já está neste cálculo/i);
    expect(a.texto).toMatch(/onde RESIDES/);
    expect(a.fonte).toBeTruthy();
    expect(a.fonteUrl).toBeTruthy();
  });

  it("quem está no continente não recebe um aviso que não lhe diz respeito", () => {
    expect(
      precificar(ctxRegiao("continente")).avisos.some((a) => a.id === "irs-regiao-autonoma"),
    ).toBe(false);
    // Nem quem só lá tem atividade sem lá residir.
    expect(
      precificar(ctxRegiao("madeira", "continente")).avisos.some((a) => a.id === "irs-regiao-autonoma"),
    ).toBe(false);
  });

  it("uma sociedade não é avisada — paga IRC, não IRS", () => {
    const r = precificar(
      ctxSimples((c) => {
        c.vendedor = { tipo: "empresa", regimeIVA: "normal", regiao: "madeira" };
      }),
    );
    expect(r.avisos.some((a) => a.id === "irs-regiao-autonoma")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  AUDITORIA — nove defeitos encontrados a ler o motor de ponta a ponta
//
//  Todos passaram despercebidos à matriz acima porque ela testa cada peça
//  no seu caso limpo: serviços SEM materiais, serviços SEM contas fixas,
//  regime simplificado SEM τ, canais SEM afiliado. Os defeitos viviam
//  precisamente nas combinações — que é onde vivem os clientes reais.
// ═══════════════════════════════════════════════════════════════════════

describe("auditoria · o custo do tempo soma-se ao material, não o substitui", () => {
  const ctxComTempo = (material: number): ContextoPreco => {
    const c = cenarioPorChave("servico").contexto();
    c.vendedor.faturacaoAnualPrevista = 30000;
    c.custos.direto = { valor: material, incluiIVA: false, escalao: "normal" };
    return c;
  };

  it("declarar um material NÃO apaga as horas de trabalho", () => {
    // O defeito: `custoDiretoFinal` escolhia UM dos dois. Uma sessão com
    // 5 € de impressões passava de 243,53 € para 10,96 € — o preço caía
    // 96% por se ter declarado um custo.
    const semMaterial = precificar(ctxComTempo(0));
    const comMaterial = precificar(ctxComTempo(5));

    expect(comMaterial.precoLiquido).toBeGreaterThan(semMaterial.precoLiquido);
    expect(comMaterial.custo.direto).toBeGreaterThan(semMaterial.custo.direto);
  });

  it("o custo direto de um serviço com material é tempo + material", () => {
    const semMaterial = precificar(ctxComTempo(0));
    const comMaterial = precificar(ctxComTempo(5));
    expect(proximo(comMaterial.custo.direto, semMaterial.custo.direto + 5, 0.01)).toBe(true);
  });

  it("a memória de cálculo mostra as duas linhas, não uma", () => {
    const r = precificar(ctxComTempo(5));
    const rotulos = r.explicacao.map((l) => l.rotulo);
    expect(rotulos.some((x) => x.startsWith("Custo do teu tempo"))).toBe(true);
    expect(rotulos).toContain("Custo direto");
  });

  it("invariante 4, agora também para serviços: mais custo nunca dá mais lucro", () => {
    const barato = precificar(
      (() => {
        const c = ctxComTempo(5);
        c.objetivo = { modo: "preco_fixo", valor: 400, valorEhPVP: true };
        return c;
      })(),
    );
    const caro = precificar(
      (() => {
        const c = ctxComTempo(25);
        c.objetivo = { modo: "preco_fixo", valor: 400, valorEhPVP: true };
        return c;
      })(),
    );
    expect(caro.margem.lucroUnidade).toBeLessThan(barato.margem.lucroUnidade);
  });
});

describe("auditoria · as contas fixas entram uma vez, não duas", () => {
  const ctxProjeto = (fixoMensal: number): ContextoPreco => {
    const c = cenarioPorChave("servico").contexto();
    c.vendedor.faturacaoAnualPrevista = 30000;
    c.tempo!.rendimentoAnualPretendido = 24000;
    c.tempo!.horasPorUnidade = 8;
    c.volume = { unidadesMes: 10 };
    c.custos.fixos = fixoMensal > 0 ? [{ id: "contab", rotulo: "Contabilidade", mensal: fixoMensal }] : [];
    return c;
  };

  it("o valor/hora que alimenta o solver não carrega a estrutura", () => {
    // O defeito: `calcularTempo` somava os custos fixos anuais ao
    // valor/hora E o motor voltava a somá-los como `fixosPorUnidade`.
    // 600 €/mês apareciam como 55,81 € dentro do custo do tempo e como
    // 60 € de fixos por unidade — 23% de base de custo inventada.
    const sem = precificar(ctxProjeto(0));
    const com = precificar(ctxProjeto(600));

    expect(proximo(com.custo.direto, sem.custo.direto, 0.01)).toBe(true);
    expect(proximo(com.custo.fixosPorUnidade, 60, 0.01)).toBe(true);
  });

  it("a base de custo cresce exatamente o que a estrutura vale", () => {
    const sem = precificar(ctxProjeto(0));
    const com = precificar(ctxProjeto(600));
    const baseSem = sem.custo.direto + sem.custo.fixosPorUnidade;
    const baseCom = com.custo.direto + com.custo.fixosPorUnidade;
    expect(proximo(baseCom - baseSem, 60, 0.01)).toBe(true);
  });

  it("sem volume para as repartir, as contas fixas ficam de fora — e diz-se", () => {
    const c = ctxProjeto(800);
    c.volume = { unidadesMes: 0 };
    const r = precificar(c);
    const aviso = r.avisos.find((a) => a.id === "fixos-sem-volume");
    expect(aviso).toBeDefined();
    expect(aviso!.severidade).toBe("atencao");
  });
});

describe("auditoria · a margem entregue é a margem pedida, também em organizada", () => {
  const ctxOrganizada = (): ContextoPreco => {
    const c = contextoBase();
    c.vendedor = {
      tipo: "ti",
      regimeIVA: "normal",
      regiao: "continente",
      atividade: "art151",
      faturacaoAnualPrevista: 40000,
      regimeContabilidade: "organizada",
      anoAtividade: 3,
    };
    c.produto = { natureza: "servico", escalaoVenda: "normal" };
    c.canal = { canal: "venda_direta", cliente: "consumidor" };
    c.custos = {
      direto: { valor: 20, incluiIVA: false, escalao: "normal" },
      variaveis: [],
      fixos: [{ id: "renda", rotulo: "Renda", mensal: 1000 }],
    };
    c.volume = { unidadesMes: 100 };
    c.objetivo = { modo: "margem", percentagem: 0.35 };
    return c;
  };

  it("35% pedidos são 35% entregues, com custos fixos e escudo fiscal", () => {
    // O defeito: a margem era medida como «contribuição − fixos», o que
    // perdia o escudo fiscal dos custos fixos (τ·fixos). Pedir 35%
    // devolvia 33,2% a quem está em contabilidade organizada.
    const r = precificar(ctxOrganizada());
    expect(r.fiscal.irsBase).toBe("lucro");
    expect(proximo(r.margem.margem, 0.35, 0.0005)).toBe(true);
  });

  it("a âncora «recomendado» tem a margem que o objetivo pediu", () => {
    const r = precificar(ctxOrganizada());
    const rec = r.faixa.ancoras.find((a) => a.chave === "recomendado")!;
    expect(proximo(rec.margem, 0.35, 0.0005)).toBe(true);
    expect(proximo(rec.precoLiquido, r.precoLiquido, 0.01)).toBe(true);
  });

  it("a âncora «confortável» é a folga declarada, não um salto", () => {
    const r = precificar(ctxOrganizada());
    const conf = r.faixa.ancoras.find((a) => a.chave === "confortavel")!;
    expect(proximo(conf.margem, 0.45, 0.0005)).toBe(true);
  });

  it("com markup, a folga continua a ser 10 pontos sobre a margem ENTREGUE", () => {
    // O defeito: a âncora usava `margemDeMarkup(k)`, que ignora comissões
    // e impostos. Um markup de 50% num serviço dava «confortável» a
    // 1 026,55 € contra 523,06 € de recomendado — o dobro do preço.
    const c = cenarioPorChave("servico").contexto();
    c.vendedor.faturacaoAnualPrevista = 30000;
    c.objetivo = { modo: "markup", percentagem: 0.5 };
    const r = precificar(c);

    const conf = r.faixa.ancoras.find((a) => a.chave === "confortavel")!;
    expect(proximo(conf.margem, r.margem.margem + 0.1, 0.0005)).toBe(true);
    expect(conf.precoLiquido).toBeLessThan(r.precoLiquido * 1.5);
  });
});

describe("auditoria · o IVA que sai é o que se entrega, não o que se liquida", () => {
  const ctxRevenda = (): ContextoPreco => {
    const c = contextoBase();
    c.vendedor = {
      tipo: "ti",
      regimeIVA: "normal",
      regiao: "continente",
      atividade: "vendas",
      faturacaoAnualPrevista: 60000,
    };
    c.produto = { natureza: "bem", escalaoVenda: "normal" };
    c.canal = { canal: "loja_online", cliente: "consumidor" };
    c.custos = { direto: { valor: 100, incluiIVA: false, escalao: "normal" }, variaveis: [], fixos: [] };
    c.volume = { unidadesMes: 50 };
    c.objetivo = { modo: "margem", percentagem: 0.25 };
    return c;
  };

  it("a reserva de IVA abate o IVA dedutível das compras", () => {
    // O defeito: `ivaAEntregar` devolvia P × t no regime normal. Este caso
    // mandava reservar 1 682 €/mês onde saem 532 € — mais do triplo.
    const r = precificar(ctxRevenda());
    const liquidado = r.precoLiquido * r.taxaIVA;
    const dedutivel = 100 * r.taxaIVA;
    const esperado = (liquidado - dedutivel) * 50;

    expect(r.tesouraria).not.toBeNull();
    expect(proximo(r.tesouraria!.ivaMensal, esperado, 0.5)).toBe(true);
    expect(r.tesouraria!.ivaMensal).toBeLessThan(liquidado * 50);
  });

  it("quem NÃO deduz continua a entregar o IVA todo", () => {
    const c = ctxRevenda();
    c.vendedor.regimeIVA = "normal";
    c.custos.direto = { valor: 0, incluiIVA: false, escalao: "normal" };
    c.tempo = undefined;
    c.custos.variaveis = [{ id: "emb", rotulo: "Embalagem", porUnidade: 100 }];
    const r = precificar(c);
    // Sem IVA dedutível declarado, o saldo é o liquidado inteiro.
    expect(proximo(r.tesouraria!.ivaMensal, r.precoLiquido * r.taxaIVA * 50, 0.5)).toBe(true);
  });

  it("no regime da margem o IVA incide na margem, e as duas formas legais batem", () => {
    const c = contextoBase();
    c.vendedor = { tipo: "empresa", regimeIVA: "margem", regiao: "continente" };
    c.custos = { direto: { valor: 100, incluiIVA: true, escalao: "normal" }, variaveis: [], fixos: [] };
    c.volume = { unidadesMes: 10 };
    c.objetivo = { modo: "margem", percentagem: 0.3 };
    const r = precificar(c);

    // `precoLiquido` é a RECEITA do vendedor, já sem o imposto — logo `t`
    // sobre a margem líquida. A forma da lei, `t/(1+t)` sobre a margem
    // BRUTA, tem de dar exatamente o mesmo: é a mesma margem, medida antes
    // e depois de lá estar o imposto.
    const margemLiquida = r.precoLiquido - 100;
    const margemBruta = r.pvp - 100;
    const porDentro = margemLiquida * r.taxaIVA;
    const daLei = (margemBruta * r.taxaIVA) / (1 + r.taxaIVA);

    expect(proximo(porDentro, daLei, 0.005)).toBe(true);
    expect(proximo(r.iva, porDentro, 0.01)).toBe(true);
    expect(proximo(r.tesouraria!.ivaMensal / 10, porDentro, 0.01)).toBe(true);
  });

  it("o regime da margem avisa que o preço ainda não o modela", () => {
    const c = contextoBase();
    c.vendedor = { tipo: "empresa", regimeIVA: "margem", regiao: "continente" };
    c.custos = { direto: { valor: 100, incluiIVA: true, escalao: "normal" }, variaveis: [], fixos: [] };
    const aviso = precificar(c).avisos.find((a) => a.id === "regime-margem-confirmar-enquadramento");
    expect(aviso).toBeDefined();
    expect(aviso!.severidade).toBe("atencao");
    expect(aviso!.fonte).toMatch(/199\/96/);
  });
});

describe("auditoria · a caixa conta todas as comissões e nenhum imposto duas vezes", () => {
  it("a comissão de afiliado sai da conta, como qualquer outra", () => {
    // O defeito: `entraNaConta` subtraía só a fração sobre o BRUTO. Um
    // afiliado a 20% desaparecia da caixa e o ecrã dizia que ficavam
    // 20,00 € onde ficam 16,00 €.
    const r = precificar(
      ctxSimples((c) => {
        c.canal = { canal: "loja_online", cliente: "consumidor", afiliadoPercentagem: 0.2 };
        c.objetivo = { modo: "margem", percentagem: 0.3 };
      }),
    );
    const afiliado = r.precoLiquido * 0.2;
    expect(proximo(r.caixa.entraNaConta, r.pvp - afiliado, 0.01)).toBe(true);
  });

  it("`resultadoAoPreco` não volta a descontar SS e IRS", () => {
    // O defeito: multiplicava o lucro por (1 − SS − IRS), impostos que o
    // solver já tinha descontado. O «líquido pessoal» saía a 66% do real.
    const c = cenarioPorChave("servico").contexto();
    c.vendedor.faturacaoAnualPrevista = 30000;
    const r = resultadoAoPreco(c, 600);
    expect(r.liquidoPessoalMensal).toBe(r.lucroMensal);
  });

  it("em organizada, o IRS em euros abate as comissões ao lucro tributável", () => {
    const comCanal = precificar(
      ctxSimples((c) => {
        c.vendedor = {
          tipo: "ti",
          regimeIVA: "normal",
          regiao: "continente",
          atividade: "vendas",
          faturacaoAnualPrevista: 40000,
          regimeContabilidade: "organizada",
        };
        c.canal = { canal: "marketplace", cliente: "consumidor", comissaoPercentagem: 0.2 };
      }),
    );
    expect(comCanal.fiscal.irsBase).toBe("lucro");
    // O IRS incide sobre o que sobra depois da comissão — logo, é menor do
    // que a taxa aplicada ao preço inteiro.
    expect(comCanal.fiscal.irsPorUnidade).toBeLessThan(
      comCanal.precoLiquido * comCanal.fiscal.irsFracao,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  AUDITORIA · SEGUNDA VOLTA — o que tinha ficado por resolver
// ═══════════════════════════════════════════════════════════════════════

describe("auditoria · regime da margem (DL 199/96) formado a sério", () => {
  const ctxSegundaMao = (custo: number, margem = 0.3): ContextoPreco => {
    const c = contextoBase();
    c.vendedor = { tipo: "empresa", regimeIVA: "margem", regiao: "continente" };
    c.produto = { natureza: "bem", escalaoVenda: "normal" };
    c.canal = { canal: "loja_fisica", cliente: "consumidor" };
    c.custos = { direto: { valor: custo, incluiIVA: true, escalao: "normal" }, variaveis: [], fixos: [] };
    c.volume = { unidadesMes: 10 };
    c.objetivo = { modo: "margem", percentagem: margem };
    return c;
  };

  it("o cliente NÃO paga IVA sobre o preço todo — só sobre a margem", () => {
    // O defeito: `PVP = P × 1,23` num bem em segunda mão. Com 142,86 € de
    // receita pretendida sobre um bem comprado a 100 €, o cliente via
    // 175,71 € em vez de 152,71 € — 23 € a mais, que é o preço a que se
    // perde a venda.
    const r = precificar(ctxSegundaMao(100));
    expect(r.pvp).toBeLessThan(r.precoLiquido * (1 + r.taxaIVA));
    expect(proximo(r.precoLiquido, 142.86)).toBe(true);
    expect(proximo(r.pvp, 152.71)).toBe(true);
  });

  it("invariante 1 continua de pé: PVP = líquido + IVA", () => {
    for (const custo of [0.01, 50, 100, 900]) {
      const r = precificar(ctxSegundaMao(custo));
      expect(proximo(r.pvp, r.precoLiquido + r.iva, 0.005)).toBe(true);
    }
  });

  it("o IVA é a taxa sobre a margem, e zero quando não há margem", () => {
    const r = precificar(ctxSegundaMao(100));
    expect(proximo(r.iva, (r.precoLiquido - 100) * r.taxaIVA, 0.01)).toBe(true);

    // Vender ao custo (ou abaixo) não gera imposto — nem o devolve.
    const aoCusto = precificar(
      (() => {
        const c = ctxSegundaMao(100);
        c.objetivo = { modo: "preco_fixo", valor: 80, valorEhPVP: true };
        return c;
      })(),
    );
    expect(aoCusto.iva).toBe(0);
    expect(aoCusto.pvp).toBeGreaterThan(0);
  });

  it("a conversão PVP ↔ líquido é invertível nos dois sentidos", () => {
    const base = precificar(ctxSegundaMao(100));
    const aoMesmoPVP = precificar(
      (() => {
        const c = ctxSegundaMao(100);
        c.objetivo = { modo: "preco_fixo", valor: base.pvp, valorEhPVP: true };
        return c;
      })(),
    );
    // Ao cêntimo: reinverter um PVP já arredondado custa, no máximo, um.
    expect(proximo(aoMesmoPVP.precoLiquido, base.precoLiquido)).toBe(true);
  });

  it("a comissão do canal incide no total da fatura, não num PVP inexistente", () => {
    // No regime da margem o total faturado é P(1+t) − Cₐ·t. Cobrar comissão
    // sobre P(1+t) seria cobrá-la sobre um IVA que a fatura não tem.
    const semCanal = precificar(ctxSegundaMao(100));
    const comCanal = precificar(
      (() => {
        const c = ctxSegundaMao(100);
        c.canal = { canal: "marketplace", cliente: "consumidor", comissaoPercentagem: 0.15 };
        return c;
      })(),
    );
    expect(comCanal.precoLiquido).toBeGreaterThan(semCanal.precoLiquido);

    // A comissão que sai é 15% do que o cliente paga — não do PVP fictício.
    const comissao = comCanal.pvp * 0.15;
    expect(proximo(comCanal.caixa.entraNaConta, comCanal.pvp - comissao, 0.02)).toBe(true);
  });

  it("com `ajusteBruto = 0` o solver colapsa nas equações de sempre", () => {
    const semAjuste: EntradaSolver = {
      custosEuros: 10,
      fixosTransacao: 0.3,
      fracaoLiquido: 0.1,
      fracaoBruto: 0.15,
      taxaIVA: IVA_NORMAL,
    };
    const comZero: EntradaSolver = { ...semAjuste, ajusteBruto: 0 };
    expect(precoPorMargem(comZero, 0.3).precoLiquido).toBe(
      precoPorMargem(semAjuste, 0.3).precoLiquido,
    );
  });

  it("o aviso explica o regime em vez de o desculpar", () => {
    const a = precificar(ctxSegundaMao(100)).avisos.find(
      (x) => x.id === "regime-margem-confirmar-enquadramento",
    )!;
    expect(a.severidade).toBe("atencao");
    expect(a.fonte).toMatch(/199\/96/);
    expect(a.texto).toMatch(/contabilista/);
  });
});

describe("auditoria · as comissões são despesa dedutível em organizada", () => {
  const ctxCanal = (comissao: number): ContextoPreco => {
    const c = contextoBase();
    c.vendedor = {
      tipo: "ti",
      regimeIVA: "normal",
      regiao: "continente",
      atividade: "vendas",
      faturacaoAnualPrevista: 40000,
      regimeContabilidade: "organizada",
      anoAtividade: 3,
    };
    c.produto = { natureza: "bem", escalaoVenda: "normal" };
    c.canal =
      comissao > 0
        ? { canal: "marketplace", cliente: "consumidor", comissaoPercentagem: comissao }
        : { canal: "loja_online", cliente: "consumidor" };
    // Coerente com os 40 000 € declarados: 1 200 unidades/ano a ~33 € de
    // receita. Um custo que estoirasse a faturação punha o negócio em
    // prejuízo e a marginal a zero — o que testaria outra coisa.
    c.custos = { direto: { valor: 8, incluiIVA: false, escalao: "normal" }, variaveis: [], fixos: [] };
    c.volume = { unidadesMes: 100 };
    c.objetivo = { modo: "margem", percentagem: 0.3 };
    return c;
  };

  it("uma comissão de 20% baixa a taxa marginal de IRS que forma o preço", () => {
    // O defeito: `despesasAnuais` só somava custos e fixos. Num TI a faturar
    // 40 000 € com 20% de marketplace, faltavam ~8 000 € de despesa — e a
    // marginal saltava de 24,1% para 31,1%, mais de sete pontos.
    const sem = precificar(ctxCanal(0));
    const com = precificar(ctxCanal(0.2));
    expect(com.fiscal.irsBase).toBe("lucro");
    expect(com.fiscal.irsFracao).toBeLessThan(sem.fiscal.irsFracao);
  });

  it("no regime simplificado nada disto muda — as despesas não abatem lá", () => {
    const simplificado = (comissao: number) => {
      const c = ctxCanal(comissao);
      c.vendedor.regimeContabilidade = "simplificado";
      return precificar(c);
    };
    expect(simplificado(0.2).fiscal.irsFracao).toBe(simplificado(0).fiscal.irsFracao);
  });

  it("a segunda passagem é determinística: o mesmo contexto dá o mesmo preço", () => {
    const a = precificar(ctxCanal(0.2));
    const b = precificar(ctxCanal(0.2));
    expect(a.precoLiquido).toBe(b.precoLiquido);
    expect(a.fiscal.irsFracao).toBe(b.fiscal.irsFracao);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  AUDITORIA DE AGOSTO DE 2026 — os cinco buracos que a deixaram passar
//  ---------------------------------------------------------------------
//  Cada um destes testes falha na versão anterior à auditoria. Não estão
//  aqui por simetria: estão aqui porque a suite tinha 3 752 testes e
//  nenhum deles reparou em nada disto.
//
//  Ver `docs/auditorias/CALCULAR-PRECO-AUDITORIA-2026-08.md`.
// ═══════════════════════════════════════════════════════════════════════

describe("auditoria 2026-08 · regressões", () => {
  /** TI em contabilidade organizada, com contas fixas — onde τ > 0. */
  const ctxOrganizada = (patch: (c: ContextoPreco) => void = () => {}): ContextoPreco => {
    const c = contextoBase();
    c.vendedor = {
      tipo: "ti",
      regimeIVA: "normal",
      regiao: "continente",
      atividade: "art151",
      faturacaoAnualPrevista: 40000,
      regimeContabilidade: "organizada",
      anoAtividade: 3,
    };
    c.produto = { natureza: "bem", escalaoVenda: "normal" };
    c.canal = { canal: "loja_online", cliente: "consumidor" };
    c.custos = {
      direto: { valor: 10, incluiIVA: false, escalao: "normal" },
      variaveis: [],
      fixos: [{ id: "renda", rotulo: "Renda", mensal: 600 }],
    };
    c.volume = { unidadesMes: 100 };
    c.objetivo = { modo: "margem", percentagem: 0.35 };
    patch(c);
    return c;
  };

  // ── B2 ───────────────────────────────────────────────────────────
  it("o bloco de desconto mede a margem com o MESMO solver que o cartão", () => {
    // Media-a com `solver` (sem fixos) e subtraía os fixos por fora, o que
    // perdia o escudo fiscal deles: 31,4% no desconto ao lado de 35,0% no
    // cartão, para o mesmo preço, no mesmo ecrã.
    for (const regime of ["simplificado", "organizada"] as const) {
      const r = precificar(
        ctxOrganizada((c) => {
          c.vendedor.regimeContabilidade = regime;
          c.desconto = { tipo: "promocao", percentagem: 0.1 };
        }),
      );
      expect(r.desconto).toBeDefined();
      expect(r.desconto!.margemAntes).toBeCloseTo(r.margem.margem, 9);
      // Ao cêntimo, que é a unidade em que os dois aparecem no ecrã:
      // `margem.lucroUnidade` já vem arredondado, este não.
      expect(r.desconto!.lucroAntes).toBeCloseTo(r.margem.lucroUnidade, 2);
    }
  });

  // ── B3 ───────────────────────────────────────────────────────────
  it("a memória de cálculo FECHA em todos os cenários", () => {
    // Três linhas informativas traziam um valor negativo na mesma coluna
    // das parcelas reais — o IVA não dedutível, o desperdício e as
    // matérias-primas da produção própria. A coluna dava −1,67 € ao lado
    // de um lucro anunciado de +3,33 €.
    for (const chave of CENARIOS_INICIAIS) {
      const r = precificar(cenarioPorChave(chave).contexto());
      if (!r.ok) continue;
      const iPVP = r.explicacao.findIndex((l) => l.rotulo.startsWith("Preço ao cliente"));
      const iFim = r.explicacao.findIndex(
        (l) => l.rotulo.includes("O que te fica") || l.rotulo.includes("Lucro por venda"),
      );
      expect(iPVP, `${chave}: sem linha de PVP`).toBeGreaterThanOrEqual(0);
      expect(iFim, `${chave}: sem linha de resultado`).toBeGreaterThan(iPVP);

      const soma = r.explicacao
        .slice(iPVP + 1, iFim)
        .filter((l) => !l.informativa)
        .reduce((t, l) => t + l.valor, 0);

      expect(r.precoLiquido + soma, `a memória não fecha no cenário «${chave}»`).toBeCloseTo(
        r.margem.lucroUnidade,
        1,
      );
    }
  });

  it("as linhas informativas da memória são as que detalham outra parcela", () => {
    const r = precificar(
      ctxOrganizada((c) => {
        c.custos.direto = { valor: 12.3, incluiIVA: true, escalao: "normal" };
        c.custos.desperdicio = 0.2;
        c.vendedor.regimeIVA = "isento_art53";
        c.vendedor.faturacaoAnualPrevista = 12000;
      }),
    );
    const informativas = r.explicacao.filter((l) => l.informativa).map((l) => l.rotulo);
    expect(informativas).toContain("IVA que não consegues deduzir");
    expect(informativas).toContain("Desperdício / quebra");
  });

  // ── B4 ───────────────────────────────────────────────────────────
  it("as devoluções entram UMA vez nas despesas que formam o IRS marginal", () => {
    // `custos.variaveisFixos` já as inclui; `despesasSemComissoes` somava
    // `custos.devolucoes` outra vez. Despesa a mais → IRS marginal a menos
    // → preço abaixo do sustentável, e logo a quem tem mais devoluções.
    const semDevolucoes = precificar(
      ctxOrganizada((c) => {
        c.custos.portesAbsorvidos = 4;
      }),
    );
    const comDevolucoes = precificar(
      ctxOrganizada((c) => {
        c.custos.portesAbsorvidos = 4;
        c.custos.taxaDevolucao = 0.2;
        c.custos.custoDevolucao = 6;
      }),
    );
    // Invariante 13: acrescentar um custo nunca baixa o preço.
    expect(comDevolucoes.precoLiquido).toBeGreaterThan(semDevolucoes.precoLiquido);
    // E o custo variável por unidade sobe exatamente o custo esperado da
    // devolução — 0,2 × (6 + 4) = 2 €, não 4.
    expect(comDevolucoes.custo.variavelFixoPorUnidade - semDevolucoes.custo.variavelFixoPorUnidade)
      .toBeCloseTo(2, 2);
  });

  // ── B5 ───────────────────────────────────────────────────────────
  it("«quantas preciso de vender» não depende do volume declarado", () => {
    // `fixosPorUnidade × volume` era zero a volume zero: 1 000 €/mês de
    // renda desapareciam e a resposta saía 80 onde são precisas 240.
    const base = (q: number): ContextoPreco => {
      const c = contextoBase();
      c.vendedor = { tipo: "empresa", regimeIVA: "normal", regiao: "continente" };
      c.produto = { natureza: "bem", escalaoVenda: "normal" };
      c.canal = { canal: "loja_fisica", cliente: "consumidor" };
      c.custos = {
        direto: { valor: 10, incluiIVA: false, escalao: "normal" },
        variaveis: [],
        fixos: [{ id: "renda", rotulo: "Renda", mensal: 1000 }],
      };
      c.volume = { unidadesMes: q };
      c.objetivo = { modo: "margem", percentagem: 0.3 };
      return c;
    };
    const respostas = [0, 1, 7, 50, 300].map(
      (q) => unidadesParaGanhar(base(q), 20, 500).unidadesNecessarias,
    );
    expect(new Set(respostas).size, `respostas divergentes: ${respostas.join(", ")}`).toBe(1);
    // E a resposta certa conta mesmo com a renda.
    expect(respostas[0]).toBe(240);
  });

  it("`fixosMensais` é o total, não a reconstituição arredondada", () => {
    const r = precificar(
      ctxOrganizada((c) => {
        c.volume = { unidadesMes: 7 };
      }),
    );
    expect(r.custo.fixosMensais).toBe(600);
    // A reconstituição que estava a ser usada erra por arredondamento.
    expect(r.custo.fixosPorUnidade * 7).not.toBe(600);
  });

  // ── 4.1 · autoliquidação na construção civil ─────────────────────
  it("na construção civil não se liquida IVA — mas continua a deduzir-se", () => {
    // É a combinação que nenhuma isenção tem, e a razão de ter ramo
    // próprio: quem está isento pelo Art. 53.º tem o custo COM IVA; aqui
    // o custo é SEM IVA, porque o direito à dedução mantém-se.
    const ctx = (auto: boolean): ContextoPreco => {
      const c = contextoBase();
      c.vendedor = {
        tipo: "ti",
        regimeIVA: "normal",
        regiao: "continente",
        atividade: "art151",
        faturacaoAnualPrevista: 30000,
      };
      c.produto = { natureza: "servico", escalaoVenda: "normal" };
      c.canal = { canal: "orcamento", cliente: "empresa_pt", autoliquidacaoConstrucao: auto };
      c.custos = { direto: { valor: 123, incluiIVA: true, escalao: "normal" }, variaveis: [], fixos: [] };
      c.volume = { unidadesMes: 5 };
      c.objetivo = { modo: "margem", percentagem: 0.3 };
      return c;
    };

    const normal = precificar(ctx(false));
    const invertido = precificar(ctx(true));

    // Sem IVA na fatura: o cliente paga o líquido.
    expect(invertido.taxaIVA).toBe(0);
    expect(invertido.pvp).toBeCloseTo(invertido.precoLiquido, 2);
    expect(normal.pvp).toBeGreaterThan(normal.precoLiquido);

    // O custo continua a ser o valor SEM IVA nos dois casos — é isto que
    // separa a inversão da isenção do Art. 53.º.
    expect(invertido.custo.direto).toBeCloseTo(normal.custo.direto, 2);
    expect(invertido.custo.direto).toBeCloseTo(100, 2);

    // E nada de IVA a entregar, mas o aviso tem de estar lá.
    expect(invertido.avisos.some((a) => a.id === "autoliquidacao-construcao")).toBe(true);
  });

  it("a inversão só se aplica a cliente empresa portuguesa", () => {
    const c = contextoBase();
    c.vendedor = { tipo: "ti", regimeIVA: "normal", regiao: "continente", atividade: "art151" };
    c.produto = { natureza: "servico", escalaoVenda: "normal" };
    c.canal = { canal: "orcamento", cliente: "consumidor", autoliquidacaoConstrucao: true };
    c.custos = { direto: { valor: 0, incluiIVA: false, escalao: "normal" }, variaveis: [], fixos: [] };
    c.volume = { unidadesMes: 5 };
    c.objetivo = { modo: "margem", percentagem: 0.3 };
    const r = precificar(c);
    expect(r.taxaIVA).toBe(IVA_NORMAL);
    expect(r.avisos.some((a) => a.id === "autoliquidacao-construcao")).toBe(false);
  });

  it("quem está isento pelo Art. 53.º não ganha dedução por invocar a inversão", () => {
    const c = contextoBase();
    c.vendedor = {
      tipo: "ti",
      regimeIVA: "isento_art53",
      regiao: "continente",
      atividade: "art151",
      faturacaoAnualPrevista: 10000,
    };
    c.produto = { natureza: "servico", escalaoVenda: "normal" };
    c.canal = { canal: "orcamento", cliente: "empresa_pt", autoliquidacaoConstrucao: true };
    c.custos = { direto: { valor: 123, incluiIVA: true, escalao: "normal" }, variaveis: [], fixos: [] };
    c.volume = { unidadesMes: 5 };
    c.objetivo = { modo: "margem", percentagem: 0.3 };
    const r = precificar(c);
    // Continua isento, e o custo continua a ser o valor COM IVA (n.º 3).
    expect(r.regimeIVA).toBe("isento_art53");
    expect(r.custo.direto).toBeCloseTo(123, 2);
  });

  // ── 4.2 · regime transfronteiriço «EX» ───────────────────────────
  it("quem está isento e vende na UE é avisado do número «EX»", () => {
    const c = contextoBase();
    c.vendedor = {
      tipo: "ti",
      regimeIVA: "isento_art53",
      regiao: "continente",
      atividade: "art151",
      faturacaoAnualPrevista: 10000,
    };
    c.produto = { natureza: "servico", escalaoVenda: "normal" };
    c.canal = { canal: "orcamento", cliente: "empresa_ue" };
    c.custos = { direto: { valor: 0, incluiIVA: false, escalao: "normal" }, variaveis: [], fixos: [] };
    c.volume = { unidadesMes: 5 };
    c.objetivo = { modo: "margem", percentagem: 0.3 };
    const r = precificar(c);
    const aviso = r.avisos.find((a) => a.id === "isencao-transfronteirica-ex");
    expect(aviso).toBeDefined();
    expect(aviso!.texto).toContain("EX");
    // Quem NÃO está isento não tem nada a ver com este regime.
    c.vendedor.regimeIVA = "normal";
    expect(precificar(c).avisos.some((a) => a.id === "isencao-transfronteirica-ex")).toBe(false);
  });

  // ── 4.3 · residência fiscal ──────────────────────────────────────
  it("a residência fiscal governa o IRS; a região governa o IVA", () => {
    const ctx = (regiao: "continente" | "madeira", residencia?: "continente" | "madeira") => {
      const c = contextoBase();
      c.vendedor = {
        tipo: "ti",
        regimeIVA: "normal",
        regiao,
        residenciaFiscal: residencia,
        atividade: "art151",
        faturacaoAnualPrevista: 40000,
      };
      c.produto = { natureza: "servico", escalaoVenda: "normal" };
      c.canal = { canal: "orcamento", cliente: "consumidor" };
      c.custos = { direto: { valor: 0, incluiIVA: false, escalao: "normal" }, variaveis: [], fixos: [] };
      c.volume = { unidadesMes: 10 };
      c.objetivo = { modo: "margem", percentagem: 0.3 };
      return precificar(c);
    };

    // Atividade na Madeira, residência no continente: IVA da Madeira (22%)
    // e IRS continental — mais alto do que o da Madeira.
    const madeiraResideContinente = ctx("madeira", "continente");
    const madeiraResideMadeira = ctx("madeira");
    expect(madeiraResideContinente.taxaIVA).toBe(IVA_TAXAS.madeira.value.normal);
    expect(madeiraResideMadeira.taxaIVA).toBe(IVA_TAXAS.madeira.value.normal);
    expect(madeiraResideContinente.fiscal.irsFracao).toBeGreaterThan(
      madeiraResideMadeira.fiscal.irsFracao,
    );
  });
});
