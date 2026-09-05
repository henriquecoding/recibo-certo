// ═══════════════════════════════════════════════════════════════════════
//  A TERCEIRA PORTA — E O CAMINHO DE VOLTA
//  ---------------------------------------------------------------------
//  O que este ficheiro prende não dá erro em lado nenhum:
//
//   · um simulador que pede faturação à entrada e não oferece saída a quem
//     ainda não sabe o que vai vender. Não é um ecrã partido — é um ecrã
//     que funciona e produz um resultado credível sobre um palpite. Foi
//     exatamente o que aconteceu ao simulador de recibos verdes enquanto o
//     de empresa tinha a porta escrita à mão lá dentro;
//
//   · a copy a divergir entre os dois. Duas cópias da mesma decisão são
//     uma oportunidade de ficarem diferentes, e ninguém compara dois
//     ecrãs que nunca aparecem ao mesmo tempo;
//
//   · o bilhete de regresso a viajar no URL. É pouca informação — um id de
//     ferramenta — mas é informação sobre a pessoa: que foi descobrir o
//     que havia de fazer. A régua não muda com o tamanho do dado.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { chaveNoCofre } from "@/lib/store/cofre";
import {
  REGRESSO_TTL_MS,
  REGRESSO_VERSAO,
  consumirRegressoAoSimulador,
  espreitarRegressoAoSimulador,
  guardarRegressoAoSimulador,
} from "@/lib/store/regresso-descoberta";
import {
  PASSO_REGRESSO_ACEITE,
  PASSO_REGRESSO_OFERECIDO,
  PASSO_SAIDA,
  PORTAS_DESCOBERTA,
  ROTA_DESCOBERTA,
  SIMULADORES_COM_PORTA,
  ehSimuladorDeOrigem,
  type SimuladorDeOrigem,
} from "@/lib/simuladores/porta-descoberta";
import { CATALOGO_FERRAMENTAS } from "@/lib/ferramentas/catalogo";

const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * O ficheiro sem comentários — a mesma razão de `negocio-handoff-empresa`:
 * um comentário que explica porque é que NÃO se põe o destino no URL
 * contém literalmente esse texto, e sem isto o teste reprovaria a
 * documentação da regra que verifica.
 */
function codigo(caminho: string): string {
  return ler(caminho)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");
}

const PORTA_UI = "src/components/simulador/PortaDescoberta.tsx";
const STORE = "src/lib/store/regresso-descoberta.ts";
const CONTRATO = "src/lib/simuladores/porta-descoberta.ts";
const CONVITE = "src/components/negocio/descoberta/RegressoAoSimulador.tsx";

/** Os dois simuladores guiados que pedem faturação à entrada. */
const GUIADOS: Readonly<Record<SimuladorDeOrigem, string>> = {
  "recibos-verdes": "src/components/simulador/ModoGuiado.tsx",
  "simulador-empresa": "src/components/simulador/ModoGuiadoEmpresa.tsx",
};

// ═══════════════════════════════════════════════════════════════════════
//  1. O CONTRATO CORRESPONDE AO CATÁLOGO
// ═══════════════════════════════════════════════════════════════════════

describe("porta-descoberta:contrato", () => {
  it("a rota do motor de descoberta é a do catálogo, não uma escrita à mão", () => {
    const descobrir = CATALOGO_FERRAMENTAS.find((f) => f.id === "descobrir-negocio");
    expect(descobrir, "a ferramenta de descoberta saiu do catálogo").toBeDefined();
    expect(ROTA_DESCOBERTA).toBe(descobrir!.canonicalHref);
  });

  it("cada porta aponta para uma ferramenta que existe, e para a rota dela", () => {
    for (const id of SIMULADORES_COM_PORTA) {
      const ferramenta = CATALOGO_FERRAMENTAS.find((f) => f.id === id);
      expect(ferramenta, `«${id}» não está no catálogo`).toBeDefined();
      expect(PORTAS_DESCOBERTA[id].rota, `rota errada em «${id}»`).toBe(ferramenta!.canonicalHref);
      // Quem volta tem de reconhecer o sítio de onde saiu: o nome é o do
      // catálogo, não um nome de conveniência escrito à parte.
      expect(PORTAS_DESCOBERTA[id].nome, `nome fora do catálogo em «${id}»`).toBe(ferramenta!.title);
    }
  });

  it("os dois simuladores que pedem faturação à entrada têm porta", () => {
    // A régua é o catálogo: `requiredInputs` diz o que a ferramenta pede
    // ANTES de calcular. Um simulador que pede faturação e não tem porta
    // é o defeito que este ficheiro existe para apanhar.
    const pedemFaturacao = CATALOGO_FERRAMENTAS.filter(
      (f) => f.kind === "simulator" && (f.requiredInputs ?? []).some((i) => /fatura/i.test(i)),
    ).map((f) => f.id);

    for (const id of pedemFaturacao) {
      expect(
        ehSimuladorDeOrigem(id),
        `«${id}» pede faturação à entrada e não tem terceira porta — ver PORTAS_DESCOBERTA`,
      ).toBe(true);
    }
  });

  it("cada porta diz o número que o simulador vai pedir — é a justificação dela", () => {
    for (const id of SIMULADORES_COM_PORTA) {
      const porta = PORTAS_DESCOBERTA[id];
      expect(porta.titulo.length, `título vazio em «${id}»`).toBeGreaterThan(0);
      expect(porta.numeroQuePede.length, `«${id}» não diz o que vai pedir`).toBeGreaterThan(0);
      expect(porta.convite, `«${id}» não se apresenta a quem chega`).toContain(porta.nome);
    }
  });

  it("o contrato não é UI: não importa React nem armazenamento", () => {
    const src = codigo(CONTRATO);
    expect(src).not.toMatch(/from "react"/);
    expect(src).not.toMatch(/localStorage|@\/lib\/store/);
    expect(src).not.toMatch(/"use client"/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2. OS DOIS SIMULADORES USAM A MESMA PORTA
// ═══════════════════════════════════════════════════════════════════════

describe("porta-descoberta:simuladores", () => {
  it.each(SIMULADORES_COM_PORTA)("«%s» oferece a porta no ecrã da pergunta inicial", (id) => {
    const src = codigo(GUIADOS[id]);
    expect(src, "não importa a primitiva partilhada").toContain(
      'import PortaDescoberta from "@/components/simulador/PortaDescoberta"',
    );
    expect(src, "não a usa com a sua própria origem").toContain(`<PortaDescoberta origem="${id}"`);
  });

  it.each(SIMULADORES_COM_PORTA)("«%s» dá uma segunda oportunidade, em nota", (id) => {
    const src = codigo(GUIADOS[id]);
    expect(src, "sem a nota de segunda oportunidade").toContain(
      `<PortaDescoberta origem="${id}" variante="nota"`,
    );
  });

  it.each(SIMULADORES_COM_PORTA)("«%s» não volta a escrever a porta à mão", (id) => {
    const src = codigo(GUIADOS[id]);
    // A rota da descoberta só pode aparecer através da primitiva. Uma
    // ligação solta era o que existia antes, e era a que não marcava o
    // bilhete de regresso.
    expect(src, "ligação escrita à mão para a descoberta").not.toContain(ROTA_DESCOBERTA);
  });

  it("a pergunta inicial dos dois é a mesma pergunta", () => {
    for (const caminho of Object.values(GUIADOS)) {
      expect(ler(caminho), `${caminho} não pergunta em que ponto a pessoa está`).toContain(
        "Em que ponto estás?",
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3. O BILHETE DE REGRESSO
// ═══════════════════════════════════════════════════════════════════════

describe("porta-descoberta:regresso", () => {
  it("vive no cofre, não numa chave global", () => {
    expect(ler(STORE)).toContain('chaveNoCofre("regresso-descoberta"');
    expect(ler("src/lib/store/cofre.ts")).toContain('"regresso-descoberta"');
  });

  it("o cofre é escolhido por quem chama, não pelo estado do módulo", () => {
    // ┌────────────────────────────────────────────────────────────────┐
    // │ ESTE É O DEFEITO QUE MAIS CUSTOU A VER, E O QUE MENOS SE VIA.   │
    // │                                                                │
    // │ `chaveAtiva()` lê o cofre ativo — estado de módulo posto por um │
    // │ `useEffect` do provider de autenticação. E os efeitos de um pai │
    // │ correm DEPOIS dos dos filhos, no mesmo commit: no instante em   │
    // │ que a sessão de quem tem conta resolve, o convite espreita      │
    // │ primeiro e o `definirCofre` corre a seguir. Resultado: lê-se o  │
    // │ cofre anónimo, não se encontra bilhete nenhum, e o convite      │
    // │ nunca aparece a quem tem conta.                                │
    // │                                                                │
    // │ Esperar por `carregado` NÃO resolve — quando ele fica           │
    // │ verdadeiro, o cofre ainda diz «anónimo». Só recebendo o id é    │
    // │ que a ordem dos efeitos deixa de ser um pressuposto.            │
    // └────────────────────────────────────────────────────────────────┘
    const store = codigo(STORE);
    expect(store, "volta a depender do cofre ativo").not.toContain("chaveAtiva");

    for (const f of [PORTA_UI, CONVITE]) {
      const src = codigo(f);
      expect(src, `${f} não pergunta quem está com sessão`).toContain("useAuth()");
      expect(src, `${f} não passa o dono do cofre à store`).toContain("user?.id ?? null");
    }
  });

  it("tem versão, prazo e consumo explícito", () => {
    const src = ler(STORE);
    expect(src).toContain("REGRESSO_VERSAO");
    expect(src).toContain("REGRESSO_TTL_MS");
    expect(src).toMatch(/export function consumirRegressoAoSimulador/);
    expect(src).toMatch(/export function limparRegressoAoSimulador/);
  });

  it("é espreitado para mostrar e consumido só ao voltar ou ao dispensar", () => {
    const src = codigo(CONVITE);
    expect(src, "consome à entrada — o convite evaporava-se ao primeiro F5").toContain(
      "espreitarRegressoAoSimulador(userId)",
    );
    const consumos = src.match(/consumirRegressoAoSimulador\(userId\)/g) ?? [];
    expect(consumos.length, "voltar e dispensar têm de consumir o bilhete").toBe(2);
  });

  it("espera pela sessão antes de tocar no cofre", () => {
    // ┌────────────────────────────────────────────────────────────────┐
    // │ O cofre ativo começa SEMPRE no anónimo e só sabe de quem é      │
    // │ depois de a autenticação resolver a sessão. Ler à montagem sem  │
    // │ esperar era, para quem tem conta, procurar no cofre errado —    │
    // │ não encontrar nada, e nunca mais voltar a procurar, porque o    │
    // │ efeito corre uma vez.                                          │
    // │                                                                │
    // │ E era invisível: uma lista vazia dá-se a ver, um convite que    │
    // │ nunca aparece não tem quem dê por ele. Abrir a descoberta num   │
    // │ separador novo, ou recarregá-la a meio, é o caso normal — é     │
    // │ para ele que o bilhete é espreitado em vez de consumido.        │
    // └────────────────────────────────────────────────────────────────┘
    const src = codigo(CONVITE);
    expect(src, "não espera pela sessão").toContain("useAuth()");
    expect(src, "o efeito não é reavaliado quando a sessão resolve").toMatch(
      /if \(!sessaoPronta\) return;[\s\S]*\}, \[sessaoPronta, userId\]\)/,
    );
  });

  it("a corrida do lado da escrita é medida, não escondida", () => {
    // Não se resolve escrevendo nos dois cofres (era pôr o que uma pessoa
    // deixou à frente de quem usar o browser a seguir) nem atrasando a
    // navegação. Fica limitada — perde-se um convite, nenhum dado — e
    // separada de quem simplesmente não tem armazenamento.
    const src = codigo(PORTA_UI);
    expect(src).toContain("sessao_por_resolver");
    expect(src).toContain("sem_armazenamento");
  });

  it("não leva nada além de uma direção", () => {
    const src = codigo(STORE);
    for (const proibido of ["faturacao", "custos", "salario", "receita", "competencia", "nif"]) {
      expect(src.toLowerCase(), `o bilhete leva «${proibido}»`).not.toContain(proibido);
    }
  });

  it("não usa o URL, não faz rede e não leva o bilhete à nuvem", () => {
    for (const f of [STORE, PORTA_UI, CONVITE]) {
      const src = codigo(f);
      expect(src, `${f} escreve no URL`).not.toMatch(/searchParams\.set|pushState|replaceState/);
      expect(src, `${f} põe o destino numa query string`).not.toMatch(/\?(voltar|origem|from)=/);
      expect(src, `${f} faz rede`).not.toMatch(/\bfetch\s*\(/);
      // ── PORQUE É QUE ISTO NÃO PROÍBE A PALAVRA «supabase» ──────────
      //  A primeira versão proibia-a, e reprovou a correção da corrida
      //  com a sessão: saber QUEM está com sessão é o que diz em que
      //  cofre se escreve, e esse contexto vive em `supabase/auth`. Ler o
      //  contexto de autenticação é o oposto de mandar o bilhete para a
      //  nuvem — o que se proíbe é o cliente e a base de dados.
      expect(src, `${f} usa o cliente Supabase`).not.toMatch(/createClient|\bsb\(\)|\.from\(/);
      const importsSupabase = src.match(/from "@\/lib\/supabase\/[^"]+"/g) ?? [];
      for (const imp of importsSupabase) {
        expect(imp, `${f} importa de Supabase algo que não é o contexto de sessão`).toBe(
          'from "@/lib/supabase/auth"',
        );
      }
    }
  });

  it("o motor de descoberta oferece o caminho de volta nas duas fases", () => {
    const app = codigo("src/components/negocio/descoberta/DescobrirNegocioApp.tsx");
    const usos = app.match(/<RegressoAoSimulador \/>/g) ?? [];
    expect(usos.length, "o convite tem de existir no contexto e nos resultados").toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3b. O BILHETE, EXERCITADO A SÉRIO
//  ---------------------------------------------------------------------
//  Os testes acima leem o código; estes correm-no. Passaram a ser
//  possíveis porque o cofre deixou de ser estado de módulo e passou a ser
//  um argumento — a mesma mudança que corrigiu o convite invisível.
// ═══════════════════════════════════════════════════════════════════════

/** Um `localStorage` de mentira, como o de `store-cofre.test.ts`. */
function montarLocalStorage() {
  const mapa = new Map<string, string>();
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
  return mapa;
}

const ANA = "11111111-1111-1111-1111-111111111111";
const BRUNO = "22222222-2222-2222-2222-222222222222";

describe("porta-descoberta:bilhete", () => {
  let mapa: Map<string, string>;
  beforeEach(() => {
    mapa = montarLocalStorage();
  });

  it("vai e volta", () => {
    expect(guardarRegressoAoSimulador("simulador-empresa", ANA)).toBe(true);
    expect(espreitarRegressoAoSimulador(ANA)).toBe("simulador-empresa");
    // Espreitar não consome: é o que faz o convite sobreviver a um F5.
    expect(espreitarRegressoAoSimulador(ANA)).toBe("simulador-empresa");
    expect(consumirRegressoAoSimulador(ANA)).toBe("simulador-empresa");
    expect(espreitarRegressoAoSimulador(ANA)).toBeNull();
  });

  it("o bilhete de uma pessoa não aparece a quem usar o browser a seguir", () => {
    guardarRegressoAoSimulador("recibos-verdes", ANA);
    expect(espreitarRegressoAoSimulador(BRUNO)).toBeNull();
    expect(espreitarRegressoAoSimulador(null)).toBeNull();
  });

  it("guarda o id da ferramenta e mais nada", () => {
    guardarRegressoAoSimulador("recibos-verdes", null);
    const bruto = mapa.get(chaveNoCofre("regresso-descoberta", null));
    expect(bruto).toBeDefined();
    expect(Object.keys(JSON.parse(bruto!)).sort()).toEqual(["gravadoEm", "origem", "versao"]);
  });

  it("fora do prazo deixa de valer", () => {
    const chave = chaveNoCofre("regresso-descoberta", null);
    mapa.set(
      chave,
      JSON.stringify({
        versao: REGRESSO_VERSAO,
        gravadoEm: Date.now() - REGRESSO_TTL_MS - 1000,
        origem: "simulador-empresa",
      }),
    );
    expect(espreitarRegressoAoSimulador(null)).toBeNull();
  });

  it("recusa inteiro o que não reconhece — e nunca rebenta", () => {
    const chave = chaveNoCofre("regresso-descoberta", null);
    const lixo = [
      "não é JSON",
      JSON.stringify({ versao: 99, gravadoEm: Date.now(), origem: "simulador-empresa" }),
      JSON.stringify({ versao: REGRESSO_VERSAO, gravadoEm: Date.now(), origem: "calculadora-secreta" }),
      // Relógio trocado: um `gravadoEm` no futuro não é um bilhete válido.
      JSON.stringify({ versao: REGRESSO_VERSAO, gravadoEm: Date.now() + 60_000, origem: "recibos-verdes" }),
      JSON.stringify({ versao: REGRESSO_VERSAO, origem: "recibos-verdes" }),
      JSON.stringify(null),
    ];
    for (const valor of lixo) {
      mapa.set(chave, valor);
      expect(espreitarRegressoAoSimulador(null), `aceitou «${valor.slice(0, 40)}»`).toBeNull();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4. MEDIÇÃO — SEM VALORES, DOS DOIS LADOS DA PORTA
// ═══════════════════════════════════════════════════════════════════════

describe("porta-descoberta:medicao", () => {
  it("a saída e o regresso são medidos com os passos do contrato", () => {
    expect(codigo(PORTA_UI)).toContain("PASSO_SAIDA");
    const convite = codigo(CONVITE);
    expect(convite).toContain("PASSO_REGRESSO_OFERECIDO");
    expect(convite).toContain("PASSO_REGRESSO_ACEITE");
  });

  it("os `step_id` são estáveis — o painel lê-os por nome", () => {
    expect(PASSO_SAIDA).toBe("sem_negocio_para_descoberta");
    expect(PASSO_REGRESSO_OFERECIDO).toBe("regresso_ao_simulador_oferecido");
    expect(PASSO_REGRESSO_ACEITE).toBe("regresso_ao_simulador_aceite");
  });

  it("nenhuma chamada de medição transporta um valor da pessoa (§8.2)", () => {
    for (const f of [PORTA_UI, CONVITE]) {
      const chamadas = codigo(f).match(/registar\([\s\S]{0,400}?\)\;/g) ?? [];
      expect(chamadas.length, `${f} não mede nada`).toBeGreaterThan(0);
      for (const c of chamadas) {
        for (const proibido of ["faturacao", "custos", "salario", "receita", "nome", "competencia"]) {
          expect(c.toLowerCase(), `${f}: medição com «${proibido}»`).not.toContain(proibido);
        }
      }
    }
  });
});
