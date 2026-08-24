// ═══════════════════════════════════════════════════════════════════════
//  A PONTE DESCOBERTA → ESTÚDIO — o que a auditoria de agosto encontrou
//  ---------------------------------------------------------------------
//  O dossier só oferecia continuidade para o estúdio quando a hipótese
//  coincidia com um dos 24 dossiers curados: a ponte era um `?o=<id do
//  catálogo>` e uma composição gerada não tem id de catálogo nenhum. As
//  hipóteses que o motor existe para compor eram exatamente as que
//  acabavam num beco.
//
//  Estes testes fixam o contrato da ponte que as leva: o que ela aceita,
//  o que recusa inteiro, e as três propriedades que a tornam uma ponte e
//  não uma cópia esquecida no browser — versão, prazo e consumo único.
// ═══════════════════════════════════════════════════════════════════════

import { beforeEach, describe, expect, it } from "vitest";
import { CENARIOS_INICIAIS } from "@/lib/pricing/tipos";

describe("ponte:descoberta→estúdio", () => {
  let mapa: Map<string, string>;

  beforeEach(() => {
    mapa = new Map();
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: (k: string) => mapa.get(k) ?? null,
          setItem: (k: string, v: string) => void mapa.set(k, v),
          removeItem: (k: string) => void mapa.delete(k),
          clear: () => mapa.clear(),
          key: (i: number) => [...mapa.keys()][i] ?? null,
          get length() {
            return mapa.size;
          },
        },
      },
      configurable: true,
      writable: true,
    });
  });

  const carregar = async () => import("@/lib/store/handoff-descoberta-negocio");

  it("grava, espreita e consome uma só vez", async () => {
    const { guardarSementeOportunidade, espreitarSementeOportunidade, consumirSementeOportunidade } =
      await carregar();

    expect(guardarSementeOportunidade({ cenario: "servico", nome: "Operações locais" })).toBe(true);
    // Espreitar não consome.
    expect(espreitarSementeOportunidade()?.nome).toBe("Operações locais");
    expect(espreitarSementeOportunidade()).toBeTruthy();
    // Consumir consome.
    expect(consumirSementeOportunidade()?.cenario).toBe("servico");
    expect(espreitarSementeOportunidade()).toBeNull();
  });

  it("uma semente fora do prazo é recusada", async () => {
    const { guardarSementeOportunidade, espreitarSementeOportunidade, SEMENTE_TTL_MS } = await carregar();
    guardarSementeOportunidade({ cenario: "projeto", nome: "Auditorias de eficiência" });

    const chave = [...mapa.keys()][0]!;
    const env = JSON.parse(mapa.get(chave)!);
    env.gravadoEm = Date.now() - SEMENTE_TTL_MS - 1_000;
    mapa.set(chave, JSON.stringify(env));

    expect(espreitarSementeOportunidade()).toBeNull();
  });

  it("um relógio trocado não abre a ponte para trás", async () => {
    const { guardarSementeOportunidade, espreitarSementeOportunidade } = await carregar();
    guardarSementeOportunidade({ cenario: "servico", nome: "Serviço" });

    const chave = [...mapa.keys()][0]!;
    const env = JSON.parse(mapa.get(chave)!);
    env.gravadoEm = Date.now() + 60_000;
    mapa.set(chave, JSON.stringify(env));

    expect(espreitarSementeOportunidade()).toBeNull();
  });

  it("um payload ilegível não rebenta o estúdio", async () => {
    const { guardarSementeOportunidade, espreitarSementeOportunidade } = await carregar();
    guardarSementeOportunidade({ cenario: "servico", nome: "Serviço" });
    const chave = [...mapa.keys()][0]!;

    for (const lixo of ["{", "null", "[]", '{"versao":99}', '{"versao":1,"gravadoEm":"ontem"}']) {
      mapa.set(chave, lixo);
      expect(() => espreitarSementeOportunidade()).not.toThrow();
      expect(espreitarSementeOportunidade()).toBeNull();
    }
  });

  it("consumir apaga mesmo quando o que lá está não passa a validação", async () => {
    const { guardarSementeOportunidade, consumirSementeOportunidade, espreitarSementeOportunidade } =
      await carregar();
    guardarSementeOportunidade({ cenario: "servico", nome: "Serviço" });
    const chave = [...mapa.keys()][0]!;
    mapa.set(chave, '{"versao":99}');

    expect(consumirSementeOportunidade()).toBeNull();
    expect(mapa.has(chave)).toBe(false);
    expect(espreitarSementeOportunidade()).toBeNull();
  });

  // ── A normalização: aceita o que reconhece, recusa o resto INTEIRO ──
  it("meia semente é recusada — nunca completada por omissão", async () => {
    const { normalizarSemente } = await carregar();

    expect(normalizarSemente({ nome: "Sem cenário" })).toBeNull();
    expect(normalizarSemente({ cenario: "servico" })).toBeNull();
    expect(normalizarSemente({ cenario: "inventado", nome: "Nome" })).toBeNull();
    expect(normalizarSemente({ cenario: "servico", nome: "   " })).toBeNull();
    expect(normalizarSemente({ cenario: "servico", nome: "x".repeat(200) })).toBeNull();
    expect(normalizarSemente(null)).toBeNull();
    expect(normalizarSemente("servico")).toBeNull();
  });

  it("o nome viaja aparado e o cenário tem de existir na engine de preço", async () => {
    const { guardarSementeOportunidade, consumirSementeOportunidade } = await carregar();

    expect(guardarSementeOportunidade({ cenario: "servico", nome: "  Limpezas pós-estadia  " })).toBe(true);
    expect(consumirSementeOportunidade()?.nome).toBe("Limpezas pós-estadia");

    // Um cenário que a pricing engine não conhece não chega a ser gravado:
    // o estúdio abriria uma oferta com um cenário por omissão e ela pareceria
    // ter vindo do motor.
    expect(
      guardarSementeOportunidade({ cenario: "nao_existe" as (typeof CENARIOS_INICIAIS)[number], nome: "X" }),
    ).toBe(false);
    expect(consumirSementeOportunidade()).toBeNull();
  });

  it("um nome vazio não abre ponte nenhuma", async () => {
    const { guardarSementeOportunidade, espreitarSementeOportunidade } = await carregar();
    expect(guardarSementeOportunidade({ cenario: "servico", nome: "   " })).toBe(false);
    expect(espreitarSementeOportunidade()).toBeNull();
  });
});
