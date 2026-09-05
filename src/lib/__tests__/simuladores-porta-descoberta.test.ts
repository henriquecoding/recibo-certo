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
import { describe, expect, it } from "vitest";
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
    expect(ler(STORE)).toContain('chaveAtiva("regresso-descoberta")');
    expect(ler("src/lib/store/cofre.ts")).toContain('"regresso-descoberta"');
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
      "espreitarRegressoAoSimulador()",
    );
    const consumos = src.match(/consumirRegressoAoSimulador\(\)/g) ?? [];
    expect(consumos.length, "voltar e dispensar têm de consumir o bilhete").toBe(2);
  });

  it("não leva nada além de uma direção", () => {
    const src = codigo(STORE);
    for (const proibido of ["faturacao", "custos", "salario", "receita", "competencia", "nif"]) {
      expect(src.toLowerCase(), `o bilhete leva «${proibido}»`).not.toContain(proibido);
    }
  });

  it("não usa o URL, não faz rede e não toca em Supabase", () => {
    for (const f of [STORE, PORTA_UI, CONVITE]) {
      const src = codigo(f);
      expect(src, `${f} escreve no URL`).not.toMatch(/searchParams\.set|pushState|replaceState/);
      expect(src, `${f} põe o destino numa query string`).not.toMatch(/\?(voltar|origem|from)=/);
      expect(src, `${f} faz rede`).not.toMatch(/\bfetch\s*\(/);
      expect(src, `${f} toca em Supabase`).not.toMatch(/supabase/i);
    }
  });

  it("o motor de descoberta oferece o caminho de volta nas duas fases", () => {
    const app = codigo("src/components/negocio/descoberta/DescobrirNegocioApp.tsx");
    const usos = app.match(/<RegressoAoSimulador \/>/g) ?? [];
    expect(usos.length, "o convite tem de existir no contexto e nos resultados").toBe(2);
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
