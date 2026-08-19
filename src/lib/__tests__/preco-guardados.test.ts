import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOMINIOS } from "@/lib/store/cofre";
import { MAXIMO_GUARDADOS } from "@/lib/store/precos-guardados";

// ═══════════════════════════════════════════════════════════════════════
//  OS PREÇOS GUARDADOS
//  ---------------------------------------------------------------------
//  Ninguém põe preço a um produto: põe preço a um catálogo. A ferramenta
//  respondia sempre à mesma pergunta — «quanto cobro por isto?» — e
//  esquecia-a a seguir, o que obrigava a comparar de cabeça ou a passar
//  tudo para uma folha de Excel que não conhece nem o Art. 53.º nem a
//  Segurança Social.
//
//  Sem jsdom nesta suíte (e sem dependências novas), prende-se o que se
//  consegue prender sem browser: as decisões de desenho que, se caírem,
//  fazem estragos silenciosos.
// ═══════════════════════════════════════════════════════════════════════

const SRC = join(__dirname, "..", "..");
const PAGINA = readFileSync(join(SRC, "app", "dashboard", "precos", "page.tsx"), "utf8");
const STORE = readFileSync(join(SRC, "lib", "store", "precos-guardados.ts"), "utf8");
const NAV = readFileSync(join(SRC, "app", "dashboard", "layout.tsx"), "utf8");

describe("onde os preços guardados vivem", () => {
  it("no cofre, e não numa chave global", () => {
    // Num browser partilhado, uma lista de produtos com custos de
    // fornecedor e margens não pode ficar à vista de quem entra a seguir.
    expect(DOMINIOS["precos-guardados"]).toBeDefined();
    expect(STORE).toMatch(/chaveAtiva\("precos-guardados"\)/);
  });

  it("num domínio SEPARADO do contexto de trabalho", () => {
    // Um é o que está a ser feito agora; a outra é o que já ficou
    // decidido. «Recomeçar» limpa o primeiro e não pode apagar a segunda.
    expect(DOMINIOS["precos-guardados"]).not.toBe(DOMINIOS.preco);
  });

  it("e a lista tem um teto", () => {
    expect(MAXIMO_GUARDADOS).toBeGreaterThan(1);
    expect(MAXIMO_GUARDADOS).toBeLessThanOrEqual(100);
  });
});

describe("a página de comparação", () => {
  it("vive no dashboard, não em `/ferramentas`", () => {
    // `/ferramentas/*` é público e entra no sitemap. Uma lista com os
    // custos de fornecedor de alguém não pertence a esse lado da casa,
    // mesmo ficando só no dispositivo.
    expect(PAGINA.length).toBeGreaterThan(0);
    expect(NAV).toMatch(/\/dashboard\/precos/);
  });

  it("recalcula os números à entrada em vez de os ler do que ficou gravado", () => {
    // As taxas mudam. Um preço guardado com a tabela do ano passado
    // continuaria a anunciar a margem do ano passado ao lado de um
    // guardado hoje — e a comparação estaria a comparar dois anos fiscais
    // diferentes sem o dizer.
    expect(PAGINA).toMatch(/precificar\(i\.contexto\)/);
  });

  it("e diz quando o preço mudou desde que foi guardado", () => {
    expect(PAGINA).toMatch(/mudou/);
    expect(PAGINA).toMatch(/era \{fmt\(l\.item\.pvp\)\} quando guardaste/);
  });

  it("avisa quantos estão a perder dinheiro em cada venda", () => {
    // É a única coisa que só se vê com a lista toda à frente, e a razão
    // de a página existir.
    expect(PAGINA).toMatch(/emPrejuizo/);
  });

  it("a tabela é alcançável por teclado", () => {
    // A regra `scrollable-region-focusable` do axe: uma região com scroll
    // tem de ter foco e nome.
    expect(PAGINA).toMatch(/tabIndex=\{0\}/);
    expect(PAGINA).toMatch(/role="region"/);
    expect(PAGINA).toMatch(/aria-label="Tabela dos preços guardados"/);
  });

  it("e diz que os dados não saem do dispositivo", () => {
    expect(PAGINA).toMatch(/não é enviada para lado nenhum/i);
  });
});
