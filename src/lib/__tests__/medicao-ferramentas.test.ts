import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CATALOGO } from "@/lib/analytics/eventos";
import { CATALOGO_FERRAMENTAS } from "@/lib/ferramentas";

// ═══════════════════════════════════════════════════════════════════════
//  A NORTH STAR ESTAVA A ZERO POR CONSTRUÇÃO
//  ---------------------------------------------------------------------
//  `simulator_complete` e `result_view` estavam declarados no catálogo de
//  eventos desde sempre, cada um com a pergunta do painel semanal a que
//  serve, e NENHUM componente da aplicação os disparava. A DVM —
//  utilizadores únicos com `simulator_complete` + `result_view` válido —
//  não estava baixa: não podia ser outra coisa senão zero.
//
//  Estes testes prendem as decisões que fecham esse buraco e que, se
//  caírem, o reabrem em silêncio.
// ═══════════════════════════════════════════════════════════════════════

const SRC = join(__dirname, "..", "..");
const MEDIDOR = readFileSync(join(SRC, "components", "ferramentas", "MedidorFerramenta.tsx"), "utf8");
const SHELL = readFileSync(join(SRC, "components", "ferramentas", "ToolShell.tsx"), "utf8");
const PAGINA_PRECO = readFileSync(join(SRC, "app", "ferramentas", "calcular-preco", "page.tsx"), "utf8");

const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("os eventos da North Star são mesmo disparados", () => {
  it("os três eventos do percurso nascem no medidor", () => {
    for (const evento of ["simulator_start", "simulator_complete", "result_view"]) {
      expect(MEDIDOR.includes(`"${evento}"`), `${evento} não é disparado`).toBe(true);
    }
  });

  it("e continuam a ser eventos de cliente no catálogo", () => {
    // Um evento de receita não pode nascer no browser. Estes não são —
    // mas se alguém os mudar para `servidor`, o tracker recusa-os em
    // silêncio e a métrica volta a zero sem ninguém dar por isso.
    for (const evento of ["simulator_start", "simulator_complete", "result_view"] as const) {
      expect(CATALOGO[evento].origem, `${evento} deixou de poder ser emitido do cliente`).toBe("cliente");
    }
  });

  it("a medição vive na moldura, e não em quinze componentes", () => {
    // Quinze definições de «acabou» produzem dados que não se somam — e um
    // painel que soma coisas diferentes é pior do que um painel vazio,
    // porque parece que funciona.
    expect(SHELL).toMatch(/<MedidorFerramenta tool=\{tool\}/);
  });

  it("um mapa não conta como simulação", () => {
    expect(SHELL).toMatch(/tool\.kind !== "map"/);
  });

  it("e a ferramenta que se mede a si própria não é medida duas vezes", () => {
    // A calculadora de preço sabe quantos campos essenciais do cenário é
    // que faltam, e só chama «concluído» a uma simulação que os tem todos.
    // Medir nos dois sítios duplicaria `simulator_start`.
    expect(PAGINA_PRECO).toMatch(/medir=\{false\}/);
  });
});

describe("o que a medição NÃO faz", () => {
  it("não lê o valor de nenhum campo", () => {
    // O ouvinte lê `event.type`; tocar em `event.target.value` seria
    // recolher dados fiscais de dentro de um formulário.
    const codigo = semComentarios(MEDIDOR);
    expect(codigo.includes(".value")).toBe(false);
    expect(codigo.includes("target")).toBe(false);
  });

  it("e espera antes de contar uma simulação como concluída", () => {
    // Sem a espera, tocar num campo e fechar o separador contava como uma
    // simulação concluída — e a métrica media cliques, não decisões.
    expect(MEDIDOR).toMatch(/ESPERA_MS/);
    const espera = Number(/const ESPERA_MS = ([\d_]+)/.exec(MEDIDOR)?.[1]?.replace(/_/g, "") ?? 0);
    expect(espera).toBeGreaterThanOrEqual(1000);
  });

  it("nem dispara mais do que uma vez por ferramenta aberta", () => {
    expect(MEDIDOR).toMatch(/concluiu\.current/);
    expect(MEDIDOR).toMatch(/arrancou\.current/);
  });
});

describe("a cobertura", () => {
  it("todas as ferramentas menos o mapa passam a ser medidas", () => {
    // Se uma ferramenta nova aparecer com um `kind` que ninguém previu,
    // continua a ser medida — a exclusão é explícita e uma só.
    const medidas = CATALOGO_FERRAMENTAS.filter((f) => f.kind !== "map");
    expect(medidas.length).toBeGreaterThanOrEqual(14);
    expect(CATALOGO_FERRAMENTAS.length - medidas.length).toBe(1);
  });
});
