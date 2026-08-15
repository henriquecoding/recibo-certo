// ═══════════════════════════════════════════════════════════════════════
//  OS DADOS DOS PROTÓTIPOS — gerados por comando, conferidos por teste
//  ---------------------------------------------------------------------
//  Os três documentos de exemplo (`src/documentos/*.json`) são compostos em
//  PDF por `scripts/compor-documento.py`, e o CI compõe-nos a partir da
//  cópia VERSIONADA, num job que nem sequer corre os testes. Ou seja: o que
//  vai para o PDF é o ficheiro que está no repositório.
//
//  Estes ficheiros eram escritos por três testes, a cada `vitest run`. Isso
//  tinha dois defeitos ao mesmo tempo:
//
//   1. Correr os testes sujava a árvore de trabalho. A referência é aleatória
//      por construção, pelo que o ficheiro mudava sempre — e um `git add -A`
//      distraído levava uma referência inventada para dentro de um commit.
//
//   2. Pior: um teste que ESCREVE nunca falha. Mexer no motor de salários
//      reescrevia o protótipo em silêncio e o teste passava na mesma. A cópia
//      versionada — a que o CI compõe — podia divergir do que foi revisto sem
//      que nada o dissesse.
//
//  A regra passa a ser a mesma dos outros artefactos derivados deste projeto
//  (`gen-novidades.mjs`, `gen-busca-indice.mjs`): gera-se por comando
//  (`npm run docs:dados`), e o conjunto de testes CONFERE que a cópia
//  versionada é a que o motor produz hoje.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync } from "node:fs";
import { expect } from "vitest";
import { FISCAL_YEAR } from "../src/lib/fiscal-year";
import {
  BASE_PUBLICA, TIPOS_DOCUMENTO, type Proveniencia, type TipoDocumento,
} from "../src/lib/export/referencia";

/** `npm run docs:dados` liga isto; um `vitest run` normal não. */
export const A_GERAR = process.env.GERAR_DOCUMENTOS === "1";

/**
 * Seis carateres do alfabeto das referências que se leem como «exemplo».
 *
 * Uma emissão a sério tira o sufixo de `crypto.getRandomValues` — é o que
 * `gerarReferencia` faz, e continua a fazer. Um protótipo não é uma emissão:
 * tem de poder ser gerado hoje e amanhã com o mesmo resultado, senão o
 * ficheiro versionado muda sem nada ter mudado. E quem vir `RC-2026-VNC-EXEMPL`
 * num PDF de demonstração percebe imediatamente o que está a ver.
 */
const SUFIXO_EXEMPLO = "EXEMPL";

/** Troca a referência aleatória por uma estável, sem tocar no resto. */
export function provenienciaDeExemplo(
  proveniencia: Proveniencia,
  tipo: TipoDocumento,
): Proveniencia {
  const referencia = `RC-${FISCAL_YEAR}-${TIPOS_DOCUMENTO[tipo]}-${SUFIXO_EXEMPLO}`;
  return { ...proveniencia, referencia, verificacao: `${BASE_PUBLICA}/v/${referencia}` };
}

/**
 * A versão do motor é o único campo que muda sem ninguém lhe mexer.
 *
 * Sobe a cada `APP_VERSION`, e não é um número do motor de cálculo: é a
 * etiqueta de quem o compôs. Prendê-la obrigaria a regenerar os três
 * documentos a cada versão — um ritual que se esquece — e o CI ficaria
 * vermelho por causa de um campo que não diz nada sobre a exatidão fiscal.
 */
const semVersaoDoMotor = (texto: string) =>
  texto.replace(/"motor":\s*"[^"]*"/g, '"motor": "«versão»"');

/**
 * Guarda (quando pedido) ou confere a cópia versionada.
 *
 * A comparação é do texto inteiro: qualquer número que o motor passe a
 * produzir de forma diferente aparece aqui, com o diff do vitest a dizer
 * exatamente qual.
 */
export function guardarOuConferir(caminho: string, dados: unknown): void {
  const gerado = JSON.stringify(dados, null, 2) + "\n";

  if (A_GERAR) {
    writeFileSync(caminho, gerado);
    return;
  }

  let versionado: string;
  try {
    versionado = readFileSync(caminho, "utf8");
  } catch {
    throw new Error(
      `${caminho} não existe. Gera os dados dos protótipos com \`npm run docs:dados\`.`,
    );
  }

  expect(
    semVersaoDoMotor(versionado),
    `${caminho} deixou de ser o que o motor produz. Se a diferença é intencional, ` +
      "regenera com `npm run docs:dados` e revê o diff antes de o commitar — é o " +
      "ficheiro que o CI compõe em PDF.",
  ).toBe(semVersaoDoMotor(gerado));
}
