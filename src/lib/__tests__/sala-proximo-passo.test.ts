// ═══════════════════════════════════════════════════════════════════════
//  O próximo passo
//  ---------------------------------------------------------------------
//  A ordem das regras é a especificação do produto: é ela que decide o que
//  uma pessoa vê primeiro ao abrir a sala. Um `if` trocado aqui não parte
//  nada e não dá erro — só passa a mostrar «marca uma consulta» a quem
//  tinha um prazo a acabar ontem. Por isso a ordem é testada, e não só o
//  resultado de cada regra isolada.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  contarPendencias,
  descreverPrazo,
  pedidosPorTratar,
  proximoPasso,
  type RetratoDaRelacao,
} from "@/lib/contabilistas/sala/proximo-passo";
import { diasAtePrazo, type EstadoPedido, type PedidoCliente } from "@/lib/contabilistas/sala/tipos";

const AGORA = new Date("2026-08-16T10:00:00Z");

function dia(offset: number): string {
  const d = new Date(AGORA);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function instante(offsetDias: number, hora = 15): string {
  const d = new Date(AGORA);
  d.setUTCDate(d.getUTCDate() + offsetDias);
  d.setUTCHours(hora, 0, 0, 0);
  return d.toISOString();
}

function pedido(over: Partial<PedidoCliente> = {}): PedidoCliente {
  return {
    id: "p1", vinculoId: "v1", criadoPor: "cc", tipo: "documento",
    titulo: "Comprovativo de retenções", descricao: null,
    prazo: null, obrigatorio: true, estado: "aberto" as EstadoPedido,
    respostaTexto: null, respostaMensagemId: null,
    respondidoEm: null, concluidoEm: null,
    criadoEm: instante(-2),
    ...over,
  };
}

function retrato(over: Partial<RetratoDaRelacao> = {}): RetratoDaRelacao {
  return {
    papel: "cliente", estadoVinculo: "ativo",
    pedidos: [], consultas: [],
    mensagensPorLer: 0, partilhasPorLer: 0, porPagarCents: 0,
    aceitaPagamentos: true,
    agora: AGORA,
    ...over,
  };
}

describe("próximo passo: o cliente", () => {
  it("sem nada pendente, diz que não há nada — e não inventa uma tarefa", () => {
    const p = proximoPasso(retrato({ consultas: [{ id: "c", inicio: instante(5), estado: "confirmado" }] }));
    expect(p.tom).not.toBe("acao");
  });

  it("com a relação por aceitar, só há uma coisa a dizer", () => {
    const p = proximoPasso(retrato({ estadoVinculo: "pendente", mensagensPorLer: 3 }));
    expect(p.chave).toBe("aguarda_aceitacao");
    expect(p.tom).toBe("espera");
    // Nada mais pode aparecer: ainda não há relação onde pendurar tarefas.
    expect(p.outras).toBe(0);
  });

  it("põe o pedido com prazo à frente de tudo o resto", () => {
    const p = proximoPasso(retrato({
      pedidos: [pedido({ prazo: dia(3) })],
      porPagarCents: 5000,
      mensagensPorLer: 2,
      consultas: [{ id: "c", inicio: instante(1), estado: "confirmado" }],
    }));
    expect(p.chave).toBe("pedido_aberto");
    expect(p.titulo).toBe("Comprovativo de retenções");
    expect(p.cta).toBe("Responder");
  });

  it("ordena os pedidos pelo prazo mais próximo, e os sem prazo por último", () => {
    const p = proximoPasso(retrato({
      pedidos: [
        pedido({ id: "a", titulo: "Sem prazo", prazo: null }),
        pedido({ id: "b", titulo: "Daqui a 10 dias", prazo: dia(10) }),
        pedido({ id: "c", titulo: "Amanhã", prazo: dia(1) }),
      ],
    }));
    expect(p.titulo).toBe("Amanhã");
    expect(p.outras).toBe(2);
  });

  it("marca o prazo passado como atraso, e o atraso vem antes do que ainda dá", () => {
    const p = proximoPasso(retrato({
      pedidos: [
        pedido({ id: "a", titulo: "Ainda dá", prazo: dia(5) }),
        pedido({ id: "b", titulo: "Já passou", prazo: dia(-3) }),
      ],
    }));
    expect(p.titulo).toBe("Já passou");
    expect(p.tom).toBe("atraso");
    expect(p.detalhe).toBe("Estava para há 3 dias.");
  });

  it("põe o pagamento à frente da consulta futura", () => {
    const p = proximoPasso(retrato({
      porPagarCents: 4500,
      consultas: [{ id: "c", inicio: instante(2), estado: "confirmado" }],
    }));
    expect(p.chave).toBe("por_pagar");
    expect(p.destino).toBe("pagamento");
  });

  it("não oferece pagar a quem não tem por onde receber", () => {
    // O beco sem saída que isto fecha: `consultas_por_pagar` não filtra
    // pela conta Stripe, por isso uma consulta realizada aparecia por
    // liquidar mesmo quando o contabilista nunca acabou de ligar a conta.
    // O botão levava a uma recusa do servidor, e a pessoa ficava a achar
    // que tinha falhado alguma coisa que ela fez.
    const p = proximoPasso(retrato({ porPagarCents: 4500, aceitaPagamentos: false }));
    expect(p.chave).not.toBe("por_pagar");
    expect(p.cta).not.toBe("Pagar agora");
  });

  it("volta a oferecer pagar assim que a conta fica a receber", () => {
    const p = proximoPasso(retrato({ porPagarCents: 4500, aceitaPagamentos: true }));
    expect(p.chave).toBe("por_pagar");
  });

  it("diz que está à espera quando a consulta ainda não foi confirmada", () => {
    const p = proximoPasso(retrato({
      consultas: [{ id: "c", inicio: instante(3), estado: "pedido" }],
    }));
    expect(p.chave).toBe("consulta_por_confirmar");
    expect(p.tom).toBe("espera");
    expect(p.cta).toBeNull();
  });

  it("ignora consultas que já passaram ou foram canceladas", () => {
    const p = proximoPasso(retrato({
      consultas: [
        { id: "a", inicio: instante(-5), estado: "confirmado" },
        { id: "b", inicio: instante(3), estado: "cancelado_cliente" },
      ],
    }));
    expect(p.chave).toBe("sem_consulta");
  });

  it("só convida a marcar quando não há mais nada a fazer", () => {
    const comMensagem = proximoPasso(retrato({ mensagensPorLer: 1 }));
    expect(comMensagem.chave).toBe("mensagem_por_ler");

    const semNada = proximoPasso(retrato({}));
    expect(semNada.chave).toBe("sem_consulta");
    expect(semNada.tom).toBe("calma");
  });

  it("não conta um pedido já respondido como coisa por fazer", () => {
    const p = proximoPasso(retrato({
      pedidos: [pedido({ estado: "respondido", respondidoEm: instante(-1) })],
    }));
    expect(p.chave).not.toBe("pedido_aberto");
  });
});

describe("próximo passo: o contabilista", () => {
  const cc = (over: Partial<RetratoDaRelacao> = {}) =>
    retrato({ papel: "contabilista", ...over });

  it("decidir o vínculo vem antes de tudo", () => {
    const p = proximoPasso(cc({ estadoVinculo: "pendente", mensagensPorLer: 5 }));
    expect(p.chave).toBe("vinculo_por_decidir");
    expect(p.cta).toBe("Decidir");
  });

  it("a resposta do cliente é a pendência mais cara, e vem primeiro", () => {
    const p = proximoPasso(cc({
      pedidos: [pedido({ estado: "respondido", respondidoEm: instante(-1) })],
      mensagensPorLer: 3,
      partilhasPorLer: 2,
    }));
    expect(p.chave).toBe("pedido_respondido");
    expect(p.titulo).toContain("Comprovativo de retenções");
  });

  it("trata primeiro a resposta que está à espera há mais tempo", () => {
    const p = proximoPasso(cc({
      pedidos: [
        pedido({ id: "a", titulo: "Recente", estado: "respondido", respondidoEm: instante(-1) }),
        pedido({ id: "b", titulo: "Antiga", estado: "respondido", respondidoEm: instante(-9) }),
      ],
    }));
    expect(p.titulo).toContain("Antiga");
  });

  it("mostra o que está do lado do cliente como espera, não como tarefa", () => {
    const p = proximoPasso(cc({ pedidos: [pedido({ prazo: dia(4) })] }));
    expect(p.chave).toBe("aguarda_cliente");
    expect(p.tom).toBe("espera");
    expect(p.cta).toBeNull();
  });

  it("não mostra a espera quando há trabalho real por fazer", () => {
    const p = proximoPasso(cc({ pedidos: [pedido()], mensagensPorLer: 1 }));
    expect(p.chave).toBe("mensagem_por_ler");
  });
});

describe("próximo passo: o contador de «e mais N»", () => {
  it("conta só o que exige ação, não o que está à espera do outro", () => {
    const r = retrato({
      pedidos: [pedido({ id: "a", prazo: dia(1) }), pedido({ id: "b", prazo: dia(2) })],
      porPagarCents: 1000,
      consultas: [{ id: "c", inicio: instante(4), estado: "confirmado" }],
    });
    // dois pedidos + pagamento = 3 acionáveis; a consulta confirmada é espera.
    expect(contarPendencias(r)).toBe(3);
    expect(proximoPasso(r).outras).toBe(2);
  });

  it("não conta nada quando não há nada", () => {
    expect(contarPendencias(retrato({}))).toBe(0);
  });
});

describe("prazos", () => {
  it("conta em dias de calendário, não em blocos de 24 horas", () => {
    // 23h de hoje e 8h de amanhã são «amanhã» na mesma; uma diferença em
    // horas dava zero a meio da tarde da véspera.
    const tarde = new Date("2026-08-16T22:00:00Z");
    expect(diasAtePrazo("2026-08-17", tarde)).toBe(1);
    expect(diasAtePrazo("2026-08-16", tarde)).toBe(0);
  });

  it("fala como uma pessoa fala", () => {
    expect(descreverPrazo(0, true)).toBe("É para hoje.");
    expect(descreverPrazo(1, true)).toBe("É para amanhã.");
    expect(descreverPrazo(-1, true)).toBe("Era para ontem.");
    expect(descreverPrazo(3, true)).toBe("Faltam 3 dias.");
    expect(descreverPrazo(null, false)).toBe("Quando puderes.");
    expect(descreverPrazo(null, true)).toBeNull();
  });
});

describe("pedidos por tratar", () => {
  it("deixa de fora o que já foi fechado", () => {
    const lista = [
      pedido({ id: "a", estado: "concluido" }),
      pedido({ id: "b", estado: "cancelado" }),
      pedido({ id: "c", estado: "aberto" }),
      pedido({ id: "d", estado: "em_analise" }),
    ];
    expect(pedidosPorTratar(lista, AGORA).map((p) => p.id)).toEqual(["c", "d"]);
  });
});
