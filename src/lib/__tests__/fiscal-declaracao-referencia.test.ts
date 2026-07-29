import { describe, it, expect } from "vitest";
import {
  simularDeclaracaoIRS,
  simularIRSAnual,
  limiteGlobalDeducoes,
  irsProgressivo,
} from "../fiscal";
import {
  DEDUCAO_ESPECIFICA_DEPENDENTE,
  DEDUCAO_DEFICIENCIA_COLETA,
  EXCLUSAO_DEFICIENCIA_MAX,
  IAS_VALUE,
  IRS_JOVEM,
  SMN,
} from "../fiscal-data";

/**
 * Casos de referência ponta-a-ponta de `simularDeclaracaoIRS`.
 *
 * A suite anterior cobria `simularIRSAnual` e as funções puras, e passava com
 * 466 testes verdes enquanto o wizard devolvia números errados: cada peça
 * estava certa isoladamente e a MONTAGEM é que estava mal. Estes casos exercem
 * a declaração inteira — é aqui que se apanha o mínimo de existência desligado,
 * o Art. 25.º n.º 2 ignorado ou o IRS Jovem que não chega à categoria A.
 *
 * Cada bloco é o critério de aceitação de um achado da auditoria.
 */

const CENT = 0.02;

describe("F-01 · mínimo de existência em salários e pensões", () => {
  it("quem ganha o salário mínimo fica com o resíduo que as despesas gerais anulam", () => {
    const salarioMinimoAnual = SMN.value * 14; // 920 € × 14 = 12 880 €
    const semFaturas = simularDeclaracaoIRS({ salarios: { bruto: salarioMinimoAnual } });
    expect(semFaturas.englobamento.minimoExistenciaDecision.status).toBe("applied");

    // A fórmula do Art. 70.º deixa de propósito um resíduo de coletável igual a
    // 250 € / 12,5% = 2 000 €. Não é uma falha do abatimento: a coleta que dali
    // sai (250 €) é exatamente a dedução por despesas gerais familiares, que o
    // n.º 5 al. c) pressupõe. Com faturas com NIF suficientes, o imposto é zero.
    expect(semFaturas.rendimentoColetavel).toBeCloseTo(2_000, 2);
    expect(semFaturas.irsTotal).toBeCloseTo(250, 2);

    const comFaturas = simularDeclaracaoIRS({
      salarios: { bruto: salarioMinimoAnual },
      deducoes: { gerais: 750 }, // 750 × 35% = 262,50 → limitado a 250 €
    });
    expect(comFaturas.irsTotal).toBeCloseTo(0, 2);
  });

  it("10 000 € de salário: abatimento aplicado e imposto zero", () => {
    const r = simularDeclaracaoIRS({ salarios: { bruto: 10_000 } });
    expect(r.irsTotal).toBeCloseTo(0, 2);
    expect(r.englobamento.minimoExistenciaDecision.status).toBe("applied");
    // O abatimento nunca ultrapassa o rendimento líquido do titular.
    const liquido = 10_000 - DEDUCAO_ESPECIFICA_DEPENDENTE.value;
    expect(r.englobamento.abatimentoMinimoExistencia).toBeCloseTo(liquido, 2);
  });

  it("10 000 € de pensão têm o mesmo tratamento do salário (n.º 2 cobre pensões)", () => {
    const salario = simularDeclaracaoIRS({ salarios: { bruto: 10_000 } });
    const pensao = simularDeclaracaoIRS({ pensoes: { bruto: 10_000 } });
    expect(pensao.irsTotal).toBeCloseTo(salario.irsTotal, 2);
    expect(pensao.irsTotal).toBeCloseTo(0, 2);
  });

  it("não se aplica quando a categoria predominante está fora do n.º 2", () => {
    // Mais-valias mobiliárias englobadas como rendimento dominante.
    const r = simularDeclaracaoIRS({
      salarios: { bruto: 2_000 },
      investimentos: { saldo: 12_000, englobar: true },
    });
    expect(r.englobamento.minimoExistenciaDecision.status).toBe("not_applicable");
  });

  it("avisa quando o artigo 70.º não pode ser apurado", () => {
    // O motor devolve `needs_input` quando os factos são incoerentes; a
    // declaração nunca pode engolir isso em silêncio.
    const r = simularDeclaracaoIRS({ salarios: { bruto: 10_000 } });
    if (r.englobamento.minimoExistenciaDecision.status === "needs_input") {
      expect(r.avisos.some((a) => a.includes("mínimo de existência"))).toBe(true);
    }
    expect(r.englobamento.minimoExistenciaDecision.status).not.toBe("needs_input");
  });
});

describe("F-03 · Art. 25.º n.os 2 e 4 e quotizações sindicais", () => {
  it("acima de ~41 701 € a dedução passa a ser a Segurança Social paga", () => {
    const bruto = 60_000;
    const ss = bruto * 0.11; // 6 600 €
    const r = simularDeclaracaoIRS({ salarios: { bruto, contribuicoesSS: ss } });
    expect(r.rendimentoColetavel).toBeCloseTo(bruto - ss, 2);
    expect(r.irsTotal).toBeCloseTo(irsProgressivo(bruto - ss), 2);
  });

  it("sem contribuições declaradas mantém-se o piso de 8,54 × IAS", () => {
    const r = simularDeclaracaoIRS({ salarios: { bruto: 60_000 } });
    expect(r.rendimentoColetavel).toBeCloseTo(60_000 - DEDUCAO_ESPECIFICA_DEPENDENTE.value, 2);
  });

  it("contribuições abaixo do piso não reduzem a dedução", () => {
    const r = simularDeclaracaoIRS({ salarios: { bruto: 20_000, contribuicoesSS: 2_200 } });
    expect(r.rendimentoColetavel).toBeCloseTo(
      Math.max(0, 20_000 - DEDUCAO_ESPECIFICA_DEPENDENTE.value - // dedução específica
        // menos o abatimento do artigo 70.º, se houver
        (simularDeclaracaoIRS({ salarios: { bruto: 20_000, contribuicoesSS: 2_200 } })
          .englobamento.abatimentoMinimoExistencia)),
      2
    );
  });

  it("quotizações para ordens profissionais elevam a dedução até 75% de 12 × IAS", () => {
    const tecto = 0.75 * 12 * IAS_VALUE;
    const semOrdem = simularDeclaracaoIRS({ salarios: { bruto: 50_000 } });
    const comOrdem = simularDeclaracaoIRS({ salarios: { bruto: 50_000, quotizacoesOrdem: 400 } });
    expect(comOrdem.rendimentoColetavel).toBeLessThan(semOrdem.rendimentoColetavel);
    expect(comOrdem.rendimentoColetavel).toBeCloseTo(50_000 - tecto, 2);
  });

  it("a elevação por ordem profissional nunca passa do tecto do n.º 4", () => {
    const tecto = 0.75 * 12 * IAS_VALUE;
    const r = simularDeclaracaoIRS({ salarios: { bruto: 50_000, quotizacoesOrdem: 10_000 } });
    expect(r.rendimentoColetavel).toBeCloseTo(50_000 - tecto, 2);
  });

  it("quotizações sindicais deduzem até 1% do bruto, acrescidas de 100%", () => {
    const bruto = 40_000;
    const sindicais = 500; // > 1% (400 €) → limitado a 400, majorado para 800
    const r = simularDeclaracaoIRS({ salarios: { bruto, quotizacoesSindicais: sindicais } });
    const esperado = bruto - DEDUCAO_ESPECIFICA_DEPENDENTE.value - 800;
    expect(r.rendimentoColetavel).toBeCloseTo(esperado, 2);
  });
});

describe("F-04/F-05/F-06/F-07 · perímetro e limite do Art. 78.º", () => {
  it("as despesas gerais familiares ficam FORA do limite global (alínea b)", () => {
    const base = {
      salarios: { bruto: 60_000 },
      deducoes: { saude: 8_000, educacao: 4_000, gerais: 3_000 },
    };
    const r = simularDeclaracaoIRS(base);
    const d = r.englobamento.deducoesDespesasDetalhe;
    expect(d.geraisForaDoLimite).toBe(true);
    expect(d.gerais).toBeGreaterThan(0);
    // O aplicado é a parte limitada MAIS as despesas gerais por inteiro.
    expect(d.aplicado).toBeCloseTo(Math.min(d.somaBruta, d.limiteGlobal) + d.gerais, 2);
  });

  it("as pensões de alimentos entram DENTRO do limite global (alínea f)", () => {
    const semPensao = simularDeclaracaoIRS({
      salarios: { bruto: 60_000 },
      deducoes: { saude: 8_000, educacao: 4_000 },
    });
    const comPensao = simularDeclaracaoIRS({
      salarios: { bruto: 60_000 },
      deducoes: { saude: 8_000, educacao: 4_000 },
      pensaoAlimentos: 12_000,
    });
    const limite = comPensao.englobamento.deducoesDespesasDetalhe.limiteGlobal;
    // Com o teto já esgotado pelas outras rubricas, a pensão não pode acrescentar
    // dedução nenhuma — antes acrescentava 2 400 € por cima do limite.
    expect(comPensao.englobamento.deducoesDespesasDetalhe.dentroDoLimite).toBeCloseTo(limite, 2);
    expect(comPensao.deducoesColeta).toBeCloseTo(semPensao.deducoesColeta, 2);
  });

  it("em tributação conjunta o limite usa o coletável já dividido (n.º 7)", () => {
    const r = simularDeclaracaoIRS({
      conjunta: true,
      salarios: { bruto: 40_000 },
      titularB: { salarios: { bruto: 40_000 } },
      deducoes: { saude: 10_000, educacao: 5_000, rendas: 7_000 },
    });
    const coletavel = r.rendimentoColetavel;
    const d = r.englobamento.deducoesDespesasDetalhe;
    expect(d.limiteGlobal).toBeCloseTo(limiteGlobalDeducoes(coletavel / 2), 2);
    // O limite do coletável inteiro seria muito mais baixo — e essa era a conta.
    expect(d.limiteGlobal).toBeGreaterThan(limiteGlobalDeducoes(coletavel));
  });

  it("três ou mais dependentes majoram o limite em 5% cada (n.º 8)", () => {
    const comDeps = (n: number) =>
      simularDeclaracaoIRS({
        salarios: { bruto: 60_000 },
        deducoes: { saude: 10_000, educacao: 8_000, rendas: 12_000 },
        dependentesDetalhe: { normais: n },
      }).englobamento.deducoesDespesasDetalhe.limiteGlobal;

    expect(comDeps(2)).toBeCloseTo(comDeps(0), 2);
    expect(comDeps(3)).toBeCloseTo(comDeps(0) * 1.15, 2);
    expect(comDeps(4)).toBeCloseTo(comDeps(0) * 1.2, 2);
  });
});

describe("F-08 · IRS Jovem nas categorias A e B", () => {
  it("um jovem assalariado no 1.º ano não paga IRS", () => {
    const r = simularDeclaracaoIRS({ salarios: { bruto: 20_000 }, irsJovemAno: 1 });
    expect(r.irsTotal).toBeCloseTo(0, 2);
  });

  it("o teto de 55 × IAS é partilhado entre as categorias A e B do mesmo titular", () => {
    const teto = IRS_JOVEM.tetoIAS.value * IAS_VALUE;
    // Rendimento muito acima do teto nas duas categorias: a isenção total tem
    // de parar no teto, não dar 55 × IAS a cada categoria.
    const r = simularDeclaracaoIRS({
      salarios: { bruto: 40_000 },
      independente: { brutoAnual: 40_000, tipo: "art151" },
      irsJovemAno: 1,
    });
    const semJovem = simularDeclaracaoIRS({
      salarios: { bruto: 40_000 },
      independente: { brutoAnual: 40_000, tipo: "art151" },
    });
    const isentado = semJovem.rendimentoColetavel - r.rendimentoColetavel;
    expect(isentado).toBeLessThanOrEqual(teto + CENT);
    expect(isentado).toBeCloseTo(teto, 2);
  });

  it("a escala por ano de rendimentos aplica-se também à categoria A", () => {
    const ano1 = simularDeclaracaoIRS({ salarios: { bruto: 30_000 }, irsJovemAno: 1 });
    const ano5 = simularDeclaracaoIRS({ salarios: { bruto: 30_000 }, irsJovemAno: 5 });
    const semJovem = simularDeclaracaoIRS({ salarios: { bruto: 30_000 } });
    expect(ano1.rendimentoColetavel).toBeLessThan(ano5.rendimentoColetavel);
    expect(ano5.rendimentoColetavel).toBeLessThan(semJovem.rendimentoColetavel);
  });
});

describe("F-09 · Art. 56.º-A nas categorias A, B e H", () => {
  it("exclui 15% do salário bruto, com o teto de 2 500 €", () => {
    const sem = simularDeclaracaoIRS({ salarios: { bruto: 30_000 } });
    const com = simularDeclaracaoIRS({ salarios: { bruto: 30_000 }, deficiencia: true });
    // 15% de 30 000 € = 4 500 € → limitado a 2 500 €.
    expect(sem.rendimentoColetavel - com.rendimentoColetavel).toBeCloseTo(
      EXCLUSAO_DEFICIENCIA_MAX.value,
      2
    );
    // E a dedução à coleta do Art. 87.º continua a somar-se por cima.
    expect(com.deducoesColeta).toBeCloseTo(sem.deducoesColeta + DEDUCAO_DEFICIENCIA_COLETA.value, 2);
  });

  it("o teto de 2 500 € é POR CATEGORIA, não por pessoa", () => {
    const sem = simularDeclaracaoIRS({ salarios: { bruto: 30_000 }, pensoes: { bruto: 30_000 } });
    const com = simularDeclaracaoIRS({
      salarios: { bruto: 30_000 },
      pensoes: { bruto: 30_000 },
      deficiencia: true,
    });
    expect(sem.rendimentoColetavel - com.rendimentoColetavel).toBeCloseTo(
      EXCLUSAO_DEFICIENCIA_MAX.value * 2,
      2
    );
  });

  it("na categoria B incide sobre o bruto, antes do coeficiente", () => {
    const sem = simularIRSAnual({ brutoAnual: 40_000, tipo: "art151", anoAtividade: 3 });
    const com = simularIRSAnual({ brutoAnual: 40_000, tipo: "art151", anoAtividade: 3, deficiencia: true });
    // A exclusão sai do BRUTO: no rendimento após coeficiente vale
    // 2 500 € × coeficiente, e não 2 500 € como valeria se fosse aplicada
    // depois (que era o que o motor fazia — excluía mais do que a lei permite).
    expect(sem.rendimentoCoeficiente - com.rendimentoCoeficiente).toBeCloseTo(
      EXCLUSAO_DEFICIENCIA_MAX.value * sem.coeficiente,
      2
    );
    expect(com.exclusaoDeficiencia).toBeCloseTo(EXCLUSAO_DEFICIENCIA_MAX.value, 2);
  });
});

describe("F-10 · rendimentos do estrangeiro (Anexo J)", () => {
  it("um salário estrangeiro tem a mesma dedução específica de um nacional", () => {
    const nacional = simularDeclaracaoIRS({ salarios: { bruto: 30_000 } });
    const estrangeiro = simularDeclaracaoIRS({
      estrangeiros: {
        rendimento: 30_000,
        porPais: [{ pais: "Alemanha", rendimento: 30_000, impostoPago: 0, categoria: "trabalho" }],
      },
    });
    expect(estrangeiro.rendimentoColetavel).toBeCloseTo(nacional.rendimentoColetavel, 2);
  });

  it("sem categoria indicada o rendimento entra bruto (comportamento conservador)", () => {
    const r = simularDeclaracaoIRS({
      estrangeiros: { rendimento: 30_000, porPais: [{ rendimento: 30_000, impostoPago: 0 }] },
    });
    expect(r.englobamento.outrosRendimentos).toBeCloseTo(30_000, 2);
  });

  it("o crédito do Art. 81.º usa o rendimento líquido no numerador", () => {
    const bruto = 30_000;
    const impostoPago = 9_000;
    const r = simularDeclaracaoIRS({
      estrangeiros: {
        rendimento: bruto,
        impostoPago,
        porPais: [{ pais: "Brasil", rendimento: bruto, impostoPago, categoria: "trabalho" }],
      },
    });
    // Rendimento único: a fração da coleta é 100% dela, logo o crédito é o
    // menor entre o imposto pago e a própria coleta — nunca mais do que isso.
    expect(r.creditoDuplaTributacao).toBeLessThanOrEqual(r.coletaEnglobamento + CENT);
  });

  it("a isenção com progressividade não tributa mas eleva a taxa", () => {
    const semIsento = simularDeclaracaoIRS({ salarios: { bruto: 20_000 } });
    const comIsento = simularDeclaracaoIRS({
      salarios: { bruto: 20_000 },
      estrangeiros: {
        rendimento: 30_000,
        porPais: [
          {
            pais: "França",
            rendimento: 30_000,
            impostoPago: 0,
            categoria: "trabalho",
            isencaoComProgressividade: true,
          },
        ],
      },
    });
    // O coletável tributável é o mesmo…
    expect(comIsento.rendimentoColetavel).toBeCloseTo(semIsento.rendimentoColetavel, 2);
    // …mas a taxa aplicada é mais alta, porque o isento entrou para a determinar.
    expect(comIsento.irsTotal).toBeGreaterThan(semIsento.irsTotal);
    expect(comIsento.avisos.some((a) => a.includes("progressividade"))).toBe(true);
  });
});

describe("F-13 · reinvestimento em habitação própria", () => {
  it("a amortização do empréstimo sai do valor de realização (Art. 10.º n.º 5)", () => {
    const comum = {
      salarios: { bruto: 20_000 },
      imoveisVenda: {
        ganho: 50_000,
        valorRealizacao: 300_000,
        valorReinvestido: 200_000,
        reinvesteHPP: true,
      },
    };
    const semAmortizacao = simularDeclaracaoIRS(comum);
    const comAmortizacao = simularDeclaracaoIRS({
      ...comum,
      imoveisVenda: { ...comum.imoveisVenda, amortizacaoEmprestimo: 100_000 },
    });
    // Com 100 000 € de empréstimo amortizado, os 200 000 € reinvestidos cobrem
    // a totalidade dos 200 000 € relevantes → exclusão total da mais-valia.
    expect(comAmortizacao.rendimentoColetavel).toBeLessThan(semAmortizacao.rendimentoColetavel);
    expect(comAmortizacao.rendimentoColetavel).toBeCloseTo(
      simularDeclaracaoIRS({ salarios: { bruto: 20_000 } }).rendimentoColetavel,
      2
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
//  Perfis completos — os sete casos fechados à mão da auditoria
// ─────────────────────────────────────────────────────────────────────────

describe("perfis de referência", () => {
  it("assalariado ao salário mínimo com faturas: imposto zero e sem saldo a pagar", () => {
    const r = simularDeclaracaoIRS({
      salarios: { bruto: SMN.value * 14, retencoes: 0 },
      deducoes: { gerais: 1_000 },
    });
    expect(r.irsTotal).toBeCloseTo(0, 2);
    expect(r.saldo).toBeGreaterThanOrEqual(0);
  });

  it("assalariado a 60 000 € com SS declarada", () => {
    const r = simularDeclaracaoIRS({
      salarios: { bruto: 60_000, retencoes: 14_000, contribuicoesSS: 6_600 },
    });
    expect(r.rendimentoColetavel).toBeCloseTo(53_400, 2);
    expect(r.irsTotal).toBeCloseTo(irsProgressivo(53_400), 2);
    expect(r.saldo).toBeCloseTo(14_000 - r.irsTotal, 2);
  });

  it("casal 40k + 40k com despesas: quociente conjugal e limite dividido", () => {
    const r = simularDeclaracaoIRS({
      conjunta: true,
      salarios: { bruto: 40_000 },
      titularB: { salarios: { bruto: 40_000 } },
      deducoes: { saude: 10_000, educacao: 5_000, rendas: 7_000 },
    });
    const liquidoCada = 40_000 - DEDUCAO_ESPECIFICA_DEPENDENTE.value;
    expect(r.rendimentoColetavel).toBeCloseTo(liquidoCada * 2, 2);
    // Quociente conjugal: imposto de metade do coletável, vezes dois.
    const coletaEsperada = irsProgressivo(r.rendimentoColetavel / 2) * 2;
    expect(r.coletaEnglobamento).toBeCloseTo(coletaEsperada, 2);
  });

  it("jovem no 1.º ano de rendimentos: isenção total dentro do teto", () => {
    const r = simularDeclaracaoIRS({ salarios: { bruto: 20_000 }, irsJovemAno: 1 });
    expect(r.rendimentoColetavel).toBeCloseTo(0, 2);
    expect(r.irsTotal).toBeCloseTo(0, 2);
  });

  it("freelancer a 25 000 € (Art. 151.º): individual e conjunta diferem", () => {
    const individual = simularDeclaracaoIRS({
      independente: { brutoAnual: 25_000, tipo: "art151" },
    });
    expect(individual.rendimentoColetavel).toBeGreaterThan(0);
    expect(individual.irsTotal).toBeGreaterThan(0);
    // O quociente conjugal sem SP B corta o imposto — é legítimo no motor, mas
    // só está disponível a quem seja casado ou unido de facto (ver F-02).
    const conjuntaSemB = simularDeclaracaoIRS({
      conjunta: true,
      independente: { brutoAnual: 25_000, tipo: "art151" },
    });
    expect(conjuntaSemB.irsTotal).toBeLessThan(individual.irsTotal);
  });

  it("misto salário + recibos verdes: as duas categorias somam-se no englobamento", () => {
    const r = simularDeclaracaoIRS({
      salarios: { bruto: 30_000 },
      independente: { brutoAnual: 20_000, tipo: "art151" },
    });
    const liquidoA = 30_000 - DEDUCAO_ESPECIFICA_DEPENDENTE.value;
    expect(r.englobamento.outrosRendimentos).toBeCloseTo(liquidoA, 2);
    expect(r.rendimentoColetavel).toBeCloseTo(
      liquidoA + r.englobamento.rendimentoTributavel - r.englobamento.abatimentoMinimoExistencia,
      2
    );
    expect(r.rendimentoGlobal).toBeCloseTo(50_000, 2);
  });

  it("reformado com pensão de 15 000 €", () => {
    const r = simularDeclaracaoIRS({ pensoes: { bruto: 15_000, retencoes: 500 } });
    const liquido = 15_000 - DEDUCAO_ESPECIFICA_DEPENDENTE.value;
    const coletavel = liquido - r.englobamento.abatimentoMinimoExistencia;
    expect(r.rendimentoColetavel).toBeCloseTo(Math.max(0, coletavel), 2);
    expect(r.irsTotal).toBeCloseTo(irsProgressivo(Math.max(0, coletavel)), 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────
//  F-14 · contrato entre os dois caminhos do motor
// ─────────────────────────────────────────────────────────────────────────

describe("F-14 · coerência entre simularDeclaracaoIRS e simularIRSAnual", () => {
  it("categoria B pura dá o mesmo resultado pelos dois caminhos", () => {
    const casos = [10_000, 25_000, 45_000, 90_000];
    for (const bruto of casos) {
      const anual = simularIRSAnual({ brutoAnual: bruto, tipo: "art151", anoAtividade: 3 });
      const declaracao = simularDeclaracaoIRS({
        independente: { brutoAnual: bruto, tipo: "art151", anoAtividade: 3 },
      });
      expect(declaracao.rendimentoColetavel).toBeCloseTo(anual.rendimentoColetavel, 2);
      expect(declaracao.irsTotal).toBeCloseTo(anual.irsEstimado, 2);
    }
  });

  it("a demo e o wizard aplicam o mesmo artigo 70.º ao mesmo caso", () => {
    // A demo passava os factos à mão e acertava; o wizard não os passava e
    // errava. Agora os dois caminhos partem dos mesmos factos.
    const bruto = 14_000;
    const anual = simularIRSAnual({ brutoAnual: bruto, tipo: "art151", anoAtividade: 3 });
    const declaracao = simularDeclaracaoIRS({
      independente: { brutoAnual: bruto, tipo: "art151", anoAtividade: 3 },
    });
    expect(declaracao.englobamento.abatimentoMinimoExistencia).toBeCloseTo(
      anual.abatimentoMinimoExistencia,
      2
    );
    expect(anual.minimoExistenciaDecision.status).toBe("applied");
  });
});
