#!/usr/bin/env node
/**
 * Gerador dos dados do popup "Novidades & Atualizações".
 * ----------------------------------------------------------------------
 * PORQUÊ ESTE SCRIPT
 *
 * `src/lib/changelog.ts` são 186 KB de prosa — 175 versões, 760 marcadores.
 * O popup importava-o com `import()`, o que o transformava num chunk de
 * JavaScript de 173 KB (58 KB comprimidos) que o browser tinha de descarregar,
 * PARSEAR e executar antes de mostrar uma única linha. Para um painel que
 * quase toda a gente abre para ler o que mudou esta semana.
 *
 * O CORTE NÃO É POR TEMPO, É POR PROFUNDIDADE
 *
 * Foi a segunda tentativa. Cortar por data — "o mês recente num ficheiro, o
 * resto noutro" — dava 50 KB para o mês recente, porque agosto sozinho tem 20
 * versões: praticamente o problema todo outra vez. O que o painel precisa para
 * PINTAR não é um intervalo de datas; é a lista de títulos (que cabe em muito
 * pouco) mais o corpo da entrada nova, que é a única que abre expandida.
 *
 *   public/novidades/indice.json   versão, dia, título e nº de pontos de TODAS
 *                                  as versões, já agrupadas por mês, mais o
 *                                  corpo completo da entrada mais recente.
 *                                  É tudo o que a primeira pintura precisa.
 *   public/novidades/corpo.json    os marcadores de cada versão, indexados por
 *                                  número de versão. Só é buscado quando
 *                                  alguém mostra intenção de abrir uma entrada
 *                                  antiga — e uma vez só.
 *
 * JSON não é JavaScript: não passa pelo parser de JS, não entra no grafo de
 * módulos e é `JSON.parse` puro — a via mais rápida que o browser tem para
 * transformar texto em dados. E fica na CDN, com cache própria.
 *
 * A FONTE DE VERDADE CONTINUA A SER `src/lib/changelog.ts`. Quem escreve uma
 * entrada nova continua a escrevê-la lá, como sempre; estes ficheiros são
 * derivados e regenerados em cada `npm run build` (via `prebuild`), por isso
 * não conseguem ficar dessincronizados sem que alguém repare.
 *
 * Uso:
 *   node scripts/gen-novidades.mjs            escreve os ficheiros
 *   node scripts/gen-novidades.mjs --check    só verifica; falha se divergir
 *
 * Código de saída: 0 = em dia · 1 = divergente (em `--check`) ou erro.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..");
const PASTA = join(RAIZ, "public", "novidades");
const INDICE = join(PASTA, "indice.json");
const CORPO = join(PASTA, "corpo.json");

const modoCheck = process.argv.includes("--check");

/**
 * Carrega o changelog através do próprio módulo da aplicação — o mesmo padrão
 * de `gen-quiz-meta.mjs`. Ler o ficheiro com expressões regulares seria frágil
 * ao ponto de ser irresponsável: são 186 KB de prosa portuguesa cheia de
 * aspas, travessões e chavetas dentro de strings.
 *
 * Como efeito lateral bem-vindo, importar o módulo corre
 * `assertChangelogIntegrity()` — se o CHANGELOG estiver inconsistente, este
 * script falha pela mesma razão e com a mesma mensagem que o build.
 */
async function carregarChangelog() {
  const { createServer } = await import("vite");
  const servidor = await createServer({
    root: RAIZ,
    logLevel: "error",
    server: { middlewareMode: true, watch: null },
    resolve: { alias: { "@": join(RAIZ, "src") } },
  });
  try {
    const mod = await servidor.ssrLoadModule("/src/lib/changelog.ts");
    const versao = await servidor.ssrLoadModule("/src/lib/version.ts");
    return { entradas: mod.CHANGELOG, appVersion: versao.APP_VERSION };
  } finally {
    await servidor.close();
  }
}

// Meses escritos à mão, e não vindos do `Intl`, pela mesma razão que os curtos
// (ver `rotularDia`): o `--check` compara byte a byte, e uma diferença de
// versão do ICU entre a máquina de quem escreve e a do CI faria a verificação
// falhar por uma razão que nada tem a ver com o changelog.
const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** "2026-08" → "Agosto de 2026". */
function rotularMes(chave) {
  const [ano, mes] = chave.split("-").map(Number);
  return `${MESES_LONGOS[mes - 1]} de ${ano}`;
}

/**
 * "2026-08-10" → "10 ago". As datas são formatadas AQUI, uma vez, e não 175
 * vezes no dispositivo de cada visitante: `toLocaleDateString` com o `Intl`
 * completo é das operações mais caras que uma lista destas faz.
 *
 * Os meses são escritos à mão em vez de saírem do `Intl`: com `month: "short"`
 * o pt-PT devolve "10/08", que é uma data numérica e não o que se quer ao lado
 * de um número de versão — e o resultado ainda dependeria da versão do ICU da
 * máquina que compila, o que faria o `--check` falhar por razões que nada têm
 * a ver com o changelog.
 */
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function rotularDia(iso) {
  const [, mes, dia] = iso.split("-").map(Number);
  return `${dia} ${MESES_CURTOS[mes - 1]}`;
}

function construir({ entradas, appVersion }) {
  const meses = [];
  const corpo = {};

  for (const e of entradas) {
    corpo[e.version] = e.itens;

    const chave = e.data.slice(0, 7);
    let mes = meses[meses.length - 1];
    if (!mes || mes.chave !== chave) {
      mes = { chave, rotulo: rotularMes(chave), entradas: [] };
      meses.push(mes);
    }
    mes.entradas.push({
      version: e.version,
      dia: rotularDia(e.data),
      titulo: e.titulo,
      // Quantos pontos tem a entrada — dá ao cabeçalho fechado uma pista do
      // tamanho do que está lá dentro, e permite desenhar o esqueleto com a
      // altura certa enquanto o corpo não chega.
      n: e.itens.length,
    });
  }

  return {
    indice: {
      // A versão fica gravada no ficheiro para o popup poder confirmar que o
      // JSON que recebeu da CDN corresponde ao código que está a correr — uma
      // cache antiga daria um painel sem a entrada nova, que é precisamente a
      // razão de o painel ter aparecido.
      appVersion,
      totalVersoes: entradas.length,
      // O corpo da entrada mais recente viaja no índice: é a única que abre
      // expandida, e assim a primeira pintura não espera por segundo pedido.
      destaque: entradas.length > 0 ? entradas[0].itens : [],
      meses,
    },
    corpo,
  };
}

/** Compara com o que está em disco (para `--check`). */
async function lerSeExistir(caminho) {
  try {
    return await readFile(caminho, "utf8");
  } catch {
    return null;
  }
}

async function main() {
  const dados = await carregarChangelog();
  const { indice, corpo } = construir(dados);

  const saidas = [
    [INDICE, JSON.stringify(indice) + "\n"],
    [CORPO, JSON.stringify(corpo) + "\n"],
  ];

  if (modoCheck) {
    const divergentes = [];
    for (const [caminho, conteudo] of saidas) {
      if ((await lerSeExistir(caminho)) !== conteudo) divergentes.push(caminho);
    }
    if (divergentes.length > 0) {
      console.error(
        "[novidades] Os dados do popup estão dessincronizados com src/lib/changelog.ts:\n" +
          divergentes.map((c) => ` - ${c.replace(RAIZ + "/", "")}`).join("\n") +
          "\n\nCorre `npm run novidades:gen` e inclui os ficheiros no commit.",
      );
      process.exit(1);
    }
    console.log(`[novidades] Em dia — ${indice.totalVersoes} versões, ${indice.meses.length} meses.`);
    return;
  }

  await mkdir(PASTA, { recursive: true });
  for (const [caminho, conteudo] of saidas) {
    await writeFile(caminho, conteudo, "utf8");
  }
  const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} KB`;
  console.log(
    `[novidades] Escrito: indice.json ${kb(saidas[0][1])} ` +
      `(${indice.totalVersoes} versões em ${indice.meses.length} meses) · ` +
      `corpo.json ${kb(saidas[1][1])}.`,
  );
}

main().catch((erro) => {
  console.error("[novidades] Falhou:", erro?.message ?? erro);
  process.exit(1);
});
