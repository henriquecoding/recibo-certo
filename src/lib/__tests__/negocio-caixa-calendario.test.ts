// ═══════════════════════════════════════════════════════════════════════
//  A CAIXA NO CALENDÁRIO REAL — §51-54, §58 e §104
//  ---------------------------------------------------------------------
//  A caixa v1 usava três médias: receita ÷ 12, custos ÷ 12, pessoal ÷ 12.
//  Nenhum destes fluxos é uniforme, e cada desvio cria um mês pior do que
//  a média — que é sempre o mês que decide se há dinheiro na conta.
//
//  Estes testes prendem os quatro casos do §104 e, sobretudo, garantem
//  que o calendário fiscal usado aqui é O MESMO que `prazos.ts` publica.
//  Dois calendários a divergir em silêncio seria pior do que nenhum.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  agregar,
  analisarNegocio,
  CALENDARIO_ENTREGAS,
  contextoNegocioVazio,
  fluxosDeIVA,
  fluxosDePayroll,
  novaOferta,
  novoInvestimento,
  novoTrabalhador,
  projetarCaixa,
  type ContextoNegocio,
  type FluxoCaixa,
  type TrabalhadorPlaneado,
} from "@/lib/negocio";
import { gerarPrazos } from "@/lib/prazos";

const ANO = 2026;
const SEM_ESCALA = { horizonteMeses: 24, escalaDe: (m: number) => (m >= 1 ? 1 : 0) };

function negocio(extra: Partial<ContextoNegocio> = {}): ContextoNegocio {
  const c = contextoNegocioVazio("ja_vendo");
  return {
    ...c,
    ofertas: [{ ...novaOferta("servico", { volumeMes: 10 }), respondidos: ["custo-direto"] }],
    caixa: { saldoInicial: 5_000, prazoRecebimentoDias: 0, prazoFornecedorDias: 0 },
    ...extra,
  };
}

const trabalhador = (inicioMes: number, salario = 1_500): TrabalhadorPlaneado => ({
  ...novoTrabalhador("Designer"),
  remuneracao: { salarioBaseMensal: salario },
  contrato: { inicioMes, pagamentoSubsidios: "normal" },
});

const somaTipo = (fluxos: readonly FluxoCaixa[], tipo: string, mes?: number) =>
  fluxos
    .filter((f) => f.tipo === tipo && (mes === undefined || f.mes === mes))
    .reduce((s, f) => s + f.valor, 0);

// ═══════════════════════════════════════════════════════════════════════
//  1. O CALENDÁRIO É O MESMO QUE `prazos.ts` PUBLICA
// ═══════════════════════════════════════════════════════════════════════

describe("caixa:calendario-bate-com-prazos", () => {
  const prazos = gerarPrazos(ANO);
  const mesDe = (iso: string) => Number(iso.slice(5, 7));

  it("o IVA trimestral paga-se nos meses que a agenda fiscal marca", () => {
    const pagamentos = prazos
      .filter((p) => p.id.startsWith("iva-pag-tri-"))
      .map((p) => mesDe(p.data))
      .sort((a, b) => a - b);

    // Fevereiro (4.º trimestre do ano anterior), maio, setembro, novembro.
    // O 2.º trimestre em SETEMBRO — Art. 41.º n.º 10 — é a razão de este
    // teste existir: a agenda anterior punha-o em agosto.
    expect(pagamentos).toEqual([2, 5, 9, 11]);

    const doCalendario = CALENDARIO_ENTREGAS.impostoTrimestralMes;
    expect(doCalendario[1]).toBe(5);
    expect(doCalendario[2]).toBe(9);
    expect(doCalendario[3]).toBe(11);
    // O 4.º trimestre paga-se em fevereiro do ano seguinte: 12 + 2.
    expect(doCalendario[4]).toBe(14);
    expect(doCalendario[4] - 12).toBe(2);
  });

  it("o IVA mensal paga-se dois meses depois das operações", () => {
    const mensal = prazos.filter((p) => p.id.startsWith("iva-pag-mes-"));
    expect(mensal.length).toBe(12);
    // A descrição de cada um nomeia o mês a que respeita: M−2.
    expect(CALENDARIO_ENTREGAS.impostoMensalMeses).toBe(2);
  });

  it("as contribuições e a retenção saem no mês seguinte", () => {
    // Segurança Social até dia 20 do mês seguinte (Art. 43.º CRC).
    const ss = prazos.filter((p) => p.categoria === "ss" && p.natureza === "pagamento");
    expect(ss.length).toBeGreaterThan(0);
    expect(CALENDARIO_ENTREGAS.contribuicoesMeses).toBe(1);
    expect(CALENDARIO_ENTREGAS.retencaoMeses).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2. CONTRATAÇÃO A MEIO DO ANO — §104
// ═══════════════════════════════════════════════════════════════════════

describe("caixa:payroll", () => {
  it("contratação no mês 7: zero folha salarial nos meses 1–6", () => {
    const ctx = negocio({
      estrutura: { overheadMensal: [], investimentosIniciais: [], trabalhadores: [trabalhador(6)] },
    });
    const fluxos = fluxosDePayroll(ctx, SEM_ESCALA);

    for (let mes = 1; mes <= 6; mes++) {
      expect(fluxos.filter((f) => f.mes === mes), `mês ${mes} não devia ter folha`).toHaveLength(0);
    }
    expect(fluxos.filter((f) => f.mes === 7).length).toBeGreaterThan(0);
  });

  it("a Segurança Social do mês sai no mês seguinte", () => {
    const ctx = negocio({
      estrutura: { overheadMensal: [], investimentosIniciais: [], trabalhadores: [trabalhador(0)] },
    });
    const fluxos = fluxosDePayroll(ctx, SEM_ESCALA);

    // Mês 1 tem salário e não tem contribuições; mês 2 tem as do mês 1.
    expect(somaTipo(fluxos, "salario", 1)).toBeLessThan(0);
    expect(somaTipo(fluxos, "ss", 1)).toBe(0);
    expect(somaTipo(fluxos, "ss", 2)).toBeLessThan(0);
  });

  it("os subsídios de férias e Natal saem em junho e dezembro", () => {
    const ctx = negocio({
      estrutura: { overheadMensal: [], investimentosIniciais: [], trabalhadores: [trabalhador(0)] },
    });
    const fluxos = fluxosDePayroll(ctx, SEM_ESCALA);

    const junho = fluxos.filter((f) => f.mes === 6 && f.origem.includes("férias"));
    const dezembro = fluxos.filter((f) => f.mes === 12 && f.origem.includes("Natal"));
    expect(junho).toHaveLength(1);
    expect(dezembro).toHaveLength(1);
    // E não há subsídios em maio nem em novembro.
    expect(fluxos.filter((f) => f.mes === 5 && f.origem.includes("subsídio"))).toHaveLength(0);
  });

  it("junho e dezembro custam mais do que a média — é esse o ponto", () => {
    const ctx = negocio({
      estrutura: { overheadMensal: [], investimentosIniciais: [], trabalhadores: [trabalhador(0)] },
    });
    const fluxos = fluxosDePayroll(ctx, SEM_ESCALA);
    const saidaDe = (mes: number) =>
      Math.abs(fluxos.filter((f) => f.mes === mes).reduce((s, f) => s + f.valor, 0));

    expect(saidaDe(6)).toBeGreaterThan(saidaDe(5) * 1.3);
    expect(saidaDe(12)).toBeGreaterThan(saidaDe(11) * 1.3);
  });

  it("em duodécimos não há picos — o total do ano é o mesmo", () => {
    const comPicos = negocio({
      estrutura: { overheadMensal: [], investimentosIniciais: [], trabalhadores: [trabalhador(0)] },
    });
    const diluido = negocio({
      estrutura: {
        overheadMensal: [],
        investimentosIniciais: [],
        trabalhadores: [
          { ...trabalhador(0), contrato: { inicioMes: 0, pagamentoSubsidios: "duodecimos" } },
        ],
      },
    });

    const totalDoAno = (ctx: ContextoNegocio) =>
      Math.abs(
        fluxosDePayroll(ctx, { horizonteMeses: 12, escalaDe: () => 1 })
          .filter((f) => f.mes <= 12)
          .reduce((s, f) => s + f.valor, 0),
      );

    // O calendário muda; o custo do ano não (a menos de arredondamentos e
    // do desfasamento de dezembro, que cai fora do horizonte).
    expect(Math.abs(totalDoAno(comPicos) - totalDoAno(diluido))).toBeLessThan(
      totalDoAno(comPicos) * 0.12,
    );
  });

  it("um posto sem salário não gera fluxo nenhum", () => {
    const ctx = negocio({
      estrutura: {
        overheadMensal: [],
        investimentosIniciais: [],
        trabalhadores: [novoTrabalhador("Por definir")],
      },
    });
    expect(fluxosDePayroll(ctx, SEM_ESCALA)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3. O CALENDÁRIO DE IVA — §53, §104
// ═══════════════════════════════════════════════════════════════════════

describe("caixa:iva", () => {
  const agregadoFalso = {
    ivaCobradoMes: 1_000,
  } as Parameters<typeof fluxosDeIVA>[0];

  it("mensal: o IVA de janeiro sai em março", () => {
    const f = fluxosDeIVA(agregadoFalso, "mensal", SEM_ESCALA);
    const doMes1 = f.find((x) => x.origem.includes("no mês 1"));
    expect(doMes1?.mes).toBe(3);
    expect(doMes1?.valor).toBe(-1_000);
  });

  it("trimestral: o 1.º trimestre sai em maio e o 2.º em setembro", () => {
    const f = fluxosDeIVA(agregadoFalso, "trimestral", SEM_ESCALA);
    const t1 = f.find((x) => x.origem.startsWith("IVA do 1.º"));
    const t2 = f.find((x) => x.origem.startsWith("IVA do 2.º"));

    expect(t1?.mes).toBe(5);
    // Art. 41.º n.º 10 — setembro, não agosto.
    expect(t2?.mes).toBe(9);
    // Três meses de IVA de cada vez.
    expect(t1?.valor).toBe(-3_000);
  });

  it("o 4.º trimestre sai em fevereiro do ano seguinte", () => {
    const f = fluxosDeIVA(agregadoFalso, "trimestral", SEM_ESCALA);
    const t4 = f.find((x) => x.origem.startsWith("IVA do 4.º"));
    expect(t4?.mes).toBe(14);
  });

  it("sem periodicidade não há fluxos de IVA — não se inventa calendário", () => {
    expect(fluxosDeIVA(agregadoFalso, null, SEM_ESCALA)).toHaveLength(0);
  });

  it("sem IVA cobrado não há nada a entregar", () => {
    expect(
      fluxosDeIVA({ ivaCobradoMes: 0 } as Parameters<typeof fluxosDeIVA>[0], "mensal", SEM_ESCALA),
    ).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4. INVESTIMENTOS E RECEBIMENTOS — §58, §104
// ═══════════════════════════════════════════════════════════════════════

describe("caixa:timing", () => {
  it("investimento no mês 4 sai no mês 4, não no mês 0", () => {
    const ctx = negocio({
      estrutura: {
        overheadMensal: [],
        investimentosIniciais: [{ ...novoInvestimento("equipamento", "Forno"), valor: 9_000, mes: 4 }],
      },
    });
    const r = projetarCaixa(ctx, agregar(ctx));

    expect(r.meses[3].investimentos).toBeCloseTo(9_000, 1);
    expect(r.meses[0].investimentos).toBe(0);
  });

  it("investimento sem mês declarado sai antes de abrir", () => {
    const ctx = negocio({
      estrutura: {
        overheadMensal: [],
        investimentosIniciais: [{ ...novoInvestimento("obras", "Obras"), valor: 9_000, mes: 0 }],
      },
    });
    const r = projetarCaixa(ctx, agregar(ctx));

    // Sai do saldo inicial, antes do mês 1 — e o mês 1 já abre com o
    // buraco feito.
    expect(r.meses[0].investimentos).toBe(0);
    expect(r.meses[0].saldoFim).toBeLessThan(5_000);
  });

  it("recebimento a 60 dias desloca mesmo o dinheiro", () => {
    const imediato = projetarCaixa(negocio());
    const adiado = projetarCaixa(
      negocio({ caixa: { saldoInicial: 5_000, prazoRecebimentoDias: 60, prazoFornecedorDias: 0 } }),
    );

    expect(imediato.meses[0].recebimentos).toBeGreaterThan(0);
    expect(adiado.meses[0].recebimentos).toBe(0);
    expect(adiado.meses[1].recebimentos).toBe(0);
    expect(adiado.meses[2].recebimentos).toBeGreaterThan(0);
    // E o saldo mínimo é pior, que é a informação que faltava.
    expect(adiado.saldoMinimo).toBeLessThan(imediato.saldoMinimo);
  });

  it("os fluxos vêm etiquetados, para o mês poder ser explicado (§52)", () => {
    const ctx = negocio({
      estrutura: { overheadMensal: [], investimentosIniciais: [], trabalhadores: [trabalhador(0)] },
    });
    const r = projetarCaixa(ctx, agregar(ctx));

    expect(r.fluxos).toBeTruthy();
    const tipos = new Set((r.fluxos ?? []).map((f) => f.tipo));
    expect(tipos.has("recebimento")).toBe(true);
    expect(tipos.has("salario")).toBe(true);
    expect(tipos.has("ss")).toBe(true);
    // E cada um sabe explicar-se.
    expect((r.fluxos ?? []).every((f) => f.origem.length > 0)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  5. A CAIXA APENAS AGREGA — §52
// ═══════════════════════════════════════════════════════════════════════

describe("caixa:agrega", () => {
  it("a soma dos fluxos de um mês é o fluxo do mês", () => {
    const ctx = negocio({
      estrutura: { overheadMensal: [], investimentosIniciais: [], trabalhadores: [trabalhador(0)] },
    });
    const r = projetarCaixa(ctx, agregar(ctx));

    for (const m of r.meses) {
      const soma = (r.fluxos ?? [])
        .filter((f) => f.mes === m.mes)
        .reduce((s, f) => s + f.valor, 0);
      expect(soma, `mês ${m.mes}`).toBeCloseTo(m.fluxo, 1);
    }
  });

  it("o saldo de cada mês é o do anterior mais o fluxo", () => {
    const ctx = negocio({
      estrutura: { overheadMensal: [], investimentosIniciais: [], trabalhadores: [trabalhador(3)] },
    });
    const r = projetarCaixa(ctx, agregar(ctx));

    for (let i = 1; i < r.meses.length; i++) {
      expect(r.meses[i].saldoFim).toBeCloseTo(r.meses[i - 1].saldoFim + r.meses[i].fluxo, 1);
    }
  });

  it("um negócio sem nada não rebenta a projeção", () => {
    const vazio = contextoNegocioVazio("ideia");
    expect(() => projetarCaixa(vazio)).not.toThrow();
    expect(projetarCaixa(vazio).meses.length).toBe(12);
  });

  it("o resultado continua a expor o capital que falta", () => {
    const ctx = negocio({
      caixa: { saldoInicial: 0, prazoRecebimentoDias: 90, prazoFornecedorDias: 0 },
      estrutura: {
        overheadMensal: [],
        investimentosIniciais: [],
        trabalhadores: [trabalhador(0, 2_000)],
      },
    });
    const r = analisarNegocio(ctx, { comCaixa: true }).caixa!;

    expect(r.saldoMinimo).toBeLessThan(0);
    expect(r.capitalAdicionalNecessario).toBeGreaterThan(Math.abs(r.saldoMinimo));
  });
});
