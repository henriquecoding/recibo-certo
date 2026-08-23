// ═══════════════════════════════════════════════════════════════════════
//  A LEITURA AO CONCELHO — e o que ela obriga a não partir
//  ---------------------------------------------------------------------
//  A auditoria (F-18) escreveu isto assim: «O grafo trabalha em nove
//  NUTS II. "Que negócio abrir" varia ao concelho: Lisboa e Mafra são a
//  mesma célula, Idanha-a-Nova e Coimbra também.»
//
//  Estava certa, e os dados provam-no com folga. Nas empresas de limpeza
//  e manutenção de edifícios (divisão 81), por dez mil habitantes:
//
//      Lisboa ......  8,3        Loulé ..... 84,5
//      Mafra ....... 23,8        Espinho ...  5,9
//
//  Lisboa e Mafra são a MESMA célula em NUTS II e diferem por 2,9×. Uma
//  leitura de «Grande Lisboa» descreve um território que não é o de
//  nenhuma das duas.
//
//  ── O QUE ESTES TESTES GUARDAM ─────────────────────────────────────
//  O alinhamento por índice é a fragilidade central desta camada: os
//  arrays da matriz alinham posição a posição, e um elemento a menos não
//  dá erro — desloca todos os concelhos seguintes e atribui a Lisboa os
//  números de Loures. Continua a parecer uma análise. É o modo de falhar
//  mais caro possível, e é o primeiro que se testa aqui.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { CONCELHOS, CONCELHO_POR_CODIGO, concelhosDaRegiao } from "@/lib/negocio/market/concelhos";
import { MATRIZ_CONCELHOS } from "@/lib/negocio/market/oferta-concelhos";
import { lerLacuna, lerOferta, type PackOferta } from "@/lib/negocio/market/oferta";
import { DIVISOES_DE_CLIENTES, PROBLEMAS } from "@/lib/negocio/descoberta/conhecimento/dados/problemas";
import { DIVISOES_USADAS } from "@/lib/negocio/descoberta/conhecimento/dados/ontologia";
import { MARKET_REGIONS } from "@/lib/negocio/market/geografia";

const codigoDe = (nome: string): string => {
  const encontrado = CONCELHOS.find((item) => item.nome === nome);
  if (!encontrado) throw new Error(`Concelho inexistente no teste: ${nome}`);
  return encontrado.codigo;
};

/** Um pack sem leitura regional: só a matriz. É o caso de INE em baixo. */
const packSoConcelhos = (): PackOferta => ({
  schemaVersion: 1,
  geradoEm: "2026-08-23T00:00:00.000Z",
  indicadorEmpresas: "0014449",
  indicadorPopulacao: "0012918",
  licenca: {
    status: "approved",
    scope: "dataset",
    identifier: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
  },
  divisoes: [],
  populacao: [],
  emFalta: [],
  concelhos: MATRIZ_CONCELHOS ?? undefined,
});

describe("concelhos: a lista é a do INE, e a região vem do código", () => {
  it("são exatamente 308", () => {
    expect(CONCELHOS).toHaveLength(308);
    expect(new Set(CONCELHOS.map((item) => item.codigo)).size).toBe(308);
  });

  it("cada concelho pertence a uma NUTS II que existe", () => {
    const conhecidas = new Set(MARKET_REGIONS.map((item) => item.id));
    for (const concelho of CONCELHOS) {
      expect(conhecidas.has(concelho.regiao), concelho.nome).toBe(true);
      expect(concelho.regiao).not.toBe("portugal");
    }
  });

  it("a região deriva do PREFIXO do código, e é o que resolve os distritos que atravessam regiões", () => {
    // Nenhum destes é decidido pelo distrito, e três deles contradizem-no.
    const casos: readonly [string, string][] = [
      ["Sines", "alentejo"],
      ["Grândola", "alentejo"],
      ["Torres Vedras", "oeste-vale-tejo"],
      ["Alcobaça", "oeste-vale-tejo"],
      ["Peniche", "oeste-vale-tejo"],
      ["Almada", "peninsula-setubal"],
    ];
    for (const [nome, regiao] of casos) {
      expect(CONCELHO_POR_CODIGO.get(codigoDe(nome))?.regiao, nome).toBe(regiao);
    }
  });

  it("a soma dos concelhos por região dá 308, sem nenhum a cair fora", () => {
    const soma = MARKET_REGIONS.filter((item) => item.id !== "portugal").reduce(
      (total, item) => total + concelhosDaRegiao(item.id).length,
      0,
    );
    expect(soma).toBe(308);
  });
});

describe("concelhos: a matriz alinha, e é isso que a torna legível", () => {
  it("o instantâneo atravessou a validação", () => {
    expect(MATRIZ_CONCELHOS).not.toBeNull();
  });

  it("todos os arrays têm o mesmo comprimento que a ordem", () => {
    // ┌──────────────────────────────────────────────────────────────┐
    // │ Um array com um elemento a menos não dá erro: desloca todos   │
    // │ os concelhos seguintes por uma posição e atribui a Lisboa os  │
    // │ números de Loures. O resultado continua a parecer uma         │
    // │ análise, e é por isso que isto se testa antes de tudo.        │
    // └──────────────────────────────────────────────────────────────┘
    const matriz = MATRIZ_CONCELHOS!;
    expect(matriz.ordem).toHaveLength(308);
    expect(matriz.populacao).toHaveLength(matriz.ordem.length);
    for (const [divisao, contagens] of Object.entries(matriz.porDivisao)) {
      expect(contagens.length, `divisão ${divisao}`).toBe(matriz.ordem.length);
    }
  });

  it("cada código da matriz existe na lista gerada", () => {
    for (const codigo of MATRIZ_CONCELHOS!.ordem) {
      expect(CONCELHO_POR_CODIGO.has(codigo), codigo).toBe(true);
    }
  });

  it("a população é sempre positiva — um zero seria uma divisão por zero disfarçada", () => {
    for (const habitantes of MATRIZ_CONCELHOS!.populacao) {
      expect(habitantes).toBeGreaterThan(0);
    }
  });

  it("as contagens de empresas nunca são negativas", () => {
    for (const contagens of Object.values(MATRIZ_CONCELHOS!.porDivisao)) {
      for (const valor of contagens) expect(valor).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("concelhos: a leitura distingue o que a NUTS II juntava", () => {
  it("Lisboa e Mafra deixam de ser a mesma célula", () => {
    const lisboa = lerOferta(packSoConcelhos(), ["81"], {
      tipo: "concelho",
      codigo: codigoDe("Lisboa"),
    })!;
    const mafra = lerOferta(packSoConcelhos(), ["81"], {
      tipo: "concelho",
      codigo: codigoDe("Mafra"),
    })!;

    expect(lisboa).not.toBeNull();
    expect(mafra).not.toBeNull();
    expect(lisboa.aqui.regiao).toBe(mafra.aqui.regiao); // a MESMA NUTS II
    // …e densidades que não se parecem nada uma com a outra.
    expect(mafra.aqui.porDezMil).toBeGreaterThan(lisboa.aqui.porDezMil * 2);
    expect(mafra.percentil).toBeGreaterThan(lisboa.percentil);
  });

  it("compara entre os 308 e diz que é essa a escala", () => {
    const leitura = lerOferta(packSoConcelhos(), ["81"], {
      tipo: "concelho",
      codigo: codigoDe("Loulé"),
    })!;
    expect(leitura.escala).toBe("concelho");
    expect(leitura.regioesComparadas).toBe(308);
    expect(leitura.aqui.nome).toBe("Loulé");
    // Loulé é o topo do país em empresas de limpeza por habitante.
    expect(leitura.percentil).toBeGreaterThan(95);
    expect(leitura.z).toBeGreaterThan(2);
  });

  it("a densidade é operadores por dez mil habitantes, e a conta confere", () => {
    const matriz = MATRIZ_CONCELHOS!;
    const codigo = codigoDe("Loulé");
    const indice = matriz.ordem.indexOf(codigo);
    const leitura = lerOferta(packSoConcelhos(), ["81"], { tipo: "concelho", codigo })!;
    expect(leitura.aqui.operadores).toBe(matriz.porDivisao["81"]![indice]);
    expect(leitura.aqui.habitantes).toBe(matriz.populacao[indice]);
    expect(leitura.aqui.porDezMil).toBeCloseTo(
      (matriz.porDivisao["81"]![indice]! / matriz.populacao[indice]!) * 10_000,
      6,
    );
  });

  it("somar duas divisões soma empresas distintas, não as conta duas vezes", () => {
    const codigo = codigoDe("Porto");
    const so81 = lerOferta(packSoConcelhos(), ["81"], { tipo: "concelho", codigo })!;
    const so82 = lerOferta(packSoConcelhos(), ["82"], { tipo: "concelho", codigo })!;
    const ambas = lerOferta(packSoConcelhos(), ["81", "82"], { tipo: "concelho", codigo })!;
    expect(ambas.aqui.operadores).toBe(so81.aqui.operadores + so82.aqui.operadores);
  });
});

describe("concelhos: recusa-se a concluir sem base", () => {
  it("um pack sem matriz não produz leitura ao concelho", () => {
    const semMatriz = { ...packSoConcelhos(), concelhos: undefined };
    expect(lerOferta(semMatriz, ["81"], { tipo: "concelho", codigo: codigoDe("Lisboa") })).toBeNull();
  });

  it("um código que não é concelho nenhum não inventa uma leitura", () => {
    expect(lerOferta(packSoConcelhos(), ["81"], { tipo: "concelho", codigo: "XXXXXXX" })).toBeNull();
  });

  it("uma divisão que a matriz não tem devolve `null`, nunca zero empresas", () => {
    // Zero operadores lê-se como «mercado livre» e promoveria a hipótese
    // por engano. É o mesmo cuidado que a leitura regional já tinha.
    expect(lerOferta(packSoConcelhos(), ["99"], { tipo: "concelho", codigo: codigoDe("Lisboa") })).toBeNull();
  });

  it("sem a matriz, a leitura regional continua a funcionar como funcionava", () => {
    // A matriz é ADITIVA: quem não fixa concelho lê exatamente o que lia.
    const semMatriz = { ...packSoConcelhos(), concelhos: undefined };
    expect(lerOferta(semMatriz, ["81"], { tipo: "regiao", regiao: "algarve" })).toBeNull();
    // (é `null` porque este pack não traz divisões regionais — o que
    // importa é que não rebenta e não devolve a leitura do concelho.)
  });
});

describe("quociente de localização: o denominador certo muda a conclusão", () => {
  // ┌──────────────────────────────────────────────────────────────────┐
  // │ A auditoria (F-15) chamou-lhe «o desbloqueio de tudo o resto», e  │
  // │ o benchmark internacional apontou o método: o Location Quotient   │
  // │ cruzado com um indicador de procura «separa "pouca oferta porque  │
  // │ não há mercado" de "pouca oferta apesar de haver mercado"».       │
  // │                                                                  │
  // │ Este é o caso que o demonstra, com os números reais do INE:       │
  // │                                                                  │
  // │   empresas de limpeza (81)      Albufeira      Lisboa             │
  // │   por dez mil HABITANTES ......... 52,4 ........ 8,3   → 6,3×     │
  // │   por mil ALOJAMENTOS (55) ....... 135 ......... 89    → 1,5×     │
  // │                                                                  │
  // │ Por habitante, Albufeira parece seis vezes mais servida. Por      │
  // │ cliente — que é o denominador REAL de quem presta serviço a       │
  // │ alojamento turístico — a diferença é uma fração disso: Albufeira  │
  // │ tem clientes a mais, não operadores a mais. São conclusões        │
  // │ opostas a partir dos mesmos números.                              │
  // └──────────────────────────────────────────────────────────────────┘
  it("operadores por CLIENTE contam outra história que operadores por habitante", () => {
    const albufeira = codigoDe("Albufeira");
    const lisboa = codigoDe("Lisboa");

    const porHabitanteAlbufeira = lerOferta(packSoConcelhos(), ["81"], {
      tipo: "concelho",
      codigo: albufeira,
    })!;
    const porHabitanteLisboa = lerOferta(packSoConcelhos(), ["81"], {
      tipo: "concelho",
      codigo: lisboa,
    })!;

    const base = { tipo: "empresas", cae: ["55"] } as const;
    const porClienteAlbufeira = lerLacuna(packSoConcelhos(), ["81"], base, albufeira)!;
    const porClienteLisboa = lerLacuna(packSoConcelhos(), ["81"], base, lisboa)!;

    const razaoPorHabitante = porHabitanteAlbufeira.aqui.porDezMil / porHabitanteLisboa.aqui.porDezMil;
    const razaoPorCliente = porClienteAlbufeira.porMilClientes / porClienteLisboa.porMilClientes;

    // Por habitante, uma diferença enorme; por cliente, muito menor.
    expect(razaoPorHabitante).toBeGreaterThan(4);
    expect(razaoPorCliente).toBeLessThan(2);
    expect(razaoPorCliente).toBeLessThan(razaoPorHabitante / 2);
  });

  it("a conta é operadores por mil clientes, e confere com a matriz", () => {
    const matriz = MATRIZ_CONCELHOS!;
    const codigo = codigoDe("Albufeira");
    const indice = matriz.ordem.indexOf(codigo);
    const leitura = lerLacuna(packSoConcelhos(), ["81"], { tipo: "empresas", cae: ["55"] }, codigo)!;
    expect(leitura.operadores).toBe(matriz.porDivisao["81"]![indice]);
    expect(leitura.clientes).toBe(matriz.porDivisao["55"]![indice]);
    expect(leitura.porMilClientes).toBeCloseTo(
      (matriz.porDivisao["81"]![indice]! / matriz.porDivisao["55"]![indice]!) * 1000,
      6,
    );
    expect(leitura.unidadeCliente).toBe("empresas");
  });

  it("a base «residentes» usa a população, e diz que é isso que usa", () => {
    const codigo = codigoDe("Braga");
    const matriz = MATRIZ_CONCELHOS!;
    const indice = matriz.ordem.indexOf(codigo);
    const leitura = lerLacuna(packSoConcelhos(), ["95"], { tipo: "residentes" }, codigo)!;
    expect(leitura.unidadeCliente).toBe("residentes");
    expect(leitura.clientes).toBe(matriz.populacao[indice]);
  });

  it("uma base de clientes que a matriz não tem devolve `null`, nunca zero clientes", () => {
    // Zero clientes seria uma divisão por zero; um denominador aproximado
    // seria pior — um rácio plausível e uma conclusão errada.
    expect(
      lerLacuna(packSoConcelhos(), ["81"], { tipo: "empresas", cae: ["99"] }, codigoDe("Lisboa")),
    ).toBeNull();
  });

  it("sem concelho não há quociente — nove regiões são poucas para um percentil", () => {
    expect(
      lerLacuna(packSoConcelhos(), ["81"], { tipo: "empresas", cae: ["55"] }, "XXXXXXX"),
    ).toBeNull();
  });
});

describe("base de clientes: cada problema declara quem paga", () => {
  it("todos os 28 respondem, e `nao-contavel` traz sempre a razão", () => {
    for (const problema of PROBLEMAS) {
      const base = problema.baseDeClientes;
      expect(base, problema.id).toBeDefined();
      if (base.tipo === "nao-contavel") {
        expect(base.porque.length, problema.id).toBeGreaterThan(40);
      } else if (base.tipo === "empresas") {
        expect(base.cae.length, problema.id).toBeGreaterThan(0);
      }
    }
  });

  it("as divisões de clientes existem todas no instantâneo", () => {
    // Uma divisão declarada e não ingerida não dá erro: dá `null` no
    // quociente, silenciosamente, e a hipótese perde a leitura.
    const matriz = MATRIZ_CONCELHOS!;
    for (const divisao of DIVISOES_DE_CLIENTES) {
      expect(matriz.porDivisao[divisao], `divisão ${divisao}`).toBeDefined();
    }
  });

  it("as divisões do OPERADOR também estão todas lá", () => {
    const matriz = MATRIZ_CONCELHOS!;
    for (const divisao of DIVISOES_USADAS) {
      expect(matriz.porDivisao[divisao], `divisão ${divisao}`).toBeDefined();
    }
  });
});
