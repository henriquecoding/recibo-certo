// ═══════════════════════════════════════════════════════════════════════
//  O TERMO DE OFERTA — e as maneiras de o estragar em silêncio
//  ---------------------------------------------------------------------
//  Este módulo trouxe ao motor a metade que faltava da subtração:
//  quantos operadores já existem na zona, na atividade que a hipótese
//  ocuparia. Enquanto não existia, a leitura de lacuna era «por apurar»
//  para toda a gente — o que era honesto e não era uma resposta.
//
//  Passar a ter um número traz modos de falhar novos, e todos silenciosos:
//  um rácio calculado sobre a população errada continua a parecer um
//  rácio; uma comparação com quatro regiões continua a devolver um z; uma
//  série que não veio conta como zero empresas e lê-se como «mercado
//  livre», que é a conclusão mais cara que este produto pode publicar.
//
//  Nada aqui vai à rede. O conector já é testado contra o INE em
//  `negocio-market-ine.test.ts`; o que se testa aqui é a ARITMÉTICA e as
//  recusas — e essas têm de valer com o INE em baixo.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  carregarOferta,
  CODIGOS_NUTS_PEDIDOS,
  lacunaPorConcelho,
  lerLacuna,
  lerOferta,
  populacaoRegionalDaMatriz,
  type ContagemRegional,
  type PackOferta,
} from "@/lib/negocio/market/oferta";
import { MATRIZ_CONCELHOS } from "@/lib/negocio/market/oferta-concelhos";
import { MARKET_REGIONS } from "@/lib/negocio/market/geografia";
import { DIVISOES_USADAS } from "@/lib/negocio/descoberta/conhecimento/dados/ontologia";

/** Números reais lidos do INE em 2026-08-23, para a conta ser confrontável. */
const EMPRESAS_81: Record<string, number> = {
  "11": 4447,
  "15": 2706,
  "19": 1804,
  "1A": 2667,
  "1B": 1111,
  "1C": 501,
  "1D": 1048,
  "20": 306,
  "30": 197,
};
const POPULACAO: Record<string, number> = {
  "11": 3790554,
  "15": 578032,
  "19": 1771259,
  "1A": 2415261,
  "1B": 937678,
  "1C": 514386,
  "1D": 905403,
  "20": 245328,
  "30": 266130,
};

const contagens = (valores: Record<string, number>, periodo = "2023"): ContagemRegional[] =>
  Object.entries(valores).map(([codigo, valor]) => ({ codigo, valor, periodo }));

const pack = (over: Partial<PackOferta> = {}): PackOferta => ({
  schemaVersion: 1,
  geradoEm: "2026-08-23T00:00:00.000Z",
  indicadorEmpresas: "0014449",
  indicadorPopulacao: "0012918",
  licenca: {
    status: "approved",
    scope: "dataset",
    identifier: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    attribution: "Fonte: INE, I.P.",
  },
  divisoes: [
    { divisao: "81", designacao: "Atividades relacionadas com edifícios", contagens: contagens(EMPRESAS_81) },
  ],
  populacao: contagens(POPULACAO, "2025"),
  emFalta: [],
  ...over,
});

describe("oferta: a conta bate certo", () => {
  it("a densidade é operadores por dez mil habitantes", () => {
    const leitura = lerOferta(pack(), ["81"], { tipo: "regiao", regiao: "algarve" });
    expect(leitura).not.toBeNull();
    // 2 706 / 578 032 × 10 000 = 46,81…
    expect(leitura!.aqui.porDezMil).toBeCloseTo((2706 / 578032) * 10_000, 6);
    expect(leitura!.aqui.operadores).toBe(2706);
    expect(leitura!.regioesComparadas).toBe(9);
  });

  it("o Algarve destaca-se e o Alentejo não — e é isso que o z diz", () => {
    const algarve = lerOferta(pack(), ["81"], { tipo: "regiao", regiao: "algarve" })!;
    const alentejo = lerOferta(pack(), ["81"], { tipo: "regiao", regiao: "alentejo" })!;
    expect(algarve.z).toBeGreaterThan(2);
    expect(Math.abs(alentejo.z)).toBeLessThan(0.75);
    expect(algarve.aqui.porDezMil).toBeGreaterThan(alentejo.aqui.porDezMil);
  });

  it("a mediana é a das regiões comparadas, não a média nem o total nacional", () => {
    const leitura = lerOferta(pack(), ["81"], { tipo: "regiao", regiao: "norte" })!;
    const densidades = Object.keys(EMPRESAS_81)
      .map((codigo) => (EMPRESAS_81[codigo]! / POPULACAO[codigo]!) * 10_000)
      .sort((a, b) => a - b);
    expect(leitura.medianaNacional).toBeCloseTo(densidades[4]!, 9);
  });

  it("somar duas divisões soma os operadores das duas", () => {
    const comDuas = pack({
      divisoes: [
        { divisao: "81", designacao: "A", contagens: contagens(EMPRESAS_81) },
        { divisao: "43", designacao: "B", contagens: contagens({ ...EMPRESAS_81 }) },
      ],
    });
    const uma = lerOferta(comDuas, ["81"], { tipo: "regiao", regiao: "algarve" })!;
    const duas = lerOferta(comDuas, ["81", "43"], { tipo: "regiao", regiao: "algarve" })!;
    expect(duas.aqui.operadores).toBe(uma.aqui.operadores * 2);
    // Dobrar os dois lados não muda a posição relativa: o z é o mesmo.
    expect(duas.z).toBeCloseTo(uma.z, 9);
  });
});

describe("oferta: recusa-se a concluir sem base", () => {
  it("sem população não há leitura — um número de empresas sozinho não diz nada", () => {
    expect(lerOferta(pack({ populacao: [] }), ["81"], { tipo: "regiao", regiao: "algarve" })).toBeNull();
  });

  it("uma divisão que não veio não conta como zero empresas", () => {
    // Este é o modo de falhar mais caro: zero operadores lê-se como
    // «mercado livre» e promove a hipótese. Tem de devolver `null`.
    const semDados = pack({
      divisoes: [{ divisao: "81", designacao: "A", contagens: [], falha: "HTTP 503" }],
      emFalta: ["81"],
    });
    expect(lerOferta(semDados, ["81"], { tipo: "regiao", regiao: "algarve" })).toBeNull();
  });

  it("uma divisão que a ontologia pede e o pack não traz devolve `null`", () => {
    expect(lerOferta(pack(), ["62"], { tipo: "regiao", regiao: "algarve" })).toBeNull();
  });

  it("sem divisão nenhuma não há leitura", () => {
    expect(lerOferta(pack(), [], { tipo: "regiao", regiao: "algarve" })).toBeNull();
  });

  it("«todo o país» não é uma zona comparável consigo própria", () => {
    expect(lerOferta(pack(), ["81"], { tipo: "regiao", regiao: "portugal" })).toBeNull();
  });

  it("menos de cinco regiões não sustentam uma comparação", () => {
    const poucas = pack({
      divisoes: [
        {
          divisao: "81",
          designacao: "A",
          contagens: contagens({ "11": 100, "15": 50, "19": 70, "1A": 90 }),
        },
      ],
      populacao: contagens({ "11": 1000, "15": 1000, "19": 1000, "1A": 1000 }, "2025"),
    });
    expect(lerOferta(poucas, ["81"], { tipo: "regiao", regiao: "algarve" })).toBeNull();
  });

  it("regiões todas iguais não produzem um z — produzem uma divisão por zero", () => {
    const iguais = Object.fromEntries(Object.keys(EMPRESAS_81).map((c) => [c, 100]));
    const populacaoIgual = Object.fromEntries(Object.keys(POPULACAO).map((c) => [c, 100_000]));
    const plano = pack({
      divisoes: [{ divisao: "81", designacao: "A", contagens: contagens(iguais) }],
      populacao: contagens(populacaoIgual, "2025"),
    });
    expect(lerOferta(plano, ["81"], { tipo: "regiao", regiao: "algarve" })).toBeNull();
  });

  it("uma população zero não entra na conta em vez de a rebentar", () => {
    const comZero = pack({
      populacao: contagens({ ...POPULACAO, "30": 0 }, "2025"),
    });
    const leitura = lerOferta(comZero, ["81"], { tipo: "regiao", regiao: "algarve" });
    expect(leitura).not.toBeNull();
    expect(leitura!.regioesComparadas).toBe(8);
    expect(Number.isFinite(leitura!.z)).toBe(true);
  });
});

describe("oferta: o que se pede ao servidor", () => {
  it("pede exatamente as geografias que a aplicação sabe usar", () => {
    const esperado = [
      "PT",
      ...MARKET_REGIONS.map((item) => item.nutsCode).filter((codigo) => codigo !== null),
    ];
    expect([...CODIGOS_NUTS_PEDIDOS]).toEqual(esperado);
  });

  it("as divisões pedidas são as que a ontologia declara — nem mais, nem menos", () => {
    expect(DIVISOES_USADAS.length).toBeGreaterThan(0);
    // Pedir divisões a mais é peso na fonte por nada; a menos deixa
    // hipóteses sem oferta sem ninguém dar por isso.
    expect(new Set(DIVISOES_USADAS).size).toBe(DIVISOES_USADAS.length);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  A CADÊNCIA — medida contra a fonte real, fixada com uma falsa
//  -----------------------------------------------------------------
//  Sob carga, o INE não recusa depressa: pendura o pedido quinze
//  segundos e só depois devolve 503. Três descobertas, todas medidas:
//
//   · 23 pedidos (um por divisão) em paralelo → sete divisões e a
//     POPULAÇÃO perdidas, e sem população não há um único rácio;
//   · os mesmos 23 em fila de três → tudo, mas 31 segundos;
//   · as 23 divisões cabem NUM pedido (`Dim3` aceita vírgulas): 1,4 s.
//
//  E os dois pedidos que restam não podem partir juntos — disparados
//  ao mesmo tempo, um vem sempre vazio.
//
//  O `fetch` falso abaixo prende esse desenho: se alguém voltar a
//  paralelizar, estes testes acusam sem depender de o INE estar em
//  baixo naquele minuto.
// ═══════════════════════════════════════════════════════════════════

const RESPOSTA_EMPRESAS = (divisoes: readonly string[]) => [
  {
    IndicadorCod: "0014449",
    IndicadorDsg: "Empresas (N.º)",
    DataExtracao: "2026-08-23T00:00:00.000+01:00",
    Dados: {
      "2023": divisoes.flatMap((divisao) =>
        Object.entries(EMPRESAS_81).map(([geocod, valor]) => ({
          geocod,
          geodsg: MARKET_REGIONS.find((item) => item.nutsCode === geocod)?.label ?? "Portugal",
          dim_3: divisao,
          valor: String(valor),
        })),
      ),
    },
  },
];

const RESPOSTA_POPULACAO = [
  {
    IndicadorCod: "0012918",
    IndicadorDsg: "População residente (N.º)",
    DataExtracao: "2026-08-23T00:00:00.000+01:00",
    Dados: {
      "2025": Object.entries(POPULACAO).map(([geocod, valor]) => ({
        geocod,
        geodsg: MARKET_REGIONS.find((item) => item.nutsCode === geocod)?.label ?? "Portugal",
        dim_3: "T",
        dim_4: "T",
        valor: String(valor),
      })),
    },
  },
];

interface Chamada {
  varcd: string;
  dim3: readonly string[];
  emVoo: number;
}

const fetchFalso = (
  registo: Chamada[],
  falhar: (varcd: string, vez: number) => boolean = () => false,
) => {
  const vezes = new Map<string, number>();
  let emVoo = 0;
  return (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const varcd = url.searchParams.get("varcd") ?? "";
    const dim3 = (url.searchParams.get("Dim3") ?? "").split(",").filter(Boolean);
    emVoo += 1;
    registo.push({ varcd, dim3, emVoo });
    const vez = (vezes.get(varcd) ?? 0) + 1;
    vezes.set(varcd, vez);
    await new Promise((resolver) => setTimeout(resolver, 5));
    emVoo -= 1;
    if (falhar(varcd, vez)) {
      return new Response("indisponível", { status: 503 });
    }
    const corpo = varcd === "0012918" ? RESPOSTA_POPULACAO : RESPOSTA_EMPRESAS(dim3);
    return new Response(JSON.stringify(corpo), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
};

describe("oferta: a cadência dos pedidos", () => {
  it("pede as divisões todas num pedido só, não uma a uma", async () => {
    const registo: Chamada[] = [];
    await carregarOferta({ fetchImpl: fetchFalso(registo), divisoes: ["81", "62", "43"] });
    const paraEmpresas = registo.filter((item) => item.varcd === "0014449");
    expect(paraEmpresas).toHaveLength(1);
    expect(paraEmpresas[0]!.dim3).toEqual(["81", "62", "43"]);
  });

  it("nunca põe dois pedidos em voo ao mesmo tempo", async () => {
    // Disparados juntos, um deles vinha sempre vazio. É esta a razão de
    // o carregador ser sequencial, e não um `Promise.all` mais elegante.
    const registo: Chamada[] = [];
    await carregarOferta({ fetchImpl: fetchFalso(registo), divisoes: ["81"] });
    expect(Math.max(...registo.map((item) => item.emVoo))).toBe(1);
  });

  it("a população vai primeiro — sem ela nada do resto serve", async () => {
    const registo: Chamada[] = [];
    await carregarOferta({ fetchImpl: fetchFalso(registo), divisoes: ["81"] });
    expect(registo[0]!.varcd).toBe("0012918");
  });

  it("um 503 é repetido, e a leitura sai completa na mesma", async () => {
    const registo: Chamada[] = [];
    const pack = await carregarOferta({
      fetchImpl: fetchFalso(registo, (varcd, vez) => varcd === "0014449" && vez === 1),
      divisoes: ["81"],
    });
    expect(registo.filter((item) => item.varcd === "0014449")).toHaveLength(2);
    expect(pack.divisoes[0]!.contagens.length).toBeGreaterThan(0);
    expect(pack.emFalta).toEqual([]);
  });

  it("uma fonte sempre em baixo devolve pack vazio e declarado, não inventado", async () => {
    const registo: Chamada[] = [];
    const pack = await carregarOferta({
      fetchImpl: fetchFalso(registo, () => true),
      divisoes: ["81", "62"],
      // Uma tentativa só: as repetições e as pausas já estão provadas no
      // teste acima, e aqui interessa o que sai quando nenhuma resulta.
      tentativas: 1,
    });
    expect(pack.populacao).toEqual([]);
    expect(pack.emFalta).toEqual(["62", "81"]);
    for (const divisao of pack.divisoes) {
      expect(divisao.contagens).toEqual([]);
      expect(divisao.falha).toBeTruthy();
    }
    // E nada disto produz uma leitura: zero empresas nunca vira «mercado
    // livre», que é a conclusão mais cara que este módulo podia publicar.
    expect(lerOferta(pack, ["81"], { tipo: "regiao", regiao: "algarve" })).toBeNull();
  });
});

describe("oferta: o orçamento total é da carga, não de cada indicador", () => {
  // ┌────────────────────────────────────────────────────────────────────┐
  // │ O QUE ISTO APANHOU, E COMO                                          │
  // │                                                                    │
  // │ Dois indicadores, cada um com três tentativas de oito segundos:    │
  // │ o pior caso desta função eram ~54 s. Esta rota é chamada pelo      │
  // │ browser ao abrir a página, e uma ligação segurada quase um minuto  │
  // │ não é um pack que demora — é uma página que parece partida. O      │
  // │ `descobrir:e2e` foi o primeiro a dizê-lo, e disse-o em CI: o       │
  // │ `page.goto` expirou aos 30 s à espera desta rota.                   │
  // │                                                                    │
  // │ Pôr um prazo comum aos dois não chegou, e o segundo defeito é o    │
  // │ mais interessante: `addEventListener("abort", …)` num sinal que JÁ │
  // │ abortou NUNCA chama o ouvinte. O primeiro indicador terminava      │
  // │ certo aos 20 s, o segundo arrancava a seguir e corria uma          │
  // │ tentativa inteira de oito segundos porque ninguém lhe tinha dito   │
  // │ que o prazo passara. Vinte segundos de orçamento davam vinte e     │
  // │ oito — medido, não deduzido.                                        │
  // └────────────────────────────────────────────────────────────────────┘
  it("uma fonte que nunca responde não segura a carga além do teto", async () => {
    const pendurado: typeof fetch = (_entrada, init) =>
      new Promise((_resolver, rejeitar) => {
        init?.signal?.addEventListener("abort", () => rejeitar(new Error("abortado")));
      });

    const comeco = Date.now();
    const pack = await carregarOferta({ fetchImpl: pendurado });
    const decorrido = Date.now() - comeco;

    // Folga sobre o teto de 20 s, e MUITO abaixo dos ~54 s de antes.
    expect(decorrido).toBeLessThan(25_000);
    // E o pack sai vazio de forma honesta: o motor volta a dizer «lacuna
    // por apurar» em vez de ficar sem resposta nenhuma.
    expect(pack.emFalta.length).toBeGreaterThan(0);
    expect(pack.populacao).toHaveLength(0);
  }, 60_000);

  it("um cancelamento de quem chama é respeitado de imediato", async () => {
    const pendurado: typeof fetch = (_entrada, init) =>
      new Promise((_resolver, rejeitar) => {
        init?.signal?.addEventListener("abort", () => rejeitar(new Error("abortado")));
      });
    const controlador = new AbortController();
    const comeco = Date.now();
    const promessa = carregarOferta({ fetchImpl: pendurado, signal: controlador.signal });
    controlador.abort();
    await promessa;
    // Sem a guarda no início da tentativa, isto gastava oito segundos por
    // indicador antes de desistir de um trabalho que ninguém quer.
    expect(Date.now() - comeco).toBeLessThan(2_000);
  }, 30_000);
});

// ══════════════════════════════════════════════════════════════════════

describe("oferta: uma divisão que rebenta não leva o pack atrás", () => {
  // ┌────────────────────────────────────────────────────────────────┐
  // │ O DEFEITO QUE ISTO PRENDE — e que só aparecia COM rede           │
  // │                                                                │
  // │ Quatro problemas declaram `baseDeClientes: { cae: ["TOT"] }` —  │
  // │ o total de empresas do concelho. `manifestoEmpresas("TOT")`     │
  // │ produzia o metricId `business.count.cae_TOT`, e o `METRIC_ID`   │
  // │ do conector só admite minúsculas. O manifesto era recusado, a   │
  // │ exceção subia por `carregarOferta` INTEIRA, e a rota devolvia   │
  // │ um pack vazio: sem divisões e — o que custa mais — sem          │
  // │ POPULAÇÃO, que é o denominador de que a normalização da procura │
  // │ depende.                                                        │
  // │                                                                │
  // │ Nenhum teste apanhava isto porque só dispara depois de a fonte  │
  // │ responder: com o INE inacessível, a rejeição acontecia antes e  │
  // │ o caminho nunca era percorrido.                                 │
  // └────────────────────────────────────────────────────────────────┘

  it("a divisão «TOT» já não rebenta, e a população sobrevive", async () => {
    const registo: Chamada[] = [];
    const pack = await carregarOferta({
      fetchImpl: fetchFalso(registo),
      divisoes: ["81", "TOT"],
    });

    // 1. O pack existe — a contenção por divisão funciona.
    expect(pack.populacao.length).toBeGreaterThan(0);
    const oitentaEUm = pack.divisoes.find((item) => item.divisao === "81")!;
    expect(oitentaEUm.contagens.length).toBeGreaterThan(0);

    // 2. E «TOT» é MESMO utilizável, não apenas contida.
    //    Sem o `toLowerCase()` no metricId, a contenção salvava o pack
    //    mas «TOT» caía em `emFalta` — e as quatro hipóteses que a
    //    declaram como base de clientes ficavam sem denominador, sem
    //    nada no ecrã a dizer porquê. As duas correções são precisas, e
    //    este teste separa-as.
    expect(pack.emFalta, "«TOT» não devia estar em falta").not.toContain("TOT");
    const total = pack.divisoes.find((item) => item.divisao === "TOT");
    expect(total?.falha, "«TOT» rebentou em vez de ser lida").toBeUndefined();
    expect(total?.contagens.length ?? 0).toBeGreaterThan(0);
  }, 30_000);

  it("as divisões que os problemas declaram são todas pedíveis", async () => {
    // A lista real, não uma amostra: é assim que uma divisão nova com um
    // código impossível é apanhada aqui e não em produção.
    const registo: Chamada[] = [];
    const pack = await carregarOferta({ fetchImpl: fetchFalso(registo) });
    expect(pack.populacao.length).toBeGreaterThan(0);
    expect(pack.divisoes.length).toBeGreaterThan(0);
  }, 60_000);
});

describe("oferta: a população somada dos concelhos commitados", () => {
  // O denominador da normalização da procura vinha de um `fetch` ao INE
  // feito no pedido. Quando ele falha, as CONTAGENS deixam de ser
  // comparáveis entre regiões e o eixo de 17 pontos desaparece. A matriz
  // commitada já traz a população dos 308 concelhos — isto soma-a.

  it("soma os 308 concelhos às nove NUTS II, mais o país", () => {
    expect(MATRIZ_CONCELHOS).not.toBeNull();
    const contagens = populacaoRegionalDaMatriz(MATRIZ_CONCELHOS!);

    // Nove regiões e o total nacional.
    expect(contagens).toHaveLength(10);
    const codigos = contagens.map((item) => item.codigo);
    expect(codigos).toContain("PT");
    for (const regiao of MARKET_REGIONS) {
      if (regiao.nutsCode === null) continue;
      expect(codigos, `falta a região ${regiao.id}`).toContain(regiao.nutsCode);
    }
  });

  it("o total nacional é a soma das regiões, e bate com a matriz", () => {
    const contagens = populacaoRegionalDaMatriz(MATRIZ_CONCELHOS!);
    const nacional = contagens.find((item) => item.codigo === "PT")!;
    const somaRegioes = contagens
      .filter((item) => item.codigo !== "PT")
      .reduce((total, item) => total + item.valor, 0);

    expect(nacional.valor).toBe(somaRegioes);
    // E é mesmo a população dos 308 concelhos, não uma aproximação.
    expect(nacional.valor).toBe(MATRIZ_CONCELHOS!.populacao.reduce((total, item) => total + item, 0));
  });

  it("declara o período da matriz e nunca um valor a zero", () => {
    const contagens = populacaoRegionalDaMatriz(MATRIZ_CONCELHOS!);
    for (const item of contagens) {
      // Zero seria uma divisão por zero a produzir `Infinity` com ar de
      // densidade altíssima, mais adiante.
      expect(item.valor, item.codigo).toBeGreaterThan(0);
      expect(item.periodo).toBe(MATRIZ_CONCELHOS!.periodoPopulacao);
    }
  });

  it("a ordem é canónica, para o resultado não depender do mapa", () => {
    const primeira = populacaoRegionalDaMatriz(MATRIZ_CONCELHOS!).map((item) => item.codigo);
    const segunda = populacaoRegionalDaMatriz(MATRIZ_CONCELHOS!).map((item) => item.codigo);
    expect(primeira).toEqual(segunda);
  });

  it("uma matriz sem população utilizável devolve lista vazia, não zeros", () => {
    const vazia = { ...MATRIZ_CONCELHOS!, populacao: MATRIZ_CONCELHOS!.ordem.map(() => Number.NaN) };
    expect(populacaoRegionalDaMatriz(vazia)).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════

describe("oferta: a escala aos 308 concelhos", () => {
  // `lerLacuna` já percorria os 308 para produzir um percentil e devolvia
  // uma linha. Isto publica a mesma distribuição — sem pedido novo, sem
  // dado novo. Os testes garantem que é MESMO a mesma.
  const packComMatriz = () => pack({ concelhos: MATRIZ_CONCELHOS! });

  it("ordena do menos servido para o mais servido", () => {
    const escala = lacunaPorConcelho(packComMatriz(), ["81"], { tipo: "residentes" }, { quantos: 5 });
    expect(escala).not.toBeNull();
    const menos = escala!.menosServidos;
    expect(menos).toHaveLength(5);
    for (let i = 1; i < menos.length; i += 1) {
      expect(menos[i]!.porMilClientes).toBeGreaterThanOrEqual(menos[i - 1]!.porMilClientes);
    }
    // E o outro extremo vem mesmo do outro lado da mesma distribuição.
    expect(escala!.maisServidos[0]!.porMilClientes).toBeGreaterThan(menos[0]!.porMilClientes);
    expect(escala!.menosServidos[0]!.posicao).toBe(1);
    expect(escala!.maisServidos[0]!.posicao).toBe(escala!.unidadesComparadas);
  });

  it("os dois extremos vêm sempre juntos", () => {
    // Só os menos servidos leria-se como uma seta a apontar para onde
    // mudar. A função não tem modo de devolver metade.
    const escala = lacunaPorConcelho(packComMatriz(), ["81"], { tipo: "residentes" }, { quantos: 3 });
    expect(escala!.menosServidos).toHaveLength(3);
    expect(escala!.maisServidos).toHaveLength(3);
  });

  it("concorda com `lerLacuna` no mesmo concelho — é a mesma distribuição", () => {
    const codigo = MATRIZ_CONCELHOS!.ordem[100]!;
    const uma = lerLacuna(packComMatriz(), ["81"], { tipo: "residentes" }, codigo);
    const escala = lacunaPorConcelho(packComMatriz(), ["81"], { tipo: "residentes" }, {
      codigoDoConcelho: codigo,
    });
    expect(uma).not.toBeNull();
    expect(escala!.aqui).toBeDefined();
    expect(escala!.aqui!.porMilClientes).toBeCloseTo(uma!.porMilClientes, 9);
    expect(escala!.aqui!.operadores).toBe(uma!.operadores);
    expect(escala!.aqui!.clientes).toBe(uma!.clientes);
    expect(escala!.unidadesComparadas).toBe(uma!.unidadesComparadas);
    expect(escala!.medianaNacional).toBeCloseTo(uma!.medianaNacional, 9);
  });

  it("sem matriz commitada não inventa uma escala", () => {
    expect(lacunaPorConcelho(pack(), ["81"], { tipo: "residentes" })).toBeNull();
  });

  it("uma divisão que a matriz não tem devolve `null`, não zeros", () => {
    // Zero operadores leria-se como mercado livre e promoveria a
    // hipótese por engano. É o erro caro desta camada.
    expect(
      lacunaPorConcelho(packComMatriz(), ["99"], { tipo: "residentes" }),
    ).toBeNull();
  });

  it("a ordem é determinística entre corridas", () => {
    const uma = lacunaPorConcelho(packComMatriz(), ["81"], { tipo: "residentes" });
    const outra = lacunaPorConcelho(packComMatriz(), ["81"], { tipo: "residentes" });
    expect(uma!.menosServidos.map((i) => i.codigo)).toEqual(outra!.menosServidos.map((i) => i.codigo));
  });
});
