import { describe, expect, it } from "vitest";
import {
  filtrarPorTexto, ordenarClientes, resumirClientes, type ResumoCliente,
} from "@/lib/contabilistas/resumo";
import type { Agendamento, Partilha, Vinculo } from "@/lib/contabilistas/tipos";

const AGORA = new Date("2026-08-13T12:00:00Z");

const vinculo = (id: string, over: Partial<Vinculo> = {}): Vinculo => ({
  id: `v-${id}`,
  contabilistaId: "cc",
  clienteId: id,
  estado: "ativo",
  criadoEm: "2026-01-01T00:00:00Z",
  origem: "cliente",
  nomeCliente: null,
  mensagem: null,
  ...over,
});

const consulta = (cliente: string, inicio: string, estado: Agendamento["estado"]): Agendamento => ({
  id: `${cliente}-${inicio}`,
  contabilistaId: "cc",
  clienteId: cliente,
  inicio,
  fim: inicio,
  estado,
  modalidade: "online",
  assunto: null,
  localOuLigacao: null, localLat: null, localLng: null,
  criadoEm: inicio,
});

const envio = (cliente: string, estado: Partilha["estado"]): Partilha => ({
  id: `${cliente}-${estado}-${Math.random()}`,
  contabilistaId: "cc",
  clienteId: cliente,
  tipo: "simulador_irs",
  titulo: "t",
  conteudo: {},
  estado,
  nota: null,
  consentimentoVersao: "2026-08-1",
  criadoEm: "2026-05-01T00:00:00Z",
});

describe("resumo: o que cada linha da lista diz", () => {
  it("conta só as consultas realizadas", () => {
    const [r] = resumirClientes({
      vinculos: [vinculo("a")],
      agendamentos: [
        consulta("a", "2026-03-01T09:00:00Z", "realizada"),
        consulta("a", "2026-04-01T09:00:00Z", "realizada"),
        consulta("a", "2026-05-01T09:00:00Z", "cancelado_cliente"),
        consulta("a", "2026-06-01T09:00:00Z", "nao_compareceu"),
      ],
      partilhas: [], cartoes: {}, agora: AGORA,
    });
    expect(r.consultasRealizadas).toBe(2);
  });

  it("«última consulta» é a mais recente realizada, e ignora as canceladas", () => {
    const [r] = resumirClientes({
      vinculos: [vinculo("a")],
      agendamentos: [
        consulta("a", "2026-03-01T09:00:00Z", "realizada"),
        // Mais recente, mas desmarcada: dizer «última consulta em julho»
        // seria afirmar um contacto que não houve.
        consulta("a", "2026-07-01T09:00:00Z", "cancelado_contabilista"),
      ],
      partilhas: [], cartoes: {}, agora: AGORA,
    });
    expect(r.ultima).toBe("2026-03-01T09:00:00Z");
  });

  it("«próxima» é a mais próxima ainda por acontecer", () => {
    const [r] = resumirClientes({
      vinculos: [vinculo("a")],
      agendamentos: [
        consulta("a", "2026-09-10T09:00:00Z", "confirmado"),
        consulta("a", "2026-08-20T09:00:00Z", "pedido"),
        consulta("a", "2026-08-01T09:00:00Z", "confirmado"),
      ],
      partilhas: [], cartoes: {}, agora: AGORA,
    });
    expect(r.proxima, "a de agosto 1 já passou").toBe("2026-08-20T09:00:00Z");
  });

  it("sem consultas, as duas datas são nulas — não zero nem hoje", () => {
    const [r] = resumirClientes({
      vinculos: [vinculo("a")], agendamentos: [], partilhas: [], cartoes: {}, agora: AGORA,
    });
    expect(r.ultima).toBeNull();
    expect(r.proxima).toBeNull();
  });

  it("não conta partilhas revogadas", () => {
    const [r] = resumirClientes({
      vinculos: [vinculo("a")],
      agendamentos: [],
      partilhas: [envio("a", "enviada"), envio("a", "vista"), envio("a", "revogada")],
      cartoes: {}, agora: AGORA,
    });
    expect(r.partilhas, "a revogada já não abre").toBe(2);
    expect(r.partilhasPorLer).toBe(1);
  });

  it("não mistura os dados de dois clientes", () => {
    const rs = resumirClientes({
      vinculos: [vinculo("a"), vinculo("b")],
      agendamentos: [
        consulta("a", "2026-03-01T09:00:00Z", "realizada"),
        consulta("b", "2026-03-02T09:00:00Z", "realizada"),
        consulta("b", "2026-03-03T09:00:00Z", "realizada"),
      ],
      partilhas: [envio("b", "enviada")],
      cartoes: { b: { carimbos: 2, meta: 5, descontoPct: 20, precoBaseCents: 12000 } },
      agora: AGORA,
    });
    expect(rs[0].consultasRealizadas).toBe(1);
    expect(rs[1].consultasRealizadas).toBe(2);
    expect(rs[0].cartao).toBeNull();
    expect(rs[1].cartao?.carimbos).toBe(2);
  });

  it("usa o tratamento já resolvido", () => {
    const rs = resumirClientes({
      vinculos: [
        vinculo("4f2a1111-0000-0000-0000-000000000000"),
        vinculo("b", { nomeCliente: "Bruno Costa" }),
      ],
      agendamentos: [], partilhas: [], cartoes: {}, agora: AGORA,
    });
    expect(rs[0].tratamento).toBe("Cliente 4F2A");
    expect(rs[1].tratamento).toBe("Bruno Costa");
  });
});

describe("resumo: ordenação", () => {
  const base = (): ResumoCliente[] => [
    { vinculo: vinculo("a", { nomeCliente: "Carla" }), tratamento: "Carla",
      consultasRealizadas: 1, proxima: null, ultima: "2026-03-01T00:00:00Z",
      partilhas: 5, partilhasPorLer: 0, cartao: null },
    { vinculo: vinculo("b", { nomeCliente: "ana" }), tratamento: "ana",
      consultasRealizadas: 0, proxima: "2026-09-01T00:00:00Z", ultima: null,
      partilhas: 2, partilhasPorLer: 1, cartao: null },
    { vinculo: vinculo("c", { nomeCliente: "Bruno" }), tratamento: "Bruno",
      consultasRealizadas: 3, proxima: "2026-08-20T00:00:00Z", ultima: "2026-07-01T00:00:00Z",
      partilhas: 9, partilhasPorLer: 2, cartao: null },
  ];

  it("ordena por nome ignorando maiúsculas e acentos", () => {
    expect(ordenarClientes(base(), "nome", "asc").map((r) => r.tratamento))
      .toEqual(["ana", "Bruno", "Carla"]);
    expect(ordenarClientes(base(), "nome", "desc").map((r) => r.tratamento))
      .toEqual(["Carla", "Bruno", "ana"]);
  });

  it("ordena por número de envios", () => {
    expect(ordenarClientes(base(), "envios", "desc").map((r) => r.partilhas))
      .toEqual([9, 5, 2]);
  });

  it("põe as datas em falta no fim, nos DOIS sentidos", () => {
    // Quem nunca teve consulta não é «o mais antigo». É alguém sobre quem
    // não há essa informação, e no topo responderia à pergunta errada.
    for (const sentido of ["asc", "desc"] as const) {
      const r = ordenarClientes(base(), "ultima", sentido);
      expect(r[r.length - 1].ultima, sentido).toBeNull();
    }
  });

  it("não altera a lista de origem", () => {
    const original = base();
    const copia = original.map((r) => r.tratamento);
    ordenarClientes(original, "nome", "desc");
    expect(original.map((r) => r.tratamento)).toEqual(copia);
  });
});

describe("resumo: procura", () => {
  const lista: ResumoCliente[] = [
    { vinculo: vinculo("a", { nomeCliente: "João Gonçalves", mensagem: "IVA intracomunitário" }),
      tratamento: "João Gonçalves", consultasRealizadas: 0, proxima: null, ultima: null,
      partilhas: 0, partilhasPorLer: 0, cartao: null },
    { vinculo: vinculo("4f2a0000-0000-0000-0000-000000000000"),
      tratamento: "Cliente 4F2A", consultasRealizadas: 0, proxima: null, ultima: null,
      partilhas: 0, partilhasPorLer: 0, cartao: null },
  ];

  it("encontra sem acentos e sem maiúsculas", () => {
    for (const q of ["joao", "JOÃO", "goncalves", "  Gonçalves "]) {
      expect(filtrarPorTexto(lista, q).map((r) => r.tratamento), q).toEqual(["João Gonçalves"]);
    }
  });

  it("encontra pelo recado que o cliente escreveu", () => {
    expect(filtrarPorTexto(lista, "intracomunitário").length).toBe(1);
  });

  // Este teste procurava pelo email, e passava. Passar a não haver nada
  // para encontrar é a alteração, não um teste que se perdeu: desde a
  // migração da fronteira de contacto o vínculo não guarda contacto nenhum, e a busca do painel
  // deixou de ter por onde o procurar.
  it("não tem por onde procurar um contacto", () => {
    for (const q of ["joao@", "@exemplo.pt", "912345678"]) {
      expect(filtrarPorTexto(lista, q), q).toEqual([]);
    }
  });

  it("encontra pelo identificador de quem não deu nome", () => {
    expect(filtrarPorTexto(lista, "4f2a").map((r) => r.tratamento)).toEqual(["Cliente 4F2A"]);
  });

  it("procura vazia devolve tudo", () => {
    expect(filtrarPorTexto(lista, "   ").length).toBe(2);
  });
});
