// ═══════════════════════════════════════════════════════════════════════
//  O QUE CADA RESPOSTA DE LOCALIZAÇÃO MUDA
//  ---------------------------------------------------------------------
//  Nasceu de uma queixa concreta: «onde vais operar é péssimo em
//  personalização, parece que não altera em nada».
//
//  Medido, a queixa é meia verdade — e a metade que é falsa é a mais
//  interessante. O motor responde a TODOS os campos; o que não acontece é
//  a lista mudar de títulos. O alcance é o caso extremo: troca a forma de
//  entrega das quatro hipóteses de presencial para híbrido, e o ecrã
//  mostra os mesmos quatro cartões.
//
//  Estes testes prendem os números que essa medição produziu, e sobretudo
//  prendem o defeito que a primeira implementação teve — ver «a
//  identidade», abaixo, que é onde um número errado quase passou.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { CONTEXTO_INICIAL, type OpportunityContext } from "@/lib/negocio/descoberta/contexto/tipos";
import { impactoDaLocalizacao } from "@/lib/negocio/descoberta/motor/impacto-local";
import { comInstantaneoPorBaixo } from "@/lib/negocio/market/procura-nuts2";
import { MATRIZ_CONCELHOS } from "@/lib/negocio/market/oferta-concelhos";
import { COMPETENCIAS } from "@/lib/negocio/descoberta/conhecimento/dados/competencias";
import type { PackOferta } from "@/lib/negocio/market/oferta";

const AGORA = "2026-08-23T00:00:00.000Z";

/** O pack do pior caso de produção: sem INE, só o que está commitado. */
const PACK = {
  schemaVersion: 1,
  geradoEm: AGORA,
  indicadorEmpresas: "",
  indicadorPopulacao: "",
  licenca: null,
  divisoes: [],
  populacao: [],
  emFalta: [],
  concelhos: MATRIZ_CONCELHOS,
} as unknown as PackOferta;

const EVIDENCIA = comInstantaneoPorBaixo([]).pilotos;

const contexto = (
  localizacao: Partial<OpportunityContext["localizacao"]>,
): OpportunityContext => ({
  ...CONTEXTO_INICIAL,
  localizacao: {
    regiao: "portugal",
    alcance: "regiao",
    ...localizacao,
  } as OpportunityContext["localizacao"],
  competencias: COMPETENCIAS.slice(0, 6).map((item) => ({ id: item.id, nivel: "avancado" as const })),
  capital: { disponivelAgora: 5000 },
  tempo: { dedicacao: "integral" },
  rendimento: { ambicao: "substituir-salario" },
  equipa: { forma: "sozinho" },
  risco: { perfil: "moderado" },
});

const medir = (
  localizacao: Partial<OpportunityContext["localizacao"]>,
  concelhoParaTeste?: string,
) =>
  impactoDaLocalizacao({
    contexto: contexto(localizacao),
    evidencia: EVIDENCIA,
    oferta: PACK,
    agora: () => AGORA,
    concelhoParaTeste,
  });

const campo = (impacto: ReturnType<typeof medir>, nome: string) =>
  impacto.efeitos.find((item) => item.campo === nome)!;

describe("impacto local · a identidade atravessa as corridas", () => {
  // ┌──────────────────────────────────────────────────────────────────┐
  // │ O DEFEITO QUE ISTO PRENDE                                         │
  // │                                                                  │
  // │ `gerador.ts` compõe o id como                                     │
  // │     problema :: modelo :: ENTREGA :: REGIÃO                       │
  // │ e estas simulações fazem variar exatamente os dois últimos.       │
  // │                                                                  │
  // │ A primeira versão comparava por `id`. Resultado: toda a hipótese  │
  // │ parecia NOVA quando só tinha mudado a zona, e o painel dizia que  │
  // │ fixar a zona não ligava procura nenhuma — quando liga as quatro.  │
  // │ Um número errado, com ar de medição, no sítio onde a pessoa       │
  // │ decide se vale a pena responder.                                  │
  // └──────────────────────────────────────────────────────────────────┘

  it("fixar a zona é reconhecido como decisivo, não como hipóteses novas", () => {
    const zona = campo(medir({ territorio: "rural" }), "zona");
    expect(zona.respondido).toBe(false);
    expect(zona.ganhaProcura).toBeGreaterThan(0);
    expect(zona.peso).toBe("decisivo");
  });

  it("o alcance é lido como troca de entrega, não como hipóteses novas", () => {
    // É o caso mais enganador: o motor recompõe presencial → híbrido e a
    // lista fica com os mesmos títulos. Se isto voltar a contar como
    // «novas», o painel volta a mentir sobre o que o botão faz.
    const alcance = campo(medir({ regiao: "grande-lisboa" }), "alcance");
    expect(alcance.mudaEntrega).toBeGreaterThan(0);
    expect(alcance.frase).toMatch(/forma de entrega/i);
  });
});

describe("impacto local · cada campo diz o que faz", () => {
  it("a zona por responder é o próximo passo, acima de tudo o resto", () => {
    // É o estado em que a ferramenta abre — e o mais caro de todos.
    const impacto = medir({ territorio: "rural" });
    expect(impacto.proximoPasso?.campo).toBe("zona");
  });

  it("com alcance de região, o concelho diz que NÃO é a zona — e o que o torna", () => {
    // ┌────────────────────────────────────────────────────────────────┐
    // │ O QUE MUDOU AQUI, E PORQUÊ                                      │
    // │                                                                │
    // │ Este teste exigia que o concelho fosse sempre o próximo passo. │
    // │ Deixou de o ser, e é uma correção: quem declara «a minha       │
    // │ região» compete NA REGIÃO, e medir-lhe só o concelho           │
    // │ descreveria um mercado que não é o dela. O concelho continua a │
    // │ decidir tudo — assim que o alcance for «o meu concelho» ou     │
    // │ houver um raio a partir dele.                                   │
    // │                                                                │
    // │ O que o painel NÃO pode fazer é o que fazia antes desta série  │
    // │ de correções: dizer «não muda nada» e calar-se. Se não conta   │
    // │ aqui, tem de dizer o que o faria contar.                        │
    // └────────────────────────────────────────────────────────────────┘
    const impacto = medir({ regiao: "grande-lisboa", concelho: "1A01106" });
    const concelho = campo(impacto, "concelho");
    expect(concelho.peso).toBe("sem-efeito");
    expect(concelho.condicao).toMatch(/o meu concelho|raio/i);
  });

  it("com alcance de concelho, o concelho passa a decidir a leitura", () => {
    const impacto = medir({
      regiao: "grande-lisboa",
      concelho: "1A01106",
      alcance: "concelho",
    });
    const concelho = campo(impacto, "concelho");
    expect(concelho.peso).not.toBe("sem-efeito");
    expect(concelho.condicao).toBeNull();
  });

  it("o concelho não aparece antes de haver zona — a pergunta ainda não existe", () => {
    const impacto = medir({});
    expect(impacto.efeitos.some((item) => item.campo === "concelho")).toBe(false);
  });

  it("com tudo respondido não há próximo passo a apontar", () => {
    const impacto = medir({
      regiao: "grande-lisboa",
      concelho: "1A01106",
      territorio: "urbano",
      raioKm: 25,
    });
    expect(impacto.proximoPasso).toBeNull();
  });

  it("um raio sem centro diz que lhe falta o centro, não que é inútil", () => {
    // Prometer efeito onde não há é um defeito; dizer «não muda nada»
    // onde falta uma resposta é o mesmo defeito do outro lado. A frase
    // certa nomeia o que falta.
    const raio = campo(medir({ regiao: "grande-lisboa", territorio: "urbano" }), "raio");
    expect(raio.peso).toBe("sem-efeito");
    expect(raio.frase).toMatch(/centro/i);
  });

  it("um raio com centro diz quantos concelhos e quanta gente apanha", () => {
    // ┌────────────────────────────────────────────────────────────────┐
    // │ O DEFEITO QUE ISTO PRENDE, E FOI MEDIDO                         │
    // │                                                                │
    // │ Antes de `market/alcance.ts` existir, os quatro raios que a    │
    // │ interface oferece davam resultado idêntico — o motor lia       │
    // │ `raioKm` numa só regra, escrita à mão, que exigia ≤ 15 km E    │
    // │ território rural. Três valores em quatro não faziam nada.       │
    // └────────────────────────────────────────────────────────────────┘
    const raio = campo(medir({ regiao: "centro", concelho: "1950505", raioKm: 40 }), "raio");
    expect(raio.frase).toMatch(/40 km/);
    expect(raio.frase).toMatch(/concelhos/);
    expect(raio.peso).not.toBe("sem-efeito");
  });

  it("o alcance nomeia o mercado que cada opção deixa alcançar", () => {
    const alcance = campo(medir({ regiao: "grande-lisboa", concelho: "1A01106" }), "alcance");
    expect(alcance.frase).toMatch(/tamanho do mercado/i);
    // Os extremos são números reais e diferentes: um concelho e o país.
    expect(alcance.frase).toMatch(/todo o país/);
  });

  it("toda a frase é acompanhada pelos números que a sustentam", () => {
    const impacto = medir({ regiao: "grande-lisboa" }, "1A01106");
    for (const efeito of impacto.efeitos) {
      expect(efeito.frase.length).toBeGreaterThan(20);
      // Um campo com peso não-nulo tem de ter pelo menos um número > 0
      // por trás. Sem isto, «decisivo» seria uma etiqueta sem conta.
      if (efeito.peso !== "sem-efeito") {
        const soma =
          efeito.ganhaProcura + efeito.ganhaConcorrencia + efeito.mudaPontuacao + efeito.mudaEntrega;
        expect(soma, efeito.campo).toBeGreaterThan(0);
      }
    }
  });
});

describe("impacto local · o território que as respostas produzem", () => {
  it("o raio recorta um território mais pequeno do que a região", () => {
    const naRegiao = medir({ regiao: "centro", concelho: "1950505" }).territorio!;
    const noRaio = medir({ regiao: "centro", concelho: "1950505", raioKm: 40 }).territorio!;
    expect(naRegiao.base).toBe("regiao");
    expect(noRaio.base).toBe("raio");
    expect(noRaio.concelhos).toBeLessThan(naRegiao.concelhos);
    expect(noRaio.residentes!).toBeLessThan(naRegiao.residentes!);
    expect(noRaio.noRaio.length).toBe(noRaio.concelhos);
  });

  it("sem respostas nenhumas o território é o país, e diz quanta gente é", () => {
    const territorio = medir({}).territorio!;
    expect(territorio.nome).toBe("todo o país");
    expect(territorio.concelhos).toBe(308);
    expect(territorio.residentes).toBeGreaterThan(10_000_000);
  });
});

describe("impacto local · é determinístico e não rebenta", () => {
  it("duas corridas iguais dão exatamente o mesmo", () => {
    const uma = medir({ regiao: "algarve" }, "1500801");
    const outra = medir({ regiao: "algarve" }, "1500801");
    expect(uma.efeitos.map((item) => item.frase)).toEqual(outra.efeitos.map((item) => item.frase));
  });

  it("sem evidência e sem pack continua a responder", () => {
    // O pior caso possível: nenhuma fonte. O painel tem de degradar,
    // não de rebentar — é o mesmo princípio do resto do motor.
    const impacto = impactoDaLocalizacao({
      contexto: contexto({ regiao: "norte" }),
      agora: () => AGORA,
    });
    expect(impacto.efeitos.length).toBeGreaterThan(0);
    for (const efeito of impacto.efeitos) expect(typeof efeito.frase).toBe("string");
  });

  it("a zona diz sempre alguma coisa útil, mesmo para uma competência estreita", () => {
    // ┌────────────────────────────────────────────────────────────────┐
    // │ ASSUNÇÃO QUE SE REVELOU FALSA, E FICA REGISTADA                 │
    // │                                                                │
    // │ Escrevi este teste convencido de que jardinagem sem zona daria  │
    // │ zero hipóteses — porque `terreno-por-manter` declara Alentejo,  │
    // │ Centro, Norte e Algarve, e exclui Lisboa. Dá duas: «todo o      │
    // │ país» não é uma região que falhe a correspondência, é a ausência│
    // │ de filtro, e a geografia é penalizada no score em vez de        │
    // │ eliminar a hipótese.                                            │
    // │                                                                │
    // │ O ramo que conta hipóteses NASCIDAS fica no motor — é correto e │
    // │ barato —, mas não se finge aqui um cenário que o dispare. O que │
    // │ se exige é o que importa: que a zona por responder nunca fique  │
    // │ calada nem prometa o que não mediu.                             │
    // └────────────────────────────────────────────────────────────────┘
    const impacto = impactoDaLocalizacao({
      contexto: {
        ...contexto({}),
        competencias: [{ id: "jardinagem", nivel: "avancado" }],
        ativos: ["ferramentas", "carta-conducao", "veiculo-carga"],
      },
      evidencia: EVIDENCIA,
      oferta: PACK,
      agora: () => AGORA,
    });
    const zona = campo(impacto, "zona");
    expect(zona.respondido).toBe(false);
    expect(zona.frase.length).toBeGreaterThan(20);
    // Se declara peso, tem de haver um número por trás. Se não declara,
    // a frase é a explicação neutra — e nunca uma promessa.
    if (zona.peso !== "sem-efeito") {
      expect(zona.ganhaProcura + zona.mudaPontuacao).toBeGreaterThan(0);
    } else {
      expect(zona.frase).not.toMatch(/liga|aparecer/i);
    }
  });

  it("um contexto sem competências não produz efeitos inventados", () => {
    const impacto = impactoDaLocalizacao({
      contexto: { ...contexto({ regiao: "norte" }), competencias: [] },
      evidencia: EVIDENCIA,
      oferta: PACK,
      agora: () => AGORA,
    });
    expect(impacto.hipotesesAgora).toBe(0);
    for (const efeito of impacto.efeitos) {
      expect(efeito.ganhaProcura).toBe(0);
      expect(efeito.ganhaConcorrencia).toBe(0);
    }
  });
});
