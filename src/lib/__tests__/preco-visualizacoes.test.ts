import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
//  AS VISUALIZAÇÕES DA CALCULADORA DE PREÇO
//  ---------------------------------------------------------------------
//  Duas regras que o prompt-mestre impõe às visualizações novas e que não
//  dão erro nenhum quando são quebradas:
//
//    §27  nada de bibliotecas de gráficos — SVG e CSS primeiro;
//    §24  uma visualização nova tem de DEIXAR TIRAR texto, senão a
//         página só fica mais comprida.
//
//  E a regra da casa, que é a mais fácil de esquecer: todo o gráfico tem
//  equivalente textual. Um número que só existe como largura de uma div
//  não existe para quem usa leitor de ecrã.
// ═══════════════════════════════════════════════════════════════════════

const SRC = join(__dirname, "..", "..");
const ler = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");

const BARRAS = ler("components", "precos", "CenariosBarras.tsx");
const REGUA = ler("components", "precos", "ReguaEquilibrio.tsx");
const EQUESE = ler("components", "precos", "EQueSe.tsx");
const RESULTADO = ler("components", "precos", "ResultadoPreco.tsx");

describe("preco-visualizacoes:sem-bibliotecas", () => {
  it("nenhuma visualização importa uma biblioteca de gráficos", () => {
    // §27. `recharts`, `chart.js` e companhia trazem 40–150 kB para
    // desenhar barras que são divs com percentagens.
    for (const [nome, fonte] of [
      ["CenariosBarras", BARRAS],
      ["ReguaEquilibrio", REGUA],
    ] as const) {
      expect(fonte, nome).not.toMatch(/from ["'](recharts|chart\.js|d3|victory|nivo|visx)/);
    }
  });
});

describe("preco-visualizacoes:equivalente-textual", () => {
  it("as barras de cenários têm tabela equivalente ligada por aria-describedby", () => {
    // O contrato do `ReceitaChart`: role="img" + aria-label +
    // aria-describedby → <table> com os mesmos números.
    expect(BARRAS).toContain('role="img"');
    expect(BARRAS).toMatch(/aria-describedby=\{idTabela\}/);
    expect(BARRAS).toMatch(/<table id=\{idTabela\}/);
    // As quatro colunas que a tabela antiga tinha, nenhuma perdida.
    for (const coluna of ["Cenário", "Preço", "Margem", "Por mês"]) {
      expect(BARRAS, `coluna «${coluna}» desapareceu da tabela equivalente`).toContain(coluna);
    }
  });

  it("a régua do equilíbrio anuncia-se como progressbar com valores", () => {
    expect(REGUA).toContain('role="progressbar"');
    for (const attr of ["aria-valuenow", "aria-valuemin", "aria-valuemax", "aria-label"]) {
      expect(REGUA, `${attr} em falta`).toContain(attr);
    }
  });

  it("a régua diz por palavras o que a barra diz por comprimento", () => {
    // O texto acima da barra não é legenda: é a resposta. Quem não vê a
    // barra tem de ficar a saber quantas vendas faltam.
    expect(REGUA).toMatch(/Faltam-te/);
    expect(REGUA).toMatch(/faltam\s*=/);
  });
});

describe("preco-visualizacoes:nao-alongam-a-pagina", () => {
  it("as barras substituíram a tabela larga, não se somaram a ela", () => {
    // §24, e também a causa raiz do scroll horizontal: a tabela pedia
    // `min-w-[420px]` e, como item de grelha, esticava a coluna toda.
    expect(EQUESE).not.toContain("min-w-[420px]");
    expect(EQUESE).toContain("<CenariosBarras");
    // E o parágrafo que explicava a tabela saiu com ela.
    expect(EQUESE).not.toMatch(/dez pontos de margem a menos e a mais/);
  });

  it("a régua substituiu a métrica apertada e a nota solta", () => {
    // O «Equilíbrio» era a quarta célula de uma grelha de quatro, com a
    // legenda «vendas/mês · 11 dias» espremida, e a nota vivia dois
    // blocos abaixo. Ambos saíram.
    expect(RESULTADO).toContain("<ReguaEquilibrio");
    expect(RESULTADO).not.toMatch(/rotulo="Equilíbrio"/);
    expect(RESULTADO).toMatch(/sm:grid-cols-3/);
  });
});

describe("preco-visualizacoes:casos-limite", () => {
  it("a régua não desenha escala quando não há equilíbrio possível", () => {
    // Desenhar uma escala sugeria que existe um ponto onde as contas
    // fecham. A este preço não existe — vender mais afunda mais.
    expect(REGUA).toMatch(/if \(!possivel\)/);
    expect(REGUA).toMatch(/não há ponto de equilíbrio/);
  });

  it("a régua trata o equilíbrio zero como caso próprio", () => {
    expect(REGUA).toMatch(/unidadesEquilibrio <= 0/);
  });

  it("as barras incluem o zero no domínio", () => {
    // Sem o zero no domínio, um conjunto todo positivo desenhava a barra
    // mais pequena com comprimento nulo — e lia-se como «não dá nada».
    expect(BARRAS).toMatch(/Math\.min\(0, \.\.\.valores\)/);
    expect(BARRAS).toMatch(/Math\.max\(0, \.\.\.valores\)/);
  });
});
