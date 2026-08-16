// ═══════════════════════════════════════════════════════════════════════
//  A máquina de estados dos recebimentos
//  ---------------------------------------------------------------------
//  O caso que fez este módulo existir está em «já cobra, mas o dinheiro
//  ainda não sai»: `charges_enabled` verdadeiro e `payouts_enabled` falso.
//  A interface anterior lia o primeiro, mostrava «tudo pronto», e o
//  contabilista só descobria que o dinheiro estava preso quando fosse à
//  procura dele. É o primeiro teste da segunda secção, e é o que não pode
//  voltar a passar despercebido.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  classificarRecebimentos,
  comoOClienteVe,
  requisitosLegiveis,
  traduzirRequisito,
  type SinaisDaConta,
} from "@/lib/contabilistas/stripe/estado";

const conta = (over: Partial<SinaisDaConta> = {}): SinaisDaConta => ({
  ligada: true,
  podeCobrar: true,
  podeReceber: true,
  dadosSubmetidos: true,
  requisitos: [],
  ...over,
});

describe("recebimentos: os estados", () => {
  it("sem conta nenhuma, convida a começar", () => {
    const r = classificarRecebimentos(conta({ ligada: false }));
    expect(r.estado).toBe("sem_conta");
    expect(r.aceitaPagamentos).toBe(false);
    expect(r.destino).toBe("onboarding");
  });

  it("com o formulário a meio, manda continuar", () => {
    const r = classificarRecebimentos(
      conta({ dadosSubmetidos: false, podeCobrar: false, podeReceber: false }),
    );
    expect(r.estado).toBe("incompleta");
    expect(r.accao).toBe("Continuar o formulário");
    expect(r.aceitaPagamentos).toBe(false);
  });

  it("submetido com pendências é ação necessária, não «em análise»", () => {
    // A diferença importa: «em análise» diz «não tens nada a fazer», e
    // dizê-lo a quem tem um documento por enviar deixa a conta parada
    // para sempre.
    const r = classificarRecebimentos(
      conta({ podeCobrar: false, podeReceber: false, requisitos: ["individual.verification.document"] }),
    );
    expect(r.estado).toBe("acao_necessaria");
    expect(r.accao).toBe("Resolver na Stripe");
  });

  it("submetido e sem pendências é espera, e não pede nada", () => {
    const r = classificarRecebimentos(conta({ podeCobrar: false, podeReceber: false }));
    expect(r.estado).toBe("em_analise");
    expect(r.accao).toBeNull();
    expect(r.aceitaPagamentos).toBe(false);
  });

  it("tudo verde é ativa", () => {
    const r = classificarRecebimentos(conta());
    expect(r.estado).toBe("ativa");
    expect(r.aceitaPagamentos).toBe(true);
    expect(r.tom).toBe("marca");
    expect(r.accao).toBeNull();
  });
});

describe("recebimentos: os casos que a versão anterior escondia", () => {
  it("cobra mas não transfere — não pode aparecer como «tudo pronto»", () => {
    const r = classificarRecebimentos(conta({ podeReceber: false }));
    expect(r.estado).toBe("restrita");
    expect(r.estado).not.toBe("ativa");
    expect(r.tom).toBe("aviso");
    // E, ainda assim, o cliente CONSEGUE pagar. As duas coisas são
    // verdadeiras ao mesmo tempo, e é por isso que um booleano não chegava.
    expect(r.aceitaPagamentos).toBe(true);
    expect(r.titulo).toContain("não sai");
  });

  it("a funcionar com prazo a correr avisa, sem parar nada", () => {
    const r = classificarRecebimentos(conta({ requisitos: ["individual.verification.document"] }));
    expect(r.estado).toBe("restrita");
    expect(r.aceitaPagamentos).toBe(true);
    expect(r.explicacao).toContain("prazo");
  });

  it("uma conta restrita nunca diz que não aceita pagamentos", () => {
    for (const c of [conta({ podeReceber: false }), conta({ requisitos: ["x"] })]) {
      expect(classificarRecebimentos(c).aceitaPagamentos).toBe(true);
    }
  });

  it("nenhum estado sem conta ou por acabar aceita pagamentos", () => {
    const impossiveis = [
      conta({ ligada: false }),
      conta({ dadosSubmetidos: false, podeCobrar: false }),
      conta({ podeCobrar: false, requisitos: ["x"] }),
      conta({ podeCobrar: false }),
    ];
    for (const c of impossiveis) {
      expect(classificarRecebimentos(c).aceitaPagamentos).toBe(false);
    }
  });
});

describe("recebimentos: os requisitos em português", () => {
  it("traduz os códigos com prefixo de pessoa", () => {
    expect(traduzirRequisito("individual.verification.document"))
      .toBe("Um documento de identificação (frente e verso)");
    expect(traduzirRequisito("representative.verification.document"))
      .toBe("Um documento de identificação (frente e verso)");
    // O prefixo de uma pessoa concreta traz um id no meio.
    expect(traduzirRequisito("person_1AbC2dEf.verification.document"))
      .toBe("Um documento de identificação (frente e verso)");
  });

  it("traduz os códigos que não seguem padrão nenhum", () => {
    expect(traduzirRequisito("external_account")).toBe("O IBAN para onde queres receber");
    expect(traduzirRequisito("company.tax_id")).toBe("O NIPC da empresa");
    expect(traduzirRequisito("tos_acceptance.date")).toContain("termos");
  });

  it("junta a morada numa linha só", () => {
    // Quatro códigos e uma coisa a fazer. Quatro linhas faziam parecer
    // quatro vezes mais trabalho, e o desânimo aqui custa uma conta.
    const lista = requisitosLegiveis([
      "individual.address.line1",
      "individual.address.city",
      "individual.address.postal_code",
      "individual.address.state",
    ]);
    expect(lista).toHaveLength(1);
    expect(lista[0].texto).toContain("morada");
  });

  it("não inventa tradução para o que não conhece", () => {
    expect(traduzirRequisito("qualquer.coisa.nova")).toBeNull();
    const lista = requisitosLegiveis(["qualquer.coisa.nova"]);
    expect(lista[0].texto).toBeNull();
    expect(lista[0].codigo).toBe("qualquer.coisa.nova");
  });

  it("mantém os códigos por traduzir separados uns dos outros", () => {
    const lista = requisitosLegiveis(["nova.a", "nova.b"]);
    expect(lista).toHaveLength(2);
  });

  it("aguenta lixo sem rebentar", () => {
    expect(traduzirRequisito("")).toBeNull();
    expect(traduzirRequisito("   ")).toBeNull();
    expect(requisitosLegiveis([])).toEqual([]);
  });
});

describe("recebimentos: o que o cliente vê", () => {
  it("diz-lhe se pode pagar, e nada sobre a Stripe", () => {
    const sim = comoOClienteVe(true);
    expect(sim.rotulo).toContain("Aceita pagamento");
    expect(JSON.stringify(sim).toLowerCase()).not.toContain("stripe");

    const nao = comoOClienteVe(false);
    expect(nao.rotulo).toContain("diretamente");
    expect(JSON.stringify(nao).toLowerCase()).not.toContain("stripe");
  });

  it("nunca diz que há um problema com o contabilista", () => {
    // Que a Stripe pediu um documento a alguém é informação privada, e das
    // que fazem perder um cliente por uma razão que não é dele.
    const texto = JSON.stringify(comoOClienteVe(false)).toLowerCase();
    for (const palavra of ["verificação", "documento", "pendente", "análise", "requisito"]) {
      expect(texto).not.toContain(palavra);
    }
  });
});
