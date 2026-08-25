// ═══════════════════════════════════════════════════════════════════════
//  COERÊNCIA DOCUMENTAL — um comentário que mente é pior do que nenhum
//  ---------------------------------------------------------------------
//  Este repositório documenta-se com um cuidado invulgar: os comentários
//  explicam o defeito que a linha corrige, com o número medido ao lado.
//  Isso é uma força — e cria uma dívida que nada estava a cobrar.
//
//  A auditoria de 25/08/2026 encontrou-a: comentários a falar de «vinte
//  e duas competências» quando são vinte e oito, e de «sete dimensões de
//  risco» quando o tipo declara oito. Nenhum deles partia nada. Todos
//  eles diziam a alguém, com toda a confiança, um número errado.
//
//  Pior: um deles descrevia o COMPORTAMENTO do motor — «é a causa de doze
//  das vinte e duas competências» — e continuou a dizê-lo depois de a
//  causa ter sido corrigida. Quem lesse o ficheiro para perceber o
//  diagnóstico de vazio ficava com a versão anterior da verdade.
//
//  ── COMO ISTO FUNCIONA, E PORQUE É ESTREITO ────────────────────────
//  Cada inventário conta-se A PARTIR DOS DADOS, nunca de uma constante
//  escrita à mão — senão o teste teria a mesma dívida que veio pagar.
//
//  Só se verifica UMA forma: «<n> de/dos/das <total> <inventário>». É a
//  única em que o papel de cada número é inequívoco — o segundo é o
//  universo, e um universo errado é sempre um erro.
//
//  A primeira versão deste teste procurava qualquer «<n> <inventário>» e
//  produziu VINTE falsos positivos à primeira corrida, de três espécies:
//
//   · homónimos — «quatro problemas de uma vez» são defeitos, não
//     entradas do grafo; «seis capacidades que o browser dá de graça»
//     são APIs; «as duas recusas» são respostas de um webhook;
//   · subconjuntos — «três problemas declaram sinais» é verdade sobre 3
//     de 31, e exigir 31 ali seria exigir uma frase falsa;
//   · totais a sério — os três que existiam mesmo, e que se corrigiram.
//
//  Vinte ruídos para três achados é a receita para alguém pôr um
//  `skip` nisto dentro de uma semana. Um teste que ninguém acredita não
//  protege nada, e a versão estreita apanha exatamente a classe de
//  defeito que a auditoria encontrou.
//
//  ── O QUE FICA DE FORA, E PORQUÊ ───────────────────────────────────
//   · frases marcadas como HISTÓRIA («de então», «a versão anterior»,
//     «eram», «passavam»). Um número que descreve o que já foi continua
//     verdadeiro depois de o presente mudar, e apagá-lo apagaria a razão
//     pela qual a linha ao lado existe. O marcador procura-se numa janela
//     de três linhas, porque a prosa aqui quebra aos ~72 caracteres e a
//     frase e o seu tempo verbal caem quase sempre em linhas diferentes;
//   · o `changelog`, que é história publicada a utilizadores. Reescrever
//     uma entrada antiga para bater certo com o inventário de hoje seria
//     falsificar o registo, não corrigi-lo;
//   · este ficheiro, que tem de nomear os números errados para os poder
//     proibir.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMPETENCIAS, CAPACIDADES, MODELOS_RECEITA, PROBLEMAS } from "@/lib/negocio/descoberta";
import { ATIVOS, RESTRICOES } from "@/lib/negocio/descoberta/contexto/perguntas";

/** Português escrito por extenso, que é como este repositório conta. */
const NUMERAIS: Readonly<Record<string, number>> = Object.freeze({
  uma: 1, duas: 2, três: 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7,
  oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14,
  quinze: 15, dezasseis: 16, dezassete: 17, dezoito: 18, dezanove: 19,
  vinte: 20, "vinte e uma": 21, "vinte e duas": 22, "vinte e três": 23,
  "vinte e quatro": 24, "vinte e cinco": 25, "vinte e seis": 26,
  "vinte e sete": 27, "vinte e oito": 28, "vinte e nove": 29, trinta: 30,
  "trinta e uma": 31, "trinta e duas": 32, "trinta e três": 33,
});

/**
 * Os inventários que o código descreve em prosa, contados dos dados.
 *
 * Cada `nomes` é a forma como o texto se refere ao inventário. Ordena-se
 * do mais específico para o mais genérico: «dimensões de risco» tem de
 * ser testado antes de «dimensões», senão a segunda apanha a primeira.
 */
function inventarios() {
  const tipos = readFileSync("src/lib/negocio/descoberta/contexto/tipos.ts", "utf8");
  const bloco = /export type DimensaoRisco =([\s\S]*?);/.exec(tipos)?.[1] ?? "";
  const dimensoesRisco = (bloco.match(/"/g)?.length ?? 0) / 2;

  return [
    { nomes: ["dimensões de risco", "eixos de risco"], real: dimensoesRisco },
    { nomes: ["competências"], real: COMPETENCIAS.length },
    { nomes: ["capacidades"], real: CAPACIDADES.length },
    { nomes: ["modelos de receita"], real: MODELOS_RECEITA.length },
    { nomes: ["problemas"], real: PROBLEMAS.length },
    { nomes: ["meios"], real: ATIVOS.length },
    { nomes: ["recusas"], real: RESTRICOES.length },
  ] as const;
}

/** Uma frase que fala do passado não tem de bater certo com o presente. */
const MARCAS_DE_HISTORIA = [
  "de então",
  "a versão anterior",
  "versão anterior",
  "eram",
  "era ",
  "passavam",
  "geravam",
  "devolviam",
  "foi a causa",
  "antes,",
  "antes de",
  "tinha",
  "havia",
];

const IGNORAR = [
  "changelog",
  "negocio-descoberta-coerencia-documental.test.ts",
];

function ficheiros(raiz: string): string[] {
  const saida: string[] = [];
  for (const entrada of readdirSync(raiz)) {
    const caminho = join(raiz, entrada);
    if (statSync(caminho).isDirectory()) {
      saida.push(...ficheiros(caminho));
      continue;
    }
    if (!/\.tsx?$/.test(entrada)) continue;
    if (IGNORAR.some((padrao) => caminho.includes(padrao))) continue;
    saida.push(caminho);
  }
  return saida;
}

interface Divergencia {
  ficheiro: string;
  linha: number;
  texto: string;
  disse: number;
  real: number;
}

/**
 * Os padrões compilados uma vez, e os inventários lidos uma vez.
 *
 * A primeira versão chamava `inventarios()` DENTRO do ciclo por linha —
 * relia e reparseava `tipos.ts` para cada linha de cada ficheiro, e
 * recompilava sete expressões regulares de cada vez. Passava em 5,0 s na
 * minha máquina e estourou o limite de 5 s do vitest no runner do CI.
 *
 * O erro não é o limite ser apertado: é o trabalho ser absurdo. Ler o
 * mesmo ficheiro dez mil vezes não fica certo com mais tempo.
 */
function padroes() {
  const alternativas = Object.keys(NUMERAIS)
    .sort((a, b) => b.length - a.length)
    .join("|");
  return inventarios().flatMap(({ nomes, real }) =>
    nomes.map((nome) => ({
      real,
      // «<n> de/dos/das <total> <inventário>»: o segundo número é o
      // universo, e é só esse que se verifica.
      padrao: new RegExp(
        `\\b(?:${alternativas})\\s+d(?:e|os|as)\\s+(${alternativas})\\s+${nome}\\b`,
        "gi",
      ),
    })),
  );
}

function divergencias(): readonly Divergencia[] {
  const encontradas: Divergencia[] = [];
  const compilados = padroes();

  for (const ficheiro of ficheiros("src")) {
    const linhas = readFileSync(ficheiro, "utf8").split("\n");
    linhas.forEach((linha, indice) => {
      // Só prosa. Uma linha de código com `.length` não é uma afirmação.
      if (!/^\s*(\/\/|\*|\/\*)/.test(linha)) return;
      const minuscula = linha.toLocaleLowerCase("pt-PT");
      // A prosa deste repositório quebra aos ~72 caracteres, por isso uma
      // frase — e o seu marcador de tempo — atravessa linhas com toda a
      // naturalidade. Olhar só para a linha do número dava um falso
      // positivo sempre que o «de então» calhasse na linha de baixo.
      const janela = linhas
        .slice(Math.max(0, indice - 1), indice + 2)
        .join(" ")
        .toLocaleLowerCase("pt-PT");
      if (MARCAS_DE_HISTORIA.some((marca) => janela.includes(marca))) return;

      for (const { padrao, real } of compilados) {
        padrao.lastIndex = 0;
        for (const jogo of minuscula.matchAll(padrao)) {
          const disse = NUMERAIS[jogo[1]!.toLocaleLowerCase("pt-PT")];
          if (disse === undefined || disse === real) continue;
          encontradas.push({
            ficheiro,
            linha: indice + 1,
            texto: linha.trim().slice(0, 90),
            disse,
            real,
          });
        }
      }
    });
  }
  return encontradas;
}

describe("descoberta: os comentários dizem os números que os dados dizem", () => {
  it("os inventários contam-se a partir dos dados, não de constantes à mão", () => {
    // Sem isto, um inventário vazio faria o teste passar a medir nada.
    for (const { nomes, real } of inventarios()) {
      expect(real, `${nomes[0]} deu zero — a contagem partiu-se`).toBeGreaterThan(0);
    }
  });

  it("nenhum comentário afirma uma contagem que os dados desmentem", () => {
    const erradas = divergencias().map(
      (item) =>
        `${item.ficheiro}:${item.linha} diz ${item.disse}, são ${item.real} — «${item.texto}»`,
    );
    expect(
      erradas,
      "Um comentário que mente é pior do que nenhum. Corrige o número, " +
        "ou marca a frase como história («de então», «a versão anterior»).",
    ).toEqual([]);
  });

  it("o teste sabe falhar — um total errado é mesmo apanhado", () => {
    // Uma guarda que não consegue falhar não é uma guarda. Prova-se com a
    // mesma máquina, sobre uma linha de ensaio na forma que se verifica.
    const real = COMPETENCIAS.length;
    const errado = Object.entries(NUMERAIS).find(([, valor]) => valor !== real);
    expect(errado).toBeDefined();
    const alternativas = Object.keys(NUMERAIS)
      .sort((a, b) => b.length - a.length)
      .join("|");
    const linha = `//  doze das ${errado![0]} competências ficavam de fora`;
    const padrao = new RegExp(
      `\\b(?:${alternativas})\\s+d(?:e|os|as)\\s+(${alternativas})\\s+competências\\b`,
      "i",
    );
    const jogo = padrao.exec(linha.toLocaleLowerCase("pt-PT"));
    expect(jogo, "a forma verificada deixou de ser reconhecida").not.toBeNull();
    expect(NUMERAIS[jogo![1]!]).not.toBe(real);
  });
});
