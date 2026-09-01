#!/usr/bin/env node
/**
 * INGESTÃO DE FONTES EM BLOCO — o que não cabe num pedido HTTP.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO NÃO É UM CONECTOR COMO OS OUTROS                        │
 * │                                                                     │
 * │ O INE e o Eurostat respondem em JSON, em segundos, e por isso são   │
 * │ consultados quando a rota revalida. Os contratos públicos são 36 MB │
 * │ comprimidos que descomprimem para 261 MB e trazem 154 mil registos. │
 * │                                                                     │
 * │ Isso não se lê a pedido. Lê-se aqui, fora do produto, e o que fica  │
 * │ commitado são as contagens — umas dezenas de números com a          │
 * │ proveniência agarrada.                                              │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   npm run mercado:ingerir           descarrega e reescreve os snapshots
 *   npm run mercado:ingerir -- --check   falha se o commitado divergir
 *   npm run mercado:ingerir -- --forcar  ignora o «já está atualizado»
 *
 * Código de saída: 0 = tudo bem · 1 = divergência ou falha.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
// Dentro de `src/`, e não em `public/`: o instantâneo é lido pelo servidor
// e um `import` garante que ele viaja com a função. Ficheiros em `public/`
// não são rastreados para o bundle das rotas, e o sintoma disso seria a
// ferramenta funcionar em local e perder o sinal em produção.
const DESTINO = join(RAIZ, "src", "lib", "negocio", "market", "bulk", "dados");

const modoCheck = process.argv.includes("--check");
const forcar = process.argv.includes("--forcar");
/**
 * Onde escrever o que mudou, para o passo seguinte poder redigir a entrada
 * do popup de Novidades a partir de números reais e não de um texto fixo.
 */
const resumoEm = (() => {
  const indice = process.argv.indexOf("--resumo");
  return indice >= 0 ? process.argv[indice + 1] : null;
})();

/**
 * Carrega o domínio pelo próprio módulo da aplicação — o mesmo padrão de
 * `gen-novidades.mjs`. O agregador, o leitor de ZIP e o de JSON são
 * TypeScript testado; reimplementá-los aqui em JavaScript daria duas
 * versões da mesma regra, a divergir na primeira correção.
 */
async function carregarDominio() {
  const { createServer } = await import("vite");
  const servidor = await createServer({
    root: RAIZ,
    logLevel: "error",
    server: { middlewareMode: true, watch: null },
    resolve: { alias: { "@": join(RAIZ, "src") } },
  });
  const carregar = (caminho) => servidor.ssrLoadModule(caminho);
  const modulos = {
    zip: await carregar("/src/lib/negocio/market/bulk/zip.ts"),
    json: await carregar("/src/lib/negocio/market/bulk/json-array.ts"),
    contratos: await carregar("/src/lib/negocio/market/bulk/contratos.ts"),
    geografia: await carregar("/src/lib/negocio/market/bulk/geografia-concelhos.ts"),
    snapshot: await carregar("/src/lib/negocio/market/bulk/snapshot-local.ts"),
    dadosGov: await carregar("/src/lib/negocio/market/connectors/dados-gov.ts"),
    integridade: await carregar("/src/lib/negocio/market/integridade.ts"),
    regioes: await carregar("/src/lib/negocio/market/geografia.ts"),
    fontes: await carregar("/src/lib/negocio/market/bulk/fontes.ts"),
  };
  return { modulos, fechar: () => servidor.close() };
}

// ── Descarga do ficheiro em bloco ──────────────────────────────────────
//
// Isto falhou duas semanas seguidas (issue #148), e por duas razões
// diferentes que se pareciam uma só no relatório:
//
//   2026-08-24 · «The operation was aborted due to timeout»  → 51.9 MB
//   2026-08-31 · «fetch failed»                              → 52.6 MB
//
// A primeira é o teto de 5 minutos a ser atingido. A segunda não é sequer
// um teto: é a ligação a cair a meio, que numa descarga única de 52 MB
// contra um portal público acontece e vai continuar a acontecer.
//
// Nenhuma das duas era motivo para desistir da semana inteira — mas era o
// que acontecia, porque não havia retentativa nenhuma. Uma falha de rede
// transitória cancelava a ingestão e abria uma issue.
//
// O ficheiro cresce todos os anos (o de 2025 já vai em 52 MB comprimidos,
// 273 MB abertos), por isso o teto passa a ser folgado em vez de justo: um
// limite apertado que hoje chega é o mesmo incidente daqui a seis meses.
//
// O orçamento tem de fechar com o `timeout-minutes` do workflow, senão a
// retentativa é decorativa: o GitHub mata o job a meio da segunda tentativa
// e o resultado é o mesmo de não haver nenhuma. 3 × 10 min + 15 s de recuo
// cabem nos 45 minutos que `mercado-ingestao.yml` passou a dar ao job.
const DESCARGA_TIMEOUT_MS = 600_000; // 10 min por tentativa (o dobro do teto que falhou).
const DESCARGA_TENTATIVAS = 3;
const DESCARGA_RECUO_MS = 5_000; // 5s, depois 10s.

/**
 * Uma falha vale a pena repetir? Timeouts e quedas de ligação sim — são
 * estado da rede, não do pedido. Um 404 ou um 403 não: repetir quatro
 * vezes o mesmo erro permanente só atrasa o relatório da causa real.
 */
function vaLaPenaRepetir(erro) {
  if (erro?.name === "TimeoutError" || erro?.name === "AbortError") return true;
  // `fetch failed` chega como TypeError, com a causa real no `cause`.
  if (erro instanceof TypeError) return true;
  return erro?.repetivel === true;
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Descarrega para memória, calculando o SHA-256 pelo caminho. */
async function descarregar(url) {
  let ultimo;

  for (let tentativa = 1; tentativa <= DESCARGA_TENTATIVAS; tentativa++) {
    try {
      const resposta = await fetch(url, {
        headers: { Accept: "application/octet-stream" },
        signal: AbortSignal.timeout(DESCARGA_TIMEOUT_MS),
      });

      if (!resposta.ok) {
        const erro = new Error(`HTTP ${resposta.status} ao descarregar ${url}`);
        // 5xx é do lado deles e costuma passar; 4xx é nosso e não passa.
        erro.repetivel = resposta.status >= 500;
        throw erro;
      }

      const bytes = Buffer.from(await resposta.arrayBuffer());
      return { bytes, checksum: `sha256:${createHash("sha256").update(bytes).digest("hex")}` };
    } catch (erro) {
      ultimo = erro;
      const haMais = tentativa < DESCARGA_TENTATIVAS;
      if (!haMais || !vaLaPenaRepetir(erro)) break;

      const recuo = DESCARGA_RECUO_MS * 2 ** (tentativa - 1);
      console.log(
        `    ↻ tentativa ${tentativa}/${DESCARGA_TENTATIVAS} falhou (${erro.message}). Nova tentativa em ${recuo / 1000}s.`,
      );
      await esperar(recuo);
    }
  }

  throw new Error(
    `descarga de ${url} falhou após ${DESCARGA_TENTATIVAS} tentativas: ${ultimo?.message ?? ultimo}`,
    { cause: ultimo },
  );
}

/** As 308 unidades concelhias, com a NUTS II no prefixo do código. */
async function obterConcelhos(indicador) {
  const url = `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=${indicador}&lang=PT`;
  const resposta = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} ao ler as geografias do INE`);
  const [item] = await resposta.json();
  const periodos = Object.keys(item.Dados).sort();
  return item.Dados[periodos[periodos.length - 1]] ?? [];
}

async function ingerirContratos(fonte, modulos) {
  const { dadosGov, zip, json, contratos, geografia, snapshot, integridade } = modulos;

  const dataset = await dadosGov.obterDataset(fonte.dataset);
  const recurso = dadosGov.escolherRecurso(dataset, fonte.recurso);

  // A data do recurso decide se vale a pena descarregar 36 MB.
  const anterior = await lerAnterior(fonte.id);
  const inalterado =
    anterior?.proveniencia?.recurso?.atualizadoEm &&
    anterior.proveniencia.recurso.atualizadoEm === recurso.atualizadoEm;
  if (inalterado && !forcar && !modoCheck) {
    console.log(`  · ${fonte.id}: o recurso não mudou desde ${recurso.atualizadoEm}. Nada a fazer.`);
    return { id: fonte.id, saltado: true, snapshot: anterior };
  }

  console.log(
    `  · ${fonte.id}: ${recurso.titulo} (${((recurso.bytes ?? 0) / 1048576).toFixed(1)} MB, ${recurso.atualizadoEm ?? "sem data"})`,
  );

  const linhasIne = await obterConcelhos(fonte.indicadorGeografias);
  const mapa = geografia.construirMapaDeConcelhos(linhasIne);
  if (mapa.total < 300) {
    throw new Error(`O INE devolveu ${mapa.total} concelhos; esperava 308. Ingestão abortada.`);
  }

  // A tabela de grafias alternativas é verificada contra a lista real do
  // INE, não contra uma cópia. Uma entrada que deixou de casar é um
  // concelho a sair da contagem — e isso tem de parar o job, não de
  // aparecer como uma queda inexplicada num número publicado.
  const pendentes = geografia.aliasesPendentes(mapa);
  if (pendentes.length > 0) {
    throw new Error(
      `Grafias alternativas que já não correspondem a nenhum concelho do INE:\n  ${pendentes.join("\n  ")}`,
    );
  }

  const { bytes, checksum } = await descarregar(recurso.url);
  const { entrada, conteudo } = zip.abrirEntradaUnica(Readable.from(bytes));
  const meta = await entrada;

  const acumulador = contratos.acumularContratos(fonte.ano, mapa);
  await json.percorrerArrayJson(conteudo, (contrato) => acumulador.aceitar(contrato));
  const resumo = acumulador.concluir();

  const observations = construirObservacoes(fonte, resumo, dataset, recurso, checksum, modulos);

  // As observações passam pelo mesmo gate das outras fontes. Uma origem
  // em bloco não ganha dispensa de licença, período ou checksum.
  const asOf = new Date().toISOString();
  const rejeitadas = [];
  for (const observacao of observations) {
    const veredicto = integridade.validateMarketObservation(observacao, {
      asOf,
      expiringWithinDays: 45,
    });
    if (!veredicto.publishable) {
      rejeitadas.push(`${observacao.id}: ${veredicto.issues.map((i) => i.code).join(", ")}`);
    }
  }
  if (rejeitadas.length > 0) {
    throw new Error(`Observações recusadas pelo gate de integridade:\n  ${rejeitadas.join("\n  ")}`);
  }

  const contentHash = await snapshot.calcularContentHash(observations);
  const documento = {
    schemaVersion: snapshot.SNAPSHOT_BULK_VERSAO,
    id: fonte.id,
    geradoEm: asOf,
    transformVersion: fonte.transformVersion,
    proveniencia: {
      dataset: dataset.slug,
      paginaUrl: dataset.paginaUrl,
      publicador: dataset.publicador,
      licenca: dataset.licenca,
      recurso: {
        id: recurso.id,
        ficheiro: meta.nome,
        url: recurso.url,
        atualizadoEm: recurso.atualizadoEm,
        bytes: recurso.bytes,
      },
      checksumOrigem: checksum,
      registosLidos: resumo.totalLido,
      contratosLocalizados: resumo.localizados,
      descartes: resumo.descartes,
    },
    observations,
    contentHash,
  };

  const cobertura = resumo.nacional.contratos
    ? (100 * resumo.localizados) / resumo.nacional.contratos
    : 0;
  console.log(
    `      ${resumo.totalLido.toLocaleString("pt-PT")} registos · ${observations.length} observações · ` +
      `${resumo.nacional.contratos.toLocaleString("pt-PT")} contratos de serviços · ` +
      `${cobertura.toFixed(1)}% com zona`,
  );

  // Um nome que a fonte usa e o INE não reconhece é uma contagem a
  // desaparecer sem ninguém dar por isso. Fica à vista de quem corre o job.
  const naoResolvidos = [...resumo.naoResolvidos.entries()]
    .sort((esquerda, direita) => direita[1] - esquerda[1])
    .slice(0, 10);
  if (naoResolvidos.length > 0) {
    console.log(
      `      concelhos por reconhecer: ${naoResolvidos
        .map(([nome, contagem]) => `${nome} (${contagem})`)
        .join(", ")}`,
    );
  }

  // A lista de permissão dos procedimentos abertos falha do lado seguro: o
  // que não está nela não conta. Imprimir o que ficou de fora é o que
  // permite ver um tipo novo aparecer, em vez de o descartar em silêncio.
  const foraDaConcorrencia = [...resumo.procedimentos.entries()]
    .filter(([tipo]) => !contratos.ehConcurso(tipo))
    .sort((esquerda, direita) => direita[1] - esquerda[1]);
  if (foraDaConcorrencia.length > 0) {
    console.log(
      `      ${resumo.nacional.concursos.toLocaleString("pt-PT")} abertos à concorrência; fora: ${foraDaConcorrencia
        .map(([tipo, contagem]) => `${tipo || "(sem tipo)"} (${contagem})`)
        .join(", ")}`,
    );
  }

  return { id: fonte.id, saltado: false, snapshot: documento, anterior };
}

/**
 * Só o dia da publicação, quando ele é inequívoco.
 *
 * O dados.gov devolve `2026-08-16T09:11:21` — sem fuso. Guardar isso como
 * instante obrigaria a inventar um: `parseIsoDate` recusa-o de propósito,
 * para que servidor e browser nunca discordem sobre a mesma data. O dia
 * civil é o que a fonte afirma sem ambiguidade, e é só isso que fica.
 */
function diaDePublicacao(valor) {
  const dia = typeof valor === "string" ? valor.slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : undefined;
}

/** Uma observação por zona e por métrica, com a proveniência toda. */
function construirObservacoes(fonte, resumo, dataset, recurso, checksum, modulos) {
  const { regioes, contratos } = modulos;
  const observations = [];
  const periodo = {
    start: `${resumo.ano}-01-01`,
    end: `${resumo.ano}-12-31`,
    label: String(resumo.ano),
  };
  const validUntil = `${resumo.ano + 2}-12-31`;
  const retrievedAt = new Date().toISOString();
  const publishedAt = diaDePublicacao(recurso.atualizadoEm);
  /** Fração dos contratos do país que a fonte deixa colocar numa zona. */
  const cobertura =
    resumo.nacional.contratos > 0 ? resumo.localizados / resumo.nacional.contratos : 0;

  // A definição de cada número, palavra por palavra. Fica na observação
  // porque é ela que viaja: quem a ler daqui a um ano tem de conseguir
  // reproduzir a contagem sem ter de encontrar este ficheiro.
  const COMUM =
    "Contratos de aquisição de serviços, de bens móveis e de locação de bens móveis, celebrados e " +
    "registados no Portal BASE, com a NUTS II derivada do concelho de execução publicado pela fonte. " +
    "Empreitadas e concessões ficam de fora. Um contrato sem concelho legível conta no país e em zona " +
    "nenhuma, pelo que a soma das zonas é inferior ao total nacional. Não se somam valores contratuais.";
  const DESCRICOES = {
    "procurement.contracts.services": `Contagem de contratos celebrados. ${COMUM}`,
    "procurement.open_procedures":
      "Contagem dos mesmos contratos cujo procedimento foi publicitado e aberto a qualquer " +
      "interessado — concurso público, concurso limitado por prévia qualificação, concurso de " +
      "conceção e as formas simplificadas destes, diálogo concorrencial e parceria para a inovação. " +
      "Ajuste direto, consulta prévia, chamadas ao abrigo de acordo-quadro e contratação excluída " +
      `NÃO contam: nenhuma delas é uma porta por onde alguém de fora entra. ${COMUM}`,
  };

  const emitir = (metricId, unidade, valor, geografia) => {
    if (!fonte.metricas.includes(metricId)) {
      throw new Error(
        `A fonte ${fonte.id} emitiu «${metricId}», que não está declarada em \`metricas\`.`,
      );
    }
    const description = DESCRICOES[metricId];
    if (!description) throw new Error(`A métrica «${metricId}» não tem definição escrita.`);
    observations.push({
      id: `dados-gov:${metricId}:${resumo.ano}:${geografia.code}`,
      sourceId: "dados-gov",
      metricId,
      value: valor,
      unit: unidade,
      geography: geografia,
      // Não há filtro por CPV: o corte é por tipo de contrato, e é esse
      // que fica registado — para que ninguém leia a contagem como se
      // cobrisse empreitadas ou concessões.
      classifications: { keywords: [...contratos.TIPOS_DE_SERVICO] },
      referencePeriod: periodo,
      publishedAt,
      retrievedAt,
      validUntil,
      methodologyRef: dataset.paginaUrl,
      transform: { id: fonte.transformVersion, version: "1", description },
      license: {
        status: "approved",
        scope: "dataset",
        identifier: dataset.licenca,
        url: dataset.paginaUrl,
        attribution: `Fonte: ${dataset.publicador ?? "IMPIC, I.P."} — Portal BASE, via dados.gov.pt`,
      },
      quality: {
        status: "observed",
        // O país conta tudo: um contrato sem concelho legível continua a
        // ser um contrato em Portugal. Já uma zona só pode reclamar os
        // que foram efetivamente colocados no mapa — e são 85%, não 100%.
        completeness: geografia.level === "country" ? 1 : cobertura,
        semanticMapping: "approved",
        flags: geografia.level === "country" || cobertura >= 0.95
          ? []
          : ["cobertura-regional-parcial"],
      },
      checksum,
    });
  };

  const PORTUGAL = { country: "PT", level: "country", code: "PT", name: "Portugal" };
  emitir("procurement.contracts.services", "contratos", resumo.nacional.contratos, PORTUGAL);
  emitir("procurement.open_procedures", "procedimentos", resumo.nacional.concursos, PORTUGAL);

  for (const [regiao, contagem] of resumo.porRegiao) {
    const definicao = regioes.MARKET_REGIONS.find((item) => item.id === regiao);
    if (!definicao?.nutsCode) continue;
    const geografia = {
      country: "PT",
      level: "nuts2",
      code: definicao.nutsCode,
      name: definicao.label,
      classificationVersion: "NUTS 2024",
    };
    emitir("procurement.contracts.services", "contratos", contagem.contratos, geografia);
    emitir("procurement.open_procedures", "procedimentos", contagem.concursos, geografia);
  }

  return observations.sort((esquerda, direita) => esquerda.id.localeCompare(direita.id));
}

async function lerAnterior(id) {
  try {
    return JSON.parse(await readFile(join(DESTINO, `${id}.json`), "utf8"));
  } catch {
    return null;
  }
}

/**
 * O que mudou entre dois instantâneos, nas contagens nacionais.
 *
 * Serve para redigir a entrada do popup de Novidades com números reais.
 * Um «atualizámos os dados» sem números não diz nada a ninguém — e este
 * ficheiro existe precisamente para que o texto não tenha de ser inventado.
 */
function resumirAlteracoes(anterior, documento) {
  const antesPorId = new Map((anterior?.observations ?? []).map((o) => [o.id, o.value]));
  const nacionais = documento.observations.filter((o) => o.geography.level === "country");
  return {
    id: documento.id,
    geradoEm: documento.geradoEm,
    transformVersion: documento.transformVersion,
    primeiraVez: !anterior,
    periodo: documento.observations[0]?.referencePeriod?.label ?? null,
    extraidoDe: documento.proveniencia.recurso.atualizadoEm ?? null,
    paginaUrl: documento.proveniencia.paginaUrl,
    nacionais: nacionais.map((observacao) => ({
      metricId: observacao.metricId,
      unidade: observacao.unit,
      antes: antesPorId.get(observacao.id) ?? null,
      depois: observacao.value,
    })),
    zonasComMudanca: documento.observations.filter(
      (observacao) =>
        observacao.geography.level === "nuts2" &&
        antesPorId.get(observacao.id) !== observacao.value,
    ).length,
  };
}

async function principal() {
  const { modulos, fechar } = await carregarDominio();
  let falhou = false;
  const alteracoes = [];

  try {
    const fontes = modulos.fontes.fontesEmBloco();
    console.log(`[mercado] ${fontes.length} fonte(s) em bloco.`);

    for (const fonte of fontes) {
      const resultado = await ingerirContratos(fonte, modulos);
      if (resultado.saltado) continue;

      const { snapshot: documento, anterior } = resultado;
      const mudou = anterior?.contentHash !== documento.contentHash;

      if (modoCheck) {
        if (!anterior) {
          console.error(`  ✗ ${fonte.id}: não há snapshot commitado.`);
          falhou = true;
        } else if (mudou) {
          console.error(
            `  ✗ ${fonte.id}: o snapshot commitado diverge da fonte.\n` +
              `      commitado: ${anterior.contentHash}\n` +
              `      agora:     ${documento.contentHash}\n` +
              "      Corre `npm run mercado:ingerir` e inclui o ficheiro no commit.",
          );
          falhou = true;
        } else {
          console.log(`  ✓ ${fonte.id}: em dia (${documento.observations.length} observações).`);
        }
        continue;
      }

      if (!mudou && anterior) {
        console.log(`  · ${fonte.id}: os números não mudaram. Ficheiro intacto.`);
        continue;
      }

      await mkdir(DESTINO, { recursive: true });
      await writeFile(
        join(DESTINO, `${fonte.id}.json`),
        `${JSON.stringify(documento, null, 2)}\n`,
        "utf8",
      );
      alteracoes.push(resumirAlteracoes(anterior, documento));
      console.log(`  ✓ ${fonte.id}: escrito (${documento.observations.length} observações).`);
    }
  } catch (erro) {
    console.error(`[mercado] falhou: ${erro instanceof Error ? erro.message : String(erro)}`);
    falhou = true;
  } finally {
    await fechar();
  }

  // Escrito sempre — inclusive vazio. Quem corre a seguir precisa de saber
  // a diferença entre «nada mudou» e «o job nem chegou ao fim».
  if (resumoEm && !modoCheck) {
    await writeFile(resumoEm, `${JSON.stringify({ falhou, alteracoes }, null, 2)}\n`, "utf8");
  }

  process.exit(falhou ? 1 : 0);
}

await principal();
