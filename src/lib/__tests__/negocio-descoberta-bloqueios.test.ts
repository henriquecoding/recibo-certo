// ═══════════════════════════════════════════════════════════════════════
//  O BECO SEM SAÍDA — e a garantia de que não volta
//  ---------------------------------------------------------------------
//  Auditoria de 2026-08-23, medida a correr o motor competência a
//  competência: DOZE das vinte e duas competências de então, escolhidas
//  devolviam ZERO hipóteses. Não por falta de grafo — por falta de um
//  meio declarado. Quinze das vinte e cinco capacidades de então exigiam
//  delas exigem «computador» ou «ferramentas», que quase toda a gente tem
//  e ninguém se lembra de declarar.
//
//  O que a pessoa via era: «0 hipóteses passaram os critérios · Nada
//  passou os critérios com este contexto. Abre "o que descartámos"» — e
//  esse painel não existe nesse estado, porque não houve descarte
//  nenhum: não houve geração. Um programador que escolhesse
//  «Programação» e mais nada batia numa parede sem porta.
//
//  Estes testes fixam as três promessas da correção:
//   1. um resultado vazio diz sempre POR QUE É QUE está vazio;
//   2. o número prometido ao lado de «declara este meio» é o número que
//      aparece depois de declarar — contado, não estimado;
//   3. um bloqueio que exige dois meios pede os dois.
//
//  ── 2026-08-25: A PAREDE DEIXOU DE SER DE TIJOLO ───────────────────
//  O painel de bloqueios tratava o sintoma: dizia à pessoa qual a caixa
//  que lhe faltava assinalar. A causa era outra — `ativosNecessarios`
//  eliminava por igual uma cozinha licenciada e um computador, e só uma
//  dessas duas coisas é uma barreira a sério.
//
//  Com `BarreiraAtivo` (ver `contexto/perguntas.ts`), um meio COMPRÁVEL
//  em falta deixa de fechar a porta: fica nomeado como coisa a adquirir,
//  pesa no encaixe e nunca é dado por resolvido. Medido a competência a
//  competência, isoladas: de DOZE em vinte e duas a devolver zero, para
//  TRÊS em vinte e oito — e cada uma das três é uma barreira real e
//  explicada (carta e viatura, cozinha licenciada, e «línguas», que é
//  competência de reforço e não caminho principal).
//
//  O painel continua a existir e continua a ser exato. O que mudou é que
//  agora só aparece onde há mesmo uma parede.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { descobrir } from "@/lib/negocio/descoberta/motor/pipeline";
import { CONTEXTO_INICIAL, type OpportunityContext } from "@/lib/negocio/descoberta/contexto/tipos";
import { COMPETENCIAS } from "@/lib/negocio/descoberta/conhecimento/dados/competencias";
import { CAPACIDADES } from "@/lib/negocio/descoberta/conhecimento/dados/capacidades";

const so = (id: string): OpportunityContext => ({
  ...CONTEXTO_INICIAL,
  competencias: [{ id, nivel: "avancado" }],
});

describe("descoberta: um resultado vazio explica-se sempre", () => {
  it("nenhuma competência isolada leva a um ecrã sem saída", () => {
    const semSaida: string[] = [];
    for (const competencia of COMPETENCIAS) {
      const resultado = descobrir(so(competencia.id), { evidencia: [], limite: 20 });
      if (resultado.candidatos.length > 0) continue;
      const explicado =
        resultado.bloqueiosPorMeio.length > 0 ||
        (resultado.diagnosticoVazio !== null &&
          resultado.diagnosticoVazio.tipo !== "sem-causa-identificada");
      if (!explicado) semSaida.push(competencia.id);
    }
    expect(semSaida).toEqual([]);
  });

  it("com candidatos, não há diagnóstico de vazio a contradizê-los", () => {
    const resultado = descobrir(
      {
        ...CONTEXTO_INICIAL,
        competencias: [{ id: "cuidar", nivel: "avancado" }],
      },
      { evidencia: [], limite: 10 },
    );
    expect(resultado.candidatos.length).toBeGreaterThan(0);
    expect(resultado.diagnosticoVazio).toBeNull();
  });
});

describe("descoberta: o que um meio destranca é contado, não estimado", () => {
  it("um meio comprável já não é parede — o programador sem computador tem resposta", () => {
    // O caso original da auditoria. Assertava-se `toHaveLength(0)`, o que
    // era medir o defeito e chamar-lhe garantia: um programador que não
    // se lembrou de assinalar «Computador de trabalho» batia numa parede.
    const resultado = descobrir(so("programacao"), { evidencia: [], limite: 20 });
    expect(resultado.candidatos.length).toBeGreaterThan(0);

    // E o que falta continua dito em voz alta, sem ser dado por resolvido.
    const meios = resultado.candidatos.flatMap((candidato) =>
      candidato.capacidadesUsadas.flatMap((capacidade) => capacidade.ativosNecessarios),
    );
    expect(meios).toContain("computador");
    expect(
      resultado.candidatos.some((candidato) =>
        candidato.objecoes.some(
          (objecao) => objecao.id === "entrada" && objecao.procede && !objecao.fatal,
        ),
      ),
    ).toBe(true);
  });

  it("declarar os meios prometidos dá exatamente as hipóteses prometidas", () => {
    // Uma barreira ESTRUTURAL: carta de condução e viatura de carga não se
    // compram na semana em que se decide abrir, e continuam a eliminar.
    const base = so("logistica");
    const resultado = descobrir(base, { evidencia: [], limite: 20 });
    expect(resultado.candidatos).toHaveLength(0);
    expect(resultado.bloqueiosPorMeio.length).toBeGreaterThan(0);

    for (const bloqueio of resultado.bloqueiosPorMeio) {
      const depois = descobrir(
        { ...base, ativos: [...base.ativos, ...bloqueio.ativos] },
        { evidencia: [], limite: 20 },
      );
      // A promessa é sobre o que a pessoa VÊ. Contar o que o gerador
      // produz dava 2 onde o ecrã mostra 1 — a deduplicação e a
      // diversificação vêm depois dele.
      expect(depois.candidatos.length - resultado.candidatos.length).toBe(
        bloqueio.hipotesesQueAbriria,
      );
    }
  });

  it("a promessa bate certo em todas as competências bloqueadas", () => {
    for (const competencia of COMPETENCIAS) {
      const base = so(competencia.id);
      const antes = descobrir(base, { evidencia: [], limite: 20 });
      for (const bloqueio of antes.bloqueiosPorMeio) {
        const depois = descobrir(
          { ...base, ativos: [...base.ativos, ...bloqueio.ativos] },
          { evidencia: [], limite: 20 },
        );
        expect({
          competencia: competencia.id,
          meios: bloqueio.ativos,
          abre: depois.candidatos.length - antes.candidatos.length,
        }).toEqual({
          competencia: competencia.id,
          meios: bloqueio.ativos,
          abre: bloqueio.hipotesesQueAbriria,
        });
      }
    }
  });

  it("um bloqueio nunca promete abrir zero", () => {
    for (const competencia of COMPETENCIAS) {
      for (const bloqueio of descobrir(so(competencia.id), { evidencia: [], limite: 20 })
        .bloqueiosPorMeio) {
        expect(bloqueio.hipotesesQueAbriria).toBeGreaterThan(0);
      }
    }
  });

  it("uma capacidade que exige dois meios pede os dois, não um", () => {
    // `transporte-carga` exige viatura de carga E carta de condução, e as
    // duas são estruturais — é o caso que continua a fazer parede. A
    // primeira versão desta correção agrupava meio a meio e concluía que
    // nenhum deles destrancava nada, deixando a competência sem explicação.
    //
    // (Era `intervencao-eletrica`. Deixou de servir de exemplo por bom
    // motivo: ferramentas e equipamento técnico compram-se, e a capacidade
    // passou a ser alcançável sem eles — com a compra nomeada.)
    const capacidade = CAPACIDADES.find((item) => item.id === "transporte-carga");
    expect(capacidade?.ativosNecessarios.length).toBeGreaterThan(1);

    const resultado = descobrir(so("logistica"), { evidencia: [], limite: 20 });
    expect(resultado.candidatos).toHaveLength(0);
    const conjunto = resultado.bloqueiosPorMeio.find((item) => item.ativos.length > 1);
    expect(conjunto).toBeDefined();
    expect(conjunto!.rotulos.length).toBe(conjunto!.ativos.length);
  });

  it("uma competência cujo único meio é comprável já não produz bloqueio nenhum", () => {
    // `eletrica` era o exemplo anterior. Ferramentas e equipamento técnico
    // são despesa de arranque, não barreira — e portanto não há parede a
    // anunciar. A hipótese aparece, com a compra por fazer escrita nela.
    const resultado = descobrir(so("eletrica"), { evidencia: [], limite: 20 });
    expect(resultado.candidatos.length).toBeGreaterThan(0);
    expect(resultado.bloqueiosPorMeio).toHaveLength(0);
  });

  it("os bloqueios são determinísticos, como o resto do motor", () => {
    const contexto = so("construcao");
    const primeira = descobrir(contexto, { evidencia: [], limite: 20 });
    const segunda = descobrir(contexto, { evidencia: [], limite: 20 });
    expect(primeira.bloqueiosPorMeio).toEqual(segunda.bloqueiosPorMeio);
  });

  it("quem já tem tudo declarado não recebe bloqueios nenhuns", () => {
    const contexto: OpportunityContext = {
      ...CONTEXTO_INICIAL,
      competencias: [{ id: "programacao", nivel: "avancado" }],
      ativos: ["computador"],
    };
    const resultado = descobrir(contexto, { evidencia: [], limite: 20 });
    expect(resultado.candidatos.length).toBeGreaterThan(0);
    expect(resultado.bloqueiosPorMeio).toEqual([]);
  });
});

describe("descoberta: uma competência que só reforça diz que só reforça", () => {
  it("as línguas, sozinhas, não são um beco — são uma explicação", () => {
    // `linguas` aparece no grafo sempre como competência ÚTIL e nunca
    // como necessária. Zero hipóteses é a resposta CERTA; o que estava
    // errado era o silêncio sobre o porquê.
    const apoio = CAPACIDADES.every((item) => !item.competenciasNecessarias.includes("linguas"));
    expect(apoio).toBe(true);

    const resultado = descobrir(so("linguas"), { evidencia: [], limite: 20 });
    expect(resultado.candidatos).toHaveLength(0);
    expect(resultado.diagnosticoVazio?.tipo).toBe("competencia-de-apoio");
    if (resultado.diagnosticoVazio?.tipo === "competencia-de-apoio") {
      expect(resultado.diagnosticoVazio.competencias).toContain("Línguas estrangeiras");
    }
  });
});
