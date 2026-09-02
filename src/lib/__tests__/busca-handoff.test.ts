import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { construirDocumentos } from "@/lib/busca/documentos";
import { CATALOGO_FERRAMENTAS } from "@/lib/ferramentas";
import {
  PARAM_HANDOFF,
  TTL_HANDOFF_MS,
  consumirHandoff,
  guardarHandoff,
  hrefComHandoff,
} from "@/lib/busca/handoff";

// ═══════════════════════════════════════════════════════════════════════
//  O CONTEXTO ATRAVESSA UMA NAVEGAÇÃO — E NÃO ATRAVESSA MAIS NADA
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O QUE ESTES TESTES EXISTEM PARA TORNAR IMPOSSÍVEL                    │
//  │                                                                     │
//  │ `?valor=1200` é a solução óbvia e cria quatro fugas de uma vez: o    │
//  │ histórico do browser, o `Referer` para terceiros, os logs de acesso  │
//  │ e o `page_view` de qualquer biblioteca de analytics — que regista o  │
//  │ caminho COM a query. Nenhuma delas se corrige depois de acontecer.   │
//  │                                                                     │
//  │ A regra é simples de dizer e fácil de violar por acidente numa       │
//  │ correcção apressada: no endereço viaja um identificador opaco, e o   │
//  │ rendimento fica no separador. Estes testes são o que reprova essa    │
//  │ correcção.                                                          │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

const DESTINO = "ferramenta:recibos-verdes";

describe("busca:handoff", () => {
  let mapa: Map<string, string>;

  beforeEach(() => {
    mapa = new Map();
    Object.defineProperty(globalThis, "window", {
      value: {
        sessionStorage: {
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

  it("guarda e devolve o que foi guardado", () => {
    const id = guardarHandoff(DESTINO, { valor: 1200, periodicidade: "mes" });
    expect(id).toBeTruthy();

    const lido = consumirHandoff(DESTINO, id, ["valor", "periodicidade"]);
    expect(lido).toEqual({ valor: 1200, periodicidade: "mes" });
  });

  it("consome UMA vez — voltar atrás não repõe o valor", () => {
    // Um valor que reaparece ao carregar em «voltar» é pior do que não
    // aparecer: sobrepõe-se ao que a pessoa entretanto corrigiu.
    const id = guardarHandoff(DESTINO, { valor: 1200 });
    expect(consumirHandoff(DESTINO, id, ["valor"])).toEqual({ valor: 1200 });
    expect(consumirHandoff(DESTINO, id, ["valor"])).toBeNull();
  });

  it("recusa um contexto criado para outro destino", () => {
    const id = guardarHandoff(DESTINO, { valor: 1200 });
    expect(consumirHandoff("ferramenta:comparar-regimes", id, ["valor"])).toBeNull();
  });

  it("recusa um contexto fora do prazo", () => {
    const id = guardarHandoff(DESTINO, { valor: 1200 });
    const chave = [...mapa.keys()][0];
    const carga = JSON.parse(mapa.get(chave)!);
    carga.expiraEm = Date.now() - 1_000;
    mapa.set(chave, JSON.stringify(carga));

    expect(consumirHandoff(DESTINO, id, ["valor"])).toBeNull();
  });

  it("o prazo é curto — um contexto não é um perfil", () => {
    expect(TTL_HANDOFF_MS).toBeLessThanOrEqual(15 * 60 * 1000);
  });

  it("descarta os campos que o destino não aceita", () => {
    // A lista de permissões é do destino, não de quem escreve. Um campo
    // que a página não sabe receber não é preenchimento — é lixo com ar
    // de contexto.
    const id = guardarHandoff(DESTINO, { valor: 1200, localidade: "Porto" });
    expect(consumirHandoff(DESTINO, id, ["valor"])).toEqual({ valor: 1200 });
  });

  it("um payload ilegível não rebenta a página", () => {
    for (const lixo of ["{", "null", "[]", '{"versao":99}', '{"versao":1}']) {
      const id = guardarHandoff(DESTINO, { valor: 1 });
      const chave = [...mapa.keys()].find((k) => k.includes(id!))!;
      mapa.set(chave, lixo);
      expect(() => consumirHandoff(DESTINO, id, ["valor"])).not.toThrow();
      expect(consumirHandoff(DESTINO, id, ["valor"])).toBeNull();
    }
  });

  it("sem campos não há contexto — e sem contexto não há parâmetro", () => {
    expect(guardarHandoff(DESTINO, {})).toBeNull();
    expect(hrefComHandoff("/ferramentas/recibos-verdes", null)).toBe("/ferramentas/recibos-verdes");
  });

  it("o identificador é opaco e a âncora fica no fim", () => {
    const href = hrefComHandoff("/ferramentas/recibos-verdes", "abc-123");
    expect(href).toBe(`/ferramentas/recibos-verdes?${PARAM_HANDOFF}=abc-123`);

    expect(hrefComHandoff("/dashboard/prazos?categoria=iva", "abc")).toBe(
      `/dashboard/prazos?categoria=iva&${PARAM_HANDOFF}=abc`,
    );
    expect(hrefComHandoff("/#calculadora", "abc")).toBe(`/?${PARAM_HANDOFF}=abc#calculadora`);
  });

  it("o valor NUNCA aparece no endereço", () => {
    const id = guardarHandoff(DESTINO, { valor: 1200, periodicidade: "mes" });
    const href = hrefComHandoff("/ferramentas/recibos-verdes", id);
    expect(href).not.toContain("1200");
    expect(href).not.toContain("valor");
    expect(href).not.toContain("mes=");
  });

  it("um contexto expirado é varrido quando se escreve o seguinte", () => {
    const velho = guardarHandoff(DESTINO, { valor: 1 });
    const chave = [...mapa.keys()].find((k) => k.includes(velho!))!;
    const carga = JSON.parse(mapa.get(chave)!);
    carga.expiraEm = Date.now() - 1;
    mapa.set(chave, JSON.stringify(carga));

    guardarHandoff(DESTINO, { valor: 2 });
    expect(mapa.has(chave)).toBe(false);
  });

  it("um browser sem armazenamento não parte nada", () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        get sessionStorage(): Storage {
          throw new Error("bloqueado");
        },
      },
      configurable: true,
      writable: true,
    });

    expect(() => guardarHandoff(DESTINO, { valor: 1 })).not.toThrow();
    expect(guardarHandoff(DESTINO, { valor: 1 })).toBeNull();
    expect(consumirHandoff(DESTINO, "seja-o-que-for", ["valor"])).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  UMA PROMESSA DO CATÁLOGO SEM CONSUMIDOR É UM PREENCHIMENTO QUE NUNCA
//  ACONTECE
// ═══════════════════════════════════════════════════════════════════════

describe("busca:handoff-contrato", () => {
  const DOCS = construirDocumentos();
  const ler = (...p: string[]) => readFileSync(join(process.cwd(), "src", ...p), "utf8");

  it("o que a ferramenta declara aceitar chega ao índice", () => {
    for (const f of CATALOGO_FERRAMENTAS) {
      if (!f.aceitaEntidades?.length) continue;
      const doc = DOCS.find((d) => d.id === `ferramenta:${f.id}`);
      expect(doc?.aceita, `${f.id} declara entidades e o índice não as leva`).toEqual(f.aceitaEntidades);
    }
  });

  it("e tem um consumidor do outro lado", () => {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ ESTA É A LIGAÇÃO QUE NENHUM COMPILADOR VERIFICA                │
    // │                                                               │
    // │ O catálogo diz «aceito um valor»; a pesquisa acredita e        │
    // │ prepara o caminho; a pessoa confirma a periodicidade; e do     │
    // │ outro lado abre uma página que nunca leu o contexto. Tudo      │
    // │ compila, nada falha, e a interface prometeu um preenchimento   │
    // │ que não acontece — que é a única coisa pior do que não         │
    // │ prometer nada.                                                │
    // └───────────────────────────────────────────────────────────────┘
    const consumidores: Record<string, string[]> = {
      "recibos-verdes": ["components", "recibos-verdes", "RecibosVerdesStudio.tsx"],
      "comparar-regimes": ["components", "comparar", "ComparadorCenarios.tsx"],
    };

    for (const f of CATALOGO_FERRAMENTAS) {
      if (!f.aceitaEntidades?.length) continue;
      const caminho = consumidores[f.id];
      expect(caminho, `${f.id} declara aceitar contexto e não há consumidor registado aqui`).toBeTruthy();

      const fonte = ler(...caminho);
      expect(fonte, `${f.id}: o consumidor não usa o handoff`).toContain("useHandoffDaBusca");
      expect(fonte, `${f.id}: o consumidor não declara o destino certo`).toContain(`ferramenta:${f.id}`);
      for (const entidade of f.aceitaEntidades) {
        expect(fonte, `${f.id}: o consumidor ignora «${entidade}»`).toContain(entidade);
      }
    }
  });
});
