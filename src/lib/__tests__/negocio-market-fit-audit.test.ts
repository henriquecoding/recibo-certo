// ═══════════════════════════════════════════════════════════════════════
//  AUDITORIA DO FOUNDER FIT — o espaço de respostas, medido por inteiro
//  ---------------------------------------------------------------------
//  O espaço de perfis é finito e pequeno o suficiente para ser percorrido
//  todo: 3 estruturas × 3 entregas × 3 faixas de capital × 3 recorrências
//  × 10 zonas × 32 subconjuntos de competências = 25 920 perfis.
//
//  A auditoria de agosto de 2026 correu esta grelha contra o catálogo de
//  então e mediu o que a ferramenta conseguia responder: 29 ordenações
//  distintas, 7 conjuntos de top-3, empate no primeiro lugar em 70,1 % dos
//  perfis e uma hipótese que nunca chegava a primeiro para ninguém. Cinco
//  destes seis testes falhavam.
//
//  Não são testes de regressão de números — são as invariantes que
//  impedem o catálogo de voltar a colapsar quando alguém acrescentar uma
//  hipótese parecida com outra. Cada um diz, no próprio corpo, o que
//  impede.
//
//  Corre sem rede, é determinístico, e cabe em segundos.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  FIT_DIMENSIONS,
  OPPORTUNITY_TEMPLATES,
  calculateOpportunityFit,
  fitDimensionIsInert,
  fitSignature,
  fitSignatureDistance,
  rankOpportunityTemplates,
  strengthsUsedInCatalogue,
  type BusinessDiscoveryProfile,
  type BusinessStrength,
  type BusinessStructurePreference,
  type CapitalBand,
  type DeliveryPreference,
  type RecurrencePreference,
} from "@/lib/negocio/market/opportunities";
import { MARKET_REGIONS, type MarketRegion } from "@/lib/negocio/market/geografia";

const STRUCTURES: BusinessStructurePreference[] = ["recibos-verdes", "empresa", "por-decidir"];
const DELIVERIES: DeliveryPreference[] = ["local", "remoto", "hibrido"];
const CAPITALS: CapitalBand[] = ["ate-500", "500-3000", "mais-3000"];
const RECURRENCES: RecurrencePreference[] = ["pontual", "recorrente", "indiferente"];
const STRENGTHS: BusinessStrength[] = ["comercial", "digital", "operacoes", "cuidado", "tecnico"];
const REGIONS: MarketRegion[] = MARKET_REGIONS.map((region) => region.id);

const CONJUNTOS_DE_FORCAS: BusinessStrength[][] = [];
for (let mascara = 0; mascara < 1 << STRENGTHS.length; mascara += 1) {
  CONJUNTOS_DE_FORCAS.push(STRENGTHS.filter((_, indice) => mascara & (1 << indice)));
}

function* todosOsPerfis(): Generator<BusinessDiscoveryProfile> {
  for (const structure of STRUCTURES)
    for (const delivery of DELIVERIES)
      for (const capital of CAPITALS)
        for (const recurrence of RECURRENCES)
          for (const region of REGIONS)
            for (const strengths of CONJUNTOS_DE_FORCAS)
              yield { structure, delivery, capital, recurrence, region, strengths };
}

const PERFIS = [...todosOsPerfis()];

/** Uma amostra estável da grelha, para os testes que não precisam dela toda. */
const AMOSTRA = PERFIS.filter((_, indice) => indice % 7 === 0);

describe("market:fit-audit — o catálogo consegue responder de forma diferente", () => {
  it("percorre as 25 920 combinações declaradas", () => {
    expect(PERFIS).toHaveLength(25_920);
  });

  it("nenhum par de hipóteses tem assinatura de compatibilidade idêntica", () => {
    // Duas hipóteses iguais aos olhos do fit são a mesma hipótese com dois
    // nomes: a segunda perde SEMPRE o desempate alfabético e nunca é
    // apresentada em primeiro a ninguém. Foi o que aconteceu ao radar de
    // concursos — o piloto com mais lastro de evidência do catálogo.
    const vistas = new Map<string, string>();
    for (const template of OPPORTUNITY_TEMPLATES) {
      const chave = fitSignature(template);
      expect(
        vistas.get(chave),
        `${template.id} é indistinguível de ${vistas.get(chave)}`,
      ).toBeUndefined();
      vistas.set(chave, template.id);
    }
  });

  it("cada hipótese discorda da mais próxima em pelo menos dois eixos", () => {
    // Uma hipótese que difere noutra só num eixo é uma variante, não uma
    // alternativa: ordena sempre do mesmo lado da outra e não acrescenta
    // resposta nenhuma ao espaço.
    for (const template of OPPORTUNITY_TEMPLATES) {
      const maisProxima = OPPORTUNITY_TEMPLATES.filter((outra) => outra.id !== template.id)
        .map((outra) => ({ outra, distancia: fitSignatureDistance(template, outra) }))
        .sort((esquerda, direita) => esquerda.distancia - direita.distancia)[0]!;
      expect(
        maisProxima.distancia,
        `${template.id} só difere de ${maisProxima.outra.id} em ${maisProxima.distancia} eixo`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("cada hipótese do catálogo chega a primeiro em pelo menos um perfil", () => {
    const primeiros = new Set(PERFIS.map((perfil) => rankOpportunityTemplates(perfil)[0]!.template.id));
    for (const template of OPPORTUNITY_TEMPLATES) {
      expect(primeiros.has(template.id), `${template.id} nunca é apresentada em primeiro`).toBe(true);
    }
  });

  it("o primeiro lugar deixou de ser decidido pelo alfabeto", () => {
    // ── O limiar, e porque é este ───────────────────────────────────
    //  No catálogo de cinco hipóteses, 70,1 % dos perfis viam um empate
    //  no primeiro lugar: sete em cada dez pessoas recebiam uma ordem de
    //  topo decidida por `localeCompare` do título, apresentada com um
    //  número de posição num círculo colorido.
    //
    //  O empate não é, em si, um defeito — um perfil que responde «tanto
    //  faz» a metade das perguntas encaixa mesmo em muitas hipóteses, e a
    //  interface publica isso (`tiedWith`) em vez de o esconder. O que
    //  era defeito é o empate ser a REGRA. É esse número que este teste
    //  tranca, e é um limiar de produto: baixá-lo exige justificação
    //  escrita aqui, não um ajuste silencioso.
    const exclusivos = PERFIS.filter(
      (perfil) => rankOpportunityTemplates(perfil)[0]!.tiedWith === 1,
    ).length;
    expect(exclusivos / PERFIS.length).toBeGreaterThan(0.6);
  });

  it("quem responde com precisão recebe um primeiro lugar próprio", () => {
    // Um perfil «decidido» — estrutura escolhida, recorrência escolhida,
    // zona escolhida — é quem mais merece uma resposta que separe. Se o
    // empate persistisse aqui, a ferramenta estaria a ignorar respostas.
    const decididos = PERFIS.filter(
      (perfil) =>
        perfil.structure !== "por-decidir" &&
        perfil.recurrence !== "indiferente" &&
        perfil.region !== "portugal",
    );
    const exclusivos = decididos.filter(
      (perfil) => rankOpportunityTemplates(perfil)[0]!.tiedWith === 1,
    ).length;
    const maiorEmpate = decididos.reduce(
      (maior, perfil) => Math.max(maior, rankOpportunityTemplates(perfil)[0]!.tiedWith),
      0,
    );
    expect(exclusivos / decididos.length).toBeGreaterThan(0.65);
    // Nunca metade do catálogo empatada no topo para quem respondeu a tudo.
    expect(maiorEmpate).toBeLessThan(OPPORTUNITY_TEMPLATES.length / 2);
  });

  it("quando há empate, ele é publicado em vez de ordenado em silêncio", () => {
    for (const perfil of AMOSTRA) {
      const ordenado = rankOpportunityTemplates(perfil);
      const porRank = new Map<number, number>();
      for (const item of ordenado) porRank.set(item.rank, (porRank.get(item.rank) ?? 0) + 1);
      for (const item of ordenado) {
        expect(item.tiedWith).toBe(porRank.get(item.rank));
        // Rank partilhado implica score partilhado, e vice-versa.
        const mesmoScore = ordenado.filter((outro) => outro.fit.score === item.fit.score).length;
        expect(item.tiedWith).toBe(mesmoScore);
      }
    }
  });

  it("nenhuma pergunta do formulário é inerte", () => {
    // Estrutura e zona não alteravam NADA — em nenhum dos 25 920 perfis,
    // em nenhuma das quatro medidas — porque as cinco hipóteses declaravam
    // um só valor em cada uma. Uma pergunta que não pode mudar o resultado
    // não deve ser feita com o mesmo peso visual das outras.
    for (const dimensao of FIT_DIMENSIONS) {
      expect(fitDimensionIsInert(dimensao), `a dimensão «${dimensao}» não separa nada`).toBe(false);
    }
  });

  it("cada competência oferecida é reconhecida por alguma hipótese", () => {
    // «Resolver problemas técnicos» era um botão morto: nenhum dos cinco
    // templates a declarava, e selecioná-la não mudava rigorosamente nada.
    const usadas = strengthsUsedInCatalogue();
    for (const forca of STRENGTHS) {
      expect(usadas.has(forca), `a competência «${forca}» não existe no catálogo`).toBe(true);
    }
  });

  it("cada competência oferecida altera o resultado de alguém", () => {
    for (const forca of STRENGTHS) {
      const muda = AMOSTRA.some((perfil) => {
        if (perfil.strengths.includes(forca)) return false;
        const antes = OPPORTUNITY_TEMPLATES.map(
          (template) => calculateOpportunityFit(template, perfil).score,
        ).join(",");
        const depois = OPPORTUNITY_TEMPLATES.map(
          (template) =>
            calculateOpportunityFit(template, {
              ...perfil,
              strengths: [...perfil.strengths, forca],
            }).score,
        ).join(",");
        return antes !== depois;
      });
      expect(muda, `a competência «${forca}» não faz nada em perfil nenhum`).toBe(true);
    }
  });

  it("o espaço de respostas é grande o suficiente para valer a pena perguntar", () => {
    // A métrica que mede diretamente se a ferramenta ficou mais capaz de
    // responder de forma diferente a pessoas diferentes. Eram 29
    // ordenações e 7 conjuntos de top-3 no catálogo de cinco.
    const ordenacoes = new Set<string>();
    const topos = new Set<string>();
    for (const perfil of PERFIS) {
      const ordenado = rankOpportunityTemplates(perfil);
      ordenacoes.add(ordenado.map((item) => item.template.id).join(">"));
      topos.add(
        ordenado
          .slice(0, 3)
          .map((item) => item.template.id)
          .sort()
          .join("+"),
      );
    }
    expect(ordenacoes.size).toBeGreaterThan(100);
    expect(topos.size).toBeGreaterThan(30);
  });
});

describe("market:fit-audit — a escala diz alguma coisa", () => {
  it("o score vive sempre em [0, 100]", () => {
    for (const perfil of AMOSTRA) {
      for (const template of OPPORTUNITY_TEMPLATES) {
        const { score } = calculateOpportunityFit(template, perfil);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("a repartição soma exatamente o score", () => {
    // Um erro silencioso de aritmética aqui produziria uma percentagem que
    // não corresponde à decomposição mostrada no ecrã — que é precisamente
    // a coisa que torna o número acreditável.
    for (const perfil of AMOSTRA) {
      for (const template of OPPORTUNITY_TEMPLATES) {
        const fit = calculateOpportunityFit(template, perfil);
        const soma = fit.breakdown.reduce((total, item) => total + item.earned, 0);
        expect(Math.round(soma)).toBe(fit.score);
        expect(fit.breakdown.map((item) => item.dimension)).toEqual([...FIT_DIMENSIONS]);
        expect(fit.breakdown.reduce((total, item) => total + item.max, 0)).toBe(100);
      }
    }
  });

  it("o rótulo «forte» continua a separar alguma coisa", () => {
    let fortes = 0;
    for (const perfil of AMOSTRA) {
      for (const template of OPPORTUNITY_TEMPLATES) {
        if (calculateOpportunityFit(template, perfil).label === "forte") fortes += 1;
      }
    }
    // Era 59,3 % no catálogo de cinco. Um rótulo que cobre três quintos de
    // tudo não classifica — limiar de produto, não lei da natureza.
    expect(fortes / (AMOSTRA.length * OPPORTUNITY_TEMPLATES.length)).toBeLessThan(0.4);
  });

  it("perfis iguais produzem repartições iguais", () => {
    const perfil = AMOSTRA[100]!;
    for (const template of OPPORTUNITY_TEMPLATES) {
      expect(calculateOpportunityFit(template, perfil)).toEqual(
        calculateOpportunityFit(template, { ...perfil, strengths: [...perfil.strengths] }),
      );
    }
  });
});
