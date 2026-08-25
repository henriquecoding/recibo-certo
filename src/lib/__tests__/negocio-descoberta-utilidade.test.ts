// ═══════════════════════════════════════════════════════════════════════
//  UTILIDADE — o que a suite antiga não conseguia ver
//  ---------------------------------------------------------------------
//  A suite `negocio-*` verifica COERÊNCIA INTERNA: que os pesos somam
//  100, que `null` propaga, que a ordem é determinística, que nenhuma
//  dimensão pontua duas vezes. Tudo isso está certo e continua a passar.
//
//  O que nenhum teste verificava era UTILIDADE DO RESULTADO. Nenhum
//  falhava se `procura` fosse `null` em 100 % das hipóteses; nenhum
//  falhava se o peso vivo caísse para 70 em 100; nenhum falhava se um
//  pacote de piloto chegasse com zero observações. Um motor pode estar
//  perfeitamente coerente e perfeitamente inútil ao mesmo tempo — e
//  esteve, sem uma única luz vermelha.
//
//  ── PORQUE ISTO NÃO TOCA NA REDE ───────────────────────────────────
//  Corre só sobre dados COMMITADOS: o instantâneo de procura e a matriz
//  de oferta ao concelho. Duas razões, e as duas importam:
//
//   1. Um teste que depende do INE estar bem disposto falha por motivos
//      que não são do código, e um teste que falha por acaso deixa de
//      ser lido.
//   2. É exatamente o pior caso de PRODUÇÃO — a rede em baixo, só o que
//      está no repositório a responder. Se os limiares se aguentam aqui,
//      aguentam-se sempre.
//
//  ── COMO SE MEXE NUM LIMIAR ────────────────────────────────────────
//  Cada um começou no valor MEDIDO no dia em que o ficheiro nasceu, com
//  uma margem para a atualização mensal do instantâneo não os partir. Um
//  limiar só pode SUBIR. Baixar um para fazer a suite passar é apagar o
//  aviso em vez de resolver a causa — e o valor medido está escrito ao
//  lado de cada um precisamente para essa tentação ficar visível.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { CONTEXTO_INICIAL, type AtivoId, type OpportunityContext } from "@/lib/negocio/descoberta/contexto/tipos";
import { COMPETENCIAS } from "@/lib/negocio/descoberta/conhecimento/dados/competencias";
import { PROBLEMAS } from "@/lib/negocio/descoberta/conhecimento/dados/problemas";
import { descobrir } from "@/lib/negocio/descoberta/motor/pipeline";
import { PESOS_SCORE } from "@/lib/negocio/descoberta/motor/scoring";
import { MARKET_REGIONS } from "@/lib/negocio/market/geografia";
import { CONCELHOS } from "@/lib/negocio/market/concelhos";
import { MATRIZ_CONCELHOS } from "@/lib/negocio/market/oferta-concelhos";
import { comInstantaneoPorBaixo } from "@/lib/negocio/market/procura-nuts2";
import type { PackOferta } from "@/lib/negocio/market/oferta";
import type { OpportunityCandidate, OpportunityScore } from "@/lib/negocio/descoberta/motor/tipos";

const AGORA = "2026-08-23T00:00:00.000Z";

/**
 * O pack exatamente como a rota o devolve quando o INE não responde:
 * sem divisões e sem população ao vivo, com a matriz commitada dentro.
 */
const PACK_COMMITADO = {
  schemaVersion: 1,
  geradoEm: AGORA,
  indicadorEmpresas: "",
  indicadorPopulacao: "",
  licenca: null,
  divisoes: [],
  populacao: [],
  emFalta: [],
  ...(MATRIZ_CONCELHOS ? { concelhos: MATRIZ_CONCELHOS } : {}),
} as unknown as PackOferta;

/** As leituras de procura do instantâneo, sem uma única chamada de rede. */
const EVIDENCIA_COMMITADA = comInstantaneoPorBaixo([]).pilotos;

// ── Contextos sintéticos, deterministicamente ────────────────────────
//  Um gerador congruente linear em vez de `Math.random`: o motor é
//  determinístico e a medição que o audita também tem de ser.

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
  const escolher = <T>(lista: readonly T[]): T => lista[Math.floor(proximo() * lista.length)]!;

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

    const regiao = escolher(MARKET_REGIONS).id;
    const daRegiao = CONCELHOS.filter((item) => item.regiao === regiao);

    contextos.push({
      ...CONTEXTO_INICIAL,
      localizacao: {
        regiao,
        concelho: daRegiao.length > 0 ? escolher(daRegiao).codigo : undefined,
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

const PERFIS = contextosSinteticos(300);

const CORRIDAS = PERFIS.map((contexto) =>
  descobrir(contexto, {
    agora: () => AGORA,
    limite: 10,
    evidencia: EVIDENCIA_COMMITADA,
    oferta: PACK_COMMITADO,
  }),
);

const CANDIDATOS: readonly OpportunityCandidate[] = CORRIDAS.flatMap((item) => item.candidatos);
const CORRIDAS_CONDICIONAIS = PERFIS.map((contexto) =>
  descobrir(contexto, {
    agora: () => AGORA,
    limite: 20,
    evidencia: EVIDENCIA_COMMITADA,
    oferta: PACK_COMMITADO,
    incluirForaDePerfil: true,
  }),
);
const CANDIDATOS_CONDICIONAIS = CORRIDAS_CONDICIONAIS.flatMap((item) => item.candidatos);
const SOMA_PESOS = Object.values(PESOS_SCORE).reduce((total, peso) => total + peso, 0);
const fracao = (parte: number, todo: number) => (todo === 0 ? 0 : parte / todo);

describe("utilidade · a medição tem base que chegue", () => {
  it("os dados commitados existem e respondem", () => {
    // Sem isto, todos os limiares abaixo passariam a medir o vazio.
    expect(MATRIZ_CONCELHOS, "a matriz de oferta ao concelho não passou a validação").not.toBeNull();
    expect(EVIDENCIA_COMMITADA.length, "o instantâneo de procura não trouxe pilotos").toBeGreaterThan(0);
    expect(CANDIDATOS.length).toBeGreaterThan(500);
  });

  it("nenhum piloto do instantâneo chega com zero observações", () => {
    // Medido: 0 de 5. O relatório mediu 4 de 5, mas mediu-o num ambiente
    // sem saída de rede — as fontes estavam boas, o medidor é que não
    // lhes chegava. O instantâneo torna a pergunta independente disso.
    const vazios = EVIDENCIA_COMMITADA.filter((item) => item.observations.length === 0);
    expect(vazios.map((item) => item.templateId)).toEqual([]);
  });
});

describe("utilidade · o eixo da procura pontua mesmo", () => {
  // ┌──────────────────────────────────────────────────────────────────┐
  // │ O defeito principal do relatório: «`procura` vale 17 dos 100      │
  // │ pontos do score e nunca pontua uma única vez — 100 % `null` nos   │
  // │ dois cenários». Duas causas, ambas corrigidas:                    │
  // │                                                                  │
  // │  · o pack de oferta rebentava inteiro num manifesto inválido      │
  // │    (divisão «TOT»), e sem ele não havia POPULAÇÃO para normalizar │
  // │    as contagens;                                                  │
  // │  · as leituras vinham de `fetch` no pedido, e sem rede não vinham.│
  // └──────────────────────────────────────────────────────────────────┘
  it("procura pontua numa fatia substancial das hipóteses", () => {
    const comProcura = CANDIDATOS.filter((item) => item.scores.procura !== null).length;
    // Medido hoje: 42,2 %. Limiar 35 % — só pode subir.
    expect(fracao(comProcura, CANDIDATOS.length)).toBeGreaterThan(0.35);
  });

  it("o peso vivo médio do score não volta a cair para os 70", () => {
    // Medido hoje: 86,9 de 100. O relatório mediu 70,4 — «cerca de 30 %
    // do peso desenhado nunca participa», e os que sobravam eram
    // desproporcionadamente sobre a PESSOA e não sobre o mercado.
    const soma = CANDIDATOS.reduce((total, candidato) => {
      let vivo = 0;
      for (const [chave, peso] of Object.entries(PESOS_SCORE) as [keyof OpportunityScore, number][]) {
        if (candidato.scores[chave] !== null) vivo += peso;
      }
      return total + vivo;
    }, 0);
    expect(soma / CANDIDATOS.length).toBeGreaterThan(82);
    // E o denominador continua a ser o que o ficheiro dos pesos declara.
    expect(SOMA_PESOS).toBe(100);
  });

  it("a maioria das hipóteses traz pelo menos uma leitura oficial", () => {
    // Medido hoje: 92,4 %.
    const comEvidencia = CANDIDATOS.filter((item) => item.evidencias.length > 0).length;
    expect(fracao(comEvidencia, CANDIDATOS.length)).toBeGreaterThan(0.85);
  });

  it("uma parte dos intervalos fecha num ponto", () => {
    // Medido hoje: 27,9 %. Antes: 0 %, sempre — «nenhum score é alguma
    // vez um ponto». Um intervalo fechado é a recompensa por termos
    // conseguido avaliar tudo, e sem nenhum não há recompensa nenhuma.
    const fechados = CANDIDATOS.filter((item) => item.intervaloPontuacao.fechado).length;
    expect(fracao(fechados, CANDIDATOS.length)).toBeGreaterThan(0.2);
  });
});

describe("utilidade · o que não foi apurado não é apresentado como veredito", () => {
  it("nenhum risco por apurar produz uma afirmação sobre a tolerância", () => {
    // Medido pelo relatório: 71,3 % dos riscos não apurados exibiam o
    // chip «acima do que aceitas» — vermelho, ao lado da frase que
    // dizia que não contava. Este limiar é EXATO e não tem margem:
    // `dentroDaTolerancia` é `null` quando `apurado` é falso, por
    // construção do tipo. Se voltar a ser booleano, isto acende.
    const contraditorios = CANDIDATOS.flatMap((candidato) =>
      candidato.riscos.filter((risco) => !risco.apurado && risco.dentroDaTolerancia !== null),
    );
    expect(contraditorios).toEqual([]);
  });

  it("a contagem que baixa o score só conta riscos medidos", () => {
    for (const candidato of CANDIDATOS) {
      const naoApuradosAContar = candidato.riscos.filter(
        (risco) => !risco.apurado && risco.dentroDaTolerancia === false,
      );
      expect(naoApuradosAContar, candidato.titulo).toEqual([]);
    }
  });
});

describe("utilidade · a ordem apresentada é defensável", () => {
  it("a hipótese em primeiro lugar não tem um intervalo enorme", () => {
    // Medido hoje: 16,1 pontos de largura média. O relatório mediu 39 —
    // «a lista é ordenada pelo ponto central de um número que o próprio
    // motor declara desconhecer com ±20 pontos».
    const topos = CORRIDAS.map((item) => item.candidatos[0]).filter(
      (item): item is OpportunityCandidate => item !== undefined,
    );
    expect(topos.length).toBeGreaterThan(100);
    const largura =
      topos.reduce((total, item) => total + (item.intervaloPontuacao.max - item.intervaloPontuacao.min), 0) /
      topos.length;
    expect(largura).toBeLessThan(25);
  });

  it("o topo da lista nunca é menos provado do que o que vem a seguir, sem razão", () => {
    // A ordenação é `confiança → piso do intervalo → ponto`, e depois o
    // MMR desconta semelhança. O MMR pode legitimamente trocar duas
    // posições; o que não pode acontecer é a PRIMEIRA hipótese ter menos
    // confiança do que a segunda, porque essa é a que a pessoa lê.
    //
    // Medido hoje: 0 corridas em 227.
    const invertidas = CORRIDAS.filter((corrida) => {
      const [primeira, segunda] = corrida.candidatos;
      if (!primeira || !segunda) return false;
      const fatal = (item: OpportunityCandidate) => item.objecoes.some((objecao) => objecao.fatal && objecao.procede);
      // Uma objeção fatal empurra para baixo por motivo próprio.
      if (fatal(primeira) !== fatal(segunda)) return false;
      return primeira.confianca.nivel === "insuficiente" && segunda.confianca.nivel === "alta";
    });
    expect(invertidas.map((item) => item.candidatos[0]?.titulo)).toEqual([]);
  });
});

describe("utilidade · a ferramenta responde a quem lhe pergunta", () => {
  it("a fatia de perfis que sai de mãos vazias não sobe", () => {
    // Medido hoje: 24,3 %. É um número de PRODUTO, não de motor — o
    // `diagnosticoVazio` explica bem a causa a quem lá chega — mas um em
    // cada quatro perfis sem uma única hipótese é muito, e este limiar
    // existe para não piorar enquanto não melhora.
    const vazios = CORRIDAS.filter((item) => item.candidatos.length === 0).length;
    expect(fracao(vazios, CORRIDAS.length)).toBeLessThan(0.3);
  });

  it("quem sai de mãos vazias recebe sempre uma explicação", () => {
    for (const corrida of CORRIDAS) {
      if (corrida.candidatos.length > 0) continue;
      expect(corrida.diagnosticoVazio, "um resultado vazio sem diagnóstico é um ecrã em branco").toBeTruthy();
    }
  });

  it("o modo condicional torna a base explorável sem promover impossibilidades", () => {
    // Medido: 12 de 300 perfis continuam vazios (4 %), contra 85 no modo
    // estritamente compatível. É uma exploração separada, nunca um atalho:
    // qualquer meio em falta ou inadequado mantém objeção fatal.
    const vazios = CORRIDAS_CONDICIONAIS.filter((item) => item.candidatos.length === 0).length;
    expect(fracao(vazios, CORRIDAS_CONDICIONAIS.length)).toBeLessThan(0.1);
    expect(CANDIDATOS_CONDICIONAIS.length).toBeGreaterThan(CANDIDATOS.length * 1.5);
    expect(
      CANDIDATOS_CONDICIONAIS.some((candidato) =>
        candidato.objecoes.some((item) => item.id === "entrada" && item.fatal && item.procede),
      ),
    ).toBe(true);
  });

  it("a exploração condicional chega a todos os problemas do grafo", () => {
    const distintos = new Set(CANDIDATOS_CONDICIONAIS.map((item) => item.problema.id));
    expect(distintos.size).toBe(PROBLEMAS.length);
  });
});
