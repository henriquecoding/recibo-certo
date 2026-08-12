// Os prazos gerados têm de coincidir com a Agenda Fiscal oficial de 2026.
//
// Estas datas foram lidas dos PDF oficiais da AT (obrigações declarativas e
// obrigações de pagamento, edição de junho de 2026). O que estava no produto
// fixava os três pagamentos por conta no dia 20 e punha a declaração do 2.º
// trimestre em agosto — este ficheiro existe para isso não voltar.

import { describe, it, expect } from "vitest";
import {
  gerarPrazos,
  proximoDiaUtil,
  feriadosNacionais,
  prazosAvaliados,
  prazosAplicaveis,
  proximosPrazos,
  type PerfilPrazos,
} from "@/lib/prazos";

const data = (ano: number, id: string) => gerarPrazos(ano).find((p) => p.id === id)?.data;

describe("prazos: agenda oficial de 2026", () => {
  it("pagamentos por conta de IRS caem em 20/jul, 21/set e 21/dez", () => {
    // Fonte: AT — Agenda Fiscal 2026, obrigações de pagamento.
    // Setembro e dezembro saltam do dia 20 (domingo) para o dia útil seguinte.
    expect(data(2026, "irs-pc-2026-7")).toBe("2026-07-20");
    expect(data(2026, "irs-pc-2026-9")).toBe("2026-09-21");
    expect(data(2026, "irs-pc-2026-12")).toBe("2026-12-21");
  });

  it("declaração periódica de IVA trimestral: fev, mai, SET e nov", () => {
    // O 2.º trimestre entrega-se em setembro (Art. 41.º n.º 10 do CIVA), não
    // em agosto — era o erro do calendário anterior.
    expect(data(2026, "iva-decl-tri-2026-2")).toBe("2026-02-20");
    expect(data(2026, "iva-decl-tri-2026-5")).toBe("2026-05-20");
    expect(data(2026, "iva-decl-tri-2026-9")).toBe("2026-09-21");
    expect(data(2026, "iva-decl-tri-2026-11")).toBe("2026-11-20");
    expect(gerarPrazos(2026).some((p) => p.id === "iva-decl-tri-2026-8")).toBe(false);
  });

  it("pagamento de IVA trimestral é no dia 25, um prazo distinto da entrega", () => {
    expect(data(2026, "iva-pag-tri-2026-2")).toBe("2026-02-25");
    expect(data(2026, "iva-pag-tri-2026-5")).toBe("2026-05-25");
    expect(data(2026, "iva-pag-tri-2026-9")).toBe("2026-09-25");
    expect(data(2026, "iva-pag-tri-2026-11")).toBe("2026-11-25");
  });

  it("declarar e pagar são obrigações separadas", () => {
    const p = gerarPrazos(2026);
    expect(p.some((x) => x.natureza === "declaracao" && x.categoria === "iva")).toBe(true);
    expect(p.some((x) => x.natureza === "pagamento" && x.categoria === "iva")).toBe(true);
    // Nenhuma obrigação fica sem base legal, fonte e data de revisão.
    p.forEach((x) => {
      expect(x.base.length).toBeGreaterThan(0);
      expect(x.fonte.length).toBeGreaterThan(0);
      expect(x.revistoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it("declaração anual de IRS termina a 30 de junho", () => {
    expect(data(2026, "irs-decl-2026")).toBe("2026-06-30");
  });
});

describe("prazos: dias úteis e feriados", () => {
  it("transfere sábados, domingos e feriados para o dia útil seguinte", () => {
    expect(proximoDiaUtil("2026-09-20")).toBe("2026-09-21"); // domingo
    expect(proximoDiaUtil("2026-12-20")).toBe("2026-12-21"); // domingo
    expect(proximoDiaUtil("2026-02-20")).toBe("2026-02-20"); // sexta-feira
    expect(proximoDiaUtil("2026-12-25")).toBe("2026-12-28"); // Natal (sexta) → segunda
  });

  it("conhece os feriados fixos e os móveis da Páscoa", () => {
    const f = feriadosNacionais(2026);
    expect(f.has("2026-04-25")).toBe(true);
    expect(f.has("2026-12-25")).toBe(true);
    // Páscoa de 2026: 5 de abril. Sexta-feira Santa a 3, Corpo de Deus a 4/jun.
    expect(f.has("2026-04-05")).toBe(true);
    expect(f.has("2026-04-03")).toBe(true);
    expect(f.has("2026-06-04")).toBe(true);
  });

  it("acerta noutro ano sem ninguém lhe tocar", () => {
    // 2027: 20 de julho é terça, 20 de setembro segunda e 20 de dezembro
    // segunda — nenhum precisa de ajuste, ao contrário de 2026.
    expect(data(2027, "irs-pc-2027-7")).toBe("2027-07-20");
    expect(data(2027, "irs-pc-2027-9")).toBe("2027-09-20");
    expect(data(2027, "irs-pc-2027-12")).toBe("2027-12-20");
    // Mas o 4.º trimestre de IVA de 2027 entrega-se a 21 de fevereiro de 2028:
    // o dia 20 cai a um domingo.
    expect(data(2028, "iva-decl-tri-2028-2")).toBe("2028-02-21");
  });
});

describe("prazos: aplicabilidade por perfil", () => {
  const isento: PerfilPrazos = {
    regimeIVA: "isento",
    atividadeAberta: true,
    pagamentosPorConta: false,
    isencaoSSPrimeiroAno: false,
  };

  it("não mostra prazos de IVA a quem está isento pelo Art. 53.º", () => {
    const iva = prazosAplicaveis(2026, isento).filter((p) => p.categoria === "iva");
    expect(iva).toHaveLength(0);
  });

  it("não mostra pagamentos por conta a quem não os tem liquidados", () => {
    expect(prazosAplicaveis(2026, isento).some((p) => p.id.startsWith("irs-pc-"))).toBe(false);
  });

  it("no primeiro ano de atividade declara à SS mas não paga", () => {
    const primeiroAno: PerfilPrazos = { ...isento, isencaoSSPrimeiroAno: true };
    const ss = prazosAplicaveis(2026, primeiroAno).filter((p) => p.categoria === "ss");
    expect(ss.every((p) => p.natureza === "declaracao")).toBe(true);
    expect(ss.length).toBeGreaterThan(0);
  });

  it("sem perfil, marca o que precisa de informação em vez de assumir", () => {
    const avaliados = prazosAvaliados(2026);
    const iva = avaliados.filter((p) => p.categoria === "iva");
    expect(iva.every((p) => p.aplicabilidade === "preciso-de-informacao")).toBe(true);
    // E nunca entra na lista dos aplicáveis por omissão.
    expect(proximosPrazos(new Date(2026, 0, 1), 50, isento).every((p) => p.aplicabilidade === "aplicavel")).toBe(true);
  });

  it("o regime mensal e o trimestral não partilham prazos", () => {
    const mensal: PerfilPrazos = { ...isento, regimeIVA: "normal-mensal" };
    const trimestral: PerfilPrazos = { ...isento, regimeIVA: "normal-trimestral" };
    expect(prazosAplicaveis(2026, mensal).every((p) => !p.id.includes("-tri-"))).toBe(true);
    expect(prazosAplicaveis(2026, trimestral).every((p) => !p.id.includes("-mes-"))).toBe(true);
  });
});
