import { describe, expect, it } from "vitest";
import {
  CONTEXTO_INICIAL,
  SESSAO_INICIAL,
  assinaturaDe,
  capacidadesAlcancadas,
  comFeedback,
  comVistos,
  descobrir,
  estadoDaAdequacaoDeclarada,
  type OpportunityContext,
} from "@/lib/negocio/descoberta";
import { normalizarContextoGuardado } from "@/lib/store/perfil-descoberta";

const contextoLogistica = (
  parcial: Partial<OpportunityContext> = {},
): OpportunityContext => ({
  ...CONTEXTO_INICIAL,
  localizacao: { regiao: "grande-lisboa", alcance: "regiao" },
  capital: { disponivelAgora: 20_000 },
  ativos: [
    "carta-conducao",
    "veiculo-ligeiro",
    "veiculo-carga",
    "ferramentas",
    "computador",
  ],
  competencias: [
    { id: "logistica", nivel: "avancado" },
    { id: "organizacao", nivel: "avancado" },
    { id: "limpeza", nivel: "avancado" },
    { id: "vendas", nivel: "intermedio" },
  ],
  ...parcial,
});

describe("descoberta: ter um meio não prova que ele é adequado", () => {
  it("uma viatura sem detalhe fica por confirmar e nunca recebe crédito total", () => {
    const rota = capacidadesAlcancadas(contextoLogistica()).find(
      (item) => item.capacidade.id === "rota-recolha-entrega",
    );
    expect(rota).toBeDefined();
    expect(rota!.ativosPorConfirmar).toEqual(
      expect.arrayContaining(["carta-conducao", "veiculo-ligeiro"]),
    );
    expect(rota!.adequacaoAtivos).toBeLessThan(1);
  });

  it("uma carrinha de passageiros com carga muito reduzida não habilita transporte de carga", () => {
    const contexto = contextoLogistica({
      detalhesAtivos: {
        "carta-conducao": {
          estado: "adequado",
          disponibilidade: "sempre",
          acesso: "proprio",
          usoProfissional: "confirmado",
        },
        "veiculo-carga": {
          estado: "adequado",
          disponibilidade: "sempre",
          acesso: "proprio",
          usoProfissional: "confirmado",
          veiculo: {
            configuracao: "passageiros",
            lugares: 2,
            capacidadeCarga: "muito-reduzida",
            inspecao: "valida",
          },
        },
      },
    });
    expect(
      capacidadesAlcancadas(contexto).some(
        (item) => item.capacidade.id === "transporte-carga",
      ),
    ).toBe(false);
  });

  it("uma viatura confirmada e compatível habilita a capacidade; limitações continuam a pesar", () => {
    const base = contextoLogistica({
      detalhesAtivos: {
        "carta-conducao": {
          estado: "adequado",
          disponibilidade: "sempre",
          acesso: "proprio",
          usoProfissional: "confirmado",
        },
        "veiculo-carga": {
          estado: "funcional-com-limitacoes",
          disponibilidade: "parcial",
          acesso: "proprio",
          usoProfissional: "confirmado",
          limitacoes: ["fiabilidade-incerta"],
          veiculo: {
            configuracao: "mercadorias",
            lugares: 2,
            capacidadeCarga: "media",
            inspecao: "valida",
          },
        },
      },
    });
    const carga = capacidadesAlcancadas(base).find(
      (item) => item.capacidade.id === "transporte-carga",
    );
    expect(carga).toBeDefined();
    expect(carga!.adequacaoAtivos).toBeGreaterThan(0);
    expect(carga!.adequacaoAtivos).toBeLessThan(1);
    expect(
      carga!.avaliacoesAtivos.some((item) => item.estado === "limitado"),
    ).toBe(true);
  });

  it("dois lugares servem uma rota de mercadorias, mas limitam uma operação que acompanha pessoas", () => {
    const contexto = contextoLogistica({
      ativos: ["carta-conducao", "veiculo-ligeiro"],
      detalhesAtivos: {
        "carta-conducao": {
          estado: "adequado",
          disponibilidade: "sempre",
          acesso: "proprio",
          usoProfissional: "confirmado",
        },
        "veiculo-ligeiro": {
          estado: "adequado",
          disponibilidade: "sempre",
          acesso: "proprio",
          usoProfissional: "confirmado",
          veiculo: {
            configuracao: "misto",
            lugares: 2,
            capacidadeCarga: "reduzida",
            inspecao: "valida",
          },
        },
      },
    });
    const capacidades = capacidadesAlcancadas(contexto);
    const pessoas = capacidades.find(
      (item) => item.capacidade.id === "transportar-pessoas",
    );
    const rota = capacidades.find(
      (item) => item.capacidade.id === "rota-recolha-entrega",
    );

    expect(rota).toBeDefined();
    expect(pessoas).toBeDefined();
    expect(
      pessoas!.avaliacoesAtivos.some(
        (item) => item.estado === "limitado" && item.nota.includes("2 lugares"),
      ),
    ).toBe(true);
    expect(pessoas!.adequacaoAtivos).toBeLessThan(rota!.adequacaoAtivos);
  });

  it("uma viatura sem sequer dois lugares não habilita transporte de pessoas", () => {
    const contexto = contextoLogistica({
      ativos: ["carta-conducao", "veiculo-ligeiro"],
      detalhesAtivos: {
        "carta-conducao": {
          estado: "adequado",
          disponibilidade: "sempre",
          acesso: "proprio",
          usoProfissional: "confirmado",
        },
        "veiculo-ligeiro": {
          estado: "adequado",
          disponibilidade: "sempre",
          acesso: "proprio",
          usoProfissional: "confirmado",
          veiculo: {
            configuracao: "passageiros",
            lugares: 1,
            capacidadeCarga: "muito-reduzida",
            inspecao: "valida",
          },
        },
      },
    });

    expect(
      capacidadesAlcancadas(contexto).some(
        (item) => item.capacidade.id === "transportar-pessoas",
      ),
    ).toBe(false);
  });

  it("um meio alugado ou dependente de reserva continua possível, mas pesa menos", () => {
    const contexto = contextoLogistica({
      detalhesAtivos: {
        "carta-conducao": {
          estado: "adequado",
          disponibilidade: "sempre",
          acesso: "proprio",
          usoProfissional: "confirmado",
        },
        "veiculo-carga": {
          estado: "adequado",
          disponibilidade: "parcial",
          acesso: "por-reservar",
          usoProfissional: "confirmado",
          veiculo: {
            configuracao: "mercadorias",
            capacidadeCarga: "media",
            inspecao: "valida",
          },
        },
      },
    });
    const carga = capacidadesAlcancadas(contexto).find(
      (item) => item.capacidade.id === "transporte-carga",
    );
    const viatura = carga?.avaliacoesAtivos.find(
      (item) => item.ativo === "veiculo-carga",
    );
    expect(viatura?.estado).toBe("limitado");
    expect(viatura?.forca).toBeLessThan(0.5);
    expect(viatura?.nota).toMatch(/reserv/);
  });

  it("o estado visível não chama confirmado ao que o motor considera limitado ou incompatível", () => {
    expect(
      estadoDaAdequacaoDeclarada("veiculo-ligeiro", {
        estado: "adequado",
        disponibilidade: "sempre",
        acesso: "alugado",
        usoProfissional: "confirmado",
        veiculo: {
          configuracao: "misto",
          lugares: 2,
          capacidadeCarga: "reduzida",
          inspecao: "valida",
        },
      }),
    ).toBe("limitado");
    expect(
      estadoDaAdequacaoDeclarada("veiculo-ligeiro", {
        estado: "adequado",
        disponibilidade: "sempre",
        acesso: "proprio",
        usoProfissional: "confirmado",
        veiculo: {
          configuracao: "misto",
          lugares: 2,
          capacidadeCarga: "reduzida",
          inspecao: "nao-valida",
        },
      }),
    ).toBe("inadequado");
    expect(
      estadoDaAdequacaoDeclarada("veiculo-ligeiro", {
        estado: "adequado",
        disponibilidade: "sempre",
        acesso: "proprio",
        usoProfissional: "confirmado",
        veiculo: {
          configuracao: "misto",
          capacidadeCarga: "reduzida",
          inspecao: "valida",
        },
      }),
    ).toBe("por-confirmar");
  });

  it("explorar fora do perfil abre opções, mas mantém a falta de viatura como objeção fatal", () => {
    const contexto = contextoLogistica({
      competencias: [{ id: "logistica", nivel: "avancado" }],
      ativos: ["carta-conducao"],
      detalhesAtivos: {
        "carta-conducao": {
          estado: "adequado",
          disponibilidade: "sempre",
          acesso: "proprio",
          usoProfissional: "confirmado",
        },
      },
    });
    const estrito = descobrir(contexto, { limite: 20 });
    const condicional = descobrir(contexto, {
      limite: 20,
      incluirForaDePerfil: true,
    });
    expect(estrito.candidatos).toHaveLength(0);
    expect(condicional.candidatos.length).toBeGreaterThan(0);
    expect(
      condicional.candidatos.every((candidato) =>
        candidato.objecoes.some(
          (item) => item.id === "entrada" && item.fatal && item.procede,
        ),
      ),
    ).toBe(true);
    expect(condicional.destaques).toHaveLength(0);
  });

  it("um perfil antigo ou manipulado volta ao estado seguro e recebe os campos neutros em falta", () => {
    const antigo = {
      ...CONTEXTO_INICIAL,
      ativos: ["veiculo-ligeiro"],
      detalhesAtivos: {
        "veiculo-ligeiro": {
          estado: "inventado",
          disponibilidade: "teletransporte",
          usoProfissional: "talvez",
          veiculo: { configuracao: "barco", lugares: 999, inspecao: "eterna" },
        },
      },
      preferencias: {
        mercado: "indiferente",
        formato: "hibrido",
        receita: "indiferente",
      },
    } as unknown as OpportunityContext;

    const normalizado = normalizarContextoGuardado(antigo);
    expect(normalizado.preferencias.naturezas).toEqual([]);
    expect(normalizado.preferencias.setoresPreferidos).toEqual([]);
    expect(normalizado.detalhesAtivos?.["veiculo-ligeiro"]).toEqual({
      estado: "por-confirmar",
      veiculo: {},
    });
  });
});

describe("descoberta: feedback muda a próxima seleção, não os factos", () => {
  it("«não quero este setor» remove o setor e explica a personalização", () => {
    const base = descobrir(contextoLogistica(), {
      limite: 6,
      agora: () => "2026-08-25T00:00:00Z",
    });
    const primeira = base.candidatos[0]!;
    expect(primeira).toBeDefined();

    const sessao = comFeedback(
      comVistos(
        SESSAO_INICIAL,
        base.candidatos.map((item) => item.id),
      ),
      {
        acao: "nao-e-para-mim",
        motivo: "setor",
        escopo: "setor",
        assinatura: assinaturaDe(primeira),
      },
    );
    const seguinte = descobrir(contextoLogistica(), {
      limite: 6,
      sessao: { ...sessao, modo: "continuar" },
      agora: () => "2026-08-25T00:00:00Z",
    });

    expect(
      seguinte.candidatos.every((item) => item.setor !== primeira.setor),
    ).toBe(true);
    expect(seguinte.aprendizagem.feedbackAplicado).toBe(1);
    expect(seguinte.aprendizagem.excluidos).toBeGreaterThan(0);
    expect(
      seguinte.telemetria.etapas.some(
        (item) => item.etapa === "personalizacao",
      ),
    ).toBe(true);
  });

  it("pedir algo diferente não altera a pontuação publicada dos candidatos", () => {
    const base = descobrir(contextoLogistica(), { limite: 6 });
    const ancora = base.candidatos[0]!;
    const porId = new Map(
      base.candidatos.map((item) => [item.id, item.pontuacaoGlobal]),
    );
    const seguinte = descobrir(contextoLogistica(), {
      limite: 12,
      sessao: {
        ...comVistos(
          SESSAO_INICIAL,
          base.candidatos.map((item) => item.id),
        ),
        modo: "diferente",
        ancora: assinaturaDe(ancora),
      },
    });

    for (const candidato of seguinte.candidatos) {
      const anterior = porId.get(candidato.id);
      if (anterior !== undefined)
        expect(candidato.pontuacaoGlobal).toBe(anterior);
    }
  });

  it("as escolhas da sessão são puras e não escrevem no dispositivo", () => {
    let escritas = 0;
    const janelaAnterior = Object.getOwnPropertyDescriptor(
      globalThis,
      "window",
    );
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: { setItem: () => escritas++, getItem: () => null },
        fetch: () => {
          throw new Error("a sessão tentou comunicar");
        },
      },
    });

    try {
      const candidato = descobrir(contextoLogistica(), { limite: 1 })
        .candidatos[0]!;
      const seguinte = comFeedback(SESSAO_INICIAL, {
        acao: "nao-e-para-mim",
        motivo: "setor",
        escopo: "setor",
        assinatura: assinaturaDe(candidato),
      });
      expect(seguinte.feedback).toHaveLength(1);
      expect(escritas).toBe(0);
    } finally {
      if (janelaAnterior)
        Object.defineProperty(globalThis, "window", janelaAnterior);
      else delete (globalThis as { window?: unknown }).window;
    }
  });
});
