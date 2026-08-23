// ═══════════════════════════════════════════════════════════════════════
//  A AUDITORIA, PRESA EM TESTES
//  ---------------------------------------------------------------------
//  Uma auditoria externa mediu o motor com 800 contextos sintéticos e
//  encontrou seis defeitos críticos. O mais duro não era nenhum bug: era
//  que a honestidade vivia nos comentários e nos tipos, e a aritmética
//  por baixo não a cumpria.
//
//   · o VALOR de uma série oficial nunca era lido — um mercado a explodir
//     e um a colapsar davam a mesma pontuação (89) e a mesma confiança;
//   · ~20 % da «pontuação global» media quantos dados tínhamos, não o
//     negócio — a mistura que o cabeçalho do scoring proíbe em letra
//     grande;
//   · três dos dez eixos eram constantes ou permanentemente `null`.
//
//  Este ficheiro existe para que nenhum deles volte em silêncio. Cada
//  bloco cita o achado que prende, e mede o que a auditoria mediu — não
//  um número exato, mas o COMPORTAMENTO que o número denunciava.
//
//  O pipeline é puro e síncrono, o que torna esta medição trivial. Isso é
//  mérito do desenho e vale a pena manter.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { CONTEXTO_INICIAL, type AtivoId, type OpportunityContext } from "@/lib/negocio/descoberta/contexto/tipos";
import { COMPETENCIAS } from "@/lib/negocio/descoberta/conhecimento/dados/competencias";
import { PROBLEMAS } from "@/lib/negocio/descoberta/conhecimento/dados/problemas";
import { MODELOS_RECEITA } from "@/lib/negocio/descoberta/conhecimento/dados/modelos";
import { descobrir } from "@/lib/negocio/descoberta/motor/pipeline";
import {
  PESOS_SCORE,
  cobertura,
  intervaloDePontuacao,
  pontuacaoGlobal,
} from "@/lib/negocio/descoberta/motor/scoring";
import { PESOS_FIT } from "@/lib/negocio/descoberta/motor/fit";
import { lerIntensidade, agregarIntensidade } from "@/lib/negocio/descoberta/motor/intensidade";
import { fracaoCoberta } from "@/lib/negocio/descoberta/motor/viabilidade";
import { riscosForaDaTolerancia } from "@/lib/negocio/descoberta/motor/risco";
import { CENARIOS_WHATIF, compararCenario } from "@/lib/negocio/descoberta/motor/whatif";
import type { OpportunityCandidate, OpportunityScore } from "@/lib/negocio/descoberta/motor/tipos";
import type { MarketObservationSummary, MarketPilotEvidence } from "@/lib/negocio/market/opportunities";
import { MARKET_REGIONS } from "@/lib/negocio/market/geografia";

const AGORA = "2026-08-23T00:00:00.000Z";
const correr = (contexto: OpportunityContext) =>
  descobrir(contexto, { agora: () => AGORA, limite: 10 });

// ── Contextos sintéticos, deterministicamente ────────────────────────
//  Um gerador congruente linear em vez de `Math.random`: o motor é
//  determinístico e os testes que o medem também têm de ser.

function* aleatorio(semente: number): Generator<number> {
  let estado = semente;
  for (;;) {
    estado = (estado * 1_103_515_245 + 12_345) % 2_147_483_648;
    yield estado / 2_147_483_648;
  }
}

const ATIVOS_POSSIVEIS: readonly AtivoId[] = [
  "computador",
  "ferramentas",
  "veiculo-ligeiro",
  "carta-conducao",
  "equipamento-tecnico",
  "espaco-comercial",
];

function contextosSinteticos(quantos: number): readonly OpportunityContext[] {
  const dados = aleatorio(20_260_823);
  const proximo = () => dados.next().value as number;
  const escolher = <T,>(lista: readonly T[]): T => lista[Math.floor(proximo() * lista.length)]!;

  const contextos: OpportunityContext[] = [];
  for (let indice = 0; indice < quantos; indice += 1) {
    const quantasCompetencias = 1 + Math.floor(proximo() * 4);
    const competencias = Array.from({ length: quantasCompetencias }, () => escolher(COMPETENCIAS))
      .filter((item, posicao, lista) => lista.findIndex((outro) => outro.id === item.id) === posicao)
      .map((item) => ({
        id: item.id,
        nivel: escolher(["basico", "intermedio", "avancado"] as const),
        anos: Math.floor(proximo() * 12),
        experiencia: escolher([
          "interesse",
          "sei-fazer",
          "trabalhei",
          "geri",
          "conheco-setor",
          "tenho-contactos",
        ] as const),
      }));

    contextos.push({
      ...CONTEXTO_INICIAL,
      localizacao: {
        regiao: escolher(MARKET_REGIONS).id,
        alcance: escolher(["bairro", "concelho", "regiao", "nacional", "online"] as const),
        territorio: proximo() < 0.7 ? escolher(["urbano", "suburbano", "rural"] as const) : undefined,
        raioKm: proximo() < 0.5 ? escolher([5, 15, 30, 60]) : undefined,
      },
      capital: {
        disponivelAgora: proximo() < 0.8 ? escolher([0, 500, 2000, 5000, 15_000, 40_000]) : undefined,
        mensal: proximo() < 0.4 ? escolher([100, 500, 1500]) : undefined,
      },
      ativos: ATIVOS_POSSIVEIS.filter(() => proximo() < 0.35),
      tempo: {
        dedicacao: escolher(["integral", "part-time", "fins-de-semana", "poucas-horas"] as const),
        prazoMaxPrimeiraReceitaMeses: proximo() < 0.6 ? escolher([1, 3, 6, 12]) : undefined,
        prazoArranqueMeses: proximo() < 0.4 ? escolher([1, 3, 6]) : undefined,
      },
      rendimento: {
        ambicao: escolher(["complemento", "substituir-salario", "crescer", "escalar"] as const),
        minimoMensal: proximo() < 0.5 ? escolher([400, 900, 1500, 2500]) : undefined,
      },
      competencias,
      equipa: { forma: escolher(["sozinho", "casal", "socios"] as const) },
      risco: { perfil: escolher(["muito-conservador", "conservador", "moderado", "arrojado"] as const) },
    });
  }
  return contextos;
}

interface Estatistica {
  nulos: number;
  minimo: number;
  maximo: number;
  media: number;
  desvio: number;
  avaliados: number;
}

function estatisticaDe(valores: readonly (number | null)[]): Estatistica {
  const numeros = valores.filter((item): item is number => item !== null);
  if (numeros.length === 0) {
    return { nulos: valores.length, minimo: 0, maximo: 0, media: 0, desvio: 0, avaliados: 0 };
  }
  const media = numeros.reduce((total, item) => total + item, 0) / numeros.length;
  const variancia =
    numeros.reduce((total, item) => total + (item - media) ** 2, 0) / numeros.length;
  return {
    nulos: valores.length - numeros.length,
    minimo: Math.min(...numeros),
    maximo: Math.max(...numeros),
    media,
    desvio: Math.sqrt(variancia),
    avaliados: numeros.length,
  };
}

const CANDIDATOS = (() => {
  const todos: OpportunityCandidate[] = [];
  for (const contexto of contextosSinteticos(200)) todos.push(...correr(contexto).candidatos);
  return todos;
})();

// ══════════════════════════════════════════════════════════════════════

describe("auditoria F-04 · nenhum eixo do score é uma constante", () => {
  // ┌──────────────────────────────────────────────────────────────────┐
  // │ Medido pela auditoria, com 1 652 candidatos:                      │
  // │                                                                  │
  // │   exequibilidade ....... min 100 · max 100 · desvio 0,0           │
  // │   qualidadeDaEvidencia .. min   0 · max   0 · desvio 0,0          │
  // │   lacunaDeOferta ........ 1 652 nulos (código inalcançável)       │
  // │                                                                  │
  // │ «44 dos 100 pontos de peso não produzem qualquer ordenação.» Um   │
  // │ eixo constante é peso morto: não muda ordem nenhuma e reduz o     │
  // │ peso relativo dos que mudam.                                      │
  // └──────────────────────────────────────────────────────────────────┘
  const eixos = Object.keys(PESOS_SCORE) as (keyof OpportunityScore)[];

  it("há candidatos que cheguem para a medição valer alguma coisa", () => {
    expect(CANDIDATOS.length).toBeGreaterThan(200);
  });

  for (const eixo of ["fitPessoal", "exequibilidade", "regulacao", "geografia"] as const) {
    it(`${eixo} discrimina — desvio maior que zero`, () => {
      const estatistica = estatisticaDe(CANDIDATOS.map((item) => item.scores[eixo]));
      expect(estatistica.avaliados).toBeGreaterThan(0);
      expect(estatistica.desvio).toBeGreaterThan(1);
      expect(estatistica.maximo).toBeGreaterThan(estatistica.minimo);
    });
  }

  it("a exequibilidade deixou de saturar no topo", () => {
    const estatistica = estatisticaDe(CANDIDATOS.map((item) => item.scores.exequibilidade));
    // Antes: 100 em todos os 1 652 candidatos.
    expect(estatistica.maximo).toBeLessThan(100);
    expect(estatistica.desvio).toBeGreaterThan(3);
  });

  it("a geografia deixou de responder apenas «preencheste o formulário?»", () => {
    // Antes: média 97,2 · desvio 8,1, com 25 dos 28 problemas nacionais.
    const estatistica = estatisticaDe(CANDIDATOS.map((item) => item.scores.geografia));
    expect(estatistica.media).toBeLessThan(95);
    expect(estatistica.desvio).toBeGreaterThan(8);
  });

  it("nenhuma dimensão do score mede a quantidade de dados", () => {
    // F-02: `qualidadeDaEvidencia` e `frescura` saíram para a confiança.
    expect(eixos).not.toContain("qualidadeDaEvidencia");
    expect(eixos).not.toContain("frescura");
    expect(Object.values(PESOS_SCORE).reduce((total, peso) => total + peso, 0)).toBe(100);
  });
});

describe("auditoria F-05 · o fit e o score não pontuam a mesma variável duas vezes", () => {
  // ┌──────────────────────────────────────────────────────────────────┐
  // │ «O fit vale 26 e já contém capital (15/100), tempo (15), ativos   │
  // │ (15), geografia (10) e equipa (5). O score volta a pontuar as     │
  // │ mesmas variáveis em economia (14), exequibilidade (10) e          │
  // │ geografia (6). O capital entra três vezes.»                       │
  // │                                                                  │
  // │     Peso declarado ....... 26 %                                   │
  // │     Peso efetivo ........ ~50 %                                   │
  // └──────────────────────────────────────────────────────────────────┘
  it("a matriz de sobreposição está vazia — nenhum eixo do fit repete uma dimensão do score", () => {
    const doFit = new Set(Object.keys(PESOS_FIT));
    // Estes quatro eram os culpados, e cada um foi para a dimensão cuja
    // pergunta responde: capital e prazo → economia; tempo e equipa →
    // exequibilidade; geografia → geografia.
    for (const repetido of ["capital", "tempo", "equipa", "geografia"]) {
      expect(doFit.has(repetido), `«${repetido}» voltou ao fit`).toBe(false);
    }
    expect(Object.values(PESOS_FIT).reduce((total, peso) => total + peso, 0)).toBe(100);
  });

  it("o capital declarado move a economia e NÃO move o fit", () => {
    const base: OpportunityContext = {
      ...CONTEXTO_INICIAL,
      localizacao: { regiao: "norte", alcance: "regiao", territorio: "urbano" },
      competencias: [{ id: COMPETENCIAS[0]!.id, nivel: "avancado" }],
      ativos: [...ATIVOS_POSSIVEIS],
      capital: { disponivelAgora: 1000 },
    };
    const rico: OpportunityContext = { ...base, capital: { disponivelAgora: 60_000 } };

    const antes = correr(base).candidatos;
    const depois = correr(rico).candidatos;
    const porId = new Map(depois.map((item) => [item.id, item]));

    let comparados = 0;
    for (const candidato of antes) {
      const outro = porId.get(candidato.id);
      if (!outro) continue;
      comparados += 1;
      expect(outro.fit, candidato.titulo).toBe(candidato.fit);
    }
    expect(comparados).toBeGreaterThan(0);
  });
});

describe("auditoria F-06 · a economia deixou de ser decidida pelo melhor caso", () => {
  // «Um intervalo de 4 500–30 000 € "cabe" num teto de 5 000 €. O stress
  //  test chega a escrever a objeção certa e o score usa o mínimo à
  //  mesma. Média medida do eixo economia: 94,9 / 100.»
  it("um teto que cobre só o mínimo não vale o mesmo que um que cobre o topo", () => {
    const alcance = {
      min: 4500,
      max: 30_000,
      unidade: "€",
      proveniencia: { origem: "estimativa" as const, fonte: "teste" },
    };
    expect(fracaoCoberta(alcance, 4500)).toBe(0);
    expect(fracaoCoberta(alcance, 30_000)).toBe(1);
    expect(fracaoCoberta(alcance, 17_250)).toBeCloseTo(0.5, 2);
    // Não declarar capital continua a ser `null`, e não zero.
    expect(fracaoCoberta(alcance, undefined)).toBeNull();
  });

  it("o eixo da economia deixou de saturar no topo", () => {
    const estatistica = estatisticaDe(CANDIDATOS.map((item) => item.scores.economia));
    expect(estatistica.avaliados).toBeGreaterThan(0);
    expect(estatistica.media).toBeLessThan(94.9);
    expect(estatistica.desvio).toBeGreaterThan(5);
  });
});

describe("auditoria F-01 e F-02 · a procura lê o valor, não conta as linhas", () => {
  const REGIONAIS = MARKET_REGIONS.filter((item) => item.nutsCode !== null);

  /** Uma série publicada nas nove NUTS II, com o valor que quisermos aqui. */
  const serieRegional = (
    seriesId: string,
    valores: readonly number[],
    unidade = "%",
  ): readonly MarketObservationSummary[] =>
    REGIONAIS.map(
      (regiao, indice) =>
        ({
          id: `${seriesId}:${regiao.nutsCode}`,
          metricId: seriesId,
          seriesId,
          seriesLabel: `Série ${seriesId}`,
          value: valores[indice] ?? valores[valores.length - 1]!,
          unit: unidade,
          geography: {
            country: "PT",
            level: "nuts2",
            code: regiao.nutsCode!,
            name: regiao.label,
          },
          referencePeriod: { start: "2025-01-01", end: "2025-12-31", label: "2025" },
          retrievedAt: AGORA,
          validUntil: "2027-12-31",
          sourceId: "ine",
          license: { status: "approved", scope: "dataset", identifier: "CC BY 4.0", url: "u" },
          reading: "teste",
          independenceKey: "ine:teste",
          kind: "demand",
          critical: false,
          semanticMapping: "approved",
        }) as unknown as MarketObservationSummary,
    );

  it("um mercado no topo do país e um mercado no fundo não pontuam igual", () => {
    // ┌────────────────────────────────────────────────────────────────┐
    // │ Medido pela auditoria, mesmo candidato e mesmo contexto:        │
    // │   séries com valores 98, 95, 99  →  global 89 · procura 100     │
    // │   séries com valores  2,  1,  0  →  global 89 · procura 100     │
    // │ «Um mercado em colapso e um mercado em explosão eram            │
    // │  indistinguíveis.»                                              │
    // └────────────────────────────────────────────────────────────────┘
    const noTopo = agregarIntensidade(
      lerIntensidade({
        observacoes: serieRegional("s1", [98, 10, 12, 14, 16, 18, 20, 22, 24]),
        regiao: "norte",
      }),
    );
    const noFundo = agregarIntensidade(
      lerIntensidade({
        observacoes: serieRegional("s1", [2, 40, 50, 60, 70, 80, 90, 95, 99]),
        regiao: "norte",
      }),
    );
    expect(noTopo.posicao).not.toBeNull();
    expect(noFundo.posicao).not.toBeNull();
    expect(noTopo.posicao!).toBeGreaterThan(noFundo.posicao! + 40);
  });

  it("cinco leituras medíocres não batem uma leitura excelente", () => {
    // «Cinco leituras medíocres batiam três leituras excelentes.»
    const cincoMedias = agregarIntensidade(
      lerIntensidade({
        observacoes: [
          ...serieRegional("a", [50, 50, 50, 50, 50, 50, 50, 50, 50]),
          ...serieRegional("b", [50, 50, 50, 50, 50, 50, 50, 50, 50]),
          ...serieRegional("c", [50, 50, 50, 50, 50, 50, 50, 50, 50]),
          ...serieRegional("d", [50, 50, 50, 50, 50, 50, 50, 50, 50]),
          ...serieRegional("e", [50, 50, 50, 50, 50, 50, 50, 50, 50]),
        ],
        regiao: "norte",
      }),
    );
    const umaExcelente = agregarIntensidade(
      lerIntensidade({
        observacoes: serieRegional("a", [99, 10, 11, 12, 13, 14, 15, 16, 17]),
        regiao: "norte",
      }),
    );
    expect(umaExcelente.posicao!).toBeGreaterThan(cincoMedias.posicao!);
  });

  it("uma contagem absoluta não se compara entre regiões sem denominador", () => {
    // A armadilha: comparar «sociedades nascidas» entre o Norte e o
    // Algarve mede o tamanho da região, não a intensidade do problema.
    const semPopulacao = lerIntensidade({
      observacoes: serieRegional("contagem", [900, 100, 200, 300, 400, 500, 600, 700, 800], "empresas"),
      regiao: "norte",
    });
    expect(semPopulacao).toEqual([]);

    // Com população, a mesma série já é comparável — e a região com mais
    // empresas em termos absolutos pode ficar em baixo por habitante.
    const populacao = MARKET_REGIONS.filter((item) => item.nutsCode !== null).map((item, indice) => ({
      codigo: item.nutsCode!,
      valor: indice === 0 ? 3_600_000 : 400_000,
      periodo: "2025",
    }));
    const comPopulacao = lerIntensidade({
      observacoes: serieRegional("contagem", [900, 100, 200, 300, 400, 500, 600, 700, 800], "empresas"),
      regiao: "norte",
      populacao,
    });
    expect(comPopulacao).toHaveLength(1);
    expect(comPopulacao[0]!.porHabitante).toBe(true);
    // 900/3,6M é menos por habitante do que 800/400k: o Norte cai.
    expect(comPopulacao[0]!.posicao).toBeLessThan(30);
  });

  it("sem zona fixada não há régua, e a resposta é «não sabemos»", () => {
    const semZona = lerIntensidade({
      observacoes: serieRegional("s1", [98, 10, 12, 14, 16, 18, 20, 22, 24]),
      regiao: "portugal",
    });
    expect(semZona).toEqual([]);
  });

  it("a base de comparação vai sempre declarada", () => {
    const leituras = lerIntensidade({
      observacoes: serieRegional("s1", [98, 10, 12, 14, 16, 18, 20, 22, 24]),
      regiao: "norte",
    });
    expect(leituras).toHaveLength(1);
    expect(leituras[0]!.base).toBe("distribuicao-regional");
    expect(leituras[0]!.referencia).toContain("regiões");
    expect(leituras[0]!.regioesComparadas).toBe(9);
  });
});

describe("auditoria F-16 · o gate de evidência governa o motor", () => {
  // «Um piloto em estado `stale` ou `contradicted` contribuía para o
  //  score de procura exatamente como um `evidence_qualified`.
  //  `usableObservationIds` já vinha no payload e não era lido.»
  const observacao = (id: string): MarketObservationSummary =>
    ({
      id,
      metricId: id,
      seriesId: "tourism-occupancy",
      seriesLabel: "Ocupação",
      value: 62,
      unit: "%",
      geography: { country: "PT", level: "nuts2", code: "15", name: "Algarve" },
      referencePeriod: { start: "2025-01-01", end: "2025-12-31", label: "2025" },
      retrievedAt: AGORA,
      validUntil: "2027-12-31",
      sourceId: "ine",
      license: { status: "approved", scope: "dataset", identifier: "CC BY 4.0", url: "u" },
      reading: "teste",
      independenceKey: "ine:tourism",
      kind: "demand",
      critical: false,
      semanticMapping: "approved",
    }) as unknown as MarketObservationSummary;

  const pack = (estado: string, utilizaveis: readonly string[]): MarketPilotEvidence =>
    ({
      templateId: "tourism-guest-operations",
      checkedAt: AGORA,
      gate: { state: estado, label: estado, reasons: [], missing: [], usableObservationIds: utilizaveis, evaluatedAt: AGORA },
      observations: [observacao("o1"), observacao("o2")],
      sourceHealth: [],
    }) as unknown as MarketPilotEvidence;

  const contexto: OpportunityContext = {
    ...CONTEXTO_INICIAL,
    localizacao: { regiao: "algarve", alcance: "regiao", territorio: "urbano" },
    competencias: COMPETENCIAS.slice(0, 6).map((item) => ({ id: item.id, nivel: "avancado" as const })),
    ativos: [...ATIVOS_POSSIVEIS],
  };

  const comPack = (evidencia: MarketPilotEvidence) =>
    descobrir(contexto, { agora: () => AGORA, evidencia: [evidencia], limite: 10 });

  it("uma observação que o gate não considera utilizável não entra na evidência", () => {
    const admitidas = comPack(pack("evidence_qualified", ["o1", "o2"]));
    const recusadas = comPack(pack("evidence_qualified", []));
    expect(admitidas.telemetria.observacoesUsadas).toBeGreaterThan(0);
    expect(recusadas.telemetria.observacoesUsadas).toBe(0);
  });

  it("o estado do gate é o TETO da confiança, e não uma parcela", () => {
    const contradito = comPack(pack("contradicted", ["o1", "o2"]));
    for (const candidato of contradito.candidatos) {
      if (candidato.confianca.tetoDoGate === null) continue;
      expect(candidato.confianca.nivel).toBe("insuficiente");
    }
  });
});

describe("auditoria F-08 · o risco de concorrência deixou de ser uma constante que pune", () => {
  // «Devolve sempre nível 2 (…) para quem declara perfil muito
  //  conservador marca TODAS as hipóteses como fora de tolerância — o
  //  que empurra 32,6 % dos candidatos para objeção fatal por
  //  acumulação.»
  it("um risco por apurar não conta para a contagem que baixa o score", () => {
    const conservador: OpportunityContext = {
      ...CONTEXTO_INICIAL,
      localizacao: { regiao: "norte", alcance: "regiao", territorio: "urbano" },
      competencias: COMPETENCIAS.slice(0, 6).map((item) => ({ id: item.id, nivel: "avancado" as const })),
      ativos: [...ATIVOS_POSSIVEIS],
      risco: { perfil: "muito-conservador" },
    };
    const resultado = correr(conservador);
    expect(resultado.candidatos.length).toBeGreaterThan(0);

    for (const candidato of resultado.candidatos) {
      const concorrencia = candidato.riscos.find((item) => item.dimensao === "concorrencia")!;
      if (concorrencia.apurado) continue;
      // Sem oferta ligada, a concorrência é uma suposição prudente — e
      // uma suposição não pode custar pontos NEM produzir veredito.
      //
      // Este `expect` dizia `false`, que é o que o campo valia: o nível
      // assumido era comparado com a tolerância como se tivesse sido
      // medido, e o ecrã mostrava «acima do que aceitas» a vermelho. O
      // valor certo para «não medimos isto» é `null` — ausência de
      // conhecimento não é uma afirmação sobre o negócio.
      expect(concorrencia.dentroDaTolerancia).toBeNull();
      expect(riscosForaDaTolerancia([concorrencia])).toBe(0);
    }
  });

  it("uma objeção fatal por risco exige gravidade, não só acumulação", () => {
    // ┌────────────────────────────────────────────────────────────────┐
    // │ A regra era `fora.length >= 4`, e um perfil «muito              │
    // │ conservador» — tolerância 0 em tudo — recebia objeção fatal em  │
    // │ DEZ de dez hipóteses: quatro dimensões nunca descem abaixo de   │
    // │ 1 em negócio nenhum. O perfil era insatisfazível e o motor      │
    // │ respondia como se o defeito fosse de cada hipótese.             │
    // └────────────────────────────────────────────────────────────────┘
    const comFatalDeRisco = CANDIDATOS.filter((item) =>
      item.objecoes.some((objecao) => objecao.id === "risco" && objecao.fatal && objecao.procede),
    );
    for (const candidato of comFatalDeRisco) {
      const fora = candidato.riscos.filter((item) => item.dentroDaTolerancia === false);
      expect(fora.length).toBeGreaterThanOrEqual(4);
      expect(fora.some((item) => item.nivel >= 3), candidato.titulo).toBe(true);
    }
  });

  it("um perfil insatisfazível é dito como tal, e não repetido como defeito de cada hipótese", () => {
    const impossivel: OpportunityContext = {
      ...CONTEXTO_INICIAL,
      localizacao: { regiao: "norte", alcance: "regiao", territorio: "urbano" },
      competencias: COMPETENCIAS.slice(0, 8).map((item) => ({ id: item.id, nivel: "avancado" as const })),
      ativos: [...ATIVOS_POSSIVEIS],
      risco: { perfil: "muito-conservador" },
    };
    const candidatos = correr(impossivel).candidatos;
    expect(candidatos.length).toBeGreaterThan(0);
    const comAviso = candidatos.filter((item) =>
      item.objecoes.some((objecao) => objecao.id === "tolerancia" && objecao.procede),
    );
    expect(comAviso.length).toBeGreaterThan(0);
    expect(comAviso[0]!.objecoes.find((item) => item.id === "tolerancia")!.fatal).toBe(false);

    // E deixou de ser fatal em todas: um perfil apertado estreita a
    // lista, não a apaga.
    const fatais = candidatos.filter((item) =>
      item.objecoes.some((objecao) => objecao.fatal && objecao.procede),
    );
    expect(fatais.length).toBeLessThan(candidatos.length);
  });
});

describe("auditoria F-10 · a pontuação vai publicada com a incerteza ao lado", () => {
  it("o intervalo colapsa no ponto quando tudo foi avaliável", () => {
    const completo: OpportunityScore = {
      fitPessoal: 70,
      procura: 70,
      lacunaDeOferta: 70,
      economia: 70,
      exequibilidade: 70,
      regulacao: 70,
      risco: 70,
      geografia: 70,
    };
    const intervalo = intervaloDePontuacao(completo);
    expect(intervalo.fechado).toBe(true);
    expect(intervalo.min).toBe(intervalo.max);
    expect(intervalo.ponto).toBe(pontuacaoGlobal(completo));
    expect(cobertura(completo)).toBe(1);
  });

  it("o intervalo abre-se quando há dimensões por avaliar, e contém o ponto", () => {
    const incompleto: OpportunityScore = {
      fitPessoal: 80,
      procura: null,
      lacunaDeOferta: null,
      economia: null,
      exequibilidade: 80,
      regulacao: 80,
      risco: 80,
      geografia: 80,
    };
    const intervalo = intervaloDePontuacao(incompleto);
    expect(intervalo.fechado).toBe(false);
    expect(intervalo.min).toBeLessThan(intervalo.ponto);
    expect(intervalo.max).toBeGreaterThanOrEqual(intervalo.ponto);
    expect(cobertura(incompleto)).toBeLessThan(1);
  });

  it("responder a mais perguntas fecha o intervalo — e é a recompensa certa", () => {
    const parcial: OpportunityScore = {
      fitPessoal: 75,
      procura: null,
      lacunaDeOferta: null,
      economia: null,
      exequibilidade: 75,
      regulacao: 75,
      risco: 75,
      geografia: 75,
    };
    const maisCompleto: OpportunityScore = { ...parcial, economia: 75 };
    const largura = (item: OpportunityScore) => {
      const intervalo = intervaloDePontuacao(item);
      return intervalo.max - intervalo.min;
    };
    expect(largura(maisCompleto)).toBeLessThan(largura(parcial));
  });
});

describe("auditoria F-11 · os campos recolhidos são lidos", () => {
  const base: OpportunityContext = {
    ...CONTEXTO_INICIAL,
    localizacao: { regiao: "norte", alcance: "regiao", territorio: "urbano" },
    competencias: COMPETENCIAS.slice(0, 6).map((item) => ({ id: item.id, nivel: "basico" as const })),
    ativos: [...ATIVOS_POSSIVEIS],
  };
  const fitMedio = (contexto: OpportunityContext) => {
    const candidatos = correr(contexto).candidatos;
    return candidatos.reduce((total, item) => total + item.fit, 0) / Math.max(1, candidatos.length);
  };

  it("o nível da competência muda o resultado — deixou de ser um booleano", () => {
    const avancado: OpportunityContext = {
      ...base,
      competencias: base.competencias.map((item) => ({ ...item, nivel: "avancado" as const })),
    };
    expect(fitMedio(avancado)).toBeGreaterThan(fitMedio(base));
  });

  it("o tipo de experiência muda o resultado, e «tenho contactos» é o que mais vale", () => {
    const comInteresse: OpportunityContext = {
      ...base,
      competencias: base.competencias.map((item) => ({ ...item, experiencia: "interesse" as const })),
    };
    const comContactos: OpportunityContext = {
      ...base,
      competencias: base.competencias.map((item) => ({ ...item, experiencia: "tenho-contactos" as const })),
    };
    expect(fitMedio(comContactos)).toBeGreaterThan(fitMedio(comInteresse));
  });

  it("os anos declarados contam", () => {
    const semAnos: OpportunityContext = {
      ...base,
      competencias: base.competencias.map((item) => ({ ...item, experiencia: "trabalhei" as const })),
    };
    const comAnos: OpportunityContext = {
      ...base,
      competencias: semAnos.competencias.map((item) => ({ ...item, anos: 8 })),
    };
    expect(fitMedio(comAnos)).toBeGreaterThan(fitMedio(semAnos));
  });

  it("o tipo de território muda a pontuação geográfica", () => {
    const rural: OpportunityContext = {
      ...base,
      localizacao: { ...base.localizacao, territorio: "rural" },
    };
    const geografiaDe = (contexto: OpportunityContext) => {
      const candidatos = correr(contexto).candidatos;
      return candidatos.map((item) => `${item.problema.id}:${item.scores.geografia}`).join("|");
    };
    expect(geografiaDe(rural)).not.toBe(geografiaDe(base));
  });

  it("a ambição confronta a escalabilidade do modelo", () => {
    const complemento: OpportunityContext = { ...base, rendimento: { ambicao: "complemento" } };
    const escalar: OpportunityContext = { ...base, rendimento: { ambicao: "escalar" } };
    // Quem quer escalar vê descer o encaixe dos modelos que trocam horas
    // por dinheiro — e a maioria dos modelos do grafo é assim.
    expect(fitMedio(escalar)).toBeLessThan(fitMedio(complemento));
  });

  it("o mínimo mensal é confrontado com o custo fixo do modelo", () => {
    const comMinimo: OpportunityContext = {
      ...base,
      rendimento: { ambicao: "substituir-salario", minimoMensal: 1500 },
    };
    const objecoes = correr(comMinimo).candidatos.flatMap((item) => item.objecoes);
    const doRendimento = objecoes.filter((item) => item.id === "rendimento");
    expect(doRendimento.length).toBeGreaterThan(0);
    expect(doRendimento[0]!.resposta).toContain("1500");
    expect(correr(base).candidatos.flatMap((item) => item.objecoes).some((item) => item.id === "rendimento")).toBe(false);
  });

  it("o prazo de arranque produz um calendário contado a partir de hoje", () => {
    const comArranque: OpportunityContext = {
      ...base,
      tempo: { ...base.tempo, prazoArranqueMeses: 6 },
    };
    const calendario = correr(comArranque)
      .candidatos.flatMap((item) => item.objecoes)
      .filter((item) => item.id === "calendario");
    expect(calendario.length).toBeGreaterThan(0);
    expect(calendario[0]!.resposta).toContain("6");
  });

  it("a estrutura pretendida interpela os modelos pesados", () => {
    // Modelos com equipa, espaço ou stock só sobrevivem com dedicação e
    // capital para os sustentar — senão as restrições eliminam-nos antes
    // de a pergunta da estrutura se levantar.
    const pesado: OpportunityContext = {
      ...base,
      competencias: COMPETENCIAS.map((item) => ({ id: item.id, nivel: "avancado" as const })),
      tempo: { dedicacao: "integral" },
      equipa: { forma: "socios", disponibilidadeContratar: true },
      capital: { disponivelAgora: 60_000 },
    };
    const recibos: OpportunityContext = { ...pesado, estrutura: "recibos-verdes" };
    const decidir: OpportunityContext = { ...pesado, estrutura: "por-decidir" };
    const conta = (contexto: OpportunityContext) =>
      correr(contexto).candidatos.flatMap((item) => item.objecoes).filter((item) => item.id === "estrutura").length;
    expect(conta(recibos)).toBeGreaterThan(0);
    expect(conta(decidir)).toBe(0);
  });
});

describe("auditoria F-12 e F-23 · as restrições inertes deixaram de o ser", () => {
  const base: OpportunityContext = {
    ...CONTEXTO_INICIAL,
    localizacao: { regiao: "algarve", alcance: "regiao", territorio: "urbano" },
    competencias: COMPETENCIAS.map((item) => ({ id: item.id, nivel: "avancado" as const })),
    ativos: [...ATIVOS_POSSIVEIS],
  };

  for (const restricao of ["sem-porta-a-porta", "sem-noites", "sem-redes-sociais"] as const) {
    it(`«${restricao}» tem efeito medível no resultado`, () => {
      const comRestricao: OpportunityContext = { ...base, restricoes: [restricao] };
      const antes = correr(base).candidatos;
      const depois = correr(comRestricao).candidatos;
      const porId = new Map(depois.map((item) => [item.id, item]));
      const desceram = antes.filter((item) => {
        const outro = porId.get(item.id);
        return outro !== undefined && outro.fit < item.fit;
      });
      expect(desceram.length, `«${restricao}» não mexeu em nada`).toBeGreaterThan(0);
    });
  }

  it("a procura ao fim de semana é uma propriedade do problema, não uma lista de ids", () => {
    // «Um problema novo com procura ao fim de semana passava incólume, e
    //  ninguém dava por isso.»
    const comFimDeSemana = PROBLEMAS.filter((item) => item.procuraFimDeSemana);
    expect(comFimDeSemana.length).toBeGreaterThanOrEqual(3);
    // E o campo é obrigatório: todos os problemas responderam.
    for (const problema of PROBLEMAS) {
      expect(typeof problema.procuraFimDeSemana, problema.id).toBe("boolean");
      expect(typeof problema.ocorrenciasForaDeHoras, problema.id).toBe("boolean");
      expect(problema.territoriosIntensos.length, problema.id).toBeGreaterThan(0);
    }
    for (const modelo of MODELOS_RECEITA) {
      expect(typeof modelo.dependeTrafegoPago, modelo.id).toBe("boolean");
      expect(typeof modelo.dependeAquisicaoDireta, modelo.id).toBe("boolean");
    }
  });
});

describe("auditoria F-19 e F-20 · a telemetria diz o que aconteceu", () => {
  it("o «e se» não conta variantes deduplicadas como hipóteses desbloqueadas", () => {
    const contexto: OpportunityContext = {
      ...CONTEXTO_INICIAL,
      localizacao: { regiao: "norte", alcance: "regiao", territorio: "urbano" },
      competencias: COMPETENCIAS.slice(0, 8).map((item) => ({ id: item.id, nivel: "avancado" as const })),
      ativos: [...ATIVOS_POSSIVEIS],
      preferencias: { ...CONTEXTO_INICIAL.preferencias, mercado: "b2c" },
    };
    const antes = correr(contexto);
    const cenario = CENARIOS_WHATIF.find((item) => item.id === "aceitar-b2b")!;
    const depois = correr(cenario.aplicar(contexto));
    const efeito = compararCenario(cenario, antes, depois);

    const recusadas = (resultado: typeof antes) =>
      resultado.descartados.filter((item) => item.motivo !== "duplicado").length;
    expect(efeito.desbloqueadas).toBe(Math.max(0, recusadas(antes) - recusadas(depois)));
    // E há duplicados na lista, senão o teste não estaria a testar nada.
    expect(antes.descartados.some((item) => item.motivo === "duplicado")).toBe(true);
  });

  it("cada etapa declara a unidade do que conta", () => {
    const contexto: OpportunityContext = {
      ...CONTEXTO_INICIAL,
      competencias: COMPETENCIAS.slice(0, 4).map((item) => ({ id: item.id, nivel: "avancado" as const })),
      ativos: [...ATIVOS_POSSIVEIS],
    };
    const { etapas } = correr(contexto).telemetria;
    for (const etapa of etapas) {
      expect(["hipoteses", "observacoes"]).toContain(etapa.unidadeEntrada);
      expect(["hipoteses", "observacoes"]).toContain(etapa.unidadeSaida);
    }
    const evidencia = etapas.find((item) => item.etapa === "evidencia")!;
    // A etapa que misturava unidades passa a declará-lo, e a marcar que
    // não filtra nada: nenhuma hipótese é eliminada à procura de dados.
    expect(evidencia.unidadeEntrada).toBe("hipoteses");
    expect(evidencia.unidadeSaida).toBe("observacoes");
    expect(evidencia.naoFiltra).toBe(true);
  });
});

describe("auditoria F-24 · não há números sem proveniência", () => {
  it("o custo mensal, quando existe, é um cálculo com fonte — nunca uma fração do capital", () => {
    const contexto: OpportunityContext = {
      ...CONTEXTO_INICIAL,
      localizacao: { regiao: "norte", alcance: "regiao", territorio: "urbano" },
      competencias: COMPETENCIAS.map((item) => ({ id: item.id, nivel: "avancado" as const })),
      ativos: [...ATIVOS_POSSIVEIS],
      equipa: { forma: "socios", disponibilidadeContratar: true },
      tempo: { dedicacao: "integral" },
      capital: { disponivelAgora: 60_000 },
    };
    // Sem teto de apresentação: os modelos com equipa raramente chegam
    // aos dez primeiros — a diversificação leva um por problema e os
    // modelos leves ganham. O que se testa aqui é o número, não o lugar.
    const todos = descobrir(contexto, { agora: () => AGORA, limite: 400 }).candidatos;
    const comCusto = todos.filter((item) => item.viabilidade.custoMensal !== null);
    expect(comCusto.length).toBeGreaterThan(0);
    for (const candidato of comCusto) {
      const custo = candidato.viabilidade.custoMensal!;
      expect(custo.proveniencia.origem).toBe("calculo");
      expect(custo.proveniencia.fonte).toContain("RMMG");
      expect(custo.proveniencia.limitacao).toBeTruthy();
      // E deixou de ser uma fração do capital do modelo.
      expect(custo.min).not.toBe(Math.round(candidato.modelo.capitalTipico.min / 10));
    }
  });

  it("todo o intervalo que chega ao ecrã traz origem declarada", () => {
    for (const candidato of CANDIDATOS.slice(0, 60)) {
      for (const intervalo of [
        candidato.viabilidade.investimentoInicial,
        candidato.viabilidade.custoMensal,
        candidato.viabilidade.tempoAteReceitaMeses,
      ]) {
        if (intervalo === null) continue;
        expect(intervalo.proveniencia.origem).toBeTruthy();
        expect(intervalo.proveniencia.fonte).toBeTruthy();
      }
    }
  });
});

describe("auditoria · o que estava bem continua bem", () => {
  it("o motor é determinístico, incluindo a ordem", () => {
    const contexto = contextosSinteticos(1)[0]!;
    const primeira = correr(contexto);
    const segunda = correr(contexto);
    expect(primeira.candidatos.map((item) => item.id)).toEqual(
      segunda.candidatos.map((item) => item.id),
    );
    expect(primeira.candidatos.map((item) => item.pontuacaoGlobal)).toEqual(
      segunda.candidatos.map((item) => item.pontuacaoGlobal),
    );
  });

  it("a diversidade sobrevive: não é sempre o mesmo problema em primeiro", () => {
    const primeiros = new Set<string>();
    for (const contexto of contextosSinteticos(60)) {
      const resultado = correr(contexto);
      if (resultado.candidatos.length > 0) primeiros.add(resultado.candidatos[0]!.problema.id);
    }
    expect(primeiros.size).toBeGreaterThan(8);
  });
});
