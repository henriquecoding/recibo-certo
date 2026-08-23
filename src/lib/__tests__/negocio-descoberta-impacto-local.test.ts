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

  it("com zona fixada, o concelho passa a ser o próximo passo", () => {
    const impacto = medir({ regiao: "grande-lisboa" }, "1A01106");
    expect(impacto.proximoPasso?.campo).toBe("concelho");
    expect(campo(impacto, "concelho").ganhaConcorrencia).toBeGreaterThan(0);
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

  it("um campo que não muda nada di-lo, em vez de inventar um benefício", () => {
    // O raio só pesa em trabalho presencial e território pouco denso.
    // Prometer efeito onde não há é o mesmo defeito, do outro lado.
    const raio = campo(medir({ regiao: "grande-lisboa", territorio: "urbano" }), "raio");
    expect(raio.peso).toBe("sem-efeito");
    expect(raio.frase).toMatch(/não é o caso/i);
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
