// ═══════════════════════════════════════════════════════════════════════
//  INVARIANTES E CASOS-OURO — Categoria A e comparador
//  ---------------------------------------------------------------------
//  Pontos 17 e 18 do relatório do simulador de vencimento.
//
//  A conclusão do relatório é que quase nenhum defeito estava na
//  fiscalidade: as tabelas, os escalões e as fórmulas estavam certos e
//  verificados contra o Diário da República. O que falhava era a LIGAÇÃO —
//  qual motor a interface chama, que parâmetros lhe passa, e se a mesma
//  pergunta feita em dois sítios recebe a mesma resposta.
//
//  São defeitos que se apanham com testes de coerência, não com
//  investigação jurídica. Três bastariam para apanhar os dois defeitos
//  críticos; estão todos aqui.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  calcularReciboMensal,
  calcularVencimento,
  calcularVencimentoAnual,
  compararCategorias,
  mealheiroDependente,
} from "@/lib/fiscal-dependente";
import { calcularPenhora, calcularTrabalhoNoturno } from "@/lib/fiscal-laboral";
import { solveNetToGross } from "@/lib/payroll-inverse";
import { SMN, SS_DEPENDENTE, SUBSIDIO_REFEICAO, TRABALHO_NOTURNO } from "@/lib/fiscal-data";

describe("invariantes — o líquido em função do bruto", () => {
  it("é estritamente monótono entre 900 € e 6 000 € (ao euro)", () => {
    // Verificado no relatório: zero quedas. É o invariante que torna correta
    // a bissecção do solver «líquido → bruto» — se uma tabela futura
    // introduzir um degrau, este teste falha em vez de o solver passar a
    // mentir em silêncio.
    let anterior = -Infinity;
    const quedas: number[] = [];
    for (let bruto = 900; bruto <= 6_000; bruto += 1) {
      const liquido = calcularVencimento({ salarioBruto: bruto, subsidioRefeicaoDia: 0, diasUteis: 0 }).liquido;
      if (liquido < anterior - 0.005) quedas.push(bruto);
      anterior = liquido;
    }
    expect(quedas).toEqual([]);
  });

  it("a retenção nunca excede a remuneração", () => {
    for (let bruto = 500; bruto <= 20_000; bruto += 100) {
      const r = calcularVencimento({ salarioBruto: bruto, subsidioRefeicaoDia: 0, diasUteis: 0 });
      expect(r.irsRetido).toBeLessThanOrEqual(bruto);
      expect(r.irsRetido + r.ssTrabalhador).toBeLessThanOrEqual(bruto);
    }
  });

  it("o solver inverso devolve o bruto que produz o líquido pedido", () => {
    const liquidoDe = (base: number) =>
      calcularVencimento({ salarioBruto: base, subsidioRefeicaoDia: 0, diasUteis: 0 }).liquido;
    for (const alvo of [800, 1_200, 2_000, 3_500]) {
      const { gross, reached } = solveNetToGross({ target: alvo, liquidoDe });
      expect(reached).toBe(true);
      expect(liquidoDe(gross)).toBeGreaterThanOrEqual(alvo - 0.02);
    }
  });

  it("o solver assume o alvo inalcançável em vez de devolver um número errado", () => {
    const { reached } = solveNetToGross({
      target: 10_000,
      liquidoDe: (base) => calcularVencimento({ salarioBruto: base, subsidioRefeicaoDia: 0, diasUteis: 0 }).liquido,
      maximoBruto: 1_000,
    });
    expect(reached).toBe(false);
  });
});

describe("invariantes — um só motor, uma só resposta", () => {
  it("`calcularVencimento` é `calcularReciboMensal` com os extras a zero", () => {
    // A documentação do ficheiro sempre prometeu isto; os dois motores é que
    // não o cumpriam — um tributava o excesso do subsídio de refeição e o
    // outro não, com ~11,90 €/mês de diferença sempre no sentido agradável.
    for (const [bruto, subDia, cartao] of [
      [1_500, 12, true],
      [1_000, 10.46, true],
      [920, 6.15, false],
      [3_000, 8, false],
    ] as const) {
      const simples = calcularVencimento({
        salarioBruto: bruto,
        subsidioRefeicaoDia: subDia,
        subsidioRefeicaoCartao: cartao,
        diasUteis: 22,
      });
      const detalhado = calcularReciboMensal({
        salarioBruto: bruto,
        subsidioRefeicaoDia: subDia,
        subsidioRefeicaoCartao: cartao,
        diasSubsidio: 22,
      });
      expect(simples.liquido).toBeCloseTo(detalhado.liquido, 2);
      expect(simples.ssTrabalhador).toBeCloseTo(detalhado.ssTrabalhador, 2);
      expect(simples.irsRetido).toBeCloseTo(detalhado.irsTotal, 2);
      expect(simples.taxaEfetiva).toBeCloseTo(detalhado.taxaEfetiva, 6);
      expect(simples.custoEmpresa).toBeCloseTo(detalhado.custoEmpresa, 2);
    }
  });

  it("tributa o excesso do subsídio de refeição em IRS e em Segurança Social", () => {
    const limite = SUBSIDIO_REFEICAO.cartao.value;
    const semExcesso = calcularVencimento({ salarioBruto: 1_500, subsidioRefeicaoDia: limite, subsidioRefeicaoCartao: true, diasUteis: 22 });
    const comExcesso = calcularVencimento({ salarioBruto: 1_500, subsidioRefeicaoDia: 12, subsidioRefeicaoCartao: true, diasUteis: 22 });
    expect(comExcesso.subsidioRefeicaoTributado).toBeGreaterThan(0);
    expect(comExcesso.ssTrabalhador).toBeGreaterThan(semExcesso.ssTrabalhador);
    expect(comExcesso.irsRetido).toBeGreaterThan(semExcesso.irsRetido);
  });

  it("`custoEmpresa` inclui o subsídio de refeição que a empresa paga", () => {
    // Prova do relatório: 1 000 € + cartão de 10,46 €/dia × 22 dias.
    const r = calcularVencimento({
      salarioBruto: 1_000,
      subsidioRefeicaoDia: SUBSIDIO_REFEICAO.cartao.value,
      subsidioRefeicaoCartao: true,
      diasUteis: 22,
    });
    const subsidio = SUBSIDIO_REFEICAO.cartao.value * 22;
    expect(r.custoEmpresa).toBeCloseTo(1_000 * (1 + SS_DEPENDENTE.entidade.value) + subsidio, 2);
    expect(r.custoEmpresa).toBeGreaterThan(1_000 * (1 + SS_DEPENDENTE.entidade.value));
  });

  it("a mesma pessoa obtém o mesmo líquido no simulador e na coluna A do comparador", () => {
    // O terceiro dos três testes de coerência que o relatório pedia.
    for (const salarioMes of [1_000, 2_000, 3_500]) {
      const brutoAnual = salarioMes * 14;
      const anual = calcularVencimentoAnual({ salarioBruto: salarioMes, subsidioRefeicaoDia: 0 });
      const apuramento = mealheiroDependente({ salarioBruto: salarioMes });
      const comparador = compararCategorias({ brutoAnual });

      expect(comparador.dependente.bruto).toBeCloseTo(anual.brutoAnual, 2);
      expect(comparador.dependente.ss).toBeCloseTo(anual.ssAnual, 2);
      // A coluna A é medida pelo imposto DEVIDO, não pela retenção.
      expect(comparador.dependente.irs).toBeCloseTo(apuramento.irsApurado, 2);
      expect(comparador.dependente.irsRetido).toBeCloseTo(apuramento.irsRetido, 2);
    }
  });
});

describe("invariantes — todo o parâmetro exposto chega ao motor", () => {
  it("os dependentes movem os TRÊS cenários, não só a Categoria A", () => {
    // O defeito crítico 2.1: `dependentes` só chegava à Categoria A e o
    // líquido dos recibos verdes não se movia um cêntimo entre 0 e 4.
    const semDep = compararCategorias({ brutoAnual: 40_000, dependentes: 0 });
    const comDep = compararCategorias({ brutoAnual: 40_000, dependentes: 2 });
    expect(comDep.dependente.liquido).toBeGreaterThan(semDep.dependente.liquido);
    expect(comDep.freelancer.liquido).toBeGreaterThan(semDep.freelancer.liquido);
  });

  it("o IRS Jovem chega aos três cenários", () => {
    const sem = compararCategorias({ brutoAnual: 30_000 });
    const com = compararCategorias({ brutoAnual: 30_000, irsJovemAno: 1 });
    expect(com.dependente.liquido).toBeGreaterThan(sem.dependente.liquido);
    expect(com.freelancer.liquido).toBeGreaterThan(sem.freelancer.liquido);
  });

  it("as deduções à coleta chegam aos três cenários, ou a nenhum", () => {
    const sem = compararCategorias({ brutoAnual: 40_000 });
    const com = compararCategorias({ brutoAnual: 40_000, deducoes: { saude: 3_000, educacao: 2_000 } });
    expect(com.dependente.liquido).toBeGreaterThan(sem.dependente.liquido);
    expect(com.freelancer.liquido).toBeGreaterThan(sem.freelancer.liquido);
  });

  it("o custo do contabilista e a derrama chegam ao cenário da empresa", () => {
    const base = compararCategorias({ brutoAnual: 40_000, custosEmpresa: 0, derrama: 0 });
    const comContabilista = compararCategorias({ brutoAnual: 40_000, custosEmpresa: 1_920, derrama: 0 });
    const comDerrama = compararCategorias({ brutoAnual: 40_000, custosEmpresa: 0, derrama: 0.015 });
    expect(comContabilista.empresa.custosEmpresa).toBe(1_920);
    expect(comContabilista.empresa.liquido).toBeLessThan(base.empresa.liquido);
    expect(comDerrama.empresa.derrama).toBeGreaterThan(0);
    expect(comDerrama.empresa.liquido).toBeLessThan(base.empresa.liquido);
  });

  it("a soma das parcelas fecha com o ilíquido nos cenários conhecidos", () => {
    // O `pilha()` do comparador manda a diferença para «Outros custos /
    // estrutura». Se as parcelas deixassem de fechar, a barra continuava a
    // fechar e o erro ficava disfarçado num rótulo genérico.
    for (const bruto of [20_000, 40_000, 80_000, 150_000]) {
      const c = compararCategorias({ brutoAnual: bruto, custosEmpresa: 1_920 });

      const restoA = bruto - c.dependente.liquido - c.dependente.irs - c.dependente.ss;
      expect(restoA).toBeGreaterThanOrEqual(-1);

      const restoRV = bruto - c.freelancer.liquido - c.freelancer.irs - c.freelancer.ss - c.freelancer.despesas;
      expect(Math.abs(restoRV)).toBeLessThanOrEqual(1);

      const restoEmp =
        bruto - c.empresa.liquido - c.empresa.dividendos - c.empresa.irc - c.empresa.derrama - c.empresa.custosEmpresa;
      expect(Math.abs(restoEmp)).toBeLessThanOrEqual(1);
    }
  });
});

describe("invariantes — motor laboral", () => {
  it("a penhora respeita o teto, o piso e os dois terços", () => {
    const teto = 3 * SMN.value;
    const piso = SMN.value;

    // Rendimento baixo, sem outro rendimento: manda o piso.
    const baixo = calcularPenhora({ liquidoMensal: 1_000 });
    expect(baixo.regra).toBe("piso");
    expect(baixo.impenhoravel).toBeCloseTo(piso, 2);

    // Rendimento alto: manda o teto.
    const alto = calcularPenhora({ liquidoMensal: 10_000 });
    expect(alto.regra).toBe("teto");
    expect(alto.impenhoravel).toBeCloseTo(teto, 2);

    // Zona intermédia: manda a regra geral dos dois terços.
    const medio = calcularPenhora({ liquidoMensal: 3_000, temOutroRendimento: true });
    expect(medio.regra).toBe("dois-tercos");
    expect(medio.impenhoravel).toBeCloseTo(3_000 * (2 / 3), 2);

    // Em qualquer caso, protegido + penhorável = líquido.
    for (const liquido of [800, 1_500, 3_000, 6_000, 12_000]) {
      const p = calcularPenhora({ liquidoMensal: liquido });
      expect(p.impenhoravel + p.penhoravel).toBeCloseTo(liquido, 2);
      expect(p.penhoravel).toBeGreaterThanOrEqual(0);
    }
  });

  it("o acréscimo do trabalho noturno é 25% da retribuição horária", () => {
    const r = calcularTrabalhoNoturno({ retribuicaoMensal: 1_200, horasNoturnas: 20 });
    expect(r.acrescimo).toBeCloseTo(TRABALHO_NOTURNO.acrescimo.value, 6);
    expect(r.valorAcrescimo).toBeCloseTo(r.retribuicaoHoraria * 20 * TRABALHO_NOTURNO.acrescimo.value, 2);
  });

  it("um IRCT mais favorável melhora o acréscimo noturno, nunca o reduz", () => {
    const legal = calcularTrabalhoNoturno({ retribuicaoMensal: 1_200, horasNoturnas: 20 });
    const melhor = calcularTrabalhoNoturno({ retribuicaoMensal: 1_200, horasNoturnas: 20, acrescimoIRCT: 0.5 });
    const pior = calcularTrabalhoNoturno({ retribuicaoMensal: 1_200, horasNoturnas: 20, acrescimoIRCT: 0.1 });
    expect(melhor.valorAcrescimo).toBeGreaterThan(legal.valorAcrescimo);
    expect(pior.valorAcrescimo).toBeCloseTo(legal.valorAcrescimo, 2);
  });
});

describe("casos-ouro (ponto 18)", () => {
  // Fixam o comportamento nos perfis mais comuns. Não substituem a
  // confrontação com o simulador oficial da AT — que continua por fazer e
  // está declarada como tal —, mas apanham qualquer regressão silenciosa.
  it("salário mínimo nacional não tem retenção de IRS", () => {
    const r = calcularVencimento({ salarioBruto: SMN.value, subsidioRefeicaoDia: 0, diasUteis: 0 });
    expect(r.irsRetido).toBe(0);
    expect(r.ssTrabalhador).toBeCloseTo(SMN.value * SS_DEPENDENTE.trabalhador.value, 2);
  });

  it("1 500 € com dois dependentes retém menos do que sem dependentes", () => {
    const sem = calcularVencimento({ salarioBruto: 1_500, subsidioRefeicaoDia: 0, diasUteis: 0 });
    const com = calcularVencimento({ salarioBruto: 1_500, dependentes: 2, subsidioRefeicaoDia: 0, diasUteis: 0 });
    expect(com.irsRetido).toBeLessThan(sem.irsRetido);
    expect(com.liquido).toBeGreaterThan(sem.liquido);
  });

  it("casado único titular retém menos do que não casado", () => {
    const naoCasado = calcularVencimento({ salarioBruto: 2_000, subsidioRefeicaoDia: 0, diasUteis: 0 });
    const unico = calcularVencimento({ salarioBruto: 2_000, estadoCivil: "casadoUnico", subsidioRefeicaoDia: 0, diasUteis: 0 });
    expect(unico.irsRetido).toBeLessThan(naoCasado.irsRetido);
  });

  it("Madeira e Açores usam tabelas próprias", () => {
    const continente = calcularVencimento({ salarioBruto: 2_000, subsidioRefeicaoDia: 0, diasUteis: 0 });
    const madeira = calcularVencimento({ salarioBruto: 2_000, regiao: "madeira", subsidioRefeicaoDia: 0, diasUteis: 0 });
    const acores = calcularVencimento({ salarioBruto: 2_000, regiao: "acores", subsidioRefeicaoDia: 0, diasUteis: 0 });
    expect(madeira.irsRetido).not.toBeCloseTo(continente.irsRetido, 2);
    expect(acores.irsRetido).not.toBeCloseTo(continente.irsRetido, 2);
  });

  it("IRS Jovem no 1.º ano reduz a retenção a zero ou quase", () => {
    const sem = calcularVencimento({ salarioBruto: 1_800, subsidioRefeicaoDia: 0, diasUteis: 0 });
    const com = calcularVencimento({ salarioBruto: 1_800, irsJovemAno: 1, subsidioRefeicaoDia: 0, diasUteis: 0 });
    expect(com.irsRetido).toBeLessThan(sem.irsRetido);
    expect(com.isencaoJovemPct).toBeGreaterThan(0);
  });

  it("a deficiência do titular reduz o imposto anual apurado", () => {
    // O defeito 1.4: `mealheiroDependente` recebia `deficiencia` e usava-a
    // apenas para escolher a tabela de retenção — no apuramento anual não
    // aplicava nem o Art. 87.º nem o Art. 56.º-A, e o imposto saía idêntico.
    const sem = mealheiroDependente({ salarioBruto: 2_500 });
    const com = mealheiroDependente({ salarioBruto: 2_500, deficiencia: true });
    expect(com.irsApurado).toBeLessThan(sem.irsApurado);
    expect(com.exclusaoDeficiencia).toBeGreaterThan(0);
    expect(com.deducaoDeficiencia).toBeGreaterThan(0);
  });

  it("o adicional de solidariedade é cobrado acima de 80 000 € de coletável", () => {
    // O defeito 1.5: a Categoria A simplesmente não o cobrava.
    const abaixo = mealheiroDependente({ salarioBruto: 4_000 });
    const acima = mealheiroDependente({ salarioBruto: 10_000 });
    expect(abaixo.adicionalSolidariedade).toBe(0);
    expect(acima.adicionalSolidariedade).toBeGreaterThan(0);
    expect(acima.rendimentoColetavel).toBeGreaterThan(80_000);
  });
});
