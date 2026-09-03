/**
 * Portão: uma guarda que não chama a função não é uma guarda.
 *
 * `if (!supabaseConfigurado)` — sem os parênteses — compila, passa o
 * TypeScript e não faz nada: uma referência a função é sempre `truthy`, por
 * isso a negação é sempre `false` e o ramo NUNCA corre. A seguir vinha um
 * `getSupabase()` que atira quando as variáveis não estão definidas, dentro
 * de um `useEffect` — e levava a página inteira para a fronteira de erro do
 * Next, sem `<title>` e sem `lang`.
 *
 * Aconteceu na `/redefinir-password`: a página a que só vai quem já não
 * consegue entrar na conta. Era o único dos 28 sítios a que faltavam os
 * parênteses.
 *
 * O TypeScript não apanha isto (uma função é um valor válido num contexto
 * booleano) e o projeto não tem ESLint. Fica aqui.
 */
import { describe, expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(import.meta.dirname, "..", "..");

/**
 * Funções que devolvem um booleano e cujo nome não deixa isso óbvio — as que
 * se leem como uma propriedade e por isso convidam ao erro.
 */
const PREDICADOS = ["supabaseConfigurado"];

describe("guardas: um predicado usado sem parênteses é sempre verdadeiro", () => {
  it.each(PREDICADOS)("`%s` nunca aparece numa condição sem ser chamada", (nome) => {
    const ficheiros = globSync("**/*.{ts,tsx}", { cwd: RAIZ }).sort();
    const infratores: string[] = [];

    for (const rel of ficheiros) {
      const fonte = readFileSync(join(RAIZ, rel), "utf8");
      if (!fonte.includes(nome)) continue;

      fonte.split("\n").forEach((linha, i) => {
        // Ignora a linha do import, as declarações/reexportações e os
        // comentários — este próprio ficheiro cita o padrão errado a
        // explicá-lo, e uma explicação não é uma chamada.
        if (/^\s*(import|export)\b/.test(linha)) return;
        if (/^\s*(\/\/|\*|\/\*)/.test(linha)) return;
        // O nome usado NUM CONTEXTO BOOLEANO sem `(` logo a seguir:
        // `if (!nome)`, `if (nome)`, `nome ?`, `nome &&`, `nome ||`.
        const semChamada = new RegExp(
          `(?:if\\s*\\(\\s*!?|!|&&\\s*|\\|\\|\\s*|\\?\\s*)${nome}\\s*(?!\\s*\\()[)\\s&|?;,]`,
        );
        if (semChamada.test(linha)) {
          infratores.push(`${rel}:${i + 1}\n      ${linha.trim()}`);
        }
      });
    }

    expect(
      infratores,
      `\`${nome}\` é uma FUNÇÃO. Usada sem \`()\` numa condição, é sempre\n` +
        "verdadeira — a guarda não guarda nada e o que vem a seguir corre\n" +
        "sempre. Acrescenta os parênteses:\n\n    " +
        infratores.join("\n    ") +
        "\n",
    ).toEqual([]);
  });
});
