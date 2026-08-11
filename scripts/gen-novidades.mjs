#!/usr/bin/env node
/**
 * Gerador dos dados do popup "Novidades & Atualizações".
 * ----------------------------------------------------------------------
 * ⚠️ REGRA INEGOCIÁVEL (CLAUDE.md, regra 11) — AO ABRIR, O POPUP SÓ CARREGA O
 * MÊS ATUAL. Os meses anteriores entram como um grupo fechado com o nome do
 * mês, e os dados desse mês só são pedidos quando alguém clica nele. A forma
 * dos ficheiros aqui gerados é o que torna a regra impossível de contornar
 * por acidente: o índice NÃO CONTÉM as entradas dos meses anteriores. Não há
 * como um componente distraído as mostrar à entrada — elas não estão lá.
 *
 * PORQUÊ
 *
 * `src/lib/changelog.ts` são 186 KB de prosa — 176 versões, 766 marcadores.
 * O popup importava-o com `import()`, o que o transformava num chunk de
 * JavaScript de 173 KB (58,6 comprimidos) que o browser tinha de descarregar,
 * PARSEAR e executar antes de mostrar uma linha. Para um painel que quase toda
 * a gente abre para ler o que mudou esta semana.
 *
 * A primeira versão deste script cortou por profundidade: títulos de todas as
 * versões no índice, corpos à parte. Ficou em 6,2 KB — bom, mas ainda a pagar
 * por 176 títulos de que ninguém precisa à entrada, e com os corpos todos num
 * único ficheiro de 152 KB que vinha inteiro à primeira expansão. Agora o
 * corte é por MÊS, e o mês é a unidade de tudo:
 *
 *   public/novidades/indice.json        o mês atual (títulos) + o corpo da
 *                                       entrada nova + o NOME e a CONTAGEM
 *                                       dos meses anteriores. Nada mais.
 *   public/novidades/meses/AAAA-MM.json um mês completo, entradas e corpos.
 *                                       Só existe no browser de quem o pedir.
 *
 * JSON não é JavaScript: não passa pelo parser de JS, não entra no grafo de
 * módulos e é `JSON.parse` puro — a via mais rápida que o browser tem para
 * transformar texto em dados. E fica na CDN, com cache própria por mês: um
 * mês fechado nunca mais muda, por isso quem o abriu uma vez não volta a
 * pagá-lo.
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

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..");
const PASTA = join(RAIZ, "public", "novidades");
const PASTA_MESES = join(PASTA, "meses");
const INDICE = join(PASTA, "indice.json");

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

// Meses escritos à mão, e não vindos do `Intl`: o `--check` compara byte a
// byte, e uma diferença de versão do ICU entre a máquina de quem escreve e a
// do CI faria a verificação falhar por uma razão que nada tem a ver com o
// changelog.
const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-08" → "Agosto de 2026". */
function rotularMes(chave) {
  const [ano, mes] = chave.split("-").map(Number);
  return `${MESES_LONGOS[mes - 1]} de ${ano}`;
}

/**
 * "2026-08-10" → "10 ago". As datas são formatadas AQUI, uma vez, e não 176
 * vezes no dispositivo de cada visitante: `toLocaleDateString` com o `Intl`
 * completo é das operações mais caras que uma lista destas faz.
 */
function rotularDia(iso) {
  const [, mes, dia] = iso.split("-").map(Number);
  return `${dia} ${MESES_CURTOS[mes - 1]}`;
}

function construir({ entradas, appVersion }) {
  // Agrupar preservando a ordem (mais recente primeiro).
  const meses = [];
  for (const e of entradas) {
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
      // Quantos pontos tem a entrada — dá à linha fechada uma pista do tamanho
      // do que está lá dentro, e permite desenhar o esqueleto com a altura
      // certa enquanto o corpo não chega.
      n: e.itens.length,
      itens: e.itens,
    });
  }

  // "Mês atual" é o mês da entrada mais recente, e não o mês do relógio de
  // quem compila: num mês sem lançamentos, o relógio daria um grupo vazio em
  // cima e o trabalho mais recente escondido dentro de um grupo fechado.
  const [mesAtual, ...anteriores] = meses;

  const semCorpo = (e) => ({ version: e.version, dia: e.dia, titulo: e.titulo, n: e.n });

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
      destaque: mesAtual?.entradas[0]?.itens ?? [],
      mesAtual: mesAtual
        ? { chave: mesAtual.chave, rotulo: mesAtual.rotulo, entradas: mesAtual.entradas.map(semCorpo) }
        : null,
      // ⚠️ Só nome e contagem. As entradas dos meses anteriores NÃO entram
      // aqui — é isto que faz a regra 11 valer por construção.
      anteriores: anteriores.map((m) => ({ chave: m.chave, rotulo: m.rotulo, n: m.entradas.length })),
    },
    meses,
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
  const { indice, meses } = construir(dados);

  const saidas = [
    [INDICE, JSON.stringify(indice) + "\n"],
    ...meses.map((m) => [join(PASTA_MESES, `${m.chave}.json`), JSON.stringify(m) + "\n"]),
  ];

  if (modoCheck) {
    const divergentes = [];
    for (const [caminho, conteudo] of saidas) {
      if ((await lerSeExistir(caminho)) !== conteudo) divergentes.push(caminho);
    }
    // Um mês que deixou de existir na fonte mas ficou no disco também é uma
    // divergência: seria servido a quem clicasse nele.
    const esperados = new Set(meses.map((m) => `${m.chave}.json`));
    let noDisco = [];
    try {
      noDisco = await readdir(PASTA_MESES);
    } catch {
      /* a pasta ainda não existe — o primeiro ficheiro em falta já acusa */
    }
    for (const f of noDisco) {
      if (!esperados.has(f)) divergentes.push(join(PASTA_MESES, `${f} (a mais)`));
    }

    if (divergentes.length > 0) {
      console.error(
        "[novidades] Os dados do popup estão dessincronizados com src/lib/changelog.ts:\n" +
          divergentes.map((c) => ` - ${c.replace(RAIZ + "/", "")}`).join("\n") +
          "\n\nCorre `npm run novidades:gen` e inclui os ficheiros no commit.",
      );
      process.exit(1);
    }
    console.log(
      `[novidades] Em dia — ${indice.totalVersoes} versões · ` +
        `mês atual ${indice.mesAtual?.rotulo} (${indice.mesAtual?.entradas.length}) · ` +
        `${indice.anteriores.length} meses anteriores, fechados.`,
    );
    return;
  }

  // A pasta dos meses é reescrita do zero: se um mês desaparecer da fonte,
  // não pode ficar um ficheiro órfão a ser servido a quem clicar nele.
  await rm(PASTA_MESES, { recursive: true, force: true });
  await mkdir(PASTA_MESES, { recursive: true });
  for (const [caminho, conteudo] of saidas) {
    await writeFile(caminho, conteudo, "utf8");
  }

  const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} KB`;
  console.log(
    `[novidades] indice.json ${kb(saidas[0][1])} — ${indice.mesAtual?.rotulo} ` +
      `(${indice.mesAtual?.entradas.length} versões) + ${indice.anteriores.length} meses fechados.`,
  );
  for (const [i, m] of meses.entries()) {
    console.log(`            meses/${m.chave}.json ${kb(saidas[i + 1][1])} — ${m.entradas.length} versões`);
  }
}

main().catch((erro) => {
  console.error("[novidades] Falhou:", erro?.message ?? erro);
  process.exit(1);
});
