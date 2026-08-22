// ═══════════════════════════════════════════════════════════════════════
//  TESTES COMPORTAMENTAIS DO MOTOR DE DESCOBERTA
//  ---------------------------------------------------------------------
//  Não são testes de unidade da aritmética: são as afirmações que o
//  produto faz sobre si próprio, escritas de forma que possam falhar.
//
//  A mais importante está no fim: quatro perfis radicalmente diferentes
//  têm de receber respostas radicalmente diferentes. Se as mesmas
//  hipóteses aparecerem para todos, o motor falhou — e é preferível que
//  isso apareça aqui do que em produção.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CONTEXTO_INICIAL,
  descobrir,
  generateCandidates,
  PROBLEMAS,
  buildResearchPlan,
  comoInstantaneo,
  compararAnalises,
  verificarGrafo,
  type OpportunityContext,
} from "@/lib/negocio/descoberta";
import { verificarSeeds } from "@/lib/negocio/descoberta/conhecimento/seeds";
import { OPPORTUNITY_TEMPLATES } from "@/lib/negocio/market/opportunities";

const perfil = (parcial: Partial<OpportunityContext>): OpportunityContext => ({
  ...CONTEXTO_INICIAL,
  ...parcial,
});

// ── AS QUATRO FIXTURES DO PEDIDO ─────────────────────────────────────

/** €500 · estudante · Lisboa · 10 h/semana · digital · sem carro. */
const ESTUDANTE_DIGITAL = perfil({
  localizacao: { regiao: "grande-lisboa", alcance: "online" },
  capital: { disponivelAgora: 500 },
  ativos: ["computador"],
  tempo: { dedicacao: "poucas-horas", horasSemana: 10 },
  competencias: [
    { id: "dados", nivel: "intermedio" },
    { id: "escrita", nivel: "avancado" },
  ],
  preferencias: { ...CONTEXTO_INICIAL.preferencias, formato: "digital" },
  restricoes: ["sem-carro"],
});

/** €20 000 · casal · Setúbal · carrinha · limpeza + logística · full-time. */
const CASAL_SETUBAL = perfil({
  localizacao: { regiao: "peninsula-setubal", alcance: "regiao", raioKm: 40 },
  capital: { disponivelAgora: 20000, maximo: 20000 },
  ativos: ["veiculo-carga", "carta-conducao", "ferramentas"],
  tempo: { dedicacao: "integral" },
  competencias: [
    { id: "limpeza", nivel: "avancado", anos: 8 },
    { id: "logistica", nivel: "avancado", anos: 5 },
    { id: "organizacao", nivel: "intermedio" },
  ],
  equipa: { forma: "casal", pessoas: 2 },
  rendimento: { ambicao: "substituir-salario", minimoMensal: 2500 },
});

/** €80 000 · engenheiro · Porto · B2B · quer empresa escalável. */
const ENGENHEIRO_PORTO = perfil({
  localizacao: { regiao: "norte", alcance: "nacional" },
  capital: { disponivelAgora: 80000, maximo: 80000, aberturaInvestidores: true },
  ativos: ["computador", "veiculo-ligeiro", "carta-conducao"],
  tempo: { dedicacao: "integral" },
  competencias: [
    { id: "programacao", nivel: "avancado" },
    { id: "gestao", nivel: "intermedio" },
    { id: "dados", nivel: "avancado" },
  ],
  rendimento: { ambicao: "escalar" },
  preferencias: { ...CONTEXTO_INICIAL.preferencias, mercado: "b2b" },
  equipa: { forma: "socios", pessoas: 2, disponibilidadeContratar: true },
});

/** €5 000 · interior · experiência agrícola · possui terreno. */
const AGRICOLA_ALENTEJO = perfil({
  localizacao: { regiao: "alentejo", alcance: "concelho", territorio: "rural" },
  capital: { disponivelAgora: 5000 },
  ativos: ["terreno", "ferramentas", "veiculo-carga", "carta-conducao"],
  tempo: { dedicacao: "integral" },
  competencias: [
    { id: "agricultura", nivel: "avancado", anos: 20 },
    { id: "logistica", nivel: "basico" },
  ],
});

const PERFIS = [
  ["estudante digital", ESTUDANTE_DIGITAL],
  ["casal de Setúbal", CASAL_SETUBAL],
  ["engenheiro do Porto", ENGENHEIRO_PORTO],
  ["agricultor do Alentejo", AGRICOLA_ALENTEJO],
] as const;

describe("descoberta: o grafo de conhecimento", () => {
  it("não tem arestas partidas", () => {
    // Um id escrito no plural errado faz um problema inteiro desaparecer
    // do motor em silêncio. A única pista seria uma hipótese que nunca
    // mais aparece.
    expect(verificarGrafo()).toEqual([]);
  });

  it("todo o dossier curado está ligado a um problema do grafo", () => {
    expect(verificarSeeds()).toEqual([]);
  });

  it("os 24 dossiers curados continuam a existir como referência", () => {
    // O pedido é explícito: podem continuar a existir, mas não como
    // universo finito de respostas. Aqui prova-se que existem.
    expect(OPPORTUNITY_TEMPLATES.length).toBe(24);
  });
});

describe("descoberta: o motor gera o que ninguém escreveu", () => {
  it("compõe candidatos que não correspondem a nenhum dossier curado", () => {
    // A afirmação central de todo este trabalho. Se falhar, voltámos a
    // ter um catálogo com filtros.
    const resultado = descobrir(CASAL_SETUBAL, { limite: 12 });
    const gerados = resultado.candidatos.filter((item) => item.seedTemplateId === undefined);
    expect(gerados.length).toBeGreaterThan(0);
    expect(gerados.length / resultado.candidatos.length).toBeGreaterThan(0.4);
  });

  it("o espaço de composições é muito maior do que o catálogo", () => {
    // O que se mede é o espaço POSSÍVEL — problema × modelo × forma de
    // entrega — e não o que um perfil concreto alcança. É esse número que
    // deixa de ser o comprimento de um array.
    const espaco = PROBLEMAS.reduce(
      (total, problema) => total + problema.modelos.length * 2,
      0,
    );
    expect(espaco).toBeGreaterThan(OPPORTUNITY_TEMPLATES.length * 4);

    // E o que UM perfil alcança já é mais do que o catálogo inteiro
    // conseguiria oferecer-lhe, porque o catálogo não filtra por
    // capacidade — mostra tudo a toda a gente.
    const alcancado = generateCandidates(CASAL_SETUBAL).combinacoesConsideradas;
    expect(alcancado).toBeGreaterThan(10);
  });

  it("acrescentar uma competência abre hipóteses novas", () => {
    // A propriedade que separa um grafo de uma lista: uma entidade nova
    // abre combinações, não acrescenta uma linha.
    const antes = generateCandidates(ESTUDANTE_DIGITAL).candidatos.length;
    const depois = generateCandidates({
      ...ESTUDANTE_DIGITAL,
      competencias: [...ESTUDANTE_DIGITAL.competencias, { id: "ensinar", nivel: "intermedio" }],
    }).candidatos.length;
    expect(depois).toBeGreaterThan(antes);
  });

  it("é determinístico: o mesmo contexto produz o mesmo resultado", () => {
    const agora = () => "2026-08-22T10:00:00Z";
    const primeiro = descobrir(ENGENHEIRO_PORTO, { agora });
    const segundo = descobrir(ENGENHEIRO_PORTO, { agora });
    expect(primeiro.candidatos.map((item) => item.id)).toEqual(segundo.candidatos.map((item) => item.id));
    expect(primeiro.candidatos.map((item) => item.pontuacaoGlobal)).toEqual(
      segundo.candidatos.map((item) => item.pontuacaoGlobal),
    );
  });
});

describe("descoberta: as restrições eliminam mesmo", () => {
  it("capital máximo de 2 000 € não recomenda o que exige 40 000 €", () => {
    const apertado = perfil({
      ...CASAL_SETUBAL,
      capital: { disponivelAgora: 2000, maximo: 2000 },
    });
    const resultado = descobrir(apertado);
    for (const candidato of resultado.candidatos) {
      expect(candidato.modelo.capitalTipico.min, candidato.titulo).toBeLessThanOrEqual(2000);
    }
  });

  it("«não quero empregados» não devolve modelos que precisam de equipa", () => {
    const sozinho = perfil({ ...CASAL_SETUBAL, restricoes: ["sem-empregados"] });
    const resultado = descobrir(sozinho);
    expect(resultado.candidatos.every((item) => !item.modelo.precisaEquipa)).toBe(true);
    expect(resultado.descartados.some((item) => item.motivo === "restricao")).toBe(true);
  });

  it("«não tenho carro» elimina o que depende de viatura", () => {
    const semCarro = perfil({
      ...CASAL_SETUBAL,
      restricoes: ["sem-carro"],
    });
    const resultado = descobrir(semCarro);
    for (const candidato of resultado.candidatos) {
      const exigeViatura = candidato.capacidadesUsadas.some((capacidade) =>
        capacidade.ativosNecessarios.some((ativo) => ativo.startsWith("veiculo")),
      );
      expect(exigeViatura, candidato.titulo).toBe(false);
    }
  });

  it("cada descarte diz o motivo, e quase sempre o que mudaria", () => {
    const resultado = descobrir(ESTUDANTE_DIGITAL);
    for (const descartado of resultado.descartados) {
      expect(descartado.explicacao.trim().length).toBeGreaterThan(20);
      expect(descartado.motivo).toBeTruthy();
    }
    const porRestricao = resultado.descartados.filter((item) => item.motivo !== "duplicado");
    if (porRestricao.length > 0) {
      expect(porRestricao.some((item) => item.oQueMudaria !== undefined)).toBe(true);
    }
  });

  it("B2B pedido explicitamente não devolve problemas de consumidor final", () => {
    const resultado = descobrir(ENGENHEIRO_PORTO);
    expect(resultado.candidatos.every((item) => item.mercado !== "b2c")).toBe(true);
  });
});

describe("descoberta: nenhum número sem proveniência", () => {
  it("todo o intervalo apresentado declara a origem e a limitação", () => {
    for (const [nome, contexto] of PERFIS) {
      for (const candidato of descobrir(contexto).candidatos) {
        for (const intervalo of [
          candidato.viabilidade.investimentoInicial,
          candidato.viabilidade.custoMensal,
          candidato.viabilidade.tempoAteReceitaMeses,
        ]) {
          if (intervalo === null) continue;
          expect(intervalo.proveniencia.origem, `${nome}/${candidato.id}`).toBeTruthy();
          expect(intervalo.proveniencia.fonte.trim().length).toBeGreaterThan(3);
          // Uma estimativa nunca se disfarça de observação: tem de dizer
          // o que a limita.
          if (intervalo.proveniencia.origem === "estimativa") {
            expect(intervalo.proveniencia.limitacao, `${candidato.id}`).toBeTruthy();
          }
        }
      }
    }
  });

  it("toda a evidência traz fonte, período e geografia", () => {
    for (const candidato of descobrir(CASAL_SETUBAL).candidatos) {
      for (const evidencia of candidato.evidencias) {
        expect(evidencia.proveniencia.origem).toBe("observado");
        expect(evidencia.proveniencia.fonte.trim()).not.toBe("");
        expect(evidencia.proveniencia.geografia).toBeTruthy();
      }
    }
  });

  it("a viabilidade declara sempre o que a limita", () => {
    for (const candidato of descobrir(AGRICOLA_ALENTEJO).candidatos) {
      expect(candidato.viabilidade.limitacoes.length).toBeGreaterThan(0);
    }
  });
});

describe("descoberta: incerteza à vista, e nunca escondida", () => {
  it("ausência de concorrentes nunca é lida como oportunidade", () => {
    // O ponto 44 do pedido, e o mais fácil de errar. Sem sinal de oferta,
    // a leitura tem de ser «desconhecida» — nunca «pouca oferta».
    for (const [nome, contexto] of PERFIS) {
      for (const candidato of descobrir(contexto).candidatos) {
        const temOferta = candidato.evidencias.some((item) => item.tipo === "concorrencia");
        if (!temOferta) {
          expect(candidato.procura.leitura, `${nome}/${candidato.id}`).toBe("desconhecida");
        }
      }
    }
  });

  it("ter sinal de procura E de oferta ainda não é ter a lacuna", () => {
    // Este ramo dava «procura com pouca oferta» — 90 em 100 — assim que
    // existisse um sinal de cada, sem comparar coisa nenhuma. Era
    // inalcançável, e por isso ninguém reparou: a primeira série de
    // oferta a entrar distribuía noventas de borla.
    //
    // Uma taxa de ocupação e uma contagem de operadores não se subtraem.
    // Sem base comum declarada, a resposta é a mesma que sem sinal
    // nenhum: não sabemos.
    const fonte = readFileSync("src/lib/negocio/descoberta/motor/procura.ts", "utf8");
    const ramo = fonte.slice(
      fonte.indexOf("if (temProcura && temOferta)"),
      fonte.indexOf("} else if (temProcura)"),
    );
    expect(ramo).toContain('leitura = "desconhecida"');
    expect(ramo).not.toContain('leitura = "procura-com-pouca-oferta"');
  });

  it("uma dimensão sem base vale `null`, nunca zero", () => {
    const candidato = descobrir(ESTUDANTE_DIGITAL).candidatos[0]!;
    // Hoje não há uma única série de oferta ligada ao motor.
    expect(candidato.scores.lacunaDeOferta).toBeNull();
  });

  it("a confiança é separada do fit e da pontuação", () => {
    for (const candidato of descobrir(ENGENHEIRO_PORTO).candidatos) {
      expect(candidato.confianca.nivel).toBeTruthy();
      expect(candidato.confianca.cobertura).toBeLessThanOrEqual(1);
      // A confiança NÃO multiplica a pontuação: uma hipótese pode ter fit
      // alto e confiança baixa, e isso é informação, não contradição.
      expect(candidato.pontuacaoGlobal).toBeGreaterThan(0);
    }
  });

  it("toda a hipótese sem evidência diz o que falta saber", () => {
    for (const candidato of descobrir(AGRICOLA_ALENTEJO).candidatos) {
      if (candidato.evidencias.length === 0) {
        expect(candidato.lacunas.length, candidato.titulo).toBeGreaterThan(0);
      }
    }
  });

  it("o stress test corre sempre, e nem sempre com a mesma resposta", () => {
    const resultado = descobrir(CASAL_SETUBAL);
    for (const candidato of resultado.candidatos) {
      expect(candidato.objecoes.length).toBeGreaterThanOrEqual(8);
      for (const objecao of candidato.objecoes) {
        expect(objecao.resposta.trim().length).toBeGreaterThan(20);
      }
    }
    const respostas = new Set(
      resultado.candidatos.map((item) => item.objecoes.map((objecao) => objecao.procede).join("")),
    );
    expect(respostas.size).toBeGreaterThan(1);
  });
});

describe("descoberta: diversidade dos resultados", () => {
  it("o top-10 não é composto por variantes do mesmo negócio", () => {
    for (const [nome, contexto] of PERFIS) {
      const resultado = descobrir(contexto, { limite: 10 });
      const problemas = new Set(resultado.candidatos.map((item) => item.problema.id));
      // Um teto de dois por problema é uma garantia do motor, não uma
      // consequência: com três variantes do mesmo, a lista deixa de dar
      // escolha a quem a lê.
      for (const problema of problemas) {
        const quantos = resultado.candidatos.filter((item) => item.problema.id === problema).length;
        expect(quantos, `${nome}/${problema}`).toBeLessThanOrEqual(2);
      }
      if (resultado.candidatos.length >= 4) {
        expect(problemas.size, nome).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("os primeiros lugares são todos de problemas diferentes", () => {
    const resultado = descobrir(CASAL_SETUBAL, { limite: 10 });
    const primeiros = resultado.candidatos.slice(0, 3).map((item) => item.problema.id);
    expect(new Set(primeiros).size).toBe(primeiros.length);
  });

  it("os ângulos de leitura não repetem candidatos", () => {
    const resultado = descobrir(ENGENHEIRO_PORTO, { limite: 10 });
    const ids = resultado.destaques.map((item) => item.candidato.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("descoberta: perfis diferentes, respostas diferentes", () => {
  it("quatro perfis radicalmente diferentes não recebem as mesmas hipóteses", () => {
    // O critério do ponto 56, escrito como teste: «se as mesmas dez
    // oportunidades aparecerem para todos, o motor fracassou».
    //
    // O limiar não é zero, e não deve ser: dois perfis que ambos sabem
    // trabalhar com dados CONSEGUEM mesmo atacar os mesmos problemas, e
    // fingir o contrário seria esconder informação verdadeira. O que não
    // pode acontecer é a lista ser praticamente a mesma — nem o topo.
    const conjuntos = PERFIS.map(
      ([, contexto]) => new Set(descobrir(contexto, { limite: 10 }).candidatos.map((item) => item.problema.id)),
    );

    for (let esquerda = 0; esquerda < conjuntos.length; esquerda += 1) {
      for (let direita = esquerda + 1; direita < conjuntos.length; direita += 1) {
        const a = conjuntos[esquerda]!;
        const b = conjuntos[direita]!;
        const comuns = [...a].filter((item) => b.has(item)).length;
        const jaccard = comuns / new Set([...a, ...b]).size;
        expect(
          jaccard,
          `${PERFIS[esquerda]![0]} vs ${PERFIS[direita]![0]}: ${(jaccard * 100).toFixed(0)}% de sobreposição`,
        ).toBeLessThan(0.6);
      }
    }
  });

  it("nenhum par de perfis partilha o pódio", () => {
    // A prova mais dura: os três primeiros lugares — que é o que uma
    // pessoa lê antes de decidir se a ferramenta a conhece — têm de ser
    // diferentes para perfis diferentes.
    const podios = PERFIS.map(
      ([nome, contexto]) =>
        [
          nome,
          descobrir(contexto, { limite: 10 })
            .candidatos.slice(0, 3)
            .map((item) => item.id)
            .join("|"),
        ] as const,
    );
    expect(new Set(podios.map(([, podio]) => podio)).size).toBe(podios.length);
  });

  it("cada perfil tem pelo menos uma hipótese que mais nenhum tem", () => {
    const conjuntos = PERFIS.map(
      ([nome, contexto]) =>
        [nome, new Set(descobrir(contexto, { limite: 10 }).candidatos.map((item) => item.problema.id))] as const,
    );
    for (const [nome, meu] of conjuntos) {
      const dosOutros = new Set(
        conjuntos.filter(([outroNome]) => outroNome !== nome).flatMap(([, conjunto]) => [...conjunto]),
      );
      const exclusivas = [...meu].filter((item) => !dosOutros.has(item));
      expect(exclusivas.length, nome).toBeGreaterThan(0);
    }
  });

  it("a zona escolhida muda o que aparece", () => {
    // Portugal não é um mercado só (ponto 42). Um problema restrito ao
    // interior não pode aparecer a quem opera na Grande Lisboa.
    const noAlentejo = descobrir(AGRICOLA_ALENTEJO, { limite: 12 });
    const emLisboa = descobrir(
      { ...AGRICOLA_ALENTEJO, localizacao: { regiao: "grande-lisboa", alcance: "concelho" } },
      { limite: 12 },
    );
    const soRegionais = PROBLEMAS.filter((item) => !item.regioes.includes("portugal")).map((item) => item.id);
    const regionaisNoAlentejo = noAlentejo.candidatos.filter((item) => soRegionais.includes(item.problema.id));
    expect(regionaisNoAlentejo.length).toBeGreaterThan(0);
    for (const candidato of emLisboa.candidatos) {
      if (!soRegionais.includes(candidato.problema.id)) continue;
      expect(candidato.problema.regioes).toContain("grande-lisboa");
    }
  });
});

describe("descoberta: telemetria e plano de investigação", () => {
  it("os números publicados são os do pipeline, não escritos à mão", () => {
    const resultado = descobrir(CASAL_SETUBAL, { limite: 10 });
    const { telemetria } = resultado;
    expect(telemetria.hipotesesGeradas).toBeGreaterThan(0);
    expect(telemetria.combinacoesConsideradas).toBeGreaterThanOrEqual(telemetria.hipotesesGeradas);
    expect(telemetria.aprovadas).toBeGreaterThanOrEqual(resultado.candidatos.length);
    expect(telemetria.descartadasPorRestricao + telemetria.descartadasPorDuplicacao).toBe(
      resultado.descartados.length,
    );
    for (const etapa of telemetria.etapas) {
      expect(etapa.sairam).toBeLessThanOrEqual(etapa.entraram);
    }
  });

  it("cada candidato tem um plano de investigação próprio", () => {
    const resultado = descobrir(ENGENHEIRO_PORTO, { limite: 6 });
    const assinaturas = new Set<string>();
    for (const candidato of resultado.candidatos) {
      const plano = resultado.planos.get(candidato.id);
      expect(plano, candidato.id).toBeDefined();
      expect(plano!.consultas.length).toBeGreaterThan(1);
      for (const consulta of plano!.consultas) {
        expect(consulta.frescuraMaximaDias).toBeGreaterThan(0);
        expect(consulta.fontes.length).toBeGreaterThan(0);
        // Nunca uma pesquisa preguiçosa de «ideias de negócio».
        expect(consulta.pergunta.toLocaleLowerCase("pt-PT")).not.toContain("ideias de negócio");
        expect(consulta.pergunta.toLocaleLowerCase("pt-PT")).not.toContain("melhores negócios");
      }
      assinaturas.add(plano!.consultas.map((consulta) => consulta.pergunta).join("|"));
    }
    // Duas hipóteses diferentes geram investigações diferentes.
    expect(assinaturas.size).toBeGreaterThan(1);
  });

  it("TTL diferente para tipos de dado diferentes", () => {
    const plano = buildResearchPlan(generateCandidates(CASAL_SETUBAL).candidatos[0]!);
    const ttls = new Set(plano.consultas.map((consulta) => consulta.frescuraMaximaDias));
    expect(ttls.size).toBeGreaterThan(1);
  });
});

describe("descoberta: histórico entre análises", () => {
  it("compara duas análises e diz o que mudou", () => {
    const primeira = descobrir(ESTUDANTE_DIGITAL, { agora: () => "2026-07-12T10:00:00Z" });
    const comMaisCapital = descobrir(
      { ...ESTUDANTE_DIGITAL, capital: { disponivelAgora: 20000 } },
      { agora: () => "2026-08-22T10:00:00Z" },
    );
    const diferenca = compararAnalises(comoInstantaneo(primeira), comoInstantaneo(comMaisCapital));
    expect(diferenca.anterior).toBe("2026-07-12T10:00:00Z");
    expect(diferenca.atual).toBe("2026-08-22T10:00:00Z");
    expect(diferenca.novas.length + diferenca.subiram.length + diferenca.sairam.length).toBeGreaterThan(0);
  });

  it("o instantâneo não guarda o contexto", () => {
    // Comparar duas análises não pode obrigar a conservar o perfil, que é
    // a parte identificadora.
    const instantaneo = comoInstantaneo(descobrir(CASAL_SETUBAL));
    expect(JSON.stringify(instantaneo)).not.toContain("competencias");
    expect(JSON.stringify(instantaneo)).not.toContain("peninsula-setubal");
  });
});
