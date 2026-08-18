// ═══════════════════════════════════════════════════════════════════════
//  O motor de verificação, testado onde ele pode mentir
//  ---------------------------------------------------------------------
//  Cada teste aqui corresponde a uma maneira concreta de o selo passar a
//  afirmar uma coisa falsa. Não são testes de cobertura — são o que
//  impede o «verificado» de sobreviver ao facto que o justificava.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  FONTES, assertFontesVerificacaoIntegridade, FONTES_LAST_REVIEW,
} from "@/lib/contabilistas/verificacao/fontes";
import {
  diagnosticarNIF, diagnosticarNumeroOCC, nifTemDigitoValido,
  normalizarNumeroOCC, pedacosDoNome,
} from "@/lib/contabilistas/verificacao/identificadores";
import {
  DIAS_DE_AVISO, PERFIS_METODO, REGISTO_VAZIO, confirmar, forcaDoMetodo,
  lerVerificacao, pedir, recusar, validadeAPartirDe,
} from "@/lib/contabilistas/verificacao/motor";
import {
  compararComRegisto, construirEvidencia,
} from "@/lib/contabilistas/verificacao/registo-publico";
import {
  encontrarOrdem, numeroNoAtributo, scapEstaLigado, listarFornecedores,
  obterAtributos, pedirAtributos,
} from "@/lib/contabilistas/verificacao/scap";

const AGORA = new Date("2026-08-18T12:00:00.000Z");
const dias = (n: number) => new Date(AGORA.getTime() + n * 86_400_000);

describe("fontes", () => {
  it("nenhuma fonte é publicada sem endereço, base e data", () => {
    expect(() => assertFontesVerificacaoIntegridade()).not.toThrow();
    for (const f of FONTES) {
      expect(f.url).toMatch(/^https:\/\//);
      expect(f.verificadoEm <= FONTES_LAST_REVIEW).toBe(true);
    }
  });

  it("o registo público está identificado pelo artigo que o obriga", () => {
    const r = FONTES.find((f) => f.id === "registo_publico_occ");
    expect(r?.baseLegal).toContain("21.º");
  });
});

describe("identificadores", () => {
  it("normaliza o número de membro para uma forma comparável", () => {
    expect(normalizarNumeroOCC("012345")).toBe("12345");
    expect(normalizarNumeroOCC(" 12 345 ")).toBe("12345");
    expect(normalizarNumeroOCC("")).toBeNull();
    expect(normalizarNumeroOCC("0")).toBeNull();
  });

  it("apanha um NIF colado no campo do número de membro", () => {
    const d = diagnosticarNumeroOCC("501442600");
    expect(d.plausibilidade).toBe("improvavel");
    expect(d.aviso).toContain("NIF");
  });

  it("nunca chama plausível a um formato a verificação", () => {
    // O contrato do módulo: o melhor resultado possível é «plausível».
    const d = diagnosticarNumeroOCC("12345");
    expect(d.plausibilidade).toBe("plausivel");
    // e não existe nenhum estado que signifique «confirmado».
    expect(["vazio", "plausivel", "improvavel"]).toContain(d.plausibilidade);
  });

  it("valida o dígito de controlo do NIF", () => {
    // NIF da própria Ordem, público no seu sítio.
    expect(nifTemDigitoValido("501442600")).toBe(true);
    expect(nifTemDigitoValido("501442601")).toBe(false);
    expect(nifTemDigitoValido("111111111")).toBe(false);
    expect(nifTemDigitoValido("12345")).toBe(false);
    expect(diagnosticarNIF("501442600").plausibilidade).toBe("plausivel");
  });

  it("descarta partículas ao partir um nome", () => {
    expect(pedacosDoNome("Marta de Sousa e Nogueira")).toEqual(["marta", "sousa", "nogueira"]);
    expect(pedacosDoNome("JOSÉ  Álvaro")).toEqual(["jose", "alvaro"]);
  });
});

describe("motor — leitura", () => {
  it("sem número não há nada a verificar", () => {
    const l = lerVerificacao({ numeroAtual: null, registo: REGISTO_VAZIO, agora: AGORA });
    expect(l.estado).toBe("sem_numero");
    expect(l.selo).toBe(false);
  });

  it("um número escrito pelo próprio é «informado», nunca «verificado»", () => {
    const l = lerVerificacao({ numeroAtual: "12345", registo: REGISTO_VAZIO, agora: AGORA });
    expect(l.estado).toBe("informado");
    expect(l.selo).toBe(false);
    expect(l.rotulo).toContain("informado");
  });

  it("uma verificação dentro do prazo dá selo", () => {
    const { registo } = confirmar(REGISTO_VAZIO, {
      metodo: "registo_publico", numero: "12345", por: "admin-1", agora: AGORA,
    });
    const l = lerVerificacao({ numeroAtual: "12345", registo, agora: dias(10) });
    expect(l.estado).toBe("verificado");
    expect(l.selo).toBe(true);
    expect(l.metodo).toBe("registo_publico");
  });

  it("passado o prazo, o selo cai — não fica «verificado» para sempre", () => {
    const { registo } = confirmar(REGISTO_VAZIO, {
      metodo: "registo_publico", numero: "12345", por: "admin-1", agora: AGORA,
    });
    const depois = dias(PERFIS_METODO.registo_publico.validadeDias + 1);
    const l = lerVerificacao({ numeroAtual: "12345", registo, agora: depois });
    expect(l.estado).toBe("a_reconfirmar");
    expect(l.selo).toBe(false);
    expect(l.proximoPasso?.id).toBe("renovar");
  });

  it("avisa antes de caducar, com tempo para renovar", () => {
    const { registo } = confirmar(REGISTO_VAZIO, {
      metodo: "registo_publico", numero: "12345", por: "admin-1", agora: AGORA,
    });
    const quase = dias(PERFIS_METODO.registo_publico.validadeDias - (DIAS_DE_AVISO - 1));
    const l = lerVerificacao({ numeroAtual: "12345", registo, agora: quase });
    expect(l.estado).toBe("verificado");
    expect(l.aExpirar).toBe(true);
  });

  it("trocar o número apaga o selo — é a fraude que a verificação impede", () => {
    const { registo } = confirmar(REGISTO_VAZIO, {
      metodo: "registo_publico", numero: "12345", por: "admin-1", agora: AGORA,
    });
    const l = lerVerificacao({ numeroAtual: "99999", registo, agora: dias(1) });
    expect(l.estado).toBe("informado");
    expect(l.selo).toBe(false);
  });

  it("uma recusa fica visível enquanto o número não mudar", () => {
    const { registo } = recusar(REGISTO_VAZIO, {
      numero: "12345", motivo: "O registo não devolveu ninguém com este número.", agora: AGORA,
    });
    expect(lerVerificacao({ numeroAtual: "12345", registo, agora: dias(1) }).estado).toBe("recusado");
    expect(lerVerificacao({ numeroAtual: "54321", registo, agora: dias(1) }).estado).toBe("informado");
  });
});

describe("motor — transições", () => {
  it("um método fraco não substitui um forte ainda válido", () => {
    const forte = confirmar(REGISTO_VAZIO, {
      metodo: "scap", numero: "12345", por: "scap", agora: AGORA,
    }).registo;
    const tentativa = confirmar(forte, {
      metodo: "documento", numero: "12345", por: "admin-1", agora: dias(5),
    });
    expect(tentativa.ok).toBe(false);
    expect(tentativa.registo.metodo).toBe("scap");
  });

  it("um método forte substitui sempre um fraco", () => {
    const fraco = confirmar(REGISTO_VAZIO, {
      metodo: "documento", numero: "12345", por: "admin-1", agora: AGORA,
    }).registo;
    const r = confirmar(fraco, { metodo: "scap", numero: "12345", por: "scap", agora: dias(5) });
    expect(r.ok).toBe(true);
    expect(r.registo.metodo).toBe("scap");
  });

  it("a validade da fonte encurta o prazo, mas nunca o estica", () => {
    const curta = confirmar(REGISTO_VAZIO, {
      metodo: "scap", numero: "12345", por: "scap", agora: AGORA,
      validadeDaFonte: dias(5).toISOString(),
    });
    expect(curta.registo.validoAte).toBe(dias(5).toISOString());

    const longa = confirmar(REGISTO_VAZIO, {
      metodo: "scap", numero: "12345", por: "scap", agora: AGORA,
      validadeDaFonte: dias(9999).toISOString(),
    });
    const tecto = validadeAPartirDe(AGORA, PERFIS_METODO.scap.validadeDias);
    expect(longa.registo.validoAte).toBe(tecto);
  });

  it("a força dos métodos é uma ordem estrita", () => {
    expect(forcaDoMetodo("scap")).toBeGreaterThan(forcaDoMetodo("registo_publico"));
    expect(forcaDoMetodo("registo_publico")).toBeGreaterThan(forcaDoMetodo("documento"));
  });

  it("recusar exige explicação", () => {
    expect(recusar(REGISTO_VAZIO, { numero: "12345", motivo: "não" }).ok).toBe(false);
    expect(
      recusar(REGISTO_VAZIO, { numero: "12345", motivo: "Não consta do registo público." }).ok
    ).toBe(true);
  });

  it("não se pede verificação em cima de uma válida", () => {
    const valido = confirmar(REGISTO_VAZIO, {
      metodo: "scap", numero: "12345", por: "scap", agora: AGORA,
    }).registo;
    expect(pedir(valido, { numero: "12345", agora: dias(1) }).ok).toBe(false);
  });

  it("um pedido novo limpa a recusa anterior", () => {
    const recusado = recusar(REGISTO_VAZIO, {
      numero: "12345", motivo: "Número não encontrado no registo.", agora: AGORA,
    }).registo;
    const p = pedir(recusado, { numero: "12345", agora: dias(2) });
    expect(p.ok).toBe(true);
    expect(p.registo.recusadoEm).toBeNull();
    expect(lerVerificacao({ numeroAtual: "12345", registo: p.registo, agora: dias(2) }).estado)
      .toBe("em_analise");
  });
});

describe("comparação com o registo público", () => {
  const ficha = { nome: "Marta Nogueira", numero: "12345" };

  it("confirma quando número, nome e exercício batem", () => {
    const c = compararComRegisto(ficha, {
      nome: "Marta Nogueira", numero: "12345", exercicio: "Ativo",
    });
    expect(c.podeConfirmar).toBe(true);
    expect(c.nome).toBe("igual");
  });

  it("aceita o nome civil mais completo do registo", () => {
    const c = compararComRegisto(ficha, {
      nome: "Marta Sofia Alves Nogueira", numero: "012345", exercicio: "Ativo",
    });
    expect(c.nome).toBe("compativel");
    expect(c.podeConfirmar).toBe(true);
  });

  it("recusa um homónimo com apelido a mais no fim", () => {
    const c = compararComRegisto(ficha, {
      nome: "Marta Nogueira Dias", numero: "12345", exercicio: "Ativo",
    });
    expect(c.nome).toBe("diferente");
    expect(c.podeConfirmar).toBe(false);
  });

  it("não confirma quando o exercício não está activo", () => {
    const c = compararComRegisto(ficha, {
      nome: "Marta Nogueira", numero: "12345", exercicio: "Suspenso",
    });
    expect(c.ativo).toBe(false);
    expect(c.podeConfirmar).toBe(false);
  });

  it("não confirma quando o exercício não foi preenchido", () => {
    const c = compararComRegisto(ficha, {
      nome: "Marta Nogueira", numero: "12345", exercicio: null,
    });
    expect(c.ativo).toBeNull();
    expect(c.podeConfirmar).toBe(false);
  });

  it("a evidência guarda o que foi lido e não a morada", () => {
    const lido = { nome: "Marta Nogueira", numero: "12345", exercicio: "Ativo" };
    const e = construirEvidencia(lido, compararComRegisto(ficha, lido), AGORA);
    expect(e.numeroNoRegisto).toBe("12345");
    expect(e.consultadoEm).toBe(AGORA.toISOString());
    expect(Object.keys(e)).not.toContain("morada");
  });
});

describe("SCAP", () => {
  it("está desligado sem credenciais, e nunca finge uma resposta", async () => {
    expect(scapEstaLigado()).toBe(false);
    for (const r of [
      await listarFornecedores("p1"),
      await obterAtributos("p1"),
      await pedirAtributos({
        processId: "p1", credentialId: "c", nome: "N",
        documento: { tipo: "CC", numero: "1" }, fornecedorUriIds: ["x"],
      }),
    ]) {
      expect(r.estado).toBe("indisponivel");
    }
  });

  it("escolhe o fornecedor pelo NIPC e não pelo primeiro parecido", () => {
    const lista = [
      { uriId: "u1", nome: "Ordem dos Advogados", tipo: null, nipc: "500000000" },
      { uriId: "u2", nome: "Ordem dos Contabilistas Certificados", tipo: null, nipc: "501442600" },
    ];
    expect(encontrarOrdem(lista, "501442600")?.uriId).toBe("u2");
    expect(encontrarOrdem(lista, null)?.uriId).toBe("u2");
    expect(encontrarOrdem([lista[0]], null)).toBeNull();
  });

  it("extrai o número do atributo, e devolve null quando não vem", () => {
    expect(numeroNoAtributo({
      id: "a", descricao: "Contabilista Certificado", validoAte: null,
      subAtributos: [{ id: "cod_membro", descricao: "Nº", valor: "012345" }],
    })).toBe("12345");

    expect(numeroNoAtributo({
      id: "a", descricao: "Contabilista Certificado", validoAte: null, subAtributos: [],
    })).toBeNull();
  });
});
