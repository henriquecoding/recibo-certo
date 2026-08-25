import { describe, expect, it } from "vitest";
import {
  CONTEXTO_INICIAL,
  SESSAO_INICIAL,
  assinaturaDe,
  capacidadesAlcancadas,
  comFeedback,
  comVistos,
  descobrir,
  CAPACIDADE_POR_ID,
  avaliarAtivosDaCapacidade,
  ativoImpedeExecucao,
  avaliarRequisitoAtivo,
  barreiraDoAtivo,
  estadoDaAdequacaoDeclarada,
  faixaDaCargaUtil,
  idadeDaViatura,
  inspecaoJaEAnual,
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
            anoMatricula: 2019,
            restricoesCirculacao: "sem-restricoes",
            dimensoesCargaCm: { comprimento: 180, largura: 110, altura: 120 },
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
            anoMatricula: 2019,
            restricoesCirculacao: "sem-restricoes",
            dimensoesCargaCm: { comprimento: 180, largura: 110, altura: 120 },
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
            anoMatricula: 2019,
            restricoesCirculacao: "sem-restricoes",
            dimensoesCargaCm: { comprimento: 180, largura: 110, altura: 120 },
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
            anoMatricula: 2019,
            restricoesCirculacao: "sem-restricoes",
            dimensoesCargaCm: { comprimento: 180, largura: 110, altura: 120 },
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
            anoMatricula: 2019,
            restricoesCirculacao: "sem-restricoes",
            dimensoesCargaCm: { comprimento: 180, largura: 110, altura: 120 },
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
          anoMatricula: 2019,
          restricoesCirculacao: "sem-restricoes",
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
          anoMatricula: 2019,
          restricoesCirculacao: "sem-restricoes",
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

describe("descoberta: uma carrinha velha, pequena e cara não é «uma carrinha»", () => {
  const viaturaCompleta = {
    estado: "adequado",
    disponibilidade: "sempre",
    acesso: "proprio",
    usoProfissional: "confirmado",
    veiculo: {
      configuracao: "mercadorias",
      lugares: 2,
      capacidadeCarga: "media",
      inspecao: "valida",
      anoMatricula: 2019,
      restricoesCirculacao: "sem-restricoes",
      dimensoesCargaCm: { comprimento: 180, largura: 110, altura: 120 },
    },
  } as const;

  const carta = {
    estado: "adequado",
    disponibilidade: "sempre",
    acesso: "proprio",
    usoProfissional: "confirmado",
  } as const;

  const comViatura = (parcial: Record<string, unknown>): OpportunityContext =>
    contextoLogistica({
      detalhesAtivos: {
        "carta-conducao": carta,
        "veiculo-carga": {
          ...viaturaCompleta,
          veiculo: { ...viaturaCompleta.veiculo, ...parcial },
        },
      },
    });

  /** A avaliação crua, que continua a existir mesmo quando ELIMINA. */
  const viaturaEm = (contexto: OpportunityContext) =>
    avaliarAtivosDaCapacidade(
      contexto,
      CAPACIDADE_POR_ID.get("transporte-carga")!,
    ).find((item) => item.ativo === "veiculo-carga");

  const alcancaCarga = (contexto: OpportunityContext) =>
    capacidadesAlcancadas(contexto).some(
      (item) => item.capacidade.id === "transporte-carga",
    );

  it("os quilos declarados mandam sobre a faixa escolhida", () => {
    // «Média» dizia ≥ 500 kg. 150 kg é 150 kg, mesmo que a pessoa tenha
    // escolhido média ao lado — e 150 kg não fazem transporte de carga.
    const contexto = comViatura({ cargaUtilKg: 150 });
    expect(viaturaEm(contexto)?.estado).toBe("inadequado");
    expect(viaturaEm(contexto)?.nota).toMatch(/150 kg/);
    expect(alcancaCarga(contexto)).toBe(false);

    // A mesma viatura com carga útil real acima do piso volta a servir.
    const capaz = comViatura({ cargaUtilKg: 800 });
    expect(viaturaEm(capaz)?.estado).toBe("adequado");
    expect(alcancaCarga(capaz)).toBe(true);
  });

  it("uma zona de carga onde não cabe uma palete não transporta volume", () => {
    const contexto = comViatura({
      dimensoesCargaCm: { comprimento: 95, largura: 70, altura: 60 },
    });
    expect(viaturaEm(contexto)?.estado).toBe("inadequado");
    expect(viaturaEm(contexto)?.nota).toMatch(/comprimento 95 cm < 120 cm/);
    expect(alcancaCarga(contexto)).toBe(false);
  });

  it("sem ano de matrícula a viatura fica por confirmar, por mais que o resto esteja declarado", () => {
    const contexto = comViatura({ anoMatricula: undefined });
    const viatura = viaturaEm(contexto);
    expect(viatura?.estado).toBe("por-confirmar");
    expect(viatura?.nota).toMatch(/ano da matrícula/);
    expect(viatura?.forca).toBeLessThan(1);
  });

  it("a idade lê-se pela lei da inspeção, e o regime de mercadorias é o mais exigente", () => {
    // DL 144/2017: passageiros passam a anual aos 8 anos; mercadorias aos 2.
    expect(inspecaoJaEAnual(2019, "passageiros", 2026)).toBe(false);
    expect(inspecaoJaEAnual(2017, "passageiros", 2026)).toBe(true);
    expect(inspecaoJaEAnual(2019, "mercadorias", 2026)).toBe(true);
    expect(inspecaoJaEAnual(2025, "mercadorias", 2026)).toBe(false);
    // Sem ano declarado não há resposta — e «não sei» nunca é «não».
    expect(inspecaoJaEAnual(undefined, "mercadorias", 2026)).toBeNull();
    expect(idadeDaViatura(undefined, 2026)).toBeNull();
    expect(idadeDaViatura(2004, 2026)).toBe(22);
  });

  it("uma viatura adequada mas já no regime anual di-lo, com a base legal", () => {
    const contexto = comViatura({ anoMatricula: 2008 });
    const viatura = viaturaEm(contexto);
    expect(viatura?.estado).toBe("adequado");
    expect(viatura?.nota).toMatch(/inspeção já é anual/);
    expect(viatura?.nota).toMatch(/144\/2017/);
  });

  it("circulação limitada em centro urbano limita o meio, e o ecrã diz o mesmo", () => {
    const contexto = comViatura({ restricoesCirculacao: "centro-urbano-limitado" });
    const viatura = viaturaEm(contexto);
    expect(viatura?.estado).toBe("limitado");
    expect(viatura?.forca).toBeLessThan(1);
    expect(
      estadoDaAdequacaoDeclarada("veiculo-carga", {
        ...viaturaCompleta,
        veiculo: {
          ...viaturaCompleta.veiculo,
          restricoesCirculacao: "centro-urbano-limitado",
        },
      }),
    ).toBe("limitado");
  });

  it("a faixa é um rótulo de um intervalo de quilos, não uma medição", () => {
    expect(faixaDaCargaUtil(0)).toBe("muito-reduzida");
    expect(faixaDaCargaUtil(199)).toBe("muito-reduzida");
    expect(faixaDaCargaUtil(200)).toBe("reduzida");
    expect(faixaDaCargaUtil(499)).toBe("reduzida");
    expect(faixaDaCargaUtil(500)).toBe("media");
    expect(faixaDaCargaUtil(1200)).toBe("elevada");
  });

  it("o custo mensal declarado entra na viabilidade; o que falta fica por orçamentar, não a zero", () => {
    const semCusto = descobrir(comViatura({}), { limite: 30 });
    const comCusto = descobrir(
      contextoLogistica({
        detalhesAtivos: {
          "carta-conducao": carta,
          "veiculo-carga": { ...viaturaCompleta, custoMensalEur: 480 },
        },
      }),
      { limite: 30 },
    );

    const daCarga = (resultado: ReturnType<typeof descobrir>) =>
      resultado.candidatos.find((item) =>
        item.capacidadesUsadas.some(
          (capacidade) => capacidade.id === "transporte-carga",
        ),
      );

    const sem = daCarga(semCusto);
    const com = daCarga(comCusto);
    expect(sem).toBeDefined();
    expect(com).toBeDefined();

    expect(
      sem!.viabilidade.limitacoes.some((item) => /por orçamentar/.test(item)),
    ).toBe(true);
    expect(com!.viabilidade.custoMensal?.min).toBeGreaterThanOrEqual(480);
    expect(com!.viabilidade.custoMensal?.proveniencia.origem).toBe("hipotese");
  });
});

describe("descoberta: não ter um meio não quer sempre dizer a mesma coisa", () => {
  const semNada = (): OpportunityContext => ({
    ...CONTEXTO_INICIAL,
    competencias: [{ id: "programacao", nivel: "avancado" }],
  });

  it("um meio comprável em falta fica por adquirir, e não fecha a porta", () => {
    const avaliacao = avaliarRequisitoAtivo(semNada(), {
      qualquerUmDe: ["computador"],
      finalidade: "Computador para o trabalho digital",
    });
    expect(avaliacao.estado).toBe("por-adquirir");
    expect(avaliacao.forca).toBe(0);
    expect(ativoImpedeExecucao(avaliacao)).toBe(false);
    expect(avaliacao.nota).toMatch(/compra/i);
  });

  it("um meio estrutural em falta continua a fechar a porta", () => {
    const avaliacao = avaliarRequisitoAtivo(semNada(), {
      qualquerUmDe: ["cozinha-licenciada"],
      finalidade: "Cozinha licenciada para produção alimentar",
    });
    expect(avaliacao.estado).toBe("em-falta");
    expect(ativoImpedeExecucao(avaliacao)).toBe(true);
  });

  it("um requisito com alternativas vale pela MENOR barreira", () => {
    // Se uma das saídas se compra, a operação não está fechada — está por
    // equipar. Valer pela maior barreira mandaria a pessoa embora por causa
    // da alternativa cara, com a barata ao lado.
    const avaliacao = avaliarRequisitoAtivo(semNada(), {
      qualquerUmDe: ["oficina", "ferramentas"],
      finalidade: "Sítio ou meios para trabalhar",
    });
    expect(avaliacao.estado).toBe("por-adquirir");
    expect(ativoImpedeExecucao(avaliacao)).toBe(false);
  });

  it("declarar que um meio comprável NÃO serve continua a ser um não", () => {
    // Não ter declarado nada e ter declarado que não presta são respostas
    // diferentes. A segunda é uma decisão da pessoa, e respeita-se.
    const contexto: OpportunityContext = {
      ...semNada(),
      ativos: ["computador"],
      detalhesAtivos: { computador: { estado: "precisa-reparacao" } },
    };
    const avaliacao = avaliarRequisitoAtivo(contexto, {
      qualquerUmDe: ["computador"],
      finalidade: "Computador para o trabalho digital",
    });
    expect(avaliacao.estado).toBe("inadequado");
    expect(ativoImpedeExecucao(avaliacao)).toBe(true);
  });

  it("a classificação de barreira cobre todos os meios e erra por excesso de cuidado", () => {
    expect(barreiraDoAtivo("computador")).toBe("aquisivel");
    expect(barreiraDoAtivo("ferramentas")).toBe("aquisivel");
    expect(barreiraDoAtivo("equipamento-tecnico")).toBe("aquisivel");
    expect(barreiraDoAtivo("camara-video")).toBe("aquisivel");
    // Nada que se não compre na semana em que se decide abrir.
    for (const id of [
      "carta-conducao",
      "veiculo-ligeiro",
      "veiculo-carga",
      "cozinha-licenciada",
      "espaco-comercial",
      "armazem",
      "oficina",
      "terreno",
      "stock",
      "carteira-clientes",
    ] as const) {
      expect(barreiraDoAtivo(id)).toBe("estrutural");
    }
  });

  it("a viabilidade nomeia o que falta comprar, e recusa-se a orçá-lo", () => {
    const resultado = descobrir(semNada(), { limite: 20 });
    const candidato = resultado.candidatos[0];
    expect(candidato).toBeDefined();
    const limitacoes = candidato!.viabilidade.limitacoes.join(" ");
    expect(limitacoes).toMatch(/equipamento que ainda não tens/);
    expect(limitacoes).toMatch(/Não o orçamentamos/);
  });
});
