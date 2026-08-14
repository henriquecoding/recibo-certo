import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ═══════════════════════════════════════════════════════════════════════
//  O NOME E O PREÇO DO PLANO
//  ---------------------------------------------------------------------
//  O preço estava escrito à mão em quatro sítios e divergiu: a página
//  pública anunciava 1,99 €/mês e o checkout cobrava 5,99 €. Não é um
//  detalhe de copy — é a página onde o utilizador paga a dizer um número
//  diferente daquele que o atraiu.
//
//  Estes testes fixam as duas regras que impedem a repetição:
//    · o preço tem UMA origem;
//    · o plano chama-se Plus na interface (o "Pro" só sobrevive no
//      changelog, que é registo histórico e não se reescreve).
// ═══════════════════════════════════════════════════════════════════════

const RAIZ = join(process.cwd(), "src");

/** Ficheiros onde "Pro" continua legítimo. */
const EXCECOES = [
  // O changelog é o registo histórico do que foi lançado: as entradas antigas
  // falam de planos que já não existem e não podem ser reescritas. O histórico
  // foi separado de `changelog.ts` para `changelog-historico/` para deixar de
  // entrar no bundle inicial; ambas as localizações são arquivo, não UI viva.
  join("lib", "changelog.ts"),
  join("lib", "changelog-historico"),
];

function ficheirosDeCodigo(dir: string, acc: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      ficheirosDeCodigo(caminho, acc);
    } else if (/\.tsx?$/.test(entrada) && !/__tests__/.test(caminho)) {
      acc.push(caminho);
    }
  }
  return acc;
}

/** Remove comentários de linha e de bloco — só interessa o que corre. */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("preço do Plus", () => {
  it("tem uma só origem", async () => {
    const { PLUS, precoPlusFormatado } = await import("@/lib/entitlements");
    expect(PLUS.precoMensal).toBeGreaterThan(0);
    expect(precoPlusFormatado()).toContain(
      PLUS.precoMensal.toLocaleString("pt-PT", { minimumFractionDigits: 2 }),
    );
  });

  it("nenhuma superfície da subscrição escreve o preço à mão", () => {
    // O alcance é deliberadamente estreito. Uma regra "nenhum «N,NN €» em
    // lado nenhum" apanharia os montantes das perguntas do Quiz e dos
    // exemplos fiscais, que são conteúdo legítimo. O que não pode existir é
    // um preço literal nos sítios que ANUNCIAM ou COBRAM a subscrição —
    // foram exatamente esses que divergiram.
    const SUPERFICIES = [
      join("app", "dashboard", "upgrade", "page.tsx"),
      join("app", "precos", "page.tsx"),
      join("app", "termos", "page.tsx"),
      join("components", "Precos.tsx"),
      join("lib", "email", "templates.ts"),
    ];
    const literal = /\d+,\d{2}\s*€|€\s*\d+,\d{2}/;
    const infratores: string[] = [];

    for (const rel of SUPERFICIES) {
      const fonte = semComentarios(readFileSync(join(RAIZ, rel), "utf8"));
      for (const linha of fonte.split("\n")) {
        if (literal.test(linha)) infratores.push(`${rel}: ${linha.trim().slice(0, 90)}`);
      }
    }

    expect(infratores, `preços literais encontrados:\n${infratores.join("\n")}`).toEqual([]);
  });

  it("não existe plano anual", async () => {
    const { PLUS } = await import("@/lib/entitlements");
    // Decisão de produto: "um plano só, sem escadaria". Um seletor
    // mensal/anual é uma escadaria.
    expect(PLUS.temAnual).toBe(false);
  });
});

describe("nome do plano", () => {
  it('a interface já não chama "Pro" ao plano', () => {
    // `ProGate`, `ProHint` e `ehPro` são identificadores de código e podem
    // ficar — o que não pode é chegar texto "Pro" ao ecrã.
    const palavraSolta = /(?<![A-Za-z])Pro(?![A-Za-z])/;
    const identificador = /\bProGate\b|\bProHint\b|\behPro\b|\bisPro\b/;
    const infratores: string[] = [];

    for (const f of ficheirosDeCodigo(RAIZ)) {
      const rel = f.slice(RAIZ.length + 1);
      if (EXCECOES.some((e) => rel.startsWith(e))) continue;
      for (const linha of semComentarios(readFileSync(f, "utf8")).split("\n")) {
        const limpa = linha.replace(identificador, "");
        if (palavraSolta.test(limpa)) infratores.push(`${rel}: ${limpa.trim().slice(0, 90)}`);
      }
    }

    expect(infratores, `"Pro" ainda visível em:\n${infratores.join("\n")}`).toEqual([]);
  });

  it('o "Quiz Master" deixou de ser uma subscrição à parte', () => {
    const infratores: string[] = [];
    for (const f of ficheirosDeCodigo(RAIZ)) {
      const rel = f.slice(RAIZ.length + 1);
      if (EXCECOES.some((e) => rel.startsWith(e))) continue;
      for (const linha of semComentarios(readFileSync(f, "utf8")).split("\n")) {
        // `quiz_master` é uma chave de preço legada do Stripe e pode ficar
        // enquanto houver subscrições antigas a migrar.
        if (/Quiz Master/.test(linha)) infratores.push(`${rel}: ${linha.trim().slice(0, 90)}`);
      }
    }
    expect(infratores, `"Quiz Master" ainda visível em:\n${infratores.join("\n")}`).toEqual([]);
  });
});