// O calendário do simulador tem de dizer as datas da agenda fiscal oficial.
//
// Havia um motor de prazos correto em `src/lib/prazos.ts`, com um teste a
// fixar-lhe as datas — e um segundo calendário, escrito à mão dentro de
// `TimelineFiscal.tsx`, que não o lia e repetia exatamente os erros que esse
// teste existia para impedir: o IVA do 2.º trimestre em agosto e o acerto de
// IRS em junho. Este ficheiro fecha essa porta: o calendário do simulador
// passa a ser composto a partir do motor, e é aqui que isso se prova.

import { describe, it, expect } from "vitest";
import {
  construirCalendarioFiscal,
  dataCurta,
  dataPorExtenso,
  mesDaData,
  progressoDoAno,
  regimeIVAPorVolume,
  type CalendarioFiscalInput,
} from "@/lib/calendario-fiscal";
import { FONTES_PRAZOS } from "@/lib/prazos";

const FEV = 1, ABR = 3, MAI = 4, JUN = 5, JUL = 6, AGO = 7, SET = 8, NOV = 10, DEZ = 11;

const base: CalendarioFiscalInput = {
  ano: 2026,
  ssMensal: 224.7,
  isencaoSS: false,
  acertoIRS: 0,
  regimeIVA: "isento",
  ivaAnual: 0,
};

const construir = (over: Partial<CalendarioFiscalInput> = {}) =>
  construirCalendarioFiscal({ ...base, ...over });

/** Meses (0–11) em que aparece um movimento com este rótulo. */
const mesesCom = (cal: ReturnType<typeof construir>, rotulo: string) =>
  cal.movimentos.filter((m) => m.rotulo === rotulo).map((m) => mesDaData(m.data));

describe("calendário fiscal: o acerto de IRS não é em junho", () => {
  it("o imposto a pagar sai a 31 de agosto, não no fim do prazo de entrega", () => {
    // Junho é o limite da ENTREGA da declaração (Art. 60.º). O dinheiro só se
    // move até 31 de agosto (Art. 97.º n.º 1 al. a)) — era este o erro que
    // mandava reservar dois meses cedo demais.
    const cal = construir({ acertoIRS: -2237.23 });
    const acerto = cal.movimentos.find((m) => m.rotulo === "Acerto IRS");
    expect(acerto?.data).toBe("2026-08-31");
    expect(mesDaData(acerto!.data)).toBe(AGO);
    expect(acerto?.valor).toBe(2237.23);
    expect(acerto?.sentido).toBe("saida");
    expect(acerto?.base).toContain("97.º");
  });

  it("o reembolso partilha o prazo do pagamento, por remissão do Art. 96.º", () => {
    const cal = construir({ acertoIRS: 2237.23 });
    const reembolso = cal.movimentos.find((m) => m.rotulo === "Reembolso");
    expect(reembolso?.data).toBe("2026-08-31");
    expect(reembolso?.sentido).toBe("entrada");
    expect(reembolso?.base).toContain("96.º");
    // E não conta como saída: entra do outro lado do total.
    expect(cal.totais.saidas).toBe(cal.totais.ss);
    expect(cal.totais.entradas).toBe(2237.23);
    // Os totais somam-se ao cêntimo, não em vírgula flutuante crua:
    // 224,70 × 12 dá 2696,3999999999996 em JS e 2696,40 no calendário.
    expect(cal.totais.liquido).toBe(459.17);
  });

  it("nunca há acerto a pagar e reembolso ao mesmo tempo", () => {
    expect(mesesCom(construir({ acertoIRS: -100 }), "Reembolso")).toHaveLength(0);
    expect(mesesCom(construir({ acertoIRS: 100 }), "Acerto IRS")).toHaveLength(0);
    expect(mesesCom(construir({ acertoIRS: 0 }), "Acerto IRS")).toHaveLength(0);
    expect(mesesCom(construir({ acertoIRS: 0 }), "Reembolso")).toHaveLength(0);
  });

  it("junho continua a ter a entrega da declaração — mas sem dinheiro", () => {
    const cal = construir({ acertoIRS: -2237.23 });
    const junho = cal.meses[JUN];
    expect(junho.movimentos.some((m) => m.rotulo === "Declaração IRS")).toBe(true);
    expect(junho.saidas).toBe(base.ssMensal);   // só a contribuição da SS
    expect(cal.meses[JUN].movimentos.every((m) => m.rotulo !== "Acerto IRS")).toBe(true);
  });

  it("transfere o acerto para dia útil quando 31 de agosto é domingo", () => {
    // 31 de agosto de 2025 caiu a um domingo: o prazo corre para 1 de setembro.
    const cal = construir({ ano: 2025, acertoIRS: -500 });
    const acerto = cal.movimentos.find((m) => m.rotulo === "Acerto IRS");
    expect(acerto?.data).toBe("2025-09-01");
    expect(acerto?.dataBase).toBe("2025-08-31");
    expect(mesDaData(acerto!.data)).toBe(SET);
  });
});

describe("calendário fiscal: IVA", () => {
  const comIVA = { regimeIVA: "normal-trimestral" as const, ivaAnual: 4000 };

  it("o 2.º trimestre entrega-se em setembro — nunca em agosto", () => {
    // Art. 41.º n.º 10 do CIVA. `MESES_IVA = [1,4,7,10]` punha-o em agosto.
    const cal = construir(comIVA);
    expect(mesesCom(cal, "Declaração IVA")).toEqual([FEV, MAI, SET, NOV]);
    expect(mesesCom(cal, "IVA")).toEqual([FEV, MAI, SET, NOV]);
    expect(mesesCom(cal, "IVA")).not.toContain(AGO);
  });

  it("declarar ao dia 20 e pagar ao dia 25 são dois prazos distintos", () => {
    const cal = construir(comIVA);
    const decl = cal.movimentos.filter((m) => m.rotulo === "Declaração IVA");
    const pag = cal.movimentos.filter((m) => m.rotulo === "IVA");
    expect(decl.map((m) => m.data)).toEqual([
      "2026-02-20", "2026-05-20", "2026-09-21", "2026-11-20",
    ]);
    expect(pag.map((m) => m.data)).toEqual([
      "2026-02-25", "2026-05-25", "2026-09-25", "2026-11-25",
    ]);
    expect(decl.every((m) => m.valor === 0)).toBe(true);
    expect(pag.every((m) => m.valor === 1000)).toBe(true);
  });

  it("o regime mensal paga todos os meses e não partilha prazos com o trimestral", () => {
    const cal = construir({ regimeIVA: "normal-mensal", ivaAnual: 12000 });
    expect(mesesCom(cal, "IVA")).toHaveLength(12);
    expect(cal.movimentos.every((m) => !m.id.includes("-tri-"))).toBe(true);
    expect(cal.totais.iva).toBe(12000);
  });

  it("quem está isento pelo Art. 53.º não vê um único prazo de IVA", () => {
    const cal = construir({ regimeIVA: "isento", ivaAnual: 4000 });
    expect(cal.movimentos.filter((m) => m.tipo === "iva")).toHaveLength(0);
    expect(cal.totais.iva).toBe(0);
  });

  it("sem IVA apurado mantém a declaração e dispensa o pagamento", () => {
    const cal = construir({ regimeIVA: "normal-trimestral", ivaAnual: 0 });
    expect(mesesCom(cal, "Declaração IVA")).toHaveLength(4);
    expect(mesesCom(cal, "IVA")).toHaveLength(0);
  });

  it("o limiar dos 650 000 € separa mensal de trimestral", () => {
    expect(regimeIVAPorVolume(false, 900_000, 650_000)).toBe("isento");
    expect(regimeIVAPorVolume(true, 649_999, 650_000)).toBe("normal-trimestral");
    expect(regimeIVAPorVolume(true, 650_000, 650_000)).toBe("normal-mensal");
  });
});

describe("calendário fiscal: Segurança Social", () => {
  it("paga nos doze meses, sempre ao dia 20 ou no dia útil seguinte", () => {
    const cal = construir();
    const pagamentos = cal.movimentos.filter((m) => m.rotulo === "SS");
    expect(pagamentos).toHaveLength(12);
    expect(pagamentos.map((m) => mesDaData(m.data))).toEqual([...Array(12).keys()]);
    // Setembro e dezembro de 2026: o dia 20 é domingo.
    expect(pagamentos[SET].data).toBe("2026-09-21");
    expect(pagamentos[DEZ].data).toBe("2026-12-21");
    expect(cal.totais.ss).toBe(2696.4);
  });

  it("na isenção do primeiro ano declara à mesma — não fica um ano em branco", () => {
    // Era o buraco do calendário antigo: com `isencaoSS` escrevia «Sem
    // obrigações» em onze meses, quando a declaração trimestral se mantém.
    const cal = construir({ isencaoSS: true, ssMensal: 0 });
    expect(mesesCom(cal, "SS")).toHaveLength(0);
    // Fevereiro e novembro, não janeiro e outubro: 31 de janeiro e 31 de
    // outubro de 2026 caem a sábado, e o prazo transita para o dia útil
    // seguinte — que já é do mês a seguir. Um calendário que os desenhasse
    // em janeiro e outubro estaria a mostrar o mês errado.
    expect(mesesCom(cal, "Declaração SS")).toEqual([FEV, ABR, JUL, NOV]);
    expect(cal.totais.ss).toBe(0);
  });

  it("a declaração trimestral cai no último dia do mês, não ao dia 20", () => {
    const cal = construir();
    const decl = cal.movimentos.filter((m) => m.rotulo === "Declaração SS");
    expect(decl.map((m) => m.data)).toEqual([
      "2026-02-02", // 31 de janeiro é sábado → segunda-feira seguinte
      "2026-04-30",
      "2026-07-31",
      "2026-11-02", // 31 de outubro é sábado; 1 de novembro é feriado
    ]);
    expect(decl.every((m) => m.valor === 0 && m.sentido === "neutro")).toBe(true);
  });
});

describe("calendário fiscal: pagamentos por conta", () => {
  const ppc = { pagamentosConta: { total: 900, prestacao: 300, meses: [7, 9, 12] } };

  it("segue a agenda oficial de 2026: 20/jul, 21/set e 21/dez", () => {
    const cal = construir(ppc);
    const pc = cal.movimentos.filter((m) => m.tipo === "ppc");
    expect(pc.map((m) => m.data)).toEqual(["2026-07-20", "2026-09-21", "2026-12-21"]);
    expect(pc.map((m) => mesDaData(m.data))).toEqual([JUL, SET, DEZ]);
    expect(cal.totais.ppc).toBe(900);
  });

  it("sem prestação exigível não inventa marcos no calendário", () => {
    const cal = construir({ pagamentosConta: { total: 0, prestacao: 0, meses: [] } });
    expect(cal.movimentos.filter((m) => m.tipo === "ppc")).toHaveLength(0);
    expect(cal.totais.ppc).toBe(0);
  });
});

describe("calendário fiscal: integridade", () => {
  const completo = construir({
    acertoIRS: -1500,
    regimeIVA: "normal-trimestral",
    ivaAnual: 4000,
    pagamentosConta: { total: 900, prestacao: 300, meses: [7, 9, 12] },
  });

  it("nenhum movimento chega ao ecrã sem base legal, fonte e data de revisão", () => {
    expect(completo.movimentos.length).toBeGreaterThan(0);
    completo.movimentos.forEach((m) => {
      expect(m.base.length).toBeGreaterThan(0);
      expect(m.revistoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(FONTES_PRAZOS[m.fonte]).toBeDefined();
      expect(FONTES_PRAZOS[m.fonte].url).toMatch(/^https:\/\//);
    });
  });

  it("os identificadores são únicos — o reembolso não colide com o pagamento", () => {
    const comReembolso = construir({ acertoIRS: 2000 });
    [completo, comReembolso].forEach((cal) => {
      const ids = cal.movimentos.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it("todas as datas caem dentro do ano do calendário, salvo transferência", () => {
    completo.movimentos.forEach((m) => {
      expect(m.data.startsWith("2026-")).toBe(true);
    });
  });

  it("os totais fecham com a soma dos meses", () => {
    const somaSaidas = completo.meses.reduce((s, m) => s + m.saidas, 0);
    const somaEntradas = completo.meses.reduce((s, m) => s + m.entradas, 0);
    expect(Math.round(somaSaidas * 100)).toBe(Math.round(completo.totais.saidas * 100));
    expect(Math.round(somaEntradas * 100)).toBe(Math.round(completo.totais.entradas * 100));
    expect(completo.totais.saidas).toBe(
      completo.totais.ss + completo.totais.iva + completo.totais.ppc + completo.totais.irs,
    );
  });

  it("dentro do mesmo dia o dinheiro vem antes da papelada", () => {
    completo.meses.forEach((mes) => {
      mes.movimentos.forEach((m, i) => {
        const anterior = mes.movimentos[i - 1];
        if (!anterior || anterior.data !== m.data) return;
        expect(anterior.natureza === "pagamento" || m.natureza === "declaracao").toBe(true);
      });
    });
  });

  it("cada mês só recebe os movimentos da sua data", () => {
    completo.meses.forEach((mes) => {
      mes.movimentos.forEach((m) => expect(mesDaData(m.data)).toBe(mes.indice));
    });
  });

  it("valores negativos ou inválidos não passam para o calendário", () => {
    const cal = construir({ ssMensal: -50, ivaAnual: Number.NaN, regimeIVA: "normal-trimestral" });
    expect(cal.totais.ss).toBe(0);
    expect(cal.totais.iva).toBe(0);
    expect(cal.movimentos.every((m) => m.valor >= 0)).toBe(true);
  });
});

describe("calendário fiscal: apresentação", () => {
  it("formata as datas em português, sem depender do fuso do servidor", () => {
    expect(dataCurta("2026-08-31")).toBe("31 ago");
    expect(dataCurta("2026-01-02")).toBe("2 jan");
    expect(dataPorExtenso("2026-08-31")).toBe("31 de agosto de 2026");
    expect(dataPorExtenso("2026-03-01")).toBe("1 de março de 2026");
  });

  it("o progresso do ano conta dias, não meses inteiros", () => {
    // `(mes + 1) / 12` dava 67% logo a 1 de agosto: quase um mês de avanço.
    expect(Math.round(progressoDoAno(new Date(2026, 7, 1)) * 100)).toBe(58);
    expect(Math.round(progressoDoAno(new Date(2026, 0, 1)) * 100)).toBe(0);
    expect(Math.round(progressoDoAno(new Date(2026, 11, 31)) * 100)).toBe(100);
  });
});
