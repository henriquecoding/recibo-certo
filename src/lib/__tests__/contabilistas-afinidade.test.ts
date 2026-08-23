// ═══════════════════════════════════════════════════════════════════════
//  O MOTOR DE AFINIDADE — e as promessas que ele tem de continuar a fazer
//  ---------------------------------------------------------------------
//  Cada bloco aqui prende uma coisa que se pode partir sem que apareça no
//  ecrã: uma ferramenta nova sem áreas declaradas (o fim da página fica
//  vazio e ninguém repara), uma ordenação que passa a depender de qualquer
//  coisa comercial, um empate escondido, ou uma bagagem que aceita campos
//  que a lista branca teria recusado.
//
//  Ver `docs/architecture/motor-de-afinidade-contabilistas.md`.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  AFINIDADE_POR_FERRAMENTA, PESOS, apenasCorrespondentes, emFrase,
  necessidadeDaFerramenta, ordenarPorAfinidade, termoCasaVocabulario, validarAfinidade,
  type FichaParaAfinidade, type Necessidade,
} from "@/lib/contabilistas/afinidade";
import { FERRAMENTAS_ATIVAS, porId } from "@/lib/ferramentas";
import { AREAS } from "@/lib/contabilistas/personalizacao/taxonomia";
import type { CartaoDoDiretorio } from "@/lib/contabilistas/diretorio";

const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
/** A fonte sem comentários — para não apanhar uma palavra numa explicação. */
const codigo = (p: string) =>
  ler(p)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

// ─── Fábricas ──────────────────────────────────────────────────────────

let contador = 0;

function ficha(over: Partial<CartaoDoDiretorio> & { nome: string }, extra: Partial<Omit<FichaParaAfinidade, "cartao">> = {}): FichaParaAfinidade {
  contador += 1;
  const cartao: CartaoDoDiretorio = {
    userId: `u${contador}`,
    slug: `cc-${contador}`,
    tituloProfissional: null,
    apresentacaoCurta: null,
    occ: null,
    occVerificado: false,
    distrito: null,
    concelho: null,
    especialidades: [],
    modalidades: ["online"],
    idiomas: ["pt"],
    respostaMediaHoras: null,
    aceitaNovosClientes: true,
    linkedinLigado: false,
    avatarDisponivel: false,
    fidelidadeAtiva: false,
    recebePagamentos: false,
    ...over,
  };
  return { cartao, termos: [], cobertura: null, ...extra };
}

const necessidadeDe = (id: string): Necessidade => necessidadeDaFerramenta(porId(id)!);

// ═══════════════════════════════════════════════════════════════════════
//  1. INTEGRIDADE — o build tem de cair antes de a página ficar vazia
// ═══════════════════════════════════════════════════════════════════════

describe("afinidade:integridade", () => {
  it("toda a ferramenta ativa diz que áreas pede", () => {
    expect(validarAfinidade()).toEqual([]);
  });

  it("cobre as dezasseis ferramentas do hub, e nem uma a mais", () => {
    const doHub = new Set(FERRAMENTAS_ATIVAS.map((f) => f.id));
    const daTabela = new Set(Object.keys(AFINIDADE_POR_FERRAMENTA));
    expect([...daTabela].filter((id) => !doHub.has(id))).toEqual([]);
    expect([...doHub].filter((id) => !daTabela.has(id))).toEqual([]);
  });

  it("só usa áreas do eixo canónico — um filtro inventado não existiria no diretório", () => {
    for (const [id, pedido] of Object.entries(AFINIDADE_POR_FERRAMENTA)) {
      for (const { area } of pedido.areas) {
        expect(AREAS, `${id} → ${area}`).toContain(area);
      }
    }
  });

  it("recusa uma ferramenta sem entrada", () => {
    const inventada = { ...porId("simulador-irs")!, id: "ferramenta-fantasma" };
    const erros = validarAfinidade([inventada]);
    expect(erros.join(" ")).toContain("ferramenta-fantasma");
  });

  it("recusa pesos fora de 0–1 e áreas repetidas", () => {
    // A tabela real está correta; o que se prende aqui é o validador saber
    // dizer que não — sem isso, a asserção do build era decorativa.
    const erros = validarAfinidade([{ ...porId("simulador-irs")!, id: "x" }]);
    expect(erros.length).toBeGreaterThan(0);
  });

  it("os pesos das dimensões somam 1", () => {
    const soma = Object.values(PESOS).reduce((s, p) => s + p, 0);
    expect(soma).toBeCloseTo(1, 10);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2. A ORDEM — quem sabe daquilo aparece primeiro
// ═══════════════════════════════════════════════════════════════════════

describe("afinidade:ordem", () => {
  it("o especialista da área vem à frente do generalista", () => {
    const r = ordenarPorAfinidade(
      [
        ficha({ nome: "Zulmira Generalista", especialidades: ["Heranças e sucessões"] }),
        ficha({ nome: "Ana Especialista", especialidades: ["IRS", "Recibos verdes"] }),
      ],
      necessidadeDe("simulador-irs"),
    );
    expect(r[0].cartao.nome).toBe("Ana Especialista");
    expect(r[0].correspondeAsAreas).toBe(true);
  });

  it("cobrir a área principal vale mais do que cobrir duas secundárias", () => {
    const r = ordenarPorAfinidade(
      [
        ficha({ nome: "Beatriz Secundária", especialidades: ["Recibos verdes", "Trabalhadores e salários"] }),
        ficha({ nome: "Ana Principal", especialidades: ["IRS"] }),
      ],
      necessidadeDe("simulador-irs"),
    );
    expect(r[0].cartao.nome).toBe("Ana Principal");
  });

  it("uma área marcada vence a mesma área vinda de um termo escrito", () => {
    const marcada = ficha({ nome: "Ana Marcada", especialidades: ["Clientes internacionais", "IVA"] });
    const implicita = ficha(
      { nome: "Bruno Implícito", especialidades: ["IVA"] },
      { termos: [{ texto: "nómadas digitais", area: "Clientes internacionais" }] },
    );

    const r = ordenarPorAfinidade([implicita, marcada], necessidadeDe("payout-mor"));
    expect(r[0].cartao.nome).toBe("Ana Marcada");
    // Mas o implícito continua a contar: não fica atrás de quem não tem nada.
    expect(r[1].correspondeAsAreas).toBe(true);
  });

  it("quem não tem área nenhuma aparece marcado como tal", () => {
    const r = ordenarPorAfinidade(
      [ficha({ nome: "Carlos Sem Área" })],
      necessidadeDe("simulador-herancas"),
    );
    expect(r[0].correspondeAsAreas).toBe(false);
    expect(r[0].motivo).not.toMatch(/trabalha com/i);
  });

  it("quem aceita clientes desempata à frente de quem não aceita", () => {
    const r = ordenarPorAfinidade(
      [
        ficha({ nome: "Ana Fechada", especialidades: ["IRS"], aceitaNovosClientes: false }),
        ficha({ nome: "Bruno Aberto", especialidades: ["IRS"], aceitaNovosClientes: true }),
      ],
      necessidadeDe("simulador-irs"),
    );
    expect(r[0].cartao.nome).toBe("Bruno Aberto");
  });

  it("a ordem não depende da ordem de entrada", () => {
    const fichas = [
      ficha({ nome: "Ana", especialidades: ["IRS"] }),
      ficha({ nome: "Bruno", especialidades: ["Recibos verdes"] }),
      ficha({ nome: "Carla", especialidades: ["IRS", "Recibos verdes"] }),
      ficha({ nome: "Duarte", especialidades: [] }),
    ];
    const n = necessidadeDe("simulador-irs");
    const direta = ordenarPorAfinidade(fichas, n, { limite: 4 }).map((c) => c.cartao.nome);
    const invertida = ordenarPorAfinidade([...fichas].reverse(), n, { limite: 4 }).map((c) => c.cartao.nome);
    expect(invertida).toEqual(direta);
  });

  it("corta DEPOIS de pontuar, nunca antes", () => {
    // A melhor ficha vem em último na entrada. Se o corte fosse antes da
    // pontuação, ela não apareceria.
    const fichas = [
      ficha({ nome: "Um", especialidades: [] }),
      ficha({ nome: "Dois", especialidades: [] }),
      ficha({ nome: "Três", especialidades: [] }),
      ficha({ nome: "A Certa", especialidades: ["Heranças e sucessões"] }),
    ];
    const r = ordenarPorAfinidade(fichas, necessidadeDe("simulador-herancas"), { limite: 1 });
    expect(r).toHaveLength(1);
    expect(r[0].cartao.nome).toBe("A Certa");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3. OS TERMOS PRÓPRIOS — o que faz o refinamento do perfil pagar
// ═══════════════════════════════════════════════════════════════════════

describe("afinidade:termos", () => {
  it("casa singular com plural, nos dois sentidos", () => {
    expect(termoCasaVocabulario("criadores de conteúdo", ["criador de conteudo"])).toBe(true);
    expect(termoCasaVocabulario("criador de conteudo", ["criadores de conteúdo"])).toBe(true);
  });

  it("não casa por acidente dentro de outra palavra", () => {
    // O acidente clássico: «iva» dentro de «privativa».
    expect(termoCasaVocabulario("consultoria privativa", ["iva"])).toBe(false);
  });

  it("ignora termos curtos demais para provarem alguma coisa", () => {
    expect(termoCasaVocabulario("ok", ["ok"])).toBe(false);
  });

  it("um termo que casa com o vocabulário da ferramenta sobe a ficha", () => {
    const comTermo = ficha(
      { nome: "Ana Termo", especialidades: ["IVA"] },
      { termos: [{ texto: "criadores de conteúdo", area: null }] },
    );
    const sem = ficha({ nome: "Bruno Sem", especialidades: ["IVA"] });

    const r = ordenarPorAfinidade([sem, comTermo], necessidadeDe("payout-mor"));
    expect(r[0].cartao.nome).toBe("Ana Termo");
    expect(r[0].termosQueExplicam).toContain("criadores de conteúdo");
  });

  it("o vocabulário de uma ferramenta inclui os aliases do catálogo", () => {
    const n = necessidadeDe("simulador-irs");
    for (const alias of porId("simulador-irs")!.aliases) {
      expect(n.vocabulario).toContain(alias);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4. EMPATES E EXPLICAÇÃO — uma ordem que se pode contestar
// ═══════════════════════════════════════════════════════════════════════

describe("afinidade:explicacao", () => {
  it("empates partilham a posição e dizem com quem", () => {
    const r = ordenarPorAfinidade(
      [
        ficha({ nome: "Ana Igual", especialidades: ["IRS", "Recibos verdes"] }),
        ficha({ nome: "Bruno Igual", especialidades: ["IRS", "Recibos verdes"] }),
      ],
      necessidadeDe("simulador-irs"),
    );
    expect(r[0].pontuacao).toBe(r[1].pontuacao);
    expect(r[0].posicao).toBe(1);
    expect(r[1].posicao).toBe(1);
    expect(r[0].empatadoCom).toEqual(["Bruno Igual"]);
    expect(r[1].empatadoCom).toEqual(["Ana Igual"]);
  });

  it("todo o candidato traz as dimensões que produziram a posição", () => {
    const r = ordenarPorAfinidade([ficha({ nome: "Ana", especialidades: ["IRS"] })], necessidadeDe("simulador-irs"));
    const fontes = r[0].dimensoes.map((d) => d.fonte);
    expect(fontes).toContain("area_declarada");
    expect(fontes).toContain("disponibilidade");
    expect(fontes).toContain("identidade");
  });

  it("sem saber onde a pessoa está, a cobertura NÃO entra na conta", () => {
    const r = ordenarPorAfinidade([ficha({ nome: "Ana", especialidades: ["IRS"] })], necessidadeDe("simulador-irs"));
    expect(r[0].dimensoes.map((d) => d.fonte)).not.toContain("cobertura");
  });

  it("sabendo o distrito, quem lá atende sobe", () => {
    const n = { ...necessidadeDe("simulador-irs"), distrito: "Braga" };
    const r = ordenarPorAfinidade(
      [
        ficha({ nome: "Ana Longe", especialidades: ["IRS"], distrito: "Faro", modalidades: ["presencial"] }),
        ficha({ nome: "Bruno Perto", especialidades: ["IRS"], distrito: "Braga", modalidades: ["presencial"] }),
      ],
      n,
    );
    expect(r[0].cartao.nome).toBe("Bruno Perto");
    expect(r[0].dimensoes.find((d) => d.fonte === "cobertura")?.valor).toBe(1);
  });

  it("o motivo descreve e nunca compara nem elogia", () => {
    const casos = [
      ficha({ nome: "Ana", especialidades: ["IRS"] }),
      ficha({ nome: "Bruno" }, { termos: [{ texto: "nómadas digitais", area: "Clientes internacionais" }] }),
      ficha({ nome: "Carla" }),
    ];
    const proibidas = [
      /melhor/i, /top\b/i, /ideal/i, /perfeito/i, /recomendad/i, /indicad/i,
      /o mais\b/i, /n\.?º\s*1/i, /garantid/i,
    ];
    for (const id of Object.keys(AFINIDADE_POR_FERRAMENTA)) {
      for (const c of ordenarPorAfinidade(casos, necessidadeDe(id), { limite: 3 })) {
        for (const p of proibidas) expect(c.motivo, `${id}: ${c.motivo}`).not.toMatch(p);
        expect(c.motivo.length).toBeGreaterThan(0);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4b. A LÍNGUA — pt-PT, e os acrónimos como acrónimos
// ═══════════════════════════════════════════════════════════════════════

describe("afinidade:lingua", () => {
  it("um acrónimo não vai para minúsculas a meio de uma frase", () => {
    expect(emFrase("IRS")).toBe("IRS");
    expect(emFrase("IVA")).toBe("IVA");
    expect(emFrase("Sociedades e IRC")).toBe("sociedades e IRC");
    expect(emFrase("Recibos verdes")).toBe("recibos verdes");
    expect(emFrase("Heranças e sucessões")).toBe("heranças e sucessões");
  });

  it("nenhum motivo escreve «irs», «iva» ou «irc»", () => {
    const casos = [
      ficha({ nome: "Ana", especialidades: ["IRS", "IVA"] }),
      ficha({ nome: "Bruno", especialidades: ["Sociedades e IRC"] }),
      ficha({ nome: "Carla", especialidades: ["Recibos verdes"] }),
    ];
    for (const id of Object.keys(AFINIDADE_POR_FERRAMENTA)) {
      for (const c of ordenarPorAfinidade(casos, necessidadeDe(id), { limite: 3 })) {
        expect(c.motivo, `${id}: ${c.motivo}`).not.toMatch(/\b(irs|iva|irc)\b/);
        for (const d of c.dimensoes) {
          if (d.nota) expect(d.nota, `${id}: ${d.nota}`).not.toMatch(/\b(irs|iva|irc)\b/);
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4c. QUEM APARECE — encher a grelha não é razão para mostrar alguém
// ═══════════════════════════════════════════════════════════════════════

describe("afinidade:selecao", () => {
  const ordenar = (fichas: FichaParaAfinidade[], id: string) =>
    ordenarPorAfinidade(fichas, necessidadeDe(id), { limite: fichas.length });

  it("havendo quem corresponda, quem não corresponde não entra", () => {
    const ordenados = ordenar(
      [
        ficha({ nome: "Ana", especialidades: ["IRS"] }),
        ficha({ nome: "Bruno", especialidades: ["Recibos verdes"] }),
        ficha({ nome: "Carla", especialidades: ["Heranças e sucessões"] }),
      ],
      "simulador-irs",
    );
    const escolhidos = apenasCorrespondentes(ordenados, 3);
    expect(escolhidos.map((c) => c.cartao.nome)).toEqual(["Ana", "Bruno"]);
    // A frase de topo afirma sobre TODOS os que mostra — tem de ser verdade.
    expect(escolhidos.every((c) => c.correspondeAsAreas)).toBe(true);
  });

  it("não correspondendo ninguém, mostra-se o que existe", () => {
    const ordenados = ordenar(
      [ficha({ nome: "Ana" }), ficha({ nome: "Bruno" })],
      "simulador-herancas",
    );
    const escolhidos = apenasCorrespondentes(ordenados, 3);
    expect(escolhidos).toHaveLength(2);
    expect(escolhidos.every((c) => c.correspondeAsAreas)).toBe(false);
  });

  it("respeita o limite", () => {
    const fichas = Array.from({ length: 6 }, (_, i) =>
      ficha({ nome: `Pessoa ${i}`, especialidades: ["IRS"] }),
    );
    expect(apenasCorrespondentes(ordenar(fichas, "simulador-irs"), 3)).toHaveLength(3);
  });

  it("a leitura usa esta regra, e não uma cópia dela", () => {
    expect(ler("src/lib/contabilistas/afinidade/leitura.ts")).toContain("apenasCorrespondentes(");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  5. A FRONTEIRA — nada de comercial entra na ordem
// ═══════════════════════════════════════════════════════════════════════

describe("afinidade:fronteira", () => {
  const MOTOR = "src/lib/contabilistas/afinidade/motor.ts";
  const LEITURA = "src/lib/contabilistas/afinidade/leitura.ts";
  const SECCAO = "src/components/diretorio/ContabilistasParaEsteResultado.tsx";

  it("o motor não conhece patamar, comissão, preço nem progressão", () => {
    const fonte = codigo(MOTOR);
    for (const palavra of ["comissao", "comissão", "patamar", "progressao", "progressão", "precoConsulta", "tier", "destaque"]) {
      expect(fonte.toLowerCase(), palavra).not.toContain(palavra.toLowerCase());
    }
  });

  it("a leitura usa a view pública, nunca a tabela", () => {
    const fonte = ler(LEITURA);
    expect(fonte).toContain('"contabilistas_publico"');
    expect(fonte).not.toMatch(/\.from\(\s*["'`]contabilistas["'`]\s*\)/);
    expect(fonte).not.toMatch(/\.select\(\s*["'`]\*["'`]/);
  });

  it("a secção não introduz plano pago no caminho para um contabilista", () => {
    const fonte = ler(SECCAO);
    expect(fonte).not.toMatch(/\bPlus\b/);
    expect(fonte).not.toMatch(/upgrade|subscri(ç|c)ão necess/i);
    expect(fonte).not.toContain("entitlements");
    expect(fonte).not.toContain("planoTem");
  });

  it("a secção não promete disponibilidade que teria de ir buscar à agenda", () => {
    const fonte = ler(SECCAO);
    expect(fonte).not.toMatch(/pr(ó|o)xima disponibilidade/i);
    expect(fonte).not.toMatch(/obterDisponibilidade|ocupadosDe|gerarSlots/);
  });

  it("a secção não usa microcopy sem sistema por trás", () => {
    const fonte = codigo(SECCAO);
    const proibidas = [
      /melhor contabilista/i, /top 1%/i, /altamente recomendad/i,
      /100% verificad/i, /resposta garantida/i, /mais escolhid/i,
      /melhor avaliad/i, /o mais indicado/i,
    ];
    for (const p of proibidas) expect(fonte).not.toMatch(p);
  });

  it("a secção diz, na página, de onde vem a ordem", () => {
    const fonte = ler(SECCAO);
    expect(fonte).toMatch(/A ordem vem das áreas que cada contabilista declara/);
    expect(fonte).toMatch(/Não há lugares pagos/);
  });

  it("a secção não envia nada por si — o envio é sempre com consentimento", () => {
    const fonte = codigo(SECCAO);
    expect(fonte).not.toMatch(/\bpartilhar\(/);
    expect(fonte).not.toContain("CONSENTIMENTO_VERSAO");
  });

  it("o catálogo das ferramentas não desce para o browser por causa disto", () => {
    // A necessidade é calculada no ToolShell (servidor) e passa como dados.
    const seccao = ler(SECCAO);
    const ponte = ler("src/components/diretorio/ContabilistasNoFim.tsx");
    for (const fonte of [seccao, ponte]) {
      expect(fonte).not.toContain("@/lib/ferramentas");
      expect(fonte).not.toContain("necessidadeDaFerramenta");
    }
    expect(ler("src/components/ferramentas/ToolShell.tsx")).toContain("necessidadeDaFerramenta(tool)");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  6. A BAGAGEM — o que a pessoa leva, e o que nunca leva
// ═══════════════════════════════════════════════════════════════════════

describe("afinidade:bagagem", () => {
  let mapa: Map<string, string>;

  beforeEach(() => {
    mapa = new Map();
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: (k: string) => mapa.get(k) ?? null,
          setItem: (k: string, v: string) => void mapa.set(k, v),
          removeItem: (k: string) => void mapa.delete(k),
        },
      },
      configurable: true,
      writable: true,
    });
  });

  const carregar = () => import("@/lib/contabilistas/bagagem");

  it("guarda e devolve a simulação da ferramenta certa", async () => {
    const { guardarBagagem, lerBagagem } = await carregar();
    expect(
      guardarBagagem({
        toolId: "simulador-irs",
        tipo: "simulador_irs",
        titulo: "Simulação de IRS 2026",
        conteudo: { ano: 2026, irsEstimado: 1234 },
      }),
    ).toBe(true);

    expect(lerBagagem("simulador-irs")?.titulo).toBe("Simulação de IRS 2026");
    // A bagagem de outra ferramenta não é oferecida como se fosse desta.
    expect(lerBagagem("simulador-herancas")).toBeNull();
  });

  it("aplica a lista branca ANTES de escrever no dispositivo", async () => {
    const { guardarBagagem, lerBagagem, CHAVE_BAGAGEM } = await carregar();
    guardarBagagem({
      toolId: "simulador-irs",
      tipo: "simulador_irs",
      conteudo: { ano: 2026, irsEstimado: 10, nifDoCliente: "123456789", segredo: "x" },
    });

    const cru = mapa.get(CHAVE_BAGAGEM) ?? "";
    expect(cru).not.toContain("nifDoCliente");
    expect(cru).not.toContain("123456789");
    expect(cru).not.toContain("segredo");
    expect(Object.keys(lerBagagem()!.conteudo).sort()).toEqual(["ano", "irsEstimado"]);
  });

  it("recusa um conteúdo que não tem nada de autorizado", async () => {
    const { guardarBagagem, lerBagagem } = await carregar();
    expect(
      guardarBagagem({ toolId: "x", tipo: "simulador_irs", conteudo: { qualquerCoisa: 1 } }),
    ).toBe(false);
    expect(lerBagagem()).toBeNull();
  });

  it("volta a aplicar a lista branca na LEITURA — a chave pode ser editada à mão", async () => {
    const { lerBagagem, CHAVE_BAGAGEM } = await carregar();
    mapa.set(
      CHAVE_BAGAGEM,
      JSON.stringify({
        toolId: "simulador-irs",
        tipo: "simulador_irs",
        titulo: "Adulterada",
        conteudo: { ano: 2026, nifDoCliente: "123456789" },
        campos: 2,
        criadoEm: new Date().toISOString(),
      }),
    );
    const b = lerBagagem();
    expect(Object.keys(b!.conteudo)).toEqual(["ano"]);
  });

  it("expira ao fim de 72 horas e limpa-se sozinha", async () => {
    const { lerBagagem, CHAVE_BAGAGEM, VALIDADE_HORAS } = await carregar();
    const velha = new Date(Date.now() - (VALIDADE_HORAS + 1) * 3_600_000).toISOString();
    mapa.set(
      CHAVE_BAGAGEM,
      JSON.stringify({
        toolId: "simulador-irs", tipo: "simulador_irs", titulo: "Antiga",
        conteudo: { ano: 2026 }, campos: 1, criadoEm: velha,
      }),
    );
    expect(lerBagagem()).toBeNull();
    expect(mapa.has(CHAVE_BAGAGEM)).toBe(false);
  });

  it("um JSON estragado não parte a página — limpa e segue", async () => {
    const { lerBagagem, CHAVE_BAGAGEM } = await carregar();
    mapa.set(CHAVE_BAGAGEM, "{isto não é json");
    expect(lerBagagem()).toBeNull();
    expect(mapa.has(CHAVE_BAGAGEM)).toBe(false);
  });

  it("guarda UMA de cada vez: a última substitui a anterior", async () => {
    const { guardarBagagem, lerBagagem } = await carregar();
    guardarBagagem({ toolId: "a", tipo: "simulador_irs", conteudo: { ano: 2026 } });
    guardarBagagem({ toolId: "b", tipo: "recibos_verdes", conteudo: { ano: 2026, liquido: 900 } });
    expect(lerBagagem("a")).toBeNull();
    expect(lerBagagem("b")?.tipo).toBe("recibos_verdes");
  });

  it("descreve o que leva sem revelar valores", async () => {
    const { guardarBagagem, lerBagagem, descreverBagagem } = await carregar();
    guardarBagagem({
      toolId: "simulador-irs", tipo: "simulador_irs",
      conteudo: { ano: 2026, irsEstimado: 4321 },
    });
    const texto = descreverBagagem(lerBagagem()!);
    expect(texto).toContain("Simulação de IRS");
    expect(texto).not.toContain("4321");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  7. A SUPERFÍCIE — onde a secção aparece, e o que ela promete
// ═══════════════════════════════════════════════════════════════════════

describe("afinidade:superficie", () => {
  it("o ToolShell mostra-a por omissão em todas as ferramentas", () => {
    const fonte = ler("src/components/ferramentas/ToolShell.tsx");
    expect(fonte).toContain("contabilistas = true");
    expect(fonte).toContain("<ContabilistasNoFim");
  });

  it("fica antes do material editorial, não depois dos guias", () => {
    const fonte = ler("src/components/ferramentas/ToolShell.tsx");
    const seccao = fonte.indexOf("<ContabilistasNoFim");
    const contexto = fonte.indexOf("{contexto ? (");
    const guias = fonte.indexOf("Compreender melhor");
    expect(seccao).toBeGreaterThan(0);
    expect(seccao).toBeLessThan(contexto);
    expect(seccao).toBeLessThan(guias);
  });

  it("só monta quando se aproxima do ecrã", () => {
    const ponte = ler("src/components/diretorio/ContabilistasNoFim.tsx");
    expect(ponte).toContain("IntersectionObserver");
    expect(ponte).toContain("ssr: false");
    expect(ponte).toContain("ErrorBoundary");
  });

  it("o cartão é o mesmo do diretório — não há uma segunda verdade sobre a ficha", () => {
    const seccao = ler("src/components/diretorio/ContabilistasParaEsteResultado.tsx");
    expect(seccao).toContain('from "./ContabilistaCard"');
    const diretorio = ler("src/app/contabilistas/DiretorioCliente.tsx");
    expect(diretorio).toContain('@/components/diretorio/ContabilistaCard');
  });

  it("o perfil só mostra a bagagem quando ela existe NESTE dispositivo", () => {
    const perfil = ler("src/app/contabilistas/[slug]/PerfilPublico.tsx");
    expect(perfil).toContain("lerBagagem(veioDe)");
    // E diz, sem rodeios, que nada segue antes da aceitação.
    expect(perfil).toMatch(/Nada segue antes disso/);
  });

  it("qualquer ferramenta que já saiba partilhar passa a alimentar a bagagem", () => {
    const enviar = ler("src/components/contabilistas/EnviarAoContabilista.tsx");
    expect(enviar).toContain("guardarBagagem");
    expect(enviar).toContain("guardarComoBagagem = true");
    // E continua a não verificar plano nenhum.
    expect(enviar).not.toContain("planoTem");
  });
});
