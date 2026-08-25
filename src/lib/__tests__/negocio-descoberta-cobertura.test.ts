// ═══════════════════════════════════════════════════════════════════════
//  COBERTURA E DOMINÂNCIA — o que os testes unitários não conseguem ver
//  ---------------------------------------------------------------------
//  Todos os outros testes deste motor perguntam «este caso está certo?».
//  Nenhum pergunta «para quantas pessoas é que isto não responde nada?».
//
//  Essa segunda pergunta não se responde caso a caso: responde-se a
//  varrer um corpo de perfis e a medir a distribuição. Foi assim que a
//  auditoria de 25 de agosto de 2026 descobriu que um quarto dos perfis
//  sintéticos saía de mãos vazias — um número que nenhum teste verde
//  deste repositório denunciava, porque nenhum estava a contar.
//
//  ── O QUE ESTE FICHEIRO É, E O QUE NÃO É ───────────────────────────
//  NÃO é uma medição de utilizadores reais. Os perfis são sintéticos e
//  a distribuição é a do gerador, não a do país. Serve para uma coisa
//  só, e serve-a bem: **detetar regressão estrutural**. Se uma alteração
//  ao grafo, às restrições ou à diversificação piorar a cobertura, isto
//  fica vermelho antes de chegar a produção.
//
//  Os limiares NÃO são objetivos de produto — são cercas medidas com
//  folga sobre o comportamento atual. O objetivo do relatório (zero
//  abaixo de 5%, dominância abaixo de 15%) está escrito ao lado de cada
//  um, para se ver a distância que falta. Subir uma cerca quando o
//  número melhora é trabalho legítimo; baixá-la para um teste passar não é.
//
//  O gerador é SEMEADO. O mesmo commit produz sempre o mesmo corpo de
//  perfis, e portanto os mesmos números — se variasse, um teste vermelho
//  não distinguiria uma regressão de um azar.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  CONTEXTO_INICIAL,
  COMPETENCIAS,
  descobrir,
  type AtivoId,
  type DetalhesAtivos,
  type OpportunityContext,
  type RestricaoId,
} from "@/lib/negocio/descoberta";
import type { MarketRegion } from "@/lib/negocio/market/geografia";

// ── Gerador semeado ──────────────────────────────────────────────────
//  mulberry32: pequeno, sem dependências, e determinístico entre
//  plataformas — que é a única propriedade de que isto precisa.
function semente(estado: number): () => number {
  return () => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REGIOES: readonly MarketRegion[] = [
  "norte",
  "centro",
  "oeste-vale-tejo",
  "grande-lisboa",
  "peninsula-setubal",
  "alentejo",
  "algarve",
  "acores",
  "madeira",
];

const CAPITAIS: readonly (number | undefined)[] = [undefined, 200, 1000, 5000, 20000, 50000];
const DEDICACOES = ["integral", "part-time", "fins-de-semana", "poucas-horas"] as const;
const AMBICOES = ["complemento", "substituir-salario", "crescer", "escalar"] as const;
const EQUIPAS = ["sozinho", "casal", "familia", "socios", "equipa"] as const;
const NIVEIS = ["basico", "intermedio", "avancado"] as const;
const RISCOS = ["muito-conservador", "conservador", "moderado", "arrojado", "muito-arrojado"] as const;

const ATIVOS_POSSIVEIS: readonly AtivoId[] = [
  "carta-conducao",
  "veiculo-ligeiro",
  "veiculo-carga",
  "computador",
  "ferramentas",
  "equipamento-tecnico",
  "camara-video",
  "espaco-comercial",
  "armazem",
  "oficina",
  "terreno",
  "carteira-clientes",
];

const RESTRICOES_POSSIVEIS: readonly RestricaoId[] = [
  "sem-empregados",
  "sem-loja-fisica",
  "sem-stock",
  "sem-carro",
  "sem-carregar-peso",
  "sem-atendimento-presencial",
  "sem-deslocacoes",
  "sem-alimentos",
  "sem-financiamento",
  "sem-fins-de-semana",
];

const IDS_COMPETENCIA = COMPETENCIAS.map((item) => item.id);

/**
 * Uma viatura inteiramente declarada.
 *
 * Metade do corpo declara os meios a fundo e a outra metade não — porque
 * é essa a realidade, e porque a diferença entre as duas metades é
 * exatamente o que a camada de adequação existe para tratar.
 */
function meiosDeclarados(ativos: readonly AtivoId[]): DetalhesAtivos {
  const detalhes: DetalhesAtivos = {};
  for (const id of ativos) {
    const base = {
      estado: "adequado",
      disponibilidade: "sempre",
      acesso: "proprio",
      usoProfissional: "confirmado",
    } as const;
    detalhes[id] =
      id === "veiculo-ligeiro" || id === "veiculo-carga"
        ? {
            ...base,
            veiculo: {
              configuracao: id === "veiculo-carga" ? "mercadorias" : "misto",
              lugares: 4,
              cargaUtilKg: id === "veiculo-carga" ? 900 : 400,
              inspecao: "valida",
              anoMatricula: 2019,
              restricoesCirculacao: "sem-restricoes",
              dimensoesCargaCm: { comprimento: 180, largura: 110, altura: 120 },
            },
          }
        : base;
  }
  return detalhes;
}

function escolher<T>(rng: () => number, lista: readonly T[]): T {
  return lista[Math.floor(rng() * lista.length)]!;
}

function subconjunto<T>(rng: () => number, lista: readonly T[], maximo: number): T[] {
  const baralhada = [...lista].sort(() => rng() - 0.5);
  return baralhada.slice(0, Math.floor(rng() * (maximo + 1)));
}

function perfilSintetico(rng: () => number): OpportunityContext {
  const quantasCompetencias = 1 + Math.floor(rng() * 3);
  const competencias = subconjunto(rng, IDS_COMPETENCIA, quantasCompetencias)
    .slice(0, quantasCompetencias)
    .map((id) => ({ id, nivel: escolher(rng, NIVEIS) }));
  // Garantir pelo menos uma: `subconjunto` pode devolver zero.
  if (competencias.length === 0) {
    competencias.push({ id: escolher(rng, IDS_COMPETENCIA), nivel: escolher(rng, NIVEIS) });
  }

  const ativos = subconjunto(rng, ATIVOS_POSSIVEIS, 4);
  const declara = rng() < 0.5;

  return {
    ...CONTEXTO_INICIAL,
    localizacao: { regiao: escolher(rng, REGIOES), alcance: "regiao" },
    capital: { disponivelAgora: escolher(rng, CAPITAIS) },
    ativos,
    detalhesAtivos: declara ? meiosDeclarados(ativos) : {},
    tempo: { dedicacao: escolher(rng, DEDICACOES) },
    rendimento: { ambicao: escolher(rng, AMBICOES) },
    competencias,
    equipa: { forma: escolher(rng, EQUIPAS) },
    restricoes: subconjunto(rng, RESTRICOES_POSSIVEIS, 3),
    risco: { ...CONTEXTO_INICIAL.risco, perfil: escolher(rng, RISCOS) },
  };
}

interface Medicao {
  perfis: number;
  vazios: number;
  taxaVazio: number;
  mediaApresentada: number;
  medianaPool: number;
  poolMedio: number;
  poolP10: number;
  comQuatroFamilias: number;
  dominanciaPrimeira: number;
  familiaDominante: string;
  candidatosDistintos: number;
  problemasNaPrimeira: number;
}

function varrer(quantos: number, sementeInicial: number): Medicao {
  const rng = semente(sementeInicial);
  let vazios = 0;
  let somaApresentada = 0;
  let comQuatroFamilias = 0;
  const pools: number[] = [];
  const primeiras = new Map<string, number>();
  const distintos = new Set<string>();

  for (let i = 0; i < quantos; i += 1) {
    const resultado = descobrir(perfilSintetico(rng), { limite: 10 });
    const candidatos = resultado.candidatos;
    somaApresentada += candidatos.length;
    pools.push(resultado.telemetria.aprovadas);
    if (candidatos.length === 0) {
      vazios += 1;
      continue;
    }
    for (const candidato of candidatos) distintos.add(candidato.id);
    const familias = new Set(candidatos.map((item) => item.problema.id));
    if (familias.size >= 4) comQuatroFamilias += 1;
    const primeira = candidatos[0]!.problema.id;
    primeiras.set(primeira, (primeiras.get(primeira) ?? 0) + 1);
  }

  const ordenados = [...pools].sort((a, b) => a - b);
  const naoVazios = quantos - vazios;
  const topo = [...primeiras.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["—", 0];

  return {
    perfis: quantos,
    vazios,
    taxaVazio: vazios / quantos,
    mediaApresentada: somaApresentada / quantos,
    medianaPool: ordenados[Math.floor(ordenados.length / 2)] ?? 0,
    poolMedio: pools.reduce((total, item) => total + item, 0) / quantos,
    poolP10: ordenados[Math.floor(ordenados.length * 0.1)] ?? 0,
    comQuatroFamilias: naoVazios === 0 ? 0 : comQuatroFamilias / naoVazios,
    dominanciaPrimeira: naoVazios === 0 ? 0 : topo[1] / naoVazios,
    familiaDominante: String(topo[0]),
    candidatosDistintos: distintos.size,
    problemasNaPrimeira: primeiras.size,
  };
}

/**
 * As cercas. Medidas, não desejadas — ver a nota do cabeçalho.
 *
 * Ao lado de cada uma está o valor observado quando foi fixada e o alvo
 * que o relatório de 25/08/2026 estabelece. A distância entre os dois é
 * o trabalho por fazer, e fica à vista em vez de ficar num documento.
 */
const LIMIARES = Object.freeze({
  /** Medido 56,3% em 2026-08-25. Alvo do relatório: < 5%. */
  taxaVazioMaxima: 0.58,
  /** Medido 1,68. Não é meta — encher a página é o anti-objetivo. */
  mediaApresentadaMinima: 1.55,
  /**
   * Medido: média 1,97, MEDIANA 0.
   *
   * A mediana a zero é o achado, não um detalhe: mais de metade dos
   * perfis não tem um único candidato aprovado antes da diversificação.
   * O limite de dez cartões nunca foi o estrangulamento — o pool é que
   * está vazio. Por isso a cerca é sobre a MÉDIA, que ao menos se move;
   * a mediana fica publicada à espera de deixar de ser zero.
   */
  poolMedioMinimo: 1.8,
  /** Medido 387 candidatos distintos em 400 perfis. */
  candidatosDistintosMinimos: 360,
  /** Medido 21 problemas distintos em primeiro lugar, de 31 possíveis. */
  problemasNaPrimeiraMinimos: 19,
  /** Medido 22,9% (picos-operacionais-alojamento). Alvo: ≤ 15%. */
  dominanciaMaxima: 0.25,
});

// Um corpo pequeno o suficiente para o CI e grande o suficiente para a
// distribuição não ser ruído. Semente fixa: mesmo commit, mesmos números.
const MEDICAO = varrer(400, 20260825);

describe("descoberta: cobertura estrutural do espaço de resultados", () => {
  it("publica a medição, para o número existir antes de haver meta", () => {
    // eslint-disable-next-line no-console
    console.log(
      [
        "",
        "  ── COBERTURA (400 perfis sintéticos, semente 20260825) ──",
        `  perfis sem qualquer resultado : ${(MEDICAO.taxaVazio * 100).toFixed(1)}%  (alvo do relatório: < 5%)`,
        `  média apresentada             : ${MEDICAO.mediaApresentada.toFixed(2)}`,
        `  pool mediano (pré-diversidade): ${MEDICAO.medianaPool}  (alvo do relatório: ≥ 20)`,
        `  pool médio                    : ${MEDICAO.poolMedio.toFixed(2)}`,
        `  pool p10                      : ${MEDICAO.poolP10}`,
        `  perfis com ≥ 4 famílias       : ${(MEDICAO.comQuatroFamilias * 100).toFixed(1)}%`,
        `  dominância da 1.ª posição     : ${(MEDICAO.dominanciaPrimeira * 100).toFixed(1)}% (${MEDICAO.familiaDominante})  (alvo: ≤ 15%)`,
        `  problemas distintos em 1.º    : ${MEDICAO.problemasNaPrimeira}`,
        `  candidatos distintos          : ${MEDICAO.candidatosDistintos}`,
        "",
      ].join("\n"),
    );
    expect(MEDICAO.perfis).toBe(400);
  });

  it("a taxa de perfis sem resultado não regride", () => {
    // Cerca medida, não objetivo. O relatório quer isto abaixo de 5%; o
    // caminho para lá é a camada de padrões e a expansão do grafo, não
    // baixar a cerca.
    expect(MEDICAO.taxaVazio).toBeLessThanOrEqual(LIMIARES.taxaVazioMaxima);
  });

  it("o pool antes da diversificação não encolhe", () => {
    expect(MEDICAO.poolMedio).toBeGreaterThanOrEqual(LIMIARES.poolMedioMinimo);
    expect(MEDICAO.mediaApresentada).toBeGreaterThanOrEqual(LIMIARES.mediaApresentadaMinima);
  });

  it("a variedade apresentada não encolhe", () => {
    expect(MEDICAO.candidatosDistintos).toBeGreaterThanOrEqual(LIMIARES.candidatosDistintosMinimos);
    expect(MEDICAO.problemasNaPrimeira).toBeGreaterThanOrEqual(LIMIARES.problemasNaPrimeiraMinimos);
  });

  it("nenhuma família aumenta o domínio que já tem da primeira posição", () => {
    expect(MEDICAO.dominanciaPrimeira).toBeLessThanOrEqual(LIMIARES.dominanciaMaxima);
  });
});

// ── PERFIS CANÓNICOS ─────────────────────────────────────────────────
//  A distribuição diz o tamanho do problema. Estes dizem a FORMA dele:
//  são os casos que o relatório nomeia, cada um com o comportamento que
//  se espera e a razão escrita. Um deles pode falhar sem os outros
//  falharem, e é isso que os torna úteis a diagnosticar.

const canonico = (parcial: Partial<OpportunityContext>): OpportunityContext => ({
  ...CONTEXTO_INICIAL,
  localizacao: { regiao: "norte", alcance: "regiao" },
  ...parcial,
});

describe("descoberta: perfis canónicos que o relatório nomeia", () => {
  it("uma competência só de apoio não devolve silêncio — devolve a razão", () => {
    const resultado = descobrir(
      canonico({ competencias: [{ id: "linguas", nivel: "avancado" }] }),
      { limite: 10 },
    );
    if (resultado.candidatos.length === 0) {
      // O que não pode acontecer é o motor calar-se. Se não há caminho,
      // tem de dizer que «Línguas» é competência de reforço.
      expect(resultado.diagnosticoVazio).not.toBeNull();
      expect(resultado.diagnosticoVazio?.tipo).toBe("competencia-de-apoio");
    }
  });

  it("pouco capital e poucas horas continua a produzir alguma coisa, ou explica-se", () => {
    const resultado = descobrir(
      canonico({
        capital: { disponivelAgora: 200 },
        tempo: { dedicacao: "poucas-horas" },
        competencias: [
          { id: "organizacao", nivel: "intermedio" },
          { id: "atendimento", nivel: "intermedio" },
        ],
      }),
      { limite: 10 },
    );
    expect(
      resultado.candidatos.length > 0 || resultado.diagnosticoVazio !== null,
    ).toBe(true);
  });

  it("sem atendimento nem deslocações, o que sobra é remoto — e nunca presencial", () => {
    const resultado = descobrir(
      canonico({
        competencias: [
          { id: "programacao", nivel: "avancado" },
          { id: "dados", nivel: "avancado" },
        ],
        ativos: ["computador"],
        detalhesAtivos: meiosDeclarados(["computador"]),
        restricoes: ["sem-atendimento-presencial", "sem-deslocacoes"],
      }),
      { limite: 10 },
    );
    for (const candidato of resultado.candidatos) {
      expect(candidato.entrega).not.toBe("presencial");
    }
  });

  it("as ilhas são servidas — não ficam sem leitura por serem ilhas", () => {
    for (const regiao of ["acores", "madeira"] as const) {
      const resultado = descobrir(
        canonico({
          localizacao: { regiao, alcance: "regiao" },
          competencias: [
            { id: "limpeza", nivel: "avancado" },
            { id: "organizacao", nivel: "intermedio" },
          ],
        }),
        { limite: 10 },
      );
      expect(
        resultado.candidatos.length > 0 || resultado.diagnosticoVazio !== null,
      ).toBe(true);
    }
  });

  it("quem declara não ter carro nunca recebe trabalho que dependa de viatura", () => {
    const resultado = descobrir(
      canonico({
        competencias: [
          { id: "logistica", nivel: "avancado" },
          { id: "organizacao", nivel: "avancado" },
        ],
        restricoes: ["sem-carro"],
      }),
      { limite: 10 },
    );
    for (const candidato of resultado.candidatos) {
      for (const capacidade of candidato.capacidadesUsadas) {
        expect(
          capacidade.ativosNecessarios.some((ativo) => ativo.startsWith("veiculo")),
        ).toBe(false);
      }
    }
  });

  it("o motor é determinístico: o mesmo perfil dá o mesmo resultado", () => {
    const perfil = canonico({
      competencias: [{ id: "cozinha", nivel: "avancado" }],
      capital: { disponivelAgora: 5000 },
    });
    const a = descobrir(perfil, { limite: 10 });
    const b = descobrir(perfil, { limite: 10 });
    expect(a.candidatos.map((item) => item.id)).toEqual(b.candidatos.map((item) => item.id));
  });
});
