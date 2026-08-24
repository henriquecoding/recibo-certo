import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  DOMINIOS, FORA_DO_COFRE, COFRE_ANONIMO, nomeDoCofre, chaveNoCofre, chavesDoCofre,
  migrarParaCofre, esvaziarCofre, definirCofre, chaveAtiva, reporCofreParaTestes,
  type Dominio,
} from "@/lib/store/cofre";

/** Um `localStorage` de mentira, suficiente para o que estes testes fazem. */
function montarLocalStorage() {
  const mapa = new Map<string, string>();
  const ls = {
    getItem: (k: string) => mapa.get(k) ?? null,
    setItem: (k: string, v: string) => void mapa.set(k, v),
    removeItem: (k: string) => void mapa.delete(k),
    clear: () => mapa.clear(),
    key: (i: number) => [...mapa.keys()][i] ?? null,
    get length() { return mapa.size; },
  };
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: ls }, configurable: true, writable: true,
  });
  return mapa;
}

const ANA = "11111111-1111-1111-1111-111111111111";
const BRUNO = "22222222-2222-2222-2222-222222222222";

describe("RC-COFRE-001 · cada pessoa no seu cofre", () => {
  let mapa: Map<string, string>;
  beforeEach(() => { mapa = montarLocalStorage(); });

  // ⚠️ ISTO ERA POSSÍVEL. As chaves eram globais: num browser partilhado,
  // quem entrasse a seguir via os recibos de quem tinha entrado antes.
  it("duas pessoas no mesmo browser não se veem", () => {
    mapa.set(chaveNoCofre("recibos", ANA), '[{"valor":1200}]');
    expect(chaveNoCofre("recibos", BRUNO) in Object.fromEntries(mapa)).toBe(false);
    expect(mapa.get(chaveNoCofre("recibos", BRUNO))).toBeUndefined();
  });

  it("o cofre de quem não tem sessão é o anónimo, e é dito", () => {
    expect(nomeDoCofre(null)).toBe(COFRE_ANONIMO);
    expect(nomeDoCofre(undefined)).toBe(COFRE_ANONIMO);
    expect(nomeDoCofre("")).toBe(COFRE_ANONIMO);
  });

  it("o nome do cofre não é o id inteiro", () => {
    // Uma chave de localStorage vê-se em qualquer separador de programador.
    const nome = nomeDoCofre(ANA);
    expect(nome.length).toBeLessThan(ANA.length);
    expect(nome).not.toContain("-");
    expect(chaveNoCofre("recibos", ANA)).not.toContain(ANA);
  });

  it("ids diferentes dão cofres diferentes", () => {
    expect(nomeDoCofre(ANA)).not.toBe(nomeDoCofre(BRUNO));
  });
});

describe("RC-COFRE-002 · a mudança não perde o que já lá estava", () => {
  let mapa: Map<string, string>;
  beforeEach(() => { mapa = montarLocalStorage(); });

  it("o que estava na chave global passa para o cofre de quem entrou", () => {
    mapa.set(DOMINIOS.recibos, '[{"valor":800}]');
    migrarParaCofre(ANA);
    expect(mapa.get(chaveNoCofre("recibos", ANA))).toBe('[{"valor":800}]');
  });

  it("a chave antiga é removida — deixá-la é manter o problema", () => {
    mapa.set(DOMINIOS.vencimentos, "[]");
    migrarParaCofre(ANA);
    expect(mapa.has(DOMINIOS.vencimentos)).toBe(false);
  });

  it("um cofre que já tem dados não é sobreposto pelo que estava na chave global", () => {
    mapa.set(chaveNoCofre("cenarios", ANA), '["meu"]');
    mapa.set(DOMINIOS.cenarios, '["de proveniência desconhecida"]');
    migrarParaCofre(ANA);
    expect(mapa.get(chaveNoCofre("cenarios", ANA))).toBe('["meu"]');
    expect(mapa.has(DOMINIOS.cenarios)).toBe(false);
  });

  it("sem sessão, migra para o anónimo e não para o cofre de ninguém", () => {
    mapa.set(DOMINIOS.recibos, "[1]");
    migrarParaCofre(null);
    expect(mapa.get(chaveNoCofre("recibos", null))).toBe("[1]");
    expect(mapa.get(chaveNoCofre("recibos", ANA))).toBeUndefined();
  });

  it("correr duas vezes não faz nada de diferente", () => {
    mapa.set(DOMINIOS.prazos, "{}");
    migrarParaCofre(ANA);
    const depois = new Map(mapa);
    migrarParaCofre(ANA);
    expect([...mapa.entries()].sort()).toEqual([...depois.entries()].sort());
  });
});

describe("RC-COFRE-003 · esvaziar apaga mesmo", () => {
  let mapa: Map<string, string>;
  beforeEach(() => { mapa = montarLocalStorage(); });

  it("esvazia o cofre de quem pediu, e só esse", () => {
    for (const d of Object.keys(DOMINIOS) as Dominio[]) {
      mapa.set(chaveNoCofre(d, ANA), "x");
      mapa.set(chaveNoCofre(d, BRUNO), "y");
    }
    esvaziarCofre(ANA);
    expect(chavesDoCofre(ANA).every((k) => !mapa.has(k))).toBe(true);
    expect(chavesDoCofre(BRUNO).every((k) => mapa.has(k))).toBe(true);
  });
});

describe("RC-COFRE-004 · a lista de chaves é uma só", () => {
  // ⚠️ ISTO ESTAVA ERRADO. A zona de perigo limpava `recibocerto:recibos`
  // quando a chave era `recibocerto:recibos:v1` — e o mesmo em mais duas.
  // Apagava-se na nuvem, recarregava-se, e os dados locais continuavam lá.
  it("nenhum store declara uma chave `recibocerto:` fora do cofre", () => {
    const raiz = join(process.cwd(), "src");
    const ficheiros: string[] = [];
    const ande = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== "__tests__") ande(p); }
        else if (/\.tsx?$/.test(e.name)) ficheiros.push(p);
      }
    };
    ande(raiz);

    const conhecidas = new Set<string>(Object.values(DOMINIOS));
    const soltas: string[] = [];
    for (const f of ficheiros) {
      if (f.endsWith("cofre.ts")) continue;
      const fonte = readFileSync(f, "utf8");
      for (const m of fonte.matchAll(/"(recibocerto:[a-z-]+)(:v\d+)?"/g)) {
        const chave = m[1] + (m[2] ?? "");
        // Chaves por utilizador (com template) não entram nesta regra.
        if (conhecidas.has(chave)) continue;
        // O que está declarado fora do cofre, com razão escrita.
        if (FORA_DO_COFRE[chave]) continue;
        soltas.push(`${f.replace(process.cwd() + "/", "")}: ${chave}`);
      }
    }
    expect(soltas, "chaves de dados fora de DOMINIOS — declara-as no cofre").toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  RC-COFRE-002 · a migração tem de correr para quem NÃO tem conta
//  ---------------------------------------------------------------------
//  `migrarParaCofre` sempre esteve certa — e é a única coisa que estes
//  testes exercitavam. O defeito estava no CHAMADOR: `definirCofre`
//  comparava o cofre novo com o atual e saía quando eram iguais. Para um
//  visitante anónimo são sempre iguais («anonimo» é o valor inicial), por
//  isso a migração nunca corria, e as chaves pré-cofre ficavam invisíveis
//  para sempre. Medido no painel de prazos: o perfil fiscal gravado antes
//  do cofre existir deixava de ser lido, e a pessoa via as declarações de
//  IVA de que está isenta.
// ═══════════════════════════════════════════════════════════════════════

describe("RC-COFRE-002 · quem não tem conta também é migrado", () => {
  let mapa: Map<string, string>;
  beforeEach(() => {
    mapa = montarLocalStorage();
    reporCofreParaTestes();
  });

  it("a primeira chamada migra, mesmo sem o cofre mudar de nome", () => {
    mapa.set(DOMINIOS["perfil-fiscal"], '{"v":2,"regimeIVA":"isento"}');

    definirCofre(null);

    expect(mapa.get(DOMINIOS["perfil-fiscal"]), "a chave antiga tem de sair").toBeUndefined();
    expect(mapa.get(chaveNoCofre("perfil-fiscal", null))).toBe('{"v":2,"regimeIVA":"isento"}');
    // E é essa a chave que os repositórios vão ler.
    expect(chaveAtiva("perfil-fiscal")).toBe(chaveNoCofre("perfil-fiscal", null));
  });

  it("chamar outra vez não repete trabalho nem ressuscita nada", () => {
    mapa.set(DOMINIOS.recibos, "[1]");
    definirCofre(null);
    expect(mapa.get(chaveNoCofre("recibos", null))).toBe("[1]");

    // Alguém volta a escrever na chave antiga (uma aba velha, um script
    // antigo em cache). A segunda chamada com o mesmo cofre não migra —
    // é o comportamento que o guarda original queria proteger.
    mapa.set(DOMINIOS.recibos, "[999]");
    definirCofre(null);
    expect(mapa.get(chaveNoCofre("recibos", null)), "o cofre não é sobreposto").toBe("[1]");
  });

  it("entrar na conta depois de anónimo continua a migrar para o cofre certo", () => {
    mapa.set(DOMINIOS.recibos, "[1]");
    definirCofre(null);
    expect(mapa.get(chaveNoCofre("recibos", null))).toBe("[1]");

    mapa.set(DOMINIOS.cenarios, '["do tempo em que não havia cofre"]');
    definirCofre(ANA);
    expect(chaveAtiva("cenarios")).toBe(chaveNoCofre("cenarios", ANA));
    expect(mapa.get(chaveNoCofre("cenarios", ANA))).toBe('["do tempo em que não havia cofre"]');
    // O que já estava no cofre anónimo NÃO viaja para o da Ana.
    expect(mapa.get(chaveNoCofre("recibos", ANA))).toBeUndefined();
  });

  it("o cofre por omissão, antes de a autenticação responder, é o anónimo", () => {
    expect(chaveAtiva("recibos")).toBe(chaveNoCofre("recibos", null));
    expect(nomeDoCofre(null)).toBe(COFRE_ANONIMO);
  });
});
