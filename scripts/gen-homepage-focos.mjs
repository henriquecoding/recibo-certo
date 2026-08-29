#!/usr/bin/env node
/**
 * Gera os cinco payloads pequenos usados pelas entradas estáticas da homepage.
 *
 * Os motores continuam a ser a fonte de verdade e só correm aqui. As páginas
 * importam JSON serializável, logo uma visita nunca executa a engine fiscal nem
 * leva o respetivo grafo para o browser.
 *
 * Uso:
 *   node scripts/gen-homepage-focos.mjs
 *   node scripts/gen-homepage-focos.mjs --check
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..");
const DESTINO = join(RAIZ, "src", "generated", "homepage");
const modoCheck = process.argv.includes("--check");

async function ficheirosTs(pasta) {
  const resultado = [];
  for (const entrada of await readdir(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) resultado.push(...(await ficheirosTs(caminho)));
    else if (entrada.isFile() && entrada.name.endsWith(".ts")) resultado.push(caminho);
  }
  return resultado;
}

/**
 * Hash de todas as fontes que podem mudar uma resposta dos cinco exemplos.
 * A lista é deliberadamente mais ampla do que um único ficheiro de entrada:
 * mudar uma tabela, um motor de pricing ou o grafo curado também invalida o
 * snapshot mesmo que a assinatura pública fique igual.
 */
async function hashDosMotores() {
  const lib = join(RAIZ, "src", "lib");
  const raizLib = await readdir(lib, { withFileTypes: true });
  const fiscais = raizLib
    .filter((entrada) => entrada.isFile() && /^fiscal.*\.ts$/.test(entrada.name))
    .map((entrada) => join(lib, entrada.name));
  const caminhos = new Set([
    ...fiscais,
    ...(await ficheirosTs(join(lib, "pricing"))),
    ...(await ficheirosTs(join(lib, "negocio", "descoberta", "conhecimento"))),
    join(lib, "contabilista.ts"),
    join(lib, "foco", "dados-servidor.ts"),
    join(lib, "version.ts"),
  ]);
  const hash = createHash("sha256");
  for (const caminho of [...caminhos].sort()) {
    hash.update(relative(RAIZ, caminho));
    hash.update("\0");
    hash.update(await readFile(caminho));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

async function carregarMotores() {
  const { createServer } = await import("vite");
  const servidor = await createServer({
    root: RAIZ,
    logLevel: "error",
    server: { middlewareMode: true, watch: null },
    resolve: { alias: { "@": join(RAIZ, "src") } },
    // `server-only` é um marcador do Next, não um pacote de runtime. O stub
    // permite ao Vite executar exatamente os módulos de servidor no gerador.
    plugins: [
      {
        name: "server-only-stub",
        resolveId(id) {
          if (id === "server-only") return "\0server-only";
        },
        load(id) {
          if (id === "\0server-only") return "export {}";
        },
      },
    ],
  });

  try {
    const [dados, preco, competencias, modelos, problemas, seeds, versao, ano] =
      await Promise.all([
        servidor.ssrLoadModule("/src/lib/foco/dados-servidor.ts"),
        servidor.ssrLoadModule("/src/lib/pricing/demo-homepage.servidor.ts"),
        servidor.ssrLoadModule(
          "/src/lib/negocio/descoberta/conhecimento/dados/competencias.ts",
        ),
        servidor.ssrLoadModule("/src/lib/negocio/descoberta/conhecimento/dados/modelos.ts"),
        servidor.ssrLoadModule("/src/lib/negocio/descoberta/conhecimento/dados/problemas.ts"),
        servidor.ssrLoadModule("/src/lib/negocio/descoberta/conhecimento/seeds.ts"),
        servidor.ssrLoadModule("/src/lib/version.ts"),
        servidor.ssrLoadModule("/src/lib/fiscal-year.ts"),
      ]);
    return { dados, preco, competencias, modelos, problemas, seeds, versao, ano };
  } finally {
    await servidor.close();
  }
}

function exemploDescoberta(modulos) {
  const par = { problema: "processos-dispersos-micro", modelo: "projeto" };
  const problema = modulos.problemas.PROBLEMA_POR_ID.get(par.problema);
  const modelo = modulos.modelos.MODELO_POR_ID.get(par.modelo);
  const competencia = modulos.competencias.COMPETENCIA_POR_ID.get("organizacao");
  const dossier = modulos.seeds.referenciaCurada(par.problema, par.modelo);
  const primeiroTeste = problema?.comoValidar[1] ?? problema?.comoValidar[0];
  if (!problema || !modelo || !competencia || !dossier || !primeiroTeste) {
    throw new Error("O exemplo editorial deixou de existir no grafo de descoberta.");
  }
  return {
    competencia: competencia.rotulo,
    problema: problema.enunciado,
    modelo: modelo.rotulo,
    titulo: dossier.template.title,
    primeiroTeste,
    testeDeFalsificacao: problema.testeDeFalsificacao,
  };
}

/** Datas pequenas e estáveis; o cliente escolhe o próximo dia 20 localmente. */
function prazosSS(anoFiscal) {
  const resultado = [];
  for (let ano = anoFiscal - 1; ano <= anoFiscal + 2; ano += 1) {
    for (let mes = 1; mes <= 12; mes += 1) {
      resultado.push(`${ano}-${String(mes).padStart(2, "0")}-20`);
    }
  }
  return resultado;
}

async function construir() {
  const modulos = await carregarMotores();
  const fiscalYear = modulos.ano.FISCAL_YEAR;
  const engineHash = await hashDosMotores();
  const meta = {
    schema: 1,
    appVersion: modulos.versao.APP_VERSION,
    fiscalYear,
    engineHash,
  };

  // A data fixa só serve para satisfazer a assinatura antiga da função; os
  // dois campos temporais são removidos e substituídos pela lista estável.
  const reciboCalculado = modulos.dados.dadosRecibo(
    new Date(Date.UTC(fiscalYear, 0, 1, 12)),
  );
  const { prazoSS: _prazoSS, diasParaPrazo: _diasParaPrazo, ...recibo } = reciboCalculado;

  return {
    "descobrir.json": { _meta: meta, dados: exemploDescoberta(modulos) },
    "preco.json": {
      _meta: meta,
      dados: {
        parametros: modulos.preco.parametrosDemoPreco(),
        cenarios: modulos.preco.cenariosDemoPreco(),
      },
    },
    "recibos.json": {
      _meta: meta,
      dados: { ...recibo, prazosSS: prazosSS(fiscalYear) },
    },
    "salario.json": { _meta: meta, dados: modulos.dados.dadosSalario() },
    "empresa.json": { _meta: meta, dados: modulos.dados.dadosEmpresa() },
  };
}

const snapshots = await construir();
const saidas = Object.entries(snapshots).map(([nome, valor]) => [
  join(DESTINO, nome),
  `${JSON.stringify(valor, null, 2)}\n`,
]);

if (modoCheck) {
  const divergentes = [];
  for (const [caminho, esperado] of saidas) {
    const atual = await readFile(caminho, "utf8").catch(() => "");
    if (atual !== esperado) divergentes.push(relative(RAIZ, caminho));
  }
  if (divergentes.length > 0) {
    console.error(
      "[homepage] Snapshots divergentes dos motores:\n" +
        divergentes.map((caminho) => ` - ${caminho}`).join("\n") +
        "\nCorre `npm run homepage:snapshots` e inclui os ficheiros gerados.",
    );
    process.exit(1);
  }
  console.log(`[homepage] ${saidas.length} snapshots em dia (${snapshots["preco.json"]._meta.engineHash.slice(0, 23)}…).`);
} else {
  await mkdir(DESTINO, { recursive: true });
  for (const [caminho, conteudo] of saidas) await writeFile(caminho, conteudo, "utf8");
  console.log(`[homepage] ${saidas.length} snapshots gerados em src/generated/homepage/.`);
}
