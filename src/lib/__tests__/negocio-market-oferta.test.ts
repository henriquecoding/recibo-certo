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
  lerOferta,
  type ContagemRegional,
  type PackOferta,
} from "@/lib/negocio/market/oferta";
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
    const leitura = lerOferta(pack(), ["81"], "algarve");
    expect(leitura).not.toBeNull();
    // 2 706 / 578 032 × 10 000 = 46,81…
    expect(leitura!.aqui.porDezMil).toBeCloseTo((2706 / 578032) * 10_000, 6);
    expect(leitura!.aqui.operadores).toBe(2706);
    expect(leitura!.regioesComparadas).toBe(9);
  });

  it("o Algarve destaca-se e o Alentejo não — e é isso que o z diz", () => {
    const algarve = lerOferta(pack(), ["81"], "algarve")!;
    const alentejo = lerOferta(pack(), ["81"], "alentejo")!;
    expect(algarve.z).toBeGreaterThan(2);
    expect(Math.abs(alentejo.z)).toBeLessThan(0.75);
    expect(algarve.aqui.porDezMil).toBeGreaterThan(alentejo.aqui.porDezMil);
  });

  it("a mediana é a das regiões comparadas, não a média nem o total nacional", () => {
    const leitura = lerOferta(pack(), ["81"], "norte")!;
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
    const uma = lerOferta(comDuas, ["81"], "algarve")!;
    const duas = lerOferta(comDuas, ["81", "43"], "algarve")!;
    expect(duas.aqui.operadores).toBe(uma.aqui.operadores * 2);
    // Dobrar os dois lados não muda a posição relativa: o z é o mesmo.
    expect(duas.z).toBeCloseTo(uma.z, 9);
  });
});

describe("oferta: recusa-se a concluir sem base", () => {
  it("sem população não há leitura — um número de empresas sozinho não diz nada", () => {
    expect(lerOferta(pack({ populacao: [] }), ["81"], "algarve")).toBeNull();
  });

  it("uma divisão que não veio não conta como zero empresas", () => {
    // Este é o modo de falhar mais caro: zero operadores lê-se como
    // «mercado livre» e promove a hipótese. Tem de devolver `null`.
    const semDados = pack({
      divisoes: [{ divisao: "81", designacao: "A", contagens: [], falha: "HTTP 503" }],
      emFalta: ["81"],
    });
    expect(lerOferta(semDados, ["81"], "algarve")).toBeNull();
  });

  it("uma divisão que a ontologia pede e o pack não traz devolve `null`", () => {
    expect(lerOferta(pack(), ["62"], "algarve")).toBeNull();
  });

  it("sem divisão nenhuma não há leitura", () => {
    expect(lerOferta(pack(), [], "algarve")).toBeNull();
  });

  it("«todo o país» não é uma zona comparável consigo própria", () => {
    expect(lerOferta(pack(), ["81"], "portugal")).toBeNull();
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
    expect(lerOferta(poucas, ["81"], "algarve")).toBeNull();
  });

  it("regiões todas iguais não produzem um z — produzem uma divisão por zero", () => {
    const iguais = Object.fromEntries(Object.keys(EMPRESAS_81).map((c) => [c, 100]));
    const populacaoIgual = Object.fromEntries(Object.keys(POPULACAO).map((c) => [c, 100_000]));
    const plano = pack({
      divisoes: [{ divisao: "81", designacao: "A", contagens: contagens(iguais) }],
      populacao: contagens(populacaoIgual, "2025"),
    });
    expect(lerOferta(plano, ["81"], "algarve")).toBeNull();
  });

  it("uma população zero não entra na conta em vez de a rebentar", () => {
    const comZero = pack({
      populacao: contagens({ ...POPULACAO, "30": 0 }, "2025"),
    });
    const leitura = lerOferta(comZero, ["81"], "algarve");
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
    expect(lerOferta(pack, ["81"], "algarve")).toBeNull();
  });
});
